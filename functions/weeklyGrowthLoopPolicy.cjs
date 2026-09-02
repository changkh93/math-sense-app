const crypto = require("crypto");
const { LEARNING_SUMMARY_SCHEMA_VERSION } = require("./learningSummaryDomain.cjs");

const WEEKLY_GROWTH_LOOP_SCHEMA_VERSION = 1;
const WEEKLY_GROWTH_LOOP_PROMPT_VERSION = 1;
const MAX_WEEKLY_GROWTH_COMMAND_ID_LENGTH = 120;

const OBSERVATION_CODES = [
  "too_many_plans",
  "delayed_start",
  "avoided_difficulty",
  "kept_consistent",
  "focused_well",
  "skipped_unknowns",
  "plan_fit_well",
  "unexpected_events",
  "not_sure",
];

const PRIDE_CODES = [
  "consistency",
  "did_not_give_up",
  "tried_difficulty",
  "started_by_myself",
  "tried_again",
  "not_sure",
];

const STRATEGY_CODES = [
  "reduce_plans",
  "small_every_day",
  "hard_first",
  "retry_mistakes",
  "set_start_time",
  "remove_distractions",
  "ask_when_stuck",
  "keep_current_plan",
];

const PREVIOUS_GOAL_OUTCOMES = ["done", "partial", "not_yet"];

const GOAL_TEMPLATES_CATALOG = [
  // 배우기 (learn)
  {
    id: "learn_math_3_times",
    category: "learn",
    label: "수학 3번 하기",
    active: true,
    minPromptVersion: 1,
  },
  {
    id: "learn_retry_mistakes",
    category: "learn",
    label: "틀린 문제 다시 풀기",
    active: true,
    minPromptVersion: 1,
  },
  {
    id: "learn_python_2_missions",
    category: "learn",
    label: "Python 미션 2개 하기",
    active: true,
    minPromptVersion: 1,
  },
  {
    id: "learn_read_3_days",
    category: "learn",
    label: "책 3일 읽기",
    active: true,
    minPromptVersion: 1,
  },
  {
    id: "learn_school_study_10m",
    category: "learn",
    label: "학교 공부 10분씩 3일 하기",
    active: true,
    minPromptVersion: 1,
  },

  // 습관 (habit)
  {
    id: "habit_set_start_time",
    category: "habit",
    label: "공부 시작 시간 정하기",
    active: true,
    minPromptVersion: 1,
  },
  {
    id: "habit_check_tomorrow_tasks",
    category: "habit",
    label: "자기 전에 내일 할 일 확인하기",
    active: true,
    minPromptVersion: 1,
  },
  {
    id: "habit_clear_distractions",
    category: "habit",
    label: "공부할 때 다른 화면 치우기",
    active: true,
    minPromptVersion: 1,
  },
  {
    id: "habit_pack_belongings",
    category: "habit",
    label: "준비물을 스스로 챙기기",
    active: true,
    minPromptVersion: 1,
  },

  // 도전 (challenge)
  {
    id: "challenge_new_book",
    category: "challenge",
    label: "새로운 책 시작하기",
    active: true,
    minPromptVersion: 1,
  },
  {
    id: "challenge_mini_program",
    category: "challenge",
    label: "작은 프로그램 하나 만들기",
    active: true,
    minPromptVersion: 1,
  },
  {
    id: "challenge_research_curiosity",
    category: "challenge",
    label: "궁금한 것 하나 조사하기",
    active: true,
    minPromptVersion: 1,
  },
  {
    id: "challenge_explain_to_family",
    category: "challenge",
    label: "배운 것을 가족에게 설명해 보기",
    active: true,
    minPromptVersion: 1,
  },

  // 함께하기 (together)
  {
    id: "together_help_family",
    category: "together",
    label: "가족을 한 번 돕기",
    active: true,
    minPromptVersion: 1,
  },
  {
    id: "together_explain_to_friend",
    category: "together",
    label: "친구에게 배운 것을 설명해 주기",
    active: true,
    minPromptVersion: 1,
  },
  {
    id: "together_keep_promise",
    category: "together",
    label: "약속한 일을 지키기",
    active: true,
    minPromptVersion: 1,
  },
];

const GOAL_TEMPLATE_MAP = new Map(GOAL_TEMPLATES_CATALOG.map((t) => [t.id, t]));

