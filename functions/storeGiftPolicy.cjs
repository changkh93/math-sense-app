const STORE_RADAR_DURATION_DAYS = 7;
const STORE_PHOTON_SHIELD_CHARGES_PER_GIFT = 10;

const STORE_ITEM_GIFT_CATALOG = {
  cryo_core: {
    name: "크라이오 코어",
    cost: 100,
    ownedMode: "count",
    senderField: "streakFreezeCount",
    recipientField: "streakFreezeCount",
    transferAmount: 1,
  },
  photon_shield: {
    name: "광자 실드",
    cost: 20,
    ownedMode: "count",
    senderField: "shieldCharges",
    recipientField: "shieldCharges",
    transferAmount: STORE_PHOTON_SHIELD_CHARGES_PER_GIFT,
  },
  radar: {
    name: "첨단 마이닝 스캐너",
    cost: 100,
    ownedMode: "purchase_only",
  },
  frontier_hoverpack: {
    name: "호버팩",
    cost: 1000,
    ownedMode: "purchase_only",
    explorationKitId: "hoverpack",
    giftable: false,
  },
  frontier_diving_suit: {
    name: "잠수복",
    cost: 1000,
    ownedMode: "purchase_only",
    explorationKitId: "diving",
    giftable: false,
  },
  signature_unlock: {
    name: "시그니처 해금",
    cost: 30,
    ownedMode: "purchase_only",
    uniqueField: "profileSignatureUnlocked",
  },
  frame_nebula: {
    name: "네뷸라 프레임",
    cost: 50,
    ownedMode: "purchase_only",
    frameId: "nebula",
  },
  frame_solar: {
    name: "솔라 프레임",
    cost: 150,
    ownedMode: "purchase_only",
    frameId: "solar",
  },
  hall_showcase_credit: {
    name: "명예의 전당 쇼케이스",
    cost: 50,
    ownedMode: "count",
    senderField: "hallShowcaseCredits",
    recipientField: "hallShowcaseCredits",
    transferAmount: 1,
  },
  crew_creation_pass: {
    name: "스터디 크루 창설권",
    cost: 1000,
    ownedMode: "count",
    senderField: "crewCreationPasses",
    recipientField: "crewCreationPasses",
    transferAmount: 1,
  },
  base_aurora_observatory: {
    name: "오로라 관측소",
    cost: 120,
    ownedMode: "purchase_only",
    baseThemeId: "aurora_observatory",
  },
  base_solar_archive: {
    name: "황금 기록보관소",
    cost: 160,
    ownedMode: "purchase_only",
    baseThemeId: "solar_archive",
  },
  base_deep_lab: {
    name: "심해 연구기지",
    cost: 140,
    ownedMode: "purchase_only",
    baseThemeId: "deep_lab",
  },
  base_lunar_library: {
    name: "달빛 수학 서재",
    cost: 130,
    ownedMode: "purchase_only",
    baseThemeId: "lunar_library",
  },
  base_crystal_cavern: {
    name: "수정 공식 동굴",
    cost: 150,
    ownedMode: "purchase_only",
    baseThemeId: "crystal_cavern",
  },
  base_mars_greenhouse: {
    name: "화성 생태 온실",
    cost: 140,
    ownedMode: "purchase_only",
    baseThemeId: "mars_greenhouse",
  },
  base_quantum_terminal: {
    name: "양자 연산 실험실",
    cost: 170,
    ownedMode: "purchase_only",
    baseThemeId: "quantum_terminal",
  },
  base_comet_camp: {
    name: "혜성 관측 캠프",
    cost: 110,
    ownedMode: "purchase_only",
    baseThemeId: "comet_camp",
  },
  base_infinity_garden: {
    name: "무한의 정원",
    cost: 180,
    ownedMode: "purchase_only",
    baseThemeId: "infinity_garden",
  },
};

