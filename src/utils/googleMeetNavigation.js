const APPLE_MOBILE_PATTERN = /iPad|iPhone|iPod/i;

export function isAppleTouchDevice(navigatorLike = globalThis.navigator) {
  if (!navigatorLike) return false;
  const userAgent = String(navigatorLike.userAgent || '');
  const platform = String(navigatorLike.platform || '');
  const touchPoints = Number(navigatorLike.maxTouchPoints || 0);
  return APPLE_MOBILE_PATTERN.test(userAgent)
    || (/Mac/i.test(platform) && touchPoints > 1);
}

export function getGoogleMeetCode(rawUrl = '') {
  try {
    const url = new URL(String(rawUrl));
    if (url.protocol !== 'https:' || url.hostname !== 'meet.google.com') return '';
    return url.pathname.split('/').filter(Boolean)[0] || '';
  } catch {
    return '';
  }
}

export function openGoogleMeet(rawUrl, {
  navigatorLike = globalThis.navigator,
  windowLike = globalThis.window,
} = {}) {
  let url;
  try {
    const parsed = new URL(String(rawUrl || '').trim());
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'meet.google.com') throw new Error();
    url = parsed.toString();
  } catch {
    throw new Error('올바른 Google Meet 주소가 아닙니다.');
  }
  if (!windowLike) throw new Error('Google Meet을 열 수 없는 환경입니다.');

  if (isAppleTouchDevice(navigatorLike)) {
    windowLike.location.assign(url);
    return 'same-tab';
  }

  const meetWindow = windowLike.open(url, '_blank');
  if (meetWindow) {
    try {
      meetWindow.opener = null;
    } catch {
      // The new window may already have crossed origins; navigation still succeeded.
    }
    return 'new-tab';
  }

  // Popup-blocking browsers still get a reliable route to the meeting.
  windowLike.location.assign(url);
  return 'same-tab-fallback';
}

export async function copyMeetText(text, {
  navigatorLike = globalThis.navigator,
  documentLike = globalThis.document,
} = {}) {
  const value = String(text || '').trim();
  if (!value) return false;

  try {
    if (navigatorLike?.clipboard?.writeText) {
      await navigatorLike.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to the legacy selection-based copy path used by some iPads.
  }

  if (!documentLike?.body || typeof documentLike.execCommand !== 'function') return false;
  const textarea = documentLike.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  documentLike.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, value.length);
  let copied = false;
  try {
    copied = documentLike.execCommand('copy');
  } finally {
    documentLike.body.removeChild(textarea);
  }
  return copied;
}
