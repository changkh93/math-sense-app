import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  doc, 
  addDoc, 
  updateDoc,
  serverTimestamp,
  increment,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase';

// --- Fetch Public Questions (Agora Board) ---
export function usePublicQuestions(filter = 'all') {
  return useQuery({
    queryKey: ['publicQuestions', filter],
    queryFn: async () => {
      try {
        console.log('📡 usePublicQuestions: Fetching with filter:', filter);
        let q = query(
          collection(db, 'questions'),
          where('isPublic', '==', true),
          orderBy('createdAt', 'desc')
        );

        const snap = await getDocs(q);
        console.log(`✅ usePublicQuestions: ${snap.size} questions fetched.`);
        let data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));

        if (filter === 'my') {
          data = data.filter(item => item.userId === auth.currentUser?.uid);
        } else if (filter === 'unanswered') {
          // Both 'open' and 'answered' are considered "Waiting" until resolved
          data = data.filter(item => item.status === 'open' || item.status === 'answered');
        } else if (filter === 'solved') {
          data = data.filter(item => item.status === 'resolved');
        }

        return data;
      } catch (error) {
        console.error('❌ usePublicQuestions error:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60, // 1 minute
  });
}

// --- Fetch Single Question Detail ---
export function useQuestionDetail(questionId) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['question', questionId],
    queryFn: async () => {
      if (!questionId) return null;
      const docRef = doc(db, 'questions', questionId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) throw new Error('질문을 찾을 수 없습니다.');
      return { ...snap.data(), id: snap.id };
    },
    enabled: !!questionId,
    // FUNDAMENTAL IMPROVEMENT: Use data already in the Agora board cache
    initialData: () => {
      // Check all filters in the cache for this question
      const cached = queryClient.getQueryData(['publicQuestions', 'all'])?.find(q => q.id === questionId) ||
                     queryClient.getQueryData(['publicQuestions', 'unanswered'])?.find(q => q.id === questionId) ||
                     queryClient.getQueryData(['publicQuestions', 'solved'])?.find(q => q.id === questionId);
      return cached;
    },
    staleTime: 1000 * 30, // 30 seconds
  });
}

// --- Fetch Answers for Question ---
export function useQuestionAnswers(questionId) {
  return useQuery({
    queryKey: ['answers', questionId],
    queryFn: async () => {
      if (!questionId) return [];
      const q = query(
        collection(db, 'answers'),
        where('questionId', '==', questionId),
        orderBy('createdAt', 'asc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    },
    enabled: !!questionId
  });
}

// --- Q&A Mutations ---
// --- Fetch Top Helpers (Ranking) ---
export function useQARanking() {
  return useQuery({
    queryKey: ['qaRanking'],
    queryFn: async () => {
      const q = query(
        collection(db, 'users'),
        where('helpCount', '>', 0),
        orderBy('helpCount', 'desc'),
        limit(10)
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    staleTime: 1000 * 60 * 5 // 5 minutes
  });
}

// --- Q&A Mutations ---
export function useQAMutations() {
  const queryClient = useQueryClient();

  return {
    // ... (upvote and addAnswer remain same, or I'll include them for context)
    upvote: useMutation({
      mutationFn: async (questionId) => {
        const docRef = doc(db, 'questions', questionId);
        await updateDoc(docRef, {
          upvotes: increment(1)
        });
      },
      onSuccess: (_, questionId) => {
        queryClient.invalidateQueries({ queryKey: ['publicQuestions'] });
        queryClient.invalidateQueries({ queryKey: ['question', questionId] });
      }
    }),

    addAnswer: useMutation({
      mutationFn: async ({ questionId, content, isTeacher = false }) => {
        const user = auth.currentUser;
        if (!user) throw new Error('로그인이 필요합니다.');

        const answerData = {
          questionId,
          userId: user.uid,
          userName: user.displayName || '익명 학생',
          isTeacher,
          content,
          isAccepted: false,
          createdAt: serverTimestamp()
        };

        const answerRef = await addDoc(collection(db, 'answers'), answerData);

        // Update question (answerCount + status if teacher)
        const updateData = {
          answerCount: increment(1),
          updatedAt: serverTimestamp()
        };
        
        if (isTeacher) {
          updateData.status = 'answered';
        }

        await updateDoc(doc(db, 'questions', questionId), updateData);

        return { id: answerRef.id, ...answerData };
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['answers', variables.questionId] });
        queryClient.invalidateQueries({ queryKey: ['question', variables.questionId] });
      }
    }),

    // Accept Answer (Reward implementation)
    acceptAnswer: useMutation({
      mutationFn: async ({ questionId, answerId }) => {
        const user = auth.currentUser;
        if (!user) throw new Error('로그인이 필요합니다.');

        // 1. Get Answer details to find answerer
        const answerSnap = await getDoc(doc(db, 'answers', answerId));
        if (!answerSnap.exists()) throw new Error('답변을 찾을 수 없습니다.');
        const answerData = answerSnap.data();
        const answererUid = answerData.userId;

        // 2. Atomic Updates
        // Mark answer as accepted
        await updateDoc(doc(db, 'answers', answerId), { isAccepted: true });
        
        // Mark question as resolved
        await updateDoc(doc(db, 'questions', questionId), {
          status: 'resolved',
          updatedAt: serverTimestamp()
        });

        // Reward Answerer (if not self and not teacher admin)
        if (answererUid !== user.uid && answererUid !== 'admin') {
           await updateDoc(doc(db, 'users', answererUid), {
             crystals: increment(20),
             helpCount: increment(1)
           });
        }

        // Reward Asker (Resolution Bonus)
        await updateDoc(doc(db, 'users', user.uid), {
          crystals: increment(5)
        });
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['answers', variables.questionId] });
        queryClient.invalidateQueries({ queryKey: ['question', variables.questionId] });
        queryClient.invalidateQueries({ queryKey: ['qaRanking'] });
      }
    }),

    // Self Resolve
    selfResolve: useMutation({
      mutationFn: async ({ questionId, reason }) => {
        const user = auth.currentUser;
        if (!user) throw new Error('로그인이 필요합니다.');

        await updateDoc(doc(db, 'questions', questionId), {
          status: 'resolved',
          resolutionType: 'self',
          resolutionReason: reason,
          updatedAt: serverTimestamp()
        });

        // Small reward for self-resolution
        await updateDoc(doc(db, 'users', user.uid), {
          crystals: increment(3)
        });
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['question', variables.questionId] });
      }
    }),

    // Teacher Verification (Bonus Reward)
    verifyAnswer: useMutation({
      mutationFn: async ({ questionId, answerId }) => {
        // Mark answer as verified
        await updateDoc(doc(db, 'answers', answerId), { isVerified: true });
        
        // Get answerer to reward
        const answerSnap = await getDoc(doc(db, 'answers', answerId));
        const answerData = answerSnap.data();
        if (answerData.userId && answerData.userId !== 'admin') {
          await updateDoc(doc(db, 'users', answerData.userId), {
            crystals: increment(10)
          });
        }
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['answers', variables.questionId] });
      }
    }),

    // Delete Question
    deleteQuestion: useMutation({
      mutationFn: async (questionId) => {
        await deleteDoc(doc(db, 'questions', questionId));
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['publicQuestions'] });
      }
    }),

    // Update Question
    updateQuestion: useMutation({
      mutationFn: async ({ questionId, content }) => {
        await updateDoc(doc(db, 'questions', questionId), {
          content,
          updatedAt: serverTimestamp()
        });
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['question', variables.questionId] });
        queryClient.invalidateQueries({ queryKey: ['publicQuestions'] });
      }
    })
  };
}
