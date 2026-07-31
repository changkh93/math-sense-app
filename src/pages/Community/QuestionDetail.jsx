import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle, Clock, Heart, User, Trash2, Edit3, X, Save, Sparkles, Reply, Send } from 'lucide-react';
import { LinkPreviewList, normalizeEscapedNewlines, parseInlineFormatting } from '../../utils/formatUtils';
import 'katex/dist/katex.min.css';
import { db } from '../../firebase';
import { updateDoc, doc } from 'firebase/firestore';
import { useQuestionDetail, useQuestionAnswers, useQAMutations } from '../../hooks/useQA';
import { AGORA_BOUNTY_OPTIONS, buildAnswerProfileSnapshot, getProfileFrame, getQuestionAnonymousLabel } from '../../utils/socialUtils';
import { useAuth } from '../../hooks/useAuth';
import StarField from '../../components/Space/StarField';
import SpaceNavbar from '../../components/Space/SpaceNavbar';
import QuizPreviewModal from '../../components/Admin/QuizPreviewModal';
import ModularShip from '../../components/Space/ModularShip';
import confetti from 'canvas-confetti';
import './QuestionDetail.css';

const MotionDiv = motion.div;
const MotionForm = motion.form;
const QUESTION_SINGLE_LINE_LEAD_LENGTH = 18;

const splitQuestionContent = (content) => {
  const normalized = normalizeEscapedNewlines(content || '').trim();
  if (!normalized) return { lead: '', body: '' };

  const lines = normalized.split('\n');
  const firstContentIndex = lines.findIndex((line) => line.trim());
  if (firstContentIndex < 0) return { lead: '', body: '' };

  const leadLine = lines[firstContentIndex].trim();
  const remaining = lines.slice(firstContentIndex + 1).join('\n').trim();
  if (remaining) return { lead: leadLine, body: remaining };

  const chars = Array.from(leadLine);
  if (chars.length <= QUESTION_SINGLE_LINE_LEAD_LENGTH + 10) {
    return { lead: leadLine, body: '' };
  }

  return {
    lead: chars.slice(0, QUESTION_SINGLE_LINE_LEAD_LENGTH).join(''),
    body: chars.slice(QUESTION_SINGLE_LINE_LEAD_LENGTH).join('').trimStart()
  };
};

const getDateFromTimestamp = (timestamp) => {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp.toDate === 'function') return timestamp.toDate();
  if (typeof timestamp.toMillis === 'function') return new Date(timestamp.toMillis());
  if (typeof timestamp.seconds === 'number') return new Date(timestamp.seconds * 1000);
  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    const parsed = new Date(timestamp);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

const formatAgoraTimestamp = (timestamp) => {
  const date = getDateFromTimestamp(timestamp);
  if (!date) return '시간 확인 중';

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
};

