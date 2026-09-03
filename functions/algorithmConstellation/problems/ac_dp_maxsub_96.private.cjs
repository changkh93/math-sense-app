/** Server-only definition: AC-DP-MAXSUB-96. */
module.exports = {
  problemId: 'AC-DP-MAXSUB-96',
  problemVersion: 1,
  entryFunction: 'max_energy',
  starterCode: `def max_energy(values):
    # 연속된 부분 구간의 합 중 최댓값을 반환하세요.
    pass
`,
  officialSolutionCode: `def max_energy(values):
    cur = values[0]
    best = values[0]
    for i in range(1, len(values)):
        v = values[i]
        if cur + v > v:
            cur = cur + v
        else:
            cur = v
        if cur > best:
            best = cur
    return best
`,
  alternativeSolutions: [
    `def max_energy(values):
    max_so_far = values[0]
    curr_max = values[0]
    for x in values[1:]:
        curr_max = max(x, curr_max + x)
        max_so_far = max(max_so_far, curr_max)
    return max_so_far
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'RESET-TO-ZERO',
      expectedFailingGroup: 'all_negative',
      code: `def max_energy(values):
    cur = 0
    best = 0
    for v in values:
        cur = cur + v
        if cur < 0:
            cur = 0
        if cur > best:
            best = cur
    return best
`,
    },
    {
      id: 'SUM-ALL',
      expectedFailingGroup: 'intermediate_peak',
      code: `def max_energy(values):
    total = 0
    for v in values:
        if v > 0:
            total = total + v
    return total if total > 0 else values[0]
`,
    },
    {
      id: 'OMITS-BEST-UPDATE',
      expectedFailingGroup: 'intermediate_peak',
      code: `def max_energy(values):
    cur = values[0]
    for i in range(1, len(values)):
        v = values[i]
        if cur + v > v:
            cur = cur + v
        else:
            cur = v
    return cur
`,
    },
    {
      id: 'FIRST-ELEMENT-ONLY',
      expectedFailingGroup: 'extension_choice',
      code: `def max_energy(values):
    return values[0]
`,
    },
  ],
  hiddenTests: [
    {
      inputs: { values: [-5, -2, -8, -1] },
      expected: -1,
      group: 'all_negative',
    },
    {
      inputs: { values: [7] },
      expected: 7,
      group: 'extension_choice',
    },
    {
      inputs: { values: [1, 2, 3, 4] },
      expected: 10,
      group: 'extension_choice',
    },
    {
      inputs: { values: [-1, 2, -1, 3, -1, 4] },
      expected: 7,
      group: 'extension_choice',
    },
    {
      inputs: { values: [2, -1, 3, -2, 4, -1, 2, 1, -5, 4] },
      expected: 8,
      group: 'intermediate_peak',
    },
    {
      inputs: {
        values: [
          1, -2, 3, 4, -5, 6, -1, 2, 3, -4,
          5, 6, -7, 8, -9, 1, 2, -3, 4, 5,
          -6, 7, 8, -9, 1, 2, 3, -4, 5, 6,
          -7, 8, 9, -10, 1, 2, 3, 4, -5, 6,
        ],
      },
      expected: 44,
      group: 'large_scale',
    },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_dp_096_1',
      title: '구간 리셋과 카데인 알고리즘',
      prompt: '이전 누적을 버리고 새로 출발하는 기준을 점검하세요.',
      questions: [
        {
          id: 'q1',
          text: '모든 원소가 음수(예: [-5, -2, -8])일 때 올바른 최댓값은 무엇일까요?',
          options: [
            { value: 'max_negative', label: '-2 (빈 구간이 허용되지 않으므로 가장 큰 음수 한 원소)' },
            { value: 'zero', label: '0' },
          ],
          expected: 'max_negative',
        },
        {
          id: 'q2',
          text: '현재 원소를 더해 누적을 이어갈지, 현재 원소부터 새로 시작할지 결정하는 기준은?',
          options: [
            { value: 'current_plus_v_vs_v', label: '이전 누적에 현재 값을 더한 결과(cur + v)가 현재 값(v)보다 큰지 비교' },
            { value: 'check_sign', label: '현재 값이 양수인지 음수인지 여부만 확인' },
          ],
          expected: 'current_plus_v_vs_v',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_dp_096_transfer_1',
      title: '연속 관측 신호 이득',
      description: '연속 관측치 readings가 주어질 때, 연속된 구간에서의 최대 누적 신호 이득을 구하세요.',
      entryFunction: 'max_signal_gain',
      starterCode: `def max_signal_gain(readings):
    # 연속 구간의 최대 신호 이득을 반환하세요.
    pass
`,
      officialSolutionCode: `def max_signal_gain(readings):
    cur = readings[0]
    best = readings[0]
    for i in range(1, len(readings)):
        v = readings[i]
        if cur + v > v:
            cur = cur + v
        else:
            cur = v
        if cur > best:
            best = cur
    return best
`,
      contextCard: {
        title: '📶 연속 이득 최고점',
        strategyGuide: 'cur = max(v, cur + v)로 각 원소에서의 최고 연속합을 구하며 전체 최고 기록(best)을 갱신합니다.',
      },
      thoughtCheck: {
        question: '관측치 [-3, -1, -4]에서 최대 신호 이득은?',
        options: [
          { value: 'ans_minus_1', label: '-1' },
          { value: 'ans_0', label: '0' },
        ],
        expected: 'ans_minus_1',
      },
      testCases: [
        {
          inputs: { readings: [-3, -1, -4] },
          expected: -1,
        },
        {
          inputs: { readings: [4, -1, 2, 1] },
          expected: 6,
        },
        {
          inputs: { readings: [10] },
          expected: 10,
        },
      ],
    },
  ],
}
