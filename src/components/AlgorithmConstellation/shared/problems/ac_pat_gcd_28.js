import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_PAT_GCD_28 = createCapabilityPrototypeKernel({
  problemId: 'AC-PAT-GCD-28',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-2',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'E',
    prerequisites: [
      'AC-PAT-DIVISOR-26',
      'AC-EXP-WHILE-07',
      'AC-PAT-DIGIT-24',
      'AC-EXP-SWAP-04',
    ],
  },
  identity: {
    studentTitle: '두 톱니바퀴의 공통 박자',
    subtitle: '큰 수에서 작은 수를 반복해서 빼도 두 수의 공통 성질(공약수)이 유지되는 불변식을 이용하여 최대공약수를 구합니다.',
  },
  pythonConcepts: {
    requires: [
      'concept:function-body-focus',
      'statement:while',
      'statement:if',
      'operator:equality',
      'operator:comparison-lower-bound',
      'operator:assignment',
      'operator:arithmetic-state-update',
      'operator:floor-division',
      'builtin:list',
    ],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:preserve-before-overwrite'],
    introduces: [],
  },
  evidenceRecipe: {
    primitives: ['scalar-sequence', 'decision'],
    requiredClaims: ['gcd-via-repeated-subtraction-invariant'],
  },
  modes: {
    observe: {
      prompt: '두 수 a = 48, b = 18에서 큰 수에서 작은 수를 반복해서 빼어 두 수가 같아졌을 때 남는 수(최대공약수)는 얼마일까요?',
      expected: '6',
      options: ['6', '12', '18', '2'],
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🔍 최대공약수 감산 불변식 실험실',
          description: 'a=48, b=18에서 큰 수에서 작은 수를 빼는 과정을 반복합니다. 놀랍게도 공약수(1, 2, 3, 6)는 계속 유지됩니다.',
          variables: [
            { name: 'a', value: 48, label: '첫 번째 수' },
            { name: 'b', value: 18, label: '두 번째 수' },
          ],
          guidance: 'a != b인 동안 큰 수에서 작은 수를 뺍니다.',
        },
        initialState: { a: 48, b: 18, action: 'start' },
        initialStateLabel: '시작: a=48, b=18',
        initialStepTitle: '🚀 시작 (48, 18)',
        initialPrompt: '두 수가 다르므로 큰 수(a=48)에서 작은 수(b=18)를 뺍니다.',
        frames: [
          {
            id: 'subtract_1',
            stepTitle: '① a = 48 - 18',
            operationLabel: 'a = 30, b = 18',
            codeSnippet: 'a = 48 - 18  # a=30, b=18 (공약수 6 유지)',
            prompt: 'a가 30으로 줄었지만, 30과 18의 최대공약수는 여전히 6입니다.',
            stateAfter: { a: 30, b: 18, action: 'subtract_a' },
          },
          {
            id: 'subtract_2',
            stepTitle: '② a = 30 - 18',
            operationLabel: 'a = 12, b = 18',
            codeSnippet: 'a = 30 - 18  # a=12, b=18 (공약수 6 유지)',
            prompt: 'a가 12로 줄었습니다. 이제 b(18)가 더 큽니다.',
            stateAfter: { a: 12, b: 18, action: 'subtract_a' },
          },
          {
            id: 'subtract_3',
            stepTitle: '③ b = 18 - 12',
            operationLabel: 'a = 12, b = 6',
            codeSnippet: 'b = 18 - 12  # a=12, b=6 (공약수 6 유지)',
            prompt: '큰 수 b(18)에서 a(12)를 빼어 b가 6이 되었습니다.',
            stateAfter: { a: 12, b: 6, action: 'subtract_b' },
          },
          {
            id: 'subtract_4',
            stepTitle: '④ a = 12 - 6',
            operationLabel: 'a = 6, b = 6 (종료)',
            codeSnippet: 'a = 12 - 6  # a=6, b=6 (a == b 이므로 종료)',
            prompt: '두 수가 6으로 같아져 while 루프가 끝나고 최대공약수 6을 얻습니다.',
            stateAfter: { a: 6, b: 6, action: 'meet' },
          },
        ],
        predictionPrompt: 'while a != b 반복과 if-else 감산으로 최대공약수를 구하세요.',
        rulePrompt: '반복 감산 GCD 규칙',
        ruleStatement: '큰 수에서 작은 수를 반복해서 빼도 공통으로 나누어지는 성질은 유지되며, 두 수가 같아진 값이 최대공약수입니다.',
      },
    },
    code: {
      entryFunction: 'greatest_common_rhythm',
      starterCode: `def greatest_common_rhythm(a, b):
    # while 반복문을 사용하여 두 양의 정수 a와 b의 최대공약수를 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { a: 12, b: 8 }, expected: 4 },
      { inputs: { a: 7, b: 5 }, expected: 1 },
      { inputs: { a: 9, b: 9 }, expected: 9 },
      { inputs: { a: 20, b: 5 }, expected: 5 },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_pat_gcd_28_1',
        title: '★★ 감산 불변식과 종료 조건',
        type: 'trace_understanding',
        prompt: '48과 18의 감산 과정에서 공약수가 보존되는 이유와 같은 수일 때의 동작을 확인하세요.',
        codeSnippet: `def greatest_common_rhythm(a, b):
    while a != b:
        if a > b:
            a = a - b
        else:
            b = b - a
    return a`,
        questions: [
          {
            id: 'q1',
            text: '48과 18에서 48 - 18 = 30을 해도 30과 18의 최대공약수가 여전히 6으로 유지되는 이유는 무엇일까요?',
            options: [
              { value: 'factor_preserved', label: '두 수의 공약수 d는 큰 수에서 작은 수를 뺀 차(a - b)도 반드시 나누어떨어지게 하기 때문' },
              { value: 'random_coincidence', label: '우연히 30과 18이 짝수이기 때문' },
              { value: 'always_six', label: '모든 수의 최대공약수가 6이기 때문' },
            ],
            expected: 'factor_preserved',
          },
          {
            id: 'q2',
            text: 'a=9, b=9처럼 처음부터 두 수가 같을 때 while a != b 루프는 어떻게 동작할까요?',
            options: [
              { value: 'skip_loop', label: '루프 조건을 만족하지 않아 한 번도 반복하지 않고 즉시 9를 반환' },
              { value: 'infinite_loop', label: '무한 루프에 빠짐' },
              { value: 'subtract_once', label: '한 번 빼서 0을 반환' },
            ],
            expected: 'skip_loop',
          },
          {
            id: 'q3',
            text: 'while 루프의 종료 조건이 a != b인 이유는 무엇일까요?',
            options: [
              { value: 'stop_when_equal', label: '두 수가 같아지는 순간 그 값이 바로 두 수의 최대공약수이므로' },
              { value: 'avoid_zero', label: '0이 되는 것을 막기 위해' },
              { value: 'syntax_only', label: '문법상 필요해서' },
            ],
            expected: 'stop_when_equal',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_pat_gcd_28_t1',
        title: '비율 약분하기 (기약 비율)',
        description: '두 양의 정수 a와 b의 비율 a:b를 최대공약수로 나누어 가장 간단한 기약 비율 리스트 [a // gcd, b // gcd]로 반환하세요. (주의: gcd를 구하는 동안 a, b가 감소하므로 원래 a, b 값을 미리 보존해야 합니다)',
        contextCard: {
          title: '📋 비율 약분 흐름 예시',
          steps: [
            { label: '원래 값 보존', text: 'orig_a = 12, orig_b = 8' },
            { label: 'GCD 계산', text: '12와 8의 GCD = 4' },
            { label: '약분 결과', text: '[12 // 4, 8 // 4] = [3, 2]' },
          ],
        },
        thoughtCheck: {
          prompt: 'a=12, b=8일 때 GCD 계산 후 a가 4로 변했다면 원래의 12를 어디서 가져와야 할까요?',
          options: [
            { id: 'opt_saved', label: '루프 전에 original_a = a 로 저장해 둔 변수에서 가져온다', isCorrect: true },
            { id: 'opt_magic', label: 'a에 4를 다시 곱한다', isCorrect: false },
          ],
          feedback: '정확합니다! 상태를 덮어쓰기 전에 미리 보존하는(preserve-before-overwrite) 전략이 필요합니다.',
        },
        entryFunction: 'reduce_ratio',
        starterCode: `def reduce_ratio(a, b):
    # 두 수 a와 b의 비율을 최대공약수로 약분하여 [약분된 a, 약분된 b] 리스트로 반환하세요.
    pass
`,
        testCases: [
          { inputs: { a: 12, b: 8 }, expected: [3, 2] },
          { inputs: { a: 15, b: 5 }, expected: [3, 1] },
        ],
      },
    ],
  },
})
