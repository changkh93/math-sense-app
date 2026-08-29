/**
 * Private Problem Definition: AC-NAV-006 (Nebula Shortest Path / BFS)
 * Focus: 2D Grid BFS Shortest Path, Visited Invariant, Deque Queue
 */

module.exports = {
  problemId: 'AC-NAV-006',
  version: 1,
  checksum: 'sha256:ac_nav_006_v1_auth_2026',
  entryFunction: 'shortest_path',
  canonicalStrategy: 'BFS on unweighted grid using deque and visited set',
  officialSolutionCode: `from collections import deque\n\ndef shortest_path(grid, start, target):\n    if start[0] == target[0] and start[1] == target[1]:\n        return 0\n    rows = len(grid)\n    cols = len(grid[0])\n    queue = deque([(start[0], start[1], 0)])\n    visited = {(start[0], start[1])}\n\n    while queue:\n        r, c, dist = queue.popleft()\n        if r == target[0] and c == target[1]:\n            return dist\n        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:\n            nr = r + dr\n            nc = c + dc\n            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:\n                if (nr, nc) not in visited:\n                    visited.add((nr, nc))\n                    queue.append((nr, nc, dist + 1))\n    return -1\n`,
  alternativeSolutions: [
    `from collections import deque\n\ndef shortest_path(grid, start, target):\n    sr = start[0]\n    sc = start[1]\n    tr = target[0]\n    tc = target[1]\n    if sr == tr and sc == tc:\n        return 0\n    R = len(grid)\n    C = len(grid[0])\n    q = deque([(sr, sc, 0)])\n    vis = {(sr, sc)}\n    while q:\n        r, c, d = q.popleft()\n        if r == tr and c == tc:\n            return d\n        for nr, nc in [(r-1, c), (r+1, c), (r, c-1), (r, c+1)]:\n            if 0 <= nr < R and 0 <= nc < C and grid[nr][nc] == 0 and (nr, nc) not in vis:\n                vis.add((nr, nc))\n                q.append((nr, nc, d + 1))\n    return -1\n`,
  ],
  intendedWrongSolutions: [
    {
      id: 'wrong_dfs_stack_pop_instead_of_queue',
      misconceptionCode: 'BFS-POP-LAST-01',
      code: `from collections import deque\n\ndef shortest_path(grid, start, target):\n    if start[0] == target[0] and start[1] == target[1]: return 0\n    rows, cols = len(grid), len(grid[0])\n    queue = deque([(start[0], start[1], 0)])\n    visited = {(start[0], start[1])}\n    while queue:\n        r, c, dist = queue.pop()\n        if r == target[0] and c == target[1]: return dist\n        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:\n            nr, nc = r + dr, c + dc\n            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:\n                if (nr, nc) not in visited:\n                    visited.add((nr, nc))\n                    queue.append((nr, nc, dist + 1))\n    return -1\n`,
      expectedFailureGroup: 'branching_shortest_path',
    },
    {
      id: 'wrong_always_manhattan_distance',
      misconceptionCode: 'NAV-OBSTACLE-IGNORE-02',
      code: `def shortest_path(grid, start, target):\n    return abs(start[0] - target[0]) + abs(start[1] - target[1])\n`,
      expectedFailureGroup: 'blocked_and_detour',
    },
  ],
  publicTests: [
    {
      id: 'p1',
      inputs: {
        grid: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
        start: [0, 0],
        target: [2, 2],
      },
      expected: 4,
    },
    {
      id: 'p2',
      inputs: {
        grid: [[0, 1], [1, 0]],
        start: [0, 0],
        target: [1, 1],
      },
      expected: -1,
    },
    {
      id: 'p3',
      inputs: {
        grid: [[0]],
        start: [0, 0],
        target: [0, 0],
      },
      expected: 0,
    },
    {
      id: 'p4',
      inputs: {
        grid: [[0, 0, 1], [1, 0, 0], [1, 1, 0]],
        start: [0, 0],
        target: [2, 2],
      },
      expected: 4,
    },
  ],
  hiddenTests: [
    {
      id: 'h1',
      inputs: {
        grid: [
          [0, 0, 0],
          [0, 1, 0],
          [0, 0, 0],
        ],
        start: [0, 0],
        target: [2, 0],
      },
      expected: 2,
      group: 'branching_shortest_path',
    },
    {
      id: 'h1_snake',
      inputs: {
        grid: [
          [0, 0, 0, 0],
          [1, 1, 1, 0],
          [0, 0, 0, 0],
          [0, 1, 1, 1],
          [0, 0, 0, 0],
        ],
        start: [0, 0],
        target: [4, 3],
      },
      expected: 13,
      group: 'branching_shortest_path',
    },
    {
      id: 'h2',
      inputs: {
        grid: [
          [0, 1, 0],
          [0, 1, 0],
          [0, 0, 0],
        ],
        start: [0, 0],
        target: [0, 2],
      },
      expected: 6,
      group: 'blocked_and_detour',
    },
    {
      id: 'h3',
      inputs: {
        grid: [
          [0, 1],
          [1, 0],
        ],
        start: [0, 0],
        target: [1, 1],
      },
      expected: -1,
      group: 'unreachable_target',
    },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_nav_06_01',
      type: 'bfs_visited_prediction',
      prompt: '너비 우선 탐색(BFS)의 최단 경로 원리를 점검하세요.',
      questions: [
        { id: 'q1', text: 'BFS는 시작점부터 가까운 칸(거리 1, 거리 2...) 순서로 퍼져나가므로 가장 먼저 도달했을 때가 최단 경로인가요?', expected: true },
        { id: 'q2', text: '이미 방문한 칸을 visited에 기록하지 않으면 사이클이 있는 지도에서 무한 루프에 빠질 수 있나요?', expected: true },
      ],
    },
  ],
  transferChallenges: [
    {
      transferChallengeId: 'AC-NAV-006-T1',
      title: '연구소 바이러스 확산 단계',
      description: '바이러스가 시작 방(start)에서 확산될 때, 목표 방(target)까지 번지는 데 걸리는 최소 단계(초)를 계산하세요. 벽(1)은 통과할 수 없으며, 도달할 수 없으면 -1을 반환합니다.',
      entryFunction: 'virus_spread_steps',
      starterCode: `from collections import deque\n\ndef virus_spread_steps(grid, start, target):\n    # 최소 확산 단계(BFS 최단거리)를 계산하는 코드를 작성해 보세요.\n    pass\n`,
      testCases: [
        {
          inputs: {
            grid: [[0, 0, 0], [0, 1, 0], [0, 0, 0]],
            start: [0, 0],
            target: [2, 2],
          },
          expected: 4,
        },
        {
          inputs: {
            grid: [[0, 1], [1, 0]],
            start: [0, 0],
            target: [1, 1],
          },
          expected: -1,
        },
      ],
    },
  ],
  get transferMasterSet() {
    return this.transferChallenges
  },
}
