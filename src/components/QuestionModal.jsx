import { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { ReactSketchCanvas } from 'react-sketch-canvas'; // KEEP FOR NOW IF NEEDED ELSEWHERE OR REMOVE
import * as htmlToImage from 'html-to-image';
import { db, auth } from '../firebase';
import { collection, updateDoc, doc, increment, serverTimestamp, getDoc, runTransaction } from 'firebase/firestore';
import { ImageService } from '../services/imageService';
import AnnotationCanvas from './AnnotationCanvas';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { recordCrystalTransaction } from '../utils/crystalLedger';
import { AGORA_BOUNTY_OPTIONS, getAnonymousLabel } from '../utils/socialUtils';
import './QuestionModal.css';

export default function QuestionModal({ isOpen, onClose, quizContext, contextData }) {
  const activeContext = quizContext || contextData;
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [type, setType] = useState('quiz');
  const [isPublic, setIsPublic] = useState(true);
  const [selectedBounty, setSelectedBounty] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Speech to Text
  const { isListening, transcript, startListening, stopListening } = useSpeechToText();

  // Sync transcript to content while recording
  useEffect(() => {
    if (isListening && transcript) {
      setContent(prev => prev + ' ' + transcript);
    }
  }, [transcript, isListening]);
  
  // Drawing State
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isPreparingCapture, setIsPreparingCapture] = useState(false);
  const [tempDrawing, setTempDrawing] = useState(null); // DataURL of final image
  const [canvasState, setCanvasState] = useState(null); // Fabric JSON for re-editing

  // Extension Bridge State
  const [extensionStatus, setExtensionStatus] = useState('unknown'); // 'unknown', 'detected', 'not_found'
  const [showExtensionPrompt, setShowExtensionPrompt] = useState(false);
  const captureResolveRef = useRef(null);
  const captureTimerRef = useRef(null);
  const extensionProbeResolveRef = useRef(null);
  const extensionProbeTimerRef = useRef(null);
  const captureFlowLockRef = useRef(false);

  // Image Upload State
  const [attachedImage, setAttachedImage] = useState(null); // DataURL of uploaded/pasted image
  const fileInputRef = useRef(null);

  // Prevent background scroll when modal open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Detect extension on open
      void checkExtension(1400);
    } else {
      document.body.style.overflow = 'auto';
      resolvePendingExtensionProbe(false);
      resolvePendingExtensionCapture({ error: 'Question modal closed' });
      captureFlowLockRef.current = false;
      // Reset state when closing modal to prevent stale data
      setTempDrawing(null);
      setAttachedImage(null);
      setCanvasState(null);
      setBackgroundImage(null);
      setIsDrawMode(false);
      setIsCapturing(false);
      setIsPreparingCapture(false);
      setError(null);
      setShowExtensionPrompt(false);
      setSelectedBounty(0);
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      resolvePendingExtensionProbe(false);
      resolvePendingExtensionCapture({ error: 'Question modal unmounted' });
    };
  }, []);

  const resolvePendingExtensionProbe = (detected) => {
    if (extensionProbeTimerRef.current) {
      clearTimeout(extensionProbeTimerRef.current);
      extensionProbeTimerRef.current = null;
    }
    const resolve = extensionProbeResolveRef.current;
    extensionProbeResolveRef.current = null;
    if (resolve) resolve(detected);
  };

  const resolvePendingExtensionCapture = (result) => {
    if (captureTimerRef.current) {
      clearTimeout(captureTimerRef.current);
      captureTimerRef.current = null;
    }
    const resolve = captureResolveRef.current;
    captureResolveRef.current = null;
    if (resolve) resolve(result);
  };

  // Handle messages from Extension Bridge
  useEffect(() => {
    const handleBridgeMessage = (event) => {
      if (event.source !== window || !event.data || typeof event.data !== 'object') return;
      const { type, dataUrl, error, version } = event.data;
      
      if (type === 'AGORA_PONG') {
        console.log('🌌 Agora Extension Bridge Detected. Version:', version);
        setExtensionStatus('detected');
        resolvePendingExtensionProbe(true);
      }

      if (type === 'AGORA_CAPTURE_RESPONSE') {
        resolvePendingExtensionCapture(dataUrl ? { dataUrl } : { error });
      }
    };

    window.addEventListener('message', handleBridgeMessage);
    return () => window.removeEventListener('message', handleBridgeMessage);
  }, []);

  const checkExtension = (timeoutMs = 1400) => {
    resolvePendingExtensionProbe(false);
    setExtensionStatus('unknown');

    return new Promise((resolve) => {
      extensionProbeResolveRef.current = (detected) => {
        setExtensionStatus(detected ? 'detected' : 'not_found');
        resolve(detected);
      };
      extensionProbeTimerRef.current = setTimeout(() => {
        resolvePendingExtensionProbe(false);
      }, timeoutMs);

      try {
        window.postMessage({ type: 'AGORA_PING' }, window.location.origin);
      } catch (err) {
        console.warn('Extension probe failed:', err);
        resolvePendingExtensionProbe(false);
      }
    });
  };

  const resolveCaptureElement = () => {
    const selectorCandidates = [
      activeContext?.captureRootSelector,
      activeContext?.captureSelector,
      activeContext?.captureRootId ? `#${activeContext.captureRootId}` : null,
      (activeContext?.type === 'video' || activeContext?.type === 'datalog') ? '#quiz-capture-area' : null,
      '#quiz-capture-area',
      '#root',
      'body'
    ].filter(Boolean);

    for (const selector of selectorCandidates) {
      const element = document.querySelector(selector);
      if (element) return element;
    }

    return null;
  };

  const isValidImageDataUrl = (dataUrl) => (
    typeof dataUrl === 'string' && dataUrl.startsWith('data:image/') && dataUrl.length > 100
  );

  const getCaptureOptions = () => ({
    quality: 0.9,
    pixelRatio: 2,
    backgroundColor: '#050a19',
    cacheBust: true,
    useCORS: true,
    filter: (node) => {
      if (node.classList?.contains('modal-overlay')) return false;
      if (node.classList?.contains('capture-hide')) return false;
      if (node.id === 'agora-floating-orb') return false;
      if (node.tagName === 'IFRAME') return false;
      if (node.tagName === 'LINK' && node.rel === 'stylesheet') {
        try {
          if (node.sheet && !node.sheet.cssRules) return false;
        } catch (e) {
          console.warn('Skipping stylesheet due to potential SecurityError:', node.href);
          return false;
        }
      }
      return true;
    }
  });

  const captureElementToDataUrl = async (element, captureOptions = getCaptureOptions()) => {
    if (!element) return null;

    const scrollEl = element.querySelector('.mission-content-view');
    const cardEl = scrollEl?.querySelector('.glass-card');
    if (scrollEl && cardEl && activeContext?.type === 'datalog') {
      const scrollTop = scrollEl.scrollTop;
      const viewportHeight = scrollEl.clientHeight;
      const viewportWidth = scrollEl.clientWidth;
      const ratio = 2;
      const fullCanvas = await htmlToImage.toCanvas(cardEl, {
        ...captureOptions,
        quality: 1,
        pixelRatio: ratio
      });
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = viewportWidth * ratio;
      cropCanvas.height = viewportHeight * ratio;
      const ctx = cropCanvas.getContext('2d');
      if (!ctx) return null;

      ctx.drawImage(
        fullCanvas,
        0, scrollTop * ratio, cardEl.clientWidth * ratio, viewportHeight * ratio,
        0, 0, viewportWidth * ratio, viewportHeight * ratio
      );
      return cropCanvas.toDataURL('image/png');
    }

    return htmlToImage.toPng(element, captureOptions);
  };

  const capturePdfFallbackToDataUrl = async (element) => {
    if (!element) return null;

    const iframes = element.querySelectorAll('iframe');
    const placeholders = [];

    try {
      iframes.forEach(iframe => {
        const placeholder = document.createElement('div');
        placeholder.style.cssText = `
          width: 100%; height: ${iframe.clientHeight || 360}px;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #1a1a2e, #16213e);
          border: 2px dashed rgba(0, 243, 255, 0.4); border-radius: 12px;
          color: rgba(0, 243, 255, 0.8); font-size: 1.5rem; font-family: monospace;
        `;
        placeholder.innerHTML = '<div style="font-size:3rem;margin-bottom:1rem">📄</div><div>PDF 문서 영역</div><div style="font-size:0.8rem;margin-top:0.5rem;color:rgba(255,255,255,0.4)">그림 위에 질문 내용을 그려주세요</div>';
        iframe.parentNode?.insertBefore(placeholder, iframe);
        iframe.style.display = 'none';
        placeholders.push({ iframe, placeholder });
      });

      return await captureElementToDataUrl(element);
    } finally {
      placeholders.forEach(({ iframe, placeholder }) => {
        iframe.style.display = '';
        placeholder.remove();
      });
    }
  };

  const questionTypes = [
    { id: 'quiz', label: '이 문제 질문', icon: '📝' },
    { id: 'concept', label: '개념 이해 안 됨', icon: '💡' },
    { id: 'wrong', label: '답이 이상함', icon: '❓' },
    { id: 'other', label: '기타', icon: '💬' }
  ];

  // ─── PDF Capture Helper: Render PDF page to canvas via pdf.js CDN ───
  const capturePdfPageToDataUrl = async (pdfUrl, pageNum = 1) => {
    // Extract Google Drive file ID if applicable
    let fetchUrl = pdfUrl;
    const driveMatch = pdfUrl.match(/drive\.google\.com\/file\/d\/([^\/\?]+)/);
    if (driveMatch && driveMatch[1]) {
      // Use export=download for direct file access
      fetchUrl = `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
    }

    // Dynamically load pdf.js from CDN (only when needed)
    if (!window.pdfjsLib) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs';
        script.type = 'module';
        script.onload = resolve;
        script.onerror = reject;

        // Fallback: use legacy build for broader compatibility
        const legacyScript = document.createElement('script');
        legacyScript.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.js';
        legacyScript.onload = resolve;
        legacyScript.onerror = reject;

        // Try legacy (non-module) first for wider browser support
        document.head.appendChild(legacyScript);
      });
    }

    const pdfjsLib = window.pdfjsLib;
    if (!pdfjsLib) throw new Error('pdf.js failed to load');
    
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.js';

    const loadingTask = pdfjsLib.getDocument({
      url: fetchUrl,
      withCredentials: false,
      disableAutoFetch: false,
      disableStream: false
    });

    const pdf = await loadingTask.promise;
    const clampedPage = Math.min(Math.max(pageNum, 1), pdf.numPages);
    const page = await pdf.getPage(clampedPage);

    const scale = 2; // High-res for annotation clarity
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport }).promise;
    
    return {
      dataUrl: canvas.toDataURL('image/png'),
      numPages: pdf.numPages,
      pageNum: clampedPage
    };
  };

  // ─── Extension Capture Helper (shared between video & PDF) ───
  const attemptExtensionCapture = async () => {
    resolvePendingExtensionCapture({ error: 'New capture request started' });
    setIsCapturing(true);
    document.body.classList.add('is-capturing');
    document.body.classList.add('is-extension-capturing');

    const capturePromise = new Promise(resolve => {
      captureResolveRef.current = resolve;

      // CRITICAL: Wait for modal to hide via framer-motion
      setTimeout(() => {
        window.postMessage({ type: 'AGORA_CAPTURE_REQUEST' }, window.location.origin);
      }, 300);

      // Timeout fallback
      captureTimerRef.current = setTimeout(() => {
        resolvePendingExtensionCapture({ error: 'Extension response timeout' });
      }, 6000);
    });

    const result = await capturePromise;
    if (result.dataUrl) {
      setBackgroundImage(result.dataUrl);
      return true; // Success
    }
    console.warn('Extension capture failed, falling back:', result.error);
    return false; // Fell through
  };

  const captureDomBackground = async () => {
    setBackgroundImage(null);
    setIsCapturing(true);
    document.body.classList.add('is-capturing');
    
    // Wait for capture-hide / iframe-placeholder CSS to settle.
    await new Promise(resolve => setTimeout(resolve, 200));

    const element = resolveCaptureElement();
    if (!element) {
      throw new Error('Capture target element not found');
    }

    const dataUrl = await captureElementToDataUrl(element);
    if (!isValidImageDataUrl(dataUrl)) {
      throw new Error('DOM capture returned empty image');
    }

    setBackgroundImage(dataUrl);
    return true;
  };

  const handleToggleDrawMode = async ({ forceDomCapture = false } = {}) => {
    if (isDrawMode) {
      // Exit drawing mode without automatic saving (user must click Complete Attachment)
      setIsDrawMode(false);
    } else {
      if (captureFlowLockRef.current) return;
      captureFlowLockRef.current = true;
      // Turn ON: Capture Background
      let shouldEnterDrawMode = false;
      try {
        setIsPreparingCapture(true);
        setError(null);
        setShowExtensionPrompt(false);
        const isPdfDatalog = activeContext?.type === 'datalog' && activeContext?.pdfUrl;
        const isVideo = activeContext?.type === 'video';

        // ── 1. Extension Capture Path (works for BOTH video and PDF iframes) ──
        if ((isVideo || isPdfDatalog) && !forceDomCapture) {
          const hasExtension = extensionStatus === 'detected' || await checkExtension(isVideo ? 2200 : 1400);
          if (hasExtension) {
            const success = await attemptExtensionCapture();
            if (success) {
              shouldEnterDrawMode = true;
              return; // Extension captured the full screen including iframe
            }
          }

          if (isVideo) {
            try {
              // Browser DOM capture cannot read the live YouTube iframe, so CSS swaps
              // it for the in-app timestamped thumbnail placeholder during capture.
              shouldEnterDrawMode = await captureDomBackground();
            } catch (videoFallbackErr) {
              console.error('Video fallback capture failed:', videoFallbackErr);
              setShowExtensionPrompt(true);
              setError('영상 화면 캡처를 시작하지 못했습니다. 아고라 커넥트 설치 후 다시 시도하거나 이미지 첨부를 사용해주세요.');
            }
            return;
          }
        }

        // ── 2. PDF-specific Capture Path (pdf.js canvas rendering) ──
        if (isPdfDatalog) {
          setBackgroundImage(null);
          setIsCapturing(true);
          document.body.classList.add('is-capturing');

          try {
            console.log('📄 Attempting PDF capture via pdf.js for:', activeContext.pdfUrl);
            const result = await capturePdfPageToDataUrl(activeContext.pdfUrl, 1);
            console.log(`📄 PDF page ${result.pageNum}/${result.numPages} captured successfully`);
            if (!isValidImageDataUrl(result.dataUrl)) throw new Error('PDF capture returned empty image');
            setBackgroundImage(result.dataUrl);
            shouldEnterDrawMode = true;
          } catch (pdfErr) {
            console.warn('📄 PDF direct capture failed (CORS or network):', pdfErr.message);
            
            // ── 3. Fallback: Capture non-iframe content with a styled PDF placeholder ──
            try {
              await new Promise(resolve => setTimeout(resolve, 200));
              const element = resolveCaptureElement();
              const fallbackDataUrl = await capturePdfFallbackToDataUrl(element);
              if (!isValidImageDataUrl(fallbackDataUrl)) throw new Error('PDF fallback returned empty image');
              setBackgroundImage(fallbackDataUrl);
              shouldEnterDrawMode = true;
            } catch (fallbackErr) {
              console.error('Fallback capture also failed:', fallbackErr);
              setError('PDF 화면을 캡처할 수 없습니다. 대신 📎 이미지 첨부 기능을 사용해주세요.');
            }
          }
          // Continue to finally block → enter draw mode
        } else {
          // ── Original html-to-image capture for non-PDF content ──
          try {
            shouldEnterDrawMode = await captureDomBackground();
          } catch (captureErr) {
            console.error('Screen capture failed with Error:', captureErr);
            setError(
              captureErr.message === 'Capture target element not found'
                ? '캡처할 화면 영역을 찾지 못했습니다. 다시 시도하거나 이미지 첨부를 사용해주세요.'
                : '화면을 캡처하는 중 보안 오류가 발생했습니다. 브라우저 설정이나 확장 프로그램을 확인해 주세요.'
            );
          }
        }
      } catch (err) {
        console.error('General error entering draw mode:', err);
        setError('화면 캡처를 시작하지 못했습니다. 다시 시도해주세요.');
      } finally {
        captureFlowLockRef.current = false;
        setIsPreparingCapture(false);
        setIsCapturing(false);
        document.body.classList.remove('is-capturing');
        document.body.classList.remove('is-extension-capturing');
        if (shouldEnterDrawMode) {
          setIsDrawMode(true);
        }
      }
    }
  };

  const handleAnnotationComplete = (dataUrl, json) => {
    setTempDrawing(dataUrl);
    setCanvasState(json);
    setIsDrawMode(false);
  };

  const handleAnnotationCancel = () => {
    setIsDrawMode(false);
  };

  const handleRemoveDrawing = () => {
    setTempDrawing(null);
    setCanvasState(null);
    setBackgroundImage(null);
  };

  // --- Image Upload Handlers ---
  const processImageFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      setError('이미지 크기는 5MB 이하만 가능합니다.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setAttachedImage(e.target.result);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
    // Reset so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) processImageFile(file);
        return;
      }
    }
    // If no image found, let default paste (text) happen
  };

  const handleRemoveImage = () => {
    setAttachedImage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('로그인이 필요합니다.');
      const userRef = doc(db, 'users', user.uid);
      const banRef = doc(db, 'agoraBannedUsers', user.uid);

      const banSnap = await getDoc(banRef);
      if (banSnap.exists()) throw new Error('AGORA_BANNED');

      // Fetch studentName from profile for correct display
      let resolvedName = user.displayName || '익명 학생';
      try {
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const ud = userSnap.data();
          resolvedName = ud.studentName || ud.name || resolvedName;
        }
      } catch (e) { /* fallback to displayName */ }

      let drawingUrl = null;

      // Handle Final Upload to Firebase (drawing OR uploaded image)
      const imageToUpload = tempDrawing || attachedImage;
      if (imageToUpload) {
        try {
          const timestamp = Date.now();
          const path = `drawings/${user.uid}/${timestamp}.png`;
          drawingUrl = await ImageService.uploadImage(imageToUpload, path);
        } catch (imgErr) {
          console.error('Failed to upload image:', imgErr);
        }
      }

      const bountyAmount = isPublic ? selectedBounty : 0;
      const questionRef = doc(collection(db, 'questions'));
      const questionData = {
        userId: user.uid,
        userName: resolvedName,
        content,
        type: activeContext?.type || type,
        category: 'general', 
        isPublic,
        isAnonymous: isPublic,
        anonymousLabel: getAnonymousLabel(user.uid),
        quizId: activeContext?.quizId || null,
        quizContext: {
          chapterId: activeContext?.chapterId || '',
          unitId: activeContext?.unitId || '',
          questionId: activeContext?.questionId || '',
          wrongAnswer: activeContext?.wrongAnswer || null,
          quizTitle: activeContext?.quizTitle || activeContext?.unitTitle || '',
          transmissionTitle: activeContext?.transmissionTitle || '',
          videoId: activeContext?.videoId || null,
          startTime: activeContext?.startTime || null
        },
        drawingUrl,
        status: 'open',
        bountyAmount,
        bountyStatus: bountyAmount > 0 ? 'locked' : 'none',
        bountyAwardedToAnswerId: null,
        bountyLockedAt: bountyAmount > 0 ? serverTimestamp() : null,
        upvotes: 0,
        upvotedBy: [],
        answerCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        const freshBanSnap = await transaction.get(banRef);
        if (!userSnap.exists()) throw new Error('USER_NOT_FOUND');
        if (freshBanSnap.exists()) throw new Error('AGORA_BANNED');

        const freshUserData = userSnap.data();
        const currentCrystals = freshUserData?.crystals || 0;

        if (bountyAmount > currentCrystals) {
          throw new Error('INSUFFICIENT_BOUNTY');
        }

        transaction.set(questionRef, questionData);
        transaction.set(userRef, {
          questionCount: (freshUserData?.questionCount || 0) + 1,
          crystals: currentCrystals - bountyAmount
        }, { merge: true });

        if (bountyAmount > 0) {
          recordCrystalTransaction(user.uid, {
            amount: -bountyAmount,
            type: 'agora_bounty_lock',
            description: '현상금 질문 등록',
            metadata: { questionId: questionRef.id, bountyAmount }
          }, transaction, `agora-bounty-lock-${questionRef.id}`);
        }
      });
      
      queryClient.invalidateQueries({ queryKey: ['publicQuestions'] });
      
      setTempDrawing(null);
      setAttachedImage(null);
      setCanvasState(null);
      setIsDrawMode(false);
      setBackgroundImage(null);
      setSelectedBounty(0);
      onClose();
      alert(
        bountyAmount > 0
          ? `질문이 등록되었습니다. 질문자는 익명으로 보호되며, 현상금 ${bountyAmount}광석이 잠금되었습니다.`
          : '질문이 등록되었습니다! 질문자는 공개 보드에서 익명으로 표시됩니다.'
      );
    } catch (err) {
      console.error('Error submitting question:', err);
      setError(
        err.message === 'AGORA_BANNED'
          ? '현재 아고라 게시글 작성이 제한되어 있습니다.'
          : err.message === 'INSUFFICIENT_BOUNTY'
          ? `현상금 ${selectedBounty}광석을 걸기에는 보유 광석이 부족합니다.`
          : '질문 등록에 실패했습니다. 다시 시도해주세요.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <>
      <AnimatePresence>
      <motion.div 
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: isCapturing ? 0 : 1 }}
        exit={{ opacity: 0 }}
        onClick={!isCapturing ? onClose : undefined}
      >
        <motion.div 
          className={`question-modal-content glass ${isDrawMode ? 'drawing-mode' : ''}`}
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          style={{ 
            opacity: isCapturing ? 0 : 1,
            // Use 95% width and max-width 1200px to match CSS
            width: isDrawMode ? '95%' : '90%',
            height: isDrawMode ? '95vh' : 'auto',
            maxWidth: isDrawMode ? '1200px' : '500px',
            transition: 'width 0.3s, height 0.3s'
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className="modal-header">
            <h3>{isDrawMode ? '✏️ 문제의 어느 부분이 이해 안 가나요? 마우스로 그려보세요!' : '🙋 선생님께 질문하기'}</h3>
            <button className="close-btn" onClick={onClose}>&times;</button>
          </div>

          <form onSubmit={handleSubmit} style={{ height: isDrawMode ? '100%' : 'auto', display: 'flex', flexDirection: 'column' }}>
            
            {!isDrawMode && (
              <>
                <div className="quiz-info-badge">
                  {activeContext?.type === 'datalog' && `📄 데이터 로그 - ${activeContext.unitTitle}`}
                  {activeContext?.type === 'video' && `📡 영상 학습 - ${activeContext.transmissionTitle || activeContext.unitTitle}`}
                  {(!activeContext?.type || activeContext?.type === 'quiz') && `${activeContext?.quizTitle} - ${activeContext?.questionId ? '질문 중' : '자유 질문'}`}
                </div>

                <div className="bounty-section">
                  <div className="section-label font-tech">현상금 질문 설정</div>
                  <p className="bounty-copy">
                    공개 질문은 질문자 이름 대신 익명 라벨만 노출됩니다. 현상금을 걸면 채택된 답변자에게 그대로 지급됩니다.
                  </p>
                  <div className="bounty-options">
                    {AGORA_BOUNTY_OPTIONS.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        className={`bounty-chip ${selectedBounty === amount ? 'active' : ''}`}
                        onClick={() => setSelectedBounty(amount)}
                      >
                        {amount === 0 ? '현상금 없음' : `${amount} 광석`}
                      </button>
                    ))}
                  </div>
                  <div className="bounty-note">
                    {isPublic
                      ? selectedBounty > 0
                        ? `채택 시 ${selectedBounty}광석이 답변자에게 이동합니다.`
                        : '현상금 없이 익명 공개 질문으로 등록됩니다.'
                      : '비공개 질문은 현상금이 자동으로 0으로 처리됩니다.'}
                  </div>
                </div>

                {/* 
                <div className="section-label font-tech">분류 선택</div>
                <div className="type-selector">
                  {questionTypes.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      className={`type-chip ${type === t.id ? 'active' : ''}`}
                      onClick={() => setType(t.id)}
                    >
                      <span className="type-icon">{t.icon}</span>
                      <span className="type-label">{t.label}</span>
                    </button>
                  ))}
                </div>
                */}
              </>
            )}

            <div className="draw-toggle-section">
              {/* Drawing preview (from sketch canvas) */}
              {tempDrawing && !isDrawMode ? (
                <div className="drawing-preview-container">
                  <div className="preview-label">첨부된 그림:</div>
                  <div className="preview-box">
                    <img src={tempDrawing} alt="Thumbnail" className="drawing-thumbnail" />
                    <div className="preview-overlay">
                      <button type="button" className="preview-btn edit" onClick={handleToggleDrawMode}>
                        ✏️ 편집
                      </button>
                      <button type="button" className="preview-btn delete" onClick={handleRemoveDrawing}>
                        🗑️ 삭제
                      </button>
                    </div>
                  </div>
                </div>
              ) : attachedImage && !isDrawMode ? (
                /* Uploaded/pasted image preview */
                <div className="drawing-preview-container">
                  <div className="preview-label">첨부된 이미지:</div>
                  <div className="preview-box">
                    <img src={attachedImage} alt="Attached" className="drawing-thumbnail" />
                    <div className="preview-overlay">
                      <button type="button" className="preview-btn delete" onClick={handleRemoveImage}>
                        🗑️ 삭제
                      </button>
                    </div>
                  </div>
                </div>
              ) : !isDrawMode ? (
                /* Attachment buttons: draw (quiz only) + upload */
                <div className="attach-buttons-row">
                  {(activeContext?.quizId !== undefined || activeContext?.type) && (
                    <button 
                      type="button" 
                      className={`draw-toggle-btn ${isDrawMode ? 'active' : ''}`}
                      onClick={handleToggleDrawMode}
                      disabled={isCapturing || isPreparingCapture}
                    >
                      {isCapturing ? '화면 캡처 중...' : (isPreparingCapture ? '캡처 준비 중...' : '🖌️ 그림으로 설명하기')}
                    </button>
                  )}
                  <button 
                    type="button" 
                    className="draw-toggle-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    📎 이미지 첨부
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                </div>
              ) : (
                <button 
                  type="button" 
                  className="draw-toggle-btn active"
                  onClick={handleToggleDrawMode}
                >
                  ↩️ 돌아가기
                </button>
              )}
            </div>

            {isDrawMode ? (
              <div style={{ flex: 1, minHeight: 0 }}>
                <AnnotationCanvas 
                  backgroundImage={backgroundImage} 
                  initialState={canvasState}
                  onComplete={handleAnnotationComplete} 
                  onCancel={handleAnnotationCancel} 
                />
              </div>
            ) : (
              <textarea
                className="question-textarea"
                placeholder="궁금한 점을 자세히 적어주세요... (이미지를 Ctrl+V로 붙여넣기 할 수 있어요!)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onPaste={handlePaste}
                required={!isDrawMode}
              ></textarea>
            )}

            {!isDrawMode && (
              <div className="modal-footer">
                <label className="public-toggle">
                  <input 
                    type="checkbox" 
                    checked={isPublic} 
                    onChange={(e) => setIsPublic(e.target.checked)} 
                  />
                  <span>누구나 볼 수 있게 공개 (질문자는 항상 익명)</span>
                </label>

                <button 
                  type="submit" 
                  className="submit-btn"
                  disabled={isSubmitting || (!content.trim() && !tempDrawing && !attachedImage)}
                >
                  {isSubmitting ? '보내는 중...' : '질문 보내기'}
                </button>
              </div>
            )}
            {error && <p className="error-msg">{error}</p>}
          </form>
        </motion.div>
      </motion.div>
      </AnimatePresence>

      {/* --- Extension Installation Prompt --- */}
      <AnimatePresence>
        {showExtensionPrompt && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            style={{ zIndex: 1100, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass-card"
              style={{ width: '90%', maxWidth: '450px', padding: '2.5rem', textAlign: 'center', border: '1px solid var(--neon-blue)', background: 'linear-gradient(135deg, rgba(10, 20, 40, 0.95), rgba(5, 10, 25, 0.98))' }}
            >
              <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>🛰️</div>
              <h2 className="font-title" style={{ color: 'var(--text-bright)', fontSize: '1.5rem', marginBottom: '1rem' }}>시스템 연동 필요</h2>
              <p className="font-tech" style={{ color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '2rem', textAlign: 'center' }}>
                영상의 <span style={{ color: 'var(--crystal-cyan)', fontWeight: 700 }}>현재 프레임을 100% 정확하게</span> 캡처하려면<br/>
                아고라 커넥트 확장 프로그램을 설치해야 합니다.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <a 
                  href="https://chromewebstore.google.com/detail/lponajbmhhknagjpoicmhhboalpmegbn?utm_source=item-share-cb"
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hud-btn primary glass"
                  style={{ textDecoration: 'none', padding: '1.2rem', fontSize: '1.1rem', background: 'rgba(0, 243, 255, 0.2)', border: '1px solid var(--neon-blue)', color: 'white', borderRadius: '12px', textAlign: 'center', display: 'block' }}
                >
                  시스템 설치하기 (Chrome WEB)
                </a>
                
                <button 
                  onClick={() => {
                    setShowExtensionPrompt(false);
                    setTimeout(() => handleToggleDrawMode({ forceDomCapture: true }), 100);
                  }}
                  className="hud-btn secondary glass"
                  style={{ padding: '0.8rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}
                >
                  기존 방식으로 계속 (정확도 낮음)
                </button>
                
                <button 
                  onClick={() => setShowExtensionPrompt(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', marginTop: '0.5rem', cursor: 'pointer' }}
                >
                  나중에 하기
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isListening && (
        <canvas 
          id="voice-visualizer" 
          style={{ position: 'fixed', bottom: 20, left: 20, width: 150, height: 40, pointerEvents: 'none', opacity: 1, transition: 'opacity 0.3s' }}
        />
      )}
    </>,
    document.body
  );
}
