const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { FieldPath } = require("firebase-admin/firestore");
try { admin.initializeApp(); } catch (e) {}
const cors = require("cors")({ origin: true });
const fetch = require("node-fetch");

/**
 * fetchNotebook
 * 
 * Receives a Colab/Drive URL, extracts the file ID,
 * downloads the .ipynb JSON from Google Drive's public export,
 * parses the cells, and returns them for client-side rendering.
 * 
 * Usage: POST /fetchNotebook { url: "https://colab.research.google.com/drive/FILE_ID..." }
 * Returns: { cells: [ { cell_type, source, outputs }, ... ], metadata }
 */
exports.fetchNotebook = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      // Only allow POST
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      // Extract Google Drive File ID from various URL formats
      const fileId = extractFileId(url);
      if (!fileId) {
        return res.status(400).json({ error: "Could not extract file ID from URL" });
      }

      // Download .ipynb from Google Drive (public file)
      // Using the export download endpoint for publicly shared files
      const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      
      const response = await fetch(downloadUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
        redirect: "follow",
      });

      if (!response.ok) {
        // Try alternative endpoint
        const altUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${process.env.GOOGLE_API_KEY || ""}`;
        const altResponse = await fetch(altUrl);
        
        if (!altResponse.ok) {
          return res.status(404).json({ 
            error: "노트북을 가져올 수 없습니다. 파일이 '링크가 있는 모든 사용자에게 공개'로 공유되어 있는지 확인해주세요." 
          });
        }
        
        const notebook = await altResponse.json();
        return res.json(parseNotebook(notebook));
      }

      // Check if we got HTML instead of JSON (Google's download warning page)
      const contentType = response.headers.get("content-type") || "";
      const text = await response.text();
      
      // Google sometimes returns an HTML confirmation page for large files
      if (contentType.includes("text/html") || text.trim().startsWith("<!")) {
        // Try to extract the confirmation link
        const confirmMatch = text.match(/confirm=([0-9A-Za-z_]+)/);
        if (confirmMatch) {
          const confirmUrl = `https://drive.google.com/uc?export=download&confirm=${confirmMatch[1]}&id=${fileId}`;
          const confirmResponse = await fetch(confirmUrl, {
            headers: { "User-Agent": "Mozilla/5.0" },
            redirect: "follow",
          });
          const confirmText = await confirmResponse.text();
          try {
            const notebook = JSON.parse(confirmText);
            return res.json(parseNotebook(notebook));
          } catch {
            return res.status(422).json({ 
              error: "파일을 파싱할 수 없습니다. Colab 노트북(.ipynb) 파일인지 확인해주세요." 
            });
          }
        }
        return res.status(422).json({ 
          error: "노트북을 가져올 수 없습니다. 파일이 공개 공유되어 있는지 확인해주세요." 
        });
      }

      // Parse the notebook JSON
      try {
        const notebook = JSON.parse(text);
        return res.json(parseNotebook(notebook));
      } catch {
        return res.status(422).json({ 
          error: "파일을 파싱할 수 없습니다. Colab 노트북(.ipynb) 파일인지 확인해주세요." 
        });
      }

    } catch (error) {
      console.error("fetchNotebook error:", error);
      return res.status(500).json({ error: "서버 오류가 발생했습니다." });
    }
  });
});

/**
 * Extract Google Drive file ID from various URL formats:
 * - https://colab.research.google.com/drive/FILE_ID
 * - https://colab.research.google.com/drive/FILE_ID?usp=sharing
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/open?id=FILE_ID
 */
/**
 * Extract Google Drive file ID from various URL formats.
 * IDs are typically 33-44 characters of alphanumeric characters, underscores, and hyphens.
 */
