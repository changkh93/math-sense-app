/**
 * LUMI Object Core Goal Evaluators (Pure Module)
 * Extracted modular evaluation logic for Object Core Act 9.
 */

export function evaluateObjectCoreGoal(goal, ctx) {
  const { execTrace, events } = ctx
  const instances = Object.values(execTrace.instances || {})

  if (goal.type === 'inspectSystemObject') {
    const sysObj = ctx.systemObjects?.[goal.objectName || 'lumi']
    if (!sysObj) return false
    if (goal.className && sysObj.className !== goal.className) return false
    return true
  }

  if (goal.type === 'classCountAtLeast') {
    return Object.keys(execTrace.classes || {}).length >= Number(goal.count || 1)
  }

  if (goal.type === 'classDefined') {
    return Boolean(execTrace.classes?.[goal.className])
  }

  if (goal.type === 'classHasMethod') {
    const classes = Object.values(execTrace.classes || {}).filter((cls) => (
      !goal.className || cls.name === goal.className
    ))
    return classes.some((cls) => (cls.methods || []).some((m) => (
      typeof m === 'string' ? m === goal.methodName : m.name === goal.methodName
    )))
  }

  if (goal.type === 'distinctInstanceCount' || goal.type === 'instanceCountEquals') {
    return instances.length === Number(goal.count || 0)
  }

  if (goal.type === 'allInstancesHaveAttribute') {
    if (instances.length === 0) return false
    return instances.every((inst) => inst.publicAttributes?.[goal.attribute] !== undefined)
  }

  if (goal.type === 'instancesHaveDistinctState') {
    const attr = goal.attribute || 'integrity'
    const values = instances.map((inst) => inst.publicAttributes?.[attr])
    const uniqueValues = new Set(values)
    return uniqueValues.size > 1
  }

  return false
}
