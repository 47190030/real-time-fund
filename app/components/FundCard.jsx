'use client';

import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import { isNumber, isString } from 'lodash';
import React, { useState, useMemo } from 'react';
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
  collapsedHistory, // 新增：控制历史净值折叠状态
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
  onToggleHistoryCollapse, // 新增：切换历史净值折叠
  layoutMode = 'card',
  masked = false,
}) {
  const holding = holdings[f?.code];
  const profit = getHoldingProfit?.(f, holding) ?? null;
  const hasHoldings = f.holdingsIsLastQuarter && Array.isArray(f.holdings) && f.holdings.length > 0;

  // 历史净值相关状态
  const [historyPage, setHistoryPage] = useState(1);
  const PAGE_SIZE = 10;

  // 处理历史净值数据 - 完全复用走势图数据
  const processedHistoryData = useMemo(() => {
    if (!f?.Data_netWorthTrend || !Array.isArray(f.Data_netWorthTrend)) {
      return [];
    }
    
    const netTrend = f.Data_netWorthTrend;
    const acTrend = f.Data_ACWorthTrend || [];
    
    // 格式化数据并计算日涨跌幅
    const formattedData = netTrend.map((item, index) => {
      if (!item || !item.x || item.y === undefined) return null;
      
      const date = new Date(item.x);
      const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      
      // 计算日涨跌幅（与前一天比较）
      let dailyChange = null;
      if (index < netTrend.length - 1) {
        const prevItem = netTrend[index + 1];
        if (prevItem && prevItem.y !== undefined && prevItem.y !== 0) {
          const change = ((item.y - prevItem.y) / prevItem.y) * 100;
          dailyChange = change;
        }
      }
      
      // 查找对应累计净值
      const acItem = acTrend.find(ac => ac && ac.x === item.x);
      const accumulatedValue = acItem ? acItem.y : item.y;
      
      return {
        date: dateStr,
        unitNet: typeof item.y === 'number' ? item.y.toFixed(4) : '--',
        accumulatedNet: typeof accumulatedValue === 'number' ? accumulatedValue.toFixed(4) : '--',
        dailyChange: dailyChange !== null ? `${dailyChange > 0 ? '+' : ''}${dailyChange.toFixed(2)}%` : '--',
        rawChange: dailyChange
      };
    }).filter(Boolean);
    
    // 按日期倒序排列（最新在前）
    return formattedData.reverse();
  }, [f?.Data_netWorthTrend, f?.Data_ACWorthTrend]);

  // 分页数据
  const paginatedHistoryData = processedHistoryData.slice(0, historyPage * PAGE_SIZE);
  const hasMoreHistory = processedHistoryData.length > historyPage * PAGE_SIZE;
  
  const handleLoadMoreHistory = () => {
    if (hasMoreHistory) {
      setHistoryPage(prev => prev + 1);
    }
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
      {/* 原有的头部信息部分保持不变 */}
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

      {/* 原有的净值信息部分保持不变 */}
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

      {/* 原有的持仓信息部分保持不变 */}
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
            {/* 新增：历史净值 Tab */}
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
          {/* 新增：历史净值 TabsContent */}
          <TabsContent value="history" className="mt-3 outline-none">
            <div className="history-net-worth-section">
              <div className="history-table-container">
                <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-600">
                      <th className="text-left py-3 pl-0 font-medium" style={{ width: '30%' }}>日期</th>
                      <th className="text-right py-3 font-medium" style={{ width: '23%' }}>单位净值</th>
                      <th className="text-right py-3 font-medium" style={{ width: '23%' }}>累计净值</th>
                      <th className="text-right py-3 pr-0 font-medium" style={{ width: '24%' }}>日涨跌幅</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedHistoryData.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 last:border-b-0">
                        <td className="py-3 pl-0 text-gray-800" style={{ fontSize: '13px' }}>{item.date}</td>
                        <td className="py-3 text-right text-gray-800 font-medium" style={{ fontSize: '13px' }}>{item.unitNet}</td>
                        <td className="py-3 text-right text-gray-800 font-medium" style={{ fontSize: '13px' }}>{item.accumulatedNet}</td>
                        <td 
                          className={`py-3 text-right pr-0 font-medium ${item.dailyChange.startsWith('+') ? 'text-red-500' : item.dailyChange.startsWith('-') ? 'text-green-500' : 'text-gray-600'}`} 
                          style={{ fontSize: '13px' }}
                        >
                          {item.dailyChange}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {hasMoreHistory && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={handleLoadMoreHistory}
                      className="text-sm text-blue-500 hover:text-blue-700 font-medium py-1.5 px-6 rounded-full border border-gray-300 hover:border-gray-400 bg-white transition-colors hover:bg-gray-50"
                    >
                      加载更多
                    </button>
                  </div>
                )}
              </div>
            </div>
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
          
          {/* 新增：历史净值 - 卡片模式 */}
          <div className="mt-6">
            <div
              style={{ marginBottom: 8, cursor: 'pointer', userSelect: 'none' }}
              className="title"
              onClick={() => onToggleHistoryCollapse?.(f.code)}
            >
              <div className="row" style={{ width: '100%', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>历史净值</span>
                  <ChevronIcon
                    width="16"
                    height="16"
                    className="muted"
                    style={{
                      transform: collapsedHistory?.has(f.code)
                        ? 'rotate(-90deg)'
                        : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </div>
              </div>
            </div>
            <AnimatePresence>
              {!collapsedHistory?.has(f.code) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="history-table-container">
                    <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-600">
                          <th className="text-left py-2 pl-0 font-medium" style={{ width: '30%' }}>日期</th>
                          <th className="text-right py-2 font-medium" style={{ width: '23%' }}>单位净值</th>
                          <th className="text-right py-2 font-medium" style={{ width: '23%' }}>累计净值</th>
                          <th className="text-right py-2 pr-0 font-medium" style={{ width: '24%' }}>日涨跌幅</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedHistoryData.map((item, idx) => (
                          <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 last:border-b-0">
                            <td className="py-2 pl-0 text-gray-800" style={{ fontSize: '12px' }}>{item.date}</td>
                            <td className="py-2 text-right text-gray-800 font-medium" style={{ fontSize: '12px' }}>{item.unitNet}</td>
                            <td className="py-2 text-right text-gray-800 font-medium" style={{ fontSize: '12px' }}>{item.accumulatedNet}</td>
                            <td 
                              className={`py-2 text-right pr-0 font-medium ${item.dailyChange.startsWith('+') ? 'text-red-500' : item.dailyChange.startsWith('-') ? 'text-green-500' : 'text-gray-600'}`} 
                              style={{ fontSize: '12px' }}
                            >
                              {item.dailyChange}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {hasMoreHistory && (
                      <div className="mt-3 text-center">
                        <button
                          onClick={handleLoadMoreHistory}
                          className="text-xs text-gray-600 hover:text-gray-800 py-1.5 px-4 rounded-full border border-gray-300 hover:border-gray-400 bg-white transition-colors hover:bg-gray-50"
                        >
                          加载更多
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
      
      {/* 底部功能按钮 - 与图片效果一致 */}
      <div className="action-buttons" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '8px',
        padding: '16px',
        borderTop: '1px solid #f0f0f0',
        marginTop: '16px'
      }}>
        <button className="action-btn modify-holdings" style={{
          height: '40px',
          background: '#1890ff',
          color: 'white',
          border: 'none',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'all 0.3s'
        }}>
          修改持仓
        </button>
        <button className="action-btn add-to-favorites" style={{
          height: '40px',
          background: '#fff',
          color: '#1890ff',
          border: '1px solid #1890ff',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'all 0.3s'
        }}>
          添加自选
        </button>
        <button className="action-btn delete-holdings" style={{
          height: '40px',
          background: '#ff4d4f',
          color: 'white',
          border: 'none',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'all 0.3s'
        }}>
          删除持有
        </button>
        <button className="action-btn notes" style={{
          height: '40px',
          background: '#f0f0f0',
          color: '#666',
          border: 'none',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'all 0.3s'
        }}>
          笔记
        </button>
      </div>
    </motion.div>
  );
}
