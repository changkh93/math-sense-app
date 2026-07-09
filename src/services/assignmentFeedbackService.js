import {
  Timestamp,
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';

const CLUSTER_LABELS = {
  python: 'Python',
  'middle-math': '중등수학',
  cluster_elementary: '초등수학',
  'western-classic': '서양고전',
};

const COURSE_TARGET_MINUTES = {
  python: 50,
  'middle-math': 50,
  cluster_elementary: 20,
};

const STYLE_CONFIG = {
  gentle: {
    label: '부드럽게',
    tone: '자신감이 낮은 학생도 기분 좋게 받아들일 수 있도록 따뜻하고 격려 중심',
    length: '학생용 6~8문장',
  },
  balanced: {
    label: '보통',
    tone: '따뜻하지만 구체적이고 다음 행동이 분명한 일반 피드백',
    length: '학생용 6~8문장',
  },
  strict: {
    label: '엄격하게',
    tone: '반복 누락이나 반복 오류를 명확히 짚되 낙인 없이 행동 기준을 제시',
    length: '학생용 6~8문장',
  },
  parent: {
    label: '학부모용',
    tone: '기술 세부보다 학습 태도, 변화, 다음 지도 포인트 중심',
    length: '학부모용 5~7문장',
  },
  short: {
    label: '학생용 짧게',
    tone: '학생이 바로 읽고 실행할 수 있게 간결하고 행동 중심',
    length: '학생용 4~5문장',
  },
};

export function getAssignmentFeedbackStyle(styleKey = 'balanced') {
  return STYLE_CONFIG[styleKey] || STYLE_CONFIG.balanced;
}

function normalizeClusterId(clusterId = '') {
  const value = normalizeText(clusterId);
  if (value === '초등수학' || value === 'cluster_elementary' || value === 'ratios') return 'cluster_elementary';
  if (value === '파이썬' || value === 'python') return 'python';
  if (value === '중등수학' || value === 'middle-math') return 'middle-math';
  if (value === '서양고전' || value === 'western-classic') return 'western-classic';
  return value || 'unknown';
}

// 학습 기록의 한글 제목/unitId가 NFD(분해 자모)로 저장되는 경우가 있다.
// 정규식 매칭 전에 반드시 NFC로 정규화하지 않으면 "함수/방정식" 같은 키워드가 매칭되지 않아
// 과정이 unknown으로 분류되고 학습 기록이 누락된다.
const normalizeText = (text = '') => String(text || '').normalize('NFC');

const KNOWN_CLUSTER_IDS = new Set(['cluster_elementary', 'middle-math', 'python', 'western-classic']);
function normalizeKnownClusterId(value = '') {
  const normalized = normalizeClusterId(value);
  return KNOWN_CLUSTER_IDS.has(normalized) ? normalized : '';
}

// unitId는 "reg_1774698354292_chap_..._unit_..." 형태다. 맨 앞의 reg_ segment가 region ID이며,
// regions/{regId}.clusterId 에 정확한 과정이 들어 있다. learning_progress 문서는 clusterId 필드가
// 없기 때문에 이 region 역조회로 과정을 정한다(정규식 오탐 방지).
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

// region clusterId 캐시. 한 피드백 생성 호출 안에서 같은 region을 여러 번 조회하지 않도록.
const regionClusterCache = new Map();
async function fetchRegionClusterId(regionId = '') {
  if (!regionId) return '';
  if (regionClusterCache.has(regionId)) return regionClusterCache.get(regionId);
  let clusterId = '';
  try {
    const snap = await getDoc(doc(db, 'regions', regionId));
    clusterId = normalizeText(snap.exists() ? (snap.data().clusterId || '') : '');
  } catch (error) {
    void error;
  }
  regionClusterCache.set(regionId, clusterId);
  return clusterId;
}

// 동기 분류: 명시적 clusterId/courseId/regionId 필드가 있으면 그걸 쓴다.
function learningItemCourseId(item = {}) {
  const explicit = normalizeKnownClusterId(item.clusterId)
    || normalizeKnownClusterId(item.courseId)
    || normalizeKnownClusterId(item.regionId);
  if (explicit) return explicit;
  return 'unknown';
}

const chapterCourseCache = new Map();
async function fetchChapterCourseId(chapterId = '') {
  const normalizedChapterId = normalizeText(chapterId);
  if (!normalizedChapterId) return '';
  if (chapterCourseCache.has(normalizedChapterId)) return chapterCourseCache.get(normalizedChapterId);

  let courseId = '';
  try {
    const snap = await getDoc(doc(db, 'chapters', normalizedChapterId));
    if (snap.exists()) {
      const data = snap.data();
      courseId = normalizeKnownClusterId(data.clusterId)
        || normalizeKnownClusterId(data.courseId)
        || normalizeKnownClusterId(data.regionId);
      if (!courseId && data.regionId) {
        courseId = normalizeKnownClusterId(await fetchRegionClusterId(data.regionId));
      }
    }
  } catch (error) {
    void error;
  }

  chapterCourseCache.set(normalizedChapterId, courseId);
  return courseId;
}

const unitCourseCache = new Map();
async function fetchUnitCourseId(unitId = '') {
  const normalizedUnitId = normalizeText(unitId);
  if (!normalizedUnitId) return '';
  if (unitCourseCache.has(normalizedUnitId)) return unitCourseCache.get(normalizedUnitId);

  let courseId = '';
  try {
    const snap = await getDoc(doc(db, 'units', normalizedUnitId));
    if (snap.exists()) {
      const data = snap.data();
      courseId = normalizeKnownClusterId(data.clusterId)
        || normalizeKnownClusterId(data.courseId)
        || normalizeKnownClusterId(data.regionId);
      if (!courseId && data.regionId) {
        courseId = normalizeKnownClusterId(await fetchRegionClusterId(data.regionId));
      }
      if (!courseId && data.chapterId) {
        courseId = await fetchChapterCourseId(data.chapterId);
      }
    }
  } catch (error) {
    void error;
  }

  unitCourseCache.set(normalizedUnitId, courseId);
  return courseId;
}

// 비동기 분류: 학습 row가 가리키는 unit/chapter/region 문서를 역추적해 정확한 clusterId를 구한다.
// learning_progress처럼 clusterId 필드가 없는 문서도 제목/unitId 정규식 추론 없이 과정 메타데이터로 분류한다.
async function resolveLearningItemCourseId(item = {}) {
  const explicit = normalizeKnownClusterId(item.clusterId)
    || normalizeKnownClusterId(item.courseId)
    || normalizeKnownClusterId(item.codeTrace?.clusterId)
    || normalizeKnownClusterId(item.codeTrace?.courseId);
  if (explicit) return explicit;
  const regionAlias = normalizeKnownClusterId(item.regionId);
  if (regionAlias) return regionAlias;

  const unitCourse = await fetchUnitCourseId(item.unitId || item.id);
  if (unitCourse) return unitCourse;

  const chapterCourse = await fetchChapterCourseId(item.chapterId || item.codeTrace?.chapterId || '');
  if (chapterCourse) return chapterCourse;

  const explicitRegionId = normalizeText(item.regionId);
  const regionId = explicitRegionId || regionIdFromUnitLikeId(item.unitId) || regionIdFromUnitLikeId(item.id);
  if (regionId) {
    const clusterId = await fetchRegionClusterId(regionId);
    if (clusterId) return normalizeClusterId(clusterId);
  }
  return learningItemCourseId(item);
}

// 초등수학 과제인데 제출문/제목이 중등수학 내용을 말하면 레벨업 학생으로 의심한다.
// 이 경우 같은 날짜의 중등수학(middle-math) 학습 기록을 초등수학 과제의 수학 학습으로 인정한다.
// 제출문 한글도 NFD로 입력될 수 있으므로 매칭 전 NFC 정규화한다.
function hasMiddleMathLevelUpSignal(text = '') {
  return /중등|방정식|부등식|등식|함수|다항식|곱셈공식|제곱근|소인수분해|완전제곱|이차|유리수|정수|절댓값|기하/i.test(normalizeText(text));
}

function belongsToCourse(item = {}, courseId = '', options = {}) {
  const target = normalizeClusterId(courseId);
  if (!target || target === 'unknown') return true;
  const itemCourse = learningItemCourseId(item);
  if (itemCourse === target) return true;
  // 초등수학 과제 + 레벨업 옵션이면 같은 날짜 중등수학 기록도 포함한다.
  return target === 'cluster_elementary'
    && options.includeMiddleMathLevelUp === true
    && itemCourse === 'middle-math';
}

// 비동기 버전: learning_progress처럼 clusterId 필드가 없는 문서는 region 역조회로 정확한
// 과정을 구한 뒤 비교한다. 정규식 오탐(하다솜/조승아 사례)을 원천 차단한다.
async function belongsToCourseAsync(item = {}, courseId = '', options = {}) {
  const target = normalizeClusterId(courseId);
  if (!target || target === 'unknown') return true;
  const itemCourse = await resolveLearningItemCourseId(item);
  if (itemCourse === target) return true;
  return target === 'cluster_elementary'
    && options.includeMiddleMathLevelUp === true
    && itemCourse === 'middle-math';
}

// 학습 row 목록을 과정 필터로 거른다. 각 row의 과정을 region 역조회로 정확히 정한다.
// Promise.all로 병렬 처리하고 region 캐시로 중복 조회를 막는다.
async function filterRowsByCourse(rows = [], courseId = '', options = {}) {
  const results = await Promise.all(
    rows.map((row) => belongsToCourseAsync(row, courseId, options).then((ok) => ({ row, ok })))
  );
  return results.filter((r) => r.ok).map((r) => r.row);
}

function getTimestampMs(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  return 0;
}

function getDateKey(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
  const date = value?.toDate ? value.toDate() : value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}

function getCourseTargetMinutes(clusterId) {
  return COURSE_TARGET_MINUTES[normalizeClusterId(clusterId)] || 50;
}

function secondsFromLearningRow(row = {}) {
  const seconds = Number(row.videoTime ?? row.seconds ?? row.durationSeconds ?? 0);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
}

function dateRangeForKst(dateStr) {
  if (!dateStr) return null;
  return {
    start: Timestamp.fromDate(new Date(`${dateStr}T00:00:00+09:00`)),
    end: Timestamp.fromDate(new Date(`${dateStr}T23:59:59.999+09:00`)),
  };
}

function classifyAttachment(attachment = {}) {
  const name = attachment.name || attachment.fileName || attachment.url || '첨부파일';
  const extension = (attachment.type || name.split('.').pop() || '').toLowerCase();
  const url = attachment.url || '';

  let category = 'file';
  if (['py', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'md', 'txt', 'csv'].includes(extension)) {
    category = 'code';
  } else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) {
    category = 'image';
  } else if (['pdf', 'doc', 'docx', 'ppt', 'pptx'].includes(extension)) {
    category = 'document';
  } else if (url.includes('colab.research.google.com') || name.endsWith('.ipynb')) {
    category = 'notebook';
  }

  return {
    name,
    type: extension || category,
    category,
    summary: `${name} (${category})`,
    url,
  };
}

