const LOOP_MISSION_SET_ID = 'lumi-loop-navigation-v1'

export const LOOP_MISSION_SET = Object.freeze({
  id: LOOP_MISSION_SET_ID,
  version: 1,
  title: '반복 자동화 프로토콜',
  description: 'for 반복문으로 루미의 항법 신호를 복원합니다.',
  protocol: {
    id: 'loop-navigation',
    name: '반복 자동화 프로토콜',
    level: 1,
  },
  missions: [
    {
      id: 'loop-calibration-01',
      order: 1,
      difficulty: 'calibration',
      title: '항법 링 점검',
      eyebrow: 'CALIBRATION · 1/2',
      objective: 'for 반복문을 실행해 루미를 파란 비콘까지 이동시키세요.',
      briefing: '관제실이 세 번의 동일한 이동 신호를 감지했습니다. 코드를 실행하고 반복 변수와 루미의 위치 변화를 관찰하세요.',
      concepts: ['for', 'range', '순차 실행'],
      api: [
        { signature: 'lumi.move(distance)', description: '현재 방향으로 지정한 칸만큼 이동합니다.' },
        { signature: 'world.target_distance', description: '현재 위치에서 비콘까지의 직선 거리입니다.' },
      ],
      starterCode: [
        'from msense import lumi, world',
        '',
        'distance = world.target_distance',
        '',
        'for step in range(distance):',
        '    lumi.move(1)',
      ].join('\n'),
      world: {
        width: 8,
        height: 5,
        rover: { x: 1, y: 2, direction: 0, energy: 100 },
        target: { x: 4, y: 2, kind: 'beacon' },
        obstacles: [],
      },
      goal: { type: 'position', x: 4, y: 2 },
      conceptEvidence: { mustUse: ['for', 'range'] },
      hints: [
        '같은 `lumi.move(1)` 명령이 몇 번 필요한지 월드의 거리를 확인해 보세요.',
        '`range(distance)`는 0부터 distance 직전까지 반복합니다.',
        '반복할 명령은 `for` 아래에 네 칸 들여써야 합니다.',
      ],
      hiddenVariants: [],
    },
    {
      id: 'loop-core-01',
      order: 2,
      difficulty: 'core',
      title: '폭풍 속 가변 항로',
      eyebrow: 'CORE MISSION · 2/2',
      objective: '비콘 위치가 달라져도 작동하도록 for 반복문으로 루미를 이동시키세요.',
      briefing: '폭풍 때문에 비콘 좌표가 계속 바뀝니다. 숫자를 고정하지 말고 관제실이 제공하는 거리 값을 사용해야 합니다.',
      concepts: ['변수', 'for', 'range', '일반화'],
      api: [
        { signature: 'lumi.move(distance)', description: '현재 방향으로 이동합니다.' },
        { signature: 'world.target_distance', description: '비콘까지의 현재 직선 거리를 반환합니다.' },
      ],
      starterCode: [
        'from msense import lumi, world',
        '',
        'distance = world.target_distance',
        '',
        '# for 반복문으로 루미를 비콘까지 이동시키세요.',
      ].join('\n'),
      world: {
        width: 9,
        height: 5,
        rover: { x: 1, y: 2, direction: 0, energy: 100 },
        target: { x: 6, y: 2, kind: 'beacon' },
        obstacles: [],
      },
      goal: { type: 'position', x: 6, y: 2 },
      conceptEvidence: { mustUse: ['for', 'range'] },
      hints: [
        '비콘까지의 거리는 이미 `distance` 변수에 저장되어 있습니다.',
        '`for step in range(distance):` 형태로 반복 횟수를 정할 수 있습니다.',
        '반복문 안에서 `lumi.move(1)`을 실행해 보세요.',
      ],
      hiddenVariants: [
        { id: 'near-route', target: { x: 5, y: 2 } },
        { id: 'far-route', target: { x: 7, y: 2 } },
      ],
    },
  ],
})

