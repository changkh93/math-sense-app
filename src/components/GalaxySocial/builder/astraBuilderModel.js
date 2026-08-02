import {
  ASTRA_BUILDER_PALETTE_RECIPES,
  ASTRA_BUILDER_RECIPES,
  getAstraBuilderCompatibleRecipe,
  getAstraBuilderPartForRecipe,
  getAstraBuilderRecipe,
} from './astraBuilderRecipeCatalog.js'
import { getAstraBuilderBlockTraits } from './astraBuilderBlockCatalog.js'

export const ASTRA_BUILDER_POC_PLOT = Object.freeze({
  id: 'habitat-b01',
  center: Object.freeze([-7.5, -4.5]),
  width: 12,
  depth: 12,
  height: 10,
  cellSize: 0.34,
  // The grid itself is the only capacity boundary. A cell may contain one
  // foundation underlay plus one building piece, so there is no arbitrary
  // user-facing block quota.
  maxBlocks: 12 * 12 * 10 * 2,
})

export const ASTRA_BUILDER_HISTORY_LIMIT = 30
export const ASTRA_BUILDER_BASE_LIFT = .08
export const ASTRA_BUILDER_PLATFORM_SURFACE_OFFSET = .008
export const ASTRA_BUILDER_STORY_HEIGHT_CELLS = 3
export const ASTRA_BUILDER_DOOR_HEIGHT_CELLS = ASTRA_BUILDER_STORY_HEIGHT_CELLS
export const ASTRA_BUILDER_WALL_PANEL_TYPE = 8

export const ASTRA_BUILDER_BLOCKS = Object.freeze([
  Object.freeze({ id: 8, key: 'lumen_wall_panel', label: '루멘 벽 패널', color: '#dbe9e8' }),
  Object.freeze({ id: 1, key: 'lumen_wall', label: '벽 조각', color: '#b9cbcc' }),
  Object.freeze({ id: 2, key: 'foundation_floor', label: '기초 바닥', color: '#607989' }),
  Object.freeze({ id: 3, key: 'nebula_glass', label: '성운 유리', color: '#72dff1' }),
  Object.freeze({ id: 4, key: 'star_light', label: '별빛 조명', color: '#ffe58a' }),
  Object.freeze({ id: 5, key: 'step_block', label: '계단 (1/3층)', color: '#9bb6b7' }),
  Object.freeze({ id: 6, key: 'support_pillar', label: '지지 기둥', color: '#476171' }),
  Object.freeze({ id: 7, key: 'lumen_wood_door', label: '나무 문 (3셀)', color: '#a86f42' }),
])

export const ASTRA_BUILDER_BLOCK_BY_ID = new Map(
  ASTRA_BUILDER_BLOCKS.map((block) => [block.id, block]),
)

export { ASTRA_BUILDER_PALETTE_RECIPES, ASTRA_BUILDER_RECIPES }

export function isAstraBuilderGrid(value) {
  return value instanceof Uint16Array || value instanceof Uint32Array
}

export function getAstraBuilderLayerInfo(layer, plot = ASTRA_BUILDER_POC_PLOT) {
  const normalizedLayer = Math.min(
    plot.height - 1,
    Math.max(0, Math.floor(Number(layer) || 0)),
  )
  const fullStoryCellCount = Math.floor(plot.height / ASTRA_BUILDER_STORY_HEIGHT_CELLS)
    * ASTRA_BUILDER_STORY_HEIGHT_CELLS
  if (normalizedLayer >= fullStoryCellCount) {
    return {
      layer: normalizedLayer,
      story: null,
      course: normalizedLayer - fullStoryCellCount + 1,
      courseCount: plot.height - fullStoryCellCount,
      label: '옥상',
    }
  }
  const story = Math.floor(normalizedLayer / ASTRA_BUILDER_STORY_HEIGHT_CELLS) + 1
  const course = normalizedLayer % ASTRA_BUILDER_STORY_HEIGHT_CELLS + 1
  return {
    layer: normalizedLayer,
    story,
    course,
    courseCount: ASTRA_BUILDER_STORY_HEIGHT_CELLS,
    label: `${story}층`,
  }
}

