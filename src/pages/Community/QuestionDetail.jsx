import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, CheckCircle, Heart, User, Trash2, Edit3, X, Save, Sparkles } from 'lucide-react';
import { parseInlineFormatting } from '../../utils/formatUtils';
import 'katex/dist/katex.min.css';
import { auth } from '../../firebase';
import { useQuestionDetail, useQuestionAnswers, useQAMutations } from '../../hooks/useQA';
import { getRandomNickname } from '../../utils/qaUtils';
import StarField from '../../components/Space/StarField';
import SpaceNavbar from '../../components/Space/SpaceNavbar';
import QuizPreviewModal from '../../components/Admin/QuizPreviewModal';
import confetti from 'canvas-confetti';
import './QuestionDetail.css';

export default function QuestionDetail() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const [newAnswer, setNewAnswer] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isCooldown, setIsCooldown] = useState(false);
  
  const { data: question, isLoading: loadingQ } = useQuestionDetail(questionId);
  const { data: answers, isLoading: loadingA, error: errorA } = useQuestionAnswers(questionId);
  const { upvote, addAnswer, acceptAnswer, selfResolve, deleteQuestion, updateQuestion } = useQAMutations();

  const [showRewardMask, setShowRewardMask] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);

  const triggerVictory = (amount) => {
    setRewardAmount(amount);
    setShowRewardMask(true);
    
    const end = Date.now() + (3 * 1000);
    const colors = ['#00f3ff', '#ffffff', '#ffd700'];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());

    setTimeout(() => setShowRewardMask(false), 4000);
  };

  const isOwner = question && auth.currentUser && question.userId === auth.currentUser.uid;
  const isResolved = question?.status === 'resolved';

  const handleAddAnswer = async (e) => {
    e.preventDefault();
    if (!newAnswer.trim() || addAnswer.isPending || isCooldown) return;
    
    const content = newAnswer.trim();
    setNewAnswer(''); // Clear immediately for better UX
    setIsCooldown(true);
    
    try {
      await addAnswer.mutateAsync({
        questionId,
        content: content,
        isTeacher: false
      });
      
      // Cooldown for 3 seconds to prevent double posting accidentally
      setTimeout(() => setIsCooldown(false), 3000);
    } catch (error) {
      setNewAnswer(content); // Restore if failed
      setIsCooldown(false);
      console.error("Failed to post answer:", error);
    }
  };

  const handleDeleteQuestion = async () => {
    if (window.confirm('정말 이 질문을 삭제하시겠습니까?')) {
      await deleteQuestion.mutateAsync(questionId);
      navigate('/agora');
    }
  };

  const handleStartEdit = () => {
    setEditContent(question.content);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    await updateQuestion.mutateAsync({ questionId, content: editContent });
    setIsEditing(false);
  };

  return (
    <div className={`question-detail-container space-bg fadeIn`}>
      <StarField />
      <div className="nebula-bg" />
      <SpaceNavbar currentView="agora" />

      <div className="detail-content-wrapper">
        <header className="detail-header">
          <button className="back-btn-minimal" onClick={() => navigate('/agora')}>
            <ArrowLeft size={20} /> 아고라 성단으로
          </button>
        </header>

        {loadingQ && !question ? (
          <div className="loading-state glass">질문을 불러오는 중...</div>
        ) : !question ? (
          <div className="error-screen glass">질문을 찾을 수 없습니다.</div>
        ) : (
          <>
            <motion.div 
              className="main-question-card glass"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="question-meta">
                <div className="author-info">
                  <div className="author-avatar"><User size={16} /></div>
                  <span>{getRandomNickname(question.userId)}</span>
                </div>
                <div className="status-container">
                  <span className={`status-badge status-${question.status}`}>
                    {question.status === 'open' ? '대기중' : question.status === 'answered' ? '답변완료' : '해결됨'}
                  </span>
                  {isOwner && (
                    <div className="owner-actions">
                      <button className="icon-btn edit-btn" onClick={handleStartEdit} title="수정">
                        <Edit3 size={16} />
                      </button>
                      <button className="icon-btn delete-btn" onClick={handleDeleteQuestion} title="삭제">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="edit-question-box">
                  <textarea 
                    className="edit-textarea glass"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                  />
                  <div className="edit-actions">
                    <button className="cancel-btn glass" onClick={() => setIsEditing(false)}>
                      <X size={16} /> 취소
                    </button>
                    <button className="save-btn glass" onClick={handleSaveEdit}>
                      <Save size={16} /> 저장
                    </button>
                  </div>
                </div>
              ) : (
                <h2 className="question-content">
                  {parseInlineFormatting(question.content, { keyPrefix: 'q-detail' })}
                </h2>
              )}

              {question.quizContext && (question.quizContext.quizTitle || question.quizContext.transmissionTitle) && (
                <motion.div 
                  className={`quiz-context-box glass clickable context-${question.type || 'quiz'}`}
                  onClick={() => setIsPreviewOpen(true)}
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(0, 243, 255, 0.1)' }}
                  whileTap={{ scale: 0.98 }}
                >
                   {question.type === 'video' ? '📡 관련 영상: ' : question.type === 'datalog' ? '📄 관련 데이터: ' : '📌 관련 퀴즈: '}
                   {question.quizContext.transmissionTitle || question.quizContext.quizTitle}
                   <span className="preview-hint-text">미리보기 클릭</span>
                </motion.div>
              )}

              <QuizPreviewModal 
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                unitId={question.quizContext?.unitId}
                quizId={question.quizContext?.questionId}
                videoId={question.quizContext?.videoId}
                startTime={question.quizContext?.startTime}
                type={question.type}
                title={question.quizContext?.transmissionTitle || question.quizContext?.quizTitle}
                showCorrectAnswer={false}
                showHint={false}
              />

              {question.drawingUrl && (
                <div className="question-drawing-container">
                  <h4 className="font-tech" style={{marginBottom: '1rem', color: '#fb923c'}}>📸 첨부된 이미지/드로잉</h4>
                  <img src={question.drawingUrl} alt="Question Drawing" className="question-drawing" />
                </div>
              )}

              <div className="card-footer">
                <button 
                  className={`stat-item ${question.upvotedBy?.includes(auth.currentUser?.uid) ? 'active' : ''}`}
                  onClick={() => { if (!upvote.isPending) upvote.mutate(question.id); }}
                  disabled={upvote.isPending}
                >
                  <Heart size={18} fill={question.upvotedBy?.includes(auth.currentUser?.uid) ? "currentColor" : "none"} />
                  <span>나도 궁금해요 {question.upvotes || 0}</span>
                </button>

                {isOwner && !isResolved && (
                  <button 
                    className="stat-item resolve-btn"
                    onClick={async () => {
                      if(window.confirm('문제가 해결되었나요? 알려주셔서 감사해요!')) {
                        await selfResolve.mutateAsync({ questionId, reason: 'self_solved' });
                        triggerVictory(3);
                      }
                    }}
                  >
                    <CheckCircle size={18} />
                    <span>스스로 해결했어요!</span>
                  </button>
                )}
              </div>
            </motion.div>

            <section className="answers-section">
              <div className="answers-header-row">
                 <strong className="answers-count font-tech">
                   답변 {loadingA ? '...' : (answers?.length || 0)}개
                 </strong>
                 {loadingA && <div className="loading-spinner-small" />}
              </div>
              
              <div className="answers-list">
                {errorA ? (
                  <div className="error-msg glass">답변을 불러오는데 실패했습니다. (인덱스 생성 중일 수 있습니다)</div>
                ) : !answers && loadingA ? (
                  Array.from({length: 2}).map((_, i) => <div key={i} className="answer-skeleton glass" />)
                ) : answers?.length === 0 ? (
                  <div className="empty-answers font-tech">아직 답변이 없어요. 첫 번째 힌트를 남겨보세요!</div>
                ) : (
                  answers?.map((ans) => (
                    <motion.div 
                      key={ans.id} 
                      className={`answer-card glass ${ans.isTeacher ? 'teacher-answer' : ''} ${ans.isAccepted ? 'accepted' : ''}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="card-header">
                        <div className="author-info">
                          {ans.isTeacher && <span className="teacher-badge">선생님</span>}
                          <span>{ans.isTeacher ? '관리자' : getRandomNickname(ans.userId)}</span>
                        </div>
                        
                        <div className="header-right-actions">
                          {ans.isAccepted && (
                            <span className="accepted-badge"><CheckCircle size={16} /> 채택된 답변</span>
                          )}
                          
                          {isOwner && !isResolved && !ans.isAccepted && (
                            <button
                              className="accept-btn-small glass"
                              onClick={async () => {
                                if (window.confirm('이 답변을 채택하시겠습니까? (보상이 지급됩니다)')) {
                                  try {
                                    await acceptAnswer.mutateAsync({ questionId, answerId: ans.id });
                                    triggerVictory(5);
                                  } catch (err) {
                                    console.error('채택 실패:', err);
                                    alert('답변 채택 중 오류가 발생했습니다: ' + err.message);
                                  }
                                }
                              }}
                              disabled={acceptAnswer.isPending}
                            >
                              이 답변 채택하기
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="answer-content">
                        {parseInlineFormatting(ans.content, { 
                          keyPrefix: `ans-detail-${ans.id}`,
                          boldColor: ans.isTeacher ? 'var(--star-gold)' : 'var(--crystal-cyan)'
                        })}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </section>

            {!isOwner && (
              <motion.form 
                className="new-answer-form glass"
                onSubmit={handleAddAnswer}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h4 className="font-title">나의 생각 나누기</h4>
                <textarea
                  className="answer-textarea"
                  placeholder="친구에게 도움이 될 만한 힌트나 생각을 적어주세요!"
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                ></textarea>
                <button 
                  type="submit" 
                  className={`submit-answer-btn action-flare-small ${(addAnswer.isPending || isCooldown) ? 'disabled' : ''}`}
                  disabled={addAnswer.isPending || !newAnswer.trim() || isCooldown}
                >
                  {addAnswer.isPending ? '보내는 중...' : isCooldown ? '완료! (대기중)' : '답변 등록하기'}
                </button>
              </motion.form>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {showRewardMask && (
          <motion.div 
            className="reward-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="reward-content glass"
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 1.5, opacity: 0 }}
            >
              <Sparkles className="reward-icon" size={48} />
              <h2 className="font-title">탐사 완료!</h2>
              <p>성공적으로 문제를 해결했습니다.</p>
              <div className="reward-badge font-tech">
                💎 +{rewardAmount} CRYSTALS
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
