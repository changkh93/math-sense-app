import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_PAT_DIGIT_24 = createCapabilityPrototypeKernel({
  problemId: 'AC-PAT-DIGIT-24',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-2',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'E',
    prerequisites: ['AC-PAT-003', 'AC-CODE-FIRST-ERROR-01'],
  },
  identity: {
    studentTitle: '숫자 유성의 자릿수 신호',
    subtitle: '// (정수 몫)과 % (나머지) 연산자로 세 자리 정수를 백, 십, 일의 자릿수 리스트로 분해합니다.',
  },
  pythonConcepts: {
    requires: ['concept:function-body-focus', 'operator:modulo', 'operator:assignment', 'builtin:list'],
    introduces: ['operator:floor-division'],
  },
  thinkingPatterns: {
    requires: [],
    introduces: [],
  },
  evidenceRecipe: {
    primitives: ['scalar-sequence', 'list-assembly'],
    requiredClaims: ['positional-decimal-decomposition-via-floor-and-mod'],
  },
  modes: {
    observe: {
      prompt: 'number = 472일 때 472 // 100(백의 자리)과 472 % 10(일의 자리)의 값은 각각 무엇일까요?',
      expected: '[4, 2]',
      options: ['[4, 2]', '[47, 2]', '[4, 7]', '[472, 0]'],
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🔍 10진 자릿수 분해 실험실',
          description: '세 자리 수 472의 각 자릿수를 //(몫)과 %(나머지)를 사용하여 분해하는 과정입니다.',
          variables: [{ name: 'number', value: 472, label: '분해할 세 자리 수' }],
          guidance: '100과 10으로 나눈 몫과 나머지를 확인해 보세요.',
        },
        initialState: { hundreds: null, tens: null, ones: null },
        initialStateLabel: '자릿수를 분해하기 전 상태입니다.',
        initialStepTitle: '🚀 시작 (472)',
        initialPrompt: '먼저 백의 자리(472 // 100)를 구해 볼까요?',
        frames: [
          {
            id: 'extract_hundreds',
            stepTitle: '① 백의 자리 추출',
            operationLabel: 'hundreds = number // 100',
            codeSnippet: 'hundreds = 472 // 100  # 4',
            prompt: '100으로 나눈 몫 4가 백의 자리입니다.',
            stateAfter: { hundreds: 4, tens: null, ones: null },
          },
          {
            id: 'extract_tens',
            stepTitle: '② 십의 자리 추출',
            operationLabel: 'tens = (number // 10) % 10',
            codeSnippet: 'tens = (472 // 10) % 10  # 47 % 10 = 7',
            prompt: '10으로 나눈 몫 47에서 10으로 나눈 나머지 7이 십의 자리입니다.',
            stateAfter: { hundreds: 4, tens: 7, ones: null },
          },
          {
            id: 'extract_ones',
            stepTitle: '③ 일의 자리 추출',
            operationLabel: 'ones = number % 10',
            codeSnippet: 'ones = 472 % 10  # 2',
            prompt: '10으로 나눈 나머지 2가 일의 자리입니다.',
            stateAfter: { hundreds: 4, tens: 7, ones: 2 },
          },
        ],
        predictionPrompt: '//와 %를 조합하여 각 자릿수를 리스트 [hundreds, tens, ones]로 조립해 보세요.',
        rulePrompt: '10진 자릿수 분해 규칙',
        ruleStatement: '100으로 나눈 몫은 백의 자리, (10으로 나눈 몫) % 10은 십의 자리, 10으로 나눈 나머지는 일의 자리가 됩니다.',
      },
    },
    code: {
      entryFunction: 'decode_three_digit_signal',
      starterCode: `def decode_three_digit_signal(number):
    # 세 자리 수 number를 [백의 자리, 십의 자리, 일의 자리] 리스트로 분해하여 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { number: 472 }, expected: [4, 7, 2] },
      { inputs: { number: 100 }, expected: [1, 0, 0] },
      { inputs: { number: 589 }, expected: [5, 8, 9] },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_pat_digit_24_1',
        title: '★★ 십의 자리는 왜 (number // 10) % 10일까?',
        type: 'trace_understanding',
        prompt: '472에서 10으로 나눈 몫과 나머지가 어떻게 십의 자리를 걸러내는지 확인하세요.',
        codeSnippet: `def decode_three_digit_signal(number):
    hundreds = number // 100
    tens = (number // 10) % 10
    ones = number % 10
    return [hundreds, tens, ones]`,
        questions: [
          {
            id: 'q1',
            text: 'number=472일 때, number // 10의 결과(47)에서 % 10을 계산하면 십의 자리인 7이 나오는 이유는 무엇일까요?',
            options: [
              { value: 'drop_ones_then_mod', label: '// 10으로 일의 자리(2)를 버린 뒤, 47의 끝자리(7)를 % 10으로 추출하기 때문' },
              { value: 'random_math', label: '100을 10으로 나누었기 때문' },
              { value: 'hundreds_mod', label: '백의 자리 4를 더했기 때문' },
            ],
            expected: 'drop_ones_then_mod',
          },
          {
            id: 'q2',
            text: 'number=307처럼 십의 자리가 0인 경우, (307 // 10) % 10의 계산 결과는 무엇일까요?',
            options: [
              { value: '0', label: '30 % 10의 결과인 0 (0 자릿수 정상 추출)' },
              { value: '3', label: '3' },
              { value: '7', label: '7' },
            ],
            expected: '0',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_pat_digit_24_t1',
        title: '세 자리 수의 자릿수 합산',
        description: '세 자리 수 number의 백의 자리, 십의 자리, 일의 자릿수를 모두 더한 총합을 반환하세요.',
        contextCard: {
          title: '📋 자릿수 합산 흐름 예시',
          steps: [
            { label: '세 자리 수', text: 'number = 472' },
            { label: '자릿수 분해', text: '4, 7, 2' },
            { label: '자릿수 합', text: '4 + 7 + 2 = 13' },
          ],
        },
        thoughtCheck: {
          prompt: 'number=105일 때 자릿수의 합은 얼마일까요?',
          options: [
            { id: 'opt_6', label: '1 + 0 + 5 = 6', isCorrect: true },
            { id: 'opt_15', label: '1 + 5 = 15', isCorrect: false },
          ],
          feedback: '정확합니다! 중간 0도 포함하여 1 + 0 + 5 = 6이 됩니다.',
        },
        entryFunction: 'sum_three_digit_signal',
        starterCode: `def sum_three_digit_signal(number):
    # 세 자리 수 number의 각 자릿수(백, 십, 일)를 분해하여 모두 더한 값을 반환하세요.
    pass
`,
        testCases: [
          { inputs: { number: 472 }, expected: 13 },
          { inputs: { number: 105 }, expected: 6 },
        ],
      },
    ],
  },
})
