/**
 * Private Problem Definition: AC-SEQ-005 (Energy Capsule Collection)
 * Focus: Sequence Iteration, Filtering, and Accumulator Pattern (for + if + total)
 */

module.exports = {
  problemId: 'AC-SEQ-005',
  version: 1,
  checksum: 'sha256:ac_seq_005_v1_auth_2026',
  entryFunction: 'collect_energy',
  canonicalStrategy: 'for energy in capsules: if energy > 0: total += energy',
  officialSolutionCode: `def collect_energy(capsules):\n    total = 0\n    for energy in capsules:\n        if energy > 0:\n            total = total + energy\n    return total\n`,
  alternativeSolutions: [
    `def collect_energy(capsules):\n    total = 0\n    for x in capsules:\n        if x > 0:\n            total += x\n    return total\n`,
    `def collect_energy(capsules):\n    res = 0\n    for val in capsules:\n        if val >= 1:\n            res = res + val\n    return res\n`,
  ],
  intendedWrongSolutions: [
    {
      id: 'wrong_sum_all_without_filter',
      misconceptionCode: 'SEQ-FILTER-ALL-01',
      code: `def collect_energy(capsules):\n    total = 0\n    for energy in capsules:\n        total = total + energy\n    return total\n`,
      expectedFailureGroup: 'has_negative_capsules',
    },
    {
      id: 'wrong_count_instead_of_sum',
      misconceptionCode: 'SEQ-ACCUM-COUNT-02',
      code: `def collect_energy(capsules):\n    total = 0\n    for energy in capsules:\n        if energy > 0:\n            total = total + 1\n    return total\n`,
      expectedFailureGroup: 'sum_differs_from_count',
    },
    {
      id: 'wrong_init_value',
      misconceptionCode: 'SEQ-INIT-VAL-03',
      code: `def collect_energy(capsules):\n    total = 1\n    for energy in capsules:\n        if energy > 0:\n            total = total + energy\n    return total\n`,
      expectedFailureGroup: 'empty_and_zero',
    },
  ],
  publicTests: [
    { id: 'p1', inputs: { capsules: [5, -3, 8, 0, -2] }, expected: 13 },
    { id: 'p2', inputs: { capsules: [10, 20, 30] }, expected: 60 },
    { id: 'p3', inputs: { capsules: [-5, -10, 0] }, expected: 0 },
    { id: 'p4', inputs: { capsules: [] }, expected: 0 },
  ],
  hiddenTests: [
    { id: 'h1', inputs: { capsules: [1, -1, 2, -2, 3, -3] }, expected: 6, group: 'has_negative_capsules' },
    { id: 'h2', inputs: { capsules: [100, 200, -50, 0] }, expected: 300, group: 'has_negative_capsules' },
    { id: 'h3', inputs: { capsules: [-10, -20, -30] }, expected: 0, group: 'all_negative' },
    { id: 'h4', inputs: { capsules: [42] }, expected: 42, group: 'single_element' },
    { id: 'h5', inputs: { capsules: [0, 0, 0] }, expected: 0, group: 'empty_and_zero' },
    { id: 'h6', inputs: { capsules: [3, 4, 5] }, expected: 12, group: 'sum_differs_from_count' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_seq_05_01',
      type: 'accumulator_trace_prediction',
      prompt: 'capsules = [4, -2, 7, 0] 일 때 collect_energy(capsules)의 실행 과정을 예측하세요.',
      questions: [
        { id: 'q1', text: '손상된 캡슐(-2)을 만났을 때 total 값은 증가하나요?', expected: false },
        { id: 'q2', text: '최종 반환되는 양수 에너지의 총합(total)은 11인가요?', expected: true },
      ],
    },
  ],
  transferChallenges: [
    {
      transferChallengeId: 'AC-SEQ-005-T1',
      title: '수정 광석 선별 수거',
      description: '광석 리스트(ores)에서 순도가 양수(purity > 0)인 광석의 순도 총합을 구하세요.',
      entryFunction: 'collect_crystals',
      starterCode: `def collect_crystals(ores):\n    # 양의 순도 광석만 합산하는 코드를 작성해 보세요.\n    pass\n`,
      testCases: [
        { inputs: { ores: [10, -5, 20, -1] }, expected: 30 },
        { inputs: { ores: [-1, -2, -3] }, expected: 0 },
        { inputs: { ores: [7, 7, 7] }, expected: 21 },
        { inputs: { ores: [] }, expected: 0 },
      ],
    },
  ],
  get transferMasterSet() {
    return this.transferChallenges
  },
}
