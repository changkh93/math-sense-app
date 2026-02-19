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
let canvas = null;
let ctx = null;
let isDrawing = false;
let screenshotImage = null;
let drawingHistory = [];
let floatingOrb = null;
let preSelectedText = ''; // 캡처 전 페이지에서 선택한 텍스트

// ============================================================
// 메시지 리스너
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

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    floatingOrb.style.cursor = 'grab';
    floatingOrb.style.transition = 'transform 0.2s, opacity 0.3s, box-shadow 0.3s';
    if (!wasDragged) {
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
// 3. 판서 오버레이 (Annotation Overlay)
// ============================================================
function createAnnotationOverlay(croppedDataUrl) {
  if (overlayContainer) return;

  let currentTool = 'pen';
  let currentColor = '#FF5252';
  let stampCount = 1;
  drawingHistory = [];

  // === 컨테이너 ===
  overlayContainer = document.createElement('div');
  overlayContainer.id = 'agora-connect-overlay';
  Object.assign(overlayContainer.style, {
    position: 'fixed',
    top: '0', left: '0',
    width: '100vw', height: '100vh',
    zIndex: '2147483647',
    backgroundColor: 'rgba(10, 10, 30, 0.92)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(8px)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  });

  // === 상단 툴바 ===
  const toolbar = document.createElement('div');
  Object.assign(toolbar.style, {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 50, 0.95)',
    padding: '8px 14px',
    borderRadius: '14px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
    marginBottom: '12px',
  });

  // 툴팁 스타일 주입 (한번만)
  if (!document.getElementById('agora-tooltip-style')) {
    const style = document.createElement('style');
    style.id = 'agora-tooltip-style';
    style.textContent = `
      .agora-tool-btn { position:relative; }
      .agora-tool-btn:hover::after {
        content: attr(data-tip);
        position: absolute; bottom: -30px; left: 50%;
        transform: translateX(-50%);
        background: #1E1E2E; color: #E2E8F0;
        padding: 3px 8px; border-radius: 6px;
        font-size: 10px; white-space: nowrap;
        pointer-events: none; z-index: 99999;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        font-weight: 500;
      }
    `;
    document.head.appendChild(style);
  }

  const toolBtn = (id, bg, label, text = '', extra = '') =>
    `<button id="${id}" class="agora-tool-btn" data-tip="${label}" style="
      width:36px; height:36px; border-radius:50%;
      background:${bg}; border:none; cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      font-size:${text ? '16px' : '14px'}; font-weight:bold; color:#fff;
      transition: transform 0.1s, box-shadow 0.15s; ${extra}
    " title="${label}">${text}</button>`;

  const divider = '<div style="width:1px; height:26px; background:#333; margin:0 4px;"></div>';

  toolbar.innerHTML = `
    ${toolBtn('agora-pen-red', '#FF5252', '빨간 펜', '', 'border:2.5px solid white;')}
    ${toolBtn('agora-pen-blue', '#448AFF', '파란 펜')}
    ${toolBtn('agora-pen-yellow', 'rgba(255,235,59,0.5)', '형광펜', '', 'backdrop-filter:blur(2px);')}
    ${divider}
    ${toolBtn('agora-stamp-num', '#FFD700', '번호 스탬프', '①')}
    ${toolBtn('agora-stamp-q', '#FF6B6B', '궁금해요!', '❓')}
    ${toolBtn('agora-stamp-imp', '#FF9800', '중요!', '❗')}
    ${toolBtn('agora-stamp-x', '#78909C', '틀렸어요', '✗')}
    ${toolBtn('agora-arrow', '#E040FB', '여기를 모르겠어요!', '👆')}
    ${divider}
    ${toolBtn('agora-undo', '#555', '되돌리기 (Ctrl+Z)', '↩')}
    <button id="agora-close" style="
      background:#374151; color:#9CA3AF; border:none;
      padding:6px 12px; border-radius:8px; cursor:pointer;
      font-size:12px; margin-left:6px;
    ">✕</button>
  `;

  // === 캔버스 래퍼 ===
  const canvasWrapper = document.createElement('div');
  Object.assign(canvasWrapper.style, {
    position: 'relative',
    boxShadow: '0 0 60px rgba(99,102,241,0.15)',
    border: '2px solid #374151',
    borderRadius: '10px',
    overflow: 'hidden',
  });

  // === 캔버스 ===
  canvas = document.createElement('canvas');
  canvas.style.cursor = 'crosshair';
  canvas.style.display = 'block';

  screenshotImage = new Image();
  screenshotImage.onload = () => {
    const maxW = window.innerWidth * 0.85;
    const maxH = window.innerHeight * 0.6;
    const ratio = Math.min(maxW / screenshotImage.width, maxH / screenshotImage.height, 1);

    canvas.width = screenshotImage.width;
    canvas.height = screenshotImage.height;
    canvas.style.width = `${screenshotImage.width * ratio}px`;
    canvas.style.height = `${screenshotImage.height * ratio}px`;

    ctx = canvas.getContext('2d');
    ctx.drawImage(screenshotImage, 0, 0);
    saveToHistory();

    ctx.strokeStyle = currentColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };
  screenshotImage.src = croppedDataUrl;

  // === 하단: 인라인 질문 입력 ===
  const inputPanel = document.createElement('div');
  Object.assign(inputPanel.style, {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 50, 0.95)',
    padding: '10px 16px',
    borderRadius: '14px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
    marginTop: '12px',
    width: canvas.style.width || '80%',
    maxWidth: '700px',
    minWidth: '400px',
  });
  inputPanel.innerHTML = `
    <input id="agora-question-input" type="text" placeholder="📝 질문을 입력하세요... (캡처 이미지와 함께 전송됩니다)" style="
      flex: 1; background: #1E1E2E; border: 1px solid #374151;
      color: #E2E8F0; padding: 10px 14px; border-radius: 10px;
      font-size: 13px; outline: none;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    " value="${preSelectedText ? '> ' + preSelectedText.replace(/"/g, '&quot;').substring(0, 200) + '\n\n' : ''}">
    <button id="agora-send-btn" style="
      background: linear-gradient(135deg, #6C5CE7, #a29bfe);
      color: white; border: none; padding: 10px 20px;
      border-radius: 10px; cursor: pointer; font-weight: bold;
      font-size: 13px; white-space: nowrap;
      box-shadow: 0 2px 12px rgba(108,92,231,0.4);
      transition: transform 0.1s, box-shadow 0.15s;
    ">📤 전송</button>
  `;

  // === 저작권 배너 ===
  const copyrightNote = document.createElement('div');
  Object.assign(copyrightNote.style, {
    fontSize: '10px', color: '#64748B', marginTop: '8px',
    textAlign: 'center',
  });
  copyrightNote.textContent = '📋 출처 정보(현재 페이지 URL)가 함께 기록됩니다.';

  // === 자동 인용 토스트 ===
  if (preSelectedText) {
    showToast('✨ 선택한 텍스트가 인용되었습니다!', '#6C5CE7');
  }

  // === DOM 조립 ===
  canvasWrapper.appendChild(canvas);
  overlayContainer.appendChild(toolbar);
  overlayContainer.appendChild(canvasWrapper);
  overlayContainer.appendChild(inputPanel);
  overlayContainer.appendChild(copyrightNote);
  document.body.appendChild(overlayContainer);

  // === 키보드 이벤트 ===
  const keyHandler = (e) => {
    if (e.key === 'Escape') closeOverlay();
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undoLastAction(); }
    if (e.key === 'Enter' && e.target.id === 'agora-question-input') submitQuestion();
  };
  document.addEventListener('keydown', keyHandler);
  overlayContainer._cleanup = () => document.removeEventListener('keydown', keyHandler);

  // 입력창에 포커스
  setTimeout(() => document.getElementById('agora-question-input')?.focus(), 300);

  // === 이벤트 바인딩 ===
  setupCanvasEvents(canvas, () => currentTool, () => { const n = stampCount; stampCount++; return n; }, () => currentColor);
  setupToolbarEvents(toolbar, {
    setTool: (t) => currentTool = t,
    setColor: (c) => { currentColor = c; if (ctx) ctx.strokeStyle = c; },
  });

  // 전송 버튼
  document.getElementById('agora-send-btn').onclick = submitQuestion;
}

