import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit, startAfter, documentId } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions, auth } from '../firebase';
import { getErrorMessage } from '../utils/readingDomain';

const PAGE_SIZE = 20;

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  if (typeof value._seconds === 'number') return value._seconds * 1000;
  if (value instanceof Date) return value.getTime();
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Hook to fetch all books owned by a user
 */
export function useReadingBooks(userId, options = {}) {
  const { status, includeArchived = false } = options;

  return useQuery({
    // Keep one canonical cache entry per user. View-level filters are applied
    // with `select`, so switching tabs or mounting another consumer never
    // creates another full Firestore query.
    queryKey: ['readingBooks', userId],
    queryFn: async () => {
      if (!userId) return [];
      const q = query(
        collection(db, 'readingBooks'),
        where('userId', '==', userId)
      );

      const snap = await getDocs(q);
      const allBooks = snap.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          isArchived: Boolean(data?.archivedAt),
        };
      });

      // Sort: active books first (reading -> want_to_read -> completed -> paused), then archived; then updatedAt desc
      const statusOrder = { reading: 1, want_to_read: 2, completed: 3, paused: 4 };
      return allBooks.sort((a, b) => {
        if (a.isArchived !== b.isArchived) return a.isArchived ? 1 : -1;
        const orderA = statusOrder[a.status] || 99;
        const orderB = statusOrder[b.status] || 99;
        if (orderA !== orderB) return orderA - orderB;
        return toMillis(b.updatedAt || b.createdAt) - toMillis(a.updatedAt || a.createdAt);
      });
    },
    select: (allBooks) => {
      if (status === 'archived') {
        return allBooks
          .filter((book) => book.isArchived)
          .sort((a, b) => toMillis(b.archivedAt || b.updatedAt) - toMillis(a.archivedAt || a.updatedAt));
      }
      const visibleBooks = includeArchived
        ? allBooks
        : allBooks.filter((book) => !book.isArchived);
      if (status && status !== 'all') {
        return visibleBooks.filter((book) => !book.isArchived && book.status === status);
      }
      return visibleBooks;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 3, // 3 minutes
    gcTime: 1000 * 60 * 20, // 20 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/**
 * Hook to fetch a single book details
 */
export function useReadingBook(bookId, options = {}) {
  return useQuery({
    queryKey: ['readingBook', bookId],
    queryFn: async () => {
      if (!bookId) return null;
      const snap = await getDoc(doc(db, 'readingBooks', bookId));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() };
    },
    enabled: !!bookId,
    initialData: options.initialData,
    initialDataUpdatedAt: options.initialDataUpdatedAt,
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 20,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/**
 * Hook to fetch paginated reading logs with single-criterion filters + date range
 */
export function useReadingLogs(userId, filters = {}) {
  const { bookId, eventType, source, dateFrom, dateTo, enabled = true } = filters;

  return useInfiniteQuery({
    queryKey: ['readingLogs', userId, { bookId, eventType, source, dateFrom, dateTo }],
    queryFn: async ({ pageParam = null }) => {
      if (!userId) return { logs: [], nextCursor: null, hasMore: false };

      const constraints = [
        where('userId', '==', userId),
      ];

      if (bookId) {
        constraints.push(where('bookId', '==', bookId));
      } else if (eventType && eventType !== 'all') {
        constraints.push(where('eventType', '==', eventType));
      } else if (source && source !== 'all') {
        constraints.push(where('source', '==', source));
      }

      const hasDateRange = Boolean(dateFrom || dateTo);
      if (dateFrom) constraints.push(where('readDateKst', '>=', dateFrom));
      if (dateTo) constraints.push(where('readDateKst', '<=', dateTo));
      if (hasDateRange) constraints.push(orderBy('readDateKst', 'desc'));
      constraints.push(orderBy('readAt', 'desc'));
      constraints.push(orderBy(documentId(), 'desc'));

      if (pageParam && pageParam.lastReadAt && pageParam.lastId) {
        constraints.push(hasDateRange
          ? startAfter(pageParam.lastReadDateKst, pageParam.lastReadAt, pageParam.lastId)
          : startAfter(pageParam.lastReadAt, pageParam.lastId));
      }

      constraints.push(limit(PAGE_SIZE + 1));

      const q = query(collection(db, 'readingLogs'), ...constraints);
      const snap = await getDocs(q);

      const pageDocs = snap.docs.slice(0, PAGE_SIZE);
      const logs = pageDocs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((log) => {
          if (!log.voidedAt) return true;
          // Older archive operations set both timestamps together. Those
          // entries are preserved history, not genuinely voided corrections.
          return Boolean(log.archivedAt) && toMillis(log.archivedAt) === toMillis(log.voidedAt);
        });

      const lastDoc = pageDocs[pageDocs.length - 1];
      const hasMore = snap.docs.length > PAGE_SIZE;
      const nextCursor = hasMore && lastDoc ? {
        lastReadDateKst: lastDoc.data().readDateKst,
        lastReadAt: lastDoc.data().readAt,
        lastId: lastDoc.id,
      } : null;

      return { logs, nextCursor, hasMore };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(userId && enabled),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 20,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

function generateCommandId() {
  return 'cmd_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
}

async function callReadingFunction(name, payload, fallbackMessage) {
  try {
    const callable = httpsCallable(functions, name);
    const response = await callable(payload);
    return response.data;
  } catch (err) {
    const detailsCode = err?.details?.code;
    const firebaseCode = String(err?.code || '').split('/').pop();
    throw new Error(getErrorMessage(detailsCode || firebaseCode, err?.message || fallbackMessage));
  }
}

/**
 * Mutation: Create a new reading book
 */
export function useCreateReadingBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, author, status, dateInput }) => {
      const commandId = generateCommandId();
      return callReadingFunction('createReadingBook', { commandId, title, author, status, dateInput }, '책 등록에 실패했습니다.');
    },
    onSuccess: () => {
      const uid = auth.currentUser?.uid;
      if (uid) {
        queryClient.invalidateQueries({ queryKey: ['readingBooks', uid] });
        queryClient.invalidateQueries({ queryKey: ['readingLogs', uid] });
      }
    },
  });
}

/**
 * Mutation: Update book status (reading, completed, paused)
 */
export function useUpdateReadingBookStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookId, status }) => {
      const commandId = generateCommandId();
      return callReadingFunction('updateReadingBookStatus', { commandId, bookId, status }, '상태 변경에 실패했습니다.');
    },
    onSuccess: (_, variables) => {
      const uid = auth.currentUser?.uid;
      if (uid) {
        queryClient.invalidateQueries({ queryKey: ['readingBooks', uid] });
        queryClient.invalidateQueries({ queryKey: ['readingBook', variables.bookId] });
        queryClient.invalidateQueries({ queryKey: ['readingLogs', uid] });
      }
    },
  });
}

