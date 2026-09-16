export const VERTICAL_MULTIPLICATION_PROBLEMS = [
  { a: 123, b: 214, title: '자리 맞추기', focus: '각 숫자가 들어갈 자리를 익혀요.' },
  { a: 206, b: 132, title: '0도 중요한 자리', focus: '0이 있는 수도 한 자리씩 차근차근 계산해요.' },
  { a: 347, b: 256, title: '올림 첫 도전', focus: '곱셈 올림을 빠짐없이 연결해요.' },
  { a: 408, b: 307, title: '0을 건너는 법', focus: '가운데 0이 있어도 자리를 지켜요.' },
  { a: 519, b: 243, title: '세 줄 조립', focus: '일·십·백의 자리로 곱한 세 줄을 모두 만들어요.' },
  { a: 672, b: 418, title: '연속 올림', focus: '이어지는 올림을 차분히 처리해요.' },
  { a: 735, b: 609, title: '빈 자리 지키기', focus: '0을 곱한 줄에서도 자리를 정확히 지켜요.' },
  { a: 864, b: 527, title: '큰 수 더하기', focus: '곱해서 만든 세 줄을 세로로 정확히 더해요.' },
  { a: 903, b: 746, title: '복합 자리 도전', focus: '0과 올림이 섞인 계산을 완성해요.' },
  { a: 987, b: 654, title: '마스터 미션', focus: '모든 절차를 스스로 연결해요.' },
]

export const PLACE_LABELS = ['일', '십', '백', '천', '만', '십만']

export function digitsLeastFirst(value, width = 3) {
  const digits = String(Math.max(0, Math.trunc(value)))
    .split('')
    .reverse()
    .map(Number)
  while (digits.length < width) digits.push(0)
  return digits
}

export function buildVerticalMultiplication(problem) {
  const multiplicandDigits = digitsLeastFirst(problem.a, 3)
  const multiplierDigits = digitsLeastFirst(problem.b, 3)
  const partialRows = multiplierDigits.map((digit, rowIndex) => ({
    digit,
    place: PLACE_LABELS[rowIndex],
    value: problem.a * digit * (10 ** rowIndex),
    rawValue: problem.a * digit,
  }))

  const partialSteps = []
  multiplierDigits.forEach((multiplierDigit, rowIndex) => {
    let carry = 0
    multiplicandDigits.forEach((multiplicandDigit, columnIndex) => {
      const incomingCarry = carry
      const total = multiplicandDigit * multiplierDigit + incomingCarry
      const isLastColumn = columnIndex === multiplicandDigits.length - 1
      const writeValue = isLastColumn ? total : total % 10
      const carryOut = isLastColumn ? null : Math.floor(total / 10)

      partialSteps.push({
        id: `partial-${rowIndex}-${columnIndex}`,
        type: 'partial',
        rowIndex,
        columnIndex,
        targetColumn: rowIndex + columnIndex,
        multiplicandDigit,
        multiplierDigit,
        incomingCarry,
        total,
        writeValue,
        carryOut,
        isLastColumn,
        place: PLACE_LABELS[rowIndex],
        multiplicand: problem.a,
        placeMultiplier: multiplierDigit * (10 ** rowIndex),
      })
      carry = carryOut || 0
    })
  })

  const product = problem.a * problem.b
  const productDigits = digitsLeastFirst(product, String(product).length)
  const additionSteps = []
  let carry = 0

  productDigits.forEach((productDigit, columnIndex) => {
    const rowDigits = partialRows.map((row) => digitsLeastFirst(row.value, 6)[columnIndex] || 0)
    const incomingCarry = carry
    const total = rowDigits.reduce((sum, digit) => sum + digit, incomingCarry)
    const isLastColumn = columnIndex === productDigits.length - 1
    const writeValue = isLastColumn ? total : total % 10
    const carryOut = isLastColumn ? null : Math.floor(total / 10)

    additionSteps.push({
      id: `addition-${columnIndex}`,
      type: 'addition',
      columnIndex,
      targetColumn: columnIndex,
      rowDigits,
      incomingCarry,
      total,
      writeValue,
      carryOut,
      isLastColumn,
      productDigit,
    })
    carry = carryOut || 0
  })

  const steps = [...partialSteps, ...additionSteps].map((step, index) => ({ ...step, index }))
  return { ...problem, product, partialRows, steps, partialStepCount: partialSteps.length }
}

