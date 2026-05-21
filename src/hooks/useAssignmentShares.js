import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../firebase';

export const ASSIGNMENT_SHARE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value.seconds) return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

export function useAssignmentShareCooldown(userId) {
  return useQuery({
    queryKey: ['assignmentShares', 'cooldown', userId],
    queryFn: async () => {
      if (!userId) return { canShare: false, lastShare: null, nextAvailableAt: null };
      const q = query(collection(db, 'assignmentShares'), where('ownerId', '==', userId));
      const snap = await getDocs(q);
      const shares = snap.docs
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => toMillis(b.publishedAt) - toMillis(a.publishedAt));
      const lastShare = shares[0] || null;
      const lastMs = toMillis(lastShare?.publishedAt);
      const nextMs = lastMs ? lastMs + ASSIGNMENT_SHARE_COOLDOWN_MS : 0;
      return {
        canShare: !lastMs || Date.now() >= nextMs,
        lastShare,
        nextAvailableAt: nextMs ? new Date(nextMs) : null
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 30
  });
}

export function usePublicAssignmentShares() {
  return useQuery({
    queryKey: ['assignmentShares', 'public'],
    queryFn: async () => {
      const q = query(
        collection(db, 'assignmentShares'),
        orderBy('publishedAt', 'desc'),
        limit(30)
      );
      const snap = await getDocs(q);
      return snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    },
    staleTime: 1000 * 30,
    refetchInterval: 30000
  });
}

export function useAssignmentShareComments(shareId) {
  return useQuery({
    queryKey: ['assignmentShares', shareId, 'comments'],
    queryFn: async () => {
      if (!shareId) return [];
      const q = query(
        collection(db, 'assignmentShares', shareId, 'comments'),
        orderBy('createdAt', 'asc'),
        limit(40)
      );
      const snap = await getDocs(q);
      return snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    },
    enabled: !!shareId,
    staleTime: 1000 * 20
  });
}

export function useAssignmentShareMutations() {
  const queryClient = useQueryClient();

  const invalidateShares = (shareId, ownerId) => {
    queryClient.invalidateQueries({ queryKey: ['assignmentShares', 'public'] });
    if (shareId) {
      queryClient.invalidateQueries({ queryKey: ['assignmentShares', shareId, 'comments'] });
    }
    if (ownerId) {
      queryClient.invalidateQueries({ queryKey: ['assignmentShares', 'cooldown', ownerId] });
    }
  };

  return {
    publish: useMutation({
      mutationFn: async ({ assignmentId, kind, dailySummary }) => {
        const publishAssignmentShare = httpsCallable(functions, 'publishAssignmentShare');
        const result = await publishAssignmentShare({ assignmentId, kind, dailySummary });
        return result.data;
      },
      onSuccess: (data) => invalidateShares(data?.shareId, auth.currentUser?.uid)
    }),
    react: useMutation({
      mutationFn: async ({ shareId, reaction }) => {
        const reactAssignmentShare = httpsCallable(functions, 'reactAssignmentShare');
        const result = await reactAssignmentShare({ shareId, reaction });
        return result.data;
      },
      onSuccess: (_, variables) => invalidateShares(variables?.shareId)
    }),
    comment: useMutation({
      mutationFn: async ({ shareId, content }) => {
        const commentAssignmentShare = httpsCallable(functions, 'commentAssignmentShare');
        const result = await commentAssignmentShare({ shareId, content });
        return result.data;
      },
      onSuccess: (_, variables) => invalidateShares(variables?.shareId)
    })
  };
}
