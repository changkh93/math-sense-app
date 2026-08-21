import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, Plus, Loader, Telescope, Sparkles, UserCheck } from 'lucide-react';
import { useReadingShareFeed, useReadingShare } from '../../../hooks/useReadingSocial';
import { useAuth } from '../../../hooks/useAuth';
import ReadingShareCard from './ReadingShareCard';
import ReadingShareDetailDrawer from './ReadingShareDetailDrawer';
import ReadingShareComposer from './ReadingShareComposer';
import './ReadingLounge.css';

export default function ReadingLoungeView() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'my'
  const [selectedShare, setSelectedShare] = useState(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const highlightId = searchParams.get('highlight');
  const { data: highlightedShare } = useReadingShare(highlightId, {
    enabled: Boolean(highlightId && !selectedShare),
  });

  const currentSelectedShare = selectedShare || highlightedShare || null;

  const {
    data: feedData,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useReadingShareFeed({
    ownerId: activeTab === 'my' ? user?.uid : null,
  });

  const shares = feedData?.pages?.flatMap((p) => p.items) || [];

  const handleSelectShare = (share) => {
    setSelectedShare(share);
  };

  const handleCloseDrawer = () => {
    setSelectedShare(null);
    if (highlightId) {
      setSearchParams((prev) => {
        prev.delete('highlight');
        return prev;
      }, { replace: true });
    }
  };

  return (
    <div className="reading-lounge-container">
      {/* Toolbar */}
      <div className="reading-lounge-toolbar glass">
        <div className="reading-lounge-tabs">
          <button
            type="button"
            className={`lounge-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <Sparkles size={16} />
            <span>최근 추천</span>
          </button>
          <button
            type="button"
            className={`lounge-tab-btn ${activeTab === 'my' ? 'active' : ''}`}
            onClick={() => setActiveTab('my')}
          >
            <UserCheck size={16} />
            <span>내가 추천한 책</span>
          </button>
        </div>

        <button
          type="button"
          className="lounge-write-btn"
          onClick={() => setIsComposerOpen(true)}
        >
          <Plus size={16} />
          <span>추천 글 쓰기</span>
        </button>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '240px', gap: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
          <Loader size={28} className="animate-spin" color="#38bdf8" />
          <span>독서 라운지의 추천들을 불러오는 중...</span>
        </div>
      ) : isError ? (
        <div className="glass" style={{ padding: '2rem', textAlign: 'center', borderRadius: '16px' }}>
          <p style={{ color: '#fca5a5', fontWeight: 700 }}>추천 글을 불러오지 못했습니다.</p>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>{error?.message || '잠시 후 다시 시도해 주세요.'}</p>
        </div>
      ) : shares.length === 0 ? (
        <div className="empty-state glass">
          <Telescope size={48} opacity={0.3} className="empty-icon" />
          <div className="empty-text">
            <h3>{activeTab === 'my' ? '아직 추천한 책이 없어요' : '독서 라운지가 아직 조용하네요'}</h3>
            <p>
              {activeTab === 'my'
                ? '내 서재에서 인상 깊게 읽은 책을 추천해 보세요!'
                : '스스로 읽고 느낀 생각을 나누는 첫 번째 추천 글을 남겨보세요.'}
            </p>
            <button
              type="button"
              className="lounge-write-btn"
              style={{ margin: '1rem auto 0' }}
              onClick={() => setIsComposerOpen(true)}
            >
              <Plus size={16} />
              <span>추천 글 작성하기</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="reading-shares-grid">
            {shares.map((share) => (
              <ReadingShareCard
                key={share.id}
                share={share}
                onSelect={handleSelectShare}
              />
            ))}
          </div>

          {hasNextPage && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem 0' }}>
              <button
                type="button"
                className="lounge-tab-btn"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? '더 불러오는 중...' : '추천 글 더 보기'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Detail Drawer */}
      {currentSelectedShare && (
        <ReadingShareDetailDrawer
          isOpen={Boolean(currentSelectedShare)}
          onClose={handleCloseDrawer}
          share={currentSelectedShare}
        />
      )}

      {/* Composer Modal */}
      {isComposerOpen && (
        <ReadingShareComposer
          isOpen={isComposerOpen}
          onClose={() => setIsComposerOpen(false)}
        />
      )}
    </div>
  );
}
