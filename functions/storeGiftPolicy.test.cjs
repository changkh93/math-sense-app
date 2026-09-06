const assert = require("node:assert/strict");
const test = require("node:test");
const {
  STORE_RADAR_DURATION_DAYS,
  STORE_PHOTON_SHIELD_CHARGES_PER_GIFT,
  STORE_ITEM_GIFT_CATALOG,
  SERVER_PURCHASE_ITEM_IDS,
  getOwnedProfileFrames,
  getOwnedBaseThemes,
  getOwnedExplorationKits,
  validateGiftRequest,
  calculateGiftRecipientUpdates,
  validatePurchaseRequest,
  calculatePurchaseUserUpdates,
  getPurchaseTransactionType,
} = require("./storeGiftPolicy.cjs");

test("STORE_ITEM_GIFT_CATALOG에는 신규 6종을 포함한 유료 탐험기지 배경 9종이 모두 정의되어 있다", () => {
  const baseThemes = [
    { id: "base_aurora_observatory", name: "오로라 관측소", cost: 120, baseThemeId: "aurora_observatory" },
    { id: "base_solar_archive", name: "황금 기록보관소", cost: 160, baseThemeId: "solar_archive" },
    { id: "base_deep_lab", name: "심해 연구기지", cost: 140, baseThemeId: "deep_lab" },
    { id: "base_lunar_library", name: "달빛 수학 서재", cost: 130, baseThemeId: "lunar_library" },
    { id: "base_crystal_cavern", name: "수정 공식 동굴", cost: 150, baseThemeId: "crystal_cavern" },
    { id: "base_mars_greenhouse", name: "화성 생태 온실", cost: 140, baseThemeId: "mars_greenhouse" },
    { id: "base_quantum_terminal", name: "양자 연산 실험실", cost: 170, baseThemeId: "quantum_terminal" },
    { id: "base_comet_camp", name: "혜성 관측 캠프", cost: 110, baseThemeId: "comet_camp" },
    { id: "base_infinity_garden", name: "무한의 정원", cost: 180, baseThemeId: "infinity_garden" },
  ];

  for (const expected of baseThemes) {
    assert.deepEqual(STORE_ITEM_GIFT_CATALOG[expected.id], {
      name: expected.name,
      cost: expected.cost,
      ownedMode: "purchase_only",
      baseThemeId: expected.baseThemeId,
    });
  }
});

test("STORE_ITEM_GIFT_CATALOG의 기존 아이템들이 누락 없이 보존된다", () => {
  const expectedKeys = [
    "cryo_core",
    "photon_shield",
    "radar",
    "frontier_hoverpack",
    "frontier_diving_suit",
    "signature_unlock",
    "frame_nebula",
    "frame_solar",
    "hall_showcase_credit",
    "crew_creation_pass",
    "base_aurora_observatory",
    "base_solar_archive",
    "base_deep_lab",
    "base_lunar_library",
    "base_crystal_cavern",
    "base_mars_greenhouse",
    "base_quantum_terminal",
    "base_comet_camp",
    "base_infinity_garden",
  ];
  for (const key of expectedKeys) {
    assert.ok(STORE_ITEM_GIFT_CATALOG[key], `${key} 항목이 카탈로그에 존재해야 합니다.`);
  }
});

test("프론티어 호버팩과 잠수복은 각각 1000광석의 직접 구매 장비다", () => {
  assert.deepEqual(STORE_ITEM_GIFT_CATALOG.frontier_hoverpack, {
    name: "호버팩",
    cost: 1000,
    ownedMode: "purchase_only",
    explorationKitId: "hoverpack",
    giftable: false,
  });
  assert.deepEqual(STORE_ITEM_GIFT_CATALOG.frontier_diving_suit, {
    name: "잠수복",
    cost: 1000,
    ownedMode: "purchase_only",
    explorationKitId: "diving",
    giftable: false,
  });
  assert.deepEqual(getOwnedExplorationKits({ ownedExplorationKits: ["diving", "unknown", "diving"] }), ["diving"]);
});

test("getOwnedBaseThemes는 orbital을 항상 기본 포함하고 중복을 제거한다", () => {
  assert.deepEqual(getOwnedBaseThemes({}), ["orbital"]);
  assert.deepEqual(getOwnedBaseThemes(null), ["orbital"]);
  assert.deepEqual(
    getOwnedBaseThemes({ ownedBaseThemes: ["aurora_observatory", "orbital", "lunar_library", "aurora_observatory"] }),
    ["orbital", "aurora_observatory", "lunar_library"]
  );
});

test("getOwnedProfileFrames는 starter를 항상 기본 포함하고 중복을 제거한다", () => {
  assert.deepEqual(getOwnedProfileFrames({}), ["starter"]);
  assert.deepEqual(
    getOwnedProfileFrames({ ownedProfileFrames: ["nebula", "starter", "nebula"] }),
    ["starter", "nebula"]
  );
});

