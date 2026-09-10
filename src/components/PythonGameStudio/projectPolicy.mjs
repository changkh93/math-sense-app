export const PROJECT_LIMITS = Object.freeze({ files: 100, codeBytes: 200 * 1024, assetBytes: 5 * 1024 * 1024, totalBytes: 6 * 1024 * 1024 })
export const RUNTIME_VERSION = 'pygame-web-0.9-cp312-v1'
const types = { py: 'python', csv: 'csv', png: 'image', jpg: 'image', jpeg: 'image', webp: 'image', ogg: 'audio', wav: 'audio', mp3: 'audio', ttf: 'font', otf: 'font' }
export function normalizeFolderPath(input) {
  if (typeof input !== 'string') throw new Error('파일 이름을 확인해 주세요.')
  const path = input.normalize('NFC')
  if (!path || path.length > 180 || /[\\\x00-\x1f\x7f:]/.test(path) || path.split('/').some(p => !p || p === '.' || p === '..' || p.startsWith('.'))) throw new Error('프로젝트 안의 상대경로를 사용해 주세요. 예: images/hero.png')
  return path
}
export function normalizePath(input) {
  const path = normalizeFolderPath(input)
  if (!types[path.split('.').pop().toLowerCase()]) throw new Error('Python, CSV, PNG/JPG/WebP, OGG/WAV/MP3, TTF/OTF 파일을 사용해 주세요.')
  return path
}
export function fileKind(path) { return types[normalizePath(path).split('.').pop().toLowerCase()] }
export function bytesToBase64(bytes) {
  let result = ''
  for (let i = 0; i < bytes.length; i += 32768) result += String.fromCharCode(...bytes.subarray(i, i + 32768))
  return btoa(result)
}
export function base64ToBytes(data) {
  if (typeof data !== 'string' || data.length > 8 * 1024 * 1024 || (data.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(data))) throw new Error('파일 데이터가 올바르지 않습니다.')
  return Uint8Array.from(atob(data), c => c.charCodeAt(0))
}
export function validateAsset(path, bytes) {
  const ext = path.split('.').pop().toLowerCase()
  if (ext === 'csv') {
    if (bytes.length > PROJECT_LIMITS.codeBytes || bytes.includes(0)) throw new Error(`${path}: CSV는 200 KB 이하 UTF-8 텍스트를 사용해 주세요.`)
    try { new TextDecoder('utf-8', { fatal: true }).decode(bytes) }
    catch { throw new Error(`${path}: CSV를 UTF-8 형식으로 저장해 주세요.`) }
    return
  }
  const head = String.fromCharCode(...bytes.subarray(0, 12))
  const valid = ext === 'png' ? head.startsWith('\x89PNG\r\n\x1a\n')
    : ['jpg', 'jpeg'].includes(ext) ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : ext === 'webp' ? head.startsWith('RIFF') && head.slice(8) === 'WEBP'
    : ext === 'ogg' ? head.startsWith('OggS')
    : ext === 'wav' ? head.startsWith('RIFF') && head.slice(8) === 'WAVE'
    : ext === 'mp3' ? head.startsWith('ID3') || (bytes[0] === 255 && (bytes[1] & 224) === 224)
    : ['ttf','otf'].includes(ext) ? head.startsWith('\x00\x01\x00\x00') || head.startsWith('OTTO') || head.startsWith('true')
    : false
  if (!valid) throw new Error(`${path}: 파일 내용과 확장자가 일치하지 않습니다.`)
}

