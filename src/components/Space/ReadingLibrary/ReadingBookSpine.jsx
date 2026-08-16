import React from 'react';
import { motion } from 'framer-motion';
import { BOOK_STATUSES, BOOK_STATUS_LABELS } from '../../../utils/readingDomain';
import { Star, Bookmark, Pause, Check, BookOpen, Clock } from 'lucide-react';
import './ReadingLibrary.css';

const MotionDiv = motion.div;

// Classic hardcover leather / cloth color palettes for book spines
const SPINE_PALETTES = [
  { bg: 'linear-gradient(180deg, #881337 0%, #4c0519 100%)', border: '#fda4af', foil: '#fef08a', shadow: 'rgba(76, 5, 25, 0.6)', texture: 'crimson' },
  { bg: 'linear-gradient(180deg, #1e3a8a 0%, #0f172a 100%)', border: '#93c5fd', foil: '#e0f2fe', shadow: 'rgba(15, 23, 42, 0.6)', texture: 'navy' },
  { bg: 'linear-gradient(180deg, #064e3b 0%, #022c22 100%)', border: '#6ee7b7', foil: '#fef08a', shadow: 'rgba(2, 44, 34, 0.6)', texture: 'emerald' },
  { bg: 'linear-gradient(180deg, #78350f 0%, #451a03 100%)', border: '#fcd34d', foil: '#fef08a', shadow: 'rgba(69, 26, 3, 0.6)', texture: 'amber' },
  { bg: 'linear-gradient(180deg, #581c87 0%, #2e1065 100%)', border: '#d8b4fe', foil: '#fef08a', shadow: 'rgba(46, 16, 101, 0.6)', texture: 'purple' },
  { bg: 'linear-gradient(180deg, #134e4a 0%, #042f2e 100%)', border: '#5eead4', foil: '#ccfbf1', shadow: 'rgba(4, 47, 46, 0.6)', texture: 'teal' },
  { bg: 'linear-gradient(180deg, #7c2d12 0%, #431407 100%)', border: '#fdba74', foil: '#ffedd5', shadow: 'rgba(67, 20, 7, 0.6)', texture: 'terracotta' },
  { bg: 'linear-gradient(180deg, #334155 0%, #0f172a 100%)', border: '#cbd5e1', foil: '#f8fafc', shadow: 'rgba(15, 23, 42, 0.6)', texture: 'slate' },
];

/**
 * Deterministically picks a spine palette based on book id/title
 */
function getBookSpinePalette(book) {
  const str = String(book.id || book.title || 'classic');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % SPINE_PALETTES.length;
  return SPINE_PALETTES[index];
}

/**
 * Deterministically picks a slight height & width variation for realistic bookshelf rhythm
 */
function getSpineDimensions(book) {
  const str = String(book.title || 'book');
  const len = str.length;
  // Height: 280px ~ 330px
  const height = 290 + (len % 5) * 8;
  // Width: 56px ~ 72px
  const width = 60 + (len % 4) * 4;
  return { height, width };
}

