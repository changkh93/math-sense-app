/**
 * LUMI Protocol Gate 6: Final 'THE LOST LIGHT' Catalog (F-01 ~ F-04)
 * 
 * Final Official Policy:
 * - kind: 'official-act'
 * - persistencePolicy: 'official'
 * - rewardPolicy: 'standard-crystals'
 * - dailyRecordPolicy: 'python-act-summary'
 * - assignmentEvidencePolicy: 'python-course-summary'
 */

export const LOST_LIGHT_FINAL_MISSIONS = [
  {
    id: 'lumi-lost-light-f-01',
    codeName: 'F-01',
    title: '구조 신호 우선순위',
    subtitle: '오염도와 거리에 따른 최우선 대상 선정',
    summary: '신호 목록에서 오염도(corruption)가 가장 높은 긴급 구조 대상을 탐색하여 선택합니다.',
    difficulty: 'hard',
    gate: 'gate-6',
    coreOrOptional: 'core',
    persistencePolicy: 'official',
    rewardPolicy: 'standard-crystals',
    dailyRecordPolicy: 'python-act-summary',
    assignmentEvidencePolicy: 'python-course-summary',
    world: {
      width: 8,
      height: 5,
      rover: { x: 0, y: 2, direction: 0, energy: 100, awake: true },
      entitySpecs: [
        { name: 'ALPHA', corruption: 20 },
        { name: 'BETA', corruption: 50 },
        { name: 'GAMMA', corruption: 30 },
      ],
    },
    scaffold: {
      mode: 'code',
      autoImport: true,
      visibleTools: ['run', 'reset', 'step', 'replay', 'inspector'],
    },
    storyIntro: '조난 신호가 여러 개 감지되었습니다. 오염도가 가장 높은 긴급 대상을 먼저 찾아 구조해야 합니다.',
    briefing: 'find_urgent(signals) 함수를 정의하여 corruption이 가장 큰 딕셔너리의 name을 찾아 target_name 변수에 저장하세요.',
    checklist: [
      'find_urgent(signals) 함수 정의 (비교 및 최대값 탐색)',
      'target_name에 가장 긴급한 신호의 name 저장',
    ],
    starterCode: `signals = world.entity_specs

def find_urgent(signal_list):
    urgent = signal_list[0]
    # TODO: 모든 신호를 비교하여 corruption이 가장 큰 신호를 urgent에 저장하세요.
    return urgent["name"]

target_name = find_urgent(signals)
`,
    conceptEvidence: {
      mustUse: ['def', 'for', 'if', 'return'],
      mustCall: ['find_urgent'],
    },
    goals: [
      { type: 'variableDefined', name: 'target_name', label: 'target_name 변수 정의' },
      { type: 'variableValueEquals', name: 'target_name', value: 'BETA', label: '가장 오염도가 높은 BETA 선정' },
    ],
    hiddenVariants: [
      {
        id: 'lumi-lost-light-f-01-var-a',
        label: 'Transfer Variant A: 신호 순서 및 값 변경',
        world: {
          entitySpecs: [
            { name: 'DELTA', corruption: 70 },
            { name: 'EPSILON', corruption: 15 },
            { name: 'ZETA', corruption: 40 },
          ],
        },
        goals: [
          { type: 'variableValueEquals', name: 'target_name', value: 'DELTA', label: '변형 신호에서 DELTA 선정' },
        ],
      },
    ],
  },
  {
    id: 'lumi-lost-light-f-02',
    codeName: 'F-02',
    title: '항법 회로 (choose_action)',
    subtitle: '상태에 따른 자율 행동 결정 함수',
    summary: '드론의 에너지와 오염도 상태에 따라 "CHARGE", "PURIFY", "STANDBY"를 반환하는 항법 함수를 완성합니다.',
    difficulty: 'hard',
    gate: 'gate-6',
    coreOrOptional: 'core',
    persistencePolicy: 'official',
    rewardPolicy: 'standard-crystals',
    dailyRecordPolicy: 'python-act-summary',
    assignmentEvidencePolicy: 'python-course-summary',
    world: {
      width: 8,
      height: 5,
      rover: { x: 0, y: 2, direction: 0, energy: 100, awake: true },
    },
    scaffold: {
      mode: 'code',
      visibleTools: ['run', 'reset', 'step', 'replay', 'inspector'],
    },
    storyIntro: '자율 항법 로봇은 현재 상황을 스스로 판단하여 가장 알맞은 행동을 결정해야 합니다.',
    briefing: 'choose_action(energy, corruption) 함수를 정의하여 에너지 < 30이면 "CHARGE", 오염도 > 0이면 "PURIFY", 그 외는 "STANDBY"를 반환하세요.',
    checklist: [
      'def choose_action(energy, corruption): 함수 정의',
      '조건문(if/elif/else)으로 올바른 액션 반환',
      'act_1, act_2 변수에 판단 결과 저장',
    ],
    starterCode: `def choose_action(energy, corruption):
    # TODO: 에너지와 오염도에 따라 CHARGE, PURIFY, STANDBY 중 하나를 반환하세요.
    return "STANDBY"

act_1 = choose_action(20, 50)
act_2 = choose_action(80, 40)
`,
    conceptEvidence: {
      mustUse: ['def', 'if', 'return'],
      mustCall: ['choose_action'],
    },
    goals: [
      { type: 'variableValueEquals', name: 'act_1', value: 'CHARGE', label: '에너지 부족 시 CHARGE 반환' },
      { type: 'variableValueEquals', name: 'act_2', value: 'PURIFY', label: '오염 존재 시 PURIFY 반환' },
    ],
  },
  {
    id: 'lumi-lost-light-f-03',
    codeName: 'F-03',
    title: '변화하는 편대',
    subtitle: 'while과 list/for를 결합한 지속 정화',
    summary: 'while 루프와 for 반복을 결합하여 오염도가 완전히 0이 될 때까지 편대 정화를 반복합니다.',
    difficulty: 'hard',
    gate: 'gate-6',
    coreOrOptional: 'core',
    persistencePolicy: 'official',
    rewardPolicy: 'standard-crystals',
    dailyRecordPolicy: 'python-act-summary',
    assignmentEvidencePolicy: 'python-course-summary',
    world: {
      width: 8,
      height: 5,
      rover: { x: 0, y: 2, direction: 0, energy: 100, awake: true },
    },
    scaffold: {
      mode: 'code',
      visibleTools: ['run', 'reset', 'step', 'replay', 'inspector'],
    },
    storyIntro: '강력한 오염은 한 번의 펄스로 정화되지 않습니다. 전체 편대의 오염이 사라질 때까지 지속적으로 정화 작업을 수행합니다.',
    briefing: 'while 루프와 for 루프를 조합하여 fleet의 모든 드론의 corruption이 0이 될 때까지 purify(10)을 반복 호출하세요.',
    checklist: [
      'Drone 클래스 정의',
      'while 루프로 남아있는 오염 감지',
      '모든 드론의 오염도가 0 이하로 정화 완료',
    ],
    starterCode: `class Drone:
    def __init__(self, name, corruption):
        self.name = name
        self.corruption = corruption

    def purify(self, amount):
        self.corruption = max(0, self.corruption - amount)

fleet = [Drone("D1", 20), Drone("D2", 30)]

# TODO: 모든 드론의 corruption 합이 0이 될 때까지 while과 for로 정화하세요.
total_corruption = sum(d.corruption for d in fleet)
`,
    conceptEvidence: {
      mustUse: ['class', 'def', 'while', 'for', 'self'],
      mustCall: ['purify'],
    },
    goals: [
      { type: 'instanceCountEquals', count: 2, label: '드론 2대 생성' },
      { type: 'allInstancesAttributeSatisfy', attribute: 'corruption', lte: 0, label: '모든 드론의 corruption <= 0 정화 완료' },
    ],
  },
  {
    id: 'lumi-lost-light-f-04',
    codeName: 'F-04',
    title: 'THE LOST LIGHT',
    subtitle: 'LUMI Protocol 전 과정 종합 대단원',
    summary: '센서, 판단, 반복, 리스트, 함수, 클래스 객체 모델을 총동원하여 사라진 빛의 항로(Relay) 전체를 복구합니다.',
    difficulty: 'field-test',
    gate: 'gate-6',
    coreOrOptional: 'core',
    persistencePolicy: 'official',
    rewardPolicy: 'standard-crystals',
    dailyRecordPolicy: 'python-act-summary',
    assignmentEvidencePolicy: 'python-course-summary',
    world: {
      width: 8,
      height: 5,
      rover: { x: 0, y: 2, direction: 0, energy: 100, awake: true },
      entitySpecs: [
        { name: 'BEACON-ALPHA', power: 100 },
        { name: 'BEACON-BETA', power: 100 },
        { name: 'BEACON-GAMMA', power: 100 },
      ],
    },
    scaffold: {
      mode: 'code',
      autoImport: true,
      visibleTools: ['run', 'reset', 'step', 'replay', 'inspector'],
    },
    storyIntro: '관제사님! 마침내 사라진 빛의 중심부에 도달했습니다. 우리가 지금까지 배운 모든 파이썬 역량을 발휘하여 항로의 모든 릴레이 비콘을 재가동하세요!',
    briefing: 'RelayBeacon 클래스를 완성하고, 3개의 릴레이 비콘을 생성하여 for 루프로 activate()를 호출해 모두 가동 상태(active=True)로 만드세요.',
    checklist: [
      'RelayBeacon 클래스 정의 (__init__, activate)',
      '릴레이 3기 생성 및 리스트 보관',
      'for 루프로 모든 릴레이 activate() 호출',
      '전체 릴레이 가동 완료 (active = True)',
    ],
    starterCode: `class RelayBeacon:
    def __init__(self, name, power):
        self.name = name
        self.power = power
        self.active = False

    def activate(self):
        # TODO: 이 릴레이의 active 상태를 True로 바꾸세요.
        pass

relays = []
for spec in world.entity_specs:
    relays.append(RelayBeacon(spec["name"], spec["power"]))

# TODO: for 반복문으로 모든 릴레이의 activate()를 호출하세요.
`,
    conceptEvidence: {
      mustUse: ['class', 'def', 'for', 'self'],
      mustCall: ['activate'],
    },
    goals: [
      { type: 'instanceCountEquals', count: 3, label: '릴레이 비콘 3기 생성' },
      { type: 'allInstancesHaveAttribute', attribute: 'active', label: '모든 비콘에 active 속성 부여' },
      { type: 'allInstancesAttributeEquals', className: 'RelayBeacon', attribute: 'active', value: true, label: '모든 비콘 active=True' },
      { type: 'methodCalledOnEveryInstance', methodName: 'activate', label: '모든 비콘에 activate() 호출' },
    ],
    hiddenVariants: [
      {
        id: 'lumi-lost-light-f-04-var-a',
        label: 'Transfer Variant A: 2기 비콘',
        world: {
          entitySpecs: [
            { name: 'BEACON-X', power: 80 },
            { name: 'BEACON-Y', power: 120 },
          ],
        },
        goals: [
          { type: 'instanceCountEquals', count: 2, label: '비콘 2기 생성' },
          { type: 'allInstancesAttributeEquals', className: 'RelayBeacon', attribute: 'active', value: true, label: '2기 모두 active=True' },
          { type: 'methodCalledOnEveryInstance', methodName: 'activate', label: '2기 모두 activate 호출' },
        ],
      },
    ],
  },
]

export const LUMI_LOST_LIGHT_FINAL_SET = {
  id: 'lumi-lost-light-final-v1',
  kind: 'official-act',
  actId: 'act-final-the-lost-light',
  unitId: 'lumi_protocol_final_the_lost_light',
  lumiCourseId: 'lumi-season-1',
  title: 'FINAL. THE LOST LIGHT',
  subtitle: '사라진 빛의 항로를 되찾는 전 과정 종합 최종 시험',
  version: 1,
  persistencePolicy: 'official',
  rewardPolicy: 'standard-crystals',
  dailyRecordPolicy: 'python-act-summary',
  assignmentEvidencePolicy: 'python-course-summary',
  missions: LOST_LIGHT_FINAL_MISSIONS,
}
