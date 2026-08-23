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
 * Fetch only the newest public share for the all-questions feature slot.
 * This intentionally avoids mounting the 13-read lounge feed query.
 */
export function useLatestReadingShare({ enabled = true } = {}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['readingShareFeatured', 'latest'],
    queryFn: async () => {
      const latestQuery = query(
        collection(db, 'readingShares'),
        where('status', '==', 'active'),
        orderBy('publishedAt', 'desc'),
        orderBy('__name__', 'desc'),
        limit(1)
      );
      const snap = await getDocs(latestQuery);
      const latest = snap.docs[0];
      return latest ? { id: latest.id, ...latest.data() } : null;
    },
    enabled: Boolean(user && enabled),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
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
      const data = snap.data() || {};
      const resonated = data.resonated ?? data.type === 'resonated';
      const readingIntent = data.readingIntent ?? (data.type === 'want_to_read' ? 'want_to_read' : null);
      return {
        resonated: Boolean(resonated),
        readingIntent: readingIntent || null,
        linkedBookId: data.linkedBookId || null,
        schemaVersion: data.schemaVersion || 1,
        // Legacy compatibility:
        type: data.type || (resonated ? 'resonated' : readingIntent),
      };
    },
    enabled: Boolean(user?.uid && shareId && enabled),
    staleTime: SOCIAL_STALE_TIME,
    gcTime: SOCIAL_GC_TIME,
    refetchOnWindowFocus: false,
  });
}

/**
 * 3-1. useReadingShareReplies
 * Lazy-load replies for a specific root comment (initial 3, then 10 at a time)
 */
export function useReadingShareReplies(shareId, rootCommentId, { enabled = false } = {}) {
  const { user } = useAuth();
  const REPLIES_INITIAL_SIZE = 3;
  const REPLIES_PAGE_SIZE = 10;

  return useInfiniteQuery({
    queryKey: ['readingShareReplies', shareId, rootCommentId],
    queryFn: async ({ pageParam = null }) => {
      const repliesColl = collection(db, 'readingShares', shareId, 'comments', rootCommentId, 'replies');
      const pageSize = pageParam ? REPLIES_PAGE_SIZE : REPLIES_INITIAL_SIZE;

      let q = query(
        repliesColl,
        where('status', 'in', ['visible', 'deleted']),
        orderBy('createdAt', 'asc'),
        orderBy('__name__', 'asc'),
        limit(pageSize + 1)
      );

      if (pageParam) {
        q = query(
          repliesColl,
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
      const replies = docs.slice(0, pageSize).map((d) => ({
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

      return { replies, nextCursor };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(user && shareId && rootCommentId && enabled),
    staleTime: SOCIAL_STALE_TIME,
    gcTime: SOCIAL_GC_TIME,
    refetchOnWindowFocus: false,
  });
}

/**
 * 3-2. useReadingShareReactionUsers
 * Lazy-loads the list of users who reacted to a share with a specific reaction
 */
export function useReadingShareReactionUsers(shareId, reactionType, { enabled = false } = {}) {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: ['readingShareReactionUsers', shareId, reactionType],
    queryFn: async ({ pageParam = null }) => {
      if (!shareId || !reactionType) return { users: [], nextCursor: null };
      const callFn = httpsCallable(functions, 'getReadingShareReactionUsers');
      const res = await callFn({ shareId, reactionType, cursor: pageParam });
      return res.data || { users: [], nextCursor: null };
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    enabled: Boolean(user && shareId && reactionType && enabled),
    staleTime: 1000 * 60, // 1 minute
    retry: false,
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
      queryClient.invalidateQueries({ queryKey: ['readingShareFeatured', 'latest'] });
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

      queryClient.setQueryData(['readingShareFeatured', 'latest'], (old) => {
        if (!old || old.id !== variables.shareId) return old;
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
      queryClient.invalidateQueries({ queryKey: ['readingShareFeatured', 'latest'] });
      queryClient.invalidateQueries({ queryKey: ['readingBooks'] });
      queryClient.invalidateQueries({ queryKey: ['readingBook'] });
    },
  });
}

// Link Reading Share Book (want_to_read or completed)
export function useLinkReadingShareBook() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ shareId, intent, completedDateKst }) => {
      const commandId = generateCommandId('link_book');
      const callFn = httpsCallable(functions, 'linkReadingShareBook');
      const res = await callFn({ commandId, shareId, intent, completedDateKst });
      return res.data;
    },
    onSuccess: (data, variables) => {
      const { shareId } = variables;
      const { readingIntent, reactionCounts } = data;

      if (user?.uid) {
        queryClient.setQueryData(['myReadingReaction', shareId, user.uid], (old) => ({
          resonated: Boolean(old?.resonated),
          readingIntent,
          linkedBookId: data.bookId || old?.linkedBookId || null,
          schemaVersion: 2,
        }));
      }

      if (reactionCounts) {
        queryClient.setQueryData(['readingShare', shareId], (old) => {
          if (!old) return old;
          return { ...old, reactionCounts };
        });

        queryClient.setQueriesData({ queryKey: ['readingShareFeed'] }, (old) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((item) => {
                if (item.id !== shareId) return item;
                return { ...item, reactionCounts };
              }),
            })),
          };
        });

        queryClient.setQueryData(['readingShareFeatured', 'latest'], (old) => {
          if (!old || old.id !== shareId) return old;
          return { ...old, reactionCounts };
        });
      }

      // Invalidate bookshelf to show newly linked/created book
      queryClient.invalidateQueries({ queryKey: ['readingBooks'] });
      queryClient.invalidateQueries({ queryKey: ['readingBook'] });
      queryClient.invalidateQueries({ queryKey: ['readingShareReactionUsers', shareId] });
    },
  });
}

