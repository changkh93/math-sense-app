import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '../firebase'
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  addDoc, 
  setDoc, 
  updateDoc,
  increment,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore'
import { auth } from '../firebase'

// ==========================================
// STUDENT HOOKS
// ==========================================

/**
 * Fetch assignments for a specific student in a specific cluster/region
 * @param {string} userId - Student UID
 * @param {string} clusterId - Current Cluster ID
 * @param {string} regionId - Current Region ID (Optional)
 */
export const useStudentAssignments = (userId, clusterId, regionId) => {
  return useQuery({
    queryKey: ['assignments', 'student', userId, clusterId, regionId],
    queryFn: async () => {
      if (!userId || !clusterId) return [];
      
      // Normalize clusterId based on user mapping
      let normalizedClusterId = clusterId;
      if (clusterId === '초등수학' || clusterId === 'cluster_elementary') normalizedClusterId = 'cluster_elementary';
      else if (clusterId === '파이썬' || clusterId === 'python') normalizedClusterId = 'python';
      else if (clusterId === '중등수학' || clusterId === 'middle-math') normalizedClusterId = 'middle-math';
      else if (clusterId === '서양고전' || clusterId === 'western-classic') normalizedClusterId = 'western-classic';
      
      console.log(`[DEBUG] useStudentAssignments fetch. Original: ${clusterId}, Normalized: ${normalizedClusterId}`);

      let q = query(
        collection(db, 'assignments'),
        where('userId', '==', userId),
        where('clusterId', '==', normalizedClusterId)
      );

      // We explicitly DO NOT filter by regionId here as requested for cluster-wide archive
      // if (regionId) {
      //   q = query(q, where('regionId', '==', regionId));
      // }

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      return data.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        return dateB.localeCompare(dateA); 
      });
    },
    enabled: !!userId && !!clusterId,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });
};

/**
 * Submit or Update an assignment
 */
