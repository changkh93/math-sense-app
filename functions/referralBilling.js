const crypto = require("crypto");
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");

const REGION = "asia-northeast3";
const regionalFunctions = functions.region(REGION);
const ENROLLMENT_PAID_STATUSES = new Set(["active_paid", "cancel_scheduled"]);
const REFERRAL_RATES = [0, 0.2, 0.5, 1];

function cleanText(value, maxLength = 200) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function isMonthKey(value) {
  return /^\d{4}-\d{2}$/.test(String(value || ""));
}

function kstDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || "";
  return { year: get("year"), month: get("month"), day: get("day") };
}

function currentMonthKey() {
  const { year, month } = kstDateParts();
  return `${year}-${month}`;
}

function addMonths(monthKey, amount) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthBounds(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: `${monthKey}-01`,
    end: `${monthKey}-${String(lastDay).padStart(2, "0")}`,
  };
}

function referralRate(count) {
  return REFERRAL_RATES[Math.min(3, Math.max(0, Number(count) || 0))];
}

function scheduledFee(account = {}, monthKey) {
  const schedule = account.feeSchedule || {};
  const effectiveMonth = Object.keys(schedule)
    .filter((key) => isMonthKey(key) && key <= monthKey)
    .sort((a, b) => b.localeCompare(a))[0];
  const value = effectiveMonth ? schedule[effectiveMonth] : account.baseMonthlyFee;
  return Math.max(0, Math.round(Number(value) || 0));
}

function formatWon(value) {
  return `${Math.max(0, Math.round(Number(value) || 0)).toLocaleString("ko-KR")}원`;
}

function tokenHash(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function newShareToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function maskName(value) {
  const name = cleanText(value, 50);
  if (!name) return "체험 신청자";
  if (name.length === 1) return `${name}○`;
  if (name.length === 2) return `${name[0]}○`;
  return `${name[0]}${"○".repeat(Math.min(2, name.length - 2))}${name[name.length - 1]}`;
}

async function requireAdmin(context) {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError("unauthenticated", "로그인이 피요합니다.");
  }
  const snap = await admin.firestore().collection("users").doc(context.auth.uid).get();
  if (!snap.exists || snap.data()?.role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "관리자 권한이 피요합니다.");
  }
  return context.auth.uid;
}

async function getParentForStudent(studentUid) {
  const db = admin.firestore();
  const studentSnap = await db.collection("users").doc(studentUid).get();
  if (!studentSnap.exists) return { studentData: null, parentUid: "" };
  const studentData = studentSnap.data() || {};
  if (studentData.parentUid) return { studentData, parentUid: studentData.parentUid };
  const parents = await db.collection("parents").where("childrenUids", "array-contains", studentUid).limit(1).get();
  return { studentData, parentUid: parents.empty ? "" : parents.docs[0].id };
}

async function resolveInvite(token) {
  const normalized = cleanText(token, 200);
  if (!normalized) return null;
  const snap = await admin.firestore().collection("referralInvites")
    .where("tokenHash", "==", tokenHash(normalized)).limit(1).get();
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  const data = docSnap.data() || {};
  if (data.active === false) return null;
  return { id: docSnap.id, ...data };
}

function enrollmentActiveForMonth(enrollment, monthKey) {
  if (!enrollment || !ENROLLMENT_PAID_STATUSES.has(enrollment.status)) return false;
  const { start, end } = monthBounds(monthKey);
  if (enrollment.activeFrom && enrollment.activeFrom > end) return false;
  if (enrollment.activeThrough && enrollment.activeThrough < start) return false;
  return true;
}

