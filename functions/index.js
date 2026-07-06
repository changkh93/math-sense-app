const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
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
const FUNCTIONS_REGION = "asia-northeast3";
const regionalFunctions = functions.region(FUNCTIONS_REGION);
const accountDeletionFunctions = regionalFunctions.runWith({ timeoutSeconds: 540, memory: "1GB" });
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
  crew_join_pass: {
    name: "스터디 크루 참여권",
    cost: 300,
    ownedMode: "count",
    senderField: "crewJoinPasses",
    recipientField: "crewJoinPasses",
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

const QUIZ_BATTLE_QUESTION_COUNT = 15;
const QUIZ_BATTLE_QUEUE_TTL_MS = 45 * 1000;
const QUIZ_BATTLE_DURATION_MS = 12 * 60 * 1000;
const QUIZ_BATTLE_CORRECT_ORE = 2;
const QUIZ_BATTLE_WIN_BONUS = 20;
const QUIZ_BATTLE_LOSER_COMPLETION_REWARD = 10;
const QUIZ_BATTLE_DRAW_REWARD = 20;

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

function sanitizeQuizForBattle(docSnap) {
  const data = docSnap.data() || {};
  const options = (Array.isArray(data.options) ? data.options : [])
    .slice(0, 8)
    .map((option, index) => ({
      key: `o${index}`,
      text: getQuizOptionText(option).slice(0, 500),
    }))
    .filter((option) => option.text);
  const correctKeys = getCorrectOptionKeys(data);

  return {
    questionId: docSnap.id,
    sourceQuestionId: cleanId(data.id || docSnap.id),
    unitId: cleanId(data.unitId),
    order: Number(data.order || 0),
    question: String(data.question || data.prompt || "").slice(0, 2000),
    imageUrl: String(data.imageUrl || "").slice(0, 1000),
    options,
    multiAnswer: correctKeys.length > 1,
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

  const chaptersSnap = await db.collection("chapters").where("regionId", "==", regionId).get();
  const chapters = chaptersSnap.docs
    .map((chapter) => ({ id: chapter.id, ...(chapter.data() || {}) }))
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

  const unitDocs = [];
  const unitSnaps = await Promise.all(
    chapters.map((chapter) => db.collection("units").where("chapterId", "==", chapter.id).get())
  );
  unitSnaps.forEach((unitsSnap) => {
    unitsSnap.docs
      .map((unit) => ({ id: unit.id, ...(unit.data() || {}) }))
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

async function buildBattleQuestionSet(context, commonCeilingOrdinal, questionCount, seed) {
  const db = admin.firestore();
  const eligibleUnits = context.units.filter((unit) => unit.ordinal <= commonCeilingOrdinal);
  const quizSnaps = await Promise.all(
    eligibleUnits.map((unit) => db.collection("quizzes").where("unitId", "==", unit.id).get())
  );
  const quizDocs = [];
  quizSnaps.forEach((snap, index) => {
    const unit = eligibleUnits[index];
    snap.docs.forEach((quizDoc) => {
      const sanitized = sanitizeQuizForBattle(quizDoc);
      if (sanitized.question && sanitized.options.length >= 2 && getCorrectOptionKeys(quizDoc.data() || {}).length > 0) {
        quizDocs.push({
          ...sanitized,
          unitTitle: unit.title,
          unitOrdinal: unit.ordinal,
        });
      }
    });
  });

  const selected = shuffleBattleItems(quizDocs, seed).slice(0, questionCount);
  if (selected.length < questionCount) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      `공통 범위에 배틀 문제 ${questionCount}개가 아직 준비되지 않았습니다.`
    );
  }

  return selected.map((question, index) => ({
    ...question,
    battleOrder: index + 1,
  }));
}

function getBattleParticipantData(battleData = {}, uid) {
  return battleData.participants?.[uid] || {};
}

function calculateBattleRewards(participants = {}, participantUids = []) {
  const [aUid, bUid] = participantUids;
  const a = participants[aUid] || {};
  const b = participants[bUid] || {};
  const aScore = Number(a.score || 0);
  const bScore = Number(b.score || 0);
  const aCorrect = Number(a.correctCount || 0);
  const bCorrect = Number(b.correctCount || 0);

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
  } else if (Number(a.lastAnsweredAtMs || 0) && Number(b.lastAnsweredAtMs || 0)) {
    if (Number(a.lastAnsweredAtMs || 0) < Number(b.lastAnsweredAtMs || 0)) {
      winnerUid = aUid;
      resultType = "win";
    } else if (Number(b.lastAnsweredAtMs || 0) < Number(a.lastAnsweredAtMs || 0)) {
      winnerUid = bUid;
      resultType = "win";
    }
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
      result = {
        alreadyFinalized: true,
        winnerUid: battleData.winnerUid || "",
        rewards: battleData.rewards || {},
      };
      return;
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

    const rewardResult = calculateBattleRewards(participants, participantUids);
    const finalUpdates = {
      status: "finished",
      finishedAt: FieldValue.serverTimestamp(),
      finishedAtMs: nowMs,
      finalizeReason,
      winnerUid: rewardResult.winnerUid,
      resultType: rewardResult.resultType,
      rewards: rewardResult.rewards,
    };
    transaction.update(battleRef, finalUpdates);

    participantUids.forEach((uid) => {
      const participant = participants[uid] || {};
      const reward = Number(rewardResult.rewards[uid] || 0);
      const userRef = db.collection("users").doc(uid);
      const historyRef = userRef.collection("history").doc(`quiz_battle_${battleId}`);
      const statsRef = userRef.collection("battleStats").doc("summary");
      const txId = `quiz_battle_${battleId}`;
      const didWin = rewardResult.winnerUid === uid;
      const didDraw = !rewardResult.winnerUid;
      const didLose = !didWin && !didDraw;

      transaction.set(userRef, {
        crystals: FieldValue.increment(reward),
        totalBattleMatches: FieldValue.increment(1),
        totalBattleWins: FieldValue.increment(didWin ? 1 : 0),
        totalBattleLosses: FieldValue.increment(didLose ? 1 : 0),
        totalBattleDraws: FieldValue.increment(didDraw ? 1 : 0),
        lastBattleAt: FieldValue.serverTimestamp(),
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
        score: Number(participant.score || 0),
        correctCount: Number(participant.correctCount || 0),
        totalCount: totalQuestions,
        crystalsEarned: reward,
        battleResult: didWin ? "win" : didDraw ? "draw" : "loss",
        opponentUid: participantUids.find((otherUid) => otherUid !== uid) || "",
        timestamp: FieldValue.serverTimestamp(),
      }, { merge: true });

      transaction.set(statsRef, {
        totalMatches: FieldValue.increment(1),
        wins: FieldValue.increment(didWin ? 1 : 0),
        losses: FieldValue.increment(didLose ? 1 : 0),
        draws: FieldValue.increment(didDraw ? 1 : 0),
        totalCorrect: FieldValue.increment(Number(participant.correctCount || 0)),
        totalScore: FieldValue.increment(Number(participant.score || 0)),
        lastBattleAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    result = {
      alreadyFinalized: false,
      winnerUid: rewardResult.winnerUid,
      rewards: rewardResult.rewards,
    };
  });

  return result;
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

exports.joinQuizBattleQueue = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const clusterId = cleanId(data?.clusterId || "cluster_elementary");
  const regionId = cleanId(data?.regionId);
  const entryUnitId = cleanId(data?.entryUnitId);
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
  const ticketId = `${uid}_${regionId}`;
  const ticketRef = db.collection("quizBattleQueueTickets").doc(ticketId);
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  const userData = userSnap.exists ? userSnap.data() || {} : {};
  const existingTicketSnap = await ticketRef.get();
  if (existingTicketSnap.exists) {
    const existingTicket = existingTicketSnap.data() || {};
    if (existingTicket.status === "matched" && existingTicket.matchId) {
      const existingBattleSnap = await db.collection("quizBattles").doc(existingTicket.matchId).get();
      if (existingBattleSnap.exists) {
        const existingBattle = existingBattleSnap.data() || {};
        if (existingBattle.status !== "finished") {
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
      await ticketRef.set({
        status: "waiting",
        matchId: "",
        expiresAtMs: nowMs + QUIZ_BATTLE_QUEUE_TTL_MS,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  }

  const waitingSnap = await db.collection("quizBattleQueueTickets")
    .where("clusterId", "==", contextData.clusterId)
    .where("regionId", "==", regionId)
    .where("status", "==", "waiting")
    .orderBy("createdAtMs", "asc")
    .limit(12)
    .get();

  const candidates = waitingSnap.docs
    .map((docSnap) => ({ id: docSnap.id, ref: docSnap.ref, data: docSnap.data() || {} }))
    .filter((ticket) => ticket.id !== ticketId)
    .filter((ticket) => ticket.data.uid !== uid)
    .filter((ticket) => Number(ticket.data.expiresAtMs || 0) > nowMs);

  for (const candidate of candidates) {
    const commonCeilingOrdinal = Math.min(
      Number(contextData.entryOrdinal || 0),
      Number(candidate.data.entryOrdinal || 0)
    );
    if (!commonCeilingOrdinal) continue;

    let questionSet = [];
    try {
      questionSet = await buildBattleQuestionSet(
        contextData,
        commonCeilingOrdinal,
        requestedQuestionCount,
        `${uid}_${candidate.data.uid}_${nowMs}`
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
    const expiresAtMs = nowMs + QUIZ_BATTLE_DURATION_MS;
    const participantUids = [uid, opponentUid].sort();

    const matched = await db.runTransaction(async (transaction) => {
      const [candidateSnap, ownSnap] = await Promise.all([
        transaction.get(candidate.ref),
        transaction.get(ticketRef),
      ]);
      if (!candidateSnap.exists) return false;
      const freshCandidate = candidateSnap.data() || {};
      if (freshCandidate.status !== "waiting" || Number(freshCandidate.expiresAtMs || 0) <= nowMs) {
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
        score: 0,
        correctCount: 0,
        answeredCount: 0,
        ready: true,
        entryUnitId,
        entryUnitTitle: contextData.units.find((unit) => unit.id === entryUnitId)?.title || "",
      };
      participants[opponentUid] = {
        uid: opponentUid,
        displayName: freshCandidate.displayName || getPublicStudentName(opponentData, "상대"),
        score: 0,
        correctCount: 0,
        answeredCount: 0,
        ready: true,
        entryUnitId: freshCandidate.entryUnitId || "",
        entryUnitTitle: freshCandidate.entryUnitTitle || "",
      };

      transaction.set(battleRef, {
        status: "active",
        clusterId: contextData.clusterId,
        regionId,
        regionTitle: contextData.regionTitle || "",
        commonCeilingOrdinal,
        participantUids,
        participants,
        entryUnitIds: {
          [uid]: entryUnitId,
          [opponentUid]: freshCandidate.entryUnitId || "",
        },
        questionCount: questionSet.length,
        questionSet,
        startedAt: FieldValue.serverTimestamp(),
        startedAtMs: nowMs,
        endsAtMs: expiresAtMs,
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
        clusterId: contextData.clusterId,
        regionId,
        entryUnitId,
        entryUnitTitle: contextData.units.find((unit) => unit.id === entryUnitId)?.title || "",
        entryOrdinal: contextData.entryOrdinal,
        expiresAtMs: nowMs + QUIZ_BATTLE_QUEUE_TTL_MS,
        createdAt: FieldValue.serverTimestamp(),
        createdAtMs: nowMs,
        ...matchPatch,
      }, { merge: true });
      return true;
    });

    if (matched) {
      return { status: "matched", battleId: battleRef.id };
    }
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
          if (freshBattle.status !== "finished" && !endedByTimer && !endedByForfeit) {
            return { status: "matched", battleId: freshTicket.matchId };
          }
        }
      }
    }

    transaction.set(ticketRef, {
      uid,
      displayName: getPublicStudentName(userData),
      clusterId: contextData.clusterId,
      regionId,
      entryUnitId,
      entryUnitTitle: contextData.units.find((unit) => unit.id === entryUnitId)?.title || "",
      entryOrdinal: contextData.entryOrdinal,
      status: "waiting",
      matchId: "",
      questionCount: requestedQuestionCount,
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

  const ticketRef = admin.firestore().collection("quizBattleQueueTickets").doc(`${uid}_${regionId}`);
  await admin.firestore().runTransaction(async (transaction) => {
    const snap = await transaction.get(ticketRef);
    if (!snap.exists) return;
    const ticket = snap.data() || {};
    if (ticket.uid !== uid || ticket.status !== "waiting") return;
    transaction.set(ticketRef, {
      status: "cancelled",
      cancelledAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  return { success: true };
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
  const quizRef = db.collection("quizzes").doc(questionId);
  const nowMs = Date.now();
  let answerResult = null;

  await db.runTransaction(async (transaction) => {
    const [battleSnap, answerSnap, quizSnap] = await Promise.all([
      transaction.get(battleRef),
      transaction.get(answerRef),
      transaction.get(quizRef),
    ]);

    if (!battleSnap.exists) {
      throw new functions.https.HttpsError("not-found", "배틀을 찾을 수 없습니다.");
    }
    if (!quizSnap.exists) {
      throw new functions.https.HttpsError("not-found", "문제를 찾을 수 없습니다.");
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

    const correctKeys = getCorrectOptionKeys(quizSnap.data() || {});
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

exports.forfeitQuizBattle = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const battleId = cleanId(data?.battleId);
  if (!battleId) {
    throw new functions.https.HttpsError("invalid-argument", "배틀 정보가 올바르지 않습니다.");
  }

  const db = admin.firestore();
  const battleRef = db.collection("quizBattles").doc(battleId);
  const nowMs = Date.now();

  // 배틀을 포기 표시한다. 이미 종료됐으면 그대로 결과를 반환한다.
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

exports.submitStudyCrewDailyMission = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
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

    if (!userSnap.exists) {
      throw new functions.https.HttpsError("failed-precondition", "사용자 문서를 찾을 수 없습니다.");
    }
    if (!scopeSnap.exists && scopeType !== "openStudy") {
      throw new functions.https.HttpsError("not-found", "미션을 남길 크루 또는 방을 찾을 수 없습니다.");
    }

    const userData = userSnap.data() || {};
    const scopeData = scopeSnap.exists ? (scopeSnap.data() || {}) : {};
    const mission = resolveStudyCrewMissionForDate(dateKey, planSnap.exists ? (planSnap.data() || {}) : null);
    if (mission.disabled) {
      throw new functions.https.HttpsError("failed-precondition", "오늘의 크루 미션이 운영자에 의해 비활성화되었습니다.");
    }
    savedMission = mission;
    let targetIds = [];
    if (scopeType === "crew") {
      targetIds = getCrewMemberIds(scopeData);
      if (!targetIds.includes(uid)) {
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
    const shouldAwardIndividual = !responseSnap.exists
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

exports.enterStudyCrewMeet = regionalFunctions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const crewId = String(data?.crewId || "").trim();
  if (!crewId) throw new functions.https.HttpsError("invalid-argument", "크루 ID가 없습니다.");

  const db = admin.firestore();
  const [userSnap, crewSnap] = await Promise.all([
    db.collection("users").doc(uid).get(),
    db.collection("crews").doc(crewId).get(),
  ]);
  if (!userSnap.exists) throw new functions.https.HttpsError("failed-precondition", "사용자 문서를 찾을 수 없습니다.");
  if (!crewSnap.exists) throw new functions.https.HttpsError("not-found", "크루를 찾을 수 없습니다.");

  const userData = userSnap.data() || {};
  const crewData = crewSnap.data() || {};
  const isAdminUser = userData.role === "admin";
  const isMember = userData.crewId === crewId || getCrewMemberIds(crewData).includes(uid);
  if (!isAdminUser && !isMember) {
    throw new functions.https.HttpsError("permission-denied", "같은 크루 멤버만 입장할 수 있습니다.");
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
  }

  return { success: true, deletedCrew: false };
});
