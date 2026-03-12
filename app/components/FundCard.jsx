'use client';

import { useState, useEffect, useCallback } from 'react';
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
  CalendarIcon,
  RefreshIcon,
} from './Icons';
import { fetchFundNetValueHistoryByRange } from '../lib/api';

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

const formatDisplayDate = (value) => {
  if (!value) return '-';

  const d = toTz(value);
  if (!d.isValid()) return value;

  const hasTime = /[T\s]\d{2}:\d{2}/.test(String(value));

  return hasTime ? d.format('MM-DD HH:mm') : d.format('MM-DD');
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
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRange, setHistoryRange] = useState('1m');
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [historyLastUpdated, setHistoryLastUpdated] = useState(null);

  // 获取历史净值数据
  const loadHistoryData = useCallback(async (range) => {
    if (!f?.code || historyLoading) return;
    
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const result = await fetchFundNetValueHistoryByRange(f.code, range);
      
      if (result && result.data) {
        // 处理涨跌幅格式
        const processedData = result.data.map(item => {
          let dailyChangeFormatted = item.dailyChange || '--';
          // 提取数字百分比
          const match = dailyChangeFormatted.match(/([-+]?[\d.]+)%/);
          const changeValue = match ? parseFloat(match[1]) : null;
          
          return {
            ...item,
            dailyChangeFormatted,
            changeValue,
            isUp: changeValue > 0,
            isDown: changeValue < 0
          };
        });
        
        setHistoryData(processedData);
        setHistoryLastUpdated(Date.now());
      } else {
        setHistoryData([]);
      }
    } catch (error) {
      console.error('获取历史净值失败:', error);
      setHistoryError('获取历史净值失败，请稍后重试');
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [f?.code, historyLoading]);

  // 初始加载或range变化时重新加载
  useEffect(() => {
    if (f?.code && historyExpanded) {
      loadHistoryData(historyRange);
    }
  }, [f?.code, historyRange, historyExpanded, loadHistoryData]);

  // 处理时间范围变更
  const handleHistoryRangeChange = (range) => {
    setHistoryRange(range);
  };

  // 刷新历史净值数据
  const handleRefreshHistory = () => {
    loadHistoryData(historyRange);
  };

  // 格式化日期显示
  const formatHistoryDate = (dateStr) => {
    const d = dayjs(dateStr);
    return d.isValid() ? d.format('MM-DD') : dateStr;
  };

  // 渲染历史净值表格
  const renderHistoryTable = () => {
    if (historyLoading) {
      return (
        <div style={{ 
          padding: '48px 20px', 
          textAlign: 'center',
          color: 'var(--muted)',
          fontSize: '14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid rgba(34, 211, 238, 0.2)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <style jsx>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
          加载历史净值中...
        </div>
      );
    }
    
    if (historyError) {
      return (
        <div style={{ 
          padding: '48px 20px', 
          textAlign: 'center',
          color: 'var(--danger)',
          fontSize: '14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ fontSize: '12px' }}>{historyError}</div>
          <button
            onClick={handleRefreshHistory}
            style={{
              marginTop: '8px',
              padding: '8px 16px',
              background: 'rgba(34, 211, 238, 0.1)',
              border: '1px solid rgba(34, 211, 238, 0.3)',
              borderRadius: '8px',
              color: 'var(--primary)',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
            className="hover:opacity-80"
          >
            <RefreshIcon width="12" height="12" />
            重试
          </button>
        </div>
      );
    }
    
    if (historyData.length === 0) {
      return (
        <div style={{ 
          padding: '48px 20px', 
          textAlign: 'center',
          color: 'var(--muted)',
          fontSize: '14px'
        }}>
          暂无历史净值数据
        </div>
      );
    }
    
    return (
      <div className="scrollbar-y-styled" style={{ 
        maxHeight: '320px',
        overflowY: 'auto',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        backgroundColor: theme === 'light' ? 'var(--card)' : 'rgba(11, 18, 32, 0.6)'
      }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          fontSize: '12px',
          tableLayout: 'fixed'
        }}>
          <thead>
            <tr style={{ 
              backgroundColor: theme === 'light' ? 'var(--table-pinned-header-bg)' : 'rgba(255, 255, 255, 0.05)',
              borderBottom: '1px solid var(--border)',
              position: 'sticky',
              top: 0,
              zIndex: 1
            }}>
              <th style={{ 
                padding: '12px 12px', 
                textAlign: 'left', 
                fontWeight: 600,
                color: 'var(--text)',
                width: '25%',
                position: 'sticky',
                top: 0,
                backgroundColor: 'inherit',
                borderRight: '1px solid var(--border)'
              }}>
                日期
              </th>
              <th style={{ 
                padding: '12px 12px', 
                textAlign: 'right', 
                fontWeight: 600,
                color: 'var(--text)',
                width: '25%',
                position: 'sticky',
                top: 0,
                backgroundColor: 'inherit',
                borderRight: '1px solid var(--border)'
              }}>
                单位净值
              </th>
              <th style={{ 
                padding: '12px 12px', 
                textAlign: 'right', 
                fontWeight: 600,
                color: 'var(--text)',
                width: '25%',
                position: 'sticky',
                top: 0,
                backgroundColor: 'inherit',
                borderRight: '1px solid var(--border)'
              }}>
                累计净值
              </th>
              <th style={{ 
                padding: '12px 12px', 
                textAlign: 'right', 
                fontWeight: 600,
                color: 'var(--text)',
                width: '25%',
                position: 'sticky',
                top: 0,
                backgroundColor: 'inherit'
              }}>
                日涨跌幅
              </th>
            </tr>
          </thead>
          <tbody>
            {historyData.map((item, index) => (
              <tr 
                key={index} 
                style={{ 
                  borderBottom: '1px solid var(--border)',
                  backgroundColor: index % 2 === 0 ? 'transparent' : (theme === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.02)'),
                  transition: 'background-color 0.2s ease',
                  cursor: 'pointer'
                }}
                className="hover:bg-[--table-row-hover-bg]"
                onClick={() => {
                  // 可以添加点击行的事件，比如查看详情
                  console.log('查看净值详情:', item);
                }}
              >
                <td style={{ 
                  padding: '12px 12px',
                  color: 'var(--text)',
                  fontWeight: 500,
                  borderRight: '1px solid var(--border)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {formatHistoryDate(item.date)}
                </td>
                <td style={{ 
                  padding: '12px 12px', 
                  textAlign: 'right',
                  color: 'var(--text)',
                  fontWeight: 600,
                  borderRight: '1px solid var(--border)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {item.unitNetValue || '--'}
                </td>
                <td style={{ 
                  padding: '12px 12px', 
                  textAlign: 'right',
                  color: 'var(--text)',
                  fontWeight: 600,
                  borderRight: '1px solid var(--border)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {item.cumulativeNetValue || item.unitNetValue || '--'}
                </td>
                <td style={{ 
                  padding: '12px 12px', 
                  textAlign: 'right',
                  fontWeight: 600,
                  color: item.isUp ? 'var(--danger)' : item.isDown ? 'var(--success)' : 'var(--text)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {item.dailyChangeFormatted || '--'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

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

      {layoutMode === 'drawer' ? (
        <Tabs defaultValue={hasHoldings ? 'holdings' : 'trend'} className="w-full">
          <TabsList className={`w-full ${hasHoldings ? 'grid grid-cols-2' : ''}`}>
            {hasHoldings && (
              <TabsTrigger value="holdings">前10重仓股票</TabsTrigger>
            )}
            <TabsTrigger value="trend">业绩走势</TabsTrigger>
          </TabsList>
          {hasHoldings && (
            <TabsContent value="holdings" className="mt-3 outline-none">
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
            </TabsContent>
          )}
          <TabsContent value="trend" className="mt-3 outline-none">
            <FundTrendChart
              key={`${f.code}-${theme}`}
              code={f.code}
              isExpanded
              onToggleExpand={() => onToggleTrendCollapse?.(f.code)}
              transactions={transactions?.[f.code] || []}
              theme={theme}
              hideHeader
            />
          </TabsContent>
        </Tabs>
      ) : (
        <>
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
          <FundTrendChart
            key={`${f.code}-${theme}`}
            code={f.code}
            isExpanded={!collapsedTrends?.has(f.code)}
            onToggleExpand={() => onToggleTrendCollapse?.(f.code)}
            transactions={transactions?.[f.code] || []}
            theme={theme}
          />
        </>
      )}

      {/* 新增：历史净值部分 */}
      <div style={{ marginTop: '20px' }}>
        <div
          style={{ 
            marginBottom: '12px', 
            cursor: 'pointer', 
            userSelect: 'none',
            padding: '8px 0',
            borderBottom: '1px solid var(--border)'
          }}
          className="title"
          onClick={() => setHistoryExpanded(!historyExpanded)}
        >
          <div className="row" style={{ width: '100%', flex: 1, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarIcon width="16" height="16" className="muted" />
              <span style={{ fontWeight: 600, fontSize: '15px' }}>历史净值</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {historyLastUpdated && (
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                  更新于 {dayjs(historyLastUpdated).format('HH:mm')}
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRefreshHistory();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="刷新历史净值"
                className="hover:bg-[--table-row-hover-bg] hover:text-[--text]"
              >
                <RefreshIcon width="14" height="14" />
              </button>
              <ChevronIcon
                width="16"
                height="16"
                className="muted"
                style={{
                  transform: historyExpanded ? 'rotate(-90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                }}
              />
            </div>
          </div>
        </div>
        
        <AnimatePresence>
          {historyExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}
            >
              {/* 日期范围选择器 */}
              <div style={{ 
                display: 'flex', 
                gap: '4px', 
                marginBottom: '16px',
                flexWrap: 'wrap'
              }}>
                {[
                  { key: '1m', label: '近1月' },
                  { key: '3m', label: '近3月' },
                  { key: '6m', label: '近6月' },
                  { key: '1y', label: '近1年' },
                  { key: 'all', label: '全部' }
                ].map((rangeItem) => (
                  <button
                    key={rangeItem.key}
                    onClick={() => handleHistoryRangeChange(rangeItem.key)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${
                        historyRange === rangeItem.key 
                          ? 'var(--primary)' 
                          : 'var(--border)'
                      }`,
                      background: historyRange === rangeItem.key 
                        ? 'rgba(34, 211, 238, 0.15)' 
                        : theme === 'light' 
                          ? 'rgba(255, 255, 255, 0.9)' 
                          : 'rgba(255, 255, 255, 0.05)',
                      color: historyRange === rangeItem.key 
                        ? 'var(--primary)' 
                        : 'var(--text)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontWeight: historyRange === rangeItem.key ? 600 : 400,
                      backdropFilter: 'blur(8px)',
                      flex: '1',
                      minWidth: '0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                    className="hover:border-[--primary] hover:text-[--primary]"
                  >
                    {rangeItem.label}
                  </button>
                ))}
              </div>
              
              {/* 历史净值表格 */}
              {renderHistoryTable()}
              
              {/* 数据说明 */}
              <div style={{ 
                marginTop: '12px',
                fontSize: '11px',
                color: 'var(--muted)',
                textAlign: 'center',
                padding: '8px',
                borderRadius: '6px',
                backgroundColor: theme === 'light' ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)'
              }}>
                数据来源：东方财富网 | 共{historyData.length}条记录
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
