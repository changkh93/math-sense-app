/**
 * LUMI Protocol Gate 3: Tactical Vertical Slice Pilot Catalog
 * 
 * Strict Isolation:
 * - kind: 'tactical-pilot'
 * - persistencePolicy: 'none'
 * - rewardPolicy: 'none'
 * - dailyRecordPolicy: 'none'
 * - assignmentEvidencePolicy: 'none'
 */

export const PILOT_TACTICAL_MISSIONS = [
  {
    id: 'pilot-tactical-3-01',
    codeName: '3-01',
    title: '손상된 편대 신호 정화',
    subtitle: 'Class + Instance + List + For 정화 전술',
    summary: '탐사 드론 편대의 오염 신호를 list와 for 반복문으로 순회하며 모두 정화(purify_signal)합니다.',
    difficulty: 'guided',
    isSpike: true,
    isPilot: true,
    isTacticalMission: true,
    gate: 'gate-3',
    persistencePolicy: 'none',
    rewardPolicy: 'none',
    dailyRecordPolicy: 'none',
    assignmentEvidencePolicy: 'none',
    world: {
      width: 8,
      height: 5,
      rover: { x: 0, y: 2, direction: 0, energy: 100, awake: true },
      entitySpecs: [
        { name: 'NOVA-1', corruption: 10 },
        { name: 'NOVA-2', corruption: 20 },
        { name: 'NOVA-3', corruption: 30 },
      ],
    },
    scaffold: {
      mode: 'code',
      autoImport: true,
      visibleTools: ['run', 'reset', 'step', 'replay', 'inspector'],
    },
    tacticalProjection: {
      entitySource: 'python_instances',
      requiredAttributes: ['name', 'corruption'],
      targetMethod: 'purify_signal',
      stateAttribute: 'corruption',
      restoredWhen: { lte: 0 },
      initialState: 'DETECTED',
    },
    storyIntro: '관제사님! 통신망에서 오염된 탐사 드론 편대 3대의 조난 신호가 감지되었습니다. Drone 클래스를 작성하고 list와 for 루프로 각 드론에 purify_signal()을 보내 모두 복구하세요.',
    briefing: 'Drone 클래스를 정의하고, 3대의 드론을 만들어 리스트에 넣은 뒤 for 반복문으로 각 드론의 purify_signal()을 호출해 오염도(corruption)를 0으로 정화하세요.',
    checklist: [
      'class Drone 설계도 정의 (__init__, purify_signal)',
      '드론 3대 생성하여 squad 리스트에 보관',
      'for drone in squad: 반복문으로 purify_signal() 호출',
      '모든 드론의 오염도가 0 이하로 정화 (RESTORED)',
    ],
    memoryFragment: {
      label: 'TACTICAL FLEET PURIFICATION PATTERN',
      code: 'for spec in world.entity_specs:\n    squad.append(Drone(spec["name"], ?))\n\nfor drone in squad:\n    drone.purify_signal(?)',
      autoPlay: false,
    },
    starterCode: `# 1. Drone 클래스를 정의하세요.
class Drone:
    def __init__(self, name, corruption):
        self.name = name
        self.corruption = corruption

    def purify_signal(self, amount):
        self.corruption = self.corruption - amount

# 2. world.entity_specs의 신호 수만큼 드론을 만들어 squad에 담으세요.
squad = []
for spec in world.entity_specs:
    # TODO: spec의 name과 corruption으로 Drone을 만들고 squad에 append하세요.
    pass

# 3. for 반복문으로 모든 드론의 현재 corruption만큼 정화 신호를 보내세요.

`,
    conceptEvidence: {
      mustUse: ['class', 'def', 'for', 'list', 'self'],
      mustCall: ['purify_signal'],
    },
    goals: [
      { type: 'distinctInstanceCountEquals', count: 3, label: '드론 인스턴스 3대 생성' },
      { type: 'instancesCollectedInSequence', label: '드론 인스턴스를 리스트에 보관' },
      { type: 'methodCalledOnEveryInstance', methodName: 'purify_signal', label: '모든 드론에 purify_signal 호출' },
      { type: 'attributeChangedInsideReceiverMethod', methodName: 'purify_signal', attribute: 'corruption', label: '메서드 안에서 corruption 감소' },
      { type: 'allInstancesAttributeSatisfy', attribute: 'corruption', lte: 0, label: '모든 드론의 corruption <= 0 달성' },
      { type: 'allEntitiesRestored', label: '편대의 모든 드론 신호 복구 (RESTORED)' },
    ],
    hiddenVariants: [
      {
        id: 'pilot-tactical-3-01-var-a',
        label: 'Transfer Variant A: 2대 편대',
        world: {
          entitySpecs: [
            { name: 'ALPHA', corruption: 15 },
            { name: 'BETA', corruption: 25 },
          ],
        },
        goals: [
          { type: 'distinctInstanceCountEquals', count: 2, label: '드론 2대 생성' },
          { type: 'allEntitiesRestored', label: '2대 모두 복구' },
        ],
      },
      {
        id: 'pilot-tactical-3-01-var-b',
        label: 'Transfer Variant B: 4대 편대',
        world: {
          entitySpecs: [
            { name: 'S-1', corruption: 10 },
            { name: 'S-2', corruption: 20 },
            { name: 'S-3', corruption: 30 },
            { name: 'S-4', corruption: 40 },
          ],
        },
        goals: [
          { type: 'distinctInstanceCountEquals', count: 4, label: '드론 4대 생성' },
          { type: 'allEntitiesRestored', label: '4대 모두 복구' },
        ],
      },
    ],
    reflectionQuestions: [
      'for 루프를 사용하면 드론이 3대이든 100대이든 같은 코드로 정화할 수 있을까요?',
      'purify_signal 안의 self는 for 루프가 돌 때마다 어떻게 바뀌었을까요?',
    ],
  },
]

export const LUMI_OBJECT_TACTICAL_PILOT_SET = {
  id: 'lumi-object-tactical-pilot-v1',
  kind: 'tactical-pilot',
  actId: 'object-tactical-pilot',
  title: 'Gate 3: Tactical Pilot (3-01)',
  subtitle: 'Class + Instance + List/For 정화 전술 Vertical Slice',
  version: 1,
  persistencePolicy: 'official',
  rewardPolicy: 'standard-crystals',
  dailyRecordPolicy: 'official',
  assignmentEvidencePolicy: 'python-only',
  unitId: 'lumi_protocol_tactical_pilot',
  lumiCourseId: 'lumi-season-1',
  missions: PILOT_TACTICAL_MISSIONS.map((mission) => ({
    ...mission,
    persistencePolicy: 'official',
    rewardPolicy: 'standard-crystals',
  })),
}