async function getActiveReferralFamilies(parentUid, monthKey) {
  const db = admin.firestore();
  const referralSnap = await db.collection("referrals").where("referrerParentUid", "==", parentUid).get();
  const referrals = referralSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((row) => row.status !== "cancelled" && row.status !== "rejected");
  const groups = new Map();
  referrals.forEach((referral) => {
    const key = referral.referredParentUid || (referral.referredStudentUid ? `student:${referral.referredStudentUid}` : "");
    if (!key || key === parentUid) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(referral);
  });

  const qualified = [];
  for (const [key, rows] of groups.entries()) {
    let enrollmentSnap;
    if (key.startsWith("student:")) {
      const studentUid = key.slice("student:".length);
      const snap = await db.collection("studentEnrollments").doc(studentUid).get();
      enrollmentSnap = snap.exists ? [snap.data()] : [];
    } else {
      const snap = await db.collection("studentEnrollments").where("parentUid", "==", key).get();
      enrollmentSnap = snap.docs.map((docSnap) => docSnap.data());
    }
    if (enrollmentSnap.some((row) => enrollmentActiveForMonth(row, monthKey))) {
      qualified.push({ familyKey: key, referralIds: rows.map((row) => row.id) });
    }
  }
  return { referrals, qualified };
}

async function getFamilyBillingSnapshot(parentUid, monthKey) {
  const db = admin.firestore();
  const accountSnap = await db.collection("familyBillingAccounts").doc(parentUid).get();
  const account = accountSnap.exists ? accountSnap.data() || {} : {};
  const baseFee = scheduledFee(account, monthKey);
  const { referrals, qualified } = await getActiveReferralFamilies(parentUid, monthKey);
  const activeReferralCount = qualified.length;
  const discountRate = referralRate(activeReferralCount);
  const discountAmount = Math.round(baseFee * discountRate);
  const finalFee = Math.max(0, baseFee - discountAmount);
  return {
    monthKey,
    account,
    baseFee,
    activeReferralCount,
    discountRate,
    discountAmount,
    finalFee,
    referrals,
    qualifiedReferralIds: qualified.flatMap((row) => row.referralIds),
  };
}

async function addAudit(adminUid, action, targetType, targetId, before, after, reason) {
  await admin.firestore().collection("adminAuditLogs").add({
    adminUid,
    action,
    targetType,
    targetId,
    before: before || null,
    after: after || null,
    reason: cleanText(reason, 500),
    createdAt: FieldValue.serverTimestamp(),
  });
}

