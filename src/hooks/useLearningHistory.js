import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection as fsCollection, query as fsQuery, where as fsWhere, getDocs as fsGetDocs, Timestamp as fsTimestamp } from 'firebase/firestore';

/**
 * Custom hook to fetch a user's combined learning history for a specific date.
 * Aggregates data from:
 * 1. users/{uid}/history (Quiz records)
 * 2. users/{uid}/crystal_transactions (Video completions, attendance, Agora activity)
 * 3. users/{uid}/activityLogs (Data Log reads, general actions)
 * 
 * @param {string} userId - The user's ID
 * @param {string} dateStr - The target date in YYYY-MM-DD format (KST)
 * @returns {object} { activities, loading, error }
 */
export function useLearningHistory(userId, dateStr) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchHistory() {
      if (!userId || !dateStr) {
        if (isMounted) setActivities([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Parse the target date to create a KST time range (00:00:00 to 23:59:59)
        // Since Firestore timestamps are UTC, we need to query based on the KST day string if possible,
        // or calculate the UTC bounds for the KST day.
        
        // The easiest way is to use the KST bounds.
        // dateStr is 'YYYY-MM-DD'
        // KST Offset is +09:00
        const kstStartStr = `${dateStr}T00:00:00+09:00`;
        const kstEndStr = `${dateStr}T23:59:59.999+09:00`;
        
        const startTime = fsTimestamp.fromDate(new Date(kstStartStr));
        const endTime = fsTimestamp.fromDate(new Date(kstEndStr));

        // 1. Fetch Quiz History
        const historyRef = fsCollection(db, 'users', userId, 'history');
        const historyQuery = fsQuery(
          historyRef,
          fsWhere('timestamp', '>=', startTime),
          fsWhere('timestamp', '<=', endTime)
        );

        // 2. Fetch Crystal Transactions
        const txRef = fsCollection(db, 'users', userId, 'crystal_transactions');
        const txQuery = fsQuery(
          txRef,
          fsWhere('timestamp', '>=', startTime),
          fsWhere('timestamp', '<=', endTime)
        );

        // 3. Fetch Activity Logs
        const logsRef = fsCollection(db, 'users', userId, 'activityLogs');
        const logsQuery = fsQuery(
          logsRef,
          fsWhere('timestamp', '>=', startTime),
          fsWhere('timestamp', '<=', endTime)
        );

        // Execute queries in parallel
        const [historySnap, txSnap, logsSnap] = await Promise.all([
          fsGetDocs(historyQuery).catch(e => { console.warn("Failed to fetch history:", e); return { docs: [] }; }),
          fsGetDocs(txQuery).catch(e => { console.warn("Failed to fetch tx:", e); return { docs: [] }; }),
          fsGetDocs(logsQuery).catch(e => { console.warn("Failed to fetch logs:", e); return { docs: [] }; })
        ]);

        const aggregated = [];

        // --- Process Quiz History ---
        historySnap.forEach(doc => {
          const data = doc.data();
          aggregated.push({
            id: `quiz_${doc.id}`,
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(),
            type: 'quiz_pass',
            title: `🚀 현장 탐사(퀴즈): ${data.unitTitle || '이름 없음'}`,
            score: data.score,
            crystalsEarned: data.crystalsEarned || 0,
            metadata: data
          });
        });

        // --- Process Transactions ---
        txSnap.forEach(doc => {
          const data = doc.data();
          const tType = data.type || '';
          const desc = data.description || '';
          
          if (tType === 'quiz_reward') return; 
          if (tType === 'mastery_bonus') return; 

          let displayType = 'general';
          let displayTitle = `💎 광석 획득: ${desc}`;

          if (tType === 'video_reward') {
            displayType = 'video_complete';
            displayTitle = `🎬 영상 수신 완료: ${desc.replace(' 영상 수신', '')}`;
          } else if (tType.includes('agora')) {
            displayType = 'agora_activity';
            displayTitle = `🗣️ 아고라 활동: ${desc}`;
          } else if (tType === 'attendance') {
            displayType = 'attendance';
            displayTitle = `✅ 출석: ${desc}`;
          }

          aggregated.push({
            id: `tx_${doc.id}`,
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(),
            type: displayType,
            title: displayTitle,
            score: null,
            crystalsEarned: data.amount || 0,
            metadata: data
          });
        });

        // --- Process Activity Logs ---
        logsSnap.forEach(doc => {
          const data = doc.data();
          if (data.action?.includes('DATA LOG')) {
            aggregated.push({
              id: `log_${doc.id}`,
              timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(),
              type: 'data_log_read',
              title: `📝 데이터 로그 열람${data.unitId ? ' (구역 ID: ' + data.unitId + ')' : ''}`,
              score: null,
              crystalsEarned: 0,
              metadata: data
            });
          }
        });

        // Sort all activities by timestamp ascending
        aggregated.sort((a, b) => {
          const timeA = a.timestamp ? a.timestamp.getTime() : 0;
          const timeB = b.timestamp ? b.timestamp.getTime() : 0;
          return timeA - timeB; // Ascending: earliest first
        });

        if (isMounted) {
          setActivities(aggregated);
        }

      } catch (err) {
        console.error("Error fetching learning history:", err);
        if (isMounted) setError(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, [userId, dateStr]);

  return { activities, loading, error };
}
