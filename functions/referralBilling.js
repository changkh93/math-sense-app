const crypto = require("crypto");
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");

const REGION = "asia-northeast3";
const regionalFunctions = functions.region(REGION);
const ENROLLMENT_PAID_STATUSES = new Set(["active_paid", "cancel_scheduled"]);
const REFERRAL_RATES = [0, 0.2, 0.5, 1];
const SOLAPI_SECRET_NAMES = ["SOLAPI_API_KEY", "SOLAPI_API_SECRET", "SOLAPI_SENDER_NUMBER"];
const TUITION_ACCOUNT_TEXT = "KEB하나연행 784-910004-58404 (장기홍)";
const CORRECT_TUITION_ACCOUNT_TEXT = "KEB하나은행 784-910004-58404 (장기홍)";
const DEFAULT_PUBLIC_APP_URL = "https://math-sense-1f6a8.web.app";

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

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeLmsText(value) {
  return String(value || "")
    .normalize("NFC")
    .replace("\uB2E4\uC74C \uB2EC ", "")
    .replace("\uC218\uAC15\uAE30\uAC04", "\uC218\uAC15 \uAE30\uAC04")
    .replace("\uC785\uAE08\uACC4\uC88C", "\uC785\uAE08 \uACC4\uC88C")
    .replace("\uB0A9\uBD80 \uC608\uC815\uAE08\uC561", "\uB0A9\uBD80 \uC608\uC815 \uAE08\uC561")
    .replace("\uB0A9\uBD80 \uC608\uC815\uADF8\uB9E5", "\uB0A9\uBD80 \uC608\uC815 \uAE08\uC561")
    .replace("\uC720\uB8CC \uC218\uAC00 \uC911\uC774\uBA74", "\uC720\uB8CC \uC218\uAC15 \uC911\uC774\uBA74")
    .replace("\uCD94\uCC9C \uB9C1\uD2B8", "\uCD94\uCC9C \uB9C1\uD06C");
}

function publicAppUrl() {
  return String(process.env.METASENSE_PUBLIC_URL || DEFAULT_PUBLIC_APP_URL).replace(/\/$/, "");
}

function _buildTuitionNoticeTextLegacy({ parentName, monthKey, start, end, baseFee, discountRate, finalFee, referralUrl }) {
  const month = Number(String(monthKey || "").slice(5));
  const greeting = cleanText(parentName, 40)
    ? `안녕하세요, ${cleanText(parentName, 40)} 학부모님.`
    : "안녕하세요, 학부모님.";
  return [
    `[메타센스] ${month}월 수강료 안내`,
    greeting,
    `다음 달 ${month}월 수강료를 안ᄂ드립니다.`,
    "",
    `수강기간: ${start} ~ ${end}`,
    `납부 예정그맥: ${formatWon(finalFee)}`,
    `(기본 ${formatWon(baseFee)} · 추천 ${Math.round((Number(discountRate) || 0) * 100)}% 할인)`,
    "",
    "입금계좌",
    TUITION_ACCOUNT_TEXT,
    "",
    "추천 혜택",
    "안내에 따라 안내드린 유료 수강 친구 1가구 20% · 2가구 50% · 3가구 이상 100% 할인",
    "1달 무료체험 추천링트",
    referralUrl,
    "",
    "감사합니다.",
  ].join("\n");
}

