import React, { useState, useMemo } from 'react';
import { useAdminAssignments, useAdminTodayAttendance } from '../../hooks/useAssignments';

export default function AdminAssignmentsDate({ selectedAssignmentId, onSelect }) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    // Format YYYY-MM-DD
    return today.toLocaleDateString('en-CA'); 
  });

  const { data: assignments, isLoading: loadingAssignments } = useAdminAssignments('all', 'all', selectedDate, 'all');
  const { data: attendances, isLoading: loadingAttendances } = useAdminTodayAttendance(selectedDate);

  const isLoading = loadingAssignments || loadingAttendances;

  const groupedAssignments = useMemo(() => {
    if (!assignments && !attendances) return {};
    
    // Create a map of userIds who submitted an assignment
    const submittedUserIds = new Set((assignments || []).map(a => a.userId));
    
    // Identify students who attended but did not submit
    const missingAssignments = (attendances || [])
      .filter(att => !submittedUserIds.has(att.userId))
      .map(att => ({
        id: `missing_${att.userId}_${selectedDate}`,
        userId: att.userId,
        userName: att.userName,
        clusterId: att.clusterId,
        date: selectedDate,
        status: 'missing',
        isMock: true,
        submittedAt: null
      }));

    const allItems = [...(assignments || []), ...missingAssignments];

    const grouped = allItems.reduce((acc, assignment) => {
      const cluster = assignment.clusterId || '미분류';
      if (!acc[cluster]) acc[cluster] = [];
      acc[cluster].push(assignment);
      return acc;
    }, {});

    // Sort items within each cluster so that 'missing' comes first
    Object.keys(grouped).forEach(cluster => {
      grouped[cluster].sort((a, b) => {
        if (a.status === 'missing' && b.status !== 'missing') return -1;
        if (a.status !== 'missing' && b.status === 'missing') return 1;
        return new Date(b.submittedAt?.toDate?.() || 0).getTime() - new Date(a.submittedAt?.toDate?.() || 0).getTime();
      });
    });

    return grouped;
  }, [assignments, attendances, selectedDate]);

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
      <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ color: 'var(--text-bright)' }}>날짜 선택:</span>
        <input 
          type="date"
          className="admin-input"
          value={selectedDate}
          max={new Date().toLocaleDateString('en-CA')}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{ flex: 1 }}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        {isLoading ? (
          <p style={{ color: 'var(--text-muted)' }}>로딩 중...</p>
        ) : Object.keys(groupedAssignments).length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>해당 날짜에 제출된 과제가 없습니다.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {Object.entries(groupedAssignments).map(([clusterId, items]) => (
              <div key={clusterId}>
                <h3 style={{ color: 'var(--star-gold)', marginBottom: '0.8rem', borderBottom: '1px dashed rgba(255,255,255,0.2)', paddingBottom: '0.5rem' }}>
                  {clusterId} ({items.length}건)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {items.map(a => (
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
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {a.status === 'missing' ? '미제출' : `${new Date(a.submittedAt?.toDate?.() || 0).toLocaleTimeString('ko-KR')} 제출`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