function extractStudentQuestions(text = '') {
  const source = String(text || '').trim();
  if (!source) return [];

  const candidates = source
    .split(/(?<=[.?？!！])\s+|\n+/)
    .map((part) => part.trim())
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

  const questions = candidates.filter((part) => questionPatterns.some((pattern) => pattern.test(part)));
  if (questions.length) return questions.slice(0, 5);

  return source.includes('?')
    ? source.split('?').slice(0, 5).map((part) => `${part.trim()}?`).filter((part) => part.length > 1)
    : [];
}

function summarizeAssignment(assignment = {}) {
  const attachments = (assignment.attachments || []).map(classifyAttachment);
  const content = String(assignment.content || '');
  const studentQuestions = extractStudentQuestions(content);
  return {
    id: assignment.id,
    date: assignment.date || getDateKey(assignment.submittedAt),
    status: assignment.status || 'unknown',
    content: content.slice(0, 900),
    contentLength: content.trim().length,
    studentQuestions,
    hasStudentQuestion: studentQuestions.length > 0,
    attachmentCount: attachments.length,
    attachments,
    attachmentNames: attachments.map((att) => att.name),
    links: (assignment.links || []).map((link) => link.url || link.title || '').filter(Boolean).slice(0, 5),
    feedback: String(assignment.feedback || '').slice(0, 600),
    feedbackReaction: assignment.feedbackReaction || assignment.feedbackResponse?.reaction || '',
    feedbackComment: String(assignment.feedbackComment || assignment.feedbackResponse?.comment || '').slice(0, 300),
    bonusCrystals: assignment.bonusCrystals || 0,
    revisionCount: assignment.revisionCount || 0,
    submittedAtMs: getTimestampMs(assignment.submittedAt),
  };
}

