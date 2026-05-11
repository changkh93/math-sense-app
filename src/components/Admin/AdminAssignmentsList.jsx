import React, { useState, useMemo } from 'react';
import { useAdminAssignments } from '../../hooks/useAssignments';

export default function AdminAssignmentsList({ selectedAssignmentId, onSelect }) {
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'submitted', 'needs_revision', 'reviewed', 'missing'
  const [filterCluster, setFilterCluster] = useState('all');
  
  const { data: assignments, isLoading } = useAdminAssignments(
    filterCluster !== 'all' ? filterCluster : null, 
    null
  );

  const filteredAssignments = useMemo(() => {
    if (!assignments) return [];
    return assignments.filter(a => {
      // Must be a reviewable assignment state
      if (!['submitted', 'needs_revision', 'reviewed', 'missing'].includes(a.status)) return false;
      if (filterStatus !== 'all' && a.status !== filterStatus) return false;
      return true;
    }).sort((a, b) => {
      // Sort priority: submitted -> needs_revision -> reviewed
      if (a.status !== b.status) {
        const priority = { 'submitted': 1, 'needs_revision': 2, 'missing': 3, 'reviewed': 4 };
        return (priority[a.status] || 99) - (priority[b.status] || 99);
      }
      return new Date(b.submittedAt?.toDate() || 0).getTime() - new Date(a.submittedAt?.toDate() || 0).getTime();
    });
  }, [assignments, filterStatus]);

  const uniqueClusters = useMemo(() => {
    if (!assignments) return [];
    const clusters = new Set(assignments.map(a => a.clusterId));
    return Array.from(clusters).filter(Boolean);
  }, [assignments]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'submitted': return <span className="badge" style={{ background: '#f59e0b', color: 'white' }}>대기중</span>;
      case 'needs_revision': return <span className="badge" style={{ background: '#ef4444', color: 'white' }}>재검토 중</span>;
      case 'missing': return <span className="badge" style={{ background: '#64748b', color: 'white' }}>누락</span>;
      case 'reviewed': return <span className="badge" style={{ background: '#10b981', color: 'white' }}>확인 완료</span>;
      default: return null;
    }
  };

  return (
    <div style={{ flex: '1', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
          <option value="missing">누락</option>
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
                  background: selectedAssignmentId === a.id ? 'rgba(0, 212, 255, 0.1)' : 'rgba(255,255,255,0.02)',
                  border: selectedAssignmentId === a.id ? '1px solid var(--crystal-cyan)' : '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
                onClick={() => onSelect(a)}
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
  );
}
