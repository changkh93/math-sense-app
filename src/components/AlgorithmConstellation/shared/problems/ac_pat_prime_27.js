import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_PAT_PRIME_27 = createCapabilityPrototypeKernel({
  problemId: 'AC-PAT-PRIME-27',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-2',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'E',
    prerequisites: ['AC-PAT-DIVISOR-26', 'AC-EXP-BOUND-05'],
  },
  identity: {
    studentTitle: '소수 탐사 순찰대',
    subtitle: '2보다 작은 수의 경계를 처리하고, 2부터 number-1까지 나누어떨어지는 약수가 있는지 검사하여 소수(Prime)를 판별합니다.',
  },
  pythonConcepts: {
    requires: [
      'concept:function-body-focus',
      'statement:for',
      'builtin:range',
      'operator:modulo',
      'operator:equality',
      'statement:if',
      'operator:comparison-bound',
    ],
    introduces: [],
  },
  thinkingPatterns: {
    requires: [],
    introduces: [],
  },
  evidenceRecipe: {
    primitives: ['scalar-sequence', 'decision'],
    requiredClaims: ['primality-testing-via-divisor-absence'],
  },
  modes: {
    observe: {
      prompt: 'number = 9일 때 2부터 8까지의 수 중 9를 나누어떨어지게 하는 수(3)가 존재하므로, 9는 소수(True/False)일까요?',
      expected: 'False',
      options: ['False', 'True', '1', '0'],
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🔍 소수 판별 실험실',
          description: 'number=9가 소수인지 확인하기 위해 2부터 8까지의 약수 후보를 검사합니다.',
          variables: [{ name: 'number', value: 9, label: '판별할 수' }],
          guidance: '2 미만(0, 1)은 소수가 아니며, 2 이상의 수 중 2부터 number-1 사이에 나누어떨어지는 약수가 하나라도 있으면 합성수(False)입니다.',
        },
        initialState: { divisor: null, remainder: null, is_prime: null },
        initialStateLabel: '시작: number=9',
        initialStepTitle: '🚀 시작 (9)',
        initialPrompt: '먼저 2보다 작은지 경계를 확인하고 후보를 나눕니다.',
        frames: [
          {
            id: 'boundary_check',
            stepTitle: '① 경계 확인 (9 < 2)',
            operationLabel: '9 < 2 -> False (통과)',
            codeSnippet: 'if 9 < 2: return False  # 9는 2 이상',
            prompt: '9는 2 이상이므로 본격적인 약수 검사를 시작합니다.',
            stateAfter: { divisor: null, remainder: null, is_prime: null },
          },
          {
            id: 'divisor_2',
            stepTitle: '② divisor = 2',
            operationLabel: '9 % 2 = 1 (나누어떨어지지 않음)',
            codeSnippet: '9 % 2 == 0  # False -> 계속 진행',
            prompt: '2로는 나누어떨어지지 않으므로 다음 후보를 검사합니다.',
            stateAfter: { divisor: 2, remainder: 1, is_prime: null },
          },
          {
            id: 'divisor_3',
            stepTitle: '③ divisor = 3',
            operationLabel: '9 % 3 = 0 (약수 발견!)',
            codeSnippet: '9 % 3 == 0  # True -> return False',
            prompt: '3으로 나누어떨어지므로 1과 자기 자신 외의 약수가 존재합니다. 소수가 아니므로 즉시 False를 반환합니다.',
            stateAfter: { divisor: 3, remainder: 0, is_prime: false },
          },
        ],
        predictionPrompt: '0, 1 경계 처리와 range(2, number) 반복으로 소수 판별 함수를 완성하세요.',
        rulePrompt: '소수 판별 규칙',
        ruleStatement: '2보다 작은 수는 소수가 아니며(False), 2부터 number-1까지 나누어떨어지는 약수가 하나라도 있으면 False, 끝까지 없으면 True입니다.',
      },
    },
    code: {
      entryFunction: 'is_prime_signal',
      starterCode: `def is_prime_signal(number):
    # number가 소수이면 True, 아니면 False를 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { number: 3 }, expected: true },
      { inputs: { number: 12 }, expected: false },
      { inputs: { number: 25 }, expected: false },
      { inputs: { number: 97 }, expected: true },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_pat_prime_27_1',
        title: '★★ 0, 1, 2와 홀수 합성수 판별',
        type: 'trace_understanding',
        prompt: '0과 1이 소수가 아닌 이유와 2 및 49의 판별 과정을 확인하세요.',
        codeSnippet: `def is_prime_signal(number):
    if number < 2:
        return False
    for divisor in range(2, number):
        if number % divisor == 0:
            return False
    return True`,
        questions: [
          {
            id: 'q1',
            text: 'number=1일 때 1이 소수가 아닌 이유는 무엇일까요?',
            options: [
              { value: 'one_divisor', label: '소수는 서로 다른 2개의 약수(1과 자기자신)를 가져야 하는데 1은 약수가 1개뿐이기 때문' },
              { value: 'even_number', label: '1이 짝수이기 때문' },
              { value: 'zero_remainder', label: '0으로 나누어떨어지기 때문' },
            ],
            expected: 'one_divisor',
          },
          {
            id: 'q2',
            text: 'number=2일 때 range(2, 2)는 후보가 없는데 왜 True를 반환할까요?',
            options: [
              { value: 'no_divisors_found', label: '2 < 2를 통과하고 2 미만의 다른 약수가 존재하지 않아 정상적으로 True를 반환하기 때문' },
              { value: 'two_is_odd', label: '2가 홀수이기 때문' },
              { value: 'loop_error', label: '루프가 에러를 내기 때문' },
            ],
            expected: 'no_divisors_found',
          },
          {
            id: 'q3',
            text: '49는 홀수이지만 소수가 아닌 이유는 무엇일까요?',
            options: [
              { value: 'div_by_7', label: 'divisor=7일 때 49 % 7 == 0으로 나누어떨어지기 때문' },
              { value: 'greater_than_20', label: '20보다 큰 홀수이기 때문' },
              { value: 'div_by_2', label: '2로 나누어떨어지기 때문' },
            ],
            expected: 'div_by_7',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_pat_prime_27_t1',
        title: '합성수(Composite) 판별기',
        description: 'number가 1보다 크고 자신 외의 다른 약수를 갖는 합성수(Composite)이면 True, 아니면(0, 1, 소수) False를 반환하세요.',
        contextCard: {
          title: '📋 합성수 판별 흐름 예시',
          steps: [
            { label: '0, 1', text: '합성수 아님 -> False' },
            { label: '소수 (예: 7)', text: '약수 없음 -> False' },
            { label: '합성수 (예: 9)', text: '3으로 나누어떨어짐 -> True' },
          ],
        },
        thoughtCheck: {
          prompt: 'number=1일 때 합성수 판별 결과는 무엇일까요?',
          options: [
            { id: 'opt_false', label: '1은 소수도 합성수도 아니므로 False', isCorrect: true },
            { id: 'opt_true', label: 'True', isCorrect: false },
          ],
          feedback: '정확합니다! 0과 1은 소수도 합성수도 아니므로 False입니다.',
        },
        entryFunction: 'is_composite_signal',
        starterCode: `def is_composite_signal(number):
    # number가 1보다 큰 합성수이면 True, 아니면 False를 반환하세요.
    pass
`,
        testCases: [
          { inputs: { number: 9 }, expected: true },
          { inputs: { number: 7 }, expected: false },
        ],
      },
    ],
  },
})
