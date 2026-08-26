const BASE_WORLD = Object.freeze({
  width: 8,
  height: 5,
  scene: 'data',
  rover: { x: 1, y: 2, direction: 0, energy: 100, awake: true },
  target: false,
  obstacles: [],
  objects: [],
  data: {
    signals: ['ALPHA', 'BETA', 'GAMMA'],
    inventoryItems: ['crystal', 'shield', 'laser'],
    batteryCells: ['cell1', 'cell2', 'cell3'],
    dataPacket: 'ENERGY:90|SHIELD:5|STATUS:SAFE',
    statusData: { name: 'LUMI', energy: 80, shield: 5 },
  },
})

const DATA_API = Object.freeze([
  { signature: 'world.signals', description: '관제소가 보낸 신호 목록(list)을 반환합니다.' },
  { signature: 'world.inventory_items', description: '탐사선에 적재된 기본 자원 목록(list)을 반환합니다.' },
  { signature: 'world.battery_cells', description: '장착된 에너지 셀 목록(list)을 반환합니다.' },
  { signature: 'world.data_packet', description: '원격 통신으로 수신된 압축 텔레메트리 패킷 문자열(str)을 반환합니다.' },
  { signature: 'world.status_data', description: '탐사선 상태 정보가 담긴 사전(dict)을 반환합니다.' },
  { signature: 'world.target_pos', description: '목표 지점의 불변 (x, y) 좌표 튜플(tuple)을 반환합니다.' },
  { signature: 'list[index]', description: '0부터 시작하는 인덱스 번호로 특정 항목을 조회합니다.' },
  { signature: 'list.append(item)', description: '리스트의 가장 끝에 새로운 항목을 추가합니다.' },
  { signature: 'list.pop()', description: '리스트의 마지막 항목을 꺼내어 제거하고 반환합니다.' },
  { signature: 'str.split(sep)', description: '구분자(sep)를 기준으로 문자열을 쪼개어 리스트로 만듭니다.' },
  { signature: 'sep.join(list)', description: '리스트의 문자열들을 구분자(sep)로 연결해 하나의 문자열을 만듭니다.' },
])

function dataMission({
  id, codeName, order, aliases = [], title, objective, briefing, concepts,
  pygameBridgeKey, world = {}, goals, mustUse = [], mustCall = [],
  hints = [], learningSteps = [], hiddenVariants = [],
}) {
  return {
    id,
    codeName,
    actId: 'act-7-data',
    order,
    aliases,
    difficulty: order === 1 ? 'calibration' : order === 10 ? 'field-test' : 'core',
    title,
    eyebrow: `ACT 7 · DATA CORE · ${order}/10`,
    objective,
    briefing,
    concepts,
    pygameBridgeKey,
    api: DATA_API,
    starterCode: [
      '# [ACT 7 · DATA CORE 데이터 지시서]',
      `# 임무: ${title}`,
      `# 이번에 사용할 개념: ${concepts.join(' · ')}`,
      '# 아래 빈 줄부터 알맞은 자료 구조와 처리를 직접 작성하세요.',
      '',
    ].join('\n'),
    learningSteps,
    memoryFragment: {
      label: '데이터 구조 스키마',
      code: 'signals = world.signals\nitems.append("radar")\npos = world.target_pos\nstatus = world.status_data',
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
      data: { ...BASE_WORLD.data, ...(world.data || {}) },
    },
    goals,
    conceptEvidence: { mustUse, mustCall },
    hints,
    hiddenVariants,
    rewardPolicy: 'standard-crystals',
  }
}

