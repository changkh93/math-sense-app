import assert from 'node:assert/strict'
import { advanceExplorationHeight, getExplorationMode, sampleExplorationWater, getExplorationRadius, getMarineHabitat, findMarineObservation, MARINE_SPECIES, normalizeExplorationKit, FLIGHT_CEILING } from '../src/components/GalaxySocial/exploration/frontierExploration.js'
import { setTerritoryExpanded } from '../src/components/GalaxySocial/GalaxyTerrainModel.js'

setTerritoryExpanded(false)
const water = sampleExplorationWater(23, 0, 20)
assert.equal(water.kind, 'ocean')
assert.equal(sampleExplorationWater(40, 0, 20), null)
assert.equal(sampleExplorationWater(0, 5, 20), null)
assert.equal(getExplorationRadius(28.284), 31)
assert.equal(normalizeExplorationKit('admin-jet'), 'none')
assert.equal(getExplorationMode({ kit: 'none', flight: true, y: 3, water }), 'grounded')
assert.equal(getExplorationMode({ kit: 'hoverpack', flight: true, y: 3, water }), 'flying')
assert.equal(getExplorationMode({ kit: 'none', y: -.3, water }), 'swimming')
assert.equal(getExplorationMode({ kit: 'diving', y: -.6, water }), 'diving')
// Crossing the water surface has hysteresis; a bridge above it remains walkable.
assert.equal(getExplorationMode({ kit: 'none', y: -.12, water, previous: 'swimming' }), 'swimming')
assert.equal(getExplorationMode({ kit: 'diving', y: .38, water }), 'grounded')
const base = { mode: 'flying', y: 2, dt: .05, floorY: 0 }
assert.equal(advanceExplorationHeight({ ...base, axis: 0 }), 2)
assert.ok(advanceExplorationHeight({ ...base, axis: 1 }) > 2)
assert.equal(advanceExplorationHeight({ ...base, axis: 1, dt: 0 }), 2)
assert.ok(advanceExplorationHeight({ ...base, axis: 1, dt: 100 }) < 2.17)
assert.ok(advanceExplorationHeight({ ...base, y: FLIGHT_CEILING, axis: 1 }) <= FLIGHT_CEILING)
assert.ok(advanceExplorationHeight({ ...base, axis: 1, blocked: (y) => y > 2.07 }) <= 2.07)
assert.ok(advanceExplorationHeight({ ...base, y: .04, axis: -1 }) >= .025)
let landingY = 6
for (let i = 0; i < 120; i++) landingY = advanceExplorationHeight({ y: landingY, mode: 'landing', dt: .05, water, floorY: water.floorY })
assert.ok(Math.abs(landingY - (water.surfaceY - .25 * 1.35)) < .001)
assert.equal(advanceExplorationHeight({ y: -1, mode: 'swimming', dt: 0, water }), -1)
let depth = -.6
for (let i = 0; i < 100; i++) depth = advanceExplorationHeight({ y: depth, mode: 'diving', axis: -1, dt: .05, floorY: water.floorY, water })
assert.ok(depth >= water.floorY + .024)
for (let i = 0; i < 100; i++) depth = advanceExplorationHeight({ y: depth, mode: 'diving', axis: 1, dt: .05, floorY: water.floorY, water })
assert.ok(depth < water.surfaceY)
for (const radius of [20, 28.284271]) {
  setTerritoryExpanded(radius > 20)
  MARINE_SPECIES.forEach((species, i) => {
    const habitat = getMarineHabitat(i, radius)
    assert.equal(sampleExplorationWater(habitat.x, habitat.z, radius)?.kind, 'ocean')
    assert.equal(findMarineObservation({ ...habitat, movementMode: 'diving' }, radius)?.id, species.id)
    assert.equal(findMarineObservation({ ...habitat, y: 12, movementMode: 'flying' }, radius), null)
  })
}
setTerritoryExpanded(false)
console.log('Frontier exploration: flight ceiling, hover, pause, collision sweep, swimming, diving floor, water boundaries and marine observation passed')
