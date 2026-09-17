"use strict";

const INTERACTIVE_LEARNING_ACTIVITIES = Object.freeze({
  multiplication_cards: Object.freeze({
    title: "구구단 불빛 카드",
    regionId: "multiplication",
    regionTitle: "멀티플루비아",
    reward: 3,
    completionPattern: /^card-(?:[2-9]|1[0-2])x(?:[1-9]|1[0-2])$/,
  }),
  division_cards: Object.freeze({
    title: "나눗셈 묶음 카드",
    regionId: "division",
    regionTitle: "디비디아",
    reward: 3,
    completionPattern: /^card-[1-9]\d{0,2}d(?:[2-9]|1[0-2])$/,
  }),
  vertical_multiplication: Object.freeze({
    title: "큰곱셈 조립소",
    regionId: "multiplication",
    regionTitle: "멀티플루비아",
    reward: 10,
    completionPattern: /^mission-(?:[1-9]|10)$/,
  }),
  vertical_division: Object.freeze({
    title: "세로 나눗셈 연구소",
    regionId: "division",
    regionTitle: "디비디아",
    reward: 10,
    completionPattern: /^mission-(?:[1-9]|1\d|20)$/,
  }),
});

function getKSTDateString(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function getKSTWeekMondayString(now = new Date()) {
  const date = new Date(`${getKSTDateString(now)}T12:00:00+09:00`);
  const day = date.getUTCDay();
  const distance = day === 0 ? 6 : day - 1;
  date.setUTCDate(date.getUTCDate() - distance);
  return getKSTDateString(date);
}

function normalizeMetrics(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const output = {};
  for (const [key, raw] of Object.entries(value).slice(0, 12)) {
    const safeKey = String(key).replace(/[^a-zA-Z0-9_]/g, "").slice(0, 40);
    if (!safeKey) continue;
    if (typeof raw === "boolean") output[safeKey] = raw;
    else if (typeof raw === "number" && Number.isFinite(raw)) output[safeKey] = Math.max(-100000, Math.min(100000, raw));
    else if (typeof raw === "string") output[safeKey] = raw.replace(/\s+/g, " ").trim().slice(0, 120);
    else if (Array.isArray(raw)) {
      output[safeKey] = raw.slice(0, 12).map((item) => String(item).slice(0, 30));
    }
  }
  return output;
}

function resolveInteractiveLearningCompletion(data = {}, now = new Date()) {
  const activityId = String(data.activityId || "").trim();
  const completionKey = String(data.completionKey || "").trim();
  const activity = INTERACTIVE_LEARNING_ACTIVITIES[activityId];
  if (!activity || !activity.completionPattern.test(completionKey)) {
    return { ok: false, reason: "invalid_completion" };
  }
  const dateKey = getKSTDateString(now);
  return {
    ok: true,
    activityId,
    completionKey,
    dateKey,
    // 보상 원장은 날짜 없이 학습 항목에 고정하고, 학습 기록만 날짜별로 남긴다.
    // 따라서 복습은 일일 기록에 잡히지만 같은 항목의 광석은 다시 지급되지 않는다.
    rewardRecordId: `interactive_learning_reward_${activityId}_${completionKey}`,
    historyRecordId: `interactive_learning_${dateKey}_${activityId}_${completionKey}`,
    activity,
    metrics: normalizeMetrics(data.metrics),
  };
}

module.exports = {
  INTERACTIVE_LEARNING_ACTIVITIES,
  getKSTDateString,
  getKSTWeekMondayString,
  normalizeMetrics,
  resolveInteractiveLearningCompletion,
};
