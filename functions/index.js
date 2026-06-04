const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const { FieldPath, FieldValue } = require("firebase-admin/firestore");
const PROJECT_ID = "math-sense-1f6a8";
const STORAGE_BUCKET = "math-sense-1f6a8.firebasestorage.app";
try {
  admin.initializeApp({
    projectId: PROJECT_ID,
    storageBucket: STORAGE_BUCKET,
  });
} catch (e) {}
const cors = require("cors")({ origin: true });
const fetch = require("node-fetch");
const FUNCTIONS_REGION = "asia-northeast3";
const regionalFunctions = functions.region(FUNCTIONS_REGION);
const accountDeletionFunctions = regionalFunctions.runWith({ timeoutSeconds: 540, memory: "1GB" });
const DIRECT_MEMO_MAX_LENGTH = 2000;
const DIRECT_MEMO_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const CRYSTAL_GIFT_DAILY_LIMIT = 50;
const STORE_RADAR_DURATION_DAYS = 7;
const STORE_PHOTON_SHIELD_CHARGES_PER_GIFT = 10;
const STORE_PHOTON_SHIELD_MAX_CHARGES = 20;
const STORE_ITEM_GIFT_CATALOG = {
  cryo_core: {
    name: "크라이오 코어",
    cost: 100,
    ownedMode: "count",
    senderField: "streakFreezeCount",
    recipientField: "streakFreezeCount",
    transferAmount: 1,
  },
  photon_shield: {
    name: "광자 실드",
    cost: 20,
    ownedMode: "count",
    senderField: "shieldCharges",
    recipientField: "shieldCharges",
    transferAmount: STORE_PHOTON_SHIELD_CHARGES_PER_GIFT,
    maxRecipientValue: STORE_PHOTON_SHIELD_MAX_CHARGES,
  },
  radar: {
    name: "첨단 마이닝 스캐너",
    cost: 100,
    ownedMode: "purchase_only",
  },
  signature_unlock: {
    name: "시그니처 해금",
    cost: 30,
    ownedMode: "purchase_only",
    uniqueField: "profileSignatureUnlocked",
  },
  frame_nebula: {
    name: "네뷸라 프레임",
    cost: 50,
    ownedMode: "purchase_only",
    frameId: "nebula",
  },
  frame_solar: {
    name: "솔라 프레임",
    cost: 150,
    ownedMode: "purchase_only",
    frameId: "solar",
  },
  hall_showcase_credit: {
    name: "명예의 전당 쇼케이스",
    cost: 50,
    ownedMode: "count",
    senderField: "hallShowcaseCredits",
    recipientField: "hallShowcaseCredits",
    transferAmount: 1,
  },
  crew_creation_pass: {
    name: "스터디 크루 창설권",
    cost: 1000,
    ownedMode: "count",
    senderField: "crewCreationPasses",
    recipientField: "crewCreationPasses",
    transferAmount: 1,
  },
  crew_join_pass: {
    name: "스터디 크루 참여권",
    cost: 300,
    ownedMode: "count",
    senderField: "crewJoinPasses",
    recipientField: "crewJoinPasses",
    transferAmount: 1,
  },
};
const ASSIGNMENT_MISSING_LOOKBACK_DAYS = 7;
const ASSIGNMENT_MISSING_GRACE_MS = 12 * 60 * 60 * 1000;
const ASSIGNMENT_MISSING_BASE_PENALTY = 15;
const ASSIGNMENT_MISSING_STEP_PENALTY = 5;
const ASSIGNMENT_MISSING_MAX_PENALTY = 25;
const AGORA_BASE_ACCEPT_REWARD = 20;
const AGORA_ASKER_RESOLVE_REWARD = 5;
const ASSIGNMENT_SHARE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const ASSIGNMENT_SHARE_REACTION_REWARD = 1;
const STUDENT_AUTH_DOMAIN = "student.mathsense.app";

function buildAssignmentHubLink(clusterId, date) {
  const params = new URLSearchParams({ view: "assignment_hub" });
  if (clusterId) params.set("clusterId", String(clusterId));
  if (date) params.set("date", String(date));
  return `/?${params.toString()}`;
}

function getAssignmentNotificationClusterLabel(clusterId) {
  if (!clusterId) return "해당 과정";
  if (clusterId === "cluster_elementary") return "초등수학";
  if (clusterId === "cluster_middle") return "중등수학";
  return String(clusterId);
}

function cleanText(value, maxLength = 200) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function digitsOnly(value, maxLength = 20) {
  return String(value || "").replace(/[^0-9]/g, "").slice(0, maxLength);
}

function isDeletedMemberData(data = {}) {
  return data?.isDeleted === true ||
    data?.accountStatus === "deleted" ||
    Boolean(data?.deletedAt);
}

function buildStudentEmail(loginId) {
  return `${String(loginId || "").toLowerCase()}@${STUDENT_AUTH_DOMAIN}`;
}

async function requireParentDoc(uid) {
  if (!uid) {
    throw new functions.https.HttpsError("unauthenticated", "로그인이 필요합니다.");
  }
  const parentRef = admin.firestore().collection("parents").doc(uid);
  const parentSnap = await parentRef.get();
  if (!parentSnap.exists || parentSnap.data()?.isDeleted) {
    throw new functions.https.HttpsError("permission-denied", "학부모 계정이 필요합니다.");
  }
  return { parentRef, parentData: parentSnap.data() || {} };
}

function buildDefaultStudentUserData({ uid, email, studentName, loginId, grade, parentUid }) {
  return {
    crystals: 0,
    totalQuizzes: 0,
    totalScore: 0,
    averageScore: 0,
    perfectCount: 0,
    spaceshipLevel: 1,
    helpCount: 0,
    questionCount: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastStreakDate: "",
    streakFreezeCount: 0,
    streakFreezeLastPurchasedAtMs: 0,
    streakMilestones: [],
    shieldCharges: 0,
    hasRadar: false,
    radarExpiresAtMs: 0,
    publicProfileEnabled: false,
    publicDisplayName: studentName,
    publicTitle: "",
    publicSignature: "",
    profileSignatureUnlocked: false,
    ownedProfileFrames: ["starter"],
    selectedProfileFrame: "starter",
    hallShowcaseCredits: 0,
    hallSpotlightUntilMs: 0,
    crewCreationPasses: 0,
    crewJoinPasses: 0,
    crewId: "",
    crewName: "",
    crewRole: "",
    crewColor: "#00f3ff",
    crewStatus: "",
    crewGroupName: "",
    crewInviteCode: "",
    crewActiveStudyRoomId: "",
    crewActiveStudyRoomStatus: "",
    crewSnapshot: null,
    clusterAccess: { cluster_elementary: "active" },
    uid,
    email,
    name: studentName,
    studentName,
    loginId,
    grade,
    parentUid,
    role: "student",
    accountSource: "parent_created",
    createdAt: new Date().toISOString(),
    createdAtServer: FieldValue.serverTimestamp(),
  };
}

const KST_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const KST_WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Seoul",
  weekday: "short",
});

const KST_WEEKDAY_INDEX = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getKSTDateString(date = new Date()) {
  return KST_FORMATTER.format(date);
}

function getKSTDateParts(date = new Date()) {
  const parts = Object.fromEntries(
    KST_FORMATTER.formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );
  return {
    ...parts,
    dayOfWeek: KST_WEEKDAY_INDEX[KST_WEEKDAY_FORMATTER.format(date)],
  };
}

function getKSTWeekMondayString(date = new Date()) {
  const parts = getKSTDateParts(date);
  const mondayOffset = (parts.dayOfWeek + 6) % 7;
  const kstMidnightUtcMs = Date.UTC(parts.year, parts.month - 1, parts.day) - (9 * 60 * 60 * 1000);
  return getKSTDateString(new Date(kstMidnightUtcMs - (mondayOffset * 24 * 60 * 60 * 1000)));
}

function calculateGrowthUpdates(userData, earnedAmount) {
  if (!earnedAmount || earnedAmount <= 0 || !userData) return {};

  const todayKST = getKSTDateString();
  const mondayKST = getKSTWeekMondayString();
  return {
    dailyGrowth: userData.dailyGrowthDate === todayKST
      ? Number(userData.dailyGrowth || 0) + earnedAmount
      : earnedAmount,
    dailyGrowthDate: todayKST,
    weeklyGrowth: userData.weeklyGrowthMonday === mondayKST
      ? Number(userData.weeklyGrowth || 0) + earnedAmount
      : earnedAmount,
    weeklyGrowthMonday: mondayKST,
  };
}

function recordCrystalTransaction(transaction, userId, txId, { amount, type, description, metadata = {} }) {
  if (!userId || (amount === 0 && type !== "streak_freeze")) return;

  const txRef = admin.firestore()
    .collection("users")
    .doc(userId)
    .collection("crystal_transactions")
    .doc(txId);

  transaction.set(txRef, {
    amount,
    type,
    description,
    metadata,
    timestamp: FieldValue.serverTimestamp(),
  });
}

function buildAgoraRewardMetadata(questionId, answerId, questionData = {}, askerUid = "") {
  const content = String(questionData.content || "").replace(/\s+/g, " ").trim();
  const questionPreview = content.length > 90 ? `${content.slice(0, 90)}...` : content;
  return {
    questionId,
    answerId,
    questionPreview,
    askerUid,
    askerName: questionData.userName || questionData.askerName || "질문자",
  };
}

function getLockedBountyAmount(questionData = {}) {
  return questionData.bountyStatus === "locked"
    ? Math.max(0, Number(questionData.bountyAmount || 0))
    : 0;
}

function makeQuizQuestionStatId(unitId, questionId) {
  return encodeURIComponent(`${unitId || "unknown"}__${questionId || "unknown"}`);
}

function normalizeStatKey(value) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 64);
}

function normalizeOptionSummaries(optionSummaries = []) {
  return (Array.isArray(optionSummaries) ? optionSummaries : [])
    .slice(0, 10)
    .reduce((acc, option, index) => {
      const key = normalizeStatKey(option?.key || `o${index}`);
      if (!key) return acc;
      acc[key] = {
        text: String(option?.text || "").slice(0, 300),
        isCorrect: option?.isCorrect === true,
        diagnosticLabel: String(option?.diagnosticLabel || "").slice(0, 120),
      };
      return acc;
    }, {});
}

function addStatDelta(deltas, fieldName, amount) {
  deltas[fieldName] = (deltas[fieldName] || 0) + amount;
}

function applyStatDeltas(statUpdates, deltas) {
  Object.entries(deltas).forEach(([fieldName, amount]) => {
    if (amount !== 0) {
      statUpdates[fieldName] = FieldValue.increment(amount);
    }
  });
}

/**
 * submitQuizQuestionReaction
 *
 * Stores one anonymous aggregate response per student per quiz question.
 * If the same student answers the same question again, the aggregate is adjusted
 * instead of counted twice.
 */
exports.submitQuizQuestionReaction = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const unitId = typeof data?.unitId === "string" ? data.unitId.trim() : "";
  const questionId = typeof data?.questionId === "string" ? data.questionId.trim() : "";
  const selectedOptionKeys = Array.isArray(data?.selectedOptionKeys)
    ? data.selectedOptionKeys.map(normalizeStatKey).filter(Boolean).slice(0, 10)
    : [];
  const reactionId = normalizeStatKey(data?.reactionId || "");
  const isCorrect = data?.isCorrect === true;
  const questionText = String(data?.questionText || "").replace(/\s+/g, " ").trim().slice(0, 500);
  const unitTitle = String(data?.unitTitle || "").trim().slice(0, 200);
  const optionSummaries = normalizeOptionSummaries(data?.optionSummaries || []);

  if (!unitId || !questionId || selectedOptionKeys.length === 0 || !reactionId) {
    throw new functions.https.HttpsError("invalid-argument", "퀴즈 반응 정보가 올바르지 않습니다.");
  }

  const db = admin.firestore();
  const statId = makeQuizQuestionStatId(unitId, questionId);
  const statRef = db.collection("quizQuestionStats").doc(statId);
  const responseRef = db.collection("quizQuestionResponses").doc(`${uid}_${statId}`);
  const now = FieldValue.serverTimestamp();

  await db.runTransaction(async (transaction) => {
    const responseSnap = await transaction.get(responseRef);
    const statDeltas = {};
    const statUpdates = {
      unitId,
      questionId,
      unitTitle,
      questionText,
      optionSummaries,
      updatedAt: now,
    };

    if (responseSnap.exists) {
      const previous = responseSnap.data() || {};
      const previousKeys = Array.isArray(previous.selectedOptionKeys)
        ? previous.selectedOptionKeys.map(normalizeStatKey).filter(Boolean)
        : [];
      const previousReaction = normalizeStatKey(previous.reactionId || "");

      previousKeys.forEach((key) => {
        addStatDelta(statDeltas, `optionCounts.${key}`, -1);
      });
      if (previousReaction) {
        addStatDelta(statDeltas, `reactionCounts.${previousReaction}`, -1);
      }
      if (previous.isCorrect === true && !isCorrect) {
        statUpdates.correctResponses = FieldValue.increment(-1);
      } else if (previous.isCorrect !== true && isCorrect) {
        statUpdates.correctResponses = FieldValue.increment(1);
      }
    } else {
      statUpdates.totalResponses = FieldValue.increment(1);
      if (isCorrect) statUpdates.correctResponses = FieldValue.increment(1);
      statUpdates.createdAt = now;
    }

    selectedOptionKeys.forEach((key) => {
      addStatDelta(statDeltas, `optionCounts.${key}`, 1);
    });
    addStatDelta(statDeltas, `reactionCounts.${reactionId}`, 1);
    applyStatDeltas(statUpdates, statDeltas);

    transaction.set(statRef, statUpdates, { merge: true });
    transaction.set(responseRef, {
      uid,
      unitId,
      questionId,
      selectedOptionKeys,
      reactionId,
      isCorrect,
      updatedAt: now,
      createdAt: responseSnap.exists ? (responseSnap.data()?.createdAt || now) : now,
    }, { merge: true });
  });

  return { success: true, statId };
});

/**
 * submitQuizSessionReactions
 *
 * Stores anonymous quiz answer/reaction aggregates once at the end of a quiz
 * session. Each student still has one response document per question, so retrying
 * the final submit adjusts prior counts instead of double-counting them.
 */
exports.submitQuizSessionReactions = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const unitId = typeof data?.unitId === "string" ? data.unitId.trim() : "";
  const unitTitle = String(data?.unitTitle || "").trim().slice(0, 200);
  const rawReactions = Array.isArray(data?.reactions) ? data.reactions : [];

  if (!unitId) {
    throw new functions.https.HttpsError("invalid-argument", "퀴즈 세션 정보가 올바르지 않습니다.");
  }

  const dedupedReactions = new Map();
  rawReactions.slice(0, 100).forEach((reaction) => {
    const questionId = typeof reaction?.questionId === "string" ? reaction.questionId.trim() : "";
    const selectedOptionKeys = Array.isArray(reaction?.selectedOptionKeys)
      ? reaction.selectedOptionKeys.map(normalizeStatKey).filter(Boolean).slice(0, 10)
      : [];
    const reactionId = normalizeStatKey(reaction?.reactionId || "");
    if (!questionId || selectedOptionKeys.length === 0 || !reactionId) return;

    const statId = makeQuizQuestionStatId(unitId, questionId);
    dedupedReactions.set(statId, {
      statId,
      questionId,
      selectedOptionKeys,
      reactionId,
      isCorrect: reaction?.isCorrect === true,
      questionText: String(reaction?.questionText || "").replace(/\s+/g, " ").trim().slice(0, 500),
      unitTitle: String(reaction?.unitTitle || unitTitle).trim().slice(0, 200),
      optionSummaries: normalizeOptionSummaries(reaction?.optionSummaries || []),
    });
  });

  const reactions = Array.from(dedupedReactions.values());
  if (reactions.length === 0) {
    return { success: true, savedCount: 0 };
  }

  const db = admin.firestore();
  const now = FieldValue.serverTimestamp();

  await db.runTransaction(async (transaction) => {
    const items = [];

    for (const reaction of reactions) {
      const statRef = db.collection("quizQuestionStats").doc(reaction.statId);
      const responseRef = db.collection("quizQuestionResponses").doc(`${uid}_${reaction.statId}`);
      const responseSnap = await transaction.get(responseRef);
      items.push({ reaction, statRef, responseRef, responseSnap });
    }

    items.forEach(({ reaction, statRef, responseRef, responseSnap }) => {
      const statDeltas = {};
      const statUpdates = {
        unitId,
        questionId: reaction.questionId,
        unitTitle: reaction.unitTitle,
        questionText: reaction.questionText,
        optionSummaries: reaction.optionSummaries,
        updatedAt: now,
      };

      if (responseSnap.exists) {
        const previous = responseSnap.data() || {};
        const previousKeys = Array.isArray(previous.selectedOptionKeys)
          ? previous.selectedOptionKeys.map(normalizeStatKey).filter(Boolean)
          : [];
        const previousReaction = normalizeStatKey(previous.reactionId || "");

        previousKeys.forEach((key) => {
          addStatDelta(statDeltas, `optionCounts.${key}`, -1);
        });
        if (previousReaction) {
          addStatDelta(statDeltas, `reactionCounts.${previousReaction}`, -1);
        }
        if (previous.isCorrect === true && !reaction.isCorrect) {
          statUpdates.correctResponses = FieldValue.increment(-1);
        } else if (previous.isCorrect !== true && reaction.isCorrect) {
          statUpdates.correctResponses = FieldValue.increment(1);
        }
      } else {
        statUpdates.totalResponses = FieldValue.increment(1);
        if (reaction.isCorrect) statUpdates.correctResponses = FieldValue.increment(1);
        statUpdates.createdAt = now;
      }

      reaction.selectedOptionKeys.forEach((key) => {
        addStatDelta(statDeltas, `optionCounts.${key}`, 1);
      });
      addStatDelta(statDeltas, `reactionCounts.${reaction.reactionId}`, 1);
      applyStatDeltas(statUpdates, statDeltas);

      transaction.set(statRef, statUpdates, { merge: true });
      transaction.set(responseRef, {
        uid,
        unitId,
        questionId: reaction.questionId,
        selectedOptionKeys: reaction.selectedOptionKeys,
        reactionId: reaction.reactionId,
        isCorrect: reaction.isCorrect,
        updatedAt: now,
        createdAt: responseSnap.exists ? (responseSnap.data()?.createdAt || now) : now,
      }, { merge: true });
    });
  });

  return { success: true, savedCount: reactions.length };
});