function extractFileId(url) {
  // Common patterns for Google Drive and Colab IDs
  const idPattern = /[a-zA-Z0-9_-]{25,50}/;
  
  // 1. Colab/Drive direct file patterns
  const patterns = [
    /colab\.research\.google\.com\/drive\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/, // Just in case
    /drive\.google\.com\/uc\?id=([a-zA-Z0-9_-]+)/
  ];

  for (const regex of patterns) {
    const match = url.match(regex);
    if (match && match[1]) return match[1];
  }

  // 2. Fallback for raw IDs if they look like a Google ID (at least 25 chars)
  // This helps if the user pasted only the ID or some weird combined string
  const urlParams = new URLSearchParams(url.split('?')[1] || "");
  if (urlParams.has('id')) {
    const id = urlParams.get('id');
    if (idPattern.test(id)) return id;
  }

  // 3. Last resort: try to find anything that looks like an ID in the path
  const parts = url.split('/');
  for (const part of parts) {
    // Google IDs are long and distinct. Check for length and pattern.
    if (part.length >= 28 && idPattern.test(part)) {
      // Remove any query params attached to the part
      return part.split(/[?#]/)[0];
    }
  }

  return null;
}

/**
 * Parse .ipynb notebook JSON into a simplified format for frontend rendering.
 * Standard .ipynb format: { cells: [{ cell_type, source, outputs }], metadata }
 */
function parseNotebook(notebook) {
  const cells = (notebook.cells || []).map((cell, index) => {
    const parsed = {
      index,
      cell_type: cell.cell_type, // "markdown", "code", "raw"
      source: Array.isArray(cell.source) ? cell.source.join("") : (cell.source || ""),
    };

    // Parse outputs for code cells
    if (cell.cell_type === "code" && cell.outputs) {
      parsed.outputs = cell.outputs.map(output => {
        const result = { output_type: output.output_type };

        // Stream output (stdout/stderr)
        if (output.output_type === "stream") {
          result.text = Array.isArray(output.text) ? output.text.join("") : (output.text || "");
          result.name = output.name; // "stdout" or "stderr"
        }

        // execute_result or display_data
        if (output.output_type === "execute_result" || output.output_type === "display_data") {
          const data = output.data || {};
          
          // Text output
          if (data["text/plain"]) {
            result.text = Array.isArray(data["text/plain"]) ? data["text/plain"].join("") : data["text/plain"];
          }
          
          // HTML output
          if (data["text/html"]) {
            result.html = Array.isArray(data["text/html"]) ? data["text/html"].join("") : data["text/html"];
          }
          
          // Image output (base64)
          if (data["image/png"]) {
            result.image = `data:image/png;base64,${Array.isArray(data["image/png"]) ? data["image/png"].join("") : data["image/png"]}`;
          }
          if (data["image/jpeg"]) {
            result.image = `data:image/jpeg;base64,${Array.isArray(data["image/jpeg"]) ? data["image/jpeg"].join("") : data["image/jpeg"]}`;
          }
        }
        
        // Error output
        if (output.output_type === "error") {
          result.ename = output.ename;
          result.evalue = output.evalue;
          result.traceback = (output.traceback || []).join("\n");
        }

        return result;
      });
      
      parsed.execution_count = cell.execution_count;
    }

    return parsed;
  });

  return {
    cells,
    metadata: {
      kernelspec: notebook.metadata?.kernelspec?.display_name || "Python",
      language: notebook.metadata?.kernelspec?.language || "python",
      title: notebook.metadata?.colab?.name || "Untitled Notebook",
    },
  };
}

/**
 * syncVideoProgress
 * 
 * HTTP endpoint for navigator.sendBeacon to securely save video progress 
 * when the user closes the tab or navigates away.
 */
exports.syncVideoProgress = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
      
      let data = req.body;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch (e) {}
      }

      const { idToken, userId, unitId, txId, progressData } = data;
      if (!idToken || !userId || !unitId || !txId || !progressData) {
        return res.status(400).send("Missing required fields");
      }

      // Verify token
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      if (decodedToken.uid !== userId) {
        return res.status(403).send("Unauthorized");
      }

      // We use server Timestamp for updatedAt but the client might pass their own.
      const updateData = {};
      
      // Prevent destroying existing fields like 'completed' when sending beacon
      if (progressData && typeof progressData === 'object') {
        for (const [key, val] of Object.entries(progressData)) {
          updateData[`videoProgress.${txId}.${key}`] = val;
        }
      }
      
      updateData[`videoProgress.${txId}.updatedAt`] = new Date();

      const progressRef = admin.firestore()
        .collection('users')
        .doc(userId)
        .collection('learning_progress')
        .doc(unitId);

      await progressRef.set(updateData, { merge: true });

      return res.status(200).send("OK");
    } catch (error) {
      console.error("syncVideoProgress error:", error);
      return res.status(500).send("Internal Server Error");
    }
  });
});

/**
 * adminResetUserPassword
 * 
 * Callable function to let Admis resetting any user's password securely.
 */
