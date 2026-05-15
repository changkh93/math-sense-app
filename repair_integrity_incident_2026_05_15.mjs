import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import {
  buildStreakWriteAudit,
  extractLearningActivityDates,
  getCurrentStreakWindow,
  getTodayKST,
  shiftKSTDate,
} from './src/utils/streakUtils.js';
import { isRestDay } from './src/utils/holidayUtils.js';

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));

if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();
const APPLY = process.argv.includes('--apply');
const FIX_REFUNDS = process.argv.includes('--fix-refunds');
const FIX_CORES = process.argv.includes('--fix-cores');
const FIX_STREAKS = process.argv.includes('--fix-streaks');
const SUMMARY = process.argv.includes('--summary');
const TARGET_ARG = process.argv.find(arg => arg.startsWith('--target='))?.slice('--target='.length) || '';
const INCIDENT_SOURCE = 'integrity_incident_2026_05_15';
const RECENT_DAYS = 7;

if (APPLY && !FIX_REFUNDS && !FIX_CORES && !FIX_STREAKS) {
  throw new Error('Apply mode requires at least one explicit fix flag: --fix-refunds, --fix-cores, or --fix-streaks.');
}

function valueToDate(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  if (value._seconds) return new Date(value._seconds * 1000);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function valueToMs(value) {
  return valueToDate(value)?.getTime() || 0;
}

function getRecentDateSet(todayKST = getTodayKST()) {
  const dates = new Set();
  for (let i = 0; i < RECENT_DAYS; i += 1) {
    dates.add(shiftKSTDate(todayKST, -i));
  }
  return dates;
}

function compactUserName(data = {}, fallback = '') {
  return data.studentName || data.publicDisplayName || data.name || data.displayName || fallback;
}

async function getRows(ref, orderField = '') {
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
    const haystack = [
      data.name,
      data.studentName,
      data.displayName,
      data.publicDisplayName,
      data.email,
    ].filter(Boolean).join(' ');
    return haystack.includes(TARGET_ARG);
  });
}

function getExplicitDefendedDates(transactions) {
  const defended = new Set();
  for (const tx of transactions) {
    if (tx.type !== 'streak_freeze') continue;
    const dates = Array.isArray(tx.metadata?.defendedDates) ? tx.metadata.defendedDates : [];
    for (const date of dates) {
      if (date && !isRestDay(date)) defended.add(date);
    }
  }
  return defended;
}

function calculateHistoricalLongest(activeDates, defendedDates) {
  const sortedActive = [...activeDates].sort();
  if (sortedActive.length === 0) return 0;

  const activeSet = new Set(sortedActive);
  const defendedSet = new Set(defendedDates);
  const firstDate = sortedActive[0];
  const lastDate = sortedActive[sortedActive.length - 1];

  let cursor = firstDate;
  let current = 0;
  let longest = 0;

  while (cursor <= lastDate) {
    if (activeSet.has(cursor)) {
      current += 1;
      longest = Math.max(longest, current);
    } else if (defendedSet.has(cursor) || isRestDay(cursor)) {
      // Maintains the chain but does not add a learning day.
    } else {
      current = 0;
    }
    cursor = shiftKSTDate(cursor, 1);
  }

  return longest;
}

