import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Bookmark, BookOpen, Loader, User, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useReadingShareReactionUsers } from '../../../hooks/useReadingSocial';
import soundManager from '../../../utils/SoundManager';
import './ReadingLounge.css';

const MotionDiv = motion.div;

export default function ReadingReactionUsersModal({
  isOpen,
  onClose,
  shareId,
  initialType = 'resonated',
  reactionCounts = {},
}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(initialType);

  const resonatedCount = reactionCounts.resonated || 0;
  const wantToReadCount = reactionCounts.wantToRead || 0;
  const readCount = reactionCounts.read || 0;

  const {
    data: usersData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useReadingShareReactionUsers(shareId, activeTab, { enabled: Boolean(isOpen && shareId) });

  if (!isOpen) return null;

  const users = usersData?.pages?.flatMap((page) => page.users || []) || [];

  const handleProfileClick = (uid) => {
    if (!uid) return;
    soundManager?.playClick?.();
    onClose();
    navigate(`/profile/${uid}`);
  };

  return (
    <AnimatePresence>
      <div
        className="reading-modal-backdrop"
        onClick={onClose}
        style={{ zIndex: 1100 }}
      >
        <MotionDiv
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="reading-modal-card glass hud-border"
          style={{ width: 'min(440px, 94vw)', maxHeight: '75vh', display: 'flex', flexDirection: 'column' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="reading-modal-header" style={{ marginBottom: '0.8rem', paddingBottom: '0.6rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>반응을 남긴 탐험가</span>
            </h3>
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}
              aria-label="닫기"
            >
              <X size={18} />
            </button>
          </div>

          {/* Reaction Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', marginBottom: '1rem' }}>
            <button
              type="button"
              className={`lounge-tab-btn ${activeTab === 'resonated' ? 'active' : ''}`}
              style={{
                fontSize: '0.78rem',
                padding: '0.45rem 0.3rem',
                justifyContent: 'center',
                borderColor: activeTab === 'resonated' ? '#a78bfa' : undefined,
                color: activeTab === 'resonated' ? '#a78bfa' : undefined,
              }}
              onClick={() => setActiveTab('resonated')}
            >
              <Sparkles size={13} />
              <span>공감 ({resonatedCount})</span>
            </button>

            <button
              type="button"
              className={`lounge-tab-btn ${activeTab === 'want_to_read' ? 'active' : ''}`}
              style={{
                fontSize: '0.78rem',
                padding: '0.45rem 0.3rem',
                justifyContent: 'center',
                borderColor: activeTab === 'want_to_read' ? '#38bdf8' : undefined,
                color: activeTab === 'want_to_read' ? '#38bdf8' : undefined,
              }}
              onClick={() => setActiveTab('want_to_read')}
            >
              <Bookmark size={13} />
              <span>관심 ({wantToReadCount})</span>
            </button>

            <button
              type="button"
              className={`lounge-tab-btn ${activeTab === 'read' ? 'active' : ''}`}
              style={{
                fontSize: '0.78rem',
                padding: '0.45rem 0.3rem',
                justifyContent: 'center',
                borderColor: activeTab === 'read' ? '#34d399' : undefined,
                color: activeTab === 'read' ? '#34d399' : undefined,
              }}
              onClick={() => setActiveTab('read')}
            >
              <BookOpen size={13} />
              <span>완독 ({readCount})</span>
            </button>
          </div>

          {/* User List */}
          <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem', color: 'rgba(255,255,255,0.5)' }}>
                <Loader size={22} className="animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                아직 이 반응을 남긴 탐험가가 없습니다.
              </div>
            ) : (
              <>
              {users.map((u) => (
                <div
                  key={u.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 12,
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        flexShrink: 0,
                      }}
                    >
                      {u.displayName?.slice(0, 1) || <User size={15} />}
                    </div>
                    <div>
                      <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.88rem' }}>
                        {u.displayName}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="space-nav-link font-tech"
                    style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                    onClick={() => handleProfileClick(u.id)}
                  >
                    <span>프로필</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              ))}
              {hasNextPage && (
                <button
                  type="button"
                  className="space-nav-link font-tech"
                  disabled={isFetchingNextPage}
                  onClick={() => fetchNextPage()}
                  style={{ justifyContent: 'center', padding: '0.55rem', marginTop: '0.25rem' }}
                >
                  {isFetchingNextPage ? '불러오는 중…' : '더 보기'}
                </button>
              )}
              </>
            )}
          </div>
        </MotionDiv>
      </div>
    </AnimatePresence>
  );
}
