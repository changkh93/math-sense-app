"use strict";

const { FieldValue, Timestamp } = require("firebase-admin/firestore");
const { CAMPAIGN_ID, TIERS, MEMBER_MIN_TENURE_MS, isCrewGrowthGuestEligibleV2,
  isMemberEligibleForCrewGrowth, evaluateTierState } = require("./crewGrowthEventPolicy.cjs");
const ids = (values) => [...new Set((values || []).filter(Boolean))];
const memberIds = (crew) => ids([crew.leaderId, ...(crew.memberIds || [])]);
const liveMember = (user, crewId) => user && user.crewId === crewId && !user.isDeleted && user.status !== "deleted" && !user.deletedAt;
const liveGuest = (g, crewId, nowMs) => g && g.crewId === crewId && (g.eventCrewId || g.crewId) === crewId &&
  (!g.expiresAt?.toMillis || g.expiresAt.toMillis() > nowMs) && isCrewGrowthGuestEligibleV2(g);

function getParticipantLockRef(db, uid) {
  return db.collection("crewGrowthParticipantLocks").doc(`${CAMPAIGN_ID}_${uid}`);
}
function getRewardClaimRef(db, tierId, uid) {
  if (!TIERS[tierId]) throw new Error("Unknown crew growth tier");
  return db.collection("crewGrowthRewardClaims").doc(`${CAMPAIGN_ID}_${tierId}_${uid}`);
}
// Supply a snapshot fetched in the caller's read phase if earlier writes exist.
async function ensureParticipantLock(db, tx, uid, crewId, reason = "crew_joined", nowMs = Date.now(), snapshot) {
  const ref = getParticipantLockRef(db, uid);
  const snap = snapshot || await tx.get(ref);
  const data = snap.exists ? snap.data() : {
    campaignId: CAMPAIGN_ID, uid, originCrewId: crewId, boundAtMs: nowMs, boundReason: reason, status: "active",
  };
  tx.set(ref, { ...data, lastJoinedCrewId: crewId, updatedAtMs: nowMs }, { merge: true });
  return data;
}
async function forfeitParticipantLock(db, tx, uid, crewId, reason = "member_left", nowMs = Date.now(), snapshot) {
  const ref = getParticipantLockRef(db, uid);
  const snap = snapshot || await tx.get(ref);
  const data = snap.exists ? snap.data() : {
    campaignId: CAMPAIGN_ID, uid, originCrewId: crewId, boundAtMs: nowMs, boundReason: "forfeited_unlocked",
  };
  if (!data.originCrewId || data.originCrewId === crewId) {
    tx.set(ref, { ...data, status: "forfeited", leftAtMs: nowMs, forfeitReason: reason, updatedAtMs: nowMs }, { merge: true });
  }
  return data;
}

