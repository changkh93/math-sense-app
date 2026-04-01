import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, collection as fsCollection, query as fsQuery, where as fsWhere, Timestamp as fsTimestamp } from 'firebase/firestore';

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
    if (!userId || !dateStr) {
      setActivities([]);
      setDailyStats({
        quizCount: 0,
        logCount: 0,
        totalVideoSeconds: 0,
        isAssignmentSubmitted: false
      });
      return;
    }

    setLoading(true);
    setError(null);

    // Track state for each query's data
    let currentHistory = [];
    let currentTx = [];
    let currentLogs = [];
    let currentAssignments = [];
    let currentLP = [];

    // Tracks if each snapshot has fired at least once
    const status = {
      history: false,
      tx: false,
      logs: false,
      assignments: false,
      lp: false
    };

    const attemptAggregate = () => {
      // Logic for aggregating data and updating states...
      const aggregated = [];
      const stats = {
        quizCount: 0,
        logCount: 0,
        totalVideoSeconds: 0,
        isAssignmentSubmitted: currentAssignments.length > 0
      };

      // Helper for cluster name mapping (extracted for consistency)
      const trackedDataLogs = new Set();
      
      const getDocsSafe = (docs) => docs || [];

      // --- Process Transactions (Priority: Rewards) ---
      getDocsSafe(currentTx).forEach(docSnap => {
        const data = docSnap.data();
        const tType = data.type || '';
        const desc = data.description || '';
        const metadata = data.metadata || {};
        
        if (tType === 'quiz_reward') return; 
        if (tType === 'mastery_bonus') return; 

        let displayType = 'general';
        let displayTitle = `💎 광석 획득: ${desc}`;

        if (tType === 'transmission_reward' || tType === 'video_reward') {
          if (data.amount === 20 || desc.includes('완료')) return;

          displayType = 'video_complete';
          displayTitle = `🎬 영상 보상: ${desc.replace(/\s?영상 교신 수신/g, '').replace('보상 (영상 교신 완료)', '보너스')}`;
          
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
          id: `tx_${docSnap.id}`,
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(),
          type: displayType,
          title: displayTitle,
          score: null,
          crystalsEarned: data.amount || 0,
          metadata: { ...data, videoTime: vTime }
        });
      });

      // --- Process Quiz History (Completions) ---
      getDocsSafe(currentHistory).forEach(docSnap => {
        const data = docSnap.data();
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
          id: `quiz_${docSnap.id}`,
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

      // --- Process Activity Logs ---
      getDocsSafe(currentLogs).forEach(docSnap => {
        const data = docSnap.data();
        if (data.action?.includes('DATA LOG')) {
          const cleanTitle = `📝 데이터 로그 열람: ${data.unitTitle || data.unitId || '알 수 없는 단원'}`;
          if (trackedDataLogs.has(cleanTitle)) return;
          trackedDataLogs.add(cleanTitle);

          stats.logCount++;
          aggregated.push({
            id: `log_${docSnap.id}`,
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(),
            type: 'data_log_read',
            title: cleanTitle,
            score: null,
            crystalsEarned: 0,
            metadata: data
          });
        }
      });
      
      // --- Process Learning Progress ---
      getDocsSafe(currentLP).forEach(docSnap => {
        const data = docSnap.data();
        const unitId = docSnap.id;
        
        if (data.videoProgress) {
          Object.entries(data.videoProgress).forEach(([txId, prog]) => {
            const stamps = prog.stampedSeconds?.length || 0;
            if (stamps > 0) {
              if (!stats._videoTxMap) stats._videoTxMap = {};
              stats._videoTxMap[txId] = Math.max(stats._videoTxMap[txId] || 0, stamps);
              
              const hasTimelineEntry = aggregated.some(act => 
                act.metadata?.transmissionId === txId || 
                (act.metadata?.unitId === unitId && act.type === 'video_complete')
              );
              
              if (!hasTimelineEntry && stamps > 10) {
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

        if (data.quizSession && data.quizSession.currentIdx > 0) {
          const session = data.quizSession;
          const answeredCount = Object.keys(session.userAnswers || {}).length;
          const totalCount = session.originalTotal || answeredCount;
          const correctCount = Object.values(session.userAnswers || {})
            .filter(a => a?.isCorrect).length;

          const hasCompletedQuiz = aggregated.some(act =>
            act.type === 'quiz_pass' && (act.metadata?.unitId === unitId)
          );

          if (!hasCompletedQuiz && answeredCount > 0) {
            aggregated.push({
              id: `lp_quiz_progress_${unitId}`,
              timestamp: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
              type: 'quiz_in_progress',
              title: `⏳ 퀴즈 진행 중: ${answeredCount}/${totalCount}문항 (${correctCount}개 정답)`,
              score: null,
              crystalsEarned: 0,
              metadata: { unitId, currentIdx: session.currentIdx, answeredCount, totalCount, correctCount }
            });
            if (!stats._quizInProgress) stats._quizInProgress = 0;
            stats._quizInProgress++;
          }
        }
        
        if (data.logReadAt) {
           const unitTitle = data.unitTitle || unitId;
           const cleanTitle = `📝 데이터 로그 열람: ${unitTitle}`;
           if (!trackedDataLogs.has(cleanTitle)) {
              stats.logCount++;
              trackedDataLogs.add(cleanTitle);
           }
        }
      });

      if (stats._videoTxMap) {
        stats.totalVideoSeconds = Object.values(stats._videoTxMap).reduce((sum, val) => sum + val, 0);
      }

      aggregated.sort((a, b) => {
        const timeA = a.timestamp ? a.timestamp.getTime() : 0;
        const timeB = b.timestamp ? b.timestamp.getTime() : 0;
        return timeA - timeB; 
      });

      setActivities(aggregated);
      setDailyStats(stats);
      
      // If all queries have fired at least once, set loading to false
      if (status.history && status.tx && status.logs && status.assignments && status.lp) {
        setLoading(false);
      }
    };

    const kstStartStr = `${dateStr}T00:00:00+09:00`;
    const kstEndStr = `${dateStr}T23:59:59.999+09:00`;
    const startTime = fsTimestamp.fromDate(new Date(kstStartStr));
    const endTime = fsTimestamp.fromDate(new Date(kstEndStr));

    // 1. History Listener
    const historyRef = fsCollection(db, 'users', userId, 'history');
    const unsubHistory = onSnapshot(fsQuery(historyRef, fsWhere('timestamp', '>=', startTime), fsWhere('timestamp', '<=', endTime)), (snap) => {
      currentHistory = snap.docs;
      status.history = true;
      attemptAggregate();
    }, (err) => console.error("History listen error:", err));

    // 2. Crystal Transactions Listener
    const txRef = fsCollection(db, 'users', userId, 'crystal_transactions');
    const unsubTx = onSnapshot(fsQuery(txRef, fsWhere('timestamp', '>=', startTime), fsWhere('timestamp', '<=', endTime)), (snap) => {
      currentTx = snap.docs;
      status.tx = true;
      attemptAggregate();
    }, (err) => console.error("Tx listen error:", err));

    // 3. Activity Logs Listener
    const logsRef = fsCollection(db, 'users', userId, 'activityLogs');
    const unsubLogs = onSnapshot(fsQuery(logsRef, fsWhere('timestamp', '>=', startTime), fsWhere('timestamp', '<=', endTime)), (snap) => {
      currentLogs = snap.docs;
      status.logs = true;
      attemptAggregate();
    }, (err) => console.error("Logs listen error:", err));

    // 4. Assignments Listener
    const assignmentsRef = fsCollection(db, 'assignments');
    const unsubAssignments = onSnapshot(fsQuery(assignmentsRef, fsWhere('userId', '==', userId), fsWhere('submittedAt', '>=', startTime), fsWhere('submittedAt', '<=', endTime)), (snap) => {
      currentAssignments = snap.docs;
      status.assignments = true;
      attemptAggregate();
    }, (err) => console.error("Assignments listen error:", err));

    // 5. Learning Progress Listener
    const lpRef = fsCollection(db, 'users', userId, 'learning_progress');
    const unsubLP = onSnapshot(fsQuery(lpRef, fsWhere('updatedAt', '>=', startTime), fsWhere('updatedAt', '<=', endTime)), (snap) => {
      currentLP = snap.docs;
      status.lp = true;
      attemptAggregate();
    }, (err) => console.error("LP listen error:", err));

    return () => {
      unsubHistory();
      unsubTx();
      unsubLogs();
      unsubAssignments();
      unsubLP();
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
