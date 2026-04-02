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
  const lastPresenceTimeRef = useRef(0);

  useEffect(() => {
    if (!userId) return;

    let timeoutId;
    let heartbeatId;

    const updatePresence = async (state, isNewLocation = false) => {
      try {
        const userRef = doc(db, 'users', userId);
        
        // We use setDoc with merge: true to ensure parent fields like 'liveStatus'
        // are created if they are missing (as found in some student records).
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
        lastPresenceTimeRef.current = Date.now();
        
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
      
      // Force update immediately on change/mount
      timeoutId = setTimeout(() => {
        updatePresence(document.hidden ? 'away' : 'online', true);
      }, 500);
    }

    // --- HEARTBEAT ---
    // Update every 60 seconds if tab is active to keep "online" status fresh in admin dash
    heartbeatId = setInterval(() => {
      if (!document.hidden) {
         updatePresence('online', false);
      }
    }, 60000); 

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(timeoutId);
      clearInterval(heartbeatId);
    };
  }, [userId, clusterId, currentLocation, unitId]); 
}