const NAV_API = [
  { signature: 'lumi.move(distance)', description: '현재 방향으로 이동합니다.' },
  { signature: 'lumi.turn(degrees)', description: '90도의 배수만큼 회전합니다.' },
  { signature: 'world.target_distance', description: '현재 위치에서 비콘까지의 거리입니다.' },
]

const SENSOR_API = [
  { signature: 'lumi.scan(radius=99)', description: '범위 안의 신호와 표본을 리스트로 반환합니다.' },
  { signature: 'lumi.collect(object)', description: '현재 위치 또는 바로 옆의 객체를 수집합니다.' },
  { signature: 'lumi.charge()', description: '충전소에서 에너지를 완전히 충전합니다.' },
]

function createAlphaMission({
  id, order, title, objective, briefing, concepts, starterCode, world, goal, goals,
  mustUse = [], mustUseAny = [], mustCall = [], hints = [], hiddenVariants = [], api = NAV_API,
}) {
  return {
    id,
    order,
    difficulty: order === 1 ? 'calibration' : order === 6 ? 'challenge' : 'core',
    title,
    eyebrow: `${order === 1 ? 'CALIBRATION' : order === 6 ? 'CHALLENGE' : 'CORE MISSION'} · ${order}/6`,
    objective,
    briefing,
    concepts,
    api,
    starterCode: starterCode.join('\n'),
    world: {
      width: 9,
      height: 5,
      rover: { x: 1, y: 2, direction: 0, energy: 100, maxEnergy: 100 },
      target: { x: 6, y: 2, kind: 'beacon' },
      obstacles: [],
      objects: [],
      ...world,
    },
    ...(goals ? { goals } : { goal }),
    conceptEvidence: { mustUse, mustUseAny, mustCall },
    hints,
    hiddenVariants,
    limits: { maxCommands: 200, maxTraceEvents: 1600, maxOutputChars: 5000 },
  }
}