async function loadCrewGrowthEventV2Progress(db, crewId, nowMs = Date.now(), tx) {
  const read = (ref) => tx ? tx.get(ref) : ref.get();
  const crewRef = db.collection("crews").doc(crewId);
  const [crewSnap, guestSnap] = await Promise.all([
    read(crewRef), read(db.collection("crewGuestAccounts").where("crewId", "==", crewId)),
  ]);
  if (!crewSnap.exists) throw new Error("크루를 찾을 수 없습니다.");
  const crew = crewSnap.data();
  const rawIds = memberIds(crew);
  const [locks, users] = await Promise.all([
    Promise.all(rawIds.map((uid) => read(getParticipantLockRef(db, uid)))),
    Promise.all(rawIds.map((uid) => read(db.collection("users").doc(uid)))),
  ]);
  const currentIds = rawIds.filter((uid, i) => liveMember(users[i].data(), crewId));
  const eligibleIds = rawIds.filter((uid, i) => liveMember(users[i].data(), crewId) &&
    isMemberEligibleForCrewGrowth(locks[i].data(), crewId, nowMs));
  const futureEligibility = locks.flatMap((snap, i) => {
    const lock = snap.data();
    const at = Number(lock?.boundAtMs || 0) + MEMBER_MIN_TENURE_MS;
    return liveMember(users[i].data(), crewId) && lock?.status === "active" && lock.originCrewId === crewId && at > nowMs ? [at] : [];
  });
  const guests = guestSnap.docs.map((snap) => ({ ...snap.data(), uid: snap.id }));
  const activeGuests = guests.filter((guest) => liveGuest(guest, crewId, nowMs));
  return {
    crewRef, crew, memberIds: currentIds, eventEligibleMemberIds: eligibleIds,
    eventExcludedMemberIds: currentIds.filter((uid) => !eligibleIds.includes(uid)),
    guests, activeGuests, pendingGuests: guests.filter((g) => g.status !== "deleted" && !liveGuest(g, crewId, nowMs)),
    memberCount: currentIds.length, eventEligibleMemberCount: eligibleIds.length,
    eventExcludedMemberCount: currentIds.length - eligibleIds.length, activeGuestCount: activeGuests.length,
    eligibleCount: eligibleIds.length + activeGuests.length, futureEligibility,
  };
}
function retainedSnapshot(state, progress) {
  const members = new Set(progress.eventEligibleMemberIds);
  const guests = new Set(progress.activeGuests.map((g) => g.uid));
  return ids(state.snapshotMemberIds).filter((uid) => members.has(uid)).length +
    ids(state.snapshotGuestUids).filter((uid) => guests.has(uid)).length;
}
async function reconcileCrewGrowthEventV2(db, crewId, { allowReward = false, nowMs = Date.now(), recordCrystalTransactionFn } = {}) {
  let result;
  // Creation/reset must also be transactional: stale reads cannot undo payouts.
  await db.runTransaction(async (tx) => {
    const progress = await loadCrewGrowthEventV2Progress(db, crewId, nowMs, tx);
    const previous = progress.crew.growthEventV2 || {};
    const tiers = { ...(previous.tiers || {}) };
    const wakeups = [...progress.futureEligibility];
    if (progress.crew.status === "approved") {
      for (const tierId of ["t20", "t40"]) {
        if (tierId === "t40" && tiers.t20?.status !== "rewarded") break;
        const current = tiers[tierId] || {};
        const retained = retainedSnapshot(current, progress);
        const evaluation = evaluateTierState({ tierId, currentTierState: current,
          eligibleCount: current.status === "verifying" ? retained : progress.eligibleCount, nowMs });
        if (evaluation.shouldStartVerification) {
          tiers[tierId] = { status: "verifying", achievedAtMs: nowMs, verificationEndsAtMs: evaluation.verificationEndsAtMs,
            snapshotMemberIds: progress.eventEligibleMemberIds, snapshotGuestUids: progress.activeGuests.map((g) => g.uid),
            snapshotEligibleCount: progress.eligibleCount, snapshotRetainedCount: progress.eligibleCount };
        } else if (evaluation.shouldReset) {
          tiers[tierId] = { status: "collecting", achievedAtMs: 0, verificationEndsAtMs: 0,
            snapshotMemberIds: [], snapshotGuestUids: [], snapshotEligibleCount: 0, snapshotRetainedCount: 0,
            resetReason: "snapshot_participant_changed" };
          if (progress.eligibleCount >= TIERS[tierId].target) wakeups.push(nowMs + 60000);
        } else if (current.status === "verifying") {
          tiers[tierId] = { ...current, snapshotRetainedCount: retained };
        }
        if (tiers[tierId]?.status === "verifying") wakeups.push(tiers[tierId].verificationEndsAtMs);
      }
    }
    const eventV2 = {
      campaignId: CAMPAIGN_ID, schemaVersion: 2, eligibleMemberCount: progress.eventEligibleMemberCount,
      memberCount: progress.memberCount, excludedMemberCount: progress.eventExcludedMemberCount,
      activeGuestCount: progress.activeGuestCount, pendingGuestCount: progress.pendingGuests.length,
      eligibleCount: progress.eligibleCount, nextTierId: tiers.t20?.status === "rewarded" ? "t40" : "t20", tiers,
    };
    const nextAt = progress.crew.status === "approved" && wakeups.length ? Math.min(...wakeups.filter((n) => n > 0)) : 0;
    const comparable = { ...previous };
    delete comparable.updatedAtMs;
    if (JSON.stringify(comparable) !== JSON.stringify(eventV2) ||
        Number(progress.crew.growthEventNextVerificationEndsAtMs || 0) !== nextAt ||
        (nextAt && !progress.crew.growthEventNextVerificationEndsAt)) {
      tx.set(progress.crewRef, {
        growthEventV2: { ...eventV2, updatedAtMs: nowMs },
        growthEventNextVerificationEndsAt: nextAt ? Timestamp.fromMillis(nextAt) : null,
        growthEventNextVerificationEndsAtMs: nextAt,
      }, { merge: true });
    }
    result = { ...progress, eventV2 };
  });
  if (allowReward && recordCrystalTransactionFn) {
    const tierId = result.eventV2.nextTierId;
    const state = result.eventV2.tiers[tierId];
    if (state?.status === "verifying" && nowMs >= state.verificationEndsAtMs) {
      await payoutTierReward(db, crewId, tierId, { nowMs, recordCrystalTransactionFn });
      return reconcileCrewGrowthEventV2(db, crewId, { nowMs });
    }
  }
  return result;
}
async function payoutTierReward(db, crewId, tierId, { nowMs = Date.now(), recordCrystalTransactionFn } = {}) {
  if (!TIERS[tierId] || !recordCrystalTransactionFn) throw new Error("Payout dependencies missing");
  const crewRef = db.collection("crews").doc(crewId);
  await db.runTransaction(async (tx) => {
    const [crewSnap, configSnap] = await Promise.all([
      tx.get(crewRef), tx.get(db.collection("systemConfig").doc("crewGrowthEvent")),
    ]);
    const crew = crewSnap.data();
    const config = configSnap.data() || {};
    if (!crew || crew.status !== "approved" || config.rewardEnabled === false) return;
    const state = crew.growthEventV2?.tiers?.[tierId];
    if (state?.status !== "verifying" || !state.verificationEndsAtMs || nowMs < state.verificationEndsAtMs) return;
    if (tierId === "t40" && crew.growthEventV2?.tiers?.t20?.status !== "rewarded") return;
    const snapshotMembers = ids(state.snapshotMemberIds);
    const snapshotGuests = ids(state.snapshotGuestUids);
    const [users, locks, claims, guests] = await Promise.all([
      Promise.all(snapshotMembers.map((uid) => tx.get(db.collection("users").doc(uid)))),
      Promise.all(snapshotMembers.map((uid) => tx.get(getParticipantLockRef(db, uid)))),
      Promise.all(snapshotMembers.map((uid) => tx.get(getRewardClaimRef(db, tierId, uid)))),
      Promise.all(snapshotGuests.map((uid) => tx.get(db.collection("crewGuestAccounts").doc(uid)))),
    ]);
    const currentMembers = new Set(memberIds(crew));
    const retained = snapshotMembers.filter((uid, i) => currentMembers.has(uid) && liveMember(users[i].data(), crewId) &&
      isMemberEligibleForCrewGrowth(locks[i].data(), crewId, nowMs));
    const retainedGuests = snapshotGuests.filter((uid, i) => liveGuest(guests[i].data(), crewId, nowMs));
    const total = retained.length + retainedGuests.length;
    if (total < TIERS[tierId].target) {
      tx.update(crewRef, { [`growthEventV2.tiers.${tierId}`]: {
        status: "collecting", achievedAtMs: 0, verificationEndsAtMs: 0, snapshotMemberIds: [], snapshotGuestUids: [],
        snapshotEligibleCount: 0, snapshotRetainedCount: 0, resetReason: "payout_snapshot_changed",
      } });
      return;
    }
    const recipients = retained.filter((uid) => !claims[snapshotMembers.indexOf(uid)].exists);
    const amount = TIERS[tierId].reward;
    // Hold oversized payouts for review, never truncate a promised roster.
    if (recipients.length * 3 + 1 > 450 ||
        (Number(config.maxTierPayoutOre) > 0 && recipients.length * amount > Number(config.maxTierPayoutOre))) {
      tx.update(crewRef, { [`growthEventV2.tiers.${tierId}.payoutBlockedReason`]: "payout_capacity_or_budget" });
      return;
    }
    for (const uid of recipients) {
      tx.set(db.collection("users").doc(uid), {
        crystals: FieldValue.increment(amount), [`crewGrowthReward_${tierId}_AtMs`]: nowMs,
      }, { merge: true });
      tx.set(getRewardClaimRef(db, tierId, uid), {
        campaignId: CAMPAIGN_ID, tierId, target: TIERS[tierId].target, uid, crewId, crewName: crew.name || "스터디 크루",
        amount, snapshotAtMs: state.achievedAtMs, rewardedAtMs: nowMs, openedAtMs: 0, reaction: "",
      });
      recordCrystalTransactionFn(tx, uid, `${CAMPAIGN_ID}_${tierId}`, {
        amount, type: "crew_growth_event_reward", description: `스터디 크루 ${TIERS[tierId].target}명 달성 이벤트 보상`,
        metadata: { crewId, tierId, target: TIERS[tierId].target, campaignId: CAMPAIGN_ID },
      });
    }
    tx.update(crewRef, {
      [`growthEventV2.tiers.${tierId}`]: { ...state, status: "rewarded", rewardedAtMs: nowMs,
        rewardedMemberIds: retained.filter((uid) => {
          const claim = claims[snapshotMembers.indexOf(uid)].data();
          return !claim || claim.crewId === crewId;
        }), rewardAmount: amount, finalEligibleCount: total, snapshotRetainedCount: total,
        payoutBlockedReason: null, openedMemberIds: state.openedMemberIds || [], reactionCounts: state.reactionCounts || {} },
      growthEventNextVerificationEndsAt: null, growthEventNextVerificationEndsAtMs: 0,
    });
  });
}
module.exports = { getParticipantLockRef, getRewardClaimRef, ensureParticipantLock, forfeitParticipantLock,
  loadCrewGrowthEventV2Progress, reconcileCrewGrowthEventV2, payoutTierReward };
