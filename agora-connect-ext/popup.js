// ============================================================
// Agora Connect - Popup Script v3.1 (Persistent Auth)
// ============================================================

import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithCredential,
  onAuthStateChanged, 
  signOut
} from "firebase/auth";

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
const GOOGLE_WEB_CLIENT_ID = "1075562222654-c7a2853oroa1ngv0s50uhjjonc6sg4cb.apps.googleusercontent.com";

// DOM 요소
const activityList = document.getElementById('activity-list');
const statusIndicator = document.querySelector('.status-indicator');

// ============================================================
// 시작 시: 로컬 스토리지에서 인증 정보 즉시 확인 (화면 깜빡임 방지)
// ============================================================
(async function initPopup() {
  const stored = await chrome.storage.local.get(['agoraAccessToken', 'agoraUser']);
  if (stored.agoraAccessToken && stored.agoraUser) {
    console.log("📦 Restoring session from storage:", stored.agoraUser.displayName);
    renderPopupUI(stored.agoraUser);
    loadCachedAnswers();
    
    try {
      const credential = GoogleAuthProvider.credential(null, stored.agoraAccessToken);
      await signInWithCredential(auth, credential);
    } catch (err) {
      console.warn("⚠️ Session restore failed:", err);
    }
  } else {
    showLoginUI();
  }
})();

// ============================================================
// Auth 상태 모니터링
// ============================================================
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("🔥 Firebase Auth: LOGGED_IN", user.displayName);
    statusIndicator.style.backgroundColor = '#4ade80';
    statusIndicator.title = `로그인됨: ${user.displayName}`;
    
    const userData = { uid: user.uid, displayName: user.displayName, email: user.email };
    chrome.storage.local.set({ agoraUser: userData });
    
    renderPopupUI(userData);
    loadCachedAnswers();
  } else {
    console.log("🔥 Firebase Auth: LOGGED_OUT");
    chrome.storage.local.get(['agoraUser'], (result) => {
      if (!result.agoraUser) {
        showLoginUI();
      }
    });
  }
});

function showLoginUI() {
  statusIndicator.style.backgroundColor = '#ef4444';
  statusIndicator.title = "로그인 필요";
  
  activityList.innerHTML = `
    <div class="activity-item" style="justify-content:center; flex-direction:column; gap:8px;">
      <div style="font-size:12px; color:#94A3B8; margin-bottom:4px; text-align:center;">
        로그인 하면 어디서든 질문할 수 있어요!
      </div>
      <button id="login-btn" style="
        background: linear-gradient(135deg, #4285F4, #6366F1);
        color:white; border:none; padding:10px 20px; 
        border-radius:8px; cursor:pointer; font-weight:bold;
        font-size:13px; width: 100%;
      ">
        🔐 Google 로그인
      </button>
    </div>
  `;
  const btn = document.getElementById('login-btn');
  if (btn) btn.onclick = handleLogin;
}

function renderPopupUI(user) {
  if (document.getElementById('logout-btn') && 
      document.querySelector('.activity-item div')?.textContent.includes(user.displayName)) {
    return;
  }

  activityList.innerHTML = `
    <div class="activity-item" style="justify-content:center; flex-direction:column; gap:8px; background:none; padding:0;">
      <div style="display:flex; justify-content:space-between; align-items:center; width:100%; margin-bottom:4px;">
        <div style="font-size:13px; font-weight:bold; color:#E2E8F0;">
          🧑‍🚀 ${user.displayName || '탐험가'}
        </div>
        <button id="logout-btn" style="
          background:none; border:1px solid #334155; 
          color:#94A3B8; font-size:10px; padding:2px 8px; 
          border-radius:4px; cursor:pointer;
        ">로그아웃</button>
      </div>
      <div id="answer-status" style="font-size:11px; color:#94A3B8; margin-bottom:2px;">데이터 동기화 중...</div>
      <div id="answer-list" class="custom-scroll" style="width:100%; max-height:180px; overflow-y:auto; display:flex; flex-direction:column; gap:6px;">
      </div>
    </div>
  `;
  
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      chrome.runtime.sendMessage({ action: "LOGOUT" });
      await signOut(auth);
      await chrome.storage.local.remove(['agoraUser', 'agoraAccessToken', 'unreadAnswers', 'unreadCount']);
      showLoginUI();
    };
  }
}

