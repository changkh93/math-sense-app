import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  DIVISION_ZONES,
  VERTICAL_DIVISION_PROBLEMS,
  buildDivisionBoardState,
  buildVerticalDivision,
  getDivisionStepCopy,
  getProblemZone,
  validateDivisionStep,
} from '../src/components/Space/verticalDivisionLabModel.js'

assert.equal(VERTICAL_DIVISION_PROBLEMS.length, 20)
assert.equal(DIVISION_ZONES.length, 5)
assert.deepEqual(DIVISION_ZONES.map((zone) => zone.range), [[0, 3], [4, 7], [8, 11], [12, 15], [16, 19]])

for (const [index, problem] of VERTICAL_DIVISION_PROBLEMS.entries()) {
  const mission = buildVerticalDivision(problem)
  assert.equal(mission.quotient, Math.floor(problem.dividend / problem.divisor), `${index + 1}: quotient`)
  assert.equal(mission.remainder, problem.dividend % problem.divisor, `${index + 1}: remainder`)
  assert.ok(mission.steps.length >= 3, `${index + 1}: has interactive steps`)
  assert.ok(['canDivide', 'quotient'].includes(mission.steps[0].type))
  assert.ok(mission.steps.some((step) => step.type === 'quotient'))
  assert.ok(['subtract', 'quotient'].includes(mission.steps.at(-1).type))
  assert.equal(getProblemZone(index).range[0] <= index, true)
  for (const step of mission.steps) {
    assert.equal(validateDivisionStep(step, String(step.expected)), true, `${step.id}: accepts answer`)
    assert.equal(validateDivisionStep(step, ''), false, `${step.id}: rejects empty`)
    assert.equal(validateDivisionStep(step, String(step.expected + 1)), false, `${step.id}: rejects wrong`)
    const copy = getDivisionStepCopy(step, 2, problem.divisor)
    assert.ok(copy.title && copy.instruction && copy.hint)
  }
}

const zeroMission = buildVerticalDivision(VERTICAL_DIVISION_PROBLEMS.find((problem) => problem.dividend === 408))
assert.equal(zeroMission.quotient, 102)
assert.deepEqual(zeroMission.quotientCells, [1, 0, 2])
assert.equal(zeroMission.cycles[1].partialDividend, 0)
assert.equal(zeroMission.cycles[1].quotientDigit, 0)
assert.equal(zeroMission.cycles[1].skipArithmetic, true)
assert.deepEqual(zeroMission.steps.filter((step) => step.cycleIndex === 1).map((step) => step.type), ['quotient', 'bringDown'])
assert.equal(zeroMission.steps.some((step) => step.cycleIndex === 1 && ['multiply', 'subtract'].includes(step.type)), false)
const zeroBridgeBringDown = zeroMission.steps.find((step) => step.cycleIndex === 1 && step.type === 'bringDown')
assert.equal(zeroBridgeBringDown.nextDigit, 8)
assert.match(getDivisionStepCopy(zeroBridgeBringDown, 0, 4).instruction, /곱하고 다시 빼는 과정은 건너뛰어도/)

const firstBringDown = zeroMission.steps.find((step) => step.type === 'bringDown')
assert.equal(firstBringDown.nextDigit, 0)
assert.equal(firstBringDown.combinedAfterBringDown, 0)
const afterBringDown = buildDivisionBoardState(zeroMission, firstBringDown.index + 1)
assert.equal(afterBringDown.cycleStates[firstBringDown.cycleIndex].broughtDigit, '0')

const leadingPairMission = buildVerticalDivision(VERTICAL_DIVISION_PROBLEMS.find((problem) => problem.dividend === 1248))
assert.equal(leadingPairMission.cycles[0].partialDividend, 12)
assert.equal(leadingPairMission.cycles[0].columnIndex, 1)
assert.deepEqual(leadingPairMission.quotientCells, [null, 1, 0, 4])
assert.equal(leadingPairMission.cycles[1].skipArithmetic, true)
assert.equal(leadingPairMission.cycles[1].partialDividend, 4)
assert.deepEqual(leadingPairMission.steps.filter((step) => step.cycleIndex === 1).map((step) => step.type), ['quotient', 'bringDown'])
const retainedPartialBringDown = leadingPairMission.steps.find((step) => step.cycleIndex === 1 && step.type === 'bringDown')
assert.equal(retainedPartialBringDown.combinedAfterBringDown, 48)
assert.match(getDivisionStepCopy(retainedPartialBringDown, 0, 12).instruction, /남아 있는 수 4도 계산에 꼭 필요해요/)
assert.match(getDivisionStepCopy(retainedPartialBringDown, 0, 12).instruction, /8을 오른쪽에 내려 48/)

const twoDigitMission = buildVerticalDivision(VERTICAL_DIVISION_PROBLEMS.find((problem) => problem.dividend === 42))
assert.equal(twoDigitMission.steps[0].placeName, '십')
assert.match(getDivisionStepCopy(twoDigitMission.steps[0], 0, 2).instruction, /십의 자리 수 4/)
assert.match(getDivisionStepCopy(twoDigitMission.steps[0], 0, 2).instruction, /반드시 십의 자리 위 칸/)
const secondQuotient = twoDigitMission.steps.find((step) => step.type === 'quotient' && step.cycleIndex === 1)
const beforeSecondQuotient = buildDivisionBoardState(twoDigitMission, secondQuotient.index)
assert.equal(beforeSecondQuotient.cycleStates[0].remainder, '0')
assert.equal(beforeSecondQuotient.cycleStates[0].broughtDigit, '2')

