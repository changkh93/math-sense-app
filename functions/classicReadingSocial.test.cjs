const assert = require("assert");
const policy = require("./classicReadingSocialPolicy");
const createClassicReadingSocial = require("./classicReadingSocial");

assert.strictEqual(typeof createClassicReadingSocial, "function", "Functions module must load successfully");
assert.strictEqual(policy.DAILY_LIMITS.LINK_BOOK, 20);
assert.strictEqual(policy.DAILY_LIMITS.REACTION_LIST, 60);

{
  const firestore = () => ({});
  firestore.FieldValue = {};
  firestore.Timestamp = {};
  const mockFunctions = {
    https: {
      HttpsError: class HttpsError extends Error {},
    },
  };
  const moduleResult = createClassicReadingSocial({
    functions: mockFunctions,
    admin: { firestore },
    costOptimizedDataFunctions: { https: { onCall: (handler) => handler } },
    requireAuthUid: async () => "test-user",
    requireAdminUid: async () => "test-admin",
  });
  assert.strictEqual(typeof moduleResult.functions.linkReadingShareBook, "function");
  assert.strictEqual(typeof moduleResult.functions.getReadingShareReactionUsers, "function");
  assert.strictEqual(typeof moduleResult.functions.replyToReadingShareComment, "function");
}

console.log("=== Running classicReadingSocialPolicy unit tests ===");

// 1. One line review validation
{
  const tooShort = policy.validateReadingShareInput({ oneLine: "짧은글" });
  assert.strictEqual(tooShort.valid, false);
  assert.strictEqual(tooShort.error, policy.ERROR_CODES.INVALID_ONE_LINE);

  const exactMin = policy.validateReadingShareInput({ oneLine: "1234567890" });
  assert.strictEqual(exactMin.valid, true);
  assert.strictEqual(exactMin.review.oneLine, "1234567890");

  const longText160 = "가".repeat(160);
  const exactMax = policy.validateReadingShareInput({ oneLine: longText160 });
  assert.strictEqual(exactMax.valid, true);
  assert.strictEqual(exactMax.review.oneLine.length, 160);

  const tooLong = policy.validateReadingShareInput({ oneLine: "가".repeat(161) });
  assert.strictEqual(tooLong.valid, false);
  assert.strictEqual(tooLong.error, policy.ERROR_CODES.INVALID_ONE_LINE);

  const overlongReason = policy.validateReadingShareInput({
    oneLine: "충분히 긴 한 줄 평입니다.",
    reason: "가".repeat(601),
  });
  assert.strictEqual(overlongReason.valid, false);
  assert.strictEqual(overlongReason.error, policy.ERROR_CODES.INVALID_REASON);

  const invalidPublicPage = policy.validateReadingShareInput({
    oneLine: "충분히 긴 한 줄 평입니다.",
    isPagePublic: true,
    page: 0,
  });
  assert.strictEqual(invalidPublicPage.valid, false);
  assert.strictEqual(invalidPublicPage.error, policy.ERROR_CODES.INVALID_PAGE);
}

// 2. Sanitize and HTML tag removal
{
  const withHtml = policy.validateReadingShareInput({
    oneLine: "이 책은 <script>alert(1)</script> 정말 깊은 울림을 줍니다.",
    reason: "<b>강조</b>된 내용과   많은    공백들\n\n\n\n줄바꿈들",
  });
  assert.strictEqual(withHtml.valid, true);
  assert.strictEqual(withHtml.review.oneLine.includes("<script>"), false);
  assert.strictEqual(withHtml.review.reason.includes("<b>"), false);
  assert.strictEqual(withHtml.review.reason.includes("\n\n\n"), false);
}

// 3. Comment validation
{
  const emptyComment = policy.validateCommentInput("   ");
  assert.strictEqual(emptyComment.valid, false);
  assert.strictEqual(emptyComment.error, policy.ERROR_CODES.INVALID_COMMENT);

  const validComment = policy.validateCommentInput("질문이 있습니다!");
  assert.strictEqual(validComment.valid, true);
  assert.strictEqual(validComment.content, "질문이 있습니다!");

  const longComment = policy.validateCommentInput("댓글".repeat(150));
  assert.strictEqual(longComment.valid, false);
  assert.strictEqual(longComment.error, policy.ERROR_CODES.INVALID_COMMENT);
}

// 4. Reaction type validation & delta calculation
{
  const validWant = policy.validateReactionType("want_to_read");
  assert.strictEqual(validWant.valid, true);
  assert.strictEqual(validWant.reactionType, "want_to_read");

  const validNull = policy.validateReactionType(null);
  assert.strictEqual(validNull.valid, true);
  assert.strictEqual(validNull.reactionType, null);

  const invalidType = policy.validateReactionType("like");
  assert.strictEqual(invalidType.valid, false);

  // Reaction Deltas
  // None -> Want to read
  const d1 = policy.calculateReactionDelta(null, "want_to_read");
  assert.deepStrictEqual(d1, { wantToReadDelta: 1, resonatedDelta: 0 });

  // Want to read -> Resonated (switch)
  const d2 = policy.calculateReactionDelta("want_to_read", "resonated");
  assert.deepStrictEqual(d2, { wantToReadDelta: -1, resonatedDelta: 1 });

  // Resonated -> None (cancel)
  const d3 = policy.calculateReactionDelta("resonated", null);
  assert.deepStrictEqual(d3, { wantToReadDelta: 0, resonatedDelta: -1 });

  // Same -> Same (idempotent noop)
  const d4 = policy.calculateReactionDelta("want_to_read", "want_to_read");
  assert.deepStrictEqual(d4, { wantToReadDelta: 0, resonatedDelta: 0 });
}

