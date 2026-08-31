import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_ENUM_PRUNE_69 = createCapabilityPrototypeKernel({
  problemId: 'AC-ENUM-PRUNE-69',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 69,
    constellationId: 'constellation-6',
    routeRole: 'branch',
    learningRole: 'review',
    recommendedBand: 'N',
    prerequisites: ['AC-ENUM-BEST-68', 'AC-SRCH-BINARY-59'],
  },
  identity: {
    studentTitle: '중복 탐색을 줄여라',
    subtitle: '정렬된 값에서 한도를 넘는 순간 이후의 짝은 확인하지 않고, 실제로 확인한 횟수까지 보고합니다.',
  },
  pythonConcepts: {
    requires: ['builtin:list', 'builtin:range', 'statement:for', 'statement:if', 'operator:comparison-lower-bound'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:enumerate-and-best'],
    introduces: ['pattern:monotone-pruning'],
  },
  evidenceRecipe: {
    primitives: ['enumeration', 'decision', 'scalar-sequence'],
    requiredClaims: ['MONOTONE_PRUNING_CHECKS'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '정렬된 값 [1, 2, 8, 9]에서 짝의 합이 처음 한도 5를 넘으면, 그 뒤의 짝들은 어떻게 될까요?',
      options: [
        { value: 'all_exceed', label: '반드시 한도를 넘는다 — 확인할 필요가 없다' },
        { value: 'may_recover', label: '뒤에서 다시 한도 안에 들어올 수 있다' },
      ],
      expected: 'all_exceed',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '✂️ 가지치기 관찰판',
          description: '정렬된 [1, 2, 8, 9]에서 한도 5 이하의 짝을 세되, 초과 순간 이후는 건너뜁니다.',
          variables: [
            { name: 'sorted_values', value: '[1, 2, 8, 9]' },
            { name: 'limit', value: '5' },
            { name: 'checks', value: '실제로 확인한 짝 수', label: '보고 항목' },
          ],
          guidance: '처음 초과한 짝도 확인한 것이므로 checks에 포함됩니다.',
        },
        initialState: { i: null, j: null, pairSum: null, skip: false, count: 0, checks: 0 },
        initialStateLabel: '시작: 개수 0, 확인 0',
        initialStepTitle: '🚀 시작 (가지치기 탐색)',
        initialPrompt: 'i = 0부터 짝을 확인하고, 초과 순간 이후를 건너뜁니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① i = 0, j = 1: 짝 (1, 2)',
            operationLabel: '합 3 <= 5 -> count +1, checks +1',
            codeSnippet: '# 유효한 짝: 세고 확인 횟수도 센다',
            prompt: '유효한 짝 하나를 찾았습니다.',
            stateAfter: { i: 0, j: 1, pairSum: 3, skip: false, count: 1, checks: 1 },
          },
          {
            id: 'f1',
            stepTitle: '② i = 0, j = 2: 짝 (1, 8)',
            operationLabel: '합 9 > 5 -> checks +1 후 skip 표시',
            codeSnippet: '# 처음 초과한 짝도 확인한 것이다',
            prompt: '이 짝부터 한도를 넘었어요. 확인 횟수에는 포함되지만 개수에는 없습니다.',
            stateAfter: { i: 0, j: 2, pairSum: 9, skip: true, count: 1, checks: 2 },
          },
          {
            id: 'f2',
            stepTitle: '③ i = 0, j = 3: 건너뜀',
            operationLabel: 'skip 상태 -> 확인하지 않음 (checks 그대로)',
            codeSnippet: '# 초과 이후는 정렬 때문에 반드시 초과',
            prompt: '(1, 9)는 볼 필요가 없어요. 값이 정렬되어 있으므로 반드시 한도를 넘습니다.',
            stateAfter: { i: 0, j: 3, pairSum: null, skip: true, count: 1, checks: 2 },
          },
          {
            id: 'f3',
            stepTitle: '④ 남은 i들: (2, 8), (8, 9) 확인 후 건너뜀',
            operationLabel: '최종 [count 1, checks 4]',
            codeSnippet: '# 새 짝마다 초과를 한 번씩만 확인',
            prompt: '각 i에서 초과를 한 번 확인한 뒤 건너뛰어, 전체 6짝 중 4번만 확인했습니다.',
            stateAfter: { i: 2, j: 3, pairSum: 17, skip: true, count: 1, checks: 4 },
          },
        ],
        predictionPrompt: '[한도 이하인 짝 수, 실제로 확인한 짝 수]를 반환하세요.',
        rulePrompt: '단조 가지치기 규칙',
        ruleStatement: '정렬된 목록에서 짝의 합이 처음 한도를 넘은 순간 표시하고, 표시 뒤의 짝은 확인하지 않는다. 처음 초과한 짝도 확인 횟수에 포함된다.',
      },
    },
    code: {
      entryFunction: 'pruned_pair_scan',
      // 이 Starter는 수리 대상이다: 초과 이후에도 불필요한 비교를 계속한다.
      starterCode: `def pruned_pair_scan(sorted_values, limit):
    # 이 코드는 동작하지만 불필요한 비교를 계속합니다. 관찰하고 고치세요.
    count = 0
    checks = 0
    n = len(sorted_values)
    for i in range(n):
        for j in range(i + 1, n):
            checks = checks + 1
            if sorted_values[i] + sorted_values[j] <= limit:
                count = count + 1
    return [count, checks]
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { sorted_values: [1, 2, 8, 9], limit: 5 }, expected: [1, 4] },
      { inputs: { sorted_values: [3, 4], limit: 10 }, expected: [1, 1] },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_enum_069_1',
        title: '단조 가지치기 이해',
        prompt: '정렬된 정보로 확인 횟수를 줄이는 원리를 점검하세요.',
        questions: [
          {
            id: 'q1',
            text: '짝의 합이 처음 한도를 넘은 뒤의 짝도 반드시 초과하는 이유는 무엇일까요?',
            options: [
              { value: 'sorted_monotone', label: '값이 정렬되어 있어 뒤쪽 값이 같거나 크므로 합도 같거나 커지기 때문에' },
              { value: 'lucky_order', label: '우연히 뒤의 값이 작아서' },
            ],
            expected: 'sorted_monotone',
          },
          {
            id: 'q2',
            text: '처음으로 한도를 초과한 짝도 checks에 포함하는 이유는 무엇일까요?',
            options: [
              { value: 'checked_once', label: '초과인지 알아내기 위해 그 짝은 실제로 확인했기 때문에' },
              { value: 'never_checked', label: '확인한 적이 없기 때문에' },
            ],
            expected: 'checked_once',
          },
          {
            id: 'q3',
            text: '가지치기가 올바르게 동작했는지 검증하는 방법은 무엇일까요?',
            options: [
              { value: 'checks_in_result', label: '반환값의 확인 횟수(checks)가 줄어든 만큼 실제로 건너뛰었는지 비교한다' },
              { value: 'huge_input_timeout', label: '거대한 입력으로 시간이 초과되는지 본다' },
            ],
            expected: 'checks_in_result',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_enum_069_transfer_1',
        title: '정렬된 배송 무게의 허용 짝',
        description: '오름차순으로 정렬된 배송 무게(sorted_weights)에서 두 무게의 합이 허용 한도(limit) 이하인 짝의 수와, 가지치기로 실제 확인한 짝 수를 반환합니다.',
        entryFunction: 'pruned_weight_scan',
        starterCode: `def pruned_weight_scan(sorted_weights, limit):
    # [한도 이하인 짝 수, 실제로 확인한 짝 수]를 반환하세요.
    pass
`,
        contextCard: {
          title: '⚖️ 무게 짝 가지치기 전략',
          strategyGuide: '정렬된 무게에서 짝의 합이 처음 한도를 넘은 순간 표시하고, 표시 뒤의 짝은 확인하지 않습니다. 처음 초과한 짝도 확인 횟수에 포함됩니다.',
        },
        thoughtCheck: {
          question: '무게 [2, 3, 8]에서 한도 5일 때 확인 횟수는 몇일까요?',
          options: [
            { value: 'three', label: '3회 — (2,3) 확인, (2,8) 초과 확인 후 스킵, (3,8) 확인' },
            { value: 'two', label: '2회 — 초과한 짝은 세지 않는다' },
          ],
          expected: 'three',
        },
        testCases: [
          { inputs: { sorted_weights: [2, 3, 8], limit: 5 }, expected: [1, 3] },
          { inputs: { sorted_weights: [], limit: 9 }, expected: [0, 0] },
        ],
      },
    ],
  },
})