exports.adminResetUserPassword = functions.https.onCall(async (data, context) => {
  // 1. Ensure authenticated
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "이 작업을 수행하려면 로그인해야 합니다."
    );
  }

  // 2. Ensure caller is an admin
  const adminDoc = await admin.firestore().collection("users").doc(context.auth.uid).get();
  if (!adminDoc.exists || adminDoc.data().role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "관리자 권한이 없습니다."
    );
  }

  // 3. Validate input
  const { targetUid, newPassword } = data;
  if (!targetUid || typeof targetUid !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "대상의 UID가 올바르지 않습니다.");
  }
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
    throw new functions.https.HttpsError("invalid-argument", "비밀번호는 6자 이상이어야 합니다.");
  }

  // 4. Update the user's password
  try {
    await admin.auth().updateUser(targetUid, {
      password: newPassword,
    });
    return { success: true };
  } catch (error) {
    console.error("adminResetUserPassword error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

function buildCrewSnapshot(crewId, crewData, memberSummaries = [], greetings = []) {
  return {
    id: crewId,
    name: crewData.name || '',
    motto: crewData.motto || '',
    color: crewData.color || '#00d4ff',
    groupId: crewData.groupId || 'none',
    groupName: crewData.groupName || '자유 스터디',
    clusterId: crewData.clusterId || '',
    clusterName: crewData.clusterName || '',
    status: crewData.status || 'pending',
    rejectionReason: crewData.rejectionReason || '',
    inviteCode: crewData.inviteCode || '',
    leaderId: crewData.leaderId || '',
    leaderName: crewData.leaderName || '',
    activeStudyRoomId: crewData.activeStudyRoomId || '',
    activeStudyRoomStatus: crewData.activeStudyRoomStatus || '',
    studyRoomCapacity: crewData.studyRoomCapacity || 3,
    memberCount: crewData.memberCount || memberSummaries.length || 0,
    memberIds: crewData.memberIds || memberSummaries.map((m) => m.uid),
    members: memberSummaries,
    recentGreetings: greetings,
    updatedAt: new Date().toISOString(),
  };
}

async function requireAuthUid(context) {
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError("unauthenticated", "이 작업을 수행하려면 로그인해야 합니다.");
  }
  return context.auth.uid;
}

async function requireAdminUid(context) {
  const uid = await requireAuthUid(context);
  const adminDoc = await admin.firestore().collection("users").doc(uid).get();
  if (!adminDoc.exists || adminDoc.data().role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "관리자 권한이 없습니다.");
  }
  return uid;
}

async function loadMemberSummaries(memberIds = []) {
  if (!memberIds.length) return [];
  const docs = await admin.firestore().collection("users").where(FieldPath.documentId(), "in", memberIds.slice(0, 30)).get();
  return docs.docs.map((snap) => {
    const data = snap.data() || {};
    return {
      uid: snap.id,
      studentName: data.studentName || data.publicDisplayName || data.name || "",
      publicDisplayName: data.publicDisplayName || "",
      currentStreak: data.currentStreak || 0,
      lastStreakDate: data.lastStreakDate || "",
      crewRole: data.crewRole || "",
    };
  });
}

function getDisplayNameFromUser(userData = {}) {
  return userData.studentName || userData.publicDisplayName || userData.name || "탐사원";
}

async function syncCrewToMembers(crewId, crewData, greetings = []) {
  const memberIds = crewData.memberIds || [];
  const memberSummaries = await loadMemberSummaries(memberIds);
  const crewSnapshot = buildCrewSnapshot(crewId, crewData, memberSummaries, greetings);
  const isRejected = crewData.status === "rejected";
  const leaderId = crewData.leaderId || "";

  const batch = admin.firestore().batch();
  memberIds.forEach((uid) => {
    const isLeader = uid === leaderId;
    // On rejection: leader keeps snapshot (to see reason & resubmit), others get cleared
    const keepSnapshot = isRejected && isLeader;
    batch.set(admin.firestore().collection("users").doc(uid), {
      crewId: isRejected ? "" : crewId,
      crewName: isRejected ? "" : (crewData.name || ""),
      crewRole: isRejected ? "" : (isLeader ? "leader" : "member"),
      crewColor: isRejected ? "#00d4ff" : (crewData.color || "#00d4ff"),
      crewStatus: crewData.status || "pending",
      crewGroupName: isRejected ? "" : (crewData.groupName || "자유 스터디"),
      crewInviteCode: isRejected ? "" : (crewData.inviteCode || ""),
      crewActiveStudyRoomId: isRejected ? "" : (crewData.activeStudyRoomId || ""),
      crewActiveStudyRoomStatus: isRejected ? "" : (crewData.activeStudyRoomStatus || ""),
      crewSnapshot: keepSnapshot ? crewSnapshot : (isRejected ? null : crewSnapshot),
      // Store rejected crew id on leader so they can resubmit
      ...(keepSnapshot ? { rejectedCrewId: crewId } : {}),
      ...(!isRejected && isLeader ? { rejectedCrewId: "" } : {}),
    }, { merge: true });
  });
  await batch.commit();
}

