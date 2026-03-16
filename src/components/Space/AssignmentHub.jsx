import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useStudentAssignments, useSubmitAssignment, useRecordAttendance, useStudentAttendance } from '../../hooks/useAssignments';
import { useClusters } from '../../hooks/useContent';
import { storage } from '../../firebase';
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import AssignmentChronicle from './AssignmentChronicle';
import '../../styles/space-theme.css'; // Assuming we re-use our cosmic buttons and glass cards
import { getTodayKST, getNowKST } from '../../utils/streakUtils';

/**
 * Assignment Hub (Stellar Archive)
 * The main interface for students to view their assignments map (calendar) and submit work.
 */
export default function AssignmentHub({ clusterId, regionId, onClose }) {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(null); // The date the user clicked on
  const [showChronicle, setShowChronicle] = useState(false);

  // Auto-select today
  useEffect(() => {
    setSelectedDateStr(getTodayKST());
  }, []);
  
  // Data Fetching - Fetch cluster-wide assignments (ignore regionId)
  const { data: assignments, isLoading } = useStudentAssignments(user?.uid, clusterId);
  const { data: attendanceRecords, isLoading: isAttendanceLoading } = useStudentAttendance(user?.uid, clusterId);
  const { data: clusters } = useClusters();
  const submitMutation = useSubmitAssignment();
  const attendanceMutation = useRecordAttendance();

  const clusterData = useMemo(() => {
    return clusters?.find(c => c.id === clusterId || c.docId === clusterId);
  }, [clusters, clusterId]);

  // Calendar Logic
  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return new Date(year, month + 1, 0).getDate();
  }, [currentDate]);

  const firstDayOfMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return new Date(year, month, 1).getDay();
  }, [currentDate]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Build the calendar array
  const calendarDays = useMemo(() => {
    const days = [];
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');

    // Padding for first week
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dayStr = String(i).padStart(2, '0');
      const dateStr = `${year}-${month}-${dayStr}`;
      
      // Find assignment for this date
      const assignment = assignments?.find(a => a.date === dateStr);
      const attendance = attendanceRecords?.find(a => a.date === dateStr);
      
      days.push({
        dateStr,
        dayNumber: i,
        assignment: assignment || null,
        attendance: attendance || null
      });
    }
    return days;
  }, [currentDate, firstDayOfMonth, daysInMonth, assignments, attendanceRecords]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted': return '#fbbf24'; // Yellow pulse
      case 'reviewed': return '#00d4ff'; // Cyan complete
      case 'needs_revision': return '#ff4500'; // Red siren
      default: return 'rgba(255, 255, 255, 0.1)'; // Not submitted
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'submitted': return '대기중';
      case 'reviewed': return '확인 완료';
      case 'needs_revision': return '재검토요망';
      default: return '미확인';
    }
  };

  // Render the Chronicle overlay if active
  if (showChronicle) {
    return (
      <AssignmentChronicle 
        assignments={assignments} 
        onClose={() => setShowChronicle(false)} 
      />
    );
  }

  return (
    <div className="fade-in" style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0,
      pointerEvents: 'auto', 
      background: 'rgba(5, 5, 16, 0.98)', 
      backdropFilter: 'blur(15px)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 10001, // Navbar is 1000, we must be higher
      overflow: 'hidden'
    }}>
      {/* Persistent Header */}
      <div style={{ 
        width: '100%', 
        padding: '1rem 5%', 
        borderBottom: '1px solid rgba(0, 243, 255, 0.1)',
        background: 'rgba(5, 5, 16, 0.6)',
        backdropFilter: 'blur(10px)',
        boxSizing: 'border-box',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ 
          width: '100%', 
          maxWidth: '1400px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          gap: '2rem'
        }}>
          <button 
            className="space-nav-link font-tech"
            onClick={onClose}
            style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}
          >
            ← RETURN
          </button>
          
          <h2 className="font-title" style={{ 
            color: 'var(--star-gold)', 
            textShadow: '0 0 10px rgba(255,215,0,0.5)', 
            margin: 0,
            fontSize: 'clamp(1rem, 3vw, 1.8rem)',
            textAlign: 'center',
            letterSpacing: '2px',
            flex: 1
          }}>
             STELLAR ARCHIVE
             <span className="font-tech" style={{ fontSize: '0.8rem', opacity: 0.6, marginLeft: '0.5rem', color: 'var(--crystal-cyan)' }}>
               {clusterId ? `[${clusterId}]` : '[GALAXY_SCAN_PENDING]'}
             </span>
          </h2>

          <button 
            className="space-btn cosmic-btn font-tech" 
            onClick={() => setShowChronicle(true)}
            style={{ padding: '0.5rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
          >
             항해 일지 열기
          </button>
        </div>
      </div>

      {/* Warp Gate Docking Section */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '1rem', flexShrink: 0 }}>
        <WarpGateDocking 
          clusterData={clusterData} 
          user={user} 
          attendanceMutation={attendanceMutation}
          todayAttendance={attendanceRecords?.find(a => a.date === getTodayKST())}
        />
      </div>

      {/* Scrollable Content Container */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        overflowX: 'hidden',
        width: '100%',
        padding: '2rem 5% 6rem 5%',
        boxSizing: 'border-box'
      }}>
        <div style={{ 
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '2rem',
          alignItems: 'flex-start'
        }}>
        {/* Left: Interactive Calendar */}
        <div className="glass-card hud-border" style={{ 
          flex: '1 1 500px', // Min width 500px, but grow
          padding: '2rem', 
          display: 'flex', 
          flexDirection: 'column',
          minHeight: '600px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h3 className="font-title" style={{ color: 'var(--text-bright)', margin: 0 }}>
              과제 전송 달력
            </h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button onClick={handlePrevMonth} className="cosmic-btn" style={{ padding: '0.5rem 1rem' }}>◀</button>
              <span className="font-tech" style={{ fontSize: '1.2rem', color: 'var(--crystal-cyan)' }}>
                {currentDate.getFullYear()} . {String(currentDate.getMonth() + 1).padStart(2, '0')}
              </span>
              <button onClick={handleNextMonth} className="cosmic-btn" style={{ padding: '0.5rem 1rem' }}>▶</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1rem', flex: 1 }}>
            {/* Days of week */}
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
              <div key={day} className="font-tech" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                {day}
              </div>
            ))}
            
            {/* Calendar Grid */}
            {isLoading ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--crystal-cyan)', padding: '2rem' }}>
                데이터 수신 중 (SCANNING DATA)...
              </div>
            ) : calendarDays.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} />;
              
              const isSelected = selectedDateStr === day.dateStr;
              const hasAssignment = !!day.assignment;
              const statusColor = getStatusColor(day.assignment?.status);
              
              // Determine animation based on status
              let animationClass = '';
              if (day.assignment?.status === 'needs_revision') animationClass = 'siren-pulse'; // Need to add to space-theme.css
              else if (day.assignment?.status === 'submitted') animationClass = 'pulse-slow';
              
              const isToday = day.dateStr === getTodayKST();

              return (
                <motion.div
                  key={day.dateStr}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setSelectedDateStr(day.dateStr)}
                  className={`glass-card ${animationClass} ${isToday ? 'today-highlight' : ''}`}
                  style={{
                    aspectRatio: '1/1',
                    padding: '0.5rem',
                    cursor: 'pointer',
                    border: isSelected ? `2px solid var(--crystal-cyan)` : `1px solid rgba(255,255,255,0.1)`,
                    background: isSelected ? 'rgba(0, 212, 255, 0.1)' : 'rgba(5, 10, 25, 0.4)',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <span className="font-tech" style={{ color: 'var(--text-muted)' }}>{day.dayNumber}</span>
                  
                  {/* Attendance Marker - Move to bottom right to avoid overlap with TODAY label */}
                  {day.attendance && (
                    <div style={{ position: 'absolute', bottom: '5px', right: '5px', fontSize: '1rem', zIndex: 1, filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.5))' }}>
                      {day.attendance.status === 'late' ? '⚠️' : '✅'}
                    </div>
                  )}

                  {isToday && <div className="today-label">TODAY</div>}
                  
                  {hasAssignment && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                      <div style={{ 
                        width: '12px', height: '12px', 
                        borderRadius: '50%', 
                        background: statusColor,
                        boxShadow: `0 0 10px ${statusColor}`
                      }} />
                      <span className="font-tech" style={{ fontSize: '0.6rem', marginTop: '4px', color: statusColor, textAlign: 'center' }}>
                        {getStatusLabel(day.assignment.status)}
                      </span>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Right: Submission/Detail Panel */}
        <div className="glass-card hud-border" style={{ 
          flex: '1 1 500px', 
          padding: '2rem', 
          display: 'flex', 
          flexDirection: 'column',
          minHeight: '600px',
          minWidth: 0 // Prevent expansion by long content
        }}>
          {!selectedDateStr ? (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', color: 'var(--text-muted)', padding: '2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📡</div>
              <p className="font-tech" style={{ textAlign: 'center' }}>달력에서 날짜를 선택하여 탐사 보고서를 전송하세요.</p>
            </div>
          ) : (
            <SubmissionPanel 
              key={selectedDateStr}
              clusterId={clusterId}
              regionId={regionId}
              dateStr={selectedDateStr}
              assignment={assignments?.find(a => a.date === selectedDateStr)} 
              user={user}
              submitMutation={submitMutation}
              onCancel={() => setSelectedDateStr(null)}
            />
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Warp Gate Docking Button (Attendance)
 */
function WarpGateDocking({ clusterData, user, attendanceMutation, todayAttendance }) {
  const [status, setStatus] = useState({ state: 'invalid', message: '', countdown: null });

  useEffect(() => {
    if (todayAttendance) {
      setStatus({ 
        state: 'completed', 
        message: `도킹 완료 (${todayAttendance.status === 'late' ? '지각' : '정상'})` 
      });
      return;
    }
    
    if (!clusterData?.classSchedule) return;

    const timer = setInterval(() => {
      const now = getNowKST();
      const currentDay = now.getDay();
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      const currentTimeInMins = currentHour * 60 + currentMin;

      // Find matching schedule for today
      const todaySchedule = clusterData.classSchedule.find(s => 
        (s.days && s.days.includes(currentDay)) || s.day === currentDay
      );

      if (!todaySchedule) {
        setStatus({ state: 'invalid', message: '오늘은 수업이 없습니다.' });
        return;
      }

      const [startHour, startMin] = todaySchedule.startTime.split(':').map(Number);
      const [endHour, endMin] = todaySchedule.endTime.split(':').map(Number);
      
      const startTimeInMins = startHour * 60 + startMin;
      const endTimeInMins = endHour * 60 + endMin;
      const dockingOpenTimeInMins = startTimeInMins - 10;
      const onTimeGraceMins = startTimeInMins + 5; // User requested 5 minutes

      if (currentTimeInMins < dockingOpenTimeInMins) {
        setStatus({ state: 'invalid', message: `수업 시작 10분 전부터 도킹이 가능합니다. (${todaySchedule.startTime})` });
      } else if (currentTimeInMins >= dockingOpenTimeInMins && currentTimeInMins < startTimeInMins) {
        setStatus({ state: 'open', message: '탐사선 도킹 승인' });
      } else if (currentTimeInMins >= startTimeInMins && currentTimeInMins <= onTimeGraceMins) {
        // Calculate countdown for "on-time" docking
        const currentSecs = now.getSeconds();
        const totalClosingSecs = (onTimeGraceMins * 60) - (currentHour * 3600 + currentMin * 60 + currentSecs);
        const mins = Math.floor(totalClosingSecs / 60);
        const secs = totalClosingSecs % 60;
        setStatus({ 
          state: 'closing', 
          message: `도킹 마감 임박 - ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}` 
        });
      } else if (currentTimeInMins > onTimeGraceMins && currentTimeInMins <= endTimeInMins) {
        setStatus({ state: 'late', message: '게이트 폐쇄 (지각 도킹)' });
      } else {
        setStatus({ state: 'invalid', message: '오늘 수업이 종료되었습니다.' });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [clusterData, todayAttendance]);

  const handleDocking = async () => {
    if (status.state === 'invalid') return;
    
    try {
      await attendanceMutation.mutateAsync({
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0],
        clusterId: clusterData.id,
        clusterName: clusterData.name,
        date: getTodayKST(),
        timestamp: new Date(),
        status: status.state === 'late' ? 'late' : 'present'
      });
      alert(status.state === 'late' ? '지각 도킹되었습니다. 다음에는 서둘러주세요!' : '정상적으로 도킹(출석)되었습니다. 즐거운 탐험 되세요!');
    } catch (err) {
      console.error('Docking failed:', err);
      alert('도킹 시스템 오류가 발생했습니다.');
    }
  };

  if (status.state === 'invalid') {
    return (
      <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '20px' }}>
        📡 {status.message}
      </div>
    );
  }

  if (status.state === 'completed') {
    return (
      <div className="font-tech" style={{ 
        padding: '0.8rem 2rem', 
        fontSize: '1.1rem', 
        borderColor: 'var(--crystal-cyan)',
        color: 'var(--crystal-cyan)',
        boxShadow: `0 0 15px var(--crystal-cyan)`,
        background: 'rgba(0, 212, 255, 0.1)',
        fontWeight: 'bold',
        borderRadius: '4px',
        border: '1px solid var(--crystal-cyan)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        ✨ {status.message}
      </div>
    );
  }

  let btnColor = 'var(--neon-blue)';
  if (status.state === 'closing') btnColor = 'var(--planet-orange)';
  if (status.state === 'late') btnColor = '#ff4500';

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleDocking}
      className="space-btn cosmic-btn font-tech"
      style={{ 
        padding: '0.8rem 2rem', 
        fontSize: '1.1rem', 
        borderColor: btnColor,
        color: btnColor,
        boxShadow: `0 0 15px ${btnColor}`,
        background: 'rgba(0,0,0,0.4)',
        fontWeight: 'bold'
      }}
    >
      🚀 {status.message}
    </motion.button>
  );
}

// Detailed Submission Panel
function SubmissionPanel({ clusterId, regionId, dateStr, assignment, user, submitMutation, onCancel }) {
  const [content, setContent] = useState(assignment?.content || '');
  const [links, setLinks] = useState(assignment?.links || []);
  const [newLink, setNewLink] = useState('');
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({}); // { fileName: percentage }
  const [existingAttachments, setExistingAttachments] = useState(assignment?.attachments || []);
  const [attachmentMode, setAttachmentMode] = useState(null); // 'link' or 'file' or null
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  // Status check
  const isReviewed = assignment?.status === 'reviewed';
  const isNeedsRevision = assignment?.status === 'needs_revision';
  const isSubmitted = assignment?.status === 'submitted';

  // Window check: Today and previous 6 days (total 7 days)
  const isWithinWindow = useMemo(() => {
    const today = new Date(getTodayKST() + 'T00:00:00Z');
    const selected = new Date(dateStr + 'T00:00:00Z');
    const diffTime = today - selected;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 6;
  }, [dateStr]);

  const canSubmit = isWithinWindow || isNeedsRevision; 
  // If it needs revision, we allow submission even if window passed? 
  // User said "제출할 수 있도록", usually implies new work. 
  // But let's follow the strict window for now as "Too past is not right".
  // Actually, if it's already 'needs_revision', it's better to allow the student to fix it.
  // But the user's request sounds like a rule for the "Target Date".
  // "너무 과거 날짜에 과제를 제출하는 것도 맞지 않아요." -> The target date of the assignment.
  // So even if it needs revision, if it's too old, they shouldn't be able to?
  // Let's stick to the window rule for ALL submissions/edits to be safe and simple.

  const handleAddLink = (e) => {
    if (e) e.preventDefault();
    if (!newLink.trim()) return;
    setLinks([...links, { url: newLink.trim(), title: newLink.trim(), image: '' }]);
    setNewLink('');
  };

  const handleRemoveLink = (index) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles = selectedFiles.filter(file => {
        if (file.size > MAX_FILE_SIZE) {
          alert(`${file.name} 파일이 너무 큽니다 (최대 50MB).`);
          return false;
        }
        return true;
      });
      setFiles([...files, ...validFiles]);
    }
  };

  const handleRemoveNewFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleRemoveExistingAttachment = (index) => {
    setExistingAttachments(existingAttachments.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (content.trim().length < 10) {
      alert("최소 10자 이상의 탐사 보고서를 작성해야 합니다.");
      return;
    }

    setIsSubmitting(true);

    // Normalize clusterId before submission
    let normalizedClusterId = clusterId;
    if (clusterId === '초등수학' || clusterId === 'cluster_elementary') normalizedClusterId = 'cluster_elementary';
    else if (clusterId === '파이썬' || clusterId === 'python') normalizedClusterId = 'python';
    else if (clusterId === '중등수학' || clusterId === 'middle-math') normalizedClusterId = 'middle-math';
    else if (clusterId === '서양고전' || clusterId === 'western-classic') normalizedClusterId = 'western-classic';

    console.log(`[DEBUG] Submitting assignment. Original clusterId: ${clusterId}, Normalized: ${normalizedClusterId}`);

    if (!normalizedClusterId) {
      alert("군집(Cluster) 정보가 유실되었습니다. 화면을 새로고침한 후 다시 시도해주세요.");
      return;
    }

    try {
      // 1. Upload new files to Firebase Storage with Progress
      const uploadedAttachments = [];
      setUploadProgress({});

      const uploadPromises = files.map(file => {
        return new Promise((resolve, reject) => {
          const storagePath = `assignments/${user.uid}/${Date.now()}_${file.name}`;
          const fileRef = ref(storage, storagePath);
          const uploadTask = uploadBytesResumable(fileRef, file);

          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(prev => ({ ...prev, [file.name]: Math.round(progress) }));
            }, 
            (error) => {
              console.error(`Upload error for ${file.name}:`, error);
              reject(error);
            }, 
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              uploadedAttachments.push({
                name: file.name,
                url: downloadURL,
                type: file.name.split('.').pop(),
                storagePath 
              });
              resolve();
            }
          );
        });
      });

      await Promise.all(uploadPromises);

      const finalAttachments = [...existingAttachments, ...uploadedAttachments];

      // Cache Colab Notebook data if a Colab link exists
      let notebookData = null;
      const colabLink = links.find(l => l.url.includes('colab.research.google.com') || (l.url.includes('drive.google.com') && l.url.includes('.ipynb')));
      
      if (colabLink) {
        try {
          const functionUrl = `https://us-central1-math-sense-1f6a8.cloudfunctions.net/fetchNotebook`;
          const response = await fetch(functionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: colabLink.url }),
          });
          const data = await response.json();
          if (!data.error) {
            notebookData = data;
          }
        } catch (e) {
          console.warn("Failed to pre-cache notebook data:", e);
        }
      }

      await submitMutation.mutateAsync({
        docId: assignment?.id,
        assignmentData: {
          userId: user.uid,
          userName: user.displayName || user.email?.split('@')[0] || 'Unknown Explorer',
          clusterId: normalizedClusterId,
          regionId: regionId || null,
          date: dateStr,
          content,
          links,
          attachments: finalAttachments,
          notebookData,
          status: 'submitted',
          revisionCount: (assignment?.revisionCount || 0) + (isNeedsRevision ? 1 : 0)
        }
      });
      // Clear after submit 
      setFiles([]);
      setUploadProgress({});
      onCancel(); // close panel
    } catch (error) {
      console.error("Submission failed:", error);
      alert("보고서 전송에 실패했습니다.");
      setIsSubmitting(false); // only reset on fail so double clicks are prevented if closing
    } 
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--neon-blue)', paddingBottom: '1rem' }}>
        <h3 className="font-title" style={{ margin: 0, color: 'var(--text-bright)' }}>탐사 보고서 전송망</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {isNeedsRevision && <span className="siren-pulse font-tech" style={{ color: '#ff4500', fontWeight: 'bold' }}>⚠️ 재검토 요망</span>}
          {isSubmitted && <span className="pulse-slow font-tech" style={{ color: 'var(--star-gold)' }}>대기중</span>}
          <span className="font-tech" style={{ color: 'var(--crystal-cyan)', fontSize: '1.2rem' }}>{dateStr}</span>
        </div>
      </div>
      
      {/* Feedback Section (if reviewed or needs revision) */}
      {assignment?.feedback && (
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderLeft: `4px solid ${isNeedsRevision ? '#ff4500' : 'var(--crystal-cyan)'}`, background: 'rgba(0,0,0,0.4)' }}>
          <p className="font-tech" style={{ fontSize: '0.9rem', color: isNeedsRevision ? '#ff4500' : 'var(--crystal-cyan)', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📡사령부 회신 (COMMAND FEEDBACK)</span>
          </p>
          <div style={{ color: 'var(--text-bright)', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
            {assignment.feedback}
          </div>
        </div>
      )}

      {/* Submission Form */}
      {isReviewed ? (
        <div style={{ flex: 1, color: 'var(--text-muted)' }}>
          <p>이 보고서는 사령부 확인이 완료되어 더 이상 수정할 수 없습니다.</p>
          <div className="glass-card" style={{ marginTop: '2rem', padding: '1.5rem', opacity: 0.8 }}>
             <h4 style={{ color: 'var(--text-bright)', marginBottom: '1rem' }}>제출된 기록</h4>
             <div style={{ whiteSpace: 'pre-wrap', fontSize: '1rem', lineHeight: '1.6', color: 'var(--text-muted)' }}>{assignment.content}</div>
             
             {assignment.attachments?.length > 0 && (
               <div style={{ marginTop: '1.5rem' }}>
                 <p className="font-tech" style={{ color: 'var(--crystal-cyan)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>첨부 파일</p>
                 {assignment.attachments.map((att, i) => (
                   <a key={i} href={att.url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', padding: '0.5rem', borderRadius: '4px', color: 'white', marginRight: '0.5rem', marginBottom: '0.5rem', textDecoration: 'none' }}>
                     📄 {att.name}
                   </a>
                 ))}
               </div>
             )}

             {assignment.links?.length > 0 && (
               <div style={{ marginTop: '1rem' }}>
                 <p className="font-tech" style={{ color: 'var(--crystal-cyan)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>첨부 링크</p>
                 {assignment.links.map((lnk, i) => (
                   <a key={i} href={lnk.url} target="_blank" rel="noreferrer" style={{ display: 'block', color: 'var(--neon-blue)', textDecoration: 'underline', marginBottom: '0.3rem' }}>{lnk.url}</a>
                 ))}
               </div>
             )}
          </div>
        </div>
      ) : !isWithinWindow ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <p className="font-tech">
            {new Date(dateStr) > new Date(getTodayKST()) 
              ? "미래의 날짜에는 보고서를 전송할 수 없습니다." 
              : "과거 7일(오늘 포함) 이내의 날짜에만 보고서를 전송할 수 있습니다."}
          </p>
          <div className="glass-card" style={{ marginTop: '2rem', padding: '1.5rem', opacity: 0.6, width: '100%' }}>
             <h4 style={{ color: 'var(--text-bright)', marginBottom: '1rem' }}>제출된 기록</h4>
             <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', lineHeight: '1.6' }}>
               {assignment ? assignment.content : "제출된 기록이 없습니다."}
             </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          <label className="font-tech" style={{ color: 'var(--crystal-cyan)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>오늘 한 내용 정리 (필수)</label>
          <textarea 
            className="space-input" 
            placeholder="오늘 제출할 과제의 요점을 정리해 보세요. 나의 언어로 정리하는 순간, 지식은 온전히 내 것이 됩니다! (최소 10자)" 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ 
              minHeight: '120px', // Reduced from 200px
              maxHeight: '250px',
              marginBottom: '1rem', 
              padding: '0.8rem', 
              lineHeight: '1.4',
              fontSize: '0.95rem'
            }}
          />

          {/* Attachment Summary (Always visible if data exists) */}
          {(links.length > 0 || existingAttachments.length > 0 || files.length > 0) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem', padding: '1rem', background: 'rgba(0, 212, 255, 0.05)', borderRadius: '8px' }}>
              <p className="font-tech" style={{ color: 'var(--star-gold)', fontSize: '0.75rem', width: '100%', marginBottom: '0.4rem', marginTop: 0 }}>첨부된 항목 ({links.length + existingAttachments.length + files.length})</p>
              {links.map((link, idx) => (
                <div key={`link-${idx}`} style={{ display: 'flex', alignItems: 'center', background: 'rgba(0, 212, 255, 0.15)', padding: '0.3rem 0.6rem', borderRadius: '4px', maxWidth: '200px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--neon-blue)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🔗 {link.url}</span>
                  <button type="button" onClick={() => handleRemoveLink(idx)} style={{ background: 'none', border: 'none', color: '#ff4500', cursor: 'pointer', marginLeft: '0.3rem' }}>✕</button>
                </div>
              ))}
              {existingAttachments.map((att, idx) => (
                <div key={`old-${idx}`} style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.1)', padding: '0.3rem 0.6rem', borderRadius: '4px', maxWidth: '200px' }}>
                  <span style={{ color: 'white', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📄 {att.name}</span>
                  <button type="button" onClick={() => handleRemoveExistingAttachment(idx)} style={{ background: 'none', border: 'none', color: '#ff4500', cursor: 'pointer', marginLeft: '0.3rem' }}>✕</button>
                </div>
              ))}
              {files.map((file, idx) => (
                <div key={`new-${idx}`} style={{ display: 'flex', alignItems: 'center', background: 'rgba(50, 255, 120, 0.15)', padding: '0.3rem 0.6rem', borderRadius: '4px', maxWidth: '200px', position: 'relative' }}>
                  <span style={{ color: '#50c878', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', zIndex: 1 }}>📁 {file.name}</span>
                  {uploadProgress[file.name] !== undefined && (
                    <div style={{ 
                      position: 'absolute', left: 0, bottom: 0, 
                      height: '3px', background: 'var(--crystal-cyan)', 
                      width: `${uploadProgress[file.name]}%`,
                      transition: 'width 0.3s ease'
                    }} />
                  )}
                  {uploadProgress[file.name] !== undefined && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--crystal-cyan)', marginLeft: '4px', zIndex: 1, fontWeight: 'bold' }}>
                      {uploadProgress[file.name]}%
                    </span>
                  )}
                  <button type="button" onClick={() => handleRemoveNewFile(idx)} style={{ background: 'none', border: 'none', color: '#ff4500', cursor: 'pointer', marginLeft: '0.3rem', zIndex: 1 }}>✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Attachment Type Selector */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button 
              type="button" 
              className={`space-btn ${attachmentMode === 'link' ? 'active' : ''}`}
              onClick={() => setAttachmentMode(attachmentMode === 'link' ? null : 'link')}
              style={{ flex: 1, fontSize: '0.8rem', padding: '0.6rem', background: attachmentMode === 'link' ? 'rgba(0, 243, 255, 0.2)' : '' }}
            >
              🔗 링크 추가
            </button>
            <button 
              type="button" 
              className={`space-btn ${attachmentMode === 'file' ? 'active' : ''}`}
              onClick={() => {
                setAttachmentMode(attachmentMode === 'file' ? null : 'file');
                if (attachmentMode !== 'file') {
                   // Optional: auto-trigger file pick
                   // fileInputRef.current?.click(); 
                }
              }}
              style={{ flex: 1, fontSize: '0.8rem', padding: '0.6rem', background: attachmentMode === 'file' ? 'rgba(0, 243, 255, 0.2)' : '' }}
            >
              📁 파일 추가
            </button>
          </div>

          {/* Dynamic Input Area */}
          <AnimatePresence mode="wait">
            {attachmentMode === 'link' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden', marginBottom: '1rem' }}
              >
                <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(0, 243, 255, 0.2)' }}>
                  <input 
                    type="text" 
                    className="space-input" 
                    placeholder="https://colab.research.google.com/..." 
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddLink(); }}
                    style={{ flex: 1, fontSize: '0.85rem' }}
                  />
                  <button type="button" className="space-btn cosmic-btn" onClick={handleAddLink} disabled={isSubmitting || !newLink.trim()} style={{ padding: '0.4rem 1rem' }}>
                    추가
                  </button>
                </div>
              </motion.div>
            )}

            {attachmentMode === 'file' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden', marginBottom: '1rem' }}
              >
                <input 
                  type="file" 
                  multiple 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handleFileSelect}
                />
                <div 
                  className={`glass-card ${isDragging ? 'dragging' : ''}`}
                  style={{ 
                    padding: '1.5rem 1rem', 
                    textAlign: 'center', 
                    borderStyle: 'dashed', 
                    cursor: 'pointer',
                    background: isDragging ? 'rgba(0, 243, 255, 0.1)' : 'rgba(0, 150, 255, 0.05)',
                    borderColor: isDragging ? 'var(--crystal-cyan)' : 'var(--neon-blue)',
                    transition: 'all 0.2s ease',
                    borderWidth: '2px'
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const droppedFiles = Array.from(e.dataTransfer.files).filter(file => {
                      if (file.size > MAX_FILE_SIZE) {
                        alert(`${file.name} 파일이 너무 큽니다 (최대 50MB).`);
                        return false;
                      }
                      return true;
                    });
                    if (droppedFiles.length > 0) {
                      setFiles(prev => [...prev, ...droppedFiles]);
                    }
                  }}
                >
                  <p className="font-tech" style={{ color: isDragging ? 'white' : 'var(--crystal-cyan)', margin: 0, fontSize: '0.85rem' }}>
                    {isDragging ? '🚀 파일을 여기에 놓으세요!' : '내 PC에서 파일 선택하거나 파일을 여기로 드래그하세요.'}
                  </p>
                  {!isDragging && <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.5rem' }}>(IMAGE, PDF, MD, PY...)</p>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="space-btn" onClick={onCancel} disabled={isSubmitting}>취소</button>
            <button 
              className="space-btn cosmic-btn" 
              onClick={handleSubmit}
              disabled={isSubmitting || content.trim().length < 10}
              style={{ minWidth: '140px' }}
            >
              {isSubmitting ? '전송 중...' : (assignment ? '수정 후 전송' : '전송 (TRANSMIT)')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
