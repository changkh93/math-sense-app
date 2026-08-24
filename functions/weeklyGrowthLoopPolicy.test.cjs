const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getKstWeekBoundaries,
  validateObservationCodes,
  validatePrideCode,
  validateStrategyCode,
  validateGoalTemplateIds,
  validatePreviousGoalOutcomes,
  validateCommandId,
  validateExpectedRevision,
  buildLoopId,
  computePayloadHash,
} = require("./weeklyGrowthLoopPolicy.cjs");

test("getKstWeekBoundaries computes correct Monday-Sunday range for KST", () => {
  // 2026-08-24 is Monday
  const d1 = new Date("2026-08-24T03:00:00Z"); // 12:00 KST
  const res1 = getKstWeekBoundaries(d1);
  assert.equal(res1.weekStartKey, "2026-08-24");
  assert.equal(res1.weekEndKey, "2026-08-30");
  assert.equal(res1.reviewedWeek.startKey, "2026-08-17");
  assert.equal(res1.reviewedWeek.endKey, "2026-08-23");

  // 2026-08-23 is Sunday (23:59:00 KST is 2026-08-23T14:59:00Z)
  const d2 = new Date("2026-08-23T14:59:00Z");
  const res2 = getKstWeekBoundaries(d2);
  assert.equal(res2.weekStartKey, "2026-08-17");
  assert.equal(res2.weekEndKey, "2026-08-23");
  assert.equal(res2.reviewedWeek.startKey, "2026-08-10");
  assert.equal(res2.reviewedWeek.endKey, "2026-08-16");

  // 월요일 00:00 KST 전후의 주차가 정확히 갈린다.
  const justBeforeMonday = getKstWeekBoundaries(new Date("2026-08-23T14:59:59.999Z"));
  const mondayMidnight = getKstWeekBoundaries(new Date("2026-08-23T15:00:00.000Z"));
  assert.equal(justBeforeMonday.weekStartKey, "2026-08-17");
  assert.equal(mondayMidnight.weekStartKey, "2026-08-24");

  // 연말/연초 경계도 KST 월요일 기준을 유지한다.
  const yearBoundary = getKstWeekBoundaries(new Date("2027-01-01T03:00:00.000Z"));
  assert.equal(yearBoundary.weekStartKey, "2026-12-28");
  assert.equal(yearBoundary.weekEndKey, "2027-01-03");
});

test("validateObservationCodes validates 1~2 codes and rejects duplicates or invalid codes", () => {
  assert.equal(validateObservationCodes([]).valid, false);
  assert.equal(validateObservationCodes(["too_many_plans"]).valid, true);
  assert.equal(validateObservationCodes(["too_many_plans", "delayed_start"]).valid, true);
  assert.equal(validateObservationCodes(["too_many_plans", "delayed_start", "focused_well"]).valid, false);
  assert.equal(validateObservationCodes(["too_many_plans", "too_many_plans"]).valid, false);
  assert.equal(validateObservationCodes(["invalid_code"]).valid, false);
});

test("validatePrideCode validates optional pride code", () => {
  assert.equal(validatePrideCode(null).valid, true);
  assert.equal(validatePrideCode(undefined).valid, true);
  assert.equal(validatePrideCode("consistency").valid, true);
  assert.equal(validatePrideCode("invalid_pride").valid, false);
});

test("validateStrategyCode validates exactly 1 strategy code", () => {
  assert.equal(validateStrategyCode("reduce_plans").valid, true);
  assert.equal(validateStrategyCode("").valid, false);
  assert.equal(validateStrategyCode("invalid_strategy").valid, false);
  assert.equal(validateStrategyCode(null).valid, false);
});

test("validateGoalTemplateIds validates 1~3 goals and fills catalog metadata", () => {
  assert.equal(validateGoalTemplateIds([]).valid, false);
  assert.equal(validateGoalTemplateIds(["learn_math_3_times", "habit_set_start_time"]).valid, true);
  const okRes = validateGoalTemplateIds(["learn_math_3_times", "habit_set_start_time"]);
  assert.equal(okRes.goals.length, 2);
  assert.equal(okRes.goals[0].label, "수학 3번 하기");
  assert.equal(okRes.goals[0].category, "learn");
  assert.equal(okRes.goals[1].category, "habit");

  // 4 items rejected
  assert.equal(
    validateGoalTemplateIds([
      "learn_math_3_times",
      "habit_set_start_time",
      "challenge_new_book",
      "together_help_family",
    ]).valid,
    false
  );
  // Duplicate rejected
  assert.equal(validateGoalTemplateIds(["learn_math_3_times", "learn_math_3_times"]).valid, false);
  // Invalid id rejected
  assert.equal(validateGoalTemplateIds(["not_in_catalog"]).valid, false);
});

test("validatePreviousGoalOutcomes requires outcome for each previous goal", () => {
  const prevGoals = [
    { id: "goal_1", label: "Goal 1" },
    { id: "goal_2", label: "Goal 2" },
  ];

  // Missing one outcome
  assert.equal(
    validatePreviousGoalOutcomes(prevGoals, [{ goalId: "goal_1", result: "done" }]).valid,
    false
  );

  // Invalid result
  assert.equal(
    validatePreviousGoalOutcomes(prevGoals, [
      { goalId: "goal_1", result: "done" },
      { goalId: "goal_2", result: "invalid" },
    ]).valid,
    false
  );

  // Correct
  const ok = validatePreviousGoalOutcomes(prevGoals, [
    { goalId: "goal_1", result: "done" },
    { goalId: "goal_2", result: "partial" },
  ]);
  assert.equal(ok.valid, true);
  assert.equal(ok.outcomes.length, 2);

  // Empty previous goals
  assert.equal(validatePreviousGoalOutcomes([], []).valid, true);

  // Duplicate and unrelated goal ids are rejected explicitly.
  assert.equal(
    validatePreviousGoalOutcomes(prevGoals, [
      { goalId: "goal_1", result: "done" },
      { goalId: "goal_1", result: "partial" },
    ]).valid,
    false
  );
  assert.equal(
    validatePreviousGoalOutcomes(prevGoals, [
      { goalId: "goal_1", result: "done" },
      { goalId: "other_goal", result: "partial" },
    ]).valid,
    false
  );
});

test("command id and revision validation reject unsafe or missing concurrency inputs", () => {
  assert.equal(validateCommandId("cmd_comp_12345678").valid, true);
  assert.equal(validateCommandId("short").valid, false);
  assert.equal(validateCommandId("cmd/unsafe/path").valid, false);
  assert.equal(validateCommandId(`cmd_${"x".repeat(121)}`).valid, false);
  assert.equal(validateExpectedRevision(0).valid, true);
  assert.equal(validateExpectedRevision(4).valid, true);
  assert.equal(validateExpectedRevision(undefined).valid, false);
  assert.equal(validateExpectedRevision(-1).valid, false);
  assert.equal(validateExpectedRevision(1.5).valid, false);
});

test("buildLoopId and computePayloadHash are deterministic across object key order", () => {
  const loopId = buildLoopId("user123", "2026-08-24");
  assert.equal(loopId, "user123__2026-08-24");

  const hash1 = computePayloadHash({ a: 1, b: { z: 2, y: "test" } });
  const hash2 = computePayloadHash({ b: { y: "test", z: 2 }, a: 1 });
  assert.equal(hash1, hash2);
});
