'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';

/**
 * 虚拟滚动表格组件
 * @param {Array} data 所有已加载的数据
 * @param {boolean} hasMore 是否还有更多数据可加载
 * @param {boolean} isLoading 是否正在加载
 * @param {function} onLoadMore 加载更多数据的回调
 * @param {number} rowHeight 每行预估高度（像素）
 * @param {number} visibleRowCount 可视区域内预计显示的行数
 */
const VirtualizedHistoryTable = ({
  data,
  hasMore,
  isLoading,
  onLoadMore,
  rowHeight = 53, // 根据您实际表格行高度调整
  visibleRowCount = 10,
  theme = 'light'
}) => {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // 计算可见区域的行
  const { visibleData, startIndex, endIndex, totalHeight } = useMemo(() => {
    if (!data.length) {
      return { visibleData: [], startIndex: 0, endIndex: 0, totalHeight: 0 };
    }

    // 计算起止索引
    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 5); // 提前5行开始渲染
    const endIndex = Math.min(
      data.length - 1,
      startIndex + visibleRowCount + 10 // 多渲染10行作为缓冲
    );

    // 获取可见数据
    const visibleData = data.slice(startIndex, endIndex + 1);

    // 计算总高度（用于撑开容器）
    const totalHeight = data.length * rowHeight;

    return { visibleData, startIndex, endIndex, totalHeight };
  }, [data, scrollTop, rowHeight, visibleRowCount]);

  // 处理滚动事件
  const handleScroll = useCallback((e) => {
    if (!containerRef.current) return;
    setScrollTop(containerRef.current.scrollTop);

    // 检查是否滚动到底部，触发加载更多
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

    if (isAtBottom && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [hasMore, isLoading, onLoadMore]);

  // 设置容器高度
  useEffect(() => {
    if (containerRef.current) {
      const height = containerRef.current.clientHeight;
      setContainerHeight(height);
    }
  }, []);

  // 渲染表格行
  const renderRow = (item, index) => {
    const actualIndex = startIndex + index;
    const top = actualIndex * rowHeight;
    
    // 您原有的行渲染逻辑，例如：
    const colorClass = item.change > 0 ? 'up' : item.change < 0 ? 'down' : '';
    
    return (
      <tr
        key={`${item.date}-${actualIndex}`}
        style={{
          position: 'absolute',
          top: `${top}px`,
          left: 0,
          right: 0,
          height: `${rowHeight}px`,
          display: 'flex',
          alignItems: 'center',
          boxSizing: 'border-box',
          backgroundColor: theme === 'dark' ? 
            (actualIndex % 2 ? 'var(--background)' : 'var(--muted)') : 
            (actualIndex % 2 ? '#f9f9f9' : '#ffffff')
        }}
        className="border-b border-border"
      >
        <td className="p-3 whitespace-nowrap font-medium text-base flex-1 min-w-[120px]">
          {item.date}
        </td>
        <td className="p-3 whitespace-nowrap font-medium text-base flex-1 min-w-[120px]">
          {item.value.toFixed(4)}
        </td>
        <td className={`p-3 whitespace-nowrap font-medium text-base flex-1 min-w-[120px] ${colorClass}`}>
          {item.changeFormatted}
        </td>
      </tr>
    );
  };

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        height: '400px', // 固定高度，根据您的设计调整
        overflowY: 'auto',
        position: 'relative',
        border: '1px solid var(--border)',
        borderRadius: '8px',
      }}
    >
      {/* 撑开容器，制造滚动条 */}
      <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
        {/* 渲染可见行 */}
        {visibleData.map((item, index) => renderRow(item, index))}
      </div>

      {/* 底部加载状态 */}
      {isLoading && (
        <div 
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            textAlign: 'center',
            padding: '12px',
            backgroundColor: 'var(--background)'
          }}
        >
          正在加载更多历史净值...
        </div>
      )}
    </div>
  );
};

export default VirtualizedHistoryTable;
