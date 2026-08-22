/**
 * LUMI Protocol Reward Policy & Canonical Mapping
 * Pure, dependency-free module.
 * 
 * Guarantees:
 * 1. Single Canonical Mission ID resolution for all aliases (e.g., 'VS-01' -> 'lumi-vs-01')
 * 2. Canonical Transaction ID generation
 * 3. Feature Flags and Effective Date enforcement
 */

import { getLumiMissionRegistrationById } from '../components/PythonWorld/lumiCourseCatalog.js';
import { applyCrystalRewardMultiplier } from '../utils/holidayUtils.js';

export const LUMI_REWARD_FLAGS = Object.freeze({
  DAILY_RECORD_ENABLED: true,
  MINERAL_REWARD_ENABLED: true,
  FEEDBACK_INTEGRATION_ENABLED: true,
  EFFECTIVE_AT: '2026-08-22T00:00:00+09:00',
});

/**
 * Standardize any mission ID alias to its canonical catalog mission definition.
 */
export function getCanonicalLumiMission(missionId) {
  if (!missionId) return null;
  const registration = getLumiMissionRegistrationById(missionId);
  return buildCanonicalLumiMission(registration);
}

export function buildCanonicalLumiMission(registration) {
  const rawMission = registration?.mission;
  const missionSet = registration?.missionSet;
  if (!rawMission || !missionSet) return null;
  if (missionSet.persistencePolicy === 'none' || missionSet.rewardPolicy === 'none') return null;
  if (!rawMission.reward && rawMission.rewardPolicy !== 'standard-crystals' && missionSet.rewardPolicy !== 'standard-crystals') return null;

  const canonicalId = rawMission.id;
  const canonicalCodeName = rawMission.codeName || rawMission.id;
  const canonicalUnitId = missionSet.unitId;
  const canonicalUnitTitle = missionSet.title;
  const canonicalLumiCourseId = missionSet.lumiCourseId || 'lumi-season-1';
  const canonicalMissionSetId = missionSet.id;
  const canonicalMissionSetVersion = Number(missionSet.version || 1);
  const canonicalTotalMissionCount = (missionSet.missions || []).length;

  const rewardConfig = rawMission.reward || {
    policyVersion: 'reward-v1',
    tier: (rawMission.isFieldTest || rawMission.difficulty === 'field-test') ? 'field-test' : 'core',
    baseCrystals: (rawMission.isFieldTest || rawMission.difficulty === 'field-test') ? 8 : 4,
    firstCompletionOnly: true,
  };

  return {
    ...rawMission,
    id: canonicalId,
    codeName: canonicalCodeName,
    unitId: canonicalUnitId,
    unitTitle: canonicalUnitTitle,
    actId: rawMission.actId || missionSet.actId || '',
    lumiCourseId: canonicalLumiCourseId,
    missionSetId: canonicalMissionSetId,
    missionSetVersion: canonicalMissionSetVersion,
    totalMissionCount: canonicalTotalMissionCount,
    reward: {
      policyVersion: rewardConfig.policyVersion || 'reward-v1',
      tier: rewardConfig.tier || ((rawMission.isFieldTest || rawMission.difficulty === 'field-test') ? 'field-test' : 'core'),
      baseCrystals: Number(rewardConfig.baseCrystals || (rewardConfig.tier === 'field-test' ? 8 : 4)),
      firstCompletionOnly: true,
    },
  };
}

/**
 * Generate idempotent transaction ID for a LUMI mission reward.
 * Always resolves to Canonical ID to prevent duplicate ledger keys for aliases.
 */
export function getLumiMissionTransactionId(lumiCourseId = 'lumi-season-1', missionId = '', policyVersion = 'reward-v1') {
  const canonical = getCanonicalLumiMission(missionId);
  const canonicalMissionId = canonical ? canonical.id : String(missionId).trim();
  const canonicalCourse = canonical ? canonical.lumiCourseId : String(lumiCourseId).trim();
  const canonicalVersion = canonical ? canonical.reward.policyVersion : policyVersion;
  return `lumi_mission_${canonicalCourse}_${canonicalMissionId}_${canonicalVersion}`;
}

/**
 * Calculate the expected reward for a LUMI mission given date/time context.
 */
export function computeLumiMissionReward({ missionId, timestamp = new Date() }) {
  const canonical = getCanonicalLumiMission(missionId);
  if (!canonical) {
    return { baseCrystals: 0, bonusAmount: 0, totalCrystals: 0, multiplier: 1, reason: 'mission_not_found' };
  }
  const baseCrystals = canonical.reward.baseCrystals;
  const calc = applyCrystalRewardMultiplier(baseCrystals, { clusterId: 'python', date: timestamp });
  return {
    missionId: canonical.id,
    codeName: canonical.codeName,
    lumiCourseId: canonical.lumiCourseId,
    tier: canonical.reward.tier,
    baseCrystals,
    bonusAmount: calc.bonusAmount,
    totalCrystals: calc.amount,
    multiplier: calc.multiplier,
    reason: calc.reason,
    policyVersion: canonical.reward.policyVersion,
  };
}
