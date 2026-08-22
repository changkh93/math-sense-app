/**
 * LUMI Protocol Course & Prototype Catalog
 * Defines the 10 Acts curriculum structure and the lumi-vertical-slice-v1 prototype set.
 */

export const LUMI_VERTICAL_SLICE_SET_ID = 'lumi-vertical-slice-v1'

export const LUMI_COURSE_CATALOG = Object.freeze({
  id: 'lumi-season-1',
  version: 1,
  title: 'LUMI Protocol: 사라진 빛의 항로',
  description: '고장 난 탐사 로봇 LUMI의 능력을 복원하는 ACT 0~9 + FINAL 프로그래밍 어드벤처',
  acts: [
    { id: 'act-0-awakening', title: 'ACT 0. AWAKENING', subtitle: '긴급 재부팅', coreMissions: 10, concepts: '실행 · 명령 · 값 수정 · 문자열' },
    { id: 'act-1-command', title: 'ACT 1. COMMAND CORE', subtitle: '명령 코어', coreMissions: 5, concepts: '호출 · 표현식 · 출력 · 주석 · 오류' },
    { id: 'act-2-memory', title: 'ACT 2. MEMORY CORE', subtitle: '기억 코어', coreMissions: 6, concepts: '변수 · 자료형 · f-string · input · 변환' },
    { id: 'act-3-sensor', title: 'ACT 3. SENSOR CORE', subtitle: '센서 코어', coreMissions: 5, concepts: 'world · 속성 · 거리 센서 · 비교 · Boolean' },
    { id: 'act-4-decision', title: 'ACT 4. DECISION CORE', subtitle: '판단 코어', coreMissions: 6, concepts: 'if · else · elif · 논리 연산' },
    { id: 'act-5-automation', title: 'ACT 5. AUTOMATION CORE', subtitle: '자동화 코어', coreMissions: 7, concepts: 'for · range · 누적 · 순회 · 중첩 반복' },
    { id: 'act-6-persistence', title: 'ACT 6. PERSISTENCE CORE', subtitle: '지속 코어', coreMissions: 6, concepts: 'while · 상태 변화 · 반복 조건 · 공개 베타' },
    { id: 'act-7-data', title: 'ACT 7. DATA CORE', subtitle: '데이터 코어', coreMissions: 5, concepts: 'list · split · join · tuple · dictionary · 공개 베타' },
    { id: 'act-8-ability', title: 'ACT 8. ABILITY CORE', subtitle: '능력 코어', coreMissions: 6, concepts: 'def · 매개변수 · return · 모듈화 · 공개 베타' },
    { id: 'act-9-object-core', title: 'ACT 9. OBJECT CORE', subtitle: '객체 코어', coreMissions: 8, concepts: 'class · instance · __init__ · self · method' },
    { id: 'act-final-the-lost-light', title: 'FINAL. THE LOST LIGHT', subtitle: '자율항법', coreMissions: 4, concepts: '센서 · 판단 · 반복 · 데이터 · 함수 · 객체 통합' },
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
    briefing: '신호 폭풍으로 LUMI의 모든 코어가 다운되었습니다. 비상 재부팅 신호를 전송하세요.',
    concepts: ['실행', '명령'],
    restorationLevel: 10,
    lumiVoice: '...신호... 들려요. 관제사님.',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'core',
      baseCrystals: 4,
      firstCompletionOnly: true,
    },
    memoryFragment: {
      label: '긴급 재부팅 프로토콜',
      code: 'lumi.wake()',
      duration: 0,
      autoPlay: false,
    },
    scaffold: {
      mode: 'view-only',
      stage: 'observe',
      allowSolvedStarter: true,
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
    objective: '손상된 이동 신호를 복원하여 루미를 1칸 앞 발판으로 이동시키세요.',
    briefing: '추진 노즐이 반응했습니다. 손상된 이동 명령 신호를 복원하여 전방 발판으로 이동하세요.',
    concepts: ['이동 명령', '인자'],
    restorationLevel: 20,
    lumiVoice: '1칸 전진 완료! 추진 노즐 정상 가동.',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'core',
      baseCrystals: 4,
      firstCompletionOnly: true,
    },
    memoryFragment: {
      label: '손상된 이동 명령 파편',
      code: 'lumi.move(1)',
      duration: 2500,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset'],
      unlocksOnComplete: ['edit-token'],
    },
    starterCode: '# 이동할 칸수(1)를 괄호 안에 입력하세요\nlumi.move(0)',
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
      { level: 1, type: 'context', text: '루미의 앞쪽에 있는 발판(2, 2)으로 가려면 1칸 전진해야 합니다. `lumi.move(1)`로 변경하세요.' },
      { level: 2, type: 'concept', text: '`lumi.move(칸수)`는 루미가 바라보는 방향으로 지정한 칸수만큼 전진하는 명령입니다.' },
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
    briefing: '에너지 셀이 3칸 앞에 있습니다. 괄호 안의 숫자 1을 바꾸어 한 번에 도달해 보세요.',
    concepts: ['값 수정', '정수 리터럴'],
    restorationLevel: 30,
    lumiVoice: '에너지 셀 흡수 완료! 동력 안정화 중.',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'core',
      baseCrystals: 4,
      firstCompletionOnly: true,
    },
    memoryFragment: {
      label: '거리 인자 파편',
      code: 'lumi.move(3)',
      duration: 2500,
      autoPlay: true,
    },
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
      { level: 1, type: 'context', text: '루미(1)에서 에너지 셀(4)까지 몇 칸이 떨어져 있는지 세어보세요. (4 - 1 = 3)' },
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
    restorationLevel: 40,
    lumiVoice: '방향 전환 성공! 꺾인 항로 돌파.',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'core',
      baseCrystals: 4,
      firstCompletionOnly: true,
    },
    memoryFragment: {
      label: '순차 항로 기억',
      code: 'lumi.move(2)\nlumi.turn(90)\nlumi.move(1)',
      duration: 3000,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'replay'],
      unlocksOnComplete: ['say'],
    },
    starterCode: 'lumi.move(2)\nlumi.turn(90)\n# 남쪽으로 1칸 전진하는 명령을 아래에 추가하세요\n',
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
      { level: 2, type: 'concept', text: '세 번째 줄에 `lumi.move(1)`을 추가해 보세요.' },
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
    restorationLevel: 50,
    lumiVoice: '관제소 응답 확인! 통신 링크 활성화.',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'core',
      baseCrystals: 4,
      firstCompletionOnly: true,
    },
    memoryFragment: {
      label: '통신 프로토콜 파편',
      code: 'lumi.say("신호 수신")',
      duration: 2500,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'replay'],
      unlocksOnComplete: [],
    },
    starterCode: 'lumi.say("")',
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
      { level: 1, type: 'context', text: '따옴표 `" "` 안에 원하는 인사말(예: "신호 수신")을 넣고 실행해 보세요.' },
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
    restorationLevel: 60,
    lumiVoice: 'MOVEMENT CORE 복원 성공! 1성 코어 가동.',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'field-test',
      baseCrystals: 8,
      firstCompletionOnly: true,
    },
    memoryFragment: {
      label: '구조 비콘 활성화 항로',
      code: 'lumi.move(2)\nlumi.turn(90)\nlumi.move(2)\nlumi.say("비콘 도착")',
      duration: 3500,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'replay'],
      unlocksOnComplete: ['movement-core'],
    },
    starterCode: 'lumi.move(2)\nlumi.turn(90)\n# 비콘(3, 3)으로 2칸 이동 후 도착 신호를 전송하세요\n',
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
        world: {
          rover: { x: 0, y: 1 },
          target: { x: 2, y: 3 },
          obstacles: [{ x: 1, y: 2 }],
        },
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
    restorationLevel: 70,
    lumiVoice: '기억 코어 활성화! 변수 슬롯 등록 완료.',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'core',
      baseCrystals: 4,
      firstCompletionOnly: true,
    },
    memoryFragment: {
      label: '기억 슬롯(변수) 신호',
      code: 'steps = 3\nlumi.move(steps)',
      duration: 3000,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'replay', 'memory', 'mission-tabs', 'hud'],
      unlocksOnComplete: ['memory-core'],
    },
    starterCode: 'steps = 1\nlumi.move(steps)',
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
      { level: 1, type: 'context', text: '오른쪽 아래 MEMORY CORE에 steps 변수 값이 생성되는 것을 확인하세요. 목표는 3칸 앞에 있습니다.' },
      { level: 2, type: 'concept', text: '`steps = 3`으로 변수 값을 변경해 보세요.' },
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
    restorationLevel: 80,
    lumiVoice: '연산 완료. 잔여 에너지 3 확인!',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'core',
      baseCrystals: 4,
      firstCompletionOnly: true,
    },
    memoryFragment: {
      label: '에너지 연산 파편',
      code: 'energy = 5\nenergy = energy - 2\nlumi.say(energy)',
      duration: 3000,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'replay', 'memory', 'mission-tabs', 'hud'],
      unlocksOnComplete: ['sensor'],
    },
    starterCode: 'energy = 5\nenergy = energy - 1\nlumi.say(energy)',
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
      { level: 2, type: 'concept', text: '`energy = energy - 2`로 수정하여 남은 에너지 3을 계산하세요.' },
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
    restorationLevel: 90,
    lumiVoice: '거리 센서 동기화 완료! 목표 추적 양호.',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'core',
      baseCrystals: 4,
      firstCompletionOnly: true,
    },
    memoryFragment: {
      label: '월드 거리 센서',
      code: 'steps = world.steps_to_target\nlumi.move(steps)',
      duration: 3000,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'replay', 'memory', 'sensor', 'mission-tabs', 'hud'],
      unlocksOnComplete: ['decision'],
    },
    starterCode: 'steps = 1\nlumi.move(steps)',
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
      { level: 2, type: 'concept', text: '`steps = world.steps_to_target`로 센서 값을 읽어오면 목표 거리가 바뀌어도 항상 성공합니다.' },
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
    restorationLevel: 100,
    lumiVoice: 'DECISION CORE 복원! 자율 항법 프로토콜 승인.',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'field-test',
      baseCrystals: 8,
      firstCompletionOnly: true,
    },
    memoryFragment: {
      label: '조건 판단 프로토콜',
      code: 'if world.path_clear:\n    lumi.move(world.steps_to_target)',
      duration: 3500,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'replay', 'memory', 'sensor', 'mission-tabs', 'hud'],
      unlocksOnComplete: ['all-vertical-slice'],
    },
    starterCode: 'if False:\n    lumi.move(world.steps_to_target)',
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
  actId: 'act-0-awakening',
  unitId: 'lumi_protocol_vertical_slice',
  lumiCourseId: 'lumi-season-1',
  title: 'LUMI Protocol Vertical Slice (10 Missions)',
  description: 'Turtle 경험자가 40~70분에 걸쳐 탐사 로봇 LUMI의 코어를 복원하는 프로토타입 체험 세트',
  missions: VERTICAL_SLICE_MISSIONS,
})

