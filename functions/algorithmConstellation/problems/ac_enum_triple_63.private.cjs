/**
 * AC-ENUM-TRIPLE-63 Private Problem Definition
 */
module.exports = {
  problemId: 'AC-ENUM-TRIPLE-63',
  problemVersion: 1,
  entryFunction: 'find_triple_sum',
  officialSolutionCode: `def find_triple_sum(capsules, target):
    n = len(capsules)
    for i in range(n):
        for j in range(i + 1, n):
            for k in range(j + 1, n):
                if capsules[i] + capsules[j] + capsules[k] == target:
                    return [i, j, k]
    return []
`,
  intendedWrongFixtures: [
    {
      // 두 개만 검사하고 세 위치 계약을 어기는 오개념.
      id: 'TRIPLE-CHECKS-PAIRS-ONLY',
      expectedFailingGroup: 'triple-at-end',
      code: `def find_triple_sum(capsules, target):
    n = len(capsules)
    for i in range(n):
        for j in range(i + 1, n):
            if capsules[i] + capsules[j] == target:
                return [i, j]
    return []
`,
    },
    {
      // k를 j부터 시작해 같은 위치를 재사용하는 오개념.
      id: 'TRIPLE-REUSES-INDEX',
      expectedFailingGroup: 'same-index-reuse',
      code: `def find_triple_sum(capsules, target):
    n = len(capsules)
    for i in range(n):
        for j in range(i + 1, n):
            for k in range(j, n):
                if capsules[i] + capsules[j] + capsules[k] == target:
                    return [i, j, k]
    return []
`,
    },
    {
      // k를 i + 1부터 시작해 순서가 뒤섞인 중복 조합을 만드는 오개념.
      id: 'TRIPLE-K-FROM-I-ORDER',
      expectedFailingGroup: 'k-order',
      code: `def find_triple_sum(capsules, target):
    n = len(capsules)
    for i in range(n):
        for j in range(i + 1, n):
            for k in range(i + 1, j):
                if capsules[i] + capsules[j] + capsules[k] == target:
                    return [i, j, k]
    return []
`,
    },
    {
      // 위치가 아니라 값을 반환하는 오개념.
      id: 'TRIPLE-RETURNS-VALUES',
      expectedFailingGroup: 'triple-at-end',
      code: `def find_triple_sum(capsules, target):
    n = len(capsules)
    for i in range(n):
        for j in range(i + 1, n):
            for k in range(j + 1, n):
                if capsules[i] + capsules[j] + capsules[k] == target:
                    return [capsules[i], capsules[j], capsules[k]]
    return []
`,
    },
  ],
  hiddenTests: [
    // 목표 조합이 목록 맨 끝에 있는 경우.
    { inputs: { capsules: [1, 2, 3, 4, 5, 6], target: 15 }, expected: [3, 4, 5], group: 'triple-at-end' },
    // 중간에 있는 조합.
    { inputs: { capsules: [10, 1, 2, 3, 20], target: 6 }, expected: [1, 2, 3], group: 'middle-triple' },
    // 조합이 존재하지 않는 경우.
    { inputs: { capsules: [1, 2, 4, 8], target: 100 }, expected: [], group: 'no-triple' },
    // 빈 목록.
    { inputs: { capsules: [], target: 5 }, expected: [], group: 'empty-list' },
    // k의 재사용 오개념을 가르는 입력: (i, j, j)가 먼저 정답처럼 보이는 구성.
    { inputs: { capsules: [6, 2, 4, 4], target: 10 }, expected: [1, 2, 3], group: 'same-index-reuse' },
    // k의 시작 경계 오개념을 가르는 입력: k < j인 조합 [0, 2, 3]이 먼저 발견되어 틀림.
    { inputs: { capsules: [1, 5, 2, 3], target: 6 }, expected: [0, 2, 3], group: 'k-order' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_enum_063_1',
      title: '세 위치 열거 이해',
      prompt: '세 위치를 중복 없이 열거하는 원리를 점검하세요.',
      questions: [
        {
          id: 'q1',
          text: '셋째 위치 k의 확인 범위는 어디부터일까요?',
          options: [
            { value: 'after_j', label: 'j보다 뒤쪽부터 — k가 j보다 앞이면 이미 본 조합의 재탕이 된다' },
            { value: 'after_i', label: 'i보다만 뒤쪽이면 된다' },
          ],
          expected: 'after_j',
        },
        {
          id: 'q2',
          text: '캡슐이 두 개뿐이면 세 개를 고를 수 없는 이유는 무엇일까요?',
          options: [
            { value: 'need_three_positions', label: '서로 다른 세 위치가 필요한데 위치가 두 개뿐이기 때문에' },
            { value: 'values_too_small', label: '값이 작아서 합이 맞지 않기 때문에' },
          ],
          expected: 'need_three_positions',
        },
        {
          id: 'q3',
          text: '모든 조합을 확인해도 없을 때 반환할 것은 무엇일까요?',
          options: [
            { value: 'empty_list', label: '빈 목록([]) — 이 문제의 실패 표시' },
            { value: 'zero_triple', label: '[0, 0, 0] — 시작 위치를 돌려준다' },
          ],
          expected: 'empty_list',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_enum_063_transfer_1',
      title: '목표 세기를 만드는 세 센서',
      description: '센서 목록(sensors)에서 세 개를 골라 곱이 target과 같은 첫 위치 [i, j, k]를 반환하세요. 센서 값은 작은 정수입니다.',
      entryFunction: 'find_sensor_product',
      starterCode: `def find_sensor_product(sensors, target):
    # 곱이 target이 되는 첫 세 위치 [i, j, k]를 반환하세요.
    pass
`,
      officialSolutionCode: `def find_sensor_product(sensors, target):
    n = len(sensors)
    for i in range(n):
        for j in range(i + 1, n):
            for k in range(j + 1, n):
                if sensors[i] * sensors[j] * sensors[k] == target:
                    return [i, j, k]
    return []
`,
      contextCard: {
        title: '✖️ 세 센서 곱 탐색 전략',
        strategyGuide: '세 위치의 경계를 한 단계씩 늘려가며 곱을 계산하고, 목표와 같은 첫 조합의 위치를 알려줍니다.',
      },
      thoughtCheck: {
        question: '센서 [2, 3, 4]에서 곱이 24인 조합은 있을까요?',
        options: [
          { value: 'yes_all_three', label: '있다 — 세 개 전부: 2 곱하기 3 곱하기 4' },
          { value: 'no', label: '없다' },
        ],
        expected: 'yes_all_three',
      },
      testCases: [
        { inputs: { sensors: [1, 2, 3, 4], target: 8 }, expected: [0, 1, 3] },
        { inputs: { sensors: [5, 1, 1], target: 5 }, expected: [0, 1, 2] },
        { inputs: { sensors: [], target: 1 }, expected: [] },
        { inputs: { sensors: [2, 2, 2], target: 6 }, expected: [] },
      ],
    },
  ],
}
