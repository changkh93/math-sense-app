/**
 * Course Policy Utilities
 * Pure, dependency-free module shared across runtime services, offline scripts, and unit tests.
 * 
 * Enforces strict 4-stage course isolation:
 * Stage 1: Collection (belongsToCourse)
 * Stage 2: Summary (sanitizeLearningSummaryForCourse)
 * Stage 3: Prompt/Evidence (buildFeedbackWhitelistDto)
 * Stage 4: Admin UI rendering
 */

export const COURSE_CLUSTER_ALIASES = Object.freeze({
  python: 'python',
  '파이썬': 'python',
  'Python': 'python',
  'middle-math': 'middle-math',
  '중등수학': 'middle-math',
  middle_math: 'middle-math',
  cluster_elementary: 'cluster_elementary',
  '초등수학': 'cluster_elementary',
  elementary: 'cluster_elementary',
  elementary_math: 'cluster_elementary',
  'western-classic': 'western-classic',
  '서양고전': 'western-classic',
  '고전 읽기': 'western-classic',
  western_classic: 'western-classic',
});

/**
 * Normalize any course / cluster identifier into canonical cluster IDs.
 */
export function normalizeCourseId(courseId = '') {
  const trimmed = String(courseId || '').trim();
  return COURSE_CLUSTER_ALIASES[trimmed] || trimmed;
}

/**
 * Determine if an activity is strictly Python-exclusive (CODE TRACE or LUMI Protocol).
 */
export function isPythonExclusiveActivity(item = {}) {
  if (!item || typeof item !== 'object') return false;
  const type = String(item.type || '').trim();
  const activityType = String(item.activityType || '').trim();
  const experienceType = String(item.experienceType || item.missionLab?.experienceType || '').trim();
  const unitId = String(item.unitId || '').trim();
  const missionSetId = String(item.missionSetId || item.missionLab?.missionSetId || '').trim();

  if (type === 'code_trace' || activityType === 'code_trace' || item.codeTrace) return true;
  if (type === 'lumi_protocol' || activityType === 'lumi_protocol_mission_complete' || experienceType === 'lumi_protocol') return true;
  if (item.missionLab && (item.missionLab.experienceType === 'lumi_protocol' || missionSetId.startsWith('lumi-') || unitId.startsWith('lumi_protocol_'))) return true;
  if (type === 'python_mission') {
    if (experienceType === 'lumi_protocol') return true;
    if (missionSetId.startsWith('lumi-')) return true;
    if (unitId.startsWith('lumi_protocol_')) return true;
  }
  return false;
}

/**
 * Determine if an item belongs to the specified course.
 * Strict Isolation Rule: Non-Python courses STRICTLY bar Python-exclusive activities.
 * Elementary Level-Up Exception: Admits ONLY 'middle-math' activities when active.
 */
export function belongsToCourse(item = {}, targetCourse = '', options = {}) {
  const normalizedTarget = normalizeCourseId(targetCourse);
  const isPython = isPythonExclusiveActivity(item);

  if (isPython && normalizedTarget !== 'python') {
    return false;
  }

  if (!normalizedTarget || normalizedTarget === 'unknown') return true;

  const itemCourse = normalizeCourseId(item.clusterId || item.courseId);
  if (itemCourse === normalizedTarget) return true;

  // 초등수학 레벨업 예외: 중등수학(middle-math) 활동만 제한적으로 인정
  return normalizedTarget === 'cluster_elementary'
    && options.includeMiddleMathLevelUp === true
    && itemCourse === 'middle-math';
}

/**
 * Sanitize daily learning summary for a given course.
 * For non-Python courses, physically strips/zeros CODE TRACE and LUMI fields,
 * and ensures allActivityCount does not contain Python activities.
 */
export function sanitizeLearningSummaryForCourse(summary = {}, courseId = '') {
  if (!summary || typeof summary !== 'object') return {};
  const normalizedCourse = normalizeCourseId(courseId);
  const isPython = normalizedCourse === 'python';

  if (isPython) {
    return { ...summary };
  }

  // Non-Python courses: strip CODE TRACE and LUMI fields completely
  const copy = { ...summary };
  delete copy.codeTraces;
  delete copy.inProgressCodeTraces;
  delete copy.lumiProtocols;
  delete copy.inProgressLumiProtocols;
  delete copy.codeTraceTitles;
  delete copy.lumiProtocolTitles;

  copy.codeTraceCount = 0;
  copy.codeTraceProgressCount = 0;
  copy.lumiProtocolCount = 0;
  copy.lumiProtocolProgressCount = 0;
  copy.lumiProtocolMissionCount = 0;
  copy.lumiProtocolCrystalsEarned = 0;

  // Filter excluded titles so they never leak Python-exclusive titles
  if (Array.isArray(copy.excludedOtherCourseTitles)) {
    copy.excludedOtherCourseTitles = copy.excludedOtherCourseTitles.filter(title => {
      const lower = String(title || '').toLowerCase();
      return !lower.includes('code trace') && !lower.includes('lumi') && !lower.includes('루미');
    });
  }

  return copy;
}

