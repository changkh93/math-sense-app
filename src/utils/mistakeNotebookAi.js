import { isKnownLatexCommand } from './latexTextRepair.js'

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
 * AI JSON을 문자열 단위로 스캔하여 복구한다.
 *
 * AI가 multiline explanation을 코드블록 안에 literal 엔터로 그대로 넣어
 * invalid JSON을 반환하는 경우가 잦은데, 이때 단순히 `/[\r\n]/g → '\n'`를
 * 하면 키-값 사이의 **구조 줄바꿈까지** `\n`으로 바뀌어 `{\\n"key"...}` 처럼
 * 되어 position 1에서 파싱이 실패한다. 그래서 문자열 안쪽인지 추적하며
 * 이스케이프해야 한다. 동시에 `\frac`, `\text`, `\times`, `\pi`
 * 같은 단일 백슬래시 LaTeX는 JSON.parse 전에 보호한다.
 */
function repairAiJsonStrings(text) {
  let result = ''
  let inString = false
  let inMath = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (!inString) {
      result += ch
      if (ch === '"') {
        inString = true
        inMath = false
      }
    } else if (ch === '\\') {
      const next = text[i + 1]
      const isStructuralEscape = ['"', '\\', '/'].includes(next)
      const isUnicodeEscape = next === 'u' && /^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))
      const command = text.slice(i + 1).match(/^[A-Za-z]+/)?.[0] || ''
      const isAmbiguousControlEscape = ['b', 'f', 'n', 'r', 't'].includes(next)
      const shouldProtectLatex = inMath && isKnownLatexCommand(command)

      if (isStructuralEscape || isUnicodeEscape || (isAmbiguousControlEscape && !shouldProtectLatex)) {
        result += ch + next
        i += 1
      } else {
        result += '\\\\'
      }
    } else if (ch === '"') {
      result += ch
      inString = false
      inMath = false
    } else if (ch === '$') {
      const delimiterLength = text[i + 1] === '$' ? 2 : 1
      result += text.slice(i, i + delimiterLength)
      i += delimiterLength - 1
      inMath = !inMath
    } else if (ch === '\n') {
      result += '\\n'
    } else if (ch === '\r') {
      result += '\\r'
    } else if (ch === '\t') {
      result += '\\t'
    } else {
      result += ch
    }
  }
  return result
}

/**
 * AI가 반환한 JSON을 안전하게 파싱한다.
 *
 * 구조 줄바꿈은 보존하고 문자열 안의 literal 제어문자와
 * 단일 백슬래시 LaTeX만 복구한 뒤 파싱한다.
 */
export function parseJsonWithLatexFallback(cleanJson) {
  return JSON.parse(repairAiJsonStrings(cleanJson))
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