export const ACT_1_MISSIONS = [
  {
    id: 'lumi-act1-01',
    codeName: '1-1',
    actId: 'act-1-command',
    order: 1,
    difficulty: 'core',
    title: '다중 명령 순차 실행',
    eyebrow: 'ACT 1 · COMMAND CORE',
    objective: '이동과 회전 명령을 연속으로 호출하여 꺾인 L자 항로의 에너지 비콘에 도달하세요.',
    briefing: '명령 코어가 2단계로 전원을 인가받았습니다. `lumi.move()`와 `lumi.turn()`을 순서대로 조합하여 경로를 완주하세요.',
    concepts: ['함수 호출', '순차 실행', '각도 인자'],
    restorationLevel: 20,
    lumiVoice: '2연속 명령 수신 완료! 항로 추적 성공.',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'core',
      baseCrystals: 4,
      firstCompletionOnly: true,
    },
    memoryFragment: {
      label: '손상된 L자 궤도 신호',
      code: 'lumi.move(___)\nlumi.turn(90)\nlumi.move(___)',
      duration: 3000,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'timeline'],
    },
    starterCode: `# [L자 항로 비행 지시서]
# 1. 동쪽(전방)으로 2칸 전진하세요.


# 2. 남쪽으로 방향을 90도 회전하세요.


# 3. 남쪽으로 2칸 전진하여 비콘에 도달하세요.

`,
    world: {
      width: 6,
      height: 6,
      rover: { x: 1, y: 1, direction: 0, energy: 100, awake: true },
      target: { x: 3, y: 3, kind: 'beacon' },
      obstacles: [{ x: 4, y: 1 }, { x: 3, y: 0 }],
    },
    goals: [
      { type: 'position', x: 3, y: 3 },
    ],
    conceptEvidence: {
      mustCall: ['lumi.move', 'lumi.turn'],
    },
    hints: [
      { level: 1, type: 'context', text: '먼저 동쪽으로 2칸 이동한 뒤, 90도 회전하여 남쪽으로 2칸 이동하세요.' },
      { level: 2, type: 'concept', text: '`lumi.move(2)` 다음에 `lumi.turn(90)`을 실행하면 우측으로 방향을 끕니다.' },
    ],
    hiddenVariants: [],
  },
  {
    id: 'lumi-act1-02',
    codeName: '1-2',
    actId: 'act-1-command',
    order: 2,
    difficulty: 'core',
    title: '수식 표현식 인자',
    eyebrow: 'ACT 1 · COMMAND CORE',
    objective: '인자에 덧셈 표현식(예: 2 + 3)을 직접 전달하여 5칸 거리의 장거리 비콘에 도달하세요.',
    briefing: 'Python은 함수의 괄호 안에서 수식을 먼저 계산한 뒤 결과를 전달합니다. `lumi.move(2 + 3)`을 실행해보세요.',
    concepts: ['표현식', '산술 연산', '인자 평가'],
    restorationLevel: 40,
    lumiVoice: '표현식 연산 일치! 5칸 가속 이동 완료.',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'core',
      baseCrystals: 4,
      firstCompletionOnly: true,
    },
    memoryFragment: {
      label: '수식 인자 계산 패턴',
      code: 'lumi.move(___ + ___)',
      duration: 3000,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'timeline'],
    },
    starterCode: `# [수식 인자 전달 지시서]
# 목표 비콘은 전방 5칸 거리에 있습니다.
# 덧셈 수식(예: 2 + 3)을 lumi.move() 괄호 안에 입력하여 이동하세요.

`,
    world: {
      width: 8,
      height: 5,
      rover: { x: 1, y: 2, direction: 0, energy: 100, awake: true },
      target: { x: 6, y: 2, kind: 'beacon' },
      obstacles: [],
    },
    goals: [
      { type: 'position', x: 6, y: 2 },
    ],
    conceptEvidence: {
      mustUse: ['+'],
      mustCall: ['lumi.move'],
    },
    hints: [
      { level: 1, type: 'context', text: '비콘은 현재 위치에서 5칸 떨어져 있습니다. 2 + 3 수식을 인자로 넣어보세요.' },
      { level: 2, type: 'concept', text: '`lumi.move(2 + 3)`처럼 숫자를 직접 더하는 수식을 전달할 수 있습니다.' },
    ],
    hiddenVariants: [
      {
        world: {
          width: 10,
          height: 5,
          rover: { x: 1, y: 2, direction: 0, energy: 100, awake: true },
          target: { x: 8, y: 2, kind: 'beacon' },
          obstacles: [],
        },
        goals: [{ type: 'position', x: 8, y: 2 }],
      },
    ],
  },
  {
    id: 'lumi-act1-03',
    codeName: '1-3',
    actId: 'act-1-command',
    order: 3,
    difficulty: 'core',
    title: '콘솔 출력 시스템',
    eyebrow: 'ACT 1 · COMMAND CORE',
    objective: 'print("LUMI ONLINE") 명령으로 관제 센터에 텔레메트리를 출력하고 목표 비콘으로 이동하세요.',
    briefing: '`print(...)` 함수는 컴퓨터 터미널(OUTPUT 창)에 텍스트를 출력하는 가장 기본적인 표준 명령입니다. 코드를 실행하고 OUTPUT 탭을 확인하세요.',
    concepts: ['print()', '표준 출력', '문자열 인자'],
    restorationLevel: 60,
    lumiVoice: '텔레메트리 출력 확인! 관제 센터와 통신 연결.',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'core',
      baseCrystals: 4,
      firstCompletionOnly: true,
    },
    memoryFragment: {
      label: '관제 텔레메트리 프로토콜',
      code: 'print("...")\nlumi.move(___)',
      duration: 3000,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'timeline', 'inspector'],
    },
    starterCode: `# [콘솔 텔레메트리 출력 지시서]
# 1. print() 함수를 사용해 "LUMI ONLINE" 메시지를 터미널에 출력하세요.


# 2. 목표 비콘이 있는 3칸 전방으로 이동하세요.

`,
    world: {
      width: 7,
      height: 5,
      rover: { x: 1, y: 2, direction: 0, energy: 100, awake: true },
      target: { x: 4, y: 2, kind: 'beacon' },
      obstacles: [],
    },
    goals: [
      { type: 'position', x: 4, y: 2 },
      { type: 'stdoutIncludes', value: 'LUMI ONLINE' },
    ],
    conceptEvidence: {
      mustCall: ['print', 'lumi.move'],
    },
    hints: [
      { level: 1, type: 'context', text: '첫 번째 줄에 `print("LUMI ONLINE")`을 작성하고 다음 줄에 이동 명령을 추가하세요.' },
      { level: 2, type: 'concept', text: '`print(...)`는 터미널에 메시지를 출력하는 내장 함수입니다.' },
    ],
    hiddenVariants: [],
  },
  {
    id: 'lumi-act1-04',
    codeName: '1-4',
    actId: 'act-1-command',
    order: 4,
    difficulty: 'core',
    title: '주석 처리와 디버깅',
    eyebrow: 'ACT 1 · COMMAND CORE',
    objective: '전방 장애물로 직진할 수 없는 위험 명령(# lumi.move(4))을 주석 처리하고, 안전한 우회 항로로 비콘에 도달하세요.',
    briefing: '전방에 거대한 크레이터 장애물이 있습니다. 직진 명령 앞에 #을 붙여 주석(Comment) 처리하여 비활성화하고, 아래쪽으로 우회하여 비콘에 도달하세요.',
    concepts: ['주석(#)', '디버깅', '코드 비활성화'],
    restorationLevel: 80,
    lumiVoice: '위험 직진 무력화 완료! 안전 우회 항로 통과.',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'core',
      baseCrystals: 4,
      firstCompletionOnly: true,
    },
    memoryFragment: {
      label: '장애물 감지 및 우회 힌트',
      code: '# 위험 명령 무력화: # lumi.move(...)\nlumi.turn(90)\nlumi.move(___)',
      duration: 3500,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'timeline'],
    },
    starterCode: `# [위험 디버깅 지시서]
# 아래 직진 명령은 전방 크레이터와 충돌합니다. 맨 앞에 '#'을 추가하여 주석 처리하세요.
lumi.move(4)

# [안전 우회 항로 작성]
# 남쪽으로 90도 회전 -> 2칸 전진 -> -90도 회전 -> 3칸 전진하여 비콘에 도달하세요.

`,
    world: {
      width: 7,
      height: 6,
      rover: { x: 1, y: 2, direction: 0, energy: 100, awake: true },
      target: { x: 4, y: 4, kind: 'beacon' },
      obstacles: [
        { x: 2, y: 2 },
        { x: 3, y: 2 },
        { x: 4, y: 2 },
        { x: 5, y: 2 },
      ],
    },
    goals: [
      { type: 'position', x: 4, y: 4 },
      { type: 'noCollision' },
      { type: 'commentedOutCall', call: 'lumi.move' },
    ],
    conceptEvidence: {
      mustCall: ['lumi.turn', 'lumi.move'],
    },
    hints: [
      { level: 1, type: 'context', text: '전방(y=2)에 장애물이 있으므로 `# lumi.move(4)`처럼 주석 처리하고 남쪽(90도)으로 우회하세요.' },
      { level: 2, type: 'concept', text: '`#` 기호가 붙은 줄은 Python이 실행하지 않으므로 위험한 명령을 비활성화할 수 있습니다.' },
    ],
    hiddenVariants: [
      {
        world: {
          width: 7,
          height: 6,
          rover: { x: 1, y: 2, direction: 0, energy: 100, awake: true },
          target: { x: 5, y: 4, kind: 'beacon' },
          obstacles: [
            { x: 2, y: 2 },
            { x: 3, y: 2 },
            { x: 4, y: 2 },
          ],
        },
        goals: [
          { type: 'position', x: 5, y: 4 },
          { type: 'noCollision' },
          { type: 'commentedOutCall', call: 'lumi.move' },
        ],
      },
    ],
  },
  {
    id: 'lumi-act1-05',
    codeName: '1-5',
    actId: 'act-1-command',
    order: 5,
    difficulty: 'field-test',
    title: 'Field Test: 명령 코어 마스터',
    eyebrow: 'ACT 1 · COMMAND CORE',
    objective: '순차 호출, 수식 계산, 텔레메트리 출력을 총동원하여 복잡한 크레이터를 극복하고 명령 코어를 100% 복원하세요.',
    briefing: '명령 코어 복원의 최종 테스트입니다. print("COMMAND CORE 100%")를 출력하고 지그재그 항로를 정밀하게 비행하여 최종 비콘에 도달하세요.',
    concepts: ['명령 코어 종합', '수식 인자', '텔레메트리', '정밀 항법'],
    restorationLevel: 100,
    lumiVoice: 'COMMAND CORE 100% 복원 완료! 관제 신호 완벽 수신.',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'field-test',
      baseCrystals: 8,
      firstCompletionOnly: true,
    },
    memoryFragment: {
      label: '명령 코어 마스터 종합 개요',
      code: 'print("COMMAND CORE 100%")\nlumi.move(___ + ___)\n# 지그재그 항로 기동',
      duration: 3500,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'timeline', 'inspector'],
    },
    starterCode: `# === ACT 1 FIELD TEST: 명령 코어 마스터 ===
# 1. print() 함수로 "COMMAND CORE 100%"를 출력하세요.


# 2. 덧셈 수식(1 + 2)을 사용해 전방으로 3칸 이동하세요.


# 3. 우회전(90도) -> 2칸 전진 -> 좌회전(-90도) -> 2칸 전진하여 최종 비콘에 도달하세요.

`,
    world: {
      width: 8,
      height: 6,
      rover: { x: 1, y: 1, direction: 0, energy: 100, awake: true },
      target: { x: 6, y: 3, kind: 'beacon' },
      obstacles: [{ x: 5, y: 1 }, { x: 3, y: 2 }, { x: 4, y: 4 }],
    },
    goals: [
      { type: 'position', x: 6, y: 3 },
      { type: 'noCollision' },
      { type: 'stdoutIncludes', value: 'COMMAND CORE 100%' },
    ],
    conceptEvidence: {
      mustCall: ['print', 'lumi.move', 'lumi.turn'],
    },
    hints: [
      { level: 1, type: 'context', text: '1. print("COMMAND CORE 100%")를 출력하세요. 2. 3칸 전진(1 + 2) 후 우회전(90도), 2칸 전진 후 좌회전(-90도), 2칸 전진하세요.' },
      { level: 2, type: 'concept', text: '모든 명령을 순서대로 조합하면 비콘에 무사히 도달할 수 있습니다.' },
    ],
    hiddenVariants: [
      {
        world: {
          width: 8,
          height: 6,
          rover: { x: 0, y: 1, direction: 0, energy: 100, awake: true },
          target: { x: 5, y: 3, kind: 'beacon' },
          obstacles: [{ x: 4, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 4 }],
        },
        goals: [
          { type: 'position', x: 5, y: 3 },
          { type: 'noCollision' },
          { type: 'stdoutIncludes', value: 'COMMAND CORE 100%' },
        ],
      },
    ],
  },
]