export const IF_MISSION_SET = Object.freeze({
  id: 'lumi-if-decision-v1', version: 1, title: '에너지 판단 프로토콜',
  description: 'if 조건문으로 루미가 상황을 읽고 안전한 행동을 선택하게 합니다.',
  protocol: { id: 'if-decision', name: '에너지 판단 프로토콜', level: 1 },
  missions: [
    createAlphaMission({
      id: 'if-charge-01', order: 1, title: '출발 전 충전',
      objective: '에너지가 30보다 낮을 때만 루미를 충전하세요.',
      briefing: '루미는 충전소 위에 있지만 에너지가 부족합니다. 상태를 먼저 확인하고 필요한 행동만 실행하세요.',
      concepts: ['if', '비교', '상태'],
      starterCode: ['from msense import lumi', '', 'if lumi.energy < 30:', '    lumi.charge()'],
      world: { rover: { x: 1, y: 2, direction: 0, energy: 12, maxEnergy: 100 }, objects: [{ id: 'station', kind: 'charge', x: 1, y: 2 }] },
      goal: { type: 'minimumEnergy', value: 80 }, mustUse: ['if', 'comparison'], mustCall: ['lumi.charge'], api: SENSOR_API,
      hints: ['에너지는 `lumi.energy`로 읽습니다.', '`if lumi.energy < 30:` 아래에서 충전하세요.'],
      hiddenVariants: [{ id: 'critical', world: { rover: { energy: 5 } } }],
    }),
    createAlphaMission({
      id: 'if-launch-02', order: 2, title: '안전 출력 판정',
      objective: '현재 에너지가 비콘까지의 거리 이상일 때 루미를 출발시키세요.',
      briefing: '항법 장치는 에너지와 거리를 비교한 뒤에만 이동 명령을 허용합니다.',
      concepts: ['if', '비교', '변수'],
      starterCode: ['from msense import lumi, world', '', 'distance = world.target_distance', '# 조건이 안전할 때 이동하세요.'],
      goal: { type: 'position', x: 6, y: 2 }, mustUse: ['if', 'comparison'], mustCall: ['lumi.move'],
      hints: ['`lumi.energy >= distance`를 조건으로 사용할 수 있습니다.', '조건문 안에서 `lumi.move(distance)`를 실행하세요.'],
      hiddenVariants: [{ id: 'longer', target: { x: 7, y: 2 } }],
    }),
    createAlphaMission({
      id: 'if-signal-03', order: 3, title: '강한 신호 선별',
      objective: '스캔한 객체 중 strength가 5 이상인 신호만 수집하세요.',
      briefing: '잡음 신호와 구조 신호가 같은 위치에서 감지됩니다. 조건으로 진짜 구조 신호를 골라내세요.',
      concepts: ['if', 'for', '속성'],
      starterCode: ['from msense import lumi', '', 'objects = lumi.scan()', 'for obj in objects:', '    # 강한 신호만 수집하세요.'],
      world: { target: { x: 1, y: 2 }, objects: [{ id: 'noise', kind: 'signal', x: 1, y: 2, strength: 2 }, { id: 'rescue', kind: 'signal', x: 1, y: 2, strength: 8 }] },
      goal: { type: 'collectedIncludes', id: 'rescue' }, mustUse: ['if', 'for', 'comparison'], mustCall: ['lumi.scan', 'lumi.collect'], api: SENSOR_API,
      hints: ['각 객체의 세기는 `obj.strength`입니다.', '`if obj.strength >= 5:`를 사용해 보세요.'],
    }),
    createAlphaMission({
      id: 'if-route-04', order: 4, title: '좌우 항로 전환',
      objective: '비콘이 왼쪽에 있으면 180도 회전한 뒤 이동하세요.',
      briefing: '비콘 좌표가 루미의 앞 또는 뒤에서 전송됩니다. x좌표를 비교해 방향을 결정하세요.',
      concepts: ['if', '좌표', '분기'],
      starterCode: ['from msense import lumi, world', '', 'if world.snapshot()["target"]["x"] < lumi.x:', '    lumi.turn(180)', '', 'lumi.move(world.target_distance)'],
      world: { rover: { x: 6, y: 2, direction: 0, energy: 100 }, target: { x: 2, y: 2 } },
      goal: { type: 'position', x: 2, y: 2 }, mustUse: ['if', 'comparison'], mustCall: ['lumi.turn', 'lumi.move'],
      hints: ['목표의 x좌표가 루미보다 작으면 왼쪽입니다.', '왼쪽을 보려면 `lumi.turn(180)`을 실행합니다.'],
    }),
    createAlphaMission({
      id: 'if-dual-05', order: 5, title: '이중 안전 조건',
      objective: '에너지가 충분하고 거리가 6 이하일 때만 비콘으로 이동하세요.',
      briefing: '폭풍 항로는 두 안전 조건을 모두 통과해야 열립니다.',
      concepts: ['if', 'and', 'Boolean'],
      starterCode: ['from msense import lumi, world', '', 'distance = world.target_distance', '# and로 두 조건을 결합하세요.'],
      goal: { type: 'position', x: 6, y: 2 }, mustUse: ['if', 'comparison', 'boolean'], mustCall: ['lumi.move'],
      hints: ['Python에서 두 조건은 `and`로 연결합니다.', '`if lumi.energy >= distance and distance <= 6:`을 완성하세요.'],
      hiddenVariants: [{ id: 'near', target: { x: 4, y: 2 } }],
    }),
    createAlphaMission({
      id: 'if-rescue-06', order: 6, title: '자율 구조 판단',
      objective: '에너지가 부족하면 충전하고, 강한 구조 신호만 회수한 뒤 비콘에 도착하세요.',
      briefing: '충전·판독·수집·이동을 하나의 안전 규칙으로 결합하는 최종 판단 임무입니다.',
      concepts: ['if', 'for', '복합 조건'],
      starterCode: ['from msense import lumi, world', '', '# 1. 필요하면 충전', '# 2. 강한 신호 수집', '# 3. 비콘으로 이동'],
      world: { rover: { x: 1, y: 2, direction: 0, energy: 4, maxEnergy: 100 }, objects: [{ id: 'station', kind: 'charge', x: 1, y: 2 }, { id: 'priority', kind: 'signal', x: 1, y: 2, strength: 9 }] },
      goals: [{ type: 'collectedCount', count: 1 }, { type: 'position', x: 6, y: 2 }],
      mustUse: ['if', 'for', 'comparison'], mustCall: ['lumi.charge', 'lumi.scan', 'lumi.collect', 'lumi.move'], api: [...NAV_API, ...SENSOR_API],
      hints: ['각 행동을 먼저 작은 조건으로 나누세요.', '충전 후 `for obj in lumi.scan():`으로 신호를 검사하세요.'],
      hiddenVariants: [{ id: 'storm-shift', target: { x: 7, y: 2 }, world: { rover: { energy: 3 } } }],
    }),
  ],
})

