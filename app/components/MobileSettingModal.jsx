'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, Reorder } from 'framer-motion';
import { createPortal } from 'react-dom';
import ConfirmModal from './ConfirmModal';
import { CloseIcon, DragIcon, ResetIcon, SettingsIcon } from './Icons';

/**
 * 移动端表格个性化设置弹框（底部抽屉）
 * @param {Object} props
 * @param {boolean} props.open - 是否打开
 * @param {() => void} props.onClose - 关闭回调
 * @param {Array<{id: string, header: string}>} props.columns - 非冻结列（id + 表头名称）
 * @param {Record<string, boolean>} [props.columnVisibility] - 列显示状态映射（id => 是否显示）
 * @param {(newOrder: string[]) => void} props.onColumnReorder - 列顺序变更回调
 * @param {(id: string, visible: boolean) => void} props.onToggleColumnVisibility - 列显示/隐藏切换回调
 * @param {() => void} props.onResetColumnOrder - 重置列顺序回调
 * @param {() => void} props.onResetColumnVisibility - 重置列显示/隐藏回调
 * @param {boolean} [props.showFullFundName] - 是否展示完整基金名称
 * @param {(show: boolean) => void} [props.onToggleShowFullFundName] - 切换是否展示完整基金名称回调
 */
export default function MobileSettingModal({
  open,
  onClose,
  columns = [],
  columnVisibility,
  onColumnReorder,
  onToggleColumnVisibility,
  onResetColumnOrder,
  onResetColumnVisibility,
  showFullFundName,
  onToggleShowFullFundName,
}) {
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) setResetConfirmOpen(false);
  }, [open]);

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  const handleReorder = (newItems) => {
    const newOrder = newItems.map((item) => item.id);
    onColumnReorder?.(newOrder);
  };

  const content = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="mobile-setting-overlay"
          className="mobile-setting-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="个性化设置"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{ zIndex: 10001 }}
        >
          <motion.div
            className="mobile-setting-drawer glass"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-setting-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <SettingsIcon width="20" height="20" />
                <span>个性化设置</span>
              </div>
              <button
                className="icon-button"
                onClick={onClose}
                title="关闭"
                style={{ border: 'none', background: 'transparent' }}
              >
                <CloseIcon width="20" height="20" />
              </button>
            </div>

            <div className="mobile-setting-body">
              {onToggleShowFullFundName && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 0',
                    borderBottom: '1px solid var(--border)',
                    marginBottom: 16,
                  }}
                >
                  <span style={{ fontSize: '14px' }}>展示完整基金名称</span>
                  <button
                    type="button"
                    className="icon-button pc-table-column-switch"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleShowFullFundName(!showFullFundName);
                    }}
                    title={showFullFundName ? '关闭' : '开启'}
                    style={{
                      border: 'none',
                      padding: '0 4px',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <span className={`dca-toggle-track ${showFullFundName ? 'enabled' : ''}`}>
                      <span
                        className="dca-toggle-thumb"
                        style={{ left: showFullFundName ? 16 : 2 }}
                      />
                    </span>
                  </button>
                </div>
              )}
              <h3 className="mobile-setting-subtitle">表头设置</h3>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                  gap: 8,
                }}
              >
                <p className="muted" style={{ fontSize: '13px', margin: 0 }}>
                  拖拽调整列顺序
                </p>
                {(onResetColumnOrder || onResetColumnVisibility) && (
                  <button
                    className="icon-button"
                    onClick={() => setResetConfirmOpen(true)}
                    title="重置表头设置"
                    style={{
                      border: 'none',
                      width: '28px',
                      height: '28px',
                      backgroundColor: 'transparent',
                      color: 'var(--muted)',
                      flexShrink: 0,
                    }}
                  >
                    <ResetIcon width="16" height="16" />
                  </button>
                )}
              </div>
              {columns.length === 0 ? (
                <div className="muted" style={{ textAlign: 'center', padding: '24px 0', fontSize: '14px' }}>
                  暂无可配置列
                </div>
              ) : (
                <Reorder.Group
                  axis="y"
                  values={columns}
                  onReorder={handleReorder}
                  className="mobile-setting-list"
                >
                  <AnimatePresence mode="popLayout">
                    {columns.map((item, index) => (
                      <Reorder.Item
                        key={item.id || `col-${index}`}
                        value={item}
                        className="mobile-setting-item glass"
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{
                          type: 'spring',
                          stiffness: 500,
                          damping: 35,
                          mass: 1,
                          layout: { duration: 0.2 },
                        }}
                      >
                        <div
                          className="drag-handle"
                          style={{
                            cursor: 'grab',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 8px',
                            color: 'var(--muted)',
                          }}
                        >
                          <DragIcon width="18" height="18" />
                        </div>
                        <span style={{ flex: 1, fontSize: '14px' }}>{item.header}</span>
                        {onToggleColumnVisibility && (
                          <button
                            type="button"
                            className="icon-button pc-table-column-switch"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleColumnVisibility(item.id, columnVisibility?.[item.id] === false);
                            }}
                            title={columnVisibility?.[item.id] === false ? '显示' : '隐藏'}
                            style={{
                              border: 'none',
                              padding: '0 4px',
                              backgroundColor: 'transparent',
                              cursor: 'pointer',
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <span className={`dca-toggle-track ${columnVisibility?.[item.id] !== false ? 'enabled' : ''}`}>
                              <span
                                className="dca-toggle-thumb"
                                style={{ left: columnVisibility?.[item.id] !== false ? 16 : 2 }}
                              />
                            </span>
                          </button>
                        )}
                      </Reorder.Item>
                    ))}
                  </AnimatePresence>
                </Reorder.Group>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
      {resetConfirmOpen && (
        <ConfirmModal
          key="mobile-reset-confirm"
          title="重置表头设置"
          message="是否重置表头顺序和显示/隐藏为默认值？"
          onConfirm={() => {
            onResetColumnOrder?.();
            onResetColumnVisibility?.();
            setResetConfirmOpen(false);
          }}
          onCancel={() => setResetConfirmOpen(false)}
          confirmText="重置"
        />
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
