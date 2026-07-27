import assert from 'node:assert/strict'
import {
  FRONTIER_CORE_FACILITY_IDS,
  FRONTIER_STORY_STEPS,
  advanceFrontierStory,
  createInitialFrontierStory,
  getFrontierStoryObjective,
  normalizeFrontierStory,
} from '../src/utils/frontierStory.js'

const nowMs = Date.parse('2026-07-27T03:00:00.000Z')
const events = [
  { type: 'world_action', nodeId: 'broken_beacon' },
  { type: 'item_built', itemId: 'star_lamp', level: 1 },
  { type: 'mission_completed' },
  { type: 'rover_dispatched' },
  { type: 'item_built', itemId: 'lumen_tree' },
  { type: 'item_built', itemId: 'starflower_garden' },
  { type: 'daily_event_completed' },
  { type: 'mission_completed' },
  { type: 'rover_dispatched' },
  { type: 'rover_claimed', discoveryCount: 1 },
  { type: 'friend_visited' },
  { type: 'social_help_completed', routeLevel: 1 },
  { type: 'social_help_completed', routeLevel: 2 },
  { type: 'rover_claimed', discoveryCount: 3 },
  { type: 'story_evidence', builtItemIds: FRONTIER_CORE_FACILITY_IDS },
  { type: 'item_built', itemId: 'route_gateway', builtItemIds: [...FRONTIER_CORE_FACILITY_IDS, 'route_gateway'] },
  { type: 'structure_cared', itemId: 'route_gateway' },
]

let story = createInitialFrontierStory(nowMs)
for (const [index, event] of events.entries()) {
  const previousCount = story.completedStepIds.length
  story = advanceFrontierStory(story, event, nowMs + index + 1)
  assert.ok(story.completedStepIds.length > previousCount, `event ${index + 1} should advance the story`)
  const objective = getFrontierStoryObjective(story)
  assert.equal(objective === null, story.status === 'completed')
}

assert.deepEqual(story.completedStepIds, FRONTIER_STORY_STEPS)
assert.equal(story.status, 'completed')
assert.equal(story.restorationPercent, 100)
assert.equal(story.restorationStage, 5)

const migrated = normalizeFrontierStory({
  version: 2,
  stepId: 'recover_first_discovery',
  completedStepIds: ['restore_beacon', 'build_first_light', 'field_expedition', 'launch_rover', 'restore_connection'],
})
assert.equal(migrated.version, 3)
assert.ok(migrated.completedStepIds.includes('help_friend_planet'))

console.log('Frontend frontier story tests passed.')
