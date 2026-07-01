import { GoogleGenAI } from "@google/genai";
import { httpsCallable } from "firebase/functions";
import { functions as firebaseFunctions } from "../firebase";

// Ensure we have an instance (if the key is missing, handle gracefully)
let genAI = null;
try {
  genAI = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
} catch (error) {
  void error;
  console.warn("Gemini API Key missing or invalid");
}

/**
 * Helper: sleep for a given number of milliseconds
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Helper: Extract retry delay from 429 error message (returns ms)
 */
const extractRetryDelay = (error) => {
    try {
        const match = error?.message?.match(/retry in ([0-9.]+)s/i);
        if (match) return Math.ceil(parseFloat(match[1]) * 1000) + 1000; // +1s buffer
    } catch (parseError) {
        void parseError;
    }
    return 20000; // Default 20 second fallback
};

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
 * Parses quizzes and transmission/transcript data to map a timestamp.
 * Includes automatic retry with exponential backoff for rate limits.
 */
export const autoTagQuizToVideo = async (quizText, transcript, maxRetries = 3) => {
  if (!genAI) {
    throw new Error("Gemini API client not initialized");
  }

  const prompt = `
[시스템 역할]
너는 교육 콘텐츠 AI 분석 전문가야. 퀴즈 문제를 읽고, 해당 개념이 설명되는 가장 적절한 영상(Transmission)과 타임스탬프(초)를 정밀하게 매핑해야 해.

[핵심 규칙 - 반드시 준수]
1. ❌ 절대 무조건 0초를 반환하지 마. 0초는 오직 영상의 '맨 첫 도입부(인사/소개)'에서 직접 다루는 개념일 때만 허용돼.
2. ✅ 타임스탬프 산출 방법 (수학적 비례 추정):
   - 단원 텍스트에 [텍스트 블록 N/M] 형태로 번호가 매겨져 있어.
   - 해당 퀴즈 개념이 텍스트 블록 K번째에 위치한다면, 그 영상의 전체 길이(Duration)에 대해 비례식으로 타임스탬프를 계산해:
     timestamp ≈ (K / M) × Duration(초)
   - 예: 텍스트 총 20블록, 퀴즈 개념이 블록 12에 해당, 영상 길이 600초 → timestamp ≈ (12/20) × 600 = 360초
3. ✅ 영상이 여러 개(트랜스미션)일 때:
   - 각 트랜스미션의 제목과 텍스트 내용을 비교해서, 퀴즈 개념과 가장 연관성이 높은 트랜스미션의 ID를 정확히 선택해.
   - 제목에 포함된 키워드(예: "분수 형태로 표현", "비를 쓰고 읽는 법")를 퀴즈 문제의 핵심 키워드와 매칭해.
4. ⚠️ 확실한 근거가 부족할 때:
   - 억지로 시간을 지어내지 말고, "uncertain": true 플래그를 추가하고 confidence를 30 이하로 설정해.
   - 이 경우에도 최선의 추정값은 반환하되, 운영자가 검토해야 함을 표시해.

[퀴즈 문제]: ${quizText}

[단원 메타데이터 및 텍스트]:
${transcript}

[출력 형식] 오직 아래 JSON 형식으로만 응답해:
{
  "transmissionId": "선택한 트랜스미션 ID (tx_로 시작하는 값)",
  "confidence": 0~100,
  "timestamp": 비례추정된_시작시간_초,
  "uncertain": true 또는 false,
  "reason": "1) 어떤 텍스트 블록(번호)과 매칭했는지, 2) 왜 이 트랜스미션을 선택했는지, 3) 타임스탬프를 어떻게 계산했는지를 간략히 서술"
}
  `;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await genAI.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: {
              responseMimeType: "application/json",
          }
      });

      const text = response.text;
      return JSON.parse(text);
    } catch (error) {
      const is429 = error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
      
      if (is429 && attempt < maxRetries) {
        const retryMs = extractRetryDelay(error);
        console.warn(`⏳ Rate limit hit (attempt ${attempt + 1}/${maxRetries}). Waiting ${retryMs / 1000}s before retry...`);
        await sleep(retryMs);
        continue; // retry
      }
      
      console.error("AI 태깅 중 오류 발생:", error);
      return null;
    }
  }
  return null;
};

/**
 * AI Auto Markup: Analyzes workbook images and returns JSON with element positions.
 */
