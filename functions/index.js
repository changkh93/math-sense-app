const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const crypto = require("crypto");
const { FieldPath, FieldValue, Timestamp } = require("firebase-admin/firestore");
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
const referralBilling = require("./referralBilling");
const FUNCTIONS_REGION = "asia-northeast3";
const regionalFunctions = functions.region(FUNCTIONS_REGION);
const accountDeletionFunctions = regionalFunctions.runWith({ timeoutSeconds: 540, memory: "1GB" });
const guestSecurityFunctions = regionalFunctions.runWith({ secrets: ["GUEST_ABUSE_HASH_SECRET"] });
const DIRECT_MEMO_MAX_LENGTH = 2000;
const CRYSTAL_GIFT_DAILY_LIMIT = 50;
const STORE_RADAR_DURATION_DAYS = 7;
const STORE_PHOTON_SHIELD_CHARGES_PER_GIFT = 10;
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
};
const OPERATOR_GIFT_EMAIL = "paul@dulcine.net";
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

function canOperatorGift(senderData = {}, context = null) {
  const authEmail = String(context?.auth?.token?.email || "").toLowerCase();
  const profileEmail = String(senderData.email || "").toLowerCase();
  return authEmail === OPERATOR_GIFT_EMAIL || profileEmail === OPERATOR_GIFT_EMAIL;
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

const QUIZ_BATTLE_QUESTION_COUNT = 15;
const QUIZ_BATTLE_QUEUE_TTL_MS = 90 * 1000;
const QUIZ_BATTLE_START_CONFIRM_TIMEOUT_MS = 15 * 1000;
const QUIZ_BATTLE_DURATION_MS = 12 * 60 * 1000;
const QUIZ_BATTLE_CORRECT_ORE = 2;
const QUIZ_BATTLE_WIN_BONUS = 20;
const QUIZ_BATTLE_LOSER_COMPLETION_REWARD = 10;
const QUIZ_BATTLE_DRAW_REWARD = 20;
const QUIZ_BATTLE_SCOPE_CUMULATIVE = "cumulative";
const QUIZ_BATTLE_SCOPE_UNIT = "unit";
const QUIZ_BATTLE_MIN_UNIT_QUESTION_COUNT = 5;
const QUIZ_BATTLE_AI_REWARD_DIVISOR = 3;
const QUIZ_BATTLE_DAILY_ORE_CAP = 500;
const QUIZ_BATTLE_DAILY_SCOPE_REWARD_LIMIT = 3;
const QUIZ_BATTLE_DAILY_OPPONENT_LIMIT = 3;

function getBattleKstDateKey(nowMs = Date.now()) {
  return new Date(nowMs + (9 * 60 * 60 * 1000)).toISOString().slice(0, 10);
}

function isQuizBattleClusterAccessActive(userData = {}, clusterId = "") {
  const access = userData.clusterAccess;
  // clusterAccess가 생성되기 전의 레거시 계정만 초등수학 기본 권한을 유지한다.
  if (!access || typeof access !== "object") return clusterId === "cluster_elementary";
  return access[clusterId] === "active";
}

function isQuizBattleRegionAccessActive(userData = {}, regionId = "") {
  const access = userData.regionAccess;
  return Boolean(access && typeof access === "object" && access[regionId] === "active");
}

function isQuizBattleAccessActive(userData = {}, clusterId = "", regionId = "") {
  return isQuizBattleClusterAccessActive(userData, clusterId)
    && isQuizBattleRegionAccessActive(userData, regionId);
}

function assertQuizBattleAccess(userData = {}, clusterId = "", regionId = "") {
  if (!isQuizBattleAccessActive(userData, clusterId, regionId)) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "현재 학습 중인 과정과 리전에서만 퀴즈 배틀에 참여할 수 있습니다."
    );
  }
}

function getBattleRewardScopeKey(battleData = {}, participant = {}) {
  return normalizeStatKey([
    battleData.clusterId,
    battleData.regionId,
    battleData.battleScope,
    battleData.battleUnitId || participant.entryUnitId || battleData.commonCeilingOrdinal,
  ].join("_"));
}

function isPersistentBattleParticipant(participant = {}) {
  return participant.isGuest !== true && participant.isAI !== true;
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

function cleanId(value, maxLength = 180) {
  return String(value || "").trim().slice(0, maxLength);
}

function getPublicStudentName(userData = {}, fallback = "탐사원") {
  return cleanText(
    userData.publicDisplayName ||
    userData.studentName ||
    userData.name ||
    userData.displayName ||
    fallback,
    40
  ) || fallback;
}

function normalizeBattleScope(value) {
  return value === QUIZ_BATTLE_SCOPE_UNIT ? QUIZ_BATTLE_SCOPE_UNIT : QUIZ_BATTLE_SCOPE_CUMULATIVE;
}

function getQuizOptionText(option) {
  if (typeof option === "string") return option;
  return String(option?.text || "");
}

function getCorrectOptionKeys(quizData = {}) {
  const options = Array.isArray(quizData.options) ? quizData.options : [];
  const directCorrectKeys = options
    .map((option, index) => (option?.isCorrect === true ? `o${index}` : null))
    .filter(Boolean);
  if (directCorrectKeys.length > 0) return directCorrectKeys;

  const answers = Array.isArray(quizData.answer) ? quizData.answer : [quizData.answer];
  const answerSet = new Set(answers.map((answer) => String(answer || "").trim()).filter(Boolean));
  return options
    .map((option, index) => (answerSet.has(getQuizOptionText(option).trim()) ? `o${index}` : null))
    .filter(Boolean);
}

function sanitizeQuizForBattle(docSnap, optionShuffleSeed = "") {
  const data = docSnap.data() || {};
  // 1) 원본 옵션과 각각의 정답 여부를 먼저 파악한다.
  const rawOptions = (Array.isArray(data.options) ? data.options : [])
    .slice(0, 8)
    .map((option, index) => ({
      originalIndex: index,
      text: getQuizOptionText(option).slice(0, 500),
    }))
    .filter((option) => option.text);

  const correctOriginalIndices = new Set(getCorrectOptionKeys(data).map((key) => Number(key.slice(1))));

  // 2) 옵션을 섞는다. seed 기반 결정적 셔플을 써야 옵션과 정답 키가 일치한다.
  //    같은 문제라도 배틀마다(=seed마다) 정답 위치가 달라져 위치 외우기가 무효화된다.
  const indexedWithOptions = rawOptions.map((opt, i) => ({ i, opt }));
  const shuffled = shuffleBattleItems(indexedWithOptions, optionShuffleSeed);

  // 3) 섞인 순서대로 새 키(o0, o1, ...)를 부여하고, 정답 키를 재계산한다.
  const options = shuffled.map(({ opt }, newIndex) => ({
    key: `o${newIndex}`,
    text: opt.text,
  }));
  const correctKeys = shuffled
    .map(({ opt }, newIndex) => (correctOriginalIndices.has(opt.originalIndex) ? `o${newIndex}` : null))
    .filter(Boolean);

  return {
    questionId: docSnap.id,
    sourceQuestionId: cleanId(data.id || docSnap.id),
    unitId: cleanId(data.unitId),
    order: Number(data.order || 0),
    question: String(data.question || data.prompt || "").slice(0, 2000),
    imageUrl: String(data.imageUrl || "").slice(0, 1000),
    options,
    multiAnswer: correctKeys.length > 1,
    // 채점용 정답 키. 클라이언트로 전송하기 전에 반드시 제거해야 한다.
    correctKeys,
  };
}

function shuffleBattleItems(items, seed = "") {
  const arr = [...items];
  let hash = 2166136261;
  String(seed).split("").forEach((char) => {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  });
  for (let i = arr.length - 1; i > 0; i--) {
    hash = Math.imul(hash ^ (hash >>> 15), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    const j = Math.abs(hash) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function resolveBattleContext({ clusterId, regionId, entryUnitId }) {
  const db = admin.firestore();
  const [regionSnap, unitSnap] = await Promise.all([
    db.collection("regions").doc(regionId).get(),
    db.collection("units").doc(entryUnitId).get(),
  ]);

  if (!regionSnap.exists) {
    throw new functions.https.HttpsError("not-found", "배틀 행성을 찾을 수 없습니다.");
  }
  if (!unitSnap.exists) {
    throw new functions.https.HttpsError("not-found", "배틀 진입 미션을 찾을 수 없습니다.");
  }

  const regionData = regionSnap.data() || {};
  const resolvedClusterId = cleanId(regionData.clusterId || clusterId || "cluster_elementary");
  if (clusterId && resolvedClusterId !== clusterId && regionData.clusterId) {
    throw new functions.https.HttpsError("failed-precondition", "현재 과정과 행성 정보가 일치하지 않습니다.");
  }

  let chaptersSnap = await db.collection("chapters").where("regionId", "==", regionId).get();
  // 주의: 문서 data에 내부 id 필드가 있으면 스프레드가 문서 ID(doc.id)를 덮어쓴다.
  // units.chapterId는 문서 ID를 참조하므로, 여기서는 반드시 docId를 문서 ID로 보존해야 한다.
  let chapters = chaptersSnap.docs
    .map((chapter) => ({ ...chapter.data(), docId: chapter.id, id: chapter.id }))
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

  // 방어: regionId 쿼리가 인덱스/컨시스턴시 지연으로 빈 결과를 반환하는 경우가 있다.
  // 진입 unit의 chapterId에서 역추적해 region 소속을 확정하고, 같은 region의 chapter
  // 전체를 다시 확보한다.
  const entryChapterId = unitSnap.data()?.chapterId || "";
  if (chapters.length === 0 && entryChapterId) {
    const entryChapterSnap = await db.collection("chapters").doc(entryChapterId).get();
    if (entryChapterSnap.exists && cleanId(entryChapterSnap.data()?.regionId) === regionId) {
      const allChaptersSnap = await db.collection("chapters").get();
      chapters = allChaptersSnap.docs
        .map((chapter) => ({ ...chapter.data(), docId: chapter.id, id: chapter.id }))
        .filter((chapter) => cleanId(chapter.regionId) === regionId)
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    }
  }

  const unitDocs = [];
  const unitSnaps = await Promise.all(
    chapters.map((chapter) => db.collection("units").where("chapterId", "==", chapter.id).get())
  );
  unitSnaps.forEach((unitsSnap) => {
    unitsSnap.docs
      .map((unit) => ({ ...unit.data(), docId: unit.id, id: unit.id }))
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      .forEach((unit) => unitDocs.push(unit));
  });

  const ordinalByUnitId = new Map();
  unitDocs.forEach((unit, index) => {
    ordinalByUnitId.set(unit.id, index + 1);
  });
  const entryOrdinal = ordinalByUnitId.get(entryUnitId);
  if (!entryOrdinal) {
    throw new functions.https.HttpsError("failed-precondition", "진입 미션이 현재 행성에 속하지 않습니다.");
  }

  return {
    clusterId: resolvedClusterId,
    regionId,
    regionTitle: regionData.title || regionData.name || "",
    entryUnitId,
    entryOrdinal,
    units: unitDocs.map((unit) => ({
      id: unit.id,
      title: unit.title || "",
      chapterId: unit.chapterId || "",
      ordinal: ordinalByUnitId.get(unit.id),
    })),
  };
}

async function buildBattleQuestionSet(context, commonCeilingOrdinal, questionCount, seed, options = {}) {
  const db = admin.firestore();
  const battleScope = normalizeBattleScope(options.battleScope);
  const unitId = cleanId(options.unitId || context.entryUnitId);
  const eligibleUnits = battleScope === QUIZ_BATTLE_SCOPE_UNIT
    ? context.units.filter((unit) => unit.id === unitId)
    : context.units.filter((unit) => unit.ordinal <= commonCeilingOrdinal);
  if (eligibleUnits.length === 0) {
    throw new functions.https.HttpsError("failed-precondition", "배틀 문제 범위를 찾을 수 없습니다.");
  }
  const quizSnaps = await Promise.all(
    eligibleUnits.map((unit) => db.collection("quizzes").where("unitId", "==", unit.id).get())
  );
  const quizDocs = [];
  quizSnaps.forEach((snap, index) => {
    const unit = eligibleUnits[index];
    snap.docs.forEach((quizDoc) => {
      // 문제별로 고유한 seed를 줘 같은 문제라도 배틀마다 옵션 순서가 다르게 섞이게 한다.
      const sanitized = sanitizeQuizForBattle(quizDoc, `${seed}_${quizDoc.id}`);
      if (sanitized.question && sanitized.options.length >= 2 && getCorrectOptionKeys(quizDoc.data() || {}).length > 0) {
        quizDocs.push({
          ...sanitized,
          unitTitle: unit.title,
          unitOrdinal: unit.ordinal,
        });
      }
    });
  });

  const effectiveQuestionCount = battleScope === QUIZ_BATTLE_SCOPE_UNIT
    ? Math.min(questionCount, quizDocs.length)
    : questionCount;
  if (battleScope === QUIZ_BATTLE_SCOPE_UNIT && quizDocs.length < QUIZ_BATTLE_MIN_UNIT_QUESTION_COUNT) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      `이 유닛에는 배틀 가능한 문제가 ${QUIZ_BATTLE_MIN_UNIT_QUESTION_COUNT}개 미만입니다.`
    );
  }

  const selected = shuffleBattleItems(quizDocs, seed).slice(0, effectiveQuestionCount);
  if (selected.length < effectiveQuestionCount) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      `공통 범위에 배틀 문제 ${effectiveQuestionCount}개가 아직 준비되지 않았습니다.`
    );
  }

  return selected.map((question, index) => ({
    ...question,
    battleOrder: index + 1,
  }));
}

async function findOwnQuizBattleTicket(db, uid, regionId, ticketId = "") {
  const explicitTicketId = cleanId(ticketId, 220);
  if (explicitTicketId) {
    const explicitRef = db.collection("quizBattleQueueTickets").doc(explicitTicketId);
    const explicitSnap = await explicitRef.get();
    if (explicitSnap.exists && explicitSnap.data()?.uid === uid) {
      return { ref: explicitRef, snap: explicitSnap };
    }
  }

  const legacyRef = db.collection("quizBattleQueueTickets").doc(`${uid}_${regionId}`);
  const legacySnap = await legacyRef.get();
  if (legacySnap.exists && legacySnap.data()?.uid === uid) {
    return { ref: legacyRef, snap: legacySnap };
  }

  const ownSnap = await db.collection("quizBattleQueueTickets")
    .where("uid", "==", uid)
    .where("regionId", "==", regionId)
    .where("status", "in", ["waiting", "matched"])
    .limit(5)
    .get();
  const activeDoc = ownSnap.docs
    .map((docSnap) => ({ ref: docSnap.ref, snap: docSnap, data: docSnap.data() || {} }))
    .filter((ticket) => ticket.data.status === "matched" || Number(ticket.data.expiresAtMs || 0) > Date.now())
    .sort((a, b) => Number(b.data.createdAtMs || 0) - Number(a.data.createdAtMs || 0))[0];

  return activeDoc ? { ref: activeDoc.ref, snap: activeDoc.snap } : null;
}

function isLegacyQuizBattleTicketId(ticketId, data = {}) {
  return ticketId === `${data.uid || ""}_${data.regionId || ""}`;
}

async function getPublicQueueTicketId(db, docSnap, nowMs) {
  const data = docSnap.data() || {};
  if (!isLegacyQuizBattleTicketId(docSnap.id, data)) return docSnap.id;

  const expiresAtMs = Number(data.expiresAtMs || 0);
  if (expiresAtMs <= nowMs) return "";

  let aliasId = cleanId(data.publicJoinAliasId, 220);
  const aliasRef = aliasId
    ? db.collection("quizBattleQueueTicketAliases").doc(aliasId)
    : db.collection("quizBattleQueueTicketAliases").doc();
  aliasId = aliasRef.id;

  await Promise.all([
    aliasRef.set({
      ticketId: docSnap.id,
      regionId: data.regionId || "",
      expiresAtMs,
      ttlAt: Timestamp.fromMillis(Math.max(expiresAtMs, nowMs) + (60 * 60 * 1000)),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true }),
    docSnap.ref.set({
      publicJoinAliasId: aliasId,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true }),
  ]);

  return aliasId;
}

async function resolveQuizBattleTargetRef(db, targetTicketId, nowMs) {
  const cleanTargetTicketId = cleanId(targetTicketId, 220);
  if (!cleanTargetTicketId) return null;

  const directRef = db.collection("quizBattleQueueTickets").doc(cleanTargetTicketId);
  const directSnap = await directRef.get();
  if (directSnap.exists) return directRef;

  const aliasSnap = await db.collection("quizBattleQueueTicketAliases").doc(cleanTargetTicketId).get();
  if (!aliasSnap.exists) return null;

  const alias = aliasSnap.data() || {};
  if (Number(alias.expiresAtMs || 0) <= nowMs) return null;

  const aliasedTicketId = cleanId(alias.ticketId, 220);
  return aliasedTicketId ? db.collection("quizBattleQueueTickets").doc(aliasedTicketId) : null;
}

async function sanitizeQueueTicketForList(db, docSnap, nowMs) {
  const data = docSnap.data() || {};
  const battleScope = normalizeBattleScope(data.battleScope);
  const expiresAtMs = Number(data.expiresAtMs || 0);
  const publicTicketId = await getPublicQueueTicketId(db, docSnap, nowMs);
  if (!publicTicketId) return null;
  return {
    ticketId: publicTicketId,
    displayName: cleanText(data.displayName || "탐사원", 40) || "탐사원",
    entryUnitId: cleanId(data.entryUnitId),
    entryUnitTitle: cleanText(data.entryUnitTitle || "퀴즈 유닛", 80) || "퀴즈 유닛",
    entryOrdinal: Number(data.entryOrdinal || 0),
    battleScope,
    questionCount: Number(data.questionCount || QUIZ_BATTLE_QUESTION_COUNT),
    createdAtMs: Number(data.createdAtMs || 0),
    expiresAtMs,
    secondsLeft: Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000)),
  };
}

function getBattleParticipantData(battleData = {}, uid) {
  return battleData.participants?.[uid] || {};
}

function calculateBattleRewards(participants = {}, participantUids = [], totalQuestions = 0) {
  const [aUid, bUid] = participantUids;
  const a = participants[aUid] || {};
  const b = participants[bUid] || {};
  const aScore = Number(a.score || 0);
  const bScore = Number(b.score || 0);
  const aCorrect = Number(a.correctCount || 0);
  const bCorrect = Number(b.correctCount || 0);
  const aAnswered = Number(a.answeredCount || 0);
  const bAnswered = Number(b.answeredCount || 0);
  const aLastMs = Number(a.lastAnsweredAtMs || 0);
  const bLastMs = Number(b.lastAnsweredAtMs || 0);
  const aCompleted = totalQuestions > 0 && aAnswered >= totalQuestions;
  const bCompleted = totalQuestions > 0 && bAnswered >= totalQuestions;

  let winnerUid = "";
  let resultType = "draw";
  // 한쪽이라도 중도 포기했으면, 남은 쪽이 점수와 무관하게 승리한다.
  const aForfeited = a.forfeited === true;
  const bForfeited = b.forfeited === true;
  if (aForfeited && !bForfeited) {
    winnerUid = bUid;
    resultType = "win";
  } else if (bForfeited && !aForfeited) {
    winnerUid = aUid;
    resultType = "win";
  } else if (aScore > bScore) {
    winnerUid = aUid;
    resultType = "win";
  } else if (bScore > aScore) {
    winnerUid = bUid;
    resultType = "win";
  } else if (aCorrect !== bCorrect) {
    // 점수가 같아도 정답 수가 다르면(예: 복수정답 부분 점수) 더 많이 맞힌 쪽이 승리.
    winnerUid = aCorrect > bCorrect ? aUid : bUid;
    resultType = "win";
  } else if (aCompleted && bCompleted && aLastMs > 0 && bLastMs > 0 && aLastMs !== bLastMs) {
    // 동점 동순위 타이브레이크: 둘 다 완주한 경우에만 더 빨리 끝낸 쪽이 승리.
    // 제한시간 종료 시 둘 다 미완주인 동점 경기는 무승부로 둔다.
    winnerUid = aLastMs < bLastMs ? aUid : bUid;
    resultType = "win";
  }

  const rewards = {};
  participantUids.forEach((uid) => {
    const isForfeited = (uid === aUid ? aForfeited : bForfeited);
    // 중도 포기한 참가자는 보상이 없다.
    if (isForfeited) {
      rewards[uid] = 0;
      return;
    }
    if (!winnerUid) {
      rewards[uid] = QUIZ_BATTLE_DRAW_REWARD;
      return;
    }
    const correctCount = uid === aUid ? aCorrect : bCorrect;
    rewards[uid] = uid === winnerUid
      ? (correctCount * QUIZ_BATTLE_CORRECT_ORE) + QUIZ_BATTLE_WIN_BONUS
      : QUIZ_BATTLE_LOSER_COMPLETION_REWARD;
  });

  return { winnerUid, resultType, rewards };
}

// ── battleRating 계산 (고정 공식: Wilson 승률 + 정답률 + 참여량 + 최근 활동 + 완승 보정) ──
// 모든 입력값은 누적 summary 필드이며, finalize와 backfill이 공유한다.
// decay는 없다: 비활동으로 인한 rating 하락은 없고, 최근 활동은 가산점만 준다.
const BATTLE_RATING_BASE = 1000;
const BATTLE_RATING_WILSON_MAX = 350;
const BATTLE_RATING_CORRECT_MAX = 250;
const BATTLE_RATING_VOLUME_MAX = 150;
const BATTLE_RATING_RECENT_MAX = 100;
const BATTLE_RATING_PERFECT_MAX = 100;
const BATTLE_RATING_RECENT_WINDOW_DAYS = 30;
const BATTLE_RATING_RECENT_FULL_BONUS_MATCHES = 20;

