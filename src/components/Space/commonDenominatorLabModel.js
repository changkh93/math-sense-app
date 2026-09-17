export const COMMON_DENOMINATOR_MISSIONS = Object.freeze([
  {
    id: 'half-two-thirds',
    title: '반과 삼분의 이를 만나게',
    left: [1, 2],
    right: [2, 3],
    prompt: '분모 2의 각 칸은 옆 분모 3에 따라 3등분하고, 분모 3의 각 칸은 옆 분모 2에 따라 2등분해 보세요.',
    observation: '두 카드 모두 전체를 6칸으로 나누면, 반은 3칸이고 삼분의 이는 4칸이에요.',
  },
  {
    id: 'half-three-fifths',
    title: '열 칸으로 맞추기',
    left: [1, 2],
    right: [3, 5],
    prompt: '분모 2의 각 칸은 5등분하고, 분모 5의 각 칸은 2등분하여 두 카드의 한 칸 모양을 맞춰 보세요.',
    observation: '두 카드 모두 전체를 10칸으로 나누면, 반은 5칸이고 오분의 삼은 6칸이에요.',
  },
  {
    id: 'two-thirds-three-fourths',
    title: '열두 칸에서 비교하기',
    left: [2, 3],
    right: [3, 4],
    prompt: '전체가 3칸인 카드와 4칸인 카드를 모두 같은 크기의 작은 칸으로 바꾸어 보세요.',
    observation: '전체를 12칸으로 나누면 8칸과 9칸이라서 어느 쪽이 큰지 바로 보여요.',
  },
  {
    id: 'third-two-fifths',
    title: '서로소 분모 만나기',
    left: [1, 3],
    right: [2, 5],
    prompt: '분모 3의 각 칸은 5등분하고, 분모 5의 각 칸은 3등분하여 전체 칸 수를 같게 해 보세요.',
    observation: '3칸을 각각 5등분하고, 5칸을 각각 3등분하면 두 카드 모두 전체가 15칸이 돼요.',
  },
  {
    id: 'three-fourths-four-fifths',
    title: '스무 칸으로 맞추기',
    left: [3, 4],
    right: [4, 5],
    prompt: '분모 4의 각 칸은 5등분하고, 분모 5의 각 칸은 4등분하여 같은 모양의 작은 칸을 만들어 보세요.',
    observation: '두 카드 모두 전체를 20칸으로 나누면, 사분의 삼은 15칸이고 오분의 사는 16칸이에요.',
  },
  {
    id: 'two-fifths-five-sixths',
    title: '서른 칸으로 맞추기',
    left: [2, 5],
    right: [5, 6],
    prompt: '분모 5와 분모 6이 서로의 칸을 나누면 전체 칸 수가 어떻게 같아지는지 살펴보세요.',
    observation: '두 카드 모두 전체를 30칸으로 나누면, 오분의 이는 12칸이고 육분의 오는 25칸이에요.',
  },
  {
    id: 'five-sixths-four-sevenths',
    title: '마흔두 칸 탐사',
    left: [5, 6],
    right: [4, 7],
    prompt: '분모 6의 각 칸은 7등분하고, 분모 7의 각 칸은 6등분하여 같은 모양의 칸을 만들어 보세요.',
    observation: '같은 크기의 전체 42칸 중 35칸과 24칸을 비교하면 차이가 분명해요.',
  },
  {
    id: 'three-sevenths-five-eighths',
    title: '마지막 통분 탐구',
    left: [3, 7],
    right: [5, 8],
    prompt: '분모 7과 분모 8이 서로의 칸을 나누어 만드는 가장 작은 공통 칸을 찾아보세요.',
    observation: '두 카드 모두 전체를 56칸으로 나누면, 칠분의 삼은 24칸이고 팔분의 오는 35칸이에요.',
  },
])

export function greatestCommonDivisor(a, b) {
  let left = Math.abs(Math.trunc(Number(a) || 0))
  let right = Math.abs(Math.trunc(Number(b) || 0))
  while (right) {
    const remainder = left % right
    left = right
    right = remainder
  }
  return left || 1
}

export function leastCommonMultiple(a, b) {
  const left = Math.max(1, Math.abs(Math.trunc(Number(a) || 1)))
  const right = Math.max(1, Math.abs(Math.trunc(Number(b) || 1)))
  return (left * right) / greatestCommonDivisor(left, right)
}

function normalizeFraction(value) {
  const denominator = Math.max(2, Math.trunc(Number(value?.[1]) || 2))
  const numerator = Math.min(denominator - 1, Math.max(1, Math.trunc(Number(value?.[0]) || 1)))
  return { numerator, denominator }
}

export function buildCommonDenominatorPair(leftValue, rightValue) {
  const left = normalizeFraction(leftValue)
  const right = normalizeFraction(rightValue)
  const denominator = leastCommonMultiple(left.denominator, right.denominator)
  const leftFactor = denominator / left.denominator
  const rightFactor = denominator / right.denominator
  const leftNumerator = left.numerator * leftFactor
  const rightNumerator = right.numerator * rightFactor
  const comparison = leftNumerator === rightNumerator ? '=' : leftNumerator < rightNumerator ? '<' : '>'

  return {
    left: { ...left, factor: leftFactor, commonNumerator: leftNumerator },
    right: { ...right, factor: rightFactor, commonNumerator: rightNumerator },
    commonDenominator: denominator,
    comparison,
  }
}

export function buildCommonGrid(fraction, factor) {
  return Array.from({ length: fraction.denominator }, (_, column) => (
    Array.from({ length: factor }, (_, row) => ({
      id: `${column}-${row}`,
      column,
      row,
      shaded: column < fraction.numerator,
    }))
  )).flat()
}

export function validateCommonDenominatorAnswer(pair, answer = {}) {
  const leftNumerator = Number(answer.leftNumerator)
  const leftDenominator = Number(answer.leftDenominator)
  const rightNumerator = Number(answer.rightNumerator)
  const rightDenominator = Number(answer.rightDenominator)
  const checks = {
    leftNumerator: leftNumerator === pair.left.commonNumerator,
    leftDenominator: leftDenominator === pair.commonDenominator,
    rightNumerator: rightNumerator === pair.right.commonNumerator,
    rightDenominator: rightDenominator === pair.commonDenominator,
  }
  return { ...checks, correct: Object.values(checks).every(Boolean) }
}

export function validateComparison(pair, value) {
  return String(value || '') === pair.comparison
}

export function clampLensProgress(value) {
  return Math.min(1, Math.max(0, Number(value) || 0))
}
