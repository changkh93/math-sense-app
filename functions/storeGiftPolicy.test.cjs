const assert = require("node:assert/strict");
const test = require("node:test");
const {
  STORE_RADAR_DURATION_DAYS,
  STORE_PHOTON_SHIELD_CHARGES_PER_GIFT,
  STORE_ITEM_GIFT_CATALOG,
  getOwnedProfileFrames,
  getOwnedBaseThemes,
  validateGiftRequest,
  calculateGiftRecipientUpdates,
} = require("./storeGiftPolicy.cjs");

test("STORE_ITEM_GIFT_CATALOG에는 유료 탐험기지 배경 3종이 정의되어 있다", () => {
  assert.deepEqual(STORE_ITEM_GIFT_CATALOG.base_aurora_observatory, {
    name: "오로라 관측소",
    cost: 120,
    ownedMode: "purchase_only",
    baseThemeId: "aurora_observatory",
  });

  assert.deepEqual(STORE_ITEM_GIFT_CATALOG.base_solar_archive, {
    name: "황금 기록보관소",
    cost: 160,
    ownedMode: "purchase_only",
    baseThemeId: "solar_archive",
  });

  assert.deepEqual(STORE_ITEM_GIFT_CATALOG.base_deep_lab, {
    name: "심해 연구기지",
    cost: 140,
    ownedMode: "purchase_only",
    baseThemeId: "deep_lab",
  });
});

test("STORE_ITEM_GIFT_CATALOG의 기존 아이템들이 누락 없이 보존된다", () => {
  const expectedKeys = [
    "cryo_core",
    "photon_shield",
    "radar",
    "signature_unlock",
    "frame_nebula",
    "frame_solar",
    "hall_showcase_credit",
    "crew_creation_pass",
    "base_aurora_observatory",
    "base_solar_archive",
    "base_deep_lab",
  ];
  for (const key of expectedKeys) {
    assert.ok(STORE_ITEM_GIFT_CATALOG[key], `${key} 항목이 카탈로그에 존재해야 합니다.`);
  }
});

test("getOwnedBaseThemes는 orbital을 항상 기본 포함하고 중복을 제거한다", () => {
  assert.deepEqual(getOwnedBaseThemes({}), ["orbital"]);
  assert.deepEqual(getOwnedBaseThemes(null), ["orbital"]);
  assert.deepEqual(
    getOwnedBaseThemes({ ownedBaseThemes: ["aurora_observatory", "orbital", "aurora_observatory"] }),
    ["orbital", "aurora_observatory"]
  );
});

test("getOwnedProfileFrames는 starter를 항상 기본 포함하고 중복을 제거한다", () => {
  assert.deepEqual(getOwnedProfileFrames({}), ["starter"]);
  assert.deepEqual(
    getOwnedProfileFrames({ ownedProfileFrames: ["nebula", "starter", "nebula"] }),
    ["starter", "nebula"]
  );
});

test("validateGiftRequest: 수신자 없음 및 자기 선물 차단", () => {
  const noRecipient = validateGiftRequest({
    senderId: "student1",
    recipientId: "",
    itemId: "base_aurora_observatory",
    mode: "purchase",
    senderData: { crystals: 500, role: "student" },
    recipientData: { role: "student" },
  });
  assert.equal(noRecipient.valid, false);
  assert.equal(noRecipient.code, "invalid-argument");

  const selfGift = validateGiftRequest({
    senderId: "student1",
    recipientId: "student1",
    itemId: "base_aurora_observatory",
    mode: "purchase",
    senderData: { crystals: 500, role: "student" },
    recipientData: { role: "student" },
  });
  assert.equal(selfGift.valid, false);
  assert.equal(selfGift.code, "invalid-argument");
  assert.match(selfGift.error, /자기 자신/);
});

test("validateGiftRequest: 배경은 purchase 모드만 허용되고 owned 모드는 거절된다", () => {
  const ownedAttempt = validateGiftRequest({
    senderId: "student1",
    recipientId: "student2",
    itemId: "base_aurora_observatory",
    mode: "owned",
    senderData: { crystals: 500, role: "student" },
    recipientData: { role: "student" },
  });
  assert.equal(ownedAttempt.valid, false);
  assert.equal(ownedAttempt.code, "failed-precondition");
  assert.match(ownedAttempt.error, /보유분 선물이 불가능/);
});

test("validateGiftRequest: 광석 부족 시 거절된다", () => {
  const poorAttempt = validateGiftRequest({
    senderId: "student1",
    recipientId: "student2",
    itemId: "base_aurora_observatory",
    mode: "purchase",
    senderData: { crystals: 100, role: "student" }, // 120 필요
    recipientData: { role: "student" },
  });
  assert.equal(poorAttempt.valid, false);
  assert.equal(poorAttempt.code, "failed-precondition");
  assert.match(poorAttempt.error, /보유 광석이 부족/);
});