export const LUMI_ACT_1_SET = Object.freeze({
  id: 'lumi-act-1-command',
  version: 1,
  kind: 'act',
  actId: 'act-1-command',
  unitId: 'lumi_protocol_act_1_command',
  lumiCourseId: 'lumi-season-1',
  title: 'ACT 1. COMMAND CORE (명령 코어)',
  description: '함수 호출, 수식 계산 표현식, 콘솔 출력 및 주석 디버깅을 마스터하는 5개 정규 미션',
  missions: ACT_1_MISSIONS,
})

export const ACT_2_MISSIONS = [
  {
    id: 'lumi-act2-01',
    codeName: '2-1',
    actId: 'act-2-memory',
    order: 1,
    difficulty: 'core',
    title: '첫 기억 슬롯',
    eyebrow: 'ACT 2 · MEMORY CORE',
    objective: '변수 steps에 이동할 칸 수(3)를 저장하고 루미를 목표 비콘까지 이동시키세요.',
    briefing: '변수는 값을 기억하는 이름 상자입니다. `steps = 3`을 작성하여 숫자를 저장하고 `lumi.move(steps)`로 사용하세요.',
    concepts: ['변수', '대입 연산자'],
    restorationLevel: 20,
    lumiVoice: '기억 코어 활성화! steps 변수 등록 완료.',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'core',
      baseCrystals: 4,
      firstCompletionOnly: true,
    },
    memoryFragment: {
      label: '기억 슬롯(변수) 스키마',
      code: 'steps = ___\nlumi.move(steps)',
      duration: 3000,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'timeline', 'inspector'],
    },
    starterCode: `# [기억 슬롯(변수) 생성 지시서]
# 1. steps 라는 이름의 변수를 만들고 숫자 3을 저장(대입)하세요.


# 2. lumi.move() 괄호 안에 steps 변수를 전달하여 3칸 전진하세요.

`,
    world: {
      width: 7,
      height: 5,
      rover: { x: 1, y: 2, direction: 0, energy: 100, awake: true },
      target: { x: 4, y: 2, kind: 'beacon' },
      obstacles: [],
    },
    goals: [
      { type: 'position', x: 4, y: 2 },
      { type: 'variableDefined', name: 'steps' },
    ],
    conceptEvidence: {
      mustUse: ['variable'],
      mustCall: ['lumi.move'],
    },
    hints: [
      { level: 1, type: 'context', text: 'MEMORY CORE 창에서 steps 변수가 3으로 생성되는지 확인하세요.' },
      { level: 2, type: 'concept', text: '`steps = 3`으로 값을 저장하고 `lumi.move(steps)`를 호출하세요.' },
    ],
    hiddenVariants: [],
  },
  {
    id: 'lumi-act2-02',
    codeName: '2-2',
    actId: 'act-2-memory',
    order: 2,
    difficulty: 'core',
    title: '좋은 신호 이름',
    eyebrow: 'ACT 2 · MEMORY CORE',
    objective: '의미 있는 변수명 target_steps에 4를 저장하여 4칸 거리의 비콘에 도달하세요.',
    briefing: '변수 이름은 의미를 알 수 있도록 명확하게 짓는 것이 원칙입니다. `target_steps = 4`를 사용하세요.',
    concepts: ['변수명', '식별자 규칙'],
    restorationLevel: 40,
    lumiVoice: '명확한 신호명 target_steps 수신 완료!',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'core',
      baseCrystals: 4,
      firstCompletionOnly: true,
    },
    memoryFragment: {
      label: '식별자 명명 신호',
      code: 'target_steps = ___\nlumi.move(target_steps)',
      duration: 3000,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'timeline', 'inspector'],
    },
    starterCode: `# [식별자 명명 지시서]
# 1. target_steps 라는 이름의 변수를 만들고 숫자 4를 저장하세요.


# 2. target_steps 변수를 사용해 비콘까지 이동하세요.

`,
    world: {
      width: 8,
      height: 5,
      rover: { x: 1, y: 2, direction: 0, energy: 100, awake: true },
      target: { x: 5, y: 2, kind: 'beacon' },
      obstacles: [],
    },
    goals: [
      { type: 'position', x: 5, y: 2 },
      { type: 'variableDefined', name: 'target_steps' },
    ],
    conceptEvidence: {
      mustUse: ['variable'],
      mustCall: ['lumi.move'],
    },
    hints: [
      { level: 1, type: 'context', text: '목표 비콘은 4칸 앞에 있습니다. target_steps = 4로 이동하세요.' },
    ],
    hiddenVariants: [],
  },
  {
    id: 'lumi-act2-03',
    codeName: '2-3',
    actId: 'act-2-memory',
    order: 3,
    difficulty: 'core',
    title: '에너지 연산과 갱신',
    eyebrow: 'ACT 2 · MEMORY CORE',
    objective: '초기 에너지 5에서 2를 소모하여 energy 변수를 갱신(energy = energy - 2)하고 남은 에너지(3칸)만큼 이동하세요.',
    briefing: '변수는 저장된 값을 읽어와 계산한 뒤 새로운 값으로 덮어쓸 수 있습니다. `energy = energy - 2`를 실행하세요.',
    concepts: ['변수 갱신', '산술 연산', '-'],
    restorationLevel: 60,
    lumiVoice: '에너지 갱신 완료! 잔여 3으로 이동.',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'core',
      baseCrystals: 4,
      firstCompletionOnly: true,
    },
    memoryFragment: {
      label: '에너지 갱신 연산식',
      code: 'energy = 5\nenergy = energy - ___\nlumi.move(energy)',
      duration: 3000,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'timeline', 'inspector'],
    },
    starterCode: `# 초기 에너지 5가 충전되어 있습니다.
energy = 5

# [에너지 갱신 지시서]
# 1. 2만큼 에너지를 소모하여 energy 변수를 갱신하세요. (energy = energy - 2)


# 2. 남은 energy 변수값만큼 루미를 전진시키세요.

`,
    world: {
      width: 7,
      height: 5,
      rover: { x: 1, y: 2, direction: 0, energy: 100, awake: true },
      target: { x: 4, y: 2, kind: 'beacon' },
      obstacles: [],
    },
    goals: [
      { type: 'position', x: 4, y: 2 },
      { type: 'variableChanged', name: 'energy', expectedFinal: 3 },
    ],
    conceptEvidence: {
      mustUse: ['variable', '-'],
      mustCall: ['lumi.move'],
    },
    hints: [
      { level: 1, type: 'context', text: '`energy = energy - 2`를 실행하면 energy 변수의 값이 3이 됩니다.' },
    ],
    hiddenVariants: [
      {
        world: {
          width: 7,
          height: 5,
          rover: { x: 0, y: 2, direction: 0, energy: 100, awake: true },
          target: { x: 3, y: 2, kind: 'beacon' },
          obstacles: [],
        },
        goals: [{ type: 'position', x: 3, y: 2 }],
      },
    ],
  },
  {
    id: 'lumi-act2-04',
    codeName: '2-4',
    actId: 'act-2-memory',
    order: 4,
    difficulty: 'core',
    title: '값의 종류와 type()',
    eyebrow: 'ACT 2 · MEMORY CORE',
    objective: 'type(100)으로 숫자의 자료형 이름을 확인하여 lumi.say()로 보고하고 비콘으로 3칸 전진하세요.',
    briefing: '`type(값)` 함수는 해당 값의 종류(자료형)를 반환합니다. 숫자 100의 타입인 "int"를 확인하세요.',
    concepts: ['type()', '자료형', '문자열 보고'],
    restorationLevel: 80,
    lumiVoice: '자료형 int 확인 완료! 정수 코어 정상.',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'core',
      baseCrystals: 4,
      firstCompletionOnly: true,
    },
    memoryFragment: {
      label: '자료형 판별 시그니처',
      code: 'val_type = type(...)\nlumi.say(val_type)\nlumi.move(3)',
      duration: 3000,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'timeline', 'inspector'],
    },
    starterCode: `# [자료형 확인 지시서]
# 1. type(100)을 실행하여 정수 자료형 이름을 val_type 변수에 저장하세요.


# 2. lumi.say()를 사용해 val_type을 관제소에 보고하세요.


# 3. 전방 비콘으로 3칸 전진하세요.

`,
    world: {
      width: 7,
      height: 5,
      rover: { x: 1, y: 2, direction: 0, energy: 100, awake: true },
      target: { x: 4, y: 2, kind: 'beacon' },
      obstacles: [],
    },
    goals: [
      { type: 'position', x: 4, y: 2 },
      { type: 'variableDefined', name: 'val_type' },
      { type: 'spokenMessage', includes: 'int' },
    ],
    conceptEvidence: {
      mustUse: ['type'],
      mustCall: ['type', 'lumi.say', 'lumi.move'],
    },
    hints: [
      { level: 1, type: 'context', text: '`val_type = type(100)`을 수행하면 val_type 변수에 "int"가 저장됩니다.' },
    ],
    hiddenVariants: [],
  },
  {
    id: 'lumi-act2-05',
    codeName: '2-5',
    actId: 'act-2-memory',
    order: 5,
    difficulty: 'core',
    title: '상태 보고 f-string',
    eyebrow: 'ACT 2 · MEMORY CORE',
    objective: 'f-string을 사용해 f"ENERGY {energy}" 메시지를 루미가 말하게 하고 3칸 전진하세요.',
    briefing: '문자열 앞에 f를 붙이고 `{변수}`를 넣으면 변수 값을 문자열 안에 쉽게 삽입할 수 있습니다.',
    concepts: ['f-string', '문자열 포맷팅', '상태 보고'],
    restorationLevel: 90,
    lumiVoice: 'f-string 텔레메트리 포맷 정상 출력 완료.',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'core',
      baseCrystals: 4,
      firstCompletionOnly: true,
    },
    memoryFragment: {
      label: 'f-string 템플릿 구조',
      code: 'energy = 100\nmsg = f"ENERGY {___}"\nlumi.say(msg)\nlumi.move(3)',
      duration: 3000,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'timeline', 'inspector'],
    },
    starterCode: `# 현재 에너지가 100으로 설정되어 있습니다.
energy = 100

# [f-string 상태 보고 지시서]
# 1. f"ENERGY {energy}" 문자열을 만들어 msg 변수에 저장하세요.


# 2. lumi.say()를 사용해 msg를 관제소에 보고하세요.


# 3. 전방 비콘으로 3칸 이동하세요.

`,
    world: {
      width: 7,
      height: 5,
      rover: { x: 1, y: 2, direction: 0, energy: 100, awake: true },
      target: { x: 4, y: 2, kind: 'beacon' },
      obstacles: [],
    },
    goals: [
      { type: 'position', x: 4, y: 2 },
      { type: 'spokenMessage', includes: 'ENERGY 100' },
    ],
    conceptEvidence: {
      mustUse: ['f-string'],
      mustCall: ['lumi.say', 'lumi.move'],
    },
    hints: [
      { level: 1, type: 'context', text: '`f"ENERGY {energy}"`는 energy 변수값 100을 채워 "ENERGY 100"이 됩니다.' },
    ],
    hiddenVariants: [],
  },
  {
    id: 'lumi-act2-06',
    codeName: '2-6',
    actId: 'act-2-memory',
    order: 6,
    difficulty: 'field-test',
    title: 'Field Test: 관제 입력과 형 변환',
    eyebrow: 'ACT 2 · MEMORY CORE',
    objective: 'input()으로 관제소의 이동 신호 문자열을 수신하고, int()로 정수로 변환하여 루미를 목표 비콘까지 이동시키세요.',
    briefing: 'input() 함수는 관제 센터에서 보낸 문자열 데이터를 수신합니다. 수신된 문자열은 바로 거리에 쓸 수 없으므로 int(...)로 정수 변환하여 lumi.move()에 전달해야 합니다.',
    concepts: ['input()', 'int()', '형 변환', '관제 입력'],
    restorationLevel: 100,
    lumiVoice: '관제 입력 형 변환 완료! MEMORY CORE 100% 복원.',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'field-test',
      baseCrystals: 8,
      firstCompletionOnly: true,
    },
    inputPanel: {
      label: '관제소 이동 신호',
      fields: [{ id: 'steps', label: '신호 (문자열)', defaultValue: '4', inputMode: 'numeric' }],
    },
    inputValues: ['4'],
    memoryFragment: {
      label: '관제 입력 프로토콜 스키마',
      code: 'steps_text = input("...")\nsteps = int(steps_text)\nlumi.move(steps)',
      duration: 3500,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'timeline', 'inspector'],
    },
    starterCode: `# === ACT 2 FIELD TEST: 관제 신호 수신 및 형 변환 ===
# 1. input()으로 관제 신호를 수신해 steps_text 변수에 저장하세요.


# 2. int()로 문자열을 정수 변환하여 steps 변수에 저장하고 이동하세요.

`,
    world: {
      width: 8,
      height: 5,
      rover: { x: 1, y: 2, direction: 0, energy: 100, awake: true },
      target: { x: 5, y: 2, kind: 'beacon' },
      obstacles: [],
    },
    goals: [
      { type: 'position', x: 5, y: 2 },
      { type: 'variableDefined', name: 'steps' },
    ],
    conceptEvidence: {
      mustUse: ['input', 'int'],
      mustCall: ['input', 'int', 'lumi.move'],
    },
    hints: [
      { level: 1, type: 'context', text: '1. `steps_text = input("이동 신호")` 로 문자열을 입력받습니다. 2. `steps = int(steps_text)` 로 정수 변환합니다. 3. `lumi.move(steps)` 로 이동하세요.' },
    ],
    hiddenVariants: [
      {
        inputValues: ['6'],
        world: {
          width: 9,
          height: 5,
          rover: { x: 1, y: 2, direction: 0, energy: 100, awake: true },
          target: { x: 7, y: 2, kind: 'beacon' },
          obstacles: [],
        },
        goals: [{ type: 'position', x: 7, y: 2 }],
      },
    ],
  },
]

