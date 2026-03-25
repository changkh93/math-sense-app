import React, { useState } from 'react';
import AdminAssignmentsList from '../../components/Admin/AdminAssignmentsList';
import AdminAssignmentsDate from '../../components/Admin/AdminAssignmentsDate';
import AdminAssignmentsUser from '../../components/Admin/AdminAssignmentsUser';
import AdminAssignmentDetail from '../../components/Admin/AdminAssignmentDetail';
import AdminUserDayDetail from '../../components/Admin/AdminUserDayDetail';
import './Admin.css';

export default function AdminAssignments() {
  
  // Tabs: 'list', 'date', 'user'
  const [activeTab, setActiveTab] = useState('list');
  
  // Selected items for the right panel
  const [selectedAssignments, setSelectedAssignments] = useState([]);
  const [selectedUserDateInfo, setSelectedUserDateInfo] = useState(null);

  // Helpers to select single or multiple
  const handleSelectSingle = (assignment) => {
    setSelectedAssignments([assignment]);
    setSelectedUserDateInfo(null);
  };

  // Removed handleSelectMultiple as it's no longer used

  const handleSelectUserDate = (info) => {
    setSelectedUserDateInfo(info);
    setSelectedAssignments(info.assignments || []);
  };

  const handleReviewed = (updatedAssignment) => {
    // Optionally update local state to reflect the change immediately
    setSelectedAssignments(prev => prev.map(a => a.id === updatedAssignment.id ? updatedAssignment : a));
  };

  return (
    <div className="admin-page">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
        <div>
          <h1>항행 일지 (과제 검토)</h1>
          <p>Stellar Archive Command Center</p>
        </div>
        
        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.3rem', borderRadius: '8px' }}>
          <button 
            className={`admin-btn ${activeTab === 'list' ? 'primary' : 'secondary'}`}
            style={{ padding: '0.5rem 1.5rem', border: activeTab === 'list' ? '' : 'none' }}
            onClick={() => { setActiveTab('list'); setSelectedAssignments([]); setSelectedUserDateInfo(null); }}
          >
            📋 목록 보기
          </button>
          <button 
            className={`admin-btn ${activeTab === 'date' ? 'primary' : 'secondary'}`}
            style={{ padding: '0.5rem 1.5rem', border: activeTab === 'date' ? '' : 'none' }}
            onClick={() => { setActiveTab('date'); setSelectedAssignments([]); setSelectedUserDateInfo(null); }}
          >
            📅 날짜별 보기
          </button>
          <button 
            className={`admin-btn ${activeTab === 'user' ? 'primary' : 'secondary'}`}
            style={{ padding: '0.5rem 1.5rem', border: activeTab === 'user' ? '' : 'none' }}
            onClick={() => { setActiveTab('user'); setSelectedAssignments([]); setSelectedUserDateInfo(null); }}
          >
            🧑‍🚀 학생별 보기
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '2rem', height: 'calc(100vh - 160px)' }}>
        
        {/* Left Panel: Varies by tab */}
        <div className="admin-card" style={{ flex: '1', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {activeTab === 'list' && (
            <AdminAssignmentsList 
              selectedAssignmentId={selectedAssignments[0]?.id}
              onSelect={handleSelectSingle} 
            />
          )}
          {activeTab === 'date' && (
            <AdminAssignmentsDate 
              selectedAssignmentId={selectedAssignments[0]?.id}
              onSelect={handleSelectSingle}
            />
          )}
          {activeTab === 'user' && (
            <AdminAssignmentsUser 
              onSelectDate={handleSelectUserDate}
            />
          )}
        </div>

        {/* Right Panel: Detail View */}
        <div className="admin-card" style={{ flex: '2', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {(activeTab !== 'user' && selectedAssignments.length === 0) || (activeTab === 'user' && !selectedUserDateInfo) ? (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
              왼쪽 목록에서 항목을 선택하세요.
            </div>
          ) : activeTab === 'user' ? (
            <AdminUserDayDetail info={selectedUserDateInfo} onReviewed={handleReviewed} />
          ) : (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {selectedAssignments.length > 1 && (
                <div style={{ padding: '1rem', background: 'rgba(0, 212, 255, 0.1)', borderBottom: '1px solid var(--crystal-cyan)', color: 'var(--crystal-cyan)', fontWeight: 'bold' }}>
                  해당 날짜에 일괄 제출된 총 {selectedAssignments.length}건의 과제 상세 내용입니다.
                </div>
              )}
              {selectedAssignments.map((assignment, index) => (
                <div key={assignment.id} style={{ 
                  borderBottom: selectedAssignments.length > 1 && index < selectedAssignments.length - 1 ? '4px dashed rgba(255,255,255,0.2)' : 'none',
                  paddingBottom: selectedAssignments.length > 1 && index < selectedAssignments.length - 1 ? '1rem' : '0',
                  marginBottom: selectedAssignments.length > 1 && index < selectedAssignments.length - 1 ? '1rem' : '0',
                }}>
                  <AdminAssignmentDetail 
                    assignment={assignment} 
                    onReviewed={handleReviewed}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
