import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { sanitizeLearningSummaryForCourse } from '../src/services/coursePolicyUtils.js'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const components = [
  ['src/components/Space/MultiplicationCardLab.jsx', 'multiplication_cards', 'card-${currentCard.table}x${currentCard.multiplier}'],
  ['src/components/Space/DivisionCardLab.jsx', 'division_cards', 'card-${currentCard.dividend}d${currentCard.divisor}'],
  ['src/components/Space/VerticalMultiplicationLab.jsx', 'vertical_multiplication', 'mission-${missionIndex + 1}'],
  ['src/components/Space/VerticalDivisionLab.jsx', 'vertical_division', 'mission-${missionIndex + 1}'],
]

for (const [path, activityId, completionKey] of components) {
  const source = read(path)
  assert.ok(source.includes(`activityId: '${activityId}'`), `${path} claims ${activityId}`)
  assert.ok(source.includes(completionKey), `${path} sends the completion unit`)
  assert.ok(source.includes('InteractiveLearningRewardNotice'), `${path} shows reward state`)
}

const history = read('src/hooks/useLearningHistory.js')
assert.ok(history.includes("hType === 'interactive_learning'"))
assert.ok(history.includes("tType === 'interactive_learning_reward'"))
assert.ok(history.includes("normalizedType = 'experience'"))

for (const path of ['src/services/assignmentFeedbackService.js', 'scripts/export-pending-assignment-contexts.mjs']) {
  const source = read(path)
  assert.ok(source.includes('interactiveLearningCount'), `${path} exports the count`)
  assert.ok(source.includes('interactiveLearnings'), `${path} exports detail rows`)
  assert.ok(source.includes("'interactive_learning'"), `${path} separates the activity from quizzes`)
}

const manual = read('docs/manual-assignment-feedback-workflow.md')
assert.ok(manual.includes('NEW · 체험 학습 일일 기록·보상·과제 피드백 체크리스트'))
assert.ok(manual.includes('suggestedBonusCrystals') && manual.includes('다시 지급하지 않는다'))
assert.ok(manual.includes('카드 정답 1개') && manual.includes('3광석'))
assert.ok(manual.includes('세로셈 미션 1개') && manual.includes('10광석'))

const coursePolicy = read('src/services/coursePolicyUtils.js')
assert.ok(coursePolicy.includes("normalizedCourse !== 'cluster_elementary'"), 'non-elementary prompts strip interactive learning')
const sampleSummary = { interactiveLearningCount: 2, interactiveLearningCrystalsEarned: 6, interactiveLearnings: [{ title: '큰곱셈 조립소' }] }
assert.equal(sanitizeLearningSummaryForCourse(sampleSummary, 'cluster_elementary').interactiveLearningCount, 2)
assert.equal(sanitizeLearningSummaryForCourse(sampleSummary, 'python').interactiveLearningCount, 0)
assert.equal(sanitizeLearningSummaryForCourse(sampleSummary, 'middle-math').interactiveLearnings, undefined)

console.log('interactive learning reward contract: OK')