export const useSubmitAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ docId, assignmentData }) => {
      if (docId) {
        // Update existing (Revision)
        const ref = doc(db, 'assignments', docId);
        await setDoc(ref, {
          ...assignmentData,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        return { id: docId };
      } else {
        // Create new
        const ref = await addDoc(collection(db, 'assignments'), {
          ...assignmentData,
          status: 'submitted',
          revisionCount: 0,
          isOfflineChecked: false,
          submittedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return { id: ref.id };
      }
    },
    onSuccess: (_, variables) => {
      // Broaden invalidation to ensure calendar AND chronicle update
      queryClient.invalidateQueries({ queryKey: ['assignments', 'student', variables.assignmentData.userId] });
      queryClient.invalidateQueries({ queryKey: ['assignments', 'student'] }); // Broader catch-all
    }
  });
};

/**
 * Student: respond to teacher feedback.
 */
export const useSubmitFeedbackResponse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assignmentId, userId, reaction, comment }) => {
      const ref = doc(db, 'assignments', assignmentId);
      const trimmedComment = String(comment || '').trim();
      await updateDoc(ref, {
        feedbackResponse: {
          reaction,
          comment: trimmedComment,
          updatedAt: serverTimestamp(),
        },
        feedbackReaction: reaction,
        feedbackComment: trimmedComment,
        feedbackRespondedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { assignmentId, userId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assignments', 'student', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['assignments', 'student'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
  });
};

// ==========================================
// ADMIN HOOKS
// ==========================================

import { recordCrystalTransaction } from '../utils/crystalLedger';

const ASSIGNMENT_MISSING_GRACE_MS = 12 * 60 * 60 * 1000;
const WARNING_POLICY_MESSAGE = '경고 3회 누적 시 수강료가 10% 인상될 수 있습니다.';
const ACTIVE_WARNING_STATUSES = ['active', 'appealed'];

const normalizeClusterId = (clusterId = '') => {
  if (clusterId === '초등수학' || clusterId === 'cluster_elementary') return 'cluster_elementary';
  if (clusterId === '파이썬' || clusterId === 'python') return 'python';
  if (clusterId === '중등수학' || clusterId === 'middle-math') return 'middle-math';
  if (clusterId === '서양고전' || clusterId === 'western-classic') return 'western-classic';
  return clusterId;
};

const normalizeWarningType = (type) => (
  type === 'consecutive_missing_assignment'
    ? 'consecutive_missing_assignment'
    : 'poor_assignment_submission'
);

const getWarningMessage = (type, customMessage = '') => {
  const message = String(customMessage || '').trim();
  if (message) return message;
  if (type === 'consecutive_missing_assignment') {
    return '연속 3회 과제 미제출이 확인되어 학습 경고가 기록되었습니다.';
  }
  return '이번 과제는 학습 기록과 제출 내용이 충분히 일치하지 않아 성실한 과제 수행으로 확인하기 어렵습니다.';
};

const getWarningId = ({ userId, assignmentId, clusterId, date, type }) => {
  const normalizedType = normalizeWarningType(type);
  if (normalizedType === 'consecutive_missing_assignment') {
    return `warning_${userId}_${clusterId || 'all'}_${date}_consecutive_missing_3`;
  }
  return `warning_${assignmentId}_${normalizedType}`;
};

async function recomputeAssignmentWarningSummary(userId) {
  if (!userId) return null;

  const q = query(collection(db, 'assignmentWarnings'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  const warnings = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
  const active = warnings.filter(item => ACTIVE_WARNING_STATUSES.includes(item.status));
  const byCluster = active.reduce((acc, item) => {
    const key = item.clusterId || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const lastWarning = [...active].sort((a, b) => {
    const aMs = getTimestampMs(a.createdAt) || getTimestampMs(a.updatedAt);
    const bMs = getTimestampMs(b.createdAt) || getTimestampMs(b.updatedAt);
    return bMs - aMs;
  })[0] || null;

  const summary = {
    activeCount: active.length,
    totalIssuedCount: warnings.length,
    cancelledCount: warnings.filter(item => item.status === 'cancelled').length,
    activeCountByCluster: byCluster,
    lastWarningAt: lastWarning?.createdAt || lastWarning?.updatedAt || null,
    lastWarningMessage: lastWarning?.message || '',
    feeIncreaseRisk: active.length >= 3,
    policyMessage: WARNING_POLICY_MESSAGE,
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, 'users', userId), { assignmentWarningSummary: summary }, { merge: true });
  return summary;
}

export const useStudentAssignmentWarnings = (userId, clusterId) => {
  return useQuery({
    queryKey: ['assignmentWarnings', 'student', userId, clusterId],
    queryFn: async () => {
      if (!userId) return [];
      const normalizedCluster = normalizeClusterId(clusterId);
      const q = query(collection(db, 'assignmentWarnings'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map(item => ({ id: item.id, ...item.data() }))
        .filter(item => ACTIVE_WARNING_STATUSES.includes(item.status))
        .filter(item => !normalizedCluster || item.clusterId === normalizedCluster)
        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    },
    enabled: !!userId,
    staleTime: 1000 * 60,
  });
};

export const useAssignmentWarningsForAssignment = (assignmentId) => {
  return useQuery({
    queryKey: ['assignmentWarnings', 'assignment', assignmentId],
    queryFn: async () => {
      if (!assignmentId) return [];
      const q = query(collection(db, 'assignmentWarnings'), where('assignmentId', '==', assignmentId));
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map(item => ({ id: item.id, ...item.data() }))
        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    },
    enabled: !!assignmentId,
    staleTime: 1000 * 30,
  });
};

export const useIssueAssignmentWarning = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assignment, type = 'poor_assignment_submission', message = '', evidence = {} }) => {
      if (!assignment?.userId) throw new Error('경고 대상 학생 정보가 없습니다.');

      const normalizedType = normalizeWarningType(type);
      const warningId = getWarningId({
        userId: assignment.userId,
        assignmentId: assignment.id,
        clusterId: assignment.clusterId,
        date: assignment.date,
        type: normalizedType,
      });
      const ref = doc(db, 'assignmentWarnings', warningId);
      const warning = {
        userId: assignment.userId,
        userName: assignment.userName || '',
        assignmentId: assignment.id || '',
        clusterId: assignment.clusterId || '',
        regionId: assignment.regionId || '',
        date: assignment.date || '',
        type: normalizedType,
        status: 'active',
        severity: 'warning',
        message: getWarningMessage(normalizedType, message),
        policyMessage: WARNING_POLICY_MESSAGE,
        evidence: evidence || {},
        appealLocked: false,
        createdBy: auth.currentUser?.uid || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(ref, warning, { merge: true });
      await recomputeAssignmentWarningSummary(assignment.userId);
      return { id: warningId, ...warning };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assignmentWarnings'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'userAllAssignments', variables?.assignment?.userId] });
    },
  });
};

export const useCancelAssignmentWarning = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ warning, reason = '' }) => {
      if (!warning?.id || !warning?.userId) throw new Error('취소할 경고 정보가 없습니다.');
      await setDoc(doc(db, 'assignmentWarnings', warning.id), {
        status: 'cancelled',
        cancelReason: String(reason || '').trim(),
        cancelledBy: auth.currentUser?.uid || '',
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...(warning.appeal ? {
          appeal: {
            ...warning.appeal,
            status: 'accepted',
            reviewedAt: serverTimestamp(),
            reviewedBy: auth.currentUser?.uid || '',
          },
        } : {}),
      }, { merge: true });
      await recomputeAssignmentWarningSummary(warning.userId);
      return warning;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assignmentWarnings'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'userAllAssignments', variables?.warning?.userId] });
    },
  });
};

