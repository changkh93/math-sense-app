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
  deleteDoc,
  arrayUnion,
  arrayRemove,
  limit
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { recordCrystalTransaction } from '../utils/crystalLedger';
import { calculateGrowthUpdates } from '../utils/rankingUtils';

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
          // Only 'open' is considered "Waiting". 'Answered' is now "Solved".
          data = data.filter(item => item.status === 'open');
        } else if (filter === 'solved') {
          // Include both 'resolved' (completely closed) and 'answered' (has answer but not closed yet)
          // The user requested '해결됨' tab to show answered questions.
          data = data.filter(item => item.status === 'resolved' || item.status === 'answered');
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
// Lock map to prevent concurrent upvote mutations on the same question
const _upvoteLocks = new Map();

export function useQAMutations() {
  const queryClient = useQueryClient();

  return {
    upvote: useMutation({
      mutationFn: async (questionId) => {
        const user = auth.currentUser;
        if (!user) throw new Error('로그인이 필요합니다.');

        // Prevent concurrent mutations on the same question
        if (_upvoteLocks.get(questionId)) {
          throw new Error('__LOCKED__');
        }
        _upvoteLocks.set(questionId, true);

        try {
          const docRef = doc(db, 'questions', questionId);
          const snap = await getDoc(docRef);
          if (!snap.exists()) return;

          const data = snap.data();
          const upvotedBy = data.upvotedBy || [];
          const isUpvoted = upvotedBy.includes(user.uid);

          if (isUpvoted) {
            // Toggle off — derive count from array to stay in sync
            const newArray = upvotedBy.filter(uid => uid !== user.uid);
            await updateDoc(docRef, {
              upvotedBy: arrayRemove(user.uid),
              upvotes: newArray.length
            });
          } else {
            // Toggle on — derive count from array to stay in sync
            const newCount = upvotedBy.length + 1;
            await updateDoc(docRef, {
              upvotedBy: arrayUnion(user.uid),
              upvotes: newCount
            });
          }
        } finally {
          _upvoteLocks.delete(questionId);
        }
      },

      // Optimistic update: immediately show toggled state in UI
      onMutate: async (questionId) => {
        const user = auth.currentUser;
        if (!user) return {};

        // Cancel in-flight refetches so they don't overwrite our optimistic update
        await queryClient.cancelQueries({ queryKey: ['publicQuestions'] });
        await queryClient.cancelQueries({ queryKey: ['question', questionId] });

        // Snapshot previous values for rollback
        const prevLists = {};
        const listKeys = [['publicQuestions', 'all'], ['publicQuestions', 'unanswered'], ['publicQuestions', 'solved'], ['publicQuestions', 'my']];
        listKeys.forEach(key => {
          prevLists[key.join('/')] = queryClient.getQueryData(key);
        });
        const prevDetail = queryClient.getQueryData(['question', questionId]);

        // Helper: toggle a question object optimistically
        const toggleQuestion = (q) => {
          if (q.id !== questionId) return q;
          const upvotedBy = q.upvotedBy || [];
          const isUpvoted = upvotedBy.includes(user.uid);
          const newUpvotedBy = isUpvoted
            ? upvotedBy.filter(uid => uid !== user.uid)
            : [...upvotedBy, user.uid];
          return { ...q, upvotedBy: newUpvotedBy, upvotes: newUpvotedBy.length };
        };

        // Apply optimistic update to all cached question lists
        listKeys.forEach(key => {
          queryClient.setQueryData(key, (old) => old?.map(toggleQuestion));
        });

        // Apply to detail cache
        if (prevDetail) {
          queryClient.setQueryData(['question', questionId], toggleQuestion(prevDetail));
        }

        return { prevLists, prevDetail, questionId };
      },

      onError: (err, questionId, context) => {
        // Silently swallow lock errors (user just clicked too fast)
        if (err?.message === '__LOCKED__') return;

        // Rollback on real errors
        if (context?.prevLists) {
          Object.entries(context.prevLists).forEach(([key, data]) => {
            if (data !== undefined) {
              queryClient.setQueryData(key.split('/'), data);
            }
          });
        }
        if (context?.prevDetail) {
          queryClient.setQueryData(['question', context.questionId], context.prevDetail);
        }
      },

      onSettled: (_, err, questionId) => {
        // Skip refetch for lock errors since nothing changed server-side
        if (err?.message === '__LOCKED__') return;

        // After mutation completes (success or error), refetch to get authoritative data
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

        return { id: answerRef.id, ...answerData, createdAt: new Date() };
      },
      onMutate: async (newAnswer) => {
        const { questionId } = newAnswer;
        await queryClient.cancelQueries({ queryKey: ['answers', questionId] });
        const previousAnswers = queryClient.getQueryData(['answers', questionId]);

        if (previousAnswers) {
          queryClient.setQueryData(['answers', questionId], (old) => [
            ...(old || []),
            {
              id: `temp-${Date.now()}`,
              userId: auth.currentUser?.uid,
              userName: auth.currentUser?.displayName || '익명 학생',
              content: newAnswer.content,
              isTeacher: newAnswer.isTeacher,
              isAccepted: false,
              createdAt: new Date(),
              isOptimistic: true // UI indicator if needed
            }
          ]);
        }

        return { previousAnswers, questionId };
      },
      onError: (err, newAnswer, context) => {
        if (context?.previousAnswers) {
          queryClient.setQueryData(['answers', context.questionId], context.previousAnswers);
        }
      },
      onSettled: (data, error, variables) => {
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
           const answererSnap = await getDoc(doc(db, 'users', answererUid));
           let answererUpdates = {
             crystals: increment(20),
             helpCount: increment(1)
           };
           if (answererSnap.exists()) {
             answererUpdates = { ...answererUpdates, ...calculateGrowthUpdates(answererSnap.data(), 20) };
           }
           await updateDoc(doc(db, 'users', answererUid), answererUpdates);
           Object.assign(answererUpdates, { crystals: 20 });
           recordCrystalTransaction(answererUid, {
             amount: 20,
             type: 'answer_accepted',
             description: '답변이 채택되었습니다',
             metadata: { questionId }
           });
        }

        // Reward Asker (Resolution Bonus)
        const askerSnap = await getDoc(doc(db, 'users', user.uid));
        let askerUpdates = { crystals: increment(5) };
        if (askerSnap.exists()) {
           askerUpdates = { ...askerUpdates, ...calculateGrowthUpdates(askerSnap.data(), 5) };
        }
        await updateDoc(doc(db, 'users', user.uid), askerUpdates);
        recordCrystalTransaction(user.uid, {
          amount: 5,
          type: 'question_resolved',
          description: '질문 해결 보너스',
          metadata: { questionId }
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
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        let userUpdates = { crystals: increment(3) };
        if (userSnap.exists()) {
           userUpdates = { ...userUpdates, ...calculateGrowthUpdates(userSnap.data(), 3) };
        }
        await updateDoc(doc(db, 'users', user.uid), userUpdates);
        recordCrystalTransaction(user.uid, {
          amount: 3,
          type: 'self_resolve',
          description: '스스로 해결 보너스',
          metadata: { questionId }
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
          const answererSnap = await getDoc(doc(db, 'users', answerData.userId));
          let updateData = { crystals: increment(10) };
          if (answererSnap.exists()) {
            updateData = { ...updateData, ...calculateGrowthUpdates(answererSnap.data(), 10) };
          }
          await updateDoc(doc(db, 'users', answerData.userId), updateData);
          recordCrystalTransaction(answerData.userId, {
            amount: 10,
            type: 'teacher_verify',
            description: '교사 검증 보너스',
            metadata: { questionId, answerId }
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

// --- Star Messages (Short Shoutouts/Moods) ---
export function useStarMessages() {
  const queryClient = useQueryClient();

  // We'll return both the standard query and a way to listen in real-time if needed,
  // but for simplicity, let's keep useQuery and rely on shorter staleTime 
  // OR provide an expert real-time version.
  
  return {
    // Real-time listener for the ticker
    data: useQuery({
      queryKey: ['starMessages'],
      queryFn: async () => {
        // Fallback or Initial fetch
        const q = query(
          collection(db, 'starMessages'),
          orderBy('createdAt', 'desc'),
          limit(60) // Increased for better smart queue filtering
        );
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      },
      staleTime: 0, // Always check if there's new data
      refetchInterval: 5000 // Polling as a fallback for high-traffic
    }),

    post: useMutation({
      mutationFn: async ({ content, type = 'general', category = 'mood' }) => {
        const user = auth.currentUser;
        if (!user) throw new Error('로그인이 필요합니다.');

        // Get user data for level/tier if possible
        const msgData = {
          userId: user.uid,
          userName: user.displayName || '탐험가', // Now showing name
          content: content.trim(),
          type,
          category,
          endorseCount: 0,
          upvotedBy: [],
          createdAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, 'starMessages'), msgData);
        return { id: docRef.id, ...msgData };
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['starMessages'] });
      }
    }),

    boost: useMutation({
      mutationFn: async (messageId) => {
        const user = auth.currentUser;
        if (!user) return;
        
        const docRef = doc(db, 'starMessages', messageId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) return;
        const data = docSnap.data();
        
        // Prevent multiple boosts from the same user
        if (data.upvotedBy?.includes(user.uid)) {
          throw new Error('이미 응원한 메시지입니다.');
        }

        await updateDoc(docRef, {
          endorseCount: increment(1),
          upvotedBy: arrayUnion(user.uid)
        });
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['starMessages'] });
      }
    })
  };
}
