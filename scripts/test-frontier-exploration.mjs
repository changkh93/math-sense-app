import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { advanceExplorationHeight, getExplorationMode, sampleExplorationWater, getExplorationRadius, getHoverpackAltitudeProgress, getHoverpackFlightStage, getMarineHabitat, getOceanFloorY, getSkyLandmarks, isSkyLandmarkReached, MARINE_SPECIES, normalizeExplorationKit, normalizeOwnedExplorationKits, resolveExplorationKitShortcut, EXPLORATION_KITS, EXPLORATION_KIT_COST, HOVERPACK_FLAME_LAYERS, FLIGHT_CEILING } from '../src/components/GalaxySocial/exploration/frontierExploration.js'
import { setTerritoryExpanded } from '../src/components/GalaxySocial/GalaxyTerrainModel.js'
import { getExplorationSurfaceRecovery, HOVERPACK_WATER_CLEARANCE } from '../src/components/GalaxySocial/exploration/frontierExploration.js'
import { createCloudAtlas, getCloudBanks, getFlightCameraFov } from '../src/components/GalaxySocial/exploration/frontierSkyModel.js'

setTerritoryExpanded(false)
const water = sampleExplorationWater(23, 0, 20)
assert.equal(water.kind, 'ocean')
assert.equal(sampleExplorationWater(40, 0, 20).kind, 'ocean')
assert.equal(sampleExplorationWater(95, 0, 20), null)
assert.equal(sampleExplorationWater(0, 5, 20), null)
assert.ok(getOceanFloorY(20.2, 0, 20) > getOceanFloorY(25.8, 0, 20))
assert.notEqual(getOceanFloorY(23, 0, 20), getOceanFloorY(0, 23, 20))
assert.equal(water.floorY, getOceanFloorY(23, 0, 20))
assert.ok(Math.abs(getExplorationRadius(28.284) - 88.284) < .001)
assert.equal(normalizeExplorationKit('admin-jet'), 'none')
assert.deepEqual(normalizeOwnedExplorationKits(null), ['none'])
assert.deepEqual(normalizeOwnedExplorationKits(['diving', 'admin-jet', 'diving', 'hoverpack']), ['none', 'diving', 'hoverpack'])
assert.equal(EXPLORATION_KITS.find((kit) => kit.id === 'none').cost, 0)
assert.equal(EXPLORATION_KITS.find((kit) => kit.id === 'hoverpack').cost, EXPLORATION_KIT_COST)
assert.equal(EXPLORATION_KITS.find((kit) => kit.id === 'diving').cost, EXPLORATION_KIT_COST)
assert.deepEqual(EXPLORATION_KITS.map((kit) => kit.shortcut), ['1', '2', '3'])
assert.equal(resolveExplorationKitShortcut('Digit1'), 'none')
assert.equal(resolveExplorationKitShortcut('Numpad2'), 'hoverpack')
assert.equal(resolveExplorationKitShortcut('Digit3'), 'diving')
assert.equal(resolveExplorationKitShortcut('KeyH'), null)
assert.equal(getHoverpackFlightStage(0).id, 'launch')
assert.equal(getHoverpackFlightStage(5).id, 'cloud')
assert.equal(getHoverpackFlightStage(10).id, 'stratosphere')
assert.equal(getHoverpackFlightStage(15).id, 'orbit')
assert.equal(getHoverpackAltitudeProgress(-4), 0)
assert.equal(getHoverpackAltitudeProgress(FLIGHT_CEILING), 100)
assert.equal(getHoverpackAltitudeProgress(99), 100)
assert.equal(getHoverpackAltitudeProgress(NaN), 0)
assert.equal(getHoverpackAltitudeProgress('invalid'), 0)
assert.equal(getFlightCameraFov({ flying: false, moving: true }), 48)
assert.equal(getFlightCameraFov({ flying: true }), 52)
assert.equal(getFlightCameraFov({ flying: true, moving: true }), 54)
assert.equal(getFlightCameraFov({ flying: true, moving: true, sprinting: true }), 57)
assert.equal(getFlightCameraFov({ flying: true, birdView: true }), 48)
const cloudAtlas = createCloudAtlas()
assert.equal(cloudAtlas.data.length, cloudAtlas.width * cloudAtlas.height * 4)
assert.deepEqual(createCloudAtlas().data, cloudAtlas.data, 'cloud appearance is stable across scene mounts')
const { width, height, data } = cloudAtlas
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  if ([0, width / 2 - 1, width / 2, width - 1].includes(x) || [0, height / 2 - 1, height / 2, height - 1].includes(y)) {
    assert.equal(data[(y * width + x) * 4 + 3], 0, 'every atlas tile has transparent boundaries')
  }
}
const opaquePixels = data.filter((value, index) => index % 4 === 3 && value > 180).length
assert.ok(opaquePixels > width * height * .08 && opaquePixels < width * height * .5)
for (const count of [12, 18, 24]) {
  const banks = getCloudBanks(20, count)
  assert.equal(banks.length, count)
  assert.ok(banks.every((bank) => Math.hypot(bank.x, bank.z) >= 22 && bank.y > 5 && bank.y < 9))
}
const skyRoute = getSkyLandmarks(20)
assert.deepEqual(skyRoute.map((site) => site.order), [1, 2, 3])
assert.ok(isSkyLandmarkReached({ x: skyRoute[0].x, y: skyRoute[0].y, z: skyRoute[0].z }, skyRoute[0]))
assert.equal(isSkyLandmarkReached({ x: skyRoute[0].x + 3, y: skyRoute[0].y, z: skyRoute[0].z }, skyRoute[0]), false)
assert.deepEqual(HOVERPACK_FLAME_LAYERS.map((layer) => layer.color), ['#ff3d0d', '#ff9b24', '#fff0a3'])
assert.ok(HOVERPACK_FLAME_LAYERS.every((layer) => layer.height > 0 && layer.radius > 0 && layer.opacity > 0 && layer.opacity <= 1))
assert.equal(getExplorationMode({ kit: 'none', flight: true, y: 3, water }), 'grounded')
assert.equal(getExplorationMode({ kit: 'hoverpack', flight: true, y: 3, water }), 'flying')
assert.equal(getExplorationMode({ kit: 'none', y: -.3, water }), 'swimming')
assert.equal(getExplorationMode({ kit: 'diving', y: -.6, water }), 'diving')
// Crossing the water surface has hysteresis; a bridge above it remains walkable.
assert.equal(getExplorationMode({ kit: 'none', y: -.12, water, previous: 'swimming' }), 'swimming')
assert.equal(getExplorationMode({ kit: 'diving', y: .38, water }), 'grounded')
const base = { mode: 'flying', y: 2, dt: .05, floorY: 0 }
for (const kind of ['ocean', 'river']) {
  const wet = { kind, surfaceY: .2, floorY: -20 }
  const hoverFloor = wet.surfaceY + HOVERPACK_WATER_CLEARANCE
  let y = 3
  for (let i = 0; i < 100; i++) y = advanceExplorationHeight({ y, mode: 'flying', axis: -1, dt: .05, water: wet, floorY: wet.floorY })
  assert.ok(Math.abs(y - hoverFloor) < .0001, 'holding descend stops above water')
  assert.equal(getExplorationSurfaceRecovery({ mode: 'flying', y, water: wet }), null)
  for (const mode of ['flying', 'swimming']) {
    let submerged = -12
    assert.notEqual(getExplorationSurfaceRecovery({ mode, y: submerged, water: wet }), null)
    assert.equal(advanceExplorationHeight({ y: submerged, mode, axis: -1, dt: 0, water: wet, floorY: -20 }), submerged)
    for (let i = 0; i < 120; i++) {
      const next = advanceExplorationHeight({ y: submerged, mode, axis: -1, dt: .05, water: wet, floorY: -20 })
      assert.ok(next >= submerged - .00001, 'descent cannot override automatic resurfacing')
      submerged = next
    }
    assert.equal(getExplorationSurfaceRecovery({ mode, y: submerged, water: wet }), null)
  }
  assert.equal(getExplorationSurfaceRecovery({ mode: 'diving', y: -12, water: wet }), null)
  assert.ok(advanceExplorationHeight({ y: -12, mode: 'diving', axis: -1, dt: .05, water: wet, floorY: -20 }) < -12)
  assert.equal(advanceExplorationHeight({ y: -12, mode: 'flying', axis: -1, dt: .05, water: wet, floorY: -20, blocked: () => true }), -12)
}
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
  MARINE_SPECIES.forEach((_, i) => {
    const habitat = getMarineHabitat(i, radius)
    assert.equal(sampleExplorationWater(habitat.x, habitat.z, radius)?.kind, 'ocean')
    assert.ok(habitat.y > sampleExplorationWater(habitat.x, habitat.z, radius).floorY)
  })
}
const hudSource = readFileSync(new URL('../src/components/GalaxySocial/exploration/FrontierExplorationHud.jsx', import.meta.url), 'utf8')
assert.doesNotMatch(hudSource, /바다 도감|관찰 기록하기|가까운 산호 숲/)
assert.match(hudSource, /aria-keyshortcuts=\{kit\.shortcut\}/)
assert.match(hudSource, /event\.code === 'KeyG'/)
assert.match(hudSource, /flight: kit === 'hoverpack'/, 'selecting or purchasing the hoverpack launches immediately')
assert.doesNotMatch(hudSource, /안전 착륙|aria-keyshortcuts="H"/, 'hoverpack has no redundant landing toggle')
assert.match(hudSource, /빛의 중심을 통과하면 자동 기록됩니다/)
const skySource = readFileSync(new URL('../src/components/GalaxySocial/exploration/FrontierSkyWorld.jsx', import.meta.url), 'utf8')
assert.match(skySource, /function FlightAtmosphere/)
assert.doesNotMatch(skySource, /HighAltitudeMotes|SkyRay|OrbitalPromises|SkyRouteRibbon/, 'no following particles, ambiguous fauna or decorative destinations')
assert.match(skySource, /budget\?\.groundTextureSize <= 96/, 'sky density follows the existing low-spec preset')
const worldSource = readFileSync(new URL('../src/components/GalaxySocial/GalaxyWorld3D.jsx', import.meta.url), 'utf8')
assert.doesNotMatch(worldSource, /event\.code === 'KeyH'/, 'H landing toggle is removed')
setTerritoryExpanded(false)
console.log('Frontier exploration: flight ceiling, hover, pause, collision sweep, swimming, varied seabed and free-form marine exploration passed')
