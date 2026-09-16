export const DIVISION_ZONES = [
  { id: 'spark', title: '한 칸에서 시작', range: [0, 3], color: '#72f1d5' },
  { id: 'bridge', title: '두 자리 다리', range: [4, 7], color: '#75c7ff' },
  { id: 'tower', title: '세 자리 탐험', range: [8, 11], color: '#b6a4ff' },
  { id: 'gate', title: '두 자리 수로 나누기', range: [12, 15], color: '#ffbd70' },
  { id: 'orbit', title: '천의 자리 완주', range: [16, 19], color: '#ff8d9e' },
]

export const VERTICAL_DIVISION_PROBLEMS = [
  { dividend: 8, divisor: 2, title: '딱 나누어 보기', focus: '8 안에 2가 몇 번 들어가는지 찾아요.' },
  { dividend: 9, divisor: 4, title: '남는 수 발견', focus: '나누고 남은 수가 나머지예요.' },
  { dividend: 7, divisor: 3, title: '작은 나머지', focus: '나머지는 나누는 수보다 작아야 해요.' },
  { dividend: 6, divisor: 6, title: '한 번에 쏙', focus: '같은 수로 나누면 몫은 1이에요.' },
  { dividend: 42, divisor: 2, title: '두 자리 첫걸음', focus: '십의 자리부터 차례로 계산해요.' },
  { dividend: 84, divisor: 4, title: '내려오기 연습', focus: '앞 계산이 끝나면 다음 숫자를 내려요.' },
  { dividend: 65, divisor: 3, title: '내리고 남기기', focus: '내려온 수와 나머지를 합쳐 다음 수를 만들어요.' },
  { dividend: 96, divisor: 8, title: '두 자리 완주', focus: '몫의 자리와 계산 위치를 맞춰요.' },
  { dividend: 156, divisor: 3, title: '세 자리 출발', focus: '백의 자리부터 세 번 계산해요.' },
  { dividend: 408, divisor: 4, title: '몫의 0 지키기', focus: '나눌 수 없는 자리에는 몫 0을 꼭 써요.' },
  { dividend: 735, divisor: 5, title: '이어지는 나머지', focus: '나머지와 내려온 숫자를 이어 계산해요.' },
  { dividend: 987, divisor: 6, title: '세 자리 종합', focus: '몫과 나머지를 끝까지 정확히 구해요.' },
  { dividend: 144, divisor: 12, title: '두 자리 수로 나누기', focus: '12가 몇 번 들어가는지 곱셈으로 확인해요.' },
  { dividend: 325, divisor: 25, title: '큰 묶음 세기', focus: '25씩 몇 묶음인지 어림하고 확인해요.' },
  { dividend: 672, divisor: 21, title: '두 자리 몫 찾기', focus: '21의 곱셈을 떠올려 몫을 정해요.' },
  { dividend: 958, divisor: 32, title: '나머지까지 정확히', focus: '가장 가까우면서 넘지 않는 곱을 찾아요.' },
  { dividend: 1248, divisor: 12, title: '천의 자리 문 열기', focus: '앞의 수가 작으면 다음 자리까지 함께 봐요.' },
  { dividend: 2025, divisor: 25, title: '가운데 0 통과', focus: '몫 가운데 0이 들어가는 자리를 지켜요.' },
  { dividend: 3476, divisor: 28, title: '여러 번 내려오기', focus: '각 자리에서 같은 네 동작을 반복해요.' },
  { dividend: 5819, divisor: 43, title: '나눗셈 마스터', focus: '어림, 곱셈, 뺄셈, 내려오기를 스스로 연결해요.' },
]

export const DIVISION_ACTION_LABELS = {
  canDivide: '먼저 살펴보기',
  quotient: '몫 쓰기',
  multiply: '곱해 적기',
  subtract: '빼기',
  bringDown: '다음 숫자 내려오기',
}

const digitsOf = (value) => String(Math.max(0, Math.trunc(value))).split('').map(Number)
const PLACE_NAMES = ['일', '십', '백', '천', '만']

function placeNameFor(totalColumns, columnIndex) {
  return PLACE_NAMES[totalColumns - columnIndex - 1] || `${10 ** (totalColumns - columnIndex - 1)}`
}