export function isAstraBuilderSameStoryLayer(
  firstLayer,
  secondLayer,
  plot = ASTRA_BUILDER_POC_PLOT,
) {
  const first = getAstraBuilderLayerInfo(firstLayer, plot)
  const second = getAstraBuilderLayerInfo(secondLayer, plot)
  return first.story === second.story && (first.story !== null || first.label === second.label)
}

export function doesAstraBuilderBlockOccupyLayer(cell, activeLayer) {
  if (!cell) return false
  const recipeId = Number(cell.recipeId ?? cell.type ?? cell.blockType ?? 0)
  const part = getAstraBuilderPartForRecipe(recipeId)
  const heightCells = part?.heightCells || 1
  const layer = Number(activeLayer)
  return layer >= Number(cell.y) && layer < Number(cell.y) + heightCells
}

export function normalizeAstraBuilderPlacementCell(
  cell,
  recipeId,
  plot = ASTRA_BUILDER_POC_PLOT,
) {
  if (!cell) return null
  const part = getAstraBuilderPartForRecipe(recipeId)
  if (part?.heightCells !== ASTRA_BUILDER_STORY_HEIGHT_CELLS) return { ...cell }
  const baseY = Math.floor(Number(cell.y) / ASTRA_BUILDER_STORY_HEIGHT_CELLS)
    * ASTRA_BUILDER_STORY_HEIGHT_CELLS
  const normalized = { ...cell, y: baseY }
  return baseY + ASTRA_BUILDER_STORY_HEIGHT_CELLS <= plot.height ? normalized : null
}

const MAIN_RECIPE_MASK = 0x3ff
const MAIN_ROTATION_SHIFT = 10
const UNDERLAY_RECIPE_SHIFT = 12
const UNDERLAY_RECIPE_MASK = 0x3ff
const UNDERLAY_ROTATION_SHIFT = 22
const ROTATION_MASK = 0x03
const RESERVED_MASK = 0xff000000

export function getAstraBuilderCellCount(plot = ASTRA_BUILDER_POC_PLOT) {
  return plot.width * plot.depth * plot.height
}

export function createEmptyAstraBuilderGrid(plot = ASTRA_BUILDER_POC_PLOT) {
  return new Uint32Array(getAstraBuilderCellCount(plot))
}

export function getAstraBuilderVisibleCells({
  plotId,
  activePlotId,
  localCells,
  localHydrated,
  cachedCells,
}, plot = ASTRA_BUILDER_POC_PLOT) {
  const isActivePlot = String(plotId) === String(activePlotId)
  // The active plot's local draft is the source of truth after hydration.
  // Server state can legitimately lag while Functions are being upgraded or
  // while an offline save is waiting to sync, so it must not replace the
  // draft merely because the editing HUD is closed.
  if (isActivePlot && localHydrated && isAstraBuilderGrid(localCells)) return localCells
  if (isAstraBuilderGrid(cachedCells)) return cachedCells
  if (isActivePlot && isAstraBuilderGrid(localCells)) return localCells
  return createEmptyAstraBuilderGrid(plot)
}

export function isAstraBuilderCellInBounds(cell, plot = ASTRA_BUILDER_POC_PLOT) {
  return Number.isInteger(cell?.x)
    && Number.isInteger(cell?.y)
    && Number.isInteger(cell?.z)
    && cell.x >= 0
    && cell.x < plot.width
    && cell.y >= 0
    && cell.y < plot.height
    && cell.z >= 0
    && cell.z < plot.depth
}

