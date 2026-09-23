import { pythonLanguage } from '@codemirror/lang-python'

const TURTLE_CALLS = 'Screen|Turtle|RawTurtle|RawPen|Pen|forward|fd|backward|back|bk|right|rt|left|lt|goto|setpos|setposition|circle|dot|stamp|write|begin_fill|end_fill|mainloop|done'
const PLOT_CALLS = 'show|plot|scatter|imshow|bar|barh|hist|pie|stem|step|fill|fill_between|contour|contourf|matshow|boxplot|violinplot|errorbar|quiver|streamplot|subplot|subplots|figure'
const VISUAL_CALL = new RegExp(`^(?:pygame\\.display\\.set_mode|turtle\\.(?:${TURTLE_CALLS})|matplotlib\\.pyplot\\.(?:${PLOT_CALLS})|tkinter\\.(?:Tk|Toplevel))$`)

// Use the editor's Python syntax tree: examples inside comments, docstrings,
// and print() strings are not calls or imports. No Python code is executed here.
function analyze(source = '') {
  const imports = [], calls = []
  pythonLanguage.parser.parse(source).iterate({ enter(node) {
    if (node.name === 'ImportStatement') {
      const statement = source.slice(node.from, node.to).replace(/#[^\n]*/g, '').replace(/\\\r?\n/g, '').replace(/[()]/g, '')
      const from = statement.match(/^from\s+([.\w]+)\s+import\s+([\s\S]*)$/)
      const items = from ? from[2] : statement.replace(/^import\s+/, '')
      for (const item of items.split(',')) {
        const match = item.trim().match(/^([.\w]+|\*)(?:\s+as\s+(\w+))?$/)
        if (match) imports.push({ from: from?.[1] || '', name: match[1], alias: match[2] })
      }
    }
    if (node.name === 'CallExpression') {
      const callee = node.node.firstChild
      const name = source.slice(callee.from, callee.to).replace(/\s+/g, '')
      if (/^\w+(?:\.\w+)*$/.test(name)) calls.push(name)
    }
  } })
  const bindings = imports.map(({ from, name, alias }) => {
    const full = from ? `${from}.${name}` : name
    return { full, local: alias || (from ? name : name.split('.')[0]), prefix: !from && !alias ? name.split('.')[0] : full }
  })
  const visual = calls.some(call => bindings.some(({ full, local, prefix }) => {
    if (local === '*') return !call.includes('.') && VISUAL_CALL.test(`${full.slice(0, -1)}${call}`)
    if (call !== local && !call.startsWith(`${local}.`)) return false
    return VISUAL_CALL.test(prefix + call.slice(local.length))
  }))
  return { imports, visual }
}

export function sourceUsesVisualOutput(source = '') {
  return analyze(source).visual
}

// The popup must be requested in the Run click's user gesture. Predict using
// only the selected entry point and its local import graph, never every file
// in the project. Dynamic/unknown graphics still have the runtime SURFACE
// fallback in the editor; this is not a full Python control-flow interpreter.
export function projectUsesVisualOutput(project, runPath = project?.entrypoint || 'main.py') {
  const files = new Map((project?.files || []).filter(file => file.kind === 'python').map(file => [file.path, file]))
  const visited = new Set()
  const entryDirectory = runPath.split('/').slice(0, -1).join('/')
  const join = (directory, name) => [directory, name].filter(Boolean).join('/')
  function visit(path) {
    if (visited.has(path) || !files.has(path)) return false
    visited.add(path)
    const { imports, visual } = analyze(files.get(path).text)
    if (visual) return true
    for (const { from, name } of imports) {
      const module = from || name
      const relative = module.match(/^\.+/)?.[0].length || 0
      const parts = module.slice(relative).split('.').filter(Boolean)
      let roots = [...new Set([entryDirectory, ''])]
      if (relative) {
        const directory = path.split('/').slice(0, -1)
        if (relative > directory.length) continue
        roots = [directory.slice(0, directory.length - relative + 1).join('/')]
      }
      for (const root of roots) {
        // Importing pkg.scene also executes pkg/__init__.py.
        for (let i = 1; i <= parts.length; i++) {
          if (visit(join(root, `${parts.slice(0, i).join('/')}/__init__.py`))) return true
        }
        const base = join(root, parts.join('/'))
        if (parts.length && visit(`${base}.py`)) return true
        if (from && name !== '*' && (visit(join(base, `${name}.py`)) || visit(join(base, `${name}/__init__.py`)))) return true
      }
    }
    return false
  }
  return visit(runPath)
}
