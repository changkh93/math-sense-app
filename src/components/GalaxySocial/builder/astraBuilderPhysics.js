import {
  ASTRA_BUILDER_PLATFORM_SURFACE_OFFSET,
  ASTRA_BUILDER_POC_PLOT,
  decodeAstraBuilderCell,
  getAstraBuilderCellFromIndex,
  getAstraBuilderCellFromWorldPoint,
  getAstraBuilderCellIndex,
  getAstraBuilderDoorwayColumnKeys,
  getAstraBuilderWorldPosition,
} from './astraBuilderModel.js'
import { getAstraBuilderBlockTraits } from './astraBuilderBlockCatalog.js'

export const ASTRA_BUILDER_DEFAULT_CHARACTER_SCALE = 0.28
export const ASTRA_BUILDER_MIN_CHARACTER_SCALE = 0.14
export const ASTRA_BUILDER_MAX_CHARACTER_SCALE = 0.7
export const ASTRA_BUILDER_BASE_CHARACTER_RADIUS = 0.14
export const ASTRA_BUILDER_CHARACTER_MODEL_HEIGHT = 2.55

const EPSILON = 0.002

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export function getAstraBuilderCharacterDimensions(
  scale = ASTRA_BUILDER_DEFAULT_CHARACTER_SCALE,
) {
  const normalizedScale = clamp(
    Number(scale) || ASTRA_BUILDER_DEFAULT_CHARACTER_SCALE,
    ASTRA_BUILDER_MIN_CHARACTER_SCALE,
    ASTRA_BUILDER_MAX_CHARACTER_SCALE,
  )
  const ratio = normalizedScale / ASTRA_BUILDER_DEFAULT_CHARACTER_SCALE
  return {
    scale: normalizedScale,
    ratio,
    radius: ASTRA_BUILDER_BASE_CHARACTER_RADIUS * ratio,
    height: ASTRA_BUILDER_CHARACTER_MODEL_HEIGHT * normalizedScale,
    eyeHeight: 1.96 * normalizedScale,
    maxStepUp: clamp(ASTRA_BUILDER_POC_PLOT.cellSize * 0.3 * Math.sqrt(ratio), 0.055, 0.15),
  }
}

function getCellFractions(x, z, cell, plot) {
  const halfWidth = plot.width * plot.cellSize * 0.5
  const halfDepth = plot.depth * plot.cellSize * 0.5
  const minX = plot.center[0] - halfWidth + cell.x * plot.cellSize
  const minZ = plot.center[1] - halfDepth + cell.z * plot.cellSize
  return {
    x: clamp((x - minX) / plot.cellSize, 0, 1),
    z: clamp((z - minZ) / plot.cellSize, 0, 1),
  }
}

export function getAstraBuilderStairProgress(x, z, cell, rotation, plot = ASTRA_BUILDER_POC_PLOT) {
  const fraction = getCellFractions(x, z, cell, plot)
  switch (((Number(rotation) % 4) + 4) % 4) {
    case 0: return 1 - fraction.z
    case 1: return fraction.x
    case 2: return fraction.z
    case 3: return 1 - fraction.x
    default: return 0
  }
}

export function getAstraBuilderSupportOffsetAtCell(
  x,
  z,
  cell,
  blockType,
  rotation = 0,
  plot = ASTRA_BUILDER_POC_PLOT,
) {
  const traits = getAstraBuilderBlockTraits(blockType)
  if (traits.supportSurface === 'floor') return (cell.y + 0.24) * plot.cellSize
  if (traits.supportSurface === 'top') return (cell.y + 1) * plot.cellSize
  if (traits.supportSurface === 'stair') {
    return (cell.y + getAstraBuilderStairProgress(x, z, cell, rotation, plot)) * plot.cellSize
  }
  return null
}

export function getAstraBuilderWalkSurfaceHeight({
  x,
  z,
  currentFootY = null,
  cells,
  plotBaseY,
  terrainY,
  characterScale = ASTRA_BUILDER_DEFAULT_CHARACTER_SCALE,
  plot = ASTRA_BUILDER_POC_PLOT,
}) {
  const columnCell = getAstraBuilderCellFromWorldPoint({ x, z }, 0, plot)
  if (!columnCell || !(cells instanceof Uint16Array)) return terrainY

  const dimensions = getAstraBuilderCharacterDimensions(characterScale)
  const currentOffset = Number.isFinite(currentFootY) ? currentFootY - plotBaseY : null
  const candidates = [ASTRA_BUILDER_PLATFORM_SURFACE_OFFSET]

  for (let y = 0; y < plot.height; y += 1) {
    const cell = { x: columnCell.x, y, z: columnCell.z }
    const decoded = decodeAstraBuilderCell(cells[getAstraBuilderCellIndex(cell, plot)] || 0)
    if (!decoded.occupied) continue
    const offset = getAstraBuilderSupportOffsetAtCell(x, z, cell, decoded.blockType, decoded.rotation, plot)
    if (offset === null) continue
    const stairAllowance = decoded.blockType === 5 ? plot.cellSize * 0.72 : dimensions.maxStepUp
    if (currentOffset !== null && offset > currentOffset + stairAllowance + EPSILON) continue
    candidates.push(offset)
  }

  let selectedOffset
  if (currentOffset === null) {
    selectedOffset = Math.max(...candidates)
  } else {
    const belowOrReachable = candidates.filter((offset) => offset <= currentOffset + plot.cellSize * 0.72 + EPSILON)
    selectedOffset = belowOrReachable.length
      ? Math.max(...belowOrReachable)
      : ASTRA_BUILDER_PLATFORM_SURFACE_OFFSET
  }
  return Math.max(terrainY, plotBaseY + selectedOffset)
}