export function getAstraBuilderCellIndex(cell, plot = ASTRA_BUILDER_POC_PLOT) {
  if (!isAstraBuilderCellInBounds(cell, plot)) return -1
  return cell.x + plot.width * (cell.z + plot.depth * cell.y)
}

export function getAstraBuilderCellFromIndex(index, plot = ASTRA_BUILDER_POC_PLOT) {
  if (!Number.isInteger(index) || index < 0 || index >= getAstraBuilderCellCount(plot)) return null
  const cellsPerLayer = plot.width * plot.depth
  const y = Math.floor(index / cellsPerLayer)
  const layerIndex = index - y * cellsPerLayer
  const z = Math.floor(layerIndex / plot.width)
  return { x: layerIndex - z * plot.width, y, z }
}

export function encodeAstraBuilderCell(recipeId, rotation = 0, foundationUnderlay = false, underlayRecipeId = 2, underlayRotation = 0) {
  const normalizedRecipeId = Number(recipeId) & MAIN_RECIPE_MASK
  if (!getAstraBuilderRecipe(normalizedRecipeId)) return 0
  // Keep the legacy rotation bits lossless during v1 migration. New UI and
  // server validation normalize symmetric parts to rotation 0 at the boundary.
  const normalizedRotation = (Number(rotation) || 0) & ROTATION_MASK
  const normalizedUnderlayRecipeId = foundationUnderlay && getAstraBuilderRecipe(normalizedRecipeId)?.legacyBlockType !== 2
    ? Number(underlayRecipeId) & UNDERLAY_RECIPE_MASK
    : 0
  const normalizedUnderlayRotation = normalizedUnderlayRecipeId
    ? (Number(underlayRotation) || 0) & ROTATION_MASK
    : 0
  return (
    normalizedRecipeId
    | (normalizedRotation << MAIN_ROTATION_SHIFT)
    | (normalizedUnderlayRecipeId << UNDERLAY_RECIPE_SHIFT)
    | (normalizedUnderlayRotation << UNDERLAY_ROTATION_SHIFT)
  ) >>> 0
}

export function decodeAstraBuilderCell(value) {
  const normalized = Number(value) >>> 0
  const recipeId = normalized & MAIN_RECIPE_MASK
  const recipe = getAstraBuilderRecipe(recipeId)
  const underlayRecipeId = (normalized >>> UNDERLAY_RECIPE_SHIFT) & UNDERLAY_RECIPE_MASK
  const decoded = {
    blockType: recipe?.legacyBlockType || 0,
    rotation: (normalized >>> MAIN_ROTATION_SHIFT) & ROTATION_MASK,
    occupied: recipeId !== 0 && Boolean(recipe),
    foundationUnderlay: underlayRecipeId !== 0,
  }
  Object.defineProperties(decoded, {
    recipeId: { value: recipeId, enumerable: false },
    underlayRecipeId: { value: underlayRecipeId, enumerable: false },
    underlayRotation: { value: (normalized >>> UNDERLAY_ROTATION_SHIFT) & ROTATION_MASK, enumerable: false },
    reservedBits: { value: normalized & RESERVED_MASK, enumerable: false },
  })
  return decoded
}

function countAstraBuilderCellPieces(value) {
  const decoded = decodeAstraBuilderCell(value)
  return Number(decoded.occupied) + Number(decoded.foundationUnderlay)
}

export function isAstraBuilderWalkBlockingCell(value, cell) {
  const decoded = decodeAstraBuilderCell(value)
  if (!decoded.occupied || !cell || cell.y > 1) return false
  const traits = getAstraBuilderBlockTraits(decoded.recipeId)
  return traits.headBlocking
    && traits.supportSurface !== 'floor'
    && traits.supportSurface !== 'stair'
    && traits.bodyShape !== 'doorway'
}

