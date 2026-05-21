import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  ChevronDown,
  Gift,
  HandHeart,
  Heart,
  Loader,
  MessageCircle,
  SendHorizontal,
  Sparkles,
  Users
} from 'lucide-react';
import {
  useAssignmentShareComments,
  useAssignmentShareMutations,
  usePublicAssignmentShares
} from '../../hooks/useAssignmentShares';
import { useAuth } from '../../hooks/useAuth';
import { formatFeedbackForDisplay } from '../../utils/feedbackFormatting';

const toDateText = (value) => {
  if (!value) return '';
  const ms = typeof value.toMillis === 'function'
    ? value.toMillis()
    : value.seconds
      ? value.seconds * 1000
      : new Date(value).getTime();
  if (!Number.isFinite(ms)) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(ms));
};

const clampText = (value, fallback = '공개된 내용이 없습니다.') => {
  const text = String(value || '').trim();
  return text || fallback;
};

function AssignmentShareGuide() {
  return (
    <section className="assignment-share-guide glass">
      <div className="assignment-share-guide-main">
        <div className="assignment-share-guide-icon">
          <Sparkles size={22} />
        </div>
        <div>
          <div className="assignment-share-guide-kicker">기록 공개 탭</div>
          <h2>친구의 학습 기록을 읽고 응원하는 공간입니다</h2>
          <p>
            공개된 과제, 일일 학습 기록, 피드백을 보고 짧은 코멘트나 반응을 남겨 주세요.
            반응 버튼을 누르면 내 광석은 차감되지 않고, 기록을 공개한 친구에게 +1 광석이 선물됩니다.
          </p>
        </div>
      </div>
      <div className="assignment-share-guide-actions">
        <div>
          <Gift size={16} />
          <span>좋아요/위로 버튼: 친구에게 +1 광석</span>
        </div>
        <div>
          <Users size={16} />
          <span>N명 버튼: 반응한 친구 목록 보기</span>
        </div>
        <div>
          <MessageCircle size={16} />
          <span>댓글: 구체적인 응원과 피드백 남기기</span>
        </div>
      </div>
    </section>
  );
}

function AssignmentShareComments({ shareId }) {
  const [comment, setComment] = useState('');
  const { user } = useAuth();
  const { data: comments = [], isLoading } = useAssignmentShareComments(shareId);
  const { comment: commentMutation } = useAssignmentShareMutations();
  const trimmed = comment.trim();

  const handleSubmit = async () => {
    if (!trimmed || commentMutation.isPending) return;
    await commentMutation.mutateAsync({ shareId, content: trimmed });
    setComment('');
  };

  return (
    <div className="assignment-share-comments">
      <div className="assignment-share-comment-list">
        {isLoading ? (
          <div className="assignment-share-muted">댓글을 불러오는 중...</div>
        ) : comments.length === 0 ? (
          <div className="assignment-share-muted">아직 코멘트가 없습니다.</div>
        ) : comments.map(item => (
          <div key={item.id} className={`assignment-share-comment ${item.userId === user?.uid ? 'mine' : ''}`}>
            <span className="assignment-share-comment-author">{item.userName || '탐험가'}</span>
            <span>{item.content}</span>
          </div>
        ))}
      </div>
      <div className="assignment-share-comment-input">
        <input
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) handleSubmit();
          }}
          maxLength={240}
          placeholder="응원과 피드백을 남겨주세요"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!trimmed || commentMutation.isPending}
          aria-label="댓글 등록"
          className="assignment-share-comment-submit"
        >
          <SendHorizontal size={16} />
          <span>등록</span>
        </button>
      </div>
    </div>
  );
}

