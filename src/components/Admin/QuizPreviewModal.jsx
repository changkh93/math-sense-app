import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { parseInlineFormatting, sanitizeLaTeX } from '../../utils/formatUtils';
import { InlineMath } from 'react-katex';
import { useQuizzes, useUnit } from '../../hooks/useContent';
import MissionMarkdownViewer from '../Space/MissionMarkdownViewer';
import 'katex/dist/katex.min.css';

import ReactDOM from 'react-dom';

// Helper to transform Google Drive view links to preview links
const getEmbeddablePdfUrl = (url) => {
  if (!url) return null;
  const driveViewMatch = url.match(/drive\.google\.com\/file\/d\/([^\/\?]+)/);
  if (driveViewMatch && driveViewMatch[1]) {
    return `https://drive.google.com/file/d/${driveViewMatch[1]}/preview`;
  }
  return url;
};

export default function QuizPreviewModal({ 
  isOpen, 
  onClose, 
  unitId, 
  quizId,
  videoId,
  startTime,
  type = 'quiz',
  title = '',
  showCorrectAnswer = true,
  showHint = true
}) {
  const { data: quizzes, isLoading: loadingQuizzes } = useQuizzes(type === 'quiz' ? unitId : null);
  const { data: unit, isLoading: loadingUnit } = useUnit(type !== 'quiz' ? unitId : null);
  
  // console.log(`[DEBUG] Preview Modal - UnitId: ${unitId}, QuizId: ${quizId}`);

  const quiz = type === 'quiz' ? quizzes?.find(q => q.id === quizId || q.docId === quizId) : null;
  const isLoading = type === 'quiz' ? loadingQuizzes : loadingUnit;

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div 
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ zIndex: 9999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <motion.div 
          className="quiz-preview-modal glass"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="modal-header">
            <h3>문제 미리보기</h3>
            <button className="close-btn" onClick={onClose}><X size={20} /></button>
          </div>

          {isLoading ? (
            <div className="preview-loading">정보를 불러오는 중...</div>
          ) : type === 'quiz' && !quiz ? (
            <div className="preview-error">
              <p>문제를 찾을 수 없습니다.</p>
              <div style={{ fontSize: '0.8rem', marginTop: '1rem', opacity: 0.7 }}>
                Unit: {unitId || '(없음)'}<br/>
                ID: {quizId || '(없음)'}
              </div>
              {!unitId && (
                <p style={{ fontSize: '0.85rem', color: '#ffbd69', marginTop: '1rem' }}>
                  ⚠️ 이전 버전에서 작성된 질문은 단원 정보가 누락되어 미리보기가 제한될 수 있습니다.
                </p>
              )}
            </div>
          ) : type === 'video' ? (
            <div className="preview-body video-preview">
               <div className="video-info-box glass" style={{ marginBottom: '1.5rem' }}>
                 <div className="video-icon">📡</div>
                 <div className="video-details">
                    <h4>교신 영상 정보</h4>
                    <p className="video-title">{title || unit?.title}</p>
                    <p className="unit-name text-muted">{unit?.title} 학습 중</p>
                 </div>
               </div>
               
               {videoId ? (
                 <div className="video-player-preview glass" style={{ position: 'relative', width: '100%', paddingTop: '56.25%', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0, 243, 255, 0.3)' }}>
                   <iframe
                     style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                     src={`https://www.youtube.com/embed/${videoId}?start=${startTime || 0}&autoplay=0&rel=0&modestbranding=1`}
                     title="Question Video Context"
                     allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                     allowFullScreen
                   ></iframe>
                 </div>
               ) : (
                 <div className="preview-hint" style={{ marginTop: '2rem', textAlign: 'center', opacity: 0.8 }}>
                   영상을 시청하며 궁금한 점을 질문했습니다.
                 </div>
               )}
            </div>
          ) : type === 'datalog' ? (
            <div className="preview-body datalog-preview">
               <div className="datalog-header glass">
                 📄 {title || unit?.title} - 데이터 로그 본문
               </div>
               <div className="datalog-content-scroll glass" style={{ maxHeight: '600px', overflowY: 'auto', padding: '1.5rem', marginTop: '1rem', background: 'rgba(5, 10, 25, 0.6)' }}>
                  {unit?.learningContents ? (
                    <>
                      {unit.learningContents?.pdfUrl && (
                        <div style={{ marginBottom: '1.5rem', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0, 243, 255, 0.2)' }}>
                          <iframe 
                            src={getEmbeddablePdfUrl(unit.learningContents.pdfUrl)}
                            title="Learning Data PDF Preview"
                            style={{ width: '100%', height: '500px', border: 'none' }}
                          />
                        </div>
                      )}
                      <MissionMarkdownViewer text={unit.learningContents?.text ?? unit.learningContents} />
                    </>
                  ) : (
                    <p className="text-muted">학습 데이터를 불러올 수 없습니다.</p>
                  )}
               </div>
            </div>
          ) : (
            <div className="preview-body">
              <div className="preview-question">
                <p>
                  {parseInlineFormatting(quiz.question, { keyPrefix: 'preview-q' })}
                </p>
              </div>

              {quiz.imageUrl && (
                <div className="preview-image">
                  <img src={quiz.imageUrl} alt="Quiz" />
                </div>
              )}

              <div className="preview-options">
                {quiz.options.map((opt, idx) => (
                  <div key={idx} className={`preview-option ${showCorrectAnswer && opt.isCorrect ? 'correct' : ''}`}>
                    <span className="opt-idx">{idx + 1}</span>
                    <span className="opt-text">
                      {parseInlineFormatting(opt.text, { keyPrefix: `preview-opt-${idx}` })}
                    </span>
                    {showCorrectAnswer && opt.isCorrect && <Check size={16} className="correct-icon" />}
                  </div>
                ))}
              </div>

              {showHint && quiz.hint && (
                <div className="preview-hint">
                  <strong>💡 힌트:</strong> {quiz.hint}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
