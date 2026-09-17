import {
  MULTIPLICATION_TABLES,
  MULTIPLIERS,
  getKoreanDateKey,
  shuffleCards,
  weaknessScore,
  updateConfidenceStats,
  updateFactStats,
} from './multiplicationCardLabModel.js'

export const DIVISION_TABLES = MULTIPLICATION_TABLES
export const DIVISION_QUOTIENTS = MULTIPLIERS
export const DIVISION_PAIR_QUOTIENTS = [1, 2, 4, 7, 9, 12]

export function divisionFactId(divisor, quotient, remainder = 0) {
  return `${(divisor * quotient) + remainder}d${divisor}`
}

export function buildDivisionFacts(selectedTables) {
  const tables = [...new Set(selectedTables)]
    .map(Number)
    .filter((table) => DIVISION_TABLES.includes(table))
    .sort((a, b) => a - b)

  return tables.flatMap((divisor) => DIVISION_PAIR_QUOTIENTS.flatMap((quotient, pairIndex) => {
    const remainder = divisor === 2 ? 1 : (pairIndex % (divisor - 1)) + 1
    return [0, remainder].map((currentRemainder) => ({
      id: divisionFactId(divisor, quotient, currentRemainder),
      table: divisor,
      divisor,
      multiplier: quotient,
      quotient,
      remainder: currentRemainder,
      dividend: (divisor * quotient) + currentRemainder,
      answer: quotient,
      sequence: DIVISION_QUOTIENTS.slice(0, quotient).map((count) => divisor * count),
    }))
  }))
}

export function buildDivisionGroups(fact) {
  return Array.from({ length: fact.quotient }, (_, groupIndex) => ({
    group: groupIndex + 1,
    total: fact.divisor * (groupIndex + 1),
    dots: Array.from({ length: fact.divisor }, (_, dotIndex) => dotIndex + 1),
  }))
}

export function selectWeakDivisionFacts(facts, factStats, today, limit = 8) {
  return facts
    .filter((fact) => {
      const stat = factStats[fact.id]
      const needsPractice = stat?.needsPractice ?? (stat?.wrongCount > 0 || stat?.hardCount > 0)
      const lastPracticeDate = stat?.lastPracticeDate || stat?.lastWrongDate || stat?.lastHardDate
      return needsPractice && lastPracticeDate && lastPracticeDate < today
    })
    .map((fact) => ({ fact, score: weaknessScore(factStats[fact.id]) }))
    .filter(({ score }) => score > 0.5)
    .sort((left, right) => right.score - left.score || left.fact.id.localeCompare(right.fact.id))
    .slice(0, limit)
    .map(({ fact }) => fact)
}

export function selectPracticeDivisionFacts(factStats) {
  return buildDivisionFacts(DIVISION_TABLES)
    .filter((fact) => {
      const stat = factStats[fact.id]
      return stat?.needsPractice ?? (stat?.wrongCount > 0 || stat?.hardCount > 0)
    })
    .sort((left, right) => weaknessScore(factStats[right.id]) - weaknessScore(factStats[left.id]) || left.id.localeCompare(right.id))
}

export function buildDivisionStudyPlan(selectedTables, factStats = {}, options = {}) {
  const { today = getKoreanDateKey(), random = Math.random, includePractice = false } = options
  const selectedFacts = buildDivisionFacts(selectedTables)
  const practiceFacts = includePractice ? selectPracticeDivisionFacts(factStats) : []
  const allFacts = [...new Map([...selectedFacts, ...practiceFacts].map((fact) => [fact.id, fact])).values()]
  const focusFacts = selectWeakDivisionFacts(selectedFacts, factStats, today)
  const focusIds = new Set(focusFacts.map((fact) => fact.id))
  const selectedIds = new Set(selectedFacts.map((fact) => fact.id))
  const practiceOnlyFacts = practiceFacts.filter((fact) => !selectedIds.has(fact.id))
  const regularFacts = selectedFacts.filter((fact) => !focusIds.has(fact.id))
  return {
    allFacts,
    focusFacts,
    practiceFacts,
    queue: [
      ...shuffleCards(focusFacts, random).map((fact) => ({ ...fact, phase: 'focus' })),
      ...shuffleCards(practiceOnlyFacts, random).map((fact) => ({ ...fact, phase: 'practice' })),
      ...shuffleCards(regularFacts, random).map((fact) => ({ ...fact, phase: 'main' })),
    ],
  }
}

export function buildDivisionRetryQueue(retryIds, allFacts, random = Math.random) {
  const ids = new Set(retryIds)
  return shuffleCards(allFacts.filter((fact) => ids.has(fact.id)), random)
    .map((fact) => ({ ...fact, phase: 'retry' }))
}

export { getKoreanDateKey, updateConfidenceStats, updateFactStats }
