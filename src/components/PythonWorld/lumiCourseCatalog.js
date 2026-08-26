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
    { id: 'act-0-awakening', title: 'ACT 0. AWAKENING', subtitle: '긴급 재부팅', coreMissions: 6, concepts: '실행 · 명령 · 값 수정 · 문자열' },
    { id: 'act-1-command', title: 'ACT 1. COMMAND CORE', subtitle: '명령 코어', coreMissions: 6, concepts: '호출 · 표현식 · 출력 · 주석 · 오류' },
    { id: 'act-2-memory', title: 'ACT 2. MEMORY CORE', subtitle: '기억 코어', coreMissions: 6, concepts: '변수 · 자료형 · f-string · input · 변환' },
    { id: 'act-3-sensor', title: 'ACT 3. SENSOR CORE', subtitle: '센서 코어', coreMissions: 5, concepts: 'world · 속성 · 거리 센서 · 비교 · Boolean' },
    { id: 'act-4-decision', title: 'ACT 4. DECISION CORE', subtitle: '판단 코어', coreMissions: 6, concepts: 'if · else · elif · and · or · 자율 판단' },
    { id: 'act-5-automation', title: 'ACT 5. AUTOMATION CORE', subtitle: '자동화 코어', coreMissions: 7, concepts: 'for · range · 누적 · 순회 · 중첩 반복' },
    { id: 'act-6-persistence', title: 'ACT 6. PERSISTENCE CORE', subtitle: '지속 코어', coreMissions: 7, concepts: 'while · break · continue · 게임 루프' },
    { id: 'act-7-data', title: 'ACT 7. DATA CORE', subtitle: '데이터 코어', coreMissions: 10, concepts: 'list · append · pop · split · join · tuple · dict' },
    { id: 'act-8-ability', title: 'ACT 8. ABILITY CORE', subtitle: '능력 코어', coreMissions: 7, concepts: 'def · 매개변수 · return · Scope · 모듈러 함수' },
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
    restorationLevel: 15,
    lumiVoice: '...신호... 들려요. 관제사님.',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'core',
      baseCrystals: 4,
      firstCompletionOnly: true,
    },
    pygameBridge: {
      lumiCode: 'lumi.wake()',
      pygameCode: 'pygame.init()',
      commonIdea: '서로 같은 함수는 아니지만, 필요한 시스템을 먼저 준비한 뒤 다음 명령을 실행한다는 순서를 연결합니다.',
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
    restorationLevel: 30,
    lumiVoice: '1칸 전진 완료! 추진 노즐 정상 가동.',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'core',
      baseCrystals: 4,
      firstCompletionOnly: true,
    },
    pygameBridge: {
      lumiCode: 'lumi.move(1)',
      pygameCode: 'player.x += 1',
      commonIdea: '전달한 숫자 크기만큼 엔티티를 앞으로 전진시킨다.',
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
    starterCode: '# 이동할 칸수(1)를 괄호 안에 입력하여 1칸 전진하세요.\n',
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
    restorationLevel: 45,
    lumiVoice: '에너지 셀 흡수 완료! 동력 안정화 중.',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'core',
      baseCrystals: 4,
      firstCompletionOnly: true,
    },
    pygameBridge: {
      lumiCode: 'lumi.move(3)',
      pygameCode: 'player.x += 3',
      commonIdea: '인자의 숫자를 조절하여 원하는 목적지까지의 거리를 맞춘다.',
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
    starterCode: '# 에너지 셀까지 3칸 전진하는 명령을 작성하세요.\n',
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
    restorationLevel: 60,
    lumiVoice: '방향 전환 성공! 꺾인 항로 돌파.',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'core',
      baseCrystals: 4,
      firstCompletionOnly: true,
    },
    pygameBridge: {
      lumiCode: 'lumi.move(2)\nlumi.turn(90)\nlumi.move(1)',
      pygameCode: 'player.forward(2)\nplayer.angle += 90\nplayer.forward(1)',
      commonIdea: '회전과 이동을 결합하여 2차원 공간을 자유롭게 항법한다.',
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
    starterCode: '# 1. 앞으로 2칸 전진하세요.\n# 2. 오른쪽으로 90도 회전하세요.\n# 3. 앞으로 1칸 전진하세요.\n',
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
    restorationLevel: 80,
    lumiVoice: '관제소 응답 확인! 통신 링크 활성화.',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'core',
      baseCrystals: 4,
      firstCompletionOnly: true,
    },
    pygameBridge: {
      lumiCode: 'lumi.say("신호 수신")',
      pygameCode: 'font.render("신호 수신", ...)',
      commonIdea: '큰따옴표 안의 문자열 데이터를 화면이나 로그로 전송한다.',
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
    starterCode: '# 따옴표 안에 인사말을 넣어 lumi.say()로 전송하세요.\n',
    world: {
      width: 6,
      height: 5,
      rover: { x: 2, y: 2, direction: 0, energy: 100, awake: true },
      target: { x: 2, y: 2, kind: 'beacon' },
      obstacles: [],
    },
    goals: [
      { type: 'spokenMessage', label: '루미가 따옴표 안의 메시지를 말합니다.' },
    ],
    conceptEvidence: {
      mustCall: ['lumi.say'],
      mustUse: ['string'],
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
    restorationLevel: 100,
    lumiVoice: 'MOVEMENT CORE 복원 성공! 1성 코어 가동.',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'field-test',
      baseCrystals: 8,
      firstCompletionOnly: true,
    },
    pygameBridge: {
      lumiCode: 'lumi.move(2)\nlumi.turn(90)\nlumi.move(2)\nlumi.say("비콘 도착")',
      pygameCode: 'def mission_clear(): ...',
      commonIdea: '여러 동작과 메시지 출력을 순차적으로 조합하여 종합 임무를 완주한다.',
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
    starterCode: '# 이동·회전·말하기를 순서대로 조합해 구조 비콘을 활성화하세요.\n# 아래 빈 줄부터 직접 작성하세요.\n',
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
]

export const LEGACY_VERTICAL_SLICE_MISSIONS = [
  {
    id: 'lumi-vs-07',
    codeName: 'VS-07',
    actId: 'act-2-memory',
    order: 7,
    difficulty: 'core',
    title: '첫 기억 슬롯 (Legacy)',
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
    title: '남은 에너지 (Legacy)',
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
    title: 'WORLD 센서 (Legacy)',
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
    title: '안전할 때만 출발 (Legacy)',
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

export const ALL_VERTICAL_SLICE_MISSIONS = [
  ...VERTICAL_SLICE_MISSIONS,
  ...LEGACY_VERTICAL_SLICE_MISSIONS,
]

export const LUMI_VERTICAL_SLICE_SET = Object.freeze({
  id: LUMI_VERTICAL_SLICE_SET_ID,
  version: 1,
  kind: 'prototype',
  actId: 'act-0-awakening',
  unitId: 'lumi_protocol_vertical_slice',
  lumiCourseId: 'lumi-season-1',
  title: 'LUMI Protocol Vertical Slice (6 Missions)',
  description: 'Turtle 경험자가 30~50분에 걸쳐 탐사 로봇 LUMI의 코어를 복원하는 프로토타입 체험 세트',
  missions: VERTICAL_SLICE_MISSIONS,
})

export const LUMI_LEGACY_VERTICAL_SLICE_SET = Object.freeze({
  id: 'lumi-vertical-slice-legacy-v1',
  version: 1,
  kind: 'legacy',
  actId: 'act-0-awakening',
  unitId: 'lumi_protocol_vertical_slice',
  lumiCourseId: 'lumi-season-1',
  title: 'LUMI Protocol Vertical Slice Legacy Set',
  description: '구 버전 ACT 0 연계 10 미션 호환성 보존 세트',
  missions: LEGACY_VERTICAL_SLICE_MISSIONS,
})

export const ACT_1_MISSIONS = [
  {
    id: 'lumi-act1-01',
    codeName: '1-1',
    actId: 'act-1-command',
    order: 1,
    difficulty: 'core',
    title: 'LUMI 불러오기',
    eyebrow: 'ACT 1 · LUMI 불러오기',
    objective: 'LUMI를 불러온 뒤 앞으로 2칸 이동시키세요.',
    briefing: 'LUMI가 출발 준비를 하고 있어요. LUMI에게 명령을 내리기 전에 먼저 Python 코드에서 사용할 수 있게 불러와 봅시다.',
    concepts: ['LUMI 불러오기', '앞으로 이동'],
    restorationLevel: 15,
    lumiVoice: 'LUMI 연결 성공! 전방으로 출발합니다.',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'core',
      baseCrystals: 4,
      firstCompletionOnly: true,
    },
    pygameBridge: {
      lumiCode: 'from msense import lumi\nlumi.move(2)',
      pygameCode: 'import pygame\nplayer.x += 2',
      commonIdea: '모듈을 불러와(import) 게임 캐릭터를 이동시킨다.',
    },
    memoryFragment: {
      label: 'LUMI 불러오기 패턴',
      code: 'from msense import lumi\nlumi.move(___)',
      duration: 3000,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'timeline'],
    },
    starterCode: `# [LUMI 불러오기]
# msense의 LUMI를 불러온 뒤 2칸 앞으로 이동시키세요.
# 아래 빈 줄부터 직접 작성하세요.
`,
    world: {
      width: 6,
      height: 5,
      rover: { x: 1, y: 2, direction: 0, energy: 100, awake: true },
      target: { x: 3, y: 2, kind: 'beacon' },
      obstacles: [],
    },
    goals: [
      { type: 'position', x: 3, y: 2 },
    ],
    conceptEvidence: {
      mustUse: ['import'],
      mustCall: ['lumi.move'],
    },
    hints: [
      { level: 1, type: 'context', text: '첫 번째 줄에 `from msense import lumi`를 적고, 두 번째 줄에 `lumi.move(2)`를 작성하세요.' },
      { level: 2, type: 'concept', text: '`import`는 가져온다는 뜻이에요. msense에서 lumi를 가져와 사용할 준비를 합니다.' },
    ],
    hiddenVariants: [],
  },
  {
    id: 'lumi-act1-02',
    codeName: '1-2',
    actId: 'act-1-command',
    order: 2,
    difficulty: 'core',
    title: '앞으로 움직이기',
    eyebrow: 'ACT 1 · 장애물 회피',
    objective: '우주 지뢰를 피해 이동과 회전을 조합하여 목표 비콘에 도착하세요.',
    briefing: '전방에 위험한 우주 지뢰들이 감지되었습니다! 지뢰에 부딪히지 않도록 이동과 회전을 조합하여 안전한 우회 경로로 비콘까지 이동해 봅시다.',
    concepts: ['장애물 피하기', '방향 회전'],
    restorationLevel: 30,
    lumiVoice: '지뢰 회피 성공! 안전하게 목표 비콘에 도달했습니다.',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'core',
      baseCrystals: 4,
      firstCompletionOnly: true,
    },
    pygameBridge: {
      lumiCode: 'lumi.move(1)\nlumi.turn(90)\nlumi.move(2)',
      pygameCode: 'player.x += 1\nplayer.angle += 90\nplayer.y += 2',
      commonIdea: '장애물을 회피하기 위해 회전과 전진을 결합한다.',
    },
    memoryFragment: {
      label: '지뢰 우회 이동 신호',
      code: 'from msense import lumi\nlumi.move(1)\nlumi.turn(90)\nlumi.move(2)\nlumi.turn(-90)\nlumi.move(3)',
      duration: 3500,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'timeline'],
    },
    starterCode: `# [장애물 지뢰를 피해 목표 비콘으로 이동하세요]
# 1. from msense import lumi 로 모듈을 불러옵니다.
# 2. 지뢰 앞까지 이동 후 회전과 이동을 조합하여 비콘에 도착하세요.
`,
    world: {
      width: 7,
      height: 5,
      rover: { x: 1, y: 1, direction: 0, energy: 100, awake: true },
      target: { x: 5, y: 3, kind: 'beacon' },
      obstacles: [
        { x: 3, y: 1 },
        { x: 4, y: 1 },
        { x: 1, y: 3 },
        { x: 3, y: 2 },
        { x: 5, y: 1 },
        { x: 4, y: 4 },
      ],
    },
    goals: [
      { type: 'position', x: 5, y: 3 },
      { type: 'noCollision' },
    ],
    conceptEvidence: {
      mustUse: ['import'],
      mustCall: ['lumi.move', 'lumi.turn'],
    },
    hints: [
      { level: 1, type: 'context', text: '1. `lumi.move(1)` 후 2. `lumi.turn(90)`으로 우회전하고, 3. `lumi.move(2)`로 아래로 내려가세요.' },
      { level: 2, type: 'concept', text: '4. `lumi.turn(-90)`으로 다시 동쪽을 보고, 5. `lumi.move(3)`을 실행하면 지뢰를 피해 비콘에 도착합니다.' },
    ],
    hiddenVariants: [],
  },
  {
    id: 'lumi-act1-03',
    codeName: '1-3',
    actId: 'act-1-command',
    order: 3,
    difficulty: 'core',
    title: '숫자 계산해서 이동하기',
    eyebrow: 'ACT 1 · 수식 계산',
    objective: '괄호 안에 덧셈 수식(2 + 3)을 직접 넣어 5칸 거리의 비콘에 도착하세요.',
    briefing: 'Python은 괄호 안의 덧셈을 먼저 계산한 뒤 움직입니다. 2 + 3을 넣어서 5칸 앞의 비콘까지 가봅시다.',
    concepts: ['숫자 계산', '더하기(+)'],
    restorationLevel: 50,
    lumiVoice: '표현식 연산 일치! 5칸 가속 이동 완료.',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'core',
      baseCrystals: 4,
      firstCompletionOnly: true,
    },
    pygameBridge: {
      lumiCode: 'lumi.move(2 + 3)',
      pygameCode: 'player.x += 2 + 3',
      commonIdea: '연산식(2 + 3)의 결과를 이동 거리 인자로 넘긴다.',
    },
    memoryFragment: {
      label: '덧셈 계산 이동 패턴',
      code: 'from msense import lumi\nlumi.move(___ + ___)',
      duration: 3000,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'timeline'],
    },
    starterCode: `# [숫자 계산해서 이동하기]
# 2와 3을 더한 결과를 이동 거리로 사용하세요.
# 덧셈 표현식을 직접 작성해야 합니다.
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
      mustUse: ['import', '+'],
      mustCall: ['lumi.move'],
    },
    hints: [
      { level: 1, type: 'context', text: '`lumi.move(2 + 3)`처럼 괄호 안에 더하기 기호(+)를 사용해 숫자를 더하세요.' },
      { level: 2, type: 'concept', text: 'Python은 2 + 3을 먼저 계산해서 5로 만든 뒤 move 명령을 실행합니다.' },
    ],
    hiddenVariants: [],
  },
  {
    id: 'lumi-act1-04',
    codeName: '1-4',
    actId: 'act-1-command',
    order: 4,
    difficulty: 'core',
    title: '메시지 출력하기',
    eyebrow: 'ACT 1 · 메시지 출력 (print)',
    objective: 'print("LUMI ONLINE")으로 메시지를 출력하고 3칸 앞의 비콘으로 이동하세요.',
    briefing: '탐사 기록창에 메시지를 남겨볼까요? Python에서는 print()를 사용하면 원하는 글자를 화면(OUTPUT 창)에 보여줄 수 있어요. 자유롭게 3줄까지 메시지를 출력해 보고 LUMI를 비콘으로 움직여 봅시다.',
    concepts: ['메시지 출력', 'print()'],
    restorationLevel: 70,
    lumiVoice: '메시지 출력 확인! 관제 센터와 통신 연결.',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'core',
      baseCrystals: 4,
      firstCompletionOnly: true,
    },
    pygameBridge: {
      lumiCode: 'print("LUMI ONLINE")',
      pygameCode: 'print("GAME STARTED")',
      commonIdea: '콘솔 및 디버그 출력으로 게임 상태를 로깅한다.',
    },
    memoryFragment: {
      label: '메시지 출력 프로토콜',
      code: 'from msense import lumi\nprint("LUMI ONLINE")\nlumi.move(3)',
      duration: 3000,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'timeline', 'inspector'],
    },
    starterCode: `# [메시지 출력하기]
