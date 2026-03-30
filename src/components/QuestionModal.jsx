import { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { ReactSketchCanvas } from 'react-sketch-canvas'; // KEEP FOR NOW IF NEEDED ELSEWHERE OR REMOVE
import * as htmlToImage from 'html-to-image';
import { db, auth } from '../firebase';
import { collection, addDoc, updateDoc, doc, increment, serverTimestamp } from 'firebase/firestore';
import { ImageService } from '../services/imageService';
import AnnotationCanvas from './AnnotationCanvas';
import { useSpeechToText } from '../hooks/useSpeechToText';
import './QuestionModal.css';

export default function QuestionModal({ isOpen, onClose, quizContext, contextData }) {
  const activeContext = quizContext || contextData;
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [type, setType] = useState('quiz');
  const [isPublic, setIsPublic] = useState(true);
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
  const [tempDrawing, setTempDrawing] = useState(null); // DataURL of final image
  const [canvasState, setCanvasState] = useState(null); // Fabric JSON for re-editing

  // Extension Bridge State
  const [extensionStatus, setExtensionStatus] = useState('unknown'); // 'unknown', 'detected', 'not_found'
  const [showExtensionPrompt, setShowExtensionPrompt] = useState(false);
  const captureResolveRef = useRef(null);

  // Image Upload State
  const [attachedImage, setAttachedImage] = useState(null); // DataURL of uploaded/pasted image
  const fileInputRef = useRef(null);

  // Prevent background scroll when modal open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Detect extension on open
      checkExtension();
    } else {
      document.body.style.overflow = 'auto';
      // Reset state when closing modal to prevent stale data
      setTempDrawing(null);
      setAttachedImage(null);
      setCanvasState(null);
      setBackgroundImage(null);
      setIsDrawMode(false);
      setIsCapturing(false);
      setError(null);
      setShowExtensionPrompt(false);
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  // Handle messages from Extension Bridge
  useEffect(() => {
    const handleBridgeMessage = (event) => {
      const { type, dataUrl, error, version } = event.data;
      
      if (type === 'AGORA_PONG') {
        console.log('🌌 Agora Extension Bridge Detected. Version:', version);
        setExtensionStatus('detected');
      }

      if (type === 'AGORA_CAPTURE_RESPONSE') {
        if (captureResolveRef.current) {
          if (dataUrl) captureResolveRef.current({ dataUrl });
          else captureResolveRef.current({ error });
          captureResolveRef.current = null;
        }
      }
    };

    window.addEventListener('message', handleBridgeMessage);
    return () => window.removeEventListener('message', handleBridgeMessage);
  }, []);

  const checkExtension = () => {
    setExtensionStatus('unknown');
    window.postMessage({ type: 'AGORA_PING' }, window.location.origin);
    // Set a timeout to mark as not found if no pong received
    setTimeout(() => {
      setExtensionStatus(prev => prev === 'unknown' ? 'not_found' : prev);
    }, 1000);
  };

  const questionTypes = [
    { id: 'quiz', label: '이 문제 질문', icon: '📝' },
    { id: 'concept', label: '개념 이해 안 됨', icon: '💡' },
    { id: 'wrong', label: '답이 이상함', icon: '❓' },
    { id: 'other', label: '기타', icon: '💬' }
  ];

  const handleToggleDrawMode = async () => {
    if (isDrawMode) {
      // Exit drawing mode without automatic saving (user must click Complete Attachment)
      setIsDrawMode(false);
    } else {
      // Turn ON: Capture Background
      try {
        // 혁신적 해결책: 영상 캡처 시 확장 프로그램 사용 시도
        if (activeContext?.type === 'video') {
          if (extensionStatus === 'not_found') {
             setShowExtensionPrompt(true);
             return; // Don't proceed to draw mode if user needs extension for accuracy
          }
          
          if (extensionStatus === 'detected') {
            setIsCapturing(true);
            document.body.classList.add('is-capturing');
            document.body.classList.add('is-extension-capturing');
            
            // Request capture from bridge with a small delay to ensure modal is hidden
            const capturePromise = new Promise(resolve => {
              captureResolveRef.current = resolve;
              
              // CRITICAL: Wait for modal to hide via framer-motion
              setTimeout(() => {
                window.postMessage({ type: 'AGORA_CAPTURE_REQUEST' }, window.location.origin);
              }, 300);

              // Timeout fallback
              setTimeout(() => {
                if (captureResolveRef.current === resolve) {
                  resolve({ error: 'Extension response timeout' });
                  captureResolveRef.current = null;
                }
              }, 6000);
            });

            const result = await capturePromise;
            if (result.dataUrl) {
              setBackgroundImage(result.dataUrl);
               // Success! Skip html2image logic
              return; 
            }
            console.warn('Extension capture failed, falling back to legacy capture:', result.error);
          }
        }

        setBackgroundImage(null); 
        setIsCapturing(true); 
        document.body.classList.add('is-capturing');
        
        // Wait for class change / UI state to settle
        await new Promise(resolve => setTimeout(resolve, 200));

        const element = document.getElementById('quiz-capture-area');
        if (element) {
          const captureOptions = {
            quality: 0.9,
            pixelRatio: 2,
            backgroundColor: '#050a19',
            cacheBust: true,
            filter: (node) => {
              // Skip problematic modal/UI elements
              if (node.classList?.contains('modal-overlay')) return false;
              if (node.classList?.contains('capture-hide')) return false;
              // Skip style/link nodes that might trigger SecurityError if crossorigin fails
              // We keep it broad but usually cross-origin links are the culprit
              if (node.tagName === 'LINK' && node.rel === 'stylesheet') {
                try {
                  // If we can't access rules, it's a security risk to keep it during capture
                  if (node.sheet && !node.sheet.cssRules) return false;
                } catch (e) {
                  console.warn('Skipping stylesheet due to potential SecurityError:', node.href);
                  return false;
                }
              }
              return true;
            }
          };

          try {
            // Precise Viewport Capture for Data Log
            const scrollEl = element.querySelector('.mission-content-view');
            const cardEl = scrollEl?.querySelector('.glass-card');
            
            if (scrollEl && cardEl && activeContext?.type === 'datalog') {
              const scrollTop = scrollEl.scrollTop;
              const viewportHeight = scrollEl.clientHeight;
              const viewportWidth = scrollEl.clientWidth;
              const ratio = 2; // Capture at 2x for clarity

              // Capture the full content card first
              const fullCanvas = await htmlToImage.toCanvas(cardEl, {
                ...captureOptions,
                quality: 1,
                pixelRatio: ratio
              });

              // Crop the visible part onto a new canvas
              const cropCanvas = document.createElement('canvas');
              cropCanvas.width = viewportWidth * ratio;
              cropCanvas.height = viewportHeight * ratio;
              const ctx = cropCanvas.getContext('2d');
              
              if (ctx) {
                ctx.drawImage(
                  fullCanvas,
                  0, scrollTop * ratio, cardEl.clientWidth * ratio, viewportHeight * ratio,
                  0, 0, viewportWidth * ratio, viewportHeight * ratio
                );
                setBackgroundImage(cropCanvas.toDataURL('image/png'));
              }
            } else {
              // Fallback for types without special scrolling needs (like video or quiz)
              const dataUrl = await htmlToImage.toPng(element, captureOptions);
              setBackgroundImage(dataUrl);
            }
          } catch (captureErr) {
            console.error('Screen capture failed with Error:', captureErr);
            setError('화면을 캡처하는 중 보안 오류가 발생했습니다. 브라우저 설정이나 확장 프로그램을 확인해 주세요.');
          }
        } else {
          console.warn('Capture target element #quiz-capture-area not found.');
        }
      } catch (err) {
        console.error('General error entering draw mode:', err);
      } finally {
        setIsCapturing(false);
        document.body.classList.remove('is-capturing');
        document.body.classList.remove('is-extension-capturing');
        setIsDrawMode(true);
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

      const questionData = {
        userId: user.uid,
        userName: user.displayName || '익명 학생',
        content,
        type: activeContext?.type || type,
        category: 'general', 
        isPublic,
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
        upvotes: 0,
        upvotedBy: [],
        answerCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'questions'), questionData);
      
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          questionCount: increment(1)
        });
      } catch (updateErr) {
        console.warn('Failed to update question count:', updateErr);
      }
      
      queryClient.invalidateQueries({ queryKey: ['publicQuestions'] });
      
      setTempDrawing(null);
      setAttachedImage(null);
      setCanvasState(null);
      setIsDrawMode(false);
      setBackgroundImage(null);
      onClose();
      alert('질문이 등록되었습니다! 선생님이 확인 후 답변해주실 거예요.');
    } catch (err) {
      console.error('Error submitting question:', err);
      setError('질문 등록에 실패했습니다. 다시 시도해주세요.');
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
                      disabled={isCapturing}
                    >
                      {isCapturing ? '화면 캡처 중...' : '🖌️ 그림으로 설명하기'}
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
                  <span>다른 친구들도 볼 수 있게 공개 (익명)</span>
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
                    // Start legacy capture as fallback even if they don't install, but warn them
                    setShowExtensionPrompt(false);
                    // Force legacy capture by tricking status
                    setExtensionStatus('ignoring');
                    setTimeout(() => handleToggleDrawMode(), 100);
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
