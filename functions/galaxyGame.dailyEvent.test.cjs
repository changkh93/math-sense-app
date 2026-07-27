const assert = require('node:assert/strict');

const {
  buildGalaxyDailyEvent,
  GALAXY_DAILY_EVENT_CATALOG,
  getKstDayKey,
  getKstDayWindow,
  planGalaxyDailyEventCompletion,
  syncFrontierStoryWithCompletedDailyEvent,
  normalizeFrontierStory,
} = require('./galaxyGame').__test;

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW_MS = Date.parse('2026-07-20T03:00:00.000Z');
const UID = 'student-daily-event-1';

function testKstMidnightBoundary() {
  const beforeMidnight = Date.parse('2026-07-20T14:59:59.999Z');
  const atMidnight = Date.parse('2026-07-20T15:00:00.000Z');

  assert.equal(getKstDayKey(new Date(beforeMidnight)), '2026-07-20');
  assert.equal(getKstDayKey(new Date(atMidnight)), '2026-07-21');
  assert.deepEqual(getKstDayWindow(beforeMidnight), {
    dayKey: '2026-07-20',
    expiresAtMs: atMidnight,
  });
  assert.deepEqual(getKstDayWindow(atMidnight), {
    dayKey: '2026-07-21',
    expiresAtMs: Date.parse('2026-07-21T15:00:00.000Z'),
  });
}

function testCatalogAndDeterministicDailyRotation() {
  assert.deepEqual(
    GALAXY_DAILY_EVENT_CATALOG.map(({ type, nodeId, reward, stat, statAmount }) => ({
      type, nodeId, reward, stat, statAmount,
    })),
    [
      {
        type: 'lumen_bloom',
        nodeId: 'fiber_grove',
        reward: { material: 'biofiber', amount: 1, title: '바이오 섬유' },
        stat: 'gardenVitality',
        statAmount: 6,
      },
      {
        type: 'crystal_rain',
        nodeId: 'crystal_north',
        reward: { material: 'crystalGlass', amount: 1, title: '수정 유리' },
        stat: 'gardenVitality',
        statAmount: 6,
      },
      {
        type: 'signal_blackout',
        nodeId: 'broken_beacon',
        reward: { material: 'stardust', amount: 1, title: '별가루' },
        stat: 'facilityHealth',
        statAmount: 6,
      },
      {
        type: 'meteor_debris',
        nodeId: 'ancient_scrap',
        reward: { material: 'alloy', amount: 1, title: '고대 합금' },
        stat: 'facilityHealth',
        statAmount: 6,
      },
    ],
  );

  const events = Array.from({ length: 4 }, (_, index) => buildGalaxyDailyEvent({
    uid: UID,
    nowMs: NOW_MS + index * DAY_MS,
  }));
  assert.deepEqual(buildGalaxyDailyEvent({ uid: UID, nowMs: NOW_MS }), events[0]);
  const indexes = events.map((event) => GALAXY_DAILY_EVENT_CATALOG.findIndex(({ type }) => type === event.type));
  for (let index = 1; index < indexes.length; index += 1) {
    assert.equal(indexes[index], (indexes[index - 1] + 1) % GALAXY_DAILY_EVENT_CATALOG.length);
  }
  assert.equal(new Set(events.map((event) => event.type)).size, 4);
}

function testStaleAndForgedRequestsAreRejected() {
  const event = buildGalaxyDailyEvent({ uid: UID, nowMs: NOW_MS });
  const forged = planGalaxyDailyEventCompletion({
    uid: UID,
    dayKey: event.dayKey,
    eventId: `${event.eventId}_forged`,
    planet: {},
    nowMs: NOW_MS,
  });
  assert.equal(forged.kind, 'forged');

  const yesterday = buildGalaxyDailyEvent({ uid: UID, nowMs: NOW_MS - DAY_MS });
  const stale = planGalaxyDailyEventCompletion({
    uid: UID,
    dayKey: yesterday.dayKey,
    eventId: yesterday.eventId,
    planet: {},
    nowMs: NOW_MS,
  });
  assert.equal(stale.kind, 'stale');
  assert.equal(stale.dailyEvent.dayKey, event.dayKey);
}

