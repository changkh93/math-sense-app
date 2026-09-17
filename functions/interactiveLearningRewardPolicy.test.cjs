"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  INTERACTIVE_LEARNING_ACTIVITIES,
  getKSTDateString,
  getKSTWeekMondayString,
  normalizeMetrics,
  resolveInteractiveLearningCompletion,
} = require("./interactiveLearningRewardPolicy.cjs");

test("defines the four student-facing experiences and rewards", () => {
  assert.equal(Object.keys(INTERACTIVE_LEARNING_ACTIVITIES).length, 4);
  assert.equal(INTERACTIVE_LEARNING_ACTIVITIES.multiplication_cards.reward, 3);
  assert.equal(INTERACTIVE_LEARNING_ACTIVITIES.division_cards.reward, 3);
  assert.equal(INTERACTIVE_LEARNING_ACTIVITIES.vertical_multiplication.reward, 10);
  assert.equal(INTERACTIVE_LEARNING_ACTIVITIES.vertical_division.reward, 10);
});

test("accepts only allowlisted completion keys", () => {
  const now = new Date("2026-09-17T03:00:00Z");
  assert.equal(resolveInteractiveLearningCompletion({ activityId: "multiplication_cards", completionKey: "card-8x7" }, now).ok, true);
  assert.equal(resolveInteractiveLearningCompletion({ activityId: "multiplication_cards", completionKey: "deck" }, now).ok, false);
  assert.equal(resolveInteractiveLearningCompletion({ activityId: "division_cards", completionKey: "card-57d8" }, now).ok, true);
  assert.equal(resolveInteractiveLearningCompletion({ activityId: "vertical_multiplication", completionKey: "mission-10" }, now).ok, true);
  assert.equal(resolveInteractiveLearningCompletion({ activityId: "vertical_multiplication", completionKey: "mission-11" }, now).ok, false);
  assert.equal(resolveInteractiveLearningCompletion({ activityId: "vertical_division", completionKey: "mission-20" }, now).ok, true);
  assert.equal(resolveInteractiveLearningCompletion({ activityId: "vertical_division", completionKey: "mission-21" }, now).ok, false);
});

test("separates lifetime reward ids from KST daily history ids", () => {
  const thursday = new Date("2026-09-17T03:00:00Z");
  const result = resolveInteractiveLearningCompletion({ activityId: "division_cards", completionKey: "card-57d8" }, thursday);
  assert.equal(getKSTDateString(thursday), "2026-09-17");
  assert.equal(getKSTWeekMondayString(thursday), "2026-09-14");
  assert.equal(result.rewardRecordId, "interactive_learning_reward_division_cards_card-57d8");
  assert.equal(result.historyRecordId, "interactive_learning_2026-09-17_division_cards_card-57d8");
  const friday = resolveInteractiveLearningCompletion({ activityId: "division_cards", completionKey: "card-57d8" }, new Date("2026-09-18T03:00:00Z"));
  assert.equal(friday.rewardRecordId, result.rewardRecordId);
  assert.notEqual(friday.historyRecordId, result.historyRecordId);
});

test("sanitizes metrics without accepting nested arbitrary data", () => {
  assert.deepEqual(normalizeMetrics({ cardCount: 12, selectedTables: [2, 3], note: "  잘   했어요  ", nested: { no: true } }), {
    cardCount: 12,
    selectedTables: ["2", "3"],
    note: "잘 했어요",
  });
});
