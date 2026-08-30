/**
 * Private Problem Definition: AC-SEQ-RUNNING-35 (항해 일지의 누적 에너지)
 */

module.exports = {
  problemId: 'AC-SEQ-RUNNING-35',
  problemVersion: 1,
  entryFunction: 'build_energy_journal',
  officialSolutionCode: `def build_energy_journal(changes):
    journal = []
    total = 0
    for delta in changes:
        total = total + delta
        journal.append(total)
    return journal
`,
  alternativeSolutions: [
    `def build_energy_journal(changes):
    res = []
    cur = 0
    for i in range(len(changes)):
        cur += changes[i]
        res.append(cur)
    return res
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'RUNNING-RETURNS-FINAL-ONLY',
      misconceptionCode: 'SEQ-FINAL-SUM-ONLY',
      expectedMisconception: 'SEQ-FINAL-SUM-ONLY',
      expectedFailingGroup: 'longer_sequence',
      code: `def build_energy_journal(changes):
    total = 0
    for delta in changes:
        total = total + delta
    return total
`,
    },
    {
      id: 'RUNNING-APPENDS-RAW-ITEM',
      misconceptionCode: 'SEQ-APPEND-INPUT-DIRECTLY',
      expectedMisconception: 'SEQ-APPEND-INPUT-DIRECTLY',
      expectedFailingGroup: 'all_positive',
      code: `def build_energy_journal(changes):
    journal = []
    for delta in changes:
        journal.append(delta)
    return journal
`,
    },
    {
      id: 'RUNNING-RESETS-TOTAL',
      misconceptionCode: 'SEQ-RESET-TOTAL-EACH-STEP',
      expectedMisconception: 'SEQ-RESET-TOTAL-EACH-STEP',
      expectedFailingGroup: 'all_positive',
      code: `def build_energy_journal(changes):
    journal = []
    for delta in changes:
        total = 0
        total = total + delta
        journal.append(total)
    return journal
`,
    },
  ],
  hiddenTests: [
    { inputs: { changes: [2, 4, 6, 8] }, expected: [2, 6, 12, 20], group: 'all_positive' },
    { inputs: { changes: [-3, -5, -2] }, expected: [-3, -8, -10], group: 'all_negative' },
    { inputs: { changes: [5, -5, 10, -10] }, expected: [5, 0, 10, 0], group: 'returns_to_zero' },
    { inputs: { changes: [0, 7, 0, -3] }, expected: [0, 7, 7, 4], group: 'contains_zero' },
    { inputs: { changes: [1, -2, 3, -4, 5] }, expected: [1, -1, 2, -2, 3], group: 'longer_sequence' },
    { inputs: { changes: [] }, expected: [], group: 'empty' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_seq_running_35_1',
      title: '★★ 매 순간 상태 기록과 단일 합산의 차이',
      type: 'trace_understanding',
      prompt: 'changes = [4, -2, 3]에서 누적합 리스트를 만드는 과정을 확인하세요.',
      codeSnippet: `def build_energy_journal(changes):
    journal = []
    total = 0
    for delta in changes:
        total = total + delta
        journal.append(total)
    return journal`,
      questions: [
        {
          id: 'q1',
          text: '중간에 음수 변화량(-2)을 만나면 그 시점의 journal 항목은 어떻게 될까요?',
          options: [
            { value: 'decreases', label: '직전 누적값에서 감소한 값이 기록된다 (4 -> 2)' },
            { value: 'ignored', label: '음수는 무시되고 4가 유지된다' },
            { value: 'resets', label: '0으로 초기화된다' },
          ],
          expected: 'decreases',
        },
        {
          id: 'q2',
          text: '반환되는 journal 리스트의 원소 개수는 입력 changes 리스트의 원소 개수와 어떤 관계일까요?',
          options: [
            { value: 'same_length', label: '매 원소마다 하나씩 append되므로 길이가 항상 같다' },
            { value: 'always_one', label: '최종 합 하나이므로 항상 길이가 1이다' },
          ],
          expected: 'same_length',
        },
        {
          id: 'q3',
          text: 'changes = [] 빈 리스트가 주어지면 반환값은 무엇일까요?',
          options: [
            { value: 'empty_list', label: '[] (빈 리스트)' },
            { value: 'zero_val', label: '0' },
            { value: 'none_val', label: 'None' },
          ],
          expected: 'empty_list',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_seq_running_35_t1',
      title: '탐사 로버 위치 일지 작성',
      description: '로버의 1차원 이동량 리스트(moves)가 주어질 때, 0번 지점에서 출발하여 매 이동 직후의 위치를 담은 일지 리스트를 반환하세요.',
      contextCard: {
        title: '📋 이동 위치 일지 작성 흐름',
        steps: [
          { label: '관찰', text: '출발 위치 0에서 시작하여 빈 일지를 준비합니다.' },
          { label: '구분', text: '각 이동량을 차례로 반영하여 현재 위치를 갱신합니다.' },
          { label: '상태 갱신', text: '이동 직후의 위치를 일지 목록의 맨 뒤에 차례로 기록합니다.' },
        ],
      },
      thoughtCheck: {
        prompt: '이동 직후의 위치를 일지에 기록하는 시점은 언제여야 할까요?',
        options: [
          { id: 'opt_after_update', label: '현재 위치에 이동량을 반영한 직후', isCorrect: true },
          { id: 'opt_before_update', label: '이동량을 반영하기 직전', isCorrect: false },
        ],
        feedback: '맞아요! 이동이 반영된 후의 새로운 위치를 일지에 차례로 덧붙여야 정확한 이동 궤적이 기록됩니다.',
      },
      entryFunction: 'build_position_log',
      starterCode: `def build_position_log(moves):
    # 매 이동 직후의 위치를 담은 리스트를 반환하세요.
    pass
`,
      officialSolutionCode: `def build_position_log(moves):
    log = []
    pos = 0
    for m in moves:
        pos = pos + m
        log.append(pos)
    return log
`,
      testCases: [
        { inputs: { moves: [1, 2, 3, 4] }, expected: [1, 3, 6, 10] },
        { inputs: { moves: [-5, 10, -5] }, expected: [-5, 5, 0] },
        { inputs: { moves: [0, 0, 0] }, expected: [0, 0, 0] },
        { inputs: { moves: [] }, expected: [] },
      ],
    },
  ],
}
