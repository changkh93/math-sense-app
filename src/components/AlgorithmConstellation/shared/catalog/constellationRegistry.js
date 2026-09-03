/**
 * LUMI Algorithm Constellation — 10 Constellations Registry
 * 76 Core + 20 Branch + 4 Capstone = 100 Problems
 */

export const CONSTELLATIONS = Object.freeze([
  {
    id: 'constellation-0',
    number: 0,
    title: '사고 탐사 면허',
    subtitle: '순차 실행과 상태 추적의 첫걸음',
    icon: '🧭',
    accentColor: '#38bdf8',
    coreCount: 8,
    branchCount: 2,
    capstoneCount: 0,
    totalCount: 10,
    requiredAnchors: [
      'AC-EXP-SEQ-01',
      'AC-EXP-LOOP-06',
      'AC-CODE-FIRST-ERROR-01',
    ],
    minimumCoreToUnlockNext: 6,
  },
  {
    id: 'constellation-1',
    number: 1,
    title: '조건과 상태',
    subtitle: '논리 연산자와 분기 판단',
    icon: '⚡',
    accentColor: '#00f0ff',
    coreCount: 8,
    branchCount: 2,
    capstoneCount: 0,
    totalCount: 10,
    requiredAnchors: ['AC-COND-001'],
    minimumCoreToUnlockNext: 6,
  },
  {
    id: 'constellation-2',
    number: 2,
    title: '수학 패턴',
    subtitle: '주기와 나머지, 수의 성질',
    icon: '❄️',
    accentColor: '#818cf8',
    coreCount: 8,
    branchCount: 2,
    capstoneCount: 0,
    totalCount: 10,
    requiredAnchors: ['AC-PAT-003'],
    minimumCoreToUnlockNext: 6,
  },
  {
    id: 'constellation-3',
    number: 3,
    title: '수열과 문자열',
    subtitle: '데이터 순회와 누적, 텍스트 변환',
    icon: '🪐',
    accentColor: '#34d399',
    coreCount: 8,
    branchCount: 2,
    capstoneCount: 0,
    totalCount: 10,
    requiredAnchors: ['AC-SEQ-005', 'AC-STR-REVERSE-01'],
    minimumCoreToUnlockNext: 6,
  },
  {
    id: 'constellation-4',
    number: 4,
    title: '집합과 기록표',
    subtitle: '중복 제거와 빈도 기억',
    icon: '📊',
    accentColor: '#fbbf24',
    coreCount: 8,
    branchCount: 2,
    capstoneCount: 0,
    totalCount: 10,
    requiredAnchors: ['AC-SET-UNIQUE-01'],
    minimumCoreToUnlockNext: 6,
  },
  {
    id: 'constellation-5',
    number: 5,
    title: '시뮬레이션과 탐색',
    subtitle: '좌표 이동과 정렬·탐색 직관',
    icon: '🚀',
    accentColor: '#f43f5e',
    coreCount: 8,
    branchCount: 2,
    capstoneCount: 0,
    totalCount: 10,
    requiredAnchors: ['AC-SIM-ROVER-51', 'AC-SIM-SWITCH-54', 'AC-SORT-MIN-01'],
    minimumCoreToUnlockNext: 6,
  },
  {
    id: 'constellation-6',
    number: 6,
    title: '가능성 연구소',
    subtitle: '작은 완전 탐색과 조합',
    icon: '🔬',
    accentColor: '#a855f7',
    coreCount: 8,
    branchCount: 2,
    capstoneCount: 0,
    totalCount: 10,
    requiredAnchors: ['AC-ENUM-PAIR-01', 'AC-ENUM-SUBSET-65'],
    minimumCoreToUnlockNext: 6,
  },
  {
    id: 'constellation-7',
    number: 7,
    title: '스택과 대기열',
    subtitle: 'LIFO와 FIFO의 시각적 구분',
    icon: '📦',
    accentColor: '#06b6d4',
    coreCount: 8,
    branchCount: 2,
    capstoneCount: 0,
    totalCount: 10,
    requiredAnchors: ['AC-STACK-BOX-71', 'AC-NAV-005'],
    minimumCoreToUnlockNext: 6,
  },
  {
    id: 'constellation-8',
    number: 8,
    title: '격자 항해',
    subtitle: '이웃 탐색과 BFS 파동',
    icon: '🗺️',
    accentColor: '#10b981',
    coreCount: 8,
    branchCount: 2,
    capstoneCount: 0,
    totalCount: 10,
    requiredAnchors: ['AC-GRID-NEIGHBOR-81', 'AC-GRID-FLOOD-83', 'AC-NAV-006'],
    minimumCoreToUnlockNext: 6,
  },
  {
    id: 'constellation-9',
    number: 9,
    title: '전략과 기억',
    subtitle: '메모이제이션과 4대 캡스톤 프로젝트',
    icon: '👑',
    accentColor: '#ec4899',
    coreCount: 4,
    branchCount: 2,
    capstoneCount: 4,
    totalCount: 10,
    requiredAnchors: ['AC-MEMO-CLIMB-01'],
    minimumCoreToUnlockNext: null,
  },
])