# OUTPUT 창에 LUMI ONLINE을 표시한 뒤 3칸 앞으로 이동하세요.
# 출력과 이동 명령을 각각 직접 작성하세요.
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
      mustUse: ['import'],
      mustCall: ['print', 'lumi.move'],
    },
    hints: [
      { level: 1, type: 'concept', text: '화면에 글자를 보여주는 명령은 `print()`예요. 큰따옴표(" ") 안에 출력할 글자를 넣습니다.' },
      { level: 2, type: 'context', text: '`print("LUMI ONLINE")` 다음 줄에 `lumi.move(3)`을 작성하세요.' },
      { level: 3, type: 'concept', text: '💡 팁: `print("탐사를 시작합니다!")` 처럼 따옴표 안의 글자를 바꾸면 출력되는 내용도 달라집니다.' },
    ],
    hiddenVariants: [],
  },
  {
    id: 'lumi-act1-05',
    codeName: '1-5',
    actId: 'act-1-command',
    order: 5,
    difficulty: 'core',
    title: '위험 명령 잠시 끄기 — 주석',
    eyebrow: 'ACT 1 · 주석과 디버깅',
    objective: '위험한 직진 명령(# lumi.move(4)) 앞에 #을 붙여 끄고, 아래로 우회하여 비콘에 도착하세요.',
    briefing: '앞에 위험한 크레이터 구덩이가 있습니다. 잘못된 명령 앞에 \'#\'을 붙이면 컴퓨터가 실행하지 않습니다. 위험한 줄을 끄고 안전하게 돌아가 봅시다.',
    concepts: ['주석(#)', '실수 고치기'],
    restorationLevel: 85,
    lumiVoice: '위험 직진 무력화 완료! 안전 우회 항로 통과.',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'core',
      baseCrystals: 4,
      firstCompletionOnly: true,
    },
    pygameBridge: {
      lumiCode: '# lumi.move(4)\nlumi.turn(90)',
      pygameCode: '# player.speed = 100\nplayer.turn(90)',
      commonIdea: '버그나 위험 명령을 주석(#)으로 비활성화하고 디버깅한다.',
    },
    memoryFragment: {
      label: '위험 명령 끄기와 우회 힌트',
      code: 'from msense import lumi\n# 위험 명령 끄기: # lumi.move(...)\nlumi.turn(90)\nlumi.move(___)',
      duration: 3500,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'timeline'],
    },
    starterCode: `# [실수 고치기]
# 4칸 직진하는 위험 명령을 #으로 꺼 뒤 아래쪽으로 우회하세요.
# 불러오기, 주석, 회전, 이동 코드를 직접 작성하세요.
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
      { type: 'commentedOutCall', call: 'lumi.move', argument: 4 },
    ],
    conceptEvidence: {
      mustUse: ['import'],
      mustCall: ['lumi.turn', 'lumi.move'],
    },
    hints: [
      { level: 1, type: 'context', text: '`lumi.move(4)` 맨 앞에 `#`을 붙여 `# lumi.move(4)`로 만드세요.' },
      { level: 2, type: 'concept', text: '`#`이 붙은 줄은 Python이 건너뜁니다. 그 아래에 안전하게 돌아가는 코드를 적으세요.' },
    ],
    hiddenVariants: [],
  },
  {
    id: 'lumi-act1-06',
    codeName: '1-6',
    actId: 'act-1-command',
    order: 6,
    difficulty: 'field-test',
    title: '첫 번째 탐사 미션',
    eyebrow: 'ACT 1 · 종합 미션',
    objective: '메시지 출력, 계산 이동, 회전을 조합하여 최종 비콘에 도착하세요.',
    briefing: '지금까지 배운 모든 방법을 활용할 시간입니다! 메시지를 출력하고, 계산해서 이동하며, 지그재그 길을 완주하세요.',
    concepts: ['탐사 종합', '계산과 회전'],
    restorationLevel: 100,
    lumiVoice: '첫 번째 탐사 미션 완수! 관제 신호 완벽 수신.',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'field-test',
      baseCrystals: 8,
      firstCompletionOnly: true,
    },
    pygameBridge: {
      lumiCode: 'print("COMMAND CORE 100%")\nlumi.move(1 + 2)',
      pygameCode: 'print("STAGE CLEAR")\nplayer.move(3)',
      commonIdea: '메시지 출력과 연산 이동을 종합하여 첫 스테이지를 완주한다.',
    },
    memoryFragment: {
      label: '첫 번째 탐사 종합 개요',
      code: 'from msense import lumi\nprint("COMMAND CORE 100%")\nlumi.move(___ + ___)\n# 지그재그 이동',
      duration: 3500,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'timeline', 'inspector'],
    },
    starterCode: `# === 첫 번째 탐사 미션 ===
# 상태 메시지 출력, 덧셈 이동, 회전을 조합해 비콘에 도착하세요.
# 지금까지 배운 명령을 알맞은 순서로 직접 작성하세요.
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
      mustUse: ['import'],
      mustCall: ['print', 'lumi.move', 'lumi.turn'],
    },
    hints: [
      { level: 1, type: 'context', text: '1. print("COMMAND CORE 100%") 출력, 2. lumi.move(1 + 2) 이동, 3. 회전과 이동을 순서대로 작성하세요.' },
      { level: 2, type: 'concept', text: '지금까지 배운 명령들을 순서대로 조합하면 비콘에 도착할 수 있습니다.' },
    ],
    hiddenVariants: [],
  },
]

export const LUMI_ACT_1_SET = Object.freeze({
  id: 'lumi-act-1-command',
  version: 1,
  kind: 'act',
  actId: 'act-1-command',
  unitId: 'lumi_protocol_act_1_command',
  lumiCourseId: 'lumi-season-1',
  title: 'ACT 1. LUMI 불러오기와 움직이기',
  description: 'LUMI를 불러오고, 이동·회전·계산·출력·주석을 단계별로 익히는 6개 입문 미션',
  missions: ACT_1_MISSIONS,
})

export const ACT_2_MISSIONS = [
  {
    id: 'lumi-act2-01',
    codeName: '2-1',
    actId: 'act-2-memory',
    order: 1,
    difficulty: 'core',
    title: '루미 호출부호 등록',
    eyebrow: 'ACT 2 · MEMORY CORE',
    objective: '호출부호 문자열 "NOVA"를 callsign 변수에 저장하고 lumi.say()로 보고하세요.',
    briefing: '기억 코어가 복구되기 시작했습니다. 변수는 값을 기억하는 이름표 달린 상자입니다. callsign 상자에 문자열 "NOVA"를 저장한 뒤, lumi.say()로 관제소에 호출부호를 전송하세요.',
    learningSteps: [
      '문자열 "NOVA"를 기억할 callsign 변수를 만듭니다.',
      'lumi.say()에 문자열을 직접 쓰지 말고 callsign 변수를 전달합니다.',
    ],
    concepts: ['변수', '문자열 대입'],
    restorationLevel: 20,
    lumiVoice: '호출부호 NOVA 등록 완료! 관제 링크 정상.',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'core',
      baseCrystals: 4,
      firstCompletionOnly: true,
    },
    pygameBridge: {
      lumiCode: 'callsign = "NOVA"\nlumi.say(callsign)',
      pygameCode: 'callsign = "NOVA"\nprint(callsign)',
      commonIdea: '변수에 문자열을 대입하고 출력 함수에 전달한다.',
    },
    memoryFragment: {
      label: '호출부호 변수 저장 패턴',
      code: 'from msense import lumi\ncallsign = "NOVA"\nlumi.say(callsign)',
      duration: 3000,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'timeline', 'inspector'],
    },
    starterCode: '# [호출부호 등록]\\n# 1. 호출부호 "NOVA"를 callsign 변수에 저장하세요.\\n# 2. 루미가 변수 값을 말하게 하세요.\\n',
    world: {
      scene: 'workbench',
      width: 7,
      height: 5,
      rover: { x: 2, y: 2, direction: 0, energy: 100, awake: true },
      target: false,
      obstacles: [],
    },
    goals: [
      { type: 'variableDefined', name: 'callsign' },
      { type: 'spokenMessage', includes: 'NOVA' },
    ],
    conceptEvidence: {
      mustUse: ['variable', 'string'],
      mustCall: ['lumi.say'],
    },
    hints: [
      { level: 1, type: 'concept', text: '=의 왼쪽에는 변수 이름, 오른쪽에는 저장할 문자열을 씁니다. 문자열은 큰따옴표로 감쌉니다.' },
      { level: 2, type: 'structure', text: 'callsign = "NOVA"로 변수를 만들고 lumi.say(callsign)을 호출하세요.' },
    ],
    hiddenVariants: [],
  },
  {
    id: 'lumi-act2-02',
    codeName: '2-2',
    actId: 'act-2-memory',
    order: 2,
    difficulty: 'core',
    title: '숫자 변수와 재사용',
    eyebrow: 'ACT 2 · MEMORY CORE',
    objective: 'power 변수에 숫자 10을 저장하고 lumi.say()로 보고하세요.',
    briefing: '변수에는 글자뿐만 아니라 숫자도 저장할 수 있습니다. power 상자에 10을 저장하고 lumi.say()로 관제소에 보고하세요.',
    learningSteps: [
      '숫자 10을 기억할 power 변수를 만듭니다.',
      'lumi.say(power)로 변수 값을 보고합니다.',
    ],
    concepts: ['변수', '숫자 대입'],
    restorationLevel: 40,
    lumiVoice: '동력 수치 10 보고 완료!',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'core',
      baseCrystals: 4,
      firstCompletionOnly: true,
    },
    pygameBridge: {
      lumiCode: 'power = 10\nlumi.say(power)',
      pygameCode: 'power = 10\nprint(power)',
      commonIdea: '숫자 변수를 정의하고 화면 또는 콘솔에 출력한다.',
    },
    memoryFragment: {
      label: '숫자 변수 대입 패턴',
      code: 'from msense import lumi\npower = 10\nlumi.say(power)',
      duration: 3000,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'timeline', 'inspector'],
    },
    starterCode: '# [숫자 변수와 재사용]\\n# 1. power 변수에 숫자 10을 저장하세요.\\n# 2. 루미가 변수 값을 말하게 하세요.\\n',
    world: {
      scene: 'workbench',
      width: 7,
      height: 5,
      rover: { x: 2, y: 2, direction: 0, energy: 100, awake: true },
      target: false,
      obstacles: [],
    },
    goals: [
      { type: 'variableDefined', name: 'power' },
      { type: 'spokenMessage', includes: '10' },
    ],
    conceptEvidence: {
      mustUse: ['variable'],
      mustCall: ['lumi.say'],
    },
    hints: [
      { level: 1, type: 'concept', text: '숫자는 따옴표 없이 power = 10 처럼 씁니다.' },
      { level: 2, type: 'structure', text: 'power = 10 작성 후 lumi.say(power)를 호출하세요.' },
    ],
    hiddenVariants: [],
  },
  {
    id: 'lumi-act2-03',
    codeName: '2-3',
    actId: 'act-2-memory',
    order: 3,
    difficulty: 'core',
    title: '보호막 변수 갱신',
    eyebrow: 'ACT 2 · MEMORY CORE',
    objective: '초기 보호막 5에서 2를 소모하여 shield 변수를 갱신하고 lumi.say()로 보고하세요.',
    briefing: '보호막은 처음 5칸 충전되어 있고 피격으로 2칸을 잃었습니다. 오른쪽의 shield를 먼저 읽어 2를 뺀 뒤, 계산 결과를 다시 같은 변수에 저장하면 값이 3으로 갱신됩니다.',
    learningSteps: [
      'shield 변수에 초기 보호막 값 5를 저장합니다.',
      '기존 shield에서 2를 뺀 결과를 다시 shield에 저장합니다.',
      'lumi.say(shield)로 갱신된 값을 보고합니다.',
    ],
    concepts: ['변수 갱신', '산술 연산', '-'],
    restorationLevel: 60,
    lumiVoice: '보호막 3 갱신 완료!',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'core',
      baseCrystals: 4,
      firstCompletionOnly: true,
    },
    pygameBridge: {
      lumiCode: 'shield = 5\nshield = shield - 2\nlumi.say(shield)',
      pygameCode: 'shield = 5\nshield -= 2\nprint(shield)',
      commonIdea: '연산으로 바뀐 변수 값을 갱신하여 확인한다.',
    },
    memoryFragment: {
      label: '보호막 변수 연산 및 갱신 패턴',
      code: 'from msense import lumi\\nshield = 5\\nshield = shield - 2\\nlumi.say(shield)',
      duration: 3000,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'timeline', 'inspector'],
    },
    starterCode: '# [보호막 변수 갱신]\\n# 1. shield 변수에 초기 보호막 값 5를 저장하세요.\\n# 2. 기존 값보다 2 작은 값으로 shield를 갱신하세요.\\n# 3. 갱신된 shield를 루미가 보고하게 하세요.\\n',
    world: {
      scene: 'workbench',
      width: 7,
      height: 5,
      rover: { x: 2, y: 2, direction: 0, energy: 100, awake: true },
      target: false,
      obstacles: [],
    },
    goals: [
      { type: 'variableChanged', name: 'shield', expectedFinal: 3 },
      { type: 'spokenMessage', includes: '3' },
    ],
    conceptEvidence: {
      mustUse: ['variable', '-'],
      mustCall: ['lumi.say'],
    },
    hints: [
      { level: 1, type: 'concept', text: '대입문의 오른쪽이 먼저 계산됩니다. 그래서 같은 변수 이름을 =의 양쪽에 사용해 값을 갱신할 수 있습니다.' },
      { level: 2, type: 'structure', text: 'shield = 5 다음 줄에 shield = shield - 2, 그 다음 줄에 lumi.say(shield)를 작성하세요.' },
    ],
    hiddenVariants: [],
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
    pygameBridgeKey: 'memory-type',
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
      code: 'from msense import lumi\nval_type = type(...)\nlumi.say(val_type)\nlumi.move(3)',
      duration: 3000,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'timeline', 'inspector'],
    },
    starterCode: `# [자료형 확인 지시서]
