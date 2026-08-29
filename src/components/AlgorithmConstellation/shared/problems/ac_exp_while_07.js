import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_EXP_WHILE_07 = createCapabilityPrototypeKernel({
  problemId: 'AC-EXP-WHILE-07',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-0',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'E',
    prerequisites: ['AC-EXP-LOOP-06', 'AC-EXP-BOUND-05'],
  },
  identity: {
    studentTitle: '멈출 줄 아는 로버',
    subtitle: '목표 위치에 도달할 때까지 1씩 전진하다가 목표에 도달하면 안전하게 멈추는 while 종료 조건을 작성합니다.',
  },
  pythonConcepts: {
    requires: [
      'concept:function-body-focus',
      'operator:assignment',
      'operator:arithmetic-state-update',
      'operator:comparison-bound',
    ],
    introduces: ['statement:while'],
  },
  thinkingPatterns: {
    requires: [],
    introduces: [],
  },
  evidenceRecipe: {
    primitives: ['while-loop-termination'],
    requiredClaims: ['condition-driven-state-update-and-termination'],
  },
  modes: {
    observe: {
      prompt: '시작 위치 1에서 목표 4까지 1씩 전진할 때, pos가 4에 도달하면 루프는 계속될까요, 멈출까요?',
      expected: '멈춘다',
      options: ['멈춘다', '계속 전진한다'],
    },
    explore: {
      lensId: 'state-transition',
      initialState: { pos: 1, target: 4 },
      frames: [
        {
          id: 'step_iter_1',
          operationLabel: '1회차 전진 (pos = pos + 1)',
          stateAfter: { pos: 2, target: 4, condition: true },
        },
        {
          id: 'step_iter_2',
          operationLabel: '2회차 전진 (pos = pos + 1)',
          stateAfter: { pos: 3, target: 4, condition: true },
        },
        {
          id: 'step_iter_3_stop',
          operationLabel: '3회차 전진 및 종료 조건 판정',
          stateAfter: { pos: 4, target: 4, condition: false },
        },
      ],
      predictionPrompt: '회차가 반복될 때마다 pos의 상태와 다음 회차 실행 조건(pos < target)을 확인해 보세요.',
      rulePrompt: 'while 문이 멈추지 않고 영원히 도는 것을 막으려면 무엇이 필요할까요?',
      ruleStatement: 'while 문 안에서 상태가 갱신되어, 결국 반복 조건이 False가 되는 순간이 반드시 와야 안전하게 멈춥니다.',
    },
    code: {
      entryFunction: 'advance_until_target',
      starterCode: `def advance_until_target(start_pos, target_pos):
    pos = start_pos
    # target_pos에 도달할 때까지 pos를 1씩 전진시키며 멈추는 while 문을 작성하세요.
    return pos
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { start_pos: 1, target_pos: 4 }, expected: 4 },
      { inputs: { start_pos: 0, target_pos: 3 }, expected: 3 },
      { inputs: { start_pos: 5, target_pos: 5 }, expected: 5 },
    ],
  },
})
