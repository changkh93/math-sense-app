import { PROJECT_LIMITS, RUNTIME_VERSION, normalizePath, validateProject } from './projectPolicy.mjs'

import { readProjectFolder } from './projectFolderImport'

self.onmessage = async ({ data: request }) => {
  try {
    if (request.mode === 'folder') {
      self.postMessage({ ok: true, ...await readProjectFolder(request.files) }); return
    }
    const file = request.file
    const python = /\.(py|ipynb)$/i.test(file.name)
    const notebook = /\.ipynb$/i.test(file.name)
    if (!python && !/\.json$/i.test(file.name)) throw new Error('프로젝트 다운로드로 받은 .mspygame.json 파일 또는 .py/.ipynb 파일을 선택해 주세요. ZIP 파일은 지원하지 않습니다.')
    if (file.size > (python ? (notebook ? PROJECT_LIMITS.assetBytes : PROJECT_LIMITS.codeBytes) : (Math.ceil(PROJECT_LIMITS.totalBytes * 4 / 3) + 1024 * 1024))) throw new Error(python ? 'Python 파일은 200 KB까지 가져올 수 있습니다.' : `프로젝트 백업 파일은 ${Math.ceil(PROJECT_LIMITS.totalBytes * 4 / 3 / 1024 / 1024) + 1} MB까지 가져올 수 있습니다.`)
    const text = await file.text()
    let input
    if (python) {
      const path = normalizePath(file.name)
      input = { id: crypto.randomUUID(), title: file.name.replace(/\.(py|ipynb)$/i, '').slice(0, 80) || '가져온 프로젝트', schemaVersion: 1, runtimeVersion: RUNTIME_VERSION, entrypoint: path, files: [{ path, text }] }
    } else {
      try { input = JSON.parse(text.replace(/^\uFEFF/, '')) }
      catch { throw new Error('프로젝트 파일을 읽을 수 없습니다. 코드 스튜디오에서 다운로드한 JSON 파일인지 확인해 주세요.') }
    }
    const project = validateProject(input)
    self.postMessage({ ok: true, project: { ...project, id: crypto.randomUUID(), revision: 0 } })
  } catch (error) {
    self.postMessage({ ok: false, message: error instanceof TypeError ? '프로젝트 파일 구조가 올바르지 않습니다. 코드 스튜디오에서 다운로드한 파일을 선택해 주세요.' : error.message })
  }
}