export function getConstellationById(constellationId) {
  return CONSTELLATIONS.find((c) => c.id === constellationId) || null
}

export function isConstellationUnlocked(constellationNumber, completedProblemIds = [], editorialCatalog = []) {
  if (constellationNumber === 0) return true
  const prevConstellation = CONSTELLATIONS[constellationNumber - 1]
  if (!prevConstellation) return false

  const completedSet = new Set(completedProblemIds)

  // 1. All required anchors in previous constellation must be completed
  const anchorsPassed = prevConstellation.requiredAnchors.every((anchorId) => completedSet.has(anchorId))
  if (!anchorsPassed) return false

  // 2. Minimum number of Core problems in previous constellation must be completed
  const prevCoreProblemIds = editorialCatalog
    .filter((entry) => entry.constellationId === prevConstellation.id && entry.routeRole === 'core')
    .map((entry) => entry.problemId)

  const completedCoreCount = prevCoreProblemIds.filter((id) => completedSet.has(id)).length
  return completedCoreCount >= prevConstellation.minimumCoreToUnlockNext
}

/**
 * Release-aware access policy.
 * New access requires the previous constellation to have published every
 * required anchor and enough Core missions to make the 6/8 gate achievable.
 * Incomplete releases stay unavailable instead of bypassing learning order.
 * Existing completions retain access for review.
 */
export function getConstellationAccess(constellationNumber, completedProblemIds = [], editorialCatalog = []) {
  const current = CONSTELLATIONS.find((item) => item.number === constellationNumber)
  if (!current) return { accessible: false, mode: 'unavailable' }

  const publishedCurrent = editorialCatalog.filter(
    (entry) => entry.constellationId === current.id && entry.status === 'published'
  )
  if (publishedCurrent.length === 0) {
    return { accessible: false, mode: 'unavailable', publishedCount: 0 }
  }
  if (constellationNumber === 0) {
    return { accessible: true, mode: 'open', publishedCount: publishedCurrent.length }
  }

  const completedSet = new Set(completedProblemIds)
  const hasCompletedInThisConstellation = publishedCurrent.some((entry) => completedSet.has(entry.problemId))
  if (hasCompletedInThisConstellation) {
    return { accessible: true, mode: 'grandfathered', publishedCount: publishedCurrent.length }
  }

  const previous = CONSTELLATIONS.find((item) => item.number === constellationNumber - 1)
  if (!previous) return { accessible: false, mode: 'unavailable', publishedCount: publishedCurrent.length }
  const publishedPreviousCore = editorialCatalog.filter(
    (entry) => entry.constellationId === previous.id && entry.routeRole === 'core' && entry.status === 'published'
  )
  const publishedPreviousIds = new Set(publishedPreviousCore.map((entry) => entry.problemId))
  const gateReady = previous.requiredAnchors.every((anchorId) => publishedPreviousIds.has(anchorId)) &&
    publishedPreviousCore.length >= previous.minimumCoreToUnlockNext

  if (!gateReady) {
    return {
      accessible: false,
      mode: 'unavailable',
      reason: 'previous-release-incomplete',
      publishedCount: publishedCurrent.length,
    }
  }
  return {
    accessible: isConstellationUnlocked(constellationNumber, completedProblemIds, editorialCatalog),
    mode: 'gated',
    publishedCount: publishedCurrent.length,
  }
}

/**
 * Generic prerequisite check for any problem in the catalog.
 * Returns the list of missing prerequisite problem IDs (1★+ required).
 */
export function getMissingPrerequisites(problemId, completedProblemIds = [], editorialCatalog = []) {
  const completedSet = new Set(completedProblemIds)
  // Preserve access for students who completed a mission before prerequisites
  // were introduced or changed.
  if (completedSet.has(problemId)) return []

  const entry = editorialCatalog.find((item) => item.problemId === problemId)
  if (!entry || !entry.prerequisites || entry.prerequisites.length === 0) {
    return []
  }
  return entry.prerequisites.filter((prereqId) => !completedSet.has(prereqId))
}

export function isMissionPrerequisitesMet(problemId, completedProblemIds = [], editorialCatalog = []) {
  return getMissingPrerequisites(problemId, completedProblemIds, editorialCatalog).length === 0
}
