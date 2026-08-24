const crypto = require("crypto");

const REACTION_TYPES = {
  WANT_TO_READ: "want_to_read",
  RESONATED: "resonated",
};

const ALLOWED_REACTION_TYPES = new Set(Object.values(REACTION_TYPES));

const INTENT_TYPES = {
  WANT_TO_READ: "want_to_read",
  READ: "read",
};

const ALLOWED_INTENT_TYPES = new Set(Object.values(INTENT_TYPES));

const REPORT_REASONS = {
  SPOILER: "spoiler",
  HARASSMENT: "harassment",
  PERSONAL_INFO: "personal_info",
  INAPPROPRIATE: "inappropriate",
  OTHER: "other",
};

const ALLOWED_REPORT_REASONS = new Set(Object.values(REPORT_REASONS));

const SHARE_STATUSES = {
  ACTIVE: "active",
  WITHDRAWN: "withdrawn",
  UNDER_REVIEW: "under_review",
  HIDDEN: "hidden",
};

const ALLOWED_SHARE_STATUSES = new Set(Object.values(SHARE_STATUSES));

const SHARE_KINDS = {
  READING_INVITATION: "reading_invitation",
  COMPLETED_RECOMMENDATION: "completed_recommendation",
};

const SHAREABLE_BOOK_STATUSES = new Set(["reading", "completed"]);

const COMMENT_STATUSES = {
  VISIBLE: "visible",
  DELETED: "deleted",
  HIDDEN: "hidden",
};

const DAILY_LIMITS = {
  PUBLISH: 3,
  COMMENT: 50,
  REPORT: 10,
  REACTION: 100,
  LINK_BOOK: 20,
  REACTION_LIST: 60,
};

const ERROR_CODES = {
  SHARE_NOT_FOUND: "SHARE_NOT_FOUND",
  SHARE_FORBIDDEN: "SHARE_FORBIDDEN",
  SHARE_INACTIVE: "SHARE_INACTIVE",
  BOOK_NOT_FOUND: "BOOK_NOT_FOUND",
  BOOK_FORBIDDEN: "BOOK_FORBIDDEN",
  BOOK_NOT_STARTED: "BOOK_NOT_STARTED",
  BOOK_NOT_SHAREABLE: "BOOK_NOT_SHAREABLE",
  CANNOT_LINK_OWN_SHARE: "CANNOT_LINK_OWN_SHARE",
  ROOT_COMMENT_NOT_FOUND: "ROOT_COMMENT_NOT_FOUND",
  ROOT_COMMENT_INACTIVE: "ROOT_COMMENT_INACTIVE",
  REPLY_NOT_FOUND: "REPLY_NOT_FOUND",
  INVALID_ONE_LINE: "INVALID_ONE_LINE",
  INVALID_REASON: "INVALID_REASON",
  INVALID_QUESTION: "INVALID_QUESTION",
  INVALID_SHARED_NOTES: "INVALID_SHARED_NOTES",
  INVALID_COMMENT: "INVALID_COMMENT",
  INVALID_REPLY: "INVALID_REPLY",
  INVALID_INTENT: "INVALID_INTENT",
  INVALID_REACTION_TYPE: "INVALID_REACTION_TYPE",
  INVALID_REPORT_REASON: "INVALID_REPORT_REASON",
  INVALID_REPORT_DETAIL: "INVALID_REPORT_DETAIL",
  INVALID_PAGE: "INVALID_PAGE",
  INVALID_DOCUMENT_ID: "INVALID_DOCUMENT_ID",
  SELF_REACTION_NOT_ALLOWED: "SELF_REACTION_NOT_ALLOWED",
  SELF_REPORT_NOT_ALLOWED: "SELF_REPORT_NOT_ALLOWED",
  DUPLICATE_REPORT: "DUPLICATE_REPORT",
  DAILY_LIMIT_EXCEEDED: "DAILY_LIMIT_EXCEEDED",
  INVALID_COMMAND_ID: "INVALID_COMMAND_ID",
  DUPLICATE_COMMAND: "DUPLICATE_COMMAND",
};

