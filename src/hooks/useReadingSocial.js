import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { useAuth } from './useAuth';

const FEED_PAGE_SIZE = 12;
const COMMENTS_INITIAL_SIZE = 10;
const COMMENTS_PAGE_SIZE = 20;
const SOCIAL_STALE_TIME = 2 * 60 * 1000; // 2 minutes
const SOCIAL_GC_TIME = 20 * 60 * 1000; // 20 minutes

function generateCommandId(prefix = 'cmd') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * 1. useReadingShareFeed
 * Infinite query for reading shares (latest public feed or owner's feed)
 */
export function useReadingShareFeed({ ownerId = null } = {}) {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: ['readingShareFeed', { ownerId: ownerId || 'all' }],
    queryFn: async ({ pageParam = null }) => {
      let q = query(
        collection(db, 'readingShares'),
        where('status', '==', 'active'),
        orderBy('publishedAt', 'desc'),
        orderBy('__name__', 'desc'),
        limit(FEED_PAGE_SIZE + 1)
      );

      if (ownerId) {
        q = query(
          collection(db, 'readingShares'),
          where('ownerId', '==', ownerId),
          where('status', '==', 'active'),
          orderBy('publishedAt', 'desc'),
          orderBy('__name__', 'desc'),
          limit(FEED_PAGE_SIZE + 1)
        );
      }

      if (pageParam) {
        q = query(
          collection(db, 'readingShares'),
          where(ownerId ? 'ownerId' : 'status', '==', ownerId || 'active'),
          ...(ownerId ? [where('status', '==', 'active')] : []),
          orderBy('publishedAt', 'desc'),
          orderBy('__name__', 'desc'),
          startAfter(pageParam.publishedAt, pageParam.id),
          limit(FEED_PAGE_SIZE + 1)
        );
      }

      const snap = await getDocs(q);
      const docs = snap.docs;
      const hasMore = docs.length > FEED_PAGE_SIZE;
      const items = docs.slice(0, FEED_PAGE_SIZE).map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      const lastDoc = docs[docs.length - 2] || docs[docs.length - 1];
      const nextCursor = hasMore && lastDoc
        ? {
            publishedAt: lastDoc.data()?.publishedAt,
            id: lastDoc.id,
          }
        : null;

      return { items, nextCursor };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(user),
    staleTime: SOCIAL_STALE_TIME,
    gcTime: SOCIAL_GC_TIME,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/**
 * 2. useReadingShare
 * Fetch single reading share document
 */
export function useReadingShare(shareId, options = {}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['readingShare', shareId],
    queryFn: async () => {
      if (!shareId) return null;
      const ref = doc(db, 'readingShares', shareId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() };
    },
    enabled: Boolean(user && shareId && (options.enabled !== false)),
    initialData: options.initialData,
    staleTime: SOCIAL_STALE_TIME,
    gcTime: SOCIAL_GC_TIME,
    refetchOnWindowFocus: false,
  });
}

/**
 * 3. useMyReadingReaction
 * Lazy-load the current user's reaction for a specific share (Detail drawer only)
 */
export function useMyReadingReaction(shareId, { enabled = false } = {}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['myReadingReaction', shareId, user?.uid],
    queryFn: async () => {
      if (!shareId || !user?.uid) return null;
      const ref = doc(db, 'readingShares', shareId, 'reactions', user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;
      return snap.data()?.type || null;
    },
    enabled: Boolean(user?.uid && shareId && enabled),
    staleTime: SOCIAL_STALE_TIME,
    gcTime: SOCIAL_GC_TIME,
    refetchOnWindowFocus: false,
  });
}

/**
 * 4. useReadingShareComments
 * Lazy-load comments for a specific share (Detail drawer only)
 */
