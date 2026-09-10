import { createProject } from './templates'
import { bytesToBase64, fileKind, validateProject } from './projectPolicy.mjs'

const assets = [
  'scout.png', 'raider.png', 'DoHyeon-Regular.ttf',
  'scout_pulse.ogg', 'raider_pulse.ogg', 'raider_break.ogg',
  'shield_hit.ogg', 'line_alert.ogg', 'wave_ready.ogg',
]

// Learners write main.py from the Data Log. Preparing materials never inserts a
// finished game or replaces an existing draft, and makes no learning claim.
export async function createSpaceInvadersProject(checkpoint = '') {
  if (checkpoint && !/^(?:final-main|(?:experiments\/)?(?:0[1-9]|10)-[A-Z])$/.test(checkpoint)) {
    throw new Error('올바른 수업 단계를 선택해 주세요.')
  }
  const load = async path => {
    const response = await fetch(`/space-invaders/${path}`)
    if (!response.ok) throw new Error('우주 방어대 수업 자료를 불러오지 못했습니다. 다시 시도해 주세요.')
    return response
  }
  const codePath = checkpoint.startsWith('experiments/') ? `${checkpoint}.py` : `checkpoints/${checkpoint}.py`
  const code = checkpoint ? await (await load(codePath)).text() : ''
  const project = createProject(checkpoint ? `우주 방어대 - 비교 ${checkpoint}` : '우주 방어대 - Space Invaders', code)
  const files = await Promise.all(assets.map(async name => ({
    path: `assets/${name}`, kind: fileKind(name),
    data: bytesToBase64(new Uint8Array(await (await load(`assets/${name}`)).arrayBuffer())),
  })))
  const credits = await (await load('asset_credits.py')).text()
  project.files.push(...files, { path: 'asset_credits.py', kind: 'python', text: credits })
  return validateProject(project)
}