exports.submitPublicApplication = regionalFunctions.https.onCall(async (data) => {
  const type = cleanText(data?.type, 30);
  if (!["trial", "consultation"].includes(type)) {
    throw new functions.https.HttpsError("invalid-argument", "신청 종류가 올바르지 않습니다.");
  }

  const applicantName = cleanText(data?.applicantName, 80);
  const parentPhone = digitsOnly(data?.parentPhone, 16);
  const studentName = cleanText(data?.studentName, 80);
  const grade = cleanText(data?.grade, 30);
  const message = cleanText(data?.message, 1000);
  const referredStudentName = cleanText(data?.referredStudentName, 80);
  const referrerParentPhone = digitsOnly(data?.referrerParentPhone, 16);
  const preferredTime = cleanText(data?.preferredTime, 80);
  const selectedCourse = cleanText(data?.selectedCourse, 80);

  if (!applicantName || parentPhone.length < 10 || !studentName || !grade) {
    throw new functions.https.HttpsError("invalid-argument", "필수 정보를 확인해 주세요.");
  }

  const payload = {
    type,
    status: "new",
    applicantName,
    parentPhone,
    studentName,
    grade,
    message,
    preferredTime,
    selectedCourse,
    referredStudentName,
    referrerParentPhone,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    source: "public_site",
  };

  const ref = await admin.firestore().collection("applications").add(payload);
  return { success: true, id: ref.id };
});

exports.registerParentProfile = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const token = context.auth?.token || {};
  const signInProvider = token.firebase?.sign_in_provider || "";
  const parentName = cleanText(data?.parentName || token.name, 80);
  const phone = digitsOnly(data?.phone, 16);
  const marketingConsent = data?.marketingConsent === true;
  const termsAccepted = data?.termsAccepted === true;

  if (signInProvider !== "google.com") {
    throw new functions.https.HttpsError("failed-precondition", "Google 인증 후 학부모 회원가입을 진행해 주세요.");
  }
  if (!parentName || phone.length < 10 || !termsAccepted) {
    throw new functions.https.HttpsError("invalid-argument", "이름, 전화번호, 필수 약관 동의가 필요합니다.");
  }

  const db = admin.firestore();
  const studentUserSnap = await db.collection("users").doc(uid).get();
  if (studentUserSnap.exists && !isDeletedMemberData(studentUserSnap.data())) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "이미 학생 계정으로 사용 중인 Google 계정입니다. 학부모 가입은 다른 Google 계정으로 진행해 주세요."
    );
  }

  const samePhoneSnap = await db.collection("parents").where("phone", "==", phone).limit(5).get();
  for (const parentDoc of samePhoneSnap.docs) {
    if (parentDoc.id === uid) continue;
    const parentData = parentDoc.data() || {};
    if (isDeletedMemberData(parentData)) {
      throw new functions.https.HttpsError("failed-precondition", "비활성화된 학부모 전화번호입니다. 선생님에게 문의해 주세요.");
    }
    throw new functions.https.HttpsError("already-exists", "이미 등록된 학부모 전화번호입니다.");
  }

  const parentRef = db.collection("parents").doc(uid);
  const parentSnap = await parentRef.get();
  const existingChildren = parentSnap.exists && Array.isArray(parentSnap.data()?.childrenUids)
    ? parentSnap.data().childrenUids
    : [];

  await parentRef.set({
    name: parentName,
    phone,
    loginId: phone,
    loginEmail: `${phone}@parent.mathsense.app`,
    email: token.email || "",
    photoURL: token.picture || "",
    childrenUids: existingChildren,
    role: "parent",
    authProvider: "google",
    authProviders: FieldValue.arrayUnion("google.com"),
    isDeleted: false,
    termsAccepted: true,
    termsAcceptedAt: FieldValue.serverTimestamp(),
    marketingConsent,
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: parentSnap.exists ? (parentSnap.data()?.createdAt || FieldValue.serverTimestamp()) : FieldValue.serverTimestamp(),
  }, { merge: true });

  return { success: true };
});

exports.createChildAccountForParent = regionalFunctions.https.onCall(async (data, context) => {
  const parentUid = await requireAuthUid(context);
  const { parentRef } = await requireParentDoc(parentUid);
  const studentName = cleanText(data?.studentName, 80);
  const loginId = cleanText(data?.loginId, 40).toLowerCase();
  const password = String(data?.password || "");
  const grade = cleanText(data?.grade, 30);
  const birthDate = digitsOnly(data?.birthDate, 8);

  if (!studentName || !grade) {
    throw new functions.https.HttpsError("invalid-argument", "자녀 이름과 학년을 입력해 주세요.");
  }
  if (!/^[a-z0-9][a-z0-9._-]{5,19}$/.test(loginId)) {
    throw new functions.https.HttpsError("invalid-argument", "아이디는 영문 소문자/숫자 조합 6~20자로 입력해 주세요.");
  }
  if (password.length < 6) {
    throw new functions.https.HttpsError("invalid-argument", "비밀번호는 6자 이상이어야 합니다.");
  }

  const email = buildStudentEmail(loginId);
  let createdUser;
  try {
    createdUser = await admin.auth().createUser({
      email,
      password,
      displayName: studentName,
      disabled: false,
    });
  } catch (err) {
    if (err?.code === "auth/email-already-exists") {
      throw new functions.https.HttpsError("already-exists", "이미 사용 중인 아이디입니다.");
    }
    console.error("createChildAccountForParent auth error:", err);
    throw new functions.https.HttpsError("internal", "자녀 계정 생성 중 오류가 발생했습니다.");
  }

  const userRef = admin.firestore().collection("users").doc(createdUser.uid);
  const userData = buildDefaultStudentUserData({
    uid: createdUser.uid,
    email,
    studentName,
    loginId,
    grade,
    parentUid,
  });
  if (birthDate) userData.birthDate = birthDate;

  await userRef.set(userData, { merge: true });
  await parentRef.set({
    childrenUids: FieldValue.arrayUnion(createdUser.uid),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  return { success: true, childUid: createdUser.uid, loginId, studentName };
});

/**
 * fetchNotebook
 * 
 * Receives a Colab/Drive URL, extracts the file ID,
 * downloads the .ipynb JSON from Google Drive's public export,
 * parses the cells, and returns them for client-side rendering.
 * 
 * Usage: POST /fetchNotebook { url: "https://colab.research.google.com/drive/FILE_ID..." }
 * Returns: { cells: [ { cell_type, source, outputs }, ... ], metadata }
 */
exports.fetchNotebook = regionalFunctions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      // Only allow POST
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      // Extract Google Drive File ID from various URL formats
      const fileId = extractFileId(url);
      if (!fileId) {
        return res.status(400).json({ error: "Could not extract file ID from URL" });
      }

      // Download .ipynb from Google Drive (public file)
      // Using the export download endpoint for publicly shared files
      const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      
      const response = await fetch(downloadUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
        redirect: "follow",
      });

      if (!response.ok) {
        // Try alternative endpoint
        const altUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${process.env.GOOGLE_API_KEY || ""}`;
        const altResponse = await fetch(altUrl);
        
        if (!altResponse.ok) {
          return res.status(404).json({ 
            error: "노트북을 가져올 수 없습니다. 파일이 '링크가 있는 모든 사용자에게 공개'로 공유되어 있는지 확인해주세요." 
          });
        }
        
        const notebook = await altResponse.json();
        return res.json(parseNotebook(notebook));
      }

      // Check if we got HTML instead of JSON (Google's download warning page)
      const contentType = response.headers.get("content-type") || "";
      const text = await response.text();
      
      // Google sometimes returns an HTML confirmation page for large files
      if (contentType.includes("text/html") || text.trim().startsWith("<!")) {
        // Try to extract the confirmation link
        const confirmMatch = text.match(/confirm=([0-9A-Za-z_]+)/);
        if (confirmMatch) {
          const confirmUrl = `https://drive.google.com/uc?export=download&confirm=${confirmMatch[1]}&id=${fileId}`;
          const confirmResponse = await fetch(confirmUrl, {
            headers: { "User-Agent": "Mozilla/5.0" },
            redirect: "follow",
          });
          const confirmText = await confirmResponse.text();
          try {
            const notebook = JSON.parse(confirmText);
            return res.json(parseNotebook(notebook));
          } catch {
            return res.status(422).json({ 
              error: "파일을 파싱할 수 없습니다. Colab 노트북(.ipynb) 파일인지 확인해주세요." 
            });
          }
        }
        return res.status(422).json({ 
          error: "노트북을 가져올 수 없습니다. 파일이 공개 공유되어 있는지 확인해주세요." 
        });
      }

      // Parse the notebook JSON
      try {
        const notebook = JSON.parse(text);
        return res.json(parseNotebook(notebook));
      } catch {
        return res.status(422).json({ 
          error: "파일을 파싱할 수 없습니다. Colab 노트북(.ipynb) 파일인지 확인해주세요." 
        });
      }

    } catch (error) {
      console.error("fetchNotebook error:", error);
      return res.status(500).json({ error: "서버 오류가 발생했습니다." });
    }
  });
});

/**
 * Extract Google Drive file ID from various URL formats:
 * - https://colab.research.google.com/drive/FILE_ID
 * - https://colab.research.google.com/drive/FILE_ID?usp=sharing
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/open?id=FILE_ID
 */
/**
 * Extract Google Drive file ID from various URL formats.
 * IDs are typically 33-44 characters of alphanumeric characters, underscores, and hyphens.
 */
function extractFileId(url) {
  // Common patterns for Google Drive and Colab IDs
  const idPattern = /[a-zA-Z0-9_-]{25,50}/;
  
  // 1. Colab/Drive direct file patterns
  const patterns = [
    /colab\.research\.google\.com\/drive\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/, // Just in case
    /drive\.google\.com\/uc\?id=([a-zA-Z0-9_-]+)/
  ];

  for (const regex of patterns) {
    const match = url.match(regex);
    if (match && match[1]) return match[1];
  }

  // 2. Fallback for raw IDs if they look like a Google ID (at least 25 chars)
  // This helps if the user pasted only the ID or some weird combined string
  const urlParams = new URLSearchParams(url.split('?')[1] || "");
  if (urlParams.has('id')) {
    const id = urlParams.get('id');
    if (idPattern.test(id)) return id;
  }

  // 3. Last resort: try to find anything that looks like an ID in the path
  const parts = url.split('/');
  for (const part of parts) {
    // Google IDs are long and distinct. Check for length and pattern.
    if (part.length >= 28 && idPattern.test(part)) {
      // Remove any query params attached to the part
      return part.split(/[?#]/)[0];
    }
  }

  return null;
}

/**
 * Parse .ipynb notebook JSON into a simplified format for frontend rendering.
 * Standard .ipynb format: { cells: [{ cell_type, source, outputs }], metadata }
 */
function parseNotebook(notebook) {
  const cells = (notebook.cells || []).map((cell, index) => {
    const parsed = {
      index,
      cell_type: cell.cell_type, // "markdown", "code", "raw"
      source: Array.isArray(cell.source) ? cell.source.join("") : (cell.source || ""),
    };

    // Parse outputs for code cells
    if (cell.cell_type === "code" && cell.outputs) {
      parsed.outputs = cell.outputs.map(output => {
        const result = { output_type: output.output_type };

        // Stream output (stdout/stderr)
        if (output.output_type === "stream") {
          result.text = Array.isArray(output.text) ? output.text.join("") : (output.text || "");
          result.name = output.name; // "stdout" or "stderr"
        }

        // execute_result or display_data
        if (output.output_type === "execute_result" || output.output_type === "display_data") {
          const data = output.data || {};
          
          // Text output
          if (data["text/plain"]) {
            result.text = Array.isArray(data["text/plain"]) ? data["text/plain"].join("") : data["text/plain"];
          }
          
          // HTML output
          if (data["text/html"]) {
            result.html = Array.isArray(data["text/html"]) ? data["text/html"].join("") : data["text/html"];
          }
          
          // Image output (base64)
          if (data["image/png"]) {
            result.image = `data:image/png;base64,${Array.isArray(data["image/png"]) ? data["image/png"].join("") : data["image/png"]}`;
          }
          if (data["image/jpeg"]) {
            result.image = `data:image/jpeg;base64,${Array.isArray(data["image/jpeg"]) ? data["image/jpeg"].join("") : data["image/jpeg"]}`;
          }
        }
        
        // Error output
        if (output.output_type === "error") {
          result.ename = output.ename;
          result.evalue = output.evalue;
          result.traceback = (output.traceback || []).join("\n");
        }

        return result;
      });
      
      parsed.execution_count = cell.execution_count;
    }

    return parsed;
  });

  return {
    cells,
    metadata: {
      kernelspec: notebook.metadata?.kernelspec?.display_name || "Python",
      language: notebook.metadata?.kernelspec?.language || "python",
      title: notebook.metadata?.colab?.name || "Untitled Notebook",
    },
  };
}

/**
 * syncVideoProgress
 * 
 * HTTP endpoint for navigator.sendBeacon to securely save video progress 
 * when the user closes the tab or navigates away.
 */
exports.syncVideoProgress = regionalFunctions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
      
      let data = req.body;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch (e) {}
      }

      const { idToken, userId, unitId, txId, progressData } = data;
      if (!idToken || !userId || !unitId || !txId || !progressData) {
        return res.status(400).send("Missing required fields");
      }

      // Verify token
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      if (decodedToken.uid !== userId) {
        return res.status(403).send("Unauthorized");
      }

      // We use server Timestamp for updatedAt but the client might pass their own.
      const updateData = {};
      
      // Prevent destroying existing fields like 'completed' when sending beacon
      if (progressData && typeof progressData === 'object') {
        for (const [key, val] of Object.entries(progressData)) {
          updateData[`videoProgress.${txId}.${key}`] = val;
        }
      }
      
      updateData[`videoProgress.${txId}.updatedAt`] = new Date();

      const progressRef = admin.firestore()
        .collection('users')
        .doc(userId)
        .collection('learning_progress')
        .doc(unitId);

      await progressRef.set(updateData, { merge: true });

      return res.status(200).send("OK");
    } catch (error) {
      console.error("syncVideoProgress error:", error);
      return res.status(500).send("Internal Server Error");
    }
  });
});

/**
 * adminResetUserPassword
 * 
 * Callable function to let Admis resetting any user's password securely.
 */
