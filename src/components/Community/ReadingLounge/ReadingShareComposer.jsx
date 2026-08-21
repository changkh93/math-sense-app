import React, { useState } from 'react';
import { X, BookOpen, AlertTriangle, Sparkles, Check, HelpCircle } from 'lucide-react';
import { useReadingShareDraftSources, usePublishReadingShare, useUpdateReadingShare } from '../../../hooks/useReadingSocial';
import { useReadingBooks } from '../../../hooks/useReadingLibrary';
import { useAuth } from '../../../hooks/useAuth';
import './ReadingLounge.css';

export default function ReadingShareComposer({
  isOpen,
  onClose,
  initialBook = null,
  existingShare = null,
}) {
  const { user } = useAuth();
  const [selectedBookId, setSelectedBookId] = useState(initialBook?.id || existingShare?.sourceBookId || '');
  const [oneLine, setOneLine] = useState(existingShare?.review?.oneLine || '');
  const [reason, setReason] = useState(existingShare?.review?.reason || '');
  const [question, setQuestion] = useState(existingShare?.review?.question || '');
  const [hasSpoiler, setHasSpoiler] = useState(existingShare?.review?.hasSpoiler || false);
  const [isPagePublic, setIsPagePublic] = useState(Boolean(existingShare?.bookSnapshot?.page));
  const [page, setPage] = useState(existingShare?.bookSnapshot?.page ? String(existingShare.bookSnapshot.page) : '');
  const [activeTab, setActiveTab] = useState('write'); // 'write' | 'preview'

  const { data: myBooksData } = useReadingBooks(user?.uid);
  const myBooks = Array.isArray(myBooksData) ? myBooksData : (myBooksData?.books || []);
  const currentBook = myBooks.find((b) => b.id === selectedBookId) || initialBook;

  const { data: draftSourcesData } = useReadingShareDraftSources(selectedBookId, {
    enabled: Boolean(selectedBookId && isOpen && !existingShare),
  });
  const draftSources = draftSourcesData?.sources || [];

  const publishMutation = usePublishReadingShare();
  const updateMutation = useUpdateReadingShare();

  if (!isOpen) return null;

  const handleApplyDraft = (text) => {
    if (!oneLine.trim()) {
      setOneLine(text.slice(0, 160));
    } else if (!reason.trim()) {
      setReason(text.slice(0, 600));
    } else {
      setReason((prev) => `${prev}\n\n${text}`.slice(0, 600));
    }
  };

  const numericPage = Number(page);
  const isPageValid = !isPagePublic || (
    Number.isInteger(numericPage) && numericPage >= 1 && numericPage <= 99999
  );
  const isFormValid = oneLine.trim().length >= 10 && oneLine.trim().length <= 160 && selectedBookId && isPageValid;
  const isPending = publishMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid || isPending) return;

    try {
      if (existingShare) {
        await updateMutation.mutateAsync({
          shareId: existingShare.id,
          oneLine: oneLine.trim(),
          reason: reason.trim(),
          question: question.trim(),
          hasSpoiler,
          isPagePublic,
          page: isPagePublic && page ? Number(page) : null,
        });
        alert('추천 글이 수정되었습니다.');
      } else {
        await publishMutation.mutateAsync({
          bookId: selectedBookId,
          oneLine: oneLine.trim(),
          reason: reason.trim(),
          question: question.trim(),
          hasSpoiler,
          isPagePublic,
          page: isPagePublic && page ? Number(page) : null,
        });
        alert('스텔라 아고라 독서 라운지에 추천 글이 공개되었습니다!');
      }
      onClose();
    } catch (err) {
      alert(err.message || '저장에 실패했습니다.');
    }
  };

  return (
    <div className="composer-modal-backdrop" onClick={onClose}>
      <div className="composer-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="composer-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <BookOpen size={20} color="#38bdf8" />
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
              {existingShare ? '독서 추천 글 수정' : '이 책 추천하기'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab switch */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0.5rem 1.5rem 0' }}>
          <button
            type="button"
            className={`lounge-tab-btn ${activeTab === 'write' ? 'active' : ''}`}
            style={{ borderRadius: '8px 8px 0 0', borderBottom: 'none' }}
            onClick={() => setActiveTab('write')}
          >
            작성하기
          </button>
          <button
            type="button"
            className={`lounge-tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
            style={{ borderRadius: '8px 8px 0 0', borderBottom: 'none' }}
            onClick={() => setActiveTab('preview')}
          >
            미리보기
          </button>
        </div>

        {activeTab === 'write' ? (
          <form onSubmit={handleSubmit} className="composer-modal-body">
            {/* Book selector if not fixed */}
            {!initialBook && !existingShare && (
              <div className="composer-field-group">
                <label className="composer-field-label">추천할 책 선택 *</label>
                <select
                  className="composer-input"
                  value={selectedBookId}
                  onChange={(e) => {
                    const nextBookId = e.target.value;
                    const nextBook = myBooks.find((book) => book.id === nextBookId);
                    setSelectedBookId(nextBookId);
                    setPage(nextBook?.progress?.furthestPage ? String(nextBook.progress.furthestPage) : '');
                  }}
                  required
                >
                  <option value="">책을 선택해 주세요</option>
                  {myBooks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} ({b.author || '저자 미상'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {currentBook && (
              <div style={{ padding: '0.85rem 1rem', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.98rem' }}>{currentBook.title}</div>
                <div style={{ fontSize: '0.82rem', color: 'rgba(224, 242, 254, 0.7)' }}>{currentBook.author}</div>
              </div>
            )}

            {/* Draft source chips */}
            {draftSources.length > 0 && (
              <div className="composer-draft-chips">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: '#38bdf8', fontWeight: 700 }}>
                  <Sparkles size={14} />
                  <span>내 독서 기록에서 문장 가져오기 (클릭하여 복사)</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {draftSources.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyDraft(s.text)}
                      style={{
                        textAlign: 'left',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.85)',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        lineHeight: 1.4,
                      }}
                    >
                      <span style={{ color: '#38bdf8', fontWeight: 700, marginRight: '0.3rem' }}>
                        [{s.source === 'assignment' ? '과제' : '메모'}]
                      </span>
                      {s.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* One Line Review (Required, 10~160 chars) */}
            <div className="composer-field-group">
              <div className="composer-field-label">
                <span>한 줄 평 (필수) *</span>
                <span className="composer-field-counter">{oneLine.length} / 160자 (최소 10자)</span>
              </div>
              <input
                type="text"
                className="composer-input"
                placeholder="이 책을 나만의 한 문장으로 표현해 보세요 (10~160자)"
                value={oneLine}
                maxLength={160}
                onChange={(e) => setOneLine(e.target.value)}
                required
              />
            </div>

            {/* Why recommend? (Optional, 0~600 chars) */}
            <div className="composer-field-group">
              <div className="composer-field-label">
                <span>왜 이 책을 추천하나요? (선택)</span>
                <span className="composer-field-counter">{reason.length} / 600자</span>
              </div>
              <textarea
                className="composer-textarea"
                placeholder="인상 깊었던 생각이나 추천하고 싶은 친구를 적어보세요..."
                value={reason}
                maxLength={600}
                rows={4}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            {/* Question to share (Optional, 0~200 chars) */}
            <div className="composer-field-group">
              <div className="composer-field-label">
                <span>함께 나누고 싶은 질문 (선택)</span>
                <span className="composer-field-counter">{question.length} / 200자</span>
              </div>
              <input
                type="text"
                className="composer-input"
                placeholder="이 책을 읽고 다른 친구들과 이야기하고 싶은 질문이 있나요?"
                value={question}
                maxLength={200}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', color: '#fca5a5', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={hasSpoiler}
                  onChange={(e) => setHasSpoiler(e.target.checked)}
                />
                <span style={{ fontWeight: 600 }}>스포일러(결말·반전)가 포함되어 있습니다</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', color: 'rgba(255,255,255,0.8)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isPagePublic}
                  onChange={(e) => setIsPagePublic(e.target.checked)}
                />
                <span>읽은 페이지 수를 추천 글에 함께 표시합니다</span>
              </label>
              {isPagePublic && (
                <div className="composer-field-group" style={{ marginLeft: '1.6rem' }}>
                  <label className="composer-field-label" htmlFor="reading-share-page">공개할 현재 페이지 *</label>
                  <input
                    id="reading-share-page"
                    type="number"
                    className="composer-input"
                    min="1"
                    max="99999"
                    inputMode="numeric"
                    value={page}
                    onChange={(e) => setPage(e.target.value)}
                    required
                  />
                  {!isPageValid && (
                    <span style={{ color: '#fca5a5', fontSize: '0.78rem' }}>1~99,999쪽 사이로 입력해 주세요.</span>
                  )}
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="lounge-tab-btn" onClick={onClose} disabled={isPending}>
                취소
              </button>
              <button
                type="submit"
                className="lounge-write-btn"
                disabled={!isFormValid || isPending}
              >
                {isPending ? '공개 중...' : (existingShare ? '수정 완료' : '라운지에 공개하기')}
              </button>
            </div>
          </form>
        ) : (
          /* Preview Tab */
          <div className="composer-modal-body">
            <div style={{ padding: '1rem', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '0.82rem', color: '#38bdf8', fontWeight: 700, marginBottom: '0.5rem' }}>
                📖 미리보기
              </div>
              <h4 style={{ margin: '0 0 0.2rem', color: '#fff', fontSize: '1.1rem' }}>
                {currentBook?.title || '책 제목'}
              </h4>
              <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                {currentBook?.author || '저자'} {isPagePublic && page ? `· ${page}쪽` : ''}
              </p>

              <div style={{ padding: '0.85rem', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.08)', marginBottom: '0.85rem' }}>
                <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.95rem' }}>
                  “{oneLine || '한 줄 평이 여기에 표시됩니다.'}”
                </div>
              </div>

              {reason && (
                <div style={{ marginBottom: '0.85rem' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: '0.2rem' }}>
                    추천 이유
                  </div>
                  <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.85)', margin: 0, whiteSpace: 'pre-wrap' }}>
                    {reason}
                  </p>
                </div>
              )}

              {question && (
                <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(167, 139, 250, 0.1)', border: '1px solid rgba(167, 139, 250, 0.2)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#c4b5fd', marginBottom: '0.2rem' }}>
                    함께 나눌 질문
                  </div>
                  <div style={{ fontSize: '0.88rem', color: '#f5f3ff' }}>
                    {question}
                  </div>
                </div>
              )}

              {hasSpoiler && (
                <div style={{ marginTop: '0.85rem', fontSize: '0.78rem', color: '#fca5a5' }}>
                  ⚠️ 스포일러가 포함된 글로 등록되어 본문이 기본 접힘 처리됩니다.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="lounge-tab-btn" onClick={() => setActiveTab('write')}>
                수정하러 가기
              </button>
              <button
                type="button"
                className="lounge-write-btn"
                disabled={!isFormValid || isPending}
                onClick={handleSubmit}
              >
                {isPending ? '공개 중...' : (existingShare ? '수정 완료' : '라운지에 공개하기')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
