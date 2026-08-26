const BASE_WORLD = Object.freeze({
  width: 9,
  height: 5,
  rover: { x: 1, y: 2, direction: 0, energy: 100, awake: true },
  target: { x: 6, y: 2, kind: 'beacon' },
  pathClear: true,
  obstacles: [],
  objects: [],
})

const PERSISTENCE_API = Object.freeze([
  { signature: 'while 조건:', description: '조건이 참(True)인 동안 들여쓴 코드 블록을 계속 반복 실행합니다.' },
  { signature: 'break', description: '반복문 실행 도중 즉시 루프를 탈출하고 다음 코드로 넘어갑니다.' },
  { signature: 'continue', description: '현재 반복의 남은 코드를 건너뛰고 다음 회차 반복을 시작합니다.' },
  { signature: 'game.clock.tick(fps)', description: '게임 시계를 1프레임 전진시키고 현재 프레임 번호를 반환합니다.' },
  { signature: 'world.target_distance', description: '비콘까지 남은 칸 수를 읽습니다.' },
  { signature: 'world.obstacle_ahead_distance', description: '전방 장애물까지의 거리를 읽습니다.' },
  { signature: 'world.objects', description: '월드에 남아 있는 오브젝트 리스트를 반환합니다.' },
  { signature: 'lumi.move(distance)', description: '현재 방향으로 지정한 칸만큼 이동합니다.' },
  { signature: 'lumi.charge()', description: '충전소에서 에너지를 100까지 완충합니다.' },
  { signature: 'lumi.collect(object)', description: '지정된 오브젝트를 수집합니다.' },
])

function persistenceMission({
  id, codeName, order, aliases = [], title, objective, briefing, concepts,
  pygameBridgeKey, world = {}, goals, mustUse = [], mustCall = [],
  hints = [], learningSteps = [], hiddenVariants = [], limits = {},
}) {
  return {
    id,
    codeName,
    actId: 'act-6-persistence',
    order,
    aliases,
    difficulty: order === 1 ? 'calibration' : order === 7 ? 'field-test' : 'core',
    title,
    eyebrow: `ACT 6 · PERSISTENCE CORE · ${order}/7`,
    objective,
    briefing,
    concepts,
    pygameBridgeKey,
    api: PERSISTENCE_API,
    starterCode: [
      '# [ACT 6 · PERSISTENCE CORE 지속 지시서]',
      `# 임무: ${title}`,
      `# 이번에 사용할 개념: ${concepts.join(' · ')}`,
      '# 아래 빈 줄부터 종료 조건과 반복 행동을 직접 작성하세요.',
      '',
    ].join('\n'),
    learningSteps,
    memoryFragment: {
      label: '지속 루프 스키마',
      code: 'while 조건:\n    if 탈출조건:\n        break\n    행동()',
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
      target: { ...BASE_WORLD.target, ...(world.target || {}) },
    },
    goals,
    conceptEvidence: { mustUse, mustCall },
    hints,
    hiddenVariants,
    limits: {
      maxCommands: 100,
      maxTraceEvents: 800,
      maxOutputChars: 5000,
      ...limits,
    },
    rewardPolicy: 'standard-crystals',
  }
}

