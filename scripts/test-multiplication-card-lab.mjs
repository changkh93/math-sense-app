import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  MULTIPLICATION_TABLES,
  buildMultiplicationChant,
  buildMultiplicationQuestion,
  buildMultiplicationStatement,
  buildMultiplicationGrid,
  buildMultiplicationFacts,
  buildRetryQueue,
  buildStudyPlan,
  multiplicationFactId,
  selectPracticeFacts,
  selectWeakFacts,
  toKoreanNumber,
  updateConfidenceStats,
  updateFactStats,
} from '../src/components/Space/multiplicationCardLabModel.js'

assert.deepEqual(MULTIPLICATION_TABLES, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])

const selectedFacts = buildMultiplicationFacts([4, 2, 3, 3, 99])
assert.equal(selectedFacts.length, 36)
assert.equal(new Set(selectedFacts.map(({ id }) => id)).size, 36)
assert.equal(selectedFacts[0].id, '2x1')
assert.equal(selectedFacts.at(-1).id, '4x12')
assert.deepEqual(selectedFacts.find(({ id }) => id === '8x7'), undefined)

const eightBySeven = buildMultiplicationFacts([8]).find(({ multiplier }) => multiplier === 7)
assert.deepEqual(eightBySeven.sequence, [8, 16, 24, 32, 40, 48, 56])
const eightBySevenGrid = buildMultiplicationGrid(eightBySeven)
assert.equal(eightBySevenGrid.length, 8)
assert.equal(eightBySevenGrid.every((row) => row.length === 12), true)
assert.equal(eightBySevenGrid.flat().filter(({ isArea }) => isArea).length, 56)
assert.equal(eightBySevenGrid[0][6].product, 56)
assert.equal(eightBySevenGrid[0][6].isTarget, true)
assert.deepEqual(eightBySevenGrid[0].slice(0, 7).map(({ product }) => product), [8, 16, 24, 32, 40, 48, 56])
assert.equal(toKoreanNumber(16), '십육')
assert.equal(toKoreanNumber(80), '팔십')
assert.equal(toKoreanNumber(144), '백사십사')
const twoByEightChant = buildMultiplicationChant({ table: 2, multiplier: 8 })
assert.deepEqual(twoByEightChant, [
  '이 일은 이', '이 이는 사', '이 삼은 육', '이 사 팔',
  '이 오 십', '이 육 십이', '이 칠 십사', '이 팔은?',
])
assert.equal(buildMultiplicationStatement(3, 1), '삼 일은 삼')
assert.equal(buildMultiplicationStatement(3, 2), '삼 이는 육')
assert.equal(buildMultiplicationStatement(3, 3), '삼 삼은 구')
assert.equal(buildMultiplicationStatement(3, 4), '삼 사 십이')
assert.equal(buildMultiplicationStatement(4, 1), '사 일은 사')
assert.equal(buildMultiplicationStatement(4, 2), '사 이 팔')
assert.equal(buildMultiplicationStatement(4, 3), '사 삼 십이')
assert.equal(buildMultiplicationStatement(9, 1), '구 일은 구')
assert.equal(buildMultiplicationStatement(9, 2), '구 이 십팔')
assert.equal(buildMultiplicationStatement(12, 12), '십이 곱하기 십이는 백사십사')
assert.equal(buildMultiplicationQuestion(3, 12), '삼 곱하기 십이는?')
assert.equal(buildMultiplicationQuestion(2, 8), '이 팔은?')

let stats = {}
stats = updateFactStats(stats, multiplicationFactId(3, 7), false, '2026-09-16')
stats = updateFactStats(stats, multiplicationFactId(3, 7), false, '2026-09-16')
stats = updateFactStats(stats, multiplicationFactId(4, 8), false, '2026-09-17')
stats = updateFactStats(stats, multiplicationFactId(2, 5), true, '2026-09-16')

const weak = selectWeakFacts(buildMultiplicationFacts([2, 3, 4]), stats, '2026-09-17')
assert.deepEqual(weak.map(({ id }) => id), ['3x7'])

const plan = buildStudyPlan([2, 3, 4], stats, { today: '2026-09-17', random: () => 0.4 })
assert.equal(plan.allFacts.length, 36)
assert.equal(plan.focusFacts.length, 1)
assert.equal(plan.queue.length, 37)
assert.equal(plan.queue.filter(({ phase }) => phase === 'main').length, 36)
assert.equal(new Set(plan.queue.filter(({ phase }) => phase === 'main').map(({ id }) => id)).size, 36)

