import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const ELEMENTARY_MATH_CLUSTER_ID = 'cluster_elementary';
const MIDDLE_MATH_CLUSTER_ID = 'middle-math';

const STUDENT_GRADE_OPTIONS = [
  { value: 'elementary2', label: '초등학교 2학년', shortLabel: '초2', clusterId: ELEMENTARY_MATH_CLUSTER_ID, order: 2 },
  { value: 'elementary3', label: '초등학교 3학년', shortLabel: '초3', clusterId: ELEMENTARY_MATH_CLUSTER_ID, order: 3 },
  { value: 'elementary4', label: '초등학교 4학년', shortLabel: '초4', clusterId: ELEMENTARY_MATH_CLUSTER_ID, order: 4 },
  { value: 'elementary5', label: '초등학교 5학년', shortLabel: '초5', clusterId: ELEMENTARY_MATH_CLUSTER_ID, order: 5 },
  { value: 'elementary6', label: '초등학교 6학년', shortLabel: '초6', clusterId: ELEMENTARY_MATH_CLUSTER_ID, order: 6 },
  { value: 'middle1', label: '중학교 1학년', shortLabel: '중1', clusterId: MIDDLE_MATH_CLUSTER_ID, order: 7 },
  { value: 'middle2', label: '중학교 2학년', shortLabel: '중2', clusterId: MIDDLE_MATH_CLUSTER_ID, order: 8 },
  { value: 'middle3', label: '중학교 3학년', shortLabel: '중3', clusterId: MIDDLE_MATH_CLUSTER_ID, order: 9 },
];

function parseMonthlyEvaluationUnit(unit = {}, chapter = {}, region = {}) {
  const chapTitle = (chapter?.title || '').trim();
  const unitTitle = (unit?.title || '').trim();
  const regTitle = (region?.title || '').trim();
  const clusterId = region?.clusterId || '';
  const regionId = chapter?.regionId || region?.id || '';

  const isElementaryMonthly =
    regionId === 'reg_1774390167801' ||
    regTitle.includes('초등수학 월간평가') ||
    (clusterId === 'cluster_elementary' && (regTitle.includes('월간평가') || chapTitle.includes('월간평가')));

  const isMiddleMonthly =
    (regionId === 'reg_1774698354292' && chapTitle.includes('월간평가')) ||
    (clusterId === 'middle-math' && (chapTitle.includes('월간평가') || unitTitle.includes('월평가') || unitTitle.includes('월 평가')));

  if (!isElementaryMonthly && !isMiddleMonthly) return null;

  let grade = null;
  let month = null;
  let year = unit.year || 2026;

  if (isElementaryMonthly) {
    if (chapTitle.includes('2학년') || chapTitle.includes('초2')) grade = 'elementary2';
    else if (chapTitle.includes('3학년') || chapTitle.includes('초3')) grade = 'elementary3';
    else if (chapTitle.includes('4학년') || chapTitle.includes('초4')) grade = 'elementary4';
    else if (chapTitle.includes('5학년') || chapTitle.includes('초5')) grade = 'elementary5';
    else if (chapTitle.includes('6학년') || chapTitle.includes('초6')) grade = 'elementary6';

    const monthMatch = unitTitle.match(/(\d{1,2})\s*월/);
    if (monthMatch) month = parseInt(monthMatch[1], 10);
    const yearMatch = unitTitle.match(/(20\d{2})\s*년/);
    if (yearMatch) year = parseInt(yearMatch[1], 10);
  } else if (isMiddleMonthly) {
    if (unitTitle.includes('중1') || unitTitle.includes('1학년')) grade = 'middle1';
    else if (unitTitle.includes('중2') || unitTitle.includes('2학년')) grade = 'middle2';
    else if (unitTitle.includes('중3') || unitTitle.includes('3학년')) grade = 'middle3';

    const monthMatch = unitTitle.match(/(\d{1,2})\s*월/);
    if (monthMatch) month = parseInt(monthMatch[1], 10);
    const yearMatch = unitTitle.match(/(20\d{2})\s*년/);
    if (yearMatch) year = parseInt(yearMatch[1], 10);
  }

  if (grade && month) {
    return {
      unitId: unit.docId || unit.id,
      unitTitle,
      year: Number(year),
      month: Number(month),
      grade,
      courseClusterId: isElementaryMonthly ? ELEMENTARY_MATH_CLUSTER_ID : MIDDLE_MATH_CLUSTER_ID,
    };
  }
  return null;
}

