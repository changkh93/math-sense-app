import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import {
  extractLearningActivityDates,
  recalculateStreakState,
  getTodayKST,
} from './src/utils/streakUtils.js';

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));

if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();
const TARGET_ARG = process.argv.find(arg => arg.startsWith('--target='))?.slice('--target='.length) || '';
const SCAN_ALL = process.argv.includes('--scan-all');

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

function summarizeTypes(rows, field = 'type') {
  const summary = {};
  for (const row of rows) {
    const key = row[field] || '(missing)';
    summary[key] = (summary[key] || 0) + 1;
  }
  return summary;
}

function sumField(rows, field) {
  return rows.reduce((sum, row) => sum + Number(row[field] || 0), 0);
}

function compactUserData(data) {
  const keys = [
    'email',
    'name',
    'studentName',
    'displayName',
    'crystals',
    'totalQuizzes',
    'totalScore',
    'averageScore',
    'perfectCount',
    'questionCount',
    'helpCount',
    'currentStreak',
    'longestStreak',
    'lastStreakDate',
    'streakFreezeCount',
    'createdAt',
    'updatedAt',
    'lastActive',
    'lastUpdated',
    'adjustmentReason',
    '_restored',
  ];
  return Object.fromEntries(keys.filter(k => data[k] !== undefined).map(k => [k, data[k]]));
}

