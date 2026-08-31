/**
 * AC-SIM-ROVER-51 Private Problem Definition
 */
module.exports = {
  problemId: 'AC-SIM-ROVER-51',
  problemVersion: 1,
  entryFunction: 'run_rover_commands',
  // 방향 반전은 0 - direction 형태만 사용한다(이 샌드박스에서 d * -1 반복 적용이
  // 올바르게 복원되지 않는 런타임 특이점 — 실행 검증 완료).
  officialSolutionCode: `def run_rover_commands(start_pos, commands):
    pos = start_pos
    direction = 1
    for command in commands:
        if command == "MOVE":
            pos = pos + direction
        else:
            direction = 0 - direction
    return [pos, direction]
`,
  intendedWrongFixtures: [
    {
      id: 'ROVER-ALWAYS-MOVES-RIGHT',
      expectedFailingGroup: 'turn-before-move',
      code: `def run_rover_commands(start_pos, commands):
    pos = start_pos
    for command in commands:
        if command == "MOVE":
            pos = pos + 1
    return [pos, 1]
`,
    },
    {
      id: 'ROVER-TURN-MOVES-POSITION',
      expectedFailingGroup: 'turn-before-move',
      code: `def run_rover_commands(start_pos, commands):
    pos = start_pos
    direction = 1
    for command in commands:
        if command == "MOVE":
            pos = pos + direction
        else:
            pos = pos + direction
            direction = 0 - direction
    return [pos, direction]
`,
    },
    {
      id: 'ROVER-RESETS-DIRECTION-EACH-STEP',
      expectedFailingGroup: 'turn-before-move',
      code: `def run_rover_commands(start_pos, commands):
    pos = start_pos
    direction = 1
    for command in commands:
        direction = 1
        if command == "MOVE":
            pos = pos + direction
        else:
            direction = -1
    return [pos, direction]
`,
    },
    {
      id: 'ROVER-RETURNS-POSITION-ONLY',
      expectedFailingGroup: 'mixed-order',
      code: `def run_rover_commands(start_pos, commands):
    pos = start_pos
    direction = 1
    for command in commands:
        if command == "MOVE":
            pos = pos + direction
        else:
            direction = 0 - direction
    return pos
`,
    },
  ],
  hiddenTests: [
    // MOVE만 있는 목록: 방향이 끝까지 유지되는지 확인한다.
    { inputs: { start_pos: 3, commands: ['MOVE', 'MOVE'] }, expected: [5, 1], group: 'move-only' },
    // TURN이 먼저 오면 이동이 모두 뒤로 향한다.
    { inputs: { start_pos: 0, commands: ['TURN', 'MOVE'] }, expected: [-1, -1], group: 'turn-before-move' },
    // 두 번 TURN은 방향 복원: 항상 오른쪽으로 리셋하는 오답을 잡는다.
    { inputs: { start_pos: 0, commands: ['TURN', 'TURN', 'MOVE'] }, expected: [1, 1], group: 'double-turn-restores-direction' },
    // MOVE와 TURN이 섞인 순서 의존 입력.
    { inputs: { start_pos: 0, commands: ['MOVE', 'TURN', 'MOVE', 'TURN', 'MOVE'] }, expected: [1, 1], group: 'mixed-order' },
    // 빈 명령 목록: 시작 상태 그대로.
    { inputs: { start_pos: 7, commands: [] }, expected: [7, 1], group: 'empty-commands' },
    // 음수 시작 위치.
    { inputs: { start_pos: -4, commands: ['MOVE'] }, expected: [-3, 1], group: 'negative-start' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_sim_051_1',
      title: '명령 상태 머신 이해',
      prompt: '로버의 위치와 방향 상태가 명령에 따라 어떻게 바뀌는지 점검하세요.',
      questions: [
        {
          id: 'q1',
          text: 'TURN 명령 뒤에 로버의 위치가 그대로인 이유는 무엇일까요?',
          options: [
            { value: 'turn_only_flips', label: 'TURN은 방향 상태만 바꾸는 명령이라 위치에는 영향이 없어서' },
            { value: 'turn_moves_back', label: 'TURN이 이동을 취소해서' },
            { value: 'turn_waits', label: 'TURN은 아무 일도 일어나지 않아서' },
          ],
          expected: 'turn_only_flips',
        },
        {
          id: 'q2',
          text: 'TURN을 두 번 연속 실행하면 방향은 어떻게 될까요?',
          options: [
            { value: 'restores_direction', label: '원래 방향으로 돌아온다 — 반대로 뒤집기를 두 번 하면 제자리다' },
            { value: 'stays_flipped', label: '계속 뒤집힌 상태로 유지된다' },
          ],
          expected: 'restores_direction',
        },
        {
          id: 'q3',
          text: '같은 명령 목록이라도 [MOVE, TURN, MOVE]와 [TURN, MOVE, MOVE]의 결과가 다른 이유는 무엇일까요?',
          options: [
            { value: 'order_changes_state', label: 'MOVE의 결과가 그 순간의 방향 상태에 달려 있어 명령 순서가 곧 결과라서' },
            { value: 'order_irrelevant', label: '명령은 순서와 상관없이 같은 결과를 내서' },
          ],
          expected: 'order_changes_state',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_sim_051_transfer_1',
      title: '탐사선의 단계 이동 명령',
      description: '탐사선이 깊이 수준(start_level)에서 명령 목록(commands)을 순서대로 처리합니다. STEP은 현재 방향으로 한 단계 이동, FLIP은 방향만 반대로 바꿉니다.',
      entryFunction: 'run_probe_commands',
      starterCode: `def run_probe_commands(start_level, commands):
    # 명령을 순서대로 처리해 최종 [수준, 방향]을 반환하세요.
    pass
`,
      officialSolutionCode: `def run_probe_commands(start_level, commands):
    level = start_level
    direction = 1
    for command in commands:
        if command == "STEP":
            level = level + direction
        else:
            direction = 0 - direction
    return [level, direction]
`,
      contextCard: {
        title: '🛰️ 탐사선 명령 실행 전략',
        strategyGuide: '명령을 하나씩 확인해 STEP이면 현재 방향으로 한 칸 이동하고, FLIP이면 방향만 반대로 바꿉니다.',
      },
      thoughtCheck: {
        question: '탐사선이 [STEP, FLIP, STEP]을 처리한다면 마지막 STEP은 어느 방향으로 움직일까요?',
        options: [
          { value: 'move_backward', label: '뒤쪽 — FLIP 뒤의 방향을 따른다' },
          { value: 'move_forward', label: '앞쪽 — 처음 방향을 유지한다' },
        ],
        expected: 'move_backward',
      },
      testCases: [
        { inputs: { start_level: 3, commands: [] }, expected: [3, 1] },
        { inputs: { start_level: 1, commands: ['FLIP', 'FLIP'] }, expected: [1, 1] },
        { inputs: { start_level: -2, commands: ['STEP', 'FLIP', 'STEP', 'STEP'] }, expected: [-3, -1] },
        { inputs: { start_level: 0, commands: ['FLIP'] }, expected: [0, -1] },
      ],
    },
  ],
}
