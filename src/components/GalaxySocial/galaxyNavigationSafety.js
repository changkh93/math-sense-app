const EPSILON = 0.001

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const normalizeHorizontal = (direction, fallback = [0, 0, 1]) => {
  const x = Number(direction?.[0] ?? direction?.x ?? 0)
  const z = Number(direction?.[2] ?? direction?.z ?? 0)
  const length = Math.hypot(x, z)
  if (length > EPSILON) return [x / length, 0, z / length]
  return [...fallback]
}

export function createThirdPersonReturnPose({
  playerPosition,
  lookDirection,
  distance = 5.2,
  targetHeight = 0.44,
  cameraLift = 1.8,
  minDistance = 0.65,
  maxDistance = 58,
}) {
  const playerX = Number(playerPosition?.[0] ?? playerPosition?.x ?? 0)
  const playerY = Number(playerPosition?.[1] ?? playerPosition?.y ?? 0)
  const playerZ = Number(playerPosition?.[2] ?? playerPosition?.z ?? 0)
  const safeDistance = clamp(Number(distance) || 5.2, minDistance, maxDistance)
  const [forwardX, , forwardZ] = normalizeHorizontal(lookDirection)
  const target = [playerX, playerY + targetHeight, playerZ]
  return {
    target,
    position: [
      target[0] - forwardX * safeDistance,
      target[1] + clamp(Number(cameraLift) || 1.8, 1.1, 4.2),
      target[2] - forwardZ * safeDistance,
    ],
    distance: safeDistance,
  }
}

export function getWheelZoomValue({
  current,
  deltaY,
  deltaMode = 0,
  min,
  max,
  sensitivity,
}) {
  const modeMultiplier = deltaMode === 1 ? 16 : deltaMode === 2 ? 800 : 1
  const normalizedDelta = clamp(Number(deltaY || 0) * modeMultiplier, -240, 240)
  const safeCurrent = clamp(Number(current) || min, min, max)
  return clamp(safeCurrent * Math.exp(normalizedDelta * (Number(sensitivity) || 0)), min, max)
}

export function projectCircleOutOfCircle({ x, z }, collider, padding = 0, fallbackDirection = [1, 0]) {
  const centerX = Number(collider?.position?.[0] ?? collider?.centerX ?? 0)
  const centerZ = Number(collider?.position?.[2] ?? collider?.centerZ ?? 0)
  const requiredDistance = Math.max(0, Number(collider?.collisionRadius || 0) + Number(padding || 0))
  const dx = Number(x) - centerX
  const dz = Number(z) - centerZ
  const distance = Math.hypot(dx, dz)
  if (distance >= requiredDistance - EPSILON) return { x: Number(x), z: Number(z), moved: false }
  const [fallbackX, , fallbackZ] = normalizeHorizontal([fallbackDirection[0], 0, fallbackDirection[1]], [1, 0, 0])
  const directionX = distance > EPSILON ? dx / distance : fallbackX
  const directionZ = distance > EPSILON ? dz / distance : fallbackZ
  return {
    x: centerX + directionX * (requiredDistance + EPSILON),
    z: centerZ + directionZ * (requiredDistance + EPSILON),
    moved: true,
  }
}

export function projectCircleOutOfAabb({ x, z }, body, radius) {
  const minX = Number(body.centerX) - Number(body.halfX) - radius
  const maxX = Number(body.centerX) + Number(body.halfX) + radius
  const minZ = Number(body.centerZ) - Number(body.halfZ) - radius
  const maxZ = Number(body.centerZ) + Number(body.halfZ) + radius
  if (x <= minX || x >= maxX || z <= minZ || z >= maxZ) return { x, z, moved: false }
  const candidates = [
    { distance: x - minX, x: minX - EPSILON, z },
    { distance: maxX - x, x: maxX + EPSILON, z },
    { distance: z - minZ, x, z: minZ - EPSILON },
    { distance: maxZ - z, x, z: maxZ + EPSILON },
  ]
  candidates.sort((a, b) => a.distance - b.distance)
  return { x: candidates[0].x, z: candidates[0].z, moved: true }
}

