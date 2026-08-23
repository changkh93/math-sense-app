import React, { useState } from 'react';
import { Send, Trash2, MessageSquare, CornerDownRight, ChevronDown, ChevronUp, Loader } from 'lucide-react';
import {
  useReadingShareComments,
  useCommentReadingShare,
  useDeleteReadingShareComment,
  useReadingShareReplies,
  useReplyToReadingShareComment,
  useDeleteReadingShareReply,
} from '../../../hooks/useReadingSocial';
import { useAuth } from '../../../hooks/useAuth';
import './ReadingLounge.css';

const QUICK_QUESTIONS = [
  '가장 기억에 남은 생각은 무엇인가요?',
  '이 책이 어려웠던 점은 무엇인가요?',
  '나도 이 책을 읽으면 좋을까요?',
  '이 생각을 좀 더 듣고 싶어요.',
];

function CommentRepliesSection({ shareId, comment }) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const {
    data: repliesData,
    isLoading: isRepliesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useReadingShareReplies(shareId, comment.id, { enabled: isExpanded });

  const replyMutation = useReplyToReadingShareComment();
  const deleteReplyMutation = useDeleteReadingShareReply();

  const replies = repliesData?.pages?.flatMap((p) => p.replies) || [];
  const replyCount = comment.replyCount || 0;

  const handleReplySubmit = async (e) => {
    e?.preventDefault();
    const trimmed = replyContent.trim();
    if (!trimmed || trimmed.length > 240 || replyMutation.isPending) return;

    try {
      await replyMutation.mutateAsync({
        shareId,
        rootCommentId: comment.id,
        content: trimmed,
      });
      setReplyContent('');
      setIsReplying(false);
      setIsExpanded(true);
    } catch (err) {
      alert(err.message || '답글 등록에 실패했습니다.');
    }
  };

  const handleDeleteReply = async (replyId) => {
    if (!window.confirm('이 답글을 삭제하시겠습니까?')) return;
    try {
      await deleteReplyMutation.mutateAsync({
        shareId,
        rootCommentId: comment.id,
        replyId,
      });
    } catch (err) {
      alert(err.message || '답글 삭제에 실패했습니다.');
    }
  };

  return (
    <div style={{ marginTop: '0.4rem', paddingLeft: '0.75rem', borderLeft: '2px solid rgba(255,255,255,0.08)' }}>
      {/* Reply Toggle & Action button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.78rem' }}>
        {replyCount > 0 && (
          <button
            type="button"
            className="quick-question-chip"
            style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.08)', color: '#38bdf8' }}
            onClick={() => setIsExpanded((prev) => !prev)}
          >
            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            <span>답글 {replyCount}개 {isExpanded ? '접기' : '보기'}</span>
          </button>
        )}

        {comment.status !== 'deleted' && (
          <button
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontSize: '0.76rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.2rem 0.4rem',
            }}
            onClick={() => {
              setIsReplying((prev) => !prev);
              if (!isExpanded && replyCount > 0) setIsExpanded(true);
            }}
          >
            <CornerDownRight size={12} />
            <span>답글 달기</span>
          </button>
        )}
      </div>

      {/* Reply Input Form */}
      {isReplying && (
        <form onSubmit={handleReplySubmit} style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.2rem' }}>
            @{comment.userSnapshot?.displayName || '탐험가'}님에게 답글
          </div>
          <textarea
            className="comment-textarea"
            placeholder="답글을 남겨보세요... (최대 240자)"
            value={replyContent}
            maxLength={240}
            onChange={(e) => setReplyContent(e.target.value)}
            rows={2}
            style={{ fontSize: '0.82rem', padding: '0.5rem 0.75rem' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleReplySubmit();
              }
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.3rem' }}>
            <button
              type="button"
              className="lounge-tab-btn"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
              onClick={() => setIsReplying(false)}
            >
              취소
            </button>
            <button
              type="submit"
              className="comment-submit-btn"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}
              disabled={!replyContent.trim() || replyMutation.isPending}
            >
              {replyMutation.isPending ? '남기는 중...' : '답글 남기기'}
            </button>
          </div>
        </form>
      )}

      {/* Replies list */}
      {isExpanded && (
        <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {isRepliesLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem', color: 'rgba(255,255,255,0.5)' }}>
              <Loader size={15} className="animate-spin" />
            </div>
          ) : replies.length === 0 ? (
            <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.4)', padding: '0.3rem 0' }}>
              답글이 없습니다.
            </div>
          ) : (
            replies.map((r) => {
              const isReplyOwner = user?.uid === r.userId || user?.uid === r.authorId;
              const isReplyDeleted = r.status === 'deleted';

              return (
                <div
                  key={r.id}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: isReplyDeleted ? 'rgba(255,255,255,0.4)' : '#a78bfa', fontSize: '0.78rem' }}>
                      {r.userSnapshot?.displayName || '별빛 탐험가'}
                    </span>
                    {isReplyOwner && !isReplyDeleted && (
                      <button
                        type="button"
                        onClick={() => handleDeleteReply(r.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'rgba(239, 68, 68, 0.7)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title="답글 삭제"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>

                  {isReplyDeleted ? (
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                      작성자에 의해 삭제된 댓글입니다.
                    </p>
                  ) : (
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                      {r.content}
                    </p>
                  )}
                </div>
              );
            })
          )}

          {hasNextPage && (
            <button
              type="button"
              className="lounge-tab-btn"
              style={{ alignSelf: 'center', marginTop: '0.3rem', fontSize: '0.74rem', padding: '0.2rem 0.5rem' }}
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? '답글 불러오는 중...' : '답글 더 보기'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReadingShareComments({ shareId, isOpen, commentCount = 0 }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const {
    data: commentsData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useReadingShareComments(shareId, { enabled: isOpen });

  const commentMutation = useCommentReadingShare();
  const deleteMutation = useDeleteReadingShareComment();

  const comments = commentsData?.pages?.flatMap((p) => p.comments) || [];

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || trimmed.length > 240 || commentMutation.isPending) return;

    try {
      await commentMutation.mutateAsync({
        shareId,
        content: trimmed,
      });
      setContent('');
    } catch (err) {
      alert(err.message || '댓글 등록에 실패했습니다.');
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('이 댓글을 삭제하시겠습니까?')) return;
    try {
      await deleteMutation.mutateAsync({ shareId, commentId });
    } catch (err) {
      alert(err.message || '댓글 삭제에 실패했습니다.');
    }
  };

  const handleQuickQuestionClick = (q) => {
    setContent((prev) => (prev ? `${prev} ${q}` : q));
  };

  return (
    <div className="drawer-comments-section">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, color: '#f1f5f9' }}>
        <MessageSquare size={17} color="#38bdf8" />
        <span>생각 나누기 댓글 ({commentCount})</span>
      </div>

      {/* Quick question chips */}
      <div className="quick-question-chips">
        {QUICK_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            type="button"
            className="quick-question-chip"
            onClick={() => handleQuickQuestionClick(q)}
          >
            💬 {q}
          </button>
        ))}
      </div>

      {/* Comment Input */}
      <form onSubmit={handleSubmit} className="comment-input-box">
        <textarea
          className="comment-textarea"
          placeholder="책에 대한 질문이나 감상을 남겨보세요... (최대 240자)"
          value={content}
          maxLength={240}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
            {content.length} / 240자
          </span>
          <button
            type="submit"
            className="comment-submit-btn"
            disabled={!content.trim() || commentMutation.isPending}
          >
            {commentMutation.isPending ? '남기는 중...' : '생각 남기기'}
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div className="comments-list">
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem', color: 'rgba(255,255,255,0.5)' }}>
            <Loader size={20} className="animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem' }}>
            첫 번째 질문이나 생각을 남겨보세요!
          </div>
        ) : (
          comments.map((c) => {
            const isOwner = user?.uid === c.userId;
            const isDeleted = c.status === 'deleted';

            return (
              <div key={c.id} className="comment-item">
                <div className="comment-item-header">
                  <span style={{ fontWeight: 700, color: isDeleted ? 'rgba(255,255,255,0.4)' : '#38bdf8' }}>
                    {c.userSnapshot?.displayName || '별빛 탐험가'}
                  </span>
                  {isOwner && !isDeleted && (
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(239, 68, 68, 0.7)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="댓글 삭제"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                {isDeleted ? (
                  <p className="comment-item-deleted">작성자에 의해 삭제된 댓글입니다.</p>
                ) : (
                  <p className="comment-item-content">{c.content}</p>
                )}

                {/* 1-level Replies Section */}
                <CommentRepliesSection shareId={shareId} comment={c} />
              </div>
            );
          })
        )}

        {hasNextPage && (
          <button
            type="button"
            className="lounge-tab-btn"
            style={{ alignSelf: 'center', marginTop: '0.5rem', fontSize: '0.82rem' }}
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? '댓글 불러오는 중...' : '댓글 더 보기'}
          </button>
        )}
      </div>
    </div>
  );
}
