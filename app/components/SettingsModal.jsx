'use client';

import { useEffect, useState } from 'react';
import ConfirmModal from './ConfirmModal';
import { ResetIcon, SettingsIcon } from './Icons';

export default function SettingsModal({
  onClose,
  tempSeconds,
  setTempSeconds,
  saveSettings,
  exportLocalData,
  importFileRef,
  handleImportFileChange,
  importMsg,
  isMobile,
  containerWidth = 1200,
  setContainerWidth,
  onResetContainerWidth,
}) {
  const [sliderDragging, setSliderDragging] = useState(false);
  const [resetWidthConfirmOpen, setResetWidthConfirmOpen] = useState(false);

  useEffect(() => {
    if (!sliderDragging) return;
    const onPointerUp = () => setSliderDragging(false);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
    return () => {
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
    };
  }, [sliderDragging]);

  return (
    <div
      className={`modal-overlay ${sliderDragging ? 'modal-overlay-translucent' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="设置"
      onClick={onClose}
    >
      <div className="glass card modal" onClick={(e) => e.stopPropagation()}>
        <div className="title" style={{ marginBottom: 12 }}>
          <SettingsIcon width="20" height="20" />
          <span>设置</span>
        </div>

        <div className="form-group" style={{ marginBottom: 16 }}>
          <div className="muted" style={{ marginBottom: 8, fontSize: '0.8rem' }}>刷新频率</div>
          <div className="chips" style={{ marginBottom: 12 }}>
            {[30, 60, 120, 300].map((s) => (
              <button
                key={s}
                type="button"
                className={`chip ${tempSeconds === s ? 'active' : ''}`}
                onClick={() => setTempSeconds(s)}
                aria-pressed={tempSeconds === s}
              >
                {s} 秒
              </button>
            ))}
          </div>
          <input
            className="input"
            type="number"
            inputMode="numeric"
            min="30"
            step="5"
            value={tempSeconds}
            onChange={(e) => setTempSeconds(Number(e.target.value))}
            placeholder="自定义秒数"
          />
          {tempSeconds < 30 && (
            <div className="error-text" style={{ marginTop: 8 }}>
              最小 30 秒
            </div>
          )}
        </div>

        {!isMobile && setContainerWidth && (
          <div className="form-group" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <div className="muted" style={{ fontSize: '0.8rem' }}>页面宽度</div>
              {onResetContainerWidth && (
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setResetWidthConfirmOpen(true)}
                  title="重置页面宽度"
                  style={{
                    border: 'none',
                    width: '24px',
                    height: '24px',
                    padding: 0,
                    backgroundColor: 'transparent',
                    color: 'var(--muted)',
                  }}
                >
                  <ResetIcon width="14" height="14" />
                </button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="range"
                min={600}
                max={2000}
                step={10}
                value={Math.min(2000, Math.max(600, Number(containerWidth) || 1200))}
                onChange={(e) => setContainerWidth(Number(e.target.value))}
                onPointerDown={() => setSliderDragging(true)}
                className="page-width-slider"
                style={{
                  flex: 1,
                  height: 6,
                  accentColor: 'var(--primary)',
                }}
              />
              <span className="muted" style={{ fontSize: '0.8rem', minWidth: 48 }}>
                {Math.min(2000, Math.max(600, Number(containerWidth) || 1200))}px
              </span>
            </div>
          </div>
        )}

        <div className="form-group" style={{ marginBottom: 16 }}>
          <div className="muted" style={{ marginBottom: 8, fontSize: '0.8rem' }}>数据导出</div>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="button" onClick={exportLocalData}>导出配置</button>
          </div>
          <div className="muted" style={{ marginBottom: 8, fontSize: '0.8rem', marginTop: 26 }}>数据导入</div>
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <button type="button" className="button" onClick={() => importFileRef.current?.click?.()}>导入配置</button>
          </div>
          <input
            ref={importFileRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={handleImportFileChange}
          />
          {importMsg && (
            <div className="muted" style={{ marginTop: 8 }}>
              {importMsg}
            </div>
          )}
        </div>

        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 24 }}>
          <button className="button" onClick={saveSettings} disabled={tempSeconds < 30}>保存并关闭</button>
        </div>
      </div>
      {resetWidthConfirmOpen && onResetContainerWidth && (
        <ConfirmModal
          title="重置页面宽度"
          message="是否重置页面宽度为默认值 1200px？"
          onConfirm={() => {
            onResetContainerWidth();
            setResetWidthConfirmOpen(false);
          }}
          onCancel={() => setResetWidthConfirmOpen(false)}
          confirmText="重置"
        />
      )}
    </div>
  );
}
