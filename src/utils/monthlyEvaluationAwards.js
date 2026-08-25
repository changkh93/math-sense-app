import {
  MAY_EVAL_G3_UNIT_ID,
  MAY_EVAL_G4_UNIT_ID,
  MAY_EVAL_G5_UNIT_ID,
  MAY_EVAL_G6_UNIT_ID,
} from './refineryMayEvaluationCatalog.js'
import {
  MAY_EVAL_M1_UNIT_ID,
  MAY_EVAL_M2_UNIT_ID,
  MAY_EVAL_M3_UNIT_ID,
} from './refineryMiddleMayEvaluationCatalog.js'

export const ELEMENTARY_MATH_CLUSTER_ID = 'cluster_elementary'
export const MIDDLE_MATH_CLUSTER_ID = 'middle-math'

export const MONTHLY_EVALUATION_COURSES = [
  { id: ELEMENTARY_MATH_CLUSTER_ID, label: '초등수학', shortLabel: '초등' },
  { id: MIDDLE_MATH_CLUSTER_ID, label: '중등수학', shortLabel: '중등' },
]

export const STUDENT_GRADE_OPTIONS = [
  { value: 'elementary2', label: '초등학교 2학년', shortLabel: '초2', clusterId: ELEMENTARY_MATH_CLUSTER_ID, order: 2 },
  { value: 'elementary3', label: '초등학교 3학년', shortLabel: '초3', clusterId: ELEMENTARY_MATH_CLUSTER_ID, order: 3 },
  { value: 'elementary4', label: '초등학교 4학년', shortLabel: '초4', clusterId: ELEMENTARY_MATH_CLUSTER_ID, order: 4 },
  { value: 'elementary5', label: '초등학교 5학년', shortLabel: '초5', clusterId: ELEMENTARY_MATH_CLUSTER_ID, order: 5 },
  { value: 'elementary6', label: '초등학교 6학년', shortLabel: '초6', clusterId: ELEMENTARY_MATH_CLUSTER_ID, order: 6 },
  { value: 'middle1', label: '중학교 1학년', shortLabel: '중1', clusterId: MIDDLE_MATH_CLUSTER_ID, order: 7 },
  { value: 'middle2', label: '중학교 2학년', shortLabel: '중2', clusterId: MIDDLE_MATH_CLUSTER_ID, order: 8 },
  { value: 'middle3', label: '중학교 3학년', shortLabel: '중3', clusterId: MIDDLE_MATH_CLUSTER_ID, order: 9 },
]

const GRADE_ALIASES = {
  초2: 'elementary2',
  '초등2': 'elementary2',
  '초등학교2학년': 'elementary2',
  '초등학교 2학년': 'elementary2',
  elementary2: 'elementary2',
  g2: 'elementary2',
  grade2: 'elementary2',
  초3: 'elementary3',
  '초등3': 'elementary3',
  '초등학교3학년': 'elementary3',
  '초등학교 3학년': 'elementary3',
  elementary3: 'elementary3',
  g3: 'elementary3',
  grade3: 'elementary3',
  초4: 'elementary4',
  '초등4': 'elementary4',
  '초등학교4학년': 'elementary4',
  '초등학교 4학년': 'elementary4',
  elementary4: 'elementary4',
  g4: 'elementary4',
  grade4: 'elementary4',
  초5: 'elementary5',
  '초등5': 'elementary5',
  '초등학교5학년': 'elementary5',
  '초등학교 5학년': 'elementary5',
  elementary5: 'elementary5',
  g5: 'elementary5',
  grade5: 'elementary5',
  초6: 'elementary6',
  '초등6': 'elementary6',
  '초등학교6학년': 'elementary6',
  '초등학교 6학년': 'elementary6',
  elementary6: 'elementary6',
  g6: 'elementary6',
  grade6: 'elementary6',
  중1: 'middle1',
  '중등1': 'middle1',
  '중학교1학년': 'middle1',
  '중학교 1학년': 'middle1',
  middle1: 'middle1',
  m1: 'middle1',
  중2: 'middle2',
  '중등2': 'middle2',
  '중학교2학년': 'middle2',
  '중학교 2학년': 'middle2',
  middle2: 'middle2',
  m2: 'middle2',
  중3: 'middle3',
  '중등3': 'middle3',
  '중학교3학년': 'middle3',
  '중학교 3학년': 'middle3',
  middle3: 'middle3',
  m3: 'middle3',
}

