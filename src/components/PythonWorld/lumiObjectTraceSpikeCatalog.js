/**
 * LUMI Protocol Object Trace Technical Spike Catalog (Development Isolated)
 * Strictly isolated from production catalog, reward ledger, and student progression.
 */

export const OBJECT_TRACE_SPIKE_MISSIONS = Object.freeze([
  {
    id: 'spike-obj-01',
    codeName: 'SPIKE-01',
    isSpike: true,
    persistencePolicy: 'none',
    title: '홀로그램 설계도와 첫 드론',
    unitTitle: 'Object Trace Spike: Class & Instance',
    actTitle: 'OBJECT TRACE SPIKE',
    concept: 'class, instance',
    experienceType: 'lumi_spike',
    description: '로봇 공장의 홀로그램 설계도(class)를 등록하고 첫 번째 탐사 드론(instance)을 조립합니다.',
    briefing: 'Drone 클래스를 정의하고, Drone()으로 scout 드론 1대를 조립하여 변수에 저장하세요.',
    checklist: [
      'class Drone: 설계도 정의하기',
      'scout = Drone() 실제 드론 1대 조립하기',
    ],
    goals: [
      { type: 'classCountAtLeast', count: 1, label: 'Drone 클래스(설계도) 등록' },
      { type: 'classDefined', className: 'Drone', label: 'Drone 이름의 클래스 정의' },
      { type: 'distinctInstanceCount', count: 1, label: 'scout 드론 1대 조립' },
    ],
    conceptEvidence: {
      mustUse: ['class'],
    },
    tools: {
      editor: true,
      trace: true,
      memory: true,
      reset: true,
      replay: true,
    },
    starterCode: `# 1. Drone 클래스(설계도)를 정의하세요.
class Drone:
    pass

# 2. Drone 설계도로 실제 드론 1대를 조립하여 scout 변수에 저장하세요.
# 예: scout = Drone()

`,
    solutionCode: `class Drone:
    pass

scout = Drone()
`,
    lumiVoice: '설계도(class)로부터 실제 드론 인스턴스가 조립되었습니다.',
  },
  {
    id: 'spike-obj-02',
    codeName: 'SPIKE-02',
    isSpike: true,
    persistencePolicy: 'none',
    title: '자신을 가리키는 신호 self와 상태 격리',
    unitTitle: 'Object Trace Spike: Method & Self',
    actTitle: 'OBJECT TRACE SPIKE',
    concept: '__init__, self, method',
    experienceType: 'lumi_spike',
    description: '드론 클래스에 초기 상태와 충전 메서드를 정의하고, 두 대 중 scout_1만 충전하여 self의 격리 동작을 관찰합니다.',
    briefing: 'scout_1의 charge(10) 메서드를 호출하여 scout_1만 30으로 충전하세요. scout_2의 내구도는 20을 유지해야 합니다.',
    checklist: [
      '드론 2대 (scout_1, scout_2) 생성',
      'scout_1.charge(10) 메서드 호출하기',
      'scout_1의 내구도만 30으로 충전 (scout_2는 20 유지)',
    ],
    goals: [
      { type: 'distinctInstanceCount', count: 2, label: '드론 인스턴스 2대 생성' },
      { type: 'runtimeMethodCalled', methodName: 'charge', label: 'charge() 충전 메서드 호출' },
      { type: 'instancesHaveDistinctState', attribute: 'integrity', label: '두 드론의 내구도 상태 분리' },
      { type: 'instanceAttributeEquals', binding: 'scout_1', attribute: 'integrity', value: 30, label: 'scout_1 내구도 30으로 충전' },
      { type: 'instanceAttributeEquals', binding: 'scout_2', attribute: 'integrity', value: 20, label: 'scout_2 내구도 20 유지' },
    ],
    conceptEvidence: {
      mustUse: ['class', '__init__', 'self', 'method'],
    },
    tools: {
      editor: true,
      trace: true,
      memory: true,
      reset: true,
      replay: true,
    },
    starterCode: `class Drone:
    def __init__(self, name, integrity):
        self.name = name
        self.integrity = integrity

    def charge(self, amount):
        self.integrity += amount

scout_1 = Drone("ALPHA", 20)
scout_2 = Drone("BETA", 20)

# TODO: scout_1만 10만큼 충전하세요. (scout_2는 그대로 유지)

`,
    solutionCode: `class Drone:
    def __init__(self, name, integrity):
        self.name = name
        self.integrity = integrity

    def charge(self, amount):
        self.integrity += amount

scout_1 = Drone("ALPHA", 20)
scout_2 = Drone("BETA", 20)
scout_1.charge(10)
`,
    lumiVoice: 'scout_1만 충전되었고, scout_2는 원래 상태를 유지합니다. self가 정확한 대상을 가리켰습니다.',
  },
])

export const LUMI_OBJECT_TRACE_SPIKE_SET = Object.freeze({
  id: 'lumi-spike-object-trace-v1',
  version: 1,
  kind: 'technical-spike',
  persistencePolicy: 'official',
  rewardPolicy: 'standard-crystals',
  dailyRecordPolicy: 'official',
  actId: 'technical-spike-object-trace',
  unitId: 'lumi_protocol_spike_object_trace',
  lumiCourseId: 'lumi-season-1',
  title: 'OBJECT TRACE LAB',
  description: 'Class, Instance, Self 및 Attribute In-place Mutation을 직접 관찰하는 객체 Trace 학습 랩',
  missions: OBJECT_TRACE_SPIKE_MISSIONS.map((mission) => ({
    ...mission,
    persistencePolicy: 'official',
    rewardPolicy: 'standard-crystals',
  })),
})

export function getObjectTraceSpikeMissionById(missionId) {
  if (!missionId) return null
  const normalized = String(missionId).trim().toLowerCase()
  return OBJECT_TRACE_SPIKE_MISSIONS.find((m) =>
    m.id.toLowerCase() === normalized || m.codeName.toLowerCase() === normalized
  ) || null
}