async function prepareStatement(parentUid, monthKey, actorUid = "system") {
  const db = admin.firestore();
  const snapshot = await getFamilyBillingSnapshot(parentUid, monthKey);
  const statementId = `${parentUid}_${monthKey}`;
  const statementRef = db.collection("familyBillingStatements").doc(statementId);
  const existing = await statementRef.get();
  const previous = existing.exists ? existing.data() || {} : {};
  const revision = existing.exists ? (Number(previous.revision) || 1) + 1 : 1;
  const { start, end } = monthBounds(monthKey);
  const noticeText = [
    `[메타센스] ${Number(monthKey.slice(5))}월 수강료 안내`,
    `기본 수강료: ${formatWon(snapshot.baseFee)}`,
    `추천 혜택: ${Math.round(snapshot.discountRate * 100)}% 할인`,
    `최종 수강료: ${formatWon(snapshot.finalFee)}`,
    `수강 기간: ${start} ~ ${end}`,
    `유료 수강 중인 추천 가구 ${snapshot.activeReferralCount}명이 반영되었습니다.`,
  ].join("\n");
  const history = Array.isArray(previous.revisionHistory) ? previous.revisionHistory.slice(-9) : [];
  if (existing.exists) {
    history.push({
      revision: previous.revision || 1,
      baseFee: previous.baseFee || 0,
      activeReferralCount: previous.activeReferralCount || 0,
      discountRate: previous.discountRate || 0,
      finalFee: previous.finalFee || 0,
      noticeStatus: previous.noticeStatus || "prepared",
      revisedAt: new Date().toISOString(),
    });
  }
  const payload = {
    parentUid,
    billingMonth: monthKey,
    periodStart: start,
    periodEnd: end,
    baseFee: snapshot.baseFee,
    activeReferralCount: snapshot.activeReferralCount,
    discountRate: snapshot.discountRate,
    discountAmount: snapshot.discountAmount,
    finalFee: snapshot.finalFee,
    qualifiedReferralIds: snapshot.qualifiedReferralIds,
    noticeText,
    noticeStatus: previous.noticeStatus === "sent" ? "revised" : "prepared",
    revision,
    revisionHistory: history,
    preparedBy: actorUid,
    preparedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await statementRef.set(payload, { merge: true });
  return { id: statementId, ...payload };
}

async function buildDashboard(parentUid) {
  const db = admin.firestore();
  const parentSnap = await db.collection("parents").doc(parentUid).get();
  if (!parentSnap.exists || parentSnap.data()?.isDeleted) {
    throw new functions.https.HttpsError("not-found", "학부모 가구를 찾을 수 없습니다.");
  }
  const parentData = parentSnap.data() || {};
  const childUids = Array.isArray(parentData.childrenUids) ? parentData.childrenUids : [];
  const childDocs = await Promise.all(childUids.map((uid) => db.collection("users").doc(uid).get()));
  const enrollmentDocs = await Promise.all(childUids.map((uid) => db.collection("studentEnrollments").doc(uid).get()));
  const children = childDocs.map((docSnap, index) => ({
    uid: childUids[index],
    name: docSnap.exists ? (docSnap.data()?.studentName || docSnap.data()?.name || "학생") : "학생",
    enrollment: enrollmentDocs[index].exists ? enrollmentDocs[index].data() : { status: "trial" },
  }));
  const currentMonth = currentMonthKey();
  const nextMonth = addMonths(currentMonth, 1);
  const [current, next, referralsSnap, statementsSnap] = await Promise.all([
    getFamilyBillingSnapshot(parentUid, currentMonth),
    getFamilyBillingSnapshot(parentUid, nextMonth),
    db.collection("referrals").where("referrerParentUid", "==", parentUid).get(),
    db.collection("familyBillingStatements").where("parentUid", "==", parentUid).get(),
  ]);
  const referrals = referralsSnap.docs.map((docSnap) => {
    const row = docSnap.data() || {};
    return {
      id: docSnap.id,
      maskedName: maskName(row.referredStudentName || row.applicantStudentName),
      source: row.source || "legacy",
      referrerStudentUid: row.referrerStudentUid || "",
      status: row.status || "applied",
      trialStartDate: row.trialStartDate || "",
      trialEndDate: row.trialEndDate || "",
      referredParentUid: row.referredParentUid || "",
      referredStudentUid: row.referredStudentUid || "",
      createdAt: row.createdAt?.toDate?.()?.toISOString?.() || row.createdAt || null,
    };
  });
  const statements = statementsSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .sort((a, b) => String(b.billingMonth || "").localeCompare(String(a.billingMonth || "")))
    .slice(0, 12);
  return {
    parent: { uid: parentUid, name: parentData.name || "", phone: parentData.phone || "" },
    children,
    current: {
      monthKey: current.monthKey,
      baseFee: current.baseFee,
      activeReferralCount: current.activeReferralCount,
      discountRate: current.discountRate,
      discountAmount: current.discountAmount,
      finalFee: current.finalFee,
    },
    next: {
      monthKey: next.monthKey,
      baseFee: next.baseFee,
      activeReferralCount: next.activeReferralCount,
      discountRate: next.discountRate,
      discountAmount: next.discountAmount,
      finalFee: next.finalFee,
    },
    account: current.account,
    referrals,
    statements,
  };
}

const getOrCreateReferralInvite = regionalFunctions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) throw new functions.https.HttpsError("unauthenticated", "로그인해 주세요.");
  const db = admin.firestore();
  const uid = context.auth.uid;
  const source = data?.source === "crew_guest_invite" ? "crew_guest_invite" : "parent_trial_link";
  const crewId = source === "crew_guest_invite" ? cleanText(data?.crewId, 120) : "";
  let parentUid = "";
  let studentUid = "";
  let inviterName = "";

  if (source === "parent_trial_link") {
    const parentSnap = await db.collection("parents").doc(uid).get();
    if (!parentSnap.exists || parentSnap.data()?.isDeleted) {
      throw new functions.https.HttpsError("permission-denied", "학부모 가구만 추천 링크를 만들 수 있습니다.");
    }
    parentUid = uid;
    inviterName = parentSnap.data()?.name || "학부모";
  } else {
    if (!crewId) throw new functions.https.HttpsError("invalid-argument", "크루 정보가 피요합니다.");
    const [{ studentData, parentUid: linkedParentUid }, crewSnap] = await Promise.all([
      getParentForStudent(uid),
      db.collection("crews").doc(crewId).get(),
    ]);
    if (!studentData || !crewSnap.exists) throw new functions.https.HttpsError("not-found", "추천 정보를 확인할 수 없습니다.");
    const crew = crewSnap.data() || {};
    const memberIds = Array.isArray(crew.memberIds) ? crew.memberIds : (Array.isArray(crew.members) ? crew.members.map((m) => typeof m === "string" ? m : m?.uid) : []);
    if (crew.leaderId !== uid && studentData.crewId !== crewId && !memberIds.includes(uid)) {
      throw new functions.https.HttpsError("permission-denied", "해당 크루 승무원만 링크를 만들 수 있습니다.");
    }
    studentUid = uid;
    parentUid = linkedParentUid;
    inviterName = studentData.studentName || studentData.name || "학생";
  }

  if (!parentUid) throw new functions.https.HttpsError("failed-precondition", "학부모 가구와 연결 후 이용해 주세요.");
  const inviteId = source === "parent_trial_link" ? `parent_${parentUid}` : `crew_${crewId}_${studentUid}`;
  const inviteRef = db.collection("referralInvites").doc(inviteId);
  const existing = await inviteRef.get();
  let token = existing.exists ? existing.data()?.shareToken : "";
  if (!token || existing.data()?.active === false) token = newShareToken();
  await inviteRef.set({
    tokenHash: tokenHash(token),
    shareToken: token,
    referrerParentUid: parentUid,
    referrerStudentUid: studentUid || null,
    inviterName,
    source,
    crewId: crewId || null,
    active: true,
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: existing.exists ? (existing.data()?.createdAt || FieldValue.serverTimestamp()) : FieldValue.serverTimestamp(),
  }, { merge: true });
  return { success: true, token, inviteId, source, crewId: crewId || null };
});

