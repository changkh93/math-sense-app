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
  getDoc
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
          data = data.filter(item => item.status === 'open');
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
export function useQAMutations() {
  const queryClient = useQueryClient();

  return {
    // Upvote (Curious Too)
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

    // Add Answer
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

    // Accept Answer
    acceptAnswer: useMutation({
      mutationFn: async ({ questionId, answerId }) => {
        const batch = doc(db, 'answers', answerId);
        await updateDoc(batch, { isAccepted: true });
        
        // Also update question status to resolved
        await updateDoc(doc(db, 'questions', questionId), {
          status: 'resolved',
          updatedAt: serverTimestamp()
        });
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['answers', variables.questionId] });
        queryClient.invalidateQueries({ queryKey: ['question', variables.questionId] });
      }
    }),

    // Self Resolve
    selfResolve: useMutation({
      mutationFn: async ({ questionId, reason }) => {
        await updateDoc(doc(db, 'questions', questionId), {
          status: 'resolved',
          resolutionType: 'self',
          resolutionReason: reason,
          updatedAt: serverTimestamp()
        });
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['question', variables.questionId] });
      }
    })
  };
}
