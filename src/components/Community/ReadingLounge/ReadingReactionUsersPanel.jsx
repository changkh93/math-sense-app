import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Bookmark, BookOpen, Loader, User, ArrowRight, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useReadingShareReactionUsers } from '../../../hooks/useReadingSocial';
import soundManager from '../../../utils/soundManager';
import './ReadingLounge.css';

const MotionDiv = motion.div;

export default function ReadingReactionUsersPanel({
  isOpen,
  onClose,
  shareId,
  reactionType = 'resonated',
  count = 0,
}) {
  const navigate = useNavigate();

  const {
    data: usersData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useReadingShareReactionUsers(shareId, reactionType, { enabled: Boolean(isOpen && shareId) });

  if (!isOpen) return null;

  const users = usersData?.pages?.flatMap((page) => page.users || []) || [];

  const getTitleInfo = () => {
    if (reactionType === 'want_to_read') {
      return {
        icon: <Bookmark size={15} color="#38bdf8" />,
        text: '이 책을 읽고 싶어하는 탐험가',
        color: '#38bdf8',
      };
    }
    if (reactionType === 'read') {
      return {
        icon: <BookOpen size={15} color="#34d399" />,
        text: '이 책을 함께 완독한 탐험가',
        color: '#34d399',
      };
    }
    return {
      icon: <Sparkles size={15} color="#a78bfa" />,
      text: '이 글에 공감한 탐험가',
      color: '#a78bfa',
    };
  };

  const titleInfo = getTitleInfo();

  const handleProfileClick = (uid) => {
    if (!uid) return;
    soundManager?.playClick?.();
    navigate(`/profile/${uid}`);
  };

  return (
    <AnimatePresence>
      <MotionDiv
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        className="reaction-users-inline-panel glass hud-border"
        style={{
          marginTop: '0.65rem',
          padding: '0.9rem 1rem',
          borderRadius: '14px',
          background: 'rgba(15, 23, 42, 0.88)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem', fontWeight: 800, color: '#f8fafc' }}>
            {titleInfo.icon}
            <span>{titleInfo.text}</span>
            <span style={{ color: titleInfo.color, marginLeft: '0.2rem' }}>({users.length || count}명)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '0.2rem',
            }}
            title="목록 접기"
            aria-label="목록 접기"
          >
            <X size={16} />
          </button>
        </div>

        {/* User List */}
        <div
          className="reaction-users-list-scroll"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.45rem',
            maxHeight: '260px',
            minHeight: '40px',
            overflowY: 'auto',
            paddingRight: '0.2rem',
          }}
        >
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1.5rem', color: 'rgba(255,255,255,0.5)' }}>
              <Loader size={18} className="animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.2rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>
              아직 반응을 남긴 탐험가가 없습니다.
            </div>
          ) : (
            users.map((u, idx) => (
              <div
                key={u.id || `rx-user-${idx}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.45rem 0.65rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      flexShrink: 0,
                    }}
                  >
                    {u.displayName?.slice(0, 1) || <User size={13} />}
                  </div>
                  <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.82rem' }}>
                    {u.displayName}
                  </span>
                </div>

                <button
                  type="button"
                  className="space-nav-link font-tech"
                  style={{ fontSize: '0.7rem', padding: '0.2rem 0.45rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                  onClick={() => handleProfileClick(u.id)}
                >
                  <span>프로필</span>
                  <ArrowRight size={11} />
                </button>
              </div>
            ))
          )}

          {hasNextPage && (
            <button
              type="button"
              className="lounge-tab-btn"
              style={{ alignSelf: 'center', marginTop: '0.4rem', fontSize: '0.74rem', padding: '0.25rem 0.6rem' }}
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? '불러오는 중...' : '더 보기'}
            </button>
          )}
        </div>
      </MotionDiv>
    </AnimatePresence>
  );
}
