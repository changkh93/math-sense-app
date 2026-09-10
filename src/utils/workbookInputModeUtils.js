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

// Answer metadata controls grading/display, never which characters a learner may enter.
export const getMathKeypadOperatorKeys = () => [
  { value: '÷', label: '÷' },
  { value: '×', label: '×' },
  { value: '-', label: '−' },
  { value: '+', label: '+' },
  { value: '.', label: '.' },
  { value: '%', label: '%' },
  { value: '=', label: '=' },
];

export const MATH_KEYPAD_EXTRA_GROUPS = [
  { label: '분수·괄호', keys: [
    { value: '/', label: '분수선' },
    { value: ' ', label: '띄어쓰기' },
    { value: '(', label: '(' },
    { value: ')', label: ')' },
    { value: ':', label: ':' },
  ] },
  { label: '문자·기호', keys: ['x', 'y', 'π', '°', '²', '³', '^', '√', '<', '>', '≤', '≥', '≠', '±', ',', '[', ']', '{', '}', '∞'].map(value => ({ value, label: value })) },
];

export const WORKBOOK_ANSWER_MAX_LENGTH = 80;

// Preserve selection semantics for touch buttons just like typing in a text input.
export const editMathInput = (value, start, end, inserted, maxLength = WORKBOOK_ANSWER_MAX_LENGTH) => {
  const text = String(value ?? '');
  const from = Math.max(0, Math.min(start ?? text.length, text.length));
  const to = Math.max(from, Math.min(end ?? from, text.length));
  const available = Math.max(0, maxLength - (text.length - (to - from)));
  const addition = String(inserted).slice(0, available);
  return { value: text.slice(0, from) + addition + text.slice(to), cursor: from + addition.length };
};

export const deleteMathInput = (value, start, end) => {
  const text = String(value ?? '');
  const from = start ?? text.length;
  const to = end ?? from;
  const previousCharacter = Array.from(text.slice(0, from)).at(-1) || '';
  return editMathInput(text, from === to ? from - previousCharacter.length : from, to, '');
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
