const MIDDLE_MATH_FALLBACKS = [
  { planetType: 'middle_math_core', planetColor: '#56d8ff' },
  { planetType: 'middle_math_numbers_expressions', planetColor: '#31e6cf' },
  { planetType: 'middle_math_functions_statistics', planetColor: '#55e6a5' },
  { planetType: 'middle_math_absolute_geometry', planetColor: '#b78cff' },
  { planetType: 'middle_math_exam', planetColor: '#ffb25e' },
  { planetType: 'middle_math_school_exam', planetColor: '#ff637d' },
]

const MIDDLE_MATH_BY_REGION_ID = {
  reg_1773407437227: MIDDLE_MATH_FALLBACKS[0],
  reg_1775113850179: MIDDLE_MATH_FALLBACKS[1],
  reg_1775113861010: MIDDLE_MATH_FALLBACKS[2],
  reg_1775113875836: MIDDLE_MATH_FALLBACKS[3],
  reg_1774698354292: MIDDLE_MATH_FALLBACKS[4],
  reg_1781420075936: MIDDLE_MATH_FALLBACKS[5],
}

const PYTHON_FALLBACKS = [
  { planetType: 'python_foundation', planetColor: '#52b8ff' },
  { planetType: 'python_project', planetColor: '#ff69dc' },
  { planetType: 'python_advanced', planetColor: '#38f0d0' },
  { planetType: 'python_math', planetColor: '#ffd45b' },
]

const PYTHON_BY_REGION_ID = {
  reg_python_course: PYTHON_FALLBACKS[0],
  reg_python_game_project: PYTHON_FALLBACKS[1],
  reg_python_advanced: PYTHON_FALLBACKS[2],
  reg_python_math: PYTHON_FALLBACKS[3],
}

export const PLANET_SIGNATURE_PROFILES = {
  elementary_monthly_evaluation: {
    ornament: 'calendar_crown',
    primary: '#ffd86f',
    secondary: '#8f83ff',
    atmosphere: '#9388ff',
  },
  middle_math_core: {
    ornament: 'axiom_meridians',
    primary: '#71e8ff',
    secondary: '#2a7dff',
    atmosphere: '#53ceff',
  },
  middle_math_numbers_expressions: {
    ornament: 'abacus_orbit',
    primary: '#5df6d2',
    secondary: '#ffe477',
    atmosphere: '#31e6cf',
  },
  middle_math_functions_statistics: {
    ornament: 'data_orbits',
    primary: '#78f2ad',
    secondary: '#4cc9ff',
    atmosphere: '#55e6a5',
  },
  middle_math_absolute_geometry: {
    ornament: 'polyhedron_shell',
    primary: '#e0b8ff',
    secondary: '#7d6bff',
    atmosphere: '#b78cff',
  },
  middle_math_exam: {
    ornament: 'trial_moons',
    primary: '#ffd479',
    secondary: '#ff754f',
    atmosphere: '#ff9f55',
  },
  middle_math_school_exam: {
    ornament: 'shield_satellites',
    primary: '#ff7088',
    secondary: '#ffd66b',
    atmosphere: '#ff526f',
  },
  python_foundation: {
    ornament: 'binary_orbit',
    primary: '#58c9ff',
    secondary: '#ffe05c',
    atmosphere: '#3caeff',
  },
  python_advanced: {
    ornament: 'quantum_cage',
    primary: '#5fffe0',
    secondary: '#607dff',
    atmosphere: '#31e8c8',
  },
  python_data: {
    ornament: 'data_network',
    primary: '#a8b5ff',
    secondary: '#5df4ff',
    atmosphere: '#7588ff',
  },
  python_project: {
    ornament: 'arcade_satellites',
    primary: '#ff74de',
    secondary: '#7e8cff',
    atmosphere: '#d15cff',
  },
  python_math: {
    ornament: 'prime_knot',
    primary: '#ffe06b',
    secondary: '#57e7ff',
    atmosphere: '#ffc94f',
  },
}

export function getMiddleMathPlanetStyle(region = {}, index = 0) {
  const directMatch = MIDDLE_MATH_BY_REGION_ID[region.id]
  if (directMatch) return directMatch

  const title = region.title || ''
  if (title.includes('내신기출') || title.includes('기출문제')) return MIDDLE_MATH_FALLBACKS[5]
  if (title.includes('수와 연산') || title.includes('문자와 식')) return MIDDLE_MATH_FALLBACKS[1]
  if (title.includes('함수') || title.includes('확률') || title.includes('통계')) return MIDDLE_MATH_FALLBACKS[2]
  if (title.includes('기하') || title.includes('도형')) return MIDDLE_MATH_FALLBACKS[3]
  if (title.includes('평가') || title.includes('모의')) return MIDDLE_MATH_FALLBACKS[4]
  if (title.includes('기본개념') || title.includes('기초')) return MIDDLE_MATH_FALLBACKS[0]
  return MIDDLE_MATH_FALLBACKS[index % MIDDLE_MATH_FALLBACKS.length]
}

export function getPythonPlanetStyle(region = {}, index = 0) {
  const directMatch = PYTHON_BY_REGION_ID[region.id]
  if (directMatch) return directMatch

  const title = region.title || ''
  if (title.includes('게임') || title.includes('프로젝트') || title.includes('turtle') || title.includes('창작')) return PYTHON_FALLBACKS[1]
  if (title.includes('심화') || title.includes('반복') || title.includes('함수') || title.includes('클래스') || title.includes('알고리즘')) return PYTHON_FALLBACKS[2]
  if (title.includes('데이터') || title.includes('시각화') || title.includes('분석') || title.includes('pandas') || title.includes('matplotlib')) {
    return { planetType: 'python_data', planetColor: '#7f8cff' }
  }
  if (title.includes('수학') || title.includes('연산')) return PYTHON_FALLBACKS[3]
  if (title.includes('처음') || title.includes('기초') || title.includes('입문')) return PYTHON_FALLBACKS[0]
  return PYTHON_FALLBACKS[index % PYTHON_FALLBACKS.length]
}

export function getPlanetSignatureProfile(planetType) {
  return PLANET_SIGNATURE_PROFILES[planetType] || null
}
