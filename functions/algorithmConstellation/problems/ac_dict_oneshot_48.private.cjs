/**
 * AC-DICT-ONESHOT-48 Private Problem Definition
 */
module.exports = {
  problemId: 'AC-DICT-ONESHOT-48',
  problemVersion: 1,
  entryFunction: 'detect_energy_pair_once',
  officialSolutionCode: `def detect_energy_pair_once(energies, target):
    seen = set()
    for energy in energies:
        needed = target - energy
        if needed in seen:
            return True
        seen.add(energy)
    return False
`,
  alternativeSolutions: [
    `def detect_energy_pair_once(energies, target):
    history = set()
    for e in energies:
        req = target - e
        if req in history:
            return True
        else:
            history.add(e)
    return False
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'ONESHOT-ADDS-BEFORE-CHECK',
      expectedFailingGroup: 'single-self-reuse',
      code: `def detect_energy_pair_once(energies, target):
    seen = set()
    for energy in energies:
        seen.add(energy)
        needed = target - energy
        if needed in seen:
            return True
    return False
`,
    },
    {
      id: 'ONESHOT-NEVER-REMEMBERS',
      expectedFailingGroup: 'late-complement',
      code: `def detect_energy_pair_once(energies, target):
    seen = set()
    for energy in energies:
        needed = target - energy
        if needed in seen:
            return True
    return False
`,
    },
    {
      id: 'ONESHOT-RESETS-SEEN',
      expectedFailingGroup: 'reset-memory',
      code: `def detect_energy_pair_once(energies, target):
    for energy in energies:
        seen = set()
        needed = target - energy
        if needed in seen:
            return True
        seen.add(energy)
    return False
`,
    },
    {
      // "직전 값 하나만 기억" 오개념: 인접한 쌍만 찾는다. 제한형 Python은
      // 'is not'을 지원하지 않으므로 불리언 플래그로 직전 값 존재를 표현한다.
      id: 'ONESHOT-LAST-VALUE-ONLY',
      expectedFailingGroup: 'late-complement',
      code: `def detect_energy_pair_once(energies, target):
    last = None
    has_last = False
    for energy in energies:
        needed = target - energy
        if has_last and needed == last:
            return True
        last = energy
        has_last = True
    return False
`,
    },
  ],
  hiddenTests: [
    // 뒤쪽에 짝이 있지만 인접한 쌍(10+20, 20+40, 40+30)으로는 50을 만들 수
    // 없는 입력. "직전 값만 기억" 오개념(인접 쌍만 확인)을 값 불일치로 잡는다.
    { inputs: { energies: [10, 20, 40, 30], target: 50 }, expected: true, group: 'late-complement' },
    { inputs: { energies: [6, 6], target: 12 }, expected: true, group: 'duplicate-values' },
    { inputs: { energies: [6], target: 12 }, expected: false, group: 'single-self-reuse' },
    { inputs: { energies: [1, 5, 9, 13, 17], target: 18 }, expected: true, group: 'reset-memory' },
    { inputs: { energies: [-10, 30, 5], target: 20 }, expected: true, group: 'zero-and-negative' },
    { inputs: { energies: [2, 4, 6], target: 15 }, expected: false, group: 'no-pair' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_dict_048_1',
      title: '단일 순회 기억과 확인 순서 이해',
      prompt: '지나온 값을 기억 보관함에 담으며 탐색할 때의 핵심 원리를 점검하세요.',
      questions: [
        {
          id: 'q1',
          text: '현재 캡슐을 보관함(seen)에 넣기 전에 필요한 짝이 있는지 먼저 확인하는 이유는 무엇일까요?',
          options: [
            { value: 'prevent_self_pairing', label: '하나뿐인 현재 캡슐을 자기 자신과 짝지어 두 번 쓰는 오류를 막기 위해' },
            { value: 'save_memory', label: '보관함의 크기를 0으로 유지하기 위해' },
          ],
          expected: 'prevent_self_pairing',
        },
        {
          id: 'q2',
          text: '탐색 도중 보관함(seen)에 보관되는 값들은 어떤 값들일까요?',
          options: [
            { value: 'past_visited_only', label: '이미 검사를 마치고 지나온 과거의 값들만 보관된다' },
            { value: 'all_future_values', label: '아직 방문하지 않은 미래의 값들까지 모두 들어있다' },
          ],
          expected: 'past_visited_only',
        },
        {
          id: 'q3',
          text: '47번(뒤쪽 목록 반복 확인)과 비교했을 때 48번(기억 보관함 단일 순회)의 가장 큰 장점은 무엇일까요?',
          options: [
            { value: 'single_pass_efficiency', label: '목록 뒤쪽을 여러 번 다시 살피지 않고 각 캡슐을 한 번씩만 지나간다' },
            { value: 'fewer_variables', label: '변수를 전혀 사용하지 않는다' },
          ],
          expected: 'single_pass_efficiency',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_dict_048_transfer_1',
      title: '합동 구조 시간을 만드는 두 신호',
      description: '구조 신호 시간 목록(times)에서 지나온 시간을 기억하며, 두 신호 시간의 합이 목표 시간(required_time)과 일치하는 짝이 있는지 판정합니다.',
      entryFunction: 'can_combine_rescue_times_once',
      starterCode: `def can_combine_rescue_times_once(times, required_time):\n    # 지나온 시간을 set에 기억하며 두 신호의 합이 required_time이 되는지 판정하세요.\n    pass\n`,
      officialSolutionCode: `def can_combine_rescue_times_once(times, required_time):
    history = set()
    for t in times:
        req = required_time - t
        if req in history:
            return True
        history.add(t)
    return False
`,
      contextCard: {
        title: '⏱️ 단일 순회 시간 매칭 전략',
        strategyGuide: '각 신호 시간마다 필요한 시간(required_time - time)이 이미 지나온 기억 보관함에 있는지 확인하고, 없으면 현재 시간을 보관함에 추가합니다.',
      },
      thoughtCheck: {
        question: '신호 시간 [4, 9, 5, 11]에서 목표 14를 만들 때, 5를 만났을 때 짝이 발견될까요?',
        options: [
          { value: 'found_at_5', label: '발견된다 (14 - 5 = 9가 이미 보관함 {4, 9}에 있음)' },
          { value: 'not_found', label: '발견되지 않는다' },
        ],
        expected: 'found_at_5',
      },
      testCases: [
        { inputs: { times: [3, 15, 8, 12], required_time: 15 }, expected: true },
        { inputs: { times: [8, 8], required_time: 16 }, expected: true },
        { inputs: { times: [8], required_time: 16 }, expected: false },
        { inputs: { times: [2, 10, 20, 30], required_time: 32 }, expected: true },
        { inputs: { times: [-5, 25, 4], required_time: 20 }, expected: true },
      ],
    },
  ],
}
