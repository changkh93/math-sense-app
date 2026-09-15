const test = require('node:test');
const assert = require('node:assert/strict');
const {
  QUIZ_BATTLE_SCOPE_REWARD_PERCENTAGES,
  calculateQuizBattleRewardPolicy,
} = require('./quizBattleRewardPolicy.cjs');

test('같은 학습 범위의 하루 보상은 100% → 50% → 20%로 감소한다', () => {
  const rewards = [0, 1, 2].map((scopeCount) => calculateQuizBattleRewardPolicy({
    requestedReward: 50,
    scopeCount,
    opponentCount: scopeCount,
    totalOre: 0,
    accessEligible: true,
  }));

  assert.deepEqual(QUIZ_BATTLE_SCOPE_REWARD_PERCENTAGES, [100, 50, 20]);
  assert.deepEqual(rewards.map((item) => item.reward), [50, 25, 10]);
  assert.deepEqual(rewards.map((item) => item.scopeRewardPercent), [100, 50, 20]);
  assert.equal(rewards[0].reason, '');
  assert.equal(rewards[1].reason, 'scope_reward_reduced');
  assert.equal(rewards[2].reason, 'scope_reward_reduced');
});

test('네 번째 같은 범위 배틀은 플레이 기록만 남고 보상과 공식 전적에서 제외된다', () => {
  const result = calculateQuizBattleRewardPolicy({
    requestedReward: 50,
    scopeCount: 3,
    opponentCount: 0,
    totalOre: 85,
    accessEligible: true,
  });

  assert.equal(result.reward, 0);
  assert.equal(result.reason, 'scope_repeat_limit');
  assert.equal(result.rewardEligible, false);
  assert.equal(result.competitiveEligible, false);
});

test('같은 상대 제한과 과정 접근 권한은 반복 감액보다 우선한다', () => {
  const opponentLimited = calculateQuizBattleRewardPolicy({
    requestedReward: 50,
    scopeCount: 1,
    opponentCount: 3,
    accessEligible: true,
  });
  const inactive = calculateQuizBattleRewardPolicy({
    requestedReward: 50,
    scopeCount: 1,
    opponentCount: 0,
    accessEligible: false,
  });

  assert.equal(opponentLimited.reason, 'opponent_repeat_limit');
  assert.equal(opponentLimited.reward, 0);
  assert.equal(inactive.reason, 'battle_access_inactive');
  assert.equal(inactive.reward, 0);
});

test('하루 광석 상한은 감액된 보상에 마지막으로 적용된다', () => {
  const partial = calculateQuizBattleRewardPolicy({
    requestedReward: 50,
    scopeCount: 1,
    opponentCount: 0,
    totalOre: 490,
    accessEligible: true,
  });
  const capped = calculateQuizBattleRewardPolicy({
    requestedReward: 50,
    scopeCount: 0,
    opponentCount: 0,
    totalOre: 500,
    accessEligible: true,
  });

  assert.equal(partial.reward, 10);
  assert.equal(partial.reason, 'daily_ore_cap_partial');
  assert.equal(capped.reward, 0);
  assert.equal(capped.reason, 'daily_ore_cap');
});

test('AI 훈련전도 같은 범위 감액을 적용하되 공식 전적으로 세지 않는다', () => {
  const result = calculateQuizBattleRewardPolicy({
    requestedReward: 16,
    scopeCount: 2,
    opponentCount: 2,
    totalOre: 0,
    accessEligible: true,
    isAI: true,
  });

  assert.equal(result.reward, 3);
  assert.equal(result.aiTrainingEligible, true);
  assert.equal(result.competitiveEligible, false);
});