function buildTuitionNoticeText({ parentName, monthKey, start, end, baseFee, discountRate, finalFee, referralUrl }) {
  const month = Number(String(monthKey || "").slice(5));
  const greeting = cleanText(parentName, 40)
    ? `안녕하세요, ${cleanText(parentName, 40)}님.`
    : "안녕하세요, 학부모님.";
  return [
    `[메타센스] ${month}월 수강료 안내`,
    greeting,
    `다음 달 ${month}월 수강료를 안내드립니다.`,
    "",
    `수강기간: ${start} ~ ${end}`,
    `납부 예정그맥: ${formatWon(finalFee)}`,
    `(기본 ${formatWon(baseFee)} · 추천 ${Math.round((Number(discountRate) || 0) * 100)}% 할인)`,
    "",
    "입금계좌",
    CORRECT_TUITION_ACCOUNT_TEXT,
    "",
    "추천 혜택",
    "추천한 친구가 유료 수가 중이면 1가구 20% · 2가구 50% · 3가구 이상 100% 할인",
    "1달 무료체험 추천 링트",
    referralUrl,
    "",
    "감사합니다.",
  ].join("\n");
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

async function ensureParentReferralInvite(parentUid, parentData = null) {
  const db = admin.firestore();
  const resolvedParent = parentData || (await db.collection("parents").doc(parentUid).get()).data() || {};
  const inviteId = `parent_${parentUid}`;
  const inviteRef = db.collection("referralInvites").doc(inviteId);
  const existing = await inviteRef.get();
  let token = existing.exists ? existing.data()?.shareToken : "";
  if (!token || existing.data()?.active === false) token = newShareToken();
  await inviteRef.set({
    tokenHash: tokenHash(token),
    shareToken: token,
    referrerParentUid: parentUid,
    referrerStudentUid: null,
    inviterName: resolvedParent.name || "학부모",
    source: "parent_trial_link",
    crewId: null,
    active: true,
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: existing.exists ? (existing.data()?.createdAt || FieldValue.serverTimestamp()) : FieldValue.serverTimestamp(),
  }, { merge: true });
  return { token, inviteId, referralUrl: `${publicAppUrl()}/trial?ref=${encodeURIComponent(token)}` };
}

async function prepareStatement(parentUid, monthKey, actorUid = "system") {
  const db = admin.firestore();
  const [snapshot, parentSnap] = await Promise.all([
    getFamilyBillingSnapshot(parentUid, monthKey),
    db.collection("parents").doc(parentUid).get(),
  ]);
  if (!parentSnap.exists || parentSnap.data()?.isDeleted) {
    throw new Error(`Parent not found: ${parentUid}`);
  }
  const parentData = parentSnap.data() || {};
  const invite = await ensureParentReferralInvite(parentUid, parentData);
  const statementId = `${parentUid}_${monthKey}`;
  const statementRef = db.collection("familyBillingStatements").doc(statementId);
  const existing = await statementRef.get();
  const previous = existing.exists ? existing.data() || {} : {};
  const revision = existing.exists ? (Number(previous.revision) || 1) + 1 : 1;
  const { start, end } = monthBounds(monthKey);
  const noticeText = normalizeLmsText(buildTuitionNoticeText({
    parentName: parentData.name,
    monthKey,
    start,
    end,
    baseFee: snapshot.baseFee,
    discountRate: snapshot.discountRate,
    finalFee: snapshot.finalFee,
    referralUrl: invite.referralUrl,
  }));
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
  const unchangedAfterSend = previous.noticeStatus === "sent"
    && previous.noticeText === noticeText
    && Number(previous.baseFee) === snapshot.baseFee
    && Number(previous.finalFee) === snapshot.finalFee
    && Number(previous.activeReferralCount) === snapshot.activeReferralCount;
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
    recipientPhone: normalizePhone(parentData.phone || parentData.phoneNumber || parentData.contact),
    referralUrl: invite.referralUrl,
    noticeText,
    noticeStatus: unchangedAfterSend ? "sent" : (previous.noticeStatus === "sent" ? "revised" : "prepared"),
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
  if (!parentUid || !isMonthKey(monthKey)) throw new functions.https.HttpsError("invalid-argument", "학부모와 적용 월을 확인해 주세요.");
  if (!reason) throw new functions.https.HttpsError("invalid-argument", "변경 사유를 입력해 주세요.");
  const ref = admin.firestore().collection("familyBillingAccounts").doc(parentUid);
  const beforeSnap = await ref.get();
  const before = beforeSnap.exists ? beforeSnap.data() : null;
  const previousSchedule = before?.feeSchedule || {};
  const previousFee = Object.prototype.hasOwnProperty.call(previousSchedule, monthKey)
    ? Number(previousSchedule[monthKey]) || 0
    : (before ? scheduledFee(before, monthKey) : 0);
  const feeSchedule = { ...previousSchedule, [monthKey]: baseFee };
  const baselineFee = beforeSnap.exists
    ? Math.max(0, Math.round(Number(before?.baseMonthlyFee) || 0))
    : (monthKey <= currentMonthKey() ? baseFee : 0);
  const changeHistory = Array.isArray(before?.changeHistory) ? before.changeHistory.slice(-19) : [];
  changeHistory.push({
    reason,
    monthKey,
    baseFeeFrom: previousFee,
    baseFeeTo: baseFee,
    adminUid,
    changedAt: new Date().toISOString(),
  });
  const after = {
    parentUid,
    baseMonthlyFee: baselineFee,
    feeSchedule,
    lastChangeReason: reason,
    lastChangeMonthKey: monthKey,
    lastChangedAt: FieldValue.serverTimestamp(),
    lastChangedBy: adminUid,
    changeHistory,
    updatedBy: adminUid,
    updatedAt: FieldValue.serverTimestamp(),
  };
  await ref.set(after, { merge: true });
  await addAudit(adminUid, "update_family_billing", "familyBillingAccount", parentUid, before, { ...after, updatedAt: null, lastChangedAt: null }, reason);
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
  const changeHistory = Array.isArray(before?.changeHistory) ? before.changeHistory.slice(-19) : [];
  changeHistory.push({
    reason,
    statusFrom: before?.status || null,
    statusTo: status,
    activeFromFrom: before?.activeFrom || null,
    activeFromTo: activeFrom || null,
    activeThroughFrom: before?.activeThrough || null,
    activeThroughTo: activeThrough || null,
    adminUid,
    changedAt: new Date().toISOString(),
  });
  const after = {
    studentUid,
    parentUid: parentUid || null,
    studentName: studentData.studentName || studentData.name || "",
    status,
    activeFrom: activeFrom || null,
    activeThrough: activeThrough || null,
    lastChangeReason: reason,
    lastChangedAt: FieldValue.serverTimestamp(),
    lastChangedBy: adminUid,
    changeHistory,
    updatedBy: adminUid,
    updatedAt: FieldValue.serverTimestamp(),
  };
  await ref.set(after, { merge: true });
  await addAudit(adminUid, "update_student_enrollment", "studentEnrollment", studentUid, before, { ...after, updatedAt: null, lastChangedAt: null }, reason);
  return { success: true, parentUid, enrollment: { ...after, updatedAt: null, lastChangedAt: null } };
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

function safeProviderError(error) {
  return cleanText(error?.message || error?.code || "SOLAPI 발송에 실패했습니다.", 500);
}

async function sendBillingStatementViaSolapi(statementId, actorUid = "system") {
  const db = admin.firestore();
  const statementRef = db.collection("familyBillingStatements").doc(statementId);
  const statementSnap = await statementRef.get();
  if (!statementSnap.exists) throw new Error(`Billing statement not found: ${statementId}`);
  const statement = statementSnap.data() || {};
  const to = normalizePhone(statement.recipientPhone);
  const from = normalizePhone(process.env.SOLAPI_SENDER_NUMBER);
  if (!/^010\d{8}$/.test(to)) throw new Error("학부모 연락처가 010으로 시작하는 11자리가 아닙니다.");
  if (!/^\d{8,11}$/.test(from)) throw new Error("SOLAPI에 등록된 발신번호를 Firebase Secret에 설정해 주세요.");
  if (!process.env.SOLAPI_API_KEY || !process.env.SOLAPI_API_SECRET) {
    throw new Error("SOLAPI API 인증정보가 Firebase Secret에 설정되지 않았습니다.");
  }

  const jobId = `${statement.parentUid}_${statement.billingMonth}_tuition`;
  const jobRef = db.collection("messageJobs").doc(jobId);
  const acquired = await db.runTransaction(async (transaction) => {
    const jobSnap = await transaction.get(jobRef);
    const job = jobSnap.exists ? jobSnap.data() || {} : {};
    if (job.status === "sent") return false;
    const startedAt = job.attemptStartedAt?.toMillis?.() || 0;
    if (job.status === "sending" && Date.now() - startedAt < 15 * 60 * 1000) return false;
    transaction.set(jobRef, {
      kind: "monthly_tuition_lms",
      parentUid: statement.parentUid,
      statementId,
      billingMonth: statement.billingMonth,
      to,
      status: "sending",
      attemptCount: (Number(job.attemptCount) || 0) + 1,
      attemptStartedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: jobSnap.exists ? (job.createdAt || FieldValue.serverTimestamp()) : FieldValue.serverTimestamp(),
    }, { merge: true });
    return true;
  });
  if (!acquired) return { success: true, skipped: true, jobId };

  try {
    const { SolapiMessageService } = require("solapi");
    const service = new SolapiMessageService(process.env.SOLAPI_API_KEY, process.env.SOLAPI_API_SECRET);
    const result = await service.send({
      to,
      from,
      text: normalizeLmsText(statement.noticeText),
      subject: normalizeLmsText(`[메타센스] ${Number(String(statement.billingMonth).slice(5))}월 수강료 안내`),
      type: "LMS",
      autoTypeDetect: false,
      customFields: { jobId, statementId },
    }, { showMessageList: true });
    const sentPayload = {
      status: "sent",
      provider: "solapi",
      providerGroupId: cleanText(result?.groupId || result?.groupInfo?.groupId, 160) || null,
      providerMessageId: cleanText(result?.messageList?.[0]?.messageId, 160) || null,
      providerStatusCode: cleanText(result?.messageList?.[0]?.statusCode, 40) || null,
      sentAt: FieldValue.serverTimestamp(),
      sentBy: actorUid,
      lastError: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await Promise.all([
      jobRef.set(sentPayload, { merge: true }),
      statementRef.set({
        noticeStatus: "sent",
        noticeSentAt: FieldValue.serverTimestamp(),
        noticeSentBy: actorUid,
        messageJobId: jobId,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true }),
    ]);
    return { success: true, skipped: false, jobId };
  } catch (error) {
    const message = safeProviderError(error);
    await Promise.all([
      jobRef.set({ status: "failed", lastError: message, failedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true }),
      statementRef.set({ noticeStatus: "failed", noticeError: message, messageJobId: jobId, updatedAt: FieldValue.serverTimestamp() }, { merge: true }),
    ]);
    throw new Error(message);
  }
}

const adminSendFamilyBillingNotice = regionalFunctions
  .runWith({ timeoutSeconds: 120, secrets: SOLAPI_SECRET_NAMES })
  .https.onCall(async (data, context) => {
    const adminUid = await requireAdmin(context);
    const statementId = cleanText(data?.statementId, 220);
    if (!statementId) throw new functions.https.HttpsError("invalid-argument", "명세 ID가 피요합니다.");
    try {
      const result = await sendBillingStatementViaSolapi(statementId, adminUid);
      await addAudit(adminUid, "send_billing_notice_solapi", "familyBillingStatement", statementId, null, { skipped: result.skipped }, "SOLAPI LMS 수동 발송");
      return result;
    } catch (error) {
      throw new functions.https.HttpsError("internal", safeProviderError(error));
    }
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

const prepareMonthlyFamilyBillingStatements = regionalFunctions
  .runWith({ timeoutSeconds: 540, memory: "1GB", secrets: SOLAPI_SECRET_NAMES })
  .pubsub
  .schedule("0 9 25 * *")
  .timeZone("Asia/Seoul")
  .onRun(async () => {
    const db = admin.firestore();
    const targetMonth = addMonths(currentMonthKey(), 1);
    const accounts = await db.collection("familyBillingAccounts").get();
    const results = [];
    for (let index = 0; index < accounts.docs.length; index += 5) {
      const chunk = accounts.docs.slice(index, index + 5);
      const chunkResults = await Promise.all(chunk.map(async (accountDoc) => {
        try {
          const statement = await prepareStatement(accountDoc.id, targetMonth, "system_monthly_25");
          const sent = await sendBillingStatementViaSolapi(statement.id, "system_monthly_25");
          return { parentUid: accountDoc.id, ok: true, skipped: sent.skipped };
        } catch (error) {
          console.error(`[prepareMonthlyFamilyBillingStatements] ${accountDoc.id}: ${safeProviderError(error)}`);
          return { parentUid: accountDoc.id, ok: false };
        }
      }));
      results.push(...chunkResults);
    }
    const sent = results.filter((row) => row.ok && !row.skipped).length;
    const skipped = results.filter((row) => row.ok && row.skipped).length;
    const failed = results.filter((row) => !row.ok).length;
    console.log(`[prepareMonthlyFamilyBillingStatements] ${targetMonth}: sent=${sent}, skipped=${skipped}, failed=${failed}`);
    return null;
  });

// 어드민이 학부모에게 인앱 공지를 일괄 발송합니다.
// notifications 컬렉션에 학부모 1명당 1문서를 생성합니다 (문자/SMS가 아님).
// targetUids 가 없으면 isDeleted 가 아닌 전체 학부모에게 발송합니다.
const adminBroadcastParentAnnouncement = regionalFunctions
  .runWith({ timeoutSeconds: 540, memory: "1GB" })
  .https.onCall(async (data, context) => {
    const adminUid = await requireAdmin(context);
    const title = cleanText(data?.title, 120);
    const message = cleanText(data?.message, 1000);
    const link = cleanText(data?.link, 300);
    if (!title || !message) {
      throw new functions.https.HttpsError("invalid-argument", "제목과 본문이 필요합니다.");
    }

    const db = admin.firestore();

    // 대상 학부모 uid 목록. targetUids 가 주어지면 그것만, 없으면 전체 학부모(isDeleted 제외).
    let targetUids = [];
    if (Array.isArray(data?.targetUids) && data.targetUids.length > 0) {
      targetUids = data.targetUids.map((uid) => cleanText(uid, 128)).filter(Boolean);
    } else {
      const parentsSnap = await db.collection("parents").get();
      targetUids = parentsSnap.docs
        .filter((doc) => !doc.data()?.isDeleted)
        .map((doc) => doc.id);
    }

    if (targetUids.length === 0) {
      await addAudit(adminUid, "broadcast_parent_announcement", "parents", null, null, { count: 0, title }, "대상 학부모 없음");
      return { sent: 0, skipped: 0, failed: 0 };
    }

    const announcementId = `${Date.now()}_${adminUid.slice(0, 8)}`;
    let sent = 0;
    let failed = 0;

    // 400개씩 청크로 분할 (Firestore batch 한도 500건 대비).
    for (let i = 0; i < targetUids.length; i += 400) {
      const chunk = targetUids.slice(i, i + 400);
      const batch = db.batch();
      chunk.forEach((parentUid) => {
        batch.set(
          db.collection("notifications").doc(`parent_announcement_${announcementId}_${parentUid}`),
          {
            recipientId: parentUid,
            type: "parent_announcement",
            title,
            message,
            link: link || null,
            isRead: false,
            createdAt: FieldValue.serverTimestamp(),
            metadata: { announcementId, title, createdBy: adminUid },
          },
          { merge: true }
        );
      });
      try {
        await batch.commit();
        sent += chunk.length;
      } catch (error) {
        console.error(`[adminBroadcastParentAnnouncement] chunk failed: ${safeProviderError(error)}`);
        failed += chunk.length;
      }
    }

    await addAudit(
      adminUid,
      "broadcast_parent_announcement",
      "parents",
      null,
      null,
      { count: sent, failed, title, link: link || null },
      cleanText(data?.reason, 500) || `학부모 공지 발송: ${title}`
    );

    return { sent, skipped: targetUids.length - sent, failed };
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
  adminSendFamilyBillingNotice,
  adminMarkBillingNoticeSent,
  prepareMonthlyFamilyBillingStatements,
  adminBroadcastParentAnnouncement,
  resolveInvite,
  tokenHash,
  __test: { referralRate, scheduledFee, enrollmentActiveForMonth, addMonths, monthBounds, buildTuitionNoticeText, normalizePhone, normalizeLmsText },
};