export const analyzeWorkbookImage = async (base64Image, mimeType) => {
  if (!genAI) {
    throw new Error("Gemini API client not initialized");
  }

  const prompt = `
[시스템 역할]
너는 전문 수학 교재 분석가야. 주어진 이미지에서 학생이 숫자를 입력해야 하는 빈칸과, 정답 시 가려져야 할 시각적 요소(X 표시 등)를 찾아내야 해.
1. 모든 위치는 이미지 왼쪽 상단을 (0,0), 오른쪽 하단을 (100,100)으로 하는 상대 좌표(%)로 계산해.
2. 출력 포맷은 반드시 아래의 JSON 배열 형식을 지켜줘. (순수 JSON 배열만 반환해, 마크다운 코드블록이나 다른 텍스트는 빼고)
3. 정답(answer)은 문제의 맥락(분모가 같은 분수의 덧셈/뺄셈 등)을 보고 네가 직접 계산해서 넣어줘.

[중요 지침: 박스의 위치 및 크기]
- 문제에 기재된 '밑줄(______)' 이나 빈 '네모 칸(□)' 의 위치를 정확히 인식하세요.
- input 요소의 좌표(top, left, width, height)는 텍스트 옆 빈 공간이 아니라, **반드시 밑줄 바로 위 또는 빈 네모칸의 영역과 정확히 일치하도록** 타이트하게 잡아주세요. 밑줄의 시작점과 끝점에 맞춰 width를 부여하세요.
- 글자 크기에 맞춰 height를 적절히(약 3.5%~5%) 부여하여 사용자가 탭해서 입력하기 좋게 만드세요.

[JSON 구조]
[
  {
    "type": "input", // 또는 "mask"
    "answer": "정답 문자열 (input일 경우에만)",
    "triggerBy": "정답 시 가려질 때 연관된 input의 id (mask일 경우에만, 보통 인덱스로 매칭 가능하게)",
    "position": { 
       "top": 75.6, 
       "left": 19.3, 
       "width": 5.0, 
       "height": 3.5 
    }
  }
]
`;

  try {
    const response = await genAI.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
            prompt,
            { inlineData: { data: base64Image, mimeType } }
        ],
        config: {
            responseMimeType: "application/json",
        }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Auto Markup 중 오류 발생:", error);
    throw error;
  }
};

/**
 * GLM(BigModel) 채팅 호출 헬퍼.
 * vite dev 서버의 /glm-api 프록시를 통해 같은 출처로 요청한다(브라우저 CORS 회피 + 키 비노출).
 * 키와 엔드포인트는 vite.config.js의 server.proxy['/glm-api']에서 주입된다.
 * @param {Array<{role: string, content: string}>} messages
 * @param {{ model?: string, json?: boolean, maxTokens?: number }} [options]
 */
const callGlmChat = async (messages, options = {}) => {
  const model = options.model || import.meta.env.VITE_GLM_MODEL || 'glm-5.1'
  const body = {
    model,
    messages,
    thinking: { type: 'disabled' },
  }
  if (options.json) body.response_format = { type: 'json_object' }
  if (options.maxTokens) body.max_tokens = options.maxTokens

  if (!import.meta.env.DEV || import.meta.env.VITE_GLM_USE_FUNCTION === 'true') {
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
      throw new Error('GLM Cloud Function 응답에 content가 없습니다.');
    }
    return content;
  }

  let response
  try {
    response = await fetch('/glm-api/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (networkError) {
    throw new Error(`GLM 프록시 호출 실패: ${networkError?.message || networkError}`)
  }

  if (!response.ok) {
    // 4xx/5xx 본문을 그대로 노출해 1113(잔액 부족) 같은 진단을 빠르게 한다.
    let detail = ''
    try {
      detail = await response.text()
    } catch (readError) {
      void readError
    }
    throw new Error(`GLM API 오류(HTTP ${response.status}): ${detail.slice(0, 500)}`)
  }

  const data = await response.json().catch(() => null)
  const content = data?.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('GLM 응답에 message.content가 없습니다.')
  }
  return content
}

