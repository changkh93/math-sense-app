import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useReviewAssignment } from '../../hooks/useAssignments';

export default function AdminAssignmentDetail({ assignment, onReviewed }) {
  const reviewMutation = useReviewAssignment();
  
  const [feedback, setFeedback] = useState(assignment?.feedback || '');
  const [bonusCrystals, setBonusCrystals] = useState(assignment?.bonusCrystals || 0);

  useEffect(() => {
    setFeedback(assignment?.feedback || '');
    setBonusCrystals(assignment?.bonusCrystals || 0);
  }, [assignment]);

  if (!assignment) {
    return (
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
        왼쪽 목록에서 과제를 선택하세요.
      </div>
    );
  }

  const handleReview = async (isApproved) => {
    if (!isApproved && !feedback.trim()) {
      alert("반려 시에는 피드백(사유)을 반드시 입력해야 합니다.");
      return;
    }

    try {
      await reviewMutation.mutateAsync({
        assignmentId: assignment.id,
        userId: assignment.userId,
        feedback,
        status: isApproved ? 'reviewed' : 'needs_revision',
        bonusCrystals: isApproved ? Number(bonusCrystals) : 0,
        previousBonusCrystals: assignment.status === 'reviewed' ? (assignment.bonusCrystals || 0) : 0,
        previousStatus: assignment.status
      });
      alert("검토 처리되었습니다.");
      if (onReviewed) onReviewed({ ...assignment, status: isApproved ? 'reviewed' : 'needs_revision' });
    } catch (error) {
      console.error("Review failed:", error);
      alert("처리 중 오류가 발생했습니다.");
    }
  };

  const applyMacro = (text) => {
    setFeedback(prev => prev + (prev ? '\n\n' : '') + text);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Target Data (Readonly) */}
      <div style={{ flex: '3', padding: '1.5rem', overflowY: 'auto', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', pb: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ margin: 0 }}>{assignment.userName} 대원의 보고서 <span style={{fontSize: '0.9rem', color: 'var(--text-muted)', marginLeft: '0.5rem'}}>({assignment.clusterId})</span></h3>
          <span style={{ color: 'var(--crystal-cyan)' }}>{assignment.date}</span>
        </div>

        <div className="markdown-content" style={{ color: 'var(--text-bright)', lineHeight: '1.6', fontSize: '1.05rem', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px' }}>
          <ReactMarkdown>{assignment.content || '내용 없음'}</ReactMarkdown>
        </div>

        {assignment.attachments?.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h4 style={{ color: 'var(--star-gold)', marginBottom: '0.5rem' }}>첨부 파일</h4>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {assignment.attachments.map((att, i) => (
                <a key={i} href={att.url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
                  📄 {att.name}
                </a>
              ))}
            </div>
          </div>
        )}

        {assignment.links?.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <h4 style={{ color: 'var(--star-gold)', marginBottom: '0.5rem' }}>첨부 링크</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {assignment.links.map((lnk, i) => (
                <a key={i} href={lnk.url} target="_blank" rel="noreferrer" style={{ color: 'var(--neon-blue)' }}>
                  🔗 {lnk.url}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Area (Write Feedback) */}
      <div style={{ flex: '2', padding: '1.5rem', display: 'flex', flexDirection: 'column', background: 'rgba(5, 5, 10, 0.4)' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          <button className="admin-btn secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }} onClick={() => applyMacro('정말 훌륭합니다! 핵심을 정확히 파악했네요. 🚀')}>훌륭함</button>
          <button className="admin-btn secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }} onClick={() => applyMacro('좋은 시도입니다. 하지만 조금 더 구체적으로 작성해주면 좋을 것 같아요.')}>보완필요</button>
          <button className="admin-btn secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }} onClick={() => applyMacro('첨부 파일이 열리지 않거나 내용이 누락되었습니다. 다시 확인 후 재전송 해주세요.')}>누락됨</button>
        </div>

        <textarea 
          className="admin-input" 
          placeholder="사령부 회신 (피드백) 내용 작성..." 
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          style={{ flex: 1, resize: 'none', marginBottom: '1rem' }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ color: 'var(--text-muted)' }}>보너스 광석:</label>
            <input 
              type="number" 
              className="admin-input" 
              style={{ width: '80px' }} 
              value={bonusCrystals}
              onChange={e => setBonusCrystals(e.target.value)}
              min="0"
              max="500"
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              className="admin-btn danger" 
              onClick={() => handleReview(false)}
              disabled={reviewMutation.isPending}
            >
              ⚠️ 반려 (보완요청)
            </button>
            <button 
              className="admin-btn primary" 
              style={{ background: '#10b981', borderColor: '#10b981' }}
              onClick={() => handleReview(true)}
              disabled={reviewMutation.isPending}
            >
              ✓ 승인 (APPROVE)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
