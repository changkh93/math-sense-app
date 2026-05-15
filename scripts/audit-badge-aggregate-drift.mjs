import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { buildCollectionBadges, calculateCollectionBadgeStats } from '../src/utils/badgeUtils.js';

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
const APPLY = process.argv.includes('--apply');
const DANGEROUS_APPLY = process.argv.includes('--dangerously-apply-badge-aggregate-repair');
const MATERIAL_DRIFT_THRESHOLD = 5;

if (APPLY && !DANGEROUS_APPLY) {
  throw new Error('Badge aggregate repair requires --dangerously-apply-badge-aggregate-repair.');
}

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

function getName(data) {
  return data.studentName || data.publicDisplayName || data.displayName || data.name || data.email || '';
}

function isStudent(data) {
  return !['admin', 'teacher', 'developer'].includes(data.role);
}

function legacyStoredFieldSolarMasterUnlocked(data) {
  return (data.totalQuizzes || 0) >= 132 && (data.averageScore || 0) >= 99;
}

function expectedSolarMasterUnlocked(stats) {
  return stats.uniqueQuizUnits >= 132 && stats.averageScore >= 99;
}

function collectionSolarMasterUnlocked(data, history) {
  return buildCollectionBadges(data, history)
    .find(badge => badge.title === '태양계 마스터')?.unlocked === true;
}

function roundOne(value) {
  return Math.round(value * 10) / 10;
}

function getExpectedAggregateFields(stats) {
  return {
    totalQuizzes: stats.quizAttempts,
    totalScore: stats.quizScoreSum,
    averageScore: roundOne(stats.quizAverageScore),
    perfectCount: stats.perfectUnits,
  };
}

function isMaterialDrift(data, stats) {
  const expected = getExpectedAggregateFields(stats);
  return Math.abs(Number(data.totalQuizzes || 0) - expected.totalQuizzes) >= MATERIAL_DRIFT_THRESHOLD
    || Math.abs(Number(data.totalScore || 0) - expected.totalScore) >= 1
    || roundOne(Number(data.averageScore || 0)) !== expected.averageScore
    || Number(data.perfectCount || 0) !== expected.perfectCount;
}

function getRepairFields(stats) {
  return {
    ...getExpectedAggregateFields(stats),
    badgeAggregateRepairAudit: {
      version: 1,
      source: 'audit-badge-aggregate-drift',
      repairedAt: admin.firestore.FieldValue.serverTimestamp(),
      note: 'Repaired quiz aggregate fields using quiz/workbook history only.',
    },
  };
}

const usersSnap = await db.collection('users').get();
const users = usersSnap.docs
  .map(doc => ({ uid: doc.id, data: doc.data() }))
  .filter(({ data }) => isStudent(data));

const driftUsers = [];
const collectionBadgeFalsePositives = [];
const legacyStoredFieldSolarMasterRisks = [];
const topOvercounts = [];
const repairTargets = [];

for (const { uid, data } of users) {
  const historySnap = await db.collection('users').doc(uid).collection('history').get();
  const history = historySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const stats = calculateCollectionBadgeStats(history, data);
  const expectedAggregates = getExpectedAggregateFields(stats);
  const storedTotalQuizzes = Number(data.totalQuizzes || 0);
  const overcount = storedTotalQuizzes - stats.quizAttempts;

  if (isMaterialDrift(data, stats)) {
    const drift = {
      uid,
      name: getName(data),
      storedTotalQuizzes,
      actualQuizAttempts: stats.quizAttempts,
      storedTotalScore: Number(data.totalScore || 0),
      repairedTotalScore: expectedAggregates.totalScore,
      uniqueQuizUnits: stats.uniqueQuizUnits,
      storedAverageScore: Number(data.averageScore || 0),
      repairedAverageScore: expectedAggregates.averageScore,
      storedPerfectCount: Number(data.perfectCount || 0),
      repairedPerfectCount: expectedAggregates.perfectCount,
      badgeAverageScore: roundOne(stats.averageScore),
      overcount,
    };
    driftUsers.push(drift);
    repairTargets.push({
      ...drift,
      ref: db.collection('users').doc(uid),
      repairFields: getRepairFields(stats),
    });
  }

  if (collectionSolarMasterUnlocked(data, history) && !expectedSolarMasterUnlocked(stats)) {
    collectionBadgeFalsePositives.push({
      uid,
      name: getName(data),
      storedTotalQuizzes,
      actualQuizAttempts: stats.quizAttempts,
      uniqueQuizUnits: stats.uniqueQuizUnits,
      storedAverageScore: Number(data.averageScore || 0),
      repairedAverageScore: expectedAggregates.averageScore,
      badgeAverageScore: roundOne(stats.averageScore),
      overcount,
    });
  }

  if (legacyStoredFieldSolarMasterUnlocked(data) && !expectedSolarMasterUnlocked(stats)) {
    legacyStoredFieldSolarMasterRisks.push({
      uid,
      name: getName(data),
      storedTotalQuizzes,
      actualQuizAttempts: stats.quizAttempts,
      uniqueQuizUnits: stats.uniqueQuizUnits,
      storedAverageScore: Number(data.averageScore || 0),
      repairedAverageScore: expectedAggregates.averageScore,
      badgeAverageScore: roundOne(stats.averageScore),
      overcount,
    });
  }

  if (overcount > 0) {
    topOvercounts.push({
      uid,
      name: getName(data),
      storedTotalQuizzes,
      actualQuizAttempts: stats.quizAttempts,
      uniqueQuizUnits: stats.uniqueQuizUnits,
      overcount,
    });
  }
}

topOvercounts.sort((a, b) => b.overcount - a.overcount);
collectionBadgeFalsePositives.sort((a, b) => b.overcount - a.overcount);
legacyStoredFieldSolarMasterRisks.sort((a, b) => b.overcount - a.overcount);
driftUsers.sort((a, b) => Math.abs(b.overcount) - Math.abs(a.overcount));

console.log(JSON.stringify({
  checkedUsers: users.length,
  driftUserCount: driftUsers.length,
  collectionBadgeFalsePositiveCount: collectionBadgeFalsePositives.length,
  collectionBadgeFalsePositives,
  legacyStoredFieldSolarMasterRiskCount: legacyStoredFieldSolarMasterRisks.length,
  legacyStoredFieldSolarMasterRisks,
  topOvercounts: topOvercounts.slice(0, 30),
  driftUsers: driftUsers.slice(0, 50),
}, null, 2));

if (APPLY) {
  const batch = db.batch();
  repairTargets.forEach(target => {
    batch.set(target.ref, target.repairFields, { merge: true });
  });
  await batch.commit();
  console.log(JSON.stringify({
    applied: true,
    repairedUserCount: repairTargets.length,
    repairedUsers: repairTargets.map(({ uid, name, storedTotalQuizzes, actualQuizAttempts, uniqueQuizUnits, overcount }) => ({
      uid,
      name,
      storedTotalQuizzes,
      repairedTotalQuizzes: actualQuizAttempts,
      uniqueQuizUnits,
      overcount,
    })),
  }, null, 2));
}