function testCompletionIncreasesServerOwnedBalances() {
  const event = buildGalaxyDailyEvent({ uid: UID, nowMs: NOW_MS });
  const definition = GALAXY_DAILY_EVENT_CATALOG.find(({ type }) => type === event.type);
  const planet = {
    materials: { stardust: 8, biofiber: 4, crystalGlass: 2, alloy: 1 },
    stats: { gardenVitality: 60, facilityHealth: 70, creatureHappiness: 55 },
  };
  const plan = planGalaxyDailyEventCompletion({
    uid: UID,
    dayKey: event.dayKey,
    eventId: event.eventId,
    planet,
    nowMs: NOW_MS,
  });

  assert.equal(plan.kind, 'completable');
  assert.equal(
    plan.materials[event.reward.material],
    planet.materials[event.reward.material] + event.reward.amount,
  );
  assert.equal(plan.stats[definition.stat], planet.stats[definition.stat] + definition.statAmount);
  assert.equal(plan.dailyEvent.status, 'completed');
  assert.equal(plan.dailyEvent.completedAtMs, NOW_MS);
  assert.equal(plan.operation.status, 'completed');
  assert.equal(plan.operation.type, 'galaxy_daily_event');
  assert.deepEqual(Object.keys(event), [
    'version',
    'dayKey',
    'eventId',
    'type',
    'nodeId',
    'title',
    'detail',
    'reward',
    'status',
    'expiresAtMs',
  ]);

  const legacy = planGalaxyDailyEventCompletion({
    uid: UID,
    dayKey: event.dayKey,
    eventId: event.eventId,
    planet: {},
    nowMs: NOW_MS,
  });
  assert.equal(legacy.kind, 'completable');
  assert.equal(legacy.materials[event.reward.material], event.reward.amount);
  assert.equal(legacy.stats[definition.stat], definition.statAmount);
}

function testRetryUsesLatestPlanetBalances() {
  const event = buildGalaxyDailyEvent({ uid: UID, nowMs: NOW_MS });
  const definition = GALAXY_DAILY_EVENT_CATALOG.find(({ type }) => type === event.type);
  const first = planGalaxyDailyEventCompletion({
    uid: UID,
    dayKey: event.dayKey,
    eventId: event.eventId,
    planet: {
      materials: { stardust: 2, biofiber: 2, crystalGlass: 2, alloy: 2 },
      stats: { gardenVitality: 40, facilityHealth: 40 },
    },
    nowMs: NOW_MS,
  });
  assert.equal(first.kind, 'completable');

  const latestPlanet = {
    materials: { ...first.materials, [event.reward.material]: 91 },
    stats: { ...first.stats, [definition.stat]: 87 },
  };
  const retry = planGalaxyDailyEventCompletion({
    uid: UID,
    dayKey: event.dayKey,
    eventId: event.eventId,
    operation: first.operation,
    planet: latestPlanet,
    nowMs: NOW_MS + 10_000,
  });
  assert.equal(retry.kind, 'deduplicated');
  assert.deepEqual(retry.materials, latestPlanet.materials);
  assert.deepEqual(retry.stats, latestPlanet.stats);
  assert.equal(retry.dailyEvent.completedAtMs, NOW_MS);

  const tampered = planGalaxyDailyEventCompletion({
    uid: UID,
    dayKey: event.dayKey,
    eventId: event.eventId,
    operation: { ...first.operation, reward: { ...first.operation.reward, amount: 99 } },
    planet: latestPlanet,
    nowMs: NOW_MS + 10_000,
  });
  assert.equal(tampered.kind, 'operation_conflict');
}

function testCompletedEventAdvancesWaitingStory() {
  const event = buildGalaxyDailyEvent({ uid: UID, nowMs: NOW_MS });
  const completion = planGalaxyDailyEventCompletion({
    uid: UID,
    dayKey: event.dayKey,
    eventId: event.eventId,
    planet: {},
    nowMs: NOW_MS,
  });
  const waitingStory = normalizeFrontierStory({
    completedStepIds: [
      'restore_beacon',
      'build_first_light',
      'field_expedition',
      'launch_rover',
      'build_lumen_tree',
      'restore_garden',
    ],
  }, NOW_MS);
  assert.equal(waitingStory.stepId, 'stabilize_daily_event');

  const synced = syncFrontierStoryWithCompletedDailyEvent({
    rawStory: waitingStory,
    uid: UID,
    event,
    operation: completion.operation,
    nowMs: NOW_MS + 1,
  });
  assert.equal(synced.advanced, true);
  assert.equal(synced.story.stepId, 'trace_lost_route');
  assert.equal(synced.story.completedChapterIds.includes('reborn_star'), true);

  const pending = syncFrontierStoryWithCompletedDailyEvent({
    rawStory: waitingStory,
    uid: UID,
    event,
    operation: null,
    nowMs: NOW_MS + 1,
  });
  assert.equal(pending.advanced, false);
  assert.equal(pending.story.stepId, 'stabilize_daily_event');
}

function run() {
  testKstMidnightBoundary();
  testCatalogAndDeterministicDailyRotation();
  testStaleAndForgedRequestsAreRejected();
  testCompletionIncreasesServerOwnedBalances();
  testRetryUsesLatestPlanetBalances();
  testCompletedEventAdvancesWaitingStory();
  console.log('Galaxy daily event tests passed.');
}

run();
