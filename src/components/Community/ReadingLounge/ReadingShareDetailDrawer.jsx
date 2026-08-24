import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bookmark, Sparkles, BookOpen, User, ShieldAlert, Edit3, Archive, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import {
  useMyReadingReaction,
  useReadingShare,
  useSetReadingShareReaction,
  useLinkReadingShareBook,
  useWithdrawReadingShare,
} from '../../../hooks/useReadingSocial';
import ReadingShareComments from './ReadingShareComments';
import ReadingShareReportModal from './ReadingShareReportModal';
import ReadingShareComposer from './ReadingShareComposer';
import ReadingReactionUsersPanel from './ReadingReactionUsersPanel';
import { getReadingShareStage } from '../../../utils/readingSharePresentation';
import './ReadingLounge.css';

const MotionDiv = motion.div;

export default function ReadingShareDetailDrawer({ isOpen, onClose, share }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [expandedReactionType, setExpandedReactionType] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const toggleExpanded = (type) => {
    setExpandedReactionType((prev) => (prev === type ? null : type));
  };

  const { data: cachedShare } = useReadingShare(share?.id, {
    enabled: isOpen,
    initialData: share || undefined,
  });
  const currentShare = cachedShare || share;

  // Lazy-load reaction state only when drawer is open!
  const { data: myReaction } = useMyReadingReaction(currentShare?.id, { enabled: isOpen });
  const setReactionMutation = useSetReadingShareReaction();
  const linkBookMutation = useLinkReadingShareBook();
  const withdrawMutation = useWithdrawReadingShare();

  if (!isOpen || !currentShare) return null;

  const isOwner = user?.uid === currentShare.ownerId;
  const bookTitle = currentShare.bookSnapshot?.title || currentShare.bookTitle || currentShare.title || '추천 도서';
  const bookAuthor = currentShare.bookSnapshot?.author || currentShare.bookAuthor || currentShare.author || '저자 미상';
  const bookCategory = currentShare.bookSnapshot?.category || currentShare.category;
  const shareStage = getReadingShareStage(currentShare);

  const wantToReadCount = currentShare.reactionCounts?.wantToRead || 0;
  const readCount = currentShare.reactionCounts?.read || 0;
  const resonatedCount = currentShare.reactionCounts?.resonated || 0;

  const isResonated = Boolean(myReaction?.resonated);
  const isWantToRead = myReaction?.readingIntent === 'want_to_read';
  const isRead = myReaction?.readingIntent === 'read';

  const showTemporaryFeedback = (msg) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(''), 3000);
  };

  const handleResonateClick = async () => {
    if (isOwner) {
      alert('자신의 공유 글에는 반응할 수 없습니다.');
      return;
    }
    if (setReactionMutation.isPending) return;

    try {
      await setReactionMutation.mutateAsync({
        shareId: currentShare.id,
        resonated: !isResonated,
      });
      if (!isResonated) {
        showTemporaryFeedback('💡 공감을 전했습니다!');
      }
    } catch (err) {
      alert(err.message || '반응 처리에 실패했습니다.');
    }
  };

  const handleWantToReadClick = async () => {
    if (isOwner) {
      alert('자신의 공유 글에는 책 연결을 할 수 없습니다.');
      return;
    }
    if (linkBookMutation.isPending) return;

    try {
      const res = await linkBookMutation.mutateAsync({
        shareId: currentShare.id,
        intent: 'want_to_read',
      });
      if (res.created) {
        showTemporaryFeedback('🔖 내 책장에 관심 도서로 저장되었습니다!');
      } else if (res.reusedExistingBook) {
        showTemporaryFeedback('🔖 내 책장의 기존 도서와 연결되었습니다!');
      } else {
        showTemporaryFeedback('🔖 내 책장에 관심 도서로 저장되었습니다!');
      }
    } catch (err) {
      alert(err.message || '책장 저장에 실패했습니다.');
    }
  };

  const handleAlreadyReadClick = async () => {
    if (isOwner) {
      alert('자신의 공유 글에는 책 연결을 할 수 없습니다.');
      return;
    }
    if (linkBookMutation.isPending) return;

    try {
      const res = await linkBookMutation.mutateAsync({
        shareId: currentShare.id,
        intent: 'read',
      });
      if (res.created) {
        showTemporaryFeedback('📖 완독 도서로 내 책장에 등록되었습니다!');
      } else {
        showTemporaryFeedback('📖 기존 책과 연결되어 완독 처리되었습니다!');
      }
    } catch (err) {
      alert(err.message || '완독 등록에 실패했습니다.');
    }
  };

  const handleWithdraw = async () => {
    if (!window.confirm('이 공유 글을 라운지에서 거두시겠습니까? (이후 다시 공개할 수 있습니다.)')) {
      return;
    }
    try {
      await withdrawMutation.mutateAsync({ shareId: currentShare.id });
      alert('공유 글을 거두었습니다.');
      onClose();
    } catch (err) {
      alert(err.message || '공유 글 거두기에 실패했습니다.');
    }
  };

  const handleGoToProfile = () => {
    if (currentShare.ownerId) {
      navigate(`/profile/${currentShare.ownerId}`);
    }
  };

  return (
    <AnimatePresence>
      <div className="reading-drawer-backdrop" onClick={onClose}>
        <MotionDiv
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="reading-drawer-panel"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="reading-drawer-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
              <div className="share-book-spine" style={{ width: '28px', height: '36px', fontSize: '0.85rem', flexShrink: 0 }}>
                <BookOpen size={14} />
              </div>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {bookTitle}
                </h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {bookAuthor}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '0.4rem' }}
              aria-label="닫기"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="reading-drawer-body">
            {/* 1. Book Hero Card */}
            <div
              className="drawer-book-hero glass"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1.1rem 1.25rem',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(167, 139, 250, 0.08))',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
              }}
            >
              <div
                className="share-book-spine"
                style={{
                  width: '44px',
                  height: '58px',
                  fontSize: '1.2rem',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                  flexShrink: 0,
                }}
              >
                <BookOpen size={22} color="#38bdf8" />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: '#38bdf8',
                      background: 'rgba(56, 189, 248, 0.15)',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '6px',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {shareStage.kind === 'completed_recommendation' ? '✓' : '📖'} {shareStage.label}
                  </span>
                  {bookCategory && (
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>
                      {bookCategory}
                    </span>
                  )}
                </div>

                <h2
                  style={{
                    margin: 0,
                    fontSize: '1.2rem',
                    fontWeight: 900,
                    color: '#ffffff',
                    lineHeight: 1.35,
                    wordBreak: 'keep-all',
                  }}
                >
                  {bookTitle}
                </h2>

                <p
                  style={{
                    margin: '0.3rem 0 0',
                    fontSize: '0.84rem',
                    color: 'rgba(255, 255, 255, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <span>{bookAuthor}</span>
                </p>
              </div>
            </div>

            {/* Author info & Profile link */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={16} color="#38bdf8" />
                <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.9rem' }}>
                  {currentShare.ownerSnapshot?.displayName || '별빛 탐험가'}
                </span>
              </div>
              <button
                type="button"
                className="lounge-tab-btn"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                onClick={handleGoToProfile}
              >
                책장·프로필 보기
              </button>
            </div>

            {/* One line */}
            <div style={{ padding: '1rem', borderRadius: '14px', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#38bdf8', marginBottom: '0.3rem' }}>
                친구들에게 소개하는 한마디
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.5 }}>
                “{currentShare.review?.oneLine}”
              </div>
            </div>

            {/* Why recommend */}
            {currentShare.review?.reason && (
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem' }}>
                  같이 읽고 싶은 이유
                </div>
                <p style={{ fontSize: '0.92rem', color: '#e2e8f0', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
                  {currentShare.review.reason}
                </p>
              </div>
            )}

            {currentShare.review?.sharedNotes?.length > 0 && (
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#7dd3fc', marginBottom: '0.5rem' }}>
                  함께 공개한 독서 기록 · {currentShare.review.sharedNotes.length}개
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {currentShare.review.sharedNotes.map((note) => (
                    <div key={note.id} style={{ padding: '0.7rem 0.8rem', borderRadius: '10px', background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.14)', color: '#e2e8f0', fontSize: '0.86rem', lineHeight: 1.5 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.2rem', color: '#38bdf8', fontSize: '0.72rem', fontWeight: 800 }}>
                        <span>{note.source === 'assignment' ? '과제' : '메모'}</span>
                        <span style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>{note.date || ''}</span>
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{note.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Question */}
            {currentShare.review?.question && (
              <div style={{ padding: '1rem', borderRadius: '14px', background: 'rgba(167, 139, 250, 0.1)', border: '1px solid rgba(167, 139, 250, 0.25)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#c4b5fd', marginBottom: '0.3rem' }}>
                  함께 나누고 싶은 질문
                </div>
                <div style={{ fontSize: '0.92rem', color: '#f5f3ff', lineHeight: 1.5 }}>
                  {currentShare.review.question}
                </div>
              </div>
            )}

            {/* Feedback notification toast */}
            {feedbackMessage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34d399',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={16} />
                <span>{feedbackMessage}</span>
              </div>
            )}

            {/* Reactions Bar (3-way) with Naver-style Split Dropdown */}
            <div className="drawer-reaction-bar" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {/* 1. Resonated / 공감 */}
              <div className={`drawer-reaction-btn-group resonated ${isResonated ? 'active' : ''}`}>
                <button
                  type="button"
                  className="drawer-reaction-action-part"
                  onClick={isOwner ? () => toggleExpanded('resonated') : handleResonateClick}
                  disabled={setReactionMutation.isPending}
                  title={isOwner ? '공감한 탐험가 목록 보기' : '생각이 이어졌어요'}
                >
                  <Sparkles size={14} />
                  <span>공감 {resonatedCount}</span>
                </button>
                <button
                  type="button"
                  className={`drawer-reaction-dropdown-toggle ${expandedReactionType === 'resonated' ? 'active' : ''}`}
                  onClick={() => toggleExpanded('resonated')}
                  title="공감한 탐험가 목록 열기/접기"
                  aria-label="공감한 탐험가 목록 열기/접기"
                >
                  {expandedReactionType === 'resonated' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>

              {/* 2. Want to Read / 읽고 싶어요 */}
              <div className={`drawer-reaction-btn-group want ${isWantToRead ? 'active' : ''}`}>
                <button
                  type="button"
                  className="drawer-reaction-action-part"
                  onClick={isOwner ? () => toggleExpanded('want_to_read') : handleWantToReadClick}
                  disabled={linkBookMutation.isPending}
                  title={isOwner ? '관심 도서로 담은 탐험가 목록 보기' : '내 책장에 관심 도서로 저장'}
                >
                  <Bookmark size={14} />
                  <span>{isWantToRead ? '저장됨' : '읽고 싶어요'} {wantToReadCount}</span>
                </button>
                <button
                  type="button"
                  className={`drawer-reaction-dropdown-toggle ${expandedReactionType === 'want_to_read' ? 'active' : ''}`}
                  onClick={() => toggleExpanded('want_to_read')}
                  title="관심 도서로 담은 탐험가 목록 열기/접기"
                  aria-label="관심 도서로 담은 탐험가 목록 열기/접기"
                >
                  {expandedReactionType === 'want_to_read' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>

              {/* 3. Already Read / 저도 읽었어요 */}
              <div className={`drawer-reaction-btn-group read ${isRead ? 'active' : ''}`}>
                <button
                  type="button"
                  className="drawer-reaction-action-part"
                  onClick={isOwner ? () => toggleExpanded('read') : handleAlreadyReadClick}
                  disabled={linkBookMutation.isPending}
                  title={isOwner ? '함께 완독한 탐험가 목록 보기' : '내 책장에 완독으로 등록'}
                >
                  <BookOpen size={14} />
                  <span>{isRead ? '완독됨' : '저도 읽었어요'} {readCount}</span>
                </button>
                <button
                  type="button"
                  className={`drawer-reaction-dropdown-toggle ${expandedReactionType === 'read' ? 'active' : ''}`}
                  onClick={() => toggleExpanded('read')}
                  title="함께 완독한 탐험가 목록 열기/접기"
                  aria-label="함께 완독한 탐험가 목록 열기/접기"
                >
                  {expandedReactionType === 'read' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>
            </div>

            {/* Inline Reaction Users Dropdown Panel */}
            {expandedReactionType && (
              <ReadingReactionUsersPanel
                isOpen={Boolean(expandedReactionType)}
                onClose={() => setExpandedReactionType(null)}
                shareId={currentShare.id}
                reactionType={expandedReactionType}
                count={
                  expandedReactionType === 'resonated'
                    ? resonatedCount
                    : expandedReactionType === 'want_to_read'
                    ? wantToReadCount
                    : readCount
                }
              />
            )}

            {/* Comments Section */}
            <ReadingShareComments
              shareId={currentShare.id}
              isOpen={isOpen}
              commentCount={currentShare.commentCount || 0}
            />

            {/* Actions Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              {isOwner ? (
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <button
                    type="button"
                    className="lounge-tab-btn"
                    style={{ fontSize: '0.82rem' }}
                    onClick={() => setIsEditModalOpen(true)}
                  >
                    <Edit3 size={14} />
                    <span>공유 글 수정</span>
                  </button>
                  <button
                    type="button"
                    className="lounge-tab-btn"
                    style={{ fontSize: '0.82rem', color: '#fca5a5' }}
                    onClick={handleWithdraw}
                  >
                    <Archive size={14} />
                    <span>추천 거두기</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="lounge-tab-btn"
                  style={{ fontSize: '0.82rem', color: 'rgba(239, 68, 68, 0.8)' }}
                  onClick={() => setIsReportModalOpen(true)}
                >
                  <ShieldAlert size={14} />
                  <span>신고하기</span>
                </button>
              )}
            </div>
          </div>
        </MotionDiv>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <ReadingShareComposer
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          existingShare={currentShare}
        />
      )}

      {/* Report Modal */}
      {isReportModalOpen && (
        <ReadingShareReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          share={currentShare}
        />
      )}
    </AnimatePresence>
  );
}