exports.createStudyCrew = functions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const {
    name = "",
    motto = "",
    color = "#00d4ff",
    groupId = "none",
    groupName = "자유 스터디",
    clusterId = "",
    clusterName = "",
  } = data || {};

  const cleanName = String(name).trim().slice(0, 28);
  const cleanMotto = String(motto).trim().slice(0, 52);
  if (!cleanName) {
    throw new functions.https.HttpsError("invalid-argument", "크루 이름을 입력해주세요.");
  }

  const db = admin.firestore();
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    throw new functions.https.HttpsError("failed-precondition", "사용자 문서를 찾을 수 없습니다.");
  }
  if (userSnap.data().crewId) {
    throw new functions.https.HttpsError("failed-precondition", "이미 다른 크루에 속해 있습니다.");
  }

  const crewRef = db.collection("crews").doc();
  const inviteCode = Array.from(`${uid}-${cleanName}-${crewRef.id}`).reduce((acc, ch, idx) => acc + ((ch.charCodeAt(0) * (idx + 7)) % 36).toString(36), "").toUpperCase().slice(0, 6).padEnd(6, "A");
  const createdAt = new Date();
  const crewData = {
    name: cleanName,
    motto: cleanMotto,
    color,
    groupId,
    groupName,
    clusterId,
    clusterName,
    status: "pending",
    leaderId: uid,
    leaderName: userSnap.data().studentName || userSnap.data().publicDisplayName || userSnap.data().name || "탐사원",
    inviteCode,
    activeStudyRoomId: "",
    activeStudyRoomStatus: "",
    studyRoomCapacity: 3,
    memberIds: [uid],
    memberCount: 1,
    createdAt,
    updatedAt: createdAt,
  };

  await db.runTransaction(async (tx) => {
    const freshUserSnap = await tx.get(userRef);
    if (!freshUserSnap.exists) {
      throw new functions.https.HttpsError("failed-precondition", "사용자 문서를 찾을 수 없습니다.");
    }

    const freshUser = freshUserSnap.data() || {};
    if (freshUser.crewId) {
      throw new functions.https.HttpsError("failed-precondition", "이미 다른 크루에 속해 있습니다.");
    }
    if ((freshUser.crewCreationPasses || 0) < 1) {
      throw new functions.https.HttpsError("failed-precondition", "스터디 크루 창설권이 필요합니다. 스토어에서 1000광석으로 구매해주세요.");
    }

    // Note: pass is NOT consumed here. It is consumed when admin approves the crew.
    tx.set(crewRef, crewData);
  });

  await syncCrewToMembers(crewRef.id, {
    ...crewData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return { success: true, crewId: crewRef.id, inviteCode };
});

exports.joinStudyCrew = functions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const inviteCode = String(data?.inviteCode || "").trim().toUpperCase();
  if (!inviteCode) {
    throw new functions.https.HttpsError("invalid-argument", "초대 코드를 입력해주세요.");
  }

  const db = admin.firestore();
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    throw new functions.https.HttpsError("failed-precondition", "사용자 문서를 찾을 수 없습니다.");
  }
  if (userSnap.data().crewId) {
    throw new functions.https.HttpsError("failed-precondition", "이미 다른 크루에 속해 있습니다.");
  }

  const crewQuery = await db.collection("crews").where("inviteCode", "==", inviteCode).limit(1).get();
  if (crewQuery.empty) {
    throw new functions.https.HttpsError("not-found", "해당 초대 코드를 가진 크루를 찾지 못했습니다.");
  }

  const crewSnap = crewQuery.docs[0];
  const txResult = await db.runTransaction(async (tx) => {
    const [freshUserSnap, freshCrewSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(crewSnap.ref),
    ]);
    if (!freshUserSnap.exists) {
      throw new functions.https.HttpsError("failed-precondition", "사용자 문서를 찾을 수 없습니다.");
    }
    if (!freshCrewSnap.exists) {
      throw new functions.https.HttpsError("not-found", "해당 초대 코드를 가진 크루를 찾지 못했습니다.");
    }

    const freshUser = freshUserSnap.data() || {};
    const crewData = freshCrewSnap.data() || {};
    if (freshUser.crewId) {
      throw new functions.https.HttpsError("failed-precondition", "이미 다른 크루에 속해 있습니다.");
    }
    if ((freshUser.crewJoinPasses || 0) < 1) {
      throw new functions.https.HttpsError("failed-precondition", "스터디 크루 참여권이 필요합니다. 스토어에서 300광석으로 구매해주세요.");
    }
    if (crewData.status === "rejected") {
      throw new functions.https.HttpsError("failed-precondition", "참여할 수 없는 크루입니다.");
    }

    const nextMemberIds = Array.from(new Set([...(crewData.memberIds || []), uid]));
    const updatedCrew = {
      ...crewData,
      memberIds: nextMemberIds,
      memberCount: nextMemberIds.length,
      updatedAt: new Date(),
    };

    tx.set(freshCrewSnap.ref, {
      memberIds: nextMemberIds,
      memberCount: nextMemberIds.length,
      updatedAt: updatedCrew.updatedAt,
    }, { merge: true });
    tx.set(userRef, {
      crewJoinPasses: admin.firestore.FieldValue.increment(-1),
    }, { merge: true });

    return updatedCrew;
  });

  await syncCrewToMembers(crewSnap.id, {
    ...txResult,
    updatedAt: new Date().toISOString(),
  });

  return { success: true, crewId: crewSnap.id, inviteCode };
});

