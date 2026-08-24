const assert = require("assert");
const fs = require("fs");
const path = require("path");
const policy = require("./classicReadingPolicy");

console.log("=== Running classicReadingPolicy unit tests ===");

// 1. String normalization
assert.strictEqual(policy.normalizeString("  어린   왕자 "), "어린왕자");
assert.strictEqual(policy.normalizeString("Antoine de Saint-Exupéry"), "antoinedesaint-exupéry");

// 2. Book input validation
const validBook = policy.validateBookInput({
  title: "  어린 왕자  ",
  author: " 생텍쥐페리 ",
  status: "reading",
});
assert.strictEqual(validBook.valid, true);
assert.strictEqual(validBook.title, "어린 왕자");
assert.strictEqual(validBook.author, "생텍쥐페리");
assert.strictEqual(validBook.normalizedTitle, "어린왕자");
assert.strictEqual(validBook.normalizedAuthor, "생텍쥐페리");

const invalidTitle = policy.validateBookInput({ title: "", author: "저자" });
assert.strictEqual(invalidTitle.valid, false);
assert.strictEqual(invalidTitle.error, policy.ERROR_CODES.INVALID_BOOK_TITLE);

const invalidAuthor = policy.validateBookInput({ title: "책", author: "" });
assert.strictEqual(invalidAuthor.valid, false);
assert.strictEqual(invalidAuthor.error, policy.ERROR_CODES.INVALID_BOOK_AUTHOR);

const invalidStatus = policy.validateBookInput({ title: "책", author: "저자", status: "invalid_status" });
assert.strictEqual(invalidStatus.valid, false);
assert.strictEqual(invalidStatus.error, policy.ERROR_CODES.INVALID_BOOK_STATUS);
assert.strictEqual(policy.validateBookInput({ title: "가".repeat(201), author: "저자" }).valid, false);
assert.strictEqual(policy.validateBookInput({ title: "책", author: "가".repeat(121) }).valid, false);

// 3. Page validation
assert.strictEqual(policy.validatePage(1).valid, true);
assert.strictEqual(policy.validatePage(99999).valid, true);
assert.strictEqual(policy.validatePage(0).valid, false);
assert.strictEqual(policy.validatePage(-5).valid, false);
assert.strictEqual(policy.validatePage(100000).valid, false);
assert.strictEqual(policy.validatePage("abc").valid, false);
assert.strictEqual(policy.validatePage(12.5).valid, false);

// 4. Deterministic IDs
const assignId = policy.getDeterministicAssignmentId("user_123", "2026-08-16");
assert.strictEqual(assignId, "classic__user_123__2026-08-16");

const logId = policy.getDeterministicAssignmentLogId(assignId);
assert.strictEqual(logId, "assignment__classic__user_123__2026-08-16");

const cmdDocId = policy.getCommandDocId("user_123", "cmd_abc");
assert.strictEqual(cmdDocId, "user_123__cmd_abc");

// 5. Payload hash determinism
const hash1 = policy.hashPayload({ a: 1, b: "test" });
const hash2 = policy.hashPayload({ b: "test", a: 1 });
assert.strictEqual(hash1, hash2);
const nestedHash1 = policy.hashPayload({ links: [{ title: "자료", url: "https://example.com/a" }], reading: { page: 10 } });
const nestedHash2 = policy.hashPayload({ reading: { page: 10 }, links: [{ url: "https://example.com/a", title: "자료" }] });
const nestedHash3 = policy.hashPayload({ links: [{ title: "자료", url: "https://example.com/b" }], reading: { page: 10 } });
assert.strictEqual(nestedHash1, nestedHash2, "Nested object key order must not change the hash");
assert.notStrictEqual(nestedHash1, nestedHash3, "Nested payload changes must change the hash");

assert.strictEqual(policy.validateDateString("2026-02-28"), true);
assert.strictEqual(policy.validateDateString("2026-02-30"), false);
assert.strictEqual(policy.validateClockTime("23:59"), true);
assert.strictEqual(policy.validateClockTime("24:00"), false);

