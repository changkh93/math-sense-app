import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BOOK_STATUSES, BOOK_STATUS_LABELS } from '../../../utils/readingDomain';
import { getReadingShareStage } from '../../../utils/readingSharePresentation';
import { useRecentReadingShares } from '../../../hooks/useReadingSocial';
import ReadingBookSpine from './ReadingBookSpine';
import ReadingBookCard from './ReadingBookCard';
import { BookPlus, Library, LayoutGrid, Rows3, Sparkles, ArrowRight, BookOpen } from 'lucide-react';
import './ReadingLibrary.css';

export default function ReadingBookshelfTab({
  books = [],
  loading = false,
  onOpenNewBookModal,
  onOpenProgressModal,
  onOpenDetailDrawer,
}) {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('shelf'); // 'shelf' | 'card'

  const { data: recentShares = [], isLoading: sharesLoading } = useRecentReadingShares(3);

  const activeBooks = useMemo(() => books.filter((b) => !b.isArchived), [books]);
  const archivedBooks = useMemo(() => books.filter((b) => b.isArchived), [books]);

  const filteredBooks = useMemo(() => {
    if (filterStatus === 'archived') return archivedBooks;
    if (filterStatus === 'all') return activeBooks;
    return activeBooks.filter((book) => book.status === filterStatus);
  }, [activeBooks, archivedBooks, filterStatus]);

  // Group books into shelf tiers (e.g. 7 books per shelf row)
  const shelfRows = useMemo(() => {
    const BOOKS_PER_SHELF = 8;
    const rows = [];
    for (let i = 0; i < filteredBooks.length; i += BOOKS_PER_SHELF) {
      rows.push(filteredBooks.slice(i, i + BOOKS_PER_SHELF));
    }
    if (rows.length === 0) rows.push([]);
    return rows;
  }, [filteredBooks]);

  return (
    <div className="bookshelf-tab-wrapper">
      {/* Bookshelf Toolbar */}
      <div className="bookshelf-toolbar">
        <div className="bookshelf-filters">
          <button
            type="button"
            className={`bookshelf-filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            전체 ({activeBooks.length})
          </button>
          <button
            type="button"
            className={`bookshelf-filter-btn ${filterStatus === BOOK_STATUSES.READING ? 'active' : ''}`}
            onClick={() => setFilterStatus(BOOK_STATUSES.READING)}
          >
            📖 {BOOK_STATUS_LABELS.reading} ({activeBooks.filter((b) => b.status === BOOK_STATUSES.READING).length})
          </button>
          <button
            type="button"
            className={`bookshelf-filter-btn ${filterStatus === BOOK_STATUSES.WANT_TO_READ ? 'active' : ''}`}
            onClick={() => setFilterStatus(BOOK_STATUSES.WANT_TO_READ)}
          >
            🔖 {BOOK_STATUS_LABELS.want_to_read} ({activeBooks.filter((b) => b.status === BOOK_STATUSES.WANT_TO_READ).length})
          </button>
          <button
            type="button"
            className={`bookshelf-filter-btn ${filterStatus === BOOK_STATUSES.COMPLETED ? 'active' : ''}`}
            onClick={() => setFilterStatus(BOOK_STATUSES.COMPLETED)}
          >
            ⭐ {BOOK_STATUS_LABELS.completed} ({activeBooks.filter((b) => b.status === BOOK_STATUSES.COMPLETED).length})
          </button>
          <button
            type="button"
            className={`bookshelf-filter-btn ${filterStatus === BOOK_STATUSES.PAUSED ? 'active' : ''}`}
            onClick={() => setFilterStatus(BOOK_STATUSES.PAUSED)}
          >
            ⏸️ {BOOK_STATUS_LABELS.paused} ({activeBooks.filter((b) => b.status === BOOK_STATUSES.PAUSED).length})
          </button>
          <button
            type="button"
            className={`bookshelf-filter-btn ${filterStatus === 'archived' ? 'active' : ''}`}
            onClick={() => setFilterStatus('archived')}
            style={filterStatus === 'archived' ? { borderColor: '#a78bfa', color: '#c084fc' } : {}}
          >
            🗄️ 보관함 ({archivedBooks.length})
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {/* View mode toggle (Shelf vs Card) */}
          <div className="bookshelf-view-toggle">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'shelf' ? 'active' : ''}`}
              onClick={() => setViewMode('shelf')}
              title="책장 서가 뷰"
            >
              <Rows3 size={15} />
              <span>책장 서가</span>
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'card' ? 'active' : ''}`}
              onClick={() => setViewMode('card')}
              title="카드 목록 뷰"
            >
              <LayoutGrid size={15} />
              <span>카드 목록</span>
            </button>
          </div>

          <button
            type="button"
            className="bookshelf-add-btn font-tech"
            onClick={onOpenNewBookModal}
          >
            <BookPlus size={16} />
            책 등록
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bookshelf-loading-state">
          <div className="spinner-glow" />
          <p>고전 서재를 불러오는 중...</p>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="bookshelf-empty-board">
          <div className="empty-wood-shelf">
            <div className="empty-shelf-books-silhouette">
              <Library size={48} color={filterStatus === 'archived' ? '#a78bfa' : '#5eead4'} style={{ opacity: 0.8 }} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: '1rem 0 0.4rem' }}>
              {filterStatus === 'archived'
                ? '보관함이 비어 있습니다.'
                : filterStatus === 'all'
                  ? '아직 서가에 꽂힌 고전 도서가 없습니다.'
                  : '해당 상태의 고전 도서가 없습니다.'}
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'rgba(224, 242, 254, 0.65)', margin: '0 0 1.5rem', maxWidth: '420px' }}>
              {filterStatus === 'archived'
                ? '완독했거나 현재 읽지 않는 책을 보관하면 기존 독서 기록과 함께 여기에 보존되며, 언제든 다시 책장으로 복원할 수 있습니다.'
                : '서양고전, 역사, 문학 등 읽고 있는 도서를 등록하여 나만의 웅장한 서재를 채워보세요.'}
            </p>
            {filterStatus !== 'archived' && (
              <button
                type="button"
                className="bookshelf-add-btn font-tech"
                onClick={onOpenNewBookModal}
                style={{ margin: '0 auto', padding: '0.75rem 1.4rem', fontSize: '0.95rem' }}
              >
                <Sparkles size={17} color="#fef08a" />
                첫 번째 도서 등록하기
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'shelf' ? (
        /* Real Wooden Bookshelf View with Book Spines */
        <div className="real-bookshelf-container">
          <div className="bookshelf-ambient-light" />

          {shelfRows.map((rowBooks, rowIndex) => (
            <div key={rowIndex} className="bookshelf-tier">
              {/* Shelf Back Wall Background */}
              <div className="shelf-tier-backwall">
                <div className="shelf-books-row">
                  {rowBooks.map((book) => (
                    <ReadingBookSpine
                      key={book.id}
                      book={book}
                      onOpenProgress={onOpenProgressModal}
                      onOpenDetail={onOpenDetailDrawer}
                    />
                  ))}

                  {/* Empty Slot Placeholder at the end of the last shelf row */}
                  {rowIndex === shelfRows.length - 1 && (
                    <div
                      className="spine-add-placeholder"
                      onClick={onOpenNewBookModal}
                      title="새로운 책 등록하기"
                    >
                      <div className="spine-placeholder-inner">
                        <BookPlus size={22} color="#5eead4" />
                        <span className="placeholder-text">+ 새 책 꽂기</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 3D Realistic Wooden Plank Base */}
              <div className="wooden-shelf-plank">
                <div className="shelf-plank-top" />
                <div className="shelf-plank-front">
                  <div className="shelf-wood-grain" />
                  <div className="shelf-brass-tag">
                    <span className="brass-text">CLASSIC ARCHIVE · SHELF {rowIndex + 1}</span>
                  </div>
                </div>
                <div className="shelf-plank-shadow" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Card Grid View */
        <div className="book-cards-grid">
          {filteredBooks.map((book) => (
            <ReadingBookCard
              key={book.id}
              book={book}
              onOpenProgress={onOpenProgressModal}
              onOpenDetail={onOpenDetailDrawer}
            />
          ))}
        </div>
      )}

      {/* Featured Community Reading Lounge (Agora) */}
      <div className="bookshelf-lounge-feature-section">
        <div className="bookshelf-lounge-header">
          <div>
            <div className="bookshelf-lounge-header-title">
              <Sparkles size={20} color="#38bdf8" />
              <span>대원들과 함께 읽는 독서 라운지</span>
            </div>
            <p className="bookshelf-lounge-header-desc">
              다른 탐사대원들이 읽는 책과 완독 후 추천을 만나보세요.
            </p>
          </div>

          <button
            type="button"
            className="bookshelf-lounge-goto-btn font-tech"
            onClick={() => navigate('/agora?filter=reading')}
          >
            <span>독서 라운지 바로가기</span>
            <ArrowRight size={15} />
          </button>
        </div>

        {sharesLoading ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'rgba(224,242,254,0.5)', fontSize: '0.86rem' }}>
            라운지 공유 글을 불러오는 중...
          </div>
        ) : recentShares.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '1.8rem',
            background: 'rgba(0,0,0,0.25)',
            borderRadius: 12,
            color: 'rgba(224,242,254,0.65)',
            fontSize: '0.88rem'
          }}>
            아직 공개된 책 이야기가 없습니다. 읽고 있는 책이나 완독한 책을 먼저 공유해보세요!
          </div>
        ) : (
          <div className="bookshelf-lounge-cards-grid">
            {recentShares.map((share) => {
              const book = share.bookSnapshot || {};
              const review = share.review || {};
              const owner = share.ownerSnapshot || {};
              const shareStage = getReadingShareStage(share);
              const wantCount = share.reactionCounts?.wantToRead || 0;
              const commentCount = share.commentCount || 0;

              return (
                <div
                  key={share.id}
                  className="bookshelf-lounge-mini-card"
                  onClick={() => navigate(`/agora?filter=reading&highlight=${share.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      navigate(`/agora?filter=reading&highlight=${share.id}`);
                    }
                  }}
                >
                  <div>
                    <div className="bookshelf-lounge-card-book">
                      <div className="bookshelf-lounge-card-spine">
                        <BookOpen size={16} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '0.67rem', fontWeight: 800, color: shareStage.kind === 'completed_recommendation' ? '#34d399' : '#38bdf8', marginBottom: '0.12rem' }}>
                          {shareStage.kind === 'completed_recommendation' ? '✓' : '📖'} {shareStage.shortLabel}
                        </div>
                        <div className="bookshelf-lounge-card-book-title" title={book.title}>
                          {book.title || '고전 도서'}
                        </div>
                        <div className="bookshelf-lounge-card-book-author" title={book.author}>
                          {book.author || '저자 미상'}
                        </div>
                      </div>
                    </div>

                    <div className="bookshelf-lounge-card-quote">
                      “{review.oneLine || '소개하는 한마디가 없습니다.'}”
                    </div>
                  </div>

                  <div className="bookshelf-lounge-card-footer">
                    <span className="bookshelf-lounge-card-author">
                      👤 {owner.displayName || '탐사대원'}
                    </span>
                    <div className="bookshelf-lounge-card-counts">
                      {wantCount > 0 && <span title="읽고 싶어요">🔖 {wantCount}</span>}
                      {commentCount > 0 && <span title="댓글/생각">💬 {commentCount}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
