/** Server-only definition: AC-CAP-RESCUE-99. */
module.exports = {
  problemId: 'AC-CAP-RESCUE-99',
  problemVersion: 1,
  entryFunction: 'rescue_route_total',
  starterCode: `from collections import deque

def rescue_route_total(grid, start, targets):
    # 현재 위치에서 가장 가까운 미완 목표로 이동하는 과정을 반복해 총 이동 거리를 반환하세요.
    pass
`,
  officialSolutionCode: `from collections import deque

def rescue_route_total(grid, start, targets):
    rows = len(grid)
    cols = len(grid[0])
    num_targets = len(targets)
    served = []
    for _ in range(num_targets):
        served.append(False)
    total_distance = 0
    cur_r = start[0]
    cur_c = start[1]
    for _ in range(num_targets):
        q = deque([(cur_r, cur_c, 0)])
        visited = {(cur_r, cur_c)}
        best_idx = -1
        best_dist = 999999
        while len(q) > 0:
            r, c, d = q.popleft()
            matched_idx = -1
            for k in range(num_targets):
                if not served[k]:
                    t = targets[k]
                    tr = t[0]
                    tc = t[1]
                    if r == tr and c == tc:
                        matched_idx = k
            if matched_idx != -1:
                best_idx = matched_idx
                best_dist = d
                q = deque()
            else:
                for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    nr = r + dr
                    nc = c + dc
                    if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
                        if (nr, nc) not in visited:
                            visited.add((nr, nc))
                            q.append((nr, nc, d + 1))
        if best_idx != -1:
            served[best_idx] = True
            total_distance = total_distance + best_dist
            t_chosen = targets[best_idx]
            cur_r = t_chosen[0]
            cur_c = t_chosen[1]
    return total_distance
`,
  alternativeSolutions: [
    `from collections import deque

def rescue_route_total(grid, start, targets):
    R = len(grid)
    C = len(grid[0])
    num_targets = len(targets)
    done = []
    for _ in range(num_targets):
        done.append(False)
    tot = 0
    cur_r = start[0]
    cur_c = start[1]
    for _ in range(num_targets):
        q = deque([(cur_r, cur_c, 0)])
        vis = {(cur_r, cur_c)}
        found_target = -1
        found_dist = 0
        while len(q) > 0:
            r, c, d = q.popleft()
            matched = -1
            for i in range(num_targets):
                if not done[i]:
                    target = targets[i]
                    tr = target[0]
                    tc = target[1]
                    if r == tr and c == tc:
                        matched = i
            if matched != -1:
                found_target = matched
                found_dist = d
                q = deque()
            else:
                for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    nr = r + dr
                    nc = c + dc
                    if 0 <= nr < R and 0 <= nc < C and grid[nr][nc] == 0:
                        if (nr, nc) not in vis:
                            vis.add((nr, nc))
                            q.append((nr, nc, d + 1))
        if found_target != -1:
            done[found_target] = True
            tot = tot + found_dist
            t_chosen = targets[found_target]
            cur_r = t_chosen[0]
            cur_c = t_chosen[1]
    return tot
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'MANHATTAN-DISTANCE',
      expectedFailingGroup: 'wall_navigation',
      code: `def rescue_route_total(grid, start, targets):
    # Calculates Manhattan distance directly, ignoring walls
    num_targets = len(targets)
    served = []
    for _ in range(num_targets):
        served.append(False)
    total_distance = 0
    cur_r = start[0]
    cur_c = start[1]
    for _ in range(num_targets):
        best_idx = -1
        best_dist = 999999
        for k in range(num_targets):
            if not served[k]:
                t = targets[k]
                tr = t[0]
                tc = t[1]
                d = abs(tr - cur_r) + abs(tc - cur_c)
                if d < best_dist:
                    best_dist = d
                    best_idx = k
        if best_idx != -1:
            served[best_idx] = True
            total_distance = total_distance + best_dist
            t_chosen = targets[best_idx]
            cur_r = t_chosen[0]
            cur_c = t_chosen[1]
    return total_distance
`,
    },
    {
      id: 'RESET-START-EACH-TIME',
      expectedFailingGroup: 'chained_movement',
      code: `from collections import deque

def rescue_route_total(grid, start, targets):
    rows = len(grid)
    cols = len(grid[0])
    num_targets = len(targets)
    served = []
    for _ in range(num_targets):
        served.append(False)
    total_distance = 0
    for _ in range(num_targets):
        # Restarts from original start each time
        cur_r = start[0]
        cur_c = start[1]
        q = deque([(cur_r, cur_c, 0)])
        visited = {(cur_r, cur_c)}
        best_idx = -1
        best_dist = 999999
        while len(q) > 0:
            r, c, d = q.popleft()
            matched_idx = -1
            for k in range(num_targets):
                if not served[k]:
                    t = targets[k]
                    tr = t[0]
                    tc = t[1]
                    if r == tr and c == tc:
                        matched_idx = k
            if matched_idx != -1:
                best_idx = matched_idx
                best_dist = d
                q = deque()
            else:
                for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    nr = r + dr
                    nc = c + dc
                    if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
                        if (nr, nc) not in visited:
                            visited.add((nr, nc))
                            q.append((nr, nc, d + 1))
        if best_idx != -1:
            served[best_idx] = True
            total_distance = total_distance + best_dist
    return total_distance
`,
    },
    {
      id: 'VISIT-ONE-TARGET',
      expectedFailingGroup: 'target_completion',
      code: `from collections import deque

def rescue_route_total(grid, start, targets):
    rows = len(grid)
    cols = len(grid[0])
    q = deque([(start[0], start[1], 0)])
    visited = {(start[0], start[1])}
    while len(q) > 0:
        r, c, d = q.popleft()
        for t in targets:
            if r == t[0] and c == t[1]:
                return d
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr = r + dr
            nc = c + dc
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
                if (nr, nc) not in visited:
                    visited.add((nr, nc))
                    q.append((nr, nc, d + 1))
    return 0
`,
    },
    {
      // served 표시를 잊는 오개념: 완료된 목표를 계속 후보로 두므로 현재 위치에서
      // 거리 0인 같은 목표를 다시 선택해 총거리가 "시작점에서 가장 가까운 목표까지
      // 거리"로 붕괴한다. 목표 1개(wall_navigation)에서는 정답과 같아 보이는 것이
      // 이 오개념의 함정이다.
      id: 'FORGETS-SERVED',
      expectedFailingGroup: 'served_tracking',
      code: `from collections import deque

def rescue_route_total(grid, start, targets):
    rows = len(grid)
    cols = len(grid[0])
    num_targets = len(targets)
    total_distance = 0
    cur_r = start[0]
    cur_c = start[1]
    for _ in range(num_targets):
        q = deque([(cur_r, cur_c, 0)])
        visited = {(cur_r, cur_c)}
        best_idx = -1
        best_dist = 999999
        while len(q) > 0:
            r, c, d = q.popleft()
            matched_idx = -1
            for k in range(num_targets):
                t = targets[k]
                tr = t[0]
                tc = t[1]
                if r == tr and c == tc:
                    matched_idx = k
            if matched_idx != -1:
                best_idx = matched_idx
                best_dist = d
                q = deque()
            else:
                for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    nr = r + dr
                    nc = c + dc
                    if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
                        if (nr, nc) not in visited:
                            visited.add((nr, nc))
                            q.append((nr, nc, d + 1))
        if best_idx != -1:
            nt = targets[best_idx]
            cur_r = nt[0]
            cur_c = nt[1]
            total_distance = total_distance + best_dist
    return total_distance
`,
    },
  ],
  hiddenTests: [
    {
      inputs: {
        grid: [
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
        ],
        start: [0, 0],
        targets: [[0, 2], [2, 2]],
      },
      expected: 4,
      group: 'target_completion',
    },
    {
      inputs: {
        grid: [
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
        start: [0, 0],
        targets: [[0, 1], [0, 2], [0, 3]],
      },
      expected: 3,
      group: 'chained_movement',
    },
    {
      inputs: {
        grid: [
          [0, 1, 0],
          [0, 1, 0],
          [0, 0, 0],
        ],
        start: [0, 0],
        targets: [[0, 2]],
      },
      expected: 6,
      group: 'wall_navigation',
    },
    {
      inputs: {
        grid: [
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
        ],
        start: [0, 0],
        targets: [[0, 1], [2, 1]],
      },
      expected: 3,
      group: 'served_tracking',
    },
    {
      inputs: {
        grid: [
          [0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0],
        ],
        start: [0, 0],
        // 최대 격자 유지·목표 2개: 목표 3개(2+2+6=10)는 RESET-START-EACH-TIME
        // fixture의 누적 step을 저작 예산 20,000 위로 밀어 올려 "값 불일치"가 아닌
        // "예산 소진"으로 기각되게 만든다. 3목표 연쇄는 chained_movement(2×4×3)가
        // 이미 커버하므로 최대 격자는 2목표로 유지한다 (정답 2+8=10 동일).
        targets: [[0, 2], [5, 5]],
      },
      expected: 10,
      group: 'large_scale',
    },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_cap_099_1',
      title: '연쇄 BFS와 탐욕 선택의 특성',
      prompt: '가장 가까운 목표를 순차 방문하는 전략의 특성을 점검하세요.',
      questions: [
        {
          id: 'q1',
          text: '가장 가까운 목표부터 방문하는 방식이 전체 가능한 모든 경로 중 수학적으로 절대적인 최적 거리를 항상 보장할까요?',
          options: [
            { value: 'greedy_not_always_global', label: '아니다 — 눈앞의 최단 선택이 나중에 더 먼 이동을 초래할 수도 있는 탐욕적 근사 전략이다' },
            { value: 'always_global', label: '항상 우주 최고의 최단 경로를 보장한다' },
          ],
          expected: 'greedy_not_always_global',
        },
        {
          id: 'q2',
          text: '이미 구조한 목표를 대기열 탐색 대상에서 제외하기 위해 관리하는 방법은?',
          options: [
            { value: 'served_list', label: '각 목표의 완료 여부를 기록하는 served 불리언 목록' },
            { value: 'ignore', label: '특별히 기록하지 않는다' },
          ],
          expected: 'served_list',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_cap_099_transfer_1',
      title: '정비소 순회 점검 총 거리',
      description: '기지 지도 grid, 점검 시작점 start, 정비소 좌표 stations가 주어질 때, 가장 가까운 정비소부터 순서대로 모두 순회 점검하는 총 이동 거리를 구하세요.',
      entryFunction: 'maintain_stations_total',
      starterCode: `from collections import deque

def maintain_stations_total(grid, start, stations):
    # 가장 가까운 미점검 정비소로 연쇄 이동하는 총 이동 거리를 반환하세요.
    pass
`,
      officialSolutionCode: `from collections import deque

def maintain_stations_total(grid, start, stations):
    rows = len(grid)
    cols = len(grid[0])
    num_targets = len(stations)
    served = []
    for _ in range(num_targets):
        served.append(False)
    total_distance = 0
    cur_r = start[0]
    cur_c = start[1]
    for _ in range(num_targets):
        q = deque([(cur_r, cur_c, 0)])
        visited = {(cur_r, cur_c)}
        best_idx = -1
        best_dist = 999999
        while len(q) > 0:
            r, c, d = q.popleft()
            matched_idx = -1
            for k in range(num_targets):
                if not served[k]:
                    t = stations[k]
                    tr = t[0]
                    tc = t[1]
                    if r == tr and c == tc:
                        matched_idx = k
            if matched_idx != -1:
                best_idx = matched_idx
                best_dist = d
                q = deque()
            else:
                for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    nr = r + dr
                    nc = c + dc
                    if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
                        if (nr, nc) not in visited:
                            visited.add((nr, nc))
                            q.append((nr, nc, d + 1))
        if best_idx != -1:
            served[best_idx] = True
            total_distance = total_distance + best_dist
            t_chosen = stations[best_idx]
            cur_r = t_chosen[0]
            cur_c = t_chosen[1]
    return total_distance
`,
      contextCard: {
        title: '🔧 정비소 순회 점검',
        strategyGuide: '현재 정비소에서 BFS로 가장 가까운 미점검 정비소를 찾아 이동하고 완료 표시를 남깁니다.',
      },
      thoughtCheck: {
        question: '정비소가 1곳일 때의 총 이동 거리는?',
        options: [
          { value: 'single_bfs', label: '시작점에서 해당 정비소까지의 BFS 최단 거리' },
          { value: 'zero_dist', label: '0' },
        ],
        expected: 'single_bfs',
      },
      testCases: [
        {
          inputs: {
            grid: [
              [0, 0],
              [0, 0],
            ],
            start: [0, 0],
            stations: [[1, 1]],
          },
          expected: 2,
        },
        {
          inputs: {
            grid: [
              [0, 0, 0],
              [0, 0, 0],
            ],
            start: [0, 0],
            stations: [[0, 1], [0, 2]],
          },
          expected: 2,
        },
        {
          inputs: {
            grid: [
              [0, 1, 0],
              [0, 1, 0],
              [0, 0, 0],
            ],
            start: [0, 0],
            stations: [[0, 2]],
          },
          expected: 6,
        },
      ],
    },
  ],
}
