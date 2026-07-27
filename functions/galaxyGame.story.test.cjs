const assert = require('node:assert/strict');

const {
  FRONTIER_ASTRA_MEMORY_STEPS,
  FRONTIER_CORE_FACILITY_IDS,
  FRONTIER_FRIEND_SIGNAL_STEPS,
  FRONTIER_FIRST_SIGNAL_STEPS,
  FRONTIER_LOST_ROUTE_STEPS,
  FRONTIER_PROLOGUE_STEPS,
  FRONTIER_REBORN_STAR_STEPS,
  FRONTIER_STORY_STEPS,
  advanceFrontierStory,
  createInitialFrontierStory,
  deriveFrontierStoryFromPlanet,
  getFrontierBuildPricing,
  isPendingFrontierBeaconRepair,
  normalizeFrontierStory,
  updateFrontierAnalyticsFirstBuild,
  updateFrontierAnalyticsOnOpen,
  updateFrontierAnalyticsPrologue,
} = require('./galaxyGame').__test;

const NOW_MS = Date.parse('2026-07-27T03:00:00.000Z');

function testOrderedStoryProgression() {
  let story = createInitialFrontierStory(NOW_MS);
  assert.equal(story.stepId, 'restore_beacon');
  assert.equal(advanceFrontierStory(story, { type: 'mission_completed' }, NOW_MS).advanced, false);

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
    { type: 'story_evidence', builtItemIds: [...FRONTIER_CORE_FACILITY_IDS] },
    { type: 'item_built', itemId: 'route_gateway', builtItemIds: [...FRONTIER_CORE_FACILITY_IDS, 'route_gateway'] },
    { type: 'structure_cared', itemId: 'route_gateway' },
  ];
  events.forEach((event, index) => {
    const result = advanceFrontierStory(story, event, NOW_MS + index + 1);
    assert.equal(result.advanced, true);
    story = result.story;
    assert.equal(story.memoryShards, Math.min(index + 1, FRONTIER_PROLOGUE_STEPS.length));
    assert.equal(story.restorationPercent, Math.round(((index + 1) / FRONTIER_STORY_STEPS.length) * 100));
  });
  assert.deepEqual(story.completedStepIds, FRONTIER_STORY_STEPS);
  assert.equal(story.stepId, 'astra_memory_complete');
  assert.equal(story.status, 'completed');
  assert.deepEqual(story.completedChapterIds, ['prologue', 'reborn_star', 'lost_route', 'friend_signal', 'astra_memory']);
  assert.equal(story.restorationPercent, 100);
  assert.equal(story.restorationStage, 5);
  assert.equal(advanceFrontierStory(story, events[16], NOW_MS + 20).advanced, false);

  assert.deepEqual(FRONTIER_FIRST_SIGNAL_STEPS, FRONTIER_REBORN_STAR_STEPS);
  assert.equal(FRONTIER_STORY_STEPS.length, 17);
  assert.equal(FRONTIER_LOST_ROUTE_STEPS.length, 3);
  assert.equal(FRONTIER_FRIEND_SIGNAL_STEPS.length, 3);
  assert.equal(FRONTIER_ASTRA_MEMORY_STEPS.length, 4);
}

function testEvidenceCannotSkipOrderedSteps() {
  const initial = createInitialFrontierStory(NOW_MS);
  const result = advanceFrontierStory(initial, {
    type: 'story_evidence',
    discoveryCount: 99,
    builtItemIds: [...FRONTIER_CORE_FACILITY_IDS, 'route_gateway'],
  }, NOW_MS + 1);
  assert.equal(result.advanced, false);
  assert.equal(result.story.stepId, 'restore_beacon');

  let story = normalizeFrontierStory({
    completedStepIds: FRONTIER_STORY_STEPS.slice(0, 11),
  }, NOW_MS);
  const sharedRoute = advanceFrontierStory(story, { type: 'social_help_completed', routeLevel: 2 }, NOW_MS + 2);
  assert.deepEqual(sharedRoute.advancedStepIds, ['help_friend_planet', 'unlock_shared_route']);
  assert.equal(sharedRoute.story.stepId, 'complete_discovery_codex');

  story = normalizeFrontierStory({ completedStepIds: FRONTIER_STORY_STEPS.slice(0, 11) }, NOW_MS);
  const existingEvidence = advanceFrontierStory(story, {
    type: 'social_help_completed',
    routeLevel: 2,
    discoveryCount: 3,
    builtItemIds: [...FRONTIER_CORE_FACILITY_IDS],
  }, NOW_MS + 3);
  assert.deepEqual(existingEvidence.advancedStepIds, [
    'help_friend_planet',
    'unlock_shared_route',
    'complete_discovery_codex',
    'complete_core_facilities',
  ]);
  assert.equal(existingEvidence.story.stepId, 'build_astra_gateway');
}

