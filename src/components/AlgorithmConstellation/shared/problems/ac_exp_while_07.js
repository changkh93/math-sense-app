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
    understandingChallenges: [
      {
        challengeId: 'uc_exp_while_07_1',
        title: '★★ while 반복 조건과 종료 판정',
        type: 'single-choice',
        prompt: 'start=1, target=4일 때 2회차 루프 직후의 상태와 종료 조건을 예측해 보세요.',
        questions: [
          {
            id: 'q1',
            text: '2회차 루프(pos = pos + 1)가 끝난 직후 pos의 값은?',
            options: [
              { value: '3', label: '3' },
              { value: '2', label: '2' },
              { value: '4', label: '4' },
            ],
            expected: '3',
          },
          {
            id: 'q2',
            text: '그 직후 다음 반복 조건 (pos < target)의 평가는 무엇일까요?',
            options: [
              { value: 'True', label: 'True (3 < 4이므로 계속 진행)' },
              { value: 'False', label: 'False (종료)' },
            ],
            expected: 'True',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_exp_while_07_transfer_1',
        title: '가변 보폭으로 안전선 전진',
        description: '로버가 시작 위치(start_pos)에서 목표 위치(target_pos)를 초과하지 않는 동안 보폭(step)만큼 전진하여, 목표를 넘지 않는 가장 먼 안전 위치를 반환하세요.',
        contextCard: {
          title: '📋 가변 보폭 전진 규칙',
          steps: [
            { label: '① 전진 가능 여부 확인', text: 'pos + step <= target_pos' },
            { label: '② 전진 실행', text: 'pos = pos + step' },
          ],
        },
        thoughtCheck: {
          prompt: '다음 한 걸음(pos + step)이 목표를 넘어가면 전진을 멈춰야 합니다. 어떤 조건식이 적합할까요?',
          options: [
            { id: 'opt_safe', label: 'pos + step <= target_pos', isCorrect: true },
            { id: 'opt_danger', label: 'pos <= target_pos', isCorrect: false },
          ],
          feedback: '맞아요! 다음 이동할 위치(pos + step)를 미리 검사해야 목표를 초과(오버슈트)하지 않습니다.',
        },
        entryFunction: 'advance_with_step',
        starterCode: `def advance_with_step(start_pos, target_pos, step):
    pos = start_pos
    # pos + step 이 target_pos 이하인 동안 전진하는 while 문을 작성하세요.
    return pos
`,
        testCases: [
          { inputs: { start_pos: 0, target_pos: 10, step: 2 }, expected: 10 },
          { inputs: { start_pos: 1, target_pos: 10, step: 3 }, expected: 10 },
          { inputs: { start_pos: 0, target_pos: 9, step: 4 }, expected: 8 },
          { inputs: { start_pos: 5, target_pos: 5, step: 2 }, expected: 5 },
          { inputs: { start_pos: 2, target_pos: 4, step: 5 }, expected: 2 },
        ],
      },
    ],
  },
})
