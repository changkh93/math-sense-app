import { createProject } from './templates'
import { validateProject } from './projectPolicy.mjs'

export async function createMarsExpeditionProject(checkpoint = '') {
  if (checkpoint && !/^(?:final-main|(?:experiments\/)?(?:0[1-9]|[12]\d|3[01])-[A-Z])$/.test(checkpoint)) {
    throw new Error('올바른 화성 탐사대 단계를 선택해 주세요.')
  }
  const load = async path => {
    const response = await fetch(`/mars-expedition/${path}`)
    if (!response.ok) throw new Error('화성 탐사대 수업 자료를 불러오지 못했습니다. 다시 시도해 주세요.')
    return response
  }
  const starter = validateProject(await (await load('mars-expedition-starter.mspygame.json')).json())
  const path = checkpoint.startsWith('experiments/') ? `${checkpoint}.py` : `checkpoints/${checkpoint}.py`
  const code = checkpoint ? new TextDecoder('utf-8', { fatal: true }).decode(await (await load(path)).arrayBuffer()) : ''
  const project = createProject(checkpoint ? `화성 탐사대 - 비교 ${checkpoint}` : '화성 탐사대: 신호 복구', code)
  project.files.push(...starter.files.filter(file => file.path !== 'main.py'))
  return validateProject(project)
}
