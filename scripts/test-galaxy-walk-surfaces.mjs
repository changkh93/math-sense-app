import assert from 'node:assert/strict'
import {
  BRIDGE_DECK_HEIGHT,
  BRIDGE_X,
  LANDING_PAD_SURFACE_LIFT,
  ROAD_SURFACE_LIFT,
  VILLAGE_SLOTS,
  WORLD_ZONES,
  createRibbonGeometry,
  generatePathNetwork,
  riverCenterZ,
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

console.log('Galaxy walk-surface tests passed')
