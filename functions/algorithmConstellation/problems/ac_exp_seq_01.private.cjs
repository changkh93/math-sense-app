/**
 * Private Problem Definition: AC-EXP-SEQ-01 (루미의 세 명령)
 */

module.exports = {
  problemId: 'AC-EXP-SEQ-01',
  problemVersion: 1,
  entryFunction: 'trace_rover_path',
  officialSolutionCode: `def trace_rover_path(start, boost, scale, drift):
    pos = start
    pos = pos + boost
    pos = pos * scale
    pos = pos - drift
    return pos
`,
  alternativeSolutions: [
    `def trace_rover_path(start, boost, scale, drift):
    return (start + boost) * scale - drift
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'SEQ-REVERSE-ORDER',
      misconceptionCode: 'ORDER-REVERSED-CALCULATION',
      expectedMisconception: 'ORDER-REVERSED-CALCULATION',
      expectedFailingGroup: 'order_sensitive',
      code: `def trace_rover_path(start, boost, scale, drift):
    pos = start
    pos = pos - drift
    pos = pos * scale
    pos = pos + boost
    return pos
`,
    },
    {
      id: 'SEQ-IGNORE-SCALE',
      misconceptionCode: 'OPERATOR-OMISSION',
      expectedMisconception: 'OPERATOR-OMISSION',
      expectedFailingGroup: 'order_sensitive',
      code: `def trace_rover_path(start, boost, scale, drift):
    return start + boost - drift
`,
    },
    {
      id: 'SEQ-HARDCODED-RESULT',
      misconceptionCode: 'HARDCODED-SAMPLE-RETURN',
      expectedMisconception: 'HARDCODED-SAMPLE-RETURN',
      expectedFailingGroup: 'varied_parameters',
      code: `def trace_rover_path(start, boost, scale, drift):
    return 7
`,
    },
  ],
  hiddenTests: [
    { inputs: { start: 2, boost: 3, scale: 4, drift: 5 }, expected: 15, group: 'order_sensitive' },
    { inputs: { start: 5, boost: 5, scale: 2, drift: -4 }, expected: 24, group: 'negative_drift' },
    { inputs: { start: 0, boost: 8, scale: 5, drift: 10 }, expected: 30, group: 'zero_start' },
    { inputs: { start: 100, boost: 50, scale: 2, drift: 200 }, expected: 100, group: 'varied_parameters' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_seq_01_1',
      type: 'state-chaining-triad',
      title: '★★ 명령의 연결 고리 찾기',
      prompt: '앞선 계산의 결과가 다음 연산에 어떻게 이어지는지 확인해 보세요.',
      codeSnippet: `# [순차적 계산 흐름]\n# 1단계: (start + boost) ➔ 시작 위치에 boost를 먼저 더함\n# 2단계: (1단계 결과) * scale - drift ➔ 앞의 결과에 배율을 곱하고 감속 적용`,
      questions: [
        {
          id: 'q1',
          text: 'start=2, boost=3, scale=4, drift=1 일 때, 가장 먼저 계산되는 1단계(start + boost)의 중간 결과는 얼마인가요?',
          options: [
            { value: '2', label: '2' },
            { value: '5', label: '5' },
            { value: '8', label: '8' },
            { value: '19', label: '19' },
          ],
          expected: '5',
        },
        {
          id: 'q2',
          text: '그다음 2단계에서 scale(4)이 곱해지는 대상은 어떤 값인가요?',
          options: [
            { value: 'updated_5', label: '1단계에서 계산된 중간 결과 (5)' },
            { value: 'initial_2', label: '처음 start 값 (2)' },
            { value: 'boost_3', label: 'boost 값 (3)' },
          ],
          expected: 'updated_5',
        },
        {
          id: 'q3',
          text: '만약 괄호 없이 start * scale + boost - drift처럼 [곱셈]을 [boost 더하기]보다 먼저 계산하면, 원래 계산 결과와 항상 같을까요?',
          options: [
            { value: 'different', label: '다를 수 있다 (계산 순서에 따라 최종 결과가 달라짐)' },
            { value: 'always_same', label: '항상 같다 (계산 항목이 같으므로)' },
          ],
          expected: 'different',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_seq_01_t1',
      title: '우주선 온도 제어 장치',
      description: '기본 온도(base)에 가열(heat)을 더하고 배율(rate)을 곱한 뒤 냉각(cool)을 뺀 최종 온도를 반환하세요.',
      entryFunction: 'calculate_final_temperature',
      starterCode: `def calculate_final_temperature(base, heat, rate, cool):
    # 가열, 배율 적용, 냉각 순서로 최종 온도를 계산하세요.
    pass
`,
      officialSolutionCode: `def calculate_final_temperature(base, heat, rate, cool):
    temp = base
    temp = temp + heat
    temp = temp * rate
    temp = temp - cool
    return temp
`,
      testCases: [
        { inputs: { base: 10, heat: 5, rate: 2, cool: 4 }, expected: 26 },
        { inputs: { base: 0, heat: 3, rate: 4, cool: 2 }, expected: 10 },
      ],
    },
  ],
}
