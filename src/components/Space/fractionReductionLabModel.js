export const FRACTION_REDUCTION_MISSIONS = Object.freeze([
  { id: 'two-tenths', title: '첫 약분', fraction: [2, 10], suggestedFactor: 2, hint: '분자 2와 분모 10을 동시에 나눌 수 있는 수를 찾아 첫 약분을 완성해 보세요.' },
  { id: 'six-ninths', title: '공약수 찾기', fraction: [6, 9], suggestedFactor: 3, hint: '분자와 분모가 모두 나누어떨어지는 수를 찾아 같은 크기의 큰 방으로 바꾸어 보세요.' },
  { id: 'two-sevenths', title: '이미 가장 간단해요', fraction: [2, 7], suggestedFactor: null, layoutFactor: 1, hint: '분자 2와 분모 7을 동시에 나눌 수 있는 1보다 큰 수가 있는지 찾아보세요.' },
  { id: 'four-sixths', title: '한 번 더 간단히', fraction: [4, 6], suggestedFactor: 2, hint: '분자 4와 분모 6의 공약수를 찾아 기약분수까지 나아가 보세요.' },
  { id: 'eight-twelfths', title: '두 가지 길', fraction: [8, 12], suggestedFactor: 4, hint: '2와 4 중 어느 수로 시작해도 괜찮아요. 선택한 약분을 이어서 가장 간단한 분수를 만드세요.' },
  { id: 'ten-fifteenths', title: '5로 함께 나누기', fraction: [10, 15], suggestedFactor: 5, hint: '분자와 분모가 모두 5로 나누어지는지 빌딩과 계산으로 확인해 보세요.' },
  { id: 'twelve-eighteenths', title: '여러 공약수', fraction: [12, 18], suggestedFactor: 6, hint: '2, 3, 6 중 어느 공약수로 시작해도 맞아요. 한 단계씩 기약분수까지 가 보세요.' },
  { id: 'eighteen-twenty-fourths', title: '나만의 약분 경로', fraction: [18, 24], suggestedFactor: 6, hint: '여러 공약수 가운데 하나를 골라 약분하고, 필요하면 다음 약분을 이어 가세요.' },
  { id: 'three-eighths', title: '기약분수 찾기 Ⅰ', fraction: [3, 8], suggestedFactor: null, layoutFactor: 1, hint: '3과 8을 동시에 나눌 수 있는 1보다 큰 수가 없다면 그대로 기약분수예요.' },
  { id: 'fourteen-twenty-firsts', title: '7의 공약수', fraction: [14, 21], suggestedFactor: 7, hint: '14와 21을 동시에 나누는 수를 찾아 간단히 표현해 보세요.' },
  { id: 'fifteen-twenty-fifths', title: '5의 공약수', fraction: [15, 25], suggestedFactor: 5, hint: '색칠한 15칸과 전체 25칸을 같은 수로 나누어 보세요.' },
  { id: 'sixteen-twenty-fourths', title: '세 가지 약분 길', fraction: [16, 24], suggestedFactor: 8, hint: '2, 4, 8은 모두 공약수예요. 어느 길을 골라도 기약분수까지 계속 나아갈 수 있어요.' },
  { id: 'five-twelfths', title: '기약분수 찾기 Ⅱ', fraction: [5, 12], suggestedFactor: null, layoutFactor: 1, hint: '5와 12의 공약수를 살펴보고, 더 약분할 수 있는지 판단해 보세요.' },
  { id: 'twenty-one-twenty-eighths', title: '7로 줄이기', fraction: [21, 28], suggestedFactor: 7, hint: '21과 28을 동시에 나누어 정확한 기약분수를 만드세요.' },
  { id: 'twenty-four-thirty-sixths', title: '공약수가 많은 분수', fraction: [24, 36], suggestedFactor: 12, hint: '2, 3, 4, 6, 12 중 하나로 시작해도 좋아요. 여러 단계 약분도 직접 이어 보세요.' },
  { id: 'seven-twentieths', title: '기약분수 찾기 Ⅲ', fraction: [7, 20], suggestedFactor: null, layoutFactor: 1, hint: '7과 20을 함께 나눌 수 없다면 그 이유를 빌딩에서 확인해 보세요.' },
  { id: 'eighteen-thirtieths', title: '두 번 약분해도 좋아요', fraction: [18, 30], suggestedFactor: 6, hint: '작은 공약수로 여러 번 나누거나 큰 공약수로 한 번에 나누어 기약분수를 만드세요.' },
  { id: 'eight-fifteenths', title: '기약분수 찾기 Ⅳ', fraction: [8, 15], suggestedFactor: null, layoutFactor: 1, hint: '8과 15를 동시에 나누는 1보다 큰 수가 있는지 마지막까지 살펴보세요.' },
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

export function getCommonFactors(numerator, denominator) {
  const limit = Math.min(Math.abs(Math.trunc(Number(numerator) || 0)), Math.abs(Math.trunc(Number(denominator) || 0)))
  return Array.from({ length: Math.max(0, limit - 1) }, (_, index) => index + 2)
    .filter((factor) => numerator % factor === 0 && denominator % factor === 0)
}

export function isCommonFactor(numerator, denominator, factor) {
  const divisor = Math.trunc(Number(factor) || 0)
  return divisor > 1 && numerator % divisor === 0 && denominator % divisor === 0
}

export function buildFactorChoices(numerator, denominator) {
  const valid = getCommonFactors(numerator, denominator)
  const upper = Math.max(6, Math.min(9, denominator))
  const distractors = Array.from({ length: upper - 1 }, (_, index) => index + 2)
    .filter((factor) => !valid.includes(factor))
    .slice(0, Math.max(2, 5 - valid.length))
  return [...new Set([...valid, ...distractors])].sort((a, b) => a - b).slice(0, 6)
}

export function buildBundles(count, factor) {
  const safeCount = Math.max(0, Math.trunc(Number(count) || 0))
  const safeFactor = Math.max(1, Math.trunc(Number(factor) || 1))
  const completeGroupCount = Math.floor(safeCount / safeFactor)
  const groups = Array.from({ length: completeGroupCount }, (_, groupIndex) => (
    Array.from({ length: safeFactor }, (_, tokenIndex) => groupIndex * safeFactor + tokenIndex)
  ))
  const remainder = Array.from(
    { length: safeCount % safeFactor },
    (_, index) => completeGroupCount * safeFactor + index,
  )
  return { groups, remainder, complete: remainder.length === 0 }
}

export function reduceFraction(numerator, denominator, factor) {
  if (!isCommonFactor(numerator, denominator, factor)) return null
  return {
    numerator: numerator / factor,
    denominator: denominator / factor,
    factor,
    simplest: greatestCommonDivisor(numerator / factor, denominator / factor) === 1,
  }
}

export function validateReductionAnswer(numerator, denominator, factor, answer = {}) {
  const reduced = reduceFraction(numerator, denominator, factor)
  if (!reduced) return { numerator: false, denominator: false, correct: false }
  const checks = {
    numerator: Number(answer.numerator) === reduced.numerator,
    denominator: Number(answer.denominator) === reduced.denominator,
  }
  return { ...checks, correct: checks.numerator && checks.denominator }
}

export function getSimplestFraction(numerator, denominator) {
  const divisor = greatestCommonDivisor(numerator, denominator)
  return { numerator: numerator / divisor, denominator: denominator / divisor }
}
