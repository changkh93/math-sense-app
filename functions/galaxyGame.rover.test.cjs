const assert = require('node:assert/strict');

const {
  buildGalaxyRoverDeparture,
  getGalaxyRoverExpeditionView,
  planGalaxyRoverClaim,
  planGalaxyRoverStart,
  stableGalaxyHash,
} = require('./galaxyGame').__test;

const HOUR_MS = 60 * 60 * 1000;
const NOW_MS = 1_800_000_000_000;

function operationFrom(expedition) {
  return {
    ...expedition,
    uid: 'student-1',
    type: 'galaxy_rover_expedition',
  };
}

function testStableDiscoverySelection() {
  const first = buildGalaxyRoverDeparture({
    operationId: 'rover-operation-0001',
    route: 'nebula',
    planet: {},
    nowMs: NOW_MS,
  });
  const retry = buildGalaxyRoverDeparture({
    operationId: 'rover-operation-0001',
    route: 'nebula',
    planet: {},
    nowMs: NOW_MS,
  });

  assert.equal(stableGalaxyHash('nebula:rover-operation-0001'), stableGalaxyHash('nebula:rover-operation-0001'));
  assert.deepEqual(retry.discovery, first.discovery);
  assert.equal(first.discovery.route, 'nebula');
  assert.ok(['nebula_lumen_spore', 'nebula_aether_seed', 'nebula_whale_echo'].includes(first.discovery.id));
}

function testDurationAndRewardBonuses() {
  const base = buildGalaxyRoverDeparture({
    operationId: 'rover-operation-base',
    route: 'nebula',
    planet: { abilitySnapshot: { values: { detection: 3 } } },
    nowMs: NOW_MS,
  });
  assert.equal(base.durationMs, 8 * HOUR_MS);
  assert.equal(base.readyAtMs, NOW_MS + 8 * HOUR_MS);
  assert.deepEqual(base.reward, {
    material: 'biofiber',
    amount: 4,
    baseAmount: 4,
    beaconBonus: 0,
    abilityBonus: 0,
    title: '바이오 섬유',
  });
  assert.equal(base.returnsAtMs, base.readyAtMs);

  const upgraded = buildGalaxyRoverDeparture({
    operationId: 'rover-operation-upgraded',
    route: 'nebula',
    planet: {
      layout: [{ itemId: 'rover_bay' }, { itemId: 'expedition_beacon' }],
      abilitySnapshot: { values: { detection: 4 } },
    },
    nowMs: NOW_MS,
  });
  assert.equal(upgraded.durationMs, 6 * HOUR_MS);
  assert.equal(upgraded.reward.amount, 6);
  assert.equal(upgraded.reward.beaconBonus, 1);
  assert.equal(upgraded.reward.abilityBonus, 1);
  assert.equal(upgraded.bonuses.roverBay, true);
  assert.equal(upgraded.bonuses.expeditionBeacon, true);
  assert.equal(upgraded.bonuses.ability, true);

  const comet = buildGalaxyRoverDeparture({ operationId: 'rover-operation-comet', route: 'comet', planet: {}, nowMs: NOW_MS });
  const ruins = buildGalaxyRoverDeparture({ operationId: 'rover-operation-ruins', route: 'ruins', planet: {}, nowMs: NOW_MS });
  assert.equal(comet.reward.material, 'alloy');
  assert.equal(comet.reward.amount, 2);
  assert.equal(ruins.reward.material, 'crystalGlass');
  assert.equal(ruins.reward.amount, 2);
}

function testStartStateAndIdempotency() {
  const expedition = buildGalaxyRoverDeparture({
    operationId: 'rover-operation-start',
    route: 'comet',
    planet: {},
    nowMs: NOW_MS,
  });
  const operation = operationFrom(expedition);

  const retry = planGalaxyRoverStart({
    operationId: expedition.operationId,
    route: 'comet',
    existingOperation: operation,
    planet: { roverExpedition: expedition },
    nowMs: NOW_MS + 1000,
  });
  assert.equal(retry.kind, 'deduplicated');
  assert.equal(retry.expedition.operationId, expedition.operationId);

  const collision = planGalaxyRoverStart({
    operationId: expedition.operationId,
    route: 'ruins',
    existingOperation: operation,
    planet: {},
    nowMs: NOW_MS,
  });
  assert.equal(collision.kind, 'operation_conflict');

  const secondStart = planGalaxyRoverStart({
    operationId: 'rover-operation-second',
    route: 'ruins',
    planet: { roverExpedition: expedition },
    nowMs: NOW_MS,
  });
  assert.equal(secondStart.kind, 'active');
  assert.equal(secondStart.expedition.durationMs, 8 * HOUR_MS);
  assert.equal(secondStart.expedition.bonuses.roverBay, false);

  const installedAfterLaunch = planGalaxyRoverStart({
    operationId: 'rover-operation-after-bay-install',
    route: 'ruins',
    planet: {
      layout: [{ itemId: 'rover_bay' }],
      roverExpedition: expedition,
    },
    nowMs: NOW_MS + HOUR_MS,
  });
  assert.equal(installedAfterLaunch.kind, 'active');
  assert.equal(installedAfterLaunch.expedition.durationMs, 8 * HOUR_MS);
  assert.equal(installedAfterLaunch.expedition.bonuses.roverBay, false);

  const afterClaim = planGalaxyRoverStart({
    operationId: 'rover-operation-after-claim',
    route: 'ruins',
    planet: { roverExpedition: { ...expedition, status: 'claimed', claimedAtMs: NOW_MS + 8 * HOUR_MS } },
    nowMs: NOW_MS + 8 * HOUR_MS,
  });
  assert.equal(afterClaim.kind, 'startable');
}