function createBody(cell, decoded, plotBaseY, plot) {
  const traits = getAstraBuilderBlockTraits(decoded.blockType)
  if (traits.bodyShape === 'none' || traits.bodyShape === 'doorway') return null
  const local = getAstraBuilderWorldPosition(cell, plot)
  const centerX = plot.center[0] + local[0]
  const centerZ = plot.center[1] + local[2]
  const cellBottom = plotBaseY + cell.y * plot.cellSize
  let halfX = plot.cellSize * 0.5
  let halfZ = plot.cellSize * 0.5
  let minY = cellBottom
  let maxY = cellBottom + plot.cellSize
  if (traits.bodyShape === 'floor') {
    minY = cellBottom + plot.cellSize * 0.02
    maxY = cellBottom + plot.cellSize * 0.24
  } else if (traits.bodyShape === 'pillar') {
    halfX = plot.cellSize * 0.21
    halfZ = plot.cellSize * 0.21
  }
  return {
    id: `astra-builder-block-${cell.x}:${cell.y}:${cell.z}`,
    kind: 'astra-builder-block',
    cell,
    blockType: decoded.blockType,
    rotation: decoded.rotation,
    bodyShape: traits.bodyShape,
    supportSurface: traits.supportSurface,
    acousticMaterial: traits.acousticMaterial,
    centerX,
    centerZ,
    halfX,
    halfZ,
    minY,
    maxY,
    position: [centerX, minY, centerZ],
  }
}

export function createAstraBuilderCollisionBodies(
  cells,
  plotBaseY,
  plot = ASTRA_BUILDER_POC_PLOT,
) {
  if (!(cells instanceof Uint16Array)) return []
  const doorwayColumns = getAstraBuilderDoorwayColumnKeys(cells, plot)
  const bodies = []
  for (let index = 0; index < cells.length; index += 1) {
    const decoded = decodeAstraBuilderCell(cells[index])
    if (!decoded.occupied) continue
    const cell = getAstraBuilderCellFromIndex(index, plot)
    if (!cell) continue
    if (
      decoded.blockType !== 2
      && decoded.blockType !== 7
      && cell.y <= 2
      && doorwayColumns.has(`${cell.x}:${cell.z}`)
    ) continue
    const body = createBody(cell, decoded, plotBaseY, plot)
    if (body) bodies.push(body)
  }
  return bodies
}

function circleIntersectsAabb(x, z, radius, body) {
  const nearestX = clamp(x, body.centerX - body.halfX, body.centerX + body.halfX)
  const nearestZ = clamp(z, body.centerZ - body.halfZ, body.centerZ + body.halfZ)
  const dx = x - nearestX
  const dz = z - nearestZ
  return dx * dx + dz * dz < radius * radius - EPSILON
}

export function findAstraBuilderBodyCollision(
  bodies,
  { x, z, footY, scale = ASTRA_BUILDER_DEFAULT_CHARACTER_SCALE },
  plot = ASTRA_BUILDER_POC_PLOT,
) {
  const dimensions = getAstraBuilderCharacterDimensions(scale)
  const topY = footY + dimensions.height
  return bodies.find((body) => {
    if (!circleIntersectsAabb(x, z, dimensions.radius, body)) return false
    if (body.bodyShape === 'stair') {
      const surfaceY = body.minY + getAstraBuilderStairProgress(
        x,
        z,
        body.cell,
        body.rotation,
        plot,
      ) * plot.cellSize
      const stairStepAllowance = Math.max(dimensions.maxStepUp, plot.cellSize * 0.72)
      return footY + stairStepAllowance + EPSILON < surfaceY && topY > body.minY + EPSILON
    }
    if (
      body.supportSurface !== 'none'
      && footY <= body.maxY + EPSILON
      && footY + dimensions.maxStepUp + EPSILON >= body.maxY
    ) return false
    return topY > body.minY + EPSILON && footY < body.maxY - EPSILON
  }) || null
}

export function canAstraBuilderCharacterOccupy(bodies, position, plot = ASTRA_BUILDER_POC_PLOT) {
  return !findAstraBuilderBodyCollision(bodies, position, plot)
}

export function doesAstraBuilderPlacementOverlapCharacter({
  cell,
  blockType,
  rotation = 0,
  playerPosition,
  characterScale = ASTRA_BUILDER_DEFAULT_CHARACTER_SCALE,
  plotBaseY,
  plot = ASTRA_BUILDER_POC_PLOT,
}) {
  if (!cell || !playerPosition) return false
  const body = createBody(cell, { blockType, rotation }, plotBaseY, plot)
  if (!body) return false
  return Boolean(findAstraBuilderBodyCollision([body], {
    x: Number(playerPosition.x),
    z: Number(playerPosition.z),
    footY: Number(playerPosition.y),
    scale: characterScale,
  }, plot))
}
