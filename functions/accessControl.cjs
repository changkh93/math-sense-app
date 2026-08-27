const crypto = require("crypto");

const ACCESS_CLAIMS_VERSION = 1;
const VALID_CLUSTER_STATES = new Set(["none", "active", "suspended"]);
const VALID_REGION_STATES = new Set(["none", "active", "completed", "suspended"]);

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "").slice(0, 64);
}

function hashCode(value) {
  return crypto.createHash("sha256").update(normalizeCode(value)).digest("hex");
}

function timestampMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return Number(value.toMillis() || 0);
  if (value instanceof Date) return value.getTime();
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeAccessMap(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([id, status]) => id && typeof status === "string")
      .map(([id, status]) => [String(id).slice(0, 160), status])
  );
}

function activeCourseIds(clusterAccess = {}) {
  return Object.entries(normalizeAccessMap(clusterAccess))
    .filter(([, status]) => status === "active")
    .map(([id]) => id)
    .sort();
}

function activeRegionIds(regionAccess = {}) {
  return Object.entries(normalizeAccessMap(regionAccess))
    .filter(([, status]) => status === "active" || status === "completed")
    .map(([id]) => id)
    .sort();
}

function buildAccessClaims(existingClaims = {}, clusterAccess = {}, regionAccess = {}) {
  const claims = {
    ...existingClaims,
    courses: activeCourseIds(clusterAccess),
    regions: activeRegionIds(regionAccess),
    accessVersion: ACCESS_CLAIMS_VERSION,
  };
  const bytes = Buffer.byteLength(JSON.stringify(claims), "utf8");
  if (bytes > 900) {
    const error = new Error(`Access claims payload is too large (${bytes} bytes)`);
    error.code = "access/claims-too-large";
    throw error;
  }
  return claims;
}

function applyAccessState(currentMap, resourceId, status, validStates) {
  if (!validStates.has(status)) throw new Error("invalid-access-state");
  const next = normalizeAccessMap(currentMap);
  if (status === "none") delete next[resourceId];
  else next[resourceId] = status;
  return next;
}

function publicClusterData(data = {}) {
  const { inviteCode, ...safe } = data;
  return safe;
}

function publicRegionData(data = {}) {
  const { accessCode, ...safe } = data;
  return safe;
}

