import assert from 'assert';
import { buildReadingBadges } from '../src/utils/readingBadgeUtils.js';
import policy from '../functions/classicReadingPolicy.js';

console.log('=== Running Reading Badges & Policy Tests ===');

// 1. Initial / Empty User Profile
const initialBadges = buildReadingBadges({});
assert.strictEqual(initialBadges.length, 12, 'Must provide exactly 12 reading badges');
assert.strictEqual(initialBadges.every((b) => b.unlocked === false), true, 'All badges must be locked for empty user');

// 2. Reading Day Milestones
const oneDayBadges = buildReadingBadges({
  readingStats: { readingDayCount: 1 }
});
assert.strictEqual(oneDayBadges.find((b) => b.id === 'first_bookmark').unlocked, true);
assert.strictEqual(oneDayBadges.find((b) => b.id === 'weekly_reading_voyager').unlocked, false);

const sevenDaysBadges = buildReadingBadges({
  readingStats: { readingDayCount: 7 }
});
assert.strictEqual(sevenDaysBadges.find((b) => b.id === 'weekly_reading_voyager').unlocked, true);
assert.strictEqual(sevenDaysBadges.find((b) => b.id === 'moonlight_reader').unlocked, false);

const thirtyDaysBadges = buildReadingBadges({
  readingStats: { readingDayCount: 30 }
});
assert.strictEqual(thirtyDaysBadges.find((b) => b.id === 'moonlight_reader').unlocked, true);
assert.strictEqual(thirtyDaysBadges.find((b) => b.id === 'hundred_reading_days').unlocked, false);

const hundredDaysBadges = buildReadingBadges({
  readingStats: { readingDayCount: 100 }
});
assert.strictEqual(hundredDaysBadges.find((b) => b.id === 'hundred_reading_days').unlocked, true);

// 3. Streak Milestones
const streakBadges = buildReadingBadges({
  readingStats: { longestReadingStreak: 7 }
});
assert.strictEqual(streakBadges.find((b) => b.id === 'unfading_reading_lamp').unlocked, true);
assert.strictEqual(streakBadges.find((b) => b.id === 'galactic_reading_habit').unlocked, false);

const streak30Badges = buildReadingBadges({
  readingStats: { longestReadingStreak: 30 }
});
assert.strictEqual(streak30Badges.find((b) => b.id === 'galactic_reading_habit').unlocked, true);

// 4. Reviewed Assignment Milestones
const assign1Badges = buildReadingBadges({
  readingStats: { reviewedAssignmentCount: 1 }
});
assert.strictEqual(assign1Badges.find((b) => b.id === 'first_reading_logbook').unlocked, true);
assert.strictEqual(assign1Badges.find((b) => b.id === 'reflective_chronicler').unlocked, false);

const assign10Badges = buildReadingBadges({
  readingStats: { reviewedAssignmentCount: 10 }
});
assert.strictEqual(assign10Badges.find((b) => b.id === 'reflective_chronicler').unlocked, true);

// 5. Valid Completed Book Milestones
const book1Badges = buildReadingBadges({
  readingStats: { validCompletedBookCount: 1 }
});
assert.strictEqual(book1Badges.find((b) => b.id === 'one_book_universe').unlocked, true);
assert.strictEqual(book1Badges.find((b) => b.id === 'classic_bookshelf_keeper').unlocked, false);

const book5Badges = buildReadingBadges({
  readingStats: { validCompletedBookCount: 5 }
});
assert.strictEqual(book5Badges.find((b) => b.id === 'classic_bookshelf_keeper').unlocked, true);
assert.strictEqual(book5Badges.find((b) => b.id === 'library_of_stars').unlocked, false);

const book12Badges = buildReadingBadges({
  readingStats: { validCompletedBookCount: 12 }
});
assert.strictEqual(book12Badges.find((b) => b.id === 'library_of_stars').unlocked, true);

// 6. Galactic Archivist Composite Milestone
const archivistPartial = buildReadingBadges({
  readingStats: {
    readingDayCount: 100,
    validCompletedBookCount: 12,
    reviewedAssignmentCount: 29 // 1 short
  }
});
assert.strictEqual(archivistPartial.find((b) => b.id === 'galactic_archivist').unlocked, false);

const archivistComplete = buildReadingBadges({
  readingStats: {
    readingDayCount: 100,
    validCompletedBookCount: 12,
    reviewedAssignmentCount: 30
  }
});
assert.strictEqual(archivistComplete.find((b) => b.id === 'galactic_archivist').unlocked, true);
assert.strictEqual(archivistComplete.find((b) => b.id === 'galactic_archivist').requirements.length, 3);
assert.strictEqual(archivistComplete.find((b) => b.id === 'galactic_archivist').requirements.every((r) => r.completed), true);

// 7. Policy verification: 30-day recorded gap policy
assert.strictEqual(
  policy.isReadingLogEligibleForDayCredit({
    readDateKst: '2026-08-01',
    recordedAt: '2026-08-10T10:00:00+09:00',
  }),
  true,
  'Recorded 9 days later is within 30 days and valid'
);

assert.strictEqual(
  policy.isReadingLogEligibleForDayCredit({
    readDateKst: '2026-08-01',
    recordedAt: '2026-09-05T10:00:00+09:00',
  }),
  false,
  'Recorded 35 days later exceeds 30-day gap and is invalid'
);

// 8. Policy verification: streak calculation
const dates = ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-10', '2026-08-11'];
const streaks = policy.calculateStreaks(dates, '2026-08-11');
assert.strictEqual(streaks.totalReadingDays, 5);
assert.strictEqual(streaks.longestReadingStreak, 3);
assert.strictEqual(streaks.currentReadingStreak, 2);

// 9. Policy verification: book completion
assert.strictEqual(
  policy.isBookEligibleForCompletion({
    status: 'completed',
    totalPages: 200,
    progress: { furthestPage: 200 },
    achievementStats: { validReadingDayCount: 2, reviewedAssignmentCount: 0 }
  }),
  true
);

assert.strictEqual(
  policy.isBookEligibleForCompletion({
    status: 'completed',
    totalPages: 200,
    progress: { furthestPage: 200 },
    achievementStats: { validReadingDayCount: 1, reviewedAssignmentCount: 0 }
  }),
  false,
  'Must have at least 2 reading days if no reviewed assignment'
);

console.log('All Reading Badges & Policy tests passed successfully! ✅');