export const MONTHLY_EVALUATION_UNIT_CONFIG = {
  '2026-3': {
    elementary3: 'reg_1774390167801_chap_1774390176943_unit_1774390232739',
    elementary4: 'reg_1774390167801_chap_1774390191809_unit_1774390258642',
    elementary5: 'reg_1774390167801_chap_1774390199371_unit_1774390267517',
    elementary6: 'reg_1774390167801_chap_1774390206639_unit_1774390276970',
  },
  '2026-4': {
    elementary3: 'reg_1774390167801_chap_1774390176943_unit_1777506227602',
    elementary4: 'reg_1774390167801_chap_1774390191809_unit_1777506257212',
    elementary5: 'reg_1774390167801_chap_1774390199371_unit_1777506265057',
    elementary6: 'reg_1774390167801_chap_1774390206639_unit_1777506272514',
    middle1: 'reg_1774698354292_chap_1774698491426_unit_1777511572943',
    middle2: 'reg_1774698354292_chap_1774698491426_unit_1777511586294',
    middle3: 'reg_1774698354292_chap_1774698491426_unit_1777511596494',
  },
  '2026-5': {
    elementary3: MAY_EVAL_G3_UNIT_ID,
    elementary4: MAY_EVAL_G4_UNIT_ID,
    elementary5: MAY_EVAL_G5_UNIT_ID,
    elementary6: MAY_EVAL_G6_UNIT_ID,
    middle1: MAY_EVAL_M1_UNIT_ID,
    middle2: MAY_EVAL_M2_UNIT_ID,
    middle3: MAY_EVAL_M3_UNIT_ID,
  },
  '2026-6': {
    middle1: 'reg_1774698354292_chap_1774698491426_unit_1782371550824',
    middle2: 'reg_1774698354292_chap_1774698491426_unit_1782371579974',
    middle3: 'reg_1774698354292_chap_1774698491426_unit_1782371626580',
  },
  '2026-7': {
    elementary3: 'reg_1774390167801_chap_1774390176943_unit_1785280601229',
    elementary4: 'reg_1774390167801_chap_1774390191809_unit_1785280610013',
    elementary5: 'reg_1774390167801_chap_1774390199371_unit_1785280619652',
    elementary6: 'reg_1774390167801_chap_1774390206639_unit_1785280629452',
    middle1: 'reg_1774698354292_chap_1774698491426_unit_1785150691095',
    middle2: 'reg_1774698354292_chap_1774698491426_unit_1785150704995',
    middle3: 'reg_1774698354292_chap_1774698491426_unit_1785150713487',
  },
  '2026-8': {
    elementary3: 'reg_1774390167801_chap_1774390176943_unit_1787551996415',
    elementary4: 'reg_1774390167801_chap_1774390191809_unit_1787552005685',
    elementary5: 'reg_1774390167801_chap_1774390199371_unit_1787552011981',
    elementary6: 'reg_1774390167801_chap_1774390206639_unit_1787552056949',
    middle1: 'reg_1774698354292_chap_1774698491426_unit_1787555107499',
    middle2: 'reg_1774698354292_chap_1774698491426_unit_1787555119532',
    middle3: 'reg_1774698354292_chap_1774698491426_unit_1787555131298',
  },
}

export function parseMonthlyEvaluationUnit(unit = {}, chapter = {}, region = {}) {
  const chapTitle = (chapter?.title || '').trim()
  const unitTitle = (unit?.title || '').trim()
  const regTitle = (region?.title || '').trim()
  const clusterId = region?.clusterId || ''
  const regionId = chapter?.regionId || region?.id || ''

  const isElementaryMonthly =
    regionId === 'reg_1774390167801' ||
    regTitle.includes('초등수학 월간평가') ||
    (clusterId === 'cluster_elementary' && (regTitle.includes('월간평가') || chapTitle.includes('월간평가')))

  const isMiddleMonthly =
    (regionId === 'reg_1774698354292' && chapTitle.includes('월간평가')) ||
    (clusterId === 'middle-math' && (chapTitle.includes('월간평가') || unitTitle.includes('월평가') || unitTitle.includes('월 평가')))

  if (!isElementaryMonthly && !isMiddleMonthly) return null

  let grade = null
  let month = null
  let year = unit.year || 2026

  if (isElementaryMonthly) {
    if (chapTitle.includes('2학년') || chapTitle.includes('초2')) grade = 'elementary2'
    else if (chapTitle.includes('3학년') || chapTitle.includes('초3')) grade = 'elementary3'
    else if (chapTitle.includes('4학년') || chapTitle.includes('초4')) grade = 'elementary4'
    else if (chapTitle.includes('5학년') || chapTitle.includes('초5')) grade = 'elementary5'
    else if (chapTitle.includes('6학년') || chapTitle.includes('초6')) grade = 'elementary6'

    const monthMatch = unitTitle.match(/(\d{1,2})\s*월/)
    if (monthMatch) month = parseInt(monthMatch[1], 10)
    const yearMatch = unitTitle.match(/(20\d{2})\s*년/)
    if (yearMatch) year = parseInt(yearMatch[1], 10)
  } else if (isMiddleMonthly) {
    if (unitTitle.includes('중1') || unitTitle.includes('1학년')) grade = 'middle1'
    else if (unitTitle.includes('중2') || unitTitle.includes('2학년')) grade = 'middle2'
    else if (unitTitle.includes('중3') || unitTitle.includes('3학년')) grade = 'middle3'

    const monthMatch = unitTitle.match(/(\d{1,2})\s*월/)
    if (monthMatch) month = parseInt(monthMatch[1], 10)
    const yearMatch = unitTitle.match(/(20\d{2})\s*년/)
    if (yearMatch) year = parseInt(yearMatch[1], 10)
  }

  if (grade && month) {
    const unitId = unit.docId || unit.id
    return {
      unitId,
      unitTitle,
      year: Number(year),
      month: Number(month),
      grade,
      courseClusterId: isElementaryMonthly ? ELEMENTARY_MATH_CLUSTER_ID : MIDDLE_MATH_CLUSTER_ID,
    }
  }
  return null
}

