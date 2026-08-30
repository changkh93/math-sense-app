/**
 * Private Problem Definition: AC-SEQ-005 (Energy Capsule Collection)
 * Focus: Sequence Iteration, Filtering, and Accumulator Pattern (for + if + total)
 */

module.exports = {
  problemId: 'AC-SEQ-005',
  problemVersion: 1,
  checksum: 'sha256:ac_seq_005_v1_auth_2026',
  entryFunction: 'collect_energy',
  canonicalStrategy: 'for energy in capsules: if energy > 0: total += energy',
  officialSolutionCode: `def collect_energy(capsules):\n    total = 0\n    for energy in capsules:\n        if energy > 0:\n            total = total + energy\n    return total\n`,
  alternativeSolutions: [
    `def collect_energy(capsules):\n    total = 0\n    for x in capsules:\n        if x > 0:\n            total += x\n    return total\n`,
    `def collect_energy(capsules):\n    res = 0\n    for val in capsules:\n        if val >= 1:\n            res = res + val\n    return res\n`,
  ],
  intendedWrongFixtures: [
    {
      id: 'wrong_sum_all_without_filter',
      misconceptionCode: 'SEQ-FILTER-ALL-01',
      expectedMisconception: 'SEQ-FILTER-ALL-01',
      expectedFailingGroup: 'has_negative_capsules',
      code: `def collect_energy(capsules):\n    total = 0\n    for energy in capsules:\n        total = total + energy\n    return total\n`,
    },
    {
      id: 'wrong_count_instead_of_sum',
      misconceptionCode: 'SEQ-ACCUM-COUNT-02',
      expectedMisconception: 'SEQ-ACCUM-COUNT-02',
      expectedFailingGroup: 'sum_differs_from_count',
      code: `def collect_energy(capsules):\n    total = 0\n    for energy in capsules:\n        if energy > 0:\n            total = total + 1\n    return total\n`,
    },
    {
      id: 'wrong_init_value',
      misconceptionCode: 'SEQ-INIT-VAL-03',
      expectedMisconception: 'SEQ-INIT-VAL-03',
      expectedFailingGroup: 'empty_and_zero',
      code: `def collect_energy(capsules):\n    total = 1\n    for energy in capsules:\n        if energy > 0:\n            total = total + energy\n    return total\n`,
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
      challengeId: 'uc_seq_005_1',
      title: '★★ 선별 합산 누적자 추적',
      type: 'trace_understanding',
      prompt: 'capsules = [4, -2, 7, 0] 일 때 collect_energy(capsules)의 실행 과정을 확인하세요.',
      codeSnippet: `def collect_energy(capsules):\n    total = 0\n    for energy in capsules:\n        if energy > 0:\n            total = total + energy\n    return total`,
      questions: [
        {
          id: 'q1',
          text: '손상된 캡슐(-2)을 만났을 때 total 값은 어떻게 될까요?',
          options: [
            { value: 'keep_state', label: '조건(energy > 0)을 만족하지 않으므로 total 값이 유지된다' },
            { value: 'decrease', label: '2만큼 감소한다' },
            { value: 'reset', label: '0으로 초기화된다' },
          ],
          expected: 'keep_state',
        },
        {
          id: 'q2',
          text: '[4, -2, 7, 0]을 순회한 후 최종 반환되는 total 값은 얼마일까요?',
          options: [
            { value: 'val_11', label: '11 (4 + 7)' },
            { value: 'val_9', label: '9 (4 - 2 + 7)' },
            { value: 'val_2', label: '2 (양수 캡슐의 개수)' },
          ],
          expected: 'val_11',
        },
        {
          id: 'q3',
          text: '이 문제에서 양수 캡슐의 개수를 세는 것과 에너지 합을 구하는 것의 차이는 무엇일까요?',
          options: [
            { value: 'sum_vs_count', label: '개수는 1씩 더하지만, 합은 energy 값 자체를 더한다' },
            { value: 'same_thing', label: '둘은 완전히 같은 계산이다' },
          ],
          expected: 'sum_vs_count',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'AC-SEQ-005-T1',
      title: '수정 광석 선별 수거',
      description: '광석 리스트(ores)에서 순도가 양수(purity > 0)인 광석의 순도 총합을 구하세요.',
      contextCard: {
        title: '📋 수정 광석 선별 수거 흐름',
        steps: [
          { label: '빠짐없이 확인', text: '광석을 처음부터 끝까지 하나씩 살펴보세요.' },
          { label: '수거 대상 구분', text: '수거할 광석과 건너뛸 광석의 공통점을 찾아보세요.' },
          { label: '결과에 모으기', text: '수거한 광석의 순도를 하나의 결과에 계속 모으세요.' },
        ],
      },
      thoughtCheck: {
        prompt: '캡슐 에너지 합산과 수정 광석 순도 합산의 공통적인 생각의 규칙은 무엇일까요?',
        options: [
          { id: 'opt_filter_sum', label: '0보다 큰 유효한 값만 골라 누적 변수에 더한다', isCorrect: true },
          { id: 'opt_count_only', label: '양수 광석의 개수만 1씩 센다', isCorrect: false },
        ],
        feedback: '맞아요! 조건에 맞는 항목의 값 자체를 total에 누적하는 동일한 filter-accumulate 패턴입니다.',
      },
      entryFunction: 'collect_crystals',
      starterCode: `def collect_crystals(ores):\n    # 양의 순도(> 0) 광석만 선별하여 합산하세요.\n    pass\n`,
      officialSolutionCode: `def collect_crystals(ores):\n    total = 0\n    for ore in ores:\n        if ore > 0:\n            total = total + ore\n    return total\n`,
      testCases: [
        { inputs: { ores: [10, -5, 20, -1] }, expected: 30 },
        { inputs: { ores: [-1, -2, -3] }, expected: 0 },
        { inputs: { ores: [7, 7, 7] }, expected: 21 },
        { inputs: { ores: [0, 9, 0] }, expected: 9 },
      ],
    },
  ],
}
