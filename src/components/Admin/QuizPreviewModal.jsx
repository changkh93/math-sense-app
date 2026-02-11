import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { InlineMath } from 'react-katex';
import { sanitizeLaTeX } from '../../utils/latexUtils';
import { useQuizzes } from '../../hooks/useContent';
import 'katex/dist/katex.min.css';

export default function QuizPreviewModal({ isOpen, onClose, unitId, quizId }) {
  const { data: quizzes, isLoading: loadingQuizzes } = useQuizzes(unitId);
  
  console.log(`[DEBUG] Preview Modal - UnitId: ${unitId}, QuizId: ${quizId}`);
  console.log(`[DEBUG] Loaded ${quizzes?.length || 0} quizzes for this unit.`);

  const quiz = quizzes?.find(q => q.id === quizId || q.docId === quizId);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ zIndex: 1000 }}
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

          {loadingQuizzes ? (
            <div className="preview-loading">문제를 불러오는 중...</div>
          ) : !quiz ? (
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
          ) : (
            <div className="preview-body">
              <div className="preview-question">
                <p>
                  {sanitizeLaTeX(quiz.question).split(/(\$.*?\$)/g).map((part, i) => 
                    part.startsWith('$') ? <InlineMath key={i} math={part.slice(1, -1)} /> : part
                  )}
                </p>
              </div>

              {quiz.imageUrl && (
                <div className="preview-image">
                  <img src={quiz.imageUrl} alt="Quiz" />
                </div>
              )}

              <div className="preview-options">
                {quiz.options.map((opt, idx) => (
                  <div key={idx} className={`preview-option ${opt.isCorrect ? 'correct' : ''}`}>
                    <span className="opt-idx">{idx + 1}</span>
                    <span className="opt-text">
                      {opt.text.split(/(\$.*?\$)/g).map((part, i) => 
                        part.startsWith('$') ? <InlineMath key={i} math={part.slice(1, -1)} /> : part
                      )}
                    </span>
                    {opt.isCorrect && <Check size={16} className="correct-icon" />}
                  </div>
                ))}
              </div>

              {quiz.hint && (
                <div className="preview-hint">
                  <strong>💡 힌트:</strong> {quiz.hint}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