// The callable purchase path intentionally covers only the permanent cosmetics
// and radar that have complete server-side purchase semantics. Consumables such
// as cryo_core keep their existing cooldown/audit-aware client path until those
// rules are migrated in full.
const SERVER_PURCHASE_ITEM_IDS = new Set([
  "radar",
  "signature_unlock",
  "frame_nebula",
  "frame_solar",
  "frontier_hoverpack",
  "frontier_diving_suit",
  ...Object.entries(STORE_ITEM_GIFT_CATALOG)
    .filter(([, item]) => Boolean(item.baseThemeId))
    .map(([itemId]) => itemId),
]);

function getOwnedProfileFrames(userData = {}) {
  const safe = userData && typeof userData === "object" ? userData : {};
  const owned = Array.isArray(safe.ownedProfileFrames) ? safe.ownedProfileFrames : [];
  return Array.from(new Set(["starter", ...owned]));
}

function getOwnedBaseThemes(userData = {}) {
  const safe = userData && typeof userData === "object" ? userData : {};
  const owned = Array.isArray(safe.ownedBaseThemes) ? safe.ownedBaseThemes : [];
  return Array.from(new Set(["orbital", ...owned]));
}

function getOwnedExplorationKits(userData = {}) {
  const safe = userData && typeof userData === "object" ? userData : {};
  const owned = Array.isArray(safe.ownedExplorationKits) ? safe.ownedExplorationKits : [];
  return Array.from(new Set(owned.filter((kitId) => kitId === "hoverpack" || kitId === "diving")));
}

function validateGiftRequest({
  senderId,
  recipientId,
  itemId,
  mode,
  senderData = {},
  recipientData = {},
  isOperator = false,
}) {
  if (!recipientId) {
    return { valid: false, code: "invalid-argument", error: "받는 사람을 선택해주세요." };
  }
  if (recipientId === senderId) {
    return { valid: false, code: "invalid-argument", error: "자기 자신에게는 상점 아이템을 선물할 수 없습니다." };
  }
  const item = STORE_ITEM_GIFT_CATALOG[itemId];
  if (!item) {
    return { valid: false, code: "invalid-argument", error: "선물할 수 없는 아이템입니다." };
  }
  if (item.giftable === false) {
    return { valid: false, code: "invalid-argument", error: "이 아이템은 직접 구매만 할 수 있습니다." };
  }
  if (mode !== "purchase" && mode !== "owned") {
    return { valid: false, code: "invalid-argument", error: "선물 방식이 올바르지 않습니다." };
  }
  if (mode === "owned" && item.ownedMode !== "count") {
    return {
      valid: false,
      code: "failed-precondition",
      error: "이 아이템은 보유분 선물이 불가능합니다. 구매해서 선물해주세요.",
    };
  }

  if (!isOperator && (senderData.role === "parent" || senderData.role === "admin")) {
    return { valid: false, code: "permission-denied", error: "학생 계정만 상점 아이템을 선물할 수 있습니다." };
  }
  if (recipientData.role === "parent" || recipientData.role === "admin") {
    return { valid: false, code: "failed-precondition", error: "학생 계정에게만 상점 아이템을 선물할 수 있습니다." };
  }

  if (mode === "purchase") {
    const senderCrystals = Math.max(0, Number(senderData.crystals || 0));
    if (senderCrystals < item.cost) {
      return { valid: false, code: "failed-precondition", error: "보유 광석이 부족합니다." };
    }
  } else {
    const senderOwned = Math.max(0, Number(senderData[item.senderField] || 0));
    if (senderOwned < item.transferAmount) {
      const unitLabel = itemId === "photon_shield" ? `${item.transferAmount}회 방어` : `${item.transferAmount}개`;
      return {
        valid: false,
        code: "failed-precondition",
        error: `${item.name} 보유분이 부족합니다. (${unitLabel} 필요)`,
      };
    }
  }

  return { valid: true, item };
}