exports.adminResetUserPassword = regionalFunctions.https.onCall(async (data, context) => {
  // 1. Ensure authenticated
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "이 작업을 수행하려면 로그인해야 합니다."
    );
  }

  // 2. Ensure caller is an admin
  const adminDoc = await admin.firestore().collection("users").doc(context.auth.uid).get();
  if (!adminDoc.exists || adminDoc.data().role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "관리자 권한이 없습니다."
    );
  }

  // 3. Validate input
  const { targetUid, newPassword } = data;
  if (!targetUid || typeof targetUid !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "대상의 UID가 올바르지 않습니다.");
  }
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
    throw new functions.https.HttpsError("invalid-argument", "비밀번호는 6자 이상이어야 합니다.");
  }

  // 4. Update the user's password
  try {
    await admin.auth().updateUser(targetUid, {
      password: newPassword,
    });
    return { success: true };
  } catch (error) {
    console.error("adminResetUserPassword error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

exports.resetChildPasswordForParent = regionalFunctions.https.onCall(async (data, context) => {
  const parentUid = await requireAuthUid(context);
  const { parentData } = await requireParentDoc(parentUid);
  const targetUid = typeof data?.targetUid === "string" ? data.targetUid.trim() : "";
  const newPassword = String(data?.newPassword || "");

  if (!targetUid) {
    throw new functions.https.HttpsError("invalid-argument", "자녀 계정 정보가 올바르지 않습니다.");
  }
  if (newPassword.length < 6) {
    throw new functions.https.HttpsError("invalid-argument", "비밀번호는 6자 이상이어야 합니다.");
  }

  const childrenUids = Array.isArray(parentData.childrenUids) ? parentData.childrenUids : [];
  if (!childrenUids.includes(targetUid)) {
    throw new functions.https.HttpsError("permission-denied", "연결된 자녀 계정만 변경할 수 있습니다.");
  }

  const db = admin.firestore();
  const childRef = db.collection("users").doc(targetUid);
  const childSnap = await childRef.get();
  if (!childSnap.exists) {
    throw new functions.https.HttpsError("not-found", "자녀 계정을 찾을 수 없습니다.");
  }

  const childData = childSnap.data() || {};
  if (childData.role === "admin" || childData.role === "parent") {
    throw new functions.https.HttpsError("permission-denied", "학생 계정만 변경할 수 있습니다.");
  }
  if (childData.parentUid && childData.parentUid !== parentUid) {
    throw new functions.https.HttpsError("permission-denied", "연결된 보호자 정보가 일치하지 않습니다.");
  }

  try {
    await admin.auth().updateUser(targetUid, { password: newPassword });
    await childRef.set({
      lastPasswordResetByParentAt: FieldValue.serverTimestamp(),
      lastPasswordResetByParentUid: parentUid,
    }, { merge: true });

    return {
      success: true,
      childUid: targetUid,
      loginId: childData.loginId || "",
      email: childData.email || "",
    };
  } catch (error) {
    if (error?.code === "auth/user-not-found") {
      throw new functions.https.HttpsError("not-found", "자녀 로그인 계정을 찾을 수 없습니다.");
    }
    console.error("resetChildPasswordForParent error:", error);
    throw new functions.https.HttpsError("internal", "비밀번호 변경 중 오류가 발생했습니다.");
  }
});

/**
 * acceptAgoraAnswer
 *
 * Atomically marks an Agora answer as accepted and pays server-managed rewards.
 * This must run with Admin SDK privileges because the asker cannot directly
 * update another student's user balance under Firestore security rules.
 */
exports.acceptAgoraAnswer = regionalFunctions.https.onCall(async (data, context) => {
  const askerUid = await requireAuthUid(context);
  const questionId = typeof data?.questionId === "string" ? data.questionId.trim() : "";
  const answerId = typeof data?.answerId === "string" ? data.answerId.trim() : "";

  if (!questionId || !answerId) {
    throw new functions.https.HttpsError("invalid-argument", "질문과 답변 정보가 올바르지 않습니다.");
  }

  const db = admin.firestore();
  const questionRef = db.collection("questions").doc(questionId);
  const answerRef = db.collection("answers").doc(answerId);
  const askerRef = db.collection("users").doc(askerUid);

  try {
    await db.runTransaction(async (transaction) => {
      const questionSnap = await transaction.get(questionRef);
      const answerSnap = await transaction.get(answerRef);
      const askerSnap = await transaction.get(askerRef);

      if (!questionSnap.exists) {
        throw new functions.https.HttpsError("not-found", "질문을 찾을 수 없습니다.");
      }
      if (!answerSnap.exists) {
        throw new functions.https.HttpsError("not-found", "답변을 찾을 수 없습니다.");
      }

      const questionData = questionSnap.data() || {};
      const answerData = answerSnap.data() || {};
      const answererUid = answerData.userId;

      if (questionData.userId !== askerUid) {
        throw new functions.https.HttpsError("permission-denied", "질문 작성자만 답변을 채택할 수 있습니다.");
      }
      if (questionData.status === "resolved") {
        throw new functions.https.HttpsError("failed-precondition", "이미 해결된 질문입니다.");
      }
      if (answerData.questionId !== questionId) {
        throw new functions.https.HttpsError("failed-precondition", "이 질문의 답변만 채택할 수 있습니다.");
      }
      if (answerData.isAccepted === true) {
        throw new functions.https.HttpsError("failed-precondition", "이미 채택된 답변입니다.");
      }

      let answererRef = null;
      let answererSnap = null;
      if (answererUid && answererUid !== askerUid && answererUid !== "admin") {
        answererRef = db.collection("users").doc(answererUid);
        answererSnap = await transaction.get(answererRef);
      }

      const lockedBounty = getLockedBountyAmount(questionData);
      const totalAnswerReward = AGORA_BASE_ACCEPT_REWARD + lockedBounty;
      const now = FieldValue.serverTimestamp();
      const agoraRewardMetadata = buildAgoraRewardMetadata(questionId, answerId, questionData, askerUid);

      transaction.set(answerRef, {
        isAccepted: true,
        acceptedAt: now,
      }, { merge: true });

      transaction.set(questionRef, {
        status: "resolved",
        acceptedAnswerId: answerId,
        updatedAt: now,
        bountyStatus: lockedBounty > 0 ? "awarded" : (questionData.bountyStatus || "none"),
        bountyAwardedToAnswerId: lockedBounty > 0 ? answerId : null,
      }, { merge: true });

      if (answererRef) {
        const answererData = answererSnap?.exists ? answererSnap.data() || {} : {};
        transaction.set(answererRef, {
          crystals: Number(answererData.crystals || 0) + totalAnswerReward,
          helpCount: Number(answererData.helpCount || 0) + 1,
          ...calculateGrowthUpdates(answererData, totalAnswerReward),
        }, { merge: true });

        recordCrystalTransaction(transaction, answererUid, `answer-accepted-${questionId}`, {
          amount: AGORA_BASE_ACCEPT_REWARD,
          type: "answer_accepted",
          description: "답변이 채택되었습니다",
          metadata: agoraRewardMetadata,
        });

        if (lockedBounty > 0) {
          recordCrystalTransaction(transaction, answererUid, `agora-bounty-award-${questionId}`, {
            amount: lockedBounty,
            type: "agora_bounty_award",
            description: "현상금 질문 보상을 받았습니다",
            metadata: agoraRewardMetadata,
          });
        }
      }

      const askerData = askerSnap.exists ? askerSnap.data() || {} : {};
      transaction.set(askerRef, {
        crystals: Number(askerData.crystals || 0) + AGORA_ASKER_RESOLVE_REWARD,
        ...calculateGrowthUpdates(askerData, AGORA_ASKER_RESOLVE_REWARD),
      }, { merge: true });

      recordCrystalTransaction(transaction, askerUid, `question-resolved-${questionId}`, {
        amount: AGORA_ASKER_RESOLVE_REWARD,
        type: "question_resolved",
        description: "질문 해결 보너스",
        metadata: { questionId, answerId },
      });
    });

    return { success: true };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    console.error("acceptAgoraAnswer error:", error);
    throw new functions.https.HttpsError("internal", "답변 채택 중 서버 오류가 발생했습니다.");
  }
});

function sanitizeAssignmentShareDailySummary(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  const readNumber = (key) => {
    const numberValue = Number(source[key] || 0);
    return Number.isFinite(numberValue) ? Math.max(0, Math.floor(numberValue)) : 0;
  };
  return {
    quizCount: readNumber("quizCount"),
    logCount: readNumber("logCount"),
    totalVideoSeconds: readNumber("totalVideoSeconds"),
    attentionHits: readNumber("attentionHits"),
    attentionOpportunities: readNumber("attentionOpportunities"),
    focusScore: source.focusScore === null || source.focusScore === undefined
      ? null
      : readNumber("focusScore"),
  };
}

function buildAssignmentShareSnapshot(assignmentData = {}) {
  const content = String(assignmentData.content || "").trim();
  const feedback = String(assignmentData.feedback || "").trim();
  const attachments = Array.isArray(assignmentData.attachments)
    ? assignmentData.attachments.slice(0, 8).map((item) => ({
        name: String(item?.name || "첨부 파일").slice(0, 120),
        type: String(item?.type || "").slice(0, 40),
      }))
    : [];
  const links = Array.isArray(assignmentData.links)
    ? assignmentData.links.slice(0, 6).map((item) => ({
        title: String(item?.title || item?.url || "참고 링크").slice(0, 120),
      }))
    : [];

  return {
    assignmentId: assignmentData.id || "",
    date: String(assignmentData.date || "").slice(0, 20),
    clusterId: String(assignmentData.clusterId || "").slice(0, 80),
    regionId: String(assignmentData.regionId || "").slice(0, 80),
    status: String(assignmentData.status || "").slice(0, 40),
    content: content.slice(0, 2400),
    feedback: feedback.slice(0, 1800),
    bonusCrystals: Math.max(0, Math.floor(Number(assignmentData.bonusCrystals || 0))),
    attachmentCount: attachments.length,
    attachments,
    links,
  };
}

function getTimestampMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value.seconds) return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

exports.publishAssignmentShare = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const assignmentId = typeof data?.assignmentId === "string" ? data.assignmentId.trim() : "";
  const kind = data?.kind === "comfort" ? "comfort" : "archive";

  if (!assignmentId) {
    throw new functions.https.HttpsError("invalid-argument", "공개할 과제 기록이 올바르지 않습니다.");
  }

  const db = admin.firestore();
  const assignmentRef = db.collection("assignments").doc(assignmentId);
  const userRef = db.collection("users").doc(uid);
  const shareRef = db.collection("assignmentShares").doc();
  const nowMs = Date.now();

  try {
    await db.runTransaction(async (transaction) => {
      const [assignmentSnap, userSnap, previousSharesSnap] = await Promise.all([
        transaction.get(assignmentRef),
        transaction.get(userRef),
        transaction.get(db.collection("assignmentShares").where("ownerId", "==", uid)),
      ]);

      if (!assignmentSnap.exists) {
        throw new functions.https.HttpsError("not-found", "과제 기록을 찾을 수 없습니다.");
      }
      if (!userSnap.exists) {
        throw new functions.https.HttpsError("not-found", "사용자 정보를 찾을 수 없습니다.");
      }

      const assignmentData = assignmentSnap.data() || {};
      if (assignmentData.userId !== uid) {
        throw new functions.https.HttpsError("permission-denied", "내 과제 기록만 공개할 수 있습니다.");
      }
      if (!["submitted", "reviewed", "needs_revision"].includes(assignmentData.status)) {
        throw new functions.https.HttpsError("failed-precondition", "제출된 과제 기록만 공개할 수 있습니다.");
      }
      if (!String(assignmentData.feedback || "").trim()) {
        throw new functions.https.HttpsError("failed-precondition", "피드백이 있는 과제 기록만 공개할 수 있습니다.");
      }

      const latestShare = previousSharesSnap.docs
        .map((docSnap) => docSnap.data() || {})
        .sort((a, b) => getTimestampMillis(b.publishedAt) - getTimestampMillis(a.publishedAt))[0];
      const latestMs = getTimestampMillis(latestShare?.publishedAt);
      if (latestMs && nowMs - latestMs < ASSIGNMENT_SHARE_COOLDOWN_MS) {
        throw new functions.https.HttpsError("failed-precondition", "기록 공개와 위로 요청은 7일에 한 번만 사용할 수 있습니다.");
      }

      const userData = userSnap.data() || {};
      transaction.set(shareRef, {
        ownerId: uid,
        ownerName: userData.studentName || userData.name || userData.displayName || "탐험가",
        kind,
        assignment: buildAssignmentShareSnapshot({ ...assignmentData, id: assignmentId }),
        dailySummary: sanitizeAssignmentShareDailySummary(data?.dailySummary || {}),
        likeCount: 0,
        comfortCount: 0,
        commentCount: 0,
        likedBy: [],
        comfortedBy: [],
        likedByProfiles: [],
        comfortedByProfiles: [],
        status: "public",
        publishedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return { success: true, shareId: shareRef.id };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    console.error("publishAssignmentShare error:", error);
    throw new functions.https.HttpsError("internal", "기록 공개 중 서버 오류가 발생했습니다.");
  }
});

exports.reactAssignmentShare = regionalFunctions.https.onCall(async (data, context) => {
  const actorUid = await requireAuthUid(context);
  const shareId = typeof data?.shareId === "string" ? data.shareId.trim() : "";
  const reaction = data?.reaction === "comfort" ? "comfort" : "like";

  if (!shareId) {
    throw new functions.https.HttpsError("invalid-argument", "공개 기록 정보가 올바르지 않습니다.");
  }

  const db = admin.firestore();
  const shareRef = db.collection("assignmentShares").doc(shareId);

  try {
    await db.runTransaction(async (transaction) => {
      const shareSnap = await transaction.get(shareRef);
      if (!shareSnap.exists) {
        throw new functions.https.HttpsError("not-found", "공개 기록을 찾을 수 없습니다.");
      }

      const shareData = shareSnap.data() || {};
      const ownerId = shareData.ownerId;
      if (!ownerId) {
        throw new functions.https.HttpsError("failed-precondition", "기록 소유자 정보가 없습니다.");
      }
      if (ownerId === actorUid) {
        throw new functions.https.HttpsError("failed-precondition", "내 기록에는 보상을 받을 수 없습니다.");
      }

      const fieldName = reaction === "comfort" ? "comfortedBy" : "likedBy";
      const countName = reaction === "comfort" ? "comfortCount" : "likeCount";
      const profileFieldName = reaction === "comfort" ? "comfortedByProfiles" : "likedByProfiles";
      const previousActors = Array.isArray(shareData[fieldName]) ? shareData[fieldName] : [];
      if (previousActors.includes(actorUid)) {
        throw new functions.https.HttpsError("failed-precondition", "이미 반응한 기록입니다.");
      }

      const ownerRef = db.collection("users").doc(ownerId);
      const actorRef = db.collection("users").doc(actorUid);
      const [ownerSnap, actorSnap] = await Promise.all([
        transaction.get(ownerRef),
        transaction.get(actorRef),
      ]);
      if (!ownerSnap.exists) {
        throw new functions.https.HttpsError("not-found", "기록 소유자 정보를 찾을 수 없습니다.");
      }

      const ownerData = ownerSnap.data() || {};
      const actorData = actorSnap.exists ? (actorSnap.data() || {}) : {};
      const actorName = actorData.studentName || actorData.name || actorData.displayName || "탐험가";
      transaction.set(shareRef, {
        [fieldName]: FieldValue.arrayUnion(actorUid),
        [profileFieldName]: FieldValue.arrayUnion({
          userId: actorUid,
          userName: String(actorName).slice(0, 80),
          reactedAt: admin.firestore.Timestamp.now(),
        }),
        [countName]: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      transaction.set(ownerRef, {
        crystals: Number(ownerData.crystals || 0) + ASSIGNMENT_SHARE_REACTION_REWARD,
        ...calculateGrowthUpdates(ownerData, ASSIGNMENT_SHARE_REACTION_REWARD),
      }, { merge: true });

      recordCrystalTransaction(transaction, ownerId, `assignment-share-${reaction}-${shareId}-${actorUid}`, {
        amount: ASSIGNMENT_SHARE_REACTION_REWARD,
        type: reaction === "comfort" ? "assignment_share_comfort" : "assignment_share_like",
        description: reaction === "comfort" ? "공개 기록 위로 보상" : "공개 기록 좋아요 보상",
        metadata: { shareId, actorUid, assignmentId: shareData.assignment?.assignmentId || "" },
      });
    });

    return { success: true };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    console.error("reactAssignmentShare error:", error);
    throw new functions.https.HttpsError("internal", "반응 저장 중 서버 오류가 발생했습니다.");
  }
});

exports.commentAssignmentShare = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const shareId = typeof data?.shareId === "string" ? data.shareId.trim() : "";
  const content = cleanText(data?.content || "", 240);

  if (!shareId || content.length < 1) {
    throw new functions.https.HttpsError("invalid-argument", "댓글 내용을 입력해주세요.");
  }

  const db = admin.firestore();
  const shareRef = db.collection("assignmentShares").doc(shareId);
  const userRef = db.collection("users").doc(uid);
  const commentRef = shareRef.collection("comments").doc();

  try {
    await db.runTransaction(async (transaction) => {
      const [shareSnap, userSnap] = await Promise.all([
        transaction.get(shareRef),
        transaction.get(userRef),
      ]);
      if (!shareSnap.exists) {
        throw new functions.https.HttpsError("not-found", "공개 기록을 찾을 수 없습니다.");
      }
      const userData = userSnap.exists ? userSnap.data() || {} : {};
      transaction.set(commentRef, {
        shareId,
        userId: uid,
        userName: userData.studentName || userData.name || userData.displayName || "탐험가",
        content,
        createdAt: FieldValue.serverTimestamp(),
      });
      transaction.set(shareRef, {
        commentCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    return { success: true, commentId: commentRef.id };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    console.error("commentAssignmentShare error:", error);
    throw new functions.https.HttpsError("internal", "댓글 저장 중 서버 오류가 발생했습니다.");
  }
});

function buildCrewSnapshot(crewId, crewData, memberSummaries = [], greetings = []) {
  return {
    id: crewId,
    name: crewData.name || '',
    motto: crewData.motto || '',
    description: crewData.description || '',
    color: crewData.color || '#00d4ff',
    groupId: crewData.groupId || 'none',
    groupName: crewData.groupName || '자유 스터디',
    clusterId: crewData.clusterId || '',
    clusterName: crewData.clusterName || '',
    scheduleDays: Array.isArray(crewData.scheduleDays) ? crewData.scheduleDays : [],
    scheduleTimes: crewData.scheduleTimes || {},
    status: crewData.status || 'pending',
    rejectionReason: crewData.rejectionReason || '',
    inviteCode: crewData.inviteCode || '',
    leaderId: crewData.leaderId || '',
    leaderName: crewData.leaderName || '',
    activeStudyRoomId: crewData.activeStudyRoomId || '',
    activeStudyRoomStatus: crewData.activeStudyRoomStatus || '',
    studyRoomCapacity: crewData.studyRoomCapacity || 3,
    memberCount: crewData.memberCount || memberSummaries.length || 0,
    memberIds: crewData.memberIds || memberSummaries.map((m) => m.uid),
    members: memberSummaries,
    recentGreetings: greetings,
    updatedAt: new Date().toISOString(),
  };
}

const CREW_SCHEDULE_DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function normalizeCrewSchedule(scheduleDays, scheduleTimes) {
  const validDayKeys = new Set(CREW_SCHEDULE_DAY_KEYS);
  const days = Array.isArray(scheduleDays)
    ? scheduleDays.filter((day) => validDayKeys.has(String(day))).slice(0, 7)
    : [];
  const rawTimes = scheduleTimes && typeof scheduleTimes === "object" ? scheduleTimes : {};
  const times = {};
  days.forEach((day) => {
    const rawTime = String(rawTimes[day] || "20:00");
    times[day] = /^\d{2}:\d{2}$/.test(rawTime) ? rawTime : "20:00";
  });
  return { scheduleDays: days, scheduleTimes: times };
}

function uniqueIds(ids = []) {
  return Array.from(new Set((Array.isArray(ids) ? ids : []).filter(Boolean)));
}

function getCrewMemberIds(crewData = {}) {
  return uniqueIds([
    ...(Array.isArray(crewData.memberIds) ? crewData.memberIds : []),
    crewData.leaderId,
  ]);
}

function getGreetingReadState(greetingData = {}, crewData = {}) {
  const memberIds = getCrewMemberIds(crewData);
  const readBy = uniqueIds([greetingData.userId, ...(Array.isArray(greetingData.readBy) ? greetingData.readBy : [])]);
  const totalCount = memberIds.length || Math.max(readBy.length, 1);
  const readCount = memberIds.length
    ? memberIds.filter((memberId) => readBy.includes(memberId)).length
    : readBy.length;
  const eligibleReaders = memberIds.filter((memberId) => memberId && memberId !== greetingData.userId);
  const hasAllRead = totalCount > 0 && eligibleReaders.every((memberId) => readBy.includes(memberId));
  return {
    readBy,
    totalCount,
    readCount,
    eligibleReaders,
    hasAllRead,
  };
}

async function requireAuthUid(context) {
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError("unauthenticated", "이 작업을 수행하려면 로그인해야 합니다.");
  }
  return context.auth.uid;
}

async function requireAdminUid(context) {
  const uid = await requireAuthUid(context);
  const adminDoc = await admin.firestore().collection("users").doc(uid).get();
  if (!adminDoc.exists || adminDoc.data().role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "관리자 권한이 없습니다.");
  }
  return uid;
}

async function deleteQueryDocs(queryRef, stats, key) {
  const db = admin.firestore();
  let deleted = 0;

  while (true) {
    const snap = await queryRef.limit(300).get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
      deleted += 1;
    });
    await batch.commit();
  }

  stats[key] = (stats[key] || 0) + deleted;
  return deleted;
}

async function deleteStoragePrefix(bucket, prefix, stats) {
  let files = [];
  try {
    [files] = await bucket.getFiles({ prefix });
  } catch (error) {
    console.warn("deleteStoragePrefix skipped:", { prefix, error: error.message });
    stats.storageSkipped = (stats.storageSkipped || 0) + 1;
    return;
  }
  if (!files.length) return;

  await Promise.all(files.map((file) => file.delete({ ignoreNotFound: true }).catch((error) => {
    if (error.code !== 404) throw error;
  })));
  stats.storageFiles = (stats.storageFiles || 0) + files.length;
}

async function recalculateQuestionAnswerCount(db, questionId, stats) {
  if (!questionId) return;

  const questionRef = db.collection("questions").doc(questionId);
  const questionSnap = await questionRef.get();
  if (!questionSnap.exists) return;

  const answersSnap = await db.collection("answers").where("questionId", "==", questionId).get();
  await questionRef.set({
    answerCount: answersSnap.size,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  stats.questionsRecounted = (stats.questionsRecounted || 0) + 1;
}

async function removeDeletedUserFromArrays(db, uid, stats) {
  const parentsSnap = await db.collection("parents").where("childrenUids", "array-contains", uid).get();
  for (const parentDoc of parentsSnap.docs) {
    await parentDoc.ref.set({
      childrenUids: FieldValue.arrayRemove(uid),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    stats.parentLinksRemoved = (stats.parentLinksRemoved || 0) + 1;
  }

  const likedQuestionsSnap = await db.collection("questions").where("upvotedBy", "array-contains", uid).get();
  for (const questionDoc of likedQuestionsSnap.docs) {
    const upvotedBy = (questionDoc.data().upvotedBy || []).filter((id) => id !== uid);
    await questionDoc.ref.set({ upvotedBy, upvotes: upvotedBy.length }, { merge: true });
    stats.questionVotesRemoved = (stats.questionVotesRemoved || 0) + 1;
  }

  const likedMessagesSnap = await db.collection("starMessages").where("upvotedBy", "array-contains", uid).get();
  for (const messageDoc of likedMessagesSnap.docs) {
    const upvotedBy = (messageDoc.data().upvotedBy || []).filter((id) => id !== uid);
    await messageDoc.ref.set({ upvotedBy, endorseCount: upvotedBy.length }, { merge: true });
    stats.starMessageVotesRemoved = (stats.starMessageVotesRemoved || 0) + 1;
  }
}

async function deleteRegionStudentLinks(db, uid, stats) {
  const regionsSnap = await db.collection("regions").get();
  const studentRefs = regionsSnap.docs.map((regionDoc) => regionDoc.ref.collection("students").doc(uid));
  const studentSnaps = await Promise.all(studentRefs.map((studentRef) => studentRef.get()));
  const existingRefs = studentSnaps.filter((studentSnap) => studentSnap.exists).map((studentSnap) => studentSnap.ref);

  for (let i = 0; i < existingRefs.length; i += 300) {
    const batch = db.batch();
    existingRefs.slice(i, i + 300).forEach((studentRef) => batch.delete(studentRef));
    await batch.commit();
  }

  stats.regionStudentLinksDeleted = (stats.regionStudentLinksDeleted || 0) + existingRefs.length;
}

async function deleteCrewGreetingsByUser(db, uid, stats) {
  const crewsSnap = await db.collection("crews").get();
  let deleted = 0;

  for (const crewDoc of crewsSnap.docs) {
    const greetingsSnap = await crewDoc.ref.collection("greetings").where("userId", "==", uid).get();
    for (let i = 0; i < greetingsSnap.docs.length; i += 300) {
      const batch = db.batch();
      greetingsSnap.docs.slice(i, i + 300).forEach((greetingDoc) => {
        batch.delete(greetingDoc.ref);
        deleted += 1;
      });
      await batch.commit();
    }
  }

  stats.crewGreetingsDeleted = (stats.crewGreetingsDeleted || 0) + deleted;
}

async function deleteDirectMemoLimitsForRecipient(db, uid, stats) {
  const usersSnap = await db.collection("users").get();
  let deleted = 0;

  for (let i = 0; i < usersSnap.docs.length; i += 300) {
    const refs = usersSnap.docs.slice(i, i + 300).map((userDoc) => userDoc.ref.collection("directMemoLimits").doc(uid));
    const snaps = await Promise.all(refs.map((limitRef) => limitRef.get()));
    const batch = db.batch();
    snaps.forEach((limitSnap) => {
      if (limitSnap.exists) {
        batch.delete(limitSnap.ref);
        deleted += 1;
      }
    });
    await batch.commit();
  }

  stats.directMemoLimitsDeleted = (stats.directMemoLimitsDeleted || 0) + deleted;
}

async function cleanupStudyMemberships(db, uid, stats) {
  const leaderCrewsSnap = await db.collection("crews").where("leaderId", "==", uid).get();
  for (const crewDoc of leaderCrewsSnap.docs) {
    await db.recursiveDelete(crewDoc.ref);
    stats.crewsDeleted = (stats.crewsDeleted || 0) + 1;
  }

  const memberCrewsSnap = await db.collection("crews").where("memberIds", "array-contains", uid).get();
  for (const crewDoc of memberCrewsSnap.docs) {
    if (!crewDoc.exists) continue;
    const crewData = crewDoc.data() || {};
    if (crewData.leaderId === uid) continue;

    const memberIds = (crewData.memberIds || []).filter((memberId) => memberId !== uid);
    const members = Array.isArray(crewData.members)
      ? crewData.members.filter((member) => member?.uid !== uid)
      : [];
    await crewDoc.ref.set({
      memberIds,
      members,
      memberCount: memberIds.length,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    stats.crewMembershipsRemoved = (stats.crewMembershipsRemoved || 0) + 1;
  }

  await deleteCrewGreetingsByUser(db, uid, stats);

  const hostedRoomsSnap = await db.collection("studyRooms").where("hostUid", "==", uid).get();
  const deletedRoomIds = new Set();
  for (const roomDoc of hostedRoomsSnap.docs) {
    await db.recursiveDelete(roomDoc.ref);
    deletedRoomIds.add(roomDoc.id);
    stats.studyRoomsDeleted = (stats.studyRoomsDeleted || 0) + 1;
  }

  const memberRoomsSnap = await db.collection("studyRooms").where("participantIds", "array-contains", uid).get();
  for (const roomDoc of memberRoomsSnap.docs) {
    if (deletedRoomIds.has(roomDoc.id)) continue;
    await roomDoc.ref.set({
      participantIds: FieldValue.arrayRemove(uid),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    await roomDoc.ref.collection("participants").doc(uid).delete().catch((err) => {
      if (err.code !== 5) throw err;
    });
    stats.studyRoomParticipationsRemoved = (stats.studyRoomParticipationsRemoved || 0) + 1;
  }
}

async function deleteUserOwnedData(uid, options = {}) {
  const db = admin.firestore();
  const bucket = admin.storage().bucket();
  const stats = {};
  const affectedQuestionIds = new Set();

  let stage = "load-user";
  try {
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() : {};

    if (userData?.role === "admin" && !options.allowAdminDelete) {
      throw new functions.https.HttpsError("failed-precondition", "관리자 계정은 이 기능으로 삭제할 수 없습니다.");
    }

    stage = "shared-array-cleanup";
    await removeDeletedUserFromArrays(db, uid, stats);

    stage = "study-membership-cleanup";
    await cleanupStudyMemberships(db, uid, stats);

    stage = "questions-cleanup";
    const ownQuestionsSnap = await db.collection("questions").where("userId", "==", uid).get();
    for (const questionDoc of ownQuestionsSnap.docs) {
      await deleteQueryDocs(db.collection("answers").where("questionId", "==", questionDoc.id), stats, "answersDeleted");
      await questionDoc.ref.delete();
      stats.questionsDeleted = (stats.questionsDeleted || 0) + 1;
    }

    stage = "answers-cleanup";
    const ownAnswersSnap = await db.collection("answers").where("userId", "==", uid).get();
    for (const answerDoc of ownAnswersSnap.docs) {
      const answerData = answerDoc.data() || {};
      if (answerData.questionId) affectedQuestionIds.add(answerData.questionId);
      await answerDoc.ref.delete();
      stats.answersDeleted = (stats.answersDeleted || 0) + 1;
    }

    stage = "answer-count-sync";
    for (const questionId of affectedQuestionIds) {
      await recalculateQuestionAnswerCount(db, questionId, stats);
    }

    stage = "top-level-doc-cleanup";
    await deleteQueryDocs(db.collection("assignments").where("userId", "==", uid), stats, "assignmentsDeleted");
    await deleteQueryDocs(db.collection("attendance").where("userId", "==", uid), stats, "attendanceDeleted");
    await deleteQueryDocs(db.collection("notifications").where("recipientId", "==", uid), stats, "notificationsDeleted");
    await deleteQueryDocs(db.collection("directMemos").where("senderId", "==", uid), stats, "directMemosDeleted");
    await deleteQueryDocs(db.collection("directMemos").where("recipientId", "==", uid), stats, "directMemosDeleted");
    await deleteQueryDocs(db.collection("starMessages").where("userId", "==", uid), stats, "starMessagesDeleted");

    stage = "nested-link-cleanup";
    await deleteDirectMemoLimitsForRecipient(db, uid, stats);
    await deleteRegionStudentLinks(db, uid, stats);

    stage = "storage-cleanup";
    await Promise.all([
      deleteStoragePrefix(bucket, `drawings/${uid}/`, stats),
      deleteStoragePrefix(bucket, `assignments/${uid}/`, stats),
      deleteStoragePrefix(bucket, `agora-connect/${uid}/`, stats),
    ]);

    stage = "user-document-delete";
    await db.recursiveDelete(userRef);
    stats.userDocumentDeleted = userSnap.exists ? 1 : 0;

    stage = "auth-user-delete";
    try {
      await admin.auth().deleteUser(uid);
      stats.authUserDeleted = 1;
    } catch (error) {
      if (error.code !== "auth/user-not-found") {
        throw error;
      }
      stats.authUserDeleted = 0;
    }

    return {
      uid,
      email: userData?.email || "",
      stats,
    };
  } catch (error) {
    console.error("deleteUserOwnedData failed:", {
      uid,
      stage,
      stats,
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError(
      "internal",
      `계정 삭제 중 오류가 발생했습니다. 실패 단계: ${stage}`,
      { stage, stats }
    );
  }
}

function buildAccountDeletionConfirmCandidates({ userData = {}, parentData = {}, authUser = null, token = {} }) {
  const values = [
    userData?.email,
    parentData?.email,
    parentData?.loginEmail,
    parentData?.phone,
    parentData?.loginId,
    authUser?.email,
    token?.email,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  const candidates = new Set();
  for (const value of values) {
    candidates.add(value);
    const atIndex = value.indexOf("@");
    if (atIndex > 0) candidates.add(value.slice(0, atIndex));
    const digits = value.replace(/[^0-9]/g, "");
    if (digits.length >= 10) candidates.add(digits);
  }
  if (candidates.size === 0) candidates.add("탈퇴");
  return candidates;
}

async function deleteParentOwnedData(parentUid) {
  const db = admin.firestore();
  const parentRef = db.collection("parents").doc(parentUid);
  const parentSnap = await parentRef.get();
  const parentData = parentSnap.exists ? parentSnap.data() : {};
  const childrenUids = Array.isArray(parentData?.childrenUids)
    ? [...new Set(parentData.childrenUids.filter(Boolean))]
    : [];
  const stats = {
    parentChildrenRequestedForDeletion: childrenUids.length,
    childDeletionResults: [],
  };

  for (const childUid of childrenUids) {
    const result = await deleteUserOwnedData(childUid);
    stats.childDeletionResults.push({
      uid: childUid,
      stats: result.stats,
    });
  }

  const parentUserSnap = await db.collection("users").doc(parentUid).get();
  if (parentUserSnap.exists) {
    const result = await deleteUserOwnedData(parentUid);
    stats.parentUserDocumentCleanup = result.stats;
  }

  await db.recursiveDelete(parentRef);
  stats.parentDocumentDeleted = parentSnap.exists ? 1 : 0;

  try {
    await admin.auth().deleteUser(parentUid);
    stats.parentAuthUserDeleted = 1;
  } catch (error) {
    if (error.code !== "auth/user-not-found") {
      throw error;
    }
    stats.parentAuthUserDeleted = 0;
  }

  return {
    uid: parentUid,
    email: parentData?.email || parentData?.loginEmail || "",
    role: "parent",
    stats,
  };
}

exports.adminDeleteUserAccount = accountDeletionFunctions.https.onCall(async (data, context) => {
  const adminUid = await requireAdminUid(context);
  const targetUid = String(data?.targetUid || "").trim();
  const confirmText = String(data?.confirmText || "").trim();

  if (!targetUid) {
    throw new functions.https.HttpsError("invalid-argument", "삭제할 이용자 UID가 없습니다.");
  }
  if (targetUid === adminUid) {
    throw new functions.https.HttpsError("failed-precondition", "현재 로그인한 관리자 본인은 삭제할 수 없습니다.");
  }

  const targetSnap = await admin.firestore().collection("users").doc(targetUid).get();
  const targetData = targetSnap.exists ? targetSnap.data() : {};
  const expectedEmail = String(targetData?.email || "").trim();
  if (expectedEmail && confirmText !== expectedEmail && confirmText !== "DELETE") {
    throw new functions.https.HttpsError("failed-precondition", "확인 문구가 일치하지 않습니다.");
  }
  if (!expectedEmail && confirmText !== targetUid && confirmText !== "DELETE") {
    throw new functions.https.HttpsError("failed-precondition", "확인 문구가 일치하지 않습니다.");
  }

  return deleteUserOwnedData(targetUid);
});

exports.deleteCurrentUserAccount = accountDeletionFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const confirmText = String(data?.confirmText || "").trim();
  const db = admin.firestore();
  const userSnap = await db.collection("users").doc(uid).get();
  const userData = userSnap.exists ? userSnap.data() : {};
  const parentSnap = await db.collection("parents").doc(uid).get();
  const parentData = parentSnap.exists ? parentSnap.data() : {};
  const authUser = await admin.auth().getUser(uid).catch(() => null);
  const confirmCandidates = buildAccountDeletionConfirmCandidates({
    userData,
    parentData,
    authUser,
    token: context.auth?.token || {},
  });

  if (!confirmCandidates.has(confirmText)) {
    throw new functions.https.HttpsError("failed-precondition", "확인 문구가 일치하지 않습니다.");
  }

  if (parentSnap.exists && !parentData?.isDeleted) {
    return deleteParentOwnedData(uid);
  }

  return deleteUserOwnedData(uid);
});

async function loadMemberSummaries(memberIds = []) {
  const ids = uniqueIds(memberIds);
  if (!ids.length) return [];

  const chunks = [];
  for (let i = 0; i < ids.length; i += 30) {
    chunks.push(ids.slice(i, i + 30));
  }

  const snapshots = await Promise.all(
    chunks.map((chunk) => admin.firestore().collection("users").where(FieldPath.documentId(), "in", chunk).get()),
  );

  const summariesById = new Map();
  snapshots.forEach((docs) => {
    docs.docs.forEach((snap) => {
      const data = snap.data() || {};
      const displayName = data.publicDisplayName || data.studentName || data.name || data.displayName || "";
      summariesById.set(snap.id, {
        uid: snap.id,
        displayName,
        studentName: data.studentName || "",
        publicDisplayName: data.publicDisplayName || "",
        name: data.name || "",
        email: data.email || "",
        currentStreak: data.currentStreak || 0,
        lastStreakDate: data.lastStreakDate || "",
        crewRole: data.crewRole || "",
      });
    });
  });

  return ids.map((uid) => summariesById.get(uid) || {
    uid,
    displayName: "",
    studentName: "",
    publicDisplayName: "",
    name: "",
    email: "",
    currentStreak: 0,
    lastStreakDate: "",
    crewRole: "",
  });
}

function getDisplayNameFromUser(userData = {}) {
  return userData.publicDisplayName || userData.studentName || userData.name || userData.displayName || "탐사원";
}

function getOwnedProfileFrames(userData = {}) {
  const owned = Array.isArray(userData.ownedProfileFrames) ? userData.ownedProfileFrames : [];
  return Array.from(new Set(["starter", ...owned]));
}

function getProfileFrameMeta(frameId = "starter") {
  if (frameId === "nebula") {
    return {
      id: "nebula",
      name: "네뷸라 프레임",
      accent: "#8b5cf6",
      bg: "linear-gradient(135deg, rgba(139, 92, 246, 0.28), rgba(17, 24, 39, 0.96))",
    };
  }
  if (frameId === "solar") {
    return {
      id: "solar",
      name: "솔라 프레임",
      accent: "#f59e0b",
      bg: "linear-gradient(135deg, rgba(245, 158, 11, 0.28), rgba(17, 24, 39, 0.96))",
    };
  }
  return {
    id: "starter",
    name: "스타터 프레임",
    accent: "#00f3ff",
    bg: "linear-gradient(135deg, rgba(0, 243, 255, 0.16), rgba(11, 18, 42, 0.95))",
  };
}

function buildAnswerProfileSnapshotForUser(userData = {}) {
  const displayName = getDisplayNameFromUser(userData);
  const frame = getProfileFrameMeta(userData.selectedProfileFrame || "starter");
  return {
    displayName,
    publicTitle: String(userData.publicTitle || "").trim(),
    publicSignature: String(userData.publicSignature || "").trim(),
    profileFrameId: frame.id,
    frameName: frame.name,
    frameAccent: frame.accent,
    frameBackground: frame.bg,
    crewId: userData.crewId || "",
    crewName: userData.crewName || "",
    crewRole: userData.crewRole || "",
    crewColor: userData.crewColor || "#00f3ff",
    helpCount: userData.helpCount || 0,
    questionCount: userData.questionCount || 0,
    hallSpotlightUntilMs: userData.hallSpotlightUntilMs || 0,
  };
}

function buildServerStreakGiftAudit({ source, writerUid, prevState = {}, nextFreezeCount, writtenAt, note }) {
  return {
    version: 2,
    source,
    writerUid,
    writtenAt,
    prevCurrentStreak: prevState.currentStreak ?? 0,
    prevLastStreakDate: prevState.lastStreakDate ?? "",
    prevFreezeCount: prevState.streakFreezeCount ?? 0,
    nextCurrentStreak: prevState.currentStreak ?? 0,
    nextLastStreakDate: prevState.lastStreakDate ?? "",
    nextFreezeCount,
    note,
  };
}

function isRadarActiveServer(userData = {}, nowMs = Date.now()) {
  if (!userData.hasRadar) return false;
  const expiresAtMs = Number(userData.radarExpiresAtMs || 0);
  return !expiresAtMs || expiresAtMs > nowMs;
}

async function syncAnswerProfileSnapshotsForUser(userId, userData = {}) {
  const db = admin.firestore();
  const snapshot = buildAnswerProfileSnapshotForUser(userData);
  const answersSnap = await db.collection("answers").where("userId", "==", userId).get();
  if (answersSnap.empty) return;

  let batch = db.batch();
  let opCount = 0;
  for (const docSnap of answersSnap.docs) {
    batch.update(docSnap.ref, { publicProfileSnapshot: snapshot });
    opCount += 1;
    if (opCount >= 450) {
      await batch.commit();
      batch = db.batch();
      opCount = 0;
    }
  }
  if (opCount > 0) {
    await batch.commit();
  }
}

function getKstDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function normalizeClusterId(clusterId = "") {
  if (clusterId === "초등수학" || clusterId === "cluster_elementary") return "cluster_elementary";
  if (clusterId === "파이썬" || clusterId === "python") return "python";
  if (clusterId === "중등수학" || clusterId === "middle-math") return "middle-math";
  if (clusterId === "서양고전" || clusterId === "western-classic") return "western-classic";
  return String(clusterId || "").trim();
}

function getRecentKstDateKeys(lookbackDays = ASSIGNMENT_MISSING_LOOKBACK_DAYS, now = new Date()) {
  const keys = [];
  for (let i = 0; i < lookbackDays; i += 1) {
    keys.push(getKstDateKey(new Date(now.getTime() - i * 24 * 60 * 60 * 1000)));
  }
  return keys.sort();
}

function getMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (value.seconds) return value.seconds * 1000;
  if (value._seconds) return value._seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function getAttendanceBaseMs(attendance = {}) {
  return (
    getMillis(attendance.timestamp) ||
    getMillis(attendance.createdAt) ||
    getMillis(attendance.updatedAt) ||
    (attendance.date ? new Date(`${attendance.date}T23:59:59+09:00`).getTime() : 0)
  );
}

function getAssignmentMissingPenalty(missingStreak) {
  return Math.min(
    ASSIGNMENT_MISSING_MAX_PENALTY,
    ASSIGNMENT_MISSING_BASE_PENALTY + Math.max(0, missingStreak - 1) * ASSIGNMENT_MISSING_STEP_PENALTY
  );
}

function normalizeDirectMemoBody(value) {
  return String(value || "").replace(/\r\n/g, "\n").trim().slice(0, DIRECT_MEMO_MAX_LENGTH);
}

function getDirectMemoPreview(body) {
  const oneLine = String(body || "").replace(/\s+/g, " ").trim();
  return oneLine.length > 64 ? `${oneLine.slice(0, 64)}...` : oneLine;
}

function toAdminTimestamp(value) {
  if (!value) return null;
  if (typeof value.toMillis === "function") return value;
  if (value instanceof Date) return admin.firestore.Timestamp.fromDate(value);
  if (typeof value === "number") return admin.firestore.Timestamp.fromMillis(value);
  return null;
}

function createDirectMemoNotification(tx, memoRef, memoData) {
  // Notification generation disabled. 
  // Direct memo notifications are handled solely by the memo icon indicator on the client.
}

function buildClearedCrewUserFields() {
  return {
    crewId: "",
    crewName: "",
    crewRole: "",
    crewColor: "#00d4ff",
    crewStatus: "",
    crewGroupName: "",
    crewInviteCode: "",
    crewActiveStudyRoomId: "",
    crewActiveStudyRoomStatus: "",
    crewSnapshot: null,
    rejectedCrewId: "",
  };
}

async function removeParticipantFromStudyRoomTransaction(tx, db, roomRef, roomData, uid) {
  const participantIds = Array.isArray(roomData?.participantIds) ? roomData.participantIds : [];
  if (!participantIds.includes(uid)) {
    return;
  }

  const nextParticipantIds = participantIds.filter((participantUid) => participantUid !== uid);
  const now = new Date();
  const crewRef = roomData?.crewId ? db.collection("crews").doc(roomData.crewId) : null;
  let nextHostUid = roomData.hostUid;
  let nextHostName = roomData.hostName || "";

  if (nextParticipantIds.length > 0 && roomData.hostUid === uid) {
    nextHostUid = nextParticipantIds[0];
    const nextHostSnap = await tx.get(db.collection("users").doc(nextHostUid));
    nextHostName = nextHostSnap.exists ? getDisplayNameFromUser(nextHostSnap.data()) : "탐사원";
  }

  tx.delete(roomRef.collection("participants").doc(uid));

  if (nextParticipantIds.length === 0) {
    tx.set(roomRef, {
      participantIds: [],
      participantCount: 0,
      status: "ended",
      endedAt: now,
      lastActivityAt: now,
    }, { merge: true });
    if (crewRef) {
      tx.set(crewRef, {
        activeStudyRoomId: "",
        activeStudyRoomStatus: "",
        updatedAt: now,
      }, { merge: true });
    }
    return;
  }

  if (roomData.hostUid === uid) {
    tx.set(roomRef.collection("participants").doc(nextHostUid), {
      role: "host",
    }, { merge: true });
  }

  const nextStatus = nextParticipantIds.length >= 2 ? "live" : "waiting";
  tx.set(roomRef, {
    participantIds: nextParticipantIds,
    participantCount: nextParticipantIds.length,
    hostUid: nextHostUid,
    hostName: nextHostName,
    status: nextStatus,
    lastActivityAt: now,
  }, { merge: true });
  if (crewRef) {
    tx.set(crewRef, {
      activeStudyRoomId: roomRef.id,
      activeStudyRoomStatus: nextStatus,
      updatedAt: now,
    }, { merge: true });
  }
}

async function syncCrewToMembers(crewId, crewData, greetings = []) {
  const memberIds = crewData.memberIds || [];
  const memberSummaries = await loadMemberSummaries(memberIds);
  const crewSnapshot = buildCrewSnapshot(crewId, crewData, memberSummaries, greetings);
  const isRejected = crewData.status === "rejected";
  const leaderId = crewData.leaderId || "";

  const batch = admin.firestore().batch();
  memberIds.forEach((uid) => {
    const isLeader = uid === leaderId;
    // On rejection: leader keeps snapshot (to see reason & resubmit), others get cleared
    const keepSnapshot = isRejected && isLeader;
    batch.set(admin.firestore().collection("users").doc(uid), {
      crewId: isRejected ? "" : crewId,
      crewName: isRejected ? "" : (crewData.name || ""),
      crewRole: isRejected ? "" : (isLeader ? "leader" : "member"),
      crewColor: isRejected ? "#00d4ff" : (crewData.color || "#00d4ff"),
      crewStatus: crewData.status || "pending",
      crewGroupName: isRejected ? "" : (crewData.groupName || "자유 스터디"),
      crewInviteCode: isRejected ? "" : (crewData.inviteCode || ""),
      crewActiveStudyRoomId: isRejected ? "" : (crewData.activeStudyRoomId || ""),
      crewActiveStudyRoomStatus: isRejected ? "" : (crewData.activeStudyRoomStatus || ""),
      crewSnapshot: keepSnapshot ? crewSnapshot : (isRejected ? null : crewSnapshot),
      // Store rejected crew id on leader so they can resubmit
      ...(keepSnapshot ? { rejectedCrewId: crewId } : {}),
      ...(!isRejected && isLeader ? { rejectedCrewId: "" } : {}),
    }, { merge: true });
  });
  await batch.commit();
}

async function refreshCrewGreetings(crewId, crewData) {
  const recentSnap = await admin.firestore().collection("crews").doc(crewId).collection("greetings").orderBy("createdAt", "desc").limit(10).get();
  const batch = admin.firestore().batch();
  let hasWrites = false;
  const recentGreetings = [];

  recentSnap.docs.forEach((snap) => {
    const greetingData = snap.data() || {};
    const readState = getGreetingReadState(greetingData, crewData);
    if (readState.hasAllRead) {
      batch.delete(snap.ref);
      hasWrites = true;
      return;
    }

    const previousReadBy = uniqueIds(greetingData.readBy || []);
    if (readState.readBy.length !== previousReadBy.length || !readState.readBy.every((uid) => previousReadBy.includes(uid))) {
      batch.set(snap.ref, {
        readBy: readState.readBy,
        updatedAt: new Date(),
      }, { merge: true });
      hasWrites = true;
    }

    recentGreetings.push({
      id: snap.id,
      ...greetingData,
      readBy: readState.readBy,
      readCount: readState.readCount,
      readTotalCount: readState.totalCount,
      allRead: false,
    });
  });

  if (hasWrites) {
    await batch.commit();
  }

  await syncCrewToMembers(crewId, {
    ...crewData,
    updatedAt: new Date().toISOString(),
  }, recentGreetings);
  return recentGreetings;
}

exports.createStudyCrew = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const {
    name = "",
    motto = "",
    description = "",
    color = "#00d4ff",
    groupId = "none",
    groupName = "자유 스터디",
    clusterId = "",
    clusterName = "",
  } = data || {};

  const cleanName = String(name).trim().slice(0, 28);
  const cleanMotto = String(motto).trim().slice(0, 52);
  const cleanDescription = String(description).trim().slice(0, 500);
  const normalizedSchedule = normalizeCrewSchedule(data?.scheduleDays, data?.scheduleTimes);
  if (!cleanName) {
    throw new functions.https.HttpsError("invalid-argument", "크루 이름을 입력해주세요.");
  }

  const db = admin.firestore();
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    throw new functions.https.HttpsError("failed-precondition", "사용자 문서를 찾을 수 없습니다.");
  }
  if (userSnap.data().crewId) {
    throw new functions.https.HttpsError("failed-precondition", "이미 다른 크루에 속해 있습니다.");
  }

  const crewRef = db.collection("crews").doc();
  const inviteCode = Array.from(`${uid}-${cleanName}-${crewRef.id}`).reduce((acc, ch, idx) => acc + ((ch.charCodeAt(0) * (idx + 7)) % 36).toString(36), "").toUpperCase().slice(0, 6).padEnd(6, "A");
  const createdAt = new Date();
  const crewData = {
    name: cleanName,
    motto: cleanMotto,
    description: cleanDescription,
    color,
    groupId,
    groupName,
    clusterId,
    clusterName,
    ...normalizedSchedule,
    status: "pending",
    leaderId: uid,
    leaderName: getDisplayNameFromUser(userSnap.data() || {}),
    inviteCode,
    activeStudyRoomId: "",
    activeStudyRoomStatus: "",
    studyRoomCapacity: 3,
    memberIds: [uid],
    memberCount: 1,
    createdAt,
    updatedAt: createdAt,
  };

  await db.runTransaction(async (tx) => {
    const freshUserSnap = await tx.get(userRef);
    if (!freshUserSnap.exists) {
      throw new functions.https.HttpsError("failed-precondition", "사용자 문서를 찾을 수 없습니다.");
    }

    const freshUser = freshUserSnap.data() || {};
    if (freshUser.crewId) {
      throw new functions.https.HttpsError("failed-precondition", "이미 다른 크루에 속해 있습니다.");
    }
    if ((freshUser.crewCreationPasses || 0) < 1) {
      throw new functions.https.HttpsError("failed-precondition", "스터디 크루 창설권이 필요합니다. 스토어에서 1000광석으로 구매해주세요.");
    }

    // Note: pass is NOT consumed here. It is consumed when admin approves the crew.
    tx.set(crewRef, crewData);
  });

  await syncCrewToMembers(crewRef.id, {
    ...crewData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return { success: true, crewId: crewRef.id, inviteCode };
});

exports.joinStudyCrew = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const inviteCode = String(data?.inviteCode || "").trim().toUpperCase();
  if (!inviteCode) {
    throw new functions.https.HttpsError("invalid-argument", "초대 코드를 입력해주세요.");
  }

  const db = admin.firestore();
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    throw new functions.https.HttpsError("failed-precondition", "사용자 문서를 찾을 수 없습니다.");
  }
  if (userSnap.data().crewId) {
    throw new functions.https.HttpsError("failed-precondition", "이미 다른 크루에 속해 있습니다.");
  }

  const crewQuery = await db.collection("crews").where("inviteCode", "==", inviteCode).limit(1).get();
  if (crewQuery.empty) {
    throw new functions.https.HttpsError("not-found", "해당 초대 코드를 가진 크루를 찾지 못했습니다.");
  }

  const crewSnap = crewQuery.docs[0];
  const txResult = await db.runTransaction(async (tx) => {
    const [freshUserSnap, freshCrewSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(crewSnap.ref),
    ]);
    if (!freshUserSnap.exists) {
      throw new functions.https.HttpsError("failed-precondition", "사용자 문서를 찾을 수 없습니다.");
    }
    if (!freshCrewSnap.exists) {
      throw new functions.https.HttpsError("not-found", "해당 초대 코드를 가진 크루를 찾지 못했습니다.");
    }

    const freshUser = freshUserSnap.data() || {};
    const crewData = freshCrewSnap.data() || {};
    if (freshUser.crewId) {
      throw new functions.https.HttpsError("failed-precondition", "이미 다른 크루에 속해 있습니다.");
    }
    if ((freshUser.crewJoinPasses || 0) < 1) {
      throw new functions.https.HttpsError("failed-precondition", "스터디 크루 참여권이 필요합니다. 스토어에서 300광석으로 구매해주세요.");
    }
    if (crewData.status === "rejected") {
      throw new functions.https.HttpsError("failed-precondition", "참여할 수 없는 크루입니다.");
    }

    const nextMemberIds = Array.from(new Set([...(crewData.memberIds || []), uid]));
    const updatedCrew = {
      ...crewData,
      memberIds: nextMemberIds,
      memberCount: nextMemberIds.length,
      updatedAt: new Date(),
    };

    tx.set(freshCrewSnap.ref, {
      memberIds: nextMemberIds,
      memberCount: nextMemberIds.length,
      updatedAt: updatedCrew.updatedAt,
    }, { merge: true });
    tx.set(userRef, {
      crewJoinPasses: admin.firestore.FieldValue.increment(-1),
    }, { merge: true });

    return updatedCrew;
  });

  await syncCrewToMembers(crewSnap.id, {
    ...txResult,
    updatedAt: new Date().toISOString(),
  });

  return { success: true, crewId: crewSnap.id, inviteCode };
});

exports.updateStudyCrew = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const crewId = String(data?.crewId || "").trim();
  if (!crewId) throw new functions.https.HttpsError("invalid-argument", "크루 ID가 없습니다.");

  const db = admin.firestore();
  const crewRef = db.collection("crews").doc(crewId);
  const crewSnap = await crewRef.get();
  if (!crewSnap.exists) throw new functions.https.HttpsError("not-found", "크루를 찾을 수 없습니다.");

  const crewData = crewSnap.data() || {};
  if (crewData.leaderId !== uid) {
    const adminDoc = await db.collection("users").doc(uid).get();
    if (!adminDoc.exists || adminDoc.data().role !== "admin") {
      throw new functions.https.HttpsError("permission-denied", "크루 리더만 수정할 수 있습니다.");
    }
  }

  const nextName = String(data?.name || crewData.name || "").trim().slice(0, 28);
  const nextMotto = String(data?.motto || crewData.motto || "").trim().slice(0, 52);
  const nextDescription = String(data?.description ?? crewData.description ?? "").trim().slice(0, 500);
  const nextColor = String(data?.color || crewData.color || "#00d4ff");
  const nextGroupId = String(data?.groupId || crewData.groupId || "none");
  const nextGroupName = String(data?.groupName || crewData.groupName || "자유 스터디");
  const nextClusterId = String(data?.clusterId || crewData.clusterId || "");
  const nextClusterName = String(data?.clusterName || crewData.clusterName || "");
  const nextSchedule = normalizeCrewSchedule(
    data?.scheduleDays ?? crewData.scheduleDays,
    data?.scheduleTimes ?? crewData.scheduleTimes,
  );

  const updatedCrew = {
    ...crewData,
    name: nextName,
    motto: nextMotto,
    description: nextDescription,
    color: nextColor,
    groupId: nextGroupId,
    groupName: nextGroupName,
    clusterId: nextClusterId,
    clusterName: nextClusterName,
    ...nextSchedule,
    updatedAt: new Date(),
  };

  await crewRef.set(updatedCrew, { merge: true });
  await syncCrewToMembers(crewId, {
    ...crewData,
    ...updatedCrew,
    updatedAt: new Date().toISOString(),
  });

  return { success: true };
});

exports.reviewStudyCrew = regionalFunctions.https.onCall(async (data, context) => {
  await requireAdminUid(context);
  const crewId = String(data?.crewId || "").trim();
  const action = String(data?.action || "").trim();
  const rejectionReason = String(data?.rejectionReason || "").trim().slice(0, 200);
  if (!crewId) throw new functions.https.HttpsError("invalid-argument", "크루 ID가 없습니다.");
  if (!["approve", "reject"].includes(action)) {
    throw new functions.https.HttpsError("invalid-argument", "처리 동작이 올바르지 않습니다.");
  }

  const db = admin.firestore();
  const crewRef = db.collection("crews").doc(crewId);
  const crewSnap = await crewRef.get();
  if (!crewSnap.exists) throw new functions.https.HttpsError("not-found", "크루를 찾을 수 없습니다.");

  const crewData = crewSnap.data() || {};
  if (action === "approve") {
    // Consume creation pass from leader on approval
    const leaderId = crewData.leaderId;
    if (leaderId) {
      const leaderRef = db.collection("users").doc(leaderId);
      const leaderSnap = await leaderRef.get();
      if (leaderSnap.exists && (leaderSnap.data()?.crewCreationPasses || 0) >= 1) {
        await leaderRef.set({
          crewCreationPasses: admin.firestore.FieldValue.increment(-1),
          rejectedCrewId: "",
        }, { merge: true });
      }
    }

    const updatedCrew = {
      ...crewData,
      status: "approved",
      rejectionReason: "",
      activeStudyRoomId: crewData.activeStudyRoomId || "",
      activeStudyRoomStatus: crewData.activeStudyRoomStatus || "",
      studyRoomCapacity: crewData.studyRoomCapacity || 3,
      approvedAt: new Date(),
      updatedAt: new Date(),
    };
    await crewRef.set(updatedCrew, { merge: true });
    await syncCrewToMembers(crewId, {
      ...crewData,
      status: "approved",
      rejectionReason: "",
      activeStudyRoomId: crewData.activeStudyRoomId || "",
      activeStudyRoomStatus: crewData.activeStudyRoomStatus || "",
      studyRoomCapacity: crewData.studyRoomCapacity || 3,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  }

  // Reject with reason
  if (!rejectionReason) {
    throw new functions.https.HttpsError("invalid-argument", "반려 사유를 입력해주세요.");
  }

  const updatedCrew = {
    ...crewData,
    status: "rejected",
    rejectionReason,
    activeStudyRoomId: "",
    activeStudyRoomStatus: "",
    rejectedAt: new Date(),
    updatedAt: new Date(),
  };
  await crewRef.set(updatedCrew, { merge: true });
  await syncCrewToMembers(crewId, {
    ...crewData,
    status: "rejected",
    rejectionReason,
    activeStudyRoomId: "",
    activeStudyRoomStatus: "",
    rejectedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return { success: true };
});

exports.resubmitStudyCrew = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const crewId = String(data?.crewId || "").trim();
  if (!crewId) throw new functions.https.HttpsError("invalid-argument", "크루 ID가 없습니다.");

  const {
    name = "",
    motto = "",
    description = "",
    color = "#00d4ff",
    groupId = "none",
    groupName = "자유 스터디",
    clusterId = "",
    clusterName = "",
  } = data || {};

  const cleanName = String(name).trim().slice(0, 28);
  const cleanMotto = String(motto).trim().slice(0, 52);
  const cleanDescription = String(description).trim().slice(0, 500);
  const normalizedSchedule = normalizeCrewSchedule(data?.scheduleDays, data?.scheduleTimes);
  if (!cleanName) {
    throw new functions.https.HttpsError("invalid-argument", "크루 이름을 입력해주세요.");
  }

  const db = admin.firestore();
  const crewRef = db.collection("crews").doc(crewId);
  const crewSnap = await crewRef.get();
  if (!crewSnap.exists) throw new functions.https.HttpsError("not-found", "크루를 찾을 수 없습니다.");

  const crewData = crewSnap.data() || {};
  if (crewData.leaderId !== uid) {
    throw new functions.https.HttpsError("permission-denied", "크루 리더만 재신청할 수 있습니다.");
  }
  if (crewData.status !== "rejected") {
    throw new functions.https.HttpsError("failed-precondition", "반려된 크루만 재신청할 수 있습니다.");
  }

  // Verify leader still has a creation pass
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    throw new functions.https.HttpsError("failed-precondition", "사용자 문서를 찾을 수 없습니다.");
  }
  if ((userSnap.data()?.crewCreationPasses || 0) < 1) {
    throw new functions.https.HttpsError("failed-precondition", "스터디 크루 창설권이 필요합니다.");
  }
  if (userSnap.data()?.crewId) {
    throw new functions.https.HttpsError("failed-precondition", "이미 다른 크루에 속해 있습니다.");
  }

  const updatedCrew = {
    ...crewData,
    name: cleanName,
    motto: cleanMotto,
    description: cleanDescription,
    color,
    groupId,
    groupName,
    clusterId,
    clusterName,
    ...normalizedSchedule,
    status: "pending",
    rejectionReason: "",
    memberIds: [uid],
    memberCount: 1,
    resubmittedAt: new Date(),
    updatedAt: new Date(),
  };

  await crewRef.set(updatedCrew, { merge: true });

  // Re-associate leader with this crew
  await syncCrewToMembers(crewId, {
    ...updatedCrew,
    resubmittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return { success: true, crewId };
});

exports.postStudyCrewGreeting = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const crewId = String(data?.crewId || "").trim();
  const text = String(data?.text || "").trim().slice(0, 240);
  if (!crewId || !text) {
    throw new functions.https.HttpsError("invalid-argument", "포스트잇 내용이 올바르지 않습니다.");
  }

  const db = admin.firestore();
  const crewRef = db.collection("crews").doc(crewId);
  const crewSnap = await crewRef.get();
  if (!crewSnap.exists) throw new functions.https.HttpsError("not-found", "크루를 찾을 수 없습니다.");

  const crewData = crewSnap.data() || {};
  const memberIds = crewData.memberIds || [];
  if (!memberIds.includes(uid) && crewData.leaderId !== uid) {
    const adminDoc = await db.collection("users").doc(uid).get();
    if (!adminDoc.exists || adminDoc.data().role !== "admin") {
      throw new functions.https.HttpsError("permission-denied", "크루 멤버만 포스트잇을 남길 수 있습니다.");
    }
  }

  const greetingRef = crewRef.collection("greetings").doc();
  const greeting = {
    crewId,
    userId: uid,
    userName: context.auth.token?.name || context.auth.token?.email || "탐사원",
    text,
    readBy: [uid],
    createdAt: new Date(),
  };
  await greetingRef.set(greeting);

  await refreshCrewGreetings(crewId, crewData);

  return { success: true };
});

exports.markStudyCrewGreetingRead = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const crewId = String(data?.crewId || "").trim();
  const greetingId = String(data?.greetingId || "").trim();
  if (!crewId || !greetingId) {
    throw new functions.https.HttpsError("invalid-argument", "포스트잇 정보를 찾을 수 없습니다.");
  }

  const db = admin.firestore();
  const crewRef = db.collection("crews").doc(crewId);
  const greetingRef = crewRef.collection("greetings").doc(greetingId);

  await db.runTransaction(async (tx) => {
    const [crewSnap, greetingSnap] = await Promise.all([tx.get(crewRef), tx.get(greetingRef)]);
    if (!crewSnap.exists) {
      throw new functions.https.HttpsError("not-found", "크루를 찾을 수 없습니다.");
    }
    if (!greetingSnap.exists) {
      return;
    }

    const crewData = crewSnap.data() || {};
    const greetingData = greetingSnap.data() || {};
    const { readBy, hasAllRead } = getGreetingReadState(greetingData, crewData);
    if (hasAllRead) {
      tx.delete(greetingRef);
      return;
    }
    if (!readBy.includes(uid)) {
      readBy.push(uid);
    }
    tx.set(greetingRef, {
      readBy: uniqueIds(readBy),
      updatedAt: new Date(),
    }, { merge: true });
  });

  const crewSnap = await crewRef.get();
  await refreshCrewGreetings(crewId, crewSnap.data() || {});
  return { success: true };
});

exports.deleteStudyCrewGreeting = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const crewId = String(data?.crewId || "").trim();
  const greetingId = String(data?.greetingId || "").trim();
  if (!crewId || !greetingId) {
    throw new functions.https.HttpsError("invalid-argument", "포스트잇 정보를 찾을 수 없습니다.");
  }

  const db = admin.firestore();
  const crewRef = db.collection("crews").doc(crewId);
  const greetingRef = crewRef.collection("greetings").doc(greetingId);

  const [crewSnap, greetingSnap] = await Promise.all([crewRef.get(), greetingRef.get()]);
  if (!crewSnap.exists) {
    throw new functions.https.HttpsError("not-found", "크루를 찾을 수 없습니다.");
  }
  if (!greetingSnap.exists) {
    return { success: true };
  }

  const greetingData = greetingSnap.data() || {};
  const adminDoc = await db.collection("users").doc(uid).get();
  const canDelete = greetingData.userId === uid || (adminDoc.exists && adminDoc.data().role === "admin");
  if (!canDelete) {
    throw new functions.https.HttpsError("permission-denied", "본인이 작성한 포스트잇만 삭제할 수 있습니다.");
  }

  await greetingRef.delete();

  const refreshedCrewSnap = await crewRef.get();
  await refreshCrewGreetings(crewId, refreshedCrewSnap.data() || {});
  return { success: true };
});

exports.listStudyCrews = regionalFunctions.https.onCall(async (_data, context) => {
  await requireAdminUid(context);
  const snap = await admin.firestore().collection("crews").orderBy("createdAt", "desc").get();
  const crews = await Promise.all(snap.docs.map(async (docSnap) => {
    const crewData = docSnap.data() || {};
    const memberIds = getCrewMemberIds(crewData);
    const members = await loadMemberSummaries(memberIds);
    return {
      id: docSnap.id,
      ...crewData,
      memberIds,
      memberCount: crewData.memberCount || memberIds.length,
      members,
    };
  }));

  return {
    crews,
  };
});

exports.giftStoreItem = regionalFunctions.https.onCall(async (data, context) => {
  const senderId = await requireAuthUid(context);
  const recipientId = String(data?.recipientId || "").trim();
  const itemId = String(data?.itemId || "").trim();
  const mode = String(data?.mode || "purchase").trim();
  const item = STORE_ITEM_GIFT_CATALOG[itemId];

  if (!recipientId) {
    throw new functions.https.HttpsError("invalid-argument", "받는 사람을 선택해주세요.");
  }
  if (recipientId === senderId) {
    throw new functions.https.HttpsError("invalid-argument", "자기 자신에게는 상점 아이템을 선물할 수 없습니다.");
  }
  if (!item) {
    throw new functions.https.HttpsError("invalid-argument", "선물할 수 없는 아이템입니다.");
  }
  if (mode !== "purchase" && mode !== "owned") {
    throw new functions.https.HttpsError("invalid-argument", "선물 방식이 올바르지 않습니다.");
  }
  if (mode === "owned" && item.ownedMode !== "count") {
    throw new functions.https.HttpsError("failed-precondition", "이 아이템은 보유분 선물이 불가능합니다. 구매해서 선물해주세요.");
  }

  const db = admin.firestore();
  const now = new Date();
  const nowMs = now.getTime();
  const nowTimestamp = admin.firestore.Timestamp.fromDate(now);
  const senderRef = db.collection("users").doc(senderId);
  const recipientRef = db.collection("users").doc(recipientId);
  const giftRef = db.collection("storeItemGifts").doc();
  const senderTxRef = senderRef.collection("crystal_transactions").doc(`store-item-gift-sent-${giftRef.id}`);
  const recipientTxRef = recipientRef.collection("crystal_transactions").doc(`store-item-gift-received-${giftRef.id}`);

  const result = await db.runTransaction(async (tx) => {
    const [senderSnap, recipientSnap] = await Promise.all([
      tx.get(senderRef),
      tx.get(recipientRef),
    ]);

    if (!senderSnap.exists) {
      throw new functions.https.HttpsError("failed-precondition", "보내는 사람 프로필을 찾지 못했습니다.");
    }
    if (!recipientSnap.exists) {
      throw new functions.https.HttpsError("not-found", "받는 사람 프로필을 찾지 못했습니다.");
    }

    const senderData = senderSnap.data() || {};
    const recipientData = recipientSnap.data() || {};
    if (senderData.role === "parent" || senderData.role === "admin") {
      throw new functions.https.HttpsError("permission-denied", "학생 계정만 상점 아이템을 선물할 수 있습니다.");
    }
    if (recipientData.role === "parent" || recipientData.role === "admin") {
      throw new functions.https.HttpsError("failed-precondition", "학생 계정에게만 상점 아이템을 선물할 수 있습니다.");
    }

    const senderUpdates = {};
    const recipientUpdates = {};
    const senderCrystals = Math.max(0, Number(senderData.crystals || 0));
    const senderName = getDisplayNameFromUser(senderData);
    const recipientName = getDisplayNameFromUser(recipientData);
    let shouldSyncRecipientAnswers = false;

    if (mode === "purchase") {
      if (senderCrystals < item.cost) {
        throw new functions.https.HttpsError("failed-precondition", "보유 광석이 부족합니다.");
      }
      senderUpdates.crystals = senderCrystals - item.cost;
    } else {
      const senderOwned = Math.max(0, Number(senderData[item.senderField] || 0));
      if (senderOwned < item.transferAmount) {
        const unitLabel = itemId === "photon_shield" ? `${item.transferAmount}회분` : `${item.transferAmount}개`;
        throw new functions.https.HttpsError("failed-precondition", `${item.name} 보유분이 부족합니다. (${unitLabel} 필요)`);
      }
      senderUpdates[item.senderField] = senderOwned - item.transferAmount;
      if (itemId === "cryo_core") {
        senderUpdates.streakWriteAudit = buildServerStreakGiftAudit({
          source: "space_store_gift_send_cryo_core",
          writerUid: senderId,
          prevState: senderData,
          nextFreezeCount: senderOwned - item.transferAmount,
          writtenAt: nowTimestamp,
          note: giftRef.id,
        });
      }
    }

    if (itemId === "radar") {
      if (isRadarActiveServer(recipientData, nowMs)) {
        throw new functions.https.HttpsError("failed-precondition", `${recipientName}님은 이미 ${item.name}를 활성화 중입니다.`);
      }
      recipientUpdates.hasRadar = true;
      recipientUpdates.radarActivatedAtMs = nowMs;
      recipientUpdates.radarExpiresAtMs = nowMs + STORE_RADAR_DURATION_DAYS * 24 * 60 * 60 * 1000;
    } else if (item.uniqueField) {
      if (recipientData[item.uniqueField]) {
        throw new functions.https.HttpsError("failed-precondition", `${recipientName}님은 이미 ${item.name}를 보유 중입니다.`);
      }
      recipientUpdates[item.uniqueField] = true;
      shouldSyncRecipientAnswers = true;
    } else if (item.frameId) {
      const recipientFrames = getOwnedProfileFrames(recipientData);
      if (recipientFrames.includes(item.frameId)) {
        throw new functions.https.HttpsError("failed-precondition", `${recipientName}님은 이미 ${item.name}를 보유 중입니다.`);
      }
      recipientUpdates.ownedProfileFrames = [...recipientFrames, item.frameId];
      recipientUpdates.selectedProfileFrame = item.frameId;
      shouldSyncRecipientAnswers = true;
    } else {
      const currentRecipientOwned = Math.max(0, Number(recipientData[item.recipientField] || 0));
      const nextRecipientOwned = currentRecipientOwned + item.transferAmount;
      if (item.maxRecipientValue && nextRecipientOwned > item.maxRecipientValue) {
        throw new functions.https.HttpsError("failed-precondition", `${recipientName}님은 ${item.name}를 더 받을 수 없습니다.`);
      }
      recipientUpdates[item.recipientField] = nextRecipientOwned;
      if (itemId === "cryo_core") {
        recipientUpdates.streakWriteAudit = buildServerStreakGiftAudit({
          source: "space_store_gift_receive_cryo_core",
          writerUid: senderId,
          prevState: recipientData,
          nextFreezeCount: nextRecipientOwned,
          writtenAt: nowTimestamp,
          note: giftRef.id,
        });
      }
    }

    const giftData = {
      senderId,
      senderName,
      recipientId,
      recipientName,
      itemId,
      itemName: item.name,
      mode,
      cost: mode === "purchase" ? item.cost : 0,
      transferAmount: item.transferAmount || 1,
      createdAt: nowTimestamp,
    };

    tx.set(giftRef, giftData);
    tx.set(senderRef, senderUpdates, { merge: true });
    tx.set(recipientRef, recipientUpdates, { merge: true });
    tx.set(senderTxRef, {
      amount: mode === "purchase" ? -item.cost : 0,
      type: mode === "purchase" ? "store_gift_purchase" : "store_item_gift_sent",
      description: `${recipientName}님에게 ${item.name} 선물`,
      metadata: {
        giftId: giftRef.id,
        recipientId,
        recipientName,
        itemId,
        itemName: item.name,
        giftMode: mode,
      },
      timestamp: nowTimestamp,
    });
    tx.set(recipientTxRef, {
      amount: 0,
      type: "store_item_gift_received",
      description: `${senderName}님에게 ${item.name} 선물 받음`,
      metadata: {
        giftId: giftRef.id,
        senderId,
        senderName,
        itemId,
        itemName: item.name,
        giftMode: mode,
      },
      timestamp: nowTimestamp,
    });

    return {
      giftId: giftRef.id,
      recipientName,
      itemName: item.name,
      mode,
      shouldSyncRecipientAnswers,
    };
  });

  if (result.shouldSyncRecipientAnswers) {
    try {
      const recipientSnap = await recipientRef.get();
      if (recipientSnap.exists) {
        await syncAnswerProfileSnapshotsForUser(recipientId, recipientSnap.data() || {});
      }
    } catch (error) {
      console.error("giftStoreItem answer profile sync failed:", error);
    }
  }

  return {
    success: true,
    ...result,
  };
});

exports.transferCrystals = regionalFunctions.https.onCall(async (data, context) => {
  const senderId = await requireAuthUid(context);
  const recipientId = String(data?.recipientId || "").trim();
  const amount = Number(data?.amount);

  if (!recipientId) {
    throw new functions.https.HttpsError("invalid-argument", "받는 사람을 선택해주세요.");
  }
  if (recipientId === senderId) {
    throw new functions.https.HttpsError("invalid-argument", "자기 자신에게는 광석을 보낼 수 없습니다.");
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new functions.https.HttpsError("invalid-argument", "보낼 광석 수를 1 이상 정수로 입력해주세요.");
  }
  if (amount > CRYSTAL_GIFT_DAILY_LIMIT) {
    throw new functions.https.HttpsError("failed-precondition", `하루에 보낼 수 있는 광석은 최대 ${CRYSTAL_GIFT_DAILY_LIMIT}개입니다.`);
  }

  const db = admin.firestore();
  const now = new Date();
  const nowTimestamp = admin.firestore.Timestamp.fromDate(now);
  const dayKey = getKstDateKey(now);
  const senderRef = db.collection("users").doc(senderId);
  const recipientRef = db.collection("users").doc(recipientId);
  const limitRef = db.collection("crystalTransferDailyLimits").doc(`${senderId}_${dayKey}`);
  const giftRef = db.collection("crystalTransfers").doc();
  const senderTxRef = senderRef.collection("crystal_transactions").doc(`gift-sent-${giftRef.id}`);
  const recipientTxRef = recipientRef.collection("crystal_transactions").doc(`gift-received-${giftRef.id}`);

  const result = await db.runTransaction(async (tx) => {
    const [senderSnap, recipientSnap, limitSnap] = await Promise.all([
      tx.get(senderRef),
      tx.get(recipientRef),
      tx.get(limitRef),
    ]);

    if (!senderSnap.exists) {
      throw new functions.https.HttpsError("failed-precondition", "보내는 사람 프로필을 찾지 못했습니다.");
    }
    if (!recipientSnap.exists) {
      throw new functions.https.HttpsError("not-found", "받는 사람 프로필을 찾지 못했습니다.");
    }

    const senderData = senderSnap.data() || {};
    const recipientData = recipientSnap.data() || {};
    if (senderData.role === "parent" || senderData.role === "admin") {
      throw new functions.https.HttpsError("permission-denied", "학생 계정만 광석을 보낼 수 있습니다.");
    }
    if (recipientData.role === "parent" || recipientData.role === "admin") {
      throw new functions.https.HttpsError("failed-precondition", "학생 계정에게만 광석을 보낼 수 있습니다.");
    }

    const senderCrystals = Math.max(0, Number(senderData.crystals || 0));
    if (senderCrystals < amount) {
      throw new functions.https.HttpsError("failed-precondition", "보유 광석이 부족합니다.");
    }

    const sentToday = Math.max(0, Number(limitSnap.data()?.sentAmount || 0));
    if (sentToday + amount > CRYSTAL_GIFT_DAILY_LIMIT) {
      const remaining = Math.max(0, CRYSTAL_GIFT_DAILY_LIMIT - sentToday);
      throw new functions.https.HttpsError(
        "failed-precondition",
        `오늘은 ${remaining}광석까지만 더 보낼 수 있습니다.`
      );
    }

    const senderName = getDisplayNameFromUser(senderData);
    const recipientName = getDisplayNameFromUser(recipientData);
    const transferData = {
      senderId,
      senderName,
      recipientId,
      recipientName,
      amount,
      dayKey,
      createdAt: nowTimestamp,
    };

    tx.set(giftRef, transferData);
    tx.set(senderRef, {
      crystals: senderCrystals - amount,
    }, { merge: true });
    tx.set(recipientRef, {
      crystals: Math.max(0, Number(recipientData.crystals || 0)) + amount,
    }, { merge: true });
    tx.set(limitRef, {
      senderId,
      dayKey,
      sentAmount: sentToday + amount,
      updatedAt: nowTimestamp,
    }, { merge: true });
    tx.set(senderTxRef, {
      amount: -amount,
      type: "crystal_gift_sent",
      description: `${recipientName}님에게 광석 선물`,
      metadata: {
        transferId: giftRef.id,
        recipientId,
        recipientName,
        dayKey,
      },
      timestamp: nowTimestamp,
    });
    tx.set(recipientTxRef, {
      amount,
      type: "crystal_gift_received",
      description: `${senderName}님에게 받은 광석 선물`,
      metadata: {
        transferId: giftRef.id,
        senderId,
        senderName,
        dayKey,
      },
      timestamp: nowTimestamp,
    });

    return {
      transferId: giftRef.id,
      recipientName,
      sentToday: sentToday + amount,
      remainingToday: CRYSTAL_GIFT_DAILY_LIMIT - sentToday - amount,
    };
  });

  return {
    success: true,
    dailyLimit: CRYSTAL_GIFT_DAILY_LIMIT,
    ...result,
  };
});

exports.applyMissingAssignmentPenalties = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const normalizedClusterId = normalizeClusterId(data?.clusterId);
  if (!normalizedClusterId) {
    throw new functions.https.HttpsError("invalid-argument", "클러스터 정보가 필요합니다.");
  }

  const db = admin.firestore();
  const now = new Date();
  const nowMs = now.getTime();
  const nowTimestamp = admin.firestore.Timestamp.fromDate(now);
  const recentDates = getRecentKstDateKeys(ASSIGNMENT_MISSING_LOOKBACK_DAYS, now);
  const submittedStatuses = new Set(["submitted", "reviewed", "needs_revision"]);

  const [attendanceSnap, assignmentSnap] = await Promise.all([
    db.collection("attendance")
      .where("userId", "==", uid)
      .where("clusterId", "==", normalizedClusterId)
      .where("date", "in", recentDates)
      .get(),
    db.collection("assignments")
      .where("userId", "==", uid)
      .where("clusterId", "==", normalizedClusterId)
      .where("date", "in", recentDates)
      .get(),
  ]);

  const assignmentDates = new Set();
  assignmentSnap.docs.forEach((snap) => {
    const item = snap.data() || {};
    if (item.date && submittedStatuses.has(item.status)) {
      assignmentDates.add(item.date);
    }
  });

  const attendanceRows = attendanceSnap.docs
    .map((snap) => ({ id: snap.id, ...(snap.data() || {}) }))
    .filter((item) => item.date)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  let missingStreak = 0;
  const candidates = [];
  attendanceRows.forEach((attendance) => {
    if (assignmentDates.has(attendance.date)) {
      missingStreak = 0;
      return;
    }

    missingStreak += 1;
    const baseMs = getAttendanceBaseMs(attendance);
    if (!baseMs || nowMs - baseMs < ASSIGNMENT_MISSING_GRACE_MS) return;

    const penalty = getAssignmentMissingPenalty(missingStreak);
    candidates.push({
      attendance,
      missingStreak,
      penaltyAmount: -penalty,
      txId: `assignment_missing_${normalizedClusterId}_${attendance.date}`,
      warningId: missingStreak === 3
        ? `warning_${uid}_${normalizedClusterId}_${attendance.date}_consecutive_missing_3`
        : "",
    });
  });

  const userRef = db.collection("users").doc(uid);
  let applied = 0;
  let skippedExisting = 0;
  let warningCreated = 0;
  const appliedDates = [];

  for (const item of candidates) {
    const txRef = userRef.collection("crystal_transactions").doc(item.txId);
    const warningRef = item.warningId ? db.collection("assignmentWarnings").doc(item.warningId) : null;
    const missingNotificationRef = db.collection("notifications").doc(`assignment_missing_${uid}_${normalizedClusterId}_${item.attendance.date}`);

    const result = await db.runTransaction(async (tx) => {
      const [userSnap, existingTxSnap, existingWarningSnap] = await Promise.all([
        tx.get(userRef),
        tx.get(txRef),
        warningRef ? tx.get(warningRef) : Promise.resolve(null),
      ]);

      if (!userSnap.exists) {
        throw new functions.https.HttpsError("failed-precondition", "사용자 문서를 찾을 수 없습니다.");
      }
      if (existingTxSnap.exists) {
        return { didApply: false, didCreateWarning: false };
      }

      const userData = userSnap.data() || {};
      const penaltyAbs = Math.abs(item.penaltyAmount);
      tx.set(txRef, {
        amount: item.penaltyAmount,
        type: "assignment_missing_penalty",
        description: `출석 후 과제 미제출 페널티 (${item.attendance.date}, 최근 7일 검토)`,
        metadata: {
          clusterId: normalizedClusterId,
          normalizedClusterId,
          date: item.attendance.date,
          attendanceId: item.attendance.id || "",
          missingStreak: item.missingStreak,
          basePenalty: ASSIGNMENT_MISSING_BASE_PENALTY,
          consecutivePenalty: Math.max(0, penaltyAbs - ASSIGNMENT_MISSING_BASE_PENALTY),
          maxPenalty: ASSIGNMENT_MISSING_MAX_PENALTY,
          graceHours: 12,
          lookbackDays: ASSIGNMENT_MISSING_LOOKBACK_DAYS,
          source: "applyMissingAssignmentPenalties",
        },
        timestamp: nowTimestamp,
      });

      tx.set(userRef, {
        crystals: Number(userData.crystals || 0) + item.penaltyAmount,
        lastAssignmentPenaltyAt: nowTimestamp,
      }, { merge: true });

      tx.set(missingNotificationRef, {
        recipientId: uid,
        type: "assignment_missing",
        message: `출석 후 과제 미제출이 확인되었습니다. (${item.attendance.date})`,
        link: buildAssignmentHubLink(normalizedClusterId, item.attendance.date),
        isRead: false,
        createdAt: nowTimestamp,
        metadata: {
          clusterId: normalizedClusterId,
          date: item.attendance.date,
          attendanceId: item.attendance.id || "",
          missingStreak: item.missingStreak,
          source: "applyMissingAssignmentPenalties",
        },
      }, { merge: true });

      let didCreateWarning = false;
      if (warningRef && !existingWarningSnap?.exists) {
        tx.set(warningRef, {
          userId: uid,
          assignmentId: "",
          clusterId: normalizedClusterId,
          regionId: item.attendance.regionId || "",
          date: item.attendance.date,
          type: "consecutive_missing_assignment",
          status: "active",
          severity: "warning",
          message: "연속 3회 과제 미제출이 확인되어 학습 경고가 기록되었습니다.",
          policyMessage: "경고 3회 누적 시 수강료가 10% 인상될 수 있습니다.",
          evidence: {
            missingStreak: item.missingStreak,
            attendanceId: item.attendance.id || "",
            graceHours: 12,
            lookbackDays: ASSIGNMENT_MISSING_LOOKBACK_DAYS,
          },
          appealLocked: false,
          createdBy: "server_missing_assignment_sweep",
          createdAt: nowTimestamp,
          updatedAt: nowTimestamp,
        }, { merge: true });
        didCreateWarning = true;
      }

      return { didApply: true, didCreateWarning };
    });

    if (result.didApply) {
      applied += 1;
      appliedDates.push(item.attendance.date);
    } else {
      skippedExisting += 1;
    }
    if (result.didCreateWarning) warningCreated += 1;
  }

  return {
    success: true,
    lookbackDays: ASSIGNMENT_MISSING_LOOKBACK_DAYS,
    checkedDates: recentDates,
    candidateCount: candidates.length,
    applied,
    skippedExisting,
    warningCreated,
    appliedDates,
  };
});

