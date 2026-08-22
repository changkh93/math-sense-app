import assert from 'node:assert/strict'
import fs from 'node:fs'
import { getLumiCourseCatalog } from '../src/components/PythonWorld/lumiCourseCatalog.js'
import {
  getAdvancedChallengeAccess,
  getSequentialActAccess,
} from '../src/components/PythonWorld/lumiProgressionAccess.js'

console.log('=== LUMI Sequential Progression & Admin Preview Contract ===\n')

const course = getLumiCourseCatalog()
const emptyAccess = getSequentialActAccess(course, {})
assert.equal(emptyAccess['act-0-awakening'], true)
course.acts.slice(1).forEach((act) => assert.equal(emptyAccess[act.id], false, `${act.id} must begin locked`))

const act0 = course.acts[0]
const afterAct0 = getSequentialActAccess(course, {
  [act0.id]: { completedMissionIds: Array.from({ length: act0.coreMissions }, (_, index) => `m-${index}`) },
})
assert.equal(afterAct0['act-1-command'], true)
assert.equal(afterAct0['act-2-memory'], false)

const staleCompletionBlocked = getSequentialActAccess(course, {
  [act0.id]: { completed: true, completedMissionIds: ['legacy-mission'] },
}, false, { [act0.id]: false })
assert.equal(staleCompletionBlocked['act-1-command'], false, 'stale completion flags must not unlock an expanded ACT')

const adminAccess = getSequentialActAccess(course, {}, true)
course.acts.forEach((act) => assert.equal(adminAccess[act.id], true, `${act.id} must open for admin preview`))
console.log('  -> Core ACTs unlock one-by-one; admin preview opens every ACT')

assert.deepEqual(getAdvancedChallengeAccess(), {
  objectTrace: false,
  objectLearning: false,
  tactical: false,
  frontier: false,
})
assert.deepEqual(getAdvancedChallengeAccess({ finalCompleted: true }), {
  objectTrace: true,
  objectLearning: false,
  tactical: false,
  frontier: false,
})
assert.deepEqual(getAdvancedChallengeAccess({
  finalCompleted: true,
  objectTraceCompleted: true,
  objectLearningCompleted: true,
  tacticalCompleted: true,
}), {
  objectTrace: true,
  objectLearning: true,
  tactical: true,
  frontier: true,
})
assert.deepEqual(getAdvancedChallengeAccess({}, true), {
  objectTrace: true,
  objectLearning: true,
  tactical: true,
  frontier: true,
})
console.log('  -> Advanced challenges require prior completion; admin preview bypass is isolated')

const hubSource = fs.readFileSync('src/components/PythonWorld/PythonProtocolHub.jsx', 'utf8')
assert.ok(hubSource.includes("LUMI_ADMIN_PREVIEW_EMAIL = 'paul@dulcine.net'"))
assert.ok(hubSource.includes('루미와 함께 배우는 Python'))
assert.ok(hubSource.includes('객체와 자율항법 심화 도전'))
assert.equal(hubSource.includes('OPEN BETA LAB'), false)
assert.equal(hubSource.includes('학생 공개 베타 탐사실'), false)
assert.equal(hubSource.includes('FULL CURRICULUM MAP'), false)
assert.equal(hubSource.includes('ACT 0~9 + FINAL 코어 복원 지도'), false)
console.log('  -> Student-facing labels contain no internal Beta/Gate map terminology')

console.log('\n=== LUMI Progression Gating Contract Passed ===')
