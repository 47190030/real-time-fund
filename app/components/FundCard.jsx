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
  TableIcon,
  CardIcon,
  DownloadIcon,
} from './Icons';
import { useState, useMemo, useEffect, useCallback } from 'react';

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

// 历史净值组件
const HistoryNetValue = ({ 
  fundCode, 
  theme, 
  historyCollapsed, 
  onToggleHistoryCollapse,
  fetchFundHistory
}) => {
  const [historyData, setHistoryData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [historyViewMode, setHistoryViewMode] = useState('table');
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('1y');
  
  // 加载历史数据
  const loadHistoryData = useCallback(async () => {
    if (!fundCode || loading || historyData.length > 0) return;
    
    setLoading(true);
    try {
      const data = await fetchFundHistory(fundCode, timeRange);
      setHistoryData(data);
    } catch (error) {
      console.error('加载历史净值失败:', error);
    } finally {
      setLoading(false);
    }
  }, [fundCode, timeRange, historyData.length, loading]);

  // 展开时加载数据
  useEffect(() => {
    if (!historyCollapsed && historyData.length === 0) {
      loadHistoryData();
    }
  }, [historyCollapsed, historyData.length, loadHistoryData]);

  // 分页数据
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return historyData.slice(startIndex, endIndex);
  }, [historyData, currentPage, pageSize]);

  // 总页数
  const totalPages = Math.ceil(historyData.length / pageSize);

  // 导出数据
  const handleExport = () => {
    const csvContent = [
      '日期,单位净值,累计净值,日涨跌幅',
      ...historyData.map(item => `${item.date},${item.value},${item.accumulatedValue || '-'},${item.dailyChange || '-'}`)
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `历史净值_${fundCode}_${dayjs().format('YYYYMMDD')}.csv`);
    link.click();
  };

  // 时间范围选项
  const timeRanges = [
    { value: '1m', label: '近1月' },
    { value: '3m', label: '近3月' },
    { value: '6m', label: '近6月' },
    { value: '1y', label: '近1年' },
    { value: '3y', label: '近3年' },
    { value: 'all', label: '全部' },
  ];

  return (
    <>
      {/* 历史净值标题栏 */}
      <div
        style={{ 
          marginBottom: 8, 
          cursor: 'pointer', 
          userSelect: 'none',
          paddingTop: 12,
          borderTop: theme === 'light' ? '1px solid #eee' : '1px solid #333'
        }}
        className="title"
        onClick={() => onToggleHistoryCollapse?.(fundCode)}
      >
        <div className="row" style={{ width: '100%', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>历史净值</span>
            <ChevronIcon
              width="16"
              height="16"
              className="muted"
              style={{
                transform: historyCollapsed
                  ? 'rotate(-90deg)'
                  : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            />
          </div>
          <span className="muted">单位净值 / 累计净值 / 日涨跌幅</span>
        </div>
      </div>

      <AnimatePresence>
        {!historyCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            {/* 工具栏 */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: 12,
              padding: '8px 0'
            }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {/* 时间范围选择 */}
                <select
                  value={timeRange}
                  onChange={(e) => {
                    setTimeRange(e.target.value);
                    setCurrentPage(1);
                    setHistoryData([]);
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 4,
                    border: `1px solid ${theme === 'light' ? '#ddd' : '#444'}`,
                    background: theme === 'light' ? '#fff' : '#333',
                    color: theme === 'light' ? '#333' : '#fff',
                    fontSize: '12px'
                  }}
                >
                  {timeRanges.map(range => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>

                {/* 视图切换 */}
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    className={`icon-button ${historyViewMode === 'table' ? 'active' : ''}`}
                    onClick={() => setHistoryViewMode('table')}
                    style={{
                      padding: '4px 8px',
                      fontSize: '12px',
                      background: historyViewMode === 'table' 
                        ? (theme === 'light' ? '#e8f4ff' : '#1e3a5f')
                        : 'transparent',
                      border: `1px solid ${theme === 'light' ? '#ddd' : '#444'}`
                    }}
                  >
                    <TableIcon width="12" height="12" style={{ marginRight: 4 }} />
                    表格
                  </button>
                  <button
                    className={`icon-button ${historyViewMode === 'card' ? 'active' : ''}`}
                    onClick={() => setHistoryViewMode('card')}
                    style={{
                      padding: '4px 8px',
                      fontSize: '12px',
                      background: historyViewMode === 'card' 
                        ? (theme === 'light' ? '#e8f4ff' : '#1e3a5f')
                        : 'transparent',
                      border: `1px solid ${theme === 'light' ? '#ddd' : '#444'}`
                    }}
                  >
                    <CardIcon width="12" height="12" style={{ marginRight: 4 }} />
                    卡片
                  </button>
                </div>
              </div>

              {/* 导出按钮 */}
              <button
                onClick={handleExport}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  background: 'transparent',
                  border: `1px solid ${theme === 'light' ? '#ddd' : '#444'}`,
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <DownloadIcon width="12" height="12" />
                导出
              </button>
            </div>

            {/* 加载状态 */}
            {loading ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '20px',
                color: theme === 'light' ? '#666' : '#999'
              }}>
                加载历史数据中...
              </div>
            ) : historyData.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '20px',
                color: theme === 'light' ? '#666' : '#999'
              }}>
                暂无历史净值数据
              </div>
            ) : (
              <>
                {/* 表格视图 */}
                {historyViewMode === 'table' && (
                  <div style={{ 
                    overflowX: 'auto',
                    marginBottom: 12
                  }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '12px'
                    }}>
                      <thead>
                        <tr style={{
                          background: theme === 'light' ? '#f5f5f5' : '#222',
                          borderBottom: `1px solid ${theme === 'light' ? '#eee' : '#333'}`
                        }}>
                          <th style={{ 
                            padding: '8px 12px', 
                            textAlign: 'left', 
                            fontWeight: 500,
                            whiteSpace: 'nowrap'
                          }}>日期</th>
                          <th style={{ 
                            padding: '8px 12px', 
                            textAlign: 'left', 
                            fontWeight: 500,
                            whiteSpace: 'nowrap'
                          }}>单位净值</th>
                          <th style={{ 
                            padding: '8px 12px', 
                            textAlign: 'left', 
                            fontWeight: 500,
                            whiteSpace: 'nowrap'
                          }}>累计净值</th>
                          <th style={{ 
                            padding: '8px 12px', 
                            textAlign: 'left', 
                            fontWeight: 500,
                            whiteSpace: 'nowrap'
                          }}>日涨跌幅</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedData.map((item, index) => (
                          <tr 
                            key={index}
                            style={{
                              borderBottom: `1px solid ${theme === 'light' ? '#f0f0f0' : '#2a2a2a'}`,
                              ':hover': {
                                background: theme === 'light' ? '#fafafa' : '#2a2a2a'
                              }
                            }}
                          >
                            <td style={{ 
                              padding: '8px 12px',
                              whiteSpace: 'nowrap'
                            }}>
                              {item.date}
                            </td>
                            <td style={{ 
                              padding: '8px 12px',
                              fontWeight: 500
                            }}>
                              {item.value.toFixed(4)}
                            </td>
                            <td style={{ 
                              padding: '8px 12px',
                              color: theme === 'light' ? '#666' : '#999'
                            }}>
                              {item.accumulatedValue?.toFixed(4) || '-'}
                            </td>
                            <td style={{ 
                              padding: '8px 12px',
                              color: item.dailyChange > 0 ? '#f56c6c' : 
                                     item.dailyChange < 0 ? '#67c23a' : 
                                     theme === 'light' ? '#666' : '#999',
                              fontWeight: item.dailyChange ? 500 : 400
                            }}>
                              {item.dailyChange ? (
                                <>
                                  {item.dailyChange > 0 ? '+' : ''}
                                  {item.dailyChange.toFixed(2)}%
                                </>
                              ) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 卡片视图 */}
                {historyViewMode === 'card' && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: 8,
                    marginBottom: 12
                  }}>
                    {paginatedData.map((item, index) => (
                      <div
                        key={index}
                        style={{
                          padding: 12,
                          border: `1px solid ${theme === 'light' ? '#eee' : '#333'}`,
                          borderRadius: 6,
                          background: theme === 'light' ? '#fafafa' : '#1a1a1a'
                        }}
                      >
                        <div style={{ 
                          fontSize: '12px', 
                          color: theme === 'light' ? '#666' : '#999',
                          marginBottom: 8
                        }}>
                          {item.date}
                        </div>
                        <div style={{ marginBottom: 4 }}>
                          <div style={{ 
                            fontSize: '10px', 
                            color: theme === 'light' ? '#666' : '#999' 
                          }}>
                            单位净值
                          </div>
                          <div style={{ 
                            fontSize: '14px', 
                            fontWeight: 500 
                          }}>
                            {item.value.toFixed(4)}
                          </div>
                        </div>
                        <div style={{ marginBottom: 4 }}>
                          <div style={{ 
                            fontSize: '10px', 
                            color: theme === 'light' ? '#666' : '#999' 
                          }}>
                            累计净值
                          </div>
                          <div style={{ 
                            fontSize: '14px', 
                            fontWeight: 500 
                          }}>
                            {item.accumulatedValue?.toFixed(4) || '-'}
                          </div>
                        </div>
                        <div>
                          <div style={{ 
                            fontSize: '10px', 
                            color: theme === 'light' ? '#666' : '#999' 
                          }}>
                            日涨跌幅
                          </div>
                          <div style={{ 
                            fontSize: '14px',
                            color: item.dailyChange > 0 ? '#f56c6c' : 
                                   item.dailyChange < 0 ? '#67c23a' : 
                                   theme === 'light' ? '#666' : '#999',
                            fontWeight: 500
                          }}>
                            {item.dailyChange ? (
                              <>
                                {item.dailyChange > 0 ? '+' : ''}
                                {item.dailyChange.toFixed(2)}%
                              </>
                            ) : '-'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 分页器 */}
                {historyData.length > pageSize && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 0',
                    borderTop: `1px solid ${theme === 'light' ? '#eee' : '#333'}`
                  }}>
                    <div style={{ 
                      fontSize: '12px',
                      color: theme === 'light' ? '#666' : '#999'
                    }}>
                      共 {historyData.length} 条记录
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {/* 每页条数选择 */}
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          border: `1px solid ${theme === 'light' ? '#ddd' : '#444'}`,
                          background: theme === 'light' ? '#fff' : '#333',
                          color: theme === 'light' ? '#333' : '#fff',
                          borderRadius: 4
                        }}
                      >
                        <option value={10}>10条/页</option>
                        <option value={20}>20条/页</option>
                        <option value={50}>50条/页</option>
                        <option value={100}>100条/页</option>
                      </select>

                      {/* 页码导航 */}
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            border: `1px solid ${theme === 'light' ? '#ddd' : '#444'}`,
                            background: 'transparent',
                            borderRadius: 4,
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            opacity: currentPage === 1 ? 0.5 : 1
                          }}
                        >
                          上一页
                        </button>
                        <div style={{ 
                          padding: '4px 12px',
                          fontSize: '12px',
                          color: theme === 'light' ? '#333' : '#fff'
                        }}>
                          第 {currentPage} 页
                        </div>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            border: `1px solid ${theme === 'light' ? '#ddd' : '#444'}`,
                            background: 'transparent',
                            borderRadius: 4,
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                            opacity: currentPage === totalPages ? 0.5 : 1
                          }}
                        >
                          下一页
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// 主组件
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
  collapsedHistories,
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
  onToggleHistoryCollapse,
  layoutMode = 'card',
  masked = false,
  fetchFundHistory, // 新增：获取历史净值的函数
}) {
  const holding = holdings[f?.code];
  const profit = getHoldingProfit?.(f, holding) ?? null;
  const hasHoldings = f.holdingsIsLastQuarter && Array.isArray(f.holdings) && f.holdings.length > 0;

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
      {/* 原有头部信息... */}
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

      {layoutMode === 'drawer' ? (
        <Tabs defaultValue={hasHoldings ? 'holdings' : 'trend'} className="w-full">
          <TabsList className={`w-full ${hasHoldings ? 'grid grid-cols-3' : 'grid grid-cols-2'}`}>
            {hasHoldings && (
              <TabsTrigger value="holdings">前10重仓股票</TabsTrigger>
            )}
            <TabsTrigger value="trend">业绩走势</TabsTrigger>
            <TabsTrigger value="history">历史净值</TabsTrigger>
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
          <TabsContent value="history" className="mt-3 outline-none">
            <HistoryNetValue
              fundCode={f.code}
              theme={theme}
              historyCollapsed={false}
              fetchFundHistory={fetchFundHistory}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <>
          {/* 原有持仓股票和业绩走势... */}
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

          {/* 添加历史净值组件 */}
          <HistoryNetValue
            fundCode={f.code}
            theme={theme}
            historyCollapsed={collapsedHistories?.has(f.code)}
            onToggleHistoryCollapse={onToggleHistoryCollapse}
            fetchFundHistory={fetchFundHistory}
          />
        </>
      )}
    </motion.div>
  );
}