export const WHILE_MISSION_SET = Object.freeze({
  id: 'lumi-while-sensor-v1', version: 1, title: '지속 센서 프로토콜',
  description: 'while 반복으로 조건이 바뀔 때까지 루미의 행동을 지속합니다.',
  protocol: { id: 'while-sensor', name: '지속 센서 프로토콜', level: 1 },
  missions: [
    createAlphaMission({
      id: 'while-approach-01', order: 1, title: '비콘 접근 반복', objective: '거리가 0이 될 때까지 한 칸씩 이동하세요.',
      briefing: '비콘과의 거리는 이동할 때마다 줄어듭니다. 변하는 조건을 계속 확인하세요.', concepts: ['while', '상태 변화'],
      starterCode: ['from msense import lumi, world', '', 'while world.target_distance > 0:', '    lumi.move(1)'], goal: { type: 'position', x: 6, y: 2 }, mustUse: ['while'], mustCall: ['lumi.move'],
      hints: ['반복 조건은 `world.target_distance > 0`입니다.', '반복할 때마다 한 칸 이동해야 조건이 변합니다.'], hiddenVariants: [{ id: 'far', target: { x: 8, y: 2 } }],
    }),
    createAlphaMission({
      id: 'while-charge-02', order: 2, title: '충전 완료 대기', objective: '에너지가 50보다 작을 동안 충전한 뒤 출발하세요.',
      briefing: '비상 충전소의 상태를 반복 조건으로 감시합니다.', concepts: ['while', '비교'],
      starterCode: ['from msense import lumi, world', '', 'while lumi.energy < 50:', '    lumi.charge()', '', 'lumi.move(world.target_distance)'],
      world: { rover: { x: 1, y: 2, direction: 0, energy: 8, maxEnergy: 100 }, objects: [{ id: 'station', kind: 'charge', x: 1, y: 2 }] }, goal: { type: 'position', x: 6, y: 2 }, mustUse: ['while'], mustCall: ['lumi.charge', 'lumi.move'], api: [...NAV_API, ...SENSOR_API],
      hints: ['충전하면 에너지가 100으로 바뀝니다.', 'while이 끝난 다음 이동 코드를 작성하세요.'],
    }),
    createAlphaMission({
      id: 'while-collect-03', order: 3, title: '신호가 남지 않을 때까지', objective: '월드에 남은 모든 신호를 while 반복으로 수집하세요.',
      briefing: '세 신호가 같은 중계점에 모였습니다. 목록이 비면 반복을 끝내야 합니다.', concepts: ['while', '리스트', '수집'],
      starterCode: ['from msense import lumi, world', '', 'while world.objects:', '    obj = world.objects[0]', '    lumi.collect(obj)'],
      world: { target: { x: 1, y: 2 }, objects: [{ id: 's1', kind: 'signal', x: 1, y: 2 }, { id: 's2', kind: 'signal', x: 1, y: 2 }, { id: 's3', kind: 'signal', x: 1, y: 2 }] }, goal: { type: 'allSignalsCollected' }, mustUse: ['while'], mustCall: ['lumi.collect'], api: SENSOR_API,
      hints: ['빈 리스트는 False로 판단됩니다.', '수집할 때마다 `world.objects`의 길이가 줄어듭니다.'],
    }),
    createAlphaMission({
      id: 'while-countdown-04', order: 4, title: '발사 카운트다운', objective: '3부터 1까지 출력한 뒤 LAUNCH를 출력하세요.',
      briefing: '발사 시퀀스는 카운터가 0이 될 때까지 정확히 반복되어야 합니다.', concepts: ['while', '카운터', 'print'],
      starterCode: ['count = 3', '', '# while로 카운트다운하세요.', '', 'print("LAUNCH")'], world: { target: { x: 1, y: 2 } }, goal: { type: 'stdoutIncludes', value: 'LAUNCH' }, mustUse: ['while'],
      hints: ['반복 안에서 `count -= 1`로 값을 바꾸세요.', '`while count > 0:`을 사용합니다.'], api: [],
    }),
    createAlphaMission({
      id: 'while-energy-05', order: 5, title: '에너지 제한 순찰', objective: '에너지가 남고 비콘에 도착하지 않은 동안만 이동하세요.',
      briefing: '조건 두 개를 동시에 감시해야 루미가 멈추지 않고 안전하게 도착합니다.', concepts: ['while', 'and', '안전 조건'],
      starterCode: ['from msense import lumi, world', '', '# 에너지와 거리를 함께 검사하세요.'], goal: { type: 'position', x: 6, y: 2 }, mustUse: ['while'], mustCall: ['lumi.move'],
      hints: ['`lumi.energy > 0 and world.target_distance > 0`을 사용하세요.', '한 번에 한 칸씩 이동하면 상태를 관찰하기 쉽습니다.'], hiddenVariants: [{ id: 'short-energy', target: { x: 5, y: 2 }, world: { rover: { energy: 5 } } }],
    }),
    createAlphaMission({
      id: 'while-rescue-06', order: 6, title: '지속 탐사 구조선', objective: '신호를 모두 회수하고 비콘까지 이동하는 두 while 루프를 완성하세요.',
      briefing: '수집 조건과 항법 조건을 분리해 지속 탐사 프로토콜을 완성합니다.', concepts: ['while', '다중 루프', '자동화'],
      starterCode: ['from msense import lumi, world', '', '# 신호가 남은 동안 수집', '', '# 비콘에 도착할 때까지 이동'], world: { objects: [{ id: 's1', kind: 'signal', x: 1, y: 2 }, { id: 's2', kind: 'signal', x: 1, y: 2 }] }, goals: [{ type: 'allSignalsCollected' }, { type: 'position', x: 6, y: 2 }], mustUse: ['while'], mustCall: ['lumi.collect', 'lumi.move'], api: [...NAV_API, ...SENSOR_API],
      hints: ['먼저 `while world.objects:`를 끝내세요.', '두 번째 루프는 `world.target_distance`를 조건으로 사용합니다.'], hiddenVariants: [{ id: 'far-rescue', target: { x: 8, y: 2 } }],
    }),
  ],
})

