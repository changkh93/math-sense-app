import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  EQUIVALENT_FRACTION_MISSIONS,
  buildEquivalentFraction,
  buildFractionGrid,
  clampOverlayProgress,
  getEquivalentFractionSentence,
  validateEquivalentFractionAnswer,
} from '../src/components/Space/equivalentFractionLabModel.js'

assert.equal(EQUIVALENT_FRACTION_MISSIONS.length, 6, 'guided sequence should have six discoveries')

const halfThirds = buildEquivalentFraction(1, 2, 3)
assert.deepEqual(halfThirds, {
  numerator: 1,
  denominator: 2,
  factor: 3,
  equivalentNumerator: 3,
  equivalentDenominator: 6,
  shadedRatio: 0.5,
  shadedCells: 3,
  totalCells: 6,
})

const grid = buildFractionGrid(2, 3, 2)
assert.equal(grid.length, 6, 'the overlay should make denominator × factor cells')
assert.equal(grid.filter((cell) => cell.shaded).length, 4, 'the shaded count should be numerator × factor')

assert.deepEqual(
  validateEquivalentFractionAnswer({ numerator: 3, denominator: 4, factor: 2 }, '6', '8'),
  {
    correct: true,
    numeratorCorrect: true,
    denominatorCorrect: true,
    expectedNumerator: 6,
    expectedDenominator: 8,
  },
)
assert.equal(validateEquivalentFractionAnswer({ numerator: 2, denominator: 5, factor: 3 }, 5, 15).numeratorCorrect, false)
assert.equal(clampOverlayProgress(-0.5), 0)
assert.equal(clampOverlayProgress(1.8), 1)
assert.equal(getEquivalentFractionSentence({ numerator: 1, denominator: 2, factor: 3 }), '1/2과 3/6은 같은 크기입니다.')

const [spaceHome, app, lab, css] = await Promise.all([
  readFile(new URL('../src/components/Space/SpaceHome.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/Space/EquivalentFractionLab.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/Space/EquivalentFractionLab.css', import.meta.url), 'utf8'),
])

assert.match(spaceHome, /selectedRegionId === 'fractions'/, 'fraction sector should own the entry')
assert.match(spaceHome, /equivalent-fraction-lab-entry/, 'entry needs a stable QA selector')
assert.match(spaceHome, /분수 겹침 렌즈/, 'student-facing experience name should be present')
assert.match(app, /\/dev\/equivalent-fraction-lab/, 'dev QA route should exist')
assert.match(lab, /onPointerDown=\{startDrag\}/, 'transparent overlay needs direct drag input')
assert.match(lab, /type="range"/, 'overlay needs a keyboard-accessible position control')
assert.match(lab, /prefers-reduced-motion/, 'motion preference should be respected')
assert.match(lab, /왕새우쌤과 발견하기/, 'guide mode should use the requested teacher identity')
assert.match(lab, /내 마음대로 관찰/, 'free observation mode should exist')
assert.match(lab, /className="efl-answer-equals"/, 'the equals sign needs a stable alignment hook')
assert.match(css, /@media \(max-width: 620px\)/, 'narrow-screen layout should be defined')
assert.match(css, /touch-action: none/, 'touch drag must not scroll the page mid-gesture')
assert.match(css, /\.efl-answer-equals\s*\{[^}]*grid-row:\s*1 \/ 4;/s, 'the equals sign should span and center across the fraction rows')

console.log('Equivalent fraction lab model and integration contracts passed.')