export function useReadingShareComments(shareId, { enabled = false } = {}) {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: ['readingShareComments', shareId],
    queryFn: async ({ pageParam = null }) => {
      const commentsColl = collection(db, 'readingShares', shareId, 'comments');
      const pageSize = pageParam ? COMMENTS_PAGE_SIZE : COMMENTS_INITIAL_SIZE;

      let q = query(
        commentsColl,
        where('status', 'in', ['visible', 'deleted']),
        orderBy('createdAt', 'asc'),
        orderBy('__name__', 'asc'),
        limit(pageSize + 1)
      );

      if (pageParam) {
        q = query(
          commentsColl,
          where('status', 'in', ['visible', 'deleted']),
          orderBy('createdAt', 'asc'),
          orderBy('__name__', 'asc'),
          startAfter(pageParam.createdAt, pageParam.id),
          limit(pageSize + 1)
        );
      }

      const snap = await getDocs(q);
      const docs = snap.docs;
      const hasMore = docs.length > pageSize;
      const comments = docs.slice(0, pageSize).map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      const lastDoc = docs[docs.length - 2] || docs[docs.length - 1];
      const nextCursor = hasMore && lastDoc
        ? {
            createdAt: lastDoc.data()?.createdAt,
            id: lastDoc.id,
          }
        : null;

      return { comments, nextCursor };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(user && shareId && enabled),
    staleTime: SOCIAL_STALE_TIME,
    gcTime: SOCIAL_GC_TIME,
    refetchOnWindowFocus: false,
  });
}

/**
 * 5. useReadingShareDraftSources
 * Fetch recent notes/assignments for drafting a share
 */
export function useReadingShareDraftSources(bookId, { enabled = false } = {}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['readingShareDraftSources', bookId],
    queryFn: async () => {
      if (!bookId) return { sources: [] };
      const callFn = httpsCallable(functions, 'getReadingShareDraftSources');
      const res = await callFn({ bookId });
      return res.data || { sources: [] };
    },
    enabled: Boolean(user && bookId && enabled),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * 6. Mutations
 */

// Publish / Reactivate
export function usePublishReadingShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookId, oneLine, reason, question, hasSpoiler, isPagePublic, page }) => {
      const commandId = generateCommandId('publish_share');
      const callFn = httpsCallable(functions, 'publishReadingShare');
      const res = await callFn({
        commandId,
        bookId,
        oneLine,
        reason,
        question,
        hasSpoiler,
        isPagePublic,
        page,
      });
      return res.data;
    },
    onSuccess: () => {
      // Invalidate feed only when publishing new share
      queryClient.invalidateQueries({ queryKey: ['readingShareFeed'] });
      queryClient.invalidateQueries({ queryKey: ['readingBooks'] });
      queryClient.invalidateQueries({ queryKey: ['readingBook'] });
    },
  });
}

// Update
export function useUpdateReadingShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shareId, oneLine, reason, question, hasSpoiler, isPagePublic, page }) => {
      const commandId = generateCommandId('update_share');
      const callFn = httpsCallable(functions, 'updateReadingShare');
      const res = await callFn({
        commandId,
        shareId,
        oneLine,
        reason,
        question,
        hasSpoiler,
        isPagePublic,
        page,
      });
      return res.data;
    },
    onSuccess: (data, variables) => {
      // Localized update for the specific share
      queryClient.setQueryData(['readingShare', variables.shareId], (old) => {
        if (!old) return old;
        return {
          ...old,
          review: {
            ...old.review,
            oneLine: variables.oneLine,
            reason: variables.reason || '',
            question: variables.question || '',
            hasSpoiler: Boolean(variables.hasSpoiler),
          },
          bookSnapshot: {
            ...old.bookSnapshot,
            page: variables.isPagePublic ? variables.page : null,
          },
          updatedAt: data.updatedAt,
        };
      });

      // Also update item inside feed pages without refetching feed
      queryClient.setQueriesData({ queryKey: ['readingShareFeed'] }, (old) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => {
              if (item.id !== variables.shareId) return item;
              return {
                ...item,
                review: {
                  ...item.review,
                  oneLine: variables.oneLine,
                  reason: variables.reason || '',
                  question: variables.question || '',
                  hasSpoiler: Boolean(variables.hasSpoiler),
                },
                bookSnapshot: {
                  ...item.bookSnapshot,
                  page: variables.isPagePublic ? variables.page : null,
                },
              };
            }),
          })),
        };
      });
    },
  });
}

// Withdraw
export function useWithdrawReadingShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shareId }) => {
      const commandId = generateCommandId('withdraw_share');
      const callFn = httpsCallable(functions, 'withdrawReadingShare');
      const res = await callFn({ commandId, shareId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingShareFeed'] });
      queryClient.invalidateQueries({ queryKey: ['readingBooks'] });
      queryClient.invalidateQueries({ queryKey: ['readingBook'] });
    },
  });
}