exports.notifyAssignmentWarningCreated = regionalFunctions.firestore
  .document("assignmentWarnings/{warningId}")
  .onCreate(async (snap, context) => {
    const warning = snap.data() || {};
    const userId = warning.userId;
    if (!userId) return null;

    const typeLabel = warning.type === "consecutive_missing_assignment"
      ? "연속 3회 과제 미제출 경고"
      : "불성실 과제 제출 경고";
    const dateLabel = warning.date ? ` (${warning.date})` : "";

    await admin.firestore().collection("notifications").doc(`assignment_warning_${context.params.warningId}`).set({
      recipientId: userId,
      type: "assignment_warning",
      message: `${typeLabel}가 기록되었습니다.${dateLabel}`,
      link: buildAssignmentHubLink(warning.clusterId, warning.date),
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
      metadata: {
        warningId: context.params.warningId,
        warningType: warning.type || "",
        clusterId: warning.clusterId || "",
        date: warning.date || "",
        assignmentId: warning.assignmentId || "",
      },
    }, { merge: true });

    return null;
  });

exports.notifyAssignmentHighBonus = regionalFunctions.firestore
  .document("assignments/{assignmentId}")
  .onWrite(async (change, context) => {
    if (!change.after.exists) return null;

    const before = change.before.exists ? (change.before.data() || {}) : {};
    const after = change.after.data() || {};
    const beforeQualified = before.status === "reviewed" && Number(before.bonusCrystals || 0) >= 40;
    const afterBonus = Number(after.bonusCrystals || 0);
    const afterQualified = after.status === "reviewed" && afterBonus >= 40;

    if (!after.userId || !afterQualified || beforeQualified) return null;

    const clusterLabel = getAssignmentNotificationClusterLabel(after.clusterId);
    await admin.firestore().collection("notifications").doc(`assignment_bonus_${context.params.assignmentId}`).set({
      recipientId: after.userId,
      type: "assignment_bonus",
      message: `${clusterLabel} 과제에서 보너스 광석 ${Math.floor(afterBonus)}점을 받았습니다.`,
      link: buildAssignmentHubLink(after.clusterId, after.date),
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
      metadata: {
        assignmentId: context.params.assignmentId,
        clusterId: after.clusterId || "",
        date: after.date || "",
        bonusCrystals: afterBonus,
      },
    }, { merge: true });

    return null;
  });

