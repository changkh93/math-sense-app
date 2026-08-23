const crypto = require("crypto");

const BOOK_STATUSES = {
  WANT_TO_READ: "want_to_read",
  READING: "reading",
  COMPLETED: "completed",
  PAUSED: "paused",
};

const ALLOWED_BOOK_STATUSES = new Set(Object.values(BOOK_STATUSES));

const LOG_EVENT_TYPES = {
  PROGRESS: "progress",
  STATUS_CHANGE: "status_change",
  CORRECTION: "correction",
};

const ALLOWED_LOG_EVENT_TYPES = new Set(Object.values(LOG_EVENT_TYPES));

const LOG_SOURCES = {
  ASSIGNMENT: "assignment",
  BOOKSHELF: "bookshelf",
  READING_LOUNGE: "reading_lounge",
};

const ALLOWED_LOG_SOURCES = new Set(Object.values(LOG_SOURCES));

const ERROR_CODES = {
  BOOK_NOT_FOUND: "BOOK_NOT_FOUND",
  BOOK_FORBIDDEN: "BOOK_FORBIDDEN",
  BOOK_NOT_STARTED: "BOOK_NOT_STARTED",
  INVALID_BOOK_TITLE: "INVALID_BOOK_TITLE",
  INVALID_BOOK_AUTHOR: "INVALID_BOOK_AUTHOR",
  INVALID_BOOK_STATUS: "INVALID_BOOK_STATUS",
  INVALID_READING_PAGE: "INVALID_READING_PAGE",
  INVALID_READ_AT: "INVALID_READ_AT",
  INVALID_COMMAND_ID: "INVALID_COMMAND_ID",
  DUPLICATE_COMMAND: "DUPLICATE_COMMAND",
  ASSIGNMENT_LOCKED: "ASSIGNMENT_LOCKED",
  BOOK_CHANGE_LOCKED: "BOOK_CHANGE_LOCKED",
  SUBMISSION_PERIOD_EXPIRED: "SUBMISSION_PERIOD_EXPIRED",
  READING_WRITE_FAILED: "READING_WRITE_FAILED",
};

/**
 * Normalize title and author by removing all whitespace and lowercasing
 */
function normalizeString(val = "") {
  return String(val || "").replace(/\s+/g, "").toLowerCase().trim();
}

function cleanText(val = "", maxLen = 200) {
  return String(val || "").replace(/\s+/g, " ").trim().slice(0, maxLen);
}

function validateDateString(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day;
}

function validateClockTime(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || ""));
  if (!match) return false;
  return Number(match[1]) >= 0 && Number(match[1]) <= 23 &&
    Number(match[2]) >= 0 && Number(match[2]) <= 59;
}

function validateBookInput({ title, author, status = BOOK_STATUSES.READING }) {
  const fullTitle = String(title || "").replace(/\s+/g, " ").trim();
  const fullAuthor = String(author || "").replace(/\s+/g, " ").trim();
  const cleanedTitle = cleanText(fullTitle, 200);
  const cleanedAuthor = cleanText(fullAuthor, 120);

  if (!fullTitle || fullTitle.length > 200) {
    return { valid: false, error: ERROR_CODES.INVALID_BOOK_TITLE, message: "책 제목은 1~200자 사이여야 합니다." };
  }
  if (!fullAuthor || fullAuthor.length > 120) {
    return { valid: false, error: ERROR_CODES.INVALID_BOOK_AUTHOR, message: "저자는 1~120자 사이여야 합니다." };
  }
  if (status && !ALLOWED_BOOK_STATUSES.has(status)) {
    return { valid: false, error: ERROR_CODES.INVALID_BOOK_STATUS, message: "올바른 독서 상태를 선택해 주세요." };
  }

  return {
    valid: true,
    title: cleanedTitle,
    author: cleanedAuthor,
    normalizedTitle: normalizeString(cleanedTitle),
    normalizedAuthor: normalizeString(cleanedAuthor),
    status: status || BOOK_STATUSES.READING,
  };
}

function validatePage(page) {
  const num = Number(page);
  if (!Number.isInteger(num) || num < 1 || num > 99999) {
    return { valid: false, error: ERROR_CODES.INVALID_READING_PAGE, message: "페이지는 1~99,999 범위의 정수여야 합니다." };
  }
  return { valid: true, page: num };
}

/**
 * Deterministic IDs
 */
