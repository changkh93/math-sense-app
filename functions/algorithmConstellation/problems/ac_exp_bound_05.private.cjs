module.exports = {
  problemId: 'AC-EXP-BOUND-05',
  problemVersion: 1,
  entryFunction: 'check_within_boundary',
  officialSolutionCode: `def check_within_boundary(current_pos, limit):
    return current_pos <= limit
`,
  alternativeSolutions: [
    `def check_within_boundary(current_pos, limit):
    if current_pos <= limit:
        return True
    return False
`,
  ],
  intendedWrongFixtures: [
    {
      label: 'BOUND-STRICT-LESS-THAN',
      code: `def check_within_boundary(current_pos, limit):
    return current_pos < limit
`,
      expectedFailingGroup: 'exact_boundary',
      expectedMisconception: 'BOUNDARY-OFF-BY-ONE-STRICT',
    },
    {
      label: 'BOUND-INVERTED-DIRECTION',
      code: `def check_within_boundary(current_pos, limit):
    return current_pos >= limit
`,
      expectedFailingGroup: 'strictly_inside',
      expectedMisconception: 'BOUNDARY-INVERTED',
    },
    {
      label: 'BOUND-ALWAYS-TRUE',
      code: `def check_within_boundary(current_pos, limit):
    return True
`,
      expectedFailingGroup: 'strictly_outside',
      expectedMisconception: 'HARDCODED-SAMPLE-RETURN',
    },
  ],
  hiddenTests: [
    { inputs: { current_pos: 10, limit: 10 }, expected: true, group: 'exact_boundary' },
    { inputs: { current_pos: 0, limit: 0 }, expected: true, group: 'exact_boundary' },
    { inputs: { current_pos: 50, limit: 50 }, expected: true, group: 'exact_boundary' },
    { inputs: { current_pos: 9, limit: 10 }, expected: true, group: 'strictly_inside' },
    { inputs: { current_pos: 0, limit: 5 }, expected: true, group: 'strictly_inside' },
    { inputs: { current_pos: 11, limit: 10 }, expected: false, group: 'strictly_outside' },
    { inputs: { current_pos: 100, limit: 50 }, expected: false, group: 'strictly_outside' },
    { inputs: { current_pos: 1, limit: 0 }, expected: false, group: 'zero_limit' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_exp_bound_05_1',
      prompt: '경계값 10에 대해 < 와 <= 연산자의 차이를 예측해 보세요.',
      questions: [
        {
          id: 'q1',
          text: '10 <= 10 의 평가 결과는 무엇일까요?',
          options: [
            { value: 'True', label: 'True' },
            { value: 'False', label: 'False' },
          ],
          expected: 'True',
        },
        {
          id: 'q2',
          text: '10 < 10 의 평가 결과는 무엇일까요?',
          options: [
            { value: 'False', label: 'False' },
            { value: 'True', label: 'True' },
          ],
          expected: 'False',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_exp_bound_05_transfer_1',
      title: '산소 소비 한계선 점검',
      description: '현재까지 사용한 산소량(oxygen_used)이 최대 허용 한계(usage_limit) 이하인지 점검하여 안전하면 True, 초과하면 False를 반환하세요. (한계값과 정확히 같아도 안전합니다)',
      entryFunction: 'check_oxygen_usage_safe',
      starterCode: `def check_oxygen_usage_safe(oxygen_used, usage_limit):
    # 산소 소비량이 한계 이하인지 확인하는 코드를 작성하세요.
    pass
`,
      officialSolutionCode: `def check_oxygen_usage_safe(oxygen_used, usage_limit):
    return oxygen_used <= usage_limit
`,
      testCases: [
        { inputs: { oxygen_used: 80, usage_limit: 100 }, expected: true },
        { inputs: { oxygen_used: 100, usage_limit: 100 }, expected: true },
        { inputs: { oxygen_used: 101, usage_limit: 100 }, expected: false },
      ],
    },
  ],
}
