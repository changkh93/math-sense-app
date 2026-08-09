/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { onSnapshot, collection as fsCollection, query as fsQuery, where as fsWhere, Timestamp as fsTimestamp } from 'firebase/firestore';

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
  const [error] = useState(null);
  const [dailyStats, setDailyStats] = useState({
    quizCount: 0,
    workbookCount: 0,
    workbookProgressCount: 0,
    logCount: 0,
    codeTraceCount: 0,
    codeTraceProgressCount: 0,
    totalVideoSeconds: 0,
    isAssignmentSubmitted: false,
    attentionHits: 0,
    attentionMisses: 0,
    attentionOpportunities: 0,
    timeAttackHits: 0,
    timeAttackMisses: 0,
    completionCrystalHits: 0,
    completionCrystalMisses: 0,
    focusScore: null,
    battleCount: 0,
    battleWinCount: 0,
    battleLossCount: 0,
    battleDrawCount: 0,
    battleCorrectCount: 0,
    battleQuestionCount: 0
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
      workbookCount: 0,
      workbookProgressCount: 0,
      logCount: 0,
      codeTraceCount: 0,
      codeTraceProgressCount: 0,
      totalVideoSeconds: 0,
      isAssignmentSubmitted: (typeof rawData.assignmentCount === 'number' ? rawData.assignmentCount : rawData.assignmentCount?.length) > 0,
      attentionHits: 0,
      attentionMisses: 0,
      attentionOpportunities: 0,
      timeAttackHits: 0,
      timeAttackMisses: 0,
      completionCrystalHits: 0,
      completionCrystalMisses: 0,
      focusScore: null,
      battleCount: 0,
      battleWinCount: 0,
      battleLossCount: 0,
      battleDrawCount: 0,
      battleCorrectCount: 0,
      battleQuestionCount: 0,
      _videoTxMap: {}
    };
    const trackedDataLogs = new Set();
    const trackedAttention = new Set();
    const getVideoKey = (unitId, txId) => `${unitId || 'no_unit'}_${txId || 'default'}`;

    // ── 1. Process History (PRIMARY) ──
    rawData.history.forEach(docSnap => {
      const data = docSnap.data();
      const hType = data.type || 'quiz_pass';
      const attentionSource = data.attentionSource || '';
      const attentionResult = data.attentionResult || '';
      const isAttentionEvent = !!attentionSource && (attentionResult === 'hit' || attentionResult === 'miss');
      const isFocusOnlyEvent = isAttentionEvent && attentionSource !== 'completion_bonus';
      const unitId = data.unitId || 'unknown';
      const txId = data.transmissionId || 'default';
      const activityType = String(data.activityType || '');
      const hasVideoEvidence = Boolean(
        data.transmissionId ||
        data.videoTime ||
        data.sessionWatchSeconds ||
        data.stampedCount ||
        activityType.includes('영상')
      );

      if (isAttentionEvent && !trackedAttention.has(docSnap.id)) {
        trackedAttention.add(docSnap.id);
        stats.attentionOpportunities++;
        if (attentionResult === 'hit') stats.attentionHits++;
        if (attentionResult === 'miss') stats.attentionMisses++;
        if (attentionSource === 'time_attack') {
          if (attentionResult === 'hit') stats.timeAttackHits++;
          if (attentionResult === 'miss') stats.timeAttackMisses++;
        }
        if (attentionSource === 'completion_bonus') {
          if (attentionResult === 'hit') stats.completionCrystalHits++;
          if (attentionResult === 'miss') stats.completionCrystalMisses++;
        }
      }

      let displayType = 'quiz_pass';
      const title = data.unitTitle || formatUnitId(data.unitId);

      if (isFocusOnlyEvent) {
        displayType = 'video_attention';
      } else if (
        hType === 'video' ||
        hType === 'video_complete' ||
        hType === 'recovery_mastery' ||
        ((hType === 'attention' || isAttentionEvent || !data.type) && hasVideoEvidence)
      ) {
        displayType = 'video_reward';
        // Track video time
        const vKey = getVideoKey(unitId, txId);
        const vTime = data.videoTime || data.sessionWatchSeconds || data.stampedCount || 0;
        if (vTime > 0) {
          stats._videoTxMap[vKey] = Math.max(stats._videoTxMap[vKey] || 0, Math.floor(vTime));
        }
      } else if (hType === 'text' || hType === 'data_log_read') {
        const dedupeKey = `datalog_${data.unitId || title}`;
        if (trackedDataLogs.has(dedupeKey)) return;
        trackedDataLogs.add(dedupeKey);
        stats.logCount++;
        displayType = 'data_log_read';
      } else if (hType === 'code_trace') {
        stats.codeTraceCount++;
        displayType = 'code_trace';
      } else if (hType === 'workbook') {
        stats.workbookCount++;
        displayType = 'workbook';
      } else if (hType === 'quiz_battle') {
        // 퀴즈 배틀은 일반 탐사 퀴즈와 구분되는 경쟁 활동으로 별도 집계.
        stats.battleCount++;
        const bResult = data.battleResult;
        if (bResult === 'win') stats.battleWinCount++;
        else if (bResult === 'loss') stats.battleLossCount++;
        else if (bResult === 'draw') stats.battleDrawCount++;
        stats.battleCorrectCount += Number(data.correctCount || 0);
        stats.battleQuestionCount += Number(data.totalCount || 0);
        displayType = 'quiz_battle';
      } else {
        stats.quizCount++;
      }

      const typeEmoji =
        displayType === 'video_reward' || displayType === 'video_attention'
          ? '🎬'
          : displayType === 'data_log_read'
            ? '📝'
            : displayType === 'code_trace'
              ? '⌨️'
              : displayType === 'workbook'
                ? '🧮'
              : displayType === 'quiz_battle'
                ? '⚔️'
                : '🚀';
      const typeLabel =
        displayType === 'video_attention'
          ? '집중도 기록'
          : displayType === 'video_reward'
            ? '영상 학습'
            : displayType === 'data_log_read'
              ? '데이터 로그 열람'
              : displayType === 'code_trace'
                ? '코드 따라쓰기'
                : displayType === 'workbook'
                  ? '스마트 워크북'
                : displayType === 'quiz_battle'
                  ? '퀴즈 배틀'
                  : '현장 탐사(퀴즈)';

      aggregated.push({
        id: `quiz_${docSnap.id}`,
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(),
        type: displayType,
        title: `${typeEmoji} ${typeLabel}: ${title}`,
        score: (displayType === 'quiz_pass' || displayType === 'quiz_in_progress' || displayType === 'quiz_battle' || displayType === 'workbook') ? data.score : null,
        crystalsEarned: data.crystalsEarned || 0,
        metadata: {
          ...data,
          codeTraceCompleted: displayType === 'code_trace' ? true : data.codeTraceCompleted,
          videoTime: isFocusOnlyEvent ? 0 : (data.videoTime || data.sessionWatchSeconds || data.stampedCount || 0),
          attentionSource,
          attentionResult
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
      if (tType === 'quiz_reward' || tType === 'mastery_bonus' || tType === 'quiz_penalty' || tType === 'quiz_battle_reward' || tType === 'workbook_reward' || tType === 'workbook_penalty') return;

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

        const vTime = metadata.sessionWatchSeconds || metadata.videoTime || metadata.stampedSeconds?.length || 0;
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
            const todaySeconds = prog.todayTimeSpentDate === dateStr
              ? Math.floor(prog.todayTimeSpent || 0)
              : 0;
            if (stamps <= 0 && todaySeconds <= 0) return;

            let progUpdatedAt;
            if (prog.updatedAt?.toDate) progUpdatedAt = prog.updatedAt.toDate();
            else if (prog.updatedAt?.seconds) progUpdatedAt = new Date(prog.updatedAt.seconds * 1000);
            else if (typeof prog.updatedAt === 'number') progUpdatedAt = new Date(prog.updatedAt);
            else progUpdatedAt = isUpdatedToday ? updatedAt : new Date();

            const isProgToday = progUpdatedAt >= dayStart && progUpdatedAt <= dayEnd;
            if (!isProgToday) return;

            const vKey = getVideoKey(unitId, txId);
            const progressVideoSeconds = todaySeconds > 0 ? todaySeconds : stamps;
            stats._videoTxMap[vKey] = Math.max(stats._videoTxMap[vKey] || 0, progressVideoSeconds);

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
                metadata: { ...prog, unitId, transmissionId: txId, videoTime: progressVideoSeconds, stampedCount: stamps }
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

        // Code trace progress from learning_progress.
        if (data.codeTrace) {
          const codeTrace = data.codeTrace;
          const completedExerciseCount = Number(codeTrace.completedExerciseCount || 0);
          const totalExerciseCount = Number(codeTrace.totalExerciseCount || 0);
          const codeTraceUpdatedAt = (() => {
            const raw = codeTrace.updatedAt || codeTrace.completedAt || data.updatedAt;
            if (raw?.toDate) return raw.toDate();
            if (raw?.seconds) return new Date(raw.seconds * 1000);
            if (typeof raw === 'number') return new Date(raw);
            return updatedAt;
          })();
          const isCodeTraceToday = codeTraceUpdatedAt >= dayStart && codeTraceUpdatedAt <= dayEnd;
          const hasCodeTraceWork = completedExerciseCount > 0 || codeTrace.completed === true;

          if (isCodeTraceToday && hasCodeTraceWork) {
            const isAlreadyTracked = aggregated.some(a => a.type === 'code_trace' && a.metadata?.unitId === unitId);
            if (!isAlreadyTracked) {
              if (codeTrace.completed === true) stats.codeTraceCount++;
              else stats.codeTraceProgressCount++;

              aggregated.push({
                id: `lp_code_trace_${unitId}`,
                timestamp: codeTraceUpdatedAt,
                type: 'code_trace',
                title: `⌨️ CODE TRACE: ${data.unitTitle || formatUnitId(unitId)}`,
                score: Number.isFinite(Number(codeTrace.bestAccuracy)) ? Number(codeTrace.bestAccuracy) : null,
                crystalsEarned: 0,
                metadata: {
                  unitId,
                  unitTitle: data.unitTitle || '',
                  chapterId: data.chapterId || '',
                  regionTitle: data.regionTitle || '',
                  codeTraceCompleted: codeTrace.completed === true,
                  completedExerciseCount,
                  totalExerciseCount,
                  bestAccuracy: Number(codeTrace.bestAccuracy || 0),
                  crystalsEarnedTotal: Number(codeTrace.crystalsEarnedTotal || 0),
                  earnedExerciseCount: Array.isArray(codeTrace.earnedExerciseIds) ? codeTrace.earnedExerciseIds.length : 0,
                  exerciseAttempts: codeTrace.exerciseAttempts || {},
                  totalPracticeCount: codeTrace.exerciseAttempts
                    ? Object.values(codeTrace.exerciseAttempts).reduce((sum, n) => sum + (Number(n) || 0), 0)
                    : 0,
                  lastExerciseId: codeTrace.lastExerciseId || '',
                  lastMode: codeTrace.lastMode || '',
                  updatedAt: codeTrace.updatedAt
                }
              });
            }
          }
        }

        // Smart Workbook autosave progress. Completed sessions are already represented by history.type=workbook.
        if (data.workbookSession) {
          const session = data.workbookSession;
          const rawUpdatedAt = data.workbookSessionUpdatedAt || session.savedAtMs;
          const workbookUpdatedAt = rawUpdatedAt?.toDate
            ? rawUpdatedAt.toDate()
            : rawUpdatedAt?.seconds
              ? new Date(rawUpdatedAt.seconds * 1000)
              : new Date(Number(rawUpdatedAt || 0));
          const answeredCount = Object.keys(session.answers || {}).filter(key => String(session.answers[key] ?? '').trim() !== '').length;
          const checkedPageCount = Object.values(session.checkedPages || {}).filter(Boolean).length;
          const totalPages = String(session.workbookSignature || '').split('|').filter(Boolean).length;
          const hasWorkbookWork = answeredCount > 0 || checkedPageCount > 0 || Number(session.currentPageIndex || 0) > 0;
          const isWorkbookToday = Number.isFinite(workbookUpdatedAt.getTime()) && workbookUpdatedAt >= dayStart && workbookUpdatedAt <= dayEnd;
          const completedToday = aggregated.some(a => a.type === 'workbook' && a.metadata?.unitId === unitId);

          if (isWorkbookToday && hasWorkbookWork && !completedToday) {
            stats.workbookProgressCount++;
            aggregated.push({
              id: `lp_workbook_${unitId}`,
              timestamp: workbookUpdatedAt,
              type: 'workbook_in_progress',
              title: `🧮 스마트 워크북: ${data.unitTitle || formatUnitId(unitId)}`,
              score: null,
              crystalsEarned: Number(session.pageActualRewardsPaid || 0),
              metadata: {
                unitId,
                unitTitle: data.unitTitle || '',
                currentPage: Math.min(totalPages || Number.MAX_SAFE_INTEGER, Number(session.currentPageIndex || 0) + 1),
                totalPages,
                answeredCount,
                checkedPageCount,
                pageCrystalsEarned: Number(session.pageActualRewardsPaid || 0),
              }
            });
          }
        }
      } catch (lpErr) {
        console.warn('LP processing error for doc:', docSnap.id, lpErr);
      }
    });

    // Finalize video seconds
    const sumVideoSeconds = Object.values(stats._videoTxMap).reduce((sum, val) => sum + val, 0);
    stats.totalVideoSeconds += sumVideoSeconds;
    stats.focusScore = stats.attentionOpportunities > 0
      ? Math.round((stats.attentionHits / stats.attentionOpportunities) * 100)
      : null;

    // Sort chronologically
    aggregated.sort((a, b) => (a.timestamp?.getTime() || 0) - (b.timestamp?.getTime() || 0));

    setActivities(aggregated);
    setDailyStats(stats);

    if (Object.values(rawData.loaded).every(v => v === true)) {
      setLoading(false);
    }
  }, [rawData, startTime, endTime, dateStr]);

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
  'quiz_pass', 'quiz_in_progress', 'video_reward', 'video_view', 'video_attention', 'data_log_read', 'code_trace', 'quiz_battle', 'workbook', 'workbook_in_progress'
]);

