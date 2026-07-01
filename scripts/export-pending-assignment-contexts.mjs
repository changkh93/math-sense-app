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

// 학습 기록의 한글 제목/unitId가 NFD(분해 자모)로 저장되는 경우가 있다.
// 정규식 매칭 전에 반드시 NFC로 정규화하지 않으면 "함수/방정식" 같은 키워드가 매칭되지 않아
// 과정이 unknown으로 분류되고 학습 기록이 누락된다.
const normalizeText = (value = '') => String(value || '').normalize('NFC');

const KNOWN_COURSE_IDS = new Set(['cluster_elementary', 'middle-math', 'python']);
function normalizeKnownCourseId(value = '') {
  const normalized = normalizeCourseId(value);
  return KNOWN_COURSE_IDS.has(normalized) ? normalized : '';
}

function normalizeCourseId(value = '') {
  const text = normalizeText(value);
  if (text === '초등수학' || text === 'cluster_elementary' || text === 'ratios') return 'cluster_elementary';
  if (text === '중등수학' || text === 'middle-math') return 'middle-math';
  if (text === '파이썬' || text === 'python') return 'python';
  return text || 'unknown';
}

function inferCourseFromUnitId(unitId = '') {
  const text = normalizeText(unitId);
  if (/python|gameproj|sprite|pygame/i.test(text)) return 'python';
  if (/ratio|ratios/i.test(text)) return 'cluster_elementary';
  if (/middle|geo|algebra|equation|chap_177392/i.test(text)) return 'middle-math';
  return '';
}

function inferCourseFromTitle(title = '') {
  const text = normalizeText(title);
  if (/python|파이썬|pygame|sprite|add_sound|sound|몬스터|플레이어|게임|코드/i.test(text)) return 'python';
  // 중등수학을 초등수학보다 먼저 검사한다. "유리수와 순환소수"처럼 중등 단원인데
  // "소수" 키워드가 겹쳐 초등으로 오탐되는 것을 막기 위해서다(하다솜 사례).
  // "함수"/"등식"/"정수"처럼 초등·파이썬에서도 등장하는 모호한 단어는 단독 키워드에서 뺀다.
  // 대신 중등 전용 단원명과 단원평가/기말/기출/학년 같은 평가 키워드로 분류한다.
  if (/중등|방정식|부등식|다항식|곱셈공식|기하|유리수|무리수|소인수분해|제곱근|거듭제곱|순환소수|절댓값|경우의\s*수|확률|통계|피타고라스|삼각비|무게중심|내심|외심|닮음|일차함수|이차함수|이차방정식|연립방정식|부등식의\s*해|기말|중간\s*평가|단원\s*평가|기출|평가\s*[0-9]+회|[0-9]학년/i.test(text)) return 'middle-math';
  if (/비와\s*비율|초등|자연수|분수|소수|비례|비율|축척|나누기|곱하기|묶음|등분제|포함제/i.test(text)) return 'cluster_elementary';
  return '';
}

function hasMiddleMathLevelUpSignal(text = '') {
  return /중등|방정식|부등식|등식|함수|다항식|곱셈공식|제곱근|소인수분해|완전제곱|이차|유리수|정수|절댓값|기하/i.test(normalizeText(text));
}

// unitId는 "reg_1774698354292_chap_..._unit_..." 형태다. 맨 앞의 reg_ segment가 region ID이며,
// regions/{regId}.clusterId 에 정확한 과정이 들어 있다. learning_progress 문서는 clusterId 필드가
// 없기 때문에 이 region 역조회로 과정을 정한다(정규식 오탐 방지, 하다솜/조승아 사례).
function regionIdFromUnitLikeId(id = '') {
  const text = normalizeText(id);
  if (!text) return '';
  const beforeChapter = text.match(/^(.*?)_chap(?:_|$)/);
  if (beforeChapter?.[1]) return beforeChapter[1];
  const generatedRegion = text.match(/^(reg_\d+)/);
  if (generatedRegion?.[1]) return generatedRegion[1];
  if (text.startsWith('ratios_')) return 'ratios';
  return '';
}

// region clusterId 캐시. 한 export 실행 안에서 같은 region을 여러 번 조회하지 않도록.
const regionClusterCache = new Map();
async function fetchRegionClusterId(regionId = '') {
  if (!regionId) return '';
  if (regionClusterCache.has(regionId)) return regionClusterCache.get(regionId);
  let clusterId = '';
  try {
    const snap = await db.collection('regions').doc(regionId).get();
    clusterId = normalizeText(snap.exists ? (snap.data().clusterId || '') : '');
  } catch (error) {
    void error;
  }
  regionClusterCache.set(regionId, clusterId);
  return clusterId;
}