exports.updateStudyCrew = functions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const crewId = String(data?.crewId || "").trim();
  if (!crewId) throw new functions.https.HttpsError("invalid-argument", "크루 ID가 없습니다.");

  const db = admin.firestore();
  const crewRef = db.collection("crews").doc(crewId);
  const crewSnap = await crewRef.get();
  if (!crewSnap.exists) throw new functions.https.HttpsError("not-found", "크루를 찾을 수 없습니다.");

  const crewData = crewSnap.data() || {};
  if (crewData.leaderId !== uid) {
    const adminDoc = await db.collection("users").doc(uid).get();
    if (!adminDoc.exists || adminDoc.data().role !== "admin") {
      throw new functions.https.HttpsError("permission-denied", "크루 리더만 수정할 수 있습니다.");
    }
  }

  const nextName = String(data?.name || crewData.name || "").trim().slice(0, 28);
  const nextMotto = String(data?.motto || crewData.motto || "").trim().slice(0, 52);
  const nextColor = String(data?.color || crewData.color || "#00d4ff");
  const nextGroupId = String(data?.groupId || crewData.groupId || "none");
  const nextGroupName = String(data?.groupName || crewData.groupName || "자유 스터디");
  const nextClusterId = String(data?.clusterId || crewData.clusterId || "");
  const nextClusterName = String(data?.clusterName || crewData.clusterName || "");

  const updatedCrew = {
    ...crewData,
    name: nextName,
    motto: nextMotto,
    color: nextColor,
    groupId: nextGroupId,
    groupName: nextGroupName,
    clusterId: nextClusterId,
    clusterName: nextClusterName,
    updatedAt: new Date(),
  };

  await crewRef.set(updatedCrew, { merge: true });
  await syncCrewToMembers(crewId, {
    ...crewData,
    ...updatedCrew,
    updatedAt: new Date().toISOString(),
  });

  return { success: true };
});