# 숫자 100의 자료형을 확인해 변수에 저장하고, 루미가 보고하게 하세요.
# 보고가 끝나면 3칸 전진하세요.
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
    pygameBridgeKey: 'memory-fstring',
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
      code: 'from msense import lumi\nenergy = 100\nmsg = f"ENERGY {___}"\nlumi.say(msg)\nlumi.move(3)',
      duration: 3000,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'timeline', 'inspector'],
    },
    starterCode: `# [f-string 상태 보고 지시서]
# 에너지 값 100을 변수에 저장하고 f-string 상태 메시지를 만들어 보고하세요.
# 보고가 끝나면 3칸 전진하세요.
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
    pygameBridgeKey: 'memory-input',
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
      code: 'from msense import lumi\nsteps_text = input("...")\nsteps = int(steps_text)\nlumi.move(steps)',
      duration: 3500,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'timeline', 'inspector'],
    },
    starterCode: `# === ACT 2 FIELD TEST: 관제 신호 수신 및 형 변환 ===
# 관제소가 보낸 문자열 신호를 숫자로 변환해 이동 거리로 사용하세요.
# 입력, 형 변환, 이동을 세 단계로 직접 작성하세요.
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

export const LEGACY_ACT_2_MISSIONS = [
  {
    id: 'lumi-act2-01-legacy',
    codeName: 'LEGACY-2-1',
    actId: 'act-2-memory',
    order: 1,
    difficulty: 'core',
    title: '첫 기억 슬롯 (Legacy)',
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
# 1. steps = 3 변수를 생성합니다.
# 2. lumi.move(steps) 로 전진하세요.
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
    id: 'lumi-act2-02-legacy',
    codeName: 'LEGACY-2-2',
    actId: 'act-2-memory',
    order: 2,
    difficulty: 'core',
    title: '좋은 신호 이름 (Legacy)',
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
      code: 'from msense import lumi\ntarget_steps = ___\nlumi.move(target_steps)',
      duration: 3000,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'timeline', 'inspector'],
    },
    starterCode: `# [식별자 명명 지시서]
# 1. target_steps = 4 변수를 생성합니다.
# 2. lumi.move(target_steps) 로 이동하세요.
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
    id: 'lumi-act2-03-legacy',
    codeName: 'LEGACY-2-3',
    actId: 'act-2-memory',
    order: 3,
    difficulty: 'core',
    title: '에너지 연산과 갱신 (Legacy)',
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
      code: 'from msense import lumi\nenergy = 5\nenergy = energy - ___\nlumi.move(energy)',
      duration: 3000,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'timeline', 'inspector'],
    },
    starterCode: `# [에너지 갱신 지시서]
