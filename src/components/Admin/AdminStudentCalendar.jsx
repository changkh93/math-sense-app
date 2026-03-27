import React, { useState, useMemo } from 'react';
import { 
  useAdminUserAllAssignments, 
  useAdminUserAllAttendance 
} from '../../hooks/useAssignments';

/**
 * AdminStudentCalendar - Reusable calendar component for showing a student's
 * attendance and assignment submission history.
 */
export default function AdminStudentCalendar({ userId, userName, onSelectDate, initialDate }) {
  const [currentMonth, setCurrentMonth] = useState(() => initialDate ? new Date(initialDate) : new Date());

  const { data: assignments } = useAdminUserAllAssignments(userId);
  const { data: attendance } = useAdminUserAllAttendance(userId);

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
          cursor: 'pointer',
          background: hasAssignments ? 'rgba(0, 212, 255, 0.05)' : 'transparent',
          transition: 'background 0.2s'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0, 212, 255, 0.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = hasAssignments ? 'rgba(0, 212, 255, 0.05)' : 'transparent'; }}
        onClick={() => {
          if (onSelectDate) {
            onSelectDate({ 
              assignments: dayData?.assignments || [], 
              date: dateStr, 
              userId,
              userName
            });
          }
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
    <div className="admin-student-calendar" style={{ marginTop: '1rem' }}>
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
}
