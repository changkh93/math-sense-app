// @ts-check
"use strict";

const CAMPAIGN_ID = "crew_growth_v2_2026";
const TARGET_T1 = 20;
const REWARD_T1 = 1000;
const TARGET_T2 = 40;
const REWARD_T2 = 4000;

const MEMBER_MIN_TENURE_MS = 48 * 60 * 60 * 1000; // 48시간
const VERIFICATION_HOLD_MS = 48 * 60 * 60 * 1000; // 48시간

const GUEST_MIN_SESSIONS = 2;
const GUEST_MIN_SESSION_ACTIVE_SEC = 180; // 3분
const GUEST_MIN_SESSION_GAP_MS = 30 * 60 * 1000; // 30분
const GUEST_MIN_TOTAL_ACTIVE_SEC = 600; // 10분

const HEARTBEAT_INTERVAL_SEC = 60;
const HEARTBEAT_MAX_CREDIT_SEC = 75; // 75초 상한
const HEARTBEAT_MIN_INTERVAL_MS = 15000; // 15초 최소 간격

const TIERS = {
  t20: {
    id: "t20",
    target: TARGET_T1,
    reward: REWARD_T1,
    label: "CREW 20",
  },
  t40: {
    id: "t40",
    target: TARGET_T2,
    reward: REWARD_T2,
    label: "CREW 40",
  },
};

/**
 * 게스트의 총 유효 세션 수 계산 (완료된 세션 + 현재 활성 세션의 유효 여부)
 */
function getGuestQualifiedSessionCount(record = {}) {
  const completedCount = Math.max(0, Number(record.qualifiedSessionCount || 0));
  const currentSession = record.currentSession || {};
  const isCurrentQualified = currentSession.qualified === true ||
    Number(currentSession.activeSeconds || 0) >= GUEST_MIN_SESSION_ACTIVE_SEC;
  return completedCount + (isCurrentQualified ? 1 : 0);
}

/**
 * 게스트의 V2 이벤트 자격 충족 여부 판정
 */
function isCrewGrowthGuestEligibleV2(record = {}) {
  const status = record.status || "active";
  const reviewStatus = record.eventReviewStatus || "clear";
  if (["deleted", "suspended"].includes(status) || reviewStatus !== "clear") {
    return false;
  }
  if (record.isDuplicateDevice === true) {
    return false;
  }
  const sessionCount = getGuestQualifiedSessionCount(record);
  const totalActiveSec = Math.max(0, Number(record.activeSecondsTotal || 0));
  return sessionCount >= GUEST_MIN_SESSIONS && totalActiveSec >= GUEST_MIN_TOTAL_ACTIVE_SEC;
}

/**
 * 게스트 하트비트 처리 및 세션 갱신 (순수 상태 전이 함수)
 */
function processGuestHeartbeat({
  existingAccount = {},
  nowMs = Date.now(),
  isVisible = true,
  isFocused = true,
  heartbeatId = "",
}) {
  const prevEligible = isCrewGrowthGuestEligibleV2(existingAccount);
  const prevActiveTotal = Math.max(0, Number(existingAccount.activeSecondsTotal || 0));
  let completedQualifiedCount = Math.max(0, Number(existingAccount.qualifiedSessionCount || 0));
  let recentQualifiedSessions = Array.isArray(existingAccount.recentQualifiedSessions)
    ? [...existingAccount.recentQualifiedSessions]
    : [];

  let current = existingAccount.currentSession && typeof existingAccount.currentSession === "object"
    ? { ...existingAccount.currentSession }
    : null;

  let activeSecondsTotal = prevActiveTotal;
  let creditedSec = 0;

  const isForeground = Boolean(isVisible && isFocused);

  if ((heartbeatId && heartbeatId === existingAccount.lastHeartbeatId) || nowMs <= Number(existingAccount.lastSeenAtMs || 0)) {
    return { nextAccount: existingAccount, creditedSec: 0, becameEligible: false,
      isEligible: prevEligible, qualifiedSessionCount: getGuestQualifiedSessionCount(existingAccount) };
  }
  if (!isForeground) {
    return { nextAccount: { ...existingAccount, heartbeatForeground: false, lastSeenAtMs: nowMs,
      lastHeartbeatId: heartbeatId }, creditedSec: 0, becameEligible: false,
      isEligible: prevEligible, qualifiedSessionCount: getGuestQualifiedSessionCount(existingAccount) };
  }

  if (!current || !current.startedAtMs) {
    // 최초 세션 개설: 첫 heartbeat는 세션 시작 시각만 마킹하고 시간 적립 0
    current = {
      sessionId: `sess_${nowMs}_${Math.random().toString(36).slice(2, 7)}`,
      startedAtMs: nowMs,
      lastCreditedAtMs: nowMs,
      activeSeconds: 0,
      qualified: false,
    };
  } else {
    const gapSinceLastCredit = nowMs - Number(current.lastCreditedAtMs || current.startedAtMs || nowMs);

    if (gapSinceLastCredit >= GUEST_MIN_SESSION_GAP_MS) {
      // 30분 이상 공백: 이전 세션 종료 후 새 세션 시작
      if (current.activeSeconds >= GUEST_MIN_SESSION_ACTIVE_SEC) {
        completedQualifiedCount += 1;
        recentQualifiedSessions.push({
          sessionId: current.sessionId,
          startedAtMs: current.startedAtMs,
          endedAtMs: current.lastCreditedAtMs,
          activeSeconds: current.activeSeconds,
        });
        if (recentQualifiedSessions.length > 4) {
          recentQualifiedSessions = recentQualifiedSessions.slice(-4);
        }
      }

      current = {
        sessionId: `sess_${nowMs}_${Math.random().toString(36).slice(2, 7)}`,
        startedAtMs: nowMs,
        lastCreditedAtMs: nowMs,
        activeSeconds: 0,
        qualified: false,
      };
    } else if (gapSinceLastCredit >= HEARTBEAT_MIN_INTERVAL_MS) {
      // 15초 이상 정상 주기 도래
      if (isForeground && existingAccount.heartbeatForeground !== false && gapSinceLastCredit <= HEARTBEAT_MAX_CREDIT_SEC * 1000) {
        creditedSec = Math.min(HEARTBEAT_MAX_CREDIT_SEC, Math.max(0, Math.floor(gapSinceLastCredit / 1000)));
        current.activeSeconds = Math.max(0, Number(current.activeSeconds || 0)) + creditedSec;
        activeSecondsTotal += creditedSec;
        if (!current.qualified && current.activeSeconds >= GUEST_MIN_SESSION_ACTIVE_SEC) {
          current.qualified = true;
        }
      }
      current.lastCreditedAtMs = nowMs;
    } else {
      // 15초 미만의 너무 빠른 중복 호출은 시간 적립 없이 무시
      creditedSec = 0;
    }
  }

  const nextAccount = {
    ...existingAccount,
    campaignId: CAMPAIGN_ID,
    heartbeatForeground: isForeground,
    activeSecondsTotal,
    qualifiedSessionCount: completedQualifiedCount,
    recentQualifiedSessions,
    currentSession: current,
    lastSeenAtMs: nowMs,
    lastHeartbeatId: heartbeatId || existingAccount.lastHeartbeatId || "",
  };

  const nextEligible = isCrewGrowthGuestEligibleV2(nextAccount);
  if (!prevEligible && nextEligible && !nextAccount.eligibleAtMs) {
    nextAccount.eligibleAtMs = nowMs;
  }

  return {
    nextAccount,
    creditedSec,
    becameEligible: !prevEligible && nextEligible,
    isEligible: nextEligible,
    qualifiedSessionCount: completedQualifiedCount + (current.qualified ? 1 : 0),
  };
}

