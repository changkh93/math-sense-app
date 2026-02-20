// ============================================================
// Agora Connect - Popup Script v6.0 (Login via Background)
// ============================================================
// 핵심: 로그인 플로우를 background로 위임합니다.
// 팝업은 계정 선택 창이 뜨면 닫히므로, 팝업에서 직접 로그인하면
// 콜백이 실행되지 않습니다. background는 팝업이 닫혀도 유지됩니다.
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
const activityList = document.getElementById('activity-list');
const statusIndicator = document.querySelector('.status-indicator');

// ============================================================
// Auth 상태 모니터링
// web-extension 모듈이 chrome.storage.local에서 세션을 복원합니다.
// background에서 로그인이 완료되면, 다음에 팝업을 열 때
// onAuthStateChanged가 올바른 user로 호출됩니다.
// ============================================================
onAuthStateChanged(auth, (user) => {
  console.log("🔥 Auth state:", user ? `LOGGED_IN (${user.displayName})` : "LOGGED_OUT");
  if (user) {
    statusIndicator.style.backgroundColor = '#4ade80';
    statusIndicator.title = `로그인됨: ${user.displayName}`;
    
    const userData = { uid: user.uid, displayName: user.displayName, email: user.email };
    chrome.storage.local.set({ agoraUser: userData });
    
    renderPopupUI(userData);
    loadCachedAnswers();
  } else {
    // Firebase에 세션이 없으면 → chrome.storage도 확인
    // (background에서 로그인했지만 아직 sync 안된 경우)
    chrome.storage.local.get(['agoraUser'], (result) => {
      if (result.agoraUser) {
        // storage에는 유저 있음 → UI 표시하고 background에 sync 요청
        renderPopupUI(result.agoraUser);
        loadCachedAnswers();
      } else {
        statusIndicator.style.backgroundColor = '#ef4444';
        statusIndicator.title = "로그인 필요";
        showLoginUI();
      }
    });
  }
});

function showLoginUI() {
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
      await chrome.storage.local.remove(['agoraUser', 'unreadAnswers', 'unreadCount']);
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

// ============================================================
// 로그인: background에 위임!
// 팝업은 계정선택 창이 뜨면 닫히므로, background에서 처리합니다.
// ============================================================
function handleLogin() {
  console.log("🔑 Sending LOGIN request to background...");
  
  // 버튼 상태 변경
  const btn = document.getElementById('login-btn');
  if (btn) {
    btn.textContent = '⏳ 로그인 중...';
    btn.disabled = true;
    btn.style.opacity = '0.6';
  }
  
  // background에 로그인 요청 전송
  // 팝업이 닫혀도 background에서 로그인이 완료됩니다.
  // 다시 팝업을 열면 onAuthStateChanged가 로그인 상태를 감지합니다.
  chrome.runtime.sendMessage({ action: "LOGIN" }, (response) => {
    // 이 콜백은 팝업이 닫히면 실행되지 않을 수 있습니다.
    // 그래도 팝업이 살아있는 경우를 위해 처리합니다.
    if (chrome.runtime.lastError) {
      console.log("Popup closed during login (expected)");
      return;
    }
    if (response && response.success) {
      console.log("✅ Login completed while popup is open");
      // onAuthStateChanged가 자동으로 UI 업데이트
    } else if (response && response.error) {
      console.error("❌ Login failed:", response.error);
      if (btn) {
        btn.textContent = '🔐 Google 로그인';
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

document.getElementById('open-app-btn').onclick = () => {
  chrome.tabs.create({ url: 'https://msense.me/agora' });
};