export const LUMI_DATA_CORE_MISSIONS = [
  dataMission({
    id: 'lumi-data-7-01',
    codeName: '7-1',
    order: 1,
    aliases: ['lumi-act7-01', '7-1'],
    title: '신호 목록 만들기 (list)',
    objective: 'world.signals 목록을 signals 변수에 저장하고 len()으로 신호 개수를 출력하세요.',
    briefing: '여러 데이터를 순서대로 보관하는 첫 번째 컨테이너 list를 다룹니다. 관제소 신호 목록을 받아 len(signals)로 전체 개수를 확인하세요.',
    concepts: ['list', 'len', 'world.signals'],
    pygameBridgeKey: 'data-list',
    learningSteps: [
      'from msense import world 로 월드를 불러옵니다.',
      'signals = world.signals 로 신호 리스트를 변수에 저장합니다.',
      'print(len(signals)) 로 신호의 개수를 출력합니다.',
    ],
    world: {
      data: { signals: ['ALPHA', 'BETA', 'GAMMA'] },
    },
    goals: [
      { type: 'variableListEquals', name: 'signals', value: ['ALPHA', 'BETA', 'GAMMA'], label: '신호 리스트 변수 저장' },
      { type: 'stdoutIncludes', value: '3', label: '신호 개수 3 출력' },
    ],
    mustCall: ['len', 'print'],
    hints: [
      { level: 1, type: 'context', text: '`signals = world.signals`로 관제소 신호 리스트를 받습니다.' },
      { level: 2, type: 'concept', text: '`print(len(signals))`로 리스트 길이를 계산해 출력하세요.' },
    ],
    hiddenVariants: [
      {
        id: 'four-signals',
        world: {
          data: { signals: ['SIG1', 'SIG2', 'SIG3', 'SIG4'] },
        },
        goals: [
          { type: 'variableListEquals', name: 'signals', value: ['SIG1', 'SIG2', 'SIG3', 'SIG4'], label: '가변 신호 4개 리스트 저장' },
          { type: 'stdoutIncludes', value: '4', label: '신호 개수 4 출력' },
        ],
      },
    ],
  }),

  dataMission({
    id: 'lumi-data-7-02',
    codeName: '7-2',
    order: 2,
    aliases: ['lumi-act7-02', '7-2'],
    title: '인벤토리 슬롯 조회 (인덱싱)',
    objective: 'world.inventory_items에서 첫 번째(0번)와 마지막(-1번) 아이템을 꺼내 first_item, last_item 변수에 저장하고 각각 출력하세요.',
    briefing: '파이썬 리스트의 첫 번째 항목은 인덱스 0, 가장 마지막 항목은 음수 인덱스 -1로 조회합니다. first_item, last_item 변수에 담아 출력하세요.',
    concepts: ['list', '인덱싱', 'subscript'],
    pygameBridgeKey: 'data-index',
    learningSteps: [
      'items = world.inventory_items 로 자원 목록을 받습니다.',
      'first_item = items[0] 으로 첫 번째 아이템을 저장합니다.',
      'last_item = items[-1] 로 마지막 아이템을 저장합니다.',
      'print(first_item) 과 print(last_item) 을 실행합니다.',
    ],
    world: {
      data: { inventoryItems: ['crystal', 'shield', 'laser'] },
    },
    goals: [
      { type: 'variableValueEquals', name: 'first_item', value: 'crystal', label: '첫 번째 아이템(crystal) 저장' },
      { type: 'variableValueEquals', name: 'last_item', value: 'laser', label: '마지막 아이템(laser) 저장' },
      { type: 'stdoutIncludes', value: 'crystal', label: 'crystal 출력' },
      { type: 'stdoutIncludes', value: 'laser', label: 'laser 출력' },
    ],
    mustUse: ['subscript'],
    mustCall: ['print'],
    hints: [
      { level: 1, type: 'context', text: '첫 번째는 `items[0]`, 마지막은 `items[-1]` 인덱스를 사용합니다.' },
      { level: 2, type: 'concept', text: '`first_item = items[0]`, `last_item = items[-1]`을 각각 선언 후 출력하세요.' },
    ],
    hiddenVariants: [
      {
        id: 'four-items',
        world: {
          data: { inventoryItems: ['battery', 'core', 'sensor', 'plasma'] },
        },
        goals: [
          { type: 'variableValueEquals', name: 'first_item', value: 'battery', label: '가변 첫 아이템(battery) 저장' },
          { type: 'variableValueEquals', name: 'last_item', value: 'plasma', label: '가변 마지막 아이템(plasma) 저장' },
          { type: 'stdoutIncludes', value: 'battery', label: 'battery 출력' },
          { type: 'stdoutIncludes', value: 'plasma', label: 'plasma 출력' },
        ],
      },
    ],
  }),

  dataMission({
    id: 'lumi-data-7-03',
    codeName: '7-3',
    order: 3,
    aliases: ['lumi-act7-03', '7-3'],
    title: '자원 목록 추가 (append)',
    objective: 'world.inventory_items 리스트에 append()로 "radar"를 추가하고 전체 목록과 길이를 확인하세요.',
    briefing: '탐사 중 새로운 장비를 발견하면 `items.append("radar")`로 리스트 맨 뒤에 새 아이템을 장착합니다.',
    concepts: ['list', 'append', '동적 목록'],
    pygameBridgeKey: 'data-methods',
    learningSteps: [
      'items = world.inventory_items 로 기존 목록을 받습니다.',
      'items.append("radar") 로 새 장비를 추가합니다.',
      'print(len(items)) 로 늘어난 개수를 출력합니다.',
    ],
    world: {
      data: { inventoryItems: ['crystal', 'shield'] },
    },
    goals: [
      { type: 'variableListEquals', name: 'items', value: ['crystal', 'shield', 'radar'], label: 'radar 추가 완료된 리스트' },
      { type: 'stdoutIncludes', value: '3', label: '길이 3 출력' },
    ],
    mustCall: ['append', 'len', 'print'],
    hints: [
      { level: 1, type: 'context', text: '`items.append("radar")`는 리스트 끝에 항목을 덧붙입니다.' },
      { level: 2, type: 'concept', text: 'append 후 `print(len(items))`로 늘어난 길이를 확인하세요.' },
    ],
    hiddenVariants: [
      {
        id: 'four-items-append',
        world: {
          data: { inventoryItems: ['battery', 'shield', 'scanner', 'map'] },
        },
        goals: [
          { type: 'variableListEquals', name: 'items', value: ['battery', 'shield', 'scanner', 'map', 'radar'], label: '가변 목록에 radar 추가 완성' },
          { type: 'stdoutIncludes', value: '5', label: '길이 5 출력' },
        ],
      },
    ],
  }),

  dataMission({
    id: 'lumi-data-7-04',
    codeName: '7-4',
    order: 4,
    aliases: ['lumi-act7-04', '7-4'],
    title: '자원 소모와 추출 (pop)',
    objective: 'world.battery_cells 리스트에서 pop()으로 마지막 에너지 셀을 꺼내 used 변수에 저장하고 used를 출력하세요.',
    briefing: '장비를 사용하거나 자원을 소모할 때는 `pop()` 메서드로 리스트의 마지막 항목을 꺼내어 사용하고 목록에서 제거합니다.',
    concepts: ['list', 'pop', '추출'],
    pygameBridgeKey: 'data-methods',
    learningSteps: [
      'cells = world.battery_cells 로 배터리 목록을 받습니다.',
      'used = cells.pop() 으로 마지막 셀을 꺼냅니다.',
      'print(used) 로 사용된 셀의 이름을 출력합니다.',
    ],
    world: {
      data: { batteryCells: ['cell1', 'cell2', 'cell3'] },
    },
    goals: [
      { type: 'variableValueEquals', name: 'used', value: 'cell3', label: '마지막 셀 cell3 추출' },
      { type: 'variableListLength', name: 'cells', length: 2, exact: true, label: '남은 배터리 2개 확인' },
      { type: 'variableListEquals', name: 'cells', value: ['cell1', 'cell2'], label: '남은 배터리 목록 확인' },
      { type: 'stdoutIncludes', value: 'cell3', label: '추출된 셀 출력' },
    ],
    mustCall: ['pop', 'print'],
    hints: [
      { level: 1, type: 'context', text: '`cells.pop()`은 마지막 값을 꺼내어 돌려줍니다.' },
      { level: 2, type: 'concept', text: '`used = cells.pop()` 후 `print(used)`를 실행하세요.' },
    ],
    hiddenVariants: [
      {
        id: 'omega-cell-pop',
        world: {
          data: { batteryCells: ['cell1', 'cell2', 'cell3', 'omega_cell'] },
        },
        goals: [
          { type: 'variableValueEquals', name: 'used', value: 'omega_cell', label: '가변 마지막 셀 omega_cell 추출' },
          { type: 'variableListLength', name: 'cells', length: 3, exact: true, label: '남은 배터리 3개 확인' },
          { type: 'variableListEquals', name: 'cells', value: ['cell1', 'cell2', 'cell3'], label: '남은 배터리 목록 확인' },
          { type: 'stdoutIncludes', value: 'omega_cell', label: '추출된 omega_cell 출력' },
        ],
      },
    ],
  }),

  dataMission({
    id: 'lumi-data-7-05',
    codeName: '7-5',
    order: 5,
    aliases: ['lumi-act7-05', '7-5'],
    title: '인벤토리 전체 순회',
    objective: 'world.inventory_items 리스트의 모든 요소를 for 루프로 순회하며 하나씩 출력하세요.',
    briefing: '리스트는 for 문과 결합할 때 강력해집니다. `for item in items:` 구문으로 인벤토리 안의 모든 자원을 순서대로 검사하세요.',
    concepts: ['list', 'for', '순회'],
    pygameBridgeKey: 'data-list',
    learningSteps: [
      'items = world.inventory_items 로 자원 목록을 받습니다.',
      'for item in items: 반복문 안에서 print(item)을 실행합니다.',
    ],
    world: {
      data: { inventoryItems: ['crystal', 'core', 'beacon'] },
    },
    goals: [
      { type: 'printedSequence', sequence: ['crystal', 'core', 'beacon'], label: 'crystal, core, beacon 순서대로 한 줄씩 출력' },
    ],
    mustUse: ['for'],
    mustCall: ['print'],
    hints: [
      { level: 1, type: 'context', text: '`for item in items:`는 리스트 안의 각 요소를 차례로 변수에 담습니다.' },
      { level: 2, type: 'concept', text: '루프 안에서 `print(item)`을 들여써서 작성하세요.' },
    ],
    hiddenVariants: [
      {
        id: 'four-items-iteration',
        world: {
          data: { inventoryItems: ['alpha_gem', 'beta_flux', 'gamma_node', 'delta_key'] },
        },
        goals: [
          { type: 'printedSequence', sequence: ['alpha_gem', 'beta_flux', 'gamma_node', 'delta_key'], label: '가변 4개 아이템 순서대로 한 줄씩 출력' },
        ],
      },
    ],
  }),

  dataMission({
    id: 'lumi-data-7-06',
    codeName: '7-6',
    order: 6,
    aliases: ['lumi-act7-06', '7-6'],
    title: '패킷 분리 (split)',
    objective: 'world.data_packet 문자열을 split("|")로 나누어 signals 리스트에 저장하고 길이를 출력하세요.',
    briefing: '원격 관제소에서 한 줄로 압축되어 도착한 문자열 데이터를 `packet.split("|")`로 분리하여 다루기 쉬운 리스트로 해독합니다.',
    concepts: ['문자열', 'split', 'list'],
    pygameBridgeKey: 'data-string',
    learningSteps: [
      'packet = world.data_packet 으로 통신 패킷을 받습니다.',
      'signals = packet.split("|") 로 분리합니다.',
      'print(len(signals)) 로 분리된 신호 개수를 출력합니다.',
    ],
    world: {
      data: { dataPacket: 'ALPHA|BETA|GAMMA' },
    },
    goals: [
      { type: 'variableListEquals', name: 'signals', value: ['ALPHA', 'BETA', 'GAMMA'], label: '패킷 분리 리스트 생성' },
      { type: 'stdoutIncludes', value: '3', label: '길이 3 출력' },
    ],
    mustCall: ['split', 'len', 'print'],
    hints: [
      { level: 1, type: 'context', text: '문자열의 `.split("|")` 메서드는 구분자로 나뉜 문자열들의 리스트를 반환합니다.' },
      { level: 2, type: 'concept', text: '`signals = packet.split("|")` 작성 후 길이를 출력하세요.' },
    ],
    hiddenVariants: [
      {
        id: 'five-signals-packet',
        world: {
          data: { dataPacket: 'NORTH|SOUTH|EAST|WEST|CENTER' },
        },
        goals: [
          { type: 'variableListEquals', name: 'signals', value: ['NORTH', 'SOUTH', 'EAST', 'WEST', 'CENTER'], label: '가변 5개 패킷 분리 리스트 생성' },
          { type: 'stdoutIncludes', value: '5', label: '길이 5 출력' },
        ],
      },
    ],
  }),

  dataMission({
    id: 'lumi-data-7-07',
    codeName: '7-7',
    order: 7,
    aliases: ['lumi-act7-07', '7-7'],
    title: '신호 재조립 (join)',
    objective: 'world.signals 리스트의 요소들을 "-" 구분자로 결합하여 message 문자열을 만들고 출력하세요.',
    briefing: '나뉜 데이터 조각들을 다시 하나의 패킷으로 묶어 송신할 때는 `"-".join(signals)`를 사용하여 단일 문자열로 조립합니다.',
    concepts: ['list', 'join', '문자열'],
    pygameBridgeKey: 'data-string',
    learningSteps: [
      'signals = world.signals 로 신호 리스트를 받습니다.',
      'message = "-".join(signals) 로 연결합니다.',
      'print(message) 로 조립된 패킷을 출력합니다.',
    ],
    world: {
      data: { signals: ['ALPHA', 'BETA', 'GAMMA'] },
    },
    goals: [
      { type: 'variableValueEquals', name: 'message', value: 'ALPHA-BETA-GAMMA', label: '패킷 조립 완성' },
      { type: 'stdoutIncludes', value: 'ALPHA-BETA-GAMMA', label: '조립 문자열 출력' },
    ],
    mustCall: ['join', 'print'],
    hints: [
      { level: 1, type: 'context', text: '구분자 문자열 `"-"` 뒤에 `.join(signals)`를 호출합니다.' },
      { level: 2, type: 'concept', text: '`message = "-".join(signals)` 작성 후 출력하세요.' },
    ],
    hiddenVariants: [
      {
        id: 'nav-join-packet',
        world: {
          data: { signals: ['LUMI', 'NAV', 'ONLINE'] },
        },
        goals: [
          { type: 'variableValueEquals', name: 'message', value: 'LUMI-NAV-ONLINE', label: '가변 신호 조립 완성' },
          { type: 'stdoutIncludes', value: 'LUMI-NAV-ONLINE', label: 'LUMI-NAV-ONLINE 출력' },
        ],
      },
    ],
  }),

  dataMission({
    id: 'lumi-data-7-08',
    codeName: '7-8',
    order: 8,
    aliases: ['lumi-act7-08', '7-8'],
    title: '불변 위치 좌표 (tuple)',
    objective: 'world.target_pos로 목표 비콘의 불변 좌표 튜플을 받아 target_pos 변수에 저장하고 출력하세요.',
    briefing: '위치 좌표나 해상도처럼 한 쌍으로 묶여 실행 중 임의로 수정되면 안 되는 데이터는 tuple로 보호합니다. world.target_pos를 읽어 출력하세요.',
    concepts: ['tuple', '불변 데이터', '좌표'],
    pygameBridgeKey: 'data-tuple',
    learningSteps: [
      'target_pos = world.target_pos 로 좌표 튜플을 받습니다.',
      'print(target_pos) 로 저장된 좌표 쌍을 출력합니다.',
    ],
    world: {
      target: { x: 4, y: 2, kind: 'sos', label: '좌표 비콘' },
    },
    goals: [
      { type: 'variableTupleEquals', name: 'target_pos', value: [4, 2], label: '좌표 튜플 (4, 2) 저장' },
      { type: 'stdoutIncludes', value: '(4, 2)', label: '(4, 2) 출력' },
    ],
    mustCall: ['print'],
    hints: [
      { level: 1, type: 'context', text: '`target_pos = world.target_pos`로 불변 좌표를 받습니다.' },
      { level: 2, type: 'concept', text: '`target_pos = world.target_pos` 작성 후 출력하세요.' },
    ],
    hiddenVariants: [
      {
        id: 'deep-target-pos',
        world: {
          target: { x: 7, y: 3 },
        },
        goals: [
          { type: 'variableTupleEquals', name: 'target_pos', value: [7, 3], label: '가변 좌표 튜플 (7, 3) 저장' },
          { type: 'stdoutIncludes', value: '(7, 3)', label: '(7, 3) 출력' },
        ],
      },
    ],
  }),

  dataMission({
    id: 'lumi-data-7-09',
    codeName: '7-9',
    order: 9,
    aliases: ['lumi-act7-09', '7-9'],
    title: '탐사선 상태 사전 (dict)',
    objective: 'world.status_data 사전을 stats 변수에 저장하고, stats["energy"] 값을 출력하세요.',
    briefing: '사전(dict)은 이름표(Key)와 값(Value)으로 상태를 관리합니다. `stats["energy"]`로 원하는 상태를 직관적으로 조회하세요.',
    concepts: ['dict', 'key-value', 'subscript'],
    pygameBridgeKey: 'data-dict',
    learningSteps: [
      'stats = world.status_data 로 상태 사전을 받습니다.',
      'energy_val = stats["energy"] 로 에너지를 꺼냅니다.',
      'print(energy_val) 로 에너지 값을 출력합니다.',
    ],
    world: {
      data: { statusData: { name: 'LUMI', energy: 80, shield: 5 } },
    },
    goals: [
      { type: 'variableDictEquals', name: 'stats', value: { name: 'LUMI', energy: 80, shield: 5 }, label: '탐사선 상태 사전 저장' },
      { type: 'stdoutIncludes', value: '80', label: '80 출력' },
    ],
    mustUse: ['subscript'],
    mustCall: ['print'],
    hints: [
      { level: 1, type: 'context', text: '사전의 특정 값은 `stats["키이름"]`으로 조회합니다.' },
      { level: 2, type: 'concept', text: '`stats = world.status_data` 작성 후 `print(stats["energy"])`를 실행하세요.' },
    ],
    hiddenVariants: [
      {
        id: 'critical-status-dict',
        world: {
          data: { statusData: { name: 'LUMI', energy: 42, shield: 9 } },
        },
        goals: [
          { type: 'variableDictEquals', name: 'stats', value: { name: 'LUMI', energy: 42, shield: 9 }, label: '가변 상태 사전 저장' },
          { type: 'stdoutIncludes', value: '42', label: 'energy 42 출력' },
        ],
      },
    ],
  }),

  dataMission({
    id: 'lumi-data-7-10',
    codeName: '7-F',
    order: 10,
    aliases: ['lumi-act7-10', '7-F'],
    title: '원격 텔레메트리 파싱 시스템',
    objective: 'world.data_packet 문자열을 split으로 파싱하여 telemetry 사전에 저장하고, telemetry["STATUS"] 값을 출력하세요.',
    briefing: 'FINAL DATA TEST입니다. "ENERGY:90|SHIELD:5|STATUS:SAFE" 형태의 패킷을 split("|") 및 split(":")으로 분리해 사전에 조립하고 STATUS 값을 출력하세요.',
    concepts: ['split', 'dict', 'for', 'subscript'],
    pygameBridgeKey: 'data-dict',
    learningSteps: [
      'raw_packet = world.data_packet 으로 통신 패킷을 받습니다.',
      'pairs = raw_packet.split("|") 로 항목을 분리합니다.',
      'telemetry = {} 사전을 선언하고, for pair in pairs: 안에서 pair.split(":")으로 키와 값을 분리해 저장합니다.',
      'print(telemetry["STATUS"]) 로 최종 상태를 출력합니다.',
    ],
    world: {
      data: { dataPacket: 'ENERGY:90|SHIELD:5|STATUS:SAFE' },
    },
    goals: [
      { type: 'variableDictEquals', name: 'telemetry', value: { ENERGY: '90', SHIELD: '5', STATUS: 'SAFE' }, label: '텔레메트리 사전 파싱 완성' },
      { type: 'stdoutIncludes', value: 'SAFE', label: 'STATUS 값 SAFE 출력' },
    ],
    mustUse: ['for', 'subscript'],
    mustCall: ['split', 'print'],
    hints: [
      { level: 1, type: 'context', text: '1. split("|")로 쪼갠 뒤 -> 2. for 루프로 각 "KEY:VAL"을 순회하며 split(":")으로 분리합니다.' },
      { level: 2, type: 'concept', text: '`for pair in pairs: k, v = pair.split(":"); telemetry[k] = v` 형태로 사전을 채우고 `telemetry["STATUS"]`를 출력하세요.' },
    ],
    hiddenVariants: [
      {
        id: 'danger-packet-parse',
        world: {
          data: { dataPacket: 'ENERGY:15|SHIELD:0|STATUS:DANGER' },
        },
        goals: [
          { type: 'variableDictEquals', name: 'telemetry', value: { ENERGY: '15', SHIELD: '0', STATUS: 'DANGER' }, label: '가변 DANGER 패킷 사전 파싱' },
          { type: 'stdoutIncludes', value: 'DANGER', label: 'STATUS 값 DANGER 출력' },
        ],
      },
    ],
  }),
]

export const LUMI_DATA_CORE_SET = Object.freeze({
  id: 'lumi-act-7-data-v1',
  version: 1,
  kind: 'course-act',
  actId: 'act-7-data',
  unitId: 'lumi_protocol_act_7_data',
  lumiCourseId: 'lumi-season-1',
  title: 'ACT 7. DATA CORE (데이터 코어)',
  description: 'list, append/pop, 순회, split/join 패킷 파싱, tuple 좌표와 dict 상태 관리를 완성하는 10개 정규 미션',
  persistencePolicy: 'official',
  rewardPolicy: 'standard-crystals',
  dailyRecordPolicy: 'official',
  assignmentEvidencePolicy: 'python-only',
  missions: LUMI_DATA_CORE_MISSIONS,
})
