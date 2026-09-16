import { pythonLanguage } from '@codemirror/lang-python'
// A single .py source is shared by both views. Only actual Python comments can
// delimit cells; '# %%' inside a triple-quoted string must remain ordinary code.
export function notebookCells(source) {
  const markers = []
  pythonLanguage.parser.parse(source).iterate({ enter(node) {
    if (node.name !== 'Comment') return
    const start = source.lastIndexOf('\n', node.from - 1) + 1
    if (source.slice(start, node.from).trim()) return
    const marker = source.slice(node.from, node.to).match(/^#\s*%%(?:\s+\[(markdown)\])?(?:\s.*)?$/)
    if (marker && markers.length < (markers[0]?.from > 0 ? 99 : 100)) markers.push({ from: start, to: source[node.to] === '\n' ? node.to + 1 : node.to, type: marker[1] ? 'markdown' : 'code' })
  } })
  const cells = []
  const add = (from, to, type) => {
    const raw = source.slice(from, to)
    cells.push({ type, source: type === 'markdown' ? raw.split('\n').map(line => line.replace(/^# ?/, '')).join('\n') : raw, from, to, line: source.slice(0, from).split('\n').length })
  }
  if (!markers.length) add(0, source.length, 'code')
  else {
    if (markers[0].from > 0) add(0, markers[0].from, 'code')
    markers.forEach((marker, i) => add(marker.to, markers[i + 1]?.from ?? source.length, marker.type))
  }
  return cells
}
const markdownSource = text => text.split('\n').map((line, i, lines) => !line && i === lines.length - 1 ? '' : '# ' + line).join('\n')
export function joinNotebookCells(cells) {
  return cells.map(cell => `# %%${cell.type === 'markdown' ? ' [markdown]' : ''}\n${cell.type === 'markdown' ? markdownSource(cell.source) : cell.source}${cell.source.endsWith('\n') ? '' : '\n'}`).join('')
}
export function editNotebookCell(source, index, text) {
  const cell = notebookCells(source)[index]
  const encoded = cell.type === 'markdown' ? markdownSource(text) : text
  return source.slice(0, cell.from) + encoded + (cell.to < source.length && !encoded.endsWith('\n') ? '\n' : '') + source.slice(cell.to)
}
export function importNotebook(text) {
  if (new TextEncoder().encode(text).length > 20 * 1024 * 1024) throw new Error('노트북은 20 MB 이하로 올려 주세요. 큰 출력은 Colab에서 지우고 저장할 수 있습니다.')
  const book = JSON.parse(text.replace(/^\uFEFF/, ''))
  if (book.nbformat !== 4 || !Array.isArray(book.cells) || book.cells.length > 100) throw new Error('코드·설명 셀 100개 이하의 .ipynb 노트북을 사용해 주세요.')
  const cells = book.cells.map(cell => {
    if (!['code', 'markdown', 'raw'].includes(cell.cell_type)) throw new Error('지원하지 않는 셀 종류입니다.')
    if (!(typeof cell.source === 'string' || Array.isArray(cell.source) && cell.source.every(line => typeof line === 'string'))) throw new Error('셀 내용을 읽을 수 없습니다.')
    return { type: cell.cell_type === 'code' ? 'code' : 'markdown', source: Array.isArray(cell.source) ? cell.source.join('') : cell.source }
  })
  return joinNotebookCells(cells.length ? cells : [{ type: 'code', source: '' }])
}
export function exportNotebook(source) {
  // Import/export source only: stale or third-party HTML/JS outputs are never replayed.
  return JSON.stringify({ nbformat: 4, nbformat_minor: 5, metadata: { kernelspec: { name: 'python3', display_name: 'Python 3', language: 'python' }, language_info: { name: 'python' } }, cells: notebookCells(source).map((cell, i) => ({ cell_type: cell.type, id: `cell-${i + 1}`, metadata: {}, source: cell.source, ...(cell.type === 'code' ? { execution_count: null, outputs: [] } : {}) })) }, null, 2)
}
