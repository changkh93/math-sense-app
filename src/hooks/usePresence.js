import { useEffect, useRef } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
        
        // We use dot notation for merging to strictly update liveStatus without affecting other fields
        // This is more efficient and avoids potentially overwriting subfields in some conditions.
        const updateData = {
          'liveStatus.state': state,
          'liveStatus.lastUpdatedAt': serverTimestamp(),
          'liveStatus.currentLocation': currentLocation || '메인 화면',
          'liveStatus.clusterId': clusterId || 'cluster_elementary',
          'liveStatus.unitId': unitId || null
        };

        if (isNewLocation) {
          updateData['liveStatus.enteredAt'] = serverTimestamp();
        }

        await updateDoc(userRef, updateData);
        lastPresenceTimeRef.current = Date.now();
        
      } catch (err) {
        // If updateDoc fails (e.g. document missing), we could fallback to setDoc, but for presence it's usually fine
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
