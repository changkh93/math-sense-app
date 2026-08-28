/**
 * Fail-closed browser worker adapter for Algorithm Constellation missions.
 * Powered by shared Safe Python Interpreter Core.
 */

import {
  SafePythonInterpreter,
  runRestrictedPythonFunction as coreRunFunction,
  FORBIDDEN_SOURCE,
  matchesExpected,
  evaluatorError,
} from './sharedPythonEvaluatorCore.js'

export { evaluatorError }

export function evaluateBooleanExpression(source, environment) {
  const interpreter = new SafePythonInterpreter('', '', environment)
  return interpreter.evaluateExpression(source, environment)
}

export function runRestrictedPythonFunction(source, functionName, args = {}) {
  const res = coreRunFunction(source, functionName, args)
  if (!res.ok) throw evaluatorError(res.code || 'RUNTIME_ERROR', res.error)
  return res.result
}

export function executeRestrictedPublicTests({ code, entryFunction, publicTests = [], limits = {} }) {
  const maxSteps = limits.maxSteps ?? 100_000
  const maxExecutionMs = limits.maxExecutionMs ?? 2_000
  const startedAt = performance.now()
  const rawEvents = []
  const testResults = []
  let totalSteps = 0

  if (!code || typeof code !== 'string') {
    throw evaluatorError('INVALID_SOURCE', '코드를 입력해 주세요.')
  }
  if (FORBIDDEN_SOURCE.test(code)) {
    throw evaluatorError('UNSUPPORTED_SYNTAX', '허용되지 않는 구문이 포함되어 있습니다.')
  }

  // Detect target entry function if not explicitly provided
  let targetFn = entryFunction
  if (!targetFn) {
    const defMatch = code.match(/def\s+([A-Za-z0-9_]+)\s*\(/)
    targetFn = defMatch ? defMatch[1] : 'check_gate'
  }

  for (const testCase of publicTests) {
    if (totalSteps > maxSteps) {
      throw evaluatorError('LIMIT_EXCEEDED', `최대 실행 단계(스텝 한도)를 초과했습니다.`)
    }
    if (performance.now() - startedAt > maxExecutionMs) {
      throw evaluatorError('TIMEOUT', '실행 제한 시간을 초과했습니다.')
    }

    const stepHook = () => {
      totalSteps++
      if (totalSteps > maxSteps) {
        throw evaluatorError('LIMIT_EXCEEDED', `최대 실행 단계(스텝 한도)를 초과했습니다.`)
      }
    }

    const interpreter = new SafePythonInterpreter(code, targetFn, testCase.inputs, {
      maxSteps: maxSteps - totalSteps,
      onStep: stepHook,
    })
    const execRes = interpreter.execute()

    const actual = execRes.ok ? execRes.result : null
    const passed = execRes.ok && matchesExpected(actual, testCase.expected)
    testResults.push({
      id: testCase.id,
      inputs: testCase.inputs,
      expected: testCase.expected,
      actual,
      passed,
      error: execRes.ok ? null : execRes.error,
    })

    const isSignalBridge = Object.hasOwn(testCase.inputs, 'time')
    rawEvents.push({
      stepIndex: totalSteps,
      eventType: isSignalBridge ? 'signal_eval' : 'condition_eval',
      sourceLine: 2,
      stateDiff: isSignalBridge
        ? { time: testCase.inputs.time, remainder: testCase.inputs.time % 3 }
        : { ...testCase.inputs },
      worldDiff: isSignalBridge ? { bridgeOpen: actual } : { gateOpen: actual },
      metadata: { expected: testCase.expected, actual, passed },
    })
  }

  return {
    ok: true,
    allPassed: testResults.every((test) => test.passed),
    stepCount: totalSteps,
    testResults,
    rawEvents,
  }
}
