import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_PAT_PRIME_REV_30 = createCapabilityPrototypeKernel({
  problemId: 'AC-PAT-PRIME-REV-30',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-2',
    routeRole: 'branch',
    learningRole: 'review',
    recommendedBand: 'E',
    prerequisites: ['AC-PAT-PRIME-27', 'AC-CODE-FIRST-ERROR-01'],
  },
  identity: {
    studentTitle: '잘못 만든 소수 판별기',
    subtitle: '몇몇 입력에서는 맞는 소수 판별기를 작은 반례로 검증하고 최소한으로 수리합니다.',
  },
  pythonConcepts: {
    requires: [
      'concept:function-body-focus',
      'operator:modulo',
      'operator:equality',
      'operator:comparison-bound',
      'builtin:range',
      'statement:for',
      'statement:if',
    ],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:counterexample-search'],
    introduces: [],
  },
  evidenceRecipe: {
    primitives: ['source-debug', 'decision'],
    requiredClaims: [
      'empty-loop-can-hide-boundary-bug',
      'one-is-first-counterexample',
      'boundary-guard-precedes-divisor-loop',
    ],
  },
  modes: {
    observe: {
      prompt: '어떤 소수 판별기가 2(True), 3(True), 4(False) 세 입력에서 모두 맞았습니다. 이 코드가 모든 0..200 범위에서 맞다고 단정해도 될까요?',
      expected: 'check_boundaries',
      options: [
        { value: 'check_boundaries', label: '아니다. 0이나 1처럼 정의가 달라지는 경계값에서 반례가 생길 수 있으므로 확인해야 한다.' },
        { value: 'already_correct', label: '맞다. 2, 3, 4에서 맞았으므로 모든 수에서도 항상 맞다.' },
        { value: 'prime_rule', label: '소수는 짝수만 아니면 무조건 맞다.' },
      ],
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🔍 소수 판별 버그 반례 탐색실',
          description: '버그가 있는 소수 판별기가 작은 수(0, 1, 2, 3, 4)에서 어떻게 동작하는지 추적합니다.',
          variables: [
            { name: 'code', value: 'range(2, number) divisor scan', label: '검사 대상 코드' },
          ],
          guidance: '반복문이 한 번도 실행되지 않는 빈 루프가 어떤 결과를 내는지 확인하세요.',
        },
        initialState: { number: null, loop_executed: null, returned: null, actual: null, is_correct: null },
        initialStateLabel: '시작: 반례 탐색 대기',
        initialStepTitle: '🚀 시작 (반례 추적)',
        initialPrompt: '정상 동작하는 4와 3부터 경계값 2, 1, 0으로 내려가며 버그를 찾습니다.',
        frames: [
          {
            id: 'case_4',
            stepTitle: '① number = 4 (합성수)',
            operationLabel: '4 % 2 == 0 -> return False',
            codeSnippet: 'for d in range(2, 4):  # 2에서 False 반환',
            prompt: '2에서 나누어떨어져 False를 반환하므로 정상입니다.',
            stateAfter: { number: 4, loop_executed: true, returned: false, actual: false, is_correct: true },
          },
          {
            id: 'case_3',
            stepTitle: '② number = 3 (소수)',
            operationLabel: '3 % 2 != 0 -> return True',
            codeSnippet: 'for d in range(2, 3):  # 2 검사 후 루프 종료 -> return True',
            prompt: '2로 나누어떨어지지 않아 루프가 끝나고 True를 반환하므로 정상입니다.',
            stateAfter: { number: 3, loop_executed: true, returned: true, actual: true, is_correct: true },
          },
          {
            id: 'case_2',
            stepTitle: '③ number = 2 (가장 작은 소수)',
            operationLabel: 'range(2, 2) 빈 반복 -> return True',
            codeSnippet: 'for d in range(2, 2):  # 빈 반복 -> return True',
            prompt: '루프가 0회 실행되고 마지막 return True로 이동합니다. 2는 소수이므로 우연히 정답과 일치합니다.',
            stateAfter: { number: 2, loop_executed: false, returned: true, actual: true, is_correct: true },
          },
          {
            id: 'case_1',
            stepTitle: '④ number = 1 (첫 번째 반례!)',
            operationLabel: 'range(2, 1) 빈 반복 -> return True (오답!)',
            codeSnippet: 'for d in range(2, 1):  # 빈 반복 -> return True (버그!)',
            prompt: '1도 루프가 0회 실행되어 마지막 return True로 이동합니다! 1은 소수가 아니므로 False여야 하는데 True가 반환되는 첫 반례입니다.',
            stateAfter: { number: 1, loop_executed: false, returned: true, actual: false, is_correct: false },
          },
          {
            id: 'case_0',
            stepTitle: '⑤ number = 0 (두 번째 반례)',
            operationLabel: 'range(2, 0) 빈 반복 -> return True (오답!)',
            codeSnippet: 'for d in range(2, 0):  # 빈 반복 -> return True (버그!)',
            prompt: '0도 루프가 0회 실행되어 True를 반환하는 동일한 경계 버그입니다.',
            stateAfter: { number: 0, loop_executed: false, returned: true, actual: false, is_correct: false },
          },
        ],
        predictionPrompt: '반복문 전에 number < 2 경계를 가드하여 버그를 수리하세요.',
        rulePrompt: '경계 반례 수리 규칙',
        ruleStatement: '반복문이 실행되지 않는 빈 루프(number < 2)는 마지막 return True로 직행하므로, 루프 전에 if number < 2: return False로 경계를 먼저 처리해야 합니다.',
      },
    },
    code: {
      entryFunction: 'is_prime_number',
      starterCode: `def is_prime_number(number):
    # 몇몇 수에서는 맞지만, 아주 작은 수에서 문제가 생깁니다.
    for divisor in range(2, number):
        if number % divisor == 0:
            return False
    return True
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { number: 1 }, expected: false },
      { inputs: { number: 5 }, expected: true },
      { inputs: { number: 9 }, expected: false },
      { inputs: { number: 11 }, expected: true },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_pat_prime_review_30_1',
        title: '★★ 빈 루프의 위험성과 경계 수리',
        type: 'trace_understanding',
        prompt: '1에서 빈 루프가 실행된 후 이동하는 코드 줄과 최소 수리 위치를 확인하세요.',
        codeSnippet: `def is_prime_number(number):
    if number < 2:
        return False
    for divisor in range(2, number):
        if number % divisor == 0:
            return False
    return True`,
        questions: [
          {
            id: 'q1',
            text: 'number=1일 때 수리 전 코드에서 range(2, 1)이 한 번도 실행되지 않으면 어떤 줄로 이동할까요?',
            options: [
              { value: 'final_return_true', label: '루프 바깥의 마지막 return True 줄로 이동하여 잘못된 True를 반환' },
              { value: 'return_false', label: 'return False로 이동' },
              { value: 'error', label: '에러가 발생' },
            ],
            expected: 'final_return_true',
          },
          {
            id: 'q2',
            text: 'number=2도 루프가 실행되지 않는데 왜 수리 전 코드에서 우연히 정답(True)이 나왔을까요?',
            options: [
              { value: 'two_is_prime', label: '2는 실제로 소수이므로 마지막 return True가 우연히 수학적 정의와 일치했기 때문' },
              { value: 'loop_ran_once', label: '루프가 1번 실행되었기 때문' },
              { value: 'two_is_even', label: '2가 짝수이기 때문' },
            ],
            expected: 'two_is_prime',
          },
          {
            id: 'q3',
            text: '이 버그를 고치기 위한 가장 단순하고 안전한 최소 수리 방법은 무엇일까요?',
            options: [
              { value: 'guard_before_loop', label: '루프를 시작하기 전에 if number < 2: return False 로 경계를 먼저 처리한다' },
              { value: 'mod_by_one', label: '루프 안에서 1로 나누어본다' },
              { value: 'return_all_false', label: '항상 False를 반환한다' },
            ],
            expected: 'guard_before_loop',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_pat_prime_review_30_t1',
        title: '합성수 판별기 경계 버그 수리',
        description: '합성수는 1보다 크고 자신 외의 약수를 가진 수입니다 (0과 1은 소수도 합성수도 아닙니다). 0과 1을 합성수(True)로 잘못 판단하는 아래 스타터 코드의 경계 버그를 수리하세요.',
        contextCard: {
          title: '📋 합성수 경계 수리 흐름 예시',
          steps: [
            { label: '관찰', text: '현재 코드는 0과 1을 합성수라고 판정합니다.' },
            { label: '정의 확인', text: '0과 1은 소수도 합성수도 아닙니다.' },
            { label: '수리 질문', text: '반복 전에 실행되는 경계 분기의 반환 의미를 다시 검토하세요.' },
          ],
        },
        thoughtCheck: {
          prompt: '“소수가 아니다”와 “합성수다”가 서로 다른 뜻이 되는 입력값은 무엇일까요?',
          options: [
            { id: 'opt_0_1', label: '0과 1 (소수도 아니고 합성수도 아님)', isCorrect: true },
            { id: 'opt_4_9', label: '4와 9', isCorrect: false },
          ],
          feedback: '정확합니다! 0과 1은 소수도 합성수도 아니므로 합성수 판별기에서도 False를 반환해야 합니다.',
        },
        entryFunction: 'is_composite_number',
        starterCode: `def is_composite_number(number):
    if number < 2:
        return True  # 이 경계 판단을 검토하세요.
    for divisor in range(2, number):
        if number % divisor == 0:
            return True
    return False
`,
        testCases: [
          { inputs: { number: 1 }, expected: false },
          { inputs: { number: 6 }, expected: true },
        ],
      },
    ],
  },
})
