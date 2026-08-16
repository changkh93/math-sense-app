/**
 * Reading Time & Timezone Utilities
 * Authoritative timezone: Asia/Seoul (UTC+9)
 */

const KST_TIMEZONE = 'Asia/Seoul';

const KST_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: KST_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

const KST_TIME_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: KST_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
});

const KST_FULL_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: KST_TIMEZONE,
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

/**
 * Get current date string in Asia/Seoul: YYYY-MM-DD
 */
export function getKSTDateString(date = new Date()) {
  return KST_DATE_FORMATTER.format(date);
}

/**
 * Get current clock time in Asia/Seoul: HH:mm
 */
export function getKSTTimeString(date = new Date()) {
  const parts = KST_TIME_FORMATTER.formatToParts(date);
  const hour = parts.find(p => p.type === 'hour')?.value.padStart(2, '0') || '00';
  const minute = parts.find(p => p.type === 'minute')?.value.padStart(2, '0') || '00';
  return `${hour}:${minute}`;
}

/**
 * Parse Date or Firestore Timestamp into millis
 */
export function toTimestampMillis(val) {
  if (!val) return 0;
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (typeof val.seconds === 'number') return val.seconds * 1000;
  if (typeof val._seconds === 'number') return val._seconds * 1000;
  if (val instanceof Date) return val.getTime();
  const parsed = new Date(val).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Construct ISO string with +09:00 offset from dateStr (YYYY-MM-DD) and clockTime (HH:mm)
 */
export function buildKSTDateTimeIso(dateStr, clockTime = '12:00') {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || ''));
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(String(clockTime || ''));
  if (!dateMatch || !timeMatch) return null;
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const dateCandidate = new Date(Date.UTC(year, month - 1, day));
  if (dateCandidate.getUTCFullYear() !== year || dateCandidate.getUTCMonth() !== month - 1 || dateCandidate.getUTCDate() !== day) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${dateStr}T${clockTime}:00+09:00`;
}

/**
 * Convert dateStr & clockTime into JavaScript Date
 */
export function parseKSTDateTime(dateStr, clockTime = '12:00') {
  const iso = buildKSTDateTimeIso(dateStr, clockTime);
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d : null;
}

/**
 * Format timestamp into readable Korean string: e.g. "2026년 8월 16일 20:10"
 */
export function formatKSTFullDateTime(timestamp) {
  const ms = toTimestampMillis(timestamp);
  if (!ms) return '';
  return KST_FULL_FORMATTER.format(new Date(ms));
}

/**
 * Format timestamp into relative date or short format
 */
export function formatKSTShortDate(timestamp) {
  const ms = toTimestampMillis(timestamp);
  if (!ms) return '';
  return KST_DATE_FORMATTER.format(new Date(ms));
}

/**
 * Verify if the given ISO or Date falls on the specified readDateKst in Asia/Seoul
 */
export function verifyDateMatchesKST(dateOrMs, expectedDateKst) {
  const ms = toTimestampMillis(dateOrMs);
  if (!ms || !expectedDateKst) return false;
  const actualDateKst = getKSTDateString(new Date(ms));
  return actualDateKst === expectedDateKst;
}
