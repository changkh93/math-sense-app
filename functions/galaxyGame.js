/* global module */

const GALAXY_ITEM_CATALOG = {
  star_lamp: { name: "별빛 램프", icon: "✦", cost: 25, material: "stardust", materialCost: 0, kind: "decor" },
  lumen_tree: { name: "루멘 나무", icon: "🌳", cost: 60, material: "biofiber", materialCost: 2, kind: "nature" },
  crystal_pond: { name: "수정 연못", icon: "💠", cost: 110, material: "crystalGlass", materialCost: 2, kind: "nature" },
  rover_bay: { name: "탐사 로버 정비소", icon: "🛠️", cost: 160, material: "alloy", materialCost: 3, kind: "facility" },
  observatory: { name: "성운 관측소", icon: "🔭", cost: 240, material: "crystalGlass", materialCost: 4, kind: "facility" },
  friend_greenhouse: { name: "별빛 공동 온실", icon: "🏡", cost: 180, material: "biofiber", materialCost: 4, kind: "social" },
};

const GALAXY_THEMES = new Set(["forest", "ocean", "crystal", "desert", "mechanical", "ice"]);
const GALAXY_PLAY_STYLES = new Set(["decorate", "explore", "collect", "cooperate", "photo"]);
const GALAXY_VISIT_ACTIONS = {
  water: { label: "별꽃에 물주기", icon: "💧", stat: "gardenVitality" },
  repair: { label: "시설 수리하기", icon: "🔧", stat: "facilityHealth" },
  feed: { label: "생명체 돌보기", icon: "🌱", stat: "creatureHappiness" },
  admire: { label: "감탄 신호 남기기", icon: "✨", stat: "admirationCount" },
};
const GALAXY_SAFE_VISIT_MESSAGES = new Set([
  "새로운 풍경이 정말 멋져!",
  "다음 탐사도 같이 가자!",
  "정원을 조금 돌보고 갔어.",
  "이 행성의 색 조합이 좋아!",
]);
const GALAXY_WORLD_ACTIONS = {
  crystal: { material: "crystalGlass", amount: 1, label: "수정 파편을 채집했습니다." },
  fiber: { material: "biofiber", amount: 1, label: "루멘 섬유를 채집했습니다." },
  salvage: { material: "alloy", amount: 1, label: "고대 합금을 회수했습니다." },
  beacon: { material: "stardust", amount: 1, label: "신호기를 수리하고 별가루를 찾았습니다.", stat: "facilityHealth" },
  plant: { material: "stardust", amount: 0, label: "황무지에 루멘 새싹을 심었습니다.", plants: true },
};
const GALAXY_WORLD_NODE_ACTIONS = {
  crystal_north: "crystal",
  fiber_grove: "fiber",
  ancient_scrap: "salvage",
  broken_beacon: "beacon",
  wild_soil: "plant",
};

const LEARNING_ORE_EXCLUDED_TYPES = new Set([
  "crystal_gift_received",
  "crystal_gift_sent",
  "store_item_gift_received",
  "store_item_gift_sent",
  "crew_crystal_chest_reward",
  "crew_growth_event_reward",
  "crew_mothership_contribution",
  "galaxy_build",
]);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function cleanText(value, maxLength = 120) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function cleanId(value, maxLength = 180) {
  return String(value || "").trim().slice(0, maxLength);
}

function containsUnsafePublicText(value) {
  const text = String(value || "");
  return /https?:\/\/|www\.|@[a-z0-9_.-]+|\b\d{2,4}[- .)]?\d{3,4}[- .]?\d{4}\b/i.test(text);
}

