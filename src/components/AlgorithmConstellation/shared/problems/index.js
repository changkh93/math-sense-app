import { AC_COND_001 } from './ac_cond_001.js'
import { AC_COND_002 } from './ac_cond_002.js'
import { AC_PAT_003_PUBLIC_KERNEL, AC_PAT_003 } from './ac_pat_003.js'
import { AC_PAT_004 } from './ac_pat_004.js'
import { AC_SEQ_005 } from './ac_seq_005.js'
import { AC_NAV_005 } from './ac_nav_005.js'
import { AC_NAV_006 } from './ac_nav_006.js'
import { AC_CODE_FIRST_ERROR_01 } from './ac_code_first_error_01.js'
import { AC_STR_REVERSE_01 } from './ac_str_reverse_01.js'
import { AC_SET_UNIQUE_01 } from './ac_set_unique_01.js'
import { AC_SORT_MIN_01 } from './ac_sort_min_01.js'
import { AC_ENUM_PAIR_01 } from './ac_enum_pair_01.js'
import { AC_EXP_SEQ_01 } from './ac_exp_seq_01.js'
import { AC_EXP_VAR_02 } from './ac_exp_var_02.js'
import { AC_EXP_STEP_03 } from './ac_exp_step_03.js'
import { AC_EXP_SWAP_04 } from './ac_exp_swap_04.js'
import { AC_EXP_BOUND_05 } from './ac_exp_bound_05.js'
import { AC_EXP_LOOP_06 } from './ac_exp_loop_06.js'
import { AC_EXP_WHILE_07 } from './ac_exp_while_07.js'
import { AC_EXP_EQUIV_09 } from './ac_exp_equiv_09.js'
import { AC_EXP_REVERSE_10 } from './ac_exp_reverse_10.js'
import { AC_COND_NOT_13 } from './ac_cond_not_13.js'
import { AC_COND_ELIF_14 } from './ac_cond_elif_14.js'
import { AC_COND_RANGE_15 } from './ac_cond_range_15.js'
import { AC_COND_CLAMP_16 } from './ac_cond_clamp_16.js'
import { AC_COND_GRADE_17 } from './ac_cond_grade_17.js'
import { AC_COND_COMPLEX_18 } from './ac_cond_complex_18.js'
import { AC_COND_TOGGLE_19 } from './ac_cond_toggle_19.js'
import { AC_COND_ORDER_20 } from './ac_cond_order_20.js'
import { AC_PAT_EVEN_23 } from './ac_pat_even_23.js'
import { AC_PAT_DIGIT_24 } from './ac_pat_digit_24.js'
import { AC_PAT_REVNUM_25 } from './ac_pat_revnum_25.js'
import { AC_PAT_DIVISOR_26 } from './ac_pat_divisor_26.js'
import { AC_PAT_PRIME_27 } from './ac_pat_prime_27.js'
import { AC_PAT_GCD_28 } from './ac_pat_gcd_28.js'
import { AC_PAT_CALENDAR_29 } from './ac_pat_calendar_29.js'
import { AC_PAT_PRIME_REV_30 } from './ac_pat_prime_review_30.js'
import { AC_SEQ_MINMAX_32 } from './ac_seq_minmax_32.js'
import { AC_SEQ_COUNT_33 } from './ac_seq_count_33.js'
import { AC_SEQ_ADJACENT_34 } from './ac_seq_adjacent_34.js'
import { AC_SEQ_RUNNING_35 } from './ac_seq_running_35.js'
import { AC_STR_PALIN_37 } from './ac_str_palin_37.js'
import { AC_SEQ_ROTATE_38 } from './ac_seq_rotate_38.js'
import { AC_STR_COMPRESS_39 } from './ac_str_compress_39.js'
import { AC_STR_PATTERN_40 } from './ac_str_pattern_40.js'
import { AC_SET_MEMBERSHIP_42 } from './ac_set_membership_42.js'
import { AC_SET_INTERSECT_43 } from './ac_set_intersect_43.js'
import { AC_DICT_FREQ_44 } from './ac_dict_freq_44.js'
import { AC_DICT_MODE_45 } from './ac_dict_mode_45.js'
import { AC_DICT_STOCK_46 } from './ac_dict_stock_46.js'
import { AC_DICT_TWOSUM_47 } from './ac_dict_twosum_47.js'
import { AC_DICT_ONESHOT_48 } from './ac_dict_oneshot_48.js'

