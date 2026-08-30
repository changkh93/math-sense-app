import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_STR_PATTERN_40 = createCapabilityPrototypeKernel({
  problemId: 'AC-STR-PATTERN-40',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-3',
    routeRole: 'branch',
    learningRole: 'review',
    recommendedBand: 'E',
    prerequisites: [
      'AC-SEQ-COUNT-33',
      'AC-SEQ-RUNNING-35',
      'AC-STR-REVERSE-01',
    ],
  },
  identity: {
    studentTitle: 'IOI 구조 신호 찾기',
    subtitle: '최근 문자들을 담은 검사 창을 한 글자씩 갱신하며 겹치는 IOI 신호의 총 개수를 셉니다.',
  },
  pythonConcepts: {
    requires: [
      'builtin:list',
      'statement:for',
      'statement:if',
      'method:append',
      'syntax:slicing',
      'operator:equality',
      'operator:arithmetic-state-update',
    ],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:filter-accumulate'],
    introduces: ['pattern:sliding-window-scan'],
  },
  evidenceRecipe: {
    primitives: ['container-scan', 'ordered-buffer', 'scalar-sequence'],
    requiredClaims: [
      'slides-fixed-inspection-window',
      'counts-overlapping-target-patterns',
      'handles-short-or-empty-inputs',
    ],
  },
  modes: {
    observe: {
      prompt: '신호 "IOIOI"에서 "IOI"는 몇 번 나타날까요? (겹치는 구간 포함)',
      expected: 'two_overlapping',
      options: [
        { value: 'two_overlapping', label: '2번 (0번 위치 "IOI"와 2번 위치 "IOI"가 겹쳐서 나타남)' },
        { value: 'one_non_overlapping', label: '1번 (앞의 세 글자를 찾고 나면 남은 글자가 모자람)' },
        { value: 'zero_matches', label: '0번' },
      ],
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🔍 구조 신호 검사 창',
          description: '문자열 "IOIOI"를 한 글자씩 읽으며 최근 검사 목록에 추가하고, 목표 "IOI"와 일치할 때마다 개수를 누적한 뒤 최근 2글자만 남깁니다.',
          variables: [
            { name: 'current', value: '"I"', label: '도착한 문자' },
            { name: 'recentWindow', value: '["I", "O", "I"]', label: '최근 검사 창' },
            { name: 'matches', value: '2', label: '발견한 개수' },
          ],
          guidance: '일치한 뒤 검사 창을 비우지 않고 최근 2글자만 남겨 겹치는 다음 신호를 잡는 과정을 확인하세요.',
        },
        initialState: { current: null, recentWindow: [], matches: 0 },
        initialStateLabel: '시작: 빈 검사 창, 발견 0',
        initialStepTitle: '🚀 시작 (신호 수신 대기)',
        initialPrompt: '문자열의 첫 글자부터 차례로 수신합니다.',
        frames: [
          {
            id: 'f0_i',
            stepTitle: '① 0번 문자 "I" 도착',
            operationLabel: 'I 도착 → 검사 목록 ["I"]',
            codeSnippet: '# 창: ["I"], 일치하지 않음',
            prompt: '첫 글자 "I"가 도착해 검사 창에 넣습니다. 길이가 1이라 아직 일치하지 않습니다.',
            stateAfter: { current: 'I', recentWindow: ['I'], matches: 0 },
          },
          {
            id: 'f1_o',
            stepTitle: '② 1번 문자 "O" 도착',
            operationLabel: 'O 도착 → 검사 목록 ["I", "O"]',
            codeSnippet: '# 창: ["I", "O"], 일치하지 않음',
            prompt: '두 번째 글자 "O"가 도착했습니다. 창은 ["I", "O"]이며 아직 일치하지 않습니다.',
            stateAfter: { current: 'O', recentWindow: ['I', 'O'], matches: 0 },
          },
          {
            id: 'f2_i_match',
            stepTitle: '③ 2번 문자 "I" 도착 (첫 번째 일치!)',
            operationLabel: '목표와 일치 → 발견 수 1 → 최근 ["O", "I"] 보존',
            codeSnippet: '# 창: ["I", "O", "I"] -> 일치! 발견 수 = 1, 이후 최근 2글자 ["O", "I"] 보존',
            prompt: '세 번째 글자 "I"가 도착해 창이 ["I", "O", "I"]가 되었습니다! 목표와 일치하므로 발견 수를 1로 올리고, 다음 검사를 위해 최근 2글자 ["O", "I"]를 남깁니다.',
            stateAfter: { current: 'I', recentWindow: ['O', 'I'], matches: 1 },
          },
          {
            id: 'f3_o',
            stepTitle: '④ 3번 문자 "O" 도착',
            operationLabel: 'O 도착 → 불일치 → 최근 ["I", "O"] 보존',
            codeSnippet: '# 창: ["O", "I", "O"], 일치하지 않음 -> 최근 2글자 ["I", "O"] 보존',
            prompt: '네 번째 글자 "O"가 도착해 창이 ["O", "I", "O"]가 되었습니다. 일치하지 않으므로 최근 2글자 ["I", "O"]를 남깁니다.',
            stateAfter: { current: 'O', recentWindow: ['I', 'O'], matches: 1 },
          },
          {
            id: 'f4_i_match2',
            stepTitle: '⑤ 4번 문자 "I" 도착 (두 번째 일치!)',
            operationLabel: '목표와 일치 → 발견 수 2',
            codeSnippet: '# 창: ["I", "O", "I"] -> 겹치는 두 번째 일치! 발견 수 = 2',
            prompt: '마지막 글자 "I"가 도착해 창이 다시 ["I", "O", "I"]가 되었습니다! 겹치는 두 번째 일치를 발견해 최종 개수 2를 완성합니다.',
            stateAfter: { current: 'I', recentWindow: ['O', 'I'], matches: 2 },
          },
        ],
        predictionPrompt: '발견한 총 개수 2를 반환하세요.',
        rulePrompt: '검사 창 한 칸 이동 및 겹침 탐색 규칙',
        ruleStatement: '새 문자를 검사 목록에 넣고 목표와 일치하면 개수를 센 뒤, 최근 2글자만 남겨두면 겹쳐서 시작하는 다음 패턴도 모두 찾을 수 있습니다.',
      },
    },
    code: {
      entryFunction: 'count_ioi_signals',
      starterCode: `def count_ioi_signals(message):
    matches = 0
    recent = []

    for current in message:
        recent.append(current)
        # recent가 목표 신호인지 확인하고 matches를 갱신하세요.
        # 다음 검사를 위해 최근 두 문자만 남기세요.
        pass

    return matches
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { message: 'IOIO' }, expected: 1 },
      { inputs: { message: 'IOIOI' }, expected: 2 },
      { inputs: { message: 'OOOO' }, expected: 0 },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_str_pattern_40_1',
        title: '★★ 겹치는 패턴 탐색과 검사 창 유지',
        type: 'trace_understanding',
        prompt: '문자열 "IOIOI"에서 목표 패턴을 찾는 과정을 확인하세요.',
        questions: [
          {
            id: 'q1',
            text: '0번 위치에서 첫 번째 "IOI"를 찾은 뒤 검사 목록을 완전히 비우지 않고 최근 2글자만 남기는 이유는 무엇일까요?',
            options: [
              { value: 'catch_overlap', label: '2번 위치에서 시작하는 겹치는 다음 "IOI"를 놓치지 않고 잡기 위해' },
              { value: 'save_memory', label: '컴퓨터 메모리를 절약하기 위해' },
            ],
            expected: 'catch_overlap',
          },
          {
            id: 'q2',
            text: '만약 "IOI"를 찾자마자 검사 목록을 완전히 비워버리면 "IOIOI"의 결과는 어떻게 될까요?',
            options: [
              { value: 'miss_second', label: '두 번째 겹치는 신호를 놓쳐서 1개로 잘못 계산된다' },
              { value: 'same_two', label: '똑같이 2개가 된다' },
            ],
            expected: 'miss_second',
          },
          {
            id: 'q3',
            text: '길이가 2인 문자열 "IO"가 주어졌을 때 결과가 0이 되는 이유는 무엇일까요?',
            options: [
              { value: 'too_short', label: '문자 개수가 3개 미만이어서 3글자 목표 패턴이 한 번도 완성되지 못하기 때문' },
              { value: 'has_error', label: '오류가 발생하기 때문' },
            ],
            expected: 'too_short',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_str_pattern_40_t1',
        title: '비콘 신호 패턴 탐색',
        description: '정수 신호 리스트(beacons)가 주어질 때, 목표 패턴 [1, 0, 1]이 겹침을 포함하여 총 몇 번 나타나는지 개수를 반환하세요.',
        contextCard: {
          title: '📋 비콘 패턴 탐색 사고 흐름',
          steps: [
            { label: '관찰', text: '신호 리스트를 한 개씩 순회하며 최근 검사 목록에 추가합니다.' },
            { label: '구분', text: '최근 검사 목록이 목표 패턴 [1, 0, 1]과 일치하는지 비교하여 발견 개수를 누적합니다.' },
            { label: '상태 갱신', text: '다음 겹침 탐색을 위해 검사 목록에서 최근 두 개의 신호만 남깁니다.' },
          ],
        },
        thoughtCheck: {
          prompt: '자료형이 문자열에서 숫자 리스트로 바뀌었을 때 겹치는 패턴을 찾는 원리는 어떻게 될까요?',
          options: [
            { id: 'opt_same_window_logic', label: '자료형만 달라졌을 뿐, 최근 항목들을 보관하는 검사 목록을 갱신하며 목표와 비교하는 원리는 완전히 동일하다', isCorrect: true },
            { id: 'opt_diff_window_logic', label: '숫자 리스트는 겹치는 구간을 셀 수 없다', isCorrect: false },
          ],
          feedback: '맞아요! 리스트에서도 최근 두 원소를 유지하며 순회하면 겹치는 패턴을 정확히 셀 수 있습니다.',
        },
        entryFunction: 'count_beacon_pattern',
        starterCode: `def count_beacon_pattern(beacons):
    # beacons 리스트에서 [1, 0, 1] 패턴이 나타나는 횟수를 반환하세요.
    pass
`,
        testCases: [
          { inputs: { beacons: [1, 0, 1, 0, 1] }, expected: 2 },
          { inputs: { beacons: [1, 1, 1] }, expected: 0 },
        ],
      },
    ],
  },
})
