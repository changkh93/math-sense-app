import {
  ASTRA_BUILDER_PLATFORM_SURFACE_OFFSET,
  ASTRA_BUILDER_POC_PLOT,
  decodeAstraBuilderCell,
  getAstraBuilderCellFromIndex,
  getAstraBuilderCellFromWorldPoint,
  getAstraBuilderCellIndex,
  getAstraBuilderDoorwayColumnKeys,
  getAstraBuilderStairAscentVector,
  getAstraBuilderWorldPosition,
  isAstraBuilderGrid,
} from './astraBuilderModel.js'
import { getAstraBuilderBlockTraits } from './astraBuilderBlockCatalog.js'

export const ASTRA_BUILDER_DEFAULT_CHARACTER_SCALE = 0.25
export const ASTRA_BUILDER_MIN_CHARACTER_SCALE = 0.14
export const ASTRA_BUILDER_MAX_CHARACTER_SCALE = 0.7
export const ASTRA_BUILDER_BASE_CHARACTER_RADIUS = 0.125
export const ASTRA_BUILDER_CHARACTER_MODEL_HEIGHT = 2.55

// The rendered stair mesh is low at local -Z and high at local +Z. Keep the
// rotated world direction here so rendering and character support use the same
// quarter-turn convention.
export function getAstraBuilderStairDirection(rotation = 0) {
  const { dirX, dirZ } = getAstraBuilderStairAscentVector(rotation)
  return { x: dirX, z: dirZ }
}

const EPSILON = 0.002
const GROUND_FLOOR_ACCESS_STEP_CELLS = 0.55

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

function getSupportStepAllowance(traits, cell, dimensions, plot) {
  if (traits.bodyShape === 'stair') return plot.cellSize * 0.72
  // The plot is lifted above the surrounding terrain and a foundation has its
  // own thickness on top of that. Treating both as an ordinary step makes the
  // exposed side of every ground-floor foundation behave like a wall.
  if (traits.supportSurface === 'floor' && cell.y === 0) {
    return Math.max(dimensions.maxStepUp, plot.cellSize * GROUND_FLOOR_ACCESS_STEP_CELLS)
  }
  return dimensions.maxStepUp
}

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

function circleIntersectsCell(x, z, radius, cell, plot) {
  const halfWidth = plot.width * plot.cellSize * 0.5
  const halfDepth = plot.depth * plot.cellSize * 0.5
  const minX = plot.center[0] - halfWidth + cell.x * plot.cellSize
  const minZ = plot.center[1] - halfDepth + cell.z * plot.cellSize
  const nearestX = clamp(x, minX, minX + plot.cellSize)
  const nearestZ = clamp(z, minZ, minZ + plot.cellSize)
  const dx = x - nearestX
  const dz = z - nearestZ
  return dx * dx + dz * dz < radius * radius + EPSILON
}

export function getAstraBuilderStairProgress(x, z, cell, rotation, plot = ASTRA_BUILDER_POC_PLOT) {
  const fraction = getCellFractions(x, z, cell, plot)
  const direction = getAstraBuilderStairDirection(rotation)
  const centeredX = fraction.x - 0.5
  const centeredZ = fraction.z - 0.5
  return clamp(0.5 + centeredX * direction.x + centeredZ * direction.z, 0, 1)
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
  if (traits.supportSurface === 'top') return (cell.y + (traits.heightCells || 1)) * plot.cellSize
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
  if (!columnCell || !isAstraBuilderGrid(cells)) return terrainY

  const dimensions = getAstraBuilderCharacterDimensions(characterScale)
  const currentOffset = Number.isFinite(currentFootY) ? currentFootY - plotBaseY : null
  const candidates = [{
    offset: ASTRA_BUILDER_PLATFORM_SURFACE_OFFSET,
    allowance: dimensions.maxStepUp,
  }]

  // A character is supported by its footprint, not only by the exact centre
  // point. This lets the upper stair remain supportive until the foot overlaps
  // the next floor and prevents the floor's side collider from blocking the
  // stair-to-floor transition.
  const halfWidth = plot.width * plot.cellSize * 0.5
  const halfDepth = plot.depth * plot.cellSize * 0.5
  const plotMinX = plot.center[0] - halfWidth
  const plotMinZ = plot.center[1] - halfDepth
  const radius = dimensions.radius
  const minCellX = clamp(Math.floor((x - radius - plotMinX) / plot.cellSize), 0, plot.width - 1)
  const maxCellX = clamp(Math.floor((x + radius - plotMinX) / plot.cellSize), 0, plot.width - 1)
  const minCellZ = clamp(Math.floor((z - radius - plotMinZ) / plot.cellSize), 0, plot.depth - 1)
  const maxCellZ = clamp(Math.floor((z + radius - plotMinZ) / plot.cellSize), 0, plot.depth - 1)

  for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
    for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ += 1) {
      const footprintCell = { x: cellX, y: 0, z: cellZ }
      if (!circleIntersectsCell(x, z, radius, footprintCell, plot)) continue
      for (let y = 0; y < plot.height; y += 1) {
        const cell = { x: cellX, y, z: cellZ }
        const decoded = decodeAstraBuilderCell(cells[getAstraBuilderCellIndex(cell, plot)] || 0)
        if (!decoded.occupied) continue
        if (decoded.foundationUnderlay) {
          const foundationTraits = getAstraBuilderBlockTraits(decoded.underlayRecipeId || 2)
          const foundationOffset = (cell.y + 0.24) * plot.cellSize
          const foundationAllowance = getSupportStepAllowance(
            foundationTraits,
            cell,
            dimensions,
            plot,
          )
          if (
            currentOffset === null
            || foundationOffset <= currentOffset + foundationAllowance + EPSILON
          ) {
            candidates.push({ offset: foundationOffset, allowance: foundationAllowance })
          }
        }
        let supportX = x
        let supportZ = z
        const traits = getAstraBuilderBlockTraits(decoded.recipeId || decoded.blockType)
        if (traits.bodyShape === 'stair') {
          const direction = getAstraBuilderStairDirection(decoded.rotation)
          supportX += direction.x * radius
          supportZ += direction.z * radius
        }
        const offset = getAstraBuilderSupportOffsetAtCell(
          supportX,
          supportZ,
          cell,
          decoded.recipeId || decoded.blockType,
          decoded.rotation,
          plot,
        )
        if (offset === null) continue
        const allowance = getSupportStepAllowance(traits, cell, dimensions, plot)
        if (currentOffset !== null && offset > currentOffset + allowance + EPSILON) continue
        candidates.push({ offset, allowance })
      }
    }
  }

  let selectedOffset
  if (currentOffset === null) {
    selectedOffset = Math.max(...candidates.map(({ offset }) => offset))
  } else {
    const belowOrReachable = candidates.filter(({ offset, allowance }) => (
      offset <= currentOffset + allowance + EPSILON
    ))
    selectedOffset = belowOrReachable.length
      ? Math.max(...belowOrReachable.map(({ offset }) => offset))
      : ASTRA_BUILDER_PLATFORM_SURFACE_OFFSET
  }
  return Math.max(terrainY, plotBaseY + selectedOffset)
}

