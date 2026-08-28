/**
 * Server-Only Private Problem Catalog (Cloud Functions / Server Authority)
 * STRICT SECURITY INVARIANT:
 * This file contains official solutions, mutation fixtures, and hidden test suites.
 * It is located in `functions/` and MUST NEVER be imported by Vite / client bundles.
 */

const {
  PRIVATE_PROBLEMS,
  getPrivateProblemDefinition,
  listRegisteredProblemIds,
} = require('./problems/index.cjs')

module.exports = {
  PRIVATE_PROBLEM_DEFINITIONS: PRIVATE_PROBLEMS,
  getPrivateProblemDefinition,
  listRegisteredProblemIds,
}
