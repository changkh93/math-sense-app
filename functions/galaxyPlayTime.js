/* global module, require */

const crypto = require("crypto");

const DEFAULT_DAILY_LIMIT_MINUTES = 30;
const DEFAULT_SESSION_LIMIT_MINUTES = 15;
const ALLOWED_DAILY_LIMIT_MINUTES = new Set([20, 30, 40, 60]);
const ALLOWED_SESSION_LIMIT_MINUTES = new Set([10, 15, 20]);
const MAX_DAILY_LIMIT_SECONDS = 60 * 60;
const MAX_SESSION_LIMIT_SECONDS = 20 * 60;
const COOLDOWN_SECONDS = 20 * 60;
const RESUME_GRACE_SECONDS = 2 * 60;
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const DAILY_TTL_MS = 13 * 31 * 24 * 60 * 60 * 1000;
const CLIENT_END_REASONS = new Set(["manual_exit", "idle_timeout"]);

function cleanId(value, maxLength = 180) {
  return typeof value === "string"
    ? value.trim().replace(/[^A-Za-z0-9_-]/g, "").slice(0, maxLength)
    : "";
}

function clampInteger(value, min, max) {
  const number = Math.floor(Number(value) || 0);
  return Math.max(min, Math.min(max, number));
}

function getKstDayWindow(nowMs = Date.now()) {
  const shifted = new Date(Number(nowMs || Date.now()) + (9 * 60 * 60 * 1000));
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  const dayKey = `${year}-${month}-${day}`;
  const nextMidnightMs = Date.UTC(year, shifted.getUTCMonth(), shifted.getUTCDate() + 1) - (9 * 60 * 60 * 1000);
  return { dayKey, nextMidnightMs };
}

function isValidDayKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const [year, month, day] = String(value).split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

function normalizePolicy(data = {}) {
  const requestedDaily = Number(data.dailyLimitMinutes);
  const requestedSession = Number(data.sessionLimitMinutes);
  const dailyLimitMinutes = ALLOWED_DAILY_LIMIT_MINUTES.has(requestedDaily)
    ? requestedDaily
    : DEFAULT_DAILY_LIMIT_MINUTES;
  const sessionLimitMinutes = ALLOWED_SESSION_LIMIT_MINUTES.has(requestedSession)
    ? requestedSession
    : DEFAULT_SESSION_LIMIT_MINUTES;
  return {
    version: Math.max(1, Math.floor(Number(data.version || 1))),
    dailyLimitMinutes,
    sessionLimitMinutes,
    dailyLimitSeconds: Math.min(MAX_DAILY_LIMIT_SECONDS, dailyLimitMinutes * 60),
    sessionLimitSeconds: Math.min(MAX_SESSION_LIMIT_SECONDS, sessionLimitMinutes * 60),
    cooldownSeconds: COOLDOWN_SECONDS,
  };
}

function calculateHardEndsAtMs({ startedAtMs, sessionLimitSeconds, dailyRemainingSeconds, nextMidnightMs }) {
  return Math.min(
    Number(startedAtMs) + clampInteger(sessionLimitSeconds, 1, MAX_SESSION_LIMIT_SECONDS) * 1000,
    Number(startedAtMs) + clampInteger(dailyRemainingSeconds, 1, MAX_DAILY_LIMIT_SECONDS) * 1000,
    Number(nextMidnightMs),
  );
}

function getRuntimeNaturalEnd(runtime = {}, nowMs = Date.now()) {
  if (runtime.status !== "active" || !runtime.sessionId) return null;
  const hardEndsAtMs = Math.max(0, Number(runtime.hardEndsAtMs || 0));
  const leaseExpiresAtMs = Math.max(0, Number(runtime.leaseExpiresAtMs || 0));
  if (hardEndsAtMs && hardEndsAtMs <= nowMs) {
    return { endedAtMs: hardEndsAtMs, reason: runtime.midnightEndsAtMs === hardEndsAtMs ? "kst_midnight" : "time_limit" };
  }
  if (leaseExpiresAtMs && leaseExpiresAtMs <= nowMs) {
    return { endedAtMs: Math.min(leaseExpiresAtMs, hardEndsAtMs || leaseExpiresAtMs), reason: "connection_timeout" };
  }
  return null;
}

function calculateChargedSeconds(startedAtMs, endedAtMs) {
  return Math.max(0, Math.ceil((Math.max(Number(startedAtMs) || 0, Number(endedAtMs) || 0) - Math.max(0, Number(startedAtMs) || 0)) / 1000));
}

