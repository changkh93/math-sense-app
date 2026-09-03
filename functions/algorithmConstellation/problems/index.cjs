/**
 * Modular Private Problem Registry for LUMI Algorithm Constellation.
 * Aggregates all private problem files.
 */

const crypto = require('crypto')

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
const acPatEven23 = require('./ac_pat_even_23.private.cjs')
const acPatDigit24 = require('./ac_pat_digit_24.private.cjs')
const acPatRevnum25 = require('./ac_pat_revnum_25.private.cjs')
const acPatDivisor26 = require('./ac_pat_divisor_26.private.cjs')
const acPatPrime27 = require('./ac_pat_prime_27.private.cjs')
const acPatGcd28 = require('./ac_pat_gcd_28.private.cjs')
const acPatCalendar29 = require('./ac_pat_calendar_29.private.cjs')
const acPatPrimeRev30 = require('./ac_pat_prime_review_30.private.cjs')
const acSeqMinmax32 = require('./ac_seq_minmax_32.private.cjs')
const acSeqCount33 = require('./ac_seq_count_33.private.cjs')
const acSeqAdjacent34 = require('./ac_seq_adjacent_34.private.cjs')
const acSeqRunning35 = require('./ac_seq_running_35.private.cjs')
const acStrPalin37 = require('./ac_str_palin_37.private.cjs')
const acSeqRotate38 = require('./ac_seq_rotate_38.private.cjs')
const acStrCompress39 = require('./ac_str_compress_39.private.cjs')
const acStrPattern40 = require('./ac_str_pattern_40.private.cjs')
const acSetMembership42 = require('./ac_set_membership_42.private.cjs')
const acSetIntersect43 = require('./ac_set_intersect_43.private.cjs')
const acDictFreq44 = require('./ac_dict_freq_44.private.cjs')
const acDictMode45 = require('./ac_dict_mode_45.private.cjs')
const acDictStock46 = require('./ac_dict_stock_46.private.cjs')
const acDictTwosum47 = require('./ac_dict_twosum_47.private.cjs')
const acDictOneshot48 = require('./ac_dict_oneshot_48.private.cjs')
const acDictAnagram49 = require('./ac_dict_anagram_49.private.cjs')
const acDictBug50 = require('./ac_dict_bug_50.private.cjs')
const acSimRover51 = require('./ac_sim_rover_51.private.cjs')
const acSimCompass52 = require('./ac_sim_compass_52.private.cjs')
const acSimClock53 = require('./ac_sim_clock_53.private.cjs')
const acSimSwitch54 = require('./ac_sim_switch_54.private.cjs')
const acSimBelt55 = require('./ac_sim_belt_55.private.cjs')
const acSortBubble57 = require('./ac_sort_bubble_57.private.cjs')
const acSrchLinear58 = require('./ac_srch_linear_58.private.cjs')
const acSrchBinary59 = require('./ac_srch_binary_59.private.cjs')
const acSrchPrefix60 = require('./ac_srch_prefix_60.private.cjs')
const acEnumTarget62 = require('./ac_enum_target_62.private.cjs')
const acEnumTriple63 = require('./ac_enum_triple_63.private.cjs')
const acEnumComb64 = require('./ac_enum_comb_64.private.cjs')
const acEnumSubset65 = require('./ac_enum_subset_65.private.cjs')
const acEnumKeypad66 = require('./ac_enum_keypad_66.private.cjs')
const acEnumFilter67 = require('./ac_enum_filter_67.private.cjs')
const acEnumBest68 = require('./ac_enum_best_68.private.cjs')
const acEnumPrune69 = require('./ac_enum_prune_69.private.cjs')
const acEnumLock70 = require('./ac_enum_lock_70.private.cjs')
const acStackBox71 = require('./ac_stack_box_71.private.cjs')
const acStackParen72 = require('./ac_stack_paren_72.private.cjs')
const acStackUndo73 = require('./ac_stack_undo_73.private.cjs')
const acQueueRobot75 = require('./ac_queue_robot_75.private.cjs')
const acQueueRobin76 = require('./ac_queue_robin_76.private.cjs')
const acQueueCard77 = require('./ac_queue_card_77.private.cjs')
const acDequeDock78 = require('./ac_deque_dock_78.private.cjs')
const acStackQueue79 = require('./ac_stack_queue_79.private.cjs')
const acQueuePop80 = require('./ac_queue_pop_80.private.cjs')
const acGridNeighbor81 = require('./ac_grid_neighbor_81.private.cjs')
const acGridBound82 = require('./ac_grid_bound_82.private.cjs')
const acGridFlood83 = require('./ac_grid_flood_83.private.cjs')
const acGridIsland84 = require('./ac_grid_island_84.private.cjs')
const acGridMulti86 = require('./ac_grid_multi_86.private.cjs')
const acGraphAdj87 = require('./ac_graph_adj_87.private.cjs')
const acGraphReach88 = require('./ac_graph_reach_88.private.cjs')
const acNavCompare89 = require('./ac_nav_compare_89.private.cjs')
const acNavVisited90 = require('./ac_nav_visited_90.private.cjs')

