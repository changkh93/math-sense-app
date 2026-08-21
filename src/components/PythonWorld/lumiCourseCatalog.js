/**
 * LUMI Protocol Course & Prototype Catalog
 * Defines the 10 Acts curriculum structure and the lumi-vertical-slice-v1 prototype set.
 */

export const LUMI_VERTICAL_SLICE_SET_ID = 'lumi-vertical-slice-v1'

export const LUMI_COURSE_CATALOG = Object.freeze({
  id: 'lumi-season-1',
  version: 1,
  title: 'LUMI Protocol: 사라진 빛의 항로',
  description: '고장 난 탐사 로봇 LUMI의 능력을 복원하는 10 Acts 프로그래밍 어드벤처',
  acts: [
    { id: 'act-0-awakening', title: 'ACT 0. AWAKENING', subtitle: '긴급 재부팅', coreMissions: 6, concepts: '실행 · 명령 · 값 수정 · 문자열' },
    { id: 'act-1-command', title: 'ACT 1. COMMAND CORE', subtitle: '명령 코어', coreMissions: 5, concepts: '호출 · 표현식 · 출력 · 주석 · 오류' },
    { id: 'act-2-memory', title: 'ACT 2. MEMORY CORE', subtitle: '기억 코어', coreMissions: 6, concepts: '변수 · 자료형 · f-string · input · 변환' },
    { id: 'act-3-sensor', title: 'ACT 3. SENSOR CORE', subtitle: '센서 코어', coreMissions: 5, concepts: 'world · 속성 · 비교 · Boolean' },
    { id: 'act-4-decision', title: 'ACT 4. DECISION CORE', subtitle: '판단 코어', coreMissions: 6, concepts: 'if · else · elif · 논리 연산' },
    { id: 'act-5-automation', title: 'ACT 5. AUTOMATION CORE', subtitle: '자동화 코어', coreMissions: 7, concepts: 'for · range · 누적 · 중첩 반복' },
    { id: 'act-6-persistence', title: 'ACT 6. PERSISTENCE CORE', subtitle: '지속 코어', coreMissions: 5, concepts: 'while · 상태 변화 · break · continue' },
    { id: 'act-7-data', title: 'ACT 7. DATA CORE', subtitle: '데이터 코어', coreMissions: 10, concepts: 'list · split · join · tuple · dictionary' },
    { id: 'act-8-ability', title: 'ACT 8. ABILITY CORE', subtitle: '능력 코어', coreMissions: 7, concepts: 'def · 매개변수 · return · scope · module' },
    { id: 'act-final-autonomy', title: 'FINAL. AUTONOMOUS LUMI', subtitle: '자율항법', coreMissions: 4, concepts: '센서 · 판단 · 반복 · 데이터 · 함수 통합' },
  ],
})