function buildAccessView({ policy, daily = {}, runtime = {}, nowMs = Date.now() }) {
  const normalizedPolicy = normalizePolicy(policy);
  const { dayKey, nextMidnightMs } = getKstDayWindow(nowMs);
  const completedSeconds = clampInteger(daily.usedSeconds, 0, MAX_DAILY_LIMIT_SECONDS);
  const runtimeActive = runtime.status === "active"
    && runtime.dayKey === dayKey
    && !getRuntimeNaturalEnd(runtime, nowMs);
  const currentSessionSeconds = runtimeActive
    ? calculateChargedSeconds(runtime.startedAtMs, Math.min(nowMs, Number(runtime.hardEndsAtMs || nowMs)))
    : 0;
  const usedSeconds = Math.min(normalizedPolicy.dailyLimitSeconds, completedSeconds + currentSessionSeconds);
  const remainingSeconds = Math.max(0, normalizedPolicy.dailyLimitSeconds - usedSeconds);
  const nextAllowedAtMs = Math.max(0, Number(runtime.nextAllowedAtMs || 0));
  const inCooldown = runtime.status === "cooldown" && nextAllowedAtMs > nowMs;
  const canStart = !runtimeActive && !inCooldown && remainingSeconds > 0 && nextMidnightMs > nowMs;
  let blockedReason = "";
  if (runtimeActive) blockedReason = "active_session";
  else if (inCooldown) blockedReason = "cooldown";
  else if (remainingSeconds <= 0) blockedReason = "daily_limit";
  return {
    dayKey,
    serverNowMs: nowMs,
    nextMidnightMs,
    policy: normalizedPolicy,
    daily: {
      usedSeconds,
      completedSeconds,
      remainingSeconds,
      sessionCount: Math.max(0, Math.floor(Number(daily.sessionCount || 0))),
      longestSessionSeconds: Math.max(
        Math.floor(Number(daily.longestSessionSeconds || 0)),
        currentSessionSeconds,
      ),
    },
    runtime: runtimeActive ? {
      status: "active",
      sessionId: runtime.sessionId,
      startedAtMs: Number(runtime.startedAtMs || 0),
      hardEndsAtMs: Number(runtime.hardEndsAtMs || 0),
      leaseExpiresAtMs: Number(runtime.leaseExpiresAtMs || 0),
      clientInstanceId: runtime.clientInstanceId || "",
    } : {
      status: inCooldown ? "cooldown" : "idle",
      nextAllowedAtMs: inCooldown ? nextAllowedAtMs : 0,
    },
    canStart,
    blockedReason,
  };
}

