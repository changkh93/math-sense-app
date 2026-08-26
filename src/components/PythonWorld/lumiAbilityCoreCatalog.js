const BASE_WORLD = Object.freeze({
  width: 9,
  height: 5,
  rover: { x: 1, y: 2, direction: 0, energy: 100, awake: true },
  target: { x: 6, y: 2, kind: 'beacon' },
  obstacles: [],
  objects: [],
})

const ABILITY_API = Object.freeze([
  { signature: 'def 함수이름(매개변수):', description: '재사용 가능한 명령 묶음(함수)을 정의합니다.' },
  { signature: 'return 값', description: '함수의 실행 결과를 호출한 곳으로 반환합니다.' },
  { signature: '지역 변수 (Scope)', description: '함수 안에서 선언된 변수는 함수 내부에서만 유효하며 밖으로 노출되지 않습니다.' },
  { signature: 'lumi.move(distance)', description: '현재 방향으로 지정한 칸만큼 이동합니다.' },
  { signature: 'lumi.shield()', description: '에너지 보호막을 가동합니다.' },
  { signature: 'lumi.charge()', description: '충전소에서 에너지를 100까지 충전합니다.' },
  { signature: 'lumi.scan()', description: '주변 신호 목록을 스캔합니다.' },
  { signature: 'lumi.collect(signal)', description: '지정된 신호를 수집합니다.' },
  { signature: 'world.target_distance', description: '목표까지의 거리를 읽습니다.' },
])

function abilityMission({
  id, codeName, order, aliases = [], title, objective, briefing, concepts,
  pygameBridgeKey, world = {}, goals, mustUse = [], mustCall = [],
  hints = [], learningSteps = [], hiddenVariants = [],
}) {
  return {
    id,
    codeName,
    actId: 'act-8-ability',
    order,
    aliases,
    difficulty: order === 1 ? 'calibration' : order === 7 ? 'field-test' : 'core',
    title,
    eyebrow: `ACT 8 · ABILITY CORE · ${order}/7`,
    objective,
    briefing,
    concepts,
    pygameBridgeKey,
    api: ABILITY_API,
    starterCode: [
      '# [ACT 8 · ABILITY CORE 함수 능력 지시서]',
      `# 임무: ${title}`,
      `# 이번에 사용할 개념: ${concepts.join(' · ')}`,
      '# 아래 빈 줄부터 함수의 역할과 호출 흐름을 직접 작성하세요.',
      '',
    ].join('\n'),
    learningSteps,
    memoryFragment: {
      label: '함수 모듈화 스키마',
      code: 'def 능력_함수(인자):\n    결과 = 인자 * 2\n    return 결과\n\n최종 = 능력_함수(5)',
      duration: 2000,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      autoImport: true,
      visibleTools: ['run', 'reset', 'step', 'replay', 'memory', 'mission-tabs', 'hud'],
    },
    world: {
      ...BASE_WORLD,
      ...world,
      rover: { ...BASE_WORLD.rover, ...(world.rover || {}) },
      target: world.target !== undefined ? world.target : BASE_WORLD.target,
    },
    goals,
    conceptEvidence: { mustUse, mustCall },
    hints,
    hiddenVariants,
    rewardPolicy: 'standard-crystals',
  }
}