async function fetchStudentProfile(userId) {
  if (!userId) return null;
  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    name: data.studentName || data.publicDisplayName || data.displayName || data.name || '',
    email: data.email || '',
    streak: data.streak || data.currentStreak || 0,
    crewId: data.crewId || '',
  };
}

async function fetchAssignmentHistory(assignment) {
  if (!assignment?.userId) return { previous: [], sameDay: [] };

  const snap = await getDocs(query(collection(db, 'assignments'), where('userId', '==', assignment.userId)));
  const currentCluster = normalizeClusterId(assignment.clusterId);
  const currentDate = assignment.date || getDateKey(assignment.submittedAt);
  const currentSubmittedMs = getTimestampMs(assignment.submittedAt) || Date.now();

  const all = snap.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((item) => item.id !== assignment.id);

  const sameDay = all
    .filter((item) => (item.date || getDateKey(item.submittedAt)) === currentDate)
    .sort((a, b) => getTimestampMs(a.submittedAt) - getTimestampMs(b.submittedAt))
    .map(summarizeAssignment);

  const previous = all
    .filter((item) => normalizeClusterId(item.clusterId) === currentCluster)
    .filter((item) => {
      const itemDate = item.date || getDateKey(item.submittedAt);
      const itemSubmittedMs = getTimestampMs(item.submittedAt);
      if (itemDate && currentDate && itemDate !== currentDate) return itemDate < currentDate;
      return itemSubmittedMs && itemSubmittedMs < currentSubmittedMs;
    })
    .sort((a, b) => {
      const dateCompare = String(b.date || getDateKey(b.submittedAt)).localeCompare(String(a.date || getDateKey(a.submittedAt)));
      if (dateCompare !== 0) return dateCompare;
      return getTimestampMs(b.submittedAt) - getTimestampMs(a.submittedAt);
    })
    .slice(0, 5)
    .map(summarizeAssignment);

  return { previous, sameDay };
}

// learning_progress 문서에서 해당 날짜의 진행 중 퀴즈와 부분 시청 영상을 추출한다.
// history 컬렉션은 '완료'된 활동만 남기는 경향이 있어, 퀴즈를 끝까지 풀지 않은 경우
// learning_progress에만 진행 상태가 남는다. 이를 빼면 학습 기록이 0건으로 잘못 잡힌다.
async function summarizeLearningProgress(progressDocs, startMs, endMs, courseId, options = {}) {
  const videos = [];
  const inProgressQuizzes = [];
  const inProgressCodeTraces = [];

  // 각 문서의 과정을 region 역조회로 정확히 정한 뒤 필터링한다(정규식 오탐 방지).
  const filtered = await filterRowsByCourse(
    progressDocs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
    courseId,
    options
  );
  const filteredIds = new Set(filtered.map((item) => item.id));

  progressDocs.forEach((docSnap) => {
    if (!filteredIds.has(docSnap.id)) return;
    const data = docSnap.data();
    const unitId = docSnap.id;

    const updatedAtMs = getTimestampMs(data.updatedAt);
    Object.entries(data.videoProgress || {}).forEach(([transmissionId, progress]) => {
      const progressMs = getTimestampMs(progress.updatedAt) || updatedAtMs;
      if (!progressMs || progressMs < startMs || progressMs > endMs) return;
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
        updatedAtMs: progressMs,
      });
    });

    const session = data.quizSession;
    if (updatedAtMs && updatedAtMs >= startMs && updatedAtMs <= endMs && session?.currentIdx > 0) {
      const answers = Object.values(session.userAnswers || {});
      const correctCount = answers.filter((answer) => answer?.isCorrect === true).length;
      const incorrectCount = answers.filter((answer) => answer?.isCorrect === false).length;
      inProgressQuizzes.push({
        unitId,
        title: normalizeText(data.unitTitle || session.quizTitle || unitId),
        answeredCount: answers.length || session.currentIdx || 0,
        currentIdx: session.currentIdx || 0,
        totalCount: session.originalTotal || session.totalCount || 0,
        correctCount,
        incorrectCount,
        updatedAtMs,
      });
    }

    const codeTrace = data.codeTrace;
    const codeTraceUpdatedAtMs = getTimestampMs(codeTrace?.updatedAt) || updatedAtMs;
    const completedExerciseCount = Number(codeTrace?.completedExerciseCount || 0);
    if (
      codeTraceUpdatedAtMs
      && codeTraceUpdatedAtMs >= startMs
      && codeTraceUpdatedAtMs <= endMs
      && completedExerciseCount > 0
      && codeTrace?.completed !== true
    ) {
      inProgressCodeTraces.push({
        unitId,
        title: normalizeText(data.unitTitle || unitId),
        completedExerciseCount,
        totalExerciseCount: Number(codeTrace.totalExerciseCount || 0),
        bestAccuracy: Number(codeTrace.bestAccuracy || 0),
        lastExerciseId: codeTrace.lastExerciseId || '',
        lastMode: codeTrace.lastMode || '',
        updatedAtMs: codeTraceUpdatedAtMs,
      });
    }
  });

  return { videos, inProgressQuizzes, inProgressCodeTraces };
}

