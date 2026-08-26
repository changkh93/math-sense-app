const BASE_WORLD = Object.freeze({
  width: 9,
  height: 5,
  rover: { x: 1, y: 2, direction: 0, energy: 100, awake: true },
  target: { x: 6, y: 2, kind: 'beacon' },
  pathClear: true,
  obstacles: [],
  objects: [],
})

const DECISION_API = Object.freeze([
  { signature: 'if 조건:', description: '조건이 참(True)일 때만 들여쓴 코드 블록을 실행합니다.' },
  { signature: 'elif 다른조건:', description: '앞선 if가 거짓일 때 새로운 조건을 검사합니다.' },
  { signature: 'else:', description: '모든 앞선 조건이 거짓일 때 실행할 기본 행동을 지정합니다.' },
  { signature: 'and / or', description: '두 조건을 모두 만족(and)하거나 하나라도 만족(or)하는지 결합합니다.' },
  { signature: 'lumi.energy', description: '루미의 현재 배터리 잔량을 숫자로 읽습니다.' },
  { signature: 'lumi.charge()', description: '충전소에서 에너지를 100까지 완충합니다.' },
  { signature: 'lumi.shield()', description: '에너지 보호막을 가동하여 전방 위협을 방어합니다.' },
  { signature: 'lumi.dodge()', description: '측면 회피 기동을 수행합니다.' },
  { signature: 'world.incoming_pulse', description: '적 터렛의 펄스 공격이 감지되었는지 Boolean으로 확인합니다.' },
  { signature: 'world.path_clear', description: '관제소가 확인한 항로의 안전 여부를 읽습니다.' },
])

