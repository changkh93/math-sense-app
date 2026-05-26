import React from 'react';
import { createRoot } from 'react-dom/client';
import AnnotationCanvas from '../src/components/AnnotationCanvas';

// ============================================================
// Agora Connect - Content Script v2.0 (UX Innovation)
// ============================================================
// 혁신 포인트:
//   1. 플로팅 '아고라 볼' (Floating Orb) — 드래그 가능, 항시 접근
//   2. 영역 캡처 (Snipping Tool) — 필요한 부분만 드래그 선택
//   3. 인라인 입력 — prompt() 제거, 오버레이 내 질문 입력
//   4. 스마트 스탬프 — ?, !, ✗ 아이콘 원클릭
// ============================================================

let overlayContainer = null;
let floatingOrb = null;
let preSelectedText = ''; // 캡처 전 페이지에서 선택한 텍스트

// ============================================================
// 메시지 리스너 (Extension -> Content Script)
// ============================================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "INIT_OVERLAY") {
    startSnippingMode(request.dataUrl);
    sendResponse({ success: true });
  }
  if (request.action === "TRIGGER_CAPTURE_FLOW") {
    triggerCapture();
    sendResponse({ success: true });
  }
  return true;
});

// ============================================================
// 브릿지 리스너 (Web App -> Content Script -> Web App)
// 획기적인 영상 캡처 해결책: 웹 앱에서 요청하면 확장 프로그램이 응답함
// ============================================================
window.addEventListener('message', (event) => {
  if (event.source !== window || !event.data || typeof event.data !== 'object') return;
  const { type } = event.data;

  // 1. 상태 확인 (Ping)
  if (type === 'AGORA_PING') {
    console.log('🌌 [Content] Received AGORA_PING');
    window.postMessage({ type: 'AGORA_PONG', version: '1.0.3' }, window.location.origin);
  }

  // 2. 캡처 요청
  if (type === 'AGORA_CAPTURE_REQUEST') {
    console.log('🌌 [Content] Received AGORA_CAPTURE_REQUEST');
    chrome.runtime.sendMessage({ action: "CAPTURE_VISIBLE_TAB" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('🌌 [Content] Capture Error:', chrome.runtime.lastError.message);
        window.postMessage({ type: 'AGORA_CAPTURE_RESPONSE', error: chrome.runtime.lastError.message }, window.location.origin);
        return;
      }
      if (response && response.dataUrl) {
        console.log('🌌 [Content] Capture Success, sending response');
        window.postMessage({ type: 'AGORA_CAPTURE_RESPONSE', dataUrl: response.dataUrl }, window.location.origin);
      } else if (response && response.error) {
        console.warn('🌌 [Content] Capture returned error:', response.error);
        window.postMessage({ type: 'AGORA_CAPTURE_RESPONSE', error: response.error }, window.location.origin);
      } else {
        console.warn('🌌 [Content] Capture returned empty response');
        window.postMessage({ type: 'AGORA_CAPTURE_RESPONSE', error: 'Capture failed or returned empty' }, window.location.origin);
      }
    });
  }
});

