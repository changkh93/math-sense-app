import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_EXP_REVERSE_10 = createCapabilityPrototypeKernel({
  problemId: 'AC-EXP-REVERSE-10',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-0',
    routeRole: 'branch',
    learningRole: 'review',
    recommendedBand: 'E',
    prerequisites: ['AC-EXP-VAR-02', 'AC-EXP-STEP-03'],
  },
  identity: {
    studentTitle: '숨은 로봇의 규칙',
    subtitle: '로봇의 입출력 관측 데이터(0->3, 1->5, 2->7, 3->9)를 통해 2단계 선형 규칙(배율+보정값)을 역공학합니다.',
  },
  pythonConcepts: {
    requires: [
      'concept:function-body-focus',
      'operator:arithmetic-state-update',
    ],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:procedure-decomposition'],
    introduces: [],
  },
  evidenceRecipe: {
    primitives: ['scalar-sequence'],
    requiredClaims: ['blackbox-rule-reverse-engineering'],
  },
  modes: {
    observe: {
      prompt: '로봇은 입력에 일정한 정수 배율을 곱한 뒤 일정한 정수 보정값을 더합니다. 관측(0->3, 1->5, 2->7, 3->9)에서 입력이 1씩 늘 때 출력은 얼마씩 늘어날까요?',
      expected: '2씩 늘어난다',
      options: ['2씩 늘어난다', '1씩 늘어난다', '3씩 늘어난다', '일정하지 않다'],
    },
    explore: {
      lensId: 'state-transition',
      initialState: { signal: 0, output: 3 },
      frames: [
        {
          id: 'case_one',
          operationLabel: '다음 관측 (signal=1)',
          prompt: '입력이 1 증가하자 출력이 5가 되었습니다 (+2 증가).',
          stateAfter: { signal: 1, output: 5, inputDelta: 1, outputDelta: 2 },
        },
        {
          id: 'case_two',
          operationLabel: '증가량 확인 (signal=2)',
          prompt: '입력이 다시 1 증가했을 때도 출력은 2 증가했습니다. 일정한 배율은 2입니다.',
          stateAfter: { signal: 2, output: 7, inputDelta: 1, outputDelta: 2 },
        },
        {
          id: 'case_offset',
          operationLabel: '시작값 확인 (signal=0)',
          prompt: '입력이 0이면 곱한 부분은 0입니다. 남아 있는 출력 3이 시작 보정값입니다.',
          stateAfter: { signal: 0, output: 3, multiplier: 2, offset: 3 },
        },
        {
          id: 'case_three',
          operationLabel: '규칙 종합 (signal=3)',
          prompt: '규칙 종합: output = signal * 2 + 3 (3 * 2 + 3 = 9)',
          stateAfter: { signal: 3, output: 9, multiplier: 2, offset: 3 },
        },
      ],
      predictionPrompt: '출력의 일정한 증가량에서 배율을 찾고, 입력이 0일 때의 출력에서 시작 보정값을 찾아보세요.',
      rulePrompt: '입출력 기록에서 두 단계 규칙을 어떻게 복원할까요?',
      ruleStatement: '입력이 1 늘 때 출력이 2 늘어나므로 배율은 2이고, 입력 0의 출력이 3이므로 시작 보정값은 3입니다. 따라서 output = signal * 2 + 3입니다.',
    },
    code: {
      entryFunction: 'apply_robot_rule',
      starterCode: `def apply_robot_rule(signal):
    # 관측에서 찾은 배율과 시작 보정값을 사용해 결과를 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { signal: 0 }, expected: 3 },
      { inputs: { signal: 1 }, expected: 5 },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_exp_reverse_10_1',
        title: '★★ 역추론 규칙 분석',
        type: 'single-choice',
        prompt: '로봇의 입출력 데이터(0->3, 1->5, 2->7, 3->9)의 규칙을 분석해 보세요.',
        questions: [
          {
            id: 'q1',
            text: '입력 signal이 1 증가할 때마다 출력값은 얼마나 늘어나나요?',
            options: [
              { value: '2', label: '2' },
              { value: '1', label: '1' },
              { value: '3', label: '3' },
            ],
            expected: '2',
          },
          {
            id: 'q2',
            text: '입력이 0일 때 출력이 3인 것은 규칙의 어느 부분을 보여주는 것일까요?',
            options: [
              { value: '시작 보정값 +3', label: '시작 보정값 +3' },
              { value: '배율 ×2', label: '배율 ×2' },
            ],
            expected: '시작 보정값 +3',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_exp_reverse_10_transfer_1',
        title: '탐사 드론의 레벨별 에너지 출력',
        description: '드론의 레벨별 출력 기록(0->1, 1->4, 2->7, 3->10)을 분석하여, 레벨(level)에 따른 에너지 출력을 계산하는 함수를 작성하세요.',
        contextCard: {
          title: '📋 드론 출력 기록 분석',
          steps: [
            { label: '① 증가 폭 확인', text: '레벨이 1 오를 때마다 출력이 3씩 증가 (× 3)' },
            { label: '② 기본 출력 확인', text: '레벨 0일 때 기본 출력이 1 (+ 1)' },
          ],
        },
        thoughtCheck: {
          prompt: '레벨 0일 때 출력이 1이고 매 레벨마다 3씩 늘어난다면 올바른 식은 무엇일까요?',
          options: [
            { id: 'opt_linear', label: 'level * 3 + 1', isCorrect: true },
            { id: 'opt_wrong', label: 'level * 1 + 3', isCorrect: false },
          ],
          feedback: '맞아요! 증가폭(3)이 배율이 되고, 0일 때의 값(1)이 더해지는 상수입니다.',
        },
        entryFunction: 'apply_drone_energy',
        starterCode: `def apply_drone_energy(level):
    # 관측 기록(0->1, 1->4, 2->7, 3->10)에서 찾은 규칙을 작성하세요.
    pass
`,
        testCases: [
          { inputs: { level: 0 }, expected: 1 },
          { inputs: { level: 1 }, expected: 4 },
          { inputs: { level: 4 }, expected: 13 },
          { inputs: { level: 10 }, expected: 31 },
        ],
      },
    ],
  },
})
