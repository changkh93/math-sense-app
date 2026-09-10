import { PROJECT_LIMITS, RUNTIME_VERSION, bytesToBase64, fileKind, normalizePath, validateProject } from './projectPolicy.mjs'

const supported = /\.(py|csv|png|jpe?g|webp|ogg|wav|mp3|ttf|otf)$/i
const ignoredDirectories = new Set(['__pycache__', 'node_modules', 'venv', 'env'])
export async function readProjectFolder(entries) {
  if (!entries.length) throw new Error('폴더 안에 파일이 없습니다.')
  const root = entries[0].relativePath.split('/')[0]
  if (!root || !entries[0].relativePath.includes('/')) throw new Error('프로젝트 폴더를 선택해 주세요.')
  const selected = [], skipped = []
  let totalBytes = 0
  for (const { file, relativePath } of entries) {
    if (!relativePath.startsWith(`${root}/`)) throw new Error('하나의 프로젝트 폴더를 선택해 주세요.')
    const path = relativePath.slice(root.length + 1)
    const parts = path.split('/')
    if (parts.some(part => part.startsWith('.')) || parts.slice(0, -1).some(part => ignoredDirectories.has(part)) || !supported.test(path)) {
      skipped.push(path); continue
    }
    const normalized = normalizePath(path), kind = fileKind(normalized)
    if (file.size > (kind === 'python' ? PROJECT_LIMITS.codeBytes : PROJECT_LIMITS.assetBytes)) throw new Error(`${path}: 파일 크기 제한을 초과했습니다.`)
    totalBytes += file.size
    if (totalBytes > PROJECT_LIMITS.totalBytes) throw new Error('가져올 파일의 합계가 6 MB를 넘습니다. 필요한 파일만 모은 폴더를 선택해 주세요.')
    selected.push({ file, path: normalized, kind })
    if (selected.length > PROJECT_LIMITS.files) throw new Error('프로젝트는 파일 100개까지 가져올 수 있습니다.')
  }
  const pythonPaths = selected.filter(item => item.kind === 'python').map(item => item.path).sort()
  if (!pythonPaths.length) throw new Error('폴더 안에 실행할 Python(.py) 파일이 없습니다.')
  const entrypoint = pythonPaths.includes('main.py') ? 'main.py' : pythonPaths.length === 1 ? pythonPaths[0] : pythonPaths.find(path => path.endsWith('/main.py')) || pythonPaths[0]
  const files = []
  for (const { file, path, kind } of selected) {
    files.push(kind === 'python' ? { path, kind, text: await file.text() } : { path, kind, data: bytesToBase64(new Uint8Array(await file.arrayBuffer())) })
  }
  const project = validateProject({ id: crypto.randomUUID(), title: root.slice(0, 80), schemaVersion: 1, runtimeVersion: RUNTIME_VERSION, entrypoint, files })
  return { project, skippedCount: skipped.length, skippedPaths: skipped.slice(0, 8), needsEntryChoice: !pythonPaths.includes('main.py') && pythonPaths.length > 1 }
}
