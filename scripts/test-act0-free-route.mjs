import assert from 'node:assert/strict'
import { getLumiMissionSet } from '../src/components/PythonWorld/lumiCourseCatalog.js'
import { evaluateMissionAttempt } from '../src/components/PythonWorld/missionEvaluator.js'

// Simple JS simulation of the pythonWorld worker Rover logic for testing evaluator & route geometry
function simulateMissionRun(mission, userCode) {
  const worldConfig = mission.world || {}
  const roverCfg = worldConfig.rover || {}
  const targetCfg = worldConfig.target || {}
  const rover = {
    x: Number(roverCfg.x ?? 0),
    y: Number(roverCfg.y ?? 0),
    direction: Number(roverCfg.direction ?? 0) % 360,
    awake: Boolean(roverCfg.awake ?? true),
    energy: Number(roverCfg.energy ?? 100),
    collisionRadius: Number(roverCfg.collisionRadius ?? 0.2),
    blocked: false,
    hitMine: false,
  }
  const target = {
    x: Number(targetCfg.x ?? 0),
    y: Number(targetCfg.y ?? 0),
    radius: Number(targetCfg.radius ?? 0.8),
  }
  const mines = (worldConfig.obstacles || []).map((m) => ({
    x: Number(m.x),
    y: Number(m.y),
    collisionRadius: Number(m.collisionRadius ?? m.radius ?? 0.32),
  }))

  const events = []
  let minClearance = null
  let targetReachedAt = null

  function getSegmentCircleHit(p1, p2, circle, hitRadius) {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const fx = p1.x - circle.x
    const fy = p1.y - circle.y

    if (fx * fx + fy * fy <= hitRadius * hitRadius) {
      return { hit: true, t: 0, point: { x: p1.x, y: p1.y } }
    }

    const a = dx * dx + dy * dy
    if (a < 1e-12) return { hit: false, t: null, point: null }

    const b = 2 * (fx * dx + fy * dy)
    const c = (fx * fx + fy * fy) - hitRadius * hitRadius
    const disc = b * b - 4 * a * c
    if (disc < 0) return { hit: false, t: null, point: null }

    const sqrtD = Math.sqrt(disc)
    const t1 = (-b - sqrtD) / (2 * a)
    const t2 = (-b + sqrtD) / (2 * a)

    const valid = [t1, t2].filter((t) => t >= 0 && t <= 1)
    if (valid.length === 0) return { hit: false, t: null, point: null }

    const tHit = Math.min(...valid)
    return {
      hit: true,
      t: tHit,
      point: { x: p1.x + tHit * dx, y: p1.y + tHit * dy },
    }
  }

  function getSegmentPointDist(p1, p2, pt) {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const a = dx * dx + dy * dy
    if (a < 1e-12) return Math.hypot(p1.x - pt.x, p1.y - pt.y)
    const t = Math.max(0, Math.min(1, ((pt.x - p1.x) * dx + (pt.y - p1.y) * dy) / a))
    const projX = p1.x + t * dx
    const projY = p1.y + t * dy
    return Math.hypot(projX - pt.x, projY - pt.y)
  }

  // Parse and simulate lines
  const lines = userCode.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
  const conceptsUsed = ['wake', 'move', 'turn', 'say']
  const callsUsed = []

  for (const line of lines) {
    if (line === 'lumi.wake()') {
      callsUsed.push('lumi.wake')
      rover.awake = true
      events.push({ type: 'rover_woke', rover: { ...rover } })
    } else if (line.startsWith('lumi.turn(')) {
      callsUsed.push('lumi.turn')
      const match = line.match(/lumi\.turn\(([^)]+)\)/)
      if (match) {
        const deg = parseFloat(match[1])
        rover.direction = ((rover.direction + deg) % 360 + 360) % 360
        events.push({ type: 'rover_turned', degrees: deg, end: { ...rover } })
      }
    } else if (line.startsWith('lumi.move(')) {
      callsUsed.push('lumi.move')
      if (rover.blocked) continue

      const match = line.match(/lumi\.move\(([^)]+)\)/)
      if (match) {
        const dist = parseFloat(match[1])
        const rad = (dist < 0 ? (rover.direction + 180) : rover.direction) * (Math.PI / 180)
        const actualDist = Math.abs(dist)
        const nx = rover.x + Math.cos(rad) * actualDist
        const ny = rover.y + Math.sin(rad) * actualDist

        const p1 = { x: rover.x, y: rover.y }
        const p2 = { x: nx, y: ny }

        let earliestHit = null
        for (const mine of mines) {
          const hitRadius = mine.collisionRadius + rover.collisionRadius
          const hitRes = getSegmentCircleHit(p1, p2, mine, hitRadius)
          if (hitRes.hit) {
            if (!earliestHit || hitRes.t < earliestHit.t) {
              earliestHit = { ...hitRes, mine }
            }
          }
          const distToMine = getSegmentPointDist(p1, p2, mine) - hitRadius
          if (minClearance === null || distToMine < minClearance) {
            minClearance = distToMine
          }
        }

        if (earliestHit) {
          rover.x = earliestHit.point.x
          rover.y = earliestHit.point.y
          rover.blocked = true
          rover.hitMine = true
          events.push({ type: 'rover_hit_mine', point: { ...rover }, obstacle: earliestHit.mine, end: { ...rover } })
          events.push({ type: 'rover_moved', distance: dist, blocked: true, hitMine: true, end: { ...rover } })
        } else {
          rover.x = nx
          rover.y = ny
          const targetDist = Math.hypot(rover.x - target.x, rover.y - target.y)
          const reached = targetDist <= target.radius
          if (reached && targetReachedAt === null) {
            targetReachedAt = events.length
          }
          events.push({ type: 'rover_moved', distance: dist, blocked: false, reachedTarget: reached, end: { ...rover } })
        }
      }
    } else if (line.startsWith('lumi.say(')) {
      callsUsed.push('lumi.say')
      const targetDist = Math.hypot(rover.x - target.x, rover.y - target.y)
      const insideTarget = targetDist <= target.radius
      const isAfterArrival = insideTarget || targetReachedAt !== null
      const msg = line.slice(9, -1).replace(/^["']|["']$/g, '')
      events.push({
        type: 'rover_spoke',
        message: msg,
        insideTarget,
        targetReachedAtSayTime: isAfterArrival,
        end: { ...rover },
      })
    }
  }

  return {
    events,
    conceptsUsed,
    callsUsed,
    finalState: {
      rover: { ...rover },
      minClearance,
      hitMine: rover.hitMine,
      targetReachedAt,
    },
  }
}