test("validateGiftRequest: 부모/관리자 계정 수신 및 일반 부모/관리자 송신 차단", () => {
  const sendToParent = validateGiftRequest({
    senderId: "student1",
    recipientId: "parent1",
    itemId: "base_aurora_observatory",
    mode: "purchase",
    senderData: { crystals: 500, role: "student" },
    recipientData: { role: "parent" },
  });
  assert.equal(sendToParent.valid, false);
  assert.equal(sendToParent.code, "failed-precondition");
  assert.match(sendToParent.error, /학생 계정에게만/);

  const parentSending = validateGiftRequest({
    senderId: "parent1",
    recipientId: "student1",
    itemId: "base_aurora_observatory",
    mode: "purchase",
    senderData: { crystals: 500, role: "parent" },
    recipientData: { role: "student" },
    isOperator: false,
  });
  assert.equal(parentSending.valid, false);
  assert.equal(parentSending.code, "permission-denied");
});

test("calculateGiftRecipientUpdates: 배경 선물 시 수신자 ownedBaseThemes 추가 및 selectedBaseTheme 불변", () => {
  const recipientData = {
    ownedBaseThemes: ["orbital"],
    selectedBaseTheme: "orbital",
  };

  const result = calculateGiftRecipientUpdates({
    itemId: "base_aurora_observatory",
    recipientData,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.recipientUpdates.ownedBaseThemes, ["orbital", "aurora_observatory"]);
  assert.equal(result.recipientUpdates.selectedBaseTheme, undefined, "selectedBaseTheme은 절대 변경되지 않아야 함");
  assert.equal(result.shouldSyncRecipientAnswers, false);
});

test("calculateGiftRecipientUpdates: 수신자가 이미 보유 중인 배경은 거절된다", () => {
  const recipientData = {
    ownedBaseThemes: ["orbital", "solar_archive"],
  };

  const result = calculateGiftRecipientUpdates({
    itemId: "base_solar_archive",
    recipientData,
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "failed-precondition");
  assert.match(result.error, /황금 기록보관소 아이템을 이미 보유 중입니다/);
});

test("calculateGiftRecipientUpdates: 기존 프로필 프레임 및 시그니처 선물 분기 정상 동작", () => {
  // 프레임 선물
  const frameResult = calculateGiftRecipientUpdates({
    itemId: "frame_nebula",
    recipientData: { ownedProfileFrames: ["starter"] },
  });
  assert.equal(frameResult.ok, true);
  assert.deepEqual(frameResult.recipientUpdates.ownedProfileFrames, ["starter", "nebula"]);
  assert.equal(frameResult.recipientUpdates.selectedProfileFrame, "nebula");
  assert.equal(frameResult.shouldSyncRecipientAnswers, true);

  // 시그니처 선물
  const sigResult = calculateGiftRecipientUpdates({
    itemId: "signature_unlock",
    recipientData: { profileSignatureUnlocked: false },
  });
  assert.equal(sigResult.ok, true);
  assert.equal(sigResult.recipientUpdates.profileSignatureUnlocked, true);
  assert.equal(sigResult.shouldSyncRecipientAnswers, true);

  // 크라이오 코어 수량 증가
  const cryoResult = calculateGiftRecipientUpdates({
    itemId: "cryo_core",
    recipientData: { streakFreezeCount: 2 },
  });
  assert.equal(cryoResult.ok, true);
  assert.equal(cryoResult.recipientUpdates.streakFreezeCount, 3);
});

test("calculateGiftRecipientUpdates: 레이더 선물은 활성 기간을 정확히 설정한다", () => {
  const nowMs = 1_800_000_000_000;
  const result = calculateGiftRecipientUpdates({
    itemId: "radar",
    recipientData: {},
    nowMs,
    isRadarActiveFn: () => false,
  });

  assert.equal(result.ok, true);
  assert.equal(result.recipientUpdates.hasRadar, true);
  assert.equal(result.recipientUpdates.radarActivatedAtMs, nowMs);
  assert.equal(
    result.recipientUpdates.radarExpiresAtMs,
    nowMs + STORE_RADAR_DURATION_DAYS * 24 * 60 * 60 * 1000
  );
  assert.equal(Object.prototype.hasOwnProperty.call(result.recipientUpdates, "undefined"), false);
});

test("calculateGiftRecipientUpdates: 활성 중인 레이더와 광자 실드 수량을 회귀 검증한다", () => {
  const activeRadar = calculateGiftRecipientUpdates({
    itemId: "radar",
    recipientData: { radarExpiresAtMs: 2_000 },
    nowMs: 1_000,
    isRadarActiveFn: () => true,
  });
  assert.equal(activeRadar.ok, false);
  assert.match(activeRadar.error, /이미 활성화 중/);

  const shield = calculateGiftRecipientUpdates({
    itemId: "photon_shield",
    recipientData: { shieldCharges: 7 },
  });
  assert.equal(shield.ok, true);
  assert.equal(
    shield.recipientUpdates.shieldCharges,
    7 + STORE_PHOTON_SHIELD_CHARGES_PER_GIFT
  );
});
