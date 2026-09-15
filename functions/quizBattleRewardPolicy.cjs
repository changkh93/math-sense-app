const QUIZ_BATTLE_DAILY_ORE_CAP = 500;
const QUIZ_BATTLE_DAILY_SCOPE_REWARD_LIMIT = 3;
const QUIZ_BATTLE_DAILY_OPPONENT_LIMIT = 3;

// 같은 유닛/누적 범위를 하루에 되풀이할 때의 보상률이다.
// 1회는 실력 확인으로 전액 인정하고, 이후에는 복습은 허용하되
// 새 유닛 학습보다 광석 파밍 효율이 확실히 낮아지게 한다.
const QUIZ_BATTLE_SCOPE_REWARD_PERCENTAGES = Object.freeze([100, 50, 20]);

function calculateQuizBattleRewardPolicy({
  requestedReward = 0,
  scopeCount = 0,
  opponentCount = 0,
  totalOre = 0,
  accessEligible = false,
  isAI = false,
} = {}) {
  const safeRequestedReward = Math.max(0, Math.floor(Number(requestedReward) || 0));
  const safeScopeCount = Math.max(0, Math.floor(Number(scopeCount) || 0));
  const safeOpponentCount = Math.max(0, Math.floor(Number(opponentCount) || 0));
  const safeTotalOre = Math.max(0, Math.floor(Number(totalOre) || 0));
  const scopeRewardPercent = QUIZ_BATTLE_SCOPE_REWARD_PERCENTAGES[safeScopeCount] || 0;
  const repeatEligible = safeScopeCount < QUIZ_BATTLE_DAILY_SCOPE_REWARD_LIMIT
    && safeOpponentCount < QUIZ_BATTLE_DAILY_OPPONENT_LIMIT;
  const rewardEligible = accessEligible === true && repeatEligible;
  const competitiveEligible = rewardEligible && isAI !== true;
  const aiTrainingEligible = rewardEligible && isAI === true;
  const diminishedReward = rewardEligible
    ? Math.floor((safeRequestedReward * scopeRewardPercent) / 100)
    : 0;
  const remainingDailyOre = Math.max(0, QUIZ_BATTLE_DAILY_ORE_CAP - safeTotalOre);
  const reward = Math.min(diminishedReward, remainingDailyOre);

  let reason = "";
  if (accessEligible !== true) reason = "battle_access_inactive";
  else if (safeScopeCount >= QUIZ_BATTLE_DAILY_SCOPE_REWARD_LIMIT) reason = "scope_repeat_limit";
  else if (safeOpponentCount >= QUIZ_BATTLE_DAILY_OPPONENT_LIMIT) reason = "opponent_repeat_limit";
  else if (remainingDailyOre <= 0) reason = "daily_ore_cap";
  else if (reward < diminishedReward) reason = "daily_ore_cap_partial";
  else if (scopeRewardPercent < 100) reason = "scope_reward_reduced";

  return {
    reward,
    requestedReward: safeRequestedReward,
    reason,
    accessEligible: accessEligible === true,
    rewardEligible,
    competitiveEligible,
    aiTrainingEligible,
    scopeRewardAttempt: safeScopeCount + 1,
    scopeRewardPercent,
    nextScopeRewardPercent: QUIZ_BATTLE_SCOPE_REWARD_PERCENTAGES[safeScopeCount + 1] || 0,
    remainingDailyOre,
  };
}

module.exports = {
  QUIZ_BATTLE_DAILY_ORE_CAP,
  QUIZ_BATTLE_DAILY_SCOPE_REWARD_LIMIT,
  QUIZ_BATTLE_DAILY_OPPONENT_LIMIT,
  QUIZ_BATTLE_SCOPE_REWARD_PERCENTAGES,
  calculateQuizBattleRewardPolicy,
};
