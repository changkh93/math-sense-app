import { validateProject } from './projectPolicy.mjs'

export function createStudioAttachments(project, { paths = [] } = {}) {
  const checked = validateProject(project)
  const name = Array.from(checked.title).filter(char => char.charCodeAt(0) >= 32).join('').replace(/[\\/:*?"<>|]/g, '_').replace(/^\.+/, '').slice(0, 70) || 'game'
  if (!paths.length) throw new Error('첨부할 Python 또는 노트북 파일을 선택해 주세요.')
  return [...new Set(paths)].map(path => {
    const file = checked.files.find(item => item.path === path)
    if (!file) throw new Error(`${path}: 파일이 변경되었습니다. 목록을 새로고침해 주세요.`)
    if (!['python', 'notebook'].includes(file.kind) || !/\.(py|ipynb)$/i.test(file.path)) throw new Error('코드 스튜디오에서는 .py와 .ipynb 파일만 첨부할 수 있습니다.')
    return new File([file.text], `${name}/${path}`, { type: file.kind === 'notebook' ? 'application/x-ipynb+json' : 'text/x-python' })
  })
}
