export const PROFILE_IMAGE_MAX_SOURCE_BYTES = 5 * 1024 * 1024;
export const PROFILE_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
export const PROFILE_IMAGE_ALLOWED_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export function validateProfileImageFile(file) {
  if (!file) return '선택한 사진을 확인할 수 없습니다.';
  if (!PROFILE_IMAGE_ALLOWED_TYPES.includes(file.type)) {
    return 'JPG, PNG, WebP 형식의 사진만 등록할 수 있습니다.';
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return '비어 있는 사진 파일은 등록할 수 없습니다.';
  }
  if (file.size > PROFILE_IMAGE_MAX_SOURCE_BYTES) {
    return '프로필 사진은 5MB 이하만 등록할 수 있습니다.';
  }
  return '';
}

export function getSafeProfileImageUrl(...candidates) {
  for (const candidate of candidates.flat()) {
    const value = typeof candidate === 'string' ? candidate.trim() : '';
    if (/^https?:\/\//i.test(value) || /^data:image\/(?:jpeg|png|webp);base64,/i.test(value) || /^blob:/i.test(value)) {
      return value;
    }
  }
  return '';
}

export function resolveProfileImageUrl(profileData = {}, fallbackPhotoUrl = '') {
  const safeProfile = profileData && typeof profileData === 'object' ? profileData : {};
  return getSafeProfileImageUrl(
    safeProfile.profileImageUrl,
    safeProfile.avatarUrl,
    safeProfile.photoURL,
    fallbackPhotoUrl,
  );
}

export function buildProfileImageStoragePath(uid, timestamp = Date.now()) {
  const safeUid = String(uid || '').trim();
  if (!safeUid || safeUid.includes('/')) throw new Error('프로필 사진 소유자를 확인할 수 없습니다.');
  const safeTimestamp = Math.max(0, Math.trunc(Number(timestamp) || 0));
  return `profile-images/${safeUid}/avatar-${safeTimestamp}.jpg`;
}

export function isOwnedProfileImagePath(path, uid) {
  const value = typeof path === 'string' ? path.trim() : '';
  const safeUid = String(uid || '').trim();
  if (safeUid.includes('/')) return false;
  return Boolean(value && safeUid && value.startsWith(`profile-images/${safeUid}/`));
}
