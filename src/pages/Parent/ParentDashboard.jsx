import React, { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import { useLearningHistory } from '../../hooks/useLearningHistory';
import { useAdminUserAllAssignments, useAdminUserAllAttendance } from '../../hooks/useAssignments';
import { getTodayKST } from '../../utils/streakUtils';
import { Rocket, LogOut, Clock, AlertTriangle, ChevronDown, ChevronUp, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import StudentReport from '../../components/Report/StudentReport';
import DailyLearningTimeline from '../../components/Space/DailyLearningTimeline';

// -------------------------------------------------------------
// Helper: format relative time
// -------------------------------------------------------------
const formatTimeElapsed = (ms) => {
  if (ms < 0) return '방금 전';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  return `${hours}시간 전`;
};

// -------------------------------------------------------------
// ChildCalendar: Monthly calendar view for attendance/assignments
// -------------------------------------------------------------
const ChildCalendar = ({ childUid, onDateSelect, selectedDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Fetch all assignments and attendance for this child
  const { data: assignments } = useAdminUserAllAssignments(childUid);
  const { data: attendanceRecords } = useAdminUserAllAttendance(childUid);

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    return new Date(year, month + 1, 0).getDate();
  }, [currentMonth]);

  const firstDayOfMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    return new Date(year, month, 1).getDay();
  }, [currentMonth]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const calendarDays = useMemo(() => {
    const days = [];
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');

    for (let i = 0; i < firstDayOfMonth; i++) {
       days.push(null);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dayStr = String(i).padStart(2, '0');
      const dateStr = `${year}-${month}-${dayStr}`;
      
      const dayAssignments = assignments?.filter(a => a.date === dateStr) || [];
      const attendance = attendanceRecords?.find(a => a.date === dateStr);
      
      days.push({
        dateStr,
        dayNumber: i,
        assignments: dayAssignments,
        attendance: attendance || null
      });
    }
    return days;
  }, [currentMonth, firstDayOfMonth, daysInMonth, assignments, attendanceRecords]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted': return '#fbbf24'; 
      case 'reviewed': return '#00ffa0'; 
      case 'needs_revision': return '#ff4500'; 
      default: return 'rgba(255, 255, 255, 0.1)'; 
    }
  };

  return (
    <div style={{ padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', marginTop: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CalendarIcon size={16} /> 학습 달력
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={handlePrevMonth} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><ChevronLeft size={18} /></button>
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{currentMonth.getFullYear()}.{String(currentMonth.getMonth() + 1).padStart(2, '0')}</span>
          <button onClick={handleNextMonth} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><ChevronRight size={18} /></button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {['일', '월', '화', '수', '목', '금', '토'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', paddingBottom: '4px' }}>{d}</div>
        ))}
        {calendarDays.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />;
          
          const isSelected = selectedDate === day.dateStr;
          const isToday = day.dateStr === getTodayKST();
          
          return (
            <div
              key={day.dateStr}
              onClick={() => onDateSelect(day.dateStr)}
              style={{
                aspectRatio: '1/1',
                borderRadius: '8px',
                background: isSelected ? 'rgba(165, 94, 234, 0.2)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isSelected ? '#a55eea' : isToday ? 'rgba(255,255,255,0.2)' : 'transparent'}`,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ fontSize: '0.75rem', color: isToday ? '#a55eea' : 'white', fontWeight: isToday ? 700 : 400 }}>{day.dayNumber}</span>
              
              <div style={{ display: 'flex', gap: '2px', marginTop: '2px' }}>
                {day.attendance && (
                  <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: day.attendance.status === 'late' ? '#ffb703' : '#00ffa0' }} title="출석" />
                )}
                {day.assignments.length > 0 && (
                  <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: getStatusColor(day.assignments[0].status) }} title="과제" />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: '12px', display: 'flex', gap: '12px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ffa0' }} /> 출석</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fbbf24' }} /> 과제제출</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffb703' }} /> 지각/보완</div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// ChildCard: Single child's live status + today's summary
