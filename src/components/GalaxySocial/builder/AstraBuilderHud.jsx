import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Box,
  Camera,
  Eye,
  Gem,
  ChevronDown,
  ChevronUp,
  Hammer,
  Palette,
  Pipette,
  Redo2,
  RotateCw,
  Save,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'
import {
  ASTRA_BUILDER_POC_PLOT,
  getAstraBuilderLayerInfo,
} from './astraBuilderModel'
import {
  ASTRA_BUILDER_MATERIALS,
  ASTRA_BUILDER_QUICKBAR_CORE_RECIPE_IDS,
  ASTRA_BUILDER_QUICKBAR_FALLBACK_RECIPE_IDS,
  ASTRA_BUILDER_RECIPES,
  getAstraBuilderMaterial,
  getAstraBuilderPartForRecipe,
} from './astraBuilderRecipeCatalog.js'
import {
  ASTRA_BUILDER_RECENT_STORAGE_KEY,
  buildAstraBuilderQuickbarItems,
  normalizeAstraBuilderRecentRecipeIds,
  recordAstraBuilderRecentRecipeId,
} from './astraBuilderQuickbar.js'
import './AstraBuilder.css'

const RECIPE_IDS = new Set(ASTRA_BUILDER_RECIPES.map((recipe) => recipe.id))
const PART_ORDER = new Map([
  ['lumen_wall', 0], ['lumen_wall_panel', 1], ['foundation_floor', 2],
  ['stair_straight', 3], ['support_pillar', 4], ['lumen_wood_door', 5],
  ['nebula_glass', 6], ['star_light', 7], ['light_bar', 8],
])
const MATERIAL_ORDER = new Map(Object.keys(ASTRA_BUILDER_MATERIALS).map((id, index) => [id, index]))
const PALETTE_CATEGORIES = [
  ['all', '전체'], ['wall', '벽'], ['floor', '바닥'], ['stair', '계단'],
  ['structure', '기둥'], ['door', '문'], ['light', '조명'],
]

function isRecipeInCategory(recipe, category) {
  const part = recipe.partId
  if (category === 'wall') return part === 'lumen_wall' || part === 'lumen_wall_panel' || part === 'nebula_glass'
  if (category === 'floor') return part === 'foundation_floor'
  if (category === 'stair') return part === 'stair_straight'
  if (category === 'structure') return part === 'support_pillar'
  if (category === 'door') return part === 'lumen_wood_door'
  if (category === 'light') return part === 'star_light' || part === 'light_bar'
  return true
}

function sortRecipes(first, second) {
  return (PART_ORDER.get(first.partId) ?? 99) - (PART_ORDER.get(second.partId) ?? 99)
    || (MATERIAL_ORDER.get(first.materialId) ?? 99) - (MATERIAL_ORDER.get(second.materialId) ?? 99)
    || first.id - second.id
}

function getRecipeVariantLabel(recipe) {
  return recipe.label.split('·')[1]?.trim() || recipe.variantId
}