export const LUMI_ACT_2_SET = Object.freeze({
  id: 'lumi-act-2-memory',
  version: 1,
  kind: 'act',
  actId: 'act-2-memory',
  unitId: 'lumi_protocol_act_2_memory',
  lumiCourseId: 'lumi-season-1',
  title: 'ACT 2. MEMORY CORE (기억 코어)',
  description: '변수 대입, 연산 및 갱신, safe_type, f-string 및 input/int 관제 입력을 마스터하는 6개 정규 미션',
  missions: ACT_2_MISSIONS,
})

export function getLumiVerticalSliceSet() {
  return LUMI_VERTICAL_SLICE_SET
}

export function getLumiAct1Set() {
  return LUMI_ACT_1_SET
}

export function getLumiAct2Set() {
  return LUMI_ACT_2_SET
}

import { LUMI_OBJECT_TRACE_SPIKE_SET } from './lumiObjectTraceSpikeCatalog.js'
import { LUMI_OBJECT_LEARNING_PILOT_SET } from './lumiObjectLearningPilotCatalog.js'
import { LUMI_OBJECT_TACTICAL_PILOT_SET } from './lumiObjectTacticalPilotCatalog.js'
import { LUMI_OBJECT_CORE_SET } from './lumiObjectCoreCatalog.js'
import { LUMI_OBJECT_FRONTIER_SET } from './lumiObjectFrontierCatalog.js'
import { LUMI_LOST_LIGHT_FINAL_SET } from './lumiLostLightFinalCatalog.js'
import { LUMI_DATA_CORE_SET } from './lumiDataCoreCatalog.js'
import { LUMI_SENSOR_CORE_SET as LUMI_ACT_3_SET } from './lumiSensorCoreCatalog.js'
import { LUMI_AUTOMATION_CORE_SET as LUMI_ACT_5_SET } from './lumiAutomationCoreCatalog.js'
import {
  IF_MISSION_SET,
  WHILE_MISSION_SET,
  FUNCTION_MISSION_SET,
} from './pythonMissionCatalog.js'
import {
  LUMI_OBJECT_SPIKE_ENABLED,
  LUMI_OBJECT_LEARNING_PILOT_ENABLED,
  LUMI_TACTICAL_PILOT_ENABLED,
  LUMI_OBJECT_CORE_CANDIDATE_ENABLED,
  LUMI_OBJECT_FRONTIER_ENABLED,
  LUMI_LOST_LIGHT_FINAL_ENABLED,
} from '../../config/lumiFeatureFlags.js'

