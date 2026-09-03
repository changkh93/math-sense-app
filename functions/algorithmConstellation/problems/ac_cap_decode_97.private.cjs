/** Server-only definition: AC-CAP-DECODE-97. */
module.exports = {
  problemId: 'AC-CAP-DECODE-97',
  problemVersion: 1,
  entryFunction: 'decode_alien_signal',
  starterCode: `def decode_alien_signal(pairs):
    # [총_길이, 심볼별_등장_빈도표, 최다_심볼]을 반환하세요.
    pass
`,
  officialSolutionCode: `def decode_alien_signal(pairs):
    if len(pairs) == 0:
        return [0, {}, ""]
    total_len = 0
    freq = {}
    first_seen = []
    for p in pairs:
        cnt = p[0]
        sym = p[1]
        total_len = total_len + cnt
        if sym not in freq:
            freq[sym] = 0
            first_seen.append(sym)
        freq[sym] = freq[sym] + cnt
    max_cnt = -1
    best_sym = ""
    for sym in first_seen:
        c = freq[sym]
        if c > max_cnt:
            max_cnt = c
            best_sym = sym
    return [total_len, freq, best_sym]
`,
  alternativeSolutions: [
    `def decode_alien_signal(pairs):
    tot = 0
    d = {}
    order = []
    for pair in pairs:
        k = pair[0]
        s = pair[1]
        tot = tot + k
        if s not in d:
            d[s] = 0
            order.append(s)
        d[s] = d[s] + k
    top = ""
    mx = -1
    for s in order:
        if d[s] > mx:
            mx = d[s]
            top = s
    return [tot, d, top]
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'OMITS-FREQ-DICT',
      expectedFailingGroup: 'frequency_table',
      code: `def decode_alien_signal(pairs):
    if len(pairs) == 0:
        return [0, {}, ""]
    tot = 0
    for p in pairs:
        tot = tot + p[0]
    return [tot, {}, pairs[0][1]]
`,
    },
    {
      id: 'TIE-LAST-SEEN',
      expectedFailingGroup: 'tie_resolution',
      code: `def decode_alien_signal(pairs):
    if len(pairs) == 0:
        return [0, {}, ""]
    tot = 0
    freq = {}
    order = []
    for p in pairs:
        tot = tot + p[0]
        s = p[1]
        if s not in freq:
            freq[s] = 0
            order.append(s)
        freq[s] = freq[s] + p[0]
    best = ""
    mx = -1
    for s in order:
        if freq[s] >= mx:
            mx = freq[s]
            best = s
    return [tot, freq, best]
`,
    },
    {
      id: 'ZERO-COUNT-AS-ONE',
      expectedFailingGroup: 'zero_handling',
      code: `def decode_alien_signal(pairs):
    if len(pairs) == 0:
        return [0, {}, ""]
    tot = 0
    freq = {}
    for p in pairs:
        c = p[0]
        if c == 0:
            c = 1
        tot = tot + c
        s = p[1]
        if s not in freq:
            freq[s] = 0
        freq[s] = freq[s] + c
    return [tot, freq, pairs[0][1]]
`,
    },
    {
      id: 'TOTAL-LENGTH-ONLY',
      expectedFailingGroup: 'empty_input',
      code: `def decode_alien_signal(pairs):
    tot = 0
    for p in pairs:
        tot = tot + p[0]
    return tot
`,
    },
  ],
  hiddenTests: [
    {
      inputs: { pairs: [] },
      expected: [0, {}, ''],
      group: 'empty_input',
    },
    {
      inputs: { pairs: [[0, 'A']] },
      expected: [0, { A: 0 }, 'A'],
      group: 'zero_handling',
    },
    {
      inputs: { pairs: [[2, 'A'], [2, 'B']] },
      expected: [4, { A: 2, B: 2 }, 'A'],
      group: 'tie_resolution',
    },
    {
      inputs: { pairs: [[2, 'P'], [5, 'Q'], [4, 'P']] },
      expected: [11, { P: 6, Q: 5 }, 'P'],
      group: 'frequency_table',
    },
    {
      inputs: {
        pairs: [
          [1, 'X'], [2, 'Y'], [3, 'Z'], [4, 'X'], [1, 'Y'],
          [2, 'W'], [1, 'Z'], [5, 'W'], [2, 'X'], [3, 'Y'],
          [1, 'V'], [2, 'U'],
        ],
      },
      expected: [
        27,
        { X: 7, Y: 6, Z: 4, W: 7, V: 1, U: 2 },
        'X',
      ],
      group: 'large_scale',
    },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_cap_097_1',
      title: '외계 신호 해독 통합 원리',
      prompt: '신호 복원과 빈도 요약의 규칙을 확인하세요.',
      questions: [
        {
          id: 'q1',
          text: "입력이 빈 목록 []일 때 반환해야 하는 규약 값은 무엇인가요?",
          options: [
            { value: 'empty_spec', label: "[0, {}, '']" },
            { value: 'none_spec', label: "None" },
          ],
          expected: 'empty_spec',
        },
        {
          id: 'q2',
          text: "두 심볼의 총 등장 횟수가 동일할 때 최다 심볼을 결정하는 기준은?",
          options: [
            { value: 'first_seen', label: '해독 순서상 먼저 등장한 심볼' },
            { value: 'alphabetical', label: '알파벳 역순' },
          ],
          expected: 'first_seen',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_cap_097_transfer_1',
      title: '유성우 관측 로그 요약',
      description: '유성우 관측 쌍 pairs([[개수, 타입], ...])가 주어질 때 [총 유성 수, 타입별 유성 수 사전, 최다 관측 타입]을 반환하세요.',
      entryFunction: 'summarize_meteor_log',
      starterCode: `def summarize_meteor_log(pairs):
    # [총_유성_수, 타입별_유성_수_사전, 최다_타입]을 반환하세요.
    pass
`,
      officialSolutionCode: `def summarize_meteor_log(pairs):
    if len(pairs) == 0:
        return [0, {}, ""]
    tot = 0
    freq = {}
    seen = []
    for p in pairs:
        k = p[0]
        t = p[1]
        tot = tot + k
        if t not in freq:
            freq[t] = 0
            seen.append(t)
        freq[t] = freq[t] + k
    mx = -1
    best = ""
    for t in seen:
        if freq[t] > mx:
            mx = freq[t]
            best = t
    return [tot, freq, best]
`,
      contextCard: {
        title: '🌠 유성우 집계',
        strategyGuide: '동일 유성 타입을 합산하고 첫 등장 순서를 기억하여 동률 시 첫 번째 타입을 선택합니다.',
      },
      thoughtCheck: {
        question: "[[2, 'ALPHA'], [2, 'BETA']]의 최다 타입은?",
        options: [
          { value: 'ans_alpha', label: "'ALPHA' (먼저 관측됨)" },
          { value: 'ans_beta', label: "'BETA'" },
        ],
        expected: 'ans_alpha',
      },
      testCases: [
        {
          inputs: { pairs: [] },
          expected: [0, {}, ''],
        },
        {
          inputs: { pairs: [[0, 'Z']] },
          expected: [0, { Z: 0 }, 'Z'],
        },
        {
          inputs: { pairs: [[4, 'GAMMA'], [1, 'DELTA'], [2, 'GAMMA']] },
          expected: [7, { GAMMA: 6, DELTA: 1 }, 'GAMMA'],
        },
      ],
    },
  ],
}
