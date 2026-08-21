/**
 * Pure World State Reducer for LUMI Protocol
 * Guarantees 100% deterministic world reconstruction from initialWorld + normalized events.
 */

export function createInitialWorldState(worldConfig = {}) {
  const rover = worldConfig.rover || {}
  const target = worldConfig.target || {}

  return {
    width: Number(worldConfig.width || 8),
    height: Number(worldConfig.height || 5),
    rover: {
      x: Number(rover.x || 0),
      y: Number(rover.y || 0),
      direction: Number(rover.direction || 0) % 360,
      energy: Number(rover.energy ?? 100),
      awake: Boolean(rover.awake ?? true),
      lastMessage: null,
    },
    target: {
      x: Number(target.x || 0),
      y: Number(target.y || 0),
      kind: String(target.kind || 'beacon'),
    },
    pathClear: Boolean(worldConfig.pathClear ?? true),
    obstacles: Array.isArray(worldConfig.obstacles)
      ? worldConfig.obstacles.map((obs) => ({ x: Number(obs.x), y: Number(obs.y) }))
      : [],
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
        }
        break
      }
      case 'rover_charged': {
        if (payload.end) {
          state.rover = { ...state.rover, ...payload.end }
        }
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
