import assert from 'node:assert/strict'
import { getBuiltinPythonMissionSets, getPythonMissionSetForUnit, getMissionVariant, hasPythonMissionSetForUnit, isMissionLabRequired, PYTHON_PROTOCOL_ENTRY_UNITS } from '../src/components/PythonWorld/pythonMissionCatalog.js'
import { evaluateMissionRun } from '../src/components/PythonWorld/missionEvaluator.js'
import { getMissionSetCompletion, mergeMissionCompletion } from '../src/utils/pythonMissionProgressUtils.js'
import { createPublishableMissionSet, validatePythonMissionSet } from '../src/components/PythonWorld/pythonMissionSchema.js'

const unit = { id: 'unit_for', title: 'for 반복문' }
const set = getPythonMissionSetForUnit(unit, 'python')
assert.equal(set.id, 'lumi-loop-navigation-v1')
assert.equal(set.missions.length, 2)
assert.equal(getBuiltinPythonMissionSets().reduce((sum, item) => sum + item.missions.length, 0), 20)
assert.equal(PYTHON_PROTOCOL_ENTRY_UNITS.length, 4)
assert.equal(new Set(PYTHON_PROTOCOL_ENTRY_UNITS.map((entry) => entry.unitId)).size, 4)
assert.equal(new Set(PYTHON_PROTOCOL_ENTRY_UNITS.map((entry) => entry.setId)).size, 4)
assert.equal(getPythonMissionSetForUnit({ id: 'unit_py_math_15', title: 'if조건문' }, 'python').missions.length, 6)
assert.equal(getPythonMissionSetForUnit({ id: 'unit_py_math_27', title: 'while문' }, 'python').missions.length, 6)
assert.equal(getPythonMissionSetForUnit({ id: 'unit_py_math_17', title: '함수' }, 'python').missions.length, 6)
assert.equal(hasPythonMissionSetForUnit({ pythonMissionSetId: 'teacher-custom-v1' }, 'python'), true)
assert.equal(getPythonMissionSetForUnit(unit, 'middle'), null)
assert.equal(isMissionLabRequired(unit), false)
assert.equal(isMissionLabRequired({ completionPolicy: { requiredModalities: ['missionLab'] } }), true)

const core = set.missions[1]
const variant = getMissionVariant(core, core.hiddenVariants[0])
assert.equal(variant.world.target.x, 5)
assert.equal(variant.goal.x, 5)
assert.equal(core.world.target.x, 6)

const passed = evaluateMissionRun(core, {
  finalState: { rover: { x: 6, y: 2 } },
  conceptsUsed: ['for', 'range'],
}, true)
assert.equal(passed.completed, true)
assert.equal(passed.stars, 3)

const collected = evaluateMissionRun({
  goals: [{ type: 'allSignalsCollected' }, { type: 'minimumEnergy', value: 20 }],
  conceptEvidence: { mustUse: ['if'], mustCall: ['lumi.scan', 'lumi.collect'] },
}, {
  finalState: {
    rover: { x: 1, y: 2, energy: 88 },
    objects: [{ id: 's1', kind: 'signal', collected: true }],
    collectedCount: 1,
  },
  conceptsUsed: ['if'],
  callsUsed: ['lumi.scan', 'lumi.collect'],
})
assert.equal(collected.completed, true)
assert.equal(collected.conceptPassed, true)

const missingCall = evaluateMissionRun({
  goal: { type: 'position', x: 2, y: 2 },
  conceptEvidence: { mustCall: ['lumi.move'] },
}, {
  finalState: { rover: { x: 2, y: 2 } }, conceptsUsed: [], callsUsed: [],
})
assert.deepEqual(missingCall.missingCalls, ['lumi.move'])
assert.equal(missingCall.completed, false)

const bypass = evaluateMissionRun(core, {
  finalState: { rover: { x: 6, y: 2 } },
  conceptsUsed: [],
}, false)
assert.equal(bypass.completed, false)
assert.deepEqual(bypass.missingConcepts, ['for', 'range'])

let progress = mergeMissionCompletion({}, set, set.missions[0].id, 2)
assert.deepEqual(getMissionSetCompletion(progress, set), { completedCount: 1, totalCount: 2, completed: false })
progress = mergeMissionCompletion(progress, set, set.missions[1].id, 3)
assert.equal(progress.completed, true)
assert.equal(progress.bestStars, 5)

for (const missionSet of getBuiltinPythonMissionSets()) {
  assert.deepEqual(validatePythonMissionSet(missionSet), [], `${missionSet.id} schema validation`)
}
const publishable = createPublishableMissionSet(set, 'published')
assert.equal(publishable.status, 'published')
assert.equal(validatePythonMissionSet({ id: 'x', missions: [] }).length > 0, true)

console.log('python mission utility tests passed')
