/**
 * Weekly Growth Loop ('이번 주 항로') Domain Definitions & Helpers
 */

export const WEEKLY_GROWTH_LOOP_SCHEMA_VERSION = 1;
export const WEEKLY_GROWTH_LOOP_PROMPT_VERSION = 1;
export const WEEKLY_GROWTH_LOOP_DRAFT_PREFIX = 'metasense.weeklyGrowthLoopDraft.v1';

export const OBSERVATION_OPTIONS = [
  { code: 'too_many_plans', label: '계획을 너무 많이 세웠어요', icon: '📝' },
  { code: 'delayed_start', label: '시작을 자꾸 미뤘어요', icon: '⏰' },
  { code: 'avoided_difficulty', label: '어려운 것을 피했어요', icon: '🙈' },
  { code: 'kept_consistent', label: '생각보다 꾸준히 했어요', icon: '🌱' },
  { code: 'focused_well', label: '공부할 때 집중이 잘 됐어요', icon: '🎯' },
  { code: 'skipped_unknowns', label: '모르는 것을 그냥 넘어갔어요', icon: '⏩' },
  { code: 'plan_fit_well', label: '계획이 나에게 잘 맞았어요', icon: '✨' },
  { code: 'unexpected_events', label: '다른 일이 생겨 계획대로 못 했어요', icon: '🌪️' },
  { code: 'not_sure', label: '아직 잘 모르겠어요', icon: '💭' },
];

export const PRIDE_OPTIONS = [
  { code: 'consistency', label: '꾸준히 한 것', icon: '🏃' },
  { code: 'did_not_give_up', label: '포기하지 않은 것', icon: '🛡️' },
  { code: 'tried_difficulty', label: '어려운 것에 도전한 것', icon: '🧗' },
  { code: 'started_by_myself', label: '스스로 시작한 것', icon: '🚀' },
  { code: 'tried_again', label: '다시 해본 것', icon: '🔄' },
  { code: 'not_sure', label: '아직 잘 모르겠어요', icon: '💭' },
];

export const STRATEGY_OPTIONS = [
  { code: 'reduce_plans', label: '계획을 조금 줄일래요', desc: '할 수 있는 만큼만 알맞게 정해요', icon: '📉' },
  { code: 'small_every_day', label: '매일 조금씩 할래요', desc: '짧은 시간이라도 꾸준히 이어가요', icon: '📅' },
  { code: 'hard_first', label: '어려운 것부터 할래요', desc: '에너지가 많을 때 먼저 끝내요', icon: '⚡' },
  { code: 'retry_mistakes', label: '틀린 것을 다시 해볼래요', desc: '오답을 다시 보며 내 것으로 만들어요', icon: '🔍' },
  { code: 'set_start_time', label: '시작 시간을 정할래요', desc: '알람이나 정해진 시간에 바로 앉아요', icon: '⏰' },
  { code: 'remove_distractions', label: '공부할 때 다른 것을 치울래요', desc: '화면과 주변을 정리하고 시작해요', icon: '🧹' },
  { code: 'ask_when_stuck', label: '모르면 질문할래요', desc: '혼자 끙끙대지 않고 힌트를 구해요', icon: '🙋' },
  { code: 'keep_current_plan', label: '지난 계획 그대로 해볼래요', desc: '지금 흐름이 좋아 계속 유지해요', icon: '👍' },
];

export const CATEGORY_LABELS = {
  learn: { name: '배우기', icon: '📚', color: '#60a5fa' },
  habit: { name: '습관', icon: '⏰', color: '#34d399' },
  challenge: { name: '도전', icon: '🧗', color: '#fbbf24' },
  together: { name: '함께하기', icon: '🤝', color: '#f472b6' },
};

