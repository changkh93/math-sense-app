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
  getDoc
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';

// --- Regions ---
export function useRegions() {
  return useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      const q = query(collection(db, 'regions'), orderBy('order', 'asc'));
      const snap = await getDocs(q);
      return snap.docs.map(doc => doc.data());
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
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
    enabled: !!regionId
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
    enabled: !!chapterId
  });
}

// --- Quizzes ---
export function useQuizzes(unitId) {
  return useQuery({
    queryKey: ['quizzes', unitId],
    queryFn: async () => {
      if (!unitId) return [];
      console.log(`[DEBUG] Fetching quizzes for unit: ${unitId}`);
      try {
        const q = query(
          collection(db, 'quizzes'), 
          where('unitId', '==', unitId)
          // orderBy('order', 'asc')
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
    enabled: !!unitId
  });
}

// --- Mutations Helper ---
export function useAdminMutations() {
  const queryClient = useQueryClient();

  return {
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
        await setDoc(doc(db, 'units', id), { ...data, docId: id }, { merge: true });
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
        await setDoc(doc(db, 'quizzes', id), { ...quizData, id }, { merge: true });
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['quizzes', variables.unitId] });
      }
    }),
    deleteQuiz: useMutation({
      mutationFn: async (quizId) => {
        // First get the quiz to find the imageUrl
        const quizDoc = await getDoc(doc(db, 'quizzes', quizId));
        const quizData = quizDoc.data();
        
        if (quizData?.imageUrl) {
          try {
            const imageRef = ref(storage, quizData.imageUrl);
            await deleteObject(imageRef);
          } catch (err) {
            console.error("Storage deletion failed during quiz delete", err);
            // We continue deleting the doc even if image deletion fails
          }
        }
        await deleteDoc(doc(db, 'quizzes', quizId));
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quizzes'] })
    })
  };
}
