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
        activeFrameId: raw.activeFrameId || 'main',
        receiverInstanceId: raw.receiverInstanceId || null,
      }
    } else if (raw.type === 'frame_entered') {
      type = 'frame_entered'
      payload = {
        frameId: raw.frameId,
        callableKind: raw.callableKind || 'function',
        functionName: raw.functionName,
        receiverInstanceId: raw.receiverInstanceId || null,
      }
    } else if (raw.type === 'frame_exited') {
      type = 'frame_exited'
      payload = {
        frameId: raw.frameId,
        functionName: raw.functionName,
        returnValue: raw.returnValue,
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
        name: raw.name ?? raw.payload?.name,
        before: raw.before ?? raw.payload?.before,
        after: raw.after ?? raw.payload?.after,
        receiverInstanceId: raw.receiverInstanceId ?? raw.payload?.receiverInstanceId ?? null,
        frameId,
      }
    } else if (raw.type === 'input_requested') {
      type = 'input_requested'
      payload = {
        prompt: raw.prompt ?? raw.payload?.prompt ?? '',
      }
    } else if (raw.type === 'input_received') {
      type = 'input_received'
      payload = {
        prompt: raw.prompt ?? raw.payload?.prompt ?? '',
        value: raw.value ?? raw.payload?.value,
      }
    } else if (raw.type === 'sensor_read') {
      type = 'sensor_read'
      payload = {
        sensor: raw.sensor ?? raw.payload?.sensor,
        value: raw.value ?? raw.payload?.value,
      }
    } else if (raw.type === 'game_inited') {
      type = 'game_inited'
      payload = { width: raw.width, height: raw.height }
    } else if (raw.type === 'game_quitted') {
      type = 'game_quitted'
      payload = { frame: raw.frame }
    } else if (raw.type === 'screen_blitted') {
      type = 'screen_blitted'
      payload = { image: raw.image, position: raw.position }
    } else if (raw.type === 'shape_drawn') {
      type = 'shape_drawn'
      payload = { shape: raw.shape, color: raw.color, rect: raw.rect, center: raw.center, radius: raw.radius, width: raw.width }
    } else if (raw.type === 'text_rendered') {
      type = 'text_rendered'
      payload = { text: raw.text, position: raw.position, color: raw.color }
    } else if (raw.type === 'hud_bar_updated') {
      type = 'hud_bar_updated'
      payload = { label: raw.label, value: raw.value, maximum: raw.maximum, color: raw.color }
    } else if (raw.type === 'sound_played') {
      type = 'sound_played'
      payload = { name: raw.name }
    } else if (raw.type === 'music_played') {
      type = 'music_played'
      payload = { name: raw.name }
    } else if (raw.type === 'key_checked') {
      type = 'key_checked'
      payload = { key: raw.key, pressed: raw.pressed, frame: raw.frame }
    } else if (raw.type === 'clock_ticked') {
      type = 'clock_ticked'
      payload = { frame: raw.frame, fps: raw.fps }
    } else if (raw.type === 'collision_detected') {
      type = 'collision_detected'
      payload = { a: raw.a, b: raw.b, collided: raw.collided }
    } else if (raw.type === 'shield_raised') {
      type = 'shield_raised'
      payload = { energy: raw.energy, incomingPulse: raw.incomingPulse, rover: raw.end }
    } else if (raw.type === 'rover_dodged') {
      type = 'rover_dodged'
      payload = { direction: raw.direction, rover: raw.end }
    } else if (raw.type === 'enemy_jammed') {
      type = 'enemy_jammed'
      payload = { enemy: raw.enemy, rover: raw.end }
    } else if (raw.type === 'enemy_purified') {
      type = 'enemy_purified'
      payload = { enemy: raw.enemy, rover: raw.end }
    } else if (raw.type === 'condition_evaluated') {
      type = 'condition_evaluated'
      payload = {
        expression: raw.expression ?? raw.payload?.expression,
        result: Boolean(raw.result ?? raw.payload?.result),
        left: raw.left ?? raw.payload?.left,
        operator: raw.operator ?? raw.payload?.operator,
        right: raw.right ?? raw.payload?.right,
      }
    } else if (raw.type === 'energy_changed') {
      type = 'energy_changed'
      payload = {
        entityId: raw.entityId ?? raw.payload?.entityId ?? 'lumi',
        fromEnergy: raw.fromEnergy ?? raw.payload?.fromEnergy,
        toEnergy: raw.toEnergy ?? raw.payload?.toEnergy,
        reason: raw.reason ?? raw.payload?.reason ?? 'charge',
      }
    } else if (raw.type === 'barrier_changed') {
      type = 'barrier_changed'
      payload = {
        id: raw.id ?? raw.payload?.id ?? 'active_gate',
        state: raw.state ?? raw.payload?.state ?? 'disabled',
      }
    } else if (raw.payload && typeof raw.payload === 'object') {
      type = raw.type
      payload = { ...raw.payload }
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
