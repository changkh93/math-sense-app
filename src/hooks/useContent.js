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
import { db, storage } from '../firebase';

// --- Clusters ---
export function useClusters() {
  return useQuery({
    queryKey: ['clusters'],
    queryFn: async () => {
      const q = query(collection(db, 'clusters'), orderBy('order', 'asc'));
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
    },
    staleTime: 1000 * 60 * 30, // 30 mins
  });
}

// --- Regions ---
export function useRegions(clusterId = 'cluster_elementary') {
  const cid = clusterId || 'cluster_elementary';
  return useQuery({
    queryKey: ['regions', cid],
    queryFn: async () => {
      // 1. Try specific cluster query first (efficient and respects rules)
      const q = query(
        collection(db, 'regions'), 
        where('clusterId', '==', cid)
      );
      const snap = await getDocs(q);
      let data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id, docId: doc.id }));

      // 2. Legacy Fallback: If elementary and no regions found, try fetching all
      if (cid === 'cluster_elementary' && data.length === 0) {
        try {
          const allSnap = await getDocs(collection(db, 'regions'));
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
    staleTime: 1000 * 60 * 5,
    retry: 2
  });
}

// --- Chapters ---
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
        const snap = await getDocs(q);
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
        const snap = await getDocs(q);
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
        const snap = await getDoc(docRef);
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
        const snap = await getDocs(q);
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
          id: clusterId,
          updatedAt: serverTimestamp()
        };

        console.log('Final clean data to Firestore:', finalData);
        await setDoc(doc(db, 'clusters', clusterId), finalData, { merge: true });
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
        await setDoc(doc(db, 'regions', id), { ...data, id }, { merge: true });
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
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['units'] })
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
    })
  };
}
