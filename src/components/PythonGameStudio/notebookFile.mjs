// Native nbformat files are independent of Python scripts. Never replay imported outputs.
export function readNotebook(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > 20 * 1024 * 1024) throw new Error('노트북은 20 MB 이하로 올려 주세요.')
  let book
  try { book = JSON.parse(text.replace(/^\uFEFF/, '')) } catch { throw new Error('올바른 .ipynb 노트북 파일인지 확인해 주세요.') }
  if (book?.nbformat !== 4 || !Array.isArray(book.cells) || book.cells.length > 100) throw new Error('코드·설명 셀 100개 이하의 .ipynb 노트북을 사용해 주세요.')
  const cells = book.cells.map(cell => {
    if (!cell || !['code', 'markdown', 'raw'].includes(cell.cell_type)) throw new Error('지원하지 않는 셀 종류입니다.')
    if (!(typeof cell.source === 'string' || Array.isArray(cell.source) && cell.source.every(line => typeof line === 'string'))) throw new Error('셀 내용을 읽을 수 없습니다.')
    return { type: cell.cell_type === 'code' ? 'code' : 'markdown', source: Array.isArray(cell.source) ? cell.source.join('') : cell.source, line: 1 }
  })
  return cells.length ? cells : [{ type: 'code', source: '', line: 1 }]
}
export function writeNotebook(cells = [{ type: 'code', source: '' }]) {
  return JSON.stringify({ nbformat: 4, nbformat_minor: 5, metadata: { kernelspec: { name: 'python3', display_name: 'Python 3', language: 'python' }, language_info: { name: 'python' } }, cells: cells.map((cell, i) => ({ cell_type: cell.type, id: `cell-${i + 1}`, metadata: {}, source: cell.source, ...(cell.type === 'code' ? { execution_count: null, outputs: [] } : {}) })) }, null, 2)
}
export const normalizeNotebook = text => writeNotebook(readNotebook(text))
export function editNativeCell(text, index, source) {
  const cells = readNotebook(text)
  cells[index] = { ...cells[index], source }
  return writeNotebook(cells)
}

// Feedback consumes student-authored source only; imported execution output is not evidence.
export function notebookSourceText(text) {
  return readNotebook(text).map((cell, i) => `# [${i + 1}번 ${cell.type === 'code' ? '코드' : '설명'} 셀]\n${cell.source}`).join('\n\n')
}
