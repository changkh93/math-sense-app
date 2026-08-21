const assert = require("assert");
const policy = require("./classicReadingSocialPolicy");

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

console.log("All classicReadingSocialPolicy unit tests passed successfully!");