// Set Reaction (Goal-based, Localized Query Data update)
export function useSetReadingShareReaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ shareId, resonated, reactionType }) => {
      const callFn = httpsCallable(functions, 'setReadingShareReaction');
      const payload = typeof resonated === 'boolean'
        ? { shareId, resonated }
        : { shareId, reactionType };
      const res = await callFn(payload);
      return res.data;
    },
    onSuccess: (data, variables) => {
      const { shareId } = variables;
      const { resonated, readingIntent, reactionCounts } = data;

      // Update my reaction query data
      if (user?.uid) {
        queryClient.setQueryData(['myReadingReaction', shareId, user.uid], (old) => ({
          resonated: Boolean(resonated ?? old?.resonated),
          readingIntent: readingIntent ?? old?.readingIntent ?? null,
          linkedBookId: old?.linkedBookId || null,
          schemaVersion: 2,
        }));
      }

      // Update single share query data if open
      if (reactionCounts) {
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

        queryClient.setQueryData(['readingShareFeatured', 'latest'], (old) => {
          if (!old || old.id !== shareId) return old;
          return { ...old, reactionCounts };
        });
      }
      queryClient.invalidateQueries({ queryKey: ['readingShareReactionUsers', shareId] });
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

      queryClient.setQueryData(['readingShareFeatured', 'latest'], (old) => {
        if (!old || old.id !== shareId) return old;
        return { ...old, commentCount };
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

      queryClient.setQueryData(['readingShareFeatured', 'latest'], (old) => {
        if (!old || old.id !== shareId) return old;
        return {
          ...old,
          commentCount: data.commentCount ?? Math.max(0, (old.commentCount || 0) - 1),
        };
      });
    },
  });
}

// Add Reply to Comment
export function useReplyToReadingShareComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shareId, rootCommentId, content }) => {
      const commandId = generateCommandId('reply');
      const callFn = httpsCallable(functions, 'replyToReadingShareComment');
      const res = await callFn({
        commandId,
        shareId,
        rootCommentId,
        content,
      });
      return res.data;
    },
    onSuccess: (data, variables) => {
      const { shareId, rootCommentId } = variables;
      const { reply, replyCount, commentCount } = data;

      // Append new reply to replies query cache
      queryClient.setQueryData(['readingShareReplies', shareId, rootCommentId], (old) => {
        if (!old?.pages) {
          return {
            pages: [{ replies: [reply], nextCursor: null }],
            pageParams: [null],
          };
        }
        const pages = [...old.pages];
        const lastPageIdx = pages.length - 1;
        const lastPage = pages[lastPageIdx];
        pages[lastPageIdx] = {
          ...lastPage,
          replies: [...(lastPage.replies || []), reply],
        };
        return { ...old, pages };
      });

      // Update root comment's replyCount in comments query cache
      queryClient.setQueryData(['readingShareComments', shareId], (old) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            comments: page.comments.map((c) => {
              if (c.id !== rootCommentId) return c;
              return { ...c, replyCount: replyCount ?? (c.replyCount || 0) + 1 };
            }),
          })),
        };
      });

      // Update parent share commentCount
      if (commentCount !== undefined) {
        queryClient.setQueryData(['readingShare', shareId], (old) => {
          if (!old) return old;
          return { ...old, commentCount };
        });

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

        queryClient.setQueryData(['readingShareFeatured', 'latest'], (old) => {
          if (!old || old.id !== shareId) return old;
          return { ...old, commentCount };
        });
      }
    },
  });
}

// Delete Reply
export function useDeleteReadingShareReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shareId, rootCommentId, replyId }) => {
      const commandId = generateCommandId('del_reply');
      const callFn = httpsCallable(functions, 'deleteReadingShareReply');
      const res = await callFn({ commandId, shareId, rootCommentId, replyId });
      return res.data;
    },
    onSuccess: (data, variables) => {
      const { shareId, rootCommentId, replyId } = variables;
      const { replyCount, commentCount } = data;

      // Soft delete in replies query cache
      queryClient.setQueryData(['readingShareReplies', shareId, rootCommentId], (old) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            replies: page.replies.map((r) => {
              if (r.id !== replyId) return r;
              return {
                ...r,
                content: '',
                status: 'deleted',
                userSnapshot: { displayName: '삭제된 댓글' },
              };
            }),
          })),
        };
      });

      // Update root comment's replyCount
      queryClient.setQueryData(['readingShareComments', shareId], (old) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            comments: page.comments.map((c) => {
              if (c.id !== rootCommentId) return c;
              return { ...c, replyCount: replyCount ?? Math.max(0, (c.replyCount || 0) - 1) };
            }),
          })),
        };
      });

      // Update parent share commentCount
      if (commentCount !== undefined) {
        queryClient.setQueryData(['readingShare', shareId], (old) => {
          if (!old) return old;
          return { ...old, commentCount };
        });

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

        queryClient.setQueryData(['readingShareFeatured', 'latest'], (old) => {
          if (!old || old.id !== shareId) return old;
          return { ...old, commentCount };
        });
      }
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
