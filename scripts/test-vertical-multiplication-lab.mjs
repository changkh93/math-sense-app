import assert from 'node:assert/strict'
import {
  VERTICAL_MULTIPLICATION_PROBLEMS,
  buildBoardState,
  buildVerticalMultiplication,
  getStepCopy,
  validateStep,
} from '../src/components/Space/verticalMultiplicationLabModel.js'

assert.equal(VERTICAL_MULTIPLICATION_PROBLEMS.length, 10)

for (const problem of VERTICAL_MULTIPLICATION_PROBLEMS) {
  const mission = buildVerticalMultiplication(problem)
  assert.equal(mission.partialRows.length, 3)
  assert.equal(mission.steps.filter((step) => step.type === 'partial').length, 9)
  assert.equal(mission.partialRows.reduce((sum, row) => sum + row.value, 0), problem.a * problem.b)
  assert.equal(mission.steps.at(-1).writeValue, Number(String(problem.a * problem.b)[0]))

  for (const step of mission.steps) {
    assert.equal(validateStep(step, step.writeValue, step.carryOut).correct, true)
    assert.equal(validateStep(step, 999, step.carryOut).correct, false)
  }

  const finished = buildBoardState(mission, mission.steps.length)
  assert.equal(Number(finished.partialCells[0].join('')), mission.partialRows[0].value)
  assert.equal(Number(finished.partialCells[1].join('')), mission.partialRows[1].value)
  assert.equal(Number(finished.partialCells[2].join('')), mission.partialRows[2].value)
  assert.equal(Number(finished.resultCells.join('')), problem.a * problem.b)
}

const carryMission = buildVerticalMultiplication({ a: 347, b: 256 })
assert.deepEqual(
  carryMission.steps.slice(0, 3).map(({ writeValue, carryOut }) => [writeValue, carryOut]),
  [[2, 4], [8, 2], [20, null]],
)

const noCarryStep = carryMission.steps.find((step) => step.carryOut === 0)
assert.equal(validateStep(noCarryStep, noCarryStep.writeValue, '').correct, true)
assert.equal(getStepCopy(carryMission.steps[0]).eyebrow, '347 × 6에서 일의 자리 계산')
assert.equal(getStepCopy(carryMission.steps[0], 2).hint.includes('앞자리 위에는 4'), true)

console.log('vertical multiplication lab model: all checks passed')
