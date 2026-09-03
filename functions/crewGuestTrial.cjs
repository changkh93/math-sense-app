"use strict";

// Same application/referral schema as the public form; no parent account or login required.
module.exports = function createCrewGuestTrial({ db, HttpsError, FieldValue }) {
  const clean = (value, max) => String(value || "").trim().slice(0, max);
  function requireGuest(context) {
    if (!context?.auth?.uid || context.auth.token?.firebase?.sign_in_provider !== "anonymous") {
      throw new HttpsError("unauthenticated", "초대 링크로 크루에 입장한 후 신청해 주세요.");
    }
    return context.auth.uid;
  }
  async function loadOffer(uid, read) {
    const guestSnap = await read(db.collection("crewGuestAccounts").doc(uid));
    const guest = guestSnap.data() || {};
    if (!guestSnap.exists || ["deleted", "suspended"].includes(guest.status) ||
        (guest.expiresAt?.toMillis && guest.expiresAt.toMillis() <= Date.now())) {
      throw new HttpsError("permission-denied", "이용 가능한 게스트 세션을 확인해 주세요.");
    }
    const inviteSnap = guest.referralInviteId
      ? await read(db.collection("referralInvites").doc(guest.referralInviteId)) : null;
    const candidate = inviteSnap?.data();
    const invite = candidate && candidate.active !== false &&
      candidate.source === "crew_guest_invite" && candidate.crewId === guest.crewId
      ? { ...candidate, id: inviteSnap.id } : null;
    return { guest, invite };
  }
  const applicationRef = (uid) => db.collection("applications").doc(`crew_guest_${uid}`);
  return {
    async preview(_data, context) {
      const uid = requireGuest(context);
      const [{ invite }, application] = await Promise.all([
        loadOffer(uid, (ref) => ref.get()), applicationRef(uid).get(),
      ]);
      // Deliberately never return inviter names, phone numbers or identifiers.
      return { referralVerified: Boolean(invite), trialDays: invite ? 28 : 7, alreadyApplied: application.exists };
    },
    async submit(data, context) {
      const uid = requireGuest(context);
      const studentName = clean(data?.studentName, 80);
      const grade = clean(data?.grade, 30);
      const parentPhone = String(data?.parentPhone || "").replace(/\D/g, "");
      const selectedCourse = clean(data?.selectedCourse, 80) || "상담 후 선택";
      if (!studentName || !/^(초[1-6]|중[1-3]|고[1-3]|기타)$/.test(grade) ||
          !/^0\d{9,10}$/.test(parentPhone)) {
        throw new HttpsError("invalid-argument", "이름·학년·보호자 연락처를 확인해 주세요.");
      }
      const ref = applicationRef(uid);
      await db.runTransaction(async (tx) => {
        const existing = await tx.get(ref);
        if (existing.exists) return; // Retries and double clicks cannot create duplicate applications.
        const { guest, invite } = await loadOffer(uid, (item) => tx.get(item));
        const referralId = invite ? `application_${ref.id}` : null;
        const now = FieldValue.serverTimestamp();
        tx.set(ref, {
          type: "trial", status: "new", source: "crew_guest", applicantRole: "student",
          applicantName: "학생 간편 신청", studentName, grade, parentPhone, selectedCourse,
          preferredTime: "", message: "학생 초대 경로의 간편 무료체험 신청 · 운영자 전화 확인 후 시작일 안내",
          guestUid: uid, crewId: guest.crewId,
          // Application is a callback request, not evidence of guardian consent.
          phoneVerificationStatus: "pending",
          referralInviteId: invite?.id || null, referralSource: invite?.source || null,
          referrerStudentUid: invite?.referrerStudentUid || null,
          referrerParentUid: invite?.referrerParentUid || null,
          referralStatus: invite ? "applied" : null, referralId,
          oneMonthReferralTrial: Boolean(invite), trialDays: invite ? 28 : 7,
          createdAt: now, updatedAt: now,
        });
        if (invite) tx.set(db.collection("referrals").doc(referralId), {
          applicationId: ref.id, inviteId: invite.id,
          referrerParentUid: invite.referrerParentUid || null,
          referrerStudentUid: invite.referrerStudentUid || null,
          source: invite.source, crewId: guest.crewId,
          applicantStudentName: studentName, referredStudentName: studentName,
          referredParentUid: null, referredStudentUid: null, status: "applied",
          createdAt: now, updatedAt: now,
        });
      });
      return { success: true, id: ref.id };
    },
  };
};