function asOfficialActSet(baseSet, { id, actId, unitId, title, description }) {
  return Object.freeze({
    ...baseSet,
    id,
    actId,
    unitId,
    lumiCourseId: 'lumi-season-1',
    title,
    description,
    kind: 'student-beta',
    persistencePolicy: 'official',
    rewardPolicy: 'standard-crystals',
    dailyRecordPolicy: 'official',
    assignmentEvidencePolicy: 'python-only',
    missions: (baseSet.missions || []).map((mission) => ({ ...mission, actId })),
  })
}

export { LUMI_ACT_3_SET, LUMI_ACT_5_SET }

export const LUMI_ACT_4_SET = asOfficialActSet(IF_MISSION_SET, {
  id: 'lumi-act-4-decision-beta-v1', actId: 'act-4-decision', unitId: 'lumi_protocol_act_4_decision',
  title: 'ACT 4. DECISION CORE (공개 베타)', description: 'if와 Boolean으로 안전 행동을 선택하는 공개 베타 과정',
})
export const LUMI_ACT_6_SET = asOfficialActSet(WHILE_MISSION_SET, {
  id: 'lumi-act-6-persistence-beta-v1', actId: 'act-6-persistence', unitId: 'lumi_protocol_act_6_persistence',
  title: 'ACT 6. PERSISTENCE CORE (공개 베타)', description: 'while로 상태가 바뀔 때까지 행동을 지속하는 공개 베타 과정',
})
export const LUMI_ACT_8_SET = asOfficialActSet(FUNCTION_MISSION_SET, {
  id: 'lumi-act-8-ability-beta-v1', actId: 'act-8-ability', unitId: 'lumi_protocol_act_8_ability',
  title: 'ACT 8. ABILITY CORE (공개 베타)', description: '함수와 매개변수, return으로 능력을 모듈화하는 공개 베타 과정',
})

