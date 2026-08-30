import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_DICT_MODE_45 = createCapabilityPrototypeKernel({
  problemId: 'AC-DICT-MODE-45',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 45,
    constellationId: 'constellation-4',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'EN',
    prerequisites: ['AC-DICT-FREQ-44'],
  },
  identity: {
    studentTitle: '가장 많이 온 신호',
    subtitle: '가장 자주 등장한 신호를 찾고, 동률일 때는 먼저 등장한 신호를 반환합니다.',
  },
  pythonConcepts: {
    requires: ['builtin:list', 'builtin:dict', 'statement:for', 'statement:if', 'operator:comparison-lower-bound'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:frequency-table'],
    introduces: ['pattern:argmax-by-associated-value'],
  },
  evidenceRecipe: {
    primitives: ['container-scan', 'decision', 'scalar-sequence'],
    requiredClaims: ['ASSOCIATED_VALUE_ARGMAX'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: "신호 목록 ['A', 'B', 'A', 'C', 'A']에서 가장 많이 도착한 신호는 무엇일까요?",
      options: [
        { value: 'signal_a', label: "'A' 신호 (3번 등장)" },
        { value: 'signal_b', label: "'B' 신호 (1번 등장)" },
        { value: 'signal_c', label: "'C' 신호 (1번 등장)" },
      ],
      expected: 'signal_a',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🏆 최빈 신호 결정기',
          description: '빈도표를 만든 뒤 각 신호의 횟수를 비교하여 1등 신호를 확정합니다.',
          variables: [
            { name: 'currentSignal', value: '"A"', label: '검사 중인 신호' },
            { name: 'bestSignal', value: '"A"', label: '현재 1위 신호' },
            { name: 'bestCount', value: '3', label: '1위 횟수' },
          ],
          guidance: '더 큰 횟수가 나타났을 때만 1위를 교체하면 동률일 때 먼저 나온 신호가 유지됩니다.',
        },
        initialState: { currentSignal: null, bestSignal: null, bestCount: 0 },
        initialStateLabel: '시작: 대기',
        initialStepTitle: '🚀 시작 (빈도표 작성 후 비교 준비)',
        initialPrompt: '첫 번째 신호를 초기 1위로 삼고 비교를 시작합니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① 0번 신호 "A"로 1위 초기화',
            operationLabel: '첫 신호 "A"를 현재 1위로 설정 (횟수 3)',
            codeSnippet: '# 1위 후보 = "A" (횟수 3)',
            prompt: '첫 신호 "A"의 횟수(3)를 현재 최고 기록으로 설정합니다.',
            stateAfter: { currentSignal: 'A', bestSignal: 'A', bestCount: 3 },
          },
          {
            id: 'f1',
            stepTitle: '② 1번 신호 "B" 검사',
            operationLabel: 'B의 횟수(1) <= A의 횟수(3)이므로 1위 유지',
            codeSnippet: '# 1 <= 3 -> 교체 안 함',
            prompt: '"B"의 횟수는 1이므로 현재 1위인 "A"(3)가 그대로 유지됩니다.',
            stateAfter: { currentSignal: 'B', bestSignal: 'A', bestCount: 3 },
          },
          {
            id: 'f2',
            stepTitle: '③ 2번 신호 "A" 검사',
            operationLabel: 'A의 횟수(3) <= A의 횟수(3)이므로 1위 유지',
            codeSnippet: '# 3 <= 3 -> 교체 안 함',
            prompt: '"A"의 횟수는 3이므로 1위 상태가 변하지 않습니다.',
            stateAfter: { currentSignal: 'A', bestSignal: 'A', bestCount: 3 },
          },
          {
            id: 'f3',
            stepTitle: '④ 3번 신호 "C" 검사',
            operationLabel: 'C의 횟수(1) <= A의 횟수(3)이므로 1위 유지',
            codeSnippet: '# 1 <= 3 -> 교체 안 함',
            prompt: '"C"의 횟수는 1이므로 "A"가 여전히 1위입니다.',
            stateAfter: { currentSignal: 'C', bestSignal: 'A', bestCount: 3 },
          },
          {
            id: 'f4',
            stepTitle: '⑤ 4번 신호 "A" 검사 후 종료',
            operationLabel: '비교 완료 -> 최종 최빈 신호 "A" 확정',
            codeSnippet: '# 최종 1위 = "A"',
            prompt: '모든 신호의 횟수 비교를 마치고 최종 최빈 신호 "A"를 반환합니다.',
            stateAfter: { currentSignal: 'A', bestSignal: 'A', bestCount: 3 },
          },
        ],
        predictionPrompt: '가장 많이 등장한 신호를 반환하세요 (동률 시 최초 등장 우선).',
        rulePrompt: '최빈 신호 선택 규칙',
        ruleStatement: '각 신호의 등장 횟수를 비교하여 더 큰 횟수가 나타났을 때만 1위를 교체합니다.',
      },
    },
    code: {
      entryFunction: 'most_frequent_signal',
      starterCode: `def most_frequent_signal(signals):\n    # 가장 많이 등장한 신호를 반환하세요 (동률 시 최초 등장 우선).\n    pass\n`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { signals: ['A', 'B', 'A'] }, expected: 'A' },
      { inputs: { signals: ['C', 'B', 'B'] }, expected: 'B' },
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
    transferChallenges: [
      {
        transferChallengeId: 'tc_dict_045_transfer_1',
        title: '가장 많이 모은 탐사 배지',
        description: '획득한 배지 목록(badges)에서 가장 개수가 많은 배지를 찾습니다. 동률일 때는 먼저 획득한 배지를 우선합니다.',
        entryFunction: 'most_frequent_badge',
        starterCode: `def most_frequent_badge(badges):\n    # 가장 많이 획득한 배지를 반환하세요 (동률 시 최초 등장 우선).\n    pass\n`,
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
          { inputs: { badges: ['STAR', 'MOON', 'STAR'] }, expected: 'STAR' },
          { inputs: { badges: ['SUN', 'COMET', 'COMET'] }, expected: 'COMET' },
        ],
      },
    ],
  },
})
