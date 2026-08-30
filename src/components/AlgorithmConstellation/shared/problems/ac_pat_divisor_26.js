import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_PAT_DIVISOR_26 = createCapabilityPrototypeKernel({
  problemId: 'AC-PAT-DIVISOR-26',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-2',
    routeRole: 'core',
    learningRole: 'anchor',
    recommendedBand: 'E',
    prerequisites: ['AC-PAT-003', 'AC-EXP-LOOP-06', 'AC-CODE-FIRST-ERROR-01'],
  },
  identity: {
    studentTitle: '운석의 약수 센서',
    subtitle: '1부터 number까지 모든 후보를 차례로 검사하여 나누어떨어지는 약수의 개수를 구합니다.',
  },
  pythonConcepts: {
    requires: [
      'concept:function-body-focus',
      'statement:for',
      'builtin:range',
      'operator:modulo',
      'operator:equality',
      'statement:if',
      'operator:assignment',
      'operator:arithmetic-state-update',
    ],
    introduces: [],
  },
  thinkingPatterns: {
    requires: [],
    introduces: [],
  },
  evidenceRecipe: {
    primitives: ['scalar-sequence', 'decision'],
    requiredClaims: ['divisor-counting-via-exhaustive-candidate-scan'],
  },
  modes: {
    observe: {
      prompt: 'number = 12일 때 1부터 12까지 나누어떨어지는 약수(1, 2, 3, 4, 6, 12)의 총 개수는 몇 개일까요?',
      expected: '6',
      options: ['6', '4', '5', '12'],
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🔍 약수 후보 전수 검사 실험실',
          description: 'number=12의 약수를 찾기 위해 candidate를 1부터 12까지 1씩 증가시키며 나머지를 검사합니다.',
          variables: [{ name: 'number', value: 12, label: '검사할 수' }],
          guidance: '12 % candidate == 0일 때만 count가 1 증가합니다.',
        },
        initialState: { candidate: null, remainder: null, is_divisor: null, count: 0 },
        initialStateLabel: '시작: count=0',
        initialStepTitle: '🚀 시작 (12)',
        initialPrompt: '후보 1부터 차례로 나누어볼까요?',
        frames: [
          {
            id: 'candidate_1',
            stepTitle: '① candidate = 1',
            operationLabel: '12 % 1 = 0 (약수)',
            codeSnippet: '12 % 1 == 0  # True -> count = 1',
            prompt: '1은 모든 수의 약수이므로 count가 1이 되었습니다.',
            stateAfter: { candidate: 1, remainder: 0, is_divisor: true, count: 1 },
          },
          {
            id: 'candidate_2',
            stepTitle: '② candidate = 2',
            operationLabel: '12 % 2 = 0 (약수)',
            codeSnippet: '12 % 2 == 0  # True -> count = 2',
            prompt: '2로 나누어떨어지므로 count가 2가 되었습니다.',
            stateAfter: { candidate: 2, remainder: 0, is_divisor: true, count: 2 },
          },
          {
            id: 'candidate_3',
            stepTitle: '③ candidate = 3',
            operationLabel: '12 % 3 = 0 (약수)',
            codeSnippet: '12 % 3 == 0  # True -> count = 3',
            prompt: '3으로 나누어떨어지므로 count가 3이 되었습니다.',
            stateAfter: { candidate: 3, remainder: 0, is_divisor: true, count: 3 },
          },
          {
            id: 'candidate_4',
            stepTitle: '④ candidate = 4',
            operationLabel: '12 % 4 = 0 (약수)',
            codeSnippet: '12 % 4 == 0  # True -> count = 4',
            prompt: '4로 나누어떨어지므로 count가 4가 되었습니다.',
            stateAfter: { candidate: 4, remainder: 0, is_divisor: true, count: 4 },
          },
          {
            id: 'candidate_5',
            stepTitle: '⑤ candidate = 5',
            operationLabel: '12 % 5 = 2 (약수 아님)',
            codeSnippet: '12 % 5 == 0  # False -> count 유지',
            prompt: '5는 나누어떨어지지 않으므로 count는 4로 유지됩니다.',
            stateAfter: { candidate: 5, remainder: 2, is_divisor: false, count: 4 },
          },
          {
            id: 'summary_6_12',
            stepTitle: '⑥ 6~12 검사 및 완료',
            operationLabel: '6, 12에서만 약수 추가',
            codeSnippet: '6, 12 추가 -> 최종 count = 6',
            prompt: '6부터 12까지 검사하여 6과 12에서만 약수가 추가되어 최종 개수는 6이 됩니다.',
            stateAfter: { candidate: 12, remainder: 0, is_divisor: true, count: 6 },
          },
        ],
        predictionPrompt: 'for candidate in range(1, number + 1): 문으로 약수의 개수를 구하세요.',
        rulePrompt: '약수 전수 검사 규칙',
        ruleStatement: '1부터 number까지 모든 후보를 차례로 확인하고, 나누어떨어질 때(number % candidate == 0)만 count를 1 늘립니다.',
      },
    },
    code: {
      entryFunction: 'count_divisors',
      starterCode: `def count_divisors(number):
    # 1부터 number까지 모든 후보를 확인하여 약수의 총 개수를 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { number: 6 }, expected: 4 },
      { inputs: { number: 7 }, expected: 2 },
      { inputs: { number: 9 }, expected: 3 },
      { inputs: { number: 12 }, expected: 6 },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_pat_divisor_26_1',
        title: '★★ 1의 약수 개수와 range 범위',
        type: 'trace_understanding',
        prompt: '1의 약수와 제곱수 9의 약수 후보 탐색 과정을 확인하세요.',
        codeSnippet: `def count_divisors(number):
    count = 0
    for candidate in range(1, number + 1):
        if number % candidate == 0:
            count = count + 1
    return count`,
        questions: [
          {
            id: 'q1',
            text: 'number=1일 때 range(1, 2)는 후보 1을 검사하여 약수 개수 몇 개를 반환할까요?',
            options: [
              { value: '1', label: '1개 (1의 약수는 1 하나뿐)' },
              { value: '2', label: '2개' },
              { value: '0', label: '0개' },
            ],
            expected: '1',
          },
          {
            id: 'q2',
            text: 'for candidate in range(1, number + 1)에서 왜 range의 끝값에 + 1을 붙일까요?',
            options: [
              { value: 'include_self', label: 'range는 끝값을 포함하지 않으므로, 자기 자신(number)까지 검사하기 위해' },
              { value: 'extra_one', label: '약수를 1개 더 세기 위해' },
              { value: 'syntax', label: '파이썬 문법상 필수이기 때문' },
            ],
            expected: 'include_self',
          },
          {
            id: 'q3',
            text: 'number=9의 약수는 1, 3, 9입니다. 가운데 약수 3을 두 번 세지 않는 이유는 무엇일까요?',
            options: [
              { value: 'one_candidate_once', label: 'candidate=3은 반복에서 한 번만 등장하므로 약수 3도 한 번만 세기 때문' },
              { value: 'skip_square_root', label: '제곱수에서는 가운데 약수를 검사하지 않기 때문' },
              { value: 'count_twice', label: '실제로는 3을 두 번 세어 약수가 4개이기 때문' },
            ],
            expected: 'one_candidate_once',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_pat_divisor_26_t1',
        title: '약수의 총합 구하기',
        description: '1부터 number까지의 약수를 모두 찾아, 약수의 개수가 아니라 모든 약수를 더한 총합(sum)을 반환하세요.',
        contextCard: {
          title: '📋 약수의 합 계산 흐름 예시',
          steps: [
            { label: '대상 수', text: 'number = 6' },
            { label: '약수 목록', text: '1, 2, 3, 6' },
            { label: '약수의 총합', text: '1 + 2 + 3 + 6 = 12' },
          ],
        },
        thoughtCheck: {
          prompt: 'number=6일 때 약수들의 합은 얼마일까요?',
          options: [
            { id: 'opt_12', label: '1 + 2 + 3 + 6 = 12', isCorrect: true },
            { id: 'opt_4', label: '개수인 4', isCorrect: false },
          ],
          feedback: '맞아요! 나누어떨어질 때마다 candidate 값을 total에 누적하면 12가 됩니다.',
        },
        entryFunction: 'sum_divisors',
        starterCode: `def sum_divisors(number):
    # 1부터 number까지의 약수를 모두 더한 총합을 반환하세요.
    pass
`,
        testCases: [
          { inputs: { number: 6 }, expected: 12 },
          { inputs: { number: 7 }, expected: 8 },
        ],
      },
    ],
  },
})
