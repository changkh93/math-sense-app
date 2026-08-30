import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_DICT_FREQ_44 = createCapabilityPrototypeKernel({
  problemId: 'AC-DICT-FREQ-44',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 44,
    constellationId: 'constellation-4',
    routeRole: 'core',
    learningRole: 'anchor',
    recommendedBand: 'EN',
    prerequisites: ['AC-SET-MEMBERSHIP-42'],
  },
  identity: {
    studentTitle: '신호 빈도표',
    subtitle: '도착한 신호들의 등장 횟수를 기록표(dict)로 정리합니다.',
  },
  pythonConcepts: {
    requires: ['builtin:list', 'statement:for', 'statement:if', 'operator:membership-in'],
    introduces: ['builtin:dict'],
  },
  thinkingPatterns: {
    requires: ['pattern:membership-query'],
    introduces: ['pattern:frequency-table'],
  },
  evidenceRecipe: {
    primitives: ['container-scan', 'container-membership', 'decision', 'scalar-sequence'],
    requiredClaims: ['DICT_FREQUENCY_TABLE'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: "도착한 신호 목록 ['A', 'B', 'A', 'C', 'B', 'A']에서 각 신호의 등장 횟수는 어떻게 될까요?",
      options: [
        { value: 'a3_b2_c1', label: 'A는 3번, B는 2번, C는 1번' },
        { value: 'all_equal', label: 'A, B, C 모두 2번씩' },
        { value: 'a6', label: 'A만 6번' },
      ],
      expected: 'a3_b2_c1',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '📊 신호 빈도 기록판',
          description: '신호가 도착할 때마다 이름표 칸을 찾아 횟수를 1씩 올립니다.',
          variables: [
            { name: 'signal', value: '"A"', label: '도착한 신호' },
            { name: 'signalCounts', value: '{"A": 3, "B": 2, "C": 1}', label: '신호별 횟수표' },
          ],
          guidance: '이름표가 이미 있으면 숫자를 올리고, 처음 온 신호는 1로 새로 시작하는 흐름을 확인하세요.',
        },
        initialState: { signal: null, signalCounts: {} },
        initialStateLabel: '시작: 빈 기록표',
        initialStepTitle: '🚀 시작 (신호 수신 대기)',
        initialPrompt: '신호를 순서대로 확인하며 기록표를 채웁니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① 0번 신호 "A" 도착',
            operationLabel: '처음 본 신호이므로 A 칸을 만들고 1 기록',
            codeSnippet: '# A 칸 생성 -> 1',
            prompt: '첫 신호 "A"의 이름표 칸을 만들고 횟수 1을 기록합니다.',
            stateAfter: { signal: 'A', signalCounts: { A: 1 } },
          },
          {
            id: 'f1',
            stepTitle: '② 1번 신호 "B" 도착',
            operationLabel: '처음 본 신호이므로 B 칸을 만들고 1 기록',
            codeSnippet: '# B 칸 생성 -> 1',
            prompt: '새로운 신호 "B"의 이름표 칸을 만들고 횟수 1을 기록합니다.',
            stateAfter: { signal: 'B', signalCounts: { A: 1, B: 1 } },
          },
          {
            id: 'f2',
            stepTitle: '③ 2번 신호 "A" 재도착',
            operationLabel: '이미 있는 A 칸이므로 횟수 1 증가 (1 -> 2)',
            codeSnippet: '# A 칸 횟수 증가 -> 2',
            prompt: '"A" 신호가 다시 도착하여 A 칸의 숫자를 2로 올립니다.',
            stateAfter: { signal: 'A', signalCounts: { A: 2, B: 1 } },
          },
          {
            id: 'f3',
            stepTitle: '④ 3번 신호 "C" 도착',
            operationLabel: '처음 본 신호이므로 C 칸을 만들고 1 기록',
            codeSnippet: '# C 칸 생성 -> 1',
            prompt: '새로운 신호 "C"의 이름표 칸을 만들고 횟수 1을 기록합니다.',
            stateAfter: { signal: 'C', signalCounts: { A: 2, B: 1, C: 1 } },
          },
          {
            id: 'f4',
            stepTitle: '⑤ 4번 신호 "B" 재도착',
            operationLabel: '이미 있는 B 칸이므로 횟수 1 증가 (1 -> 2)',
            codeSnippet: '# B 칸 횟수 증가 -> 2',
            prompt: '"B" 신호가 다시 도착하여 B 칸의 숫자를 2로 올립니다.',
            stateAfter: { signal: 'B', signalCounts: { A: 2, B: 2, C: 1 } },
          },
          {
            id: 'f5',
            stepTitle: '⑥ 5번 신호 "A" 재도착',
            operationLabel: '이미 있는 A 칸이므로 횟수 1 증가 (2 -> 3)',
            codeSnippet: '# A 칸 횟수 증가 -> 3',
            prompt: '마지막 "A" 신호가 도착하여 A 칸의 숫자가 최종 3이 됩니다.',
            stateAfter: { signal: 'A', signalCounts: { A: 3, B: 2, C: 1 } },
          },
        ],
        predictionPrompt: '신호별 등장 횟수가 담긴 기록표(dict)를 반환하세요.',
        rulePrompt: '신호 빈도 누적 규칙',
        ruleStatement: '신호가 이미 기록표에 있으면 숫자를 1 올리고, 처음이면 1로 새로 등록합니다.',
      },
    },
    code: {
      entryFunction: 'build_signal_frequency',
      starterCode: `def build_signal_frequency(signals):\n    # 신호별 등장 횟수를 기록표(dict)로 반환하세요.\n    pass\n`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { signals: ['D', 'E', 'D'] }, expected: { D: 2, E: 1 } },
      { inputs: { signals: ['F', 'F', 'F'] }, expected: { F: 3 } },
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
    transferChallenges: [
      {
        transferChallengeId: 'tc_dict_044_transfer_1',
        title: '탐사팀 투표 빈도표',
        description: '탐사 대원들이 투표한 후보 목록(votes)을 바탕으로 후보별 득표수를 기록표로 정리합니다.',
        entryFunction: 'build_vote_frequency',
        starterCode: `def build_vote_frequency(votes):\n    # 후보별 득표수를 기록표(dict)로 반환하세요.\n    pass\n`,
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
          { inputs: { votes: ['ALICE', 'BOB', 'ALICE'] }, expected: { ALICE: 2, BOB: 1 } },
          { inputs: { votes: ['CHARLIE'] }, expected: { CHARLIE: 1 } },
        ],
      },
    ],
  },
})