/**
 * Format a Date object to YYYY-MM-DD in KST (UTC+9)
 */
function formatDateKeyKST(date) {
  const kstOffsetMs = 9 * 60 * 60 * 1000;
  const kstDate = new Date(date.getTime() + kstOffsetMs);
  return kstDate.toISOString().slice(0, 10);
}

/**
 * Given a timestamp or Date, compute KST week boundaries:
 * - Current week: Monday 00:00:00 KST to Sunday 23:59:59.999 KST
 * - Reviewed week: Previous Monday to Previous Sunday
 */
function getKstWeekBoundaries(now = new Date()) {
  const kstOffsetMs = 9 * 60 * 60 * 1000;
  const kstTime = new Date(now.getTime() + kstOffsetMs);

  const kstYear = kstTime.getUTCFullYear();
  const kstMonth = kstTime.getUTCMonth();
  const kstDay = kstTime.getUTCDate();
  const dayOfWeek = kstTime.getUTCDay(); // 0: Sun, 1: Mon, ..., 6: Sat

  // Monday offset: Mon=0, Tue=1, ..., Sun=6
  const monOffset = (dayOfWeek + 6) % 7;

  // Monday 00:00:00 KST in UTC timestamp
  const currentWeekMondayUtcMs = Date.UTC(kstYear, kstMonth, kstDay - monOffset) - kstOffsetMs;
  const currentWeekMonday = new Date(currentWeekMondayUtcMs);

  // Sunday 23:59:59.999 KST in UTC timestamp
  const currentWeekSundayUtcMs = currentWeekMondayUtcMs + 7 * 24 * 60 * 60 * 1000 - 1;
  const currentWeekSunday = new Date(currentWeekSundayUtcMs);

  // Previous week Monday and Sunday
  const prevWeekMondayUtcMs = currentWeekMondayUtcMs - 7 * 24 * 60 * 60 * 1000;
  const prevWeekMonday = new Date(prevWeekMondayUtcMs);
  const prevWeekSundayUtcMs = currentWeekMondayUtcMs - 1;
  const prevWeekSunday = new Date(prevWeekSundayUtcMs);

  const weekStartKey = formatDateKeyKST(currentWeekMonday);
  const weekEndKey = formatDateKeyKST(currentWeekSunday);
  const reviewedStartKey = formatDateKeyKST(prevWeekMonday);
  const reviewedEndKey = formatDateKeyKST(prevWeekSunday);

  return {
    timezone: "Asia/Seoul",
    weekStartKey,
    weekEndKey,
    reviewedWeek: {
      startKey: reviewedStartKey,
      endKey: reviewedEndKey,
    },
    currentWeekMonday,
    currentWeekSunday,
    prevWeekMonday,
    prevWeekSunday,
  };
}

function buildLoopId(uid, weekStartKey) {
  if (!uid || !weekStartKey) return null;
  return `${uid}__${weekStartKey}`;
}

function buildCommandId(uid, commandId) {
  if (!uid || !commandId) return null;
  return `${uid}__${commandId}`;
}

function stableSerialize(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function computePayloadHash(payload) {
  return crypto.createHash("sha256").update(stableSerialize(payload)).digest("hex");
}

function validateCommandId(commandId) {
  if (
    typeof commandId !== "string" ||
    commandId.length < 8 ||
    commandId.length > MAX_WEEKLY_GROWTH_COMMAND_ID_LENGTH ||
    !/^[A-Za-z0-9_-]+$/.test(commandId)
  ) {
    return {
      valid: false,
      error: "commandId 형식이 올바르지 않습니다.",
    };
  }
  return { valid: true, value: commandId };
}

function validateExpectedRevision(expectedRevision) {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    return {
      valid: false,
      error: "expectedRevision은 0 이상의 정수여야 합니다.",
    };
  }
  return { valid: true, value: expectedRevision };
}

function validateObservationCodes(codes) {
  if (!Array.isArray(codes) || codes.length < 1 || codes.length > 2) {
    return { valid: false, error: "성찰 관찰 코드는 1개 또는 2개를 선택해야 합니다." };
  }
  const set = new Set(codes);
  if (set.size !== codes.length) {
    return { valid: false, error: "성찰 관찰 코드에 중복이 있습니다." };
  }
  for (const code of codes) {
    if (!OBSERVATION_CODES.includes(code)) {
      return { valid: false, error: `유효하지 않은 성찰 관찰 코드입니다: ${code}` };
    }
  }
  return { valid: true };
}

