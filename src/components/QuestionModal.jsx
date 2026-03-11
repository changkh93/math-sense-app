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
import './QuestionModal.css';

export default function QuestionModal({ isOpen, onClose, quizContext }) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [type, setType] = useState('quiz');
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Drawing State
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [tempDrawing, setTempDrawing] = useState(null); // DataURL of final image
  const [canvasState, setCanvasState] = useState(null); // Fabric JSON for re-editing

  // Image Upload State
  const [attachedImage, setAttachedImage] = useState(null); // DataURL of uploaded/pasted image
  const fileInputRef = useRef(null);

  // Prevent background scroll when modal open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

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
        setIsCapturing(true); 
        
        await new Promise(resolve => setTimeout(resolve, 100));

        const element = document.getElementById('quiz-capture-area');
        if (element) {
          try {
            const dataUrl = await htmlToImage.toPng(element, { 
              quality: 0.9,
              pixelRatio: 2,
              backgroundColor: '#1a1a2e',
              skipAutoScale: true,
              cacheBust: true,
              fontEmbedCSS: '', 
              filter: (node) => {
                if (node.tagName === 'LINK' && node.rel === 'stylesheet') {
                   return false; 
                }
                return true;
              }
            });
            setBackgroundImage(dataUrl);
          } catch (captureErr) {
            console.warn('Screen capture failed:', captureErr);
          }
        }
        
        setIsCapturing(false); 
        setIsDrawMode(true);
      } catch (err) {
        console.error('General error entering draw mode:', err);
        setIsCapturing(false);
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
        type,
        category: 'general', 
        isPublic,
        quizId: quizContext?.quizId || null,
        quizContext: {
          chapterId: quizContext?.chapterId || '',
          unitId: quizContext?.unitId || '',
          questionId: quizContext?.questionId || '',
          wrongAnswer: quizContext?.wrongAnswer || null,
          quizTitle: quizContext?.quizTitle || ''
        },
        drawingUrl,
        status: 'open',
        upvotes: 0,
        upvotedBy: [],
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
                  {quizContext?.quizTitle} - {quizContext?.questionId ? `질문 중` : '자유 질문'}
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
                  {quizContext?.questionId && (
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
    </AnimatePresence>,
    document.body
  );
}
