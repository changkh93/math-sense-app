export const MULTIPLICATION_TABLES = Array.from({ length: 11 }, (_, index) => index + 2)
export const MULTIPLIERS = Array.from({ length: 12 }, (_, index) => index + 1)

const KOREAN_DIGITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구']

export function toKoreanNumber(value) {
  const number = Math.max(0, Math.floor(Number(value) || 0))
  if (number === 0) return '영'
  if (number >= 100) {
    const hundreds = Math.floor(number / 100)
    const remainder = number % 100
    return `${hundreds === 1 ? '' : KOREAN_DIGITS[hundreds]}백${remainder ? toKoreanNumber(remainder) : ''}`
  }
  if (number >= 10) {
    const tens = Math.floor(number / 10)
    const ones = number % 10
    return `${tens === 1 ? '' : KOREAN_DIGITS[tens]}십${KOREAN_DIGITS[ones]}`
  }
  return KOREAN_DIGITS[number]
}

function koreanTopicParticle(word) {
  const finalCharacter = word.at(-1)
  const code = finalCharacter?.charCodeAt(0) || 0
  const hasFinalConsonant = code >= 0xAC00 && code <= 0xD7A3 && ((code - 0xAC00) % 28 !== 0)
  return hasFinalConsonant ? '은' : '는'
}

export function buildMultiplicationStatement(table, multiplier) {
  const tableWord = toKoreanNumber(table)
  const multiplierWord = toKoreanNumber(multiplier)
  if (multiplier >= 10) {
    return `${tableWord} 곱하기 ${multiplierWord}${koreanTopicParticle(multiplierWord)} ${toKoreanNumber(table * multiplier)}`
  }
  // Preserve the familiar Korean multiplication-table cadence taught aloud:
  // 이 일은 이 · 이 이는 사 · 이 삼은 육 · 이 사 팔 …
  // 삼 일은 삼 · 삼 이는 육 · 삼 삼은 구 · 삼 사 십이 …
  // 사 일은 사 · 사 이 팔 · 사 삼 십이 …
  const usesParticle = multiplier === 1 || (table <= 3 && multiplier <= 3)
  const spokenMultiplier = usesParticle
    ? `${multiplierWord}${koreanTopicParticle(multiplierWord)}`
    : multiplierWord
  return `${tableWord} ${spokenMultiplier} ${toKoreanNumber(table * multiplier)}`
}

export function buildMultiplicationQuestion(table, multiplier) {
  const tableWord = toKoreanNumber(table)
  const multiplierWord = toKoreanNumber(multiplier)
  if (multiplier >= 10) return `${tableWord} 곱하기 ${multiplierWord}${koreanTopicParticle(multiplierWord)}?`
  return `${tableWord} ${multiplierWord}${koreanTopicParticle(multiplierWord)}?`
}

export function buildMultiplicationChant(fact) {
  return MULTIPLIERS.slice(0, fact.multiplier).map((multiplier) => {
    return multiplier === fact.multiplier
      ? buildMultiplicationQuestion(fact.table, multiplier)
      : buildMultiplicationStatement(fact.table, multiplier)
  })
}

export function multiplicationFactId(table, multiplier) {
  return `${table}x${multiplier}`
}

export function buildMultiplicationFacts(selectedTables) {
  const tables = [...new Set(selectedTables)]
    .map(Number)
    .filter((table) => MULTIPLICATION_TABLES.includes(table))
    .sort((a, b) => a - b)

  return tables.flatMap((table) => MULTIPLIERS.map((multiplier) => ({
    id: multiplicationFactId(table, multiplier),
    table,
    multiplier,
    answer: table * multiplier,
    sequence: MULTIPLIERS.slice(0, multiplier).map((count) => table * count),
  })))
}

export function buildMultiplicationGrid(fact) {
  const rows = Array.from({ length: fact.table }, (_, index) => fact.table - index)
  return rows.map((row) => MULTIPLIERS.map((column) => ({
    row,
    column,
    product: row * column,
    isArea: column <= fact.multiplier,
    isTopRow: row === fact.table,
    isTarget: row === fact.table && column === fact.multiplier,
  })))
}

export function shuffleCards(cards, random = Math.random) {
  const shuffled = [...cards]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return shuffled
}

