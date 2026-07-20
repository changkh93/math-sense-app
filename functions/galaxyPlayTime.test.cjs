const assert = require('node:assert/strict');

const {
  COOLDOWN_SECONDS,
  RESUME_GRACE_SECONDS,
  buildAccessView,
  calculateChargedSeconds,
  calculateHardEndsAtMs,
  getKstDayWindow,
  getRuntimeNaturalEnd,
  isValidDayKey,
  normalizePolicy,
} = require('./galaxyPlayTime').__test;

const NOW_MS = Date.parse('2026-07-20T10:00:00.000Z');

function testPolicyLimits() {
  assert.deepEqual(normalizePolicy({}), {
    version: 1,
    dailyLimitMinutes: 30,
    sessionLimitMinutes: 15,
    dailyLimitSeconds: 1800,
    sessionLimitSeconds: 900,
    cooldownSeconds: 1200,
  });
  assert.equal(normalizePolicy({ dailyLimitMinutes: 60, sessionLimitMinutes: 20 }).dailyLimitSeconds, 3600);
  assert.equal(normalizePolicy({ dailyLimitMinutes: 999, sessionLimitMinutes: 999 }).sessionLimitMinutes, 15);
  assert.equal(COOLDOWN_SECONDS, 1200);
  assert.equal(RESUME_GRACE_SECONDS, 120);
}

function testKstBoundaryAndHardEnd() {
  const beforeMidnight = Date.parse('2026-07-20T14:59:50.000Z');
  const atMidnight = Date.parse('2026-07-20T15:00:00.000Z');
  assert.deepEqual(getKstDayWindow(beforeMidnight), {
    dayKey: '2026-07-20',
    nextMidnightMs: atMidnight,
  });
  assert.equal(calculateHardEndsAtMs({
    startedAtMs: beforeMidnight,
    sessionLimitSeconds: 900,
    dailyRemainingSeconds: 1800,
    nextMidnightMs: atMidnight,
  }), atMidnight);

  assert.equal(calculateHardEndsAtMs({
    startedAtMs: NOW_MS,
    sessionLimitSeconds: 1200,
    dailyRemainingSeconds: 180,
    nextMidnightMs: getKstDayWindow(NOW_MS).nextMidnightMs,
  }), NOW_MS + 180_000);
}

function testElapsedChargingAndNaturalEnd() {
  assert.equal(calculateChargedSeconds(NOW_MS, NOW_MS + 1), 1);
  assert.equal(calculateChargedSeconds(NOW_MS, NOW_MS + 60_000), 60);
  assert.equal(calculateChargedSeconds(NOW_MS, NOW_MS - 10_000), 0);

  const runtime = {
    status: 'active',
    sessionId: 'session-1',
    startedAtMs: NOW_MS,
    hardEndsAtMs: NOW_MS + 15 * 60_000,
    midnightEndsAtMs: NOW_MS + 10 * 60_000,
    leaseExpiresAtMs: NOW_MS + 120_000,
  };
  assert.equal(getRuntimeNaturalEnd(runtime, NOW_MS + 119_999), null);
  assert.deepEqual(getRuntimeNaturalEnd(runtime, NOW_MS + 120_000), {
    endedAtMs: NOW_MS + 120_000,
    reason: 'connection_timeout',
  });
  assert.deepEqual(getRuntimeNaturalEnd({ ...runtime, hardEndsAtMs: NOW_MS + 60_000, midnightEndsAtMs: NOW_MS + 60_000 }, NOW_MS + 60_000), {
    endedAtMs: NOW_MS + 60_000,
    reason: 'kst_midnight',
  });
}

function testAccessIncludesCurrentSessionElapsed() {
  const access = buildAccessView({
    policy: { dailyLimitMinutes: 30, sessionLimitMinutes: 15 },
    daily: { usedSeconds: 600, sessionCount: 2, longestSessionSeconds: 420 },
    runtime: {
      status: 'active',
      sessionId: 'session-2',
      dayKey: getKstDayWindow(NOW_MS).dayKey,
      startedAtMs: NOW_MS - 300_000,
      hardEndsAtMs: NOW_MS + 600_000,
      leaseExpiresAtMs: NOW_MS + 120_000,
      clientInstanceId: 'tab-1',
    },
    nowMs: NOW_MS,
  });
  assert.equal(access.daily.usedSeconds, 900);
  assert.equal(access.daily.remainingSeconds, 900);
  assert.equal(access.daily.longestSessionSeconds, 420);
  assert.equal(access.canStart, false);
  assert.equal(access.blockedReason, 'active_session');

  const cooldown = buildAccessView({
    policy: {},
    daily: {},
    runtime: { status: 'cooldown', nextAllowedAtMs: NOW_MS + 60_000 },
    nowMs: NOW_MS,
  });
  assert.equal(cooldown.canStart, false);
  assert.equal(cooldown.blockedReason, 'cooldown');
}

function testDayValidation() {
  assert.equal(isValidDayKey('2026-07-20'), true);
  assert.equal(isValidDayKey('2026-02-29'), false);
  assert.equal(isValidDayKey('not-a-day'), false);
}

function run() {
  testPolicyLimits();
  testKstBoundaryAndHardEnd();
  testElapsedChargingAndNaturalEnd();
  testAccessIncludesCurrentSessionElapsed();
  testDayValidation();
  console.log('Galaxy play-time policy tests passed.');
}

run();
