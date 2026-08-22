/**
 * Pure Derived Selectors for LUMI Execution Trace & Object Models
 * 
 * Rules:
 * 1. class_registered: derived from AST metadata and runtime line/memory snapshots
 * 2. instance_created: derived from distinct instance.id in line & memory_changed events (ignoring local 'self')
 * 3. instance_alias: derived when an instance.id is assigned to multiple non-self variable names
 * 4. attribute_diffs: derived by comparing before/after of publicAttributes for the same instance.id
 * 5. deriveExecutionModel: pure reducer filtering by playhead targetSeq to guarantee deterministic time-travel
 */

export function selectClassRegistrations(events = [], classesMetadata = {}) {
  const registeredClasses = new Map()

  // First seed from AST metadata if provided
  if (classesMetadata && typeof classesMetadata === 'object') {
    Object.entries(classesMetadata).forEach(([name, meta]) => {
      registeredClasses.set(name, {
        className: name,
        initParameters: meta.initParameters || [],
        methods: meta.methods || [],
        source: 'ast',
      })
    })
  }

  const registerRuntimeClass = (value, sourceLine) => {
    if (!value || value.kind !== 'python_class' || !value.className) return
    const existing = registeredClasses.get(value.className)
    registeredClasses.set(value.className, {
      className: value.className,
      initParameters: existing?.initParameters || [],
      methods: (value.methods || []).map((method) => (
        typeof method === 'string' ? { name: method, parameters: [] } : method
      )),
      source: 'runtime',
      sourceLine,
    })
  }

  // Then derive from runtime line snapshots and memory changes. Supporting both
  // keeps the projection valid for initial class snapshots as well as later
  // assignments, without relying on AST metadata to claim runtime execution.
  events.forEach((ev) => {
    const sourceLine = ev.sourceLine ?? ev.line ?? ev.payload?.sourceLine
    if (ev.type === 'line_entered' || ev.type === 'line') {
      const variables = ev.payload?.variables ?? ev.variables ?? {}
      Object.values(variables).forEach((value) => registerRuntimeClass(value, sourceLine))
    } else if (ev.type === 'memory_changed') {
      registerRuntimeClass(ev.payload?.after ?? ev.after, sourceLine)
    }
  })

  return Array.from(registeredClasses.values())
}

export function selectInstanceCreations(events = []) {
  const instances = new Map()
  const variableToInstanceMap = new Map()

  const rebindVariable = (varName, nextInstId) => {
    if (!varName || varName === 'self') return
    const prevInstId = variableToInstanceMap.get(varName)
    if (prevInstId && prevInstId !== nextInstId && instances.has(prevInstId)) {
      const prevInst = instances.get(prevInstId)
      prevInst.bindings = prevInst.bindings.filter((b) => b !== varName)
      if (prevInst.primaryBinding === varName) {
        prevInst.primaryBinding = prevInst.bindings[0] || null
      }
    }
    if (nextInstId) {
      variableToInstanceMap.set(varName, nextInstId)
    } else {
      variableToInstanceMap.delete(varName)
    }
  }

  const registerInstanceVal = (val, varName, sourceLine) => {
    if (!val || typeof val !== 'object' || val.kind !== 'python_instance' || !val.id) return
    const isSelf = varName === 'self'

    if (!isSelf && varName) {
      rebindVariable(varName, val.id)
    }

    if (!instances.has(val.id)) {
      instances.set(val.id, {
        instanceId: val.id,
        className: val.className,
        primaryBinding: isSelf ? null : varName,
        bindings: isSelf ? [] : (varName ? [varName] : []),
        createdAtLine: sourceLine,
        publicAttributes: { ...(val.publicAttributes || {}) },
      })
    } else {
      const existing = instances.get(val.id)
      if (!isSelf && varName) {
        if (!existing.primaryBinding) {
          existing.primaryBinding = varName
        }
        if (!existing.bindings.includes(varName)) {
          existing.bindings.push(varName)
        }
      }
      existing.publicAttributes = { ...existing.publicAttributes, ...(val.publicAttributes || {}) }
    }
  }

  const registerInstanceTree = (value, bindingPath, sourceLine, depth = 0, seen = new Set()) => {
    if (!value || typeof value !== 'object' || depth > 5 || seen.has(value)) return
    seen.add(value)

    if (value.kind === 'python_instance' && value.id) {
      registerInstanceVal(value, bindingPath, sourceLine)
      Object.entries(value.publicAttributes || {}).forEach(([name, child]) => {
        registerInstanceTree(child, bindingPath ? `${bindingPath}.${name}` : name, sourceLine, depth + 1, seen)
      })
      return
    }

    if (Array.isArray(value)) {
      value.forEach((child, index) => {
        registerInstanceTree(child, `${bindingPath || 'items'}[${index}]`, sourceLine, depth + 1, seen)
      })
      return
    }

    Object.entries(value).forEach(([name, child]) => {
      if (name === 'publicAttributes') return
      registerInstanceTree(child, bindingPath ? `${bindingPath}.${name}` : name, sourceLine, depth + 1, seen)
    })
  }

  events.forEach((ev) => {
    const lineNo = ev.sourceLine ?? ev.line ?? ev.payload?.sourceLine

    if (ev.type === 'line_entered' || ev.type === 'line') {
      const vars = ev.payload?.variables ?? ev.variables ?? {}
      Object.entries(vars).forEach(([varName, val]) => {
        registerInstanceTree(val, varName, lineNo)
      })
    } else if (ev.type === 'memory_changed') {
      const name = ev.payload?.name ?? ev.name
      const before = ev.payload?.before ?? ev.before
      const after = ev.payload?.after ?? ev.after
      if (before) registerInstanceTree(before, name, lineNo)
      if (after) {
        registerInstanceTree(after, name, lineNo)
      } else if (name && name !== 'self') {
        rebindVariable(name, null)
      }
    }
  })

  // Format final objects, defaulting primaryBinding to instanceId if unassigned
  return Array.from(instances.values()).map((inst) => ({
    ...inst,
    primaryBinding: inst.primaryBinding || inst.instanceId,
  }))
}