exports.reviewStudyCrew = functions.https.onCall(async (data, context) => {
  await requireAdminUid(context);
  const crewId = String(data?.crewId || "").trim();
  const action = String(data?.action || "").trim();
  const rejectionReason = String(data?.rejectionReason || "").trim().slice(0, 200);
  if (!crewId) throw new functions.https.HttpsError("invalid-argument", "크루 ID가 없습니다.");
  if (!["approve", "reject"].includes(action)) {
    throw new functions.https.HttpsError("invalid-argument", "처리 동작이 올바르지 않습니다.");
  }

  const db = admin.firestore();
  const crewRef = db.collection("crews").doc(crewId);
  const crewSnap = await crewRef.get();
  if (!crewSnap.exists) throw new functions.https.HttpsError("not-found", "크루를 찾을 수 없습니다.");

  const crewData = crewSnap.data() || {};
  if (action === "approve") {
    // Consume creation pass from leader on approval
    const leaderId = crewData.leaderId;
    if (leaderId) {
      const leaderRef = db.collection("users").doc(leaderId);
      const leaderSnap = await leaderRef.get();
      if (leaderSnap.exists && (leaderSnap.data()?.crewCreationPasses || 0) >= 1) {
        await leaderRef.set({
          crewCreationPasses: admin.firestore.FieldValue.increment(-1),
          rejectedCrewId: "",
        }, { merge: true });
      }
    }

    const updatedCrew = {
      ...crewData,
      status: "approved",
      rejectionReason: "",
      activeStudyRoomId: crewData.activeStudyRoomId || "",
      activeStudyRoomStatus: crewData.activeStudyRoomStatus || "",
      studyRoomCapacity: crewData.studyRoomCapacity || 3,
      approvedAt: new Date(),
      updatedAt: new Date(),
    };
    await crewRef.set(updatedCrew, { merge: true });
    await syncCrewToMembers(crewId, {
      ...crewData,
      status: "approved",
      rejectionReason: "",
      activeStudyRoomId: crewData.activeStudyRoomId || "",
      activeStudyRoomStatus: crewData.activeStudyRoomStatus || "",
      studyRoomCapacity: crewData.studyRoomCapacity || 3,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  }

  // Reject with reason
  if (!rejectionReason) {
    throw new functions.https.HttpsError("invalid-argument", "반려 사유를 입력해주세요.");
  }

  const updatedCrew = {
    ...crewData,
    status: "rejected",
    rejectionReason,
    activeStudyRoomId: "",
    activeStudyRoomStatus: "",
    rejectedAt: new Date(),
    updatedAt: new Date(),
  };
  await crewRef.set(updatedCrew, { merge: true });
  await syncCrewToMembers(crewId, {
    ...crewData,
    status: "rejected",
    rejectionReason,
    activeStudyRoomId: "",
    activeStudyRoomStatus: "",
    rejectedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return { success: true };
});

exports.resubmitStudyCrew = functions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const crewId = String(data?.crewId || "").trim();
  if (!crewId) throw new functions.https.HttpsError("invalid-argument", "크루 ID가 없습니다.");

  const {
    name = "",
    motto = "",
    color = "#00d4ff",
    groupId = "none",
    groupName = "자유 스터디",
    clusterId = "",
    clusterName = "",
  } = data || {};

  const cleanName = String(name).trim().slice(0, 28);
  const cleanMotto = String(motto).trim().slice(0, 52);
  if (!cleanName) {
    throw new functions.https.HttpsError("invalid-argument", "크루 이름을 입력해주세요.");
  }

  const db = admin.firestore();
  const crewRef = db.collection("crews").doc(crewId);
  const crewSnap = await crewRef.get();
  if (!crewSnap.exists) throw new functions.https.HttpsError("not-found", "크루를 찾을 수 없습니다.");

  const crewData = crewSnap.data() || {};
  if (crewData.leaderId !== uid) {
    throw new functions.https.HttpsError("permission-denied", "크루 리더만 재신청할 수 있습니다.");
  }
  if (crewData.status !== "rejected") {
    throw new functions.https.HttpsError("failed-precondition", "반려된 크루만 재신청할 수 있습니다.");
  }

  // Verify leader still has a creation pass
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    throw new functions.https.HttpsError("failed-precondition", "사용자 문서를 찾을 수 없습니다.");
  }
  if ((userSnap.data()?.crewCreationPasses || 0) < 1) {
    throw new functions.https.HttpsError("failed-precondition", "스터디 크루 창설권이 필요합니다.");
  }
  if (userSnap.data()?.crewId) {
    throw new functions.https.HttpsError("failed-precondition", "이미 다른 크루에 속해 있습니다.");
  }

  const updatedCrew = {
    ...crewData,
    name: cleanName,
    motto: cleanMotto,
    color,
    groupId,
    groupName,
    clusterId,
    clusterName,
    status: "pending",
    rejectionReason: "",
    memberIds: [uid],
    memberCount: 1,
    resubmittedAt: new Date(),
    updatedAt: new Date(),
  };

  await crewRef.set(updatedCrew, { merge: true });

  // Re-associate leader with this crew
  await syncCrewToMembers(crewId, {
    ...updatedCrew,
    resubmittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return { success: true, crewId };
});

exports.postStudyCrewGreeting = functions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const crewId = String(data?.crewId || "").trim();
  const text = String(data?.text || "").trim().slice(0, 80);
  if (!crewId || !text) {
    throw new functions.https.HttpsError("invalid-argument", "인사말 내용이 올바르지 않습니다.");
  }

  const db = admin.firestore();
  const crewRef = db.collection("crews").doc(crewId);
  const crewSnap = await crewRef.get();
  if (!crewSnap.exists) throw new functions.https.HttpsError("not-found", "크루를 찾을 수 없습니다.");

  const crewData = crewSnap.data() || {};
  const memberIds = crewData.memberIds || [];
  if (!memberIds.includes(uid) && crewData.leaderId !== uid) {
    const adminDoc = await db.collection("users").doc(uid).get();
    if (!adminDoc.exists || adminDoc.data().role !== "admin") {
      throw new functions.https.HttpsError("permission-denied", "크루 멤버만 인사말을 남길 수 있습니다.");
    }
  }

  const greetingRef = crewRef.collection("greetings").doc();
  const greeting = {
    crewId,
    userId: uid,
    userName: context.auth.token?.name || context.auth.token?.email || "탐사원",
    text,
    createdAt: new Date(),
  };
  await greetingRef.set(greeting);

  const recentSnap = await crewRef.collection("greetings").orderBy("createdAt", "desc").limit(10).get();
  const recentGreetings = recentSnap.docs.map((snap) => ({ id: snap.id, ...snap.data() }));
  await syncCrewToMembers(crewId, {
    ...crewData,
    updatedAt: new Date().toISOString(),
  }, recentGreetings);

  return { success: true };
});

exports.listStudyCrews = functions.https.onCall(async (_data, context) => {
  await requireAdminUid(context);
  const snap = await admin.firestore().collection("crews").orderBy("createdAt", "desc").get();
  return {
    crews: snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
  };
});

exports.createStudyRoom = functions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const crewId = String(data?.crewId || "").trim();
  const durationMinutes = Number(data?.durationMinutes || 50);
  if (!crewId) {
    throw new functions.https.HttpsError("invalid-argument", "크루 ID가 없습니다.");
  }
  if (![30, 50, 90].includes(durationMinutes)) {
    throw new functions.https.HttpsError("invalid-argument", "세션 시간은 30분, 50분, 90분만 가능합니다.");
  }

  const db = admin.firestore();
  const userRef = db.collection("users").doc(uid);
  const crewRef = db.collection("crews").doc(crewId);
  const roomRef = db.collection("studyRooms").doc();

  const result = await db.runTransaction(async (tx) => {
    const [userSnap, crewSnap] = await Promise.all([tx.get(userRef), tx.get(crewRef)]);
    if (!userSnap.exists) {
      throw new functions.https.HttpsError("failed-precondition", "사용자 문서를 찾을 수 없습니다.");
    }
    if (!crewSnap.exists) {
      throw new functions.https.HttpsError("not-found", "크루를 찾을 수 없습니다.");
    }

    const userData = userSnap.data() || {};
    const crewData = crewSnap.data() || {};
    if (userData.crewId !== crewId) {
      throw new functions.https.HttpsError("permission-denied", "같은 크루 멤버만 집중방을 생성할 수 있습니다.");
    }
    if (userData.crewRole !== "leader" && userData.role !== "admin") {
      throw new functions.https.HttpsError("permission-denied", "크루 리더만 집중방을 열 수 있습니다.");
    }
    if ((crewData.status || "pending") !== "approved") {
      throw new functions.https.HttpsError("failed-precondition", "승인된 크루만 Study Stream을 열 수 있습니다.");
    }

    if (crewData.activeStudyRoomId) {
      const activeRoomSnap = await tx.get(db.collection("studyRooms").doc(crewData.activeStudyRoomId));
      if (activeRoomSnap.exists && (activeRoomSnap.data()?.status || "waiting") !== "ended") {
        throw new functions.https.HttpsError("failed-precondition", "이미 진행 중인 집중방이 있습니다.");
      }
    }

    const now = new Date();
    const displayName = getDisplayNameFromUser(userData);
    const roomData = {
      crewId,
      crewName: crewData.name || "스터디 크루",
      crewColor: crewData.color || "#00d4ff",
      title: `${crewData.name || "스터디 크루"} 집중방`,
      hostUid: uid,
      hostName: displayName,
      status: "waiting",
      mode: "focus",
      maxParticipants: 3,
      durationMinutes,
      participantIds: [uid],
      participantCount: 1,
      peerServerMode: "peerjs-public",
      createdAt: now,
      startedAt: null,
      endedAt: null,
      lastActivityAt: now,
    };

    tx.set(roomRef, roomData);
    tx.set(roomRef.collection("participants").doc(uid), {
      uid,
      displayName,
      role: "host",
      peerId: "",
      cameraOn: false,
      micOn: false,
      focusStatus: "focused",
      joinedAt: now,
      lastSeenAt: now,
      deviceLabel: "browser",
    });
    tx.set(crewRef, {
      activeStudyRoomId: roomRef.id,
      activeStudyRoomStatus: "waiting",
      studyRoomCapacity: 3,
      updatedAt: now,
    }, { merge: true });

    return { roomId: roomRef.id };
  });

  const crewSnap = await crewRef.get();
  await syncCrewToMembers(crewId, {
    ...(crewSnap.data() || {}),
    updatedAt: new Date().toISOString(),
  });

  return { success: true, roomId: result.roomId };
});

