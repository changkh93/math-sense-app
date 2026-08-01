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
  const blockType = Number(cell.type ?? cell.blockType ?? 0)
  const heightCells = blockType === 7 || blockType === ASTRA_BUILDER_WALL_PANEL_TYPE
    ? ASTRA_BUILDER_STORY_HEIGHT_CELLS
    : 1
  const layer = Number(activeLayer)
  return layer >= Number(cell.y) && layer < Number(cell.y) + heightCells
}

export function normalizeAstraBuilderPlacementCell(
  cell,
  blockType,
  plot = ASTRA_BUILDER_POC_PLOT,
) {
  if (!cell) return null
  if (Number(blockType) !== ASTRA_BUILDER_WALL_PANEL_TYPE) return { ...cell }
  const baseY = Math.floor(Number(cell.y) / ASTRA_BUILDER_STORY_HEIGHT_CELLS)
    * ASTRA_BUILDER_STORY_HEIGHT_CELLS
  const normalized = { ...cell, y: baseY }
  return baseY + ASTRA_BUILDER_STORY_HEIGHT_CELLS <= plot.height ? normalized : null
}

const TYPE_MASK = 0xff
const ROTATION_SHIFT = 8
const ROTATION_MASK = 0x03
const FOUNDATION_UNDERLAY_MASK = 1 << 10

export function getAstraBuilderCellCount(plot = ASTRA_BUILDER_POC_PLOT) {
  return plot.width * plot.depth * plot.height
}

