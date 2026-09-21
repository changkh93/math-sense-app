// Bounded evidence for beginner mistakes. Never execute code or infer arbitrary
// objects from their variable names. Unknown scopes/rebindings fail closed.
const identifier = /^[\p{L}_][\p{L}\p{N}_]*$/u
const builtins = ['print', 'input', 'int', 'float', 'str', 'len', 'range', 'list', 'dict', 'set', 'tuple', 'sum', 'max', 'min', 'abs', 'round', 'sorted', 'enumerate', 'zip', 'type', 'open', 'True', 'False', 'None']
const catalogs = {
  turtle: ['Turtle', 'Screen', 'forward', 'backward', 'left', 'right', 'penup', 'pendown', 'color', 'pensize', 'speed', 'goto', 'circle', 'shape', 'hideturtle', 'clearscreen', 'done'],
  Turtle: ['forward', 'backward', 'back', 'left', 'right', 'penup', 'pendown', 'color', 'pencolor', 'fillcolor', 'pensize', 'speed', 'goto', 'circle', 'shape', 'hideturtle', 'showturtle', 'begin_fill', 'end_fill', 'xcor', 'ycor', 'write', 'setheading', 'position'],
  Screen: ['setup', 'bgcolor', 'title', 'clear', 'update', 'mainloop'],
  pygame: ['init', 'quit', 'display', 'event', 'time', 'draw', 'image', 'font', 'mixer', 'Rect', 'Surface'],
  'pygame.display': ['set_mode', 'set_caption', 'update', 'flip'],
  'pygame.draw': ['rect', 'circle', 'line', 'polygon', 'ellipse'],
  pandas: ['DataFrame', 'Series', 'read_csv'],
  DataFrame: ['to_csv', 'to_dict', 'head', 'tail', 'columns', 'index', 'loc', 'iloc', 'shape'],
  numpy: ['array', 'arange', 'zeros', 'ones', 'histogram', 'random', 'mean', 'multiply'],
  'numpy.random': ['randint', 'seed', 'choice', 'random', 'rand'],
  random: ['randint', 'randrange', 'choice', 'shuffle', 'random', 'seed'],
  csv: ['reader', 'writer', 'DictReader', 'DictWriter'],
  math: ['sqrt', 'floor', 'ceil', 'sin', 'cos', 'pi'],
  itertools: ['product', 'permutations', 'combinations', 'groupby'],
  list: ['append', 'extend', 'insert', 'remove', 'pop', 'sort', 'reverse', 'count', 'index', 'clear', 'copy'],
  str: ['split', 'strip', 'replace', 'lower', 'upper', 'startswith', 'endswith', 'find', 'count', 'join'],
  'matplotlib.pyplot': ['plot', 'scatter', 'hist', 'bar', 'show', 'figure', 'title', 'xlabel', 'ylabel', 'xticks', 'yticks', 'grid', 'legend', 'xlim', 'ylim', 'axvline', 'axhline'],
}
const canonical = name => ['ColabTurtlePlus.Turtle', 'turtle'].includes(name) ? 'turtle' : name
function closeName(a, b) {
  if (a === b || a.length < 2 || b.length < 2 || a.length > 40 || b.length > 40) return false
  if (a.toLowerCase() === b.toLowerCase()) return true
  if (a.length < 3 || b.length < 3) return a.length === 2 && b.length === 2 && a[0] === b[1] && a[1] === b[0]
  // One insertion/deletion/substitution or adjacent transposition only.
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  while (i < Math.min(a.length, b.length) && a[i] === b[i]) i++
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2))
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1)
}
const suggestion = (name, candidates) => {
  if (candidates.includes(name)) return null
  const matches = [...new Set(candidates)].filter(candidate => closeName(name, candidate))
  return matches.length === 1 ? matches[0] : null
}
function closesAtEnd(words, start, open, close) {
  let depth = 0
  for (let i = start; i < words.length; i++) {
    if (words[i] === open) depth++
    if (words[i] === close && --depth === 0) return i === words.length - 1
  }
  return false
}
const result = (ruleId, title, action, check, example = '', confidence = 'likely') => ({ ruleId, confidence, specific: true, guide: [title, action, check], example })