export const FUNCTION_MISSION_SET = Object.freeze({
  id: 'lumi-function-module-v1', version: 1, title: '함수 모듈 프로토콜',
  description: '반복 가능한 행동을 함수로 묶어 루미의 능력 모듈을 만듭니다.',
  protocol: { id: 'function-module', name: '함수 모듈 프로토콜', level: 1 },
  missions: [
    createAlphaMission({
      id: 'function-move-01', order: 1, title: '첫 항법 함수', objective: '`move_to_beacon` 함수를 만들고 호출하세요.', briefing: '검증된 항법 코드를 이름 있는 모듈로 포장합니다.', concepts: ['def', '함수 호출'],
      starterCode: ['from msense import lumi, world', '', 'def move_to_beacon():', '    lumi.move(world.target_distance)', '', 'move_to_beacon()'], goal: { type: 'position', x: 6, y: 2 }, mustUse: ['function'], mustCall: ['lumi.move'],
      hints: ['함수 본문은 네 칸 들여씁니다.', '함수를 만든 뒤 마지막 줄에서 호출해야 실행됩니다.'], hiddenVariants: [{ id: 'near', target: { x: 4, y: 2 } }],
    }),
    createAlphaMission({
      id: 'function-parameter-02', order: 2, title: '거리 매개변수', objective: '거리 값을 받는 `travel(distance)` 함수를 작성하세요.', briefing: '고정된 거리 대신 외부에서 받은 값을 사용하는 재사용 가능한 항법 모듈이 필요합니다.', concepts: ['def', '매개변수'],
      starterCode: ['from msense import lumi, world', '', 'def travel(distance):', '    # 전달받은 거리만큼 이동', '', 'travel(world.target_distance)'], goal: { type: 'position', x: 6, y: 2 }, mustUse: ['function'], mustCall: ['lumi.move'],
      hints: ['함수 안에서는 `distance` 이름을 그대로 사용할 수 있습니다.', '`lumi.move(distance)`를 함수 본문에 넣으세요.'], hiddenVariants: [{ id: 'far', target: { x: 8, y: 2 } }],
    }),
    createAlphaMission({
      id: 'function-return-03', order: 3, title: '센서 판정 반환', objective: '에너지가 30 이상인지 반환하는 함수를 만들고 SAFE를 출력하세요.', briefing: '함수는 행동뿐 아니라 판단 결과도 돌려줄 수 있습니다.', concepts: ['def', 'return', 'Boolean'],
      starterCode: ['from msense import lumi', '', 'def is_safe():', '    # Boolean 값을 반환하세요.', '', 'if is_safe():', '    print("SAFE")'], world: { target: { x: 1, y: 2 } }, goal: { type: 'stdoutIncludes', value: 'SAFE' }, mustUse: ['function', 'return', 'if', 'comparison'],
      hints: ['`return lumi.energy >= 30`을 사용하세요.', 'return 뒤의 값이 함수 호출 결과가 됩니다.'], api: SENSOR_API,
    }),
    createAlphaMission({
      id: 'function-collect-04', order: 4, title: '구조 신호 필터 함수', objective: '신호를 받아 priority가 3 이상이면 수집하는 함수를 만드세요.', briefing: '신호 판정 규칙을 함수로 분리해 관제 코드의 의미를 선명하게 만듭니다.', concepts: ['def', '매개변수', 'if'],
      starterCode: ['from msense import lumi', '', 'def rescue(signal):', '    # 우선순위가 높은 신호만 수집', '', 'for signal in lumi.scan():', '    rescue(signal)'], world: { target: { x: 1, y: 2 }, objects: [{ id: 'low', kind: 'signal', x: 1, y: 2, priority: 1 }, { id: 'high', kind: 'signal', x: 1, y: 2, priority: 4 }] }, goal: { type: 'collectedIncludes', id: 'high' }, mustUse: ['function', 'if', 'for', 'comparison'], mustCall: ['lumi.scan', 'lumi.collect'], api: SENSOR_API,
      hints: ['함수 안에서 `signal.priority`를 확인하세요.', '`if signal.priority >= 3:` 아래에서 수집합니다.'],
    }),
    createAlphaMission({
      id: 'function-charge-05', order: 5, title: '에너지 보정 모듈', objective: '필요할 때만 충전하는 `ensure_energy(required)` 함수를 작성하세요.', briefing: '다른 임무에서도 재사용할 수 있는 에너지 안전 모듈을 만듭니다.', concepts: ['def', 'if', '매개변수'],
      starterCode: ['from msense import lumi, world', '', 'def ensure_energy(required):', '    # 에너지가 부족하면 충전', '', 'distance = world.target_distance', 'ensure_energy(distance)', 'lumi.move(distance)'], world: { rover: { x: 1, y: 2, direction: 0, energy: 3, maxEnergy: 100 }, objects: [{ id: 'station', kind: 'charge', x: 1, y: 2 }] }, goal: { type: 'position', x: 6, y: 2 }, mustUse: ['function', 'if', 'comparison'], mustCall: ['lumi.charge', 'lumi.move'], api: [...NAV_API, ...SENSOR_API],
      hints: ['`required`와 `lumi.energy`를 비교하세요.', '부족한 경우에만 `lumi.charge()`를 호출합니다.'], hiddenVariants: [{ id: 'critical', target: { x: 7, y: 2 }, world: { rover: { energy: 1 } } }],
    }),
    createAlphaMission({
      id: 'function-expedition-06', order: 6, title: '자율 원정 모듈', objective: '충전·구조·항법을 각각 함수로 나누어 원정을 완료하세요.', briefing: '하나의 긴 코드 대신 역할이 분명한 세 개의 프로토콜 함수로 최종 원정을 설계합니다.', concepts: ['def', 'if', 'for', '모듈화'],
      starterCode: ['from msense import lumi, world', '', 'def prepare():', '    pass', '', 'def rescue():', '    pass', '', 'def navigate():', '    pass', '', 'prepare()', 'rescue()', 'navigate()'], world: { rover: { x: 1, y: 2, direction: 0, energy: 2, maxEnergy: 100 }, objects: [{ id: 'station', kind: 'charge', x: 1, y: 2 }, { id: 'rescue', kind: 'signal', x: 1, y: 2, priority: 5 }] }, goals: [{ type: 'collectedCount', count: 1 }, { type: 'position', x: 6, y: 2 }], mustUse: ['function', 'if', 'for', 'comparison'], mustCall: ['lumi.charge', 'lumi.scan', 'lumi.collect', 'lumi.move'], api: [...NAV_API, ...SENSOR_API],
      hints: ['prepare는 에너지를, rescue는 신호를, navigate는 거리를 담당합니다.', '각 함수를 한 가지 책임만 갖도록 완성하세요.'], hiddenVariants: [{ id: 'long-expedition', target: { x: 8, y: 2 }, world: { rover: { energy: 1 } } }],
    }),
  ],
})

