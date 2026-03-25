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

        // 4. Fetch Assignments (Query from root collection)
        const assignmentsRef = fsCollection(db, 'assignments');
        const assignmentsQuery = fsQuery(
          assignmentsRef,
          fsWhere('userId', '==', userId),
          fsWhere('submittedAt', '>=', startTime),
          fsWhere('submittedAt', '<=', endTime)
        );

        // Execute queries in parallel
        const [historySnap, txSnap, logsSnap, assignmentsSnap] = await Promise.all([
          fsGetDocs(historyQuery).catch(e => { console.warn("Failed to fetch history:", e); return { docs: [] }; }),
          fsGetDocs(txQuery).catch(e => { console.warn("Failed to fetch tx:", e); return { docs: [] }; }),
          fsGetDocs(logsQuery).catch(e => { console.warn("Failed to fetch logs:", e); return { docs: [] }; }),
          fsGetDocs(assignmentsQuery).catch(e => { console.warn("Failed to fetch assignments:", e); return { docs: [] }; })
        ]);

        const aggregated = [];
        const stats = {
          quizCount: 0,
          logCount: 0,
          totalVideoSeconds: 0,
          isAssignmentSubmitted: !assignmentsSnap.empty
        };

        // Cluster name mapping helper
        const getClusterName = (cid) => {
          if (!cid) return '';
          if (cid.includes('python')) return '파이썬';
          if (cid.includes('middle')) return '중등수학';
          if (cid.includes('elementary')) return '초등수학';
          return cid;
        };

        const getDocsSafe = (snap) => {
          if (snap && typeof snap.forEach === 'function') return snap;
          if (snap && Array.isArray(snap.docs)) return snap.docs;
          return [];
        };

        // --- Process Quiz History ---
        getDocsSafe(historySnap).forEach(doc => {
          const data = doc.data ? doc.data() : doc;
          stats.quizCount++;
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
        getDocsSafe(txSnap).forEach(doc => {
          const data = doc.data ? doc.data() : doc;
          const tType = data.type || '';
          const desc = data.description || '';
          const metadata = data.metadata || {};
          
          if (tType === 'quiz_reward') return; 
          if (tType === 'mastery_bonus') return; 

          let displayType = 'general';
          let displayTitle = `💎 광석 획득: ${desc}`;

          if (tType === 'transmission_reward' || tType === 'video_reward') {
            displayType = 'video_complete';
            displayTitle = `🎬 영상 보상: ${desc.replace(/\s?영상 교신 수신/g, '').replace('보상 (영상 교신 완료)', '보너스')}`;
            
            // Stats: Every 10 crystals in a '수신' type usually means 180s
            if (desc.includes('수신') && data.amount === 10) {
              stats.totalVideoSeconds += 180;
            }
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
            metadata: {
              ...data,
              videoTime: metadata.videoTime
            }
          });
        });

        // --- Process Activity Logs ---
        getDocsSafe(logsSnap).forEach(doc => {
          const data = doc.data ? doc.data() : doc;
          if (data.action?.includes('DATA LOG')) {
            stats.logCount++;
            aggregated.push({
              id: `log_${doc.id}`,
              timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(),
              type: 'data_log_read',
              title: `📝 데이터 로그 열람${data.unitId ? ' (' + (data.unitTitle || data.unitId) + ')' : ''}`,
              score: null,
              crystalsEarned: 0,
              metadata: data
            });
          }
        });

        // --- Process Assignments ---
        const assignmentsSnapActual = assignmentsSnap.docs || assignmentsSnap;
        stats.isAssignmentSubmitted = (assignmentsSnap.empty === false) || (assignmentsSnap.docs && assignmentsSnap.docs.length > 0) || (assignmentsSnap.size > 0);
        
        getDocsSafe(assignmentsSnap).forEach(doc => {
          const data = doc.data ? doc.data() : doc;
          const clusterName = getClusterName(data.clusterId);
          aggregated.push({
            id: `assignment_${doc.id}`,
            timestamp: data.submittedAt?.toDate ? data.submittedAt.toDate() : new Date(),
            type: 'assignment_submission',
            title: `📁 항행 일지 제출${clusterName ? ' (' + clusterName + ')' : ''}: ${data.title || data.unitTitle || '과제'}`,
            score: null,
            crystalsEarned: 0,
            metadata: data
          });
        });

        // Sort all activities by timestamp ascending
        aggregated.sort((a, b) => {
          const timeA = a.timestamp ? a.timestamp.getTime() : 0;
          const timeB = b.timestamp ? b.timestamp.getTime() : 0;
          return timeA - timeB; // Ascending: earliest first
        });

        if (isMounted) {
          setActivities(aggregated);
          setDailyStats(stats);
          setLoading(false);
        }

      } catch (err) {
        console.error("Error fetching learning history:", err);
        if (isMounted) {
          setError(err);
          setLoading(false);
        }
      }
    }

    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, [userId, dateStr]);

  const [dailyStats, setDailyStats] = useState({
    quizCount: 0,
    logCount: 0,
    totalVideoSeconds: 0,
    isAssignmentSubmitted: false
  });

  return { activities, dailyStats, loading, error };
}
