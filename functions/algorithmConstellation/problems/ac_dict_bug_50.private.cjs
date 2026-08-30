/**
 * AC-DICT-BUG-50 Private Problem Definition
 */
module.exports = {
  problemId: 'AC-DICT-BUG-50',
  problemVersion: 1,
  entryFunction: 'repair_signal_frequency',
  officialSolutionCode: `def repair_signal_frequency(signals):
    counts = {}
    for signal in signals:
        if signal in counts:
            counts[signal] = counts[signal] + 1
        else:
            counts[signal] = 1
    return counts
`,
  intendedWrongFixtures: [
    {
      // Public Starter와 같은 오류: 새 항목을 0으로 초기화한다.
      id: 'FREQBUG-INITIALIZES-ZERO',
      expectedFailingGroup: 'first-new-key',
      code: `def repair_signal_frequency(signals):
    counts = {}
    for signal in signals:
        if signal in counts:
            counts[signal] = counts[signal] + 1
        else:
            counts[signal] = 0
    return counts
`,
    },
    {
      // 반복 등장 때 기존 값을 1로 덮어써 누적이 깨진다.
      id: 'FREQBUG-RESETS-REPEAT',
      expectedFailingGroup: 'repeated-key',
      code: `def repair_signal_frequency(signals):
    counts = {}
    for signal in signals:
        if signal in counts:
            counts[signal] = 1
        else:
            counts[signal] = 1
    return counts
`,
    },
    {
      // 마지막 입력을 아예 처리하지 않는다(슬라이싱으로 마지막 항목 제외).
      id: 'FREQBUG-DROPS-LAST',
      expectedFailingGroup: 'late-new-key',
      code: `def repair_signal_frequency(signals):
    counts = {}
    for signal in signals[:len(signals) - 1]:
        if signal in counts:
            counts[signal] = counts[signal] + 1
        else:
            counts[signal] = 1
    return counts
`,
    },
    {
      // 전체 길이를 첫 key 하나에 몰아 기록한다.
      id: 'FREQBUG-TOTAL-UNDER-FIRST',
      expectedFailingGroup: 'mixed-frequency',
      code: `def repair_signal_frequency(signals):
    counts = {}
    for signal in signals:
        if signal in counts:
            counts[signal] = counts[signal] + 1
        else:
            counts[signal] = len(signals)
    return counts
`,
    },
  ],
  hiddenTests: [
    // 단일 항목: 초기화 오류 즉시 노출 (Starter도 실패하는 핵심 그룹).
    { inputs: { signals: ['M'] }, expected: { M: 1 }, group: 'first-new-key' },
    // 동일 항목 누적.
    { inputs: { signals: ['K', 'K'] }, expected: { K: 2 }, group: 'repeated-key' },
    // 마지막에 새 key 등장: DROPS-LAST 오류를 기각한다.
    { inputs: { signals: ['A', 'B', 'C'] }, expected: { A: 1, B: 1, C: 1 }, group: 'late-new-key' },
    // 여러 key와 반복 혼합: TOTAL-UNDER-FIRST 오류를 기각한다.
    { inputs: { signals: ['A', 'B', 'A', 'C', 'B', 'A'] }, expected: { A: 3, B: 2, C: 1 }, group: 'mixed-frequency' },
    // 빈 입력: Starter와 합리적 fixture 대부분이 통과하는 비판별 그룹 —
    // 공식 해법의 빈 Dictionary 회귀 보호용.
    { inputs: { signals: [] }, expected: {}, group: 'empty-input' },
    // 떨어져 다시 등장하는 key.
    { inputs: { signals: ['R', 'S', 'T', 'R'] }, expected: { R: 2, S: 1, T: 1 }, group: 'separated-repeat' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_dict_050_1',
      title: '최초 상태 차이 찾기 이해',
      prompt: "버그 코드가 ['A', 'B', 'A']를 처리하는 상황에서 기대 상태와 실제 상태를 비교하세요.",
      questions: [
        {
          id: 'q1',
          text: '기대 상태와 실제 상태가 처음 달라지는 단계는 언제일까요?',
          options: [
            { value: 'first_signal', label: '첫 신호 "A"를 처리한 직후 — 새 항목 초기화 단계에서 이미 0으로 어긋난다' },
            { value: 'second_signal', label: '두 번째 신호 "B"를 처리한 직후' },
            { value: 'third_signal', label: '세 번째 신호 "A"를 처리한 직후 — 최종 A칸이 1이 되는 순간' },
          ],
          expected: 'first_signal',
        },
        {
          id: 'q2',
          text: '처음 등장한 신호의 칸을 1로 기록해야 하는 이유는 무엇일까요?',
          options: [
            { value: 'first_occurrence_is_one', label: '이미 한 번 등장했다는 사실이 1로 기록되어야 이후 등장 때 1씩 늘어나는 규칙과 이어진다' },
            { value: 'always_zero_start', label: '빈도표의 모든 칸은 0에서 시작해야 하므로' },
            { value: 'find_via_empty_input', label: '빈 입력으로 코드를 실행해 보면 바로 알 수 있으므로' },
          ],
          expected: 'first_occurrence_is_one',
        },
        {
          id: 'q3',
          text: '반복 항목을 증가시키는 줄(counts[signal] + 1)은 이미 올바릅니다. 수리해야 할 줄은 어느 쪽일까요?',
          options: [
            { value: 'fix_else_init', label: '처음 보는 신호의 칸을 새로 만드는 줄 (else 쪽 초기화)' },
            { value: 'fix_if_increment', label: '이미 있는 신호의 횟수를 늘리는 줄 (if 쪽 증가)' },
          ],
          expected: 'fix_else_init',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_dict_050_transfer_1',
      title: '투표 집계기의 반복 득표 오류',
      description: '반복 득표가 누적되지 않는 투표 집계기(votes)를 수리해 후보별 득표수 Dictionary를 올바르게 반환합니다.',
      entryFunction: 'repair_vote_frequency',
      starterCode: `def repair_vote_frequency(votes):
    # 이 집계기는 반복 표를 올바르게 누적하지 못합니다. 관찰하고 고쳐 보세요.
    tally = {}
    for vote in votes:
        if vote in tally:
            tally[vote] = 1
        else:
            tally[vote] = 1
    return tally
`,
      officialSolutionCode: `def repair_vote_frequency(votes):
    tally = {}
    for vote in votes:
        if vote in tally:
            tally[vote] = tally[vote] + 1
        else:
            tally[vote] = 1
    return tally
`,
      contextCard: {
        title: '🗳️ 투표 집계 수리 전략',
        strategyGuide: '표를 처음 받은 후보는 칸을 만들어 첫 득표를 기록하고, 이미 칸이 있는 후보는 기존 득표에 다시 더해야 합니다. 초기화와 누적의 역할 차이에 주목하세요.',
      },
      thoughtCheck: {
        question: "버그 집계기가 ['X', 'Y', 'X']를 처리한 뒤 X의 득표수는 얼마로 기록되어 있을까요?",
        options: [
          { value: 'x_is_1', label: '1 — 반복 표가 누적되지 않고 다시 1로 덮어써진다' },
          { value: 'x_is_2', label: '2 — X가 두 번 등장했으므로' },
        ],
        expected: 'x_is_1',
      },
      testCases: [
        // 반복 득표 케이스: Transfer Starter(tally[vote] = 1 덮어쓰기)가 실제로
        // 실패해야 하는 핵심 케이스.
        { inputs: { votes: ['X', 'X'] }, expected: { X: 2 } },
        { inputs: { votes: ['A', 'B', 'A', 'C', 'B', 'A'] }, expected: { A: 3, B: 2, C: 1 } },
        { inputs: { votes: ['Z'] }, expected: { Z: 1 } },
        // 빈 입력: 공식 해법의 빈 Dictionary 회귀 보호용.
        { inputs: { votes: [] }, expected: {} },
        { inputs: { votes: ['P', 'Q', 'P', 'P'] }, expected: { P: 3, Q: 1 } },
      ],
    },
  ],
}
