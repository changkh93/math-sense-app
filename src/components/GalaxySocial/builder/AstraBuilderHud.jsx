import {
  AlertTriangle,
  Box,
  Camera,
  ChevronDown,
  ChevronUp,
  Hammer,
  Redo2,
  RotateCw,
  Save,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'
import {
  ASTRA_BUILDER_BLOCKS,
  ASTRA_BUILDER_POC_PLOT,
} from './astraBuilderModel'
import './AstraBuilder.css'

const SAVE_LABELS = {
  saved: '저장됨',
  local: '기기에 저장됨',
  syncing: '저장 중',
  device: '기기에 보관됨',
  conflict: '복구 필요',
}

export default function AstraBuilderHud({
  hydrated,
  saveState,
  blockCount,
  inputMode,
  onInputModeChange,
  tool,
  onToolChange,
  activeLayer,
  onLayerChange,
  selectedBlockType,
  onSelectBlockType,
  selectedRotation,
  onRotateSelection,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClose,
  remainingSeconds,
  conflict = null,
  serverError = '',
  onResolveConflict,
}) {
  return (
    <section className="astra-builder-hud" aria-label="아스트라 빌더 POC">
      <header className="astra-builder-hud__top">
        <div>
          <small>ASTRA BUILDER · POC</small>
          <strong>별빛 건축실 B-01</strong>
        </div>
        <div className="astra-builder-hud__status">
          <span><Save size={14} aria-hidden="true" /> {hydrated ? SAVE_LABELS[saveState] : '초안 불러오는 중'}</span>
          <b>{blockCount} / {ASTRA_BUILDER_POC_PLOT.maxBlocks}</b>
          {Number.isFinite(remainingSeconds) && <em>{Math.max(0, Math.ceil(remainingSeconds / 60))}분</em>}
          <button type="button" onClick={onClose}><X size={17} aria-hidden="true" /> 나가기</button>
        </div>
      </header>

      {conflict && (
        <div className="astra-builder-hud__conflict" role="alert">
          <AlertTriangle size={19} aria-hidden="true" />
          <div>
            <strong>다른 기기의 저장본을 발견했어요</strong>
            <span>
              서버 {conflict.serverBlockCount}블록 · 이 기기 {conflict.localBlockCount}블록
            </span>
          </div>
          <button type="button" onClick={() => onResolveConflict?.('server')}>
            서버본 사용
          </button>
          <button type="button" className="primary" onClick={() => onResolveConflict?.('device')}>
            기기본 적용
          </button>
        </div>
      )}
      {!conflict && serverError && (
        <div className="astra-builder-hud__sync-notice" role="status">
          {serverError}
        </div>
      )}

      <div className="astra-builder-hud__modes" role="group" aria-label="입력 모드">
        <button
          type="button"
          className={inputMode === 'build' ? 'active' : ''}
          aria-pressed={inputMode === 'build'}
          onClick={() => onInputModeChange('build')}
        >
          <Hammer size={17} aria-hidden="true" /> 건축
        </button>
        <button
          type="button"
          className={inputMode === 'camera' ? 'active' : ''}
          aria-pressed={inputMode === 'camera'}
          onClick={() => onInputModeChange('camera')}
        >
          <Camera size={17} aria-hidden="true" /> 카메라
        </button>
      </div>

      <aside className="astra-builder-hud__tools" aria-label="건축 도구">
        <button
          type="button"
          className={tool === 'place' ? 'active' : ''}
          aria-pressed={tool === 'place'}
          onClick={() => onToolChange('place')}
        >
          <Box size={18} aria-hidden="true" /><span>배치</span>
        </button>
        <button
          type="button"
          className={tool === 'delete' ? 'active' : ''}
          aria-pressed={tool === 'delete'}
          onClick={() => onToolChange('delete')}
        >
          <Trash2 size={18} aria-hidden="true" /><span>삭제</span>
        </button>
        <button
          type="button"
          className={tool === 'rotate' ? 'active' : ''}
          aria-pressed={tool === 'rotate'}
          onClick={() => onToolChange('rotate')}
        >
          <RotateCw size={18} aria-hidden="true" /><span>회전</span>
        </button>
      </aside>

      <aside className="astra-builder-hud__history" aria-label="작업 기록">
        <button type="button" disabled={!canUndo} onClick={onUndo}><Undo2 size={18} aria-hidden="true" /><span>되돌리기</span></button>
        <button type="button" disabled={!canRedo} onClick={onRedo}><Redo2 size={18} aria-hidden="true" /><span>다시 실행</span></button>
      </aside>

      <div className="astra-builder-hud__layer" aria-label="현재 편집 높이">
        <button
          type="button"
          disabled={activeLayer >= ASTRA_BUILDER_POC_PLOT.height - 1}
          onClick={() => onLayerChange(activeLayer + 1)}
          aria-label="한 층 위로"
        >
          <ChevronUp size={17} aria-hidden="true" />
        </button>
        <span><small>편집 높이</small><strong>{activeLayer + 1} / {ASTRA_BUILDER_POC_PLOT.height}</strong></span>
        <button
          type="button"
          disabled={activeLayer <= 0}
          onClick={() => onLayerChange(activeLayer - 1)}
          aria-label="한 층 아래로"
        >
          <ChevronDown size={17} aria-hidden="true" />
        </button>
      </div>

      <footer className="astra-builder-hud__palette">
        <div>
          <small>기본 재료 · 자유 사용</small>
          <span>선택 회전 {selectedRotation * 90}°</span>
        </div>
        <div className="astra-builder-hud__materials">
          {ASTRA_BUILDER_BLOCKS.map((block) => (
            <button
              key={block.id}
              type="button"
              className={selectedBlockType === block.id ? 'active' : ''}
              aria-pressed={selectedBlockType === block.id}
              onClick={() => onSelectBlockType(block.id)}
            >
              <i style={{ '--builder-block-color': block.color }} />
              <span>{block.label}</span>
            </button>
          ))}
          <button
            type="button"
            className="rotate-selection"
            onClick={onRotateSelection}
            title={`배치 방향 변경 (현재 ${selectedRotation * 90}°)`}
          >
            <RotateCw
              size={16}
              aria-hidden="true"
              style={{
                transform: `rotate(${selectedRotation * 90}deg)`,
                transition: 'transform 0.2s ease',
              }}
            />
            <span>방향 {selectedRotation * 90}°</span>
          </button>
        </div>
      </footer>
    </section>
  )
}
