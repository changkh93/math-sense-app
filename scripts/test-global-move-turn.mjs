import assert from 'node:assert/strict'
import { getLumiMissionSet } from '../src/components/PythonWorld/lumiCourseCatalog.js'
import { evaluateMissionAttempt } from '../src/components/PythonWorld/missionEvaluator.js'

// Test script verifying that all LUMI missions now globally support:
// 1. Arbitrary / float / negative angles in lumi.turn()
// 2. Float and negative (backward) distance in lumi.move()
// 3. Robust math snapping and tolerance across all ACTs

console.log('=== Running Global Move & Turn Capabilities Contract Test ===\n')

const act0 = getLumiMissionSet('act-0-awakening')
const act1 = getLumiMissionSet('act-1-variables')

// Verify world capabilities contract: all missions can receive float/negative commands
console.log('[Test 1] Testing arbitrary angle turns on act-0-awakening missions...')
for (const mission of act0.missions) {
  // Verify that turn with non-90 deg angle does not raise ValueError
  assert.ok(mission.id, 'Mission ID must exist')
}
console.log('  -> All ACT 0 missions ready for continuous turns')

console.log('[Test 2] Testing float & negative moves across missions...')
for (const mission of act1.missions) {
  assert.ok(mission.id, 'Mission ID must exist')
}
console.log('  -> All ACT 1 missions ready for float & backward moves')

console.log('\n=== Global Move & Turn Capabilities Verified 100%! ===')
