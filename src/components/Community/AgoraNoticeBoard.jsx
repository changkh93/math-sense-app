import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader, Megaphone, Plus, X } from 'lucide-react';
import {
  AGORA_NOTICE_OPERATOR_EMAIL,
  createNoticeCommandId,
  useAgoraNotices,
  useCreateAgoraNotice,
} from '../../hooks/useAgoraNotices';
import { parseInlineFormatting } from '../../utils/formatUtils';
import './AgoraNoticeBoard.css';

function toMillis(value, fallback = 0) {
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (Number.isFinite(Number(value))) return Number(value);
  return fallback;
}

function formatNoticeDate(notice) {
  const millis = toMillis(notice.publishedAt, notice.publishedAtMs);
  if (!millis) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(millis));
}

function NoticeComposer({ onClose }) {
  const commandIdRef = useRef(createNoticeCommandId());
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const createNotice = useCreateAgoraNotice();
  const normalizedTitle = title.trim();
  const normalizedContent = content.trim();
  const canSubmit = normalizedTitle.length > 0
    && normalizedTitle.length <= 100
    && normalizedContent.length > 0
    && normalizedContent.length <= 3000
    && !createNotice.isPending;
  const isDirty = Boolean(normalizedTitle || normalizedContent);

  const requestClose = useCallback(() => {
    if (createNotice.isPending) return;
    if (isDirty && !window.confirm('작성 중인 공지 내용이 사라집니다. 닫을까요?')) return;
    onClose();
  }, [createNotice.isPending, isDirty, onClose]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      requestClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [requestClose]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    createNotice.mutate(
      { title: normalizedTitle, content: normalizedContent, commandId: commandIdRef.current },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="agora-notice-modal-backdrop" role="presentation" onMouseDown={requestClose}>
      <section
        className="agora-notice-modal glass"
        role="dialog"
        aria-modal="true"
        aria-labelledby="agora-notice-compose-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="agora-notice-modal-header">
          <div>
            <span>운영자 전용</span>
            <h2 id="agora-notice-compose-title">공지사항 작성</h2>
          </div>
          <button type="button" aria-label="닫기" onClick={requestClose} disabled={createNotice.isPending}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <label>
            제목 <small>{title.length}/100</small>
            <input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={100}
              placeholder="공지 제목을 입력하세요"
            />
          </label>
          <label>
            내용 <small>{content.length}/3000</small>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              maxLength={3000}
              rows={9}
              placeholder="학생들에게 안내할 내용을 입력하세요"
            />
          </label>
          {createNotice.isError && (
            <p className="agora-notice-form-error" role="alert">
              {createNotice.error?.message || '공지를 저장하지 못했습니다.'}
            </p>
          )}
          <div className="agora-notice-modal-actions">
            <button type="button" className="secondary" onClick={requestClose} disabled={createNotice.isPending}>취소</button>
            <button type="submit" className="primary" disabled={!canSubmit}>
              {createNotice.isPending ? <><Loader size={16} className="spin-icon" /> 저장 중</> : '공지 등록'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function AgoraNoticeBoard({
  userEmail = '',
  userEmailVerified = false,
  isAuthenticated = false,
}) {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const noticeQuery = useAgoraNotices({ enabled: isAuthenticated });
  const notices = useMemo(
    () => noticeQuery.data?.pages?.flatMap((page) => page.items) || [],
    [noticeQuery.data],
  );
  const isOperator = userEmailVerified === true
    && String(userEmail).trim().toLowerCase() === AGORA_NOTICE_OPERATOR_EMAIL;

  return (
    <section className="agora-notice-board" aria-labelledby="agora-notice-heading">
      <header className="agora-notice-board-header">
        <div>
          <span className="agora-notice-board-kicker"><Megaphone size={15} /> 운영 소식</span>
          <h2 id="agora-notice-heading">공지사항</h2>
          <p>아고라와 학습 활동에 필요한 안내를 확인해 주세요.</p>
        </div>
        {isOperator && (
          <button type="button" className="agora-notice-create" onClick={() => setIsComposerOpen(true)}>
            <Plus size={17} /> 공지 작성
          </button>
        )}
      </header>

      {!isAuthenticated ? (
        <div className="agora-notice-state">공지사항을 확인하려면 로그인이 필요합니다.</div>
      ) : noticeQuery.isLoading ? (
        <div className="agora-notice-state"><Loader className="spin-icon" /> 공지를 불러오는 중...</div>
      ) : noticeQuery.isError ? (
        <div className="agora-notice-state error" role="alert">공지를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</div>
      ) : notices.length === 0 ? (
        <div className="agora-notice-state">등록된 공지사항이 없습니다.</div>
      ) : (
        <div className="agora-notice-list">
          {notices.map((notice) => (
            <article key={notice.id} className="agora-notice-card glass">
              <div className="agora-notice-card-meta">
                <span>공지</span>
                <time>{formatNoticeDate(notice)}</time>
              </div>
              <h3>{notice.title}</h3>
              <div className="agora-notice-card-content">
                {parseInlineFormatting(notice.content, {
                  keyPrefix: `agora-notice-${notice.id}`,
                  linkColor: '#7dd3fc',
                })}
              </div>
            </article>
          ))}
        </div>
      )}

      {noticeQuery.hasNextPage && (
        <button
          type="button"
          className="agora-notice-load-more glass"
          onClick={() => noticeQuery.fetchNextPage()}
          disabled={noticeQuery.isFetchingNextPage}
        >
          {noticeQuery.isFetchingNextPage ? '불러오는 중...' : '이전 공지 더 보기'}
        </button>
      )}

      {isComposerOpen && <NoticeComposer onClose={() => setIsComposerOpen(false)} />}
    </section>
  );
}
