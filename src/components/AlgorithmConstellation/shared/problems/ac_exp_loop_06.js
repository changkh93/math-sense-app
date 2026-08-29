import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_EXP_LOOP_06 = createCapabilityPrototypeKernel({
  problemId: 'AC-EXP-LOOP-06',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-0',
    routeRole: 'core',
    learningRole: 'anchor',
    recommendedBand: 'E',
    prerequisites: ['AC-EXP-VAR-02'],
  },
  identity: {
    studentTitle: '네 번 반복한 신호',
    subtitle: '반복문이 한 회차씩 실행될 때마다 상태가 한 단계씩 누적되는 과정을 추적합니다.',
  },
  pythonConcepts: {
    requires: ['concept:function-body-focus', 'operator:assignment', 'operator:arithmetic-state-update'],
    introduces: ['statement:for', 'builtin:range'],
  },
  thinkingPatterns: {
    requires: [],
    introduces: [],
  },
  evidenceRecipe: {
    primitives: ['scalar-sequence'],
    requiredClaims: ['iterative-state-accumulation-trace'],
  },
  modes: {
    observe: {
      prompt: 'energy = 0에서 시작하여 4회 동안 매번 energy = energy + 2를 실행하면 최종 energy는 얼마일까요?',
      expected: '8',
      options: ['8', '4', '2', '0'],
    },
    explore: {
      lensId: 'state-transition',
      initialState: { energy: 0, loop_count: 0 },
      frames: [
        { id: 'iter_1', operationLabel: '1회차 (+2)', stateAfter: { energy: 2, loop_count: 1 } },
        { id: 'iter_2', operationLabel: '2회차 (+2)', stateAfter: { energy: 4, loop_count: 2 } },
        { id: 'iter_3', operationLabel: '3회차 (+2)', stateAfter: { energy: 6, loop_count: 3 } },
        { id: 'iter_4', operationLabel: '4회차 (+2)', stateAfter: { energy: 8, loop_count: 4 } },
      ],
      predictionPrompt: 'for 루프가 돌 때마다 energy 변수의 상태가 어떻게 변하는지 단계별로 확인해 보세요.',
      rulePrompt: '반복문 안에서 변수의 값이 매 단계 누적되는 원리는 무엇일까요?',
      ruleStatement: 'for 문은 지정된 횟수만큼 본문을 반복 실행하며, 이전 회차의 계산 결과 변수에 새로운 값이 더해져 최종 상태가 됩니다.',
    },
    code: {
      entryFunction: 'repeat_pulse',
      starterCode: `def repeat_pulse(times, step_energy):
    # energy 변수에 0을 넣고, times만큼 반복하며 step_energy를 더한 뒤 반환하세요.
    energy = 0
    return energy
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { times: 4, step_energy: 2 }, expected: 8 },
      { inputs: { times: 3, step_energy: 5 }, expected: 15 },
    ],
  },
})
