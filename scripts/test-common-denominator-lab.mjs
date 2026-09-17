import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  COMMON_DENOMINATOR_MISSIONS,
  buildCommonDenominatorPair,
  buildCommonGrid,
  clampLensProgress,
  greatestCommonDivisor,
  leastCommonMultiple,
  validateCommonDenominatorAnswer,
  validateComparison,
} from '../src/components/Space/commonDenominatorLabModel.js'

assert.equal(COMMON_DENOMINATOR_MISSIONS.length, 8, 'guided sequence should contain eight missions')
for (const mission of COMMON_DENOMINATOR_MISSIONS) {
  const missionPair = buildCommonDenominatorPair(mission.left, mission.right)
  assert.ok(missionPair.left.factor > 1, `${mission.id} should subdivide the left card`)
  assert.ok(missionPair.right.factor > 1, `${mission.id} should subdivide the right card`)
  assert.equal(
    missionPair.left.factor,
    missionPair.right.denominator,
    `${mission.id} should create congruent unit rectangles by using the opposite denominator`,
  )
  assert.equal(
    missionPair.right.factor,
    missionPair.left.denominator,
    `${mission.id} should create congruent unit rectangles by using the opposite denominator`,
  )
}
assert.equal(greatestCommonDivisor(12, 18), 6)
assert.equal(leastCommonMultiple(4, 6), 12)
assert.equal(leastCommonMultiple(3, 5), 15)

const pair = buildCommonDenominatorPair([1, 2], [2, 3])
assert.deepEqual(pair, {
  left: { numerator: 1, denominator: 2, factor: 3, commonNumerator: 3 },
  right: { numerator: 2, denominator: 3, factor: 2, commonNumerator: 4 },
  commonDenominator: 6,
  comparison: '<',
})

assert.equal(buildCommonGrid(pair.left, pair.left.factor).length, 6)
assert.equal(buildCommonGrid(pair.left, pair.left.factor).filter((cell) => cell.shaded).length, 3)
assert.equal(buildCommonGrid(pair.right, pair.right.factor).filter((cell) => cell.shaded).length, 4)

assert.deepEqual(
  validateCommonDenominatorAnswer(pair, {
    leftNumerator: '3',
    leftDenominator: '6',
    rightNumerator: '4',
    rightDenominator: '6',
  }),
  {
    leftNumerator: true,
    leftDenominator: true,
    rightNumerator: true,
    rightDenominator: true,
    correct: true,
  },
)
assert.equal(validateCommonDenominatorAnswer(pair, { leftNumerator: 2 }).correct, false)
assert.equal(validateComparison(pair, '<'), true)
assert.equal(validateComparison(pair, '>'), false)
assert.equal(clampLensProgress(-1), 0)
assert.equal(clampLensProgress(2), 1)

const [spaceHome, app, lab, css] = await Promise.all([
  readFile(new URL('../src/components/Space/SpaceHome.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/Space/CommonDenominatorLab.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/Space/CommonDenominatorLab.css', import.meta.url), 'utf8'),
])

assert.match(spaceHome, /common-denominator-lab-entry/, 'fraction sector should expose the separate lab card')
assert.match(spaceHome, /통분 렌즈 연구소/, 'student-facing lab title should be present')
assert.match(app, /\/dev\/common-denominator-lab/, 'dev QA route should exist')
assert.match(lab, /type="range"/, 'the synchronized lenses need a keyboard-accessible control')
assert.match(lab, /두 렌즈 겹치기/, 'the overlay action should be student-facing')
assert.doesNotMatch(lab, />1\//, 'visible unit fractions should not use slash notation')
assert.match(lab, /옆 분수의/, 'each card should explain how the other denominator drives subdivision')
assert.match(lab, /\['<', '=', '>'\]/, 'comparison choices should be part of every mission')
assert.match(css, /aspect-ratio: 1 \/ 1/, 'fraction paper cards should be square')
assert.match(css, /cdl-paper-card\.is-snapped \.cdl-base-slices i/, 'completed overlay should hide the original vertical border layer')
assert.match(css, /background-size:[\s\S]*var\(--columns\)[\s\S]*var\(--rows\)/, 'completed overlay should draw one shared grid layer')
assert.match(css, /@media \(max-width: 720px\)/, 'narrow-screen layout should exist')
assert.match(css, /prefers-reduced-motion/, 'reduced motion should be supported')

console.log('Common denominator lab model and integration contracts passed.')
