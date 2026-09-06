import assert from 'node:assert/strict'
import { sampleFrontierCharacterMotion as pose, applyFrontierCharacterMotion } from '../src/components/GalaxySocial/exploration/frontierCharacterMotion.js'
import { MARINE_HABITAT_COUNT, getMarineHabitat, getExplorationRadius, getSkyLandmarks } from '../src/components/GalaxySocial/exploration/frontierExploration.js'
for (const mode of ['swimming', 'diving']) {
  const swim = pose({ mode, moving: true, time: .2, strafe: 1 })
  assert.ok(swim.bodyX > 1.3, 'swim body must be horizontal')
  assert.equal(swim.leftLegX, -swim.rightLegX, 'alternate fin kicks')
  assert.ok(swim.leftArmZ < -.5 && swim.rightArmZ > .5, 'open swimming stroke')
  assert.ok(pose({ mode, moving: false }).bodyX > 1, 'idle diver remains buoyant')
}
const left = pose({ mode: 'flying', moving: true, strafe: -1, time: .1 })
const right = pose({ mode: 'flying', moving: true, strafe: 1, time: .1 })
assert.equal(left.bodyZ, -right.bodyZ, 'bank into lateral travel')
assert.ok(left.bodyZ < 0, 'left strafe banks the torso left')
assert.ok(right.bodyZ > 0, 'right strafe banks the torso right')
assert.ok(left.leftLegX < 0 && left.rightLegX < 0, 'hover legs tucked, no walking stride')
assert.equal(pose({ mode: 'grounded', moving: false }).bodyX, 0)
const bone = () => ({ current: { rotation: { x: 0, z: 0 }, position: { y: 0, z: 0 } } })
const bones = { body: bone(), leftArm: bone(), rightArm: bone(), leftLeg: bone(), rightLeg: bone() }
applyFrontierCharacterMotion(bones, left, 0)
assert.equal(bones.body.current.rotation.z, 0, 'paused animation freezes')
for (let i = 0; i < 100; i++) applyFrontierCharacterMotion(bones, pose({ mode: 'diving', moving: true }), .016)
assert.ok(bones.body.current.rotation.x > 1.39)
for (let i = 0; i < 100; i++) applyFrontierCharacterMotion(bones, pose({ mode: 'grounded' }), .016)
assert.ok(Math.abs(bones.body.current.rotation.x) < .001, 'land posture restored')
for (const radius of [20, 28.284271]) {
  const quadrants = new Set()
  for (let i = 0; i < MARINE_HABITAT_COUNT; i++) {
    const h = getMarineHabitat(i, radius)
    assert.ok(Math.hypot(h.x, h.z) > radius && Math.hypot(h.x, h.z) < getExplorationRadius(radius))
    quadrants.add(`${Math.sign(h.x)},${Math.sign(h.z)}`)
  }
  assert.equal(quadrants.size, 4, 'reefs surround all sides of the island')
  for (const site of getSkyLandmarks(radius)) assert.ok(site.y < 18 && Math.hypot(site.x, site.z) < radius)
}
console.log('Swimming/hover motion, transition, pause, reef coverage and reachable sky landmarks passed')