async function loadCachedAnswers() {
  const statusEl = document.getElementById('answer-status');
  const listEl = document.getElementById('answer-list');
  if (!statusEl || !listEl) return;

  const stored = await chrome.storage.local.get(['unreadAnswers', 'unreadCount']);
  const answeredQuestions = stored.unreadAnswers || [];
  const unreadCount = stored.unreadCount || 0;

  if (unreadCount > 0) {
    statusEl.innerHTML = `<span style="color:#F87171; font-weight:bold;">🔴 새 답변 ${unreadCount}개</span>`;
  } else if (answeredQuestions.length > 0) {
    statusEl.innerHTML = `<span style="color:#4ade80;">✅ 모든 답변 확인 완료</span>`;
  } else {
    statusEl.textContent = '아직 답변이 없습니다.';
  }

  if (answeredQuestions.length > 0) {
    listEl.innerHTML = answeredQuestions.map(q => `
      <div class="answer-item ${q.isNew ? 'is-new' : ''}" data-id="${q.id}">
        <div class="answer-content">
          ${q.isNew ? '<span class="new-dot">●</span>' : '💬'} 
          <span class="text">${q.content}</span>
        </div>
        <span class="count-badge ${q.isNew ? 'new' : ''}">${q.answerCount}</span>
      </div>
    `).join('');

    document.querySelectorAll('.answer-item').forEach(item => {
      item.onclick = () => {
        const qid = item.getAttribute('data-id');
        chrome.tabs.create({ url: `https://msense.me/agora/${qid}` });
      };
    });
  }
  await chrome.storage.local.set({ agoraLastChecked: Date.now() });
}

async function handleLogin() {
  console.log("🔑 Initiating login flow...");
  const redirectURL = chrome.identity.getRedirectURL();
  const authURL = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authURL.searchParams.set('client_id', GOOGLE_WEB_CLIENT_ID);
  authURL.searchParams.set('response_type', 'token');
  authURL.searchParams.set('redirect_uri', redirectURL);
  authURL.searchParams.set('scope', 'openid email profile');
  authURL.searchParams.set('prompt', 'select_account');

  chrome.identity.launchWebAuthFlow({ url: authURL.toString(), interactive: true }, async (responseUrl) => {
    if (chrome.runtime.lastError || !responseUrl) {
      console.error("❌ Auth flow error:", chrome.runtime.lastError);
      return;
    }

    const url = new URL(responseUrl);
    const hashParams = new URLSearchParams(url.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    if (!accessToken) return;

    try {
      const credential = GoogleAuthProvider.credential(null, accessToken);
      const result = await signInWithCredential(auth, credential);
      const user = result.user;
      const userData = { uid: user.uid, displayName: user.displayName, email: user.email };

      await chrome.storage.local.set({ agoraAccessToken: accessToken, agoraUser: userData });
      console.log("✅ Logged in successfully:", user.displayName);

      chrome.runtime.sendMessage({ action: "SYNC_AUTH", accessToken, user: userData });
      
      renderPopupUI(userData);
      loadCachedAnswers();
    } catch (err) {
      console.error("❌ Login failed:", err);
      alert("로그인 중 오류가 발생했습니다.");
    }
  });
}

document.getElementById('capture-btn').onclick = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  chrome.runtime.sendMessage({ action: "CAPTURE_VISIBLE_TAB" }, (response) => {
    if (response && response.dataUrl) {
      chrome.tabs.sendMessage(tab.id, { action: "INIT_OVERLAY", dataUrl: response.dataUrl });
      window.close();
    }
  });
};

document.getElementById('open-app-btn').onclick = () => {
  chrome.tabs.create({ url: 'https://msense.me/agora' });
};
