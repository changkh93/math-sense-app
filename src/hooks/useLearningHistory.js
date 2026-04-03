import { useState, useEffect, useMemo } from 'react';
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
 * @returns {object} { activities, dailyStats, loading, error }
 */
export function useLearningHistory(userId, dateStr) {
  const [activities, setActivities] = useState([]);
  const [groupedActivities, setGroupedActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dailyStats, setDailyStats] = useState({
    quizCount: 0,
    logCount: 0,
    totalVideoSeconds: 0,
    isAssignmentSubmitted: false
  });

  // Raw data state to hold snapshots from all listeners
  const [rawData, setRawData] = useState({
    history: [],
    tx: [],
    logs: [],
    assignments: [],
    lp: [],
    loaded: {
      history: false,
      tx: false,
      logs: false,
      assignments: false,
      lp: false
    }
  });

  // ── Date range computed once per dateStr change (shared by listener & aggregation effects) ──
  const { startTime, endTime } = useMemo(() => {
    if (!dateStr) return { startTime: null, endTime: null };
    const kstStartStr = `${dateStr}T00:00:00+09:00`;
    const kstEndStr = `${dateStr}T23:59:59.999+09:00`;
    return {
      startTime: fsTimestamp.fromDate(new Date(kstStartStr)),
      endTime: fsTimestamp.fromDate(new Date(kstEndStr))
    };
  }, [dateStr]);

  // SET UP LISTENERS
  useEffect(() => {
    if (!userId || !dateStr || !startTime || !endTime) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const updateRaw = (key, docs) => {
      setRawData(prev => ({
        ...prev,
        [key]: docs,
        loaded: { ...prev.loaded, [key]: true }
      }));
    };

    // 1. History
    const unsubHistory = onSnapshot(fsQuery(
      fsCollection(db, 'users', userId, 'history'),
      fsWhere('timestamp', '>=', startTime),
      fsWhere('timestamp', '<=', endTime)
    ), (snap) => updateRaw('history', snap.docs), (err) => {
      console.error("History listen error:", err);
      updateRaw('history', []); // Still mark as loaded
    });

    // 2. Transactions
    const unsubTx = onSnapshot(fsQuery(
      fsCollection(db, 'users', userId, 'crystal_transactions'),
      fsWhere('timestamp', '>=', startTime),
      fsWhere('timestamp', '<=', endTime)
    ), (snap) => updateRaw('tx', snap.docs), (err) => {
      console.error("Tx listen error:", err);
      updateRaw('tx', []);
    });

    // 3. Logs
    const unsubLogs = onSnapshot(fsQuery(
      fsCollection(db, 'users', userId, 'activityLogs'),
      fsWhere('timestamp', '>=', startTime),
      fsWhere('timestamp', '<=', endTime)
    ), (snap) => updateRaw('logs', snap.docs), (err) => {
      console.error("Logs listen error:", err);
      updateRaw('logs', []);
    });

    // 4. Assignments
    const unsubAssignments = onSnapshot(fsQuery(
      fsCollection(db, 'assignments'),
      fsWhere('userId', '==', userId),
      fsWhere('submittedAt', '>=', startTime),
      fsWhere('submittedAt', '<=', endTime)
    ), (snap) => updateRaw('assignments', snap.docs), (err) => {
      console.error("Assignments listen error:", err);
      updateRaw('assignments', []);
    });

    // 5. LP (Fetch all progress docs for the user to ensure we catch all state)
    const unsubLP = onSnapshot(fsCollection(db, 'users', userId, 'learning_progress'), (snap) => {
      updateRaw('lp', snap.docs);
    }, (err) => {
      console.error("LP listen error:", err);
      updateRaw('lp', []);
    });

    return () => {
      unsubHistory();
      unsubTx();
      unsubLogs();
      unsubAssignments();
      unsubLP();
    };
  }, [userId, dateStr, startTime, endTime]);

  // AGGREGATE DATA
  useEffect(() => {
    // Check if at least one essential stream is active
    if (!rawData.loaded.history && !rawData.loaded.tx && !rawData.loaded.logs && !rawData.loaded.lp) {
      return; 
    }
    // Guard: startTime/endTime must be available for LP date filtering
    if (!startTime || !endTime) return;

    const aggregated = [];
    const stats = {
      quizCount: 0,
      logCount: 0,
      totalVideoSeconds: 0,
      isAssignmentSubmitted: rawData.assignments.length > 0,
      _videoTxMap: {} // Use a private map for calculating unique video time
    };
    const trackedDataLogs = new Set();

    // Helper to generate a unique key for video activities
    const getVideoKey = (unitId, txId) => `${unitId || 'no_unit'}_${txId || 'default'}`;

    // --- Process Transactions ---
    rawData.tx.forEach(docSnap => {
      const data = docSnap.data();
      const tType = data.type || '';
      const desc = data.description || '';
      const metadata = data.metadata || {};
      
      if (tType === 'quiz_reward' || tType === 'mastery_bonus') return; 

      let displayType = 'general';
      let displayTitle = data.amount < 0 ? `🛒 광석 소모: ${desc}` : `💎 광석 획득: ${desc}`;

      if (tType === 'streak_freeze') {
        displayType = 'streak_freeze';
        displayTitle = `🧊 궤도 방어: ${desc}`;
      } else if (tType === 'store_purchase') {
        displayType = 'store_purchase';
        displayTitle = `🛒 아이템 구매: ${desc}`;
      } else if (tType === 'maintenance_compensation' || tType === 'admin_reward') {
        displayType = 'admin_reward';
        displayTitle = `🎁 운영자 선물: ${desc}`;
      }

      if (tType === 'transmission_reward' || tType === 'video_reward') {
        if (data.amount === 20 || desc.includes('완료')) return;
        displayType = 'video_reward';
        displayTitle = `🎬 영상 학습: ${desc.replace(/\s?영상 교신 수신/g, '').replace('보상 (영상 교신 완료)', '').replace('보너스', '').trim()}`;
        
        const videoMetadata = metadata || {};
        const vTime = videoMetadata.stampedSeconds?.length || videoMetadata.totalTimeSpent || 0;
        if (vTime > 0) {
          const unitId = videoMetadata.unitId || 'unknown';
          const txId = videoMetadata.transmissionId || 'default';
          const vKey = getVideoKey(unitId, txId);
          stats._videoTxMap[vKey] = Math.max(stats._videoTxMap[vKey] || 0, Math.floor(vTime));
          metadata.videoTime = Math.floor(vTime); // Attach for UI display
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
        // unitId-based dedup key to prevent title variations from causing duplicates
        const dedupeKey = `datalog_${metadata.unitId || desc}`;
        const cleanTitle = `📝 데이터 로그 열람: ${desc.replace('보상 (데이터 로그 학습)', '').replace('보상', '').trim()}`;
        if (trackedDataLogs.has(dedupeKey)) return; // Skip duplicate — don't push to aggregated
        trackedDataLogs.add(dedupeKey);
        stats.logCount++;
        displayTitle = cleanTitle;
      }

      aggregated.push({
        id: `tx_${docSnap.id}`,
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(),
        type: displayType,
        title: displayTitle,
        score: null,
        crystalsEarned: data.amount || 0,
        metadata: data
      });
    });

    // --- Process Quiz History ---
    rawData.history.forEach(docSnap => {
      const data = docSnap.data();
      const hType = data.type || 'quiz_pass';
      let displayType = 'quiz_pass';
      let displayTitle = `🚀 현장 탐사(퀴즈): ${data.unitTitle || '이름 없음'}`;

      if (hType === 'video' || hType === 'video_complete' || hType === 'recovery_mastery') {
        displayType = 'video_reward';
        displayTitle = `🎬 영상 학습: ${data.unitTitle || '이름 없음'}`;
      } else if (hType === 'text' || hType === 'data_log_read') {
        // unitId-based dedup key — consistent with transaction processing
        const dedupeKey = `datalog_${data.unitId || data.unitTitle || '이름 없음'}`;
        if (trackedDataLogs.has(dedupeKey)) return; // Skip duplicate entirely
        trackedDataLogs.add(dedupeKey);
        stats.logCount++;
        displayType = 'data_log_read';
        displayTitle = `📝 데이터 로그 열람: ${data.unitTitle || '이름 없음'}`;
      } else {
        stats.quizCount++;
      }

      if ((displayType === 'video_reward' || hType === 'video')) {
        const unitId = data.unitId || 'unknown';
        const txId = data.transmissionId || 'default';
        const vKey = getVideoKey(unitId, txId);
        const vTime = data.videoTime || data.stampedCount || 0;
        if (vTime > 0) {
          stats._videoTxMap[vKey] = Math.max(stats._videoTxMap[vKey] || 0, Math.floor(vTime));
        }
      }

      aggregated.push({
        id: `quiz_${docSnap.id}`,
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(),
        type: displayType,
        title: displayTitle,
        score: (displayType === 'quiz_pass' || displayType === 'quiz_in_progress') ? data.score : null,
        crystalsEarned: data.crystalsEarned || 0,
        metadata: {
          ...data,
          videoTime: data.videoTime || data.stampedCount || 0
        }
      });
    });

    // --- Process Activity Logs ---
    rawData.logs.forEach(docSnap => {
      const data = docSnap.data();
      const action = data.action || '';
      if (action.includes('DATA LOG') || action.includes('view_text') || action.includes('data_log')) {
        // unitId-based dedup key — consistent with other sections
        const dedupeKey = `datalog_${data.unitId || data.unitTitle || '알 수 없는 단원'}_${action}`;
        if (trackedDataLogs.has(dedupeKey)) return;
        trackedDataLogs.add(dedupeKey);
        stats.logCount++;
        const cleanTitle = `📝 데이터 로그 열람: ${data.unitTitle || data.unitId || '알 수 없는 단원'}`;
        aggregated.push({
          id: `log_${docSnap.id}`,
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(),
          type: 'data_log_read',
          title: cleanTitle,
          score: null,
          crystalsEarned: 0,
          metadata: data
        });
      } else if (action === 'view_video' || action === 'overlay_view_video') {
         stats._videoTxMap[getVideoKey(data.unitId, 'default')] = 1; // Mark at least 1 second to count as video view if not in LP
         aggregated.push({
           id: `log_vid_${docSnap.id}`,
           timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(),
           type: 'video_view',
           title: `🎬 영상 열람: ${data.unitTitle || data.unitId || '알 수 없는 단원'}`,
           score: null,
           metadata: data
         });
      }
    });

    // --- Process Learning Progress ---
    const dayStart = startTime.toDate();
    const dayEnd = endTime.toDate();

    rawData.lp.forEach(docSnap => {
      try {
        const data = docSnap.data();
        const unitId = docSnap.id;
        
        // Filter for activity today using updatedAt
        // Handle pending serverTimestamp() by defaulting to "now" for local updates
        const updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date();
        const isUpdatedToday = updatedAt >= dayStart && updatedAt <= dayEnd;

        if (data.videoProgress) {
          Object.entries(data.videoProgress).forEach(([txId, prog]) => {
            const stamps = prog.stampedSeconds?.length || 0;
            if (stamps > 0) {
              // Robust prog.updatedAt parsing: handle all serverTimestamp() states
              let progUpdatedAt;
              if (prog.updatedAt?.toDate) {
                progUpdatedAt = prog.updatedAt.toDate();         // Firestore Timestamp
              } else if (prog.updatedAt?.seconds) {
                progUpdatedAt = new Date(prog.updatedAt.seconds * 1000); // Raw seconds obj
              } else if (typeof prog.updatedAt === 'number') {
                progUpdatedAt = new Date(prog.updatedAt);         // Client ms timestamp
              } else {
                // serverTimestamp() pending or missing
                // Fall back to document-level updatedAt, or "now" if doc also pending
                progUpdatedAt = isUpdatedToday ? updatedAt : new Date();
              }
              const isProgUpdatedToday = progUpdatedAt >= dayStart && progUpdatedAt <= dayEnd;

              if (isProgUpdatedToday) {
                 const vKey = getVideoKey(unitId, txId);
                 stats._videoTxMap[vKey] = Math.max(stats._videoTxMap[vKey] || 0, stamps);
                 
                 const isAlreadyTracked = aggregated.some(a => 
                   (a.type === 'video_reward' || a.type === 'video_view') && 
                   (
                      (a.metadata?.transmissionId === txId && a.metadata?.unitId === unitId) ||
                      (a.metadata?.unitId === unitId && !a.metadata?.transmissionId && Object.keys(data.videoProgress).length === 1)
                   )
                 );

                 if (!isAlreadyTracked) {
                   aggregated.push({
                     id: `lp_p_${unitId}_${txId}`,
                     timestamp: progUpdatedAt || new Date(),
                     type: 'video_view',
                     title: `🎬 영상 학습: ${prog.transmissionTitle || '영상'}`,
                     score: null,
                     metadata: { ...prog, unitId, transmissionId: txId, videoTime: stamps }
                   });
                 }
              }
            }

          });
        }

        if (isUpdatedToday) {
          if (data.quizSession && data.quizSession.currentIdx > 0) {
            const session = data.quizSession;
            const answeredCount = Object.keys(session.userAnswers || {}).length;
            if (answeredCount > 0 && !aggregated.some(a => a.type === 'quiz_pass' && a.metadata?.unitId === unitId)) {
              aggregated.push({
                id: `lp_q_${unitId}`,
                timestamp: updatedAt || new Date(),
                type: 'quiz_in_progress',
                title: `🚀 퀴즈: ${answeredCount}/${session.originalTotal || '?'}문항`,
                score: null,
                metadata: { unitId, ...session }
              });
            }
          }
          if (data.logReadAt) {
             const logReadTime = data.logReadAt.toDate ? data.logReadAt.toDate() : new Date(data.logReadAt);
             const isReadToday = logReadTime >= dayStart && logReadTime <= dayEnd;

             if (isReadToday) {
                const cleanTitle = `📝 데이터 로그 열람: ${data.unitTitle || unitId}`;
                if (!trackedDataLogs.has(cleanTitle)) {
                   stats.logCount++;
                   trackedDataLogs.add(cleanTitle);
                   
                   // Ensure it's in the activity feed as well
                   const isAlreadyInFeed = aggregated.some(a => a.type === 'data_log_read' && a.title === cleanTitle);
                   if (!isAlreadyInFeed) {
                      aggregated.push({
                         id: `lp_log_${unitId}`,
                         timestamp: logReadTime,
                         type: 'data_log_read',
                         title: cleanTitle,
                         score: null,
                         crystalsEarned: 0,
                         metadata: data
                      });
                   }
                }
             }
          }
        }
      } catch (lpErr) {
        console.warn('LP processing error for doc:', docSnap.id, lpErr);
      }
    });

    const sumVideoSeconds = Object.values(stats._videoTxMap).reduce((sum, val) => sum + val, 0);
    stats.totalVideoSeconds += sumVideoSeconds;

    aggregated.sort((a, b) => (a.timestamp?.getTime() || 0) - (b.timestamp?.getTime() || 0));

    setActivities(aggregated);

    // ── Grouping Pipeline: merge by unitId + activityType ──
    const grouped = buildGroupedActivities(aggregated);
    setGroupedActivities(grouped);

    setDailyStats(stats);
    
    if (Object.values(rawData.loaded).every(v => v === true)) {
      setLoading(false);
    }
  }, [rawData, startTime, endTime]);

  // ── Missing Title Resolution Effect ──
  useEffect(() => {
    if (!groupedActivities.length) return;

    let mounted = true;
    const missingIds = new Set();
    groupedActivities.forEach(group => {
      let title = group.unitTitle;
      
      // Cleanup garbage prefix like "🎬 영상 열람:" if it somehow survived
      if (title.includes(':')) {
        title = title.substring(title.indexOf(':') + 1).trim();
      }
      
      if (!unitTitleCache.has(group.unitId)) {
        const isUgly = !title || looksLikeId(title) || title.includes('unit_') || title.includes('영상 열람');
        const isHumanized = /^(Py Math|Chap|Reg|Cluster)\b/i.test(title);
        if (isUgly || isHumanized) {
          missingIds.add(group.unitId);
        }
      }
    });

    if (missingIds.size > 0 && mounted) {
      const fetchMissingTitles = async () => {
        try {
          const { getDoc, doc } = await import('firebase/firestore');
          const promises = Array.from(missingIds).map(async id => {
            if (unitTitleCache.has(id)) return;
            const snap = await getDoc(doc(db, 'units', id));
            if (snap.exists()) {
              const data = snap.data();
              if (data.title || data.name) {
                unitTitleCache.set(id, data.title || data.name);
              } else {
                 unitTitleCache.set(id, null); // mark as not found
              }
            } else {
              unitTitleCache.set(id, null); // missing document
            }
          });
          
          await Promise.all(promises);

          if (mounted) {
            setGroupedActivities(prev => prev.map(group => {
              let title = group.unitTitle;
              if (title.includes(':')) title = title.substring(title.indexOf(':') + 1).trim();

              const cached = unitTitleCache.get(group.unitId);
              if (cached) {
                return { ...group, unitTitle: cached };
              }
              
              if (looksLikeId(title) || title.includes('unit_')) title = humanizeId(group.unitId);
              return { ...group, unitTitle: title };
            }));
          }
        } catch (err) {
          console.warn('Failed to fetch missing unit titles:', err);
        }
      };
      fetchMissingTitles();
    } else {
      // If we don't need to fetch, we should still ensure any prefixed garbage is stripped from state
      let updated = false;
      const newGroups = groupedActivities.map(group => {
         let title = group.unitTitle;
         const cached = unitTitleCache.get(group.unitId);
         if (cached && title !== cached) {
           updated = true;
           return { ...group, unitTitle: cached };
         }
         if (title.includes(':')) {
           title = title.substring(title.indexOf(':') + 1).trim();
           if (looksLikeId(title) || title.includes('unit_')) title = humanizeId(group.unitId);
           updated = true;
           return { ...group, unitTitle: title };
         }
         return group;
      });
      if (updated && mounted) {
         setGroupedActivities(newGroups);
      }
    }

    return () => { mounted = false; };
  }, [groupedActivities, rawData]);

  return { activities, groupedActivities, dailyStats, loading, error };
}

const unitTitleCache = new Map();

// ── Learning-only activity types ──
const LEARNING_TYPES = new Set([
  'quiz_pass', 'quiz_in_progress', 'video_reward', 'video_view', 'data_log_read'
]);

/**
 * Resolve a human-readable title from activity metadata.
 * Falls back gracefully: unitTitle > transmissionTitle > cleaned unitId > fallback.
 */
function resolveTitle(act) {
  // 1. Direct title from metadata
  const meta = act.metadata || {};
  if (meta.unitTitle && !looksLikeId(meta.unitTitle)) return meta.unitTitle;
  if (act.metadata?.metadata?.unitTitle && !looksLikeId(act.metadata.metadata.unitTitle)) return act.metadata.metadata.unitTitle;
  
  // 2. transmissionTitle for video activities
  if (meta.transmissionTitle && !looksLikeId(meta.transmissionTitle)) return meta.transmissionTitle;
  
  // 3. regionTitle as context  
  if (meta.regionTitle && !looksLikeId(meta.regionTitle)) return meta.regionTitle;
  
  // 4. Extract from the display title (strip emoji prefixes)
  const cleaned = (act.title || '')
    .replace(/^[🚀🎬📝⏳💎🛒🧊🎁✅🗣️📌]\s*/g, '')
    .replace(/^(현장 탐사\(퀴즈\)|영상 보상|영상 학습 완료|영상 학습 진행|영상 열람|데이터 로그 열람)[:\s]*/g, '')
    .replace(/\s*보상\s*\(.*?\)\s*$/g, '')
    .trim();
  if (cleaned && !looksLikeId(cleaned)) return cleaned;
  
  // 5. unitId as absolute fallback — but try to humanize it
  const uid = meta.unitId || '';
  if (uid) return humanizeId(uid);
  
  return '학습 활동';
}

/** Check if a string looks like a machine-generated ID (contains underscores + numbers pattern) */
function looksLikeId(str) {
  if (!str) return true;
  // Patterns like: unit_gameproj_13, reg_177340..., chap_177383...
  return /^(unit|reg|chap|prob|cluster)_\d/.test(str) || 
         /^\w+_\d{10,}/.test(str) ||
         /^[a-f0-9]{24,}$/.test(str);
}

/** Convert a raw ID like "unit_gameproj_13" to something slightly more readable */
function humanizeId(id) {
  return id
    .replace(/^(unit|reg|chap|prob|cluster)_/g, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim() || '학습 활동';
}

/**
 * Group raw activities into clean, deduplicated learning cards.
 * Key: unitId + activityType (quiz | video | text)
 */
function buildGroupedActivities(rawActivities) {
  // 1. Filter to learning-only activities
  const learningOnly = rawActivities.filter(a => LEARNING_TYPES.has(a.type));
  
  // 2. Build groups by unitId + normalized type
  const groupMap = new Map();
  
  learningOnly.forEach(act => {
    const meta = act.metadata || {};
    const unitId = meta.unitId || meta.metadata?.unitId || extractUnitId(act) || 'unknown';
    
    let normalizedType = 'quiz';
    if (act.type === 'video_reward' || act.type === 'video_view') normalizedType = 'video';
    else if (act.type === 'data_log_read') normalizedType = 'text';
    else if (act.type === 'quiz_in_progress' || act.type === 'quiz_pass') normalizedType = 'quiz';
    
    const groupKey = `${unitId}_${normalizedType}`;
    
    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        id: `group_${groupKey}`,
        type: normalizedType,
        unitId: unitId,
        unitTitle: '', // resolved below
        regionTitle: meta.regionTitle || '',
        chapterId: meta.chapterId || '',
        firstTimestamp: act.timestamp,
        lastTimestamp: act.timestamp,
        score: null,
        initialScore: undefined,
        attemptCount: undefined,
        answeredCount: 0,
        totalCount: 0,
        totalVideoSeconds: 0,
        completed: false,
        subActivities: []
      });
    }
    
    const group = groupMap.get(groupKey);
    group.subActivities.push(act);
    
    // Update timestamps
    if (act.timestamp && (!group.firstTimestamp || act.timestamp < group.firstTimestamp)) {
      group.firstTimestamp = act.timestamp;
    }
    if (act.timestamp && (!group.lastTimestamp || act.timestamp > group.lastTimestamp)) {
      group.lastTimestamp = act.timestamp;
    }
    
    // Quiz: take best score
    if (normalizedType === 'quiz' && act.score !== null && act.score !== undefined) {
      if (group.score === null || act.score > group.score) {
        group.score = act.score;
        // Also capture initial score and attempt count from the same entry
        if (act.metadata?.initialScore !== undefined) group.initialScore = act.metadata.initialScore;
        if (act.metadata?.attemptCount !== undefined) group.attemptCount = act.metadata.attemptCount;
      }
      group.completed = true;
    }
    if (act.type === 'quiz_in_progress' && !group.completed) {
      // Only set in-progress if we haven't already seen a completed quiz
      group.score = null;
      // Capture progress counts from quizSession metadata
      const answered = Object.keys(meta.userAnswers || {}).length;
      const total = meta.originalTotal || 0;
      if (answered > group.answeredCount) {
        group.answeredCount = answered;
        group.totalCount = total;
      }
    }
    
    // Also capture counts from completed quizzes if available
    if (normalizedType === 'quiz' && act.metadata?.correctCount !== undefined) {
      // For completed, "answered" is essentially "total" (all are answered)
      // But we can use totalCount specifically
      if (act.metadata.totalCount) group.totalCount = act.metadata.totalCount;
    }
    
    // Video: accumulate max video time
    const vTime = meta.videoTime || meta.stampedCount || meta.metadata?.videoTime || 0;
    if (vTime > 0) {
      group.totalVideoSeconds = Math.max(group.totalVideoSeconds, Math.floor(vTime));
    }
    
    // Completion markers
    if (act.completed === true || act.type === 'video_reward') {
      group.completed = true;
    }
    // Fuzzy title match for non-video activities
    if (normalizedType !== 'video' && act.title?.includes('완료') && !act.title?.includes('진행')) {
      group.completed = true;
    }
    // Only inherit 'complete' word if it's explicitly about finishing
    if (act.title?.toLowerCase().includes('complete') && !act.title?.includes('video_')) {
      group.completed = true;
    }
    
    // Data log: always counts as completed once seen
    if (normalizedType === 'text') {
      group.completed = true;
    }
  });
  
  // 3. Resolve titles using best available info from sub-activities
  groupMap.forEach((group) => {
    // Try each sub-activity for the best title
    let bestTitle = '';
    for (const sub of group.subActivities) {
      const candidate = resolveTitle(sub);
      if (candidate && !looksLikeId(candidate) && candidate.length > bestTitle.length) {
        bestTitle = candidate;
      }
      // Also capture regionTitle if found
      const rTitle = sub.metadata?.regionTitle;
      if (rTitle && !group.regionTitle) group.regionTitle = rTitle;
    }
    group.unitTitle = bestTitle || humanizeId(group.unitId);
  });
  
  // 4. Sort by first timestamp
  const result = Array.from(groupMap.values());
  result.sort((a, b) => (a.firstTimestamp?.getTime() || 0) - (b.firstTimestamp?.getTime() || 0));
  
  return result;
}

/** Try to extract unitId from various metadata locations */
function extractUnitId(act) {
  const meta = act.metadata || {};
  return meta.unitId || meta.metadata?.unitId || null;
}
