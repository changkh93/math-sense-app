import admin from 'firebase-admin';
import { readFileSync, writeFileSync } from 'fs';

const args = process.argv.slice(2);
const outArg = args.find(arg => arg.startsWith('--out='));
const outPath = outArg ? outArg.split('=')[1] : '/private/tmp/pending_assignment_contexts.json';

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

const COURSE_EXPECTATIONS = {
  cluster_elementary: {
    label: '초등수학',
    totalMinutes: 40,
    platformTargetMinutes: 20,
    readingTargetMinutes: 20,
    note: '독서 20분 + 수학 20분',
  },
  'middle-math': {
    label: '중등수학',
    totalMinutes: 50,
    platformTargetMinutes: 50,
    readingTargetMinutes: 0,
    note: '수업 시간 50분',
  },
  python: {
    label: 'Python',
    totalMinutes: 50,
    platformTargetMinutes: 50,
    readingTargetMinutes: 0,
    note: '수업 시간 50분',
  },
};

function normalizeCourseId(value = '') {
  if (value === '초등수학' || value === 'cluster_elementary' || value === 'ratios') return 'cluster_elementary';
  if (value === '중등수학' || value === 'middle-math') return 'middle-math';
  if (value === '파이썬' || value === 'python') return 'python';
  return value || 'unknown';
}

function inferCourseFromUnitId(unitId = '') {
  if (/python|gameproj|sprite|pygame/i.test(unitId)) return 'python';
  if (/ratio|ratios/i.test(unitId)) return 'cluster_elementary';
  if (/middle|geo|algebra|equation|chap_177392/i.test(unitId)) return 'middle-math';
  return '';
}

function itemCourseId(item = {}) {
  return normalizeCourseId(item.clusterId || item.courseId || item.regionId || inferCourseFromUnitId(item.unitId || ''));
}

function belongsToCourse(item = {}, courseId = '') {
  const normalized = normalizeCourseId(courseId);
  const itemCourse = itemCourseId(item);
  return !normalized || normalized === 'unknown' || itemCourse === normalized;
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') return new Date(value).getTime() || 0;
  return 0;
}

function toDateText(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  if (typeof value.toDate === 'function') return value.toDate().toISOString().slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return '';
}

function timestampToJson(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return value;
}

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  if (value.seconds) return new Date(value.seconds * 1000);
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function titleOf(item) {
  return item.title || item.unitTitle || item.chapterTitle || item.videoTitle || item.transmissionTitle || item.regionTitle || '';
}

function isReadingRelatedItem(item = {}) {
  const text = [
    titleOf(item),
    item.unitId,
    item.regionId,
    item.clusterName,
    item.category,
    item.typeLabel,
  ].filter(Boolean).join(' ');

  return /독서|읽기|책|도서|문학|소설|고전|나니아|돈키호테|reading|book|novel/i.test(text);
}

function extractStudentQuestions(text = '') {
  const source = String(text || '').trim();
  if (!source) return [];

  const candidates = source
    .split(/(?<=[.?？!！])\s+|\n+/)
    .map(part => part.trim())
    .filter(Boolean);

  const questionPatterns = [
    /\?/,
    /질문/,
    /궁금/,
    /왜\s/,
    /어떻게/,
    /뭐가|무엇이|뭔가/,
    /맞나|맞나요|맞는지/,
    /되나|되나요|되는지/,
    /모르겠|몰라/,
    /헷갈/,
    /이해가\s*안/,
    /잘\s*안\s*(돼|되)/,
    /도와/,
  ];

  const questions = candidates.filter(part => questionPatterns.some(pattern => pattern.test(part)));
  if (questions.length) return questions.slice(0, 5);

  return source.includes('?') ? source.split('?').slice(0, 5).map(part => `${part.trim()}?`).filter(part => part.length > 1) : [];
}

