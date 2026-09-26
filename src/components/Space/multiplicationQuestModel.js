export const QUEST_FACTORS = Object.freeze([2, 3, 4, 5, 6, 7, 8, 9])

export const QUEST_ZONES = Object.freeze([
  { id: 'echo-forest', table: 2, name: '메아리 숲', shortName: '2단 숲', icon: '🌲', color: '#54e6a5', action: '길 잃은 빛동물을 구조해요' },
  { id: 'tide-harbor', table: 3, name: '세 갈래 항구', shortName: '3단 항구', icon: '⛵', color: '#53cfff', action: '세 갈래 수로를 연결해요' },
  { id: 'prism-mine', table: 4, name: '프리즘 광산', shortName: '4단 광산', icon: '💎', color: '#a98cff', action: '네 겹 수정 동력을 깨워요' },
  { id: 'sun-dunes', table: 5, name: '태양 모래바다', shortName: '5단 사막', icon: '☀️', color: '#ffc85a', action: '다섯 박자 신호탑을 복구해요' },
  { id: 'ember-ridge', table: 6, name: '불씨 화산', shortName: '6단 화산', icon: '🌋', color: '#ff866e', action: '용암 위 안전 발판을 만들어요' },
  { id: 'moon-citadel', table: 7, name: '달그림자 성', shortName: '7단 성', icon: '🏰', color: '#7e9cff', action: '사라진 일곱 개 성문을 열어요' },
  { id: 'orbit-station', table: 8, name: '팔방 우주기지', shortName: '8단 기지', icon: '🛰️', color: '#52e4dd', action: '여덟 방향 궤도를 정렬해요' },
  { id: 'crown-nebula', table: 9, name: '왕관 성운', shortName: '9단 성운', icon: '👑', color: '#ff79c9', action: '마지막 별문을 되찾아요' },
])

export const ENCOUNTER_SCENES = Object.freeze([
  { id: 'bridge', icon: '🌉', title: '별빛 다리', instruction: '정답만큼 에너지를 보내 다리를 완성하세요.' },
  { id: 'rescue', icon: '🛟', title: '빛동물 구조', instruction: '흩어진 친구들이 모두 몇 명인지 찾아 주세요.' },
  { id: 'reactor', icon: '⚡', title: '수정 원자로', instruction: '알맞은 수를 입력해 동력 회로를 연결하세요.' },
  { id: 'shield', icon: '🛡️', title: '유성 방어막', instruction: '곱셈식에서 사라진 수를 찾아 방어막을 펼치세요.' },
  { id: 'vault', icon: '🗝️', title: '기억 금고', instruction: '암호가 된 곱셈식을 풀어 금고를 여세요.' },
  { id: 'rover', icon: '🚀', title: '탐사선 점프', instruction: '같은 수의 묶음을 계산해 다음 발판으로 이동하세요.' },
])

const MODE_SEQUENCE = Object.freeze(['direct', 'story', 'reverse', 'missing', 'direct', 'story', 'reverse', 'missing'])

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, Number(value) || 0))
}