const previewReferralInvite = regionalFunctions.https.onCall(async (data) => {
  const invite = await resolveInvite(data?.token);
  if (!invite) throw new functions.https.HttpsError("not-found", "만료된 추천 링크가 압니다.");
  return {
    valid: true,
    inviteId: invite.id,
    source: invite.source,
    crewId: invite.crewId || null,
    inviterLabel: invite.referrerStudentUid ? `${maskName(invite.inviterName)} 학생` : "메타센스 수강생 가구",
    benefit: "one_month_free_trial",
  };
});

const getParentReferralDashboard = regionalFunctions.https.onCall(async (_data, context) => {
  if (!context.auth?.uid) throw new functions.https.HttpsError("unauthenticated", "로그인해 주세요.");
  const parentUid = context.auth.uid;
  const parentSnap = await admin.firestore().collection("parents").doc(parentUid).get();
  if (!parentSnap.exists || parentSnap.data()?.isDeleted) throw new functions.https.HttpsError("permission-denied", "학부모 가구만 열람할 수 있습니다.");
  return buildDashboard(parentUid);
});

const adminGetFamilyBillingDashboard = regionalFunctions.https.onCall(async (data, context) => {
  await requireAdmin(context);
  const parentUid = cleanText(data?.parentUid, 160);
  if (!parentUid) throw new functions.https.HttpsError("invalid-argument", "학부모 UID가 피요합니다.");
  return buildDashboard(parentUid);
});