async function fetchLearningSummary(userId, dateStr, courseId = '', options = {}) {
  const range = dateRangeForKst(dateStr);
  if (!userId || !range) {
    return {
      date: dateStr || '',
      activityCount: 0,
      quizCount: 0,
      videoCount: 0,
      textCount: 0,
      averageScore: null,
      titles: [],
      focusScore: null,
      codeTraceCount: 0,
      codeTraceProgressCount: 0,
      codeTraces: [],
      inProgressCodeTraces: [],
    };
  }

  const [historySnap, progressSnap] = await Promise.all([
    getDocs(query(
      collection(db, 'users', userId, 'history'),
      where('timestamp', '>=', range.start),
      where('timestamp', '<=', range.end)
    )),
    // learning_progress는 진행 중 퀴즈/부분 시청 영상을 잡기 위해 전체 문서를 읽는다.
    // (날짜 필터는 문서 내부의 updatedAt/quizSession으로 적용한다.)
    getDocs(collection(db, 'users', userId, 'learning_progress')).catch(() => ({ docs: [] })),
  ]);

  const startMs = range.start.toMillis();
  const endMs = range.end.toMillis();
  const allRows = historySnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

  // 초등수학 과제에서 레벨업 예외 적용 여부를 실제 데이터로도 확인한다.
  // 제출문 키워드 신호(호출부)가 없더라도, 같은 날짜에 middle-math history가 있으면
  // 초등수학을 마치고 중등수학으로 넘어간 학생으로 보고 레벨업 기록을 인정한다.
  // 각 row의 과정은 region 역조회로 정확히 정한다(정규식 오탐 방지).
  const allResolved = await Promise.all(
    allRows.map((row) => resolveLearningItemCourseId(row).then((course) => ({ row, course })))
  );
  let includeMiddleMathLevelUp = options.includeMiddleMathLevelUp === true;
  if (!includeMiddleMathLevelUp && normalizeClusterId(courseId) === 'cluster_elementary') {
    includeMiddleMathLevelUp = allResolved.some((item) => item.course === 'middle-math');
  }
  const mergedOptions = { ...options, includeMiddleMathLevelUp };

  // region 역조회로 정확한 과정을 구한 뒤 필터링한다.
  const rows = allResolved
    .filter(({ row, course }) => belongsToCourse({ ...row, clusterId: course }, courseId, mergedOptions))
    .map(({ row }) => row);
  const codeTraceRows = rows.filter((row) => row.type === 'code_trace');
  // 퀴즈 배틀은 점수 체계(0~1500, 정답x100)가 일반 퀴즈(0~100)와 다르므로 별도로 분리한다.
  // 분리하지 않으면 배틀 점수가 averageScore를 오염시킨다.
  const battleRows = rows.filter((row) => row.type === 'quiz_battle');
  const quizRows = rows.filter((row) => !['video', 'video_complete', 'text', 'data_log_read', 'attention', 'code_trace', 'quiz_battle'].includes(row.type || 'quiz_pass'));
  const videoRows = rows.filter((row) => ['video', 'video_complete', 'recovery_mastery'].includes(row.type));
  const textRows = rows.filter((row) => ['text', 'data_log_read'].includes(row.type));
  const dataLogRows = rows.filter((row) => row.type === 'data_log_read');
  const attentionRows = rows.filter((row) => row.attentionResult === 'hit' || row.attentionResult === 'miss');
  // averageScore는 일반 퀴즈 점수(0~100)만으로 계산한다. 배틀 점수(0~1500)는 제외.
  const scoreRows = quizRows.map((row) => Number(row.score)).filter(Number.isFinite);
  const battleAssessment = assessBattleLearning(battleRows);
  const titleSet = new Set(rows.map((row) => normalizeText(row.unitTitle || row.transmissionTitle || row.regionTitle)).filter(Boolean));

  // learning_progress에서 진행 중 퀴즈/부분 시청 영상을 추가로 추출한다.
  // history에는 완료된 활동만 남으므로, 이걸 빼면 학습 중인 기록이 0건으로 누락된다.
  const progressSummary = await summarizeLearningProgress(
    progressSnap?.docs || [], startMs, endMs, courseId, mergedOptions
  );
  const inProgressQuizzes = progressSummary.inProgressQuizzes;
  const progressVideos = progressSummary.videos;
  const inProgressCodeTraces = progressSummary.inProgressCodeTraces;

  const videoSeconds = videoRows.reduce((sum, row) => sum + secondsFromLearningRow(row), 0)
    + progressVideos.reduce((sum, item) => sum + (item.seconds || 0), 0);
  // 진행 중 퀴즈도 활동/퀴즈 카운트에 반영한다.
  const combinedQuizCount = quizRows.length + inProgressQuizzes.length;
  for (const item of inProgressQuizzes) titleSet.add(item.title);
  for (const item of progressVideos) titleSet.add(item.title);
  for (const row of codeTraceRows) titleSet.add(normalizeText(row.unitTitle || row.regionTitle || row.title || 'CODE TRACE'));
  for (const item of inProgressCodeTraces) titleSet.add(item.title);

  return {
    date: dateStr,
    courseId: normalizeClusterId(courseId),
    allActivityCount: allRows.length,
    activityCount: rows.length + inProgressQuizzes.length + progressVideos.length + inProgressCodeTraces.length,
    quizCount: combinedQuizCount,
    inProgressQuizCount: inProgressQuizzes.length,
    videoCount: videoRows.length + progressVideos.length,
    videoSeconds,
    videoMinutes: Math.round((videoSeconds / 60) * 10) / 10,
    textCount: textRows.length,
    dataLogCount: dataLogRows.length,
    codeTraceCount: codeTraceRows.length,
    codeTraceProgressCount: inProgressCodeTraces.length,
    averageScore: scoreRows.length ? Math.round(scoreRows.reduce((sum, score) => sum + score, 0) / scoreRows.length) : null,
    titles: Array.from(titleSet).slice(0, 8),
    videos: [
      ...videoRows.slice(0, 6).map((row) => ({
        title: normalizeText(row.unitTitle || row.transmissionTitle || row.regionTitle || '영상 학습'),
        seconds: secondsFromLearningRow(row),
        completed: true,
      })),
      ...progressVideos.slice(0, 6).map((item) => ({
        title: item.title,
        seconds: item.seconds,
        completed: item.completed,
      })),
    ],
    progressVideos: progressVideos.map((item) => ({ title: item.title, seconds: item.seconds, completed: item.completed })),
    quizzes: quizRows.slice(0, 6).map((row) => ({
      title: normalizeText(row.unitTitle || row.quizTitle || row.regionTitle || '퀴즈'),
      score: Number.isFinite(Number(row.score)) ? Number(row.score) : null,
      type: row.type || 'quiz',
    })),
    codeTraces: codeTraceRows.slice(0, 6).map((row) => ({
      unitId: row.unitId || '',
      title: normalizeText(row.unitTitle || row.regionTitle || row.title || 'CODE TRACE'),
      accuracy: row.accuracy ?? row.score ?? null,
      completedExerciseCount: row.completedExerciseCount ?? null,
      totalExerciseCount: row.totalExerciseCount ?? null,
      crystalsEarned: row.crystalsEarned || 0,
      completed: true,
    })),
    inProgressQuizzes: inProgressQuizzes.map((item) => ({
      title: item.title,
      answeredCount: item.answeredCount,
      currentIdx: item.currentIdx,
      totalCount: item.totalCount,
      correctCount: item.correctCount,
      incorrectCount: item.incorrectCount,
    })),
    inProgressCodeTraces: inProgressCodeTraces.map((item) => ({
      title: item.title,
      completedExerciseCount: item.completedExerciseCount,
      totalExerciseCount: item.totalExerciseCount,
      bestAccuracy: item.bestAccuracy,
      lastExerciseId: item.lastExerciseId,
      lastMode: item.lastMode,
    })),
    dataLogs: dataLogRows.slice(0, 6).map((row) => ({
      title: normalizeText(row.unitTitle || row.transmissionTitle || row.regionTitle || '데이터 로그'),
    })),
    excludedOtherCourseTitles: Array.from(new Set(allResolved
      .filter(({ row, course }) => !belongsToCourse({ ...row, clusterId: course }, courseId, mergedOptions))
      .map(({ row }) => row)
      .map((row) => normalizeText(row.unitTitle || row.transmissionTitle || row.quizTitle || row.regionTitle))
      .filter(Boolean))).slice(0, 6),
    includesMiddleMathLevelUp: includeMiddleMathLevelUp,
    focusScore: attentionRows.length
      ? Math.round((attentionRows.filter((row) => row.attentionResult === 'hit').length / attentionRows.length) * 100)
      : null,
  };
}