function uniqueIds(values = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getCrewMemberIds(crew = {}) {
  return uniqueIds([...(Array.isArray(crew.memberIds) ? crew.memberIds : []), crew.leaderId]);
}

function getPublicName(user = {}) {
  return cleanText(user.publicDisplayName || user.studentName || user.name || user.displayName || "탐사원", 40) || "탐사원";
}

function getKstDayKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function calculateWilsonLowerBound(successes, total, z = 1) {
  const n = Math.max(0, Math.floor(Number(total) || 0));
  if (!n) return 0;
  const s = Math.min(n, Math.max(0, Math.floor(Number(successes) || 0)));
  const phat = s / n;
  const z2 = z * z;
  const denominator = 1 + z2 / n;
  const center = phat + z2 / (2 * n);
  const margin = z * Math.sqrt((phat * (1 - phat) + z2 / (4 * n)) / n);
  return clamp((center - margin) / denominator, 0, 1);
}

function toAbilityLevel(score, thresholds) {
  let level = 1;
  thresholds.forEach((threshold, index) => {
    if (score >= threshold) level = index + 2;
  });
  return clamp(level, 1, 5);
}

function buildAbilitySnapshot(user = {}, lifetimeLearningOre = 0) {
  const avgScore = clamp(user.averageScore, 0, 100);
  const perfectCount = Math.max(0, Number(user.perfectCount || 0));
  const streak = Math.max(0, Number(user.currentStreak || 0));
  const weeklyGrowth = Math.max(0, Number(user.weeklyGrowth || 0));
  const helpCount = Math.max(0, Number(user.helpCount || 0));
  const questionCount = Math.max(0, Number(user.questionCount || 0));
  const focusHits = Math.max(0, Number(user.videoAttentionHits || user.attentionHits || user.focusHits || 0));
  const focusMisses = Math.max(0, Number(user.videoAttentionMisses || user.attentionMisses || user.focusMisses || 0));
  const focusOpportunities = Math.max(focusHits + focusMisses, Number(user.videoAttentionOpportunities || user.attentionOpportunities || user.focusOpportunities || 0));
  const battleMatches = Math.max(0, Number(user.totalBattleMatches || 0));
  const battleRating = Math.max(0, Number(user.battleRating || 0));
  const battleTraining = Math.max(0, Number(user.aiBattleCompletedMatches || 0));

  const values = {
    detection: toAbilityLevel(avgScore * 5 + perfectCount * 10, [180, 350, 550, 800]),
    endurance: toAbilityLevel(streak, [3, 7, 14, 30]),
    precision: toAbilityLevel(calculateWilsonLowerBound(focusHits, focusOpportunities) * 600, [80, 180, 320, 480]),
    pioneering: toAbilityLevel(weeklyGrowth, [50, 150, 350, 700]),
    communication: toAbilityLevel(helpCount * 20 + questionCount * 5, [40, 120, 280, 600]),
    piloting: toAbilityLevel(Math.max(0, battleRating - 900) + battleMatches * 15 + battleTraining * 5, [100, 300, 650, 1100]),
    construction: toAbilityLevel(lifetimeLearningOre, [100, 300, 800, 1800]),
  };
  return { version: 1, values };
}

function getShipHullTier(lifetimeLearningOre = 0) {
  const thresholds = [0, 100, 250, 500, 1000, 2000, 5000];
  let tier = 1;
  thresholds.forEach((threshold, index) => {
    if (lifetimeLearningOre >= threshold) tier = index + 1;
  });
  return tier;
}

function buildStarterPlanet(uid, user, learningState, now) {
  return {
    ownerId: uid,
    ownerName: getPublicName(user),
    schemaVersion: 1,
    planetName: `${getPublicName(user)}의 작은 별`,
    tagline: "천천히, 하지만 분명하게 자라는 행성",
    theme: "forest",
    playStyles: ["decorate", "explore"],
    visitMode: "crew",
    layout: [
      { instanceId: "starter_dome", itemId: "starter_dome", icon: "🛖", name: "개척자 돔", x: 48, y: 48, rotation: 0, locked: true },
      { instanceId: "starter_tree", itemId: "lumen_tree", icon: "🌳", name: "첫 루멘 나무", x: 25, y: 58, rotation: 0, locked: true },
      { instanceId: "starter_lamp", itemId: "star_lamp", icon: "✦", name: "귀환등", x: 70, y: 62, rotation: 0, locked: true },
    ],
    materials: { stardust: 8, biofiber: 4, crystalGlass: 2, alloy: 1 },
    stats: { gardenVitality: 60, facilityHealth: 70, creatureHappiness: 55, admirationCount: 0, visits: 0 },
    lifetimeLearningOre: learningState.lifetimeLearningOre,
    shipHullTier: learningState.shipHullTier,
    abilitySnapshot: learningState.abilitySnapshot,
    lastMissionAtMs: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function isEligibleLearningOreTransaction(data = {}) {
  const amount = Number(data.amount || 0);
  const type = cleanId(data.type, 80);
  if (amount <= 0 || LEARNING_ORE_EXCLUDED_TYPES.has(type)) return false;
  if (type.includes("gift") || type.includes("refund") || type.includes("crew_")) return false;
  return true;
}

async function calculateLifetimeLearningOre(db, uid, user = {}) {
  const existing = Math.max(0, Number(user.lifetimeLearningCrystalsEarned || 0));
  const currentBalance = Math.max(0, Number(user.crystals || 0));
  const txSnap = await db.collection("users").doc(uid).collection("crystal_transactions").get();
  const ledgerTotal = txSnap.docs.reduce((sum, snap) => {
    const row = snap.data() || {};
    return sum + (isEligibleLearningOreTransaction(row) ? Number(row.amount || 0) : 0);
  }, 0);
  return Math.max(existing, currentBalance, Math.floor(ledgerTotal));
}

function serializeValue(value) {
  if (value == null) return value;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serializeValue);
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, serializeValue(nested)]));
  }
  return value;
}