function decisionMission({
  id, codeName, order, aliases = [], title, objective, briefing, concepts,
  pygameBridgeKey, world = {}, goals, mustUse = [], mustCall = [],
  hints = [], learningSteps = [], hiddenVariants = [],
}) {
  return {
    id,
    codeName,
    actId: 'act-4-decision',
    order,
    aliases,
    difficulty: order === 1 ? 'calibration' : order === 6 ? 'field-test' : 'core',
    title,
    eyebrow: `ACT 4 · DECISION CORE · ${order}/6`,
    objective,
    briefing,
    concepts,
    pygameBridgeKey,
    api: DECISION_API,
    starterCode: [
      '# [ACT 4 · DECISION CORE 판단 지시서]',
      `# 임무: ${title}`,
      `# 이번에 사용할 개념: ${concepts.join(' · ')}`,
      '# 아래 빈 줄부터 판단 구조를 직접 작성하세요.',
      '',
    ].join('\n'),
    learningSteps,
    memoryFragment: {
      label: '조건 분기 스키마',
      code: 'if 조건:\n    참일_때_실행\nelif 다른조건:\n    두번째_실행\nelse:\n    그_외_실행',
      duration: 2200,
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
    rewardPolicy: 'standard-crystals',
  }
}

export const LUMI_DECISION_CORE_MISSIONS = [
  decisionMission({
    id: 'if-charge-01',
    codeName: '4-1',
    order: 1,
    aliases: ['lumi-act4-01', '4-1'],
    title: '출발 전 안전 충전',
    objective: '루미의 에너지가 30 미만일 때만 charge()로 충전하세요.',
    briefing: '에너지가 충분할 때 불필요하게 충전하면 시간이 낭비됩니다. `if lumi.energy < 30:` 조건으로 필요한 순간에만 충전소를 가동하세요.',
    concepts: ['if', '비교 연산자', 'lumi.energy'],
    pygameBridgeKey: 'condition-basic',
    learningSteps: [
      'if 조건문으로 lumi.energy < 30 인지 검사합니다.',
      '조건문 아래에 네 칸 들여써서 lumi.charge()를 실행합니다.',
    ],
    world: {
      rover: { x: 1, y: 2, direction: 0, energy: 12, maxEnergy: 100 },
      objects: [{ id: 'station', kind: 'charge', x: 1, y: 2 }],
    },
    goals: [
      { type: 'minimumEnergy', value: 80, label: '에너지 80 이상으로 충전 완료' },
    ],
    mustUse: ['if', 'comparison'],
    mustCall: ['lumi.charge'],
    hints: [
      { level: 1, type: 'context', text: '에너지는 `lumi.energy`로 확인합니다.' },
      { level: 2, type: 'concept', text: '`if lumi.energy < 30:` 작성 후 들여써서 `lumi.charge()`를 호출하세요.' },
    ],
    hiddenVariants: [
      {
        id: 'critical-low',
        world: { rover: { energy: 5 } },
        goals: [{ type: 'minimumEnergy', value: 80, label: '위급 배터리(5)에서도 충전' }],
      },
    ],
  }),

  decisionMission({
    id: 'if-launch-02',
    codeName: '4-2',
    order: 2,
    aliases: ['lumi-act4-02', '4-2'],
    title: '양갈래 항로 선택 (if/else)',
    objective: '항로가 열려 있으면(world.path_clear) 비콘으로 전진하고, 닫혀 있으면 "대기"를 보고하세요.',
    briefing: '조건이 참일 때와 거짓일 때 실행할 행동이 다릅니다. if와 else를 사용하여 두 갈래 길 중 올바른 행동을 선택하세요.',
    concepts: ['if', 'else', '분기'],
    pygameBridgeKey: 'condition-branch',
    learningSteps: [
      'if world.path_clear: 조건으로 항로 안전을 확인합니다.',
      '참이면 lumi.move(world.target_distance)로 목표까지 이동합니다.',
      'else: 에서는 lumi.say("대기")로 관제소에 대기 신호를 전송합니다.',
    ],
    world: {
      pathClear: true,
      rover: { x: 1, y: 2, direction: 0, energy: 100 },
      target: { x: 6, y: 2 },
    },
    goals: [
      { type: 'position', x: 6, y: 2, label: '열린 항로에서 비콘 도착' },
    ],
    mustUse: ['if', 'else'],
    hints: [
      { level: 1, type: 'context', text: '`if world.path_clear:` 다음 줄에 전진, `else:` 다음 줄에 대기를 작성합니다.' },
      { level: 2, type: 'concept', text: 'if와 else 아래의 실행 명령은 각각 네 칸씩 들여써야 합니다.' },
    ],
    hiddenVariants: [
      {
        id: 'storm-blocked',
        world: { pathClear: false },
        goals: [
          { type: 'spokenMessage', includes: '대기', label: '닫힌 항로에서 대기 보고' },
          { type: 'positionUnchanged', x: 1, y: 2, label: '위험 항로에서 제자리 대기' },
        ],
      },
    ],
  }),

  decisionMission({
    id: 'if-signal-03',
    codeName: '4-3',
    order: 3,
    aliases: ['lumi-act4-03', '4-3'],
    title: '3단 위협 대응 (if/elif/else)',
    objective: '적 거리(dist)에 따라 2 이하이면 방어막, 4 이하이면 회피, 그 외에는 1칸 전진하세요.',
    briefing: '상황이 3단계 이상으로 나뉠 때는 elif를 사용합니다. 거리별로 근접 위협은 shield(), 중간 거리는 dodge(), 안전 거리는 move(1)로 대응합니다.',
    concepts: ['if', 'elif', 'else', '다중 조건'],
    pygameBridgeKey: 'condition-multi',
    learningSteps: [
      'dist = world.obstacle_ahead_distance 로 거리를 읽습니다.',
      'if dist <= 2: 일 때 lumi.shield() 로 보호막을 켭니다.',
      'elif dist <= 4: 일 때 lumi.dodge() 로 회피합니다.',
      'else: 일 때 lumi.move(1) 로 전진합니다.',
    ],
    world: {
      obstacles: [{ x: 3, y: 2 }], // dist = 2
      target: { x: 7, y: 2 },
    },
    goals: [
      { type: 'shieldActive', label: '근접 위협(거리 2)에서 보호막 가동' },
    ],
    mustUse: ['if', 'elif', 'else', 'comparison'],
    mustCall: ['world.obstacle_ahead_distance'],
    hints: [
      { level: 1, type: 'context', text: '`if dist <= 2:`, `elif dist <= 4:`, `else:` 순서로 작성합니다.' },
      { level: 2, type: 'concept', text: '각 조건 블록 안에서 요구된 동작(shield, dodge, move)을 호출하세요.' },
    ],
    hiddenVariants: [
      {
        id: 'medium-threat',
        world: { obstacles: [{ x: 5, y: 2 }] }, // dist = 4
        goals: [
          { type: 'eventOccurred', eventType: 'rover_dodged', label: '중거리 위협(거리 4)에서 회피 기동' },
        ],
      },
      {
        id: 'far-threat',
        world: { obstacles: [{ x: 8, y: 2 }] }, // dist = 7
        goals: [
          { type: 'position', x: 2, y: 2, label: '안전 거리에서 1칸 전진' },
        ],
      },
    ],
  }),

  decisionMission({
    id: 'if-route-04',
    codeName: '4-4',
    order: 4,
    aliases: ['lumi-act4-04', '4-4'],
    title: '좌우 항로 선회',
    objective: '비콘의 x좌표가 루미보다 왼쪽에 있으면 180도 선회한 뒤 비콘으로 이동하세요.',
    briefing: '목표 지점의 x좌표가 루미의 현재 x좌표보다 작다면 목표는 뒤쪽(왼쪽)에 있습니다. 조건 검사로 선회 여부를 판단하세요.',
    concepts: ['if', '좌표 비교', '분기'],
    pygameBridgeKey: 'condition-coordinate',
    learningSteps: [
      'target_x = world.snapshot()["target"]["x"] 로 목표 x좌표를 읽습니다.',
      'if target_x < lumi.x: 조건이면 lumi.turn(180)으로 뒤를 돌아봅니다.',
      'lumi.move(world.target_distance)로 비콘에 도착합니다.',
    ],
    world: {
      rover: { x: 6, y: 2, direction: 0, energy: 100 },
      target: { x: 2, y: 2 },
    },
    goals: [
      { type: 'position', x: 2, y: 2, label: '왼쪽 비콘으로 안전하게 도착' },
      { type: 'noCollision', label: '충돌 없이 도착' },
    ],
    mustUse: ['if', 'comparison'],
    mustCall: ['lumi.turn', 'lumi.move'],
    hints: [
      { level: 1, type: 'context', text: '루미보다 목표의 x좌표가 작으면 뒤쪽에 있는 것입니다.' },
      { level: 2, type: 'concept', text: '`if target_x < lumi.x:` 안에서 180도 회전하세요.' },
    ],
    hiddenVariants: [
      {
        id: 'front-target',
        world: {
          rover: { x: 2, y: 2, direction: 0, energy: 100 },
          target: { x: 6, y: 2 },
        },
        goals: [{ type: 'position', x: 6, y: 2, label: '앞쪽 비콘에서도 정확히 이동' }],
      },
    ],
  }),

  decisionMission({
    id: 'if-dual-05',
    codeName: '4-5',
    order: 5,
    aliases: ['lumi-act4-05', '4-5'],
    title: '복합 안전 조건 (and / or)',
    objective: '에너지가 충분하고 거리가 6 이하이거나, 비상 신호(world.emergency)가 감지되었을 때 출발하세요.',
    briefing: '실제 우주 탐사선은 여러 센서 조건을 논리 연산자 and와 or로 결합하여 출발 여부를 엄격하게 판정합니다.',
    concepts: ['if', 'and', 'or', 'Boolean'],
    pygameBridgeKey: 'condition-compound',
    learningSteps: [
      'distance = world.target_distance 로 비콘 거리를 읽습니다.',
      'if (lumi.energy >= distance and distance <= 6) or world.emergency: 조건으로 판단합니다.',
      '조건이 참이면 lumi.move(distance)로 이동합니다.',
    ],
    world: {
      rover: { x: 1, y: 2, direction: 0, energy: 100 },
      target: { x: 6, y: 2 },
    },
    goals: [
      { type: 'position', x: 6, y: 2, label: '복합 안전 조건을 통과하여 비콘 도착' },
    ],
    mustUse: ['if', 'comparison', 'boolean'],
    mustCall: ['lumi.move'],
    hints: [
      { level: 1, type: 'context', text: '`and`는 둘 다 참일 때, `or`는 둘 중 하나만 참이어도 참입니다.' },
      { level: 2, type: 'concept', text: '`if (lumi.energy >= distance and distance <= 6) or world.emergency:` 를 완성하세요.' },
    ],
    hiddenVariants: [
      {
        id: 'emergency-launch',
        world: {
          width: 10,
          rover: { energy: 100 },
          target: { x: 8, y: 2 }, // distance = 7 (>6)
          incomingPulse: true, // emergency = true overrides distance check
        },
        goals: [{ type: 'position', x: 8, y: 2, label: '비상 상황 긴급 출발' }],
      },
    ],
  }),

  decisionMission({
    id: 'if-rescue-06',
    codeName: '4-F',
    order: 6,
    aliases: ['lumi-act4-06', '4-F'],
    title: '자율 구조 판단 시스템',
    objective: '에너지가 부족하면 충전하고, 적 펄스가 오면 방어막을 켜고, 강한 신호만 수집한 뒤 비콘에 도착하세요.',
    briefing: 'FINAL DECISION TEST입니다. 지금까지 배운 if/elif/else와 센서 판단을 종합하여 스스로 상황을 극복하는 자율 루미를 완성하세요.',
    concepts: ['if', 'elif', 'else', '센서 판단', '종합'],
    pygameBridgeKey: 'condition-field',
    learningSteps: [
      'if lumi.energy < 20: 조건으로 필요 시 충전합니다.',
      'if world.incoming_pulse: 조건이면 lumi.shield()로 방어합니다.',
      '주변 신호 중 strength >= 5인 우선 신호를 수집합니다.',
      'lumi.move(world.target_distance)로 비콘에 도착합니다.',
    ],
    world: {
      rover: { x: 1, y: 2, direction: 0, energy: 10, maxEnergy: 100 },
      incomingPulse: true,
      objects: [
        { id: 'station', kind: 'charge', x: 1, y: 2 },
        { id: 'priority', kind: 'signal', x: 1, y: 2, strength: 8 },
      ],
      target: { x: 6, y: 2 },
    },
    goals: [
      { type: 'shieldActive', label: '적 펄스 방어막 가동' },
      { type: 'collectedIncludes', id: 'priority', label: '우선 구조 신호 수집' },
      { type: 'position', x: 6, y: 2, label: '비콘 최종 도착' },
    ],
    mustUse: ['if', 'comparison'],
    mustCall: ['lumi.charge', 'lumi.shield', 'lumi.move'],
    hints: [
      { level: 1, type: 'context', text: '1. 충전 여부 판단 -> 2. 펄스 방어 -> 3. 신호 수집 -> 4. 이동 순서로 작성합니다.' },
      { level: 2, type: 'concept', text: '각 단계마다 조건문을 작성해 상황에 맞게 실행되도록 하세요.' },
    ],
    hiddenVariants: [
      {
        id: 'storm-shifted',
        world: {
          rover: { x: 1, y: 2, energy: 8 },
          target: { x: 7, y: 2 },
          incomingPulse: true,
          objects: [
            { id: 'station', kind: 'charge', x: 1, y: 2 },
            { id: 'priority', kind: 'signal', x: 1, y: 2, strength: 9 },
          ],
        },
        goals: [
          { type: 'shieldActive', label: '변형 상황 펄스 방어' },
          { type: 'position', x: 7, y: 2, label: '변형 거리 비콘 도착' },
        ],
      },
    ],
  }),
]

export const LUMI_DECISION_CORE_SET = Object.freeze({
  id: 'lumi-act-4-decision-v1',
  version: 1,
  kind: 'course-act',
  actId: 'act-4-decision',
  unitId: 'lumi_protocol_act_4_decision',
  lumiCourseId: 'lumi-season-1',
  title: 'ACT 4. DECISION CORE (판단 코어)',
  description: 'if, if/else, if/elif/else, 좌표 비교와 and/or 논리 연산자로 안전 행동을 자율 판단하는 6개 정규 미션',
  persistencePolicy: 'official',
  rewardPolicy: 'standard-crystals',
  dailyRecordPolicy: 'official',
  assignmentEvidencePolicy: 'python-only',
  missions: LUMI_DECISION_CORE_MISSIONS,
})
