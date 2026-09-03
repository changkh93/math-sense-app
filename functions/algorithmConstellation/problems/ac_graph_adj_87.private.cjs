/** Server-only definition: AC-GRAPH-ADJ-87. */
module.exports = {
  problemId: 'AC-GRAPH-ADJ-87',
  problemVersion: 1,
  entryFunction: 'build_network',
  officialSolutionCode: `def build_network(node_count, links):
    network = []
    for _ in range(node_count):
        network.append([])
    for link in links:
        u = link[0]
        v = link[1]
        u_list = network[u]
        u_list.append(v)
        v_list = network[v]
        v_list.append(u)
    return network
`,
  alternativeSolutions: [
    `def build_network(node_count, links):
    network = []
    for i in range(node_count):
        network.append([])
    for u, v in links:
        u_nbrs = network[u]
        u_nbrs.append(v)
        v_nbrs = network[v]
        v_nbrs.append(u)
    return network
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'ADJ-DIRECTED-ONLY',
      expectedFailingGroup: 'undirected_symmetry',
      code: `def build_network(node_count, links):
    network = []
    for _ in range(node_count):
        network.append([])
    for link in links:
        u = link[0]
        v = link[1]
        u_list = network[u]
        u_list.append(v)
    return network
`,
    },
    {
      id: 'ADJ-SIZE-EQUALS-LINKS',
      expectedFailingGroup: 'isolated_nodes',
      code: `def build_network(node_count, links):
    network = []
    for _ in range(len(links)):
        network.append([])
    for link in links:
        u = link[0]
        v = link[1]
        if u < len(network):
            u_list = network[u]
            u_list.append(v)
        if v < len(network):
            v_list = network[v]
            v_list.append(u)
    return network
`,
    },
    {
      id: 'ADJ-STORES-LINK-PAIR',
      expectedFailingGroup: 'stored_representation',
      code: `def build_network(node_count, links):
    network = []
    for _ in range(node_count):
        network.append([])
    for link in links:
        u = link[0]
        v = link[1]
        u_list = network[u]
        u_list.append([u, v])
        v_list = network[v]
        v_list.append([v, u])
    return network
`,
    },
  ],
  hiddenTests: [
    {
      inputs: {
        node_count: 3,
        links: [
          [0, 1],
          [1, 2],
        ],
      },
      expected: [[1], [0, 2], [1]],
      group: 'undirected_symmetry',
    },
    {
      inputs: {
        node_count: 5,
        links: [[0, 1]],
      },
      expected: [[1], [0], [], [], []],
      group: 'isolated_nodes',
    },
    {
      inputs: {
        node_count: 4,
        links: [
          [0, 3],
          [1, 2],
        ],
      },
      expected: [[3], [2], [1], [0]],
      group: 'stored_representation',
    },
    {
      inputs: {
        node_count: 3,
        links: [
          [0, 1],
          [1, 2],
          [2, 0],
        ],
      },
      expected: [[1, 2], [0, 2], [1, 0]],
      group: 'undirected_symmetry',
    },
    {
      inputs: {
        node_count: 1,
        links: [],
      },
      expected: [[]],
      group: 'isolated_nodes',
    },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_graph_087_1',
      title: '인접 목록의 양방향성과 구조 이해',
      prompt: '인접 목록 표현의 핵심 규칙을 확인하세요.',
      questions: [
        {
          id: 'q1',
          text: '연결선이 하나도 없는 고립된 기지의 경우 인접 목록에서 어떤 값을 가져야 할까요?',
          options: [
            { value: 'empty_list', label: '빈 목록([])을 가져야 전체 기지 번호 순서가 유지된다' },
            { value: 'omit', label: '인접 목록에서 아예 생략한다' },
          ],
          expected: 'empty_list',
        },
        {
          id: 'q2',
          text: '무방향 연결 [u, v]가 주어졌을 때 u 쪽에만 v를 기록하면 어떤 문제가 발생할까요?',
          options: [
            { value: 'one_way', label: 'v에서 u로 되돌아가는 연결을 탐색할 수 없게 된다' },
            { value: 'no_problem', label: '아무 문제도 생기지 않는다' },
          ],
          expected: 'one_way',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_graph_087_transfer_1',
      title: '학생 친구 관계망 구성하기',
      description: '학생 수 student_count와 서로 친구 관계인 쌍 friendships([[a, b], ...])가 주어질 때, 각 학생 번호(0부터 시작)의 친구 번호 목록을 담은 인접 목록을 구성하여 반환하세요.',
      entryFunction: 'build_friend_groups',
      starterCode: `def build_friend_groups(student_count, friendships):
    # 각 학생 번호별 친구 목록을 담은 길이 student_count의 인접 목록을 반환하세요.
    pass
`,
      officialSolutionCode: `def build_friend_groups(student_count, friendships):
    network = []
    for _ in range(student_count):
        network.append([])
    for link in friendships:
        u = link[0]
        v = link[1]
        u_list = network[u]
        u_list.append(v)
        v_list = network[v]
        v_list.append(u)
    return network
`,
      contextCard: {
        title: '👥 친구 관계망 인접 목록',
        strategyGuide: 'student_count 크기의 빈 목록을 만들고, 친구 쌍 [a, b]에 대해 a와 b 양쪽에 서로를 추가합니다.',
      },
      thoughtCheck: {
        question: '학생 수가 5명인데 친구 관계가 전혀 없다면 반환해야 하는 결과는?',
        options: [
          { value: 'five_empty', label: '[[], [], [], [], []] (5개의 빈 목록)' },
          { value: 'empty', label: '[]' },
        ],
        expected: 'five_empty',
      },
      testCases: [
        {
          inputs: {
            student_count: 4,
            friendships: [
              [0, 1],
              [2, 3],
            ],
          },
          expected: [[1], [0], [3], [2]],
        },
        {
          inputs: {
            student_count: 5,
            friendships: [
              [0, 2],
              [1, 3],
              [2, 4],
            ],
          },
          expected: [[2], [3], [0, 4], [1], [2]],
        },
        {
          inputs: {
            student_count: 2,
            friendships: [],
          },
          expected: [[], []],
        },
      ],
    },
  ],
}
