/**
 * AC-DICT-MODE-45 Private Problem Definition
 */
module.exports = {
  problemId: 'AC-DICT-MODE-45',
  problemVersion: 1,
  entryFunction: 'most_frequent_signal',
  officialSolutionCode: `def most_frequent_signal(signals):
    counts = {}
    for signal in signals:
        if signal in counts:
            counts[signal] = counts[signal] + 1
        else:
            counts[signal] = 1

    best = signals[0]
    for signal in signals:
        if counts[signal] > counts[best]:
            best = signal
    return best
`,
  alternativeSolutions: [
    `def most_frequent_signal(signals):
    freq = {}
    for s in signals:
        if s not in freq:
            freq[s] = 0
        freq[s] = freq[s] + 1

    winner = signals[0]
    for s in signals:
        if freq[s] > freq[winner]:
            winner = s
    return winner
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'MODE-LAST-TIE-WINS',
      expectedFailingGroup: 'first-tie-wins',
      code: `def most_frequent_signal(signals):
    counts = {}
    for signal in signals:
        if signal in counts:
            counts[signal] = counts[signal] + 1
        else:
            counts[signal] = 1

    best = signals[0]
    for signal in signals:
        if counts[signal] >= counts[best]:
            best = signal
    return best
`,
    },
    {
      id: 'MODE-LEXICOGRAPHIC-MAX',
      expectedFailingGroup: 'non-lexical-winner',
      code: `def most_frequent_signal(signals):
    best = signals[0]
    for s in signals:
        if s > best:
            best = s
    return best
`,
    },
    {
      id: 'MODE-RETURNS-COUNT',
      expectedFailingGroup: 'clear-winner',
      code: `def most_frequent_signal(signals):
    counts = {}
    for signal in signals:
        if signal in counts:
            counts[signal] = counts[signal] + 1
        else:
            counts[signal] = 1

    best = signals[0]
    for signal in signals:
        if counts[signal] > counts[best]:
            best = signal
    return counts[best]
`,
    },
    {
      id: 'MODE-FIRST-ITEM-ONLY',
      expectedFailingGroup: 'winner-at-end',
      code: `def most_frequent_signal(signals):
    return signals[0]
`,
    },
  ],
  hiddenTests: [
    { inputs: { signals: ['A', 'B', 'A', 'C', 'A'] }, expected: 'A', group: 'clear-winner' },
    { inputs: { signals: ['A', 'B', 'C', 'C'] }, expected: 'C', group: 'winner-at-end' },
    { inputs: { signals: ['B', 'A', 'B', 'A'] }, expected: 'B', group: 'first-tie-wins' },
    { inputs: { signals: ['C', 'A', 'B'] }, expected: 'C', group: 'all-tied' },
    { inputs: { signals: ['F'] }, expected: 'F', group: 'single-item' },
    { inputs: { signals: ['Z', 'A', 'A'] }, expected: 'A', group: 'non-lexical-winner' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_dict_045_1',
      title: '최빈값 선택 및 동률 정책 이해',
      prompt: '가장 많이 등장한 항목을 찾을 때의 원리를 확인하세요.',
      questions: [
        {
          id: 'q1',
          text: "신호 ['B', 'A', 'B', 'A']처럼 B와 A가 모두 2회씩 등장했을 때, 규칙에 따른 정답은 무엇일까요?",
          options: [
            { value: 'first_seen_b', label: '먼저 등장한 "B"' },
            { value: 'last_seen_a', label: '나중에 등장한 "A"' },
            { value: 'lexical_a', label: '알파벳 순으로 앞선 "A"' },
          ],
          expected: 'first_seen_b',
        },
        {
          id: 'q2',
          text: '동률일 때 먼저 나온 항목을 유지하려면 비교 조건을 어떻게 작성해야 할까요?',
          options: [
            { value: 'strict_greater', label: '현재 1위보다 엄격히 더 클 때만(>) 교체한다' },
            { value: 'greater_equal', label: '크거나 같을 때(>=) 항상 교체한다' },
          ],
          expected: 'strict_greater',
        },
        {
          id: 'q3',
          text: '이 문제에서 최종적으로 반환해야 하는 값은 무엇일까요?',
          options: [
            { value: 'signal_name', label: '가장 많이 나온 신호 이름(문자열)' },
            { value: 'max_count', label: '최대 등장 횟수(숫자)' },
          ],
          expected: 'signal_name',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_dict_045_transfer_1',
      title: '가장 많이 모은 탐사 배지',
      description: '획득한 배지 목록(badges)에서 가장 개수가 많은 배지를 찾습니다. 동률일 때는 먼저 획득한 배지를 우선합니다.',
      entryFunction: 'most_frequent_badge',
      starterCode: `def most_frequent_badge(badges):\n    # 가장 많이 획득한 배지를 반환하세요 (동률 시 최초 등장 우선).\n    pass\n`,
      officialSolutionCode: `def most_frequent_badge(badges):
    counts = {}
    for badge in badges:
        if badge in counts:
            counts[badge] = counts[badge] + 1
        else:
            counts[badge] = 1

    best = badges[0]
    for badge in badges:
        if counts[badge] > counts[best]:
            best = badge
    return best
`,
      contextCard: {
        title: '🏅 최빈 배지 탐색 전략',
        strategyGuide: '배지별 횟수를 기록표에 모은 뒤, 횟수가 더 큰 배지가 나타날 때만 1위를 바꿉니다.',
      },
      thoughtCheck: {
        question: "배지 목록이 ['STAR', 'MOON', 'STAR']일 때 1위로 선택되는 배지는 무엇일까요?",
        options: [
          { value: 'star_badge', label: "'STAR' 배지 (2회)" },
          { value: 'moon_badge', label: "'MOON' 배지 (1회)" },
        ],
        expected: 'star_badge',
      },
      testCases: [
        { inputs: { badges: ['GOLD', 'SILVER', 'GOLD', 'BRONZE', 'GOLD'] }, expected: 'GOLD' },
        { inputs: { badges: ['RUBY', 'SAPPHIRE', 'SAPPHIRE'] }, expected: 'SAPPHIRE' },
        { inputs: { badges: ['ALPHA', 'BETA', 'ALPHA', 'BETA'] }, expected: 'ALPHA' },
        { inputs: { badges: ['DELTA', 'GAMMA'] }, expected: 'DELTA' },
        { inputs: { badges: ['ONE'] }, expected: 'ONE' },
      ],
    },
  ],
}