export function getAstraBuilderDoorwayColumns(cell, rotation, plot = ASTRA_BUILDER_POC_PLOT) {
  if (!isAstraBuilderCellInBounds(cell, plot)) return []
  const direction = [
    { x: 1, z: 0 },
    { x: 0, z: -1 },
    { x: -1, z: 0 },
    { x: 0, z: 1 },
  ][((Number(rotation) % 4) + 4) % 4]
  const neighbour = { x: cell.x + direction.x, y: cell.y, z: cell.z + direction.z }
  return isAstraBuilderCellInBounds(neighbour, plot) ? [cell, neighbour] : [cell]
}

export function getAstraBuilderDoorwayColumnKeys(cells, plot = ASTRA_BUILDER_POC_PLOT) {
  if (!isAstraBuilderGrid(cells)) return new Set()
  const doorwayColumns = new Set()
  for (let index = 0; index < cells.length; index += 1) {
    const decoded = decodeAstraBuilderCell(cells[index])
    if (!decoded.occupied || getAstraBuilderPartForRecipe(decoded.recipeId)?.bodyShape !== 'doorway') continue
    const cell = getAstraBuilderCellFromIndex(index, plot)
    if (cell?.y !== 0) continue
    getAstraBuilderDoorwayColumns(cell, decoded.rotation, plot).forEach((column) => {
      doorwayColumns.add(`${column.x}:${column.z}`)
    })
  }
  return doorwayColumns
}

export function getAstraBuilderWalkBlockingCells(cells, plot = ASTRA_BUILDER_POC_PLOT) {
  if (!isAstraBuilderGrid(cells)) return []
  const doorwayColumns = getAstraBuilderDoorwayColumnKeys(cells, plot)
  const blockers = []
  for (let index = 0; index < cells.length; index += 1) {
    const cell = getAstraBuilderCellFromIndex(index, plot)
    if (!cell || doorwayColumns.has(`${cell.x}:${cell.z}`)) continue
    if (!isAstraBuilderWalkBlockingCell(cells[index], cell)) continue
    blockers.push({
      ...cell,
      index,
      blockType: decodeAstraBuilderCell(cells[index]).blockType,
    })
  }
  return blockers
}

export function countAstraBuilderBlocks(cells) {
  let count = 0
  for (let index = 0; index < cells.length; index += 1) {
    count += countAstraBuilderCellPieces(cells[index])
  }
  return count
}

// Appearance-only recipe changes should not rebuild the full outline geometry.
// The key intentionally contains only topology and pose traits.
export function getAstraBuilderTopologyKey(cells) {
  if (!isAstraBuilderGrid(cells)) return ''
  const parts = []
  for (let index = 0; index < cells.length; index += 1) {
    const decoded = decodeAstraBuilderCell(cells[index])
    if (!decoded.occupied) {
      parts.push('0')
      continue
    }
    parts.push(`${decoded.blockType}:${decoded.rotation}:${decoded.foundationUnderlay ? 2 : 0}:${decoded.underlayRotation}`)
  }
  return parts.join('|')
}

