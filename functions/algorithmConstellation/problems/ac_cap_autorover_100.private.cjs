/** Server-only definition: AC-CAP-AUTOROVER-100. */
module.exports = {
  problemId: 'AC-CAP-AUTOROVER-100',
  problemVersion: 1,
  entryFunction: 'navigate_rover',
  starterCode: `def navigate_rover(grid, start, commands):
    # 명령 목록을 차례로 수행한 후 [최종_r, 최종_c, 최종_방향]을 반환하세요.
    pass
`,
  officialSolutionCode: `def navigate_rover(grid, start, commands):
    rows = len(grid)
    cols = len(grid[0])
    r = start[0]
    c = start[1]
    d = 0
    dr = [-1, 0, 1, 0]
    dc = [0, 1, 0, -1]
    for cmd in commands:
        if cmd == "TURN":
            d = (d + 1) % 4
        elif cmd == "MOVE":
            step_r = dr[d]
            step_c = dc[d]
            nr = r + step_r
            nc = c + step_c
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
                r = nr
                c = nc
    return [r, c, d]
`,
  alternativeSolutions: [
    `def navigate_rover(grid, start, commands):
    R, C = len(grid), len(grid[0])
    r, c = start[0], start[1]
    dirs = [(-1, 0), (0, 1), (1, 0), (0, -1)]
    d = 0
    for cmd in commands:
        if cmd == 'TURN':
            d = (d + 1) % 4
        elif cmd == 'MOVE':
            dr, dc = dirs[d]
            nr, nc = r + dr, c + dc
            if 0 <= nr < R and 0 <= nc < C and grid[nr][nc] == 0:
                r, c = nr, nc
    return [r, c, d]
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'MOVE-THROUGH-WALLS',
      expectedFailingGroup: 'wall_collision',
      code: `def navigate_rover(grid, start, commands):
    rows = len(grid)
    cols = len(grid[0])
    r = start[0]
    c = start[1]
    d = 0
    dr = [-1, 0, 1, 0]
    dc = [0, 1, 0, -1]
    for cmd in commands:
        if cmd == "TURN":
            d = (d + 1) % 4
        elif cmd == "MOVE":
            r = r + dr[d]
            c = c + dc[d]
    return [r, c, d]
`,
    },
    {
      id: 'TURN-CHANGES-POSITION',
      expectedFailingGroup: 'turn_semantics',
      code: `def navigate_rover(grid, start, commands):
    r = start[0]
    c = start[1]
    d = 0
    for cmd in commands:
        if cmd == "TURN":
            d = (d + 1) % 4
            r = r + 1
    return [r, c, d]
`,
    },
    {
      id: 'NO-TURN-UPDATE',
      expectedFailingGroup: 'direction_cycle',
      code: `def navigate_rover(grid, start, commands):
    rows = len(grid)
    cols = len(grid[0])
    r = start[0]
    c = start[1]
    d = 0
    dr = [-1, 0, 1, 0]
    dc = [0, 1, 0, -1]
    for cmd in commands:
        if cmd == "MOVE":
            nr = r + dr[d]
            nc = c + dc[d]
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
                r = nr
                c = nc
    return [r, c, d]
`,
    },
    {
      id: 'OUT-OF-BOUNDS-ALLOWED',
      expectedFailingGroup: 'boundary_check',
      code: `def navigate_rover(grid, start, commands):
    r = start[0]
    c = start[1]
    d = 0
    dr = [-1, 0, 1, 0]
    dc = [0, 1, 0, -1]
    for cmd in commands:
        if cmd == "TURN":
            d = (d + 1) % 4
        elif cmd == "MOVE":
            r = r + dr[d]
            c = c + dc[d]
    return [r, c, d]
`,
    },
  ],
  hiddenTests: [
    {
      inputs: {
        grid: [[0]],
        start: [0, 0],
        commands: [],
      },
      expected: [0, 0, 0],
      group: 'empty_commands',
    },
    {
      inputs: {
        grid: [[0]],
        start: [0, 0],
        commands: ['TURN'],
      },
      expected: [0, 0, 1],
      group: 'direction_cycle',
    },
    {
      inputs: {
        grid: [
          [0, 1],
          [0, 0],
        ],
        start: [0, 0],
        commands: ['TURN', 'MOVE'],
      },
      expected: [0, 0, 1],
      group: 'wall_collision',
    },
    {
      inputs: {
        grid: [
          [0, 0, 0],
          [0, 0, 0],
        ],
        start: [0, 1],
        commands: ['MOVE'],
      },
      expected: [0, 1, 0],
      group: 'boundary_check',
    },
    {
      inputs: {
        grid: [
          [0, 0],
          [0, 0],
        ],
        start: [0, 0],
        commands: ['TURN', 'TURN', 'MOVE'],
      },
      expected: [1, 0, 2],
      group: 'turn_semantics',
    },
    {
      inputs: {
        grid: [
          [0, 0, 0, 0, 0, 0],
          [0, 1, 1, 1, 1, 0],
          [0, 0, 0, 0, 1, 0],
          [0, 1, 1, 0, 1, 0],
          [0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0],
        ],
        start: [0, 0],
        commands: [
          'TURN', 'MOVE', 'MOVE', 'MOVE', 'MOVE', 'MOVE',
          'TURN', 'MOVE', 'MOVE', 'MOVE', 'MOVE',
          'TURN', 'MOVE', 'MOVE', 'MOVE',
          'TURN', 'MOVE', 'MOVE',
          'TURN', 'MOVE', 'MOVE',
          'TURN', 'MOVE', 'MOVE',
        ],
      },
      expected: [5, 4, 2],
      group: 'large_scale',
    },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_cap_100_1',
      title: '자율 주행 상태 머신 규칙',
      prompt: '위치 좌표와 방향 상태 변화 규칙을 확인하세요.',
      questions: [
        {
          id: 'q1',
          text: "서쪽(3)을 향한 상태에서 TURN 명령을 받으면 방향은 몇 번이 될까요?",
          options: [
            { value: 'north_0', label: '0번 (북쪽) — (3 + 1) % 4 = 0 으로 순환' },
            { value: 'four_4', label: '4번' },
          ],
          expected: 'north_0',
        },
        {
          id: 'q2',
          text: "MOVE 명령 시 앞 칸이 격자 밖이거나 벽일 때 올바른 로버의 행동은?",
          options: [
            { value: 'stay_in_place', label: '이동하지 않고 현재 위치에 멈춘다' },
            { value: 'reverse_dir', label: '반대 방향으로 후진한다' },
          ],
          expected: 'stay_in_place',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_cap_100_transfer_1',
      title: '로버 방문 서로 다른 칸 수',
      description: '로버가 명령들을 수행하는 동안 방문한 서로 다른 칸들의 개수를 [[최종_r, 최종_c, 최종_방향], 방문_칸_수] 형태로 반환하세요 (시작 칸 포함).',
      entryFunction: 'count_unique_cells',
      starterCode: `def count_unique_cells(grid, start, commands):
    # [[최종_r, 최종_c, 최종_방향], 방문_칸_수]를 반환하세요.
    pass
`,
      officialSolutionCode: `def count_unique_cells(grid, start, commands):
    rows = len(grid)
    cols = len(grid[0])
    r = start[0]
    c = start[1]
    d = 0
    dr = [-1, 0, 1, 0]
    dc = [0, 1, 0, -1]
    visited = {(r, c)}
    for cmd in commands:
        if cmd == "TURN":
            d = (d + 1) % 4
        elif cmd == "MOVE":
            step_r = dr[d]
            step_c = dc[d]
            nr = r + step_r
            nc = c + step_c
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
                r = nr
                c = nc
                visited.add((r, c))
    return [[r, c, d], len(visited)]
`,
      contextCard: {
        title: '🗺️ 방문 지도 기록',
        strategyGuide: '이동할 때마다 집합(visited)에 (r, c) 좌표를 추가하고 len(visited)를 함께 반환합니다.',
      },
      thoughtCheck: {
        question: '명령 없이 시작 칸 (0,0)에 그대로 멈춰 있다면 방문 칸 수는?',
        options: [
          { value: 'ans_1', label: '1개' },
          { value: 'ans_0', label: '0개' },
        ],
        expected: 'ans_1',
      },
      testCases: [
        {
          inputs: {
            grid: [[0]],
            start: [0, 0],
            commands: [],
          },
          expected: [[0, 0, 0], 1],
        },
        {
          inputs: {
            grid: [
              [0, 0],
              [0, 0],
            ],
            start: [0, 0],
            commands: ['TURN', 'MOVE', 'TURN', 'MOVE'],
          },
          expected: [[1, 1, 2], 3],
        },
        {
          inputs: {
            grid: [
              [0, 1],
              [0, 0],
            ],
            start: [0, 0],
            commands: ['TURN', 'MOVE'],
          },
          expected: [[0, 0, 1], 1],
        },
      ],
    },
  ],
}
