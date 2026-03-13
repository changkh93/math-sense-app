import React, { useState, useMemo } from 'react';
import { useAdminAssignments, useReviewAssignment } from '../../hooks/useAssignments';
import { useAuth } from '../../hooks/useAuth';
import ReactMarkdown from 'react-markdown';
import './Admin.css'; // Use existing admin styles

export default function AdminAssignments() {
  const { user } = useAuth();
  
  // Filters
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'submitted', 'needs_revision', 'reviewed'
  const [filterCluster, setFilterCluster] = useState('all');
  
  // Queries
  const { data: assignments, isLoading } = useAdminAssignments(
    filterCluster !== 'all' ? filterCluster : null, 
    null
  );
  
  const reviewMutation = useReviewAssignment();

  // Selected item for split view
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [bonusCrystals, setBonusCrystals] = useState(0);

  // Derived filtered listing
  const filteredAssignments = useMemo(() => {
    if (!assignments) return [];
    return assignments.filter(a => {
      // Must be submitted or needs revision or reviewed (don't show empty drafts if any exist)
      if (!['submitted', 'needs_revision', 'reviewed'].includes(a.status)) return false;
      
      if (filterStatus !== 'all' && a.status !== filterStatus) return false;
      
      return true;
    }).sort((a, b) => {
      // Sort priority: submitted/needs_revision first, then by date
      if (a.status !== b.status) {
        if (a.status === 'submitted' || a.status === 'needs_revision') return -1;
        if (b.status === 'submitted' || b.status === 'needs_revision') return 1;
      }
      return new Date(b.submittedAt?.toDate() || 0).getTime() - new Date(a.submittedAt?.toDate() || 0).getTime();
    });
  }, [assignments, filterStatus]);

  // Derived cluster list for filter dropdown
  const uniqueClusters = useMemo(() => {
    if (!assignments) return [];
    const clusters = new Set(assignments.map(a => a.clusterId));
    return Array.from(clusters).filter(Boolean);
  }, [assignments]);

  const handleSelectAssignment = (assignment) => {
    setSelectedAssignment(assignment);
    setFeedback(assignment.feedback || '');
    setBonusCrystals(assignment.bonusCrystals || 0);
  };

  const handleReview = async (isApproved) => {
    if (!selectedAssignment) return;
    
    if (!isApproved && !feedback.trim()) {
      alert("반려 시에는 피드백(사유)을 반드시 입력해야 합니다.");
      return;
    }

    try {
      await reviewMutation.mutateAsync({
        assignmentId: selectedAssignment.id,
        userId: selectedAssignment.userId,
        feedback,
        status: isApproved ? 'reviewed' : 'needs_revision',
        bonusCrystals: isApproved ? Number(bonusCrystals) : 0
      });
      // Optionally deselect or just show success
      setSelectedAssignment({ ...selectedAssignment, status: isApproved ? 'reviewed' : 'needs_revision' }); // Optimistic update
      alert("검토 처리되었습니다.");
    } catch (error) {
      console.error("Review failed:", error);
      alert("처리 중 오류가 발생했습니다.");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'submitted': return <span className="badge" style={{ background: '#f59e0b', color: 'white' }}>대기중</span>;
      case 'needs_revision': return <span className="badge" style={{ background: '#ef4444', color: 'white' }}>재검토 중</span>;
      case 'reviewed': return <span className="badge" style={{ background: '#10b981', color: 'white' }}>확인 완료</span>;
      default: return null;
    }
  };

  // MACROS
  const applyMacro = (text) => {
    setFeedback(prev => prev + (prev ? '\n\n' : '') + text);
  };

  return (
    <div className="admin-page">
      <header className="page-header">
        <div>
          <h1>항행 일지 (과제 검토)</h1>
          <p>Stellar Archive Command Center</p>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '2rem', height: 'calc(100vh - 160px)' }}>
        
        {/* Left: Interactive List */}
        <div className="admin-card" style={{ flex: '1', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '1rem' }}>
            <select 
              className="admin-input" 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
              style={{ flex: 1 }}
            >
              <option value="all">모든 상태</option>
              <option value="submitted">대기중 (미확인)</option>
              <option value="needs_revision">재검토 요망</option>
              <option value="reviewed">확인 완료</option>
            </select>

            <select 
              className="admin-input" 
              value={filterCluster} 
              onChange={e => setFilterCluster(e.target.value)}
              style={{ flex: 1 }}
            >
              <option value="all">모든 군집</option>
              {uniqueClusters.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            {isLoading ? (
              <p style={{ color: 'var(--text-muted)' }}>로딩 중...</p>
            ) : filteredAssignments.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>해당 조건의 과제가 없습니다.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {filteredAssignments.map(a => (
                  <div 
                    key={a.id} 
                    className="admin-list-item"
                    style={{ 
                      padding: '1rem', 
                      background: selectedAssignment?.id === a.id ? 'rgba(0, 212, 255, 0.1)' : 'rgba(255,255,255,0.02)',
                      border: selectedAssignment?.id === a.id ? '1px solid var(--crystal-cyan)' : '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}
                    onClick={() => handleSelectAssignment(a)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: 'var(--text-bright)' }}>{a.userName}</strong>
                      {getStatusBadge(a.status)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <span>{a.clusterId}</span>
                      <span>{a.date}</span>
                    </div>
                    {a.revisionCount > 0 && (
                      <span style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 'bold' }}>⚠️ 재제출 {a.revisionCount}회</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick Review Split View */}
        <div className="admin-card" style={{ flex: '2', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selectedAssignment ? (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
              왼쪽 목록에서 과제를 선택하세요.
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
              
              {/* Target Data (Readonly) */}
              <div style={{ flex: '3', padding: '1.5rem', overflowY: 'auto', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', pb: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <h3 style={{ margin: 0 }}>{selectedAssignment.userName} 대원의 보고서</h3>
                  <span style={{ color: 'var(--crystal-cyan)' }}>{selectedAssignment.date}</span>
                </div>

                <div className="markdown-content" style={{ color: 'var(--text-bright)', lineHeight: '1.6', fontSize: '1.05rem', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px' }}>
                  <ReactMarkdown>{selectedAssignment.content}</ReactMarkdown>
                </div>

                {selectedAssignment.attachments?.length > 0 && (
                  <div style={{ marginTop: '2rem' }}>
                    <h4 style={{ color: 'var(--star-gold)', marginBottom: '0.5rem' }}>첨부 파일</h4>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {selectedAssignment.attachments.map((att, i) => (
                        <a key={i} href={att.url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
                          📄 {att.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAssignment.links?.length > 0 && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <h4 style={{ color: 'var(--star-gold)', marginBottom: '0.5rem' }}>첨부 링크</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {selectedAssignment.links.map((lnk, i) => (
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
                
                {/* Macros */}
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
          )}
        </div>

      </div>
    </div>
  );
}
