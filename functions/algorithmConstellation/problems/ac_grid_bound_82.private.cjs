/** Server-only definition: AC-GRID-BOUND-82. */
module.exports = {
  problemId: 'AC-GRID-BOUND-82',
  problemVersion: 1,
  entryFunction: 'open_grid_neighbors',
  officialSolutionCode: `def open_grid_neighbors(grid, r, c):
    rows = len(grid)
    cols = len(grid[0])
    valid = []
    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        nr = r + dr
        nc = c + dc
        if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
            valid.append([nr, nc])
    return valid
`,
  alternativeSolutions: [
    `def open_grid_neighbors(grid, r, c):
    rows = len(grid)
    cols = len(grid[0])
    valid = []
    deltas = [(-1, 0), (1, 0), (0, -1), (0, 1)]
    for d in deltas:
        nr = r + d[0]
        nc = c + d[1]
        if 0 <= nr < rows:
            if 0 <= nc < cols:
                if grid[nr][nc] == 0:
                    valid.append([nr, nc])
    return valid
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'BOUND-INCLUDES-WALLS',
      expectedFailingGroup: 'wall_filtering',
      code: `def open_grid_neighbors(grid, r, c):
    rows = len(grid)
    cols = len(grid[0])
    valid = []
    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        nr = r + dr
        nc = c + dc
        if 0 <= nr < rows and 0 <= nc < cols:
            valid.append([nr, nc])
    return valid
`,
    },
    {
      id: 'BOUND-REVERSES-DIRECTIONS',
      expectedFailingGroup: 'direction_order',
      code: `def open_grid_neighbors(grid, r, c):
    rows = len(grid)
    cols = len(grid[0])
    valid = []
    for dr, dc in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
        nr = r + dr
        nc = c + dc
        if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
            valid.append([nr, nc])
    return valid
`,
    },
    {
      id: 'BOUND-INCLUDES-DIAGONALS',
      expectedFailingGroup: 'wall_filtering',
      code: `def open_grid_neighbors(grid, r, c):
    rows = len(grid)
    cols = len(grid[0])
    valid = []
    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]:
        nr = r + dr
        nc = c + dc
        if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
            valid.append([nr, nc])
    return valid
`,
    },
  ],
  hiddenTests: [
    {
      inputs: {
        grid: [
          [0, 0, 0],
          [0, 0, 1],
          [0, 1, 0],
        ],
        r: 1,
        c: 1,
      },
      expected: [[0, 1], [1, 0]],
      group: 'wall_filtering',
    },
    {
      inputs: {
        grid: [
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
        ],
        r: 1,
        c: 1,
      },
      expected: [[0, 1], [2, 1], [1, 0], [1, 2]],
      group: 'direction_order',
    },
    {
      inputs: {
        grid: [
          [1, 0, 1],
          [0, 0, 0],
          [1, 0, 1],
        ],
        r: 1,
        c: 1,
      },
      expected: [[0, 1], [2, 1], [1, 0], [1, 2]],
      group: 'direction_order',
    },
    {
      inputs: {
        grid: [
          [0, 1],
          [1, 0],
        ],
        r: 0,
        c: 0,
      },
      expected: [],
      group: 'wall_filtering',
    },
    {
      inputs: {
        grid: [[0, 1, 0, 0]],
        r: 0,
        c: 2,
      },
      expected: [[0, 3]],
      group: 'wall_filtering',
    },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_grid_082_1',
      title: '경계 검사와 장애물 필터링 이해',
      prompt: '인덱스 접근 전 안전성 검사와 0/1의 의미를 확인하세요.',
      questions: [
        {
          id: 'q1',
          text: 'grid[nr][nc]를 검사하는 코드를 범위 검사보다 먼저 작성하면 어떤 오류가 발생할 수 있을까요?',
          options: [
            { value: 'index_error', label: '인덱스가 범위를 벗어났을 때 IndexError가 발생한다' },
            { value: 'no_error', label: '아무 오류도 생기지 않는다' },
          ],
          expected: 'index_error',
        },
        {
          id: 'q2',
          text: '이 문제에서 벽(1)인 칸은 반환 목록에 포함되어야 할까요?',
          options: [
            { value: 'no', label: '아니다 — 열린 칸(0)만 이동할 수 있으므로 제외해야 한다' },
            { value: 'yes', label: '맞다 — 벽도 인접한 칸이므로 포함한다' },
          ],
          expected: 'no',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_grid_082_transfer_1',
      title: '안전한 로버 이동 경로',
      description: '행성 지형 grid와 현재 로버 좌표 position([r, c])가 주어질 때, 상·하·좌·우로 로버가 안전하게 한 칸 이동할 수 있는 열린 좌표(0) 목록을 반환하세요.',
      entryFunction: 'safe_rover_moves',
      starterCode: `def safe_rover_moves(grid, position):
    # position은 [r, c]입니다. 상, 하, 좌, 우 순서로 안전하게 이동 가능한 좌표를 반환하세요.
    pass
`,
      officialSolutionCode: `def safe_rover_moves(grid, position):
    pr = position[0]
    pc = position[1]
    rows = len(grid)
    cols = len(grid[0])
    moves = []
    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        nr = pr + dr
        nc = pc + dc
        if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
            moves.append([nr, nc])
    return moves
`,
      contextCard: {
        title: '🚜 로버 안전 이동 탐색',
        strategyGuide: 'position에서 행과 열을 변수로 추출한 뒤, 상·하·좌·우 후보 중 범위 안이고 암석(1)이 아닌 안전한 위치(0)만 수집합니다.',
      },
      thoughtCheck: {
        question: '로버 위치 position = [0, 0]에서 위쪽 좌표를 확인할 때 경계 검사의 결과는?',
        options: [
          { value: 'out', label: '행 번호가 음수(-1)가 되어 지형 밖이다' },
          { value: 'in', label: '정상적인 지형 내부이다' },
        ],
        expected: 'out',
      },
      testCases: [
        {
          inputs: {
            grid: [
              [0, 1, 0],
              [0, 0, 0],
              [1, 0, 1],
            ],
            position: [1, 1],
          },
          expected: [[2, 1], [1, 0], [1, 2]],
        },
        {
          inputs: {
            grid: [
              [0, 0],
              [0, 1],
            ],
            position: [1, 0],
          },
          expected: [[0, 0]],
        },
        {
          inputs: {
            grid: [
              [1, 0],
              [0, 0],
            ],
            position: [0, 1],
          },
          expected: [[1, 1]],
        },
      ],
    },
  ],
}
