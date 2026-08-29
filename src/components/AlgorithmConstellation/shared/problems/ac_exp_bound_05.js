import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_EXP_BOUND_05 = createCapabilityPrototypeKernel({
  problemId: 'AC-EXP-BOUND-05',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-0',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'E',
    prerequisites: ['AC-EXP-VAR-02'],
  },
  identity: {
    studentTitle: '경계선의 탐사선',
    subtitle: '탐사선 위치가 경계선(limit)에 정확히 걸쳤을 때의 반례를 관찰하고 참/거짓 비교 연산자를 결정합니다.',
  },
  pythonConcepts: {
    requires: ['concept:function-body-focus'],
    introduces: ['operator:comparison-bound'],
  },
  thinkingPatterns: {
    requires: [],
    introduces: [],
  },
  evidenceRecipe: {
    primitives: ['boundary-predicate'],
    requiredClaims: ['exact-boundary-inclusive-check'],
  },
  modes: {
    observe: {
      prompt: '위치 9/경계 10은 안전(True), 위치 11/경계 10은 위험(False)입니다. 위치가 정확히 10(경계선 위)일 때는 무엇이어야 할까요?',
      expected: 'True',
      options: ['True', 'False'],
    },
    explore: {
      lensId: 'state-transition',
      initialState: { current_pos: 9, limit: 10 },
      frames: [
        {
          id: 'step_inside',
          operationLabel: '경계선 안쪽 (pos=9, limit=10)',
          stateAfter: { current_pos: 9, limit: 10, result: true },
        },
        {
          id: 'step_boundary_choice',
          operationLabel: '경계선 위 (pos=10, limit=10)',
          prompt: '경계선 위의 지점도 안전 구역에 포함하려면 어떤 비교 연산자를 사용해야 할까요?',
          operationOptions: [
            {
              id: 'opt_less_equal',
              label: 'current_pos <= limit',
              stateAfter: { current_pos: 10, limit: 10, result: true },
            },
            {
              id: 'opt_strict_less',
              label: 'current_pos < limit',
              stateAfter: { current_pos: 10, limit: 10, result: false },
            },
          ],
          expectedOptionId: 'opt_less_equal',
          stateAfter: { current_pos: 10, limit: 10, result: true },
        },
        {
          id: 'step_outside',
          operationLabel: '경계선 바깥 (pos=11, limit=10)',
          stateAfter: { current_pos: 11, limit: 10, result: false },
        },
      ],
      predictionPrompt: '경계선보다 작을 때와 경계선과 정확히 같을 때의 참/거짓 결과를 비교해 보세요.',
      rulePrompt: '경계선(limit)까지 포함하는 조건을 만들 때 어떤 기호를 써야 할까요?',
      ruleStatement: '< 기호는 경계 바로 전까지만 포함하고, <= 기호는 경계선 위의 값까지 포함합니다.',
    },
    code: {
      entryFunction: 'check_within_boundary',
      starterCode: `def check_within_boundary(current_pos, limit):
    # 경계선 위의 위치도 안전 구역에 포함되는 규칙을 코드로 표현하세요.
    return False
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { current_pos: 8, limit: 10 }, expected: true },
      { inputs: { current_pos: 10, limit: 10 }, expected: true },
      { inputs: { current_pos: 12, limit: 10 }, expected: false },
    ],
  },
})