function deriveCoreCountFromBalances(transactions, currentFreezeCount) {
  const events = transactions
    .filter(tx => (
      (tx.type === 'store_purchase' && tx.metadata?.itemId === 'cryo_core') ||
      tx.type === 'streak_freeze'
    ))
    .sort((a, b) => valueToMs(a.timestamp) - valueToMs(b.timestamp));

  const lastBalanceIdx = events.findLastIndex(tx => (
    tx.type === 'streak_freeze' &&
    Number.isFinite(Number(tx.metadata?.balanceAfter))
  ));

  if (lastBalanceIdx === -1) {
    return {
      nextFreezeCount: currentFreezeCount,
      source: 'kept_current_no_balance_after',
      evidenceCount: events.length,
    };
  }

  let count = Number(events[lastBalanceIdx].metadata.balanceAfter);
  for (const event of events.slice(lastBalanceIdx + 1)) {
    if (event.type === 'store_purchase' && event.metadata?.itemId === 'cryo_core') {
      count += 1;
      continue;
    }

    if (event.type === 'streak_freeze') {
      if (Number.isFinite(Number(event.metadata?.balanceAfter))) {
        count = Number(event.metadata.balanceAfter);
      } else if (Number.isFinite(Number(event.metadata?.consumedFreezeCount))) {
        count -= Number(event.metadata.consumedFreezeCount);
      } else {
        const defendedDates = Array.isArray(event.metadata?.defendedDates)
          ? event.metadata.defendedDates.filter(date => !isRestDay(date))
          : [];
        count -= Math.max(1, defendedDates.length);
      }
    }
  }

  return {
    nextFreezeCount: Math.max(0, count),
    source: 'latest_balance_after_plus_later_events',
    evidenceCount: events.length,
    lastBalanceEventId: events[lastBalanceIdx].id,
  };
}

function getPenaltyRefunds(transactions, recentDates) {
  const refundIds = new Set(
    transactions
      .filter(tx => tx.type === 'assignment_missing_penalty_refund')
      .map(tx => tx.metadata?.originalTxId)
      .filter(Boolean)
  );

  const refunds = [];
  for (const tx of transactions) {
    if (tx.type !== 'assignment_missing_penalty') continue;
    if (refundIds.has(tx.id)) continue;

    const penaltyDate = tx.metadata?.date || '';
    const amount = Number(tx.amount || 0);
    if (!penaltyDate || amount >= 0) continue;

    if (!recentDates.has(penaltyDate)) {
      refunds.push({
        originalTxId: tx.id,
        amount: Math.abs(amount),
        reason: 'outside_recent_7_days',
        penaltyDate,
      });
      continue;
    }

    if (amount < -25) {
      refunds.push({
        originalTxId: tx.id,
        amount: Math.abs(amount) - 25,
        reason: 'above_new_penalty_cap',
        penaltyDate,
      });
    }
  }

  return refunds;
}

async function inspectUser(userDoc, todayKST, recentDates) {
  const uid = userDoc.id;
  const data = userDoc.data() || {};
  const userRef = db.collection('users').doc(uid);

  const [history, transactions] = await Promise.all([
    getRows(userRef.collection('history'), 'timestamp'),
    getRows(userRef.collection('crystal_transactions'), 'timestamp'),
  ]);

  const activeDates = extractLearningActivityDates(history, transactions);
  const defendedDates = getExplicitDefendedDates(transactions);
  const currentWindow = getCurrentStreakWindow(activeDates, defendedDates, todayKST);
  const historicalLongest = calculateHistoricalLongest(activeDates, defendedDates);
  const coreState = deriveCoreCountFromBalances(transactions, Number(data.streakFreezeCount || 0));
  const penaltyRefunds = getPenaltyRefunds(transactions, recentDates);
  const penaltyRefundTotal = penaltyRefunds.reduce((sum, item) => sum + item.amount, 0);

  const next = {
    currentStreak: currentWindow.activeCount,
    lastStreakDate: currentWindow.lastActiveDate || '',
    longestStreak: Math.max(historicalLongest, currentWindow.activeCount),
    streakFreezeCount: coreState.nextFreezeCount,
  };

  const changed = [];
  for (const key of Object.keys(next)) {
    if (JSON.stringify(data[key] ?? null) !== JSON.stringify(next[key] ?? null)) {
      changed.push(key);
    }
  }
  if (penaltyRefundTotal > 0) changed.push('assignmentPenaltyRefund');

  return {
    uid,
    name: compactUserName(data, uid.slice(0, 8)),
    role: data.role || '',
    stored: {
      crystals: Number(data.crystals || 0),
      currentStreak: Number(data.currentStreak || 0),
      lastStreakDate: data.lastStreakDate || '',
      longestStreak: Number(data.longestStreak || 0),
      streakFreezeCount: Number(data.streakFreezeCount || 0),
    },
    next,
    evidence: {
      historyCount: history.length,
      transactionCount: transactions.length,
      activeDateCount: activeDates.size,
      defendedDates: [...defendedDates].sort(),
      currentChainDates: currentWindow.chainDates,
      currentDefendedDates: currentWindow.defendedDatesInWindow,
      coreState,
      penaltyRefundTotal,
      penaltyRefunds,
    },
    changed,
  };
}