export const useRejectWarningAppeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ warning, adminResponse = '' }) => {
      if (!warning?.id || !warning?.userId) throw new Error('검토할 경고 정보가 없습니다.');
      await setDoc(doc(db, 'assignmentWarnings', warning.id), {
        status: 'active',
        appeal: {
          ...(warning.appeal || {}),
          status: 'rejected',
          adminResponse: String(adminResponse || '').trim(),
          reviewedAt: serverTimestamp(),
          reviewedBy: auth.currentUser?.uid || '',
        },
        updatedAt: serverTimestamp(),
      }, { merge: true });
      await recomputeAssignmentWarningSummary(warning.userId);
      return warning;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assignmentWarnings'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'userAllAssignments', variables?.warning?.userId] });
    },
  });
};

export const useSubmitWarningAppeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ warningId, userId, text }) => {
      const trimmed = String(text || '').trim();
      if (!warningId || !userId) throw new Error('이의신청할 경고 정보가 없습니다.');
      if (trimmed.length < 10) throw new Error('이의신청 내용은 최소 10자 이상 작성해 주세요.');

      await updateDoc(doc(db, 'assignmentWarnings', warningId), {
        status: 'appealed',
        appealLocked: true,
        appeal: {
          text: trimmed,
          status: 'submitted',
          submittedAt: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      });
      await recomputeAssignmentWarningSummary(userId);
      return { warningId, userId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assignmentWarnings'] });
      queryClient.invalidateQueries({ queryKey: ['assignmentWarnings', 'student', variables?.userId] });
    },
  });
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

/**
 * Fetch assignments for Admin with filters
 */
export const useAdminAssignments = (clusterId, regionId, dateStr, status) => {
  return useQuery({
    queryKey: ['assignments', 'admin', clusterId, regionId, dateStr, status],
    queryFn: async () => {
      let q = query(collection(db, 'assignments'));
      
      // Apply filters
      if (clusterId && clusterId !== 'all') q = query(q, where('clusterId', '==', clusterId));
      if (regionId && regionId !== 'all') q = query(q, where('regionId', '==', regionId));
      if (dateStr) q = query(q, where('date', '==', dateStr));
      if (status && status !== 'all') q = query(q, where('status', '==', status));

      const snapshot = await getDocs(q);
      let data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      // Default sort by updatedAt descending (brings Needs Revision & Recent submissions to top)
      return data.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis() || 0;
        const timeB = b.updatedAt?.toMillis() || 0;
        return timeB - timeA;
      });
    },
    staleTime: 1000 * 60 // 1 minute
  });
};

/**
 * Admin: Search users by name or email
 */