function validatePrideCode(code) {
  if (code === null || code === undefined) {
    return { valid: true, value: null };
  }
  if (!PRIDE_CODES.includes(code)) {
    return { valid: false, error: `유효하지 않은 자랑스러운 점 코드입니다: ${code}` };
  }
  return { valid: true, value: code };
}

function validateStrategyCode(code) {
  if (!code || typeof code !== "string" || !STRATEGY_CODES.includes(code)) {
    return { valid: false, error: "전략 코드는 정확히 1개를 선택해야 합니다." };
  }
  return { valid: true };
}

function validateGoalTemplateIds(templateIds) {
  if (!Array.isArray(templateIds) || templateIds.length < 1 || templateIds.length > 3) {
    return { valid: false, error: "이번 주 목표는 1개 이상 3개 이하로 선택해야 합니다." };
  }
  const set = new Set(templateIds);
  if (set.size !== templateIds.length) {
    return { valid: false, error: "목표 템플릿에 중복이 있습니다." };
  }

  const validatedGoals = [];
  for (const templateId of templateIds) {
    const template = GOAL_TEMPLATE_MAP.get(templateId);
    if (!template || !template.active) {
      return { valid: false, error: `유효하지 않거나 비활성화된 목표 템플릿입니다: ${templateId}` };
    }
    validatedGoals.push({
      id: `goal_${templateId}`,
      templateId: template.id,
      category: template.category,
      label: template.label,
    });
  }

  return { valid: true, goals: validatedGoals };
}

function validatePreviousGoalOutcomes(expectedPreviousGoals, outcomes) {
  if (!expectedPreviousGoals || expectedPreviousGoals.length === 0) {
    return { valid: true, outcomes: [] };
  }

  if (!Array.isArray(outcomes) || outcomes.length !== expectedPreviousGoals.length) {
    return {
      valid: false,
      error: `이전 목표 ${expectedPreviousGoals.length}개 모두에 대해 결과를 선택해야 합니다.`,
    };
  }

  const expectedGoalIds = new Set(expectedPreviousGoals.map((goal) => goal.id));
  const outcomeMap = new Map();
  for (const item of outcomes) {
    if (!item || !item.goalId || !PREVIOUS_GOAL_OUTCOMES.includes(item.result)) {
      return { valid: false, error: "이전 목표 결과 형식이 올바르지 않습니다." };
    }
    if (!expectedGoalIds.has(item.goalId)) {
      return { valid: false, error: "현재 회고 대상이 아닌 목표 결과가 포함되어 있습니다." };
    }
    if (outcomeMap.has(item.goalId)) {
      return { valid: false, error: "같은 이전 목표의 결과가 중복되어 있습니다." };
    }
    outcomeMap.set(item.goalId, item.result);
  }

  const validatedOutcomes = [];
  for (const prevGoal of expectedPreviousGoals) {
    const res = outcomeMap.get(prevGoal.id);
    if (!res) {
      return { valid: false, error: `목표 '${prevGoal.label || prevGoal.id}'의 결과가 누락되었습니다.` };
    }
    validatedOutcomes.push({
      goalId: prevGoal.id,
      result: res,
    });
  }

  return { valid: true, outcomes: validatedOutcomes };
}

module.exports = {
  WEEKLY_GROWTH_LOOP_SCHEMA_VERSION,
  WEEKLY_GROWTH_LOOP_PROMPT_VERSION,
  LEARNING_SUMMARY_SCHEMA_VERSION,
  MAX_WEEKLY_GROWTH_COMMAND_ID_LENGTH,
  OBSERVATION_CODES,
  PRIDE_CODES,
  STRATEGY_CODES,
  PREVIOUS_GOAL_OUTCOMES,
  GOAL_TEMPLATES_CATALOG,
  GOAL_TEMPLATE_MAP,
  formatDateKeyKST,
  getKstWeekBoundaries,
  buildLoopId,
  buildCommandId,
  computePayloadHash,
  validateCommandId,
  validateExpectedRevision,
  validateObservationCodes,
  validatePrideCode,
  validateStrategyCode,
  validateGoalTemplateIds,
  validatePreviousGoalOutcomes,
};
