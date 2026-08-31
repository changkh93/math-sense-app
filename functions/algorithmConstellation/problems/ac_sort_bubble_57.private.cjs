/**
 * AC-SORT-BUBBLE-57 Private Problem Definition
 */
module.exports = {
  problemId: 'AC-SORT-BUBBLE-57',
  problemVersion: 1,
  entryFunction: 'bubble_cargo_pass',
  officialSolutionCode: `def bubble_cargo_pass(cargos):
    for i in range(len(cargos) - 1):
        if cargos[i] > cargos[i + 1]:
            cargos[i], cargos[i + 1] = cargos[i + 1], cargos[i]
    return cargos
`,
  intendedWrongFixtures: [
    {
      id: 'BUBBLE-NO-SWAP',
      expectedFailingGroup: 'largest-already-end',
      code: `def bubble_cargo_pass(cargos):
    result = []
    for i in range(len(cargos)):
        result.append(cargos[i])
    return result
`,
    },
    {
      // 부등호 방향을 반대로 쓰는 오개념: 작은 값을 뒤로 보낸다.
      id: 'BUBBLE-WRONG-COMPARISON',
      expectedFailingGroup: 'already-sorted',
      code: `def bubble_cargo_pass(cargos):
    for i in range(len(cargos) - 1):
        if cargos[i] < cargos[i + 1]:
            cargos[i], cargos[i + 1] = cargos[i + 1], cargos[i]
    return cargos
`,
    },
    {
      // 첫 교환 직후 통과를 멈추는 오개념.
      id: 'BUBBLE-STOPS-AFTER-FIRST-SWAP',
      expectedFailingGroup: 'reverse-order',
      code: `def bubble_cargo_pass(cargos):
    for i in range(len(cargos) - 1):
        if cargos[i] > cargos[i + 1]:
            cargos[i], cargos[i + 1] = cargos[i + 1], cargos[i]
            return cargos
    return cargos
`,
    },
    {
      // 한 통과 계약 위반: 전체 정렬을 해 버리는 오개념.
      id: 'BUBBLE-FULL-SORT-INSTEAD-OF-ONE-PASS',
      expectedFailingGroup: 'duplicates',
      code: `def bubble_cargo_pass(cargos):
    pass_count = len(cargos)
    for round_index in range(pass_count):
        for i in range(len(cargos) - 1):
            if cargos[i] > cargos[i + 1]:
                cargos[i], cargos[i + 1] = cargos[i + 1], cargos[i]
    return cargos
`,
    },
  ],
  hiddenTests: [
    // 역순 목록: 첫 교환 후 멈추는 오답과 전체 정렬 오답을 가른다.
    { inputs: { cargos: [3, 2, 1] }, expected: [2, 1, 3], group: 'reverse-order' },
    // 이미 정렬됨: 부등호 반대 오답을 잡는다.
    { inputs: { cargos: [4, 7, 9] }, expected: [4, 7, 9], group: 'already-sorted' },
    // 최댓값이 이미 맨 끝: 교환 없이 통과하는 오답을 잡는다.
    { inputs: { cargos: [9, 1, 2] }, expected: [1, 2, 9], group: 'largest-already-end' },
    // 중복 값: 전체 정렬 오답을 잡는다.
    { inputs: { cargos: [2, 2, 1] }, expected: [2, 1, 2], group: 'duplicates' },
    // 한 칸 목록.
    { inputs: { cargos: [5] }, expected: [5], group: 'single-item' },
    // 빈 목록.
    { inputs: { cargos: [] }, expected: [], group: 'empty-list' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_sort_057_1',
      title: '인접 교환 통과 이해',
      prompt: '버블 한 통과의 동작을 점검하세요.',
      questions: [
        {
          id: 'q1',
          text: '한 번의 통과가 끝난 뒤 가장 큰 값이 맨 뒤에 있는 이유는 무엇일까요?',
          options: [
            { value: 'largest_bubbles_end', label: '가장 큰 값은 어떤 이웃과 비교해도 계속 교환되어 뒤로 밀려나기 때문에' },
            { value: 'smallest_sinks', label: '가장 작은 값이 먼저 골라지기 때문에' },
          ],
          expected: 'largest_bubbles_end',
        },
        {
          id: 'q2',
          text: '이미 정렬된 목록을 한 번 통과하면 어떻게 될까요?',
          options: [
            { value: 'no_swaps', label: '앞이 큰 이웃이 없어 교환 없이 그대로 반환된다' },
            { value: 'reverse_sort', label: '통과할 때마다 순서가 뒤집힌다' },
          ],
          expected: 'no_swaps',
        },
        {
          id: 'q3',
          text: '빈 목록([])이나 한 칸 목록을 통과하면 어떻게 될까요?',
          options: [
            { value: 'nothing_to_compare', label: '비교할 이웃이 없어 그대로 반환된다' },
            { value: 'error', label: '비교할 이웃이 없어 오류가 난다' },
          ],
          expected: 'nothing_to_compare',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_sort_057_transfer_1',
      title: '작은 화물을 앞으로 밀기',
      description: '오른쪽 끝 이웃부터 왼쪽 방향으로 이웃을 비교해, 작은 값을 왼쪽으로 밀어내는 한 번의 통과를 수행합니다.',
      entryFunction: 'bubble_smallest_to_front',
      starterCode: `def bubble_smallest_to_front(cargos):
    # 오른쪽에서 왼쪽으로 이웃을 비교하는 한 번의 통과를 수행하세요.
    pass
`,
      officialSolutionCode: `def bubble_smallest_to_front(cargos):
    count = len(cargos)
    for i in range(count - 1):
        j = count - 1 - i
        if cargos[j - 1] > cargos[j]:
            cargos[j - 1], cargos[j] = cargos[j], cargos[j - 1]
    return cargos
`,
      contextCard: {
        title: '🌬️ 반대 방향 통과 전략',
        strategyGuide: '오른쪽 끝 이웃부터 비교하며 작은 값을 왼쪽으로 한 칸씩 밀어내면, 한 번의 통과로 가장 작은 값이 맨 앞에 도착합니다.',
      },
      thoughtCheck: {
        question: '오른쪽에서 왼쪽으로 통과한 뒤 가장 작은 값은 어디에 있을까요?',
        options: [
          { value: 'front', label: '맨 앞 — 왼쪽으로 계속 밀려나기 때문에' },
          { value: 'end', label: '맨 뒤 — 오른쪽으로 밀려나기 때문에' },
        ],
        expected: 'front',
      },
      testCases: [
        // 역순: 작은 값이 맨 앞까지 밀려난다.
        { inputs: { cargos: [3, 1, 2] }, expected: [1, 3, 2] },
        // 모두 같은 값.
        { inputs: { cargos: [2, 2, 2] }, expected: [2, 2, 2] },
        // 빈 목록.
        { inputs: { cargos: [] }, expected: [] },
        // 두 칸 교환.
        { inputs: { cargos: [6, 5] }, expected: [5, 6] },
      ],
    },
  ],
}
