const assert = require("node:assert/strict");
const test = require("node:test");
const {
  buildFeatureItems,
  buildNoticeId,
  buildPayloadHash,
  isOperatorEmail,
  isVerifiedOperator,
  removeFeatureItem,
  updateFeatureItem,
  validateCreateNoticeInput,
  validateDeleteNoticeInput,
  validateUpdateNoticeInput,
} = require("./agoraNoticePolicy.cjs");

test("공지 입력의 공백과 줄바꿈을 정규화한다", () => {
  assert.deepEqual(validateCreateNoticeInput({
    commandId: "notice_12345678",
    title: "  새   공지  ",
    content: " 첫 줄  \r\n둘째 줄 \n",
  }), {
    commandId: "notice_12345678",
    title: "새 공지",
    content: "첫 줄\n둘째 줄",
  });
});

test("운영자 이메일만 대소문자와 바깥 공백을 정규화해 허용한다", () => {
  assert.equal(isOperatorEmail(" Paul@Dulcine.net ", "paul@dulcine.net"), true);
  assert.equal(isOperatorEmail("student@dulcine.net", "paul@dulcine.net"), false);
  assert.equal(isOperatorEmail("", "paul@dulcine.net"), false);
});

test("운영자 이메일도 인증된 계정일 때만 작성 권한을 허용한다", () => {
  assert.equal(isVerifiedOperator("paul@dulcine.net", "paul@dulcine.net", true), true);
  assert.equal(isVerifiedOperator("paul@dulcine.net", "paul@dulcine.net", false), false);
  assert.equal(isVerifiedOperator("paul@dulcine.net", "paul@dulcine.net", undefined), false);
  assert.equal(isVerifiedOperator("student@dulcine.net", "paul@dulcine.net", true), false);
});

test("비정상 commandId와 빈 본문을 거부한다", () => {
  assert.throws(() => validateCreateNoticeInput({ commandId: "short", title: "제목", content: "본문" }));
  assert.throws(() => validateCreateNoticeInput({ commandId: "notice_12345678", title: "제목", content: " " }));
});

test("동일 명령은 동일 공지 ID와 payload hash를 만든다", () => {
  const id = buildNoticeId("operator", "notice_12345678");
  assert.equal(id, buildNoticeId("operator", "notice_12345678"));
  assert.notEqual(id, buildNoticeId("operator", "notice_87654321"));
  assert.equal(
    buildPayloadHash({ title: "제목", content: "본문" }),
    buildPayloadHash({ title: "제목", content: "본문" }),
  );
});

test("피처 목록은 중복 없이 최신 3건만 유지한다", () => {
  const items = buildFeatureItems(
    [{ id: "old-1" }, { id: "same" }, { id: "old-2" }],
    { id: "same", title: "새 제목" },
  );
  assert.deepEqual(items, [
    { id: "same", title: "새 제목" },
    { id: "old-1" },
    { id: "old-2" },
  ]);
});

test("공지 수정 입력을 검증하고 피처 제목을 최신화한다", () => {
  const validated = validateUpdateNoticeInput({
    noticeId: "notice_123",
    title: "  수정된   제목  ",
    content: "  수정된 본문  ",
  });
  assert.deepEqual(validated, {
    noticeId: "notice_123",
    title: "수정된 제목",
    content: "수정된 본문",
  });

  const updatedItems = updateFeatureItem(
    [{ id: "notice_123", title: "옛 제목" }, { id: "notice_456", title: "다른 제목" }],
    { id: "notice_123", title: "수정된 제목" },
  );
  assert.deepEqual(updatedItems, [
    { id: "notice_123", title: "수정된 제목" },
    { id: "notice_456", title: "다른 제목" },
  ]);
});

test("공지 삭제 시 피처 목록에서 제거하고 백필한다", () => {
  const validated = validateDeleteNoticeInput({ noticeId: "notice_123" });
  assert.deepEqual(validated, { noticeId: "notice_123" });

  const cleanedItems = removeFeatureItem(
    [{ id: "notice_123", title: "삭제될 제목" }, { id: "notice_456", title: "유지 제목" }],
    "notice_123",
    [{ id: "notice_789", title: "백필 제목" }],
  );
  assert.deepEqual(cleanedItems, [
    { id: "notice_456", title: "유지 제목" },
    { id: "notice_789", title: "백필 제목" },
  ]);
});

