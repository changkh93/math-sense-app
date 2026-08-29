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
  ],
  hiddenTests: [
    { inputs: { capsules: [1, 5, 8, 3], target: 11 }, expected: [2, 3], group: 'distinct_pairs_only' },
    { inputs: { capsules: [4, 4, 10], target: 8 }, expected: [0, 1], group: 'duplicate_values' },
    { inputs: { capsules: [10, 20, 30], target: 100 }, expected: [], group: 'no_match' },
    { inputs: { capsules: [-2, 5, 7], target: 3 }, expected: [0, 1], group: 'negative_numbers' },
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
      testCases: [
        { inputs: { capsules: [1, 5, 2], target: 3 }, expected: [2, 1] },
        { inputs: { capsules: [10, 20], target: 5 }, expected: [] },
      ],
    },
  ],
}
