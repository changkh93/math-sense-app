import React, { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import { useLearningHistory } from '../../hooks/useLearningHistory';
import { getTodayKST } from '../../utils/streakUtils';
import { Rocket, LogOut, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

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
// ChildCard: Single child's live status + today's summary
// -------------------------------------------------------------
const ChildCard = ({ childUid }) => {
  const [childData, setChildData] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [expanded, setExpanded] = useState(false);
  const today = getTodayKST();
  const { activities, dailyStats, loading: historyLoading } = useLearningHistory(childUid, today);

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
              {(childData.name || '?')[0]}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white' }}>{childData.name || '알 수 없음'}</h3>
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
        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          오늘의 학습 ({today})
        </div>

        {historyLoading ? (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>조회 중...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
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
          {expanded ? '접기' : `상세 타임라인 보기 (${activities.length}건)`}
        </button>

        {expanded && (
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
            {activities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
                오늘 완료된 활동이 없습니다.
              </div>
            ) : (
              activities.map(act => (
                <div key={act.id} style={{
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: '10px',
                  borderLeft: `3px solid ${act.type === 'quiz_pass' ? '#00ffa0' : act.type === 'video_complete' ? '#a55eea' : '#45aaf2'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{act.title}</span>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                      {act.timestamp ? new Date(act.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  {act.score !== null && act.score !== undefined && (
                    <div style={{ fontSize: '0.8rem', color: '#00ffa0', marginTop: 4 }}>
                      점수: {act.score}점
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
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

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate('/parent');
      return;
    }

    // Listen to parent document
    const unsub = onSnapshot(doc(db, 'parents', user.uid), (snap) => {
      if (snap.exists()) {
        setParentData({ id: snap.id, ...snap.data() });
      } else {
        setError('학부모 계정 정보를 찾을 수 없습니다. 선생님에게 문의해 주세요.');
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError('데이터를 불러오는 데 실패했습니다.');
      setLoading(false);
    });

    return () => unsub();
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {parentData.childrenUids.map(uid => (
                  <ChildCard key={uid} childUid={uid} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
