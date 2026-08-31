/**
 * Server-only Private Problem Definition for AC-ENUM-PAIR-01
 */

module.exports = {
  problemId: 'AC-ENUM-PAIR-01',
  problemVersion: 1,
  entryFunction: 'find_pair_sum',
  officialSolutionCode: `def find_pair_sum(capsules, target):
    n = len(capsules)
    for i in range(n):
        for j in range(i + 1, n):
            if capsules[i] + capsules[j] == target:
                return [i, j]
    return []
`,
  alternativeSolutions: [
    `def find_pair_sum(capsules, target):
    for i in range(len(capsules)):
        for j in range(len(capsules)):
            if i != j and capsules[i] + capsules[j] == target:
                return [min(i, j), max(i, j)]
    return []
`,
  ],
  intendedWrongFixtures: [
    {
      label: 'same_element_used_twice',
      code: `def find_pair_sum(capsules, target):
    for i in range(len(capsules)):
        if capsules[i] * 2 == target:
            return [i, i]
    return []
`,
      expectedFailingGroup: 'distinct_pairs_only',
    },
    {
      // ---- 신규 3종 (추가 전용 — 기존 fixture는 유지) ----
      // 쌍을 [j, i] 역순으로 반환하는 오개념.
      id: 'ENUM-REVERSED-PAIR-ORDER',
      expectedFailingGroup: 'distinct_pairs_only',
      code: `def find_pair_sum(capsules, target):
    n = len(capsules)
    for i in range(n):
        for j in range(i + 1, n):
            if capsules[i] + capsules[j] == target:
                return [j, i]
    return []
`,
    },
    {
      // 첫 일치가 아니라 마지막 일치를 반환하는 오개념.
      id: 'ENUM-RETURNS-LAST-MATCH',
      expectedFailingGroup: 'first_match_order',
      code: `def find_pair_sum(capsules, target):
    n = len(capsules)
    answer = []
    for i in range(n):
        for j in range(i + 1, n):
            if capsules[i] + capsules[j] == target:
                answer = [i, j]
    return answer
`,
    },
    {
      // 위치 쌍이 아니라 값 쌍을 반환하는 오개념.
      id: 'ENUM-RETURNS-VALUE-PAIR',
      expectedFailingGroup: 'negative_numbers',
      code: `def find_pair_sum(capsules, target):
    n = len(capsules)
    for i in range(n):
        for j in range(i + 1, n):
            if capsules[i] + capsules[j] == target:
                return [capsules[i], capsules[j]]
    return []
`,
    },
  ],
  hiddenTests: [
    // ---- 기존 hiddenTests (추가 전용 보강: 아래 4건은 절대 삭제/변경하지 않는다) ----
    { inputs: { capsules: [1, 5, 8, 3], target: 11 }, expected: [2, 3], group: 'distinct_pairs_only' },
    { inputs: { capsules: [4, 4, 10], target: 8 }, expected: [0, 1], group: 'duplicate_values' },
    { inputs: { capsules: [10, 20, 30], target: 100 }, expected: [], group: 'no_match' },
    { inputs: { capsules: [-2, 5, 7], target: 3 }, expected: [0, 1], group: 'negative_numbers' },
    // ---- 신규 그룹: 여러 일치가 있을 때 첫 [i, j]를 반환하는지 확인 ----
    { inputs: { capsules: [1, 2, 3, 4], target: 5 }, expected: [0, 3], group: 'first_match_order' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_comb_061_1',
      prompt: '두 수의 합이 target이 되는 인덱스 쌍 탐색 결과를 예측해 보세요.',
      questions: [
        {
          id: 'q1',
          text: 'capsules = [1, 3, 5], target = 8일 때 find_pair_sum(capsules, target)의 결과는?',
          options: [
            { value: '[1, 2]', label: '[1, 2]' },
            { value: '[0, 2]', label: '[0, 2]' },
            { value: '[]', label: '[]' },
          ],
          expected: '[1, 2]',
        },
        {
          id: 'q2',
          text: '짝 위치 j를 항상 i보다 뒤쪽부터만 확인하는 이유는 무엇일까요?',
          options: [
            { value: 'avoid_duplicates', label: '(0, 1)과 (1, 0)처럼 같은 쌍을 두 번 세는 일과 자기 자신과의 짝을 막기 위해' },
            { value: 'faster_scan', label: '탐색 속도를 조금이라도 빠르게 보이기 위해' },
          ],
          expected: 'avoid_duplicates',
        },
        {
          id: 'q3',
          text: '모든 쌍을 확인해도 합이 target인 쌍이 없다면 무엇을 반환해야 할까요?',
          options: [
            { value: 'empty_list', label: '빈 목록([]) — 못 찾았다는 약속된 결과' },
            { value: 'minus_one', label: '-1 — 이 문제의 실패 표시' },
          ],
          expected: 'empty_list',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_comb_061_transfer_1',
      title: '목표 차이를 만드는 두 캡슐',
      description: '두 캡슐의 차이 (capsules[j] - capsules[i])가 target이 되는 인덱스 쌍 [i, j]를 반환하세요.',
      entryFunction: 'find_pair_diff',
      starterCode: 'def find_pair_diff(capsules, target):\n    pass\n',
      officialSolutionCode: `def find_pair_diff(capsules, target):
    n = len(capsules)
    for i in range(n):
        for j in range(n):
            if i != j and capsules[j] - capsules[i] == target:
                return [i, j]
    return []
`,
      contextCard: {
        title: '↔️ 차이 짝 탐색 전략',
        strategyGuide: '두 위치를 순서 있게 골라 뒤쪽 값에서 앞쪽 값을 뺀 차이가 목표와 같은지 확인하고, 첫 짝을 찾으면 그 위치 쌍을 알려줍니다.',
      },
      thoughtCheck: {
        question: '캡슐 [3, 10]에서 차이 7을 만드는 위치 쌍 [i, j]는 무엇일까요?',
        options: [
          { value: 'pair_01', label: '[0, 1] — 10 빼기 3이 7이다' },
          { value: 'pair_10', label: '[1, 0] — 3 빼기 10이 7이다' },
        ],
        expected: 'pair_01',
      },
      // ---- 기존 2건 (추가 전용 보강) ----
      testCases: [
        { inputs: { capsules: [1, 5, 2], target: 3 }, expected: [2, 1] },
        { inputs: { capsules: [10, 20], target: 5 }, expected: [] },
        // ---- 신규 2건 ----
        { inputs: { capsules: [4, 9, 7, 1], target: 5 }, expected: [0, 1] },
        { inputs: { capsules: [3, 8], target: -5 }, expected: [1, 0] },
      ],
    },
  ],
}