async function fetchDarkMatterSummary(userId) {
  if (!userId) {
    return { totalActive: 0, recentWeaknesses: [], reviewMarked: [], items: [] };
  }

  const [incorrectSnap, reviewSnap] = await Promise.all([
    getDocs(query(collection(db, 'users', userId, 'incorrect_questions'), orderBy('lastFailedAt', 'desc'), limit(8))),
    getDocs(query(collection(db, 'users', userId, 'review_marks'), where('status', '==', 'active'), limit(8))),
  ]);

  const incorrect = incorrectSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data(), source: 'incorrect' }));
  const review = reviewSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data(), source: 'review' }));
  const ids = Array.from(new Set([...incorrect, ...review].map((item) => item.id).filter(Boolean))).slice(0, 10);
  const quizMap = {};

  for (let i = 0; i < ids.length; i += 30) {
    const chunk = ids.slice(i, i + 30);
    if (!chunk.length) continue;
    const quizSnap = await getDocs(query(collection(db, 'quizzes'), where(documentId(), 'in', chunk)));
    quizSnap.docs.forEach((docSnap) => {
      quizMap[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
    });
  }

  const items = ids.map((id) => {
    const meta = incorrect.find((item) => item.id === id) || review.find((item) => item.id === id) || {};
    const quiz = quizMap[id] || {};
    return {
      id,
      source: meta.source || 'unknown',
      unitId: quiz.unitId || meta.unitId || '',
      unitTitle: quiz.unitTitle || meta.unitTitle || '',
      conceptTag: quiz.conceptTag || meta.conceptTag || quiz.category || '',
      questionPreview: String(quiz.question || '').slice(0, 160),
      lastFailedAtMs: getTimestampMs(meta.lastFailedAt),
    };
  });

  const recentWeaknesses = Array.from(new Set(items.map((item) => item.unitTitle || item.conceptTag || item.unitId).filter(Boolean))).slice(0, 5);
  const reviewMarked = items.filter((item) => item.source === 'review').map((item) => item.unitTitle || item.conceptTag || item.unitId).filter(Boolean).slice(0, 5);

  return {
    totalActive: ids.length,
    recentWeaknesses,
    reviewMarked,
    items,
  };
}

