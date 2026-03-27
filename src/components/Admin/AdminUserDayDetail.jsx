import React, { useState } from 'react';
import AdminAssignmentDetail from './AdminAssignmentDetail';
import DailyLearningTimeline from '../Space/DailyLearningTimeline';
import AdminDarkMatterTab from './AdminDarkMatterTab';
import AdminStudentCalendar from './AdminStudentCalendar';
import { useLearningHistory } from '../../hooks/useLearningHistory';

export default function AdminUserDayDetail({ info, onReviewed, onSelectDate }) {
  const [activeTab, setActiveTab] = useState('assignments'); // 'assignments' | 'timeline' | 'darkmatter' | 'calendar'
  
  const { assignments = [], date, userId, userName } = info || {};

  const { activities, dailyStats, loading } = useLearningHistory(
    activeTab === 'timeline' ? userId : null,
    activeTab === 'timeline' ? date : null
  );

  if (!info) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* Header & Tabs */}
      <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--text-bright)', fontSize: '1.2rem' }}>
              🧑‍🚀 {userName} 대원
            </h2>
            <p style={{ margin: 0, color: 'var(--crystal-cyan)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
              {date} 탐사 기록
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setActiveTab('assignments')}
            style={{
              background: 'none', border: 'none',
              color: activeTab === 'assignments' ? 'var(--crystal-cyan)' : 'var(--text-muted)',
              borderBottom: activeTab === 'assignments' ? '2px solid var(--crystal-cyan)' : '2px solid transparent',
              padding: '0.5rem', fontSize: '1rem', cursor: 'pointer', fontFamily: 'var(--font-tech)'
            }}
          >
            제출된 과제 ({assignments.length})
          </button>
          <button 
            onClick={() => setActiveTab('timeline')}
            style={{
              background: 'none', border: 'none',
              color: activeTab === 'timeline' ? 'var(--crystal-cyan)' : 'var(--text-muted)',
              borderBottom: activeTab === 'timeline' ? '2px solid var(--crystal-cyan)' : '2px solid transparent',
              padding: '0.5rem', fontSize: '1rem', cursor: 'pointer', fontFamily: 'var(--font-tech)'
            }}
          >
            일일 학습 기록
          </button>
          <button 
            onClick={() => setActiveTab('darkmatter')}
            style={{
              background: 'none', border: 'none',
              color: activeTab === 'darkmatter' ? '#a855f7' : 'var(--text-muted)',
              borderBottom: activeTab === 'darkmatter' ? '2px solid #a855f7' : '2px solid transparent',
              padding: '0.5rem', fontSize: '1rem', cursor: 'pointer', fontFamily: 'var(--font-tech)'
            }}
          >
            🌌 다크 매터
          </button>
          <button 
            onClick={() => setActiveTab('calendar')}
            style={{
              background: 'none', border: 'none',
              color: activeTab === 'calendar' ? 'var(--star-gold)' : 'var(--text-muted)',
              borderBottom: activeTab === 'calendar' ? '2px solid var(--star-gold)' : '2px solid transparent',
              padding: '0.5rem', fontSize: '1rem', cursor: 'pointer', fontFamily: 'var(--font-tech)'
            }}
          >
            📅 전체 기록
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        {activeTab === 'assignments' && (
          <div>
            {assignments.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: 'var(--text-muted)' }}>
                이 날짜에 제출된 과제가 없습니다.
              </div>
            ) : (
              <>
                {assignments.length > 1 && (
                  <div style={{ padding: '1rem', background: 'rgba(0, 212, 255, 0.1)', borderBottom: '1px solid var(--crystal-cyan)', color: 'var(--crystal-cyan)', fontWeight: 'bold', marginBottom: '1rem' }}>
                    일괄 제출된 총 {assignments.length}건의 과제입니다.
                  </div>
                )}
                {assignments.map((assignment, index) => (
                  <div key={assignment.id} style={{ 
                    borderBottom: assignments.length > 1 && index < assignments.length - 1 ? '4px dashed rgba(255,255,255,0.2)' : 'none',
                    paddingBottom: assignments.length > 1 && index < assignments.length - 1 ? '1rem' : '0',
                    marginBottom: assignments.length > 1 && index < assignments.length - 1 ? '1rem' : '0',
                  }}>
                    <AdminAssignmentDetail 
                      assignment={assignment} 
                      onReviewed={(updated) => {
                         if (onReviewed) onReviewed(updated);
                      }}
                    />
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          <DailyLearningTimeline 
            activities={activities} 
            dailyStats={dailyStats}
            loading={loading} 
          />
        )}

        {activeTab === 'darkmatter' && (
          <AdminDarkMatterTab userId={userId} />
        )}

        {activeTab === 'calendar' && (
          <AdminStudentCalendar 
            userId={userId} 
            userName={userName} 
            initialDate={date}
            onSelectDate={(newInfo) => {
              if (onSelectDate) onSelectDate(newInfo);
              setActiveTab('assignments'); // Switch back to assignments when a date is selected
            }}
          />
        )}
      </div>

    </div>
  );
}
