/**
 * Pure World State Reducer for LUMI Protocol
 * Guarantees 100% deterministic world reconstruction from initialWorld + normalized events.
 */

export function createInitialWorldState(worldConfig = {}) {
  const rover = worldConfig.rover || {}
  const targetConfig = worldConfig.target
  const hasExplicitTarget = targetConfig !== false && targetConfig !== null
  const target = hasExplicitTarget && targetConfig ? {
    x: Number(targetConfig.x ?? (Number(worldConfig.width || 8) - 1)),
    y: Number(targetConfig.y ?? Math.floor((Number(worldConfig.height || 5)) / 2)),
    radius: Number(targetConfig.radius ?? 0.8),
    kind: String(targetConfig.kind || 'beacon'),
    label: targetConfig.label || null,
    visible: targetConfig.visible !== false,
  } : (hasExplicitTarget && targetConfig === undefined ? {
    x: Number(worldConfig.width || 8) - 1,
    y: Math.floor((Number(worldConfig.height || 5)) / 2),
    radius: 0.8,
    kind: 'beacon',
    label: null,
    visible: true,
  } : null)

  const initialRoverX = Number(rover.x || 0)
  const initialRoverY = Number(rover.y || 0)

  return {
    width: Number(worldConfig.width || 8),
    height: Number(worldConfig.height || 5),
    scene: String(worldConfig.scene || 'nav'),
    rover: {
      x: initialRoverX,
      y: initialRoverY,
      direction: Number(rover.direction || 0) % 360,
      energy: Number(rover.energy ?? 100),
      awake: Boolean(rover.awake ?? true),
      collisionRadius: Number(rover.collisionRadius ?? 0.2),
      hitMine: false,
      blocked: false,
      lastMessage: null,
    },
    target,
    pathClear: Boolean(worldConfig.pathClear ?? true),
    pathTrail: [{ x: initialRoverX, y: initialRoverY }],
    hitMinePoint: null,
    obstacles: Array.isArray(worldConfig.obstacles)
      ? worldConfig.obstacles.map((obs, idx) => ({
        id: obs.id || `obs_${idx + 1}`,
        x: Number(obs.x),
        y: Number(obs.y),
        radius: obs.radius !== undefined ? Number(obs.radius) : undefined,
        collisionRadius: obs.collisionRadius !== undefined ? Number(obs.collisionRadius) : undefined,
      }))
      : [],
    barriers: Array.isArray(worldConfig.barriers)
      ? worldConfig.barriers.map((b, idx) => ({
        id: String(b.id || `barrier_${idx + 1}`),
        x: Number(b.x ?? 0),
        y: b.y !== undefined && b.y !== null ? Number(b.y) : null,
        label: b.label || '에너지 장벽',
        state: b.state || 'active',
      }))
      : [],
    stations: Array.isArray(worldConfig.stations)
      ? worldConfig.stations.map((s, idx) => ({
        id: String(s.id || `station_${idx + 1}`),
        x: Number(s.x ?? 0),
        y: Number(s.y ?? 0),
        label: s.label || '충전소',
        active: Boolean(s.active ?? true),
      }))
      : [],
    activeCondition: null,
    objects: Array.isArray(worldConfig.objects)
      ? worldConfig.objects.map((obj, index) => ({
        id: String(obj.id || `object_${index + 1}`),
        kind: String(obj.kind || 'signal'),
        x: Number(obj.x || 0),
        y: Number(obj.y || 0),
        value: obj.value ?? 1,
        strength: obj.strength ?? 1,
        priority: obj.priority ?? 1,
        collected: Boolean(obj.collected),
      }))
      : [],
    inventory: Array.isArray(worldConfig.inventory)
      ? worldConfig.inventory.map((item) => ({ ...item }))
      : [],
    variables: {},
    sensorReadings: {},
    gameState: {
      inited: false,
      running: false,
      quitted: false,
      frame: 0,
      fps: 10,
      skin: String(worldConfig.skin || 'default'),
      blits: [],
      shapes: [],
      texts: [],
      hudBars: {},
      shieldActive: false,
      lastSound: null,
      lastMusic: null,
      pressedKeys: [],
      incomingPulse: Boolean(worldConfig.incomingPulse),
      pulseDistance: Number(worldConfig.pulseDistance || 3),
      enemies: Array.isArray(worldConfig.enemies) ? worldConfig.enemies.map((e) => ({ ...e })) : [],
      collisions: [],
    },
  }
}

