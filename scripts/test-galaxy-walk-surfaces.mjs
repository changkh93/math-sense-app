import assert from 'node:assert/strict'
import {
  BRIDGE_DECK_HEIGHT,
  BRIDGE_X,
  LANDING_PAD_SURFACE_LIFT,
  OCEAN_SURFACE_Y,
  RIVER_MOUTH_BLEND_END_X,
  RIVER_MOUTH_END_X,
  RIVER_MOUTH_START_X,
  RIVER_SOURCE_X,
  ROAD_SURFACE_LIFT,
  VILLAGE_SLOTS,
  WORLD_RADIUS,
  EXPANDED_WORLD_RADIUS,
  WORLD_ZONES,
  createEstuaryBankGeometry,
  createIslandSkirtGeometry,
  createRiverGeometry,
  createRiverMouthGeometry,
  createRibbonGeometry,
  generatePathNetwork,
  riverCenterZ,
  riverWidth,
  setTerritoryExpanded,
  setActivePathNetwork,
  terrainHeight,
  walkSurfaceHeight,
} from '../src/components/GalaxySocial/GalaxyTerrainModel.js'

setActivePathNetwork([[[-4, 0], [4, 0]]])

assert.equal(
  walkSurfaceHeight(0, 0),
  terrainHeight(0, 0) + ROAD_SURFACE_LIFT,
)
assert.equal(
  walkSurfaceHeight(0, 5),
  terrainHeight(0, 5) + LANDING_PAD_SURFACE_LIFT,
)
assert.equal(
  walkSurfaceHeight(BRIDGE_X, riverCenterZ(BRIDGE_X)),
  BRIDGE_DECK_HEIGHT,
)
assert.equal(
  walkSurfaceHeight(-10, -10),
  terrainHeight(-10, -10),
)

const roadNodes = [
  ...WORLD_ZONES.map((zone) => zone.position),
  ...VILLAGE_SLOTS.map((slot) => slot.position),
]
const roadPaths = generatePathNetwork(roadNodes)
roadPaths.forEach((path) => {
  const [startX, startZ] = path[0]
  const [endX, endZ] = path.at(-1)
  const dx = endX - startX
  const dz = endZ - startZ
  const lengthSquared = dx * dx + dz * dz
  let previousProgress = -Number.EPSILON
  path.forEach(([x, z]) => {
    const progress = ((x - startX) * dx + (z - startZ) * dz) / lengthSquared
    assert.ok(progress >= previousProgress, 'road control points must not reverse')
    previousProgress = progress
  })
})

const ribbon = createRibbonGeometry(roadPaths, .7, () => 0, ROAD_SURFACE_LIFT)
const ribbonPositions = ribbon.getAttribute('position')
const ribbonIndices = ribbon.getIndex().array
let windingSign = 0
for (let index = 0; index < ribbonIndices.length; index += 3) {
  const a = ribbonIndices[index]
  const b = ribbonIndices[index + 1]
  const c = ribbonIndices[index + 2]
  const area = (
    (ribbonPositions.getX(b) - ribbonPositions.getX(a))
      * (ribbonPositions.getZ(c) - ribbonPositions.getZ(a))
    - (ribbonPositions.getZ(b) - ribbonPositions.getZ(a))
      * (ribbonPositions.getX(c) - ribbonPositions.getX(a))
  )
  assert.ok(Math.abs(area) > 1e-6, 'road ribbon triangles must not collapse')
  const sign = Math.sign(area)
  if (!windingSign) windingSign = sign
  assert.equal(sign, windingSign, 'road ribbon triangles must keep a consistent winding')
}
ribbon.dispose()

const bridgeRiverWidth = riverWidth(BRIDGE_X)
const mouthRiverWidth = riverWidth(RIVER_MOUTH_END_X)
assert.ok(
  mouthRiverWidth / bridgeRiverWidth >= 1.8 && mouthRiverWidth / bridgeRiverWidth <= 2.2,
  'river mouth must widen naturally to 1.8–2.2x the upstream channel',
)

const river = createRiverGeometry()
const riverPositions = river.getAttribute('position')
for (let index = 0; index < riverPositions.count; index += 1) {
  const x = riverPositions.getX(index)
  const z = riverPositions.getZ(index)
  if (x <= RIVER_MOUTH_START_X) {
    assert.ok(Math.hypot(x, z) <= WORLD_RADIUS + .01, 'inland river must stay inside the island coast')
  }
}
river.computeBoundingBox()
assert.ok(river.boundingBox.min.x >= RIVER_SOURCE_X - .2, 'river must start at the inland spring')
assert.ok(
  river.boundingBox.max.x > RIVER_MOUTH_BLEND_END_X,
  'one continuous river surface must extend into the ocean before fading out',
)
river.dispose()

const mouth = createRiverMouthGeometry()
mouth.computeBoundingBox()
assert.ok(mouth.boundingBox.min.x < RIVER_MOUTH_START_X, 'estuary must overlap the river')
assert.ok(mouth.boundingBox.max.x > RIVER_MOUTH_BLEND_END_X, 'estuary must extend into the ocean before fading out')
assert.ok(mouth.boundingBox.min.y > OCEAN_SURFACE_Y, 'estuary water must meet the ocean without sinking below it')
mouth.dispose()

for (const side of [-1, 1]) {
  const bank = createEstuaryBankGeometry(side)
  const bankPositions = bank.getAttribute('position')
  const startWidth = Math.abs(bankPositions.getZ(1) - bankPositions.getZ(0))
  const last = bankPositions.count - 2
  const endWidth = Math.abs(bankPositions.getZ(last + 1) - bankPositions.getZ(last))
  assert.ok(endWidth < startWidth * .15, 'estuary sediment bank must finish as a tapered tongue')
  bank.dispose()
}

const coastX = 13.1
assert.ok(
  terrainHeight(coastX, riverCenterZ(coastX)) < OCEAN_SURFACE_Y,
  'terrain at the river mouth must open below sea level',
)

const islandSkirt = createIslandSkirtGeometry()
const skirtPositions = islandSkirt.getAttribute('position')
let mouthTop = Number.POSITIVE_INFINITY
for (let index = 0; index < skirtPositions.count; index += 2) {
  const x = skirtPositions.getX(index)
  const z = skirtPositions.getZ(index)
  if (x > 11 && Math.abs(z - riverCenterZ(x)) < riverWidth(x)) {
    mouthTop = Math.min(mouthTop, skirtPositions.getY(index))
  }
}
assert.ok(mouthTop < OCEAN_SURFACE_Y, 'island side wall must be submerged at the river mouth')
islandSkirt.dispose()

setTerritoryExpanded(true)
const expandedIsland = createIslandSkirtGeometry()
expandedIsland.computeBoundingBox()
assert.ok(expandedIsland.boundingBox.max.x > EXPANDED_WORLD_RADIUS - .1, 'purchased territory must expand the island radius by sqrt(2)')
const expandedRiver = createRiverGeometry()
expandedRiver.computeBoundingBox()
assert.ok(expandedRiver.boundingBox.max.x > 27.8, 'expanded territory river must continue to the new coast')
expandedRiver.dispose()
expandedIsland.dispose()
setTerritoryExpanded(false)

console.log('Galaxy walk-surface tests passed')
