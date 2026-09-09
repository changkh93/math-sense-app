import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import {
  PLANET_SIGNATURE_PROFILES,
  getMiddleMathPlanetStyle,
  getPlanetSignatureProfile,
  getPythonPlanetStyle,
} from '../src/components/Space/planetCourseStyles.js'
import {
  PROCEDURAL_PLANET_TYPES,
  createProceduralPlanetTexture,
  getProceduralPlanetStyle,
} from '../src/components/Space/planetProceduralSurface.js'

const middleRegions = [
  ['reg_1773407437227', '기본개념 전과정', 'middle_math_core'],
  ['reg_1775113850179', '절대개념 - 수와 연산 & 문자와 식', 'middle_math_numbers_expressions'],
  ['reg_1775113861010', '절대개념 - 함수 & 확률과 통계', 'middle_math_functions_statistics'],
  ['reg_1775113875836', '절대개념 - 기하', 'middle_math_absolute_geometry'],
  ['reg_1774698354292', '단원평가&모의고사', 'middle_math_exam'],
  ['reg_1781420075936', '내신기출문제', 'middle_math_school_exam'],
]

const pythonRegions = [
  ['reg_python_course', '처음 파이썬', 'python_foundation'],
  ['reg_python_game_project', '게임 프로젝트', 'python_project'],
  ['reg_python_advanced', '파이썬 심화', 'python_advanced'],
  ['reg_python_math', '파이썬 수학', 'python_math'],
]

for (const [id, title, expectedType] of middleRegions) {
  assert.equal(getMiddleMathPlanetStyle({ id, title }).planetType, expectedType)
}
for (const [id, title, expectedType] of pythonRegions) {
  assert.equal(getPythonPlanetStyle({ id, title }).planetType, expectedType)
}
assert.equal(getPythonPlanetStyle({ id: 'unknown', title: '파이썬 수학' }).planetType, 'python_math')

const featuredTypes = [
  'elementary_monthly_evaluation',
  ...middleRegions.map(([, , type]) => type),
  ...pythonRegions.map(([, , type]) => type),
]
assert.equal(new Set(featuredTypes).size, 11, 'all featured worlds must have their own planet type')

const ornaments = new Set()
const surfaceKinds = new Set()
const textureHashes = new Set()
for (const type of featuredTypes) {
  assert.ok(PROCEDURAL_PLANET_TYPES.has(type), `${type} must have a procedural spherical surface`)
  const profile = getPlanetSignatureProfile(type)
  assert.ok(profile, `${type} must have a 3D signature profile`)
  assert.equal(PLANET_SIGNATURE_PROFILES[type], profile)
  ornaments.add(profile.ornament)
  surfaceKinds.add(getProceduralPlanetStyle(type).kind)

  const texture = createProceduralPlanetTexture(type, '#4a90e2')
  textureHashes.add(createHash('sha1').update(texture.image.data).digest('hex'))
  texture.dispose()
}
assert.equal(ornaments.size, featuredTypes.length, 'every featured world must have a unique silhouette ornament')
assert.equal(surfaceKinds.size, featuredTypes.length, 'every featured world must have a unique surface pattern')
assert.equal(textureHashes.size, featuredTypes.length, 'every featured world must generate distinct texture data')

const meshSource = readFileSync(new URL('../src/components/Space/PlanetMesh.jsx', import.meta.url), 'utf8')
assert.match(meshSource, /function PlanetSignature/, '3D signature geometry must be rendered by PlanetMesh')
assert.match(meshSource, /instancedMesh/, 'orbiting nodes must be instanced to keep draw cost bounded')
assert.match(meshSource, /torusKnotGeometry/, 'the Python math world must include its prime-knot silhouette')

console.log('Course planet identity, surface, and low-cost 3D ornament contracts passed.')
