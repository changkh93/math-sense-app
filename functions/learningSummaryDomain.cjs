/**
 * learningSummaryDomain.cjs
 *
 * Single Source of Truth for Learning Summary v3 Domain Logic.
 * Shared between Cloud Functions, Migration Script, and Unit Tests.
 */

const LEARNING_SUMMARY_SCHEMA_VERSION = 3;
const LEARNING_SUMMARY_MAX_DAYS = 540;

function cleanText(val, maxLen = 180) {
  if (typeof val !== "string") return "";
  return val.trim().slice(0, maxLen);
}

function getKSTDateString(date = new Date()) {
  const kstMs = date.getTime() + 9 * 60 * 60 * 1000;
  const kst = new Date(kstMs);
  const yyyy = kst.getUTCFullYear();
  const mm = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(kst.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function historyTimestampMs(data = {}) {
  const value = data.timestamp || data.completedAt || data.createdAt;
  if (value?.toMillis) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Returns modality activity type if and only if the event represents completion of that modality for the unit.
 * IMPORTANT: Individual LUMI / Python mission completions do NOT complete the unit's missionLab modality
 * unless isUnitComplete / unitCompleted / completionModalities.missionLab is explicitly true.
 */
function historyActivityType(data = {}) {
  if (!data.type || data.type === "quiz") return "quiz";
  if (data.type === "workbook") return "workbook";
  if (data.type === "video") return "video";
  if (data.type === "text") return "text";
  if (data.type === "code_trace") return "codeTrace";

  if (data.completionModalities?.missionLab === true) {
    return "missionLab";
  }
  if (data.type === "mission_lab" || data.type === "missionLab") {
    return "missionLab";
  }
  if (data.type === "python_mission" || data.type === "lumi_protocol") {
    const isUnitComplete = (
      data.isUnitComplete === true ||
      data.unitCompleted === true ||
      data.isAllMissionsComplete === true ||
      (Number(data.totalMissionsCount || data.totalMissionCount || data.totalCount || 0) > 0 &&
       Number(data.completedMissionsCount || data.completedMissionCount || data.completedCount || 0) >=
       Number(data.totalMissionsCount || data.totalMissionCount || data.totalCount || 0))
    );
    if (isUnitComplete) {
      return "missionLab";
    }
  }
  return "other";
}

function extractProgressCompletion(progressData = {}) {
  if (!progressData || typeof progressData !== "object") {
    return { text: false, video: false, missionLab: false };
  }
  const ml = progressData.missionLab || {};
  const completedCount = Number(
    ml.completedCount ??
    ml.completedMissionsCount ??
    ml.completedMissionCount ??
    ml.completed_count ??
    0
  );
  const totalCount = Number(
    ml.totalCount ??
    ml.totalMissions ??
    ml.totalMissionCount ??
    ml.total_count ??
    0
  );
  const hasCompletedAllMissions = totalCount > 0 && completedCount >= totalCount;
  const missionLabCompleted = (
    ml.completed === true ||
    ml.isCompleted === true ||
    hasCompletedAllMissions
  );

  const hasVideoCompleted = Object.values(progressData.videoProgress || {}).some(
    (tx) => tx && typeof tx === "object" && tx.completed === true
  );

  return {
    text: progressData.logRead === true,
    video: hasVideoCompleted,
    missionLab: missionLabCompleted,
  };
}

function blankDailyLearningStats(date) {
  return { date, quizzes: 0, scoreSum: 0, crystals: 0, perfCount: 0, videos: 0, texts: 0, workbooks: 0, codeTraces: 0 };
}

function applyHistoryToDailyStats(dailyMap, data, direction) {
  if (!data) return;
  const timestampMs = historyTimestampMs(data);
  if (!timestampMs) return;
  const date = getKSTDateString(new Date(timestampMs));
  const stats = dailyMap.get(date) || blankDailyLearningStats(date);
  const type = historyActivityType(data);
  if (type === "quiz") {
    stats.quizzes += direction;
    stats.scoreSum += direction * Number(data.score || 0);
    if (Number(data.score) === 100) stats.perfCount += direction;
  } else if (type === "workbook") {
    stats.workbooks += direction;
  } else if (type === "video") {
    stats.videos += direction;
  } else if (type === "text") {
    stats.texts += direction;
  } else if (type === "codeTrace") {
    stats.codeTraces += direction;
  }
  stats.crystals += direction * Number(data.crystalsEarned || 0);

  const activityCount = stats.quizzes + stats.videos + stats.texts + stats.workbooks + stats.codeTraces;
  if (activityCount <= 0) {
    dailyMap.delete(date);
  } else {
    dailyMap.set(date, stats);
  }
}

function buildUnitLearningSummary(unitId, rows = [], progressData = null, existingUnit = null) {
  if (!unitId) return null;
  const result = {
    unitId,
    clusterId: cleanText(existingUnit?.clusterId, 120) || "",
    regionId: cleanText(existingUnit?.regionId, 180) || "",
    chapterId: cleanText(existingUnit?.chapterId, 180) || "",
    lastActivityMs: Number(existingUnit?.lastActivityMs) || 0,
    modalities: {
      quiz: Boolean(existingUnit?.modalities?.quiz),
      workbook: Boolean(existingUnit?.modalities?.workbook),
      video: Boolean(existingUnit?.modalities?.video),
      text: Boolean(existingUnit?.modalities?.text),
      codeTrace: Boolean(existingUnit?.modalities?.codeTrace),
      missionLab: Boolean(existingUnit?.modalities?.missionLab),
    },
    bestQuizScore: existingUnit?.bestQuizScore ?? null,
    bestWorkbookScore: existingUnit?.bestWorkbookScore ?? null,
  };

  if (progressData) {
    const progressComp = extractProgressCompletion(progressData);
    if (progressComp.text) result.modalities.text = true;
    if (progressComp.video) result.modalities.video = true;
    if (progressComp.missionLab) result.modalities.missionLab = true;
  }

  rows.forEach((data) => {
    const type = historyActivityType(data);
    if (Object.prototype.hasOwnProperty.call(result.modalities, type)) {
      result.modalities[type] = true;
    }
    if (type === "quiz" && Number.isFinite(Number(data.score))) {
      result.bestQuizScore = Math.max(result.bestQuizScore ?? -Infinity, Number(data.score));
    }
    if (type === "workbook" && Number.isFinite(Number(data.score))) {
      result.bestWorkbookScore = Math.max(result.bestWorkbookScore ?? -Infinity, Number(data.score));
    }
    const timestampMs = historyTimestampMs(data);
    if (timestampMs >= result.lastActivityMs) {
      result.lastActivityMs = timestampMs;
      if (data.clusterId) result.clusterId = cleanText(data.clusterId, 120);
      if (data.regionId) result.regionId = cleanText(data.regionId, 180);
      if (data.chapterId) result.chapterId = cleanText(data.chapterId, 180);
    }
  });

  const hasAnyModality = Object.values(result.modalities).some(Boolean);
  if (!hasAnyModality && rows.length === 0) return null;
  return result;
}

/**
 * Builds full summary from scratch. Used only when learningSummaries document is missing.
 */
function buildLearningSummaryFromScratch(historyDocs = [], progressDocs = []) {
  const dailyMap = new Map();
  const unitRows = new Map();
  const progressByUnitId = new Map();
  const stats = {
    quizAttempts: 0,
    quizScoreSum: 0,
    perfectAttempts: 0,
    workbookAttempts: 0,
    workbookScoreSum: 0,
    workbookPerfectAttempts: 0,
    darkMatterRecovered: 0,
  };

  (progressDocs || []).forEach((docSnap) => {
    const data = docSnap.data ? docSnap.data() : docSnap;
    const unitId = docSnap.id || data?.unitId;
    if (unitId) progressByUnitId.set(unitId, data);
  });

  historyDocs.forEach((row) => {
    const data = row.data ? row.data() : row;
    applyHistoryToDailyStats(dailyMap, data, 1);
    if (data.unitId) {
      if (!unitRows.has(data.unitId)) unitRows.set(data.unitId, []);
      unitRows.get(data.unitId).push(data);
    }
    const type = historyActivityType(data);
    if (type === "quiz") {
      stats.quizAttempts += 1;
      stats.quizScoreSum += Number(data.score || 0);
      if (Number(data.score) === 100) stats.perfectAttempts += 1;
    } else if (type === "workbook") {
      stats.workbookAttempts += 1;
      stats.workbookScoreSum += Number(data.score || 0);
      if (Number(data.score) === 100) stats.workbookPerfectAttempts += 1;
    }
    if (String(data.unitId || "").includes("dark_matter") && Number(data.score || 0) >= 80) {
      stats.darkMatterRecovered += 1;
    }
  });

  const allUnitIds = Array.from(new Set([...unitRows.keys(), ...progressByUnitId.keys()]));
  const oldestAllowed = getKSTDateString(new Date(Date.now() - (LEARNING_SUMMARY_MAX_DAYS * 24 * 60 * 60 * 1000)));
  const daily = Array.from(dailyMap.values()).filter((row) => row.date >= oldestAllowed).sort((a, b) => a.date.localeCompare(b.date));
  const units = allUnitIds
    .map((unitId) => buildUnitLearningSummary(
      unitId,
      unitRows.get(unitId) || [],
      progressByUnitId.get(unitId) || null,
      null
    ))
    .filter(Boolean);

  return {
    schemaVersion: LEARNING_SUMMARY_SCHEMA_VERSION,
    totalHistoryCount: historyDocs.length,
    daily,
    units,
    stats,
  };
}

/**
 * Migrates existing summary to Schema v3 WITHOUT modifying stats, daily, or totalHistoryCount.
 * Only upgrades units array to 6 modalities and monotonically OR-merges progressDocs completions.
 */
function migrateExistingSummaryToV3(existingSummary, progressDocs = []) {
  if (!existingSummary) return null;

  const progressByUnitId = new Map();
  (progressDocs || []).forEach((docSnap) => {
    const data = docSnap.data ? docSnap.data() : docSnap;
    const unitId = docSnap.id || data?.unitId;
    if (unitId) progressByUnitId.set(unitId, data);
  });

  const existingUnitsMap = new Map((existingSummary.units || []).map((u) => [u.unitId, u]));
  const allUnitIds = Array.from(new Set([...existingUnitsMap.keys(), ...progressByUnitId.keys()]));

  const updatedUnits = allUnitIds
    .map((unitId) => {
      const existingUnit = existingUnitsMap.get(unitId) || null;
      const progressData = progressByUnitId.get(unitId) || null;
      return buildUnitLearningSummary(unitId, [], progressData, existingUnit);
    })
    .filter(Boolean);

  return {
    ...existingSummary,
    schemaVersion: LEARNING_SUMMARY_SCHEMA_VERSION,
    units: updatedUnits,
    // stats, daily, totalHistoryCount are 100% PRESERVED intact!
  };
}

/**
 * Audits a summary document against actual progressDocs.
 * Returns array of mismatch descriptions. Empty array means 100% integrity.
 */
function auditSummaryAgainstProgress(uid, summary, progressDocs = []) {
  const mismatches = [];
  const hasAnyCompletedProgress = (progressDocs || []).some((docSnap) => {
    const data = docSnap.data ? docSnap.data() : docSnap;
    const comp = extractProgressCompletion(data);
    return comp.text || comp.video || comp.missionLab;
  });

  if (!summary) {
    if (hasAnyCompletedProgress) {
      mismatches.push(`User ${uid}: learningSummaries document does not exist but completed progress exists`);
    }
    return mismatches;
  }
  if (summary.schemaVersion !== LEARNING_SUMMARY_SCHEMA_VERSION) {
    mismatches.push(`User ${uid}: schemaVersion is ${summary.schemaVersion}, expected ${LEARNING_SUMMARY_SCHEMA_VERSION}`);
  }

  const summaryUnitsMap = new Map((summary.units || []).map((u) => [u.unitId, u]));

  (progressDocs || []).forEach((docSnap) => {
    const data = docSnap.data ? docSnap.data() : docSnap;
    const unitId = docSnap.id || data?.unitId;
    if (!unitId) return;

    const comp = extractProgressCompletion(data);
    const sumUnit = summaryUnitsMap.get(unitId);
    const sumModalities = sumUnit?.modalities || {};

    if (comp.text && !sumModalities.text) {
      mismatches.push(`User ${uid} Unit ${unitId}: progress.logRead=true but summary.modalities.text=false`);
    }
    if (comp.video && !sumModalities.video) {
      mismatches.push(`User ${uid} Unit ${unitId}: progress.videoCompleted=true but summary.modalities.video=false`);
    }
    if (comp.missionLab && !sumModalities.missionLab) {
      mismatches.push(`User ${uid} Unit ${unitId}: progress.missionLabCompleted=true but summary.modalities.missionLab=false`);
    }
  });

  return mismatches;
}

module.exports = {
  LEARNING_SUMMARY_SCHEMA_VERSION,
  LEARNING_SUMMARY_MAX_DAYS,
  cleanText,
  getKSTDateString,
  historyTimestampMs,
  historyActivityType,
  extractProgressCompletion,
  blankDailyLearningStats,
  applyHistoryToDailyStats,
  buildUnitLearningSummary,
  buildLearningSummaryFromScratch,
  migrateExistingSummaryToV3,
  auditSummaryAgainstProgress,
};