exports.sendDirectMemo = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const recipientId = String(data?.recipientId || "").trim();
  const body = normalizeDirectMemoBody(data?.body);

  if (!recipientId) {
    throw new functions.https.HttpsError("invalid-argument", "받는 사람을 선택해주세요.");
  }
  if (recipientId === uid) {
    throw new functions.https.HttpsError("invalid-argument", "자기 자신에게는 편지를 보낼 수 없습니다.");
  }
  if (!body) {
    throw new functions.https.HttpsError("invalid-argument", "편지 내용을 입력해주세요.");
  }

  const db = admin.firestore();
  const senderRef = db.collection("users").doc(uid);
  const recipientRef = db.collection("users").doc(recipientId);
  const limitRef = senderRef.collection("directMemoLimits").doc(recipientId);
  const memoRef = db.collection("directMemos").doc();

  const result = await db.runTransaction(async (tx) => {
    const [senderSnap, recipientSnap, limitSnap] = await Promise.all([
      tx.get(senderRef),
      tx.get(recipientRef),
      tx.get(limitRef),
    ]);

    if (!senderSnap.exists) {
      throw new functions.https.HttpsError("failed-precondition", "보내는 사람 프로필을 찾지 못했습니다.");
    }
    if (!recipientSnap.exists) {
      throw new functions.https.HttpsError("not-found", "받는 사람 프로필을 찾지 못했습니다.");
    }

    const senderData = senderSnap.data() || {};
    const recipientData = recipientSnap.data() || {};
    const nowMillis = Date.now();
    const now = admin.firestore.Timestamp.fromMillis(nowMillis);
    const lastImmediateAt = toAdminTimestamp(limitSnap.data()?.lastImmediateSentAt);
    const lastScheduledDeliverAt = toAdminTimestamp(limitSnap.data()?.lastScheduledDeliverAt);
    const lastImmediateMillis = lastImmediateAt?.toMillis?.() || 0;
    const lastScheduledDeliverMillis = lastScheduledDeliverAt?.toMillis?.() || 0;
    const hasActiveScheduleQueue = lastScheduledDeliverMillis > nowMillis;
    const shouldSchedule = hasActiveScheduleQueue || (lastImmediateMillis > 0 && nowMillis - lastImmediateMillis < DIRECT_MEMO_COOLDOWN_MS);
    const deliverAtMillis = shouldSchedule
      ? (hasActiveScheduleQueue ? lastScheduledDeliverMillis + DIRECT_MEMO_COOLDOWN_MS : nowMillis + DIRECT_MEMO_COOLDOWN_MS)
      : nowMillis;
    const deliverAt = admin.firestore.Timestamp.fromMillis(deliverAtMillis);
    const status = shouldSchedule ? "scheduled" : "delivered";

    const memoData = {
      senderId: uid,
      senderName: getDisplayNameFromUser(senderData),
      recipientId,
      recipientName: getDisplayNameFromUser(recipientData),
      participantIds: [uid, recipientId],
      body,
      bodyPreview: getDirectMemoPreview(body),
      status,
      isRead: false,
      createdAt: now,
      updatedAt: now,
      deliverAt,
      sentAt: status === "delivered" ? now : null,
      readAt: null,
      senderArchivedAt: null,
      recipientArchivedAt: null,
      senderDeletedAt: null,
      recipientDeletedAt: null,
    };

    tx.set(memoRef, memoData);
    if (status === "delivered") {
      tx.set(limitRef, {
        recipientId,
        lastImmediateSentAt: now,
        updatedAt: now,
      }, { merge: true });
      createDirectMemoNotification(tx, memoRef, memoData);
    } else {
      tx.set(limitRef, {
        recipientId,
        lastScheduledAt: now,
        lastScheduledDeliverAt: deliverAt,
        updatedAt: now,
      }, { merge: true });
    }

    return {
      memoId: memoRef.id,
      status,
      deliverAtMillis,
      recipientName: memoData.recipientName,
    };
  });

  return result;
});

