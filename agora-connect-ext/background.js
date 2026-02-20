// ============================================================
// Agora Connect - Background Service Worker v4.0 (Login Handler)
// ============================================================
// 핵심 변경: 로그인 플로우를 background에서 처리합니다.
// 팝업은 Google 계정 선택 창이 뜨면 닫히므로, 
// background에서 OAuth + signInWithCredential을 처리해야 합니다.
// ============================================================

import './xhr-polyfill.js';

import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithCredential,
  onAuthStateChanged,
  signOut
} from "firebase/auth/web-extension";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs,
  onSnapshot
} from "firebase/firestore";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";

// --- Firebase 설정 ---
const firebaseConfig = {
  apiKey: "AIzaSyAn1TdeM6XArdnf82bOk1BTQMIfkh7kXvQ",
  authDomain: "math-sense-1f6a8.firebaseapp.com",
  projectId: "math-sense-1f6a8",
  storageBucket: "math-sense-1f6a8.firebasestorage.app",
  messagingSenderId: "1075562222654",
  appId: "1:1075562222654:web:b53956e3355764993ced6f",
  measurementId: "G-SGWRBZ7X2E"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const GOOGLE_WEB_CLIENT_ID = "1075562222654-c7a2853oroa1ngv0s50uhjjonc6sg4cb.apps.googleusercontent.com";

let unsubscribeAnswers = null;

// ============================================================
// Auth 상태 모니터링
// ============================================================
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("🔥 [BG] Auth: LOGGED_IN", user.displayName);
    const userData = { uid: user.uid, displayName: user.displayName, email: user.email };
    chrome.storage.local.set({ agoraUser: userData });
    startWatchingAnswers(user.uid);
  } else {
    console.log("🔥 [BG] Auth: LOGGED_OUT");
    if (unsubscribeAnswers) { 
      unsubscribeAnswers(); 
      unsubscribeAnswers = null; 
    }
  }
});

