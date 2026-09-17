import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  DIVISION_TABLES,
  buildDivisionFacts,
  buildDivisionGroups,
  buildDivisionRetryQueue,
  buildDivisionStudyPlan,
  divisionFactId,
  selectPracticeDivisionFacts,
  selectWeakDivisionFacts,
  updateConfidenceStats,
  updateFactStats,
} from '../src/components/Space/divisionCardLabModel.js'

assert.deepEqual(DIVISION_TABLES, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
const facts = buildDivisionFacts([8, 2, 8, 99])
assert.equal(facts.length, 24)
assert.equal(new Set(facts.map(({ id }) => id)).size, 24)

const fiftySixByEight = facts.find(({ divisor, quotient }) => divisor === 8 && quotient === 7)
assert.deepEqual(fiftySixByEight, {
  id: '56d8', table: 8, divisor: 8, multiplier: 7, quotient: 7,
  remainder: 0, dividend: 56, answer: 7, sequence: [8, 16, 24, 32, 40, 48, 56],
})
const groups = buildDivisionGroups(fiftySixByEight)
assert.equal(groups.length, 7)
assert.equal(groups.every(({ dots }) => dots.length === 8), true)
assert.equal(groups.at(-1).total, 56)

const eightByTwo = facts.find(({ dividend, divisor }) => dividend === 8 && divisor === 2)
const nineByTwo = facts.find(({ dividend, divisor }) => dividend === 9 && divisor === 2)
assert.equal(eightByTwo.quotient, 4)
assert.equal(eightByTwo.remainder, 0)
assert.equal(nineByTwo.quotient, 4)
assert.equal(nineByTwo.remainder, 1)
assert.equal(facts.filter(({ divisor }) => divisor === 2).length, 12)
assert.equal(facts.filter(({ divisor, remainder }) => divisor === 2 && remainder === 0).length, 6)
assert.equal(facts.filter(({ divisor, remainder }) => divisor === 2 && remainder > 0).length, 6)

let stats = {}
stats = updateFactStats(stats, divisionFactId(8, 7), false, '2026-09-16')
stats = updateConfidenceStats(stats, divisionFactId(8, 4), 'hard', true, '2026-09-16')
const selected = buildDivisionFacts([8])
assert.deepEqual(selectWeakDivisionFacts(selected, stats, '2026-09-17').map(({ id }) => id), ['56d8', '32d8'])
assert.equal(selectPracticeDivisionFacts(stats).length, 2)

const plan = buildDivisionStudyPlan([8], stats, { today: '2026-09-17', random: () => 0.4 })
assert.equal(plan.allFacts.length, 12)
assert.equal(plan.focusFacts.length, 2)
assert.equal(plan.queue.length, 12)
assert.equal(plan.queue.filter(({ phase }) => phase === 'main').length, 10)
assert.equal(buildDivisionRetryQueue(['56d8'], plan.allFacts).at(0).phase, 'retry')

const source = readFileSync(new URL('../src/components/Space/DivisionCardLab.jsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/components/Space/DivisionCardLab.css', import.meta.url), 'utf8')
const audioSource = readFileSync(new URL('../src/components/Space/multiplicationChantAudio.js', import.meta.url), 'utf8')
const spaceHome = readFileSync(new URL('../src/components/Space/SpaceHome.jsx', import.meta.url), 'utf8')
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
assert.equal(source.includes('playMultiplicationChantAudio(currentCard'), true)
assert.equal(source.includes('primeMultiplicationChantAudio'), true)
assert.equal(source.includes('revealTarget: true'), true)
assert.equal(source.includes('currentCard.remainder > 0'), true)
assert.equal(source.includes('아주 쉬워요'), true)
assert.equal(source.includes('조금 어려워요'), true)
assert.equal(source.includes('다시 만나기'), true)
assert.equal(source.includes('기존 구구단 학습 음성 재사용'), false)
assert.equal(source.includes('dcl-object-pool'), true)
assert.equal(source.includes('dcl-people'), true)
assert.equal(source.includes('한 바퀴 나눌 때마다'), false)
assert.equal(source.includes('모두에게 하나씩 줄 때마다'), true)
assert.equal(source.includes('dcl-remainder-pool'), true)
assert.equal(source.includes('나눗셈 나머지'), true)
assert.equal(styles.includes('.dcl-pool-group.is-grouped'), true)
assert.equal(styles.includes('.dcl-person-share i.is-given'), true)
assert.equal(styles.includes('.dcl-remainder-pool.is-revealed'), true)
assert.equal(audioSource.includes('revealTarget ? statements'), true)
assert.equal(spaceHome.indexOf('testId="division-card-lab-entry"') < spaceHome.indexOf('testId="vertical-division-lab-entry"'), true)
assert.equal(app.includes('/dev/division-card-lab'), true)

console.log('division card lab model: all checks passed')