// Python's runtime suggestion is evidence even inside user-defined classes.
// Confirm the failing self call and a real method in that same class locally.
function suggestedMethod(error, lines, rows) {
  if (error.type !== 'AttributeError') return null
  const match = error.message?.match(/^AttributeError: ['"]([\p{L}_][\p{L}\p{N}_]*)['"] object has no attribute ['"]([\p{L}_][\p{L}\p{N}_]*)['"]\. Did you mean: ['"]([\p{L}_][\p{L}\p{N}_]*)['"]\?/u)
  if (!match) return null
  const [, className, missing, candidate] = match
  if (![className, missing, candidate].every(name => name.length <= 40) || !closeName(missing, candidate)) return null
  const stack = [], methods = [], classes = []
  let failingClass = null
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i], words = row.map(t => t.kind === 'string' ? '<string>' : t.value)
    if (!words.length) continue
    // Ignore tokens continuing a multiline literal; they are not declarations.
    const indentation = lines[i].match(/^[ \t]*/)[0]
    if (indentation.includes('\t')) return null
    const indent = indentation.length
    while (stack.length && stack.at(-1).indent >= indent) stack.pop()
    const owner = [...stack].reverse().find(scope => scope.kind === 'class')
    if (i + 1 === error.line && words[0] === 'self' && words[1] === '.' && words[2] === missing && words[3] === '(' && stack.at(-1)?.kind !== 'class') failingClass = owner
    if (words[0] === 'class' && identifier.test(words[1])) {
      const scope = { kind: 'class', name: words[1], indent, line: i + 1 }
      classes.push(scope); stack.push(scope)
    } else if (words[0] === 'def' && identifier.test(words[1]) && words[2] === '(') {
      if (stack.at(-1)?.kind === 'class' && words[3] === 'self') methods.push({ owner, name: words[1], line: i + 1 })
      stack.push({ kind: 'def', indent })
    } else if (words.at(-1) === ':') stack.push({ kind: 'block', indent })
  }
  if (!failingClass || failingClass.name !== className || classes.filter(c => c.name === className).length !== 1) return null
  const definitions = methods.filter(m => m.owner === failingClass && m.name === candidate)
  if (definitions.length !== 1 || methods.some(m => m.owner === failingClass && m.name === missing)) return null
  return { ...result('attribute-spelling',
    `${error.line}번째 줄의 ${missing}와 ${definitions[0].line}번째 줄에 정의한 ${candidate}의 철자가 달라요.`,
    `${candidate} 메서드를 호출하려던 것이라면 self.${missing}()를 self.${candidate}()로 고쳐 보세요.`,
    '파이썬 오류 메시지도 같은 이름을 제안했어요. 한 곳을 고친 뒤 다시 실행해 보세요.',
    `self.${candidate}()`, 'high'), relatedLines: [failingClass.line, definitions[0].line] }
}

