/* global require, module */
const { FieldValue, Timestamp } = require("firebase-admin/firestore");
const {
  WEEKLY_GROWTH_LOOP_SCHEMA_VERSION,
  WEEKLY_GROWTH_LOOP_PROMPT_VERSION,
  LEARNING_SUMMARY_SCHEMA_VERSION,
  getKstWeekBoundaries,
  buildLoopId,
  buildCommandId,
  computePayloadHash,
  validateCommandId,
  validateExpectedRevision,
  validateObservationCodes,
  validatePrideCode,
  validateStrategyCode,
  validateGoalTemplateIds,
  validatePreviousGoalOutcomes,
} = require("./weeklyGrowthLoopPolicy.cjs");

function toIsoString(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}

function serializeLoop(loopId, data) {
  const evidence = data.reviewedWeek?.evidence || {};
  return {
    id: loopId,
    ...data,
    reviewedWeek: data.reviewedWeek
      ? {
        ...data.reviewedWeek,
        evidence: {
          ...evidence,
          learningSummaryUpdatedAt: toIsoString(evidence.learningSummaryUpdatedAt),
        },
      }
      : data.reviewedWeek,
    openedAt: toIsoString(data.openedAt),
    completedAt: toIsoString(data.completedAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

module.exports = function ({ functions, admin, regionalFunctions, costOptimizedDataFunctions }) {
  const db = admin.firestore();
  const weeklyGrowthFunctions = costOptimizedDataFunctions || regionalFunctions;

  function observeAppCheck(context, functionName) {
    if (context.app) return;
    console.warn("[weeklyGrowthLoop] App Check token missing", {
      functionName,
      authenticated: Boolean(context.auth?.uid),
    });
  }

  function requireMutationEnvelope(data) {
    const commandValidation = validateCommandId(data?.commandId);
    if (!commandValidation.valid) {
      throw new functions.https.HttpsError("invalid-argument", commandValidation.error);
    }
    const revisionValidation = validateExpectedRevision(data?.expectedRevision);
    if (!revisionValidation.valid) {
      throw new functions.https.HttpsError("invalid-argument", revisionValidation.error);
    }
    if (typeof data?.weekStartKey !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data.weekStartKey)) {
      throw new functions.https.HttpsError("invalid-argument", "weekStartKey 형식이 올바르지 않습니다.");
    }
  }

  function assertCurrentWeek(requestedWeekStartKey, currentWeekStartKey) {
    if (requestedWeekStartKey !== currentWeekStartKey) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "새 주가 시작되었습니다. 화면을 닫고 이번 주 항로를 다시 열어주세요."
      );
    }
  }

  /**
   * 1. openWeeklyGrowthLoop
   * 사용자 클릭 시 주간 루프 문서 조회 또는 1회 스냅샷 생성
   */
  const openWeeklyGrowthLoop = weeklyGrowthFunctions.https.onCall(async (_data, context) => {
    if (!context.auth || !context.auth.uid) {
      throw new functions.https.HttpsError("unauthenticated", "인증이 필요합니다.");
    }
    observeAppCheck(context, "openWeeklyGrowthLoop");

    const uid = context.auth.uid;
    const now = new Date();
    const boundaries = getKstWeekBoundaries(now);
    const loopId = buildLoopId(uid, boundaries.weekStartKey);

    const loopRef = db.collection("weeklyGrowthLoops").doc(loopId);
    const existingSnap = await loopRef.get();

    if (existingSnap.exists) {
      const loopData = existingSnap.data();
      if (loopData.ownerId !== uid) {
        throw new functions.https.HttpsError("permission-denied", "항로 문서의 소유자 정보가 올바르지 않습니다.");
      }
      return {
        loop: serializeLoop(existingSnap.id, loopData),
        created: false,
        costProfile: "weekly_document_read_v1",
      };
    }

    // 문서가 없을 때만 지난주 증거 스냅샷 1회 집계
    const { startKey: reviewedStartKey, endKey: reviewedEndKey } = boundaries.reviewedWeek;
    const prevBoundaries = getKstWeekBoundaries(boundaries.prevWeekMonday);
    const prevLoopId = buildLoopId(uid, prevBoundaries.weekStartKey);

    let learningActivityDays = 0;
    let learningActivityCount = 0;
    let learningSummaryUpdatedAt = null;
    let learningAvailable = false;

    let assignmentCount = 0;
    let assignmentAvailable = false;

    let readingDays = 0;
    let readingAvailable = false;

    let previousGoals = [];
    let previousLoopId = null;

    // 4개 데이터 소스 병렬 수집 (개별 오류가 전체 실패를 야기하지 않음)
    const [learningRes, assignmentRes, readingRes, prevLoopRes] = await Promise.allSettled([
      // 1) learningSummaries/{uid}
      db.collection("learningSummaries").doc(uid).get(),

      // 2) assignments count
      db.collection("assignments")
        .where("userId", "==", uid)
        .where("date", ">=", reviewedStartKey)
        .where("date", "<=", reviewedEndKey)
        .count()
        .get(),

      // 3) readingDayCredits count
      db.collection("users")
        .doc(uid)
        .collection("readingDayCredits")
        .where(admin.firestore.FieldPath.documentId(), ">=", reviewedStartKey)
        .where(admin.firestore.FieldPath.documentId(), "<=", reviewedEndKey)
        .count()
        .get(),

      // 4) 직전 주 weeklyGrowthLoops
      db.collection("weeklyGrowthLoops").doc(prevLoopId).get(),
    ]);

    // 1) Learning Summary 처리
    if (learningRes.status === "fulfilled" && learningRes.value.exists) {
      try {
        const lsData = learningRes.value.data();
        if (
          lsData.schemaVersion !== LEARNING_SUMMARY_SCHEMA_VERSION ||
          !Array.isArray(lsData.daily)
        ) {
          throw new Error("Unsupported learning summary schema");
        }
        const daily = lsData.daily;
        const matchingDays = daily.filter((d) => d && d.date >= reviewedStartKey && d.date <= reviewedEndKey);
        learningActivityDays = matchingDays.length;

        for (const row of matchingDays) {
          const qCount = Number(row.quizzes || 0);
          const wCount = Number(row.workbooks || 0);
          const vCount = Number(row.videos || 0);
          const tCount = Number(row.texts || 0);
          const ctCount = Number(row.codeTraces || 0);
          learningActivityCount += qCount + wCount + vCount + tCount + ctCount;
        }

        learningSummaryUpdatedAt = lsData.updatedAt || lsData.lastCalculatedAt || null;
        learningAvailable = true;
      } catch (e) {
        console.warn("Failed to parse learningSummary for growth loop snapshot:", e);
      }
    }

    // 2) Assignments count 처리
    if (assignmentRes.status === "fulfilled") {
      try {
        assignmentCount = assignmentRes.value.data().count || 0;
        assignmentAvailable = true;
      } catch (e) {
        console.warn("Failed to get assignment count for growth loop snapshot:", e);
      }
    }

    // 3) Reading days count 처리
    if (readingRes.status === "fulfilled") {
      try {
        readingDays = readingRes.value.data().count || 0;
        readingAvailable = true;
      } catch (e) {
        console.warn("Failed to get reading days count for growth loop snapshot:", e);
      }
    }

    // 4) 이전 주 목표 처리
    if (prevLoopRes.status === "fulfilled" && prevLoopRes.value.exists) {
      try {
        const pData = prevLoopRes.value.data();
        if (pData.status === "completed" && pData.plan && Array.isArray(pData.plan.goals)) {
          previousLoopId = prevLoopId;
          previousGoals = pData.plan.goals.map((g) => ({
            id: g.id,
            templateId: g.templateId,
            category: g.category,
            label: g.label,
          }));
        }
      } catch (e) {
        console.warn("Failed to parse previous goals for growth loop snapshot:", e);
      }
    }

    const newDocData = {
      ownerId: uid,
      weekStartKey: boundaries.weekStartKey,
      weekEndKey: boundaries.weekEndKey,
      timezone: boundaries.timezone,
      status: "open",

      reviewedWeek: {
        startKey: reviewedStartKey,
        endKey: reviewedEndKey,
        previousLoopId,
        previousGoals,
        evidence: {
          learningActivityDays,
          learningActivityCount,
          assignmentCount,
          readingDays,
          learningSummaryUpdatedAt,
          availability: {
            learning: learningAvailable,
            assignments: assignmentAvailable,
            reading: readingAvailable,
          },
        },
      },

      previousGoalOutcomes: [],

      reflection: {
        observationCodes: [],
        prideCode: null,
        strategyCode: "",
      },

      plan: {
        goals: [],
      },

      promptVersion: WEEKLY_GROWTH_LOOP_PROMPT_VERSION,
      schemaVersion: WEEKLY_GROWTH_LOOP_SCHEMA_VERSION,
      revision: 0,
      openedAt: FieldValue.serverTimestamp(),
      completedAt: null,
      updatedAt: FieldValue.serverTimestamp(),
    };

    try {
      await loopRef.create(newDocData);
    } catch (err) {
      const isAlreadyExists = err?.code === 6 || err?.code === "already-exists";
      if (!isAlreadyExists) throw err;
      // 동시 요청으로 이미 생성된 경우에만 재조회하여 반환
      const reSnap = await loopRef.get();
      if (reSnap.exists) {
        const rData = reSnap.data();
        return {
          loop: serializeLoop(reSnap.id, rData),
          created: false,
          costProfile: "weekly_document_conflict_read_v1",
        };
      }
      throw err;
    }

    return {
      loop: serializeLoop(loopId, {
        ...newDocData,
        openedAt: new Date().toISOString(),
        completedAt: null,
        updatedAt: new Date().toISOString(),
      }),
      created: true,
      costProfile: "weekly_snapshot_v1",
    };
  });

  /**
   * 2. completeWeeklyGrowthLoop
   * 주간 성장 루프 완료 및 목표 확정 트랜잭션 (명령 멱등 처리)
   */
  const completeWeeklyGrowthLoop = weeklyGrowthFunctions.https.onCall(async (data, context) => {
    if (!context.auth || !context.auth.uid) {
      throw new functions.https.HttpsError("unauthenticated", "인증이 필요합니다.");
    }
    observeAppCheck(context, "completeWeeklyGrowthLoop");
    requireMutationEnvelope(data);

    const uid = context.auth.uid;
    const {
      commandId,
      expectedRevision,
      weekStartKey,
      previousGoalOutcomes = [],
      observationCodes = [],
      prideCode = null,
      strategyCode = "",
      goalTemplateIds = [],
    } = data || {};

    // 1) 정책 입력 검증
    const obsValidation = validateObservationCodes(observationCodes);
    if (!obsValidation.valid) {
      throw new functions.https.HttpsError("invalid-argument", obsValidation.error);
    }

    const prideValidation = validatePrideCode(prideCode);
    if (!prideValidation.valid) {
      throw new functions.https.HttpsError("invalid-argument", prideValidation.error);
    }

    const stratValidation = validateStrategyCode(strategyCode);
    if (!stratValidation.valid) {
      throw new functions.https.HttpsError("invalid-argument", stratValidation.error);
    }

    const goalsValidation = validateGoalTemplateIds(goalTemplateIds);
    if (!goalsValidation.valid) {
      throw new functions.https.HttpsError("invalid-argument", goalsValidation.error);
    }

    const now = new Date();
    const boundaries = getKstWeekBoundaries(now);
    const loopId = buildLoopId(uid, weekStartKey);
    const fullCommandId = buildCommandId(uid, commandId);

    const payloadHash = computePayloadHash({
      commandId,
      expectedRevision,
      weekStartKey,
      previousGoalOutcomes,
      observationCodes,
      prideCode,
      strategyCode,
      goalTemplateIds,
    });

    const loopRef = db.collection("weeklyGrowthLoops").doc(loopId);
    const cmdRef = db.collection("weeklyGrowthCommands").doc(fullCommandId);

    const result = await db.runTransaction(async (t) => {
      // 명령 멱등성 확인
      const cmdSnap = await t.get(cmdRef);
      if (cmdSnap.exists) {
        const cmdData = cmdSnap.data();
        if (cmdData.payloadHash !== payloadHash) {
          throw new functions.https.HttpsError(
            "already-exists",
            "동일한 commandId로 다른 내용의 요청이 이미 처리되었습니다."
          );
        }
        return cmdData.result;
      }

      // A persisted duplicate command remains replayable across a week boundary.
      // New mutations, however, are only accepted for the server's current KST week.
      assertCurrentWeek(weekStartKey, boundaries.weekStartKey);

      // 주간 문서 확인
      const loopSnap = await t.get(loopRef);
      if (!loopSnap.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "현재 주차의 항로 문서가 존재하지 않습니다. 먼저 화면을 열어주세요."
        );
      }

      const loopData = loopSnap.data();
      if (loopData.ownerId !== uid) {
        throw new functions.https.HttpsError("permission-denied", "권한이 없습니다.");
      }

      if (loopData.status !== "open") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "이미 시작한 항로입니다. 계획 수정 기능을 이용해 주세요."
        );
      }

      if (loopData.weekStartKey !== weekStartKey) {
        throw new functions.https.HttpsError("failed-precondition", "요청 주차가 항로 문서와 다릅니다.");
      }

      // Revision 낙관적 락
      if (loopData.revision !== expectedRevision) {
        throw new functions.https.HttpsError(
          "aborted",
          "다른 기기에서 내용이 수정되었습니다. 최신 내용을 다시 불러와 주세요."
        );
      }

      // 이전 목표 결과 검증
      const expectedPrevGoals = loopData.reviewedWeek?.previousGoals || [];
      const prevOutcomesValidation = validatePreviousGoalOutcomes(expectedPrevGoals, previousGoalOutcomes);
      if (!prevOutcomesValidation.valid) {
        throw new functions.https.HttpsError("invalid-argument", prevOutcomesValidation.error);
      }

      const nextRevision = (loopData.revision || 0) + 1;
      const updatePayload = {
        status: "completed",
        previousGoalOutcomes: prevOutcomesValidation.outcomes,
        reflection: {
          observationCodes,
          prideCode: prideValidation.value,
          strategyCode,
        },
        plan: {
          goals: goalsValidation.goals,
        },
        revision: nextRevision,
        completedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      t.update(loopRef, updatePayload);

      const commandResult = {
        success: true,
        loopId,
        revision: nextRevision,
        previousGoalOutcomes: prevOutcomesValidation.outcomes,
        reflection: updatePayload.reflection,
        plan: updatePayload.plan,
        completedAt: new Date().toISOString(),
      };

      // 30일 뒤 만료되는 TTL 설정
      const expiresAt = Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000);
      t.set(cmdRef, {
        ownerId: uid,
        commandId,
        type: "complete_weekly_growth_loop",
        payloadHash,
        targetId: loopId,
        result: commandResult,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt,
      });

      return commandResult;
    });

    return result;
  });

  /**
   * 3. updateWeeklyGrowthLoop
   * 완료된 현재 주 항로 계획 명시적 수정 트랜잭션
   */
  const updateWeeklyGrowthLoop = weeklyGrowthFunctions.https.onCall(async (data, context) => {
    if (!context.auth || !context.auth.uid) {
      throw new functions.https.HttpsError("unauthenticated", "인증이 필요합니다.");
    }
    observeAppCheck(context, "updateWeeklyGrowthLoop");
    requireMutationEnvelope(data);

    const uid = context.auth.uid;
    const {
      commandId,
      expectedRevision,
      weekStartKey,
      observationCodes = [],
      prideCode = null,
      strategyCode = "",
      goalTemplateIds = [],
    } = data || {};

    // 1) 정책 입력 검증
    const obsValidation = validateObservationCodes(observationCodes);
    if (!obsValidation.valid) {
      throw new functions.https.HttpsError("invalid-argument", obsValidation.error);
    }

    const prideValidation = validatePrideCode(prideCode);
    if (!prideValidation.valid) {
      throw new functions.https.HttpsError("invalid-argument", prideValidation.error);
    }

    const stratValidation = validateStrategyCode(strategyCode);
    if (!stratValidation.valid) {
      throw new functions.https.HttpsError("invalid-argument", stratValidation.error);
    }

    const goalsValidation = validateGoalTemplateIds(goalTemplateIds);
    if (!goalsValidation.valid) {
      throw new functions.https.HttpsError("invalid-argument", goalsValidation.error);
    }

    const now = new Date();
    const boundaries = getKstWeekBoundaries(now);
    const loopId = buildLoopId(uid, weekStartKey);
    const fullCommandId = buildCommandId(uid, commandId);

    const payloadHash = computePayloadHash({
      commandId,
      expectedRevision,
      weekStartKey,
      observationCodes,
      prideCode,
      strategyCode,
      goalTemplateIds,
    });

    const loopRef = db.collection("weeklyGrowthLoops").doc(loopId);
    const cmdRef = db.collection("weeklyGrowthCommands").doc(fullCommandId);

    const result = await db.runTransaction(async (t) => {
      // 명령 멱등성 확인
      const cmdSnap = await t.get(cmdRef);
      if (cmdSnap.exists) {
        const cmdData = cmdSnap.data();
        if (cmdData.payloadHash !== payloadHash) {
          throw new functions.https.HttpsError(
            "already-exists",
            "동일한 commandId로 다른 내용의 요청이 이미 처리되었습니다."
          );
        }
        return cmdData.result;
      }

      assertCurrentWeek(weekStartKey, boundaries.weekStartKey);

      // 주간 문서 확인
      const loopSnap = await t.get(loopRef);
      if (!loopSnap.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "현재 주차의 항로 문서가 존재하지 않습니다."
        );
      }

      const loopData = loopSnap.data();
      if (loopData.ownerId !== uid) {
        throw new functions.https.HttpsError("permission-denied", "권한이 없습니다.");
      }

      if (loopData.status !== "completed") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "완료되지 않은 항로는 수정할 수 없습니다. 먼저 시작하기를 완료해 주세요."
        );
      }


      if (loopData.weekStartKey !== weekStartKey) {
        throw new functions.https.HttpsError("failed-precondition", "요청 주차가 항로 문서와 다릅니다.");
      }

      // Revision 낙관적 락
      if (loopData.revision !== expectedRevision) {
        throw new functions.https.HttpsError(
          "aborted",
          "다른 기기에서 내용이 수정되었습니다. 최신 내용을 다시 불러와 주세요."
        );
      }

      const nextRevision = (loopData.revision || 0) + 1;
      const updatePayload = {
        reflection: {
          observationCodes,
          prideCode: prideValidation.value,
          strategyCode,
        },
        plan: {
          goals: goalsValidation.goals,
        },
        revision: nextRevision,
        updatedAt: FieldValue.serverTimestamp(),
      };

      t.update(loopRef, updatePayload);

      const commandResult = {
        success: true,
        loopId,
        revision: nextRevision,
        reflection: updatePayload.reflection,
        plan: updatePayload.plan,
        updatedAt: new Date().toISOString(),
      };

      const expiresAt = Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000);
      t.set(cmdRef, {
        ownerId: uid,
        commandId,
        type: "update_weekly_growth_loop",
        payloadHash,
        targetId: loopId,
        result: commandResult,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt,
      });

      return commandResult;
    });

    return result;
  });

  return {
    functions: {
      openWeeklyGrowthLoop,
      completeWeeklyGrowthLoop,
      updateWeeklyGrowthLoop,
    },
  };
};
