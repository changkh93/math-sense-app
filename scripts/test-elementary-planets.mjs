import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getElementaryAccess, getElementaryWorld } from '../src/components/Space/elementaryPlanetCatalog.js'
import { createProceduralPlanetTexture, PROCEDURAL_PLANET_TYPES } from '../src/components/Space/planetProceduralSurface.js'

const privateRegion = { id: 'private', isPrivate: true }
for (const status of ['active', 'completed']) assert.equal(getElementaryAccess(privateRegion, { private: status }), 'open')
for (const status of [undefined, 'pending', 'expired']) assert.equal(getElementaryAccess(privateRegion, { private: status }), 'locked')
assert.equal(getElementaryAccess(privateRegion, { private: 'suspended' }), 'suspended')
assert.equal(getElementaryAccess({ id: 'public' }, { public: 'suspended' }), 'open')
assert.equal(getElementaryWorld({ id: 'x', title: '프락토니스 (Fractonis)' }).topic, '분수')
assert.equal(getElementaryWorld({ id: 'x', title: '초등수학 월간평가' }).key, 'assessment')

for (const type of [
  'elementary_mistake_notebook',
  'elementary_monthly_evaluation',
  'middle_math_core',
  'middle_math_school_exam',
  'python_foundation',
  'algorithm_constellation',
  'western_classic_neverland',
  'reading_library',
]) {
  assert.ok(PROCEDURAL_PLANET_TYPES.has(type), `${type} must use a complete procedural sphere`)
  const texture = createProceduralPlanetTexture(type, '#4a90e2')
  assert.equal(texture.image.width, 256)
  assert.equal(texture.image.height, 128)
  assert.equal(texture.image.data.byteLength, 256 * 128 * 4)
  texture.dispose()
}

const planetMeshSource = readFileSync(new URL('../src/components/Space/PlanetMesh.jsx', import.meta.url), 'utf8')
assert.doesNotMatch(planetMeshSource, /<sprite|ImageSpritePlanet|IMAGE_PLANET_TYPES/, '3D planets must not use flat sprites')
assert.match(planetMeshSource, /<Sphere ref=\{meshRef\} args=\{\[size, 48, 32\]\}>/, 'planet surface must be a bounded-detail sphere')
assert.match(planetMeshSource, /meshRef\.current\.rotation\.y \+=/, 'the spherical surface must rotate')

const spaceSceneSource = readFileSync(new URL('../src/components/Space/SpaceScene.jsx', import.meta.url), 'utf8')
assert.match(spaceSceneSource, /dollyToCursor/, 'space camera must zoom toward the cursor')
assert.match(spaceSceneSource, /maxDistance=\{80\}/, 'space camera must retain a broad exploration range')
assert.match(spaceSceneSource, /dpr=\{\[1, 1\.5\]\}/, 'space scene must cap device pixel ratio')

console.log('Elementary 2D access and complete 3D planet contracts passed.')
