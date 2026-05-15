import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import {
  buildStreakWriteAudit,
  extractLearningActivityDates,
  getTodayKST,
  recalculateStreakState,
} from './src/utils/streakUtils.js';

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));

if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();
const APPLY = process.argv.includes('--apply');
const DANGEROUS_APPLY = process.argv.includes('--dangerously-apply-aggregate-repair');
const TARGET_ARG = process.argv.find(arg => arg.startsWith('--target='))?.slice('--target='.length) || '';

if (APPLY && (!DANGEROUS_APPLY || !TARGET_ARG)) {
  throw new Error(
    'Global aggregate repair is disabled. Re-run with --target=<uid-or-name> --apply --dangerously-apply-aggregate-repair only after a manual audit.'
  );
}

function valueToDate(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function dateKey(value) {
  const d = valueToDate(value);
  return d ? getTodayKST(d) : '';
}

function sum(rows, field) {
  return rows.reduce((acc, row) => acc + Number(row[field] || 0), 0);
}

async function rows(ref, orderField = '') {
  const snap = orderField
    ? await ref.orderBy(orderField, 'asc').get().catch(() => ref.get())
    : await ref.get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function findUsers() {
  if (!TARGET_ARG) {
    return (await db.collection('users').get()).docs;
  }

  const byId = await db.collection('users').doc(TARGET_ARG).get();
  if (byId.exists) return [byId];

  const byEmail = await db.collection('users').where('email', '==', TARGET_ARG).get();
  if (!byEmail.empty) return byEmail.docs;

  const all = await db.collection('users').get();
  return all.docs.filter(doc => {
    const data = doc.data();
    const haystack = [data.name, data.studentName, data.displayName, data.email].filter(Boolean).join(' ');
    return haystack.includes(TARGET_ARG);
  });
}

async function calculateAggregate(userDoc) {
  const uid = userDoc.id;
  const data = userDoc.data();
  const userRef = db.collection('users').doc(uid);

  const [history, txs, questionSnap, answerSnap] = await Promise.all([
    rows(userRef.collection('history'), 'timestamp'),
    rows(userRef.collection('crystal_transactions'), 'timestamp'),
    db.collection('questions').where('userId', '==', uid).get(),
    db.collection('answers').where('userId', '==', uid).get(),
  ]);

  const activeDates = Array.from(extractLearningActivityDates(history, txs)).sort();
  const coreEvidenceDates = txs
    .filter(t => t.type === 'store_purchase' && t.metadata?.itemId === 'cryo_core')
    .map(t => dateKey(t.timestamp))
    .filter(Boolean);
  const streak = recalculateStreakState(activeDates, coreEvidenceDates, getTodayKST());

  const totalQuizzes = history.length;
  const totalScore = sum(history, 'score');
  const txSum = sum(txs, 'amount');
  const historyCrystalSum = sum(history, 'crystalsEarned');
  const answers = answerSnap.docs.map(doc => doc.data());

  const next = {
    crystals: txs.length > 0 ? txSum : historyCrystalSum,
    totalQuizzes,
    totalScore,
    averageScore: totalQuizzes > 0 ? Math.round((totalScore / totalQuizzes) * 10) / 10 : 0,
    perfectCount: history.filter(h => Number(h.score) === 100).length,
    questionCount: questionSnap.size,
    helpCount: answers.filter(a => a.isAccepted).length,
    currentStreak: streak.correctStreak,
    lastStreakDate: streak.correctLastDate,
    longestStreak: Math.max(Number(data.longestStreak || 0), streak.correctStreak),
    streakFreezeCount: streak.coresRemaining,
    recoveryNeedsReview: txs.length > 0 && historyCrystalSum > txSum + 100,
    aggregateRepairAudit: {
      version: 1,
      source: 'repair_user_aggregates',
      repairedAt: admin.firestore.FieldValue.serverTimestamp(),
      historyCount: history.length,
      transactionCount: txs.length,
      transactionBalance: txSum,
      historyCrystalSum,
      activeDateCount: activeDates.length,
    },
    streakWriteAudit: buildStreakWriteAudit({
      source: 'repair_user_aggregates',
      writerUid: 'service-account',
      prevState: data,
      nextState: {
        currentStreak: streak.correctStreak,
        lastStreakDate: streak.correctLastDate,
        streakFreezeCount: streak.coresRemaining,
      },
      writtenAt: admin.firestore.FieldValue.serverTimestamp(),
      note: uid,
    }),
  };

  const changed = Object.keys(next).filter(key => {
    if (key === 'aggregateRepairAudit' || key === 'streakWriteAudit') return false;
    return JSON.stringify(data[key] ?? null) !== JSON.stringify(next[key] ?? null);
  });

  return {
    uid,
    name: data.studentName || data.name || data.displayName || '',
    email: data.email || '',
    stored: {
      crystals: data.crystals || 0,
      totalQuizzes: data.totalQuizzes || 0,
      averageScore: data.averageScore || 0,
      questionCount: data.questionCount || 0,
      helpCount: data.helpCount || 0,
      currentStreak: data.currentStreak || 0,
      lastStreakDate: data.lastStreakDate || '',
      streakFreezeCount: data.streakFreezeCount || 0,
    },
    next,
    evidence: {
      txCount: txs.length,
      txSum,
      historyCount: history.length,
      historyCrystalSum,
      questionCount: questionSnap.size,
      acceptedAnswerCount: answers.filter(a => a.isAccepted).length,
      activeDateCount: activeDates.length,
    },
    changed,
  };
}

const userDocs = await findUsers();
if (userDocs.length === 0) {
  console.error('No users matched.');
  process.exit(1);
}

const results = [];
for (const userDoc of userDocs) {
  const data = userDoc.data();
  if (!TARGET_ARG && ['admin', 'teacher', 'developer'].includes(data.role)) continue;
  const result = await calculateAggregate(userDoc);
  if (TARGET_ARG || result.changed.length > 0 || data._restored || data.adjustmentReason) {
    results.push(result);
  }
}

console.log(JSON.stringify(results.map(result => ({
  uid: result.uid,
  name: result.name,
  email: result.email,
  stored: result.stored,
  proposed: {
    crystals: result.next.crystals,
    totalQuizzes: result.next.totalQuizzes,
    averageScore: result.next.averageScore,
    questionCount: result.next.questionCount,
    helpCount: result.next.helpCount,
    currentStreak: result.next.currentStreak,
    lastStreakDate: result.next.lastStreakDate,
    streakFreezeCount: result.next.streakFreezeCount,
    recoveryNeedsReview: result.next.recoveryNeedsReview,
  },
  evidence: result.evidence,
  changed: result.changed,
})), null, 2));

if (!APPLY) {
  console.log(`\nDry run only. Re-run with --apply${TARGET_ARG ? ` --target=${TARGET_ARG}` : ''} to write these changes.`);
  process.exit(0);
}

let updated = 0;
for (const result of results) {
  if (result.changed.length === 0) continue;
  await db.collection('users').doc(result.uid).set(result.next, { merge: true });
  updated += 1;
}

console.log(`\nApplied aggregate repair to ${updated} user(s).`);
