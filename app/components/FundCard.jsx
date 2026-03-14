'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { fetchFundHistoryFromMobAPI } from '@/app/api/fund';

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

// 虚拟滚动表格组件
const VirtualScrollTable = ({ 
  data, 
  loading, 
  hasMore, 
  onLoadMore,
  rowHeight = 53,
  buffer = 5,
  theme = 'light'
}) => {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400); // 默认高度

  // 更新容器高度
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const height = Math.min(500, window.innerHeight * 0.6);
        setContainerHeight(height);
      }
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // 计算可见行
  const { visibleData, startIndex, totalHeight } = useMemo(() => {
    if (!data.length) {
      return { visibleData: [], startIndex: 0, totalHeight: 0 };
    }

    const visibleRowCount = Math.ceil(containerHeight / rowHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
    const endIndex = Math.min(
      data.length - 1,
      startIndex + visibleRowCount + buffer * 2
    );

    const visibleData = data.slice(startIndex, endIndex + 1);
    const totalHeight = data.length * rowHeight;

    return { visibleData, startIndex, totalHeight };
  }, [data, scrollTop, containerHeight, rowHeight, buffer]);

  // 处理滚动
  const handleScroll = useCallback((e) => {
    if (!containerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setScrollTop(scrollTop);

    // 检查是否滚动到底部
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    if (isAtBottom && hasMore && !loading) {
      onLoadMore();
    }
  }, [hasMore, loading, onLoadMore]);

  // 行渲染
  const renderRow = (item, index) => {
    const actualIndex = startIndex + index;
    const top = actualIndex * rowHeight;
    const colorClass = getStatColorClass(item.change);
    const bgColor = actualIndex % 2 === 0 
      ? (theme === 'dark' ? 'var(--background)' : '#ffffff')
      : (theme === 'dark' ? 'var(--muted)' : '#f9f9f9');

    return (
      <div
        key={`${item.date}-${actualIndex}`}
        style={{
          position: 'absolute',
          top: `${top}px`,
          left: 0,
          right: 0,
          height: `${rowHeight}px`,
          display: 'flex',
          alignItems: 'center',
          backgroundColor: bgColor,
          borderBottom: '1px solid var(--border)',
        }}
        className="hover:bg-secondary/20 transition-colors"
      >
        <div className="flex-1 p-3 whitespace-nowrap font-medium text-base min-w-[120px]">
          {item.date}
        </div>
        <div className="flex-1 p-3 whitespace-nowrap font-medium text-base min-w-[120px]">
          {item.value.toFixed(4)}
        </div>
        <div className={`flex-1 p-3 whitespace-nowrap font-medium text-base min-w-[120px] ${colorClass}`}>
          {item.changeFormatted}
        </div>
      </div>
    );
  };

  return (
    <div className="border border-border rounded-md overflow-hidden">
      {/* 表头 - 固定 */}
      <div className="grid grid-cols-3 bg-secondary text-secondary-foreground font-medium text-base sticky top-0 z-10">
        <div className="p-3 whitespace-nowrap">日期</div>
        <div className="p-3 whitespace-nowrap">单位净值</div>
        <div className="p-3 whitespace-nowrap">日涨跌幅</div>
      </div>

      {/* 虚拟滚动容器 */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          height: `${containerHeight}px`,
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
          {visibleData.map((item, index) => renderRow(item, index))}
        </div>

        {/* 底部加载状态 */}
        {loading && (
          <div 
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              textAlign: 'center',
              padding: '12px',
              backgroundColor: 'var(--background)',
              borderTop: '1px solid var(--border)'
            }}
          >
            正在加载更多历史净值...
          </div>
        )}
      </div>

      {/* 分页信息 */}
      <div className="p-3 text-xs text-muted-foreground border-t border-border bg-secondary/50">
        已加载 {data.length} 条记录
        {hasMore && !loading && '，滚动到底部或点击"加载更多"以获取更多'}
      </div>
    </div>
  );
};

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
  const [historyPagination, setHistoryPagination] = useState({
    currentPage: 0,
    totalPages: 1,
    hasMore: false,
    totalRecords: 0
  });

  const PAGE_SIZE = 20;
  const loadHistoryTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  const timeRangeConfig = [
    { key: '1m', label: '1个月' },
    { key: '3m', label: '3个月' },
    { key: '6m', label: '6个月' },
    { key: '1y', label: '1年' },
    { key: '3y', label: '3年' },
    { key: 'all', label: '全部' }
  ];

  // 清理函数
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (loadHistoryTimerRef.current) {
        clearTimeout(loadHistoryTimerRef.current);
      }
    };
  }, []);

  // 加载历史数据函数
  const loadHistoryData = useCallback(async (code, range, page = 1, isLoadMore = false) => {
    if (!code || loadingHistory || !isMountedRef.current) return;
    
    setLoadingHistory(true);
    
    try {
      const result = await fetchFundHistoryFromMobAPI(code, range, page, PAGE_SIZE);
      
      if (!isMountedRef.current) return;
      
      if (result.data && Array.isArray(result.data)) {
        if (isLoadMore) {
          // 加载更多：合并数据，去重
          const existingDates = new Set(allHistoryData.map(item => item.date));
          const newData = result.data.filter(item => !existingDates.has(item.date));
          setAllHistoryData(prev => [...prev, ...newData]);
        } else {
          // 首次加载或切换范围：替换数据
          setAllHistoryData(result.data);
        }
        
        setHistoryPagination({
          currentPage: result.currentPage || page,
          totalPages: result.totalPages || 1,
          hasMore: result.hasMore || false,
          totalRecords: result.totalRecords || 0
        });
      }
    } catch (error) {
      console.error('获取历史净值失败:', error);
    } finally {
      if (isMountedRef.current) {
        setLoadingHistory(false);
      }
    }
  }, [loadingHistory, PAGE_SIZE, allHistoryData]);

  // 处理加载更多
  const handleLoadMore = useCallback(() => {
    if (!f?.code || !historyPagination.hasMore || loadingHistory) return;
    
    const nextPage = historyPagination.currentPage + 1;
    loadHistoryData(f.code, historyRange, nextPage, true);
  }, [f?.code, historyRange, historyPagination, loadingHistory, loadHistoryData]);

  // 处理时间范围切换
  const handleRangeChange = useCallback((key) => {
    if (loadingHistory || key === historyRange) return;
    
    // 清除之前的定时器
    if (loadHistoryTimerRef.current) {
      clearTimeout(loadHistoryTimerRef.current);
    }
    
    // 立即更新状态
    setHistoryRange(key);
    setAllHistoryData([]);
    setHistoryPagination({
      currentPage: 0,
      totalPages: 1,
      hasMore: false,
      totalRecords: 0
    });
    
    // 防抖：延迟300ms后加载数据
    loadHistoryTimerRef.current = setTimeout(() => {
      if (f?.code) {
        loadHistoryData(f.code, key, 1, false);
      }
    }, 300);
  }, [f?.code, historyRange, loadingHistory, loadHistoryData]);

  // 初始加载或切换基金
  useEffect(() => {
    if (showHistory && f?.code) {
      loadHistoryData(f.code, historyRange, 1, false);
    }
  }, [f?.code, showHistory, loadHistoryData]);

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
      {/* 基金头部信息 */}
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

      {/* 基金概览信息 */}
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

      {/* 持仓和收益信息 */}
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

      {/* 实时估值图表 */}
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

      {/* 前10重仓股票 */}
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

      {/* 业绩走势图 */}
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

      {/* 历史净值部分 */}
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

              {loadingHistory && allHistoryData.length === 0 ? (
                <div className="text-center py-4 text-muted text-base">加载中...</div>
              ) : allHistoryData.length > 0 ? (
                <>
                  {/* 使用虚拟滚动表格 */}
                  <VirtualScrollTable
                    data={allHistoryData}
                    loading={loadingHistory}
                    hasMore={historyPagination.hasMore}
                    onLoadMore={handleLoadMore}
                    rowHeight={53}
                    buffer={5}
                    theme={theme}
                  />

                  {/* 手动加载更多按钮（备用） */}
                  {historyPagination.hasMore && !loadingHistory && (
                    <div className="mt-4 text-center">
                      <button
                        onClick={handleLoadMore}
                        className="px-4 py-2 text-sm bg-secondary hover:bg-secondary/80 text-foreground rounded-md transition-colors w-full"
                      >
                        加载更多历史净值 (第 {historyPagination.currentPage + 1} 页 / 共 {historyPagination.totalPages} 页)
                      </button>
                    </div>
                  )}
                </>
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
