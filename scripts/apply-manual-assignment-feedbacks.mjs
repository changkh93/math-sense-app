import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const args = process.argv.slice(2);
const shouldApply = args.includes('--apply');
const contextsArg = args.find(arg => arg.startsWith('--contexts='));
const feedbacksArg = args.find(arg => arg.startsWith('--feedbacks='));
const contextsPath = contextsArg ? contextsArg.split('=')[1] : '/private/tmp/pending_assignment_contexts.json';
const feedbacksPath = feedbacksArg ? feedbacksArg.split('=')[1] : '/private/tmp/manual_assignment_feedbacks.json';

if (!shouldApply) {
  console.error('Refusing to write without --apply. Run without --apply only after adding a dry-run mode.');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

const contexts = JSON.parse(readFileSync(contextsPath, 'utf8')).contexts || [];
const feedbacks = JSON.parse(readFileSync(feedbacksPath, 'utf8'));

function getDisplayName(context) {
  return (
    context.displayName ||
    context.student?.studentName ||
    context.assignment?.userName ||
    context.student?.publicDisplayName ||
    context.student?.name ||
    context.student?.displayName ||
    '학생'
  );
}

function hasQuestionAnswerSection(feedbackText = '') {
  const text = String(feedbackText || '');
  return /질문에\s*대한\s*(답|답변)|질문\s*답변|궁금한\s*점|답변/.test(text);
}

function buildEvidence(context) {
  const evidence = [];
  const assignment = context.assignment || {};
  const learning = context.learningSummary || {};
  const darkMatter = context.darkMatterSummary || {};
  const attention = learning.attention || {};

  if (assignment.content) evidence.push('제출 내용 확인');
  if (assignment.studentQuestions?.length) {
    evidence.push(`학생 질문 확인: ${assignment.studentQuestions.join(' / ')}`);
  }
  if (assignment.attachments?.length) {
    evidence.push(`첨부파일 확인: ${assignment.attachments.map(item => item.name).filter(Boolean).join(', ')}`);
  }
  if (learning.activityCount) evidence.push(`제출일 학습 기록 ${learning.activityCount}건 확인`);
  if (learning.readingActivityCount) evidence.push(`초등 독서/읽기 활동 ${learning.readingActivityCount}건 확인`);
  if (learning.mathActivityCount === 0 && learning.readingActivityCount > 0) {
    evidence.push('초등수학 수학 플랫폼 학습 기록 없음 확인');
  }
  if (learning.learningLoad) {
    evidence.push(`기준 학습량 비교: ${learning.learningLoad.videoMinutes}분 / ${learning.learningLoad.platformTargetMinutes || 0}분 (${learning.learningLoad.level || '판단 보류'})`);
  }
  if (learning.averageScore != null) evidence.push(`제출일 퀴즈 평균 ${learning.averageScore}점 확인`);
  if (learning.videos?.length || learning.progressVideos?.length) {
    const titles = [...(learning.videos || []), ...(learning.progressVideos || [])]
      .map(item => item.title)
      .filter(Boolean)
      .slice(0, 3);
    evidence.push(`영상 학습 기록 확인: ${titles.join(', ')}`);
  }
  if (attention.opportunities) {
    evidence.push(`집중도 광석 ${attention.hits}/${attention.opportunities} 획득 확인`);
  }
  if (learning.concernSignals?.length) {
    evidence.push(`주의 신호 확인: ${learning.concernSignals.join(' · ')}`);
  }
  if (learning.inProgressQuizzes?.length) {
    evidence.push(`진행 중 퀴즈 확인: ${learning.inProgressQuizzes.map(item => `${item.title} ${item.answeredCount}/${item.totalCount}`).join(', ')}`);
  }
  if (context.previous?.length) evidence.push(`같은 과정 이전 제출 ${context.previous.length}건 참고`);
  const previousResponses = (context.previous || []).filter(item => item.feedbackReaction || item.feedbackComment || item.feedbackResponse);
  if (previousResponses.length) {
    evidence.push(`이전 피드백 반응/코멘트 ${previousResponses.length}건 확인`);
  }
  if (context.sameDay?.length) evidence.push(`같은 날짜 다른 과정 제출 ${context.sameDay.length}건 확인`);
  if (darkMatter.count) {
    const concepts = darkMatter.concepts?.length ? `: ${darkMatter.concepts.join(', ')}` : '';
    evidence.push(`매터센스/복습 기록 ${darkMatter.count}건 참고${concepts}`);
  }

  return evidence;
}

function buildRubric(context) {
  const assignment = context.assignment || {};
  const learning = context.learningSummary || {};
  const darkMatter = context.darkMatterSummary || {};

  return {
    submissionCompleteness: assignment.attachments?.length ? 3 : 2,
    requirementMatch: 2,
    conceptApplication: learning.mathActivityCount === 0 && learning.readingActivityCount > 0 ? 1 : (learning.activityCount ? 2 : 1),
    resultVerification: assignment.attachments?.length ? 3 : 1,
    feedbackReflection: context.previous?.length ? 2 : 1,
    weaknessRecovery: darkMatter.count ? 1 : 2,
    selfDirection: String(assignment.content || '').length >= 100 ? 2 : 1,
    focusManagement: learning.attention?.opportunities
      ? Math.max(0, Math.min(3, Math.round((learning.attention.hits / learning.attention.opportunities) * 3)))
      : 2,
  };
}

function calculateSuggestedBonusCrystals(context) {
  const assignment = context.assignment || {};
  const learning = context.learningSummary || {};
  const load = learning.learningLoad || {};
  const attention = learning.attention || {};
  let score = 15;

  if (String(assignment.content || '').trim().length >= 40) score += 5;
  if (String(assignment.content || '').trim().length >= 120) score += 3;

  if (load.level === '충분') score += 8;
  else if (load.level === '조금 부족') score += 5;
  else if (load.level === '수학 기록 없음') score -= 3;
  else if ((learning.videoCount || 0) > 0 || (learning.quizCount || 0) > 0 || (learning.inProgressQuizCount || 0) > 0) score += 3;

  if (load.hasBalancedPractice) score += 5;
  else if ((learning.videoCount || 0) > 0 && (learning.quizCount || 0) === 0 && (learning.inProgressQuizCount || 0) === 0) score += 1;

  if (attention.opportunities) {
    const focusRate = attention.hits / attention.opportunities;
    if (focusRate >= 0.8) score += 4;
    else if (focusRate >= 0.5) score += 2;
  }

  if (assignment.studentQuestions?.length) score += 2;
  if (context.previous?.length) score += 1;
  if ((context.previous || []).some(item => item.feedbackReaction || item.feedbackComment || item.feedbackResponse)) score += 1;

  return Math.max(10, Math.min(40, Math.round(score)));
}

function validateFeedbackIds() {
  const contextIds = new Set(contexts.map(context => context.assignment?.id).filter(Boolean));
  const feedbackIds = new Set(Object.keys(feedbacks));
  const missing = [...contextIds].filter(id => !feedbackIds.has(id));
  const extra = [...feedbackIds].filter(id => !contextIds.has(id));

  if (missing.length || extra.length) {
    console.error(JSON.stringify({ missing, extra }, null, 2));
    throw new Error('Feedback JSON IDs do not match exported contexts.');
  }
}

validateFeedbackIds();

const missingQuestionAnswers = contexts
  .filter(context => context.assignment?.studentQuestions?.length)
  .filter(context => !hasQuestionAnswerSection(feedbacks[context.assignment.id]?.studentFeedback))
  .map(context => ({
    id: context.assignment.id,
    student: getDisplayName(context),
    questions: context.assignment.studentQuestions,
  }));

if (missingQuestionAnswers.length) {
  console.error(JSON.stringify({ missingQuestionAnswers }, null, 2));
  throw new Error('Some submissions contain student questions, but feedback does not include a question-answer section.');
}

let batch = db.batch();
let count = 0;

for (const context of contexts) {
  const id = context.assignment.id;
  const feedback = feedbacks[id];
  const displayName = getDisplayName(context);
  const evidence = feedback.evidence || buildEvidence(context);
  const rubricScores = feedback.rubricScores || buildRubric(context);
  const suggestedBonusCrystals = Number.isFinite(Number(feedback.suggestedBonusCrystals))
    ? Number(feedback.suggestedBonusCrystals)
    : calculateSuggestedBonusCrystals(context);

  const payload = {
    studentFeedback: feedback.studentFeedback,
    parentSummary: feedback.parentSummary || '',
    strengths: feedback.strengths || [],
    improvements: feedback.improvements || [],
    nextMission: '',
    comparisonWithPrevious: feedback.comparisonWithPrevious || '',
    evidence,
    rubricScores,
    suggestedStatus: feedback.suggestedStatus || 'reviewed',
    suggestedBonusCrystals,
    revisionRequest: feedback.revisionRequest || '',
    generatedBy: 'codex-manual-review',
    feedbackStyle: 'manual',
    contextSummary: {
      studentName: displayName,
      courseLabel: context.courseLabel || context.assignment.clusterName || context.assignment.clusterId || context.assignment.regionId || '',
      previousCount: context.previous?.length || 0,
      sameDayCount: context.sameDay?.length || 0,
      learningActivityCount: context.learningSummary?.activityCount || 0,
      mathActivityCount: context.learningSummary?.mathActivityCount || 0,
      readingActivityCount: context.learningSummary?.readingActivityCount || 0,
      readingQuizCount: context.learningSummary?.readingQuizCount || 0,
      darkMatterCount: context.darkMatterSummary?.count || 0,
      focusScore: context.learningSummary?.focusScore ?? null,
      attention: context.learningSummary?.attention || null,
      learningLoad: context.learningSummary?.learningLoad || null,
      inProgressQuizCount: context.learningSummary?.inProgressQuizCount || 0,
      studentQuestionCount: context.assignment?.studentQuestions?.length || 0,
      previousFeedbackResponses: (context.previous || [])
        .filter(item => item.feedbackReaction || item.feedbackComment || item.feedbackResponse)
        .map(item => ({
          assignmentId: item.id,
          date: item.date,
          reaction: item.feedbackReaction || item.feedbackResponse?.reaction || '',
          comment: item.feedbackComment || item.feedbackResponse?.comment || '',
        })),
    },
  };

  batch.set(db.collection('assignments').doc(id), {
    aiFeedbackDraft: feedback.studentFeedback,
    aiFeedbackPayload: payload,
    aiFeedbackEvidence: evidence,
    aiFeedbackRubricScores: rubricScores,
    aiFeedbackGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
    aiFeedbackUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    aiFeedbackManualReviewedAt: admin.firestore.FieldValue.serverTimestamp(),
    aiFeedbackGeneratedBy: 'codex-manual-review',
  }, { merge: true });

  count += 1;
  if (count % 400 === 0) {
    await batch.commit();
    batch = db.batch();
  }
}

await batch.commit();
console.log(`saved manual feedback drafts: ${count}`);
