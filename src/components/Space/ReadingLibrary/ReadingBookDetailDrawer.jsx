import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BOOK_STATUSES, BOOK_STATUS_LABELS, BOOK_STATUS_COLORS } from '../../../utils/readingDomain';
import { formatKSTFullDateTime, formatKSTShortDate } from '../../../utils/readingTime';
import { useReadingBook, useReadingLogs, useUpdateReadingBookStatus, useArchiveReadingBook } from '../../../hooks/useReadingLibrary';
import { X, BookOpen, Clock, Calendar, CheckCircle2, PauseCircle, PlayCircle, Archive, RotateCcw, Share2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReadingShareComposer from '../../Community/ReadingLounge/ReadingShareComposer';
import './ReadingLibrary.css';

const MotionDiv = motion.div;

export default function ReadingBookDetailDrawer({ isOpen, onClose, book, onOpenProgress }) {
  const navigate = useNavigate();
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const updateStatusMutation = useUpdateReadingBookStatus();
  const archiveBookMutation = useArchiveReadingBook();
  const { data: refreshedBook } = useReadingBook(book?.id);
  const currentBook = refreshedBook || book;

  const { data: logsData, isLoading: logsLoading } = useReadingLogs(currentBook?.userId, { bookId: currentBook?.id });
  const logs = logsData?.pages?.flatMap((p) => p.logs) || [];

  if (!isOpen || !book) return null;

  const status = currentBook.status || BOOK_STATUSES.READING;
  const statusLabel = BOOK_STATUS_LABELS[status] || '읽고 있어요';
  const colorScheme = BOOK_STATUS_COLORS[status] || BOOK_STATUS_COLORS.reading;
  const furthestPage = currentBook.progress?.furthestPage || 0;

  const handleStatusChange = async (nextStatus) => {
    try {
      await updateStatusMutation.mutateAsync({
        bookId: currentBook.id,
        status: nextStatus,
      });
    } catch (err) {
      alert(err.message || '상태 변경에 실패했습니다.');
    }
  };

  const handleArchive = async () => {
    if (!window.confirm('이 책을 책장에서 보관 처리하시겠습니까? (기존 독서 기록은 삭제되지 않고 안전하게 보존됩니다.)')) {
      return;
    }
    try {
      await archiveBookMutation.mutateAsync({ bookId: currentBook.id });
      onClose();
    } catch (err) {
      alert(err.message || '책 보관 처리에 실패했습니다.');
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
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 50 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="reading-modal-card"
          style={{ width: 'min(540px, 100%)', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="reading-modal-header" style={{ marginBottom: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                className="book-status-badge"
                style={{
                  background: colorScheme.badgeBg,
                  color: colorScheme.text,
                  border: `1px solid ${colorScheme.border}55`,
                }}
              >
                {statusLabel}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}
              aria-label="닫기"
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.3rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 900, margin: '0 0 0.3rem', color: '#fff' }}>
              {currentBook.title}
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'rgba(224, 242, 254, 0.7)', margin: '0 0 1rem' }}>
              {currentBook.author}
            </p>

            {/* Discovery attribution banner if linked from Reading Lounge */}
            {currentBook.discovery && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.8rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 12,
                  background: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#e0f2fe' }}>
                  <Sparkles size={16} color="#38bdf8" />
                  <span>
                    독서 라운지에서 <strong>{currentBook.discovery.recommenderDisplayName || '별빛 탐험가'}</strong> 님의 추천으로 담은 책
                  </span>
                </div>
                {currentBook.discovery.firstShareId && (
                  <button
                    type="button"
                    className="lounge-tab-btn"
                    style={{ fontSize: '0.74rem', padding: '0.25rem 0.6rem', shrink: 0 }}
                    onClick={() => {
                      onClose();
                      navigate(`/?view=agora&filter=reading&highlight=${currentBook.discovery.firstShareId}`);
                    }}
                  >
                    추천 글 보기
                  </button>
                )}
              </div>
            )}

            {/* Lifecycle Metadata */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '0.6rem',
                background: 'rgba(255, 255, 255, 0.04)',
                padding: '0.85rem',
                borderRadius: 12,
                marginBottom: '1.2rem',
                fontSize: '0.78rem',
              }}
            >
              <div>
                <span style={{ color: 'rgba(224, 242, 254, 0.55)', display: 'block' }}>최대 읽은 쪽</span>
                <strong style={{ color: '#5eead4', fontSize: '1.05rem' }}>{furthestPage > 0 ? `${furthestPage}쪽` : '없음'}</strong>
              </div>
              {status === BOOK_STATUSES.WANT_TO_READ ? (
                <div>
                  <span style={{ color: 'rgba(224, 242, 254, 0.55)', display: 'block' }}>관심 등록일</span>
                  <span style={{ color: '#38bdf8' }}>{formatKSTShortDate(currentBook.wantedAt || currentBook.createdAt)}</span>
                </div>
              ) : (
                <div>
                  <span style={{ color: 'rgba(224, 242, 254, 0.55)', display: 'block' }}>독서 시작일</span>
                  <span style={{ color: '#fff' }}>{formatKSTShortDate(currentBook.startedAt || currentBook.createdAt)}</span>
                </div>
              )}
              {currentBook.completedAt && (
                <div>
                  <span style={{ color: 'rgba(224, 242, 254, 0.55)', display: 'block' }}>완독 일자</span>
                  <span style={{ color: '#34d399' }}>{formatKSTShortDate(currentBook.completedAt)}</span>
                </div>
              )}
              {currentBook.pausedAt && (
                <div>
                  <span style={{ color: 'rgba(224, 242, 254, 0.55)', display: 'block' }}>중단 일자</span>
                  <span style={{ color: '#c084fc' }}>{formatKSTShortDate(currentBook.pausedAt)}</span>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.4rem' }}>
              {status === BOOK_STATUSES.WANT_TO_READ && (
                <>
                  <button
                    type="button"
                    className="bookshelf-add-btn font-tech"
                    onClick={() => handleStatusChange(BOOK_STATUSES.READING)}
                    disabled={updateStatusMutation.isPending}
                    style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
                  >
                    <PlayCircle size={14} />
                    독서 시작하기
                  </button>
                  <button
                    type="button"
                    className="space-nav-link font-tech"
                    onClick={() => handleStatusChange(BOOK_STATUSES.COMPLETED)}
                    disabled={updateStatusMutation.isPending}
                    style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem', color: '#34d399' }}
                  >
                    <CheckCircle2 size={14} />
                    완독으로 등록
                  </button>
                </>
              )}

              {status === BOOK_STATUSES.READING && (
                <>
                  <button
                    type="button"
                    className="bookshelf-add-btn font-tech"
                    onClick={() => {
                      onClose();
                      onOpenProgress?.(currentBook);
                    }}
                    style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
                  >
                    + 페이지 기록
                  </button>
                  <button
                    type="button"
                    className="space-nav-link font-tech"
                    onClick={() => handleStatusChange(BOOK_STATUSES.COMPLETED)}
                    disabled={updateStatusMutation.isPending}
                    style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem', color: '#34d399' }}
                  >
                    <CheckCircle2 size={14} />
                    완독으로 변경
                  </button>
                  <button
                    type="button"
                    className="space-nav-link font-tech"
                    onClick={() => handleStatusChange(BOOK_STATUSES.PAUSED)}
                    disabled={updateStatusMutation.isPending}
                    style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem', color: '#c084fc' }}
                  >
                    <PauseCircle size={14} />
                    읽기 중단
                  </button>
                </>
              )}

              {status === BOOK_STATUSES.COMPLETED && (
                <button
                  type="button"
                  className="bookshelf-add-btn font-tech"
                  onClick={() => handleStatusChange(BOOK_STATUSES.READING)}
                  disabled={updateStatusMutation.isPending}
                  style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
                >
                  <RotateCcw size={14} />
                  다시 읽기
                </button>
              )}

              {status === BOOK_STATUSES.PAUSED && (
                <button
                  type="button"
                  className="bookshelf-add-btn font-tech"
                  onClick={() => handleStatusChange(BOOK_STATUSES.READING)}
                  disabled={updateStatusMutation.isPending}
                  style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
                >
                  <PlayCircle size={14} />
                  읽기 재개
                </button>
              )}

              {/* Recommendation Actions */}
              {status !== BOOK_STATUSES.WANT_TO_READ && (
                currentBook.publicShare?.status === 'active' ? (
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      className="bookshelf-add-btn font-tech"
                      style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem', background: 'rgba(56, 189, 248, 0.2)', borderColor: '#38bdf8', color: '#38bdf8' }}
                      onClick={() => {
                        onClose();
                        navigate(`/?view=agora&filter=reading&highlight=${currentBook.publicShare.shareId}`);
                      }}
                    >
                      <Sparkles size={14} />
                      추천 글 보기
                    </button>
                    <button
                      type="button"
                      className="space-nav-link font-tech"
                      style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
                      onClick={() => {
                        onClose();
                        navigate(`/?view=agora&filter=reading&highlight=${currentBook.publicShare.shareId}`);
                      }}
                    >
                      수정
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="bookshelf-add-btn font-tech"
                    onClick={() => setIsComposerOpen(true)}
                    style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem', background: 'rgba(56, 189, 248, 0.15)', borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}
                  >
                    <Share2 size={14} />
                    이 책 추천하기
                  </button>
                )
              )}

              <button
                type="button"
                className="space-nav-link font-tech"
                onClick={handleArchive}
                disabled={archiveBookMutation.isPending}
                style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem', color: 'rgba(255,255,255,0.45)', marginLeft: 'auto' }}
              >
                <Archive size={14} />
                보관
              </button>
            </div>

            {/* Reading Timeline for this book */}
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 0.8rem', color: '#5eead4' }}>
              이 책의 독서 기록
            </h3>

            {logsLoading ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'rgba(224,242,254,0.5)' }}>기록을 불러오는 중...</div>
            ) : logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: 10, color: 'rgba(224,242,254,0.5)', fontSize: '0.85rem' }}>
                아직 등록된 독서 기록이 없습니다.
              </div>
            ) : (
              <div className="reading-timeline">
                {logs.map((log) => (
                  <div key={log.id} className="reading-timeline-item" style={{ padding: '0.85rem 1rem' }}>
                    <div className="reading-timeline-header">
                      <span>{formatKSTFullDateTime(log.readAt)}</span>
                      <span style={{ color: log.source === 'assignment' ? '#fbbf24' : '#2dd4bf', fontWeight: 700 }}>
                        {log.source === 'assignment' ? '🛰️ 과제' : '📖 책장'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: '#fff' }}>
                      {log.eventType === 'status_change' ? (
                        <span style={{ color: '#c084fc' }}>
                          상태 변경: {BOOK_STATUS_LABELS[log.statusTo] || log.statusTo}
                        </span>
                      ) : (
                        <span>{log.page}쪽까지 읽음</span>
                      )}
                    </div>

                    {log.summary && (
                      <div className="reading-timeline-body" style={{ fontSize: '0.84rem', padding: '0.55rem 0.75rem' }}>
                        {log.summary}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </MotionDiv>
      </div>

      {isComposerOpen && (
        <ReadingShareComposer
          isOpen={isComposerOpen}
          onClose={() => setIsComposerOpen(false)}
          initialBook={currentBook}
        />
      )}
    </AnimatePresence>
  );
}
