import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_ENUM_BEST_68 = createCapabilityPrototypeKernel({
  problemId: 'AC-ENUM-BEST-68',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 68,
    constellationId: 'constellation-6',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'N',
    prerequisites: ['AC-ENUM-FILTER-67', 'AC-SEQ-MINMAX-32'],
  },
  identity: {
    studentTitle: '한도 안의 최고 장비 세트',
    subtitle: '모든 장비 조합을 만들어 보고, 무게 한도를 지키는 조합 중 가치가 최고인 것을 기억합니다.',
  },
  pythonConcepts: {
    requires: ['builtin:list', 'builtin:range', 'statement:for', 'statement:if', 'operator:modulo', 'operator:floor-division'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:enumerate-then-filter'],
    introduces: ['pattern:enumerate-and-best'],
  },
  evidenceRecipe: {
    primitives: ['enumeration', 'decision', 'scalar-sequence'],
    requiredClaims: ['BEST_VALUE_UNDER_CAPACITY'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '장비 무게 [3, 4], 가치 [30, 50], 한도 5일 때 최고 총 가치는 얼마일까요?',
      options: [
        { value: 'fifty', label: '50 — 둘 다 담으면 무게 7로 한도를 넘는다' },
        { value: 'eighty', label: '80 — 둘 다 담은 조합의 가치' },
        { value: 'thirty', label: '30' },
      ],
      expected: 'fifty',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🏆 최고 조합 관찰판',
          description: '무게 [3, 4], 가치 [30, 50], 한도 5의 조합을 만들어 최고 기록을 갱신합니다.',
          variables: [
            { name: 'weights', value: '[3, 4]' },
            { name: 'values', value: '[30, 50]' },
            { name: 'bestValue', value: '50', label: '최고 기록' },
          ],
          guidance: '한도를 넘는 조합은 무시하고, 유효한 조합이 더 나을 때만 기록을 바꿉니다.',
        },
        initialState: { state: null, totalWeight: null, totalValue: null, bestValue: 0 },
        initialStateLabel: '시작: 최고 기록 0',
        initialStepTitle: '🚀 시작 (조합 열거 + 최고 기록)',
        initialPrompt: '조합마다 한도 확인과 기록 갱신을 함께 합니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① 상태 0: 빈 조합',
            operationLabel: '가치 0 -> 기록 유지 (0)',
            codeSnippet: '# 빈 조합의 가치는 0',
            prompt: '아무것도 담지 않으면 가치도 0이에요.',
            stateAfter: { state: 0, totalWeight: 0, totalValue: 0, bestValue: 0 },
          },
          {
            id: 'f1',
            stepTitle: '② 상태 1: 첫 장비만',
            operationLabel: '무게 3 <= 5, 가치 30 > 0 -> 기록 30으로 갱신',
            codeSnippet: '# 유효하고 더 나으면 기록 교체',
            prompt: '한도 안이고 기록보다 나으므로 최고 기록이 30이 됩니다.',
            stateAfter: { state: 1, totalWeight: 3, totalValue: 30, bestValue: 30 },
          },
          {
            id: 'f2',
            stepTitle: '③ 상태 2: 둘째 장비만',
            operationLabel: '무게 4 <= 5, 가치 50 > 30 -> 기록 50으로 갱신',
            codeSnippet: '# 더 나은 유효 조합 발견',
            prompt: '50이 새 최고 기록이에요.',
            stateAfter: { state: 2, totalWeight: 4, totalValue: 50, bestValue: 50 },
          },
          {
            id: 'f3',
            stepTitle: '④ 상태 3: 둘 다 담음',
            operationLabel: '무게 7 > 5 -> 한도 초과, 기록 유지 (50)',
            codeSnippet: '# 한도를 넘는 조합은 무시',
            prompt: '가치 80이라도 한도를 넘으면 후보에서 제외됩니다. 최종 답은 50!',
            stateAfter: { state: 3, totalWeight: 7, totalValue: 80, bestValue: 50 },
          },
        ],
        predictionPrompt: '총 무게가 한도 이하인 조합 중 최대 총 가치를 반환하세요.',
        rulePrompt: '최고 기록 갱신 규칙',
        ruleStatement: '모든 조합을 만들되, 한도를 지키는 조합의 가치가 현재 최고 기록보다 클 때만 기록을 교체한다.',
      },
    },
    code: {
      entryFunction: 'best_equipment_value',
      starterCode: `def best_equipment_value(weights, values, capacity):
    # 한도 이하 조합 중 최대 총 가치를 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { weights: [3, 4], values: [30, 50], capacity: 5 }, expected: 50 },
      { inputs: { weights: [2], values: [10], capacity: 2 }, expected: 10 },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_enum_068_1',
        title: '최고 기록 갱신 이해',
        prompt: '유효한 조합 중 최고 가치를 기록하는 원리를 점검하세요.',
        questions: [
          {
            id: 'q1',
            text: '한도를 넘는 조합을 만났을 때 최고 기록은 어떻게 될까요?',
            options: [
              { value: 'ignored', label: '그 조합은 무시되고 현재 기록이 유지된다' },
              { value: 'updated_anyway', label: '가치가 크면 한도를 넘어도 기록이 바뀐다' },
            ],
            expected: 'ignored',
          },
          {
            id: 'q2',
            text: '한도와 무게가 정확히 같은 조합은 어떻게 처리할까요?',
            options: [
              { value: 'capacity_inclusive', label: '한도 "이하"이므로 유효한 후보다' },
              { value: 'capacity_exclusive', label: '한도를 꽉 채웠으므로 후보에서 뺀다' },
            ],
            expected: 'capacity_inclusive',
          },
          {
            id: 'q3',
            text: '가장 가치가 큰 장비 하나만 고르는 방법이 항상 틀리는 이유는 무엇일까요?',
            options: [
              { value: 'combo_beats_single', label: '가치가 작은 장비들을 합쳐 담으면 한도 안에서 총 가치가 더 커질 수 있기 때문에' },
              { value: 'single_always_best', label: '하나만 담는 것이 항상 최고라서' },
            ],
            expected: 'combo_beats_single',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_enum_068_transfer_1',
        title: '제한 시간 안의 최고 연구 점수',
        description: '연구 과제의 소요 시간(times)과 점수(scores) 목록에서, 총 시간이 제한(time_limit) 이하인 조합 중 최대 총 점수를 반환합니다.',
        entryFunction: 'best_research_score',
        starterCode: `def best_research_score(times, scores, time_limit):
    # 제한 이하 조합 중 최대 총 점수를 반환하세요.
    pass
`,
        contextCard: {
          title: '🔬 연구 점수 최고 기록 전략',
          strategyGuide: '모든 과제 조합을 만들어 보고, 총 시간이 제한 이하인 조합의 총 점수가 현재 최고 기록보다 클 때만 기록을 교체합니다.',
        },
        thoughtCheck: {
          question: '시간 [3, 2], 점수 [30, 40], 제한 5이면 최고 총 점수는 얼마일까요?',
          options: [
            { value: 'seventy', label: '70 — 둘 다 담으면 시간 5로 제한 안에 든다' },
            { value: 'forty', label: '40 — 하나만 담을 수 있다' },
          ],
          expected: 'seventy',
        },
        testCases: [
          { inputs: { times: [3, 2], scores: [30, 40], time_limit: 5 }, expected: 70 },
          { inputs: { times: [6], scores: [50], time_limit: 5 }, expected: 0 },
        ],
      },
    ],
  },
})