export function applyAstraBuilderEdit(cells, edit, plot = ASTRA_BUILDER_POC_PLOT) {
  const index = getAstraBuilderCellIndex(edit?.cell, plot)
  if (index < 0 || !isAstraBuilderGrid(cells)) return null

  const before = cells[index]
  const decoded = decodeAstraBuilderCell(before)
  let after = before

  if (edit.tool === 'place') {
    if (getAstraBuilderPlacementIssue(cells, edit, plot)) return null
    const nextRecipeId = Number(edit.recipeId ?? edit.blockType)
    const nextRecipe = getAstraBuilderRecipe(nextRecipeId)
    if (!nextRecipe) return null
    const currentPart = getAstraBuilderPartForRecipe(decoded.recipeId)
    const nextPart = getAstraBuilderPartForRecipe(nextRecipeId)
    if (currentPart?.bodyShape === 'floor' && nextPart?.bodyShape !== 'floor') {
      // Keep the thin foundation as a structural underlay and place the wall,
      // panel, door, etc. in the same course so it starts flush at floor level.
      after = encodeAstraBuilderCell(nextRecipeId, edit.rotation, true, decoded.recipeId, decoded.rotation)
    } else if (
      nextPart?.bodyShape === 'floor'
      && decoded.occupied
      && currentPart?.bodyShape !== 'floor'
      && !decoded.foundationUnderlay
    ) {
      after = encodeAstraBuilderCell(decoded.recipeId, decoded.rotation, true, nextRecipeId, edit.rotation)
    } else {
      after = encodeAstraBuilderCell(nextRecipeId, edit.rotation)
    }
  } else if (edit.tool === 'delete') {
    if (!decoded.occupied) return null
    after = decoded.foundationUnderlay
      ? encodeAstraBuilderCell(decoded.underlayRecipeId, decoded.underlayRotation)
      : 0
  } else if (edit.tool === 'rotate') {
    if (!decoded.occupied) return null
    after = encodeAstraBuilderCell(
      decoded.recipeId,
      decoded.rotation + 1,
      decoded.foundationUnderlay,
      decoded.underlayRecipeId,
      decoded.underlayRotation,
    )
  } else if (edit.tool === 'material') {
    const issue = getAstraBuilderMaterialEditIssue(cells, edit, plot)
    if (issue) return null
    const selectedRecipe = getAstraBuilderRecipe(Number(edit.recipeId ?? edit.blockType))
    const targetUnderlay = edit.targetSlot === 'underlay'
    const currentRecipe = getAstraBuilderRecipe(targetUnderlay ? decoded.underlayRecipeId : decoded.recipeId)
    const nextRecipe = selectedRecipe && currentRecipe && selectedRecipe.partId === currentRecipe.partId
      ? selectedRecipe
      : selectedRecipe && currentRecipe
        ? getAstraBuilderCompatibleRecipe(currentRecipe.partId, {
            materialId: selectedRecipe.materialId,
            variantId: selectedRecipe.variantId,
          })
        : null
    if (!nextRecipe || !currentRecipe) return null
    if (targetUnderlay) {
      const nextUnderlayPart = getAstraBuilderPartForRecipe(nextRecipe.id)
      if (nextUnderlayPart?.bodyShape !== 'floor') return null
      after = encodeAstraBuilderCell(
        decoded.recipeId,
        decoded.rotation,
        true,
        nextRecipe.id,
        decoded.underlayRotation,
      )
    } else {
      after = encodeAstraBuilderCell(
        nextRecipe.id,
        decoded.rotation,
        decoded.foundationUnderlay,
        decoded.underlayRecipeId,
        decoded.underlayRotation,
      )
    }
  } else {
    return null
  }

  if (before === after) return null
  const nextCells = cells.slice()
  nextCells[index] = after
  return {
    cells: nextCells,
    patch: { index, before, after },
  }
}

export function getAstraBuilderMaterialEditIssue(cells, edit, plot = ASTRA_BUILDER_POC_PLOT) {
  const index = getAstraBuilderCellIndex(edit?.cell, plot)
  if (index < 0 || !isAstraBuilderGrid(cells)) return 'empty'
  const decoded = decodeAstraBuilderCell(cells[index])
  if (!decoded.occupied) return 'empty'
  const targetUnderlay = edit?.targetSlot === 'underlay'
  if (targetUnderlay && !decoded.foundationUnderlay) return 'missing_underlay'
  const selectedRecipe = getAstraBuilderRecipe(Number(edit?.recipeId ?? edit?.blockType))
  const currentRecipe = getAstraBuilderRecipe(targetUnderlay ? decoded.underlayRecipeId : decoded.recipeId)
  if (!selectedRecipe || !currentRecipe) return 'incompatible_material'
  if (selectedRecipe.partId === currentRecipe.partId) return null
  return getAstraBuilderCompatibleRecipe(currentRecipe.partId, {
    materialId: selectedRecipe.materialId,
    variantId: selectedRecipe.variantId,
  }) ? null : 'incompatible_material'
}