export function createEmptyAstraBuilderGrid(plot = ASTRA_BUILDER_POC_PLOT) {
  return new Uint16Array(getAstraBuilderCellCount(plot))
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

export function encodeAstraBuilderCell(blockType, rotation = 0, foundationUnderlay = false) {
  const normalizedType = Number(blockType) & TYPE_MASK
  if (!ASTRA_BUILDER_BLOCK_BY_ID.has(normalizedType)) return 0
  const normalizedRotation = Number(rotation) & ROTATION_MASK
  const underlay = foundationUnderlay && normalizedType !== 2
    ? FOUNDATION_UNDERLAY_MASK
    : 0
  return normalizedType | (normalizedRotation << ROTATION_SHIFT) | underlay
}

export function decodeAstraBuilderCell(value) {
  const normalized = Number(value) || 0
  return {
    blockType: normalized & TYPE_MASK,
    rotation: (normalized >> ROTATION_SHIFT) & ROTATION_MASK,
    occupied: (normalized & TYPE_MASK) !== 0,
    foundationUnderlay: (normalized & FOUNDATION_UNDERLAY_MASK) !== 0,
  }
}

function countAstraBuilderCellPieces(value) {
  const decoded = decodeAstraBuilderCell(value)
  return Number(decoded.occupied) + Number(decoded.foundationUnderlay)
}

export function isAstraBuilderWalkBlockingCell(value, cell) {
  const decoded = decodeAstraBuilderCell(value)
  if (!decoded.occupied || !cell || cell.y > 1) return false
  // 바닥·계단은 걸을 수 있고, 문은 해당 열 전체를 출입 통로로 사용한다.
  return decoded.blockType !== 2
    && decoded.blockType !== 5
    && decoded.blockType !== 7
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
  if (!(cells instanceof Uint16Array)) return new Set()
  const doorwayColumns = new Set()
  for (let index = 0; index < cells.length; index += 1) {
    const decoded = decodeAstraBuilderCell(cells[index])
    if (!decoded.occupied || decoded.blockType !== 7) continue
    const cell = getAstraBuilderCellFromIndex(index, plot)
    if (cell?.y !== 0) continue
    getAstraBuilderDoorwayColumns(cell, decoded.rotation, plot).forEach((column) => {
      doorwayColumns.add(`${column.x}:${column.z}`)
    })
  }
  return doorwayColumns
}

export function getAstraBuilderWalkBlockingCells(cells, plot = ASTRA_BUILDER_POC_PLOT) {
  if (!(cells instanceof Uint16Array)) return []
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

export function applyAstraBuilderEdit(cells, edit, plot = ASTRA_BUILDER_POC_PLOT) {
  const index = getAstraBuilderCellIndex(edit?.cell, plot)
  if (index < 0 || !(cells instanceof Uint16Array)) return null

  const before = cells[index]
  const decoded = decodeAstraBuilderCell(before)
  let after = before

  if (edit.tool === 'place') {
    if (getAstraBuilderPlacementIssue(cells, edit, plot)) return null
    const nextBlockType = Number(edit.blockType)
    if (decoded.blockType === 2 && nextBlockType !== 2) {
      // Keep the thin foundation as a structural underlay and place the wall,
      // panel, door, etc. in the same course so it starts flush at floor level.
      after = encodeAstraBuilderCell(nextBlockType, edit.rotation, true)
    } else if (
      nextBlockType === 2
      && decoded.occupied
      && decoded.blockType !== 2
      && !decoded.foundationUnderlay
    ) {
      after = encodeAstraBuilderCell(decoded.blockType, decoded.rotation, true)
    } else {
      after = encodeAstraBuilderCell(nextBlockType, edit.rotation)
    }
  } else if (edit.tool === 'delete') {
    if (!decoded.occupied) return null
    after = decoded.foundationUnderlay ? encodeAstraBuilderCell(2) : 0
  } else if (edit.tool === 'rotate') {
    if (!decoded.occupied) return null
    after = encodeAstraBuilderCell(
      decoded.blockType,
      decoded.rotation + 1,
      decoded.foundationUnderlay,
    )
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

export function getAstraBuilderWallPanelAnchorAtCell(
  cells,
  cell,
  plot = ASTRA_BUILDER_POC_PLOT,
) {
  if (!(cells instanceof Uint16Array) || !isAstraBuilderCellInBounds(cell, plot)) return null
  for (let offset = 0; offset < ASTRA_BUILDER_STORY_HEIGHT_CELLS; offset += 1) {
    const anchor = { x: cell.x, y: cell.y - offset, z: cell.z }
    const index = getAstraBuilderCellIndex(anchor, plot)
    if (index < 0) continue
    const decoded = decodeAstraBuilderCell(cells[index])
    if (decoded.blockType === ASTRA_BUILDER_WALL_PANEL_TYPE) return anchor
  }
  return null
}

export function getAstraBuilderPlacementIssue(cells, edit, plot = ASTRA_BUILDER_POC_PLOT) {
  if (!(cells instanceof Uint16Array) || edit?.tool !== 'place') return null
  const cell = edit.cell
  const index = getAstraBuilderCellIndex(cell, plot)
  if (index < 0) return 'out_of_bounds'
  if (!ASTRA_BUILDER_BLOCK_BY_ID.has(Number(edit.blockType))) return 'invalid_block'
  const candidateBlockType = Number(edit.blockType)
  const existing = decodeAstraBuilderCell(cells[index])
  const panelAnchor = getAstraBuilderWallPanelAnchorAtCell(cells, cell, plot)
  const isExactPanelAnchor = panelAnchor
    && panelAnchor.x === cell.x
    && panelAnchor.y === cell.y
    && panelAnchor.z === cell.z
  const canShareWithFoundation = (
    existing.blockType === 2 && candidateBlockType !== 2
  ) || (
    candidateBlockType === 2
    && existing.occupied
    && existing.blockType !== 2
    && !existing.foundationUnderlay
    && (!panelAnchor || isExactPanelAnchor)
  )
  if ((existing.occupied || panelAnchor) && !canShareWithFoundation) return 'occupied'

  if (candidateBlockType === ASTRA_BUILDER_WALL_PANEL_TYPE) {
    if (cell.y % ASTRA_BUILDER_STORY_HEIGHT_CELLS !== 0) return 'panel_not_story_base'
    for (let offset = 0; offset < ASTRA_BUILDER_STORY_HEIGHT_CELLS; offset += 1) {
      const occupiedCell = { ...cell, y: cell.y + offset }
      const occupiedIndex = getAstraBuilderCellIndex(occupiedCell, plot)
      if (occupiedIndex < 0) return 'panel_out_of_bounds'
      const occupied = decodeAstraBuilderCell(cells[occupiedIndex])
      const canUseFoundationBase = offset === 0 && occupied.blockType === 2
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
    && Number(edit.blockType) !== 2
    && doorwayColumns.has(candidateColumnKey)
  ) return 'doorway_reserved'

  if (Number(edit.blockType) !== 7) return null
  if (cell.y !== 0) return 'door_ground_only'
  const doorColumns = getAstraBuilderDoorwayColumns(cell, edit.rotation, plot)
  if (doorColumns.length !== 2) return 'door_needs_two_columns'
  for (const column of doorColumns) {
    for (let y = 0; y <= 2 && y < plot.height; y += 1) {
      const reservedCell = { x: column.x, y, z: column.z }
      if (reservedCell.x === cell.x && reservedCell.y === cell.y && reservedCell.z === cell.z) continue
      const reservedValue = cells[getAstraBuilderCellIndex(reservedCell, plot)] || 0
      const reservedBlock = decodeAstraBuilderCell(reservedValue)
      if (reservedBlock.occupied && reservedBlock.blockType !== 2) return 'doorway_obstructed'
    }
  }
  return null
}

export function applyAstraBuilderPatch(cells, patch, direction = 'redo') {
  if (!(cells instanceof Uint16Array) || !patch || patch.index < 0 || patch.index >= cells.length) return cells
  const nextCells = cells.slice()
  nextCells[patch.index] = direction === 'undo' ? patch.before : patch.after
  return nextCells
}

export function getAstraBuilderInstances(cells, plot = ASTRA_BUILDER_POC_PLOT) {
  const instancesByType = new Map(ASTRA_BUILDER_BLOCKS.map((block) => [block.id, []]))
  const doorwayColumns = getAstraBuilderDoorwayColumnKeys(cells, plot)
  for (let index = 0; index < cells.length; index += 1) {
    const decoded = decodeAstraBuilderCell(cells[index])
    if (!decoded.occupied || !instancesByType.has(decoded.blockType)) continue
    const cell = getAstraBuilderCellFromIndex(index, plot)
    if (!cell) continue
    if (decoded.foundationUnderlay) {
      instancesByType.get(2).push({
        ...cell,
        type: 2,
        rotation: 0,
        index,
        underlay: true,
      })
    }
    const hiddenByDoorway = decoded.blockType !== 2
      && decoded.blockType !== 7
      && cell.y <= 2
      && doorwayColumns.has(`${cell.x}:${cell.z}`)
    if (hiddenByDoorway) continue
    instancesByType.get(decoded.blockType).push({
      ...cell,
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
  return decoded.blockType === 2
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
    const doorTopTarget = { x: cell.x, y: cell.y + 3, z: cell.z }
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