export default function QuestionDetail() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const { user: sessionUser, userData: sessionUserData } = useAuth();
  const [newAnswer, setNewAnswer] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editBounty, setEditBounty] = useState(0);
  const [isCooldown, setIsCooldown] = useState(false);
  const [isDrawingModalOpen, setIsDrawingModalOpen] = useState(false);
  const [activeReplyAnswerId, setActiveReplyAnswerId] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingAnswerId, setEditingAnswerId] = useState(null);
  const [editAnswerContent, setEditAnswerContent] = useState('');

  const { data: question, isLoading: loadingQ } = useQuestionDetail(questionId);
  const { data: answers, isLoading: loadingA, error: errorA } = useQuestionAnswers(questionId);
  const { upvote, addAnswer, acceptAnswer, selfResolve, deleteQuestion, updateQuestion, updateAnswer, deleteAnswer } = useQAMutations();

  const [showRewardMask, setShowRewardMask] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);

  const topLevelAnswers = React.useMemo(
    () => (answers || []).filter((answer) => !answer.parentAnswerId),
    [answers]
  );

  const repliesByParent = React.useMemo(() => {
    const grouped = {};
    (answers || []).forEach((answer) => {
      if (!answer.parentAnswerId) return;
      if (!grouped[answer.parentAnswerId]) grouped[answer.parentAnswerId] = [];
      grouped[answer.parentAnswerId].push(answer);
    });
    return grouped;
  }, [answers]);

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

  // --- SELF-HEALING: Sync answerCount if out of sync ---
  React.useEffect(() => {
    if (question && answers && !loadingQ && !loadingA) {
      const actualCount = topLevelAnswers.length;
      if (question.answerCount !== actualCount) {
        console.log(`🧹 Self-healing: Syncing answerCount for question ${questionId}. Expected: ${actualCount}, Found: ${question.answerCount}`);
        updateDoc(doc(db, 'questions', questionId), {
          answerCount: actualCount
        }).catch(err => console.warn('Failed self-healing sync:', err));
      }
    }
  }, [question, answers, topLevelAnswers.length, loadingQ, loadingA, questionId]);

  const isOwner = question && sessionUser && question.userId === sessionUser.uid;
  const isResolved = question?.status === 'resolved';

  useEffect(() => {
    if (!isDrawingModalOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsDrawingModalOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDrawingModalOpen]);

  // Debug log for troubleshooting adoption issues
  React.useEffect(() => {
    if (question && sessionUser) {
      console.log('🔍 Question Detail Debug:', {
        questionId,
        questionStatus: question.status,
        questionUserId: question.userId,
        currentUserId: sessionUser.uid,
        isOwner,
        isResolved
      });
    }
  }, [question, sessionUser, isOwner, isResolved, questionId]);

  const handleAddAnswer = async (e) => {
    e.preventDefault();
    if (!newAnswer.trim() || addAnswer.isPending || isCooldown) return;
    
    const content = newAnswer.trim();
    setIsCooldown(true);
    
    try {
      await addAnswer.mutateAsync({
        questionId,
        content: content,
        isTeacher: false
      });
      
      // Clear input ONLY upon success
      setNewAnswer(''); 
      
      // Cooldown for 3 seconds to prevent double posting accidentally
      setTimeout(() => setIsCooldown(false), 3000);
    } catch (error) {
      setIsCooldown(false);
      console.error("Failed to post answer:", error);
      alert('답변 전송 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const handleAddReply = async (parentAnswerId) => {
    if (!replyContent.trim() || addAnswer.isPending) return;

    const content = replyContent.trim();
    try {
      await addAnswer.mutateAsync({
        questionId,
        content,
        isTeacher: false,
        parentAnswerId
      });
      setReplyContent('');
      setActiveReplyAnswerId(null);
    } catch (error) {
      console.error("Failed to post answer reply:", error);
      alert('답글 전송 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const handleStartEditAnswer = (answer) => {
    setEditingAnswerId(answer.id);
    setEditAnswerContent(answer.content);
    setActiveReplyAnswerId(null);
  };

  const handleSaveEditAnswer = async (answer) => {
    if (!editAnswerContent.trim()) return;
    try {
      await updateAnswer.mutateAsync({
        questionId,
        answerId: answer.id,
        content: editAnswerContent
      });
      setEditingAnswerId(null);
      setEditAnswerContent('');
    } catch (err) {
      console.error('Failed to update answer:', err);
      alert(
        err?.message?.includes('채택된 답변')
          ? '채택된 답변은 수정할 수 없어요.'
          : '답변 수정 중 오류가 발생했습니다. 다시 시도해주세요.'
      );
    }
  };

  const handleDeleteAnswer = async (answer) => {
    if (!window.confirm('정말 이 답변을 삭제하시겠습니까?')) return;
    try {
      await deleteAnswer.mutateAsync({ questionId, answerId: answer.id });
      if (editingAnswerId === answer.id) {
        setEditingAnswerId(null);
        setEditAnswerContent('');
      }
    } catch (err) {
      console.error('Failed to delete answer:', err);
      alert(
        err?.message?.includes('채택된 답변')
          ? '채택된 답변은 삭제할 수 없어요.'
          : '답변 삭제 중 오류가 발생했습니다. 다시 시도해주세요.'
      );
    }
  };

  const handleDeleteQuestion = async () => {
    if (window.confirm('정말 이 질문을 삭제하시겠습니까?')) {
      await deleteQuestion.mutateAsync(questionId);
      navigate('/agora');
    }
  };

  const isBountyFinalized =
    question?.bountyStatus === 'awarded' ||
    question?.bountyStatus === 'forfeited' ||
    Boolean(question?.acceptedAnswerId);

  const handleStartEdit = () => {
    setEditContent(question.content);
    setEditBounty(question.bountyAmount || 0);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    try {
      await updateQuestion.mutateAsync({
        questionId,
        content: editContent,
        bountyAmount: isBountyFinalized ? undefined : editBounty
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update question:', err);
      const message = err?.message === 'BOUNTY_FINALIZED'
        ? '이미 답변이 채택되어 현상금을 변경할 수 없어요.'
        : err?.message === 'INSUFFICIENT_BOUNTY'
          ? '광석이 부족하여 현상금을 변경할 수 없어요.'
          : '질문 수정 중 오류가 발생했습니다. 다시 시도해주세요.';
      alert(message);
    }
  };

  const questionAuthorLabel = question?.isPublic === false
    ? (question?.userName || '비공개 질문')
    : getQuestionAnonymousLabel(question);

  const getAnswerPresentation = (answer) => {
    const liveProfile = answer.userId === sessionUser?.uid
      ? buildAnswerProfileSnapshot(sessionUserData, sessionUserData?.studentName || sessionUser?.displayName || '탐험가')
      : null;
    const profile = answer.publicProfileSnapshot || liveProfile || {};
    const displayName = answer.isTeacher
      ? '관리자'
      : (profile.displayName || answer.userName || '답변자');
    const title = profile.publicTitle || '';
    const frameName = profile.frameName || getProfileFrame(profile.profileFrameId).name || '';
    const crewName = profile.crewName || '';
    const signature = profile.publicSignature || '';
    const frameAccent = profile.frameAccent || (answer.isTeacher ? 'var(--star-gold)' : 'var(--crystal-cyan)');
    const frameBackground = profile.frameBackground || 'rgba(255, 255, 255, 0.04)';

    return { profile, displayName, title, frameName, crewName, signature, frameAccent, frameBackground };
  };

  const renderAnswerIdentity = (answer, timeLabel = '답변') => {
    const {
      profile,
      displayName,
      title,
      frameName,
      crewName,
      signature,
      frameAccent,
      frameBackground
    } = getAnswerPresentation(answer);
    const canOpenPublicProfile = Boolean(answer.userId) && !answer.isTeacher && answer.userId !== 'admin';
    const identityCardStyle = {
      border: `1px solid ${frameAccent}55`,
      background: frameBackground,
    };
    const identityCardContent = (
      <>
        {!answer.isTeacher && (
          <div className="answer-identity-ship" aria-hidden="true">
            <ModularShip userData={profile} size={64} animate={false} />
          </div>
        )}
        <div className="answer-identity-top">
          <span className="answer-identity-name">{displayName}</span>
          {signature && !answer.isTeacher && (
            <span style={{
              maxWidth: '240px',
              padding: '2px 8px',
              borderRadius: '999px',
              background: `${frameAccent}18`,
              border: `1px solid ${frameAccent}55`,
              color: frameAccent,
              fontSize: '0.72rem',
              lineHeight: 1.3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {signature}
            </span>
          )}
          {title && <span className="answer-identity-title">{title}</span>}
          {frameName && (
            <span className="answer-identity-frame">
              {frameName}
            </span>
          )}
        </div>
        {(crewName || !answer.isTeacher) && (
          <div className="answer-identity-meta">
            {crewName && <span style={{ color: profile.crewColor || frameAccent }}>🛰️ {crewName}</span>}
            {!crewName && !answer.isTeacher && <span>공개 답변자</span>}
          </div>
        )}
        <div className="answer-time-row" title={getDateFromTimestamp(answer.createdAt)?.toLocaleString('ko-KR') || undefined}>
          <Clock size={13} />
          <span>{timeLabel} {formatAgoraTimestamp(answer.createdAt)}</span>
        </div>
      </>
    );

    return (
      <div className="author-info">
        {answer.isTeacher && <span className="teacher-badge">선생님</span>}
        {canOpenPublicProfile ? (
          <button
            type="button"
            className={`answer-identity-card answer-identity-card-link ${!answer.isTeacher ? 'has-ship' : ''}`}
            style={identityCardStyle}
            onClick={() => navigate(`/profile/${answer.userId}`)}
            aria-label={`${displayName}님의 탐험기지 보기`}
          >
            {identityCardContent}
          </button>
        ) : (
          <div className={`answer-identity-card ${!answer.isTeacher ? 'has-ship' : ''}`} style={identityCardStyle}>
            {identityCardContent}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`question-detail-container space-bg fadeIn`}>
      <StarField />
      <div className="nebula-bg" />
      <SpaceNavbar currentView="agora" />

      <div className="detail-content-wrapper">
        <header className="detail-header">
          <button className="back-btn-minimal" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} /> 아고라 성단으로
          </button>
        </header>

        {loadingQ && !question ? (
          <div className="loading-state glass">질문을 불러오는 중...</div>
        ) : !question ? (
          <div className="error-screen glass">질문을 찾을 수 없습니다.</div>
        ) : (
          <>
            <MotionDiv 
              className="main-question-card glass"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="question-meta">
                <div className="question-author-block">
                  <div className="author-info">
                    <div className="author-avatar"><User size={16} /></div>
                    <span>{questionAuthorLabel}</span>
                  </div>
                  <span className="agora-time-label" title={getDateFromTimestamp(question.createdAt)?.toLocaleString('ko-KR') || undefined}>
                    <Clock size={14} />
                    작성 {formatAgoraTimestamp(question.createdAt)}
                  </span>
                </div>
                <div className="status-container">
                  <span className={`status-badge status-${question.status}`}>
                    {question.status === 'open' ? '대기중' : question.status === 'answered' ? '답변완료' : '해결됨'}
                  </span>
                  {isOwner && (
                    <div className="owner-actions">
                      <button className="owner-action-btn edit-btn" onClick={handleStartEdit} title="수정">
                        <Edit3 size={14} />
                        <span>수정</span>
                      </button>
                      <button className="owner-action-btn delete-btn" onClick={handleDeleteQuestion} title="삭제" disabled={deleteQuestion.isPending}>
                        <Trash2 size={14} />
                        <span>삭제</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="question-anon-banner">
                <span>🕶️ 질문자는 공개 보드에서 익명 보호</span>
                {(question.bountyAmount || 0) > 0 && (
                  <span className="question-bounty-chip">💎 현상금 {question.bountyAmount}</span>
                )}
              </div>

              {isEditing ? (
                <div className="edit-question-box">
                  <textarea
                    className="edit-textarea glass"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                  />
                  <div className={`bounty-section ${isBountyFinalized ? 'bounty-section-disabled' : ''}`}>
                    <div className="section-label font-tech">현상금 질문 설정</div>
                    <p className="bounty-copy">
                      {isBountyFinalized
                        ? '이미 답변이 채택되어 현상금을 변경할 수 없어요.'
                        : '현상금을 변경하면 보유 광석에서 차액이 자동으로 정산됩니다.'}
                    </p>
                    <div className="bounty-options">
                      {AGORA_BOUNTY_OPTIONS.map((amount) => (
                        <button
                          key={amount}
                          type="button"
                          className={`bounty-chip ${editBounty === amount ? 'active' : ''}`}
                          onClick={() => setEditBounty(amount)}
                          disabled={isBountyFinalized || updateQuestion.isPending}
                        >
                          {amount === 0 ? '현상금 없음' : `${amount} 광석`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="edit-actions">
                    <button className="cancel-btn glass" onClick={() => setIsEditing(false)}>
                      <X size={16} /> 취소
                    </button>
                    <button className="save-btn glass" onClick={handleSaveEdit} disabled={updateQuestion.isPending}>
                      <Save size={16} /> {updateQuestion.isPending ? '저장 중...' : '저장'}
                    </button>
                  </div>
                </div>
              ) : (
                (() => {
                  const { lead, body } = splitQuestionContent(question.content);

                  return (
                    <div className={`question-content ${body ? '' : 'single-line'}`}>
                      {lead && (
                        <div className="question-content-lead">
                          {parseInlineFormatting(lead, { keyPrefix: 'q-detail-lead' })}
                        </div>
                      )}
                      {body && (
                        <div className="question-content-body">
                          {parseInlineFormatting(body, { keyPrefix: 'q-detail-body' })}
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
              <LinkPreviewList text={question.content} keyPrefix={`question-link-${question.id}`} />

              {question.quizContext && (question.quizContext.quizTitle || question.quizContext.transmissionTitle) && (
                <MotionDiv 
                  className={`quiz-context-box glass clickable context-${question.type || 'quiz'}`}
                  onClick={() => setIsPreviewOpen(true)}
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(0, 243, 255, 0.1)' }}
                  whileTap={{ scale: 0.98 }}
                >
                   {question.type === 'video' ? '📡 관련 영상: ' : question.type === 'datalog' ? '📄 관련 데이터: ' : '📌 관련 퀴즈: '}
                   {question.quizContext.transmissionTitle || question.quizContext.quizTitle}
                   <span className="preview-hint-text">미리보기 클릭</span>
                </MotionDiv>
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
                  <button
                    type="button"
                    className="question-drawing-trigger"
                    onClick={() => setIsDrawingModalOpen(true)}
                    aria-label="첨부 이미지 크게 보기"
                  >
                    <img src={question.drawingUrl} alt="Question Drawing" className="question-drawing" />
                    <span className="question-drawing-zoom-hint">클릭해서 크게 보기</span>
                  </button>
                </div>
              )}

              <div className="card-footer">
                <button 
                  className={`stat-item ${question.upvotedBy?.includes(sessionUser?.uid) ? 'active' : ''}`}
                  onClick={() => { if (!upvote.isPending) upvote.mutate(question.id); }}
                  disabled={upvote.isPending}
                >
                  <Heart size={18} fill={question.upvotedBy?.includes(sessionUser?.uid) ? "currentColor" : "none"} />
                  <span>나도 궁금해요 {question.upvotes || 0}</span>
                </button>

                {isOwner && !isResolved && (
                  <button 
                    className="stat-item resolve-btn"
                    onClick={async () => {
                      if(window.confirm('문제가 해결되었나요? 알려주셔서 감사해요!')) {
                        await selfResolve.mutateAsync({ questionId, reason: 'self_solved' });
                      }
                    }}
                  >
                    <CheckCircle size={18} />
                    <span>스스로 해결했어요!</span>
                  </button>
                )}
              </div>
            </MotionDiv>

            <section className="answers-section">
              <div className="answers-header-row">
                 <strong className="answers-count font-tech">
                   답변 {loadingA ? '...' : topLevelAnswers.length}개
                 </strong>
                 {loadingA && <div className="loading-spinner-small" />}
              </div>
              
              <div className="answers-list">
                {errorA ? (
                  <div className="error-msg glass">답변을 불러오는데 실패했습니다. (인덱스 생성 중일 수 있습니다)</div>
                ) : !answers && loadingA ? (
                  Array.from({length: 2}).map((_, i) => <div key={i} className="answer-skeleton glass" />)
                  ) : topLevelAnswers.length === 0 ? (
                  <div className="empty-answers font-tech">아직 답변이 없어요. 첫 번째 힌트를 남겨보세요!</div>
                ) : (
                  topLevelAnswers.map((ans) => (
                    (() => {
                      const replies = repliesByParent[ans.id] || [];
                      const isReplying = activeReplyAnswerId === ans.id;
                      const isAnswerEditing = editingAnswerId === ans.id;
                      const isAnswerOwner = ans.userId === sessionUser?.uid;
                      const canManageAnswer = isAnswerOwner && !ans.isAccepted;

                      return (
                    <MotionDiv
                      key={ans.id}
                      className={`answer-card glass ${ans.isTeacher ? 'teacher-answer' : ''} ${ans.isAccepted ? 'accepted' : ''}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="card-header">
                        {renderAnswerIdentity(ans, '답변')}

                        <div className="header-right-actions">
                          {ans.isAccepted && (
                            <span className="accepted-badge"><CheckCircle size={16} /> 채택된 답변</span>
                          )}

                          {isOwner && !isResolved && !ans.isAccepted && (
                            <button
                              className="accept-btn-small glass"
                              onClick={async () => {
                                const bountyNotice = (question.bountyAmount || 0) > 0
                                  ? `\n예치된 현상금 ${question.bountyAmount}개도 함께 지급됩니다.`
                                  : '';
                                if (window.confirm(`이 답변을 채택하면 내 광석 20개가 답변자에게 지급됩니다.${bountyNotice}`)) {
                                  try {
                                    await acceptAnswer.mutateAsync({ questionId, answerId: ans.id });
                                    triggerVictory(5);
                                  } catch (err) {
                                    console.error('채택 실패:', err);
                                    const message = err?.message?.includes('내 광석 20개가 필요')
                                      ? '채택 보상을 지급하려면 광석 20개가 필요해요.'
                                      : `답변 채택 중 오류가 발생했습니다: ${err.message}`;
                                    alert(message);
                                  }
                                }
                              }}
                              disabled={acceptAnswer.isPending}
                            >
                              이 답변 채택하기
                            </button>
                          )}

                          {canManageAnswer && !isAnswerEditing && (
                            <div className="owner-actions">
                              <button className="owner-action-btn edit-btn" onClick={() => handleStartEditAnswer(ans)} title="수정">
                                <Edit3 size={14} />
                                <span>수정</span>
                              </button>
                              <button className="owner-action-btn delete-btn" onClick={() => handleDeleteAnswer(ans)} title="삭제" disabled={deleteAnswer.isPending}>
                                <Trash2 size={14} />
                                <span>삭제</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {isAnswerEditing ? (
                        <div className="edit-answer-box">
                          <textarea
                            className="edit-textarea glass"
                            value={editAnswerContent}
                            onChange={(e) => setEditAnswerContent(e.target.value)}
                          />
                          <div className="edit-actions">
                            <button className="cancel-btn glass" onClick={() => { setEditingAnswerId(null); setEditAnswerContent(''); }}>
                              <X size={16} /> 취소
                            </button>
                            <button className="save-btn glass" onClick={() => handleSaveEditAnswer(ans)} disabled={updateAnswer.isPending || !editAnswerContent.trim()}>
                              <Save size={16} /> {updateAnswer.isPending ? '저장 중...' : '저장'}
                            </button>
                          </div>
                        </div>
                      ) : (
                      <div className="answer-content">
                        {parseInlineFormatting(ans.content, {
                          keyPrefix: `ans-detail-${ans.id}`,
                          boldColor: ans.isTeacher ? 'var(--star-gold)' : 'var(--crystal-cyan)'
                        })}
                      </div>
                      )}
                      <div className="answer-actions-row">
                        <button
                          type="button"
                          className={`answer-reply-toggle ${isReplying ? 'active' : ''}`}
                          onClick={() => {
                            setActiveReplyAnswerId(isReplying ? null : ans.id);
                            setReplyContent('');
                          }}
                        >
                          <Reply size={15} />
                          <span>{isReplying ? '답글 닫기' : '답글 달기'}</span>
                        </button>
                        {replies.length > 0 && (
                          <span className="answer-reply-count">답글 {replies.length}개</span>
                        )}
                      </div>

                      {isReplying && (
                        <div className="answer-reply-form">
                          <textarea
                            className="answer-reply-textarea"
                            placeholder="이 답변에 이어서 질문하거나 답해주세요."
                            value={replyContent}
                            onChange={(event) => setReplyContent(event.target.value)}
                          />
                          <div className="answer-reply-form-actions">
                            <button
                              type="button"
                              className="answer-reply-cancel"
                              onClick={() => {
                                setActiveReplyAnswerId(null);
                                setReplyContent('');
                              }}
                            >
                              취소
                            </button>
                            <button
                              type="button"
                              className="answer-reply-submit"
                              disabled={addAnswer.isPending || !replyContent.trim()}
                              onClick={() => handleAddReply(ans.id)}
                            >
                              <Send size={14} />
                              {addAnswer.isPending ? '보내는 중...' : '답글 등록'}
                            </button>
                          </div>
                        </div>
                      )}

                      {replies.length > 0 && (
                        <div className="answer-replies-list">
                          {replies.map((reply) => {
                            const isReplyEditing = editingAnswerId === reply.id;
                            const isReplyOwner = reply.userId === sessionUser?.uid;
                            const canManageReply = isReplyOwner && !reply.isAccepted;
                            return (
                            <div key={reply.id} className={`answer-reply-card ${reply.isTeacher ? 'teacher-reply' : ''}`}>
                              <div className="answer-reply-header">
                                {renderAnswerIdentity(reply, '답글')}
                                {canManageReply && !isReplyEditing && (
                                  <div className="owner-actions reply-owner-actions">
                                    <button className="owner-action-btn edit-btn" onClick={() => handleStartEditAnswer(reply)} title="수정">
                                      <Edit3 size={13} />
                                      <span>수정</span>
                                    </button>
                                    <button className="owner-action-btn delete-btn" onClick={() => handleDeleteAnswer(reply)} title="삭제" disabled={deleteAnswer.isPending}>
                                      <Trash2 size={13} />
                                      <span>삭제</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                              {isReplyEditing ? (
                                <div className="edit-answer-box">
                                  <textarea
                                    className="answer-reply-textarea"
                                    value={editAnswerContent}
                                    onChange={(e) => setEditAnswerContent(e.target.value)}
                                  />
                                  <div className="answer-reply-form-actions">
                                    <button
                                      type="button"
                                      className="answer-reply-cancel"
                                      onClick={() => { setEditingAnswerId(null); setEditAnswerContent(''); }}
                                    >
                                      취소
                                    </button>
                                    <button
                                      type="button"
                                      className="answer-reply-submit"
                                      disabled={updateAnswer.isPending || !editAnswerContent.trim()}
                                      onClick={() => handleSaveEditAnswer(reply)}
                                    >
                                      {updateAnswer.isPending ? '저장 중...' : '저장'}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                              <div className="answer-reply-content">
                                {parseInlineFormatting(reply.content, {
                                  keyPrefix: `ans-reply-${reply.id}`,
                                  boldColor: reply.isTeacher ? 'var(--star-gold)' : 'var(--crystal-cyan)'
                                })}
                              </div>
                              )}
                            </div>
                            );
                          })}
                        </div>
                      )}
                    </MotionDiv>
                      );
                    })()
                  ))
                )}
              </div>
            </section>

            {!isOwner && (
              <MotionForm 
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
              </MotionForm>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {isDrawingModalOpen && question?.drawingUrl && (
          <MotionDiv
            className="drawing-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsDrawingModalOpen(false)}
          >
            <button
              type="button"
              className="drawing-modal-close"
              onClick={() => setIsDrawingModalOpen(false)}
              aria-label="첨부 이미지 닫기"
            >
              <X size={24} strokeWidth={3} aria-hidden="true" />
            </button>
            <MotionDiv
              className="drawing-modal-stage"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ duration: 0.18 }}
              onClick={(event) => event.stopPropagation()}
            >
              <img src={question.drawingUrl} alt="확대된 첨부 이미지" className="drawing-modal-image" />
            </MotionDiv>
          </MotionDiv>
        )}

        {showRewardMask && (
          <MotionDiv 
            className="reward-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MotionDiv 
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
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}