const BUILTIN_MISSION_SETS = Object.freeze({
  [LOOP_MISSION_SET_ID]: LOOP_MISSION_SET,
  [IF_MISSION_SET.id]: IF_MISSION_SET,
  [WHILE_MISSION_SET.id]: WHILE_MISSION_SET,
  [FUNCTION_MISSION_SET.id]: FUNCTION_MISSION_SET,
})

function normalizeClusterId(clusterId = '') {
  return String(clusterId || '').trim().toLowerCase()
}

function isPythonCluster(clusterId = '') {
  const normalized = normalizeClusterId(clusterId)
  return normalized === 'python' || normalized === '파이썬'
}

function isLoopUnit(unit = {}) {
  const searchable = `${unit?.title || ''} ${unit?.subtitle || ''} ${unit?.description || ''}`
  return /for\s*반복|for\s*문|반복문/i.test(searchable)
}

function getBuiltinSetByUnit(unit = {}) {
  const searchable = `${unit?.id || unit?.docId || ''} ${unit?.title || ''} ${unit?.subtitle || ''} ${unit?.description || ''}`
  if (/if\s*조건|if\s*문|조건문/i.test(searchable)) return IF_MISSION_SET
  if (/while\s*문|while\s*반복/i.test(searchable)) return WHILE_MISSION_SET
  if (/unit_py_math_17|^\s*함수\s*$/i.test(searchable)) return FUNCTION_MISSION_SET
  if (isLoopUnit(unit)) return LOOP_MISSION_SET
  return null
}

