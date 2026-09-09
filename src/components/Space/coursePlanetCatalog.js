import { isWesternClassicCluster } from '../../constants/westernClassicNavigation.js'
import { getMiddleMathPlanetStyle, getPythonPlanetStyle } from './planetCourseStyles.js'

const COURSE_CONFIGS = {
  middle: {
    key: 'middle',
    eyebrow: 'MATH UNIVERSE',
    sequence: '02',
    title: '개념을 연결하는',
    highlight: '중등수학 성단',
    intro: '핵심 개념부터 학교 시험과 실전 평가까지 한눈에 살펴보세요.',
    sectionLabel: '중등수학 행성군',
    accent: '#74d8ff',
    accentSoft: '#9ce9ff',
    columns: 3,
  },
  python: {
    key: 'python',
    eyebrow: 'CODE UNIVERSE',
    sequence: '03',
    title: '코드로 움직이는',
    highlight: '파이썬 성단',
    intro: '기초 문법에서 수학 코딩과 프로젝트까지 나만의 항로를 선택하세요.',
    sectionLabel: '파이썬 학습 행성군',
    accent: '#65e6cd',
    accentSoft: '#a0f4e2',
    columns: 4,
  },
  classic: {
    key: 'classic',
    eyebrow: 'STORY UNIVERSE',
    sequence: '04',
    title: '이야기가 이어지는',
    highlight: '고전 읽기 우주',
    intro: '작품의 세계를 여행하고, 읽은 생각과 질문을 나의 책장에 기록하세요.',
    sectionLabel: '고전 읽기 행성군',
    accent: '#e6c982',
    accentSoft: '#f4e2ad',
    columns: 3,
  },
}

const MIDDLE_WORLDS = {
  middle_math_core: { topic: '기초부터 완성', subtitle: 'Foundation Atlas', color: '#72d9ff', image: '/assets/planets/middle-math-core.png' },
  middle_math_numbers_expressions: { topic: '수와 연산 · 문자와 식', subtitle: 'Number & Expression', color: '#5ee9ce', image: '/assets/planets/middle-math-numbers-expressions.webp' },
  middle_math_functions_statistics: { topic: '함수 · 확률 · 통계', subtitle: 'Function & Data', color: '#74edab', image: '/assets/planets/middle-math-functions-statistics.webp' },
  middle_math_absolute_geometry: { topic: '도형과 공간', subtitle: 'Geometry', color: '#d1a4ff', image: '/assets/planets/middle-math-absolute-geometry.webp' },
  middle_math_exam: { topic: '실전 진단', subtitle: 'Assessment', color: '#ffc274', image: '/assets/planets/middle-math-exam.png' },
  middle_math_school_exam: { topic: '학교 시험 대비', subtitle: 'School Archive', color: '#ff7d91', image: '/assets/planets/middle-math-school-exam.webp' },
}

const PYTHON_WORLDS = {
  python_foundation: { topic: '문법 기초', subtitle: 'Python Foundation', color: '#61c7ff', image: '/assets/planets/python-foundation.png' },
  python_project: { topic: '게임 만들기', subtitle: 'Game Studio', color: '#f879df', image: '/assets/planets/python-project.png' },
  python_advanced: { topic: '알고리즘 심화', subtitle: 'Advanced Lab', color: '#57ebd0', image: '/assets/planets/python-advanced.png' },
  python_math: { topic: '수학 코딩', subtitle: 'Math Engine', color: '#ffd66b', image: '/assets/planets/python-data.png' },
  python_data: { topic: '데이터 분석', subtitle: 'Data Observatory', color: '#9caaff', image: '/assets/planets/python-data.png' },
}

const CLASSIC_WORLDS = [
  { match: /네버랜드/, topic: '환상과 성장', subtitle: 'Neverland Classics', color: '#67ddbd', image: '/assets/planets/western-classic-neverland.webp' },
  { match: /노벨문학상/, topic: '문학과 사유', subtitle: 'Nobel Literature', color: '#e8c56f', image: '/assets/planets/western-classic-nobel.webp' },
  { match: /서양고전|고전/, topic: '명작 읽기', subtitle: 'Western Classics', color: '#c995e7', image: '/assets/planets/western-classic-heritage.webp' },
]

