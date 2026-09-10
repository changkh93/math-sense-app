import { pythonLanguage } from '@codemirror/lang-python'
import { catalog, instance, modules, colors } from './studioCompletionCatalog.js'

const children = node => { const list = []; for (let n = node?.firstChild; n; n = n.nextSibling) list.push(n); return list }
const word = /[\p{L}\p{N}_]*$/u
const ignored = new Set(['Comment', 'String', 'FormatString'])
const text = (model, node) => node ? model.source.slice(node.from, node.to) : ''
const typeFrom = ref => {
  if (!ref) return null
  const list = ref.match(/^list\[(.+)\]$/)
  return list ? { ...instance('list'), item: typeFrom(list[1]) } : instance(ref)
}
const moduleName = path => path.replace(/\.py$/i, '').replace(/\/__init__$/, '').replaceAll('/', '.')

// Each editor owns this cache. Only referenced project Python files are parsed.
export function createStudioAnalyzer(getProject = () => ({})) {
  const cache = new Map()
  let current
  let previousFiles = []
  function parse(source, path, depth = 0) {
    const saved = cache.get(path)
    if (saved?.source === source) return saved
    // Keep typing responsive on exceptionally large generated files.
    if (source.length > 200000 || depth > 6) return null
    const model = { source, path, tree: pythonLanguage.parser.parse(source), scopes: [], root: null }
    cache.set(path, model)
    if (cache.size > 24) cache.delete(cache.keys().next().value)
    const root = { from: 0, to: source.length, bindings: new Map(), parent: null, model }
    model.root = root; model.scopes.push(root)
    function bind(scope, label, descriptor, node) {
      const binding = { label, type: 'variable', info: '내 코드에서 정의한 이름', ...descriptor, at: node.from, scope, model }
      const list = scope.bindings.get(label) || []; list.push(binding); scope.bindings.set(label, list)
      return binding
    }
    function walk(node, scope, owner = null) {
      const parts = children(node), content = text(model, node)
      if (node.name === 'ClassDefinition' || node.name === 'FunctionDefinition') {
        const name = text(model, node.getChild('VariableName'))
        const isClass = node.name === 'ClassDefinition'
        const param = node.getChild('ParamList'), body = node.getChild('Body')
        const binding = bind(scope, name, { kind: isClass ? 'class' : 'function', type: isClass ? 'class' : owner ? 'method' : 'function', signature: name + (text(model, param) || '()'), members: isClass ? new Map() : undefined }, node)
        const inner = { from: body?.from ?? node.from, to: node.to, bindings: new Map(), parent: scope, model, owner: isClass ? binding : owner }
        binding.inner = inner
        if (isClass) binding.bases = children(node.getChild('ArgList')).filter(n => !['(', ')', ','].includes(n.name))
        if (owner && !isClass) owner.members.set(name, binding)
        model.scopes.push(inner)
        if (param) {
          for (const p of children(param).filter(n => n.name === 'VariableName' && n.prevSibling?.name !== 'AssignOp')) {
            const annotation = p.nextSibling?.name === 'TypeDef' ? p.nextSibling.lastChild : null
            bind(inner, text(model, p), { type: 'variable', info: '함수 매개변수', annotation, direct: text(model, p) === 'self' && owner ? { ...owner, kind: 'instance' } : null }, p)
          }
          if (owner) binding.signature = `${name}(${text(model, param).slice(1, -1).replace(/^self\s*,?\s*/, '')})`
        }
        const doc = body?.getChild('ExpressionStatement')?.getChild('String')
        if (doc) binding.info = text(model, doc).replace(/^['"]{1,3}|['"]{1,3}$/g, '').slice(0, 400)
        binding.returnAnnotation = node.getChild('TypeDef')?.lastChild
        if (body) for (const n of children(body)) walk(n, inner, isClass ? binding : owner)
        if (isClass && binding.members.has('__init__')) binding.signature = name + binding.members.get('__init__').signature.slice('__init__'.length)
        if (!isClass) binding.returnExpr = inner.returnExpr
        return
      }
      if (node.name === 'ImportStatement') {
        // Parse only a parser-confirmed import statement, never comments/strings.
        const from = content.match(/^from\s+([\w.]+)\s+import\s+([\s\S]+)/u)
        const list = (from ? from[2] : content.replace(/^import\s+/, '')).replace(/[()]/g, '').split(',')
        for (const item of list) {
          const match = item.trim().match(/^([\p{L}\p{N}_.*]+)(?:\s+as\s+([\p{L}\p{N}_]+))?/u)
          if (!match) continue
          const [, name, alias] = match
          if (from && name === '*') {
            const target = imported(from[1], model, depth + 1)
            for (const [label, value] of members(target)) if (!label.startsWith('_')) bind(scope, label, { imported: value, info: value.info }, node)
          } else bind(scope, alias || (from ? name : name.split('.')[0]), { importPath: from ? from[1] : alias ? name : name.split('.')[0], importMember: from ? name : null, type: from ? 'variable' : 'namespace' }, node)
        }
        return
      }
      if (node.name === 'AssignStatement') {
        const op = parts.findIndex(n => n.name === 'AssignOp'), annotation = parts.find(n => n.name === 'TypeDef')?.lastChild
        const targets = parts.slice(0, op < 0 ? parts.length : op)
        const expr = op >= 0 ? parts[op + 1] : null
        for (const target of targets) {
          if (target.name === 'VariableName') {
            const binding = bind(scope, text(model, target), { expr, annotation, destructured: targets.filter(n => n.name === 'VariableName').length > 1 }, target)
            if (owner?.inner === scope) owner.members.set(binding.label, { ...binding, type: 'property', info: '내 클래스의 속성' })
          }
          else if (target.name === 'MemberExpression' && text(model, target.firstChild) === 'self' && owner) {
            const label = text(model, target.getChild('PropertyName'))
            if (label) owner.members.set(label, { label, type: 'property', info: '내 클래스의 속성', expr, annotation, scope, model, at: node.from })
          } else if (target.name === 'MemberExpression' && target.firstChild.name === 'VariableName') {
            const parent = lookup(text(model, target.firstChild), scope, node.from)
            const label = text(model, target.getChild('PropertyName'))
            if (parent && label) {
              parent.extraMembers ||= new Map()
              parent.extraMembers.set(label, { label, type: 'property', info: '내 객체에 추가한 속성', expr, scope, model, at: node.from })
            }
          }
        }
      }
      if (node.name === 'ForStatement') {
        const index = parts.findIndex(n => n.name === 'in'), iterable = parts[index + 1]
        parts.slice(0, index).filter(n => n.name === 'VariableName').forEach((target, loopIndex) => bind(scope, text(model, target), { iterable, loopIndex, type: 'variable', info: '반복문 변수' }, target))
      }
      if (node.name === 'ReturnStatement' && !scope.returnExpr) scope.returnExpr = parts[1]
      if (node.name === 'CallExpression' && node.firstChild?.name === 'MemberExpression' && text(model, node.firstChild.getChild('PropertyName')) === 'append') {
        const list = lookup(text(model, node.firstChild.firstChild), scope, node.from)
        if (list) list.itemExpr = { node: children(node.getChild('ArgList')).find(n => !['(', ')', ','].includes(n.name)), scope }
      }
      for (const n of parts) walk(n, scope, owner)
    }
    for (const node of children(model.tree.topNode)) walk(node, root)
    return model
  }
  function imported(name, model, depth = 0) {
    if (catalog[name]) return { kind: 'module', ref: name }
    const files = getProject().files || []
    let target = name
    const directory = model.path.split('/').slice(0, -1)
    if (name.startsWith('.')) {
      const count = name.match(/^\.+/)[0].length
      target = [...directory.slice(0, Math.max(0, directory.length - count + 1)), name.slice(count)].filter(Boolean).join('.')
    }
    const match = files.find(f => f.kind === 'python' && moduleName(f.path) === target)
    const other = match && parse(match.path === current?.path ? current.source : match.text || '', match.path, depth)
    return other ? { kind: 'module', model: other } : null
  }
  function lookup(name, scope, pos = Infinity) {
    for (let s = scope; s; s = s.parent) {
      const all = s.bindings.get(name)
      if (all) return [...all].reverse().find(b => b.at < pos || ['function', 'class'].includes(b.kind))
    }
    return catalog.builtins[name] || null
  }
  function resolve(binding, depth = 0) {
    if (!binding || depth > 24) return null
    if (binding.direct) return binding.direct
    if (binding.imported) return resolve(binding.imported, depth + 1)
    if (binding.importPath) {
      const target = imported(binding.importPath, binding.model)
      return binding.importMember ? resolve(members(target, depth + 1).get(binding.importMember), depth + 1) : target
    }
    if (binding.annotation) {
      const value = expression(binding.annotation, binding.scope, binding.at, depth + 1)
      if (value) return value.returns ? typeFrom(value.returns) : { ...value, kind: 'instance' }
    }
    if (binding.iterable) {
      if (binding.iterable.name === 'CallExpression' && text(binding.model, binding.iterable.firstChild) === 'enumerate') {
        if (binding.loopIndex === 0) return instance('int')
        const argument = children(binding.iterable.getChild('ArgList')).find(n => !['(', ')', ','].includes(n.name))
        return expression(argument, binding.scope, binding.at, depth + 1)?.item || null
      }
      return expression(binding.iterable, binding.scope, binding.at, depth + 1)?.item || null
    }
    if (binding.expr && !binding.destructured) {
      let value = expression(binding.expr, binding.scope, binding.at, depth + 1)
      if (binding.extraMembers) value = { ...value, members: new Map([...(value?.members || []), ...binding.extraMembers]) }
      if (value && binding.itemExpr) return { ...value, item: expression(binding.itemExpr.node, binding.itemExpr.scope, Infinity, depth + 1) }
      return value
    }
    return binding
  }
  function members(value, depth = 0, seen = new Set()) {
    if (!value || depth > 24) return new Map()
    const identity = value.inner || value.ref || value
    if (seen.has(identity)) return new Map()
    seen.add(identity)
    if (value.kind === 'module' && value.model) return new Map([...value.model.root.bindings].map(([name, list]) => [name, list.at(-1)]))
    const result = new Map(Object.entries(catalog[value.ref] || {}))
    for (const base of value.bases || []) for (const [key, val] of members(expression(base, value.scope, Infinity, depth + 1), depth + 1, seen)) result.set(key, val)
    for (const [key, val] of value.members || []) result.set(key, val)
    return result
  }
  function expression(node, scope, pos = Infinity, depth = 0) {
    if (!node || depth > 24) return null
    const model = scope.model, parts = children(node), value = text(model, node)
    if (node.name === 'VariableName') return resolve(lookup(value, scope, pos), depth + 1)
    if (['String', 'FormatString'].includes(node.name)) return instance('str')
    if (node.name === 'Number') return instance(value.includes('.') ? 'float' : 'int')
    if (node.name === 'ArrayExpression') return { ...instance('list'), item: expression(parts.find(n => !['[', ']', ','].includes(n.name)), scope, pos, depth + 1) }
    if (node.name === 'DictionaryExpression') return instance('dict')
    if (node.name === 'SetExpression') return instance('set')
    if (node.name === 'TupleExpression') return instance('tuple')
    if (node.name === 'ParenthesizedExpression') return expression(parts[1], scope, pos, depth + 1)
    if (node.name === 'MemberExpression') {
      const base = expression(parts[0], scope, pos, depth + 1)
      const property = node.getChild('PropertyName')
      if (!property) return base?.item || null
      return resolve(members(base, depth + 1).get(text(model, property)), depth + 1)
    }
    if (node.name === 'CallExpression') {
      const callee = expression(parts[0], scope, pos, depth + 1)
      if (callee?.kind === 'class' && callee.members) return { ...callee, kind: 'instance', signature: undefined }
      if (callee?.returns) return typeFrom(callee.returns)
      if (callee?.returnAnnotation) {
        const annotation = expression(callee.returnAnnotation, callee.inner, Infinity, depth + 1)
        return annotation?.returns ? typeFrom(annotation.returns) : annotation
      }
      if (callee?.returnExpr) return expression(callee.returnExpr, callee.inner, Infinity, depth + 1)
      return null
    }
    return null
  }
  function scopeAt(model, pos) {
    return model.scopes.filter(s => s.from <= pos && pos <= s.to).sort((a, b) => b.from - a.from)[0] || model.root
  }
  function context(source, pos, path) {
    const files = (getProject().files || []).filter(f => f.path !== path)
    if (files.length !== previousFiles.length || files.some((f, i) => f.path !== previousFiles[i]?.path || f.text !== previousFiles[i]?.text)) cache.clear()
    previousFiles = files
    current = { source, path }
    const model = parse(source, path)
    if (!model) return null
    return { model, scope: scopeAt(model, pos), node: model.tree.resolveInner(pos, -1) }
  }
  function enclosing(node, name) { for (let n = node; n; n = n.parent) if (n.name === name) return n; return null }
  function entry(binding, depth = 0) {
    const value = resolve(binding, depth)
    const callSignature = ['function', 'class'].includes(value?.kind) ? value.signature : undefined
    return { ...binding, type: binding.type === 'variable' && ['function', 'class', 'module'].includes(value?.kind) ? value.type || (value.kind === 'module' ? 'namespace' : value.kind) : binding.type || value?.type || 'property', signature: callSignature, info: value?.info || binding.info || '내 코드의 이름', detail: callSignature || value?.ref || (binding.type === 'property' ? '속성' : '내 코드') }
  }
  function signature(source, pos, path) {
    const ctx = context(source, pos, path)
    if (!ctx) return null
    for (let n = ctx.node; n; n = n.parent) {
      if (n.name !== 'ArgList') continue
      if (source[n.to - 1] === ')' && pos >= n.to) continue
      if (n.parent?.name !== 'CallExpression') continue
      const value = expression(n.parent.firstChild, ctx.scope, pos)
      if (value?.signature) return { pos: n.from, signature: value.signature, info: value.info, argument: children(n).filter(c => c.name === ',' && c.to <= pos).length + 1 }
    }
    return null
  }
  function complete(source, pos, path = 'main.py', explicit = false) {
    const ctx = context(source, pos, path)
    if (!ctx) return null
    const { model, scope, node } = ctx
    const before = source.slice(0, pos), line = before.slice(before.lastIndexOf('\n') + 1)
    let stringNode = null
    for (let n = node; n; n = n.parent) {
      if (n.name === 'Comment') return null
      if (ignored.has(n.name)) { stringNode = n; break }
    }
    if (stringNode) {
      const call = enclosing(stringNode, 'CallExpression')
      const raw = source.slice(stringNode.from, pos), quote = raw[0]
      if (!['"', "'"].includes(quote) || raw.startsWith(quote.repeat(3)) || (pos === stringNode.to && source[pos - 1] === quote && raw.length > 1)) return null
      const value = call && expression(call.firstChild, scope, pos)
      const name = value?.label
      let options = []
      if (['color', 'pencolor', 'fillcolor', 'bgcolor'].includes(name)) options = colors.map(label => ({ label, type: 'constant', info: '색 이름', detail: '색상' }))
      else if (name === 'shape') options = ['turtle', 'classic', 'arrow', 'circle', 'square', 'triangle', 'blank'].map(label => ({ label, type: 'constant', detail: '거북이 모양' }))
      else if (['load', 'Font', 'Sound', 'open'].includes(name)) {
        options = (getProject().files || []).filter(f => !value.fileKind || f.kind === value.fileKind).map(f => ({ label: f.path, type: 'text', detail: '프로젝트 파일', info: '프로젝트 루트 기준 경로' }))
      }
      return options.length ? { from: stringNode.from + 1, options, string: true } : null
    }
    const importMatch = line.match(/^\s*(?:from\s+([\w.]+)\s+import\s+|import\s+|from\s+)([\w.]*)$/)
    if (importMatch) {
      const options = importMatch[1] ? [...members(imported(importMatch[1], model)).values()].map(b => entry(b)) : [...modules, ...(getProject().files || []).filter(f => f.kind === 'python' && f.path !== path).map(f => ({ label: moduleName(f.path), type: 'namespace', info: '내 프로젝트의 Python 파일' }))]
      return { from: pos - importMatch[2].length, options, importing: true }
    }
    const prefix = before.match(word)[0]
    const member = enclosing(node, 'MemberExpression')
    if (member && (node.name === 'PropertyName' || before[pos - prefix.length - 1] === '.')) {
      const target = expression(member.firstChild, scope, pos)
      return { from: pos - prefix.length, options: [...members(target)].filter(([key]) => prefix.startsWith('_') || !key.startsWith('_')).map(([, b]) => entry(b)) }
    }
    if (!prefix && !explicit) return null
    const names = new Map()
    for (let s = scope; s; s = s.parent) for (const [name] of s.bindings) if (!names.has(name)) {
      const binding = lookup(name, s, pos)
      if (binding) names.set(name, { ...entry(binding), boost: 8 })
    }
    for (const [name, value] of Object.entries(catalog.builtins)) if (!names.has(name)) names.set(name, value)
    for (const label of ['True', 'False', 'None']) if (!names.has(label)) names.set(label, { label, type: 'constant' })
    return { from: pos - prefix.length, options: [...names.values()], global: true }
  }
  return { complete, signature }
}