test("validatePurchaseRequest: 로그인 여부, 광석 부족, 부모/관리자 권한 검증", () => {
  // 1. Unauthenticated
  const unauth = validatePurchaseRequest({ userId: "", itemId: "base_lunar_library", userData: { crystals: 500 } });
  assert.equal(unauth.valid, false);
  assert.equal(unauth.code, "unauthenticated");

  // 2. Insufficient crystals
  const poor = validatePurchaseRequest({
    userId: "student1",
    itemId: "base_lunar_library",
    userData: { crystals: 50, role: "student" },
  });
  assert.equal(poor.valid, false);
  assert.equal(poor.code, "failed-precondition");

  // 3. Parent account restriction
  const parent = validatePurchaseRequest({
    userId: "parent1",
    itemId: "base_lunar_library",
    userData: { crystals: 500, role: "parent" },
    isOperator: false,
  });
  assert.equal(parent.valid, false);
  assert.equal(parent.code, "permission-denied");

  // 4. Valid student purchase
  const valid = validatePurchaseRequest({
    userId: "student1",
    itemId: "base_lunar_library",
    userData: { crystals: 200, role: "student" },
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.item.cost, 130);
});

test("calculatePurchaseUserUpdates: 신규 배경 구매 시 소유 목록 추가 및 즉시 장착", () => {
  const result = calculatePurchaseUserUpdates({
    itemId: "base_quantum_terminal",
    userData: { crystals: 300, ownedBaseThemes: ["orbital"] },
  });
  assert.equal(result.ok, true);
  assert.equal(result.userUpdates.crystals, 130); // 300 - 170
  assert.deepEqual(result.userUpdates.ownedBaseThemes, ["orbital", "quantum_terminal"]);
  assert.equal(result.userUpdates.selectedBaseTheme, "quantum_terminal");

  // Already owned check
  const duplicate = calculatePurchaseUserUpdates({
    itemId: "base_quantum_terminal",
    userData: { crystals: 300, ownedBaseThemes: ["orbital", "quantum_terminal"] },
  });
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.code, "failed-precondition");
});

test("프론티어 장비 구매는 광석을 차감하고 영구 소유권을 중복 없이 기록한다", () => {
  const result = calculatePurchaseUserUpdates({
    itemId: "frontier_hoverpack",
    userData: { crystals: 2400, ownedExplorationKits: ["diving"] },
  });
  assert.equal(result.ok, true);
  assert.equal(result.userUpdates.crystals, 1400);
  assert.deepEqual(result.userUpdates.ownedExplorationKits, ["diving", "hoverpack"]);

  const duplicate = calculatePurchaseUserUpdates({
    itemId: "frontier_diving_suit",
    userData: { crystals: 2400, ownedExplorationKits: ["diving"] },
  });
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.code, "failed-precondition");

  const poor = validatePurchaseRequest({
    userId: "student1",
    itemId: "frontier_diving_suit",
    userData: { crystals: 999, role: "student" },
  });
  assert.equal(poor.valid, false);
  assert.equal(poor.code, "failed-precondition");
});

test("프론티어 장비는 선물 경로로 우회 구매할 수 없다", () => {
  const result = validateGiftRequest({
    senderId: "student1",
    recipientId: "student2",
    itemId: "frontier_hoverpack",
    mode: "purchase",
    senderData: { crystals: 2000, role: "student" },
    recipientData: { role: "student" },
  });
  assert.equal(result.valid, false);
  assert.equal(result.code, "invalid-argument");
});

test("서버 구매 callable은 정책이 완전히 이전된 항목만 허용한다", () => {
  for (const itemId of [
    "radar",
    "signature_unlock",
    "frame_nebula",
    "frame_solar",
    "frontier_hoverpack",
    "frontier_diving_suit",
    "base_lunar_library",
  ]) {
    assert.equal(SERVER_PURCHASE_ITEM_IDS.has(itemId), true, `${itemId} should use server purchase`);
  }

  for (const itemId of ["cryo_core", "photon_shield", "hall_showcase_credit", "crew_creation_pass"]) {
    assert.equal(SERVER_PURCHASE_ITEM_IDS.has(itemId), false, `${itemId} should keep its specialized path`);
    const result = validatePurchaseRequest({
      userId: "student1",
      itemId,
      userData: { crystals: 5000, role: "student" },
    });
    assert.equal(result.valid, false);
    assert.equal(result.code, "invalid-argument");
  }
});

