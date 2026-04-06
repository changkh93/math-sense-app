import assert from 'node:assert/strict';
import {
  calculateStreakFromHistory,
  calculateStreakUpdate,
  getCurrentGapDefendedDates,
  recalculateStreakState,
} from '../src/utils/streakUtils.js';

function run() {
  const protectedReturn = calculateStreakUpdate({
    lastStreakDate: '2026-04-03',
    currentStreak: 5,
    longestStreak: 7,
    streakFreezeCount: 3,
    streakMilestones: [],
  }, '2026-04-05');

  assert.equal(protectedReturn.streakUpdate.currentStreak, 6);
  assert.equal(protectedReturn.streakUpdate.streakFreezeCount, 2);
  assert.equal(protectedReturn.meta.freezeUsed, true);
  assert.deepEqual(protectedReturn.meta.defendedDates, ['2026-04-04']);
  assert.equal(protectedReturn.meta.consumedFreezeCount, 1);

  const activeOnlyStreak = calculateStreakFromHistory(
    ['2026-04-03', '2026-04-05'],
    ['2026-04-04'],
    '2026-04-05'
  );
  assert.equal(activeOnlyStreak, 2);

  const currentGapDefense = getCurrentGapDefendedDates('2026-04-03', 1, '2026-04-05');
  assert.deepEqual(currentGapDefense, ['2026-04-04']);

  const repairedState = recalculateStreakState(
    ['2026-04-03', '2026-04-05'],
    ['2026-04-04'],
    '2026-04-05'
  );
  assert.equal(repairedState.correctStreak, 2);
  assert.equal(repairedState.correctLastDate, '2026-04-05');
  assert.equal(repairedState.coresRemaining, 0);
  assert.deepEqual(repairedState.defendedDates, ['2026-04-04']);

  const idleProtectedState = recalculateStreakState(
    ['2026-04-03'],
    ['2026-04-04'],
    '2026-04-05'
  );
  assert.equal(idleProtectedState.correctStreak, 1);
  assert.equal(idleProtectedState.correctLastDate, '2026-04-03');
  assert.deepEqual(idleProtectedState.defendedDates, ['2026-04-04']);

  console.log('streak utils tests passed');
}

run();
