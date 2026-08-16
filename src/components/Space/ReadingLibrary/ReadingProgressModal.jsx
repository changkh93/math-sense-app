import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BOOK_STATUSES, BOOK_STATUS_LABELS, validatePageInput } from '../../../utils/readingDomain';
import { getKSTDateString, getKSTTimeString } from '../../../utils/readingTime';
import { useSaveReadingProgress, useUpdateReadingBookStatus } from '../../../hooks/useReadingLibrary';
import { X, BookmarkPlus, Info } from 'lucide-react';
import './ReadingLibrary.css';

const MotionDiv = motion.div;

export default function ReadingProgressModal({ isOpen, onClose, book, onSaved }) {
  const saveProgressMutation = useSaveReadingProgress();
  const updateStatusMutation = useUpdateReadingBookStatus();

  const [page, setPage] = useState('');
  const [status, setStatus] = useState(BOOK_STATUSES.READING);
  const [memo, setMemo] = useState('');
  const [error, setError] = useState('');

  const pageInputRef = useRef(null);

  const curFurthest = book?.progress?.furthestPage || 0;
  const initialStatus = book?.status || BOOK_STATUSES.READING;

  useEffect(() => {
    if (isOpen && book) {
      setPage('');
      setStatus(book.status || BOOK_STATUSES.READING);
      setMemo('');
      setError('');
      setTimeout(() => pageInputRef.current?.focus(), 60);
    }
  }, [isOpen, book]);

  if (!isOpen || !book) return null;

  const numPage = Number(page);
  const isRetroactiveLowerPage = numPage > 0 && curFurthest > 0 && numPage < curFurthest;
  const isPending = saveProgressMutation.isPending || updateStatusMutation.isPending;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const hasPageInput = page.trim().length > 0;
    const isStatusChanged = status !== initialStatus;

    if (!hasPageInput && !isStatusChanged) {
      setError('마지막 읽은 쪽수를 입력하거나 독서 상태를 변경해 주세요.');
      return;
    }

    // Capture system date and clock time at the moment of saving
    const dateStr = getKSTDateString();
    const clockTime = getKSTTimeString();

    try {
      // 1. If status changed, update book status
      if (isStatusChanged) {
        await updateStatusMutation.mutateAsync({
          bookId: book.id,
          status,
        });
      }

      // 2. If page entered, save reading progress with current timestamp
      let saveResult = null;
      if (hasPageInput) {
        const pageVal = validatePageInput(page);
        if (!pageVal.valid) {
          setError(pageVal.message);
          return;
        }

        saveResult = await saveProgressMutation.mutateAsync({
          bookId: book.id,
          page: pageVal.page,
          dateStr,
          clockTime,
          memo,
        });
      }

      if (onSaved) onSaved(saveResult || { statusChanged: true });
      onClose();
    } catch (err) {
      setError(err.message || '저장에 실패했습니다. 다시 시도해 주세요.');
    }
  };

  return (
    <AnimatePresence>
      <div
        className="reading-modal-backdrop"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        <MotionDiv
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          className="reading-modal-card"
          onClick={(e) => e.stopPropagation()}
          style={{ width: 'min(480px, 100%)' }}
        >
          {/* Modal Header */}
          <div className="reading-modal-header">
            <h2 className="reading-modal-title">
              <BookmarkPlus size={20} color="#5eead4" />
              독서 기록 & 상태 변경
            </h2>
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}
              aria-label="닫기"
            >
              <X size={20} />
            </button>
          </div>

          {/* Book Info Header Card */}
          <div style={{
            marginBottom: '1.2rem',
            padding: '0.85rem 1rem',
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.6rem'
          }}>
            <div>
              <strong style={{ color: '#fff', fontSize: '1rem', display: 'block' }}>{book.title}</strong>
              <div style={{ fontSize: '0.82rem', color: 'rgba(224,242,254,0.65)', marginTop: 2 }}>{book.author}</div>
            </div>
            {curFurthest > 0 && (
              <div style={{
                textAlign: 'right',
                background: 'rgba(20, 184, 166, 0.15)',
                border: '1px solid rgba(45, 212, 191, 0.35)',
                padding: '0.3rem 0.65rem',
                borderRadius: 8
              }}>
                <div style={{ fontSize: '0.68rem', color: 'rgba(224, 242, 254, 0.6)' }}>현재 대표 기록</div>
                <div style={{ fontSize: '0.95rem', color: '#5eead4', fontWeight: 900 }}>{curFurthest}쪽</div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Page input (Left) & Status selector (Right) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(120px, 1fr) minmax(140px, 1.2fr)',
              gap: '0.75rem',
              marginBottom: '1rem',
              alignItems: 'flex-start'
            }}>
              {/* 1. 마지막 읽은 쪽수 (좌측) */}
              <div className="reading-form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="reading-progress-page" className="reading-form-label">
                  마지막 읽은 쪽수
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input
                    id="reading-progress-page"
                    ref={pageInputRef}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={99999}
                    className="reading-form-input"
                    placeholder={curFurthest > 0 ? `${curFurthest}` : "예: 64"}
                    value={page}
                    onChange={(e) => setPage(e.target.value)}
                    style={{ flex: 1, textAlign: 'left' }}
                  />
                  <span style={{ color: 'rgba(224, 242, 254, 0.75)', fontSize: '0.88rem', fontWeight: 800, flexShrink: 0 }}>
                    쪽
                  </span>
                </div>
              </div>

              {/* 2. 독서 상태 변경 (우측) */}
              <div className="reading-form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="reading-book-status" className="reading-form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>독서 상태</span>
                  {status !== initialStatus && (
                    <span style={{ fontSize: '0.7rem', color: '#fbbf24', fontWeight: 800 }}>[변경됨]</span>
                  )}
                </label>
                <select
                  id="reading-book-status"
                  className="reading-form-input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{
                    fontWeight: 700,
                    color: status === BOOK_STATUSES.COMPLETED ? '#fde68a' : status === BOOK_STATUSES.PAUSED ? '#e9d5ff' : '#5eead4',
                    borderColor: status === BOOK_STATUSES.COMPLETED ? 'rgba(251, 191, 36, 0.6)' : status === BOOK_STATUSES.PAUSED ? 'rgba(168, 85, 247, 0.5)' : 'rgba(45, 212, 191, 0.5)',
                  }}
                >
                  <option value={BOOK_STATUSES.READING}>📖 읽고 있어요</option>
                  <option value={BOOK_STATUSES.COMPLETED}>⭐ 완독했어요</option>
                  <option value={BOOK_STATUSES.PAUSED}>⏸️ 읽기 중단 (보류)</option>
                </select>
              </div>
            </div>

            {isRetroactiveLowerPage && (
              <div
                style={{
                  background: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  padding: '0.55rem 0.75rem',
                  borderRadius: 8,
                  color: '#bae6fd',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  marginBottom: '0.85rem',
                }}
              >
                <Info size={14} color="#38bdf8" style={{ flexShrink: 0 }} />
                <span>기존 최대 페이지({curFurthest}쪽)보다 작은 과거 기록을 추가하셔도 책장의 대표 페이지는 낮아지지 않습니다.</span>
              </div>
            )}

            {/* 한 줄 메모 (선택) */}
            <div className="reading-form-group">
              <label htmlFor="reading-progress-memo" className="reading-form-label">한 줄 메모 (선택)</label>
              <input
                id="reading-progress-memo"
                type="text"
                className="reading-form-input"
                placeholder="예: 여우와 대화하는 장면이 인상적이었다."
                maxLength={200}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
            </div>

            {error && (
              <div style={{ color: '#fb7185', fontSize: '0.82rem', marginBottom: '0.85rem', fontWeight: 600 }}>
                {error}
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.2rem' }}>
              <button
                type="button"
                className="space-nav-link font-tech"
                onClick={onClose}
                style={{ borderRadius: 8, padding: '0.55rem 1rem' }}
              >
                취소
              </button>
              <button
                type="submit"
                className="bookshelf-add-btn font-tech"
                disabled={isPending}
                style={{ opacity: isPending ? 0.7 : 1 }}
              >
                {isPending ? '저장 중...' : '저장하기'}
              </button>
            </div>
          </form>
        </MotionDiv>
      </div>
    </AnimatePresence>
  );
}
