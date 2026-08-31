import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_ENUM_COMB_64 = createCapabilityPrototypeKernel({
  problemId: 'AC-ENUM-COMB-64',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 64,
    constellationId: 'constellation-6',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'N',
    prerequisites: ['AC-ENUM-PAIR-01', 'AC-SEQ-RUNNING-35'],
  },
  identity: {
    studentTitle: '센서 두 개 고르기',
    subtitle: '서로 다른 센서 두 개의 모든 조합을 생성 순서 그대로 목록으로 만듭니다.',
  },
  pythonConcepts: {
    requires: ['builtin:list', 'statement:for', 'statement:if', 'builtin:range', 'method:append'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:unordered-pair-enumeration'],
    introduces: ['pattern:combination-output'],
  },
  evidenceRecipe: {
    primitives: ['enumeration', 'ordered-buffer'],
    requiredClaims: ['COMBINATIONS_IN_GENERATION_ORDER'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '센서 [A, B, C]에서 두 개를 고르는 모든 조합은 몇 개일까요?',
      options: [
        { value: 'three', label: '3개 — (A,B), (A,C), (B,C)' },
        { value: 'six', label: '6개 — 순서가 다른 짝까지 모두 센다' },
        { value: 'two', label: '2개' },
      ],
      expected: 'three',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🎛️ 조합 생성 관찰판',
          description: '센서 [A, B, C]의 두 개 조합을 생성 순서대로 기록합니다.',
          variables: [
            { name: 'sensors', value: "['A', 'B', 'C']" },
            { name: 'combos', value: "[[A, B], [A, C], [B, C]]", label: '생성된 조합' },
            { name: 'recordRule', value: '값의 쌍으로 기록', label: '기록 형태' },
          ],
          guidance: '위치 쌍이 아니라 요청된 값의 쌍을 기록해야 합니다.',
        },
        initialState: { i: null, j: null, currentPair: null, combos: [] },
        initialStateLabel: '시작: 빈 조합 목록',
        initialStepTitle: '🚀 시작 (조합 생성)',
        initialPrompt: '앞 센서를 고정하고 뒤쪽 센서와 짝지어 기록합니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① A를 고정: 짝 B',
            operationLabel: '[A, B] 기록',
            codeSnippet: '# 첫 조합을 목록에 추가',
            prompt: '첫 번째 조합이 만들어졌습니다.',
            stateAfter: { i: 0, j: 1, currentPair: ['A', 'B'], combos: [['A', 'B']] },
          },
          {
            id: 'f1',
            stepTitle: '② A를 고정: 짝 C',
            operationLabel: '[A, C] 기록',
            codeSnippet: '# 같은 앞 위치의 다음 짝',
            prompt: 'A의 짝이 아직 남았어요. C와도 짝짓습니다.',
            stateAfter: { i: 0, j: 2, currentPair: ['A', 'C'], combos: [['A', 'B'], ['A', 'C']] },
          },
          {
            id: 'f2',
            stepTitle: '③ B를 고정: 짝 C',
            operationLabel: '[B, C] 기록 — 완성',
            codeSnippet: '# 마지막 조합까지 순서대로',
            prompt: '세 개의 조합이 생성 순서대로 목록에 담겼습니다.',
            stateAfter: { i: 1, j: 2, currentPair: ['B', 'C'], combos: [['A', 'B'], ['A', 'C'], ['B', 'C']] },
          },
          {
            // 순서쌍까지 만들면 두 배가 되는 문제를 보여주는 독립 실험.
            id: 'f3_two_sensors',
            stepTitle: '④ 새 실험: 센서 두 개 [P, Q]',
            experimentReset: true,
            stateBefore: { i: null, j: null, currentPair: null, combos: [] },
            operationLabel: '조합은 [P, Q] 하나 — (Q, P)는 같은 조합',
            codeSnippet: '# 새 실험: 두 항목의 조합은 하나',
            prompt: '순서를 뒤집은 (Q, P)까지 만들면 조합이 아니라 순서쌍이 돼요. 조합은 하나뿐입니다.',
            stateAfter: { i: 0, j: 1, currentPair: ['P', 'Q'], combos: [['P', 'Q']] },
          },
        ],
        predictionPrompt: '두 개를 고르는 모든 조합을 값의 쌍으로, 생성 순서대로 반환하세요.',
        rulePrompt: '조합 생성 규칙',
        ruleStatement: '앞 위치를 고정해 뒤쪽 위치와 짝짓되, 같은 짝을 두 번 만들지 않고 요구된 형태로 순서대로 기록한다.',
      },
    },
    code: {
      entryFunction: 'list_sensor_pairs',
      starterCode: `def list_sensor_pairs(sensors):
    # 두 개를 고르는 모든 조합을 값의 쌍으로 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { sensors: ['A', 'B', 'C'] }, expected: [['A', 'B'], ['A', 'C'], ['B', 'C']] },
      { inputs: { sensors: ['X'] }, expected: [] },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_enum_064_1',
        title: '조합 생성 이해',
        prompt: '조합을 순서대로 만들 때의 원리를 점검하세요.',
        questions: [
          {
            id: 'q1',
            text: '(A, B)를 만든 뒤 (B, A)도 만들어야 할까요?',
            options: [
              { value: 'no_same_combo', label: '아니요 — 순서만 다른 같은 조합이라 하나만 기록한다' },
              { value: 'yes_both', label: '예 — 순서쌍까지 모두 만들어야 한다' },
            ],
            expected: 'no_same_combo',
          },
          {
            id: 'q2',
            text: '기록해야 할 것은 위치 쌍일까요 값 쌍일까요?',
            options: [
              { value: 'value_pairs', label: '값 쌍 — 문제가 센서 조합 자체를 요구하기 때문에' },
              { value: 'index_pairs', label: '위치 쌍 — 항상 위치를 기록하기 때문에' },
            ],
            expected: 'value_pairs',
          },
          {
            id: 'q3',
            text: '센서가 하나뿐이면 결과는 어떻게 될까요?',
            options: [
              { value: 'empty_result', label: '짝지을 둘째 센서가 없어 빈 목록이다' },
              { value: 'self_pair', label: '자기 자신과의 짝 하나가 나온다' },
            ],
            expected: 'empty_result',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_enum_064_transfer_1',
        title: '두 명씩 짝지는 승무원 팀',
        description: '승무원 후보 목록(members)에서 두 명을 고르는 모든 팀 구성을 생성 순서대로 반환합니다.',
        entryFunction: 'list_crew_pairs',
        starterCode: `def list_crew_pairs(members):
    # 두 명을 고르는 모든 팀 구성을 반환하세요.
    pass
`,
        contextCard: {
          title: '👥 팀 구성 생성 전략',
          strategyGuide: '앞 후보를 고정해 뒤쪽 후보와 차례로 짝지고, 같은 짝을 두 번 만들지 않으며 생성 순서를 지켜 기록합니다.',
        },
        thoughtCheck: {
          question: '후보 [루미, 노바, 솔]의 두 명 팀 구성은 모두 몇 개일까요?',
          options: [
            { value: 'three', label: '3개 — (루미,노바), (루미,솔), (노바,솔)' },
            { value: 'six', label: '6개 — 자리를 바꾼 짝까지 센다' },
          ],
          expected: 'three',
        },
        testCases: [
          { inputs: { members: ['루미', '노바', '솔'] }, expected: [['루미', '노바'], ['루미', '솔'], ['노바', '솔']] },
          { inputs: { members: ['혼자'] }, expected: [] },
        ],
      },
    ],
  },
})
