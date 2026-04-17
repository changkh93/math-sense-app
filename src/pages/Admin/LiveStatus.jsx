import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Activity, Clock, AlertTriangle, X, Play, RefreshCw, FileText, CheckCircle2 } from 'lucide-react';
import { useClusters } from '../../hooks/useContent';
import { useAdminTodayAttendance } from '../../hooks/useAssignments';
import { useLearningHistory } from '../../hooks/useLearningHistory';
import { getTodayKST } from '../../utils/streakUtils';
import './Admin.css';

// -------------------------------------------------------------
// Helper: format relative time
// -------------------------------------------------------------
const formatTimeElapsed = (ms) => {
  if (ms < 0) return '방금 전';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}시간 ${remainingMinutes}분`;
};

// -------------------------------------------------------------
// LiveUserRow Component: Displays a single student's row
// -------------------------------------------------------------
const LiveUserRow = ({ user, onViewDetails }) => {
  const [now, setNow] = useState(Date.now());
  const today = getTodayKST();
  
  // Use the hook to get today's history
  const { activities, dailyStats, loading } = useLearningHistory(user.uid, today);

  useEffect(() => {
    // Update the 'now' state every minute to calculate duration dynamically
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const live = user.liveStatus || {};
  const state = live.state || 'offline';
  const lastUpdated = live.lastUpdatedAt?.toMillis() || 0;
  const enteredAt = live.enteredAt?.toMillis() || lastUpdated;
  const currentLocation = live.currentLocation || '메인 화면';

  // Calculate times
  const timeSinceLastUpdate = now - lastUpdated;
  const timeInCurrentLocation = state === 'online' ? (now - enteredAt) : (lastUpdated - enteredAt);
  
  // Status categorization
  let finalStatus = 'offline';
  let badgeColor = '#4a5568';
  let badgeText = '오프라인';

  if (state === 'online' && timeSinceLastUpdate < 5 * 60000) {
    finalStatus = 'online';
    badgeColor = '#00ffa0';
    badgeText = '온라인';
  } else if ((state === 'away' && timeSinceLastUpdate < 30 * 60000) || (state === 'online' && timeSinceLastUpdate >= 5 * 60000 && timeSinceLastUpdate < 15 * 60000)) {
    finalStatus = 'away';
    badgeColor = '#ffb703';
    badgeText = '자리 비움';
  }

  // Stuck Detection (도움 필요 감지)
  // If online, in the same location for > 15 mins, and not in the main lobby
  const isStuck = finalStatus === 'online' && timeInCurrentLocation > 15 * 60000 && currentLocation !== '우주 공간(메인) 대기 중';

  return (
    <tr 
      style={{ 
        borderBottom: '1px solid rgba(255,255,255,0.05)', 
        background: isStuck ? 'rgba(255, 183, 3, 0.15)' : 'transparent',
        transition: 'background 0.3s ease',
        animation: isStuck ? 'pulse-warning 2s infinite' : 'none'
      }}
      className={isStuck ? 'stuck-row' : ''}
    >
      <td style={{ padding: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
           <div style={{ width: 10, height: 10, borderRadius: '50%', background: badgeColor, boxShadow: `0 0 8px ${badgeColor}` }}></div>
           <div>
             <div style={{ fontWeight: 'bold' }}>{user.name || '알 수 없음'}</div>
             <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{user.email}</div>
           </div>
        </div>
      </td>
      <td style={{ padding: '15px' }}>
        <span style={{ 
          background: `rgba(${finalStatus === 'online' ? '0, 255, 160' : finalStatus === 'away' ? '255, 183, 3' : '255, 255, 255'}, 0.1)`, 
          color: badgeColor,
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '0.85rem',
          fontWeight: 'bold'
        }}>
          {badgeText}
        </span>
        <div style={{ marginTop: 5, fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
          {finalStatus === 'online' ? '현재 접속 중' : `${formatTimeElapsed(timeSinceLastUpdate)} 경과`}
        </div>
      </td>
      <td style={{ padding: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
           {isStuck && <AlertTriangle size={16} color="#ffb703" />}
           <span style={{ color: isStuck ? '#ffb703' : 'white', fontWeight: isStuck ? 'bold' : 'normal' }}>
             {currentLocation}
           </span>
        </div>
        {(timeInCurrentLocation > 60000 && currentLocation !== '우주 공간(메인) 대기 중') && (
           <div style={{ fontSize: '0.8rem', color: isStuck ? '#ffb703' : 'rgba(255,255,255,0.5)', marginTop: 4 }}>
             <Clock size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
             {formatTimeElapsed(timeInCurrentLocation)}째 머무름
           </div>
        )}
      </td>
      <td style={{ padding: '15px' }}>
         {loading ? (
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>조회 중...</span>
         ) : (
            <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
               {dailyStats.quizCount === 0 && dailyStats.totalVideoSeconds === 0 && dailyStats.logCount === 0 ? (
                 <span style={{ color: 'rgba(255,255,255,0.4)' }}>완료된 활동 없음</span>
               ) : (
                 <>
                   {dailyStats.quizCount > 0 && <span>✅ 퀴즈 완료: {dailyStats.quizCount}회</span>}
                   {dailyStats.totalVideoSeconds > 0 && <span>🎬 영상 시청: {Math.floor(dailyStats.totalVideoSeconds / 60)}분</span>}
                   {dailyStats.logCount > 0 && <span>📝 데이터 로그: {dailyStats.logCount}회 열람</span>}
                 </>
               )}
            </div>
         )}
      </td>
      <td style={{ padding: '15px' }}>
         <button 
           className="secondary-btn" 
           onClick={() => onViewDetails(user, activities)}
           style={{ padding: '6px 12px', fontSize: '0.85rem' }}
         >
           상세 기록
         </button>
      </td>
    </tr>
  );
};


// -------------------------------------------------------------
// LiveStatus Page
// -------------------------------------------------------------
export default function LiveStatus() {
  const { data: clusters = [], isLoading: clustersLoading } = useClusters();
  const todayStr = getTodayKST();
  const { data: todayAttendance = [], isLoading: attendanceLoading } = useAdminTodayAttendance(todayStr);

  const [selectedClusterId, setSelectedClusterId] = useState('all');
  const [users, setUsers] = useState([]);
  const [parentsMap, setParentsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [nowDate, setNowDate] = useState(new Date());

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'parents'), (snap) => {
      const map = {};
      snap.docs.forEach(d => {
        const data = d.data();
        if (!data.isDeleted && data.childrenUids) {
          data.childrenUids.forEach(childUid => {
            map[childUid] = data.phone;
          });
        }
      });
      setParentsMap(map);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNowDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Drawer status
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedActivities, setSelectedActivities] = useState([]);

  useEffect(() => {
    // Fetch ALL non-admin users to ensure no student is missed.
    // Students without liveStatus (e.g. cached old code) will still appear as "offline".
    // For a class of ~20-30 students, this is both performant and robust.

    const usersRef = collection(db, 'users');
    // We cannot easily query "role != admin" in Firestore, 
    // so we fetch all users and filter client-side.
    const unsubscribe = onSnapshot(usersRef, (snap) => {
      const allUsers = snap.docs
        .map(doc => ({ uid: doc.id, ...doc.data() }))
        // Exclude admins and parent accounts
        .filter(u => u.role !== 'admin' && u.role !== 'parent');

      // Sort: online first, then away, then offline. Within each group, sort by recency.
      const statusPriority = (u) => {
        const live = u.liveStatus || {};
        const state = live.state || 'offline';
        const lastUpdated = live.lastUpdatedAt?.toMillis() || 0;
        const timeSince = Date.now() - lastUpdated;
        
        if (state === 'online' && timeSince < 5 * 60000) return 0; // Online
        if ((state === 'away' && timeSince < 30 * 60000) || (state === 'online' && timeSince >= 5 * 60000 && timeSince < 15 * 60000)) return 1; // Away
        return 2; // Offline
      };

      allUsers.sort((a, b) => {
        const pa = statusPriority(a);
        const pb = statusPriority(b);
        if (pa !== pb) return pa - pb;
        // Within same priority, sort by last updated descending
        const aTime = a.liveStatus?.lastUpdatedAt?.toMillis() || 0;
        const bTime = b.liveStatus?.lastUpdatedAt?.toMillis() || 0;
        return bTime - aTime;
      });

      setUsers(allUsers);
      setLoading(false);
    }, (error) => {
      console.error("LiveStatus fetch error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter by cluster
  const filteredUsers = useMemo(() => {
    if (selectedClusterId === 'all') return users;
    return users.filter(u => {
      // Either liveStatus says they are in this cluster, or their clusterAccess allows it
      return (u.liveStatus?.clusterId === selectedClusterId) || 
             (u.clusterAccess && u.clusterAccess[selectedClusterId] === 'active');
    });
  }, [users, selectedClusterId]);

  // --- Late Students Calculation ---
  const lateStudentsList = useMemo(() => {
    if (!clusters || clusters.length === 0 || !users || users.length === 0) return [];
    
    const daysArr = ['일', '월', '화', '수', '목', '금', '토'];
    const currentDayStr = daysArr[nowDate.getDay()];
    const currentHours = nowDate.getHours();
    const currentMinutes = nowDate.getMinutes();
    const currentTimeInMins = currentHours * 60 + currentMinutes;

    const missingList = [];

    // Find all active schedules for current time
    clusters.forEach(cluster => {
      if (!cluster.classSchedule) return;

      cluster.classSchedule.forEach(schedule => {
        // Handle numeric '1' vs '월'
        const dayMap = { '1': '월', '2': '화', '3': '수', '4': '목', '5': '금', '6': '토', '7': '일' };
        
        const checkDayMatch = (val) => {
           if (!val) return false;
           return (dayMap[val] || val) === currentDayStr;
        };

        let isToday = false;
        if (schedule.days && Array.isArray(schedule.days)) {
          isToday = schedule.days.some(checkDayMatch);
        } else if (schedule.day) {
          isToday = checkDayMatch(schedule.day);
        }
        
        if (!isToday) return;

        // Verify time (Must have started, and grace period passed)
        // Let's flag them if class started and 5 mins passed, but class hasn't finished yet.
        const [startH, startM] = (schedule.startTime || "00:00").split(':').map(Number);
        const [endH, endM] = (schedule.endTime || "23:59").split(':').map(Number);
        
        const startTimeInMins = startH * 60 + startM;
        const endTimeInMins = endH * 60 + endM;
        const graceEndMins = startTimeInMins + 5; 

        // If class is currently on-going and grace period has passed
        if (currentTimeInMins >= graceEndMins && currentTimeInMins <= endTimeInMins) {
          // Check which users have this cluster & day in participation
          users.forEach(u => {
            if (!u.participation) return;
            const userDays = u.participation[cluster.docId || cluster.id] || [];
            
            if (userDays.includes(currentDayStr)) {
               // User SHOULD be attending. Did they check in?
               // attendance records have userId, clusterId, date
               const hasAttended = todayAttendance.some(att => 
                 att.userId === u.uid && 
                 (att.clusterId === cluster.id || att.clusterId === cluster.docId)
               );

               if (!hasAttended) {
                 // Prevent duplicates if user has multiple schedules in same cluster overlapping
                 if (!missingList.find(m => m.uid === u.uid && m.clusterName === cluster.name)) {
                   missingList.push({
                     uid: u.uid,
                     name: u.studentName || u.name || '알 수 없음',
                     clusterName: cluster.name,
                     studentPhone: u.studentPhone || '',
                     parentPhone: parentsMap[u.uid] || ''
                   });
                 }
               }
            }
          });
        }
      });
    });

    return missingList;
  }, [clusters, users, nowDate, todayAttendance, parentsMap]);

  return (
    <div className="admin-page position-relative" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
       
       <style>{`
          @keyframes pulse-warning {
             0% { background-color: rgba(255, 183, 3, 0.05); }
             50% { background-color: rgba(255, 183, 3, 0.25); }
             100% { background-color: rgba(255, 183, 3, 0.05); }
          }
          .stuck-row td { color: #ffebcc; }
          .drawer-overlay {
             position: fixed; top: 0; left: 0; right: 0; bottom: 0;
             background: rgba(0,0,0,0.6); z-index: 1000;
             display: flex; justify-content: flex-end;
          }
          .drawer-panel {
             width: 400px; max-width: 90vw; background: #1a1b26; height: 100vh;
             border-left: 1px solid rgba(255,255,255,0.1);
             padding: 24px; overflow-y: auto;
             box-shadow: -5px 0 25px rgba(0,0,0,0.5);
             animation: slideIn 0.3s forwards;
          }
          @keyframes slideIn {
             from { transform: translateX(100%); }
             to { transform: translateX(0); }
          }
       `}</style>
      
      <div className="admin-header-row">
        <h2><Activity size={24} style={{ display: 'inline', marginRight: 10, verticalAlign: 'middle', color: '#00f3ff' }} />실시간 학습 현황</h2>
      </div>

      <div className="content-grid" style={{ gridTemplateColumns: '1fr', flex: 1 }}>
        <div className="editor-section block-appear glass" style={{ padding: '20px', background: 'rgba(10, 15, 30, 0.6)' }}>
           
           {/* Late Students Dashboard */}
           {lateStudentsList.length > 0 && (
             <div style={{
               background: 'rgba(255, 69, 0, 0.1)',
               border: '1px solid #ff4500',
               borderRadius: '12px',
               padding: '20px',
               marginBottom: '20px',
               animation: 'pulse-warning 2s infinite'
             }}>
               <h3 style={{ margin: '0 0 15px 0', color: '#ffb703', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <AlertTriangle size={20} /> 미접속/지각 탐사원 ({lateStudentsList.length}명)
               </h3>
               
               <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
                 {lateStudentsList.map((student, idx) => (
                   <div key={`${student.uid}-${idx}`} style={{ display: 'flex', gap: '15px', color: 'white', fontSize: '0.9rem', padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                     <strong style={{ width: '100px' }}>{student.name}</strong>
                     <span style={{ color: 'var(--crystal-cyan)', width: '150px' }}>{student.clusterName}</span>
                     <span style={{ color: 'rgba(255,255,255,0.6)' }}>학생: {student.studentPhone || '없음'}</span>
                     <span style={{ color: 'rgba(255,255,255,0.6)' }}>부모: {student.parentPhone || '없음'}</span>
                   </div>
                 ))}
               </div>

               <div style={{ display: 'flex', gap: '15px' }}>
                 <button 
                   className="space-btn cosmic-btn"
                   onClick={() => {
                     const phones = lateStudentsList.map(s => s.parentPhone).filter(Boolean);
                     if (phones.length > 0) {
                       navigator.clipboard.writeText(phones.join(', '));
                       alert('학부모 연락처들이 클립보드에 복사되었습니다.');
                     } else {
                       alert('복사할 학부모 연락처가 없습니다.');
                     }
                   }}
                   style={{ padding: '8px 15px', fontSize: '0.85rem' }}
                 >
                   📋 학부모 연락처 복사
                 </button>
                 <button 
                   className="space-btn cosmic-btn"
                   onClick={() => {
                     const phones = lateStudentsList.map(s => s.studentPhone).filter(Boolean);
                     if (phones.length > 0) {
                       navigator.clipboard.writeText(phones.join(', '));
                       alert('학생 연락처들이 클립보드에 복사되었습니다.');
                     } else {
                       alert('복사할 학생 연락처가 없습니다.');
                     }
                   }}
                   style={{ padding: '8px 15px', fontSize: '0.85rem' }}
                 >
                   📋 학생 연락처 복사
                 </button>
               </div>
             </div>
           )}

           {/* Controls */}
           <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center' }}>
             <span style={{ fontWeight: 'bold' }}>필터링:</span>
             <select 
                value={selectedClusterId}
                onChange={(e) => setSelectedClusterId(e.target.value)}
                style={{ 
                  padding: '10px 15px', 
                  borderRadius: '8px', 
                  background: 'var(--panel-bg)',
                  color: 'white', 
                  border: '1px solid var(--border-color)',
                  outline: 'none',
                  minWidth: '200px'
                }}
              >
                <option value="all">전체 군집 (All Clusters)</option>
                {clusters.map(c => (
                  <option key={c.docId || c.id} value={c.docId || c.id}>{c.name}</option>
                ))}
              </select>
              
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '15px', fontSize: '0.9rem' }}>
                 <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00ffa0' }}></div> 온라인
                 </span>
                 <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffb703' }}></div> 자리 비움 (5분+)
                 </span>
                 <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4a5568' }}></div> 오프라인 (15분+)
                 </span>
                 <span style={{ display: 'flex', alignItems: 'center', gap: '5px', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '15px' }}>
                    <AlertTriangle size={14} color="#ffb703" /> 장기 정체 (15분+)
                 </span>
              </div>
           </div>

           {/* Table */}
           <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white', background: 'rgba(0,0,0,0.3)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', background: 'rgba(0,0,0,0.4)' }}>
                    <th style={{ padding: '15px', width: '20%' }}>학생 정보</th>
                    <th style={{ padding: '15px', width: '15%' }}>접속 상태</th>
                    <th style={{ padding: '15px', width: '25%' }}>현재 위치</th>
                    <th style={{ padding: '15px', width: '30%' }}>오늘의 요약</th>
                    <th style={{ padding: '15px', width: '10%' }}>동작</th>
                  </tr>
                </thead>
                <tbody>
                   {loading ? (
                     <tr>
                        <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                           <RefreshCw size={24} className="spin" style={{ display: 'block', margin: '0 auto 10px' }} />
                           실시간 데이터를 수신하는 중...
                        </td>
                     </tr>
                   ) : filteredUsers.length === 0 ? (
                     <tr>
                        <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                           최근 24시간 이내 접속 기록이 있는 학생이 없습니다.
                        </td>
                     </tr>
                   ) : (
                     filteredUsers.map(user => (
                       <LiveUserRow 
                         key={user.uid} 
                         user={user} 
                         onViewDetails={(u, acts) => {
                           setSelectedUser(u);
                           setSelectedActivities(acts);
                         }} 
                       />
                     ))
                   )}
                </tbody>
              </table>
           </div>

        </div>
      </div>

      {/* Drawer for Details */}
      {selectedUser && (
         <div className="drawer-overlay" onClick={(e) => { if(e.target === e.currentTarget) setSelectedUser(null) }}>
            <div className="drawer-panel">
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px' }}>
                  <h3 style={{ margin: 0 }}>{selectedUser.name} <span style={{fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)'}}>학습 타임라인</span></h3>
                  <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20}/></button>
               </div>
               
               <p style={{ fontSize: '0.85rem', color: '#ffb703', marginBottom: '20px' }}>
                  ※ 오늘({getTodayKST()}) 하루 동안의 상세 활동 기록입니다.
               </p>

               {selectedActivities.length === 0 ? (
                 <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.4)', fontSize: '0.95rem' }}>
                    오늘 완료한 학습 기록이 없습니다.
                 </div>
               ) : (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {selectedActivities.map((act) => (
                      <div key={act.id} style={{ 
                        padding: '12px', 
                        background: 'rgba(255,255,255,0.05)', 
                        borderRadius: '8px',
                        borderLeft: `4px solid ${act.type === 'quiz_pass' ? '#00ffa0' : act.type === 'video_complete' ? '#a55eea' : '#45aaf2'}`
                      }}>
                         <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
                            {act.timestamp ? new Date(act.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : ''}
                         </div>
                         <div style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: 2 }}>{act.title}</div>
                         {act.score !== null && (
                            <div style={{ fontSize: '0.85rem', color: '#00ffa0', marginTop: 5 }}>
                               점수: {act.score}점 {act.attemptCount > 1 && <span style={{color: 'rgba(255,255,255,0.5)'}}>({act.attemptCount}번째 시도)</span>}
                            </div>
                         )}
                      </div>
                    ))}
                 </div>
               )}
            </div>
         </div>
      )}

    </div>
  );
}