export function buildVerticalDivision(problem) {
  const dividendDigits = digitsOf(problem.dividend)
  const quotientCells = Array(dividendDigits.length).fill(null)
  const cycles = []
  const steps = []
  let remainder = 0
  let started = false

  dividendDigits.forEach((digit, columnIndex) => {
    const partialDividend = remainder * 10 + digit
    if (!started && partialDividend < problem.divisor && columnIndex < dividendDigits.length - 1) {
      const nextDigit = dividendDigits[columnIndex + 1]
      const nextPartialDividend = partialDividend * 10 + nextDigit
      const nextPlaceName = placeNameFor(dividendDigits.length, columnIndex + 1)
      steps.push({
        id: `can-divide-${columnIndex}`,
        type: 'canDivide',
        expected: 'cannot',
        cycleIndex: 0,
        columnIndex,
        observedColumns: Array.from({ length: columnIndex + 1 }, (_, index) => index),
        partialDividend,
        placeName: placeNameFor(dividendDigits.length, columnIndex),
        sourceDigit: digit,
        nextDigit,
        nextColumnIndex: columnIndex + 1,
        nextPlaceName,
        nextPartialDividend,
        nextActualValue: nextPartialDividend * (10 ** (dividendDigits.length - columnIndex - 2)),
        canDivideAfterJoining: nextPartialDividend >= problem.divisor,
      })
      remainder = partialDividend
      return
    }

    started = true
    const quotientDigit = Math.floor(partialDividend / problem.divisor)
    const product = quotientDigit * problem.divisor
    const nextRemainder = partialDividend - product
    const cycleIndex = cycles.length
    const skipArithmetic = quotientDigit === 0
    quotientCells[columnIndex] = quotientDigit
    const cycle = {
      cycleIndex,
      columnIndex,
      placeName: placeNameFor(dividendDigits.length, columnIndex),
      partialDividend,
      quotientDigit,
      product,
      skipArithmetic,
      remainderBefore: remainder,
      remainderAfter: nextRemainder,
      sourceDigit: digit,
      nextDigit: dividendDigits[columnIndex + 1] ?? null,
      nextColumnIndex: columnIndex + 1 < dividendDigits.length ? columnIndex + 1 : null,
      combinedAfterBringDown: columnIndex + 1 < dividendDigits.length
        ? nextRemainder * 10 + dividendDigits[columnIndex + 1]
        : null,
    }
    cycles.push(cycle)

    steps.push({
      id: `cycle-${cycleIndex}-quotient`, type: 'quotient', expected: quotientDigit, ...cycle,
    })
    if (!skipArithmetic) {
      steps.push({
        id: `cycle-${cycleIndex}-multiply`, type: 'multiply', expected: product, ...cycle,
      })
      steps.push({
        id: `cycle-${cycleIndex}-subtract`, type: 'subtract', expected: nextRemainder, ...cycle,
      })
    }
    if (cycle.nextDigit !== null) {
      steps.push({
        id: `cycle-${cycleIndex}-bring-down`, type: 'bringDown', expected: cycle.nextDigit, ...cycle,
      })
    }
    remainder = nextRemainder
  })

  const quotient = Math.floor(problem.dividend / problem.divisor)
  return {
    ...problem,
    dividendDigits,
    quotientCells,
    quotient,
    remainder,
    cycles,
    steps: steps.map((step, index) => ({ ...step, index })),
  }
}

export function validateDivisionStep(step, value) {
  const normalized = String(value ?? '').trim()
  if (step.type === 'canDivide') return normalized === step.expected
  return normalized !== '' && Number(normalized) === step.expected
}

export function buildDivisionBoardState(mission, currentStepIndex) {
  const quotientCells = Array(mission.dividendDigits.length).fill('')
  const cycleStates = mission.cycles.map((cycle) => ({
    ...cycle,
    quotient: '',
    product: '',
    remainder: '',
    broughtDigit: '',
    combined: '',
  }))

  mission.steps.forEach((step, index) => {
    if (index >= currentStepIndex) return
    const cycle = cycleStates[step.cycleIndex]
    if (step.type === 'quotient') {
      quotientCells[step.columnIndex] = String(step.expected)
      cycle.quotient = String(step.expected)
    } else if (step.type === 'multiply') {
      cycle.product = String(step.expected)
    } else if (step.type === 'subtract') {
      cycle.remainder = String(step.expected)
    } else if (step.type === 'bringDown') {
      cycle.broughtDigit = String(step.expected)
      cycle.combined = String(step.combinedAfterBringDown)
    }
  })

  return { quotientCells, cycleStates }
}