function getDeterministicAssignmentId(userId, dateStr) {
  const safeUid = String(userId || "").trim();
  const safeDate = String(dateStr || "").trim();
  return `classic__${safeUid}__${safeDate}`;
}

function getDeterministicAssignmentLogId(assignmentId) {
  return `assignment__${String(assignmentId || "").trim()}`;
}

function getCommandDocId(userId, commandId) {
  const safeUid = String(userId || "").trim();
  const safeCommandId = String(commandId || "").trim();
  return `${safeUid}__${safeCommandId}`;
}

/**
 * Calculate SHA256 hash of payload for idempotency checking
 */
function stableSerialize(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(",")}}`;
}

function hashPayload(payload) {
  const stableJson = stableSerialize(payload || {});
  return crypto.createHash("sha256").update(stableJson).digest("hex");
}

/**
 * Compare two reading logs for latest sorting
 * Priority: readAt timestamp DESC, document ID DESC (secondary)
 */
function compareLogsDesc(a, b) {
  const aMs = a.readAtMs ?? (a.readAt?.toMillis ? a.readAt.toMillis() : new Date(a.readAt || 0).getTime());
  const bMs = b.readAtMs ?? (b.readAt?.toMillis ? b.readAt.toMillis() : new Date(b.readAt || 0).getTime());
  if (bMs !== aMs) return bMs - aMs;
  return String(b.id || "").localeCompare(String(a.id || ""));
}

/**
 * Re-calculate readingBook progress projections from valid logs list
 */
function calculateReadingBookProgressFromLogs(logs = []) {
  const validLogs = (Array.isArray(logs) ? logs : []).filter(
    (log) => !log.voidedAt && log.eventType === LOG_EVENT_TYPES.PROGRESS && Number.isInteger(Number(log.page))
  );

  if (validLogs.length === 0) {
    return {
      latestReadPage: 0,
      furthestPage: 0,
      latestReadAt: null,
      latestLogId: null,
    };
  }

  const sortedLogs = [...validLogs].sort(compareLogsDesc);
  const latestLog = sortedLogs[0];

  let furthest = 0;
  for (const log of validLogs) {
    const p = Number(log.page) || 0;
    if (p > furthest) furthest = p;
  }

  return {
    latestReadPage: Number(latestLog.page) || 0,
    furthestPage: furthest,
    latestReadAt: latestLog.readAt,
    latestLogId: latestLog.id || null,
  };
}

/**
 * Incremental calculation for a single new progress log
 */
function calculateIncrementalProgress(currentProgress = {}, newLog = {}) {
  const curLatestPage = Number(currentProgress.latestReadPage || 0);
  const curFurthestPage = Number(currentProgress.furthestPage || 0);
  const newPage = Number(newLog.page || 0);

  const curLatestMs = currentProgress.latestReadAt
    ? (currentProgress.latestReadAt.toMillis ? currentProgress.latestReadAt.toMillis() : new Date(currentProgress.latestReadAt).getTime())
    : 0;

  const newLogMs = newLog.readAt
    ? (newLog.readAt.toMillis ? newLog.readAt.toMillis() : new Date(newLog.readAt).getTime())
    : 0;

  const currentId = String(currentProgress.latestLogId || "");
  const newId = String(newLog.id || "");
  const isNewer = newLogMs > curLatestMs || (newLogMs === curLatestMs && newId.localeCompare(currentId) > 0);

  return {
    latestReadPage: isNewer ? newPage : curLatestPage,
    furthestPage: Math.max(curFurthestPage, newPage),
    latestReadAt: isNewer ? newLog.readAt : currentProgress.latestReadAt,
    latestLogId: isNewer ? (newLog.id || null) : currentProgress.latestLogId,
  };
}

/**
 * Validate status transition
 */
function validateStatusTransition(currentStatus, targetStatus) {
  if (!ALLOWED_BOOK_STATUSES.has(targetStatus)) {
    return { allowed: false, error: ERROR_CODES.INVALID_BOOK_STATUS };
  }
  if (currentStatus === targetStatus) {
    return { allowed: true, unchanged: true };
  }
  // All transitions between reading, completed, paused are allowed with appropriate timestamps
  return { allowed: true, unchanged: false };
}

function toKSTDateString(dateOrTimestamp) {
  if (!dateOrTimestamp) return null;
  const d = typeof dateOrTimestamp.toDate === "function"
    ? dateOrTimestamp.toDate()
    : (dateOrTimestamp instanceof Date ? dateOrTimestamp : new Date(dateOrTimestamp));
  if (isNaN(d.getTime())) return null;
  const kstTime = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kstTime.toISOString().slice(0, 10);
}

function getDaysBetween(dateStrA, dateStrB) {
  const msA = Date.parse(`${dateStrA}T00:00:00Z`);
  const msB = Date.parse(`${dateStrB}T00:00:00Z`);
  return Math.round((msB - msA) / (24 * 60 * 60 * 1000));
}

function isReadingLogEligibleForDayCredit({ readDateKst, recordedAt }) {
  if (!validateDateString(readDateKst)) return false;
  if (!recordedAt) return true; // fallback for legacy logs
  const recDateKst = toKSTDateString(recordedAt);
  if (!recDateKst) return false;
  const gapDays = getDaysBetween(readDateKst, recDateKst);
  // recordedAt must be on or after readDateKst, within 30 days
  return gapDays >= 0 && gapDays <= 30;
}

function calculateStreaks(dateStrings = [], todayKst = null) {
  const validDates = Array.from(new Set(dateStrings.filter(validateDateString))).sort();
  if (validDates.length === 0) {
    return { currentReadingStreak: 0, longestReadingStreak: 0, totalReadingDays: 0 };
  }

  let longest = 0;
  let currentRun = 0;
  let prevMs = null;

  for (const dateStr of validDates) {
    const currentMs = Date.parse(`${dateStr}T00:00:00Z`);
    if (prevMs === null) {
      currentRun = 1;
    } else {
      const diffDays = Math.round((currentMs - prevMs) / (24 * 60 * 60 * 1000));
      if (diffDays === 1) {
        currentRun += 1;
      } else if (diffDays > 1) {
        currentRun = 1;
      }
    }
    if (currentRun > longest) {
      longest = currentRun;
    }
    prevMs = currentMs;
  }

  // Current streak ending today or yesterday
  const refToday = todayKst && validateDateString(todayKst) ? todayKst : toKSTDateString(new Date());
  const refTodayMs = Date.parse(`${refToday}T00:00:00Z`);
  const yesterdayMs = refTodayMs - 24 * 60 * 60 * 1000;
  const yesterdayStr = new Date(yesterdayMs).toISOString().slice(0, 10);

  const dateSet = new Set(validDates);
  let curStreak = 0;
  let checkMs = dateSet.has(refToday) ? refTodayMs : (dateSet.has(yesterdayStr) ? yesterdayMs : null);

  if (checkMs !== null) {
    while (true) {
      const checkStr = new Date(checkMs).toISOString().slice(0, 10);
      if (dateSet.has(checkStr)) {
        curStreak += 1;
        checkMs -= 24 * 60 * 60 * 1000;
      } else {
        break;
      }
    }
  }

  return {
    currentReadingStreak: curStreak,
    longestReadingStreak: longest,
    totalReadingDays: validDates.length,
  };
}

function isBookEligibleForCompletion(bookData = {}) {
  if (!bookData || bookData.archivedAt) return false;
  if (bookData.status !== BOOK_STATUSES.COMPLETED) return false;
  const totalPages = Number(bookData.totalPages || 0);
  const furthestPage = Number(bookData.progress?.furthestPage || 0);
  if (totalPages <= 0 || furthestPage < totalPages) return false;

  const achievementStats = bookData.achievementStats || {};
  const reviewedAssignmentCount = Number(achievementStats.reviewedAssignmentCount || 0);
  const validReadingDayCount = Number(achievementStats.validReadingDayCount || 0);

  return reviewedAssignmentCount >= 1 || validReadingDayCount >= 2;
}

module.exports = {
  BOOK_STATUSES,
  ALLOWED_BOOK_STATUSES,
  LOG_EVENT_TYPES,
  ALLOWED_LOG_EVENT_TYPES,
  LOG_SOURCES,
  ALLOWED_LOG_SOURCES,
  ERROR_CODES,
  normalizeString,
  cleanText,
  validateDateString,
  validateClockTime,
  validateBookInput,
  validatePage,
  getDeterministicAssignmentId,
  getDeterministicAssignmentLogId,
  getCommandDocId,
  hashPayload,
  stableSerialize,
  compareLogsDesc,
  calculateReadingBookProgressFromLogs,
  calculateIncrementalProgress,
  validateStatusTransition,
  toKSTDateString,
  isReadingLogEligibleForDayCredit,
  calculateStreaks,
  isBookEligibleForCompletion,
};
