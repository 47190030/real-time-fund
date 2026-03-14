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
import { fetchFundHistory } from '@/app/api/fund';
import { useState, useEffect, useCallback } from 'react';

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

  const [showHistory, setShowHistory] = useState(false);
  const [historyRange, setHistoryRange] = useState('1m');
  const [allHistoryData, setAllHistoryData] = useState([]);
  const [displayedData, setDisplayedData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(false);

  const PAGE_SIZE = 5;

  const timeRangeConfig = [
    { key: '1m', label: '1个月' },
    { key: '3m', label: '3个月' },
    { key: '6m', label: '6个月' },
    { key: '1y', label: '1年' },
    { key: '3y', label: '3年' },
    { key: 'all', label: '全部' }
  ];

  const calculateDailyChange = (current, previous) => {
    if (!previous || previous.value === 0 || current.value === previous.value) {
      return { value: null, formatted: '--' };
    }
    
    const change = ((current.value - previous.value) / previous.value) * 100;
    const formatted = `${change > 0 ? '+' : ''}${Math.abs(change).toFixed(2)}%`;
    return { value: change, formatted };
  };

  const loadHistoryData = useCallback(async (code, range) => {
    if (!code || loadingHistory) return;
    setLoadingHistory(true);
    try {
      const data = await fetchFundHistory(code, range);
      
      const sortedData = [...(data || [])].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
      });

      const dataWithChange = sortedData.map((item, index) => {
        const prevItem = sortedData[index + 1];
        const change = calculateDailyChange(item, prevItem);
        return {
          ...item,
          change: change.value,
          changeFormatted: change.formatted
        };
      });

      setAllHistoryData(dataWithChange);
      
      setCurrentPage(1);
      setDisplayedData(dataWithChange.slice(0, PAGE_SIZE));
      setHasMoreData(dataWithChange.length > PAGE_SIZE);
    } catch (error) {
      console.error('获取历史净值失败:', error);
      setAllHistoryData([]);
      setDisplayedData([]);
      setHasMoreData(false);
    } finally {
      setLoadingHistory(false);
    }
  }, [loadingHistory, PAGE_SIZE]);

  const loadMoreData = () => {
    const nextPage = currentPage + 1;
    const startIndex = 0;
    const endIndex = nextPage * PAGE_SIZE;
    const newData = allHistoryData.slice(startIndex, endIndex);
    
    setDisplayedData(newData);
    setCurrentPage(nextPage);
    setHasMoreData(allHistoryData.length > newData.length);
  };

  useEffect(() => {
    if (f?.code) {
      loadHistoryData(f.code, historyRange);
    }
  }, [f?.code, historyRange, loadHistoryData]);

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
              <div className="flex gap-1 sm:gap-2 flex-wrap overflow-x-auto py-1">
                {timeRangeConfig.map(({ key, label }) => (
                  <button
                    key={key}
                    className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded whitespace-nowrap flex-shrink-0 transition-colors ${
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
                      {displayedData.map((item, idx) => {
                        const getChangeColor = () => {
                          if (item.change === null || item.change === undefined) {
                            return 'text-muted-foreground';
                          }
                          return item.change > 0 
                            ? 'text-red-400 dark:text-red-300'
                            : item.change < 0 
                              ? 'text-green-400 dark:text-green-300'
                              : 'text-muted-foreground';
                        };

                        return (
                          <tr key={idx} className="border-b border-border hover:bg-secondary/20 transition-colors">
                            <td className="p-3 whitespace-nowrap font-medium text-base">{item.date}</td>
                            <td className="p-3 whitespace-nowrap font-medium text-base">{item.value.toFixed(4)}</td>
                            <td className={`p-3 whitespace-nowrap font-medium text-base ${getChangeColor()}`}>
                              {item.change !== null && item.change !== undefined
                                ? `${item.change > 0 ? '+' : ''}${Math.abs(item.change).toFixed(2)}%`
                                : '--'}
                            </td>
                          </tr>
                        );
                      })}
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