export const useAdminUserSearch = (searchTerm) => {
  return useQuery({
    queryKey: ['admin', 'users', 'search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.trim().length < 2) return [];
      
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const term = searchTerm.toLowerCase();
      return allUsers.filter(u => 
        (u.studentName && u.studentName.toLowerCase().includes(term)) ||
        (u.name && u.name.toLowerCase().includes(term)) ||
        (u.email && u.email.toLowerCase().includes(term)) ||
        (u.id && u.id.toLowerCase().includes(term))
      );
    },
    enabled: !!searchTerm && searchTerm.trim().length >= 2,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Admin: Get Voyage Log (recent assignments by user and subject)
 */
export const useAdminVoyageLog = (userId, clusterId, limitCount = 10) => {
  return useQuery({
    queryKey: ['admin', 'voyageLog', userId, clusterId, limitCount],
    queryFn: async () => {
      if (!userId || !clusterId) return [];
      
      let normalizedClusterId = clusterId;
      if (clusterId === '초등수학' || clusterId === 'cluster_elementary') normalizedClusterId = 'cluster_elementary';
      else if (clusterId === '파이썬' || clusterId === 'python') normalizedClusterId = 'python';
      else if (clusterId === '중등수학' || clusterId === 'middle-math') normalizedClusterId = 'middle-math';
      else if (clusterId === '서양고전' || clusterId === 'western-classic') normalizedClusterId = 'western-classic';

      let q = query(
        collection(db, 'assignments'),
        where('userId', '==', userId),
        where('clusterId', '==', normalizedClusterId)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort descending by date
      const sorted = data.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        return dateB.localeCompare(dateA); 
      });
      
      return sorted.slice(0, limitCount);
    },
    enabled: !!userId && !!clusterId
  });
};

/**
 * Admin review & feedback mutation
 */
export const useReviewAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assignmentId, feedback, status, bonusCrystals, userId, previousBonusCrystals = 0 }) => {
      const ref = doc(db, 'assignments', assignmentId);
      
      const newBonus = status === 'reviewed' ? (Number(bonusCrystals) || 0) : 0;
      const crystalDiff = newBonus - previousBonusCrystals;

      const updateData = {
        feedback,
        status,
        bonusCrystals: newBonus,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp() // To trigger revision alerts if admin edits comment
      };

      await setDoc(ref, updateData, { merge: true });

      // Award or revoke crystals based on the difference
      if (crystalDiff !== 0 && userId) {
        // 1. Record in Ledger
        await recordCrystalTransaction(userId, {
          amount: crystalDiff,
          type: crystalDiff > 0 ? 'teacher_verify' : 'teacher_revoke',
          description: crystalDiff > 0 ? `항행 일지 보상 (과제)` : `항행 일지 보상 취소 (보완 요청)`,
          metadata: { assignmentId }
        });

        // 2. Actually update user balance
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          crystals: increment(crystalDiff)
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    }
  });
};

/**
 * Fetch attendance for a student in a cluster
 */
