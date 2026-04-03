import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, collection as fsCollection, query as fsQuery, where as fsWhere, Timestamp as fsTimestamp } from 'firebase/firestore';

/**
 * Custom hook to fetch a user's combined learning history for a specific date.
 * 
 * V2 — Redesigned for reliability and simplicity.
 * 
 * Data Sources (3):
 * 1. users/{uid}/history       — Quiz/Video/Text completion records (PRIMARY)
 * 2. users/{uid}/crystal_transactions — Rewards, purchases, streak freezes
 * 3. users/{uid}/learning_progress   — In-progress quiz/video sessions
 * 
 * Removed:
 * - activityLogs (telemetry only, not for UI rendering)
 * - assignments (checked via simple flag only)
 * 
 * Key Design Decisions:
 * - Title resolution is done at WRITE time (not READ time)
 * - No async title fetching/caching — titles come from the stored documents
 * - groupedActivities is derived via useMemo (no useState + useEffect loop)
 * 
 * @param {string} userId - The user's ID
 * @param {string} dateStr - The target date in YYYY-MM-DD format (KST)
 * @returns {object} { activities, groupedActivities, dailyStats, loading, error }
 */
export function useLearningHistory(userId, dateStr) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dailyStats, setDailyStats] = useState({
    quizCount: 0,
    logCount: 0,
    totalVideoSeconds: 0,
    isAssignmentSubmitted: false
  });

  // Raw data state
  const [rawData, setRawData] = useState({
    history: [],
    tx: [],
    lp: [],
    assignmentCount: 0,
    loaded: { history: false, tx: false, lp: false, assignmentCount: false }
  });

  // ── Date range (KST) ──
  const { startTime, endTime } = useMemo(() => {
    if (!dateStr) return { startTime: null, endTime: null };
    const kstStartStr = `${dateStr}T00:00:00+09:00`;
    const kstEndStr = `${dateStr}T23:59:59.999+09:00`;
    return {
      startTime: fsTimestamp.fromDate(new Date(kstStartStr)),
      endTime: fsTimestamp.fromDate(new Date(kstEndStr))
    };
  }, [dateStr]);

  // ── SET UP LISTENERS ──
  useEffect(() => {
    if (!userId || !dateStr || !startTime || !endTime) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const updateRaw = (key, value) => {
      setRawData(prev => ({
        ...prev,
        [key]: value,
        loaded: { ...prev.loaded, [key]: true }
      }));
    };

    // 1. History (PRIMARY source — quiz, video, text completions)
    const unsubHistory = onSnapshot(fsQuery(
      fsCollection(db, 'users', userId, 'history'),
      fsWhere('timestamp', '>=', startTime),
      fsWhere('timestamp', '<=', endTime)
    ), (snap) => updateRaw('history', snap.docs), (err) => {
      console.error("History listen error:", err);
      updateRaw('history', []);
    });

    // 2. Transactions (rewards, purchases, streak freezes)
    const unsubTx = onSnapshot(fsQuery(
      fsCollection(db, 'users', userId, 'crystal_transactions'),
      fsWhere('timestamp', '>=', startTime),
      fsWhere('timestamp', '<=', endTime)
    ), (snap) => updateRaw('tx', snap.docs), (err) => {
      console.error("Tx listen error:", err);
      updateRaw('tx', []);
    });

    // 3. Learning Progress (all docs — for in-progress sessions)
    const unsubLP = onSnapshot(
      fsCollection(db, 'users', userId, 'learning_progress'),
      (snap) => updateRaw('lp', snap.docs),
      (err) => {
        console.error("LP listen error:", err);
        updateRaw('lp', []);
      }
    );

    // 4. Assignments (lightweight: just check if any exist for this date)
    const unsubAssignments = onSnapshot(fsQuery(
      fsCollection(db, 'assignments'),
      fsWhere('userId', '==', userId),
      fsWhere('submittedAt', '>=', startTime),
      fsWhere('submittedAt', '<=', endTime)
    ), (snap) => updateRaw('assignmentCount', snap.size), (err) => {
      console.error("Assignments listen error:", err);
      updateRaw('assignmentCount', 0);
    });

    return () => {
      unsubHistory();
      unsubTx();
      unsubLP();
      unsubAssignments();
    };
  }, [userId, dateStr, startTime, endTime]);

  // ── AGGREGATE DATA ──
  useEffect(() => {
    if (!rawData.loaded.history && !rawData.loaded.tx && !rawData.loaded.lp) return;
    if (!startTime || !endTime) return;

    const aggregated = [];
    const stats = {
      quizCount: 0,
      logCount: 0,
      totalVideoSeconds: 0,
      isAssignmentSubmitted: (typeof rawData.assignmentCount === 'number' ? rawData.assignmentCount : rawData.assignmentCount?.length) > 0,
      _videoTxMap: {}
    };
    const trackedDataLogs = new Set();
    const getVideoKey = (unitId, txId) => `${unitId || 'no_unit'}_${txId || 'default'}`;

    // ── 1. Process History (PRIMARY) ──
    rawData.history.forEach(docSnap => {
      const data = docSnap.data();
      const hType = data.type || 'quiz_pass';
      let displayType = 'quiz_pass';
      const title = data.unitTitle || formatUnitId(data.unitId);

      if (hType === 'video' || hType === 'video_complete' || hType === 'recovery_mastery') {
        displayType = 'video_reward';
        // Track video time
        const unitId = data.unitId || 'unknown';
        const txId = data.transmissionId || 'default';
        const vKey = getVideoKey(unitId, txId);
        const vTime = data.videoTime || data.stampedCount || 0;
        if (vTime > 0) {
          stats._videoTxMap[vKey] = Math.max(stats._videoTxMap[vKey] || 0, Math.floor(vTime));
        }
      } else if (hType === 'text' || hType === 'data_log_read') {
        const dedupeKey = `datalog_${data.unitId || title}`;
        if (trackedDataLogs.has(dedupeKey)) return;
        trackedDataLogs.add(dedupeKey);
        stats.logCount++;
        displayType = 'data_log_read';
      } else {
        stats.quizCount++;
      }

      const typeEmoji = displayType === 'video_reward' ? '🎬' : displayType === 'data_log_read' ? '📝' : '🚀';
      const typeLabel = displayType === 'video_reward' ? '영상 학습' : displayType === 'data_log_read' ? '데이터 로그 열람' : '현장 탐사(퀴즈)';

      aggregated.push({
        id: `quiz_${docSnap.id}`,
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(),
        type: displayType,
        title: `${typeEmoji} ${typeLabel}: ${title}`,
        score: (displayType === 'quiz_pass' || displayType === 'quiz_in_progress') ? data.score : null,
        crystalsEarned: data.crystalsEarned || 0,
        metadata: {
          ...data,
          videoTime: data.videoTime || data.stampedCount || 0
        }
      });
    });

    // ── 2. Process Transactions (non-quiz/video rewards) ──
    rawData.tx.forEach(docSnap => {
      const data = docSnap.data();
      const tType = data.type || '';
      const desc = data.description || '';
      const metadata = data.metadata || {};

      // Skip types already captured by history
      if (tType === 'quiz_reward' || tType === 'mastery_bonus' || tType === 'quiz_penalty') return;

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
      } else if (tType === 'transmission_reward' || tType === 'video_reward') {
        if (data.amount === 20 || desc.includes('완료')) return; // Completion bonus — already in history
        displayType = 'video_reward';
        const cleanDesc = desc.replace(/\s?영상 교신 수신/g, '').replace('보상 (영상 교신 완료)', '').replace('보너스', '').trim();
        displayTitle = `🎬 영상 학습: ${cleanDesc}`;

        const vTime = metadata.stampedSeconds?.length || metadata.totalTimeSpent || 0;
        if (vTime > 0) {
          const unitId = metadata.unitId || 'unknown';
          const txId = metadata.transmissionId || 'default';
          const vKey = getVideoKey(unitId, txId);
          stats._videoTxMap[vKey] = Math.max(stats._videoTxMap[vKey] || 0, Math.floor(vTime));
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
        const dedupeKey = `datalog_${metadata.unitId || desc}`;
        const cleanTitle = `📝 데이터 로그 열람: ${desc.replace('보상 (데이터 로그 학습)', '').replace('보상', '').trim()}`;
        if (trackedDataLogs.has(dedupeKey)) return;
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

    // ── 3. Process Learning Progress (in-progress sessions today) ──
    const dayStart = startTime.toDate();
    const dayEnd = endTime.toDate();

    rawData.lp.forEach(docSnap => {
      try {
        const data = docSnap.data();
        const unitId = docSnap.id;
        const updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date();
        const isUpdatedToday = updatedAt >= dayStart && updatedAt <= dayEnd;

        // Video progress
        if (data.videoProgress) {
          Object.entries(data.videoProgress).forEach(([txId, prog]) => {
            const stamps = prog.stampedSeconds?.length || 0;
            if (stamps <= 0) return;

            let progUpdatedAt;
            if (prog.updatedAt?.toDate) progUpdatedAt = prog.updatedAt.toDate();
            else if (prog.updatedAt?.seconds) progUpdatedAt = new Date(prog.updatedAt.seconds * 1000);
            else if (typeof prog.updatedAt === 'number') progUpdatedAt = new Date(prog.updatedAt);
            else progUpdatedAt = isUpdatedToday ? updatedAt : new Date();

            const isProgToday = progUpdatedAt >= dayStart && progUpdatedAt <= dayEnd;
            if (!isProgToday) return;

            const vKey = getVideoKey(unitId, txId);
            stats._videoTxMap[vKey] = Math.max(stats._videoTxMap[vKey] || 0, stamps);

            // Only add to feed if not already tracked via history
            const isAlreadyTracked = aggregated.some(a =>
              (a.type === 'video_reward' || a.type === 'video_view') &&
              ((a.metadata?.transmissionId === txId && a.metadata?.unitId === unitId) ||
               (a.metadata?.unitId === unitId && !a.metadata?.transmissionId && Object.keys(data.videoProgress).length === 1))
            );

            if (!isAlreadyTracked) {
              aggregated.push({
                id: `lp_p_${unitId}_${txId}`,
                timestamp: progUpdatedAt,
                type: 'video_view',
                title: `🎬 영상 학습: ${prog.transmissionTitle || data.unitTitle || formatUnitId(unitId)}`,
                score: null,
                metadata: { ...prog, unitId, transmissionId: txId, videoTime: stamps }
              });
            }
          });
        }

        // In-progress quiz session
        if (isUpdatedToday && data.quizSession && data.quizSession.currentIdx > 0) {
          const session = data.quizSession;
          const answeredCount = Object.keys(session.userAnswers || {}).length;
          if (answeredCount > 0 && !aggregated.some(a => a.type === 'quiz_pass' && a.metadata?.unitId === unitId)) {
            aggregated.push({
              id: `lp_q_${unitId}`,
              timestamp: updatedAt,
              type: 'quiz_in_progress',
              title: `🚀 퀴즈: ${data.unitTitle || formatUnitId(unitId)}`,
              score: null,
              metadata: { unitId, ...session }
            });
          }
        }

        // Data log read from progress
        if (isUpdatedToday && data.logReadAt) {
          const logReadTime = data.logReadAt.toDate ? data.logReadAt.toDate() : new Date(data.logReadAt);
          const isReadToday = logReadTime >= dayStart && logReadTime <= dayEnd;

          if (isReadToday) {
            const dedupeKey = `datalog_${unitId}`;
            if (!trackedDataLogs.has(dedupeKey)) {
              stats.logCount++;
              trackedDataLogs.add(dedupeKey);
              const title = data.unitTitle || formatUnitId(unitId);
              const isAlreadyInFeed = aggregated.some(a => a.type === 'data_log_read' && a.metadata?.unitId === unitId);
              if (!isAlreadyInFeed) {
                aggregated.push({
                  id: `lp_log_${unitId}`,
                  timestamp: logReadTime,
                  type: 'data_log_read',
                  title: `📝 데이터 로그 열람: ${title}`,
                  score: null,
                  crystalsEarned: 0,
                  metadata: { ...data, unitId }
                });
              }
            }
          }
        }
      } catch (lpErr) {
        console.warn('LP processing error for doc:', docSnap.id, lpErr);
      }
    });

    // Finalize video seconds
    const sumVideoSeconds = Object.values(stats._videoTxMap).reduce((sum, val) => sum + val, 0);
    stats.totalVideoSeconds += sumVideoSeconds;

    // Sort chronologically
    aggregated.sort((a, b) => (a.timestamp?.getTime() || 0) - (b.timestamp?.getTime() || 0));

    setActivities(aggregated);
    setDailyStats(stats);

    if (Object.values(rawData.loaded).every(v => v === true)) {
      setLoading(false);
    }
  }, [rawData, startTime, endTime]);

  // ── GROUPED ACTIVITIES (derived via useMemo — no state loop) ──
  const groupedActivities = useMemo(() => {
    return buildGroupedActivities(activities);
  }, [activities]);

  return { activities, groupedActivities, dailyStats, loading, error };
}

// ══════════════════════════════════════════════════════════════
// ═══ UTILITY FUNCTIONS ═══════════════════════════════════════
// ══════════════════════════════════════════════════════════════

/** Learning-only activity types for grouping */
const LEARNING_TYPES = new Set([
  'quiz_pass', 'quiz_in_progress', 'video_reward', 'video_view', 'data_log_read'
]);

/**
 * Format a raw unitId into a human-readable string.
 * Used as a fallback when unitTitle is missing from stored data.
 * "ratios_ratio_chap3_unit3" → "Ratios Ratio Chap3 Unit3"
 */
function formatUnitId(id) {
  if (!id) return '학습 활동';
  return id
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Extract a clean display title from an activity's metadata.
 * Priority: unitTitle > transmissionTitle > cleaned display title > formatted unitId
 */
function resolveTitle(act) {
  const meta = act.metadata || {};

  // 1. Direct unitTitle (set at write time)
  if (meta.unitTitle && meta.unitTitle.length > 0) return meta.unitTitle;
  if (meta.metadata?.unitTitle) return meta.metadata.unitTitle;

  // 2. transmissionTitle for video activities
  if (meta.transmissionTitle) return meta.transmissionTitle;

  // 3. regionTitle as context
  if (meta.regionTitle) return meta.regionTitle;

  // 4. Extract from the display title (strip emoji prefixes)
  const cleaned = (act.title || '')
    .replace(/^[🚀🎬📝⏳💎🛒🧊🎁✅🗣️📌]\s*/g, '')
    .replace(/^(현장 탐사\(퀴즈\)|퀴즈 탐사|퀴즈|영상 보상|영상 학습 완료|영상 학습 진행|영상 학습|영상 열람|데이터 로그 열람)[:\s]*/g, '')
    .replace(/\s*보상\s*\(.*?\)\s*$/g, '')
    .trim();
  if (cleaned && cleaned.length > 0) return cleaned;

  // 5. unitId fallback
  return formatUnitId(meta.unitId || '');
}

/**
 * Group raw activities into clean, deduplicated learning cards.
 * Key: unitId + activityType (quiz | video | text)
 */
function buildGroupedActivities(rawActivities) {
  const learningOnly = rawActivities.filter(a => LEARNING_TYPES.has(a.type));
  const groupMap = new Map();

  learningOnly.forEach(act => {
    const meta = act.metadata || {};
    const unitId = meta.unitId || meta.metadata?.unitId || 'unknown';

    let normalizedType = 'quiz';
    if (act.type === 'video_reward' || act.type === 'video_view') normalizedType = 'video';
    else if (act.type === 'data_log_read') normalizedType = 'text';

    const groupKey = `${unitId}_${normalizedType}`;

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        id: `group_${groupKey}`,
        type: normalizedType,
        unitId,
        unitTitle: '',
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
        if (act.metadata?.initialScore !== undefined) group.initialScore = act.metadata.initialScore;
        if (act.metadata?.attemptCount !== undefined) group.attemptCount = act.metadata.attemptCount;
      }
      group.completed = true;
    }
    if (act.type === 'quiz_in_progress' && !group.completed) {
      group.score = null;
      const answered = Object.keys(meta.userAnswers || {}).length;
      const total = meta.originalTotal || 0;
      if (answered > group.answeredCount) {
        group.answeredCount = answered;
        group.totalCount = total;
      }
    }

    if (normalizedType === 'quiz' && meta.totalCount) {
      group.totalCount = meta.totalCount;
    }

    // Video: accumulate max video time
    const vTime = meta.videoTime || meta.stampedCount || meta.metadata?.videoTime || 0;
    if (vTime > 0) {
      group.totalVideoSeconds = Math.max(group.totalVideoSeconds, Math.floor(vTime));
    }

    // Completion markers
    if (act.completed === true || act.type === 'video_reward') group.completed = true;
    if (normalizedType === 'text') group.completed = true;
  });

  // Resolve titles
  groupMap.forEach((group) => {
    let bestTitle = '';
    for (const sub of group.subActivities) {
      const candidate = resolveTitle(sub);
      if (candidate && candidate !== '학습 활동' && candidate.length > bestTitle.length) {
        bestTitle = candidate;
      }
      const rTitle = sub.metadata?.regionTitle;
      if (rTitle && !group.regionTitle) group.regionTitle = rTitle;
    }
    group.unitTitle = bestTitle || formatUnitId(group.unitId);
  });

  const result = Array.from(groupMap.values());
  result.sort((a, b) => (a.firstTimestamp?.getTime() || 0) - (b.firstTimestamp?.getTime() || 0));
  return result;
}
