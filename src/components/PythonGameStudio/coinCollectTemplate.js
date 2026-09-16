import { createProject } from './templates.js'
import { bytesToBase64, fileKind, validateProject } from './projectPolicy.mjs'

const paths = [
  'coin.png',
  'hero.png',
  'success.mp3',
  'fail.mp3',
  'game-music.mp3',
  'NightPumpkind-1GpGv.ttf',
]

export async function createCoinCollectProject() {
  const files = await Promise.all(paths.map(async path => {
    const response = await fetch(`/coin-collect/${path}`)
    if (!response.ok) throw new Error('동전 모으기 수업 자료를 불러오지 못했습니다. 다시 시도해 주세요.')
    return { path, kind: fileKind(path), data: bytesToBase64(new Uint8Array(await response.arrayBuffer())) }
  }))
  const project = createProject('동전 모으기', '')
  project.files.push(...files)
  return validateProject(project)
}
