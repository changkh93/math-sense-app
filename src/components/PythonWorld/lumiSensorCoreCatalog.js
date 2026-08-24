const BASE_WORLD = Object.freeze({
  width: 9,
  height: 5,
  rover: { x: 1, y: 2, direction: 0, energy: 100, awake: true },
  target: { x: 4, y: 2, kind: 'beacon' },
  pathClear: true,
  obstacles: [],
})

const SENSOR_API = Object.freeze([
  { signature: 'world.steps_to_target', description: '현재 위치에서 목표까지 필요한 칸 수를 읽습니다.' },
  { signature: 'world.path_clear', description: '관제소가 확인한 항로의 안전 여부를 Boolean으로 읽습니다.' },
  { signature: 'world.obstacle_ahead_distance', description: '현재 방향에서 가장 가까운 장애물까지의 칸 수를 읽습니다.' },
  { signature: 'lumi.move(distance)', description: '현재 방향으로 지정한 칸만큼 이동합니다.' },
  { signature: 'lumi.say(message)', description: '센서 판독값을 말풍선으로 보고합니다.' },
])

function sensorMission({
  id, codeName, order, title, objective, briefing, concepts, starterCode,
  world = {}, goals, mustUse = [], mustCall = [], hints = [], hiddenVariants = [],
}) {
  return {
    id,
    codeName,
    actId: 'act-3-sensor',
    order,
    difficulty: order === 1 ? 'calibration' : order === 5 ? 'field-test' : 'core',
    title,
    eyebrow: `ACT 3 · SENSOR CORE · ${order}/5`,
    objective,
    briefing,
    concepts,
    api: SENSOR_API,
    starterCode,
    memoryFragment: {
      label: '손상된 센서 신호',
      code: '# world.센서이름 으로 현재 환경을 읽습니다.\n# 읽은 값은 변수에 저장해 사용하세요.',
      duration: 1800,
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

export const LUMI_SENSOR_CORE_MISSIONS = [
  sensorMission({
    id: 'lumi-sensor-3-01', codeName: '3-1', order: 1,
    title: '목표 거리 수신',
    objective: '목표까지의 거리를 센서로 읽고, 그 값만큼 루미를 이동시키세요.',
    briefing: '비콘의 위치는 매번 달라집니다. 숫자를 외우지 말고 world가 보내는 현재 거리 신호를 변수에 저장하세요.',
    concepts: ['world', '속성', '센서', '변수'],
    starterCode: 'distance = 0\n\n# TODO: 목표까지 필요한 칸 수를 distance에 저장하세요.\n# TODO: distance만큼 루미를 이동시키세요.\nlumi.move(distance)',
    goals: [
      { type: 'position', x: 4, y: 2, label: '변하는 비콘 위치에 도달' },
      { type: 'variableValueEquals', name: 'distance', value: 3, label: '센서 거리 3을 변수에 저장' },
    ],
    mustUse: ['sensor', 'variable'],
    mustCall: ['world.steps_to_target', 'lumi.move'],
    hints: ['`world.steps_to_target`은 지금 필요한 이동 칸 수입니다.', '센서 값을 `distance`에 저장한 뒤 `lumi.move(distance)`로 전달하세요.'],
    hiddenVariants: [
      {
        id: 'far-beacon',
        target: { x: 7, y: 2 },
        goals: [
          { type: 'position', x: 7, y: 2, label: '멀어진 비콘에 도달' },
          { type: 'variableValueEquals', name: 'distance', value: 6, label: '변형 거리 6을 저장' },
        ],
      },
    ],
  }),
  sensorMission({
    id: 'lumi-sensor-3-02', codeName: '3-2', order: 2,
    title: 'Boolean 항로 신호',
    objective: '항로 안전 신호를 읽어 True 또는 False를 그대로 보고하세요.',
    briefing: 'world.path_clear는 문장이 아니라 참/거짓 두 상태만 보내는 Boolean 센서입니다. 센서값 자체를 관찰하세요.',
    concepts: ['Boolean', 'True', 'False', 'world.path_clear'],
    starterCode: 'route_open = False\n\n# TODO: 항로 안전 신호를 route_open에 저장하세요.\nlumi.say(route_open)',
    goals: [
      { type: 'variableValueEquals', name: 'route_open', value: true, label: '안전 신호 True 저장' },
      { type: 'spokenMessage', includes: 'True', label: 'True 상태 보고' },
    ],
    mustUse: ['sensor', 'variable'],
    mustCall: ['world.path_clear', 'lumi.say'],
    hints: ['`world.path_clear`에는 이미 True 또는 False가 들어 있습니다.', '따옴표로 감싸지 말고 센서값을 변수에 그대로 저장하세요.'],
    hiddenVariants: [
      {
        id: 'blocked-route',
        world: { pathClear: false },
        goals: [
          { type: 'variableValueEquals', name: 'route_open', value: false, label: '위험 신호 False 저장' },
          { type: 'spokenMessage', includes: 'False', label: 'False 상태 보고' },
        ],
      },
    ],
  }),
  sensorMission({
    id: 'lumi-sensor-3-03', codeName: '3-3', order: 3,
    title: '전방 장애물 측정',
    objective: '전방 장애물까지의 거리를 측정해 관제소에 숫자로 보고하세요.',
    briefing: '시야에는 장애물이 보이지만 정확한 거리는 센서로만 알 수 있습니다. 측정값을 obstacle_distance에 보존하세요.',
    concepts: ['센서', '거리', '속성', '숫자'],
    starterCode: 'obstacle_distance = 0\n\n# TODO: 앞 장애물까지의 거리를 읽으세요.\nlumi.say(obstacle_distance)',
    world: { obstacles: [{ x: 4, y: 2 }], target: { x: 1, y: 2 } },
    goals: [
      { type: 'variableValueEquals', name: 'obstacle_distance', value: 3, label: '장애물 거리 3 저장' },
      { type: 'spokenMessage', includes: '3', label: '측정 거리 보고' },
    ],
    mustUse: ['sensor', 'variable'],
    mustCall: ['world.obstacle_ahead_distance', 'lumi.say'],
    hints: ['`world.obstacle_ahead_distance`가 현재 방향의 첫 장애물을 찾습니다.', '측정한 값을 변수에 저장하고 `lumi.say()`에 전달하세요.'],
    hiddenVariants: [
      {
        id: 'shifted-obstacle',
        world: { obstacles: [{ x: 7, y: 2 }] },
        goals: [
          { type: 'variableValueEquals', name: 'obstacle_distance', value: 6, label: '변형 장애물 거리 6 저장' },
          { type: 'spokenMessage', includes: '6', label: '변형 거리 보고' },
        ],
      },
    ],
  }),
  sensorMission({
    id: 'lumi-sensor-3-04', codeName: '3-4', order: 4,
    title: '안전 거리 비교',
    objective: '장애물이 3칸 이상 떨어져 있는지 비교해 Boolean으로 보고하세요.',
    briefing: '센서 숫자는 비교 연산자를 거치면 판단에 사용할 수 있는 Boolean 신호가 됩니다. 아직 if는 쓰지 않고 결과 자체를 관찰합니다.',
    concepts: ['비교 연산자', '>=', 'Boolean', '센서'],
    starterCode: 'safe_distance = False\n\n# TODO: 장애물 거리가 3 이상인지 비교하세요.\nlumi.say(safe_distance)',
    world: { obstacles: [{ x: 4, y: 2 }], target: { x: 1, y: 2 } },
    goals: [
      { type: 'variableValueEquals', name: 'safe_distance', value: true, label: '안전 거리 비교 결과 True' },
      { type: 'spokenMessage', includes: 'True', label: '비교 결과 보고' },
    ],
    mustUse: ['sensor', 'comparison', 'variable'],
    mustCall: ['world.obstacle_ahead_distance', 'lumi.say'],
    hints: ['센서값 뒤에 `>= 3`을 붙이면 참/거짓 결과가 만들어집니다.'],
    hiddenVariants: [
      {
        id: 'danger-close',
        world: { obstacles: [{ x: 2, y: 2 }] },
        goals: [
          { type: 'variableValueEquals', name: 'safe_distance', value: false, label: '가까운 장애물 비교 결과 False' },
          { type: 'spokenMessage', includes: 'False', label: '위험 결과 보고' },
        ],
      },
    ],
  }),
  sensorMission({
    id: 'lumi-sensor-3-05', codeName: '3-F', order: 5,
    title: '센서 융합 출발 판정',
    objective: '항로가 열려 있고 장애물이 목표보다 멀 때만 True가 되는 출발 신호를 만드세요.',
    briefing: 'FINAL SENSOR TEST입니다. 두 센서 상태와 거리 비교를 and로 묶어 하나의 신뢰 가능한 Boolean 신호로 융합하세요.',
    concepts: ['센서 융합', 'and', '비교', 'Boolean'],
    starterCode: 'can_depart = False\n\n# TODO: 항로 안전 여부와 두 거리 센서를 하나의 식으로 연결하세요.\nlumi.say(can_depart)',
    world: { obstacles: [{ x: 7, y: 2 }] },
    goals: [
      { type: 'variableValueEquals', name: 'can_depart', value: true, label: '두 조건이 안전할 때 True' },
      { type: 'spokenMessage', includes: 'True', label: '통합 출발 신호 보고' },
    ],
    mustUse: ['sensor', 'comparison', 'boolean', 'variable'],
    mustCall: ['world.path_clear', 'world.obstacle_ahead_distance', 'world.steps_to_target', 'lumi.say'],
    hints: ['`A and B`는 두 조건이 모두 True일 때만 True입니다.', '항로 신호와 `장애물 거리 > 목표 거리` 비교를 and로 연결하세요.'],
    hiddenVariants: [
      {
        id: 'storm-closed',
        world: { pathClear: false },
        goals: [
          { type: 'variableValueEquals', name: 'can_depart', value: false, label: '닫힌 항로에서 False' },
          { type: 'spokenMessage', includes: 'False', label: '닫힌 항로 결과 보고' },
        ],
      },
      {
        id: 'obstacle-before-target',
        world: { obstacles: [{ x: 3, y: 2 }] },
        goals: [
          { type: 'variableValueEquals', name: 'can_depart', value: false, label: '가까운 장애물에서 False' },
          { type: 'spokenMessage', includes: 'False', label: '장애물 위험 결과 보고' },
        ],
      },
    ],
  }),
]

export const LUMI_SENSOR_CORE_SET = Object.freeze({
  id: 'lumi-act-3-sensor-v1',
  version: 1,
  kind: 'course-act',
  actId: 'act-3-sensor',
  unitId: 'lumi_protocol_act_3_sensor',
  lumiCourseId: 'lumi-season-1',
  title: 'ACT 3. SENSOR CORE (센서 코어)',
  description: 'world 속성, 거리 센서, 비교와 Boolean 센서 융합을 단계적으로 익히는 5개 정규 미션',
  persistencePolicy: 'official',
  rewardPolicy: 'standard-crystals',
  dailyRecordPolicy: 'official',
  assignmentEvidencePolicy: 'python-only',
  missions: LUMI_SENSOR_CORE_MISSIONS,
})
