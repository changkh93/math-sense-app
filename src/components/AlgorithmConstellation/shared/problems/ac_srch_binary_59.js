import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_SRCH_BINARY_59 = createCapabilityPrototypeKernel({
  problemId: 'AC-SRCH-BINARY-59',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 59,
    constellationId: 'constellation-5',
    routeRole: 'branch',
    learningRole: 'review',
    recommendedBand: 'N',
    prerequisites: ['AC-SRCH-LINEAR-58', 'AC-EXP-WHILE-07', 'AC-PAT-DIGIT-24'],
  },
  identity: {
    studentTitle: '절반씩 줄이는 숫자 행성',
    subtitle: '정렬된 목록에서 가운데 값과 비교해 찾을 수 없는 절반을 버리며 탐색 범위를 절반씩 줄입니다.',
  },
  pythonConcepts: {
    requires: ['builtin:list', 'statement:while', 'statement:if', 'statement:elif', 'operator:floor-division', 'operator:equality', 'operator:comparison-lower-bound'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:first-match-linear-search'],
    introduces: ['pattern:interval-halving-search'],
  },
  evidenceRecipe: {
    primitives: ['decision', 'scalar-sequence'],
    requiredClaims: ['INTERVAL_HALVING_SEARCH'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '정렬된 목록 [2, 5, 8, 12, 20]에서 12를 찾을 때 이진 탐색이 처음 확인하는 값은 무엇일까요?',
      options: [
        { value: 'middle_value', label: '8 — 목록의 가운데 값부터 확인한다' },
        { value: 'first_value', label: '2 — 항상 맨 앞부터 확인한다' },
        { value: 'target_value', label: '12 — 찾는 값이 있는 곳을 바로 안다' },
      ],
      expected: 'middle_value',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🪐 절반 축소 탐색판',
          description: '정렬된 목록 [2, 5, 8, 12, 20]에서 12를 찾는 두 번의 비교를 관찰합니다. low는 남은 구간의 왼쪽 끝, high는 오른쪽 끝이에요.',
          variables: [
            { name: 'low', value: '0', label: '남은 구간 왼쪽 끝' },
            { name: 'high', value: '4', label: '남은 구간 오른쪽 끝' },
            { name: 'halvingRule', value: '가운데와 비교해 절반 버리기', label: '축소 규칙' },
          ],
          guidance: '가운데 값이 찾는 값보다 작으면 왼쪽 절반은 볼 필요가 없어요.',
        },
        initialState: { low: null, high: null, mid: null, midValue: null, decision: null },
        initialStateLabel: '시작: 구간 [0, 4]',
        initialStepTitle: '🚀 시작 (구간 0~4)',
        initialPrompt: '12를 찾는 과정과, 없는 값 7을 찾는 과정을 차례로 관찰합니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① 첫 비교: 가운데 8',
            operationLabel: 'mid 2, 값 8 -> 8 < 12 이므로 왼쪽 절반 버림',
            codeSnippet: '# 8보다 작은 칸에는 12가 없다 -> low를 mid + 1로',
            prompt: '8이 12보다 작으므로 8과 그 왼쪽은 볼 필요가 없어요. 구간이 [3, 4]로 절반 줄었습니다.',
            stateAfter: { low: 3, high: 4, mid: 2, midValue: 8, decision: '왼쪽 절반 버림' },
          },
          {
            id: 'f1',
            stepTitle: '② 두 번째 비교: 가운데 12',
            operationLabel: 'mid 3, 값 12 -> 찾음! 3 반환',
            codeSnippet: '# 일치 -> 즉시 mid 반환',
            prompt: '두 번의 비교로 찾았습니다. 선형 탐색이라면 네 번 비교해야 해요.',
            stateAfter: { low: 3, high: 4, mid: 3, midValue: 12, decision: '찾음' },
          },
          {
            // 없는 값을 찾는 독립 실험: 구간이 사라질 때까지 축소된다.
            id: 'f2_not_found',
            stepTitle: '③ 새 실험: [2, 5, 8]에서 없는 값 7 찾기',
            experimentReset: true,
            stateBefore: { low: null, high: null, mid: null, midValue: null, decision: null },
            operationLabel: 'mid 1, 값 5 -> 5 < 7 이므로 왼쪽 버림',
            codeSnippet: '# 새 실험: 구간 [2, 2]로 축소',
            prompt: '7은 5보다 크므로 왼쪽 절반을 버리고 오른쪽 한 칸만 남깁니다.',
            stateAfter: { low: 2, high: 2, mid: 1, midValue: 5, decision: '왼쪽 절반 버림' },
          },
          {
            id: 'f3',
            stepTitle: '④ 구간 [2, 2]의 가운데 8',
            operationLabel: 'mid 2, 값 8 -> 8 > 7 이므로 오른쪽 버림 -> 구간 소진',
            codeSnippet: '# 8보다 큰 칸에는 7이 없다 -> high를 mid - 1로',
            prompt: 'high가 low보다 작아지면 남은 구간이 없다는 뜻입니다. 찾지 못했음을 -1로 알려줘요.',
            stateAfter: { low: 2, high: 1, mid: 2, midValue: 8, decision: '구간 소진' },
          },
        ],
        predictionPrompt: '정렬된 목록에서 찾는 값의 위치를 반환하고, 없으면 -1을 반환하세요.',
        rulePrompt: '절반 축소 탐색 규칙',
        ruleStatement: '남은 구간의 가운데와 비교해 일치하면 위치를 알려주고, 찾는 값이 작으면 뒤쪽 절반을, 크면 앞쪽 절반을 버린다.',
      },
    },
    code: {
      entryFunction: 'binary_find_planet',
      starterCode: `def binary_find_planet(sorted_planets, target):
    # 정렬된 목록에서 target의 위치를 반환하고, 없으면 -1을 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { sorted_planets: [2, 5, 8, 12, 20], target: 12 }, expected: 3 },
      { inputs: { sorted_planets: [2, 5, 8, 12, 20], target: 7 }, expected: -1 },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_srch_059_1',
        title: '절반 축소 탐색 이해',
        prompt: '정렬된 목록에서 절반을 버릴 수 있는 이유와 구간 갱신 원리를 점검하세요.',
        questions: [
          {
            id: 'q1',
            text: '정렬된 목록에서는 가운데 값 하나만 봐도 절반을 버릴 수 있는 이유는 무엇일까요?',
            options: [
              { value: 'order_tells_side', label: '크기 순서대로 줄 서 있어서 가운데보다 작은지 큰지가 어느 쪽에 있는지 알려주기 때문에' },
              { value: 'lucky_guess', label: '가운데 값에 찾는 값이 있을 확률이 높아서' },
            ],
            expected: 'order_tells_side',
          },
          {
            id: 'q2',
            text: '가운데 값이 찾는 값보다 작을 때 low를 mid + 1로 옮기는 이유는 무엇일까요?',
            options: [
              { value: 'exclude_checked_mid', label: '가운데 값은 이미 확인했고 그 왼쪽은 모두 더 작으므로 그 다음 칸부터 남기기 위해' },
              { value: 'include_mid_again', label: '가운데 값을 다시 확인하기 위해' },
            ],
            expected: 'exclude_checked_mid',
          },
          {
            id: 'q3',
            text: '선형 탐색 풀이도 올바른 위치를 반환하면 정답으로 인정되는 이유는 무엇일까요?',
            options: [
              { value: 'behavior_judged', label: '채점은 결과(행동) 기준이라 올바른 답을 내면 방법을 가리지 않기 때문에' },
              { value: 'linear_always_faster', label: '선형 탐색이 항상 더 빠르기 때문에' },
            ],
            expected: 'behavior_judged',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_srch_059_transfer_1',
        title: '정렬된 에너지 코어 탐색',
        description: '오름차순으로 정렬된 에너지 코어 목록(sorted_energy)에서 찾는 값(target)의 위치를 반환하고, 없으면 -1을 반환합니다.',
        entryFunction: 'binary_find_energy',
        starterCode: `def binary_find_energy(sorted_energy, target):
    # 정렬된 목록에서 target의 위치를 반환하고, 없으면 -1을 반환하세요.
    pass
`,
        contextCard: {
          title: '⚡ 에너지 축소 탐색 전략',
          strategyGuide: '정렬된 목록의 가운데 값과 비교해 찾는 값이 없는 쪽 절반을 버리고, 남은 구간에서 같은 방법을 되풀이합니다.',
        },
        thoughtCheck: {
          question: '가운데 값이 찾는 값보다 클 때 어느 쪽을 버려야 할까요?',
          options: [
            { value: 'discard_back', label: '뒤쪽 절반 — 찾는 값은 가운데보다 앞쪽에만 있을 수 있다' },
            { value: 'discard_front', label: '앞쪽 절반 — 찾는 값은 가운데보다 뒤쪽에만 있을 수 있다' },
          ],
          expected: 'discard_back',
        },
        testCases: [
          { inputs: { sorted_energy: [4, 8, 15, 16], target: 15 }, expected: 2 },
          { inputs: { sorted_energy: [4, 8, 15, 16], target: 9 }, expected: -1 },
        ],
      },
    ],
  },
})