export function validateStep(step, writeValue, carryValue) {
  const normalizedWrite = String(writeValue ?? '').trim()
  const normalizedCarry = String(carryValue ?? '').trim()
  const writeCorrect = normalizedWrite !== '' && Number(normalizedWrite) === step.writeValue
  const carryCorrect = step.carryOut === null || step.carryOut === 0
    ? true
    : normalizedCarry !== '' && Number(normalizedCarry) === step.carryOut

  return { correct: writeCorrect && carryCorrect, writeCorrect, carryCorrect }
}

function putValueInCells(cells, value, leastSignificantColumn) {
  String(value).split('').reverse().forEach((digit, offset) => {
    const index = cells.length - 1 - (leastSignificantColumn + offset)
    if (index >= 0) cells[index] = digit
  })
}

export function buildBoardState(mission, currentStepIndex) {
  const width = 6
  const partialCells = mission.partialRows.map(() => Array(width).fill(''))
  const resultCells = Array(width).fill('')

  mission.partialRows.forEach((_, rowIndex) => {
    const rowStart = rowIndex * 3
    if (currentStepIndex >= rowStart) {
      for (let shift = 0; shift < rowIndex; shift += 1) {
        partialCells[rowIndex][width - 1 - shift] = '0'
      }
    }
  })

  mission.steps.forEach((step, index) => {
    if (index >= currentStepIndex) return
    if (step.type === 'partial') {
      putValueInCells(partialCells[step.rowIndex], step.writeValue, step.targetColumn)
    } else {
      putValueInCells(resultCells, step.writeValue, step.targetColumn)
    }
  })

  return { partialCells, resultCells }
}

export function getStepCopy(step, attempts = 0) {
  if (step.type === 'partial') {
    const carryText = step.incomingCarry > 0 ? `, 올림 ${step.incomingCarry}을 더하면` : '은'
    const equation = `${step.multiplicandDigit} × ${step.multiplierDigit}${step.incomingCarry > 0 ? ` + ${step.incomingCarry}` : ''}`
    const instruction = step.isLastColumn
      ? '이 줄의 마지막 계산이에요. 나온 수를 남김없이 아래 칸에 써요.'
      : step.carryOut > 0
        ? '계산 결과의 일의 자리는 아래에 쓰고, 십의 자리는 앞자리로 올려요.'
        : '계산 결과를 아래 칸에 써요. 이번에는 올림이 없어요.'
    const hint = attempts >= 2
      ? `${equation} = ${step.total}. 아래에는 ${step.writeValue}${step.carryOut > 0 ? `, 앞자리 위에는 ${step.carryOut}` : ''}을 써요.`
      : `${step.multiplicandDigit} × ${step.multiplierDigit}${carryText} 얼마일까요? ${instruction}`
    return {
      eyebrow: `${step.multiplicand} × ${step.placeMultiplier}에서 ${PLACE_LABELS[step.columnIndex]}의 자리 계산`,
      equation,
      instruction,
      hint,
    }
  }

  const addends = [...step.rowDigits, ...(step.incomingCarry ? [step.incomingCarry] : [])]
  const equation = addends.join(' + ')
  const instruction = step.isLastColumn
    ? '마지막 열이에요. 나온 수를 남김없이 결과 칸에 써요.'
    : step.carryOut > 0
      ? '더한 결과의 일의 자리는 아래에 쓰고, 십의 자리는 앞자리로 올려요.'
      : '더한 결과를 아래 칸에 써요. 이번에는 올림이 없어요.'
  const hint = attempts >= 2
    ? `${equation} = ${step.total}. 결과에는 ${step.writeValue}${step.carryOut > 0 ? `, 앞자리 위에는 ${step.carryOut}` : ''}을 써요.`
    : `${PLACE_LABELS[step.columnIndex]}의 자리에 세로로 놓인 수와 올림을 모두 더해요. ${instruction}`
  return {
    eyebrow: `${PLACE_LABELS[step.columnIndex]}의 자리끼리 더하기`,
    equation,
    instruction,
    hint,
  }
}
