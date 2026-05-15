import assert from 'node:assert/strict';
import { buildCollectionBadges, calculateCollectionBadgeStats } from '../src/utils/badgeUtils.js';

function isUnlocked(badges, title) {
  return badges.find(badge => badge.title === title)?.unlocked === true;
}

const noisyNonQuizHistory = Array.from({ length: 200 }, (_, index) => ({
  type: index % 2 === 0 ? 'video' : 'text',
  unitId: `media-${index}`,
  score: 100,
}));

const noisyBadges = buildCollectionBadges(
  { totalQuizzes: 423, totalScore: 42300, averageScore: 100, perfectCount: 423, crystals: 1000 },
  noisyNonQuizHistory
);

assert.equal(isUnlocked(noisyBadges, '태양계 마스터'), false);
assert.equal(isUnlocked(noisyBadges, '심우주 항해사'), false);
assert.equal(isUnlocked(noisyBadges, '완벽한 도약'), false);
assert.equal(isUnlocked(buildCollectionBadges({ averageScore: 100 }, []), '은하 학자'), false);

const repeatedSameUnitHistory = Array.from({ length: 132 }, () => ({
  type: 'quiz',
  unitId: 'same-unit',
  score: 100,
}));

const repeatedStats = calculateCollectionBadgeStats(repeatedSameUnitHistory);
assert.deepEqual(repeatedStats.uniqueQuizUnits, 1);
assert.equal(repeatedStats.quizAttempts, 132);
assert.equal(repeatedStats.quizScoreSum, 13200);
assert.equal(repeatedStats.perfectAttempts, 132);
assert.equal(repeatedStats.perfectUnits, 1);
assert.equal(isUnlocked(buildCollectionBadges({}, repeatedSameUnitHistory), '태양계 마스터'), false);

const masteredUniqueUnitHistory = Array.from({ length: 132 }, (_, index) => ({
  type: 'quiz',
  unitId: `unit-${index}`,
  score: index === 0 ? 99 : 100,
}));

const masteredBadges = buildCollectionBadges({}, masteredUniqueUnitHistory);
assert.equal(isUnlocked(masteredBadges, '태양계 마스터'), true);

console.log('badge utils tests passed');