export function buildDiscoveredMonthlyUnitConfig(units = [], chaptersMap = {}, regionsMap = {}) {
  const result = {}
  units.forEach(unit => {
    const chap = chaptersMap[unit.chapterId] || {}
    const reg = regionsMap[chap.regionId] || {}
    const parsed = parseMonthlyEvaluationUnit(unit, chap, reg)
    if (parsed) {
      const key = getEvaluationKey(parsed.year, parsed.month)
      if (!result[key]) result[key] = {}
      result[key][parsed.grade] = parsed.unitId
    }
  })
  return result
}

export function normalizeGradeValue(rawGrade) {
  const compact = String(rawGrade || '').trim().replace(/\s+/g, '')
  return GRADE_ALIASES[compact] || GRADE_ALIASES[String(rawGrade || '').trim()] || ''
}

export function getGradeOption(rawGrade) {
  const value = normalizeGradeValue(rawGrade)
  return STUDENT_GRADE_OPTIONS.find(option => option.value === value) || null
}

export function getGradeLabel(rawGrade, fallback = '학년 미지정') {
  return getGradeOption(rawGrade)?.label || fallback
}

export function getGradeShortLabel(rawGrade, fallback = '미지정') {
  return getGradeOption(rawGrade)?.shortLabel || fallback
}

export function getCourseLabel(clusterId) {
  return MONTHLY_EVALUATION_COURSES.find(course => course.id === clusterId)?.label || clusterId || '월간평가'
}

export function getEvaluationKey(year, month) {
  return `${Number(year)}-${Number(month)}`
}

export function getEvaluationUnitIdForGrade(year, month, gradeValue, dynamicConfig = null) {
  const key = getEvaluationKey(year, month)
  const normalizedGrade = normalizeGradeValue(gradeValue)
  if (dynamicConfig?.[key]?.[normalizedGrade]) {
    return dynamicConfig[key][normalizedGrade]
  }
  return MONTHLY_EVALUATION_UNIT_CONFIG[key]?.[normalizedGrade] || ''
}

export function getConfiguredUnitIdsForMonth(year, month, dynamicConfig = null) {
  const key = getEvaluationKey(year, month)
  const combined = {
    ...(MONTHLY_EVALUATION_UNIT_CONFIG[key] || {}),
    ...(dynamicConfig?.[key] || {}),
  }
  return Object.values(combined).filter(Boolean)
}

export function getEvaluationUnitEntriesForMonth(year, month, dynamicConfig = null) {
  const key = getEvaluationKey(year, month)
  const combined = {
    ...(MONTHLY_EVALUATION_UNIT_CONFIG[key] || {}),
    ...(dynamicConfig?.[key] || {}),
  }
  return Object.entries(combined)
    .map(([grade, unitId]) => {
      const gradeOption = getGradeOption(grade)
      return {
        grade,
        unitId,
        gradeOption,
        courseClusterId: gradeOption?.clusterId || '',
      }
    })
    .filter(entry => entry.unitId)
}

export function buildMonthlyAwardId({ studentId, year, month, courseClusterId }) {
  return `${studentId}_${Number(year)}_${String(Number(month)).padStart(2, '0')}_${courseClusterId}`
}

export function formatKoreanDate(dateLike) {
  if (!dateLike) return ''
  const date = dateLike?.toDate ? dateLike.toDate() : new Date(dateLike)
  if (Number.isNaN(date.getTime())) return ''
  const formatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  return formatter.format(date).replace(/\s/g, ' ')
}

export function getKstDateString(dateLike = new Date()) {
  const date = dateLike?.toDate ? dateLike.toDate() : new Date(dateLike)
  if (Number.isNaN(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const map = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]))
  return `${map.year}-${map.month}-${map.day}`
}

export function formatKoreanDateFromString(dateString) {
  if (!dateString) return ''
  const [year, month, day] = String(dateString).split('-').map(Number)
  if (!year || !month || !day) return ''
  return `${year}년 ${month}월 ${day}일`
}