/**
 * Mutation: Update book details (totalPages, rating)
 */
export function useUpdateReadingBookDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookId, totalPages, rating }) => {
      const commandId = generateCommandId();
      return callReadingFunction('updateReadingBookDetails', { commandId, bookId, totalPages, rating }, '책 정보 수정에 실패했습니다.');
    },
    onSuccess: (_, variables) => {
      const uid = auth.currentUser?.uid;
      if (uid) {
        queryClient.invalidateQueries({ queryKey: ['readingBooks', uid] });
        queryClient.invalidateQueries({ queryKey: ['readingBook', variables.bookId] });
      }
    },
  });
}

/**
 * Mutation: Save reading progress from bookshelf
 */
export function useSaveReadingProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookId, page, dateStr, clockTime, memo }) => {
      const commandId = generateCommandId();
      return callReadingFunction('saveReadingProgress', { commandId, bookId, page, dateStr, clockTime, memo }, '페이지 저장에 실패했습니다.');
    },
    onSuccess: (_, variables) => {
      const uid = auth.currentUser?.uid;
      if (uid) {
        queryClient.invalidateQueries({ queryKey: ['readingBooks', uid] });
        queryClient.invalidateQueries({ queryKey: ['readingBook', variables.bookId] });
        queryClient.invalidateQueries({ queryKey: ['readingLogs', uid] });
      }
    },
  });
}

/**
 * Mutation: Archive a book (soft delete)
 */
export function useArchiveReadingBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookId }) => {
      const commandId = generateCommandId();
      return callReadingFunction('archiveReadingBook', { commandId, bookId }, '책 보관 처리에 실패했습니다.');
    },
    onSuccess: (_, variables) => {
      const uid = auth.currentUser?.uid;
      if (uid) {
        queryClient.invalidateQueries({ queryKey: ['readingBooks', uid] });
        queryClient.invalidateQueries({ queryKey: ['readingBook', variables.bookId] });
        queryClient.invalidateQueries({ queryKey: ['readingLogs', uid] });
      }
    },
  });
}

/**
 * Mutation: Unarchive / Restore a book back to shelf
 */
export function useUnarchiveReadingBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookId }) => {
      const commandId = generateCommandId();
      return callReadingFunction('unarchiveReadingBook', { commandId, bookId }, '책 복원 처리에 실패했습니다.');
    },
    onSuccess: (_, variables) => {
      const uid = auth.currentUser?.uid;
      if (uid) {
        queryClient.invalidateQueries({ queryKey: ['readingBooks', uid] });
        queryClient.invalidateQueries({ queryKey: ['readingBook', variables.bookId] });
        queryClient.invalidateQueries({ queryKey: ['readingLogs', uid] });
      }
    },
  });
}