// 6. Incremental and recomputed progress calculation
const mockLogs = [
  { id: "log_1", eventType: "progress", page: 30, readAt: new Date("2026-08-14T10:00:00+09:00") },
  { id: "log_2", eventType: "progress", page: 120, readAt: new Date("2026-08-15T10:00:00+09:00") },
  { id: "log_3", eventType: "progress", page: 80, readAt: new Date("2026-08-16T10:00:00+09:00") }, // read page 80 after 120 (e.g. re-reading or retroactive)
];

const progress = policy.calculateReadingBookProgressFromLogs(mockLogs);
assert.strictEqual(progress.latestReadPage, 80, "Latest page should be from latest log (log_3)");
assert.strictEqual(progress.furthestPage, 120, "Furthest page should be max page (log_2)");
assert.strictEqual(progress.latestLogId, "log_3");

// Test with voided log
const mockLogsWithVoided = [
  ...mockLogs,
  { id: "log_4", eventType: "progress", page: 200, readAt: new Date("2026-08-17T10:00:00+09:00"), voidedAt: new Date() },
];
const progressAfterVoid = policy.calculateReadingBookProgressFromLogs(mockLogsWithVoided);
assert.strictEqual(progressAfterVoid.latestReadPage, 80, "Voided log should not count");
assert.strictEqual(progressAfterVoid.furthestPage, 120);

// Test secondary tie breaker when readAt is equal
const tiedLogs = [
  { id: "log_a", eventType: "progress", page: 50, readAt: new Date("2026-08-16T10:00:00+09:00") },
  { id: "log_b", eventType: "progress", page: 55, readAt: new Date("2026-08-16T10:00:00+09:00") },
];
const tiedProgress = policy.calculateReadingBookProgressFromLogs(tiedLogs);
assert.strictEqual(tiedProgress.latestLogId, "log_b", "Should pick log_b as it comes higher alphabetically desc");
const incrementalTie = policy.calculateIncrementalProgress({
  latestReadPage: 50,
  furthestPage: 50,
  latestReadAt: tiedLogs[0].readAt,
  latestLogId: "log_b",
}, { id: "log_a", page: 99, readAt: tiedLogs[0].readAt });
assert.strictEqual(incrementalTie.latestLogId, "log_b", "Incremental tie-break must match full recomputation");
assert.strictEqual(incrementalTie.latestReadPage, 50);
assert.strictEqual(incrementalTie.furthestPage, 99);

// 7. Status transitions
assert.strictEqual(policy.validateStatusTransition("want_to_read", "reading").allowed, true);
assert.strictEqual(policy.validateStatusTransition("want_to_read", "completed").allowed, true);
assert.strictEqual(policy.validateStatusTransition("want_to_read", "paused").allowed, true);
assert.strictEqual(policy.validateStatusTransition("reading", "want_to_read").allowed, true);
assert.strictEqual(policy.validateStatusTransition("reading", "completed").allowed, true);
assert.strictEqual(policy.validateStatusTransition("reading", "paused").allowed, true);
assert.strictEqual(policy.validateStatusTransition("paused", "reading").allowed, true);
assert.strictEqual(policy.validateStatusTransition("completed", "reading").allowed, true);
assert.strictEqual(policy.validateStatusTransition("reading", "invalid").allowed, false);

// 8. 30-day recorded gap eligibility
assert.strictEqual(policy.isReadingLogEligibleForDayCredit({
  readDateKst: "2026-08-01",
  recordedAt: new Date("2026-08-15T10:00:00+09:00") // 14 days later
}), true);
assert.strictEqual(policy.isReadingLogEligibleForDayCredit({
  readDateKst: "2026-08-01",
  recordedAt: new Date("2026-08-31T10:00:00+09:00") // 30 days later
}), true);
assert.strictEqual(policy.isReadingLogEligibleForDayCredit({
  readDateKst: "2026-08-01",
  recordedAt: new Date("2026-09-02T10:00:00+09:00") // 32 days later
}), false);
assert.strictEqual(policy.isReadingLogEligibleForDayCredit({
  readDateKst: "2026-08-20",
  recordedAt: new Date("2026-08-10T10:00:00+09:00") // recorded before reading date
}), false);
assert.strictEqual(policy.isReadingLogEligibleForDayCredit({
  readDateKst: "2026-08-20",
  recordedAt: "invalid-timestamp"
}), false);

