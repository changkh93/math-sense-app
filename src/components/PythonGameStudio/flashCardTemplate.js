import { createProject } from './templates.js'
import { bytesToBase64, fileKind, validateProject } from './projectPolicy.mjs'

const paths = [
  'data/eng_word.csv',
  'image/card_front.png',
  'image/card_back.png',
  'image/right.png',
  'image/wrong.png',
]

export async function createFlashCardProject() {
  const files = await Promise.all(paths.map(async path => {
    const response = await fetch(`/flash-card/${path}`)
    if (!response.ok) throw new Error('Flash Card 수업 자료를 불러오지 못했습니다. 다시 시도해 주세요.')
    return { path, kind: fileKind(path), data: bytesToBase64(new Uint8Array(await response.arrayBuffer())) }
  }))
  const project = createProject('Flash Card', '')
  project.folders = ['data', 'image']
  project.files.push(...files)
  return validateProject(project)
}