function toTimestamp(value, fallback = Date.now()) {
  const parsed = typeof value === 'number' ? value : Date.parse(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function canonicalFactId(left, right) {
  const factors = [Number(left), Number(right)].sort((a, b) => a - b)
  return `${factors[0]}x${factors[1]}`
}

export function buildQuestFact(left, right) {
  const a = Number(left)
  const b = Number(right)
  return {
    id: canonicalFactId(a, b),
    a,
    b,
    product: a * b,
  }
}

export function buildQuestFactPool() {
  const facts = []
  QUEST_FACTORS.forEach((a, rowIndex) => {
    QUEST_FACTORS.slice(rowIndex).forEach((b) => facts.push(buildQuestFact(a, b)))
  })
  return facts
}

export function normalizeMemory(rawMemory = {}) {
  if (!rawMemory || typeof rawMemory !== 'object' || Array.isArray(rawMemory)) return {}
  return Object.fromEntries(Object.entries(rawMemory).map(([factId, raw]) => {
    const stat = raw && typeof raw === 'object' ? raw : {}
    return [factId, {
      attempts: Math.max(0, Number(stat.attempts) || 0),
      correct: Math.max(0, Number(stat.correct) || 0),
      wrong: Math.max(0, Number(stat.wrong) || 0),
      streak: Math.max(0, Number(stat.streak) || 0),
      mastery: clamp(stat.mastery),
      averageResponseMs: Math.max(0, Number(stat.averageResponseMs) || 0),
      hintCount: Math.max(0, Number(stat.hintCount) || 0),
      lastSeenAt: Number(stat.lastSeenAt) || 0,
      lastCorrectAt: Number(stat.lastCorrectAt) || 0,
      nextDueAt: Number(stat.nextDueAt) || 0,
      modes: stat.modes && typeof stat.modes === 'object' ? { ...stat.modes } : {},
    }]
  }))
}

export function seedMemoryFromCardLab(memory = {}, cardStats = {}) {
  const seeded = normalizeMemory(memory)
  Object.entries(cardStats || {}).forEach(([rawId, rawStat]) => {
    const match = /^(\d+)x(\d+)$/.exec(rawId)
    if (!match) return
    const left = Number(match[1])
    const right = Number(match[2])
    if (!QUEST_FACTORS.includes(left) || !QUEST_FACTORS.includes(right)) return

    const factId = canonicalFactId(left, right)
    if (seeded[factId]?.attempts > 0) return
    const correct = Math.max(0, Number(rawStat?.correctCount) || 0)
    const wrong = Math.max(0, Number(rawStat?.wrongCount) || 0)
    const hard = Math.max(0, Number(rawStat?.hardCount) || 0)
    const easy = Math.max(0, Number(rawStat?.easyCount) || 0)
    const attempts = correct + wrong
    const evidence = attempts + hard + easy
    if (!evidence) return

    const accuracy = attempts ? correct / attempts : 0.5
    const confidence = (easy + hard) ? easy / (easy + hard) : accuracy
    seeded[factId] = {
      attempts,
      correct,
      wrong,
      streak: Math.max(0, Number(rawStat?.consecutiveCorrect) || 0),
      mastery: clamp((accuracy * 0.55) + (confidence * 0.25) + Math.min(0.2, evidence * 0.025)),
      averageResponseMs: 0,
      hintCount: hard,
      lastSeenAt: 0,
      lastCorrectAt: 0,
      nextDueAt: 0,
      modes: { lightCard: evidence },
    }
  })
  return seeded
}

export function getMasteryBand(stat = {}) {
  const mastery = clamp(stat.mastery)
  if (mastery >= 0.82 && Number(stat.streak) >= 2) return 'mastered'
  if (mastery >= 0.56) return 'steady'
  if (mastery >= 0.28) return 'growing'
  return 'seed'
}

export function getMasteryLabel(stat = {}) {
  return {
    seed: '첫 기억',
    growing: '자라는 중',
    steady: '거의 연결',
    mastered: '단단한 기억',
  }[getMasteryBand(stat)]
}

export function factPriorityScore(fact, memory = {}, options = {}) {
  const { now = Date.now(), zoneTable = null } = options
  const stat = memory[fact.id] || {}
  const attempts = Math.max(0, Number(stat.attempts) || 0)
  const mastery = clamp(stat.mastery)
  const wrongCount = Number(stat.wrong) || 0
  const errorRate = attempts ? wrongCount / attempts : 0.15
  const due = !stat.nextDueAt || Number(stat.nextDueAt) <= now
  const slowRecall = stat.averageResponseMs > 9000 ? 1.2 : stat.averageResponseMs > 6000 ? 0.6 : 0
  const zoneBoost = zoneTable && (fact.a === zoneTable || fact.b === zoneTable) ? 1.8 : 0
  return (attempts ? 0 : 1.6)
    + ((1 - mastery) * 5)
    + (errorRate * 3.2)
    + Math.min(2.4, wrongCount * 0.55)
    + (due ? 1.4 : 0)
    + slowRecall
    + Math.min(1.2, (Number(stat.hintCount) || 0) * 0.18)
    + zoneBoost
}

function rankedFacts(facts, memory, options) {
  const random = options.random || Math.random
  return facts
    .map((fact) => ({ fact, score: factPriorityScore(fact, memory, options) + (random() * 0.35) }))
    .sort((left, right) => right.score - left.score || left.fact.id.localeCompare(right.fact.id))
    .map(({ fact }) => fact)
}

export function getZoneById(zoneId) {
  return QUEST_ZONES.find((zone) => zone.id === zoneId) || QUEST_ZONES[4]
}

export function getZoneProgress(zone, memory = {}) {
  const facts = QUEST_FACTORS.map((factor) => buildQuestFact(zone.table, factor))
  const average = facts.reduce((total, fact) => total + clamp(memory[fact.id]?.mastery), 0) / facts.length
  return Math.round(average * 100)
}

export function recommendQuestZone(memory = {}) {
  const hasEvidence = Object.values(memory).some((stat) => Number(stat?.attempts) > 0 || Number(stat?.mastery) > 0)
  if (!hasEvidence) return getZoneById('ember-ridge')
  return [...QUEST_ZONES].sort((left, right) => (
    getZoneProgress(left, memory) - getZoneProgress(right, memory)
    || right.table - left.table
  ))[0]
}

export function selectAdaptiveFacts(memory = {}, options = {}) {
  const {
    zoneId = 'ember-ridge',
    count = 8,
    now = Date.now(),
    random = Math.random,
  } = options
  const zone = getZoneById(zoneId)
  const zoneFacts = QUEST_FACTORS.map((factor) => buildQuestFact(zone.table, factor))
  const zoneCount = Math.min(zoneFacts.length, Math.max(4, Math.ceil(count * 0.65)))
  const selected = rankedFacts(zoneFacts, memory, { now, zoneTable: zone.table, random }).slice(0, zoneCount)
  const selectedIds = new Set(selected.map((fact) => fact.id))
  const globalFacts = buildQuestFactPool().filter((fact) => !selectedIds.has(fact.id))
  selected.push(...rankedFacts(globalFacts, memory, { now, zoneTable: zone.table, random }).slice(0, count - selected.length))
  return selected
}

function modeForEncounter(index, isBoss = false) {
  if (isBoss) return index % 2 === 0 ? 'reverse' : 'missing'
  return MODE_SEQUENCE[index % MODE_SEQUENCE.length]
}

export function createEncounter(fact, index, options = {}) {
  const { isBoss = false, mode = modeForEncounter(index, isBoss), retryDepth = 0 } = options
  const scene = isBoss
    ? { id: 'guardian', icon: '🐉', title: '기억의 수호룡', instruction: '곱셈의 순서와 빈칸을 연결해 마지막 별문을 여세요.' }
    : ENCOUNTER_SCENES[index % ENCOUNTER_SCENES.length]
  return {
    id: `${fact.id}:${index}:${mode}:${retryDepth}`,
    fact,
    mode,
    scene,
    isBoss,
    retryDepth,
  }
}

export function buildExpedition(memory = {}, options = {}) {
  const { zoneId = recommendQuestZone(memory).id, now = Date.now(), random = Math.random } = options
  const zone = getZoneById(zoneId)
  const facts = selectAdaptiveFacts(memory, { zoneId, count: 8, now, random })
  const missions = facts.map((fact, index) => createEncounter(fact, index))
  const bossFacts = [...facts]
    .sort((left, right) => factPriorityScore(right, memory, { now }) - factPriorityScore(left, memory, { now }))
    .slice(0, 2)
  bossFacts.forEach((fact, index) => missions.push(createEncounter(fact, missions.length + index, { isBoss: true })))
  return { zone, facts, missions }
}

export function getEncounterPrompt(encounter) {
  const { a, b, product } = encounter.fact
  if (encounter.mode === 'reverse') return { expression: `${b} × ${a}`, answer: product, kind: '곱셈 순서 바꾸기' }
  if (encounter.mode === 'missing') return { expression: `${a} × ? = ${product}`, answer: b, kind: '사라진 수 찾기', hasAnswerSuffix: false }
  if (encounter.mode === 'story') return { expression: `${a}개씩 ${b}묶음`, answer: product, kind: '묶음의 전체 수' }
  return { expression: `${a} × ${b}`, answer: product, kind: '곱셈 기억 꺼내기' }
}

export function getFactStrategy(fact) {
  const { a, b, product } = fact
  const factors = [a, b]
  const otherThan = (target) => (a === target ? b : a)

  if (factors.includes(9)) {
    const other = otherThan(9)
    return {
      title: '10배에서 한 묶음 되돌리기',
      hintEquation: `${other} × 10 - ${other} = ?`,
      equation: `${other} × 10 - ${other} = ${other * 10} - ${other} = ${product}`,
      explanation: `${other}가 10묶음 있다고 생각한 뒤 ${other} 한 묶음을 되돌려요.`,
    }
  }
  if (factors.includes(5)) {
    const other = otherThan(5)
    return {
      title: '다섯 묶음의 규칙 보기',
      hintEquation: `5씩 ${other}번 뛰어 보기 → ?`,
      equation: `${other} × 5 = ${product}`,
      explanation: `5씩 ${other}번, 또는 ${other}씩 5번 뛰어 ${product}에 도착해요.`,
    }
  }
  if (factors.includes(2)) {
    const other = otherThan(2)
    return {
      title: '한 번 더 같은 수',
      hintEquation: `${other} + ${other} = ?`,
      equation: `${other} + ${other} = ${product}`,
      explanation: `${other}가 두 묶음이니 같은 수를 한 번 더 더해요.`,
    }
  }
  if (factors.includes(4) || factors.includes(8)) {
    const target = factors.includes(8) ? 8 : 4
    const other = otherThan(target)
    const half = target / 2
    return {
      title: '반으로 나누어 두 번 연결하기',
      hintEquation: `${other} × ${half} + ${other} × ${half} = ?`,
      equation: `${other} × ${half} + ${other} × ${half} = ${product / 2} + ${product / 2} = ${product}`,
      explanation: `${target}묶음을 절반씩 나누면 이미 아는 작은 곱셈 두 개가 돼요.`,
    }
  }
  const anchor = Math.min(5, b - 1)
  const remainder = b - anchor
  return {
    title: '아는 5묶음에서 이어 가기',
    hintEquation: `${a} × ${anchor} + ${a} × ${remainder} = ?`,
    equation: `${a} × ${anchor} + ${a} × ${remainder} = ${a * anchor} + ${a * remainder} = ${product}`,
    explanation: `먼저 ${a}가 ${anchor}묶음인 수를 떠올리고, 남은 ${remainder}묶음을 이어 붙여요.`,
  }
}

function nextMode(mode) {
  if (mode === 'direct') return 'reverse'
  if (mode === 'reverse' || mode === 'story') return 'missing'
  return 'direct'
}

export function insertDelayedRetry(queue, currentIndex, encounter, distance = 3) {
  if (encounter.retryDepth >= 1) return queue
  const nextQueue = [...queue]
  const insertAt = Math.min(nextQueue.length, currentIndex + Math.max(2, distance) + 1)
  nextQueue.splice(insertAt, 0, createEncounter(encounter.fact, insertAt, {
    mode: nextMode(encounter.mode),
    retryDepth: encounter.retryDepth + 1,
  }))
  return nextQueue
}

export function updateFactMemory(memory = {}, fact, result = {}, options = {}) {
  const now = toTimestamp(options.now)
  const normalized = normalizeMemory(memory)
  const previous = normalized[fact.id] || normalizeMemory({ [fact.id]: {} })[fact.id]
  const correct = Boolean(result.correct)
  const usedHint = Boolean(result.usedHint)
  const responseMs = Math.max(250, Math.min(120000, Number(result.responseMs) || 0))
  const attempts = previous.attempts + 1
  const nextStreak = correct ? previous.streak + 1 : 0
  const responseAverage = responseMs
    ? previous.averageResponseMs
      ? Math.round((previous.averageResponseMs * 0.72) + (responseMs * 0.28))
      : responseMs
    : previous.averageResponseMs
  const masteryDelta = correct
    ? 0.105 + Math.min(0.045, nextStreak * 0.012) + (usedHint ? 0 : 0.025) + (result.mode === 'missing' ? 0.018 : 0)
    : -0.055
  const intervalMs = [0, 4 * 60 * 60 * 1000, 24 * 60 * 60 * 1000, 3 * 24 * 60 * 60 * 1000, 7 * 24 * 60 * 60 * 1000][Math.min(4, nextStreak)]

  return {
    ...normalized,
    [fact.id]: {
      attempts,
      correct: previous.correct + (correct ? 1 : 0),
      wrong: previous.wrong + (correct ? 0 : 1),
      streak: nextStreak,
      mastery: clamp(previous.mastery + masteryDelta),
      averageResponseMs: responseAverage,
      hintCount: previous.hintCount + (usedHint ? 1 : 0),
      lastSeenAt: now,
      lastCorrectAt: correct ? now : previous.lastCorrectAt,
      nextDueAt: correct ? now + intervalMs : now + (8 * 60 * 1000),
      modes: {
        ...previous.modes,
        [result.mode || 'direct']: Math.max(0, Number(previous.modes?.[result.mode || 'direct']) || 0) + 1,
      },
    },
  }
}

export function summarizeMemory(memory = {}) {
  const facts = buildQuestFactPool()
  const bands = { seed: 0, growing: 0, steady: 0, mastered: 0 }
  let masteryTotal = 0
  facts.forEach((fact) => {
    const stat = memory[fact.id] || {}
    bands[getMasteryBand(stat)] += 1
    masteryTotal += clamp(stat.mastery)
  })
  return {
    totalFacts: facts.length,
    averageMastery: Math.round((masteryTotal / facts.length) * 100),
    ...bands,
  }
}
