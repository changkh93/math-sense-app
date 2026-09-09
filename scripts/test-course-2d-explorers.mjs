import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  getCourseAccess,
  getCourseExplorerConfig,
  getCourseStations,
  getCourseWorld,
  isCourseExplorerCluster,
} from '../src/components/Space/coursePlanetCatalog.js'

for (const [clusterId, key, columns] of [
  ['middle-math', 'middle', 3],
  ['python', 'python', 4],
  ['western-classic', 'classic', 3],
  ['서양고전읽기', 'classic', 3],
]) {
  const config = getCourseExplorerConfig(clusterId)
  assert.equal(config.key, key)
  assert.equal(config.columns, columns)
  assert.equal(isCourseExplorerCluster(clusterId), true)
}
assert.equal(isCourseExplorerCluster('cluster_elementary'), false)
assert.equal(isCourseExplorerCluster('unknown'), false)

const middleWorlds = [
  ['reg_1773407437227', '기본개념 전과정'],
  ['reg_1775113850179', '절대개념 - 수와 연산 & 문자와 식'],
  ['reg_1775113861010', '절대개념 - 함수 & 확률과 통계'],
  ['reg_1775113875836', '절대개념 - 기하'],
  ['reg_1774698354292', '단원평가&모의고사'],
  ['reg_1781420075936', '내신기출문제'],
].map(([id, title], index) => getCourseWorld({ id, title }, index, 'middle-math'))
assert.equal(new Set(middleWorlds.map((world) => world.image)).size, 6)
assert.equal(new Set(middleWorlds.map((world) => world.topic)).size, 6)

const pythonWorlds = [
  ['reg_python_course', '처음 파이썬'],
  ['reg_python_game_project', '게임 프로젝트'],
  ['reg_python_advanced', '파이썬 심화'],
  ['reg_python_math', '파이썬 수학'],
].map(([id, title], index) => getCourseWorld({ id, title }, index, 'python'))
assert.equal(new Set(pythonWorlds.map((world) => world.topic)).size, 4)
assert.equal(pythonWorlds[3].subtitle, 'Math Engine')

const classicWorld = getCourseWorld({ id: 'classic', title: '노벨문학상 수상작' }, 0, 'western-classic')
assert.equal(classicWorld.subtitle, 'Nobel Literature')
assert.match(classicWorld.image, /western-classic-nobel/)

assert.deepEqual(getCourseStations('middle-math').map((station) => station.id), ['archive', 'notebook', 'dark', 'refinery'])
assert.deepEqual(getCourseStations('python').map((station) => station.id), ['python_game_studio', 'lumi_protocol', 'algorithm_constellation', 'archive', 'notebook', 'dark', 'refinery'])
assert.deepEqual(getCourseStations('western-classic').map((station) => station.id), ['reading_library', 'archive', 'dark'])

const privateRegion = { id: 'private', isPrivate: true }
assert.equal(getCourseAccess(privateRegion, { private: 'active' }), 'open')
assert.equal(getCourseAccess(privateRegion, { private: 'completed' }), 'open')
assert.equal(getCourseAccess(privateRegion, { private: 'suspended' }), 'suspended')
assert.equal(getCourseAccess(privateRegion, {}), 'locked')

const explorerSource = readFileSync(new URL('../src/components/Space/CoursePlanetExplorer.jsx', import.meta.url), 'utf8')
assert.doesNotMatch(explorerSource, /Canvas|WebGL|useFrame|three/, '2D explorer must not create a 3D runtime')
assert.match(explorerSource, /course-world-card/)

const explorerStyles = readFileSync(new URL('../src/components/Space/CoursePlanetExplorer.css', import.meta.url), 'utf8')
assert.match(explorerStyles, /mix-blend-mode:\s*screen/, 'dark image backdrops must blend into the card')
assert.match(explorerStyles, /mask-image:\s*radial-gradient\(circle closest-side/, 'image edges must fade before the source rectangle')

console.log('Middle, Python, and classic 2D explorer contracts passed.')
