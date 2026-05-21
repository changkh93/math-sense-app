import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  Sparkles,
  X
} from 'lucide-react';

const MotionDiv = motion.div;

const KIND_LABELS = {
  archive: {
    badge: '기록 공개',
    title: '기록 공개하기',
    busyTitle: '기록 공개 중',
    doneTitle: '공개 완료',
    busyDescription: '과제, 일일 학습 기록, 피드백과 보너스 광석을 스텔라 아고라에 정리하고 있습니다.',
    doneDescription: '공개가 완료되었습니다. 친구들의 코멘트와 반응을 확인할 수 있습니다.'
  },
  comfort: {
    badge: '위로 받기',
    title: '위로 받기',
    busyTitle: '위로 요청 중',
    doneTitle: '위로 요청 완료',
    busyDescription: '지금 필요한 격려와 코멘트를 친구들에게 전달하고 있습니다.',
    doneDescription: '요청이 공개되었습니다. 응원과 위로를 확인해 보세요.'
  }
};

function Step({ active, label }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.55rem',
      color: active ? 'var(--text-bright)' : 'var(--text-muted)',
      fontSize: '0.86rem'
    }}>
      <span style={{
        width: 9,
        height: 9,
        borderRadius: 999,
        background: active ? 'var(--crystal-cyan)' : 'rgba(255,255,255,0.18)',
        boxShadow: active ? '0 0 12px rgba(0,243,255,0.65)' : 'none',
        flexShrink: 0
      }} />
      <span>{label}</span>
    </div>
  );
}

export default function AssignmentShareModal({
  open,
  phase = 'idle',
  kind = 'archive',
  error = '',
  shareId = null,
  onClose,
  onGoToShare
}) {
  const labels = KIND_LABELS[kind] || KIND_LABELS.archive;
  const isPublishing = phase === 'publishing';
  const isComplete = phase === 'complete';
  const isError = phase === 'error';
  const primaryLabel = isPublishing
    ? labels.busyTitle
    : isComplete
      ? labels.doneTitle
      : '공개 상태';

  const modal = (
    <AnimatePresence>
      {open && (
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 12000,
            background: 'rgba(2,6,23,0.76)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.2rem'
          }}
          onClick={onClose}
        >
          <MotionDiv
            initial={{ y: 28, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="glass-card assignment-share-modal"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(560px, 100%)',
              maxHeight: 'calc(100vh - 2.4rem)',
              overflowY: 'auto',
              padding: '1.4rem',
              border: '1px solid rgba(0, 243, 255, 0.24)',
              background: 'rgba(12, 18, 36, 0.98)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
              borderRadius: 16
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div className="font-tech" style={{ color: 'var(--crystal-cyan)', fontSize: '0.78rem', marginBottom: '0.45rem' }}>
                  {labels.badge}
                </div>
                <h3 className="font-title" style={{ margin: 0, color: 'var(--text-bright)', fontSize: '1.5rem' }}>
                  {isPublishing ? labels.busyTitle : isComplete ? labels.doneTitle : isError ? '공개에 실패했습니다' : labels.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="닫기"
                style={{
                  border: 'none',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--text-bright)',
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              borderRadius: 14,
              background: isComplete
                ? 'rgba(34,197,94,0.08)'
                : isError
                  ? 'rgba(239,68,68,0.08)'
                  : 'rgba(0, 243, 255, 0.08)',
              border: `1px solid ${isComplete ? 'rgba(34,197,94,0.25)' : isError ? 'rgba(239,68,68,0.25)' : 'rgba(0,243,255,0.18)'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.95rem' }}>
                <div style={{
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isComplete
                    ? 'rgba(34,197,94,0.16)'
                    : isError
                      ? 'rgba(239,68,68,0.16)'
                      : 'rgba(0, 243, 255, 0.16)',
                  color: isComplete
                    ? '#86efac'
                    : isError
                      ? '#fca5a5'
                      : 'var(--crystal-cyan)'
                }}>
                  {isPublishing ? <LoaderCircle size={22} className="spin-icon" /> : isComplete ? <CheckCircle2 size={22} /> : isError ? <AlertCircle size={22} /> : <Sparkles size={22} />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.77rem', marginBottom: '0.2rem' }}>
                    {primaryLabel}
                  </div>
                  <div style={{ color: 'var(--text-bright)', lineHeight: 1.6 }}>
                    {isPublishing ? labels.busyDescription : isComplete ? labels.doneDescription : isError ? error || '잠시 후 다시 시도해 주세요.' : labels.busyDescription}
                  </div>
                </div>
              </div>

              {isPublishing && (
                <div style={{ display: 'grid', gap: '0.55rem', marginTop: '0.25rem' }}>
                  <Step active label="과제와 피드백 정리" />
                  <Step active label="스텔라 아고라 전송" />
                  <Step label="친구들의 반응 대기" />
                </div>
              )}

              {isComplete && shareId && (
                <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  공개 ID: {shareId}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <button
                type="button"
                className="space-btn"
                onClick={onClose}
                style={{ padding: '0.7rem 1rem' }}
              >
                닫기
              </button>
              {isComplete && shareId && (
                <button
                  type="button"
                  className="space-btn cosmic-btn font-tech"
                  onClick={() => onGoToShare?.(shareId)}
                  style={{ padding: '0.7rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                >
                  공개 내용 보러 가기
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return modal;
  return createPortal(modal, document.body);
}