export function getAstraBuilderWallPanelAnchorAtCell(
  cells,
  cell,
  plot = ASTRA_BUILDER_POC_PLOT,
) {
  if (!isAstraBuilderGrid(cells) || !isAstraBuilderCellInBounds(cell, plot)) return null
  for (let offset = 0; offset < ASTRA_BUILDER_STORY_HEIGHT_CELLS; offset += 1) {
    const anchor = { x: cell.x, y: cell.y - offset, z: cell.z }
    const index = getAstraBuilderCellIndex(anchor, plot)
    if (index < 0) continue
    const decoded = decodeAstraBuilderCell(cells[index])
    if ((getAstraBuilderPartForRecipe(decoded.recipeId)?.heightCells || 1) > 1) return anchor
  }
  return null
}

export function getAstraBuilderPlacementIssue(cells, edit, plot = ASTRA_BUILDER_POC_PLOT) {
  if (!isAstraBuilderGrid(cells) || edit?.tool !== 'place') return null
  const cell = edit.cell
  const index = getAstraBuilderCellIndex(cell, plot)
  if (index < 0) return 'out_of_bounds'
  const candidateRecipe = getAstraBuilderRecipe(Number(edit.recipeId ?? edit.blockType))
  if (!candidateRecipe) return 'invalid_block'
  const candidatePart = getAstraBuilderPartForRecipe(candidateRecipe.id)
  const existing = decodeAstraBuilderCell(cells[index])
  const panelAnchor = getAstraBuilderWallPanelAnchorAtCell(cells, cell, plot)
  const isExactPanelAnchor = panelAnchor
    && panelAnchor.x === cell.x
    && panelAnchor.y === cell.y
    && panelAnchor.z === cell.z
  const canShareWithFoundation = (
    getAstraBuilderPartForRecipe(existing.recipeId)?.bodyShape === 'floor' && candidatePart?.bodyShape !== 'floor'
  ) || (
    candidatePart?.bodyShape === 'floor'
    && existing.occupied
    && getAstraBuilderPartForRecipe(existing.recipeId)?.bodyShape !== 'floor'
    && !existing.foundationUnderlay
    && (!panelAnchor || isExactPanelAnchor)
  )
  if ((existing.occupied || panelAnchor) && !canShareWithFoundation) return 'occupied'

  if ((candidatePart?.heightCells || 1) > 1) {
    if (cell.y % ASTRA_BUILDER_STORY_HEIGHT_CELLS !== 0) return 'panel_not_story_base'
    for (let offset = 0; offset < ASTRA_BUILDER_STORY_HEIGHT_CELLS; offset += 1) {
      const occupiedCell = { ...cell, y: cell.y + offset }
      const occupiedIndex = getAstraBuilderCellIndex(occupiedCell, plot)
      if (occupiedIndex < 0) return 'panel_out_of_bounds'
      const occupied = decodeAstraBuilderCell(cells[occupiedIndex])
      const canUseFoundationBase = offset === 0 && getAstraBuilderPartForRecipe(occupied.recipeId)?.bodyShape === 'floor'
      if (
        (!canUseFoundationBase && occupied.occupied)
        || getAstraBuilderWallPanelAnchorAtCell(cells, occupiedCell, plot)
      ) return 'occupied'
    }
  }

  const doorwayColumns = getAstraBuilderDoorwayColumnKeys(cells, plot)
  const candidateColumnKey = `${cell.x}:${cell.z}`
  if (
    cell.y <= 2
    && candidatePart?.bodyShape !== 'floor'
    && doorwayColumns.has(candidateColumnKey)
  ) return 'doorway_reserved'

  if (candidatePart?.bodyShape !== 'doorway') return null
  if (cell.y !== 0) return 'door_ground_only'
  const doorColumns = getAstraBuilderDoorwayColumns(cell, edit.rotation, plot)
  if (doorColumns.length !== 2) return 'door_needs_two_columns'
  for (const column of doorColumns) {
    for (let y = 0; y <= 2 && y < plot.height; y += 1) {
      const reservedCell = { x: column.x, y, z: column.z }
      if (reservedCell.x === cell.x && reservedCell.y === cell.y && reservedCell.z === cell.z) continue
      const reservedValue = cells[getAstraBuilderCellIndex(reservedCell, plot)] || 0
      const reservedBlock = decodeAstraBuilderCell(reservedValue)
      if (reservedBlock.occupied && getAstraBuilderPartForRecipe(reservedBlock.recipeId)?.bodyShape !== 'floor') return 'doorway_obstructed'
    }
  }
  return null
}