exports.markDirectMemoRead = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const memoId = String(data?.memoId || "").trim();
  if (!memoId) {
    throw new functions.https.HttpsError("invalid-argument", "편지 정보를 찾을 수 없습니다.");
  }

  const memoRef = admin.firestore().collection("directMemos").doc(memoId);
  await admin.firestore().runTransaction(async (tx) => {
    const memoSnap = await tx.get(memoRef);
    if (!memoSnap.exists) {
      throw new functions.https.HttpsError("not-found", "편지를 찾을 수 없습니다.");
    }

    const memo = memoSnap.data() || {};
    if (memo.recipientId !== uid) {
      throw new functions.https.HttpsError("permission-denied", "받은 편지만 읽음 처리할 수 있습니다.");
    }
    if (memo.status !== "delivered") return;
    if (memo.isRead) return;

    const now = admin.firestore.Timestamp.now();
    tx.set(memoRef, {
      isRead: true,
      readAt: now,
      updatedAt: now,
    }, { merge: true });
  });

  return { success: true };
});

exports.archiveDirectMemo = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const memoId = String(data?.memoId || "").trim();
  if (!memoId) {
    throw new functions.https.HttpsError("invalid-argument", "편지 정보를 찾을 수 없습니다.");
  }

  const memoRef = admin.firestore().collection("directMemos").doc(memoId);
  await admin.firestore().runTransaction(async (tx) => {
    const memoSnap = await tx.get(memoRef);
    if (!memoSnap.exists) {
      throw new functions.https.HttpsError("not-found", "편지를 찾을 수 없습니다.");
    }

    const memo = memoSnap.data() || {};
    const now = admin.firestore.Timestamp.now();
    if (memo.recipientId === uid) {
      tx.set(memoRef, { recipientArchivedAt: now, updatedAt: now }, { merge: true });
      return;
    }
    if (memo.senderId === uid) {
      tx.set(memoRef, { senderArchivedAt: now, updatedAt: now }, { merge: true });
      return;
    }
    throw new functions.https.HttpsError("permission-denied", "내 편지만 보관할 수 있습니다.");
  });

  return { success: true };
});