function AssignmentShareCard({ share, highlight }) {
  const { user } = useAuth();
  const { react } = useAssignmentShareMutations();
  const [expanded, setExpanded] = useState(false);
  const [showReactors, setShowReactors] = useState(false);
  const isComfort = share.kind === 'comfort';
  const reaction = isComfort ? 'comfort' : 'like';
  const reactedBy = isComfort ? share.comfortedBy : share.likedBy;
  const reactorProfiles = isComfort ? share.comfortedByProfiles : share.likedByProfiles;
  const alreadyReacted = reactedBy?.includes(user?.uid);
  const reactionCount = isComfort ? (share.comfortCount || 0) : (share.likeCount || 0);
  const isOwner = share.ownerId === user?.uid;
  const assignmentContent = clampText(share.assignment?.content);
  const feedback = clampText(share.assignment?.feedback, '');
  const reactionLabel = isComfort ? '위로' : '좋아요';

  const summaryItems = useMemo(() => ([
    { label: '퀴즈', value: share.dailySummary?.quizCount || 0 },
    { label: '로그', value: share.dailySummary?.logCount || 0 },
    { label: '영상', value: `${Math.round((share.dailySummary?.totalVideoSeconds || 0) / 60)}분` },
    { label: '집중', value: `${share.dailySummary?.attentionHits || 0}/${share.dailySummary?.attentionOpportunities || 0}` }
  ]), [share.dailySummary]);

  const reactors = useMemo(() => {
    const byId = new Map();
    (Array.isArray(reactorProfiles) ? reactorProfiles : []).forEach(item => {
      const userId = item?.userId || item?.uid;
      if (!userId) return;
      byId.set(userId, {
        userId,
        userName: String(item?.userName || item?.name || '탐험가').trim() || '탐험가'
      });
    });
    (Array.isArray(reactedBy) ? reactedBy : []).forEach(userId => {
      if (!userId || byId.has(userId)) return;
      byId.set(userId, {
        userId,
        userName: '이름 기록 전 반응'
      });
    });
    return Array.from(byId.values());
  }, [reactedBy, reactorProfiles]);

  const handleReact = async () => {
    if (alreadyReacted || react.isPending || isOwner) return;
    await react.mutateAsync({ shareId: share.id, reaction });
  };

  return (
    <article className={`assignment-share-card glass ${isComfort ? 'comfort' : 'archive'} ${highlight ? 'highlight-glow' : ''}`} id={`share-${share.id}`}>
      <div className="assignment-share-topline">
        <span className="assignment-share-kind">{isComfort ? '위로 요청' : '기록 공개'}</span>
        <span className="assignment-share-date">{toDateText(share.publishedAt)}</span>
      </div>

      <header className="assignment-share-header">
        <div>
          <h3>{share.ownerName || '탐험가'}의 항행 기록</h3>
          <p>{share.assignment?.date} · {share.assignment?.clusterId || '학습 성단'}</p>
        </div>
        {Number(share.assignment?.bonusCrystals || 0) > 0 && (
          <div className="assignment-share-bonus">+{share.assignment.bonusCrystals} 광석</div>
        )}
      </header>

      {isComfort && (
        <div className="assignment-share-comfort-note">
          평가가 아쉬웠거나 마음이 무거운 날입니다. 친구들의 격려가 필요해요.
        </div>
      )}

      <section className="assignment-share-section">
        <h4>나의 과제</h4>
        <div className={`assignment-share-markdown ${expanded ? 'expanded' : ''}`}>
          <ReactMarkdown>{assignmentContent}</ReactMarkdown>
        </div>
        {assignmentContent.length > 180 && (
          <button className="assignment-share-link-button" onClick={() => setExpanded(prev => !prev)}>
            {expanded ? '접기' : '자세히 보기'}
          </button>
        )}
      </section>

      <section className="assignment-share-daily">
        {summaryItems.map(item => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </section>

      {feedback && (
        <section className="assignment-share-section feedback">
          <h4>피드백</h4>
          <div className="assignment-share-markdown feedback-text">
            <ReactMarkdown>{formatFeedbackForDisplay(feedback)}</ReactMarkdown>
          </div>
        </section>
      )}

      <footer className="assignment-share-actions">
        <div className="assignment-share-reaction-group">
          <button
            type="button"
            className={`assignment-share-reaction ${alreadyReacted ? 'active' : ''}`}
            onClick={handleReact}
            disabled={alreadyReacted || react.isPending || isOwner}
            title={isOwner ? '내 기록에는 보상을 받을 수 없습니다' : alreadyReacted ? '이미 눌렀습니다' : '내 광석 차감 없이 친구에게 +1 광석을 선물합니다'}
          >
            {isComfort ? <HandHeart size={17} /> : <Heart size={17} fill={alreadyReacted ? 'currentColor' : 'none'} />}
            <span>{reactionLabel} +1 선물</span>
          </button>
          <button
            type="button"
            className={`assignment-share-reactors-toggle ${showReactors ? 'open' : ''}`}
            onClick={() => setShowReactors(prev => !prev)}
            disabled={reactionCount < 1}
            aria-expanded={showReactors}
            title={reactionCount < 1 ? '아직 반응한 친구가 없습니다' : `${reactionLabel}를 누른 친구 보기`}
          >
            <Users size={15} />
            <span>{reactionCount}명</span>
            <ChevronDown size={14} />
          </button>
        </div>
        <div className="assignment-share-comment-count">
          <MessageCircle size={16} />
          <span>{share.commentCount || 0}</span>
        </div>
      </footer>

      {showReactors && (
        <div className="assignment-share-reactors-panel">
          <div className="assignment-share-reactors-title">
            {reactionLabel}를 누른 친구
          </div>
          {reactors.length === 0 ? (
            <div className="assignment-share-muted">아직 표시할 친구가 없습니다.</div>
          ) : (
            <div className="assignment-share-reactors-list">
              {reactors.map(item => (
                <div key={item.userId} className="assignment-share-reactor">
                  <span className="assignment-share-reactor-avatar">{item.userName.slice(0, 1)}</span>
                  <span>{item.userName}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <AssignmentShareComments shareId={share.id} />
    </article>
  );
}

export default function AssignmentShareFeed({ highlightId }) {
  const { data: shares = [], isLoading, isError, error } = usePublicAssignmentShares();
  const lastScrolledIdRef = useRef('');

  useEffect(() => {
    if (!highlightId || shares.length === 0 || lastScrolledIdRef.current === highlightId) return;
    const timer = window.setTimeout(() => {
      const el = document.getElementById(`share-${highlightId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        lastScrolledIdRef.current = highlightId;
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [highlightId, shares]);

  if (isLoading) {
    return (
      <div className="assignment-share-area">
        <AssignmentShareGuide />
        <div className="assignment-share-state glass">
          <Loader size={18} className="spin-icon" />
          공개 기록을 불러오는 중...
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="assignment-share-area">
        <AssignmentShareGuide />
        <div className="assignment-share-state glass">
          기록 공개 탭을 불러오지 못했습니다. {error?.message || ''}
        </div>
      </div>
    );
  }

  if (shares.length === 0) {
    return (
      <div className="assignment-share-area">
        <AssignmentShareGuide />
        <div className="assignment-share-state glass">
          아직 공개된 항행 기록이 없습니다. 과제 기록소에서 첫 기록을 열어보세요.
        </div>
      </div>
    );
  }

  return (
    <div className="assignment-share-area">
      <AssignmentShareGuide />
      <div className="assignment-share-feed">
        {shares.map(share => (
          <AssignmentShareCard key={share.id} share={share} highlight={highlightId === share.id} />
        ))}
      </div>
    </div>
  );
}