const LUMI_LOCKED_MISSION_SET = Object.freeze({
  id: 'lumi-locked',
  kind: 'locked',
  title: '아직 승인되지 않은 LUMI 과정',
  version: 1,
  persistencePolicy: 'none',
  missions: [],
})

export function getLumiMissionSet(actId = 'act-0-awakening') {
  if (actId === 'act-9-object-core' || actId === 'lumi-object-core-v1') {
    return LUMI_OBJECT_CORE_CANDIDATE_ENABLED ? LUMI_OBJECT_CORE_SET : LUMI_LOCKED_MISSION_SET
  }
  if (actId === 'object-tactical-pilot' || actId === 'lumi-object-tactical-pilot-v1') {
    return LUMI_TACTICAL_PILOT_ENABLED ? LUMI_OBJECT_TACTICAL_PILOT_SET : LUMI_LOCKED_MISSION_SET
  }
  if (actId === 'object-frontier-pilot' || actId === 'lumi-object-frontier-pilot-v1') {
    return LUMI_OBJECT_FRONTIER_ENABLED ? LUMI_OBJECT_FRONTIER_SET : LUMI_LOCKED_MISSION_SET
  }
  if (actId === 'act-final-the-lost-light' || actId === 'lumi-lost-light-final-v1') {
    return LUMI_LOST_LIGHT_FINAL_ENABLED ? LUMI_LOST_LIGHT_FINAL_SET : LUMI_LOCKED_MISSION_SET
  }
  if (actId === 'object-learning-pilot') {
    return LUMI_OBJECT_LEARNING_PILOT_ENABLED ? LUMI_OBJECT_LEARNING_PILOT_SET : LUMI_LOCKED_MISSION_SET
  }
  if (actId === 'technical-spike-object-trace') {
    return LUMI_OBJECT_SPIKE_ENABLED ? LUMI_OBJECT_TRACE_SPIKE_SET : LUMI_LOCKED_MISSION_SET
  }
  if (actId === 'act-1-command') return LUMI_ACT_1_SET
  if (actId === 'act-2-memory') return LUMI_ACT_2_SET
  if (actId === 'act-3-sensor') return LUMI_ACT_3_SET
  if (actId === 'act-4-decision') return LUMI_ACT_4_SET
  if (actId === 'act-5-automation') return LUMI_ACT_5_SET
  if (actId === 'act-6-persistence') return LUMI_ACT_6_SET
  if (actId === 'act-7-data') return LUMI_DATA_CORE_SET
  if (actId === 'act-8-ability') return LUMI_ACT_8_SET
  return LUMI_VERTICAL_SLICE_SET
}