const RAW_PRIVATE_PROBLEMS = {
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
  'AC-PAT-EVEN-23@v1': acPatEven23,
  'AC-PAT-DIGIT-24@v1': acPatDigit24,
  'AC-PAT-REVNUM-25@v1': acPatRevnum25,
  'AC-PAT-DIVISOR-26@v1': acPatDivisor26,
  'AC-PAT-PRIME-27@v1': acPatPrime27,
  'AC-PAT-GCD-28@v1': acPatGcd28,
  'AC-PAT-CALENDAR-29@v1': acPatCalendar29,
  'AC-PAT-PRIME-REV-30@v1': acPatPrimeRev30,
  'AC-SEQ-MINMAX-32@v1': acSeqMinmax32,
  'AC-SEQ-COUNT-33@v1': acSeqCount33,
  'AC-SEQ-ADJACENT-34@v1': acSeqAdjacent34,
  'AC-SEQ-RUNNING-35@v1': acSeqRunning35,
  'AC-STR-PALIN-37@v1': acStrPalin37,
  'AC-SEQ-ROTATE-38@v1': acSeqRotate38,
  'AC-STR-COMPRESS-39@v1': acStrCompress39,
  'AC-STR-PATTERN-40@v1': acStrPattern40,
  'AC-SET-MEMBERSHIP-42@v1': acSetMembership42,
  'AC-SET-INTERSECT-43@v1': acSetIntersect43,
  'AC-DICT-FREQ-44@v1': acDictFreq44,
  'AC-DICT-MODE-45@v1': acDictMode45,
  'AC-DICT-STOCK-46@v1': acDictStock46,
  'AC-DICT-TWOSUM-47@v1': acDictTwosum47,
  'AC-DICT-ONESHOT-48@v1': acDictOneshot48,
  'AC-DICT-ANAGRAM-49@v1': acDictAnagram49,
  'AC-DICT-BUG-50@v1': acDictBug50,
  'AC-SIM-ROVER-51@v1': acSimRover51,
  'AC-SIM-COMPASS-52@v1': acSimCompass52,
  'AC-SIM-CLOCK-53@v1': acSimClock53,
  'AC-SIM-SWITCH-54@v1': acSimSwitch54,
  'AC-SIM-BELT-55@v1': acSimBelt55,
  'AC-SORT-BUBBLE-57@v1': acSortBubble57,
  'AC-SRCH-LINEAR-58@v1': acSrchLinear58,
  'AC-SRCH-BINARY-59@v1': acSrchBinary59,
  'AC-SRCH-PREFIX-60@v1': acSrchPrefix60,
  'AC-ENUM-TARGET-62@v1': acEnumTarget62,
  'AC-ENUM-TRIPLE-63@v1': acEnumTriple63,
  'AC-ENUM-COMB-64@v1': acEnumComb64,
  'AC-ENUM-SUBSET-65@v1': acEnumSubset65,
  'AC-ENUM-KEYPAD-66@v1': acEnumKeypad66,
  'AC-ENUM-FILTER-67@v1': acEnumFilter67,
  'AC-ENUM-BEST-68@v1': acEnumBest68,
  'AC-ENUM-PRUNE-69@v1': acEnumPrune69,
  'AC-ENUM-LOCK-70@v1': acEnumLock70,
  'AC-STACK-BOX-71@v1': acStackBox71,
  'AC-STACK-PAREN-72@v1': acStackParen72,
  'AC-STACK-UNDO-73@v1': acStackUndo73,
  'AC-QUEUE-ROBOT-75@v1': acQueueRobot75,
  'AC-QUEUE-ROBIN-76@v1': acQueueRobin76,
  'AC-QUEUE-CARD-77@v1': acQueueCard77,
  'AC-DEQUE-DOCK-78@v1': acDequeDock78,
  'AC-STACK-QUEUE-79@v1': acStackQueue79,
  'AC-QUEUE-POP-80@v1': acQueuePop80,
  'AC-GRID-NEIGHBOR-81@v1': acGridNeighbor81,
  'AC-GRID-BOUND-82@v1': acGridBound82,
  'AC-GRID-FLOOD-83@v1': acGridFlood83,
  'AC-GRID-ISLAND-84@v1': acGridIsland84,
  'AC-GRID-MULTI-86@v1': acGridMulti86,
  'AC-GRAPH-ADJ-87@v1': acGraphAdj87,
  'AC-GRAPH-REACH-88@v1': acGraphReach88,
  'AC-NAV-COMPARE-89@v1': acNavCompare89,
  'AC-NAV-VISITED-90@v1': acNavVisited90,
}

// Every attempt stores this value in Firestore and exposes it in the replay
// descriptor. Earlier hand-authored definitions carried a checksum while newer
// generated definitions did not, which made Firestore reject the entire session
// document because `undefined` is not serializable. Preserve explicit legacy
// checksums and derive a stable checksum for every other registered definition.
function ensureDefinitionChecksum(definition) {
  if (typeof definition?.checksum === 'string' && definition.checksum.length > 0) {
    return definition
  }
  const serialized = JSON.stringify(definition)
  const checksum = `sha256:${crypto.createHash('sha256').update(serialized).digest('hex')}`
  return Object.freeze({ ...definition, checksum })
}

const PRIVATE_PROBLEMS = Object.freeze(Object.fromEntries(
  Object.entries(RAW_PRIVATE_PROBLEMS).map(([key, definition]) => [
    key,
    ensureDefinitionChecksum(definition),
  ])
))

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