export function selectSystemObjectInspectorItems(systemObjects = {}) {
  if (!systemObjects || typeof systemObjects !== 'object') return []

  return Object.entries(systemObjects)
    .filter(([, value]) => value?.kind === 'python_instance' && value?.className)
    .map(([binding, value]) => ({
      binding,
      instanceId: value.id || `system-${binding}`,
      className: value.className,
      publicAttributes: { ...(value.publicAttributes || {}) },
      methods: (value.methods || []).map((method) => (
        typeof method === 'string' ? method : method?.name
      )).filter(Boolean),
    }))
}

export function selectInstanceAliases(events = []) {
  const allInstances = selectInstanceCreations(events)
  return allInstances
    .filter((inst) => inst.bindings.length > 1)
    .map((inst) => ({
      instanceId: inst.instanceId,
      className: inst.className,
      primaryBinding: inst.primaryBinding,
      aliases: inst.bindings.filter((b) => b !== inst.primaryBinding),
    }))
}

export function selectAttributeDiffs(events = []) {
  const diffs = []

  events.forEach((ev) => {
    if (ev.type === 'memory_changed') {
      const name = ev.payload?.name ?? ev.name
      const before = ev.payload?.before ?? ev.before
      const after = ev.payload?.after ?? ev.after
      const sourceLine = ev.sourceLine ?? ev.payload?.sourceLine

      if (
        before && after &&
        typeof before === 'object' && typeof after === 'object' &&
        before.kind === 'python_instance' && after.kind === 'python_instance' &&
        before.id === after.id
      ) {
        const beforeAttrs = before.publicAttributes || {}
        const afterAttrs = after.publicAttributes || {}
        const changedAttrs = {}

        const allKeys = new Set([...Object.keys(beforeAttrs), ...Object.keys(afterAttrs)])
        allKeys.forEach((key) => {
          if (beforeAttrs[key] !== afterAttrs[key]) {
            changedAttrs[key] = {
              before: beforeAttrs[key],
              after: afterAttrs[key],
            }
          }
        })

        if (Object.keys(changedAttrs).length > 0) {
          diffs.push({
            instanceId: after.id,
            className: after.className,
            binding: name === 'self' ? (after.id) : name,
            sourceLine,
            changes: changedAttrs,
          })
        }
      }
    }
  })

  return diffs
}

export function deriveExecutionModel(events = [], targetSeq = Infinity, classesMetadata = {}) {
  if (targetSeq === -1 || !events || events.length === 0) {
    return {
      registeredClasses: selectClassRegistrations([], classesMetadata),
      instances: [],
      aliases: [],
      attributeDiffs: [],
    }
  }

  const visibleEvents = targetSeq === Infinity
    ? events
    : events.filter((ev) => (typeof ev.seq === 'number' ? ev.seq <= targetSeq : true))

  return {
    registeredClasses: selectClassRegistrations(visibleEvents, classesMetadata),
    instances: selectInstanceCreations(visibleEvents),
    aliases: selectInstanceAliases(visibleEvents),
    attributeDiffs: selectAttributeDiffs(visibleEvents),
  }
}
