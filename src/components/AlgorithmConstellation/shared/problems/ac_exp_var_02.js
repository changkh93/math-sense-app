import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_EXP_VAR_02 = createCapabilityPrototypeKernel({
  problemId: 'AC-EXP-VAR-02',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-0',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'E',
    prerequisites: ['AC-EXP-SEQ-01'],
  },
  identity: {
    studentTitle: '사라진 변수 값',
    subtitle: '변수에 새 값을 대입하면 이전 상태가 덮어씌워지며 교체됨을 추적합니다.',
  },
  pythonConcepts: {
    requires: ['concept:function-body-focus', 'operator:assignment'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: [],
    introduces: [],
  },
  evidenceRecipe: {
    primitives: ['scalar-sequence'],
    requiredClaims: ['variable-assignment-overwrites-previous-state'],
  },
  modes: {
    observe: {
      prompt: 'signal = 30 실행 후 signal = 70을 실행하면 signal의 최종 값은 무엇일까요?',
      expected: '70',
      options: ['70', '30', '100', '0'],
    },
    explore: {
      lensId: 'state-transition',
      initialState: { signal: '미정' },
      frames: [
        { id: 'first_assign', operationLabel: 'signal = old_level', stateAfter: { signal: 30 } },
        { id: 'second_assign', operationLabel: 'signal = new_level', stateAfter: { signal: 70 } },
      ],
      predictionPrompt: 'signal 변수에 새 값을 대입했을 때 이전 값이 어떻게 되는지 확인해 보세요.',
      rulePrompt: '변수에 새 값을 대입하면 이전 값은 어디로 갈까요?',
      ruleStatement: '변수에 새 값을 대입(=)하면 이전 값은 완전히 덮어씌워져 사라지고 새 값으로 교체됩니다.',
    },
    code: {
      entryFunction: 'update_signal',
      starterCode: `def update_signal(old_level, new_level):
    # signal 변수에 old_level을 넣은 뒤, new_level로 갱신하여 반환하세요.
    signal = old_level
    return signal
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { old_level: 30, new_level: 70 }, expected: 70 },
      { inputs: { old_level: 10, new_level: 50 }, expected: 50 },
    ],
  },
})