export function applyAstraBuilderPatch(cells, patch, direction = 'redo') {
  if (!isAstraBuilderGrid(cells) || !patch || patch.index < 0 || patch.index >= cells.length) return cells
  const nextCells = cells.slice()
  nextCells[patch.index] = direction === 'undo' ? patch.before : patch.after
  return nextCells
}

export function getAstraBuilderInstances(cells, plot = ASTRA_BUILDER_POC_PLOT) {
  const instancesByType = new Map(ASTRA_BUILDER_RECIPES.map((recipe) => [recipe.id, []]))
  const doorwayColumns = getAstraBuilderDoorwayColumnKeys(cells, plot)
  for (let index = 0; index < cells.length; index += 1) {
    const decoded = decodeAstraBuilderCell(cells[index])
    if (!decoded.occupied || !instancesByType.has(decoded.recipeId)) continue
    const cell = getAstraBuilderCellFromIndex(index, plot)
    if (!cell) continue
    if (decoded.foundationUnderlay) {
      instancesByType.get(decoded.underlayRecipeId)?.push({
        ...cell,
        recipeId: decoded.underlayRecipeId,
        type: getAstraBuilderRecipe(decoded.underlayRecipeId)?.legacyBlockType || 2,
        rotation: decoded.underlayRotation,
        index,
        underlay: true,
      })
    }
    const decodedBodyShape = getAstraBuilderPartForRecipe(decoded.recipeId)?.bodyShape
    const hiddenByDoorway = decodedBodyShape !== 'floor'
      && decodedBodyShape !== 'doorway'
      && cell.y <= 2
      && doorwayColumns.has(`${cell.x}:${cell.z}`)
    if (hiddenByDoorway) continue
    instancesByType.get(decoded.recipeId).push({
      ...cell,
      recipeId: decoded.recipeId,
      type: decoded.blockType,
      rotation: decoded.rotation,
      index,
    })
  }
  return instancesByType
}

export function getAstraBuilderWorldPosition(cell, plot = ASTRA_BUILDER_POC_PLOT) {
  const halfWidth = plot.width * plot.cellSize * 0.5
  const halfDepth = plot.depth * plot.cellSize * 0.5
  return [
    -halfWidth + (cell.x + 0.5) * plot.cellSize,
    (cell.y + 0.5) * plot.cellSize,
    -halfDepth + (cell.z + 0.5) * plot.cellSize,
  ]
}

export function getAstraBuilderCellFromWorldPoint(
  point,
  layer,
  plot = ASTRA_BUILDER_POC_PLOT,
) {
  if (!point) return null
  const halfWidth = plot.width * plot.cellSize * 0.5
  const halfDepth = plot.depth * plot.cellSize * 0.5
  const x = Math.floor((point.x - plot.center[0] + halfWidth) / plot.cellSize)
  const z = Math.floor((point.z - plot.center[1] + halfDepth) / plot.cellSize)
  const cell = { x, y: Number(layer), z }
  return isAstraBuilderCellInBounds(cell, plot) ? cell : null
}

