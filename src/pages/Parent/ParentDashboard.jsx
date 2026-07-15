import React, { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { ACCOUNT_DELETION_CALL_TIMEOUT_MS, db, auth, functions } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import { useLearningHistory } from '../../hooks/useLearningHistory';
import { useAdminUserAllAssignments, useAdminUserAllAttendance, useStudentAssignmentWarnings } from '../../hooks/useAssignments';
import { getTodayKST } from '../../utils/streakUtils';
import { Rocket, LogOut, Trash2, Clock, AlertTriangle, ChevronDown, ChevronUp, Calendar as CalendarIcon, ChevronLeft, ChevronRight, KeyRound, Eye, EyeOff, X } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import StudentReport from '../../components/Report/StudentReport';
import DailyLearningTimeline from '../../components/Space/DailyLearningTimeline';
import ChildAccountCreator from '../../components/Parent/ChildAccountCreator';
import ReferralBillingCard from '../../components/Parent/ReferralBillingCard';

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

const ASSIGNMENT_MISSING_GRACE_MS = 12 * 60 * 60 * 1000;
const ACTIVE_WARNING_STATUSES = ['active', 'appealed'];

const getTimestampMs = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value.seconds) return value.seconds * 1000;
  if (value._seconds) return value._seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const getAttendanceBaseMs = (attendance) => (
  getTimestampMs(attendance?.timestamp) ||
  getTimestampMs(attendance?.createdAt) ||
  getTimestampMs(attendance?.updatedAt) ||
  (attendance?.date ? new Date(`${attendance.date}T23:59:59+09:00`).getTime() : 0)
);

