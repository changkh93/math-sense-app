/**
 * AC-ENUM-TARGET-62 Private Problem Definition
 */
module.exports = {
  problemId: 'AC-ENUM-TARGET-62',
  problemVersion: 1,
  entryFunction: 'find_all_pair_sums',
  officialSolutionCode: `def find_all_pair_sums(capsules, target):
    pairs = []
    for i in range(len(capsules)):
        for j in range(i + 1, len(capsules)):
            if capsules[i] + capsules[j] == target:
                pairs.append([i, j])
    return pairs
`,
  intendedWrongFixtures: [
    {
      // 첫 일치에서 반환해 나머지 답을 놓치는 오개념.
      id: 'ENUM-FIRST-MATCH-ONLY',
      expectedFailingGroup: 'scattered-pairs',
      code: `def find_all_pair_sums(capsules, target):
    pairs = []
    for i in range(len(capsules)):
        for j in range(i + 1, len(capsules)):
            if capsules[i] + capsules[j] == target:
                pairs.append([i, j])
                return pairs
    return pairs
`,
    },
    {
      // 짝을 i부터 시작해 같은 위치를 재사용하는 오개념.
      id: 'ENUM-REUSES-SAME-INDEX',
      expectedFailingGroup: 'single-element',
      code: `def find_all_pair_sums(capsules, target):
    pairs = []
    for i in range(len(capsules)):
        for j in range(i, len(capsules)):
            if capsules[i] + capsules[j] == target:
                pairs.append([i, j])
    return pairs
`,
    },
    {
      // 같은 값을 가진 짝을 건너뛰는 오개념.
      id: 'ENUM-SKIPS-DUPLICATE-VALUES',
      expectedFailingGroup: 'duplicate-values',
      code: `def find_all_pair_sums(capsules, target):
    pairs = []
    for i in range(len(capsules)):
        for j in range(i + 1, len(capsules)):
            if capsules[i] != capsules[j] and capsules[i] + capsules[j] == target:
                pairs.append([i, j])
    return pairs
`,
    },
    {
      // 위치 쌍이 아니라 값 쌍을 반환하는 오개념.
      id: 'ENUM-RETURNS-VALUE-PAIRS',
      expectedFailingGroup: 'duplicate-values',
      code: `def find_all_pair_sums(capsules, target):
    pairs = []
    for i in range(len(capsules)):
        for j in range(i + 1, len(capsules)):
            if capsules[i] + capsules[j] == target:
                pairs.append([capsules[i], capsules[j]])
    return pairs
`,
    },
  ],
  hiddenTests: [
    // 빈 목록: "조건 만족 쌍 없음"과 같은 빈 결과라도 입력 구분이 필요하다.
    { inputs: { capsules: [], target: 7 }, expected: [], group: 'empty-list' },
    // 아무 짝도 없는 경우.
    { inputs: { capsules: [1, 2, 3], target: 100 }, expected: [], group: 'no-match' },
    // 중복 값: 모든 위치 조합을 센다.
    { inputs: { capsules: [3, 3, 3, 3], target: 6 }, expected: [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]], group: 'duplicate-values' },
    // 흩어진 두 답: 첫 일치에서 멈추는 오답을 기각한다.
    { inputs: { capsules: [5, 1, 4, 2, 3], target: 5 }, expected: [[1, 2], [3, 4]], group: 'scattered-pairs' },
    // 한 항목: 같은 위치 재사용 오답([0, 0])을 기각한다.
    { inputs: { capsules: [4], target: 8 }, expected: [], group: 'single-element' },
    // 음수 값 포함.
    { inputs: { capsules: [-1, 6, 2, 3], target: 5 }, expected: [[0, 1], [2, 3]], group: 'negative-values' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_enum_062_1',
      title: '모든 답 수집 이해',
      prompt: '조건을 만족하는 모든 쌍을 모을 때의 원리를 점검하세요.',
      questions: [
        {
          id: 'q1',
          text: '첫 답을 찾은 순간 해야 할 일은 무엇일까요?',
          options: [
            { value: 'record_and_continue', label: '결과 목록에 기록하고 남은 쌍도 계속 확인한다' },
            { value: 'return_immediately', label: '그 자리에서 바로 반환하고 끝낸다' },
          ],
          expected: 'record_and_continue',
        },
        {
          id: 'q2',
          text: '같은 값이라도 위치가 다르면 별개의 쌍인 이유는 무엇일까요?',
          options: [
            { value: 'positions_matter', label: '이 문제가 모으는 것은 값이 아니라 위치 쌍이기 때문에' },
            { value: 'values_ignored', label: '값은 아무래도 상관없기 때문에' },
          ],
          expected: 'positions_matter',
        },
        {
          id: 'q3',
          text: '입력 목록이 비어 있으면 결과는 어떻게 될까요?',
          options: [
            { value: 'empty_result', label: '확인할 쌍이 없으므로 빈 목록을 반환한다' },
            { value: 'error', label: '오류가 발생한다' },
          ],
          expected: 'empty_result',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_enum_062_transfer_1',
      title: '목표 세기를 만드는 모든 신호 쌍',
      description: '신호 세기 목록(strengths)에서 두 신호의 합이 target과 같은 모든 위치 쌍 [i, j]를 순서대로 모읍니다.',
      entryFunction: 'find_all_signal_pairs',
      starterCode: `def find_all_signal_pairs(strengths, target):
    # 합이 target인 모든 위치 쌍 [i, j]를 모아 반환하세요.
    pass
`,
      officialSolutionCode: `def find_all_signal_pairs(strengths, target):
    pairs = []
    for i in range(len(strengths)):
        for j in range(i + 1, len(strengths)):
            if strengths[i] + strengths[j] == target:
                pairs.append([i, j])
    return pairs
`,
      contextCard: {
        title: '📶 신호 쌍 수집 전략',
        strategyGuide: '앞 위치를 정해 뒤쪽 위치와 차례로 짝지어 세기를 더해 보고, 목표와 같은 짝을 만날 때마다 기록해 끝까지 모읍니다.',
      },
      thoughtCheck: {
        question: '세기 [4, 6, 6]에서 목표 10인 쌍은 모두 몇 개일까요?',
        options: [
          { value: 'two', label: '2개 — (0, 1)과 (0, 2)' },
          { value: 'one', label: '1개 — 같은 세기 6은 하나만 센다' },
        ],
        expected: 'two',
      },
      testCases: [
        { inputs: { strengths: [2, 2, 2], target: 4 }, expected: [[0, 1], [0, 2], [1, 2]] },
        { inputs: { strengths: [], target: 1 }, expected: [] },
        { inputs: { strengths: [-2, 7, 7], target: 5 }, expected: [[0, 1], [0, 2]] },
        { inputs: { strengths: [1, 2], target: 100 }, expected: [] },
      ],
    },
  ],
}
