import { createProject } from './templates'
import { bytesToBase64, fileKind } from './projectPolicy.mjs'
const names = ['blue_monster.png','green_monster.png','orange_monster.png','purple_monster.png','knight.png','success.ogg','die.ogg','level_up.ogg','safe_zone.ogg']
export async function createMonsterProject() {
  const load = async path => { const response = await fetch(`/python-game-examples/${path}`); if (!response.ok) throw new Error('예제 파일을 불러오지 못했습니다. 다시 시도해 주세요.'); return response }
  const source = await (await load('monster-main.py')).text()
  const assets = await Promise.all(names.map(async path => ({ path, kind: fileKind(path), data: bytesToBase64(new Uint8Array(await (await load(path)).arrayBuffer())) })))
  const project = createProject('몬스터 잡기', source)
  project.files.push(...assets)
  return project
}
