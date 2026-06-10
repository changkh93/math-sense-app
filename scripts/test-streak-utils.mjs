import assert from 'node:assert/strict';
import {
  calculateStreakFromHistory,
  calculateStreakUpdate,
  extractDefendedDates,
  extractLearningActivityDates,
  getEffectiveStreak,
  getCurrentGapDefendedDates,
  getKSTComponents,
  getTodayKST,
  getYesterdayKST,
  normalizeScheduleDay,
  recalculateStreakState,
  scheduleIncludesDay,
} from '../src/utils/streakUtils.js';

function run() {
  const protectedReturn = calculateStreakUpdate({
    lastStreakDate: '2026-04-01',
    currentStreak: 5,
    longestStreak: 7,
    streakFreezeCount: 3,
    streakMilestones: [],
  }, '2026-04-03');

  assert.equal(protectedReturn.streakUpdate.currentStreak, 6);
  assert.equal(protectedReturn.streakUpdate.streakFreezeCount, 2);
  assert.equal(protectedReturn.meta.freezeUsed, true);
  assert.deepEqual(protectedReturn.meta.defendedDates, ['2026-04-02']);
  assert.equal(protectedReturn.meta.consumedFreezeCount, 1);

  const activeOnlyStreak = calculateStreakFromHistory(
    ['2026-04-01', '2026-04-03'],
    ['2026-04-02'],
    '2026-04-03'
  );
  assert.equal(activeOnlyStreak, 2);

  const currentGapDefense = getCurrentGapDefendedDates('2026-04-01', 1, '2026-04-03');
  assert.deepEqual(currentGapDefense, ['2026-04-02']);

  const derivedActiveDates = Array.from(extractLearningActivityDates(
    [],
    [{ type: 'transmission_reward', timestamp: '2026-04-05T01:00:00+09:00' }]
  )).sort();
  assert.deepEqual(derivedActiveDates, ['2026-04-05']);

  const explicitRestDefenseDates = Array.from(extractDefendedDates([
    {
      type: 'streak_freeze',
      metadata: { defendedDates: ['2026-05-22', '2026-05-23', '2026-05-24'] },
    },
  ], {}, new Map())).sort();
  assert.deepEqual(explicitRestDefenseDates, ['2026-05-22']);

  const legacyRestOnlyFreezeDates = Array.from(extractDefendedDates([
    { type: 'streak_freeze', timestamp: '2026-05-25T10:00:00+09:00' },
  ], {}, new Map([['2026-05-22', { quizzes: 1 }]]))).sort();
  assert.deepEqual(legacyRestOnlyFreezeDates, []);

  const repairedState = recalculateStreakState(
    ['2026-04-01', '2026-04-03'],
    ['2026-04-02'],
    '2026-04-03'
  );
  assert.equal(repairedState.correctStreak, 2);
  assert.equal(repairedState.correctLastDate, '2026-04-03');
  assert.equal(repairedState.coresRemaining, 0);
  assert.deepEqual(repairedState.defendedDates, ['2026-04-02']);

  const idleProtectedState = recalculateStreakState(
    ['2026-04-01'],
    ['2026-04-02'],
    '2026-04-03'
  );
  assert.equal(idleProtectedState.correctStreak, 1);
  assert.equal(idleProtectedState.correctLastDate, '2026-04-01');
  assert.deepEqual(idleProtectedState.defendedDates, ['2026-04-02']);

  const displayedProtectedStreak = getEffectiveStreak({
    currentStreak: 25,
    lastStreakDate: getYesterdayKST(),
    streakFreezeCount: 2,
  }, null);
  assert.equal(displayedProtectedStreak, 25);

  const weekendPreservedStreak = getEffectiveStreak({
    currentStreak: 12,
    lastStreakDate: '2026-05-15',
    streakFreezeCount: 0,
  }, null, '2026-05-18');
  assert.equal(weekendPreservedStreak, 12);

  const holidayPreservedStreak = getEffectiveStreak({
    currentStreak: 12,
    lastStreakDate: '2026-05-23',
    streakFreezeCount: 0,
  }, null, '2026-05-26');
  assert.equal(holidayPreservedStreak, 12);

  const weekdayMissBreaksDisplayedStreak = getEffectiveStreak({
    currentStreak: 12,
    lastStreakDate: '2026-05-15',
    streakFreezeCount: 0,
  }, null, '2026-05-19');
  assert.equal(weekdayMissBreaksDisplayedStreak, 0);

  assert.equal(getTodayKST('2026-05-03T15:00:00.000Z'), '2026-05-04');
  assert.equal(getKSTComponents('2026-05-03T15:00:00.000Z').dayOfWeek, 1);
  assert.equal(normalizeScheduleDay('월'), 1);
  assert.equal(normalizeScheduleDay('7'), 0);
  assert.equal(scheduleIncludesDay({ days: [1, 2, 3, 4, 5] }, 1), true);
  assert.equal(scheduleIncludesDay({ days: ['월', '화'] }, 1), true);
  assert.equal(scheduleIncludesDay({ day: '일' }, 0), true);
  assert.equal(scheduleIncludesDay({ days: [2, 3] }, 1), false);

  console.log('streak utils tests passed');
}

run();
