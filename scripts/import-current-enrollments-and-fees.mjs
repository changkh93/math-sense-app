import admin from 'firebase-admin';
import { readFileSync, writeFileSync } from 'node:fs';

const APPLY = process.argv.includes('--apply');
const EFFECTIVE_MONTH = '2026-07';
const ACTIVE_FROM = '2026-07-01';
const IMPORT_SOURCE = 'operator_import_current_students_2026-07-12';

const serviceAccount = JSON.parse(readFileSync(new URL('../service-account.json', import.meta.url), 'utf8'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

const digits = (value) => String(value || '').replace(/[^0-9]/g, '');

// UIDs were resolved against the live users/parents collections on 2026-07-12.
// We intentionally use explicit UIDs instead of fuzzy name matching for writes.
const activeStudents = [
  ['강연서', 'S8EsKzRat5SW0ojuZAwxGMIfMX52', '01047582464'],
  ['성하린', 'ndSBu6Oi5sSSIzWDppDmwFiJs4x2', '01045618940'],
  ['심민솔', 'MezUmIiYsUOGlIM3YUnqsKXv4dD2', '01045421788'],
  ['김하원', 'OHujkkyBIUQa3WUM8vBeqqQsxPD3', '01082207919'],
  ['장우린', 'gBkTtil7ylb4sXB3gCOh9UVgAfJ3', '01094586257'],
  ['전지후', '11JYuYnFJ6NxL1yZpGB1XVV5bNY2', '01047896055'],
  ['전지환', '46PIHjjF7WXpX2ZaBRotXcc1bd73', '01047896055'],
  ['서세정', 'GfrN8Ju1ZRRgHu3rNntCHLyDqHI2', '01047896055'],
  ['최한겸', 'thwx4wxhXiZmpfNf5MEYlft5hUM2', '01091419699'],
  ['박서연', 'f72mUv1Ov8frJPliTBTHFJdzaQH3', '01075250664'],
  ['정시원', 'cPW3EkkiW5Me2pLQDgAbixuRDLa2', '01091589132'],
  ['김태언', 'epLElAqtwxO6whd4CNOpcvn4Qea2', '01063407878'],
  ['욘유민', 'W9HwPdo0CvcJCfGFMP1PIeqyxyN2', '01089668543'],
  ['욘태민', 'QcTWXBe0lDct3Wz5sElZpq82s083', '01089668543'],
  ['강다온', '0trQLSNczRaNRofWosYyuv2XWlh2', '01026851291'],
  ['이현서', 'TOVOn6cR5VOl9AyqEYjPMwXZacQ2', '01029846061'],
  ['이채희', 'GctTdmArsZMKmO2cq6nutiWa8VL2', '01053832546'],
  ['김서연', 'uhwy3Ctx2hQEFNRohkQV6kWbrP63', '01041369050'],
  ['박지유', '6HJ28QzBZFW71Tl4aQUSLhbMDhD3', '01057891009'],
  ['박온유', '73ZTCurXemMIStDzTNqAxqht32K3', '01057891009'],
  ['최다인', 'scfYyEQuiYYut2ZFBePRDEJvLZa2', '01031700336'],
  ['신용휘', 'ZdpaRQe0QwTsYmOD7f2Uq8JAFQE3', '01043669131'],
  ['박도현', 'jNwxIPj0EqScSf0QPW5lHYIYhIF2', '01086136875'],
  ['고해나', '5KvflfpXhQPVPV5TXuEE1P33x1J3', '01087077416'],
  ['이준홍', 'MoRe5TNbmpNq2gs0bH191LbQOif1', '01085009725'],
  ['이소민', 'PKodQaH5PRYPv9czq7r6YfSaeJf2', '01081083673'],
  ['이지민', 'CceXHkbjEHckTxYdhdN7QCSo5Cz1', '01081083673'],
  ['박혜원', 'M716b0C9ylRttRVUkbElNfETmhH2', '01097360316'],
  ['정시욘', 'nspjzUAjefSoDeaN1TuaNywSFyS2', '01062190842'],
  ['장준혁', 'WLGiStMtb9OSpLFDTWYx9xuwUmW2', '01051103908'],
  ['마채호', 'kqz8MFJRBoQ8FRdxQL3HKdKk1WD2', '01043775881'],
  ['마채욘', 'l4cpkQXLYMNeYD1bYZodtoEXEQJ2', '01043775881'],
  ['배수현', 'rrUYQjlWRyVHEKpkg6KiREDZdBm1', '01084438335'],
  ['박진현', 'fkZkfTREhRYemq0cCg3oB9iVDgH3', '01093020021'],
  ['박주한', 'RYQGcoAkyzfpCFysDz7RkTxOm9I3', '01097099258'],
  ['이하은', 'O6fM30YwxrQZujrpPi4yYMSsIaf1', '01089019961'],
  ['박세연', '3hBBk6xZMGg93YmqNnRkQTRg3xz2', '01025617935'],
  ['이은유', 'qQlPUj1vLge8KyGK7UmHmg6pMpE3', '01045631515'],
  ['이은솔', 'rocxrmg2XadtFByFJDVT8hOVzKa2', '01045631515'],
  ['손현승', 'wHseXnYrbeWrhI0mCKuBzuqDDmh2', '01035982827'],
  ['정승규', '1cjpzR98rnOupjRfs3enQpBe6pv2', '01064331579'],
  ['오시완', 'DmMfrlgRsvY3EMJ38ecqN6OV3rt1', '01047401204'],
  ['구도현', '7Wso8gek7nd8NX9nqiwZuAM0MJl2', '01092099317'],
  ['인효린', 'QCuEZwfkPXVoWJYO3kXa1hdajRN2', '01029412636'],
  ['박기준', 'V2U49tdst3ZtDU72R6eMQLVlA5B3', '01028589784'],
  ['박현승', 'jPEI1kAWRYQuxSbnHtWifKMX3K22', '01028589784'],
  ['노우재', 'zQ8Mk2nrDXZMZ9EZwPDuw9X5Sqf2', '01028186665'],
  ['임수아', 'nTyVHRXMKrWzmZ2NHKeVCzcRr1n1', '01088641031'],
  ['한지유', 'jRQyV3T8dzRwh7Na2khcTdfVzm22', '01049004114'],
  ['김리아', '5TslwLo2OZNE5uRB8aGovKiY3Ia2', '01096149088'],
  ['김규민', 'G9gMC83zEiPwtxqUvLQqT3uCr773', '01056545023'],
  ['이예온', '2HOZDcib1ZdulkZM539vpk3O72v1', '01047151424'],
  ['이성온', 'BxEDjElV6bOWnrPavEOQYBfiu7D3', '01025433323'],
  ['황서하', 'wOGEB1xh41PJ22TiejIwjeo1ExM2', '01027418215'],
  ['박시영', 'UPhqdzlUMWRehpCfmlNVP1XPjHJ3', '01046904095'],
  ['김다주', '9LvX6zFAGtbPZMI3saJp4rY9GZq1', '01022932481'],
  ['하다솜', 'PuYUfDemRZOLM65jMSy7XoVaN0G2', '01050318733'],
  ['박주희', 'AGYQ5FncLZVy1oAQIKmAer8t9oB3', '01054707593'],
];

const familyFees = [
  ['강연서', '01047582464', 120000], ['박서연', '01075250664', 120000],
  ['구도현', '01092099317', 120000], ['정시원', '01091589132', 145000],
  ['이은유, 이은솔', '01045631515', 192000], ['김태언, 박세련', '01063407878', 150000],
  ['한지유', '01049004114', 150000], ['이현서', '01029846061', 200000],
  ['인효린', '01029412636', 200000], ['김서연', '01041369050', 72000],
  ['박기준, 박현승', '01028589784', 200000], ['최다인', '01031700336', 200000],
  ['박혜원', '01097360316', 200000], ['박온유, 박지유', '01057891009', 240000],
  ['최한겸', '01091419699', 72000], ['이유건', '01073861016', 72000],
  ['박진현', '01093020021', 72000], ['박주한', '01097099258', 72000],
  ['이하은', '01089019961', 72000], ['이예온', '01047151424', 72000],
  ['이준홍', '01085009725', 72000], ['박주희', '01054707593', 72000],
  ['정승규', '01064331579', 90000], ['강다온', '01026851291', 90000],
  ['장우린', '01094586257', 90000], ['박세연', '01025617935', 115000],
  ['이성온', '01025433323', 120000], ['이채희', '01053832546', 120000],
  ['신용휘', '01043669131', 120000], ['박도현', '01086136875', 120000],
  ['고해나', '01087077416', 120000], ['김리아', '01096149088', 120000],
  ['정시욘', '01062190842', 120000], ['박시영', '01046904095', 120000],
  ['황서하', '01027418215', 120000], ['장준혁', '01051103908', 120000],
  ['전지후, 전지환, 서세정', '01047896055', 175000], ['오시완', '01047401204', 150000],
  ['임수아', '01088641031', 150000], ['노우재', '01028186665', 150000],
  ['하다솜', '01050318733', 150000], ['김다주', '01022932481', 150000],
  ['이지민, 이소민', '01081083673', 192000], ['마채호, 마채욘', '01043775881', 240000],
  ['나지운', '01026654056', 25000], ['김하원', '01082207919', 150000],
  ['성하린', '01045618940', 150000], ['심민솔', '01045421788', 150000],
  ['욘태민, 욘유민', '01089668543', 150000], ['손현승', '01035982827', 150000],
];

// The supplied 010-4377-5881 number has no parent account, but both listed
// students are already linked to this existing parent account.
const billingParentFallbacks = new Map([
  ['01043775881', 'IgyfdsPHLnPRfKgqZPH1wuTTEhp2'],
]);

const [usersSnap, parentsSnap, enrollmentSnap, billingSnap] = await Promise.all([
  db.collection('users').get(), db.collection('parents').get(),
  db.collection('studentEnrollments').get(), db.collection('familyBillingAccounts').get(),
]);
const users = new Map(usersSnap.docs.map((doc) => [doc.id, { uid: doc.id, ...doc.data() }]));
const parents = parentsSnap.docs.map((doc) => ({ uid: doc.id, ...doc.data() })).filter((row) => row.isDeleted !== true);
const parentsByPhone = new Map(parents.map((row) => [digits(row.phone), row]));
const parentByChildUid = new Map();
parents.forEach((parent) => (parent.childrenUids || []).forEach((uid) => parentByChildUid.set(uid, parent)));
const existingEnrollments = new Map(enrollmentSnap.docs.map((doc) => [doc.id, doc.data()]));
const existingBilling = new Map(billingSnap.docs.map((doc) => [doc.id, doc.data()]));

const report = {
  mode: APPLY ? 'apply' : 'dry-run', effectiveMonth: EFFECTIVE_MONTH,
  enrollmentWrites: [], parentLinkWrites: [], billingWrites: [],
  unresolvedStudents: [{ studentName: '나지운', suppliedPhone: '01026654056', reason: '활성 학생 가구와 학부모 가구 모두 미확인' }],
  unresolvedFees: [], conflicts: [], notes: [],
};

for (const [studentName, uid, suppliedPhone] of activeStudents) {
  const user = users.get(uid);
  if (!user || user.isDeleted === true || user.accountStatus === 'deleted') {
    report.unresolvedStudents.push({ studentName, uid, suppliedPhone, reason: '활성 학생 가구 없음' });
    continue;
  }
  const suppliedParent = parentsByPhone.get(digits(suppliedPhone));
  const linkedParent = parentByChildUid.get(uid) || (user.parentUid ? parents.find((row) => row.uid === user.parentUid) : null);
  if (suppliedParent && linkedParent && suppliedParent.uid !== linkedParent.uid) {
    report.conflicts.push({ type: 'student_parent_mismatch', studentName, uid, suppliedPhone, suppliedParentUid: suppliedParent.uid, linkedParentUid: linkedParent.uid });
    continue;
  }
  const parent = suppliedParent || linkedParent;
  if (!parent) {
    report.unresolvedStudents.push({ studentName, uid, suppliedPhone, reason: '학부모 가구 미연결' });
    continue;
  }
  const existing = existingEnrollments.get(uid);
  if (existing && (existing.status !== 'active_paid' || existing.parentUid !== parent.uid) && existing.importSource !== IMPORT_SOURCE) {
    report.conflicts.push({ type: 'existing_enrollment', studentName, uid, existing, proposedParentUid: parent.uid });
    continue;
  }
  const payload = {
    studentUid: uid, parentUid: parent.uid, studentName,
    status: 'active_paid', activeFrom: ACTIVE_FROM, activeThrough: null,
    importSource: IMPORT_SOURCE, importReason: '운영자 제공 현재 수강 명단 반영',
    updatedBy: 'bulk_import_current_students_2026-07-12', updatedAt: serverTimestamp(),
  };
  const alreadyLinked = Array.isArray(parent.childrenUids) && parent.childrenUids.includes(uid);
  report.enrollmentWrites.push({ studentName, uid, suppliedPhone: digits(suppliedPhone), parentUid: parent.uid, parentPhone: digits(parent.phone), alreadyLinked, profileName: user.studentName || user.name || user.publicDisplayName || '' });
  if (!alreadyLinked) report.parentLinkWrites.push({ studentName, uid, parentUid: parent.uid, parentPhone: digits(parent.phone) });
  if (APPLY) {
    await db.collection('studentEnrollments').doc(uid).set(payload, { merge: true });
    if (!alreadyLinked) {
      await db.collection('parents').doc(parent.uid).set({
        childrenUids: admin.firestore.FieldValue.arrayUnion(uid),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
  }
}

for (const [familyLabel, suppliedPhone, fee] of familyFees) {
  const phone = digits(suppliedPhone);
  let parent = parentsByPhone.get(phone);
  if (!parent && billingParentFallbacks.has(phone)) parent = parents.find((row) => row.uid === billingParentFallbacks.get(phone));
  if (!parent) {
    report.unresolvedFees.push({ familyLabel, suppliedPhone: phone, fee, reason: '학부모 가구 미연결' });
    continue;
  }
  const existing = existingBilling.get(parent.uid);
  const currentScheduledFee = existing?.feeSchedule?.[EFFECTIVE_MONTH];
  if (currentScheduledFee != null && Number(currentScheduledFee) !== fee && existing.importSource !== IMPORT_SOURCE) {
    report.conflicts.push({ type: 'existing_billing', familyLabel, parentUid: parent.uid, currentScheduledFee, proposedFee: fee });
    continue;
  }
  const feeSchedule = { ...(existing?.feeSchedule || {}), [EFFECTIVE_MONTH]: fee };
  const payload = {
    parentUid: parent.uid, baseMonthlyFee: fee, feeSchedule,
    importSource: IMPORT_SOURCE, importReason: '운영자 제공 가족 기본 수강료 반영',
    updatedBy: 'bulk_import_current_students_2026-07-12', updatedAt: serverTimestamp(),
  };
  report.billingWrites.push({ familyLabel, suppliedPhone: phone, fee, parentUid: parent.uid, accountPhone: digits(parent.phone), usedFallback: phone !== digits(parent.phone) });
  if (APPLY) await db.collection('familyBillingAccounts').doc(parent.uid).set(payload, { merge: true });
}

report.notes.push('배수현·김규민 가구는 현재 명단에느 있지만 수강료 명단에느 없어 가족 수강료는 미입력입니다.');
report.notes.push('마채호·마채욘 가구는 제공된 전화번호와 현재 연결된 학부모 가구의 전화번호가 다르지만, 자녀 연결을 우선하여 기존 학부모 가구에 수강료를 귀속합니다.');

if (APPLY) {
  await db.collection('adminAuditLogs').doc('bulk_current_enrollment_fee_2026-07-12').set({
    action: 'bulk_import_current_enrollments_and_family_fees',
    targetType: 'billingMigration',
    targetId: 'current_students_2026-07-12',
    adminUid: 'server_script',
    reason: '운영자 제공 현재 수강 명단·가족 수강료 반영',
    before: { studentEnrollments: 0, familyBillingAccounts: 0 },
    after: {
      activePaidStudents: 58,
      familyBillingAccounts: 48,
      childrenLinked: 4,
      totalBaseMonthlyFee: 6505000,
      unresolvedStudents: ['나지운'],
      unresolvedFamilyFees: ['이유건', '나지운'],
    },
    createdAt: serverTimestamp(),
  }, { merge: true });
}

const outputPath = APPLY
  ? '/private/tmp/current_enrollment_fee_import_applied.json'
  : '/private/tmp/current_enrollment_fee_import_dry_run.json';
writeFileSync(outputPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  mode: report.mode, outputPath,
  enrollmentWrites: report.enrollmentWrites.length,
  parentLinkWrites: report.parentLinkWrites.length,
  billingWrites: report.billingWrites.length,
  unresolvedStudents: report.unresolvedStudents.length,
  unresolvedFees: report.unresolvedFees.length,
  conflicts: report.conflicts.length,
}));
await db.terminate();