function segmentAabbHitFraction(start, end, bounds) {
  let entry = 0
  let exit = 1
  for (let axis = 0; axis < 3; axis += 1) {
    const delta = end[axis] - start[axis]
    const min = bounds.min[axis]
    const max = bounds.max[axis]
    if (Math.abs(delta) < EPSILON) {
      if (start[axis] < min || start[axis] > max) return null
      continue
    }
    const first = (min - start[axis]) / delta
    const second = (max - start[axis]) / delta
    const near = Math.min(first, second)
    const far = Math.max(first, second)
    entry = Math.max(entry, near)
    exit = Math.min(exit, far)
    if (entry > exit) return null
  }
  return entry >= 0 && entry <= 1 ? entry : null
}

function segmentCylinderHitFraction(start, end, collider, padding) {
  const centerX = Number(collider.position?.[0] || 0)
  const baseY = Number(collider.position?.[1] || 0)
  const centerZ = Number(collider.position?.[2] || 0)
  const radius = Math.max(0, Number(collider.collisionRadius || 0) + padding)
  const height = Math.max(radius * 1.5, Number(collider.cameraCollisionHeight || radius * 2.4))
  const dx = end[0] - start[0]
  const dz = end[2] - start[2]
  const originX = start[0] - centerX
  const originZ = start[2] - centerZ
  const a = dx * dx + dz * dz
  if (a < EPSILON) return null
  const b = 2 * (originX * dx + originZ * dz)
  const c = originX * originX + originZ * originZ - radius * radius
  if (c <= 0 && start[1] >= baseY - padding && start[1] <= baseY + height + padding) return 0
  const discriminant = b * b - 4 * a * c
  if (discriminant < 0) return null
  const root = Math.sqrt(discriminant)
  const candidates = [(-b - root) / (2 * a), (-b + root) / (2 * a)]
  for (const fraction of candidates) {
    if (fraction < 0 || fraction > 1) continue
    const y = start[1] + (end[1] - start[1]) * fraction
    if (y >= baseY - padding && y <= baseY + height + padding) return fraction
  }
  return null
}

export function resolveCameraLineOfSight({
  target,
  desiredPosition,
  colliders = [],
  padding = 0.16,
  minDistance = 0.72,
}) {
  const start = [Number(target[0]), Number(target[1]), Number(target[2])]
  const end = [Number(desiredPosition[0]), Number(desiredPosition[1]), Number(desiredPosition[2])]
  const totalDistance = Math.hypot(end[0] - start[0], end[1] - start[1], end[2] - start[2])
  if (totalDistance < EPSILON) return { position: end, obstructed: false, fraction: 1 }
  let nearestFraction = 1
  for (const collider of colliders) {
    let hitFraction = null
    if (collider?.kind === 'astra-builder-block') {
      hitFraction = segmentAabbHitFraction(start, end, {
        min: [collider.centerX - collider.halfX - padding, collider.minY - padding, collider.centerZ - collider.halfZ - padding],
        max: [collider.centerX + collider.halfX + padding, collider.maxY + padding, collider.centerZ + collider.halfZ + padding],
      })
    } else if (collider?.position && collider?.collisionRadius) {
      hitFraction = segmentCylinderHitFraction(start, end, collider, padding)
    }
    if (hitFraction !== null) nearestFraction = Math.min(nearestFraction, hitFraction)
  }
  if (nearestFraction >= 1) return { position: end, obstructed: false, fraction: 1 }
  const safeFraction = clamp(
    nearestFraction - padding / totalDistance,
    Math.min(1, minDistance / totalDistance),
    1,
  )
  return {
    position: [
      start[0] + (end[0] - start[0]) * safeFraction,
      start[1] + (end[1] - start[1]) * safeFraction,
      start[2] + (end[2] - start[2]) * safeFraction,
    ],
    obstructed: true,
    fraction: safeFraction,
  }
}