// Wilson lower bound (95% 신뢰). 1전 1승 100%가 다전자보다 위에 오르지 않도록 보정한다.
// rankingUtils.js의 focus 점수와 동일한 패턴을 따른다.
function wilsonLowerBound(wins, matches, z = 1.0) {
  if (matches <= 0) return 0;
  const p = wins / matches;
  const z2 = z * z;
  const denom = 1 + z2 / matches;
  const center = p + z2 / (2 * matches);
  const margin = (z * Math.sqrt((p * (1 - p) + z2 / (4 * matches)) / matches)) / denom;
  return Math.max(0, (center - margin) / denom);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * battleRating을 계산한다.
 * @param {Object} summary - users/{uid}/battleStats/summary 문서 데이터
 * @param {Object} [options]
 * @param {number} [options.recentMatches] - 최근 30일 경기 수 (없으면 0)
 * @returns {number} battleRating (정수)
 */
function calculateBattleRating(summary = {}, options = {}) {
  const totalMatches = Number(summary.totalMatches || 0);
  const wins = Number(summary.wins || 0);
  const totalCorrect = Number(summary.totalCorrect || 0);
  const totalAnswered = Number(summary.totalAnswered || summary.totalQuestions || 0);
  const perfectWins = Number(summary.perfectWins || 0);

  // 1. Wilson 승률 점수 (최대 350)
  const winRateScore = Math.round(wilsonLowerBound(wins, totalMatches) * BATTLE_RATING_WILSON_MAX);

  // 2. 평균 정답률 점수 (최대 250)
  const correctRate = totalAnswered > 0 ? clamp(totalCorrect / totalAnswered, 0, 1) : 0;
  const correctScore = Math.round(correctRate * BATTLE_RATING_CORRECT_MAX);

  // 3. 참여량 신뢰도 (최대 150). 20전부터 만점, 그 전까지 선형.
  const volumeScore = Math.round(clamp(totalMatches / 20, 0, 1) * BATTLE_RATING_VOLUME_MAX);

  // 4. 최근 30일 활동 가산점 (최대 100). 20전부터 만점.
  const recentMatches = Number(options.recentMatches || 0);
  const recentScore = Math.round(clamp(recentMatches / BATTLE_RATING_RECENT_FULL_BONUS_MATCHES, 0, 1) * BATTLE_RATING_RECENT_MAX);

  // 5. perfect win 보정 (최대 100). 완승 5회마다 만점 접근.
  const perfectScore = Math.round(clamp(perfectWins / 5, 0, 1) * BATTLE_RATING_PERFECT_MAX);

  return BATTLE_RATING_BASE + winRateScore + correctScore + volumeScore + recentScore + perfectScore;
}

// region/opponent 집계에서 streak 재계산을 위한 헬퍼.
// summary의 currentStreak는 finalize 시 increment로 관리되지만, backfill에서는
// history 전체를 시간순 재생해 정확히 복원한다.
function recomputeStreakFromHistory(historyDocs) {
  // historyDocs: {battleResult, timestamp}를 가진 객체 배열 (시간 오름차순 정렬 가정)
  let current = 0;
  let best = 0;
  for (const doc of historyDocs) {
    if (doc.battleResult === "win") {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return { currentStreak: current, bestStreak: best };
}

async function finalizeQuizBattleInternal(battleId, finalizeReason = "completed") {
  const db = admin.firestore();
  const battleRef = db.collection("quizBattles").doc(battleId);
  let result = null;

  await db.runTransaction(async (transaction) => {
    const battleSnap = await transaction.get(battleRef);
    if (!battleSnap.exists) {
      throw new functions.https.HttpsError("not-found", "배틀을 찾을 수 없습니다.");
    }
    const battleData = battleSnap.data() || {};
    if (battleData.status === "finished") {
      const participantUids = Array.isArray(battleData.participantUids)
        ? battleData.participantUids.filter(Boolean).slice(0, 2)
        : [];
      result = {
        alreadyFinalized: true,
        winnerUid: battleData.winnerUid || "",
        rewards: battleData.rewards || {},
        participantUids,
        questionSet: battleData.questionSet || [],
        regionId: battleData.regionId || "",
        regionTitle: battleData.regionTitle || "",
        clusterId: battleData.clusterId || "",
        isAI: battleData.isAI === true,
        wrongAnswersSyncedAt: battleData.wrongAnswersSyncedAt || null,
        battleStatsSyncedAt: battleData.battleStatsSyncedAt || null,
      };
      return;
    }
    if (battleData.status === "cancelled") {
      result = {
        alreadyCancelled: true,
        cancelReason: battleData.cancelReason || "",
        rewards: {},
      };
      return;
    }
    if (battleData.status === "starting") {
      throw new functions.https.HttpsError("failed-precondition", "아직 상대 입장 확인 중입니다.");
    }

    const participantUids = Array.isArray(battleData.participantUids)
      ? battleData.participantUids.filter(Boolean).slice(0, 2)
      : [];
    if (participantUids.length !== 2) {
      throw new functions.https.HttpsError("failed-precondition", "배틀 참가자 정보가 올바르지 않습니다.");
    }

    const participants = battleData.participants || {};
    const totalQuestions = Number(battleData.questionCount || battleData.questionSet?.length || 0);
    const nowMs = Date.now();
    const allDone = participantUids.every((uid) => Number(participants?.[uid]?.answeredCount || 0) >= totalQuestions);
    const timedOut = Number(battleData.endsAtMs || 0) > 0 && nowMs >= Number(battleData.endsAtMs || 0);
    const hasForfeit = participantUids.some((uid) => participants?.[uid]?.forfeited === true);
    // 한쪽이 중도 포기했거나, 강제 정산 요청이면 즉시 정산한다.
    if (!allDone && !timedOut && !hasForfeit && finalizeReason !== "force") {
      throw new functions.https.HttpsError("failed-precondition", "아직 배틀이 종료되지 않았습니다.");
    }

    const rewardResult = calculateBattleRewards(participants, participantUids, totalQuestions);
    participantUids.forEach((uid) => {
      const participant = participants[uid] || {};
      if (!isPersistentBattleParticipant(participant)) {
        rewardResult.rewards[uid] = 0;
      } else if (battleData.isAI === true) {
        rewardResult.rewards[uid] = Math.floor(Number(rewardResult.rewards[uid] || 0) / QUIZ_BATTLE_AI_REWARD_DIVISOR);
      }
    });
    const persistentParticipantUids = participantUids.filter((uid) => isPersistentBattleParticipant(participants[uid] || {}));
    const dateKey = getBattleKstDateKey(nowMs);

    // 정산 정책과 streak 재계산에 필요한 문서를 모든 write보다 먼저 읽는다.
    // Firestore 트랜잭션은 모든 read가 write보다 먼저 와야 하므로, battle 문서 update 전에 읽는다.
    const [statsSnaps, userSnaps, rewardLimitSnaps] = await Promise.all([
      Promise.all(persistentParticipantUids.map((uid) =>
        transaction.get(db.collection("users").doc(uid).collection("battleStats").doc("summary"))
      )),
      Promise.all(persistentParticipantUids.map((uid) =>
        transaction.get(db.collection("users").doc(uid))
      )),
      Promise.all(persistentParticipantUids.map((uid) =>
        transaction.get(db.collection("users").doc(uid).collection("battleRewardLimits").doc(dateKey))
      )),
    ]);
    const existingStats = {};
    const rewardPolicies = {};
    persistentParticipantUids.forEach((uid, idx) => {
      existingStats[uid] = statsSnaps[idx].exists ? (statsSnaps[idx].data() || {}) : {};
      const participant = participants[uid] || {};
      const userData = userSnaps[idx].exists ? (userSnaps[idx].data() || {}) : {};
      const limitData = rewardLimitSnaps[idx].exists ? (rewardLimitSnaps[idx].data() || {}) : {};
      const opponentUid = participantUids.find((otherUid) => otherUid !== uid) || "";
      const opponentKey = battleData.isAI === true ? "nova_7" : normalizeStatKey(opponentUid);
      const scopeKey = getBattleRewardScopeKey(battleData, participant);
      const scopeCount = Number(limitData.scopeCounts?.[scopeKey] || 0);
      const opponentCount = Number(limitData.opponentCounts?.[opponentKey] || 0);
      const accessEligible = isQuizBattleAccessActive(
        userData,
        battleData.clusterId || "",
        battleData.regionId || ""
      );
      const repeatEligible = scopeCount < QUIZ_BATTLE_DAILY_SCOPE_REWARD_LIMIT
        && opponentCount < QUIZ_BATTLE_DAILY_OPPONENT_LIMIT;
      const rewardEligible = accessEligible && repeatEligible;
      const competitiveEligible = rewardEligible && battleData.isAI !== true;
      const aiTrainingEligible = rewardEligible && battleData.isAI === true;
      const requestedReward = Number(rewardResult.rewards[uid] || 0);
      const remainingDailyOre = Math.max(0, QUIZ_BATTLE_DAILY_ORE_CAP - Number(limitData.totalOre || 0));
      const reward = rewardEligible ? Math.min(requestedReward, remainingDailyOre) : 0;
      let reason = "";
      if (!accessEligible) reason = "battle_access_inactive";
      else if (scopeCount >= QUIZ_BATTLE_DAILY_SCOPE_REWARD_LIMIT) reason = "scope_repeat_limit";
      else if (opponentCount >= QUIZ_BATTLE_DAILY_OPPONENT_LIMIT) reason = "opponent_repeat_limit";
      else if (remainingDailyOre <= 0) reason = "daily_ore_cap";
      else if (reward < requestedReward) reason = "daily_ore_cap_partial";

      rewardResult.rewards[uid] = reward;
      rewardPolicies[uid] = {
        reward,
        requestedReward,
        reason,
        accessEligible,
        rewardEligible,
        competitiveEligible,
        aiTrainingEligible,
        scopeKey,
        opponentKey,
      };
    });

    const finalUpdates = {
      status: "finished",
      finishedAt: FieldValue.serverTimestamp(),
      finishedAtMs: nowMs,
      finalizeReason,
      winnerUid: rewardResult.winnerUid,
      resultType: rewardResult.resultType,
      rewards: rewardResult.rewards,
      rewardPolicies,
    };
    transaction.update(battleRef, finalUpdates);

    participantUids.forEach((uid) => {
      const participant = participants[uid] || {};
      if (!isPersistentBattleParticipant(participant)) return;
      const reward = Number(rewardResult.rewards[uid] || 0);
      const rewardPolicy = rewardPolicies[uid] || {};
      const competitiveEligible = rewardPolicy.competitiveEligible === true;
      const aiTrainingEligible = rewardPolicy.aiTrainingEligible === true;
      const userRef = db.collection("users").doc(uid);
      const historyRef = userRef.collection("history").doc(`quiz_battle_${battleId}`);
      const statsRef = userRef.collection("battleStats").doc("summary");
      const rewardLimitRef = userRef.collection("battleRewardLimits").doc(dateKey);
      const txId = `quiz_battle_${battleId}`;
      const didWin = rewardResult.winnerUid === uid;
      const didDraw = !rewardResult.winnerUid;
      const didLose = !didWin && !didDraw;
      const opponentUid = participantUids.find((otherUid) => otherUid !== uid) || "";
      const opponentDisplayName = (participants[opponentUid] || {}).displayName || "";
      const myCorrect = Number(participant.correctCount || 0);
      const myAnswered = Number(participant.answeredCount || 0);
      const ratingQuestionCount = totalQuestions > 0 ? totalQuestions : Math.max(myAnswered, myCorrect);
      const isComplete = totalQuestions > 0 && myAnswered >= totalQuestions;
      const isForfeit = participant.forfeited === true;
      const isPerfectWin = didWin && totalQuestions > 0 && myCorrect >= totalQuestions;

      transaction.set(userRef, {
        crystals: FieldValue.increment(reward),
        totalBattleMatches: FieldValue.increment(competitiveEligible ? 1 : 0),
        totalBattleWins: FieldValue.increment(competitiveEligible && didWin ? 1 : 0),
        totalBattleLosses: FieldValue.increment(competitiveEligible && didLose ? 1 : 0),
        totalBattleDraws: FieldValue.increment(competitiveEligible && didDraw ? 1 : 0),
        aiBattleMatches: FieldValue.increment(aiTrainingEligible ? 1 : 0),
        aiBattleCompletedMatches: FieldValue.increment(aiTrainingEligible && isComplete ? 1 : 0),
        aiBattleCorrect: FieldValue.increment(aiTrainingEligible ? myCorrect : 0),
        aiBattleAnswered: FieldValue.increment(aiTrainingEligible ? Math.max(myAnswered, myCorrect) : 0),
        lastBattleAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      transaction.set(rewardLimitRef, {
        dateKey,
        totalOre: FieldValue.increment(reward),
        completedMatches: FieldValue.increment(1),
        scopeCounts: { [rewardPolicy.scopeKey]: FieldValue.increment(1) },
        opponentCounts: { [rewardPolicy.opponentKey]: FieldValue.increment(1) },
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      if (reward > 0) {
        recordCrystalTransaction(transaction, uid, txId, {
          amount: reward,
          type: "quiz_battle_reward",
          description: `퀴즈 배틀 ${didWin ? "승리" : didDraw ? "무승부" : "완주"} 보상`,
          metadata: {
            battleId,
            regionId: battleData.regionId || "",
            score: Number(participant.score || 0),
            correctCount: Number(participant.correctCount || 0),
            winnerUid: rewardResult.winnerUid || "",
          },
        });
      }

      transaction.set(historyRef, {
        type: "quiz_battle",
        battleId,
        unitId: battleData.entryUnitIds?.[uid] || battleData.entryUnitId || "",
        unitTitle: participant.entryUnitTitle || "퀴즈 배틀",
        regionId: battleData.regionId || "",
        regionTitle: battleData.regionTitle || "",
        chapterId: "",
        clusterId: battleData.clusterId || "",
        battleScope: battleData.battleScope || "cumulative",
        opponentType: battleData.isAI === true ? "ai" : (participants[opponentUid]?.isGuest === true ? "guest" : "member"),
        isAIBattle: battleData.isAI === true,
        battleUnitTitle: battleData.battleUnitTitle || "",
        score: Number(participant.score || 0),
        correctCount: Number(participant.correctCount || 0),
        totalCount: totalQuestions,
        answeredCount: Number(participant.answeredCount || 0),
        forfeited: participant.forfeited === true,
        crystalsEarned: reward,
        rewardLimitReason: rewardPolicy.reason || "",
        competitiveEligible,
        aiTrainingEligible,
        battleResult: didWin ? "win" : didDraw ? "draw" : "loss",
        opponentUid,
        opponentDisplayName,
        timestamp: FieldValue.serverTimestamp(),
      }, { merge: true });

      // streak 재계산: 직전 currentStreak를 읽어 승리면 +1, 아니면 0으로 리셋.
      const prevCurrentStreak = Number(existingStats[uid]?.currentStreak || 0);
      const prevBestStreak = Number(existingStats[uid]?.bestStreak || 0);
      const nextCurrentStreak = didWin ? prevCurrentStreak + 1 : 0;
      const nextBestStreak = Math.max(prevBestStreak, nextCurrentStreak);

      if (competitiveEligible) {
        transaction.set(statsRef, {
          totalMatches: FieldValue.increment(1),
          wins: FieldValue.increment(didWin ? 1 : 0),
          losses: FieldValue.increment(didLose ? 1 : 0),
          draws: FieldValue.increment(didDraw ? 1 : 0),
          totalCorrect: FieldValue.increment(myCorrect),
          totalAnswered: FieldValue.increment(ratingQuestionCount),
          totalScore: FieldValue.increment(Number(participant.score || 0)),
          completionCount: FieldValue.increment(isComplete ? 1 : 0),
          forfeitCount: FieldValue.increment(isForfeit ? 1 : 0),
          perfectWins: FieldValue.increment(isPerfectWin ? 1 : 0),
          currentStreak: nextCurrentStreak,
          bestStreak: nextBestStreak,
          lastBattleAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    });

    result = {
      alreadyFinalized: false,
      winnerUid: rewardResult.winnerUid,
      rewards: rewardResult.rewards,
      participantUids,
      questionSet: battleData.questionSet || [],
      regionId: battleData.regionId || "",
      regionTitle: battleData.regionTitle || "",
      clusterId: battleData.clusterId || "",
      isAI: battleData.isAI === true,
      wrongAnswersSyncedAt: null,
      battleStatsSyncedAt: null,
      finalizeReason,
    };
  });

  // 정산 트랜잭션 이후: 각 참가자가 틀린 문제를 다크매터(users/{uid}/incorrect_questions)에
  // 등록한다. 이미 finished인 배틀도 wrongAnswersSyncedAt이 없으면 재시도한다.
  if (result && !result.wrongAnswersSyncedAt) {
    try {
      await syncBattleWrongAnswersIfNeeded(battleId, "finalize");
    } catch (err) {
      console.warn("Battle wrong answer sync failed", battleId, err);
    }
  }

  // 정산 트랜잭션 이후: region/opponent 통계와 battleRating을 갱신한다.
  // 트랜잭션 외부에서 claim 패턴으로 실행해 무거운 파생 통계가 정산 지연을 유발하지 않게 한다.
  if (result && !result.battleStatsSyncedAt) {
    try {
      await syncBattleStatsIfNeeded(battleId, "finalize");
    } catch (err) {
      console.warn("Battle stats sync failed", battleId, err);
    }
  }

  if (result?.isAI === true) {
    await db.collection("quizBattleAISecrets").doc(battleId).delete().catch((err) => {
      console.warn("AI battle secret cleanup failed", battleId, err);
    });
  }

  try {
    await recordCrewGuestBattleActivity(battleId);
  } catch (err) {
    console.warn("Crew growth guest battle activity sync failed", battleId, err);
  }

  return result;
}

// region/opponent 통계와 battleRating을 트랜잭션 외부에서 갱신한다.
// syncBattleWrongAnswersIfNeeded와 동일한 claim 패턴을 따른다.
async function syncBattleStatsIfNeeded(battleId, source = "manual") {
  const db = admin.firestore();
  const battleRef = db.collection("quizBattles").doc(battleId);
  const nowMs = Date.now();
  const claimId = `${source}_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
  let claimedBattle = null;

  const claimed = await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(battleRef);
    if (!snap.exists) return false;

    const battleData = snap.data() || {};
    if (battleData.status !== "finished" || battleData.battleStatsSyncedAt) return false;

    const claimedAtMs = Number(battleData.battleStatsSyncClaimedAtMs || 0);
    if (claimedAtMs > 0 && nowMs - claimedAtMs < 2 * 60 * 1000) return false;

    claimedBattle = battleData;
    transaction.set(battleRef, {
      battleStatsSyncClaimId: claimId,
      battleStatsSyncClaimedAt: FieldValue.serverTimestamp(),
      battleStatsSyncClaimedAtMs: nowMs,
      battleStatsSyncAttempts: FieldValue.increment(1),
      battleStatsSyncSource: source,
    }, { merge: true });
    return true;
  });

  if (!claimed || !claimedBattle) {
    return { success: true, synced: false, skipped: true };
  }

  try {
    await applyBattleStats({
      db,
      battleId,
      battleData: claimedBattle,
      claimId,
      battleRef,
    });
    return { success: true, synced: true };
  } catch (err) {
    await battleRef.set({
      battleStatsSyncClaimId: FieldValue.delete(),
      battleStatsSyncClaimedAt: FieldValue.delete(),
      battleStatsSyncClaimedAtMs: FieldValue.delete(),
      battleStatsSyncFailedAt: FieldValue.serverTimestamp(),
      battleStatsSyncError: String(err?.message || err || "unknown").slice(0, 500),
    }, { merge: true });
    throw err;
  }
}

// 한 경기의 결과를 region/opponent 통계에 반영하고, 각 참가자의 battleRating을 재계산한다.
// summary는 이미 finalize 트랜잭션에서 increment로 갱신됐으므로 여기서는 다시 읽어서
// 파생값(rating)만 계산한다.
// 전체를 단일 batch로 커밋해 원자성을 보장하며, lastBattleId로 idempotency를 검사한다.
// battleRef를 전달받아 battleStatsSyncedAt을 같은 batch에 포함한다.
async function applyBattleStats({ db, battleId, battleData, claimId, battleRef }) {
  const allParticipantUids = Array.isArray(battleData.participantUids)
    ? battleData.participantUids.filter(Boolean).slice(0, 2)
    : [];
  const participants = battleData.participants || {};
  const participantUids = allParticipantUids.filter((uid) => (
    isPersistentBattleParticipant(participants[uid] || {})
    && battleData.rewardPolicies?.[uid]?.competitiveEligible !== false
  ));
  if (participantUids.length === 0) {
    await battleRef.set({ battleStatsSyncedAt: FieldValue.serverTimestamp() }, { merge: true });
    return;
  }
  const regionId = battleData.regionId || "";
  const regionTitle = battleData.regionTitle || "";
  const winnerUid = battleData.winnerUid || "";

  // batch에 read를 포함할 수 없으므로, 모든 read를 먼저 수행한다.
  // 1. idempotency 검사: region/opponent 문서의 lastBattleId가 이미 현재 battleId면 skip.
  // 2. summary read: battleRating 계산용.
  // 3. recent matches read: rating 활동 가산점용.
  const regionSnaps = {};
  const opponentSnaps = {};
  const summarySnaps = {};
  const recentCounts = {};

  await Promise.all(participantUids.map(async (uid) => {
    const opponentUid = allParticipantUids.find((otherUid) => otherUid !== uid) || "";

    // summary read (rating 계산용)
    const summarySnap = await db.collection("users").doc(uid)
      .collection("battleStats").doc("summary").get();
    summarySnaps[uid] = summarySnap.exists ? (summarySnap.data() || {}) : {};

    // recent matches
    recentCounts[uid] = await countRecentBattleMatches(db, uid);

    // idempotency: region 문서 read
    if (regionId) {
      const regionSnap = await db.collection("users").doc(uid)
        .collection("battleStats").doc("regions").collection("rankings").doc(regionId).get();
      regionSnaps[uid] = regionSnap.exists ? (regionSnap.data() || {}) : null;
    }

    // idempotency: opponent 문서 read
    if (opponentUid) {
      const oppSnap = await db.collection("users").doc(uid)
        .collection("battleStats").doc("opponents").collection("entries").doc(opponentUid).get();
      opponentSnaps[uid] = oppSnap.exists ? (oppSnap.data() || {}) : null;
    }
  }));

  // idempotency 검사: 양쪽 모두 이미 이 배틀을 처리했으면 전체 skip.
  // (claim 패턴이 이미 2분 lock을 걸지만, lock 만료 후 재시도 시 중복을 막는다.)
  const alreadyProcessed = participantUids.every((uid) => {
    const regionAlready = regionId && regionSnaps[uid]?.lastBattleId === battleId;
    const oppUid = allParticipantUids.find((otherUid) => otherUid !== uid) || "";
    const oppAlready = oppUid && opponentSnaps[uid]?.lastBattleId === battleId;
    return regionAlready || oppAlready;
  });
  if (alreadyProcessed) {
    await battleRef.set({
      battleStatsSyncedAt: FieldValue.serverTimestamp(),
      battleStatsSyncCompletedClaimId: claimId,
      battleStatsSyncAlreadyProcessed: true,
    }, { merge: true });
    return;
  }

  // 단일 batch로 모든 쓰기를 원자적으로 커밋한다.
  const batch = db.batch();
  const nowServer = FieldValue.serverTimestamp();

  participantUids.forEach((uid) => {
    const participant = participants[uid] || {};
    const opponentUid = allParticipantUids.find((otherUid) => otherUid !== uid) || "";
    const opponentDisplayName = (participants[opponentUid] || {}).displayName || "";
    const didWin = winnerUid === uid;
    const didDraw = !winnerUid;
    const didLose = !didWin && !didDraw;
    const myCorrect = Number(participant.correctCount || 0);
    const myAnswered = Number(participant.answeredCount || 0);
    const myScore = Number(participant.score || 0);

    // region별 전적 (battleStats/regions/{regionId})
    if (regionId) {
      const regionRef = db.collection("users").doc(uid)
        .collection("battleStats").doc("regions").collection("rankings").doc(regionId);
      batch.set(regionRef, {
        regionId,
        regionTitle,
        matches: FieldValue.increment(1),
        wins: FieldValue.increment(didWin ? 1 : 0),
        losses: FieldValue.increment(didLose ? 1 : 0),
        draws: FieldValue.increment(didDraw ? 1 : 0),
        correctCount: FieldValue.increment(myCorrect),
        answeredCount: FieldValue.increment(myAnswered),
        totalScore: FieldValue.increment(myScore),
        lastBattleAt: nowServer,
        lastBattleId: battleId,
      }, { merge: true });
    }

    // 상대 전적 (battleStats/opponents/{opponentUid})
    if (opponentUid) {
      const opponentRef = db.collection("users").doc(uid)
        .collection("battleStats").doc("opponents").collection("entries").doc(opponentUid);
      batch.set(opponentRef, {
        opponentUid,
        opponentDisplayName,
        matches: FieldValue.increment(1),
        wins: FieldValue.increment(didWin ? 1 : 0),
        losses: FieldValue.increment(didLose ? 1 : 0),
        draws: FieldValue.increment(didDraw ? 1 : 0),
        lastBattleId: battleId,
        lastBattleAt: nowServer,
      }, { merge: true });
    }

    // battleRating + streak 재계산 및 루트 반영 (같은 batch에 포함).
    // battleBestStreak/battleCurrentStreak은 SEI battle 축의 연승 점수에서 읽힌다.
    const summary = summarySnaps[uid] || {};
    const battleRating = calculateBattleRating(summary, { recentMatches: recentCounts[uid] });
    batch.set(db.collection("users").doc(uid), {
      battleRating,
      battleBestStreak: Number(summary.bestStreak || 0),
      battleCurrentStreak: Number(summary.currentStreak || 0),
      battleStatsSyncedAt: nowServer,
    }, { merge: true });
  });

  // battleStatsSyncedAt을 같은 batch에 포함해 완전한 원자성을 보장한다.
  // 이 batch가 성공하면 region/opponent/rating/syncedAt이 모두 함께 반영된다.
  batch.set(battleRef, {
    battleStatsSyncedAt: nowServer,
    battleStatsSyncCompletedClaimId: claimId,
  }, { merge: true });

  await batch.commit();
}

// 최근 30일간 경기 수를 history에서 집계한다. battleRating의 recent 활동 가산점용.
async function countRecentBattleMatches(db, uid) {
  const sinceMs = Date.now() - BATTLE_RATING_RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const sinceDate = admin.firestore.Timestamp.fromMillis(sinceMs);
  const snap = await db.collection("users").doc(uid).collection("history")
    .where("type", "==", "quiz_battle")
    .where("timestamp", ">=", sinceDate)
    .get();
  return snap.docs.filter((docSnap) => {
    const battle = docSnap.data() || {};
    if (battle.competitiveEligible === true) return true;
    // 플래그 도입 전 기록은 AI전만 제외하고 기존 PVP 기록을 유지한다.
    return battle.competitiveEligible === undefined && battle.isAIBattle !== true;
  }).length;
}

async function syncBattleWrongAnswersIfNeeded(battleId, source = "manual") {
  const db = admin.firestore();
  const battleRef = db.collection("quizBattles").doc(battleId);
  const nowMs = Date.now();
  const claimId = `${source}_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
  let claimedBattle = null;

  const claimed = await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(battleRef);
    if (!snap.exists) return false;

    const battleData = snap.data() || {};
    if (battleData.status !== "finished" || battleData.wrongAnswersSyncedAt) return false;

    const claimedAtMs = Number(battleData.wrongAnswersSyncClaimedAtMs || 0);
    if (claimedAtMs > 0 && nowMs - claimedAtMs < 2 * 60 * 1000) return false;

    claimedBattle = battleData;
    transaction.set(battleRef, {
      wrongAnswersSyncClaimId: claimId,
      wrongAnswersSyncClaimedAt: FieldValue.serverTimestamp(),
      wrongAnswersSyncClaimedAtMs: nowMs,
      wrongAnswersSyncAttempts: FieldValue.increment(1),
      wrongAnswersSyncSource: source,
    }, { merge: true });
    return true;
  });

  if (!claimed || !claimedBattle) {
    return { success: true, synced: false, skipped: true };
  }

  try {
    await registerBattleWrongAnswers({
      db,
      battleRef,
      battleId,
      participantUids: Array.isArray(claimedBattle.participantUids)
        ? claimedBattle.participantUids.filter((uid) => isPersistentBattleParticipant(claimedBattle.participants?.[uid] || {}))
        : [],
      questionSet: Array.isArray(claimedBattle.questionSet) ? claimedBattle.questionSet : [],
      regionId: claimedBattle.regionId || "",
      regionTitle: claimedBattle.regionTitle || "",
      clusterId: claimedBattle.clusterId || "",
      claimId,
    });
    return { success: true, synced: true };
  } catch (err) {
    await battleRef.set({
      wrongAnswersSyncClaimId: FieldValue.delete(),
      wrongAnswersSyncClaimedAt: FieldValue.delete(),
      wrongAnswersSyncClaimedAtMs: FieldValue.delete(),
      wrongAnswersSyncFailedAt: FieldValue.serverTimestamp(),
      wrongAnswersSyncError: String(err?.message || err || "unknown").slice(0, 500),
    }, { merge: true });
    throw err;
  }
}

async function cancelStartingQuizBattleInternal(battleId, reason = "entry_not_confirmed", cancelledByUid = "") {
  const db = admin.firestore();
  const battleRef = db.collection("quizBattles").doc(battleId);
  const nowMs = Date.now();
  let result = { success: true, status: "cancelled", alreadyResolved: false };

  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(battleRef);
    if (!snap.exists) {
      throw new functions.https.HttpsError("not-found", "배틀을 찾을 수 없습니다.");
    }
    const battleData = snap.data() || {};
    if (battleData.status === "active" || battleData.status === "finished") {
      result = { success: true, status: battleData.status, alreadyResolved: true };
      return;
    }
    if (battleData.status === "cancelled") {
      result = { success: true, status: "cancelled", alreadyResolved: true };
      return;
    }
    if (battleData.status !== "starting") {
      throw new functions.https.HttpsError("failed-precondition", "입장 확인 중인 배틀이 아닙니다.");
    }

    transaction.set(battleRef, {
      status: "cancelled",
      cancelReason: reason,
      cancelledByUid: cleanId(cancelledByUid),
      cancelledAt: FieldValue.serverTimestamp(),
      cancelledAtMs: nowMs,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    const ticketIds = battleData.ticketIds || {};
    const participantUids = Array.isArray(battleData.participantUids) ? battleData.participantUids : [];
    participantUids.forEach((participantUid) => {
      const ticketId = cleanId(ticketIds[participantUid], 220);
      if (!ticketId) return;
      const ticketRef = db.collection("quizBattleQueueTickets").doc(ticketId);
      transaction.set(ticketRef, {
        status: "cancelled",
        cancelledAt: FieldValue.serverTimestamp(),
        cancelReason: reason,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });
  });

  return result;
}

async function confirmQuizBattleEntryInternal(battleId, uid) {
  const db = admin.firestore();
  const battleRef = db.collection("quizBattles").doc(battleId);
  const nowMs = Date.now();

  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(battleRef);
    if (!snap.exists) {
      throw new functions.https.HttpsError("not-found", "배틀을 찾을 수 없습니다.");
    }
    const battleData = snap.data() || {};
    const participantUids = Array.isArray(battleData.participantUids)
      ? battleData.participantUids.filter(Boolean).slice(0, 2)
      : [];
    if (!participantUids.includes(uid)) {
      throw new functions.https.HttpsError("permission-denied", "배틀 참가자만 입장 확인을 할 수 있습니다.");
    }

    if (battleData.status === "active" || battleData.status === "finished" || battleData.status === "cancelled") {
      return {
        success: true,
        status: battleData.status,
        startedAtMs: Number(battleData.startedAtMs || 0),
        endsAtMs: Number(battleData.endsAtMs || 0),
      };
    }
    if (battleData.status !== "starting") {
      throw new functions.https.HttpsError("failed-precondition", "입장 확인 가능한 배틀이 아닙니다.");
    }

    const deadlineMs = Number(battleData.entryConfirmDeadlineMs || 0);
    if (deadlineMs > 0 && nowMs > deadlineMs) {
      transaction.set(battleRef, {
        status: "cancelled",
        cancelReason: "entry_confirm_timeout",
        cancelledAt: FieldValue.serverTimestamp(),
        cancelledAtMs: nowMs,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      const ticketIds = battleData.ticketIds || {};
      participantUids.forEach((participantUid) => {
        const ticketId = cleanId(ticketIds[participantUid], 220);
        if (!ticketId) return;
        transaction.set(db.collection("quizBattleQueueTickets").doc(ticketId), {
          status: "cancelled",
          cancelReason: "entry_confirm_timeout",
          cancelledAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      });
      return { success: true, status: "cancelled", cancelReason: "entry_confirm_timeout" };
    }

    const participants = battleData.participants || {};
    const updatedParticipants = { ...participants };
    updatedParticipants[uid] = {
      ...(participants[uid] || {}),
      entryConfirmed: true,
      entryConfirmedAtMs: nowMs,
    };
    const allConfirmed = participantUids.every((participantUid) => (
      participantUid === uid || updatedParticipants[participantUid]?.entryConfirmed === true
    ));

    const updates = {
      [`participants.${uid}.entryConfirmed`]: true,
      [`participants.${uid}.entryConfirmedAt`]: FieldValue.serverTimestamp(),
      [`participants.${uid}.entryConfirmedAtMs`]: nowMs,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (allConfirmed) {
      updates.status = "active";
      updates.startedAt = FieldValue.serverTimestamp();
      updates.startedAtMs = nowMs;
      updates.endsAtMs = nowMs + QUIZ_BATTLE_DURATION_MS;
      updates.entryConfirmedAt = FieldValue.serverTimestamp();
      updates.entryConfirmedAtMs = nowMs;
    }

    transaction.update(battleRef, updates);
    return {
      success: true,
      status: allConfirmed ? "active" : "starting",
      startedAtMs: allConfirmed ? nowMs : 0,
      endsAtMs: allConfirmed ? nowMs + QUIZ_BATTLE_DURATION_MS : 0,
    };
  });
}

async function forfeitQuizBattleForUid(battleId, uid) {
  const db = admin.firestore();
  const battleRef = db.collection("quizBattles").doc(battleId);
  const nowMs = Date.now();

  const battleSnap = await battleRef.get();
  if (!battleSnap.exists) {
    throw new functions.https.HttpsError("not-found", "배틀을 찾을 수 없습니다.");
  }
  const battleData = battleSnap.data() || {};
  if (!Array.isArray(battleData.participantUids) || !battleData.participantUids.includes(uid)) {
    throw new functions.https.HttpsError("permission-denied", "배틀 참가자만 포기할 수 있습니다.");
  }
  if (battleData.status === "finished") {
    return {
      success: true,
      alreadyFinalized: true,
      winnerUid: battleData.winnerUid || "",
      rewards: battleData.rewards || {},
    };
  }
  if (battleData.status === "starting") {
    return cancelStartingQuizBattleInternal(battleId, "participant_left_before_start", uid);
  }
  if (battleData.status === "cancelled") {
    return { success: true, status: "cancelled", alreadyResolved: true };
  }

  await db.runTransaction(async (transaction) => {
    const freshSnap = await transaction.get(battleRef);
    if (!freshSnap.exists) return;
    const freshData = freshSnap.data() || {};
    if (freshData.status === "finished") return;
    transaction.update(battleRef, {
      [`participants.${uid}.forfeited`]: true,
      [`participants.${uid}.forfeitedAt`]: FieldValue.serverTimestamp(),
      [`participants.${uid}.forfeitedAtMs`]: nowMs,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  const result = await finalizeQuizBattleInternal(battleId, "forfeit");
  return { success: true, ...result };
}

/**
 * 배틀에서 각 참가자가 틀린 문제를 users/{uid}/incorrect_questions에 등록한다.
 * 필드 테스트의 SpaceHome.handleComplete 등록 경로와 동일한 컬렉션/문서 구조를
 * 사용해 다크매터 행성에서 자연스럽게 복습할 수 있게 한다.
 */
async function registerBattleWrongAnswers({ db, battleRef, battleId, participantUids, questionSet, regionId, regionTitle, clusterId, claimId }) {
  const safeParticipantUids = Array.isArray(participantUids) ? participantUids.filter(Boolean) : [];
  const safeQuestionSet = Array.isArray(questionSet) ? questionSet : [];

  // questionId -> question 메타데이터 맵 (unitId, unitTitle, chapterId 등)
  const questionMetaById = new Map();
  safeQuestionSet.forEach((q) => {
    if (q && q.questionId) {
      questionMetaById.set(q.questionId, {
        questionId: q.questionId,
        sourceQuestionId: q.sourceQuestionId || q.questionId,
        unitId: q.unitId || "",
        unitTitle: q.unitTitle || "",
        chapterId: q.chapterId || "",
      });
    }
  });

  const batch = db.batch();
  let hasOps = false;

  for (const uid of safeParticipantUids) {
    // 이 참가자의 모든 답안 중 오답만 수집
    const answersSnap = await battleRef.collection("answers")
      .where("uid", "==", uid)
      .where("isCorrect", "==", false)
      .get();
    answersSnap.docs.forEach((answerDoc) => {
      const answer = answerDoc.data() || {};
      const questionId = answer.questionId || "";
      if (!questionId) return;
      // 실제 quizzes 컬렉션에 존재하는 문제 ID(=sourceQuestionId)로 등록해야
      // 다크매터 hydrate 시 정상 로드된다.
      const meta = questionMetaById.get(questionId) || {};
      const docId = meta.sourceQuestionId || questionId;
      const ref = db.collection("users").doc(uid).collection("incorrect_questions").doc(docId);
      batch.set(ref, {
        id: docId,
        questionId,
        unitId: meta.unitId || "",
        unitTitle: meta.unitTitle || "",
        chapterId: meta.chapterId || "",
        regionId,
        regionTitle,
        clusterId,
        source: "quiz_battle",
        lastFailedAt: FieldValue.serverTimestamp(),
        lastFailureBattleId: battleId || "",
        failCount: FieldValue.increment(1),
      }, { merge: true });
      hasOps = true;
    });

    // 맞힌 문제는 incorrect_questions에서 제거해 과거 오답이 정화된 상태로 유지
    const correctSnap = await battleRef.collection("answers")
      .where("uid", "==", uid)
      .where("isCorrect", "==", true)
      .get();
    correctSnap.docs.forEach((answerDoc) => {
      const answer = answerDoc.data() || {};
      const questionId = answer.questionId || "";
      if (!questionId) return;
      const meta = questionMetaById.get(questionId) || {};
      const docId = meta.sourceQuestionId || questionId;
      const ref = db.collection("users").doc(uid).collection("incorrect_questions").doc(docId);
      batch.delete(ref);
      hasOps = true;
    });
  }

  batch.set(battleRef, {
    wrongAnswersSyncedAt: FieldValue.serverTimestamp(),
    wrongAnswersSyncClaimId: FieldValue.delete(),
    wrongAnswersSyncClaimedAt: FieldValue.delete(),
    wrongAnswersSyncClaimedAtMs: FieldValue.delete(),
    wrongAnswersSyncError: FieldValue.delete(),
    wrongAnswersSyncCompletedClaimId: claimId || "",
  }, { merge: true });
  hasOps = true;

  if (hasOps) await batch.commit();
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

exports.listQuizBattleQueue = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const isGuestUser = isGuestContext(context);
  const clusterId = cleanId(data?.clusterId || "cluster_elementary");
  const regionId = cleanId(data?.regionId);
  const entryUnitId = cleanId(data?.entryUnitId);
  if (!regionId || !entryUnitId) {
    throw new functions.https.HttpsError("invalid-argument", "배틀 목록 조회 정보가 올바르지 않습니다.");
  }

  const db = admin.firestore();
  const nowMs = Date.now();
  const contextData = await resolveBattleContext({ clusterId, regionId, entryUnitId });
  if (!isGuestUser) {
    const userSnap = await db.collection("users").doc(uid).get();
    assertQuizBattleAccess(
      userSnap.exists ? (userSnap.data() || {}) : {},
      contextData.clusterId,
      regionId
    );
  }
  const waitingSnap = await db.collection("quizBattleQueueTickets")
    .where("clusterId", "==", contextData.clusterId)
    .where("regionId", "==", regionId)
    .where("status", "==", "waiting")
    .where("expiresAtMs", ">", nowMs)
    .orderBy("expiresAtMs", "asc")
    .limit(40)
    .get();

  const ticketRows = await Promise.all(waitingSnap.docs
    .filter((docSnap) => {
      const ticket = docSnap.data() || {};
      return ticket.uid !== uid && Number(ticket.expiresAtMs || 0) > nowMs;
    })
    .map((docSnap) => sanitizeQueueTicketForList(db, docSnap, nowMs)));
  const tickets = ticketRows
    .filter(Boolean)
    .sort((a, b) => Number(a.createdAtMs || 0) - Number(b.createdAtMs || 0));

  return {
    regionId,
    clusterId: contextData.clusterId,
    tickets,
    refreshedAtMs: nowMs,
  };
});

exports.joinQuizBattleQueue = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const isGuestUser = isGuestContext(context);
  const clusterId = cleanId(data?.clusterId || "cluster_elementary");
  const regionId = cleanId(data?.regionId);
  const entryUnitId = cleanId(data?.entryUnitId);
  const battleScope = normalizeBattleScope(data?.battleScope);
  const targetTicketId = cleanId(data?.targetTicketId, 220);
  const requestedQuestionCount = Math.max(
    5,
    Math.min(QUIZ_BATTLE_QUESTION_COUNT, Number(data?.questionCount || QUIZ_BATTLE_QUESTION_COUNT))
  );

  if (!regionId || !entryUnitId) {
    throw new functions.https.HttpsError("invalid-argument", "배틀 진입 정보가 올바르지 않습니다.");
  }

  const db = admin.firestore();
  const nowMs = Date.now();
  const contextData = await resolveBattleContext({ clusterId, regionId, entryUnitId });
  let ownTicket = await findOwnQuizBattleTicket(db, uid, regionId, cleanId(data?.ticketId, 220));
  let ticketRef = ownTicket?.ref || db.collection("quizBattleQueueTickets").doc();
  let ticketId = ticketRef.id;
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  const userData = userSnap.exists
    ? (userSnap.data() || {})
    : (isGuestUser ? { publicDisplayName: getCrewGuestAlias(uid), isGuest: true } : {});
  if (!isGuestUser) assertQuizBattleAccess(userData, contextData.clusterId, regionId);
  let existingTicketSnap = ownTicket?.snap || await ticketRef.get();
  if (
    existingTicketSnap.exists &&
    isLegacyQuizBattleTicketId(ticketRef.id, existingTicketSnap.data() || {}) &&
    existingTicketSnap.data()?.status !== "matched"
  ) {
    await ticketRef.set({
      status: "cancelled",
      cancelledAt: FieldValue.serverTimestamp(),
      migratedToOpaqueTicketAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    ownTicket = null;
    ticketRef = db.collection("quizBattleQueueTickets").doc();
    ticketId = ticketRef.id;
    existingTicketSnap = await ticketRef.get();
  }
  if (existingTicketSnap.exists) {
    const existingTicket = existingTicketSnap.data() || {};
    if (existingTicket.status === "matched" && existingTicket.matchId) {
      const existingBattleSnap = await db.collection("quizBattles").doc(existingTicket.matchId).get();
      if (existingBattleSnap.exists) {
        const existingBattle = existingBattleSnap.data() || {};
        if (existingBattle.status !== "finished" && existingBattle.status !== "cancelled") {
          // 배틀이 아직 "계속 진행 가능한 상태"인지 확인한다.
          // 타이머가 만료됐거나 누군가 이미 포기했다면 stale(좀비) 배틀이므로
          // 정산한 뒤 새 매칭으로 넘어간다. 그렇지 않으면 그대로 재입장시킨다.
          const endedByTimer = Number(existingBattle.endsAtMs || 0) > 0 && nowMs >= Number(existingBattle.endsAtMs || 0);
          const endedByForfeit = (existingBattle.participants || {})[uid]?.forfeited === true
            || (existingBattle.participantUids || []).some((pUid) => existingBattle.participants?.[pUid]?.forfeited === true);
          if (!endedByTimer && !endedByForfeit) {
            return { status: "matched", battleId: existingTicket.matchId };
          }
          // stale 배틀을 정산 시도(이미 끝났거나 실패해도 무방)한다.
          try {
            await finalizeQuizBattleInternal(existingTicket.matchId, "force");
          } catch (err) {
            console.warn("Stale battle finalize on rejoin failed", err);
          }
        }
      }
      // 여기에 도달했다면 티켓이 종료된/stale 배틀을 가리키고 있는 것이다.
      // 다음 매칭에서 재사용할 수 있도록 티켓을 초기화한다.
      if (isLegacyQuizBattleTicketId(ticketRef.id, existingTicket)) {
        await ticketRef.set({
          status: "cancelled",
          cancelledAt: FieldValue.serverTimestamp(),
          migratedToOpaqueTicketAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        ownTicket = null;
        ticketRef = db.collection("quizBattleQueueTickets").doc();
        ticketId = ticketRef.id;
        existingTicketSnap = await ticketRef.get();
      } else {
        await ticketRef.set({
          status: "waiting",
          matchId: "",
          expiresAtMs: nowMs + QUIZ_BATTLE_QUEUE_TTL_MS,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    }
  }

  if (targetTicketId) {
    const targetRef = await resolveQuizBattleTargetRef(db, targetTicketId, nowMs);
    if (!targetRef) {
      throw new functions.https.HttpsError("not-found", "상대방이 대기방에서 나갔습니다. 새로 고침해 주세요.");
    }
    const targetSnap = await targetRef.get();
    if (!targetSnap.exists) {
      throw new functions.https.HttpsError("not-found", "상대방이 대기방에서 나갔습니다. 새로 고침해 주세요.");
    }
    const targetTicket = targetSnap.data() || {};
    if (targetTicket.uid === uid) {
      throw new functions.https.HttpsError("failed-precondition", "본인의 대기방에는 참여할 수 없습니다.");
    }
    if (targetTicket.clusterId !== contextData.clusterId || targetTicket.regionId !== regionId) {
      throw new functions.https.HttpsError("failed-precondition", "현재 행성의 대기방이 아닙니다. 새로 고침해 주세요.");
    }
    if (targetTicket.status !== "waiting" || Number(targetTicket.expiresAtMs || 0) <= nowMs) {
      throw new functions.https.HttpsError("failed-precondition", "상대방이 대기방에서 나갔습니다. 새로 고침해 주세요.");
    }

    const targetScope = normalizeBattleScope(targetTicket.battleScope);
    const targetEntryUnitId = cleanId(targetTicket.entryUnitId);
    const targetEntryOrdinal = Number(targetTicket.entryOrdinal || 0);
    const commonCeilingOrdinal = targetScope === QUIZ_BATTLE_SCOPE_UNIT
      ? targetEntryOrdinal
      : Math.min(Number(contextData.entryOrdinal || 0), targetEntryOrdinal);
    if (!commonCeilingOrdinal) {
      throw new functions.https.HttpsError("failed-precondition", "상대와 공통 배틀 범위를 찾을 수 없습니다.");
    }

    const directQuestionCount = Math.max(
      QUIZ_BATTLE_MIN_UNIT_QUESTION_COUNT,
      Math.min(QUIZ_BATTLE_QUESTION_COUNT, Number(targetTicket.questionCount || requestedQuestionCount))
    );
    const questionSet = await buildBattleQuestionSet(
      contextData,
      commonCeilingOrdinal,
      directQuestionCount,
      `${uid}_${targetTicket.uid}_${nowMs}`,
      { battleScope: targetScope, unitId: targetEntryUnitId }
    );

    const battleRef = db.collection("quizBattles").doc();
    const opponentUid = targetTicket.uid;
    const entryConfirmDeadlineMs = nowMs + QUIZ_BATTLE_START_CONFIRM_TIMEOUT_MS;
    const participantUids = [uid, opponentUid].sort();
    const matched = await db.runTransaction(async (transaction) => {
      const [freshTargetSnap, freshOwnSnap] = await Promise.all([
        transaction.get(targetRef),
        transaction.get(ticketRef),
      ]);
      if (!freshTargetSnap.exists) return false;
      const freshTarget = freshTargetSnap.data() || {};
      if (
        freshTarget.uid !== opponentUid ||
        freshTarget.status !== "waiting" ||
        freshTarget.clusterId !== contextData.clusterId ||
        freshTarget.regionId !== regionId ||
        normalizeBattleScope(freshTarget.battleScope) !== targetScope ||
        cleanId(freshTarget.entryUnitId) !== targetEntryUnitId ||
        Number(freshTarget.expiresAtMs || 0) <= nowMs
      ) {
        return false;
      }
      if (freshOwnSnap.exists) {
        const ownData = freshOwnSnap.data() || {};
        if (ownData.status === "matched" && ownData.matchId) return false;
      }

      const targetUnitTitle = freshTarget.entryUnitTitle || contextData.units.find((unit) => unit.id === targetEntryUnitId)?.title || "";
      const participants = {};
      participants[uid] = {
        uid,
        displayName: getPublicStudentName(userData),
        isGuest: isGuestUser,
        score: 0,
        correctCount: 0,
        answeredCount: 0,
        ready: true,
        entryConfirmed: false,
        entryConfirmedAtMs: 0,
        entryUnitId,
        entryUnitTitle: contextData.units.find((unit) => unit.id === entryUnitId)?.title || "",
      };
      participants[opponentUid] = {
        uid: opponentUid,
        displayName: freshTarget.displayName || "상대",
        isGuest: freshTarget.isGuest === true,
        score: 0,
        correctCount: 0,
        answeredCount: 0,
        ready: true,
        entryConfirmed: false,
        entryConfirmedAtMs: 0,
        entryUnitId: targetEntryUnitId,
        entryUnitTitle: targetUnitTitle,
      };

      transaction.set(battleRef, {
        status: "starting",
        clusterId: contextData.clusterId,
        regionId,
        regionTitle: contextData.regionTitle || "",
        battleScope: targetScope,
        battleUnitId: targetScope === QUIZ_BATTLE_SCOPE_UNIT ? targetEntryUnitId : "",
        battleUnitTitle: targetScope === QUIZ_BATTLE_SCOPE_UNIT ? targetUnitTitle : "",
        commonCeilingOrdinal,
        participantUids,
        participants,
        entryUnitIds: {
          [uid]: entryUnitId,
          [opponentUid]: targetEntryUnitId,
        },
        ticketIds: {
          [uid]: ticketRef.id,
          [opponentUid]: targetRef.id,
        },
        questionCount: questionSet.length,
        questionSet,
        startedAtMs: 0,
        endsAtMs: 0,
        entryConfirmDeadlineMs,
        createdAt: FieldValue.serverTimestamp(),
        createdAtMs: nowMs,
      });

      const matchPatch = {
        status: "matched",
        matchId: battleRef.id,
        matchedAt: FieldValue.serverTimestamp(),
        matchedAtMs: nowMs,
        updatedAt: FieldValue.serverTimestamp(),
      };
      transaction.set(targetRef, matchPatch, { merge: true });
      transaction.set(ticketRef, {
        uid,
        displayName: getPublicStudentName(userData),
        isGuest: isGuestUser,
        clusterId: contextData.clusterId,
        regionId,
        entryUnitId,
        entryUnitTitle: contextData.units.find((unit) => unit.id === entryUnitId)?.title || "",
        entryOrdinal: contextData.entryOrdinal,
        battleScope: targetScope,
        questionCount: questionSet.length,
        expiresAtMs: nowMs + QUIZ_BATTLE_QUEUE_TTL_MS,
        ttlAt: Timestamp.fromMillis(nowMs + (24 * 60 * 60 * 1000)),
        createdAt: FieldValue.serverTimestamp(),
        createdAtMs: nowMs,
        ...matchPatch,
      }, { merge: true });
      return true;
    });

    if (!matched) {
      throw new functions.https.HttpsError("aborted", "상대방이 대기방에서 나갔거나 이미 매칭되었습니다. 새로 고침해 주세요.");
    }
    return { status: "matched", battleId: battleRef.id, ticketId };
  }

  let waitingQuery = db.collection("quizBattleQueueTickets")
    .where("clusterId", "==", contextData.clusterId)
    .where("regionId", "==", regionId)
    .where("status", "==", "waiting")
    .where("battleScope", "==", battleScope)
    .where("expiresAtMs", ">", nowMs);
  if (battleScope === QUIZ_BATTLE_SCOPE_UNIT) {
    waitingQuery = waitingQuery.where("entryUnitId", "==", entryUnitId);
  }

  const waitingSnap = await waitingQuery
    .orderBy("expiresAtMs", "asc")
    .limit(40)
    .get();

  const candidates = waitingSnap.docs
    .map((docSnap) => ({ id: docSnap.id, ref: docSnap.ref, data: docSnap.data() || {} }))
    .filter((ticket) => ticket.id !== ticketId)
    .filter((ticket) => ticket.data.uid !== uid)
    .filter((ticket) => Number(ticket.data.expiresAtMs || 0) > nowMs);

  for (const candidate of candidates) {
    const commonCeilingOrdinal = battleScope === QUIZ_BATTLE_SCOPE_UNIT
      ? Number(contextData.entryOrdinal || 0)
      : Math.min(
        Number(contextData.entryOrdinal || 0),
        Number(candidate.data.entryOrdinal || 0)
      );
    if (!commonCeilingOrdinal) continue;

    let questionSet = [];
    try {
      questionSet = await buildBattleQuestionSet(
        contextData,
        commonCeilingOrdinal,
        Math.min(requestedQuestionCount, Number(candidate.data.questionCount || requestedQuestionCount)),
        `${uid}_${candidate.data.uid}_${nowMs}`,
        { battleScope, unitId: entryUnitId }
      );
    } catch (err) {
      if (err instanceof functions.https.HttpsError && err.code === "failed-precondition") {
        continue;
      }
      throw err;
    }

    const battleRef = db.collection("quizBattles").doc();
    const opponentUid = candidate.data.uid;
    const opponentRef = db.collection("users").doc(opponentUid);
    const opponentSnap = await opponentRef.get();
    const opponentData = opponentSnap.exists ? opponentSnap.data() || {} : {};
    const entryConfirmDeadlineMs = nowMs + QUIZ_BATTLE_START_CONFIRM_TIMEOUT_MS;
    const participantUids = [uid, opponentUid].sort();

    const matched = await db.runTransaction(async (transaction) => {
      const [candidateSnap, ownSnap] = await Promise.all([
        transaction.get(candidate.ref),
        transaction.get(ticketRef),
      ]);
      if (!candidateSnap.exists) return false;
      const freshCandidate = candidateSnap.data() || {};
      if (
        freshCandidate.status !== "waiting" ||
        Number(freshCandidate.expiresAtMs || 0) <= nowMs ||
        normalizeBattleScope(freshCandidate.battleScope) !== battleScope ||
        (battleScope === QUIZ_BATTLE_SCOPE_UNIT && freshCandidate.entryUnitId !== entryUnitId)
      ) {
        return false;
      }
      if (ownSnap.exists) {
        const ownData = ownSnap.data() || {};
        if (ownData.status === "matched" && ownData.matchId) return false;
      }

      const participants = {};
      participants[uid] = {
        uid,
        displayName: getPublicStudentName(userData),
        isGuest: isGuestUser,
        score: 0,
        correctCount: 0,
        answeredCount: 0,
        ready: true,
        entryConfirmed: false,
        entryConfirmedAtMs: 0,
        entryUnitId,
        entryUnitTitle: contextData.units.find((unit) => unit.id === entryUnitId)?.title || "",
      };
      participants[opponentUid] = {
        uid: opponentUid,
        displayName: freshCandidate.displayName || getPublicStudentName(opponentData, "상대"),
        isGuest: freshCandidate.isGuest === true,
        score: 0,
        correctCount: 0,
        answeredCount: 0,
        ready: true,
        entryConfirmed: false,
        entryConfirmedAtMs: 0,
        entryUnitId: freshCandidate.entryUnitId || "",
        entryUnitTitle: freshCandidate.entryUnitTitle || "",
      };

      transaction.set(battleRef, {
        status: "starting",
        clusterId: contextData.clusterId,
        regionId,
        regionTitle: contextData.regionTitle || "",
        battleScope,
        battleUnitId: battleScope === QUIZ_BATTLE_SCOPE_UNIT ? entryUnitId : "",
        battleUnitTitle: battleScope === QUIZ_BATTLE_SCOPE_UNIT
          ? (contextData.units.find((unit) => unit.id === entryUnitId)?.title || "")
          : "",
        commonCeilingOrdinal,
        participantUids,
        participants,
        entryUnitIds: {
          [uid]: entryUnitId,
          [opponentUid]: freshCandidate.entryUnitId || "",
        },
        ticketIds: {
          [uid]: ticketRef.id,
          [opponentUid]: candidate.ref.id,
        },
        questionCount: questionSet.length,
        questionSet,
        startedAtMs: 0,
        endsAtMs: 0,
        entryConfirmDeadlineMs,
        createdAt: FieldValue.serverTimestamp(),
        createdAtMs: nowMs,
      });

      const matchPatch = {
        status: "matched",
        matchId: battleRef.id,
        matchedAt: FieldValue.serverTimestamp(),
        matchedAtMs: nowMs,
        updatedAt: FieldValue.serverTimestamp(),
      };
      transaction.set(candidate.ref, matchPatch, { merge: true });
      transaction.set(ticketRef, {
        uid,
        displayName: getPublicStudentName(userData),
        isGuest: isGuestUser,
        clusterId: contextData.clusterId,
        regionId,
        entryUnitId,
        entryUnitTitle: contextData.units.find((unit) => unit.id === entryUnitId)?.title || "",
        entryOrdinal: contextData.entryOrdinal,
        battleScope,
        expiresAtMs: nowMs + QUIZ_BATTLE_QUEUE_TTL_MS,
        createdAt: FieldValue.serverTimestamp(),
        createdAtMs: nowMs,
        ...matchPatch,
      }, { merge: true });
      return true;
    });

    if (matched) {
      return { status: "matched", battleId: battleRef.id, ticketId };
    }
  }

  let waitQuestionCount = requestedQuestionCount;
  if (battleScope === QUIZ_BATTLE_SCOPE_UNIT) {
    const availableQuestions = await buildBattleQuestionSet(
      contextData,
      contextData.entryOrdinal,
      requestedQuestionCount,
      `${uid}_${nowMs}_availability`,
      { battleScope, unitId: entryUnitId }
    );
    waitQuestionCount = availableQuestions.length;
  }

  const waitResult = await db.runTransaction(async (transaction) => {
    const freshTicketSnap = await transaction.get(ticketRef);
    if (freshTicketSnap.exists) {
      const freshTicket = freshTicketSnap.data() || {};
      if (freshTicket.status === "matched" && freshTicket.matchId) {
        const freshBattleSnap = await transaction.get(db.collection("quizBattles").doc(freshTicket.matchId));
        if (freshBattleSnap.exists) {
          const freshBattle = freshBattleSnap.data() || {};
          // 배틀이 여전히 진행 중이고 stale(타이머 만료/포기)가 아니면 재입장시킨다.
          // finished이거나 stale이면 아래로 흘러 티켓을 새 waiting으로 덮어쓴다.
          const endedByTimer = Number(freshBattle.endsAtMs || 0) > 0 && nowMs >= Number(freshBattle.endsAtMs || 0);
          const endedByForfeit = (freshBattle.participantUids || []).some(
            (pUid) => freshBattle.participants?.[pUid]?.forfeited === true
          );
          if (freshBattle.status !== "finished" && freshBattle.status !== "cancelled" && !endedByTimer && !endedByForfeit) {
            return { status: "matched", battleId: freshTicket.matchId };
          }
        }
      }
    }

    transaction.set(ticketRef, {
      uid,
      displayName: getPublicStudentName(userData),
      isGuest: isGuestUser,
      clusterId: contextData.clusterId,
      regionId,
      entryUnitId,
      entryUnitTitle: contextData.units.find((unit) => unit.id === entryUnitId)?.title || "",
      entryOrdinal: contextData.entryOrdinal,
      battleScope,
      status: "waiting",
      matchId: "",
      questionCount: waitQuestionCount,
      expiresAtMs: nowMs + QUIZ_BATTLE_QUEUE_TTL_MS,
      ttlAt: Timestamp.fromMillis(nowMs + (24 * 60 * 60 * 1000)),
      createdAt: FieldValue.serverTimestamp(),
      createdAtMs: nowMs,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return {
      status: "waiting",
      ticketId,
      expiresAtMs: nowMs + QUIZ_BATTLE_QUEUE_TTL_MS,
    };
  });

  return waitResult;
});

exports.cancelQuizBattleQueue = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const regionId = cleanId(data?.regionId);
  if (!regionId) {
    throw new functions.https.HttpsError("invalid-argument", "대기 취소 정보가 올바르지 않습니다.");
  }

  const db = admin.firestore();
  const ownTicket = await findOwnQuizBattleTicket(db, uid, regionId, cleanId(data?.ticketId, 220));
  const ticketRef = ownTicket?.ref;
  let matchedBattleId = "";
  let cancelStatus = "missing";

  if (!ticketRef) {
    return { success: true, status: cancelStatus };
  }

  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ticketRef);
    if (!snap.exists) return;
    const ticket = snap.data() || {};
    if (ticket.uid !== uid) return;
    if (ticket.status === "matched" && ticket.matchId) {
      matchedBattleId = ticket.matchId;
      cancelStatus = "matched";
      return;
    }
    if (ticket.status !== "waiting") {
      cancelStatus = ticket.status || "inactive";
      return;
    }
    transaction.set(ticketRef, {
      status: "cancelled",
      cancelledAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    cancelStatus = "cancelled";
  });

  if (matchedBattleId) {
    const result = await forfeitQuizBattleForUid(matchedBattleId, uid);
    return {
      success: true,
      status: "matched_forfeited",
      battleId: matchedBattleId,
      ...result,
    };
  }

  return { success: true, status: cancelStatus };
});

exports.startAIQuizBattle = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const isGuestUser = isGuestContext(context);
  const clusterId = cleanId(data?.clusterId || "cluster_elementary");
  const regionId = cleanId(data?.regionId);
  const entryUnitId = cleanId(data?.entryUnitId);
  const battleScope = normalizeBattleScope(data?.battleScope);
  const requestedQuestionCount = Math.max(
    QUIZ_BATTLE_MIN_UNIT_QUESTION_COUNT,
    Math.min(QUIZ_BATTLE_QUESTION_COUNT, Number(data?.questionCount || QUIZ_BATTLE_QUESTION_COUNT))
  );

  if (!regionId || !entryUnitId) {
    throw new functions.https.HttpsError("invalid-argument", "AI 배틀 진입 정보가 올바르지 않습니다.");
  }

  const db = admin.firestore();
  const nowMs = Date.now();
  const contextData = await resolveBattleContext({ clusterId, regionId, entryUnitId });
  const userSnap = await db.collection("users").doc(uid).get();
  const userData = userSnap.exists
    ? (userSnap.data() || {})
    : (isGuestUser ? { publicDisplayName: getCrewGuestAlias(uid) } : {});
  if (!isGuestUser) assertQuizBattleAccess(userData, contextData.clusterId, regionId);
  const questionSet = await buildBattleQuestionSet(
    contextData,
    contextData.entryOrdinal,
    requestedQuestionCount,
    `${uid}_ai_${nowMs}`,
    { battleScope, unitId: entryUnitId }
  );
  const battleRef = db.collection("quizBattles").doc();
  const aiSecretRef = db.collection("quizBattleAISecrets").doc(battleRef.id);
  const aiUid = `ai_${battleRef.id}`;
  const entryUnitTitle = contextData.units.find((unit) => unit.id === entryUnitId)?.title || "";
  const participantUids = [uid, aiUid];

  const createBatch = db.batch();
  createBatch.set(battleRef, {
    status: "active",
    isAI: true,
    aiParticipantUid: aiUid,
    clusterId: contextData.clusterId,
    regionId,
    regionTitle: contextData.regionTitle || "",
    battleScope,
    battleUnitId: battleScope === QUIZ_BATTLE_SCOPE_UNIT ? entryUnitId : "",
    battleUnitTitle: battleScope === QUIZ_BATTLE_SCOPE_UNIT ? entryUnitTitle : "",
    commonCeilingOrdinal: contextData.entryOrdinal,
    participantUids,
    participants: {
      [uid]: {
        uid,
        displayName: getPublicStudentName(userData),
        isGuest: isGuestUser,
        score: 0,
        correctCount: 0,
        answeredCount: 0,
        ready: true,
        entryConfirmed: true,
        entryConfirmedAtMs: nowMs,
        entryUnitId,
        entryUnitTitle,
      },
      [aiUid]: {
        uid: aiUid,
        displayName: "NOVA-7",
        isAI: true,
        score: 0,
        correctCount: 0,
        answeredCount: 0,
        ready: true,
        entryConfirmed: true,
        entryConfirmedAtMs: nowMs,
        entryUnitId,
        entryUnitTitle,
      },
    },
    entryUnitIds: { [uid]: entryUnitId, [aiUid]: entryUnitId },
    questionCount: questionSet.length,
    questionSet,
    startedAt: FieldValue.serverTimestamp(),
    startedAtMs: nowMs,
    endsAtMs: nowMs + QUIZ_BATTLE_DURATION_MS,
    createdAt: FieldValue.serverTimestamp(),
    createdAtMs: nowMs,
    updatedAt: FieldValue.serverTimestamp(),
  });
  createBatch.set(aiSecretRef, {
    battleId: battleRef.id,
    userUid: uid,
    userFavored: Math.random() < 0.7,
    createdAt: FieldValue.serverTimestamp(),
    ttlAt: Timestamp.fromMillis(nowMs + (7 * 24 * 60 * 60 * 1000)),
  });
  await createBatch.commit();

  return { status: "active", battleId: battleRef.id };
});

exports.advanceAIQuizBattle = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const battleId = cleanId(data?.battleId);
  if (!battleId) {
    throw new functions.https.HttpsError("invalid-argument", "AI 배틀 정보가 올바르지 않습니다.");
  }

  const db = admin.firestore();
  const battleRef = db.collection("quizBattles").doc(battleId);
  const aiSecretRef = db.collection("quizBattleAISecrets").doc(battleId);
  const nowMs = Date.now();
  let shouldFinalize = false;
  let aiProgress = null;

  await db.runTransaction(async (transaction) => {
    const [battleSnap, aiSecretSnap] = await Promise.all([
      transaction.get(battleRef),
      transaction.get(aiSecretRef),
    ]);
    if (!battleSnap.exists) {
      throw new functions.https.HttpsError("not-found", "AI 배틀을 찾을 수 없습니다.");
    }
    const battleData = battleSnap.data() || {};
    const aiSecret = aiSecretSnap.exists ? (aiSecretSnap.data() || {}) : {};
    if (battleData.isAI !== true || battleData.status !== "active") return;
    if (!Array.isArray(battleData.participantUids) || !battleData.participantUids.includes(uid)) {
      throw new functions.https.HttpsError("permission-denied", "배틀 참가자만 AI 진행을 요청할 수 있습니다.");
    }

    const aiUid = cleanId(battleData.aiParticipantUid);
    const aiParticipant = battleData.participants?.[aiUid] || {};
    const myParticipant = battleData.participants?.[uid] || {};
    const totalQuestions = Number(battleData.questionCount || battleData.questionSet?.length || 0);
    const myAnswered = Math.min(totalQuestions, Number(myParticipant.answeredCount || 0));
    const myCorrect = Math.min(myAnswered, Number(myParticipant.correctCount || 0));
    const currentAIAnswered = Math.min(totalQuestions, Number(aiParticipant.answeredCount || 0));
    let nextAIAnswered = Math.max(currentAIAnswered, Math.min(myAnswered, currentAIAnswered + 1));
    let nextAICorrect = Math.min(nextAIAnswered, Number(aiParticipant.correctCount || 0));

    if (myAnswered >= totalQuestions) {
      nextAIAnswered = totalQuestions;
      const minimumAICorrect = Math.ceil(totalQuestions * 0.5);
      const tunedAICorrect = aiSecret.userFavored === true
        ? Math.max(0, myCorrect - 1)
        : Math.min(totalQuestions, myCorrect + 1);
      nextAICorrect = Math.min(totalQuestions, Math.max(minimumAICorrect, tunedAICorrect));
    } else if (nextAIAnswered > currentAIAnswered) {
      const stepIsCorrect = ((nextAIAnswered + battleId.length) % 5) < 3;
      nextAICorrect = Math.min(nextAIAnswered, Number(aiParticipant.correctCount || 0) + (stepIsCorrect ? 1 : 0));
    }

    const aiLastAnsweredAtMs = myAnswered >= totalQuestions && aiSecret.userFavored !== true
      ? Math.max(1, Number(myParticipant.lastAnsweredAtMs || nowMs) - 1)
      : nowMs;

    transaction.update(battleRef, {
      [`participants.${aiUid}.answeredCount`]: nextAIAnswered,
      [`participants.${aiUid}.correctCount`]: nextAICorrect,
      [`participants.${aiUid}.score`]: nextAICorrect * 100,
      [`participants.${aiUid}.lastAnsweredAtMs`]: aiLastAnsweredAtMs,
      updatedAt: FieldValue.serverTimestamp(),
    });
    shouldFinalize = myAnswered >= totalQuestions && nextAIAnswered >= totalQuestions;
    aiProgress = { answeredCount: nextAIAnswered, correctCount: nextAICorrect, score: nextAICorrect * 100 };
  });

  if (shouldFinalize) {
    await finalizeQuizBattleInternal(battleId, "completed");
  }
  return { success: true, finalized: shouldFinalize, ai: aiProgress };
});

exports.submitBattleAnswer = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const battleId = cleanId(data?.battleId);
  const questionId = cleanId(data?.questionId);
  const selectedOptionKeys = Array.isArray(data?.selectedOptionKeys)
    ? data.selectedOptionKeys.map((key) => normalizeStatKey(key)).filter(Boolean).slice(0, 8)
    : [normalizeStatKey(data?.selectedOptionKey || "")].filter(Boolean);

  if (!battleId || !questionId || selectedOptionKeys.length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "답안 정보가 올바르지 않습니다.");
  }

  const db = admin.firestore();
  const battleRef = db.collection("quizBattles").doc(battleId);
  const answerRef = battleRef.collection("answers").doc(`${uid}_${questionId}`);
  const nowMs = Date.now();
  let answerResult = null;

  await db.runTransaction(async (transaction) => {
    const [battleSnap, answerSnap] = await Promise.all([
      transaction.get(battleRef),
      transaction.get(answerRef),
    ]);

    if (!battleSnap.exists) {
      throw new functions.https.HttpsError("not-found", "배틀을 찾을 수 없습니다.");
    }
    if (answerSnap.exists) {
      answerResult = {
        alreadySubmitted: true,
        ...(answerSnap.data() || {}),
      };
      return;
    }

    const battleData = battleSnap.data() || {};
    if (battleData.status !== "active") {
      throw new functions.https.HttpsError("failed-precondition", "진행 중인 배틀이 아닙니다.");
    }
    if (!Array.isArray(battleData.participantUids) || !battleData.participantUids.includes(uid)) {
      throw new functions.https.HttpsError("permission-denied", "배틀 참가자만 답안을 제출할 수 있습니다.");
    }
    if (Number(battleData.endsAtMs || 0) > 0 && nowMs > Number(battleData.endsAtMs || 0) + 5000) {
      throw new functions.https.HttpsError("deadline-exceeded", "배틀 제한 시간이 종료되었습니다.");
    }
    const questionSet = Array.isArray(battleData.questionSet) ? battleData.questionSet : [];
    const questionMeta = questionSet.find((question) => question.questionId === questionId);
    if (!questionMeta) {
      throw new functions.https.HttpsError("failed-precondition", "이 배틀의 문제가 아닙니다.");
    }

    // 채점은 battle 문서에 저장된 correctKeys를 사용한다. 별도의 quizzes 읽기가 필요 없다.
    const correctKeys = Array.isArray(questionMeta.correctKeys) ? questionMeta.correctKeys : [];
    const selectedSet = new Set(selectedOptionKeys);
    const isCorrect = selectedSet.size === correctKeys.length && correctKeys.every((key) => selectedSet.has(key));
    const scoreDelta = isCorrect ? 100 : 0;
    const participant = getBattleParticipantData(battleData, uid);
    const nextAnsweredCount = Number(participant.answeredCount || 0) + 1;
    const nextCorrectCount = Number(participant.correctCount || 0) + (isCorrect ? 1 : 0);
    const nextScore = Number(participant.score || 0) + scoreDelta;

    transaction.set(answerRef, {
      uid,
      battleId,
      questionId,
      selectedOptionKeys,
      isCorrect,
      scoreDelta,
      battleOrder: questionMeta.battleOrder || 0,
      submittedAt: FieldValue.serverTimestamp(),
      submittedAtMs: nowMs,
    });
    transaction.update(battleRef, {
      [`participants.${uid}.answeredCount`]: nextAnsweredCount,
      [`participants.${uid}.correctCount`]: nextCorrectCount,
      [`participants.${uid}.score`]: nextScore,
      [`participants.${uid}.lastAnsweredAtMs`]: nowMs,
      updatedAt: FieldValue.serverTimestamp(),
    });

    answerResult = {
      alreadySubmitted: false,
      isCorrect,
      scoreDelta,
      answeredCount: nextAnsweredCount,
      correctCount: nextCorrectCount,
      score: nextScore,
      shouldFinalize: (battleData.participantUids || []).every((participantUid) => {
        const count = participantUid === uid
          ? nextAnsweredCount
          : Number(battleData.participants?.[participantUid]?.answeredCount || 0);
        return count >= Number(battleData.questionCount || questionSet.length || 0);
      }),
    };
  });

  if (answerResult?.shouldFinalize) {
    // 답안 응답을 막지 않도록 정산은 비동기로 처리한다.
    // 결과는 battle 문서의 onSnapshot이 status==='finished'로 반영하므로
    // 클라이언트가 이 호출의 결과를 기다릴 필요가 없다.
    // finalizeQuizBattleInternal은 멱등이며 finalizeQuizBattle callable이
    // fallback으로 존재하므로, 드물게 실패해도 복구 가능하다.
    finalizeQuizBattleInternal(battleId, "completed").catch((err) => {
      console.error("Battle finalize after answer failed", err);
    });
  }

  return answerResult;
});

exports.reportQuizBattleIntegrityEvent = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const battleId = cleanId(data?.battleId);
  const eventType = ["visibility_hidden", "window_blur", "fullscreen_exit"].includes(data?.eventType)
    ? data.eventType
    : "focus_lost";
  if (!battleId) {
    throw new functions.https.HttpsError("invalid-argument", "배틀 정보가 올바르지 않습니다.");
  }

  const db = admin.firestore();
  const battleRef = db.collection("quizBattles").doc(battleId);
  const nowMs = Date.now();
  let violationCount = 0;
  let forfeited = false;

  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(battleRef);
    if (!snap.exists) {
      throw new functions.https.HttpsError("not-found", "배틀을 찾을 수 없습니다.");
    }
    const battleData = snap.data() || {};
    if (battleData.status !== "active") return;
    if (!Array.isArray(battleData.participantUids) || !battleData.participantUids.includes(uid)) {
      throw new functions.https.HttpsError("permission-denied", "배틀 참가자만 이탈 상태를 기록할 수 있습니다.");
    }

    const participant = battleData.participants?.[uid] || {};
    const previousMs = Number(participant.lastIntegrityEventAtMs || 0);
    violationCount = Number(participant.integrityViolationCount || 0);
    // visibilitychange와 blur가 한 번의 이탈에서 함께 발생하는 중복 이벤트를 합친다.
    if (nowMs - previousMs < 3000) return;

    violationCount += 1;
    forfeited = violationCount >= 3;
    const updates = {
      [`participants.${uid}.integrityViolationCount`]: violationCount,
      [`participants.${uid}.lastIntegrityEventType`]: eventType,
      [`participants.${uid}.lastIntegrityEventAtMs`]: nowMs,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (forfeited) {
      updates[`participants.${uid}.forfeited`] = true;
      updates[`participants.${uid}.forfeitedAt`] = FieldValue.serverTimestamp();
      updates[`participants.${uid}.forfeitedAtMs`] = nowMs;
      updates[`participants.${uid}.forfeitReason`] = "focus_integrity";
    }
    transaction.update(battleRef, updates);
  });

  if (forfeited) {
    await finalizeQuizBattleInternal(battleId, "integrity_forfeit");
  }
  return { success: true, violationCount, forfeited };
});

exports.finalizeQuizBattle = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const battleId = cleanId(data?.battleId);
  if (!battleId) {
    throw new functions.https.HttpsError("invalid-argument", "배틀 정보가 올바르지 않습니다.");
  }

  const battleSnap = await admin.firestore().collection("quizBattles").doc(battleId).get();
  if (!battleSnap.exists) {
    throw new functions.https.HttpsError("not-found", "배틀을 찾을 수 없습니다.");
  }
  const battleData = battleSnap.data() || {};
  if (!Array.isArray(battleData.participantUids) || !battleData.participantUids.includes(uid)) {
    throw new functions.https.HttpsError("permission-denied", "배틀 참가자만 종료할 수 있습니다.");
  }

  const result = await finalizeQuizBattleInternal(battleId, "requested");
  return { success: true, ...result };
});

exports.confirmQuizBattleEntry = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const battleId = cleanId(data?.battleId);
  if (!battleId) {
    throw new functions.https.HttpsError("invalid-argument", "배틀 정보가 올바르지 않습니다.");
  }

  return confirmQuizBattleEntryInternal(battleId, uid);
});

exports.forfeitQuizBattle = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const battleId = cleanId(data?.battleId);
  if (!battleId) {
    throw new functions.https.HttpsError("invalid-argument", "배틀 정보가 올바르지 않습니다.");
  }

  return forfeitQuizBattleForUid(battleId, uid);
});

exports.sweepExpiredQuizBattles = regionalFunctions.pubsub
  .schedule("every 1 minutes")
  .timeZone("Asia/Seoul")
  .onRun(async () => {
    const db = admin.firestore();
    const nowMs = Date.now();
    const snap = await db.collection("quizBattles")
      .where("status", "==", "active")
      .where("endsAtMs", "<=", nowMs)
      .orderBy("endsAtMs", "asc")
      .limit(100)
      .get();

    if (snap.empty) return null;

    await Promise.all(snap.docs.map(async (docSnap) => {
      try {
        await finalizeQuizBattleInternal(docSnap.id, "timeout");
      } catch (err) {
        console.warn("Expired quiz battle finalize failed", docSnap.id, err);
      }
    }));

    return null;
  });

exports.sweepUnconfirmedQuizBattles = regionalFunctions.pubsub
  .schedule("every 1 minutes")
  .timeZone("Asia/Seoul")
  .onRun(async () => {
    const db = admin.firestore();
    const nowMs = Date.now();
    const snap = await db.collection("quizBattles")
      .where("status", "==", "starting")
      .where("entryConfirmDeadlineMs", "<=", nowMs)
      .orderBy("entryConfirmDeadlineMs", "asc")
      .limit(100)
      .get();

    if (snap.empty) return null;

    await Promise.all(snap.docs.map(async (docSnap) => {
      try {
        await cancelStartingQuizBattleInternal(docSnap.id, "entry_confirm_timeout");
      } catch (err) {
        console.warn("Unconfirmed quiz battle cancel failed", docSnap.id, err);
      }
    }));

    return null;
  });

exports.sweepUnsyncedQuizBattleWrongAnswers = regionalFunctions.pubsub
  .schedule("every 5 minutes")
  .timeZone("Asia/Seoul")
  .onRun(async () => {
    const db = admin.firestore();
    const snap = await db.collection("quizBattles")
      .where("status", "==", "finished")
      .where("wrongAnswersSyncedAt", "==", null)
      .limit(100)
      .get();

    if (snap.empty) return null;

    await Promise.all(snap.docs.map(async (docSnap) => {
      try {
        await syncBattleWrongAnswersIfNeeded(docSnap.id, "sweep");
      } catch (err) {
        console.warn("Unsynced quiz battle wrong answer sync failed", docSnap.id, err);
      }
    }));

    return null;
  });

// 배틀 통계 동기화가 누락된 finished 배틀을 재처리한다.
exports.sweepUnsyncedQuizBattleStats = regionalFunctions.pubsub
  .schedule("every 5 minutes")
  .timeZone("Asia/Seoul")
  .onRun(async () => {
    const db = admin.firestore();
    const snap = await db.collection("quizBattles")
      .where("status", "==", "finished")
      .where("battleStatsSyncedAt", "==", null)
      .limit(100)
      .get();

    if (snap.empty) return null;

    await Promise.all(snap.docs.map(async (docSnap) => {
      try {
        await syncBattleStatsIfNeeded(docSnap.id, "sweep");
      } catch (err) {
        console.warn("Unsynced quiz battle stats sync failed", docSnap.id, err);
      }
    }));

    return null;
  });

// 관리자 전용: 기존 배틀 history에서 summary/regions/opponents/battleRating을 역산(backfill)한다.
// 보상/광석은 절대 재지급하지 않는다. increment가 아닌 set(overwrite) 방식만 사용한다.
// 옵션: { dryRun?: boolean, uid?: string (단일 사용자 제한), limit?: number }
exports.backfillQuizBattleStats = regionalFunctions.https.onCall(async (data, context) => {
  const adminUid = await requireAdminUid(context);
  const dryRun = data?.dryRun === true;
  const targetUid = cleanId(data?.uid, 200);
  const userLimit = Number(data?.limit) > 0 ? Math.min(Number(data.limit), 500) : 200;

  console.log(`[backfillQuizBattleStats] admin=${adminUid} dryRun=${dryRun} targetUid=${targetUid || "all"} limit=${userLimit}`);

  const db = admin.firestore();

  // 대상 사용자 목록 구성.
  // uid가 지정되면 해당 사용자 doc을 직접 읽어 limit에 걸리지 않게 한다.
  let targetUids = [];
  if (targetUid) {
    const directSnap = await db.collection("users").doc(targetUid).get();
    if (directSnap.exists) {
      const role = directSnap.get("role");
      if (role !== "admin" && role !== "developer" && role !== "teacher") {
        targetUids = [targetUid];
      } else {
        return { success: false, error: "지정한 uid는 admin/developer/teacher 계정입니다." };
      }
    } else {
      return { success: false, error: "지정한 uid를 찾을 수 없습니다." };
    }
  } else {
    const userSnap = await db.collection("users").limit(userLimit).get();
    targetUids = userSnap.docs
      .filter((d) => {
        const role = d.get("role");
        return role !== "admin" && role !== "developer" && role !== "teacher";
      })
      .map((d) => d.id);
  }

  const report = { dryRun, processedUsers: 0, skippedUsers: 0, totalBattles: 0, perUser: [] };

  for (const uid of targetUids) {
    // 사용자의 모든 quiz_battle history를 시간순으로 가져온다.
    const historySnap = await db.collection("users").doc(uid).collection("history")
      .where("type", "==", "quiz_battle")
      .orderBy("timestamp", "asc")
      .get();

    if (historySnap.empty) {
      report.skippedUsers += 1;
      continue;
    }

    const allBattles = historySnap.docs.map((d) => d.data());
    const isAIHistory = (battle) => battle.isAIBattle === true || battle.opponentType === "ai";
    const battles = allBattles.filter((battle) => (
      !isAIHistory(battle) && battle.competitiveEligible !== false
    ));
    const aiDailyCounts = {};
    const aiTrainingBattles = allBattles.filter((battle) => {
      if (!isAIHistory(battle) || battle.aiTrainingEligible === false) return false;
      const date = battle.timestamp?.toDate?.();
      const dateKey = date instanceof Date ? getBattleKstDateKey(date.getTime()) : "legacy";
      const count = Number(aiDailyCounts[dateKey] || 0);
      if (count >= QUIZ_BATTLE_DAILY_OPPONENT_LIMIT) return false;
      aiDailyCounts[dateKey] = count + 1;
      return true;
    });
    const aiTrainingStats = aiTrainingBattles.reduce((acc, battle) => {
      const total = Number(battle.totalCount || 0);
      const correct = Number(battle.correctCount || 0);
      const answered = Math.max(Number(battle.answeredCount || 0), correct);
      acc.matches += 1;
      acc.completedMatches += total > 0 && answered >= total ? 1 : 0;
      acc.correct += correct;
      acc.answered += answered;
      return acc;
    }, { matches: 0, completedMatches: 0, correct: 0, answered: 0 });
    report.totalBattles += allBattles.length;

    // summary 재구성 (set 방식)
    const summary = {
      totalMatches: battles.length,
      wins: 0,
      losses: 0,
      draws: 0,
      totalCorrect: 0,
      totalAnswered: 0,
      totalScore: 0,
      completionCount: 0,
      forfeitCount: 0,
      perfectWins: 0,
      currentStreak: 0,
      bestStreak: 0,
      lastBattleAt: null,
    };
    const regionsMap = {}; // { regionId: {...} }
    const opponentsMap = {}; // { opponentUid: {...} }

    // streak 재계산을 위해 시간순 재생
    let currentStreak = 0;
    let bestStreak = 0;
    battles.forEach((b) => {
      const result = b.battleResult;
      const isWin = result === "win";
      const isDraw = result === "draw";
      const isLoss = result === "loss";
      const correct = Number(b.correctCount || 0);
      const answered = Math.max(
        Number(b.answeredCount || 0),
        Number(b.totalCount || 0),
        Number(b.correctCount || 0)
      );
      const total = Number(b.totalCount || 0);
      const score = Number(b.score || 0);
      const isComplete = total > 0 && answered >= total;
      const isForfeit = b.forfeited === true;
      const isPerfectWin = isWin && total > 0 && correct >= total;

      if (isWin) summary.wins += 1;
      else if (isDraw) summary.draws += 1;
      else summary.losses += 1;
      summary.totalCorrect += correct;
      summary.totalAnswered += answered;
      summary.totalScore += score;
      if (isComplete) summary.completionCount += 1;
      if (isForfeit) summary.forfeitCount += 1;
      if (isPerfectWin) summary.perfectWins += 1;

      // streak
      if (isWin) {
        currentStreak += 1;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }

      // region 집계
      const regionId = b.regionId || "";
      const ts = b.timestamp;
      const tsMs = ts && typeof ts.toMillis === "function" ? ts.toMillis() : 0;
      if (regionId) {
        if (!regionsMap[regionId]) {
          regionsMap[regionId] = {
            regionId,
            regionTitle: b.regionTitle || "",
            matches: 0, wins: 0, losses: 0, draws: 0,
            correctCount: 0, answeredCount: 0, totalScore: 0,
            lastBattleAt: null, lastBattleId: b.battleId || "",
            _lastBattleMs: 0,
          };
        }
        const r = regionsMap[regionId];
        r.matches += 1;
        if (isWin) r.wins += 1;
        else if (isDraw) r.draws += 1;
        else r.losses += 1;
        r.correctCount += correct;
        r.answeredCount += answered;
        r.totalScore += score;
        r.lastBattleId = b.battleId || r.lastBattleId;
        // 각 region별 마지막 배틀 시간을 정확히 추적한다.
        if (tsMs > r._lastBattleMs) {
          r._lastBattleMs = tsMs;
          r.lastBattleAt = ts;
        }
      }

      // opponent 집계
      const oppUid = b.opponentUid || "";
      if (oppUid) {
        if (!opponentsMap[oppUid]) {
          opponentsMap[oppUid] = {
            opponentUid: oppUid,
            opponentDisplayName: b.opponentDisplayName || "",
            matches: 0, wins: 0, losses: 0, draws: 0,
            lastBattleId: b.battleId || "",
            lastBattleAt: null,
            _lastBattleMs: 0,
          };
        }
        const o = opponentsMap[oppUid];
        o.matches += 1;
        if (isWin) o.wins += 1;
        else if (isDraw) o.draws += 1;
        else o.losses += 1;
        o.lastBattleId = b.battleId || o.lastBattleId;
        if (b.opponentDisplayName) o.opponentDisplayName = b.opponentDisplayName;
        // 각 opponent별 마지막 배틀 시간을 정확히 추적한다.
        if (tsMs > o._lastBattleMs) {
          o._lastBattleMs = tsMs;
          o.lastBattleAt = ts;
        }
      }

      // summary 마지막 배틀 시간
      const currentLastMs = summary.lastBattleAt && typeof summary.lastBattleAt.toMillis === "function"
        ? summary.lastBattleAt.toMillis() : 0;
      if (tsMs > 0 && tsMs > currentLastMs) {
        summary.lastBattleAt = ts;
      }
    });

    summary.currentStreak = currentStreak;
    summary.bestStreak = bestStreak;
    summary.backfilledAt = FieldValue.serverTimestamp();

    // _lastBattleMs 임시 필드 제거 (Firestore에 저장하지 않음)
    Object.values(regionsMap).forEach((r) => { delete r._lastBattleMs; });
    Object.values(opponentsMap).forEach((o) => { delete o._lastBattleMs; });

    // battleRating 계산
    const recentMatches = await countRecentBattleMatches(db, uid);
    const battleRating = calculateBattleRating(summary, { recentMatches });

    report.perUser.push({
      uid,
      battles: battles.length,
      aiTrainingBattles: aiTrainingStats.matches,
      rating: battleRating,
      wins: summary.wins, losses: summary.losses, draws: summary.draws,
      regions: Object.keys(regionsMap).length,
      opponents: Object.keys(opponentsMap).length,
    });

    if (dryRun) {
      report.processedUsers += 1;
      continue;
    }

    // 실제 쓰기: 기존 regions/opponents를 모두 삭제한 후 재생성(진짜 overwrite)한다.
    const userRef = db.collection("users").doc(uid);
    const regionsColRef = userRef.collection("battleStats").doc("regions").collection("rankings");
    const opponentsColRef = userRef.collection("battleStats").doc("opponents").collection("entries");

    const [existingRegions, existingOpponents] = await Promise.all([
      regionsColRef.get(),
      opponentsColRef.get(),
    ]);

    const batch = db.batch();

    // 기존 regions/opponents 문서 삭제 (stale 방지)
    existingRegions.forEach((d) => batch.delete(d.ref));
    existingOpponents.forEach((d) => batch.delete(d.ref));

    // summary overwrite
    batch.set(userRef.collection("battleStats").doc("summary"), summary, { merge: true });

    // regions 재생성
    Object.entries(regionsMap).forEach(([regionId, regionStats]) => {
      batch.set(regionsColRef.doc(regionId), regionStats, { merge: true });
    });

    // opponents 재생성
    Object.entries(opponentsMap).forEach(([oppUid, oppStats]) => {
      batch.set(opponentsColRef.doc(oppUid), oppStats, { merge: true });
    });

    await batch.commit();

    // 루트에 battleRating + streak + 파생 카운터 반영 (winRate는 계획 합의대로 저장하지 않는다)
    await userRef.set({
      battleRating,
      battleBestStreak: summary.bestStreak || 0,
      battleCurrentStreak: summary.currentStreak || 0,
      battleStatsSyncedAt: FieldValue.serverTimestamp(),
      totalBattleMatches: summary.totalMatches,
      totalBattleWins: summary.wins,
      totalBattleLosses: summary.losses,
      totalBattleDraws: summary.draws,
      aiBattleMatches: aiTrainingStats.matches,
      aiBattleCompletedMatches: aiTrainingStats.completedMatches,
      aiBattleCorrect: aiTrainingStats.correct,
      aiBattleAnswered: aiTrainingStats.answered,
    }, { merge: true });

    report.processedUsers += 1;
  }

  console.log(`[backfillQuizBattleStats] completed: ${JSON.stringify({ processed: report.processedUsers, skipped: report.skippedUsers, battles: report.totalBattles })}`);
  return { success: true, report };
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
  const referralToken = cleanText(data?.referralToken, 200);

  if (!applicantName || parentPhone.length < 10 || !studentName || !grade) {
    throw new functions.https.HttpsError("invalid-argument", "필수 정보를 확인해 주세요.");
  }

  const referralInvite = referralToken ? await referralBilling.resolveInvite(referralToken) : null;
  if (referralToken && !referralInvite) {
    throw new functions.https.HttpsError("invalid-argument", "만료된 추천 링크가 압니다.");
  }
  let referralAttribution = referralInvite;
  if (!referralAttribution && referrerParentPhone) {
    const legacyParentSnap = await admin.firestore().collection("parents")
      .where("phone", "==", referrerParentPhone).limit(1).get();
    if (!legacyParentSnap.empty && legacyParentSnap.docs[0].data()?.isDeleted !== true) {
      referralAttribution = {
        id: `legacy_parent_${legacyParentSnap.docs[0].id}`,
        referrerParentUid: legacyParentSnap.docs[0].id,
        referrerStudentUid: null,
        source: "legacy_manual",
        crewId: null,
      };
    }
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
    referralInviteId: referralAttribution?.id || null,
    referralSource: referralAttribution?.source || (referredStudentName || referrerParentPhone ? "legacy_manual_unmatched" : null),
    referrerParentUid: referralAttribution?.referrerParentUid || null,
    referrerStudentUid: referralAttribution?.referrerStudentUid || null,
    referralStatus: referralAttribution ? "applied" : null,
    oneMonthReferralTrial: Boolean(referralAttribution || referredStudentName || referrerParentPhone),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    source: "public_site",
  };

  const db = admin.firestore();
  const ref = db.collection("applications").doc();
  const referralId = referralAttribution ? `application_${ref.id}` : null;
  const batch = db.batch();
  batch.set(ref, { ...payload, referralId });
  if (referralAttribution) {
    batch.set(db.collection("referrals").doc(referralId), {
      applicationId: ref.id,
      inviteId: referralAttribution.id,
      referrerParentUid: referralAttribution.referrerParentUid,
      referrerStudentUid: referralAttribution.referrerStudentUid || null,
      source: referralAttribution.source,
      crewId: referralAttribution.crewId || null,
      applicantStudentName: studentName,
      referredStudentName: studentName,
      referredParentUid: null,
      referredStudentUid: null,
      status: "applied",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  return { success: true, id: ref.id };
});

// 여름방학 특강 과정 카탈로그. courseId는 이 키와 일치해야 한다.
const VACATION_CAMP_COURSES = {
  multiplication: "곱셈",
  division: "나눗셈",
  fraction: "분수",
  decimal: "소수",
  ratio: "비와 비례식",
};

exports.getVacationCampCounts = regionalFunctions.https.onCall(async () => {
  const snap = await admin.firestore().collection("vacationCampApplications").get();
  const counts = {};
  Object.keys(VACATION_CAMP_COURSES).forEach((id) => { counts[id] = 0; });
  snap.forEach((doc) => {
    const courseId = doc.get("courseId");
    if (typeof courseId === "string" && Object.prototype.hasOwnProperty.call(counts, courseId)) {
      counts[courseId] += 1;
    }
  });
  return { success: true, counts };
});

exports.submitVacationCampApplication = regionalFunctions.https.onCall(async (data) => {
  const applicantName = cleanText(data?.applicantName, 80);
  const parentPhone = digitsOnly(data?.parentPhone, 16);
  const studentName = cleanText(data?.studentName, 80);
  const grade = cleanText(data?.grade, 30);
  const courseId = cleanText(data?.courseId, 40);
  const message = cleanText(data?.message, 1000);
  const overwrite = data?.overwrite === true;

  if (!applicantName || parentPhone.length < 10 || !studentName || !grade) {
    throw new functions.https.HttpsError("invalid-argument", "필수 정보를 확인해 주세요.");
  }
  const courseName = VACATION_CAMP_COURSES[courseId];
  if (!courseName) {
    throw new functions.https.HttpsError("invalid-argument", "유효하지 않은 과정입니다.");
  }

  const db = admin.firestore();
  const collection = db.collection("vacationCampApplications");

  // 학부모 연락처 기준 중복 확인 (1인 1과목)
  const dupSnap = await collection.where("parentPhone", "==", parentPhone).limit(1).get();
  if (!dupSnap.empty) {
    const existing = dupSnap.docs[0];
    if (!overwrite) {
      const existingCourseId = existing.get("courseId") || "";
      return {
        success: false,
        error: "duplicate",
        existingCourse: VACATION_CAMP_COURSES[existingCourseId] || existingCourseId,
        newCourse: courseName,
      };
    }
    // 덮어쓰기: 기존 문서를 갱신하고 카운트를 다시 센다
    await existing.ref.set({
      courseId,
      courseName,
      applicantName,
      parentPhone,
      studentName,
      grade,
      message,
      status: "new",
      updatedAt: FieldValue.serverTimestamp(),
      source: "vacation_site",
    }, { merge: true });

    const allSnap = await collection.get();
    const count = allSnap.docs.filter((d) => d.get("courseId") === courseId).length;
    return { success: true, id: existing.id, courseId, courseName, count };
  }

  // 신규 저장
  const ref = await collection.add({
    courseId,
    courseName,
    applicantName,
    parentPhone,
    studentName,
    grade,
    message,
    status: "new",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    source: "vacation_site",
  });

  const allSnap = await collection.get();
  const count = allSnap.docs.filter((d) => d.get("courseId") === courseId).length;
  return { success: true, id: ref.id, courseId, courseName, count };
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

  return {
    success: true,
    childUid: createdUser.uid,
    loginId,
    studentName,
  };
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
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
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

exports.notifyAssignmentShareCommentCreated = regionalFunctions.firestore
  .document("assignmentShares/{shareId}/comments/{commentId}")
  .onCreate(async (snap, context) => {
    const comment = snap.data() || {};
    const shareId = context.params.shareId;
    const commentId = context.params.commentId;
    const commenterId = comment.userId || "";
    const commenterName = String(comment.userName || "탐험가").trim() || "탐험가";
    const content = String(comment.content || "").trim();

    if (!shareId || !commentId || !commenterId) return null;

    const db = admin.firestore();
    const shareRef = db.collection("assignmentShares").doc(shareId);
    const shareSnap = await shareRef.get();
    if (!shareSnap.exists) return null;

    const share = shareSnap.data() || {};
    const ownerId = share.ownerId;
    if (!ownerId || ownerId === commenterId) return null;

    const shareKindLabel = share.kind === "comfort" ? "위로 요청" : "기록 공개";
    const commentPreview = content ? ` “${content.slice(0, 40)}${content.length > 40 ? "…" : ""}”` : "";

    await db.collection("notifications").doc(`assignment_share_comment_${shareId}_${commentId}`).set({
      recipientId: ownerId,
      type: "assignment_share_comment",
      message: `${commenterName}님이 ${shareKindLabel}에 댓글을 남겼습니다.${commentPreview}`,
      link: `/agora?filter=archive&highlight=${shareId}`,
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
      metadata: {
        shareId,
        commentId,
        commenterId,
        commenterName,
        assignmentId: share.assignment?.assignmentId || "",
        kind: share.kind || "archive",
      },
    }, { merge: true });

    return null;
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
    studyRoomCapacity: crewData.studyRoomCapacity || 0,
    googleMeetUrl: crewData.googleMeetUrl || '',
    googleMeetUpdatedAt: crewData.googleMeetUpdatedAt || null,
    googleMeetUpdatedBy: crewData.googleMeetUpdatedBy || '',
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

function isFutureTimestamp(value, nowMs = Date.now()) {
  return Number(value?.toMillis?.() || 0) > nowMs;
}

async function requireAdminUid(context) {
  const uid = await requireAuthUid(context);
  const adminDoc = await admin.firestore().collection("users").doc(uid).get();
  if (!adminDoc.exists || adminDoc.data().role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "관리자 권한이 없습니다.");
  }
  return uid;
}

function getGlmApiKey() {
  return process.env.GLM_API_KEY || "";
}

function normalizeGlmMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 20) {
    throw new functions.https.HttpsError("invalid-argument", "GLM 메시지 형식이 올바르지 않습니다.");
  }

  return messages.map((message) => {
    const role = String(message?.role || "").trim();
    const content = String(message?.content || "");
    if (!["system", "user", "assistant"].includes(role) || !content.trim()) {
      throw new functions.https.HttpsError("invalid-argument", "GLM 메시지 역할 또는 내용이 올바르지 않습니다.");
    }
    if (content.length > 200000) {
      throw new functions.https.HttpsError("invalid-argument", "GLM 메시지가 너무 깁니다.");
    }
    return { role, content };
  });
}

exports.callGlmChat = regionalFunctions
  .runWith({ timeoutSeconds: 120, memory: "512MB", secrets: ["GLM_API_KEY"] })
  .https.onCall(async (data, context) => {
    await requireAdminUid(context);

    const apiKey = getGlmApiKey();
    if (!apiKey) {
      throw new functions.https.HttpsError("failed-precondition", "GLM API 키가 서버에 설정되어 있지 않습니다.");
    }

    const options = data?.options || {};
    const model = String(options.model || "glm-5.1").slice(0, 80);
    const body = {
      model,
      messages: normalizeGlmMessages(data?.messages),
      thinking: { type: "disabled" },
    };
    if (options.json === true) body.response_format = { type: "json_object" };
    if (Number.isFinite(Number(options.maxTokens)) && Number(options.maxTokens) > 0) {
      body.max_tokens = Math.min(Math.floor(Number(options.maxTokens)), 8192);
    }

    let response;
    let responseText = "";
    try {
      response = await fetch("https://open.bigmodel.cn/api/coding/paas/v4/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
      responseText = await response.text();
    } catch (error) {
      console.error("callGlmChat network error:", error);
      throw new functions.https.HttpsError("unavailable", "GLM API 호출에 실패했습니다.");
    }

    if (!response.ok) {
      console.error("callGlmChat API error:", response.status, responseText.slice(0, 500));
      const status = response.status;
      const detail = responseText.slice(0, 500);
      // 429(과다 요청)는 BigModel 서버 측 일시적 과부하이므로 "잠시 후 재시도" 안내로 구분한다.
      if (status === 429) {
        throw new functions.https.HttpsError(
          "resource-exhausted",
          `AI 서버가 일시적으로 혼잡해 응답하지 못했습니다(429). ${detail}`
        );
      }
      throw new functions.https.HttpsError(
        "internal",
        `GLM API 오류(HTTP ${status}): ${detail}`
      );
    }

    let payload;
    try {
      payload = JSON.parse(responseText);
    } catch (error) {
      console.error("callGlmChat JSON parse error:", error);
      throw new functions.https.HttpsError("internal", "GLM API 응답을 해석하지 못했습니다.");
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (!content) {
      throw new functions.https.HttpsError("internal", "GLM 응답에 message.content가 없습니다.");
    }
    return { content, model, provider: "glm" };
  });

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
  const answerCount = answersSnap.docs.filter((answerDoc) => !answerDoc.data().parentAnswerId).length;
  await questionRef.set({
    answerCount,
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
    await deleteQueryDocs(db.collection("referrals").where("referrerStudentUid", "==", uid), stats, "referralsDeleted");
    await deleteQueryDocs(db.collection("referrals").where("referredStudentUid", "==", uid), stats, "referralsDeleted");
    await deleteQueryDocs(db.collection("referralInvites").where("referrerStudentUid", "==", uid), stats, "referralInvitesDeleted");
    const enrollmentRef = db.collection("studentEnrollments").doc(uid);
    const enrollmentSnap = await enrollmentRef.get();
    if (enrollmentSnap.exists) {
      await enrollmentRef.delete();
      stats.studentEnrollmentDeleted = 1;
    }

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

  await deleteQueryDocs(db.collection("familyBillingStatements").where("parentUid", "==", parentUid), stats, "familyBillingStatementsDeleted");
  await deleteQueryDocs(db.collection("referrals").where("referrerParentUid", "==", parentUid), stats, "referralsDeleted");
  await deleteQueryDocs(db.collection("referrals").where("referredParentUid", "==", parentUid), stats, "referralsDeleted");
  await deleteQueryDocs(db.collection("referralInvites").where("referrerParentUid", "==", parentUid), stats, "referralInvitesDeleted");
  const billingAccountRef = db.collection("familyBillingAccounts").doc(parentUid);
  const billingAccountSnap = await billingAccountRef.get();
  if (billingAccountSnap.exists) {
    await billingAccountRef.delete();
    stats.familyBillingAccountDeleted = 1;
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

const STUDY_CREW_MISSION_MAX_LENGTH = 60;
const STUDY_CREW_MISSION_INDIVIDUAL_REWARD = 5;
const STUDY_CREW_MISSION_TEAM_REWARD = 20;
const STUDY_CREW_MISSION_INDIVIDUAL_DAILY_LIMIT = 1;
const STUDY_CREW_MISSION_TEAM_DAILY_LIMIT = 2;
const STUDY_CREW_DAILY_MISSIONS = [
  { id: "life_movie_quote", category: "아이스브레이킹", title: "인생 영화 명대사", prompt: "나의 인생 영화 속 명대사 하나를 적어보세요." },
  { id: "million_won_first_buy", category: "아이스브레이킹", title: "100만 원이 생긴다면", prompt: "지금 당장 100만 원이 생긴다면 가장 먼저 사고 싶은 것을 적어보세요." },
  { id: "favorite_season", category: "아이스브레이킹", title: "좋아하는 계절", prompt: "내가 가장 좋아하는 계절과 그 이유를 짧게 적어보세요." },
  { id: "tiny_talent", category: "아이스브레이킹", title: "사소한 특기", prompt: "남들은 잘 모르는 나만의 아주 사소한 특기를 알려주세요." },
  { id: "phone_wallpaper_mood", category: "아이스브레이킹", title: "배경화면 분위기", prompt: "현재 내 핸드폰 배경화면의 분위기를 말해보세요. 개인사진 설명은 피해주세요." },
  { id: "funniest_meme", category: "아이스브레이킹", title: "최근 웃긴 밈", prompt: "최근에 가장 웃겼던 밈이나 짤을 간단히 설명해보세요." },
  { id: "never_buy_food", category: "아이스브레이킹", title: "절대 안 사 먹는 음식", prompt: "내가 돈 주고는 절대 사 먹지 않는 음식 한 가지를 적어보세요." },
  { id: "morning_first_action", category: "아이스브레이킹", title: "아침 첫 행동", prompt: "아침에 눈 떠서 가장 먼저 하는 행동을 적어보세요." },
  { id: "satisfying_purchase", category: "아이스브레이킹", title: "만족 소비", prompt: "최근에 돈을 쓰고 가장 만족했던 소비를 적어보세요." },
  { id: "three_hashtags", category: "아이스브레이킹", title: "나를 표현하는 해시태그", prompt: "나를 표현하는 해시태그 3가지를 적어보세요." },
  { id: "desert_island_three", category: "아이스브레이킹", title: "무인도 3가지", prompt: "무인도에 떨어졌을 때 꼭 가져갈 딱 3가지 아이템을 골라보세요." },
  { id: "life_bgm", category: "아이스브레이킹", title: "내 인생의 BGM", prompt: "내 인생의 BGM을 하나 고른다면 어떤 곡일지 적어보세요." },
  { id: "ramen_recipe", category: "아이스브레이킹", title: "라면 조리법", prompt: "가장 좋아하는 라면 조리법을 짧게 소개해보세요." },
  { id: "childhood_dream", category: "아이스브레이킹", title: "어릴 적 장래희망", prompt: "어릴 적 나의 장래희망은 무엇이었나요?" },
  { id: "lottery_first_tell", category: "아이스브레이킹", title: "복권 1등 소식", prompt: "복권 1등에 당첨된다면 누구에게 가장 먼저 알릴지 적어보세요." },
  { id: "favorite_time_of_day", category: "아이스브레이킹", title: "좋아하는 시간대", prompt: "하루 중 내가 가장 좋아하는 시간대는 언제인가요?" },
  { id: "sweet_sour_pork", category: "아이스브레이킹", title: "탕수육 취향", prompt: "탕수육은 부먹, 찍먹, 아니면 다른 방법인지 적어보세요." },
  { id: "stress_playlist", category: "아이스브레이킹", title: "스트레스 해소곡", prompt: "나만의 스트레스 해소용 플레이리스트 첫 번째 곡을 적어보세요." },
  { id: "recent_youtube", category: "아이스브레이킹", title: "최근 유튜브 추천", prompt: "최근 본 유튜브 영상 중 유익했거나 재밌었던 것을 소개해보세요." },
  { id: "daily_ready_routine", category: "아이스브레이킹", title: "하루 시작 루틴", prompt: "하루를 시작할 때 꼭 하는 준비 루틴 하나를 적어보세요." },
  { id: "weather_mood", category: "정서 공유", title: "오늘 기분 날씨", prompt: "오늘 아침 일어났을 때의 기분을 날씨로 표현해보세요." },
  { id: "recent_big_laugh", category: "정서 공유", title: "크게 웃었던 일", prompt: "최근 나를 가장 크게 웃게 했던 일을 짧게 적어보세요." },
  { id: "mind_thought", category: "정서 공유", title: "요즘 머릿속 생각", prompt: "요즘 나의 머릿속을 가장 많이 차지하는 생각을 적어보세요." },
  { id: "self_praise", category: "정서 공유", title: "나에게 칭찬", prompt: "나 자신에게 해주고 싶은 칭찬 한마디를 남겨보세요." },
  { id: "today_expected_moment", category: "정서 공유", title: "기대되는 순간", prompt: "오늘 하루 중 가장 기대되는 순간을 적어보세요." },
  { id: "touching_moment", category: "정서 공유", title: "뭉클했던 순간", prompt: "최근에 뭉클했거나 마음이 움직였던 순간을 적어보세요." },
  { id: "calm_sentence", category: "멘탈 케어", title: "마법의 문장", prompt: "마음이 불안할 때 나를 진정시키는 문장 하나를 적어보세요." },
  { id: "comfort_words", category: "멘탈 케어", title: "위로받는 말", prompt: "내가 가장 위로받는다고 느끼는 행동이나 말을 적어보세요." },
  { id: "energy_score", category: "정서 공유", title: "오늘 에너지 점수", prompt: "오늘 나의 에너지를 1에서 100까지 숫자로 표현해보세요." },
  { id: "thankful_person", category: "정서 공유", title: "고마웠던 사람", prompt: "요 며칠 사이 가장 고마웠던 사람과 그 이유를 짧게 적어보세요." },
  { id: "current_fear", category: "멘탈 케어", title: "가로막는 두려움", prompt: "현재 나를 가로막고 있다고 느껴지는 두려움 하나를 적어보세요." },
  { id: "comfort_scent", category: "정서 공유", title: "편안한 향기", prompt: "나를 가장 편안하게 만드는 냄새나 향기를 적어보세요." },
  { id: "burnout_recovery", category: "멘탈 케어", title: "번아웃 극복법", prompt: "번아웃이 왔을 때 나만의 극복 방법을 적어보세요." },
  { id: "end_day_feeling", category: "정서 공유", title: "하루 끝 감정", prompt: "오늘 하루를 끝내고 느끼고 싶은 감정을 적어보세요." },
  { id: "anger_calm_routine", category: "멘탈 케어", title: "마음 진정 루틴", prompt: "화가 났을 때 마음을 가라앉히는 나만의 루틴을 적어보세요." },
  { id: "warm_words_needed", category: "멘탈 케어", title: "듣고 싶은 말", prompt: "지금 당장 누군가에게 듣고 싶은 따뜻한 말 한마디를 적어보세요." },
  { id: "relieved_moment", category: "정서 공유", title: "안도했던 순간", prompt: "요 근래 가장 크게 안도했던 순간을 적어보세요." },
  { id: "exciting_word", category: "정서 공유", title: "설레는 단어", prompt: "나를 가장 설레게 만드는 단어 하나를 적어보세요." },
  { id: "soul_food", category: "멘탈 케어", title: "소울푸드", prompt: "기분이 가라앉을 때 꼭 먹고 싶은 나만의 소울푸드를 적어보세요." },
  { id: "emotion_emojis", category: "정서 공유", title: "감정 이모지 3개", prompt: "오늘 하루 나의 감정 상태를 이모지 3개로 표현해보세요." },
  { id: "tiny_week_goal", category: "스터디 연대감", title: "이번 주 작은 목표", prompt: "이번 주 스터디에서 꼭 이루고 싶은 아주 작은 목표를 적어보세요." },
  { id: "self_motivation_words", category: "스터디 연대감", title: "나를 움직이는 말", prompt: "공부가 정말 안 될 때 나를 움직이게 하는 말을 적어보세요." },
  { id: "crew_tip", category: "스터디 연대감", title: "나만의 꿀팁", prompt: "크루원들에게 추천하고 싶은 나만의 꿀팁을 적어보세요." },
  { id: "respected_person", category: "성장", title: "존경하는 인물", prompt: "내가 가장 존경하는 인물과 그 이유를 짧게 적어보세요." },
  { id: "one_year_later", category: "성장", title: "1년 뒤 나", prompt: "1년 뒤 나의 모습을 한 문장으로 상상해보세요." },
  { id: "rewarding_study", category: "스터디 연대감", title: "보람 있었던 순간", prompt: "스터디를 하면서 가장 보람을 느꼈던 순간을 적어보세요." },
  { id: "wake_up_trick", category: "스터디 연대감", title: "졸릴 때 필살기", prompt: "공부하다 졸릴 때 잠을 깨는 나만의 필살기를 적어보세요." },
  { id: "today_reward", category: "스터디 연대감", title: "오늘의 작은 보상", prompt: "오늘 공부를 끝내고 나에게 줄 작은 보상을 적어보세요." },
  { id: "good_crew_condition", category: "스터디 연대감", title: "좋은 크루 조건", prompt: "내가 생각하는 좋은 스터디 크루의 조건 한 가지를 적어보세요." },
  { id: "light_worry", category: "스터디 연대감", title: "가벼운 고민거리", prompt: "크루원들에게 묻고 싶은 가벼운 고민거리를 적어보세요." },
  { id: "recent_quote", category: "성장", title: "인상 깊은 구절", prompt: "최근 읽은 책이나 글에서 인상 깊었던 구절을 적어보세요." },
  { id: "slump_signal", category: "성장", title: "슬럼프 신호", prompt: "슬럼프가 왔을 때 그것을 알아차리는 나만의 신호를 적어보세요." },
  { id: "avoid_distraction", category: "스터디 연대감", title: "딴짓 참는 법", prompt: "스터디 중 딴짓하고 싶을 때 참아내는 방법을 적어보세요." },
  { id: "letter_to_future", category: "성장", title: "10년 뒤 나에게", prompt: "10년 뒤의 나에게 쓰고 싶은 짧은 편지를 적어보세요." },
  { id: "today_keywords", category: "학습 시작", title: "오늘의 키워드 3개", prompt: "오늘 배울 내용 중 중요하다고 생각하는 키워드 3개를 적어보세요." },
  { id: "crew_strength", category: "스터디 연대감", title: "크루원의 장점", prompt: "같이 공부하는 크루원들의 장점 한 가지를 적어보세요." },
  { id: "study_reason_three", category: "성장", title: "공부하는 이유 세 글자", prompt: "내가 공부하는 이유를 세 글자로 표현해보세요." },
  { id: "focus_enemy", category: "스터디 연대감", title: "집중 방해꾼", prompt: "나의 집중력을 갉아먹는 가장 큰 방해꾼을 적어보세요." },
  { id: "phone_less_promise", category: "스터디 연대감", title: "스마트폰 줄이기", prompt: "오늘 스마트폰 사용 시간을 줄이기 위한 다짐을 적어보세요." },
  { id: "monthly_finish", category: "성장", title: "이번 달 끝낼 것", prompt: "이번 달에 꼭 끝내고 싶은 책이나 강의 이름을 적어보세요." },
  { id: "animal_rebirth", category: "상상력", title: "동물로 환생한다면", prompt: "내가 동물로 환생한다면 어떤 동물일지 적어보세요." },
  { id: "time_machine", category: "상상력", title: "타임머신 여행", prompt: "타임머신을 탄다면 과거와 미래 중 어디로 가고 싶은지 적어보세요." },
  { id: "zombie_first_action", category: "상상력", title: "좀비 사태 첫 행동", prompt: "좀비 사태가 터지면 내가 가장 먼저 할 행동을 적어보세요." },
  { id: "name_acrostic", category: "상상력", title: "내 이름 삼행시", prompt: "내 이름으로 짧은 삼행시를 지어보세요." },
  { id: "alien_food", category: "상상력", title: "외계인 추천 음식", prompt: "외계인에게 지구 음식 하나만 추천한다면 무엇을 고를지 적어보세요." },
  { id: "movie_director", category: "상상력", title: "내가 영화 감독이라면", prompt: "내가 영화 감독이라면 어떤 장르의 영화를 만들고 싶은가요?" },
  { id: "life_drama_episode", category: "상상력", title: "내 인생 드라마", prompt: "내 인생을 드라마로 만든다면 지금은 몇 화쯤일지 적어보세요." },
  { id: "telepathy_message", category: "상상력", title: "10초 텔레파시", prompt: "전 세계 사람들에게 10초 동안 텔레파시를 보낸다면 할 말을 적어보세요." },
  { id: "one_color_clothes", category: "상상력", title: "평생 한 가지 색", prompt: "평생 한 가지 색깔 옷만 입어야 한다면 무슨 색을 고를지 적어보세요." },
  { id: "history_dinner", category: "상상력", title: "역사 속 저녁 식사", prompt: "역사 속 인물 한 명과 저녁 식사를 한다면 누구와 하고 싶은가요?" },
  { id: "teleport_place", category: "상상력", title: "순간이동 장소", prompt: "지금 당장 순간이동할 수 있다면 가고 싶은 곳을 적어보세요." },
  { id: "useless_power", category: "상상력", title: "쓸모없는 초능력", prompt: "나에게 쓸모없는 초능력이 하나 생긴다면 무엇일지 적어보세요." },
  { id: "invisible_kind_prank", category: "상상력", title: "투명인간 선의의 장난", prompt: "투명인간이 된다면 해보고 싶은 선의의 장난을 적어보세요." },
  { id: "back_to_ten", category: "상상력", title: "10살로 돌아간다면", prompt: "자고 일어났는데 10살로 돌아갔다면 가장 먼저 할 일을 적어보세요." },
  { id: "secret_room", category: "상상력", title: "비밀의 방", prompt: "내 방에 비밀의 방이 있다면 무엇으로 채우고 싶은지 적어보세요." },
  { id: "robot_world", category: "상상력", title: "로봇이 일하는 세상", prompt: "로봇이 모든 일을 다 해주는 세상이 온다면 나는 무엇을 할지 적어보세요." },
  { id: "teleport_vs_flight", category: "밸런스 게임", title: "텔레포트 vs 비행", prompt: "텔레포트와 비행 능력 중 하나를 고른다면 무엇을 고를지 적어보세요." },
  { id: "inventor_item", category: "상상력", title: "기상천외한 발명품", prompt: "내가 발명가라면 만들고 싶은 기상천외한 물건을 적어보세요." },
  { id: "money_vs_internet", category: "밸런스 게임", title: "100억 vs 인터넷", prompt: "100억을 받는 대신 평생 인터넷 끊기, 가능할지 적어보세요." },
  { id: "alien_word", category: "상상력", title: "나만의 외계어", prompt: "나만 아는 외계어 단어 하나를 만들고 뜻을 설명해보세요." },
  { id: "summer_vs_winter", category: "밸런스 게임", title: "평생 여름 vs 겨울", prompt: "평생 여름과 평생 겨울 중 하나를 고르고 이유를 적어보세요." },
  { id: "money_probability", category: "밸런스 게임", title: "확실한 돈 vs 큰 기회", prompt: "1000만 원 확정과 10% 확률 100억 중 하나를 고르고 이유를 적어보세요." },
  { id: "success_standard", category: "가치관", title: "성공의 기준", prompt: "내가 생각하는 성공의 기준은 무엇인지 적어보세요." },
  { id: "relationship_value", category: "가치관", title: "인간관계 가치", prompt: "인간관계에서 내가 가장 중요하게 생각하는 가치를 적어보세요." },
  { id: "travel_j_or_p", category: "가치관", title: "여행 계획형 vs 즉흥형", prompt: "친구와 여행 갈 때 나는 계획형인지 즉흥형인지 적어보세요." },
  { id: "life_motto", category: "가치관", title: "나의 모토", prompt: "나의 좌우명이나 인생의 모토를 적어보세요." },
  { id: "no_sleep_vs_no_weight", category: "밸런스 게임", title: "피곤 없음 vs 살 안 찜", prompt: "잠 안 자도 안 피곤한 약과 많이 먹어도 살 안 찌는 약 중 골라보세요." },
  { id: "misunderstanding_style", category: "가치관", title: "오해받았을 때", prompt: "오해받았을 때 적극 해명하는 편인지 그냥 두는 편인지 적어보세요." },
  { id: "turning_point", category: "가치관", title: "인생 전환점", prompt: "내 인생에서 큰 전환점이 되었던 사건을 적어보세요." },
  { id: "like_vs_liked", category: "밸런스 게임", title: "좋아하는 사람 vs 나를 좋아하는 사람", prompt: "좋아하는 사람과 나를 좋아하는 사람 중 하나를 고르고 이유를 적어보세요." },
  { id: "brave_moment", category: "가치관", title: "용기를 낸 순간", prompt: "살면서 가장 큰 용기를 냈던 순간을 적어보세요." },
  { id: "perfect_vs_fast", category: "가치관", title: "완벽주의 vs 실행력", prompt: "완벽주의와 빠른 실행력 중 더 중요하다고 생각하는 것을 적어보세요." },
  { id: "future_self_feeling", category: "가치관", title: "미래의 나", prompt: "미래의 나에 대해 기대되는 점이나 걱정되는 점을 하나 적어보세요." },
  { id: "snack_vs_late_sleep", category: "밸런스 게임", title: "간식 끊기 vs 늦잠 끊기", prompt: "평생 간식 끊기와 평생 늦잠 끊기 중 하나를 고르고 이유를 적어보세요." },
  { id: "life_hobby", category: "가치관", title: "삶의 활력소", prompt: "내 삶의 활력소가 되어주는 취미 생활을 적어보세요." },
  { id: "money_cannot_buy", category: "가치관", title: "돈으로 못 사는 것", prompt: "돈으로 살 수 없는 것 중 가장 가치 있다고 생각하는 것을 적어보세요." },
  { id: "past_vs_future", category: "밸런스 게임", title: "과거 수정 vs 미래 보기", prompt: "과거 실수 고치기와 미래 성공 미리 보기 중 하나를 골라보세요." },
  { id: "perfect_weekend", category: "가치관", title: "완벽한 주말", prompt: "내가 가장 행복하다고 느끼는 완벽한 주말의 모습을 적어보세요." },
  { id: "life_intro_sentence", category: "가치관", title: "내 인생 소개 문구", prompt: "내 인생을 소개하는 문구에 적고 싶은 한 문장을 적어보세요." },
  { id: "text_clap", category: "서로 응원", title: "나에게 텍스트 박수", prompt: "오늘 이 미션을 읽고 있는 나에게 짧은 텍스트 박수를 보내보세요." },
];

function getKstDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(date);
}

function getStudyCrewMissionForDate(dateKey) {
  const numericSeed = Number(String(dateKey || "").replace(/-/g, "")) || 0;
  return STUDY_CREW_DAILY_MISSIONS[numericSeed % STUDY_CREW_DAILY_MISSIONS.length];
}

function resolveStudyCrewMissionForDate(dateKey, planData = null) {
  if (planData?.disabled === true) {
    return { disabled: true };
  }
  const title = String(planData?.title || "").trim();
  const prompt = String(planData?.prompt || "").trim();
  if (title && prompt) {
    return {
      id: String(planData.missionId || `admin_${dateKey}`).slice(0, 80),
      category: String(planData.category || "운영 미션").slice(0, 40),
      title: title.slice(0, 50),
      prompt: prompt.slice(0, 180),
      source: "admin",
    };
  }
  return {
    ...getStudyCrewMissionForDate(dateKey),
    source: "default",
  };
}

function getStudyCrewMissionScopeKey(scopeType, scopeId) {
  return `${scopeType}_${String(scopeId || "").replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function validateStudyCrewMissionDateKey(dateKey) {
  const value = String(dateKey || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new functions.https.HttpsError("invalid-argument", "날짜 형식이 올바르지 않습니다.");
  }
  return value;
}

const OPEN_STUDY_POOLS = {
  elem_2_4: {
    id: "elem_2_4",
    label: "초2~초4",
    title: "기초 탐험반",
    description: "기초 개념을 함께 다지는 저학년 오픈 스터디",
    color: "#38bdf8",
    maxParticipants: 100,
    allowAutoExpand: true,
  },
  elem_5: {
    id: "elem_5",
    label: "초5",
    title: "초5 도약반",
    description: "분수, 도형, 문장제를 같이 밀어 올리는 방",
    color: "#34d399",
    maxParticipants: 100,
    allowAutoExpand: true,
  },
  elem_6: {
    id: "elem_6",
    label: "초6",
    title: "초6 전환반",
    description: "중등 수학으로 넘어가기 전 마지막 점검",
    color: "#fbbf24",
    maxParticipants: 100,
    allowAutoExpand: true,
  },
  mid_1: {
    id: "mid_1",
    label: "중1",
    title: "중1 개척반",
    description: "문자와 식, 함수 감각을 함께 잡는 방",
    color: "#f97316",
    maxParticipants: 100,
    allowAutoExpand: true,
  },
  mid_2_3: {
    id: "mid_2_3",
    label: "중2~중3",
    title: "중등 심화반",
    description: "고난도 문제와 개념 연결을 같이 푸는 방",
    color: "#a78bfa",
    maxParticipants: 100,
    allowAutoExpand: true,
  },
  free: {
    id: "free",
    label: "자유학년",
    title: "자유 합류반",
    description: "학년이 애매하거나 자유롭게 함께 공부하는 방",
    color: "#fb7185",
    maxParticipants: 100,
    allowAutoExpand: true,
  },
};

function getOpenStudyPoolIdFromGrade(userData = {}) {
  const gradeValue = userData.grade || userData.schoolGrade || userData.studentGrade || "";
  const text = String(gradeValue || "").replace(/\s+/g, "");
  const number = Number((text.match(/\d+/) || [0])[0]);
  const isMiddle = /중|middle|mid/i.test(text);
  const isElementary = /초|elementary|elem/i.test(text);

  if (isMiddle) {
    if (number === 1) return "mid_1";
    if (number === 2 || number === 3) return "mid_2_3";
  }
  if (isElementary || number > 0) {
    if (number >= 2 && number <= 4) return "elem_2_4";
    if (number === 5) return "elem_5";
    if (number === 6) return "elem_6";
  }
  return "free";
}

function normalizeGoogleMeetUrl(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";

  let url;
  try {
    url = new URL(raw);
  } catch (err) {
    throw new functions.https.HttpsError("invalid-argument", "Google Meet 주소 형식이 올바르지 않습니다.");
  }

  if (url.protocol !== "https:") {
    throw new functions.https.HttpsError("invalid-argument", "Google Meet 주소는 https 주소여야 합니다.");
  }

  const hostname = url.hostname.toLowerCase();
  const isGoogleMeet = hostname === "meet.google.com" || hostname.endsWith(".meet.google.com");
  const isGoogleCalendarMeet = hostname === "calendar.google.com" && url.href.includes("meet.google.com");
  if (!isGoogleMeet && !isGoogleCalendarMeet) {
    throw new functions.https.HttpsError("invalid-argument", "meet.google.com 주소만 등록할 수 있습니다.");
  }

  return url.toString().slice(0, 500);
}

function buildOpenStudyPoolPayload(poolId, poolData = {}) {
  const base = OPEN_STUDY_POOLS[poolId] || OPEN_STUDY_POOLS.free;
  return {
    ...base,
    ...poolData,
    id: poolId,
    googleMeetUrl: poolData.googleMeetUrl || "",
    googleMeetUpdatedAt: poolData.googleMeetUpdatedAt || null,
    googleMeetUpdatedBy: poolData.googleMeetUpdatedBy || "",
  };
}

function isActiveOpenStudyRoom(roomData = {}, nowMs = Date.now()) {
  const status = roomData.status || "waiting";
  if (status === "ended") return false;
  const baseMs = getTimestampMillis(roomData.startedAt) || getTimestampMillis(roomData.createdAt) || getTimestampMillis(roomData.lastActivityAt);
  if (!baseMs) return true;
  if (status === "waiting") return nowMs < baseMs + 5 * 60 * 1000;
  const durationMs = (Number(roomData.durationMinutes) || 50) * 60 * 1000;
  return nowMs < baseMs + durationMs + 10 * 60 * 1000;
}

const OPEN_STUDY_PARTICIPANT_STALE_MS = 12 * 60 * 1000;
const OPEN_STUDY_LIVE_PARTICIPANT_STALE_BUFFER_MS = 20 * 60 * 1000;
const OPEN_STUDY_LIVE_PARTICIPANT_MAX_STALE_MS = 90 * 60 * 1000;

function getOpenStudyParticipantStaleMs(roomData = {}) {
  const durationMs = (Number(roomData.durationMinutes) || 50) * 60 * 1000;
  return Math.min(
    Math.max(OPEN_STUDY_PARTICIPANT_STALE_MS, durationMs + OPEN_STUDY_LIVE_PARTICIPANT_STALE_BUFFER_MS),
    OPEN_STUDY_LIVE_PARTICIPANT_MAX_STALE_MS
  );
}

async function getFreshOpenStudyParticipantState(tx, roomRef, roomData = {}, nowMs = Date.now()) {
  const roomMax = Number(roomData.maxParticipants || OPEN_STUDY_POOLS[roomData.poolId]?.maxParticipants || 100);
  const participantIdsFromRoom = Array.isArray(roomData.participantIds)
    ? Array.from(new Set(roomData.participantIds.filter(Boolean)))
    : [];
  const participantDocsSnap = await tx.get(roomRef.collection("participants").limit(Math.max(roomMax, participantIdsFromRoom.length, 100)));
  const participantIdsFromDocs = participantDocsSnap.docs.map((docSnap) => docSnap.id).filter(Boolean);
  const participantIds = Array.from(new Set([...participantIdsFromRoom, ...participantIdsFromDocs]));
  if (!participantIds.length) {
    return { activeIds: [], staleIds: [] };
  }

  const participantSnapById = new Map(participantDocsSnap.docs.map((docSnap) => [docSnap.id, docSnap]));
  const participantSnaps = await Promise.all(
    participantIds.map((participantId) => (
      participantSnapById.get(participantId) || tx.get(roomRef.collection("participants").doc(participantId))
    ))
  );
  const activeIds = [];
  const staleIds = [];
  const roomBaseMs = getTimestampMillis(roomData.lastActivityAt) || getTimestampMillis(roomData.createdAt) || nowMs;

  participantIds.forEach((participantId, index) => {
    const participantSnap = participantSnaps[index];
    if (!participantSnap.exists) {
      staleIds.push(participantId);
      return;
    }

    const participantData = participantSnap.data() || {};
    const lastSeenMs = getTimestampMillis(participantData.lastSeenAt) || roomBaseMs;
    const participantStaleMs = getOpenStudyParticipantStaleMs(roomData);
    if (nowMs - lastSeenMs > participantStaleMs) {
      staleIds.push(participantId);
      return;
    }

    activeIds.push(participantId);
  });

  return { activeIds, staleIds };
}

async function syncOpenStudyRoomParticipantsTransaction(tx, db, roomRef, roomData = {}, now = new Date()) {
  const nowMs = now.getTime();
  const participantState = await getFreshOpenStudyParticipantState(tx, roomRef, roomData, nowMs);
  const activeIds = participantState.activeIds;
  const staleIds = participantState.staleIds;
  const poolId = roomData.poolId || "free";
  const poolRef = db.collection("openStudyPools").doc(poolId);
  const poolSnap = await tx.get(poolRef);
  const poolData = poolSnap.exists ? (poolSnap.data() || {}) : {};

  staleIds.forEach((participantId) => {
    tx.delete(roomRef.collection("participants").doc(participantId));
  });

  if (!activeIds.length) {
    tx.set(roomRef, {
      participantIds: [],
      participantCount: 0,
      status: "ended",
      endedAt: roomData.endedAt || now,
      lastActivityAt: now,
    }, { merge: true });

    if (poolData.currentRoomId === roomRef.id) {
      tx.set(poolRef, {
        currentRoomId: "",
        updatedAt: now,
      }, { merge: true });
    }

    return { activeIds, staleIds, status: "ended" };
  }

  const existingHostUid = roomData.hostUid || "";
  const nextHostUid = activeIds.includes(existingHostUid) ? existingHostUid : activeIds[0];
  let nextHostName = roomData.hostName || "탐사원";
  if (nextHostUid !== existingHostUid) {
    const nextHostSnap = await tx.get(db.collection("users").doc(nextHostUid));
    nextHostName = nextHostSnap.exists ? getDisplayNameFromUser(nextHostSnap.data() || {}) : "탐사원";
    tx.set(roomRef.collection("participants").doc(nextHostUid), {
      role: "host",
    }, { merge: true });
  }

  const nextStatus = activeIds.length >= 2 ? "live" : "waiting";
  const maxParticipants = Number(roomData.maxParticipants || OPEN_STUDY_POOLS[poolId]?.maxParticipants || 100);
  const roomUpdate = {
    participantIds: activeIds,
    participantCount: activeIds.length,
    hostUid: nextHostUid,
    hostName: nextHostName,
    status: nextStatus,
    lastActivityAt: now,
  };

  if (nextStatus === "live" && !roomData.startedAt) {
    roomUpdate.startedAt = now;
  }

  tx.set(roomRef, roomUpdate, { merge: true });

  if (poolData.currentRoomId === roomRef.id || activeIds.length < maxParticipants) {
    tx.set(poolRef, {
      currentRoomId: activeIds.length < maxParticipants ? roomRef.id : "",
      updatedAt: now,
    }, { merge: true });
  }

  return { activeIds, staleIds, status: nextStatus };
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
  const db = admin.firestore();

  const batch = db.batch();
  memberIds.forEach((uid) => {
    const isLeader = uid === leaderId;
    // On rejection: leader keeps snapshot (to see reason & resubmit), others get cleared
    const keepSnapshot = isRejected && isLeader;
    batch.set(db.collection("users").doc(uid), {
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
  if (memberIds.length) {
    await batch.commit();
  }

  await Promise.all(memberIds.map(async (uid) => {
    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists) return;
    await syncAnswerProfileSnapshotsForUser(uid, userSnap.data() || {});
  }));
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
    studyRoomCapacity: 0,
    googleMeetUrl: "",
    googleMeetUpdatedAt: null,
    googleMeetUpdatedBy: "",
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
    return updatedCrew;
  });

  await syncCrewToMembers(crewSnap.id, {
    ...txResult,
    updatedAt: new Date().toISOString(),
  });
  await reconcileCrewGrowthEvent(crewSnap.id).catch((err) => {
    console.warn("Crew growth event sync after member join failed", crewSnap.id, err);
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
      studyRoomCapacity: crewData.studyRoomCapacity || 0,
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
      studyRoomCapacity: crewData.studyRoomCapacity || 0,
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
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError("unauthenticated", "이 작업을 수행하려면 로그인해야 합니다.");
  }
  const uid = context.auth.uid;
  const guest = isGuestContext(context);
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
  if (guest) {
    if (crewData.guestAccessEnabled !== true) {
      throw new functions.https.HttpsError("permission-denied", "크루 리더가 게스트 참여를 허용하지 않았습니다.");
    }
  } else {
    const memberIds = crewData.memberIds || [];
    if (!memberIds.includes(uid) && crewData.leaderId !== uid) {
      const adminDoc = await db.collection("users").doc(uid).get();
      if (!adminDoc.exists || adminDoc.data().role !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "크루 멤버만 포스트잇을 남길 수 있습니다.");
      }
    }
  }

  const greetingRef = crewRef.collection("greetings").doc();
  const userName = guest
    ? getCrewGuestAlias(uid)
    : (context.auth.token?.name || context.auth.token?.email || "탐사원");
  const greeting = {
    crewId,
    userId: uid,
    userName,
    isGuest: guest,
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

exports.submitStudyCrewDailyMission = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const guest = isGuestContext(context);
  const scopeType = String(data?.scopeType || "").trim();
  const scopeId = String(data?.scopeId || "").trim();
  const answer = String(data?.answer || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, STUDY_CREW_MISSION_MAX_LENGTH);

  if (!["crew", "room", "openStudy"].includes(scopeType) || !scopeId) {
    throw new functions.https.HttpsError("invalid-argument", "미션 위치 정보가 올바르지 않습니다.");
  }
  if (scopeType === "openStudy" && !OPEN_STUDY_POOLS[scopeId]) {
    throw new functions.https.HttpsError("invalid-argument", "오픈 스터디 구분이 올바르지 않습니다.");
  }
  if (!answer) {
    throw new functions.https.HttpsError("invalid-argument", "미션 답변을 입력해주세요.");
  }
  if (guest && scopeType !== "crew") {
    throw new functions.https.HttpsError("permission-denied", "게스트는 초대받은 크루 미션에만 참여할 수 있습니다.");
  }

  const db = admin.firestore();
  const userRef = db.collection("users").doc(uid);
  const scopeRef = scopeType === "crew"
    ? db.collection("crews").doc(scopeId)
    : scopeType === "room"
      ? db.collection("studyRooms").doc(scopeId)
      : db.collection("openStudyPools").doc(scopeId);
  const now = new Date();
  const dateKey = getKstDateKey(now);
  const planRef = db.collection("studyCrewMissionPlans").doc(dateKey);
  const scopeKey = getStudyCrewMissionScopeKey(scopeType, scopeId);
  const missionRef = db.collection("studyCrewDailyMissions").doc(scopeKey).collection("days").doc(dateKey);
  const responseRef = missionRef.collection("responses").doc(uid);

  let savedMission = null;
  let rewardResult = {
    individualAwarded: false,
    individualAmount: 0,
    teamAwarded: false,
    teamAmount: 0,
    teamEligible: false,
    teamTargetCount: 0,
    completedCount: 0,
  };
  await db.runTransaction(async (tx) => {
    const responsesQuery = missionRef.collection("responses");
    const individualRewardHistoryQuery = userRef.collection("crystal_transactions")
      .where("type", "==", "study_crew_mission");
    const [userSnap, scopeSnap, planSnap, missionSnap, responseSnap, responsesSnap, individualRewardHistorySnap] = await Promise.all([
      tx.get(userRef),
      tx.get(scopeRef),
      tx.get(planRef),
      tx.get(missionRef),
      tx.get(responseRef),
      tx.get(responsesQuery),
      tx.get(individualRewardHistoryQuery),
    ]);

    if (!userSnap.exists && !guest) {
      throw new functions.https.HttpsError("failed-precondition", "사용자 문서를 찾을 수 없습니다.");
    }
    if (!scopeSnap.exists && scopeType !== "openStudy") {
      throw new functions.https.HttpsError("not-found", "미션을 남길 크루 또는 방을 찾을 수 없습니다.");
    }

    const userData = guest
      ? { role: "guest", publicDisplayName: getCrewGuestAlias(uid) }
      : (userSnap.data() || {});
    const scopeData = scopeSnap.exists ? (scopeSnap.data() || {}) : {};
    const mission = resolveStudyCrewMissionForDate(dateKey, planSnap.exists ? (planSnap.data() || {}) : null);
    if (mission.disabled) {
      throw new functions.https.HttpsError("failed-precondition", "오늘의 크루 미션이 운영자에 의해 비활성화되었습니다.");
    }
    savedMission = mission;
    let targetIds = [];
    if (scopeType === "crew") {
      targetIds = getCrewMemberIds(scopeData);
      if (guest && scopeData.guestAccessEnabled !== true) {
        throw new functions.https.HttpsError("permission-denied", "현재 게스트 미션 참여가 허용되지 않습니다.");
      }
      if (!guest && !targetIds.includes(uid)) {
        throw new functions.https.HttpsError("permission-denied", "크루 멤버만 오늘의 미션을 남길 수 있습니다.");
      }
      if ((scopeData.status || "pending") !== "approved") {
        throw new functions.https.HttpsError("failed-precondition", "승인된 크루에서만 미션을 사용할 수 있습니다.");
      }
    } else if (scopeType === "room") {
      targetIds = uniqueIds(Array.isArray(scopeData.participantIds) ? scopeData.participantIds : []);
      if (!targetIds.includes(uid)) {
        throw new functions.https.HttpsError("permission-denied", "방 참여자만 오늘의 미션을 남길 수 있습니다.");
      }
      if ((scopeData.status || "waiting") === "ended") {
        throw new functions.https.HttpsError("failed-precondition", "종료된 방에는 미션을 남길 수 없습니다.");
      }
    } else {
      const recommendedPoolId = getOpenStudyPoolIdFromGrade(userData);
      const isAdminUser = userData.role === "admin";
      if (!isAdminUser && scopeId !== "free" && scopeId !== recommendedPoolId) {
        throw new functions.https.HttpsError("failed-precondition", "내 학년에 맞는 오픈 스터디에서만 미션을 남길 수 있습니다.");
      }
      targetIds = [uid];
    }

    targetIds = uniqueIds(targetIds);
    const responseUserIds = new Set();
    responsesSnap.forEach((docSnap) => {
      const responseData = docSnap.data() || {};
      responseUserIds.add(responseData.userId || docSnap.id);
    });
    responseUserIds.add(uid);

    const targetIdSet = new Set(targetIds);
    const completedTargetIds = [...responseUserIds].filter((id) => targetIdSet.has(id));
    const teamEligible = scopeType !== "openStudy" && targetIds.length >= 2;
    const teamCompleted = teamEligible && targetIds.every((id) => responseUserIds.has(id));
    const missionData = missionSnap.exists ? (missionSnap.data() || {}) : {};
    const teamAlreadyAwarded = Boolean(missionData.teamRewardAwardedAt);
    const countTodayRewardHistory = (historySnap) => {
      let count = 0;
      historySnap?.forEach((docSnap) => {
        const rewardData = docSnap.data() || {};
        if (rewardData?.metadata?.dateKey === dateKey) count += 1;
      });
      return count;
    };
    const individualRewardCount = userData.studyCrewMissionRewardDate === dateKey
      ? Number(userData.studyCrewMissionRewardCount || 0)
      : 0;
    const effectiveIndividualRewardCount = Math.max(
      individualRewardCount,
      countTodayRewardHistory(individualRewardHistorySnap)
    );
    const shouldAwardIndividual = !guest
      && !responseSnap.exists
      && effectiveIndividualRewardCount < STUDY_CREW_MISSION_INDIVIDUAL_DAILY_LIMIT;
    const shouldCompleteTeamReward = teamCompleted && !teamAlreadyAwarded;
    const rewardUserIds = uniqueIds([
      ...(shouldAwardIndividual ? [uid] : []),
      ...(shouldCompleteTeamReward ? targetIds : []),
    ]);
    const rewardUserSnaps = new Map([[uid, userSnap]]);
    if (rewardUserIds.length > 0) {
      await Promise.all(rewardUserIds
        .filter((rewardUid) => rewardUid !== uid)
        .map(async (rewardUid) => {
          const rewardUserRef = db.collection("users").doc(rewardUid);
          rewardUserSnaps.set(rewardUid, await tx.get(rewardUserRef));
        }));
    }
    const teamRewardHistorySnaps = new Map();
    if (shouldCompleteTeamReward) {
      await Promise.all(targetIds.map(async (rewardUid) => {
        const teamRewardHistoryQuery = db.collection("users")
          .doc(rewardUid)
          .collection("crystal_transactions")
          .where("type", "==", "study_crew_team_mission");
        teamRewardHistorySnaps.set(rewardUid, await tx.get(teamRewardHistoryQuery));
      }));
    }
    const getEffectiveTeamRewardCount = (rewardUid) => {
      const rewardUserSnap = rewardUserSnaps.get(rewardUid);
      const rewardUserData = rewardUserSnap?.exists ? (rewardUserSnap.data() || {}) : {};
      const teamRewardCount = rewardUserData.studyCrewTeamMissionRewardDate === dateKey
        ? Number(rewardUserData.studyCrewTeamMissionRewardCount || 0)
        : 0;
      return Math.max(teamRewardCount, countTodayRewardHistory(teamRewardHistorySnaps.get(rewardUid)));
    };

    tx.set(missionRef, {
      scopeType,
      scopeId,
      dateKey,
      missionId: mission.id,
      category: mission.category,
      title: mission.title,
      prompt: mission.prompt,
      maxLength: STUDY_CREW_MISSION_MAX_LENGTH,
      targetCount: Math.max(targetIds.length, 1),
      completedCount: completedTargetIds.length,
      teamEligible,
      teamCompleted,
      individualRewardDailyLimit: STUDY_CREW_MISSION_INDIVIDUAL_DAILY_LIMIT,
      teamRewardDailyLimit: STUDY_CREW_MISSION_TEAM_DAILY_LIMIT,
      updatedAt: now,
      createdAt: now,
      ...(shouldCompleteTeamReward ? {
        teamCompletedAt: now,
        teamRewardAwardedAt: now,
        teamRewardUserIds: targetIds.filter((rewardUid) => getEffectiveTeamRewardCount(rewardUid) < STUDY_CREW_MISSION_TEAM_DAILY_LIMIT),
      } : {}),
    }, { merge: true });

    tx.set(responseRef, {
      scopeType,
      scopeId,
      dateKey,
      missionId: mission.id,
      userId: uid,
      userName: getDisplayNameFromUser(userData),
      isGuest: guest,
      answer,
      createdAt: responseSnap.exists ? (responseSnap.data()?.createdAt || now) : now,
      updatedAt: now,
    }, { merge: true });

    const rewardsByUser = new Map();
    const rewardUserUpdates = new Map();
    const addReward = (rewardUid, amount, update = {}) => {
      rewardsByUser.set(rewardUid, (rewardsByUser.get(rewardUid) || 0) + amount);
      rewardUserUpdates.set(rewardUid, {
        ...(rewardUserUpdates.get(rewardUid) || {}),
        ...update,
      });
    };

    if (shouldAwardIndividual) {
      addReward(uid, STUDY_CREW_MISSION_INDIVIDUAL_REWARD, {
        studyCrewMissionRewardDate: dateKey,
        studyCrewMissionRewardCount: effectiveIndividualRewardCount + 1,
      });
      recordCrystalTransaction(tx, uid, `study-crew-daily-mission-${dateKey}`, {
        amount: STUDY_CREW_MISSION_INDIVIDUAL_REWARD,
        type: "study_crew_mission",
        description: "오늘의 크루 미션 완료 보상",
        metadata: {
          scopeType,
          scopeId,
          scopeKey,
          dateKey,
          missionId: mission.id,
        },
      });
    }

    const teamRewardedUserIds = [];
    if (shouldCompleteTeamReward) {
      targetIds.forEach((rewardUid) => {
        const rewardUserSnap = rewardUserSnaps.get(rewardUid);
        if (!rewardUserSnap?.exists) return;
        const teamRewardCount = getEffectiveTeamRewardCount(rewardUid);
        if (teamRewardCount >= STUDY_CREW_MISSION_TEAM_DAILY_LIMIT) return;

        teamRewardedUserIds.push(rewardUid);
        addReward(rewardUid, STUDY_CREW_MISSION_TEAM_REWARD, {
          studyCrewTeamMissionRewardDate: dateKey,
          studyCrewTeamMissionRewardCount: teamRewardCount + 1,
        });
        recordCrystalTransaction(tx, rewardUid, `study-crew-daily-mission-team-${scopeKey}-${dateKey}`, {
          amount: STUDY_CREW_MISSION_TEAM_REWARD,
          type: "study_crew_team_mission",
          description: "팀 크루 미션 완료 보상",
          metadata: {
            scopeType,
            scopeId,
            scopeKey,
            dateKey,
            missionId: mission.id,
            completedUserIds: targetIds,
          },
        });
      });
    }

    rewardsByUser.forEach((amount, rewardUid) => {
      const rewardUserSnap = rewardUserSnaps.get(rewardUid);
      if (!rewardUserSnap?.exists) return;
      const rewardUserData = rewardUserSnap.data() || {};
      tx.set(db.collection("users").doc(rewardUid), {
        crystals: Number(rewardUserData.crystals || 0) + amount,
        ...(rewardUserUpdates.get(rewardUid) || {}),
      }, { merge: true });
    });

    rewardResult = {
      individualAwarded: shouldAwardIndividual,
      individualAmount: shouldAwardIndividual ? STUDY_CREW_MISSION_INDIVIDUAL_REWARD : 0,
      individualDailyLimit: STUDY_CREW_MISSION_INDIVIDUAL_DAILY_LIMIT,
      teamAwarded: teamRewardedUserIds.includes(uid),
      teamAmount: teamRewardedUserIds.includes(uid) ? STUDY_CREW_MISSION_TEAM_REWARD : 0,
      teamDailyLimit: STUDY_CREW_MISSION_TEAM_DAILY_LIMIT,
      teamRewardedUserIds,
      teamEligible,
      teamTargetCount: targetIds.length,
      completedCount: completedTargetIds.length,
    };
  });

  return {
    success: true,
    dateKey,
    mission: savedMission,
    rewards: rewardResult,
  };
});

exports.getStudyCrewMissionAdmin = regionalFunctions.https.onCall(async (data, context) => {
  await requireAdminUid(context);
  const db = admin.firestore();
  const dateKey = validateStudyCrewMissionDateKey(data?.dateKey || getKstDateKey());
  const planSnap = await db.collection("studyCrewMissionPlans").doc(dateKey).get();
  const plan = planSnap.exists ? ({ id: planSnap.id, ...planSnap.data() }) : null;
  const mission = resolveStudyCrewMissionForDate(dateKey, plan);

  return {
    dateKey,
    plan,
    mission,
    defaultMission: getStudyCrewMissionForDate(dateKey),
    templates: STUDY_CREW_DAILY_MISSIONS,
  };
});

exports.saveStudyCrewMissionAdmin = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAdminUid(context);
  const dateKey = validateStudyCrewMissionDateKey(data?.dateKey || getKstDateKey());
  const title = String(data?.title || "").trim().slice(0, 50);
  const prompt = String(data?.prompt || "").trim().slice(0, 180);
  const category = String(data?.category || "운영 미션").trim().slice(0, 40);
  const missionId = String(data?.missionId || `admin_${dateKey}`).trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);

  if (!title || !prompt) {
    throw new functions.https.HttpsError("invalid-argument", "미션 제목과 설명을 입력해주세요.");
  }

  const now = new Date();
  const planRef = admin.firestore().collection("studyCrewMissionPlans").doc(dateKey);
  await planRef.set({
    dateKey,
    missionId: missionId || `admin_${dateKey}`,
    category,
    title,
    prompt,
    maxLength: STUDY_CREW_MISSION_MAX_LENGTH,
    disabled: false,
    source: "admin",
    updatedAt: now,
    updatedBy: uid,
    createdAt: now,
  }, { merge: true });

  return {
    success: true,
    dateKey,
    mission: resolveStudyCrewMissionForDate(dateKey, { missionId, category, title, prompt }),
  };
});

exports.deleteStudyCrewMissionAdmin = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAdminUid(context);
  const dateKey = validateStudyCrewMissionDateKey(data?.dateKey || getKstDateKey());
  const mode = String(data?.mode || "disable").trim();
  const planRef = admin.firestore().collection("studyCrewMissionPlans").doc(dateKey);

  if (mode === "default") {
    await planRef.delete();
    return {
      success: true,
      dateKey,
      mission: resolveStudyCrewMissionForDate(dateKey, null),
    };
  }

  await planRef.set({
    dateKey,
    disabled: true,
    source: "admin",
    updatedAt: new Date(),
    updatedBy: uid,
  }, { merge: true });

  return {
    success: true,
    dateKey,
    mission: { disabled: true },
  };
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

exports.listOpenStudyPoolsAdmin = regionalFunctions.https.onCall(async (_data, context) => {
  await requireAdminUid(context);
  const db = admin.firestore();
  const poolIds = Object.keys(OPEN_STUDY_POOLS);
  const poolSnaps = await Promise.all(poolIds.map((poolId) => db.collection("openStudyPools").doc(poolId).get()));
  const pools = poolIds.map((poolId, index) => {
    const data = poolSnaps[index].exists ? (poolSnaps[index].data() || {}) : {};
    return buildOpenStudyPoolPayload(poolId, data);
  });
  return { pools };
});

exports.adminUpdateStudyCrewDetails = regionalFunctions.https.onCall(async (data, context) => {
  await requireAdminUid(context);
  const crewId = String(data?.crewId || "").trim();
  if (!crewId) throw new functions.https.HttpsError("invalid-argument", "크루 ID가 없습니다.");

  const db = admin.firestore();
  const crewRef = db.collection("crews").doc(crewId);
  const crewSnap = await crewRef.get();
  if (!crewSnap.exists) throw new functions.https.HttpsError("not-found", "크루를 찾을 수 없습니다.");

  const crewData = crewSnap.data() || {};
  const normalizedSchedule = normalizeCrewSchedule(
    data?.scheduleDays ?? crewData.scheduleDays,
    data?.scheduleTimes ?? crewData.scheduleTimes,
  );
  const now = new Date();
  const updatedCrew = {
    ...crewData,
    name: String(data?.name ?? crewData.name ?? "").trim().slice(0, 28),
    motto: String(data?.motto ?? crewData.motto ?? "").trim().slice(0, 52),
    description: String(data?.description ?? crewData.description ?? "").trim().slice(0, 500),
    color: String(data?.color ?? crewData.color ?? "#00d4ff").trim().slice(0, 30) || "#00d4ff",
    groupId: String(data?.groupId ?? crewData.groupId ?? "none").trim().slice(0, 80) || "none",
    groupName: String(data?.groupName ?? crewData.groupName ?? "자유 스터디").trim().slice(0, 80) || "자유 스터디",
    clusterId: String(data?.clusterId ?? crewData.clusterId ?? "").trim().slice(0, 120),
    clusterName: String(data?.clusterName ?? crewData.clusterName ?? "").trim().slice(0, 120),
    ...normalizedSchedule,
    updatedAt: now,
  };

  if (!updatedCrew.name) {
    throw new functions.https.HttpsError("invalid-argument", "크루 이름을 입력해주세요.");
  }

  await crewRef.set(updatedCrew, { merge: true });
  await syncCrewToMembers(crewId, {
    ...updatedCrew,
    updatedAt: now.toISOString(),
  });
  return { success: true };
});

exports.adminUpdateStudyCrewMeetUrl = regionalFunctions.https.onCall(async (data, context) => {
  const adminUid = await requireAdminUid(context);
  const crewId = String(data?.crewId || "").trim();
  if (!crewId) throw new functions.https.HttpsError("invalid-argument", "크루 ID가 없습니다.");
  const googleMeetUrl = normalizeGoogleMeetUrl(data?.googleMeetUrl || "");

  const db = admin.firestore();
  const crewRef = db.collection("crews").doc(crewId);
  const crewSnap = await crewRef.get();
  if (!crewSnap.exists) throw new functions.https.HttpsError("not-found", "크루를 찾을 수 없습니다.");

  const now = new Date();
  const updatedCrew = {
    ...(crewSnap.data() || {}),
    googleMeetUrl,
    googleMeetUpdatedAt: now,
    googleMeetUpdatedBy: adminUid,
    updatedAt: now,
  };

  await crewRef.set(updatedCrew, { merge: true });
  await syncCrewToMembers(crewId, {
    ...updatedCrew,
    googleMeetUpdatedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
  return { success: true, googleMeetUrl };
});

exports.adminUpdateOpenStudyMeetUrl = regionalFunctions.https.onCall(async (data, context) => {
  const adminUid = await requireAdminUid(context);
  const poolId = String(data?.poolId || "").trim();
  if (!OPEN_STUDY_POOLS[poolId]) {
    throw new functions.https.HttpsError("invalid-argument", "오픈 스터디 구분이 올바르지 않습니다.");
  }
  const googleMeetUrl = normalizeGoogleMeetUrl(data?.googleMeetUrl || "");
  const now = new Date();
  await admin.firestore().collection("openStudyPools").doc(poolId).set({
    ...OPEN_STUDY_POOLS[poolId],
    googleMeetUrl,
    googleMeetUpdatedAt: now,
    googleMeetUpdatedBy: adminUid,
    updatedAt: now,
  }, { merge: true });
  return { success: true, pool: buildOpenStudyPoolPayload(poolId, { googleMeetUrl, googleMeetUpdatedAt: now, googleMeetUpdatedBy: adminUid }) };
});

exports.adminRemoveStudyCrewMember = regionalFunctions.https.onCall(async (data, context) => {
  await requireAdminUid(context);
  const crewId = String(data?.crewId || "").trim();
  const targetUid = String(data?.targetUid || "").trim();
  if (!crewId || !targetUid) {
    throw new functions.https.HttpsError("invalid-argument", "크루와 탈퇴시킬 멤버를 선택해주세요.");
  }

  const db = admin.firestore();
  const crewRef = db.collection("crews").doc(crewId);
  const targetUserRef = db.collection("users").doc(targetUid);
  let nextCrewData = null;

  await db.runTransaction(async (tx) => {
    const [crewSnap, targetUserSnap] = await Promise.all([
      tx.get(crewRef),
      tx.get(targetUserRef),
    ]);
    if (!crewSnap.exists) throw new functions.https.HttpsError("not-found", "크루를 찾을 수 없습니다.");

    const crewData = crewSnap.data() || {};
    const memberIds = getCrewMemberIds(crewData);
    if (!memberIds.includes(targetUid)) {
      throw new functions.https.HttpsError("failed-precondition", "해당 이용자는 이 크루 멤버가 아닙니다.");
    }

    const remainingMemberIds = memberIds.filter((uid) => uid !== targetUid);
    const targetWasLeader = crewData.leaderId === targetUid;
    const now = new Date();
    let nextLeaderId = crewData.leaderId || "";
    let nextLeaderName = crewData.leaderName || "";
    let nextStatus = crewData.status || "pending";

    if (targetWasLeader) {
      nextLeaderId = remainingMemberIds[0] || "";
      if (nextLeaderId) {
        const nextLeaderSnap = await tx.get(db.collection("users").doc(nextLeaderId));
        nextLeaderName = nextLeaderSnap.exists ? getDisplayNameFromUser(nextLeaderSnap.data() || {}) : "";
      } else {
        nextLeaderName = "";
        nextStatus = "archived";
      }
    }

    nextCrewData = {
      ...crewData,
      leaderId: nextLeaderId,
      leaderName: nextLeaderName,
      memberIds: remainingMemberIds,
      memberCount: remainingMemberIds.length,
      status: nextStatus,
      updatedAt: now,
    };

    tx.set(crewRef, nextCrewData, { merge: true });
    if (!targetUserSnap.exists || (targetUserSnap.data() || {}).crewId === crewId) {
      tx.set(targetUserRef, {
        ...buildClearedCrewUserFields(),
        updatedAt: now,
      }, { merge: true });
    }
  });

  await syncCrewToMembers(crewId, {
    ...nextCrewData,
    updatedAt: new Date().toISOString(),
  });
  return { success: true };
});

// ---------------------------------------------------------------------------
// Crew guest access (integrated waiting room experience)
// A guest is an anonymous Firebase Auth user invited via a crew's guest link.
// Guests share the regular crew waiting room (CrewDetailView): they can open the
// Google Meet focus room and post greetings, but never receive a users/{uid}
// document, learning records, crystals, or ranking.
// ---------------------------------------------------------------------------

const CREW_GROWTH_EVENT_TARGET = 20;
const CREW_GROWTH_EVENT_REWARD = 1000;
const CREW_GROWTH_EVENT_MIN_BATTLES = 2;
const CREW_GROWTH_EVENT_MIN_ANSWERS = 10;
const CREW_GROWTH_EVENT_MIN_AGE_MS = 24 * 60 * 60 * 1000;
const CREW_GROWTH_EVENT_HOLD_MS = 48 * 60 * 60 * 1000;
const CREW_CRYSTAL_CHEST_TARGET = 100;
const CREW_CRYSTAL_CHEST_PERFECT_ASSIGNMENT = 20;
const CREW_CRYSTAL_CHEST_MEMBER_REWARD = 5;
const CREW_CRYSTAL_CHEST_CONTRIBUTOR_DAILY_LIMIT = 40;
const CREW_CRYSTAL_CHEST_DAILY_COMPLETION_LIMIT = 2;
const CREW_CRYSTAL_CHEST_MEMBER_DAILY_CLAIM_LIMIT = 10;

function getRequestIp(context) {
  const forwarded = String(context?.rawRequest?.headers?.["x-forwarded-for"] || "");
  return cleanText(forwarded.split(",")[0] || context?.rawRequest?.ip || "", 80);
}

function guestSecurityHash(value) {
  const secret = process.env.GUEST_ABUSE_HASH_SECRET;
  if (!secret || !value) return "";
  return crypto.createHmac("sha256", secret).update(String(value)).digest("hex");
}

function timestampMillis(value) {
  if (value?.toMillis) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return Number(value || 0);
}

function isCrewGrowthGuestEligible(record = {}, nowMs = Date.now()) {
  const reviewStatus = record.eventReviewStatus || "clear";
  if (["deleted", "suspended"].includes(record.status) || reviewStatus !== "clear") return false;
  const firstJoinedAtMs = Number(record.firstJoinedAtMs || timestampMillis(record.firstJoinedAt));
  return Number(record.completedBattleCount || 0) >= CREW_GROWTH_EVENT_MIN_BATTLES &&
    Number(record.totalBattleAnswers || 0) >= CREW_GROWTH_EVENT_MIN_ANSWERS &&
    firstJoinedAtMs > 0 && nowMs - firstJoinedAtMs >= CREW_GROWTH_EVENT_MIN_AGE_MS;
}

async function loadCrewGrowthEventProgress(crewId, nowMs = Date.now()) {
  const db = admin.firestore();
  const [crewSnap, guestSnap] = await Promise.all([
    db.collection("crews").doc(crewId).get(),
    db.collection("crewGuestAccounts").where("crewId", "==", crewId).get(),
  ]);
  if (!crewSnap.exists) throw new functions.https.HttpsError("not-found", "크루를 찾을 수 없습니다.");
  const crew = crewSnap.data() || {};
  const rawMemberIds = Array.from(new Set([crew.leaderId, ...(crew.memberIds || [])].filter(Boolean)));
  const memberSnaps = await Promise.all(rawMemberIds.map((uid) => db.collection("users").doc(uid).get()));
  const memberIds = rawMemberIds.filter((uid, index) => memberSnaps[index].exists && !isDeletedMemberData(memberSnaps[index].data() || {}));
  const guests = guestSnap.docs.map((docSnap) => ({ uid: docSnap.id, ...docSnap.data() }));
  const activeGuests = guests.filter((guest) => isCrewGrowthGuestEligible(guest, nowMs));
  const pendingGuests = guests.filter((guest) => guest.status !== "deleted" && !isCrewGrowthGuestEligible(guest, nowMs));
  return {
    crewRef: crewSnap.ref,
    crew,
    memberIds,
    guests,
    activeGuests,
    pendingGuests,
    memberCount: memberIds.length,
    activeGuestCount: activeGuests.length,
    eligibleCount: memberIds.length + activeGuests.length,
  };
}

async function reconcileCrewGrowthEvent(crewId, { allowReward = false } = {}) {
  const db = admin.firestore();
  const nowMs = Date.now();
  const progress = await loadCrewGrowthEventProgress(crewId, nowMs);
  const event = progress.crew.growthEvent2026 || {};
  if (event.rewardedAt) return { ...progress, event };

  if (progress.eligibleCount < CREW_GROWTH_EVENT_TARGET) {
    if (event.achievedAtMs) {
      await progress.crewRef.set({ growthEvent2026: { ...event, achievedAt: null, achievedAtMs: 0, verificationEndsAt: null, verificationEndsAtMs: 0, updatedAt: FieldValue.serverTimestamp() } }, { merge: true });
    }
    return { ...progress, event: { ...event, achievedAtMs: 0, verificationEndsAtMs: 0 } };
  }

  if (!event.achievedAtMs) {
    const nextEvent = {
      achievedAt: FieldValue.serverTimestamp(),
      achievedAtMs: nowMs,
      verificationEndsAt: Timestamp.fromMillis(nowMs + CREW_GROWTH_EVENT_HOLD_MS),
      verificationEndsAtMs: nowMs + CREW_GROWTH_EVENT_HOLD_MS,
      rewardedAt: null,
      updatedAt: FieldValue.serverTimestamp(),
    };
    await progress.crewRef.set({ growthEvent2026: nextEvent }, { merge: true });
    return { ...progress, event: nextEvent };
  }

  if (!allowReward || nowMs < Number(event.verificationEndsAtMs || 0)) return { ...progress, event };

  await db.runTransaction(async (transaction) => {
    const freshCrewSnap = await transaction.get(progress.crewRef);
    const freshCrew = freshCrewSnap.data() || {};
    if (freshCrew.growthEvent2026?.rewardedAt) return;
    const userRefs = progress.memberIds.map((uid) => db.collection("users").doc(uid));
    const userSnaps = await Promise.all(userRefs.map((userRef) => transaction.get(userRef)));
    const rewardedMemberIds = progress.memberIds.filter((uid, index) => userSnaps[index].exists && !isDeletedMemberData(userSnaps[index].data() || {}));
    rewardedMemberIds.forEach((uid) => {
      const userRef = db.collection("users").doc(uid);
      transaction.set(userRef, {
        crystals: FieldValue.increment(CREW_GROWTH_EVENT_REWARD),
        lastCrewGrowthRewardAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      recordCrystalTransaction(transaction, uid, `crew_growth_20_${crewId}`, {
        amount: CREW_GROWTH_EVENT_REWARD,
        type: "crew_growth_event_reward",
        description: "스터디 크루 20명 달성 이벤트 보상",
        metadata: { crewId, target: CREW_GROWTH_EVENT_TARGET },
      });
    });
    transaction.set(progress.crewRef, {
      growthEvent2026: {
        ...freshCrew.growthEvent2026,
        rewardedAt: FieldValue.serverTimestamp(),
        rewardedAtMs: nowMs,
        rewardedMemberIds,
        rewardAmount: CREW_GROWTH_EVENT_REWARD,
        finalEligibleCount: progress.eligibleCount,
        updatedAt: FieldValue.serverTimestamp(),
      },
    }, { merge: true });
  });
  return loadCrewGrowthEventProgress(crewId, nowMs);
}

async function recordCrewGuestBattleActivity(battleId) {
  const db = admin.firestore();
  const battleSnap = await db.collection("quizBattles").doc(battleId).get();
  if (!battleSnap.exists || battleSnap.data()?.status !== "finished" || battleSnap.data()?.isAI === true) return;
  const battle = battleSnap.data() || {};
  const guestUids = (battle.participantUids || []).filter((uid) => battle.participants?.[uid]?.isGuest === true);
  await Promise.all(guestUids.map(async (uid) => {
    const participant = battle.participants?.[uid] || {};
    const accountRef = db.collection("crewGuestAccounts").doc(uid);
    const completionRef = accountRef.collection("battleCompletions").doc(battleId);
    await db.runTransaction(async (transaction) => {
      const [accountSnap, completionSnap] = await Promise.all([transaction.get(accountRef), transaction.get(completionRef)]);
      if (!accountSnap.exists || completionSnap.exists) return;
      transaction.set(completionRef, { battleId, answeredCount: Number(participant.answeredCount || 0), completedAt: FieldValue.serverTimestamp() });
      transaction.set(accountRef, {
        completedBattleCount: FieldValue.increment(1),
        totalBattleAnswers: FieldValue.increment(Number(participant.answeredCount || 0)),
        lastBattleAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });
    const accountSnap = await accountRef.get();
    if (accountSnap.exists && accountSnap.data()?.crewId) await reconcileCrewGrowthEvent(accountSnap.data().crewId);
  }));
}

function isGuestContext(context) {
  return !!context.auth?.uid && context.auth?.token?.firebase?.sign_in_provider === "anonymous";
}

function getCrewGuestAlias(uid = "") {
  const adjectives = ["반짝이는", "용감한", "차분한", "호기심 많은", "따뜻한", "씩씩한", "장난꾸러기", "똑똑한"];
  const nouns = ["여우", "수달", "고양이", "토끼", "별고래", "우주새", "판다", "다람쥐"];
  let hash = 0;
  const source = String(uid || `${Date.now()}-${Math.random()}`);
  for (let i = 0; i < source.length; i += 1) {
    hash = ((hash << 5) - hash + source.charCodeAt(i)) | 0;
  }
  const normalized = Math.abs(hash);
  const adjective = adjectives[normalized % adjectives.length];
  const noun = nouns[Math.floor(normalized / 7) % nouns.length];
  const suffix = String((normalized % 90) + 10);
  return `${adjective} ${noun} ${suffix}`;
}

// Public preview used by the guest entry screen before signing in anonymously.
// Returns just enough to render a confirm page: crew name, color, and whether
// guests are currently admitted. No sensitive data (meet URL) is exposed.
exports.previewCrewGuestInvite = regionalFunctions.https.onCall(async (data, context) => {
  const crewId = String(data?.crewId || "").trim();
  const inviteToken = cleanText(data?.inviteToken, 200);
  if (!crewId) throw new functions.https.HttpsError("invalid-argument", "크루 ID가 없습니다.");
  const crewSnap = await admin.firestore().collection("crews").doc(crewId).get();
  if (!crewSnap.exists) throw new functions.https.HttpsError("not-found", "초대받은 크루를 찾을 수 없습니다.");
  const crewData = crewSnap.data() || {};
  const referralInvite = inviteToken ? await referralBilling.resolveInvite(inviteToken) : null;
  const referralTracked = Boolean(
    referralInvite &&
    referralInvite.source === "crew_guest_invite" &&
    referralInvite.crewId === crewSnap.id
  );
  const isOwnInviteTest = Boolean(
    context.auth?.uid &&
    referralInvite?.referrerStudentUid &&
    referralInvite.referrerStudentUid === context.auth.uid
  );
  const registeredUserActive = Boolean(
    context.auth?.uid && context.auth?.token?.firebase?.sign_in_provider !== "anonymous"
  );
  const guestsAdmitted = crewData.guestAccessEnabled === true && (crewData.status || "pending") === "approved";
  return {
    crewId: crewSnap.id,
    crewName: crewData.name || "스터디 크루",
    crewColor: crewData.color || "#00d4ff",
    guestsAdmitted,
    status: crewData.status || "pending",
    referralTracked,
    isOwnInviteTest,
    registeredUserActive,
  };
});

// Called after the guest has signed in anonymously. Confirms the crew still
// admits guests and returns the crew snapshot the client uses to render the
// waiting room directly (without a users/{uid} doc).
exports.enterCrewAsGuest = guestSecurityFunctions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError("unauthenticated", "게스트 세션을 시작해 주세요.");
  }
  if (!isGuestContext(context)) {
    throw new functions.https.HttpsError("permission-denied", "익명 게스트 세션으로 입장해 주세요.");
  }
  const uid = context.auth.uid;
  const crewId = String(data?.crewId || "").trim();
  const inviteToken = cleanText(data?.inviteToken, 200);
  const installationId = cleanText(data?.installationId, 200);
  if (!crewId) throw new functions.https.HttpsError("invalid-argument", "크루 ID가 없습니다.");
  const db = admin.firestore();
  const crewSnap = await db.collection("crews").doc(crewId).get();
  if (!crewSnap.exists) throw new functions.https.HttpsError("not-found", "초대받은 크루를 찾을 수 없습니다.");
  const crewData = crewSnap.data() || {};
  const referralInvite = inviteToken ? await referralBilling.resolveInvite(inviteToken) : null;
  const trackedInvite = referralInvite && referralInvite.source === "crew_guest_invite" && referralInvite.crewId === crewSnap.id
    ? referralInvite
    : null;
  if ((crewData.status || "pending") !== "approved") {
    throw new functions.https.HttpsError("failed-precondition", "현재 입장할 수 없는 크루입니다.");
  }
  if (crewData.guestAccessEnabled !== true) {
    throw new functions.https.HttpsError("permission-denied", "크루 리더가 게스트 참여를 허용하지 않았습니다.");
  }
  const guestAlias = getCrewGuestAlias(uid);
  const nowMs = Date.now();
  const ipHash = guestSecurityHash(getRequestIp(context));
  const installationHash = guestSecurityHash(installationId);
  const accountRef = db.collection("crewGuestAccounts").doc(uid);
  const [existingAccount, sameDeviceSnap, sameIpSnap] = await Promise.all([
    accountRef.get(),
    installationHash ? db.collection("crewGuestAccounts").where("installationHash", "==", installationHash).limit(20).get() : Promise.resolve(null),
    ipHash ? db.collection("crewGuestAccounts").where("ipHash", "==", ipHash).limit(50).get() : Promise.resolve(null),
  ]);
  if (existingAccount.exists && ["suspended", "deleted"].includes(existingAccount.data()?.status)) {
    throw new functions.https.HttpsError("permission-denied", "운영자에 의해 중지된 게스트 계정입니다.");
  }
  const duplicateDevice = Boolean(sameDeviceSnap?.docs.some((docSnap) => docSnap.id !== uid && docSnap.data()?.crewId === crewId && docSnap.data()?.status !== "deleted"));
  const recentSameIpCount = sameIpSnap?.docs.filter((docSnap) => docSnap.id !== uid && docSnap.data()?.crewId === crewId && nowMs - Number(docSnap.data()?.firstJoinedAtMs || 0) <= 60 * 60 * 1000).length || 0;
  const riskFlags = [
    ...(duplicateDevice ? ["duplicate_device"] : []),
    ...(recentSameIpCount >= 2 ? ["ip_burst_3_plus"] : []),
  ];
  const eventReviewStatus = duplicateDevice ? "excluded" : (recentSameIpCount >= 2 ? "review" : (existingAccount.data()?.eventReviewStatus || "clear"));

  await Promise.all([crewSnap.ref.collection("guestSessions").doc(uid).set({
    uid,
    crewId: crewSnap.id,
    alias: guestAlias,
    isGuest: true,
    state: "online",
    joinedAt: FieldValue.serverTimestamp(),
    lastSeenAt: FieldValue.serverTimestamp(),
    referralInviteId: trackedInvite?.id || null,
    referrerParentUid: trackedInvite?.referrerParentUid || null,
    referrerStudentUid: trackedInvite?.referrerStudentUid || null,
  }, { merge: true }), accountRef.set({
    uid,
    crewId: crewSnap.id,
    crewName: crewData.name || "스터디 크루",
    alias: guestAlias,
    status: "active",
    referralInviteId: trackedInvite?.id || null,
    referrerParentUid: trackedInvite?.referrerParentUid || null,
    referrerStudentUid: trackedInvite?.referrerStudentUid || null,
    installationHash,
    ipHash,
    isDuplicateDevice: duplicateDevice,
    recentSameIpCount: recentSameIpCount + 1,
    ...(riskFlags.length ? { riskFlags: FieldValue.arrayUnion(...riskFlags) } : {}),
    eventReviewStatus,
    firstJoinedAt: existingAccount.exists ? (existingAccount.data()?.firstJoinedAt || FieldValue.serverTimestamp()) : FieldValue.serverTimestamp(),
    firstJoinedAtMs: existingAccount.exists ? Number(existingAccount.data()?.firstJoinedAtMs || nowMs) : nowMs,
    lastJoinedAt: FieldValue.serverTimestamp(),
    lastSeenAt: FieldValue.serverTimestamp(),
    expiresAt: Timestamp.fromMillis(nowMs + (30 * 24 * 60 * 60 * 1000)),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true })]);
  return {
    crewId: crewSnap.id,
    crewName: crewData.name || "스터디 크루",
    crewColor: crewData.color || "#00d4ff",
    guestAlias,
    guestUid: uid,
    referralTracked: Boolean(trackedInvite),
    referralToken: trackedInvite ? inviteToken : null,
  };
});

exports.touchCrewGuestPresence = regionalFunctions.https.onCall(async (data, context) => {
  if (!isGuestContext(context)) {
    throw new functions.https.HttpsError("permission-denied", "게스트 세션에서만 사용할 수 있습니다.");
  }
  const uid = context.auth.uid;
  const crewId = String(data?.crewId || "").trim();
  if (!crewId) throw new functions.https.HttpsError("invalid-argument", "크루 ID가 없습니다.");
  const db = admin.firestore();
  const crewRef = db.collection("crews").doc(crewId);
  const crewSnap = await crewRef.get();
  if (!crewSnap.exists) throw new functions.https.HttpsError("not-found", "크루를 찾을 수 없습니다.");
  const crewData = crewSnap.data() || {};
  if (crewData.guestAccessEnabled !== true || (crewData.status || "pending") !== "approved") {
    throw new functions.https.HttpsError("permission-denied", "현재 게스트 참여가 허용되지 않습니다.");
  }
  const guestAccountRef = db.collection("crewGuestAccounts").doc(uid);
  const guestAccountSnap = await guestAccountRef.get();
  if (guestAccountSnap.exists && ["suspended", "deleted"].includes(guestAccountSnap.data()?.status)) {
    throw new functions.https.HttpsError("permission-denied", "운영자에 의해 중지된 게스트 계정입니다.");
  }
  await Promise.all([
    crewRef.collection("guestSessions").doc(uid).set({
      uid,
      crewId,
      alias: getCrewGuestAlias(uid),
      isGuest: true,
      state: "online",
      lastSeenAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + (30 * 24 * 60 * 60 * 1000)),
    }, { merge: true }),
    guestAccountRef.set({
      uid,
      crewId,
      crewName: crewData.name || "스터디 크루",
      alias: getCrewGuestAlias(uid),
      status: "active",
      ...(!guestAccountSnap.exists ? { eventReviewStatus: "clear", firstJoinedAt: FieldValue.serverTimestamp(), firstJoinedAtMs: Date.now() } : {}),
      lastSeenAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true }),
  ]);
  return { success: true };
});

exports.leaveCrewGuestSession = regionalFunctions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) return { success: true };
  const uid = context.auth.uid;
  const crewId = String(data?.crewId || "").trim();
  if (crewId) {
    await admin.firestore().collection("crews").doc(crewId).collection("guestSessions").doc(uid).delete();
  }
  return { success: true };
});

exports.getCrewGrowthEventProgress = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const crewId = cleanId(data?.crewId, 160);
  if (!crewId) throw new functions.https.HttpsError("invalid-argument", "크루 ID가 없습니다.");
  const db = admin.firestore();
  const [crewSnap, guestSnap] = await Promise.all([
    db.collection("crews").doc(crewId).get(),
    db.collection("crewGuestAccounts").doc(uid).get(),
  ]);
  if (!crewSnap.exists) throw new functions.https.HttpsError("not-found", "크루를 찾을 수 없습니다.");
  const crew = crewSnap.data() || {};
  const isMember = crew.leaderId === uid || (crew.memberIds || []).includes(uid);
  const isCrewGuest = guestSnap.exists && guestSnap.data()?.crewId === crewId;
  if (!isMember && !isCrewGuest) throw new functions.https.HttpsError("permission-denied", "이 크루의 이벤트만 확인할 수 있습니다.");
  const progress = await reconcileCrewGrowthEvent(crewId);
  return {
    target: CREW_GROWTH_EVENT_TARGET,
    reward: CREW_GROWTH_EVENT_REWARD,
    memberCount: progress.memberCount,
    activeGuestCount: progress.activeGuestCount,
    pendingGuestCount: progress.pendingGuests.length,
    eligibleCount: progress.eligibleCount,
    achievedAtMs: Number(progress.event?.achievedAtMs || 0),
    verificationEndsAtMs: Number(progress.event?.verificationEndsAtMs || 0),
    rewarded: Boolean(progress.event?.rewardedAt),
  };
});

exports.adminListCrewGuestAccounts = regionalFunctions.https.onCall(async (data, context) => {
  await requireAdminUid(context);
  const crewId = cleanId(data?.crewId, 160);
  let queryRef = admin.firestore().collection("crewGuestAccounts");
  if (crewId) queryRef = queryRef.where("crewId", "==", crewId);
  const snap = await queryRef.limit(300).get();
  const nowMs = Date.now();
  const guests = snap.docs.map((docSnap) => {
    const row = docSnap.data() || {};
    return {
      uid: docSnap.id,
      alias: row.alias || "게스트 탐사원",
      crewId: row.crewId || "",
      crewName: row.crewName || "",
      status: row.status || "active",
      eventReviewStatus: row.eventReviewStatus || "clear",
      riskFlags: row.riskFlags || [],
      completedBattleCount: Number(row.completedBattleCount || 0),
      totalBattleAnswers: Number(row.totalBattleAnswers || 0),
      firstJoinedAtMs: Number(row.firstJoinedAtMs || 0),
      lastSeenAtMs: timestampMillis(row.lastSeenAt || row.updatedAt),
      recentSameIpCount: Number(row.recentSameIpCount || 0),
      referralInviteId: row.referralInviteId || "",
      referrerStudentUid: row.referrerStudentUid || "",
      eventEligible: isCrewGrowthGuestEligible(row, nowMs),
    };
  }).sort((a, b) => b.firstJoinedAtMs - a.firstJoinedAtMs);
  return { guests };
});

exports.adminReviewCrewGuestAccount = regionalFunctions.https.onCall(async (data, context) => {
  const adminUid = await requireAdminUid(context);
  const guestUid = cleanId(data?.guestUid, 200);
  const status = cleanId(data?.status, 30);
  if (!guestUid || !["clear", "review", "excluded"].includes(status)) {
    throw new functions.https.HttpsError("invalid-argument", "검토 정보를 확인해 주세요.");
  }
  const ref = admin.firestore().collection("crewGuestAccounts").doc(guestUid);
  const snap = await ref.get();
  if (!snap.exists) throw new functions.https.HttpsError("not-found", "게스트 계정을 찾을 수 없습니다.");
  await ref.set({ eventReviewStatus: status, reviewedBy: adminUid, reviewedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  if (snap.data()?.crewId) await reconcileCrewGrowthEvent(snap.data().crewId);
  return { success: true };
});

exports.adminSetCrewGuestSuspended = regionalFunctions.https.onCall(async (data, context) => {
  const adminUid = await requireAdminUid(context);
  const guestUid = cleanId(data?.guestUid, 200);
  const suspended = data?.suspended === true;
  if (!guestUid) throw new functions.https.HttpsError("invalid-argument", "게스트 UID가 없습니다.");
  const db = admin.firestore();
  const accountRef = db.collection("crewGuestAccounts").doc(guestUid);
  const accountSnap = await accountRef.get();
  if (!accountSnap.exists) throw new functions.https.HttpsError("not-found", "게스트 계정을 찾을 수 없습니다.");
  const account = accountSnap.data() || {};
  if (account.status === "deleted") throw new functions.https.HttpsError("failed-precondition", "이미 삭제된 계정입니다.");
  await Promise.all([
    admin.auth().updateUser(guestUid, { disabled: suspended }),
    suspended && account.crewId ? db.collection("crews").doc(account.crewId).collection("guestSessions").doc(guestUid).delete() : Promise.resolve(),
    accountRef.set({
      status: suspended ? "suspended" : "active",
      eventReviewStatus: suspended ? "excluded" : "clear",
      suspensionUpdatedBy: adminUid,
      suspensionUpdatedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true }),
  ]);
  if (account.crewId) await reconcileCrewGrowthEvent(account.crewId);
  return { success: true, suspended };
});

exports.adminDeleteCrewGuestAccount = regionalFunctions.https.onCall(async (data, context) => {
  const adminUid = await requireAdminUid(context);
  const guestUid = cleanId(data?.guestUid, 200);
  if (!guestUid) throw new functions.https.HttpsError("invalid-argument", "게스트 UID가 없습니다.");
  const db = admin.firestore();
  const accountRef = db.collection("crewGuestAccounts").doc(guestUid);
  const accountSnap = await accountRef.get();
  if (!accountSnap.exists) throw new functions.https.HttpsError("not-found", "게스트 계정을 찾을 수 없습니다.");
  const account = accountSnap.data() || {};
  await Promise.all([
    admin.auth().deleteUser(guestUid).catch((err) => {
      if (err?.code !== "auth/user-not-found") throw err;
    }),
    account.crewId ? db.collection("crews").doc(account.crewId).collection("guestSessions").doc(guestUid).delete() : Promise.resolve(),
    accountRef.set({ status: "deleted", eventReviewStatus: "excluded", deletedBy: adminUid, deletedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true }),
  ]);
  if (account.crewId) await reconcileCrewGrowthEvent(account.crewId);
  return { success: true };
});

exports.finalizeCrewGrowthEvents = regionalFunctions.pubsub
  .schedule("every 1 hours")
  .timeZone("Asia/Seoul")
  .onRun(async () => {
    const snap = await admin.firestore().collection("crews").where("status", "==", "approved").get();
    await Promise.all(snap.docs.map((docSnap) => reconcileCrewGrowthEvent(docSnap.id, { allowReward: true }).catch((err) => {
      console.warn("Crew growth event reconciliation failed", docSnap.id, err);
    })));
    return null;
  });

exports.cleanupExpiredCrewGuestAccounts = regionalFunctions.pubsub
  .schedule("every 24 hours")
  .timeZone("Asia/Seoul")
  .onRun(async () => {
    const db = admin.firestore();
    const snap = await db.collection("crewGuestAccounts").where("expiresAt", "<=", Timestamp.now()).limit(200).get();
    await Promise.all(snap.docs.map(async (docSnap) => {
      const row = docSnap.data() || {};
      await Promise.all([
        admin.auth().deleteUser(docSnap.id).catch(() => {}),
        row.crewId ? db.collection("crews").doc(row.crewId).collection("guestSessions").doc(docSnap.id).delete().catch(() => {}) : Promise.resolve(),
        db.recursiveDelete(docSnap.ref),
      ]);
    }));
    return null;
  });

// Crew leader toggle: turn guest admission on/off for their crew.
// Stored on the crew document so it can be checked synchronously by every
// guest-gated callable (enterCrewAsGuest, enterStudyCrewMeet, postStudyCrewGreeting).
exports.setCrewGuestAccess = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const crewId = String(data?.crewId || "").trim();
  const allowGuests = data?.allowGuests === true;
  if (!crewId) throw new functions.https.HttpsError("invalid-argument", "크루 ID가 없습니다.");
  const db = admin.firestore();
  const crewRef = db.collection("crews").doc(crewId);
  const crewSnap = await crewRef.get();
  if (!crewSnap.exists) throw new functions.https.HttpsError("not-found", "크루를 찾을 수 없습니다.");
  const crewData = crewSnap.data() || {};
  if (crewData.leaderId !== uid) {
    throw new functions.https.HttpsError("permission-denied", "크루 리더만 게스트 참여를 설정할 수 있습니다.");
  }
  await crewRef.set({
    guestAccessEnabled: allowGuests,
    guestAccessUpdatedAt: FieldValue.serverTimestamp(),
    guestAccessUpdatedBy: uid,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  if (!allowGuests) {
    const guestSessionsSnap = await crewRef.collection("guestSessions").get();
    if (!guestSessionsSnap.empty) {
      const batch = db.batch();
      guestSessionsSnap.docs.forEach((guestSessionDoc) => batch.delete(guestSessionDoc.ref));
      await batch.commit();
    }
  }
  return { success: true, guestAccessEnabled: allowGuests };
});

exports.enterStudyCrewMeet = regionalFunctions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError("unauthenticated", "이 작업을 수행하려면 로그인해야 합니다.");
  }
  const uid = context.auth.uid;
  const guest = isGuestContext(context);
  const crewId = String(data?.crewId || "").trim();
  if (!crewId) throw new functions.https.HttpsError("invalid-argument", "크루 ID가 없습니다.");

  const db = admin.firestore();
  const crewSnap = await db.collection("crews").doc(crewId).get();
  if (!crewSnap.exists) throw new functions.https.HttpsError("not-found", "크루를 찾을 수 없습니다.");
  const crewData = crewSnap.data() || {};

  if (guest) {
    // Anonymous guest: admitted only when the crew leader has enabled guests.
    if (crewData.guestAccessEnabled !== true) {
      throw new functions.https.HttpsError("permission-denied", "크루 리더가 게스트 참여를 허용하지 않았습니다.");
    }
  } else {
    // Regular member/admin: require membership.
    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists) throw new functions.https.HttpsError("failed-precondition", "사용자 문서를 찾을 수 없습니다.");
    const userData = userSnap.data() || {};
    const isAdminUser = userData.role === "admin";
    const isMember = userData.crewId === crewId || getCrewMemberIds(crewData).includes(uid);
    if (!isAdminUser && !isMember) {
      throw new functions.https.HttpsError("permission-denied", "같은 크루 멤버만 입장할 수 있습니다.");
    }
  }

  if ((crewData.status || "pending") !== "approved") {
    throw new functions.https.HttpsError("failed-precondition", "승인된 크루만 입장할 수 있습니다.");
  }
  const googleMeetUrl = String(crewData.googleMeetUrl || "").trim();
  if (!googleMeetUrl) {
    throw new functions.https.HttpsError("failed-precondition", "운영자가 Google Meet 주소를 준비 중입니다.");
  }
  return {
    success: true,
    googleMeetUrl,
    crew: {
      id: crewSnap.id,
      name: crewData.name || "스터디 크루",
    },
  };
});

exports.enterOpenStudyMeet = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const requestedPoolId = String(data?.poolId || "").trim();
  if (!OPEN_STUDY_POOLS[requestedPoolId]) {
    throw new functions.https.HttpsError("invalid-argument", "오픈 스터디 구분이 올바르지 않습니다.");
  }

  const db = admin.firestore();
  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) throw new functions.https.HttpsError("failed-precondition", "사용자 문서를 찾을 수 없습니다.");

  const userData = userSnap.data() || {};
  const recommendedPoolId = getOpenStudyPoolIdFromGrade(userData);
  const isAdminUser = userData.role === "admin";
  if (!isAdminUser && requestedPoolId !== "free" && requestedPoolId !== recommendedPoolId) {
    throw new functions.https.HttpsError("failed-precondition", "내 학년에 맞는 오픈 스터디만 참여할 수 있습니다.");
  }

  const poolSnap = await db.collection("openStudyPools").doc(requestedPoolId).get();
  const pool = buildOpenStudyPoolPayload(requestedPoolId, poolSnap.exists ? (poolSnap.data() || {}) : {});
  const googleMeetUrl = String(pool.googleMeetUrl || "").trim();
  if (!googleMeetUrl) {
    throw new functions.https.HttpsError("failed-precondition", "운영자가 Google Meet 주소를 준비 중입니다.");
  }
  return {
    success: true,
    googleMeetUrl,
    pool,
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
    if (!canOperatorGift(senderData, context) && (senderData.role === "parent" || senderData.role === "admin")) {
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
        const unitLabel = itemId === "photon_shield" ? `${item.transferAmount}회 방어` : `${item.transferAmount}개`;
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
    const operatorGiftExempt = canOperatorGift(senderData, context);
    if (!canOperatorGift(senderData, context) && (senderData.role === "parent" || senderData.role === "admin")) {
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
    if (!operatorGiftExempt && sentToday + amount > CRYSTAL_GIFT_DAILY_LIMIT) {
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
    if (!operatorGiftExempt) {
      tx.set(limitRef, {
        senderId,
        dayKey,
        sentAmount: sentToday + amount,
        updatedAt: nowTimestamp,
      }, { merge: true });
    }
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
      remainingToday: operatorGiftExempt ? null : CRYSTAL_GIFT_DAILY_LIMIT - sentToday - amount,
      dailyLimit: operatorGiftExempt ? null : CRYSTAL_GIFT_DAILY_LIMIT,
      operatorGiftExempt,
    };
  });

  return {
    success: true,
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

async function contributePerfectAssignmentToCrewChest(assignmentId, assignment = {}) {
  const userId = cleanId(assignment.userId, 160);
  if (!userId || Number(assignment.bonusCrystals || 0) !== 40 || assignment.status !== "reviewed") {
    return { contributed: false, reason: "not_qualified" };
  }

  const db = admin.firestore();
  const userRef = db.collection("users").doc(userId);
  const userSnap = await userRef.get();
  if (!userSnap.exists) return { contributed: false, reason: "user_not_found" };
  const userData = userSnap.data() || {};
  const crewId = cleanId(userData.crewId, 160);
  if (!crewId || userData.isGuest === true) return { contributed: false, reason: "no_regular_crew" };

  const crewRef = db.collection("crews").doc(crewId);
  const contributionRef = crewRef.collection("crystalChestEvents").doc(assignmentId);
  const dateKey = getKSTDateString();
  const contributorDailyRef = crewRef.collection("crystalChestContributorDays").doc(`${dateKey}_${userId}`);
  const crewDailyRef = crewRef.collection("crystalChestDays").doc(dateKey);
  const contributorName = cleanText(getDisplayNameFromUser(userData), 40) || "크루 대원";
  const now = new Date();

  return db.runTransaction(async (transaction) => {
    const [crewSnap, contributionSnap, contributorDailySnap, crewDailySnap] = await Promise.all([
      transaction.get(crewRef),
      transaction.get(contributionRef),
      transaction.get(contributorDailyRef),
      transaction.get(crewDailyRef),
    ]);
    if (!crewSnap.exists) return { contributed: false, reason: "crew_not_found" };
    if (contributionSnap.exists) return { contributed: false, reason: "already_recorded" };

    const crew = crewSnap.data() || {};
    const memberIds = getCrewMemberIds(crew);
    if (crew.status !== "approved" || !memberIds.includes(userId)) {
      return { contributed: false, reason: "not_approved_member" };
    }

    const contributorDaily = contributorDailySnap.exists ? (contributorDailySnap.data() || {}) : {};
    const crewDaily = crewDailySnap.exists ? (crewDailySnap.data() || {}) : {};
    const contributedToday = Number(contributorDaily.contributedAmount || 0);
    const completedToday = Number(crewDaily.completedCount || 0);
    const withinContributorLimit = contributedToday < CREW_CRYSTAL_CHEST_CONTRIBUTOR_DAILY_LIMIT;
    const withinCrewLimit = completedToday < CREW_CRYSTAL_CHEST_DAILY_COMPLETION_LIMIT;
    const acceptedAmount = withinContributorLimit && withinCrewLimit
      ? Math.min(
          CREW_CRYSTAL_CHEST_PERFECT_ASSIGNMENT,
          CREW_CRYSTAL_CHEST_CONTRIBUTOR_DAILY_LIMIT - contributedToday
        )
      : 0;

    const chest = crew.crystalChest && typeof crew.crystalChest === "object" ? crew.crystalChest : {};
    const previousEnergy = Math.max(0, Math.min(CREW_CRYSTAL_CHEST_TARGET - 1, Number(chest.energy || 0)));
    const nextRawEnergy = previousEnergy + acceptedAmount;
    const boxCompleted = acceptedAmount > 0 && nextRawEnergy >= CREW_CRYSTAL_CHEST_TARGET;
    const nextCycle = Math.max(0, Number(chest.cycle || 0)) + (boxCompleted ? 1 : 0);
    const contributorIds = uniqueIds([...(Array.isArray(chest.currentContributorIds) ? chest.currentContributorIds : []), ...(acceptedAmount > 0 ? [userId] : [])]);
    const contributorNamesById = {
      ...(chest.currentContributorNamesById && typeof chest.currentContributorNamesById === "object" ? chest.currentContributorNamesById : {}),
      ...(acceptedAmount > 0 ? { [userId]: contributorName } : {}),
    };
    const rewardRef = boxCompleted
      ? crewRef.collection("crystalChestRewards").doc(`cycle_${nextCycle}`)
      : null;

    transaction.set(contributionRef, {
      crewId,
      assignmentId,
      contributorId: userId,
      contributorName,
      type: "perfect_assignment",
      title: "과제 피드백 40광석 달성",
      requestedAmount: CREW_CRYSTAL_CHEST_PERFECT_ASSIGNMENT,
      acceptedAmount,
      boxCompleted,
      cycle: nextCycle,
      dateKey,
      assignmentDate: cleanText(assignment.date, 20),
      clusterId: cleanText(assignment.clusterId, 80),
      reason: acceptedAmount > 0
        ? "accepted"
        : withinCrewLimit ? "contributor_daily_limit" : "crew_daily_completion_limit",
      createdAt: now,
    });

    if (acceptedAmount > 0) {
      transaction.set(contributorDailyRef, {
        crewId,
        userId,
        dateKey,
        contributionCount: Number(contributorDaily.contributionCount || 0) + 1,
        contributedAmount: contributedToday + acceptedAmount,
        updatedAt: now,
      }, { merge: true });
    }

    transaction.set(crewDailyRef, {
      crewId,
      dateKey,
      completedCount: completedToday + (boxCompleted ? 1 : 0),
      contributionAmount: Number(crewDaily.contributionAmount || 0) + acceptedAmount,
      updatedAt: now,
    }, { merge: true });

    transaction.set(crewRef, {
      crystalChest: {
        energy: boxCompleted ? nextRawEnergy - CREW_CRYSTAL_CHEST_TARGET : nextRawEnergy,
        target: CREW_CRYSTAL_CHEST_TARGET,
        cycle: nextCycle,
        currentContributorIds: boxCompleted ? [] : contributorIds,
        currentContributorNamesById: boxCompleted ? {} : contributorNamesById,
        lastContributorId: userId,
        lastContributorName: contributorName,
        lastContributionAmount: acceptedAmount,
        lastContributionAt: now,
        dailyCompletionLimit: CREW_CRYSTAL_CHEST_DAILY_COMPLETION_LIMIT,
        memberReward: CREW_CRYSTAL_CHEST_MEMBER_REWARD,
        updatedAt: now,
      },
    }, { merge: true });

    if (boxCompleted && rewardRef) {
      transaction.set(rewardRef, {
        crewId,
        cycle: nextCycle,
        rewardAmount: CREW_CRYSTAL_CHEST_MEMBER_REWARD,
        eligibleMemberIds: memberIds,
        claimedMemberIds: [],
        contributorIds,
        contributorNames: contributorIds.map((id) => contributorNamesById[id] || "크루 대원"),
        applauseUserIds: [],
        applauseCount: 0,
        dateKey,
        status: "ready",
        createdAt: now,
      });
      memberIds.forEach((memberId) => {
        transaction.set(db.collection("notifications").doc(`crew_chest_ready_${crewId}_${nextCycle}_${memberId}`), {
          recipientId: memberId,
          type: "crew_crystal_chest_ready",
          message: `${contributorIds.map((id) => contributorNamesById[id]).filter(Boolean).slice(0, 3).join(", ")} 대원의 성취로 크루 광석 상자가 완성되었습니다.`,
          link: "/?view=crew",
          isRead: false,
          createdAt: now,
          metadata: { crewId, rewardId: rewardRef.id, cycle: nextCycle, rewardAmount: CREW_CRYSTAL_CHEST_MEMBER_REWARD },
        }, { merge: true });
      });
    }

    return {
      contributed: acceptedAmount > 0,
      acceptedAmount,
      boxCompleted,
      cycle: nextCycle,
      energy: boxCompleted ? nextRawEnergy - CREW_CRYSTAL_CHEST_TARGET : nextRawEnergy,
      reason: acceptedAmount > 0 ? "accepted" : withinCrewLimit ? "contributor_daily_limit" : "crew_daily_completion_limit",
    };
  });
}

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
    await Promise.all([
      admin.firestore().collection("notifications").doc(`assignment_bonus_${context.params.assignmentId}`).set({
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
      }, { merge: true }),
      contributePerfectAssignmentToCrewChest(context.params.assignmentId, after),
    ]);

    return null;
  });

async function requireCrewChestAccess(uid, crewId, guest = false) {
  const db = admin.firestore();
  const crewRef = db.collection("crews").doc(crewId);
  const [crewSnap, guestAccountSnap] = await Promise.all([
    crewRef.get(),
    guest ? db.collection("crewGuestAccounts").doc(uid).get() : Promise.resolve(null),
  ]);
  if (!crewSnap.exists) {
    throw new functions.https.HttpsError("not-found", "크루를 찾을 수 없습니다.");
  }
  const crew = crewSnap.data() || {};
  if (guest) {
    const account = guestAccountSnap?.exists ? (guestAccountSnap.data() || {}) : {};
    if (account.crewId !== crewId || ["deleted", "suspended"].includes(account.status)) {
      throw new functions.https.HttpsError("permission-denied", "이 크루의 게스트만 상자 현황을 볼 수 있습니다.");
    }
  } else if (!getCrewMemberIds(crew).includes(uid)) {
    throw new functions.https.HttpsError("permission-denied", "크루 멤버만 상자 현황을 볼 수 있습니다.");
  }
  return { crewRef, crew };
}

exports.getCrewCrystalChest = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const crewId = cleanId(data?.crewId, 160);
  if (!crewId) throw new functions.https.HttpsError("invalid-argument", "크루 ID가 없습니다.");
  const guest = isGuestContext(context);
  const { crewRef, crew } = await requireCrewChestAccess(uid, crewId, guest);
  const [eventsSnap, rewardsSnap] = await Promise.all([
    crewRef.collection("crystalChestEvents").orderBy("createdAt", "desc").limit(10).get(),
    crewRef.collection("crystalChestRewards").orderBy("createdAt", "desc").limit(8).get(),
  ]);
  const events = eventsSnap.docs
    .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() || {}) }))
    .filter((event) => Number(event.acceptedAmount || 0) > 0)
    .map((event) => ({
      id: event.id,
      type: event.type || "perfect_assignment",
      title: event.title || "과제 피드백 40광석 달성",
      contributorId: event.contributorId || "",
      contributorName: event.contributorName || "크루 대원",
      acceptedAmount: Number(event.acceptedAmount || 0),
      boxCompleted: event.boxCompleted === true,
      cycle: Number(event.cycle || 0),
      dateKey: event.dateKey || "",
      createdAtMs: timestampMillis(event.createdAt),
    }));
  const rewards = rewardsSnap.docs.map((docSnap) => {
    const reward = docSnap.data() || {};
    const eligible = Array.isArray(reward.eligibleMemberIds) && reward.eligibleMemberIds.includes(uid);
    const claimed = Array.isArray(reward.claimedMemberIds) && reward.claimedMemberIds.includes(uid);
    return {
      id: docSnap.id,
      cycle: Number(reward.cycle || 0),
      rewardAmount: Number(reward.rewardAmount || CREW_CRYSTAL_CHEST_MEMBER_REWARD),
      contributorNames: Array.isArray(reward.contributorNames) ? reward.contributorNames.slice(0, 10) : [],
      applauseCount: Number(reward.applauseCount || 0),
      applaudedByMe: Array.isArray(reward.applauseUserIds) && reward.applauseUserIds.includes(uid),
      eligible: !guest && eligible,
      claimed: !guest && claimed,
      available: !guest && eligible && !claimed,
      createdAtMs: timestampMillis(reward.createdAt),
    };
  });
  const chest = crew.crystalChest && typeof crew.crystalChest === "object" ? crew.crystalChest : {};
  return {
    crewId,
    isGuest: guest,
    energy: Number(chest.energy || 0),
    target: Number(chest.target || CREW_CRYSTAL_CHEST_TARGET),
    cycle: Number(chest.cycle || 0),
    memberReward: CREW_CRYSTAL_CHEST_MEMBER_REWARD,
    perfectAssignmentContribution: CREW_CRYSTAL_CHEST_PERFECT_ASSIGNMENT,
    contributorDailyLimit: CREW_CRYSTAL_CHEST_CONTRIBUTOR_DAILY_LIMIT,
    dailyCompletionLimit: CREW_CRYSTAL_CHEST_DAILY_COMPLETION_LIMIT,
    memberDailyClaimLimit: CREW_CRYSTAL_CHEST_MEMBER_DAILY_CLAIM_LIMIT,
    currentContributorNames: Object.values(chest.currentContributorNamesById || {}).slice(0, 10),
    events,
    rewards,
    availableRewards: rewards.filter((reward) => reward.available),
  };
});

exports.claimCrewCrystalChestReward = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  if (isGuestContext(context)) {
    throw new functions.https.HttpsError("permission-denied", "게스트는 광석을 수령할 수 없지만 축하와 박수에는 참여할 수 있습니다.");
  }
  const crewId = cleanId(data?.crewId, 160);
  const rewardId = cleanId(data?.rewardId, 160);
  if (!crewId || !rewardId) throw new functions.https.HttpsError("invalid-argument", "상자 보상 정보가 올바르지 않습니다.");
  await requireCrewChestAccess(uid, crewId, false);

  const db = admin.firestore();
  const crewRef = db.collection("crews").doc(crewId);
  const rewardRef = crewRef.collection("crystalChestRewards").doc(rewardId);
  const userRef = db.collection("users").doc(uid);
  const dateKey = getKSTDateString();
  const claimDayRef = userRef.collection("crewCrystalChestClaimDays").doc(dateKey);
  const txId = `crew_chest_${crewId}_${rewardId}`;
  const crystalTxRef = userRef.collection("crystal_transactions").doc(txId);

  return db.runTransaction(async (transaction) => {
    const [rewardSnap, userSnap, claimDaySnap, existingTxSnap] = await Promise.all([
      transaction.get(rewardRef),
      transaction.get(userRef),
      transaction.get(claimDayRef),
      transaction.get(crystalTxRef),
    ]);
    if (!rewardSnap.exists) throw new functions.https.HttpsError("not-found", "수령할 상자를 찾을 수 없습니다.");
    if (!userSnap.exists) throw new functions.https.HttpsError("failed-precondition", "사용자 문서를 찾을 수 없습니다.");
    if (existingTxSnap.exists) return { success: true, alreadyClaimed: true, amount: 0 };

    const reward = rewardSnap.data() || {};
    const eligibleMemberIds = Array.isArray(reward.eligibleMemberIds) ? reward.eligibleMemberIds : [];
    const claimedMemberIds = Array.isArray(reward.claimedMemberIds) ? reward.claimedMemberIds : [];
    if (!eligibleMemberIds.includes(uid)) {
      throw new functions.https.HttpsError("permission-denied", "상자가 완성될 때 함께한 정식 크루원만 받을 수 있습니다.");
    }
    if (claimedMemberIds.includes(uid)) return { success: true, alreadyClaimed: true, amount: 0 };

    const rewardAmount = Math.max(0, Number(reward.rewardAmount || CREW_CRYSTAL_CHEST_MEMBER_REWARD));
    const claimDay = claimDaySnap.exists ? (claimDaySnap.data() || {}) : {};
    const claimedToday = Number(claimDay.claimedAmount || 0);
    if (claimedToday + rewardAmount > CREW_CRYSTAL_CHEST_MEMBER_DAILY_CLAIM_LIMIT) {
      throw new functions.https.HttpsError("resource-exhausted", `오늘은 크루 상자에서 최대 ${CREW_CRYSTAL_CHEST_MEMBER_DAILY_CLAIM_LIMIT}광석까지 받을 수 있습니다. 내일 다시 열어주세요.`);
    }

    const userData = userSnap.data() || {};
    transaction.set(userRef, {
      crystals: Number(userData.crystals || 0) + rewardAmount,
      ...calculateGrowthUpdates(userData, rewardAmount),
      lastCrewCrystalChestClaimAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    recordCrystalTransaction(transaction, uid, txId, {
      amount: rewardAmount,
      type: "crew_crystal_chest_reward",
      description: "크루 공동 광석 상자 보상",
      metadata: { crewId, rewardId, cycle: Number(reward.cycle || 0), contributorNames: reward.contributorNames || [] },
    });
    transaction.set(rewardRef, {
      claimedMemberIds: FieldValue.arrayUnion(uid),
      lastClaimedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.set(claimDayRef, {
      crewId,
      dateKey,
      claimedAmount: claimedToday + rewardAmount,
      claimCount: Number(claimDay.claimCount || 0) + 1,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.set(db.collection("notifications").doc(`crew_chest_ready_${crewId}_${Number(reward.cycle || 0)}_${uid}`), {
      isRead: true,
      readAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return { success: true, alreadyClaimed: false, amount: rewardAmount };
  });
});

exports.applaudCrewCrystalChest = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const crewId = cleanId(data?.crewId, 160);
  const rewardId = cleanId(data?.rewardId, 160);
  if (!crewId || !rewardId) throw new functions.https.HttpsError("invalid-argument", "상자 정보가 올바르지 않습니다.");
  const guest = isGuestContext(context);
  const { crewRef } = await requireCrewChestAccess(uid, crewId, guest);
  const rewardRef = crewRef.collection("crystalChestRewards").doc(rewardId);
  const result = await admin.firestore().runTransaction(async (transaction) => {
    const rewardSnap = await transaction.get(rewardRef);
    if (!rewardSnap.exists) throw new functions.https.HttpsError("not-found", "축하할 상자를 찾을 수 없습니다.");
    const reward = rewardSnap.data() || {};
    const applauseUserIds = Array.isArray(reward.applauseUserIds) ? reward.applauseUserIds : [];
    if (applauseUserIds.includes(uid)) {
      return { added: false, applauseCount: Number(reward.applauseCount || applauseUserIds.length), contributorIds: reward.contributorIds || [] };
    }
    const applauseCount = Math.max(Number(reward.applauseCount || 0), applauseUserIds.length) + 1;
    transaction.set(rewardRef, {
      applauseUserIds: FieldValue.arrayUnion(uid),
      applauseCount,
      lastApplaudedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return { added: true, applauseCount, contributorIds: reward.contributorIds || [], cycle: Number(reward.cycle || 0) };
  });
  if (result.added && Array.isArray(result.contributorIds) && result.contributorIds.length > 0) {
    const batch = admin.firestore().batch();
    result.contributorIds.slice(0, 20).forEach((contributorId) => {
      batch.set(admin.firestore().collection("notifications").doc(`crew_chest_applause_${crewId}_${rewardId}_${contributorId}`), {
        recipientId: contributorId,
        type: "crew_crystal_chest_applause",
        message: `크루원 ${result.applauseCount}명이 광석 상자에 기여한 활약에 박수를 보냈습니다!`,
        link: "/?view=crew",
        isRead: false,
        createdAt: FieldValue.serverTimestamp(),
        metadata: { crewId, rewardId, cycle: result.cycle || 0, applauseCount: result.applauseCount },
      }, { merge: true });
    });
    await batch.commit();
  }
  return { success: true, applauded: result.added, applauseCount: result.applauseCount };
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
    const nowMillis = Date.now();
    const now = admin.firestore.Timestamp.fromMillis(nowMillis);
    const deliverAtMillis = nowMillis;
    const deliverAt = admin.firestore.Timestamp.fromMillis(deliverAtMillis);
    const status = "delivered";

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
    tx.set(limitRef, {
      recipientId,
      lastImmediateSentAt: now,
      lastSentAt: now,
      updatedAt: now,
    }, { merge: true });
    createDirectMemoNotification(tx, memoRef, memoData);

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

exports.sweepOpenStudyRooms = regionalFunctions.pubsub
  .schedule("every 1 minutes")
  .timeZone("Asia/Seoul")
  .onRun(async () => {
    const db = admin.firestore();
    const now = new Date();
    const roomSnap = await db.collection("studyRooms")
      .where("roomType", "==", "openStudy")
      .limit(100)
      .get();

    const rooms = roomSnap.docs
      .map((docSnap) => ({ ref: docSnap.ref, data: docSnap.data() || {} }))
      .filter((room) => (room.data.status || "waiting") !== "ended");

    for (const room of rooms) {
      await db.runTransaction(async (tx) => {
        const freshRoomSnap = await tx.get(room.ref);
        if (!freshRoomSnap.exists) return;
        const roomData = freshRoomSnap.data() || {};
        if (roomData.roomType !== "openStudy" || (roomData.status || "waiting") === "ended") return;
        await syncOpenStudyRoomParticipantsTransaction(tx, db, freshRoomSnap.ref, roomData, now);
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
      maxParticipants: 100,
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
      studyRoomCapacity: 0,
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
  const participantRef = roomRef.collection("participants").doc(uid);

  await db.runTransaction(async (tx) => {
    const [userSnap, roomSnap, participantSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(roomRef),
      tx.get(participantRef),
    ]);
    if (!userSnap.exists) {
      throw new functions.https.HttpsError("failed-precondition", "사용자 문서를 찾을 수 없습니다.");
    }
    if (!roomSnap.exists) {
      throw new functions.https.HttpsError("not-found", "집중방을 찾을 수 없습니다.");
    }

    const userData = userSnap.data() || {};
    const roomData = roomSnap.data() || {};
    const isOpenStudyRoom = roomData.roomType === "openStudy";
    if ((roomData.status || "waiting") === "ended") {
      const participantData = participantSnap.exists ? (participantSnap.data() || {}) : {};
      const lastSeenMs = getTimestampMillis(participantData.lastSeenAt) || 0;
      const canRepairEndedOpenStudyRoom = isOpenStudyRoom &&
        participantSnap.exists &&
        Date.now() - lastSeenMs <= getOpenStudyParticipantStaleMs(roomData);
      if (!canRepairEndedOpenStudyRoom) {
        throw new functions.https.HttpsError("failed-precondition", "이미 종료된 집중방입니다.");
      }
    }
    if (!isOpenStudyRoom && userData.crewId !== roomData.crewId) {
      throw new functions.https.HttpsError("permission-denied", "같은 크루 멤버만 입장할 수 있습니다.");
    }

    const participantIds = Array.isArray(roomData.participantIds) ? roomData.participantIds : [];
    const maxParticipants = Number(roomData.maxParticipants || 100);
    if (!participantIds.includes(uid) && participantIds.length >= maxParticipants) {
      throw new functions.https.HttpsError("failed-precondition", "이 집중방은 이미 가득 찼습니다.");
    }

    const nextParticipantIds = participantIds.includes(uid) ? participantIds : [...participantIds, uid];
    const nextCount = nextParticipantIds.length;
    const nextStatus = nextCount >= 2 ? "live" : "waiting";
    const now = new Date();
    const participantRole = roomData.hostUid === uid ? "host" : "member";
    const participantData = participantSnap.exists ? (participantSnap.data() || {}) : {};

    tx.set(roomRef, {
      participantIds: nextParticipantIds,
      participantCount: nextCount,
      status: nextStatus,
      startedAt: roomData.startedAt || (nextStatus === "live" ? now : null),
      lastActivityAt: now,
      kickedParticipantIds: FieldValue.arrayRemove(uid),
    }, { merge: true });
    tx.set(participantRef, {
      uid,
      displayName: getDisplayNameFromUser(userData),
      role: participantRole,
      peerId: typeof participantData.peerId === "string" ? participantData.peerId : "",
      cameraOn: typeof participantData.cameraOn === "boolean" ? participantData.cameraOn : false,
      micOn: typeof participantData.micOn === "boolean" ? participantData.micOn : false,
      focusStatus: participantData.focusStatus || "focused",
      chatMessage: typeof participantData.chatMessage === "string" ? participantData.chatMessage : "",
      chatUpdatedAt: participantData.chatUpdatedAt || null,
      joinedAt: participantData.joinedAt || now,
      lastSeenAt: now,
      deviceLabel: "browser",
      presenceState: "active",
    }, { merge: true });
    if (isOpenStudyRoom) {
      tx.set(userRef, {
        activeOpenStudyRoomId: roomId,
        activeOpenStudyPoolId: roomData.poolId || "",
        activeOpenStudyRoomStatus: nextStatus,
        updatedAt: now,
      }, { merge: true });
    } else {
      tx.set(db.collection("crews").doc(roomData.crewId), {
        activeStudyRoomId: roomId,
        activeStudyRoomStatus: nextStatus,
        updatedAt: now,
      }, { merge: true });
    }

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

exports.joinOpenStudyRoom = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const requestedPoolId = String(data?.poolId || "").trim();
  const db = admin.firestore();
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    throw new functions.https.HttpsError("failed-precondition", "사용자 문서를 찾을 수 없습니다.");
  }

  const userData = userSnap.data() || {};
  const recommendedPoolId = getOpenStudyPoolIdFromGrade(userData);
  const poolId = OPEN_STUDY_POOLS[requestedPoolId] ? requestedPoolId : recommendedPoolId;
  const isAdminUser = userData.role === "admin";
  if (!OPEN_STUDY_POOLS[poolId]) {
    throw new functions.https.HttpsError("invalid-argument", "참여할 수 없는 오픈 스터디입니다.");
  }
  if (!isAdminUser && poolId !== "free" && poolId !== recommendedPoolId) {
    throw new functions.https.HttpsError("failed-precondition", "내 학년에 맞는 오픈 스터디만 참여할 수 있습니다.");
  }

  const nowMs = Date.now();
  const activeOpenStudyRoomId = String(userData.activeOpenStudyRoomId || "").trim();
  if (activeOpenStudyRoomId) {
    const activeOpenRoomRef = db.collection("studyRooms").doc(activeOpenStudyRoomId);
    const [activeOpenRoomSnap, activeOpenParticipantSnap] = await Promise.all([
      activeOpenRoomRef.get(),
      activeOpenRoomRef.collection("participants").doc(uid).get(),
    ]);
    if (activeOpenRoomSnap.exists && activeOpenParticipantSnap.exists) {
      const activeOpenRoomData = activeOpenRoomSnap.data() || {};
      const activeParticipantData = activeOpenParticipantSnap.data() || {};
      const activeLastSeenMs = getTimestampMillis(activeParticipantData.lastSeenAt) || nowMs;
      const activeStaleMs = getOpenStudyParticipantStaleMs(activeOpenRoomData);
      if (
        activeOpenRoomData.roomType === "openStudy" &&
        activeOpenRoomData.poolId === poolId &&
        nowMs - activeLastSeenMs <= activeStaleMs
      ) {
        const now = new Date();
        const activeParticipantIds = Array.isArray(activeOpenRoomData.participantIds)
          ? activeOpenRoomData.participantIds.filter(Boolean)
          : [];
        const repairedParticipantIds = activeParticipantIds.includes(uid)
          ? activeParticipantIds
          : [...activeParticipantIds, uid];
        const repairedStatus = repairedParticipantIds.length >= 2 ? "live" : "waiting";
        await activeOpenRoomRef.set({
          participantIds: repairedParticipantIds,
          participantCount: repairedParticipantIds.length,
          status: repairedStatus,
          startedAt: activeOpenRoomData.startedAt || (repairedStatus === "live" ? now : null),
          endedAt: null,
          lastActivityAt: now,
          kickedParticipantIds: FieldValue.arrayRemove(uid),
        }, { merge: true });
        await activeOpenRoomRef.collection("participants").doc(uid).set({
          lastSeenAt: now,
          presenceState: "active",
        }, { merge: true });
        await userRef.set({
          activeOpenStudyRoomId,
          activeOpenStudyPoolId: poolId,
          activeOpenStudyRoomStatus: repairedStatus,
          updatedAt: now,
        }, { merge: true });
        return {
          success: true,
          roomId: activeOpenStudyRoomId,
          pool: OPEN_STUDY_POOLS[activeOpenRoomData.poolId] || OPEN_STUDY_POOLS.free,
          reused: true,
          repaired: true,
        };
      }
    }
  }
  const activeMembershipSnap = await db.collection("studyRooms")
    .where("participantIds", "array-contains", uid)
    .limit(10)
    .get();
  const activeMemberships = activeMembershipSnap.docs
    .map((docSnap) => ({ ref: docSnap.ref, id: docSnap.id, data: docSnap.data() || {} }))
    .filter((room) => isActiveOpenStudyRoom(room.data, nowMs));
  const existingOpenStudyRoom = activeMemberships.find((room) => room.data.roomType === "openStudy");
  if (existingOpenStudyRoom) {
    return {
      success: true,
      roomId: existingOpenStudyRoom.id,
      pool: OPEN_STUDY_POOLS[existingOpenStudyRoom.data.poolId] || OPEN_STUDY_POOLS.free,
      reused: true,
    };
  }
  if (activeMemberships.length > 0) {
    throw new functions.https.HttpsError("failed-precondition", "이미 다른 집중방에 참여 중입니다.");
  }

  const poolConfig = OPEN_STUDY_POOLS[poolId];
  const maxParticipants = Number(poolConfig.maxParticipants || 100);
  const roomQuerySnap = await db.collection("studyRooms")
    .where("roomType", "==", "openStudy")
    .limit(100)
    .get();
  const candidateRefs = roomQuerySnap.docs
    .map((docSnap) => {
      const roomData = docSnap.data() || {};
      const participantIds = Array.isArray(roomData.participantIds) ? roomData.participantIds : [];
      const roomMax = Number(roomData.maxParticipants || maxParticipants);
      return { ref: docSnap.ref, id: docSnap.id, roomData, participantIds, roomMax };
    })
    .filter((candidate) => (
      candidate.roomData.poolId === poolId &&
      isActiveOpenStudyRoom(candidate.roomData, nowMs)
    ))
    .sort((a, b) => {
      const aCount = a.participantIds.length;
      const bCount = b.participantIds.length;
      const aScore = aCount > 0 ? 100 + aCount : 0;
      const bScore = bCount > 0 ? 100 + bCount : 0;
      return bScore - aScore;
    })
    .slice(0, 10);

  const result = await db.runTransaction(async (tx) => {
    const poolRef = db.collection("openStudyPools").doc(poolId);
    const [freshUserSnap, poolSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(poolRef),
    ]);
    if (!freshUserSnap.exists) {
      throw new functions.https.HttpsError("failed-precondition", "사용자 문서를 찾을 수 없습니다.");
    }

    const freshUserData = freshUserSnap.data() || {};
    const displayName = getDisplayNameFromUser(freshUserData);
    const now = new Date();
    let selectedRoomRef = null;
    let selectedRoomData = null;
    let selectedParticipantIds = [];
    let selectedStaleParticipantIds = [];
    const prioritizedRefs = [];
    const poolData = poolSnap.exists ? (poolSnap.data() || {}) : {};
    const currentRoomId = String(poolData.currentRoomId || "").trim();
    const seenRoomIds = new Set();

    if (currentRoomId) {
      prioritizedRefs.push({ ref: db.collection("studyRooms").doc(currentRoomId), id: currentRoomId });
      seenRoomIds.add(currentRoomId);
    }
    candidateRefs.forEach((candidate) => {
      if (seenRoomIds.has(candidate.id)) return;
      prioritizedRefs.push(candidate);
      seenRoomIds.add(candidate.id);
    });

    for (const candidate of prioritizedRefs) {
      const roomSnap = await tx.get(candidate.ref);
      if (!roomSnap.exists) continue;
      const roomData = roomSnap.data() || {};
      const roomMax = Number(roomData.maxParticipants || maxParticipants);
      if (!isActiveOpenStudyRoom(roomData, now.getTime())) continue;
      const participantState = await getFreshOpenStudyParticipantState(tx, roomSnap.ref, roomData, now.getTime());
      const participantIds = participantState.activeIds;

      if (participantIds.includes(uid)) {
        selectedRoomRef = roomSnap.ref;
        selectedRoomData = roomData;
        selectedParticipantIds = participantIds;
        selectedStaleParticipantIds = participantState.staleIds;
        break;
      }
      if (participantIds.length >= roomMax) continue;

      selectedRoomRef = roomSnap.ref;
      selectedRoomData = roomData;
      selectedParticipantIds = participantIds;
      selectedStaleParticipantIds = participantState.staleIds;
      break;
    }

    if (!selectedRoomRef) {
      selectedRoomRef = db.collection("studyRooms").doc();
      selectedRoomData = {
        roomType: "openStudy",
        poolId,
        poolLabel: poolConfig.label,
        crewId: "",
        crewName: poolConfig.title,
        crewColor: poolConfig.color,
        title: `${poolConfig.label} 오픈 스터디`,
        hostUid: uid,
        hostName: displayName,
        status: "waiting",
        mode: "open-study",
        maxParticipants,
        durationMinutes: 50,
        participantIds: [],
        participantCount: 0,
        peerServerMode: "peerjs-public",
        chatEnabled: true,
        micsEnabled: true,
        createdAt: now,
        startedAt: null,
        endedAt: null,
        lastActivityAt: now,
      };
      selectedParticipantIds = [];
      selectedStaleParticipantIds = [];
    }

    const nextParticipantIds = selectedParticipantIds.includes(uid)
      ? selectedParticipantIds
      : [...selectedParticipantIds, uid];
    const nextCount = nextParticipantIds.length;
    const nextStatus = nextCount >= 2 ? "live" : "waiting";
    const existingHostUid = selectedRoomData.hostUid || "";
    const nextHostUid = nextParticipantIds.includes(existingHostUid) ? existingHostUid : (selectedParticipantIds[0] || uid);
    let nextHostName = selectedRoomData.hostName || displayName;
    if (nextHostUid === uid) {
      nextHostName = displayName;
    } else if (nextHostUid !== existingHostUid) {
      const nextHostSnap = await tx.get(db.collection("users").doc(nextHostUid));
      nextHostName = nextHostSnap.exists ? getDisplayNameFromUser(nextHostSnap.data() || {}) : "탐사원";
    }
    const participantRole = nextHostUid === uid ? "host" : "member";
    const nextCurrentRoomId = nextCount >= maxParticipants ? "" : selectedRoomRef.id;
    const selectedParticipantRef = selectedRoomRef.collection("participants").doc(uid);
    const selectedParticipantSnap = await tx.get(selectedParticipantRef);
    const selectedParticipantData = selectedParticipantSnap.exists ? (selectedParticipantSnap.data() || {}) : {};

    selectedStaleParticipantIds.forEach((participantId) => {
      tx.delete(selectedRoomRef.collection("participants").doc(participantId));
    });

    tx.set(poolRef, {
      ...poolConfig,
      currentRoomId: nextCurrentRoomId,
      activeRoomCountHint: Math.max(1, Number(poolData.activeRoomCountHint || 0)),
      updatedAt: now,
    }, { merge: true });

    tx.set(selectedRoomRef, {
      ...selectedRoomData,
      roomType: "openStudy",
      poolId,
      poolLabel: poolConfig.label,
      crewId: "",
      crewName: poolConfig.title,
      crewColor: poolConfig.color,
      title: selectedRoomData.title || `${poolConfig.label} 오픈 스터디`,
      hostUid: nextHostUid,
      hostName: nextHostName,
      maxParticipants,
      participantIds: nextParticipantIds,
      participantCount: nextCount,
      status: nextStatus,
      startedAt: selectedRoomData.startedAt || (nextStatus === "live" ? now : null),
      endedAt: null,
      lastActivityAt: now,
      kickedParticipantIds: FieldValue.arrayRemove(uid),
    }, { merge: true });

    tx.set(selectedParticipantRef, {
      uid,
      displayName,
      role: participantRole,
      peerId: typeof selectedParticipantData.peerId === "string" ? selectedParticipantData.peerId : "",
      cameraOn: typeof selectedParticipantData.cameraOn === "boolean" ? selectedParticipantData.cameraOn : false,
      micOn: typeof selectedParticipantData.micOn === "boolean" ? selectedParticipantData.micOn : false,
      focusStatus: selectedParticipantData.focusStatus || "focused",
      chatMessage: typeof selectedParticipantData.chatMessage === "string" ? selectedParticipantData.chatMessage : "",
      chatUpdatedAt: selectedParticipantData.chatUpdatedAt || null,
      joinedAt: selectedParticipantData.joinedAt || now,
      lastSeenAt: now,
      deviceLabel: "browser",
      presenceState: "active",
    }, { merge: true });

    tx.set(userRef, {
      activeOpenStudyRoomId: selectedRoomRef.id,
      activeOpenStudyPoolId: poolId,
      activeOpenStudyRoomStatus: nextStatus,
      updatedAt: now,
    }, { merge: true });

    return { roomId: selectedRoomRef.id, status: nextStatus };
  });

  return {
    success: true,
    roomId: result.roomId,
    status: result.status,
    pool: poolConfig,
  };
});

exports.leaveOpenStudyRoom = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const roomId = String(data?.roomId || "").trim();
  if (!roomId) {
    throw new functions.https.HttpsError("invalid-argument", "방 ID가 없습니다.");
  }

  const db = admin.firestore();
  const roomRef = db.collection("studyRooms").doc(roomId);
  const userRef = db.collection("users").doc(uid);

  await db.runTransaction(async (tx) => {
    const roomSnap = await tx.get(roomRef);
    if (roomSnap.exists) {
      const roomData = roomSnap.data() || {};
      if (roomData.roomType !== "openStudy") {
        throw new functions.https.HttpsError("failed-precondition", "오픈 스터디 방이 아닙니다.");
      }
      await removeParticipantFromStudyRoomTransaction(tx, db, roomRef, roomData, uid);
    }

    tx.set(userRef, {
      activeOpenStudyRoomId: "",
      activeOpenStudyPoolId: "",
      activeOpenStudyRoomStatus: "",
      updatedAt: new Date(),
    }, { merge: true });
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

    tx.set(roomRef, {
      kickedParticipantIds: FieldValue.arrayUnion(targetUid),
      lastKickedParticipantId: targetUid,
      lastKickedByUid: uid,
      lastKickedAt: new Date(),
    }, { merge: true });
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
    await reconcileCrewGrowthEvent(crewId).catch((err) => {
      console.warn("Crew growth event sync after member leave failed", crewId, err);
    });
  }

  return { success: true, deletedCrew: false };
});

// Referral attribution, family billing, and monthly tuition statements.
exports.getOrCreateReferralInvite = referralBilling.getOrCreateReferralInvite;
exports.previewReferralInvite = referralBilling.previewReferralInvite;
exports.getParentReferralDashboard = referralBilling.getParentReferralDashboard;
exports.adminGetFamilyBillingDashboard = referralBilling.adminGetFamilyBillingDashboard;
exports.adminUpdateFamilyBilling = referralBilling.adminUpdateFamilyBilling;
exports.adminUpdateStudentEnrollment = referralBilling.adminUpdateStudentEnrollment;
exports.adminConfigureReferralApplication = referralBilling.adminConfigureReferralApplication;
exports.adminPrepareFamilyBillingStatement = referralBilling.adminPrepareFamilyBillingStatement;
exports.adminSendFamilyBillingNotice = referralBilling.adminSendFamilyBillingNotice;
exports.adminMarkBillingNoticeSent = referralBilling.adminMarkBillingNoticeSent;
exports.prepareMonthlyFamilyBillingStatements = referralBilling.prepareMonthlyFamilyBillingStatements;