export const VERTICAL_SLICE_MISSIONS = [
  {
    id: 'lumi-vs-01',
    codeName: 'VS-01',
    actId: 'act-0-awakening',
    order: 1,
    difficulty: 'awakening',
    title: '어둠 속 신호',
    eyebrow: 'ACT 0 · AWAKENING',
    objective: 'RUN 버튼을 눌러 어둠 속 잠든 루미를 깨우세요.',
    briefing: '신호 폭풍으로 루미의 코어가 꺼져 있습니다. 코드를 실행해 루미를 재부팅하세요.',
    concepts: ['실행', '명령'],
    scaffold: {
      mode: 'view-only',
      visibleTools: ['run'],
      unlocksOnComplete: ['reset'],
    },
    starterCode: 'lumi.wake()',
    world: {
      width: 6,
      height: 5,
      rover: { x: 2, y: 2, direction: 0, energy: 100, awake: false },
      target: { x: 2, y: 2, kind: 'beacon' },
      obstacles: [],
    },
    goals: [
      { type: 'awake' },
    ],
    conceptEvidence: {
      mustCall: ['lumi.wake'],
    },
    hints: [
      { level: 1, type: 'context', text: '오른쪽 편집창 아래의 초록색 ▶ RUN 버튼을 눌러보세요.' },
      { level: 2, type: 'concept', text: '`lumi.wake()` 명령은 잠들어 있는 루미의 코어를 켭니다.' },
    ],
    hiddenVariants: [],
  },
  {
    id: 'lumi-vs-02',
    codeName: 'VS-02',
    actId: 'act-0-awakening',
    order: 2,
    difficulty: 'awakening',
    title: '첫걸음',
    eyebrow: 'ACT 0 · AWAKENING',
    objective: '코드를 실행해 루미를 한 칸 앞으로 이동시키세요.',
    briefing: '루미의 이동 모듈이 응답했습니다. 한 칸 앞의 빛나는 발판으로 이동하세요.',
    concepts: ['이동 명령', '인자'],
    scaffold: {
      mode: 'view-only',
      visibleTools: ['run', 'reset'],
      unlocksOnComplete: ['edit-token'],
    },
    starterCode: 'lumi.move(1)',
    world: {
      width: 6,
      height: 5,
      rover: { x: 1, y: 2, direction: 0, energy: 100, awake: true },
      target: { x: 2, y: 2, kind: 'pad' },
      obstacles: [],
    },
    goals: [
      { type: 'position', x: 2, y: 2 },
    ],
    conceptEvidence: {
      mustCall: ['lumi.move'],
    },
    hints: [
      { level: 1, type: 'context', text: '루미의 앞쪽에 있는 발판 위치를 확인하고 RUN을 눌러보세요.' },
      { level: 2, type: 'concept', text: '`lumi.move(1)`은 루미가 바라보는 방향으로 1칸 전진합니다.' },
    ],
    hiddenVariants: [],
  },
  {
    id: 'lumi-vs-03',
    codeName: 'VS-03',
    actId: 'act-0-awakening',
    order: 3,
    difficulty: 'awakening',
    title: '에너지 셀까지',
    eyebrow: 'ACT 0 · AWAKENING',
    objective: '괄호 안의 숫자를 수정하여 루미를 3칸 앞 에너지 셀까지 이동시키세요.',
    briefing: '에너지 셀이 3칸 앞에 있습니다. 괄호 안의 숫자를 바꾸어 한 번에 도달해 보세요.',
    concepts: ['값 수정', '정수 리터럴'],
    scaffold: {
      mode: 'edit-token',
      highlightToken: '1',
      visibleTools: ['run', 'reset'],
      unlocksOnComplete: ['step', 'replay'],
    },
    starterCode: 'lumi.move(1)',
    world: {
      width: 6,
      height: 5,
      rover: { x: 1, y: 2, direction: 0, energy: 100, awake: true },
      target: { x: 4, y: 2, kind: 'energy' },
      obstacles: [],
    },
    goals: [
      { type: 'position', x: 4, y: 2 },
    ],
    conceptEvidence: {
      mustCall: ['lumi.move'],
    },
    hints: [
      { level: 1, type: 'context', text: '루미(1)에서 에너지 셀(4)까지 몇 칸이 떨어져 있는지 세어보세요.' },
      { level: 2, type: 'concept', text: '`lumi.move(1)`의 숫자 1을 3으로 변경해 보세요.' },
    ],
    hiddenVariants: [],
  },
  {
    id: 'lumi-vs-04',
    codeName: 'VS-04',
    actId: 'act-0-awakening',
    order: 4,
    difficulty: 'awakening',
    title: '꺾인 항로',
    eyebrow: 'ACT 0 · AWAKENING',
    objective: '위에서 아래로 순차 실행되는 명령을 조합하여 비콘에 도달하세요.',
    briefing: '항로가 직진 후 아래쪽으로 꺾여 있습니다. 명령이 위에서 아래로 차례대로 실행됨을 관찰하세요.',
    concepts: ['순차 실행', '회전 명령'],
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'replay'],
      unlocksOnComplete: ['say'],
    },
    starterCode: [
      'lumi.move(2)',
      'lumi.turn(90)',
      'lumi.move(1)',
    ].join('\n'),
    world: {
      width: 6,
      height: 5,
      rover: { x: 1, y: 1, direction: 0, energy: 100, awake: true },
      target: { x: 3, y: 2, kind: 'beacon' },
      obstacles: [],
    },
    goals: [
      { type: 'position', x: 3, y: 2 },
    ],
    conceptEvidence: {
      mustCall: ['lumi.move', 'lumi.turn'],
    },
    hints: [
      { level: 1, type: 'context', text: '루미가 먼저 2칸 전진하고, 시계 방향으로 90도 회전한 뒤 1칸 전진합니다.' },
      { level: 2, type: 'concept', text: 'Step 버튼을 눌러 각 줄이 차례대로 실행되는 모습을 관찰하세요.' },
    ],
    hiddenVariants: [],
  },
  {
    id: 'lumi-vs-05',
    codeName: 'VS-05',
    actId: 'act-0-awakening',
    order: 5,
    difficulty: 'awakening',
    title: '첫 교신',
    eyebrow: 'ACT 0 · AWAKENING',
    objective: '루미가 따옴표 안의 인사 메시지를 말하게 하세요.',
    briefing: '통신 안테나가 복구되었습니다. 루미의 말풍선으로 관제소에 신호를 보내세요.',
    concepts: ['문자열 리터럴', '따옴표'],
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'replay'],
      unlocksOnComplete: [],
    },
    starterCode: 'lumi.say("신호 수신")',
    world: {
      width: 6,
      height: 5,
      rover: { x: 2, y: 2, direction: 0, energy: 100, awake: true },
      target: { x: 2, y: 2, kind: 'beacon' },
      obstacles: [],
    },
    goals: [
      { type: 'eventOccurred', eventType: 'rover_spoke' },
    ],
    conceptEvidence: {
      mustCall: ['lumi.say'],
    },
    hints: [
      { level: 1, type: 'context', text: '따옴표 `" "` 안에 원하는 인사말을 넣고 실행해 보세요.' },
      { level: 2, type: 'concept', text: '문자열 양쪽에는 반드시 닫는 따옴표가 있어야 합니다.' },
    ],
    hiddenVariants: [],
  },
  {
    id: 'lumi-vs-06',
    codeName: 'VS-06',
    actId: 'act-0-awakening',
    order: 6,
    difficulty: 'field-test',
    title: 'Field Test: 구조 비콘',
    eyebrow: 'ACT 0 · MOVEMENT CORE FIELD TEST',
    objective: '배운 명령들을 조합하여 장애물을 피해 비콘에 도달하고 신호를 보내세요.',
    briefing: '지금까지 배운 이동, 회전, 말하기를 결합해 구조 비콘을 활성화하세요!',
    concepts: ['명령 조합', '종합 순차 실행'],
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'replay'],
      unlocksOnComplete: ['movement-core'],
    },
    starterCode: [
      'lumi.move(2)',
      'lumi.turn(90)',
      'lumi.move(2)',
      'lumi.say("비콘 도착")',
    ].join('\n'),
    world: {
      width: 6,
      height: 5,
      rover: { x: 1, y: 1, direction: 0, energy: 100, awake: true },
      target: { x: 3, y: 3, kind: 'beacon' },
      obstacles: [{ x: 2, y: 2 }],
    },
    goals: [
      { type: 'position', x: 3, y: 3 },
      { type: 'eventOccurred', eventType: 'rover_spoke' },
    ],
    conceptEvidence: {
      mustCall: ['lumi.move', 'lumi.turn', 'lumi.say'],
    },
    hints: [
      { level: 1, type: 'context', text: '중간의 장애물을 피해 (1,1)에서 (3,1)로 간 뒤 아래쪽으로 회전해 (3,3)으로 이동하세요.' },
      { level: 2, type: 'concept', text: '도착 후 `lumi.say("...")`를 실행해야 구조 비콘이 완전히 활성화됩니다.' },
    ],
    hiddenVariants: [
      {
        id: 'variant-offset-1',
        world: { rover: { x: 0, y: 1 }, target: { x: 2, y: 3 } },
        goals: [
          { type: 'position', x: 2, y: 3 },
          { type: 'eventOccurred', eventType: 'rover_spoke' },
        ],
      },
    ],
  },
  {
    id: 'lumi-vs-07',
    codeName: 'VS-07',
    actId: 'act-2-memory',
    order: 7,
    difficulty: 'core',
    title: '첫 기억 슬롯',
    eyebrow: 'ACT 2 · MEMORY CORE',
    objective: '변수 steps에 이동할 칸 수를 저장하고 루미를 목표까지 이동시키세요.',
    briefing: '변수는 값을 기억하는 이름입니다. steps 변수에 3을 저장해 명령에 사용하세요.',
    concepts: ['변수', '대입 연산자'],
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'replay', 'memory', 'mission-tabs', 'hud'],
      unlocksOnComplete: ['memory-core'],
    },
    starterCode: [
      'steps = 3',
      'lumi.move(steps)',
    ].join('\n'),
    world: {
      width: 6,
      height: 5,
      rover: { x: 1, y: 2, direction: 0, energy: 100, awake: true },
      target: { x: 4, y: 2, kind: 'beacon' },
      obstacles: [],
    },
    goals: [
      { type: 'position', x: 4, y: 2 },
    ],
    conceptEvidence: {
      mustUse: ['variable'],
      mustCall: ['lumi.move'],
    },
    hints: [
      { level: 1, type: 'context', text: '오른쪽 아래 MEMORY CORE에 steps 변수 값이 생성되는 것을 확인하세요.' },
      { level: 2, type: 'concept', text: '`steps = 3`은 3이라는 값을 steps라는 이름 상자에 넣는 대입문입니다.' },
    ],
    hiddenVariants: [],
  },
  {
    id: 'lumi-vs-08',
    codeName: 'VS-08',
    actId: 'act-2-memory',
    order: 8,
    difficulty: 'core',
    title: '남은 에너지',
    eyebrow: 'ACT 2 · MEMORY CORE',
    objective: '변수의 값을 연산하여 갱신하고 결과를 루미가 말하게 하세요.',
    briefing: '에너지 5에서 2를 소모한 남은 에너지를 계산하여 say 명령으로 보고하세요.',
    concepts: ['변수 갱신', '표현식 계산'],
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'replay', 'memory', 'mission-tabs', 'hud'],
      unlocksOnComplete: ['sensor'],
    },
    starterCode: [
      'energy = 5',
      'energy = energy - 2',
      'lumi.say(energy)',
    ].join('\n'),
    world: {
      width: 6,
      height: 5,
      rover: { x: 2, y: 2, direction: 0, energy: 100, awake: true },
      target: { x: 2, y: 2, kind: 'beacon' },
      obstacles: [],
    },
    goals: [
      { type: 'eventOccurred', eventType: 'rover_spoke' },
    ],
    conceptEvidence: {
      mustUse: ['variable'],
      mustCall: ['lumi.say'],
    },
    hints: [
      { level: 1, type: 'context', text: 'Memory Core에서 energy가 5에서 3으로 변하는 과정을 확인하세요.' },
      { level: 2, type: 'concept', text: '오른쪽의 `energy - 2`가 먼저 계산된 뒤 왼쪽의 `energy` 변수에 다시 저장됩니다.' },
    ],
    hiddenVariants: [],
  },
  {
    id: 'lumi-vs-09',
    codeName: 'VS-09',
    actId: 'act-3-sensor',
    order: 9,
    difficulty: 'core',
    title: 'WORLD 센서',
    eyebrow: 'ACT 3 · SENSOR CORE',
    objective: 'world.steps_to_target 센서 값을 읽어 목표 거리가 바뀌어도 도달하게 하세요.',
    briefing: 'world 객체는 탐험 환경의 상태를 실시간으로 제공합니다. 고정 숫자 대신 센서 값을 사용하세요.',
    concepts: ['world 센서', '일반화'],
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'replay', 'memory', 'sensor', 'mission-tabs', 'hud'],
      unlocksOnComplete: ['decision'],
    },
    starterCode: [
      'steps = world.steps_to_target',
      'lumi.move(steps)',
    ].join('\n'),
    world: {
      width: 8,
      height: 5,
      rover: { x: 1, y: 2, direction: 0, energy: 100, awake: true },
      target: { x: 5, y: 2, kind: 'beacon' },
      obstacles: [],
    },
    goals: [
      { type: 'position', x: 5, y: 2 },
    ],
    conceptEvidence: {
      mustCall: ['lumi.move'],
    },
    hints: [
      { level: 1, type: 'context', text: 'SENSOR 오버레이에서 루미와 비콘 사이의 steps_to_target 값을 확인하세요.' },
      { level: 2, type: 'concept', text: '`world.steps_to_target`은 목표까지 남은 칸 수를 자동으로 계산해 줍니다.' },
    ],
    hiddenVariants: [
      { id: 'near-target', world: { target: { x: 3, y: 2 } }, goal: { x: 3, y: 2 } },
      { id: 'far-target', world: { target: { x: 7, y: 2 } }, goal: { x: 7, y: 2 } },
    ],
  },
  {
    id: 'lumi-vs-10',
    codeName: 'VS-10',
    actId: 'act-4-decision',
    order: 10,
    difficulty: 'field-test',
    title: '안전할 때만 출발',
    eyebrow: 'ACT 4 · DECISION CORE',
    objective: 'if 조건문으로 전방 항로가 안전(world.path_clear)할 때만 출발하도록 판단하세요.',
    briefing: '항로에 낙석이 떨어질 수 있습니다. world.path_clear가 참(True)일 때만 이동하는 안전 조건문을 완성하세요.',
    concepts: ['if 조건문', 'Boolean 판단'],
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'replay', 'memory', 'sensor', 'mission-tabs', 'hud'],
      unlocksOnComplete: ['all-vertical-slice'],
    },
    starterCode: [
      'if world.path_clear:',
      '    lumi.move(world.steps_to_target)',
    ].join('\n'),
    world: {
      width: 8,
      height: 5,
      rover: { x: 1, y: 2, direction: 0, energy: 100, awake: true },
      target: { x: 5, y: 2, kind: 'beacon' },
      pathClear: true,
      obstacles: [],
    },
    goals: [
      { type: 'position', x: 5, y: 2 },
    ],
    conceptEvidence: {
      mustUse: ['if'],
    },
    hints: [
      { level: 1, type: 'context', text: '공개 상태에서는 path_clear가 True이므로 비콘까지 이동합니다.' },
      { level: 2, type: 'concept', text: '변형 테스트에서는 path_clear가 False가 되어 if 블록 안의 코드가 건너뛰어집니다.' },
    ],
    hiddenVariants: [
      {
        id: 'blocked-path',
        world: {
          pathClear: false,
          obstacles: [{ x: 2, y: 2 }],
        },
        goals: [
          { type: 'positionUnchanged', x: 1, y: 2 },
          { type: 'noCollision' },
        ],
      },
    ],
  },
]

export const LUMI_VERTICAL_SLICE_SET = Object.freeze({
  id: LUMI_VERTICAL_SLICE_SET_ID,
  version: 1,
  kind: 'prototype',
  title: 'LUMI Protocol Vertical Slice (10 Missions)',
  description: 'Turtle 경험자가 40~70분에 걸쳐 탐사 로봇 LUMI의 코어를 복원하는 프로토타입 체험 세트',
  missions: VERTICAL_SLICE_MISSIONS,
})

export function getLumiVerticalSliceSet() {
  return LUMI_VERTICAL_SLICE_SET
}

export function getLumiCourseCatalog() {
  return LUMI_COURSE_CATALOG
}
