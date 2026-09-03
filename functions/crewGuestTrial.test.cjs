const test = require('node:test');
const assert = require('node:assert/strict');
const { FieldValue } = require('firebase-admin/firestore');
const memoryFirestore = require('./testHelpers/firestoreMemory.cjs');
const factory = require('./crewGuestTrial.cjs');
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
const context = { auth: { uid: 'g1', token: { firebase: { sign_in_provider: 'anonymous' } } } };
const form = { studentName: '테스트 학생', grade: '초3', parentPhone: '010-1234-5678' };
function fixture() {
  const db = memoryFirestore({
    'crewGuestAccounts/g1': { crewId: 'a', status: 'active', referralInviteId: 'invite1' },
    'referralInvites/invite1': { crewId: 'a', source: 'crew_guest_invite', active: true,
      referrerStudentUid: 's1', referrerParentUid: 'p1', inviterName: '숨겨야 할 이름' },
  });
  return { db, api: factory({ db, HttpsError, FieldValue }) };
}
test('offer contains only benefit, never referrer identity', async () => {
  const { api } = fixture();
  assert.deepEqual(await api.preview({}, context), { referralVerified: true, trialDays: 28, alreadyApplied: false });
});
test('submission is idempotent and ignores client forged referral information', async () => {
  const { db, api } = fixture();
  await Promise.all([api.submit({ ...form, referrerStudentUid: 'attacker', referralToken: 'forged' }, context), api.submit(form, context)]);
  const app = db.data.get('applications/crew_guest_g1');
  assert.equal(app.referrerStudentUid, 's1');
  assert.equal(app.referrerParentUid, 'p1');
  assert.equal(app.trialDays, 28);
  assert.equal(app.applicantRole, 'student');
  assert.equal(db.data.get('referrals/application_crew_guest_g1').referrerStudentUid, 's1');
  assert.equal([...db.data.keys()].filter((k) => k.startsWith('applications/')).length, 1);
});
test('invalid or unrelated invite cannot grant four weeks', async () => {
  const { db, api } = fixture();
  db.data.get('referralInvites/invite1').crewId = 'other';
  assert.equal((await api.preview({}, context)).trialDays, 7);
  await api.submit(form, context);
  assert.equal(db.data.get('applications/crew_guest_g1').oneMonthReferralTrial, false);
});
test('authentication and phone validation enforced on server', async () => {
  const { api } = fixture();
  await assert.rejects(api.submit(form, {}), { code: 'unauthenticated' });
  await assert.rejects(api.submit({ ...form, parentPhone: '123' }, context), { code: 'invalid-argument' });
});
test('students can apply without prior guardian consent; callback stays pending', async () => {
  const { db, api } = fixture();
  await api.submit({ ...form, guardianConfirmed: true, phoneVerificationStatus: 'confirmed' }, context);
  const app = db.data.get('applications/crew_guest_g1');
  assert.equal(app.phoneVerificationStatus, 'pending');
  assert.equal(app.guardianConfirmed, undefined);
  assert.equal(app.consentAt, undefined);
  assert.equal(app.consentVersion, undefined);
});
