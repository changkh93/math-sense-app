const PYTHON_DUNDER_NAMES = new Set([
  'abs',
  'add',
  'aiter',
  'and',
  'anext',
  'await',
  'bool',
  'bytes',
  'call',
  'contains',
  'del',
  'delattr',
  'delete',
  'dict',
  'dir',
  'divmod',
  'enter',
  'eq',
  'exit',
  'float',
  'floordiv',
  'format',
  'ge',
  'get',
  'getattr',
  'getattribute',
  'getitem',
  'gt',
  'hash',
  'iadd',
  'init',
  'init_subclass',
  'int',
  'invert',
  'iter',
  'le',
  'len',
  'lt',
  'missing',
  'mul',
  'ne',
  'neg',
  'new',
  'next',
  'or',
  'pos',
  'pow',
  'radd',
  'repr',
  'reversed',
  'rmul',
  'set',
  'set_name',
  'setattr',
  'setitem',
  'slots',
  'str',
  'sub',
  'truediv',
]);

const PYTHON_CODE_MARKDOWN_TOKENS = new Set([
  'False',
  'None',
  'True',
  'and',
  'as',
  'assert',
  'async',
  'await',
  'break',
  'class',
  'continue',
  'def',
  'del',
  'elif',
  'else',
  'except',
  'finally',
  'for',
  'from',
  'global',
  'if',
  'import',
  'in',
  'is',
  'lambda',
  'nonlocal',
  'not',
  'or',
  'pass',
  'raise',
  'return',
  'self',
  'super',
  'try',
  'while',
  'with',
  'yield',
]);

export function repairPythonDunderMarkdown(text = '') {
  return String(text || '').replace(/\*\*([A-Za-z_][A-Za-z0-9_]*)\*\*/g, (match, name) => {
    return PYTHON_DUNDER_NAMES.has(name) ? `__${name}__` : match;
  });
}

export function repairPythonCodeMarkdownArtifacts(text = '') {
  return repairPythonDunderMarkdown(text).replace(/\*\*([A-Za-z_][A-Za-z0-9_]*)\*\*/g, (match, token) => {
    return PYTHON_CODE_MARKDOWN_TOKENS.has(token) ? token : match;
  });
}

export function sanitizeCodeTraceExercise(exercise = {}) {
  return {
    ...exercise,
    concepts: Array.isArray(exercise.concepts)
      ? exercise.concepts.map(item => repairPythonDunderMarkdown(item))
      : [],
    prompt: repairPythonDunderMarkdown(exercise.prompt || ''),
    answerCode: repairPythonCodeMarkdownArtifacts(exercise.answerCode || ''),
    hints: Array.isArray(exercise.hints)
      ? exercise.hints.map(item => repairPythonDunderMarkdown(item))
      : [],
    commonMistakes: Array.isArray(exercise.commonMistakes)
      ? exercise.commonMistakes.map(item => ({
          ...item,
          message: repairPythonDunderMarkdown(item?.message || ''),
        }))
      : [],
  };
}
