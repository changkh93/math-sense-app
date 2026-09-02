/**
 * Private Problem Definition: AC-NAV-005 (Emergency Signal Queue)
 * Focus: FIFO Queue Concept, Deque Operations (append, popleft)
 */

module.exports = {
  problemId: 'AC-NAV-005',
  version: 1,
  checksum: 'sha256:ac_nav_005_v1_auth_2026',
  entryFunction: 'process_signals',
  canonicalStrategy: 'from collections import deque; queue = deque(signals); while queue: processed.append(queue.popleft())',
  officialSolutionCode: `from collections import deque\n\ndef process_signals(signals):\n    queue = deque(signals)\n    processed = []\n    while queue:\n        signal = queue.popleft()\n        processed.append(signal)\n    return processed\n`,
  alternativeSolutions: [
    `def process_signals(signals):\n    res = []\n    for s in signals:\n        res.append(s)\n    return res\n`,
  ],
  intendedWrongSolutions: [
    {
      id: 'wrong_stack_pop_instead_of_queue',
      misconceptionCode: 'STQ-STACK-LIFO-01',
      code: `from collections import deque\n\ndef process_signals(signals):\n    queue = deque(signals)\n    processed = []\n    while queue:\n        signal = queue.pop()\n        processed.append(signal)\n    return processed\n`,
      expectedFailureGroup: 'fifo_order_check',
    },
    {
      id: 'wrong_return_empty',
      misconceptionCode: 'STQ-EMPTY-02',
      code: `def process_signals(signals):\n    return []\n`,
      expectedFailureGroup: 'fifo_order_check',
    },
  ],
  get intendedWrongFixtures() {
    return this.intendedWrongSolutions
  },
  publicTests: [
    { id: 'p1', inputs: { signals: ['A', 'B', 'C'] }, expected: ['A', 'B', 'C'] },
    { id: 'p2', inputs: { signals: ['Alpha', 'Beta'] }, expected: ['Alpha', 'Beta'] },
    { id: 'p3', inputs: { signals: ['SOS'] }, expected: ['SOS'] },
    { id: 'p4', inputs: { signals: [] }, expected: [] },
  ],
  hiddenTests: [
    { id: 'h1', inputs: { signals: ['S1', 'S2', 'S3', 'S4'] }, expected: ['S1', 'S2', 'S3', 'S4'], group: 'fifo_order_check' },
    { id: 'h2', inputs: { signals: ['TargetX', 'TargetY'] }, expected: ['TargetX', 'TargetY'], group: 'fifo_order_check' },
    { id: 'h3', inputs: { signals: [] }, expected: [], group: 'empty_queue' },
    { id: 'h4', inputs: { signals: ['Single'] }, expected: ['Single'], group: 'single_element' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_nav_05_01',
      type: 'queue_fifo_prediction',
      prompt: '대기열 queue = [A, B, C] 에서 원소를 꺼낼 때의 순서를 예측하세요.',
      questions: [
        { id: 'q1', text: 'queue.popleft()를 처음 실행하면 A가 꺼내지나요?', expected: true },
        { id: 'q2', text: 'queue.pop()을 실행하면 맨 뒤의 C가 꺼내지나요 (스택 방식)?', expected: true },
      ],
    },
  ],
  transferChallenges: [
    {
      transferChallengeId: 'AC-NAV-005-T1',
      title: '화물 선적 대기열 처리',
      description: '화물 목록(cargo_list)을 먼저 도착한 순서대로 차례로 선적하여 반환하세요.',
      entryFunction: 'process_cargo',
      starterCode: `from collections import deque\n\ndef process_cargo(cargo_list):\n    # 먼저 도착한 화물부터 순서대로 꺼내는 코드를 작성해 보세요.\n    pass\n`,
      officialSolutionCode: `from collections import deque\n\ndef process_cargo(cargo_list):\n    queue = deque(cargo_list)\n    processed = []\n    while queue:\n        cargo = queue.popleft()\n        processed.append(cargo)\n    return processed\n`,
      contextCard: {
        title: '📦 선입선출 화물 선적',
        strategyGuide: '먼저 도착한 화물을 맨 앞에서부터 popleft()로 꺼내어 선적 순서대로 목록에 담습니다.',
      },
      thoughtCheck: {
        question: '대기열 ["C1", "C2"]에서 첫 번째로 꺼내지는 화물은 무엇일까요?',
        options: [
          { value: 'c1', label: 'C1 (가장 먼저 도착한 화물)' },
          { value: 'c2', label: 'C2 (나중에 도착한 화물)' },
        ],
        expected: 'c1',
      },
      testCases: [
        { inputs: { cargo_list: ['Box1', 'Box2', 'Box3'] }, expected: ['Box1', 'Box2', 'Box3'] },
        { inputs: { cargo_list: ['Ore'] }, expected: ['Ore'] },
        { inputs: { cargo_list: [] }, expected: [] },
      ],
    },
  ],
  get transferMasterSet() {
    return this.transferChallenges
  },
}
