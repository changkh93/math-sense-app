import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';

const NOTICE_PAGE_SIZE = 10;
const NOTICE_STALE_TIME = 5 * 60 * 1000;
const NOTICE_GC_TIME = 30 * 60 * 1000;
export const AGORA_NOTICE_OPERATOR_EMAIL = 'paul@dulcine.net';

export const agoraNoticeKeys = {
  feature: ['agoraNotices', 'feature'],
  list: ['agoraNotices', 'list'],
};

export function useAgoraNoticeFeature({ enabled = true } = {}) {
  return useQuery({
    queryKey: agoraNoticeKeys.feature,
    queryFn: async () => {
      const snapshot = await getDoc(doc(db, 'agoraNoticeFeeds', 'current'));
      return snapshot.exists() && Array.isArray(snapshot.data()?.items)
        ? snapshot.data().items.slice(0, 3)
        : [];
    },
    enabled,
    staleTime: 10 * 60 * 1000,
    gcTime: NOTICE_GC_TIME,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

export function useAgoraNotices({ enabled = true } = {}) {
  return useInfiniteQuery({
    queryKey: agoraNoticeKeys.list,
    queryFn: async ({ pageParam = null }) => {
      const constraints = [
        where('status', '==', 'published'),
        orderBy('publishedAt', 'desc'),
        orderBy(documentId(), 'desc'),
      ];
      if (pageParam) {
        constraints.push(startAfter(pageParam.publishedAt, pageParam.id));
      }
      constraints.push(limit(NOTICE_PAGE_SIZE));

      const snapshot = await getDocs(query(collection(db, 'agoraNotices'), ...constraints));
      const visibleDocs = snapshot.docs;
      const items = visibleDocs.map((noticeDoc) => ({ id: noticeDoc.id, ...noticeDoc.data() }));
      const lastVisible = visibleDocs[visibleDocs.length - 1];

      return {
        items,
        // A full page may have a following page. This avoids paying for an
        // unused 11th document on every request; an exact final page can show
        // one harmless extra "더 보기" action instead.
        nextCursor: visibleDocs.length === NOTICE_PAGE_SIZE && lastVisible
          ? { publishedAt: lastVisible.data().publishedAt, id: lastVisible.id }
          : null,
      };
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    enabled,
    staleTime: NOTICE_STALE_TIME,
    gcTime: NOTICE_GC_TIME,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

export function createNoticeCommandId() {
  if (globalThis.crypto?.randomUUID) return `notice_${globalThis.crypto.randomUUID()}`;
  return `notice_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

export function useCreateAgoraNotice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, content, commandId }) => {
      const callable = httpsCallable(functions, 'createAgoraNotice');
      const response = await callable({
        title,
        content,
        commandId: commandId || createNoticeCommandId(),
      });
      return response.data;
    },
    onSuccess: ({ notice, featureItems }) => {
      queryClient.setQueryData(agoraNoticeKeys.feature, featureItems || []);
      queryClient.setQueryData(agoraNoticeKeys.list, (previous) => {
        if (!previous?.pages?.length || !notice) return previous;
        const firstPage = previous.pages[0];
        if (firstPage.items.some((item) => item.id === notice.id)) return previous;
        return {
          ...previous,
          pages: [
            { ...firstPage, items: [notice, ...firstPage.items] },
            ...previous.pages.slice(1),
          ],
        };
      });
    },
  });
}

export function useUpdateAgoraNotice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noticeId, title, content }) => {
      const callable = httpsCallable(functions, 'updateAgoraNotice');
      const response = await callable({ noticeId, title, content });
      return response.data;
    },
    onSuccess: ({ notice, featureItems }) => {
      if (featureItems) {
        queryClient.setQueryData(agoraNoticeKeys.feature, featureItems);
      }
      queryClient.setQueryData(agoraNoticeKeys.list, (previous) => {
        if (!previous?.pages?.length || !notice) return previous;
        return {
          ...previous,
          pages: previous.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => (item.id === notice.id ? { ...item, ...notice } : item)),
          })),
        };
      });
    },
  });
}

export function useDeleteAgoraNotice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noticeId }) => {
      const callable = httpsCallable(functions, 'deleteAgoraNotice');
      const response = await callable({ noticeId });
      return response.data;
    },
    onSuccess: ({ noticeId, featureItems }) => {
      if (featureItems) {
        queryClient.setQueryData(agoraNoticeKeys.feature, featureItems);
      }
      queryClient.setQueryData(agoraNoticeKeys.list, (previous) => {
        if (!previous?.pages?.length || !noticeId) return previous;
        return {
          ...previous,
          pages: previous.pages.map((page) => ({
            ...page,
            items: page.items.filter((item) => item.id !== noticeId),
          })),
        };
      });
    },
  });
}

