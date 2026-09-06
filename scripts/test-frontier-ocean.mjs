import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  getOceanFloorY,
  getExplorationRadius,
  sampleExplorationWater,
  advanceExplorationHeight,
  getMarineHabitat,
  MARINE_HABITAT_COUNT,
} from '../src/components/GalaxySocial/exploration/frontierExploration.js'
import {
  createMarineFishGeometry,
  createCoralGeometry,
  createSeaweedGeometry,
  createSeabedGeometry,
  createTurtleGeometry,
} from '../src/components/GalaxySocial/exploration/marineGeometry.js'
import { setTerritoryExpanded } from '../src/components/GalaxySocial/GalaxyTerrainModel.js'
import {
  GALAXY_MIN_Y,
  GALAXY_POSITION_LIMIT,
} from '../src/utils/galaxyWorldBounds.js'

for (const radius of [20, Math.sqrt(2) * 20]) {
  setTerritoryExpanded(radius > 20)
  assert.ok(getExplorationRadius(radius) - radius >= 59)
  let min = 0,
    max = -100
  for (let d = 2; d < 59; d += 0.5)
    for (let a = 0; a < 6.28; a += 0.2) {
      const x = Math.cos(a) * (radius + d),
        z = Math.sin(a) * (radius + d),
        water = sampleExplorationWater(x, z, radius)
      assert.equal(water.kind, 'ocean')
      assert.ok(water.floorY > GALAXY_MIN_Y && water.floorY < water.surfaceY)
      assert.ok(Math.hypot(x, z) < GALAXY_POSITION_LIMIT)
      assert.ok(
        Math.abs(getOceanFloorY(x + 0.02, z, radius) - water.floorY) < 0.15,
        'continuous traversable floor',
      )
      min = Math.min(min, water.floorY)
      max = Math.max(max, water.floorY)
    }
  assert.ok(min < -29 && max > -3, 'shallow shelf and deep water coexist')
  for (let i = 0; i < MARINE_HABITAT_COUNT; i++) {
    const h = getMarineHabitat(i, radius),
      water = sampleExplorationWater(h.x, h.z, radius)
    assert.ok(
      h.y > water.floorY && h.y < water.surfaceY,
      'habitat is between floor and surface',
    )
  }
  const water = sampleExplorationWater(radius + 48, 0, radius)
  let y = -9
  for (let i = 0; i < 500; i++)
    y = advanceExplorationHeight({
      y,
      mode: 'diving',
      axis: -1,
      dt: 0.05,
      water,
      floorY: water.floorY,
    })
  assert.ok(
    Math.abs(y - water.floorY - 0.025) < 0.001,
    'diver can descend below old -8 limit to actual floor',
  )
  const seabed = createSeabedGeometry(radius),
    p = seabed.attributes.position
  for (let i = 0; i < p.count; i += 113)
    assert.ok(
      Math.abs(p.getY(i) - getOceanFloorY(p.getX(i), p.getZ(i), radius)) <
        0.001,
    )
  // Check triangle interiors as well as vertices: physics is a continuous
  // function, while the GPU draws a piecewise-linear approximation.
  for (let i = 0; i < seabed.index.count; i += 93) {
    let x = 0,
      y = 0,
      z = 0
    for (let j = 0; j < 3; j++) {
      const k = seabed.index.getX(i + j)
      x += p.getX(k) / 3
      y += p.getY(k) / 3
      z += p.getZ(k) / 3
    }
    if (Math.hypot(x, z) < getExplorationRadius(radius))
      assert.ok(
        Math.abs(y - getOceanFloorY(x, z, radius)) < 0.2,
        'bounded mesh/physics interpolation error',
      )
  }
  seabed.dispose()
}
setTerritoryExpanded(false)
for (let i = 0; i < 5; i++) {
  const g = createCoralGeometry(i)
  assert.ok(
    g.attributes.position.count / 3 < 6000,
    'instanced colony triangle budget',
  )
  g.dispose()
}
for (const geometry of [0, 1, 2, 3].map(createMarineFishGeometry).concat(
  [0, 1, 2, 3, 4].map((i) => createCoralGeometry(i, 3)),
  createSeaweedGeometry(),
  createTurtleGeometry(),
)) {
  assert.ok(geometry.attributes.position.count > 100)
  assert.ok(geometry.attributes.color)
  for (const name of ['position', 'normal', 'color'])
    assert.ok([...geometry.attributes[name].array].every(Number.isFinite), name)
  geometry.dispose()
}
const rules = JSON.parse(
  readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8'),
)
const connection =
  rules.rules.galaxyWorldRooms.$ownerUid.players.$uid.connections.$connectionId
assert.ok(
  connection['.validate'].includes('>= -96') &&
    connection['.validate'].includes('<= 96'),
)
assert.ok(connection.y['.validate'].includes('>= -40'))
console.log(
  'Ocean: wide/deep traversal, continuous floor, rendered heightfield, finite marine geometry and presence contract passed',
)
