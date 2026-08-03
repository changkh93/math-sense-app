// JSON escape와 첫 글자가 겹치는 LaTeX 명령을 구분할 때 사용한다.
// 특히 b/f/n/r/t로 시작하는 명령은 JSON.parse가 제어문자로
// 바꾸기 때문에 목록을 통해 정상 \nNext 같은 줄바꿈과 구분한다.
const LATEX_COMMANDS = new Set([
  'alpha', 'approx', 'arccos', 'arcsin', 'arctan',
  'backslash', 'bar', 'begin', 'beta', 'bf', 'big', 'Big', 'bigg', 'Bigg', 'bigl', 'bigr', 'binom',
  'bmod', 'boldsymbol', 'bot', 'boxed', 'brace', 'brack', 'bullet',
  'cdot', 'cdots', 'circ', 'cos', 'cosh', 'cot', 'coth', 'csc',
  'Delta', 'delta', 'det', 'div', 'end', 'epsilon', 'equiv', 'exp', 'fbox', 'forall', 'frac',
  'Gamma', 'gamma', 'gcd', 'ge', 'geq', 'gg', 'hat', 'hbar', 'hom', 'implies', 'in', 'infty', 'int',
  'lambda', 'ldots', 'le', 'left', 'Leftarrow', 'leftrightarrow', 'leq', 'lg', 'lim', 'ln', 'log', 'lt',
  'max', 'mbox', 'min', 'nabla', 'natural', 'ne', 'neg', 'neq', 'nexists', 'ngeq', 'ngtr', 'nleq',
  'nless', 'nmid', 'not', 'notin', 'nparallel', 'nprec', 'nRightarrow', 'nLeftarrow', 'nleftrightarrow',
  'nsubseteq', 'nsim', 'nsimeq', 'nu', 'nvdash', 'nvDash', 'Omega', 'omega', 'overline', 'parallel',
  'partial', 'perp', 'phi', 'pi', 'pm', 'prod', 'psi', 'qquad', 'quad', 'rangle', 'rbrace', 'rceil',
  'rfloor', 'rho', 'right', 'Rightarrow', 'rm', 'sec', 'sigma', 'sin', 'sinh',
  'sqrt', 'subset', 'subseteq', 'sum', 'supset', 'supseteq', 'tan', 'tanh', 'tau', 'text', 'textbf',
  'textit', 'theta', 'tilde', 'times', 'to', 'top', 'triangle', 'underline', 'vec', 'vee', 'vert', 'wedge', 'xi',
  'xleftarrow', 'xrightarrow', 'zeta'
])

export function isKnownLatexCommand(command) {
  return LATEX_COMMANDS.has(command)
}

const CONTROL_PREFIXES = new Map([
  ['\b', 'b'],
  ['\f', 'f'],
  ['\n', 'n'],
  ['\r', 'r'],
  ['\t', 't'],
  ['\v', 'v']
])

/**
 * JSON.parse 후 제어문자로 변한 LaTeX 명령만 복원한다.
 * 일반 TAB은 보존하고 CRLF/단독 CR은 줄바꿈으로 정규화한다.
 */
export function repairLatexControlChars(text, { assumeMath = false } = {}) {
  if (!text || typeof text !== 'string') return text

  const normalized = text.replace(/\r\n/g, '\n')
  let result = ''
  let inMath = assumeMath

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i]
    if (!assumeMath && ch === '$') {
      const delimiterLength = normalized[i + 1] === '$' ? 2 : 1
      result += normalized.slice(i, i + delimiterLength)
      i += delimiterLength - 1
      inMath = !inMath
      continue
    }

    const prefix = CONTROL_PREFIXES.get(ch)
    if (!prefix) {
      result += ch
      continue
    }
    if (!inMath) {
      result += ch === '\r' ? '\n' : ch
      continue
    }

    const tail = normalized.slice(i + 1).match(/^[A-Za-z]+/)?.[0] || ''
    const command = prefix + tail
    if (tail && isKnownLatexCommand(command)) {
      result += `\\${command}`
      i += tail.length
      continue
    }

    result += ch === '\r' ? '\n' : ch
  }

  return result
}
