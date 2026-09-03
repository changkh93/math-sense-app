/** Server-only definition: AC-GRID-ISLAND-84. */
module.exports = {
  problemId: 'AC-GRID-ISLAND-84',
  problemVersion: 1,
  entryFunction: 'count_regions',
  officialSolutionCode: `from collections import deque

def count_regions(grid):
    rows = len(grid)
    cols = len(grid[0])
    visited = set()
    regions = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 0 and (r, c) not in visited:
                regions = regions + 1
                queue = deque([(r, c)])
                visited.add((r, c))
                while len(queue) > 0:
                    cr, cc = queue.popleft()
                    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                        nr = cr + dr
                        nc = cc + dc
                        if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
                            if (nr, nc) not in visited:
                                visited.add((nr, nc))
                                queue.append((nr, nc))
    return regions
`,
  alternativeSolutions: [
    `from collections import deque

def count_regions(grid):
    R = len(grid)
    C = len(grid[0])
    vis = set()
    count = 0
    for i in range(R):
        for j in range(C):
            if grid[i][j] == 0 and (i, j) not in vis:
                count += 1
                q = deque([(i, j)])
                vis.add((i, j))
                while len(q) > 0:
                    r, c = q.popleft()
                    for nr, nc in [(r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)]:
                        if 0 <= nr < R and 0 <= nc < C and grid[nr][nc] == 0 and (nr, nc) not in vis:
                            vis.add((nr, nc))
                            q.append((nr, nc))
    return count
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'ISLAND-COUNTS-EVERY-CELL',
      expectedFailingGroup: 'multi_cell_regions',
      code: `def count_regions(grid):
    count = 0
    for row in grid:
        for val in row:
            if val == 0:
                count = count + 1
    return count
`,
    },
    {
      id: 'ISLAND-STOPS-AFTER-FIRST',
      expectedFailingGroup: 'multiple_isolated_regions',
      code: `def count_regions(grid):
    for row in grid:
        for val in row:
            if val == 0:
                return 1
    return 0
`,
    },
    {
      id: 'ISLAND-CONNECTS-DIAGONALLY',
      expectedFailingGroup: 'diagonal_separation',
      code: `from collections import deque

def count_regions(grid):
    rows = len(grid)
    cols = len(grid[0])
    visited = set()
    regions = 0
    deltas = [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 0 and (r, c) not in visited:
                regions = regions + 1
                queue = deque([(r, c)])
                visited.add((r, c))
                while len(queue) > 0:
                    cr, cc = queue.popleft()
                    for dr, dc in deltas:
                        nr = cr + dr
                        nc = cc + dc
                        if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
                            if (nr, nc) not in visited:
                                visited.add((nr, nc))
                                queue.append((nr, nc))
    return regions
`,
    },
  ],
  hiddenTests: [
    {
      inputs: {
        grid: [
          [0, 1, 0, 1],
          [1, 1, 1, 1],
          [0, 0, 1, 0],
        ],
      },
      expected: 4,
      group: 'multiple_isolated_regions',
    },
    {
      inputs: {
        grid: [
          [0, 0, 0],
          [1, 0, 1],
        ],
      },
      expected: 1,
      group: 'multi_cell_regions',
    },
    {
      inputs: {
        grid: [
          [0, 1],
          [1, 0],
        ],
      },
      expected: 2,
      group: 'diagonal_separation',
    },
    {
      inputs: {
        grid: [
          [1, 1],
          [1, 1],
        ],
      },
      expected: 0,
      group: 'multiple_isolated_regions',
    },
    {
      inputs: {
        grid: [[0, 1, 0, 0, 1, 0]],
      },
      expected: 3,
      group: 'multiple_isolated_regions',
    },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_grid_084_1',
      title: '연결 구역 개수 세기 불변식',
      prompt: '이미 방문한 칸의 처리와 새로운 구역 카운트 시점을 확인하세요.',
      questions: [
        {
          id: 'q1',
          text: '이미 이전 구역 탐색에서 visited에 추가된 0을 바깥 순회에서 다시 만나면 어떻게 해야 할까요?',
          options: [
            { value: 'skip', label: '이미 카운트된 구역의 일부이므로 건너뛴다' },
            { value: 'increment', label: '새 구역으로 보고 다시 카운트를 1 늘린다' },
          ],
          expected: 'skip',
        },
        {
          id: 'q2',
          text: '격자의 모든 칸이 1(벽)으로 채워져 있다면 반환해야 하는 결과는 무엇일까요?',
          options: [
            { value: 'zero', label: '0 (열린 구역이 없음)' },
            { value: 'one', label: '1' },
          ],
          expected: 'zero',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_grid_084_transfer_1',
      title: '신호 송출 군집 개수 세기',
      description: '격자 grid에서 1은 신호 송출기, 0은 빈 공간입니다. 4방향으로 연결된 신호 송출기(1) 군집들의 총 개수를 반환하세요. 송출기가 하나도 없으면 0을 반환합니다.',
      entryFunction: 'count_signal_clusters',
      starterCode: `from collections import deque

def count_signal_clusters(grid):
    # 1이 신호 송출기이고 0이 빈 공간입니다. 1 군집의 총 개수를 반환하세요.
    pass
`,
      officialSolutionCode: `from collections import deque

def count_signal_clusters(grid):
    rows = len(grid)
    cols = len(grid[0])
    visited = set()
    clusters = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 1 and (r, c) not in visited:
                clusters = clusters + 1
                queue = deque([(r, c)])
                visited.add((r, c))
                while len(queue) > 0:
                    cr, cc = queue.popleft()
                    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                        nr = cr + dr
                        nc = cc + dc
                        if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1:
                            if (nr, nc) not in visited:
                                visited.add((nr, nc))
                                queue.append((nr, nc))
    return clusters
`,
      contextCard: {
        title: '📶 신호 송출 군집 탐색',
        strategyGuide: '미방문 1을 만날 때마다 군집 수를 1 늘리고, 연결된 1들을 플러드 필로 모두 방문 처리합니다.',
      },
      thoughtCheck: {
        question: '군집 탐색 중 값이 0(빈 공간)인 칸을 만나면 군집 수를 늘려야 할까요?',
        options: [
          { value: 'no', label: '아니다 — 1인 송출기만 군집으로 센다' },
          { value: 'yes', label: '맞다 — 빈 공간도 센다' },
        ],
        expected: 'no',
      },
      testCases: [
        {
          inputs: {
            grid: [
              [1, 1, 0, 1],
              [0, 0, 0, 1],
              [1, 0, 0, 0],
            ],
          },
          expected: 3,
        },
        {
          inputs: {
            grid: [
              [1, 1],
              [1, 1],
            ],
          },
          expected: 1,
        },
        {
          inputs: {
            grid: [
              [0, 1, 0],
              [1, 0, 1],
              [0, 1, 0],
            ],
          },
          expected: 4,
        },
      ],
    },
  ],
}
