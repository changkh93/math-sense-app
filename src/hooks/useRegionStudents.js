import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, getDoc, doc, setDoc, deleteDoc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

export function useRegionStudents(regionId) {
  return useQuery({
    queryKey: ['regionStudents', regionId],
    queryFn: async () => {
      if (!regionId) return [];
      const snap = await getDocs(collection(db, 'regions', regionId, 'students'));
      const studentsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const userSnaps = await Promise.all(studentsData.map(s => getDoc(doc(db, 'users', s.id))));
      userSnaps.forEach((userSnap, i) => {
        if (userSnap.exists()) {
          const uData = userSnap.data();
          studentsData[i].name = uData.name || uData.displayName || uData.profileName || studentsData[i].displayName;
        }
      });
      
      return studentsData;
    },
    enabled: !!regionId,
  });
}

export function useRegionStudentMutations() {
  const queryClient = useQueryClient();

  return {
    updateStudentStatus: useMutation({
      mutationFn: async ({ regionId, userId, status }) => {
        const batch = writeBatch(db);
        
        // Update in region subcollection
        const studentRef = doc(db, 'regions', regionId, 'students', userId);
        batch.update(studentRef, { status, updatedAt: serverTimestamp() });

        // Update in user's profile
        const userRef = doc(db, 'users', userId);
        batch.set(userRef, {
          regionAccess: {
            [regionId]: status
          }
        }, { merge: true });

        await batch.commit();
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['regionStudents', variables.regionId] });
      }
    }),
    
    removeStudent: useMutation({
      mutationFn: async ({ regionId, userId }) => {
        const batch = writeBatch(db);
        
        // Remove from region subcollection
        const studentRef = doc(db, 'regions', regionId, 'students', userId);
        batch.delete(studentRef);

        // Remove access from user profile (we can set to 'removed' or delete the key, setting to 'removed' is safer for history if needed, but deleting is cleaner. Let's delete it using field deletion or just set it to 'none')
        // Firestore merge doesn't easily delete nested object keys without deleteField(), so we'll just set it to 'removed'
        const userRef = doc(db, 'users', userId);
        batch.set(userRef, {
          regionAccess: {
            [regionId]: 'removed'
          }
        }, { merge: true });

        await batch.commit();
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['regionStudents', variables.regionId] });
      }
    })
  };
}