const leadingDigitMission = buildVerticalDivision(VERTICAL_DIVISION_PROBLEMS.find((problem) => problem.dividend === 156))
assert.equal(leadingDigitMission.steps[0].type, 'canDivide')
assert.equal(leadingDigitMission.steps[0].partialDividend, 1)
assert.equal(leadingDigitMission.steps[0].expected, 'cannot')
assert.equal(validateDivisionStep(leadingDigitMission.steps[0], 'can'), false)
assert.equal(leadingDigitMission.steps[0].nextPartialDividend, 15)
const leadingDigitCopy = getDivisionStepCopy(leadingDigitMission.steps[0], 0, 3)
assert.match(leadingDigitCopy.instruction, /맨 왼쪽 백의 자리 수 1/)
assert.match(leadingDigitCopy.instruction, /3짜리 묶음을 한 개라도 만들 수 있을까요/)
assert.match(leadingDigitCopy.success, /백의 자리 1과 십의 자리 5/)
assert.match(leadingDigitCopy.success, /15개의 십, 즉 150/)
assert.match(leadingDigitCopy.success, /몫은 십의 자리부터/)
const repeatedLeadingChecks = buildVerticalDivision(VERTICAL_DIVISION_PROBLEMS.find((problem) => problem.dividend === 2025)).steps.filter((step) => step.type === 'canDivide')
assert.deepEqual(repeatedLeadingChecks.map((step) => step.nextPartialDividend), [20, 202])

const spaceHomeSource = readFileSync(new URL('../src/components/Space/SpaceHome.jsx', import.meta.url), 'utf8')
const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const labSource = readFileSync(new URL('../src/components/Space/VerticalDivisionLab.jsx', import.meta.url), 'utf8')
const labStyles = readFileSync(new URL('../src/components/Space/VerticalDivisionLab.css', import.meta.url), 'utf8')
const experienceStart = spaceHomeSource.indexOf('id="division-experience-title"')
const leaderboardStart = spaceHomeSource.indexOf('<MissionLeaderboard', experienceStart)
assert.ok(spaceHomeSource.includes("selectedRegionId === 'division'"), 'entry is scoped to Dividia')
assert.ok(spaceHomeSource.includes('data-testid={testId}') && spaceHomeSource.includes('vertical-division-lab-entry'), 'entry card contract')
assert.ok(experienceStart > -1 && leaderboardStart > experienceStart, 'experience lab appears before the long mission list leaderboard')
assert.ok(spaceHomeSource.includes('setVerticalDivisionLabOpen(true)'), 'entry opens the lab')
assert.ok(appSource.includes('/dev/vertical-division-lab'), 'development QA route')
assert.ok(!appSource.includes('initialMission={'), 'development QA route is not pinned to a temporary mission')
assert.ok(labSource.includes('canDivideActive || quotientActive) return null'), 'preview and quotient steps do not reveal a duplicate partial dividend below the bracket')
assert.ok(!labSource.includes('번째 계산'), 'board does not pre-label or repeat the current dividend')
assert.ok(labSource.includes('remainderCells[cycle.nextColumnIndex] = cycleState.broughtDigit'), 'brought-down digit joins the remainder row in its place')
assert.ok(labSource.includes('cycle.skipArithmetic') && labSource.includes('zeroBridgeBringActive'), 'zero quotient skips redundant arithmetic and bridges directly to the next digit')
assert.ok(labSource.includes('nextCycle.partialDividend === 0'), 'only an actual zero partial dividend fades during the shortcut')
assert.ok(labSource.includes('sourceFocusColumns') && labSource.includes('workingFocusOwner'), 'current partial dividend is highlighted in the source or working row')
assert.ok(labSource.includes("cycleState.remainder === '0'") && labSource.includes('is-fading-zero'), 'meaningless leading zero fades after bring-down')
assert.ok(labSource.includes("check('cannot')") && labSource.includes('나눌 수 없어요'), 'leading-place check uses student-friendly choices')
assert.ok(labSource.includes('이해했어요. {step.nextPartialDividend}를 나눠 볼게요'), 'explanation remains until the student continues')
assert.ok(labStyles.includes('.vdl-place-cells{justify-content:start}'), 'place-value columns are anchored from the left')
assert.ok(labStyles.includes('.vdl-quotient-line>.vdl-place-cells{margin-left:3px}'), 'quotient cells account for the bracket stroke')
assert.ok(labStyles.includes('.vdl-workings{margin-left:73px}'), 'work rows share the dividend cell origin')
assert.ok(labStyles.includes('.vdl-calc-row>.vdl-place-cells{grid-column:2}'), 'calculation cells occupy the full place-value track')
assert.ok(labStyles.includes('.vdl-math-sign{left:-28px}'), 'subtraction sign sits to the left of the product row')
assert.ok(labStyles.includes('.vdl-subtract-rule{height:3px'), 'subtraction rule remains visible on the dark board')
assert.ok(labStyles.includes('@keyframes vdlFadeZero'), 'leading zero has a gentle dismissal animation')
assert.ok(labStyles.includes('.vdl-place-cell.is-current-dividend') && labStyles.includes('@keyframes vdlCurrentDividend'), 'current partial dividend has an animated underline')
assert.ok(labStyles.includes('.vdl-cycle{margin-top:4px;padding:0}'), 'successive calculation rows keep a compact, even rhythm')
assert.ok(labStyles.includes('.vdl-choice-grid'), 'can-divide choices have a dedicated responsive control')

console.log(`Vertical division lab: ${VERTICAL_DIVISION_PROBLEMS.length} missions and ${VERTICAL_DIVISION_PROBLEMS.reduce((sum, problem) => sum + buildVerticalDivision(problem).steps.length, 0)} guided steps passed.`)
