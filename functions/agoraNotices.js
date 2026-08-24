/* global require, module */
const {
  buildFeatureItems,
  buildNoticeId,
  buildPayloadHash,
  isVerifiedOperator,
  validateCreateNoticeInput,
} = require("./agoraNoticePolicy.cjs");

module.exports = function createAgoraNotices({
  functions,
  admin,
  costOptimizedDataFunctions,
  operatorEmail,
}) {
  const normalizedOperatorEmail = String(operatorEmail || "").trim().toLowerCase();

  const createAgoraNotice = costOptimizedDataFunctions.https.onCall(async (data, context) => {
    const uid = context.auth?.uid;
    const email = String(context.auth?.token?.email || "").trim().toLowerCase();
    const emailVerified = context.auth?.token?.email_verified;
    if (!uid) {
      throw new functions.https.HttpsError("unauthenticated", "로그인이 필요합니다.");
    }
    if (!isVerifiedOperator(email, normalizedOperatorEmail, emailVerified)) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "인증된 운영자 계정만 공지를 작성할 수 있습니다.",
      );
    }

    let input;
    try {
      input = validateCreateNoticeInput(data);
    } catch (error) {
      const message = error?.message === "INVALID_TITLE"
        ? "공지 제목은 1~100자로 입력해 주세요."
        : error?.message === "INVALID_CONTENT"
          ? "공지 내용은 1~3000자로 입력해 주세요."
          : "잘못된 작성 요청입니다. 다시 시도해 주세요.";
      throw new functions.https.HttpsError("invalid-argument", message);
    }

    const db = admin.firestore();
    const noticeId = buildNoticeId(uid, input.commandId);
    const payloadHash = buildPayloadHash(input);
    const noticeRef = db.collection("agoraNotices").doc(noticeId);
    const feedRef = db.collection("agoraNoticeFeeds").doc("current");
    const nowMs = Date.now();
    const now = admin.firestore.Timestamp.fromMillis(nowMs);

    const result = await db.runTransaction(async (transaction) => {
      const [noticeSnap, feedSnap] = await Promise.all([
        transaction.get(noticeRef),
        transaction.get(feedRef),
      ]);

      if (noticeSnap.exists) {
        const existing = noticeSnap.data();
        if (existing.payloadHash !== payloadHash) {
          throw new functions.https.HttpsError(
            "already-exists",
            "같은 작성 요청으로 다른 내용을 저장할 수 없습니다.",
          );
        }
        return {
          notice: {
            id: noticeSnap.id,
            title: existing.title,
            content: existing.content,
            publishedAtMs: Number(existing.publishedAtMs) || 0,
          },
          featureItems: feedSnap.data()?.items || [],
        };
      }

      const notice = {
        id: noticeId,
        title: input.title,
        content: input.content,
        publishedAtMs: nowMs,
      };
      const featureItems = buildFeatureItems(feedSnap.data()?.items, {
        id: noticeId,
        title: input.title,
        publishedAtMs: nowMs,
      });

      transaction.create(noticeRef, {
        title: input.title,
        content: input.content,
        status: "published",
        authorLabel: "운영자",
        payloadHash,
        publishedAt: now,
        publishedAtMs: nowMs,
        createdAt: now,
        updatedAt: now,
      });
      transaction.set(feedRef, {
        items: featureItems,
        updatedAt: now,
      });

      return { notice, featureItems };
    });

    return result;
  });

  return { functions: { createAgoraNotice } };
};