async function runTests() {
  console.log('=== Running ACT 0 Free Route (Field Test) Contract Tests ===\n')

  const missionSet = getLumiMissionSet('act-0-awakening')
  const freeRouteMission = missionSet.missions.find((m) => m.id === 'lumi-vs-06')

  assert.ok(freeRouteMission, 'lumi-vs-06 mission must exist')
  assert.equal(freeRouteMission.title, 'Field Test: 자유 항로')
  assert.equal(freeRouteMission.isFreeRoute, true)
  assert.equal(freeRouteMission.showSolution, false)

  // Test 1: Route A (Upper corridor traversal)
  console.log('[Test 1] Route A: Upper corridor angle traversal...')
  const routeACode = `
lumi.wake()
lumi.turn(-50)
lumi.move(4.2)
lumi.turn(40)
lumi.move(3.0)
lumi.say("비콘 도착!")
  `.trim()

  const simResultA = simulateMissionRun(freeRouteMission, routeACode)
  const evalResultA = evaluateMissionAttempt({
    mission: freeRouteMission,
    runtimeResult: simResultA,
  })
  if (!evalResultA.passed) {
    console.log('DEBUG Route A:', JSON.stringify({
      rover: simResultA.finalState.rover,
      events: simResultA.events,
      goalDetails: evalResultA.goalDetails,
      failureReason: evalResultA.failureReason,
    }, null, 2))
  }
  assert.equal(evalResultA.passed, true, 'Route A must pass all goals')
  assert.ok(evalResultA.fieldAnalysis.totalDistance > 6, 'Total distance should be tracked')
  assert.equal(evalResultA.fieldAnalysis.turnCount, 2, 'Turn count should be 2')
  console.log('  -> Route A PASSED (Distance:', evalResultA.fieldAnalysis.totalDistance, 'Clearance:', evalResultA.fieldAnalysis.minClearance, ')')

  // Test 2: Route B (Lower bypass traversal)
  console.log('[Test 2] Route B: Lower bypass traversal...')
  const routeBCode = `
lumi.wake()
lumi.move(4.5)
lumi.turn(-75)
lumi.move(3.8)
lumi.say("구조 비콘에 도달했습니다.")
  `.trim()

  const simResultB = simulateMissionRun(freeRouteMission, routeBCode)
  const evalResultB = evaluateMissionAttempt({
    mission: freeRouteMission,
    runtimeResult: simResultB,
  })
  assert.equal(evalResultB.passed, true, 'Route B must pass all goals')
  console.log('  -> Route B PASSED (Distance:', evalResultB.fieldAnalysis.totalDistance, ')')

  // Test 3: Route C (Backward move support)
  console.log('[Test 3] Route C: Backward move support...')
  const routeCCode = `
lumi.wake()
lumi.turn(130)
lumi.move(-4.2)
lumi.turn(-140)
lumi.move(3.0)
lumi.say("후진 항로 완주")
  `.trim()

  const simResultC = simulateMissionRun(freeRouteMission, routeCCode)
  const evalResultC = evaluateMissionAttempt({
    mission: freeRouteMission,
    runtimeResult: simResultC,
  })
  assert.equal(evalResultC.passed, true, 'Route C (backward move) must pass')
  console.log('  -> Route C PASSED')

  // Test 4: Straight Line collision test (Straight path hits mine)
  console.log('[Test 4] Straight Line collision test...')
  const straightCode = `
lumi.wake()
lumi.turn(-33.2)
lumi.move(6.5)
lumi.say("도착")
  `.trim()

  const simResultStraight = simulateMissionRun(freeRouteMission, straightCode)
  const evalResultStraight = evaluateMissionAttempt({
    mission: freeRouteMission,
    runtimeResult: simResultStraight,
  })
  assert.equal(evalResultStraight.passed, false, 'Straight route must fail due to mine collision')
  assert.equal(simResultStraight.finalState.hitMine, true, 'Mine hit must be detected')
  console.log('  -> Straight Line correctly detected Mine collision & failed goals')

  // Test 5: Missing wake() test
  console.log('[Test 5] Missing wake() test...')
  const noWakeCode = `
lumi.turn(-65)
lumi.move(3.5)
lumi.turn(65)
lumi.move(4.0)
lumi.say("도착")
  `.trim()

  const simResultNoWake = simulateMissionRun(freeRouteMission, noWakeCode)
  const evalResultNoWake = evaluateMissionAttempt({
    mission: freeRouteMission,
    runtimeResult: simResultNoWake,
  })
  assert.equal(evalResultNoWake.passed, false, 'Must fail if awake is false')
  console.log('  -> Missing wake() correctly failed')

  // Test 6: Premature say() test (say called before reaching target)
  console.log('[Test 6] Premature say() test...')
  const prematureSayCode = `
lumi.wake()
lumi.say("출발하자마자 말하기")
lumi.turn(-65)
lumi.move(3.5)
lumi.turn(65)
lumi.move(4.0)
  `.trim()

  const simResultPremature = simulateMissionRun(freeRouteMission, prematureSayCode)
  const evalResultPremature = evaluateMissionAttempt({
    mission: freeRouteMission,
    runtimeResult: simResultPremature,
  })
  assert.equal(evalResultPremature.passed, false, 'Must fail if say() called before arrival')
  console.log('  -> Premature say() correctly failed')

  console.log('\n=== All ACT 0 Free Route Contract Tests Passed 100%! ===')
}

runTests().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
