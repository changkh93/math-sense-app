import { readCoachString } from './studioCoachStrings.mjs'

// Local, bounded inspection only. Never execute source or send these names or
// literal contents to the server. These patterns are observations, not proofs.
function readRows(source) {
  if (typeof source !== 'string' || source.length > 50000) return null
  const lines = source.replaceAll('\r\n', '\n').split('\n')
  if (lines.some(line => /^\s*\t/.test(line))) return null
  const rows = lines.map((text, i) => ({ line: i + 1, indent: text.match(/^ */)[0].length, text: '', strings: [] }))
  let row = 0
  for (let i = 0; i < source.length;) {
    const c = source[i]
    if (c === '\n') { row++; i++; continue }
    if (c === '\r') { i++; continue }
    if (c === '#') { while (i < source.length && source[i] !== '\n') i++; continue }
    const name = source.slice(i).match(/^[\p{L}_][\p{L}\p{N}_]*/u)?.[0]
    const prefix = name && /^(?:r|u|b|f|br|rb|fr|rf)$/i.test(name) && /['"]/.test(source[i + name.length] || '') ? name : ''
    if (prefix || c === '"' || c === "'") {
      const literal = readCoachString(source, i, prefix)
      if (!literal?.closed) return null
      const raw = source.slice(i, literal.end)
      rows[row].strings.push(raw)
      rows[row].text += 'STRING'
      row += raw.split('\n').length - 1
      i = literal.end
    } else if (name) {
      if (['eval', 'exec', 'getattr', 'setattr', 'globals', 'locals', '__import__'].includes(name)) return null
      rows[row].text += name; i += name.length
    } else { rows[row].text += c; i++ }
  }
  const stack = []
  let continuation = 0
  for (const row of rows) {
    row.text = row.text.trim()
    if (!row.text) continue
    if (continuation) row.continued = true
    for (const c of row.text) continuation += '([{'.includes(c) ? 1 : ')]}'.includes(c) ? -1 : 0
    while (stack.length && stack.at(-1).indent >= row.indent) stack.pop()
    row.owner = [...stack].reverse().find(item => item.kind === 'class')
    row.method = [...stack].reverse().find(item => item.kind === 'def')
    row.scopes = [...stack]
    if (row.continued) continue
    const cls = row.text.match(/^class (\w+)(?:\([^:]*\))?:$/)
    const method = row.text.match(/^def (\w+)\(self(?:,.*)?\):$/)
    const kind = cls ? 'class' : method ? 'def' : row.text.endsWith(':') ? 'block' : null
    if (kind) { row.kind = kind; row.name = cls?.[1] || method?.[1]; stack.push(row) }
  }
  return rows
}

const makeFinding = (ruleId, row, relatedLines, title, explanation, action, check) => ({
  ruleId, line: row.line, relatedLines: [...new Set(relatedLines)], title, explanation, action, check,
})

export function inspectBehavior(source, mode = 'file') {
  if (mode !== 'file') return []
  const rows = readRows(source)
  if (!rows) return []
  const findings = []
  for (const row of rows) {
    if (row.continued || !row.owner || !row.method || row.scopes.filter(s => s.kind === 'def').length !== 1) continue
    const assignment = row.text.match(/^self\.(\w+)\s*=\s*(\w+)\.type$/)
    if (!assignment) continue
    const [, base, receiver] = assignment
    if (base.length > 40 || receiver.length > 40 || base.endsWith('_type')) continue
    const owned = rows.filter(other => other.owner === row.owner && !other.continued)
    // Require the related image write in the same method, a type initialization,
    // and actual indexing by that type elsewhere in this class.
    const image = owned.find(other => other.method === row.method && other.text === `self.${base}_image = ${receiver}.image`)
    const init = owned.find(other => other.method?.name === '__init__' && other.text.startsWith(`self.${base}_type = `))
    const read = owned.find(other => other.text.includes(`[self.${base}_type]`) && /(?:color\s*=|colors?\s*=)/.test(other.text))
    const typeWriteInMethod = owned.some(other => other.method === row.method && new RegExp(`^self\\.${base}_type\\s*=`).test(other.text))
    if (!image || !init || !read || typeWriteInMethod) continue
    findings.push(makeFinding('state-field-mismatch', row, [row.owner.line, init.line, image.line, read.line],
      '이미지와 색상이 서로 다른 속성을 보고 있어요',
      `${row.line}번째 줄은 self.${base}에 값을 넣고, ${image.line}번째 줄은 이미지를 바꿔요. 하지만 ${read.line}번째 줄의 색상은 self.${base}_type을 읽어요. 파이썬은 이 두 속성을 별개로 취급하므로 실행 오류가 나지 않을 수 있어요.`,
      `목표와 테두리를 함께 바꾸려는 경우, ${row.line}번째 줄에서 갱신하는 속성이 self.${base}_type이어야 하는지 확인해 보세요. 다른 함수에서 그 속성을 갱신하는지도 함께 살펴봐요.`,
      `${row.line}번째 대입 줄 바로 앞뒤에서 print(self.${base}_type, ${receiver}.type)을 넣어 비교해 보세요. 이미지와 테두리가 함께 바뀌는지 확인해요.`))
  }
  for (const outer of rows) {
    if (outer.continued || outer.owner) continue
    const loop = outer.text.match(/^for (\w+) in range\([^()]+\):$/)
    if (!loop) continue
    const kind = loop[1]
    for (const inner of rows.filter(row => row.scopes?.at(-1) === outer)) {
      const nested = inner.text.match(/^for (\w+) in \[STRING(?:,\s*STRING)+\]:$/)
      if (!nested || nested[1] === kind) continue
      const label = nested[1]
      const body = rows.filter(row => row.scopes?.includes(inner))
      if (body.some(row => new RegExp(`^(?:${kind}|${label})\\s*=`).test(row.text))) continue
      const creation = body.find(row => !row.continued && row.strings.length === 1 && row.text.includes('pygame.image.load(STRING)') && new RegExp(`,\\s*${kind}\\)$`).test(row.text))
      // Doubled braces are literal text, not a dependency on the loop variable.
      if (!creation || !creation.strings.some(raw => /^f["']/i.test(raw) && new RegExp(`(?<!\\{)\\{${label}\\}(?!\\})`).test(raw) && !raw.includes(`{${kind}}`))) continue
      findings.push(makeFinding('loop-type-image-mismatch', outer, [inner.line, creation.line],
        '같은 종류 번호에 서로 다른 이미지가 연결될 수 있어요',
        `${outer.line}번째 줄의 ${kind}가 한 값인 동안 ${inner.line}번째 줄의 ${label}는 목록 전체를 돌아요. ${creation.line}번째 줄에서는 이미지는 ${label}로 고르고, 마지막 인자로 같은 ${kind}를 넘겨요.`,
        '마지막 인자가 몬스터 종류 번호이고 색마다 번호 하나를 주려는 의도라면, 이미지 목록을 enumerate()로 돌며 이미지와 번호를 함께 정해 보세요. 이미지 목록과 테두리 색 목록의 순서도 같아야 해요.',
        `몬스터를 만드는 줄 바로 앞에서 print(${kind}, ${label})를 실행해 보세요. 같은 번호에 여러 이미지 이름이 나오는지 확인해요.`))
    }
  }
  return findings.slice(0, 6)
}

export function behaviorError(finding) {
  return { type: 'BehaviorCheck', message: finding.ruleId, line: finding.line, eligible: true, sameFileFrames: 1 }
}
