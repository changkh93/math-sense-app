import React, { useState } from 'react';
import { Send, Trash2, MessageSquare, Loader } from 'lucide-react';
import { useReadingShareComments, useCommentReadingShare, useDeleteReadingShareComment } from '../../../hooks/useReadingSocial';
import { useAuth } from '../../../hooks/useAuth';
import './ReadingLounge.css';

const QUICK_QUESTIONS = [
  '가장 기억에 남은 생각은 무엇인가요?',
  '이 책이 어려웠던 점은 무엇인가요?',
  '나도 이 책을 읽으면 좋을까요?',
  '이 생각을 좀 더 듣고 싶어요.',
];

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
