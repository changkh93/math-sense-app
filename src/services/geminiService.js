import { GoogleGenAI } from "@google/genai";

// Ensure we have an instance (if the key is missing, handle gracefully)
let genAI = null;
try {
  genAI = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
} catch (e) {
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
    } catch {}
    return 20000; // Default 20 second fallback
};

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
