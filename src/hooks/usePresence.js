import { useEffect, useRef } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Tracks user's current location and tab visibility, efficiently sending updates to Firestore
 * @param {string} userId
 * @param {string} clusterId
 * @param {string} currentLocation description like `분수의 나눗셈 (개념 영상)`
 * @param {string} unitId 
 */
export function usePresence(userId, clusterId, currentLocation, unitId) {
  const lastLocationRef = useRef(null);
  const lastUnitIdRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

    let timeoutId;

    const updatePresence = async (state, isNewLocation = false) => {
      try {
        const userRef = doc(db, 'users', userId);
        
        // We use dot notation for merging to strictly update liveStatus without affecting other fields
        // However, if the user doesn't exist, we fallback to setDoc.
        // Doing setDoc with merge: true deeply merges nested objects.
        const mergeData = {
          liveStatus: {
            state: state,
            lastUpdatedAt: serverTimestamp(),
            currentLocation: currentLocation || '메인 화면',
            clusterId: clusterId || 'cluster_elementary',
            unitId: unitId || null
          }
        };

        if (isNewLocation) {
          mergeData.liveStatus.enteredAt = serverTimestamp();
        }

        await setDoc(userRef, mergeData, { merge: true });
        
      } catch (err) {
        console.error("Presence update failed:", err);
      }
    };

    const handleVisibilityChange = () => {
      clearTimeout(timeoutId);
      if (document.hidden) {
        // Debounce away slightly so switching tabs quickly doesn't spam DB
        timeoutId = setTimeout(() => {
          updatePresence('away', false);
        }, 3000);
      } else {
        // They returned
        updatePresence('online', false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial check or Location Change check
    const isNewLocation = 
      lastLocationRef.current !== currentLocation || 
      lastUnitIdRef.current !== unitId;

    if (isNewLocation) {
      lastLocationRef.current = currentLocation;
      lastUnitIdRef.current = unitId;
      // When jumping to a new location, update immediately (or slightly debounced)
      timeoutId = setTimeout(() => {
        if (!document.hidden) {
           updatePresence('online', true);
        }
      }, 500);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(timeoutId);
    };
  }, [userId, clusterId, currentLocation, unitId]); 
}