/**
 * Format a raw unitId into a human-readable string.
 * Used as a fallback when unitTitle is missing from stored data.
 * "ratios_ratio_chap3_unit3" → "Ratios Ratio Chap3 Unit3"
 */
function formatUnitId(id) {
  if (!id) return '학습 활동';

  // 파이썬 수학 (py_math) 코스의 raw ID를 친숙한 한글 단원명으로 자동 변환
  if (id.toLowerCase().includes('py_math')) {
    const rangeMatch = id.match(/py_math_(\d+)_(\d+)/i);
    if (rangeMatch) {
      return `파이썬 수학 ${rangeMatch[1]}~${rangeMatch[2]}단원`;
    }
    const unitMatch = id.match(/py_math_(\d+)/i);
    if (unitMatch) {
      return `파이썬 수학 ${unitMatch[1]}단원`;
    }
    return '파이썬 수학 학습';
  }

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
    .replace(/^(?:🚀|🎬|📝|⌨️|🧮|⏳|💎|🛒|🧊|🎁|✅|🗣️|📌|⚔️)\s*/u, '')
    .replace(/^(현장 탐사\(퀴즈\)|퀴즈 탐사|퀴즈|영상 보상|영상 학습 완료|영상 학습 진행|영상 학습|영상 열람|데이터 로그 열람|CODE TRACE|코드 따라쓰기|스마트 워크북|퀴즈 배틀)[:\s]*/g, '')
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
    if (act.type === 'video_reward' || act.type === 'video_view' || act.type === 'video_attention') normalizedType = 'video';
    else if (act.type === 'data_log_read') normalizedType = 'text';
    else if (act.type === 'code_trace') normalizedType = 'code';
    else if (act.type === 'workbook' || act.type === 'workbook_in_progress') normalizedType = 'workbook';
    else if (act.type === 'quiz_battle') normalizedType = 'battle';

    // 배틀은 각 경기마다 별도 카드로 표시하기 위해 battleId 기준으로 그룹핑한다.
    const groupKey = normalizedType === 'battle'
      ? `battle_${meta.battleId || act.id}`
      : `${unitId}_${normalizedType}`;

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
        attentionHits: 0,
        attentionMisses: 0,
        attentionOpportunities: 0,
        timeAttackHits: 0,
        timeAttackMisses: 0,
        completionCrystalHits: 0,
        completionCrystalMisses: 0,
        codeTraceCompleted: false,
        completedExerciseCount: 0,
        crystalsEarnedTotal: 0,
        earnedExerciseCount: 0,
        totalPracticeCount: 0,
        bestAccuracy: null,
        lastMode: '',
        battleId: '',
        battleResult: '',
        battleCorrectCount: 0,
        battleScope: '',
        battleUnitTitle: '',
        opponentDisplayName: '',
        forfeited: false,
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
    if ((normalizedType === 'quiz' || normalizedType === 'workbook') && act.score !== null && act.score !== undefined) {
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
    if (act.type === 'workbook_in_progress' && !group.completed) {
      group.score = null;
      group.answeredCount = Math.max(group.answeredCount, Number(meta.answeredCount || 0));
      group.completedExerciseCount = Math.max(group.completedExerciseCount, Number(meta.checkedPageCount || 0));
      group.totalCount = Math.max(group.totalCount, Number(meta.totalPages || 0));
      group.currentPage = Math.max(group.currentPage || 0, Number(meta.currentPage || 0));
    }

    if ((normalizedType === 'quiz' || normalizedType === 'workbook') && meta.totalCount) {
      group.totalCount = meta.totalCount;
    }

    // Battle: 각 경기 결과 메타데이터를 그룹에 반영한다.
    if (normalizedType === 'battle') {
      group.score = Number(act.score ?? 0);
      group.totalCount = Number(meta.totalCount || 0);
      group.battleId = meta.battleId || group.battleId;
      group.battleResult = meta.battleResult || group.battleResult;
      group.battleCorrectCount = Number(meta.correctCount || 0);
      group.battleScope = meta.battleScope || group.battleScope;
      group.battleUnitTitle = meta.battleUnitTitle || group.battleUnitTitle;
      group.opponentDisplayName = meta.opponentDisplayName || group.opponentDisplayName;
      group.forfeited = meta.forfeited === true;
      group.completed = true;
      group.crystalsEarnedTotal = Math.max(group.crystalsEarnedTotal || 0, Number(act.crystalsEarned || 0));
    }

    // Video: accumulate max video time
    const vTime = act.type === 'video_attention'
      ? 0
      : (meta.videoTime || meta.sessionWatchSeconds || meta.stampedCount || meta.metadata?.videoTime || 0);
    if (vTime > 0) {
      group.totalVideoSeconds = Math.max(group.totalVideoSeconds, Math.floor(vTime));
    }

    if (meta.attentionSource && (meta.attentionResult === 'hit' || meta.attentionResult === 'miss')) {
      group.attentionOpportunities += 1;
      if (meta.attentionResult === 'hit') group.attentionHits += 1;
      if (meta.attentionResult === 'miss') group.attentionMisses += 1;
      if (meta.attentionSource === 'time_attack') {
        if (meta.attentionResult === 'hit') group.timeAttackHits += 1;
        if (meta.attentionResult === 'miss') group.timeAttackMisses += 1;
      }
      if (meta.attentionSource === 'completion_bonus') {
        if (meta.attentionResult === 'hit') group.completionCrystalHits += 1;
        if (meta.attentionResult === 'miss') group.completionCrystalMisses += 1;
      }
    }

    // Completion markers
    if (normalizedType === 'video' && (act.completed === true || meta.activityType?.includes('완료'))) {
      group.completed = true;
    }
    if (normalizedType === 'text') group.completed = true;
    if (normalizedType === 'code') {
      const isCodeComplete = meta.codeTraceCompleted === true || meta.completed === true;
      const completedExerciseCount = Number(meta.completedExerciseCount || 0);
      const totalExerciseCount = Number(meta.totalExerciseCount || 0);
      const bestAccuracy = Number(meta.bestAccuracy ?? meta.accuracy ?? act.score);
      const crystalsFromMeta = Number(meta.crystalsEarnedTotal ?? act.crystalsEarned ?? 0);
      const earnedExerciseCount = Number(meta.earnedExerciseCount || 0);

      group.completed = group.completed || isCodeComplete;
      group.codeTraceCompleted = group.codeTraceCompleted || isCodeComplete;
      group.completedExerciseCount = Math.max(group.completedExerciseCount || 0, completedExerciseCount);
      group.totalCount = Math.max(group.totalCount || 0, totalExerciseCount);
      group.crystalsEarnedTotal = Math.max(group.crystalsEarnedTotal || 0, crystalsFromMeta);
      group.earnedExerciseCount = Math.max(group.earnedExerciseCount || 0, earnedExerciseCount);
      const practiceCount = Number(meta.totalPracticeCount || 0);
      if (practiceCount > 0) {
        group.totalPracticeCount = Math.max(group.totalPracticeCount || 0, practiceCount);
      }
      if (Number.isFinite(bestAccuracy)) {
        group.bestAccuracy = Math.max(group.bestAccuracy || 0, bestAccuracy);
        group.score = Math.max(group.score || 0, bestAccuracy);
      }
      if (meta.lastMode) group.lastMode = meta.lastMode;
    }
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
