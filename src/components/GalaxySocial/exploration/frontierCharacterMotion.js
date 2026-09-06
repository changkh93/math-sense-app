const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

// Rotations are around the existing astronaut bone pivots. Water and air never
// sample the walking stride, including when strafing or hovering in place.
export function sampleFrontierCharacterMotion({ mode = 'grounded', time = 0, moving = false, strafe = 0, forward = 1, sprinting = false }) {
  const side = clamp(strafe, -1, 1)
  const wet = mode === 'swimming' || mode === 'diving'
  const air = mode === 'flying' || mode === 'landing'
  if (wet) {
    const kick = Math.sin(time * (moving ? 8 : 3)) * (moving ? .36 : .12)
    const stroke = Math.sin(time * (moving ? 3.8 : 1.8))
    return {
      bodyX: moving ? 1.4 : 1.14, bodyZ: -side * .24,
      bodyY: .32 + Math.sin(time * 2) * .025, bodyOffsetZ: -.9,
      leftArmX: -.65 + stroke * .48, rightArmX: -.65 - stroke * .48,
      leftArmZ: -.64 - Math.max(0, stroke) * .35, rightArmZ: .64 + Math.max(0, -stroke) * .35,
      leftLegX: kick, rightLegX: -kick, leftLegZ: -.08, rightLegZ: .08,
    }
  }
  if (air) return {
    bodyX: moving ? .24 * clamp(forward, -.6, 1) : .04, bodyZ: -side * .32,
    bodyY: .12 + Math.sin(time * 2.4) * .035, bodyOffsetZ: 0,
    leftArmX: -.18, rightArmX: -.18,
    leftArmZ: -.55 - side * .12, rightArmZ: .55 - side * .12,
    leftLegX: -.36 + Math.sin(time * 2) * .035,
    rightLegX: -.28 + Math.sin(time * 2 + .8) * .035, leftLegZ: -.12, rightLegZ: .12,
  }
  const stride = moving ? Math.sin(time * (sprinting ? 16 : 10)) : 0
  const step = stride * .52 * (forward < 0 ? -1 : 1)
  return {
    bodyX: 0, bodyZ: stride * .08 * side, bodyY: Math.abs(stride) * .035, bodyOffsetZ: 0,
    leftArmX: -step, rightArmX: step,
    leftArmZ: -.14 + stride * .16 * side, rightArmZ: .14 + stride * .16 * side,
    leftLegX: step * .72, rightLegX: -step * .72,
    leftLegZ: stride * .32 * side, rightLegZ: -stride * .32 * side,
  }
}

export function applyFrontierCharacterMotion(bones, pose, delta) {
  const alpha = 1 - Math.exp(-Math.min(Math.max(delta, 0), .05) * 8)
  const blend = (current, target) => current + (target - current) * alpha
  const body = bones.body?.current
  if (body) {
    body.rotation.x = blend(body.rotation.x, pose.bodyX)
    body.rotation.z = blend(body.rotation.z, pose.bodyZ)
    body.position.y = blend(body.position.y, pose.bodyY)
    body.position.z = blend(body.position.z, pose.bodyOffsetZ)
  }
  for (const name of ['leftArm', 'rightArm', 'leftLeg', 'rightLeg']) {
    const bone = bones[name]?.current
    if (bone) {
      bone.rotation.x = blend(bone.rotation.x, pose[`${name}X`])
      bone.rotation.z = blend(bone.rotation.z, pose[`${name}Z`])
    }
  }
}
