export function buildMistakeNotebookStarterExplanation(upload) {
  const hints = [
    upload?.questionText ? `문제: ${upload.questionText}` : '',
    upload?.note ? `학생 메모: ${upload.note}` : '',
    '핵심 개념:',
    '풀이:',
    '다음에 확인할 포인트:'
  ].filter(Boolean)
  return hints.join('\n\n')
}

export function buildMistakeNotebookAiPrompt(upload) {
  const options = Array.isArray(upload?.sourceOptions) && upload.sourceOptions.length > 0
    ? upload.sourceOptions.map((option, index) => `${index + 1}. ${option}`).join('\n')
    : '없음'
  const existingTags = Array.isArray(upload?.tags) && upload.tags.length > 0 ? upload.tags.join(', ') : '없음'

  return `첨부된 이미지를 보고 학생용 오답노트 플래시카드 뒷면을 완성해 주세요.

이미지를 함께 첨부했습니다. 만약 이미지 첨부가 보이지 않는다면 아래 imageUrl을 참고하되, 이미지 내용을 직접 확인할 수 없으면 canPublish를 false로 반환하세요.

imageUrl: ${upload?.imageUrl || '없음'}
학생 이름: ${upload?.userName || '알 수 없음'}
학생이 입력한 제목: ${upload?.title || '없음'}
학생 메모: ${upload?.note || '없음'}
문제 텍스트: ${upload?.questionText || '이미지에 있음'}
선택지:
${options}
기존 태그: ${existingTags}

작성 원칙:
- 이미지/문제에서 확인되는 내용만 사용하세요.
- 정답을 확정할 수 없거나 이미지가 잘려 있으면 canPublish를 false로 반환하세요.
- 카드 제목은 문제의 핵심 개념이 드러나게 짧게 쓰세요.
- answer는 학생이 외워야 할 최종 정답만 간결하게 쓰세요. 선택형이면 번호와 값을 함께 쓰세요.
- explanation은 반드시 Markdown 형식으로 쓰고, 아래 3개 제목을 포함하세요.
  - ### 핵심 개념
  - ### 풀이
  - ### 다음에 떠올릴 점
- 수식은 인라인 LaTeX $...$ 형식을 사용하세요. 예: $y=a(x-r_1)(x-r_2)$
- 수식 안에 한글이나 영문 텍스트(예: '또는', '일 때', 'or')가 들어갈 때는 반드시 \\text{...}로 감싸세요. (예: $x=1\\text{ 또는 }x=7$, $30\\text{ cm}$). $...$ 안에 \\text{} 없이 한글이나 일반 단어를 그대로 적지 마세요.
- 태그는 3~8개로 작성하세요.
- difficulty는 반드시 "light", "normal", "hard" 중 하나만 사용하세요.
- 학생을 평가하거나 비난하지 말고, 복습에 바로 쓸 수 있게 명확하게 작성하세요.

반드시 아래 JSON 형식만 반환하세요. 설명 문장이나 주석을 JSON 밖에 쓰지 마세요.

\`\`\`json
{
  "canPublish": true,
  "questionTitle": "카드 제목",
  "concept": "핵심 개념명",
  "answer": "최종 정답",
  "explanation": "### 핵심 개념\\n\\n...\\n\\n### 풀이\\n\\n...\\n\\n### 다음에 떠올릴 점\\n\\n...",
  "tags": ["태그1", "태그2", "태그3"],
  "difficulty": "normal",
  "needsReviewReason": ""
}
\`\`\`

발행할 수 없는 경우:

\`\`\`json
{
  "canPublish": false,
  "questionTitle": "",
  "concept": "",
  "answer": "",
  "explanation": "",
  "tags": [],
  "difficulty": "normal",
  "needsReviewReason": "정답을 확정할 수 없는 이유"
}
\`\`\``
}

/**
 * AI가 반환한 JSON 텍스트에서 JSON 문법상 허용되지 않는 백슬래시 이스케이프를
 * 사전에 안전하게 만든다. 핵심은 **보수적으로** 동작하는 것.
 *
 * `\t` `\f` `\n` `\r` `\b` `\v` 는 JSON 공식 이스케이프라 `JSON.parse`가 각각
 * 제어문자(TAB/FF/LF/CR/BS/VT)로 바꿔 버리는데, 이는 LaTeX 명령어(`\text`,
 * `\frac`, `\neq` ...)가 단일 백슬래시로 들어왔을 때 백슬래시가 사라지는
 * 근원이다. 하지만 이들을 여기서 임의로 이중화하면 **정상 줄바꿈(`\n`)까지
 * literal `\n` 글자로 굳어지는 회귀**가 생긴다.
 *
 * 그래서 여기서는 valid escape(`" \ / b f n r t u`)가 아닌 invalid escape
 * (`\pi`, `\alpha`, `\sqrt`, `\Delta` 등)만 이중화한다. valid escape로
 * 인해 생긴 제어문자 손상은 `JSON.parse` 이후에 `sanitizeLaTeX`(렌더)가
 * TAB→`\t`, CR→`\r` 역변환으로 복원한다. 즉 이 함수는 'invalid JSON'만 막고,
 * 'valid-but-unwanted JSON'은 렌더 단에 맡긴다.
 *
 * 추가로 모델이 코드블록 안에 literal 줄바꿈을 그대로 넣은 invalid multiline
 * JSON도 정상 이스케이프로 바로잡는다.
 */
export function neutralizeLatexInJson(text) {
  return text
    .replace(/(?<!\\)\\(?!["\\/bfnrtu])/g, '\\\\')
    .replace(/\r\n/g, '\\n')
    .replace(/[\r\n]/g, '\\n')
    .replace(/\t/g, '\\t')
}

export function parseJsonWithLatexFallback(cleanJson) {
  try {
    return JSON.parse(neutralizeLatexInJson(cleanJson))
  } catch (error) {
    try {
      return JSON.parse(cleanJson)
    } catch {
      throw error
    }
  }
}

export function parseMistakeNotebookAiCardJson(rawText) {
  const jsonMatch = String(rawText || '').match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const cleanJson = jsonMatch ? jsonMatch[1] : String(rawText || '').trim()
  const parsed = parseJsonWithLatexFallback(cleanJson)
  if (parsed.canPublish === false) {
    throw new Error(parsed.needsReviewReason || 'AI가 발행 불가로 판단했습니다.')
  }

  const requiredFields = ['questionTitle', 'concept', 'answer', 'explanation']
  const missing = requiredFields.filter(field => !String(parsed[field] || '').trim())
  if (missing.length > 0) {
    throw new Error(`필수 필드가 비어 있습니다: ${missing.join(', ')}`)
  }

  const difficulty = ['light', 'normal', 'hard'].includes(parsed.difficulty) ? parsed.difficulty : 'normal'
  const tags = Array.isArray(parsed.tags)
    ? parsed.tags.map(tag => String(tag || '').trim()).filter(Boolean)
    : String(parsed.tags || '').split(',').map(tag => tag.trim()).filter(Boolean)

  return {
    questionTitle: String(parsed.questionTitle || '').trim().slice(0, 140),
    concept: String(parsed.concept || '').trim().slice(0, 120),
    answer: String(parsed.answer || '').trim(),
    explanation: String(parsed.explanation || '').trim(),
    tags: tags.slice(0, 12).join(', '),
    difficulty
  }
}
