import { normalizePath, validateProject } from './projectPolicy.mjs'
export function folderPaths(project) {
  const paths = new Set(project.folders || [])
  for (const path of [...paths, ...project.files.map(file => file.path)]) {
    const parts = path.split('/'); parts.pop()
    while (parts.length) { paths.add(parts.join('/')); parts.pop() }
  }
  return [...paths].sort()
}

// Move the project entry, not its bytes; preserve empty source folders and entrypoint.
export function moveProjectFile(project, sourcePath, destination) {
  const source = project.files.find(file => file.path === sourcePath)
  if (!source) throw new Error('이동할 파일을 찾지 못했습니다.')
  const folders = folderPaths(project)
  if (destination && !folders.includes(destination)) throw new Error('이동할 폴더를 찾지 못했습니다.')
  const path = normalizePath([destination, sourcePath.split('/').at(-1)].filter(Boolean).join('/'))
  if (path === sourcePath) return { project, path, changed: false }
  if (project.files.some(file => file.path.toLowerCase() === path.toLowerCase())) throw new Error(`${path}: 같은 이름의 파일이 있습니다. 이름을 변경한 뒤 이동해 주세요.`)
  return { project: validateProject({ ...project, folders, entrypoint: project.entrypoint === sourcePath ? path : project.entrypoint, files: project.files.map(file => file.path === sourcePath ? { ...file, path } : file) }), path, changed: true }
}