exports.restoreDirectMemo = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const memoId = String(data?.memoId || "").trim();
  if (!memoId) {
    throw new functions.https.HttpsError("invalid-argument", "편지 정보를 찾을 수 없습니다.");
  }

  const memoRef = admin.firestore().collection("directMemos").doc(memoId);
  await admin.firestore().runTransaction(async (tx) => {
    const memoSnap = await tx.get(memoRef);
    if (!memoSnap.exists) {
      throw new functions.https.HttpsError("not-found", "편지를 찾을 수 없습니다.");
    }

    const memo = memoSnap.data() || {};
    const now = admin.firestore.Timestamp.now();
    if (memo.recipientId === uid) {
      if (memo.recipientDeletedAt) {
        throw new functions.https.HttpsError("failed-precondition", "삭제한 편지는 복원할 수 없습니다.");
      }
      tx.set(memoRef, { recipientArchivedAt: null, updatedAt: now }, { merge: true });
      return;
    }
    if (memo.senderId === uid) {
      if (memo.senderDeletedAt) {
        throw new functions.https.HttpsError("failed-precondition", "삭제한 편지는 복원할 수 없습니다.");
      }
      tx.set(memoRef, { senderArchivedAt: null, updatedAt: now }, { merge: true });
      return;
    }
    throw new functions.https.HttpsError("permission-denied", "내 편지만 복원할 수 있습니다.");
  });

  return { success: true };
});

