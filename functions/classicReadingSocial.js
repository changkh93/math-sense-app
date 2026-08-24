const policy = require("./classicReadingSocialPolicy");
const readingPolicy = require("./classicReadingPolicy");

const COMMAND_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const USAGE_TTL_MS = 90 * 24 * 60 * 60 * 1000; // keep only a short abuse-audit window

module.exports = function ({
  functions,
  admin,
  costOptimizedDataFunctions,
  requireAuthUid,
  requireAdminUid,
}) {
  const db = admin.firestore();
  const FieldValue = admin.firestore.FieldValue;
  const Timestamp = admin.firestore.Timestamp;

  function getKSTDateString(date = new Date()) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }

  function resolveCompletionDateKst(rawDate, now = new Date()) {
    const todayKst = getKSTDateString(now);
    if (rawDate === undefined || rawDate === null || rawDate === "") return todayKst;
    const dateKst = String(rawDate).trim();
    if (!readingPolicy.validateDateString(dateKst) || dateKst > todayKst) {
      throw new functions.https.HttpsError("invalid-argument", "완독 날짜가 올바르지 않습니다.");
    }
    return dateKst;
  }

  async function reconcileCompletedBookCredit(tx, { uid, bookId, bookData, nowTimestamp }) {
    const userRef = db.collection("users").doc(uid);
    const bookCreditRef = userRef.collection("readingBookCredits").doc(bookId);
    const [userSnap, bookCreditSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(bookCreditRef),
    ]);
    const eligible = readingPolicy.isBookEligibleForCompletion(bookData);
    if (eligible === bookCreditSnap.exists) return;

    const readingStats = userSnap.data()?.readingStats || {};
    const nextReadingStats = {
      ...readingStats,
      validCompletedBookCount: Math.max(
        0,
        Number(readingStats.validCompletedBookCount || 0) + (eligible ? 1 : -1)
      ),
      version: 1,
      backfillComplete: readingStats.backfillComplete === true,
    };
    if (eligible) {
      tx.set(bookCreditRef, {
        bookId,
        qualifyingReadingDayCount: Number(bookData.achievementStats?.validReadingDayCount || 0),
        qualifyingReviewedAssignmentCount: Number(bookData.achievementStats?.reviewedAssignmentCount || 0),
        totalPages: Number(bookData.totalPages || 0),
        furthestPage: Number(bookData.progress?.furthestPage || 0),
        eligibilityVersion: 1,
        creditedAt: nowTimestamp,
        updatedAt: nowTimestamp,
      });
    } else {
      tx.delete(bookCreditRef);
    }
    tx.set(userRef, { readingStats: nextReadingStats }, { merge: true });
  }

  function prepareCommand(userId, commandId, payload) {
    if (!/^[A-Za-z0-9_-]{8,160}$/.test(commandId)) {
      throw new functions.https.HttpsError("invalid-argument", "commandId가 필요합니다.");
    }
    const cmdRef = db.collection("readingCommands").doc(`${userId}__${commandId}`);
    const payloadHash = policy.hashPayload(payload || {});
    return { cmdRef, payloadHash };
  }

  function requireSafeDocumentId(value, label = "문서") {
    if (!policy.isSafeDocumentId(value, 500)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `${label} 정보가 올바르지 않습니다.`,
        { code: policy.ERROR_CODES.INVALID_DOCUMENT_ID }
      );
    }
  }

  function getCommentNotificationRef(shareId, commentId) {
    const digest = policy.hashPayload({ shareId, commentId }).slice(0, 40);
    return db.collection("notifications").doc(`reading_share_comment_${digest}`);
  }

  function observeAppCheck(context, functionName) {
    if (context?.app) return;
    // App Check is initialized in the web client. Keep this observable until
    // the project-wide enforcement rollout is enabled, rather than breaking
    // only this feature for clients that have not received a token yet.
    console.warn("[classicReadingSocial] App Check token missing", {
      functionName,
      uid: context?.auth?.uid || "unauthenticated",
    });
  }

  function resolveCommandSnapshot(snap, payloadHash) {
    if (snap.exists) {
      const data = snap.data() || {};
      if (data.payloadHash !== payloadHash) {
        throw new functions.https.HttpsError(
          "already-exists",
          "동일한 commandId에 서로 다른 데이터가 전달되었습니다.",
          { code: policy.ERROR_CODES.DUPLICATE_COMMAND }
        );
      }
      return { isDuplicate: true, result: data.result || null };
    }
    return { isDuplicate: false };
  }

  function buildCommandData({ uid, commandId, type, payloadHash, targetId, result, now, nowTimestamp }) {
    return {
      userId: uid,
      commandId,
      type,
      payloadHash,
      status: "completed",
      targetId,
      result,
      completedAt: nowTimestamp,
      expiresAt: Timestamp.fromMillis(now.getTime() + COMMAND_TTL_MS),
    };
  }

  /**
   * Helper to check and increment daily usage limits in a transaction
   */
  function checkAndIncrementDailyUsage(transaction, usageRef, usageSnap, userId, actionType, limit) {
    const usageData = usageSnap.exists ? usageSnap.data() || {} : {};
    const currentCount = Number(usageData[actionType] || 0);

    if (currentCount >= limit) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        `일일 ${actionType} 이용 한도(${limit}회)를 초과했습니다. 내일 다시 시도해 주세요.`,
        { code: policy.ERROR_CODES.DAILY_LIMIT_EXCEEDED }
      );
    }

    const updates = {
      userId,
      [actionType]: currentCount + 1,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (!usageSnap.exists) {
      updates.createdAt = FieldValue.serverTimestamp();
      updates.expiresAt = Timestamp.fromMillis(Date.now() + USAGE_TTL_MS);
      transaction.set(usageRef, updates);
    } else {
      transaction.update(usageRef, updates);
    }
  }

  /**
   * 1. getReadingShareDraftSources
   * Retrieve recent notes (readingLogs) and assignment submissions for drafting a share
   */
  const getReadingShareDraftSources = costOptimizedDataFunctions.https.onCall(async (data, context) => {
    const uid = await requireAuthUid(context);
    observeAppCheck(context, "getReadingShareDraftSources");
    const bookId = String(data?.bookId || "").trim();

    requireSafeDocumentId(bookId, "책");

    const bookSnap = await db.collection("readingBooks").doc(bookId).get();
    if (!bookSnap.exists || bookSnap.data()?.userId !== uid) {
      throw new functions.https.HttpsError("not-found", "책 정보를 찾을 수 없습니다.");
    }

    const [logsSnap, assignmentsSnap] = await Promise.all([
      db.collection("readingLogs")
        .where("userId", "==", uid)
        .where("bookId", "==", bookId)
        .orderBy("readDateKst", "desc")
        .orderBy("readAt", "desc")
        .limit(3)
        .get(),
      db.collection("assignments")
        .where("userId", "==", uid)
        .where("reading.bookId", "==", bookId)
        .orderBy("submittedAt", "desc")
        .limit(3)
        .get(),
    ]);

    const logCandidates = logsSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() || {}) }))
      .filter((d) => d.summary && String(d.summary).trim().length > 0)
      .slice(0, 3)
      .map((d) => ({
        id: d.id || "",
        text: String(d.summary).trim(),
        page: d.page || null,
        date: d.readDateKst || "",
        source: "reading_log",
      }));

    const assignmentCandidates = assignmentsSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() || {}) }))
      .filter((d) => d.content && String(d.content).trim().length > 0)
      .slice(0, 3)
      .map((d) => ({
        id: d.id || "",
        text: String(d.content).trim(),
        page: d.reading?.page || null,
        date: d.date || "",
        source: "assignment",
      }));

    return {
      sources: [...logCandidates, ...assignmentCandidates],
    };
  });

  /**
   * 2. publishReadingShare
   * Creates or reactivates a public reading share for a book
   */
  const publishReadingShare = costOptimizedDataFunctions.https.onCall(async (data, context) => {
    const uid = await requireAuthUid(context);
    observeAppCheck(context, "publishReadingShare");
    const commandId = String(data?.commandId || "").trim();
    const bookId = String(data?.bookId || "").trim();
    requireSafeDocumentId(bookId, "책");

    const { cmdRef, payloadHash } = prepareCommand(uid, commandId, data);
    const shareId = policy.getReadingShareId(uid, bookId);
    const shareRef = db.collection("readingShares").doc(shareId);
    const bookRef = db.collection("readingBooks").doc(bookId);
    const userRef = db.collection("users").doc(uid);

    const nowKST = getKSTDateString();
    const usageDocId = policy.getDailyUsageDocId(uid, nowKST);
    const usageRef = db.collection("readingSocialUsage").doc(usageDocId);

    const validated = policy.validateReadingShareInput({
      oneLine: data?.oneLine,
      reason: data?.reason,
      question: data?.question,
      hasSpoiler: data?.hasSpoiler,
      isPagePublic: data?.isPagePublic,
      page: data?.page,
    });

    if (!validated.valid) {
      throw new functions.https.HttpsError("invalid-argument", validated.message, { code: validated.error });
    }

    return await db.runTransaction(async (tx) => {
      const [cmdSnap, shareSnap, bookSnap, userSnap, usageSnap] = await Promise.all([
        tx.get(cmdRef),
        tx.get(shareRef),
        tx.get(bookRef),
        tx.get(userRef),
        tx.get(usageRef),
      ]);

      const duplicateResolution = resolveCommandSnapshot(cmdSnap, payloadHash);
      if (duplicateResolution.isDuplicate) {
        return duplicateResolution.result;
      }

      if (!bookSnap.exists || bookSnap.data()?.userId !== uid) {
        throw new functions.https.HttpsError("not-found", "본인의 책 정보를 찾을 수 없습니다.", {
          code: policy.ERROR_CODES.BOOK_NOT_FOUND,
        });
      }

      const bookData = bookSnap.data() || {};
      const userData = userSnap.data() || {};

      if (bookData.status === "want_to_read") {
        throw new functions.https.HttpsError("failed-precondition", "읽기 시작하지 않은 관심 책은 추천 글을 쓸 수 없습니다.", {
          code: policy.ERROR_CODES.BOOK_NOT_STARTED,
        });
      }

      if (!userSnap.exists || userData.isDeleted === true || userData.accountStatus === "deleted") {
        throw new functions.https.HttpsError("failed-precondition", "활성 사용자만 추천 글을 공개할 수 있습니다.");
      }

      const existingStatus = shareSnap.exists ? shareSnap.data()?.status : null;
      if ([policy.SHARE_STATUSES.HIDDEN, policy.SHARE_STATUSES.UNDER_REVIEW].includes(existingStatus)) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "운영 검토 중이거나 숨김 처리된 추천 글은 다시 공개할 수 없습니다.",
          { code: policy.ERROR_CODES.SHARE_INACTIVE }
        );
      }

      // Check daily publish limit only when creating a new share or reactivating
      const isExistingActive = shareSnap.exists && shareSnap.data()?.status === policy.SHARE_STATUSES.ACTIVE;
      if (!isExistingActive) {
        checkAndIncrementDailyUsage(tx, usageRef, usageSnap, uid, "publish", policy.DAILY_LIMITS.PUBLISH);
      }

      const now = new Date();
      const nowTimestamp = Timestamp.fromDate(now);

      const ownerDisplayName = policy.getPublicDisplayName(userData);
      const ownerSnapshot = {
        displayName: ownerDisplayName,
        profileFrameId: userData.profileFrameId || "starter",
        featuredBadgeId: userData.featuredBadgeId || null,
      };

      const bookSnapshot = {
        title: String(bookData.title || "").slice(0, 200),
        author: String(bookData.author || "").slice(0, 120),
        status: bookData.status || "reading",
        page: validated.page,
      };

      const isReactivation = shareSnap.exists && shareSnap.data()?.status === policy.SHARE_STATUSES.WITHDRAWN;
      const existingData = shareSnap.exists ? shareSnap.data() || {} : {};

      const shareDocData = {
        ownerId: uid,
        ownerSnapshot,
        sourceBookId: bookId,
        bookSnapshot,
        review: validated.review,
        reactionCounts: existingData.reactionCounts || {
          wantToRead: 0,
          resonated: 0,
        },
        commentCount: existingData.commentCount || 0,
        reportCount: existingData.reportCount || 0,
        status: policy.SHARE_STATUSES.ACTIVE,
        publishedAt: isReactivation && existingData.publishedAt ? existingData.publishedAt : nowTimestamp,
        updatedAt: nowTimestamp,
        schemaVersion: 1,
      };

      tx.set(shareRef, shareDocData);

      // Atomically update book's publicShare projection
      tx.update(bookRef, {
        publicShare: {
          shareId,
          status: policy.SHARE_STATUSES.ACTIVE,
          publishedAt: shareDocData.publishedAt,
        },
        updatedAt: nowTimestamp,
      });

      const result = {
        success: true,
        shareId,
        status: policy.SHARE_STATUSES.ACTIVE,
        publishedAt: shareDocData.publishedAt.toDate().toISOString(),
      };

      tx.set(
        cmdRef,
        buildCommandData({
          uid,
          commandId,
          type: "publish_reading_share",
          payloadHash,
          targetId: shareId,
          result,
          now,
          nowTimestamp,
        })
      );

      return result;
    });
  });

  /**
   * 3. updateReadingShare
   * Updates review text, spoiler setting, and public page on an active share
   */
  const updateReadingShare = costOptimizedDataFunctions.https.onCall(async (data, context) => {
    const uid = await requireAuthUid(context);
    observeAppCheck(context, "updateReadingShare");
    const commandId = String(data?.commandId || "").trim();
    const shareId = String(data?.shareId || "").trim();
    requireSafeDocumentId(shareId, "추천 글");

    const { cmdRef, payloadHash } = prepareCommand(uid, commandId, data);
    const shareRef = db.collection("readingShares").doc(shareId);

    const validated = policy.validateReadingShareInput({
      oneLine: data?.oneLine,
      reason: data?.reason,
      question: data?.question,
      hasSpoiler: data?.hasSpoiler,
      isPagePublic: data?.isPagePublic,
      page: data?.page,
    });

    if (!validated.valid) {
      throw new functions.https.HttpsError("invalid-argument", validated.message, { code: validated.error });
    }

    return await db.runTransaction(async (tx) => {
      const [cmdSnap, shareSnap] = await Promise.all([tx.get(cmdRef), tx.get(shareRef)]);

      const duplicateResolution = resolveCommandSnapshot(cmdSnap, payloadHash);
      if (duplicateResolution.isDuplicate) {
        return duplicateResolution.result;
      }

      if (!shareSnap.exists) {
        throw new functions.https.HttpsError("not-found", "추천 글을 찾을 수 없습니다.", {
          code: policy.ERROR_CODES.SHARE_NOT_FOUND,
        });
      }

      const shareData = shareSnap.data() || {};
      if (shareData.ownerId !== uid) {
        throw new functions.https.HttpsError("permission-denied", "본인의 추천 글만 수정할 수 있습니다.", {
          code: policy.ERROR_CODES.SHARE_FORBIDDEN,
        });
      }

      if (shareData.status !== policy.SHARE_STATUSES.ACTIVE) {
        throw new functions.https.HttpsError("failed-precondition", "활성화된 추천 글만 수정할 수 있습니다.", {
          code: policy.ERROR_CODES.SHARE_INACTIVE,
        });
      }

      const now = new Date();
      const nowTimestamp = Timestamp.fromDate(now);

      const updates = {
        review: validated.review,
        "bookSnapshot.page": validated.page,
        updatedAt: nowTimestamp,
      };

      tx.update(shareRef, updates);

      const result = {
        success: true,
        shareId,
        updatedAt: nowTimestamp.toDate().toISOString(),
      };

      tx.set(
        cmdRef,
        buildCommandData({
          uid,
          commandId,
          type: "update_reading_share",
          payloadHash,
          targetId: shareId,
          result,
          now,
          nowTimestamp,
        })
      );

      return result;
    });
  });

  /**
   * 4. withdrawReadingShare
   * Sets reading share to withdrawn and clears/updates the book's public projection atomically
   */
  const withdrawReadingShare = costOptimizedDataFunctions.https.onCall(async (data, context) => {
    const uid = await requireAuthUid(context);
    observeAppCheck(context, "withdrawReadingShare");
    const commandId = String(data?.commandId || "").trim();
    const shareId = String(data?.shareId || "").trim();
    requireSafeDocumentId(shareId, "추천 글");

    const { cmdRef, payloadHash } = prepareCommand(uid, commandId, data);
    const shareRef = db.collection("readingShares").doc(shareId);

    return await db.runTransaction(async (tx) => {
      const [cmdSnap, shareSnap] = await Promise.all([tx.get(cmdRef), tx.get(shareRef)]);

      const duplicateResolution = resolveCommandSnapshot(cmdSnap, payloadHash);
      if (duplicateResolution.isDuplicate) {
        return duplicateResolution.result;
      }

      if (!shareSnap.exists) {
        throw new functions.https.HttpsError("not-found", "추천 글을 찾을 수 없습니다.", {
          code: policy.ERROR_CODES.SHARE_NOT_FOUND,
        });
      }

      const shareData = shareSnap.data() || {};
      if (shareData.ownerId !== uid) {
        throw new functions.https.HttpsError("permission-denied", "본인의 추천 글만 거둘 수 있습니다.", {
          code: policy.ERROR_CODES.SHARE_FORBIDDEN,
        });
      }

      const now = new Date();
      const nowTimestamp = Timestamp.fromDate(now);

      tx.update(shareRef, {
        status: policy.SHARE_STATUSES.WITHDRAWN,
        updatedAt: nowTimestamp,
      });

      if (shareData.sourceBookId) {
        const bookRef = db.collection("readingBooks").doc(shareData.sourceBookId);
        tx.update(bookRef, {
          "publicShare.status": policy.SHARE_STATUSES.WITHDRAWN,
          updatedAt: nowTimestamp,
        });
      }

      const result = {
        success: true,
        shareId,
        status: policy.SHARE_STATUSES.WITHDRAWN,
      };

      tx.set(
        cmdRef,
        buildCommandData({
          uid,
          commandId,
          type: "withdraw_reading_share",
          payloadHash,
          targetId: shareId,
          result,
          now,
          nowTimestamp,
        })
      );

      return result;
    });
  });

  /**
   * 5. linkReadingShareBook
   * Links a reading share with user's bookshelf (want_to_read or read/completed)
   * Idempotent, handles existing book reuse or deterministic book creation.
   */
  const linkReadingShareBook = costOptimizedDataFunctions.https.onCall(async (data, context) => {
    const uid = await requireAuthUid(context);
    observeAppCheck(context, "linkReadingShareBook");
    const commandId = String(data?.commandId || "").trim();
    const shareId = String(data?.shareId || "").trim();
    const rawIntent = data?.intent;
    const completedDateKst = data?.completedDateKst;

    requireSafeDocumentId(shareId, "추천 글");

    const validatedIntent = policy.validateReadingIntent(rawIntent);
    if (!validatedIntent.valid) {
      throw new functions.https.HttpsError("invalid-argument", validatedIntent.message, {
        code: validatedIntent.error,
      });
    }
    const intent = validatedIntent.intent; // "want_to_read" | "read"

    const { cmdRef, payloadHash } = prepareCommand(uid, commandId, data);
    const shareRef = db.collection("readingShares").doc(shareId);
    const reactionRef = shareRef.collection("reactions").doc(uid);

    // Reserve a small daily quota before any fan-out query. This makes unique
    // command IDs unable to turn the bookshelf lookup into an unbounded cost.
    const usageRef = db.collection("readingSocialUsage")
      .doc(policy.getDailyUsageDocId(uid, getKSTDateString()));
    const preflight = await db.runTransaction(async (tx) => {
      const [cmdSnap, usageSnap] = await Promise.all([tx.get(cmdRef), tx.get(usageRef)]);
      const duplicateResolution = resolveCommandSnapshot(cmdSnap, payloadHash);
      if (duplicateResolution.isDuplicate) return duplicateResolution;
      const usageData = usageSnap.exists ? usageSnap.data() || {} : {};
      const reservedCommands = Array.isArray(usageData.linkBookCommandIds)
        ? usageData.linkBookCommandIds.slice(0, policy.DAILY_LIMITS.LINK_BOOK)
        : [];
      if (!reservedCommands.includes(commandId)) {
        const currentCount = Number(usageData.linkBook || 0);
        if (currentCount >= policy.DAILY_LIMITS.LINK_BOOK) {
          throw new functions.https.HttpsError(
            "resource-exhausted",
            `일일 책 연결 이용 한도(${policy.DAILY_LIMITS.LINK_BOOK}회)를 초과했습니다. 내일 다시 시도해 주세요.`,
            { code: policy.ERROR_CODES.DAILY_LIMIT_EXCEEDED }
          );
        }
        const updates = {
          userId: uid,
          linkBook: currentCount + 1,
          linkBookCommandIds: [...reservedCommands, commandId],
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (!usageSnap.exists) {
          updates.createdAt = FieldValue.serverTimestamp();
          updates.expiresAt = Timestamp.fromMillis(Date.now() + USAGE_TTL_MS);
        }
        tx.set(usageRef, updates, { merge: true });
      }
      return { isDuplicate: false };
    });
    if (preflight.isDuplicate) return preflight.result;

    const shareSnapInitial = await shareRef.get();
    if (!shareSnapInitial.exists) {
      throw new functions.https.HttpsError("not-found", "추천 글을 찾을 수 없습니다.", {
        code: policy.ERROR_CODES.SHARE_NOT_FOUND,
      });
    }
    const shareDataInitial = shareSnapInitial.data() || {};
    if (shareDataInitial.status !== policy.SHARE_STATUSES.ACTIVE) {
      throw new functions.https.HttpsError("failed-precondition", "활성화된 추천 글에만 책을 연결할 수 있습니다.", {
        code: policy.ERROR_CODES.SHARE_INACTIVE,
      });
    }
    if (shareDataInitial.ownerId === uid) {
      throw new functions.https.HttpsError("failed-precondition", "자신의 추천 글에는 책 연결을 할 수 없습니다.", {
        code: policy.ERROR_CODES.CANNOT_LINK_OWN_SHARE,
      });
    }

    const title = shareDataInitial.bookSnapshot?.title || "";
    const author = shareDataInitial.bookSnapshot?.author || "";
    const normTitle = policy.normalizeString(title);
    const normAuthor = policy.normalizeString(author);

    const existingBooksSnap = await db.collection("readingBooks")
      .where("userId", "==", uid)
      .where("normalizedTitle", "==", normTitle)
      .where("normalizedAuthor", "==", normAuthor)
      .where("archivedAt", "==", null)
      .limit(5)
      .get();

    const candidateBooks = existingBooksSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return await db.runTransaction(async (tx) => {
      const [cmdSnap, shareSnap, reactionSnap] = await Promise.all([
        tx.get(cmdRef),
        tx.get(shareRef),
        tx.get(reactionRef),
      ]);

      const duplicateResolution = resolveCommandSnapshot(cmdSnap, payloadHash);
      if (duplicateResolution.isDuplicate) {
        return duplicateResolution.result;
      }

      if (!shareSnap.exists) {
        throw new functions.https.HttpsError("not-found", "추천 글을 찾을 수 없습니다.", {
          code: policy.ERROR_CODES.SHARE_NOT_FOUND,
        });
      }
      const shareData = shareSnap.data() || {};
      if (shareData.status !== policy.SHARE_STATUSES.ACTIVE) {
        throw new functions.https.HttpsError("failed-precondition", "활성화된 추천 글에만 책을 연결할 수 있습니다.", {
          code: policy.ERROR_CODES.SHARE_INACTIVE,
        });
      }

      const currentReactionState = policy.resolveReactionState(reactionSnap.data());
      const linkedBookIdFromReaction = currentReactionState.linkedBookId;

      let targetBook = null;
      if (linkedBookIdFromReaction) {
        targetBook = candidateBooks.find((b) => b.id === linkedBookIdFromReaction);
      }
      if (!targetBook && candidateBooks.length > 0) {
        const priorityOrder = { completed: 1, reading: 2, paused: 3, want_to_read: 4 };
        const sorted = [...candidateBooks].sort((a, b) => {
          const pA = priorityOrder[a.status] || 99;
          const pB = priorityOrder[b.status] || 99;
          if (pA !== pB) return pA - pB;
          const tA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
          const tB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
          return tB - tA;
        });
        targetBook = sorted[0];
      }

      if (targetBook) {
        const candidateRef = db.collection("readingBooks").doc(targetBook.id);
        const candidateSnap = await tx.get(candidateRef);
        if (!candidateSnap.exists || candidateSnap.data()?.archivedAt || candidateSnap.data()?.userId !== uid) {
          throw new functions.https.HttpsError("failed-precondition", "연결할 책의 상태가 변경되었습니다. 다시 시도해 주세요.");
        }
        targetBook = { id: candidateSnap.id, ...(candidateSnap.data() || {}) };
      }

      const now = new Date();
      const nowTimestamp = Timestamp.fromDate(now);

      let targetBookId = targetBook?.id;
      let targetBookRef = targetBookId ? db.collection("readingBooks").doc(targetBookId) : null;
      let targetBookData = targetBook;
      let isNewBook = false;
      let reusedExisting = Boolean(targetBook);
      let bookStatusResult = targetBook?.status || intent;

      const completionDateKst = resolveCompletionDateKst(completedDateKst, now);
      const completedTimestamp = Timestamp.fromDate(new Date(`${completionDateKst}T12:00:00+09:00`));

      if (!targetBook) {
        targetBookId = policy.getDeterministicSocialBookId(uid, title, author);
        targetBookRef = db.collection("readingBooks").doc(targetBookId);
        const bookSnapExisting = await tx.get(targetBookRef);
        if (bookSnapExisting.exists && !bookSnapExisting.data()?.archivedAt) {
          targetBookData = bookSnapExisting.data();
          reusedExisting = true;
          bookStatusResult = targetBookData.status;
        } else {
          isNewBook = true;
          const initialStatus = intent === "read" ? "completed" : "want_to_read";
          bookStatusResult = initialStatus;
          const newBookDoc = {
            userId: uid,
            title,
            author,
            normalizedTitle: normTitle,
            normalizedAuthor: normAuthor,
            status: initialStatus,
            wantedAt: nowTimestamp,
            startedAt: initialStatus === "completed" ? completedTimestamp : null,
            completedAt: initialStatus === "completed" ? completedTimestamp : null,
            pausedAt: null,
            statusUpdatedAt: nowTimestamp,
            discovery: {
              source: "reading_lounge",
              firstShareId: shareId,
              recommenderId: shareData.ownerId,
              recommenderDisplayName: shareData.ownerSnapshot?.displayName || "별빛 탐험가",
              linkedAt: nowTimestamp,
            },
            progress: {
              latestReadPage: 0,
              furthestPage: 0,
              latestReadAt: null,
              latestLogId: null,
            },
            achievementStats: {
              validReadingDayCount: 0,
              reviewedAssignmentCount: 0,
              version: 1,
            },
            archivedAt: null,
            createdAt: nowTimestamp,
            updatedAt: nowTimestamp,
            schemaVersion: 2,
          };
          tx.set(targetBookRef, newBookDoc);
        }
      }

      if (reusedExisting && targetBookRef && targetBookData) {
        if (intent === "read" && targetBookData.status !== "completed") {
          const prevStatus = targetBookData.status;
          const completedBookData = {
            ...targetBookData,
            status: "completed",
            completedAt: completedTimestamp,
            statusUpdatedAt: nowTimestamp,
            updatedAt: nowTimestamp,
          };
          await reconcileCompletedBookCredit(tx, {
            uid,
            bookId: targetBookId,
            bookData: completedBookData,
            nowTimestamp,
          });
          tx.update(targetBookRef, {
            status: "completed",
            completedAt: completedTimestamp,
            statusUpdatedAt: nowTimestamp,
            updatedAt: nowTimestamp,
          });
          bookStatusResult = "completed";

          const logRef = db.collection("readingLogs").doc();
          tx.set(logRef, {
            userId: uid,
            bookId: targetBookId,
            eventType: "status_change",
            source: "reading_lounge",
            readDateKst: completionDateKst,
            readAt: nowTimestamp,
            page: targetBookData.progress?.furthestPage || 0,
            summary: "독서 라운지에서 완독으로 등록",
            assignmentId: null,
            statusFrom: prevStatus,
            statusTo: "completed",
            revision: 1,
            lockedAt: null,
            correctionOfLogId: null,
            voidedAt: null,
            bookSnapshot: {
              title: targetBookData.title || "",
              author: targetBookData.author || "",
            },
            recordedAt: nowTimestamp,
            updatedAt: nowTimestamp,
            schemaVersion: 1,
          });
        } else {
          bookStatusResult = targetBookData.status;
          if (!targetBookData.discovery) {
            tx.update(targetBookRef, {
              discovery: {
                source: "reading_lounge",
                firstShareId: shareId,
                recommenderId: shareData.ownerId,
                recommenderDisplayName: shareData.ownerSnapshot?.displayName || "별빛 탐험가",
                linkedAt: nowTimestamp,
              },
              updatedAt: nowTimestamp,
            });
          }
        }
      }

      let nextReadingIntent = null;
      if (intent === "read" || bookStatusResult === "completed") {
        nextReadingIntent = "read";
      } else if (bookStatusResult === "want_to_read") {
        nextReadingIntent = "want_to_read";
      } else {
        nextReadingIntent = null;
      }

      const prevIntent = currentReactionState.readingIntent;
      let wantToReadDelta = 0;
      let readDelta = 0;

      if (prevIntent !== nextReadingIntent) {
        if (prevIntent === "want_to_read") wantToReadDelta -= 1;
        if (prevIntent === "read") readDelta -= 1;

        if (nextReadingIntent === "want_to_read") wantToReadDelta += 1;
        if (nextReadingIntent === "read") readDelta += 1;
      }

      const currentCounts = shareData.reactionCounts || { wantToRead: 0, read: 0, resonated: 0 };
      const nextWantToRead = Math.max(0, (currentCounts.wantToRead || 0) + wantToReadDelta);
      const nextRead = Math.max(0, (currentCounts.read || 0) + readDelta);
      const nextResonated = Number(currentCounts.resonated || 0);

      const reactionCountsUpdate = {
        "reactionCounts.wantToRead": nextWantToRead,
        "reactionCounts.read": nextRead,
        "reactionCounts.resonated": nextResonated,
      };
      tx.update(shareRef, reactionCountsUpdate);

      const reactionDocData = {
        kind: "reading_share",
        userId: uid,
        resonated: currentReactionState.resonated,
        readingIntent: nextReadingIntent,
        linkedBookId: targetBookId,
        linkedAt: reactionSnap.exists && reactionSnap.data()?.linkedAt ? reactionSnap.data().linkedAt : nowTimestamp,
        createdAt: reactionSnap.exists ? reactionSnap.data()?.createdAt || nowTimestamp : nowTimestamp,
        updatedAt: nowTimestamp,
        schemaVersion: 2,
      };
      tx.set(reactionRef, reactionDocData);

      const result = {
        success: true,
        shareId,
        bookId: targetBookId,
        bookStatus: bookStatusResult,
        readingIntent: nextReadingIntent,
        created: isNewBook,
        reusedExistingBook: reusedExisting,
        unchanged: prevIntent === nextReadingIntent && !isNewBook,
        reactionCounts: {
          wantToRead: nextWantToRead,
          read: nextRead,
          resonated: nextResonated,
        },
      };

      tx.set(
        cmdRef,
        buildCommandData({
          uid,
          commandId,
          type: "link_reading_share_book",
          payloadHash,
          targetId: targetBookId,
          result,
          now,
          nowTimestamp,
        })
      );

      return result;
    });
  });

  /**
   * 6. setReadingShareReaction
   * Goal-based reaction mutation: toggles resonated or handles v1 compatibility
   */
  const setReadingShareReaction = costOptimizedDataFunctions.https.onCall(async (data, context) => {
    const uid = await requireAuthUid(context);
    observeAppCheck(context, "setReadingShareReaction");
    const shareId = String(data?.shareId || "").trim();
    requireSafeDocumentId(shareId, "추천 글");

    const hasResonatedField = typeof data?.resonated === "boolean";
    let targetResonated = false;
    let isV1ReactionTypeCall = false;
    let v1TargetType = null;

    if (hasResonatedField) {
      targetResonated = Boolean(data.resonated);
    } else {
      isV1ReactionTypeCall = true;
      const validatedType = policy.validateReactionType(data?.reactionType);
      if (!validatedType.valid) {
        throw new functions.https.HttpsError("invalid-argument", validatedType.message, {
          code: validatedType.error,
        });
      }
      v1TargetType = validatedType.reactionType; // null | "want_to_read" | "resonated"
      targetResonated = v1TargetType === policy.REACTION_TYPES.RESONATED;
    }

    const shareRef = db.collection("readingShares").doc(shareId);
    const reactionRef = shareRef.collection("reactions").doc(uid);

    const nowKST = getKSTDateString();
    const usageDocId = policy.getDailyUsageDocId(uid, nowKST);
    const usageRef = db.collection("readingSocialUsage").doc(usageDocId);

    return await db.runTransaction(async (tx) => {
      const [shareSnap, reactionSnap, usageSnap] = await Promise.all([
        tx.get(shareRef),
        tx.get(reactionRef),
        tx.get(usageRef),
      ]);

      if (!shareSnap.exists) {
        throw new functions.https.HttpsError("not-found", "추천 글을 찾을 수 없습니다.", {
          code: policy.ERROR_CODES.SHARE_NOT_FOUND,
        });
      }

      const shareData = shareSnap.data() || {};
      if (shareData.status !== policy.SHARE_STATUSES.ACTIVE) {
        throw new functions.https.HttpsError("failed-precondition", "활성화된 추천 글에만 반응할 수 있습니다.", {
          code: policy.ERROR_CODES.SHARE_INACTIVE,
        });
      }

      if (shareData.ownerId === uid) {
        throw new functions.https.HttpsError("failed-precondition", "자신의 추천 글에는 반응할 수 없습니다.", {
          code: policy.ERROR_CODES.SELF_REACTION_NOT_ALLOWED,
        });
      }

      const currentResolved = policy.resolveReactionState(reactionSnap.data());
      const currentResonated = currentResolved.resonated;
      const currentIntent = currentResolved.readingIntent;

      if (!isV1ReactionTypeCall && currentResonated === targetResonated) {
        return {
          success: true,
          resonated: targetResonated,
          readingIntent: currentIntent,
          reactionCounts: shareData.reactionCounts || { wantToRead: 0, read: 0, resonated: 0 },
        };
      }

      checkAndIncrementDailyUsage(tx, usageRef, usageSnap, uid, "reaction", policy.DAILY_LIMITS.REACTION);

      const currentCounts = shareData.reactionCounts || { wantToRead: 0, read: 0, resonated: 0 };
      const resonatedDelta = (targetResonated ? 1 : 0) - (currentResonated ? 1 : 0);
      const nextResonated = Math.max(0, (currentCounts.resonated || 0) + resonatedDelta);

      let nextWantToRead = Number(currentCounts.wantToRead || 0);
      let nextIntent = currentIntent;

      if (isV1ReactionTypeCall && v1TargetType !== policy.REACTION_TYPES.RESONATED) {
        const targetIntent = v1TargetType === policy.REACTION_TYPES.WANT_TO_READ ? "want_to_read" : null;
        if (currentIntent !== targetIntent) {
          const wantDelta = (targetIntent === "want_to_read" ? 1 : 0) - (currentIntent === "want_to_read" ? 1 : 0);
          nextWantToRead = Math.max(0, nextWantToRead + wantDelta);
          nextIntent = targetIntent;
        }
      }

      const nextCounts = {
        wantToRead: nextWantToRead,
        read: Number(currentCounts.read || 0),
        resonated: nextResonated,
      };

      const now = new Date();
      const nowTimestamp = Timestamp.fromDate(now);

      tx.update(shareRef, {
        "reactionCounts.resonated": nextResonated,
        "reactionCounts.wantToRead": nextWantToRead,
        "reactionCounts.read": nextCounts.read,
      });

      if (!targetResonated && !nextIntent && !currentResolved.linkedBookId) {
        tx.delete(reactionRef);
      } else {
        tx.set(reactionRef, {
          kind: "reading_share",
          userId: uid,
          resonated: targetResonated,
          readingIntent: nextIntent,
          linkedBookId: currentResolved.linkedBookId,
          createdAt: reactionSnap.exists ? reactionSnap.data()?.createdAt || nowTimestamp : nowTimestamp,
          updatedAt: nowTimestamp,
          schemaVersion: 2,
        });
      }

      return {
        success: true,
        resonated: targetResonated,
        readingIntent: nextIntent,
        reactionType: targetResonated ? "resonated" : nextIntent,
        reactionCounts: nextCounts,
      };
    });
  });

  /**
   * 6. commentReadingShare
   * Adds a comment to a reading share and generates an in-app notification for the author
   */
  const commentReadingShare = costOptimizedDataFunctions.https.onCall(async (data, context) => {
    const uid = await requireAuthUid(context);
    observeAppCheck(context, "commentReadingShare");
    const commandId = String(data?.commandId || "").trim();
    const shareId = String(data?.shareId || "").trim();
    requireSafeDocumentId(shareId, "추천 글");
    const rawContent = data?.content;

    const validated = policy.validateCommentInput(rawContent);
    if (!validated.valid) {
      throw new functions.https.HttpsError("invalid-argument", validated.message, { code: validated.error });
    }

    const { cmdRef, payloadHash } = prepareCommand(uid, commandId, data);
    const commentId = policy.getDeterministicCommentId(shareId, commandId);
    const shareRef = db.collection("readingShares").doc(shareId);
    const commentRef = shareRef.collection("comments").doc(commentId);
    const userRef = db.collection("users").doc(uid);

    const nowKST = getKSTDateString();
    const usageDocId = policy.getDailyUsageDocId(uid, nowKST);
    const usageRef = db.collection("readingSocialUsage").doc(usageDocId);

    return await db.runTransaction(async (tx) => {
      const [cmdSnap, shareSnap, userSnap, usageSnap] = await Promise.all([
        tx.get(cmdRef),
        tx.get(shareRef),
        tx.get(userRef),
        tx.get(usageRef),
      ]);

      const duplicateResolution = resolveCommandSnapshot(cmdSnap, payloadHash);
      if (duplicateResolution.isDuplicate) {
        return duplicateResolution.result;
      }

      if (!shareSnap.exists) {
        throw new functions.https.HttpsError("not-found", "추천 글을 찾을 수 없습니다.", {
          code: policy.ERROR_CODES.SHARE_NOT_FOUND,
        });
      }

      const shareData = shareSnap.data() || {};
      if (shareData.status !== policy.SHARE_STATUSES.ACTIVE) {
        throw new functions.https.HttpsError("failed-precondition", "활성화된 추천 글에만 댓글을 남길 수 있습니다.", {
          code: policy.ERROR_CODES.SHARE_INACTIVE,
        });
      }

      checkAndIncrementDailyUsage(tx, usageRef, usageSnap, uid, "comment", policy.DAILY_LIMITS.COMMENT);

      const userData = userSnap.data() || {};
      const authorDisplayName = policy.getPublicDisplayName(userData);
      const userSnapshot = {
        displayName: authorDisplayName,
        profileFrameId: userData.profileFrameId || "starter",
      };

      const now = new Date();
      const nowTimestamp = Timestamp.fromDate(now);

      const commentDoc = {
        kind: "reading_share",
        userId: uid,
        authorId: uid, // for collection group cleanups
        userSnapshot,
        content: validated.content,
        status: policy.COMMENT_STATUSES.VISIBLE,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      };

      tx.set(commentRef, commentDoc);

      const nextCommentCount = (shareData.commentCount || 0) + 1;
      tx.update(shareRef, {
        commentCount: nextCommentCount,
      });

      // Notify the share owner if commenter is not the owner
      if (shareData.ownerId && shareData.ownerId !== uid) {
        const notifRef = getCommentNotificationRef(shareId, commentId);
        tx.set(notifRef, {
          recipientId: shareData.ownerId,
          actorId: uid,
          shareId,
          commentId,
          type: "reading_share_comment",
          title: "내 독서 추천에 새로운 생각이 도착했어요",
          message: `${authorDisplayName}님이 '${shareData.bookSnapshot?.title || "추천 책"}'에 댓글을 남겼습니다.`,
          link: `/agora?filter=reading&highlight=${shareId}`,
          isRead: false,
          createdAt: nowTimestamp,
        });
      }

      const result = {
        success: true,
        comment: {
          id: commentId,
          ...commentDoc,
          createdAt: nowTimestamp.toDate().toISOString(),
          updatedAt: nowTimestamp.toDate().toISOString(),
        },
        commentCount: nextCommentCount,
      };

      tx.set(
        cmdRef,
        buildCommandData({
          uid,
          commandId,
          type: "comment_reading_share",
          payloadHash,
          targetId: commentId,
          result,
          now,
          nowTimestamp,
        })
      );

      return result;
    });
  });

  /**
   * 7. deleteReadingShareComment
   * Soft deletes a comment (sets content to empty, status to deleted) and decrements commentCount
   */
  const deleteReadingShareComment = costOptimizedDataFunctions.https.onCall(async (data, context) => {
    const uid = await requireAuthUid(context);
    observeAppCheck(context, "deleteReadingShareComment");
    const commandId = String(data?.commandId || "").trim();
    const shareId = String(data?.shareId || "").trim();
    const commentId = String(data?.commentId || "").trim();
    requireSafeDocumentId(shareId, "추천 글");
    requireSafeDocumentId(commentId, "댓글");

    const { cmdRef, payloadHash } = prepareCommand(uid, commandId, data);
    const shareRef = db.collection("readingShares").doc(shareId);
    const commentRef = shareRef.collection("comments").doc(commentId);

    return await db.runTransaction(async (tx) => {
      const [cmdSnap, shareSnap, commentSnap] = await Promise.all([
        tx.get(cmdRef),
        tx.get(shareRef),
        tx.get(commentRef),
      ]);

      const duplicateResolution = resolveCommandSnapshot(cmdSnap, payloadHash);
      if (duplicateResolution.isDuplicate) {
        return duplicateResolution.result;
      }

      if (!commentSnap.exists) {
        throw new functions.https.HttpsError("not-found", "댓글을 찾을 수 없습니다.");
      }

      const commentData = commentSnap.data() || {};
      if (commentData.userId !== uid) {
        throw new functions.https.HttpsError("permission-denied", "본인의 댓글만 삭제할 수 있습니다.");
      }

      if (commentData.status === policy.COMMENT_STATUSES.DELETED) {
        return { success: true, commentId, status: policy.COMMENT_STATUSES.DELETED };
      }

      const now = new Date();
      const nowTimestamp = Timestamp.fromDate(now);

      tx.update(commentRef, {
        content: "",
        authorId: null,
        userId: null,
        userSnapshot: {
          displayName: "삭제된 댓글",
        },
        status: policy.COMMENT_STATUSES.DELETED,
        deletedAt: nowTimestamp,
        updatedAt: nowTimestamp,
      });

      let nextCommentCount = 0;
      if (shareSnap.exists) {
        const shareData = shareSnap.data() || {};
        nextCommentCount = Math.max(0, (shareData.commentCount || 0) - 1);
        tx.update(shareRef, {
          commentCount: nextCommentCount,
        });
      }

      tx.delete(getCommentNotificationRef(shareId, commentId));

      const result = {
        success: true,
        commentId,
        status: policy.COMMENT_STATUSES.DELETED,
        commentCount: nextCommentCount,
      };

      tx.set(
        cmdRef,
        buildCommandData({
          uid,
          commandId,
          type: "delete_reading_share_comment",
          payloadHash,
          targetId: commentId,
          result,
          now,
          nowTimestamp,
        })
      );

      return result;
    });
  });

  /**
   * 8. reportReadingShare
   * Reports a reading share with duplicate prevention and daily rate limit
   */
  const reportReadingShare = costOptimizedDataFunctions.https.onCall(async (data, context) => {
    const uid = await requireAuthUid(context);
    observeAppCheck(context, "reportReadingShare");
    const shareId = String(data?.shareId || "").trim();
    requireSafeDocumentId(shareId, "추천 글");
    const validated = policy.validateReportInput({
      reason: data?.reason,
      detail: data?.detail,
    });

    if (!validated.valid) {
      throw new functions.https.HttpsError("invalid-argument", validated.message, { code: validated.error });
    }

    const reportId = policy.getReadingShareReportId(shareId, uid);
    const reportRef = db.collection("readingShareReports").doc(reportId);
    const shareRef = db.collection("readingShares").doc(shareId);

    const nowKST = getKSTDateString();
    const usageDocId = policy.getDailyUsageDocId(uid, nowKST);
    const usageRef = db.collection("readingSocialUsage").doc(usageDocId);

    return await db.runTransaction(async (tx) => {
      const [reportSnap, shareSnap, usageSnap] = await Promise.all([
        tx.get(reportRef),
        tx.get(shareRef),
        tx.get(usageRef),
      ]);

      if (reportSnap.exists) {
        throw new functions.https.HttpsError("already-exists", "이미 신고가 접수된 글입니다.", {
          code: policy.ERROR_CODES.DUPLICATE_REPORT,
        });
      }

      if (!shareSnap.exists) {
        throw new functions.https.HttpsError("not-found", "추천 글을 찾을 수 없습니다.", {
          code: policy.ERROR_CODES.SHARE_NOT_FOUND,
        });
      }

      checkAndIncrementDailyUsage(tx, usageRef, usageSnap, uid, "report", policy.DAILY_LIMITS.REPORT);

      const shareData = shareSnap.data() || {};
      if (shareData.status !== policy.SHARE_STATUSES.ACTIVE) {
        throw new functions.https.HttpsError("failed-precondition", "공개 중인 추천 글만 신고할 수 있습니다.", {
          code: policy.ERROR_CODES.SHARE_INACTIVE,
        });
      }
      if (shareData.ownerId === uid) {
        throw new functions.https.HttpsError("failed-precondition", "자신의 추천 글은 신고할 수 없습니다.", {
          code: policy.ERROR_CODES.SELF_REPORT_NOT_ALLOWED,
        });
      }
      const now = new Date();
      const nowTimestamp = Timestamp.fromDate(now);

      tx.set(reportRef, {
        shareId,
        ownerId: shareData.ownerId || "",
        reporterId: uid,
        reason: validated.reason,
        detail: validated.detail,
        status: "open",
        createdAt: nowTimestamp,
        resolvedAt: null,
        resolvedBy: null,
      });

      const nextReportCount = (shareData.reportCount || 0) + 1;
      tx.update(shareRef, {
        reportCount: nextReportCount,
      });

      return {
        success: true,
        reportId,
      };
    });
  });

  /**
   * 9. moderateReadingShare (Admin Only)
   * Moderates a reading share: 'hidden' or 'active', and keeps the book's public projection in sync
   */
  const moderateReadingShare = costOptimizedDataFunctions.https.onCall(async (data, context) => {
    const adminUid = await requireAdminUid(context);
    observeAppCheck(context, "moderateReadingShare");
    const shareId = String(data?.shareId || "").trim();
    requireSafeDocumentId(shareId, "추천 글");
    const nextStatus = String(data?.status || "").trim(); // 'hidden' | 'active'
    const moderationNote = String(data?.note || "").slice(0, 300);

    if (![policy.SHARE_STATUSES.HIDDEN, policy.SHARE_STATUSES.ACTIVE].includes(nextStatus)) {
      throw new functions.https.HttpsError("invalid-argument", "올바른 관리 상태가 아닙니다.");
    }

    const shareRef = db.collection("readingShares").doc(shareId);

    return await db.runTransaction(async (tx) => {
      const shareSnap = await tx.get(shareRef);
      if (!shareSnap.exists) {
        throw new functions.https.HttpsError("not-found", "추천 글을 찾을 수 없습니다.");
      }

      const shareData = shareSnap.data() || {};
      if (shareData.status === policy.SHARE_STATUSES.WITHDRAWN) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "작성자가 거둔 추천 글은 운영자가 공개하거나 숨김 처리할 수 없습니다."
        );
      }
      if (nextStatus === policy.SHARE_STATUSES.ACTIVE && shareData.status !== policy.SHARE_STATUSES.HIDDEN) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "운영자가 숨긴 추천 글만 복구할 수 있습니다."
        );
      }
      const now = new Date();
      const nowTimestamp = Timestamp.fromDate(now);

      tx.update(shareRef, {
        status: nextStatus,
        moderation: {
          moderatedBy: adminUid,
          moderatedAt: nowTimestamp,
          note: moderationNote,
          previousStatus: shareData.status || "active",
        },
        updatedAt: nowTimestamp,
      });

      if (shareData.sourceBookId) {
        const bookRef = db.collection("readingBooks").doc(shareData.sourceBookId);
        tx.update(bookRef, {
          "publicShare.status": nextStatus,
          updatedAt: nowTimestamp,
        });
      }

      return {
        success: true,
        shareId,
        status: nextStatus,
      };
    });
  });

  /**
   * 10. replyToReadingShareComment
   * Adds a reply to a root comment (1-level deep) and creates an in-app notification
   */
  const replyToReadingShareComment = costOptimizedDataFunctions.https.onCall(async (data, context) => {
    const uid = await requireAuthUid(context);
    observeAppCheck(context, "replyToReadingShareComment");
    const commandId = String(data?.commandId || "").trim();
    const shareId = String(data?.shareId || "").trim();
    const rootCommentId = String(data?.rootCommentId || "").trim();
    const rawContent = data?.content;

    requireSafeDocumentId(shareId, "추천 글");
    requireSafeDocumentId(rootCommentId, "댓글");

    const validated = policy.validateReplyInput(rawContent);
    if (!validated.valid) {
      throw new functions.https.HttpsError("invalid-argument", validated.message, { code: validated.error });
    }

    const { cmdRef, payloadHash } = prepareCommand(uid, commandId, data);
    const replyId = policy.getDeterministicReplyId(shareId, rootCommentId, commandId);
    const shareRef = db.collection("readingShares").doc(shareId);
    const rootCommentRef = shareRef.collection("comments").doc(rootCommentId);
    const replyRef = rootCommentRef.collection("replies").doc(replyId);
    const userRef = db.collection("users").doc(uid);

    const nowKST = getKSTDateString();
    const usageDocId = policy.getDailyUsageDocId(uid, nowKST);
    const usageRef = db.collection("readingSocialUsage").doc(usageDocId);

    return await db.runTransaction(async (tx) => {
      const [cmdSnap, shareSnap, rootCommentSnap, userSnap, usageSnap] = await Promise.all([
        tx.get(cmdRef),
        tx.get(shareRef),
        tx.get(rootCommentRef),
        tx.get(userRef),
        tx.get(usageRef),
      ]);

      const duplicateResolution = resolveCommandSnapshot(cmdSnap, payloadHash);
      if (duplicateResolution.isDuplicate) {
        return duplicateResolution.result;
      }

      if (!shareSnap.exists) {
        throw new functions.https.HttpsError("not-found", "추천 글을 찾을 수 없습니다.", {
          code: policy.ERROR_CODES.SHARE_NOT_FOUND,
        });
      }
      const shareData = shareSnap.data() || {};
      if (shareData.status !== policy.SHARE_STATUSES.ACTIVE) {
        throw new functions.https.HttpsError("failed-precondition", "활성화된 추천 글에만 답글을 남길 수 있습니다.", {
          code: policy.ERROR_CODES.SHARE_INACTIVE,
        });
      }

      if (!rootCommentSnap.exists) {
        throw new functions.https.HttpsError("not-found", "원 댓글을 찾을 수 없습니다.", {
          code: policy.ERROR_CODES.ROOT_COMMENT_NOT_FOUND,
        });
      }
      const rootCommentData = rootCommentSnap.data() || {};
      if (rootCommentData.status !== policy.COMMENT_STATUSES.VISIBLE) {
        throw new functions.https.HttpsError("failed-precondition", "지금은 이 대화에 참여할 수 없습니다.", {
          code: policy.ERROR_CODES.ROOT_COMMENT_INACTIVE,
        });
      }

      checkAndIncrementDailyUsage(tx, usageRef, usageSnap, uid, "comment", policy.DAILY_LIMITS.COMMENT);

      const userData = userSnap.data() || {};
      const authorDisplayName = policy.getPublicDisplayName(userData);
      const userSnapshot = {
        displayName: authorDisplayName,
        profileFrameId: userData.profileFrameId || "starter",
      };

      const now = new Date();
      const nowTimestamp = Timestamp.fromDate(now);

      // The recipient is always derived from the server-owned root comment.
      // Never trust a caller-provided UID for notification delivery.
      const targetRecipientUid = rootCommentData.authorId || rootCommentData.userId || null;

      const replyDoc = {
        kind: "reading_share_reply",
        shareId,
        rootCommentId,
        userId: uid,
        authorId: uid,
        userSnapshot,
        replyToUserId: targetRecipientUid || null,
        replyToDisplayName: rootCommentData.userSnapshot?.displayName || "탐험가",
        content: validated.content,
        status: policy.COMMENT_STATUSES.VISIBLE,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      };

      tx.set(replyRef, replyDoc);

      const nextReplyCount = (rootCommentData.replyCount || 0) + 1;
      tx.update(rootCommentRef, {
        replyCount: nextReplyCount,
        updatedAt: nowTimestamp,
      });

      const nextCommentCount = (shareData.commentCount || 0) + 1;
      tx.update(shareRef, {
        commentCount: nextCommentCount,
      });

      // Send notification to recipient (if not replying to self)
      if (targetRecipientUid && targetRecipientUid !== uid) {
        const notifId = policy.getReplyNotificationId(shareId, rootCommentId, replyId, targetRecipientUid);
        const notifRef = db.collection("notifications").doc(notifId);
        tx.set(notifRef, {
          recipientId: targetRecipientUid,
          actorId: uid,
          shareId,
          commentId: rootCommentId,
          replyId,
          type: "reading_share_reply",
          title: "내 생각에 새로운 답글이 도착했어요",
          message: `${authorDisplayName}님이 '${shareData.bookSnapshot?.title || "추천 책"}' 대화에 답글을 남겼습니다.`,
          link: `/agora?filter=reading&highlight=${shareId}`,
          isRead: false,
          createdAt: nowTimestamp,
        });
      }

      const result = {
        success: true,
        reply: {
          id: replyId,
          ...replyDoc,
          createdAt: nowTimestamp.toDate().toISOString(),
          updatedAt: nowTimestamp.toDate().toISOString(),
        },
        replyCount: nextReplyCount,
        commentCount: nextCommentCount,
      };

      tx.set(
        cmdRef,
        buildCommandData({
          uid,
          commandId,
          type: "reply_reading_share_comment",
          payloadHash,
          targetId: replyId,
          result,
          now,
          nowTimestamp,
        })
      );

      return result;
    });
  });

  /**
   * 11. deleteReadingShareReply
   * Soft deletes a reply and decrements rootComment replyCount & share commentCount
   */
  const deleteReadingShareReply = costOptimizedDataFunctions.https.onCall(async (data, context) => {
    const uid = await requireAuthUid(context);
    observeAppCheck(context, "deleteReadingShareReply");
    const commandId = String(data?.commandId || "").trim();
    const shareId = String(data?.shareId || "").trim();
    const rootCommentId = String(data?.rootCommentId || "").trim();
    const replyId = String(data?.replyId || "").trim();

    requireSafeDocumentId(shareId, "추천 글");
    requireSafeDocumentId(rootCommentId, "댓글");
    requireSafeDocumentId(replyId, "답글");

    const { cmdRef, payloadHash } = prepareCommand(uid, commandId, data);
    const shareRef = db.collection("readingShares").doc(shareId);
    const rootCommentRef = shareRef.collection("comments").doc(rootCommentId);
    const replyRef = rootCommentRef.collection("replies").doc(replyId);

    return await db.runTransaction(async (tx) => {
      const [cmdSnap, shareSnap, rootCommentSnap, replySnap] = await Promise.all([
        tx.get(cmdRef),
        tx.get(shareRef),
        tx.get(rootCommentRef),
        tx.get(replyRef),
      ]);

      const duplicateResolution = resolveCommandSnapshot(cmdSnap, payloadHash);
      if (duplicateResolution.isDuplicate) {
        return duplicateResolution.result;
      }

      if (!replySnap.exists) {
        throw new functions.https.HttpsError("not-found", "답글을 찾을 수 없습니다.", {
          code: policy.ERROR_CODES.REPLY_NOT_FOUND,
        });
      }

      const replyData = replySnap.data() || {};
      if (replyData.userId !== uid && replyData.authorId !== uid) {
        throw new functions.https.HttpsError("permission-denied", "본인의 답글만 삭제할 수 있습니다.");
      }

      if (replyData.status === policy.COMMENT_STATUSES.DELETED) {
        return { success: true, replyId, status: policy.COMMENT_STATUSES.DELETED };
      }

      const now = new Date();
      const nowTimestamp = Timestamp.fromDate(now);

      tx.update(replyRef, {
        content: "",
        authorId: null,
        userId: null,
        userSnapshot: {
          displayName: "삭제된 댓글",
        },
        status: policy.COMMENT_STATUSES.DELETED,
        deletedAt: nowTimestamp,
        updatedAt: nowTimestamp,
      });

      let nextReplyCount = 0;
      if (rootCommentSnap.exists) {
        const rcData = rootCommentSnap.data() || {};
        nextReplyCount = Math.max(0, (rcData.replyCount || 0) - 1);
        tx.update(rootCommentRef, {
          replyCount: nextReplyCount,
          updatedAt: nowTimestamp,
        });
      }

      let nextCommentCount = 0;
      if (shareSnap.exists) {
        const shareData = shareSnap.data() || {};
        nextCommentCount = Math.max(0, (shareData.commentCount || 0) - 1);
        tx.update(shareRef, {
          commentCount: nextCommentCount,
        });
      }

      if (replyData.replyToUserId) {
        const notifId = policy.getReplyNotificationId(shareId, rootCommentId, replyId, replyData.replyToUserId);
        tx.delete(db.collection("notifications").doc(notifId));
      }

      const result = {
        success: true,
        replyId,
        status: policy.COMMENT_STATUSES.DELETED,
        replyCount: nextReplyCount,
        commentCount: nextCommentCount,
      };

      tx.set(
        cmdRef,
        buildCommandData({
          uid,
          commandId,
          type: "delete_reading_share_reply",
          payloadHash,
          targetId: replyId,
          result,
          now,
          nowTimestamp,
        })
      );

      return result;
    });
  });

  /**
   * 12. getReadingShareReactionUsers
   * Returns list of public user profiles for a specific reaction type on a share
   */
  const getReadingShareReactionUsers = costOptimizedDataFunctions.https.onCall(async (data, context) => {
    const uid = await requireAuthUid(context);
    observeAppCheck(context, "getReadingShareReactionUsers");
    const shareId = String(data?.shareId || "").trim();
    const targetType = String(data?.reactionType || data?.type || "").trim();
    const cursor = data?.cursor ? String(data.cursor).trim() : "";
    const pageSize = 20;
    requireSafeDocumentId(shareId, "추천 글");
    if (!["resonated", "want_to_read", "read"].includes(targetType)) {
      throw new functions.https.HttpsError("invalid-argument", "올바른 반응 종류를 선택해 주세요.");
    }
    if (cursor) requireSafeDocumentId(cursor, "페이지");

    const shareRef = db.collection("readingShares").doc(shareId);
    const shareSnap = await shareRef.get();
    if (!shareSnap.exists) {
      throw new functions.https.HttpsError("not-found", "추천 글을 찾을 수 없습니다.");
    }
    const shareData = shareSnap.data() || {};
    if (shareData.status !== policy.SHARE_STATUSES.ACTIVE && shareData.ownerId !== uid) {
      throw new functions.https.HttpsError("failed-precondition", "활성화된 추천 글의 반응만 조회할 수 있습니다.");
    }
    const nowKST = getKSTDateString();
    const usageRef = db.collection("readingSocialUsage").doc(policy.getDailyUsageDocId(uid, nowKST));
    await db.runTransaction(async (tx) => {
      const usageSnap = await tx.get(usageRef);
      checkAndIncrementDailyUsage(
        tx,
        usageRef,
        usageSnap,
        uid,
        "reactionList",
        policy.DAILY_LIMITS.REACTION_LIST
      );
    });

    const filterField = targetType === "resonated" ? "resonated" : "readingIntent";
    const filterValue = targetType === "resonated" ? true : targetType;
    let reactionsQuery = shareRef.collection("reactions")
      .where(filterField, "==", filterValue)
      .limit(pageSize + 1);
    if (cursor) reactionsQuery = reactionsQuery.startAfter(cursor);

    // During the v1 -> v2 transition, old reaction documents use `type`.
    let legacyQuery = null;
    if (targetType === "resonated") {
      legacyQuery = shareRef.collection("reactions")
        .where("type", "in", ["resonate", "resonated"])
        .limit(pageSize + 1);
      if (cursor) legacyQuery = legacyQuery.startAfter(cursor);
    } else if (targetType === "want_to_read") {
      legacyQuery = shareRef.collection("reactions")
        .where("type", "in", ["want", "want_to_read"])
        .limit(pageSize + 1);
      if (cursor) legacyQuery = legacyQuery.startAfter(cursor);
    }

    const [reactionsSnap, legacySnap] = await Promise.all([
      reactionsQuery.get(),
      legacyQuery ? legacyQuery.get() : Promise.resolve(null),
    ]);
    const docsById = new Map();
    reactionsSnap.docs.forEach((docSnap) => docsById.set(docSnap.id, docSnap));
    legacySnap?.docs.forEach((docSnap) => docsById.set(docSnap.id, docSnap));
    const mergedDocs = [...docsById.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const pageDocs = mergedDocs.slice(0, pageSize);
    const hasMore = mergedDocs.length > pageSize ||
      reactionsSnap.docs.length > pageSize ||
      Boolean(legacySnap && legacySnap.docs.length > pageSize);
    const matchingUserIds = pageDocs.map((docSnap) => docSnap.id);
    if (matchingUserIds.length === 0) {
      return { users: [], nextCursor: null };
    }

    const usersSnap = await db.collection("users")
      .where(admin.firestore.FieldPath.documentId(), "in", matchingUserIds)
      .get();
    const usersById = new Map(usersSnap.docs.map((uDoc) => [uDoc.id, uDoc.data() || {}]));
    const users = matchingUserIds.flatMap((userId) => {
      const userData = usersById.get(userId);
      if (!userData || userData.isDeleted === true || userData.accountStatus === "deleted") return [];
      return [{
        id: userId,
        displayName: policy.getPublicDisplayName(userData),
        profileFrameId: userData.profileFrameId || "starter",
      }];
    });

    return {
      users,
      nextCursor: hasMore ? pageDocs[pageDocs.length - 1]?.id || null : null,
    };
  });

  return {
    functions: {
      getReadingShareDraftSources,
      publishReadingShare,
      updateReadingShare,
      withdrawReadingShare,
      linkReadingShareBook,
      setReadingShareReaction,
      getReadingShareReactionUsers,
      commentReadingShare,
      deleteReadingShareComment,
      replyToReadingShareComment,
      deleteReadingShareReply,
      reportReadingShare,
      moderateReadingShare,
    },
  };
};
