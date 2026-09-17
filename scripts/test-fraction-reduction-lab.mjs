import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  FRACTION_REDUCTION_MISSIONS,
  buildBundles,
  buildFactorChoices,
  getCommonFactors,
  getSimplestFraction,
  isCommonFactor,
  reduceFraction,
  validateReductionAnswer,
} from '../src/components/Space/fractionReductionLabModel.js'

assert.equal(FRACTION_REDUCTION_MISSIONS.length, 18, 'guided sequence should provide substantially more reduction practice')
assert.deepEqual(FRACTION_REDUCTION_MISSIONS[0].fraction, [2, 10], 'the first mission should show 2/10 as two cells per floor')
assert.equal(FRACTION_REDUCTION_MISSIONS[0].suggestedFactor, 2, '2/10 should recommend its greatest common factor')
assert.deepEqual(FRACTION_REDUCTION_MISSIONS[1].fraction, [6, 9], 'the second mission should show 6/9 as three cells per floor')
assert.equal(FRACTION_REDUCTION_MISSIONS[1].suggestedFactor, 3, '6/9 should recommend its greatest common factor')
assert.deepEqual(FRACTION_REDUCTION_MISSIONS[2].fraction, [2, 7], 'the irreducible mission should use 2/7')
assert.equal(FRACTION_REDUCTION_MISSIONS[2].layoutFactor, 1, '2/7 should be drawn as one column with seven equal horizontal cells')
assert.equal(FRACTION_REDUCTION_MISSIONS[2].suggestedFactor, null, '2/7 must not imply that 2 is a common factor')
assert.ok(
  FRACTION_REDUCTION_MISSIONS.filter(({ fraction }) => getCommonFactors(...fraction).length === 0).length >= 4,
  'the practice set should include several irreducible fractions',
)
assert.ok(
  FRACTION_REDUCTION_MISSIONS.filter(({ fraction }) => getCommonFactors(...fraction).length >= 3).length >= 4,
  'the practice set should include several fractions with multiple valid reduction paths',
)
assert.deepEqual(getCommonFactors(8, 12), [2, 4])
assert.deepEqual(getCommonFactors(12, 18), [2, 3, 6])
assert.equal(isCommonFactor(8, 12, 4), true)
assert.equal(isCommonFactor(8, 12, 3), false)

assert.deepEqual(buildBundles(6, 2), {
  groups: [[0, 1], [2, 3], [4, 5]],
  remainder: [],
  complete: true,
})
assert.deepEqual(buildBundles(8, 3), {
  groups: [[0, 1, 2], [3, 4, 5]],
  remainder: [6, 7],
  complete: false,
})

assert.deepEqual(reduceFraction(8, 12, 2), {
  numerator: 4,
  denominator: 6,
  factor: 2,
  simplest: false,
})
assert.deepEqual(reduceFraction(12, 18, 2), {
  numerator: 6,
  denominator: 9,
  factor: 2,
  simplest: false,
})
assert.deepEqual(reduceFraction(6, 9, 3), {
  numerator: 2,
  denominator: 3,
  factor: 3,
  simplest: true,
})
assert.deepEqual(reduceFraction(4, 6, 2), {
  numerator: 2,
  denominator: 3,
  factor: 2,
  simplest: true,
})
assert.deepEqual(reduceFraction(8, 12, 4), {
  numerator: 2,
  denominator: 3,
  factor: 4,
  simplest: true,
})
assert.equal(reduceFraction(8, 12, 3), null)
assert.deepEqual(getSimplestFraction(18, 24), { numerator: 3, denominator: 4 })
assert.equal(validateReductionAnswer(8, 12, 4, { numerator: '2', denominator: '3' }).correct, true)
assert.equal(validateReductionAnswer(8, 12, 4, { numerator: '2', denominator: '4' }).correct, false)
assert.ok(buildFactorChoices(8, 12).includes(3), 'factor choices should include an invalid factor to reveal leftovers')
assert.deepEqual(buildFactorChoices(12, 18).filter((factor) => [2, 3, 6].includes(factor)), [2, 3, 6], 'all common-factor paths should be offered')

const [spaceHome, app, lab, css] = await Promise.all([
  readFile(new URL('../src/components/Space/SpaceHome.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/Space/FractionReductionLab.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/Space/FractionReductionLab.css', import.meta.url), 'utf8'),
])

assert.match(spaceHome, /fraction-reduction-lab-entry/, 'fraction sector should expose the reduction lab card')
assert.match(spaceHome, /약분 묶음 연구소/, 'student-facing lab title should be present')
assert.match(app, /\/dev\/fraction-reduction-lab/, 'dev QA route should exist')
assert.match(lab, /마지막에 남는 칸/, 'invalid grouping should make the leftover building cell explicit')
assert.match(lab, /분자와 분모를 동시에 나눌 수 있는 수를 찾으세요/, 'the prompt should directly ask for a common divisor')
assert.match(lab, /동시에 나눌 수 있는 수가 없어요/, 'irreducible fractions should offer an explicit no-common-factor choice')
assert.match(lab, /묶음마다 하나의 큰 방으로 바꾸기/, 'reduction needs an explicit building-compression action')
assert.match(lab, /지금 모습이 가장 간단한 분수/, 'completion should name the simplest fraction')
assert.match(lab, /frl-building-cell/, 'fraction values should be represented inside one square building')
assert.match(lab, /greatestCommonDivisor\(visualCurrent\.numerator, visualCurrent\.denominator\)/, 'each reduction step should rebuild the observation grid for the current fraction')
assert.match(lab, /groupFactor={visualFactor}/, 'candidate choices should add grouping lines without redrawing the source grid')
assert.match(lab, /showGrouping && groupFactor && groups\.map/, 'grouping lines should appear only after a candidate is selected')
assert.ok(
  lab.indexOf('<rect className="frl-building-frame"') < lab.indexOf('{showGrouping && groupFactor && groups.map'),
  'group outlines should render above the outer building frame so perimeter grouping remains visible',
)
assert.match(lab, /const factorValid = isCommonFactor\(current\.numerator, current\.denominator, selectedFactor\)/, 'every common factor should be accepted as a valid reduction step')
assert.doesNotMatch(lab, /selectedFactor === expectedFactor/, 'validity must not be restricted to only the greatest common factor')
assert.match(lab, /분모 7에 맞춰 나눈 7칸과 색칠한 2칸/, '2/7 should explicitly preserve seven denominator cells and two shaded numerator cells')
assert.doesNotMatch(lab, />\s*\d+\s*\/\s*\d+\s*</, 'visible fractions should not use slash notation')
assert.match(css, /\.frl-building-leftover/, 'leftover building-cell styling should exist')
assert.match(css, /\.frl-building-group\.is-mixed/, 'a group that crosses the shaded boundary should be visibly invalid')
assert.match(css, /\.frl-building-group[^}]*stroke:\s*#5b3cc4/, 'valid grouping outlines should use a dark high-contrast color')
assert.match(css, /\.frl-factor-picker button\.is-none/, 'the irreducible-answer choice should span the picker width')
assert.doesNotMatch(css, /@keyframes frl-group-pulse/, 'valid grouping outlines should stay violet instead of cycling to another color')
assert.match(css, /aspect-ratio: 1 \/ 1/, 'the fraction building should remain square')
assert.match(css, /@media \(max-width: 720px\)/, 'narrow-screen layout should exist')
assert.match(css, /prefers-reduced-motion/, 'reduced motion should be supported')

console.log('Fraction reduction lab model and integration contracts passed.')
