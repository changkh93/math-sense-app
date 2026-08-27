import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  doc, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { db, functions, storage } from '../firebase';
import { sanitizeCodeTraceExercise } from '../utils/codeTraceSanitizer';

const CONTENT_QUERY_TIMEOUT_MS = 10000;

const withContentQueryTimeout = (promise, label) => new Promise((resolve, reject) => {
  const timeout = setTimeout(() => {
    const error = new Error(`${label} timed out`);
    error.code = 'content/deadline-exceeded';
    reject(error);
  }, CONTENT_QUERY_TIMEOUT_MS);

  promise.then(resolve, reject).finally(() => clearTimeout(timeout));
});

// The Firebase SDK already performs its own network recovery. Retrying a timed
// out read starts another billable request while the original may still finish,
// so only retry one immediate, non-timeout failure.
const retryContentQuery = (failureCount, error) => (
  error?.code !== 'content/deadline-exceeded' && failureCount < 1
);

// --- Clusters ---
export function useClusters(options = {}) {
  return useQuery({
    queryKey: ['clusters'],
    queryFn: async () => {
      const q = query(collection(db, 'clusters'), orderBy('order', 'asc'));
      const snap = await withContentQueryTimeout(getDocs(q), 'clusters');
      return snap.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
    },
    staleTime: 1000 * 60 * 30, // 30 mins
    gcTime: 1000 * 60 * 60,
    enabled: options.enabled ?? true,
    retry: retryContentQuery,
    refetchOnWindowFocus: false,
  });
}

// --- Regions ---
export function useRegion(regionId) {
  return useQuery({
    queryKey: ['region', regionId],
    queryFn: async () => {
      if (!regionId) return null;
      const docRef = doc(db, 'regions', regionId);
      const snap = await withContentQueryTimeout(getDoc(docRef), `region:${regionId}`);
      if (snap.exists()) return { ...snap.data(), id: snap.id, docId: snap.id };
      return null;
    },
    enabled: !!regionId,
    staleTime: 1000 * 60 * 60,
    retry: retryContentQuery,
    refetchOnWindowFocus: false,
  });
}

export function useRegions(clusterId = 'cluster_elementary', options = {}) {
  const cid = clusterId || 'cluster_elementary';
  const enabled = options.enabled ?? !!cid;
  return useQuery({
    queryKey: ['regions', cid],
    queryFn: async () => {
      // 1. Try specific cluster query first (efficient and respects rules)
      const q = query(
        collection(db, 'regions'), 
        where('clusterId', '==', cid)
      );
      const snap = await withContentQueryTimeout(getDocs(q), `regions:${cid}`);
      let data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id, docId: doc.id }));

      // 2. Legacy Fallback: If elementary and no regions found, try fetching all
      if (cid === 'cluster_elementary' && data.length === 0) {
        try {
          const allSnap = await withContentQueryTimeout(getDocs(collection(db, 'regions')), 'regions:legacy');
          const legacy = allSnap.docs
            .map(doc => ({ ...doc.data(), id: doc.id, docId: doc.id }))
            .filter(r => !r.clusterId);
          if (legacy.length > 0) data = legacy;
        } catch (err) {
          console.warn("Legacy regions fetch failed (permission or other):", err);
        }
      }

      return data.sort((a, b) => (a.order || 0) - (b.order || 0));
    },
    enabled,
    staleTime: 1000 * 60 * 5,
    retry: retryContentQuery,
    refetchOnWindowFocus: false,
  });
}

// --- Chapters ---
export function useChapter(chapterId) {
  return useQuery({
    queryKey: ['chapter', chapterId],
    queryFn: async () => {
      if (!chapterId) return null;
      const docRef = doc(db, 'chapters', chapterId);
      const snap = await withContentQueryTimeout(getDoc(docRef), `chapter:${chapterId}`);
      if (snap.exists()) return { ...snap.data(), docId: snap.id };
      return null;
    },
    enabled: !!chapterId,
    staleTime: 1000 * 60 * 60,
    retry: retryContentQuery,
    refetchOnWindowFocus: false,
  });
}

