import React, { useState, useMemo } from 'react';
import { 
  useAdminUserSearch, 
  useAdminUserAllAssignments, 
  useAdminUserAllAttendance 
} from '../../hooks/useAssignments';
import VoyageLogModal from './VoyageLogModal';

export default function AdminAssignmentsUser({ onSelectDate }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isVoyageModalOpen, setIsVoyageModalOpen] = useState(false);
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  const { data: searchResults, isLoading: isSearchLoading } = useAdminUserSearch(searchTerm);
  
  const { data: assignments } = useAdminUserAllAssignments(selectedUser?.id);
  const { data: attendance } = useAdminUserAllAttendance(selectedUser?.id);

  // Group data by date
  const dataByDate = useMemo(() => {
    const map = {};
    if (attendance) {
      attendance.forEach(a => {
        if (!map[a.date]) map[a.date] = { attendance: [], assignments: [] };
        map[a.date].attendance.push(a);
      });
    }
    if (assignments) {
      assignments.forEach(a => {
        const d = a.date || (a.submittedAt ? a.submittedAt.toDate().toLocaleDateString('en-CA') : null);
        if (!d) return;
        if (!map[d]) map[d] = { attendance: [], assignments: [] };
        map[d].assignments.push(a);
      });
    }
    return map;
  }, [assignments, attendance]);

  // Calendar helpers
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayData = dataByDate[dateStr];
      const hasAssignments = dayData?.assignments?.length > 0;
      const hasAttendance = dayData?.attendance?.length > 0;

      days.push(
        <div 
          key={dateStr} 
          className="calendar-day" 
          style={{
            padding: '0.5rem',
            border: '1px solid rgba(255,255,255,0.1)',
            minHeight: '60px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.2rem',
            cursor: hasAssignments ? 'pointer' : 'default',
            background: hasAssignments ? 'rgba(0, 212, 255, 0.05)' : 'transparent'
          }}
          onClick={() => {
            if (hasAssignments) onSelectDate(dayData.assignments);
          }}
        >
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{i}</span>
          
          {hasAttendance && (
            <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
              {dayData.attendance.map((att, idx) => (
                <div key={idx} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} title={`${att.clusterId} 출석`} />
              ))}
            </div>
          )}

          {hasAssignments && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: 'auto' }}>
               {dayData.assignments.map(a => {
                 let color = '#f59e0b'; // pending
                 if (a.status === 'needs_revision') color = '#ef4444';
                 if (a.status === 'reviewed') color = '#10b981';
                 return (
                   <span key={a.id} style={{ fontSize: '0.65rem', background: color, color: '#fff', padding: '1px 3px', borderRadius: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                     {a.clusterId === 'cluster_elementary' ? '초등수학' : 
                      a.clusterId === 'python' ? '파이썬' : 
                      a.clusterId === 'middle-math' ? '중등수학' : a.clusterId}
                   </span>
                 );
               })}
             </div>
          )}
        </div>
      );
    }

    return (
      <div style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <button className="admin-btn secondary" onClick={handlePrevMonth}>◀ 이전</button>
          <strong style={{ color: 'var(--text-bright)' }}>{year}년 {month + 1}월</strong>
          <button className="admin-btn secondary" onClick={handleNextMonth}>다음 ▶</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
          <div>일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div>토</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {days}
        </div>
      </div>
    );
  };

  return (
    <div style={{ flex: '1', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* Search Bar */}
      <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <input 
          type="text" 
          className="admin-input" 
          placeholder="사용자 이름 또는 이메일 검색 (2자 이상)..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ width: '100%', marginBottom: '0.5rem' }}
        />
        
        {searchTerm.length >= 2 && !selectedUser && (
          <div style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', maxHeight: '150px', overflowY: 'auto' }}>
            {isSearchLoading ? (
              <div style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>검색 중...</div>
            ) : searchResults?.length > 0 ? (
              searchResults.map(u => (
                <div 
                  key={u.id} 
                  style={{ padding: '0.5rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-bright)' }}
                  onClick={() => {
                    setSelectedUser(u);
                    setSearchTerm('');
                    onSelectDate([]); // Clear right panel
                  }}
                >
                  {u.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>({u.email})</span>
                </div>
              ))
            ) : (
              <div style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>검색 결과가 없습니다.</div>
            )}
          </div>
        )}

        {selectedUser && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0, 212, 255, 0.1)', padding: '0.8rem', borderRadius: '4px', border: '1px solid var(--crystal-cyan)' }}>
            <div>
              <strong style={{ color: 'var(--text-bright)' }}>선택된 학생: {selectedUser.name}</strong>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{selectedUser.email}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="admin-btn primary" onClick={() => setIsVoyageModalOpen(true)}>
                📖 항해 일지 펼치기
              </button>
              <button className="admin-btn danger" style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem' }} onClick={() => { setSelectedUser(null); onSelectDate([]); }}>
                X 취소
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        {!selectedUser ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
            학생을 검색하여 선택해주세요.
          </div>
        ) : (
          renderCalendar()
        )}
      </div>

      {isVoyageModalOpen && selectedUser && (
        <VoyageLogModal user={selectedUser} onClose={() => setIsVoyageModalOpen(false)} />
      )}
    </div>
  );
}