function buildEvidence(context) {
  const evidence = [];
  const { currentSubmission, previousSubmissions, sameDaySubmissions, dailyLearningSummary, darkMatterSummary } = context;
  const includesLevelUp = context.includesMiddleMathLevelUp === true;

  if (currentSubmission.attachmentCount > 0) {
    evidence.push(`이번 제출물에 첨부파일 ${currentSubmission.attachmentCount}개가 포함됨: ${currentSubmission.attachments.map((att) => att.name).join(', ')}`);
  }
  if (currentSubmission.contentLength >= 80) {
    evidence.push(`제출 글이 ${currentSubmission.contentLength}자로, 학습 내용을 설명하려는 흔적이 있음`);
  }
  if (currentSubmission.studentQuestions?.length) {
    evidence.push(`학생 질문 확인: ${currentSubmission.studentQuestions.join(' / ')}`);
  }
  if (previousSubmissions.length > 0) {
    evidence.push(`같은 과정의 최근 과제 ${previousSubmissions.length}건과 비교 가능`);
  }
  const previousResponses = previousSubmissions.filter((item) => item.feedbackReaction || item.feedbackComment);
  if (previousResponses.length > 0) {
    evidence.push(`이전 피드백에 대한 학생 반응 ${previousResponses.length}건 확인`);
  }
  if (sameDaySubmissions.length > 0) {
    evidence.push(`같은 날짜에 다른 과제 ${sameDaySubmissions.length}건도 제출되어 일괄 제출 맥락 확인 필요`);
  }
  if (includesLevelUp) {
    // 초등수학 과제에서 중등수학 레벨업 기록을 수학 학습으로 인정한 경우.
    evidence.push(`초등수학 과제 시간에 레벨업 학습으로 중등수학을 진행한 기록 ${dailyLearningSummary.activityCount}건을 수학 학습으로 인정함`);
  } else if (dailyLearningSummary.activityCount > 0) {
    evidence.push(`제출일 ${context.student.courseLabel} 학습 기록 ${dailyLearningSummary.activityCount}건 확인`);
  } else if (dailyLearningSummary.allActivityCount > 0) {
    evidence.push(`같은 날짜 다른 과정 기록 ${dailyLearningSummary.allActivityCount}건은 확인되지만 ${context.student.courseLabel} 기록은 없음`);
  }
  if ((dailyLearningSummary.codeTraceCount || 0) > 0) {
    evidence.push(`CODE TRACE 완료 ${dailyLearningSummary.codeTraceCount}건 확인`);
  }
  if ((dailyLearningSummary.codeTraceProgressCount || 0) > 0) {
    evidence.push(`진행 중 CODE TRACE ${dailyLearningSummary.codeTraceProgressCount}건 확인`);
  }
  if (currentSubmission.codeComparison?.summary) {
    evidence.push(currentSubmission.codeComparison.summary);
  }
  if (darkMatterSummary.totalActive > 0) {
    evidence.push(`최근 다크 매터/재검토 문항 ${darkMatterSummary.totalActive}개 확인`);
  }
  if (evidence.length === 0) {
    evidence.push('현재 제출 내용과 첨부 목록을 중심으로 피드백을 생성함');
  }

  return evidence;
}

function buildFeedbackPolicyGuidance(context) {
  const courseId = normalizeClusterId(context?.student?.courseId);
  const targetMinutes = getCourseTargetMinutes(courseId);
  const learning = context?.dailyLearningSummary || {};
  const submission = context?.currentSubmission || {};
  const videoMinutes = Number(learning.videoMinutes || 0);
  const hasLearningFollowUpActivity = Boolean(
    (learning.quizCount || 0) > 0 ||
    (learning.dataLogCount || 0) > 0 ||
    (learning.codeTraceCount || 0) > 0 ||
    (learning.codeTraceProgressCount || 0) > 0
  );
  const hasCodeTraceActivity = Boolean((learning.codeTraceCount || 0) > 0 || (learning.codeTraceProgressCount || 0) > 0);
  const hasSubmissionEvidence = Boolean(
    (submission.attachmentCount || 0) > 0 ||
    (submission.contentLength || 0) >= 80 ||
    submission.codeComparison?.currentCodeAvailable
  );
  const hasCourseLearningRecord = Boolean(
    videoMinutes > 0 ||
    hasLearningFollowUpActivity
  );
  const isVeryLowLearning = !hasCourseLearningRecord || (videoMinutes < Math.max(1, targetMinutes * 0.1) && !hasLearningFollowUpActivity);
  const isReasonableFlow = (videoMinutes >= targetMinutes * 0.45 && hasLearningFollowUpActivity) || hasCodeTraceActivity;

  return {
    targetMinutes,
    videoMinutes,
    hasLearningFollowUpActivity,
    hasCodeTraceActivity,
    hasSubmissionEvidence,
    hasCourseLearningRecord,
    isVeryLowLearning,
    isReasonableFlow,
    includesMiddleMathLevelUp: context?.includesMiddleMathLevelUp === true,
    rules: [
      '영상 시간은 전체 학습 시간이 아니다. 학생은 영상을 멈추고 풀이, 코드 작성, 실행, 수정, 정리를 할 수 있다.',
      '영상 시간이 기준의 절반 안팎이고 퀴즈, 데이터 로그, 코드 제출, 제출문 정리 중 하나 이상이 있으면 성실한 학습 흐름으로 인정한다.',
      'Python 과제에서 CODE TRACE 완료/진행 기록은 영상/퀴즈와 다른 코드 실습 근거로 인정한다.',
      '영상 시간 숫자만으로 "기준 학습량 대비 부족"이라고 쓰지 않는다.',
      '이미 퀴즈, 데이터 로그, CODE TRACE가 있으면 "퀴즈나 데이터 로그까지 이어가라"는 개선 문구를 쓰지 않는다.',
      '개선점은 오답 이유 한 줄 정리, 코드 실행 결과, 직접 바꾼 코드 설명처럼 실제로 비어 있는 근거에서 고른다.',
      'Python은 영상 시청보다 직접 코드 작성, 실행, 오류 수정, 실행 결과 근거를 더 중요하게 본다.',
      '초등수학 과제에서 초등수학을 마친 학생이 레벨업 학습으로 중등수학을 진행한 경우, 같은 날짜 중등수학 퀴즈/영상/데이터 로그를 초등수학 과제의 수학 학습으로 인정한다. 이 경우 "수학 기록 없음"이나 "학습 기록 없음"으로 판단하지 않고 "초등수학 시간에 레벨업 학습으로 중등수학을 진행했다"고 표현한다.',
    ],
  };
}

