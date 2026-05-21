import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Heart, HandHeart, Loader, MessageCircle, SendHorizontal } from 'lucide-react';
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
          aria-label="댓글 보내기"
        >
          <SendHorizontal size={16} />
        </button>
      </div>
    </div>
  );
}

function AssignmentShareCard({ share }) {
  const { user } = useAuth();
  const { react } = useAssignmentShareMutations();
  const [expanded, setExpanded] = useState(false);
  const isComfort = share.kind === 'comfort';
  const reaction = isComfort ? 'comfort' : 'like';
  const reactedBy = isComfort ? share.comfortedBy : share.likedBy;
  const alreadyReacted = reactedBy?.includes(user?.uid);
  const reactionCount = isComfort ? (share.comfortCount || 0) : (share.likeCount || 0);
  const isOwner = share.ownerId === user?.uid;
  const assignmentContent = clampText(share.assignment?.content);
  const feedback = clampText(share.assignment?.feedback, '');

  const summaryItems = useMemo(() => ([
    { label: '퀴즈', value: share.dailySummary?.quizCount || 0 },
    { label: '로그', value: share.dailySummary?.logCount || 0 },
    { label: '영상', value: `${Math.round((share.dailySummary?.totalVideoSeconds || 0) / 60)}분` },
    { label: '집중', value: `${share.dailySummary?.attentionHits || 0}/${share.dailySummary?.attentionOpportunities || 0}` }
  ]), [share.dailySummary]);

  const handleReact = async () => {
    if (alreadyReacted || react.isPending || isOwner) return;
    await react.mutateAsync({ shareId: share.id, reaction });
  };

  return (
    <article className={`assignment-share-card glass ${isComfort ? 'comfort' : 'archive'}`}>
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
        <button
          type="button"
          className={`assignment-share-reaction ${alreadyReacted ? 'active' : ''}`}
          onClick={handleReact}
          disabled={alreadyReacted || react.isPending || isOwner}
          title={isOwner ? '내 기록에는 보상을 받을 수 없습니다' : alreadyReacted ? '이미 눌렀습니다' : '+1 광석 응원'}
        >
          {isComfort ? <HandHeart size={17} /> : <Heart size={17} fill={alreadyReacted ? 'currentColor' : 'none'} />}
          <span>{isComfort ? '위로' : '좋아요'} {reactionCount}</span>
        </button>
        <div className="assignment-share-comment-count">
          <MessageCircle size={16} />
          <span>{share.commentCount || 0}</span>
        </div>
      </footer>

      <AssignmentShareComments shareId={share.id} />
    </article>
  );
}

export default function AssignmentShareFeed() {
  const { data: shares = [], isLoading, isError, error } = usePublicAssignmentShares();

  if (isLoading) {
    return (
      <div className="assignment-share-state glass">
        <Loader size={18} className="spin-icon" />
        공개 기록을 불러오는 중...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="assignment-share-state glass">
        기록 공개 탭을 불러오지 못했습니다. {error?.message || ''}
      </div>
    );
  }

  if (shares.length === 0) {
    return (
      <div className="assignment-share-state glass">
        아직 공개된 항행 기록이 없습니다. 과제 기록소에서 첫 기록을 열어보세요.
      </div>
    );
  }

  return (
    <div className="assignment-share-feed">
      {shares.map(share => (
        <AssignmentShareCard key={share.id} share={share} />
      ))}
    </div>
  );
}
