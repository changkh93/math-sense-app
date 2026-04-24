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
  limit,
  runTransaction
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { recordCrystalTransaction } from '../utils/crystalLedger';
import { calculateGrowthUpdates } from '../utils/rankingUtils';
import {
  AGORA_ASKER_RESOLVE_REWARD,
  AGORA_BASE_ACCEPT_REWARD,
  AGORA_PARTIAL_REFUND_RATIO,
  AGORA_SELF_RESOLVE_REWARD,
  buildAnswerProfileSnapshot
} from '../utils/socialUtils';

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
const getLockedBountyAmount = (questionData = {}) =>
  questionData?.bountyStatus === 'locked' ? Math.max(0, questionData?.bountyAmount || 0) : 0;

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

        // Fetch studentName from profile for correct display
        let resolvedName = user.displayName || '익명 학생';
        let answererProfile = buildAnswerProfileSnapshot({}, resolvedName);
        try {
          const userSnap = await getDoc(doc(db, 'users', user.uid));
          if (userSnap.exists()) {
            const ud = userSnap.data();
            resolvedName = ud.studentName || ud.name || resolvedName;
            answererProfile = buildAnswerProfileSnapshot(ud, resolvedName);
          }
        } catch (e) { /* fallback to displayName */ }

        const answerData = {
          questionId,
          userId: user.uid,
          userName: resolvedName,
          isTeacher,
          content,
          isAccepted: false,
          publicProfileSnapshot: answererProfile,
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
              publicProfileSnapshot: buildAnswerProfileSnapshot({}, auth.currentUser?.displayName || '익명 학생'),
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
        queryClient.invalidateQueries({ queryKey: ['publicQuestions'] });
      }
    }),

    // Accept Answer (Reward implementation)
    acceptAnswer: useMutation({
      mutationFn: async ({ questionId, answerId }) => {
        const user = auth.currentUser;
        if (!user) throw new Error('로그인이 필요합니다.');

        await runTransaction(db, async (transaction) => {
          const questionRef = doc(db, 'questions', questionId);
          const answerRef = doc(db, 'answers', answerId);
          const askerRef = doc(db, 'users', user.uid);

          const questionSnap = await transaction.get(questionRef);
          const answerSnap = await transaction.get(answerRef);
          const askerSnap = await transaction.get(askerRef);

          if (!questionSnap.exists()) throw new Error('질문을 찾을 수 없습니다.');
          if (!answerSnap.exists()) throw new Error('답변을 찾을 수 없습니다.');

          const questionData = questionSnap.data();
          const answerData = answerSnap.data();

          if (questionData.userId !== user.uid) throw new Error('질문 작성자만 답변을 채택할 수 있습니다.');
          if (questionData.status === 'resolved') throw new Error('이미 해결된 질문입니다.');

          const answererUid = answerData.userId;
          const lockedBounty = getLockedBountyAmount(questionData);
          const totalAnswerReward = AGORA_BASE_ACCEPT_REWARD + lockedBounty;

          transaction.set(answerRef, {
            isAccepted: true,
            acceptedAt: serverTimestamp(),
          }, { merge: true });

          transaction.set(questionRef, {
            status: 'resolved',
            acceptedAnswerId: answerId,
            updatedAt: serverTimestamp(),
            bountyStatus: lockedBounty > 0 ? 'awarded' : (questionData.bountyStatus || 'none'),
            bountyAwardedToAnswerId: lockedBounty > 0 ? answerId : null,
          }, { merge: true });

          if (answererUid !== user.uid && answererUid !== 'admin') {
            const answererRef = doc(db, 'users', answererUid);
            const answererSnap = await transaction.get(answererRef);
            const answererData = answererSnap.exists() ? answererSnap.data() : {};

            transaction.set(answererRef, {
              crystals: (answererData?.crystals || 0) + totalAnswerReward,
              helpCount: (answererData?.helpCount || 0) + 1,
              ...calculateGrowthUpdates(answererData, totalAnswerReward),
            }, { merge: true });

            recordCrystalTransaction(answererUid, {
              amount: AGORA_BASE_ACCEPT_REWARD,
              type: 'answer_accepted',
              description: '답변이 채택되었습니다',
              metadata: { questionId, answerId }
            }, transaction, `answer-accepted-${questionId}`);

            if (lockedBounty > 0) {
              recordCrystalTransaction(answererUid, {
                amount: lockedBounty,
                type: 'agora_bounty_award',
                description: '현상금 질문 보상을 받았습니다',
                metadata: { questionId, answerId }
              }, transaction, `agora-bounty-award-${questionId}`);
            }
          }

          const askerData = askerSnap.exists() ? askerSnap.data() : {};
          transaction.set(askerRef, {
            crystals: (askerData?.crystals || 0) + AGORA_ASKER_RESOLVE_REWARD,
            ...calculateGrowthUpdates(askerData, AGORA_ASKER_RESOLVE_REWARD),
          }, { merge: true });

          recordCrystalTransaction(user.uid, {
            amount: AGORA_ASKER_RESOLVE_REWARD,
            type: 'question_resolved',
            description: '질문 해결 보너스',
            metadata: { questionId, answerId }
          }, transaction, `question-resolved-${questionId}`);
        });
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['answers', variables.questionId] });
        queryClient.invalidateQueries({ queryKey: ['question', variables.questionId] });
        queryClient.invalidateQueries({ queryKey: ['publicQuestions'] });
        queryClient.invalidateQueries({ queryKey: ['qaRanking'] });
      }
    }),

    // Self Resolve
    selfResolve: useMutation({
      mutationFn: async ({ questionId, reason }) => {
        const user = auth.currentUser;
        if (!user) throw new Error('로그인이 필요합니다.');

        await runTransaction(db, async (transaction) => {
          const questionRef = doc(db, 'questions', questionId);
          const userRef = doc(db, 'users', user.uid);
          const questionSnap = await transaction.get(questionRef);
          const userSnap = await transaction.get(userRef);

          if (!questionSnap.exists()) throw new Error('질문을 찾을 수 없습니다.');

          const questionData = questionSnap.data();
          if (questionData.userId !== user.uid) throw new Error('질문 작성자만 해결 처리를 할 수 있습니다.');

          const lockedBounty = getLockedBountyAmount(questionData);
          const hasAnswers = (questionData.answerCount || 0) > 0;
          const refundedBounty = lockedBounty > 0
            ? (hasAnswers ? Math.floor(lockedBounty * AGORA_PARTIAL_REFUND_RATIO) : lockedBounty)
            : 0;
          const userData = userSnap.exists() ? userSnap.data() : {};

          transaction.set(questionRef, {
            status: 'resolved',
            resolutionType: 'self',
            resolutionReason: reason,
            updatedAt: serverTimestamp(),
            bountyStatus: refundedBounty > 0
              ? (refundedBounty === lockedBounty ? 'refunded' : 'split')
              : (questionData.bountyStatus || 'none'),
            refundedBountyAmount: refundedBounty,
          }, { merge: true });

          transaction.set(userRef, {
            crystals: (userData?.crystals || 0) + AGORA_SELF_RESOLVE_REWARD + refundedBounty,
            ...calculateGrowthUpdates(userData, AGORA_SELF_RESOLVE_REWARD),
          }, { merge: true });

          recordCrystalTransaction(user.uid, {
            amount: AGORA_SELF_RESOLVE_REWARD,
            type: 'self_resolve',
            description: '스스로 해결 보너스',
            metadata: { questionId }
          }, transaction, `self-resolve-${questionId}`);

          if (refundedBounty > 0) {
            recordCrystalTransaction(user.uid, {
              amount: refundedBounty,
              type: 'agora_bounty_refund',
              description: hasAnswers ? '현상금 일부가 환불되었습니다' : '현상금이 전액 환불되었습니다',
              metadata: { questionId, refundedBounty, hasAnswers }
            }, transaction, `agora-bounty-refund-${questionId}`);
          }
        });
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['question', variables.questionId] });
        queryClient.invalidateQueries({ queryKey: ['publicQuestions'] });
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
        const user = auth.currentUser;
        if (!user) throw new Error('로그인이 필요합니다.');

        await runTransaction(db, async (transaction) => {
          const questionRef = doc(db, 'questions', questionId);
          const userRef = doc(db, 'users', user.uid);
          const questionSnap = await transaction.get(questionRef);
          const userSnap = await transaction.get(userRef);

          if (!questionSnap.exists()) return;

          const questionData = questionSnap.data();
          if (questionData.userId !== user.uid) throw new Error('질문 작성자만 삭제할 수 있습니다.');

          const lockedBounty = getLockedBountyAmount(questionData);
          const userData = userSnap.exists() ? userSnap.data() : {};

          transaction.delete(questionRef);

          if (lockedBounty > 0) {
            transaction.set(userRef, {
              crystals: (userData?.crystals || 0) + lockedBounty,
            }, { merge: true });

            recordCrystalTransaction(user.uid, {
              amount: lockedBounty,
              type: 'agora_bounty_refund',
              description: '삭제된 질문의 현상금이 환불되었습니다',
              metadata: { questionId }
            }, transaction, `agora-bounty-delete-refund-${questionId}`);
          }
        });
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

        // Fetch studentName from profile for correct display
        let resolvedName = user.displayName || '탐험가';
        try {
          const userSnap = await getDoc(doc(db, 'users', user.uid));
          if (userSnap.exists()) {
            const ud = userSnap.data();
            resolvedName = ud.studentName || ud.name || resolvedName;
          }
        } catch (e) { /* fallback to displayName */ }

        // Get user data for level/tier if possible
        const msgData = {
          userId: user.uid,
          userName: resolvedName,
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
