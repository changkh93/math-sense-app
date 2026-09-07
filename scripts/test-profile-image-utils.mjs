import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PROFILE_IMAGE_MAX_SOURCE_BYTES,
  buildProfileImageStoragePath,
  getSafeProfileImageUrl,
  isOwnedProfileImagePath,
  resolveProfileImageUrl,
  validateProfileImageFile,
} from '../src/utils/profileImageUtils.js';
import { buildAnswerProfileSnapshot, getPublicProfile } from '../src/utils/socialUtils.js';

assert.equal(validateProfileImageFile({ type: 'image/jpeg', size: 2048 }), '');
assert.equal(validateProfileImageFile({ type: 'image/png', size: PROFILE_IMAGE_MAX_SOURCE_BYTES }), '');
assert.match(validateProfileImageFile({ type: 'image/gif', size: 2048 }), /JPG/);
assert.match(validateProfileImageFile({ type: 'image/webp', size: PROFILE_IMAGE_MAX_SOURCE_BYTES + 1 }), /5MB/);
assert.match(validateProfileImageFile({ type: 'image/webp', size: 0 }), /비어/);

assert.equal(getSafeProfileImageUrl('javascript:alert(1)', 'https://cdn.example/avatar.jpg'), 'https://cdn.example/avatar.jpg');
assert.equal(getSafeProfileImageUrl('blob:local-preview'), 'blob:local-preview');
assert.equal(getSafeProfileImageUrl('data:text/html;base64,PHNjcmlwdD4='), '');
assert.equal(resolveProfileImageUrl({ profileImageUrl: 'https://cdn.example/custom.jpg', photoURL: 'https://cdn.example/google.jpg' }), 'https://cdn.example/custom.jpg');
assert.equal(resolveProfileImageUrl({}, 'https://cdn.example/fallback.jpg'), 'https://cdn.example/fallback.jpg');

assert.equal(buildProfileImageStoragePath('user_123', 456.9), 'profile-images/user_123/avatar-456.jpg');
assert.equal(isOwnedProfileImagePath('profile-images/user_123/avatar-456.jpg', 'user_123'), true);
assert.equal(isOwnedProfileImagePath('profile-images/other/avatar-456.jpg', 'user_123'), false);
assert.throws(() => buildProfileImageStoragePath('../', 1));

const publicProfile = getPublicProfile({
  publicDisplayName: '별빛 탐험가',
  profileImageUrl: 'https://cdn.example/profile.jpg',
});
assert.equal(publicProfile.profileImageUrl, 'https://cdn.example/profile.jpg');
assert.equal(buildAnswerProfileSnapshot(publicProfile).profileImageUrl, 'https://cdn.example/profile.jpg');

const storageRules = readFileSync(new URL('../storage.rules', import.meta.url), 'utf8');
assert.match(storageRules, /match \/profile-images\/\{userId\}\/\{fileName\}/);
assert.match(storageRules, /request\.auth\.uid == userId/);
assert.match(storageRules, /request\.resource\.size <= 2 \* 1024 \* 1024/);
assert.match(storageRules, /request\.resource\.contentType\.matches\('image\/\(jpeg\|png\|webp\)'\)/);

console.log('Profile image utility tests passed.');