const retry = buildRetryQueue(['2x3', '4x8', '2x3'], plan.allFacts, () => 0.2)
assert.equal(retry.length, 2)
assert.equal(retry.every(({ phase }) => phase === 'retry'), true)

stats = updateFactStats(stats, '5x6', true, '2026-09-17')
stats = updateConfidenceStats(stats, '5x6', 'hard', true, '2026-09-17')
assert.equal(stats['5x6'].needsPractice, true)
assert.equal(selectPracticeFacts(stats).some(({ id }) => id === '5x6'), true)
const practiceOnlyPlan = buildStudyPlan([], stats, { includePractice: true, today: '2026-09-17', random: () => 0.3 })
assert.equal(practiceOnlyPlan.practiceFacts.length >= 3, true)
assert.equal(practiceOnlyPlan.queue.every(({ phase }) => phase === 'practice'), true)
stats = updateConfidenceStats(stats, '5x6', 'easy', true, '2026-09-17')
assert.equal(stats['5x6'].needsPractice, false)
assert.equal(selectPracticeFacts(stats).some(({ id }) => id === '5x6'), false)
stats = updateConfidenceStats(stats, '4x8', 'easy', false, '2026-09-17')
assert.equal(stats['4x8'].needsPractice, true)
const legacyPractice = updateFactStats({ '9x7': { wrongCount: 2 } }, '9x7', true, '2026-09-17')
assert.equal(legacyPractice['9x7'].needsPractice, true)

const spaceHomeSource = readFileSync(new URL('../src/components/Space/SpaceHome.jsx', import.meta.url), 'utf8')
const chapterCardsAt = spaceHomeSource.indexOf('chapters?.map(chapter =>')
const experienceSectionAt = spaceHomeSource.indexOf('multiplication-experience-title')
const timesCardAt = spaceHomeSource.indexOf('testId="times-card-lab-entry"')
const multiplicationQuestAt = spaceHomeSource.indexOf('testId="multiplication-quest-entry"')
const bigMultiplyAt = spaceHomeSource.indexOf('testId="big-multiply-lab-entry"')
const bottomReturnAt = spaceHomeSource.indexOf('{/* Unified Bottom Back Button */}')
assert.equal(chapterCardsAt > -1, true)
assert.equal(chapterCardsAt < experienceSectionAt, true)
assert.equal(experienceSectionAt < timesCardAt, true)
assert.equal(timesCardAt < multiplicationQuestAt, true)
assert.equal(multiplicationQuestAt < bigMultiplyAt, true)
assert.equal(bigMultiplyAt < bottomReturnAt, true)

const cardLabSource = readFileSync(new URL('../src/components/Space/MultiplicationCardLab.jsx', import.meta.url), 'utf8')
assert.equal(cardLabSource.includes('아주 쉬워요'), true)
assert.equal(cardLabSource.includes('조금 어려워요'), true)
assert.equal(cardLabSource.includes('한 번 더!'), true)
assert.equal(cardLabSource.includes('구구단 다시 듣기'), true)
assert.equal(cardLabSource.includes('AI로 만든 학습 음성'), true)
assert.equal(cardLabSource.includes('playMultiplicationChantAudio'), true)
assert.equal(cardLabSource.includes('utterance.rate = 1.45'), true)

const manifestUrl = new URL('../public/sounds/multiplication/v1/manifest.json', import.meta.url)
const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8'))
assert.equal(manifest.model, 'gpt-audio-1.5')
assert.equal(manifest.voice, 'marin')
assert.deepEqual(Object.keys(manifest.tables).map(Number), MULTIPLICATION_TABLES)
for (const table of MULTIPLICATION_TABLES) {
  const tableAudio = manifest.tables[String(table)]
  assert.equal(tableAudio.statements.length, 12)
  assert.equal(tableAudio.questions.length, 12)
  assert.deepEqual(
    tableAudio.statements.map(({ text }) => text),
    Array.from({ length: 12 }, (_, index) => buildMultiplicationStatement(table, index + 1)),
  )
  assert.deepEqual(
    tableAudio.questions.map(({ text }) => text),
    Array.from({ length: 12 }, (_, index) => buildMultiplicationQuestion(table, index + 1)),
  )
  const audioFile = fileURLToPath(new URL(`../public${tableAudio.src}`, import.meta.url))
  assert.equal(statSync(audioFile).size > 100_000, true)
}

console.log('multiplication card lab model: all checks passed')