const adminUpdateFamilyBilling = regionalFunctions.https.onCall(async (data, context) => {
  const adminUid = await requireAdmin(context);
  const parentUid = cleanText(data?.parentUid, 160);
  const monthKey = cleanText(data?.effectiveMonth, 7) || currentMonthKey();
  const baseFee = Math.max(0, Math.round(Number(data?.baseFee) || 0));
  const reason = cleanText(data?.reason, 500);
  if (!parentUid || !isMonthKey(monthKey)) throw new functions.https.HttpsError("invalid-argument", "학부모와 적용 월을 확인해 주세요.");
  if (!reason) throw new functions.https.HttpsError("invalid-argument", "변경 사유를 입력해 주세요.");
  const ref = admin.firestore().collection("familyBillingAccounts").doc(parentUid);
  const beforeSnap = await ref.get();
  const before = beforeSnap.exists ? beforeSnap.data() : null;
  const feeSchedule = { ...(before?.feeSchedule || {}), [monthKey]: baseFee };
  const baselineFee = beforeSnap.exists
    ? Math.max(0, Math.round(Number(before?.baseMonthlyFee) || 0))
    : (monthKey <= currentMonthKey() ? baseFee : 0);
  const after = { parentUid, baseMonthlyFee: baselineFee, feeSchedule, updatedBy: adminUid, updatedAt: FieldValue.serverTimestamp() };
  await ref.set(after, { merge: true });
  await addAudit(adminUid, "update_family_billing", "familyBillingAccount", parentUid, before, { ...after, updatedAt: null }, reason);
  return { success: true, monthKey, baseFee };
});

const adminUpdateStudentEnrollment = regionalFunctions.https.onCall(async (data, context) => {
  const adminUid = await requireAdmin(context);
  const studentUid = cleanText(data?.studentUid, 160);
  const allowed = new Set(["trial", "active_paid", "cancel_scheduled", "paused", "ended", "complimentary"]);
  const status = cleanText(data?.status, 30);
  const activeFrom = cleanText(data?.activeFrom, 10);
  const activeThrough = cleanText(data?.activeThrough, 10);
  const reason = cleanText(data?.reason, 500);
  if (!studentUid || !allowed.has(status)) throw new functions.https.HttpsError("invalid-argument", "학생과 유료 상태를 확인해 주세요.");
  if ((activeFrom && !isIsoDate(activeFrom)) || (activeThrough && !isIsoDate(activeThrough))) throw new functions.https.HttpsError("invalid-argument", "날짜느 YYYY-MM-DD 형식으로 입력해 주세요.");
  if (!reason) throw new functions.https.HttpsError("invalid-argument", "변경 사유를 입력해 주세요.");
  const { studentData, parentUid } = await getParentForStudent(studentUid);
  if (!studentData) throw new functions.https.HttpsError("not-found", "학생을 찾을 수 없습니다.");
  const ref = admin.firestore().collection("studentEnrollments").doc(studentUid);
  const beforeSnap = await ref.get();
  const before = beforeSnap.exists ? beforeSnap.data() : null;
  const after = {
    studentUid,
    parentUid: parentUid || null,
    studentName: studentData.studentName || studentData.name || "",
    status,
    activeFrom: activeFrom || null,
    activeThrough: activeThrough || null,
    updatedBy: adminUid,
    updatedAt: FieldValue.serverTimestamp(),
  };
  await ref.set(after, { merge: true });
  await addAudit(adminUid, "update_student_enrollment", "studentEnrollment", studentUid, before, { ...after, updatedAt: null }, reason);
  return { success: true, parentUid, enrollment: { ...after, updatedAt: null } };
});