export function diagnoseNames(error, source, ts) {
  if (!['NameError', 'AttributeError', 'TypeError', 'ImportError', 'ModuleNotFoundError'].includes(error.type)) return null
  if (source.length > 50000 || ts.length > 12000) return null
  const lines = source.split('\n'), rows = lines.map(() => [])
  for (const token of ts) rows[token.line - 1]?.push(token)
  const method = suggestedMethod(error, lines, rows)
  if (method) return method
  const names = new Map(builtins.map(name => [name, { kind: 'builtin', path: name }]))
  const before = rows.slice(0, error.line - 1)
  // No scope guessing across a function/class/branch/loop or multiline literal.
  if (before.some((row, i) => row.length && (/^\s/.test(lines[i]) || row.some(t => t.kind === 'string' && source.slice(t.start, t.end).includes('\n')) || /^(def|class|if|for|while|try|with|match)\b/.test(lines[i])))) return null
  const pathOf = words => {
    if (!words.length || !identifier.test(words[0])) return null
    const entry = names.get(words[0])
    if (!entry?.path) return null
    if (words.slice(1).some((w, i) => i % 2 === 0 ? w !== '.' : !identifier.test(w))) return null
    return entry.path + words.slice(1).join('')
  }
  for (let i = 0; i < before.length; i++) {
    const row = before[i], words = row.map(t => t.kind === 'string' ? '<string>' : t.value)
    if (!words.length) continue
    const text = words.join(' ')
    let match = text.match(/^import ([\w. ]+?)(?: as (\w+))?$/)
    if (match && !text.includes(',')) {
      const full = match[1].replaceAll(' ', ''), alias = match[2] || full.split('.')[0]
      names.set(alias, { kind: 'module', path: canonical(match[2] ? full : full.split('.')[0]) }); continue
    }
    match = text.match(/^from ([\w. ]+) import (\*|\w+)(?: as (\w+))?$/)
    if (match) {
      const module = canonical(match[1].replaceAll(' ', '')), member = match[2]
      for (const name of member === '*' ? (catalogs[module] || []) : [member]) {
        const known = catalogs[module]?.includes(name)
        names.set(match[3] || name, { kind: ['Turtle', 'Screen', 'DataFrame', 'Series'].includes(name) && known ? 'class' : 'import', path: known ? name : null })
      }
      continue
    }
    if (identifier.test(words[0]) && words[1] === '=' && words[2] !== '=') {
      const rhs = words.slice(2), call = rhs.indexOf('('), target = pathOf(call < 0 ? rhs : rhs.slice(0, call))
      const leaf = target?.split('.').at(-1)
      const classKnown = ['Turtle', 'Screen', 'DataFrame', 'Series'].includes(leaf) && (call < 0 || closesAtEnd(rhs, call, '(', ')')) && (names.get(rhs[0])?.kind === 'class' || catalogs[target?.slice(0, -(leaf.length + 1))]?.includes(leaf))
      const literalType = rhs[0] === '[' && closesAtEnd(rhs, 0, '[', ']') ? 'list' : rhs.length === 1 && rhs[0] === '<string>' ? 'str' : null
      names.set(words[0], { kind: classKnown ? (call < 0 ? 'class-reference' : 'instance') : literalType ? 'instance' : 'variable', path: classKnown ? leaf : literalType, origin: i + 1, rhs: rhs.join('') })
      continue
    }
    // Anything outside the recognized straight-line subset may mutate names.
    // Calls on existing objects are allowed; other statements abort inference.
    if (!/^[\p{L}_][\p{L}\p{N}_]*(?:\s*\.\s*[\p{L}_][\p{L}\p{N}_]*)*\s*\(/u.test(lines[i]) || words.includes(';') || words.includes(':=')) return null
  }
  const row = rows[error.line - 1] || [], words = row.map(t => t.value), message = error.message || ''
  if (error.type === 'ModuleNotFoundError') {
    const missing = message.match(/No module named ['"]([\w.]+)['"]/)?.[1]
    const written = words.join('').replace(/^import/, '').replace(/^from/, '').split('import')[0]
    const candidate = missing && suggestion(missing, ['turtle', 'ColabTurtlePlus', 'pygame', 'pandas', 'numpy', 'matplotlib', 'random', 'csv', 'itertools', 'fractions', 'tkinter'])
    if (candidate && written.startsWith(missing)) return result('module-spelling', `${missing} 모듈을 찾지 못했어요. ${candidate}와 철자가 비슷해요.`, `${candidate}를 불러오려던 것인지 import 문장을 확인해 주세요. 대문자와 소문자도 구분해요.`, '이름을 확인하기 전에 설치 명령을 반복하지 말고, 수업 코드의 모듈 이름과 비교해요.')
  }
  if (error.type === 'ImportError') {
    const statement = words.join(' '), imported = statement.match(/^from ([\w. ]+) import (\w+)$/)
    const missing = message.match(/cannot import name ['"](\w+)['"]/)?.[1]
    const candidate = imported && missing === imported[2] && suggestion(missing, catalogs[canonical(imported[1].replaceAll(' ', ''))] || [])
    if (candidate) return result('import-spelling', `가져오려는 ${missing}를 찾지 못했어요. ${candidate}와 철자가 비슷해요.`, `import 뒤에 ${candidate}를 쓰려던 것인지 확인해 주세요. 클래스 이름의 첫 대문자도 확인해요.`, '모듈 이름과 그 안에서 가져오는 이름은 서로 다를 수 있어요. 자동 추천 목록과 비교해 보세요.')
  }
  if (error.type === 'NameError') {
    const missing = message.match(/name ['"]([\p{L}_][\p{L}\p{N}_]*)['"] is not defined/u)?.[1]
    if (!missing || !words.includes(missing)) return null
    const candidate = suggestion(missing, [...names.keys()])
    if (candidate) return result('name-spelling', `${missing}라는 이름을 찾지 못했어요. ${candidate}와 철자가 비슷해요.`, `${candidate}를 쓰려던 것인지 확인해 주세요. 파이썬은 대문자·소문자와 글자 순서를 구분해요.`, '의도한 이름이 맞다면 그 이름으로 고친 뒤 다시 실행해요. 다른 이름을 쓰려던 것이라면 먼저 값을 만들어야 해요.')
  }
  const call = words.indexOf('('), access = call < 0 ? words : words.slice(0, call)
  const receiver = access.length >= 3 && access[1] === '.' ? names.get(access[0]) : null
  if (error.type === 'TypeError' && receiver?.kind === 'class-reference' && /missing \d+ required positional argument/.test(message) && catalogs[receiver.path]?.includes(access.at(-1))) {
    return result('constructor-not-called', `${receiver.origin}번째 줄의 ${access[0]} = ${receiver.rhs}에서 객체를 만드는 ()가 빠졌을 수 있어요.`, `새 객체를 만들려던 줄이라면 ${receiver.rhs} 뒤에 ()를 붙여 ${access[0]} = ${receiver.rhs}()로 바꿔 보세요.`, '클래스 이름만 쓰면 설계도 자체를 가리켜요. ()로 객체를 만든 뒤 그 객체의 기능을 사용해요. 지금은 마지막 줄에 숫자를 더 넣기보다 만드는 줄부터 확인해요.', `${access[0]} = ${receiver.rhs}()`)
  }
  if (error.type === 'AttributeError' && receiver) {
    const missing = message.match(/has no attribute ['"]([\p{L}_][\p{L}\p{N}_]*)['"]/u)?.[1]
    const receiverPath = access.length === 3 ? receiver.path : pathOf(access.slice(0, -2))
    if (missing !== access.at(-1)) return null
    const candidate = suggestion(missing, catalogs[receiverPath] || [])
    if (candidate) return result('attribute-spelling', `${missing}라는 기능을 찾지 못했어요. ${candidate}와 철자가 비슷해요.`, `점(.) 뒤의 ${missing}를 확인해 주세요. ${candidate} 기능을 쓰려던 것인지 자동 추천 목록과 비교해 보세요.`, '이름은 대소문자도 같아야 해요. 의도한 기능인지 확인한 뒤 고치고 다시 실행해요.')
  }
  if (error.type === 'TypeError' && /missing \d+ required positional argument/.test(message) && call >= 0 && words[call + 1] === ')') {
    const label = access.join('')
    if (label.length < 65 && receiver?.kind === 'instance' && catalogs[receiver.path]?.includes(access.at(-1))) return result('call-missing-argument', `${label}()를 실행할 때 필요한 값이 비어 있어요.`, access.at(-1) === 'forward' ? 'forward의 괄호 안에는 이동할 거리를 넣어요. 100만큼 이동하려면 forward(100)처럼 써 주세요.' : '자동 추천의 인자 설명을 보고 괄호 안에 필요한 값을 넣어 주세요.', '객체를 만드는 ()와, 기능을 실행하면서 값을 넣는 ()는 역할이 달라요. 한 곳을 고친 뒤 다시 실행해요.')
  }
  return null
}