export const generateAssignmentFeedback = async (feedbackContext, styleKey = 'balanced') => {
  const prompt = `
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
- 현재 과제 과정과 다른 과정의 기록은 학습 근거로 쓰지 않는다. 예: Python 과제에서 초등수학 "4월 평가" 기록을 Python 퀴즈나 진행 중 코드로 말하면 안 된다.
- dailyLearningSummary.activityCount는 현재 과제 과정으로 필터된 기록이다. excludedOtherCourseTitles는 같은 날짜에 있었지만 현재 과제 근거에서 제외해야 하는 다른 과정 기록이다.
- 영상 학습은 실제 기록된 영상 개수와 시간을 정확히 말한다. 예: 영상 1개, 4분 47초.
- 정규 기준은 초등수학 독서 20분+수학 20분, 중등수학 50분, Python 50분이다.
- 영상 시간은 전체 학습 시간을 그대로 의미하지 않는다. 학생은 영상을 멈추고 문제를 풀거나, 코드를 작성/실행/수정하거나, 노트에 정리하는 시간이 필요하다.
- 중등수학/Python에서 영상 시간이 정규 기준의 절반 안팎이고 퀴즈, 데이터 로그, 코드 제출, 풀이 정리 중 하나 이상이 함께 확인되면 성실한 학습 흐름으로 인정한다.
- "영상 29.9분 / 기준 50분"처럼 숫자만 놓고 "기준 학습량 대비 부족"이라고 단정하지 않는다.
- 이미 퀴즈나 데이터 로그가 있는데 "다음에는 퀴즈나 데이터 로그까지 이어가라"라고 쓰지 않는다. 실제 기록을 보지 않은 피드백처럼 보인다.
- Python 과제에서는 영상 시간보다 직접 코드 작성, 실행 결과, 오류 수정, 직접 바꾼 부분 설명을 더 중요하게 본다.
- Python 과제에서 currentSubmission.codeAttachments 또는 codeComparison이 있으면 첨부 코드 원문과 이전 Python 제출 코드의 차이, 새로 추가/변경한 부분, 개선점을 반드시 피드백에 반영한다.
- Python 학습 기록이 0건이어도 첨부 코드가 있으면 코드 자체의 개선점은 인정한다. 다만 플랫폼 Python 학습 기록이 없다는 사실은 별도로 명확히 말하고, 경고/보완 검토 근거로 남긴다.
- Python 학습 기록이 매우 짧지만 첨부 코드 개선이 뚜렷하면 "코드 개선"과 "학습 기록/제출 설명 불일치"를 분리해서 쓴다. 경고 사유가 있어도 코드 개선을 지우거나 "확인 활동이 없다"고 단정하지 않는다.
- 제출문이 "25분 학습"처럼 긴 학습을 말하지만 플랫폼 영상 기록이 1분 안팎이면, 학습 기록 섹션에서 기록 불일치를 정확히 말한다. 단, 첨부 코드 비교에서 새 코드 변화가 확인되면 그 변화는 별도로 인정한다.
- 개선점은 "영상 시간이 부족하다"가 아니라 오답 이유 1줄 정리, 코드 실행 결과 첨부, 오늘 바꾼 코드 2곳 설명처럼 실제로 비어 있는 근거에서 고른다.
- 초등수학은 플랫폼 학습 기록을 수학 20분 기준으로 판단하고, 독서는 제출문이나 독서 기록 근거가 있을 때만 인정한다.
- 초등수학 과제에서 독서퀴즈/독서 활동만 있고 수학 영상, 수학 퀴즈, 데이터 로그가 없으면 수학 학습 공백을 반드시 부드럽게 언급한다.
- 영상만 있고 퀴즈/데이터 로그/코드 실행 근거/제출문 정리 중 아무것도 없을 때만 확인 활동 부족을 부드럽게 짚는다.
- 피드백 문구를 반복해서 복사한 듯이 쓰지 않는다. 각 섹션에는 이번 학생의 제출물, 오늘 학습 기록, 이전 피드백 반응 중 하나 이상의 구체 근거를 넣는다.
- 이전 피드백에서 제안한 학습 행동을 학생이 다음 제출에서 실제로 반영했으면, 교감이 느껴지는 문장으로 알아봐 준다. 예: "지난번에 이야기한 부분을 바로 챙겨 준 점이 보여서 반가웠어요."
- 이전 피드백 반영이 분명하면 보너스 광석 +10을 제안할 수 있다. 단, 총 보너스는 10~40 범위를 넘지 않는다.
- 이전 피드백에 대한 학생의 이모티콘 평가나 코멘트가 있으면 다음 피드백에 반영한다. 학생 코멘트에 답하거나, 이해한 바를 짧게 확인해 준다.
- 보너스 광석은 10~40 범위에서 학습량, 균형, 집중도, 기록 품질을 근거로 제안한다. 너무 박하게 깎지 말고 다음 행동을 유도한다.
- 학생을 낙인찍는 표현, "성의 없다", "부족하다" 같은 표현은 피하고 관찰 가능한 행동으로 바꾼다.

[피드백 스타일]
${JSON.stringify(feedbackContext.feedbackGoal || {}, null, 2)}

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
${JSON.stringify(feedbackContext, null, 2)}
`;

  const content = await callGlmChat(
    [{ role: 'user', content: prompt }],
    { json: true, maxTokens: 4096 }
  );

  const parsed = parseJsonResponse(content);
  return {
    ...parsed,
    evidence: Array.isArray(parsed.evidence) && parsed.evidence.length
      ? parsed.evidence
      : feedbackContext.evidence || [],
    generatedBy: 'glm-5.1',
    feedbackStyle: styleKey,
  };
};
