const assert = require('node:assert/strict');

const {
  buildGalaxyRoverDeparture,
  buildGalaxyRoverEventPayload,
  getGalaxyRoverExpeditionView,
  planGalaxyRoverClaim,
  planGalaxyRoverReportAcknowledgement,
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

  const next = buildGalaxyRoverDeparture({
    operationId: 'rover-operation-0002',
    route: 'nebula',
    planet: { roverDiscoveries: [first.discovery] },
    nowMs: NOW_MS,
  });
  assert.equal(next.discovery.id, 'nebula_aether_seed');
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

  const afterLegacyClaim = planGalaxyRoverStart({
    operationId: 'rover-operation-after-claim',
    route: 'ruins',
    planet: { roverExpedition: { ...expedition, status: 'claimed', claimedAtMs: NOW_MS + 8 * HOUR_MS } },
    nowMs: NOW_MS + 8 * HOUR_MS,
  });
  assert.equal(afterLegacyClaim.kind, 'startable');

  const afterClaim = planGalaxyRoverStart({
    operationId: 'rover-operation-after-report',
    route: 'ruins',
    planet: { roverExpedition: { ...expedition, reportFlowVersion: 2, status: 'claimed', claimedAtMs: NOW_MS + 8 * HOUR_MS } },
    nowMs: NOW_MS + 8 * HOUR_MS,
    reportFlowVersion: 2,
  });
  assert.equal(afterClaim.kind, 'active');
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
  assert.equal(claim.roverDiscoveries[0].firstOperationId, existingDiscovery.firstOperationId);
  assert.equal(claim.roverDiscoveries[0].observationCount, 2);
  assert.equal(claim.roverDiscoveries[0].lastOperationId, expedition.operationId);
}

function testReportAcknowledgementOnlyClearsCurrentClaimedSlot() {
  const expedition = buildGalaxyRoverDeparture({
    operationId: 'rover-operation-report', route: 'ruins', planet: {}, nowMs: NOW_MS, reportFlowVersion: 2,
  });
  const operation = { ...operationFrom(expedition), status: 'claimed', claimedAtMs: expedition.readyAtMs, claimResult: { operationId: expedition.operationId } };
  assert.equal(planGalaxyRoverReportAcknowledgement({
    operationId: expedition.operationId,
    operation,
    planet: { roverExpedition: { ...expedition, status: 'claimed', claimedAtMs: expedition.readyAtMs } },
  }).kind, 'acknowledgeable');
  assert.equal(planGalaxyRoverReportAcknowledgement({
    operationId: expedition.operationId,
    operation,
    planet: { roverExpedition: { ...expedition, operationId: 'another-operation', status: 'claimed' } },
  }).kind, 'stale_operation');
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

function testRoverEventPayloadBuilder() {
  // 출항 이벤트는 발견/rarity/elapsedMs 없이 전환 기본값만 갖는다.
  const dispatched = buildGalaxyRoverEventPayload('dispatched', {
    operationId: 'op-1234',
    route: 'nebula',
    expeditionNo: 7,
    reportFlowVersion: 2,
    nowMs: NOW_MS,
  });
  assert.equal(dispatched.type, 'dispatched');
  assert.equal(dispatched.operationId, 'op-1234');
  assert.equal(dispatched.route, 'nebula');
  assert.equal(dispatched.expeditionNo, 7);
  assert.equal(dispatched.reportFlowVersion, 2);
  assert.equal(dispatched.serverNowMs, NOW_MS);
  assert.equal('isNewDiscovery' in dispatched, false);
  assert.equal('rarity' in dispatched, false);
  assert.equal('elapsedMs' in dispatched, false);

  // 수령 이벤트만 발견 여부·등급·출항 대비 경과 시간을 포함한다.
  const claimed = buildGalaxyRoverEventPayload('claimed', {
    operationId: 'op-1234',
    route: 'ruins',
    expeditionNo: 7,
    reportFlowVersion: 2,
    nowMs: NOW_MS + 6 * HOUR_MS,
    isNewDiscovery: true,
    rarity: 'legendary',
    elapsedMs: 6 * HOUR_MS,
  });
  assert.equal(claimed.type, 'claimed');
  assert.equal(claimed.isNewDiscovery, true);
  assert.equal(claimed.rarity, 'legendary');
  assert.equal(claimed.elapsedMs, 6 * HOUR_MS);

  // 보관 이벤트는 수령 대비 경과만 갖고 발견 필드는 없다.
  const acknowledged = buildGalaxyRoverEventPayload('acknowledged', {
    operationId: 'op-1234',
    route: 'ruins',
    expeditionNo: 7,
    reportFlowVersion: 2,
    nowMs: NOW_MS + 6 * HOUR_MS + 30 * 60 * 1000,
    elapsedMs: 30 * 60 * 1000,
  });
  assert.equal(acknowledged.type, 'acknowledged');
  assert.equal(acknowledged.elapsedMs, 30 * 60 * 1000);
  assert.equal('isNewDiscovery' in acknowledged, false);
  assert.equal('rarity' in acknowledged, false);

  // 경과 시간이 음수이면 기록하지 않는(0 처리로 정규화하지 않고 생략).
  const negativeElapsed = buildGalaxyRoverEventPayload('acknowledged', {
    operationId: 'op-1234',
    nowMs: NOW_MS,
    elapsedMs: -50,
  });
  assert.equal('elapsedMs' in negativeElapsed, false);
}

function run() {
  testStableDiscoverySelection();
  testDurationAndRewardBonuses();
  testStartStateAndIdempotency();
  testReadyBoundary();
  testClaimStateAndExactOnceRetry();
  testRepeatedDiscoveryDoesNotDuplicateCollection();
  testReportAcknowledgementOnlyClearsCurrentClaimedSlot();
  testInvalidRouteAndForgedRewardAreRejected();
  testRoverEventPayloadBuilder();
  console.log('Galaxy rover expedition tests passed.');
}

run();