test("구매 거래 유형은 기존 원장 분류와 호환된다", () => {
  assert.equal(getPurchaseTransactionType("base_lunar_library"), "base_theme_purchase");
  assert.equal(getPurchaseTransactionType("signature_unlock"), "agora_profile_purchase");
  assert.equal(getPurchaseTransactionType("frame_solar"), "agora_profile_purchase");
  assert.equal(getPurchaseTransactionType("radar"), "store_purchase");
  assert.equal(getPurchaseTransactionType("frontier_hoverpack"), "frontier_equipment_purchase");
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
    itemId: "base_crystal_cavern",
    mode: "owned",
    senderData: { crystals: 500, role: "student" },
    recipientData: { role: "student" },
  });
  assert.equal(ownedAttempt.valid, false);
  assert.equal(ownedAttempt.code, "failed-precondition");

  const purchaseAttempt = validateGiftRequest({
    senderId: "student1",
    recipientId: "student2",
    itemId: "base_crystal_cavern",
    mode: "purchase",
    senderData: { crystals: 200, role: "student" },
    recipientData: { role: "student" },
  });
  assert.equal(purchaseAttempt.valid, true);
});

test("validateGiftRequest: 광석 부족 및 부모/관리자 계정 대상 선물을 차단한다", () => {
  const poor = validateGiftRequest({
    senderId: "student1",
    recipientId: "student2",
    itemId: "base_infinity_garden",
    mode: "purchase",
    senderData: { crystals: 179, role: "student" },
    recipientData: { role: "student" },
  });
  assert.equal(poor.valid, false);
  assert.equal(poor.code, "failed-precondition");

  const blockedRecipient = validateGiftRequest({
    senderId: "student1",
    recipientId: "parent1",
    itemId: "base_infinity_garden",
    mode: "purchase",
    senderData: { crystals: 500, role: "student" },
    recipientData: { role: "parent" },
  });
  assert.equal(blockedRecipient.valid, false);
  assert.equal(blockedRecipient.code, "failed-precondition");

  const blockedSender = validateGiftRequest({
    senderId: "admin1",
    recipientId: "student1",
    itemId: "base_infinity_garden",
    mode: "purchase",
    senderData: { crystals: 500, role: "admin" },
    recipientData: { role: "student" },
  });
  assert.equal(blockedSender.valid, false);
  assert.equal(blockedSender.code, "permission-denied");
});

test("calculateGiftRecipientUpdates: 신규 배경 선물 시 수신자 ownedBaseThemes 추가 및 selectedBaseTheme 불변", () => {
  const recipientData = {
    crystals: 10,
    ownedBaseThemes: ["orbital"],
    selectedBaseTheme: "orbital",
  };

  const result = calculateGiftRecipientUpdates({
    itemId: "base_infinity_garden",
    recipientData,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.recipientUpdates.ownedBaseThemes, ["orbital", "infinity_garden"]);
  assert.equal(result.recipientUpdates.selectedBaseTheme, undefined, "수신자의 장착 배경은 변경되지 않아야 함");
  assert.equal(result.shouldSyncRecipientAnswers, false);
});

test("calculateGiftRecipientUpdates: 수신자가 이미 보유 중인 배경은 거절된다", () => {
  const recipientData = {
    ownedBaseThemes: ["orbital", "comet_camp"],
  };

  const result = calculateGiftRecipientUpdates({
    itemId: "base_comet_camp",
    recipientData,
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "failed-precondition");
  assert.match(result.error, /이미 보유 중/);
});

test("기존 레이더/프로필/수량 아이템 선물 계산이 회귀하지 않는다", () => {
  const nowMs = 1_700_000_000_000;
  const radar = calculateGiftRecipientUpdates({ itemId: "radar", recipientData: {}, nowMs });
  assert.equal(radar.ok, true);
  assert.equal(radar.recipientUpdates.hasRadar, true);
  assert.equal(
    radar.recipientUpdates.radarExpiresAtMs,
    nowMs + STORE_RADAR_DURATION_DAYS * 24 * 60 * 60 * 1000
  );

  const signature = calculateGiftRecipientUpdates({ itemId: "signature_unlock", recipientData: {} });
  assert.equal(signature.recipientUpdates.profileSignatureUnlocked, true);
  assert.equal(signature.shouldSyncRecipientAnswers, true);

  const frame = calculateGiftRecipientUpdates({ itemId: "frame_nebula", recipientData: {} });
  assert.deepEqual(frame.recipientUpdates.ownedProfileFrames, ["starter", "nebula"]);
  assert.equal(frame.recipientUpdates.selectedProfileFrame, "nebula");

  const cryo = calculateGiftRecipientUpdates({
    itemId: "cryo_core",
    recipientData: { streakFreezeCount: 2 },
  });
  assert.equal(cryo.recipientUpdates.streakFreezeCount, 3);

  const shield = calculateGiftRecipientUpdates({
    itemId: "photon_shield",
    recipientData: { shieldCharges: 3 },
  });
  assert.equal(
    shield.recipientUpdates.shieldCharges,
    3 + STORE_PHOTON_SHIELD_CHARGES_PER_GIFT
  );
});