export function reduceLumiWorldState(initialWorld = {}, normalizedEvents = [], targetSeq = Infinity) {
  const state = createInitialWorldState(initialWorld)

  for (const event of normalizedEvents) {
    if (event.seq > targetSeq) break

    const payload = event.payload || {}

    switch (event.type) {
      case 'rover_woke': {
        state.rover.awake = true
        if (payload.rover) {
          state.rover = { ...state.rover, ...payload.rover, awake: true }
        }
        break
      }
      case 'rover_moved': {
        if (payload.end) {
          state.rover = { ...state.rover, ...payload.end }
          state.pathTrail.push({
            x: Number(payload.end.x ?? state.rover.x),
            y: Number(payload.end.y ?? state.rover.y),
            hitMine: Boolean(payload.hitMine),
            blocked: Boolean(payload.blocked),
          })
        }
        if (payload.hitMine) {
          state.rover.hitMine = true
          state.rover.blocked = true
        }
        break
      }
      case 'rover_hit_mine': {
        state.rover.hitMine = true
        state.rover.blocked = true
        if (payload.point) {
          state.hitMinePoint = { x: Number(payload.point.x), y: Number(payload.point.y) }
        }
        if (payload.end) {
          state.rover = { ...state.rover, ...payload.end, hitMine: true, blocked: true }
        }
        break
      }
      case 'rover_turned': {
        if (payload.end) {
          state.rover = { ...state.rover, ...payload.end }
        }
        break
      }
      case 'rover_spoke': {
        state.rover.lastMessage = payload.message || ''
        if (payload.end) {
          state.rover = { ...state.rover, ...payload.end, lastMessage: payload.message || '' }
        }
        break
      }
      case 'rover_collected': {
        if (payload.end) {
          state.rover = { ...state.rover, ...payload.end }
        }
        if (payload.object?.id) {
          const targetObj = state.objects.find((item) => item.id === payload.object.id)
          if (targetObj) targetObj.collected = true
          state.inventory.push({ ...payload.object, collected: true })
          state.collectedCount = (state.collectedCount || 0) + 1
        }
        break
      }
      case 'rover_charged': {
        if (payload.end) {
          state.rover = { ...state.rover, ...payload.end }
        }
        state.rover.energy = 100
        break
      }
      case 'condition_evaluated': {
        state.activeCondition = {
          expression: payload.expression || 'condition',
          result: Boolean(payload.result),
          sourceLine: event.sourceLine,
        }
        break
      }
      case 'energy_changed': {
        if (payload.toEnergy !== undefined) {
          state.rover.energy = Number(payload.toEnergy)
        }
        break
      }
      case 'barrier_changed': {
        const nextState = payload.state || 'disabled'
        state.barriers = state.barriers.map((b) => (
          b.id === payload.id || !payload.id ? { ...b, state: nextState } : b
        ))
        break
      }
      case 'shield_raised': {
        state.gameState.shieldActive = true
        if (payload.incomingPulse !== undefined) {
          state.gameState.incomingPulse = Boolean(payload.incomingPulse)
        }
        if (payload.rover) {
          state.rover = { ...state.rover, ...payload.rover }
        }
        break
      }
      case 'rover_dodged': {
        if (payload.rover) {
          state.rover = { ...state.rover, ...payload.rover }
        }
        break
      }
      case 'enemy_jammed':
      case 'enemy_purified': {
        if (payload.rover) {
          state.rover = { ...state.rover, ...payload.rover }
        }
        break
      }
      case 'game_inited': {
        state.gameState.inited = true
        state.gameState.running = true
        state.gameState.quitted = false
        break
      }
      case 'game_quitted': {
        state.gameState.running = false
        state.gameState.quitted = true
        break
      }
      case 'screen_blitted': {
        if (payload.image) {
          if (String(payload.image).startsWith('lumi_')) {
            state.gameState.skin = String(payload.image)
          }
          state.gameState.blits.push({ image: payload.image, position: payload.position })
          if (state.gameState.blits.length > 60) state.gameState.blits.shift()
        }
        break
      }
      case 'shape_drawn': {
        state.gameState.shapes.push({
          shape: payload.shape,
          color: payload.color,
          rect: payload.rect,
          center: payload.center,
          radius: payload.radius,
          width: payload.width,
        })
        if (state.gameState.shapes.length > 80) state.gameState.shapes.shift()
        break
      }
      case 'text_rendered': {
        state.gameState.texts.push({
          text: payload.text,
          position: payload.position,
          color: payload.color,
        })
        if (state.gameState.texts.length > 40) state.gameState.texts.shift()
        break
      }
      case 'hud_bar_updated': {
        if (payload.label) {
          state.gameState.hudBars[payload.label] = {
            label: payload.label,
            value: payload.value,
            maximum: payload.maximum,
            color: payload.color,
          }
        }
        break
      }
      case 'sound_played': {
        state.gameState.lastSound = payload.name
        break
      }
      case 'music_played': {
        state.gameState.lastMusic = payload.name
        break
      }
      case 'key_checked': {
        if (payload.key) {
          state.gameState.pressedKeys = state.gameState.pressedKeys.filter((key) => key !== payload.key)
          if (payload.pressed) state.gameState.pressedKeys.push(payload.key)
        }
        break
      }
      case 'clock_ticked': {
        state.gameState.frame = Number(payload.frame ?? state.gameState.frame + 1)
        if (payload.fps !== undefined) state.gameState.fps = Number(payload.fps)
        break
      }
      case 'collision_detected': {
        state.gameState.collisions.push({ a: payload.a, b: payload.b, collided: payload.collided })
        if (state.gameState.collisions.length > 60) state.gameState.collisions.shift()
        break
      }
      case 'line_entered': {
        if (payload.variables) {
          state.variables = { ...state.variables, ...payload.variables }
        }
        if (payload.rover) {
          state.rover = { ...state.rover, ...payload.rover }
        }
        break
      }
      case 'memory_changed': {
        if (payload.name) {
          state.variables = {
            ...state.variables,
            [payload.name]: payload.after,
          }
        }
        break
      }
      case 'sensor_read': {
        if (payload.sensor) {
          state.sensorReadings = {
            ...state.sensorReadings,
            [payload.sensor]: payload.value,
          }
          if (payload.sensor === 'incoming_pulse') {
            state.gameState.incomingPulse = Boolean(payload.value)
          }
          if (payload.sensor === 'pulse_distance') {
            state.gameState.pulseDistance = Number(payload.value)
          }
        }
        break
      }
      default:
        break
    }
  }

  return state
}

export function createPlaybackSteps(normalizedEvents = []) {
  if (!Array.isArray(normalizedEvents) || normalizedEvents.length === 0) {
    return []
  }

  const steps = []
  let currentStep = null

  for (const event of normalizedEvents) {
    if (event.type === 'line_entered' || !currentStep) {
      if (currentStep) {
        steps.push(currentStep)
      }
      currentStep = {
        stepIndex: steps.length,
        sourceLine: event.sourceLine ?? null,
        events: [event],
        targetSeq: event.seq,
      }
    } else {
      currentStep.events.push(event)
      currentStep.targetSeq = event.seq
    }
  }

  if (currentStep) {
    steps.push(currentStep)
  }

  return steps
}
