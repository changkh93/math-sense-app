const LATEX_COMMAND = /\\[a-zA-Z]+/g;
const FORMATTING_MARKS = /[`*_~#$^{}\\|]/g;
const WHITESPACE = /\s/g;

export function getOptionText(option) {
  if (typeof option === 'string') return option;
  return typeof option?.text === 'string' ? option.text : '';
}
export function getOptionVisibleLength(option) {
  return Array.from(
    getOptionText(option)
      .replace(LATEX_COMMAND, '')
      .replace(FORMATTING_MARKS, '')
      .replace(WHITESPACE, '')
  ).length;
}

export function auditQuizOptionLengths(options = []) {
  const normalized = Array.isArray(options) ? options : [];
  const rows = normalized.map((option, index) => ({
    index,
    text: getOptionText(option),
    length: getOptionVisibleLength(option),
    isCorrect: typeof option === 'object' && option?.isCorrect === true
  }));
  const correctRows = rows.filter((row) => row.isCorrect);

  if (rows.length < 2 || correctRows.length !== 1) {
    return {
      analyzable: false,
      suspicious: false,
      rows,
      reason: correctRows.length !== 1 ? 'single-correct-answer-required' : 'insufficient-options'
    };
  }

  const correct = correctRows[0];
  const incorrect = rows.filter((row) => !row.isCorrect);
  const longestIncorrectLength = Math.max(...incorrect.map((row) => row.length));
  const averageIncorrectLength = incorrect.reduce((sum, row) => sum + row.length, 0) / incorrect.length;
  const gap = correct.length - longestIncorrectLength;
  const ratio = averageIncorrectLength > 0 ? correct.length / averageIncorrectLength : Infinity;
  const correctIsUniqueLongest = gap > 0;

  // A few characters of difference is natural. Flag only a length cue large enough
  // to be useful to a test-wise student.
  const suspicious = correctIsUniqueLongest && gap >= 4 && ratio >= 1.35;

  return {
    analyzable: true,
    suspicious,
    rows,
    correctIndex: correct.index,
    correctLength: correct.length,
    longestIncorrectLength,
    averageIncorrectLength,
    gap,
    ratio,
    correctIsUniqueLongest
  };
}