function summarizeVideoRows(rows) {
  const byKey = new Map();

  rows.forEach(item => {
    const key = `${item.unitId || 'unknown'}:${item.transmissionId || titleOf(item) || item.id}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        unitId: item.unitId || '',
        title: item.transmissionTitle || item.unitTitle || titleOf(item),
        seconds: 0,
        completed: false,
        crystalsEarned: 0,
        attentionHits: 0,
        attentionMisses: 0,
        timeAttackHits: 0,
        timeAttackMisses: 0,
        completionBonusHits: 0,
        completionBonusMisses: 0,
        lastSeenAt: null,
      });
    }

    const group = byKey.get(key);
    const seconds = Math.floor(item.videoTime || item.stampedCount || 0);
    group.seconds = Math.max(group.seconds, seconds);
    group.crystalsEarned += Number(item.crystalsEarned || 0);
    group.completed = group.completed || item.activityType?.includes('완료') || item.completed === true;

    if (item.attentionResult === 'hit' || item.attentionResult === 'miss') {
      if (item.attentionResult === 'hit') group.attentionHits += 1;
      if (item.attentionResult === 'miss') group.attentionMisses += 1;
      if (item.attentionSource === 'time_attack') {
        if (item.attentionResult === 'hit') group.timeAttackHits += 1;
        if (item.attentionResult === 'miss') group.timeAttackMisses += 1;
      }
      if (item.attentionSource === 'completion_bonus') {
        if (item.attentionResult === 'hit') group.completionBonusHits += 1;
        if (item.attentionResult === 'miss') group.completionBonusMisses += 1;
      }
    }

    const itemTime = timestampToJson(item.timestamp || item.updatedAt);
    if (itemTime && (!group.lastSeenAt || itemTime > group.lastSeenAt)) group.lastSeenAt = itemTime;
  });

  return [...byKey.values()].sort((a, b) => (a.lastSeenAt || '').localeCompare(b.lastSeenAt || ''));
}

function summarizeQuizRows(rows) {
  return rows.map(item => ({
    title: titleOf(item),
    score: item.score ?? null,
    totalCount: item.totalCount || item.originalTotal || null,
    correctCount: item.correctCount ?? null,
    incorrectCount: item.incorrectCount ?? null,
    crystalsEarned: item.crystalsEarned || 0,
    completed: true,
    timestamp: timestampToJson(item.timestamp),
  }));
}

function summarizeLearningProgress(progressDocs, start, end, courseId) {
  const videos = [];
  const inProgressQuizzes = [];

  progressDocs.forEach(doc => {
    const data = doc.data();
    const unitId = doc.id;
    const inferredCourse = inferCourseFromUnitId(unitId);
    if (courseId && inferredCourse && normalizeCourseId(courseId) !== inferredCourse) return;
    const updatedAt = toDate(data.updatedAt);

    Object.entries(data.videoProgress || {}).forEach(([transmissionId, progress]) => {
      const progressUpdatedAt = toDate(progress.updatedAt) || updatedAt;
      if (!progressUpdatedAt || progressUpdatedAt < start || progressUpdatedAt > end) return;
      const seconds = Array.isArray(progress.stampedSeconds)
        ? progress.stampedSeconds.length
        : Math.floor(progress.videoTime || progress.totalTimeSpent || 0);
      if (!seconds) return;

      videos.push({
        unitId,
        transmissionId,
        title: progress.transmissionTitle || data.unitTitle || unitId,
        seconds,
        completed: progress.completed === true,
        completionBonusGiven: progress.completionBonusGiven === true,
        totalRewardedCrystals: progress.totalRewardedCrystals || 0,
        lastPosition: progress.lastPosition || 0,
        updatedAt: progressUpdatedAt.toISOString(),
      });
    });

    const session = data.quizSession;
    if (updatedAt && updatedAt >= start && updatedAt <= end && session?.currentIdx > 0) {
      const answers = Object.values(session.userAnswers || {});
      const correctCount = answers.filter(answer => answer?.isCorrect === true).length;
      const incorrectCount = answers.filter(answer => answer?.isCorrect === false).length;
      inProgressQuizzes.push({
        unitId,
        title: data.unitTitle || session.quizTitle || unitId,
        answeredCount: answers.length || session.currentIdx || 0,
        currentIdx: session.currentIdx || 0,
        totalCount: session.originalTotal || session.totalCount || 0,
        correctCount,
        incorrectCount,
        everWrongCount: Array.isArray(session.everWrong) ? session.everWrong.length : incorrectCount,
        sessionCrystals: session.sessionCrystals || 0,
        updatedAt: updatedAt.toISOString(),
      });
    }
  });

  return { videos, inProgressQuizzes };
}

function compactAssignment(doc) {
  const data = doc.data();
  const content = data.content || '';
  const studentQuestions = extractStudentQuestions(content);
  return {
    id: doc.id,
    userId: data.userId || '',
    userName: data.userName || '',
    clusterId: data.clusterId || '',
    regionId: data.regionId || '',
    clusterName: data.clusterName || '',
    title: data.title || data.assignmentTitle || '',
    date: data.date || toDateText(data.submittedAt) || toDateText(data.createdAt),
    submittedAt: timestampToJson(data.submittedAt),
    createdAt: timestampToJson(data.createdAt),
    status: data.status || '',
    content,
    studentQuestions,
    hasStudentQuestion: studentQuestions.length > 0,
    feedback: data.feedback || '',
    aiFeedbackDraft: data.aiFeedbackDraft || '',
    attachments: Array.isArray(data.attachments) ? data.attachments.map(item => ({
      name: item.name || item.fileName || '',
      type: item.type || item.contentType || '',
      url: item.url || '',
    })) : [],
    links: Array.isArray(data.links) ? data.links.map(item => ({
      url: item.url || item.href || '',
      title: item.title || '',
    })) : [],
    feedbackResponse: data.feedbackResponse || null,
    feedbackReaction: data.feedbackReaction || data.feedbackResponse?.reaction || '',
    feedbackComment: data.feedbackComment || data.feedbackResponse?.comment || '',
  };
}

function courseKey(item) {
  return normalizeCourseId(item.clusterId || item.regionId || item.courseId || item.clusterName || '');
}

async function getUser(uid) {
  if (!uid) return {};
  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) return {};
  const data = snap.data();
  return {
    uid,
    studentName: data.studentName || '',
    publicDisplayName: data.publicDisplayName || '',
    name: data.name || '',
    displayName: data.displayName || '',
    resolvedName: data.studentName || data.publicDisplayName || data.name || data.displayName || data.nickname || '',
    email: data.email || '',
    streak: data.streak || data.currentStreak || 0,
    crystals: data.crystals || 0,
  };
}

async function getUserAssignments(uid) {
  const snap = await db.collection('assignments').where('userId', '==', uid).get();
  return snap.docs.map(compactAssignment);
}

function buildLearningLoadSummary({ courseId, videos, quizzes, dataLogs, inProgressQuizzes, attention, readingActivityCount = 0 }) {
  const expectation = COURSE_EXPECTATIONS[normalizeCourseId(courseId)] || {
    label: courseId || '과정',
    totalMinutes: 0,
    platformTargetMinutes: 0,
    readingTargetMinutes: 0,
    note: '',
  };
  const videoSeconds = videos.reduce((sum, item) => sum + (item.seconds || 0), 0);
  const videoMinutes = Math.round((videoSeconds / 60) * 10) / 10;
  const target = expectation.platformTargetMinutes || 0;
  const ratio = target ? Math.round((videoMinutes / target) * 100) : null;
  const hasPractice = quizzes.length > 0 || inProgressQuizzes.length > 0;
  const hasConceptInput = videos.length > 0 || dataLogs.length > 0;
  const hasMathPlatformActivity = hasConceptInput || hasPractice;
  const isElementary = normalizeCourseId(courseId) === 'cluster_elementary';
  let level = '기록 부족';

  if (target) {
    if (isElementary && !hasMathPlatformActivity) level = '수학 기록 없음';
    else if (videoMinutes >= target * 0.8 || (videoMinutes >= target * 0.5 && hasPractice)) level = '충분';
    else if (videoMinutes >= target * 0.4 || hasPractice) level = '조금 부족';
    else level = '부족';
  }

  const balanceSignals = [];
  if (videos.length) balanceSignals.push(`영상 ${videos.length}개, ${videoMinutes}분`);
  if (quizzes.length) balanceSignals.push(`완료 퀴즈 ${quizzes.length}개`);
  if (inProgressQuizzes.length) balanceSignals.push(`진행 중 퀴즈 ${inProgressQuizzes.map(item => `${item.title} ${item.answeredCount}/${item.totalCount}`).join(', ')}`);
  if (dataLogs.length) balanceSignals.push(`데이터 로그 ${dataLogs.length}개`);
  if (isElementary && readingActivityCount) balanceSignals.push(`독서/읽기 활동 ${readingActivityCount}건`);
  if (isElementary && readingActivityCount && !hasMathPlatformActivity) balanceSignals.push('독서 활동만 있고 수학 플랫폼 기록 없음');
  if (hasConceptInput && !hasPractice) balanceSignals.push('영상/개념 학습 대비 퀴즈 기록 없음');
  if (!hasConceptInput && hasPractice) balanceSignals.push('퀴즈 위주 학습');
  if (attention?.opportunities) balanceSignals.push(`집중도 광석 ${attention.hits}/${attention.opportunities}`);

  return {
    expectation,
    videoSeconds,
    videoMinutes,
    platformTargetMinutes: target,
    platformCompletionRatio: ratio,
    level,
    hasBalancedPractice: hasConceptInput && hasPractice,
    hasMathPlatformActivity,
    readingActivityCount,
    balanceSignals,
  };
}

async function getLearningSummary(uid, date, courseId = '') {
  if (!uid || !date) return { activityCount: 0, quizCount: 0, averageScore: null, titles: [], videos: [], inProgressQuizzes: [] };
  const start = new Date(`${date}T00:00:00+09:00`);
  const end = new Date(`${date}T23:59:59+09:00`);
  const [snap, progressSnap] = await Promise.all([
    db.collection('users').doc(uid).collection('history')
      .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(start))
      .where('timestamp', '<=', admin.firestore.Timestamp.fromDate(end))
      .get()
      .catch(() => null),
    db.collection('users').doc(uid).collection('learning_progress').get().catch(() => null),
  ]);

  if (!snap) return { activityCount: 0, quizCount: 0, averageScore: null, titles: [], videos: [], inProgressQuizzes: [] };

  const allItems = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const items = allItems.filter(item => belongsToCourse(item, courseId));
  const isElementary = normalizeCourseId(courseId) === 'cluster_elementary';
  const readingItems = isElementary ? items.filter(isReadingRelatedItem) : [];
  const mathItems = isElementary ? items.filter(item => !isReadingRelatedItem(item)) : items;
  const quizItems = mathItems.filter(item => !['video', 'video_complete', 'recovery_mastery', 'text', 'data_log_read', 'attention'].includes(item.type || 'quiz'));
  const readingQuizItems = readingItems.filter(item => !['video', 'video_complete', 'recovery_mastery', 'text', 'data_log_read', 'attention'].includes(item.type || 'quiz'));
  const videoItems = mathItems.filter(item => ['video', 'video_complete', 'recovery_mastery', 'attention'].includes(item.type) || item.attentionResult === 'hit' || item.attentionResult === 'miss');
  const dataLogItems = mathItems.filter(item => ['text', 'data_log_read'].includes(item.type));
  const attentionItems = mathItems.filter(item => item.attentionResult === 'hit' || item.attentionResult === 'miss');
  const scores = quizItems.map(item => Number(item.score)).filter(Number.isFinite);
  const progressSummary = summarizeLearningProgress(progressSnap?.docs || [], start, end, courseId);
  const videos = summarizeVideoRows(videoItems);
  const quizzes = summarizeQuizRows(quizItems);
  const attentionHits = attentionItems.filter(item => item.attentionResult === 'hit').length;
  const attentionMisses = attentionItems.filter(item => item.attentionResult === 'miss').length;
  const completionBonusMisses = attentionItems.filter(item => item.attentionSource === 'completion_bonus' && item.attentionResult === 'miss').length;
  const timeAttackMisses = attentionItems.filter(item => item.attentionSource === 'time_attack' && item.attentionResult === 'miss').length;
  const attentionOpportunities = attentionHits + attentionMisses;

  const attention = {
    hits: attentionHits,
    misses: attentionMisses,
    opportunities: attentionOpportunities,
    timeAttackHits: attentionItems.filter(item => item.attentionSource === 'time_attack' && item.attentionResult === 'hit').length,
    timeAttackMisses,
    completionBonusHits: attentionItems.filter(item => item.attentionSource === 'completion_bonus' && item.attentionResult === 'hit').length,
    completionBonusMisses,
  };
  const load = buildLearningLoadSummary({
    courseId,
    videos,
    quizzes,
    dataLogs: dataLogItems,
    inProgressQuizzes: progressSummary.inProgressQuizzes,
    attention,
    readingActivityCount: readingItems.length,
  });
  const hasElementaryReadingOnly = isElementary && readingItems.length > 0 && !load.hasMathPlatformActivity;

  return {
    allActivityCount: allItems.length,
    activityCount: items.length,
    mathActivityCount: mathItems.length,
    readingActivityCount: readingItems.length,
    quizCount: quizItems.length,
    readingQuizCount: readingQuizItems.length,
    videoCount: videos.length,
    dataLogCount: dataLogItems.length,
    inProgressQuizCount: progressSummary.inProgressQuizzes.length,
    averageScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
    focusScore: attentionOpportunities ? Math.round((attentionHits / attentionOpportunities) * 100) : null,
    attention,
    learningLoad: load,
    videos,
    progressVideos: progressSummary.videos,
    quizzes,
    readingQuizzes: summarizeQuizRows(readingQuizItems),
    dataLogs: dataLogItems.map(item => ({
      title: titleOf(item),
      timestamp: timestampToJson(item.timestamp),
    })),
    inProgressQuizzes: progressSummary.inProgressQuizzes,
    concernSignals: [
      hasElementaryReadingOnly ? `초등수학 수학 학습 기록 없음: 독서/읽기 활동 ${readingItems.length}건만 확인` : '',
      load.platformCompletionRatio != null && load.level !== '충분' ? `기준 학습량 대비 ${load.level}: 영상 ${load.videoMinutes}분 / 기준 ${load.platformTargetMinutes}분` : '',
      load.balanceSignals.includes('영상/개념 학습 대비 퀴즈 기록 없음') ? '영상/개념 학습 후 퀴즈 기록 없음' : '',
      attentionOpportunities && attentionHits === 0 ? `집중도 광석 ${attentionHits}/${attentionOpportunities} 획득` : '',
      timeAttackMisses ? `타임어택 ${timeAttackMisses}회 놓침` : '',
      completionBonusMisses ? `완료 보너스 ${completionBonusMisses}회 놓침` : '',
      progressSummary.inProgressQuizzes.length ? `진행 중 퀴즈 ${progressSummary.inProgressQuizzes.map(item => `${item.title} ${item.answeredCount}/${item.totalCount}`).join(', ')}` : '',
    ].filter(Boolean),
    titles: [...new Set([...items.map(titleOf), ...progressSummary.inProgressQuizzes.map(item => item.title)].filter(Boolean))].slice(0, 10),
    progressTitles: [...new Set(progressSummary.videos.map(item => item.title).filter(Boolean))].slice(0, 10),
    allTitles: [...new Set(allItems.map(titleOf).filter(Boolean))].slice(0, 12),
    recent: items
      .sort((a, b) => toMillis(b.timestamp) - toMillis(a.timestamp))
      .slice(0, 8)
      .map(item => ({
        type: item.type || '',
        title: item.title || item.unitTitle || item.chapterTitle || '',
        score: item.score ?? null,
        timestamp: timestampToJson(item.timestamp),
      })),
  };
}

async function getDarkMatterSummary(uid) {
  if (!uid) return { count: 0, items: [] };
  const [incorrectSnap, marksSnap] = await Promise.all([
    db.collection('users').doc(uid).collection('incorrect_questions').limit(10).get().catch(() => null),
    db.collection('users').doc(uid).collection('review_marks').where('status', '==', 'active').limit(10).get().catch(() => null),
  ]);

  const items = [];
  incorrectSnap?.forEach(doc => {
    const data = doc.data();
    items.push({
      source: 'incorrect',
      id: doc.id,
      label: data.conceptTag || data.quizTitle || data.unitTitle || data.chapterTitle || doc.id,
      lastSeenAt: timestampToJson(data.lastFailedAt || data.updatedAt || data.createdAt),
    });
  });
  marksSnap?.forEach(doc => {
    const data = doc.data();
    items.push({
      source: 'review_mark',
      id: doc.id,
      label: data.conceptTag || data.quizTitle || data.unitTitle || data.chapterTitle || doc.id,
      lastSeenAt: timestampToJson(data.updatedAt || data.createdAt),
    });
  });

  for (const item of items) {
    const quizSnap = await db.collection('quizzes').doc(item.id).get().catch(() => null);
    if (!quizSnap?.exists) continue;
    const quiz = quizSnap.data();
    item.unitTitle = quiz.unitTitle || item.label || '';
    item.conceptTag = quiz.conceptTag || quiz.category || '';
    item.questionPreview = String(quiz.question || '').slice(0, 160);
    item.label = item.unitTitle || item.conceptTag || item.label;
  }

  return {
    count: items.length,
    concepts: [...new Set(items.map(item => item.conceptTag || item.unitTitle || item.label).filter(Boolean))].slice(0, 8),
    items: items.slice(0, 10),
  };
}

function previousFor(current, allAssignments) {
  const currentTime = toMillis(current.submittedAt) || toMillis(current.createdAt) || new Date(current.date || 0).getTime();
  return allAssignments
    .filter(item => item.id !== current.id)
    .filter(item => courseKey(item) === courseKey(current))
    .filter(item => {
      const time = toMillis(item.submittedAt) || toMillis(item.createdAt) || new Date(item.date || 0).getTime();
      return !currentTime || !time || time <= currentTime;
    })
    .sort((a, b) => (toMillis(b.submittedAt) || toMillis(b.createdAt)) - (toMillis(a.submittedAt) || toMillis(a.createdAt)))
    .slice(0, 5)
    .map(item => ({
      id: item.id,
      date: item.date,
      status: item.status,
      content: item.content.slice(0, 350),
      feedback: (item.feedback || item.aiFeedbackDraft || '').slice(0, 350),
      feedbackResponse: item.feedbackResponse || null,
      feedbackReaction: item.feedbackReaction || '',
      feedbackComment: item.feedbackComment || '',
      attachmentNames: item.attachments.map(att => att.name).filter(Boolean),
    }));
}

async function main() {
  const pendingSnap = await db.collection('assignments').where('status', '==', 'submitted').get();
  const pending = pendingSnap.docs.map(compactAssignment)
    .sort((a, b) => (toMillis(a.submittedAt) || toMillis(a.createdAt)) - (toMillis(b.submittedAt) || toMillis(b.createdAt)));

  const userCache = new Map();
  const assignmentsCache = new Map();
  const contexts = [];

  for (const assignment of pending) {
    if (!userCache.has(assignment.userId)) {
      userCache.set(assignment.userId, await getUser(assignment.userId));
    }
    if (!assignmentsCache.has(assignment.userId)) {
      assignmentsCache.set(assignment.userId, await getUserAssignments(assignment.userId));
    }

    const allAssignments = assignmentsCache.get(assignment.userId);
    const date = assignment.date || toDateText(assignment.submittedAt) || toDateText(assignment.createdAt);
    const [learningSummary, darkMatterSummary] = await Promise.all([
      getLearningSummary(assignment.userId, date, assignment.clusterId || assignment.regionId || assignment.clusterName),
      getDarkMatterSummary(assignment.userId),
    ]);

    contexts.push({
      assignment,
      student: userCache.get(assignment.userId),
      displayName: userCache.get(assignment.userId).studentName || assignment.userName || userCache.get(assignment.userId).publicDisplayName || userCache.get(assignment.userId).name || userCache.get(assignment.userId).displayName || '학생',
      courseLabel: assignment.clusterName || assignment.clusterId || assignment.regionId || '과정',
      previous: previousFor(assignment, allAssignments),
      sameDay: allAssignments
        .filter(item => item.id !== assignment.id)
        .filter(item => (item.date || toDateText(item.submittedAt)) === date)
        .map(item => ({
          id: item.id,
          courseLabel: item.clusterName || item.clusterId || item.regionId || '',
          status: item.status,
          content: item.content.slice(0, 160),
        })),
      learningSummary,
      darkMatterSummary,
    });
  }

  writeFileSync(outPath, JSON.stringify({ exportedAt: new Date().toISOString(), count: contexts.length, contexts }, null, 2));
  console.log(`exported ${contexts.length} pending assignment contexts to ${outPath}`);
}

main().then(() => process.exit(0)).catch(error => {
  console.error(error);
  process.exit(1);
});
