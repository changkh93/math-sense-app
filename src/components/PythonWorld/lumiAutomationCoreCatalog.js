const BASE_WORLD = Object.freeze({
  width: 10,
  height: 7,
  rover: { x: 1, y: 2, direction: 0, energy: 100, awake: true },
  target: { x: 4, y: 2, kind: 'beacon' },
  obstacles: [],
  objects: [],
})

const AUTOMATION_API = Object.freeze([
  { signature: 'from msense import lumi, world', description: '탐사 로봇과 환경 센서를 불러옵니다.' },
  { signature: 'range(count)', description: '0부터 count 직전까지 반복에 사용할 숫자 흐름을 만듭니다.' },
  { signature: 'world.steps_to_target', description: '목표까지 필요한 현재 이동 칸 수를 읽습니다.' },
  { signature: 'world.survey_rows / world.survey_columns', description: '조사해야 할 격자의 행과 열 수를 읽습니다.' },
  { signature: 'lumi.move(distance)', description: '현재 방향으로 지정한 칸만큼 이동합니다.' },
  { signature: 'lumi.turn(degrees)', description: '90도 단위로 방향을 전환합니다.' },
  { signature: 'lumi.scan()', description: '주변의 수집 가능한 신호 목록을 반환합니다.' },
  { signature: 'lumi.collect(signal)', description: '가까이 있는 신호 하나를 수집합니다.' },
])

