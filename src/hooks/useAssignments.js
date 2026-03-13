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
  serverTimestamp,
  orderBy
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
 * Admin review & feedback mutation
 */
export const useReviewAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assignmentId, feedback, status, bonusCrystals, userId }) => {
      const ref = doc(db, 'assignments', assignmentId);
      
      const updateData = {
        feedback,
        status,
        bonusCrystals: Number(bonusCrystals) || 0,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp() // To trigger revision alerts if admin edits comment
      };

      await setDoc(ref, updateData, { merge: true });

      // Award crystals if approved and there's a bonus
      if (status === 'reviewed' && updateData.bonusCrystals > 0 && userId) {
        await recordCrystalTransaction(userId, updateData.bonusCrystals, `항행 일지 보상 (과제)`);
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
