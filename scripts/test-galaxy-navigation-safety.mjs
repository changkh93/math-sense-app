import assert from 'node:assert/strict'
import {
  createThirdPersonReturnPose,
  getWheelZoomValue,
  isTerrainHazardBlocking,
  projectCircleOutOfAabb,
  projectCircleOutOfCircle,
  resolveCameraLineOfSight,
} from '../src/components/GalaxySocial/galaxyNavigationSafety.js'

const returnPose = createThirdPersonReturnPose({
  playerPosition: [2, 1, 3],
  lookDirection: [0, 0, 1],
  distance: 5,
})
assert.deepEqual(returnPose.target, [2, 1.44, 3])
assert.deepEqual(returnPose.position, [2, 3.24, -2])

const closeReturnPose = createThirdPersonReturnPose({
  playerPosition: [0, 0, 0],
  lookDirection: [0, 0, 1],
  distance: 0.8,
  minDistance: 0.65,
  maxDistance: 58,
})
assert.equal(closeReturnPose.distance, 0.8)

assert.ok(getWheelZoomValue({
  current: 5,
  deltaY: -100,
  min: 0.65,
  max: 58,
  sensitivity: 0.0016,
}) < 5)
assert.ok(getWheelZoomValue({
  current: 5,
  deltaY: 100,
  min: 0.65,
  max: 58,
  sensitivity: 0.0016,
}) > 5)
assert.equal(getWheelZoomValue({
  current: 0.65,
  deltaY: -10000,
  min: 0.65,
  max: 58,
  sensitivity: 0.0016,
}), 0.65)
assert.equal(getWheelZoomValue({
  current: 58,
  deltaY: 10000,
  min: 0.65,
  max: 58,
  sensitivity: 0.0016,
}), 58)

assert.equal(isTerrainHazardBlocking({
  footY: 0.08,
  terrainY: 0,
  maxStepUp: 0.1,
}), true)
assert.equal(isTerrainHazardBlocking({
  footY: 1.02,
  terrainY: 0,
  maxStepUp: 0.1,
}), false)

const circleEscape = projectCircleOutOfCircle(
  { x: 0, z: 0 },
  { position: [0, 0, 0], collisionRadius: 1 },
  0.2,
)
assert.equal(circleEscape.moved, true)
assert.ok(circleEscape.x > 1.2)

const boxEscape = projectCircleOutOfAabb(
  { x: 0.45, z: 0 },
  { centerX: 0, centerZ: 0, halfX: 0.5, halfZ: 0.5 },
  0.15,
)
assert.equal(boxEscape.moved, true)
assert.ok(boxEscape.x > 0.65)

const clearCamera = resolveCameraLineOfSight({
  target: [0, 1, 0],
  desiredPosition: [0, 3, -5],
  colliders: [],
})
assert.deepEqual(clearCamera.position, [0, 3, -5])
assert.equal(clearCamera.obstructed, false)

const blockedCamera = resolveCameraLineOfSight({
  target: [0, 1, 0],
  desiredPosition: [0, 2, -5],
  colliders: [{ position: [0, 0, -2.5], collisionRadius: 0.8, cameraCollisionHeight: 3 }],
})
assert.equal(blockedCamera.obstructed, true)
assert.ok(blockedCamera.position[2] > -1.7)

const cameraStartsInside = resolveCameraLineOfSight({
  target: [0, 1, 0],
  desiredPosition: [0, 1.5, -5],
  colliders: [{ position: [0, 0, 0], collisionRadius: 0.8, cameraCollisionHeight: 3 }],
  minDistance: 0.7,
})
assert.equal(cameraStartsInside.obstructed, true)
assert.ok(cameraStartsInside.position[2] >= -0.71)

const builderBlockedCamera = resolveCameraLineOfSight({
  target: [0, 0.5, 0],
  desiredPosition: [0, 1.2, -3],
  colliders: [{
    kind: 'astra-builder-block',
    centerX: 0,
    centerZ: -1.5,
    halfX: 0.2,
    halfZ: 0.2,
    minY: 0,
    maxY: 2,
  }],
})
assert.equal(builderBlockedCamera.obstructed, true)
assert.ok(builderBlockedCamera.position[2] > -1.1)

console.log('Galaxy navigation safety tests passed')