export function useChapters(regionId) {
  return useQuery({
    queryKey: ['chapters', regionId],
    queryFn: async () => {
      if (!regionId) return [];
      console.log(`[DEBUG] Fetching chapters for region: ${regionId}`);
      try {
        const q = query(
          collection(db, 'chapters'), 
          where('regionId', '==', regionId)
        );
        const snap = await withContentQueryTimeout(getDocs(q), `chapters:${regionId}`);
        console.log(`[DEBUG] Found ${snap.size} chapters for ${regionId}`);
        const data = snap.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
        return data.sort((a, b) => (a.order || 0) - (b.order || 0));
      } catch (err) {
        console.error(`[CRITICAL] Error fetching chapters for ${regionId}:`, err);
        throw err;
      }
    },
    enabled: !!regionId,
    staleTime: 1000 * 60 * 5,  // 5 minutes - prevents unnecessary refetches
    gcTime: 1000 * 60 * 10,    // 10 minutes garbage collection
    retry: retryContentQuery,
    refetchOnWindowFocus: false,
  });
}

// --- Units ---
export function useUnits(chapterId) {
  return useQuery({
    queryKey: ['units', chapterId],
    queryFn: async () => {
      if (!chapterId) return [];
      console.log(`[DEBUG] Fetching units for chapter: ${chapterId}`);
      try {
        const q = query(
          collection(db, 'units'), 
          where('chapterId', '==', chapterId)
        );
        const snap = await withContentQueryTimeout(getDocs(q), `units:${chapterId}`);
        console.log(`[DEBUG] Found ${snap.size} units for ${chapterId}`);
        const data = snap.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
        return data.sort((a, b) => (a.order || 0) - (b.order || 0));
      } catch (err) {
        console.error(`[CRITICAL] Error fetching units for ${chapterId}:`, err);
        throw err;
      }
    },
    enabled: !!chapterId,
    staleTime: 1000 * 60 * 5,  // 5 minutes - prevents unnecessary refetches
    gcTime: 1000 * 60 * 10,    // 10 minutes garbage collection
    retry: retryContentQuery,
    refetchOnWindowFocus: false,
  });
}

// --- Single Unit ---
export function useUnit(unitId) {
  return useQuery({
    queryKey: ['unit', unitId],
    queryFn: async () => {
      if (!unitId) return null;
      console.log(`[DEBUG] Fetching single unit: ${unitId}`);
      try {
        const docRef = doc(db, 'units', unitId);
        const snap = await withContentQueryTimeout(getDoc(docRef), `unit:${unitId}`);
        if (snap.exists()) {
          return { ...snap.data(), docId: snap.id };
        }
        return null;
      } catch (err) {
        console.error(`[CRITICAL] Error fetching unit ${unitId}:`, err);
        throw err;
      }
    },
    enabled: !!unitId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: retryContentQuery,
    refetchOnWindowFocus: false,
  });
}

// --- Quizzes ---
export function useQuizzes(unitId) {
  return useQuery({
    queryKey: ['quizzes', unitId],
    queryFn: async () => {
      if (!unitId) return [];
      console.log(`[DEBUG] Fetching quizzes for unit: ${unitId} (FROM SERVER)`);
      try {
        const q = query(
          collection(db, 'quizzes'), 
          where('unitId', '==', unitId)
        );
        const snap = await withContentQueryTimeout(getDocs(q), `quizzes:${unitId}`);
        console.log(`[DEBUG] Found ${snap.size} quizzes for unit: ${unitId}`);
        const data = snap.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
        return data.sort((a, b) => (a.order || 0) - (b.order || 0));
      } catch (err) {
        console.error(`[CRITICAL] Error fetching quizzes for ${unitId}:`, err);
        throw err;
      }
    },
    enabled: !!unitId,
    staleTime: 1000 * 60 * 30, // 30 minutes of strong caching
    gcTime: 1000 * 60 * 60, // 1 hour garbage collection
    retry: retryContentQuery,
    refetchOnWindowFocus: false,
  });
}

