import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bookmark, Sparkles, BookOpen, User, ShieldAlert, Edit3, Archive } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useMyReadingReaction, useReadingShare, useSetReadingShareReaction, useWithdrawReadingShare } from '../../../hooks/useReadingSocial';
import ReadingShareComments from './ReadingShareComments';
import ReadingShareReportModal from './ReadingShareReportModal';
import ReadingShareComposer from './ReadingShareComposer';
import './ReadingLounge.css';

const MotionDiv = motion.div;

export default function ReadingShareDetailDrawer({ isOpen, onClose, share }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { data: cachedShare } = useReadingShare(share?.id, {
    enabled: isOpen,
    initialData: share || undefined,
  });
  const currentShare = cachedShare || share;

  // Lazy-load reaction state only when drawer is open! (P0 N+1 fix)
  const { data: myReaction } = useMyReadingReaction(currentShare?.id, { enabled: isOpen });
  const setReactionMutation = useSetReadingShareReaction();
  const withdrawMutation = useWithdrawReadingShare();

  if (!isOpen || !currentShare) return null;

  const isOwner = user?.uid === currentShare.ownerId;
  const wantToReadCount = currentShare.reactionCounts?.wantToRead || 0;
  const resonatedCount = currentShare.reactionCounts?.resonated || 0;

  const handleReactionClick = async (type) => {
    if (isOwner) {
      alert('자신의 추천 글에는 반응할 수 없습니다.');
      return;
    }
    if (setReactionMutation.isPending) return;

    // Toggle: if already active, set to null
    const nextType = myReaction === type ? null : type;
    try {
      await setReactionMutation.mutateAsync({
        shareId: currentShare.id,
        reactionType: nextType,
      });
    } catch (err) {
      alert(err.message || '반응 처리에 실패했습니다.');
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

            {/* Reactions Bar */}
            <div className="drawer-reaction-bar">
              <button
                type="button"
                className={`drawer-reaction-btn want ${myReaction === 'want_to_read' ? 'active' : ''}`}
                onClick={() => handleReactionClick('want_to_read')}
                disabled={isOwner || setReactionMutation.isPending}
                title={isOwner ? '내 글에는 반응할 수 없습니다' : '읽어보고 싶어요'}
              >
                <Bookmark size={16} />
                <span>읽어보고 싶어요 {wantToReadCount > 0 ? `(${wantToReadCount})` : ''}</span>
              </button>

              <button
                type="button"
                className={`drawer-reaction-btn resonated ${myReaction === 'resonated' ? 'active' : ''}`}
                onClick={() => handleReactionClick('resonated')}
                disabled={isOwner || setReactionMutation.isPending}
                title={isOwner ? '내 글에는 반응할 수 없습니다' : '생각이 이어졌어요'}
              >
                <Sparkles size={16} />
                <span>생각이 이어졌어요 {resonatedCount > 0 ? `(${resonatedCount})` : ''}</span>
              </button>
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