exports.deleteDirectMemo = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const memoId = String(data?.memoId || "").trim();
  if (!memoId) {
    throw new functions.https.HttpsError("invalid-argument", "편지 정보를 찾을 수 없습니다.");
  }

  const memoRef = admin.firestore().collection("directMemos").doc(memoId);
  await admin.firestore().runTransaction(async (tx) => {
    const memoSnap = await tx.get(memoRef);
    if (!memoSnap.exists) {
      throw new functions.https.HttpsError("not-found", "편지를 찾을 수 없습니다.");
    }

    const memo = memoSnap.data() || {};
    const now = admin.firestore.Timestamp.now();
    if (memo.recipientId === uid) {
      if (memo.senderDeletedAt) {
        tx.delete(memoRef);
        return;
      }
      tx.set(memoRef, {
        recipientDeletedAt: now,
        recipientArchivedAt: null,
        updatedAt: now,
      }, { merge: true });
      return;
    }
    if (memo.senderId === uid) {
      if (memo.recipientDeletedAt) {
        tx.delete(memoRef);
        return;
      }
      tx.set(memoRef, {
        senderDeletedAt: now,
        senderArchivedAt: null,
        updatedAt: now,
      }, { merge: true });
      return;
    }
    throw new functions.https.HttpsError("permission-denied", "내 편지만 삭제할 수 있습니다.");
  });

  return { success: true };
});

exports.deliverScheduledDirectMemos = regionalFunctions.pubsub
  .schedule("every 5 minutes")
  .timeZone("Asia/Seoul")
  .onRun(async () => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const snap = await db.collection("directMemos")
      .where("status", "==", "scheduled")
      .where("deliverAt", "<=", now)
      .orderBy("deliverAt", "asc")
      .limit(100)
      .get();

    if (snap.empty) return null;

    const chunks = [];
    for (let i = 0; i < snap.docs.length; i += 400) {
      chunks.push(snap.docs.slice(i, i + 400));
    }

    for (const docs of chunks) {
      await db.runTransaction(async (tx) => {
        const freshSnaps = await Promise.all(docs.map((docSnap) => tx.get(docSnap.ref)));
        freshSnaps.forEach((docSnap) => {
          if (!docSnap.exists) return;
          const memoRef = docSnap.ref;
          const memoData = docSnap.data() || {};
          const deliverAtMillis = memoData.deliverAt?.toMillis?.() || 0;
          if (memoData.status !== "scheduled" || deliverAtMillis > now.toMillis()) return;
          const deliveredMemo = {
            ...memoData,
            status: "delivered",
            sentAt: now,
            updatedAt: now,
          };
          tx.set(memoRef, {
            status: "delivered",
            sentAt: now,
            updatedAt: now,
          }, { merge: true });
          tx.set(db.collection("users").doc(memoData.senderId).collection("directMemoLimits").doc(memoData.recipientId), {
            recipientId: memoData.recipientId,
            lastImmediateSentAt: now,
            updatedAt: now,
          }, { merge: true });
          createDirectMemoNotification(tx, memoRef, deliveredMemo);
        });
      });
    }

    return null;
  });

exports.createStudyRoom = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const crewId = String(data?.crewId || "").trim();
  const durationMinutes = Number(data?.durationMinutes || 50);
  if (!crewId) {
    throw new functions.https.HttpsError("invalid-argument", "크루 ID가 없습니다.");
  }
  if (!Number.isInteger(durationMinutes) || durationMinutes < 10 || durationMinutes > 120 || durationMinutes % 10 !== 0) {
    throw new functions.https.HttpsError("invalid-argument", "세션 시간은 10분부터 120분까지 10분 단위만 가능합니다.");
  }

  const db = admin.firestore();
  const userRef = db.collection("users").doc(uid);
  const crewRef = db.collection("crews").doc(crewId);
  const roomRef = db.collection("studyRooms").doc();

  const result = await db.runTransaction(async (tx) => {
    const [userSnap, crewSnap] = await Promise.all([tx.get(userRef), tx.get(crewRef)]);
    if (!userSnap.exists) {
      throw new functions.https.HttpsError("failed-precondition", "사용자 문서를 찾을 수 없습니다.");
    }
    if (!crewSnap.exists) {
      throw new functions.https.HttpsError("not-found", "크루를 찾을 수 없습니다.");
    }

    const userData = userSnap.data() || {};
    const crewData = crewSnap.data() || {};
    if (userData.crewId !== crewId) {
      throw new functions.https.HttpsError("permission-denied", "같은 크루 멤버만 집중방을 생성할 수 있습니다.");
    }

    if ((crewData.status || "pending") !== "approved") {
      throw new functions.https.HttpsError("failed-precondition", "승인된 크루만 Study Stream을 열 수 있습니다.");
    }

    const now = new Date();

    if (crewData.activeStudyRoomId) {
      const activeRoomSnap = await tx.get(db.collection("studyRooms").doc(crewData.activeStudyRoomId));
      if (activeRoomSnap.exists && (activeRoomSnap.data()?.status || "waiting") !== "ended") {
        const activeRoomData = activeRoomSnap.data();
        const baseMs = (activeRoomData.startedAt?.toMillis?.() || activeRoomData.createdAt?.toMillis?.() || 0);
        const durationMs = (activeRoomData.durationMinutes || 50) * 60 * 1000;
        
        if (baseMs && now.getTime() < baseMs + durationMs) {
          throw new functions.https.HttpsError("failed-precondition", "이미 진행 중인 집중방이 있습니다.");
        } else {
          tx.set(activeRoomSnap.ref, { status: "ended", endedAt: now }, { merge: true });
        }
      }
    }
    const displayName = getDisplayNameFromUser(userData);
    const roomData = {
      crewId,
      crewName: crewData.name || "스터디 크루",
      crewColor: crewData.color || "#00d4ff",
      title: `${crewData.name || "스터디 크루"} 집중방`,
      hostUid: uid,
      hostName: displayName,
      status: "waiting",
      mode: "focus",
      maxParticipants: 3,
      durationMinutes,
      participantIds: [uid],
      participantCount: 1,
      peerServerMode: "peerjs-public",
      chatEnabled: true,
      micsEnabled: true,
      createdAt: now,
      startedAt: null,
      endedAt: null,
      lastActivityAt: now,
    };

    tx.set(roomRef, roomData);
    tx.set(roomRef.collection("participants").doc(uid), {
      uid,
      displayName,
      role: "host",
      peerId: "",
      cameraOn: false,
      micOn: false,
      focusStatus: "focused",
      chatMessage: "",
      chatUpdatedAt: null,
      joinedAt: now,
      lastSeenAt: now,
      deviceLabel: "browser",
    });
    tx.set(crewRef, {
      activeStudyRoomId: roomRef.id,
      activeStudyRoomStatus: "waiting",
      studyRoomCapacity: 3,
      updatedAt: now,
    }, { merge: true });

    return { roomId: roomRef.id };
  });

  return { success: true, roomId: result.roomId };
});

exports.joinStudyRoomSession = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const roomId = String(data?.roomId || "").trim();
  if (!roomId) {
    throw new functions.https.HttpsError("invalid-argument", "방 ID가 없습니다.");
  }

  const db = admin.firestore();
  const userRef = db.collection("users").doc(uid);
  const roomRef = db.collection("studyRooms").doc(roomId);

  await db.runTransaction(async (tx) => {
    const [userSnap, roomSnap] = await Promise.all([tx.get(userRef), tx.get(roomRef)]);
    if (!userSnap.exists) {
      throw new functions.https.HttpsError("failed-precondition", "사용자 문서를 찾을 수 없습니다.");
    }
    if (!roomSnap.exists) {
      throw new functions.https.HttpsError("not-found", "집중방을 찾을 수 없습니다.");
    }

    const userData = userSnap.data() || {};
    const roomData = roomSnap.data() || {};
    if ((roomData.status || "waiting") === "ended") {
      throw new functions.https.HttpsError("failed-precondition", "이미 종료된 집중방입니다.");
    }
    if (userData.crewId !== roomData.crewId) {
      throw new functions.https.HttpsError("permission-denied", "같은 크루 멤버만 입장할 수 있습니다.");
    }

    const participantIds = Array.isArray(roomData.participantIds) ? roomData.participantIds : [];
    if (!participantIds.includes(uid) && participantIds.length >= 3) {
      throw new functions.https.HttpsError("failed-precondition", "이 집중방은 이미 가득 찼습니다.");
    }

    const nextParticipantIds = participantIds.includes(uid) ? participantIds : [...participantIds, uid];
    const nextCount = nextParticipantIds.length;
    const nextStatus = nextCount >= 2 ? "live" : "waiting";
    const now = new Date();
    const participantRole = roomData.hostUid === uid ? "host" : "member";

    tx.set(roomRef, {
      participantIds: nextParticipantIds,
      participantCount: nextCount,
      status: nextStatus,
      startedAt: roomData.startedAt || (nextStatus === "live" ? now : null),
      lastActivityAt: now,
    }, { merge: true });
    tx.set(roomRef.collection("participants").doc(uid), {
      uid,
      displayName: getDisplayNameFromUser(userData),
      role: participantRole,
      peerId: "",
      cameraOn: false,
      micOn: false,
      focusStatus: "focused",
      chatMessage: "",
      chatUpdatedAt: null,
      joinedAt: now,
      lastSeenAt: now,
      deviceLabel: "browser",
    }, { merge: true });
    tx.set(db.collection("crews").doc(roomData.crewId), {
      activeStudyRoomId: roomId,
      activeStudyRoomStatus: nextStatus,
      updatedAt: now,
    }, { merge: true });

  });

  return { success: true, roomId };
});

exports.leaveStudyRoomSession = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const roomId = String(data?.roomId || "").trim();
  if (!roomId) {
    throw new functions.https.HttpsError("invalid-argument", "방 ID가 없습니다.");
  }

  const db = admin.firestore();
  const roomRef = db.collection("studyRooms").doc(roomId);

  await db.runTransaction(async (tx) => {
    const roomSnap = await tx.get(roomRef);
    if (!roomSnap.exists) {
      return;
    }

    const roomData = roomSnap.data() || {};
    await removeParticipantFromStudyRoomTransaction(tx, db, roomRef, roomData, uid);
  });

  return { success: true };
});

exports.kickStudyRoomParticipant = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const roomId = String(data?.roomId || "").trim();
  const targetUid = String(data?.targetUid || "").trim();
  if (!roomId) {
    throw new functions.https.HttpsError("invalid-argument", "방 ID가 없습니다.");
  }
  if (!targetUid) {
    throw new functions.https.HttpsError("invalid-argument", "내보낼 멤버 ID가 없습니다.");
  }
  if (targetUid === uid) {
    throw new functions.https.HttpsError("invalid-argument", "본인은 내보낼 수 없습니다.");
  }

  const db = admin.firestore();
  const roomRef = db.collection("studyRooms").doc(roomId);

  await db.runTransaction(async (tx) => {
    const roomSnap = await tx.get(roomRef);
    if (!roomSnap.exists) {
      throw new functions.https.HttpsError("not-found", "집중방을 찾을 수 없습니다.");
    }

    const roomData = roomSnap.data() || {};
    if ((roomData.status || "waiting") === "ended") {
      throw new functions.https.HttpsError("failed-precondition", "이미 종료된 집중방입니다.");
    }
    if (roomData.hostUid !== uid) {
      throw new functions.https.HttpsError("permission-denied", "운영자만 멤버를 내보낼 수 있습니다.");
    }
    if (roomData.hostUid === targetUid) {
      throw new functions.https.HttpsError("permission-denied", "운영자는 본인을 내보낼 수 없습니다.");
    }

    const participantIds = Array.isArray(roomData.participantIds) ? roomData.participantIds : [];
    if (!participantIds.includes(targetUid)) {
      throw new functions.https.HttpsError("not-found", "이미 방에 없는 멤버입니다.");
    }

    await removeParticipantFromStudyRoomTransaction(tx, db, roomRef, roomData, targetUid);
  });

  return { success: true };
});

exports.leaveStudyCrew = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const crewId = String(data?.crewId || "").trim();
  if (!crewId) {
    throw new functions.https.HttpsError("invalid-argument", "크루 ID가 없습니다.");
  }

  const db = admin.firestore();
  const crewRef = db.collection("crews").doc(crewId);
  const userRef = db.collection("users").doc(uid);
  const cleanup = {
    deleteCrew: false,
    deleteRoomIds: [],
    nextCrewData: null,
  };

  await db.runTransaction(async (tx) => {
    const [crewSnap, userSnap] = await Promise.all([
      tx.get(crewRef),
      tx.get(userRef),
    ]);

    if (!crewSnap.exists) {
      throw new functions.https.HttpsError("not-found", "크루를 찾을 수 없습니다.");
    }
    if (!userSnap.exists) {
      throw new functions.https.HttpsError("failed-precondition", "사용자 문서를 찾을 수 없습니다.");
    }

    const crewData = crewSnap.data() || {};
    const userData = userSnap.data() || {};
    const memberIds = Array.isArray(crewData.memberIds) ? crewData.memberIds.filter(Boolean) : [];

    if (userData.crewId !== crewId || !memberIds.includes(uid)) {
      throw new functions.https.HttpsError("permission-denied", "현재 소속된 크루만 탈퇴할 수 있습니다.");
    }

    const isLeader = crewData.leaderId === uid;
    if (isLeader && memberIds.length > 1) {
      throw new functions.https.HttpsError("failed-precondition", "리더는 혼자 남았을 때만 탈퇴할 수 있습니다.");
    }

    if (crewData.activeStudyRoomId) {
      const roomRef = db.collection("studyRooms").doc(crewData.activeStudyRoomId);
      const roomSnap = await tx.get(roomRef);
      if (roomSnap.exists) {
        await removeParticipantFromStudyRoomTransaction(tx, db, roomRef, roomSnap.data() || {}, uid);
        cleanup.deleteRoomIds.push(roomRef.id);
      }
    }

    tx.set(userRef, buildClearedCrewUserFields(), { merge: true });

    if (isLeader) {
      cleanup.deleteCrew = true;
      const roomQuery = await db.collection("studyRooms").where("crewId", "==", crewId).get();
      roomQuery.docs.forEach((roomDoc) => {
        if (!cleanup.deleteRoomIds.includes(roomDoc.id)) cleanup.deleteRoomIds.push(roomDoc.id);
      });
      tx.delete(crewRef);
      return;
    }

    const nextMemberIds = memberIds.filter((memberId) => memberId !== uid);
    const nextCrewData = {
      ...crewData,
      memberIds: nextMemberIds,
      memberCount: nextMemberIds.length,
      updatedAt: new Date(),
    };

    tx.set(crewRef, {
      memberIds: nextMemberIds,
      memberCount: nextMemberIds.length,
      updatedAt: nextCrewData.updatedAt,
    }, { merge: true });
    cleanup.nextCrewData = nextCrewData;
  });

  if (cleanup.deleteCrew) {
    await admin.firestore().recursiveDelete(crewRef);
    for (const roomId of cleanup.deleteRoomIds) {
      await admin.firestore().recursiveDelete(db.collection("studyRooms").doc(roomId));
    }
    return { success: true, deletedCrew: true };
  }

  if (cleanup.nextCrewData) {
    await syncCrewToMembers(crewId, {
      ...cleanup.nextCrewData,
      updatedAt: new Date().toISOString(),
    });
  }

  return { success: true, deletedCrew: false };
});
