import assert from 'node:assert/strict';
import {
  calculateExplorerLevel,
  getExplorerExperience,
} from '../src/utils/explorerLevelUtils.js';

assert.equal(
  getExplorerExperience(null),
  0,
  '사용자 데이터가 로딩 중이어도 충돌하지 않아야 한다.'
);

assert.equal(getExplorerExperience({
  crystals: 1200,
  lifetimeLearningCrystalsEarned: 5000,
}), 5000, '광석을 소비해도 누적 탐사 XP가 유지되어야 한다.');

assert.equal(getExplorerExperience({
  crystals: 7000,
  lifetimeLearningCrystalsEarned: 0,
}), 7000, '원장 백필 전에는 보유 광석으로 기존 등급을 보호해야 한다.');

assert.equal(getExplorerExperience({
  crystals: 100,
  lifetimeLearningCrystalsEarned: 200,
  galaxyLearningOreV2Total: 9000,
}), 9000, '원장의 정규화된 최댓값을 사용해야 한다.');

const level10 = calculateExplorerLevel(31911);
assert.equal(level10.level, 10);
assert.equal(level10.title, '우주의 아인슈타인');
assert.equal(level10.remaining, 6089);
assert.equal(level10.progress, 57);

const maxLevel = calculateExplorerLevel(991063);
assert.equal(maxLevel.level, 12);
assert.equal(maxLevel.isMaxLevel, true);
assert.equal(maxLevel.progress, 100);
assert.equal(maxLevel.remaining, 0);

const safeMinimum = calculateExplorerLevel(Number.NaN);
assert.equal(safeMinimum.level, 1);
assert.equal(safeMinimum.progress, 0);

console.log('탐사 등급 유틸리티 테스트 통과');
