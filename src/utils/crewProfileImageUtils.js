export const CREW_PROFILE_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
export const CREW_PROFILE_IMAGE_MAX_SOURCE_BYTES = 5 * 1024 * 1024;
export const CREW_PROFILE_IMAGE_MAX_STORED_BYTES = 2 * 1024 * 1024;

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function validateCrewProfileImageFile(file) {
  if (!file) return '선택한 이미지를 확인할 수 없습니다.';
  if (!ALLOWED_TYPES.has(file.type)) return 'JPG, PNG, WebP 형식만 등록할 수 있습니다.';
  if (!Number.isFinite(file.size) || file.size <= 0) return '비어 있는 이미지는 등록할 수 없습니다.';
  if (file.size > CREW_PROFILE_IMAGE_MAX_SOURCE_BYTES) return '원본 이미지는 5MB 이하만 등록할 수 있습니다.';
  return '';
}

export function buildCrewProfileImageStoragePath(crewId, timestamp = Date.now()) {
  const safeCrewId = String(crewId || '').trim();
  if (!safeCrewId || safeCrewId.includes('/')) throw new Error('크루 정보를 확인할 수 없습니다.');
  const safeTimestamp = Math.max(0, Math.trunc(Number(timestamp) || 0));
  return `crew-profile-images/${safeCrewId}/profile-${safeTimestamp}.jpg`;
}

export function isOwnedCrewProfileImagePath(path, crewId) {
  const value = String(path || '').trim();
  const safeCrewId = String(crewId || '').trim();
  return Boolean(value && safeCrewId && !safeCrewId.includes('/') && value.startsWith(`crew-profile-images/${safeCrewId}/`));
}