export const PUBLIC_KERNELS = Object.freeze({
  'AC-COND-001': AC_COND_001,
  'AC-COND-002': AC_COND_002,
  'AC-PAT-003': AC_PAT_003_PUBLIC_KERNEL || AC_PAT_003,
  'AC-PAT-004': AC_PAT_004,
  'AC-SEQ-005': AC_SEQ_005,
  'AC-NAV-005': AC_NAV_005,
  'AC-NAV-006': AC_NAV_006,
  'AC-CODE-FIRST-ERROR-01': AC_CODE_FIRST_ERROR_01,
  'AC-STR-REVERSE-01': AC_STR_REVERSE_01,
  'AC-SET-UNIQUE-01': AC_SET_UNIQUE_01,
  'AC-SORT-MIN-01': AC_SORT_MIN_01,
  'AC-ENUM-PAIR-01': AC_ENUM_PAIR_01,
  'AC-EXP-SEQ-01': AC_EXP_SEQ_01,
  'AC-EXP-VAR-02': AC_EXP_VAR_02,
  'AC-EXP-STEP-03': AC_EXP_STEP_03,
  'AC-EXP-SWAP-04': AC_EXP_SWAP_04,
  'AC-EXP-BOUND-05': AC_EXP_BOUND_05,
  'AC-EXP-LOOP-06': AC_EXP_LOOP_06,
  'AC-EXP-WHILE-07': AC_EXP_WHILE_07,
  'AC-EXP-EQUIV-09': AC_EXP_EQUIV_09,
  'AC-EXP-REVERSE-10': AC_EXP_REVERSE_10,
  'AC-COND-NOT-13': AC_COND_NOT_13,
  'AC-COND-ELIF-14': AC_COND_ELIF_14,
  'AC-COND-RANGE-15': AC_COND_RANGE_15,
  'AC-COND-CLAMP-16': AC_COND_CLAMP_16,
  'AC-COND-GRADE-17': AC_COND_GRADE_17,
  'AC-COND-COMPLEX-18': AC_COND_COMPLEX_18,
  'AC-COND-TOGGLE-19': AC_COND_TOGGLE_19,
  'AC-COND-ORDER-20': AC_COND_ORDER_20,
  'AC-PAT-EVEN-23': AC_PAT_EVEN_23,
  'AC-PAT-DIGIT-24': AC_PAT_DIGIT_24,
  'AC-PAT-REVNUM-25': AC_PAT_REVNUM_25,
  'AC-PAT-DIVISOR-26': AC_PAT_DIVISOR_26,
  'AC-PAT-PRIME-27': AC_PAT_PRIME_27,
  'AC-PAT-GCD-28': AC_PAT_GCD_28,
  'AC-PAT-CALENDAR-29': AC_PAT_CALENDAR_29,
  'AC-PAT-PRIME-REV-30': AC_PAT_PRIME_REV_30,
  'AC-SEQ-MINMAX-32': AC_SEQ_MINMAX_32,
  'AC-SEQ-COUNT-33': AC_SEQ_COUNT_33,
  'AC-SEQ-ADJACENT-34': AC_SEQ_ADJACENT_34,
  'AC-SEQ-RUNNING-35': AC_SEQ_RUNNING_35,
  'AC-STR-PALIN-37': AC_STR_PALIN_37,
  'AC-SEQ-ROTATE-38': AC_SEQ_ROTATE_38,
  'AC-STR-COMPRESS-39': AC_STR_COMPRESS_39,
  'AC-STR-PATTERN-40': AC_STR_PATTERN_40,
  'AC-SET-MEMBERSHIP-42': AC_SET_MEMBERSHIP_42,
  'AC-SET-INTERSECT-43': AC_SET_INTERSECT_43,
  'AC-DICT-FREQ-44': AC_DICT_FREQ_44,
  'AC-DICT-MODE-45': AC_DICT_MODE_45,
  'AC-DICT-STOCK-46': AC_DICT_STOCK_46,
  'AC-DICT-TWOSUM-47': AC_DICT_TWOSUM_47,
  'AC-DICT-ONESHOT-48': AC_DICT_ONESHOT_48,
})

export function getPublicKernel(problemId) {
  return PUBLIC_KERNELS[problemId] || null
}

export {
  AC_COND_001,
  AC_COND_002,
  AC_PAT_003,
  AC_PAT_003_PUBLIC_KERNEL,
  AC_PAT_004,
  AC_SEQ_005,
  AC_NAV_005,
  AC_NAV_006,
  AC_CODE_FIRST_ERROR_01,
  AC_STR_REVERSE_01,
  AC_SET_UNIQUE_01,
  AC_SORT_MIN_01,
  AC_ENUM_PAIR_01,
  AC_EXP_SEQ_01,
  AC_EXP_VAR_02,
  AC_EXP_STEP_03,
  AC_EXP_SWAP_04,
  AC_EXP_BOUND_05,
  AC_EXP_LOOP_06,
  AC_EXP_WHILE_07,
  AC_EXP_EQUIV_09,
  AC_EXP_REVERSE_10,
  AC_COND_NOT_13,
  AC_COND_ELIF_14,
  AC_COND_RANGE_15,
  AC_COND_CLAMP_16,
  AC_COND_GRADE_17,
  AC_COND_COMPLEX_18,
  AC_COND_TOGGLE_19,
  AC_COND_ORDER_20,
  AC_PAT_EVEN_23,
  AC_PAT_DIGIT_24,
  AC_PAT_REVNUM_25,
  AC_PAT_DIVISOR_26,
  AC_PAT_PRIME_27,
  AC_PAT_GCD_28,
  AC_PAT_CALENDAR_29,
  AC_PAT_PRIME_REV_30,
  AC_SEQ_MINMAX_32,
  AC_SEQ_COUNT_33,
  AC_SEQ_ADJACENT_34,
  AC_SEQ_RUNNING_35,
  AC_STR_PALIN_37,
  AC_SEQ_ROTATE_38,
  AC_STR_COMPRESS_39,
  AC_STR_PATTERN_40,
  AC_SET_MEMBERSHIP_42,
  AC_SET_INTERSECT_43,
  AC_DICT_FREQ_44,
  AC_DICT_MODE_45,
  AC_DICT_STOCK_46,
  AC_DICT_TWOSUM_47,
  AC_DICT_ONESHOT_48,
}

