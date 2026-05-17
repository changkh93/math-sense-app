import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  startAfter,
  runTransaction
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, auth, functions } from '../firebase';
import { recordCrystalTransaction } from '../utils/crystalLedger';
import { calculateGrowthUpdates } from '../utils/rankingUtils';
import {
  AGORA_PARTIAL_REFUND_RATIO,
  AGORA_SELF_RESOLVE_REWARD,
  buildAnswerProfileSnapshot
} from '../utils/socialUtils';

// --- Fetch Public Questions (Agora Board) with Cursor Pagination ---
const PAGE_SIZE = 20;

export function usePublicQuestions(filter = 'all') {
  return useInfiniteQuery({
    queryKey: ['publicQuestions', filter],
    queryFn: async ({ pageParam }) => {
      try {
        const constraints = [];

        if (filter === 'my') {
          const user = auth.currentUser;
          if (!user) return { items: [], lastDoc: null };
          constraints.push(where('userId', '==', user.uid));
        } else if (filter === 'unanswered') {
          constraints.push(where('isPublic', '==', true));
          constraints.push(where('status', '==', 'open'));
        } else if (filter === 'solved') {
          constraints.push(where('isPublic', '==', true));
          constraints.push(where('status', 'in', ['resolved', 'answered']));
        } else {
          constraints.push(where('isPublic', '==', true));
        }

        constraints.push(orderBy('createdAt', 'desc'));

        // Cursor: start after the last document from previous page
        if (pageParam) {
          constraints.push(startAfter(pageParam));
        }

        constraints.push(limit(PAGE_SIZE));

        const q = query(collection(db, 'questions'), ...constraints);
        const snap = await getDocs(q);
        const items = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;

        return { items, lastDoc };
      } catch (error) {
        console.error('❌ usePublicQuestions error:', error);
        throw error;
      }
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => {
      // If we got fewer items than PAGE_SIZE, there are no more pages
      if (!lastPage?.lastDoc || lastPage.items.length < PAGE_SIZE) return undefined;
      return lastPage.lastDoc;
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
    // FUNDAMENTAL IMPROVEMENT: Use data already in the Agora board cache (paginated)
    initialData: () => {
      const findInCache = (filterKey) => {
        const cached = queryClient.getQueryData(['publicQuestions', filterKey]);
        if (!cached?.pages) return undefined;
        for (const page of cached.pages) {
          const found = page.items.find(q => q.id === questionId);
          if (found) return found;
        }
        return undefined;
      };
      return findInCache('all') || findInCache('unanswered') || findInCache('solved');
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

        // Apply optimistic update to all cached question lists (paginated shape)
        listKeys.forEach(key => {
          queryClient.setQueryData(key, (old) => {
            if (!old?.pages) return old;
            return {
              ...old,
              pages: old.pages.map(page => ({
                ...page,
                items: page.items.map(toggleQuestion)
              }))
            };
          });
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

        const acceptAgoraAnswer = httpsCallable(functions, 'acceptAgoraAnswer');
        await acceptAgoraAnswer({ questionId, answerId });
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
        await runTransaction(db, async (transaction) => {
          const answerRef = doc(db, 'answers', answerId);
          const answerSnap = await transaction.get(answerRef);
          if (!answerSnap.exists()) throw new Error('답변을 찾을 수 없습니다.');

          const answerData = answerSnap.data() || {};
          if (answerData.isVerified) return;

          const answererUid = answerData.userId;
          const answererRef = answererUid && answererUid !== 'admin'
            ? doc(db, 'users', answererUid)
            : null;
          const answererSnap = answererRef ? await transaction.get(answererRef) : null;

          transaction.set(answerRef, {
            isVerified: true,
            verifiedAt: serverTimestamp(),
          }, { merge: true });

          if (!answererRef || !answererSnap?.exists()) return;

          const answererData = answererSnap.data() || {};
          transaction.set(answererRef, {
            crystals: Number(answererData.crystals || 0) + 10,
            ...calculateGrowthUpdates(answererData, 10),
          }, { merge: true });

          recordCrystalTransaction(answererUid, {
            amount: 10,
            type: 'teacher_verify',
            description: '교사 검증 보너스',
            metadata: { questionId, answerId, source: 'teacher_verify_transaction' }
          }, transaction, `teacher-verify-${answerId}`);
        });
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
      staleTime: 1000 * 10,     // 10 seconds
      refetchInterval: 15000     // 15 seconds (reduced from 5s to save reads)
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