# 1. energy = 5 변수를 생성합니다.
# 2. energy = energy - 2 로 갱신합니다.
# 3. lumi.move(energy) 로 전진하세요.
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
    hiddenVariants: [],
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
  description: '변수 대입, HUD 연동, safe_type, f-string 및 input/int 관제 입력을 마스터하는 6개 정규 미션',
  missions: ACT_2_MISSIONS,
})

export const LUMI_LEGACY_ACT_2_SET = Object.freeze({
  id: 'lumi-act-2-memory-legacy-v1',
  version: 1,
  kind: 'legacy',
  actId: 'act-2-memory',
  unitId: 'lumi_protocol_act_2_memory',
  lumiCourseId: 'lumi-season-1',
  title: 'ACT 2. MEMORY CORE (Legacy)',
  description: '구 버전 ACT 2 미션 호환성 보존 세트',
  missions: LEGACY_ACT_2_MISSIONS,
})

export const GAMEPLAY_VERTICAL_SLICE_MISSIONS = [
  {
    id: 'lumi-vs-game-01',
    codeName: 'VS-GAME-01',
    actId: 'act-gameplay-preview',
    order: 1,
    difficulty: 'core',
    title: '정비창 화면 켜기',
    eyebrow: 'SHOWCASE · GAME ENGINE',
    objective: '학습용 게임 장면을 시작하고, 루미 스킨과 원형 레이더를 배치한 뒤 장면을 종료하세요.',
    briefing: '게임 화면은 “준비 → 그리기 → 종료” 순서로 다룹니다. 여기서 쓰는 game은 실제 pygame이 아니라 같은 사고 순서를 안전하게 연습하는 LUMI 전용 도구이며 좌표는 픽셀이 아닌 격자 칸입니다.',
    learningSteps: [
      'from msense import game으로 학습용 게임 도구를 불러옵니다.',
      '장면을 시작한 뒤 "lumi_blue" 스킨을 격자 (2, 2)에 배치합니다.',
      '같은 중심에 청록색 원을 그려 레이더 범위를 표현합니다.',
      '모든 그리기가 끝난 뒤 장면을 종료합니다.',
    ],
    concepts: ['game.init', 'game.screen.blit', 'game.draw.circle', 'game.quit'],
    restorationLevel: 20,
    lumiVoice: '정비창 가동 및 레이더 동기화 완료!',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'core',
      baseCrystals: 4,
      firstCompletionOnly: true,
    },
    pygameBridge: {
      lumiCode: 'game.init()\ngame.screen.blit("lumi_blue", (2, 2))\ngame.quit()',
      pygameCode: 'pygame.init()\nscreen.blit(lumi_img, (100, 100))\npygame.quit()',
      commonIdea: '게임 엔진을 켜고, 이미지를 배치하고, 장면을 정상 종료한다.',
    },
    memoryFragment: {
      label: '게임 엔진 초기화 및 렌더링 패턴',
      code: 'from msense import game\ngame.init()\ngame.screen.blit("lumi_blue", position=(2, 2))\ngame.draw.circle("#38bdf8", (2, 2), 2)\ngame.quit()',
      duration: 3500,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'timeline', 'inspector'],
    },
    starterCode: `# msense에서 학습용 game 도구를 불러오세요.

# 장면을 시작한 뒤 "lumi_blue" 이미지를 격자 (2, 2)에 배치하세요.

# 같은 위치를 중심으로 반지름 2인 청록색 레이더 원을 그리세요.

# 마지막 줄에서 장면을 종료하세요.
`,
    world: {
      width: 7,
      height: 5,
      rover: { x: 2, y: 2, direction: 0, energy: 100, awake: true },
      target: { x: 5, y: 2, kind: 'beacon' },
      obstacles: [],
    },
    goals: [
      { type: 'gameInited' },
      { type: 'screenBlitted', image: 'lumi_blue' },
      { type: 'shapeDrawn', shape: 'circle' },
      { type: 'gameQuitted' },
    ],
    conceptEvidence: {
      mustCall: ['game.init', 'game.screen.blit', 'game.draw.circle', 'game.quit'],
    },
    hints: [
      { level: 1, type: 'concept', text: '게임 장면은 시작하기 전에 그릴 수 없고, 그리기를 마친 뒤 종료합니다. 따라서 init → blit/draw → quit 순서가 필요합니다.' },
      { level: 2, type: 'structure', text: '이미지는 `game.screen.blit(이미지_이름, position=(x, y))`, 원은 `game.draw.circle(색상, center=(x, y), radius=반지름)` 모양으로 사용합니다.' },
    ],
    hiddenVariants: [],
  },
  {
    id: 'lumi-vs-game-02',
    codeName: 'VS-GAME-02',
    actId: 'act-gameplay-preview',
    order: 2,
    difficulty: 'core',
    title: '보호막 HUD & 사운드',
    eyebrow: 'SHOWCASE · HUD & AUDIO',
    objective: 'shield 변수를 갱신하여 HUD 바에 반영하고 보호막 효과음을 재생하세요.',
    briefing: '보호막 상태는 숫자 변수 하나가 기준입니다. 숫자를 먼저 갱신한 뒤 같은 값을 HUD에 보내고 효과음을 재생하면 화면과 소리가 같은 사건을 설명하게 됩니다.',
    learningSteps: [
      'shield에 초기값 5를 저장하고 피격량 2를 빼서 새 값 3으로 갱신합니다.',
      'HUD 바의 이름, 현재 shield 값, 최댓값 5를 전달합니다.',
      '상태 변화가 끝난 시점에 "shield" 효과음을 한 번 재생합니다.',
    ],
    concepts: ['변수 갱신', 'game.hud.bar', 'game.sound.play'],
    restorationLevel: 40,
    lumiVoice: '보호막 게이지 및 음향 피드백 수신 완료!',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'core',
      baseCrystals: 4,
      firstCompletionOnly: true,
    },
    pygameBridge: {
      lumiCode: 'shield = shield - 2\ngame.hud.bar("SHIELD", shield, 5)\ngame.sound.play("shield")',
      pygameCode: 'shield -= 2\ndraw_shield_bar(shield)\nsound.play()',
      commonIdea: '변수를 갱신하면 HUD 게이지 바와 사운드가 함께 상태 변화를 알린다.',
    },
    memoryFragment: {
      label: 'HUD 바 갱신 및 사운드 재생 패턴',
      code: 'shield = 5\nshield = shield - 2\ngame.hud.bar("SHIELD", shield, maximum=5)\ngame.sound.play("shield")',
      duration: 3500,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'timeline', 'inspector'],
    },
    starterCode: `# shield에 초기값 5를 저장하고 2를 뺀 값으로 갱신하세요.

# 갱신된 값을 최댓값 5인 SHIELD HUD 바로 표시하세요.

# 마지막 줄에서 "shield" 효과음을 재생하세요.
`,
    world: {
      width: 7,
      height: 5,
      rover: { x: 2, y: 2, direction: 0, energy: 100, awake: true },
      target: { x: 5, y: 2, kind: 'beacon' },
      obstacles: [],
    },
    goals: [
      { type: 'variableChanged', name: 'shield', expectedFinal: 3 },
      { type: 'hudBarSet', label: 'SHIELD', expectedValue: 3, maximum: 5 },
      { type: 'soundPlayed', name: 'shield' },
    ],
    conceptEvidence: {
      mustUse: ['variable', '-'],
      mustCall: ['game.hud.bar', 'game.sound.play'],
    },
    hints: [
      { level: 1, type: 'concept', text: '화면과 소리는 상태가 바뀐 뒤에 갱신해야 서로 같은 값을 설명합니다.' },
      { level: 2, type: 'structure', text: 'HUD는 `game.hud.bar("이름", 현재값, maximum=최댓값)`, 효과음은 `game.sound.play("효과음 이름")` 모양입니다.' },
    ],
    hiddenVariants: [],
  },
  {
    id: 'lumi-vs-game-03',
    codeName: 'VS-GAME-03',
    actId: 'act-gameplay-preview',
    order: 3,
    difficulty: 'core',
    title: '키 상태 모니터',
    eyebrow: 'SHOWCASE · INPUT MONITOR',
    objective: '기록된 현재 프레임의 RIGHT 입력을 확인하고, 눌린 프레임에만 HUD 문구를 표시하세요.',
    briefing: '반복 재생해도 결과가 달라지지 않도록 이 미션은 실제 키보드 대신 미리 기록된 입력 테이프를 사용합니다. game.key.pressed()는 현재 논리 프레임의 입력을 True 또는 False로 돌려주며, 이후 실제 pygame의 실시간 입력으로 확장됩니다.',
    learningSteps: [
      '현재 프레임의 RIGHT 입력 상태를 읽어 right_pressed 변수에 저장합니다.',
      'if로 right_pressed가 True인 경우만 선택합니다.',
      '선택된 블록 안에서 화면 아래에 "KEY: RIGHT"를 표시합니다.',
    ],
    concepts: ['game.key.pressed', 'Boolean', 'if 조건문'],
    restorationLevel: 60,
    lumiVoice: '키 입력 센서 인식 완료!',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'core',
      baseCrystals: 4,
      firstCompletionOnly: true,
    },
    pygameBridge: {
      lumiCode: 'right_pressed = game.key.pressed("RIGHT")',
      pygameCode: 'keys = pygame.key.get_pressed()\nright_pressed = keys[pygame.K_RIGHT]',
      commonIdea: '현재 키보드가 눌려 있는지 True/False 상태로 감지한다.',
    },
    memoryFragment: {
      label: '키보드 입력 감지 패턴',
      code: 'right_pressed = game.key.pressed("RIGHT")\nif right_pressed:\n    game.text.render("KEY: RIGHT", position="bottom")',
      duration: 3500,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'timeline', 'inspector'],
    },
    starterCode: `# 기록된 RIGHT 키 상태를 읽어 right_pressed 변수에 저장하세요.

# 키 상태가 True일 때만 아래 들여쓴 블록을 실행하세요.
    # 화면 아래에 "KEY: RIGHT"를 표시하세요.
`,
    world: {
      width: 7,
      height: 5,
      rover: { x: 2, y: 2, direction: 0, energy: 100, awake: true },
      target: { x: 5, y: 2, kind: 'beacon' },
      obstacles: [],
    },
    keySequence: [['RIGHT']],
    goals: [
      { type: 'keyPressedChecked', key: 'RIGHT' },
      { type: 'textRendered', position: 'bottom', includes: 'KEY: RIGHT' },
    ],
    conceptEvidence: {
      mustUse: ['if'],
      mustCall: ['game.key.pressed', 'game.text.render'],
    },
    hints: [
      { level: 1, type: 'concept', text: 'pressed()의 결과는 문자열이 아니라 Boolean입니다. 따라서 변수 자체를 if 조건으로 사용할 수 있습니다.' },
      { level: 2, type: 'structure', text: '키 읽기는 `game.key.pressed("키 이름")`, HUD 출력은 `game.text.render("문구", position="위치")` 모양입니다. if 아래 줄은 네 칸 들여씁니다.' },
    ],
    hiddenVariants: [],
  },
  {
    id: 'lumi-vs-game-04',
    codeName: 'VS-GAME-04',
    actId: 'act-gameplay-preview',
    order: 4,
    difficulty: 'core',
    title: '첫 방어 펄스',
    eyebrow: 'SHOWCASE · COMBAT DEFENSE',
    objective: 'world.incoming_pulse가 감지되면 lumi.shield()로 방어하고 사운드를 울리세요.',
    briefing: '적의 에너지 펄스가 다가옵니다. world.incoming_pulse는 접근 중일 때 True인 센서 값입니다. 센서가 True인 경우에만 보호막과 효과음이 실행되도록 한 블록에 묶으세요.',
    learningSteps: [
      'world.incoming_pulse를 if 조건으로 읽습니다.',
      'True일 때 실행되는 들여쓴 블록에서 보호막을 올립니다.',
      '같은 블록에서 "shield" 효과음을 재생하여 방어 성공을 알립니다.',
    ],
    concepts: ['world.incoming_pulse', 'lumi.shield', 'game.sound.play'],
    restorationLevel: 80,
    lumiVoice: '펄스 방어 성공! 에너지 보호막 정상 전개.',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'core',
      baseCrystals: 4,
      firstCompletionOnly: true,
    },
    pygameBridge: {
      lumiCode: 'if world.incoming_pulse:\n    lumi.shield()',
      pygameCode: 'if incoming_pulse:\n    player.raise_shield()',
      commonIdea: '적 펄스 위협이 감지되었을 때만 if 조건으로 보호막을 켠다.',
    },
    memoryFragment: {
      label: '전방 펄스 방어 패턴',
      code: 'from msense import lumi, world, game\nif world.incoming_pulse:\n    lumi.shield()\n    game.sound.play("shield")',
      duration: 3500,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'timeline', 'inspector'],
    },
    starterCode: `# 접근 중인 펄스 센서를 if 조건으로 확인하세요.

# True일 때 실행되는 블록에 보호막과 "shield" 효과음을 넣으세요.
`,
    world: {
      width: 7,
      height: 5,
      rover: { x: 2, y: 2, direction: 0, energy: 100, awake: true },
      target: { x: 5, y: 2, kind: 'beacon' },
      obstacles: [],
      incomingPulse: true,
      pulseDistance: 3,
    },
    goals: [
      { type: 'shieldActive' },
      { type: 'soundPlayed', name: 'shield' },
    ],
    conceptEvidence: {
      mustUse: ['if'],
      mustCall: ['lumi.shield', 'game.sound.play'],
    },
    hints: [
      { level: 1, type: 'concept', text: '센서 값은 이미 True 또는 False이므로 == True를 덧붙이지 않고 if 뒤에 바로 사용할 수 있습니다.' },
      { level: 2, type: 'structure', text: '보호막은 `lumi.shield()`, 효과음은 `game.sound.play("효과음 이름")` 모양이며 두 줄 모두 if 아래에 네 칸 들여씁니다.' },
    ],
    hiddenVariants: [],
  },
  {
    id: 'lumi-vs-game-05',
    codeName: 'VS-GAME-05',
    actId: 'act-gameplay-preview',
    order: 5,
    difficulty: 'field-test',
    title: '4프레임 생존 루프',
    eyebrow: 'SHOWCASE · GAME LOOP',
    objective: '4개의 논리 프레임 동안 펄스 방어와 기록된 방향키 이동을 처리하는 게임 루프를 완성하세요.',
    briefing: '게임 루프는 매 프레임 “입력 읽기 → 상태 변경 → 프레임 진행”을 반복합니다. LUMI의 tick(10)은 실제로 0.1초를 기다리지 않고 재현 가능한 논리 프레임만 진행합니다. 실제 pygame에서는 Clock.tick(10)이 루프 속도를 시간 기준으로 제한합니다.',
    learningSteps: [
      'game.init으로 장면을 시작하여 game.running을 True로 만듭니다.',
      'while game.running 블록에서 펄스가 있을 때 방어하고 RIGHT 입력이 있을 때 한 칸 이동합니다.',
      '매 반복의 마지막에 tick을 한 번 호출해 다음 입력 프레임으로 넘어갑니다.',
      '미션이 정한 4프레임 뒤 running이 False가 되면 반복 밖에서 장면을 종료합니다.',
    ],
    concepts: ['while 루프', 'game.running', 'game.clock.tick', '종합 게임 루프'],
    restorationLevel: 100,
    lumiVoice: '게임 루프 생존 테스트 통과! 루미 게임 엔진 완벽 가동.',
    reward: {
      policyVersion: 'reward-v1',
      tier: 'field-test',
      baseCrystals: 8,
      firstCompletionOnly: true,
    },
    pygameBridge: {
      lumiCode: 'while game.running:\n    ...\n    game.clock.tick(10)',
      pygameCode: 'while running:\n    handle_input()\n    clock.tick(10)',
      commonIdea: '게임이 실행 중인 동안 프레임마다 입력을 읽고 행동한 뒤 시계를 맞춘다.',
    },
    memoryFragment: {
      label: '완전한 게임 루프 구조',
      code: 'from msense import lumi, world, game\ngame.init()\nwhile game.running:\n    if world.incoming_pulse:\n        lumi.shield()\n    if game.key.pressed("RIGHT"):\n        lumi.move(1)\n    game.clock.tick(10)\ngame.quit()',
      duration: 4000,
      autoPlay: true,
    },
    scaffold: {
      mode: 'edit',
      visibleTools: ['run', 'reset', 'step', 'timeline', 'inspector'],
    },
    starterCode: `# 학습용 게임 장면을 시작하세요.

# 장면이 실행 중인 동안 아래 작업을 반복하세요.
    # 펄스가 접근하면 보호막을 올리세요.
    # 기록된 RIGHT 키가 눌린 프레임에는 한 칸 이동하세요.
    # 반복의 마지막에서 다음 논리 프레임으로 진행하세요.

# 반복이 끝난 뒤 장면을 종료하세요.
`,
    world: {
      width: 8,
      height: 5,
      rover: { x: 1, y: 2, direction: 0, energy: 100, awake: true },
      target: { x: 5, y: 2, kind: 'beacon' },
      obstacles: [],
      incomingPulse: true,
      pulseDistance: 3,
    },
    keySequence: [['RIGHT'], ['RIGHT'], [], []],
    limits: { maxFrames: 4, maxCommands: 80, maxTraceEvents: 500 },
    goals: [
      { type: 'gameInited' },
      { type: 'clockTicked', minFrames: 4 },
      { type: 'shieldActive' },
      { type: 'gameQuitted' },
    ],
    conceptEvidence: {
      mustUse: ['while'],
      mustCall: ['game.init', 'game.clock.tick', 'game.quit'],
    },
    hints: [
      { level: 1, type: 'concept', text: 'tick은 반복을 끝낼 수 있도록 프레임을 증가시킵니다. tick을 if 안에 넣으면 키가 눌리지 않은 프레임에 시간이 멈추므로 반복 블록의 마지막에 둡니다.' },
      { level: 2, type: 'structure', text: '전체 뼈대는 장면 시작 → `while game.running:` → 두 개의 if와 tick → 들여쓰기를 끝낸 장면 종료 순서입니다.' },
    ],
    hiddenVariants: [],
  },
]

