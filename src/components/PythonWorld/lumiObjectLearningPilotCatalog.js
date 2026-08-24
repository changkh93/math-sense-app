/**
 * LUMI Protocol Gate 2: Object Learning Pilot Catalog (9-1 ~ 9-5 + Transfer)
 * 
 * Strict Isolation:
 * - kind: 'learning-pilot'
 * - persistencePolicy: 'none'
 * - rewardPolicy: 'none'
 * - dailyRecordPolicy: 'none'
 * - assignmentEvidencePolicy: 'none'
 */

export const PILOT_OBJECT_MISSIONS = [
  {
    id: 'pilot-object-9-1',
    codeName: '9-1',
    title: 'LUMI의 정체',
    subtitle: 'Rover 객체의 상태와 행동',
    summary: 'lumi가 단순 명령어가 아닌 Rover 객체임을 관찰하고 속성과 메서드를 확인합니다.',
    difficulty: 'guided',
    isSpike: true,
    isPilot: true,
    isObjectMission: true,
    persistencePolicy: 'none',
    rewardPolicy: 'none',
    dailyRecordPolicy: 'none',
    assignmentEvidencePolicy: 'none',
    world: {
      width: 8,
      height: 5,
      rover: { x: 0, y: 0, direction: 0, energy: 100, awake: true },
      target: { x: 4, y: 0, kind: 'beacon' },
    },
    scaffold: {
      mode: 'code',
      autoImport: true,
      visibleTools: ['run', 'reset', 'step', 'replay', 'inspector'],
    },
    storyIntro: '관제사님! 지금까지 우리를 안내하던 LUMI는 단순한 게임 명령어가 아닙니다. Rover 클래스로 조립된 상태(속성)와 행동(메서드)을 가진 실제 객체입니다.',
    briefing: 'type(lumi) 코드를 실행하여 LUMI의 정체를 밝히고, 하단 [SYSTEM OBJECTS] 탭에서 Rover의 상태와 메서드를 관찰하세요.',
    checklist: [
      'print(type(lumi)) 실행하여 정체 확인',
      '하단 [SYSTEM OBJECTS] 탭에서 Rover 클래스 및 속성/메서드 확인',
    ],
    memoryFragment: {
      label: 'SYSTEM OBJECT SIGNATURE',
      code: '# type(lumi)\n# System Object: Rover (energy, direction, methods)',
      autoPlay: false,
    },
    starterCode: `# LUMI의 정체: 우리는 지금까지 어떤 존재와 통신하고 있었을까요?
# type() 함수로 lumi의 정체를 확인해 보세요.
print(type(lumi))
`,
    conceptEvidence: {
      mustUse: ['type'],
      mustCall: ['type', 'print'],
    },
    goals: [
      {
        type: 'inspectSystemObject',
        objectName: 'lumi',
        className: 'Rover',
        label: 'Rover 시스템 객체 정체 관찰',
      },
    ],
    reflectionQuestions: [
      'lumi.move()에서 move는 Rover 객체의 무엇이었을까요?',
      '객체는 무엇과 무엇을 함께 가지고 있는 구조일까요?',
    ],
  },
  {
    id: 'pilot-object-9-2',
    codeName: '9-2',
    title: '홀로그램 설계도',
    subtitle: '클래스는 조립 규칙이자 틀',
    summary: 'class Drone을 정의하고 인스턴스는 아직 0대임을 확인합니다.',
    difficulty: 'guided',
    isSpike: true,
    isPilot: true,
    isObjectMission: true,
    persistencePolicy: 'none',
    rewardPolicy: 'none',
    dailyRecordPolicy: 'none',
    assignmentEvidencePolicy: 'none',
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
    storyIntro: '실제 드론을 조립하기 전에, 드론이 어떻게 생겼고 무엇을 할 수 있는지 정의하는 설계도(class)를 등록합니다.',
    briefing: 'Drone 클래스를 정의하고 실행하세요. 하단 [BLUEPRINT] 탭에 설계도가 등록되지만, [INSTANCES]에는 아직 실제 드론이 0개임을 관찰하세요.',
    checklist: [
      'class Drone: pass 코드로 설계도 등록',
      '하단 [BLUEPRINT] 탭에 Drone 등록 및 [INSTANCES]는 0개 확인',
    ],
    memoryFragment: {
      label: 'CLASS BLUEPRINT SCHEMA',
      code: 'class ClassName:\n    pass',
      autoPlay: false,
    },
    starterCode: `# 클래스는 실제 드론이 아니라, 드론을 만드는 '설계도'입니다.
class Drone:
    pass
`,
    conceptEvidence: {
      mustUse: ['class'],
    },
    goals: [
      { type: 'classCountAtLeast', count: 1, label: '클래스 설계도 1개 등록' },
      { type: 'instanceCountEquals', count: 0, label: '실제 인스턴스는 아직 0개 생성' },
    ],
    reflectionQuestions: [
      '지금 실제 드론이 만들어졌나요, 아니면 드론을 만드는 규칙만 생겼나요?',
    ],
  },
  {
    id: 'pilot-object-9-3',
    codeName: '9-3',
    title: '첫 번째 실체',
    subtitle: '설계도 호출로 인스턴스 생성',
    summary: 'Drone() 호출로 고유 identity를 가진 인스턴스를 조립합니다.',
    difficulty: 'guided',
    isSpike: true,
    isPilot: true,
    isObjectMission: true,
    persistencePolicy: 'none',
    rewardPolicy: 'none',
    dailyRecordPolicy: 'none',
    assignmentEvidencePolicy: 'none',
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
    storyIntro: '설계도(Drone)에 괄호를 붙여 호출하면, 그 설계도를 바탕으로 독립된 실체(인스턴스) 1대가 조립되어 메모리에 탄생합니다.',
    briefing: 'Drone()을 호출하여 실제 드론 1대를 생성하고 변수에 바인딩하세요. (예: scout = Drone())',
    checklist: [
      'scout = Drone() 형태로 인스턴스 1대 조립',
      '하단 [INSTANCES] 탭에서 instance-1 생성 확인',
    ],
    memoryFragment: {
      label: 'INSTANCE ASSEMBLY PATTERN',
      code: '# instance = ClassName()',
      autoPlay: false,
    },
    starterCode: `class Drone:
    pass

# Drone 설계도로 실제 드론 1대를 조립하여 scout 변수에 저장하세요.
# 예: scout = Drone()

`,
    conceptEvidence: {
      mustUse: ['class'],
      mustCall: ['Drone'],
    },
    goals: [
      { type: 'classCountAtLeast', count: 1, label: '클래스 설계도 1개 등록' },
      { type: 'instanceCountEquals', count: 1, label: '실제 인스턴스 1대 조립' },
    ],
    reflectionQuestions: [
      'Drone(클래스)과 scout(인스턴스)는 각각 무엇을 뜻할까요?',
    ],
  },
  {
    id: 'pilot-object-9-4',
    codeName: '9-4',
    title: '생성될 때 정하는 상태',
    subtitle: '__init__과 초기 속성',
    summary: '__init__ 생성자를 통해 인스턴스마다 서로 다른 초기 상태를 부여합니다.',
    difficulty: 'normal',
    isSpike: true,
    isPilot: true,
    isObjectMission: true,
    persistencePolicy: 'none',
    rewardPolicy: 'none',
    dailyRecordPolicy: 'none',
    assignmentEvidencePolicy: 'none',
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
    storyIntro: '모든 드론이 똑같을 필요는 없습니다. 생성자 __init__에 입력값을 넘겨주면 각 드론마다 고유한 이름과 내구도를 가지고 태어납니다.',
    briefing: '__init__ 내부에서 self.integrity = integrity 코드를 완성하여 scout_1과 scout_2가 서로 다른 내구도를 갖게 하세요.',
    checklist: [
      '__init__ 내부에서 self.integrity = integrity 작성',
      'scout_1 (내구도 20), scout_2 (내구도 40) 생성',
      '하단 [INSTANCES] 탭에서 두 드론의 integrity 값이 다름을 확인',
    ],
    memoryFragment: {
      label: 'CONSTRUCTOR ATTRIBUTE PATTERN',
      code: 'def __init__(self, ...):\n    self.attribute = value',
      autoPlay: false,
    },
    starterCode: `class Drone:
    def __init__(self, name, integrity):
        self.name = name
        # TODO: 전달받은 integrity 값을 이 객체의 속성에 저장하세요.
        

scout_1 = Drone("ALPHA", 20)
scout_2 = Drone("BETA", 40)
`,
    conceptEvidence: {
      mustUse: ['class', 'def', '__init__', 'self', 'self_attribute'],
    },
    goals: [
      { type: 'instanceCountEquals', count: 2, label: '드론 인스턴스 2대 생성' },
      { type: 'classHasMethod', className: 'Drone', methodName: '__init__', label: '__init__ 생성자 정의' },
      { type: 'allInstancesHaveAttribute', attribute: 'name', label: '모든 드론에 name 속성 저장' },
      { type: 'allInstancesHaveAttribute', attribute: 'integrity', label: '모든 드론에 integrity 속성 저장' },
      { type: 'allInstancesInitializedAttribute', className: 'Drone', attribute: 'integrity', methodName: '__init__', label: '__init__ 내부에서 integrity 초기화' },
      { type: 'instancesHaveDistinctState', attribute: 'integrity', label: '두 드론이 서로 다른 integrity 값 유지' },
    ],
    reflectionQuestions: [
      '같은 Drone 설계도에서 태어났는데 왜 두 드론의 integrity 값이 다를까요?',
    ],
  },
  {
    id: 'pilot-object-9-5',
    codeName: '9-5',
    title: '바로 그 객체 자신',
    subtitle: 'self와 메서드 호출을 통한 상태 격리',
    summary: 'self가 현재 메서드를 실행 중인 특정 인스턴스임을 확인하고 대상 객체만 충전합니다.',
    difficulty: 'normal',
    isSpike: true,
    isPilot: true,
    isObjectMission: true,
    persistencePolicy: 'none',
    rewardPolicy: 'none',
    dailyRecordPolicy: 'none',
    assignmentEvidencePolicy: 'none',
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
    storyIntro: 'self는 모든 드론이 아닙니다. 메서드를 호출한 바로 그 대상 객체만을 가리킵니다. scout_1을 충전해도 scout_2는 영향을 받지 않습니다.',
    briefing: 'scout_1.charge(10)을 호출하세요. scout_1의 내구도만 20에서 30으로 증가하고 scout_2는 20을 유지하는지 확인하세요.',
    checklist: [
      'scout_1.charge(10) 메서드 호출',
      'scout_1 내구도만 20 -> 30으로 증가 (scout_2는 20 유지)',
      '하단 [TRACE] 탭에서 self가 scout_1을 가리킴 확인',
    ],
    memoryFragment: {
      label: 'METHOD CALL & RECEIVER PATTERN',
      code: 'object.method(arg)\n# self points strictly to target instance',
      autoPlay: false,
    },
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
        label: 'scout_1만 내구도 20 -> 30 충전 (scout_2는 20 유지)',
      },
    ],
    reflectionQuestions: [
      'charge 메서드 안의 self는 scout_1과 scout_2 중 누구를 가리켰을까요?',
      '왜 scout_2의 integrity는 변하지 않았을까요?',
    ],
  },
  {
    id: 'pilot-object-transfer-1',
    codeName: 'Transfer-1',
    title: 'MetaSense 밖으로의 전이',
    subtitle: '일반 Python Pet 클래스',
    summary: 'MetaSense 밖의 일반 Python 소재(Pet)로 객체 지향 개념을 전이합니다.',
    difficulty: 'field-test',
    isSpike: true,
    isPilot: true,
    isObjectMission: true,
    persistencePolicy: 'none',
    rewardPolicy: 'none',
    dailyRecordPolicy: 'none',
    assignmentEvidencePolicy: 'none',
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
    storyIntro: 'MetaSense의 드론을 넘어 현실 세계의 반려 동물(Pet)이나 도서(Book)도 동일한 클래스-인스턴스 원리로 작성할 수 있습니다.',
    briefing: 'Pet 인스턴스 2개를 생성하고, 첫 번째 펫의 feed(20) 메서드를 호출하여 에너지를 50에서 70으로 채워주세요. 두 번째 펫의 에너지는 50으로 유지되어야 합니다.',
    checklist: [
      'Pet 인스턴스 2마리 생성 (예: p1, p2)',
      '첫 번째 펫의 feed(20) 호출로 에너지 50 -> 70 변경',
      '두 번째 펫의 에너지는 50 유지',
    ],
    memoryFragment: {
      label: 'GENERAL PYTHON OBJECT MODEL',
      code: 'class Pet:\n    def __init__(self, name, energy):\n        ...',
      autoPlay: false,
    },
    starterCode: `class Pet:
    def __init__(self, name, energy):
        self.name = name
        self.energy = energy

    def feed(self, amount):
        self.energy += amount

# TODO: Pet 2마리를 생성하고 첫 번째 펫만 feed(20)을 호출하세요.

`,
    conceptEvidence: {
      mustUse: ['class', 'def', 'self'],
      mustCall: ['feed'],
    },
    goals: [
      { type: 'instanceCountEquals', count: 2, label: 'Pet 인스턴스 2개 생성' },
      {
        type: 'onlyTargetInstanceAttributeChanged',
        attribute: 'energy',
        expectedBefore: 50,
        expectedAfter: 70,
        expectedChangedInstanceCount: 1,
        unchangedOthers: true,
        requireMethodReceiverMatch: true,
        label: '첫 번째 Pet만 에너지 50 -> 70 증가 (다른 펫은 50 유지)',
      },
    ],
    reflectionQuestions: [
      'Drone과 Pet은 소재가 다르지만 class와 self의 동작 원리는 동일한가요?',
    ],
  },
]

export const LUMI_OBJECT_LEARNING_PILOT_SET = {
  id: 'lumi-object-learning-pilot-v1',
  kind: 'learning-pilot',
  actId: 'object-learning-pilot',
  title: 'Gate 2: Object Learning Pilot (9-1 ~ 9-5)',
  subtitle: '객체·클래스·인스턴스·self 학습 경험 검증 파일럿',
  version: 1,
  persistencePolicy: 'official',
  rewardPolicy: 'standard-crystals',
  dailyRecordPolicy: 'official',
  assignmentEvidencePolicy: 'python-only',
  unitId: 'lumi_protocol_pilot_object_core',
  lumiCourseId: 'lumi-season-1',
  missions: PILOT_OBJECT_MISSIONS.map((mission) => ({
    ...mission,
    persistencePolicy: 'official',
    rewardPolicy: 'standard-crystals',
  })),
}
