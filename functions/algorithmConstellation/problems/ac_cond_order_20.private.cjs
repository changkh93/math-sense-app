module.exports = {
  problemId: 'AC-COND-ORDER-20',
  problemVersion: 1,
  entryFunction: 'apply_discount_priority',
  officialSolutionCode: `def apply_discount_priority(amount):
    if amount >= 1000:
        return 300
    elif amount >= 500:
        return 100
    return 0
`,
  alternativeSolutions: [
    `def apply_discount_priority(amount):
    if amount >= 1000:
        return 300
    if amount >= 500:
        return 100
    return 0
`,
  ],
  intendedWrongFixtures: [
    {
      label: 'ORDER-REVERSED-BRANCH',
      code: `def apply_discount_priority(amount):
    if amount >= 500:
        return 100
    elif amount >= 1000:
        return 300
    return 0
`,
      expectedFailingGroup: 'high_tier_discounts',
      expectedMisconception: 'BRANCH-ORDER-EVALUATION-ERROR',
    },
    {
      label: 'ORDER-MISSING-FALLTHROUGH',
      code: `def apply_discount_priority(amount):
    if amount >= 1000:
        return 300
    elif amount >= 500:
        return 100
`,
      expectedFailingGroup: 'no_discount_range',
      expectedMisconception: 'MISSING-FALLTHROUGH',
    },
    {
      label: 'ORDER-ALWAYS-300',
      code: `def apply_discount_priority(amount):
    return 300
`,
      expectedFailingGroup: 'mid_tier_discounts',
      expectedMisconception: 'HARDCODED-SAMPLE-RETURN',
    },
    {
      label: 'ORDER-STRICT-BOUNDARY',
      code: `def apply_discount_priority(amount):
    if amount > 1000:
        return 300
    elif amount > 500:
        return 100
    return 0
`,
      expectedFailingGroup: 'high_tier_discounts',
      expectedMisconception: 'BOUNDARY-INCLUSION-ERROR',
    },
  ],
  hiddenTests: [
    { inputs: { amount: 1000 }, expected: 300, group: 'high_tier_discounts' },
    { inputs: { amount: 10000 }, expected: 300, group: 'high_tier_discounts' },
    { inputs: { amount: 500 }, expected: 100, group: 'mid_tier_discounts' },
    { inputs: { amount: 999 }, expected: 100, group: 'mid_tier_discounts' },
    { inputs: { amount: 0 }, expected: 0, group: 'no_discount_range' },
    { inputs: { amount: 499 }, expected: 0, group: 'no_discount_range' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_cond_order_20_1',
      prompt: '다중 분기 우선순위와 첫 번째 반례 경계를 확인해 보세요.',
      questions: [
        {
          id: 'q1',
          text: 'amount=1200일 때 500 이상 조건을 먼저 검사하는 버그 코드는 왜 300이 아닌 100을 반환할까요?',
          options: [
            { value: '1200이 500 이상 조건에 먼저 걸려 100을 반환하고 즉시 종료되기 때문', label: '1200이 500 이상 조건에 먼저 걸려 100을 반환하고 즉시 종료되기 때문' },
            { value: '1200이 500보다 작기 때문', label: '1200이 500보다 작기 때문' },
          ],
          expected: '1200이 500 이상 조건에 먼저 걸려 100을 반환하고 즉시 종료되기 때문',
        },
        {
          id: 'q2',
          text: '두 코드의 결과가 처음으로 달라지는 최소 경계 금액(첫 반례)은 얼마일까요?',
          options: [
            { value: '1000 (두 조건이 동시에 참이 되기 시작하는 경계)', label: '1000 (두 조건이 동시에 참이 되기 시작하는 경계)' },
            { value: '500', label: '500' },
          ],
          expected: '1000 (두 조건이 동시에 참이 되기 시작하는 경계)',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_cond_order_20_transfer_1',
      title: '통신 지연 분류 코드 수리',
      description: '지연 시간(delay)이 5 이하는 "CLEAR", 20 이하는 "SLOW", 그 외는 "LOST"를 반환하도록 버그가 있는 조건 순서를 수리하세요.',
      entryFunction: 'classify_signal_delay',
      starterCode: `def classify_signal_delay(delay):
    # 작은 지연을 먼저 구분하지 못하는 버그를 고쳐 보세요.
    if delay <= 20:
        return 'SLOW'
    elif delay <= 5:
        return 'CLEAR'
    return 'LOST'
`,
      officialSolutionCode: `def classify_signal_delay(delay):
    if delay <= 5:
        return 'CLEAR'
    elif delay <= 20:
        return 'SLOW'
    return 'LOST'
`,
      testCases: [
        { inputs: { delay: 0 }, expected: 'CLEAR' },
        { inputs: { delay: 5 }, expected: 'CLEAR' },
        { inputs: { delay: 6 }, expected: 'SLOW' },
        { inputs: { delay: 20 }, expected: 'SLOW' },
        { inputs: { delay: 21 }, expected: 'LOST' },
        { inputs: { delay: 100 }, expected: 'LOST' },
      ],
    },
  ],
}
