import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BOOK_STATUSES, BOOK_STATUS_LABELS, validateBookForm, normalizeString } from '../../../utils/readingDomain';
import { getKSTDateString } from '../../../utils/readingTime';
import { useCreateReadingBook } from '../../../hooks/useReadingLibrary';
import { X, BookPlus, AlertCircle } from 'lucide-react';
import './ReadingLibrary.css';

const MotionDiv = motion.div;

export default function ReadingBookFormModal({ isOpen, onClose, existingBooks = [], onBookCreated }) {
  const createBookMutation = useCreateReadingBook();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [status, setStatus] = useState(BOOK_STATUSES.READING);
  const [dateInput, setDateInput] = useState(() => getKSTDateString());
  const [error, setError] = useState('');

  const titleInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setAuthor('');
      setStatus(BOOK_STATUSES.READING);
      setDateInput(getKSTDateString());
      setError('');
      setTimeout(() => titleInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Duplicate warning detection
  const isDuplicate = existingBooks.some((b) => {
    return normalizeString(b.title) === normalizeString(title) &&
      normalizeString(b.author) === normalizeString(author);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateBookForm({ title, author, status });
    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    setError('');
    try {
      const result = await createBookMutation.mutateAsync({
        title: validation.title,
        author: validation.author,
        status: validation.status,
        dateInput: status !== BOOK_STATUSES.READING ? dateInput : null,
      });

      if (onBookCreated) {
        onBookCreated(result);
      }
      onClose();
    } catch (err) {
      setError(err.message || '책 등록에 실패했습니다.');
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
        >
          <div className="reading-modal-header">
            <h2 className="reading-modal-title">
              <BookPlus size={20} color="#5eead4" />
              새 책 등록
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

          <form onSubmit={handleSubmit}>
            <div className="reading-form-group">
              <label htmlFor="reading-book-title" className="reading-form-label">
                책 제목 <span style={{ color: '#f43f5e' }}>*</span>
              </label>
              <input
                id="reading-book-title"
                ref={titleInputRef}
                type="text"
                className="reading-form-input"
                placeholder="예: 어린 왕자"
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="reading-form-group">
              <label htmlFor="reading-book-author" className="reading-form-label">
                저자 <span style={{ color: '#f43f5e' }}>*</span>
              </label>
              <input
                id="reading-book-author"
                type="text"
                className="reading-form-input"
                placeholder="예: 앙투안 드 생텍쥐페리"
                maxLength={120}
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                required
              />
            </div>

            <div className="reading-form-group">
              <label htmlFor="reading-book-status" className="reading-form-label">독서 상태</label>
              <select
                id="reading-book-status"
                className="reading-form-input"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value={BOOK_STATUSES.READING}>{BOOK_STATUS_LABELS.reading}</option>
                <option value={BOOK_STATUSES.WANT_TO_READ}>{BOOK_STATUS_LABELS.want_to_read}</option>
                <option value={BOOK_STATUSES.COMPLETED}>{BOOK_STATUS_LABELS.completed}</option>
                <option value={BOOK_STATUSES.PAUSED}>{BOOK_STATUS_LABELS.paused}</option>
              </select>
            </div>

            {(status === BOOK_STATUSES.COMPLETED || status === BOOK_STATUSES.PAUSED) && (
              <div className="reading-form-group">
                <label htmlFor="reading-book-date" className="reading-form-label">
                  {status === BOOK_STATUSES.COMPLETED ? '완독 일자' : '중단 일자'}
                </label>
                <input
                  id="reading-book-date"
                  type="date"
                  className="reading-form-input"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                />
              </div>
            )}

            {isDuplicate && (
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 8,
                  color: '#fde68a',
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  marginBottom: '1rem',
                }}
              >
                <AlertCircle size={15} color="#fbbf24" style={{ flexShrink: 0 }} />
                <span>동일한 제목과 저자의 책이 책장에 이미 등록되어 있습니다. 다른 판본인 경우 등록을 진행하셔도 됩니다.</span>
              </div>
            )}

            {error && (
              <div style={{ color: '#fb7185', fontSize: '0.82rem', marginBottom: '0.85rem', fontWeight: 600 }}>
                {error}
              </div>
            )}

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
                disabled={createBookMutation.isPending}
                style={{ opacity: createBookMutation.isPending ? 0.7 : 1 }}
              >
                {createBookMutation.isPending ? '등록 중...' : '등록하기'}
              </button>
            </div>
          </form>
        </MotionDiv>
      </div>
    </AnimatePresence>
  );
}