// ============================================================
// 질문 전송 (Inline)
// ============================================================
function submitQuestion() {
  const input = document.getElementById('agora-question-input');
  const btn = document.getElementById('agora-send-btn');
  const text = input?.value?.trim();

  if (!text) {
    input.style.borderColor = '#FF5252';
    input.placeholder = '⚠️ 질문 내용을 입력해주세요!';
    setTimeout(() => {
      input.style.borderColor = '#374151';
      input.placeholder = '📝 질문을 입력하세요...';
    }, 2000);
    return;
  }

  btn.textContent = '⏳ 전송 중...';
  btn.disabled = true;
  btn.style.opacity = '0.6';

  const finalImage = canvas.toDataURL('image/png');

  // 15초 타임아웃
  const timeout = setTimeout(() => {
    btn.textContent = '📤 전송';
    btn.disabled = false;
    btn.style.opacity = '1';
    showToast('⚠️ 전송 시간 초과. 다시 시도해주세요.', '#F59E0B');
  }, 15000);

  chrome.runtime.sendMessage({
    action: "SUBMIT_QUESTION",
    payload: {
      image: finalImage,
      text: text,
      url: window.location.href,
      title: document.title,
    }
  }, (response) => {
    clearTimeout(timeout);
    if (response && response.success) {
      showToast('✅ 질문이 아고라로 전송되었습니다!', '#10B981');
      closeOverlay();
    } else {
      btn.textContent = '📤 전송';
      btn.disabled = false;
      btn.style.opacity = '1';
      const err = response?.error || '알 수 없는 오류';
      showToast('❌ ' + err, '#EF4444');
    }
  });
}

