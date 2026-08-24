import React, { useState } from 'react';
import { X, ShieldAlert } from 'lucide-react';
import { useReportReadingShare } from '../../../hooks/useReadingSocial';
import './ReadingLounge.css';

const REPORT_OPTIONS = [
  { id: 'spoiler', label: '스포일러 미표시 (줄거리 노출)' },
  { id: 'harassment', label: '욕설 및 비방, 인신공격' },
  { id: 'personal_info', label: '개인정보 (실명, 연락처 등) 포함' },
  { id: 'inappropriate', label: '부적절한 내용 및 광고' },
  { id: 'other', label: '기타' },
];

export default function ReadingShareReportModal({ isOpen, onClose, share }) {
  const [reason, setReason] = useState('spoiler');
  const [detail, setDetail] = useState('');
  const reportMutation = useReportReadingShare();

  if (!isOpen || !share) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (reportMutation.isPending) return;

    try {
      await reportMutation.mutateAsync({
        shareId: share.id,
        reason,
        detail,
      });
      alert('신고가 접수되었습니다. 운영진이 신속히 확인하겠습니다.');
      onClose();
    } catch (err) {
      alert(err.message || '신고 접수에 실패했습니다.');
    }
  };

  return (
    <div className="composer-modal-backdrop" onClick={onClose}>
      <div
        className="composer-modal-card"
        style={{ maxWidth: '440px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="composer-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171' }}>
            <ShieldAlert size={20} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>공유 글 신고</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="composer-modal-body">
          <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
            '{share.bookSnapshot?.title}'에 대한 공유 글을 신고하시는 사유를 선택해 주세요.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {REPORT_OPTIONS.map((opt) => (
              <label
                key={opt.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '10px',
                  background: reason === opt.id ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${reason === opt.id ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255,255,255,0.08)'}`,
                  color: reason === opt.id ? '#fca5a5' : 'rgba(255,255,255,0.8)',
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                }}
              >
                <input
                  type="radio"
                  name="reportReason"
                  value={opt.id}
                  checked={reason === opt.id}
                  onChange={(e) => setReason(e.target.value)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>

          <div className="composer-field-group">
            <label className="composer-field-label">상세 설명 (선택)</label>
            <textarea
              className="composer-textarea"
              placeholder="구체적인 내용을 입력해 주시면 처리에 도움이 됩니다. (최대 300자)"
              value={detail}
              maxLength={300}
              onChange={(e) => setDetail(e.target.value)}
              rows={3}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="lounge-tab-btn"
              onClick={onClose}
              disabled={reportMutation.isPending}
            >
              취소
            </button>
            <button
              type="submit"
              className="comment-submit-btn"
              style={{ background: '#ef4444' }}
              disabled={reportMutation.isPending}
            >
              {reportMutation.isPending ? '신고 접수 중...' : '신고 제출'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