function shouldIncludeCourse(itemCourse = '', normalizedCourseId = '', options = {}) {
  if (!normalizedCourseId || normalizedCourseId === 'unknown') return true;
  if (itemCourse === normalizedCourseId) return true;
  return normalizedCourseId === 'cluster_elementary'
    && options.includeMiddleMathLevelUp === true
    && itemCourse === 'middle-math';
}

function itemCourseId(item = {}) {
  const explicit = normalizeKnownCourseId(item.clusterId)
    || normalizeKnownCourseId(item.courseId)
    || normalizeKnownCourseId(item.regionId);
  if (explicit) return explicit;
  return normalizeCourseId(
    inferCourseFromUnitId(item.unitId || '')
    || inferCourseFromTitle(`${titleOf(item)} ${item.quizTitle || ''}`)
  );
}

// 비동기 분류: region 역조회로 정확한 clusterId를 구한다. learning_progress처럼 clusterId 필드가
// 없는 문서에서 정규식 오탐 없이 과정을 정한다. region 역조회가 안 되면 폴백으로 itemCourseId.
async function resolveItemCourseId(item = {}) {
  const explicit = normalizeKnownCourseId(item.clusterId) || normalizeKnownCourseId(item.courseId);
  if (explicit) return explicit;
  const regionAlias = normalizeKnownCourseId(item.regionId);
  if (regionAlias) return regionAlias;

  const explicitRegionId = normalizeText(item.regionId);
  const regionId = explicitRegionId || regionIdFromUnitLikeId(item.unitId) || regionIdFromUnitLikeId(item.id);
  if (regionId) {
    const clusterId = await fetchRegionClusterId(regionId);
    if (clusterId) return normalizeCourseId(clusterId);
  }
  return itemCourseId(item);
}

