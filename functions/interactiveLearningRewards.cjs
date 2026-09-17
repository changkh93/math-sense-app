"use strict";

const {
  getKSTWeekMondayString,
  resolveInteractiveLearningCompletion,
} = require("./interactiveLearningRewardPolicy.cjs");

module.exports = function registerInteractiveLearningRewards({ functions, admin, callableFunctions }) {
  const completeInteractiveLearningActivity = callableFunctions.https.onCall(async (data, context) => {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const completion = resolveInteractiveLearningCompletion(data);
    if (!completion.ok) {
      throw new functions.https.HttpsError("invalid-argument", "지원하지 않는 체험 학습 완료 정보입니다.");
    }

    const db = admin.firestore();
    const userRef = db.collection("users").doc(uid);
    const historyRef = userRef.collection("history").doc(completion.historyRecordId);
    const ledgerRef = userRef.collection("crystal_transactions").doc(completion.rewardRecordId);
    const result = await db.runTransaction(async (transaction) => {
      const [userSnap, historySnap, ledgerSnap] = await Promise.all([
        transaction.get(userRef),
        transaction.get(historyRef),
        transaction.get(ledgerRef),
      ]);
      const alreadyRecordedToday = historySnap.exists;
      const alreadyRewarded = ledgerSnap.exists;
      if (alreadyRecordedToday && alreadyRewarded) {
        return { alreadyRecordedToday, alreadyRewarded, crystalsEarned: 0 };
      }

      const reward = alreadyRewarded ? 0 : completion.activity.reward;
      const user = userSnap.exists ? userSnap.data() : {};
      const mondayKST = getKSTWeekMondayString();
      const growth = {
        dailyGrowth: user.dailyGrowthDate === completion.dateKey ? Number(user.dailyGrowth || 0) + reward : reward,
        dailyGrowthDate: completion.dateKey,
        weeklyGrowth: user.weeklyGrowthMonday === mondayKST ? Number(user.weeklyGrowth || 0) + reward : reward,
        weeklyGrowthMonday: mondayKST,
      };
      const common = {
        activityId: completion.activityId,
        completionKey: completion.completionKey,
        dateKey: completion.dateKey,
        unitId: `interactive_${completion.activityId}`,
        unitTitle: completion.activity.title,
        regionId: completion.activity.regionId,
        regionTitle: completion.activity.regionTitle,
        clusterId: "cluster_elementary",
        experienceType: "interactive_learning",
        metrics: completion.metrics,
      };

      if (!alreadyRewarded) {
        transaction.set(userRef, {
          crystals: admin.firestore.FieldValue.increment(reward),
          lifetimeLearningCrystalsEarned: admin.firestore.FieldValue.increment(reward),
          ...growth,
        }, { merge: true });
        transaction.create(ledgerRef, {
          amount: reward,
          type: "interactive_learning_reward",
          description: `${completion.activity.title} 완료`,
          metadata: common,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      if (!alreadyRecordedToday) {
        transaction.create(historyRef, {
          ...common,
          type: "interactive_learning",
          activityType: "interactive_learning_complete",
          completed: true,
          crystalsEarned: reward,
          crystalTransactionId: alreadyRewarded ? null : completion.rewardRecordId,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      return { alreadyRecordedToday, alreadyRewarded, crystalsEarned: reward };
    });

    return {
      success: true,
      recorded: !result.alreadyRecordedToday,
      rewarded: result.crystalsEarned > 0,
      alreadyRecordedToday: result.alreadyRecordedToday,
      alreadyRewarded: result.alreadyRewarded,
      crystalsEarned: result.crystalsEarned,
      title: completion.activity.title,
      completionKey: completion.completionKey,
    };
  });

  return { completeInteractiveLearningActivity };
};