exports.joinStudyRoomSession = functions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const roomId = String(data?.roomId || "").trim();
  if (!roomId) {
    throw new functions.https.HttpsError("invalid-argument", "방 ID가 없습니다.");
  }

  const db = admin.firestore();
  const userRef = db.collection("users").doc(uid);
  const roomRef = db.collection("studyRooms").doc(roomId);

  const result = await db.runTransaction(async (tx) => {
    const [userSnap, roomSnap] = await Promise.all([tx.get(userRef), tx.get(roomRef)]);
    if (!userSnap.exists) {
      throw new functions.https.HttpsError("failed-precondition", "사용자 문서를 찾을 수 없습니다.");
    }
    if (!roomSnap.exists) {
      throw new functions.https.HttpsError("not-found", "집중방을 찾을 수 없습니다.");
    }

    const userData = userSnap.data() || {};
    const roomData = roomSnap.data() || {};
    if ((roomData.status || "waiting") === "ended") {
      throw new functions.https.HttpsError("failed-precondition", "이미 종료된 집중방입니다.");
    }
    if (userData.crewId !== roomData.crewId) {
      throw new functions.https.HttpsError("permission-denied", "같은 크루 멤버만 입장할 수 있습니다.");
    }

    const participantIds = Array.isArray(roomData.participantIds) ? roomData.participantIds : [];
    if (!participantIds.includes(uid) && participantIds.length >= 3) {
      throw new functions.https.HttpsError("failed-precondition", "이 집중방은 이미 가득 찼습니다.");
    }

    const nextParticipantIds = participantIds.includes(uid) ? participantIds : [...participantIds, uid];
    const nextCount = nextParticipantIds.length;
    const nextStatus = nextCount >= 2 ? "live" : "waiting";
    const now = new Date();
    const participantRole = roomData.hostUid === uid ? "host" : "member";

    tx.set(roomRef, {
      participantIds: nextParticipantIds,
      participantCount: nextCount,
      status: nextStatus,
      startedAt: roomData.startedAt || (nextStatus === "live" ? now : null),
      lastActivityAt: now,
    }, { merge: true });
    tx.set(roomRef.collection("participants").doc(uid), {
      uid,
      displayName: getDisplayNameFromUser(userData),
      role: participantRole,
      peerId: "",
      cameraOn: false,
      micOn: false,
      focusStatus: "focused",
      joinedAt: now,
      lastSeenAt: now,
      deviceLabel: "browser",
    }, { merge: true });
    tx.set(db.collection("crews").doc(roomData.crewId), {
      activeStudyRoomId: roomId,
      activeStudyRoomStatus: nextStatus,
      updatedAt: now,
    }, { merge: true });

    return { crewId: roomData.crewId };
  });

  const crewSnap = await db.collection("crews").doc(result.crewId).get();
  await syncCrewToMembers(result.crewId, {
    ...(crewSnap.data() || {}),
    updatedAt: new Date().toISOString(),
  });

  return { success: true, roomId };
});