function calculateGiftRecipientUpdates({
  itemId,
  recipientData = {},
  nowMs = Date.now(),
  isRadarActiveFn = null,
}) {
  const item = STORE_ITEM_GIFT_CATALOG[itemId];
  if (!item) {
    return {
      ok: false,
      code: "invalid-argument",
      error: "선물할 수 없는 아이템입니다.",
    };
  }
  if (item.giftable === false) {
    return {
      ok: false,
      code: "invalid-argument",
      error: "이 아이템은 직접 구매만 할 수 있습니다.",
    };
  }

  const recipientUpdates = {};
  let shouldSyncRecipientAnswers = false;

  if (itemId === "radar") {
    const active = typeof isRadarActiveFn === "function"
      ? isRadarActiveFn(recipientData, nowMs)
      : (Number(recipientData.radarExpiresAtMs || 0) > nowMs);

    if (active) {
      return {
        ok: false,
        code: "failed-precondition",
        error: `${item.name} 아이템을 이미 활성화 중입니다.`,
      };
    }
    recipientUpdates.hasRadar = true;
    recipientUpdates.radarActivatedAtMs = nowMs;
    recipientUpdates.radarExpiresAtMs = nowMs + STORE_RADAR_DURATION_DAYS * 24 * 60 * 60 * 1000;
  } else if (item.uniqueField) {
    if (recipientData[item.uniqueField]) {
      return {
        ok: false,
        code: "failed-precondition",
        error: `${item.name} 아이템을 이미 보유 중입니다.`,
      };
    }
    recipientUpdates[item.uniqueField] = true;
    shouldSyncRecipientAnswers = true;
  } else if (item.frameId) {
    const recipientFrames = getOwnedProfileFrames(recipientData);
    if (recipientFrames.includes(item.frameId)) {
      return {
        ok: false,
        code: "failed-precondition",
        error: `${item.name} 아이템을 이미 보유 중입니다.`,
      };
    }
    recipientUpdates.ownedProfileFrames = [...recipientFrames, item.frameId];
    recipientUpdates.selectedProfileFrame = item.frameId;
    shouldSyncRecipientAnswers = true;
  } else if (item.baseThemeId) {
    const recipientThemes = getOwnedBaseThemes(recipientData);
    if (recipientThemes.includes(item.baseThemeId)) {
      return {
        ok: false,
        code: "failed-precondition",
        error: `${item.name} 아이템을 이미 보유 중입니다.`,
      };
    }
    recipientUpdates.ownedBaseThemes = [...recipientThemes, item.baseThemeId];
  } else {
    const currentRecipientOwned = Math.max(0, Number(recipientData[item.recipientField] || 0));
    const nextRecipientOwned = currentRecipientOwned + (item.transferAmount || 1);
    if (item.maxRecipientValue && nextRecipientOwned > item.maxRecipientValue) {
      return {
        ok: false,
        code: "failed-precondition",
        error: `${item.name}를 더 받을 수 없습니다.`,
      };
    }
    recipientUpdates[item.recipientField] = nextRecipientOwned;
  }

  return {
    ok: true,
    recipientUpdates,
    shouldSyncRecipientAnswers,
  };
}

function validatePurchaseRequest({
  userId,
  itemId,
  userData = {},
  isOperator = false,
}) {
  if (!userId) {
    return { valid: false, code: "unauthenticated", error: "로그인이 필요합니다." };
  }
  const item = STORE_ITEM_GIFT_CATALOG[itemId];
  if (!item) {
    return { valid: false, code: "invalid-argument", error: "구매할 수 없는 아이템입니다." };
  }
  if (!SERVER_PURCHASE_ITEM_IDS.has(itemId)) {
    return { valid: false, code: "invalid-argument", error: "이 구매 경로에서 지원하지 않는 아이템입니다." };
  }
  if (!isOperator && (userData.role === "parent" || userData.role === "admin")) {
    return { valid: false, code: "permission-denied", error: "학생 계정만 상점 아이템을 구매할 수 있습니다." };
  }

  const crystals = Math.max(0, Number(userData.crystals || 0));
  if (crystals < item.cost) {
    return { valid: false, code: "failed-precondition", error: `광석이 부족합니다. (필요: ${item.cost}개)` };
  }

  return { valid: true, item };
}

