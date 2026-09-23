import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { hasFullStudioAccess, PUBLIC_STUDIO_UID } from '../src/components/PythonGameStudio/studioAccess.js'

const member = { uid: 'student-1', isAnonymous: false }
assert.equal(PUBLIC_STUDIO_UID, 'public-code-studio')
assert.equal(hasFullStudioAccess(null, null), false)
assert.equal(hasFullStudioAccess({ uid: 'guest', isAnonymous: true }, { clusterAccess: { python: 'active' } }), false)
assert.equal(hasFullStudioAccess(member, { isGuest: true, clusterAccess: { python: 'active' } }), false)
assert.equal(hasFullStudioAccess(member, { dataLoadError: true, clusterAccess: { python: 'active' } }), false)
assert.equal(hasFullStudioAccess(member, { clusterAccess: { python: 'active' } }), true)
assert.equal(hasFullStudioAccess(member, { clusterAccess: { '파이썬': 'active' } }), true)
assert.equal(hasFullStudioAccess(member, { role: 'admin' }), true)
assert.equal(hasFullStudioAccess(member, { clusterAccess: { math: 'active' } }), false)

const studio = await readFile('src/components/PythonGameStudio/PythonGameStudio.jsx', 'utf8')
const home = await readFile('src/components/PublicHomeIntro.jsx', 'utf8')
const publicActionsStart = studio.indexOf('className="pgs-library-actions"')
const paidActionsStart = studio.indexOf('{!publicAccess && <>', publicActionsStart)
const publicActions = studio.slice(publicActionsStart, paidActionsStart)
assert(publicActions.includes('새 프로젝트'))
assert(publicActions.includes('프로젝트 가져오기'))
for (const hidden of ['백업 파일 복원', '동전 모으기 수업 준비', '몬스터 잡기 수업 준비', '우주 방어대 수업 준비', '화성 탐사대 수업 준비', 'Flash Card 수업 준비']) {
  assert(!publicActions.includes(hidden), `public project actions must not include ${hidden}`)
}
assert(studio.includes('allowAi={!publicAccess}'))
assert(studio.includes('href="/python/guides/"'))

const section = home.slice(home.indexOf('id="home-code-studio"'), home.indexOf('className="ms-evidence-section"'))
assert(section.includes('href="/python-game-studio"'))
assert(section.includes('href="/python/guides/"'))
assert(section.includes('로그인 없이'))
assert(!section.includes('<img'))

console.log('PASS: public access, member access, guest project actions, local-only AI guard, and asset-free home entry')
