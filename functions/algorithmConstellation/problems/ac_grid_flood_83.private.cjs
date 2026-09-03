/** Server-only definition: AC-GRID-FLOOD-83. */
module.exports = {
  problemId: 'AC-GRID-FLOOD-83',
  problemVersion: 1,
  entryFunction: 'region_size',
  officialSolutionCode: `from collections import deque

def region_size(grid, start):
    r0 = start[0]
    c0 = start[1]
    if grid[r0][c0] == 1:
        return 0
    rows = len(grid)
    cols = len(grid[0])
    queue = deque([(r0, c0)])
    visited = {(r0, c0)}
    size = 0
    while len(queue) > 0:
        r, c = queue.popleft()
        size = size + 1
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr = r + dr
            nc = c + dc
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
                if (nr, nc) not in visited:
                    visited.add((nr, nc))
                    queue.append((nr, nc))
    return size
`,
  alternativeSolutions: [
    `from collections import deque

def region_size(grid, start):
    sr = start[0]
    sc = start[1]
    if grid[sr][sc] == 1:
        return 0
    R = len(grid)
    C = len(grid[0])
    q = deque([(sr, sc)])
    vis = {(sr, sc)}
    count = 0
    while len(q) > 0:
        cr, cc = q.popleft()
        count = count + 1
        for nr, nc in [(cr - 1, cc), (cr + 1, cc), (cr, cc - 1), (cr, cc + 1)]:
            if 0 <= nr < R and 0 <= nc < C and grid[nr][nc] == 0 and (nr, nc) not in vis:
                vis.add((nr, nc))
                q.append((nr, nc))
    return count
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'FLOOD-INCLUDES-DIAGONALS',
      expectedFailingGroup: 'diagonal_isolation',
      code: `from collections import deque

def region_size(grid, start):
    r0 = start[0]
    c0 = start[1]
    if grid[r0][c0] == 1:
        return 0
    rows = len(grid)
    cols = len(grid[0])
    queue = deque([(r0, c0)])
    visited = {(r0, c0)}
    size = 0
    deltas = [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]
    while len(queue) > 0:
        r, c = queue.popleft()
        size = size + 1
        for dr, dc in deltas:
            nr = r + dr
            nc = c + dc
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
                if (nr, nc) not in visited:
                    visited.add((nr, nc))
                    queue.append((nr, nc))
    return size
`,
    },
    {
      id: 'FLOOD-WALKS-THROUGH-WALLS',
      expectedFailingGroup: 'wall_blocking',
      code: `from collections import deque

def region_size(grid, start):
    r0 = start[0]
    c0 = start[1]
    if grid[r0][c0] == 1:
        return 0
    rows = len(grid)
    cols = len(grid[0])
    queue = deque([(r0, c0)])
    visited = {(r0, c0)}
    size = 0
    while len(queue) > 0:
        r, c = queue.popleft()
        size = size + 1
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr = r + dr
            nc = c + dc
            if 0 <= nr < rows and 0 <= nc < cols:
                if (nr, nc) not in visited:
                    visited.add((nr, nc))
                    queue.append((nr, nc))
    return size
`,
    },
    {
      id: 'FLOOD-RETURNS-ONLY-START',
      expectedFailingGroup: 'multi_cell_expansion',
      code: `def region_size(grid, start):
    r0 = start[0]
    c0 = start[1]
    if grid[r0][c0] == 1:
        return 0
    return 1
`,
    },
  ],
  hiddenTests: [
    {
      inputs: {
        grid: [
          [0, 1],
          [1, 0],
        ],
        start: [0, 0],
      },
      expected: 1,
      group: 'diagonal_isolation',
    },
    {
      inputs: {
        grid: [
          [0, 1, 0],
          [1, 1, 1],
          [0, 0, 0],
        ],
        start: [0, 0],
      },
      expected: 1,
      group: 'wall_blocking',
    },
    {
      inputs: {
        grid: [
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
        ],
        start: [1, 1],
      },
      expected: 9,
      group: 'multi_cell_expansion',
    },
    {
      inputs: {
        grid: [
          [0, 0, 1, 0],
          [1, 0, 1, 0],
          [1, 0, 0, 0],
        ],
        start: [0, 0],
      },
      expected: 8,
      group: 'multi_cell_expansion',
    },
    {
      inputs: {
        grid: [
          [0, 0],
          [0, 1],
        ],
        start: [1, 1],
      },
      expected: 0,
      group: 'wall_blocking',
    },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_grid_083_1',
      title: '플러드 필 연결성 및 불변식 점검',
      prompt: '구역 탐색의 연결 조건과 방문 처리를 확인하세요.',
      questions: [
        {
          id: 'q1',
          text: '벽으로 완전히 둘러싸여 시작점과 단절된 다른 열린 칸들은 region_size 결과에 포함될까요?',
          options: [
            { value: 'no', label: '아니다 — 시작점과 4방향으로 연결된 구역만 센다' },
            { value: 'yes', label: '맞다 — 격자 안의 모든 열린 칸을 센다' },
          ],
          expected: 'no',
        },
        {
          id: 'q2',
          text: '큐에 새 좌표를 넣을 때 즉시 visited에 추가하는 이유는 무엇일까요?',
          options: [
            { value: 'prevent_duplicate', label: '다른 이웃을 탐색할 때 같은 좌표가 큐에 중복으로 들어가는 것을 막기 위해' },
            { value: 'change_grid', label: '격자의 값을 벽으로 바꾸기 위해' },
          ],
          expected: 'prevent_duplicate',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_grid_083_transfer_1',
      title: '연결된 센서 군집 크기',
      description: '센서 격자 grid에서 1은 센서, 0은 빈 공간입니다. start([r, c]) 위치의 센서와 4방향으로 연결된 센서(1)들의 총 개수를 반환하세요. start에 센서가 없으면 0을 반환합니다.',
      entryFunction: 'connected_sensor_count',
      starterCode: `from collections import deque

def connected_sensor_count(grid, start):
    # 1이 센서이고 0이 빈 공간입니다. start와 연결된 센서(1)의 총 개수를 반환하세요.
    pass
`,
      officialSolutionCode: `from collections import deque

def connected_sensor_count(grid, start):
    r0 = start[0]
    c0 = start[1]
    if grid[r0][c0] == 0:
        return 0
    rows = len(grid)
    cols = len(grid[0])
    queue = deque([(r0, c0)])
    visited = {(r0, c0)}
    count = 0
    while len(queue) > 0:
        r, c = queue.popleft()
        count = count + 1
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr = r + dr
            nc = c + dc
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1:
                if (nr, nc) not in visited:
                    visited.add((nr, nc))
                    queue.append((nr, nc))
    return count
`,
      contextCard: {
        title: '📡 센서 군집 크기 탐색',
        strategyGuide: 'start 좌표의 행과 열을 변수로 추출한 뒤, 값이 1인 센서들만 4방향 플러드 필로 탐색하여 개수를 셉니다.',
      },
      thoughtCheck: {
        question: '센서 군집 탐색에서 start 위치의 값이 0(빈 공간)이라면 반환해야 하는 결과는?',
        options: [
          { value: 'zero', label: '0 (센서가 없음)' },
          { value: 'one', label: '1' },
        ],
        expected: 'zero',
      },
      testCases: [
        {
          inputs: {
            grid: [
              [1, 0, 1],
              [1, 1, 0],
              [0, 0, 1],
            ],
            start: [0, 0],
          },
          expected: 3,
        },
        {
          inputs: {
            grid: [
              [0, 0],
              [0, 0],
            ],
            start: [0, 0],
          },
          expected: 0,
        },
        {
          inputs: {
            grid: [
              [1, 1, 1],
              [1, 1, 1],
            ],
            start: [0, 1],
          },
          expected: 6,
        },
      ],
    },
  ],
}