function calculatePurchaseUserUpdates({
  itemId,
  userData = {},
  nowMs = Date.now(),
  isRadarActiveFn = null,
}) {
  const item = STORE_ITEM_GIFT_CATALOG[itemId];
  if (!item) {
    return { ok: false, code: "invalid-argument", error: "구매할 수 없는 아이템입니다." };
  }
  if (!SERVER_PURCHASE_ITEM_IDS.has(itemId)) {
    return { ok: false, code: "invalid-argument", error: "이 구매 경로에서 지원하지 않는 아이템입니다." };
  }

  const currentCrystals = Math.max(0, Number(userData.crystals || 0));
  if (currentCrystals < item.cost) {
    return { ok: false, code: "failed-precondition", error: `광석이 부족합니다. (필요: ${item.cost}개)` };
  }

  const updates = {
    crystals: currentCrystals - item.cost,
  };
  let shouldSyncAnswers = false;

  if (itemId === "radar") {
    const active = typeof isRadarActiveFn === "function"
      ? isRadarActiveFn(userData, nowMs)
      : (Number(userData.radarExpiresAtMs || 0) > nowMs);
    if (active) {
      return { ok: false, code: "failed-precondition", error: "이미 첨단 마이닝 스캐너를 활성화 중입니다." };
    }
    updates.hasRadar = true;
    updates.radarActivatedAtMs = nowMs;
    updates.radarExpiresAtMs = nowMs + STORE_RADAR_DURATION_DAYS * 24 * 60 * 60 * 1000;
  } else if (item.explorationKitId) {
    const ownedKits = getOwnedExplorationKits(userData);
    if (ownedKits.includes(item.explorationKitId)) {
      return { ok: false, code: "failed-precondition", error: `이미 ${item.name}을 보유 중입니다.` };
    }
    updates.ownedExplorationKits = [...ownedKits, item.explorationKitId];
  } else if (item.uniqueField) {
    if (userData[item.uniqueField]) {
      return { ok: false, code: "failed-precondition", error: `이미 ${item.name}을 보유 중입니다.` };
    }
    updates[item.uniqueField] = true;
    shouldSyncAnswers = true;
  } else if (item.frameId) {
    const ownedFrames = getOwnedProfileFrames(userData);
    if (ownedFrames.includes(item.frameId)) {
      return { ok: false, code: "failed-precondition", error: `이미 ${item.name}을 보유 중입니다.` };
    }
    updates.ownedProfileFrames = [...ownedFrames, item.frameId];
    updates.selectedProfileFrame = item.frameId;
    shouldSyncAnswers = true;
  } else if (item.baseThemeId) {
    const ownedThemes = getOwnedBaseThemes(userData);
    if (ownedThemes.includes(item.baseThemeId)) {
      return { ok: false, code: "failed-precondition", error: `이미 ${item.name}을 보유 중입니다.` };
    }
    updates.ownedBaseThemes = [...ownedThemes, item.baseThemeId];
    updates.selectedBaseTheme = item.baseThemeId;
  } else if (item.recipientField) {
    const currentOwned = Math.max(0, Number(userData[item.recipientField] || 0));
    updates[item.recipientField] = currentOwned + (item.transferAmount || 1);
  }

  return {
    ok: true,
    userUpdates: updates,
    shouldSyncAnswers,
    item,
  };
}

function getPurchaseTransactionType(itemId) {
  const item = STORE_ITEM_GIFT_CATALOG[itemId];
  if (item?.explorationKitId) return "frontier_equipment_purchase";
  if (item?.baseThemeId) return "base_theme_purchase";
  if (item?.uniqueField || item?.frameId) return "agora_profile_purchase";
  return "store_purchase";
}

module.exports = {
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
};
