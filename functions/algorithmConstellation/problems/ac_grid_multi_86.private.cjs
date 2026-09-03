/** Server-only definition: AC-GRID-MULTI-86. */
module.exports = {
  problemId: 'AC-GRID-MULTI-86',
  problemVersion: 1,
  entryFunction: 'light_fill_time',
  officialSolutionCode: `from collections import deque

def light_fill_time(grid, sources):
    rows = len(grid)
    cols = len(grid[0])
    dist = []
    for _ in range(rows):
        row = []
        for _ in range(cols):
            row.append(-1)
        dist.append(row)
    queue = deque()
    for s in sources:
        sr = s[0]
        sc = s[1]
        dist[sr][sc] = 0
        queue.append((sr, sc))

    while len(queue) > 0:
        r, c = queue.popleft()
        cur_d = dist[r][c]
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr = r + dr
            nc = c + dc
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
                if dist[nr][nc] == -1:
                    dist[nr][nc] = cur_d + 1
                    queue.append((nr, nc))

    max_d = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 0:
                if dist[r][c] == -1:
                    return -1
                if dist[r][c] > max_d:
                    max_d = dist[r][c]
    return max_d
`,
  alternativeSolutions: [
    `from collections import deque

def light_fill_time(grid, sources):
    R = len(grid)
    C = len(grid[0])
    dist = []
    for _ in range(R):
        row = []
        for _ in range(C):
            row.append(-1)
        dist.append(row)
    q = deque()
    for item in sources:
        r0 = item[0]
        c0 = item[1]
        dist[r0][c0] = 0
        q.append((r0, c0))
    while len(q) > 0:
        cr, cc = q.popleft()
        d = dist[cr][cc]
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr = cr + dr
            nc = cc + dc
            if 0 <= nr < R and 0 <= nc < C and grid[nr][nc] == 0 and dist[nr][nc] == -1:
                dist[nr][nc] = d + 1
                q.append((nr, nc))
    ans = 0
    for i in range(R):
        for j in range(C):
            if grid[i][j] == 0:
                if dist[i][j] == -1:
                    return -1
                if dist[i][j] > ans:
                    ans = dist[i][j]
    return ans
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'MULTI-RUNS-ONLY-FIRST-SOURCE',
      expectedFailingGroup: 'two_source_meeting',
      code: `from collections import deque

def light_fill_time(grid, sources):
    rows = len(grid)
    cols = len(grid[0])
    dist = []
    for _ in range(rows):
        row = []
        for _ in range(cols):
            row.append(-1)
        dist.append(row)
    queue = deque()
    first = sources[0]
    sr = first[0]
    sc = first[1]
    dist[sr][sc] = 0
    queue.append((sr, sc))

    while len(queue) > 0:
        r, c = queue.popleft()
        cur_d = dist[r][c]
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr = r + dr
            nc = c + dc
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
                if dist[nr][nc] == -1:
                    dist[nr][nc] = cur_d + 1
                    queue.append((nr, nc))

    max_d = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 0:
                if dist[r][c] == -1:
                    return -1
                if dist[r][c] > max_d:
                    max_d = dist[r][c]
    return max_d
`,
    },
    {
      id: 'MULTI-IGNORES-UNREACHABLE',
      expectedFailingGroup: 'unreachable_cells',
      code: `from collections import deque

def light_fill_time(grid, sources):
    rows = len(grid)
    cols = len(grid[0])
    dist = []
    for _ in range(rows):
        row = []
        for _ in range(cols):
            row.append(-1)
        dist.append(row)
    queue = deque()
    for s in sources:
        sr = s[0]
        sc = s[1]
        dist[sr][sc] = 0
        queue.append((sr, sc))

    while len(queue) > 0:
        r, c = queue.popleft()
        cur_d = dist[r][c]
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr = r + dr
            nc = c + dc
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
                if dist[nr][nc] == -1:
                    dist[nr][nc] = cur_d + 1
                    queue.append((nr, nc))

    max_d = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 0 and dist[r][c] > max_d:
                max_d = dist[r][c]
    return max_d
`,
    },
    {
      id: 'MULTI-SUMS-ALL-DISTANCES',
      expectedFailingGroup: 'distance_metric',
      code: `from collections import deque

def light_fill_time(grid, sources):
    rows = len(grid)
    cols = len(grid[0])
    dist = []
    for _ in range(rows):
        row = []
        for _ in range(cols):
            row.append(-1)
        dist.append(row)
    queue = deque()
    for s in sources:
        sr = s[0]
        sc = s[1]
        dist[sr][sc] = 0
        queue.append((sr, sc))

    while len(queue) > 0:
        r, c = queue.popleft()
        cur_d = dist[r][c]
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr = r + dr
            nc = c + dc
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
                if dist[nr][nc] == -1:
                    dist[nr][nc] = cur_d + 1
                    queue.append((nr, nc))

    total = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 0:
                if dist[r][c] == -1:
                    return -1
                total = total + dist[r][c]
    return total
`,
    },
  ],
  hiddenTests: [
    {
      inputs: {
        grid: [[0, 0, 0, 0, 0, 0]],
        sources: [[0, 0], [0, 5]],
      },
      expected: 2,
      group: 'two_source_meeting',
    },
    {
      inputs: {
        grid: [
          [0, 0, 0, 0, 0],
          [0, 1, 1, 1, 0],
          [0, 1, 0, 1, 0],
          [0, 1, 1, 1, 0],
          [0, 0, 0, 0, 0],
        ],
        sources: [[0, 0]],
      },
      expected: -1,
      group: 'unreachable_cells',
    },
    {
      inputs: {
        grid: [
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
        ],
        sources: [[0, 0], [2, 2]],
      },
      expected: 2,
      group: 'distance_metric',
    },
    {
      inputs: {
        grid: [[0, 0, 0]],
        sources: [[0, 0]],
      },
      expected: 2,
      group: 'distance_metric',
    },
    {
      inputs: {
        grid: [[0, 0]],
        sources: [[0, 0], [0, 1]],
      },
      expected: 0,
      group: 'two_source_meeting',
    },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_grid_086_1',
      title: '다중 시작점 동시 확산 불변식',
      prompt: '동시 시작 원리와 도달 불가능 판정을 점검하세요.',
      questions: [
        {
          id: 'q1',
          text: '여러 광원에서 동시에 빛이 출발할 때 각 시작점의 거리를 0으로 두는 이유는 무엇일까요?',
          options: [
            { value: 'same_time', label: '모든 광원이 같은 시점(0초)에 동시에 켜지기 때문' },
            { value: 'single_source', label: '광원 하나만 동작시키기 위해' },
          ],
          expected: 'same_time',
        },
        {
          id: 'q2',
          text: '벽으로 가로막혀 어떤 광원의 빛도 도달하지 못한 열린 칸이 격자에 남아있다면 반환해야 할 값은?',
          options: [
            { value: 'minus_one', label: '-1 (전체 도달 불가능)' },
            { value: 'reached_max', label: '도달한 칸들 중 최댓값' },
          ],
          expected: 'minus_one',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_grid_086_transfer_1',
      title: '비상 방송 도달 시간',
      description: '건물 격자 grid(0: 방, 1: 벽)와 비상 방송국 위치 stations([[r, c], ...])가 주어질 때, 모든 열린 방에 비상 안내가 전달되는 최소 시간(초)을 계산하세요. 도달할 수 없는 방이 있으면 -1을 반환합니다.',
      entryFunction: 'emergency_broadcast_time',
      starterCode: `from collections import deque

def emergency_broadcast_time(grid, stations):
    # 모든 방송국에서 동시에 안내가 퍼져나갈 때 전체 방에 닿는 시간을 계산하세요.
    pass
`,
      officialSolutionCode: `from collections import deque

def emergency_broadcast_time(grid, stations):
    rows = len(grid)
    cols = len(grid[0])
    dist = []
    for _ in range(rows):
        row = []
        for _ in range(cols):
            row.append(-1)
        dist.append(row)
    queue = deque()
    for s in stations:
        sr = s[0]
        sc = s[1]
        dist[sr][sc] = 0
        queue.append((sr, sc))

    while len(queue) > 0:
        r, c = queue.popleft()
        cur_d = dist[r][c]
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr = r + dr
            nc = c + dc
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
                if dist[nr][nc] == -1:
                    dist[nr][nc] = cur_d + 1
                    queue.append((nr, nc))

    max_d = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 0:
                if dist[r][c] == -1:
                    return -1
                if dist[r][c] > max_d:
                    max_d = dist[r][c]
    return max_d
`,
      contextCard: {
        title: '📢 비상 방송 동시 전파',
        strategyGuide: '모든 방송국 좌표를 변수로 추출해 거리 0으로 큐에 넣고 동시 확산합니다. 도달하지 못한 방이 있으면 -1을 반환합니다.',
      },
      thoughtCheck: {
        question: '열린 방이 3개 있고 방송국이 그 3개 방 모두에 설치되어 있다면 방송 도달 시간은 얼마일까요?',
        options: [
          { value: 'zero', label: '0초 (시작과 동시에 모든 방에 이미 방송국이 있음)' },
          { value: 'three', label: '3초' },
        ],
        expected: 'zero',
      },
      testCases: [
        {
          inputs: {
            grid: [
              [0, 0, 0, 0],
              [0, 1, 1, 0],
              [0, 0, 0, 0],
            ],
            stations: [[0, 0], [2, 3]],
          },
          expected: 2,
        },
        {
          inputs: {
            grid: [
              [0, 1, 0],
              [1, 1, 1],
              [0, 0, 0],
            ],
            stations: [[2, 0]],
          },
          expected: -1,
        },
        {
          inputs: {
            grid: [[0]],
            stations: [[0, 0]],
          },
          expected: 0,
        },
      ],
    },
  ],
}
