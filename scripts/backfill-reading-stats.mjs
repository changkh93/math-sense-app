import admin from 'firebase-admin';
import { existsSync, readFileSync } from 'node:fs';
import policy from '../functions/classicReadingPolicy.js';

const APPLY = process.argv.includes('--apply');
const MAINTENANCE = process.argv.includes('--maintenance-window');
if (APPLY && !MAINTENANCE) {
  throw new Error('독서 활동 쓰기를 일시 중지한 뒤 --apply --maintenance-window로 실행하세요.');
}

if (!admin.apps.length) {
  if (existsSync('./service-account.json')) {
    const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else {
    admin.initializeApp();
  }
}

const db = admin.firestore();
const Timestamp = admin.firestore.Timestamp;
const now = new Date();
const nowTimestamp = Timestamp.fromDate(now);
const todayKst = policy.toKSTDateString(now);

function isWesternClassicCluster(clusterId) {
  return ['western-classic', '서양고전', '서양고전읽기', 'classic', 'classics'].includes(clusterId);
}

console.log(`[Backfill] Starting Reading Stats backfill (mode: ${APPLY ? 'APPLY' : 'DRY-RUN'})...`);

const [usersSnap, readingLogsSnap, assignmentsSnap, readingBooksSnap] = await Promise.all([
  db.collection('users').get(),
  db.collection('readingLogs').get(),
  db.collection('assignments').get(),
  db.collection('readingBooks').get(),
]);

console.log(`[Backfill] Loaded ${usersSnap.size} users, ${readingLogsSnap.size} logs, ${assignmentsSnap.size} assignments, ${readingBooksSnap.size} books.`);

const allBookIds = new Set(readingBooksSnap.docs.map((docSnap) => docSnap.id));
const activeBookIds = new Set(readingBooksSnap.docs
  .filter((docSnap) => !docSnap.data()?.archivedAt)
  .map((docSnap) => docSnap.id));

// 1. Group valid reading logs by user
const logsByUser = new Map();
readingLogsSnap.forEach((docSnap) => {
  const log = { id: docSnap.id, ...docSnap.data() };
  if (!log.userId || log.voidedAt) return;
  if (log.eventType !== policy.LOG_EVENT_TYPES.PROGRESS) return;
  if (!log.bookId || !activeBookIds.has(log.bookId)) return;

  const isEligible = policy.isReadingLogEligibleForDayCredit({
    readDateKst: log.readDateKst,
    recordedAt: log.recordedAt || log.createdAt,
  });
  if (!isEligible) return;

  if (!logsByUser.has(log.userId)) {
    logsByUser.set(log.userId, []);
  }
  logsByUser.get(log.userId).push(log);
});

// 2. Group reviewed assignments by user
const reviewedAssignmentsByUser = new Map();
assignmentsSnap.forEach((docSnap) => {
  const assign = { id: docSnap.id, ...docSnap.data() };
  if (!assign.userId || assign.status !== 'reviewed') return;
  if (!isWesternClassicCluster(assign.clusterId)) return;
  if (!assign.reading?.bookId || !allBookIds.has(assign.reading.bookId)) return;

  if (!reviewedAssignmentsByUser.has(assign.userId)) {
    reviewedAssignmentsByUser.set(assign.userId, []);
  }
  reviewedAssignmentsByUser.get(assign.userId).push(assign);
});

// 3. Group books by user
const booksByUser = new Map();
readingBooksSnap.forEach((docSnap) => {
  const book = { id: docSnap.id, ref: docSnap.ref, ...docSnap.data() };
  if (!book.userId || book.archivedAt) return;

  if (!booksByUser.has(book.userId)) {
    booksByUser.set(book.userId, []);
  }
  booksByUser.get(book.userId).push(book);
});

// 4. Calculate stats per user
const userUpdates = [];
let totalCreditedDays = 0;
let totalCreditedAssignments = 0;
let totalCreditedBooks = 0;

for (const userDoc of usersSnap.docs) {
  const uid = userDoc.id;
  const userLogs = logsByUser.get(uid) || [];
  const userAssignments = reviewedAssignmentsByUser.get(uid) || [];
  const userBooks = booksByUser.get(uid) || [];

  // Reading Days & Streaks
  const uniqueDatesMap = new Map(); // dateStr -> first log
  const bookDaySets = new Map(); // bookId -> Set(dateStr)
  const bookDayFirstLogs = new Map(); // `${bookId}__${dateStr}` -> first log

  for (const log of userLogs) {
    if (log.readDateKst) {
      if (!uniqueDatesMap.has(log.readDateKst)) {
        uniqueDatesMap.set(log.readDateKst, log);
      }
      if (log.bookId) {
        if (!bookDaySets.has(log.bookId)) {
          bookDaySets.set(log.bookId, new Set());
        }
        bookDaySets.get(log.bookId).add(log.readDateKst);
        const bookDayKey = `${log.bookId}__${log.readDateKst}`;
        if (!bookDayFirstLogs.has(bookDayKey)) bookDayFirstLogs.set(bookDayKey, log);
      }
    }
  }

  const validDates = Array.from(uniqueDatesMap.keys()).sort();
  const streakInfo = policy.calculateStreaks(validDates, todayKst);

  // Reviewed Assignments per book
  const bookReviewedCounts = new Map();
  for (const assign of userAssignments) {
    const bookId = assign.reading?.bookId;
    if (bookId) {
      bookReviewedCounts.set(bookId, (bookReviewedCounts.get(bookId) || 0) + 1);
    }
  }

  // Evaluate books completion
  const eligibleCompletedBooks = [];
  const bookProjections = [];

  for (const book of userBooks) {
    const validReadingDayCount = bookDaySets.get(book.id)?.size || 0;
    const reviewedAssignmentCount = bookReviewedCounts.get(book.id) || 0;
    const achievementStats = {
      validReadingDayCount,
      reviewedAssignmentCount,
      version: 1,
    };
    bookProjections.push({
      bookRef: book.ref,
      bookId: book.id,
      achievementStats,
    });

    const isCompleted = policy.isBookEligibleForCompletion({
      ...book,
      achievementStats,
    });

    if (isCompleted) {
      eligibleCompletedBooks.push({
        ...book,
        achievementStats,
      });
    }
  }

  const targetStats = {
    readingDayCount: validDates.length,
    currentReadingStreak: streakInfo.currentReadingStreak,
    longestReadingStreak: streakInfo.longestReadingStreak,
    reviewedAssignmentCount: userAssignments.length,
    validCompletedBookCount: eligibleCompletedBooks.length,
    version: 1,
    backfillComplete: true,
  };

  const existingStats = userDoc.data()?.readingStats || {};
  const hasDiff =
    existingStats.readingDayCount !== targetStats.readingDayCount ||
    existingStats.currentReadingStreak !== targetStats.currentReadingStreak ||
    existingStats.longestReadingStreak !== targetStats.longestReadingStreak ||
    existingStats.reviewedAssignmentCount !== targetStats.reviewedAssignmentCount ||
    existingStats.validCompletedBookCount !== targetStats.validCompletedBookCount ||
    !existingStats.backfillComplete;

  if (hasDiff || targetStats.readingDayCount > 0 || targetStats.reviewedAssignmentCount > 0 || targetStats.validCompletedBookCount > 0) {
    userUpdates.push({
      uid,
      userRef: userDoc.ref,
      existingStats,
      targetStats,
      validDays: Array.from(uniqueDatesMap.entries()),
      bookDays: Array.from(bookDayFirstLogs.entries()),
      assignments: userAssignments,
      eligibleCompletedBooks,
      bookProjections,
    });
    totalCreditedDays += validDates.length;
    totalCreditedAssignments += userAssignments.length;
    totalCreditedBooks += eligibleCompletedBooks.length;
  }
}

console.log(`[Backfill] Found ${userUpdates.length} users with classic reading activity/changes.`);
console.log(`[Backfill] Summary: ${totalCreditedDays} reading days, ${totalCreditedAssignments} reviewed assignments, ${totalCreditedBooks} valid completed books.`);

for (const u of userUpdates.slice(0, 10)) {
  console.log(` - User ${u.uid}: days ${u.existingStats.readingDayCount ?? 0} -> ${u.targetStats.readingDayCount}, assignments ${u.existingStats.reviewedAssignmentCount ?? 0} -> ${u.targetStats.reviewedAssignmentCount}, completedBooks ${u.existingStats.validCompletedBookCount ?? 0} -> ${u.targetStats.validCompletedBookCount}, longestStreak -> ${u.targetStats.longestReadingStreak}`);
}

if (!APPLY) {
  console.log('[Backfill] DRY RUN COMPLETE. No writes executed.');
  process.exit(0);
}

console.log('[Backfill] Applying writes in batches...');

let batch = db.batch();
let opCount = 0;
const commitBatchIfNeeded = async (force = false) => {
  if (opCount >= 400 || (force && opCount > 0)) {
    await batch.commit();
    batch = db.batch();
    opCount = 0;
  }
};

for (const u of userUpdates) {
  // 1. Update user readingStats
  batch.set(u.userRef, { readingStats: u.targetStats }, { merge: true });
  opCount += 1;
  await commitBatchIfNeeded();

  // 2. Write readingDayCredits
  for (const [dateStr, firstLog] of u.validDays) {
    const creditRef = u.userRef.collection('readingDayCredits').doc(dateStr);
    batch.set(creditRef, {
      dateKey: dateStr,
      firstLogId: firstLog.id,
      firstBookId: firstLog.bookId || null,
      source: firstLog.source || 'bookshelf',
      eligibilityVersion: 1,
      creditedAt: firstLog.recordedAt || firstLog.createdAt || nowTimestamp,
    });
    opCount += 1;
    await commitBatchIfNeeded();
  }

  // 3. Write readingAssignmentCredits
  for (const assign of u.assignments) {
    const creditRef = u.userRef.collection('readingAssignmentCredits').doc(assign.id);
    batch.set(creditRef, {
      assignmentId: assign.id,
      bookId: assign.reading?.bookId || null,
      clusterId: 'western-classic',
      creditedAt: assign.reviewedAt || nowTimestamp,
    });
    opCount += 1;
    await commitBatchIfNeeded();
  }

  // 3-1. Write per-book/day markers used by the live O(1) projection update.
  for (const [bookDayKey, firstLog] of u.bookDays) {
    const creditRef = u.userRef.collection('readingBookDayCredits').doc(bookDayKey);
    batch.set(creditRef, {
      bookId: firstLog.bookId,
      dateKey: firstLog.readDateKst,
      firstLogId: firstLog.id,
      source: firstLog.source || 'bookshelf',
      eligibilityVersion: 1,
      creditedAt: firstLog.recordedAt || firstLog.createdAt || nowTimestamp,
    });
    opCount += 1;
    await commitBatchIfNeeded();
  }

  // 4. Write readingBookCredits
  for (const book of u.eligibleCompletedBooks) {
    const creditRef = u.userRef.collection('readingBookCredits').doc(book.id);
    batch.set(creditRef, {
      bookId: book.id,
      qualifyingReadingDayCount: book.achievementStats.validReadingDayCount,
      qualifyingReviewedAssignmentCount: book.achievementStats.reviewedAssignmentCount,
      totalPages: Number(book.totalPages || 0),
      furthestPage: Number(book.progress?.furthestPage || 0),
      eligibilityVersion: 1,
      creditedAt: book.completedAt || nowTimestamp,
      updatedAt: nowTimestamp,
    });
    opCount += 1;
    await commitBatchIfNeeded();
  }

  // 5. Update book achievementStats projections
  for (const proj of u.bookProjections) {
    batch.update(proj.bookRef, {
      achievementStats: proj.achievementStats,
    });
    opCount += 1;
    await commitBatchIfNeeded();
  }
}

await commitBatchIfNeeded(true);
console.log('[Backfill] All writes committed successfully! ✅');