const adminConfigureReferralApplication = regionalFunctions.https.onCall(async (data, context) => {
  const adminUid = await requireAdmin(context);
  const applicationId = cleanText(data?.applicationId, 160);
  const status = cleanText(data?.referralStatus, 40) || "trial_scheduled";
  const allowed = new Set(["applied", "trial_scheduled", "trial_active", "trial_ended", "paid_active", "cancelled", "rejected"]);
  const trialStartDate = cleanText(data?.trialStartDate, 10);
  const trialEndDate = cleanText(data?.trialEndDate, 10);
  const referredStudentUid = cleanText(data?.referredStudentUid, 160);
  const reason = cleanText(data?.reason, 500);
  if (!applicationId || !allowed.has(status)) throw new functions.https.HttpsError("invalid-argument", "신청서 정보를 확인해 주세요.");
  if ((trialStartDate && !isIsoDate(trialStartDate)) || (trialEndDate && !isIsoDate(trialEndDate))) throw new functions.https.HttpsError("invalid-argument", "체험일은 YYYY-MM-DD 형식으로 입력해 주세요.");
  if (trialStartDate && trialEndDate && trialEndDate < trialStartDate) throw new functions.https.HttpsError("invalid-argument", "체험 종료일이 시작일보다 암설 수 없습니다.");
  if (!reason) throw new functions.https.HttpsError("invalid-argument", "변경 사유를 입력해 주세요.");
  const db = admin.firestore();
  const appRef = db.collection("applications").doc(applicationId);
  const appSnap = await appRef.get();
  if (!appSnap.exists) throw new functions.https.HttpsError("not-found", "신청서를 찾을 수 없습니다.");
  const application = appSnap.data() || {};
  let referredParentUid = "";
  if (referredStudentUid) referredParentUid = (await getParentForStudent(referredStudentUid)).parentUid;
  const referralId = application.referralId || `application_${applicationId}`;
  const referralRef = db.collection("referrals").doc(referralId);
  const beforeSnap = await referralRef.get();
  const before = beforeSnap.exists ? beforeSnap.data() : null;
  let referrerParentUid = before?.referrerParentUid || application.referrerParentUid || "";
  if (!referrerParentUid && application.referrerParentPhone) {
    const phone = String(application.referrerParentPhone).replace(/[^0-9]/g, "");
    const parentMatch = await db.collection("parents").where("phone", "==", phone).limit(1).get();
    if (!parentMatch.empty && parentMatch.docs[0].data()?.isDeleted !== true) referrerParentUid = parentMatch.docs[0].id;
  }
  if (referredParentUid && referrerParentUid === referredParentUid) {
    throw new functions.https.HttpsError("failed-precondition", "가ᄙ 내부 자기 추천은 등록할 수 없습니다.");
  }
  if (referredParentUid) {
    const existingAttributions = await db.collection("referrals").where("referredParentUid", "==", referredParentUid).get();
    const conflict = existingAttributions.docs.find((docSnap) => {
      if (docSnap.id === referralId) return false;
      const row = docSnap.data() || {};
      return row.status !== "cancelled" && row.status !== "rejected" && row.referrerParentUid !== referrerParentUid;
    });
    if (conflict) {
      throw new functions.https.HttpsError("already-exists", "이미 다른 추천자에게 귀속된 가구입니다.");
    }
    const reverseSnap = await db.collection("referrals").where("referrerParentUid", "==", referredParentUid).get();
    const reverse = reverseSnap.docs.find((docSnap) => {
      const row = docSnap.data() || {};
      return row.referredParentUid === referrerParentUid && row.status !== "cancelled" && row.status !== "rejected";
    });
    if (reverse) {
      throw new functions.https.HttpsError("failed-precondition", "서로 가구가 서로를 추천할 순 없습니다.");
    }
  }
  const payload = {
    applicationId,
    referrerParentUid: referrerParentUid || null,
    referrerStudentUid: before?.referrerStudentUid || application.referrerStudentUid || null,
    source: before?.source || application.referralSource || "legacy_manual",
    applicantStudentName: before?.applicantStudentName || application.studentName || "",
    referredStudentName: before?.referredStudentName || application.studentName || "",
    status,
    trialStartDate: trialStartDate || null,
    trialEndDate: trialEndDate || null,
    referredStudentUid: referredStudentUid || null,
    referredParentUid: referredParentUid || null,
    updatedBy: adminUid,
    updatedAt: FieldValue.serverTimestamp(),
  };
  await Promise.all([
    referralRef.set(payload, { merge: true }),
    appRef.set({
      referralId,
      referralStatus: status,
      trialStartDate: trialStartDate || null,
      trialEndDate: trialEndDate || null,
      referredStudentUid: referredStudentUid || null,
      referredParentUid: referredParentUid || null,
      referrerParentUid: referrerParentUid || null,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true }),
  ]);
  await addAudit(adminUid, "configure_referral_application", "referral", referralId, before, { ...payload, updatedAt: null }, reason);
  return { success: true, referralId, referredParentUid };
});

