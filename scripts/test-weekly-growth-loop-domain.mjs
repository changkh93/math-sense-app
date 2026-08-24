import assert from 'node:assert/strict';
import {
  getKstWeekBoundaries,
  getWeeklyGrowthLoopDraftStorageKey,
  normalizeWeeklyGrowthLoopDraft,
  safeCleanupWeeklyGrowthLoopDrafts,
  safeReadWeeklyGrowthLoopDraft,
  safeWriteWeeklyGrowthLoopDraft,
} from '../src/utils/weeklyGrowthLoopDomain.js';

const sunday = getKstWeekBoundaries(new Date('2026-08-23T14:59:59.999Z'));
const monday = getKstWeekBoundaries(new Date('2026-08-23T15:00:00.000Z'));
assert.equal(sunday.weekStartKey, '2026-08-17');
assert.equal(monday.weekStartKey, '2026-08-24');

const normalized = normalizeWeeklyGrowthLoopDraft({
  mode: 'edit',
  currentStep: 99,
  observationCodes: ['focused_well', 'focused_well', 'invalid', 'delayed_start'],
  prideCode: 'invalid',
  strategyCode: 'small_every_day',
  selectedTemplateIds: [
    'learn_math_3_times',
    'learn_math_3_times',
    'habit_set_start_time',
    'challenge_new_book',
    'together_help_family',
  ],
  previousGoalOutcomes: [
    { goalId: 'goal_1', result: 'done' },
    { goalId: 'goal_1', result: 'partial' },
    { goalId: 'goal_2', result: 'invalid' },
  ],
});
assert.deepEqual(normalized.observationCodes, ['focused_well', 'delayed_start']);
assert.equal(normalized.currentStep, 5);
assert.equal(normalized.prideCode, null);
assert.equal(normalized.strategyCode, 'small_every_day');
assert.deepEqual(normalized.selectedTemplateIds, [
  'learn_math_3_times',
  'habit_set_start_time',
  'challenge_new_book',
]);
assert.deepEqual(normalized.previousGoalOutcomes, [{ goalId: 'goal_1', result: 'done' }]);

const values = new Map();
globalThis.window = {
  localStorage: {
    get length() {
      return values.size;
    },
    key(index) {
      return Array.from(values.keys())[index] ?? null;
    },
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  },
};

const activeKey = getWeeklyGrowthLoopDraftStorageKey('student-1', '2026-08-24');
const staleKey = getWeeklyGrowthLoopDraftStorageKey('student-1', '2026-08-17');
const otherUserKey = getWeeklyGrowthLoopDraftStorageKey('student-2', '2026-08-17');
safeWriteWeeklyGrowthLoopDraft(activeKey, normalized);
safeWriteWeeklyGrowthLoopDraft(staleKey, normalized);
safeWriteWeeklyGrowthLoopDraft(otherUserKey, normalized);
safeCleanupWeeklyGrowthLoopDrafts('student-1', '2026-08-24');

assert.ok(safeReadWeeklyGrowthLoopDraft(activeKey));
assert.equal(safeReadWeeklyGrowthLoopDraft(staleKey), null);
assert.ok(safeReadWeeklyGrowthLoopDraft(otherUserKey));

console.log('Weekly growth loop client domain tests passed.');