/**
 * Remove control characters, HTML tags, and normalize whitespaces
 */
function sanitizeText(val = "", maxLen = 1000) {
  if (typeof val !== "string") return "";
  return val
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, "") // control chars
    .replace(/<[^>]*>/g, "") // strip HTML tags
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLen);
}

function cleanSingleLineText(val = "", maxLen = 200) {
  if (typeof val !== "string") return "";
  return val
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

function validateSharedNotes(sharedNotes = []) {
  if (!Array.isArray(sharedNotes) || sharedNotes.length > 12) {
    return { valid: false, message: "함께 공개할 독서 기록은 최대 12개까지 선택할 수 있습니다." };
  }

  const seen = new Set();
  const notes = [];
  for (const raw of sharedNotes) {
    if (!raw || typeof raw !== "object") continue;
    const id = cleanSingleLineText(raw.id, 500);
    const text = sanitizeText(raw.text, 301);
    if (!id || !text || text.length > 300 || seen.has(id)) continue;
    seen.add(id);
    const numericPage = Number(raw.page);
    notes.push({
      id,
      text,
      source: raw.source === "assignment" ? "assignment" : "reading_log",
      date: cleanSingleLineText(raw.date, 20),
      page: Number.isInteger(numericPage) && numericPage > 0 && numericPage <= 99999 ? numericPage : null,
    });
  }
  return { valid: true, notes };
}

function validateReadingShareInput({ oneLine, reason = "", question = "", hasSpoiler = false, sharedNotes = [], isPagePublic = false, page = null }) {
  // Normalize first and reject overlong input instead of silently truncating it.
  // Silent truncation can publish wording the author never approved in preview.
  const cleanedOneLine = cleanSingleLineText(oneLine, 10000);
  const cleanedReason = sanitizeText(reason, 10000);
  const cleanedQuestion = cleanSingleLineText(question, 10000);

  if (!cleanedOneLine || cleanedOneLine.length < 10 || cleanedOneLine.length > 160) {
    return {
      valid: false,
      error: ERROR_CODES.INVALID_ONE_LINE,
      message: "친구들에게 소개하는 한마디는 10자 이상 160자 이하로 작성해 주세요.",
    };
  }

  if (cleanedReason.length > 600) {
    return {
      valid: false,
      error: ERROR_CODES.INVALID_REASON,
      message: "덧붙이는 이야기는 600자 이하로 작성해 주세요.",
    };
  }

  if (cleanedQuestion.length > 200) {
    return {
      valid: false,
      error: ERROR_CODES.INVALID_QUESTION,
      message: "함께 나눌 질문은 200자 이하로 작성해 주세요.",
    };
  }

  const validatedNotes = validateSharedNotes(sharedNotes);
  if (!validatedNotes.valid || validatedNotes.notes.length !== sharedNotes.length) {
    return {
      valid: false,
      error: ERROR_CODES.INVALID_SHARED_NOTES,
      message: validatedNotes.message || "함께 공개할 독서 기록 형식이 올바르지 않습니다.",
    };
  }

  let finalPage = null;
  if (isPagePublic) {
    const num = Number(page);
    if (!Number.isInteger(num) || num < 1 || num > 99999) {
      return {
        valid: false,
        error: ERROR_CODES.INVALID_PAGE,
        message: "공개할 페이지는 1쪽 이상 99,999쪽 이하로 입력해 주세요.",
      };
    }
    finalPage = num;
  }

  return {
    valid: true,
    review: {
      oneLine: cleanedOneLine,
      reason: cleanedReason || "",
      question: cleanedQuestion || "",
      hasSpoiler: Boolean(hasSpoiler),
      sharedNotes: validatedNotes.notes,
    },
    page: finalPage,
  };
}

function validateCommentInput(content) {
  const cleanedContent = sanitizeText(content, 10000);
  if (!cleanedContent || cleanedContent.length < 1 || cleanedContent.length > 240) {
    return {
      valid: false,
      error: ERROR_CODES.INVALID_COMMENT,
      message: "댓글은 1자 이상 240자 이하로 입력해 주세요.",
    };
  }
  return {
    valid: true,
    content: cleanedContent,
  };
}

function validateReactionType(reactionType) {
  if (reactionType === null || reactionType === undefined || reactionType === "") {
    return { valid: true, reactionType: null };
  }
  if (!ALLOWED_REACTION_TYPES.has(reactionType)) {
    return {
      valid: false,
      error: ERROR_CODES.INVALID_REACTION_TYPE,
      message: "올바른 반응 유형이 아닙니다.",
    };
  }
  return { valid: true, reactionType };
}

function validateReportInput({ reason, detail = "" }) {
  if (!ALLOWED_REPORT_REASONS.has(reason)) {
    return {
      valid: false,
      error: ERROR_CODES.INVALID_REPORT_REASON,
      message: "올바른 신고 사유를 선택해 주세요.",
    };
  }
  const cleanedDetail = sanitizeText(detail, 10000);
  if (cleanedDetail.length > 300) {
    return {
      valid: false,
      error: ERROR_CODES.INVALID_REPORT_DETAIL,
      message: "신고 상세 설명은 300자 이하로 입력해 주세요.",
    };
  }
  return {
    valid: true,
    reason,
    detail: cleanedDetail,
  };
}

function getReadingShareId(ownerId, bookId) {
  const safeUid = String(ownerId || "").trim();
  const safeBookId = String(bookId || "").trim();
  return `${safeUid}__${safeBookId}`;
}

function getShareKindForBookStatus(status) {
  return status === "completed"
    ? SHARE_KINDS.COMPLETED_RECOMMENDATION
    : SHARE_KINDS.READING_INVITATION;
}

function isShareableBookStatus(status) {
  return SHAREABLE_BOOK_STATUSES.has(status);
}

function getReadingShareReportId(shareId, reporterId) {
  const safeShareId = String(shareId || "").trim();
  const safeReporterId = String(reporterId || "").trim();
  return `${safeShareId}__${safeReporterId}`;
}

function getDailyUsageDocId(userId, dateStrKST) {
  const safeUid = String(userId || "").trim();
  const safeDate = String(dateStrKST || "").trim();
  return `${safeUid}__${safeDate}`;
}

function getDeterministicCommentId(shareId, commandId) {
  const safeShareId = String(shareId || "").trim();
  const safeCommandId = String(commandId || "").trim();
  return `comment__${safeShareId}__${safeCommandId}`;
}

function isSafeDocumentId(value, maxLength = 500) {
  const normalized = String(value || "").trim();
  return Boolean(
    normalized &&
    normalized.length <= maxLength &&
    normalized !== "." &&
    normalized !== ".." &&
    !normalized.includes("/") &&
    !/[\u0000-\u001F\u007F-\u009F]/.test(normalized)
  );
}

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

function getPublicDisplayName(userData = {}) {
  if (userData.publicDisplayName && typeof userData.publicDisplayName === "string" && userData.publicDisplayName.trim()) {
    return userData.publicDisplayName.trim().slice(0, 30);
  }
  const privateName = [userData.studentName, userData.name, userData.displayName]
    .find((value) => typeof value === "string" && value.trim());
  if (privateName) {
    const trimmed = cleanSingleLineText(privateName, 30);
    if (trimmed.length === 1) return `${trimmed}*`;
    if (trimmed.length === 2) return `${trimmed[0]}*`;
    return `${trimmed[0]}*${trimmed.slice(-1)}`;
  }
  return "별빛 탐험가";
}

function calculateReactionDelta(currentType, targetType) {
  let wantToReadDelta = 0;
  let resonatedDelta = 0;

  if (currentType === targetType) {
    return { wantToReadDelta: 0, resonatedDelta: 0 };
  }

  if (currentType === REACTION_TYPES.WANT_TO_READ) {
    wantToReadDelta -= 1;
  } else if (currentType === REACTION_TYPES.RESONATED) {
    resonatedDelta -= 1;
  }

  if (targetType === REACTION_TYPES.WANT_TO_READ) {
    wantToReadDelta += 1;
  } else if (targetType === REACTION_TYPES.RESONATED) {
    resonatedDelta += 1;
  }

  return { wantToReadDelta, resonatedDelta };
}

function validateReplyInput(content) {
  const cleanedContent = sanitizeText(content, 10000);
  if (!cleanedContent || cleanedContent.length < 1 || cleanedContent.length > 240) {
    return {
      valid: false,
      error: ERROR_CODES.INVALID_REPLY,
      message: "답글은 1자 이상 240자 이하로 입력해 주세요.",
    };
  }
  return {
    valid: true,
    content: cleanedContent,
  };
}

function validateReadingIntent(intent) {
  if (!intent || !ALLOWED_INTENT_TYPES.has(intent)) {
    return {
      valid: false,
      error: ERROR_CODES.INVALID_INTENT,
      message: "올바른 독서 의도(want_to_read 또는 read)를 선택해 주세요.",
    };
  }
  return { valid: true, intent };
}

function normalizeString(val = "") {
  return String(val || "").replace(/\s+/g, "").toLowerCase().trim();
}

function getDeterministicSocialBookId(userId, title, author) {
  const safeUid = String(userId || "").trim().slice(0, 12);
  const normTitle = normalizeString(title);
  const normAuthor = normalizeString(author);
  const hash = crypto
    .createHash("sha256")
    .update(`${normTitle}\n${normAuthor}`)
    .digest("hex")
    .slice(0, 24);
  return `social__${safeUid}__${hash}`;
}

function getDeterministicReplyId(shareId, rootCommentId, commandId) {
  const safeShareId = String(shareId || "").trim();
  const safeRootCommentId = String(rootCommentId || "").trim();
  const safeCommandId = String(commandId || "").trim();
  return `reply__${safeShareId}__${safeRootCommentId}__${safeCommandId}`;
}

function getReplyNotificationId(shareId, rootCommentId, replyId, recipientId) {
  const digest = hashPayload({ shareId, rootCommentId, replyId, recipientId }).slice(0, 40);
  return `reading_share_reply_${digest}`;
}

function resolveReactionState(reactionData = {}) {
  const raw = reactionData || {};
  const resonated = raw.resonated ?? raw.type === REACTION_TYPES.RESONATED;
  const readingIntent = raw.readingIntent ?? (
    raw.type === REACTION_TYPES.WANT_TO_READ ? INTENT_TYPES.WANT_TO_READ : null
  );
  return {
    resonated: Boolean(resonated),
    readingIntent: readingIntent || null,
    linkedBookId: raw.linkedBookId || null,
    schemaVersion: raw.schemaVersion || 1,
  };
}

module.exports = {
  REACTION_TYPES,
  ALLOWED_REACTION_TYPES,
  INTENT_TYPES,
  ALLOWED_INTENT_TYPES,
  REPORT_REASONS,
  ALLOWED_REPORT_REASONS,
  SHARE_STATUSES,
  ALLOWED_SHARE_STATUSES,
  SHARE_KINDS,
  SHAREABLE_BOOK_STATUSES,
  COMMENT_STATUSES,
  DAILY_LIMITS,
  ERROR_CODES,
  sanitizeText,
  cleanSingleLineText,
  normalizeString,
  validateReadingShareInput,
  validateSharedNotes,
  validateCommentInput,
  validateReplyInput,
  validateReadingIntent,
  validateReactionType,
  validateReportInput,
  getReadingShareId,
  getShareKindForBookStatus,
  isShareableBookStatus,
  getReadingShareReportId,
  getDailyUsageDocId,
  getDeterministicCommentId,
  getDeterministicReplyId,
  getDeterministicSocialBookId,
  getReplyNotificationId,
  resolveReactionState,
  isSafeDocumentId,
  stableSerialize,
  hashPayload,
  getPublicDisplayName,
  calculateReactionDelta,
};