// ============================================================
// 1. 플로팅 아고라 볼 (Floating Orb)
// ============================================================
function createFloatingOrb() {
  // 이전 버전의 Orb가 남아있으면 제거 (확장 프로그램 업데이트 시)
  const existingOrb = document.getElementById('agora-floating-orb');
  if (existingOrb) existingOrb.remove();
  if (floatingOrb) return;

  floatingOrb = document.createElement('div');
  floatingOrb.id = 'agora-floating-orb';
  floatingOrb.innerHTML = '🌌';
  Object.assign(floatingOrb.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6C5CE7, #a29bfe)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    cursor: 'grab',
    zIndex: '2147483640',
    boxShadow: '0 4px 20px rgba(108,92,231,0.5)',
    transition: 'transform 0.2s, opacity 0.3s, box-shadow 0.3s',
    opacity: '0.4',
    userSelect: 'none',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  });

  // 호버 효과
  floatingOrb.addEventListener('mouseenter', () => {
    floatingOrb.style.opacity = '1';
    floatingOrb.style.transform = 'scale(1.15)';
    floatingOrb.style.boxShadow = '0 6px 30px rgba(108,92,231,0.7)';
  });
  floatingOrb.addEventListener('mouseleave', () => {
    if (!isDragging) {
      floatingOrb.style.opacity = '0.4';
      floatingOrb.style.transform = 'scale(1)';
      floatingOrb.style.boxShadow = '0 4px 20px rgba(108,92,231,0.5)';
    }
  });

  // 드래그 로직
  let isDragging = false;
  let wasDragged = false;
  let dragStartX, dragStartY, orbStartX, orbStartY;

  floatingOrb.addEventListener('mousedown', (e) => {
    isDragging = true;
    wasDragged = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    const rect = floatingOrb.getBoundingClientRect();
    orbStartX = rect.left;
    orbStartY = rect.top;
    floatingOrb.style.cursor = 'grabbing';
    floatingOrb.style.transition = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) wasDragged = true;
    floatingOrb.style.left = (orbStartX + dx) + 'px';
    floatingOrb.style.top = (orbStartY + dy) + 'px';
    floatingOrb.style.right = 'auto';
    floatingOrb.style.bottom = 'auto';
  });

  document.addEventListener('mouseup', async () => {
    if (!isDragging) return;
    isDragging = false;
    floatingOrb.style.cursor = 'grab';
    floatingOrb.style.transition = 'transform 0.2s, opacity 0.3s, box-shadow 0.3s';
    
    if (!wasDragged) {
      // ★ 추가: 캡처 전 로그인 상태 확인 ★
      const data = await chrome.storage.local.get(['agoraUser']);
      if (!data.agoraUser) {
        if (confirm("아고라 확장에서 로그인이 필요합니다. 지금 로그인하시겠습니까?")) {
          chrome.runtime.sendMessage({ action: "LOGIN" }, (response) => {
            if (response && response.success) {
              showToast('✅ 로그인 성공! 다시 캡처해 주세요.', '#10B981');
              // 로그인 성공 후 자동으로 캡처를 시작할 수도 있지만, 
              // 사용자 혼란을 줄이기 위해 여기서 멈추고 다시 누르게 유도합니다.
            } else {
              showToast('❌ 로그인 실패: ' + (response?.error || '사용자가 취소함'), '#EF4444');
            }
          });
        }
        return;
      }
      triggerCapture();
    }
  });

  document.body.appendChild(floatingOrb);
}

function triggerCapture() {
  try {
    // 캡처 전 선택된 텍스트 저장
    const sel = window.getSelection();
    preSelectedText = sel ? sel.toString().trim() : '';

    chrome.runtime.sendMessage({ action: "CAPTURE_VISIBLE_TAB" }, (response) => {
      if (chrome.runtime.lastError) {
        handleInvalidContext();
        return;
      }
      if (response && response.dataUrl) {
        startSnippingMode(response.dataUrl);
      }
    });
  } catch (e) {
    handleInvalidContext();
  }
}

function handleInvalidContext() {
  // 기존 Orb 제거
  const orb = document.getElementById('agora-floating-orb');
  if (orb) orb.remove();
  floatingOrb = null;

  // 새로고침 안내 토스트
  const toast = document.createElement('div');
  Object.assign(toast.style, {
    position: 'fixed', top: '20px', left: '50%',
    transform: 'translateX(-50%)',
    background: 'linear-gradient(135deg, #6C5CE7, #a29bfe)',
    color: 'white', padding: '14px 24px', borderRadius: '14px',
    fontSize: '14px', fontWeight: 'bold', zIndex: '2147483647',
    boxShadow: '0 4px 20px rgba(108,92,231,0.5)',
    cursor: 'pointer', textAlign: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  });
  toast.innerHTML = '🔄 확장 프로그램이 업데이트되었습니다.<br><span style="font-size:12px; opacity:0.8;">클릭하면 페이지를 새로고침합니다.</span>';
  toast.onclick = () => location.reload();
  document.body.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) toast.style.opacity = '0';
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 600);
  }, 5000);
}

// 페이지 로드 후 약간 지연하여 Orb 생성
if (document.readyState === 'complete') {
  setTimeout(createFloatingOrb, 500);
} else {
  window.addEventListener('load', () => setTimeout(createFloatingOrb, 500));
}