const adminPrepareFamilyBillingStatement = regionalFunctions.https.onCall(async (data, context) => {
  const adminUid = await requireAdmin(context);
  const parentUid = cleanText(data?.parentUid, 160);
  const monthKey = cleanText(data?.monthKey, 7) || addMonths(currentMonthKey(), 1);
  if (!parentUid || !isMonthKey(monthKey)) throw new functions.https.HttpsError("invalid-argument", "학부모와 정산 월을 확인해 주세요.");
  const statement = await prepareStatement(parentUid, monthKey, adminUid);
  await addAudit(adminUid, "prepare_billing_statement", "familyBillingStatement", statement.id, null, { monthKey, finalFee: statement.finalFee }, data?.reason || "명세 생성/재계산");
  return { success: true, statement: { ...statement, preparedAt: null, updatedAt: null } };
});

const adminMarkBillingNoticeSent = regionalFunctions.https.onCall(async (data, context) => {
  const adminUid = await requireAdmin(context);
  const statementId = cleanText(data?.statementId, 220);
  if (!statementId) throw new functions.https.HttpsError("invalid-argument", "명세 ID가 피요합니다.");
  const ref = admin.firestore().collection("familyBillingStatements").doc(statementId);
  const snap = await ref.get();
  if (!snap.exists) throw new functions.https.HttpsError("not-found", "명세를 찾을 수 없습니다.");
  await ref.set({ noticeStatus: "sent", noticeSentAt: FieldValue.serverTimestamp(), noticeSentBy: adminUid, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await addAudit(adminUid, "mark_billing_notice_sent", "familyBillingStatement", statementId, { noticeStatus: snap.data()?.noticeStatus }, { noticeStatus: "sent" }, data?.reason || "문자 발송 완료");
  return { success: true };
});

const prepareMonthlyFamilyBillingStatements = regionalFunctions.pubsub
  .schedule("0 9 25 * *")
  .timeZone("Asia/Seoul")
  .onRun(async () => {
    const db = admin.firestore();
    const targetMonth = addMonths(currentMonthKey(), 1);
    const accounts = await db.collection("familyBillingAccounts").get();
    let prepared = 0;
    for (const accountDoc of accounts.docs) {
      await prepareStatement(accountDoc.id, targetMonth, "system_monthly_25");
      prepared += 1;
    }
    console.log(`[prepareMonthlyFamilyBillingStatements] ${targetMonth}: ${prepared}`);
    return null;
  });

module.exports = {
  getOrCreateReferralInvite,
  previewReferralInvite,
  getParentReferralDashboard,
  adminGetFamilyBillingDashboard,
  adminUpdateFamilyBilling,
  adminUpdateStudentEnrollment,
  adminConfigureReferralApplication,
  adminPrepareFamilyBillingStatement,
  adminMarkBillingNoticeSent,
  prepareMonthlyFamilyBillingStatements,
  resolveInvite,
  tokenHash,
  __test: { referralRate, scheduledFee, enrollmentActiveForMonth, addMonths, monthBounds },
};
