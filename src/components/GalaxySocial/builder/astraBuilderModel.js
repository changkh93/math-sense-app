export const ASTRA_BUILDER_POC_PLOT = Object.freeze({
  id: 'habitat-b01',
  center: Object.freeze([-7.5, -4.5]),
  width: 12,
  depth: 12,
  height: 10,
  cellSize: 0.34,
  maxBlocks: 360,
})

export const ASTRA_BUILDER_HISTORY_LIMIT = 30
export const ASTRA_BUILDER_BASE_LIFT = .08
export const ASTRA_BUILDER_PLATFORM_SURFACE_OFFSET = .008

export const ASTRA_BUILDER_BLOCKS = Object.freeze([
  Object.freeze({ id: 1, key: 'lumen_wall', label: '루멘 벽', color: '#dbe9e8' }),
  Object.freeze({ id: 2, key: 'foundation_floor', label: '기초 바닥', color: '#607989' }),
  Object.freeze({ id: 3, key: 'nebula_glass', label: '성운 유리', color: '#72dff1' }),
  Object.freeze({ id: 4, key: 'star_light', label: '별빛 조명', color: '#ffe58a' }),
  Object.freeze({ id: 5, key: 'step_block', label: '기본 계단', color: '#9bb6b7' }),
  Object.freeze({ id: 6, key: 'support_pillar', label: '지지 기둥', color: '#476171' }),
  Object.freeze({ id: 7, key: 'lumen_wood_door', label: '나무 문', color: '#a86f42' }),
])

export const ASTRA_BUILDER_BLOCK_BY_ID = new Map(
  ASTRA_BUILDER_BLOCKS.map((block) => [block.id, block]),
)

const TYPE_MASK = 0xff
const ROTATION_SHIFT = 8
const ROTATION_MASK = 0x03

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

export function encodeAstraBuilderCell(blockType, rotation = 0) {
  const normalizedType = Number(blockType) & TYPE_MASK
  if (!ASTRA_BUILDER_BLOCK_BY_ID.has(normalizedType)) return 0
  const normalizedRotation = Number(rotation) & ROTATION_MASK
  return normalizedType | (normalizedRotation << ROTATION_SHIFT)
}

export function decodeAstraBuilderCell(value) {
  const normalized = Number(value) || 0
  return {
    blockType: normalized & TYPE_MASK,
    rotation: (normalized >> ROTATION_SHIFT) & ROTATION_MASK,
    occupied: (normalized & TYPE_MASK) !== 0,
  }
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
    if ((cells[index] & TYPE_MASK) !== 0) count += 1
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
    if (decoded.occupied) return null
    after = encodeAstraBuilderCell(edit.blockType, edit.rotation)
  } else if (edit.tool === 'delete') {
    if (!decoded.occupied) return null
    after = 0
  } else if (edit.tool === 'rotate') {
    if (!decoded.occupied) return null
    after = encodeAstraBuilderCell(decoded.blockType, decoded.rotation + 1)
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
    case 0: return { dirX: 0, dirZ: -1 }
    case 1: return { dirX: 1, dirZ: 0 }
    case 2: return { dirX: 0, dirZ: 1 }
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
  if (!isAstraBuilderCellInBounds(cell, plot) || Number(faceNormal?.y || 0) < 0.6) return null
  if (cell.type === 7) {
    const doorTopTarget = { x: cell.x, y: cell.y + 3, z: cell.z }
    return isAstraBuilderCellInBounds(doorTopTarget, plot) ? doorTopTarget : null
  }
  if (cell.type === 5 && (placingBlockType === 5 || placingBlockType === null)) {
    const { dirX, dirZ } = getAstraBuilderStairAscentVector(cell.rotation || 0)
    const stairTarget = { x: cell.x + dirX, y: cell.y + 1, z: cell.z + dirZ }
    if (isAstraBuilderCellInBounds(stairTarget, plot)) {
      return stairTarget
    }
  }
  const target = { x: cell.x, y: cell.y + 1, z: cell.z }
  return isAstraBuilderCellInBounds(target, plot) ? target : null
}