module.exports = function createAccessControl({ functions, admin, regionalFunctions, requireAuthUid, requireAdminUid }) {
  const db = admin.firestore();
  const { FieldValue } = admin.firestore;

  const fail = (code, message) => {
    throw new functions.https.HttpsError(code, message);
  };

  async function syncClaims(uid, clusterAccess, regionAccess = {}) {
    const authUser = await admin.auth().getUser(uid);
    const claims = buildAccessClaims(authUser.customClaims || {}, clusterAccess, regionAccess);
    await admin.auth().setCustomUserClaims(uid, claims);
    return claims;
  }

  async function getActiveUser(uid) {
    const ref = db.collection("users").doc(uid);
    const snap = await ref.get();
    const data = snap.data() || {};
    if (!snap.exists || data.isDeleted === true || data.accountStatus === "deleted" || data.deletedAt) {
      fail("failed-precondition", "활성 회원 계정이 필요합니다.");
    }
    return { ref, data };
  }

  const adminSetUserAccess = regionalFunctions.https.onCall(async (payload, context) => {
    const adminUid = await requireAdminUid(context);
    const targetUid = String(payload?.targetUid || "").trim();
    const scope = payload?.scope === "region" ? "region" : "cluster";
    const resourceId = String(payload?.resourceId || "").trim().slice(0, 160);
    const status = String(payload?.status || "none");
    if (!targetUid || !resourceId) fail("invalid-argument", "대상 사용자와 권한 ID가 필요합니다.");

    const { ref, data } = await getActiveUser(targetUid);
    const validStates = scope === "region" ? VALID_REGION_STATES : VALID_CLUSTER_STATES;
    let nextAccess;
    try {
      nextAccess = applyAccessState(data[`${scope}Access`], resourceId, status, validStates);
    } catch {
      fail("invalid-argument", "지원하지 않는 권한 상태입니다.");
    }

    const update = {
      [`${scope}Access`]: nextAccess,
      accessUpdatedAt: FieldValue.serverTimestamp(),
      accessUpdatedBy: adminUid,
    };
    if (scope === "cluster" && status === "none") {
      const participation = data.participation && typeof data.participation === "object"
        ? { ...data.participation }
        : {};
      delete participation[resourceId];
      update.participation = participation;
    }
    await ref.set(update, { merge: true });
    await syncClaims(
      targetUid,
      scope === "cluster" ? nextAccess : data.clusterAccess,
      scope === "region" ? nextAccess : data.regionAccess
    );
    await ref.set({ accessClaimsSyncedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { ok: true, scope, resourceId, status, access: nextAccess };
  });

  const redeemClusterInvite = regionalFunctions.https.onCall(async (payload, context) => {
    const uid = await requireAuthUid(context);
    const code = normalizeCode(payload?.inviteCode);
    if (!code) fail("invalid-argument", "초대 코드가 필요합니다.");

    const lookupSnap = await db.collection("clusterInviteLookup").doc(hashCode(code)).get();
    let clusterId = lookupSnap.exists ? String(lookupSnap.data()?.clusterId || "") : "";
    if (!clusterId) {
      const legacy = await db.collection("clusters").where("inviteCode", "==", code).limit(1).get();
      clusterId = legacy.empty ? "" : legacy.docs[0].id;
    }
    if (!clusterId) fail("not-found", "유효하지 않은 초대 링크입니다.");

    const clusterRef = db.collection("clusters").doc(clusterId);
    const [{ ref: userRef, data: userData }, clusterSnap] = await Promise.all([
      getActiveUser(uid),
      clusterRef.get(),
    ]);
    if (!clusterSnap.exists) fail("not-found", "행성 군집을 찾을 수 없습니다.");
    const clusterData = clusterSnap.data() || {};
    const expiresAtMs = timestampMillis(clusterData.expiresAt) || timestampMillis(lookupSnap.data()?.expiresAt);
    if (expiresAtMs && expiresAtMs < Date.now()) fail("deadline-exceeded", "만료된 초대 링크입니다.");

    const nextAccess = { ...normalizeAccessMap(userData.clusterAccess), [clusterId]: "active" };
    await Promise.all([
      userRef.set({ clusterAccess: nextAccess, accessUpdatedAt: FieldValue.serverTimestamp() }, { merge: true }),
      clusterRef.set({ usageCount: FieldValue.increment(1) }, { merge: true }),
    ]);
    await syncClaims(uid, nextAccess, userData.regionAccess);
    await userRef.set({ accessClaimsSyncedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { ok: true, cluster: { id: clusterId, ...publicClusterData(clusterData) } };
  });

  const redeemRegionAccessCode = regionalFunctions.https.onCall(async (payload, context) => {
    const uid = await requireAuthUid(context);
    const regionId = String(payload?.regionId || "").trim().slice(0, 160);
    const code = normalizeCode(payload?.accessCode);
    if (!regionId || !code) fail("invalid-argument", "행성과 접근 코드가 필요합니다.");

    const [{ ref: userRef, data: userData }, regionSnap, secretSnap] = await Promise.all([
      getActiveUser(uid),
      db.collection("regions").doc(regionId).get(),
      db.collection("accessSecrets").doc(`region_${regionId}`).get(),
    ]);
    if (!regionSnap.exists) fail("not-found", "행성을 찾을 수 없습니다.");
    const regionData = regionSnap.data() || {};
    const expected = normalizeCode(secretSnap.data()?.code || regionData.accessCode);
    const equal = expected && expected.length === code.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(code));
    if (!equal) fail("permission-denied", "접근 코드가 올바르지 않습니다.");
    const clusterId = String(regionData.clusterId || "cluster_elementary");
    if (regionData.isPrivate && userData.clusterAccess?.[clusterId] !== "active") {
      fail("permission-denied", "먼저 해당 행성 군집에 참여해야 합니다.");
    }

    const nextAccess = { ...normalizeAccessMap(userData.regionAccess), [regionId]: "active" };
    const batch = db.batch();
    batch.set(userRef, { regionAccess: nextAccess, accessUpdatedAt: FieldValue.serverTimestamp() }, { merge: true });
    batch.set(db.collection("regions").doc(regionId).collection("students").doc(uid), {
      email: userData.email || context.auth?.token?.email || "",
      name: userData.studentName || userData.name || "",
      status: "active",
      joinedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    await batch.commit();
    await syncClaims(uid, userData.clusterAccess, nextAccess);
    await userRef.set({ accessClaimsSyncedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { ok: true, region: { id: regionId, ...publicRegionData(regionData) } };
  });

  const completeRegionAccess = regionalFunctions.https.onCall(async (payload, context) => {
    const uid = await requireAuthUid(context);
    const regionId = String(payload?.regionId || "").trim().slice(0, 160);
    if (!regionId) fail("invalid-argument", "행성 ID가 필요합니다.");
    const [{ ref, data }, regionSnap] = await Promise.all([
      getActiveUser(uid),
      db.collection("regions").doc(regionId).get(),
    ]);
    if (!regionSnap.exists) fail("not-found", "행성을 찾을 수 없습니다.");
    const current = data.regionAccess?.[regionId];
    if (regionSnap.data()?.isPrivate && !["active", "completed"].includes(current)) {
      fail("permission-denied", "접근 권한이 없는 행성입니다.");
    }
    const nextAccess = { ...normalizeAccessMap(data.regionAccess), [regionId]: "completed" };
    await ref.set({ regionAccess: nextAccess, accessUpdatedAt: FieldValue.serverTimestamp() }, { merge: true });
    await syncClaims(uid, data.clusterAccess, nextAccess);
    await ref.set({ accessClaimsSyncedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { ok: true };
  });

  const adminSaveAccessResource = regionalFunctions.https.onCall(async (payload, context) => {
    await requireAdminUid(context);
    const type = payload?.type === "region" ? "region" : "cluster";
    const raw = payload?.resource || {};
    const id = String(raw.docId || raw.id || "").trim().slice(0, 160);
    if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) fail("invalid-argument", "유효한 ID가 필요합니다.");
    const codeField = type === "region" ? "accessCode" : "inviteCode";
    const requestedCode = normalizeCode(raw[codeField]);
    const collectionName = type === "region" ? "regions" : "clusters";
    const resourceRef = db.collection(collectionName).doc(id);
    const secretRef = db.collection("accessSecrets").doc(`${type}_${id}`);
    const safe = type === "region" ? publicRegionData(raw) : publicClusterData(raw);
    delete safe.docId;
    delete safe.isNew;
    safe.id = id;
    if (type === "cluster" && raw.expiresAt) {
      const expiresAtMs = timestampMillis(raw.expiresAt);
      safe.expiresAt = expiresAtMs ? admin.firestore.Timestamp.fromMillis(expiresAtMs) : null;
    }
    safe.updatedAt = FieldValue.serverTimestamp();
    safe[codeField] = FieldValue.delete();

    const oldSecret = await secretRef.get();
    const oldCode = normalizeCode(oldSecret.data()?.code);
    const code = requestedCode || oldCode;
    const batch = db.batch();
    batch.set(resourceRef, safe, { merge: true });
    if (raw.isPrivate && code) {
      batch.set(secretRef, { type, resourceId: id, code, updatedAt: FieldValue.serverTimestamp() });
      if (type === "cluster") {
        if (oldCode && oldCode !== code) batch.delete(db.collection("clusterInviteLookup").doc(hashCode(oldCode)));
        batch.set(db.collection("clusterInviteLookup").doc(hashCode(code)), {
          clusterId: id,
          expiresAt: safe.expiresAt || null,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    } else {
      batch.delete(secretRef);
      if (type === "cluster" && oldCode) batch.delete(db.collection("clusterInviteLookup").doc(hashCode(oldCode)));
    }
    await batch.commit();
    return { ok: true, id, code };
  });

  const adminGetAccessSecrets = regionalFunctions.https.onCall(async (payload, context) => {
    await requireAdminUid(context);
    const keys = Array.isArray(payload?.keys) ? payload.keys.slice(0, 100) : [];
    const refs = keys.map((key) => db.collection("accessSecrets").doc(String(key)));
    const snaps = refs.length ? await db.getAll(...refs) : [];
    return { secrets: Object.fromEntries(snaps.filter((snap) => snap.exists).map((snap) => [snap.id, snap.data()?.code || ""])) };
  });

  return {
    functions: {
      adminSetUserAccess,
      redeemClusterInvite,
      redeemRegionAccessCode,
      completeRegionAccess,
      adminSaveAccessResource,
      adminGetAccessSecrets,
    },
    internal: { syncClaims },
  };
};

module.exports.testables = {
  normalizeCode,
  hashCode,
  timestampMillis,
  normalizeAccessMap,
  activeCourseIds,
  activeRegionIds,
  buildAccessClaims,
  applyAccessState,
};
