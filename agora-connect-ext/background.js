// ============================================================
// Agora Connect - Background Service Worker (Manifest V3)
// ============================================================

import './xhr-polyfill.js';

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithCredential } from "firebase/auth";
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

let unsubscribeAnswers = null;

// ============================================================
// Auth 복원
// ============================================================
async function ensureAuth() {
  if (auth.currentUser) return auth.currentUser;
  const stored = await chrome.storage.local.get(['agoraAccessToken']);
  if (stored.agoraAccessToken) {
    try {
      const credential = GoogleAuthProvider.credential(null, stored.agoraAccessToken);
      const result = await signInWithCredential(auth, credential);
      return result.user;
    } catch (err) {
      await chrome.storage.local.remove(['agoraAccessToken', 'agoraUser']);
      return null;
    }
  }
  return null;
}

// ============================================================
// 메시지 핸들러
// ============================================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "CAPTURE_VISIBLE_TAB") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) sendResponse({ error: chrome.runtime.lastError.message });
      else sendResponse({ dataUrl });
    });
    return true;
  }

  if (request.action === "SUBMIT_QUESTION") {
    handleSubmission(request.payload)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === "SYNC_AUTH") {
    const { accessToken, user } = request;
    chrome.storage.local.set({ agoraAccessToken: accessToken, agoraUser: user });
    const credential = GoogleAuthProvider.credential(null, accessToken);
    signInWithCredential(auth, credential).then(() => {
      startWatchingAnswers(user.uid);
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === "LOGOUT") {
    if (unsubscribeAnswers) { unsubscribeAnswers(); unsubscribeAnswers = null; }
    chrome.action.setBadgeText({ text: "" });
    chrome.storage.local.remove(['unreadAnswers', 'agoraAccessToken', 'agoraUser', 'unreadCount']);
    sendResponse({ success: true });
    return true;
  }
});

// ============================================================
// 답변 감시 (Sync & Mirroring)
// ============================================================
function startWatchingAnswers(uid) {
  if (unsubscribeAnswers) { unsubscribeAnswers(); unsubscribeAnswers = null; }

  const q = query(collection(db, 'questions'), where('userId', '==', uid));
  
  // 1. 초기 1회 강제 동기화
  getDocs(q).then(snapshot => updateStorageAndBadge(snapshot));

  // 2. 실시간 감시
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
  const user = await ensureAuth();
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

ensureAuth().then(user => {
  if (user) startWatchingAnswers(user.uid);
});
