import React from 'react';
import { motion } from 'framer-motion';
import { BOOK_STATUSES, BOOK_STATUS_LABELS, BOOK_STATUS_COLORS } from '../../../utils/readingDomain';
import { formatKSTShortDate } from '../../../utils/readingTime';
import { BookOpen, CheckCircle, PauseCircle, Clock } from 'lucide-react';

const MotionDiv = motion.div;

export default function ReadingBookCard({ book, onOpenProgress, onOpenDetail }) {
  if (!book) return null;

  const isArchived = Boolean(book.archivedAt || book.isArchived);
  const status = book.status || BOOK_STATUSES.READING;
  const statusLabel = isArchived ? '보관됨' : (BOOK_STATUS_LABELS[status] || '읽고 있어요');
  const colorScheme = isArchived
    ? { border: '#a78bfa', bg: 'rgba(167, 139, 250, 0.12)', text: '#c084fc', badgeBg: 'rgba(167, 139, 250, 0.2)' }
    : (BOOK_STATUS_COLORS[status] || BOOK_STATUS_COLORS.reading);

  const furthestPage = book.progress?.furthestPage || book.progress?.latestReadPage || 0;
  const latestReadAt = book.progress?.latestReadAt;

  const isWantToRead = status === BOOK_STATUSES.WANT_TO_READ;

  const getSpineIcon = () => {
    if (isArchived) return '🗄️';
    if (status === BOOK_STATUSES.COMPLETED) return '🏆';
    if (status === BOOK_STATUSES.PAUSED) return '⏸️';
    if (status === BOOK_STATUSES.WANT_TO_READ) return '🔖';
    return '📖';
  };

  const handleClick = () => {
    if (isArchived || isWantToRead) {
      if (onOpenDetail) onOpenDetail(book);
      else if (onOpenProgress) onOpenProgress(book);
    } else if (onOpenProgress) {
      onOpenProgress(book);
    } else if (onOpenDetail) {
      onOpenDetail(book);
    }
  };

  return (
    <MotionDiv
      role="button"
      tabIndex={0}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className="reading-book-card"
      style={{
        borderTop: `3px solid ${colorScheme.border}`,
      }}
    >
      <div>
        <div className="book-card-header">
          <span className="book-card-spine" aria-hidden="true">
            {getSpineIcon()}
          </span>
          <span
            className="book-status-badge"
            style={{
              background: colorScheme.badgeBg,
              color: colorScheme.text,
              border: `1px solid ${colorScheme.border}44`,
            }}
          >
            {statusLabel}
          </span>
        </div>

        <h3 className="book-title" title={book.title}>
          {book.title}
        </h3>
        <p className="book-author" title={book.author}>
          {book.author}
        </p>
      </div>

      <div className="book-card-footer">
        <div className="book-progress-tag">
          {furthestPage > 0 ? (
            <span>{furthestPage}쪽까지</span>
          ) : (
            <span style={{ color: 'rgba(224, 242, 254, 0.45)', fontWeight: 500 }}>기록 없음</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'rgba(224, 242, 254, 0.55)', fontSize: '0.72rem' }}>
          <Clock size={12} />
          {latestReadAt ? formatKSTShortDate(latestReadAt) : formatKSTShortDate(book.startedAt || book.createdAt)}
        </div>
        {onOpenDetail && (
          <button
            type="button"
            className="space-nav-link font-tech"
            onClick={(event) => {
              event.stopPropagation();
              onOpenDetail(book);
            }}
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', borderRadius: 7 }}
            aria-label={`${book.title} 상세 및 상태 변경`}
          >
            상세·상태
          </button>
        )}
      </div>
    </MotionDiv>
  );
}
