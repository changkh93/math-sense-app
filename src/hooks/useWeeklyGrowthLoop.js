import { useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { useAuth } from './useAuth';
import {
  getKstWeekBoundaries,
  getWeeklyGrowthLoopDraftStorageKey,
  safeReadWeeklyGrowthLoopDraft,
  safeWriteWeeklyGrowthLoopDraft,
  safeRemoveWeeklyGrowthLoopDraft,
  safeCleanupWeeklyGrowthLoopDrafts,
} from '../utils/weeklyGrowthLoopDomain';

/**
 * Hook for managing the Weekly Growth Loop ('이번 주 항로')
 * @param {Object} options
 * @param {boolean} options.enabled - When true, triggers open/fetch of current week's loop
 */
export function useWeeklyGrowthLoop({ enabled = false } = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const uid = user?.uid;

  // Recompute on render so an already-open archive changes query keys at KST Monday midnight.
  const weekBoundaries = getKstWeekBoundaries(new Date());
  const currentWeekStartKey = weekBoundaries.weekStartKey;

  const queryKey = useMemo(
    () => ['weeklyGrowthLoop', uid, currentWeekStartKey],
    [uid, currentWeekStartKey]
  );

  const draftStorageKey = useMemo(
    () => getWeeklyGrowthLoopDraftStorageKey(uid, currentWeekStartKey),
    [uid, currentWeekStartKey]
  );

  useEffect(() => {
    if (!uid || !currentWeekStartKey) return;
    safeCleanupWeeklyGrowthLoopDrafts(uid, currentWeekStartKey);
  }, [uid, currentWeekStartKey]);

  // 1. Query: open / fetch loop (only when explicitly enabled)
  const loopQuery = useQuery({
    queryKey,
    queryFn: async () => {
      if (!uid) return null;
      const openFn = httpsCallable(functions, 'openWeeklyGrowthLoop');
      const response = await openFn({});
      return response.data?.loop || null;
    },
    enabled: Boolean(uid && enabled),
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  // 2. Mutation: Complete loop
  const completeMutation = useMutation({
    mutationFn: async (payload) => {
      const completeFn = httpsCallable(functions, 'completeWeeklyGrowthLoop');
      const response = await completeFn(payload);
      return response.data;
    },
    onSuccess: (result, variables) => {
      // Direct cache update with the completed state
      queryClient.setQueryData(queryKey, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: 'completed',
          previousGoalOutcomes: result?.previousGoalOutcomes || variables.previousGoalOutcomes || [],
          reflection: result?.reflection || prev.reflection,
          plan: result?.plan || prev.plan,
          revision: result?.revision ?? (prev.revision || 0) + 1,
          completedAt: result?.completedAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });

      // Clear local draft upon successful completion
      safeRemoveWeeklyGrowthLoopDraft(draftStorageKey);
    },
  });

  // 3. Mutation: Update completed loop
  const updateMutation = useMutation({
    mutationFn: async (payload) => {
      const updateFn = httpsCallable(functions, 'updateWeeklyGrowthLoop');
      const response = await updateFn(payload);
      return response.data;
    },
    onSuccess: (result) => {
      queryClient.setQueryData(queryKey, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          reflection: result?.reflection || prev.reflection,
          plan: result?.plan || prev.plan,
          revision: result?.revision ?? (prev.revision || 0) + 1,
          updatedAt: result?.updatedAt || new Date().toISOString(),
        };
      });
      safeRemoveWeeklyGrowthLoopDraft(draftStorageKey);
    },
  });

  // 4. Draft helpers
  const saveDraft = useCallback(
    (draftData) => {
      if (!draftStorageKey) return false;
      return safeWriteWeeklyGrowthLoopDraft(draftStorageKey, {
        ...draftData,
        savedAt: new Date().toISOString(),
      });
    },
    [draftStorageKey]
  );

  const loadDraft = useCallback(() => {
    if (!draftStorageKey) return null;
    return safeReadWeeklyGrowthLoopDraft(draftStorageKey);
  }, [draftStorageKey]);

  const clearDraft = useCallback(() => {
    if (!draftStorageKey) return;
    safeRemoveWeeklyGrowthLoopDraft(draftStorageKey);
  }, [draftStorageKey]);

  return {
    loop: loopQuery.data,
    isLoading: loopQuery.isLoading,
    isError: loopQuery.isError,
    error: loopQuery.error,
    refetch: loopQuery.refetch,
    weekBoundaries,
    completeLoop: completeMutation.mutateAsync,
    isCompleting: completeMutation.isPending,
    updateLoop: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    saveDraft,
    loadDraft,
    clearDraft,
  };
}