// ============================================================
// 메시지 핸들러
// ============================================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // --- 화면 캡처 ---
  if (request.action === "CAPTURE_VISIBLE_TAB") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) sendResponse({ error: chrome.runtime.lastError.message });
      else sendResponse({ dataUrl });
    });
    return true;
  }

  // --- 질문 제출 ---
  if (request.action === "SUBMIT_QUESTION") {
    handleSubmission(request.payload)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // ============================================================
  // ★★★ 로그인 (핵심!) - popup 대신 background에서 OAuth 수행 ★★★
  // ============================================================
  if (request.action === "LOGIN") {
    handleLogin()
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;  // 비동기 응답
  }

  // --- 로그아웃 ---
  if (request.action === "LOGOUT") {
    if (unsubscribeAnswers) { unsubscribeAnswers(); unsubscribeAnswers = null; }
    chrome.action.setBadgeText({ text: "" });
    chrome.storage.local.remove(['unreadAnswers', 'agoraUser', 'unreadCount']);
    signOut(auth).catch(() => {});
    sendResponse({ success: true });
    return true;
  }

  // --- 이전 버전 호환: SYNC_AUTH ---
  if (request.action === "SYNC_AUTH") {
    const { accessToken } = request;
    const credential = GoogleAuthProvider.credential(null, accessToken);
    signInWithCredential(auth, credential)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

// ============================================================
// ★ 로그인 처리 (Background에서 실행) ★
// ============================================================
async function handleLogin() {
  console.log("🔑 [BG] Starting login flow...");
  
  const redirectURL = chrome.identity.getRedirectURL();
  console.log("🔑 [BG] Redirect URL:", redirectURL);
  
  const authURL = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authURL.searchParams.set('client_id', GOOGLE_WEB_CLIENT_ID);
  authURL.searchParams.set('response_type', 'token');
  authURL.searchParams.set('redirect_uri', redirectURL);
  authURL.searchParams.set('scope', 'openid email profile');
  authURL.searchParams.set('prompt', 'select_account');

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authURL.toString(), interactive: true },
      async (responseUrl) => {
        if (chrome.runtime.lastError) {
          console.error("❌ [BG] Auth flow error:", chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        if (!responseUrl) {
          reject(new Error("No response URL"));
          return;
        }

        const url = new URL(responseUrl);
        const hashParams = new URLSearchParams(url.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        
        if (!accessToken) {
          reject(new Error("No access token"));
          return;
        }

        try {
          const credential = GoogleAuthProvider.credential(null, accessToken);
          const result = await signInWithCredential(auth, credential);
          const user = result.user;
          
          console.log("✅ [BG] Login successful:", user.displayName);
          
          // 유저 정보 저장
          const userData = { uid: user.uid, displayName: user.displayName, email: user.email };
          await chrome.storage.local.set({ agoraUser: userData });
          
          // 답변 감시 시작
          startWatchingAnswers(user.uid);
          
          resolve({ success: true, user: userData });
        } catch (err) {
          console.error("❌ [BG] signInWithCredential failed:", err);
          reject(err);
        }
      }
    );
  });
}

// ============================================================
// 답변 감시 (Sync & Mirroring)
// ============================================================
function startWatchingAnswers(uid) {
  if (unsubscribeAnswers) { unsubscribeAnswers(); unsubscribeAnswers = null; }

  const q = query(collection(db, 'questions'), where('userId', '==', uid));
  
  getDocs(q).then(snapshot => updateStorageAndBadge(snapshot));

  unsubscribeAnswers = onSnapshot(q, (snapshot) => {
    updateStorageAndBadge(snapshot);
  });
}

async function updateStorageAndBadge(snapshot) {
  const stored = await chrome.storage.local.get(['agoraLastChecked']);
  const lastChecked = stored.agoraLastChecked || 0;

  let totalUnread = 0;
  const answerList = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    const count = data.answerCount || (data.status === 'answered' ? 1 : 0);
    if (count === 0) return;

    const updatedAt = data.updatedAt?.toMillis?.() || 0;
    const isNew = updatedAt > lastChecked;
    
    if (isNew) totalUnread += count;

    answerList.push({
      id: doc.id,
      content: data.content || "(내용 없음)",
      answerCount: count,
      isNew: isNew,
      updatedAt: updatedAt
    });
  });

  answerList.sort((a, b) => b.updatedAt - a.updatedAt);
  
  chrome.action.setBadgeText({ text: totalUnread > 0 ? String(totalUnread) : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#EF4444" });

  await chrome.storage.local.set({ 
    unreadAnswers: answerList,
    unreadCount: totalUnread
  });
}

// ============================================================
// 질문 제출
// ============================================================
async function handleSubmission(payload) {
  const user = auth.currentUser;
  if (!user) return { success: false, error: "로그인이 필요합니다." };

  const userId = user.uid;
  const storagePath = `agora-connect/${userId}/${Date.now()}.png`;
  const storageRef = ref(storage, storagePath);
  
  await uploadString(storageRef, payload.image, 'data_url');
  const downloadURL = await getDownloadURL(storageRef);

  await addDoc(collection(db, 'questions'), {
    userId: userId,
    userName: user.displayName || "확장 프로그램 사용자",
    content: payload.text,
    type: 'concept',
    category: 'general',
    isPublic: true,
    status: 'open',
    upvotes: 0,
    upvotedBy: [],
    answerCount: 0,
    drawingUrl: downloadURL,
    quizId: null,
    quizContext: { chapterId: '', unitId: '', questionId: '', wrongAnswer: null, quizTitle: '' },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    source: 'agora-connect',
    sourceUrl: payload.url || '',
    sourceTitle: payload.title || ''
  });

  return { success: true };
}

// ============================================================
// 시스템 이벤트
// ============================================================
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "agora-capture", title: "📸 아고라에 질문하기 (화면 캡처)", contexts: ["all"] });
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
        chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] }).catch(() => {});
      }
    }
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "agora-capture") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      if (dataUrl) chrome.tabs.sendMessage(tab.id, { action: "INIT_OVERLAY", dataUrl: dataUrl });
    });
  }
});
