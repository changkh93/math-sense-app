import { useEffect, useRef } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Tracks user's current location and tab visibility, efficiently sending updates to Firestore
 * @param {string} userId
 * @param {string} clusterId
 * @param {string} currentLocation description like `분수의 나눗셈 (개념 영상)`
 * @param {string} unitId 
 * @param {string} activeRoomId
 * @param {string} clusterName
 */
export function usePresence(userId, clusterId, currentLocation, unitId, activeRoomId = null, clusterName = '') {
  const lastLocationRef = useRef(null);
  const lastUnitIdRef = useRef(null);
  const lastRoomIdRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

    let timeoutId;
    let heartbeatId;

    const updatePresence = async (state, isNewLocation = false) => {
      try {
        const userRef = doc(db, 'users', userId);
        
        const mergeData = {
          liveStatus: {
            state: state,
            lastUpdatedAt: serverTimestamp(),
            currentLocation: currentLocation || '메인 화면',
            clusterId: clusterId || 'cluster_elementary',
            unitId: unitId || null,
            activeRoomId: activeRoomId || null
          }
        };

        if (clusterName) {
          mergeData.liveStatus.clusterName = clusterName;
        }

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
        timeoutId = setTimeout(() => {
          updatePresence('away', false);
        }, 3000);
      } else {
        updatePresence('online', false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const isNewLocation = 
      lastLocationRef.current !== currentLocation || 
      lastUnitIdRef.current !== unitId ||
      lastRoomIdRef.current !== activeRoomId;

    if (isNewLocation) {
      lastLocationRef.current = currentLocation;
      lastUnitIdRef.current = unitId;
      lastRoomIdRef.current = activeRoomId;
      // Send immediately instead of debouncing
      updatePresence(document.hidden ? 'away' : 'online', true);
    }

    // Heartbeat every 45 seconds (reduced from 60 to be more reliable)
    heartbeatId = setInterval(() => {
      if (!document.hidden) {
         updatePresence('online', false);
      }
    }, 45000); 

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(timeoutId);
      clearInterval(heartbeatId);
    };
  }, [userId, clusterId, currentLocation, unitId, activeRoomId, clusterName]);
}
