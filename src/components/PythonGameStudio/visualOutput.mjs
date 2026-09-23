const TURTLE_CALLS = 'Screen|Turtle|RawTurtle|RawPen|Pen|forward|fd|backward|back|bk|right|rt|left|lt|goto|setpos|setposition|circle|dot|stamp|write|begin_fill|end_fill|mainloop|done'
const PLOT_CALLS = 'show|plot|scatter|imshow|bar|barh|hist|pie|stem|step|fill|fill_between|contour|contourf|matshow|boxplot|violinplot|errorbar|quiver|streamplot|subplot|subplots|figure'

function aliases(source, moduleName, fallback) {
  const names = new Set([fallback])
  const escaped = moduleName.replaceAll('.', '\\.')
  for (const match of source.matchAll(new RegExp(`(?:^|\\n)\\s*import\\s+${escaped}(?:\\s+as\\s+([A-Za-z_]\\w*))?`, 'g'))) names.add(match[1] || fallback)
  return [...names]
}

function hasModuleCall(source, names, calls) {
  return names.some(name => new RegExp(`\\b${name}\\s*\\.\\s*(?:${calls})\\s*\\(`).test(source))
}

export function sourceUsesVisualOutput(source = '') {
  if (/\bpygame\s*\.\s*display\s*\.\s*set_mode\s*\(/.test(source)) return true
  if (hasModuleCall(source, aliases(source, 'pygame', 'pygame'), 'display\\s*\\.\\s*set_mode')) return true

  const turtleAliases = aliases(source, 'turtle', 'turtle')
  if (hasModuleCall(source, turtleAliases, TURTLE_CALLS)) return true
  if (/(?:^|\n)\s*from\s+turtle\s+import\s+(?:\*|[^\n]+)/.test(source) && new RegExp(`\\b(?:${TURTLE_CALLS})\\s*\\(`).test(source)) return true

  const plotAliases = aliases(source, 'matplotlib.pyplot', 'plt')
  if (hasModuleCall(source, plotAliases, PLOT_CALLS)) return true
  if (/(?:^|\n)\s*from\s+matplotlib(?:\.pyplot)?\s+import\s+(?:\*|[^\n]+)/.test(source) && new RegExp(`\\b(?:${PLOT_CALLS})\\s*\\(`).test(source)) return true

  const tkinterAliases = [...aliases(source, 'tkinter', 'tkinter'), ...aliases(source, 'tkinter', 'tk')]
  if (hasModuleCall(source, tkinterAliases, 'Tk|Toplevel')) return true
  if (/(?:^|\n)\s*from\s+tkinter\s+import\s+(?:\*|[^\n]*\b(?:Tk|Toplevel)\b)/.test(source) && /\b(?:Tk|Toplevel)\s*\(/.test(source)) return true
  return false
}

export function projectUsesVisualOutput(project) {
  return Boolean(project?.files?.some(file => file.kind === 'python' && sourceUsesVisualOutput(file.text)))
}
