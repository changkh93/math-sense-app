import { useEffect, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useQueryClient } from '@tanstack/react-query';
import { db } from '../firebase';

/**
 * useSmartSync
 * Watches a specific Unit metadata in real-time.
 * If lastUpdated changes, it invalidates the 'quizzes' cache for that unit.
 */
export function useSmartSync(unitId) {
  const queryClient = useQueryClient();
  const lastKnownTimestamp = useRef(null);

  useEffect(() => {
    if (!unitId) return;

    // console.log(`[SYNC] Watching unit for changes: ${unitId}`);
    
    // Set up a real-time listener on the UNIT metadata doc
    const unsub = onSnapshot(doc(db, 'units', unitId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const currentTimestamp = data.lastUpdated?.toMillis() || 0;

        // If this is the first run, just record the timestamp
        if (lastKnownTimestamp.current === null) {
          lastKnownTimestamp.current = currentTimestamp;
          return;
        }

        // If the timestamp has increased (server updated it), bust the cache!
        if (currentTimestamp > lastKnownTimestamp.current) {
          console.log(`[SYNC] Content change detected for ${unitId}! Invalidating cache...`);
          queryClient.invalidateQueries({ queryKey: ['quizzes', unitId] });
          lastKnownTimestamp.current = currentTimestamp;
        }
      }
    }, (err) => {
      console.error(`[SYNC] Listener error for ${unitId}:`, err);
    });

    return () => unsub();
  }, [unitId, queryClient]);
}