export function getPythonMissionSetForUnit(unit, clusterId = '') {
  if (!unit) return null
  if (clusterId && !isPythonCluster(clusterId)) return null
  if (unit?.contentFlags?.hasMissionLab === false) return null

  if (unit.pythonMissionSet && Array.isArray(unit.pythonMissionSet.missions)) {
    return unit.pythonMissionSet
  }

  const requestedSetId = unit.pythonMissionSetId || unit?.missionLab?.setId
  if (requestedSetId && BUILTIN_MISSION_SETS[requestedSetId]) {
    return BUILTIN_MISSION_SETS[requestedSetId]
  }

  return getBuiltinSetByUnit(unit)
}

export function hasPythonMissionSetForUnit(unit, clusterId = '') {
  if (!unit || (clusterId && !isPythonCluster(clusterId))) return false
  if (unit?.contentFlags?.hasMissionLab === false) return false
  return !!(unit.pythonMissionSetId || unit?.missionLab?.setId || getBuiltinSetByUnit(unit))
}

export function getBuiltinPythonMissionSets() {
  return Object.values(BUILTIN_MISSION_SETS)
}

export const PYTHON_PROTOCOL_ENTRY_UNITS = Object.freeze([
  { unitId: 'unit_py_math_10', setId: LOOP_MISSION_SET_ID, title: '반복 자동화', concept: 'for · range', icon: '↻', color: '#49e9ff' },
  { unitId: 'unit_py_math_15', setId: IF_MISSION_SET.id, title: '에너지 판단', concept: 'if · Boolean', icon: '◇', color: '#55f1c8' },
  { unitId: 'unit_py_math_27', setId: WHILE_MISSION_SET.id, title: '지속 센서', concept: 'while · state', icon: '∞', color: '#8aa8ff' },
  { unitId: 'unit_py_math_17', setId: FUNCTION_MISSION_SET.id, title: '함수 모듈', concept: 'def · return', icon: 'ƒ', color: '#bd8cff' },
])

