import assert from 'node:assert/strict';
import { VERTICAL_SLICE_MISSIONS, ACT_1_MISSIONS, getLumiMissionById } from '../src/components/PythonWorld/lumiCourseCatalog.js';
import {
  LUMI_REWARD_FLAGS,
  getCanonicalLumiMission,
  getLumiMissionTransactionId,
  computeLumiMissionReward,
} from '../src/services/lumiRewardPolicy.js';

console.log('=== Running Phase 8: LUMI Rewards, Canonical ID, & Idempotent Ledger Tests ===');

// 1. Check Vertical Slice Catalog Rewards
console.log('[Test 1] Vertical Slice Mission Catalog Reward configuration...');
assert.equal(VERTICAL_SLICE_MISSIONS.length, 10, 'Must have 10 vertical slice missions');

let totalBaseCrystals = 0;
VERTICAL_SLICE_MISSIONS.forEach((m) => {
  assert.ok(m.reward, `Mission ${m.id} must have reward metadata`);
  assert.equal(m.reward.policyVersion, 'reward-v1');
  assert.equal(m.reward.firstCompletionOnly, true);
  if (m.reward.tier === 'field-test') {
    assert.equal(m.reward.baseCrystals, 8, `Field test ${m.id} must have 8 base crystals`);
  } else {
    assert.equal(m.reward.tier, 'core');
    assert.equal(m.reward.baseCrystals, 4, `Core mission ${m.id} must have 4 base crystals`);
  }
  totalBaseCrystals += m.reward.baseCrystals;
});

assert.equal(totalBaseCrystals, 48, 'Total base crystals for 10 vertical slice missions must be exactly 48 (8 core * 4 + 2 field-test * 8 = 48)');
console.log('  -> Total base crystals verified: 48');

// 2. Check ACT 1 Catalog Rewards
console.log('[Test 2] ACT 1 Missions Catalog Reward configuration...');
assert.equal(ACT_1_MISSIONS.length, 6, 'ACT 1 must have 6 missions');
ACT_1_MISSIONS.forEach((m) => {
  assert.ok(m.reward, `ACT 1 mission ${m.id} must have reward metadata`);
  if (m.reward.tier === 'field-test') {
    assert.equal(m.reward.baseCrystals, 8);
  } else {
    assert.equal(m.reward.baseCrystals, 4);
  }
});
console.log('  -> ACT 1 mission rewards verified');

// 3. Test Canonical Mission ID Resolution for All Aliases
console.log('[Test 3] Canonical Mission ID Resolution & Single Source of Truth...');
const canonicalFromAlias = getCanonicalLumiMission('VS-01');
const canonicalFromFullId = getCanonicalLumiMission('lumi-vs-01');
const canonicalFromLowercase = getCanonicalLumiMission('vs-01');

assert.ok(canonicalFromAlias, 'VS-01 canonical resolved');
assert.ok(canonicalFromFullId, 'lumi-vs-01 canonical resolved');
assert.ok(canonicalFromLowercase, 'vs-01 canonical resolved');

assert.equal(canonicalFromAlias.id, 'lumi-vs-01');
assert.equal(canonicalFromFullId.id, 'lumi-vs-01');
assert.equal(canonicalFromLowercase.id, 'lumi-vs-01');

assert.equal(canonicalFromAlias.codeName, 'VS-01');
assert.equal(canonicalFromAlias.unitId, 'lumi_protocol_vertical_slice');
assert.equal(canonicalFromAlias.lumiCourseId, 'lumi-season-1');
assert.equal(canonicalFromAlias.totalMissionCount, 10);
assert.equal(canonicalFromAlias.reward.baseCrystals, 4);

const vs06Canonical = getCanonicalLumiMission('VS-06');
assert.equal(vs06Canonical.id, 'lumi-vs-06');
assert.equal(vs06Canonical.reward.tier, 'field-test');
assert.equal(vs06Canonical.reward.baseCrystals, 8);

const act11Canonical = getCanonicalLumiMission('1-1');
assert.equal(act11Canonical.id, 'lumi-act1-01');
assert.equal(act11Canonical.unitId, 'lumi_protocol_act_1_command');
assert.equal(act11Canonical.totalMissionCount, 6);

