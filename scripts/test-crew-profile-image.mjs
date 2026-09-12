import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  buildCrewProfileImageStoragePath,
  isOwnedCrewProfileImagePath,
  validateCrewProfileImageFile,
} from '../src/utils/crewProfileImageUtils.js';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('crew image file validation and storage ownership are bounded', () => {
  assert.equal(validateCrewProfileImageFile({ type: 'image/png', size: 2048 }), '');
  assert.match(validateCrewProfileImageFile({ type: 'image/gif', size: 2048 }), /JPG/);
  assert.match(validateCrewProfileImageFile({ type: 'image/jpeg', size: 6 * 1024 * 1024 }), /5MB/);
  assert.equal(buildCrewProfileImageStoragePath('crew-1', 123), 'crew-profile-images/crew-1/profile-123.jpg');
  assert.equal(isOwnedCrewProfileImagePath('crew-profile-images/crew-1/profile-123.jpg', 'crew-1'), true);
  assert.equal(isOwnedCrewProfileImagePath('crew-profile-images/crew-2/profile-123.jpg', 'crew-1'), false);
  assert.throws(() => buildCrewProfileImageStoragePath('bad/id'));
});

test('server and storage contracts allow only the crew leader or site admin', async () => {
  const [functionsSource, storageRules] = await Promise.all([
    read('functions/index.js'),
    read('storage.rules'),
  ]);
  assert.match(functionsSource, /profileImageUrl: crewData\.profileImageUrl \|\| ''/);
  assert.match(functionsSource, /crew-profile-images\/\$\{crewId\}\//);
  assert.match(functionsSource, /profileImageUpdatedBy: adminUid/);
  assert.match(storageRules, /match \/crew-profile-images\/\{crewId\}\/\{fileName\}/);
  assert.match(storageRules, /function canManageCrewImage\(crewId\)/);
  assert.match(storageRules, /documents\/crews\/\$\(crewId\)\)\.data\.leaderId == request\.auth\.uid/);
  assert.match(storageRules, /allow create, update: if canManageCrewImage\(crewId\)/);
});

test('directory crossfade and stable detail identity are both wired', async () => {
  const [directory, directoryCss, detail, settings, admin] = await Promise.all([
    read('src/components/Space/StudyCrewView.jsx'),
    read('src/components/Space/StudyCrewDirectory.css'),
    read('src/components/Space/CrewDetailView.jsx'),
    read('src/components/Space/CrewSettingsModal.jsx'),
    read('src/pages/Admin/CrewApproval.jsx'),
  ]);
  assert.match(directory, /crew-directory-hangar__profile/);
  assert.match(directoryCss, /crew-profile-dissolve 12s ease-in-out infinite/);
  assert.match(directoryCss, /prefers-reduced-motion: reduce/);
  assert.match(detail, /crew-identity-patch/);
  assert.match(settings, /CrewLeaderProfileImageEditor/);
  assert.match(settings, /httpsCallable\(functions, 'updateStudyCrew'\)/);
  assert.match(settings, /크루 창설자가 등록·교체·삭제합니다/);
  assert.match(admin, /adminUpdateStudyCrewDetails/);
  assert.match(admin, /deleteObject/);
});