function createBody(cell, decoded, plotBaseY, plot) {
  const traits = getAstraBuilderBlockTraits(decoded.recipeId || decoded.blockType)
  if (traits.bodyShape === 'none' || traits.bodyShape === 'doorway') return null
  const local = getAstraBuilderWorldPosition(cell, plot)
  const centerX = plot.center[0] + local[0]
  const centerZ = plot.center[1] + local[2]
  const cellBottom = plotBaseY + cell.y * plot.cellSize
  let halfX = plot.cellSize * 0.5
  let halfZ = plot.cellSize * 0.5
  let minY = cellBottom
  let maxY = cellBottom + plot.cellSize * (traits.heightCells || 1)
  if (traits.bodyShape === 'floor') {
    minY = cellBottom + plot.cellSize * 0.02
    maxY = cellBottom + plot.cellSize * 0.24
  } else if (traits.bodyShape === 'pillar') {
    halfX = plot.cellSize * 0.21
    halfZ = plot.cellSize * 0.21
  } else if (traits.bodyShape === 'bar') {
    halfX = plot.cellSize * (decoded.rotation % 2 ? 0.44 : 0.12)
    halfZ = plot.cellSize * (decoded.rotation % 2 ? 0.12 : 0.44)
    minY = cellBottom + plot.cellSize * 0.4
    maxY = cellBottom + plot.cellSize * 0.6
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
    plot,
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
  if (!isAstraBuilderGrid(cells)) return []
  const doorwayColumns = getAstraBuilderDoorwayColumnKeys(cells, plot)
  const bodies = []
  for (let index = 0; index < cells.length; index += 1) {
    const decoded = decodeAstraBuilderCell(cells[index])
    if (!decoded.occupied) continue
    const cell = getAstraBuilderCellFromIndex(index, plot)
    if (!cell) continue
    if (decoded.foundationUnderlay) {
      const foundationBody = createBody(
        cell,
        { recipeId: decoded.underlayRecipeId || 2, blockType: 2, rotation: decoded.underlayRotation || 0 },
        plotBaseY,
        plot,
      )
      if (foundationBody) {
        foundationBody.id = `${foundationBody.id}:foundation`
        bodies.push(foundationBody)
      }
    }
    if (
      getAstraBuilderBlockTraits(decoded.recipeId).bodyShape !== 'floor'
      && getAstraBuilderBlockTraits(decoded.recipeId).bodyShape !== 'doorway'
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
      const bodyPlot = body.plot || plot
      const surfaceY = body.minY + getAstraBuilderStairProgress(
        x,
        z,
        body.cell,
        body.rotation,
        bodyPlot,
      ) * bodyPlot.cellSize
      const stairStepAllowance = Math.max(dimensions.maxStepUp, bodyPlot.cellSize * 0.72)
      return footY + stairStepAllowance + EPSILON < surfaceY && topY > body.minY + EPSILON
    }
    if (
      body.supportSurface !== 'none'
      && footY <= body.maxY + EPSILON
      && footY + getSupportStepAllowance(
        { bodyShape: body.bodyShape, supportSurface: body.supportSurface },
        body.cell,
        dimensions,
        body.plot || plot,
      ) + EPSILON >= body.maxY
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
