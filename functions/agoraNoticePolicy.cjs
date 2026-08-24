const crypto = require("crypto");

const NOTICE_TITLE_MAX_LENGTH = 100;
const NOTICE_CONTENT_MAX_LENGTH = 3000;
const NOTICE_FEATURE_LIMIT = 3;

function normalizeTitle(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeContent(value) {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function validateCreateNoticeInput(data = {}) {
  const commandId = String(data.commandId || "").trim();
  const title = normalizeTitle(data.title);
  const content = normalizeContent(data.content);

  if (!/^[A-Za-z0-9_-]{8,120}$/.test(commandId)) {
    throw new Error("INVALID_COMMAND_ID");
  }
  if (!title || title.length > NOTICE_TITLE_MAX_LENGTH) {
    throw new Error("INVALID_TITLE");
  }
  if (!content || content.length > NOTICE_CONTENT_MAX_LENGTH) {
    throw new Error("INVALID_CONTENT");
  }

  return { commandId, title, content };
}

function buildNoticeId(uid, commandId) {
  return crypto.createHash("sha256").update(`${uid}:${commandId}`).digest("hex").slice(0, 32);
}

function buildPayloadHash({ title, content }) {
  return crypto.createHash("sha256").update(JSON.stringify({ title, content })).digest("hex");
}

function validateUpdateNoticeInput(data = {}) {
  const noticeId = String(data.noticeId || "").trim();
  const title = normalizeTitle(data.title);
  const content = normalizeContent(data.content);

  if (!/^[A-Za-z0-9_-]{1,128}$/.test(noticeId)) {
    throw new Error("INVALID_NOTICE_ID");
  }
  if (!title || title.length > NOTICE_TITLE_MAX_LENGTH) {
    throw new Error("INVALID_TITLE");
  }
  if (!content || content.length > NOTICE_CONTENT_MAX_LENGTH) {
    throw new Error("INVALID_CONTENT");
  }

  return { noticeId, title, content };
}

function validateDeleteNoticeInput(data = {}) {
  const noticeId = String(data.noticeId || "").trim();
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(noticeId)) {
    throw new Error("INVALID_NOTICE_ID");
  }
  return { noticeId };
}

function buildFeatureItems(existingItems, nextItem) {
  const safeExisting = Array.isArray(existingItems) ? existingItems : [];
  return [nextItem, ...safeExisting.filter((item) => item?.id && item.id !== nextItem.id)]
    .slice(0, NOTICE_FEATURE_LIMIT);
}

function updateFeatureItem(existingItems, updatedItem) {
  const safeExisting = Array.isArray(existingItems) ? existingItems : [];
  return safeExisting.map((item) => {
    if (item?.id === updatedItem.id) {
      return { ...item, title: updatedItem.title };
    }
    return item;
  });
}

function removeFeatureItem(existingItems, noticeId, backfillItems = []) {
  const safeExisting = Array.isArray(existingItems) ? existingItems : [];
  const filtered = safeExisting.filter((item) => item?.id && item.id !== noticeId);
  const safeBackfill = Array.isArray(backfillItems) ? backfillItems : [];
  for (const item of safeBackfill) {
    if (filtered.length >= NOTICE_FEATURE_LIMIT) break;
    if (item?.id && item.id !== noticeId && !filtered.some((f) => f.id === item.id)) {
      filtered.push(item);
    }
  }
  return filtered.slice(0, NOTICE_FEATURE_LIMIT);
}

function isOperatorEmail(actualEmail, expectedEmail) {
  const actual = String(actualEmail || "").trim().toLowerCase();
  const expected = String(expectedEmail || "").trim().toLowerCase();
  return Boolean(actual && expected && actual === expected);
}

function isVerifiedOperator(actualEmail, expectedEmail, emailVerified) {
  return emailVerified === true && isOperatorEmail(actualEmail, expectedEmail);
}

module.exports = {
  NOTICE_CONTENT_MAX_LENGTH,
  NOTICE_FEATURE_LIMIT,
  NOTICE_TITLE_MAX_LENGTH,
  buildFeatureItems,
  buildNoticeId,
  buildPayloadHash,
  isOperatorEmail,
  isVerifiedOperator,
  normalizeContent,
  normalizeTitle,
  removeFeatureItem,
  updateFeatureItem,
  validateCreateNoticeInput,
  validateDeleteNoticeInput,
  validateUpdateNoticeInput,
};

