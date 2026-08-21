/**
 * LUMI Event Normalizer
 * Transforms worker raw trace events into standard LumiEvent v2 envelope.
 */

export function normalizeRuntimeEvents(rawEvents = []) {
  if (!Array.isArray(rawEvents)) return []

  return rawEvents.map((raw, index) => {
    const seq = typeof raw.seq === 'number' ? raw.seq : index
    const sourceLine = raw.sourceLine ?? raw.line ?? null
    const frameId = raw.frameId || 'main'
    const logicalTime = raw.logicalTime ?? index * 100
    const phase = raw.phase || 'execute'

    // If already v2 normalized
    if (raw.schemaVersion === 2 && raw.type && raw.payload) {
      return {
        schemaVersion: 2,
        seq,
        type: raw.type,
        sourceLine,
        frameId,
        logicalTime,
        phase,
        payload: { ...raw.payload },
      }
    }

    // Convert legacy / worker raw events
    let type = raw.type || 'unknown'
    let payload = {}

    if (raw.type === 'line') {
      type = 'line_entered'
      payload = {
        line: raw.line,
        variables: raw.variables || {},
        rover: raw.rover || {},
      }
    } else if (raw.type === 'world') {
      const action = raw.action
      if (action === 'wake') {
        type = 'rover_woke'
        payload = { awake: true, rover: raw.end }
      } else if (action === 'move') {
        type = 'rover_moved'
        payload = {
          start: raw.start,
          end: raw.end,
          path: raw.path || [],
          blocked: Boolean(raw.blocked),
          reachedTarget: Boolean(raw.reachedTarget),
        }
      } else if (action === 'turn') {
        type = 'rover_turned'
        payload = {
          degrees: raw.degrees,
          end: raw.end,
        }
      } else if (action === 'say') {
        type = 'rover_spoke'
        payload = {
          message: raw.message,
          end: raw.end,
        }
      } else if (action === 'scan') {
        type = 'rover_scanned'
        payload = {
          found: raw.found || [],
          end: raw.end,
        }
      } else if (action === 'collect') {
        type = 'rover_collected'
        payload = {
          object: raw.object,
          inventoryCount: raw.inventoryCount,
          end: raw.end,
        }
      } else if (action === 'charge') {
        type = 'rover_charged'
        payload = {
          before: raw.before,
          end: raw.end,
        }
      }
    } else if (raw.type === 'memory_changed') {
      type = 'memory_changed'
      payload = {
        name: raw.name,
        before: raw.before,
        after: raw.after,
      }
    } else if (raw.type === 'sensor_read') {
      type = 'sensor_read'
      payload = {
        sensor: raw.sensor,
        value: raw.value,
      }
    } else {
      payload = { ...raw }
      delete payload.type
      delete payload.seq
    }

    return {
      schemaVersion: 2,
      seq,
      type,
      sourceLine,
      frameId,
      logicalTime,
      phase,
      payload,
    }
  })
}