async function getCollectionRows(ref, orderField = null) {
  const snap = orderField
    ? await ref.orderBy(orderField, 'asc').get().catch(() => ref.get())
    : await ref.get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function countUserAgora(uid) {
  const [questionsSnap, answersSnap, oldAgoraSnap] = await Promise.all([
    db.collection('questions').where('userId', '==', uid).get(),
    db.collection('answers').where('userId', '==', uid).get(),
    db.collection('agora').get().catch(() => ({ docs: [] })),
  ]);

  let oldAgoraQuestions = 0;
  let oldAgoraAnswers = 0;
  for (const doc of oldAgoraSnap.docs || []) {
    const q = doc.data();
    if (q.userId === uid || q.authorId === uid || q.uid === uid) oldAgoraQuestions += 1;
    const answers = await db.collection('agora').doc(doc.id).collection('answers').get().catch(() => ({ docs: [] }));
    for (const answer of answers.docs || []) {
      const a = answer.data();
      if (a.userId === uid || a.authorId === uid || a.uid === uid) oldAgoraAnswers += 1;
    }
  }

  const answers = answersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  return {
    questionCountActual: questionsSnap.size,
    answerCountActual: answersSnap.size,
    acceptedAnswerCountActual: answers.filter(a => a.isAccepted).length,
    verifiedAnswerCountActual: answers.filter(a => a.isVerified).length,
    oldAgoraQuestions,
    oldAgoraAnswers,
  };
}

async function inspectUser(userDoc, verbose = true) {
  const uid = userDoc.id;
  const data = userDoc.data();
  const userRef = db.collection('users').doc(uid);

  const [history, txs, agoraCounts] = await Promise.all([
    getCollectionRows(userRef.collection('history'), 'timestamp'),
    getCollectionRows(userRef.collection('crystal_transactions'), 'timestamp'),
    countUserAgora(uid),
  ]);

  const activeDates = extractLearningActivityDates(history, txs);
  const coreEvidenceDates = txs
    .filter(t => t.type === 'store_purchase' && t.metadata?.itemId === 'cryo_core')
    .map(t => dateKey(t.timestamp))
    .filter(Boolean);
  const activeDateList = Array.from(activeDates).sort();
  const streakState = recalculateStreakState(activeDateList, coreEvidenceDates, getTodayKST());

  const txSum = sumField(txs, 'amount');
  const historyCrystalSum = sumField(history, 'crystalsEarned');
  const totalScore = sumField(history, 'score');
  const perfectCount = history.filter(h => Number(h.score) === 100).length;
  const quizHistory = history.filter(h => !h.type || h.type === 'quiz' || h.score !== undefined);

  const result = {
    uid,
    identity: {
      email: data.email,
      name: data.name,
      studentName: data.studentName,
      displayName: data.displayName,
    },
    stored: compactUserData(data),
    derived: {
      txCount: txs.length,
      txSum,
      txTypes: summarizeTypes(txs),
      historyCount: history.length,
      quizHistoryCount: quizHistory.length,
      historyCrystalSum,
      historyTotalScore: totalScore,
      historyAverageScore: quizHistory.length ? Math.round((totalScore / quizHistory.length) * 10) / 10 : 0,
      historyPerfectCount: perfectCount,
      activeDateCount: activeDates.size,
      firstActiveDate: activeDateList[0] || '',
      lastActiveDate: activeDateList.at(-1) || '',
      recalculatedStreak: streakState.correctStreak,
      recalculatedLastStreakDate: streakState.correctLastDate,
      recalculatedCoresRemaining: streakState.coresRemaining,
      ...agoraCounts,
    },
    riskSignals: {
      restoredByClient: Boolean(data._restored || data.adjustmentReason),
      crystalsEqualLedgerOnly: Number(data.crystals || 0) === txSum && historyCrystalSum > txSum,
      lostAgoraCounters:
        Number(data.questionCount || 0) < agoraCounts.questionCountActual ||
        Number(data.helpCount || 0) < agoraCounts.acceptedAnswerCountActual,
      streakMismatch:
        Number(data.currentStreak || 0) !== streakState.correctStreak ||
        (data.lastStreakDate || '') !== streakState.correctLastDate,
    },
  };

  if (verbose) {
    console.log(JSON.stringify(result, null, 2));
    console.log('\nLatest history rows:');
    history.slice(-8).reverse().forEach(h => console.log({
      id: h.id,
      type: h.type,
      score: h.score,
      crystalsEarned: h.crystalsEarned,
      title: h.unitTitle || h.title,
      date: dateKey(h.timestamp),
      timestamp: valueToDate(h.timestamp)?.toISOString?.(),
    }));
    console.log('\nLatest crystal transactions:');
    txs.slice(-12).reverse().forEach(t => console.log({
      id: t.id,
      type: t.type,
      amount: t.amount,
      description: t.description,
      date: dateKey(t.timestamp),
      timestamp: valueToDate(t.timestamp)?.toISOString?.(),
      metadata: t.metadata,
    }));
  }

  return result;
}

async function findTargetUsers() {
  if (!TARGET_ARG) {
    throw new Error('Usage: node investigate_student_records.mjs --target=<uid|email|name fragment>');
  }

  const byId = await db.collection('users').doc(TARGET_ARG).get();
  if (byId.exists) return [byId];

  const byEmail = await db.collection('users').where('email', '==', TARGET_ARG).get();
  const all = await db.collection('users').get();
  const matches = new Map();
  byEmail.docs.forEach(d => matches.set(d.id, d));
  all.docs.forEach(d => {
    const data = d.data();
    const haystack = [data.name, data.studentName, data.displayName, data.email].filter(Boolean).join(' ');
    if (haystack.includes(TARGET_ARG)) matches.set(d.id, d);
  });
  return Array.from(matches.values());
}

async function globalRiskScan(targetUid) {
  const snap = await db.collection('users').get();
  const rows = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.role === 'admin' || data.role === 'teacher' || data.role === 'developer') continue;
    const result = await inspectUser(doc, false);
    const signalCount = Object.values(result.riskSignals).filter(Boolean).length;
    if (signalCount > 0 || doc.id === targetUid) {
      rows.push({
        uid: doc.id,
        name: data.studentName || data.name || data.displayName || '',
        email: data.email || '',
        storedCrystals: data.crystals || 0,
        txSum: result.derived.txSum,
        historyCrystalSum: result.derived.historyCrystalSum,
        storedStreak: data.currentStreak || 0,
        recalculatedStreak: result.derived.recalculatedStreak,
        storedQuestions: data.questionCount || 0,
        actualQuestions: result.derived.questionCountActual,
        storedHelp: data.helpCount || 0,
        acceptedAnswers: result.derived.acceptedAnswerCountActual,
        signals: result.riskSignals,
      });
    }
  }
  rows.sort((a, b) => {
    const bCount = Object.values(b.signals).filter(Boolean).length;
    const aCount = Object.values(a.signals).filter(Boolean).length;
    return bCount - aCount || (b.historyCrystalSum - b.txSum) - (a.historyCrystalSum - a.txSum);
  });
  console.log('\n=== Similar-risk user scan ===');
  console.log(JSON.stringify(rows.slice(0, 40), null, 2));
  console.log(`Total flagged: ${rows.length}`);
}

const targets = await findTargetUsers();
if (targets.length === 0) {
  console.error('No target user found.');
  process.exit(1);
}

console.log(`Found ${targets.length} target candidate(s).`);
let firstUid = '';
for (const target of targets) {
  firstUid ||= target.id;
  console.log(`\n=== Target: ${target.id} ===`);
  await inspectUser(target, true);
}

if (SCAN_ALL) {
  await globalRiskScan(firstUid);
} else {
  console.log('\nUse --scan-all to run the slower similar-risk user scan.');
}
