/**
 * AC-ENUM-LOCK-70 Private Problem Definition
 */
module.exports = {
  problemId: 'AC-ENUM-LOCK-70',
  problemVersion: 1,
  entryFunction: 'deduce_lock_code',
  // §5.10 v2 재설계: 3자리(000..999)는 측정상 100,000 step 상한 초과로 불가능하므로
  // 반드시 2자리(00..99)로 구현한다. 단서 자릿수는 루프 밖에서 사전 계산한다
  // (2자리 최악 = 14,867 step — Hidden에 최악 케이스 1건까지만 배치).
  officialSolutionCode: `def deduce_lock_code(clues):
    hints = []
    for clue in clues:
        guess = clue[0]
        hints.append([guess // 10, guess % 10, clue[1]])
    for code in range(100):
        match = True
        for hint in hints:
            hits = 0
            if hint[0] == code // 10:
                hits = hits + 1
            if hint[1] == code % 10:
                hits = hits + 1
            if hits != hint[2]:
                match = False
        if match:
            return code
    return -1
`,
  intendedWrongFixtures: [
    {
      // 위치를 무시하고 포함 숫자만 비교하는 오개념.
      id: 'LOCK-COUNTS-CONTAINS-IGNORES-POSITION',
      expectedFailingGroup: 'early-answer',
      code: `def deduce_lock_code(clues):
    hints = []
    for clue in clues:
        guess = clue[0]
        hints.append([guess // 10, guess % 10, clue[1]])
    for code in range(100):
        tens = code // 10
        ones = code % 10
        match = True
        for hint in hints:
            hits = 0
            if hint[0] == tens or hint[0] == ones:
                hits = hits + 1
            if hint[1] == tens or hint[1] == ones:
                hits = hits + 1
            if hits != hint[2]:
                match = False
        if match:
            return code
    return -1
`,
    },
    {
      // 첫 단서만 만족하면 반환하는 오개념.
      id: 'LOCK-FIRST-CLUE-ONLY',
      expectedFailingGroup: 'mid-answer',
      code: `def deduce_lock_code(clues):
    first = clues[0]
    guess = first[0]
    target_tens = guess // 10
    target_ones = guess % 10
    for code in range(100):
        hits = 0
        if target_tens == code // 10:
            hits = hits + 1
        if target_ones == code % 10:
            hits = hits + 1
        if hits == first[1]:
            return code
    return -1
`,
    },
    {
      // 추측의 십의 자리 분해를 누락하는 오개념.
      id: 'LOCK-DIGIT-DECOMPOSITION-ERROR',
      expectedFailingGroup: 'early-answer',
      code: `def deduce_lock_code(clues):
    hints = []
    for clue in clues:
        guess = clue[0]
        hints.append([guess % 10, guess % 10, clue[1]])
    for code in range(100):
        match = True
        for hint in hints:
            hits = 0
            if hint[0] == code // 10:
                hits = hits + 1
            if hint[1] == code % 10:
                hits = hits + 1
            if hits != hint[2]:
                match = False
        if match:
            return code
    return -1
`,
    },
    {
      // 암호가 아니라 첫 단서의 추측을 그대로 반환하는 오개념.
      id: 'LOCK-RETURNS-CLUE',
      expectedFailingGroup: 'mid-answer',
      code: `def deduce_lock_code(clues):
    return clues[0][0]
`,
    },
  ],
  hiddenTests: [
    // 이른 답: 스캔이 거의 즉시 끝난다.
    { inputs: { clues: [[2, 2]] }, expected: 2, group: 'single-clue-exact' },
    { inputs: { clues: [[0, 1], [1, 1], [17, 1]] }, expected: 7, group: 'early-answer' },
    { inputs: { clues: [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [15, 1]] }, expected: 5, group: 'six-clues' },
    { inputs: { clues: [[0, 0], [2, 1], [10, 1]] }, expected: 12, group: 'teens-answer' },
    // 중간 답: 스캔 절반 수준.
    { inputs: { clues: [[0, 0], [6, 1], [40, 1]] }, expected: 46, group: 'mid-answer' },
    // §4.6 규칙상 유일하게 허용되는 최악 스캔(답 99 = 전체 순회, 약 14,867 step).
    { inputs: { clues: [[0, 0], [9, 1], [90, 1]] }, expected: 99, group: 'worst-scan-end' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_enum_070_1',
      title: '제약 교집합 이해',
      prompt: '여러 단서로 후보를 추리는 원리를 점검하세요.',
      questions: [
        {
          id: 'q1',
          text: '후보 하나가 정답이 되려면 단서들을 어떻게 통과해야 할까요?',
          options: [
            { value: 'all_clues', label: '모든 단서와의 일치 개수가 정확히 같아야 한다' },
            { value: 'any_clue', label: '단서 중 하나만 만족하면 충분하다' },
          ],
          expected: 'all_clues',
        },
        {
          id: 'q2',
          text: '일치 자리를 셀 때 십의 자리는 십의 자리끼리 비교하는 이유는 무엇일까요?',
          options: [
            { value: 'position_match', label: '단서가 말하는 것은 위치까지 일치하는 숫자의 개수이기 때문에' },
            { value: 'value_only', label: '숫자가 들어 있기만 하면 되기 때문에' },
          ],
          expected: 'position_match',
        },
        {
          id: 'q3',
          text: '단서를 만나기 전에 추측의 자릿수를 미리 나눠 두면 좋은 이유는 무엇일까요?',
          options: [
            { value: 'precompute_once', label: '후보 100개를 확인하는 동안 같은 나눗셈을 반복하지 않아도 되기 때문에' },
            { value: 'shorter_code', label: '코드가 더 짧아지기 때문에' },
          ],
          expected: 'precompute_once',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_enum_070_transfer_1',
      title: '두 자리 탐사 채널 추리',
      description: '채널 단서 목록(clues, [추측, 일치 자리 수])에서 모든 단서를 만족하는 유일한 두 자리 채널 번호를 찾아 반환합니다.',
      entryFunction: 'find_channel_number',
      starterCode: `def find_channel_number(clues):
    # 모든 단서를 만족하는 채널 번호(0~99)를 반환하세요. 없으면 -1을 반환합니다.
    pass
`,
      officialSolutionCode: `def find_channel_number(clues):
    hints = []
    for clue in clues:
        guess = clue[0]
        hints.append([guess // 10, guess % 10, clue[1]])
    for channel in range(100):
        match = True
        for hint in hints:
            hits = 0
            if hint[0] == channel // 10:
                hits = hits + 1
            if hint[1] == channel % 10:
                hits = hits + 1
            if hits != hint[2]:
                match = False
        if match:
            return channel
    return -1
`,
      contextCard: {
        title: '📻 채널 번호 추리 전략',
        strategyGuide: '후보 번호를 0부터 99까지 하나씩 만들어 보며, 단서마다 십의 자리와 일의 자리 일치 개수를 확인해 모든 단서를 통과한 첫 후보를 답으로 삼습니다.',
      },
      thoughtCheck: {
        question: '단서 [단서: 추측 40, 일치 1]은 후보 46을 남길까요?',
        options: [
          { value: 'keep', label: '남긴다 — 십의 자리 4가 일치해 일치 개수 1과 같다' },
          { value: 'drop', label: '버린다 — 두 자리가 모두 일치해야 한다' },
        ],
        expected: 'keep',
      },
      testCases: [
        // 이른 답 위주로 구성해 Transfer 공식 해법의 누적 예산(20,000 step)을 지킨다.
        { inputs: { clues: [[0, 1], [1, 1], [13, 1]] }, expected: 3 },
        { inputs: { clues: [[0, 1], [1, 1], [14, 1]] }, expected: 4 },
        { inputs: { clues: [[0, 0], [1, 1], [30, 1]] }, expected: 31 },
        { inputs: { clues: [[0, 0], [3, 1], [30, 1]] }, expected: 33 },
      ],
    },
  ],
}
