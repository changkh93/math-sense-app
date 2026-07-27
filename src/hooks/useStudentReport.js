import { useQuery } from '@tanstack/react-query';
import { db } from '../firebase';
import {
  collection, collectionGroup,
  query, where, getDocs, getDoc, doc,
  Timestamp, limit, orderBy
} from 'firebase/firestore';

const ACTIVE_WARNING_STATUSES = ['active', 'appealed'];
const WARNING_POLICY_MESSAGE = '경고 3회 누적 시 수강료가 10% 인상될 수 있습니다.';
const WARNING_TYPE_LABELS = {
  poor_assignment_submission: '불성실 과제 제출',
  consecutive_missing_assignment: '연속 3회 미제출'
};
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function toKstDateKey(date) {
  return new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

function isDateKeyInRange(dateKey, startDateKey, endDateKey) {
  return Boolean(dateKey) && dateKey >= startDateKey && dateKey <= endDateKey;
}

// ══════════════════════════════════════════════════
// useStudentReport – Master hook
// ══════════════════════════════════════════════════
// useStudentReport – Master hook
// ══════════════════════════════════════════════════
/**
 * @param {string} userId – Student UID
 * @param {number} days – Analysis period in days (30, 60, 90)
 */
export function useStudentReport(userId, days = 30) {
  return useQuery({
    queryKey: ['studentReport', userId, days],
    queryFn: () => fetchStudentReport(userId, days),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    gcTime: 1000 * 60 * 10,
  });
}

// ══════════════════════════════════════════════════
// Main fetch function
// ══════════════════════════════════════════════════
async function fetchStudentReport(userId, days) {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);
  const startTs = Timestamp.fromDate(startDate);
  const endTs = Timestamp.fromDate(now);
  const startDateKey = toKstDateKey(startDate);
  const endDateKey = toKstDateKey(now);

  // ── 1. Fetch student profile ──
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (!userDoc.exists()) throw new Error('Student not found');
  const userData = userDoc.data();

  const student = {
    uid: userId,
    name: userData.studentName || userData.publicDisplayName || userData.name || userData.displayName || '알 수 없음',
    email: userData.email || '',
    crystals: userData.crystals || 0,
    streak: userData.currentStreak || 0,
    longestStreak: userData.longestStreak || 0,
    joinedAt: userData.createdAt?.toDate?.() || null,
    clusterAccess: userData.clusterAccess || {},
    regionAccess: userData.regionAccess || {},
    participation: userData.participation || {},
    warningSummary: userData.assignmentWarningSummary || null,
  };

  // Determine which clusters this student is enrolled in
  const activeClusters = Object.entries(student.clusterAccess)
    .filter(([, status]) => status === 'active')
    .map(([id]) => id);

  // ── Parallel fetch all data ──
  const [attendance, history, allHistory, assignments, assignmentWarnings, progress, regionsSnap, chaptersSnap, unitsSnap] = await Promise.all([
    fetchAttendance(userId),
    fetchHistory(userId, startTs, endTs),
    fetchAllHistory(userId),
    fetchAssignments(userId),
    fetchAssignmentWarnings(userId),
    fetchProgress(userId),
    getDocs(collection(db, 'regions')),
    getDocs(collection(db, 'chapters')),
    getDocs(collection(db, 'units'))
  ]);

  // Construct region names map and region-to-cluster mapping
  const REGION_NAMES = {};
  const REGION_TO_CLUSTER = {};
  regionsSnap.docs.forEach(doc => {
    const data = doc.data();
    REGION_NAMES[doc.id] = data.title || doc.id;
    REGION_TO_CLUSTER[doc.id] = data.clusterId;
  });

  // also map chapters to region to fix progress
  const chapToRegion = {};
  chaptersSnap.docs.forEach(doc => {
    chapToRegion[doc.id] = doc.data().regionId;
  });

  const regionUnitCount = {};
  const unitToRegion = {};
  unitsSnap.docs.forEach(doc => {
     const data = doc.data();
     const rId = chapToRegion[data.chapterId];
     if (rId) {
       regionUnitCount[rId] = (regionUnitCount[rId] || 0) + 1;
       unitToRegion[doc.id] = rId;
     }
  });

  // Calculate active regions from history
  const regionSet = new Set();
  
  history.forEach(h => {
    if (h.regionId) regionSet.add(h.regionId);
  });
  assignments.forEach(a => {
    if (a.regionId) regionSet.add(a.regionId);
  });
  Object.entries(student.regionAccess || {}).forEach(([regionId, status]) => {
    if (status === 'active' || status === 'completed') {
      regionSet.add(regionId);
    }
  });
  const activeRegions = Array.from(regionSet);
  
  if (activeRegions.length === 0 && history.length > 0) {
    activeRegions.push('unknown_region');
    REGION_NAMES['unknown_region'] = '수반 과정';
  }

  // --- Build Ordered Region Structure ---
  const regionStructure = {};
  activeRegions.forEach(id => {
    regionStructure[id] = { chapters: [], orderedUnits: [], total: 0 };
  });
  regionsSnap.docs.forEach(r => {
    if (!regionStructure[r.id]) regionStructure[r.id] = { chapters: [], orderedUnits: [], total: 0 };
  });

  chaptersSnap.docs.forEach(c => {
    const data = c.data();
    const chapId = c.id;
    const rId = data.regionId;
    const rTitle = data.regionTitle;

    // Try direct ID match first
    if (rId && regionStructure[rId]) {
      regionStructure[rId].chapters.push({ ...data, id: chapId });
    } 
    // Fallback: Try matching via Region Title if ID match failed but Title is common
    else if (rTitle) {
      const matchedRegionId = Object.keys(REGION_NAMES).find(rid => 
        REGION_NAMES[rid] === rTitle && regionStructure[rid]
      );
      if (matchedRegionId) {
        regionStructure[matchedRegionId].chapters.push({ ...data, id: chapId });
      }
    }
  });

  Object.values(regionStructure).forEach(reg => {
    reg.chapters.sort((a,b) => (a.order || 0) - (b.order || 0));
  });

  const unitsRaw = unitsSnap.docs.map(u => ({ ...u.data(), id: u.id }));
  const unitsByChapter = {};
  unitsRaw.forEach(u => {
    if (!unitsByChapter[u.chapterId]) unitsByChapter[u.chapterId] = [];
    unitsByChapter[u.chapterId].push(u);
  });
  
  Object.entries(regionStructure).forEach(([regId, reg]) => {
    const flatUnits = [];
    reg.chapters.forEach(chap => {
      const cUnits = unitsByChapter[chap.id] || [];
      cUnits.sort((a,b) => (a.order || 0) - (b.order || 0));
      cUnits.forEach(u => {
         flatUnits.push({ ...u, chapterTitle: chap.title });
      });
    });
    reg.orderedUnits = flatUnits;
    reg.total = flatUnits.length;
  });
  // ------------------------------------

  // Now fetch peer data for active regions
  const peerData = await fetchPeerComparison(activeRegions, startTs, endTs, userId);

  // ── Analyze ──
  const attendanceAnalysis = analyzeAttendance(attendance, startDateKey, endDateKey);
  const learningAnalysis = analyzeLearning(history, days);
  const assignmentAnalysis = analyzeAssignments(assignments, startDateKey, endDateKey);
  const warningAnalysis = analyzeAssignmentWarnings(assignmentWarnings, student.warningSummary);
  const progressAnalysis = analyzeProgress(progress, unitToRegion, chapToRegion, allHistory);
  const regionEarliestTs = {};
  allHistory.forEach(h => {
     const clusterId = h.regionId || h.clusterId || 'unknown';
     const ts = h.timestamp?.toDate?.() || (h.timestamp?._seconds ? new Date(h.timestamp._seconds * 1000) : null);
     if (ts) {
        const ms = ts.getTime();
        if (!regionEarliestTs[clusterId] || ms < regionEarliestTs[clusterId]) {
           regionEarliestTs[clusterId] = ms;
        }
     }
  });

  const manuallyCompletedRegions = new Set(
    Object.entries(student.regionAccess || {})
      .filter(([, status]) => status === 'completed')
      .map(([regionId]) => regionId)
  );

  const peerComparison = buildPeerComparison(
    learningAnalysis,
    progressAnalysis,
    peerData,
    activeRegions,
    REGION_NAMES,
    regionStructure,
    manuallyCompletedRegions
  );

  // ── Predicted Completion ──
  const predictions = calculatePredictions(
    learningAnalysis,
    progressAnalysis,
    activeRegions,
    regionStructure,
    REGION_NAMES,
    REGION_TO_CLUSTER,
    regionEarliestTs,
    peerData,
    manuallyCompletedRegions
  );

  // ── Focus Index ──
  const focusIndex = calculateFocusIndex(history);

  // ── Auto-extract strengths & growth points ──
  const insights = extractInsights(
    student, attendanceAnalysis, learningAnalysis, assignmentAnalysis, peerComparison, focusIndex
  );

  return {
    student,
    activeClusters: activeRegions, // passed to UI as activeClusters for legacy compatibility, but actually holds regions.
    REGION_NAMES,
    REGION_TO_CLUSTER,
    attendance: attendanceAnalysis,
    learning: learningAnalysis,
    assignments: assignmentAnalysis,
    warnings: warningAnalysis,
    progress: progressAnalysis,
    peerComparison,
    predictions,
    focusIndex,
    insights,
    meta: { days, generatedAt: new Date() }
  };
}

