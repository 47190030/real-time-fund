'use client';

import { motion, AnimatePresence, useState, useMemo } from 'framer-motion';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import { isNumber, isString } from 'lodash';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Stat } from './Common';
import FundTrendChart from './FundTrendChart';
import FundIntradayChart from './FundIntradayChart';
import FundHistoryTable from './FundHistoryTable'; // 新增导入
import {
  ChevronIcon,
  ExitIcon,
  SettingsIcon,
  StarIcon,
  SwitchIcon,
  TrashIcon,
  CalendarIcon,
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
          <CalendarIcon width="16" height="16" />
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
      {/* ... 之前的代码保持不变，直到业绩走势图部分 ... */}

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
