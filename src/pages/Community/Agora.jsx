import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, ArrowLeft, Plus, Search, Telescope, X, ChevronDown, Loader } from 'lucide-react';
import { usePublicQuestions, useQAMutations } from '../../hooks/useQA';
import { getAnonymousLabel } from '../../utils/socialUtils';
import QuestionModal from '../../components/QuestionModal';
import StarField from '../../components/Space/StarField';
import SpaceNavbar from '../../components/Space/SpaceNavbar';
import AgoraLiveTicker from '../../components/Community/AgoraLiveTicker';
import StarMessageInput from '../../components/Community/StarMessageInput';
import AgoraMotivationPanel from '../../components/Community/AgoraMotivationPanel';
import AssignmentShareFeed from '../../components/Community/AssignmentShareFeed';
import { useAuth } from '../../hooks/useAuth';
import './Agora.css';

const MotionDiv = motion.div;

export default function Agora() {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get('filter') || 'all';
  const searchTermParam = searchParams.get('search') || '';
  const highlightId = searchParams.get('highlight');
  
  // Local state for immediate UI feedback on search
  const [searchTerm, setSearchTerm] = useState(searchTermParam);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Apply filters — now uses useInfiniteQuery
  const { 
    data: paginatedData, 
    isLoading, 
    isError, 
    error, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = usePublicQuestions(filter);
  const { upvote } = useQAMutations();

  // Flatten all pages into a single array
  const allQuestions = React.useMemo(() => {
    if (!paginatedData?.pages) return [];
    return paginatedData.pages.flatMap(page => page.items);
  }, [paginatedData]);
  // --- State Sync to URL ---
  const setFilter = (newFilter) => {
    setSearchParams(prev => {
      prev.set('filter', newFilter);
      prev.delete('highlight'); // Reset highlight when filter changes
      return prev;
    }, { replace: true });
  };

  // Debounce search term update to URL to prevent excessive re-renders/fetches
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearchParams(prev => {
        if (searchTerm) prev.set('search', searchTerm);
        else prev.delete('search');
        // prev.delete('highlight'); // Keep highlight if it exists, or maybe delete it?
        return prev;
      }, { replace: true });
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, setSearchParams]);

  // Sync local searchTerm if URL changes (e.g. browser back/forward)
  React.useEffect(() => {
    setSearchTerm(searchTermParam);
  }, [searchTermParam]);

  const questions = React.useMemo(() => {
    let filtered = allQuestions;
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(q => 
        q.content?.toLowerCase().includes(term) || 
        q.quizContext?.quizTitle?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [allQuestions, searchTerm]);

  const filters = [
    { id: 'all', label: '전체 질문', icon: '🌌' },
    { id: 'unanswered', label: '대기 중', icon: '🚨' },
    { id: 'solved', label: '해결됨', icon: '✅' },
    { id: 'archive', label: '기록 공개', icon: '📖' },
    { id: 'my', label: '내 질문', icon: '🧑‍🚀' }
  ];

  const handleUpvote = (e, id) => {
    e.stopPropagation();
    if (upvote.isPending) return; // Prevent rapid clicks
    upvote.mutate(id);
  };

  return (
    <div className={`agora-container space-bg fadeIn`}>
      <StarField />
      <div className="nebula-bg" />
      <SpaceNavbar currentView="agora" />
      
      <div className="agora-content-wrapper">
        <header className="agora-header">
          <div className="ticker-row">
            <AgoraLiveTicker />
            <StarMessageInput />
          </div>
          <div className="agora-title">
            <h1 className="gradient-text">스텔라 아고라</h1>
            <p className="font-tech subtitle">궁금한 개념을 묻고, 성단의 친구들과 짧은 한마디를 나누어보세요!</p>
          </div>
        </header>

        <div className="agora-controls">
          <div className="agora-filters">
            {filters.map(f => (
              <button
                key={f.id}
                className={`filter-btn glass ${filter === f.id ? 'active' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                <span className="filter-icon">{f.icon}</span>
                <span className="filter-label">{f.label}</span>
              </button>
            ))}
          </div>
          
          <div className="agora-search-bar glass">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="궁금한 키워드로 검색해보세요..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="clear-btn" onClick={() => setSearchTerm('')}>
                <X size={16} />
              </button>
            )}
          </div>
        </div>
        <div className="agora-layout-grid">
          <main className="agora-main">
            {filter === 'archive' ? (
              <AssignmentShareFeed highlightId={highlightId} />
            ) : isLoading ? (
              <div className="loading-state">질문을 불러오는 중...</div>
        ) : isError ? (
          <div className="error-state glass">
             <div className="error-icon">🛰️</div>
             <h3>데이터를 불러오지 못했습니다</h3>
             <p className="error-msg">{error?.message || '알 수 없는 오류가 발생했습니다.'}</p>
             <p className="hint">인덱스가 생성 중이거나 통신에 문제가 있을 수 있습니다. <br/>브라우저 콘솔을 확인해 보세요.</p>
             <button className="retry-btn" onClick={() => window.location.reload()}>다시 시도</button>
          </div>
        ) : !questions || questions.length === 0 ? (
          <div className="empty-state glass">
            <Telescope size={48} opacity={0.3} className="empty-icon" />
            {searchTerm ? (
              <div className="empty-text">
                <h3>'{searchTerm}'에 대한 검색 결과가 없어요</h3>
                <p>다른 키워드로 다시 별을 찾아보시겠어요?</p>
                <button className="reset-search-btn" onClick={() => setSearchTerm('')}>검색 초기화</button>
              </div>
            ) : (
              <div className="empty-text">
                <h3>성운이 아직 텅 비어있네요</h3>
                <p>첫 번째 질문을 올려서 나만의 별을 쏘아보세요!</p>
              </div>
            )}
          </div>
        ) : (
          <>
          <div className="questions-grid">
            <AnimatePresence mode="popLayout">
              {questions.map((q, idx) => (
                (() => {
                  const anonymousLabel = q.isPublic === false
                    ? (q.userName || '비공개 질문')
                    : (q.anonymousLabel || getAnonymousLabel(q.userId));

                  return (
                <MotionDiv
                  key={q.id}
                  id={`question-${q.id}`}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx < 20 ? idx * 0.03 : 0 }}
                  className="question-card glass"
                  onClick={() => {
                    navigate(`/agora/${q.id}`);
                  }}
                >
                  <div className="card-header">
                    <span className={`type-badge type-${q.type || 'other'}`}>
                      {q.type === 'quiz' 
                        ? (q.quizContext?.quizTitle || '📝 문제') 
                        : (q.type === 'concept' ? '💡 개념' : '💬 기타')}
                    </span>
                    <span className={`status-badge status-${q.status}`}>
                      {q.status === 'open' ? '대기중' : '해결됨'}
                    </span>
                    {(q.bountyAmount || 0) > 0 && (
                      <span className="type-badge" style={{ background: 'rgba(245, 158, 11, 0.16)', color: '#fbbf24' }}>
                        💎 현상금 {q.bountyAmount}
                      </span>
                    )}
                  </div>

                  <div className="card-content">
                    <h3 className="line-clamp-2">{q.content}</h3>
                    {q.drawingUrl && (
                      <div className="drawing-thumbnail">
                        <img src={q.drawingUrl} alt="Question Drawing" loading="lazy" />
                      </div>
                    )}
                    {q.quizContext?.quizTitle && (
                      <div className="quiz-ref">
                        📌 {q.quizContext.quizTitle}
                      </div>
                    )}
                  </div>

                  <div className="card-footer">
                    <div className="author-info">
                      <div className="author-avatar">
                        {anonymousLabel[0]}
                      </div>
                      <span>{anonymousLabel}</span>
                    </div>
                    <div className="stats-info">
                      <button 
                        className={`stat-item ${q.upvotedBy?.includes(user?.uid) ? 'active' : ''}`}
                        onClick={(e) => handleUpvote(e, q.id)}
                      >
                        <Heart size={16} fill={q.upvotedBy?.includes(user?.uid) ? "currentColor" : "none"} />
                        <span>{q.upvotes || 0}</span>
                      </button>
                      <div className="stat-item">
                        <MessageCircle size={16} />
                        <span>{q.answerCount || 0}</span>
                      </div>
                    </div>
                  </div>
                </MotionDiv>
                  );
                })()
              ))}
            </AnimatePresence>
          </div>

          {/* Load More Button */}
          {hasNextPage && !searchTerm.trim() && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
              <button
                className="load-more-btn glass"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.8rem 2rem',
                  background: 'rgba(0, 243, 255, 0.08)',
                  border: '1px solid rgba(0, 243, 255, 0.3)',
                  borderRadius: '12px',
                  color: '#00f3ff',
                  cursor: isFetchingNextPage ? 'wait' : 'pointer',
                  fontFamily: 'var(--font-tech)',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  letterSpacing: '1px',
                  transition: 'all 0.3s ease',
                }}
                onMouseOver={e => {
                  if (!isFetchingNextPage) {
                    e.currentTarget.style.background = 'rgba(0, 243, 255, 0.15)';
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 243, 255, 0.3)';
                  }
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = 'rgba(0, 243, 255, 0.08)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {isFetchingNextPage ? (
                  <><Loader size={16} className="spin-icon" /> 불러오는 중...</>
                ) : (
                  <><ChevronDown size={16} /> 이전 질문 더 보기</>
                )}
              </button>
            </div>
          )}
          </>
        )}
          </main>
          
          <AgoraMotivationPanel 
            userData={userData} 
          />
        </div>

      <button className="floating-ask-btn action-flare" onClick={() => setIsModalOpen(true)}>
        <span className="btn-icon">✨</span>
        <span className="btn-text font-title">별 쏘아올리기</span>
      </button>

      <QuestionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        quizContext={null} 
      />
      </div>
    </div>
  );
}
