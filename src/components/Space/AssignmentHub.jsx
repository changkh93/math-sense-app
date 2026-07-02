import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../../hooks/useAuth';
import {
  useApplyMissingAssignmentPenalties,
  useRecordAttendance,
  useStudentAssignments,
  useStudentAssignmentWarnings,
  useStudentAttendance,
  useSubmitAssignment,
  useSubmitFeedbackResponse,
  useSubmitWarningAppeal,
} from '../../hooks/useAssignments';
import {
  useAssignmentShareCooldown,
  useAssignmentShareMutations
} from '../../hooks/useAssignmentShares';
import { useClusters } from '../../hooks/useContent';
import { storage, getFunctionUrl } from '../../firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import AssignmentChronicle from './AssignmentChronicle';
import AssignmentShareModal from '../Community/AssignmentShareModal';
import WarpGateDocking from './WarpGateDocking';
import '../../styles/space-theme.css'; // Assuming we re-use our cosmic buttons and glass cards
import { getTodayKST } from '../../utils/streakUtils';
import { formatFeedbackForDisplay } from '../../utils/feedbackFormatting';

const MotionDiv = motion.div;
const ASSIGNMENT_MISSING_GRACE_MS = 12 * 60 * 60 * 1000;
const WARNING_POLICY_MESSAGE = '경고 3회 누적 시 수강료가 10% 인상될 수 있습니다.';
const ACTIVE_WARNING_STATUSES = ['active', 'appealed'];
const ASSIGNMENT_DRAFT_STORAGE_PREFIX = 'metasense.assignmentDraft.v1';
const UNSENT_ASSIGNMENT_DRAFT_MESSAGE = '전송하지 않은 과제 글이 있습니다. 이동하면 일부 변경사항이 저장되지 않을 수 있습니다.';
const ASSIGNMENT_DRAFT_FILE_DB_NAME = 'metasense-assignment-drafts';
const ASSIGNMENT_DRAFT_FILE_DB_VERSION = 1;
const ASSIGNMENT_DRAFT_FILE_STORE = 'files';

const isDateKey = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));

const getAssignmentDraftStorageKey = ({ userId, clusterId, dateStr }) => {
  if (!userId || !dateStr) return '';
  return `${ASSIGNMENT_DRAFT_STORAGE_PREFIX}:${userId}:${clusterId || 'unknown'}:${dateStr}`;
};

const safeReadAssignmentDraft = (storageKey) => {
  if (!storageKey || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Failed to read assignment draft:', error);
    return null;
  }
};

const safeWriteAssignmentDraft = (storageKey, payload) => {
  if (!storageKey || typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.warn('Failed to save assignment draft:', error);
    return false;
  }
};

const safeRemoveAssignmentDraft = (storageKey) => {
  if (!storageKey || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey);
  } catch (error) {
    console.warn('Failed to remove assignment draft:', error);
  }
};