// ============================================================
// Undo / History
// ============================================================
function saveToHistory() {
  if (!canvas) return;
  drawingHistory.push(canvas.toDataURL());
  if (drawingHistory.length > 20) drawingHistory.shift();
}

function undoLastAction() {
  if (drawingHistory.length <= 1) return;
  drawingHistory.pop();
  const prev = drawingHistory[drawingHistory.length - 1];
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
  img.src = prev;
}

// ============================================================
// 캔버스 이벤트
// ============================================================
function setupCanvasEvents(cvs, getTool, getNextStamp, getColor) {
  const getPos = (e) => {
    const rect = cvs.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (cvs.width / rect.width),
      y: (e.clientY - rect.top) * (cvs.height / rect.height),
    };
  };

  cvs.addEventListener('mousedown', (e) => {
    const tool = getTool();
    const pos = getPos(e);

    if (tool === 'pen') {
      isDrawing = true;
      ctx.beginPath();
      ctx.strokeStyle = getColor();
      ctx.lineWidth = 4;
      ctx.globalAlpha = 1;
      ctx.moveTo(pos.x, pos.y);
    } else if (tool === 'highlighter') {
      isDrawing = true;
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 235, 59, 0.3)';
      ctx.lineWidth = 22;
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'multiply';
      ctx.lineCap = 'square';
      ctx.moveTo(pos.x, pos.y);
    } else if (tool === 'stamp-num') {
      drawStamp(pos, getNextStamp(), '#FFD700', '#1a1a2e');
    } else if (tool === 'stamp-q') {
      drawIconStamp(pos, '❓', '#FF6B6B');
    } else if (tool === 'stamp-imp') {
      drawIconStamp(pos, '❗', '#FF9800');
    } else if (tool === 'stamp-x') {
      drawIconStamp(pos, '✗', '#78909C');
    } else if (tool === 'arrow') {
      drawArrowPreset(pos);
    }
  });

  cvs.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  });

  cvs.addEventListener('mouseup', () => {
    if (isDrawing) {
      isDrawing = false;
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineCap = 'round';
      saveToHistory();
    }
  });

  cvs.addEventListener('mouseleave', () => {
    if (isDrawing) {
      isDrawing = false;
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineCap = 'round';
      saveToHistory();
    }
  });
}

