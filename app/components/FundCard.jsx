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
// 使用新的接口，它直接返回包含日涨跌幅的数据
import { fetchFundHistoryFromMobAPI } from '@/app/api/fund';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

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

// 日期格式化函数
const formatDisplayDate = (value) => {
  if (!value) return '-';

  const d = toTz(value);
  if (!d.isValid()) return value;

  const hasTime = /[T\s]\d{2}:\d{2}/.test(String(value));

  return hasTime ? d.format('MM-DD HH:mm') : d.format('MM-DD');
};

// Stat 组件的颜色判断逻辑
const getStatColorClass = (delta) => {
  if (delta > 0) return 'up';
  if (delta < 0) return 'down';
  return '';
};

// 优化表格行组件，使用 React.memo 避免不必要的重渲染
const HistoryTableRow = React.memo(({ date, value, changeFormatted, change }) => {
  const colorClass = getStatColorClass(change);
  return (
    <tr className="border-b border-border hover:bg-secondary/20 transition-colors">
      <td className="p-3 whitespace-nowrap font-medium text-base">{date}</td>
      <td className="p-3 whitespace-nowrap font-medium text-base">{value.toFixed(4)}</td>
      <td className={`p-3 whitespace-nowrap font-medium text-base ${colorClass}`}>
        {changeFormatted}
      </td>
    </tr>
  );
});
HistoryTableRow.displayName = 'HistoryTableRow';

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
  layoutMode = 'card',
  masked = false,
}) {
  const holding = holdings[f?.code];
  const profit = getHoldingProfit?.(f, holding) ?? null;
  const hasHoldings = f.holdingsIsLastQuarter && Array.isArray(f.holdings) && f.holdings.length > 0;

  // 历史净值相关状态
  const [showHistory, setShowHistory] = useState(false);
  const [historyRange, setHistoryRange] = useState('1m');
  const [allHistoryData, setAllHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // 分页相关状态
  const PAGE_SIZE = 5;
  const [currentPage, setCurrentPage] = useState(1);
  const [displayedData, setDisplayedData] = useState([]);
  const [hasMoreData, setHasMoreData] = useState(false);
  
  // 防抖和状态跟踪相关的 ref
  const hasFetchedRef = useRef(false);
  const isMountedRef = useRef(true);
  const loadHistoryTimerRef = useRef(null);
  const prevRangeRef = useRef('1m');

  const timeRangeConfig = [
    { key: '1m', label: '1个月' },
    { key: '3m', label: '3个月' },
    { key: '6m', label: '6个月' },
    { key: '1y', label: '1年' },
    { key: '3y', label: '3年' },
    { key: 'all', label: '全部' }
  ];

  // 优化：使用 useMemo 缓存表格行，避免每次渲染都重新计算
  const tableRows = useMemo(() => {
    return displayedData.map((item, idx) => (
      <HistoryTableRow
        key={`${item.date}-${idx}`}
        date={item.date}
        value={item.value}
        changeFormatted={item.changeFormatted}
        change={item.change}
      />
    ));
  }, [displayedData]);

  // 优化：稳定化的数据加载函数
  const loadHistoryData = useCallback(async (code, range) => {
    // 多个条件检查，防止重复请求
    if (!code || loadingHistory || hasFetchedRef.current || !isMountedRef.current) {
      return;
    }
    
    // 检查：如果已有数据且查询条件未变，跳过
    if (allHistoryData.length > 0 && range === prevRangeRef.current && code === f?.code) {
      return;
    }
    
    hasFetchedRef.current = true;
    prevRangeRef.current = range;
    setLoadingHistory(true);
    
    try {
      const data = await fetchFundHistoryFromMobAPI(code, range);
      
      if (!isMountedRef.current) return;
      
      // 关键优化：一次性更新所有相关状态，避免中间状态导致的多次渲染
      setAllHistoryData(data);
      setCurrentPage(1);
      setDisplayedData(data.slice(0, PAGE_SIZE));
      setHasMoreData(data.length > PAGE_SIZE);
      
    } catch (error) {
      console.error('获取历史净值失败:', error);
      if (isMountedRef.current) {
        setAllHistoryData([]);
        setDisplayedData([]);
        setCurrentPage(1);
        setHasMoreData(false);
      }
    } finally {
      if (isMountedRef.current) {
        // 延迟一点再设置loading为false，确保UI更新完成
        setTimeout(() => {
          if (isMountedRef.current) {
            setLoadingHistory(false);
          }
        }, 100);
      }
    }
  }, [loadingHistory, PAGE_SIZE, allHistoryData, f?.code]);

  // 加载更多数据的函数
  const loadMoreData = useCallback(() => {
    const nextPage = currentPage + 1;
    const startIndex = 0;
    const endIndex = nextPage * PAGE_SIZE;
    const newData = allHistoryData.slice(startIndex, endIndex);
    
    setDisplayedData(newData);
    setCurrentPage(nextPage);
    setHasMoreData(allHistoryData.length > newData.length);
  }, [currentPage, PAGE_SIZE, allHistoryData]);

  // 优化：防抖的时间范围切换处理
  const handleRangeChange = useCallback((key) => {
    if (loadingHistory) return;
    if (key === historyRange) return;
    
    // 清除之前的定时器
    if (loadHistoryTimerRef.current) {
      clearTimeout(loadHistoryTimerRef.current);
    }
    
    // 立即更新UI状态
    setHistoryRange(key);
    setAllHistoryData([]);
    setDisplayedData([]);
    setCurrentPage(1);
    
    // 设置防抖延迟，避免频繁切换导致的多次请求
    loadHistoryTimerRef.current = setTimeout(() => {
      hasFetchedRef.current = false;
    }, 300);
  }, [historyRange, loadingHistory]);

  // 主数据获取效果
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      if (loadHistoryTimerRef.current) {
        clearTimeout(loadHistoryTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // 只有当展开历史净值、基金代码变化、或时间范围变化时才获取数据
    if (!showHistory || !f?.code) return;
    
    // 重置请求标记
    hasFetchedRef.current = false;
    
    loadHistoryData(f.code, historyRange);
    
    return () => {
      // 清理函数
      hasFetchedRef.current = true;
    };
  }, [f?.code, historyRange, showHistory, loadHistoryData]);

  // 当切换时间范围时重置数据
  useEffect(() => {
    if (showHistory && f?.code && historyRange !== prevRangeRef.current) {
      hasFetchedRef.current = false;
    }
  }, [historyRange, showHistory, f?.code]);

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
      {/* 基金头部信息 - 保持不变 */}
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
            <strong>
              {f.noValuation
                ? formatDisplayDate(f.jzrq)
                : formatDisplayDate(f.gztime || f.time)}
            </strong>
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

      {/* 基金概览信息 - 保持不变 */}
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

      {/* 持仓和收益信息 - 保持不变 */}
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

      {/* 实时估值图表 - 保持不变 */}
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

      {/* 前10重仓股票 - 保持不变 */}
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

      {/* 业绩走势图 - 保持不变 */}
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

      {/* 历史净值部分 - 核心修复区域 */}
      <div
        style={{ marginBottom: 8, cursor: 'pointer', userSelect: 'none' }}
        className="title"
        onClick={() => setShowHistory(!showHistory)}
      >
        <div className="row" style={{ width: '100%', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>历史净值</span>
            <ChevronIcon
              width="16"
              height="16"
              className="muted"
              style={{
                transform: showHistory
                  ? 'rotate(0deg)'
                  : 'rotate(-90deg)',
                transition: 'transform 0.2s ease',
              }}
            />
          </div>
          <span className="muted"></span>
        </div>
      </div>
      
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="space-y-3">
              {/* 时间范围选择器 */}
              <div className="flex gap-1 sm:gap-2 flex-wrap overflow-x-auto py-1">
                {timeRangeConfig.map(({ key, label }) => (
                  <button
                    key={key}
                    className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded whitespace-nowrap flex-shrink-0 transition-colors ${
                      historyRange === key
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                    onClick={() => handleRangeChange(key)}
                    disabled={loadingHistory}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {loadingHistory ? (
                <div className="text-center py-4 text-muted text-base">加载中...</div>
              ) : displayedData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 font-medium text-muted-foreground whitespace-nowrap text-lg">日期</th>
                        <th className="text-left p-3 font-medium text-muted-foreground whitespace-nowrap text-lg">单位净值</th>
                        <th className="text-left p-3 font-medium text-muted-foreground whitespace-nowrap text-lg">日涨跌幅</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* 使用缓存的表格行 */}
                      {tableRows}
                    </tbody>
                  </table>
                  
                  {hasMoreData && (
                    <div className="mt-4 text-center">
                      <button
                        onClick={loadMoreData}
                        disabled={loadingHistory}
                        className="px-4 py-2 text-sm bg-secondary hover:bg-secondary/80 text-foreground rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full"
                      >
                        {loadingHistory ? '加载中...' : '加载更多历史净值'}
                      </button>
                      <div className="text-xs text-muted-foreground mt-2">
                        已显示 {displayedData.length} 条，共 {allHistoryData.length} 条数据
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-muted text-base">暂无历史数据</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
