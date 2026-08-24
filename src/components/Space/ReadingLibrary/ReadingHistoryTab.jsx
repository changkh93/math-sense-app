import React, { useState, useMemo } from 'react';
import { useReadingLogs } from '../../../hooks/useReadingLibrary';
import { BOOK_STATUS_LABELS } from '../../../utils/readingDomain';
import { formatKSTFullDateTime, getKSTDateString } from '../../../utils/readingTime';
import ReadingLedgerTable from './ReadingLedgerTable';
import { Clock, Filter, BookOpen, ChevronDown, CheckCircle, Calendar, Sparkles, TableProperties, Rows3, BookPlus } from 'lucide-react';
import './ReadingLibrary.css';

export default function ReadingHistoryTab({
  userId,
  books = [],
  onOpenNewBookModal,
  onOpenProgressModal,
  onOpenDetailDrawer,
}) {
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'timeline'
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'book', 'event', 'source'
  const [selectedBookId, setSelectedBookId] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [periodPreset, setPeriodPreset] = useState('all'); // 'all', '7d', '30d'

  const dateFilter = useMemo(() => {
    if (periodPreset === 'all') return { dateFrom: '', dateTo: '' };
    const now = new Date();
    const todayStr = getKSTDateString(now);
    const daysAgo = periodPreset === '7d' ? 6 : 29;
    const pastDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return {
      dateFrom: getKSTDateString(pastDate),
      dateTo: todayStr,
    };
  }, [periodPreset]);

  const queryFilters = useMemo(() => {
    const filters = {
      dateFrom: dateFilter.dateFrom,
      dateTo: dateFilter.dateTo,
    };
    if (filterMode === 'book' && selectedBookId) {
      filters.bookId = selectedBookId;
    } else if (filterMode === 'event' && selectedEventType) {
      filters.eventType = selectedEventType;
    } else if (filterMode === 'source' && selectedSource) {
      filters.source = selectedSource;
    }
    return filters;
  }, [filterMode, selectedBookId, selectedEventType, selectedSource, dateFilter]);

  const {
    data,
    isLoading: logsLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useReadingLogs(userId, { ...queryFilters, enabled: viewMode === 'timeline' });

  const allLogs = data?.pages?.flatMap((page) => page.logs) || [];

  return (
    <div className="reading-history-wrapper">
      {/* Top Toolbar with View Mode Switcher */}
      <div className="history-tab-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div className="bookshelf-view-toggle">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="도서별 독서 대장 (표 형식)"
            >
              <TableProperties size={15} />
              <span>독서 대장 (표)</span>
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'timeline' ? 'active' : ''}`}
              onClick={() => setViewMode('timeline')}
              title="시간순 타임라인 피드"
            >
              <Rows3 size={15} />
              <span>타임라인 피드</span>
            </button>
          </div>
        </div>

        {onOpenNewBookModal && (
          <button
            type="button"
            className="bookshelf-add-btn font-tech"
            onClick={onOpenNewBookModal}
          >
            <BookPlus size={16} />
            새 책 등록
          </button>
        )}
      </div>

      {/* Main Content: Table View vs Timeline View */}
      {viewMode === 'table' ? (
        /* 1. Book-by-book Reading Ledger Table */
        books.length === 0 ? (
          <div className="bookshelf-empty-board" style={{ padding: '3.5rem 1rem' }}>
            <Sparkles size={40} color="#5eead4" style={{ opacity: 0.8, marginBottom: '0.8rem' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: '0 0 0.4rem' }}>
              아직 등록된 도서가 없습니다.
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'rgba(224, 242, 254, 0.65)', margin: '0 0 1.4rem' }}>
              책을 등록하고 전체 쪽수와 별점 평가를 기록하며 나만의 독서 목록을 완성해 보세요.
            </p>
            {onOpenNewBookModal && (
              <button
                type="button"
                className="bookshelf-add-btn font-tech"
                onClick={onOpenNewBookModal}
                style={{ margin: '0 auto' }}
              >
                <BookPlus size={16} />
                첫 책 등록하기
              </button>
            )}
          </div>
        ) : (
          <ReadingLedgerTable
            books={books}
            onOpenProgressModal={onOpenProgressModal}
            onOpenDetailDrawer={onOpenDetailDrawer}
            onFilterBookLogs={(bookId) => {
              setSelectedBookId(bookId);
              setFilterMode('book');
              setViewMode('timeline');
            }}
          />
        )
      ) : (
        /* 2. Chronological Timeline Logs */
        <div>
          {/* Filters bar */}
          <div
            style={{
              background: 'rgba(10, 18, 38, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 14,
              padding: '0.85rem 1rem',
              marginBottom: '1.4rem',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.8rem',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#5eead4', fontSize: '0.82rem', fontWeight: 800 }}>
                <Filter size={15} />
                필터:
              </div>

              <button
                type="button"
                className={`bookshelf-filter-btn ${filterMode === 'all' ? 'active' : ''}`}
                onClick={() => {
                  setFilterMode('all');
                  setSelectedBookId('');
                  setSelectedEventType('');
                  setSelectedSource('');
                }}
              >
                전체
              </button>

              <button
                type="button"
                className={`bookshelf-filter-btn ${filterMode === 'book' ? 'active' : ''}`}
                onClick={() => {
                  setFilterMode('book');
                  if (books.length > 0 && !selectedBookId) setSelectedBookId(books[0].id);
                }}
              >
                책별
              </button>

              <button
                type="button"
                className={`bookshelf-filter-btn ${filterMode === 'source' ? 'active' : ''}`}
                onClick={() => {
                  setFilterMode('source');
                  if (!selectedSource) setSelectedSource('assignment');
                }}
              >
                출처별
              </button>

              <button
                type="button"
                className={`bookshelf-filter-btn ${filterMode === 'event' ? 'active' : ''}`}
                onClick={() => {
                  setFilterMode('event');
                  if (!selectedEventType) setSelectedEventType('progress');
                }}
              >
                이벤트별
              </button>

              {/* Sub-selector for book */}
              {filterMode === 'book' && (
                <select
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  className="reading-form-input"
                  style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.82rem', height: 32 }}
                >
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              )}

              {/* Sub-selector for source */}
              {filterMode === 'source' && (
                <select
                  value={selectedSource}
                  onChange={(e) => setSelectedSource(e.target.value)}
                  className="reading-form-input"
                  style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.82rem', height: 32 }}
                >
                  <option value="assignment">🛰️ 과제 기록소</option>
                  <option value="bookshelf">📖 나의 책장</option>
                </select>
              )}

              {/* Sub-selector for event */}
              {filterMode === 'event' && (
                <select
                  value={selectedEventType}
                  onChange={(e) => setSelectedEventType(e.target.value)}
                  className="reading-form-input"
                  style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.82rem', height: 32 }}
                >
                  <option value="progress">페이지 진행 기록</option>
                  <option value="status_change">상태 변경 이력</option>
                </select>
              )}
            </div>

            {/* Period preset filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'rgba(224, 242, 254, 0.55)', marginRight: 2 }}>기간:</span>
              {['all', '7d', '30d'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`bookshelf-filter-btn ${periodPreset === preset ? 'active' : ''}`}
                  onClick={() => setPeriodPreset(preset)}
                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}
                >
                  {preset === 'all' ? '전체' : preset === '7d' ? '최근 7일' : '최근 30일'}
                </button>
              ))}
            </div>
          </div>

          {logsLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(224,242,254,0.6)' }}>
              독서 기록을 불러오는 중...
            </div>
          ) : allLogs.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '3.5rem 1rem',
                background: 'rgba(10, 18, 38, 0.4)',
                border: '1px dashed rgba(255, 255, 255, 0.12)',
                borderRadius: 18,
              }}
            >
              <Sparkles size={40} color="#5eead4" style={{ opacity: 0.7, marginBottom: '0.8rem' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: '0 0 0.4rem' }}>
                해당 조건의 독서 기록이 없습니다.
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'rgba(224, 242, 254, 0.6)', margin: 0 }}>
                과제 기록소에서 과제를 제출하거나 나의 책장에서 페이지를 기록해 보세요.
              </p>
            </div>
          ) : (
            <div className="reading-timeline">
              {allLogs.map((log) => {
                const isAssignment = log.source === 'assignment';
                const bookTitle = log.bookSnapshot?.title || '책 정보 없음';
                const bookAuthor = log.bookSnapshot?.author || '';

                return (
                  <div key={log.id} className="reading-timeline-item">
                    <div className="reading-timeline-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Clock size={13} color="#5eead4" />
                        <span style={{ fontWeight: 600 }}>{formatKSTFullDateTime(log.readAt)}</span>
                      </div>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          padding: '0.18rem 0.5rem',
                          borderRadius: 6,
                          background: isAssignment ? 'rgba(245, 158, 11, 0.15)' : 'rgba(45, 212, 191, 0.15)',
                          color: isAssignment ? '#fbbf24' : '#2dd4bf',
                          border: `1px solid ${isAssignment ? 'rgba(245, 158, 11, 0.3)' : 'rgba(45, 212, 191, 0.3)'}`,
                        }}
                      >
                        {isAssignment ? '🛰️ 과제 기록소' : '📖 나의 책장'}
                      </span>
                    </div>

                    <div className="reading-timeline-title">
                      <BookOpen size={18} color="#5eead4" />
                      <span>{bookTitle}</span>
                      {bookAuthor && (
                        <span style={{ fontSize: '0.82rem', color: 'rgba(224, 242, 254, 0.6)', fontWeight: 500 }}>
                          ({bookAuthor})
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.92rem', fontWeight: 800, color: '#e0f2fe' }}>
                      {log.eventType === 'status_change' ? (
                        <span style={{ color: '#c084fc' }}>
                          상태 변경: {BOOK_STATUS_LABELS[log.statusTo] || log.statusTo}
                        </span>
                      ) : (
                        <span>
                          <strong style={{ color: '#5eead4' }}>{log.page}쪽</strong>까지 읽음
                        </span>
                      )}
                    </div>

                    {log.summary && (
                      <div className="reading-timeline-body">
                        {log.summary}
                      </div>
                    )}
                  </div>
                );
              })}

              {hasNextPage && (
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="space-btn font-tech"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    style={{ borderRadius: 10, padding: '0.6rem 1.4rem' }}
                  >
                    {isFetchingNextPage ? '불러오는 중...' : '독서 기록 더 보기'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
