const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateSEI,
  getTierFromSEI,
  generateStellarLeaderboardData,
} = require('./stellarLeaderboardService.cjs');

test('calculateSEI matches expected math', () => {
  const dummyUser = {
    crystals: 1000,
    averageScore: 90,
    perfectCount: 5,
    helpCount: 2,
    questionCount: 3,
  };
  const sei = calculateSEI(dummyUser, 100, 10);
  assert.ok(sei.total > 0);
  assert.equal(sei.wealth, 500); // 1000 / 2
  assert.equal(sei.skill, 450 + 50); // 90*5 + 5*10 = 500
  assert.equal(sei.diligence, 100); // 10 * 10
  assert.equal(sei.growth, 50); // 100 / 2
  assert.equal(sei.agora, 15 + 40); // 3*5 + 2*20 = 55
  assert.ok(sei.tier.name);
});

test('getTierFromSEI returns correct tiers', () => {
  assert.equal(getTierFromSEI(85000).level, 9);
  assert.equal(getTierFromSEI(42000).level, 8);
  assert.equal(getTierFromSEI(25000).level, 7);
  assert.equal(getTierFromSEI(12000).level, 6);
  assert.equal(getTierFromSEI(6000).level, 5);
  assert.equal(getTierFromSEI(2500).level, 4);
  assert.equal(getTierFromSEI(1500).level, 3);
  assert.equal(getTierFromSEI(700).level, 2);
  assert.equal(getTierFromSEI(100).level, 1);
});
