const policy = require("./classicReadingPolicy");

const SUBMISSION_LOOKBACK_DAYS = 7;
const COMMAND_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const PUBLIC_BOOKSHELF_PREVIEW_SIZE = 12;
const PUBLIC_BOOKSHELF_MAX_PAGE_SIZE = 24;

module.exports = function ({ functions, admin, costOptimizedDataFunctions, requireAuthUid, requireAdminUid, recordCrystalTransaction }) {
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

  /**
   * Re-calculate readingBook progress projections from valid logs list
   */
  async function rebuildReadingBookProgress(targetDb, transaction, bookId) {
    const logsQuery = targetDb
      .collection("readingLogs")
      .where("bookId", "==", bookId);

    const snap = transaction ? await transaction.get(logsQuery) : await logsQuery.get();
    const logs = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    const progress = policy.calculateReadingBookProgressFromLogs(logs);

    const bookRef = targetDb.collection("readingBooks").doc(bookId);
    const updateData = {
      progress: {
        latestReadPage: progress.latestReadPage,
        furthestPage: progress.furthestPage,
        latestReadAt: progress.latestReadAt || null,
        latestLogId: progress.latestLogId || null,
      },
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (transaction) {
      transaction.update(bookRef, updateData);
    } else {
      await bookRef.update(updateData);
    }

    return progress;
  }

  function prepareCommand(userId, commandId, payload) {
    if (!/^[A-Za-z0-9_-]{8,160}$/.test(commandId)) {
      throw new functions.https.HttpsError("invalid-argument", "commandId가 필요합니다.");
    }
    const cmdRef = db.collection("readingCommands").doc(policy.getCommandDocId(userId, commandId));
    const payloadHash = policy.hashPayload(payload || {});
    return { cmdRef, payloadHash };
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

  function parseKSTDateTime(dateStr, clockTime) {
    if (!policy.validateDateString(dateStr) || !policy.validateClockTime(clockTime)) return null;
    const parsed = new Date(`${dateStr}T${clockTime}:00+09:00`);
    if (!Number.isFinite(parsed.getTime()) || getKSTDateString(parsed) !== dateStr) return null;
    return parsed;
  }

  function isWesternClassicCluster(clusterId) {
    return ["western-classic", "서양고전", "서양고전읽기", "classic", "classics"].includes(clusterId);
  }

  function getReadingCreditRefs(uid, bookId, dateKey = "") {
    const userRef = db.collection("users").doc(uid);
    return {
      userRef,
      dayCreditRef: dateKey ? userRef.collection("readingDayCredits").doc(dateKey) : null,
      bookDayCreditRef: dateKey
        ? userRef.collection("readingBookDayCredits").doc(`${bookId}__${dateKey}`)
        : null,
      bookCreditRef: userRef.collection("readingBookCredits").doc(bookId),
    };
  }

  function applyReadingDayCredit(tx, {
    uid,
    bookId,
    logId,
    readDateKst,
    recordedAt,
    source,
    bookRef,
    bookData,
    nowTimestamp,
    userSnap,
    dayCreditSnap,
    bookDayCreditSnap,
    recentDayCreditsSnap,
  }) {
    if (!policy.isReadingLogEligibleForDayCredit({ readDateKst, recordedAt })) {
      return { bookData, readingStats: userSnap.data()?.readingStats || {} };
    }

    const { userRef, dayCreditRef, bookDayCreditRef } = getReadingCreditRefs(uid, bookId, readDateKst);
    let readingStats = userSnap.data()?.readingStats || {};
    let nextBookData = bookData;

    if (!bookDayCreditSnap.exists) {
      tx.set(bookDayCreditRef, {
        bookId,
        dateKey: readDateKst,
        firstLogId: logId,
        source,
        eligibilityVersion: 1,
        creditedAt: nowTimestamp,
      });
      const currentAchievementStats = bookData.achievementStats || {};
      const achievementStats = {
        ...currentAchievementStats,
        validReadingDayCount: Math.max(0, Number(currentAchievementStats.validReadingDayCount || 0)) + 1,
        reviewedAssignmentCount: Math.max(0, Number(currentAchievementStats.reviewedAssignmentCount || 0)),
        version: 1,
      };
      tx.set(bookRef, { achievementStats }, { merge: true });
      nextBookData = { ...bookData, achievementStats };
    }

    if (!dayCreditSnap.exists) {
      tx.set(dayCreditRef, {
        dateKey: readDateKst,
        firstLogId: logId,
        firstBookId: bookId,
        source,
        eligibilityVersion: 1,
        creditedAt: nowTimestamp,
      });
      const recentDates = recentDayCreditsSnap.docs.map((docSnap) => docSnap.id);
      const streaks = policy.calculateStreaks(
        [...recentDates, readDateKst],
        getKSTDateString(nowTimestamp.toDate())
      );
      readingStats = {
        ...readingStats,
        readingDayCount: Math.max(0, Number(readingStats.readingDayCount || 0)) + 1,
        currentReadingStreak: streaks.currentReadingStreak,
        longestReadingStreak: Math.max(
          Math.max(0, Number(readingStats.longestReadingStreak || 0)),
          streaks.longestReadingStreak
        ),
        version: 1,
        backfillComplete: readingStats.backfillComplete === true,
      };
      tx.set(userRef, { readingStats }, { merge: true });
    }

    return { bookData: nextBookData, readingStats };
  }

  function reconcileReadingBookCredit(tx, {
    uid,
    bookId,
    bookData,
    nowTimestamp,
    userSnap,
    bookCreditSnap,
    readingStats: projectedReadingStats,
  }) {
    const { userRef, bookCreditRef } = getReadingCreditRefs(uid, bookId);
    const readingStats = projectedReadingStats || userSnap.data()?.readingStats || {};
    const eligible = policy.isBookEligibleForCompletion(bookData);
    if (eligible === bookCreditSnap.exists) return readingStats;

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
    return nextReadingStats;
  }

  /**
   * Public-profile bookshelf projection.
   *
   * The source readingBooks documents remain private. This callable returns
   * only the small, presentation-safe subset used by an enabled public
   * profile; reading logs, notes, assignment text and lifecycle timestamps
   * never leave the server through this endpoint.
   */
  const getPublicReadingBookshelf = costOptimizedDataFunctions.https.onCall(async (data, context) => {
    const requesterUid = await requireAuthUid(context);
    const targetUserId = String(data?.userId || "").trim();
    const requestedLimit = Number(data?.limit || PUBLIC_BOOKSHELF_PREVIEW_SIZE);
    const pageSize = Number.isInteger(requestedLimit)
      ? Math.min(PUBLIC_BOOKSHELF_MAX_PAGE_SIZE, Math.max(1, requestedLimit))
      : PUBLIC_BOOKSHELF_PREVIEW_SIZE;
    const cursorCreatedAtMs = Number(data?.cursor?.createdAtMs || 0);
    const cursorBookId = String(data?.cursor?.bookId || "").trim();

    if (!targetUserId || targetUserId.length > 160 || targetUserId.includes("/")) {
      throw new functions.https.HttpsError("invalid-argument", "프로필 사용자 정보가 올바르지 않습니다.");
    }

    const profileSnap = await db.collection("users").doc(targetUserId).get();
    if (!profileSnap.exists) {
      throw new functions.https.HttpsError("not-found", "프로필을 찾을 수 없습니다.");
    }

    const profile = profileSnap.data() || {};
    const isOwner = requesterUid === targetUserId;
    if (!isOwner && profile.publicProfileEnabled === false) {
      throw new functions.https.HttpsError("permission-denied", "공개 설정이 꺼진 프로필입니다.");
    }

    let booksQuery = db.collection("readingBooks")
      .where("userId", "==", targetUserId)
      .where("archivedAt", "==", null)
      .where("status", "in", [
        policy.BOOK_STATUSES.READING,
        policy.BOOK_STATUSES.COMPLETED,
        policy.BOOK_STATUSES.PAUSED,
      ])
      .orderBy("createdAt", "desc")
      .orderBy(admin.firestore.FieldPath.documentId(), "desc");

    if (cursorCreatedAtMs > 0 || cursorBookId) {
      if (!Number.isFinite(cursorCreatedAtMs) || cursorCreatedAtMs <= 0 || !cursorBookId || cursorBookId.includes("/")) {
        throw new functions.https.HttpsError("invalid-argument", "책장 페이지 정보가 올바르지 않습니다.");
      }
      booksQuery = booksQuery.startAfter(Timestamp.fromMillis(cursorCreatedAtMs), cursorBookId);
    }

    const booksSnap = await booksQuery.limit(pageSize + 1).get();
    const pageDocs = booksSnap.docs.slice(0, pageSize);
    const hasMore = booksSnap.docs.length > pageSize;

    const books = pageDocs
      .map((bookDoc) => ({ id: bookDoc.id, ...(bookDoc.data() || {}) }))
      .map((book) => ({
        id: book.id,
        title: String(book.title || "").slice(0, 200),
        author: String(book.author || "").slice(0, 120),
        status: Object.values(policy.BOOK_STATUSES).includes(book.status)
          ? book.status
          : policy.BOOK_STATUSES.READING,
        currentPage: policy.validatePage(book.progress?.furthestPage || book.progress?.latestReadPage || 0).valid
          ? Number(book.progress?.furthestPage || book.progress?.latestReadPage)
          : 0,
        publicShareId: book.publicShare?.status === "active" && typeof book.publicShare?.shareId === "string"
          ? book.publicShare.shareId
          : null,
      }));

    const lastDoc = pageDocs[pageDocs.length - 1];
    const nextCursor = hasMore && lastDoc ? {
      createdAtMs: lastDoc.data()?.createdAt?.toMillis?.() || 0,
      bookId: lastDoc.id,
    } : null;

    return { books, hasMore, nextCursor };
  });

  /**
   * 1. createReadingBook
   */
  const createReadingBook = costOptimizedDataFunctions.https.onCall(async (data, context) => {
    const uid = await requireAuthUid(context);
    const commandId = String(data?.commandId || "").trim();
    const title = String(data?.title || "").trim();
    const author = String(data?.author || "").trim();
    const status = String(data?.status || policy.BOOK_STATUSES.READING).trim();
    const dateInput = data?.dateInput ? String(data.dateInput).trim() : null;

    const validation = policy.validateBookInput({ title, author, status });
    if (!validation.valid) {
      throw new functions.https.HttpsError("invalid-argument", validation.message, { code: validation.error });
    }

    const command = prepareCommand(uid, commandId, { title, author, status, dateInput });

    const now = new Date();
    const nowTimestamp = Timestamp.fromDate(now);
    const todayKst = getKSTDateString(now);
    let customTimestamp = nowTimestamp;

    if (dateInput) {
      if (dateInput === todayKst) {
        customTimestamp = nowTimestamp;
      } else if (dateInput > todayKst) {
        throw new functions.https.HttpsError("invalid-argument", "독서 상태 일자가 올바르지 않습니다. (미래 날짜는 선택할 수 없습니다)");
      } else {
        const customDate = parseKSTDateTime(dateInput, "12:00");
        if (!customDate) {
          throw new functions.https.HttpsError("invalid-argument", "독서 상태 일자 형식이 올바르지 않습니다.");
        }
        customTimestamp = Timestamp.fromDate(customDate);
      }
    }

    const bookRef = db.collection("readingBooks").doc();
    const bookId = bookRef.id;

    const isWantToRead = validation.status === policy.BOOK_STATUSES.WANT_TO_READ;
    const bookData = {
      userId: uid,
      title: validation.title,
      author: validation.author,
      normalizedTitle: validation.normalizedTitle,
      normalizedAuthor: validation.normalizedAuthor,
      status: validation.status,
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
      wantedAt: isWantToRead ? customTimestamp : null,
      startedAt: isWantToRead ? null : customTimestamp,
      completedAt: validation.status === policy.BOOK_STATUSES.COMPLETED ? customTimestamp : null,
      pausedAt: validation.status === policy.BOOK_STATUSES.PAUSED ? customTimestamp : null,
      statusUpdatedAt: nowTimestamp,
      archivedAt: null,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
      schemaVersion: 2,
    };

    const resultPayload = { bookId, title: validation.title, author: validation.author, status: validation.status };
    return db.runTransaction(async (tx) => {
      const commandSnap = await tx.get(command.cmdRef);
      const existing = resolveCommandSnapshot(commandSnap, command.payloadHash);
      if (existing.isDuplicate) return existing.result;

      tx.set(bookRef, bookData);
      tx.set(command.cmdRef, buildCommandData({
        uid,
        commandId,
        type: "create_book",
        payloadHash: command.payloadHash,
        targetId: bookId,
        result: resultPayload,
        now,
        nowTimestamp,
      }));
      return resultPayload;
    });
  });

  /**
   * 2. updateReadingBookStatus
   */
  const updateReadingBookStatus = costOptimizedDataFunctions.https.onCall(async (data, context) => {
    const uid = await requireAuthUid(context);
    const commandId = String(data?.commandId || "").trim();
    const bookId = String(data?.bookId || "").trim();
    const targetStatus = String(data?.status || "").trim();

    if (!bookId) throw new functions.https.HttpsError("invalid-argument", "책 ID가 필요합니다.");
    if (!policy.ALLOWED_BOOK_STATUSES.has(targetStatus)) {
      throw new functions.https.HttpsError("invalid-argument", "올바른 독서 상태를 선택해 주세요.");
    }

    const command = prepareCommand(uid, commandId, { bookId, targetStatus });

    const bookRef = db.collection("readingBooks").doc(bookId);
    const now = new Date();
    const nowTimestamp = Timestamp.fromDate(now);
    const dateKst = getKSTDateString(now);

    let resultPayload = null;

    await db.runTransaction(async (tx) => {
      const creditRefs = getReadingCreditRefs(uid, bookId);
      const [commandSnap, bookSnap, userSnap, bookCreditSnap] = await Promise.all([
        tx.get(command.cmdRef),
        tx.get(bookRef),
        tx.get(creditRefs.userRef),
        tx.get(creditRefs.bookCreditRef),
      ]);
      const existing = resolveCommandSnapshot(commandSnap, command.payloadHash);
      if (existing.isDuplicate) {
        resultPayload = existing.result;
        return;
      }
      if (!bookSnap.exists || bookSnap.data()?.archivedAt) {
        throw new functions.https.HttpsError("not-found", "책을 찾을 수 없습니다.", { code: policy.ERROR_CODES.BOOK_NOT_FOUND });
      }
      const book = bookSnap.data() || {};
      if (book.userId !== uid) {
        throw new functions.https.HttpsError("permission-denied", "본인의 책만 수정할 수 있습니다.", { code: policy.ERROR_CODES.BOOK_FORBIDDEN });
      }

      const prevStatus = book.status || policy.BOOK_STATUSES.READING;
      const transition = policy.validateStatusTransition(prevStatus, targetStatus);
      if (!transition.allowed) {
        throw new functions.https.HttpsError("invalid-argument", "허용되지 않는 상태 변경입니다.");
      }

      if (transition.unchanged) {
        resultPayload = { bookId, prevStatus, status: targetStatus, unchanged: true };
        tx.set(command.cmdRef, buildCommandData({
          uid,
          commandId,
          type: "update_status",
          payloadHash: command.payloadHash,
          targetId: bookId,
          result: resultPayload,
          now,
          nowTimestamp,
        }));
        return;
      }

      // Keep the low-cost denormalized lounge stage accurate when a shared book
      // crosses between the two public stages. We intentionally do not update the
      // share on every page log, which would turn ordinary reading into extra writes.
      let publicShareRef = null;
      let publicShareSnap = null;
      if (
        book.publicShare?.status === "active" &&
        book.publicShare?.shareId &&
        [policy.BOOK_STATUSES.READING, policy.BOOK_STATUSES.COMPLETED].includes(targetStatus)
      ) {
        publicShareRef = db.collection("readingShares").doc(book.publicShare.shareId);
        publicShareSnap = await tx.get(publicShareRef);
      }

      const updates = {
        status: targetStatus,
        statusUpdatedAt: nowTimestamp,
        updatedAt: nowTimestamp,
      };

      if (prevStatus === policy.BOOK_STATUSES.WANT_TO_READ && targetStatus === policy.BOOK_STATUSES.READING) {
        updates.startedAt = book.startedAt || nowTimestamp;
      }
      if (targetStatus === policy.BOOK_STATUSES.WANT_TO_READ) {
        updates.wantedAt = book.wantedAt || nowTimestamp;
      } else if (targetStatus === policy.BOOK_STATUSES.COMPLETED) {
        updates.completedAt = nowTimestamp;
      } else if (targetStatus === policy.BOOK_STATUSES.PAUSED) {
        updates.pausedAt = nowTimestamp;
      }

      tx.update(bookRef, updates);

      if (
        publicShareRef &&
        publicShareSnap?.exists &&
        publicShareSnap.data()?.ownerId === uid &&
        publicShareSnap.data()?.sourceBookId === bookId &&
        publicShareSnap.data()?.status === "active"
      ) {
        const totalPages = Number(book.totalPages || 0);
        const furthestPage = Number(book.progress?.furthestPage || 0);
        const progressPercent = targetStatus === policy.BOOK_STATUSES.READING && totalPages > 0
          ? Math.max(0, Math.min(100, Math.round((furthestPage / totalPages) * 100)))
          : null;
        tx.update(publicShareRef, {
          shareKind: targetStatus === policy.BOOK_STATUSES.COMPLETED
            ? "completed_recommendation"
            : "reading_invitation",
          "bookSnapshot.status": targetStatus,
          "bookSnapshot.progressPercent": progressPercent,
          updatedAt: nowTimestamp,
        });
      }

      const logRef = db.collection("readingLogs").doc();
      tx.set(logRef, {
        userId: uid,
        bookId,
        eventType: policy.LOG_EVENT_TYPES.STATUS_CHANGE,
        source: policy.LOG_SOURCES.BOOKSHELF,
        readDateKst: dateKst,
        readAt: nowTimestamp,
        page: book.progress?.furthestPage || 0,
        summary: null,
        assignmentId: null,
        statusFrom: prevStatus,
        statusTo: targetStatus,
        revision: 1,
        lockedAt: null,
        correctionOfLogId: null,
        voidedAt: null,
        bookSnapshot: {
          title: book.title || "",
          author: book.author || "",
        },
        recordedAt: nowTimestamp,
        updatedAt: nowTimestamp,
        schemaVersion: 1,
      });

      const updatedBookData = {
        ...book,
        ...updates,
        progress: book.progress || {},
      };

      await reconcileReadingBookCredit(tx, {
        uid,
        bookId,
        bookData: updatedBookData,
        nowTimestamp,
        userSnap,
        bookCreditSnap,
      });

      resultPayload = { bookId, prevStatus, status: targetStatus, logId: logRef.id };

      tx.set(command.cmdRef, buildCommandData({
        uid,
        commandId,
        type: "update_status",
        payloadHash: command.payloadHash,
        targetId: bookId,
        result: resultPayload,
        now,
        nowTimestamp,
      }));
    });

    return resultPayload;
  });

  /**
   * 3. saveReadingProgress
   */
  const saveReadingProgress = costOptimizedDataFunctions.https.onCall(async (data, context) => {
    const uid = await requireAuthUid(context);
    const commandId = String(data?.commandId || "").trim();
    const bookId = String(data?.bookId || "").trim();
    const page = Number(data?.page);
    const dateStr = String(data?.dateStr || "").trim();
    const clockTime = String(data?.clockTime || "12:00").trim();
    const memo = String(data?.memo || "").trim();

    if (!bookId) throw new functions.https.HttpsError("invalid-argument", "책 ID가 필요합니다.");
    const pageValidation = policy.validatePage(page);
    if (!pageValidation.valid) {
      throw new functions.https.HttpsError("invalid-argument", pageValidation.message, { code: pageValidation.error });
    }

    const command = prepareCommand(uid, commandId, { bookId, page: pageValidation.page, dateStr, clockTime, memo });

    const bookRef = db.collection("readingBooks").doc(bookId);
    const now = new Date();
    const nowTimestamp = Timestamp.fromDate(now);

    const readAtDate = parseKSTDateTime(dateStr, clockTime);
    if (!readAtDate || readAtDate.getTime() > now.getTime() + 5 * 60 * 1000) {
      throw new functions.https.HttpsError("invalid-argument", "읽은 날짜와 시각이 올바르지 않습니다.", { code: policy.ERROR_CODES.INVALID_READ_AT });
    }
    const safeDate = dateStr;
    const readAtTimestamp = Timestamp.fromDate(readAtDate);

    let resultPayload = null;

    await db.runTransaction(async (tx) => {
      const creditRefs = getReadingCreditRefs(uid, bookId, safeDate);
      const [commandSnap, bookSnap, userSnap, dayCreditSnap, bookDayCreditSnap, bookCreditSnap] = await Promise.all([
        tx.get(command.cmdRef),
        tx.get(bookRef),
        tx.get(creditRefs.userRef),
        tx.get(creditRefs.dayCreditRef),
        tx.get(creditRefs.bookDayCreditRef),
        tx.get(creditRefs.bookCreditRef),
      ]);
      const existing = resolveCommandSnapshot(commandSnap, command.payloadHash);
      if (existing.isDuplicate) {
        resultPayload = existing.result;
        return;
      }
      if (!bookSnap.exists || bookSnap.data()?.archivedAt) {
        throw new functions.https.HttpsError("not-found", "책을 찾을 수 없습니다.", { code: policy.ERROR_CODES.BOOK_NOT_FOUND });
      }
      const book = bookSnap.data() || {};
      if (book.userId !== uid) {
        throw new functions.https.HttpsError("permission-denied", "본인의 책만 수정할 수 있습니다.", { code: policy.ERROR_CODES.BOOK_FORBIDDEN });
      }
      if (book.status === policy.BOOK_STATUSES.WANT_TO_READ) {
        throw new functions.https.HttpsError("failed-precondition", "읽기 시작하지 않은 책에는 독서 기록을 남길 수 없습니다.", { code: policy.ERROR_CODES.BOOK_NOT_STARTED });
      }
      if (!userSnap.exists) {
        throw new functions.https.HttpsError("failed-precondition", "사용자 문서를 찾을 수 없습니다.");
      }

      const recentDayCreditsSnap = dayCreditSnap.exists
        ? { docs: [] }
        : await tx.get(
          creditRefs.userRef.collection("readingDayCredits")
            .orderBy("dateKey", "desc")
            .limit(31)
        );

      const logRef = db.collection("readingLogs").doc();
      const logData = {
        userId: uid,
        bookId,
        eventType: policy.LOG_EVENT_TYPES.PROGRESS,
        source: policy.LOG_SOURCES.BOOKSHELF,
        readDateKst: safeDate,
        readAt: readAtTimestamp,
        page: pageValidation.page,
        summary: memo ? memo.slice(0, 1000) : "",
        assignmentId: null,
        statusFrom: null,
        statusTo: null,
        revision: 1,
        lockedAt: null,
        correctionOfLogId: null,
        voidedAt: null,
        bookSnapshot: {
          title: book.title || "",
          author: book.author || "",
        },
        recordedAt: nowTimestamp,
        updatedAt: nowTimestamp,
        schemaVersion: 1,
      };
      tx.set(logRef, logData);

      const nextProgress = policy.calculateIncrementalProgress(book.progress || {}, {
        id: logRef.id,
        page: pageValidation.page,
        readAt: readAtTimestamp,
      });

      tx.update(bookRef, {
        progress: nextProgress,
        updatedAt: nowTimestamp,
      });

      const updatedBookData = {
        ...book,
        progress: nextProgress,
      };

      const creditResult = applyReadingDayCredit(tx, {
        uid,
        bookId,
        logId: logRef.id,
        readDateKst: safeDate,
        readAt: readAtTimestamp,
        recordedAt: nowTimestamp,
        source: policy.LOG_SOURCES.BOOKSHELF,
        bookRef,
        bookData: updatedBookData,
        nowTimestamp,
        userSnap,
        dayCreditSnap,
        bookDayCreditSnap,
        recentDayCreditsSnap,
      });

      reconcileReadingBookCredit(tx, {
        uid,
        bookId,
        bookData: creditResult.bookData,
        nowTimestamp,
        userSnap,
        bookCreditSnap,
        readingStats: creditResult.readingStats,
      });

      resultPayload = {
        logId: logRef.id,
        bookId,
        page: pageValidation.page,
        progress: nextProgress,
      };

      tx.set(command.cmdRef, buildCommandData({
        uid,
        commandId,
        type: "save_progress",
        payloadHash: command.payloadHash,
        targetId: logRef.id,
        result: resultPayload,
        now,
        nowTimestamp,
      }));
    });

    return resultPayload;
  });

  /**
   * 4. archiveReadingBook
   */
  const archiveReadingBook = costOptimizedDataFunctions.https.onCall(async (data, context) => {
    const uid = await requireAuthUid(context);
    const commandId = String(data?.commandId || "").trim();
    const bookId = String(data?.bookId || "").trim();

    if (!bookId) throw new functions.https.HttpsError("invalid-argument", "책 ID가 필요합니다.");

    const command = prepareCommand(uid, commandId, { bookId });
    const bookRef = db.collection("readingBooks").doc(bookId);
    const now = new Date();
    const nowTimestamp = Timestamp.fromDate(now);
    const pendingAssignmentQuery = db.collection("readingLogs")
      .where("userId", "==", uid)
      .where("bookId", "==", bookId)
      .where("source", "==", policy.LOG_SOURCES.ASSIGNMENT)
      .where("lockedAt", "==", null)
      .where("voidedAt", "==", null)
      .limit(1);

    return db.runTransaction(async (tx) => {
      const commandSnap = await tx.get(command.cmdRef);
      const existing = resolveCommandSnapshot(commandSnap, command.payloadHash);
      if (existing.isDuplicate) return existing.result;

      const bookSnap = await tx.get(bookRef);
      if (!bookSnap.exists) {
        throw new functions.https.HttpsError("not-found", "책을 찾을 수 없습니다.", { code: policy.ERROR_CODES.BOOK_NOT_FOUND });
      }
      const book = bookSnap.data() || {};
      if (book.userId !== uid) {
        throw new functions.https.HttpsError("permission-denied", "본인의 책만 보관할 수 있습니다.", { code: policy.ERROR_CODES.BOOK_FORBIDDEN });
      }

      if (book.archivedAt) {
        const unchangedResult = { bookId, archived: true, unchanged: true };
        tx.set(command.cmdRef, buildCommandData({
          uid,
          commandId,
          type: "archive_book",
          payloadHash: command.payloadHash,
          targetId: bookId,
          result: unchangedResult,
          now,
          nowTimestamp,
        }));
        return unchangedResult;
      }

      const creditRefs = getReadingCreditRefs(uid, bookId);
      const [pendingAssignmentSnap, userSnap, bookCreditSnap] = await Promise.all([
        tx.get(pendingAssignmentQuery),
        tx.get(creditRefs.userRef),
        tx.get(creditRefs.bookCreditRef),
      ]);
      if (!pendingAssignmentSnap.empty) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "검토가 끝나지 않은 과제에 연결된 책은 보관할 수 없습니다."
        );
      }

      tx.update(bookRef, { archivedAt: nowTimestamp, updatedAt: nowTimestamp });

      const updatedBookData = {
        ...book,
        archivedAt: nowTimestamp,
        progress: book.progress || {},
      };

      await reconcileReadingBookCredit(tx, {
        uid,
        bookId,
        bookData: updatedBookData,
        nowTimestamp,
        userSnap,
        bookCreditSnap,
      });

      const resultPayload = { bookId, archived: true };
      tx.set(command.cmdRef, buildCommandData({
        uid,
        commandId,
        type: "archive_book",
        payloadHash: command.payloadHash,
        targetId: bookId,
        result: resultPayload,
        now,
        nowTimestamp,
      }));
      return resultPayload;
    });
  });

  /**
   * 4-0. unarchiveReadingBook (Restore book back to shelf)
   */
  const unarchiveReadingBook = costOptimizedDataFunctions.https.onCall(async (data, context) => {
    const uid = await requireAuthUid(context);
    const commandId = String(data?.commandId || "").trim();
    const bookId = String(data?.bookId || "").trim();

    if (!bookId) throw new functions.https.HttpsError("invalid-argument", "책 ID가 필요합니다.");

    const command = prepareCommand(uid, commandId, { bookId });
    const bookRef = db.collection("readingBooks").doc(bookId);
    const now = new Date();
    const nowTimestamp = Timestamp.fromDate(now);

    return db.runTransaction(async (tx) => {
      const commandSnap = await tx.get(command.cmdRef);
      const existing = resolveCommandSnapshot(commandSnap, command.payloadHash);
      if (existing.isDuplicate) return existing.result;

      const bookSnap = await tx.get(bookRef);
      if (!bookSnap.exists) {
        throw new functions.https.HttpsError("not-found", "책을 찾을 수 없습니다.", { code: policy.ERROR_CODES.BOOK_NOT_FOUND });
      }
      const book = bookSnap.data() || {};
      if (book.userId !== uid) {
        throw new functions.https.HttpsError("permission-denied", "본인의 책만 복원할 수 있습니다.", { code: policy.ERROR_CODES.BOOK_FORBIDDEN });
      }

      if (!book.archivedAt) {
        const unchangedResult = { bookId, unarchived: true, unchanged: true };
        tx.set(command.cmdRef, buildCommandData({
          uid,
          commandId,
          type: "unarchive_book",
          payloadHash: command.payloadHash,
          targetId: bookId,
          result: unchangedResult,
          now,
          nowTimestamp,
        }));
        return unchangedResult;
      }

      const creditRefs = getReadingCreditRefs(uid, bookId);
      const [userSnap, bookCreditSnap] = await Promise.all([
        tx.get(creditRefs.userRef),
        tx.get(creditRefs.bookCreditRef),
      ]);
      const restoredBookData = {
        ...book,
        archivedAt: null,
        updatedAt: nowTimestamp,
        progress: book.progress || {},
      };
      await reconcileReadingBookCredit(tx, {
        uid,
        bookId,
        bookData: restoredBookData,
        nowTimestamp,
        userSnap,
        bookCreditSnap,
      });

      tx.update(bookRef, { archivedAt: null, updatedAt: nowTimestamp });

      const resultPayload = { bookId, unarchived: true };
      tx.set(command.cmdRef, buildCommandData({
        uid,
        commandId,
        type: "unarchive_book",
        payloadHash: command.payloadHash,
        targetId: bookId,
        result: resultPayload,
        now,
        nowTimestamp,
      }));
      return resultPayload;
    });
  });

  /**
   * 4-1. updateReadingBookDetails (Total Pages, Rating)
   */
  const updateReadingBookDetails = costOptimizedDataFunctions.https.onCall(async (data, context) => {
    const uid = await requireAuthUid(context);
    const commandId = String(data?.commandId || "").trim();
    const bookId = String(data?.bookId || "").trim();
    const totalPages = data?.totalPages !== undefined && data?.totalPages !== null && data?.totalPages !== "" ? Number(data?.totalPages) : null;
    const rating = data?.rating !== undefined && data?.rating !== null ? Number(data?.rating) : null;

    if (!bookId) throw new functions.https.HttpsError("invalid-argument", "책 ID가 필요합니다.");
    if (totalPages !== null && (!Number.isInteger(totalPages) || totalPages < 1 || totalPages > 99999)) {
      throw new functions.https.HttpsError("invalid-argument", "전체 페이지는 1~99,999 사이의 정수여야 합니다.");
    }
    if (rating !== null && (!Number.isInteger(rating) || rating < 0 || rating > 5)) {
      throw new functions.https.HttpsError("invalid-argument", "별점은 0~5점 사이여야 합니다.");
    }

    const command = prepareCommand(uid, commandId, { bookId, totalPages, rating });
    const bookRef = db.collection("readingBooks").doc(bookId);
    const now = new Date();
    const nowTimestamp = Timestamp.fromDate(now);

    return db.runTransaction(async (tx) => {
      const creditRefs = getReadingCreditRefs(uid, bookId);
      const shouldReconcileCompletion = totalPages !== null;
      const [commandSnap, bookSnap, userSnap, bookCreditSnap] = await Promise.all([
        tx.get(command.cmdRef),
        tx.get(bookRef),
        shouldReconcileCompletion ? tx.get(creditRefs.userRef) : Promise.resolve(null),
        shouldReconcileCompletion ? tx.get(creditRefs.bookCreditRef) : Promise.resolve(null),
      ]);
      const existing = resolveCommandSnapshot(commandSnap, command.payloadHash);
      if (existing.isDuplicate) return existing.result;
      if (!bookSnap.exists || bookSnap.data()?.archivedAt) {
        throw new functions.https.HttpsError("not-found", "책을 찾을 수 없습니다.", { code: policy.ERROR_CODES.BOOK_NOT_FOUND });
      }
      const book = bookSnap.data() || {};
      if (book.userId !== uid) {
        throw new functions.https.HttpsError("permission-denied", "본인의 책만 수정할 수 있습니다.", { code: policy.ERROR_CODES.BOOK_FORBIDDEN });
      }

      const updates = { updatedAt: nowTimestamp };
      if (totalPages !== null) updates.totalPages = totalPages;
      if (rating !== null) updates.rating = rating;

      tx.update(bookRef, updates);

      const updatedBookData = {
        ...book,
        ...updates,
        progress: book.progress || {},
      };

      if (shouldReconcileCompletion) {
        reconcileReadingBookCredit(tx, {
          uid,
          bookId,
          bookData: updatedBookData,
          nowTimestamp,
          userSnap,
          bookCreditSnap,
        });
      }

      const resultPayload = { bookId, totalPages, rating };
      tx.set(command.cmdRef, buildCommandData({
        uid,
        commandId,
        type: "update_book_details",
        payloadHash: command.payloadHash,
        targetId: bookId,
        result: resultPayload,
        now,
        nowTimestamp,
      }));
      return resultPayload;
    });
  });

  /**
   * 5. submitClassicReadingAssignment
   */
  const submitClassicReadingAssignment = costOptimizedDataFunctions.https.onCall(async (data, context) => {
    const uid = await requireAuthUid(context);
    const commandId = String(data?.commandId || "").trim();
    const requestedAssignmentId = String(data?.assignmentId || "").trim();
    const dateStr = String(data?.date || "").trim();
    const clusterId = String(data?.clusterId || "western-classic").trim();
    const regionId = String(data?.regionId || "").trim();
    const content = String(data?.content || "").trim();
    const links = Array.isArray(data?.links) ? data.links : [];
    const attachments = Array.isArray(data?.attachments) ? data.attachments : [];
    const reading = data?.reading || {};

    const bookId = String(reading?.bookId || "").trim();
    const page = Number(reading?.page);
    const clockTime = String(reading?.clockTime || "20:00").trim();

    if (!policy.validateDateString(dateStr)) {
      throw new functions.https.HttpsError("invalid-argument", "날짜가 올바르지 않습니다.");
    }
    if (!isWesternClassicCluster(clusterId)) {
      throw new functions.https.HttpsError("invalid-argument", "서양고전 과제만 이 경로로 제출할 수 있습니다.");
    }
    if (requestedAssignmentId && (!/^[A-Za-z0-9_-]{1,240}$/.test(requestedAssignmentId))) {
      throw new functions.https.HttpsError("invalid-argument", "과제 ID가 올바르지 않습니다.");
    }
    if (!bookId) {
      throw new functions.https.HttpsError("invalid-argument", "읽은 책을 선택해 주세요.", { code: policy.ERROR_CODES.BOOK_NOT_FOUND });
    }
    const pageValidation = policy.validatePage(page);
    if (!pageValidation.valid) {
      throw new functions.https.HttpsError("invalid-argument", pageValidation.message, { code: pageValidation.error });
    }
    if (content.length < 10 || content.length > 10000) {
      throw new functions.https.HttpsError("invalid-argument", "오늘 읽은 내용은 10~10,000자로 작성해 주세요.");
    }

    const normalizedLinks = links.slice(0, 10).map((link) => ({
      title: String(link?.title || link?.name || "").trim().slice(0, 200),
      url: String(link?.url || "").trim().slice(0, 2048),
    }));
    const normalizedAttachments = attachments.slice(0, 10).map((attachment) => ({
      name: String(attachment?.name || "").trim().slice(0, 240),
      url: String(attachment?.url || "").trim().slice(0, 2048),
      type: String(attachment?.type || "").trim().slice(0, 80),
      storagePath: String(attachment?.storagePath || "").trim().slice(0, 1024),
    }));
    const hasInvalidLink = normalizedLinks.some((link) => !/^https:\/\//i.test(link.url));
    const hasInvalidAttachment = normalizedAttachments.some((attachment) =>
      !attachment.name || !/^https:\/\//i.test(attachment.url) ||
      (attachment.storagePath && !attachment.storagePath.startsWith(`assignments/${uid}/`))
    );
    if (links.length > 10 || attachments.length > 10 || hasInvalidLink || hasInvalidAttachment) {
      throw new functions.https.HttpsError("invalid-argument", "링크 또는 첨부파일 정보가 올바르지 않습니다.");
    }

    const command = prepareCommand(uid, commandId, {
      assignmentId: requestedAssignmentId || null,
      dateStr,
      clusterId: "western-classic",
      regionId,
      bookId,
      page: pageValidation.page,
      clockTime,
      content,
      links: normalizedLinks,
      attachments: normalizedAttachments,
    });

    const now = new Date();
    const nowTimestamp = Timestamp.fromDate(now);
    const readAtDate = parseKSTDateTime(dateStr, clockTime);
    if (!readAtDate || readAtDate.getTime() > now.getTime() + 5 * 60 * 1000) {
      throw new functions.https.HttpsError("invalid-argument", "읽은 시각이 올바르지 않습니다.", { code: policy.ERROR_CODES.INVALID_READ_AT });
    }
    const readAtTimestamp = Timestamp.fromDate(readAtDate);

    // Verify submission period (within SUBMISSION_LOOKBACK_DAYS from today KST)
    const todayKst = getKSTDateString(now);
    const dateDiffDays = Math.floor((new Date(`${todayKst}T12:00:00+09:00`) - new Date(`${dateStr}T12:00:00+09:00`)) / (24 * 60 * 60 * 1000));
    if (dateDiffDays < 0 || dateDiffDays >= SUBMISSION_LOOKBACK_DAYS) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        `과제는 오늘 포함 최근 ${SUBMISSION_LOOKBACK_DAYS}일 이내만 제출 가능합니다.`,
        { code: policy.ERROR_CODES.SUBMISSION_PERIOD_EXPIRED }
      );
    }

    const deterministicAssignmentId = policy.getDeterministicAssignmentId(uid, dateStr);
    const assignmentId = requestedAssignmentId || deterministicAssignmentId;
    const assignmentRef = db.collection("assignments").doc(assignmentId);
    const deterministicLogId = policy.getDeterministicAssignmentLogId(assignmentId);
    const logRef = db.collection("readingLogs").doc(deterministicLogId);
    const bookRef = db.collection("readingBooks").doc(bookId);

    let resultPayload = null;

    try {
      await db.runTransaction(async (tx) => {
        const creditRefs = getReadingCreditRefs(uid, bookId, dateStr);
        const [commandSnap, assignmentSnap, bookSnap, logSnap, userSnap, dayCreditSnap, bookDayCreditSnap, bookCreditSnap] = await Promise.all([
          tx.get(command.cmdRef),
          tx.get(assignmentRef),
          tx.get(bookRef),
          tx.get(logRef),
          tx.get(creditRefs.userRef),
          tx.get(creditRefs.dayCreditRef),
          tx.get(creditRefs.bookDayCreditRef),
          tx.get(creditRefs.bookCreditRef),
        ]);
        const existing = resolveCommandSnapshot(commandSnap, command.payloadHash);
        if (existing.isDuplicate) {
          resultPayload = existing.result;
          return;
        }

        if (requestedAssignmentId && !assignmentSnap.exists) {
          throw new functions.https.HttpsError("not-found", "수정할 기존 과제를 찾을 수 없습니다.");
        }

        if (!bookSnap.exists || bookSnap.data()?.archivedAt) {
          throw new functions.https.HttpsError("not-found", "선택한 책을 찾을 수 없습니다.", { code: policy.ERROR_CODES.BOOK_NOT_FOUND });
        }
        const book = bookSnap.data() || {};
        if (book.userId !== uid) {
          throw new functions.https.HttpsError("permission-denied", "본인의 책에만 과제를 제출할 수 있습니다.", { code: policy.ERROR_CODES.BOOK_FORBIDDEN });
        }
        if (book.status === policy.BOOK_STATUSES.WANT_TO_READ) {
          throw new functions.https.HttpsError("failed-precondition", "읽기 시작하지 않은 책으로는 과제를 제출할 수 없습니다.", { code: policy.ERROR_CODES.BOOK_NOT_STARTED });
        }
        if (!userSnap.exists) {
          throw new functions.https.HttpsError("failed-precondition", "사용자 문서를 찾을 수 없습니다.");
        }

        const existingAssignment = assignmentSnap.exists ? (assignmentSnap.data() || {}) : null;
        if (existingAssignment) {
          if (existingAssignment.userId !== uid || existingAssignment.date !== dateStr || !isWesternClassicCluster(existingAssignment.clusterId)) {
            throw new functions.https.HttpsError("permission-denied", "수정할 수 없는 과제입니다.");
          }
          if (existingAssignment.status === "reviewed") {
            throw new functions.https.HttpsError("failed-precondition", "이미 검토 완료된 과제는 수정할 수 없습니다.", {
              code: policy.ERROR_CODES.ASSIGNMENT_LOCKED,
            });
          }
          if (existingAssignment.reading?.bookId && existingAssignment.reading.bookId !== bookId) {
            throw new functions.https.HttpsError("failed-precondition", "첫 제출 후에는 연결된 책을 변경할 수 없습니다. 관리자에게 문의해 주세요.", {
              code: policy.ERROR_CODES.BOOK_CHANGE_LOCKED,
            });
          }
        }

        const userData = userSnap.data() || {};
        const userName = userData.studentName || userData.name || userData.displayName || "탐험가";
        const prevRevision = logSnap.exists ? Number(logSnap.data()?.revision || 1) : 0;
        const nextRevision = prevRevision + 1;
        const bookLogsSnap = logSnap.exists
          ? await tx.get(db.collection("readingLogs").where("bookId", "==", bookId))
          : null;
        const recentDayCreditsSnap = dayCreditSnap.exists
          ? { docs: [] }
          : await tx.get(
            creditRefs.userRef.collection("readingDayCredits")
              .orderBy("dateKey", "desc")
              .limit(31)
          );

        const assignmentDocData = {
          userId: uid,
          userName,
          clusterId: "western-classic",
          regionId: regionId || "reg_1776158746744",
          date: dateStr,
          content,
          links: normalizedLinks,
          attachments: normalizedAttachments,
          status: "submitted",
          revisionCount: nextRevision - 1,
          isOfflineChecked: false,
          reading: {
            bookId,
            title: book.title || "",
            author: book.author || "",
            page: pageValidation.page,
            readAt: readAtTimestamp,
            readDateKst: dateStr,
            revision: nextRevision,
            schemaVersion: 1,
          },
          submittedAt: existingAssignment?.submittedAt || nowTimestamp,
          updatedAt: nowTimestamp,
        };
        tx.set(assignmentRef, assignmentDocData, { merge: true });

        const logDocData = {
          userId: uid,
          bookId,
          eventType: policy.LOG_EVENT_TYPES.PROGRESS,
          source: policy.LOG_SOURCES.ASSIGNMENT,
          readDateKst: dateStr,
          readAt: readAtTimestamp,
          page: pageValidation.page,
          summary: content.slice(0, 2000),
          assignmentId,
          statusFrom: null,
          statusTo: null,
          revision: nextRevision,
          lockedAt: null,
          correctionOfLogId: null,
          voidedAt: null,
          bookSnapshot: {
            title: book.title || "",
            author: book.author || "",
          },
          recordedAt: logSnap.exists ? (logSnap.data()?.recordedAt || nowTimestamp) : nowTimestamp,
          updatedAt: nowTimestamp,
          schemaVersion: 1,
        };
        tx.set(logRef, logDocData);

        let nextProgress;
        if (bookLogsSnap) {
          const projectedLogs = bookLogsSnap.docs
            .filter((docSnap) => docSnap.id !== deterministicLogId)
            .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
          projectedLogs.push({ id: deterministicLogId, ...logDocData });
          nextProgress = policy.calculateReadingBookProgressFromLogs(projectedLogs);
        } else {
          nextProgress = policy.calculateIncrementalProgress(book.progress || {}, {
            id: deterministicLogId,
            page: pageValidation.page,
            readAt: readAtTimestamp,
          });
        }
        tx.update(bookRef, { progress: nextProgress, updatedAt: nowTimestamp });

        const updatedBookData = {
          ...book,
          progress: nextProgress,
        };

        const creditResult = applyReadingDayCredit(tx, {
          uid,
          bookId,
          logId: deterministicLogId,
          readDateKst: dateStr,
          readAt: readAtTimestamp,
          recordedAt: logDocData.recordedAt,
          source: policy.LOG_SOURCES.ASSIGNMENT,
          bookRef,
          bookData: updatedBookData,
          nowTimestamp,
          userSnap,
          dayCreditSnap,
          bookDayCreditSnap,
          recentDayCreditsSnap,
        });

        reconcileReadingBookCredit(tx, {
          uid,
          bookId,
          bookData: creditResult.bookData,
          nowTimestamp,
          userSnap,
          bookCreditSnap,
          readingStats: creditResult.readingStats,
        });

        resultPayload = {
          assignmentId,
          logId: deterministicLogId,
          bookId,
          page: pageValidation.page,
          revision: nextRevision,
        };

        tx.set(command.cmdRef, buildCommandData({
          uid,
          commandId,
          type: "submit_assignment",
          payloadHash: command.payloadHash,
          targetId: assignmentId,
          result: resultPayload,
          now,
          nowTimestamp,
        }));
      });

      return resultPayload;
    } catch (err) {
      console.error("submitClassicReadingAssignment error:", err);
      if (err instanceof functions.https.HttpsError) throw err;
      throw new functions.https.HttpsError("internal", "과제 제출 처리 중 오류가 발생했습니다.", {
        code: policy.ERROR_CODES.READING_WRITE_FAILED,
      });
    }
  });

  /**
   * 6. reviewClassicReadingAssignment (Admin only)
   */
  const reviewClassicReadingAssignment = costOptimizedDataFunctions.https.onCall(async (data, context) => {
    const adminUid = await requireAdminUid(context);
    const assignmentId = String(data?.assignmentId || "").trim();
    const feedback = String(data?.feedback || "").trim().slice(0, 10000);
    const status = String(data?.status || "reviewed").trim();
    const parsedBonus = Number(data?.bonusCrystals);
    const bonusCrystals = status === "reviewed" ? parsedBonus : 0;

    if (!assignmentId) throw new functions.https.HttpsError("invalid-argument", "과제 ID가 필요합니다.");
    if (!["reviewed", "needs_revision"].includes(status)) {
      throw new functions.https.HttpsError("invalid-argument", "올바른 검토 상태를 지정해 주세요.");
    }
    if (!Number.isInteger(bonusCrystals) || bonusCrystals < 0 || bonusCrystals > 10000) {
      throw new functions.https.HttpsError("invalid-argument", "보너스 광석은 0~10,000 범위의 정수여야 합니다.");
    }
    if (status === "needs_revision" && !feedback) {
      throw new functions.https.HttpsError("invalid-argument", "보완 요청에는 피드백이 필요합니다.");
    }

    const assignmentRef = db.collection("assignments").doc(assignmentId);
    const logRef = db.collection("readingLogs").doc(policy.getDeterministicAssignmentLogId(assignmentId));
    const now = new Date();
    const nowTimestamp = Timestamp.fromDate(now);

    await db.runTransaction(async (tx) => {
      const assignmentSnap = await tx.get(assignmentRef);
      if (!assignmentSnap.exists) {
        throw new functions.https.HttpsError("not-found", "과제를 찾을 수 없습니다.");
      }
      const assignment = assignmentSnap.data() || {};
      if (!isWesternClassicCluster(assignment.clusterId) || !assignment.reading?.bookId) {
        throw new functions.https.HttpsError("failed-precondition", "서양고전 독서 과제만 이 경로로 검토할 수 있습니다.");
      }
      const targetUserId = String(assignment.userId || "").trim();
      if (!targetUserId) {
        throw new functions.https.HttpsError("failed-precondition", "과제 소유자 정보가 없습니다.");
      }
      const prevBonus = assignment.status === "reviewed" ? Number(assignment.bonusCrystals || 0) : 0;
      const crystalDiff = status === "reviewed" ? bonusCrystals - prevBonus : -prevBonus;
      const currentLedgerVersion = Number(assignment.bonusLedgerVersion || 0);
      const nextLedgerVersion = crystalDiff !== 0 ? currentLedgerVersion + 1 : currentLedgerVersion;

      const userRef = db.collection("users").doc(targetUserId);
      const bookId = assignment.reading?.bookId;
      const bookRef = bookId ? db.collection("readingBooks").doc(bookId) : null;
      const assignmentCreditRef = db.collection("users").doc(targetUserId).collection("readingAssignmentCredits").doc(assignmentId);
      const bookCreditRef = bookId
        ? db.collection("users").doc(targetUserId).collection("readingBookCredits").doc(bookId)
        : null;

      const [logSnap, userSnap, assignCreditSnap, bookSnap, bookCreditSnap] = await Promise.all([
        tx.get(logRef),
        tx.get(userRef),
        tx.get(assignmentCreditRef),
        bookRef ? tx.get(bookRef) : Promise.resolve(null),
        bookCreditRef ? tx.get(bookCreditRef) : Promise.resolve(null),
      ]);
      if (!userSnap?.exists) {
        throw new functions.https.HttpsError("failed-precondition", "과제 소유자 계정을 찾을 수 없습니다.");
      }
      if (status === "reviewed" && (!bookSnap?.exists || bookSnap.data()?.archivedAt)) {
        throw new functions.https.HttpsError("failed-precondition", "활성 독서 도서가 연결된 과제만 검토 완료할 수 있습니다.");
      }

      tx.set(
        assignmentRef,
        {
          feedback,
          status,
          bonusCrystals: status === "reviewed" ? bonusCrystals : 0,
          bonusLedgerVersion: nextLedgerVersion,
          reviewedBy: adminUid,
          reviewedAt: nowTimestamp,
          updatedAt: nowTimestamp,
        },
        { merge: true }
      );

      if (logSnap.exists) {
        tx.update(logRef, {
          lockedAt: status === "reviewed" ? nowTimestamp : null,
          updatedAt: nowTimestamp,
        });
      }

      if (crystalDiff !== 0) {
        const userData = userSnap.data() || {};
        const transactionId = `assignment_review_${assignmentId}_${nextLedgerVersion}`;
        recordCrystalTransaction(tx, targetUserId, transactionId, {
          amount: crystalDiff,
          type: crystalDiff > 0 ? "teacher_verify" : "teacher_revoke",
          description: crystalDiff > 0 ? "항행 일지 보상 (과제)" : "항행 일지 보상 취소 (보완 요청)",
          metadata: {
            assignmentId,
            previousBonus: prevBonus,
            newBonus: status === "reviewed" ? bonusCrystals : 0,
            status,
            bonusLedgerVersion: nextLedgerVersion,
            source: "classic_reading_review_transaction",
          },
        });
        tx.update(userRef, { crystals: Number(userData.crystals || 0) + crystalDiff });
      }

      // Reading Assignment Credit & Book Achievement Reconcile
      const hadAssignCredit = assignCreditSnap.exists;
      let bookData = bookSnap?.exists ? bookSnap.data() : null;
      let projectedReadingStats = userSnap.data()?.readingStats || {};

      if (status === "reviewed" && !hadAssignCredit) {
        tx.set(assignmentCreditRef, {
          assignmentId,
          bookId: bookId || null,
          clusterId: "western-classic",
          creditedAt: nowTimestamp,
        });

        const curReadingStats = projectedReadingStats;
        projectedReadingStats = {
          ...curReadingStats,
          reviewedAssignmentCount: Number(curReadingStats.reviewedAssignmentCount || 0) + 1,
          version: 1,
          backfillComplete: curReadingStats.backfillComplete === true,
        };
        tx.set(userRef, {
          readingStats: projectedReadingStats,
        }, { merge: true });

        if (bookRef && bookData) {
          const curAch = bookData.achievementStats || {};
          const nextAch = {
            ...curAch,
            reviewedAssignmentCount: Number(curAch.reviewedAssignmentCount || 0) + 1,
            validReadingDayCount: Number(curAch.validReadingDayCount || 0),
            version: 1,
          };
          tx.update(bookRef, { achievementStats: nextAch });
          bookData = { ...bookData, achievementStats: nextAch };
        }
      } else if (status === "needs_revision" && hadAssignCredit) {
        tx.delete(assignmentCreditRef);

        const curReadingStats = projectedReadingStats;
        projectedReadingStats = {
          ...curReadingStats,
          reviewedAssignmentCount: Math.max(0, Number(curReadingStats.reviewedAssignmentCount || 0) - 1),
          version: 1,
          backfillComplete: curReadingStats.backfillComplete === true,
        };
        tx.set(userRef, {
          readingStats: projectedReadingStats,
        }, { merge: true });

        if (bookRef && bookData) {
          const curAch = bookData.achievementStats || {};
          const nextAch = {
            ...curAch,
            reviewedAssignmentCount: Math.max(0, Number(curAch.reviewedAssignmentCount || 0) - 1),
            validReadingDayCount: Number(curAch.validReadingDayCount || 0),
            version: 1,
          };
          tx.update(bookRef, { achievementStats: nextAch });
          bookData = { ...bookData, achievementStats: nextAch };
        }
      }

      if (bookRef && bookData) {
        reconcileReadingBookCredit(tx, {
          uid: targetUserId,
          bookId,
          bookData,
          nowTimestamp,
          userSnap,
          bookCreditSnap,
          readingStats: projectedReadingStats,
        });
      }
    });

    return { assignmentId, status, bonusCrystals: status === "reviewed" ? bonusCrystals : 0 };
  });

  /**
   * 7. adminCorrectAssignmentBook (Admin only)
   */
  const adminCorrectAssignmentBook = costOptimizedDataFunctions.https.onCall(async (data, context) => {
    const adminUid = await requireAdminUid(context);
    const assignmentId = String(data?.assignmentId || "").trim();
    const targetBookId = String(data?.newBookId || "").trim();

    if (!assignmentId || !targetBookId) {
      throw new functions.https.HttpsError("invalid-argument", "과제 ID와 새 책 ID가 필요합니다.");
    }

    const assignmentRef = db.collection("assignments").doc(assignmentId);
    const newBookRef = db.collection("readingBooks").doc(targetBookId);
    const logRef = db.collection("readingLogs").doc(policy.getDeterministicAssignmentLogId(assignmentId));

    let oldBookId = null;

    await db.runTransaction(async (tx) => {
      const [assignmentSnap, newBookSnap, logSnap] = await Promise.all([
        tx.get(assignmentRef),
        tx.get(newBookRef),
        tx.get(logRef),
      ]);

      if (!assignmentSnap.exists) throw new functions.https.HttpsError("not-found", "과제를 찾을 수 없습니다.");
      if (!newBookSnap.exists) throw new functions.https.HttpsError("not-found", "새 책을 찾을 수 없습니다.");
      if (!logSnap.exists) throw new functions.https.HttpsError("failed-precondition", "정정할 독서 로그를 찾을 수 없습니다.");

      const assignment = assignmentSnap.data() || {};
      const newBook = newBookSnap.data() || {};
      oldBookId = assignment.reading?.bookId || null;
      if (!isWesternClassicCluster(assignment.clusterId) || !oldBookId) {
        throw new functions.https.HttpsError("failed-precondition", "서양고전 독서 과제만 도서를 정정할 수 있습니다.");
      }
      if (newBook.userId !== assignment.userId || newBook.archivedAt) {
        throw new functions.https.HttpsError("permission-denied", "과제 소유자의 활성 도서로만 정정할 수 있습니다.");
      }

      const nowTimestamp = Timestamp.fromDate(new Date());
      const updatedLog = {
        ...logSnap.data(),
        bookId: targetBookId,
        bookSnapshot: { title: newBook.title || "", author: newBook.author || "" },
        revision: Number(logSnap.data()?.revision || 1) + 1,
        correctedBy: adminUid,
        correctedAt: nowTimestamp,
        updatedAt: nowTimestamp,
      };

      let oldBookData = null;
      let newBookData = newBook;

      if (oldBookId !== targetBookId) {
        const oldBookRef = db.collection("readingBooks").doc(oldBookId);
        const userRef = db.collection("users").doc(assignment.userId);
        const oldBookCreditRef = userRef.collection("readingBookCredits").doc(oldBookId);
        const newBookCreditRef = userRef.collection("readingBookCredits").doc(targetBookId);
        const dateKey = String(updatedLog.readDateKst || "");
        const oldBookDayRef = dateKey
          ? userRef.collection("readingBookDayCredits").doc(`${oldBookId}__${dateKey}`)
          : null;
        const newBookDayRef = dateKey
          ? userRef.collection("readingBookDayCredits").doc(`${targetBookId}__${dateKey}`)
          : null;
        const assignmentCreditRef = userRef.collection("readingAssignmentCredits").doc(assignmentId);
        const [oldBookSnap, oldLogsSnap, newLogsSnap, userSnap, oldBookCreditSnap, newBookCreditSnap, oldBookDaySnap, newBookDaySnap] = await Promise.all([
          tx.get(oldBookRef),
          tx.get(db.collection("readingLogs").where("bookId", "==", oldBookId)),
          tx.get(db.collection("readingLogs").where("bookId", "==", targetBookId)),
          tx.get(userRef),
          tx.get(oldBookCreditRef),
          tx.get(newBookCreditRef),
          oldBookDayRef ? tx.get(oldBookDayRef) : Promise.resolve(null),
          newBookDayRef ? tx.get(newBookDayRef) : Promise.resolve(null),
        ]);
        if (!oldBookSnap.exists || oldBookSnap.data()?.userId !== assignment.userId) {
          throw new functions.https.HttpsError("failed-precondition", "기존 연결 도서를 확인할 수 없습니다.");
        }

        oldBookData = oldBookSnap.data();

        const oldLogs = oldLogsSnap.docs
          .filter((docSnap) => docSnap.id !== logRef.id)
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        const newLogs = newLogsSnap.docs
          .filter((docSnap) => docSnap.id !== logRef.id)
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        newLogs.push({ id: logRef.id, ...updatedLog });

        const oldProgress = policy.calculateReadingBookProgressFromLogs(oldLogs);
        const newProgress = policy.calculateReadingBookProgressFromLogs(newLogs);

        const oldAch = oldBookData.achievementStats || {};
        const newAch = newBookData.achievementStats || {};
        const isReviewed = assignment.status === "reviewed";
        const countValidReadingDays = (logs) => new Set(logs
          .filter((log) => (
            log.eventType === policy.LOG_EVENT_TYPES.PROGRESS &&
            !log.voidedAt &&
            policy.isReadingLogEligibleForDayCredit({
              readDateKst: log.readDateKst,
              recordedAt: log.recordedAt || log.createdAt,
            })
          ))
          .map((log) => log.readDateKst)).size;

        const nextOldAch = {
          ...oldAch,
          reviewedAssignmentCount: isReviewed ? Math.max(0, Number(oldAch.reviewedAssignmentCount || 0) - 1) : Number(oldAch.reviewedAssignmentCount || 0),
          validReadingDayCount: countValidReadingDays(oldLogs),
          version: 1,
        };
        const nextNewAch = {
          ...newAch,
          reviewedAssignmentCount: isReviewed ? Number(newAch.reviewedAssignmentCount || 0) + 1 : Number(newAch.reviewedAssignmentCount || 0),
          validReadingDayCount: countValidReadingDays(newLogs),
          version: 1,
        };

        oldBookData = { ...oldBookData, progress: oldProgress, achievementStats: nextOldAch };
        newBookData = { ...newBookData, progress: newProgress, achievementStats: nextNewAch };

        tx.update(oldBookRef, {
          progress: oldProgress,
          achievementStats: nextOldAch,
          updatedAt: nowTimestamp,
        });
        tx.update(newBookRef, {
          progress: newProgress,
          achievementStats: nextNewAch,
          updatedAt: nowTimestamp,
        });

        if (dateKey) {
          const oldStillHasDate = oldLogs.some((log) => (
            log.readDateKst === dateKey &&
            log.eventType === policy.LOG_EVENT_TYPES.PROGRESS &&
            !log.voidedAt &&
            policy.isReadingLogEligibleForDayCredit({ readDateKst: dateKey, recordedAt: log.recordedAt || log.createdAt })
          ));
          const movedLogEligible = policy.isReadingLogEligibleForDayCredit({
            readDateKst: dateKey,
            recordedAt: updatedLog.recordedAt || updatedLog.createdAt,
          });
          if (oldBookDaySnap?.exists && !oldStillHasDate) tx.delete(oldBookDayRef);
          if (!newBookDaySnap?.exists && movedLogEligible) {
            tx.set(newBookDayRef, {
              bookId: targetBookId,
              dateKey,
              firstLogId: logRef.id,
              source: updatedLog.source || policy.LOG_SOURCES.ASSIGNMENT,
              eligibilityVersion: 1,
              creditedAt: nowTimestamp,
            });
          }
        }
        if (isReviewed) {
          tx.set(assignmentCreditRef, { bookId: targetBookId, updatedAt: nowTimestamp }, { merge: true });
        }

        let projectedReadingStats = userSnap.data()?.readingStats || {};
        projectedReadingStats = reconcileReadingBookCredit(tx, {
          uid: assignment.userId,
          bookId: oldBookId,
          bookData: oldBookData,
          nowTimestamp,
          userSnap,
          bookCreditSnap: oldBookCreditSnap,
          readingStats: projectedReadingStats,
        });
        reconcileReadingBookCredit(tx, {
          uid: assignment.userId,
          bookId: targetBookId,
          bookData: newBookData,
          nowTimestamp,
          userSnap,
          bookCreditSnap: newBookCreditSnap,
          readingStats: projectedReadingStats,
        });
      }

      tx.update(assignmentRef, {
        "reading.bookId": targetBookId,
        "reading.title": newBook.title || "",
        "reading.author": newBook.author || "",
        "reading.correctedBy": adminUid,
        "reading.correctedAt": nowTimestamp,
        updatedAt: nowTimestamp,
      });

      tx.set(logRef, updatedLog);
    });

    return { assignmentId, oldBookId, newBookId: targetBookId, success: true };
  });

  return {
    rebuildReadingBookProgress,
    functions: {
      getPublicReadingBookshelf,
      createReadingBook,
      updateReadingBookStatus,
      updateReadingBookDetails,
      saveReadingProgress,
      archiveReadingBook,
      unarchiveReadingBook,
      submitClassicReadingAssignment,
      reviewClassicReadingAssignment,
      adminCorrectAssignmentBook,
    },
  };
};
