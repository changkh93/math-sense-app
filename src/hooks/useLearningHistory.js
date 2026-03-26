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
        
        // 5. Fetch Learning Progress updates (to capture partial video watches/data logs)
        const lpRef = fsCollection(db, 'users', userId, 'learning_progress');
        const lpQuery = fsQuery(
          lpRef,
          fsWhere('updatedAt', '>=', startTime),
          fsWhere('updatedAt', '<=', endTime)
        );
        
        // Execute queries in parallel
        const [historySnap, txSnap, logsSnap, assignmentsSnap, lpSnap] = await Promise.all([
          fsGetDocs(historyQuery).catch(e => { console.warn("Failed to fetch history:", e); return { docs: [] }; }),
          fsGetDocs(txQuery).catch(e => { console.warn("Failed to fetch tx:", e); return { docs: [] }; }),
          fsGetDocs(logsQuery).catch(e => { console.warn("Failed to fetch logs:", e); return { docs: [] }; }),
          fsGetDocs(assignmentsQuery).catch(e => { console.warn("Failed to fetch assignments:", e); return { docs: [] }; }),
          fsGetDocs(lpQuery).catch(e => { console.warn("Failed to fetch lp:", e); return { docs: [] }; })
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
          // Dynamically determine type and increment corresponding stats
          const hType = data.type || 'quiz_pass'; 
          
          let displayType = 'quiz_pass';
          let displayTitle = `🚀 현장 탐사(퀴즈): ${data.unitTitle || '이름 없음'}`;

          if (hType === 'video' || hType === 'video_complete' || hType === 'recovery_mastery') {
            displayType = 'video_complete';
            displayTitle = `🎬 영상 학습 완료: ${data.unitTitle || '이름 없음'}`;
            // If it's a recovery or video type in history, it usually means 100% completion
            // Note: We don't have duration here, but we can treat it as a significant activity.
          } else if (hType === 'text' || hType === 'data_log_read') {
            stats.logCount++;
            displayType = 'data_log_read';
            displayTitle = `📝 데이터 로그 열람: ${data.unitTitle || '이름 없음'}`;
          } else {
            // Default to quiz
            stats.quizCount++;
          }

          aggregated.push({
            id: `quiz_${doc.id}`,
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(),
            type: displayType,
            title: displayTitle,
            score: data.score,
            initialScore: data.initialScore,
            attemptCount: data.attemptCount,
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
            // Avoid duplication: Completion bonus (+20) is already handled by 'history' records
            // only include interval rewards (+10) in the transactions section
            if (data.amount === 20 || desc.includes('완료')) return;

            displayType = 'video_complete';
            displayTitle = `🎬 영상 보상: ${desc.replace(/\s?영상 교신 수신/g, '').replace('보상 (영상 교신 완료)', '보너스')}`;
            
            // Stats: Priority 1: Use stampedSeconds.length if available
            // Priority 2: Use totalTimeSpent if available
            // Priority 3: Fallback to the 180s heuristic
            const videoMetadata = metadata || data.metadata || {};
            const stampedCount = videoMetadata.stampedSeconds?.length;
            const timeSpent = videoMetadata.totalTimeSpent;

            if (stampedCount !== undefined) {
              // Since metadata is cumulative for the current video session, 
              // we don't just sum them up. We should track unique seconds per transmissionId.
              const txId = videoMetadata.transmissionId || 'default';
              if (!stats._videoTxMap) stats._videoTxMap = {};
              stats._videoTxMap[txId] = Math.max(stats._videoTxMap[txId] || 0, stampedCount);
            } else if (timeSpent !== undefined) {
              const txId = videoMetadata.transmissionId || 'default';
              if (!stats._videoTxMap) stats._videoTxMap = {};
              stats._videoTxMap[txId] = Math.max(stats._videoTxMap[txId] || 0, Math.floor(timeSpent));
            } else if (desc.includes('수신') && data.amount === 10) {
              stats.totalVideoSeconds += 180;
            }
          } else if (tType.includes('agora')) {
            displayType = 'agora_activity';
            displayTitle = `🗣️ 아고라 활동: ${desc}`;
          } else if (tType === 'attendance') {
            displayType = 'attendance';
            displayTitle = `✅ 출석: ${desc}`;
          }

          const videoMetadata = metadata || data.metadata || {};
          const vTime = videoMetadata.videoTime || 
                        (videoMetadata.stampedSeconds ? videoMetadata.stampedSeconds.length : undefined) || 
                        videoMetadata.totalTimeSpent;

          aggregated.push({
            id: `tx_${doc.id}`,
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(),
            type: displayType,
            title: displayTitle,
            score: null,
            crystalsEarned: data.amount || 0,
            metadata: {
              ...data,
              videoTime: vTime
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
        
        // --- Process Learning Progress (Capturing partial progress for timeline visibility) ---
        getDocsSafe(lpSnap).forEach(doc => {
          const data = doc.data ? doc.data() : doc;
          // Note: Previously we added cumulative time here, but it caused past records to disappear 
          // when updatedAt moved to a new day. We now only use lpSnap for timeline node generation 
          // if we decide to add one, but NOT for the totalVideoSeconds sum.
          // totalVideoSeconds is now accurately derived from crystal_transactions (transmission_reward) above.
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
