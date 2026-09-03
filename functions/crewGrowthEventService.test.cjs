const test = require('node:test');
const assert = require('node:assert/strict');
const memoryFirestore = require('./testHelpers/firestoreMemory.cjs');
const service = require('./crewGrowthEventService.cjs');
const { CAMPAIGN_ID, VERIFICATION_HOLD_MS } = require('./crewGrowthEventPolicy.cjs');
const now = 2_000_000_000;
function fixture(count = 20) {
  const members = Array.from({ length: count }, (_, i) => `u${i}`);
  const initial = { 'crews/a': { status: 'approved', leaderId: members[0], memberIds: members } };
  for (const uid of members) {
    initial[`users/${uid}`] = { crewId: 'a', crystals: 5 };
    initial[`crewGrowthParticipantLocks/${CAMPAIGN_ID}_${uid}`] = { originCrewId: 'a', status: 'active', boundAtMs: 1 };
  }
  return memoryFirestore(initial);
}
const ledger = (tx, uid, id, payload) => tx.set({ path: `ledger/${uid}_${id}` }, payload);
test('verification stores a real Timestamp without callers supplying dependencies', async () => {
  const db = fixture();
  await service.reconcileCrewGrowthEventV2(db, 'a', { nowMs: now });
  assert.equal(db.data.get('crews/a').growthEventNextVerificationEndsAt.toMillis(), now + VERIFICATION_HOLD_MS);
  const writes = db.writes;
  await service.reconcileCrewGrowthEventV2(db, 'a', { nowMs: now + 1000 });
  assert.equal(db.writes, writes, 'unchanged progress must not write');
});
test('duplicate finalization pays once, nests rewarded status correctly and wakes tier40', async () => {
  const db = fixture(40);
  await service.reconcileCrewGrowthEventV2(db, 'a', { nowMs: now });
  const options = { nowMs: now + VERIFICATION_HOLD_MS, allowReward: true, recordCrystalTransactionFn: ledger };
  await Promise.all([service.reconcileCrewGrowthEventV2(db, 'a', options), service.reconcileCrewGrowthEventV2(db, 'a', options)]);
  assert.equal(db.data.get('users/u0').crystals, 1005);
  const crew = db.data.get('crews/a');
  assert.equal(crew.growthEventV2.tiers.t20.status, 'rewarded');
  assert.equal(crew['growthEventV2.tiers'], undefined);
  assert.equal(crew.growthEventV2.tiers.t40.status, 'verifying');
  await service.reconcileCrewGrowthEventV2(db, 'a', { ...options, nowMs: now + 2 * VERIFICATION_HOLD_MS });
  assert.equal(db.data.get('users/u0').crystals, 5005);
});
test('replacement participant cannot inherit a departed snapshot participant countdown', async () => {
  const db = fixture();
  await service.reconcileCrewGrowthEventV2(db, 'a', { nowMs: now });
  db.data.get('crews/a').memberIds = [...Array.from({ length: 19 }, (_, i) => `u${i}`), 'replacement'];
  db.data.set('users/replacement', { crewId: 'a' });
  db.data.set(`crewGrowthParticipantLocks/${CAMPAIGN_ID}_replacement`, { originCrewId: 'a', status: 'active', boundAtMs: 1 });
  await service.reconcileCrewGrowthEventV2(db, 'a', { nowMs: now + 1000 });
  assert.equal(db.data.get('crews/a').growthEventV2.tiers.t20.status, 'collecting');
});
test('payout rechecks actual membership', async () => {
  const db = fixture();
  await service.reconcileCrewGrowthEventV2(db, 'a', { nowMs: now });
  db.data.get('users/u1').crewId = 'b';
  await service.payoutTierReward(db, 'a', 't20', { nowMs: now + VERIFICATION_HOLD_MS, recordCrystalTransactionFn: ledger });
  assert.equal(db.data.get('users/u0').crystals, 5);
  assert.equal(db.data.get('crews/a').growthEventV2.tiers.t20.status, 'collecting');
});
test('reward kill switch prevents balances and claims from changing', async () => {
  const db = fixture();
  await service.reconcileCrewGrowthEventV2(db, 'a', { nowMs: now });
  db.data.set('systemConfig/crewGrowthEvent', { rewardEnabled: false });
  await service.payoutTierReward(db, 'a', 't20', { nowMs: now + VERIFICATION_HOLD_MS, recordCrystalTransactionFn: ledger });
  assert.equal(db.data.get('users/u0').crystals, 5);
  assert.equal([...db.data.keys()].some(path => path.startsWith('crewGrowthRewardClaims/')), false);
});
test('tier budget holds the whole roster without partially paying', async () => {
  const db = fixture();
  await service.reconcileCrewGrowthEventV2(db, 'a', { nowMs: now });
  db.data.set('systemConfig/crewGrowthEvent', { maxTierPayoutOre: 19999 });
  await service.payoutTierReward(db, 'a', 't20', { nowMs: now + VERIFICATION_HOLD_MS, recordCrystalTransactionFn: ledger });
  assert.equal(db.data.get('users/u0').crystals, 5);
  assert.equal(db.data.get('crews/a').growthEventV2.tiers.t20.payoutBlockedReason, 'payout_capacity_or_budget');
});
test('immature memberships schedule a wakeup even below target', async () => {
  const db = fixture(1);
  db.data.get(`crewGrowthParticipantLocks/${CAMPAIGN_ID}_u0`).boundAtMs = now;
  await service.reconcileCrewGrowthEventV2(db, 'a', { nowMs: now });
  assert.equal(db.data.get('crews/a').growthEventNextVerificationEndsAt.toMillis(), now + VERIFICATION_HOLD_MS);
});
test('forfeit cannot be undone by rejoining another or original crew', async () => {
  const db = fixture(1);
  await db.runTransaction((tx) => service.forfeitParticipantLock(db, tx, 'u0', 'a'));
  await db.runTransaction((tx) => service.ensureParticipantLock(db, tx, 'u0', 'b'));
  await db.runTransaction((tx) => service.ensureParticipantLock(db, tx, 'u0', 'a'));
  assert.equal(db.data.get(`crewGrowthParticipantLocks/${CAMPAIGN_ID}_u0`).status, 'forfeited');
});