function testReadyBoundary() {
  const expedition = buildGalaxyRoverDeparture({
    operationId: 'rover-operation-boundary',
    route: 'ruins',
    planet: {},
    nowMs: NOW_MS,
  });
  assert.equal(getGalaxyRoverExpeditionView(expedition, expedition.readyAtMs - 1).status, 'exploring');
  assert.equal(getGalaxyRoverExpeditionView(expedition, expedition.readyAtMs).status, 'ready');
  assert.equal(getGalaxyRoverExpeditionView({ ...expedition, status: 'claimed' }, expedition.readyAtMs - 1).status, 'claimed');
  assert.equal(getGalaxyRoverExpeditionView({ ...expedition, claimedAtMs: NOW_MS + 8 * HOUR_MS }, expedition.readyAtMs - 1).status, 'claimed');
}

function testClaimStateAndExactOnceRetry() {
  const expedition = buildGalaxyRoverDeparture({
    operationId: 'rover-operation-claim',
    route: 'nebula',
    planet: { layout: [{ itemId: 'expedition_beacon' }] },
    nowMs: NOW_MS,
  });
  const operation = operationFrom(expedition);
  const planet = {
    materials: { biofiber: 3, alloy: 1 },
    roverDiscoveries: [],
    roverExpedition: expedition,
  };

  const early = planGalaxyRoverClaim({
    operationId: expedition.operationId,
    operation,
    planet,
    nowMs: expedition.readyAtMs - 1,
  });
  assert.equal(early.kind, 'not_ready');
  assert.equal(early.readyAtMs, expedition.readyAtMs);

  const firstClaim = planGalaxyRoverClaim({
    operationId: expedition.operationId,
    operation,
    planet,
    nowMs: expedition.readyAtMs,
  });
  assert.equal(firstClaim.kind, 'claimable');
  assert.equal(firstClaim.materials.biofiber, 8);
  assert.equal(firstClaim.roverDiscoveries.length, 1);
  assert.equal(firstClaim.claimResult.isNewDiscovery, true);

  const claimedOperation = {
    ...operation,
    status: 'claimed',
    claimedAtMs: firstClaim.claimResult.claimedAtMs,
    claimResult: firstClaim.claimResult,
  };
  const retry = planGalaxyRoverClaim({
    operationId: expedition.operationId,
    operation: claimedOperation,
    planet: {
      ...planet,
      materials: firstClaim.materials,
      roverDiscoveries: firstClaim.roverDiscoveries,
      roverExpedition: firstClaim.expedition,
    },
    nowMs: expedition.readyAtMs + 5000,
  });
  assert.equal(retry.kind, 'deduplicated');
  assert.deepEqual(retry.claimResult, firstClaim.claimResult);
}

function testRepeatedDiscoveryDoesNotDuplicateCollection() {
  const expedition = buildGalaxyRoverDeparture({
    operationId: 'rover-operation-repeat-discovery',
    route: 'comet',
    planet: {},
    nowMs: NOW_MS,
  });
  const existingDiscovery = {
    ...expedition.discovery,
    firstOperationId: 'older-operation-id',
    discoveredAtMs: NOW_MS - HOUR_MS,
  };
  const claim = planGalaxyRoverClaim({
    operationId: expedition.operationId,
    operation: operationFrom(expedition),
    planet: {
      materials: { alloy: 0 },
      roverDiscoveries: [existingDiscovery],
      roverExpedition: expedition,
    },
    nowMs: expedition.readyAtMs,
  });
  assert.equal(claim.kind, 'claimable');
  assert.equal(claim.claimResult.isNewDiscovery, false);
  assert.equal(claim.roverDiscoveries.length, 1);
  assert.deepEqual(claim.roverDiscoveries[0], existingDiscovery);
}

function testInvalidRouteAndForgedRewardAreRejected() {
  const invalidStart = planGalaxyRoverStart({
    operationId: 'rover-operation-invalid-route',
    route: 'unknown',
    planet: {},
    nowMs: NOW_MS,
  });
  assert.equal(invalidStart.kind, 'invalid_route');

  const expedition = buildGalaxyRoverDeparture({
    operationId: 'rover-operation-forged-reward',
    route: 'ruins',
    planet: {},
    nowMs: NOW_MS,
  });
  const forgedOperation = operationFrom({
    ...expedition,
    reward: { ...expedition.reward, amount: 999 },
  });
  const forgedClaim = planGalaxyRoverClaim({
    operationId: expedition.operationId,
    operation: forgedOperation,
    planet: { materials: {}, roverDiscoveries: [], roverExpedition: expedition },
    nowMs: expedition.readyAtMs,
  });
  assert.equal(forgedClaim.kind, 'invalid_reward');
}

function run() {
  testStableDiscoverySelection();
  testDurationAndRewardBonuses();
  testStartStateAndIdempotency();
  testReadyBoundary();
  testClaimStateAndExactOnceRetry();
  testRepeatedDiscoveryDoesNotDuplicateCollection();
  testInvalidRouteAndForgedRewardAreRejected();
  console.log('Galaxy rover expedition tests passed.');
}

run();