/**
 * 크루 정회원의 전역 참가자 잠금 자격 판정
 */
function isMemberEligibleForCrewGrowth(lockRecord = {}, crewId = "", nowMs = Date.now()) {
  if (!lockRecord || lockRecord.status !== "active") {
    return false;
  }
  if (lockRecord.originCrewId !== crewId) {
    return false;
  }
  const boundAtMs = Number(lockRecord.boundAtMs || 0);
  if (!boundAtMs || nowMs - boundAtMs < MEMBER_MIN_TENURE_MS) {
    // 48시간 이상 가입 유지 필요
    return false;
  }
  return true;
}

/**
 * Tier별 보상액 계산 (멱등성: Tier 1은 1000, Tier 2는 4000, 소급 없음)
 */
function calculateTierRewardAmount(tierId, { hasTierClaim = false } = {}) {
  if (hasTierClaim) return 0;
  if (tierId === "t20") return REWARD_T1;
  if (tierId === "t40") return REWARD_T2;
  return 0;
}

/**
 * Tier 상태 전이 및 초기화 판정
 */
function evaluateTierState({
  tierId = "t20",
  currentTierState = {},
  eligibleCount = 0,
  nowMs = Date.now(),
}) {
  const target = TIERS[tierId]?.target || (tierId === "t40" ? TARGET_T2 : TARGET_T1);
  const status = currentTierState.status || "collecting";

  if (status === "rewarded") {
    return {
      status: "rewarded",
      shouldReset: false,
      shouldStartVerification: false,
      verificationEndsAtMs: Number(currentTierState.verificationEndsAtMs || 0),
    };
  }

  if (eligibleCount < target) {
    // 목표 미달
    if (status === "verifying") {
      return {
        status: "collecting",
        shouldReset: true,
        shouldStartVerification: false,
        resetReason: "eligible_count_below_target",
        verificationEndsAtMs: 0,
      };
    }
    return {
      status: "collecting",
      shouldReset: false,
      shouldStartVerification: false,
      verificationEndsAtMs: 0,
    };
  }

  // eligibleCount >= target
  if (status === "collecting") {
    return {
      status: "verifying",
      shouldReset: false,
      shouldStartVerification: true,
      verificationEndsAtMs: nowMs + VERIFICATION_HOLD_MS,
    };
  }

  // status === 'verifying'
  return {
    status: "verifying",
    shouldReset: false,
    shouldStartVerification: false,
    verificationEndsAtMs: Number(currentTierState.verificationEndsAtMs || nowMs + VERIFICATION_HOLD_MS),
  };
}

module.exports = {
  CAMPAIGN_ID,
  TARGET_T1,
  REWARD_T1,
  TARGET_T2,
  REWARD_T2,
  MEMBER_MIN_TENURE_MS,
  VERIFICATION_HOLD_MS,
  GUEST_MIN_SESSIONS,
  GUEST_MIN_SESSION_ACTIVE_SEC,
  GUEST_MIN_SESSION_GAP_MS,
  GUEST_MIN_TOTAL_ACTIVE_SEC,
  HEARTBEAT_INTERVAL_SEC,
  HEARTBEAT_MAX_CREDIT_SEC,
  HEARTBEAT_MIN_INTERVAL_MS,
  TIERS,
  getGuestQualifiedSessionCount,
  isCrewGrowthGuestEligibleV2,
  processGuestHeartbeat,
  isMemberEligibleForCrewGrowth,
  calculateTierRewardAmount,
  evaluateTierState,
};
