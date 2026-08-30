import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_PAT_EVEN_23 = createCapabilityPrototypeKernel({
  problemId: 'AC-PAT-EVEN-23',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-2',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'E',
    prerequisites: ['AC-PAT-003'],
  },
  identity: {
    studentTitle: '홀수·짝수 비콘',
    subtitle: '% 2 연산으로 0과 1이 교대로 반복되는 두 상태 주기를 판별합니다.',
  },
  pythonConcepts: {
    requires: ['concept:function-body-focus', 'operator:modulo', 'operator:equality'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: [],
    introduces: [],
  },
  evidenceRecipe: {
    primitives: ['scalar-sequence', 'decision'],
    requiredClaims: ['parity-classification-via-modulo-two'],
  },
  modes: {
    observe: {
      prompt: 'signal_number = 12일 때 signal_number % 2 == 0의 계산 결과는 무엇일까요?',
      expected: 'True',
      options: ['True', 'False', '0', '1'],
    },
    explore: {
      lensId: 'pattern-timeline',
      lensConfig: {
        cycleLength: 2,
        pattern: [true, false],
        timeLabels: ['0 (짝수)', '1 (홀수)', '2 (짝수)', '3 (홀수)', '4 (짝수)', '5 (홀수)'],
        rulePrompt: '짝수와 홀수의 2주기 규칙',
        ruleStatement: '어떤 정수를 2로 나눈 나머지가 0이면 짝수(True), 1이면 홀수(False)로 두 상태가 번갈아 나타납니다.',
      },
    },
    code: {
      entryFunction: 'is_even_beacon',
      starterCode: `def is_even_beacon(signal_number):
    # signal_number가 짝수(2로 나눈 나머지가 0)이면 True, 홀수이면 False를 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { signal_number: 0 }, expected: true },
      { inputs: { signal_number: 7 }, expected: false },
      { inputs: { signal_number: 12 }, expected: true },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_pat_even_23_1',
        title: '★★ 0은 짝수일까 홀수일까?',
        type: 'trace_understanding',
        prompt: '0을 2로 나눈 나머지와 2씩 커질 때 홀짝 패턴의 변화를 확인해 보세요.',
        codeSnippet: `def is_even_beacon(signal_number):
    return signal_number % 2 == 0`,
        questions: [
          {
            id: 'q1',
            text: 'signal_number=0일 때, 0 % 2의 계산 결과와 is_even_beacon(0)의 반환값은 무엇일까요?',
            options: [
              { value: '0_true', label: '나머지는 0이므로 반환값은 True (0은 짝수)' },
              { value: '0_false', label: '0은 짝수가 아니므로 반환값은 False' },
              { value: 'error', label: '0으로 나눌 수 없으므로 에러 발생' },
            ],
            expected: '0_true',
          },
          {
            id: 'q2',
            text: '짝수 n에 2를 더한 (n + 2)는 항상 짝수일까요?',
            options: [
              { value: 'always_even', label: '항상 짝수이다 (2씩 건너뛰면 짝수 상태가 유지된다)' },
              { value: 'becomes_odd', label: '홀수로 바뀐다' },
              { value: 'unknown', label: '수마다 다르다' },
            ],
            expected: 'always_even',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_pat_even_23_t1',
        title: '두 신호의 홀짝 일치 판별',
        description: '두 신호 번호 a와 b가 모두 짝수이거나 모두 홀수로 홀짝 상태(parity)가 일치하면 True, 서로 다르면 False를 반환하세요.',
        contextCard: {
          title: '📋 신호 동기화 예시',
          steps: [
            { label: '신호 A', text: 'a % 2 (0 또는 1)' },
            { label: '신호 B', text: 'b % 2 (0 또는 1)' },
            { label: '동일 상태', text: 'a % 2 == b % 2' },
          ],
        },
        thoughtCheck: {
          prompt: '두 수 a=4(짝수), b=10(짝수)일 때 a % 2와 b % 2는 서로 같을까요?',
          options: [
            { id: 'opt_same', label: '둘 다 나머지가 0으로 일치한다 (True)', isCorrect: true },
            { id: 'opt_diff', label: '수가 다르므로 나머지도 다르다', isCorrect: false },
          ],
          feedback: '맞아요! 두 수가 모두 짝수이면 나머지가 0으로 같고, 모두 홀수이면 나머지가 1로 같습니다.',
        },
        entryFunction: 'have_same_parity',
        starterCode: `def have_same_parity(a, b):
    # 두 수 a와 b의 홀짝(2로 나눈 나머지)이 같으면 True, 다르면 False를 반환하세요.
    pass
`,
        testCases: [
          { inputs: { a: 4, b: 10 }, expected: true },
          { inputs: { a: 2, b: 5 }, expected: false },
        ],
      },
    ],
  },
})
