const policy = require("./classicReadingSocialPolicy");

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
   * 5. setReadingShareReaction
   * Goal-based reaction mutation: sets reaction to 'want_to_read', 'resonated', or null (cancels)
   */
  const setReadingShareReaction = costOptimizedDataFunctions.https.onCall(async (data, context) => {
    const uid = await requireAuthUid(context);
    observeAppCheck(context, "setReadingShareReaction");
    const shareId = String(data?.shareId || "").trim();
    requireSafeDocumentId(shareId, "추천 글");
    const rawReactionType = data?.reactionType;

    const validatedType = policy.validateReactionType(rawReactionType);
    if (!validatedType.valid) {
      throw new functions.https.HttpsError("invalid-argument", validatedType.message, {
        code: validatedType.error,
      });
    }
    const targetType = validatedType.reactionType; // null | 'want_to_read' | 'resonated'

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

      const currentType = reactionSnap.exists ? reactionSnap.data()?.type || null : null;
      if (currentType === targetType) {
        return {
          success: true,
          reactionType: targetType,
          reactionCounts: shareData.reactionCounts || { wantToRead: 0, resonated: 0 },
        };
      }

      // Check daily reaction rate limit
      checkAndIncrementDailyUsage(tx, usageRef, usageSnap, uid, "reaction", policy.DAILY_LIMITS.REACTION);

      const deltas = policy.calculateReactionDelta(currentType, targetType);
      const currentCounts = shareData.reactionCounts || { wantToRead: 0, resonated: 0 };
      const nextWantToRead = Math.max(0, (currentCounts.wantToRead || 0) + deltas.wantToReadDelta);
      const nextResonated = Math.max(0, (currentCounts.resonated || 0) + deltas.resonatedDelta);

      const now = new Date();
      const nowTimestamp = Timestamp.fromDate(now);

      tx.update(shareRef, {
        "reactionCounts.wantToRead": nextWantToRead,
        "reactionCounts.resonated": nextResonated,
      });

      if (targetType === null) {
        tx.delete(reactionRef);
      } else {
        tx.set(reactionRef, {
          kind: "reading_share",
          userId: uid,
          type: targetType,
          createdAt: reactionSnap.exists ? reactionSnap.data()?.createdAt || nowTimestamp : nowTimestamp,
          updatedAt: nowTimestamp,
        });
      }

      return {
        success: true,
        reactionType: targetType,
        reactionCounts: {
          wantToRead: nextWantToRead,
          resonated: nextResonated,
        },
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
          link: `/?view=agora&filter=reading&highlight=${shareId}`,
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

  return {
    functions: {
      getReadingShareDraftSources,
      publishReadingShare,
      updateReadingShare,
      withdrawReadingShare,
      setReadingShareReaction,
      commentReadingShare,
      deleteReadingShareComment,
      reportReadingShare,
      moderateReadingShare,
    },
  };
};