export function getDivisionStepCopy(step, attempts = 0, divisor) {
  if (step.type === 'canDivide') {
    const firstLook = step.columnIndex === 0
      ? `맨 왼쪽 ${step.placeName}의 자리 수 ${step.partialDividend}부터 살펴봐요.`
      : `앞에서 함께 본 수 ${step.partialDividend}를 다시 살펴봐요.`
    const joinedPlaces = step.columnIndex === 0
      ? `${step.placeName}의 자리 ${step.sourceDigit}과 ${step.nextPlaceName}의 자리 ${step.nextDigit}`
      : `그다음 ${step.nextPlaceName}의 자리 ${step.nextDigit}까지`
    const nextMove = step.canDivideAfterJoining
      ? `이제 ${step.nextPartialDividend}로 ${divisor}짜리 묶음을 만들 수 있으니, 몫은 ${step.nextPlaceName}의 자리부터 써요.`
      : `그래도 ${step.nextPartialDividend}은 ${divisor}보다 작아요. 다음 자리까지 한 번 더 함께 볼게요.`
    return {
      title: '먼저 나눌 수 있을까?',
      equation: `${step.partialDividend} 안에 ${divisor}?`,
      instruction: `${firstLook} ${step.partialDividend}로 ${divisor}짜리 묶음을 한 개라도 만들 수 있을까요?`,
      hint: attempts >= 1
        ? `크기를 비교하면 ${step.partialDividend} < ${divisor}예요. 그래서 ${divisor}짜리 묶음을 하나도 만들 수 없어요.`
        : '한 묶음이라도 만들 수 있는지 크기를 비교해 보세요.',
      success: `맞아요! ${step.partialDividend}만으로는 ${divisor}짜리 묶음을 하나도 만들 수 없어요. 그래서 ${joinedPlaces}를 함께 보면 ${step.nextPartialDividend}개의 ${step.nextPlaceName}, 즉 ${step.nextActualValue}이에요. ${nextMove}`,
    }
  }
  if (step.type === 'quotient') {
    const numberAtPlace = step.partialDividend === step.sourceDigit
      ? `${step.placeName}의 자리 수 ${step.partialDividend}`
      : `${step.placeName}의 자리까지 이어 만든 수 ${step.partialDividend}`
    const hint = attempts >= 2
      ? `${step.partialDividend} 안에 ${divisor}는 ${step.expected}번 들어가요. 몫 ${step.expected}을 ${step.placeName}의 자리 위 칸에 써요.`
      : `${divisor} × 몇이 ${step.partialDividend}보다 크지 않으면서 가장 가까울까요?`
    return {
      title: '몫 쓰기',
      equation: `${step.partialDividend} ÷ ${divisor}`,
      instruction: `지금은 ${numberAtPlace}를 나누고 있어요. ${divisor}씩 몇 묶음 들어가는지 구한 몫은 반드시 ${step.placeName}의 자리 위 칸에 써요.`,
      hint,
    }
  }
  if (step.type === 'multiply') {
    return {
      title: '곱해 적기',
      equation: `${divisor} × ${step.quotientDigit}`,
      instruction: '방금 쓴 몫과 나누는 수를 곱해, 지금 계산하는 수 바로 아래에 적어요.',
      hint: attempts >= 2
        ? `${divisor} × ${step.quotientDigit} = ${step.expected}. 아래 곱한 수 자리에 ${step.expected}을 써요.`
        : `나누는 수 ${divisor}와 방금 쓴 몫을 곱해 보세요.`,
    }
  }
  if (step.type === 'subtract') {
    return {
      title: '빼기',
      equation: `${step.partialDividend} − ${step.product}`,
      instruction: '지금 계산한 수에서 방금 곱해 적은 수를 빼요. 남은 수가 다음 계산의 출발점이에요.',
      hint: attempts >= 2
        ? `${step.partialDividend} − ${step.product} = ${step.expected}. 빼기 선 아래에 ${step.expected}을 써요.`
        : `${step.partialDividend}에서 ${step.product}를 빼면 얼마가 남을까요?`,
    }
  }
  if (step.skipArithmetic) {
    if (step.partialDividend > 0) {
      return {
        title: `남은 수 ${step.partialDividend}, 다음 숫자 내려오기`,
        equation: `${step.partialDividend} 옆으로 ${step.nextDigit} 내려오기`,
        instruction: `몫에 0을 썼으니 곱하기와 빼기는 건너뛰어도 돼요. 하지만 남아 있는 수 ${step.partialDividend}도 계산에 꼭 필요해요. 지우지 말고, 다음 자리 숫자 ${step.nextDigit}을 오른쪽에 내려 ${step.combinedAfterBringDown}을 만들어요.`,
        hint: attempts >= 2
          ? `남은 수 ${step.partialDividend} 그대로, 그 오른쪽에 ${step.nextDigit}을 내려 ${step.combinedAfterBringDown}을 만들어요.`
          : `남아 있는 ${step.partialDividend} 옆에 다음 숫자를 이어 보세요.`,
      }
    }
    return {
      title: '0은 보내고 다음 숫자 내려오기',
      equation: `0은 스르르, ${step.nextDigit}은 아래로`,
      instruction: `몫에 0을 썼으니 0을 곱하고 다시 빼는 과정은 건너뛰어도 돼요. 계산 줄의 0은 스르르 보내고, 다음 자리 숫자 ${step.nextDigit}을 바로 내려요.`,
      hint: attempts >= 2
        ? `곱하기와 빼기는 하지 않아요. 위에 남은 다음 숫자 ${step.nextDigit}을 그대로 내려요.`
        : `0은 그대로 두어도 남는 것이 없어요. 다음 숫자를 찾아보세요.`,
    }
  }
  return {
    title: '다음 숫자 내려오기',
    equation: `${step.remainderAfter} 옆으로 ${step.nextDigit} 내려오기`,
    instruction: '위에 남아 있는 다음 자리의 숫자를 화살표를 따라 바로 아래 제자리로 내려요.',
    hint: attempts >= 2
      ? `내릴 숫자는 ${step.nextDigit}예요. 내려오면 다음에 계산할 수는 ${step.combinedAfterBringDown}이 돼요.`
      : `나누어지는 수의 다음 자리 숫자를 그대로 찾아보세요.`,
  }
}

export function getProblemZone(index) {
  return DIVISION_ZONES.find((zone) => index >= zone.range[0] && index <= zone.range[1]) || DIVISION_ZONES[0]
}