exports.leaveStudyRoomSession = functions.https.onCall(async (data, context) => {
  const uid = await requireAuthUid(context);
  const roomId = String(data?.roomId || "").trim();
  if (!roomId) {
    throw new functions.https.HttpsError("invalid-argument", "방 ID가 없습니다.");
  }

  const db = admin.firestore();
  const roomRef = db.collection("studyRooms").doc(roomId);

  const result = await db.runTransaction(async (tx) => {
    const roomSnap = await tx.get(roomRef);
    if (!roomSnap.exists) {
      return { crewId: "" };
    }

    const roomData = roomSnap.data() || {};
    const participantIds = Array.isArray(roomData.participantIds) ? roomData.participantIds : [];
    if (!participantIds.includes(uid)) {
      return { crewId: roomData.crewId || "" };
    }

    const nextParticipantIds = participantIds.filter((participantUid) => participantUid !== uid);
    const now = new Date();
    const crewRef = db.collection("crews").doc(roomData.crewId);
    tx.delete(roomRef.collection("participants").doc(uid));

    if (nextParticipantIds.length === 0) {
      tx.set(roomRef, {
        participantIds: [],
        participantCount: 0,
        status: "ended",
        endedAt: now,
        lastActivityAt: now,
      }, { merge: true });
      if (roomData.crewId) {
        tx.set(crewRef, {
          activeStudyRoomId: "",
          activeStudyRoomStatus: "",
          updatedAt: now,
        }, { merge: true });
      }
      return { crewId: roomData.crewId || "" };
    }

    let nextHostUid = roomData.hostUid;
    let nextHostName = roomData.hostName || "";
    if (roomData.hostUid === uid) {
      nextHostUid = nextParticipantIds[0];
      const nextHostSnap = await tx.get(db.collection("users").doc(nextHostUid));
      nextHostName = nextHostSnap.exists ? getDisplayNameFromUser(nextHostSnap.data()) : "탐사원";
      tx.set(roomRef.collection("participants").doc(nextHostUid), {
        role: "host",
      }, { merge: true });
    }

    const nextStatus = nextParticipantIds.length >= 2 ? "live" : "waiting";
    tx.set(roomRef, {
      participantIds: nextParticipantIds,
      participantCount: nextParticipantIds.length,
      hostUid: nextHostUid,
      hostName: nextHostName,
      status: nextStatus,
      lastActivityAt: now,
    }, { merge: true });
    if (roomData.crewId) {
      tx.set(crewRef, {
        activeStudyRoomId: roomId,
        activeStudyRoomStatus: nextStatus,
        updatedAt: now,
      }, { merge: true });
    }
    return { crewId: roomData.crewId || "" };
  });

  if (result.crewId) {
    const crewSnap = await db.collection("crews").doc(result.crewId).get();
    await syncCrewToMembers(result.crewId, {
      ...(crewSnap.data() || {}),
      updatedAt: new Date().toISOString(),
    });
  }

  return { success: true };
});
