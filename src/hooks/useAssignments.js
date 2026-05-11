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
  serverTimestamp
} from 'firebase/firestore'

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