// ============================================================
// 2. 영역 캡처 (Snipping Tool)
// ============================================================
function startSnippingMode(dataUrl) {
  if (overlayContainer) return;
  if (floatingOrb) floatingOrb.style.display = 'none';

  const fullImage = new Image();
  fullImage.onload = () => {
    // 스니핑 오버레이 생성
    const snippingOverlay = document.createElement('div');
    snippingOverlay.id = 'agora-snipping-overlay';
    Object.assign(snippingOverlay.style, {
      position: 'fixed',
      top: '0', left: '0',
      width: '100vw', height: '100vh',
      zIndex: '2147483647',
      cursor: 'crosshair',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    });

    // 배경: 캡처된 이미지 (어둡게)
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = window.innerWidth;
    bgCanvas.height = window.innerHeight;
    const bgCtx = bgCanvas.getContext('2d');
    bgCtx.drawImage(fullImage, 0, 0, bgCanvas.width, bgCanvas.height);
    bgCtx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
    Object.assign(bgCanvas.style, {
      position: 'absolute',
      top: '0', left: '0',
      width: '100%', height: '100%',
    });

    // 안내 텍스트
    const hint = document.createElement('div');
    Object.assign(hint.style, {
      position: 'absolute',
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      color: '#E2E8F0',
      fontSize: '18px',
      fontWeight: '600',
      textAlign: 'center',
      pointerEvents: 'none',
      textShadow: '0 2px 8px rgba(0,0,0,0.5)',
      zIndex: '2',
    });
    hint.innerHTML = '✂️ 드래그하여 캡처 영역을 선택하세요<br><span style="font-size:13px; color:#94A3B8; font-weight:400;">ESC: 취소 / 전체 화면 캡처: 더블클릭</span>';

    // 선택 영역 표시용
    const selectionBox = document.createElement('div');
    Object.assign(selectionBox.style, {
      position: 'absolute',
      border: '2px dashed #a29bfe',
      borderRadius: '4px',
      display: 'none',
      pointerEvents: 'none',
      zIndex: '3',
      boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
    });

    snippingOverlay.appendChild(bgCanvas);
    snippingOverlay.appendChild(hint);
    snippingOverlay.appendChild(selectionBox);
    document.body.appendChild(snippingOverlay);

    // 드래그 선택 로직
    let startX, startY, isSelecting = false;

    snippingOverlay.addEventListener('mousedown', (e) => {
      if (e.target === snippingOverlay || e.target === bgCanvas) {
        hint.style.display = 'none';
        isSelecting = true;
        startX = e.clientX;
        startY = e.clientY;
        selectionBox.style.display = 'block';
        selectionBox.style.left = startX + 'px';
        selectionBox.style.top = startY + 'px';
        selectionBox.style.width = '0px';
        selectionBox.style.height = '0px';
      }
    });

    snippingOverlay.addEventListener('mousemove', (e) => {
      if (!isSelecting) return;
      const x = Math.min(e.clientX, startX);
      const y = Math.min(e.clientY, startY);
      const w = Math.abs(e.clientX - startX);
      const h = Math.abs(e.clientY - startY);
      selectionBox.style.left = x + 'px';
      selectionBox.style.top = y + 'px';
      selectionBox.style.width = w + 'px';
      selectionBox.style.height = h + 'px';
    });

    snippingOverlay.addEventListener('mouseup', (e) => {
      if (!isSelecting) return;
      isSelecting = false;
      const x = Math.min(e.clientX, startX);
      const y = Math.min(e.clientY, startY);
      const w = Math.abs(e.clientX - startX);
      const h = Math.abs(e.clientY - startY);

      document.body.removeChild(snippingOverlay);

      if (w < 20 || h < 20) return; // 너무 작으면 무시

      // 선택된 영역만 크롭
      const ratio = fullImage.width / window.innerWidth;
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = w * ratio;
      cropCanvas.height = h * ratio;
      const cropCtx = cropCanvas.getContext('2d');
      cropCtx.drawImage(
        fullImage,
        x * ratio, y * ratio, w * ratio, h * ratio,
        0, 0, cropCanvas.width, cropCanvas.height
      );

      createAnnotationOverlay(cropCanvas.toDataURL('image/png'));
    });

    // 더블클릭: 전체 화면 캡처
    snippingOverlay.addEventListener('dblclick', () => {
      document.body.removeChild(snippingOverlay);
      createAnnotationOverlay(dataUrl);
    });

    // ESC로 취소
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        if (snippingOverlay.parentNode) document.body.removeChild(snippingOverlay);
        if (floatingOrb) floatingOrb.style.display = 'flex';
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  };
  fullImage.src = dataUrl;
}