export const useStudentAttendance = (userId, clusterId) => {
  return useQuery({
    queryKey: ['attendance', 'student', userId, clusterId],
    queryFn: async () => {
      if (!userId || !clusterId) return [];
      
      // Normalize clusterId
      let normalizedClusterId = clusterId;
      if (clusterId === '초등수학' || clusterId === 'cluster_elementary') normalizedClusterId = 'cluster_elementary';
      else if (clusterId === '파이썬' || clusterId === 'python') normalizedClusterId = 'python';
      else if (clusterId === '중등수학' || clusterId === 'middle-math') normalizedClusterId = 'middle-math';
      else if (clusterId === '서양고전' || clusterId === 'western-classic') normalizedClusterId = 'western-classic';

      const q = query(
        collection(db, 'attendance'),
        where('userId', '==', userId),
        where('clusterId', '==', normalizedClusterId)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    enabled: !!userId && !!clusterId
  });
};

/**
 * Record attendance (Warp Gate Docking)
 */
export const useRecordAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attendanceData) => {
      // Create a unique doc ID for the student+date+cluster to prevent double attendance
      const docId = `${attendanceData.userId}_${attendanceData.date}_${attendanceData.clusterId}`;
      const ref = doc(db, 'attendance', docId);
      
      await setDoc(ref, {
        ...attendanceData,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      return { id: docId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    }
  });
};

/**
 * Student: Apply penalties for attended class days where no assignment was
 * submitted within 12 hours after attendance. This runs only when the archive
 * is opened and uses deterministic ledger IDs, so each date is charged once.
 */
export const useApplyMissingAssignmentPenalties = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, clusterId, attendanceRecords = [], assignments = [] }) => {
      if (!userId || !clusterId) return { applied: 0 };
      const normalizedClusterId = normalizeClusterId(clusterId);

      const assignmentDates = new Set(
        assignments
          .filter(a => ['submitted', 'reviewed', 'needs_revision'].includes(a.status))
          .map(a => a.date)
          .filter(Boolean)
      );

      const sortedAttendance = [...attendanceRecords]
        .filter(a => (!a.userId || a.userId === userId) && a.date)
        .sort((a, b) => String(a.date).localeCompare(String(b.date)));

      const nowMs = Date.now();
      let missingStreak = 0;
      const candidates = [];

      sortedAttendance.forEach((attendance) => {
        if (assignmentDates.has(attendance.date)) {
          missingStreak = 0;
          return;
        }

        missingStreak += 1;
        const baseMs = getAttendanceBaseMs(attendance);
        if (!baseMs || nowMs - baseMs < ASSIGNMENT_MISSING_GRACE_MS) return;

        const penaltyAmount = -(15 + Math.max(0, missingStreak - 1) * 5);
        candidates.push({
          attendance,
          missingStreak,
          penaltyAmount,
          txId: `assignment_missing_${normalizedClusterId}_${attendance.date}`
        });
      });

      let applied = 0;
      let warningTouched = false;
      for (const item of candidates) {
        const userRef = doc(db, 'users', userId);
        const txRef = doc(db, 'users', userId, 'crystal_transactions', item.txId);
        const warningId = item.missingStreak === 3
          ? getWarningId({
              userId,
              clusterId: normalizedClusterId,
              date: item.attendance.date,
              type: 'consecutive_missing_assignment',
            })
          : '';
        const warningRef = warningId ? doc(db, 'assignmentWarnings', warningId) : null;

        const result = await runTransaction(db, async (transaction) => {
          const existingTx = await transaction.get(txRef);
          const existingWarning = warningRef ? await transaction.get(warningRef) : null;
          if (existingTx.exists()) return { didApply: false, didCreateWarning: false };

          const penaltyAbs = Math.abs(item.penaltyAmount);
          recordCrystalTransaction(userId, {
            amount: item.penaltyAmount,
            type: 'assignment_missing_penalty',
              description: `출석 후 과제 미제출 페널티 (${item.attendance.date}, ${item.missingStreak}회 연속)`,
              metadata: {
                clusterId,
                normalizedClusterId,
                date: item.attendance.date,
              attendanceId: item.attendance.id || '',
              missingStreak: item.missingStreak,
              basePenalty: 15,
              consecutivePenalty: penaltyAbs - 15,
              graceHours: 12
            }
          }, transaction, item.txId);

          transaction.update(userRef, {
            crystals: increment(item.penaltyAmount),
            lastAssignmentPenaltyAt: serverTimestamp()
          });

          if (warningRef && !existingWarning?.exists()) {
            transaction.set(warningRef, {
              userId,
              assignmentId: '',
              clusterId: normalizedClusterId,
              regionId: item.attendance.regionId || '',
              date: item.attendance.date,
              type: 'consecutive_missing_assignment',
              status: 'active',
              severity: 'warning',
              message: getWarningMessage('consecutive_missing_assignment'),
              policyMessage: WARNING_POLICY_MESSAGE,
              evidence: {
                missingStreak: item.missingStreak,
                attendanceId: item.attendance.id || '',
                graceHours: 12,
              },
              appealLocked: false,
              createdBy: 'system_missing_assignment_sweep',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }, { merge: true });
          }

          return { didApply: true, didCreateWarning: Boolean(warningRef && !existingWarning?.exists()) };
        });

        if (result.didApply) applied += 1;
        if (result.didCreateWarning) warningTouched = true;
      }

      if (warningTouched) {
        await recomputeAssignmentWarningSummary(userId);
      }

      return { applied };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'student', variables?.userId, variables?.clusterId] });
      queryClient.invalidateQueries({ queryKey: ['assignments', 'student', variables?.userId, variables?.clusterId] });
      queryClient.invalidateQueries({ queryKey: ['assignmentWarnings', 'student', variables?.userId, variables?.clusterId] });
      queryClient.invalidateQueries({ queryKey: ['assignmentWarnings'] });
    }
  });
};

/**
 * Admin: Get all assignments for a specific user across all clusters
 */
export const useAdminUserAllAssignments = (userId) => {
  return useQuery({
    queryKey: ['admin', 'userAllAssignments', userId],
    queryFn: async () => {
      if (!userId) return [];
      const q = query(
        collection(db, 'assignments'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return data.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        return dateB.localeCompare(dateA); 
      });
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Admin: Get all attendance for a specific user across all clusters
 */
export const useAdminUserAllAttendance = (userId) => {
  return useQuery({
    queryKey: ['admin', 'userAllAttendance', userId],
    queryFn: async () => {
      if (!userId) return [];
      const q = query(
        collection(db, 'attendance'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return data.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        return dateB.localeCompare(dateA); 
      });
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Admin: Get all attendance records for a specific date across all clusters
 */
export const useAdminTodayAttendance = (dateStr) => {
  return useQuery({
    queryKey: ['admin', 'todayAttendance', dateStr],
    queryFn: async () => {
      if (!dateStr) return [];
      const q = query(
        collection(db, 'attendance'),
        where('date', '==', dateStr)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    enabled: !!dateStr,
    refetchInterval: 60000, // refresh every minute since it is used for live monitoring
  });
};