function hashToken(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

module.exports = function registerGalaxyPlayTime({ functions, admin, regionalFunctions }) {
  const db = admin.firestore();
  const FieldValue = admin.firestore.FieldValue;
  const Timestamp = admin.firestore.Timestamp;

  function requireUid(context) {
    const uid = context?.auth?.uid;
    if (!uid) throw new functions.https.HttpsError("unauthenticated", "로그인이 필요합니다.");
    return uid;
  }

  function observeAppCheck(context, functionName) {
    if (context?.app) return;
    console.warn("[galaxyPlayTime] App Check token missing", {
      functionName,
      uid: context?.auth?.uid || "unauthenticated",
    });
  }

  async function requireStudent(uid) {
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    const user = userSnap.data() || {};
    if (!userSnap.exists || user.isDeleted === true || user.accountStatus === "deleted") {
      throw new functions.https.HttpsError("not-found", "계정을 찾을 수 없습니다.");
    }
    return { userRef, user };
  }

  async function requireLinkedParent(parentUid, childUid) {
    const parentSnap = await db.collection("parents").doc(parentUid).get();
    const parent = parentSnap.data() || {};
    if (!parentSnap.exists || parent.isDeleted === true || !Array.isArray(parent.childrenUids) || !parent.childrenUids.includes(childUid)) {
      throw new functions.https.HttpsError("permission-denied", "연결된 자녀의 게임 이용 정보만 확인할 수 있습니다.");
    }
    const childSnap = await db.collection("users").doc(childUid).get();
    const child = childSnap.data() || {};
    if (!childSnap.exists || child.isDeleted === true || (child.parentUid && child.parentUid !== parentUid)) {
      throw new functions.https.HttpsError("permission-denied", "학부모와 자녀 연결 정보가 일치하지 않습니다.");
    }
    return { parent, child };
  }

  function refsFor(uid, dayKey) {
    return {
      policyRef: db.collection("galaxyPlayPolicies").doc(uid),
      runtimeRef: db.collection("galaxyPlayRuntime").doc(uid),
      dailyRef: db.collection("galaxyPlayDaily").doc(uid).collection("days").doc(dayKey),
    };
  }

  function sessionRef(sessionId) {
    return db.collection("galaxyPlaySessions").doc(sessionId);
  }

  function buildDailyExpiry(dayKey) {
    const [year, month, day] = dayKey.split("-").map(Number);
    return Timestamp.fromMillis(Date.UTC(year, month - 1, day + 1) - (9 * 60 * 60 * 1000) + DAILY_TTL_MS);
  }

  function setSessionFinished(transaction, { sessionSnap, session, runtimeRef, dailyRef, daily, endedAtMs, reason, nowMs }) {
    const chargedSeconds = calculateChargedSeconds(session.startedAtMs, endedAtMs);
    const nextUsedSeconds = Math.min(MAX_DAILY_LIMIT_SECONDS, Math.max(0, Number(daily.usedSeconds || 0)) + chargedSeconds);
    const nextLongest = Math.max(Math.max(0, Number(daily.longestSessionSeconds || 0)), chargedSeconds);
    transaction.set(sessionSnap.ref, {
      status: "ended",
      endedAtMs,
      endReason: reason,
      chargedSeconds,
      endedAt: Timestamp.fromMillis(endedAtMs),
      updatedAt: FieldValue.serverTimestamp(),
      expireAt: Timestamp.fromMillis(endedAtMs + SESSION_TTL_MS),
    }, { merge: true });
    transaction.set(dailyRef, {
      uid: session.uid,
      dayKey: session.dayKey,
      usedSeconds: nextUsedSeconds,
      sessionCount: Math.max(0, Math.floor(Number(daily.sessionCount || 0))),
      longestSessionSeconds: nextLongest,
      lastSessionEndedAtMs: endedAtMs,
      updatedAt: FieldValue.serverTimestamp(),
      expireAt: buildDailyExpiry(session.dayKey),
    }, { merge: true });
    transaction.set(runtimeRef, {
      uid: session.uid,
      status: "cooldown",
      sessionId: session.sessionId,
      endedAtMs,
      endReason: reason,
      nextAllowedAtMs: endedAtMs + (COOLDOWN_SECONDS * 1000),
      leaseExpiresAtMs: 0,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return { chargedSeconds, nextUsedSeconds, nextLongest, nextAllowedAtMs: endedAtMs + (COOLDOWN_SECONDS * 1000), serverNowMs: nowMs };
  }

  async function reconcileRuntimeInTransaction(transaction, { uid, nowMs, runtimeSnap, currentDayKey, currentDailySnap }) {
    const runtime = runtimeSnap.data() || {};
    const naturalEnd = getRuntimeNaturalEnd(runtime, nowMs);
    if (!naturalEnd) return { runtime, daily: currentDailySnap.data() || {}, finalized: null };

    const activeSessionRef = sessionRef(runtime.sessionId);
    const activeSessionSnap = await transaction.get(activeSessionRef);
    if (!activeSessionSnap.exists || activeSessionSnap.data()?.status === "ended") {
      transaction.set(runtimeSnap.ref, {
        status: "cooldown",
        endedAtMs: naturalEnd.endedAtMs,
        endReason: naturalEnd.reason,
        nextAllowedAtMs: naturalEnd.endedAtMs + (COOLDOWN_SECONDS * 1000),
        leaseExpiresAtMs: 0,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return { runtime: { ...runtime, status: "cooldown", nextAllowedAtMs: naturalEnd.endedAtMs + (COOLDOWN_SECONDS * 1000) }, daily: currentDailySnap.data() || {}, finalized: null };
    }

    const session = activeSessionSnap.data() || {};
    const activeDailyRef = refsFor(uid, session.dayKey || runtime.dayKey || currentDayKey).dailyRef;
    const activeDailySnap = activeDailyRef.path === currentDailySnap.ref.path
      ? currentDailySnap
      : await transaction.get(activeDailyRef);
    const finalized = setSessionFinished(transaction, {
      sessionSnap: activeSessionSnap,
      session,
      runtimeRef: runtimeSnap.ref,
      dailyRef: activeDailyRef,
      daily: activeDailySnap.data() || {},
      endedAtMs: naturalEnd.endedAtMs,
      reason: naturalEnd.reason,
      nowMs,
    });
    const nextCurrentDaily = activeDailyRef.path === currentDailySnap.ref.path
      ? { ...(currentDailySnap.data() || {}), usedSeconds: finalized.nextUsedSeconds, longestSessionSeconds: finalized.nextLongest }
      : currentDailySnap.data() || {};
    return {
      runtime: { ...runtime, status: "cooldown", nextAllowedAtMs: finalized.nextAllowedAtMs },
      daily: nextCurrentDaily,
      finalized,
    };
  }

  async function getReconciledAccess(uid, nowMs = Date.now()) {
    const { dayKey } = getKstDayWindow(nowMs);
    const { policyRef, runtimeRef, dailyRef } = refsFor(uid, dayKey);
    return db.runTransaction(async (transaction) => {
      const [policySnap, runtimeSnap, dailySnap] = await Promise.all([
        transaction.get(policyRef),
        transaction.get(runtimeRef),
        transaction.get(dailyRef),
      ]);
      const reconciled = await reconcileRuntimeInTransaction(transaction, {
        uid,
        nowMs,
        runtimeSnap,
        currentDayKey: dayKey,
        currentDailySnap: dailySnap,
      });
      return buildAccessView({
        policy: policySnap.data() || {},
        daily: reconciled.daily,
        runtime: reconciled.runtime,
        nowMs,
      });
    });
  }

  const getGalaxyPlayAccess = regionalFunctions.https.onCall(async (_data, context) => {
    observeAppCheck(context, "getGalaxyPlayAccess");
    const uid = requireUid(context);
    await requireStudent(uid);
    return getReconciledAccess(uid, Date.now());
  });

  const startGalaxyPlaySession = regionalFunctions.https.onCall(async (data, context) => {
    observeAppCheck(context, "startGalaxyPlaySession");
    const uid = requireUid(context);
    await requireStudent(uid);
    const clientInstanceId = cleanId(data?.clientInstanceId, 100);
    const startRequestId = cleanId(data?.startRequestId, 100);
    if (!clientInstanceId || !startRequestId) {
      throw new functions.https.HttpsError("invalid-argument", "게임 세션 시작 정보가 올바르지 않습니다.");
    }
    const nowMs = Date.now();
    const { dayKey, nextMidnightMs } = getKstDayWindow(nowMs);
    const { policyRef, runtimeRef, dailyRef } = refsFor(uid, dayKey);
    const requestedSessionId = `${uid}_${startRequestId}`.slice(0, 400);
    const requestedSessionRef = sessionRef(requestedSessionId);
    const resumeToken = crypto.randomBytes(24).toString("base64url");

    const result = await db.runTransaction(async (transaction) => {
      const [policySnap, runtimeSnap, dailySnap, requestedSessionSnap] = await Promise.all([
        transaction.get(policyRef),
        transaction.get(runtimeRef),
        transaction.get(dailyRef),
        transaction.get(requestedSessionRef),
      ]);
      const policy = normalizePolicy(policySnap.data() || {});
      const reconciled = await reconcileRuntimeInTransaction(transaction, {
        uid,
        nowMs,
        runtimeSnap,
        currentDayKey: dayKey,
        currentDailySnap: dailySnap,
      });
      const runtime = reconciled.runtime || {};
      const daily = reconciled.daily || {};

      if (requestedSessionSnap.exists) {
        const existing = requestedSessionSnap.data() || {};
        if (existing.uid !== uid || existing.startRequestId !== startRequestId) {
          throw new functions.https.HttpsError("already-exists", "동일한 시작 요청을 다시 사용할 수 없습니다.");
        }
        if (reconciled.finalized && runtime.sessionId === requestedSessionId) {
          return { kind: "ended", session: { ...existing, status: "ended" } };
        }
        if (existing.status !== "active") {
          return { kind: "ended", session: existing };
        }
        return { kind: "active", session: existing, resumeToken: existing.resumeToken };
      }

      const runtimeNaturalEnd = getRuntimeNaturalEnd(runtime, nowMs);
      if (runtime.status === "active" && !runtimeNaturalEnd) {
        throw new functions.https.HttpsError("already-exists", "다른 창이나 기기에서 이미 아스트라 프론티어를 이용하고 있습니다.", {
          hardEndsAtMs: runtime.hardEndsAtMs,
        });
      }
      if (runtime.status === "cooldown" && Number(runtime.nextAllowedAtMs || 0) > nowMs) {
        throw new functions.https.HttpsError("failed-precondition", "행성이 휴식 중입니다. 잠시 뒤 다시 탐험해 주세요.", {
          reason: "cooldown",
          nextAllowedAtMs: Number(runtime.nextAllowedAtMs || 0),
        });
      }

      const usedSeconds = clampInteger(daily.usedSeconds, 0, MAX_DAILY_LIMIT_SECONDS);
      const dailyRemainingSeconds = Math.max(0, policy.dailyLimitSeconds - usedSeconds);
      if (dailyRemainingSeconds <= 0) {
        throw new functions.https.HttpsError("resource-exhausted", "오늘의 아스트라 프론티어 이용시간을 모두 사용했습니다.", { reason: "daily_limit" });
      }
      const hardEndsAtMs = calculateHardEndsAtMs({
        startedAtMs: nowMs,
        sessionLimitSeconds: policy.sessionLimitSeconds,
        dailyRemainingSeconds,
        nextMidnightMs,
      });
      const leaseExpiresAtMs = Math.min(hardEndsAtMs, nowMs + (RESUME_GRACE_SECONDS * 1000));
      const session = {
        uid,
        sessionId: requestedSessionId,
        status: "active",
        dayKey,
        policyVersion: policy.version,
        dailyLimitSeconds: policy.dailyLimitSeconds,
        sessionLimitSeconds: policy.sessionLimitSeconds,
        startedAtMs: nowMs,
        hardEndsAtMs,
        midnightEndsAtMs: nextMidnightMs,
        leaseExpiresAtMs,
        clientInstanceId,
        startRequestId,
        resumeToken,
        resumeTokenHash: hashToken(resumeToken),
        lastSequenceNumber: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        expireAt: Timestamp.fromMillis(hardEndsAtMs + SESSION_TTL_MS),
      };
      const runtimeSession = { ...session };
      delete runtimeSession.resumeToken;
      transaction.set(policyRef, {
        uid,
        version: policy.version,
        dailyLimitMinutes: policy.dailyLimitMinutes,
        sessionLimitMinutes: policy.sessionLimitMinutes,
        cooldownMinutes: COOLDOWN_SECONDS / 60,
        updatedAt: policySnap.exists ? (policySnap.data()?.updatedAt || FieldValue.serverTimestamp()) : FieldValue.serverTimestamp(),
      }, { merge: true });
      transaction.set(requestedSessionRef, session);
      transaction.set(runtimeRef, {
        ...runtimeSession,
        resumeTokenHash: session.resumeTokenHash,
        status: "active",
      });
      transaction.set(dailyRef, {
        uid,
        dayKey,
        usedSeconds,
        sessionCount: Math.max(0, Math.floor(Number(daily.sessionCount || 0))) + 1,
        longestSessionSeconds: Math.max(0, Math.floor(Number(daily.longestSessionSeconds || 0))),
        updatedAt: FieldValue.serverTimestamp(),
        expireAt: buildDailyExpiry(dayKey),
      }, { merge: true });
      return { kind: "active", session, resumeToken };
    });

    if (result.kind !== "active") {
      throw new functions.https.HttpsError("failed-precondition", "이미 종료된 탐험 시작 요청입니다. 진입 화면에서 다시 시도해 주세요.");
    }
    const access = await getReconciledAccess(uid, Date.now());
    return {
      success: true,
      session: {
        sessionId: result.session.sessionId,
        clientInstanceId: result.session.clientInstanceId,
        resumeToken: result.resumeToken,
        startedAtMs: result.session.startedAtMs,
        hardEndsAtMs: result.session.hardEndsAtMs,
        leaseExpiresAtMs: result.session.leaseExpiresAtMs,
        sessionLimitSeconds: result.session.sessionLimitSeconds,
        dailyLimitSeconds: result.session.dailyLimitSeconds,
        dayKey: result.session.dayKey,
      },
      access,
      serverNowMs: access.serverNowMs,
    };
  });

  const checkpointGalaxyPlaySession = regionalFunctions.https.onCall(async (data, context) => {
    observeAppCheck(context, "checkpointGalaxyPlaySession");
    const uid = requireUid(context);
    const sessionId = cleanId(data?.sessionId, 400);
    const clientInstanceId = cleanId(data?.clientInstanceId, 100);
    const resumeToken = typeof data?.resumeToken === "string" ? data.resumeToken : "";
    const sequenceNumber = clampInteger(data?.sequenceNumber, 1, Number.MAX_SAFE_INTEGER);
    if (!sessionId || !clientInstanceId || !resumeToken || !sequenceNumber) {
      throw new functions.https.HttpsError("invalid-argument", "게임 세션 확인 정보가 올바르지 않습니다.");
    }
    const nowMs = Date.now();
    const runtimeRef = db.collection("galaxyPlayRuntime").doc(uid);
    const targetSessionRef = sessionRef(sessionId);
    const result = await db.runTransaction(async (transaction) => {
      const [runtimeSnap, targetSessionSnap] = await Promise.all([
        transaction.get(runtimeRef),
        transaction.get(targetSessionRef),
      ]);
      const runtime = runtimeSnap.data() || {};
      const session = targetSessionSnap.data() || {};
      if (!targetSessionSnap.exists || session.uid !== uid) {
        throw new functions.https.HttpsError("not-found", "게임 세션을 찾을 수 없습니다.");
      }
      if (session.status === "ended") return { ended: true, session, duplicate: true };
      if (
        runtime.status !== "active"
        || runtime.sessionId !== sessionId
        || runtime.clientInstanceId !== clientInstanceId
        || runtime.resumeTokenHash !== hashToken(resumeToken)
      ) {
        throw new functions.https.HttpsError("permission-denied", "현재 기기에서 승인된 게임 세션이 아닙니다.");
      }
      const dailyRef = refsFor(uid, session.dayKey).dailyRef;
      const dailySnap = await transaction.get(dailyRef);
      const naturalEnd = getRuntimeNaturalEnd(runtime, nowMs);
      if (naturalEnd) {
        const finalized = setSessionFinished(transaction, {
          sessionSnap: targetSessionSnap,
          session,
          runtimeRef,
          dailyRef,
          daily: dailySnap.data() || {},
          endedAtMs: naturalEnd.endedAtMs,
          reason: naturalEnd.reason,
          nowMs,
        });
        return { ended: true, session: { ...session, status: "ended", endedAtMs: naturalEnd.endedAtMs, endReason: naturalEnd.reason }, finalized };
      }
      if (sequenceNumber <= Math.max(0, Number(runtime.lastSequenceNumber || 0))) {
        return { ended: false, session: runtime, duplicate: true };
      }
      const leaseExpiresAtMs = Math.min(Number(runtime.hardEndsAtMs), nowMs + (RESUME_GRACE_SECONDS * 1000));
      const updates = {
        lastSequenceNumber: sequenceNumber,
        lastCheckpointAtMs: nowMs,
        leaseExpiresAtMs,
        lastClientVisible: data?.visible === true,
        lastClientRecentActivity: data?.recentActivity === true,
        updatedAt: FieldValue.serverTimestamp(),
      };
      transaction.set(runtimeRef, updates, { merge: true });
      transaction.set(targetSessionRef, updates, { merge: true });
      return { ended: false, session: { ...runtime, ...updates } };
    });
    if (result.ended) {
      return { success: true, ended: true, endReason: result.session.endReason || "time_limit", endedAtMs: result.session.endedAtMs || nowMs, serverNowMs: nowMs };
    }
    return {
      success: true,
      ended: false,
      duplicate: result.duplicate === true,
      serverNowMs: nowMs,
      hardEndsAtMs: Number(result.session.hardEndsAtMs || 0),
      leaseExpiresAtMs: Number(result.session.leaseExpiresAtMs || 0),
    };
  });

  const endGalaxyPlaySession = regionalFunctions.https.onCall(async (data, context) => {
    observeAppCheck(context, "endGalaxyPlaySession");
    const uid = requireUid(context);
    const sessionId = cleanId(data?.sessionId, 400);
    const clientInstanceId = cleanId(data?.clientInstanceId, 100);
    const resumeToken = typeof data?.resumeToken === "string" ? data.resumeToken : "";
    const rawRequestedReason = cleanId(data?.reason, 60);
    const requestedReason = CLIENT_END_REASONS.has(rawRequestedReason) ? rawRequestedReason : "manual_exit";
    if (!sessionId || !clientInstanceId || !resumeToken) {
      throw new functions.https.HttpsError("invalid-argument", "종료할 게임 세션 정보가 올바르지 않습니다.");
    }
    const nowMs = Date.now();
    const runtimeRef = db.collection("galaxyPlayRuntime").doc(uid);
    const targetSessionRef = sessionRef(sessionId);
    const result = await db.runTransaction(async (transaction) => {
      const [runtimeSnap, targetSessionSnap] = await Promise.all([
        transaction.get(runtimeRef),
        transaction.get(targetSessionRef),
      ]);
      const session = targetSessionSnap.data() || {};
      const runtime = runtimeSnap.data() || {};
      if (!targetSessionSnap.exists || session.uid !== uid) {
        throw new functions.https.HttpsError("not-found", "종료할 게임 세션을 찾을 수 없습니다.");
      }
      if (session.status === "ended") {
        return {
          chargedSeconds: Number(session.chargedSeconds || 0),
          nextAllowedAtMs: Number(runtime.nextAllowedAtMs || 0),
          endedAtMs: Number(session.endedAtMs || nowMs),
          endReason: session.endReason || requestedReason,
          duplicate: true,
        };
      }
      if (
        runtime.sessionId !== sessionId
        || runtime.clientInstanceId !== clientInstanceId
        || runtime.resumeTokenHash !== hashToken(resumeToken)
      ) {
        throw new functions.https.HttpsError("permission-denied", "현재 기기에서 승인된 게임 세션이 아닙니다.");
      }
      const dailyRef = refsFor(uid, session.dayKey).dailyRef;
      const dailySnap = await transaction.get(dailyRef);
      const naturalEnd = getRuntimeNaturalEnd(runtime, nowMs);
      const endedAtMs = naturalEnd?.endedAtMs || Math.min(nowMs, Number(session.hardEndsAtMs || nowMs));
      return setSessionFinished(transaction, {
        sessionSnap: targetSessionSnap,
        session,
        runtimeRef,
        dailyRef,
        daily: dailySnap.data() || {},
        endedAtMs,
        reason: naturalEnd?.reason || requestedReason,
        nowMs,
      });
    });
    return { success: true, ...result, serverNowMs: nowMs };
  });

  const parentGetGalaxyPlayDay = regionalFunctions.https.onCall(async (data, context) => {
    observeAppCheck(context, "parentGetGalaxyPlayDay");
    const parentUid = requireUid(context);
    const childUid = cleanId(data?.childUid, 180);
    const requestedDayKey = String(data?.dayKey || "");
    if (!childUid || !isValidDayKey(requestedDayKey)) {
      throw new functions.https.HttpsError("invalid-argument", "조회할 자녀와 날짜가 올바르지 않습니다.");
    }
    await requireLinkedParent(parentUid, childUid);
    const nowMs = Date.now();
    const currentDayKey = getKstDayWindow(nowMs).dayKey;
    if (requestedDayKey === currentDayKey) await getReconciledAccess(childUid, nowMs);
    const { policyRef, runtimeRef } = refsFor(childUid, currentDayKey);
    const requestedDailyRef = refsFor(childUid, requestedDayKey).dailyRef;
    const [policySnap, dailySnap, runtimeSnap] = await Promise.all([
      policyRef.get(),
      requestedDailyRef.get(),
      runtimeRef.get(),
    ]);
    const policy = normalizePolicy(policySnap.data() || {});
    const daily = dailySnap.data() || {};
    const runtime = runtimeSnap.data() || {};
    const activeForRequestedDay = requestedDayKey === currentDayKey
      && runtime.status === "active"
      && runtime.dayKey === requestedDayKey
      && !getRuntimeNaturalEnd(runtime, nowMs);
    const activeSeconds = activeForRequestedDay
      ? calculateChargedSeconds(runtime.startedAtMs, Math.min(nowMs, Number(runtime.hardEndsAtMs || nowMs)))
      : 0;
    const totalSeconds = Math.min(policy.dailyLimitSeconds, Math.max(0, Number(daily.usedSeconds || 0)) + activeSeconds);
    return {
      success: true,
      dayKey: requestedDayKey,
      policy,
      summary: {
        totalSeconds,
        sessionCount: Math.max(0, Math.floor(Number(daily.sessionCount || 0))),
        longestSessionSeconds: Math.max(Math.max(0, Number(daily.longestSessionSeconds || 0)), activeSeconds),
      },
      serverNowMs: nowMs,
    };
  });

  const parentSetGalaxyPlayPolicy = regionalFunctions.https.onCall(async (data, context) => {
    observeAppCheck(context, "parentSetGalaxyPlayPolicy");
    const parentUid = requireUid(context);
    const childUid = cleanId(data?.childUid, 180);
    const dailyLimitMinutes = Number(data?.dailyLimitMinutes);
    const sessionLimitMinutes = Number(data?.sessionLimitMinutes);
    if (!childUid || !ALLOWED_DAILY_LIMIT_MINUTES.has(dailyLimitMinutes) || !ALLOWED_SESSION_LIMIT_MINUTES.has(sessionLimitMinutes)) {
      throw new functions.https.HttpsError("invalid-argument", "하루 또는 1회 이용시간 설정이 올바르지 않습니다.");
    }
    await requireLinkedParent(parentUid, childUid);
    const policyRef = db.collection("galaxyPlayPolicies").doc(childUid);
    const policy = await db.runTransaction(async (transaction) => {
      const policySnap = await transaction.get(policyRef);
      const nextVersion = Math.max(0, Number(policySnap.data()?.version || 0)) + 1;
      const next = {
        uid: childUid,
        version: nextVersion,
        dailyLimitMinutes,
        sessionLimitMinutes,
        cooldownMinutes: COOLDOWN_SECONDS / 60,
        updatedBy: parentUid,
        updatedAt: FieldValue.serverTimestamp(),
      };
      transaction.set(policyRef, next, { merge: true });
      return normalizePolicy(next);
    });
    return { success: true, policy, appliesFrom: "next_session", serverNowMs: Date.now() };
  });

  async function assertActiveGalaxySession({ uid, data, minRemainingSeconds = 0 }) {
    const sessionId = cleanId(data?.playSessionId, 400);
    const clientInstanceId = cleanId(data?.playClientInstanceId, 100);
    const resumeToken = typeof data?.playResumeToken === "string" ? data.playResumeToken : "";
    if (!sessionId || !clientInstanceId || !resumeToken) {
      throw new functions.https.HttpsError("failed-precondition", "아스트라 프론티어 입장 승인이 필요합니다.", { reason: "play_session_required" });
    }
    const nowMs = Date.now();
    const runtimeSnap = await db.collection("galaxyPlayRuntime").doc(uid).get();
    const runtime = runtimeSnap.data() || {};
    if (
      !runtimeSnap.exists
      || runtime.status !== "active"
      || runtime.sessionId !== sessionId
      || runtime.clientInstanceId !== clientInstanceId
      || runtime.resumeTokenHash !== hashToken(resumeToken)
      || Number(runtime.hardEndsAtMs || 0) <= nowMs
      || Number(runtime.leaseExpiresAtMs || 0) <= nowMs
    ) {
      throw new functions.https.HttpsError("failed-precondition", "게임 이용시간이 종료되었거나 현재 기기의 세션이 아닙니다.", { reason: "play_session_expired" });
    }
    if (Number(runtime.hardEndsAtMs || 0) - nowMs < Math.max(0, Number(minRemainingSeconds || 0)) * 1000) {
      throw new functions.https.HttpsError("failed-precondition", "남은 시간 안에 마칠 수 있는 활동만 이용할 수 있습니다.", { reason: "play_session_finishing" });
    }
    return {
      sessionId,
      hardEndsAtMs: Number(runtime.hardEndsAtMs),
      leaseExpiresAtMs: Number(runtime.leaseExpiresAtMs),
      remainingSeconds: Math.max(0, Math.floor((Number(runtime.hardEndsAtMs) - nowMs) / 1000)),
    };
  }

  return {
    functions: {
      getGalaxyPlayAccess,
      startGalaxyPlaySession,
      checkpointGalaxyPlaySession,
      endGalaxyPlaySession,
      parentGetGalaxyPlayDay,
      parentSetGalaxyPlayPolicy,
    },
    internal: {
      assertActiveGalaxySession,
    },
  };
};

module.exports.__test = {
  ALLOWED_DAILY_LIMIT_MINUTES,
  ALLOWED_SESSION_LIMIT_MINUTES,
  COOLDOWN_SECONDS,
  RESUME_GRACE_SECONDS,
  buildAccessView,
  calculateChargedSeconds,
  calculateHardEndsAtMs,
  getKstDayWindow,
  getRuntimeNaturalEnd,
  isValidDayKey,
  normalizePolicy,
};
