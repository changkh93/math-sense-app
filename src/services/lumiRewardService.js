import { doc, runTransaction, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../firebase.js';
import { applyCrystalRewardMultiplier } from '../utils/holidayUtils.js';
import {
  LUMI_REWARD_FLAGS,
  getCanonicalLumiMission,
  getLumiMissionTransactionId,
  computeLumiMissionReward,
} from './lumiRewardPolicy.js';

export {
  LUMI_REWARD_FLAGS,
  getCanonicalLumiMission,
  getLumiMissionTransactionId,
  computeLumiMissionReward,
};

/**
 * Claim crystal reward for a completed LUMI Protocol mission.
 * Idempotent Firestore transaction with strict canonical resolution and feature gating:
 * - Validates feature flag and effectiveAt date
 * - Resolves all aliases to Canonical Mission definitions
 * - Ensures user document exists (fails closed if user not found)
 * - Updates user crystals & stats
 * - Updates learning_progress/{unitId}.missionLab
 * - Records crystal_transactions ledger
 * - Records history entry
 */
export async function claimLumiMissionReward({
  userId,
  missionId,
  stars = 2,
  assistanceLevel = 0,
}) {
  if (!userId || !missionId) {
    return { rewarded: false, crystalsEarned: 0, reason: 'missing_args' };
  }

  const rewardEnabled = Boolean(
    LUMI_REWARD_FLAGS.MINERAL_REWARD_ENABLED &&
    Date.now() >= new Date(LUMI_REWARD_FLAGS.EFFECTIVE_AT).getTime()
  );
  const dailyRecordEnabled = Boolean(LUMI_REWARD_FLAGS.DAILY_RECORD_ENABLED);
  if (!rewardEnabled && !dailyRecordEnabled) {
    return { rewarded: false, crystalsEarned: 0, reason: 'completion_features_disabled' };
  }

  // Canonical mission resolution remains release-gated and fail-closed.
  const canonical = getCanonicalLumiMission(missionId);
  if (!canonical) {
    return { rewarded: false, crystalsEarned: 0, reason: 'mission_not_found' };
  }

  const {
    id: canonicalMissionId,
    codeName,
    unitId: canonicalUnitId,
    unitTitle: canonicalUnitTitle,
    lumiCourseId: canonicalLumiCourseId,
    missionSetId: canonicalMissionSetId,
    totalMissionCount: canonicalTotalCount,
    reward: rewardConfig,
  } = canonical;

  const policyVersion = rewardConfig.policyVersion || 'reward-v1';
  const baseCrystals = Number(rewardConfig.baseCrystals || 4);
  const rewardKey = `${canonicalLumiCourseId}:${canonicalMissionId}:${policyVersion}`;
  const txId = `lumi_mission_${canonicalLumiCourseId}_${canonicalMissionId}_${policyVersion}`;
  const historyDocId = `lumi_protocol_${canonicalLumiCourseId}_${canonicalMissionId}_${policyVersion}`;

  const userRef = doc(db, 'users', userId);
  const progressRef = doc(db, 'users', userId, 'learning_progress', canonicalUnitId);
  const txRef = doc(db, 'users', userId, 'crystal_transactions', txId);
  const historyRef = doc(db, 'users', userId, 'history', historyDocId);

  try {
    return await runTransaction(db, async (transaction) => {
      const [userSnap, progressSnap, txSnap] = await Promise.all([
        transaction.get(userRef),
        transaction.get(progressRef),
        rewardEnabled ? transaction.get(txRef) : Promise.resolve(null),
      ]);

      // 3. User Existence Check: Fail closed if user document does not exist (no phantom docs)
      if (!userSnap.exists()) {
        throw new Error('user_not_found');
      }

      const progressData = progressSnap.exists() ? progressSnap.data() : {};
      const missionLab = progressData.missionLab || {};
      const rewardedKeys = new Set(missionLab.rewardedMissionKeys || []);
      const completedIds = new Set(missionLab.completedMissionIds || []);
      const wasCompleted = completedIds.has(canonicalMissionId);
      const alreadyRewarded = Boolean(txSnap?.exists?.() || rewardedKeys.has(rewardKey));
      const previousStars = Number(missionLab.bestStarsByMission?.[canonicalMissionId] || 0);
      const previousAssistance = missionLab.bestAssistanceByMission?.[canonicalMissionId];
      const evidenceImproved = (
        Number(stars || 0) > previousStars ||
        previousAssistance === undefined ||
        Number(assistanceLevel || 0) < Number(previousAssistance)
      );
      const shouldGrantReward = rewardEnabled && !alreadyRewarded;

      if (wasCompleted && !evidenceImproved && !shouldGrantReward) {
        return {
          rewarded: false,
          alreadyRewarded,
          completionRecorded: true,
          crystalsEarned: Number(txSnap?.data?.()?.amount || 0),
          reason: alreadyRewarded ? 'already_rewarded' : 'already_recorded',
        };
      }

      const rewardCalculation = shouldGrantReward
        ? applyCrystalRewardMultiplier(baseCrystals, { clusterId: 'python', date: new Date() })
        : { amount: 0, bonusAmount: 0, multiplier: 1, reason: 'reward_feature_disabled' };
      const finalAmount = Number(rewardCalculation.amount || 0);
      const bonusAmount = Number(rewardCalculation.bonusAmount || 0);

      completedIds.add(canonicalMissionId);
      if (shouldGrantReward) rewardedKeys.add(rewardKey);
      const newCompletedCount = completedIds.size;
      const isUnitComplete = newCompletedCount >= canonicalTotalCount;

      const bestStarsByMission = { ...(missionLab.bestStarsByMission || {}) };
      bestStarsByMission[canonicalMissionId] = Math.max(bestStarsByMission[canonicalMissionId] || 0, stars);

      const bestAssistanceByMission = { ...(missionLab.bestAssistanceByMission || {}) };
      if (bestAssistanceByMission[canonicalMissionId] === undefined || assistanceLevel < bestAssistanceByMission[canonicalMissionId]) {
        bestAssistanceByMission[canonicalMissionId] = assistanceLevel;
      }

      const currentTotalCrystals = Number(missionLab.crystalsEarnedTotal || 0) + finalAmount;

      const userUpdates = {};
      if (shouldGrantReward && finalAmount > 0) {
        userUpdates.crystals = increment(finalAmount);
        userUpdates['stats.totalCrystalsEarned'] = increment(finalAmount);
      }
      if (!wasCompleted) {
        userUpdates['stats.lumiMissionsCompleted'] = increment(1);
      }
      if (Object.keys(userUpdates).length > 0) transaction.update(userRef, userUpdates);

      // 8. Update learning_progress/{unitId}.missionLab
      transaction.set(progressRef, {
        unitId: canonicalUnitId,
        unitTitle: canonicalUnitTitle,
        clusterId: 'python',
        updatedAt: serverTimestamp(),
        missionLab: {
          schemaVersion: 3,
          experienceType: 'lumi_protocol',
          lumiCourseId: canonicalLumiCourseId,
          missionSetId: canonicalMissionSetId,
          currentMissionId: canonicalMissionId,
          completedMissionIds: Array.from(completedIds),
          completedMissionKeys: Array.from(completedIds),
          rewardedMissionKeys: Array.from(rewardedKeys),
          completedCount: newCompletedCount,
          totalCount: canonicalTotalCount,
          isCompleted: isUnitComplete,
          lastActiveAt: serverTimestamp(),
          bestStarsByMission,
          bestAssistanceByMission,
          crystalsEarnedTotal: currentTotalCrystals,
        },
      }, { merge: true });

      if (shouldGrantReward) {
        transaction.set(txRef, {
          type: 'lumi_protocol_mission_reward',
          transactionId: txId,
          rewardKey,
          amount: finalAmount,
          description: `LUMI 미션 완료 보상 (${codeName} · ${canonical.title})`,
          metadata: {
            experienceType: 'lumi_protocol',
            lumiCourseId: canonicalLumiCourseId,
            unitId: canonicalUnitId,
            unitTitle: canonicalUnitTitle,
            missionSetId: canonicalMissionSetId,
            missionId: canonicalMissionId,
            codeName,
            missionTitle: canonical.title,
            rewardPolicyVersion: policyVersion,
            baseCrystals,
            bonusAmount,
            multiplier: rewardCalculation.multiplier,
            multiplierReason: rewardCalculation.reason,
            stars,
            assistanceLevel,
          },
          timestamp: serverTimestamp(),
        });
      }

      // 10. Write history entry
      if (dailyRecordEnabled) {
        transaction.set(historyRef, {
          type: 'lumi_protocol',
          activityType: 'lumi_protocol_mission_complete',
          historyScope: 'mission',
          clusterId: 'python',
          lumiCourseId: canonicalLumiCourseId,
          unitId: canonicalUnitId,
          unitTitle: canonicalUnitTitle,
          missionSetId: canonicalMissionSetId,
          missionId: canonicalMissionId,
          codeName,
          missionTitle: canonical.title,
          actId: canonical.actId || canonicalMissionSetId || 'act-0-awakening',
          concepts: canonical.concepts || canonical.conceptEvidence?.mustUse || [],
          completed: true,
          completionModalities: isUnitComplete ? { missionLab: true } : {},
          stars,
          assistanceLevel,
          rewardPolicyVersion: policyVersion,
          baseCrystals: shouldGrantReward ? baseCrystals : 0,
          bonusCrystals: bonusAmount,
          crystalsEarned: finalAmount,
          crystalTransactionId: shouldGrantReward || alreadyRewarded ? txId : null,
          timestamp: serverTimestamp(),
        }, { merge: true });
      }

      return {
        rewarded: shouldGrantReward,
        alreadyRewarded,
        completionRecorded: true,
        crystalsEarned: finalAmount,
        baseCrystals,
        bonusCrystals: bonusAmount,
        multiplier: Number(rewardCalculation.multiplier || 1),
        multiplierReason: rewardCalculation.reason,
        reason: shouldGrantReward ? 'rewarded' : 'completion_recorded',
      };
    });
  } catch (error) {
    console.error('LUMI reward transaction error:', error);
    return {
      rewarded: false,
      alreadyRewarded: false,
      crystalsEarned: 0,
      error: error?.message || 'transaction_failed',
    };
  }
}