// 5. Deterministic IDs and Hash
{
  const shareId = policy.getReadingShareId("user123", "book456");
  assert.strictEqual(shareId, "user123__book456");

  const reportId = policy.getReadingShareReportId("user123__book456", "reporter789");
  assert.strictEqual(reportId, "user123__book456__reporter789");

  const h1 = policy.hashPayload({ b: 2, a: 1 });
  const h2 = policy.hashPayload({ a: 1, b: 2 });
  assert.strictEqual(h1, h2);
}

// 6. Public Display Name resolution
{
  assert.strictEqual(policy.getPublicDisplayName({ publicDisplayName: "호밀밭의파수꾼" }), "호밀밭의파수꾼");
  assert.strictEqual(policy.getPublicDisplayName({ displayName: "어린왕자" }), "어*자");
  assert.strictEqual(policy.getPublicDisplayName({ studentName: "김학생" }), "김*생");
  assert.strictEqual(policy.getPublicDisplayName({ name: "홍길동" }), "홍*동");
  assert.strictEqual(policy.getPublicDisplayName({ name: "이산" }), "이*");
  assert.strictEqual(policy.getPublicDisplayName({}), "별빛 탐험가");
}

// 7. Firestore document ID validation
{
  assert.strictEqual(policy.isSafeDocumentId("safe_id-123"), true);
  assert.strictEqual(policy.isSafeDocumentId("nested/path"), false);
  assert.strictEqual(policy.isSafeDocumentId(""), false);
  assert.strictEqual(policy.isSafeDocumentId("."), false);
}

// 8. Reply validation
{
  const emptyReply = policy.validateReplyInput("   ");
  assert.strictEqual(emptyReply.valid, false);
  assert.strictEqual(emptyReply.error, policy.ERROR_CODES.INVALID_REPLY);

  const validReply = policy.validateReplyInput("답글입니다!");
  assert.strictEqual(validReply.valid, true);
  assert.strictEqual(validReply.content, "답글입니다!");

  const longReply = policy.validateReplyInput("답글".repeat(150));
  assert.strictEqual(longReply.valid, false);
  assert.strictEqual(longReply.error, policy.ERROR_CODES.INVALID_REPLY);
}

// 9. Intent validation & Deterministic Social Book ID
{
  assert.strictEqual(policy.validateReadingIntent("want_to_read").valid, true);
  assert.strictEqual(policy.validateReadingIntent("read").valid, true);
  assert.strictEqual(policy.validateReadingIntent("invalid").valid, false);

  const socialBookId1 = policy.getDeterministicSocialBookId("user_1234567890123", " 80일간의 세계 일주 ", "쥘 베른");
  const socialBookId2 = policy.getDeterministicSocialBookId("user_1234567890123", "80일간의세계일주", "쥘베른");
  assert.strictEqual(socialBookId1, socialBookId2);
  assert.strictEqual(socialBookId1.startsWith("social__user_1234567__"), true);

  const replyId = policy.getDeterministicReplyId("share_1", "comment_1", "cmd_1");
  assert.strictEqual(replyId, "reply__share_1__comment_1__cmd_1");

  const notifId = policy.getReplyNotificationId("share_1", "comment_1", "reply_1", "user_target");
  assert.strictEqual(notifId.startsWith("reading_share_reply_"), true);
}

// 10. resolveReactionState (v1/v2 compatibility)
{
  // v1 want_to_read
  const v1Want = policy.resolveReactionState({ type: "want_to_read" });
  assert.deepStrictEqual(v1Want, {
    resonated: false,
    readingIntent: "want_to_read",
    linkedBookId: null,
    schemaVersion: 1,
  });

  // v1 resonated
  const v1Resonated = policy.resolveReactionState({ type: "resonated" });
  assert.deepStrictEqual(v1Resonated, {
    resonated: true,
    readingIntent: null,
    linkedBookId: null,
    schemaVersion: 1,
  });

  // v2 both resonated and linked
  const v2Full = policy.resolveReactionState({
    resonated: true,
    readingIntent: "read",
    linkedBookId: "book_999",
    schemaVersion: 2,
  });
  assert.deepStrictEqual(v2Full, {
    resonated: true,
    readingIntent: "read",
    linkedBookId: "book_999",
    schemaVersion: 2,
  });
}

console.log("All classicReadingSocialPolicy unit tests passed successfully!");
