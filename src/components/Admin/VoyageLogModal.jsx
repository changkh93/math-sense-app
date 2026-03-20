import React, { useState, useMemo } from 'react';
import { useAdminVoyageLog } from '../../hooks/useAssignments';
import AssignmentChronicle from '../Space/AssignmentChronicle';

/**
 * VoyageLogModal - Admin wrapper that fetches a student's assignments
 * for a selected subject, then renders the existing AssignmentChronicle component.
 */
export default function VoyageLogModal({ user, onClose }) {
  const [selectedCluster, setSelectedCluster] = useState('cluster_elementary');
  const [limitCount, setLimitCount] = useState(10);

  const { data: assignments, isLoading } = useAdminVoyageLog(user.id, selectedCluster, limitCount);

  // AssignmentChronicle expects the full assignments array
  const chronicleAssignments = useMemo(() => {
    if (!assignments) return [];
    return assignments;
  }, [assignments]);

  const [showChronicle, setShowChronicle] = useState(false);

  const handleLoadMore = () => {
    setLimitCount(prev => prev + 10);
  };

  // If the chronicle view is open, render AssignmentChronicle full-screen
  if (showChronicle && chronicleAssignments.length > 0) {
    return (
      <AssignmentChronicle 
        assignments={chronicleAssignments} 
        onClose={() => setShowChronicle(false)} 
      />
    );
  }

  // Otherwise, render the subject picker overlay
  return (
    <div 
      className="modal-overlay" 
      onClick={(e) => { if (e.target.className === 'modal-overlay') onClose(); }}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: '2rem'
      }}
    >
      <div 
        style={{
          background: 'var(--panel-bg, #1a1a2e)',
          width: '100%',
          maxWidth: '500px',
          borderRadius: '12px',
          border: '1px solid var(--crystal-cyan)',
          overflow: 'hidden',
          boxShadow: '0 0 20px rgba(0, 212, 255, 0.2)'
        }}
      >
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--text-bright)' }}>📖 {user.name} 대원의 항해 일지</h2>
            <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>과목을 선택하고 항해 일지를 열어보세요</p>
          </div>
          <button className="admin-btn danger" onClick={onClose} style={{ flexShrink: 0 }}>X 닫기</button>
        </div>

        {/* Subject Picker */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ color: 'var(--star-gold)', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>과목 선택:</label>
            <select 
              className="admin-input" 
              value={selectedCluster} 
              onChange={(e) => {
                setSelectedCluster(e.target.value);
                setLimitCount(10);
              }}
              style={{ width: '100%' }}
            >
              <option value="cluster_elementary">초등수학</option>
              <option value="middle-math">중등수학</option>
              <option value="python">파이썬</option>
              <option value="western-classic">서양고전</option>
              <option value="math-history">수학사</option>
            </select>
          </div>

          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '0.5rem' }}>
            {isLoading ? '기록 조회 중...' : 
              chronicleAssignments.length === 0 ? '선택한 과목의 제출 기록이 없습니다.' : 
              `${chronicleAssignments.length}건의 기록이 확인되었습니다.`}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="admin-btn primary"
              onClick={() => setShowChronicle(true)}
              disabled={chronicleAssignments.length === 0 || isLoading}
              style={{ flex: 1, padding: '0.8rem', fontSize: '1rem' }}
            >
              📖 항해 일지 열기
            </button>
            <button 
              className="admin-btn secondary"
              onClick={handleLoadMore}
              disabled={isLoading}
              style={{ padding: '0.8rem' }}
            >
              더 불러오기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
