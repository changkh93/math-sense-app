export const EQUIVALENT_FRACTION_MISSIONS = Object.freeze([
  {
    id: 'half-thirds',
    title: '반쪽을 세로 3칸으로',
    numerator: 1,
    denominator: 2,
    factor: 3,
    prompt: '반쪽짜리 카드에 세로로 3칸을 만들면 작은 방은 모두 몇 칸이 될까요?',
    observation: '색칠한 반쪽의 넓이는 그대로인데, 색칠한 방은 1칸에서 3칸이 돼요.',
  },
  {
    id: 'half-halves',
    title: '반쪽을 다시 둘로',
    numerator: 1,
    denominator: 2,
    factor: 2,
    prompt: '이번에는 반쪽 카드에 세로로 2칸을 만들어 보세요.',
    observation: '전체 2칸이 4칸으로, 색칠한 1칸이 2칸으로 함께 늘어요.',
  },
  {
    id: 'two-thirds-double',
    title: '세 칸을 두 줄로',
    numerator: 2,
    denominator: 3,
    factor: 2,
    prompt: '3칸 중 2칸을 색칠한 카드에 세로선 1개를 더해 보세요.',
    observation: '색칠한 넓이는 그대로예요. 방의 이름만 더 작은 조각으로 바뀌었어요.',
  },
  {
    id: 'three-fourths-double',
    title: '네 칸을 두 줄로',
    numerator: 3,
    denominator: 4,
    factor: 2,
    prompt: '4칸 중 3칸을 색칠한 카드도 같은 방법으로 나눌 수 있을까요?',
    observation: '색칠한 칸과 전체 칸에 똑같이 2를 곱하면 크기는 달라지지 않아요.',
  },
  {
    id: 'two-fifths-triple',
    title: '다섯 칸을 세 줄로',
    numerator: 2,
    denominator: 5,
    factor: 3,
    prompt: '5칸짜리 카드 위에 세로로 3칸인 투명카드를 겹쳐 보세요.',
    observation: '선이 많아져도 파란 부분의 높이와 넓이는 처음과 똑같아요.',
  },
  {
    id: 'three-fifths-quadruple',
    title: '마지막 렌즈 실험',
    numerator: 3,
    denominator: 5,
    factor: 4,
    prompt: '이번에는 세로로 4칸인 렌즈예요. 두 수가 몇 배가 되는지 찾아보세요.',
    observation: '분자와 분모에 같은 수를 곱하면 같은 크기 분수를 만들 수 있어요.',
  },
])

export function greatestCommonDivisor(a, b) {
  let left = Math.abs(Number(a) || 0)
  let right = Math.abs(Number(b) || 0)
  while (right) {
    const remainder = left % right
    left = right
    right = remainder
  }
  return left || 1
}

export function buildEquivalentFraction(numerator, denominator, factor) {
  const safeDenominator = Math.max(2, Math.trunc(Number(denominator) || 2))
  const safeNumerator = Math.min(
    safeDenominator - 1,
    Math.max(1, Math.trunc(Number(numerator) || 1)),
  )
  const safeFactor = Math.min(5, Math.max(2, Math.trunc(Number(factor) || 2)))
  const equivalentNumerator = safeNumerator * safeFactor
  const equivalentDenominator = safeDenominator * safeFactor

  return {
    numerator: safeNumerator,
    denominator: safeDenominator,
    factor: safeFactor,
    equivalentNumerator,
    equivalentDenominator,
    shadedRatio: safeNumerator / safeDenominator,
    shadedCells: equivalentNumerator,
    totalCells: equivalentDenominator,
  }
}

export function buildFractionGrid(numerator, denominator, factor) {
  const fraction = buildEquivalentFraction(numerator, denominator, factor)
  return Array.from({ length: fraction.denominator }, (_, row) => (
    Array.from({ length: fraction.factor }, (_, column) => ({
      id: `${row}-${column}`,
      row,
      column,
      shaded: row < fraction.numerator,
    }))
  )).flat()
}

export function validateEquivalentFractionAnswer(config, answerNumerator, answerDenominator) {
  const fraction = buildEquivalentFraction(config.numerator, config.denominator, config.factor)
  const numerator = Number(answerNumerator)
  const denominator = Number(answerDenominator)
  const numeratorCorrect = numerator === fraction.equivalentNumerator
  const denominatorCorrect = denominator === fraction.equivalentDenominator

  return {
    correct: numeratorCorrect && denominatorCorrect,
    numeratorCorrect,
    denominatorCorrect,
    expectedNumerator: fraction.equivalentNumerator,
    expectedDenominator: fraction.equivalentDenominator,
  }
}

export function clampOverlayProgress(value) {
  return Math.min(1, Math.max(0, Number(value) || 0))
}

export function getEquivalentFractionSentence(config) {
  const fraction = buildEquivalentFraction(config.numerator, config.denominator, config.factor)
  return `${fraction.numerator}/${fraction.denominator}과 ${fraction.equivalentNumerator}/${fraction.equivalentDenominator}은 같은 크기입니다.`
}
