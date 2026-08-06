export const MATH_KEYPAD_NUMBER_KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0'];

export const MATH_KEYPAD_GRID_AREAS = {
  '÷': 'divide',
  '×': 'multiply',
  '-': 'subtract',
  '+': 'add',
  '.': 'decimal',
  '%': 'percent',
  '=': 'equal',
  '7': 'seven',
  '8': 'eight',
  '9': 'nine',
  '4': 'four',
  '5': 'five',
  '6': 'six',
  '1': 'one',
  '2': 'two',
  '3': 'three',
  '0': 'zero',
};

export const getMathKeypadOperatorKeys = (inputMode = 'expression') => {
  if (inputMode === 'fraction') return [{ value: '/', label: '분수선' }, { value: '-', label: '−' }];
  if (inputMode === 'mixed-number') {
    return [{ value: ' ', label: '대분수 칸' }, { value: '/', label: '분수선' }, { value: '-', label: '−' }];
  }
  if (inputMode === 'decimal') return [{ value: '.', label: '.' }, { value: '-', label: '−' }];
  if (inputMode === 'integer') return [{ value: '-', label: '−' }];
  return [
    { value: '÷', label: '÷' },
    { value: '×', label: '×' },
    { value: '-', label: '−' },
    { value: '+', label: '+' },
    { value: '.', label: '.' },
    { value: '%', label: '%' },
    { value: '=', label: '=' },
  ];
};

const isIntegerAnswer = (value) => /^-?\d+$/.test(String(value ?? '').trim());

export const resolveWorkbookInputMode = (element) => {
  const configuredMode = element?.inputMode || 'expression';
  if (configuredMode !== 'integer') return configuredMode;

  const candidateAnswers = [element?.answer, ...(Array.isArray(element?.acceptedAnswers) ? element.acceptedAnswers : [])]
    .filter(value => value !== undefined && value !== null && String(value).trim() !== '');

  return candidateAnswers.length > 0 && candidateAnswers.some(value => !isIntegerAnswer(value))
    ? 'expression'
    : configuredMode;
};