async function fetchCodeAttachmentText(attachment) {
  if (!attachment?.url || attachment.category !== 'code') return attachment;
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

function normalizeCodeLines(text = '') {
  return String(text)
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

function buildCodeComparison(currentAttachments = [], previousSubmissions = []) {
  const currentCode = currentAttachments.find((attachment) => attachment.category === 'code' && attachment.textPreview);
  const previousCodeCandidates = previousSubmissions
    .flatMap((submission) => (submission.attachments || []).map((attachment) => ({ submission, attachment })))
    .filter(({ attachment }) => attachment.category === 'code' && attachment.textPreview);
  const previousWithSameFileName = currentCode
    ? previousCodeCandidates.find(({ attachment }) => attachment.name === currentCode.name)
    : null;
  const previousWithCode = previousWithSameFileName || previousCodeCandidates[0];

  if (!currentCode) {
    return {
      currentCodeAvailable: false,
      previousCodeAvailable: Boolean(previousWithCode),
      summary: currentAttachments.some((attachment) => attachment.category === 'code')
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
  const addedLines = [...currentLines].filter((line) => !previousLines.has(line));
  const removedLines = [...previousLines].filter((line) => !currentLines.has(line));
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

export async function buildAssignmentFeedbackContext(assignment, styleKey = 'balanced') {
  const date = assignment?.date || getDateKey(assignment?.submittedAt);
  const courseId = normalizeClusterId(assignment?.clusterId || assignment?.regionId || assignment?.clusterName);
  // 초등수학 과제인데 제출문/제목이 중등수학 내용을 말하면, 같은 날짜 중등수학 레벨업 기록을
  // 초등수학 과제의 수학 학습으로 인정한다(레벨업 예외). 그렇지 않으면 단일 과정 필터.
  const includeMiddleMathLevelUp = courseId === 'cluster_elementary'
    && hasMiddleMathLevelUpSignal(`${assignment?.title || ''} ${assignment?.content || ''}`);
  const [student, assignmentHistory, dailyLearningSummary, darkMatterSummary] = await Promise.all([
    fetchStudentProfile(assignment?.userId),
    fetchAssignmentHistory(assignment),
    fetchLearningSummary(assignment?.userId, date, courseId, { includeMiddleMathLevelUp }),
    fetchDarkMatterSummary(assignment?.userId),
  ]);

  const attachments = await enrichCodeAttachments((assignment?.attachments || []).map(classifyAttachment));
  const previousSubmissions = await Promise.all((assignmentHistory.previous || []).map(async (item) => ({
    ...item,
    attachments: await enrichCodeAttachments(item.attachments || []),
  })));
  const codeComparison = buildCodeComparison(attachments, previousSubmissions);
  const submissionContent = String(assignment?.content || '');
  const studentQuestions = extractStudentQuestions(submissionContent);
  const context = {
    student: {
      id: assignment?.userId || '',
      name: student?.name || assignment?.userName || '학생',
      courseId,
      courseLabel: CLUSTER_LABELS[courseId] || assignment?.clusterId || '과정',
      streak: student?.streak || 0,
    },
    currentSubmission: {
      assignmentId: assignment?.id || '',
      date,
      submittedAt: getTimestampMs(assignment?.submittedAt),
      status: assignment?.status || 'submitted',
      content: submissionContent.slice(0, 1500),
      contentLength: submissionContent.trim().length,
      studentQuestions,
      hasStudentQuestion: studentQuestions.length > 0,
      attachments,
      codeAttachments: attachments
        .filter((attachment) => attachment.category === 'code')
        .map((attachment) => ({
          name: attachment.name,
          lineCount: attachment.lineCount || 0,
          fetchStatus: attachment.fetchStatus || '',
          fetchError: attachment.fetchError || '',
          textPreview: attachment.textPreview || '',
        })),
      codeComparison,
      attachmentCount: attachments.length,
      links: (assignment?.links || []).map((link) => link.url || link.title || '').filter(Boolean).slice(0, 8),
      revisionCount: assignment?.revisionCount || 0,
      notebookSummary: assignment?.notebookData ? {
        title: assignment.notebookData.title || '',
        cellCount: assignment.notebookData.cells?.length || assignment.notebookData.cellCount || 0,
      } : null,
    },
    dailyLearningSummary,
    darkMatterSummary,
    previousSubmissions,
    sameDaySubmissions: assignmentHistory.sameDay,
    // 초등수학 과제에서 중등수학 레벨업 기록을 수학 학습으로 인정했는지 여부.
    // 제출문 키워드뿐 아니라 실제 history에 middle-math 기록이 있어도 인정한다.
    // evidence/policy/fallback에서 "기록 없음"으로 단정하지 않도록 참고한다.
    includesMiddleMathLevelUp: Boolean(dailyLearningSummary.includesMiddleMathLevelUp)
      && (dailyLearningSummary.activityCount || 0) > 0,
    feedbackGoal: getAssignmentFeedbackStyle(styleKey),
  };

  context.feedbackPolicyGuidance = buildFeedbackPolicyGuidance(context);

  return {
    ...context,
    evidence: buildEvidence(context),
  };
}

export function createFallbackAssignmentFeedback(context, styleKey = 'balanced') {
  const studentName = context?.student?.name || '학생';
  const courseLabel = context?.student?.courseLabel || '과정';
  const submission = context?.currentSubmission || {};
  const hasAttachments = (submission.attachmentCount || 0) > 0;
  const previous = context?.previousSubmissions || [];
  const darkMatter = context?.darkMatterSummary || {};
  const learning = context?.dailyLearningSummary || {};
  const policy = context?.feedbackPolicyGuidance || {};
  const firstAttachment = submission.attachments?.[0]?.name;
  const weakness = darkMatter.recentWeaknesses?.[0];
  const studentQuestions = submission.studentQuestions || [];
  const codeTraceNote = (learning.codeTraceCount || 0) > 0
    ? `CODE TRACE 완료 ${learning.codeTraceCount}건`
    : (learning.codeTraceProgressCount || 0) > 0
      ? `진행 중 CODE TRACE ${learning.codeTraceProgressCount}건`
      : '';
  const questionSection = studentQuestions.length
    ? `\n\n#### 질문에 대한 답변\n${studentQuestions.map((question) => `- ${question}`).join('\n')}\n\n이 질문은 교사가 정확한 풀이 맥락을 확인해 답변해야 합니다. 현재 자동 초안에서는 질문을 누락하지 않도록 표시만 해두었습니다.`
    : '';
  const previousPoint = previous.length > 0
    ? '이전 과제 기록과 비교해 이번 제출에서 유지하거나 개선할 부분을 확인할 수 있습니다.'
    : '아직 비교할 과제 기록이 많지 않으므로, 이번 제출이 앞으로의 성장 기준점이 됩니다.';

  const learningFlowNote = policy.isReasonableFlow
    ? codeTraceNote
      ? `${codeTraceNote}${learning.videoMinutes ? `과 영상 ${learning.videoMinutes}분` : ''}${learning.quizCount ? `, 퀴즈 ${learning.quizCount}건` : ''}${learning.dataLogCount ? `, 데이터 로그 ${learning.dataLogCount}건` : ''}이 확인되어, 코드를 손으로 따라 쓰는 확인 활동까지 남았습니다.`
      : `영상 ${learning.videoMinutes}분에 ${learning.quizCount ? `퀴즈 ${learning.quizCount}건` : ''}${learning.quizCount && learning.dataLogCount ? ', ' : ''}${learning.dataLogCount ? `데이터 로그 ${learning.dataLogCount}건` : ''}${!learning.quizCount && !learning.dataLogCount && hasAttachments ? '제출 자료' : ''}까지 이어진 점을 보면, 단순히 영상만 본 기록은 아닙니다.`
    : '';

  const improvement = weakness
    ? `${weakness}와 연결되는 부분은 다음 과제에서 한 번 더 의식해 보세요.`
    : policy.isReasonableFlow
      ? '다음 제출에서는 퀴즈에서 틀린 이유나 코드/풀이에서 막힌 부분을 한 줄 더 적어 주세요.'
    : '다음 제출에서는 결과를 확인한 과정이나 막혔던 부분을 한 줄 더 적어 보세요.';
  const noCourseLearningNote = policy.isVeryLowLearning
    ? `제출일에 ${courseLabel} 학습 기록은 확인되지 않습니다.`
    : '';
  const codeComparisonNote = submission.codeComparison?.summary
    ? `${submission.codeComparison.summary}.`
    : '';
  const codeReviewNote = submission.codeComparison?.isIdenticalToPrevious
    ? `${codeComparisonNote} 이번 제출에서 새로 개선된 코드 변화는 확인되지 않습니다.`
    : codeComparisonNote;

  const feedback = styleKey === 'parent'
    ? `### 과제 피드백\n\n${studentName} 학생은 ${courseLabel} 과제에서 ${submission.content ? '학습 내용을 글로 정리해 제출했습니다' : '과제를 제출했습니다'}. ${hasAttachments ? `첨부파일(${firstAttachment}${submission.attachmentCount > 1 ? ` 외 ${submission.attachmentCount - 1}개` : ''})도 함께 제출되어 결과 확인 근거가 있습니다.` : '다만 결과를 확인할 첨부 자료는 더 보강하면 좋겠습니다.'} ${learningFlowNote || (learning.activityCount ? `제출일에는 학습 기록 ${learning.activityCount}건도 확인되어 과제와 학습 흐름을 함께 볼 수 있습니다.` : '제출일 학습 기록은 많지 않아 과제 수행 과정을 더 남기면 좋겠습니다.')} ${previousPoint} ${improvement}`
    : `### 과제 피드백\n\n이번 ${courseLabel} 과제에서는 ${submission.content ? '배운 내용을 직접 정리해 제출했습니다' : '과제를 제출했습니다'}. ${noCourseLearningNote}\n\n#### 잘한 점\n${codeReviewNote || learningFlowNote || (hasAttachments ? `제출 글과 함께 ${submission.attachmentCount}개의 첨부파일을 올린 점이 좋습니다. 결과물을 함께 남기면 무엇을 만들었는지 더 분명하게 확인할 수 있습니다.` : '과제를 제출한 흐름 자체는 좋습니다. 다음에는 실행 결과나 풀이 과정을 확인할 수 있는 자료까지 함께 남기면 더 좋아집니다.')}${questionSection}\n\n#### 이전보다 좋아진 점\n${submission.codeComparison?.isIdenticalToPrevious ? '같은 파일명 기준으로 이전 코드와 비교했지만, 이번 제출에서 새로 늘어난 코드나 구조 변화는 확인되지 않았습니다.' : previousPoint}\n\n#### 더 발전시키면 좋은 점\n${policy.isVeryLowLearning ? `${courseLabel} 학습 기록이 없어 코드가 어떤 과정을 거쳐 작성됐는지 확인하기 어렵습니다. 다음 제출에서는 실행 결과와 직접 바꾼 코드 2곳을 함께 적어 주세요.` : improvement}`;

  return {
    studentFeedback: feedback,
    parentSummary: '',
    strengths: hasAttachments ? ['제출물과 첨부 자료를 함께 남김'] : ['과제 제출 흐름을 유지함'],
    improvements: [improvement],
    studentQuestionAnswer: studentQuestions.length ? '학생 질문이 감지되었습니다. 교사가 정확한 풀이 맥락을 확인해 답변해야 합니다.' : '',
    nextMission: '',
    comparisonWithPrevious: previousPoint,
    evidence: context?.evidence || buildEvidence(context),
    rubricScores: {
      submissionCompleteness: hasAttachments ? 3 : 2,
      requirementMatch: 2,
      conceptApplication: learning.activityCount > 0 ? 2 : 1,
      resultVerification: hasAttachments ? 3 : 1,
      feedbackReflection: previous.length > 0 ? 2 : 1,
      weaknessRecovery: weakness ? 1 : 2,
      selfDirection: submission.contentLength >= 120 ? 2 : 1,
    },
    suggestedStatus: policy.isVeryLowLearning ? 'needs_revision' : hasAttachments || submission.contentLength >= 80 ? 'reviewed' : 'needs_revision',
    suggestedBonusCrystals: policy.isVeryLowLearning ? (submission.codeComparison?.currentCodeAvailable ? 20 : 10) : policy.isReasonableFlow ? 35 : hasAttachments ? 40 : 25,
    revisionRequest: hasAttachments ? '' : '이번 과제는 제출 글은 확인되지만 결과를 확인할 첨부 자료가 부족합니다. 실행 결과 이미지나 풀이 과정을 함께 첨부해 다시 제출해 주세요.',
    generatedBy: 'local-fallback',
  };
}

export async function saveAssignmentAiFeedback(assignmentId, payload) {
  if (!assignmentId) return;
  await setDoc(doc(db, 'assignments', assignmentId), {
    aiFeedbackDraft: payload.studentFeedback || '',
    aiFeedbackPayload: payload,
    aiFeedbackEvidence: payload.evidence || [],
    aiFeedbackRubricScores: payload.rubricScores || {},
    aiFeedbackGeneratedAt: serverTimestamp(),
    aiFeedbackUpdatedAt: serverTimestamp(),
  }, { merge: true });
}