export const LUMI_PERSISTENCE_CORE_MISSIONS = [
  persistenceMission({
    id: 'while-approach-01',
    codeName: '6-1',
    order: 1,
    aliases: ['lumi-act6-01', '6-1'],
    title: '비콘 접근 반복 (while)',
    objective: '목표와의 거리가 0보다 큰 동안 한 칸씩 이동하세요.',
    briefing: '비콘까지의 거리는 이동할 때마다 1씩 줄어듭니다. `while world.target_distance > 0:` 루프로 목적지에 도달할 때까지 전진을 지속하세요.',
    concepts: ['while', '조건 반복', '상태 변화'],
    pygameBridgeKey: 'loop-while',
    learningSteps: [
      'while world.target_distance > 0: 반복 조건을 작성합니다.',
      '들여써서 lumi.move(1)로 한 칸씩 전진합니다.',
    ],
    world: { target: { x: 6, y: 2 } },
    goals: [{ type: 'position', x: 6, y: 2, label: '거리가 0이 될 때까지 반복 전진' }],
    mustUse: ['while'],
    mustCall: ['lumi.move'],
    hints: [
      { level: 1, type: 'context', text: '반복 조건은 `world.target_distance > 0`입니다.' },
      { level: 2, type: 'concept', text: '`while world.target_distance > 0:` 아래에 `lumi.move(1)`을 들여쓰세요.' },
    ],
    hiddenVariants: [
      { id: 'far-target', world: { target: { x: 8, y: 2 } }, goals: [{ type: 'position', x: 8, y: 2, label: '더 먼 거리에서도 정확히 도달' }] },
    ],
  }),

  persistenceMission({
    id: 'while-charge-02',
    codeName: '6-2',
    order: 2,
    aliases: ['lumi-act6-02', '6-2'],
    title: '충전 완료 대기',
    objective: '에너지가 50보다 작을 동안 충전한 뒤, 루프를 나와 비콘으로 이동하세요.',
    briefing: '루미가 충분한 에너지를 확보할 때까지 충전 루프를 유지하고, 에너지가 50 이상이 되면 루프를 나와 목적지로 출발합니다.',
    concepts: ['while', '비교', '루프 후 실행'],
    pygameBridgeKey: 'loop-while',
    learningSteps: [
      'while lumi.energy < 50: 반복문을 작성합니다.',
      '들여써서 lumi.charge()를 실행합니다.',
      '들여쓰기를 끝내고 lumi.move(world.target_distance)로 비콘에 도착합니다.',
    ],
    world: {
      rover: { x: 1, y: 2, direction: 0, energy: 8, maxEnergy: 100 },
      objects: [{ id: 'station', kind: 'charge', x: 1, y: 2 }],
      target: { x: 6, y: 2 },
    },
    goals: [
      { type: 'minimumEnergy', value: 50, label: '에너지 50 이상 확보' },
      { type: 'position', x: 6, y: 2, label: '충전 완료 후 비콘 도착' },
    ],
    mustUse: ['while'],
    mustCall: ['lumi.charge', 'lumi.move'],
    hints: [
      { level: 1, type: 'context', text: '충전하면 에너지가 100으로 완충되어 루프를 탈출합니다.' },
      { level: 2, type: 'concept', text: '`lumi.move(...)`는 while 블록 바깥(들여쓰기 없음)에 작성하세요.' },
    ],
    hiddenVariants: [
      { id: 'critical-charge', world: { rover: { energy: 2 } }, goals: [{ type: 'position', x: 6, y: 2, label: '방전 직전 상태에서도 충전 후 도착' }] },
    ],
  }),

  persistenceMission({
    id: 'while-collect-03',
    codeName: '6-3',
    order: 3,
    aliases: ['lumi-act6-03', '6-3'],
    title: '잔여 신호 지속 수집',
    objective: '신호가 남아 있는 동안(while world.signal_count > 0) lumi.collect()로 모두 수집하세요.',
    briefing: '`while world.signal_count > 0:` 조건으로 남은 신호가 0개가 될 때까지 lumi.collect()로 수집을 반복하세요.',
    concepts: ['while', 'signal_count', '수집'],
    pygameBridgeKey: 'loop-while',
    learningSteps: [
      'while world.signal_count > 0: 반복문을 작성합니다.',
      'lumi.collect()로 신호를 수집합니다.',
    ],
    world: {
      target: { x: 1, y: 2 },
      objects: [
        { id: 's1', kind: 'signal', x: 1, y: 2 },
        { id: 's2', kind: 'signal', x: 1, y: 2 },
        { id: 's3', kind: 'signal', x: 1, y: 2 },
      ],
    },
    goals: [{ type: 'allSignalsCollected', label: '모든 신호 전량 수집 완료' }],
    mustUse: ['while'],
    mustCall: ['lumi.collect'],
    hints: [
      { level: 1, type: 'context', text: '수집할 때마다 `world.signal_count`가 줄어듭니다.' },
      { level: 2, type: 'concept', text: '`while world.signal_count > 0:` 아래에 `lumi.collect()`를 작성하세요.' },
    ],
    hiddenVariants: [
      {
        id: 'four-signals',
        world: {
          objects: [
            { id: 's1', kind: 'signal', x: 1, y: 2 },
            { id: 's2', kind: 'signal', x: 1, y: 2 },
            { id: 's3', kind: 'signal', x: 1, y: 2 },
            { id: 's4', kind: 'signal', x: 1, y: 2 },
          ],
        },
        goals: [{ type: 'allSignalsCollected', label: '4개 신호도 전량 수집' }],
      },
    ],
  }),

  persistenceMission({
    id: 'while-countdown-04',
    codeName: '6-4',
    order: 4,
    aliases: ['lumi-act6-04', '6-4'],
    title: '발사 카운트다운 루프',
    objective: 'count를 3부터 1까지 1씩 줄이며 출력한 뒤, 루프가 끝나면 "LAUNCH"를 출력하세요.',
    briefing: '반복문 안에서 카운터 변수를 직접 갱신합니다. `count = count - 1`로 값을 줄여 무한 루프에 빠지지 않도록 안전하게 제어하세요.',
    concepts: ['while', '카운터', '루프 갱신'],
    pygameBridgeKey: 'loop-while',
    learningSteps: [
      'count = 3 변수를 준비합니다.',
      'while count > 0: 반복문 안에서 print(count)와 count = count - 1 을 실행합니다.',
      '루프가 끝난 뒤 print("LAUNCH")를 실행합니다.',
    ],
    world: { target: { x: 1, y: 2 } },
    goals: [
      { type: 'stdoutIncludes', value: 'LAUNCH', label: '카운트다운 후 LAUNCH 출력' },
      { type: 'variableValueEquals', name: 'count', value: 0, label: '카운터 0으로 감소 완료' },
    ],
    mustUse: ['while', 'comparison', '-'],
    mustCall: ['print'],
    hints: [
      { level: 1, type: 'context', text: '반복문 안에서 반드시 `count = count - 1`을 실행해야 반복이 끝납니다.' },
      { level: 2, type: 'concept', text: '`while count > 0:` 아래에 `print(count)`와 `count = count - 1`을 작성하세요.' },
    ],
    hiddenVariants: [
      {
        id: 'five-countdown',
        goals: [{ type: 'stdoutIncludes', value: 'LAUNCH', label: '정상 발사 시퀀스 확인' }],
      },
    ],
  }),

  persistenceMission({
    id: 'while-break-05',
    codeName: '6-5',
    order: 5,
    aliases: ['lumi-act6-05', '6-5'],
    title: '긴급 루프 탈출 (break)',
    objective: '전방 장애물 거리(obstacle_dist)가 1 이하이면 break로 즉시 반복을 멈추고 충돌을 방지하세요.',
    briefing: 'while True 루프는 무한히 실행될 수 있습니다. `if obstacle_dist <= 1: break` 문으로 위험을 감지하는 순간 루프를 긴급 탈출하세요.',
    concepts: ['while', 'break', '긴급 탈출'],
    pygameBridgeKey: 'loop-break',
    learningSteps: [
      'while True: 무한 루프를 시작합니다.',
      'obstacle_dist = world.obstacle_ahead_distance 로 장애물 거리를 확인합니다.',
      'if obstacle_dist <= 1: 일 때 break 문으로 루프를 즉시 탈출합니다.',
      '그 외에는 lumi.move(1) 로 전진합니다.',
    ],
    world: {
      rover: { x: 1, y: 2, direction: 0, energy: 100 },
      obstacles: [{ x: 5, y: 2 }], // distance = 4
      target: { x: 4, y: 2 },
    },
    goals: [
      { type: 'position', x: 4, y: 2, label: '장애물 바로 앞에서 break 탈출' },
      { type: 'noCollision', label: '장애물 충돌 없이 안전 정지' },
    ],
    mustUse: ['while', 'break', 'if'],
    mustCall: ['world.obstacle_ahead_distance', 'lumi.move'],
    hints: [
      { level: 1, type: 'context', text: '`break`는 실행되는 즉시 가장 가까운 반복문을 강제로 종료합니다.' },
      { level: 2, type: 'concept', text: '`if obstacle_dist <= 1:` 블록 안에 `break`를 작성하세요.' },
    ],
    hiddenVariants: [
      {
        id: 'closer-obstacle',
        world: {
          obstacles: [{ x: 3, y: 2 }],
          target: { x: 2, y: 2 },
        },
        goals: [
          { type: 'position', x: 2, y: 2, label: '더 가까운 장애물 앞에서도 정확히 정지' },
          { type: 'noCollision', label: '무충돌 검증' },
        ],
      },
    ],
  }),

  persistenceMission({
    id: 'while-continue-06',
    codeName: '6-6',
    order: 6,
    aliases: ['lumi-act6-06', '6-6'],
    title: '불량 신호 건너뛰기 (continue)',
    objective: '스캔된 신호 중 kind가 "noise"인 불량 신호는 continue로 건너뛰고 진짜 신호만 수집하세요.',
    briefing: '잡음 신호를 수집하면 시스템 오류가 발생합니다. `if obj.kind == "noise": continue` 로 불량 데이터를 건너뛰고 다음 신호 처리를 계속하세요.',
    concepts: ['for', 'continue', '필터링'],
    pygameBridgeKey: 'loop-continue',
    learningSteps: [
      'signals = lumi.scan() 으로 신호를 스캔합니다.',
      'for sig in signals: 루프 안에서 if sig.kind == "noise": continue 를 실행합니다.',
      '건너뛰지 않은 유효한 신호만 lumi.collect(sig) 로 수집합니다.',
    ],
    world: {
      target: { x: 1, y: 2 },
      objects: [
        { id: 'n1', kind: 'noise', x: 1, y: 2 },
        { id: 's1', kind: 'signal', x: 1, y: 2 },
        { id: 'n2', kind: 'noise', x: 1, y: 2 },
        { id: 's2', kind: 'signal', x: 1, y: 2 },
      ],
    },
    goals: [
      { type: 'collectedCount', count: 2, label: '진짜 구조 신호 2개만 수집' },
      { type: 'allSignalsCollected', label: '유효 신호 전량 수집' },
      { type: 'collectedExcludesKind', kind: 'noise', label: '잡음 신호는 하나도 수집하지 않음' },
    ],
    mustUse: ['for', 'continue', 'if'],
    mustCall: ['lumi.scan', 'lumi.collect'],
    hints: [
      { level: 1, type: 'context', text: '`continue`는 이번 회차의 남은 줄을 건너뛰고 다음 반복으로 넘어갑니다.' },
      { level: 2, type: 'concept', text: '`if sig.kind == "noise": continue` 아래에 `lumi.collect(sig)`를 작성하세요.' },
    ],
    hiddenVariants: [
      {
        id: 'mixed-noise',
        world: {
          objects: [
            { id: 's1', kind: 'signal', x: 1, y: 2 },
            { id: 'n1', kind: 'noise', x: 1, y: 2 },
            { id: 's2', kind: 'signal', x: 1, y: 2 },
            { id: 's3', kind: 'signal', x: 1, y: 2 },
          ],
        },
        goals: [
          { type: 'collectedCount', count: 3, label: '진짜 구조 신호 3개만 수집' },
          { type: 'allSignalsCollected', label: '변형 항로의 유효 신호 전량 수집' },
          { type: 'collectedExcludesKind', kind: 'noise', label: '변형 항로에서도 잡음은 수집하지 않음' },
        ],
      },
    ],
  }),

  persistenceMission({
    id: 'while-rescue-07',
    codeName: '6-F',
    order: 7,
    aliases: ['lumi-act6-07', '6-F'],
    title: '지속 탐사 및 프레임 루프',
    objective: '게임 루프(while game.running) 안에서 프레임(game.clock.tick)을 진행하며 신호를 회수하고 비콘에 도착하세요.',
    briefing: 'FINAL PERSISTENCE TEST입니다. 결정론적 게임 루프 안에서 입력을 감시하고 남은 거리가 0이 될 때까지 자율 비행을 지속하세요.',
    concepts: ['while', 'game.running', 'game.clock.tick', '종합'],
    pygameBridgeKey: 'loop-game',
    learningSteps: [
      'game.init() 으로 게임 장면을 초기화합니다.',
      'while game.running and world.target_distance > 0: 루프를 실행합니다.',
      '루프 안에서 lumi.move(1) 전진 후 game.clock.tick(10) 으로 프레임을 갱신합니다.',
      '루프가 끝나면 game.quit() 로 안전하게 세션을 종료합니다.',
    ],
    world: {
      target: { x: 5, y: 2 },
      rover: { x: 1, y: 2, direction: 0, energy: 100 },
    },
    goals: [
      { type: 'gameInited', label: '게임 장면 초기화 (game.init)' },
      { type: 'clockTicked', minFrames: 4, label: '논리 프레임 4회 이상 진행' },
      { type: 'position', x: 5, y: 2, label: '지속 비행 후 비콘 도착' },
      { type: 'gameQuitted', label: '장면 안전 종료 (game.quit)' },
    ],
    mustUse: ['while', 'game'],
    mustCall: ['game.init', 'lumi.move', 'game.clock.tick', 'game.quit'],
    limits: {
      maxFrames: 8,
      maxCommands: 100,
      maxTraceEvents: 800,
    },
    hints: [
      { level: 1, type: 'context', text: '`game.clock.tick(10)`은 실제 1초를 기다리는 것이 아닌 논리적 1프레임을 시뮬레이션합니다.' },
      { level: 2, type: 'concept', text: '`while game.running and world.target_distance > 0:` 루프 안에서 move와 tick을 실행하세요.' },
    ],
    hiddenVariants: [
      {
        id: 'longer-flight',
        world: { target: { x: 6, y: 2 } },
        goals: [{ type: 'position', x: 6, y: 2, label: '더 긴 항로에서도 안전 완주' }],
      },
    ],
  }),
]

export const LUMI_PERSISTENCE_CORE_SET = Object.freeze({
  id: 'lumi-act-6-persistence-v1',
  version: 1,
  kind: 'course-act',
  actId: 'act-6-persistence',
  unitId: 'lumi_protocol_act_6_persistence',
  lumiCourseId: 'lumi-season-1',
  title: 'ACT 6. PERSISTENCE CORE (지속 코어)',
  description: 'while, break 긴급 탈출, continue 필터링과 결정론적 게임 루프를 완성하는 7개 정규 미션',
  persistencePolicy: 'official',
  rewardPolicy: 'standard-crystals',
  dailyRecordPolicy: 'official',
  assignmentEvidencePolicy: 'python-only',
  missions: LUMI_PERSISTENCE_CORE_MISSIONS,
})