function buildDiscoveredMonthlyUnitConfig(units = [], chaptersMap = {}, regionsMap = {}) {
  const result = {};
  units.forEach(unit => {
    const chap = chaptersMap[unit.chapterId] || {};
    const reg = regionsMap[chap.regionId] || {};
    const parsed = parseMonthlyEvaluationUnit(unit, chap, reg);
    if (parsed) {
      const key = `${parsed.year}-${parsed.month}`;
      if (!result[key]) result[key] = {};
      result[key][parsed.grade] = parsed.unitId;
    }
  });
  return result;
}

async function main() {
  console.log('--- Fetching Firestore content collections ---');
  const [regionsSnap, chaptersSnap, unitsSnap] = await Promise.all([
    db.collection('regions').get(),
    db.collection('chapters').get(),
    db.collection('units').get(),
  ]);

  const chaptersMap = {};
  chaptersSnap.forEach(d => chaptersMap[d.id] = { id: d.id, ...d.data() });
  const regionsMap = {};
  regionsSnap.forEach(d => regionsMap[d.id] = { id: d.id, ...d.data() });
  const units = unitsSnap.docs.map(d => ({ id: d.id, docId: d.id, ...d.data() }));

  const dynamicConfig = buildDiscoveredMonthlyUnitConfig(units, chaptersMap, regionsMap);
  console.log('Dynamic Config keys:', Object.keys(dynamicConfig));
  console.log('2026-8 Config:', dynamicConfig['2026-8']);

  const year = 2026;
  const month = 8;
  const unitIds = Object.values(dynamicConfig[`${year}-${month}`] || {});
  console.log('Unit IDs for 2026-8:', unitIds);

  const historySnap = await db.collectionGroup('history').where('unitId', 'in', unitIds).get();
  console.log(`Found ${historySnap.size} history records for 2026-8`);

  const historyByStudentUnit = {};
  historySnap.docs.forEach(docSnap => {
    const data = docSnap.data();
    const studentId = docSnap.ref.parent.parent?.id;
    if (!studentId || !data?.unitId) return;
    const key = `${studentId}_${data.unitId}`;
    if (!historyByStudentUnit[key]) historyByStudentUnit[key] = [];
    historyByStudentUnit[key].push({ id: docSnap.id, studentId, ...data });
  });

  const usersSnap = await db.collection('users').get();
  const usersMap = {};
  usersSnap.forEach(d => usersMap[d.id] = { id: d.id, ...d.data() });

  console.log('\n--- 2026년 8월 월간평가 응시자 집계 결과 ---');
  let count100 = 0;
  for (const [key, records] of Object.entries(historyByStudentUnit)) {
    const [studentId, unitId] = key.split('_');
    const user = usersMap[studentId] || {};
    const bestScore = Math.max(...records.map(r => Number(r.score) || 0));
    if (bestScore === 100) count100++;
    const name = user.studentName || user.name || user.displayName || '이름 없음';
    console.log(`학생: ${name} (${user.email || 'no-email'}), 학년: ${user.grade || '미지정'}, 최고점: ${bestScore}점, 응시: ${records.length}회, 단원: ${records[0]?.unitTitle || unitId}`);
  }
  console.log(`\n총 응시자: ${Object.keys(historyByStudentUnit).length}명, 100점 획득자: ${count100}명`);
}

main().catch(console.error);
