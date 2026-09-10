import { RUNTIME_VERSION } from './projectPolicy.mjs'
export function createProject(title = '나의 첫 프로젝트', text = '') {
  return { id: crypto.randomUUID(), title, schemaVersion: 1, runtimeVersion: RUNTIME_VERSION, entrypoint: 'main.py', revision: 0, files: [{ path: 'main.py', kind: 'python', text }] }
}