// 9. Streak calculation with backdated entries
const streakDates = ["2026-08-01", "2026-08-02", "2026-08-03", "2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08"];
const streakResult = policy.calculateStreaks(streakDates, "2026-08-08");
assert.strictEqual(streakResult.totalReadingDays, 7);
assert.strictEqual(streakResult.longestReadingStreak, 4); // Aug 5 to Aug 8
assert.strictEqual(streakResult.currentReadingStreak, 4);

// If user logs yesterday instead of today
const streakResultYesterday = policy.calculateStreaks(streakDates, "2026-08-09");
assert.strictEqual(streakResultYesterday.currentReadingStreak, 4); // Still active from yesterday

// 10. Completion eligibility
const eligibleBookWithAssignments = {
  status: "completed",
  totalPages: 300,
  progress: { furthestPage: 300 },
  achievementStats: { reviewedAssignmentCount: 1, validReadingDayCount: 1 }
};
assert.strictEqual(policy.isBookEligibleForCompletion(eligibleBookWithAssignments), true);

const eligibleBookWithReadingDays = {
  status: "completed",
  totalPages: 250,
  progress: { furthestPage: 250 },
  achievementStats: { reviewedAssignmentCount: 0, validReadingDayCount: 2 }
};
assert.strictEqual(policy.isBookEligibleForCompletion(eligibleBookWithReadingDays), true);

const incompletePagesBook = {
  status: "completed",
  totalPages: 300,
  progress: { furthestPage: 200 },
  achievementStats: { reviewedAssignmentCount: 1 }
};
assert.strictEqual(policy.isBookEligibleForCompletion(incompletePagesBook), false);

const notCompletedStatusBook = {
  status: "reading",
  totalPages: 300,
  progress: { furthestPage: 300 },
  achievementStats: { reviewedAssignmentCount: 2 }
};
assert.strictEqual(policy.isBookEligibleForCompletion(notCompletedStatusBook), false);

// 11. Reading-day history queries must use the automatically indexed date field.
// Ordering only by a descending document ID requires a separate Firestore index and
// caused western-classic assignment submissions to fail with FAILED_PRECONDITION.
const classicReadingSource = fs.readFileSync(path.join(__dirname, "classicReading.js"), "utf8");
const readingDayCreditQueries = classicReadingSource.match(
  /collection\("readingDayCredits"\)\s*\.orderBy\("dateKey", "desc"\)/g
) || [];
assert.strictEqual(readingDayCreditQueries.length, 2, "Both reading-day history queries must sort by dateKey");
assert.strictEqual(
  /collection\("readingDayCredits"\)\s*\.orderBy\(admin\.firestore\.FieldPath\.documentId\(\), "desc"\)/.test(classicReadingSource),
  false,
  "Reading-day history must not require a descending document-ID index"
);

// 12. Archiving is a book-level state change. It must not fan out writes to
// every reading log or clear genuinely voided correction history on restore.
assert.strictEqual(
  classicReadingSource.includes("linkedLogsSnap"),
  false,
  "Archive/restore must not read and rewrite every linked reading log"
);
const unarchiveSection = classicReadingSource.match(
  /const unarchiveReadingBook[\s\S]*?\/\*\*\s*\n\s*\* 4-1\./
)?.[0] || "";
assert.ok(
  unarchiveSection.includes("reconcileReadingBookCredit"),
  "Restoring an eligible completed book must reconcile completion credit"
);

console.log("All classicReadingPolicy unit tests passed successfully!");