export function getLumiCourseCatalog() {
  return LUMI_COURSE_CATALOG
}

export function getLumiMissionById(missionId) {
  return getLumiMissionRegistrationById(missionId)?.mission || null
}

export function getLumiMissionRegistrationById(missionId) {
  if (!missionId) return null
  const normalizedId = String(missionId).trim().toLowerCase()
  const accessibleSets = [
    LUMI_VERTICAL_SLICE_SET,
    LUMI_ACT_1_SET,
    LUMI_ACT_2_SET,
    LUMI_ACT_3_SET,
    LUMI_ACT_4_SET,
    LUMI_ACT_5_SET,
    LUMI_ACT_6_SET,
    LUMI_DATA_CORE_SET,
    LUMI_ACT_8_SET,
    ...(LUMI_OBJECT_SPIKE_ENABLED ? [LUMI_OBJECT_TRACE_SPIKE_SET] : []),
    ...(LUMI_OBJECT_LEARNING_PILOT_ENABLED ? [LUMI_OBJECT_LEARNING_PILOT_SET] : []),
    ...(LUMI_TACTICAL_PILOT_ENABLED ? [LUMI_OBJECT_TACTICAL_PILOT_SET] : []),
    ...(LUMI_OBJECT_FRONTIER_ENABLED ? [LUMI_OBJECT_FRONTIER_SET] : []),
    ...(LUMI_OBJECT_CORE_CANDIDATE_ENABLED ? [LUMI_OBJECT_CORE_SET] : []),
    ...(LUMI_LOST_LIGHT_FINAL_ENABLED ? [LUMI_LOST_LIGHT_FINAL_SET] : []),
  ]
  for (const missionSet of accessibleSets) {
    const mission = (missionSet.missions || []).find((item) => (
      item.id === missionId ||
      item.codeName === missionId ||
      String(item.id).toLowerCase() === normalizedId ||
      String(item.codeName || '').toLowerCase() === normalizedId
    ))
    if (mission) return { mission, missionSet }
  }
  return null
}