/**
 * Build a sanitized Whitelist DTO for model prompt injection.
 * Prevents prompt bloat and guarantees zero leakage of irrelevant course fields.
 */
export function buildFeedbackWhitelistDto(feedbackContext = {}, courseId = '') {
  const normalizedCourse = normalizeCourseId(courseId || feedbackContext?.student?.courseId);
  const isPython = normalizedCourse === 'python';

  const rawSummary = feedbackContext.dailyLearningSummary || {};
  const sanitizedSummary = sanitizeLearningSummaryForCourse(rawSummary, normalizedCourse);

  const studentDto = {
    name: feedbackContext.student?.name || '',
    courseLabel: feedbackContext.student?.courseLabel || '',
    courseId: normalizedCourse,
  };

  const currentSubmissionDto = {
    assignmentId: feedbackContext.currentSubmission?.assignmentId || '',
    content: feedbackContext.currentSubmission?.content || '',
    contentLength: feedbackContext.currentSubmission?.contentLength || 0,
    attachmentCount: feedbackContext.currentSubmission?.attachmentCount || 0,
    attachments: (feedbackContext.currentSubmission?.attachments || []).map(att => ({
      name: att.name || '',
      type: att.type || '',
    })),
    studentQuestions: feedbackContext.currentSubmission?.studentQuestions || [],
    ...(isPython && feedbackContext.currentSubmission?.codeAttachments ? {
      codeAttachments: feedbackContext.currentSubmission.codeAttachments,
      codeComparison: feedbackContext.currentSubmission.codeComparison || null,
    } : {}),
  };

  const learningSummaryDto = {
    activityCount: sanitizedSummary.activityCount || 0,
    allActivityCount: sanitizedSummary.allActivityCount || 0,
    videoCount: sanitizedSummary.videoCount || 0,
    videoMinutes: sanitizedSummary.videoMinutes || 0,
    quizCount: sanitizedSummary.quizCount || 0,
    inProgressQuizCount: sanitizedSummary.inProgressQuizCount || 0,
    averageScore: sanitizedSummary.averageScore ?? null,
    workbookCount: sanitizedSummary.workbookCount || 0,
    workbookProgressCount: sanitizedSummary.workbookProgressCount || 0,
    battleCount: sanitizedSummary.battleCount || 0,
    titles: (sanitizedSummary.titles || []).slice(0, 8),
    excludedOtherCourseTitles: sanitizedSummary.excludedOtherCourseTitles || [],
    ...(isPython ? {
      codeTraceCount: sanitizedSummary.codeTraceCount || 0,
      codeTraceProgressCount: sanitizedSummary.codeTraceProgressCount || 0,
      codeTraces: sanitizedSummary.codeTraces || [],
      inProgressCodeTraces: sanitizedSummary.inProgressCodeTraces || [],
      lumiProtocolCount: sanitizedSummary.lumiProtocolCount || 0,
      lumiProtocolProgressCount: sanitizedSummary.lumiProtocolProgressCount || 0,
      lumiProtocols: sanitizedSummary.lumiProtocols || [],
      inProgressLumiProtocols: sanitizedSummary.inProgressLumiProtocols || [],
      lumiProtocolCrystalsEarned: sanitizedSummary.lumiProtocolCrystalsEarned || 0,
    } : {}),
  };

  return {
    student: studentDto,
    currentSubmission: currentSubmissionDto,
    dailyLearningSummary: learningSummaryDto,
    evidence: feedbackContext.evidence || [],
    previousSubmissions: (feedbackContext.previousSubmissions || []).slice(0, 3).map(prev => ({
      assignmentId: prev.assignmentId || '',
      createdAt: prev.createdAt || '',
      feedbackReaction: prev.feedbackReaction || null,
      feedbackComment: prev.feedbackComment || null,
    })),
    darkMatterSummary: {
      totalActive: feedbackContext.darkMatterSummary?.totalActive || 0,
    },
    feedbackGoal: feedbackContext.feedbackGoal || {},
  };
}
