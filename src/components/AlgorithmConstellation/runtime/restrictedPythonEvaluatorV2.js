/**
 * Compatibility facade for the former v2 evaluator API.
 * All execution semantics now come from the shared client/server evaluator core.
 */

import {
  SafePythonInterpreter,
  runRestrictedPythonFunction,
  evaluatorError,
} from './sharedPythonEvaluatorCore.js'
import { executeRestrictedPublicTests } from './restrictedPythonEvaluator.js'

export function evaluateV2Expression(expression, environment = {}) {
  const interpreter = new SafePythonInterpreter('', '', environment)
  return interpreter.evaluateExpression(expression, environment)
}

export function runRestrictedPythonV2Function(source, functionName, args = {}) {
  const result = runRestrictedPythonFunction(source, functionName, args)
  if (!result.ok) throw evaluatorError(result.code || 'RUNTIME_ERROR', result.error)
  return result.result
}

export function executeRestrictedV2PublicTests(options) {
  return executeRestrictedPublicTests(options)
}