// 학습 row 목록을 과정 필터로 거른다. 각 row의 과정을 region 역조회로 정확히 정한다.
async function filterItemsByCourse(items = [], courseId = '', options = {}) {
  const normalized = normalizeCourseId(courseId);
  const resolved = await Promise.all(
    items.map((item) => resolveItemCourseId(item).then((itemCourse) => ({ item, itemCourse })))
  );
  return resolved.filter(({ itemCourse }) => shouldIncludeCourse(itemCourse, normalized, options)).map(({ item }) => item);
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

async function summarizeLearningProgress(progressDocs, start, end, courseId, options = {}) {
  const videos = [];
  const inProgressQuizzes = [];

  // 각 문서의 과정을 region 역조회로 정확히 정한 뒤 필터링한다(정규식 오탐 방지).
  const filtered = await filterItemsByCourse(
    progressDocs.map(doc => ({ id: doc.id, ...doc.data() })),
    courseId,
    options
  );
  const filteredIds = new Set(filtered.map(item => item.id));

  progressDocs.forEach(doc => {
    if (!filteredIds.has(doc.id)) return;
    const data = doc.data();
    const unitId = doc.id;
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
        title: normalizeText(progress.transmissionTitle || data.unitTitle || unitId),
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
        title: normalizeText(data.unitTitle || session.quizTitle || unitId),
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

function normalizeCodeLines(text = '') {
  return String(text)
    .split(/\r\n|\r|\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
}

async function fetchCodeAttachmentText(attachment = {}) {
  if (!attachment?.url || !['py', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'md', 'txt'].includes(attachment.type)) {
    return attachment;
  }

  try {
    const response = await fetch(attachment.url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    return {
      ...attachment,
      fetchStatus: 'ok',
      textPreview: text.slice(0, 12000),
      lineCount: text.split(/\r\n|\r|\n/).length,
      charCount: text.length,
    };
  } catch (error) {
    return {
      ...attachment,
      fetchStatus: 'failed',
      fetchError: error?.message || '첨부 코드 원문을 읽지 못했습니다.',
    };
  }
}

async function enrichCodeAttachments(attachments = []) {
  return Promise.all(attachments.map(fetchCodeAttachmentText));
}

function buildCodeComparison(currentAttachments = [], previousSubmissions = []) {
  const currentCode = currentAttachments.find(attachment => attachment.textPreview);
  const previousCodeCandidates = previousSubmissions
    .flatMap(submission => (submission.attachments || []).map(attachment => ({ submission, attachment })))
    .filter(({ attachment }) => attachment.textPreview);
  const previousWithSameFileName = currentCode
    ? previousCodeCandidates.find(({ attachment }) => attachment.name === currentCode.name)
    : null;
  const previousWithCode = previousWithSameFileName || previousCodeCandidates[0];

  if (!currentCode) {
    return {
      currentCodeAvailable: false,
      previousCodeAvailable: Boolean(previousWithCode),
      summary: currentAttachments.some(attachment => ['py', 'js', 'jsx', 'ts', 'tsx', 'html', 'css'].includes(attachment.type))
        ? '첨부 코드 파일은 있으나 원문을 읽지 못해 코드 변화 비교가 필요함'
        : '',
    };
  }

  if (!previousWithCode) {
    return {
      currentCodeAvailable: true,
      previousCodeAvailable: false,
      currentFileName: currentCode.name,
      currentLineCount: currentCode.lineCount || 0,
      summary: `첨부 코드 ${currentCode.name} 원문 ${currentCode.lineCount || 0}줄 확인, 비교 가능한 이전 코드 첨부는 없음`,
    };
  }

  const currentLines = new Set(normalizeCodeLines(currentCode.textPreview));
  const previousLines = new Set(normalizeCodeLines(previousWithCode.attachment.textPreview));
  const addedLines = [...currentLines].filter(line => !previousLines.has(line));
  const removedLines = [...previousLines].filter(line => !currentLines.has(line));
  const isIdenticalToPrevious = addedLines.length === 0 && removedLines.length === 0;

  return {
    currentCodeAvailable: true,
    previousCodeAvailable: true,
    comparedSameFileName: Boolean(previousWithSameFileName),
    isIdenticalToPrevious,
    currentFileName: currentCode.name,
    previousFileName: previousWithCode.attachment.name,
    previousAssignmentId: previousWithCode.submission.id,
    previousDate: previousWithCode.submission.date || '',
    currentLineCount: currentCode.lineCount || 0,
    previousLineCount: previousWithCode.attachment.lineCount || 0,
    addedLineCount: addedLines.length,
    removedLineCount: removedLines.length,
    addedLineSamples: addedLines.slice(0, 8),
    removedLineSamples: removedLines.slice(0, 6),
    summary: isIdenticalToPrevious
      ? `첨부 코드 ${currentCode.name}는 ${previousWithCode.submission.date || '이전 제출'}의 ${previousWithCode.attachment.name}와 코드 내용이 동일함`
      : `첨부 코드 ${currentCode.name}를 이전 ${previousWithCode.attachment.name}와 비교: 새 줄 ${addedLines.length}개, 삭제/변경 줄 ${removedLines.length}개`,
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

async function getLearningSummary(uid, date, courseId = '', options = {}) {
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

  // 초등수학 과제에서 레벨업 예외 적용 여부를 실제 데이터로도 확인한다.
  // 제출문 키워드 신호(호출부)가 없더라도, 같은 날짜에 middle-math history가 있으면
  // 초등수학을 마치고 중등수학으로 넘어간 학생으로 보고 레벨업 기록을 인정한다.
  // 각 item의 과정은 region 역조회로 정확히 정한다(정규식 오탐 방지).
  const allResolved = await Promise.all(
    allItems.map(item => resolveItemCourseId(item).then(itemCourse => ({ item, itemCourse })))
  );
  let includeMiddleMathLevelUp = options.includeMiddleMathLevelUp === true;
  if (!includeMiddleMathLevelUp && normalizeCourseId(courseId) === 'cluster_elementary') {
    includeMiddleMathLevelUp = allResolved.some(entry => entry.itemCourse === 'middle-math');
  }
  const mergedOptions = { ...options, includeMiddleMathLevelUp };

  const normalizedCourseId = normalizeCourseId(courseId);
  const items = allResolved
    .filter(({ itemCourse }) => shouldIncludeCourse(itemCourse, normalizedCourseId, mergedOptions))
    .map(({ item }) => item);
  const isElementary = normalizeCourseId(courseId) === 'cluster_elementary';
  const readingItems = isElementary ? items.filter(isReadingRelatedItem) : [];
  const mathItems = isElementary ? items.filter(item => !isReadingRelatedItem(item)) : items;
  const quizItems = mathItems.filter(item => !['video', 'video_complete', 'recovery_mastery', 'text', 'data_log_read', 'attention'].includes(item.type || 'quiz'));
  const readingQuizItems = readingItems.filter(item => !['video', 'video_complete', 'recovery_mastery', 'text', 'data_log_read', 'attention'].includes(item.type || 'quiz'));
  const videoItems = mathItems.filter(item => ['video', 'video_complete', 'recovery_mastery', 'attention'].includes(item.type) || item.attentionResult === 'hit' || item.attentionResult === 'miss');
  const dataLogItems = mathItems.filter(item => ['text', 'data_log_read'].includes(item.type));
  const attentionItems = mathItems.filter(item => item.attentionResult === 'hit' || item.attentionResult === 'miss');
  const scores = quizItems.map(item => Number(item.score)).filter(Number.isFinite);
  const progressSummary = await summarizeLearningProgress(progressSnap?.docs || [], start, end, courseId, mergedOptions);
  const videos = summarizeVideoRows(videoItems);
  const allVideos = [...videos, ...progressSummary.videos];
  const quizzes = summarizeQuizRows(quizItems);
  const progressActivityCount = progressSummary.inProgressQuizzes.length + progressSummary.videos.length;
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
    videos: allVideos,
    quizzes,
    dataLogs: dataLogItems,
    inProgressQuizzes: progressSummary.inProgressQuizzes,
    attention,
    readingActivityCount: readingItems.length,
  });
  const hasElementaryReadingOnly = isElementary && readingItems.length > 0 && !load.hasMathPlatformActivity;

  return {
    allActivityCount: allItems.length,
    activityCount: items.length + progressActivityCount,
    mathActivityCount: mathItems.length + progressActivityCount,
    readingActivityCount: readingItems.length,
    quizCount: quizItems.length + progressSummary.inProgressQuizzes.length,
    readingQuizCount: readingQuizItems.length,
    videoCount: allVideos.length,
    dataLogCount: dataLogItems.length,
    inProgressQuizCount: progressSummary.inProgressQuizzes.length,
    averageScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
    focusScore: attentionOpportunities ? Math.round((attentionHits / attentionOpportunities) * 100) : null,
    attention,
    learningLoad: load,
    videos: allVideos,
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
    titles: [...new Set([
      ...items.map(titleOf),
      ...progressSummary.inProgressQuizzes.map(item => item.title),
      ...progressSummary.videos.map(item => item.title),
    ].filter(Boolean))].slice(0, 10),
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
      attachments: item.attachments.map(att => ({
        name: att.name || '',
        type: att.type || '',
        url: att.url || '',
      })),
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
    const currentAttachments = await enrichCodeAttachments(assignment.attachments || []);
    const previous = await Promise.all(previousFor(assignment, allAssignments).map(async item => ({
      ...item,
      attachments: await enrichCodeAttachments(item.attachments || []),
    })));
    const codeComparison = buildCodeComparison(currentAttachments, previous);
    const assignmentWithCode = {
      ...assignment,
      attachments: currentAttachments,
      codeAttachments: currentAttachments
        .filter(item => item.textPreview || ['py', 'js', 'jsx', 'ts', 'tsx', 'html', 'css'].includes(item.type))
        .map(item => ({
          name: item.name,
          lineCount: item.lineCount || 0,
          fetchStatus: item.fetchStatus || '',
          fetchError: item.fetchError || '',
          textPreview: item.textPreview || '',
        })),
      codeComparison,
    };
    const courseId = assignment.clusterId || assignment.regionId || assignment.clusterName;
    const includeMiddleMathLevelUp = normalizeCourseId(courseId) === 'cluster_elementary'
      && hasMiddleMathLevelUpSignal(`${assignment.title || ''} ${assignment.content || ''}`);
    const [learningSummary, darkMatterSummary] = await Promise.all([
      getLearningSummary(assignment.userId, date, courseId, { includeMiddleMathLevelUp }),
      getDarkMatterSummary(assignment.userId),
    ]);

    contexts.push({
      assignment: assignmentWithCode,
      student: userCache.get(assignment.userId),
      displayName: userCache.get(assignment.userId).studentName || assignment.userName || userCache.get(assignment.userId).publicDisplayName || userCache.get(assignment.userId).name || userCache.get(assignment.userId).displayName || '학생',
      courseLabel: assignment.clusterName || assignment.clusterId || assignment.regionId || '과정',
      previous,
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
