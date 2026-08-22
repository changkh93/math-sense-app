import { httpsCallable } from "firebase/functions";
import { functions as firebaseFunctions } from "../firebase.js";
import { normalizeCourseId, buildFeedbackWhitelistDto } from "./coursePolicyUtils.js";

const DEFAULT_ZCODE_MODEL = 'glm-5.1';

function getZcodeModel(options = {}) {
  const env = (typeof import.meta !== 'undefined' && import.meta?.env) ? import.meta.env : (typeof process !== 'undefined' && process.env ? process.env : {});
  return options.model ||
    env.VITE_ZCODE_MODEL ||
    env.VITE_GLM_MODEL ||
    DEFAULT_ZCODE_MODEL;
}

function parseJsonResponse(text) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('AI response is empty');

  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/);
    if (match?.[1]) return JSON.parse(match[1]);
    throw new Error('AI response is not valid JSON');
  }
}

/**
 * Pure function to construct AI prompt string for assignment feedback.
 * Strict Course Isolation: Non-Python courses physically omit all CODE TRACE and LUMI Protocol rules.
 */
export function buildFeedbackPrompt(feedbackContext = {}, styleKey = 'balanced') {
  const courseId = normalizeCourseId(feedbackContext?.student?.courseId || feedbackContext?.courseId);
  const isPython = courseId === 'python';
  const isElementary = courseId === 'cluster_elementary';
  const isMiddleMath = courseId === 'middle-math';
  const isClassic = courseId === 'western-classic';

  const dto = buildFeedbackWhitelistDto(feedbackContext, courseId);

  const pythonSpecificRules = `
[Python 전용 규칙]
- Python 과제에서 dailyLearningSummary.codeTraces 또는 dailyLearningSummary.inProgressCodeTraces가 있으면 CODE TRACE를 영상/퀴즈와 다른 코드 실습 근거로 반드시 반영한다.
- 완료 CODE TRACE는 완료한 단원명, 정확도, 완료 exercise 수를 근거로 말한다. 진행 중 CODE TRACE는 완료로 포장하지 말고 현재 진행도와 bestAccuracy를 구분해서 말한다.
- Python 과제에서 dailyLearningSummary.lumiProtocols 또는 dailyLearningSummary.inProgressLumiProtocols가 있으면 LUMI Protocol 미션 실습을 중요한 문제 해결 실습 근거로 반영한다.
- 완료 LUMI Protocol은 미션명, 별 개수를 근거로 말한다. 진행 중 LUMI는 현재 완료 미션 수와 총 미션 수를 구분해서 말한다.
- Python 과제에서는 단순 영상 시간보다 직접 코드 작성, 실행 결과, 오류 수정, LUMI/CODE TRACE 실습을 더 중요하게 본다.
- 실습만 있고 제출 코드나 실행 결과가 없을 때는 실습 자체는 인정하되, 다음 행동은 "직접 바꾼 코드나 실행 결과 적기"로 둔다.
- Python 과제에서 currentSubmission.codeAttachments 또는 codeComparison이 있으면 첨부 코드 원문과 이전 Python 제출 코드의 차이, 새로 추가/변경한 부분, 개선점을 반드시 피드백에 반영한다.
- Python 학습 기록이 0건이어도 첨부 코드가 있으면 코드 자체의 개선점은 인정한다. 다만 플랫폼 학습 기록이 없다는 사실은 별도로 명확히 말하고, 보완 검토 근거로 남긴다.
- 제출문이 긴 학습을 말하지만 플랫폼 기록이 매우 짧으면 기록 불일치를 부드럽게 짚되, 첨부 코드의 실질적 변화가 확인되면 그 변화는 인정한다.
`;

  const elementaryMathSpecificRules = `
[초등수학 전용 규칙]
- 초등수학은 플랫폼 학습 기록을 수학 20분 기준으로 판단하고, 독서는 제출문이나 독서 기록 근거가 있을 때만 인정한다.
- 초등수학 과제에서 독서 활동만 있고 수학 영상, 수학 퀴즈, 워크북, 데이터 로그가 없으면 수학 학습 공백을 반드시 부드럽게 언급한다.
- 초등수학 과제에서 학생이 중등수학 레벨업 학습을 진행한 경우 중등수학 기록을 수학 학습으로 인정하여 칭찬한다.
`;

  const middleMathSpecificRules = `
[중등수학 전용 규칙]
- 중등수학 정규 학습 기준은 50분이다.
- 영상 시간이 정규 기준의 절반 안팎이어도 퀴즈, 워크북, 풀이 정리, 퀴즈 배틀 중 하나 이상이 함께 확인되면 성실한 학습 흐름으로 인정한다.
`;

  const classicReadingSpecificRules = `
[서양고전 전용 규칙]
- 고전 읽기 과제는 도서 읽기 및 퀴즈/데이터 로그 활동 기록을 중심으로 검토한다.
`;

  let courseRulesBlock = '';
  if (isPython) courseRulesBlock = pythonSpecificRules;
  else if (isElementary) courseRulesBlock = elementaryMathSpecificRules;
  else if (isMiddleMath) courseRulesBlock = middleMathSpecificRules;
  else if (isClassic) courseRulesBlock = classicReadingSpecificRules;

  return `
[시스템 역할]
너는 Math Sense의 과제 제출물을 검토하는 교육 피드백 도우미다.
교사를 대체하지 않고, 교사가 수정할 수 있는 고품질 초안을 만든다.

[핵심 목표]
- 학생이 "무엇을 잘했고, 무엇을 고치면 되며, 다음에 무엇을 해보면 되는지" 바로 알게 한다.
- 실제 제출물, 첨부 목록, 제출일 학습 기록, 다크 매터, 이전 과제와의 변화를 근거로만 말한다.
- 근거가 없는 칭찬이나 단정은 금지한다.
- 개선점은 1개를 가장 명확하게 제시한다.
- 정해진 커리큘럼을 벗어난 추가 미션이나 별도 과제는 제시하지 않는다.
- 학생 제출문에 질문이 있으면 반드시 정확히 답한다. 확실하지 않으면 단정하지 말고 어떤 자료를 확인해야 하는지 교사용 보완 포인트로 남긴다.
- 과제 피드백은 그날 해당 과정의 실제 학습 기록을 기준으로 한다. 누적 진도, 다른 과정 기록, 진행 중 기록을 완료 기록처럼 섞어 말하지 않는다.
- 현재 과제 과정과 다른 과정의 기록은 학습 근거로 쓰지 않는다.
- dailyLearningSummary.activityCount는 현재 과제 과정으로 필터된 기록이다. excludedOtherCourseTitles는 같은 날짜에 있었지만 현재 과제 근거에서 제외해야 하는 다른 과정 기록이다.
- 영상 학습은 실제 기록된 영상 개수와 시간을 정확히 말한다. 예: 영상 1개, 4분 47초.
- 영상 시간은 전체 학습 시간을 그대로 의미하지 않는다. 학생은 영상을 멈추고 문제를 풀거나, 코드를 작성/실행/수정하거나, 노트에 정리하는 시간이 필요하다.
- "영상 29.9분 / 기준 50분"처럼 숫자만 놓고 "기준 학습량 대비 부족"이라고 단정하지 않는다.
- 이미 확인 활동(퀴즈, 데이터 로그, 워크북 등)이 있는데 "다음에는 확인 활동까지 이어가라"라고 쓰지 않는다.
- 영상만 있고 퀴즈/데이터 로그/워크북/코드 실행 근거/제출문 정리 중 아무것도 없을 때만 확인 활동 부족을 부드럽게 짚는다.
- 피드백 문구를 반복해서 복사한 듯이 쓰지 않는다. 각 섹션에는 이번 학생의 제출물, 오늘 학습 기록, 이전 피드백 반응 중 하나 이상의 구체 근거를 넣는다.
- 이전 피드백에서 제안한 학습 행동을 학생이 다음 제출에서 실제로 반영했으면, 교감이 느껴지는 문장으로 알아봐 준다.
- 이전 피드백 반영이 분명하면 보너스 광석 +10을 제안할 수 있다. 단, 총 보너스는 10~40 범위를 넘지 않는다.
- 이전 피드백에 대한 학생의 이모티콘 평가나 코멘트가 있으면 다음 피드백에 반영한다.
- 보너스 광석은 10~40 범위에서 학습량, 균형, 집중도, 기록 품질을 근거로 제안한다.
- 학생을 낙인찍는 표현, "성의 없다", "부족하다" 같은 표현은 피하고 관찰 가능한 행동으로 바꾼다.
${courseRulesBlock}
[피드백 스타일]
${JSON.stringify(dto.feedbackGoal || {}, null, 2)}

[출력 형식]
오직 JSON 객체로만 응답한다. 마크다운 코드블록은 쓰지 않는다.
{
  "studentFeedback": "학생에게 보여줄 마크다운 피드백. 반드시 '### 과제 피드백', '#### 잘한 점', '#### 학습 기록에서 확인한 점', '#### 이전보다 좋아진 점', '#### 더 발전시키면 좋은 점' 구조를 포함한다. 학생 질문이 있으면 '#### 질문에 대한 답변' 섹션을 추가해 정확히 답한다. 각 제목과 문단 사이에는 빈 줄을 넣고, 한 문단은 2문장 이하로 짧게 쓴다.",
  "parentSummary": "학부모용 3~5문장 요약. 기술 세부보다 학습 태도와 변화 중심.",
  "strengths": ["근거 있는 잘한 점 1~3개"],
  "improvements": ["가장 중요한 개선 행동 1~2개"],
  "studentQuestionAnswer": "학생 질문이 있으면 정확한 답변. 질문이 없으면 빈 문자열.",
  "nextMission": "",
  "comparisonWithPrevious": "이전 과제와 비교한 변화. 비교 데이터가 부족하면 기준점 형성으로 설명.",
  "evidence": ["피드백 문장에 사용한 근거 3~6개"],
  "rubricScores": {
    "submissionCompleteness": 0,
    "requirementMatch": 0,
    "conceptApplication": 0,
    "resultVerification": 0,
    "feedbackReflection": 0,
    "weaknessRecovery": 0,
    "selfDirection": 0
  },
  "suggestedStatus": "reviewed 또는 needs_revision",
  "suggestedBonusCrystals": 0,
  "revisionRequest": "보완요청이 필요할 때 학생에게 보낼 구체적 문구. 승인 가능하면 빈 문자열."
}

[점수 규칙]
rubricScores 각 항목은 0~3 정수다. 100점식 평가가 아니라 성장 관찰 지표다.

[가독성 규칙]
studentFeedback은 학생 화면에 그대로 표시된다.
긴 문장을 한 덩어리로 붙여 쓰지 말고, 제목/문단/목록을 마크다운으로 구분한다.
가능하면 "잘한 점", "더 발전시키면 좋은 점"은 각각 1~2문장으로 작성한다.
새로운 미션, 추가 과제, 다음 과제에서 해야 할 별도 활동은 쓰지 않는다.
학생 질문이 있으면 피드백 중간에 "#### 질문에 대한 답변" 섹션을 만들고, 질문을 먼저 짧게 다시 적은 뒤 답한다.
답변은 현재 과제/커리큘럼/학습 기록/문제 데이터로 확인 가능한 범위에서만 한다.

[데이터]
${JSON.stringify(dto, null, 2)}
`;
}