export function getAstraBuilderLayerEditTarget({
  point,
  activeLayer,
  clickedCell = null,
  tool = 'place',
  plot = ASTRA_BUILDER_POC_PLOT,
}) {
  const layer = Number(activeLayer)
  // Deletion and rotation always address the concrete object that received the
  // click. The caller can then enforce the selected-layer filter explicitly
  // instead of silently redirecting the edit to an empty cell below/above it.
  if (tool !== 'place' && clickedCell) return clickedCell
  return getAstraBuilderCellFromWorldPoint(point, layer, plot)
}

export function getAstraBuilderWalkSurfaceOffset(
  x,
  z,
  cells,
  plot = ASTRA_BUILDER_POC_PLOT,
) {
  const cell = getAstraBuilderCellFromWorldPoint({ x, z }, 0, plot)
  if (!cell) return null
  const index = getAstraBuilderCellIndex(cell, plot)
  const decoded = decodeAstraBuilderCell(cells?.[index] || 0)
  return getAstraBuilderPartForRecipe(decoded.recipeId)?.bodyShape === 'floor'
    ? plot.cellSize * .24
    : ASTRA_BUILDER_PLATFORM_SURFACE_OFFSET
}

export function getAstraBuilderStairAscentVector(rotation) {
  const normRot = ((rotation % 4) + 4) % 4
  switch (normRot) {
    case 0: return { dirX: 0, dirZ: 1 }
    case 1: return { dirX: 1, dirZ: 0 }
    case 2: return { dirX: 0, dirZ: -1 }
    case 3: return { dirX: -1, dirZ: 0 }
    default: return { dirX: 0, dirZ: -1 }
  }
}

export function getAstraBuilderTopFaceTarget(
  cell,
  faceNormal,
  plot = ASTRA_BUILDER_POC_PLOT,
  placingBlockType = null,
) {
  if (!isAstraBuilderCellInBounds(cell, plot) || !faceNormal) return null
  const rotation = (((Number(cell.rotation) || 0) % 4) + 4) % 4
  const angle = rotation * Math.PI * 0.5
  const localX = Number(faceNormal.x || 0)
  const localY = Number(faceNormal.y || 0)
  const localZ = Number(faceNormal.z || 0)
  const worldNormal = {
    x: localX * Math.cos(angle) + localZ * Math.sin(angle),
    y: localY,
    z: -localX * Math.sin(angle) + localZ * Math.cos(angle),
  }
  const dominantAxis = [
    ['x', Math.abs(worldNormal.x)],
    ['y', Math.abs(worldNormal.y)],
    ['z', Math.abs(worldNormal.z)],
  ].sort((first, second) => second[1] - first[1])[0]
  if (!dominantAxis || dominantAxis[1] < 0.6) return null
  const axis = dominantAxis[0]
  const direction = Math.sign(worldNormal[axis])
  if (!direction) return null

  const isTopFace = axis === 'y' && direction > 0
  if (cell.type === 7 && isTopFace) {
    const doorTopTarget = { x: cell.x, y: cell.y + ASTRA_BUILDER_DOOR_HEIGHT_CELLS, z: cell.z }
    return isAstraBuilderCellInBounds(doorTopTarget, plot) ? doorTopTarget : null
  }
  if (cell.type === 5 && isTopFace && (placingBlockType === 5 || placingBlockType === null)) {
    const { dirX, dirZ } = getAstraBuilderStairAscentVector(cell.rotation || 0)
    const stairTarget = { x: cell.x + dirX, y: cell.y + 1, z: cell.z + dirZ }
    if (isAstraBuilderCellInBounds(stairTarget, plot)) {
      return stairTarget
    }
  }
  const target = { ...cell }
  delete target.type
  delete target.rotation
  delete target.index
  target[axis] += direction
  return isAstraBuilderCellInBounds(target, plot) ? target : null
}
