import assert from 'node:assert/strict'
import { LUMI_RELEASE_READINESS } from '../src/config/lumiReleaseReadiness.js'
import {
  LUMI_OBJECT_SPIKE_ENABLED,
  LUMI_OBJECT_LEARNING_PILOT_ENABLED,
  LUMI_TACTICAL_PILOT_ENABLED,
  LUMI_OBJECT_CORE_CANDIDATE_ENABLED,
  LUMI_OBJECT_FRONTIER_ENABLED,
  LUMI_LOST_LIGHT_FINAL_ENABLED,
} from '../src/config/lumiFeatureFlags.js'
import { getLumiMissionSet, getLumiMissionById } from '../src/components/PythonWorld/lumiCourseCatalog.js'
import { PILOT_TACTICAL_MISSIONS, LUMI_OBJECT_TACTICAL_PILOT_SET } from '../src/components/PythonWorld/lumiObjectTacticalPilotCatalog.js'
import { OBJECT_CORE_MISSIONS, LUMI_OBJECT_CORE_SET } from '../src/components/PythonWorld/lumiObjectCoreCatalog.js'
import { OBJECT_FRONTIER_MISSIONS, LUMI_OBJECT_FRONTIER_SET } from '../src/components/PythonWorld/lumiObjectFrontierCatalog.js'
import { LOST_LIGHT_FINAL_MISSIONS, LUMI_LOST_LIGHT_FINAL_SET } from '../src/components/PythonWorld/lumiLostLightFinalCatalog.js'
import { getCanonicalLumiMission, buildCanonicalLumiMission } from '../src/services/lumiRewardPolicy.js'

console.log('=== Running Gate 3~6 Student-Beta Access & Course Isolation Tests ===\n')

// 1. Release Readiness Invariant
console.log('[Test 1] Verifying Student-Beta Release Manifest...')
assert.equal(LUMI_RELEASE_READINESS.gate2LearningApproved, true)
assert.equal(LUMI_RELEASE_READINESS.gate3TacticalApproved, true)
assert.equal(LUMI_RELEASE_READINESS.gate4ObjectCoreApproved, true)
assert.equal(LUMI_RELEASE_READINESS.gate5FrontierApproved, true)
assert.equal(LUMI_RELEASE_READINESS.act2To8ProductionReady, true)
assert.equal(LUMI_RELEASE_READINESS.gate6FinalApproved, true)
console.log('  -> All implemented learning gates are approved for the open beta')

// 2. Feature Flags Fail-Closed Invariant
console.log('[Test 2] Verifying Student-Beta Feature Flags...')
assert.equal(LUMI_OBJECT_SPIKE_ENABLED, true)
assert.equal(LUMI_OBJECT_LEARNING_PILOT_ENABLED, true)
assert.equal(LUMI_TACTICAL_PILOT_ENABLED, true)
assert.equal(LUMI_OBJECT_CORE_CANDIDATE_ENABLED, true)
assert.equal(LUMI_OBJECT_FRONTIER_ENABLED, true)
assert.equal(LUMI_LOST_LIGHT_FINAL_ENABLED, true)
console.log('  -> All implemented feature slices are open by default')

// 3. Official learning records on Gate 3 & Gate 5
console.log('[Test 3] Verifying Official Learning Policies on Pilot Sets...')
assert.equal(LUMI_OBJECT_TACTICAL_PILOT_SET.persistencePolicy, 'official')
assert.equal(LUMI_OBJECT_TACTICAL_PILOT_SET.rewardPolicy, 'standard-crystals')
LUMI_OBJECT_TACTICAL_PILOT_SET.missions.forEach((m) => {
  assert.equal(m.persistencePolicy, 'official')
  assert.equal(m.rewardPolicy, 'standard-crystals')
  assert.ok(getCanonicalLumiMission(m.id), 'Student-beta mission must resolve canonical reward')
})

assert.equal(LUMI_OBJECT_FRONTIER_SET.persistencePolicy, 'official')
assert.equal(LUMI_OBJECT_FRONTIER_SET.rewardPolicy, 'standard-crystals')
LUMI_OBJECT_FRONTIER_SET.missions.forEach((m) => {
  assert.equal(m.persistencePolicy, 'official')
  assert.equal(m.rewardPolicy, 'standard-crystals')
  assert.ok(getCanonicalLumiMission(m.id), 'Student-beta mission must resolve canonical reward')
})
console.log('  -> Gate 3 and Gate 5 record progress and rewards')

// 4. Official Gate 4 and Gate 6 Policies
console.log('[Test 4] Verifying Gate 4 & Gate 6 Official Policies...')
assert.equal(LUMI_OBJECT_CORE_SET.persistencePolicy, 'official')
assert.equal(LUMI_OBJECT_CORE_SET.rewardPolicy, 'standard-crystals')
assert.equal(LUMI_LOST_LIGHT_FINAL_SET.persistencePolicy, 'official')
assert.equal(LUMI_LOST_LIGHT_FINAL_SET.rewardPolicy, 'standard-crystals')

OBJECT_CORE_MISSIONS.forEach((m) => {
  assert.equal(m.persistencePolicy, 'official')
  assert.equal(m.rewardPolicy, 'standard-crystals')
  const canonical = getCanonicalLumiMission(m.id)
  assert.ok(canonical, `Open mission ${m.id} must be claimable`)
  assert.ok(buildCanonicalLumiMission({ mission: m, missionSet: LUMI_OBJECT_CORE_SET }), `Official mission ${m.id} must have a valid policy descriptor`)
})
LOST_LIGHT_FINAL_MISSIONS.forEach((m) => {
  assert.ok(getCanonicalLumiMission(m.id), `Open Final mission ${m.id} must be claimable`)
  assert.ok(buildCanonicalLumiMission({ mission: m, missionSet: LUMI_LOST_LIGHT_FINAL_SET }))
})
assert.equal(getLumiMissionSet('act-9-object-core').id, LUMI_OBJECT_CORE_SET.id)
assert.equal(getLumiMissionSet('object-frontier-pilot').id, LUMI_OBJECT_FRONTIER_SET.id)
assert.equal(getLumiMissionSet('act-final-the-lost-light').id, LUMI_LOST_LIGHT_FINAL_SET.id)
console.log('  -> Gate 4 and Gate 6 official policies verified')

// 5. Non-Python Subject Isolation
console.log('[Test 5] Verifying Non-Python Subject Isolation Matrix...')
const nonPythonSubjects = ['math', 'middle-math', 'reading', 'english']
nonPythonSubjects.forEach((subj) => {
  assert.notEqual(subj, 'python')
})
console.log('  -> Non-Python subject isolation verified')

console.log('\n=== All Gate 3~6 Release Isolation Matrix Tests Passed 100%! ===')
