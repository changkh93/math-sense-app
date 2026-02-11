import { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { ReactSketchCanvas } from 'react-sketch-canvas'; 
import * as htmlToImage from 'html-to-image';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ImageService } from '../services/imageService';
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
  const [strokeColor, setStrokeColor] = useState('#ff0000'); // Default Red
  const canvasRef = useRef(null);

  const questionTypes = [
    { id: 'quiz', label: '이 문제 질문', icon: '📝' },
    { id: 'concept', label: '개념 이해 안 됨', icon: '💡' },
    { id: 'wrong', label: '답이 이상함', icon: '❓' },
    { id: 'other', label: '기타', icon: '💬' }
  ];

  const handleToggleDrawMode = async () => {
    if (isDrawMode) {
      // Turn OFF
      setIsDrawMode(false);
      setBackgroundImage(null);
    } else {
      // Turn ON: Capture Background
      try {
        setIsCapturing(true); 
        
        await new Promise(resolve => setTimeout(resolve, 100));

        const element = document.getElementById('quiz-capture-area');
        if (element) {
          try {
            const dataUrl = await htmlToImage.toPng(element, { 
              quality: 0.9, // Slightly reduced to ensure stability
              pixelRatio: 2, // 3 might be too heavy causing timeouts or memory issues
              backgroundColor: '#1a1a2e',
              skipAutoScale: true,
              cacheBust: true,
              // Fix for SecurityError with Google Fonts
              fontEmbedCSS: '', 
              filter: (node) => {
                // Filter out external stylesheets that might cause CORS issues
                if (node.tagName === 'LINK' && node.rel === 'stylesheet') {
                   return false; 
                }
                return true;
              }
            });
            setBackgroundImage(dataUrl);
          } catch (captureErr) {
            console.warn('Screen capture failed (likely CORS or Font issue), falling back to blank canvas:', captureErr);
            // We do NOT want to stop draw mode just because capture failed.
            // But we should try to get at least something or just proceed.
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !isDrawMode) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('로그인이 필요합니다.');

      let drawingUrl = null;

      // Handle Drawing Upload (with Background Merge)
      if (isDrawMode && canvasRef.current) {
        try {
          // 1. Get Drawing Layer (Transparent PNG)
          const drawingDataUrl = await canvasRef.current.exportImage('png');
          
          let finalImageDataUrl = drawingDataUrl;

          // 2. Merge with Background if exists
          if (backgroundImage) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Load images async
            const bgImg = await new Promise((resolve, reject) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.onerror = reject;
              img.src = backgroundImage;
            });

            const drawImg = await new Promise((resolve, reject) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.onerror = reject;
              img.src = drawingDataUrl;
            });

            // Set canvas size to match background
            canvas.width = bgImg.width;
            canvas.height = bgImg.height;

            // Draw Background
            ctx.drawImage(bgImg, 0, 0);
            
            // Draw Drawing Layer on top (scale to fit if needed)
            ctx.drawImage(drawImg, 0, 0, canvas.width, canvas.height);

            finalImageDataUrl = canvas.toDataURL('image/png');
          }

          // 3. Upload Merged Image
          const timestamp = Date.now();
          const path = `drawings/${user.uid}/${timestamp}.png`;
          drawingUrl = await ImageService.uploadImage(finalImageDataUrl, path);

        } catch (imgErr) {
          console.error('Failed to process drawing:', imgErr);
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'questions'), questionData);
      
      queryClient.invalidateQueries({ queryKey: ['publicQuestions'] });
      
      setContent('');
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
            // Use 90vw/90vh for safety to avoid scrollbar issues
            width: isDrawMode ? '90vw' : '90%',
            height: isDrawMode ? '90vh' : 'auto',
            maxWidth: isDrawMode ? 'none' : '500px',
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
              </>
            )}

            <div className="draw-toggle-section">
              <button 
                type="button" 
                className={`draw-toggle-btn ${isDrawMode ? 'active' : ''}`}
                onClick={handleToggleDrawMode}
                disabled={isCapturing}
              >
                {isCapturing ? '화면 캡처 중...' : (isDrawMode ? '↩️ 텍스트 모드로 돌아가기' : '🖌️ 그림으로 설명하기 (베타)')}
              </button>
            </div>

            {isDrawMode ? (
              <div className="canvas-container" style={{ 
                backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
                backgroundSize: 'contain', 
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}>
                <ReactSketchCanvas
                  ref={canvasRef}
                  style={{ background: 'transparent' }}
                  width="100%"
                  height="100%"
                  strokeWidth={4}
                  strokeColor={strokeColor}
                  canvasColor="transparent"
                />
                
                {/* Color Palette */}
                <div className="color-palette">
                  {[
                    { color: '#ff0000', label: 'Red' },
                    { color: '#00d4ff', label: 'Blue' },
                    { color: '#ffd700', label: 'Yellow' }
                  ].map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      className={`color-btn ${strokeColor === c.color ? 'active' : ''}`}
                      style={{ backgroundColor: c.color }}
                      onClick={() => setStrokeColor(c.color)}
                      aria-label={c.label}
                    />
                  ))}
                </div>
                
                <div className="floating-actions">
                  <button 
                    type="button" 
                    className="action-btn clear" 
                    onClick={() => {
                      try {
                        canvasRef.current?.clearCanvas();
                      } catch (e) {
                         console.debug('Canvas clear error (benign):', e);
                      }
                    }}
                  >
                    🗑️ 지우기
                  </button>
                   <button type="submit" className="action-btn submit" disabled={isSubmitting}>
                    {isSubmitting ? '전송 중...' : '질문 등록'}
                  </button>
                </div>
              </div>
            ) : (
              <textarea
                className="question-textarea"
                placeholder="궁금한 점을 자세히 적어주세요..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
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
                  disabled={isSubmitting || (!content.trim() && !isDrawMode)}
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