// Runtime output may only update CSV in the same project and only if its prior
// contents still match the run snapshot (or the last accepted runtime write).
export function applyRuntimeCsv(project, projectId, file, expectedData) {
  if (!project || project.id !== projectId) throw new Error('실행 중 프로젝트가 바뀌어 CSV 저장을 건너뛰었습니다.')
  const path = normalizePath(file.path)
  if (fileKind(path) !== 'csv') throw new Error('실행 결과는 CSV 파일로만 저장할 수 있습니다.')
  const previous = project.files.find(item => item.path === path)
  if (previous?.data !== expectedData) throw new Error(`${path}: 실행 중 파일이 변경되어 덮어쓰지 않았습니다. 다시 실행해 주세요.`)
  const next = { path, kind: 'csv', data: file.data }
  return validateProject({ ...project, files: previous ? project.files.map(item => item.path === path ? next : item) : [...project.files, next] })
}
export function validateProject(input) {
  if (!input || typeof input !== 'object' || input.schemaVersion !== 1 || input.runtimeVersion !== RUNTIME_VERSION) throw new Error('지원하지 않는 프로젝트 버전입니다.')
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(input.id)) throw new Error('프로젝트 ID가 올바르지 않습니다.')
  if (typeof input.title !== 'string' || !input.title.trim() || input.title.length > 80) throw new Error('프로젝트 이름은 1~80자로 입력해 주세요.')
  if (!Array.isArray(input.files) || !input.files.length || input.files.length > PROJECT_LIMITS.files) throw new Error('프로젝트 파일은 1~100개까지 사용할 수 있습니다.')
  const seen = new Set(); let totalBytes = 0
  const files = input.files.map(file => {
    const path = normalizePath(file.path), key = path.toLowerCase(), kind = fileKind(path)
    if (seen.has(key)) throw new Error(`${path}: 이름이 겹치는 파일이 있습니다.`)
    seen.add(key)
    if (kind === 'python' && typeof file.text !== 'string') throw new Error(`${path}: 코드가 올바르지 않습니다.`)
    const bytes = kind === 'python' ? new TextEncoder().encode(file.text) : base64ToBytes(file.data)
    if (bytes.length > (kind === 'python' ? PROJECT_LIMITS.codeBytes : PROJECT_LIMITS.assetBytes)) throw new Error(`${path}: 파일 크기 제한을 초과했습니다.`)
    if (kind !== 'python') validateAsset(path, bytes)
    totalBytes += bytes.length
    return kind === 'python' ? { path, kind, text: file.text } : { path, kind, data: file.data }
  })
  for (const path of seen) {
    const parts = path.split('/'); parts.pop()
    while (parts.length) { if (seen.has(parts.join('/'))) throw new Error('파일과 폴더 이름이 겹칩니다.'); parts.pop() }
  }
  if (input.folders !== undefined && (!Array.isArray(input.folders) || input.folders.length > 100)) throw new Error('폴더는 100개까지 만들 수 있습니다.')
  const folderMap = new Map()
  const addFolder = value => {
    const path = normalizeFolderPath(value), parts = path.split('/')
    for (let count = 1; count <= parts.length; count++) {
      const folder = parts.slice(0, count).join('/'), key = folder.toLowerCase()
      if (seen.has(key)) throw new Error(`${folder}: 파일과 폴더 이름이 겹칩니다.`)
      if (folderMap.has(key) && folderMap.get(key) !== folder) throw new Error(`${folder}: 대소문자만 다른 폴더 이름이 있습니다.`)
      folderMap.set(key, folder)
    }
  }
  for (const folder of input.folders || []) addFolder(folder)
  for (const file of files) { const parent = file.path.split('/').slice(0, -1).join('/'); if (parent) addFolder(parent) }
  if (folderMap.size > 100) throw new Error('폴더는 100개까지 만들 수 있습니다.')
  const folders = [...folderMap.values()].sort()
  if (totalBytes > PROJECT_LIMITS.totalBytes) throw new Error('프로젝트는 총 6 MB까지 저장할 수 있습니다.')
  const entrypoint = normalizePath(input.entrypoint)
  if (!files.some(f => f.path === entrypoint && f.kind === 'python')) throw new Error('실행할 Python 파일이 없습니다.')
  const revision = input.revision ?? 0
  if (!Number.isSafeInteger(revision) || revision < 0) throw new Error('저장 버전이 올바르지 않습니다.')
  return { id: input.id, title: input.title.trim(), schemaVersion: 1, runtimeVersion: RUNTIME_VERSION, entrypoint, revision, files, folders, totalBytes }
}
export function toRunnerProject(project) {
  const valid = validateProject(project)
  return { entrypoint: valid.entrypoint, folders: valid.folders, files: valid.files.map(f => ({ path: f.path, data: f.kind === 'python' ? bytesToBase64(new TextEncoder().encode(f.text)) : f.data })) }
}
