const functions = require("firebase-functions");
const admin = require("firebase-admin");
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
      
      updateData[`videoProgress.${txId}.updatedAt`] = admin.firestore.FieldValue.serverTimestamp();

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