export const LUMI_GAMEPLAY_VERTICAL_SLICE_SET = Object.freeze({
  id: 'lumi-gameplay-vs-v1',
  version: 1,
  kind: 'prototype',
  actId: 'act-gameplay-preview',
  unitId: 'lumi_gameplay_vertical_slice',
  lumiCourseId: 'lumi-season-1',
  title: 'LUMI Pygame Gameplay Vertical Slice (5 Slices)',
  description: '루미 프로토콜의 핵심 게임 플레이 5대 요소를 체험하는 쇼케이스 세트',
  missions: GAMEPLAY_VERTICAL_SLICE_MISSIONS,
})

export function getLumiVerticalSliceSet() {
  return LUMI_VERTICAL_SLICE_SET
}

export function getLumiGameplayVerticalSliceSet() {
  return LUMI_GAMEPLAY_VERTICAL_SLICE_SET
}

export function getLumiLegacyVerticalSliceSet() {
  return LUMI_LEGACY_VERTICAL_SLICE_SET
}

export function getLumiLegacyAct2Set() {
  return LUMI_LEGACY_ACT_2_SET
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
import { LUMI_DATA_CORE_SET, LUMI_DATA_CORE_SET as LUMI_ACT_7_SET } from './lumiDataCoreCatalog.js'
import { LUMI_SENSOR_CORE_SET as LUMI_ACT_3_SET } from './lumiSensorCoreCatalog.js'
import { LUMI_DECISION_CORE_SET as LUMI_ACT_4_SET } from './lumiDecisionCoreCatalog.js'
import { LUMI_AUTOMATION_CORE_SET as LUMI_ACT_5_SET } from './lumiAutomationCoreCatalog.js'
import { LUMI_PERSISTENCE_CORE_SET as LUMI_ACT_6_SET } from './lumiPersistenceCoreCatalog.js'
import { LUMI_ABILITY_CORE_SET as LUMI_ACT_8_SET } from './lumiAbilityCoreCatalog.js'
import {
  LUMI_OBJECT_SPIKE_ENABLED,
  LUMI_OBJECT_LEARNING_PILOT_ENABLED,
  LUMI_TACTICAL_PILOT_ENABLED,
  LUMI_OBJECT_CORE_CANDIDATE_ENABLED,
  LUMI_OBJECT_FRONTIER_ENABLED,
  LUMI_LOST_LIGHT_FINAL_ENABLED,
} from '../../config/lumiFeatureFlags.js'

export { LUMI_ACT_3_SET, LUMI_ACT_4_SET, LUMI_ACT_5_SET, LUMI_ACT_6_SET, LUMI_ACT_7_SET, LUMI_ACT_8_SET, LUMI_DATA_CORE_SET }

const LUMI_LOCKED_MISSION_SET = Object.freeze({
  id: 'lumi-locked',
  kind: 'locked',
  title: '아직 승인되지 않은 LUMI 과정',
  version: 1,
  persistencePolicy: 'none',
  missions: [],
})

export function getLumiMissionSet(actId = 'act-0-awakening') {
  if (actId === 'act-gameplay-preview' || actId === 'lumi-gameplay-vs-v1' || actId === 'gameplay-vs') {
    return LUMI_GAMEPLAY_VERTICAL_SLICE_SET
  }
  if (actId === 'lumi-vertical-slice-legacy-v1' || actId === 'act-0-legacy') {
    return LUMI_LEGACY_VERTICAL_SLICE_SET
  }
  if (actId === 'lumi-act-2-memory-legacy-v1' || actId === 'act-2-legacy') {
    return LUMI_LEGACY_ACT_2_SET
  }
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
    LUMI_GAMEPLAY_VERTICAL_SLICE_SET,
    LUMI_ACT_1_SET,
    LUMI_ACT_2_SET,
    LUMI_ACT_3_SET,
    LUMI_ACT_4_SET,
    LUMI_ACT_5_SET,
    LUMI_ACT_6_SET,
    LUMI_DATA_CORE_SET,
    LUMI_ACT_8_SET,
    LUMI_LEGACY_VERTICAL_SLICE_SET,
    LUMI_LEGACY_ACT_2_SET,
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
      (Array.isArray(item.aliases) && item.aliases.some((alias) => String(alias).toLowerCase() === normalizedId)) ||
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
