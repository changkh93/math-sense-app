const OPERATOR_REPLACEMENTS = [
  [/[−–—]/g, '-'],
  [/[∙·*]/g, '×'],
  [/[／⁄]/g, '/'],
];

const normalizeOperators = (value) => OPERATOR_REPLACEMENTS.reduce(
  (text, [pattern, replacement]) => text.replace(pattern, replacement),
  String(value ?? '').trim(),
);

const gcd = (a, b) => {
  let left = Math.abs(a);
  let right = Math.abs(b);
  while (right) [left, right] = [right, left % right];
  return left || 1;
};

const rational = (numerator, denominator = 1) => {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator === 0) return null;
  const sign = denominator < 0 ? -1 : 1;
  const divisor = gcd(numerator, denominator);
  return {
    numerator: sign * (numerator / divisor),
    denominator: Math.abs(denominator / divisor),
  };
};

const parseDecimal = (text) => {
  const match = text.match(/^([+-]?)(\d+)(?:\.(\d+))?$/);
  if (!match) return null;
  const decimals = match[3] || '';
  const scale = 10 ** decimals.length;
  const unsigned = Number(match[2]) * scale + Number(decimals || 0);
  return rational((match[1] === '-' ? -1 : 1) * unsigned, scale);
};

const stripMathWrappers = (value) => normalizeOperators(value)
  .replace(/^\$|\$$/g, '')
  .replace(/\\d?frac/g, '\\frac')
  .trim();

export const parseElementaryRational = (value) => {
  const text = stripMathWrappers(value);
  if (!text) return null;

  let match = text.match(/^([+-]?\d+)\s*\\frac\{(\d+)\}\{(\d+)\}$/);
  if (match) {
    const whole = Number(match[1]);
    const numerator = Number(match[2]);
    const denominator = Number(match[3]);
    const sign = whole < 0 ? -1 : 1;
    return rational(whole * denominator + sign * numerator, denominator);
  }

  match = text.match(/^\\frac\{([+-]?\d+)\}\{([+-]?\d+)\}$/);
  if (match) return rational(Number(match[1]), Number(match[2]));

  match = text.match(/^([+-]?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (match) {
    const whole = Number(match[1]);
    const numerator = Number(match[2]);
    const denominator = Number(match[3]);
    const sign = whole < 0 ? -1 : 1;
    return rational(whole * denominator + sign * numerator, denominator);
  }

  match = text.match(/^([+-]?\d+)\((\d+)\s*\/\s*(\d+)\)$/);
  if (match) {
    const whole = Number(match[1]);
    const numerator = Number(match[2]);
    const denominator = Number(match[3]);
    const sign = whole < 0 ? -1 : 1;
    return rational(whole * denominator + sign * numerator, denominator);
  }

  match = text.match(/^([+-]?\d+)\s*\/\s*([+-]?\d+)$/);
  if (match) return rational(Number(match[1]), Number(match[2]));

  return parseDecimal(text);
};

export const normalizeElementaryAnswer = (value) => normalizeOperators(value)
  .replace(/\s+/g, '')
  .replace(/,/g, '')
  .replace(/\\div/g, '÷')
  .replace(/\\times/g, '×');

export const areElementaryAnswersEquivalent = (userAnswer, expectedAnswer, options = {}) => {
  const inputMode = String(options.inputMode || '').trim();
  const answerKind = String(options.answerSpec?.kind || '').trim();
  const numericMode = ['integer', 'decimal', 'fraction', 'mixed-number'].includes(inputMode)
    || ['number', 'numeric', 'fraction', 'mixed-number'].includes(answerKind);

  if (numericMode) {
    const userRational = parseElementaryRational(userAnswer);
    const expectedRational = parseElementaryRational(expectedAnswer);
    if (userRational && expectedRational) {
      return userRational.numerator === expectedRational.numerator
        && userRational.denominator === expectedRational.denominator;
    }
  }

  return normalizeElementaryAnswer(userAnswer) === normalizeElementaryAnswer(expectedAnswer);
};

export const splitFractionDisplayValue = (value, inputMode = '') => {
  const text = normalizeOperators(value);
  if (!text) return null;

  if (inputMode === 'mixed-number') {
    const mixed = text.match(/^([+-]?\d+)\s+(\d*)\/(\d*)$/);
    if (mixed) return { whole: mixed[1], numerator: mixed[2], denominator: mixed[3] };
  }

  const fraction = text.match(/^([+-]?\d*)\/(\d*)$/);
  if (fraction) return { whole: '', numerator: fraction[1], denominator: fraction[2] };
  return null;
};