// === 스탬프 그리기 ===
function drawStamp(pos, num, bgColor, textColor) {
  ctx.save();
  ctx.fillStyle = bgColor;
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = textColor;
  ctx.font = 'bold 22px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(num, pos.x, pos.y + 1);
  ctx.restore();
  saveToHistory();
}

function drawIconStamp(pos, icon, bgColor) {
  ctx.save();
  ctx.fillStyle = bgColor;
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = '20px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillText(icon, pos.x, pos.y + 1);
  ctx.restore();
  saveToHistory();
}

function drawArrowPreset(pos) {
  ctx.save();
  const s = 50;
  ctx.fillStyle = '#E040FB';
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  ctx.lineTo(pos.x - s * 0.45, pos.y - s);
  ctx.lineTo(pos.x + s * 0.45, pos.y - s);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  const lw = 180, lh = 34;
  const lx = pos.x - lw / 2, ly = pos.y - s - lh - 6;
  ctx.fillStyle = 'rgba(224,64,251,0.92)';
  ctx.beginPath();
  ctx.roundRect(lx, ly, lw, lh, 8);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('👉 여기를 모르겠어요!', pos.x, ly + lh / 2);
  ctx.restore();
  saveToHistory();
}

// ============================================================
// 툴바 이벤트
// ============================================================
function setupToolbarEvents(toolbar, { setTool, setColor }) {
  const allBtns = ['#agora-pen-red', '#agora-pen-blue', '#agora-pen-yellow',
    '#agora-stamp-num', '#agora-stamp-q', '#agora-stamp-imp', '#agora-stamp-x', '#agora-arrow'];

  const selectBtn = (sel) => {
    allBtns.forEach(s => {
      const b = toolbar.querySelector(s);
      if (b) b.style.border = 'none';
    });
    const b = toolbar.querySelector(sel);
    if (b) b.style.border = '2.5px solid white';
  };

  toolbar.querySelector('#agora-pen-red').onclick = () => { setTool('pen'); setColor('#FF5252'); selectBtn('#agora-pen-red'); };
  toolbar.querySelector('#agora-pen-blue').onclick = () => { setTool('pen'); setColor('#448AFF'); selectBtn('#agora-pen-blue'); };
  toolbar.querySelector('#agora-pen-yellow').onclick = () => { setTool('highlighter'); selectBtn('#agora-pen-yellow'); };
  toolbar.querySelector('#agora-stamp-num').onclick = () => { setTool('stamp-num'); selectBtn('#agora-stamp-num'); };
  toolbar.querySelector('#agora-stamp-q').onclick = () => { setTool('stamp-q'); selectBtn('#agora-stamp-q'); };
  toolbar.querySelector('#agora-stamp-imp').onclick = () => { setTool('stamp-imp'); selectBtn('#agora-stamp-imp'); };
  toolbar.querySelector('#agora-stamp-x').onclick = () => { setTool('stamp-x'); selectBtn('#agora-stamp-x'); };
  toolbar.querySelector('#agora-arrow').onclick = () => { setTool('arrow'); selectBtn('#agora-arrow'); };
  toolbar.querySelector('#agora-undo').onclick = undoLastAction;
  toolbar.querySelector('#agora-close').onclick = closeOverlay;
}

// ============================================================
// 오버레이 닫기
// ============================================================
function closeOverlay() {
  if (overlayContainer) {
    if (overlayContainer._cleanup) overlayContainer._cleanup();
    document.body.removeChild(overlayContainer);
    overlayContainer = null;
    canvas = null;
    ctx = null;
    drawingHistory = [];
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