// --- Code Trace Exercises ---
export function useCodeExercises(unitId) {
  return useQuery({
    queryKey: ['codeExercises', unitId],
    queryFn: async () => {
      if (!unitId) return [];
      const q = query(
        collection(db, 'codeExercises'),
        where('unitId', '==', unitId)
      );
      const snap = await withContentQueryTimeout(getDocs(q), `codeExercises:${unitId}`);
      const data = snap.docs.map(doc => sanitizeCodeTraceExercise({ ...doc.data(), docId: doc.id }));
      return data.sort((a, b) => (a.order || 0) - (b.order || 0));
    },
    enabled: !!unitId,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    retry: retryContentQuery,
    refetchOnWindowFocus: false,
  });
}

// --- Mutations Helper ---
export function useAdminMutations() {
  const queryClient = useQueryClient();

  return {
    // --- Cluster Mutations ---
    saveCluster: useMutation({
      mutationFn: async (data) => {
        // data.id가 비어있거나 ''인 경우 자동 생성
        const clusterId = (data.id && data.id.trim() !== '') ? data.id : `cluster_${Date.now()}`;
        
        // Firestore는 undefined 필드를 저장할 수 없으므로 null로 변환하거나 제외해야 함
        const cleanData = {};
        Object.keys(data).forEach(key => {
          if (data[key] !== undefined) {
            cleanData[key] = data[key];
          }
        });

        const finalData = { 
          ...cleanData, 
          id: clusterId
        };

        const saveAccessResource = httpsCallable(functions, 'adminSaveAccessResource');
        await saveAccessResource({ type: 'cluster', resource: finalData });
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clusters'] })
    }),
    deleteCluster: useMutation({
      mutationFn: async (clusterId) => {
        await deleteDoc(doc(db, 'clusters', clusterId));
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clusters'] })
    }),

    repairClusters: useMutation({
      mutationFn: async () => {
        const batch = writeBatch(db);
        // 1. Create default cluster
        batch.set(doc(db, 'clusters', 'cluster_elementary'), {
          id: 'cluster_elementary',
          name: '초등수학',
          isPrivate: false,
          order: 0
        }, { merge: true });

        // 2. Patch regions
        const snap = await getDocs(collection(db, 'regions'));
        snap.forEach(d => {
          if (!d.data().clusterId) {
            batch.update(d.ref, { clusterId: 'cluster_elementary' });
          }
        });
        await batch.commit();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['clusters'] });
        queryClient.invalidateQueries({ queryKey: ['regions'] });
      }
    }),

    // --- Region Mutations ---
    saveRegion: useMutation({
      mutationFn: async (data) => {
        const id = data.id || `reg_${Date.now()}`;
        const saveAccessResource = httpsCallable(functions, 'adminSaveAccessResource');
        await saveAccessResource({ type: 'region', resource: { ...data, id } });
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['regions'] })
    }),
    deleteRegion: useMutation({
      mutationFn: async (regionId) => {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'regions', regionId));
        // Note: For safety, recursive delete is complex. 
        // We'll trust the admin or implement basic chapter cleanup.
        const chapQ = query(collection(db, 'chapters'), where('regionId', '==', regionId));
        const chapSnap = await getDocs(chapQ);
        chapSnap.forEach(d => batch.delete(doc(db, 'chapters', d.id)));
        await batch.commit();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['regions'] });
        queryClient.invalidateQueries({ queryKey: ['chapters'] });
      }
    }),

    // --- Chapter Mutations ---
    saveChapter: useMutation({
      mutationFn: async (data) => {
        const id = data.docId || `${data.regionId}_${data.id || Date.now()}`;
        await setDoc(doc(db, 'chapters', id), { ...data, docId: id }, { merge: true });
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chapters'] })
    }),
    deleteChapter: useMutation({
      mutationFn: async (chapterDocId) => {
        const batch = writeBatch(db);
        const unitsQ = query(collection(db, 'units'), where('chapterId', '==', chapterDocId));
        const unitsSnap = await getDocs(unitsQ);
        
        // Also need to find quizzes in these units to delete images
        for (const uDoc of unitsSnap.docs) {
          const qQ = query(collection(db, 'quizzes'), where('unitId', '==', uDoc.id));
          const qSnap = await getDocs(qQ);
          for (const qDoc of qSnap.docs) {
            const qData = qDoc.data();
            if (qData.imageUrl) {
              try { await deleteObject(ref(storage, qData.imageUrl)); } catch (e) {}
            }
            batch.delete(doc(db, 'quizzes', qDoc.id));
          }
          batch.delete(doc(db, 'units', uDoc.id));
        }
        
        // --- Added: Delete the chapter document itself ---
        batch.delete(doc(db, 'chapters', chapterDocId));
        
        await batch.commit();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['chapters'] });
        queryClient.invalidateQueries({ queryKey: ['units'] });
      }
    }),

    // --- Unit Mutations ---
    saveUnit: useMutation({
      mutationFn: async (data) => {
        const id = data.docId || `${data.chapterId}_${data.id || Date.now()}`;
        await setDoc(doc(db, 'units', id), { 
          ...data, 
          docId: id,
          lastUpdated: serverTimestamp() 
        }, { merge: true });
      },
      onSuccess: (_result, data) => {
        const id = data?.docId || (data?.chapterId && data?.id ? `${data.chapterId}_${data.id}` : null);
        queryClient.invalidateQueries({ queryKey: ['units'] });
        if (id) queryClient.invalidateQueries({ queryKey: ['unit', id] });
      }
    }),
    deleteUnit: useMutation({
      mutationFn: async (unitDocId) => {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'units', unitDocId));
        const qQ = query(collection(db, 'quizzes'), where('unitId', '==', unitDocId));
        const qSnap = await getDocs(qQ);
        
        for (const qDoc of qSnap.docs) {
          const qData = qDoc.data();
          if (qData.imageUrl) {
            try { await deleteObject(ref(storage, qData.imageUrl)); } catch (e) {}
          }
          batch.delete(doc(db, 'quizzes', qDoc.id));
        }
        await batch.commit();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['units'] });
        queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      }
    }),

    // --- Quiz Mutations ---
    saveQuiz: useMutation({
      mutationFn: async (quizData) => {
        const id = quizData.id || `q_${Date.now()}`;
        const batch = writeBatch(db);
        
        // 1. Save the quiz
        batch.set(doc(db, 'quizzes', id), { ...quizData, id }, { merge: true });
        
        // 2. Bump the parent unit's timestamp to signal update
        if (quizData.unitId) {
          batch.update(doc(db, 'units', quizData.unitId), {
            lastUpdated: serverTimestamp()
          });
        }
        
        await batch.commit();
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['quizzes', variables.unitId] });
      }
    }),
    deleteQuiz: useMutation({
      mutationFn: async ({ quizId, unitId }) => {
        const quizDoc = await getDoc(doc(db, 'quizzes', quizId));
        const quizData = quizDoc.data();
        
        const batch = writeBatch(db);

        if (quizData?.imageUrl) {
          try { await deleteObject(ref(storage, quizData.imageUrl)); } catch (err) {}
        }
        
        batch.delete(doc(db, 'quizzes', quizId));
        
        // Bump timestamp
        if (unitId) {
          batch.update(doc(db, 'units', unitId), {
            lastUpdated: serverTimestamp()
          });
        }

        await batch.commit();
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quizzes'] })
    }),

    // --- Code Trace Mutations ---
    saveCodeExercise: useMutation({
      mutationFn: async (exerciseData) => {
        const id = exerciseData.id || `code_${Date.now()}`;
        const batch = writeBatch(db);

        batch.set(doc(db, 'codeExercises', id), { ...exerciseData, id }, { merge: true });

        if (exerciseData.unitId) {
          batch.update(doc(db, 'units', exerciseData.unitId), {
            lastUpdated: serverTimestamp(),
            'contentFlags.hasCodeTrace': true
          });
        }

        await batch.commit();
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['codeExercises', variables.unitId] });
        queryClient.invalidateQueries({ queryKey: ['units'] });
      }
    }),
    deleteCodeExercise: useMutation({
      mutationFn: async ({ exerciseId, unitId }) => {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'codeExercises', exerciseId));
        if (unitId) {
          batch.update(doc(db, 'units', unitId), {
            lastUpdated: serverTimestamp()
          });
        }
        await batch.commit();
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['codeExercises', variables.unitId] });
      }
    })
  };
}