async function applyUserRepair(result, todayKST) {
  const userRef = db.collection('users').doc(result.uid);
  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.runTransaction(async transaction => {
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists) return;
    const liveData = userSnap.data() || {};

    const nextState = {
      currentStreak: FIX_STREAKS ? result.next.currentStreak : Number(liveData.currentStreak || 0),
      lastStreakDate: FIX_STREAKS ? result.next.lastStreakDate : (liveData.lastStreakDate || ''),
      streakFreezeCount: FIX_CORES ? result.next.streakFreezeCount : Number(liveData.streakFreezeCount || 0),
    };

    const updates = {
      integrityRepairAudit: {
        version: 1,
        source: INCIDENT_SOURCE,
        repairedAt: now,
        todayKST,
        applied: {
          refunds: FIX_REFUNDS,
          cores: FIX_CORES,
          streaks: FIX_STREAKS,
        },
        evidence: result.evidence,
        previous: result.stored,
        next: result.next,
      },
      streakWriteAudit: buildStreakWriteAudit({
        source: INCIDENT_SOURCE,
        writerUid: 'service-account',
        prevState: liveData,
        nextState,
        writtenAt: now,
        note: result.uid,
      }),
    };

    if (FIX_STREAKS) {
      updates.currentStreak = result.next.currentStreak;
      updates.lastStreakDate = result.next.lastStreakDate;
      updates.longestStreak = result.next.longestStreak;
    }

    if (FIX_CORES) {
      updates.streakFreezeCount = result.next.streakFreezeCount;
    }

    const refundTotal = result.evidence.penaltyRefundTotal || 0;
    if (FIX_REFUNDS && refundTotal > 0) {
      updates.crystals = Number(liveData.crystals || 0) + refundTotal;
    }

    transaction.set(userRef, updates, { merge: true });

    if (!FIX_REFUNDS) return;

    for (const refund of result.evidence.penaltyRefunds || []) {
      const refundRef = userRef.collection('crystal_transactions').doc(`refund_${refund.originalTxId}`);
      transaction.set(refundRef, {
        amount: refund.amount,
        type: 'assignment_missing_penalty_refund',
        description: `과제 미제출 차감 환불 (${refund.penaltyDate}, ${refund.reason})`,
        metadata: {
          originalTxId: refund.originalTxId,
          penaltyDate: refund.penaltyDate,
          reason: refund.reason,
          source: INCIDENT_SOURCE,
        },
        timestamp: now,
      }, { merge: false });
    }
  });
}

function isApplicable(result) {
  if (FIX_REFUNDS && result.evidence.penaltyRefundTotal > 0) return true;
  if (FIX_CORES && result.stored.streakFreezeCount !== result.next.streakFreezeCount) return true;
  if (FIX_STREAKS) {
    return (
      result.stored.currentStreak !== result.next.currentStreak ||
      result.stored.lastStreakDate !== result.next.lastStreakDate ||
      result.stored.longestStreak !== result.next.longestStreak
    );
  }
  if (FIX_REFUNDS || FIX_CORES || FIX_STREAKS) return false;
  return result.changed.length > 0;
}