export function isMissionLabRequired(unit = {}) {
  const required = unit?.completionPolicy?.requiredModalities
  if (Array.isArray(required)) return required.includes('missionLab')
  return unit?.completionPolicy?.requireMissionLab === true
}

export function getMissionVariant(mission, variant) {
  if (!mission || !variant) return mission
  const worldOverrides = variant.world || {}
  const target = variant.target || worldOverrides.target
  const baseGoals = Array.isArray(mission.goals) ? mission.goals : null
  let nextGoal = mission.goal
  let nextGoals = baseGoals

  if (Array.isArray(variant.goals)) {
    nextGoals = variant.goals
  } else if (variant.goal) {
    if (baseGoals?.length) {
      nextGoals = [{ ...baseGoals[0], ...variant.goal }, ...baseGoals.slice(1)]
    } else {
      nextGoal = { ...(mission.goal || {}), ...variant.goal }
    }
  } else if (target) {
    if (baseGoals?.length) {
      nextGoals = baseGoals.map((goal) => goal?.type === 'position'
        ? { ...goal, x: target.x, y: target.y }
        : goal)
    } else if (mission.goal) {
      nextGoal = { ...mission.goal, x: target.x, y: target.y }
    }
  }

  return {
    ...mission,
    world: {
      ...mission.world,
      ...worldOverrides,
      rover: { ...mission.world?.rover, ...worldOverrides.rover },
      target: { ...mission.world?.target, ...(target || {}) },
      objects: worldOverrides.objects || mission.world?.objects,
      data: {
        ...(mission.world?.data || {}),
        ...(worldOverrides.data || {}),
      },
    },
    goal: nextGoal,
    goals: nextGoals,
  }
}

export function getAllPythonMissionSets() {
  return Object.values(BUILTIN_MISSION_SETS)
}

export {
  LOOP_MISSION_SET_ID,
}
