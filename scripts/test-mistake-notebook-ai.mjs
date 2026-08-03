import assert from 'node:assert/strict'
import { parseJsonWithLatexFallback, parseMistakeNotebookAiCardJson } from '../src/utils/mistakeNotebookAi.js'
import { repairLatexControlChars } from '../src/utils/latexTextRepair.js'

const suppliedJson = String.raw`{
  "canPublish": true,
  "questionTitle": "닮은꼴로 나무 높이 구하기",
  "concept": "닮은 삼각형의 대응변의 비",
  "answer": "1번, 약 4.17 m",
  "explanation": "### 핵심 개념\n\n닮은 삼각형에서는 서로 대응하는 변의 길이의 비가 같습니다.\n\n### 풀이\n\n$\frac{1}{0.6}=\frac{x}{2.5}$\n\n$x=\frac{2.5}{0.6}=\frac{25}{6}\approx4.17$\n\n$30\text{ cm}$\n\n### 다음에 떠올릴 점\n\n변의 순서를 같게 유지하세요.",
  "tags": ["닮은꼴", "닮은 삼각형", "대응변의 비"],
  "difficulty": "normal",
  "needsReviewReason": ""
}`

const parsed = parseMistakeNotebookAiCardJson(suppliedJson)
assert.equal(parsed.questionTitle, '닮은꼴로 나무 높이 구하기')
assert.equal(parsed.concept, '닮은 삼각형의 대응변의 비')
assert.equal(parsed.answer, '1번, 약 4.17 m')
assert.match(parsed.explanation, /### 핵심 개념\n\n/)
assert.match(parsed.explanation, /\\frac\{1}/)
assert.match(parsed.explanation, /\\approx4\.17/)
assert.match(parsed.explanation, /\\text\{ cm}/)
assert.doesNotMatch(parsed.explanation, /\\n/)
assert.doesNotMatch(parsed.explanation, /[\t\f\r]/)

const fenced = `\`\`\`json\n${suppliedJson}\n\`\`\``
assert.deepEqual(parseMistakeNotebookAiCardJson(fenced), parsed)

const properlyEscaped = JSON.stringify({
  canPublish: true,
  questionTitle: '정상 JSON',
  concept: '대응변',
  answer: '$x=1$',
  explanation: '### 핵심 개념\n\n$\\frac{1}{2}$\n\n### 풀이\n\n풀이\n\n### 다음에 떠올릴 점\n\n확인',
  tags: ['닮은꼴'],
  difficulty: 'normal',
  needsReviewReason: ''
})
assert.match(parseMistakeNotebookAiCardJson(properlyEscaped).explanation, /\\frac/)

const literalMultiline = suppliedJson.replace('### 핵심 개념\\n\\n', '### 핵심 개념\n\n')
assert.match(parseMistakeNotebookAiCardJson(literalMultiline).explanation, /### 핵심 개념\n\n/)

const generalQuizJson = String.raw`{
  "questions": [{
    "question": "Q",
    "options": ["A", "B"],
    "explanation": "$1\text{ m}$, $2\times3$, $\frac{1}{2}$, $x\neq1$, $\rho$\nNext line"
  }]
}`
const generalQuiz = parseJsonWithLatexFallback(generalQuizJson)
assert.equal(
  generalQuiz.questions[0].explanation,
  '$1\\text{ m}$, $2\\times3$, $\\frac{1}{2}$, $x\\neq1$, $\\rho$\nNext line'
)
assert.equal(parseJsonWithLatexFallback(String.raw`{"value":"first\nNext line"}`).value, 'first\nNext line')
assert.equal(parseJsonWithLatexFallback(String.raw`{"value":"first\nexists as text"}`).value, 'first\nexists as text')
assert.equal(parseJsonWithLatexFallback(String.raw`{"value":"col1\tTabbed"}`).value, 'col1\tTabbed')

assert.equal(repairLatexControlChars('\t' + 'ext{ m}', { assumeMath: true }), '\\text{ m}')
assert.equal(repairLatexControlChars('\f' + 'rac{1}{2}', { assumeMath: true }), '\\frac{1}{2}')
assert.equal(repairLatexControlChars('\r' + 'ight)', { assumeMath: true }), '\\right)')
assert.equal(repairLatexControlChars('\n' + 'exists x', { assumeMath: true }), '\\nexists x')
assert.equal(repairLatexControlChars('$x\nexists y$'), '$x\\nexists y$')
assert.equal(repairLatexControlChars('first\nexists as text'), 'first\nexists as text')
assert.equal(repairLatexControlChars('first\r\nsecond'), 'first\nsecond')
assert.equal(repairLatexControlChars('col1\tcol2'), 'col1\tcol2')

console.log('mistake notebook AI JSON: all cases passed')