export default function ReadingBookSpine({ book, onOpenProgress, onOpenDetail }) {
  if (!book) return null;

  const status = book.status || BOOK_STATUSES.READING;
  const furthestPage = book.progress?.furthestPage || book.progress?.latestReadPage || 0;
  const isCompleted = status === BOOK_STATUSES.COMPLETED;
  const isPaused = status === BOOK_STATUSES.PAUSED;
  const isReading = status === BOOK_STATUSES.READING;

  const palette = getBookSpinePalette(book);
  const { height, width } = getSpineDimensions(book);

  const handleClick = () => {
    if (onOpenProgress) {
      onOpenProgress(book);
    } else if (onOpenDetail) {
      onOpenDetail(book);
    }
  };

  return (
    <div className="spine-standing-slot" style={{ width: `${width}px`, height: '340px' }}>
      <MotionDiv
        role="button"
        tabIndex={0}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{
          y: -26,
          scale: 1.04,
          rotate: -1.2,
          transition: { type: 'spring', stiffness: 380, damping: 20 }
        }}
        whileTap={{ scale: 0.98 }}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        className={`book-spine-card ${isCompleted ? 'spine-completed' : ''} ${isPaused ? 'spine-paused' : ''}`}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          background: palette.bg,
          boxShadow: `0 14px 28px ${palette.shadow}, inset 2px 0 4px rgba(255,255,255,0.25), inset -2px 0 6px rgba(0,0,0,0.6)`,
          borderLeft: `1px solid rgba(255, 255, 255, 0.25)`,
          borderRight: `1px solid rgba(0, 0, 0, 0.5)`,
        }}
        title={`${book.title} - ${book.author} (${BOOK_STATUS_LABELS[status]}, ${furthestPage > 0 ? furthestPage + '쪽' : '기록 없음'})`}
      >
        {/* Top Gold Embossed Lines */}
        <div className="spine-emboss-band top">
          <div className="spine-foil-line" style={{ background: isCompleted ? '#fbbf24' : palette.foil }} />
          <div className="spine-foil-line thin" style={{ background: isCompleted ? '#fef08a' : palette.foil }} />
        </div>

        {/* Status Badge & Ribbon on top */}
        <div className="spine-top-status">
          {isCompleted && (
            <div className="spine-status-badge completed" title="완독">
              <Star size={13} fill="#fbbf24" color="#fbbf24" className="spin-on-hover" />
              <span className="spine-badge-text">완독</span>
            </div>
          )}
          {isReading && (
            <div className="spine-status-badge reading" title="읽는 중">
              <BookOpen size={12} color="#5eead4" />
              <span className="spine-badge-text">읽는중</span>
            </div>
          )}
          {isPaused && (
            <div className="spine-status-badge paused" title="읽기 보류">
              <Pause size={11} color="#e9d5ff" />
              <span className="spine-badge-text">보류</span>
            </div>
          )}
        </div>

        {/* Spine Title (Vertical Layout) */}
        <div className="spine-title-container">
          <span className="spine-book-title" style={{ color: isCompleted ? '#fffbeb' : '#ffffff' }}>
            {book.title}
          </span>
        </div>

        {/* Spine Author */}
        <div className="spine-author-container">
          <span className="spine-book-author" style={{ color: 'rgba(255, 255, 255, 0.72)' }}>
            {book.author}
          </span>
        </div>

        {/* Bottom Page Tag & Emboss Band */}
        <div className="spine-bottom-section">
          {furthestPage > 0 ? (
            <div className="spine-page-pill" style={{ borderColor: isCompleted ? 'rgba(251, 191, 36, 0.6)' : 'rgba(94, 234, 212, 0.4)' }}>
              <span className="spine-page-number" style={{ color: isCompleted ? '#fde68a' : '#5eead4' }}>
                {furthestPage}p
              </span>
            </div>
          ) : (
            <div className="spine-page-pill empty">
              <span className="spine-page-number">NEW</span>
            </div>
          )}

          <div className="spine-emboss-band bottom">
            <div className="spine-foil-line thin" style={{ background: isCompleted ? '#fef08a' : palette.foil }} />
            <div className="spine-foil-line" style={{ background: isCompleted ? '#fbbf24' : palette.foil }} />
          </div>
        </div>

        {/* Bookmark Ribbon Tip hanging from the bottom for reading books */}
        {isReading && (
          <div className="spine-bookmark-ribbon" style={{ background: palette.border }} />
        )}
      </MotionDiv>

      {/* Detail trigger button floating below on hover for desktop accessibility */}
      <button
        type="button"
        className="spine-quick-action-btn font-tech"
        onClick={(e) => {
          e.stopPropagation();
          if (onOpenDetail) onOpenDetail(book);
        }}
        aria-label={`${book.title} 상세 보기`}
      >
        상세
      </button>
    </div>
  );
}
