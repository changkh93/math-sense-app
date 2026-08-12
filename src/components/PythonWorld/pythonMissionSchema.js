const ID_PATTERN = /^[a-z0-9][a-z0-9_-]{2,79}$/

export function validatePythonMissionSet(missionSet) {
  const errors = []
  if (!missionSet || typeof missionSet !== 'object') return ['미션 세트 JSON은 객체여야 합니다.']
  if (!ID_PATTERN.test(String(missionSet.id || ''))) errors.push('세트 id는 영문 소문자·숫자·-·_로 구성된 3~80자여야 합니다.')
  if (!String(missionSet.title || '').trim()) errors.push('세트 title이 필요합니다.')
  if (!Number.isInteger(Number(missionSet.version)) || Number(missionSet.version) < 1) errors.push('version은 1 이상의 정수여야 합니다.')
  if (!Array.isArray(missionSet.missions) || missionSet.missions.length === 0) {
    errors.push('missions 배열에 한 개 이상의 미션이 필요합니다.')
    return errors
  }
  if (missionSet.missions.length > 30) errors.push('한 세트에는 최대 30개 미션만 둘 수 있습니다.')

  const ids = new Set()
  missionSet.missions.forEach((mission, index) => {
    const prefix = `missions[${index}]`
    if (!ID_PATTERN.test(String(mission?.id || ''))) errors.push(`${prefix}.id 형식이 올바르지 않습니다.`)
    if (ids.has(mission?.id)) errors.push(`${prefix}.id가 중복되었습니다: ${mission.id}`)
    ids.add(mission?.id)
    if (!String(mission?.title || '').trim()) errors.push(`${prefix}.title이 필요합니다.`)
    if (!String(mission?.objective || '').trim()) errors.push(`${prefix}.objective가 필요합니다.`)
    if (typeof mission?.starterCode !== 'string') errors.push(`${prefix}.starterCode는 문자열이어야 합니다.`)
    if (!mission?.world || typeof mission.world !== 'object') errors.push(`${prefix}.world가 필요합니다.`)
    if (!mission?.goal && (!Array.isArray(mission?.goals) || mission.goals.length === 0)) errors.push(`${prefix}.goal 또는 goals가 필요합니다.`)
    if (!Array.isArray(mission?.concepts)) errors.push(`${prefix}.concepts는 배열이어야 합니다.`)
    if (!Array.isArray(mission?.hints)) errors.push(`${prefix}.hints는 배열이어야 합니다.`)
  })
  return errors
}

export function createPublishableMissionSet(missionSet, status = 'draft') {
  return {
    ...missionSet,
    version: Number(missionSet.version || 1),
    status: status === 'published' ? 'published' : 'draft',
    missions: missionSet.missions.map((mission, index) => ({
      ...mission,
      order: Number(mission.order || index + 1),
      hiddenVariants: Array.isArray(mission.hiddenVariants) ? mission.hiddenVariants : [],
      hints: Array.isArray(mission.hints) ? mission.hints : [],
    })),
  }
}
