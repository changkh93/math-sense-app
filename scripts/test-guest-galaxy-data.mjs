import assert from 'node:assert/strict'
import { normalizeGuestGalaxyData } from '../src/hooks/useGuestGalaxyData.js'

const today = '2026-07-27'
const migrated = normalizeGuestGalaxyData({
  crystals: 27,
  lastGrantedAt: '2026-07-26',
  guestRouteXp: 15,
  planet: {
    theme: 'crystal',
    layout: [{ id: 'legacy-tree', itemId: 'lumen_tree', x: 12, z: 34, yaw: 1.25 }],
    frontierStory: {
      version: 2,
      stepId: 'prologue_complete',
      completedStepIds: ['restore_beacon', 'build_first_light', 'field_expedition', 'launch_rover'],
    },
  },
}, today)

assert.equal(migrated.crystals, 500)
assert.equal(migrated.lastGrantedAt, today)
assert.equal(migrated.guestRouteXp, 15)
assert.equal(migrated.planet.theme, 'crystal')
assert.equal(migrated.planet.layout[0].instanceId, 'legacy-tree')
assert.equal(migrated.planet.layout[0].y, 34)
assert.equal(migrated.planet.layout[0].rotation, 1.25)
assert.equal(migrated.planet.frontierStory.version, 3)
assert.equal(migrated.planet.frontierStory.stepId, 'build_lumen_tree')
assert.deepEqual(migrated.planet.roverDiscoveries, [])

const sameDay = normalizeGuestGalaxyData({ crystals: 123, lastGrantedAt: today, planet: {} }, today)
assert.equal(sameDay.crystals, 123)
assert.equal(sameDay.planet.layout.length, 1)
assert.equal(sameDay.planet.layout[0].itemId, 'starter_dome')

console.log('Guest galaxy data contract tests passed.')