module.exports = function registerGalaxyGame({ functions, admin, regionalFunctions }) {
  const db = admin.firestore();
  const FieldValue = admin.firestore.FieldValue;

  function requireUid(context) {
    if (!context.auth?.uid) throw new functions.https.HttpsError("unauthenticated", "로그인이 필요합니다.");
    return context.auth.uid;
  }

  async function requireMember(uid) {
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists || userSnap.data()?.isGuest === true || userSnap.data()?.isDeleted === true) {
      throw new functions.https.HttpsError("failed-precondition", "정식 학생 계정에서만 은하 게임을 이용할 수 있습니다.");
    }
    return { userRef, user: userSnap.data() || {} };
  }

  async function getSharedCrew(actorUid, targetUid, actorUser) {
    const crewId = cleanId(actorUser.crewId);
    if (!crewId) return null;
    const crewSnap = await db.collection("crews").doc(crewId).get();
    if (!crewSnap.exists) return null;
    const crew = crewSnap.data() || {};
    const memberIds = getCrewMemberIds(crew);
    if (crew.status !== "approved" || !memberIds.includes(actorUid) || !memberIds.includes(targetUid)) return null;
    return { id: crewSnap.id, ...crew, memberIds };
  }

  async function syncLearningState(uid, userRef, user) {
    const lifetimeLearningOre = await calculateLifetimeLearningOre(db, uid, user);
    const shipHullTier = Math.max(Number(user.galaxyShipHullTier || 1), getShipHullTier(lifetimeLearningOre));
    const currentResonance = buildAbilitySnapshot(user, lifetimeLearningOre);
    const previousValues = user.gameAbilitySnapshot?.values || {};
    const values = Object.fromEntries(Object.entries(currentResonance.values).map(([abilityId, level]) => [
      abilityId,
      Math.max(Number(previousValues[abilityId] || 1), Number(level || 1)),
    ]));
    const abilitySnapshot = {
      version: 2,
      values,
      resonance: currentResonance.values,
    };
    await userRef.set({
      lifetimeLearningCrystalsEarned: lifetimeLearningOre,
      galaxyShipHullTier: shipHullTier,
      gameAbilitySnapshot: abilitySnapshot,
      galaxyLearningSyncedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return { lifetimeLearningOre, shipHullTier, abilitySnapshot };
  }

  async function ensurePlanet(uid, user, learningState = null) {
    const planetRef = db.collection("galaxyPlanets").doc(uid);
    let planetSnap = await planetRef.get();
    if (!planetSnap.exists) {
      const state = learningState || {
        lifetimeLearningOre: Math.max(0, Number(user.lifetimeLearningCrystalsEarned || user.crystals || 0)),
        shipHullTier: Math.max(1, Number(user.galaxyShipHullTier || 1)),
        abilitySnapshot: buildAbilitySnapshot(user, Number(user.lifetimeLearningCrystalsEarned || user.crystals || 0)),
      };
      await planetRef.create(buildStarterPlanet(uid, user, state, FieldValue.serverTimestamp()));
      planetSnap = await planetRef.get();
    } else if (learningState) {
      await planetRef.set({
        ownerName: getPublicName(user),
        lifetimeLearningOre: learningState.lifetimeLearningOre,
        shipHullTier: learningState.shipHullTier,
        abilitySnapshot: learningState.abilitySnapshot,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      planetSnap = await planetRef.get();
    }
    return { ref: planetRef, data: { id: planetSnap.id, ...(planetSnap.data() || {}) } };
  }

  async function listCrewNeighbors(uid, user) {
    const crewId = cleanId(user.crewId);
    if (!crewId) return [];
    const crewSnap = await db.collection("crews").doc(crewId).get();
    if (!crewSnap.exists || crewSnap.data()?.status !== "approved") return [];
    const memberIds = getCrewMemberIds(crewSnap.data() || {}).filter((id) => id !== uid).slice(0, 40);
    if (!memberIds.length) return [];
    const refs = memberIds.flatMap((memberId) => [db.collection("users").doc(memberId), db.collection("galaxyPlanets").doc(memberId)]);
    const snaps = await db.getAll(...refs);
    const rows = [];
    for (let index = 0; index < memberIds.length; index += 1) {
      const memberId = memberIds[index];
      const userSnap = snaps[index * 2];
      const planetSnap = snaps[index * 2 + 1];
      if (!userSnap?.exists || userSnap.data()?.isDeleted === true) continue;
      const member = userSnap.data() || {};
      const planet = planetSnap?.exists ? planetSnap.data() || {} : {};
      rows.push({
        uid: memberId,
        displayName: getPublicName(member),
        planetName: cleanText(planet.planetName || `${getPublicName(member)}의 미개척 별`, 40),
        theme: GALAXY_THEMES.has(planet.theme) ? planet.theme : "forest",
        shipHullTier: Math.max(1, Number(planet.shipHullTier || member.galaxyShipHullTier || 1)),
        tagline: cleanText(planet.tagline || "아직 첫 신호를 기다리고 있어요.", 80),
      });
    }
    return rows;
  }

  const openGalaxyHome = regionalFunctions.https.onCall(async (data, context) => {
    const uid = requireUid(context);
    const { userRef, user } = await requireMember(uid);
    const learningState = await syncLearningState(uid, userRef, user);
    const ownPlanet = await ensurePlanet(uid, user, learningState);
    const targetUid = cleanId(data?.targetUid) || uid;
    let targetPlanet = ownPlanet;

    if (targetUid !== uid) {
      const sharedCrew = await getSharedCrew(uid, targetUid, user);
      if (!sharedCrew) throw new functions.https.HttpsError("permission-denied", "같은 스터디 크루의 행성만 방문할 수 있습니다.");
      const targetUserSnap = await db.collection("users").doc(targetUid).get();
      if (!targetUserSnap.exists) throw new functions.https.HttpsError("not-found", "친구 정보를 찾을 수 없습니다.");
      targetPlanet = await ensurePlanet(targetUid, targetUserSnap.data() || {});
    }

    const [neighbors, eventSnap] = await Promise.all([
      listCrewNeighbors(uid, user),
      ownPlanet.ref.collection("visitEvents").orderBy("createdAt", "desc").limit(30).get(),
    ]);

    return serializeValue({
      ownPlanet: ownPlanet.data,
      planet: targetPlanet.data,
      neighbors,
      events: eventSnap.docs.map((snap) => ({ id: snap.id, ...(snap.data() || {}) })),
      wallet: Math.max(0, Number(user.crystals || 0)),
      learningState,
      catalog: GALAXY_ITEM_CATALOG,
    });
  });

  const saveGalaxyPassport = regionalFunctions.https.onCall(async (data, context) => {
    const uid = requireUid(context);
    const { user } = await requireMember(uid);
    const planet = await ensurePlanet(uid, user);
    const planetName = cleanText(data?.planetName, 30);
    const tagline = cleanText(data?.tagline, 80);
    const theme = GALAXY_THEMES.has(data?.theme) ? data.theme : "forest";
    const playStyles = uniqueIds(Array.isArray(data?.playStyles) ? data.playStyles : [])
      .filter((style) => GALAXY_PLAY_STYLES.has(style))
      .slice(0, 3);
    const visitMode = data?.visitMode === "private" ? "private" : "crew";
    if (planetName.length < 2) throw new functions.https.HttpsError("invalid-argument", "행성 이름을 두 글자 이상 입력해주세요.");
    if (containsUnsafePublicText(planetName) || containsUnsafePublicText(tagline)) {
      throw new functions.https.HttpsError("invalid-argument", "행성 공개 정보에는 연락처, 계정명 또는 링크를 넣을 수 없습니다.");
    }
    await planet.ref.set({ planetName, tagline, theme, playStyles, visitMode, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { success: true };
  });

  const buildGalaxyItem = regionalFunctions.https.onCall(async (data, context) => {
    const uid = requireUid(context);
    const itemId = cleanId(data?.itemId, 80);
    const item = GALAXY_ITEM_CATALOG[itemId];
    if (!item) throw new functions.https.HttpsError("invalid-argument", "건설할 수 없는 시설입니다.");
    const { userRef, user } = await requireMember(uid);
    const planet = await ensurePlanet(uid, user);
    const operationRef = db.collection("galaxyOperations").doc();
    const txRef = userRef.collection("crystal_transactions").doc(`galaxy-build-${operationRef.id}`);
    const result = await db.runTransaction(async (transaction) => {
      const [userSnap, planetSnap] = await Promise.all([transaction.get(userRef), transaction.get(planet.ref)]);
      const currentUser = userSnap.data() || {};
      const currentPlanet = planetSnap.data() || {};
      const wallet = Math.max(0, Number(currentUser.crystals || 0));
      const materials = { ...(currentPlanet.materials || {}) };
      const materialCount = Math.max(0, Number(materials[item.material] || 0));
      const layout = Array.isArray(currentPlanet.layout) ? currentPlanet.layout : [];
      if (wallet < item.cost) throw new functions.https.HttpsError("failed-precondition", "학습 광석이 부족합니다.");
      if (materialCount < item.materialCost) throw new functions.https.HttpsError("failed-precondition", `${item.name} 건설에 필요한 게임 재료가 부족합니다.`);
      if (layout.length >= 36) throw new functions.https.HttpsError("failed-precondition", "현재 구역에 더 이상 시설을 놓을 수 없습니다.");
      const instanceId = `${itemId}_${operationRef.id.slice(0, 10)}`;
      const slot = layout.length;
      const requestedX = Number(data?.x);
      const requestedY = Number(data?.y);
      const x = Number.isFinite(requestedX) ? clamp(requestedX, 8, 92) : 16 + ((slot * 19) % 68);
      const y = Number.isFinite(requestedY) ? clamp(requestedY, 12, 88) : 24 + ((slot * 23) % 58);
      const placed = { instanceId, itemId, icon: item.icon, name: item.name, x, y, rotation: 0, locked: false };
      materials[item.material] = materialCount - item.materialCost;
      transaction.set(userRef, { crystals: wallet - item.cost }, { merge: true });
      transaction.set(planet.ref, { layout: [...layout, placed], materials, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      transaction.set(txRef, {
        amount: -item.cost,
        type: "galaxy_build",
        description: `${item.name} 행성 건설`,
        metadata: { itemId, instanceId: placed.instanceId, source: "buildGalaxyItem" },
        timestamp: FieldValue.serverTimestamp(),
      });
      transaction.set(operationRef, { uid, type: "build", itemId, amount: item.cost, createdAt: FieldValue.serverTimestamp() });
      return { placed, wallet: wallet - item.cost, materials };
    });
    return serializeValue({ success: true, ...result });
  });

  const moveGalaxyItem = regionalFunctions.https.onCall(async (data, context) => {
    const uid = requireUid(context);
    const instanceId = cleanId(data?.instanceId, 120);
    const x = clamp(data?.x, 7, 93);
    const y = clamp(data?.y, 12, 88);
    const rotation = ((Math.round(Number(data?.rotation || 0) / 45) * 45) % 360 + 360) % 360;
    const { user } = await requireMember(uid);
    const planet = await ensurePlanet(uid, user);
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(planet.ref);
      const layout = Array.isArray(snap.data()?.layout) ? snap.data().layout : [];
      const index = layout.findIndex((entry) => entry.instanceId === instanceId);
      if (index < 0) throw new functions.https.HttpsError("not-found", "배치된 시설을 찾을 수 없습니다.");
      const next = layout.map((entry, entryIndex) => entryIndex === index ? { ...entry, x, y, rotation } : entry);
      transaction.set(planet.ref, { layout: next, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    });
    return { success: true };
  });

  const performGalaxyVisitAction = regionalFunctions.https.onCall(async (data, context) => {
    const uid = requireUid(context);
    const targetUid = cleanId(data?.targetUid);
    const actionId = cleanId(data?.actionId, 40);
    const action = GALAXY_VISIT_ACTIONS[actionId];
    const visitMessage = GALAXY_SAFE_VISIT_MESSAGES.has(data?.message) ? data.message : "";
    if (!targetUid || targetUid === uid || !action) throw new functions.https.HttpsError("invalid-argument", "방문 행동 정보가 올바르지 않습니다.");
    const { user: actor } = await requireMember(uid);
    const sharedCrew = await getSharedCrew(uid, targetUid, actor);
    if (!sharedCrew) throw new functions.https.HttpsError("permission-denied", "같은 크루 친구에게만 도움을 줄 수 있습니다.");
    const [targetUserSnap] = await Promise.all([db.collection("users").doc(targetUid).get()]);
    if (!targetUserSnap.exists) throw new functions.https.HttpsError("not-found", "행성 주인을 찾을 수 없습니다.");
    const [actorPlanet, targetPlanet] = await Promise.all([
      ensurePlanet(uid, actor),
      ensurePlanet(targetUid, targetUserSnap.data() || {}),
    ]);
    if (targetPlanet.data.visitMode === "private") throw new functions.https.HttpsError("permission-denied", "현재 방문을 받지 않는 행성입니다.");
    const dayKey = getKstDayKey();
    const dailyRef = db.collection("galaxyOperations").doc(`visit_${dayKey}_${uid}_${targetUid}`);
    const eventRef = targetPlanet.ref.collection("visitEvents").doc();
    const result = await db.runTransaction(async (transaction) => {
      const [dailySnap, targetSnap, actorSnap] = await Promise.all([
        transaction.get(dailyRef), transaction.get(targetPlanet.ref), transaction.get(actorPlanet.ref),
      ]);
      const daily = dailySnap.data() || {};
      const count = Math.max(0, Number(daily.count || 0));
      if (count >= 8) throw new functions.https.HttpsError("resource-exhausted", "이 친구에게 오늘 남길 수 있는 도움을 모두 사용했습니다.");
      const targetData = targetSnap.data() || {};
      const stats = { ...(targetData.stats || {}) };
      stats[action.stat] = action.stat === "admirationCount"
        ? Math.max(0, Number(stats[action.stat] || 0)) + 1
        : clamp(Number(stats[action.stat] || 0) + 4, 0, 100);
      stats.visits = Math.max(0, Number(stats.visits || 0)) + (count === 0 ? 1 : 0);
      const actorData = actorSnap.data() || {};
      const materials = { ...(actorData.materials || {}) };
      const rewarded = count < 3;
      if (rewarded) materials.stardust = Math.max(0, Number(materials.stardust || 0)) + 1;
      transaction.set(targetPlanet.ref, { stats, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      transaction.set(actorPlanet.ref, { materials, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      transaction.set(dailyRef, { actorId: uid, targetId: targetUid, dayKey, count: count + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      transaction.set(eventRef, {
        ownerId: targetUid,
        actorId: uid,
        actorName: getPublicName(actor),
        actionId,
        actionLabel: action.label,
        actionIcon: action.icon,
        message: visitMessage,
        seen: false,
        createdAt: FieldValue.serverTimestamp(),
      });
      return { rewarded, material: rewarded ? "stardust" : "" };
    });
    return { success: true, ...result };
  });

  const runGalaxyMission = regionalFunctions.https.onCall(async (data, context) => {
    const uid = requireUid(context);
    const route = ["nebula", "comet", "ruins"].includes(data?.route) ? data.route : "nebula";
    const partnerUid = cleanId(data?.partnerUid);
    const { user } = await requireMember(uid);
    if (partnerUid && partnerUid !== uid && !(await getSharedCrew(uid, partnerUid, user))) {
      throw new functions.https.HttpsError("permission-denied", "같은 크루 친구만 릴레이 파트너로 선택할 수 있습니다.");
    }
    const planet = await ensurePlanet(uid, user);
    const missionRef = db.collection("galaxyOperations").doc();
    const result = await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(planet.ref);
      const current = snap.data() || {};
      const nowMs = Date.now();
      const lastMissionAtMs = Math.max(0, Number(current.lastMissionAtMs || 0));
      const cooldownMs = 2 * 60 * 60 * 1000;
      if (lastMissionAtMs && nowMs - lastMissionAtMs < cooldownMs) {
        throw new functions.https.HttpsError("resource-exhausted", "탐사선 정비가 끝난 뒤 다시 출항할 수 있습니다.");
      }
      const abilities = current.abilitySnapshot?.values || {};
      const routeAbility = route === "nebula" ? abilities.detection : route === "comet" ? abilities.piloting : abilities.precision;
      const bonus = Number(routeAbility || 1) >= 4 ? 1 : 0;
      const rewardMap = {
        nebula: { material: "biofiber", amount: 2 + bonus, title: "성운 생태 표본" },
        comet: { material: "alloy", amount: 1 + bonus, title: "혜성 합금 조각" },
        ruins: { material: "crystalGlass", amount: 1 + bonus, title: "고대 수정 유리" },
      };
      const reward = rewardMap[route];
      const materials = { ...(current.materials || {}) };
      materials[reward.material] = Math.max(0, Number(materials[reward.material] || 0)) + reward.amount;
      transaction.set(planet.ref, {
        materials,
        lastMissionAtMs: nowMs,
        lastMission: { route, title: reward.title, partnerUid: partnerUid || "", completedAtMs: nowMs },
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      transaction.set(missionRef, { uid, type: "galaxy_mission", route, reward, partnerUid: partnerUid || "", createdAt: FieldValue.serverTimestamp() });
      return { reward, bonus, nextMissionAtMs: nowMs + cooldownMs };
    });
    if (partnerUid && partnerUid !== uid) {
      const partnerEventRef = db.collection("galaxyPlanets").doc(partnerUid).collection("visitEvents").doc();
      await partnerEventRef.set({
        ownerId: partnerUid,
        actorId: uid,
        actorName: getPublicName(user),
        actionId: "relay",
        actionLabel: "함께 비동기 탐사 릴레이를 완주했어요",
        actionIcon: "🚀",
        message: "우리의 항로가 기억 기록소에 남았습니다.",
        seen: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    return serializeValue({ success: true, ...result });
  });

  const performGalaxyWorldAction = regionalFunctions.https.onCall(async (data, context) => {
    const uid = requireUid(context);
    const actionId = cleanId(data?.actionId, 40);
    const nodeId = cleanId(data?.nodeId, 80);
    const worldX = clamp(data?.x, -16, 16);
    const worldZ = clamp(data?.z, -16, 16);
    const action = GALAXY_WORLD_ACTIONS[actionId];
    if (!action || GALAXY_WORLD_NODE_ACTIONS[nodeId] !== actionId) {
      throw new functions.https.HttpsError("invalid-argument", "월드 상호작용 정보가 올바르지 않습니다.");
    }
    const { user } = await requireMember(uid);
    const planet = await ensurePlanet(uid, user);
    const operationRef = db.collection("galaxyOperations").doc(`world_${uid}_${nodeId}`);
    const result = await db.runTransaction(async (transaction) => {
      const [operationSnap, planetSnap] = await Promise.all([
        transaction.get(operationRef),
        transaction.get(planet.ref),
      ]);
      const nowMs = Date.now();
      const availableAtMs = Math.max(0, Number(operationSnap.data()?.availableAtMs || 0));
      if (availableAtMs > nowMs) {
        throw new functions.https.HttpsError("resource-exhausted", "이 자원은 아직 다시 생성되지 않았습니다.");
      }
      const current = planetSnap.data() || {};
      const materials = { ...(current.materials || {}) };
      const layout = Array.isArray(current.layout) ? current.layout : [];
      const stats = { ...(current.stats || {}) };
      if (action.amount > 0) {
        materials[action.material] = Math.max(0, Number(materials[action.material] || 0)) + action.amount;
      }
      if (action.stat) stats[action.stat] = clamp(Number(stats[action.stat] || 0) + 6, 0, 100);

      const updates = { materials, stats, updatedAt: FieldValue.serverTimestamp() };
      if (action.plants) {
        if (layout.length >= 36) throw new functions.https.HttpsError("failed-precondition", "행성에 더 이상 새싹을 심을 공간이 없습니다.");
        const x = clamp(50 + worldX * 3, 8, 92);
        const y = clamp(50 + worldZ * 3, 12, 88);
        updates.layout = [...layout, {
          instanceId: `sprout_${nowMs}_${nodeId.slice(0, 18)}`,
          itemId: "wild_sprout",
          icon: "🌱",
          name: "직접 심은 루멘 새싹",
          x,
          y,
          rotation: 0,
          locked: false,
        }];
      }

      transaction.set(planet.ref, updates, { merge: true });
      transaction.set(operationRef, {
        uid,
        type: "galaxy_world_action",
        actionId,
        nodeId,
        availableAtMs: nowMs + (action.plants ? 60 * 60 * 1000 : 5 * 60 * 1000),
        lastCompletedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return { material: action.material, amount: action.amount, label: action.label };
    });
    return { success: true, ...result };
  });

  const markGalaxyEventsSeen = regionalFunctions.https.onCall(async (data, context) => {
    const uid = requireUid(context);
    await requireMember(uid);
    const eventIds = uniqueIds(Array.isArray(data?.eventIds) ? data.eventIds.map((id) => cleanId(id, 180)) : []).slice(0, 30);
    if (!eventIds.length) return { success: true, updated: 0 };
    const batch = db.batch();
    eventIds.forEach((eventId) => batch.set(db.collection("galaxyPlanets").doc(uid).collection("visitEvents").doc(eventId), {
      seen: true,
      seenAt: FieldValue.serverTimestamp(),
    }, { merge: true }));
    await batch.commit();
    return { success: true, updated: eventIds.length };
  });

  return {
    openGalaxyHome,
    saveGalaxyPassport,
    buildGalaxyItem,
    moveGalaxyItem,
    performGalaxyVisitAction,
    runGalaxyMission,
    performGalaxyWorldAction,
    markGalaxyEventsSeen,
  };
};
