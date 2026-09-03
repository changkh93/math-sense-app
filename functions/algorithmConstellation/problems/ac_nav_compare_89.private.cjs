/** Server-only definition: AC-NAV-COMPARE-89. */
module.exports = {
  problemId: 'AC-NAV-COMPARE-89',
  problemVersion: 1,
  entryFunction: 'compare_search_orders',
  officialSolutionCode: `from collections import deque

def compare_search_orders(network, start):
    q = deque([start])
    v_bfs = {start}
    bfs_order = []
    while len(q) > 0:
        u = q.popleft()
        bfs_order.append(u)
        for nb in network[u]:
            if nb not in v_bfs:
                v_bfs.add(nb)
                q.append(nb)

    stack = [start]
    v_dfs = {start}
    dfs_order = []
    while len(stack) > 0:
        u = stack.pop()
        dfs_order.append(u)
        neighbors = network[u]
        k = len(neighbors)
        while k > 0:
            k = k - 1
            nb = neighbors[k]
            if nb not in v_dfs:
                v_dfs.add(nb)
                stack.append(nb)

    return [bfs_order, dfs_order]
`,
  alternativeSolutions: [
    `from collections import deque

def compare_search_orders(network, start):
    # BFS
    bfs_res = []
    q = deque([start])
    v1 = set([start])
    while len(q) > 0:
        curr = q.popleft()
        bfs_res.append(curr)
        for nxt in network[curr]:
            if nxt not in v1:
                v1.add(nxt)
                q.append(nxt)
    # DFS
    dfs_res = []
    st = [start]
    v2 = set([start])
    while len(st) > 0:
        curr = st.pop()
        dfs_res.append(curr)
        nbrs = network[curr]
        for idx in range(len(nbrs) - 1, -1, -1):
            nxt = nbrs[idx]
            if nxt not in v2:
                v2.add(nxt)
                st.append(nxt)
    return [bfs_res, dfs_res]
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'COMPARE-DFS-FORWARD-PUSH',
      expectedFailingGroup: 'branching_divergence',
      code: `from collections import deque

def compare_search_orders(network, start):
    q = deque([start])
    v_bfs = {start}
    bfs_order = []
    while len(q) > 0:
        u = q.popleft()
        bfs_order.append(u)
        for nb in network[u]:
            if nb not in v_bfs:
                v_bfs.add(nb)
                q.append(nb)

    stack = [start]
    v_dfs = {start}
    dfs_order = []
    while len(stack) > 0:
        u = stack.pop()
        dfs_order.append(u)
        for nb in network[u]:
            if nb not in v_dfs:
                v_dfs.add(nb)
                stack.append(nb)

    return [bfs_order, dfs_order]
`,
    },
    {
      id: 'COMPARE-BOTH-BFS',
      expectedFailingGroup: 'branching_divergence',
      code: `from collections import deque

def compare_search_orders(network, start):
    q = deque([start])
    v_bfs = {start}
    bfs_order = []
    while len(q) > 0:
        u = q.popleft()
        bfs_order.append(u)
        for nb in network[u]:
            if nb not in v_bfs:
                v_bfs.add(nb)
                q.append(nb)
    return [bfs_order, bfs_order]
`,
    },
    {
      id: 'COMPARE-SHARED-VISITED',
      expectedFailingGroup: 'independent_traversals',
      code: `from collections import deque

def compare_search_orders(network, start):
    vis = {start}
    q = deque([start])
    bfs_order = []
    while len(q) > 0:
        u = q.popleft()
        bfs_order.append(u)
        for nb in network[u]:
            if nb not in vis:
                vis.add(nb)
                q.append(nb)

    stack = [start]
    dfs_order = []
    while len(stack) > 0:
        u = stack.pop()
        dfs_order.append(u)
        neighbors = network[u]
        k = len(neighbors)
        while k > 0:
            k = k - 1
            nb = neighbors[k]
            if nb not in vis:
                vis.add(nb)
                stack.append(nb)

    return [bfs_order, dfs_order]
`,
    },
  ],
  hiddenTests: [
    {
      inputs: {
        network: [[1, 2, 3], [4], [], [], []],
        start: 0,
      },
      expected: [
        [0, 1, 2, 3, 4],
        [0, 1, 4, 2, 3],
      ],
      group: 'branching_divergence',
    },
    {
      inputs: {
        network: [[1, 2], [0, 3], [0], [1]],
        start: 0,
      },
      expected: [
        [0, 1, 2, 3],
        [0, 1, 3, 2],
      ],
      group: 'independent_traversals',
    },
    {
      inputs: {
        network: [[1], [2], [3], []],
        start: 0,
      },
      expected: [
        [0, 1, 2, 3],
        [0, 1, 2, 3],
      ],
      group: 'branching_divergence',
    },
    {
      inputs: {
        network: [[1, 2], [3, 4], [], [], []],
        start: 0,
      },
      expected: [
        [0, 1, 2, 3, 4],
        [0, 1, 3, 4, 2],
      ],
      group: 'branching_divergence',
    },
    {
      inputs: {
        network: [[]],
        start: 0,
      },
      expected: [[0], [0]],
      group: 'independent_traversals',
    },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_nav_089_1',
      title: 'BFS와 DFS 순서 차이 원리',
      prompt: '자료구조가 만드는 탐색 순서의 차이를 점검하세요.',
      questions: [
        {
          id: 'q1',
          text: '갈림길에서 BFS와 DFS의 방문 순서가 달라지는 핵심 이유는 무엇일까요?',
          options: [
            { value: 'queue_vs_stack', label: 'BFS는 큐(선입선출)로 층별 탐색하고, DFS는 스택(후입선출)으로 깊이 탐색하기 때문' },
            { value: 'graph_change', label: '그래프의 연결선이 달라지기 때문' },
          ],
          expected: 'queue_vs_stack',
        },
        {
          id: 'q2',
          text: '일직선으로 이어진 선형 그래프(예: 0 -> 1 -> 2)에서는 BFS와 DFS의 방문 순서가 어떨까요?',
          options: [
            { value: 'identical', label: '갈림길이 없으므로 두 탐색의 방문 순서가 동일하다' },
            { value: 'always_different', label: '무조건 반대로 나온다' },
          ],
          expected: 'identical',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_nav_089_transfer_1',
      title: '행성 순찰 경로 비교',
      description: '행성 통신망 network와 출발 행성 start가 주어질 때, 가까운 기지 우선 순찰 경로(BFS)와 한 갈래 깊이 우선 순찰 경로(DFS)를 [bfs_path, dfs_path] 형태로 반환하세요.',
      entryFunction: 'compare_planet_patrols',
      starterCode: `from collections import deque

def compare_planet_patrols(network, start):
    # [bfs_path, dfs_path]를 반환하세요.
    pass
`,
      officialSolutionCode: `from collections import deque

def compare_planet_patrols(network, start):
    q = deque([start])
    v_bfs = {start}
    bfs_order = []
    while len(q) > 0:
        u = q.popleft()
        bfs_order.append(u)
        for nb in network[u]:
            if nb not in v_bfs:
                v_bfs.add(nb)
                q.append(nb)

    stack = [start]
    v_dfs = {start}
    dfs_order = []
    while len(stack) > 0:
        u = stack.pop()
        dfs_order.append(u)
        neighbors = network[u]
        k = len(neighbors)
        while k > 0:
            k = k - 1
            nb = neighbors[k]
            if nb not in v_dfs:
                v_dfs.add(nb)
                stack.append(nb)

    return [bfs_order, dfs_order]
`,
      contextCard: {
        title: '🪐 행성 순찰 전략 비교',
        strategyGuide: 'BFS는 큐로 가까운 행성부터 순찰하고, DFS는 스택(이웃 역순 삽입)으로 깊이 방향 행성부터 순찰합니다.',
      },
      thoughtCheck: {
        question: '시작 행성에 연결된 이웃이 없는 외딴 행성(start)이라면 반환 결과는?',
        options: [
          { value: 'single', label: '[[start], [start]]' },
          { value: 'empty', label: '[[], []]' },
        ],
        expected: 'single',
      },
      testCases: [
        {
          inputs: {
            network: [[1, 2], [3], [4], [], []],
            start: 0,
          },
          expected: [
            [0, 1, 2, 3, 4],
            [0, 1, 3, 2, 4],
          ],
        },
        {
          inputs: {
            network: [[1], [0, 2], [1]],
            start: 0,
          },
          expected: [
            [0, 1, 2],
            [0, 1, 2],
          ],
        },
        {
          inputs: {
            network: [[]],
            start: 0,
          },
          expected: [[0], [0]],
        },
      ],
    },
  ],
}
