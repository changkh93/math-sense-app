/**
 * Modular Private Problem Registry for LUMI Algorithm Constellation.
 * Aggregates all private problem files.
 */

const acCond001 = require('./ac_cond_001.private.cjs')
const acCond002 = require('./ac_cond_002.private.cjs')
const acPat003 = require('./ac_pat_003.private.cjs')
const acPat004 = require('./ac_pat_004.private.cjs')
const acSeq005 = require('./ac_seq_005.private.cjs')
const acNav005 = require('./ac_nav_005.private.cjs')
const acNav006 = require('./ac_nav_006.private.cjs')

const PRIVATE_PROBLEMS = {
  'AC-COND-001@v1': acCond001,
  'AC-COND-002@v1': acCond002,
  'AC-PAT-003@v1': acPat003,
  'AC-PAT-004@v1': acPat004,
  'AC-SEQ-005@v1': acSeq005,
  'AC-NAV-005@v1': acNav005,
  'AC-NAV-006@v1': acNav006,
}

function getPrivateProblemDefinition(problemId, version = 1) {
  const key = `${problemId}@v${version}`
  const definition = PRIVATE_PROBLEMS[key]
  if (!definition) {
    throw new Error(`Private problem definition not found: ${key}`)
  }
  return definition
}

function listRegisteredProblemIds() {
  return Object.keys(PRIVATE_PROBLEMS)
}

module.exports = {
  PRIVATE_PROBLEMS,
  getPrivateProblemDefinition,
  listRegisteredProblemIds,
}