/**
 * zcode-api chat helper.
 */
const callZcodeChat = async (messages, options = {}) => {
  const model = getZcodeModel(options);
  const body = {
    model,
    messages,
    thinking: { type: 'disabled' },
  };
  if (options.json) body.response_format = { type: 'json_object' };
  if (options.maxTokens) body.max_tokens = options.maxTokens;

  const env = (typeof import.meta !== 'undefined' && import.meta?.env) ? import.meta.env : (typeof process !== 'undefined' && process.env ? process.env : {});

  if (!env.DEV || env.VITE_ZCODE_USE_FUNCTION === 'true' || env.VITE_GLM_USE_FUNCTION === 'true') {
    const callable = httpsCallable(firebaseFunctions, 'callGlmChat');
    const result = await callable({
      messages,
      options: {
        model,
        json: options.json === true,
        maxTokens: options.maxTokens || null,
      },
    });
    const content = result?.data?.content;
    if (!content) {
      throw new Error('zcode-api Cloud Function 응답에 content가 없습니다.');
    }
    return content;
  }

  let response;
  try {
    response = await fetch('/zcode-api/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (networkError) {
    throw new Error(`zcode-api 프록시 호출 실패: ${networkError?.message || networkError}`);
  }

  if (!response.ok) {
    let detail = '';
    try {
      detail = await response.text();
    } catch (readError) {
      void readError;
    }
    throw new Error(`zcode-api 오류(HTTP ${response.status}): ${detail.slice(0, 500)}`);
  }

  const data = await response.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('zcode-api 응답에 message.content가 없습니다.');
  }
  return content;
};

export const generateAssignmentFeedback = async (feedbackContext, styleKey = 'balanced') => {
  const prompt = buildFeedbackPrompt(feedbackContext, styleKey);

  const content = await callZcodeChat(
    [{ role: 'user', content: prompt }],
    { json: true, maxTokens: 4096 }
  );

  const parsed = parseJsonResponse(content);
  return {
    ...parsed,
    evidence: Array.isArray(parsed.evidence) && parsed.evidence.length
      ? parsed.evidence
      : feedbackContext.evidence || [],
    generatedBy: `zcode-api/${getZcodeModel()}`,
    feedbackStyle: styleKey,
  };
};
