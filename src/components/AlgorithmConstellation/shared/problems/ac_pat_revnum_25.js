import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_PAT_REVNUM_25 = createCapabilityPrototypeKernel({
  problemId: 'AC-PAT-REVNUM-25',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-2',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'E',
    prerequisites: ['AC-PAT-DIGIT-24', 'AC-EXP-WHILE-07'],
  },
  identity: {
    studentTitle: '뒤집힌 우주 번호',
    subtitle: 'while 반복문으로 마지막 자릿수를 하나씩 추출(% 10)하고 기존 수를 줄여가며(// 10) 수를 뒤집습니다.',
  },
  pythonConcepts: {
    requires: [
      'concept:function-body-focus',
      'statement:while',
      'operator:modulo',
      'operator:floor-division',
      'operator:assignment',
      'operator:arithmetic-state-update',
      'operator:comparison-bound',
    ],
    introduces: [],
  },
  thinkingPatterns: {
    requires: [],
    introduces: [],
  },
  evidenceRecipe: {
    primitives: ['state-trace', 'accumulator-loop'],
    requiredClaims: ['reverse-number-via-while-and-modulo-floor'],
  },
  modes: {
    observe: {
      prompt: 'number = 1203일 때 뒤집은 수(3021)를 만들기 위해 첫 번째 반복에서 추출되는 일의 자리 digit(number % 10)은 무엇일까요?',
      expected: '3',
      options: ['3', '1', '0', '1203'],
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🔍 자릿수 뒤집기 누적 실험실',
          description: 'number=1203을 한 자리씩 추출하여 reversed_number로 누적하는 과정입니다.',
          variables: [{ name: 'number', value: 1203, label: '원래 수' }],
          guidance: '각 반복마다 digit 추출 -> reversed 누적 -> number 축소가 일어납니다.',
        },
        initialState: { number: 1203, digit: null, reversed_number: 0 },
        initialStateLabel: '시작: number=1203, reversed_number=0',
        initialStepTitle: '🚀 시작 (1203)',
        initialPrompt: '첫 번째 자릿수 3을 추출하여 누적해 볼까요?',
        frames: [
          {
            id: 'digit_3',
            stepTitle: '① 3 추출 및 누적',
            operationLabel: 'digit=3, rev=3, num=120',
            codeSnippet: 'digit = 1203 % 10  # 3\nreversed_number = 0 * 10 + 3  # 3\nnumber = 1203 // 10  # 120',
            prompt: '일의 자리 3을 추출하고 number는 120으로 줄었습니다.',
            stateAfter: { number: 120, digit: 3, reversed_number: 3 },
          },
          {
            id: 'digit_0',
            stepTitle: '② 0 추출 및 누적',
            operationLabel: 'digit=0, rev=30, num=12',
            codeSnippet: 'digit = 120 % 10  # 0\nreversed_number = 3 * 10 + 0  # 30\nnumber = 120 // 10  # 12',
            prompt: '0을 추출하여 3 * 10 + 0 = 30이 되고 number는 12가 되었습니다.',
            stateAfter: { number: 12, digit: 0, reversed_number: 30 },
          },
          {
            id: 'digit_2',
            stepTitle: '③ 2 추출 및 누적',
            operationLabel: 'digit=2, rev=302, num=1',
            codeSnippet: 'digit = 12 % 10  # 2\nreversed_number = 30 * 10 + 2  # 302\nnumber = 12 // 10  # 1',
            prompt: '2를 추출하여 30 * 10 + 2 = 302가 되고 number는 1이 되었습니다.',
            stateAfter: { number: 1, digit: 2, reversed_number: 302 },
          },
          {
            id: 'digit_1',
            stepTitle: '④ 1 추출 및 완성',
            operationLabel: 'digit=1, rev=3021, num=0',
            codeSnippet: 'digit = 1 % 10  # 1\nreversed_number = 302 * 10 + 1  # 3021\nnumber = 1 // 10  # 0 (종료)',
            prompt: '마지막 1을 추출하여 3021이 완성되고 number가 0이 되어 while 루프가 끝납니다.',
            stateAfter: { number: 0, digit: 1, reversed_number: 3021 },
          },
        ],
        predictionPrompt: 'while number > 0 반복으로 자릿수를 뒤집는 코드를 완성하세요.',
        rulePrompt: '수 뒤집기 누적 규칙',
        ruleStatement: 'reversed = reversed * 10 + (number % 10)으로 앞자리를 한 칸씩 밀며 새 자릿수를 더하고, number = number // 10으로 숫자를 줄여나갑니다.',
      },
    },
    code: {
      entryFunction: 'reverse_signal_number',
      starterCode: `def reverse_signal_number(number):
    # while 문을 사용하여 정수 number의 자릿수를 뒤집은 정수를 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { number: 1203 }, expected: 3021 },
      { inputs: { number: 456 }, expected: 654 },
      { inputs: { number: 10 }, expected: 1 },
      { inputs: { number: 1200 }, expected: 21 },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_pat_revnum_25_1',
        title: '★★ reversed_number = reversed_number * 10 + digit의 의미',
        type: 'trace_understanding',
        prompt: '기존에 누적된 수에 10을 곱하고 새 digit을 더하는 이유를 확인하세요.',
        codeSnippet: `def reverse_signal_number(number):
    reversed_number = 0
    while number > 0:
        digit = number % 10
        reversed_number = reversed_number * 10 + digit
        number = number // 10
    return reversed_number`,
        questions: [
          {
            id: 'q1',
            text: 'reversed_number가 3일 때 다음 자릿수 0이 오면 3 * 10 + 0 = 30이 되는 이유는 무엇일까요?',
            options: [
              { value: 'shift_left', label: '기존에 들어온 3을 십의 자리(왼쪽)로 한 칸 밀어내기 위해 10을 곱하기 때문' },
              { value: 'add_ten', label: '단순히 10을 더하기 위해' },
              { value: 'random', label: '자리수를 없애기 위해' },
            ],
            expected: 'shift_left',
          },
          {
            id: 'q2',
            text: 'number = 1200처럼 끝에 0이 있는 수를 뒤집으면 왜 21이 될까요?',
            options: [
              { value: 'leading_zeros_drop', label: '0*10+0=0, 0*10+0=0 후 2, 1이 누적되어 앞의 0들은 자연스럽게 사라지기 때문' },
              { value: 'error', label: '0을 나눌 수 없기 때문' },
              { value: 'same', label: '1200 그대로 유지되기 때문' },
            ],
            expected: 'leading_zeros_drop',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_pat_revnum_25_t1',
        title: '정수의 총 자릿수 계산하기',
        description: '0 이상의 정수 number가 주어질 때, number // 10을 반복하며 총 몇 자리의 숫자인지 세어 자릿수(count)를 반환하세요. (단, 0은 1자리 수입니다)',
        contextCard: {
          title: '📋 자릿수 카운팅 흐름 예시',
          steps: [
            { label: '초기 수', text: 'number = 1203 (count = 0)' },
            { label: '반복 // 10', text: '120 -> 12 -> 1 -> 0 (4번 반복)' },
            { label: '최종 자릿수', text: 'count = 4' },
          ],
        },
        thoughtCheck: {
          prompt: 'number = 0일 때 자릿수는 몇 자리일까요?',
          options: [
            { id: 'opt_1', label: '0도 숫자 한 개이므로 1자리이다', isCorrect: true },
            { id: 'opt_0', label: '0자리이다', isCorrect: false },
          ],
          feedback: '맞아요! 0은 값이 0이지만 한 자리 숫자이므로 1을 반환해야 합니다.',
        },
        entryFunction: 'count_number_digits',
        starterCode: `def count_number_digits(number):
    # 0 이상의 정수 number의 총 자릿수를 계산하여 반환하세요. (0은 1자리입니다)
    pass
`,
        testCases: [
          { inputs: { number: 1203 }, expected: 4 },
          { inputs: { number: 0 }, expected: 1 },
        ],
      },
    ],
  },
})
