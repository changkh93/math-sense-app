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
    understandingChallenges: [
      {
        challengeId: 'uc_loop_06_1',
        title: '★★ 반복문 회차별 누적 추적',
        type: 'single-choice',
        prompt: '반복문 실행 과정의 중간 상태를 확인해 보세요.',
        questions: [
          {
            id: 'q1',
            text: 'times=4, step_energy=2일 때, for 루프가 2회차까지 실행된 직후 energy의 값은 얼마일까요?',
            options: [
              { value: '4', label: '4' },
              { value: '2', label: '2' },
              { value: '8', label: '8' },
              { value: '0', label: '0' },
            ],
            expected: '4',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_loop_06_t1',
        title: '배터리 팩 순차 충전',
        description: '배터리 팩에 기본 0에서 시작하여 cycle_count 횟수만큼 charge_rate 씩 충전한 최종 충전량을 반환하세요.',
        contextCard: {
          title: '📋 배터리 충전 흐름',
          steps: [
            { label: '① 초기화', text: 'total = 0' },
            { label: '② 반복 충전', text: 'for i in range(cycle_count): total += charge_rate' },
          ],
        },
        thoughtCheck: {
          prompt: '매 회차마다 total에 charge_rate를 누적하려면 반복문 시작 전에 total은 얼마여야 할까요?',
          options: [
            { id: 'opt_zero', label: '0 (초기 기준값)', isCorrect: true },
            { id: 'opt_rate', label: 'charge_rate', isCorrect: false },
          ],
          feedback: '맞아요! 누적 변수는 0으로 초기화한 뒤 루프를 시작해야 정확한 합계가 계산됩니다.',
        },
        entryFunction: 'charge_battery_pack',
        starterCode: `def charge_battery_pack(cycle_count, charge_rate):
    # cycle_count회 동안 charge_rate만큼 누적해 보세요.
    pass
`,
        testCases: [
          { inputs: { cycle_count: 5, charge_rate: 10 }, expected: 50 },
          { inputs: { cycle_count: 0, charge_rate: 30 }, expected: 0 },
        ],
      },
    ],
  },
})
