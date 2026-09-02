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
      title: '★★ 경계값 오류를 찾는 가장 빠른 입력',
      type: 'single-choice',
      prompt: '탐사 규정은 "경계선(limit=10)까지 안전(True)"인데, 동료가 return current_pos < limit 으로 코드를 작성했습니다.',
      codeSnippet: `def check_within_boundary(current_pos, limit):
    # 탐사 규정: limit(10)까지 안전(True)이어야 함
    return current_pos < limit  # 실수로 < 기호를 사용함`,
      questions: [
        {
          id: 'q1',
          text: '위 코드는 pos=9(안전)와 pos=11(위험)에서는 정상 작동합니다. 코드의 오류를 밝혀낼 가장 정확한 반례 입력(current_pos)은 무엇일까요?',
          options: [
            { value: '10', label: '10 (경계선 위의 값: 규정은 True여야 하나 코드는 False 반환)' },
            { value: '0', label: '0 (경계선 안쪽: 둘 다 True)' },
            { value: '20', label: '20 (경계선 바깥: 둘 다 False)' },
          ],
          expected: '10',
        },
        {
          id: 'q2',
          text: '경계 조건(Boundary Condition)을 검증할 때 가장 먼저 확인해야 하는 핵심 지점은 어디일까요?',
          options: [
            { value: 'boundary', label: '경계선 바로 위(경계값)와 그 직전/직후 지점' },
            { value: 'random', label: '경계선과 상관없는 임의의 큰 숫자' },
          ],
          expected: 'boundary',
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
