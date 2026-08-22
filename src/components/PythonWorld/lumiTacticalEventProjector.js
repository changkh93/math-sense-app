/**
 * LUMI Tactical Event Projector (Pure Module)
 * Deterministically projects normalized execution trace events into domain tactical simulation events.
 * 
 * Rules:
 * - Pure function, deterministic output
 * - Preserves sourceSeq of originating runtime trace events
 * - No dependency on Date.now(), Math.random(), or animation frames
 */

export function projectTacticalEvents(normalizedEvents = [], mission = null) {
  const tacticalEvents = []
  if (!Array.isArray(normalizedEvents) || normalizedEvents.length === 0) return tacticalEvents

  const projectionConfig = mission?.tacticalProjection || {}
  const targetMethod = projectionConfig.targetMethod || 'purify_signal'
  const stateAttr = projectionConfig.stateAttribute || 'corruption'
  const restoredThreshold = projectionConfig.restoredWhen?.lte ?? 0
  const requiredAttributes = Array.isArray(projectionConfig.requiredAttributes)
    ? projectionConfig.requiredAttributes
    : [stateAttr]

  const knownEntities = new Map()
  let tacticalSeq = 0

  const emitTactical = (type, payload, sourceSeq) => {
    tacticalSeq += 1
    tacticalEvents.push({
      type,
      tacticalSeq,
      sourceSeq: sourceSeq ?? null,
      payload: { ...payload },
    })
  }

  const collectInstanceSnapshots = (value, bindingPath, output = [], depth = 0, seen = new Set()) => {
    if (!value || typeof value !== 'object' || depth > 5 || seen.has(value)) return output
    seen.add(value)
    if (value.kind === 'python_instance' && value.id) {
      const attrs = value.publicAttributes || {}
      if (requiredAttributes.every((name) => attrs[name] !== undefined)) {
        output.push({ snap: value, binding: bindingPath })
      }
      Object.entries(attrs).forEach(([name, child]) => {
        collectInstanceSnapshots(child, bindingPath ? `${bindingPath}.${name}` : name, output, depth + 1, seen)
      })
      return output
    }
    if (Array.isArray(value)) {
      value.forEach((child, index) => {
        collectInstanceSnapshots(child, `${bindingPath || 'items'}[${index}]`, output, depth + 1, seen)
      })
      return output
    }
    Object.entries(value).forEach(([name, child]) => {
      collectInstanceSnapshots(child, bindingPath ? `${bindingPath}.${name}` : name, output, depth + 1, seen)
    })
    return output
  }

  for (const ev of normalizedEvents) {
    const sourceSeq = ev.seq ?? null
    const payload = ev.payload || {}

    // 1. Entity Materialization from memory_changed instance snapshots
    if (ev.type === 'memory_changed') {
      const snapshots = collectInstanceSnapshots(payload.after, payload.name === 'self' ? null : payload.name)
      snapshots.forEach(({ snap, binding }) => {
        const entityId = `entity:${snap.id}`
        if (!knownEntities.has(entityId)) {
          const publicAttrs = snap.publicAttributes || {}
          const initialVal = publicAttrs[stateAttr] !== undefined ? Number(publicAttrs[stateAttr]) : 20
          const entityData = {
            entityId,
            instanceId: snap.id,
            className: snap.className || 'Drone',
            binding,
            name: publicAttrs.name || binding || `DRONE-${snap.id}`,
            [stateAttr]: initialVal,
            maxVal: initialVal,
            state: 'DETECTED',
          }
          knownEntities.set(entityId, entityData)
          emitTactical('entity_materialized', entityData, sourceSeq)
          if (Number(initialVal) <= restoredThreshold) {
            entityData.state = 'RESTORED'
            emitTactical('entity_restored', {
              entityId,
              instanceId: snap.id,
              attribute: stateAttr,
              value: initialVal,
              state: 'RESTORED',
            }, sourceSeq)
          }
        } else {
          // Attribute change on known entity
          const entityData = knownEntities.get(entityId)
          const previousSnapshots = collectInstanceSnapshots(payload.before, payload.name === 'self' ? null : payload.name)
          const previousSnap = previousSnapshots.find((item) => item.snap.id === snap.id)?.snap
          const prevAttrs = previousSnap?.publicAttributes || {}
          const currAttrs = snap.publicAttributes || {}
          const prevVal = prevAttrs[stateAttr]
          const currVal = currAttrs[stateAttr]

          if (currVal !== undefined && currVal !== prevVal) {
            entityData[stateAttr] = Number(currVal)
            emitTactical('entity_attribute_changed', {
              entityId,
              instanceId: snap.id,
              attribute: stateAttr,
              before: prevVal,
              after: currVal,
            }, sourceSeq)

            // Check if restored
            if (Number(currVal) <= restoredThreshold && entityData.state !== 'RESTORED') {
              entityData.state = 'RESTORED'
              emitTactical('entity_restored', {
                entityId,
                instanceId: snap.id,
                attribute: stateAttr,
                value: currVal,
                state: 'RESTORED',
              }, sourceSeq)
            }
          }
        }
      })
    }

    // 2. Method call targeting
    if (ev.type === 'frame_entered' && (payload.callableKind === 'method' || ev.callableKind === 'method')) {
      const receiverId = payload.receiverInstanceId || ev.receiverInstanceId
      const fnName = payload.functionName || ev.functionName
      if (receiverId && fnName === targetMethod) {
        const entityId = `entity:${receiverId}`
        emitTactical('entity_targeted', {
          entityId,
          receiverInstanceId: receiverId,
          methodName: fnName,
        }, sourceSeq)

        emitTactical('pulse_emitted', {
          entityId,
          receiverInstanceId: receiverId,
          methodName: fnName,
        }, sourceSeq)
      }
    }
  }

  return tacticalEvents
}