function automationMission({
  id, codeName, order, aliases = [], title, objective, briefing, concepts,
  pygameBridgeKey, world = {}, goals, mustUse = [], mustCall = [],
  hints = [], learningSteps = [], hiddenVariants = [],
}) {
  return {
    id,
    codeName,
    actId: 'act-5-automation',
    order,
    aliases,
    difficulty: order === 1 ? 'calibration' : order === 7 ? 'field-test' : 'core',
    title,
    eyebrow: `ACT 5 · AUTOMATION CORE · ${order}/7`,
    objective,
    briefing,
    concepts,
    pygameBridgeKey,
    api: AUTOMATION_API,
    starterCode: [
      '# [ACT 5 · AUTOMATION CORE 자동화 지시서]',
      `# 임무: ${title}`,
      `# 이번에 사용할 개념: ${concepts.join(' · ')}`,
      '# 1. 필요한 경우 from msense import lumi (또는 world)를 작성하세요.',
      '# 2. 아래 빈 줄부터 반복 구조를 직접 작성하세요.',
      '',
    ].join('\n'),
    learningSteps,
    memoryFragment: {
      label: '반복 자동화 스키마',
      code: 'for 변수 in range(횟수):\n    반복할_행동',
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

export const LUMI_AUTOMATION_CORE_MISSIONS = [
  automationMission({
    id: 'lumi-automation-5-01',
    codeName: '5-1',
    order: 1,
    aliases: ['lumi-act5-01', '5-1'],
    title: '세 번의 추진 신호',
    objective: '한 칸 이동 명령을 for와 range로 정확히 세 번 반복하세요.',
    briefing: '같은 명령을 복사하지 않고 반복 구조 하나로 압축합니다. 반복되는 줄은 for 아래에 네 칸 들여씁니다.',
    concepts: ['for', 'range', '들여쓰기', '반복'],
    pygameBridgeKey: 'loop-range',
    learningSteps: [
      'for step in range(3): 반복문을 작성합니다.',
      '들여써서 lumi.move(1)을 실행하여 3칸을 이동합니다.',
    ],
    goals: [{ type: 'position', x: 4, y: 2, label: '한 칸 이동을 세 번 반복해 도달' }],
    mustUse: ['for', 'range'],
    mustCall: ['lumi.move'],
    hints: [
      { level: 1, type: 'context', text: '`range(3)`은 0, 1, 2를 차례로 만들어 세 번 반복합니다.' },
      { level: 2, type: 'concept', text: '`for step in range(3):` 아래에 `lumi.move(1)`을 들여쓰세요.' },
    ],
    hiddenVariants: [
      {
        id: 'shifted-start',
        world: { rover: { x: 2, y: 3 }, target: { x: 5, y: 3 } },
        goals: [{ type: 'position', x: 5, y: 3, label: '옮겨진 항로에서도 세 번 이동' }],
      },
    ],
  }),

  automationMission({
    id: 'lumi-automation-5-02',
    codeName: '5-2',
    order: 2,
    aliases: ['lumi-act5-02', '5-2'],
    title: '가변 항로 자동화',
    objective: '비콘 거리가 달라져도 작동하도록 센서값을 range의 반복 횟수로 사용하세요.',
    briefing: '고정된 3은 한 항로에서만 작동합니다. 센서가 읽은 현재 거리를 반복 범위로 바꾸면 코드가 환경 변화에 적응합니다.',
    concepts: ['for', 'range', '센서', '일반화'],
    pygameBridgeKey: 'loop-range',
    learningSteps: [
      'distance = world.steps_to_target 로 거리를 읽습니다.',
      'for step in range(distance): 반복문을 작성합니다.',
      '들여써서 lumi.move(1)을 실행합니다.',
    ],
    world: { target: { x: 7, y: 2 } },
    goals: [{ type: 'position', x: 7, y: 2, label: '센서 거리만큼 반복해 도달' }],
    mustUse: ['sensor', 'for', 'range'],
    mustCall: ['world.steps_to_target', 'lumi.move'],
    hints: [
      { level: 1, type: 'context', text: '숫자 대신 변수 `distance`를 `range()`에 전달합니다.' },
      { level: 2, type: 'concept', text: '`for step in range(distance):` 아래에서 `lumi.move(1)`을 실행하세요.' },
    ],
    hiddenVariants: [
      { id: 'near-route', world: { target: { x: 4, y: 2 } }, goals: [{ type: 'position', x: 4, y: 2, label: '짧아진 항로에 적응' }] },
      { id: 'far-route', world: { target: { x: 9, y: 2 } }, goals: [{ type: 'position', x: 9, y: 2, label: '길어진 항로에 적응' }] },
    ],
  }),

  automationMission({
    id: 'lumi-automation-5-03',
    codeName: '5-3',
    order: 3,
    aliases: ['lumi-act5-03', '5-3'],
    title: '반복 번호 관찰',
    objective: '조사할 행의 수만큼 반복하고 마지막 반복 번호를 보고하세요.',
    briefing: 'for의 step은 단순한 변수가 아닙니다. 반복할 때마다 0부터 하나씩 증가하는 값을 확인하세요.',
    concepts: ['반복 변수', 'range', '순차 값', '센서'],
    pygameBridgeKey: 'loop-range',
    learningSteps: [
      'row_count = world.survey_rows 로 행 수를 읽습니다.',
      'for step in range(row_count): 반복문을 작성합니다.',
      '들여써서 lumi.say(step)을 실행합니다.',
    ],
    world: { target: { x: 1, y: 2 }, surveyRows: 3 },
    goals: [
      { type: 'variableValueEquals', name: 'step', value: 2, label: '마지막 반복 번호 2 확인' },
      { type: 'spokenMessage', includes: '2', label: '마지막 행 번호 보고' },
    ],
    mustUse: ['sensor', 'for', 'range'],
    mustCall: ['world.survey_rows', 'lumi.say'],
    hints: [
      { level: 1, type: 'context', text: '`range(row_count)`를 사용하면 행 수가 바뀌어도 마지막 번호가 자동으로 맞춰집니다.' },
      { level: 2, type: 'concept', text: '`for step in range(row_count):` 아래에 `lumi.say(step)`을 작성하세요.' },
    ],
    hiddenVariants: [
      {
        id: 'five-rows',
        world: { surveyRows: 5 },
        goals: [
          { type: 'variableValueEquals', name: 'step', value: 4, label: '다섯 행의 마지막 번호 4' },
          { type: 'spokenMessage', includes: '4', label: '변형 행 번호 보고' },
        ],
      },
    ],
  }),

  automationMission({
    id: 'lumi-automation-5-04',
    codeName: '5-4',
    order: 4,
    aliases: ['lumi-act5-04', '5-4'],
    title: '에너지 누적기',
    objective: '1부터 신호 개수까지의 에너지를 for로 total에 누적하고 합계를 출력하세요.',
    briefing: '반복문은 계산을 자동화합니다. 0에서 시작한 누적 변수에 반복 번호를 차례로 더하는 패턴을 익히세요.',
    concepts: ['for', 'range', '누적 변수', '총합'],
    pygameBridgeKey: 'loop-range',
    learningSteps: [
      'signal_count = world.survey_columns 로 신호 개수를 읽고, total = 0 을 준비합니다.',
      'for energy in range(1, signal_count + 1): 반복하며 total = total + energy 로 누적합니다.',
      'print(total)로 총합을 출력합니다.',
    ],
    world: { target: { x: 1, y: 2 }, surveyColumns: 4 },
    goals: [
      { type: 'variableValueEquals', name: 'total', value: 10, label: '1부터 4까지 총합 10 계산' },
      { type: 'stdoutIncludes', value: '10', label: '누적 결과 출력' },
    ],
    mustUse: ['sensor', 'for', 'range', '+'],
    mustCall: ['world.survey_columns', 'print'],
    hints: [
      { level: 1, type: 'context', text: '`range(1, signal_count + 1)`은 1부터 마지막 번호까지 만듭니다.' },
      { level: 2, type: 'concept', text: '반복문 안에서 `total = total + energy`로 값을 갱신하세요.' },
    ],
    hiddenVariants: [
      {
        id: 'six-signals',
        world: { surveyColumns: 6 },
        goals: [
          { type: 'variableValueEquals', name: 'total', value: 21, label: '1부터 6까지 총합 21 계산' },
          { type: 'stdoutIncludes', value: '21', label: '늘어난 신호 누적 결과 출력' },
        ],
      },
    ],
  }),

  automationMission({
    id: 'lumi-automation-5-05',
    codeName: '5-5',
    order: 5,
    aliases: ['lumi-act5-05', '5-5'],
    title: '신호 전량 회수',
    objective: 'scan()이 돌려준 모든 신호를 for로 순회하며 하나도 빠짐없이 수집하세요.',
    briefing: '신호 개수가 달라져도 스캔 목록 자체를 순회하면 같은 코드로 전량을 수집할 수 있습니다.',
    concepts: ['for', '순회', '리스트', '객체'],
    pygameBridgeKey: 'loop-range',
    learningSteps: [
      'signals = lumi.scan() 으로 신호 목록을 스캔합니다.',
      'for signal in signals: 로 각 신호를 순회합니다.',
      '들여써서 lumi.collect(signal)을 실행합니다.',
    ],
    world: {
      target: { x: 1, y: 2 },
      objects: [
        { id: 's1', kind: 'signal', x: 1, y: 2 },
        { id: 's2', kind: 'signal', x: 2, y: 2 },
        { id: 's3', kind: 'signal', x: 1, y: 3 },
      ],
    },
    goals: [{ type: 'allSignalsCollected', label: '스캔된 신호 전량 수집' }],
    mustUse: ['for'],
    mustCall: ['lumi.scan', 'lumi.collect'],
    hints: [
      { level: 1, type: 'context', text: '`for signal in signals:`로 목록을 순회합니다.' },
      { level: 2, type: 'concept', text: '반복문 안에서 `lumi.collect(signal)`을 호출하세요.' },
    ],
    hiddenVariants: [
      {
        id: 'extra-signals',
        world: {
          objects: [
            { id: 'a1', kind: 'signal', x: 1, y: 2 },
            { id: 'a2', kind: 'signal', x: 2, y: 2 },
            { id: 'a3', kind: 'signal', x: 1, y: 3 },
            { id: 'a4', kind: 'signal', x: 1, y: 1 },
          ],
        },
        goals: [{ type: 'allSignalsCollected', label: '늘어난 신호도 전량 수집' }],
      },
    ],
  }),

  automationMission({
    id: 'lumi-automation-5-06',
    codeName: '5-6',
    order: 6,
    aliases: ['lumi-act5-06', '5-6'],
    title: '중첩 반복 사각 항로',
    objective: '바깥 반복은 네 변을, 안쪽 반복은 각 변의 칸을 담당하게 해 사각 항로를 완주하세요.',
    briefing: '안쪽 for로 한 변을 이동하고, 바깥 for가 그 과정을 네 번 되풀이하여 사각 궤도를 순찰합니다.',
    concepts: ['중첩 for', '안쪽 반복', '바깥 반복', '회전'],
    pygameBridgeKey: 'loop-nested',
    learningSteps: [
      'side_length = world.steps_to_target 로 한 변의 길이를 읽습니다.',
      'for side in range(4): 로 네 변을 순회합니다.',
      '안쪽에서 for step in range(side_length): 로 한 칸씩 이동합니다.',
      '한 변이 끝날 때 lumi.turn(90)으로 회전합니다.',
    ],
    world: { width: 9, height: 8, rover: { x: 2, y: 2 }, target: { x: 4, y: 2 } },
    goals: [
      { type: 'positionUnchanged', x: 2, y: 2, label: '사각 항로를 돌아 출발점 복귀' },
      { type: 'noCollision', label: '충돌 없이 네 변 완주' },
      { type: 'eventOccurred', eventType: 'rover_turned', label: '각 변에서 방향 전환' },
    ],
    mustUse: ['sensor', 'for', 'range', 'nested_for'],
    mustCall: ['world.steps_to_target', 'lumi.move', 'lumi.turn'],
    hints: [
      { level: 1, type: 'context', text: '바깥쪽은 `range(4)`, 안쪽은 `range(side_length)`입니다.' },
      { level: 2, type: 'concept', text: '안쪽 for가 끝난 후, 바깥 for 안에서 `lumi.turn(90)`을 실행하세요.' },
    ],
    hiddenVariants: [
      {
        id: 'larger-square',
        world: { target: { x: 5, y: 2 } },
        goals: [
          { type: 'positionUnchanged', x: 2, y: 2, label: '큰 사각 항로 후 출발점 복귀' },
          { type: 'noCollision', label: '큰 사각 항로 무충돌' },
        ],
      },
    ],
  }),

  automationMission({
    id: 'lumi-automation-5-07',
    codeName: '5-F',
    order: 7,
    aliases: ['lumi-act5-07', '5-F'],
    title: '격자 조사 자동화',
    objective: '행과 열 센서값으로 중첩 반복을 구성하고 전체 조사 칸 수를 계산해 보고하세요.',
    briefing: 'FINAL AUTOMATION TEST입니다. 조사 구역 크기가 바뀌어도 모든 셀을 세는 2중 반복 자동화 코어를 완성하세요.',
    concepts: ['중첩 for', '센서', '누적 변수', '일반화'],
    pygameBridgeKey: 'loop-nested',
    learningSteps: [
      'rows = world.survey_rows, columns = world.survey_columns, cells = 0 을 준비합니다.',
      'for r in range(rows): 아래에 for c in range(columns): 를 중첩합니다.',
      '가장 안쪽에서 cells = cells + 1 로 칸 수를 누적합니다.',
      'lumi.say(cells)로 총 조사 칸 수를 보고합니다.',
    ],
    world: { target: { x: 1, y: 2 }, surveyRows: 2, surveyColumns: 3 },
    goals: [
      { type: 'variableValueEquals', name: 'cells', value: 6, label: '2 × 3 구역의 6칸 계산' },
      { type: 'spokenMessage', includes: '6', label: '전체 조사 칸 수 보고' },
    ],
    mustUse: ['sensor', 'for', 'range', 'nested_for', '+'],
    mustCall: ['world.survey_rows', 'world.survey_columns', 'lumi.say'],
    hints: [
      { level: 1, type: 'context', text: '바깥 for는 `range(rows)`, 안쪽 for는 `range(columns)`를 사용합니다.' },
      { level: 2, type: 'concept', text: '안쪽에서 `cells = cells + 1` 누적 후 say로 보고하세요.' },
    ],
    hiddenVariants: [
      {
        id: 'wide-grid',
        world: { surveyRows: 3, surveyColumns: 4 },
        goals: [
          { type: 'variableValueEquals', name: 'cells', value: 12, label: '3 × 4 구역의 12칸 계산' },
          { type: 'spokenMessage', includes: '12', label: '넓어진 구역 보고' },
        ],
      },
    ],
  }),
]

export const LUMI_AUTOMATION_CORE_SET = Object.freeze({
  id: 'lumi-act-5-automation-v1',
  version: 1,
  kind: 'course-act',
  actId: 'act-5-automation',
  unitId: 'lumi_protocol_act_5_automation',
  lumiCourseId: 'lumi-season-1',
  title: 'ACT 5. AUTOMATION CORE (자동화 코어)',
  description: 'for, range, 반복 변수, 누적, 순회와 중첩 반복을 연결하는 7개 정규 미션',
  persistencePolicy: 'official',
  rewardPolicy: 'standard-crystals',
  dailyRecordPolicy: 'official',
  assignmentEvidencePolicy: 'python-only',
  missions: LUMI_AUTOMATION_CORE_MISSIONS,
})
