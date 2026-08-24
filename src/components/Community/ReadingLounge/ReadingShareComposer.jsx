import React, { useEffect, useState } from 'react';
import { X, BookOpen, Sparkles } from 'lucide-react';
import { useReadingShareDraftSources, usePublishReadingShare, useUpdateReadingShare } from '../../../hooks/useReadingSocial';
import { useReadingBooks } from '../../../hooks/useReadingLibrary';
import { useAuth } from '../../../hooks/useAuth';
import { getBookShareStage } from '../../../utils/readingSharePresentation';
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
  const [selectedSourceIds, setSelectedSourceIds] = useState(
    () => (existingShare?.review?.sharedNotes || []).map((note) => note.id)
  );
  const [initializedSourceBookId, setInitializedSourceBookId] = useState(existingShare ? selectedBookId : '');
  const [activeTab, setActiveTab] = useState('write'); // 'write' | 'preview'

  const { data: myBooksData } = useReadingBooks(user?.uid);
  const myBooks = Array.isArray(myBooksData) ? myBooksData : (myBooksData?.books || []);
  const shareableBooks = myBooks.filter((book) => ['reading', 'completed'].includes(book.status));
  const currentBook = myBooks.find((b) => b.id === selectedBookId) || initialBook;
  const shareStage = currentBook ? getBookShareStage(currentBook) : null;

  const { data: draftSourcesData } = useReadingShareDraftSources(selectedBookId, {
    enabled: Boolean(selectedBookId && isOpen && !existingShare),
  });
  const draftSources = existingShare?.review?.sharedNotes || draftSourcesData?.sources || [];

  useEffect(() => {
    if (existingShare || !selectedBookId || !draftSourcesData?.sources || initializedSourceBookId === selectedBookId) return;
    setSelectedSourceIds(draftSourcesData.sources.map((source) => source.id));
    setInitializedSourceBookId(selectedBookId);
  }, [draftSourcesData, existingShare, initializedSourceBookId, selectedBookId]);

  const publishMutation = usePublishReadingShare();
  const updateMutation = useUpdateReadingShare();

  if (!isOpen) return null;

  const toggleSource = (sourceId) => {
    setSelectedSourceIds((current) => current.includes(sourceId)
      ? current.filter((id) => id !== sourceId)
      : [...current, sourceId]);
  };

  const selectedNotes = draftSources.filter((source) => selectedSourceIds.includes(source.id));
  const allSourcesSelected = draftSources.length > 0 && selectedNotes.length === draftSources.length;
  const isFormValid = oneLine.trim().length >= 10 && oneLine.trim().length <= 160 && selectedBookId;
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
          sharedNotes: selectedNotes,
        });
        alert('공유 글이 수정되었습니다.');
      } else {
        await publishMutation.mutateAsync({
          bookId: selectedBookId,
          oneLine: oneLine.trim(),
          reason: reason.trim(),
          question: question.trim(),
          hasSpoiler,
          sharedNotes: selectedNotes,
        });
        alert('스텔라 아고라 독서 라운지에 책 이야기가 공개되었습니다!');
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
              {existingShare ? '공유 글 수정' : '라운지에 책 공유하기'}
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
                <label className="composer-field-label">공유할 책 선택 *</label>
                <select
                  className="composer-input"
                  value={selectedBookId}
                  onChange={(e) => {
                    const nextBookId = e.target.value;
                    setSelectedBookId(nextBookId);
                    setSelectedSourceIds([]);
                    setInitializedSourceBookId('');
                  }}
                  required
                >
                  <option value="">책을 선택해 주세요</option>
                  {shareableBooks.map((b) => (
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
                {shareStage && (
                  <div style={{ marginTop: '0.55rem', fontSize: '0.78rem', fontWeight: 800, color: shareStage.kind === 'completed_recommendation' ? '#34d399' : '#38bdf8' }}>
                    {shareStage.kind === 'completed_recommendation' ? '✓' : '📖'} {shareStage.label}
                  </div>
                )}
              </div>
            )}

            {/* Reading note selection */}
            {draftSources.length > 0 && (
              <div className="composer-draft-chips">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: '#38bdf8', fontWeight: 700 }}>
                    <Sparkles size={14} />
                    <span>함께 공개할 독서 기록</span>
                  </div>
                  <button
                    type="button"
                    className="lounge-tab-btn"
                    style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem' }}
                    onClick={() => setSelectedSourceIds(allSourcesSelected ? [] : draftSources.map((source) => source.id))}
                  >
                    {allSourcesSelected ? '전체 해제' : '전체 선택'}
                  </button>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>
                  최근 메모·과제 기록 최대 12개를 가져왔습니다. 기본으로 모두 선택되며, 공개하지 않을 기록은 해제하세요.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {draftSources.map((s) => {
                    const isSelected = selectedSourceIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.55rem',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '8px',
                          background: isSelected ? 'rgba(56,189,248,0.09)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${isSelected ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.08)'}`,
                          color: 'rgba(255,255,255,0.85)',
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          lineHeight: 1.4,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSource(s.id)}
                          style={{ marginTop: '0.15rem' }}
                        />
                        <span>
                          <span style={{ color: '#38bdf8', fontWeight: 700, marginRight: '0.3rem' }}>
                            [{s.source === 'assignment' ? '과제' : '메모'}]
                          </span>
                          {s.text}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#7dd3fc', textAlign: 'right' }}>{selectedNotes.length}개 선택</div>
              </div>
            )}

            {/* Public introduction (Required, 10~160 chars) */}
            <div className="composer-field-group">
              <div className="composer-field-label">
                <span>친구들에게 소개하는 한마디 *</span>
                <span className="composer-field-counter">{oneLine.length} / 160자 (최소 10자)</span>
              </div>
              <input
                type="text"
                className="composer-input"
                placeholder={currentBook?.status === 'completed'
                  ? '끝까지 읽은 뒤, 이 책을 친구에게 어떻게 소개하고 싶나요?'
                  : '지금까지 읽으며 친구에게 건네고 싶은 한마디를 적어보세요.'}
                value={oneLine}
                maxLength={160}
                onChange={(e) => setOneLine(e.target.value)}
                required
              />
            </div>

            {/* Additional context (Optional, 0~600 chars) */}
            <div className="composer-field-group">
              <div className="composer-field-label">
                <span>같이 읽고 싶은 이유 (선택)</span>
                <span className="composer-field-counter">{reason.length} / 600자</span>
              </div>
              <textarea
                className="composer-textarea"
                placeholder="인상 깊었던 부분이나 함께 읽고 싶은 이유를 적어보세요."
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
                {isPending ? '공유 중...' : (existingShare ? '수정 완료' : '라운지에 공유하기')}
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
                {currentBook?.author || '저자'}
              </p>
              {shareStage && (
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: shareStage.kind === 'completed_recommendation' ? '#34d399' : '#38bdf8', marginBottom: '0.85rem' }}>
                  {shareStage.kind === 'completed_recommendation' ? '✓' : '📖'} {shareStage.label}
                </div>
              )}

              <div style={{ padding: '0.85rem', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.08)', marginBottom: '0.85rem' }}>
                <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.95rem' }}>
                  “{oneLine || '친구들에게 소개하는 한마디가 여기에 표시됩니다.'}”
                </div>
              </div>

              {reason && (
                <div style={{ marginBottom: '0.85rem' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: '0.2rem' }}>
                    같이 읽고 싶은 이유
                  </div>
                  <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.85)', margin: 0, whiteSpace: 'pre-wrap' }}>
                    {reason}
                  </p>
                </div>
              )}

              {selectedNotes.length > 0 && (
                <div style={{ marginBottom: '0.85rem' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#7dd3fc', marginBottom: '0.4rem' }}>
                    함께 공개할 독서 기록 · {selectedNotes.length}개
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {selectedNotes.map((note) => (
                      <div key={note.id} style={{ padding: '0.55rem 0.65rem', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', fontSize: '0.8rem', color: 'rgba(255,255,255,0.82)' }}>
                        <strong style={{ color: '#38bdf8' }}>[{note.source === 'assignment' ? '과제' : '메모'}]</strong> {note.text}
                      </div>
                    ))}
                  </div>
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
                {isPending ? '공유 중...' : (existingShare ? '수정 완료' : '라운지에 공유하기')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