// ============================================================
// 3. 판서 오버레이 (Annotation Overlay) - React Component
// ============================================================
const AgoraExtensionOverlay = ({ croppedDataUrl, preSelectedText, onClose }) => {
  const [text, setText] = React.useState(preSelectedText ? `> ${preSelectedText.substring(0, 200)}\n\n` : '');
  const [isSending, setIsSending] = React.useState(false);
  const canvasRef = React.useRef(null);

  const handleSend = async () => {
    if (isSending) return;
    setIsSending(true);
    showToast('⏳ 전송 중...', '#F59E0B');

    try {
      const finalImage = canvasRef.current.getCaptureData();
      
      chrome.runtime.sendMessage({
        action: "SUBMIT_QUESTION",
        payload: {
          image: finalImage,
          text: text || "(첨부된 그림 참조)",
          url: window.location.href,
          title: document.title,
        }
      }, (response) => {
        setIsSending(false);
        if (response && response.success) {
          showToast('✅ 질문이 아고라로 전송되었습니다!', '#10B981');
          onClose();
        } else {
          showToast('❌ ' + (response?.error || '전송 실패'), '#EF4444');
        }
      });
    } catch (err) {
      setIsSending(false);
      showToast('❌ 오류 발생', '#EF4444');
    }
  };

  return (
    <div style={{
      width: '100vw', height: '100vh',
      backgroundColor: 'rgba(10, 10, 30, 0.95)',
      display: 'flex', flexDirection: 'column',
      backdropFilter: 'blur(12px)',
      position: 'relative'
    }}>
      {/* Top Close Button */}
      <button 
        onClick={onClose}
        style={{
          position: 'absolute', top: '20px', right: '20px',
          background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
          width: '40px', height: '40px', borderRadius: '50%',
          fontSize: '24px', cursor: 'pointer', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        ✕
      </button>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', padding: '20px', paddingTop: '60px', overflow: 'hidden' }}>
        <AnnotationCanvas 
          ref={canvasRef}
          backgroundImage={croppedDataUrl}
          showFooter={false}
        />
      </div>

      {/* Bottom Input Area */}
      <div style={{
        padding: '20px', background: 'rgba(0,0,0,0.4)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px'
      }}>
        <div style={{ width: '100%', maxWidth: '800px', display: 'flex', gap: '12px' }}>
          <textarea 
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="질문을 입력하세요... (캡처 이미지와 함께 전송됩니다)"
            style={{
              flex: 1, height: '60px', background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px',
              padding: '12px', color: 'white', fontSize: '14px', resize: 'none',
              outline: 'none'
            }}
          />
          <button 
            onClick={handleSend}
            disabled={isSending}
            style={{
              padding: '0 24px', borderRadius: '12px', background: '#6C5CE7',
              color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer',
              opacity: isSending ? 0.5 : 1, transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            🚀 전송
          </button>
        </div>
        <div style={{ fontSize: '11px', color: '#64748B' }}>
          📋 출처 정보(현재 페이지 URL)가 함께 기록됩니다.
        </div>
      </div>
    </div>
  );
};

function createAnnotationOverlay(croppedDataUrl) {
  if (overlayContainer) return;

  overlayContainer = document.createElement('div');
  overlayContainer.id = 'agora-connect-overlay';
  Object.assign(overlayContainer.style, {
    position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
    zIndex: '2147483647',
  });

  document.body.appendChild(overlayContainer);
  const reactRoot = createRoot(overlayContainer);

  reactRoot.render(
    <AgoraExtensionOverlay 
      croppedDataUrl={croppedDataUrl}
      preSelectedText={preSelectedText}
      onClose={() => closeOverlay()}
    />
  );

  overlayContainer._reactRoot = reactRoot;

  // ESC key to close
  const keyHandler = (e) => {
    if (e.key === 'Escape') closeOverlay();
  };
  document.addEventListener('keydown', keyHandler);
  overlayContainer._cleanup = () => document.removeEventListener('keydown', keyHandler);
}

// submission logic is now inside the React component

// ============================================================
// 오버레이 닫기
// ============================================================
function closeOverlay() {
  if (overlayContainer) {
    if (overlayContainer._reactRoot) {
      overlayContainer._reactRoot.unmount();
    }
    if (overlayContainer._cleanup) overlayContainer._cleanup();
    document.body.removeChild(overlayContainer);
    overlayContainer = null;
  }
  if (floatingOrb) floatingOrb.style.display = 'flex';
}

// ============================================================
// 토스트 메시지
// ============================================================
function showToast(message, color = '#10B981') {
  const toast = document.createElement('div');
  Object.assign(toast.style, {
    position: 'fixed',
    top: '20px', left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: color,
    color: 'white',
    padding: '12px 24px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 'bold',
    zIndex: '2147483647',
    boxShadow: `0 4px 15px ${color}66`,
    transition: 'opacity 0.5s',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  });
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 500);
  }, 3000);
}
