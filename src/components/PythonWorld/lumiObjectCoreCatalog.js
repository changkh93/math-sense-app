/**
 * LUMI Protocol Gate 4: Object Core Production Course Catalog (Act 9: 9-01 ~ 9-F)
 * 
 * Official Production Policy:
 * - kind: 'official-act'
 * - persistencePolicy: 'official'
 * - rewardPolicy: 'standard-crystals'
 * - dailyRecordPolicy: 'python-act-summary'
 * - assignmentEvidencePolicy: 'python-course-summary'
 */

export const OBJECT_CORE_MISSIONS = [
  {
    id: 'lumi-object-9-01',
    codeName: '9-01',
    title: 'LUMI의 정체',
    subtitle: 'Rover 객체의 상태와 행동',
    summary: 'lumi가 단순 명령어가 아닌 상태와 메서드를 가진 Rover 객체임을 관찰합니다.',
    difficulty: 'guided',
    gate: 'gate-4',
    coreOrOptional: 'core',
    persistencePolicy: 'official',
    rewardPolicy: 'standard-crystals',
    dailyRecordPolicy: 'python-act-summary',
    assignmentEvidencePolicy: 'python-course-summary',
    world: {
      width: 8,
      height: 5,
      rover: { x: 0, y: 0, direction: 0, energy: 100, awake: true },
      target: { x: 4, y: 0, kind: 'beacon' },
    },
    scaffold: {
      mode: 'code',
      visibleTools: ['run', 'reset', 'step', 'replay', 'inspector'],
    },
    storyIntro: '관제사님! 지금까지 우리와 함께한 LUMI는 단순한 함수 모음이 아니라, Rover 클래스로 조립된 실제 객체입니다.',
    briefing: 'print(type(lumi))를 실행하여 LUMI의 정체를 확인하고 하단 [🛰️ 시스템 객체] 탭을 살펴보세요.',
    checklist: [
      'print(type(lumi)) 실행',
      '하단 [🛰️ 시스템 객체] 탭에서 Rover 상태 확인',
    ],
    memoryFragment: {
      label: 'SYSTEM OBJECT SIGNATURE',
      code: 'print(type(lumi))',
      autoPlay: false,
    },
    starterCode: `# type() 함수로 lumi의 정체를 관찰하세요.
print(type(lumi))
`,
    conceptEvidence: {
      mustUse: ['type'],
      mustCall: ['type', 'print'],
    },
    goals: [
      { type: 'inspectSystemObject', objectName: 'lumi', className: 'Rover', label: 'Rover 시스템 객체 관찰' },
    ],
  },
  {
    id: 'lumi-object-9-02',
    codeName: '9-02',
    title: '홀로그램 설계도',
    subtitle: '클래스는 객체의 조립 규격',
    summary: 'class Drone을 정의하고 설계도가 등록되는 과정을 관찰합니다.',
    difficulty: 'guided',
    gate: 'gate-4',
    coreOrOptional: 'core',
    persistencePolicy: 'official',
    rewardPolicy: 'standard-crystals',
    dailyRecordPolicy: 'python-act-summary',
    assignmentEvidencePolicy: 'python-course-summary',
    world: {
      width: 8,
      height: 5,
      rover: { x: 0, y: 0, direction: 0, energy: 100, awake: true },
    },
    scaffold: {
      mode: 'code',
      visibleTools: ['run', 'reset', 'step', 'replay', 'inspector'],
    },
    storyIntro: '탐사 로봇 공장에 드론 조립 규칙을 등록합니다. 클래스는 실체가 아닌 설계도입니다.',
    briefing: 'class Drone: pass 코드를 실행하여 [📐 클래스 설계도] 탭에 Drone이 등록되는지 확인하세요.',
    checklist: [
      'class Drone: 설계도 등록',
      '하단 [📐 클래스 설계도] 탭에서 Drone 확인',
    ],
    starterCode: `class Drone:
    pass
`,
    conceptEvidence: {
      mustUse: ['class'],
    },
    goals: [
      { type: 'classCountAtLeast', count: 1, label: '클래스 설계도 1개 등록' },
      { type: 'instanceCountEquals', count: 0, label: '실제 인스턴스는 0개 상태' },
    ],
  },
  {
    id: 'lumi-object-9-03',
    codeName: '9-03',
    title: '첫 번째 실체',
    subtitle: '설계도 호출로 인스턴스 생성',
    summary: 'Drone()을 호출하여 scout_1과 scout_2 두 대의 인스턴스를 조립합니다.',
    difficulty: 'guided',
    gate: 'gate-4',
    coreOrOptional: 'core',
    persistencePolicy: 'official',
    rewardPolicy: 'standard-crystals',
    dailyRecordPolicy: 'python-act-summary',
    assignmentEvidencePolicy: 'python-course-summary',
    world: {
      width: 8,
      height: 5,
      rover: { x: 0, y: 0, direction: 0, energy: 100, awake: true },
    },
    scaffold: {
      mode: 'code',
      visibleTools: ['run', 'reset', 'step', 'replay', 'inspector'],
    },
    storyIntro: '설계도(Drone)에 괄호를 붙여 호출하면, 그 설계도를 바탕으로 실제 드론 인스턴스가 조립됩니다.',
    briefing: 'scout_1 = Drone()과 scout_2 = Drone() 코드로 두 대의 실체를 생성하세요.',
    checklist: [
      'scout_1 = Drone() 생성',
      'scout_2 = Drone() 생성',
      '드론 인스턴스 2대 조립 확인',
    ],
    starterCode: `class Drone:
    pass

# TODO: Drone()을 호출하여 scout_1과 scout_2 두 대를 생성하세요.

`,
    conceptEvidence: {
      mustUse: ['class'],
      mustCall: ['Drone'],
    },
    goals: [
      { type: 'classCountAtLeast', count: 1, label: 'Drone 클래스 등록' },
      { type: 'instanceCountEquals', count: 2, label: '드론 인스턴스 2대 조립' },
    ],
  },
  {
    id: 'lumi-object-9-04',
    codeName: '9-04',
    title: '생성 신호',
    subtitle: '__init__과 초기 속성 부여',
    summary: '__init__ 생성자를 통해 각 드론마다 서로 다른 name과 integrity를 부여합니다.',
    difficulty: 'normal',
    gate: 'gate-4',
    coreOrOptional: 'core',
    persistencePolicy: 'official',
    rewardPolicy: 'standard-crystals',
    dailyRecordPolicy: 'python-act-summary',
    assignmentEvidencePolicy: 'python-course-summary',
    world: {
      width: 8,
      height: 5,
      rover: { x: 0, y: 0, direction: 0, energy: 100, awake: true },
    },
    scaffold: {
      mode: 'code',
      visibleTools: ['run', 'reset', 'step', 'replay', 'inspector'],
    },
    storyIntro: '생성자 __init__을 이용하면 태어나는 순간 각 드론마다 고유한 이름과 내구도를 갖게 할 수 있습니다.',
    briefing: '__init__ 내부에서 self.integrity = integrity를 대입하여 두 드론의 초기 상태를 완성하세요.',
    checklist: [
      'self.integrity = integrity 속성 대입',
      'scout_1 (내구도 20), scout_2 (내구도 40) 생성',
    ],
    starterCode: `class Drone:
    def __init__(self, name, integrity):
        self.name = name
        # TODO: self.integrity에 전달받은 integrity 값을 저장하세요.
        

scout_1 = Drone("ALPHA", 20)
scout_2 = Drone("BETA", 40)
`,
    conceptEvidence: {
      mustUse: ['class', 'def', '__init__', 'self'],
    },
    goals: [
      { type: 'instanceCountEquals', count: 2, label: '드론 인스턴스 2대 생성' },
      { type: 'allInstancesHaveAttribute', attribute: 'integrity', label: '모든 드론에 integrity 속성 저장' },
      { type: 'instancesHaveDistinctState', attribute: 'integrity', label: '두 드론이 서로 다른 integrity 유지' },
    ],
  },
  {
    id: 'lumi-object-9-05',
    codeName: '9-05',
    title: '현재 수신자 self',
    subtitle: 'self는 메서드를 실행 중인 바로 그 대상',
    summary: 'scout_1의 charge()를 호출했을 때 scout_1만 충전되고 scout_2는 격리됨을 확인합니다.',
    difficulty: 'normal',
    gate: 'gate-4',
    coreOrOptional: 'core',
    persistencePolicy: 'official',
    rewardPolicy: 'standard-crystals',
    dailyRecordPolicy: 'python-act-summary',
    assignmentEvidencePolicy: 'python-course-summary',
    world: {
      width: 8,
      height: 5,
      rover: { x: 0, y: 0, direction: 0, energy: 100, awake: true },
    },
    scaffold: {
      mode: 'code',
      visibleTools: ['run', 'reset', 'step', 'replay', 'inspector'],
    },
    storyIntro: 'self는 모든 드론이 아닙니다. 지금 메서드를 호출한 바로 그 대상 객체만을 가리킵니다.',
    briefing: 'scout_1.charge(10)을 호출하여 scout_1만 30으로 충전하세요. scout_2는 20을 유지해야 합니다.',
    checklist: [
      'scout_1.charge(10) 호출',
      'scout_1만 30으로 충전 (scout_2는 20 유지)',
    ],
    starterCode: `class Drone:
    def __init__(self, name, integrity):
        self.name = name
        self.integrity = integrity

    def charge(self, amount):
        self.integrity += amount

scout_1 = Drone("ALPHA", 20)
scout_2 = Drone("BETA", 20)

# TODO: scout_1만 10만큼 충전하세요.

`,
    conceptEvidence: {
      mustUse: ['class', 'def', 'self'],
      mustCall: ['charge'],
    },
    goals: [
      { type: 'instanceCountEquals', count: 2, label: '드론 인스턴스 2대 생성' },
      {
        type: 'onlyTargetInstanceAttributeChanged',
        targetBinding: 'scout_1',
        attribute: 'integrity',
        expectedBefore: 20,
        expectedAfter: 30,
        expectedChangedInstanceCount: 1,
        unchangedOthers: true,
        requireMethodReceiverMatch: true,
        label: 'scout_1만 내구도 20 -> 30 충전',
      },
    ],
  },
  {
    id: 'lumi-object-9-06',
    codeName: '9-06',
    title: '능력 회로',
    subtitle: '메서드 정의와 매개변수 활용',
    summary: 'Drone 클래스에 repair(amount) 메서드를 직접 정의하고 호출합니다.',
    difficulty: 'normal',
    gate: 'gate-4',
    coreOrOptional: 'core',
    persistencePolicy: 'official',
    rewardPolicy: 'standard-crystals',
    dailyRecordPolicy: 'python-act-summary',
    assignmentEvidencePolicy: 'python-course-summary',
    world: {
      width: 8,
      height: 5,
      rover: { x: 0, y: 0, direction: 0, energy: 100, awake: true },
    },
    scaffold: {
      mode: 'code',
      visibleTools: ['run', 'reset', 'step', 'replay', 'inspector'],
    },
    storyIntro: '드론에 새로운 능력(메서드)을 장착합니다. def repair(self, amount): 함수를 클래스 내부에 정의하세요.',
    briefing: 'repair 메서드를 정의하여 self.integrity에 amount를 더하고, scout.repair(15)를 실행하세요.',
    checklist: [
      'def repair(self, amount): 메서드 정의',
      'scout.repair(15) 호출로 내구도 10 -> 25 증가',
    ],
    starterCode: `class Drone:
    def __init__(self, name, integrity):
        self.name = name
        self.integrity = integrity

    # TODO: repair(self, amount) 메서드를 정의하세요.
    

scout = Drone("ALPHA", 10)
# TODO: scout.repair(15)를 호출하세요.

`,
    conceptEvidence: {
      mustUse: ['class', 'def', 'self'],
      mustCall: ['repair'],
    },
    goals: [
      { type: 'classHasMethod', className: 'Drone', methodName: 'repair', label: 'Drone에 repair 메서드 정의' },
      {
        type: 'onlyTargetInstanceAttributeChanged',
        targetBinding: 'scout',
        attribute: 'integrity',
        expectedBefore: 10,
        expectedAfter: 25,
        label: 'scout 내구도 10 -> 25 수리',
      },
    ],
  },
  {
    id: 'lumi-object-9-07',
    codeName: '9-07',
    title: '복구 편대',
    subtitle: 'List와 For 루프로 객체 편대 일괄 제어',
    summary: '드론 객체들을 list에 담고 for 루프로 순회하며 charge(20)을 일괄 실행합니다.',
    difficulty: 'hard',
    gate: 'gate-4',
    coreOrOptional: 'core',
    persistencePolicy: 'official',
    rewardPolicy: 'standard-crystals',
    dailyRecordPolicy: 'python-act-summary',
    assignmentEvidencePolicy: 'python-course-summary',
    world: {
      width: 8,
      height: 5,
      rover: { x: 0, y: 0, direction: 0, energy: 100, awake: true },
    },
    scaffold: {
      mode: 'code',
      visibleTools: ['run', 'reset', 'step', 'replay', 'inspector'],
    },
    storyIntro: '드론이 수십 대여도 문제없습니다! 객체들을 리스트에 담고 for 루프로 순회하면 한 줄로 모든 드론을 제어할 수 있습니다.',
    briefing: '3대의 드론을 fleet 리스트에 넣고, for d in fleet: d.charge(20)으로 모든 드론을 충전하세요.',
    checklist: [
      '드론 3대 생성 및 fleet = [d1, d2, d3] 리스트 저장',
      'for drone in fleet: drone.charge(20) 일괄 호출',
      '모든 드론의 내구도가 20씩 증가',
    ],
    starterCode: `class Drone:
    def __init__(self, name, integrity):
        self.name = name
        self.integrity = integrity

    def charge(self, amount):
        self.integrity += amount

d1 = Drone("D-1", 10)
d2 = Drone("D-2", 10)
d3 = Drone("D-3", 10)

# TODO: fleet 리스트에 d1, d2, d3를 담고 for 루프로 각 드론의 charge(20)을 호출하세요.

`,
    conceptEvidence: {
      mustUse: ['class', 'def', 'for', 'self'],
      mustCall: ['charge'],
    },
    goals: [
      { type: 'instanceCountEquals', count: 3, label: '드론 인스턴스 3대 생성' },
      { type: 'methodCalledOnEveryInstance', methodName: 'charge', label: '모든 드론에 charge() 호출' },
    ],
  },
  {
    id: 'lumi-object-9-f',
    codeName: '9-F',
    title: '잃어버린 편대',
    subtitle: 'Object Core 종합 전이 평가',
    summary: 'Drone 클래스를 완전히 자율적으로 설계하고 전이 variant 편대를 일괄 복구합니다.',
    difficulty: 'field-test',
    gate: 'gate-4',
    coreOrOptional: 'core',
    persistencePolicy: 'official',
    rewardPolicy: 'standard-crystals',
    dailyRecordPolicy: 'python-act-summary',
    assignmentEvidencePolicy: 'python-course-summary',
    world: {
      width: 8,
      height: 5,
      rover: { x: 0, y: 0, direction: 0, energy: 100, awake: true },
      entitySpecs: [
        { name: 'DRONE-A', integrity: 10 },
        { name: 'DRONE-B', integrity: 20 },
        { name: 'DRONE-C', integrity: 30 },
      ],
    },
    scaffold: {
      mode: 'code',
      visibleTools: ['run', 'reset', 'step', 'replay', 'inspector'],
    },
    storyIntro: '관제사님! Object Core의 마지막 검증입니다. 클래스 정의, 생성자, 메서드, 리스트, for 반복문을 종합하여 조난된 편대를 구출하세요.',
    briefing: 'Drone 클래스를 완성하고 world.entity_specs의 편대를 생성하여 for 루프로 recharge(30)을 수행하세요. 신호 수가 달라져도 같은 코드가 동작해야 합니다.',
    checklist: [
      'Drone 클래스 정의 (__init__, recharge)',
      '편대 생성 및 리스트 보관',
      'for 루프로 모든 드론 recharge(30) 호출',
    ],
    starterCode: `# Drone 클래스를 정의하고 world.entity_specs의 각 신호로 드론을 만드세요.
# 드론을 리스트에 담은 뒤 for 루프로 각 드론의 recharge(30)을 호출하세요.

`,
    conceptEvidence: {
      mustUse: ['class', 'def', 'for', 'self'],
      mustCall: ['recharge'],
    },
    goals: [
      { type: 'classCountAtLeast', count: 1, label: 'Drone 클래스 등록' },
      { type: 'instanceCountEquals', count: 3, label: '드론 인스턴스 3대 생성' },
      { type: 'instancesCollectedInSequence', label: '드론을 리스트에 보관' },
      { type: 'methodCalledOnEveryInstance', methodName: 'recharge', label: '모든 드론에 recharge() 호출' },
    ],
    hiddenVariants: [
      {
        id: 'lumi-object-9-f-var-a',
        label: 'Transfer Variant A: 2대 편대',
        world: {
          entitySpecs: [
            { name: 'TRANSFER-A', integrity: 5 },
            { name: 'TRANSFER-B', integrity: 25 },
          ],
        },
        goals: [
          { type: 'instanceCountEquals', count: 2, label: '드론 2대 생성' },
          { type: 'instancesCollectedInSequence', label: '2대 편대를 리스트에 보관' },
          { type: 'methodCalledOnEveryInstance', methodName: 'recharge', label: '2대 모두 recharge 호출' },
        ],
      },
    ],
  },
]

export const LUMI_OBJECT_CORE_SET = {
  id: 'lumi-object-core-v1',
  kind: 'official-act',
  actId: 'act-9-object-core',
  unitId: 'lumi_protocol_act_9_object_core',
  lumiCourseId: 'lumi-season-1',
  title: 'ACT 9: OBJECT CORE',
  subtitle: '객체 지향 프로그래밍과 클래스 설계',
  version: 1,
  persistencePolicy: 'official',
  rewardPolicy: 'standard-crystals',
  dailyRecordPolicy: 'python-act-summary',
  assignmentEvidencePolicy: 'python-course-summary',
  missions: OBJECT_CORE_MISSIONS,
}