// -------------------------------------------------------------
const ChildCard = ({ childUid }) => {
  const [childData, setChildData] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [expanded, setExpanded] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportDays, setReportDays] = useState(30);
  const [selectedDate, setSelectedDate] = useState(getTodayKST());
  
  const isToday = selectedDate === getTodayKST();

  const { activities, groupedActivities, dailyStats, loading: historyLoading } = useLearningHistory(childUid, selectedDate);

  // Listen to child's user document in real-time
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'users', childUid), (snap) => {
      if (snap.exists()) {
        setChildData({ uid: snap.id, ...snap.data() });
      }
    });
    return () => unsub();
  }, [childUid]);

  // Refresh "now" every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  if (!childData) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
        로딩 중...
      </div>
    );
  }

  const live = childData.liveStatus || {};
  const state = live.state || 'offline';
  const lastUpdated = live.lastUpdatedAt?.toMillis() || 0;
  const enteredAt = live.enteredAt?.toMillis() || lastUpdated;
  const currentLocation = live.currentLocation || '접속 기록 없음';
  const timeSinceLastUpdate = now - lastUpdated;
  const timeInLocation = state === 'online' ? (now - enteredAt) : 0;

  // Status
  let statusColor = '#4a5568';
  let statusText = '오프라인';
  let statusBg = 'rgba(74, 85, 104, 0.15)';

  if (state === 'online' && timeSinceLastUpdate < 5 * 60000) {
    statusColor = '#00ffa0';
    statusText = '학습 중';
    statusBg = 'rgba(0, 255, 160, 0.1)';
  } else if ((state === 'away' && timeSinceLastUpdate < 30 * 60000) || (state === 'online' && timeSinceLastUpdate >= 5 * 60000 && timeSinceLastUpdate < 15 * 60000)) {
    statusColor = '#ffb703';
    statusText = '자리 비움';
    statusBg = 'rgba(255, 183, 3, 0.1)';
  }

  const isStuck = statusText === '학습 중' && timeInLocation > 15 * 60000 && currentLocation !== '우주 공간(메인) 대기 중';

  return (
    <div style={{
      background: 'rgba(26, 27, 46, 0.85)',
      backdropFilter: 'blur(12px)',
      borderRadius: '20px',
      border: `1px solid ${isStuck ? 'rgba(255, 183, 3, 0.4)' : 'rgba(255,255,255,0.08)'}`,
      overflow: 'hidden',
      boxShadow: isStuck ? '0 0 20px rgba(255, 183, 3, 0.15)' : '0 4px 20px rgba(0,0,0,0.3)',
      transition: 'all 0.3s ease'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        background: statusBg,
        borderBottom: '1px solid rgba(255,255,255,0.06)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Avatar */}
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: `linear-gradient(135deg, ${statusColor}33, ${statusColor}11)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `2px solid ${statusColor}`,
              fontSize: '1.3rem'
            }}>
              {(childData.studentName || childData.name || '?')[0]}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white' }}>{childData.studentName || childData.name || '알 수 없음'}</h3>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                {childData.email}
              </div>
            </div>
          </div>
          {/* Status Badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: `${statusColor}22`,
            padding: '6px 14px',
            borderRadius: '20px',
            border: `1px solid ${statusColor}44`
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
            <span style={{ color: statusColor, fontWeight: 700, fontSize: '0.85rem' }}>{statusText}</span>
          </div>
        </div>

        {/* Current Location */}
        {statusText !== '오프라인' && (
          <div style={{
            marginTop: '14px',
            padding: '10px 14px',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {isStuck && <AlertTriangle size={16} color="#ffb703" />}
            <span style={{ color: isStuck ? '#ffb703' : 'rgba(255,255,255,0.8)', fontSize: '0.95rem', fontWeight: isStuck ? 700 : 400 }}>
              📍 {currentLocation}
            </span>
            {timeInLocation > 60000 && (
              <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: isStuck ? '#ffb703' : 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} /> {formatTimeElapsed(-timeInLocation).replace(' 전', '')}째
              </span>
            )}
          </div>
        )}
        {statusText === '오프라인' && lastUpdated > 0 && (
          <div style={{ marginTop: '10px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
            마지막 접속: {formatTimeElapsed(timeSinceLastUpdate)}
          </div>
        )}
      </div>

        {/* Today's Summary */}
        <div style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {isToday ? `오늘의 학습 (${selectedDate})` : `학습 기록 (${selectedDate})`}
            </div>
            <button 
              onClick={() => setShowCalendar(!showCalendar)}
              style={{
                background: showCalendar ? 'rgba(165, 94, 234, 0.15)' : 'none',
                border: '1px solid rgba(165, 94, 234, 0.3)',
                borderRadius: '6px',
                padding: '4px 10px',
                color: '#a55eea',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <CalendarIcon size={12} /> {showCalendar ? '달력 닫기' : '달력 보기'}
            </button>
          </div>

          <AnimatePresence>
            {showCalendar && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <ChildCalendar 
                  childUid={childUid} 
                  selectedDate={selectedDate} 
                  onDateSelect={(date) => {
                    setSelectedDate(date);
                    setExpanded(true); // Auto-expand timeline when date is picked
                  }} 
                />
                <div style={{ height: '20px' }} />
              </motion.div>
            )}
          </AnimatePresence>

          {historyLoading ? (
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem', textAlign: 'center', padding: '20px' }}>조회 중...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
              <div style={{ textAlign: 'center', padding: '12px 8px', background: 'rgba(0, 255, 160, 0.06)', borderRadius: '12px', border: '1px solid rgba(0, 255, 160, 0.1)' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#00ffa0' }}>{dailyStats.quizCount}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>퀴즈 완료</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px 8px', background: 'rgba(165, 94, 234, 0.06)', borderRadius: '12px', border: '1px solid rgba(165, 94, 234, 0.1)' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#a55eea' }}>{Math.floor(dailyStats.totalVideoSeconds / 60)}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>영상(분)</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px 8px', background: 'rgba(69, 170, 242, 0.06)', borderRadius: '12px', border: '1px solid rgba(69, 170, 242, 0.1)' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#45aaf2' }}>{dailyStats.logCount}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>데이터 로그</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px 8px', background: 'rgba(251, 191, 36, 0.06)', borderRadius: '12px', border: '1px solid rgba(251, 191, 36, 0.1)' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fbbf24' }}>
                  {dailyStats.focusScore ?? '-'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                  집중도 {dailyStats.attentionOpportunities > 0 ? `(${dailyStats.attentionHits}/${dailyStats.attentionOpportunities})` : ''}
                </div>
              </div>
            </div>
          )}

          {/* Expandable Timeline */}
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              width: '100%', marginTop: '14px',
              padding: '10px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              fontSize: '0.85rem',
              transition: 'all 0.2s ease'
            }}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {expanded ? '활동 내역 접기' : `${selectedDate} 상세 타임라인 보기 (${activities.length}건)`}
          </button>

          {expanded && (
            <div style={{ marginTop: '12px', maxHeight: '400px', overflowY: 'auto' }}>
              <DailyLearningTimeline
                groupedActivities={groupedActivities}
                activities={activities}
                dailyStats={dailyStats}
                loading={historyLoading}
              />
            </div>
          )}
        </div>

        {/* Report Button */}
        <div style={{ padding: '0 20px 18px' }}>
          <button
            onClick={() => setShowReport(!showReport)}
            style={{
              width: '100%',
              padding: '12px',
              background: showReport ? 'rgba(165, 94, 234, 0.15)' : 'linear-gradient(135deg, rgba(165, 94, 234, 0.12), rgba(69, 170, 242, 0.08))',
              border: '1px solid rgba(165, 94, 234, 0.25)',
              borderRadius: '12px',
              color: '#a55eea',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            📊 {showReport ? '리포트 닫기' : '성장 리포트 보기'}
          </button>
        </div>

        {/* Full Report */}
        {showReport && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <StudentReport
              userId={childUid}
              days={reportDays}
              onDaysChange={setReportDays}
              isParentView={true}
            />
          </div>
        )}
    </div>
  );
};


// -------------------------------------------------------------
// ParentDashboard: Main page
// -------------------------------------------------------------
export default function ParentDashboard() {
  const navigate = useNavigate();
  const [parentData, setParentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 다중 자녀 탭 관리
  const [selectedChildUid, setSelectedChildUid] = useState(null);
  const [childrenProfiles, setChildrenProfiles] = useState({});

  useEffect(() => {
    if (parentData?.childrenUids?.length > 0) {
      if (!selectedChildUid || !parentData.childrenUids.includes(selectedChildUid)) {
        setSelectedChildUid(parentData.childrenUids[0]);
      }
    }
  }, [parentData?.childrenUids, selectedChildUid]);

  useEffect(() => {
    if (parentData?.childrenUids?.length > 0) {
      const unsubs = parentData.childrenUids.map(uid => 
        onSnapshot(doc(db, 'users', uid), snap => {
          if(snap.exists()) {
            setChildrenProfiles(prev => ({ ...prev, [uid]: { uid: snap.id, ...snap.data()} }));
          }
        })
      );
      return () => unsubs.forEach(u => u());
    }
  }, [parentData?.childrenUids]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/parent');
        return;
      }

      // Listen to parent document
      const unsubDoc = onSnapshot(doc(db, 'parents', user.uid), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.isDeleted) {
            setError('해당 계정은 비활성화(삭제)되었습니다. 선생님에게 문의해 주세요.');
          } else {
            setParentData({ id: snap.id, ...data });
          }
        } else {
          setError('학부모 계정 정보를 찾을 수 없습니다. 선생님에게 문의해 주세요.');
        }
        setLoading(false);
      }, (err) => {
        console.error(err);
        setError('데이터를 불러오는 데 실패했습니다.');
        setLoading(false);
      });

      // Cleanup snapshot listener on unmount or auth state change
      return () => unsubDoc();
    });

    return () => unsubAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/parent');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0a0e1a 0%, #141428 100%)',
      fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif",
      color: 'white'
    }}>
      {/* Stars */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: Math.random() * 2 + 1,
            height: Math.random() * 2 + 1,
            background: 'white',
            borderRadius: '50%',
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            opacity: Math.random() * 0.5 + 0.2
          }} />
        ))}
      </div>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(10, 14, 26, 0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '14px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Rocket size={22} color="#a55eea" />
          <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>수학감각</span>
          <span style={{ fontSize: '0.75rem', color: '#a55eea', background: 'rgba(165,94,234,0.15)', padding: '2px 8px', borderRadius: '10px' }}>학부모</span>
        </div>
        <button onClick={handleLogout} style={{
          background: 'none', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '8px', padding: '8px 14px',
          color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem'
        }}>
          <LogOut size={14} /> 로그아웃
        </button>
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.5)' }}>
            데이터를 불러오는 중...
          </div>
        ) : error ? (
          <div style={{
            textAlign: 'center', padding: '40px 20px',
            background: 'rgba(255,50,50,0.08)',
            borderRadius: '16px',
            border: '1px solid rgba(255,50,50,0.2)',
            color: '#ff6b6b'
          }}>
            {error}
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.3rem' }}>자녀 학습 현황</h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
                실시간으로 자녀의 학습 활동을 확인해 보세요.
              </p>
            </div>

            {(parentData?.childrenUids || []).length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '40px 20px',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.4)'
              }}>
                아직 연결된 자녀가 없습니다.<br/>
                선생님에게 자녀 연결을 요청해 주세요.
              </div>
            ) : (
              <>
                {/* 다중 자녀 탭 (자녀가 2명 이상일 때만 노출) */}
                {parentData.childrenUids.length > 1 && (
                  <div style={{ 
                    display: 'flex', gap: '10px', marginBottom: '20px', 
                    overflowX: 'auto', paddingBottom: '10px',
                    scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch'
                  }}>
                    {parentData.childrenUids.map(uid => {
                      const profile = childrenProfiles[uid] || {};
                      const name = profile.studentName || profile.name || '불러오는 중...';
                      const isActive = selectedChildUid === uid;
                      
                      return (
                        <button 
                          key={`tab-${uid}`}
                          onClick={() => setSelectedChildUid(uid)}
                          style={{
                            flex: '0 0 auto',
                            padding: '10px 18px 10px 12px',
                            borderRadius: '16px',
                            background: isActive ? 'rgba(165, 94, 234, 0.2)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${isActive ? '#a55eea' : 'rgba(255,255,255,0.08)'}`,
                            color: isActive ? 'white' : 'rgba(255,255,255,0.5)',
                            fontWeight: isActive ? 'bold' : 'normal',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            whiteSpace: 'nowrap',
                            boxShadow: isActive ? '0 4px 12px rgba(165, 94, 234, 0.15)' : 'none'
                          }}
                        >
                          <div style={{ 
                            width: 26, height: 26, borderRadius: '50%', 
                            background: isActive ? '#a55eea' : 'rgba(255,255,255,0.1)', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.85rem', color: isActive ? 'white' : 'rgba(255,255,255,0.4)',
                            fontWeight: 700
                          }}>
                            {name === '불러오는 중...' ? '?' : name[0]}
                          </div>
                          {name}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div style={{ position: 'relative' }}>
                  {parentData.childrenUids.map(uid => (
                    <div 
                      key={`card-${uid}`}
                      style={{ 
                        // 컴포넌트를 언마운트하지 않고 화면에서만 숨겨서 백그라운드 데이터 동기화를 유지합니다.
                        display: (parentData.childrenUids.length === 1 || selectedChildUid === uid) ? 'block' : 'none' 
                      }}
                    >
                      <ChildCard childUid={uid} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
