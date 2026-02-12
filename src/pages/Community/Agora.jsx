import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, ArrowLeft, Plus, Search, Telescope, X } from 'lucide-react';
import { usePublicQuestions, useQAMutations } from '../../hooks/useQA';
import { getRandomNickname } from '../../utils/qaUtils';
import QuestionModal from '../../components/QuestionModal';
import StarField from '../../components/Space/StarField';
import SpaceNavbar from '../../components/Space/SpaceNavbar';
import AgoraLiveTicker from '../../components/Community/AgoraLiveTicker';
import AgoraMotivationPanel from '../../components/Community/AgoraMotivationPanel';
import { useAuth } from '../../hooks/useAuth';
import './Agora.css';

export default function Agora() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [filter, setFilter] = useState('all');
  // const [category, setCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // Default to 'grid' (LIST)
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Apply filters
  const { data: allQuestions, isLoading, isError, error } = usePublicQuestions(filter);
  const { upvote } = useQAMutations();

  const questions = React.useMemo(() => {
    if (!allQuestions) return [];
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
    { id: 'my', label: '내 질문', icon: '🧑‍🚀' }
  ];

  const handleUpvote = (e, id) => {
    e.stopPropagation();
    upvote.mutate(id);
  };

  return (
    <div className="agora-container space-bg fadeIn">
      <StarField />
      <div className="nebula-bg" />
      <SpaceNavbar currentView="agora" />
      
      <div className="agora-content-wrapper">
        <header className="agora-header">
          <AgoraLiveTicker questions={questions} />
          <div className="agora-title">
            <h1 className="gradient-text">수학 아고라</h1>
            <p className="font-tech subtitle">궁금한 개념이나 키워드를 별에서 찾아 탐험해보세요!</p>
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
            {isLoading ? (
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
          <div className="questions-grid">
            <AnimatePresence mode="popLayout">
              {questions.map((q, idx) => (
                <motion.div
                  key={q.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.05 }}
                  className="question-card glass"
                  onClick={() => navigate(`/agora/${q.id}`)}
                >
                  <div className="card-header">
                    <span className={`type-badge type-${q.type || 'other'}`}>
                      {q.type === 'quiz' ? '📝 문제' : q.type === 'concept' ? '💡 개념' : '💬 기타'}
                    </span>
                    <span className={`status-badge status-${q.status}`}>
                      {q.status === 'open' ? '대기중' : q.status === 'answered' ? '답변완료' : '해결됨'}
                    </span>
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
                        {getRandomNickname(q.userId)[0]}
                      </div>
                      <span>{getRandomNickname(q.userId)}</span>
                    </div>
                    <div className="stats-info">
                      <button 
                        className={`stat-item ${q.upvotes > 0 ? 'active' : ''}`}
                        onClick={(e) => handleUpvote(e, q.id)}
                      >
                        <Heart size={16} fill={q.upvotes > 0 ? "currentColor" : "none"} />
                        <span>{q.upvotes || 0}</span>
                      </button>
                      <div className="stat-item">
                        <MessageCircle size={16} />
                        <span>{q.answerCount || 0}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
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
