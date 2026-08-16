import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useReadingBooks } from '../../../hooks/useReadingLibrary';
import { BOOK_STATUSES } from '../../../utils/readingDomain';
import ReadingBookshelfTab from './ReadingBookshelfTab';
import ReadingHistoryTab from './ReadingHistoryTab';
import ReadingBookFormModal from './ReadingBookFormModal';
import ReadingProgressModal from './ReadingProgressModal';
import ReadingBookDetailDrawer from './ReadingBookDetailDrawer';
import { ArrowLeft, BookOpen, Clock, CheckCircle2, Bookmark, Library } from 'lucide-react';
import './ReadingLibrary.css';

export default function ReadingLibraryView({ onBack }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('bookshelf'); // 'bookshelf' | 'history'

  const { data: books = [], isLoading: booksLoading } = useReadingBooks(user?.uid);

  // Modals state
  const [isNewBookModalOpen, setIsNewBookModalOpen] = useState(false);
  const [progressModalTargetBook, setProgressModalTargetBook] = useState(null);
  const [detailDrawerTargetBook, setDetailDrawerTargetBook] = useState(null);

  // Top stats summary computed from `books`
  const stats = useMemo(() => {
    const readingCount = books.filter((b) => b.status === BOOK_STATUSES.READING).length;
    const completedCount = books.filter((b) => b.status === BOOK_STATUSES.COMPLETED).length;
    const pausedCount = books.filter((b) => b.status === BOOK_STATUSES.PAUSED).length;

    const booksWithProgress = [...books]
      .filter((b) => b.progress?.latestReadAt)
      .sort((a, b) => {
        const aMs = a.progress.latestReadAt.toMillis ? a.progress.latestReadAt.toMillis() : new Date(a.progress.latestReadAt).getTime();
        const bMs = b.progress.latestReadAt.toMillis ? b.progress.latestReadAt.toMillis() : new Date(b.progress.latestReadAt).getTime();
        return bMs - aMs;
      });

    const latestBook = booksWithProgress[0] || null;

    return {
      readingCount,
      completedCount,
      pausedCount,
      totalCount: books.length,
      latestBookTitle: latestBook?.title || '없음',
      latestBookPage: latestBook?.progress?.latestReadPage || latestBook?.progress?.furthestPage || 0,
    };
  }, [books]);

  return (
    <div className="reading-library-container font-tech">
      {/* Header & Tabs */}
      <div className="reading-library-header">
        <div className="reading-library-title-group">
          {onBack && (
            <button
              type="button"
              className="space-nav-link"
              onClick={onBack}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                borderRadius: 9,
                padding: '0.45rem 0.75rem',
                fontSize: '0.86rem',
              }}
            >
              <ArrowLeft size={16} />
              행성으로
            </button>
          )}

          <h1 className="reading-library-title">
            <Library size={28} color="#5eead4" />
            나의 책장 & 독서 기록
          </h1>
        </div>

        <div className="reading-library-nav">
          <button
            type="button"
            className={`reading-nav-tab ${activeTab === 'bookshelf' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookshelf')}
          >
            <BookOpen size={16} />
            나의 책장
          </button>
          <button
            type="button"
            className={`reading-nav-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <Clock size={16} />
            독서 기록
          </button>
        </div>
      </div>

      {/* Top Stats Summary */}
      <div className="reading-stats-grid">
        <div className="reading-stat-card">
          <span className="reading-stat-label">읽고 있어요</span>
          <span className="reading-stat-value" style={{ color: '#00f3ff' }}>
            {stats.readingCount}권
          </span>
        </div>

        <div className="reading-stat-card">
          <span className="reading-stat-label">완독한 책</span>
          <span className="reading-stat-value" style={{ color: '#34d399' }}>
            {stats.completedCount}권
          </span>
        </div>

        <div className="reading-stat-card">
          <span className="reading-stat-label">읽기 중단</span>
          <span className="reading-stat-value" style={{ color: '#c084fc' }}>
            {stats.pausedCount}권
          </span>
        </div>

        <div className="reading-stat-card">
          <span className="reading-stat-label">최근 읽은 책</span>
          <span
            className="reading-stat-value"
            style={{
              fontSize: '1rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: '#fde68a',
            }}
            title={stats.latestBookTitle}
          >
            {stats.latestBookTitle}
            {stats.latestBookPage > 0 && ` (${stats.latestBookPage}쪽)`}
          </span>
        </div>
      </div>

      {/* Active Tab Content */}
      {activeTab === 'bookshelf' ? (
        <ReadingBookshelfTab
          books={books}
          loading={booksLoading}
          onOpenNewBookModal={() => setIsNewBookModalOpen(true)}
          onOpenProgressModal={(book) => setProgressModalTargetBook(book)}
          onOpenDetailDrawer={(book) => setDetailDrawerTargetBook(book)}
        />
      ) : (
        <ReadingHistoryTab
          userId={user?.uid}
          books={books}
          onOpenNewBookModal={() => setIsNewBookModalOpen(true)}
          onOpenProgressModal={(book) => setProgressModalTargetBook(book)}
          onOpenDetailDrawer={(book) => setDetailDrawerTargetBook(book)}
        />
      )}

      {/* Modals & Drawer */}
      {isNewBookModalOpen && (
        <ReadingBookFormModal
          isOpen
          onClose={() => setIsNewBookModalOpen(false)}
          existingBooks={books}
        />
      )}

      {progressModalTargetBook && (
        <ReadingProgressModal
          isOpen
          onClose={() => setProgressModalTargetBook(null)}
          book={progressModalTargetBook}
        />
      )}

      <ReadingBookDetailDrawer
        isOpen={Boolean(detailDrawerTargetBook)}
        onClose={() => setDetailDrawerTargetBook(null)}
        book={detailDrawerTargetBook}
        onOpenProgress={(book) => {
          setDetailDrawerTargetBook(null);
          setProgressModalTargetBook(book);
        }}
      />
    </div>
  );
}