function buildSummary(results) {
  const refundUsers = results.filter(result => result.evidence.penaltyRefundTotal > 0);
  const coreUsers = results.filter(result => result.stored.streakFreezeCount !== result.next.streakFreezeCount);
  const streakUsers = results.filter(result => (
    result.stored.currentStreak !== result.next.currentStreak ||
    result.stored.lastStreakDate !== result.next.lastStreakDate ||
    result.stored.longestStreak !== result.next.longestStreak
  ));

  return {
    totalCandidates: results.length,
    refundUsers: refundUsers.length,
    refundTotal: refundUsers.reduce((sum, result) => sum + result.evidence.penaltyRefundTotal, 0),
    coreUsers: coreUsers.length,
    streakUsers: streakUsers.length,
    topRefunds: refundUsers
      .sort((a, b) => b.evidence.penaltyRefundTotal - a.evidence.penaltyRefundTotal)
      .slice(0, 20)
      .map(result => ({
        uid: result.uid,
        name: result.name,
        crystals: result.stored.crystals,
        refund: result.evidence.penaltyRefundTotal,
        crystalsAfterRefund: result.stored.crystals + result.evidence.penaltyRefundTotal,
      })),
    coreChanges: coreUsers.map(result => ({
      uid: result.uid,
      name: result.name,
      from: result.stored.streakFreezeCount,
      to: result.next.streakFreezeCount,
      source: result.evidence.coreState.source,
      lastBalanceEventId: result.evidence.coreState.lastBalanceEventId || '',
    })),
    streakChanges: streakUsers.map(result => ({
      uid: result.uid,
      name: result.name,
      from: {
        currentStreak: result.stored.currentStreak,
        lastStreakDate: result.stored.lastStreakDate,
        longestStreak: result.stored.longestStreak,
      },
      to: {
        currentStreak: result.next.currentStreak,
        lastStreakDate: result.next.lastStreakDate,
        longestStreak: result.next.longestStreak,
      },
      activeDateCount: result.evidence.activeDateCount,
      defendedDates: result.evidence.defendedDates,
      currentDefendedDates: result.evidence.currentDefendedDates,
    })),
  };
}

const todayKST = getTodayKST();
const recentDates = getRecentDateSet(todayKST);
const userDocs = await findUsers();

const results = [];
for (const userDoc of userDocs) {
  const data = userDoc.data() || {};
  if (!TARGET_ARG && ['admin', 'teacher', 'developer', 'parent'].includes(data.role)) continue;
  const result = await inspectUser(userDoc, todayKST, recentDates);
  if (TARGET_ARG || result.changed.length > 0) {
    results.push(result);
  }
}

const printableResults = results.map(result => ({
  uid: result.uid,
  name: result.name,
  stored: result.stored,
  proposed: {
    ...result.next,
    crystalsAfterRefund: result.stored.crystals + result.evidence.penaltyRefundTotal,
  },
  evidence: {
    activeDateCount: result.evidence.activeDateCount,
    defendedDates: result.evidence.defendedDates,
    currentDefendedDates: result.evidence.currentDefendedDates,
    coreState: result.evidence.coreState,
    penaltyRefundTotal: result.evidence.penaltyRefundTotal,
    penaltyRefunds: result.evidence.penaltyRefunds,
  },
  changed: result.changed,
}));

console.log(JSON.stringify(SUMMARY ? buildSummary(results) : printableResults, null, 2));

if (!APPLY) {
  console.log(`\nDry run only. ${results.length} user(s) would be repaired.`);
  console.log(`Re-run with --apply${TARGET_ARG ? ` --target=${TARGET_ARG}` : ''} to write these changes.`);
  process.exit(0);
}

let updated = 0;
for (const result of results) {
  if (!isApplicable(result)) continue;
  await applyUserRepair(result, todayKST);
  updated += 1;
  console.log(`Applied repair: ${result.name} (${result.uid})`);
}

console.log(`\nApplied integrity repair to ${updated} user(s).`);
