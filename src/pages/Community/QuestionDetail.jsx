import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, CheckCircle, Heart, User } from 'lucide-react';
import { auth } from '../../firebase';
import { useQuestionDetail, useQuestionAnswers, useQAMutations } from '../../hooks/useQA';
import { getRandomNickname } from '../../utils/qaUtils';
import StarField from '../../components/Space/StarField';
import SpaceNavbar from '../../components/Space/SpaceNavbar';
import './QuestionDetail.css';

export default function QuestionDetail() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const [newAnswer, setNewAnswer] = useState('');
  
  const { data: question, isLoading: loadingQ } = useQuestionDetail(questionId);
  const { data: answers, isLoading: loadingA } = useQuestionAnswers(questionId);
  const { upvote, addAnswer, acceptAnswer, selfResolve } = useQAMutations();

  const isOwner = question && auth.currentUser && question.userId === auth.currentUser.uid;
  const isResolved = question?.status === 'resolved';

  const handleAddAnswer = async (e) => {
    e.preventDefault();
    if (!newAnswer.trim()) return;
    
    await addAnswer.mutateAsync({
      questionId,
      content: newAnswer,
      isTeacher: false // Student answer
    });
    setNewAnswer('');
  };

  return (
    <div className="question-detail-container space-bg fadeIn">
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
                <span className={`status-badge status-${question.status}`}>
                  {question.status === 'open' ? '대기중' : question.status === 'answered' ? '답변완료' : '해결됨'}
                </span>
              </div>

              <h2 className="question-content">{question.content}</h2>

              {question.quizContext?.quizTitle && (
                <div className="quiz-context-box glass">
                   📌 관련 퀴즈: {question.quizContext.quizTitle}
                </div>
              )}

              {question.drawingUrl && (
                <div className="question-drawing-container">
                  <h4 className="font-tech" style={{marginBottom: '1rem', color: '#fb923c'}}>📸 첨부된 이미지/드로잉</h4>
                  <img src={question.drawingUrl} alt="Question Drawing" className="question-drawing" />
                </div>
              )}

              <div className="card-footer">
                <button 
                  className={`stat-item ${question.upvotes > 0 ? 'active' : ''}`}
                  onClick={() => upvote.mutate(question.id)}
                >
                  <Heart size={18} fill={question.upvotes > 0 ? "currentColor" : "none"} />
                  <span>나도 궁금해요 {question.upvotes || 0}</span>
                </button>

                {isOwner && !isResolved && (
                  <button 
                    className="stat-item resolve-btn"
                    onClick={() => {
                      if(window.confirm('문제가 해결되었나요? 알려주셔서 감사해요!')) {
                        selfResolve.mutate({ questionId, reason: 'self_solved' });
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
                 <strong className="answers-count font-tech">답변 {answers?.length || 0}개</strong>
                 {loadingA && <div className="loading-spinner-small" />}
              </div>
              
              <div className="answers-list">
                {!answers && loadingA ? (
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
                        {ans.isAccepted && (
                          <span className="accepted-badge"><CheckCircle size={16} /> 채택된 답변</span>
                        )}
                      </div>
                      <div className="answer-content">
                        {ans.content}
                      </div>
                      
                      {isOwner && !isResolved && !ans.isAccepted && (
                        <div className="answer-actions">
                          <button 
                            className="accept-btn-small glass"
                            onClick={() => {
                              if(window.confirm('이 답변을 채택하시겠습니까?')) {
                                acceptAnswer.mutate({ questionId, answerId: ans.id });
                              }
                            }}
                          >
                            이 답변 채택하기
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </section>

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
                className="submit-answer-btn action-flare-small"
                disabled={addAnswer.isLoading || !newAnswer.trim()}
              >
                {addAnswer.isLoading ? '보내는 중...' : '답변 등록하기'}
              </button>
            </motion.form>
          </>
        )}
      </div>
    </div>
  );
}
