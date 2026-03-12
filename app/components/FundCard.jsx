'use client';

import { useState, useMemo } from 'react'; // 从 react 导入
import { motion, AnimatePresence } from 'framer-motion'; // 从 framer-motion 导入
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

// 历史净值表格组件
function HistoryNavTable({ fund, theme, isExpanded, onToggleExpand }) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // 每页显示5条
  
  // 模拟历史净值数据
  const historyData = useMemo(() => [
    { date: '2026-03-11', nav: 3.6103, cumulativeNav: 3.6103, dailyChange: +0.48 },
    { date: '2026-03-10', nav: 3.5931, cumulativeNav: 3.5931, dailyChange: +0.39 },
    { date: '2026-03-09', nav: 3.5792, cumulativeNav: 3.5792, dailyChange: +0.06 },
    { date: '2026-03-08', nav: 3.5770, cumulativeNav: 3.5770, dailyChange: -0.06 },
    { date: '2026-03-07', nav: 3.5791, cumulativeNav: 3.5791, dailyChange: -0.01 },
    { date: '2026-03-06', nav: 3.5769, cumulativeNav: 3.5769, dailyChange: -0.86 },
    { date: '2026-03-05', nav: 3.6081, cumulativeNav: 3.6081, dailyChange: -0.30 },
    { date: '2026-03-04', nav: 3.6189, cumulativeNav: 3.6189, dailyChange: +0.12 },
    { date: '2026-03-03', nav: 3.6145, cumulativeNav: 3.6145, dailyChange: -0.03 },
    { date: '2026-02-28', nav: 3.6156, cumulativeNav: 3.6156, dailyChange: -0.05 },
  ], []);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = historyData.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(historyData.length / itemsPerPage);

  return (
    <div className="history-table-wrapper">
      <div
        style={{ 
          marginBottom: 8, 
          cursor: 'pointer', 
          userSelect: 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
        onClick={onToggleExpand}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>历史净值</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            {historyData.length} 条记录
          </span>
          <ChevronIcon
            width="16"
            height="16"
            className="muted"
            style={{
              transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform 0.2s ease',
            }}
          />
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            {/* 表格 */}
            <div style={{ 
              border: `1px solid ${theme === 'light' ? '#e5e7eb' : '#374151'}`,
              borderRadius: 6,
              overflow: 'hidden',
              marginBottom: 12,
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 12,
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: theme === 'light' ? '#f9fafb' : '#1f2937',
                    borderBottom: `1px solid ${theme === 'light' ? '#e5e7eb' : '#374151'}`,
                  }}>
                    <th style={{
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: 11,
                      color: theme === 'light' ? '#6b7280' : '#9ca3af',
                      whiteSpace: 'nowrap',
                    }}>
                      日期
                    </th>
                    <th style={{
                      padding: '8px 12px',
                      textAlign: 'right',
                      fontWeight: 600,
                      fontSize: 11,
                      color: theme === 'light' ? '#6b7280' : '#9ca3af',
                      whiteSpace: 'nowrap',
                    }}>
                      单位净值
                    </th>
                    <th style={{
                      padding: '8px 12px',
                      textAlign: 'right',
                      fontWeight: 600,
                      fontSize: 11,
                      color: theme === 'light' ? '#6b7280' : '#9ca3af',
                      whiteSpace: 'nowrap',
                    }}>
                      累计净值
                    </th>
                    <th style={{
                      padding: '8px 12px',
                      textAlign: 'right',
                      fontWeight: 600,
                      fontSize: 11,
                      color: theme === 'light' ? '#6b7280' : '#9ca3af',
                      whiteSpace: 'nowrap',
                    }}>
                      日涨跌幅
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((item, index) => (
                    <tr key={index} style={{
                      borderBottom: index < paginatedData.length - 1 
                        ? `1px solid ${theme === 'light' ? '#f3f4f6' : '#1f2937'}`
                        : 'none',
                      backgroundColor: index % 2 === 0 
                        ? (theme === 'light' ? '#ffffff' : '#111827')
                        : (theme === 'light' ? '#f9fafb' : '#1a202c'),
                    }}>
                      <td style={{
                        padding: '8px 12px',
                        fontSize: 12,
                        color: theme === 'light' ? '#374151' : '#d1d5db',
                        whiteSpace: 'nowrap',
                      }}>
                        {item.date.replace('2026-', '')}
                      </td>
                      <td style={{
                        padding: '8px 12px',
                        textAlign: 'right',
                        fontSize: 12,
                        color: theme === 'light' ? '#374151' : '#d1d5db',
                      }}>
                        {item.nav.toFixed(4)}
                      </td>
                      <td style={{
                        padding: '8px 12px',
                        textAlign: 'right',
                        fontSize: 12,
                        color: theme === 'light' ? '#374151' : '#d1d5db',
                      }}>
                        {item.cumulativeNav.toFixed(4)}
                      </td>
                      <td style={{
                        padding: '8px 12px',
                        textAlign: 'right',
                        fontSize: 12,
                        fontWeight: 500,
                        color: item.dailyChange > 0 
                          ? (theme === 'light' ? '#059669' : '#34d399')
                          : item.dailyChange < 0 
                            ? (theme === 'light' ? '#dc2626' : '#f87171')
                            : (theme === 'light' ? '#6b7280' : '#9ca3af'),
                      }}>
                        {item.dailyChange > 0 ? '+' : ''}{item.dailyChange.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 8,
                marginTop: 8,
              }}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '4px 8px',
                    fontSize: 12,
                    backgroundColor: theme === 'light' ? '#f3f4f6' : '#374151',
                    border: `1px solid ${theme === 'light' ? '#d1d5db' : '#4b5563'}`,
                    borderRadius: 4,
                    color: theme === 'light' ? '#374151' : '#d1d5db',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.5 : 1,
                  }}
                >
                  上一页
                </button>
                
                <span style={{
                  fontSize: 12,
                  color: theme === 'light' ? '#6b7280' : '#9ca3af',
                }}>
                  {currentPage}/{totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '4px 8px',
                    fontSize: 12,
                    backgroundColor: theme === 'light' ? '#f3f4f6' : '#374151',
                    border: `1px solid ${theme === 'light' ? '#d1d5db' : '#4b5563'}`,
                    borderRadius: 4,
                    color: theme === 'light' ? '#374151' : '#d1d5db',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === totalPages ? 0.5 : 1,
                  }}
                >
                  下一页
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
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
  collapsedHistory, // 新增：历史净值展开状态
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
  onToggleHistoryCollapse, // 新增：切换历史净值展开状态
  layoutMode = 'card',
  masked = false,
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
          <TabsList className={`w-full ${hasHoldings ? 'grid grid-cols-2' : ''}`}>
            {hasHoldings && (
              <TabsTrigger value="holdings">前10重仓股票</TabsTrigger>
            )}
            <TabsTrigger value="trend">业绩走势</TabsTrigger>
            {/* 在抽屉模式下添加历史净值Tab */}
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
          {/* 抽屉模式下的历史净值Tab内容 */}
          <TabsContent value="history" className="mt-3 outline-none">
            <HistoryNavTable 
              fund={f} 
              theme={theme} 
              isExpanded={true}
              onToggleExpand={() => {}}
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
          
          {/* 在业绩走势图下方添加历史净值表格 */}
          <HistoryNavTable 
            fund={f} 
            theme={theme} 
            isExpanded={!collapsedHistory?.has(f.code)}
            onToggleExpand={() => onToggleHistoryCollapse?.(f.code)}
          />
        </>
      )}
    </motion.div>
  );
}