// -------------------------------------------------------------
// ChildCalendar: Monthly calendar view for attendance/assignments
// -------------------------------------------------------------
const ChildCalendar = ({ childUid, onDateSelect, selectedDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Fetch all assignments and attendance for this child
  const { data: assignments } = useAdminUserAllAssignments(childUid);
  const { data: attendanceRecords } = useAdminUserAllAttendance(childUid);
  const { data: assignmentWarnings = [] } = useStudentAssignmentWarnings(childUid);

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
    const nowMs = Date.now();
    const submittedAssignmentKeys = new Set(
      (assignments || [])
        .filter(a => ['submitted', 'reviewed', 'needs_revision'].includes(a.status))
        .map(a => `${a.date || ''}:${a.clusterId || ''}`)
    );
    const missingByDate = (attendanceRecords || []).reduce((acc, attendance) => {
      if (!attendance?.date) return acc;
      const assignmentKey = `${attendance.date}:${attendance.clusterId || ''}`;
      if (submittedAssignmentKeys.has(assignmentKey)) return acc;
      const baseMs = getAttendanceBaseMs(attendance);
      if (!baseMs || nowMs - baseMs < ASSIGNMENT_MISSING_GRACE_MS) return acc;
      if (!acc[attendance.date]) acc[attendance.date] = [];
      acc[attendance.date].push(attendance);
      return acc;
    }, {});
    const warningsByDate = (assignmentWarnings || []).reduce((acc, warning) => {
      if (!warning?.date || !ACTIVE_WARNING_STATUSES.includes(warning.status)) return acc;
      if (!acc[warning.date]) acc[warning.date] = [];
      acc[warning.date].push(warning);
      return acc;
    }, {});

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
        attendance: attendance || null,
        missingAttendances: missingByDate[dateStr] || [],
        warnings: warningsByDate[dateStr] || []
      });
    }
    return days;
  }, [currentMonth, firstDayOfMonth, daysInMonth, assignments, attendanceRecords, assignmentWarnings]);

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
          const hasMissing = day.missingAttendances.length > 0;
          const hasWarning = day.warnings.length > 0;
          
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
              {hasWarning && (
                <div
                  title="과제 경고"
                  style={{
                    position: 'absolute',
                    top: 3,
                    right: 3,
                    color: '#fbbf24',
                    fontSize: '0.74rem',
                    lineHeight: 1,
                    filter: 'drop-shadow(0 0 5px rgba(251,191,36,0.75))'
                  }}
                >
                  ⚠
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '2px', marginTop: '2px' }}>
                {day.attendance && (
                  <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: day.attendance.status === 'late' ? '#ffb703' : '#00ffa0' }} title="출석" />
                )}
                {day.assignments.length > 0 && (
                  <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: getStatusColor(day.assignments[0].status) }} title="과제" />
                )}
                {hasMissing && (
                  <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#fb7185' }} title="출석 후 과제 미제출" />
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fb7185' }} /> 미제출</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24' }}>⚠ 경고</div>
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
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '' });
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  
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

  const closePasswordReset = () => {
    if (resettingPassword) return;
    setShowPasswordReset(false);
    setPasswordForm({ password: '', confirm: '' });
    setShowPasswordText(false);
    setPasswordMessage('');
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setPasswordMessage('');

    if (passwordForm.password.length < 6) {
      setPasswordMessage('비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    if (passwordForm.password !== passwordForm.confirm) {
      setPasswordMessage('비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setResettingPassword(true);
    try {
      const resetChildPassword = httpsCallable(functions, 'resetChildPasswordForParent');
      await resetChildPassword({ targetUid: childUid, newPassword: passwordForm.password });
      setPasswordMessage('비밀번호가 변경되었습니다.');
      setPasswordForm({ password: '', confirm: '' });
    } catch (err) {
      console.error('resetChildPasswordForParent failed:', err);
      setPasswordMessage(err?.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setResettingPassword(false);
    }
  };

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
        <div style={{ padding: '0 20px 18px', display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
          <button
            onClick={() => {
              setShowPasswordReset(true);
              setPasswordMessage('');
            }}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '12px',
              color: 'rgba(255,255,255,0.78)',
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
            <KeyRound size={16} /> 학생 비밀번호 변경
          </button>
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

        <AnimatePresence>
          {showPasswordReset && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 30,
                background: 'rgba(3, 7, 18, 0.72)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20
              }}
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) closePasswordReset();
              }}
            >
              <motion.form
                onSubmit={handlePasswordReset}
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                style={{
                  width: 'min(100%, 420px)',
                  background: 'rgba(26, 27, 46, 0.96)',
                  border: '1px solid rgba(165, 94, 234, 0.28)',
                  borderRadius: 18,
                  boxShadow: '0 24px 80px rgba(0,0,0,0.48)',
                  padding: 22,
                  display: 'grid',
                  gap: 14
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <h3 style={{ margin: 0, color: 'white', fontSize: '1.05rem' }}>학생 비밀번호 변경</h3>
                    <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.52)', fontSize: '0.86rem', lineHeight: 1.5 }}>
                      {childData.studentName || childData.name || '자녀'} · {childData.loginId || childData.email}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={closePasswordReset}
                    disabled={resettingPassword}
                    style={{
                      border: '1px solid rgba(255,255,255,0.14)',
                      background: 'rgba(255,255,255,0.05)',
                      color: 'rgba(255,255,255,0.82)',
                      cursor: resettingPassword ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '9px 12px',
                      borderRadius: 999,
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap'
                    }}
                    aria-label="창 닫기"
                    title="창 닫기"
                  >
                    <X size={14} />
                    <span>닫기</span>
                  </button>
                </div>

                <label>
                  <span style={{ display: 'block', marginBottom: 6, color: 'rgba(255,255,255,0.68)', fontSize: '0.84rem' }}>새 비밀번호</span>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPasswordText ? 'text' : 'password'}
                      value={passwordForm.password}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, password: e.target.value }))}
                      minLength={6}
                      autoComplete="new-password"
                      required
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '12px 44px 12px 13px',
                        borderRadius: 11,
                        border: '1px solid rgba(255,255,255,0.14)',
                        background: 'rgba(255,255,255,0.06)',
                        color: 'white',
                        fontSize: '1rem'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordText(prev => !prev)}
                      style={{
                        position: 'absolute',
                        right: 9,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        border: 'none',
                        background: 'transparent',
                        color: 'rgba(255,255,255,0.55)',
                        cursor: 'pointer'
                      }}
                      aria-label={showPasswordText ? '비밀번호 숨기기' : '비밀번호 보기'}
                    >
                      {showPasswordText ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>

                <label>
                  <span style={{ display: 'block', marginBottom: 6, color: 'rgba(255,255,255,0.68)', fontSize: '0.84rem' }}>새 비밀번호 확인</span>
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                    minLength={6}
                    autoComplete="new-password"
                    required
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '12px 13px',
                      borderRadius: 11,
                      border: '1px solid rgba(255,255,255,0.14)',
                      background: 'rgba(255,255,255,0.06)',
                      color: 'white',
                      fontSize: '1rem'
                    }}
                  />
                </label>

                {passwordMessage && (
                  <div style={{
                    color: passwordMessage.includes('변경되었습니다') ? '#80f7c4' : '#ff8a84',
                    background: passwordMessage.includes('변경되었습니다') ? 'rgba(0,255,160,0.08)' : 'rgba(255,88,82,0.08)',
                    border: `1px solid ${passwordMessage.includes('변경되었습니다') ? 'rgba(0,255,160,0.18)' : 'rgba(255,88,82,0.18)'}`,
                    borderRadius: 10,
                    padding: '10px 12px',
                    fontSize: '0.86rem'
                  }}>
                    {passwordMessage}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button
                    type="button"
                    onClick={closePasswordReset}
                    disabled={resettingPassword}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 11,
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(255,255,255,0.04)',
                      color: 'rgba(255,255,255,0.72)',
                      cursor: resettingPassword ? 'not-allowed' : 'pointer',
                      fontWeight: 700
                    }}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={resettingPassword}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 11,
                      border: '1px solid rgba(165,94,234,0.34)',
                      background: resettingPassword ? 'rgba(165,94,234,0.34)' : 'linear-gradient(135deg, #a55eea, #45aaf2)',
                      color: 'white',
                      cursor: resettingPassword ? 'not-allowed' : 'pointer',
                      fontWeight: 800
                    }}
                  >
                    {resettingPassword ? '변경 중...' : '변경'}
                  </button>
                </div>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>

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
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // 다중 자녀 탭 관리
  const [selectedChildUid, setSelectedChildUid] = useState(null);
  const [childrenProfiles, setChildrenProfiles] = useState({});
  const [showChildCreator, setShowChildCreator] = useState(false);

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
        navigate('/');
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
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser?.uid || isDeletingAccount) return;

    const confirmTarget = parentData?.phone || parentData?.loginId || parentData?.email || currentUser.email || '탈퇴';
    const firstConfirm = window.confirm(
      '학부모 계정을 완전히 탈퇴합니다.\n\n' +
      '연결된 자녀 계정도 함께 삭제됩니다.\n\n' +
      '삭제 범위: 로그인 계정, 자녀 학습 기록, 광석/거래 내역, 과제, 출석, 질문/답변, 쪽지, 스터디 크루 연결, 업로드 파일.\n\n' +
      '이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?'
    );
    if (!firstConfirm) return;

    const confirmText = window.prompt(
      `최종 확인을 위해 아래 문구를 입력하세요.\n\n${confirmTarget}`
    );
    if (confirmText !== confirmTarget) {
      alert('확인 문구가 일치하지 않아 탈퇴를 취소했습니다.');
      return;
    }

    setIsDeletingAccount(true);
    window.sessionStorage.setItem('accountDeletionInProgress', currentUser.uid);

    try {
      const deleteAccount = httpsCallable(functions, 'deleteCurrentUserAccount', {
        timeout: ACCOUNT_DELETION_CALL_TIMEOUT_MS
      });
      await deleteAccount({ confirmText });
      try {
        await signOut(auth);
      } catch (signOutErr) {
        console.warn('signOut after account deletion failed:', signOutErr);
      }
      window.sessionStorage.removeItem('accountDeletionInProgress');
      navigate('/', { replace: true });
      alert('탈퇴 처리가 완료되었습니다.');
    } catch (err) {
      console.error('deleteCurrentUserAccount failed:', err);
      window.sessionStorage.removeItem('accountDeletionInProgress');
      alert(err?.message || '탈퇴 처리 중 오류가 발생했습니다.');
    } finally {
      setIsDeletingAccount(false);
    }
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
          <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>메타 센스</span>
          <span style={{ fontSize: '0.75rem', color: '#a55eea', background: 'rgba(165,94,234,0.15)', padding: '2px 8px', borderRadius: '10px' }}>학부모</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button onClick={handleDeleteAccount} disabled={isDeletingAccount} style={{
            background: 'rgba(255, 88, 82, 0.08)', border: '1px solid rgba(255, 138, 132, 0.24)',
            borderRadius: '8px', padding: '8px 14px',
            color: '#ff8a84', cursor: isDeletingAccount ? 'not-allowed' : 'pointer',
            opacity: isDeletingAccount ? 0.55 : 1,
            display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem'
          }}>
            <Trash2 size={14} /> {isDeletingAccount ? '탈퇴 처리 중...' : '회원탈퇴'}
          </button>
          <button onClick={handleLogout} disabled={isDeletingAccount} style={{
            background: 'none', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '8px', padding: '8px 14px',
            color: 'rgba(255,255,255,0.6)', cursor: isDeletingAccount ? 'not-allowed' : 'pointer',
            opacity: isDeletingAccount ? 0.55 : 1,
            display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem'
          }}>
            <LogOut size={14} /> 로그아웃
          </button>
        </div>
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
            <ReferralBillingCard />

            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.3rem' }}>자녀 학습 현황</h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
                실시간으로 자녀의 학습 활동을 확인해 보세요.
              </p>
            </div>

            <div style={{ marginBottom: 18 }}>
              <button
                onClick={() => setShowChildCreator(prev => !prev)}
                style={{
                  width: '100%',
                  border: '1px dashed rgba(0,212,255,0.35)',
                  background: 'rgba(0,212,255,0.08)',
                  color: '#67e8f9',
                  borderRadius: 14,
                  padding: '12px 14px',
                  cursor: 'pointer',
                  fontWeight: 800
                }}
              >
                {showChildCreator ? '자녀 계정 생성 닫기' : '자녀 학습자 계정 추가'}
              </button>
              {showChildCreator && (
                <div style={{ marginTop: 12 }}>
                  <ChildAccountCreator compact onCreated={() => setShowChildCreator(false)} />
                </div>
              )}
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
                위의 버튼으로 자녀 학습자 계정을 만들 수 있습니다.
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
