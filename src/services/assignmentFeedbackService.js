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
  if (clusterId === '초등수학' || clusterId === 'cluster_elementary') return 'cluster_elementary';
  if (clusterId === '파이썬' || clusterId === 'python') return 'python';
  if (clusterId === '중등수학' || clusterId === 'middle-math') return 'middle-math';
  if (clusterId === '서양고전' || clusterId === 'western-classic') return 'western-classic';
  return clusterId || 'unknown';
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

async function fetchLearningSummary(userId, dateStr) {
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
    };
  }

  const historySnap = await getDocs(query(
    collection(db, 'users', userId, 'history'),
    where('timestamp', '>=', range.start),
    where('timestamp', '<=', range.end)
  ));

  const rows = historySnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  const quizRows = rows.filter((row) => !['video', 'video_complete', 'text', 'data_log_read', 'attention'].includes(row.type || 'quiz_pass'));
  const videoRows = rows.filter((row) => ['video', 'video_complete', 'recovery_mastery'].includes(row.type));
  const textRows = rows.filter((row) => ['text', 'data_log_read'].includes(row.type));
  const dataLogRows = rows.filter((row) => row.type === 'data_log_read');
  const attentionRows = rows.filter((row) => row.attentionResult === 'hit' || row.attentionResult === 'miss');
  const scoreRows = quizRows.map((row) => Number(row.score)).filter(Number.isFinite);
  const titleSet = new Set(rows.map((row) => row.unitTitle || row.transmissionTitle || row.regionTitle).filter(Boolean));
  const videoSeconds = videoRows.reduce((sum, row) => sum + secondsFromLearningRow(row), 0);

  return {
    date: dateStr,
    activityCount: rows.length,
    quizCount: quizRows.length,
    videoCount: videoRows.length,
    videoSeconds,
    videoMinutes: Math.round((videoSeconds / 60) * 10) / 10,
    textCount: textRows.length,
    dataLogCount: dataLogRows.length,
    averageScore: scoreRows.length ? Math.round(scoreRows.reduce((sum, score) => sum + score, 0) / scoreRows.length) : null,
    titles: Array.from(titleSet).slice(0, 8),
    videos: videoRows.slice(0, 6).map((row) => ({
      title: row.unitTitle || row.transmissionTitle || row.regionTitle || '영상 학습',
      seconds: secondsFromLearningRow(row),
    })),
    quizzes: quizRows.slice(0, 6).map((row) => ({
      title: row.unitTitle || row.quizTitle || row.regionTitle || '퀴즈',
      score: Number.isFinite(Number(row.score)) ? Number(row.score) : null,
      type: row.type || 'quiz',
    })),
    dataLogs: dataLogRows.slice(0, 6).map((row) => ({
      title: row.unitTitle || row.transmissionTitle || row.regionTitle || '데이터 로그',
    })),
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
  if (dailyLearningSummary.activityCount > 0) {
    evidence.push(`제출일 학습 기록 ${dailyLearningSummary.activityCount}건 확인`);
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
  const hasFollowUpActivity = Boolean(
    (learning.quizCount || 0) > 0 ||
    (learning.dataLogCount || 0) > 0 ||
    (submission.attachmentCount || 0) > 0 ||
    (submission.contentLength || 0) >= 80
  );
  const isVeryLowLearning = videoMinutes < Math.max(1, targetMinutes * 0.1) && !hasFollowUpActivity;
  const isReasonableFlow = videoMinutes >= targetMinutes * 0.45 && hasFollowUpActivity;

  return {
    targetMinutes,
    videoMinutes,
    hasFollowUpActivity,
    isVeryLowLearning,
    isReasonableFlow,
    rules: [
      '영상 시간은 전체 학습 시간이 아니다. 학생은 영상을 멈추고 풀이, 코드 작성, 실행, 수정, 정리를 할 수 있다.',
      '영상 시간이 기준의 절반 안팎이고 퀴즈, 데이터 로그, 코드 제출, 제출문 정리 중 하나 이상이 있으면 성실한 학습 흐름으로 인정한다.',
      '영상 시간 숫자만으로 "기준 학습량 대비 부족"이라고 쓰지 않는다.',
      '이미 퀴즈나 데이터 로그가 있으면 "퀴즈나 데이터 로그까지 이어가라"는 개선 문구를 쓰지 않는다.',
      '개선점은 오답 이유 한 줄 정리, 코드 실행 결과, 직접 바꾼 코드 설명처럼 실제로 비어 있는 근거에서 고른다.',
      'Python은 영상 시청보다 직접 코드 작성, 실행, 오류 수정, 실행 결과 근거를 더 중요하게 본다.',
    ],
  };
}

export async function buildAssignmentFeedbackContext(assignment, styleKey = 'balanced') {
  const date = assignment?.date || getDateKey(assignment?.submittedAt);
  const [student, assignmentHistory, dailyLearningSummary, darkMatterSummary] = await Promise.all([
    fetchStudentProfile(assignment?.userId),
    fetchAssignmentHistory(assignment),
    fetchLearningSummary(assignment?.userId, date),
    fetchDarkMatterSummary(assignment?.userId),
  ]);

  const attachments = (assignment?.attachments || []).map(classifyAttachment);
  const submissionContent = String(assignment?.content || '');
  const studentQuestions = extractStudentQuestions(submissionContent);
  const context = {
    student: {
      id: assignment?.userId || '',
      name: student?.name || assignment?.userName || '학생',
      courseId: normalizeClusterId(assignment?.clusterId),
      courseLabel: CLUSTER_LABELS[normalizeClusterId(assignment?.clusterId)] || assignment?.clusterId || '과정',
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
    previousSubmissions: assignmentHistory.previous,
    sameDaySubmissions: assignmentHistory.sameDay,
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
  const questionSection = studentQuestions.length
    ? `\n\n#### 질문에 대한 답변\n${studentQuestions.map((question) => `- ${question}`).join('\n')}\n\n이 질문은 교사가 정확한 풀이 맥락을 확인해 답변해야 합니다. 현재 자동 초안에서는 질문을 누락하지 않도록 표시만 해두었습니다.`
    : '';
  const previousPoint = previous.length > 0
    ? '이전 과제 기록과 비교해 이번 제출에서 유지하거나 개선할 부분을 확인할 수 있습니다.'
    : '아직 비교할 과제 기록이 많지 않으므로, 이번 제출이 앞으로의 성장 기준점이 됩니다.';

  const learningFlowNote = policy.isReasonableFlow
    ? `영상 ${learning.videoMinutes}분에 ${learning.quizCount ? `퀴즈 ${learning.quizCount}건` : ''}${learning.quizCount && learning.dataLogCount ? ', ' : ''}${learning.dataLogCount ? `데이터 로그 ${learning.dataLogCount}건` : ''}${!learning.quizCount && !learning.dataLogCount && hasAttachments ? '제출 자료' : ''}까지 이어진 점을 보면, 단순히 영상만 본 기록은 아닙니다.`
    : '';

  const improvement = weakness
    ? `${weakness}와 연결되는 부분은 다음 과제에서 한 번 더 의식해 보세요.`
    : policy.isReasonableFlow
      ? '다음 제출에서는 퀴즈에서 틀린 이유나 코드/풀이에서 막힌 부분을 한 줄 더 적어 주세요.'
    : '다음 제출에서는 결과를 확인한 과정이나 막혔던 부분을 한 줄 더 적어 보세요.';

  const feedback = styleKey === 'parent'
    ? `### 과제 피드백\n\n${studentName} 학생은 ${courseLabel} 과제에서 ${submission.content ? '학습 내용을 글로 정리해 제출했습니다' : '과제를 제출했습니다'}. ${hasAttachments ? `첨부파일(${firstAttachment}${submission.attachmentCount > 1 ? ` 외 ${submission.attachmentCount - 1}개` : ''})도 함께 제출되어 결과 확인 근거가 있습니다.` : '다만 결과를 확인할 첨부 자료는 더 보강하면 좋겠습니다.'} ${learningFlowNote || (learning.activityCount ? `제출일에는 학습 기록 ${learning.activityCount}건도 확인되어 과제와 학습 흐름을 함께 볼 수 있습니다.` : '제출일 학습 기록은 많지 않아 과제 수행 과정을 더 남기면 좋겠습니다.')} ${previousPoint} ${improvement}`
    : `### 과제 피드백\n\n이번 ${courseLabel} 과제에서는 ${submission.content ? '배운 내용을 직접 정리해 제출했습니다' : '과제를 제출했습니다'}.\n\n#### 잘한 점\n${learningFlowNote || (hasAttachments ? `제출 글과 함께 ${submission.attachmentCount}개의 첨부파일을 올린 점이 좋습니다. 결과물을 함께 남기면 무엇을 만들었는지 더 분명하게 확인할 수 있습니다.` : '과제를 제출한 흐름 자체는 좋습니다. 다음에는 실행 결과나 풀이 과정을 확인할 수 있는 자료까지 함께 남기면 더 좋아집니다.')}${questionSection}\n\n#### 이전보다 좋아진 점\n${previousPoint}\n\n#### 더 발전시키면 좋은 점\n${improvement}`;

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
    suggestedStatus: hasAttachments || submission.contentLength >= 80 ? 'reviewed' : 'needs_revision',
    suggestedBonusCrystals: policy.isReasonableFlow ? 35 : hasAttachments ? 40 : 25,
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