function testFirstLightGrantIsNarrow() {
  const initial = createInitialFrontierStory(NOW_MS);
  const buildStep = advanceFrontierStory(initial, {
    type: 'world_action',
    nodeId: 'broken_beacon',
  }, NOW_MS + 1).story;
  const item = { cost: 25, materialCost: 2, stage2Cost: 20 };

  assert.deepEqual(getFrontierBuildPricing(buildStep, 'star_lamp', 1, item), {
    storyGrantApplied: true,
    totalCost: 0,
    materialCost: 0,
  });
  assert.deepEqual(getFrontierBuildPricing(buildStep, 'star_lamp', 2, item), {
    storyGrantApplied: false,
    totalCost: 45,
    materialCost: 2,
  });
  assert.equal(getFrontierBuildPricing(buildStep, 'lumen_tree', 1, item).storyGrantApplied, false);
}

function testPendingBeaconRepairRecovery() {
  const initial = createInitialFrontierStory(NOW_MS);
  assert.equal(isPendingFrontierBeaconRepair(initial, 'broken_beacon'), true);
  assert.equal(isPendingFrontierBeaconRepair(initial, 'ancient_scrap'), false);

  const repaired = advanceFrontierStory(initial, {
    type: 'world_action',
    nodeId: 'broken_beacon',
  }, NOW_MS + 1).story;
  assert.equal(isPendingFrontierBeaconRepair(repaired, 'broken_beacon'), false);
}

function testLegacyMigrationUsesStrongestEvidence() {
  const legacyPrologue = normalizeFrontierStory({
    version: 1,
    chapterId: 'prologue',
    stepId: 'prologue_complete',
    completedStepIds: [...FRONTIER_PROLOGUE_STEPS],
    status: 'completed',
  }, NOW_MS);
  assert.equal(legacyPrologue.chapterId, 'reborn_star');
  assert.equal(legacyPrologue.stepId, 'build_lumen_tree');
  assert.equal(legacyPrologue.status, 'active');

  assert.equal(deriveFrontierStoryFromPlanet({
    layout: [{ itemId: 'star_lamp', locked: false }],
  }, NOW_MS).stepId, 'field_expedition');
  assert.equal(deriveFrontierStoryFromPlanet({ lastMissionAtMs: NOW_MS - 1 }, NOW_MS).stepId, 'launch_rover');
  assert.equal(deriveFrontierStoryFromPlanet({ roverExpedition: { operationId: 'rover-1' } }, NOW_MS).stepId, 'build_lumen_tree');
  const migratedDiscovery = deriveFrontierStoryFromPlanet({
    roverExpedition: { operationId: 'rover-1', status: 'claimed' },
    roverDiscoveries: [{ id: 'legacy-discovery' }],
  }, NOW_MS);
  assert.equal(migratedDiscovery.status, 'active');
  assert.equal(migratedDiscovery.stepId, 'build_lumen_tree');
  assert.deepEqual(migratedDiscovery.completedStepIds, [...FRONTIER_PROLOGUE_STEPS]);
  const mappedLegacy = normalizeFrontierStory({
    completedStepIds: [...FRONTIER_PROLOGUE_STEPS, 'restore_connection', 'recover_first_discovery'],
  }, NOW_MS);
  assert.equal(mappedLegacy.completedStepIds.includes('help_friend_planet'), true);
  assert.equal(mappedLegacy.completedStepIds.includes('recover_pre_storm_discovery'), true);
  assert.equal(deriveFrontierStoryFromPlanet({
    layout: [{ itemId: 'star_lamp', locked: true }],
  }, NOW_MS).stepId, 'restore_beacon');
}

function testFrontierAnalyticsMilestones() {
  const opened = updateFrontierAnalyticsOnOpen({}, NOW_MS);
  assert.equal(opened.entryCount, 1);
  assert.equal(opened.firstEnteredAtMs, NOW_MS);
  assert.equal(opened.d1ReturnedAtMs, undefined);

  const dayTwoMs = NOW_MS + (2 * 24 * 60 * 60 * 1000);
  const dayTwo = updateFrontierAnalyticsOnOpen(opened, dayTwoMs);
  assert.equal(dayTwo.entryCount, 2);
  assert.equal(dayTwo.d1ReturnedAtMs, dayTwoMs);
  const dayEightMs = NOW_MS + (8 * 24 * 60 * 60 * 1000);
  const dayEight = updateFrontierAnalyticsOnOpen(dayTwo, dayEightMs);
  assert.equal(dayEight.d7ReturnedAtMs, dayEightMs);
  assert.equal(dayEight.distinctDayKeys.length, 3);

  const built = updateFrontierAnalyticsFirstBuild(opened, NOW_MS + 45_000);
  assert.equal(built.firstBuildElapsedMs, 45_000);
  assert.deepEqual(updateFrontierAnalyticsFirstBuild(built, NOW_MS + 99_000), built);

  const completedStory = normalizeFrontierStory({ completedStepIds: FRONTIER_PROLOGUE_STEPS }, NOW_MS);
  const completed = updateFrontierAnalyticsPrologue(opened, completedStory, NOW_MS + 120_000);
  assert.equal(completed.prologueElapsedMs, 120_000);
  assert.deepEqual(updateFrontierAnalyticsPrologue(completed, completedStory, NOW_MS + 180_000), completed);
}

testOrderedStoryProgression();
testEvidenceCannotSkipOrderedSteps();
testFirstLightGrantIsNarrow();
testPendingBeaconRepairRecovery();
testLegacyMigrationUsesStrongestEvidence();
testFrontierAnalyticsMilestones();

console.log('Galaxy frontier story tests passed.');
