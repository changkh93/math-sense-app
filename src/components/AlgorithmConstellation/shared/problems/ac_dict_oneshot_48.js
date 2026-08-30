import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_DICT_ONESHOT_48 = createCapabilityPrototypeKernel({
  problemId: 'AC-DICT-ONESHOT-48',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 48,
    constellationId: 'constellation-4',
    routeRole: 'core',
    learningRole: 'anchor',
    recommendedBand: 'EN',
    prerequisites: ['AC-DICT-TWOSUM-47', 'AC-SET-INTERSECT-43'],
  },
  identity: {
    studentTitle: '한 번만 확인하는 에너지 탐지기',
    subtitle: '지나온 에너지를 기억 보관함(set)에 담으며, 각 캡슐을 한 번씩만 확인하여 짝을 찾습니다.',
  },
  pythonConcepts: {
    requires: [
      'builtin:list',
      'builtin:set',
      'method:set_add',
      'statement:for',
      'statement:if',
      'operator:membership-in',
    ],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:complement-search'],
    introduces: ['pattern:remember-then-query'],
  },
  evidenceRecipe: {
    primitives: [
      'container-scan',
      'container-membership',
      'decision',
      'scalar-sequence',
    ],
    requiredClaims: ['ONE_PASS_REMEMBER_THEN_QUERY'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '에너지 [3, 8, 2, 7]에서 목표 9를 만들 때, 지나온 값을 기억하면서 7을 만났을 때 보관함에 들어 있는 값은 무엇일까요?',
      options: [
        { value: 'seen_3_8_2', label: '{3, 8, 2} (앞서 지나온 세 캡슐의 값)' },
        { value: 'seen_all', label: '{3, 8, 2, 7} (7까지 모두 포함)' },
        { value: 'seen_empty', label: '빈 보관함 {}' },
      ],
      expected: 'seen_3_8_2',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '⚡ 단일 순회 기억 탐색판',
          description: '목록 뒤쪽을 다시 훑지 않고, 지나온 캡슐을 기억 보관함에 담아 한 번의 순회로 짝을 찾습니다.',
          variables: [
            { name: 'energy', value: '7', label: '현재 캡슐' },
            { name: 'needed', value: '2', label: '필요한 짝 (9 - 7)' },
            { name: 'seen', value: '{3, 8, 2}', label: '지나온 기억 보관함' },
            { name: 'found', value: 'True', label: '짝 발견 여부' },
          ],
          guidance: '현재 캡슐을 보관함에 넣기 전에 필요한 짝이 이미 보관함에 있는지 먼저 검사합니다.',
        },
        initialState: { energy: null, needed: null, seen: [], found: null },
        initialStateLabel: '시작: 빈 보관함 set(), 목표 9',
        initialStepTitle: '🚀 시작 (단일 순회 기억 탐색)',
        initialPrompt: '각 캡슐을 차례대로 확인하며 기억 보관함을 채웁니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① 0번 캡슐 3 확인',
            operationLabel: '필요한 짝 6이 seen {}에 없음 -> seen에 3 추가',
            codeSnippet: '# 9 - 3 = 6 (없음) -> seen = {3}',
            prompt: '필요한 짝 6이 아직 없으므로 3을 보관함에 기억합니다.',
            stateAfter: { energy: 3, needed: 6, seen: [3], found: null },
          },
          {
            id: 'f1',
            stepTitle: '② 1번 캡슐 8 확인',
            operationLabel: '필요한 짝 1이 seen {3}에 없음 -> seen에 8 추가',
            codeSnippet: '# 9 - 8 = 1 (없음) -> seen = {3, 8}',
            prompt: '필요한 짝 1이 없으므로 8을 보관함에 추가합니다.',
            stateAfter: { energy: 8, needed: 1, seen: [3, 8], found: null },
          },
          {
            id: 'f2',
            stepTitle: '③ 2번 캡슐 2 확인',
            operationLabel: '필요한 짝 7이 seen {3, 8}에 없음 -> seen에 2 추가',
            codeSnippet: '# 9 - 2 = 7 (없음) -> seen = {3, 8, 2}',
            prompt: '필요한 짝 7이 없으므로 2를 보관함에 추가합니다.',
            stateAfter: { energy: 2, needed: 7, seen: [3, 8, 2], found: null },
          },
          {
            id: 'f3',
            stepTitle: '④ 3번 캡슐 7 확인 -> 짝 발견!',
            operationLabel: '필요한 짝 2가 seen {3, 8, 2}에 있음 -> True',
            codeSnippet: '# 9 - 7 = 2 (있음!) -> return True',
            prompt: '필요한 짝 2가 보관함에 들어 있어 뒤쪽을 더 보지 않고 즉시 True를 반환합니다.',
            stateAfter: { energy: 7, needed: 2, seen: [3, 8, 2], found: true },
          },
          {
            id: 'f4_counter',
            stepTitle: '⑤ 반례: 캡슐 [5] 하나만 있을 때',
            operationLabel: '필요한 짝 5가 빈 seen {}에 없음 -> False',
            codeSnippet: '# 10 - 5 = 5 (빈 보관함에 없음) -> False',
            prompt: '검사 전에 먼저 5를 넣지 않으므로 자기 자신을 두 번 쓰는 오류 없이 올바르게 False가 됩니다.',
            stateAfter: { energy: 5, needed: 5, seen: [5], found: false },
          },
        ],
        predictionPrompt: '지나온 값을 기억하며 한 번의 순회로 목표 에너지 짝을 찾을 수 있는지 여부(True/False)를 반환하세요.',
        rulePrompt: '확인 후 기억 단일 순회 규칙',
        ruleStatement: '현재 값의 필요한 짝이 과거 기억에 있는지 먼저 확인하고, 없으면 현재 값을 기억 보관함에 담습니다.',
      },
    },
    code: {
      entryFunction: 'detect_energy_pair_once',
      starterCode: `def detect_energy_pair_once(energies, target):\n    # 지나온 값을 set에 기억하며 한 번의 순회로 짝을 찾아 반환하세요.\n    pass\n`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { energies: [3, 8, 2, 7], target: 9 }, expected: true },
      { inputs: { energies: [6, 1, 4], target: 20 }, expected: false },
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
    transferChallenges: [
      {
        transferChallengeId: 'tc_dict_048_transfer_1',
        title: '합동 구조 시간을 만드는 두 신호',
        description: '구조 신호 시간 목록(times)에서 지나온 시간을 기억하며, 두 신호 시간의 합이 목표 시간(required_time)과 일치하는 짝이 있는지 판정합니다.',
        entryFunction: 'can_combine_rescue_times_once',
        starterCode: `def can_combine_rescue_times_once(times, required_time):\n    # 지나온 시간을 set에 기억하며 두 신호의 합이 required_time이 되는지 판정하세요.\n    pass\n`,
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
          { inputs: { times: [4, 9, 5, 11], required_time: 14 }, expected: true },
          { inputs: { times: [7, 8, 2], required_time: 25 }, expected: false },
        ],
      },
    ],
  },
})
