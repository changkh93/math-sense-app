const test = require("node:test");
const assert = require("node:assert/strict");
const {
  processGuestHeartbeat,
  isCrewGrowthGuestEligibleV2,
  isMemberEligibleForCrewGrowth,
  calculateTierRewardAmount,
  evaluateTierState,
  GUEST_MIN_SESSION_GAP_MS,
  MEMBER_MIN_TENURE_MS,
} = require("./crewGrowthEventPolicy.cjs");

test("duplicate heartbeat and foreground resume cannot credit unobserved time", () => {
  const start = 1000000;
  const initial = processGuestHeartbeat({ nowMs: start, heartbeatId: 'one' }).nextAccount;
  const duplicate = processGuestHeartbeat({ existingAccount: initial, nowMs: start + 60000, heartbeatId: 'one' });
  assert.equal(duplicate.creditedSec, 0);
  const pause = processGuestHeartbeat({ existingAccount: initial, nowMs: start + 10000, isFocused: false });
  const resume = processGuestHeartbeat({ existingAccount: pause.nextAccount, nowMs: start + 60000 });
  assert.equal(resume.creditedSec, 0);
});

test("Guest heartbeat: first call initializes session with 0 credit", () => {
  const now = 1000000;
  const result = processGuestHeartbeat({
    existingAccount: {},
    nowMs: now,
    isVisible: true,
    isFocused: true,
  });

  assert.equal(result.creditedSec, 0);
  assert.equal(result.nextAccount.activeSecondsTotal, 0);
  assert.equal(result.isEligible, false);
  assert.equal(result.nextAccount.currentSession.startedAtMs, now);
});

test("Guest heartbeat: credit contiguous foreground ticks but not idle gaps", () => {
  const start = 1000000;
  // First call
  const step1 = processGuestHeartbeat({
    existingAccount: {},
    nowMs: start,
  });

  // Second call after 45 seconds
  const step2 = processGuestHeartbeat({
    existingAccount: step1.nextAccount,
    nowMs: start + 45000,
    isVisible: true,
    isFocused: true,
  });
  assert.equal(step2.creditedSec, 45);
  assert.equal(step2.nextAccount.activeSecondsTotal, 45);
  assert.equal(step2.nextAccount.currentSession.activeSeconds, 45);

  // A 120-second gap is unobserved time, not foreground credit.
  const step3 = processGuestHeartbeat({
    existingAccount: step2.nextAccount,
    nowMs: start + 45000 + 120000,
    isVisible: true,
    isFocused: true,
  });
  assert.equal(step3.creditedSec, 0);
  assert.equal(step3.nextAccount.activeSecondsTotal, 45);
});

test("Guest heartbeat: background tab or too rapid call receives 0 credit", () => {
  const start = 1000000;
  const step1 = processGuestHeartbeat({ existingAccount: {}, nowMs: start });

  // Rapid call (<15s)
  const rapid = processGuestHeartbeat({
    existingAccount: step1.nextAccount,
    nowMs: start + 5000,
    isVisible: true,
    isFocused: true,
  });
  assert.equal(rapid.creditedSec, 0);

  // Background call (isVisible = false) after 45s
  const bg = processGuestHeartbeat({
    existingAccount: step1.nextAccount,
    nowMs: start + 45000,
    isVisible: false,
    isFocused: true,
  });
  assert.equal(bg.creditedSec, 0);
  assert.equal(bg.nextAccount.activeSecondsTotal, 0);
});

