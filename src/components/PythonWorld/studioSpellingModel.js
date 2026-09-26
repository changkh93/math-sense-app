import { pythonLanguage } from '@codemirror/lang-python'
import { createStudioAnalyzer } from './studioCompletionModel.js'
import { spellingVocabulary } from './studioSpellingVocabulary.js'

const vocabulary = new Map(Object.entries(spellingVocabulary).map(([ref, names]) => [ref, new Set(names.split(' '))]))
const children = node => { const result = []; for (let child = node?.firstChild; child; child = child.nextSibling) result.push(child); return result }
const identifier = String.raw`[\p{L}_][\p{L}\p{N}_]*`
const dottedName = String.raw`\.*${identifier}(?:\.${identifier})*`
const trailingComment = String.raw`\s*(?:#.*)?$`
const colonEnding = new RegExp(String.raw`:\s*(?:#.*)?$`, 'u')

const statementKeywordRules = [
  {
    keyword: 'import',
    matches: rest => new RegExp(
      String.raw`^\s+${dottedName}(?:\s+as\s+${identifier})?(?:\s*,\s*${dottedName}(?:\s+as\s+${identifier})?)*${trailingComment}`,
      'u',
    ).test(rest),
  },
  {
    keyword: 'from',
    matches: rest => new RegExp(
      String.raw`^\s+${dottedName}\s+import\s+(?:\*|${identifier})(?:\s+as\s+${identifier})?(?:\s*,\s*${identifier}(?:\s+as\s+${identifier})?)*${trailingComment}`,
      'u',
    ).test(rest),
  },
  { keyword: 'if', matches: rest => /\S/u.test(rest) && colonEnding.test(rest) },
  { keyword: 'elif', matches: rest => /\S/u.test(rest) && colonEnding.test(rest) },
  { keyword: 'while', matches: rest => /\S/u.test(rest) && colonEnding.test(rest) },
  { keyword: 'for', matches: rest => /\s+.+\s+in\s+.+/u.test(rest) && colonEnding.test(rest) },
  {
    keyword: 'def',
    matches: rest => new RegExp(
      String.raw`^\s+${identifier}\s*\([^\n]*\)\s*(?:->\s*[^:]+)?${colonEnding.source}`,
      'u',
    ).test(rest),
  },
  {
    keyword: 'class',
    matches: rest => new RegExp(
      String.raw`^\s+${identifier}(?:\s*\([^\n]*\))?${colonEnding.source}`,
      'u',
    ).test(rest),
  },
  { keyword: 'with', matches: rest => /\S/u.test(rest) && colonEnding.test(rest) },
  { keyword: 'match', matches: rest => /\S/u.test(rest) && colonEnding.test(rest) },
  { keyword: 'case', matches: rest => /\S/u.test(rest) && colonEnding.test(rest) },
  { keyword: 'except', matches: rest => colonEnding.test(rest) },
  { keyword: 'else', matches: rest => /^\s*:\s*(?:#.*)?$/u.test(rest) },
  { keyword: 'try', matches: rest => /^\s*:\s*(?:#.*)?$/u.test(rest) },
  { keyword: 'finally', matches: rest => /^\s*:\s*(?:#.*)?$/u.test(rest) },
  { keyword: 'async', matches: rest => /^\s+(?:def|for|with)\b/u.test(rest) && colonEnding.test(rest) },
  { keyword: 'return', ancestor: 'FunctionDefinition', matches: rest => !/^\s*(?:=|\.)/u.test(rest) },
  { keyword: 'yield', ancestor: 'FunctionDefinition', matches: rest => !/^\s*(?:=|\.)/u.test(rest) },
  { keyword: 'break', ancestor: ['ForStatement', 'WhileStatement'], matches: rest => new RegExp(`^${trailingComment}`, 'u').test(rest) },
  { keyword: 'continue', ancestor: ['ForStatement', 'WhileStatement'], matches: rest => new RegExp(`^${trailingComment}`, 'u').test(rest) },
  { keyword: 'pass', ancestor: 'Body', matches: rest => new RegExp(`^${trailingComment}`, 'u').test(rest) },
  { keyword: 'raise', matches: rest => /^\s+(?![=.])\S/u.test(rest) },
  { keyword: 'assert', matches: rest => /^\s+(?![=.])\S/u.test(rest) },
  { keyword: 'del', matches: rest => /^\s+(?![=.])\S/u.test(rest) },
  { keyword: 'global', matches: rest => new RegExp(String.raw`^\s+${identifier}(?:\s*,\s*${identifier})*${trailingComment}`, 'u').test(rest) },
  { keyword: 'nonlocal', matches: rest => new RegExp(String.raw`^\s+${identifier}(?:\s*,\s*${identifier})*${trailingComment}`, 'u').test(rest) },
]

// Only a single insertion, deletion, substitution, or adjacent swap is a
// sufficiently strong signal to interrupt a student before running code.
export function isOneEditAway(actual, expected) {
  if (actual === expected || !actual || !expected || Math.abs(actual.length - expected.length) > 1) return false
  if (actual.length === expected.length) {
    const differences = []
    for (let i = 0; i < actual.length; i++) if (actual[i] !== expected[i]) differences.push(i)
    return differences.length === 1 || (differences.length === 2 && differences[1] === differences[0] + 1
      && actual[differences[0]] === expected[differences[1]] && actual[differences[1]] === expected[differences[0]])
  }
  const [shorter, longer] = actual.length < expected.length ? [actual, expected] : [expected, actual]
  let skipped = false
  for (let i = 0, j = 0; i < shorter.length; i++, j++) {
    if (shorter[i] !== longer[j]) {
      if (skipped || shorter[i] !== longer[++j]) return false
      skipped = true
    }
  }
  return true
}

function hasAncestor(node, expected) {
  const names = new Set(Array.isArray(expected) ? expected : [expected])
  for (let parent = node?.parent; parent; parent = parent.parent) if (names.has(parent.name)) return true
  return false
}

export function findPythonKeywordSpelling(source, tree = pythonLanguage.parser.parse(source), prefixLength = 0) {
  const issues = []
  tree.iterate({ enter({ node }) {
    if (node.name !== 'VariableName' || node.to <= prefixLength || issues.length >= 30) return undefined
    const lineStart = source.lastIndexOf('\n', node.from - 1) + 1
    if (!/^\s*$/u.test(source.slice(lineStart, node.from))) return undefined
    const lineEndIndex = source.indexOf('\n', node.to)
    const lineEnd = lineEndIndex < 0 ? source.length : lineEndIndex
    const actual = source.slice(node.from, node.to)
    const rest = source.slice(node.to, lineEnd)
    const matches = statementKeywordRules.filter(rule => (
      isOneEditAway(actual, rule.keyword)
      && (!rule.ancestor || hasAncestor(node, rule.ancestor))
      && rule.matches(rest)
    ))
    if (matches.length === 1) {
      issues.push({
        from: node.from - prefixLength,
        to: node.to - prefixLength,
        actual,
        suggestion: matches[0].keyword,
      })
    }
    return undefined
  } })
  return issues
}

function isAssignmentTarget(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (parent.name === 'AssignStatement') {
      const operator = parent.getChildren('AssignOp').at(-1)
      return !operator || node.to <= operator.from
    }
    if (['CallExpression', 'ExpressionStatement', 'Body', 'Script'].includes(parent.name)) break
  }
  return false
}

// The completion model deliberately does not infer all Python binding forms.
// Suppress guesses for names those forms can shadow, including a receiver such
// as `(lambda window: window.bilt())(custom_object)`.
function uncertainBindings(tree, source) {
  const names = new Set()
  const collect = node => {
    if (!node) return
    if (node.name === 'VariableName') names.add(source.slice(node.from, node.to))
    else for (const child of children(node)) collect(child)
  }
  tree.iterate({ enter({ node }) {
    const parts = children(node)
    if (node.name === 'LambdaExpression') collect(node.getChild('ParamList'))
    if (node.name.endsWith('ComprehensionExpression')) {
      let target = false
      for (const part of parts) {
        if (part.name === 'for') target = true
        else if (part.name === 'in') target = false
        else if (target) collect(part)
      }
    }
    if (['WithStatement', 'TryStatement'].includes(node.name)) {
      for (const part of parts) if (part.prevSibling?.name === 'as') collect(part)
    }
    if (node.name === 'NamedExpression') collect(node.firstChild)
    if (node.name === 'MatchStatement') collect(node)
    if (['AssignStatement', 'ForStatement'].includes(node.name)) {
      const end = node.getChildren('AssignOp').at(-1)?.from ?? node.getChild('in')?.from ?? node.to
      const targets = parts.filter(part => part.to <= end)
      if (node.getChildren('AssignOp').length > 1 || targets.some(part => ['TupleExpression', 'ArrayExpression'].includes(part.name))) {
        for (const part of targets) collect(part)
      }
    }
  } })
  return names
}

function receiverName(node, source) {
  let base = node.parent?.firstChild
  while (base && ['MemberExpression', 'CallExpression', 'ParenthesizedExpression'].includes(base.name)) {
    base = base.name === 'ParenthesizedExpression' ? base.firstChild?.nextSibling : base.firstChild
  }
  return base?.name === 'VariableName' ? source.slice(base.from, base.to) : null
}

export function findStudioSpelling(source, project = {}, analyzer = createStudioAnalyzer(() => project)) {
  if (!source || source.length > 60000) return []
  const prefix = project.prefix || ''
  const fullSource = prefix + source
  if (fullSource.length > 200000) return []
  const path = project.path || 'main.py'
  const issues = []
  let checked = 0
  const tree = pythonLanguage.parser.parse(fullSource)
  issues.push(...findPythonKeywordSpelling(fullSource, tree, prefix.length))
  const uncertain = uncertainBindings(tree, fullSource)
  const knownGlobals = new Set(vocabulary.get('builtins'))
  let unknownStarImport = false
  tree.iterate({ enter({ node }) {
    if (node.name !== 'ImportStatement') return
    const match = fullSource.slice(node.from, node.to).match(/^from\s+([\w.]+)\s+import\s+\*/)
    if (!match) return
    const known = vocabulary.get(match[1])
    if (known) for (const name of known) knownGlobals.add(name)
    else unknownStarImport = true
  } })

  tree.iterate({ enter(ref) {
    if (issues.length >= 30 || checked >= 600) return false
    const node = ref.node
    if (node.to <= prefix.length) return false
    const member = node.name === 'PropertyName' && node.parent?.name === 'MemberExpression'
    const bareCall = node.name === 'VariableName' && node.parent?.name === 'CallExpression' && node.parent.firstChild.from === node.from
    if ((!member && !bareCall) || isAssignmentTarget(node)) return undefined

    const actual = fullSource.slice(node.from, node.to)
    if (actual.length < 3 || actual.length > 48) return undefined
    if (uncertain.has(member ? receiverName(node, fullSource) : actual)) return undefined
    if (bareCall && (knownGlobals.has(actual) || unknownStarImport)) return undefined
    checked++
    const result = analyzer.complete(fullSource, node.to, path, true)
    const options = result?.options || []
    if (!options.length || options.some(option => option.label === actual)) return undefined
    const known = member ? vocabulary.get(result.memberRef) : knownGlobals
    if (member && !known && !result.sourceMembers) return undefined
    if (known?.has(actual)) return undefined
    const isCall = bareCall || (node.parent?.parent?.name === 'CallExpression' && node.parent.parent.firstChild.from === node.parent.from)
    if (!isCall && options.some(option => option.label.startsWith(actual))) return undefined
    const close = options.filter(option => (!bareCall || ['function', 'class', 'method'].includes(option.type))
      && option.label.length >= 4 && isOneEditAway(actual, option.label))
    if (close.length === 1 && ![...(known || [])].some(name => name !== close[0].label && isOneEditAway(actual, name))) {
      if (!issues.some(issue => issue.from === node.from - prefix.length && issue.to === node.to - prefix.length)) {
        issues.push({ from: node.from - prefix.length, to: node.to - prefix.length, actual, suggestion: close[0].label })
      }
    }
    return undefined
  } })
  return issues
}