// ══════════════════════════════════════════════════
// Data Fetchers
// ══════════════════════════════════════════════════

async function fetchAttendance(userId) {
  const q = query(collection(db, 'attendance'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function fetchHistory(userId, startTs, endTs) {
  const q = query(
    collection(db, 'users', userId, 'history'),
    where('timestamp', '>=', startTs),
    where('timestamp', '<=', endTs)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function fetchAllHistory(userId) {
  const q = query(
    collection(db, 'users', userId, 'history'),
    orderBy('timestamp', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function fetchAssignments(userId) {
  const q = query(collection(db, 'assignments'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function fetchAssignmentWarnings(userId) {
  try {
    const q = query(collection(db, 'assignmentWarnings'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Assignment warning detail fetch failed; falling back to user summary:', err);
    return [];
  }
}

async function fetchProgress(userId) {
  const snap = await getDocs(collection(db, 'users', userId, 'learning_progress'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function fetchPeerComparison(activeRegions, startTs, endTs, myUserId) {
  // For each active region, fetch history from all users in that region
  const peerMap = {};

  for (const regionId of activeRegions) {
    try {
      if (regionId === 'unknown_region') continue;
      const q = query(
        collectionGroup(db, 'history'),
        where('regionId', '==', regionId),
        where('timestamp', '>=', startTs),
        where('timestamp', '<=', endTs)
      );
      const snap = await getDocs(q);

      const userStats = {};
      snap.docs.forEach(docSnap => {
        const data = docSnap.data();
        const uid = docSnap.ref.parent.parent?.id;
        if (!uid) return;

        if (!userStats[uid]) {
          userStats[uid] = { videoSeconds: 0, quizCount: 0, quizScoreSum: 0, quizScoreCount: 0 };
        }

        const hType = data.type || 'quiz_pass';
        const isVideo = hType.includes('video') || hType === 'recovery_mastery';
        const isQuiz = (hType.includes('quiz') || (!isVideo && hType !== 'text' && hType !== 'data_log_read')) && hType !== 'quiz_battle' && hType !== 'code_trace';

        if (isVideo && data.videoTime) {
          userStats[uid].videoSeconds += data.videoTime;
        } else if (isQuiz && data.score != null && Number(data.score) <= 100) {
          userStats[uid].quizCount++;
          userStats[uid].quizScoreSum += Number(data.score);
          userStats[uid].quizScoreCount++;
        }
      });

      peerMap[regionId] = userStats;
    } catch (err) {
      console.warn(`Peer comparison failed for region ${regionId}:`, err);
      peerMap[regionId] = {};
    }
  }

  return peerMap;
}

// ══════════════════════════════════════════════════
// Analyzers
// ══════════════════════════════════════════════════

function analyzeAttendance(records, startDateKey, endDateKey) {
  const inPeriod = records.filter(r => isDateKeyInRange(r.date, startDateKey, endDateKey));
  const overallDates = new Set();
  let overallLateCount = 0;
  const byCluster = {};

  // Day-of-week distribution (overall)
  const byDayOfWeek = [0, 0, 0, 0, 0, 0, 0]; 

  inPeriod.forEach(r => {
    if (!r.date) return;
    const cid = r.clusterId || 'unknown';
    if (!byCluster[cid]) byCluster[cid] = { dateSet: new Set(), lateDays: 0 };
    
    overallDates.add(r.date);
    byCluster[cid].dateSet.add(r.date);
    
    if (r.status === 'late') {
      overallLateCount++;
      byCluster[cid].lateDays++;
    }
    
    const d = new Date(r.date + 'T12:00:00+09:00');
    byDayOfWeek[d.getDay()]++;
  });

  const totalDays = overallDates.size;

  // Streak calculation
  const sortedDates = Array.from(overallDates).sort();
  let longestStreak = 0, currentStreak = 0;
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) { currentStreak = 1; }
    else {
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);
      const diffDays = (curr - prev) / (86400000);
      if (diffDays === 1) currentStreak++;
      else currentStreak = 1;
    }
    longestStreak = Math.max(longestStreak, currentStreak);
  }

  // Finalize byCluster metrics
  Object.keys(byCluster).forEach(cid => {
    const clusterDays = byCluster[cid].dateSet.size;
    byCluster[cid].totalDays = clusterDays;
    byCluster[cid].lateRate = clusterDays > 0 ? Math.round((byCluster[cid].lateDays / clusterDays) * 100) : 0;
  });

  return {
    totalDays,
    lateDays: overallLateCount,
    lateRate: inPeriod.length > 0 ? Math.round((overallLateCount / inPeriod.length) * 100) : 0,
    longestStreak,
    byDayOfWeek,
    byCluster,
    recentDates: sortedDates.slice(-30),
  };
}

function analyzeLearning(history, days) {
  let totalVideoSeconds = 0;
  let totalQuizCount = 0;
  let quizScoreSum = 0;
  let quizScoreCount = 0;

  const byCluster = {};
  const weeklyMap = {};
  const dailyPattern = new Array(24).fill(0);
  const activeDays = new Set();

  history.forEach(h => {
    const ts = h.timestamp?.toDate?.() || (h.timestamp?._seconds ? new Date(h.timestamp._seconds * 1000) : null);
    if (!ts) return;

    const clusterId = h.regionId || h.clusterId || 'unknown'; // Grouping by regionId now
    if (!byCluster[clusterId]) {
      byCluster[clusterId] = { videoSeconds: 0, quizCount: 0, quizScoreSum: 0, quizScoreCount: 0, videoCompletions: 0 };
    }

    const hour = ts.getHours();
    dailyPattern[hour]++;

    const dateStr = ts.toISOString().split('T')[0];
    activeDays.add(dateStr);

    // Week key (ISO week)
    const weekStart = new Date(ts);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!weeklyMap[weekKey]) {
      weeklyMap[weekKey] = { week: weekKey, videoMin: 0, quizCount: 0 };
    }

    const hType = h.type || 'quiz_pass';
    const isVideo = hType.includes('video') || hType === 'recovery_mastery';
    const isQuiz = (hType.includes('quiz') || (!isVideo && hType !== 'text' && hType !== 'data_log_read')) && hType !== 'quiz_battle' && hType !== 'code_trace';

    if (isVideo) {
      const vTime = h.videoTime || 0;
      totalVideoSeconds += vTime;
      byCluster[clusterId].videoSeconds += vTime;
      byCluster[clusterId].videoCompletions++;
      weeklyMap[weekKey].videoMin += Math.round(vTime / 60);
      
      // Cluster specific weekly
      weeklyMap[weekKey][`video_${clusterId}`] = (weeklyMap[weekKey][`video_${clusterId}`] || 0) + Math.round(vTime / 60);
      
    } else if (isQuiz) {
      totalQuizCount++;
      byCluster[clusterId].quizCount++;
      weeklyMap[weekKey].quizCount++;
      
      // Cluster specific weekly
      weeklyMap[weekKey][`quiz_${clusterId}`] = (weeklyMap[weekKey][`quiz_${clusterId}`] || 0) + 1;
      
      if (h.score != null && Number(h.score) <= 100) {
        quizScoreSum += Number(h.score);
        quizScoreCount++;
        byCluster[clusterId].quizScoreSum += Number(h.score);
        byCluster[clusterId].quizScoreCount++;
      }
    }
  });

  // Convert byCluster scores to averages
  Object.values(byCluster).forEach(c => {
    c.avgScore = c.quizScoreCount > 0 ? Math.round(c.quizScoreSum / c.quizScoreCount) : null;
  });

  // Weekly trend (sorted)
  const weeklyTrend = Object.values(weeklyMap).sort((a, b) => a.week.localeCompare(b.week));

  return {
    totalVideoHours: Math.round(totalVideoSeconds / 3600 * 10) / 10,
    totalVideoSeconds,
    totalQuizCount,
    avgQuizScore: quizScoreCount > 0 ? Math.round(quizScoreSum / quizScoreCount) : null,
    quizScoreCount,
    activeDays: activeDays.size,
    byCluster,
    weeklyTrend,
    dailyPattern,
  };
}

function analyzeAssignments(assignments, startDateKey, endDateKey) {
  const inPeriod = assignments.filter(a => isDateKeyInRange(a.date, startDateKey, endDateKey));

  const totalCount = inPeriod.length;
  const reviewed = inPeriod.filter(a => a.status === 'reviewed');
  const needsRevision = inPeriod.filter(a => a.status === 'needs_revision');
  const submitted = inPeriod.filter(a => a.status === 'submitted');

  const totalBonusCrystals = reviewed.reduce((sum, a) => sum + (a.bonusCrystals || 0), 0);

  // Submission time pattern (hour of day)
  const submissionHours = new Array(24).fill(0);
  inPeriod.forEach(a => {
    const ts = a.submittedAt?.toDate?.() || (a.submittedAt?._seconds ? new Date(a.submittedAt._seconds * 1000) : null);
    if (ts) submissionHours[ts.getHours()]++;
  });

  // By cluster
  const byCluster = {};
  inPeriod.forEach(a => {
    const cid = a.clusterId || 'unknown'; // Grouping by clusterId as requested by user
    if (!byCluster[cid]) byCluster[cid] = { count: 0, reviewed: 0, needsRevision: 0 };
    byCluster[cid].count++;
    if (a.status === 'reviewed') byCluster[cid].reviewed++;
    if (a.status === 'needs_revision') byCluster[cid].needsRevision++;
  });

  // Recent 5 assignments inside the selected report window.
  const recentList = [...inPeriod]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 5);

  // Has attachments ratio
  const withAttachments = inPeriod.filter(a => a.attachments && a.attachments.length > 0).length;

  return {
    totalCount,
    reviewedCount: reviewed.length,
    needsRevisionCount: needsRevision.length,
    pendingCount: submitted.length,
    avgBonusCrystals: reviewed.length > 0 ? Math.round(totalBonusCrystals / reviewed.length) : 0,
    totalBonusCrystals,
    submissionHours,
    byCluster,
    recentList,
    attachmentRate: totalCount > 0 ? Math.round(withAttachments / totalCount * 100) : 0,
  };
}

function analyzeAssignmentWarnings(warnings = [], summary = null) {
  const summaryActiveCount = Number(summary?.activeCount || 0);
  const summaryCancelledCount = Number(summary?.cancelledCount || 0);
  const summaryTotalIssuedCount = Number(summary?.totalIssuedCount || 0);

  const normalized = warnings.map((warning) => ({
    ...warning,
    typeLabel: WARNING_TYPE_LABELS[warning.type] || '학습 경고',
    dateLabel: warning.date || formatWarningDate(warning.createdAt),
    createdAtDate: toDateSafe(warning.createdAt),
  }));

  const activeWarnings = normalized
    .filter(warning => ACTIVE_WARNING_STATUSES.includes(warning.status))
    .sort((a, b) => {
      const aTime = a.createdAtDate?.getTime?.() || 0;
      const bTime = b.createdAtDate?.getTime?.() || 0;
      return aTime - bTime || (a.date || '').localeCompare(b.date || '');
    })
    .map((warning, index) => ({ ...warning, ordinal: index + 1 }));

  const cancelledWarnings = normalized.filter(warning => warning.status === 'cancelled');
  const appealedCount = activeWarnings.filter(warning => warning.status === 'appealed').length;

  const activeCount = warnings.length > 0 ? activeWarnings.length : summaryActiveCount;
  const cancelledCount = warnings.length > 0 ? cancelledWarnings.length : summaryCancelledCount;
  const totalIssuedCount = warnings.length > 0 ? normalized.length : summaryTotalIssuedCount;

  const byType = activeWarnings.reduce((acc, warning) => {
    acc[warning.type] = (acc[warning.type] || 0) + 1;
    return acc;
  }, {});

  return {
    activeCount,
    totalIssuedCount,
    cancelledCount,
    appealedCount,
    feeIncreaseRisk: activeCount >= 3 || Boolean(summary?.feeIncreaseRisk),
    policyMessage: summary?.policyMessage || WARNING_POLICY_MESSAGE,
    activeCountByCluster: summary?.activeCountByCluster || {},
    byType,
    recentWarnings: [...activeWarnings].reverse().slice(0, 3),
    lastWarningMessage: activeWarnings[activeWarnings.length - 1]?.message || summary?.lastWarningMessage || '',
    lastWarningAt: activeWarnings[activeWarnings.length - 1]?.createdAtDate || toDateSafe(summary?.lastWarningAt),
    hasWarningRecord: activeCount > 0 || totalIssuedCount > 0 || cancelledCount > 0,
    detailAvailable: warnings.length > 0,
  };
}

function toDateSafe(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value.toDate) return value.toDate();
  if (value._seconds) return new Date(value._seconds * 1000);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatWarningDate(value) {
  const date = toDateSafe(value);
  return date ? date.toISOString().slice(0, 10) : '';
}

function analyzeProgress(progressDocs, unitToRegion, chapToRegion, allHistory = []) {
  // Build a set of unitIds that have been completed in history
  // Includes quiz passes, perfect scores, or specific video/mission complete tags
  const completedUnitIds = new Set();
  allHistory.forEach(h => {
    if (!h.unitId) return;
    const type = h.type || 'quiz_pass';
    
    // Video completion requires explicit tag
    const isVideoComplete = type === 'video_complete' || type === 'mission_complete';
    // Quiz completion can be explicit or score-based (score > 60 is conservative for completion)
    const isQuizComplete = type === 'quiz_pass' || ((type === 'quiz' || type === 'mission') && h.score != null && h.score >= 60);

    if (isVideoComplete || isQuizComplete) {
       completedUnitIds.add(h.unitId);
    }
  });

  const units = progressDocs.map(d => {
    let regionId = unitToRegion[d.id];
    if (!regionId) {
      const match = d.id.match(/(chap_[^_]+(?:_[^_]+)*?)_unit/);
      if (match && chapToRegion[match[1]]) {
        regionId = chapToRegion[match[1]];
      } else {
        regionId = 'unknown';
      }
    }

    // Determine status intelligently
    let status = d.status;
    if (!status || (status !== 'completed' && status !== 'mastered')) {
      if (completedUnitIds.has(d.id)) {
        status = 'completed';
      } else if (d.logRead && d.videoProgress) {
        // Fallback for hybrid data: consider completed if logRead and at least one video exists and is done
        const vKeys = Object.keys(d.videoProgress);
        if (vKeys.length > 0 && vKeys.every(k => d.videoProgress[k].completed || d.videoProgress[k].completionBonusGiven)) {
          status = 'completed';
        }
      }
    }

    return {
      id: d.id,
      regionId,
      unitTitle: d.unitTitle || d.id,
      status,
      updatedAt: d.updatedAt?.toDate?.() || (d.updatedAt?._seconds ? new Date(d.updatedAt._seconds * 1000) : null),
      videoProgress: d.videoProgress || {},
      quizSession: d.quizSession || null,
    };
  });

  const completed = units.filter(u => u.status === 'completed' || u.status === 'mastered');
  const inProgress = units.filter(u => u.status !== 'completed' && u.status !== 'mastered');

  return { units, completedCount: completed.length, inProgressCount: inProgress.length };
}

// ══════════════════════════════════════════════════
// Peer Comparison Builder
// ══════════════════════════════════════════════════

function buildPeerComparison(
  learningAnalysis,
  progressAnalysis,
  peerData,
  activeRegions,
  REGION_NAMES,
  regionStructure,
  manuallyCompletedRegions = new Set()
) {
  const result = {};

  const completedCountByRegion = {};
  (progressAnalysis?.units || []).forEach(unit => {
    if (unit.status === 'completed' || unit.status === 'mastered') {
      completedCountByRegion[unit.regionId] = (completedCountByRegion[unit.regionId] || 0) + 1;
    }
  });

  activeRegions.forEach(regionId => {
    const my = learningAnalysis.byCluster[regionId] || {};
    const myQuizCount = my.quizCount || 0;
    const myVideoSeconds = my.videoSeconds || 0;
    const myQuizScoreCount = my.quizScoreCount || 0;
    const hasPeriodActivity = myQuizCount > 0 || myVideoSeconds > 0 || myQuizScoreCount > 0;

    const totalUnits = regionStructure?.[regionId]?.orderedUnits?.length || 0;
    const progressCompleted = totalUnits > 0 && (completedCountByRegion[regionId] || 0) >= totalUnits;
    const isCompletedRegion = manuallyCompletedRegions.has(regionId) || progressCompleted;

    if (!hasPeriodActivity && isCompletedRegion) {
      return;
    }

    const peers = peerData[regionId] || {};
    const peerList = Object.values(peers);
    if (peerList.length === 0) {
      result[regionId] = { available: false, clusterName: REGION_NAMES[regionId] || regionId };
      return;
    }

    const totalStudents = peerList.length;
    const classAvgScore = peerList.reduce((sum, p) =>
      sum + (p.quizScoreCount > 0 ? p.quizScoreSum / p.quizScoreCount : 0), 0) / totalStudents;
    const classAvgVideoHours = peerList.reduce((sum, p) => sum + p.videoSeconds / 3600, 0) / totalStudents;
    const classAvgQuizCount = peerList.reduce((sum, p) => sum + p.quizCount, 0) / totalStudents;

    // My stats for this region
    const myAvgScore = my.quizScoreCount > 0 ? my.quizScoreSum / my.quizScoreCount : 0;
    const myVideoHours = (my.videoSeconds || 0) / 3600;

    // Percentile (how many peers I beat)
    const myTotalMetric = myAvgScore * 0.4 + (myVideoHours / Math.max(classAvgVideoHours, 0.1)) * 30 + (myQuizCount / Math.max(classAvgQuizCount, 1)) * 30;
    let beatCount = 0;
    peerList.forEach(p => {
      const pScore = p.quizScoreCount > 0 ? p.quizScoreSum / p.quizScoreCount : 0;
      const pVideoH = p.videoSeconds / 3600;
      const pMetric = pScore * 0.4 + (pVideoH / Math.max(classAvgVideoHours, 0.1)) * 30 + (p.quizCount / Math.max(classAvgQuizCount, 1)) * 30;
      if (myTotalMetric >= pMetric) beatCount++;
    });
    const percentile = Math.round(beatCount / totalStudents * 100);

    result[regionId] = {
      available: true,
      clusterName: REGION_NAMES[regionId] || regionId,
      totalStudents,
      myAvgScore: Math.round(myAvgScore),
      classAvgScore: Math.round(classAvgScore),
      myVideoHours: Math.round(myVideoHours * 10) / 10,
      classAvgVideoHours: Math.round(classAvgVideoHours * 10) / 10,
      myQuizCount,
      classAvgQuizCount: Math.round(classAvgQuizCount),
      percentile,
    };
  });

  return result;
}

// ══════════════════════════════════════════════════
// Predictions
// ══════════════════════════════════════════════════

function calculatePredictions(
  learning,
  progress,
  activeRegions,
  regionStructure,
  REGION_NAMES,
  REGION_TO_CLUSTER,
  regionEarliestTs,
  peerData,
  manuallyCompletedRegions = new Set()
) {
  const result = {};

  activeRegions.forEach(regionId => {
    const title = REGION_NAMES[regionId] || regionId;
    const parentClusterId = REGION_TO_CLUSTER?.[regionId] || '';

    // western-classic은 정해진 커리큘럼 기반 완강일 예측을 제공하지 않는다.
    if (parentClusterId === 'western-classic') {
      return;
    }

    // Skip event-based or evaluation regions
    if (title.includes('평가') || title.includes('월간') || title.includes('테스트') || title.includes('진단')) {
      return;
    }

    const clusterData = learning.byCluster[regionId] || {};
    const videoCompletions = clusterData.videoCompletions || 0;
    const quizCount = clusterData.quizCount || 0;
    const totalActivities = videoCompletions + quizCount;

    const orderedUnits = regionStructure[regionId]?.orderedUnits || [];
    const exactTotalUnits = orderedUnits.length;

    const isManualCompleted = manuallyCompletedRegions.has(regionId);
    if (isManualCompleted && exactTotalUnits > 0) {
      const lastUnit = orderedUnits[exactTotalUnits - 1];
      result[regionId] = {
        available: true,
        clusterName: REGION_NAMES[regionId] || regionId,
        completedUnits: exactTotalUnits,
        remainingUnits: 0,
        isCompleted: true,
        daysToComplete: 0,
        predictedDate: null,
        dailyVelocity: 0,
        frontierIndex: exactTotalUnits - 1,
        frontierChapterTitle: lastUnit?.chapterTitle || '',
        frontierUnitTitle: lastUnit?.title || lastUnit?.id || '',
        progressPercentage: 100
      };
      return;
    }

    const completedUnits = progress.units.filter(u =>
      u.regionId === regionId && (u.status === 'completed' || u.status === 'mastered')
    );
    const completedCount = completedUnits.length;

    if (exactTotalUnits === 0) {
      result[regionId] = { available: false, clusterName: title };
      return;
    }

    // 1. Gather global indices of completed units
    const indices = [];
    completedUnits.forEach(cu => {
      const idx = orderedUnits.findIndex(u => u.id === cu.id);
      if (idx !== -1) indices.push(idx);
    });
    indices.sort((a, b) => a - b);

    // 2. Find the robust frontier
    let frontierIndex = -1;
    let seqReachedEnd = false;

    if (indices.length > 0) {
      let currentSeq = [indices[0]];
      let bestSeqMax = indices[0];
      let bestSeqValid = false;

      for (let i = 1; i < indices.length; i++) {
        // Allow a gap of up to 3 units
        if (indices[i] - indices[i - 1] <= 3) {
          currentSeq.push(indices[i]);
        } else {
          // Check if previous sequence is reliable (length >= 2)
          if (currentSeq.length >= 2) {
            bestSeqMax = Math.max(bestSeqMax, currentSeq[currentSeq.length - 1]);
            bestSeqValid = true;
          }
          currentSeq = [indices[i]]; // Start new sequence
        }
      }
      // Check last sequence
      if (currentSeq.length >= 2) {
        const lastIdx = currentSeq[currentSeq.length - 1];
        bestSeqMax = Math.max(bestSeqMax, lastIdx);
        bestSeqValid = true;
        if (lastIdx === exactTotalUnits - 1) seqReachedEnd = true;
      }

      if (bestSeqValid) {
        frontierIndex = bestSeqMax;
      } else {
        // Fallback for single completions or fully disconnected clicks: Pick the earliest starting point
        frontierIndex = indices[0];
      }
    }

    const remainingUnits = Math.max(exactTotalUnits - 1 - frontierIndex, 0);
    
    // Strict Completion Check: 
    // - Frontier reached the end AND 
    // - At least 80% of units are manually finished (to avoid noise clicks marking it done)
    const completionRatio = exactTotalUnits > 0 ? (completedCount / exactTotalUnits) : 0;
    const isCompleted = (frontierIndex === exactTotalUnits - 1) && (completionRatio >= 0.8 || exactTotalUnits === 1);

    if (totalActivities < 2 && !isCompleted && frontierIndex === -1) {
      result[regionId] = { available: false, clusterName: REGION_NAMES[regionId] || regionId };
      return;
    }

    // --- Velocity filtering ---

    // 1. Personal Velocity (Calendar Span)
    const earliestMs = regionEarliestTs[regionId] || Date.now();
    const myActiveSpanDays = Math.max((Date.now() - earliestMs) / 86400000, 1);
    const personalVelocity = completedCount / myActiveSpanDays; // Units per calendar day

    // 2. Peer Fallback Velocity
    const peers = Object.values(peerData[regionId] || {});
    let peerAvgActivities = 0;
    if (peers.length > 0) {
      const totalPeerActivities = peers.reduce((sum, p) => sum + (p.quizCount || 0) + ((p.videoSeconds || 0) > 0 ? 1 : 0), 0);
      peerAvgActivities = totalPeerActivities / peers.length; 
    }
    // peerAvgActivities represents actions over the report window (default 30 days)
    // Assume ~3 activities = 1 unit
    const peerVelocity = peerAvgActivities > 0 ? (peerAvgActivities / 3) / 30 : (2 / 7); // Default to ~2 units/week

    // 3. Blending
    let finalVelocity = 0;
    if (completedCount >= 2 && myActiveSpanDays >= 3) {
      // Trust the student's personal calendar speed
      finalVelocity = personalVelocity;
    } else if (peerAvgActivities > 0) {
      // Peer average
      finalVelocity = peerVelocity;
    } else {
      // Ultimate fallback: 2 units a week
      finalVelocity = 2 / 7;
    }

    // Cap crazy speeds (e.g., minimum 1 unit every 20 days, maximum 5 units a day)
    finalVelocity = Math.min(Math.max(finalVelocity, 0.05), 5);

    const daysToComplete = Math.ceil(remainingUnits / finalVelocity);
    const predictedDate = daysToComplete ? new Date(Date.now() + daysToComplete * 86400000) : null;
    
    let frontierChapterTitle = "";
    let frontierUnitTitle = "";
    if (frontierIndex >= 0 && orderedUnits[frontierIndex]) {
       frontierChapterTitle = orderedUnits[frontierIndex].chapterTitle || "";
       frontierUnitTitle = orderedUnits[frontierIndex].title || orderedUnits[frontierIndex].id;
    }

    result[regionId] = {
      available: true,
      clusterName: REGION_NAMES[regionId] || regionId,
      completedUnits: completedCount,
      remainingUnits,
      isCompleted,
      daysToComplete,
      predictedDate: predictedDate?.toISOString()?.split('T')[0] || null,
      dailyVelocity: Math.round(finalVelocity * 100) / 100,
      frontierIndex,
      frontierChapterTitle,
      frontierUnitTitle,
      progressPercentage: Math.round(((frontierIndex + 1) / exactTotalUnits) * 100)
    };
  });

  return result;
}

// ══════════════════════════════════════════════════
// Focus Index
// ══════════════════════════════════════════════════

function calculateFocusIndex(history) {
  const attentionEvents = history.filter(h =>
    h.attentionSource && (h.attentionResult === 'hit' || h.attentionResult === 'miss')
  );
  const totalOpportunities = attentionEvents.length;
  if (totalOpportunities === 0) {
    return {
      score: 0,
      label: '데이터 없음',
      totalOpportunities: 0,
      hitCount: 0,
      missCount: 0
    };
  }

  const hitCount = attentionEvents.filter(h => h.attentionResult === 'hit').length;
  const missCount = totalOpportunities - hitCount;
  const score = Math.round((hitCount / totalOpportunities) * 100);
  let label = '집계 중';
  if (score >= 85) label = '매우 높음 🔥';
  else if (score >= 65) label = '양호 👍';
  else if (score >= 30) label = '보통';
  else label = '개선 필요';

  return { score, label, totalOpportunities, hitCount, missCount };
}

// ══════════════════════════════════════════════════
// Insights Extraction (Strength-based Language)
// ══════════════════════════════════════════════════

function extractInsights(student, attendance, learning, assignments, peerComparison, focusIndex) {
  const strengths = [];
  const growthPoints = [];

  // ── Attendance Insights ──
  if (attendance.totalDays >= 15) {
    strengths.push({
      icon: '🏆',
      title: '꾸준한 출석 습관',
      detail: `지난 기간 동안 ${attendance.totalDays}일 출석하며 높은 성실성을 보여주고 있습니다.`
    });
  }
  if (attendance.longestStreak >= 5) {
    strengths.push({
      icon: '🔥',
      title: `${attendance.longestStreak}일 연속 출석 기록`,
      detail: '연속 출석은 학습 루틴이 잘 형성되어 있다는 증거입니다.'
    });
  }
  if (attendance.lateRate > 30 && attendance.totalDays > 5) {
    growthPoints.push({
      icon: '⏰',
      title: '정시 출석에 도전해 보아요',
      detail: `지각 비율이 ${attendance.lateRate}%입니다. 수업 5분 전에 접속하는 습관을 들이면 학습 효과가 크게 높아질 수 있습니다.`
    });
  }

  // ── Learning Insights ──
  if (learning.totalVideoHours >= 10) {
    strengths.push({
      icon: '🎬',
      title: '영상 학습에 대한 높은 몰입',
      detail: `총 ${learning.totalVideoHours}시간의 영상을 시청했습니다. 개념을 탄탄히 다지는 스타일입니다.`
    });
  }
  if (learning.avgQuizScore != null && learning.avgQuizScore >= 90) {
    strengths.push({
      icon: '💯',
      title: '탁월한 퀴즈 성취도',
      detail: `평균 점수 ${learning.avgQuizScore}점으로, 학습한 내용을 매우 잘 이해하고 있습니다.`
    });
  }
  if (learning.totalQuizCount < 5 && learning.totalVideoHours > 3) {
    growthPoints.push({
      icon: '📝',
      title: '영상 학습 후 퀴즈 도전을 늘려 보아요',
      detail: `영상 시청 시간에 비해 퀴즈 참여가 적습니다. '본 것'을 '아는 것'으로 만드는 연습이 필요합니다.`
    });
  }

  // ── Assignment Insights ──
  if (assignments.totalCount >= 10 && assignments.needsRevisionCount <= 1) {
    strengths.push({
      icon: '📋',
      title: '과제 제출의 달인',
      detail: `${assignments.totalCount}건의 과제를 성실히 제출하고 있으며, 보완 요청이 거의 없습니다.`
    });
  }
  if (assignments.attachmentRate >= 80) {
    strengths.push({
      icon: '📎',
      title: '꼼꼼한 파일 첨부 습관',
      detail: '과제에 파일을 빠짐없이 첨부하는 좋은 습관을 가지고 있습니다.'
    });
  }
  if (assignments.needsRevisionCount >= 3) {
    growthPoints.push({
      icon: '🔄',
      title: '과제 제출 전 한 번 더 확인해 보아요',
      detail: `보완 요청이 ${assignments.needsRevisionCount}회 있었습니다. 제출 전에 요구 사항을 다시 한번 체크하면 완성도가 높아질 수 있습니다.`
    });
  }

  // ── Peer Comparison Insights ──
  Object.entries(peerComparison).forEach(([clusterId, comp]) => {
    if (!comp.available) return;
    if (comp.percentile >= 80) {
      strengths.push({
        icon: '🌟',
        title: `${comp.clusterName} 과정 상위 ${100 - comp.percentile}%`,
        detail: `${comp.clusterName} 과정에서 전체 ${comp.totalStudents}명 중 상위권에 위치해 있습니다. 대단합니다!`
      });
    }
    if (comp.percentile < 30 && comp.totalStudents > 3) {
      growthPoints.push({
        icon: '🚀',
        title: `${comp.clusterName} 과정의 성장 잠재력이 높습니다`,
        detail: `현재 평균 대비 다소 낮은 위치에 있지만, 꾸준한 복습과 퀴즈 도전으로 빠르게 성장할 수 있는 잠재력을 가지고 있습니다.`
      });
    }
  });

  // ── Focus Insights ──
  if (focusIndex.totalOpportunities > 0 && focusIndex.score >= 60) {
    strengths.push({
      icon: '🎯',
      title: '높은 학습 집중도',
      detail: `광석 획득 ${focusIndex.hitCount}/${focusIndex.totalOpportunities}회로 집중도 점수 ${focusIndex.score}점 (${focusIndex.label})을 기록했습니다.`
    });
  }

  // Limit to top 3 strengths and top 2 growth points
  return {
    strengths: strengths.slice(0, 4),
    growthPoints: growthPoints.slice(0, 3)
  };
}
