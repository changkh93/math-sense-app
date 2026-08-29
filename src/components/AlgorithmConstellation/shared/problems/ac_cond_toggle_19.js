import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_COND_TOGGLE_19 = createCapabilityPrototypeKernel({
  problemId: 'AC-COND-TOGGLE-19',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-1',
    routeRole: 'branch',
    learningRole: 'review',
    recommendedBand: 'E',
    prerequisites: [
      'AC-EXP-LOOP-06',
      'AC-CODE-FIRST-ERROR-01',
      'AC-COND-NOT-13',
    ],
  },
  identity: {
    studentTitle: '꺼졌다 켜지는 기지',
    subtitle: '신호 목록을 순회하며 참일 때마다 현재 상태를 반대로 뒤집는 누적 토글 상태 추적 함수를 작성합니다.',
  },
  pythonConcepts: {
    requires: [
      'concept:function-body-focus',
      'operator:assignment',
      'builtin:list',
      'statement:for',
      'statement:if',
      'value:boolean',
      'operator:not',
      'operator:and',
    ],
    introduces: [],
  },
  thinkingPatterns: {
    requires: [],
    introduces: [],
  },
  evidenceRecipe: {
    primitives: ['container-scan', 'scalar-sequence', 'decision'],
    requiredClaims: [
      'toggle-uses-current-state',
      'false-action-preserves-state',
      'repeated-toggles-accumulate',
    ],
  },
  modes: {
    observe: {
      prompt: '전원이 꺼진(False) 기지에서 토글 신호가 세 번([True, True, True]) 들어오면 최종 전원은 어떻게 될까요?',
      expected: '켜진다 (True)',
      options: ['켜진다 (True)', '꺼져 있다 (False)', '알 수 없다'],
    },
    explore: {
      lensId: 'state-transition',
      initialState: { power: false, processedActions: 0, status: '신호 처리 전' },
      frames: [
        {
          id: 'case_action_1',
          operationLabel: '1번째 신호: True (반전)',
          prompt: '첫 번째 참 신호를 만나 False에서 True로 반전됩니다.',
          stateAfter: { power: true, processedActions: 1, status: '전원 켜짐' },
        },
        {
          id: 'case_action_2',
          operationLabel: '2번째 신호: False (유지)',
          prompt: '거짓 신호는 전원을 건드리지 않으므로 현재의 True 상태가 그대로 유지됩니다.',
          stateAfter: { power: true, processedActions: 2, status: '전원 켜짐 유지' },
        },
        {
          id: 'case_action_3',
          operationLabel: '3번째 신호: True (다시 반전)',
          prompt: '바뀐 현재 상태(True)를 다시 반전하여 전원이 False로 꺼집니다.',
          stateAfter: { power: false, processedActions: 3, status: '전원 꺼짐' },
        },
        {
          id: 'case_action_4',
          operationLabel: '4번째 신호: False (유지)',
          prompt: '거짓 신호이므로 현재의 False 상태를 그대로 유지하고 종료합니다.',
          stateAfter: { power: false, processedActions: 4, status: '최종 전원 꺼짐' },
        },
      ],
      predictionPrompt: '다음 신호를 처리한 뒤 현재 전원 상태가 어떻게 달라질지 예측해 보세요.',
      rulePrompt: '참 신호와 거짓 신호가 현재 상태에 각각 어떤 영향을 주는지 찾아보세요.',
      ruleStatement: '참 신호를 만나면 현재 상태를 반전하고, 거짓 신호를 만나면 현재 상태를 그대로 유지합니다.',
    },
    code: {
      entryFunction: 'toggle_base_power',
      starterCode: `def toggle_base_power(initial_power, toggle_actions):
    # 신호를 순서대로 처리해 기지의 최종 전원 상태를 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { initial_power: false, toggle_actions: [] }, expected: false },
      { inputs: { initial_power: false, toggle_actions: [true] }, expected: true },
      { inputs: { initial_power: false, toggle_actions: [true, false] }, expected: true },
      { inputs: { initial_power: true, toggle_actions: [true, true] }, expected: true },
    ],
  },
})
