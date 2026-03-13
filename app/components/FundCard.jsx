'use client';

import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import { isNumber, isString } from 'lodash';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Stat } from './Common';
import FundTrendChart from './FundTrendChart';
import FundIntradayChart from './FundIntradayChart';
import {
  ChevronIcon,
  ExitIcon,
  SettingsIcon,
  StarIcon,
  SwitchIcon,
  TrashIcon,
} from './Icons';
import { fetchFundHistory } from '@/app/api/fund'; // 导入历史净值函数
import { useState, useEffect, useCallback, useRef } from 'react'; // 导入React Hooks

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);

const DEFAULT_TZ = 'Asia/Shanghai';
const getBrowserTimeZone = () => {
  if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz || DEFAULT_TZ;
  }
  return DEFAULT_TZ;
};
const TZ = getBrowserTimeZone();
const toTz = (input) => (input ? dayjs.tz(input, TZ) : dayjs().tz(TZ));

// 历史净值弹窗组件
function HistoryModal({ isOpen, onClose, fundCode, theme }) {
  const [historyRange, setHistoryRange] = useState('1m');
  const [allHistoryData, setAllHistoryData] = useState([]);
  const [displayedData, setDisplayedData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const modalContentRef = useRef(null);
  
  const PAGE_SIZE = 20; // 弹窗内每页显示20条数据
  
  // 时间范围配置
  const timeRangeConfig = [
    { key: '1m', label: '1个月' },
    { key: '3m', label: '3个月' },
    { key: '6m', label: '6个月' },
    { key: '1y', label: '1年' },
    { key: '3y', label: '3年' },
    { key: 'all', label: '全部' }
  ];

  // 计算日涨幅
  const calculateDailyChange = (current, previous) => {
    if (!previous || previous.value === 0 || current.value === previous.value) {
      return { value: null, formatted: '--' };
    }
    
    const change = ((current.value - previous.value) / previous.value) * 100;
    const formatted = `${change > 0 ? '+' : ''}${change.toFixed(2)}%`;
    return { value: change, formatted };
  };

  // 获取历史净值数据
  const loadHistoryData = useCallback(async (code, range, page = 1) => {
    if (!code || loadingHistory) return;
    
    if (page === 1) {
      setLoadingHistory(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      const data = await fetchFundHistory(code, range);
      
      // 对数据进行倒序排列，确保最新日期在前面
      const sortedData = [...(data || [])].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
      });

      // 计算日涨幅
      const dataWithChange = sortedData.map((item, index) => {
        const prevItem = sortedData[index + 1]; // 因为倒序排列，所以下一条是前一天的
        const change = calculateDailyChange(item, prevItem);
        return {
          ...item,
          change: change.value,
          changeFormatted: change.formatted
        };
      });

      setAllHistoryData(dataWithChange);
      
      // 弹窗内显示所有数据，通过滚动加载
      setDisplayedData(dataWithChange);
      setCurrentPage(1);
    } catch (error) {
      console.error('获取历史净值失败:', error);
      setAllHistoryData([]);
      setDisplayedData([]);
    } finally {
      setLoadingHistory(false);
      setLoadingMore(false);
    }
  }, [loadingHistory]);

  // 当时间范围变化时重新加载数据
  useEffect(() => {
    if (isOpen && fundCode) {
      loadHistoryData(fundCode, historyRange);
    }
  }, [isOpen, fundCode, historyRange, loadHistoryData]);

  // 处理滚动加载
  const handleScroll = useCallback(() => {
    if (!modalContentRef.current || loadingMore || loadingHistory) return;
    
    const { scrollTop, scrollHeight, clientHeight } = modalContentRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    if (isNearBottom && displayedData.length < allHistoryData.length) {
      const nextPage = currentPage + 1;
      const startIndex = 0;
      const endIndex = nextPage * PAGE_SIZE;
      const newData = allHistoryData.slice(startIndex, Math.min(endIndex, allHistoryData.length));
      
      setDisplayedData(newData);
      setCurrentPage(nextPage);
    }
  }, [loadingMore, loadingHistory, displayedData.length, allHistoryData.length, currentPage, PAGE_SIZE]);

  // 添加滚动事件监听
  useEffect(() => {
    const contentElement = modalContentRef.current;
    if (contentElement) {
      contentElement.addEventListener('scroll', handleScroll);
      return () => contentElement.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-medium">历史净值详情</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div className="p-4 border-b border-border">
          <div className="flex gap-2 flex-wrap">
            {timeRangeConfig.map(({ key, label }) => (
              <button
                key={key}
                className={`px-3 py-1.5 text-sm rounded whitespace-nowrap transition-colors ${
                  historyRange === key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
                onClick={() => setHistoryRange(key)}
                disabled={loadingHistory}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        
        <div 
          ref={modalContentRef}
          className="overflow-y-auto max-h-[calc(80vh-140px)]"
        >
          {loadingHistory ? (
            <div className="text-center py-8 text-muted">加载中...</div>
          ) : displayedData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card z-10">
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-medium text-muted-foreground whitespace-nowrap">日期</th>
                    <th className="text-left p-3 font-medium text-muted-foreground whitespace-nowrap">单位净值</th>
                    <th className="text-left p-3 font-medium text-muted-foreground whitespace-nowrap">日涨幅</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedData.map((item, idx) => {
                    const getChangeColor = () => {
                      if (!item.changeFormatted || item.changeFormatted === '--') {
                        return 'text-muted-foreground';
                      }
                      return item.changeFormatted.startsWith('+') 
                        ? 'text-red-400 dark:text-red-300'
                        : 'text-green-400 dark:text-green-300';
                    };

                    return (
                      <tr key={idx} className="border-b border-border hover:bg-secondary/20 transition-colors">
                        <td className="p-3 whitespace-nowrap">{item.date}</td>
                        <td className="p-3 whitespace-nowrap font-medium">{item.value.toFixed(4)}</td>
                        <td className={`p-3 whitespace-nowrap font-medium ${getChangeColor()}`}>
                          {item.changeFormatted}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {loadingMore && (
                <div className="text-center py-4 text-muted text-sm">加载更多...</div>
              )}
              
              {displayedData.length < allHistoryData.length && (
                <div className="text-center py-4 text-xs text-muted-foreground">
                  已加载 {displayedData.length} 条，共 {allHistoryData.length} 条数据
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted">暂无历史数据</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FundCard({
  fund: f,
  todayStr,
  currentTab,
  favorites,
  dcaPlans,
  holdings,
  percentModes,
  valuationSeries,
  collapsedCodes,
  collapsedTrends,
  transactions,
  theme,
  isTradingDay,
  refreshing,
  getHoldingProfit,
  onRemoveFromGroup,
  onToggleFavorite,
  onRemoveFund,
  onHoldingClick,
  onActionClick,
  onPercentModeToggle,
  onToggleCollapse,
  onToggleTrendCollapse,
  layoutMode = 'card', // 'card' | 'drawer'，drawer 时前10重仓与业绩走势以 Tabs 展示
  masked = false,
}) {
  const holding = holdings[f?.code];
  const profit = getHoldingProfit?.(f, holding) ?? null;
  const hasHoldings = f.holdingsIsLastQuarter && Array.isArray(f.holdings) && f.holdings.length > 0;

  // 新增状态：历史净值相关
  const [showHistoryModal, setShowHistoryModal] = useState(false); // 控制历史净值弹窗显示
  const [previewHistoryData, setPreviewHistoryData] = useState([]); // 预览用历史数据

  // 获取预览历史数据
  useEffect(() => {
    if (f?.code) {
      const loadPreviewData = async () => {
        try {
          const data = await fetchFundHistory(f.code, '1m');
          if (data && data.length > 0) {
            // 对数据进行倒序排列，取最新5条
            const sortedData = [...data].sort((a, b) => {
              return new Date(b.date) - new Date(a.date);
            }).slice(0, 5);
            
            // 计算日涨幅
            const dataWithChange = sortedData.map((item, index) => {
              const prevItem = sortedData[index + 1];
              let changeFormatted = '--';
              if (prevItem && prevItem.value !== 0 && item.value !== prevItem.value) {
                const change = ((item.value - prevItem.value) / prevItem.value) * 100;
                changeFormatted = `${change > 0 ? '+' : ''}${change.toFixed(2)}%`;
              }
              return {
                ...item,
                changeFormatted
              };
            });
            
            setPreviewHistoryData(dataWithChange);
          }
        } catch (error) {
          console.error('获取预览历史数据失败:', error);
          setPreviewHistoryData([]);
        }
      };
      
      loadPreviewData();
    }
  }, [f?.code]);

  const style = layoutMode === 'drawer' ? {
    border: 'none',
    boxShadow: 'none',
    paddingLeft: 0,
    paddingRight: 0,
    background: theme === 'light'  ? 'rgb(250,250,250)' : 'none',
  } : {};

  return (
    <motion.div
      className="glass card"
      style={{
        position: 'relative',
        zIndex: 1,
        ...style,
      }}
    >
      <div className="row" style={{ marginBottom: 10 }}>
        <div className="title">
          {currentTab !== 'all' && currentTab !== 'fav' ? (
            <button
              className="icon-button fav-button"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFromGroup?.(f.code);
              }}
              style={{backgroundColor: 'transparent'}}
              title="从当前分组移除"
            >
              <ExitIcon width="18" height="18" style={{ transform: 'rotate(180deg)' }} />
            </button>
          ) : (
            <button
              className={`icon-button fav-button ${favorites?.has(f.code) ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite?.(f.code);
              }}
              title={favorites?.has(f.code) ? '取消自选' : '添加自选'}
            >
              <StarIcon width="18" height="18" filled={favorites?.has(f.code)} />
            </button>
          )}
          <div className="title-text">
            <span
              className="name-text"
              title={f.jzrq === todayStr ? '今日净值已更新' : ''}
            >
              {f.name}
            </span>
            <span className="muted">
              #{f.code}
              {dcaPlans?.[f.code]?.enabled === true && <span className="dca-indicator">定</span>}
              {f.jzrq === todayStr && <span className="updated-indicator">✓</span>}
            </span>
          </div>
        </div>

        <div className="actions">
          <div className="badge-v">
            <span>{f.noValuation ? '净值日期' : '估值时间'}</span>
            <strong>{f.noValuation ? (f.jzrq || '-') : (f.gztime || f.time || '-')}</strong>
          </div>
          <div className="row" style={{ gap: 4 }}>
            <button
              className="icon-button danger"
              onClick={() => !refreshing && onRemoveFund?.(f)}
              title="删除"
              disabled={refreshing}
              style={{
                width: '28px',
                height: '28px',
                opacity: refreshing ? 0.6 : 1,
                cursor: refreshing ? 'not-allowed' : 'pointer',
              }}
            >
              <TrashIcon width="14" height="14" />
            </button>
          </div>
        </div>
      </div>

      <div className="row" style={{ marginBottom: 12 }}>
        <Stat label="单位净值" value={f.dwjz ?? '—'} />
        {f.noValuation ? (
          <Stat
            label="涨跌幅"
            value={
              f.zzl !== undefined && f.zzl !== null
                ? `${f.zzl > 0 ? '+' : ''}${Number(f.zzl).toFixed(2)}%`
                : '—'
            }
            delta={f.zzl}
          />
        ) : (
          <>
            {(() => {
              const hasTodayData = f.jzrq === todayStr;
              let isYesterdayChange = false;
              let isPreviousTradingDay = false;
              if (!hasTodayData && isString(f.jzrq)) {
                const today = toTz(todayStr).startOf('day');
                const jzDate = toTz(f.jzrq).startOf('day');
                const yesterday = today.clone().subtract(1, 'day');
                if (jzDate.isSame(yesterday, 'day')) {
                  isYesterdayChange = true;
                } else if (jzDate.isBefore(yesterday, 'day')) {
                  isPreviousTradingDay = true;
                }
              }
              const shouldHideChange =
                isTradingDay && !hasTodayData && !isYesterdayChange && !isPreviousTradingDay;

              if (shouldHideChange) return null;

              const changeLabel = hasTodayData ? '涨跌幅' : '昨日涨幅';
              return (
                <Stat
                  label={changeLabel}
                  value={
                    f.zzl !== undefined
                      ? `${f.zzl > 0 ? '+' : ''}${Number(f.zzl).toFixed(2)}%`
                      : ''
                  }
                  delta={f.zzl}
                />
              );
            })()}
            <Stat
              label="估值净值"
              value={
                f.estPricedCoverage > 0.05 ? f.estGsz.toFixed(4) : (f.gsz ?? '—')
              }
            />
            <Stat
              label="估值涨幅"
              value={
                f.estPricedCoverage > 0.05
                  ? `${f.estGszzl > 0 ? '+' : ''}${f.estGszzl.toFixed(2)}%`
                  : isNumber(f.gszzl)
                    ? `${f.gszzl > 0 ? '+' : ''}${f.gszzl.toFixed(2)}%`
                    : f.gszzl ?? '—'
              }
              delta={f.estPricedCoverage > 0.05 ? f.estGszzl : Number(f.gszzl) || 0}
            />
          </>
        )}
      </div>

      <div className="row" style={{ marginBottom: 12 }}>
        {!profit ? (
          <div
            className="stat"
            style={{ flexDirection: 'column', gap: 4 }}
          >
            <span className="label">持仓金额</span>
            <div
              className="value muted"
              style={{
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
              }}
              onClick={() => onHoldingClick?.(f)}
            >
              未设置  <SettingsIcon width="12" height="12" />
            </div>
          </div>
        ) : (
          <>
            <div
              className="stat"
              style={{ cursor: 'pointer', flexDirection: 'column', gap: 4 }}
              onClick={() => onActionClick?.(f)}
            >
              <span
                className="label"
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              >
                持仓金额 <SettingsIcon width="12" height="12" style={{ opacity: 0.7 }} />
              </span>
              <span className="value">
                {masked ? '******' : `¥${profit.amount.toFixed(2)}`}
              </span>
            </div>
            <div className="stat" style={{ flexDirection: 'column', gap: 4 }}>
              <span className="label">当日收益</span>
              <span
                className={`value ${
                  profit.profitToday != null
                    ? profit.profitToday > 0
                      ? 'up'
                      : profit.profitToday < 0
                        ? 'down'
                        : ''
                    : 'muted'
                }`}
              >
                {profit.profitToday != null
                  ? masked
                    ? '******'
                    : `${profit.profitToday > 0 ? '+' : profit.profitToday < 0 ? '-' : ''}¥${Math.abs(profit.profitToday).toFixed(2)}`
                  : '--'}
              </span>
            </div>
            {profit.profitTotal !== null && (
              <div
                className="stat"
                onClick={(e) => {
                  e.stopPropagation();
                  onPercentModeToggle?.(f.code);
                }}
                style={{ cursor: 'pointer', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}
                title="点击切换金额/百分比"
              >
                <span
                  className="label"
                  style={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}
                >
                  持有收益{percentModes?.[f.code] ? '(%)' : ''}
                  <SwitchIcon />
                </span>
                <span
                  className={`value ${
                    profit.profitTotal > 0 ? 'up' : profit.profitTotal < 0 ? 'down' : ''
                  }`}
                >
                  {masked
                    ? '******'
                    : <>
                        {profit.profitTotal > 0 ? '+' : profit.profitTotal < 0 ? '-' : ''}
                        {percentModes?.[f.code]
                          ? `${Math.abs(
                              holding?.cost * holding?.share
                                ? (profit.profitTotal / (holding.cost * holding.share)) * 100
                                : 0,
                            ).toFixed(2)}%`
                          : `¥${Math.abs(profit.profitTotal).toFixed(2)}`}
                      </>}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {f.estPricedCoverage > 0.05 && (
        <div
          style={{
            fontSize: '10px',
            color: 'var(--muted)',
            marginTop: -8,
            marginBottom: 10,
            textAlign: 'right',
          }}
        >
          基于 {Math.round(f.estPricedCoverage * 100)}% 持仓估算
        </div>
      )}

      {(() => {
        const showIntraday =
          Array.isArray(valuationSeries?.[f.code]) && valuationSeries[f.code].length >= 2;
        if (!showIntraday) return null;

        if (
          f.gztime &&
          toTz(todayStr).startOf('day').isAfter(toTz(f.gztime).startOf('day'))
        ) {
          return null;
        }

        if (
          f.jzrq &&
          f.gztime &&
          toTz(f.jzrq).startOf('day').isSameOrAfter(toTz(f.gztime).startOf('day'))
        ) {
          return null;
        }

        return (
          <FundIntradayChart
            key={`${f.code}-intraday-${theme}`}
            series={valuationSeries[f.code]}
            referenceNav={f.dwjz != null ? Number(f.dwjz) : undefined}
            theme={theme}
          />
        );
      })()}

      {/* 1. 前10重仓股票 - 调整到第一位 */}
      {hasHoldings && (
        <>
          <div
            style={{ marginBottom: 8, cursor: 'pointer', userSelect: 'none' }}
            className="title"
            onClick={() => onToggleCollapse?.(f.code)}
          >
            <div className="row" style={{ width: '100%', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>前10重仓股票</span>
                <ChevronIcon
                  width="16"
                  height="16"
                  className="muted"
                  style={{
                    transform: collapsedCodes?.has(f.code)
                      ? 'rotate(-90deg)'
                      : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                  }}
                />
              </div>
              <span className="muted">涨跌幅 / 占比</span>
            </div>
          </div>
          <AnimatePresence>
            {!collapsedCodes?.has(f.code) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                style={{ overflow: 'hidden' }}
              >
                <div className="list">
                  {f.holdings.map((h, idx) => (
                    <div className="item" key={idx}>
                      <span className="name">{h.name}</span>
                      <div className="values">
                        {isNumber(h.change) && (
                          <span
                            className={`badge ${h.change > 0 ? 'up' : h.change < 0 ? 'down' : ''}`}
                            style={{ marginRight: 8 }}
                          >
                            {h.change > 0 ? '+' : ''}
                            {h.change.toFixed(2)}%
                          </span>
                        )}
                        <span className="weight">{h.weight}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* 2. 业绩走势 - 调整到第二位 */}
      <div style={{ marginTop: '16px', marginBottom: '16px' }}>
        <FundTrendChart
          key={`${f.code}-${theme}`}
          code={f.code}
          isExpanded={!collapsedTrends?.has(f.code)}
          onToggleExpand={() => onToggleTrendCollapse?.(f.code)}
          transactions={transactions?.[f.code] || []}
          theme={theme}
        />
      </div>

      {/* 3. 历史净值 - 调整到第三位，改为弹窗形式 */}
      <div
        style={{ marginBottom: 8, cursor: 'pointer', userSelect: 'none' }}
        className="title"
        onClick={() => setShowHistoryModal(true)}
      >
        <div className="row" style={{ width: '100%', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>历史净值</span>
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="muted"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
          </div>
          <span className="muted">点击查看详情</span>
        </div>
      </div>
      
      {/* 历史净值预览 */}
      {previewHistoryData.length > 0 && (
        <div className="mb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 font-medium text-muted-foreground whitespace-nowrap">日期</th>
                  <th className="text-left p-2 font-medium text-muted-foreground whitespace-nowrap">单位净值</th>
                  <th className="text-left p-2 font-medium text-muted-foreground whitespace-nowrap">日涨幅</th>
                </tr>
              </thead>
              <tbody>
                {previewHistoryData.map((item, idx) => {
                  const getChangeColor = () => {
                    if (!item.changeFormatted || item.changeFormatted === '--') {
                      return 'text-muted-foreground';
                    }
                    return item.changeFormatted.startsWith('+') 
                      ? 'text-red-400 dark:text-red-300'
                      : 'text-green-400 dark:text-green-300';
                  };

                  return (
                    <tr key={idx} className="border-b border-border hover:bg-secondary/20 transition-colors">
                      <td className="p-2 whitespace-nowrap">{item.date}</td>
                      <td className="p-2 whitespace-nowrap font-medium">{item.value.toFixed(4)}</td>
                      <td className={`p-2 whitespace-nowrap font-medium ${getChangeColor()}`}>
                        {item.changeFormatted}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="mt-2 text-center">
            <button
              onClick={() => setShowHistoryModal(true)}
              className="px-4 py-2 text-sm bg-secondary hover:bg-secondary/80 text-foreground rounded-md transition-colors w-full"
            >
              查看完整历史净值
            </button>
          </div>
        </div>
      )}

      {/* 历史净值弹窗 */}
      <HistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        fundCode={f?.code}
        theme={theme}
      />
    </motion.div>
  );
}
