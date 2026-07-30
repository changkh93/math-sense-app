import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import {
  GALAXY_ROVER_CATALOG_VERSION,
  GALAXY_ROVER_REPORT_FLOW_VERSION,
  GALAXY_ROVER_ROUTES,
  getGalaxyRoverPhase,
  getGalaxyRoverRouteDiscoveryCount,
} from '../src/utils/galaxyGame.js'

const require = createRequire(import.meta.url)
const server = require('../functions/galaxyGame.js').__test

assert.equal(server.GALAXY_ROVER_CATALOG_VERSION, GALAXY_ROVER_CATALOG_VERSION)
assert.equal(server.GALAXY_ROVER_REPORT_FLOW_VERSION, GALAXY_ROVER_REPORT_FLOW_VERSION)

for (const [routeId, clientRoute] of Object.entries(GALAXY_ROVER_ROUTES)) {
  const serverRoute = server.GALAXY_ROVER_ROUTES[routeId]
  assert.ok(serverRoute, `${routeId} must exist on the server`)
  assert.equal(serverRoute.title, clientRoute.label, `${routeId} title`)
  assert.equal(serverRoute.material, clientRoute.rewardMaterial, `${routeId} material`)
  assert.equal(serverRoute.rewardTitle, clientRoute.reward, `${routeId} reward title`)
  assert.equal(serverRoute.baseAmount, clientRoute.baseReward, `${routeId} base reward`)
  assert.equal(serverRoute.ability, clientRoute.ability, `${routeId} ability`)
  assert.deepEqual(serverRoute.discoveries.map((item) => item.id), clientRoute.discoveries.map((item) => item.id), `${routeId} discoveries`)
}

const nowMs = 1_800_000_000_000
const departure = server.buildGalaxyRoverDeparture({
  operationId: 'lumi-rover-contract-001',
  route: 'ruins',
  reportFlowVersion: GALAXY_ROVER_REPORT_FLOW_VERSION,
  planet: { layout: [{ itemId: 'rover_bay' }, { itemId: 'expedition_beacon' }], abilitySnapshot: { values: { precision: 4 } } },
  nowMs,
})
assert.equal(departure.durationMs, 6 * 60 * 60 * 1000)
assert.equal(departure.reward.amount, 4)
assert.equal(getGalaxyRoverPhase(departure, nowMs), 'expedition')
assert.equal(getGalaxyRoverPhase({ ...departure, status: 'claimed', claimedAtMs: departure.readyAtMs }, departure.readyAtMs), 'report')
assert.equal(getGalaxyRoverRouteDiscoveryCount([
  { id: 'nebula_lumen_spore', route: 'nebula' },
  { id: 'nebula_aether_seed', route: 'nebula' },
  { id: 'comet_iron_scale', route: 'comet' },
], 'nebula'), 2)

console.log('Lumi rover client/server contract tests passed.')