export const LUMI_ABILITY_CORE_MISSIONS = [
  abilityMission({
    id: 'function-move-01',
    codeName: '8-1',
    order: 1,
    aliases: ['lumi-act8-01', '8-1'],
    title: '첫 항법 함수 (def)',
    objective: 'move_to_beacon() 함수를 정의하고 호출하여 비콘에 도착하세요.',
    briefing: '검증된 항법 코드를 함수(def)로 포장합니다. 함수를 정의한 뒤 마지막에 `move_to_beacon()`으로 호출해야 실제로 실행됩니다.',
    concepts: ['def', '함수 정의', '함수 호출'],
    pygameBridgeKey: 'function-def',
    learningSteps: [
      'def move_to_beacon(): 함수를 정의합니다.',
      '들여써서 lumi.move(world.target_distance) 를 작성합니다.',
      '들여쓰기를 끝내고 move_to_beacon() 을 호출합니다.',
    ],
    goals: [
      { type: 'position', x: 6, y: 2, label: '함수 호출을 통해 비콘 도착' },
      { type: 'functionCalled', name: 'move_to_beacon', label: 'move_to_beacon 함수 호출 확인' },
    ],
    mustUse: ['function'],
    mustCall: ['lumi.move', 'move_to_beacon'],
    hints: [
      { level: 1, type: 'context', text: '함수 본문은 네 칸 들여씁니다.' },
      { level: 2, type: 'concept', text: '정의한 뒤 마지막 줄에서 `move_to_beacon()`을 호출해야 로봇이 움직입니다.' },
    ],
    hiddenVariants: [
      { id: 'far-target', world: { target: { x: 8, y: 2 } }, goals: [{ type: 'position', x: 8, y: 2, label: '더 먼 거리에서도 함수 호출 완주' }] },
    ],
  }),

  abilityMission({
    id: 'function-parameter-02',
    codeName: '8-2',
    order: 2,
    aliases: ['lumi-act8-02', '8-2'],
    title: '거리 매개변수 (Parameter)',
    objective: '거리 값을 전달받는 travel(distance) 함수를 만들고 비콘 거리로 호출하세요.',
    briefing: '고정된 동작 대신 외부에서 매개변수(parameter)를 받아 상황에 맞게 유연하게 동작하는 항법 함수를 만듭니다.',
    concepts: ['def', '매개변수', '일반화'],
    pygameBridgeKey: 'function-param',
    learningSteps: [
      'def travel(distance): 매개변수를 받는 함수를 정의합니다.',
      '들여써서 lumi.move(distance) 를 실행합니다.',
      '들여쓰기를 끝내고 travel(world.target_distance) 로 함수를 호출합니다.',
    ],
    goals: [
      { type: 'position', x: 6, y: 2, label: '매개변수 함수로 비콘 도착' },
      { type: 'functionCalled', name: 'travel', label: 'travel 함수 호출 확인' },
    ],
    mustUse: ['function'],
    mustCall: ['lumi.move', 'travel'],
    hints: [
      { level: 1, type: 'context', text: '함수 괄호 안의 `distance`는 전달받은 값을 가리킵니다.' },
      { level: 2, type: 'concept', text: '`def travel(distance):` 아래에 `lumi.move(distance)` 작성 후 `travel(world.target_distance)`를 호출하세요.' },
    ],
    hiddenVariants: [
      { id: 'near-target', world: { target: { x: 4, y: 2 } }, goals: [{ type: 'position', x: 4, y: 2, label: '가까운 비콘에서도 매개변수 정확 적용' }] },
    ],
  }),

  abilityMission({
    id: 'function-return-03',
    codeName: '8-3',
    order: 3,
    aliases: ['lumi-act8-03', '8-3'],
    title: '센서 판정 반환 (return)',
    objective: '에너지가 30 이상인지 판단해 True/False를 반환하는 is_safe() 함수를 만들고 "SAFE"를 출력하세요.',
    briefing: '함수는 행동뿐 아니라 계산과 판단의 결과도 `return` 키워드로 돌려줄 수 있습니다.',
    concepts: ['def', 'return', 'Boolean 반환'],
    pygameBridgeKey: 'function-return',
    learningSteps: [
      'def is_safe(): 함수 안에서 return lumi.energy >= 30 을 작성합니다.',
      'if is_safe(): 조건문으로 함수의 반환값을 확인합니다.',
      '참이면 print("SAFE")를 실행합니다.',
    ],
    world: { target: false, rover: { energy: 80 } },
    goals: [
      { type: 'stdoutIncludes', value: 'SAFE', label: '판단 결과 SAFE 출력' },
      { type: 'functionCalled', name: 'is_safe', label: 'is_safe 함수 호출 확인' },
    ],
    mustUse: ['function', 'return', 'if'],
    mustCall: ['is_safe', 'print'],
    hints: [
      { level: 1, type: 'context', text: '`return lumi.energy >= 30`은 비교 결과를 돌려줍니다.' },
      { level: 2, type: 'concept', text: '`if is_safe():` 아래에서 `print("SAFE")`를 들여쓰세요.' },
    ],
    hiddenVariants: [
      {
        id: 'return-verify',
        goals: [{ type: 'stdoutIncludes', value: 'SAFE', label: '정상 안전 반환 검증' }],
      },
    ],
  }),

  abilityMission({
    id: 'function-collect-04',
    codeName: '8-4',
    order: 4,
    aliases: ['lumi-act8-04', '8-4'],
    title: '구조 신호 필터 함수',
    objective: '신호 객체를 받아 priority가 3 이상일 때만 수집하는 rescue(signal) 함수를 만드세요.',
    briefing: '신호 선별 규칙을 함수로 캡슐화하여, 복잡한 관제 코드를 깔끔하고 직관적으로 유지합니다.',
    concepts: ['def', '매개변수', 'if', '캡슐화'],
    pygameBridgeKey: 'function-param',
    learningSteps: [
      'def rescue(signal): 함수를 정의합니다.',
      '함수 안에서 if signal.priority >= 3: 일 때 lumi.collect(signal) 을 실행합니다.',
      'for sig in lumi.scan(): 루프로 모든 신호에 대해 rescue(sig) 를 호출합니다.',
    ],
    world: {
      target: false,
      objects: [
        { id: 'low', kind: 'signal', x: 1, y: 2, priority: 1 },
        { id: 'high', kind: 'signal', x: 1, y: 2, priority: 4 },
      ],
    },
    goals: [
      { type: 'collectedIncludes', id: 'high', label: '우선 신호(priority 4) 선별 수집' },
      { type: 'functionCalled', name: 'rescue', label: 'rescue 함수 호출 확인' },
    ],
    mustUse: ['function', 'if', 'for'],
    mustCall: ['lumi.scan', 'rescue', 'lumi.collect'],
    hints: [
      { level: 1, type: 'context', text: '`def rescue(signal):` 안에서 `if signal.priority >= 3:`을 검사합니다.' },
      { level: 2, type: 'concept', text: '루프에서 `rescue(sig)`를 호출하여 각 신호를 함수로 보냅니다.' },
    ],
    hiddenVariants: [
      {
        id: 'filter-verify',
        world: {
          objects: [
            { id: 'low', kind: 'signal', x: 1, y: 2, priority: 2 },
            { id: 'high', kind: 'signal', x: 1, y: 2, priority: 5 },
          ],
        },
        goals: [{ type: 'collectedIncludes', id: 'high', label: '변형 우선 신호 수집 완료' }],
      },
    ],
  }),

  abilityMission({
    id: 'function-scope-05',
    codeName: '8-5',
    order: 5,
    aliases: ['lumi-act8-05', '8-5'],
    title: '지역 변수와 Scope 분리',
    objective: '함수 안에서 local_bonus를 계산해 반환하고, 전역에 total_power를 저장하세요.',
    briefing: '함수 내부에서 만든 지역 변수(Local Variable)는 함수가 끝나면 안전하게 소멸되어 전역 네임스페이스를 오염시키지 않습니다.',
    concepts: ['def', '지역 변수', 'Scope', 'return'],
    pygameBridgeKey: 'function-scope',
    learningSteps: [
      'def calc_shield(): 함수 안에 local_bonus = 10 을 선언하고 return local_bonus 합니다.',
      'total_power = calc_shield() 로 전역 변수에 반환값을 저장합니다.',
      'print(total_power) 로 전역에 저장된 총 파워를 출력합니다.',
    ],
    world: { target: false },
    goals: [
      { type: 'variableValueEquals', name: 'total_power', value: 10, label: '전역 total_power 10 저장' },
      { type: 'localVariableObserved', name: 'local_bonus', functionName: 'calc_shield', label: 'calc_shield 함수 안에서 local_bonus 지역 변수 생성' },
      { type: 'globalVariableAbsent', name: 'local_bonus', label: 'local_bonus 변수가 전역에 남지 않고 소멸' },
      { type: 'stdoutIncludes', value: '10', label: '10 출력' },
    ],
    mustUse: ['function', 'return'],
    mustCall: ['calc_shield', 'print'],
    hints: [
      { level: 1, type: 'context', text: '함수 안의 변수는 함수 외부에서 직접 접근할 수 없습니다.' },
      { level: 2, type: 'concept', text: '`local_bonus`를 함수 안에서 선언하고 return 한 뒤, 바깥에서 `total_power = calc_shield()`로 받으세요.' },
    ],
    hiddenVariants: [
      {
        id: 'scope-check',
        goals: [
          { type: 'variableValueEquals', name: 'total_power', value: 10, label: '전역 total_power 10 저장' },
          { type: 'localVariableObserved', name: 'local_bonus', functionName: 'calc_shield', label: '함수 안의 local_bonus 생성 확인' },
          { type: 'globalVariableAbsent', name: 'local_bonus', label: 'local_bonus가 전역에 남지 않음' },
          { type: 'stdoutIncludes', value: '10', label: '스코프 분리 정상 검증' },
        ],
      },
    ],
  }),

  abilityMission({
    id: 'function-multi-06',
    codeName: '8-6',
    order: 6,
    aliases: ['lumi-act8-06', '8-6'],
    title: '역할별 함수 분리와 조립',
    objective: 'check_energy()와 handle_charge() 두 함수를 각각 정의하고 조합하여 루미를 완충하세요.',
    briefing: '하나의 거대한 코드 대신, 감지(check)와 행동(action)을 별개의 함수로 분리하여 조립하는 모듈러 구조를 설계합니다.',
    concepts: ['다중 함수', '역할 분리', '모듈러 프로그래밍'],
    pygameBridgeKey: 'function-module',
    learningSteps: [
      'def check_energy(): 에서 return lumi.energy < 30 을 작성합니다.',
      'def handle_charge(): 에서 lumi.charge() 를 실행합니다.',
      'if check_energy(): 일 때 handle_charge() 를 호출합니다.',
    ],
    world: {
      scene: 'station',
      target: false,
      rover: { x: 1, y: 2, direction: 0, energy: 15, maxEnergy: 100 },
      stations: [{ id: 'station_dock', x: 1, y: 2, label: '파워 스테이션' }],
      objects: [{ id: 'station', kind: 'charge', x: 1, y: 2 }],
    },
    goals: [
      { type: 'minimumEnergy', value: 80, label: '함수 협력을 통한 에너지 완충' },
      { type: 'functionCalled', name: 'check_energy', label: 'check_energy 호출 확인' },
      { type: 'functionCalled', name: 'handle_charge', label: 'handle_charge 호출 확인' },
    ],
    mustUse: ['function', 'return', 'if'],
    mustCall: ['check_energy', 'handle_charge', 'lumi.charge'],
    hints: [
      { level: 1, type: 'context', text: '두 함수를 각각 `def`로 정의한 뒤, `if check_energy(): handle_charge()`로 연결합니다.' },
      { level: 2, type: 'concept', text: '판단 함수와 실행 함수를 독립적으로 분리하세요.' },
    ],
    hiddenVariants: [
      {
        id: 'charge-chain',
        world: { rover: { energy: 5 } },
        goals: [{ type: 'minimumEnergy', value: 80, label: '극저 배터리에서도 두 함수 정상 연계' }],
      },
    ],
  }),

  abilityMission({
    id: 'function-field-07',
    codeName: '8-F',
    order: 7,
    aliases: ['lumi-act8-07', '8-F'],
    title: '자율 방어 및 항법 시스템',
    objective: 'detect_threat(), choose_action(), navigate() 세 함수를 완성해 적 펄스를 방어하고 비콘에 도착하세요.',
    briefing: 'FINAL ABILITY TEST입니다. 감지, 판단, 항법을 3개의 독립 함수로 모듈화하여 실시간 위협을 스스로 극복하는 최종 자율 제어 시스템을 완성하세요.',
    concepts: ['다중 함수', '매개변수', 'return', '종합 시스템'],
    pygameBridgeKey: 'function-module',
    learningSteps: [
      'def detect_threat(): 에서 return world.incoming_pulse 를 작성합니다.',
      'def choose_action(threat): 에서 if threat: lumi.shield() 를 실행합니다.',
      'def navigate(distance): 에서 lumi.move(distance) 를 실행합니다.',
      'threat = detect_threat(); choose_action(threat); navigate(world.target_distance) 순으로 호출합니다.',
    ],
    world: {
      rover: { x: 1, y: 2, direction: 0, energy: 100 },
      incomingPulse: true,
      target: { x: 6, y: 2 },
    },
    goals: [
      { type: 'shieldActive', label: '방어 함수로 보호막 가동' },
      { type: 'position', x: 6, y: 2, label: '항법 함수로 비콘 도착' },
      { type: 'functionCalled', name: 'detect_threat', label: 'detect_threat 호출 확인' },
      { type: 'functionCalled', name: 'choose_action', label: 'choose_action 호출 확인' },
      { type: 'functionCalled', name: 'navigate', label: 'navigate 호출 확인' },
    ],
    mustUse: ['function', 'return', 'if'],
    mustCall: ['detect_threat', 'choose_action', 'navigate', 'lumi.shield', 'lumi.move'],
    hints: [
      { level: 1, type: 'context', text: '1. 감지 함수 -> 2. 판단/방어 함수 -> 3. 이동 함수를 각각 정의합니다.' },
      { level: 2, type: 'concept', text: '`threat = detect_threat()`, `choose_action(threat)`, `navigate(world.target_distance)`를 차례로 호출하세요.' },
    ],
    hiddenVariants: [
      {
        id: 'far-threat-defense',
        world: { target: { x: 7, y: 2 }, incomingPulse: true },
        goals: [
          { type: 'shieldActive', label: '변형 거리 방어 가동' },
          { type: 'position', x: 7, y: 2, label: '변형 거리 비콘 도착' },
        ],
      },
    ],
  }),
]

export const LUMI_ABILITY_CORE_SET = Object.freeze({
  id: 'lumi-act-8-ability-v1',
  version: 1,
  kind: 'course-act',
  actId: 'act-8-ability',
  unitId: 'lumi_protocol_act_8_ability',
  lumiCourseId: 'lumi-season-1',
  title: 'ACT 8. ABILITY CORE (능력 코어)',
  description: 'def 함수 정의, 매개변수, return 반환, 지역 변수 & Scope 분리와 역할별 모듈러 함수를 완성하는 7개 정규 미션',
  persistencePolicy: 'official',
  rewardPolicy: 'standard-crystals',
  dailyRecordPolicy: 'official',
  assignmentEvidencePolicy: 'python-only',
  missions: LUMI_ABILITY_CORE_MISSIONS,
})