export function getLumiSpikeMissionById(missionId) {
  if (!missionId || !LUMI_OBJECT_SPIKE_ENABLED) return null
  const normalizedId = String(missionId).trim().toLowerCase()
  return (LUMI_OBJECT_TRACE_SPIKE_SET.missions || []).find((m) =>
    m.id === missionId ||
    m.codeName === missionId ||
    String(m.id).toLowerCase() === normalizedId ||
    String(m.codeName || '').toLowerCase() === normalizedId
  ) || null
}

export function getLumiPilotMissionById(missionId) {
  if (!missionId) return null
  const normalizedId = String(missionId).trim().toLowerCase()
  const learningPilots = LUMI_OBJECT_LEARNING_PILOT_ENABLED ? (LUMI_OBJECT_LEARNING_PILOT_SET.missions || []) : []
  const tacticalPilots = LUMI_TACTICAL_PILOT_ENABLED ? (LUMI_OBJECT_TACTICAL_PILOT_SET.missions || []) : []
  const frontierPilots = LUMI_OBJECT_FRONTIER_ENABLED ? (LUMI_OBJECT_FRONTIER_SET.missions || []) : []
  const allPilots = [...learningPilots, ...tacticalPilots, ...frontierPilots]
  return allPilots.find((m) =>
    m.id === missionId ||
    m.codeName === missionId ||
    String(m.id).toLowerCase() === normalizedId ||
    String(m.codeName || '').toLowerCase() === normalizedId
  ) || null
}
