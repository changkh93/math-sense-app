/** Server-only definition: AC-GRAPH-REACH-88. */
module.exports = {
  problemId: 'AC-GRAPH-REACH-88',
  problemVersion: 1,
  entryFunction: 'reachable_stations',
  officialSolutionCode: `from collections import deque

def reachable_stations(network, start):
    queue = deque([start])
    visited = {start}
    order = []
    while len(queue) > 0:
        node = queue.popleft()
        order.append(node)
        for neighbor in network[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
    return order
`,
  alternativeSolutions: [
    `from collections import deque

def reachable_stations(network, start):
    q = deque()
    q.append(start)
    vis = set([start])
    res = []
    while len(q) > 0:
        curr = q.popleft()
        res.append(curr)
        for nxt in network[curr]:
            if nxt not in vis:
                vis.add(nxt)
                q.append(nxt)
    return res
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'REACH-DIRECT-NEIGHBORS-ONLY',
      expectedFailingGroup: 'multihop_reachability',
      code: `def reachable_stations(network, start):
    res = [start]
    for nb in network[start]:
        res.append(nb)
    return res
`,
    },
    {
      id: 'REACH-RETURNS-ALL-NODES',
      expectedFailingGroup: 'disconnected_graph',
      code: `def reachable_stations(network, start):
    return list(range(len(network)))
`,
    },
    {
      id: 'REACH-STACK-LIFO-ORDER',
      expectedFailingGroup: 'multihop_reachability',
      code: `from collections import deque

def reachable_stations(network, start):
    queue = deque([start])
    visited = {start}
    order = []
    while len(queue) > 0:
        node = queue.pop()
        order.append(node)
        for neighbor in network[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
    return order
`,
    },
  ],
  hiddenTests: [
    {
      inputs: {
        network: [[1], [2], [3], []],
        start: 0,
      },
      expected: [0, 1, 2, 3],
      group: 'multihop_reachability',
    },
    {
      inputs: {
        network: [[1], [0, 2], [1, 0]],
        start: 0,
      },
      expected: [0, 1, 2],
      group: 'multihop_reachability',
    },
    {
      inputs: {
        network: [[1], [0], [3], [2]],
        start: 0,
      },
      expected: [0, 1],
      group: 'disconnected_graph',
    },
    {
      inputs: {
        network: [[2, 1], [0], [0]],
        start: 0,
      },
      expected: [0, 2, 1],
      group: 'multihop_reachability',
    },
    {
      inputs: {
        network: [[]],
        start: 0,
      },
      expected: [0],
      group: 'disconnected_graph',
    },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_graph_088_1',
      title: '그래프 도달성과 BFS 순서 원리',
      prompt: '그래프 탐색 순서와 분리된 그래프의 처리를 점검하세요.',
      questions: [
        {
          id: 'q1',
          text: '어떤 기지가 start와 전혀 연결되어 있지 않다면 그 기지는 반환 결과에 포함될까요?',
          options: [
            { value: 'no', label: '아니다 — 도달 가능한 기지만 결과에 포함된다' },
            { value: 'yes', label: '맞다 — 전체 기지가 모두 포함된다' },
          ],
          expected: 'no',
        },
        {
          id: 'q2',
          text: 'BFS 탐색 결과에서 방문 순서가 결정되는 기준은 무엇일까요?',
          options: [
            { value: 'distance_and_list_order', label: '시작점으로부터의 거리 순서 및 인접 목록에 적힌 이웃 순서' },
            { value: 'node_number_sorted', label: '기지 번호의 오름차순' },
          ],
          expected: 'distance_and_list_order',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_graph_088_transfer_1',
      title: '통신 가능한 모듈 수 세기',
      description: '우주선의 모듈 연결망 connections(인접 목록)과 시작 모듈 start가 주어질 때, start에서 통신 신호가 도달할 수 있는 총 모듈 수(시작 모듈 포함)를 반환하세요.',
      entryFunction: 'reachable_modules',
      starterCode: `from collections import deque

def reachable_modules(connections, start):
    # 도달 가능한 모듈의 총 개수(정수)를 반환하세요.
    pass
`,
      officialSolutionCode: `from collections import deque

def reachable_modules(connections, start):
    queue = deque([start])
    visited = {start}
    count = 0
    while len(queue) > 0:
        node = queue.popleft()
        count = count + 1
        for neighbor in connections[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
    return count
`,
      contextCard: {
        title: '🛰️ 통신 가능 모듈 개수 계산',
        strategyGuide: 'BFS로 연결된 모든 모듈을 탐색한 뒤, 방문한 총 모듈 수(정수)를 반환합니다.',
      },
      thoughtCheck: {
        question: '시작 모듈 start에 연결된 다른 모듈이 하나도 없다면 반환해야 하는 개수는?',
        options: [
          { value: 'one', label: '1 (시작 모듈 자신 1개)' },
          { value: 'zero', label: '0' },
        ],
        expected: 'one',
      },
      testCases: [
        {
          inputs: {
            connections: [[1, 2], [0, 3], [0], [1], [5], [4]],
            start: 0,
          },
          expected: 4,
        },
        {
          inputs: {
            connections: [[], [2], [1]],
            start: 1,
          },
          expected: 2,
        },
        {
          inputs: {
            connections: [[1], [2], [3], [0]],
            start: 2,
          },
          expected: 4,
        },
      ],
    },
  ],
}
