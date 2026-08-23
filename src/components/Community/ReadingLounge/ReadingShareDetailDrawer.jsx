import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bookmark, Sparkles, BookOpen, User, ShieldAlert, Edit3, Archive, CheckCircle2 } from 'lucide-react';
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
import ReadingReactionUsersModal from './ReadingReactionUsersModal';
import './ReadingLounge.css';

const MotionDiv = motion.div;

export default function ReadingShareDetailDrawer({ isOpen, onClose, share }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReadConfirmModalOpen, setIsReadConfirmModalOpen] = useState(false);
  const [reactionUsersModalType, setReactionUsersModalType] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');

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
      alert('자신의 추천 글에는 반응할 수 없습니다.');
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
      alert('자신의 추천 글에는 책 연결을 할 수 없습니다.');
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

  const handleReadConfirm = async () => {
    if (isOwner || linkBookMutation.isPending) return;
    try {
      const res = await linkBookMutation.mutateAsync({
        shareId: currentShare.id,
        intent: 'read',
      });
      setIsReadConfirmModalOpen(false);
      if (res.created) {
        showTemporaryFeedback('📖 완독으로 등록되어 내 책장에 저장되었습니다!');
      } else {
        showTemporaryFeedback('📖 기존 책과 연결되어 완독 처리되었습니다!');
      }
    } catch (err) {
      alert(err.message || '완독 등록에 실패했습니다.');
    }
  };

  const handleWithdraw = async () => {
    if (!window.confirm('이 추천 글을 라운지에서 거두시겠습니까? (이후 다시 공개할 수 있습니다.)')) {
      return;
    }
    try {
      await withdrawMutation.mutateAsync({ shareId: currentShare.id });
      alert('추천 글을 거두었습니다.');
      onClose();
    } catch (err) {
      alert(err.message || '추천 글 거두기에 실패했습니다.');
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div className="share-book-spine" style={{ width: '32px', height: '42px', fontSize: '0.9rem' }}>
                <BookOpen size={15} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
                  {currentShare.bookSnapshot?.title}
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                  {currentShare.bookSnapshot?.author}
                  {currentShare.bookSnapshot?.page ? ` · ${currentShare.bookSnapshot.page}쪽` : ''}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}
              aria-label="닫기"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="reading-drawer-body">
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
                한 줄 평
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.5 }}>
                “{currentShare.review?.oneLine}”
              </div>
            </div>

            {/* Why recommend */}
            {currentShare.review?.reason && (
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem' }}>
                  추천하는 이유
                </div>
                <p style={{ fontSize: '0.92rem', color: '#e2e8f0', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
                  {currentShare.review.reason}
                </p>
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

            {/* Reactions Bar (3-way) with Counts & User List Trigger */}
            <div className="drawer-reaction-bar" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {/* 1. Resonated / 공감 */}
              <div className={`drawer-reaction-btn-group resonated ${isResonated ? 'active' : ''}`}>
                <button
                  type="button"
                  className="drawer-reaction-action-part"
                  onClick={isOwner ? () => setReactionUsersModalType('resonated') : handleResonateClick}
                  disabled={setReactionMutation.isPending}
                  title={isOwner ? '공감한 탐험가 목록 보기' : '생각이 이어졌어요'}
                >
                  <Sparkles size={14} />
                  <span>공감</span>
                </button>
                <button
                  type="button"
                  className="drawer-reaction-count-pill font-tech"
                  onClick={() => setReactionUsersModalType('resonated')}
                  title="공감한 탐험가 목록 보기"
                >
                  {resonatedCount}
                </button>
              </div>

              {/* 2. Want to Read / 읽고 싶어요 */}
              <div className={`drawer-reaction-btn-group want ${isWantToRead ? 'active' : ''}`}>
                <button
                  type="button"
                  className="drawer-reaction-action-part"
                  onClick={isOwner ? () => setReactionUsersModalType('want_to_read') : handleWantToReadClick}
                  disabled={linkBookMutation.isPending}
                  title={isOwner ? '관심 도서로 담은 탐험가 목록 보기' : '내 책장에 관심 도서로 저장'}
                >
                  <Bookmark size={14} />
                  <span>{isWantToRead ? '저장됨' : '읽고 싶어요'}</span>
                </button>
                <button
                  type="button"
                  className="drawer-reaction-count-pill font-tech"
                  onClick={() => setReactionUsersModalType('want_to_read')}
                  title="관심 도서로 담은 탐험가 목록 보기"
                >
                  {wantToReadCount}
                </button>
              </div>

              {/* 3. Already Read / 저도 읽었어요 */}
              <div className={`drawer-reaction-btn-group read ${isRead ? 'active' : ''}`}>
                <button
                  type="button"
                  className="drawer-reaction-action-part"
                  onClick={isOwner ? () => setReactionUsersModalType('read') : () => setIsReadConfirmModalOpen(true)}
                  disabled={linkBookMutation.isPending}
                  title={isOwner ? '함께 완독한 탐험가 목록 보기' : '내 책장에 완독으로 등록'}
                >
                  <BookOpen size={14} />
                  <span>{isRead ? '완독됨' : '저도 읽었어요'}</span>
                </button>
                <button
                  type="button"
                  className="drawer-reaction-count-pill font-tech"
                  onClick={() => setReactionUsersModalType('read')}
                  title="함께 완독한 탐험가 목록 보기"
                >
                  {readCount}
                </button>
              </div>
            </div>

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
                    <span>추천 글 수정</span>
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

      {/* Already Read Confirmation Modal */}
      {isReadConfirmModalOpen && (
        <div className="reading-composer-backdrop" onClick={() => setIsReadConfirmModalOpen(false)}>
          <div
            className="reading-composer-modal glass"
            style={{ maxWidth: '420px', padding: '1.5rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <div className="share-book-spine" style={{ width: '28px', height: '36px' }}>
                <BookOpen size={14} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
                저도 이 책 읽었어요
              </h3>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '1.2rem' }}>
              <strong style={{ color: '#38bdf8' }}>'{currentShare.bookSnapshot?.title}'</strong>을(를) 나의 고전 서재에 <strong>'완독'</strong> 도서로 등록하거나 기존 책과 연결하시겠습니까?
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <button
                type="button"
                className="lounge-tab-btn"
                onClick={() => setIsReadConfirmModalOpen(false)}
                disabled={linkBookMutation.isPending}
              >
                취소
              </button>
              <button
                type="button"
                className="composer-submit-btn"
                style={{ width: 'auto', padding: '0.5rem 1.2rem' }}
                onClick={handleReadConfirm}
                disabled={linkBookMutation.isPending}
              >
                {linkBookMutation.isPending ? '처리 중...' : '완독으로 등록'}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Reaction Users Modal */}
      {reactionUsersModalType && (
        <ReadingReactionUsersModal
          isOpen={Boolean(reactionUsersModalType)}
          onClose={() => setReactionUsersModalType(null)}
          shareId={currentShare.id}
          initialType={reactionUsersModalType}
          reactionCounts={currentShare.reactionCounts || {}}
        />
      )}
    </AnimatePresence>
  );
}