const openAssignmentDraftFileDb = () => {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB is not available.'));
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(ASSIGNMENT_DRAFT_FILE_DB_NAME, ASSIGNMENT_DRAFT_FILE_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ASSIGNMENT_DRAFT_FILE_STORE)) {
        db.createObjectStore(ASSIGNMENT_DRAFT_FILE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const safeReadAssignmentDraftFiles = async (storageKey) => {
  if (!storageKey) return [];
  let db;
  try {
    db = await openAssignmentDraftFileDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(ASSIGNMENT_DRAFT_FILE_STORE, 'readonly');
      const request = tx.objectStore(ASSIGNMENT_DRAFT_FILE_STORE).get(storageKey);
      request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('Failed to read assignment draft files:', error);
    return [];
  } finally {
    db?.close();
  }
};

const safeWriteAssignmentDraftFiles = async (storageKey, files = []) => {
  if (!storageKey) return false;
  let db;
  try {
    db = await openAssignmentDraftFileDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(ASSIGNMENT_DRAFT_FILE_STORE, 'readwrite');
      const request = tx.objectStore(ASSIGNMENT_DRAFT_FILE_STORE).put(files, storageKey);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    return true;
  } catch (error) {
    console.warn('Failed to save assignment draft files:', error);
    return false;
  } finally {
    db?.close();
  }
};

const safeRemoveAssignmentDraftFiles = async (storageKey) => {
  if (!storageKey) return;
  let db;
  try {
    db = await openAssignmentDraftFileDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(ASSIGNMENT_DRAFT_FILE_STORE, 'readwrite');
      const request = tx.objectStore(ASSIGNMENT_DRAFT_FILE_STORE).delete(storageKey);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('Failed to remove assignment draft files:', error);
  } finally {
    db?.close();
  }
};

const hasDraftPayload = (draft = {}) => (
  Boolean(String(draft.content || '').trim()) ||
  Boolean(String(draft.newLink || '').trim()) ||
  Boolean((draft.links || []).length) ||
  Boolean((draft.existingAttachments || []).length)
);

const areDraftListsEqual = (left = [], right = []) => (
  JSON.stringify(left || []) === JSON.stringify(right || [])
);

const hasDraftChangedFromAssignment = (draft = {}, assignment = null) => {
  if (!hasDraftPayload(draft)) return false;
  if (!assignment) return true;
  return (
    String(draft.content || '') !== String(assignment.content || '') ||
    Boolean(String(draft.newLink || '').trim()) ||
    !areDraftListsEqual(draft.links || [], assignment.links || []) ||
    !areDraftListsEqual(draft.existingAttachments || [], assignment.attachments || [])
  );
};

const formatDraftSavedAt = (timestamp) => {
  if (!timestamp) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(timestamp));
};

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

const getAssignmentMissingPenaltyMap = (assignments = [], attendanceRecords = [], nowMs = 0) => {
  const assignmentDates = new Set(
    assignments
      .filter(a => ['submitted', 'reviewed', 'needs_revision'].includes(a.status))
      .map(a => a.date)
      .filter(Boolean)
  );

  const result = {};
  let missingStreak = 0;

  [...attendanceRecords]
    .filter(a => a.date)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .forEach((attendance) => {
      if (assignmentDates.has(attendance.date)) {
        missingStreak = 0;
        return;
      }

      missingStreak += 1;
      const baseMs = getAttendanceBaseMs(attendance);
      const matured = !!baseMs && nowMs > 0 && nowMs - baseMs >= ASSIGNMENT_MISSING_GRACE_MS;
      const penalty = 15 + Math.max(0, missingStreak - 1) * 5;
      result[attendance.date] = {
        matured,
        missingStreak,
        penalty,
        baseMs
      };
    });

  return result;
};

/**
 * Assignment Hub (Stellar Archive)
 * The main interface for students to view their assignments map (calendar) and submit work.
 */
export default function AssignmentHub({ clusterId, regionId, initialDateStr, onClose, onNavigateToUnit }) {
  const { user, userData } = useAuth();
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const normalizedInitialDateStr = isDateKey(initialDateStr) ? initialDateStr : null;
  const [todayKST, setTodayKST] = useState(() => getTodayKST());
  const [currentDate, setCurrentDate] = useState(() => new Date(`${normalizedInitialDateStr || getTodayKST()}T12:00:00Z`));
  const [selectedDateStr, setSelectedDateStr] = useState(normalizedInitialDateStr); // The date the user clicked on
  const [showChronicle, setShowChronicle] = useState(false);
  const [penaltyCheckNow, setPenaltyCheckNow] = useState(0);
  const [optimisticAssignmentsByDate, setOptimisticAssignmentsByDate] = useState({});
  const [submissionNotice, setSubmissionNotice] = useState(null);
  const unsentDraftRef = useRef({ dirty: false });
  const previousTodayRef = useRef(todayKST);
  const penaltySweepKeyRef = useRef('');

  // Keep the archive aligned with the Korean teaching day, even across midnight.
  useEffect(() => {
    const syncToday = () => setTodayKST(getTodayKST());
    syncToday();
    const timer = setInterval(syncToday, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const syncPenaltyClock = () => setPenaltyCheckNow(Date.now());
    syncPenaltyClock();
    const timer = setInterval(syncPenaltyClock, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!unsentDraftRef.current?.dirty) return;
      event.preventDefault();
      event.returnValue = UNSENT_ASSIGNMENT_DRAFT_MESSAGE;
      return UNSENT_ASSIGNMENT_DRAFT_MESSAGE;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleDraftStateChange = useCallback((draftState) => {
    unsentDraftRef.current = draftState || { dirty: false };
  }, []);

  const confirmDraftNavigation = useCallback(() => {
    if (!unsentDraftRef.current?.dirty) return true;
    const hasFiles = unsentDraftRef.current?.hasFiles;
    const message = hasFiles
      ? '전송하지 않은 과제 글이 있습니다. 글과 링크는 임시저장되지만, 새로 선택한 파일은 다시 선택해야 합니다. 계속 이동할까요?'
      : '전송하지 않은 과제 글이 임시저장되어 있습니다. 계속 이동할까요?';
    return window.confirm(message);
  }, []);

  const handleCloseArchive = useCallback(() => {
    if (confirmDraftNavigation()) onClose?.();
  }, [confirmDraftNavigation, onClose]);

  // Auto-select today's KST date when entering the archive.
  useEffect(() => {
    const previousToday = previousTodayRef.current;
    previousTodayRef.current = todayKST;
    setSelectedDateStr(prev => {
      const shouldFollowToday = !prev || prev === previousToday;
      if (shouldFollowToday) {
        setCurrentDate(new Date(`${todayKST}T12:00:00Z`));
        return todayKST;
      }
      return prev;
    });
  }, [todayKST]);

  useEffect(() => {
    if (!normalizedInitialDateStr) return;
    setSelectedDateStr(normalizedInitialDateStr);
    setCurrentDate(new Date(`${normalizedInitialDateStr}T12:00:00Z`));
  }, [normalizedInitialDateStr]);
  
  // Data Fetching - Fetch cluster-wide assignments (ignore regionId)
  const { data: assignments, isLoading } = useStudentAssignments(user?.uid, clusterId);
  const { data: attendanceRecords } = useStudentAttendance(user?.uid, clusterId);
  const { data: assignmentWarnings = [] } = useStudentAssignmentWarnings(user?.uid, clusterId);
  const { data: clusters } = useClusters();
  const submitMutation = useSubmitAssignment();
  const attendanceMutation = useRecordAttendance();
  const penaltyMutation = useApplyMissingAssignmentPenalties();

  useEffect(() => {
    if (!assignments?.length) return;
    setOptimisticAssignmentsByDate(prev => {
      const next = { ...prev };
      let changed = false;

      Object.keys(next).forEach(dateStr => {
        const optimisticAssignment = next[dateStr];
        const serverAssignment = assignments.find(item => (
          item.date === dateStr &&
          (!optimisticAssignment.id || item.id === optimisticAssignment.id)
        ));

        if (serverAssignment) {
          delete next[dateStr];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [assignments]);

  const effectiveAssignments = useMemo(() => {
    const byDate = new Map();
    (assignments || []).forEach(item => {
      if (item.date) byDate.set(item.date, item);
    });
    Object.entries(optimisticAssignmentsByDate).forEach(([dateStr, item]) => {
      byDate.set(dateStr, item);
    });
    return Array.from(byDate.values());
  }, [assignments, optimisticAssignmentsByDate]);

  useEffect(() => {
    if (!user?.uid || !clusterId) return;

    const sweepKey = `${user.uid}:${clusterId}:${todayKST}`;
    if (penaltySweepKeyRef.current === sweepKey || penaltyMutation.isPending) return;

    penaltySweepKeyRef.current = sweepKey;
    penaltyMutation.mutate(
      { userId: user.uid, clusterId },
      {
        onSuccess: (result) => {
          if (result?.applied > 0) {
            console.info('과제 미제출 서버 검토 차감 적용:', result);
          }
        },
        onError: (error) => {
          penaltySweepKeyRef.current = '';
          console.error('과제 미제출 서버 검토 실패:', error);
        }
      }
    );
  }, [user?.uid, clusterId, todayKST, penaltyMutation]);

  const clusterData = useMemo(() => {
    return clusters?.find(c => c.id === clusterId || c.docId === clusterId);
  }, [clusters, clusterId]);

  const missingPenaltyByDate = useMemo(
    () => getAssignmentMissingPenaltyMap(effectiveAssignments || [], attendanceRecords || [], penaltyCheckNow),
    [effectiveAssignments, attendanceRecords, penaltyCheckNow]
  );

  const warningsByDate = useMemo(() => {
    return (assignmentWarnings || []).reduce((acc, warning) => {
      if (!warning.date) return acc;
      if (!acc[warning.date]) acc[warning.date] = [];
      acc[warning.date].push(warning);
      return acc;
    }, {});
  }, [assignmentWarnings]);

  // Calendar Logic
  const daysInMonth = useMemo(() => {
    const year = currentDate.getUTCFullYear();
    const month = currentDate.getUTCMonth();
    return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  }, [currentDate]);

  const firstDayOfMonth = useMemo(() => {
    const year = currentDate.getUTCFullYear();
    const month = currentDate.getUTCMonth();
    return new Date(Date.UTC(year, month, 1)).getUTCDay();
  }, [currentDate]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() - 1, 1, 12)));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() + 1, 1, 12)));
  };

  const handlePrevDay = () => {
    if (!confirmDraftNavigation()) return;
    const prevDate = new Date(currentDate.getTime());
    prevDate.setUTCDate(currentDate.getUTCDate() - 1);
    setCurrentDate(prevDate);
    
    const year = prevDate.getUTCFullYear();
    const month = String(prevDate.getUTCMonth() + 1).padStart(2, '0');
    const dayStr = String(prevDate.getUTCDate()).padStart(2, '0');
    setSelectedDateStr(`${year}-${month}-${dayStr}`);
  };

  const handleNextDay = () => {
    if (!confirmDraftNavigation()) return;
    const nextDate = new Date(currentDate.getTime());
    nextDate.setUTCDate(currentDate.getUTCDate() + 1);
    setCurrentDate(nextDate);
    
    const year = nextDate.getUTCFullYear();
    const month = String(nextDate.getUTCMonth() + 1).padStart(2, '0');
    const dayStr = String(nextDate.getUTCDate()).padStart(2, '0');
    setSelectedDateStr(`${year}-${month}-${dayStr}`);
  };

  // Build weekly calendar strip array (7 days around currentDate)
  const weekDays = useMemo(() => {
    const currentDayOfWeek = currentDate.getUTCDay();
    const sunday = new Date(currentDate.getTime());
    sunday.setUTCDate(currentDate.getUTCDate() - currentDayOfWeek);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(sunday.getTime());
      day.setUTCDate(sunday.getUTCDate() + i);
      
      const year = day.getUTCFullYear();
      const month = String(day.getUTCMonth() + 1).padStart(2, '0');
      const dayStr = String(day.getUTCDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${dayStr}`;

      const assignment = effectiveAssignments?.find(a => a.date === dateStr);
      const attendance = attendanceRecords?.find(a => a.date === dateStr);
      const warningsForDay = warningsByDate[dateStr] || [];

      days.push({
        dateStr,
        dayNumber: day.getUTCDate(),
        dayOfWeek: i,
        assignment: assignment || null,
        attendance: attendance || null,
        warnings: warningsForDay
      });
    }
    return days;
  }, [currentDate, effectiveAssignments, attendanceRecords, warningsByDate]);

  // Build the calendar array
  const calendarDays = useMemo(() => {
    const days = [];
    const year = currentDate.getUTCFullYear();
    const month = String(currentDate.getUTCMonth() + 1).padStart(2, '0');

    // Padding for first week
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dayStr = String(i).padStart(2, '0');
      const dateStr = `${year}-${month}-${dayStr}`;
      
      // Find assignment for this date
      const assignment = effectiveAssignments?.find(a => a.date === dateStr);
      const attendance = attendanceRecords?.find(a => a.date === dateStr);
      
      days.push({
        dateStr,
        dayNumber: i,
        assignment: assignment || null,
        attendance: attendance || null,
        warnings: warningsByDate[dateStr] || []
      });
    }
    return days;
  }, [currentDate, firstDayOfMonth, daysInMonth, effectiveAssignments, attendanceRecords, warningsByDate]);

  const handleSubmitted = (submittedAssignment) => {
    handleDraftStateChange({ dirty: false });
    if (!submittedAssignment?.date) return;
    setOptimisticAssignmentsByDate(prev => ({
      ...prev,
      [submittedAssignment.date]: submittedAssignment
    }));
    setSelectedDateStr(submittedAssignment.date);
    setSubmissionNotice({
      date: submittedAssignment.date,
      status: submittedAssignment.status || 'submitted'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted': return '#fbbf24'; // Yellow pulse
      case 'reviewed': return '#00d4ff'; // Cyan complete
      case 'needs_revision': return '#ff4500'; // Red siren
      case 'missing': return '#64748b';
      default: return 'rgba(255, 255, 255, 0.1)'; // Not submitted
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'submitted': return '대기중';
      case 'reviewed': return '확인 완료';
      case 'needs_revision': return '재검토요망';
      case 'missing': return '누락';
      default: return '미확인';
    }
  };

  // Render the Chronicle overlay if active
  if (showChronicle) {
    return (
      <AssignmentChronicle 
        assignments={effectiveAssignments} 
        warnings={assignmentWarnings}
        onClose={() => setShowChronicle(false)} 
        onAppealRequest={(warning) => {
          setShowChronicle(false);
          if (warning?.date) setSelectedDateStr(warning.date);
        }}
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
        padding: isMobile ? '0.75rem 1rem' : '1rem 5%', 
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
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          gap: isMobile ? '0.5rem' : '2rem'
        }}>
          {isMobile ? (
            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                className="space-nav-link font-tech"
                onClick={handleCloseArchive}
                style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}
              >
                ← RETURN
              </button>
              <button 
                className="space-btn cosmic-btn font-tech" 
                onClick={() => {
                  if (confirmDraftNavigation()) setShowChronicle(true);
                }}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
              >
                 항해 일지 열기
              </button>
            </div>
          ) : (
            <button 
              className="space-nav-link font-tech"
              onClick={handleCloseArchive}
              style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
              ← RETURN
            </button>
          )}
          
          <h2 className="font-title" style={{ 
            color: 'var(--star-gold)', 
            textShadow: '0 0 10px rgba(255,215,0,0.5)', 
            margin: 0,
            fontSize: isMobile ? '1.15rem' : 'clamp(1rem, 3vw, 1.8rem)',
            textAlign: 'center',
            letterSpacing: '2px',
            flex: 1,
            width: '100%'
          }}>
             STELLAR ARCHIVE
             <span className="font-tech" style={{ fontSize: '0.75rem', opacity: 0.6, marginLeft: '0.5rem', color: 'var(--crystal-cyan)', whiteSpace: 'nowrap' }}>
               {clusterId ? `[${clusterId}]` : '[GALAXY_SCAN_PENDING]'}
             </span>
          </h2>

          {!isMobile && (
            <button 
              className="space-btn cosmic-btn font-tech" 
              onClick={() => {
                if (confirmDraftNavigation()) setShowChronicle(true);
              }}
              style={{ padding: '0.5rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
               항해 일지 열기
            </button>
          )}
        </div>
      </div>

      {/* Warp Gate Docking Section */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '1rem', flexShrink: 0 }}>
        <WarpGateDocking 
          clusterData={clusterData} 
          user={user} 
          userData={userData}
          attendanceMutation={attendanceMutation}
          todayAttendance={attendanceRecords?.find(a => a.date === todayKST)}
          todayKST={todayKST}
        />
      </div>

      {/* Scrollable Content Container */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        overflowX: 'hidden',
        width: '100%',
        padding: isMobile ? '1rem 3% 4rem 3%' : '2rem 5% 6rem 5%',
        boxSizing: 'border-box'
      }}>
        <div style={{ 
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row', 
          gap: isMobile ? '1rem' : '2rem',
          alignItems: 'flex-start'
        }}>
        {/* Left: Interactive Calendar */}
        <div style={{ flex: isMobile ? '1 1 100%' : '1 1 500px', display: 'grid', gap: '1rem', minWidth: 0, width: '100%' }}>
          <div className="glass-card hud-border" style={{ 
            padding: isMobile ? '1rem' : '2rem', 
            display: 'flex', 
            flexDirection: 'column',
            minHeight: isMobile ? 'auto' : '600px'
          }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between', 
            alignItems: isMobile ? 'stretch' : 'center', 
            gap: '1rem',
            marginBottom: isMobile ? '1rem' : '2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <h3 className="font-title" style={{ color: 'var(--text-bright)', margin: 0, fontSize: isMobile ? '1.1rem' : '1.3rem' }}>
                과제 전송 달력
              </h3>
              {isMobile && (
                <button 
                  className="space-btn font-tech" 
                  onClick={() => setIsCalendarExpanded(!isCalendarExpanded)}
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderColor: 'var(--crystal-cyan)', color: 'var(--crystal-cyan)', borderRadius: '6px' }}
                >
                  {isCalendarExpanded ? '달력 접기 ▲' : '달력 펼치기 ▼'}
                </button>
              )}
            </div>

            {/* Date navigation controls */}
            {(!isMobile || isCalendarExpanded) ? (
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'center' }}>
                <button onClick={handlePrevMonth} className="cosmic-btn" style={{ padding: '0.5rem 1rem' }}>◀</button>
                <span className="font-tech" style={{ fontSize: '1.2rem', color: 'var(--crystal-cyan)' }}>
                  {currentDate.getUTCFullYear()} . {String(currentDate.getUTCMonth() + 1).padStart(2, '0')}
                </span>
                <button onClick={handleNextMonth} className="cosmic-btn" style={{ padding: '0.5rem 1rem' }}>▶</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <button onClick={handlePrevDay} className="cosmic-btn font-tech" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>◀ 이전일</button>
                <span className="font-tech" style={{ fontSize: '1.2rem', color: 'var(--crystal-cyan)', fontWeight: 700 }}>
                  {selectedDateStr}
                </span>
                <button onClick={handleNextDay} className="cosmic-btn font-tech" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>다음일 ▶</button>
              </div>
            )}
          </div>

          {/* Grid or Single Line representation */}
          {(!isMobile || isCalendarExpanded) ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? '0.5rem' : '1rem', flex: 1 }}>
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
                const penaltyInfo = missingPenaltyByDate[day.dateStr];
                const statusColor = getStatusColor(day.assignment?.status);
                const activeDayWarnings = (day.warnings || []).filter(warning => ACTIVE_WARNING_STATUSES.includes(warning.status));
                const hasWarning = activeDayWarnings.length > 0;
                
                // Determine animation based on status
                let animationClass = '';
                if (day.assignment?.status === 'needs_revision') animationClass = 'siren-pulse';
                else if (day.assignment?.status === 'submitted') animationClass = 'pulse-slow';
                
                const isToday = day.dateStr === todayKST;

                return (
                  <MotionDiv
                    key={day.dateStr}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => {
                      if (selectedDateStr !== day.dateStr && !confirmDraftNavigation()) return;
                      setSelectedDateStr(day.dateStr);
                      setCurrentDate(new Date(`${day.dateStr}T12:00:00Z`));
                    }}
                    className={`glass-card ${animationClass} ${isToday ? 'today-highlight' : ''}`}
                    style={{
                      aspectRatio: '1/1',
                      padding: isMobile ? '0.3rem' : '0.5rem',
                      cursor: 'pointer',
                      border: isSelected ? `2px solid var(--crystal-cyan)` : `1px solid rgba(255,255,255,0.1)`,
                      background: isSelected ? 'rgba(0, 212, 255, 0.1)' : 'rgba(5, 10, 25, 0.4)',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: isMobile ? '0.7rem' : '0.85rem' }}>{day.dayNumber}</span>

                    {hasWarning && (
                      <div
                        title={activeDayWarnings.some(warning => warning.type === 'consecutive_missing_assignment') ? '연속 미제출 경고' : '과제 제출 경고'}
                        style={{
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          color: '#fbbf24',
                          fontSize: isMobile ? '0.75rem' : '0.9rem',
                          zIndex: 2,
                          filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.7))'
                        }}
                      >
                        ⚠
                      </div>
                    )}
                    
                    {day.attendance && (
                      <div style={{
                        position: 'absolute',
                        bottom: '2px',
                        right: '2px',
                        zIndex: 1,
                        width: isMobile ? '0.85rem' : '1.15rem',
                        height: isMobile ? '0.85rem' : '1.15rem',
                        borderRadius: '999px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: isMobile ? '0.65rem' : '0.95rem',
                        color: day.attendance.status === 'late' ? '#111827' : 'inherit',
                        background: day.attendance.status === 'late' ? '#ffb703' : 'transparent',
                        boxShadow: day.attendance.status === 'late' ? '0 0 10px rgba(255,183,3,0.8)' : 'none',
                        filter: day.attendance.status === 'late' ? 'none' : 'drop-shadow(0 0 5px rgba(255,255,255,0.5))'
                      }}>
                        {day.attendance.status === 'late' ? '◷' : '✓'}
                      </div>
                    )}

                    {isToday && <div className="today-label" style={{ fontSize: '0.5rem', padding: '1px 2px' }}>TODAY</div>}
                    
                    {hasAssignment && (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        <div style={{ 
                          width: isMobile ? '6px' : '12px', height: isMobile ? '6px' : '12px', 
                          borderRadius: '50%', 
                          background: statusColor,
                          boxShadow: `0 0 10px ${statusColor}`
                        }} />
                        {!isMobile && (
                          <span className="font-tech" style={{ fontSize: '0.6rem', marginTop: '4px', color: statusColor, textAlign: 'center' }}>
                            {getStatusLabel(day.assignment.status)}
                          </span>
                        )}
                      </div>
                    )}
                    {!hasAssignment && penaltyInfo?.matured && (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        <div style={{ color: hasWarning ? '#fbbf24' : '#fb7185', fontSize: isMobile ? '0.85rem' : '1.1rem', filter: `drop-shadow(0 0 6px ${hasWarning ? 'rgba(251,191,36,0.65)' : 'rgba(251,113,133,0.6)'})` }}>
                          {hasWarning ? '⚠' : '−'}
                        </div>
                      </div>
                    )}
                  </MotionDiv>
                )
              })}
            </div>
          ) : (
            /* Single-line (Weekly) Calendar Strip for Mobile */
            <div style={{ display: 'flex', gap: '0.4rem', width: '100%', boxSizing: 'border-box' }}>
              {weekDays.map((day) => {
                const isSelected = selectedDateStr === day.dateStr;
                const hasAssignment = !!day.assignment;
                const penaltyInfo = missingPenaltyByDate[day.dateStr];
                const statusColor = getStatusColor(day.assignment?.status);
                const activeDayWarnings = (day.warnings || []).filter(warning => ACTIVE_WARNING_STATUSES.includes(warning.status));
                const hasWarning = activeDayWarnings.length > 0;
                const isToday = day.dateStr === todayKST;
                const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

                return (
                  <MotionDiv
                    key={day.dateStr}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => {
                      if (selectedDateStr !== day.dateStr && !confirmDraftNavigation()) return;
                      setSelectedDateStr(day.dateStr);
                      setCurrentDate(new Date(`${day.dateStr}T12:00:00Z`));
                    }}
                    className={`glass-card ${isToday ? 'today-highlight' : ''}`}
                    style={{
                      flex: 1,
                      padding: '0.5rem 0.2rem',
                      cursor: 'pointer',
                      border: isSelected ? `2px solid var(--crystal-cyan)` : `1px solid rgba(255,255,255,0.1)`,
                      background: isSelected ? 'rgba(0, 212, 255, 0.15)' : 'rgba(5, 10, 25, 0.4)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      borderRadius: '6px',
                      minWidth: 0
                    }}
                  >
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                      {dayNames[day.dayOfWeek]}
                    </span>
                    <span className="font-tech" style={{ fontSize: '1rem', fontWeight: 700, color: isSelected ? 'var(--crystal-cyan)' : 'white' }}>
                      {day.dayNumber}
                    </span>
                    
                    <div style={{ height: '8px', display: 'flex', alignItems: 'center', marginTop: '0.2rem' }}>
                      {hasWarning && (
                        <span style={{ color: '#fbbf24', fontSize: '0.7rem' }}>⚠</span>
                      )}
                      {hasAssignment ? (
                        <div style={{ 
                          width: '6px', height: '6px', 
                          borderRadius: '50%', 
                          background: statusColor,
                          boxShadow: `0 0 6px ${statusColor}`
                        }} />
                      ) : day.attendance ? (
                        <span style={{ fontSize: '0.65rem', color: day.attendance.status === 'late' ? '#ffb703' : '#32ff78' }}>
                          {day.attendance.status === 'late' ? '◷' : '✓'}
                        </span>
                      ) : penaltyInfo?.matured ? (
                        <span style={{ color: '#fb7185', fontSize: '0.75rem' }}>−</span>
                      ) : null}
                    </div>
                  </MotionDiv>
                );
              })}
            </div>
          )}

          <div className="font-tech" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.8rem', marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
            <span style={{ color: '#00d4ff' }}>● 확인 완료</span>
            <span style={{ color: '#fbbf24' }}>● 대기중</span>
            <span style={{ color: '#fbbf24' }}>⚠ 과제 경고</span>
            <span style={{ color: '#ffb703' }}>◷ 지각 출석</span>
            <span style={{ color: '#fb7185' }}>− 출석 후 과제 미제출</span>
          </div>
          </div>
          
          {!isMobile && (
            <AssignmentWarningPolicyCard
              activeWarningCount={assignmentWarnings.filter(warning => ['active', 'appealed'].includes(warning.status)).length}
            />
          )}
        </div>

        {/* Right: Submission/Detail Panel */}
        <div className="glass-card hud-border" style={{ 
          flex: isMobile ? '1 1 100%' : '1 1 500px', 
          padding: isMobile ? '1rem' : '2rem', 
          display: 'flex', 
          flexDirection: 'column',
          minHeight: isMobile ? 'auto' : '600px',
          minWidth: 0, // Prevent expansion by long content
          width: '100%'
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
              assignment={effectiveAssignments?.find(a => a.date === selectedDateStr)} 
              warnings={assignmentWarnings.filter(warning => (
                warning.date === selectedDateStr ||
                (warning.assignmentId && warning.assignmentId === effectiveAssignments?.find(a => a.date === selectedDateStr)?.id)
              ))}
              activeWarningCount={assignmentWarnings.filter(warning => ['active', 'appealed'].includes(warning.status)).length}
              missingPenalty={missingPenaltyByDate[selectedDateStr]}
              user={user}
              userData={userData}
              submitMutation={submitMutation}
              onCancel={() => {
                if (confirmDraftNavigation()) setSelectedDateStr(null);
              }}
              onSubmitted={handleSubmitted}
              onNavigateToUnit={onNavigateToUnit}
              onDraftStateChange={handleDraftStateChange}
            />
          )}
        </div>
        </div>
      </div>
      <AnimatePresence>
        {submissionNotice && (
          <SubmissionSuccessModal
            dateStr={submissionNotice.date}
            onClose={() => setSubmissionNotice(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Detailed Submission Panel
import { useLearningHistory } from '../../hooks/useLearningHistory';
import DailyLearningTimeline from './DailyLearningTimeline';
import StudentReport from '../Report/StudentReport';

function AssignmentRewardSummary({ bonusCrystals = 0, missingPenalty = null }) {
  const bonus = Number(bonusCrystals) || 0;
  const showPenalty = missingPenalty?.matured;
  if (bonus <= 0 && !showPenalty) return null;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: bonus > 0 && showPenalty ? 'repeat(2, minmax(0, 1fr))' : '1fr',
      gap: '0.75rem',
      marginBottom: '1rem'
    }}>
      {bonus > 0 && (
        <div className="glass-card" style={{
          padding: '1rem 1.2rem',
          background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.16), rgba(0, 212, 255, 0.08))',
          border: '1px solid rgba(255, 215, 0, 0.55)',
          boxShadow: '0 0 18px rgba(255, 215, 0, 0.14)'
        }}>
          <div className="font-tech" style={{ color: 'var(--star-gold)', fontSize: '0.78rem', marginBottom: '0.35rem' }}>
            TEACHER BONUS
          </div>
          <div style={{ color: 'var(--text-bright)', fontSize: '1.45rem', fontWeight: 900 }}>
            💎 +{bonus} 광석
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.35rem' }}>
            과제 피드백과 함께 지급된 보너스입니다.
          </div>
        </div>
      )}
      {showPenalty && (
        <div className="glass-card" style={{
          padding: '1rem 1.2rem',
          background: 'rgba(251, 113, 133, 0.1)',
          border: '1px solid rgba(251, 113, 133, 0.55)'
        }}>
          <div className="font-tech" style={{ color: '#fb7185', fontSize: '0.78rem', marginBottom: '0.35rem' }}>
            MISSING ASSIGNMENT
          </div>
          <div style={{ color: '#fecdd3', fontSize: '1.35rem', fontWeight: 900 }}>
            미제출 검토 필요
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.35rem' }}>
            출석 후 12시간 내 미제출 · {missingPenalty.missingStreak}회 연속 · 서버가 최근 7일 기준으로 검토합니다.
          </div>
        </div>
      )}
    </div>
  );
}

function AssignmentWarningPolicyCard({ activeWarningCount = 0 }) {
  return (
    <div className="glass-card" style={{
      padding: '1rem 1.2rem',
      marginBottom: '1rem',
      background: 'rgba(59, 130, 246, 0.07)',
      border: '1px solid rgba(0, 212, 255, 0.24)',
    }}>
      <div className="font-tech" style={{ color: 'var(--crystal-cyan)', fontSize: '0.82rem', marginBottom: '0.6rem' }}>
        학습 경고 규칙 · 현재 누적 {activeWarningCount}회
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '0.7rem',
      }}>
        <div style={{ padding: '0.75rem', borderRadius: 8, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="font-tech" style={{ color: '#fbbf24', fontSize: '0.76rem', marginBottom: '0.35rem' }}>불성실 과제 제출</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.86rem', lineHeight: 1.5 }}>
            학습 기록이나 제출 내용이 과제 수행으로 확인되기 어려우면 경고 1회가 기록됩니다.
          </div>
        </div>
        <div style={{ padding: '0.75rem', borderRadius: 8, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="font-tech" style={{ color: '#fbbf24', fontSize: '0.76rem', marginBottom: '0.35rem' }}>연속 3회 미제출</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.86rem', lineHeight: 1.5 }}>
            출석 후 과제 미제출이 3회 연속 확인되면 경고 1회가 기록됩니다.
          </div>
        </div>
        <div style={{ padding: '0.75rem', borderRadius: 8, background: 'rgba(251, 113, 133, 0.08)', border: '1px solid rgba(251,113,133,0.25)' }}>
          <div className="font-tech" style={{ color: '#fca5a5', fontSize: '0.76rem', marginBottom: '0.35rem' }}>3회 이상 누적</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.86rem', lineHeight: 1.5 }}>
            {WARNING_POLICY_MESSAGE}
          </div>
        </div>
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.5, marginTop: '0.75rem' }}>
        취소된 경고는 누적에 포함되지 않습니다. 경고가 잘못되었다고 생각하면 경고별로 1회 이의신청할 수 있으며, 이의신청은 제출 후 수정할 수 없습니다.
      </div>
    </div>
  );
}

function SubmissionSuccessModal({ dateStr, onClose }) {
  return (
    <MotionDiv
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.58)',
        backdropFilter: 'blur(6px)',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <MotionDiv
        initial={{ scale: 0.94, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 8 }}
        className="glass-card hud-border"
        style={{
          width: 'min(440px, 100%)',
          padding: '2rem',
          textAlign: 'center',
          background: 'rgba(12, 18, 34, 0.96)'
        }}
        onClick={event => event.stopPropagation()}
      >
        <div style={{ fontSize: '3rem', marginBottom: '0.8rem' }}>✅</div>
        <h3 className="font-title" style={{ color: 'var(--star-gold)', margin: '0 0 0.75rem' }}>
          탐사 보고서 전송 완료
        </h3>
        <p style={{ color: 'var(--text-bright)', lineHeight: 1.65, margin: '0 0 1.5rem' }}>
          {dateStr} 과제 제출이 완료되었습니다.
          <br />
          제출된 기록 화면으로 전환했습니다.
        </p>
        <button
          type="button"
          className="space-btn cosmic-btn font-tech"
          onClick={onClose}
          style={{ minWidth: '120px' }}
        >
          확인
        </button>
      </MotionDiv>
    </MotionDiv>
  );
}

function SubmissionPanel({ clusterId, regionId, dateStr, assignment, warnings = [], activeWarningCount = 0, missingPenalty, user, userData, submitMutation, onCancel, onSubmitted, onNavigateToUnit, onDraftStateChange }) {
  const [activeTab, setActiveTab] = useState('report'); // 'report' | 'timeline' | 'growth'
  const [reportDays, setReportDays] = useState(30);
  
  const [content, setContent] = useState(assignment?.content || '');
  const [links, setLinks] = useState(assignment?.links || []);
  const [newLink, setNewLink] = useState('');
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({}); // { fileName: percentage }
  const [existingAttachments, setExistingAttachments] = useState(assignment?.attachments || []);
  const [attachmentMode, setAttachmentMode] = useState(null); // 'link' or 'file' or null
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftStatus, setDraftStatus] = useState('');
  const [feedbackReaction, setFeedbackReaction] = useState(assignment?.feedbackReaction || assignment?.feedbackResponse?.reaction || '');
  const [feedbackComment, setFeedbackComment] = useState(assignment?.feedbackComment || assignment?.feedbackResponse?.comment || '');
  const [feedbackResponseSaved, setFeedbackResponseSaved] = useState(Boolean(assignment?.feedbackRespondedAt));
  const [feedbackResponseError, setFeedbackResponseError] = useState('');
  const [feedbackResponseStatus, setFeedbackResponseStatus] = useState('');
  const [appealTextByWarning, setAppealTextByWarning] = useState({});
  const [appealSubmittedByWarning, setAppealSubmittedByWarning] = useState({});
  const [appealErrorByWarning, setAppealErrorByWarning] = useState({});
  const fileInputRef = useRef(null);
  const skipNextDraftAutosaveRef = useRef(true);
  const draftStorageKey = useMemo(() => (
    getAssignmentDraftStorageKey({ userId: user?.uid, clusterId, dateStr })
  ), [user?.uid, clusterId, dateStr]);

  const { activities, groupedActivities, dailyStats, loading: timelineLoading, error: timelineError } = useLearningHistory(user?.uid, dateStr);
  const feedbackResponseMutation = useSubmitFeedbackResponse();
  const warningAppealMutation = useSubmitWarningAppeal();
  const shareCooldown = useAssignmentShareCooldown(user?.uid);
  const { publish } = useAssignmentShareMutations();
  const activeWarnings = warnings.filter(warning => ['active', 'appealed'].includes(warning.status));
  const cancelledWarnings = warnings.filter(warning => warning.status === 'cancelled');
  const [shareFlow, setShareFlow] = useState({
    open: false,
    phase: 'idle',
    kind: 'archive',
    shareId: null,
    error: ''
  });

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  // Status check
  const isReviewed = assignment?.status === 'reviewed';
  const isNeedsRevision = assignment?.status === 'needs_revision';
  const isSubmitted = assignment?.status === 'submitted';
  const hasPublishableFeedback = Boolean(String(assignment?.feedback || '').trim());
  const canPublishAssignment = Boolean(
    assignment?.id &&
    ['submitted', 'reviewed', 'needs_revision'].includes(assignment?.status) &&
    hasPublishableFeedback
  );
  const publishDailySummary = useMemo(() => ({
    quizCount: dailyStats?.quizCount || 0,
    logCount: dailyStats?.logCount || 0,
    codeTraceCount: dailyStats?.codeTraceCount || 0,
    totalVideoSeconds: dailyStats?.totalVideoSeconds || 0,
    attentionHits: dailyStats?.attentionHits || 0,
    attentionOpportunities: dailyStats?.attentionOpportunities || 0,
    focusScore: dailyStats?.focusScore ?? null
  }), [dailyStats]);

  const formatNextShareDate = (date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('ko-KR', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handlePublishAssignmentShare = async (kind) => {
    if (!canPublishAssignment || publish.isPending || !shareCooldown.data?.canShare) return;
    setShareFlow({
      open: true,
      phase: 'publishing',
      kind,
      shareId: null,
      error: ''
    });
    try {
      const result = await publish.mutateAsync({
        assignmentId: assignment.id,
        kind,
        dailySummary: publishDailySummary
      });
      setShareFlow(prev => ({
        ...prev,
        phase: 'complete',
        shareId: result?.shareId || null,
        error: ''
      }));
    } catch (error) {
      setShareFlow(prev => ({
        ...prev,
        phase: 'error',
        error: error?.message || '공개에 실패했습니다.'
      }));
    }
  };

  const closeShareFlow = () => {
    setShareFlow({
      open: false,
      phase: 'idle',
      kind: 'archive',
      shareId: null,
      error: ''
    });
  };

  const handleGoToSharedContent = (shareId) => {
    closeShareFlow();
    window.location.assign(`/agora?filter=archive&highlight=${shareId}`);
  };

  useEffect(() => {
    setFeedbackReaction(assignment?.feedbackReaction || assignment?.feedbackResponse?.reaction || '');
    setFeedbackComment(assignment?.feedbackComment || assignment?.feedbackResponse?.comment || '');
    setFeedbackResponseSaved(Boolean(assignment?.feedbackRespondedAt));
    setFeedbackResponseError('');
    setFeedbackResponseStatus('');
  }, [
    assignment?.id,
    assignment?.feedbackReaction,
    assignment?.feedbackResponse?.reaction,
    assignment?.feedbackComment,
    assignment?.feedbackResponse?.comment,
    assignment?.feedbackRespondedAt
  ]);

  // Window check: Today and previous 6 days (total 7 days)
  const isWithinWindow = useMemo(() => {
    const today = new Date(getTodayKST() + 'T00:00:00Z');
    const selected = new Date(dateStr + 'T00:00:00Z');
    const diffTime = today - selected;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 6;
  }, [dateStr]);

  // 운영자 평가(피드백)가 완료된 과제(status === 'reviewed')만 수정 불가.
  // submitted(대기중), needs_revision(재검토 요망) 상태는 사령부 확인 전까지 수정 가능.
  const canEditSubmission = isWithinWindow && !isReviewed;

  useEffect(() => {
    let cancelled = false;
    skipNextDraftAutosaveRef.current = true;

    if (!canEditSubmission) {
      onDraftStateChange?.({ dirty: false });
      return undefined;
    }

    const draft = safeReadAssignmentDraft(draftStorageKey);
    const shouldRestoreDraft = draft && hasDraftChangedFromAssignment(draft, assignment);

    setContent(shouldRestoreDraft ? String(draft.content || '') : (assignment?.content || ''));
    setLinks(shouldRestoreDraft ? (draft.links || []) : (assignment?.links || []));
    setNewLink(shouldRestoreDraft ? String(draft.newLink || '') : '');
    setExistingAttachments(shouldRestoreDraft ? (draft.existingAttachments || []) : (assignment?.attachments || []));

    if (shouldRestoreDraft) {
      const savedAtText = formatDraftSavedAt(draft.updatedAt);
      setDraftStatus(savedAtText ? `임시저장된 글을 불러왔습니다. (${savedAtText})` : '임시저장된 글을 불러왔습니다.');
    } else {
      setDraftStatus('');
    }

    safeReadAssignmentDraftFiles(draftStorageKey).then((draftFiles) => {
      if (cancelled) return;
      setFiles(draftFiles);
      if (draftFiles.length > 0) {
        onDraftStateChange?.({ dirty: true, hasFiles: true });
        setDraftStatus(prev => prev || `임시저장된 파일 ${draftFiles.length}개를 불러왔습니다.`);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    assignment,
    canEditSubmission,
    draftStorageKey,
    onDraftStateChange
  ]);

  useEffect(() => {
    if (!canEditSubmission || !draftStorageKey || isSubmitting) return;

    if (skipNextDraftAutosaveRef.current) {
      skipNextDraftAutosaveRef.current = false;
      return;
    }

    const draftPayload = {
      assignmentId: assignment?.id || null,
      dateStr,
      clusterId,
      content,
      links,
      newLink,
      existingAttachments,
      updatedAt: Date.now()
    };

    const dirty = hasDraftChangedFromAssignment(draftPayload, assignment) || files.length > 0;
    onDraftStateChange?.({ dirty, hasFiles: files.length > 0 });

    if (!hasDraftChangedFromAssignment(draftPayload, assignment)) {
      safeRemoveAssignmentDraft(draftStorageKey);
      if (files.length === 0) setDraftStatus('');
      return;
    }

    const updatedPayload = { ...draftPayload, updatedAt: Date.now() };
    if (safeWriteAssignmentDraft(draftStorageKey, updatedPayload)) {
      const savedAtText = formatDraftSavedAt(updatedPayload.updatedAt);
      setDraftStatus(savedAtText ? `임시저장됨 ${savedAtText}` : '임시저장됨');
    }
  }, [
    assignment,
    canEditSubmission,
    clusterId,
    content,
    dateStr,
    draftStorageKey,
    existingAttachments,
    files.length,
    isSubmitting,
    links,
    newLink,
    onDraftStateChange
  ]);

  useEffect(() => () => {
    onDraftStateChange?.({ dirty: false });
  }, [onDraftStateChange]);

  const persistDraftImmediately = useCallback((nextDraftFields = {}) => {
    if (!canEditSubmission || !draftStorageKey || isSubmitting) return;

    const draftPayload = {
      assignmentId: assignment?.id || null,
      dateStr,
      clusterId,
      content,
      links,
      newLink,
      existingAttachments,
      updatedAt: Date.now(),
      ...nextDraftFields
    };
    const draftChanged = hasDraftChangedFromAssignment(draftPayload, assignment);
    const dirty = draftChanged || files.length > 0;
    onDraftStateChange?.({ dirty, hasFiles: files.length > 0 });

    if (!draftChanged) {
      safeRemoveAssignmentDraft(draftStorageKey);
      if (files.length === 0) setDraftStatus('');
      return;
    }

    if (safeWriteAssignmentDraft(draftStorageKey, draftPayload)) {
      const savedAtText = formatDraftSavedAt(draftPayload.updatedAt);
      setDraftStatus(savedAtText ? `임시저장됨 ${savedAtText}` : '임시저장됨');
    }
  }, [
    assignment,
    canEditSubmission,
    clusterId,
    content,
    dateStr,
    draftStorageKey,
    existingAttachments,
    files.length,
    isSubmitting,
    links,
    newLink,
    onDraftStateChange
  ]);

  const handleContentChange = (event) => {
    const nextContent = event.target.value;
    setContent(nextContent);
    persistDraftImmediately({ content: nextContent });
  };

  const handleNewLinkChange = (event) => {
    const nextNewLink = event.target.value;
    setNewLink(nextNewLink);
    persistDraftImmediately({ newLink: nextNewLink });
  };

  const persistDraftFiles = useCallback(async (nextFiles) => {
    if (!canEditSubmission || !draftStorageKey || isSubmitting) return;

    if (nextFiles.length > 0) {
      const saved = await safeWriteAssignmentDraftFiles(draftStorageKey, nextFiles);
      if (saved) {
        setDraftStatus(`임시저장됨 · 파일 ${nextFiles.length}개 포함`);
      }
    } else {
      await safeRemoveAssignmentDraftFiles(draftStorageKey);
    }

    const currentDraft = {
      assignmentId: assignment?.id || null,
      dateStr,
      clusterId,
      content,
      links,
      newLink,
      existingAttachments,
      updatedAt: Date.now()
    };
    const dirty = hasDraftChangedFromAssignment(currentDraft, assignment) || nextFiles.length > 0;
    onDraftStateChange?.({ dirty, hasFiles: nextFiles.length > 0 });
  }, [
    assignment,
    canEditSubmission,
    clusterId,
    content,
    dateStr,
    draftStorageKey,
    existingAttachments,
    isSubmitting,
    links,
    newLink,
    onDraftStateChange
  ]);

  const handleAddLink = (e) => {
    if (e) e.preventDefault();
    if (!newLink.trim()) return;
    const nextLinks = [...links, { url: newLink.trim(), title: newLink.trim(), image: '' }];
    setLinks(nextLinks);
    persistDraftImmediately({ links: nextLinks, newLink: '' });
    setNewLink('');
  };

  const handleRemoveLink = (index) => {
    const nextLinks = links.filter((_, i) => i !== index);
    setLinks(nextLinks);
    persistDraftImmediately({ links: nextLinks });
  };

  const handleSubmitFeedbackResponse = async () => {
    if (feedbackResponseMutation.isPending || feedbackResponseSaved) return;
    if (!assignment?.id || !user?.uid) {
      setFeedbackResponseError('저장할 과제 정보가 없습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.');
      return;
    }
    if (!feedbackReaction) {
      setFeedbackResponseError('피드백 평가를 먼저 선택해 주세요.');
      return;
    }
    setFeedbackResponseError('');
    setFeedbackResponseStatus('');
    try {
      await feedbackResponseMutation.mutateAsync({
        assignmentId: assignment.id,
        userId: user?.uid,
        reaction: feedbackReaction,
        comment: feedbackComment,
      });
      setFeedbackResponseSaved(true);
      setFeedbackResponseStatus('피드백 평가가 저장되었습니다.');
    } catch (error) {
      console.error('Feedback response save failed:', error);
      setFeedbackResponseSaved(false);
      setFeedbackResponseStatus('');
      setFeedbackResponseError(
        error?.code === 'permission-denied'
          ? '저장 권한이 거부되었습니다. 잠시 뒤 다시 시도해 주세요.'
          : error?.message || '저장에 실패했습니다. 잠시 뒤 다시 시도해 주세요.'
      );
    }
  };

  const handleSubmitWarningAppeal = async (warning) => {
    if (!warning?.id || warningAppealMutation.isPending || appealSubmittedByWarning[warning.id]) return;
    const text = appealTextByWarning[warning.id] || '';
    setAppealErrorByWarning(prev => ({ ...prev, [warning.id]: '' }));
    try {
      await warningAppealMutation.mutateAsync({
        warningId: warning.id,
        userId: user?.uid,
        text,
      });
      setAppealSubmittedByWarning(prev => ({
        ...prev,
        [warning.id]: { text: String(text || '').trim() }
      }));
      setAppealTextByWarning(prev => ({ ...prev, [warning.id]: '' }));
    } catch (error) {
      console.error('Warning appeal failed:', error);
      setAppealErrorByWarning(prev => ({
        ...prev,
        [warning.id]: error?.message || '이의신청 제출에 실패했습니다.'
      }));
    }
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
      const nextFiles = [...files, ...validFiles];
      setFiles(nextFiles);
      persistDraftFiles(nextFiles);
    }
  };

  const handleRemoveNewFile = (index) => {
    const nextFiles = files.filter((_, i) => i !== index);
    setFiles(nextFiles);
    persistDraftFiles(nextFiles);
  };

  const handleRemoveExistingAttachment = (index) => {
    const nextAttachments = existingAttachments.filter((_, i) => i !== index);
    setExistingAttachments(nextAttachments);
    persistDraftImmediately({ existingAttachments: nextAttachments });
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
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Upload new files to Firebase Storage with Progress
      const uploadedAttachments = [];
      setUploadProgress({});

      const uploadPromises = files.map(file => {
        return new Promise((resolve, reject) => {
          const storagePath = `assignments/${user.uid}/${Date.now()}_${file.name}`;
          const extension = file.name.split('.').pop().toLowerCase();
          const isTextFile = ['py', 'txt', 'js', 'json', 'csv', 'md'].includes(extension) || file.type.startsWith('text/');
          
          const metadata = {
            contentType: isTextFile 
              ? `${file.type || 'text/plain'}; charset=utf-8` 
              : file.type
          };

          const fileRef = ref(storage, storagePath);
          const uploadTask = uploadBytesResumable(fileRef, file, metadata);

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
          const functionUrl = getFunctionUrl('fetchNotebook');
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

      const assignmentData = {
        userId: user.uid,
        userName: userData?.studentName || user.displayName || user.email?.split('@')[0] || 'Unknown Explorer',
        clusterId: normalizedClusterId,
        regionId: regionId || null,
        date: dateStr,
        content,
        links,
        attachments: finalAttachments,
        notebookData,
        status: 'submitted',
        revisionCount: (assignment?.revisionCount || 0) + (isNeedsRevision ? 1 : 0)
      };

      const submittedResult = await submitMutation.mutateAsync({
        docId: assignment?.id,
        assignmentData
      });

      safeRemoveAssignmentDraft(draftStorageKey);
      await safeRemoveAssignmentDraftFiles(draftStorageKey);
      onDraftStateChange?.({ dirty: false });
      setDraftStatus('');
      setFiles([]);
      setUploadProgress({});
      setAttachmentMode(null);
      setIsSubmitting(false);
      onSubmitted?.({
        ...assignment,
        ...assignmentData,
        id: submittedResult?.id || assignment?.id,
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Submission failed:", error);
      alert("보고서 전송에 실패했습니다.");
      setIsSubmitting(false); // only reset on fail so double clicks are prevented if closing
    } 
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', minHeight: 0 }}>
      {/* Header and Tabs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--neon-blue)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="font-title" style={{ margin: 0, color: 'var(--text-bright)' }}>탐사 보고서 전송망</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {isNeedsRevision && <span className="siren-pulse font-tech" style={{ color: '#ff4500', fontWeight: 'bold' }}>⚠️ 재검토 요망</span>}
            {isSubmitted && <span className="pulse-slow font-tech" style={{ color: 'var(--star-gold)' }}>대기중</span>}
            <span className="font-tech" style={{ color: 'var(--crystal-cyan)', fontSize: '1.2rem' }}>{dateStr}</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`space-btn font-tech ${activeTab === 'report' ? 'cosmic-btn active' : ''}`}
            onClick={() => setActiveTab('report')}
            style={{ 
              padding: '0.6rem 1.5rem', 
              fontSize: '0.9rem',
              background: activeTab === 'report' ? 'rgba(0, 212, 255, 0.2)' : 'rgba(255,255,255,0.05)',
              borderColor: activeTab === 'report' ? 'var(--crystal-cyan)' : 'rgba(255,255,255,0.1)'
            }}
          >
            📝 탐사 보고서 전송
          </button>
          <button 
            className={`space-btn font-tech ${activeTab === 'timeline' ? 'cosmic-btn active' : ''}`}
            onClick={() => setActiveTab('timeline')}
            style={{ 
              padding: '0.6rem 1.5rem', 
              fontSize: '0.9rem',
              background: activeTab === 'timeline' ? 'rgba(0, 212, 255, 0.2)' : 'rgba(255,255,255,0.05)',
              borderColor: activeTab === 'timeline' ? 'var(--crystal-cyan)' : 'rgba(255,255,255,0.1)'
            }}
          >
            ⏱️ 일일 학습 기록
          </button>
          <button
            className={`space-btn font-tech ${activeTab === 'growth' ? 'cosmic-btn active' : ''}`}
            onClick={() => setActiveTab('growth')}
            style={{
              padding: '0.6rem 1.5rem',
              fontSize: '0.9rem',
              background: activeTab === 'growth' ? 'rgba(0, 212, 255, 0.2)' : 'rgba(255,255,255,0.05)',
              borderColor: activeTab === 'growth' ? 'var(--crystal-cyan)' : 'rgba(255,255,255,0.1)'
            }}
          >
            📊 학생 성장 리포트
          </button>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.8rem',
          flexWrap: 'wrap',
          padding: '0.8rem 0.9rem',
          borderRadius: 10,
          border: '1px solid rgba(0, 212, 255, 0.24)',
          background: 'rgba(0, 212, 255, 0.06)'
        }}>
          <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--crystal-cyan)' }}>스텔라 아고라 공개</strong>
            <span style={{ marginLeft: '0.45rem' }}>
              과제, 일일 학습 기록, 피드백과 보너스 광석을 친구들에게 공개합니다.
            </span>
            {!canPublishAssignment && (
              <div style={{ color: '#fbbf24', marginTop: '0.22rem' }}>
                과제 제출 내역과 피드백이 모두 있어야 공개할 수 있습니다.
              </div>
            )}
            {canPublishAssignment && !shareCooldown.isLoading && !shareCooldown.data?.canShare && (
              <div style={{ color: '#fbbf24', marginTop: '0.22rem' }}>
                다음 공개 가능 시간: {formatNextShareDate(shareCooldown.data?.nextAvailableAt)}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="space-btn cosmic-btn font-tech"
              disabled={!canPublishAssignment || shareCooldown.isLoading || !shareCooldown.data?.canShare || publish.isPending || shareFlow.phase === 'publishing'}
              onClick={() => handlePublishAssignmentShare('archive')}
              style={{ fontSize: '0.78rem', padding: '0.5rem 0.85rem' }}
            >
              기록 공개하기
            </button>
            <button
              type="button"
              className="space-btn font-tech"
              disabled={!canPublishAssignment || shareCooldown.isLoading || !shareCooldown.data?.canShare || publish.isPending || shareFlow.phase === 'publishing'}
              onClick={() => handlePublishAssignmentShare('comfort')}
              style={{ borderColor: '#fda4af', color: '#fda4af', fontSize: '0.78rem', padding: '0.5rem 0.85rem' }}
            >
              위로 받기
            </button>
          </div>
        </div>
        <AssignmentShareModal
          open={shareFlow.open}
          phase={shareFlow.phase}
          kind={shareFlow.kind}
          error={shareFlow.error}
          shareId={shareFlow.shareId}
          onClose={closeShareFlow}
          onGoToShare={handleGoToSharedContent}
        />
      </div>
      
      {/* Daily Learning Timeline View */}
      {activeTab === 'timeline' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <DailyLearningTimeline 
            groupedActivities={groupedActivities}
            activities={activities} 
            dailyStats={dailyStats}
            loading={timelineLoading} 
            error={timelineError}
            onActivityClick={onNavigateToUnit}
          />
        </div>
      )}

      {activeTab === 'growth' && (
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <StudentReport
            userId={user?.uid}
            days={reportDays}
            onDaysChange={setReportDays}
          />
        </div>
      )}

      {/* Report Form View */}
      {activeTab === 'report' && (
        <>
          <AssignmentRewardSummary bonusCrystals={assignment?.bonusCrystals} missingPenalty={!assignment ? missingPenalty : null} />

          {(activeWarnings.length > 0 || cancelledWarnings.length > 0) && (
            <div className="glass-card" style={{ padding: '1.2rem', marginBottom: '1rem', border: '1px solid rgba(251, 191, 36, 0.45)', background: 'rgba(251, 191, 36, 0.08)' }}>
              <div className="font-tech" style={{ color: '#fbbf24', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                학습 경고 · 현재 누적 {activeWarningCount}회
              </div>
              <div style={{ display: 'grid', gap: '0.9rem' }}>
                {activeWarnings.map((warning) => {
                  const localAppeal = appealSubmittedByWarning[warning.id];
                  const appealSubmitted = Boolean(localAppeal || warning.appealLocked || warning.appeal?.text);
                  const appealText = String(appealTextByWarning[warning.id] || '');
                  const trimmedAppealText = appealText.trim();
                  const appealError = appealErrorByWarning[warning.id];
                  return (
                    <div key={warning.id} style={{ padding: '0.9rem', borderRadius: 8, background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="font-tech" style={{ color: '#fbbf24', fontSize: '0.82rem', marginBottom: '0.45rem' }}>
                        {warning.activeWarningOrdinal ? `${warning.activeWarningOrdinal}번째 학습 경고입니다.` : '학습 경고입니다.'}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '0.25rem' }}>경고 사유</div>
                      <div style={{ color: 'var(--text-bright)', lineHeight: 1.6 }}>{warning.message}</div>
                      {activeWarningCount >= 3 && (
                        <div style={{ color: '#fca5a5', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                          {warning.policyMessage || WARNING_POLICY_MESSAGE}
                        </div>
                      )}
                      {appealSubmitted ? (
                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', borderRadius: 6, background: 'rgba(0, 212, 255, 0.08)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                          <strong style={{ color: 'var(--crystal-cyan)' }}>이의신청 제출 완료</strong>
                          <div style={{ marginTop: '0.4rem', whiteSpace: 'pre-wrap' }}>{warning.appeal?.text || localAppeal?.text}</div>
                          <div style={{ marginTop: '0.4rem', fontSize: '0.82rem' }}>제출 후 수정할 수 없습니다.</div>
                          {warning.appeal?.status === 'rejected' && warning.appeal?.adminResponse && (
                            <div style={{ marginTop: '0.5rem', color: '#fca5a5' }}>관리자 답변: {warning.appeal.adminResponse}</div>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gap: '0.55rem', marginTop: '0.75rem' }}>
                          <textarea
                            className="feedback-response-comment"
                            rows={3}
                            value={appealText}
                            maxLength={2000}
                            onChange={(event) => {
                              setAppealTextByWarning(prev => ({ ...prev, [warning.id]: event.target.value }));
                              setAppealErrorByWarning(prev => ({ ...prev, [warning.id]: '' }));
                            }}
                            placeholder="경고가 잘못되었다고 생각하면 근거를 적어 주세요. 이의신청은 제출 후 수정할 수 없습니다."
                          />
                          <div className={trimmedAppealText.length < 10 ? 'feedback-response-hint warning' : 'feedback-response-hint'}>
                            {trimmedAppealText.length < 10
                              ? `10자 이상 입력해야 제출할 수 있습니다. 현재 ${trimmedAppealText.length}자`
                              : '제출 후 수정할 수 없으니 내용을 확인한 뒤 제출해 주세요.'}
                          </div>
                          {appealError && <div className="feedback-response-error">{appealError}</div>}
                          <button
                            type="button"
                            className="cosmic-button secondary feedback-response-submit"
                            disabled={warningAppealMutation.isPending || trimmedAppealText.length < 10}
                            onClick={() => handleSubmitWarningAppeal(warning)}
                          >
                            {warningAppealMutation.isPending ? '제출 중...' : '이의신청 제출'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {cancelledWarnings.map((warning) => (
                  <div key={warning.id} style={{ padding: '0.9rem', borderRadius: 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.28)' }}>
                    <div className="font-tech" style={{ color: '#34d399', fontSize: '0.82rem', marginBottom: '0.45rem' }}>
                      취소된 학습 경고입니다.
                    </div>
                    <div style={{ color: 'var(--text-bright)', lineHeight: 1.6 }}>
                      관리자 검토로 이 날짜의 경고가 취소되었습니다.
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.86rem', marginTop: '0.45rem', lineHeight: 1.5 }}>
                      취소 사유: {warning.cancelReason || '관리자 검토로 경고 취소'}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.35rem' }}>
                      이 기록은 현재 누적 경고 {activeWarningCount}회에 포함되지 않습니다.
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback Section (if reviewed or needs revision) */}
          {assignment?.feedback && (
            <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderLeft: `4px solid ${isNeedsRevision ? '#ff4500' : 'var(--crystal-cyan)'}`, background: 'rgba(0,0,0,0.4)' }}>
              <p className="font-tech" style={{ fontSize: '0.9rem', color: isNeedsRevision ? '#ff4500' : 'var(--crystal-cyan)', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📡사령부 회신 (COMMAND FEEDBACK)</span>
                {assignment?.bonusCrystals > 0 && (
                  <span style={{ marginLeft: 'auto', color: 'var(--star-gold)', fontWeight: 900 }}>
                    💎 +{assignment.bonusCrystals} 보너스
                  </span>
                )}
              </p>
              <div className="markdown-content feedback-markdown" style={{ color: 'var(--text-bright)', lineHeight: '1.75', fontSize: '0.98rem' }}>
                <ReactMarkdown>{formatFeedbackForDisplay(assignment.feedback)}</ReactMarkdown>
              </div>
              <div className="feedback-response-panel">
                <div className="feedback-response-header">
                  <span>이 피드백이 어땠나요?</span>
                  {(assignment.feedbackRespondedAt || feedbackResponseSaved) && <span className="feedback-response-saved">저장됨</span>}
                </div>
                <div className="feedback-reaction-row">
                  <button
                    type="button"
                    aria-label="엄지척"
                    title="도움이 됐어요"
                    className={`feedback-reaction-button ${feedbackReaction === 'thumbs_up' ? 'selected' : ''}`}
                    onClick={() => {
                      if (feedbackResponseSaved && feedbackReaction === 'thumbs_up') return;
                      setFeedbackReaction('thumbs_up');
                      setFeedbackResponseSaved(false);
                      setFeedbackResponseError('');
                      setFeedbackResponseStatus('');
                    }}
                  >
                    <span aria-hidden="true">👍</span>
                  </button>
                  <button
                    type="button"
                    aria-label="별로예요"
                    title="별로예요"
                    className={`feedback-reaction-button ${feedbackReaction === 'thumbs_down' ? 'selected' : ''}`}
                    onClick={() => {
                      if (feedbackResponseSaved && feedbackReaction === 'thumbs_down') return;
                      setFeedbackReaction('thumbs_down');
                      setFeedbackResponseSaved(false);
                      setFeedbackResponseError('');
                      setFeedbackResponseStatus('');
                    }}
                  >
                    <span aria-hidden="true">👎</span>
                  </button>
                </div>
                <textarea
                  className="feedback-response-comment"
                  value={feedbackComment}
                  onChange={(event) => {
                    setFeedbackComment(event.target.value);
                    setFeedbackResponseSaved(false);
                    setFeedbackResponseError('');
                    setFeedbackResponseStatus('');
                  }}
                  placeholder="선생님에게 남기고 싶은 말을 적어 주세요."
                  rows={3}
                  maxLength={1000}
                />
                {!feedbackReaction && <div className="feedback-response-hint warning">👍 또는 👎를 선택하면 저장할 수 있습니다.</div>}
                {feedbackResponseStatus && <div className="feedback-response-info">{feedbackResponseStatus}</div>}
                {feedbackResponseError && <div className="feedback-response-error">{feedbackResponseError}</div>}
                <button
                  type="button"
                  className="cosmic-button secondary feedback-response-submit"
                  onClick={handleSubmitFeedbackResponse}
                  disabled={!feedbackReaction || feedbackResponseMutation.isPending || feedbackResponseSaved}
                >
                  {feedbackResponseSaved ? '저장 완료' : feedbackResponseMutation.isPending ? '전송 중...' : '피드백 평가 남기기'}
                </button>
              </div>
            </div>
          )}

          {/* Submission Form */}
          {isReviewed ? (
            <div style={{ flex: 1, color: 'var(--text-muted)', overflowY: 'auto' }}>
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

          {/* Already submitted — still editable until command feedback is published */}
          {isSubmitted && (
            <div className="glass-card" style={{
              padding: '1rem 1.2rem',
              marginBottom: '1rem',
              border: '1px solid rgba(251, 191, 36, 0.45)',
              background: 'rgba(251, 191, 36, 0.08)'
            }}>
              <p className="font-tech" style={{ color: 'var(--star-gold)', margin: 0, fontWeight: 900 }}>
                ✅ 피드백 대기 중
              </p>
              <p style={{ margin: '0.35rem 0 0', lineHeight: 1.55, color: 'var(--text-bright)', fontSize: '0.88rem' }}>
                사령부 확인 전까지 제출 내용, 첨부 링크, 첨부 파일을 다시 수정할 수 있습니다. 수정이 끝나면 다시 전송해 주세요.
              </p>
            </div>
          )}

          <label className="font-tech" style={{ color: 'var(--crystal-cyan)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>오늘 한 내용 정리 (필수)</label>
          <textarea 
            className="space-input" 
            placeholder="오늘 제출할 과제의 요점을 정리해 보세요. 나의 언어로 정리하는 순간, 지식은 온전히 내 것이 됩니다! (최소 10자)" 
            value={content}
            onChange={handleContentChange}
            style={{ 
              minHeight: '120px', // Reduced from 200px
              maxHeight: '250px',
              marginBottom: '1rem', 
              padding: '0.8rem', 
              lineHeight: '1.4',
              fontSize: '0.95rem'
            }}
          />
          <div className="font-tech" style={{
            minHeight: '1.1rem',
            marginTop: '-0.55rem',
            marginBottom: '0.8rem',
            color: draftStatus ? 'var(--crystal-cyan)' : 'var(--text-muted)',
            fontSize: '0.76rem',
            lineHeight: 1.4
          }}>
            {draftStatus || '작성 중인 글은 이 기기에 자동 임시저장됩니다.'}
            {files.length > 0 && (
              <span style={{ color: '#fbbf24', marginLeft: '0.5rem' }}>
                새로 선택한 파일은 전송 전까지 다시 선택이 필요할 수 있습니다.
              </span>
            )}
          </div>

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
              <MotionDiv 
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
                    onChange={handleNewLinkChange}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddLink(); }}
                    style={{ flex: 1, fontSize: '0.85rem' }}
                  />
                  <button type="button" className="space-btn cosmic-btn" onClick={handleAddLink} disabled={isSubmitting || !newLink.trim()} style={{ padding: '0.4rem 1rem' }}>
                    추가
                  </button>
                </div>
              </MotionDiv>
            )}

            {attachmentMode === 'file' && (
              <MotionDiv 
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
                      const nextFiles = [...files, ...droppedFiles];
                      setFiles(nextFiles);
                      persistDraftFiles(nextFiles);
                    }
                  }}
                >
                  <p className="font-tech" style={{ color: isDragging ? 'white' : 'var(--crystal-cyan)', margin: 0, fontSize: '0.85rem' }}>
                    {isDragging ? '🚀 파일을 여기에 놓으세요!' : '내 PC에서 파일 선택하거나 파일을 여기로 드래그하세요.'}
                  </p>
                  {!isDragging && <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.5rem' }}>(IMAGE, PDF, MD, PY...)</p>}
                </div>
              </MotionDiv>
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
        </>
      )}
    </div>
  );
}
