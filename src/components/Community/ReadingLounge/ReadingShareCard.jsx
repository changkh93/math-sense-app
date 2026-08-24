import React, { useState } from 'react';
import { Bookmark, Sparkles, MessageSquare, AlertTriangle, Eye, EyeOff, BookOpen } from 'lucide-react';
import { getReadingShareStage } from '../../../utils/readingSharePresentation';
import './ReadingLounge.css';

export default function ReadingShareCard({ share, onSelect }) {
  const [showSpoiler, setShowSpoiler] = useState(false);

  if (!share) return null;

  const { bookSnapshot, ownerSnapshot, review, reactionCounts, commentCount } = share;
  const hasSpoiler = Boolean(review?.hasSpoiler);
  const isBlind = hasSpoiler && !showSpoiler;
  const shareStage = getReadingShareStage(share);

  const wantToReadCount = reactionCounts?.wantToRead || 0;
  const readCount = reactionCounts?.read || 0;
  const resonatedCount = reactionCounts?.resonated || 0;

  const handleSpoilerToggle = (e) => {
    e.stopPropagation();
    setShowSpoiler((prev) => !prev);
  };

  return (
    <div
      className="reading-share-card glass"
      onClick={() => onSelect(share)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onSelect(share);
        }
      }}
    >
      {/* Book header */}
      <div className="share-card-book-header">
        <div className="share-book-spine" aria-hidden="true">
          <BookOpen size={18} />
        </div>
        <div className="share-card-book-info">
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: shareStage.kind === 'completed_recommendation' ? '#34d399' : '#38bdf8', marginBottom: '0.15rem' }}>
            {shareStage.kind === 'completed_recommendation' ? '✓' : '📖'} {shareStage.shortLabel}
          </div>
          <h3 className="share-card-book-title">{bookSnapshot?.title || '제목 없음'}</h3>
          <p className="share-card-book-author">
            {bookSnapshot?.author || '저자 미상'}
          </p>
        </div>
      </div>

      {/* Review content */}
      <div className="share-card-review">
        {isBlind ? (
          <div
            className="spoiler-blind-box"
            onClick={handleSpoilerToggle}
            role="button"
            tabIndex={0}
            aria-label="스포일러 내용 보기"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <AlertTriangle size={15} />
              <span>스포일러가 포함된 글입니다</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.78rem' }}>
              <Eye size={13} />
              <span>내용 보기</span>
            </div>
          </div>
        ) : (
          <>
            <p className="share-card-oneline">“{review?.oneLine}”</p>
            {review?.reason && (
              <p className="share-card-reason-preview">{review.reason}</p>
            )}
            {review?.sharedNotes?.length > 0 && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#7dd3fc', fontWeight: 700 }}>
                ✨ 독서 기록 {review.sharedNotes.length}개 함께 공개
              </div>
            )}
            {hasSpoiler && showSpoiler && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.75rem',
                  color: '#f87171',
                  cursor: 'pointer',
                  marginTop: '0.2rem',
                }}
                onClick={handleSpoilerToggle}
              >
                <EyeOff size={13} />
                <span>스포일러 다시 접기</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="share-card-footer">
        <div className="share-card-author">
          <span>{ownerSnapshot?.displayName || '별빛 탐험가'}</span>
        </div>

        <div className="share-card-counts">
          <div className="share-count-item want" title="읽고 싶어요">
            <Bookmark size={14} />
            <span>{wantToReadCount}</span>
          </div>
          {readCount > 0 && (
            <div className="share-count-item read" title="저도 읽었어요" style={{ color: '#34d399' }}>
              <BookOpen size={14} />
              <span>{readCount}</span>
            </div>
          )}
          <div className="share-count-item resonated" title="생각이 이어졌어요">
            <Sparkles size={14} />
            <span>{resonatedCount}</span>
          </div>
          <div className="share-count-item" title="댓글">
            <MessageSquare size={14} />
            <span>{commentCount || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
