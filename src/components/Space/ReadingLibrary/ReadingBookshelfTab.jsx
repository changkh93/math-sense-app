import React, { useState, useMemo } from 'react';
import { BOOK_STATUSES, BOOK_STATUS_LABELS } from '../../../utils/readingDomain';
import ReadingBookSpine from './ReadingBookSpine';
import ReadingBookCard from './ReadingBookCard';
import { BookPlus, Library, LayoutGrid, Rows3, Sparkles } from 'lucide-react';
import './ReadingLibrary.css';

export default function ReadingBookshelfTab({
  books = [],
  loading = false,
  onOpenNewBookModal,
  onOpenProgressModal,
  onOpenDetailDrawer,
}) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('shelf'); // 'shelf' | 'card'

  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      if (filterStatus === 'all') return true;
      return book.status === filterStatus;
    });
  }, [books, filterStatus]);

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
            전체 ({books.length})
          </button>
          <button
            type="button"
            className={`bookshelf-filter-btn ${filterStatus === BOOK_STATUSES.READING ? 'active' : ''}`}
            onClick={() => setFilterStatus(BOOK_STATUSES.READING)}
          >
            📖 {BOOK_STATUS_LABELS.reading} ({books.filter((b) => b.status === BOOK_STATUSES.READING).length})
          </button>
          <button
            type="button"
            className={`bookshelf-filter-btn ${filterStatus === BOOK_STATUSES.WANT_TO_READ ? 'active' : ''}`}
            onClick={() => setFilterStatus(BOOK_STATUSES.WANT_TO_READ)}
          >
            🔖 {BOOK_STATUS_LABELS.want_to_read} ({books.filter((b) => b.status === BOOK_STATUSES.WANT_TO_READ).length})
          </button>
          <button
            type="button"
            className={`bookshelf-filter-btn ${filterStatus === BOOK_STATUSES.COMPLETED ? 'active' : ''}`}
            onClick={() => setFilterStatus(BOOK_STATUSES.COMPLETED)}
          >
            ⭐ {BOOK_STATUS_LABELS.completed} ({books.filter((b) => b.status === BOOK_STATUSES.COMPLETED).length})
          </button>
          <button
            type="button"
            className={`bookshelf-filter-btn ${filterStatus === BOOK_STATUSES.PAUSED ? 'active' : ''}`}
            onClick={() => setFilterStatus(BOOK_STATUSES.PAUSED)}
          >
            ⏸️ {BOOK_STATUS_LABELS.paused} ({books.filter((b) => b.status === BOOK_STATUSES.PAUSED).length})
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
              <Library size={48} color="#5eead4" style={{ opacity: 0.8 }} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: '1rem 0 0.4rem' }}>
              {filterStatus === 'all' ? '아직 서가에 꽂힌 고전 도서가 없습니다.' : '해당 상태의 고전 도서가 없습니다.'}
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'rgba(224, 242, 254, 0.65)', margin: '0 0 1.5rem', maxWidth: '420px' }}>
              서양고전, 역사, 문학 등 읽고 있는 도서를 등록하여 나만의 웅장한 서재를 채워보세요.
            </p>
            <button
              type="button"
              className="bookshelf-add-btn font-tech"
              onClick={onOpenNewBookModal}
              style={{ margin: '0 auto', padding: '0.75rem 1.4rem', fontSize: '0.95rem' }}
            >
              <Sparkles size={17} color="#fef08a" />
              첫 번째 도서 등록하기
            </button>
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
    </div>
  );
}