console.log('  -> Canonical mission mappings verified');

// 4. Test Idempotent Transaction ID Generation (Same Key for All Aliases)
console.log('[Test 4] Idempotent Transaction ID: Same Key for Aliases...');
const txIdAlias = getLumiMissionTransactionId('lumi-season-1', 'VS-01');
const txIdCanonical = getLumiMissionTransactionId('lumi-season-1', 'lumi-vs-01');
const txIdCustomCourse = getLumiMissionTransactionId('hacker-custom-course', 'VS-01');

assert.equal(txIdAlias, 'lumi_mission_lumi-season-1_lumi-vs-01_reward-v1');
assert.equal(txIdCanonical, 'lumi_mission_lumi-season-1_lumi-vs-01_reward-v1');
assert.equal(txIdCustomCourse, 'lumi_mission_lumi-season-1_lumi-vs-01_reward-v1', 'Custom course must be overridden by canonical course ID');
assert.equal(txIdAlias, txIdCanonical, 'Both aliases MUST generate the EXACT same transaction key!');

console.log('  -> Transaction ID alias deduplication verified');

// 5. Test Reward Calculation with Multipliers
console.log('[Test 5] Reward calculation and multiplier testing...');
// Inside class time (weekday 19:20): 1.0x -> 4 base, 4 total
const calc1 = computeLumiMissionReward({
  missionId: 'VS-01',
  timestamp: new Date('2026-08-20T19:20:00+09:00'),
});
assert.equal(calc1.baseCrystals, 4);
assert.equal(calc1.multiplier, 1.0);
assert.equal(calc1.totalCrystals, 4);

// Outside class time (weekday 10:00): 1.2x -> 4 base, ceil(4 * 1.2) = 5
const calc2 = computeLumiMissionReward({
  missionId: 'VS-01',
  timestamp: new Date('2026-08-20T10:00:00+09:00'),
});
assert.equal(calc2.baseCrystals, 4);
assert.equal(calc2.multiplier, 1.2);
assert.equal(calc2.totalCrystals, 5);

// Field test outside class time (weekday 10:00): 1.2x -> 8 base, ceil(8 * 1.2) = 10
const calc3 = computeLumiMissionReward({
  missionId: 'VS-06',
  timestamp: new Date('2026-08-20T10:00:00+09:00'),
});
assert.equal(calc3.baseCrystals, 8);
assert.equal(calc3.multiplier, 1.2);
assert.equal(calc3.totalCrystals, 10);

// Weekend / Rest day multiplier 1.5x on core (4 * 1.5 = 6)
const calc4 = computeLumiMissionReward({
  missionId: 'VS-01',
  timestamp: new Date('2026-08-23T10:00:00+09:00'),
});
assert.equal(calc4.baseCrystals, 4);
assert.equal(calc4.multiplier, 1.5);
assert.equal(calc4.totalCrystals, 6);

// Weekend / Rest day multiplier 1.5x on field test (8 * 1.5 = 12)
const calc5 = computeLumiMissionReward({
  missionId: 'VS-06',
  timestamp: new Date('2026-08-23T10:00:00+09:00'),
});
assert.equal(calc5.baseCrystals, 8);
assert.equal(calc5.multiplier, 1.5);
assert.equal(calc5.totalCrystals, 12);

console.log('  -> Multiplier reward computations verified');

// 6. Test public-beta learning policies
console.log('[Test 6] Testing Student-Beta Learning Policies...');
assert.equal(LUMI_REWARD_FLAGS.MINERAL_REWARD_ENABLED, true, 'Mineral rewards must be enabled for the student beta');
assert.equal(LUMI_REWARD_FLAGS.DAILY_RECORD_ENABLED, true, 'Daily learning records remain enabled independently of mineral rewards');
assert.equal(LUMI_REWARD_FLAGS.FEEDBACK_INTEGRATION_ENABLED, true, 'Assignment feedback evidence must be enabled');

console.log('  -> Minerals, daily records and feedback evidence are enabled');

console.log('=== All Phase 8 Tests Passed! ===\n');
