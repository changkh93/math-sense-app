/**
 * AC-DICT-FREQ-44 Private Problem Definition
 */
module.exports = {
  problemId: 'AC-DICT-FREQ-44',
  problemVersion: 1,
  entryFunction: 'build_signal_frequency',
  officialSolutionCode: `def build_signal_frequency(signals):
    counts = {}
    for signal in signals:
        if signal in counts:
            counts[signal] = counts[signal] + 1
        else:
            counts[signal] = 1
    return counts
`,
  alternativeSolutions: [
    `def build_signal_frequency(signals):
    freq = {}
    for s in signals:
        if s not in freq:
            freq[s] = 1
        else:
            freq[s] = freq[s] + 1
    return freq
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'FREQ-RESET-TO-ONE',
      expectedFailingGroup: 'mixed-repeats',
      code: `def build_signal_frequency(signals):
    counts = {}
    for signal in signals:
        counts[signal] = 1
    return counts
`,
    },
    {
      id: 'FREQ-TOTAL-UNDER-ONE-KEY',
      expectedFailingGroup: 'all-distinct',
      code: `def build_signal_frequency(signals):
    counts = {}
    if signals:
        counts[signals[0]] = len(signals)
    return counts
`,
    },
    {
      id: 'FREQ-MISSING-INITIALIZATION',
      expectedFailingGroup: 'single-item',
      code: `def build_signal_frequency(signals):
    counts = {}
    for signal in signals:
        counts[signal] = counts[signal] + 1
    return counts
`,
    },
    {
      id: 'FREQ-DROPS-LAST',
      expectedFailingGroup: 'late-new-key',
      code: `def build_signal_frequency(signals):
    counts = {}
    for i in range(len(signals) - 1):
        s = signals[i]
        if s in counts:
            counts[s] = counts[s] + 1
        else:
            counts[s] = 1
    return counts
`,
    },
  ],
  hiddenTests: [
    { inputs: { signals: ['A', 'B', 'A', 'C', 'B', 'A'] }, expected: { A: 3, B: 2, C: 1 }, group: 'mixed-repeats' },
    { inputs: { signals: ['A', 'B', 'C', 'D'] }, expected: { A: 1, B: 1, C: 1, D: 1 }, group: 'all-distinct' },
    { inputs: { signals: ['C', 'C', 'C', 'C'] }, expected: { C: 4 }, group: 'single-kind' },
    { inputs: { signals: ['F'] }, expected: { F: 1 }, group: 'single-item' },
    { inputs: { signals: [] }, expected: {}, group: 'empty-input' },
    { inputs: { signals: ['A', 'A', 'A', 'B'] }, expected: { A: 3, B: 1 }, group: 'late-new-key' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_dict_044_1',
      title: '신호 빈도표 동작 이해',
      prompt: '신호 빈도표를 작성할 때 일어나는 상황을 올바르게 선택하세요.',
      questions: [
        {
          id: 'q1',
          text: '이미 기록표에 있는 신호가 다시 도착하면 어떻게 해야 할까요?',
          options: [
            { value: 'increment', label: '새 칸을 만들지 않고 기존 이름표의 숫자를 1 늘린다' },
            { value: 'add_new_slot', label: '같은 이름의 새 칸을 옆에 추가한다' },
            { value: 'reset_one', label: '숫자를 다시 1로 덮어쓴다' },
          ],
          expected: 'increment',
        },
        {
          id: 'q2',
          text: '기록표에 처음 들어오는 신호는 왜 1로 시작할까요?',
          options: [
            { value: 'first_count', label: '지금 처음 1번 나타났음을 기록하기 위해' },
            { value: 'fixed_rule', label: '모든 기록표는 항상 0부터 시작해야 해서' },
          ],
          expected: 'first_count',
        },
        {
          id: 'q3',
          text: '신호 목록이 빈 리스트([])라면 반환되는 기록표는 어떤 상태여야 할까요?',
          options: [
            { value: 'empty_dict', label: '아무 이름표도 없는 빈 기록표({})' },
            { value: 'none_val', label: '0' },
          ],
          expected: 'empty_dict',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_dict_044_transfer_1',
      title: '탐사팀 투표 빈도표',
      description: '탐사 대원들이 투표한 후보 목록(votes)을 바탕으로 후보별 득표수를 기록표로 정리합니다.',
      entryFunction: 'build_vote_frequency',
      starterCode: `def build_vote_frequency(votes):\n    # 후보별 득표수를 기록표(dict)로 반환하세요.\n    pass\n`,
      officialSolutionCode: `def build_vote_frequency(votes):
    tally = {}
    for candidate in votes:
        if candidate in tally:
            tally[candidate] = tally[candidate] + 1
        else:
            tally[candidate] = 1
    return tally
`,
      contextCard: {
        title: '🗳️ 투표 집계 전략',
        strategyGuide: '후보 이름을 이름표로 삼아, 표가 나올 때마다 해당 후보의 득표수를 1씩 누적합니다.',
      },
      thoughtCheck: {
        question: '투표 목록을 모두 집계한 뒤 기록표의 각 값(value)이 의미하는 것은 무엇일까요?',
        options: [
          { value: 'vote_count', label: '각 후보가 받은 총 득표수' },
          { value: 'candidate_order', label: '후보가 등장한 순서' },
        ],
        expected: 'vote_count',
      },
      testCases: [
        { inputs: { votes: ['NOVA', 'LUMI', 'NOVA', 'SOL', 'LUMI', 'NOVA'] }, expected: { NOVA: 3, LUMI: 2, SOL: 1 } },
        { inputs: { votes: ['ALPHA', 'BETA', 'GAMMA'] }, expected: { ALPHA: 1, BETA: 1, GAMMA: 1 } },
        { inputs: { votes: ['TEAM_A', 'TEAM_A'] }, expected: { TEAM_A: 2 } },
        { inputs: { votes: ['SOLO'] }, expected: { SOLO: 1 } },
        { inputs: { votes: [] }, expected: {} },
      ],
    },
  ],
}
