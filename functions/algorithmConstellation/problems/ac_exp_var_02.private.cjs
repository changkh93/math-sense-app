/**
 * Private Problem Definition: AC-EXP-VAR-02 (사라진 변수 값)
 */

module.exports = {
  problemId: 'AC-EXP-VAR-02',
  problemVersion: 1,
  entryFunction: 'update_signal',
  officialSolutionCode: `def update_signal(old_level, new_level):
    signal = old_level
    signal = new_level
    return signal
`,
  alternativeSolutions: [
    `def update_signal(old_level, new_level):
    return new_level
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'VAR-COMBINE-NOT-OVERWRITE',
      misconceptionCode: 'COMBINE-RATHER-THAN-OVERWRITE',
      expectedMisconception: 'COMBINE-RATHER-THAN-OVERWRITE',
      expectedFailingGroup: 'positive_levels',
      code: `def update_signal(old_level, new_level):
    return old_level + new_level
`,
    },
    {
      id: 'VAR-RETURN-OLD',
      misconceptionCode: 'RETURN-ORIGINAL-STATE',
      expectedMisconception: 'RETURN-ORIGINAL-STATE',
      expectedFailingGroup: 'positive_levels',
      code: `def update_signal(old_level, new_level):
    signal = old_level
    return signal
`,
    },
    {
      id: 'VAR-HARDCODED-NEW',
      misconceptionCode: 'HARDCODED-SAMPLE-RETURN',
      expectedMisconception: 'HARDCODED-SAMPLE-RETURN',
      expectedFailingGroup: 'zero_level',
      code: `def update_signal(old_level, new_level):
    return 70
`,
    },
  ],
  hiddenTests: [
    { inputs: { old_level: 100, new_level: 250 }, expected: 250, group: 'positive_levels' },
    { inputs: { old_level: 80, new_level: 0 }, expected: 0, group: 'zero_level' },
    { inputs: { old_level: 40, new_level: -15 }, expected: -15, group: 'negative_level' },
    { inputs: { old_level: 99, new_level: 99 }, expected: 99, group: 'same_value' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_var_02_1',
      title: '★★ 30은 언제 사라졌을까?',
      type: 'trace_understanding',
      prompt: '새 값을 저장할 때 변수 안에서 어떤 일이 일어나는지 찾아보세요.',
      codeSnippet: `def update_signal(old_level, new_level):
    signal = old_level    # 1행: old_level (30) 대입
    signal = new_level    # 2행: new_level (70) 대입 (이전 값 덮어쓰기)
    return signal         # 3행: signal 반환`,
      questions: [
        {
          id: 'q1',
          text: 'signal에 들어 있던 30이 더 이상 signal에 남아 있지 않게 되는 순간은 어느 줄일까요?',
          options: [
            { value: 'line2', label: '2행: signal = new_level' },
            { value: 'line1', label: '1행: signal = old_level' },
            { value: 'line3', label: '3행: return signal' },
          ],
          expected: 'line2',
        },
        {
          id: 'q2',
          text: '관제소에서 이전 신호 30도 나중에 필요하다고 합니다. signal = new_level을 실행하기 전에 무엇을 해야 할까요?',
          options: [
            { value: 'backup', label: 'backup = signal (덮어쓰기 전에 다른 변수에 미리 보관한다)' },
            { value: 'overwrite', label: 'signal = new_level (그대로 새 값을 덮어쓴다)' },
            { value: 'reset', label: 'signal = 0 (변수를 0으로 비운다)' },
          ],
          expected: 'backup',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_var_02_t1',
      title: '사라지기 전에 기억하라 — 관제소 재고 보정',
      description: '초기 재고(initial_stock)에 도착한 광석(arrived)을 더한 계산 재고를 구하세요. 이후 실제 확인 재고(verified_stock)로 덮어쓰기 전에 필요한 값을 보관하여, 계산 재고와 실제 확인 재고의 차이(계산 재고 - 실제 확인 재고)를 반환하세요.',
      contextCard: {
        title: '📋 광석 창고 재고 보정 흐름',
        steps: [
          { label: '① 초기 재고', text: 'initial_stock (예: 40)' },
          { label: '② 광석 도착 (+)', text: '계산 재고 = 40 + 15 = 55' },
          { label: '③ 실제 조사값 도착', text: 'verified_stock = 52' },
          { label: '④ 최종 반환값', text: '보정량 = 55 - 52 = 3' },
        ],
      },
      thoughtCheck: {
        prompt: '실제 확인 수량(52)으로 재고 변수를 덮어쓰고 나면, 앞서 계산했던 55는 어떻게 될까요?',
        options: [
          { id: 'opt_lost', label: '변수에서 사라진다 (덮어쓰기 전에 미리 보관해야 한다)', isCorrect: true },
          { id: 'opt_stay', label: '변수 안에 계속 남아 있다', isCorrect: false },
        ],
        feedback: '맞아요! 새 값을 대입하면 이전 계산값(55)은 사라지므로, 차이를 구하려면 덮어쓰기 전에 보존하거나 기억해야 합니다.',
      },
      entryFunction: 'calculate_stock_correction',
      starterCode: `def calculate_stock_correction(initial_stock, arrived, verified_stock):
    # 1. 초기 재고에 도착한 광석을 더해 계산 재고를 구하세요.
    # 2. 계산 재고가 덮어써지기 전에 보관하여, (계산 재고 - 실제 확인 재고)의 차이를 반환하세요.
    pass
`,
      officialSolutionCode: `def calculate_stock_correction(initial_stock, arrived, verified_stock):
    stock = initial_stock + arrived
    calculated_stock = stock
    stock = verified_stock
    return calculated_stock - stock
`,
      testCases: [
        { inputs: { initial_stock: 40, arrived: 15, verified_stock: 52 }, expected: 3 },
        { inputs: { initial_stock: 100, arrived: 20, verified_stock: 110 }, expected: 10 },
        { inputs: { initial_stock: 30, arrived: 0, verified_stock: 30 }, expected: 0 },
        { inputs: { initial_stock: 50, arrived: 25, verified_stock: 80 }, expected: -5 },
      ],
    },
  ],
}
