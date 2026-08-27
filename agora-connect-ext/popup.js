// ============================================================
// Agora Connect - Popup Script v7.0 (Direct Pathway to My Questions)
// ============================================================

import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut
} from "firebase/auth/web-extension";

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

// DOM 요소
const activityContainer = document.getElementById('activity-container');
const statusIndicator = document.querySelector('.status-indicator');

// ============================================================
// Auth 상태 모니터링
// ============================================================
onAuthStateChanged(auth, (user) => {
  if (user) {
    if (statusIndicator) {
      statusIndicator.style.backgroundColor = '#4ade80';
      statusIndicator.title = `로그인됨: ${user.displayName || user.email}`;
    }
    
    const userData = { uid: user.uid, displayName: user.displayName, email: user.email };
    chrome.storage.local.set({ agoraUser: userData });
    
    renderLoggedInUI(userData);
  } else {
    chrome.storage.local.get(['agoraUser'], (result) => {
      if (result.agoraUser) {
        renderLoggedInUI(result.agoraUser);
      } else {
        if (statusIndicator) {
          statusIndicator.style.backgroundColor = '#ef4444';
          statusIndicator.title = "로그인 필요";
        }
        showLoginUI();
      }
    });
  }
});

function showLoginUI() {
  if (!activityContainer) return;
  activityContainer.innerHTML = `
    <div class="login-box">
      <div class="login-guide">
        <span class="guide-icon">🔐</span>
        <div class="guide-text">
          <strong>로그인이 필요합니다</strong>
          <p>구글 로그인 후 화면을 캡처하여 아고라에 질문하세요.</p>
        </div>
      </div>
      <button id="login-btn" class="login-btn">
        Google 계정으로 로그인
      </button>
    </div>
  `;
  const btn = document.getElementById('login-btn');
  if (btn) btn.onclick = handleLogin;
}

async function renderLoggedInUI(user) {
  if (!activityContainer) return;

  const stored = await chrome.storage.local.get(['unreadCount']);
  const unreadCount = stored.unreadCount || 0;

  const unreadBadgeHtml = unreadCount > 0 ? `
    <div class="status-wrapper">
      <div class="status-pill status-pill-new">
        <span class="pill-dot blink">●</span>
        <span>새 답변 <strong>${unreadCount}개</strong> 도착!</span>
      </div>
    </div>
  ` : '';

  activityContainer.innerHTML = `
    <div class="profile-card">
      <div class="profile-row">
        <div class="user-meta">
          <span class="user-avatar">🧑‍🚀</span>
          <span class="user-name" title="${user.displayName || '탐험가'}">${user.displayName || '탐험가'}</span>
        </div>
        <button id="logout-btn" class="logout-btn">로그아웃</button>
      </div>
      
      ${unreadBadgeHtml}

      <button id="open-my-questions-btn" class="my-questions-btn">
        <div class="my-questions-btn-content">
          <div class="my-questions-btn-header">
            <span class="btn-title">🏛️ 스텔라 아고라에 내 질문 열기</span>
            ${unreadCount > 0 ? `<span class="btn-count-badge">${unreadCount}</span>` : ''}
          </div>
          <span class="btn-subtitle">내가 올린 질문과 답변을 웹에서 확인하기 ➜</span>
        </div>
      </button>
    </div>
  `;

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      chrome.runtime.sendMessage({ action: "LOGOUT" });
      await signOut(auth);
      await chrome.storage.local.remove(['agoraUser', 'unreadAnswers', 'unreadCount']);
      showLoginUI();
    };
  }

  const myQuestionsBtn = document.getElementById('open-my-questions-btn');
  if (myQuestionsBtn) {
    myQuestionsBtn.onclick = async () => {
      await chrome.storage.local.set({ agoraLastChecked: Date.now(), unreadCount: 0 });
      chrome.action.setBadgeText({ text: "" });
      chrome.tabs.create({ url: 'https://msense.me/agora?filter=my' });
    };
  }
}

function handleLogin() {
  const btn = document.getElementById('login-btn');
  if (btn) {
    btn.textContent = '⏳ 로그인 진행 중...';
    btn.disabled = true;
    btn.style.opacity = '0.7';
  }
  
  chrome.runtime.sendMessage({ action: "LOGIN" }, (response) => {
    if (chrome.runtime.lastError) {
      return;
    }
    if (response && response.success) {
      if (response.user) renderLoggedInUI(response.user);
    } else if (response && response.error) {
      alert("로그인 실패: " + response.error);
      if (btn) {
        btn.textContent = 'Google 계정으로 로그인';
        btn.disabled = false;
        btn.style.opacity = '1';
      }
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