test("Guest qualification: requires 2 distinct sessions of >=180s each with gap >=30m AND total >=600s", () => {
  const t0 = 1000000;

  // Session 1 start
  let account = processGuestHeartbeat({ existingAccount: {}, nowMs: t0 }).nextAccount;

  // Session 1: accumulate 200 seconds (4 calls of 50s)
  for (let i = 1; i <= 4; i++) {
    account = processGuestHeartbeat({
      existingAccount: account,
      nowMs: t0 + i * 50000,
    }).nextAccount;
  }
  assert.equal(account.currentSession.activeSeconds, 200);
  assert.equal(account.currentSession.qualified, true);
  assert.equal(account.activeSecondsTotal, 200);
  assert.equal(isCrewGrowthGuestEligibleV2(account), false); // only 1 session, total < 600

  // Gap of 35 minutes -> starts session 2
  const t1 = t0 + 200000 + (35 * 60 * 1000);
  account = processGuestHeartbeat({ existingAccount: account, nowMs: t1 }).nextAccount;
  assert.equal(account.qualifiedSessionCount, 1); // previous session banked
  assert.equal(account.currentSession.activeSeconds, 0);

  // Session 2: accumulate 200 seconds (4 calls of 50s)
  for (let i = 1; i <= 4; i++) {
    account = processGuestHeartbeat({
      existingAccount: account,
      nowMs: t1 + i * 50000,
    }).nextAccount;
  }
  assert.equal(account.currentSession.activeSeconds, 200);
  assert.equal(account.currentSession.qualified, true);
  assert.equal(account.activeSecondsTotal, 400);
  // 2 qualified sessions completed/active, but total is 400s (< 600s)
  assert.equal(isCrewGrowthGuestEligibleV2(account), false);

  // Gap of 35 minutes -> starts session 3
  const t2 = t1 + 200000 + (35 * 60 * 1000);
  account = processGuestHeartbeat({ existingAccount: account, nowMs: t2 }).nextAccount;
  assert.equal(account.qualifiedSessionCount, 2);

  // Session 3: accumulate 250 seconds -> total will be 650s
  for (let i = 1; i <= 5; i++) {
    account = processGuestHeartbeat({
      existingAccount: account,
      nowMs: t2 + i * 50000,
    }).nextAccount;
  }
  assert.equal(account.activeSecondsTotal, 650);
  // Now qualified sessions >= 2 and total >= 600s
  assert.equal(isCrewGrowthGuestEligibleV2(account), true);
});

test("isMemberEligibleForCrewGrowth checks originCrewId and 48h tenure", () => {
  const now = 2000000000;
  const crewId = "crew_alpha";

  // Active and > 48h tenure
  assert.equal(isMemberEligibleForCrewGrowth({
    status: "active",
    originCrewId: crewId,
    boundAtMs: now - (50 * 60 * 60 * 1000),
  }, crewId, now), true);

  // Less than 48h tenure
  assert.equal(isMemberEligibleForCrewGrowth({
    status: "active",
    originCrewId: crewId,
    boundAtMs: now - (20 * 60 * 60 * 1000),
  }, crewId, now), false);

  // Wrong crew
  assert.equal(isMemberEligibleForCrewGrowth({
    status: "active",
    originCrewId: "crew_beta",
    boundAtMs: now - (50 * 60 * 60 * 1000),
  }, crewId, now), false);

  // Forfeited status
  assert.equal(isMemberEligibleForCrewGrowth({
    status: "forfeited",
    originCrewId: crewId,
    boundAtMs: now - (50 * 60 * 60 * 1000),
  }, crewId, now), false);
});

test("calculateTierRewardAmount: idempotent tier payout without retroactive catchup", () => {
  // Tier 1 payout
  assert.equal(calculateTierRewardAmount("t20", { hasTierClaim: false }), 1000);
  assert.equal(calculateTierRewardAmount("t20", { hasTierClaim: true }), 0);

  // Tier 2 payout: always 4000 (no +1000 retroactive)
  assert.equal(calculateTierRewardAmount("t40", { hasTierClaim: false }), 4000);
  assert.equal(calculateTierRewardAmount("t40", { hasTierClaim: true }), 0);
});

test("evaluateTierState: handles transition between collecting and verifying", () => {
  const now = 1000000;

  // Collecting below target
  const s1 = evaluateTierState({ tierId: "t20", currentTierState: { status: "collecting" }, eligibleCount: 15, nowMs: now });
  assert.equal(s1.status, "collecting");
  assert.equal(s1.shouldStartVerification, false);

  // Reaches target 20 -> starts verification for 48h
  const s2 = evaluateTierState({ tierId: "t20", currentTierState: { status: "collecting" }, eligibleCount: 20, nowMs: now });
  assert.equal(s2.status, "verifying");
  assert.equal(s2.shouldStartVerification, true);
  assert.equal(s2.verificationEndsAtMs, now + (48 * 60 * 60 * 1000));

  // Drop below target during verification -> resets to collecting
  const s3 = evaluateTierState({ tierId: "t20", currentTierState: { status: "verifying", verificationEndsAtMs: now + 10000 }, eligibleCount: 19, nowMs: now });
  assert.equal(s3.status, "collecting");
  assert.equal(s3.shouldReset, true);
});
