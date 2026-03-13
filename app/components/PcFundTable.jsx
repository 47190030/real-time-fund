'use client';

import ReactDOM from 'react-dom';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { throttle } from 'lodash';
import { AnimatePresence, motion } from 'framer-motion';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ConfirmModal from './ConfirmModal';
import FitText from './FitText';
import PcTableSettingModal from './PcTableSettingModal';
import FundCard from './FundCard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CloseIcon, DragIcon, ExitIcon, SettingsIcon, StarIcon, TrashIcon, ResetIcon } from './Icons';

const NON_FROZEN_COLUMN_IDS = [
  'yesterdayChangePercent',
  'estimateChangePercent',
  'totalChangePercent',
  'holdingAmount',
  'todayProfit',
  'holdingProfit',
  'latestNav',
  'estimateNav',
];
const COLUMN_HEADERS = {
  latestNav: '最新净值',
  estimateNav: '估算净值',
  yesterdayChangePercent: '昨日涨幅',
  estimateChangePercent: '估值涨幅',
  totalChangePercent: '估算收益',
  holdingAmount: '持仓金额',
  todayProfit: '当日收益',
  holdingProfit: '持有收益',
};

const SortableRowContext = createContext({
  setActivatorNodeRef: null,
  listeners: null,
});

function SortableRow({ row, children, isTableDragging, disabled }) {
  const {
    attributes,
    listeners,
    transform,
    transition,
    setNodeRef,
    setActivatorNodeRef,
    isDragging,
  } = useSortable({ id: row.original.code, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging ? { position: 'relative', zIndex: 9999, opacity: 0.8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' } : {}),
  };

  const contextValue = useMemo(
    () => ({ setActivatorNodeRef, listeners }),
    [setActivatorNodeRef, listeners]
  );

  return (
    <SortableRowContext.Provider value={contextValue}>
      <motion.div
        ref={setNodeRef}
        className="table-row-wrapper"
        layout={isTableDragging ? undefined : "position"}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{ ...style, position: 'relative' }}
        {...attributes}
      >
        {children}
      </motion.div>
    </SortableRowContext.Provider>
  );
}

/**
 * PC 端基金列表表格组件（基于 @tanstack/react-table）
 *
 * @param {Object} props
 * @param {Array<Object>} props.data - 表格数据
 *   每一行推荐结构（字段命名与 page.jsx 中的数据一致）：
 *   {
 *     fundName: string;             // 基金名称
 *     code?: string;                // 基金代码（可选，只用于展示在名称下方）
 *     latestNav: string|number;     // 最新净值
 *     estimateNav: string|number;   // 估算净值
 *     yesterdayChangePercent: string|number; // 昨日涨幅
 *     estimateChangePercent: string|number;  // 估值涨幅
 *     holdingAmount: string|number;         // 持仓金额
 *     todayProfit: string|number;           // 当日收益
 *     holdingProfit: string|number;         // 持有收益
 *   }
 * @param {(row: any) => void} [props.onRemoveFund] - 删除基金的回调
 * @param {string} [props.currentTab] - 当前分组
 * @param {Set<string>} [props.favorites] - 自选集合
 * @param {(row: any) => void} [props.onToggleFavorite] - 添加/取消自选
 * @param {(row: any) => void} [props.onRemoveFromGroup] - 从当前分组移除
 * @param {(row: any, meta: { hasHolding: boolean }) => void} [props.onHoldingAmountClick] - 点击持仓金额
 * @param {boolean} [props.refreshing] - 是否处于刷新状态（控制删除按钮禁用态）
 * @param {(row: any) => Object} [props.getFundCardProps] - 给定行返回 FundCard 的 props；传入后点击基金名称将用弹框展示卡片详情
 * @param {React.MutableRefObject<(() => void) | null>} [props.closeDialogRef] - 注入关闭弹框的方法，用于确认删除时关闭
 * @param {boolean} [props.blockDialogClose] - 为 true 时阻止点击遮罩关闭弹框（如删除确认弹框打开时）
 * @param {number} [props.stickyTop] - 表头固定时的 top 偏移（与 MobileFundTable 一致，用于适配导航栏、筛选栏等）
 * @param {boolean} [props.masked] - 是否隐藏持仓相关金额
 */
export default function PcFundTable({
  data = [],
  onRemoveFund,
  currentTab,
  favorites = new Set(),
  onToggleFavorite,
  onRemoveFromGroup,
  onHoldingAmountClick,
  onHoldingProfitClick, // 保留以兼容调用方，表格内已不再使用点击切换
  refreshing = false,
  sortBy = 'default',
  onReorder,
  onCustomSettingsChange,
  getFundCardProps,
  closeDialogRef,
  blockDialogClose = false,
  stickyTop = 0,
  masked = false,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const [activeId, setActiveId] = useState(null);
  const [cardDialogRow, setCardDialogRow] = useState(null);
  const tableContainerRef = useRef(null);
  const portalHeaderRef = useRef(null);
  const [showPortalHeader, setShowPortalHeader] = useState(false);
  const [effectiveStickyTop, setEffectiveStickyTop] = useState(stickyTop);
  const [portalHorizontal, setPortalHorizontal] = useState({ left: 0, right: 0 });

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const oldIndex = data.findIndex(item => item.code === active.id);
      const newIndex = data.findIndex(item => item.code === over.id);
      if (oldIndex !== -1 && newIndex !== -1 && onReorder) {
        onReorder(oldIndex, newIndex);
      }
    }
    setActiveId(null);
  };
  const groupKey = currentTab ?? 'all';

  const getCustomSettingsWithMigration = () => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem('customSettings');
      const parsed = raw ? JSON.parse(raw) : {};
      if (!parsed || typeof parsed !== 'object') return {};
      if (parsed.pcTableColumnOrder != null || parsed.pcTableColumnVisibility != null || parsed.pcTableColumns != null || parsed.mobileTableColumnOrder != null || parsed.mobileTableColumnVisibility != null) {
        const all = {
          ...(parsed.all && typeof parsed.all === 'object' ? parsed.all : {}),
          pcTableColumnOrder: parsed.pcTableColumnOrder,
          pcTableColumnVisibility: parsed.pcTableColumnVisibility,
          pcTableColumns: parsed.pcTableColumns,
          mobileTableColumnOrder: parsed.mobileTableColumnOrder,
          mobileTableColumnVisibility: parsed.mobileTableColumnVisibility,
        };
        delete parsed.pcTableColumnOrder;
        delete parsed.pcTableColumnVisibility;
        delete parsed.pcTableColumns;
        delete parsed.mobileTableColumnOrder;
        delete parsed.mobileTableColumnVisibility;
        parsed.all = all;
        window.localStorage.setItem('customSettings', JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      return {};
    }
  };

  const buildPcConfigFromGroup = (group) => {
    if (!group || typeof group !== 'object') return null;
    const sizing = group.pcTableColumns;
    const sizingObj = sizing && typeof sizing === 'object'
      ? Object.fromEntries(Object.entries(sizing).filter(([, v]) => Number.isFinite(v)))
      : {};
    if (sizingObj.actions) {
      const { actions, ...rest } = sizingObj;
      Object.assign(sizingObj, rest);
      delete sizingObj.actions;
    }
    const order = Array.isArray(group.pcTableColumnOrder) && group.pcTableColumnOrder.length > 0
      ? group.pcTableColumnOrder
      : null;
    const visibility = group.pcTableColumnVisibility && typeof group.pcTableColumnVisibility === 'object'
      ? group.pcTableColumnVisibility
      : null;
    return { sizing: sizingObj, order, visibility };
  };

  const getDefaultPcGroupConfig = () => ({
    order: [...NON_FROZEN_COLUMN_IDS],
    visibility: null,
    sizing: {},
  });

  const getInitialConfigByGroup = () => {
    const parsed = getCustomSettingsWithMigration();
    const byGroup = {};
    Object.keys(parsed).forEach((k) => {
      if (k === 'pcContainerWidth') return;
      const group = parsed[k];
      const pc = buildPcConfigFromGroup(group);
      if (pc) {
        byGroup[k] = {
          pcTableColumnOrder: pc.order ? (() => {
            const valid = pc.order.filter((id) => NON_FROZEN_COLUMN_IDS.includes(id));
            const missing = NON_FROZEN_COLUMN_IDS.filter((id) => !valid.includes(id));
            return [...valid, ...missing];
          })() : null,
          pcTableColumnVisibility: pc.visibility,
          pcTableColumns: Object.keys(pc.sizing).length ? pc.sizing : null,
          pcShowFullFundName: group.pcShowFullFundName === true,
        };
      }
    });
    return byGroup;
  };

  const [configByGroup, setConfigByGroup] = useState(getInitialConfigByGroup);

  const currentGroupPc = configByGroup[groupKey];
  const showFullFundName = currentGroupPc?.pcShowFullFundName ?? false;
  const defaultPc = getDefaultPcGroupConfig();
  const columnOrder = (() => {
    const order = currentGroupPc?.pcTableColumnOrder ?? defaultPc.order;
    if (!Array.isArray(order) || order.length === 0) return [...NON_FROZEN_COLUMN_IDS];
    const valid = order.filter((id) => NON_FROZEN_COLUMN_IDS.includes(id));
    const missing = NON_FROZEN_COLUMN_IDS.filter((id) => !valid.includes(id));
    return [...valid, ...missing];
  })();
  const columnVisibility = (() => {
    const vis = currentGroupPc?.pcTableColumnVisibility ?? null;
    if (vis && typeof vis === 'object' && Object.keys(vis).length > 0) return vis;
    const allVisible = {};
    NON_FROZEN_COLUMN_IDS.forEach((id) => { allVisible[id] = true; });
    return allVisible;
  })();
  const columnSizing = (() => {
    const s = currentGroupPc?.pcTableColumns;
    if (s && typeof s === 'object') {
      const out = Object.fromEntries(Object.entries(s).filter(([, v]) => Number.isFinite(v)));
      if (out.actions) {
        const { actions, ...rest } = out;
        return rest;
      }
      return out;
    }
    return {};
  })();

  const persistPcGroupConfig = (updates) => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('customSettings');
      const parsed = raw ? JSON.parse(raw) : {};
      const group = parsed[groupKey] && typeof parsed[groupKey] === 'object' ? { ...parsed[groupKey] } : {};
      if (updates.pcTableColumnOrder !== undefined) group.pcTableColumnOrder = updates.pcTableColumnOrder;
      if (updates.pcTableColumnVisibility !== undefined) group.pcTableColumnVisibility = updates.pcTableColumnVisibility;
      if (updates.pcTableColumns !== undefined) group.pcTableColumns = updates.pcTableColumns;
      if (updates.pcShowFullFundName !== undefined) group.pcShowFullFundName = updates.pcShowFullFundName;
      parsed[groupKey] = group;
      window.localStorage.setItem('customSettings', JSON.stringify(parsed));
      setConfigByGroup((prev) => ({ ...prev, [groupKey]: { ...prev[groupKey], ...updates } }));
      onCustomSettingsChange?.();
    } catch { }
  };

  const handleToggleShowFullFundName = (show) => {
    persistPcGroupConfig({ pcShowFullFundName: show });
  };

  const setColumnOrder = (nextOrderOrUpdater) => {
    const next = typeof nextOrderOrUpdater === 'function'
      ? nextOrderOrUpdater(columnOrder)
      : nextOrderOrUpdater;
    persistPcGroupConfig({ pcTableColumnOrder: next });
  };
  const setColumnVisibility = (nextOrUpdater) => {
    const next = typeof nextOrUpdater === 'function'
      ? nextOrUpdater(columnVisibility)
      : nextOrUpdater;
    persistPcGroupConfig({ pcTableColumnVisibility: next });
  };
  const setColumnSizing = (nextOrUpdater) => {
    const next = typeof nextOrUpdater === 'function'
      ? nextOrUpdater(columnSizing)
      : nextOrUpdater;
    const { actions, ...rest } = next || {};
    persistPcGroupConfig({ pcTableColumns: rest || {} });
  };
  const [settingModalOpen, setSettingModalOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const handleResetSizing = () => {
    setColumnSizing({});
    setResetConfirmOpen(false);
  };

  const handleResetColumnOrder = () => {
    setColumnOrder([...NON_FROZEN_COLUMN_IDS]);
  };

  const handleResetColumnVisibility = () => {
    const allVisible = {};
    NON_FROZEN_COLUMN_IDS.forEach((id) => {
      allVisible[id] = true;
    });
    setColumnVisibility(allVisible);
  };
  const handleToggleColumnVisibility = (columnId, visible) => {
    setColumnVisibility((prev = {}) => ({ ...prev, [columnId]: visible }));
  };
  const onRemoveFundRef = useRef(onRemoveFund);
  const onToggleFavoriteRef = useRef(onToggleFavorite);
  const onRemoveFromGroupRef = useRef(onRemoveFromGroup);
  const onHoldingAmountClickRef = useRef(onHoldingAmountClick);

  useEffect(() => {
    if (closeDialogRef) {
      closeDialogRef.current = () => setCardDialogRow(null);