// Set Reaction (Goal-based, Localized Query Data update)
export function useSetReadingShareReaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ shareId, reactionType }) => {
      const callFn = httpsCallable(functions, 'setReadingShareReaction');
      const res = await callFn({ shareId, reactionType });
      return res.data;
    },
    onSuccess: (data, variables) => {
      const { shareId } = variables;
      const { reactionType, reactionCounts } = data;

      // Update my reaction query data
      if (user?.uid) {
        queryClient.setQueryData(['myReadingReaction', shareId, user.uid], reactionType);
      }

      // Update single share query data if open
      queryClient.setQueryData(['readingShare', shareId], (old) => {
        if (!old) return old;
        return {
          ...old,
          reactionCounts,
        };
      });

      // Update feed cards query data locally (NO feed refetch!)
      queryClient.setQueriesData({ queryKey: ['readingShareFeed'] }, (old) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => {
              if (item.id !== shareId) return item;
              return {
                ...item,
                reactionCounts,
              };
            }),
          })),
        };
      });
    },
  });
}

// Add Comment (Localized Query Data update)
export function useCommentReadingShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shareId, content }) => {
      const commandId = generateCommandId('comment');
      const callFn = httpsCallable(functions, 'commentReadingShare');
      const res = await callFn({ commandId, shareId, content });
      return res.data;
    },
    onSuccess: (data, variables) => {
      const { shareId } = variables;
      const { comment, commentCount } = data;

      // Append new comment to comments infinite query cache
      queryClient.setQueryData(['readingShareComments', shareId], (old) => {
        if (!old?.pages) return old;
        const pages = [...old.pages];
        const lastPageIdx = pages.length - 1;
        const lastPage = pages[lastPageIdx];
        pages[lastPageIdx] = {
          ...lastPage,
          comments: [...(lastPage.comments || []), comment],
        };
        return { ...old, pages };
      });

      // Update parent share commentCount
      queryClient.setQueryData(['readingShare', shareId], (old) => {
        if (!old) return old;
        return { ...old, commentCount };
      });

      // Update feed cards commentCount locally (NO feed refetch!)
      queryClient.setQueriesData({ queryKey: ['readingShareFeed'] }, (old) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => {
              if (item.id !== shareId) return item;
              return { ...item, commentCount };
            }),
          })),
        };
      });
    },
  });
}

// Delete Comment (Soft delete locally)
export function useDeleteReadingShareComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shareId, commentId }) => {
      const commandId = generateCommandId('del_comment');
      const callFn = httpsCallable(functions, 'deleteReadingShareComment');
      const res = await callFn({ commandId, shareId, commentId });
      return res.data;
    },
    onSuccess: (data, variables) => {
      const { shareId, commentId } = variables;

      // Soft delete in comments cache
      queryClient.setQueryData(['readingShareComments', shareId], (old) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            comments: page.comments.map((c) => {
              if (c.id !== commentId) return c;
              return {
                ...c,
                content: '',
                status: 'deleted',
                userSnapshot: { displayName: '삭제된 댓글' },
              };
            }),
          })),
        };
      });

      // Use the server-authoritative count so stale local caches cannot drift.
      queryClient.setQueryData(['readingShare', shareId], (old) => {
        if (!old) return old;
        return {
          ...old,
          commentCount: data.commentCount ?? Math.max(0, (old.commentCount || 0) - 1),
        };
      });

      // Update feed cards locally
      queryClient.setQueriesData({ queryKey: ['readingShareFeed'] }, (old) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => {
              if (item.id !== shareId) return item;
              return {
                ...item,
                commentCount: data.commentCount ?? Math.max(0, (item.commentCount || 0) - 1),
              };
            }),
          })),
        };
      });
    },
  });
}

// Report
export function useReportReadingShare() {
  return useMutation({
    mutationFn: async ({ shareId, reason, detail }) => {
      const callFn = httpsCallable(functions, 'reportReadingShare');
      const res = await callFn({ shareId, reason, detail });
      return res.data;
    },
  });
}