export function getKoreanDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function weaknessScore(stat = {}) {
  const correct = Math.max(0, Number(stat.correctCount) || 0)
  const wrong = Math.max(0, Number(stat.wrongCount) || 0)
  const hard = Math.max(0, Number(stat.hardCount) || 0)
  const easy = Math.max(0, Number(stat.easyCount) || 0)
  const attempts = correct + wrong
  const errorRate = attempts > 0 ? wrong / attempts : 0
  const recentSuccess = Math.max(0, Number(stat.consecutiveCorrect) || 0)
  const confidenceAttempts = hard + easy
  const hardRate = confidenceAttempts > 0 ? hard / confidenceAttempts : 0
  return (wrong * 2) + (hard * 1.2) + (errorRate * 4) + (hardRate * 2) - (recentSuccess * 0.65)
}

export function selectWeakFacts(facts, factStats, today, limit = 8) {
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

export function selectPracticeFacts(factStats) {
  return buildMultiplicationFacts(MULTIPLICATION_TABLES)
    .filter((fact) => {
      const stat = factStats[fact.id]
      return stat?.needsPractice ?? (stat?.wrongCount > 0 || stat?.hardCount > 0)
    })
    .sort((left, right) => weaknessScore(factStats[right.id]) - weaknessScore(factStats[left.id]) || left.id.localeCompare(right.id))
}

export function buildStudyPlan(selectedTables, factStats = {}, options = {}) {
  const { today = getKoreanDateKey(), random = Math.random, includePractice = false } = options
  const selectedFacts = buildMultiplicationFacts(selectedTables)
  const practiceFacts = includePractice ? selectPracticeFacts(factStats) : []
  const allFacts = [...new Map([...selectedFacts, ...practiceFacts].map((fact) => [fact.id, fact])).values()]
  const focusFacts = selectWeakFacts(selectedFacts, factStats, today)
  const focusCards = shuffleCards(focusFacts, random).map((fact) => ({ ...fact, phase: 'focus' }))
  const practiceCards = shuffleCards(practiceFacts, random).map((fact) => ({ ...fact, phase: 'practice' }))
  const mainCards = shuffleCards(selectedFacts, random).map((fact) => ({ ...fact, phase: 'main' }))

  return {
    allFacts,
    focusFacts,
    practiceFacts,
    queue: [...focusCards, ...practiceCards, ...mainCards],
  }
}

export function buildRetryQueue(retryIds, allFacts, random = Math.random) {
  const ids = new Set(retryIds)
  return shuffleCards(allFacts.filter((fact) => ids.has(fact.id)), random)
    .map((fact) => ({ ...fact, phase: 'retry' }))
}

export function updateFactStats(factStats, factId, correct, dateKey = getKoreanDateKey()) {
  const previous = factStats[factId] || {}
  const previousWrongCount = Math.max(0, Number(previous.wrongCount) || 0)
  const previousHardCount = Math.max(0, Number(previous.hardCount) || 0)
  const next = {
    correctCount: Math.max(0, Number(previous.correctCount) || 0),
    wrongCount: previousWrongCount,
    consecutiveCorrect: Math.max(0, Number(previous.consecutiveCorrect) || 0),
    lastSeenDate: dateKey,
    lastWrongDate: previous.lastWrongDate || null,
    lastHardDate: previous.lastHardDate || null,
    lastPracticeDate: previous.lastPracticeDate || null,
    hardCount: previousHardCount,
    easyCount: Math.max(0, Number(previous.easyCount) || 0),
    needsPractice: previous.needsPractice ?? (previousWrongCount > 0 || previousHardCount > 0),
  }

  if (correct) {
    next.correctCount += 1
    next.consecutiveCorrect += 1
  } else {
    next.wrongCount += 1
    next.consecutiveCorrect = 0
    next.lastWrongDate = dateKey
    next.lastPracticeDate = dateKey
    next.needsPractice = true
  }

  return { ...factStats, [factId]: next }
}

export function updateConfidenceStats(factStats, factId, confidence, correct, dateKey = getKoreanDateKey()) {
  const previous = factStats[factId] || {}
  const next = {
    ...previous,
    hardCount: Math.max(0, Number(previous.hardCount) || 0),
    easyCount: Math.max(0, Number(previous.easyCount) || 0),
  }

  if (confidence === 'hard') {
    next.hardCount += 1
    next.lastHardDate = dateKey
    next.lastPracticeDate = dateKey
    next.needsPractice = true
  } else {
    next.easyCount += 1
    if (correct) next.needsPractice = false
  }

  return { ...factStats, [factId]: next }
}
