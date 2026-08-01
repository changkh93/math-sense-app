import {
  AlertTriangle,
  Box,
  Camera,
  Eye,
  Gem,
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
  getAstraBuilderLayerInfo,
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
  blockCapacity = 500,
  plotName = '별빛 건축실 B-01',
  wallet = 0,
  blockPackCost = 1000,
  maxBlockCapacity = 2500,
  purchaseBusy = false,
  onPurchaseBlockPack,
  inputMode,
  onInputModeChange,
  isFirstPerson,
  onToggleFirstPerson,
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
  const layerInfo = getAstraBuilderLayerInfo(activeLayer)
  return (
    <section className="astra-builder-hud" aria-label="아스트라 빌더 POC">
      <header className="astra-builder-hud__top">
        <div>
          <small>ASTRA BUILDER</small>
          <strong>{plotName}</strong>
        </div>
        <div className="astra-builder-hud__status">
          <span><Save size={14} aria-hidden="true" /> {hydrated ? SAVE_LABELS[saveState] : '초안 불러오는 중'}</span>
          <b>{blockCount.toLocaleString()} / {blockCapacity.toLocaleString()} 블록</b>
          <span className="astra-builder-hud__wallet"><Gem size={14} aria-hidden="true" /> {wallet.toLocaleString()} 광석</span>
          <button
            type="button"
            className="astra-builder-hud__purchase"
            disabled={purchaseBusy || blockCapacity >= maxBlockCapacity || wallet < blockPackCost}
            onClick={onPurchaseBlockPack}
            title={blockCapacity >= maxBlockCapacity ? '이 건축실은 최대 용량입니다' : `블록 500개 확장 · 학습 광석 ${blockPackCost.toLocaleString()}`}
          >
            +500 · {blockPackCost.toLocaleString()}
          </button>
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

      <div className="astra-builder-hud__commandbar">
        <div className="astra-builder-hud__modes" role="group" aria-label="입력 모드">
          <button
            type="button"
            className={inputMode === 'build' ? 'active' : ''}
            aria-pressed={inputMode === 'build'}
            onClick={() => onInputModeChange('build')}
          >
            <Hammer size={17} aria-hidden="true" /> 플레이-빌드
          </button>
          <button
            type="button"
            className={inputMode === 'camera' ? 'active' : ''}
            aria-pressed={inputMode === 'camera'}
            onClick={() => onInputModeChange('camera')}
          >
            <Camera size={17} aria-hidden="true" /> 설계도
          </button>
          {inputMode === 'build' ? (
            <button
              type="button"
              className={isFirstPerson ? 'active' : ''}
              aria-pressed={isFirstPerson}
              onClick={onToggleFirstPerson}
              title="플레이 시점 전환 (V)"
            >
              <Eye size={17} aria-hidden="true" /> {isFirstPerson ? '1인칭' : '3인칭'}
            </button>
          ) : (
            <span
              className="astra-builder-hud__view-mode"
              title="캐릭터와 분리된 자유 회전·확대 설계 카메라"
            >
              <Eye size={17} aria-hidden="true" /> 자유 설계 시점
            </span>
          )}
        </div>

        <div className="astra-builder-hud__layer" aria-label="층 엘리베이터">
          <button
            type="button"
            disabled={activeLayer <= 0}
            onClick={() => onLayerChange(activeLayer - 1)}
            aria-label="한 층 아래로"
            title="한 높이 칸 아래로 (Page Down)"
          >
            <ChevronDown size={17} aria-hidden="true" />
          </button>
          <span>
            <small>{inputMode === 'build' ? '배치 · 삭제 · 회전' : '층 엘리베이터'}</small>
            <strong>{layerInfo.label} · 높이 {layerInfo.course}/{layerInfo.courseCount}</strong>
          </span>
          <button
            type="button"
            disabled={activeLayer >= ASTRA_BUILDER_POC_PLOT.height - 1}
            onClick={() => onLayerChange(activeLayer + 1)}
            aria-label="한 층 위로"
            title="한 높이 칸 위로 (Page Up)"
          >
            <ChevronUp size={17} aria-hidden="true" />
          </button>
        </div>
      </div>

      {inputMode === 'build' && (
        <>
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

          <footer className="astra-builder-hud__palette">
            <div>
              <small>1층 = 높이 3칸 · 옥상 별도</small>
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
        </>
      )}
    </section>
  )
}
