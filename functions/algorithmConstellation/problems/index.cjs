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
const acCodeFirstError01 = require('./ac_code_first_error_01.private.cjs')
const acStrReverse01 = require('./ac_str_reverse_01.private.cjs')
const acSetUnique01 = require('./ac_set_unique_01.private.cjs')
const acSortMin01 = require('./ac_sort_min_01.private.cjs')
const acEnumPair01 = require('./ac_enum_pair_01.private.cjs')
const acExpSeq01 = require('./ac_exp_seq_01.private.cjs')
const acExpVar02 = require('./ac_exp_var_02.private.cjs')
const acExpStep03 = require('./ac_exp_step_03.private.cjs')
const acExpSwap04 = require('./ac_exp_swap_04.private.cjs')
const acExpBound05 = require('./ac_exp_bound_05.private.cjs')
const acExpLoop06 = require('./ac_exp_loop_06.private.cjs')
const acExpWhile07 = require('./ac_exp_while_07.private.cjs')
const acExpEquiv09 = require('./ac_exp_equiv_09.private.cjs')
const acExpReverse10 = require('./ac_exp_reverse_10.private.cjs')
const acCondNot13 = require('./ac_cond_not_13.private.cjs')
const acCondElif14 = require('./ac_cond_elif_14.private.cjs')
const acCondRange15 = require('./ac_cond_range_15.private.cjs')
const acCondClamp16 = require('./ac_cond_clamp_16.private.cjs')
const acCondGrade17 = require('./ac_cond_grade_17.private.cjs')
const acCondComplex18 = require('./ac_cond_complex_18.private.cjs')
const acCondToggle19 = require('./ac_cond_toggle_19.private.cjs')
const acCondOrder20 = require('./ac_cond_order_20.private.cjs')

const PRIVATE_PROBLEMS = {
  'AC-COND-001@v1': acCond001,
  'AC-COND-002@v1': acCond002,
  'AC-PAT-003@v1': acPat003,
  'AC-PAT-004@v1': acPat004,
  'AC-SEQ-005@v1': acSeq005,
  'AC-NAV-005@v1': acNav005,
  'AC-NAV-006@v1': acNav006,
  'AC-CODE-FIRST-ERROR-01@v1': acCodeFirstError01,
  'AC-STR-REVERSE-01@v1': acStrReverse01,
  'AC-SET-UNIQUE-01@v1': acSetUnique01,
  'AC-SORT-MIN-01@v1': acSortMin01,
  'AC-ENUM-PAIR-01@v1': acEnumPair01,
  'AC-EXP-SEQ-01@v1': acExpSeq01,
  'AC-EXP-VAR-02@v1': acExpVar02,
  'AC-EXP-STEP-03@v1': acExpStep03,
  'AC-EXP-SWAP-04@v1': acExpSwap04,
  'AC-EXP-BOUND-05@v1': acExpBound05,
  'AC-EXP-LOOP-06@v1': acExpLoop06,
  'AC-EXP-WHILE-07@v1': acExpWhile07,
  'AC-EXP-EQUIV-09@v1': acExpEquiv09,
  'AC-EXP-REVERSE-10@v1': acExpReverse10,
  'AC-COND-NOT-13@v1': acCondNot13,
  'AC-COND-ELIF-14@v1': acCondElif14,
  'AC-COND-RANGE-15@v1': acCondRange15,
  'AC-COND-CLAMP-16@v1': acCondClamp16,
  'AC-COND-GRADE-17@v1': acCondGrade17,
  'AC-COND-COMPLEX-18@v1': acCondComplex18,
  'AC-COND-TOGGLE-19@v1': acCondToggle19,
  'AC-COND-ORDER-20@v1': acCondOrder20,
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

function getTransferChallenges(definition) {
  if (!definition || typeof definition !== 'object') return []
  if (Array.isArray(definition.transferMasterSet)) return definition.transferMasterSet
  if (Array.isArray(definition.transferChallenges)) return definition.transferChallenges
  return []
}

module.exports = {
  PRIVATE_PROBLEMS,
  getPrivateProblemDefinition,
  getTransferChallenges,
  listRegisteredProblemIds,
}