export const GOAL_TEMPLATES_CATALOG = [
  // 배우기 (learn)
  {
    id: 'learn_math_3_times',
    category: 'learn',
    label: '수학 3번 하기',
    active: true,
  },
  {
    id: 'learn_retry_mistakes',
    category: 'learn',
    label: '틀린 문제 다시 풀기',
    active: true,
  },
  {
    id: 'learn_python_2_missions',
    category: 'learn',
    label: 'Python 미션 2개 하기',
    active: true,
  },
  {
    id: 'learn_read_3_days',
    category: 'learn',
    label: '책 3일 읽기',
    active: true,
  },
  {
    id: 'learn_school_study_10m',
    category: 'learn',
    label: '학교 공부 10분씩 3일 하기',
    active: true,
  },

  // 습관 (habit)
  {
    id: 'habit_set_start_time',
    category: 'habit',
    label: '공부 시작 시간 정하기',
    active: true,
  },
  {
    id: 'habit_check_tomorrow_tasks',
    category: 'habit',
    label: '자기 전에 내일 할 일 확인하기',
    active: true,
  },
  {
    id: 'habit_clear_distractions',
    category: 'habit',
    label: '공부할 때 다른 화면 치우기',
    active: true,
  },
  {
    id: 'habit_pack_belongings',
    category: 'habit',
    label: '준비물을 스스로 챙기기',
    active: true,
  },

  // 도전 (challenge)
  {
    id: 'challenge_new_book',
    category: 'challenge',
    label: '새로운 책 시작하기',
    active: true,
  },
  {
    id: 'challenge_mini_program',
    category: 'challenge',
    label: '작은 프로그램 하나 만들기',
    active: true,
  },
  {
    id: 'challenge_research_curiosity',
    category: 'challenge',
    label: '궁금한 것 하나 조사하기',
    active: true,
  },
  {
    id: 'challenge_explain_to_family',
    category: 'challenge',
    label: '배운 것을 가족에게 설명해 보기',
    active: true,
  },

  // 함께하기 (together)
  {
    id: 'together_help_family',
    category: 'together',
    label: '가족을 한 번 돕기',
    active: true,
  },
  {
    id: 'together_explain_to_friend',
    category: 'together',
    label: '친구에게 배운 것을 설명해 주기',
    active: true,
  },
  {
    id: 'together_keep_promise',
    category: 'together',
    label: '약속한 일을 지키기',
    active: true,
  },
];

export const PREVIOUS_GOAL_OUTCOME_OPTIONS = [
  { code: 'done', label: '했어요', icon: '🌟', badgeClass: 'outcome-done' },
  { code: 'partial', label: '조금 했어요', icon: '🌱', badgeClass: 'outcome-partial' },
  { code: 'not_yet', label: '아직이에요', icon: '💭', badgeClass: 'outcome-not-yet' },
];

/**
 * Format a Date object to YYYY-MM-DD in KST (UTC+9)
 */
export function formatDateKeyKST(date = new Date()) {
  const kstOffsetMs = 9 * 60 * 60 * 1000;
  const kstDate = new Date(date.getTime() + kstOffsetMs);
  return kstDate.toISOString().slice(0, 10);
}

/**
 * Format DateKey (YYYY-MM-DD) into user friendly Korean string (M월 D일)
 */
export function formatFriendlyDateKey(dateKey) {
  if (!dateKey || typeof dateKey !== 'string') return '';
  const parts = dateKey.split('-');
  if (parts.length !== 3) return dateKey;
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  return `${month}월 ${day}일`;
}

/**
 * Given a timestamp or Date, compute KST week boundaries:
 * - Current week: Monday 00:00:00 KST to Sunday 23:59:59.999 KST
 * - Reviewed week: Previous Monday to Previous Sunday
 */
export function getKstWeekBoundaries(now = new Date()) {
  const kstOffsetMs = 9 * 60 * 60 * 1000;
  const kstTime = new Date(now.getTime() + kstOffsetMs);

  const kstYear = kstTime.getUTCFullYear();
  const kstMonth = kstTime.getUTCMonth();
  const kstDay = kstTime.getUTCDate();
  const dayOfWeek = kstTime.getUTCDay(); // 0: Sun, 1: Mon, ..., 6: Sat

  const monOffset = (dayOfWeek + 6) % 7;

  const currentWeekMondayUtcMs = Date.UTC(kstYear, kstMonth, kstDay - monOffset) - kstOffsetMs;
  const currentWeekMonday = new Date(currentWeekMondayUtcMs);

  const currentWeekSundayUtcMs = currentWeekMondayUtcMs + 7 * 24 * 60 * 60 * 1000 - 1;
  const currentWeekSunday = new Date(currentWeekSundayUtcMs);

  const prevWeekMondayUtcMs = currentWeekMondayUtcMs - 7 * 24 * 60 * 60 * 1000;
  const prevWeekMonday = new Date(prevWeekMondayUtcMs);
  const prevWeekSundayUtcMs = currentWeekMondayUtcMs - 1;
  const prevWeekSunday = new Date(prevWeekSundayUtcMs);

  return {
    timezone: 'Asia/Seoul',
    weekStartKey: formatDateKeyKST(currentWeekMonday),
    weekEndKey: formatDateKeyKST(currentWeekSunday),
    reviewedWeek: {
      startKey: formatDateKeyKST(prevWeekMonday),
      endKey: formatDateKeyKST(prevWeekSunday),
    },
    currentWeekMonday,
    currentWeekSunday,
    prevWeekMonday,
    prevWeekSunday,
  };
}

