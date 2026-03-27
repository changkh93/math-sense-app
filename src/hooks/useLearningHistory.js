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

        // --- Process Transactions (Priority: Rewards) ---
        const trackedDataLogs = new Set();
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
            
            // Stats logic...
            const videoMetadata = metadata || data.metadata || {};
            const stampedCount = videoMetadata.stampedSeconds?.length;
            const timeSpent = videoMetadata.totalTimeSpent;

            if (stampedCount !== undefined) {
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
          } else if (tType === 'data_log_reward') {
            displayType = 'data_log_read';
            const cleanTitle = `📝 데이터 로그 열람: ${desc.replace('보상 (데이터 로그 학습)', '').replace('보상', '').trim()}`;
            if (trackedDataLogs.has(cleanTitle)) return;
            trackedDataLogs.add(cleanTitle);
            displayTitle = cleanTitle;
            stats.logCount++;
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
            metadata: { ...data, videoTime: vTime }
          });
        });

        // --- Process Quiz History (Completions) ---
        getDocsSafe(historySnap).forEach(doc => {
          const data = doc.data ? doc.data() : doc;
          const hType = data.type || 'quiz_pass'; 
          
          let displayType = 'quiz_pass';
          let displayTitle = `🚀 현장 탐사(퀴즈): ${data.unitTitle || '이름 없음'}`;

          if (hType === 'video' || hType === 'video_complete' || hType === 'recovery_mastery') {
            displayType = 'video_complete';
            displayTitle = `🎬 영상 학습 완료: ${data.unitTitle || '이름 없음'}`;
          } else if (hType === 'text' || hType === 'data_log_read') {
            const cleanTitle = `📝 데이터 로그 열람: ${data.unitTitle || '이름 없음'}`;
            if (trackedDataLogs.has(cleanTitle)) return;
            trackedDataLogs.add(cleanTitle);
            
            stats.logCount++;
            displayType = 'data_log_read';
            displayTitle = cleanTitle;
          } else {
            stats.quizCount++;
          }

          if ((displayType === 'video_complete' || hType === 'video') && (data.videoTime || data.stampedCount)) {
            const txId = data.transmissionId || 'default';
            if (!stats._videoTxMap) stats._videoTxMap = {};
            const vTime = data.videoTime || data.stampedCount || 0;
            stats._videoTxMap[txId] = Math.max(stats._videoTxMap[txId] || 0, Math.floor(vTime));
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

        // --- Process Activity Logs (General Actions) ---
        getDocsSafe(logsSnap).forEach(doc => {
          const data = doc.data ? doc.data() : doc;
          if (data.action?.includes('DATA LOG')) {
            const cleanTitle = `📝 데이터 로그 열람: ${data.unitTitle || data.unitId || '알 수 없는 단원'}`;
            
            // AGGRESSIVE DE-DUPLICATION: Use the same title key
            if (trackedDataLogs.has(cleanTitle)) return;
            trackedDataLogs.add(cleanTitle);

            stats.logCount++;
            aggregated.push({
              id: `log_${doc.id}`,
              timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(),
              type: 'data_log_read',
              title: cleanTitle,
              score: null,
              crystalsEarned: 0,
              metadata: data
            });
          }
        });
        
        // --- Process Learning Progress (Capturing partial progress for timeline visibility) ---
        getDocsSafe(lpSnap).forEach(doc => {
          const data = doc.data ? doc.data() : doc;
          const unitId = doc.id;
          
          if (data.videoProgress) {
            Object.entries(data.videoProgress).forEach(([txId, prog]) => {
              const stamps = prog.stampedSeconds?.length || 0;
              if (stamps > 0) {
                if (!stats._videoTxMap) stats._videoTxMap = {};
                stats._videoTxMap[txId] = Math.max(stats._videoTxMap[txId] || 0, stamps);
                
                // PARTIAL PROGRESS TIMELINE NODE
                // If it's a significant amount of new time (relative to total) 
                // and there's no completion reward for it today, show it.
                const hasTimelineEntry = aggregated.some(act => 
                  act.metadata?.transmissionId === txId || 
                  (act.metadata?.unitId === unitId && act.type === 'video_complete')
                );
                
                if (!hasTimelineEntry && stamps > 10) { // Only show if > 10s watched
                  aggregated.push({
                    id: `lp_partial_${unitId}_${txId}`,
                    timestamp: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
                    type: 'video_complete',
                    title: `🎬 영상 학습 진행 (${Math.floor(stamps / 60)}분): ${prog.transmissionTitle || '영상'}`,
                    score: null,
                    crystalsEarned: 0,
                    metadata: { ...prog, unitId, videoTime: stamps }
                  });
                }
              }
            });
          }
          
          if (data.logReadAt) {
             const unitTitle = data.unitTitle || unitId;
             const cleanTitle = `📝 데이터 로그 열람: ${unitTitle}`;
             
             // Ensure logCount includes units read today but perhaps not rewarded yet
             if (!trackedDataLogs.has(cleanTitle)) {
                stats.logCount++;
                trackedDataLogs.add(cleanTitle);
             }
          }
        });

        // --- FINAL AGGREGATION: Sum Video Seconds ---
        if (stats._videoTxMap) {
          stats.totalVideoSeconds = Object.values(stats._videoTxMap).reduce((sum, val) => sum + val, 0);
        }

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
