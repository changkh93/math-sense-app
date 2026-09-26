import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  QUEST_FACTORS,
  QUEST_ZONES,
  buildExpedition,
  buildQuestFact,
  buildQuestFactPool,
  canonicalFactId,
  factPriorityScore,
  getEncounterPrompt,
  getFactStrategy,
  getMasteryBand,
  getZoneProgress,
  insertDelayedRetry,
  recommendQuestZone,
  seedMemoryFromCardLab,
  selectAdaptiveFacts,
  summarizeMemory,
  updateFactMemory,
} from '../src/components/Space/multiplicationQuestModel.js'

assert.deepEqual(QUEST_FACTORS, [2, 3, 4, 5, 6, 7, 8, 9])
assert.equal(QUEST_ZONES.length, 8)
assert.equal(buildQuestFactPool().length, 36)
assert.equal(canonicalFactId(7, 8), canonicalFactId(8, 7))

const seeded = seedMemoryFromCardLab({}, {
  '7x8': { correctCount: 1, wrongCount: 3, hardCount: 2, consecutiveCorrect: 0 },
  '2x4': { correctCount: 5, wrongCount: 0, easyCount: 3, consecutiveCorrect: 4 },
})
assert.equal(seeded['7x8'].attempts, 4)
assert.equal(seeded['7x8'].mastery < seeded['2x4'].mastery, true)
assert.equal(getMasteryBand(seeded['7x8']), 'growing')

const weakFact = buildQuestFact(7, 8)
const knownFact = buildQuestFact(2, 4)
assert.equal(factPriorityScore(weakFact, seeded) > factPriorityScore(knownFact, seeded), true)

const selected = selectAdaptiveFacts(seeded, {
  zoneId: 'moon-citadel',
  count: 8,
  now: Date.parse('2026-09-26T00:00:00Z'),
  random: () => 0.2,
})
assert.equal(selected.length, 8)
assert.equal(new Set(selected.map(({ id }) => id)).size, 8)
assert.equal(selected.filter((fact) => fact.a === 7 || fact.b === 7).length >= 5, true)
assert.equal(selected.some((fact) => fact.id === '7x8'), true)

const expedition = buildExpedition(seeded, {
  zoneId: 'moon-citadel',
  now: Date.parse('2026-09-26T00:00:00Z'),
  random: () => 0.2,
})
assert.equal(expedition.missions.length, 10)
assert.equal(expedition.missions.slice(-2).every(({ isBoss }) => isBoss), true)
assert.deepEqual(getEncounterPrompt(expedition.missions[0]).answer, expedition.missions[0].fact.product)
assert.equal(['reverse', 'missing'].includes(expedition.missions.at(-1).mode), true)
assert.equal(expedition.missions.some(({ mode }) => mode === 'division'), false)
const missingPrompt = getEncounterPrompt(expedition.missions.find(({ mode }) => mode === 'missing'))
assert.match(missingPrompt.expression, /\?/)
assert.equal(missingPrompt.expression.includes('□'), false)
assert.equal(missingPrompt.hasAnswerSuffix, false)

const originalLength = expedition.missions.length
const withRetry = insertDelayedRetry(expedition.missions, 1, expedition.missions[1])
assert.equal(withRetry.length, originalLength + 1)
assert.equal(withRetry[5].fact.id, expedition.missions[1].fact.id)
assert.equal(insertDelayedRetry(withRetry, 5, withRetry[5]).length, withRetry.length)

let memory = {}
memory = updateFactMemory(memory, weakFact, {
  correct: false,
  usedHint: true,
  responseMs: 12000,
  mode: 'direct',
}, { now: Date.parse('2026-09-26T01:00:00Z') })
assert.equal(memory['7x8'].wrong, 1)
assert.equal(memory['7x8'].hintCount, 1)
assert.equal(memory['7x8'].nextDueAt, Date.parse('2026-09-26T01:08:00Z'))

memory = updateFactMemory(memory, weakFact, {
  correct: true,
  usedHint: false,
  responseMs: 4500,
  mode: 'missing',
}, { now: Date.parse('2026-09-26T02:00:00Z') })
assert.equal(memory['7x8'].correct, 1)
assert.equal(memory['7x8'].streak, 1)
assert.equal(memory['7x8'].modes.missing, 1)
assert.equal(memory['7x8'].averageResponseMs > 4500, true)

assert.equal(getFactStrategy(buildQuestFact(9, 7)).equation, '7 × 10 - 7 = 70 - 7 = 63')
assert.equal(getFactStrategy(buildQuestFact(8, 7)).equation, '7 × 4 + 7 × 4 = 28 + 28 = 56')
assert.equal(getFactStrategy(buildQuestFact(9, 7)).hintEquation.includes('63'), false, 'hint must not reveal the final answer')
assert.equal(getFactStrategy(buildQuestFact(8, 7)).hintEquation.includes('56'), false, 'split hint must keep the answer hidden')
assert.equal(recommendQuestZone({}).id, 'ember-ridge')
assert.equal(getZoneProgress(QUEST_ZONES[0], { '2x2': { mastery: 1 } }) > 0, true)
assert.equal(summarizeMemory({ '7x8': { mastery: 0.9, streak: 2 } }).mastered, 1)

const componentSource = readFileSync(new URL('../src/components/Space/MultiplicationQuestGame.jsx', import.meta.url), 'utf8')
assert.equal(componentSource.includes('구구단 원정대'), true)
assert.equal(componentSource.includes('세 장 뒤에 다시 만나요'), true)
assert.equal(componentSource.includes('기억 지도'), true)
assert.equal(componentSource.includes('차분 모드'), true)
assert.equal(componentSource.includes("activityId: 'multiplication_cards'"), true)
assert.equal(componentSource.includes('÷'), false)

const modelSource = readFileSync(new URL('../src/components/Space/multiplicationQuestModel.js', import.meta.url), 'utf8')
assert.equal(modelSource.includes('division'), false)
assert.equal(modelSource.includes('÷'), false)
assert.equal(modelSource.includes('□'), false)

const spaceHomeSource = readFileSync(new URL('../src/components/Space/SpaceHome.jsx', import.meta.url), 'utf8')
const cardsAt = spaceHomeSource.indexOf('testId="times-card-lab-entry"')
const questAt = spaceHomeSource.indexOf('testId="multiplication-quest-entry"')
const bigAt = spaceHomeSource.indexOf('testId="big-multiply-lab-entry"')
assert.equal(cardsAt > -1 && cardsAt < questAt && questAt < bigAt, true)

console.log('multiplication quest model: all checks passed')