function loadRecentRecipeIds() {
  if (typeof globalThis.localStorage === 'undefined') return []
  try {
    const stored = JSON.parse(globalThis.localStorage.getItem(ASTRA_BUILDER_RECENT_STORAGE_KEY) || '[]')
    return normalizeAstraBuilderRecentRecipeIds(stored, {
      validIds: RECIPE_IDS,
      excludedIds: ASTRA_BUILDER_QUICKBAR_CORE_RECIPE_IDS,
    })
  } catch {
    return []
  }
}

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
  targetSlot = 'main',
  onTargetSlotChange,
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
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [paletteCategory, setPaletteCategory] = useState('all')
  const [paletteMaterial, setPaletteMaterial] = useState('all')
  const [recentRecipeIds, setRecentRecipeIds] = useState(loadRecentRecipeIds)
  const [recordedBlockType, setRecordedBlockType] = useState(selectedBlockType)
  const selectedRecipe = ASTRA_BUILDER_RECIPES.find((recipe) => recipe.id === selectedBlockType)
    || ASTRA_BUILDER_RECIPES[0]
  const quickbarItems = useMemo(() => buildAstraBuilderQuickbarItems({
    recipes: ASTRA_BUILDER_RECIPES,
    coreIds: ASTRA_BUILDER_QUICKBAR_CORE_RECIPE_IDS,
    recentIds: recentRecipeIds,
    fallbackIds: ASTRA_BUILDER_QUICKBAR_FALLBACK_RECIPE_IDS,
  }), [recentRecipeIds])
  const categoryRecipes = useMemo(() => ASTRA_BUILDER_RECIPES
    .filter((recipe) => isRecipeInCategory(recipe, paletteCategory))
    .sort(sortRecipes), [paletteCategory])
  const paletteMaterials = useMemo(() => [...new Set(categoryRecipes.map((recipe) => recipe.materialId))]
    .sort((first, second) => (MATERIAL_ORDER.get(first) ?? 99) - (MATERIAL_ORDER.get(second) ?? 99)), [categoryRecipes])
  const paletteRecipes = useMemo(() => {
    if (paletteMaterial === 'all' || !paletteMaterials.includes(paletteMaterial)) return categoryRecipes
    return categoryRecipes.filter((recipe) => recipe.materialId === paletteMaterial)
  }, [categoryRecipes, paletteMaterial, paletteMaterials])

  useEffect(() => {
    if (typeof globalThis.localStorage === 'undefined') return
    try {
      globalThis.localStorage.setItem(ASTRA_BUILDER_RECENT_STORAGE_KEY, JSON.stringify(recentRecipeIds))
    } catch {
      // Private browsing or a full storage quota must not block building.
    }
  }, [recentRecipeIds])

  if (recordedBlockType !== selectedBlockType) {
    setRecordedBlockType(selectedBlockType)
    setRecentRecipeIds((current) => recordAstraBuilderRecentRecipeId(current, selectedBlockType, {
      validIds: RECIPE_IDS,
      excludedIds: ASTRA_BUILDER_QUICKBAR_CORE_RECIPE_IDS,
    }))
  }

  const selectRecipe = (recipeId) => {
    setRecentRecipeIds((current) => recordAstraBuilderRecentRecipeId(current, recipeId, {
      validIds: RECIPE_IDS,
      excludedIds: ASTRA_BUILDER_QUICKBAR_CORE_RECIPE_IDS,
    }))
    onSelectBlockType(recipeId)
  }
  const rotationSteps = getAstraBuilderPartForRecipe(selectedRecipe?.id)?.rotationSteps || 1
  const directionLabels = ['↑', '→', '↓', '←']
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
            <button
              type="button"
              className={tool === 'material' ? 'active' : ''}
              aria-pressed={tool === 'material'}
              onClick={() => onToolChange('material')}
              title="같은 형태의 블록 재질만 바꿉니다"
            >
              <Palette size={18} aria-hidden="true" /><span>재질</span>
            </button>
            <button
              type="button"
              className={tool === 'copy' ? 'active' : ''}
              aria-pressed={tool === 'copy'}
              onClick={() => onToolChange('copy')}
              title="블록을 클릭해 재료와 방향을 가져옵니다"
            >
              <Pipette size={18} aria-hidden="true" /><span>복사</span>
            </button>
          </aside>

          <aside className="astra-builder-hud__history" aria-label="작업 기록">
            <button type="button" disabled={!canUndo} onClick={onUndo}><Undo2 size={18} aria-hidden="true" /><span>되돌리기</span></button>
            <button type="button" disabled={!canRedo} onClick={onRedo}><Redo2 size={18} aria-hidden="true" /><span>다시 실행</span></button>
          </aside>

          <footer className="astra-builder-hud__palette">
            <div>
              <small>1층 = 높이 3칸 · 옥상 별도</small>
              <span>
                {selectedRecipe?.label || '재료 선택'} · {rotationSteps > 1 ? `앞면 ${directionLabels[selectedRotation % 4]}` : '방향 없음'}
              </span>
              {(tool === 'material' || tool === 'copy') && (
                <div className="astra-builder-hud__target-slot" role="group" aria-label="편집 대상">
                  <button type="button" className={targetSlot === 'main' ? 'active' : ''} aria-pressed={targetSlot === 'main'} onClick={() => onTargetSlotChange?.('main')}>위 구조</button>
                  <button type="button" className={targetSlot === 'underlay' ? 'active' : ''} aria-pressed={targetSlot === 'underlay'} onClick={() => onTargetSlotChange?.('underlay')}>바닥</button>
                </div>
              )}
            </div>
            <div className="astra-builder-hud__materials" aria-label="건축 퀵바">
              <button
                type="button"
                className={`astra-builder-hud__palette-toggle${paletteOpen ? ' active' : ''}`}
                aria-expanded={paletteOpen}
                onClick={() => setPaletteOpen((open) => !open)}
              >
                <Box size={18} aria-hidden="true" />
                <span>재료함</span>
              </button>
              {quickbarItems.map(({ recipe, source }) => (
                <button
                  key={recipe.id}
                  type="button"
                  className={selectedBlockType === recipe.id ? 'active' : ''}
                  aria-pressed={selectedBlockType === recipe.id}
                  onClick={() => selectRecipe(recipe.id)}
                  title={recipe.label}
                >
                  <i
                    className={`material-${getAstraBuilderMaterial(recipe.materialId)?.family || 'plain'}`}
                    style={{ '--builder-block-color': recipe.color }}
                  />
                  <span>{recipe.label.replace(/\s·\s.*/, '')}</span>
                  {source !== 'core' && (
                    <small className={`astra-builder-hud__quickbar-source ${source}`}>
                      {source === 'recent' ? '최근' : '추천'}
                    </small>
                  )}
                </button>
              ))}
              {rotationSteps > 1 ? (
                <button
                  type="button"
                  className="rotate-selection"
                  onClick={onRotateSelection}
                  title="배치 방향을 시계 방향으로 변경"
                >
                  <RotateCw
                    size={16}
                    aria-hidden="true"
                    style={{
                      transform: `rotate(${selectedRotation * 90}deg)`,
                      transition: 'transform 0.2s ease',
                    }}
                  />
                  <span>{`앞면 ${directionLabels[selectedRotation % 4]}`}</span>
                </button>
              ) : (
                <span className="astra-builder-hud__no-rotation">방향 없음</span>
              )}
            </div>
            {paletteOpen && (
              <div className="astra-builder-hud__material-drawer" aria-label="재료함">
                <div className="astra-builder-hud__drawer-heading">
                  <strong>형태와 재질을 선택하세요</strong>
                  <span>상단 퀵바는 기본 도구 6개와 최근 사용 2개입니다.</span>
                </div>
                <div className="astra-builder-hud__material-categories" role="tablist" aria-label="재료 카테고리">
                  <span>형태</span>
                  {PALETTE_CATEGORIES.map(([category, label]) => (
                    <button
                      key={category}
                      type="button"
                      className={paletteCategory === category ? 'active' : ''}
                      aria-selected={paletteCategory === category}
                      onClick={() => {
                        setPaletteCategory(category)
                        setPaletteMaterial('all')
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="astra-builder-hud__material-categories" role="tablist" aria-label="재질 카테고리">
                  <span>재질</span>
                  <button
                    type="button"
                    className={paletteMaterial === 'all' ? 'active' : ''}
                    aria-selected={paletteMaterial === 'all'}
                    onClick={() => setPaletteMaterial('all')}
                  >
                    전체 재질
                  </button>
                  {paletteMaterials.map((materialId) => (
                    <button
                      key={materialId}
                      type="button"
                      className={paletteMaterial === materialId ? 'active' : ''}
                      aria-selected={paletteMaterial === materialId}
                      onClick={() => setPaletteMaterial(materialId)}
                    >
                      {getAstraBuilderMaterial(materialId)?.label || materialId}
                    </button>
                  ))}
                </div>
                <div className="astra-builder-hud__material-grid">
                  {paletteRecipes.map((recipe) => (
                    <button
                      key={recipe.id}
                      type="button"
                      className={selectedBlockType === recipe.id ? 'active' : ''}
                      aria-pressed={selectedBlockType === recipe.id}
                      onClick={() => {
                        selectRecipe(recipe.id)
                        setPaletteOpen(false)
                      }}
                    >
                      <i
                        className={`material-${getAstraBuilderMaterial(recipe.materialId)?.family || 'plain'}`}
                        style={{ '--builder-block-color': recipe.color }}
                      />
                      <span>
                        <strong>{getAstraBuilderPartForRecipe(recipe.id)?.label || recipe.partId}</strong>
                        <small>{getAstraBuilderMaterial(recipe.materialId)?.label} · {getRecipeVariantLabel(recipe)}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </footer>
        </>
      )}
    </section>
  )
}