export function getWeeklyGrowthLoopDraftStorageKey(uid, weekStartKey) {
  if (!uid || !weekStartKey) return '';
  return `${WEEKLY_GROWTH_LOOP_DRAFT_PREFIX}:${uid}:${weekStartKey}`;
}

export function safeReadWeeklyGrowthLoopDraft(storageKey) {
  if (!storageKey || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? normalizeWeeklyGrowthLoopDraft(JSON.parse(raw)) : null;
  } catch (error) {
    console.warn('Failed to read weekly growth loop draft:', error);
    return null;
  }
}

export function normalizeWeeklyGrowthLoopDraft(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const observationSet = new Set(OBSERVATION_OPTIONS.map((item) => item.code));
  const prideSet = new Set(PRIDE_OPTIONS.map((item) => item.code));
  const strategySet = new Set(STRATEGY_OPTIONS.map((item) => item.code));
  const goalSet = new Set(
    GOAL_TEMPLATES_CATALOG.filter((item) => item.active).map((item) => item.id)
  );
  const outcomeSet = new Set(PREVIOUS_GOAL_OUTCOME_OPTIONS.map((item) => item.code));

  const observationCodes = Array.from(new Set(
    Array.isArray(value.observationCodes)
      ? value.observationCodes.filter((code) => observationSet.has(code))
      : []
  )).slice(0, 2);
  const selectedTemplateIds = Array.from(new Set(
    Array.isArray(value.selectedTemplateIds)
      ? value.selectedTemplateIds.filter((id) => goalSet.has(id))
      : []
  )).slice(0, 3);
  const seenGoalIds = new Set();
  const previousGoalOutcomes = (Array.isArray(value.previousGoalOutcomes)
    ? value.previousGoalOutcomes
    : [])
    .filter((item) => {
      if (
        !item ||
        typeof item.goalId !== 'string' ||
        seenGoalIds.has(item.goalId) ||
        !outcomeSet.has(item.result)
      ) {
        return false;
      }
      seenGoalIds.add(item.goalId);
      return true;
    })
    .map(({ goalId, result }) => ({ goalId, result }));

  return {
    mode: value.mode === 'edit' ? 'edit' : 'create',
    currentStep: Number.isInteger(value.currentStep)
      ? Math.min(5, Math.max(1, value.currentStep))
      : 1,
    previousGoalOutcomes,
    observationCodes,
    prideCode: prideSet.has(value.prideCode) ? value.prideCode : null,
    strategyCode: strategySet.has(value.strategyCode) ? value.strategyCode : '',
    selectedTemplateIds,
    savedAt: typeof value.savedAt === 'string' ? value.savedAt : null,
  };
}

export function safeWriteWeeklyGrowthLoopDraft(storageKey, payload) {
  if (!storageKey || typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.warn('Failed to save weekly growth loop draft:', error);
    return false;
  }
}

export function safeRemoveWeeklyGrowthLoopDraft(storageKey) {
  if (!storageKey || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey);
  } catch (error) {
    console.warn('Failed to remove weekly growth loop draft:', error);
  }
}

export function safeCleanupWeeklyGrowthLoopDrafts(uid, activeWeekStartKey) {
  if (!uid || !activeWeekStartKey || typeof window === 'undefined') return;
  const activeKey = getWeeklyGrowthLoopDraftStorageKey(uid, activeWeekStartKey);
  const userPrefix = `${WEEKLY_GROWTH_LOOP_DRAFT_PREFIX}:${uid}:`;
  try {
    const staleKeys = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(userPrefix) && key !== activeKey) staleKeys.push(key);
    }
    staleKeys.forEach((key) => window.localStorage.removeItem(key));
  } catch (error) {
    console.warn('Failed to clean up weekly growth loop drafts:', error);
  }
}
