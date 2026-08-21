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
};

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

module.exports = {
  STORE_RADAR_DURATION_DAYS,
  STORE_PHOTON_SHIELD_CHARGES_PER_GIFT,
  STORE_ITEM_GIFT_CATALOG,
  getOwnedProfileFrames,
  getOwnedBaseThemes,
  validateGiftRequest,
  calculateGiftRecipientUpdates,
};