const COMMON_STATIONS = {
  archive: { id: 'archive', title: '과제 기록소', topic: '오늘의 과제와 학습 기록', color: '#edc17c', image: '/assets/planets/elementary/archive.webp' },
  notebook: { id: 'notebook', title: '오답노트 행성', topic: '틀린 문제 다시 살펴보기', color: '#76dacf', image: '/assets/planets/elementary/notebook.webp' },
  dark: { id: 'dark', title: '다크 매터', topic: '복습할 문제', color: '#bca5f5', image: '/assets/planets/elementary/dark.webp', showsCount: true },
  refinery: { id: 'refinery', title: '다크매터 정제소', topic: '오답 정제하기', color: '#e2b18c', image: '/assets/planets/elementary/refinery.webp', showsCount: true },
  reading_library: { id: 'reading_library', title: '나의 책장', topic: '독서 기록과 작품 보관', color: '#67ddbd', image: '/assets/planets/reading-library.webp' },
  python_game_studio: { id: 'python_game_studio', title: '게임 스튜디오', topic: 'Python으로 나만의 게임 만들기', color: '#83f3cd', icon: '⌘' },
  lumi_protocol: { id: 'lumi_protocol', title: '루미 프로토콜', topic: '20개의 파이썬 미션', color: '#62ebd5', icon: '△' },
  algorithm_constellation: { id: 'algorithm_constellation', title: '생각의 항로', topic: '알고리즘 사고력 훈련', color: '#9ba7ff', image: '/assets/planets/algorithm-constellation.png' },
}

const STATION_KEYS = {
  middle: ['archive', 'notebook', 'dark', 'refinery'],
  python: ['python_game_studio', 'lumi_protocol', 'algorithm_constellation', 'archive', 'notebook', 'dark', 'refinery'],
  classic: ['reading_library', 'archive', 'dark'],
}

export function getCourseExplorerConfig(clusterId) {
  if (clusterId === 'middle-math' || clusterId === '중등수학') return COURSE_CONFIGS.middle
  if (clusterId === 'python' || clusterId === '파이썬') return COURSE_CONFIGS.python
  if (isWesternClassicCluster(clusterId)) return COURSE_CONFIGS.classic
  return null
}

export function isCourseExplorerCluster(clusterId) {
  return Boolean(getCourseExplorerConfig(clusterId))
}

export function getCourseWorld(region, index, clusterId) {
  const config = getCourseExplorerConfig(clusterId)
  if (!config) return null

  let preset
  if (config.key === 'middle') {
    const { planetType } = getMiddleMathPlanetStyle(region, index)
    preset = MIDDLE_WORLDS[planetType] || MIDDLE_WORLDS.middle_math_core
  } else if (config.key === 'python') {
    const { planetType } = getPythonPlanetStyle(region, index)
    preset = PYTHON_WORLDS[planetType] || PYTHON_WORLDS.python_foundation
  } else {
    preset = CLASSIC_WORLDS.find((world) => world.match.test(region?.title || '')) || CLASSIC_WORLDS[index % CLASSIC_WORLDS.length]
  }

  return {
    ...preset,
    id: region.id,
    title: region.title || '학습 행성',
    region,
  }
}

export function getCourseStations(clusterId) {
  const config = getCourseExplorerConfig(clusterId)
  if (!config) return []
  return STATION_KEYS[config.key].map((key) => COMMON_STATIONS[key])
}

export function getCourseAccess(region, regionAccess = {}) {
  if (!region?.isPrivate) return 'open'
  const status = regionAccess[region.id]
  if (status === 'active' || status === 'completed') return 'open'
  return status === 'suspended' ? 'suspended' : 'locked'
}
