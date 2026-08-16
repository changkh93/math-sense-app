import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BOOK_STATUSES, BOOK_STATUS_LABELS } from '../../../utils/readingDomain';
import { formatKSTShortDate } from '../../../utils/readingTime';
import { useUpdateReadingBookDetails, useUpdateReadingBookStatus } from '../../../hooks/useReadingLibrary';
import { Star, BookOpen, CheckCircle, Pause, PlusCircle, ArrowUpDown, Sparkles } from 'lucide-react';
import './ReadingLibrary.css';

export default function ReadingLedgerTable({
  books = [],
  onOpenProgressModal,
  onOpenDetailDrawer,
  onFilterBookLogs,
}) {
  const updateDetailsMutation = useUpdateReadingBookDetails();
  const updateStatusMutation = useUpdateReadingBookStatus();

  // Local editing state for totalPages inputs: { [bookId]: stringValue }
  const [editingTotalPages, setEditingTotalPages] = useState({});
  const [hoverRating, setHoverRating] = useState({ bookId: null, rating: 0 });

  // Handle total page change and auto-save on blur / enter
  const handleTotalPagesBlur = async (book) => {
    const rawVal = editingTotalPages[book.id];
    if (rawVal === undefined) return; // not edited

    const numVal = rawVal.trim() === '' ? null : Number(rawVal);
    if (numVal !== null && (isNaN(numVal) || numVal < 1 || numVal > 99999)) {
      // Revert if invalid
      setEditingTotalPages((prev) => {
        const next = { ...prev };
        delete next[book.id];
        return next;
      });
      return;
    }

    if (numVal !== (book.totalPages || null)) {
      try {
        await updateDetailsMutation.mutateAsync({
          bookId: book.id,
          totalPages: numVal,
        });
      } catch (e) {
        console.error('Failed to update total pages:', e);
      }
    }

    setEditingTotalPages((prev) => {
      const next = { ...prev };
      delete next[book.id];
      return next;
    });
  };

  const handleRatingClick = async (book, starValue) => {
    const currentRating = book.rating || 0;
    const newRating = currentRating === starValue ? 0 : starValue;

    try {
      await updateDetailsMutation.mutateAsync({
        bookId: book.id,
        rating: newRating,
      });
    } catch (e) {
      console.error('Failed to update rating:', e);
    }
  };

  const handleStatusToggle = async (book) => {
    // Quick cycling: reading -> completed -> paused -> reading
    const nextStatus =
      book.status === BOOK_STATUSES.READING
        ? BOOK_STATUSES.COMPLETED
        : book.status === BOOK_STATUSES.COMPLETED
        ? BOOK_STATUSES.PAUSED
        : BOOK_STATUSES.READING;

    try {
      await updateStatusMutation.mutateAsync({
        bookId: book.id,
        status: nextStatus,
      });
    } catch (e) {
      console.error('Failed to toggle status:', e);
    }
  };

  return (
    <div className="reading-ledger-wrapper">
      <div className="reading-ledger-table-container">
        <table className="reading-ledger-table">
          <thead>
            <tr>
              <th style={{ width: '45px', textAlign: 'center' }}>No.</th>
              <th style={{ width: '85px', textAlign: 'center' }}>시작일</th>
              <th style={{ width: '85px', textAlign: 'center' }}>완독일</th>
              <th style={{ minWidth: '160px' }}>도서명</th>
              <th style={{ minWidth: '110px' }}>저자</th>
              <th style={{ width: '100px', textAlign: 'center' }}>전체 쪽수</th>
              <th style={{ width: '140px', textAlign: 'center' }}>읽은 쪽수</th>
              <th style={{ width: '130px', textAlign: 'center' }}>별점 평가</th>
              <th style={{ width: '100px', textAlign: 'center' }}>상태</th>
              <th style={{ width: '85px', textAlign: 'center' }}>기록</th>
            </tr>
          </thead>
          <tbody>
            {books.map((book, idx) => {
              const furthestPage = book.progress?.furthestPage || book.progress?.latestReadPage || 0;
              const totalPages =
                editingTotalPages[book.id] !== undefined
                  ? editingTotalPages[book.id]
                  : book.totalPages || '';

              const startDate = formatKSTShortDate(book.startedAt || book.createdAt);
              const isCompleted = book.status === BOOK_STATUSES.COMPLETED;
              const isPaused = book.status === BOOK_STATUSES.PAUSED;
              const isReading = book.status === BOOK_STATUSES.READING;

              const endDate = isCompleted
                ? formatKSTShortDate(book.completedAt || book.statusUpdatedAt || book.updatedAt)
                : '-';

              const currentRating =
                hoverRating.bookId === book.id ? hoverRating.rating : book.rating || 0;

              const progressPct =
                book.totalPages && book.totalPages > 0
                  ? Math.min(100, Math.round((furthestPage / book.totalPages) * 100))
                  : null;

              return (
                <tr
                  key={book.id}
                  className={`ledger-row ${isCompleted ? 'ledger-completed-row' : ''}`}
                >
                  {/* 1. No. */}
                  <td style={{ textAlign: 'center', color: 'rgba(224, 242, 254, 0.6)', fontWeight: 700 }}>
                    {idx + 1}
                  </td>

                  {/* 2. Start Date */}
                  <td style={{ textAlign: 'center', fontSize: '0.84rem', color: 'rgba(224, 242, 254, 0.8)' }}>
                    {startDate || '-'}
                  </td>

                  {/* 3. End Date */}
                  <td style={{ textAlign: 'center', fontSize: '0.84rem', color: isCompleted ? '#fde68a' : 'rgba(224, 242, 254, 0.5)' }}>
                    {endDate}
                  </td>

                  {/* 4. Title */}
                  <td>
                    <button
                      type="button"
                      className="ledger-title-btn"
                      onClick={() => onOpenDetailDrawer && onOpenDetailDrawer(book)}
                      title={`${book.title} 상세 보기`}
                    >
                      {book.title}
                    </button>
                  </td>

                  {/* 5. Author */}
                  <td style={{ color: 'rgba(224, 242, 254, 0.75)', fontSize: '0.86rem' }}>
                    {book.author}
                  </td>

                  {/* 6. Total Pages (Inline Editable) */}
                  <td style={{ textAlign: 'center' }}>
                    <div className="ledger-input-box" title="클릭하여 책의 전체 쪽수를 입력하세요">
                      <input
                        type="number"
                        min={1}
                        max={99999}
                        placeholder="입력"
                        className="ledger-page-input"
                        value={totalPages}
                        onChange={(e) =>
                          setEditingTotalPages((prev) => ({
                            ...prev,
                            [book.id]: e.target.value,
                          }))
                        }
                        onBlur={() => handleTotalPagesBlur(book)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                        }}
                      />
                      <span className="ledger-unit">p</span>
                    </div>
                  </td>

                  {/* 7. Read Page & Progress Bar */}
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                      <span style={{ fontWeight: 800, color: '#5eead4', fontSize: '0.92rem' }}>
                        {furthestPage > 0 ? `${furthestPage}p` : '0p'}
                      </span>
                      {progressPct !== null && (
                        <div style={{ width: '80%', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <div className="ledger-progress-bar-bg">
                            <div
                              className="ledger-progress-bar-fill"
                              style={{
                                width: `${progressPct}%`,
                                background: isCompleted
                                  ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                                  : 'linear-gradient(90deg, #0d9488, #2dd4bf)',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '0.68rem', color: isCompleted ? '#fde68a' : 'rgba(224,242,254,0.65)', fontWeight: 700 }}>
                            {progressPct}%
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* 8. Star Rating (Interactive 1~5 Stars) */}
                  <td style={{ textAlign: 'center' }}>
                    <div
                      className="ledger-stars-group"
                      onMouseLeave={() => setHoverRating({ bookId: null, rating: 0 })}
                      title="별점을 클릭하여 평가를 남겨보세요"
                    >
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          className="ledger-star-btn"
                          onMouseEnter={() => setHoverRating({ bookId: book.id, rating: star })}
                          onClick={() => handleRatingClick(book, star)}
                          aria-label={`${star}점 부여`}
                        >
                          <Star
                            size={16}
                            fill={star <= currentRating ? '#fbbf24' : 'transparent'}
                            color={star <= currentRating ? '#fbbf24' : 'rgba(255, 255, 255, 0.25)'}
                          />
                        </button>
                      ))}
                    </div>
                  </td>

                  {/* 9. Status (Clickable status badge) */}
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className={`ledger-status-badge ${book.status || 'reading'}`}
                      onClick={() => handleStatusToggle(book)}
                      title="클릭하여 다음 상태로 전환 (읽는 중 ↔ 완독 ↔ 보류)"
                    >
                      {isCompleted && '⭐ 완독'}
                      {isReading && '📖 읽는중'}
                      {isPaused && '⏸️ 보류'}
                    </button>
                  </td>

                  {/* 10. Actions (+ 기록 모달 또는 타임라인 필터) */}
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className="ledger-action-record-btn font-tech"
                      onClick={() => onOpenProgressModal && onOpenProgressModal(book)}
                      title="페이지 기록 & 상태 변경"
                    >
                      + 기록
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
