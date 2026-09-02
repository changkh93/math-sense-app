import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_EXP_STEP_03 = createCapabilityPrototypeKernel({
  problemId: 'AC-EXP-STEP-03',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-0',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'E',
    prerequisites: ['AC-EXP-VAR-02'],
  },
  identity: {
    studentTitle: '빠진 명령 한 장',
    subtitle: '연속된 절차를 분해하고 앞뒤 상태를 연결하는 누락된 명령을 찾아 올바른 순서로 조립합니다.',
  },
  pythonConcepts: {
    requires: [
      'concept:function-body-focus',
      'operator:assignment',
      'operator:arithmetic-state-update',
    ],
    introduces: [],
  },
  thinkingPatterns: {
    requires: [],
    introduces: ['pattern:procedure-decomposition'],
  },
  evidenceRecipe: {
    primitives: ['scalar-sequence'],
    requiredClaims: ['procedural-decomposition-and-assembly'],
  },
  modes: {
    observe: {
      prompt: '초기 에너지 2에서 충전(+3) 후 누락된 명령(×4)을 거쳐 방어막(-5)을 켰을 때 최종 에너지는 얼마일까요?',
      expected: '15',
      options: ['15', '0', '20', '5'],
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🔍 탐사선 에너지 조립 실험실',
          description: '탐사선 출격을 위해 [1단계 충전(+charge) ➔ 2단계 부스트 증폭(×boost) ➔ 3단계 방어막 가동(-shield)] 절차를 차례대로 조립해야 합니다.',
          variables: [
            { name: 'initial_energy', value: 2, label: '초기 에너지' },
            { name: 'charge', value: 3, label: '충전량(+3)' },
            { name: 'boost', value: 4, label: '증폭 배수(×4)' },
            { name: 'shield', value: 5, label: '방어막 소모(-5)' },
          ],
          guidance: '각 단계마다 에너지가 어떻게 전이되는지 관찰하고, 1단계와 3단계 사이에 누락된 2단계(부스트 증폭) 명령을 찾아 올바르게 연결해 보세요.',
        },
        initialState: { energy: 2 },
        initialStateLabel: '초기 에너지(initial_energy = 2)가 공급되었습니다.',
        initialStepTitle: '🚀 시작 (초기 2)',
        initialPrompt: '먼저 1단계: 에너지 충전(+charge)을 실행해 볼까요?',
        frames: [
          {
            id: 'step_1_charge',
            stepTitle: '① 에너지 충전 (+3)',
            operationLabel: 'energy = energy + charge',
            codeSnippet: 'energy = energy + charge  # 2 + 3 = 5',
            prompt: '충전(charge=3)이 완료되어 에너지가 2에서 5로 증가했습니다. 이제 2단계에서 부스트 배수(boost=4)를 적용할 차례입니다.',
            stateAfter: { energy: 5 },
          },
          {
            id: 'missing_boost',
            stepTitle: '② 부스트 증폭 (×4) [빠진 명령]',
            operationLabel: 'energy = energy * boost',
            codeSnippet: 'energy = energy * boost  # 5 * 4 = 20',
            prompt: '부스트 증폭 명령(energy = energy * boost)이 성공적으로 연결되어 에너지가 5에서 20(5 × 4)으로 4배 증폭되었습니다!',
            choiceTitle: '🎯 2단계 미션: 빠진 부스트 증폭 명령 선택',
            choicePrompt: '1단계 충전 결과(energy = 5)에 부스트(boost = 4)를 적용하여 에너지를 20으로 만들 올바른 명령을 선택하세요.',
            choiceHint: '💡 힌트: 앞 단계의 계산 결과인 energy(5)에 boost(4)를 곱해 20으로 갱신해야 하므로 energy = energy * boost 명령이 필요합니다.',
            operationOptions: [
              {
                id: 'multiply_boost',
                label: 'energy = energy * boost',
                stateAfter: { energy: 20 },
                feedback: '정답입니다! 1단계 결과(5)에 boost(4)를 곱해 20으로 올바르게 연결됩니다.',
              },
              {
                id: 'add_shield',
                label: 'energy = energy + shield',
                stateAfter: { energy: 10 },
                feedback: '아쉬워요! shield를 더하면 5 + 5 = 10이 되어 부스트 증폭 목표(20)에 도달하지 못합니다.',
              },
              {
                id: 'reset_energy',
                label: 'energy = 0',
                stateAfter: { energy: 0 },
                feedback: '에너지를 0으로 초기화하면 탐사선 가동이 중단됩니다.',
              },
            ],
            expectedOptionId: 'multiply_boost',
            stateAfter: { energy: 20 },
          },
          {
            id: 'step_3_shield',
            stepTitle: '③ 방어막 가동 (-5)',
            operationLabel: 'energy = energy - shield',
            codeSnippet: 'energy = energy - shield  # 20 - 5 = 15',
            prompt: '마지막으로 방어막(shield=5)이 가동되어 최종 에너지가 20에서 15(20 - 5)로 안전하게 안정화되었습니다.',
            stateAfter: { energy: 15 },
          },
        ],
        predictionPrompt: '절차의 각 단계마다 에너지 상태가 어떻게 전이되는지 확인하고 누락된 단계를 찾아보세요.',
        discoveryQuestion: {
          prompt: '🔎 복잡한 프로그램에서 여러 단계의 계산을 올바르게 연결하려면 어떻게 해야 할까요?',
          options: [
            {
              id: 'opt_chain',
              label: '이전 단계의 계산 결과가 저장된 변수(energy)를 다음 단계 연산의 입력으로 이어받아 순서대로 조립한다.',
              isCorrect: true,
            },
            {
              id: 'opt_independent',
              label: '모든 단계가 항상 초기값(2)만을 기준으로 독립적으로 계산되어야 한다.',
              isCorrect: false,
            },
            {
              id: 'opt_random',
              label: '명령의 순서가 뒤바뀌어도 계산 결과는 항상 변하지 않는다.',
              isCorrect: false,
            },
          ],
          successFeedback: '정확합니다! 알고리즘은 앞 단계의 결과 상태를 다음 단계의 시작 상태로 자연스럽게 연결하는 순차적 누적 흐름입니다.',
          wrongFeedback: '이전 단계의 결과가 다음 단계의 입력이 되어야 전체 절차가 하나의 완성된 프로그램으로 동작합니다.',
        },
        rulePrompt: '절차 분해 및 조립의 핵심 규칙',
        ruleStatement: '프로그램은 여러 단계의 작은 명령으로 분해할 수 있으며, 이전 단계의 계산 결과가 다음 단계의 입력 상태가 되도록 올바른 순서로 배치해야 합니다.',
      },
    },
    code: {
      entryFunction: 'assemble_patrol_energy',
      starterCode: `def assemble_patrol_energy(initial_energy, charge, boost, shield):
    energy = initial_energy
    energy = energy + charge
    # 앞뒤 상태를 연결하는 한 명령이 빠져 있어요.
    energy = energy - shield
    return energy
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { initial_energy: 2, charge: 3, boost: 4, shield: 5 }, expected: 15 },
      { inputs: { initial_energy: 10, charge: 5, boost: 2, shield: 6 }, expected: 24 },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_exp_step_03_1',
        title: '★★ 3단계 절차의 상태 예측',
        type: 'trace_understanding',
        prompt: 'initial=2, charge=3, boost=4, shield=5일 때 단계별 실행 결과를 예측해 보세요.',
        codeSnippet: `def assemble_patrol_energy(initial_energy, charge, boost, shield):
    energy = initial_energy
    energy = energy + charge   # 1단계: charge(3) 더하기
    energy = energy * boost    # 2단계: boost(4) 곱하기
    energy = energy - shield   # 3단계: shield(5) 빼기
    return energy`,
        questions: [
          {
            id: 'q1',
            text: '빠진 증폭 명령(energy = energy * boost)까지 정상 실행한 직후의 energy 값은?',
            options: [
              { value: '20', label: '20' },
              { value: '5', label: '5' },
              { value: '15', label: '15' },
            ],
            expected: '20',
          },
          {
            id: 'q2',
            text: '증폭 명령을 빠뜨리고(충전 후 바로 방어막) 실행했을 때 최종 energy 값은?',
            options: [
              { value: '0', label: '0' },
              { value: '15', label: '15' },
              { value: '20', label: '20' },
            ],
            expected: '0',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_exp_step_03_transfer_1',
        title: '신호 센서 보정 시퀀스',
        description: '센서의 초기 신호(raw_signal)에서 잡음을 뺀 뒤(noise), 증폭기(gain)를 곱하고, 보정값(offset)을 더하는 3단계 보정 절차를 완성하세요.',
        contextCard: {
          title: '📋 3단계 신호 센서 보정 흐름',
          steps: [
            { label: '① 잡음 제거 (-)', text: 'signal = raw_signal - noise' },
            { label: '② 신호 증폭 (×)', text: 'signal = signal * gain' },
            { label: '③ 보정값 추가 (+)', text: 'signal = signal + offset' },
          ],
        },
        thoughtCheck: {
          prompt: '3단계 보정 절차에서 이전 단계의 계산 결과는 어디에 저장되어 다음 연산으로 전달되어야 할까요?',
          options: [
            { id: 'opt_var', label: '동일한 signal 변수에 순서대로 갱신하며 누적한다', isCorrect: true },
            { id: 'opt_raw', label: '모든 연산마다 raw_signal을 처음부터 다시 쓴다', isCorrect: false },
          ],
          feedback: '맞아요! 앞 단계의 계산 결과로 갱신된 signal 변수를 계속해서 다음 단계의 입력으로 연결해야 합니다.',
        },
        entryFunction: 'calibrate_scan_signal',
        starterCode: `def calibrate_scan_signal(raw_signal, noise, gain, offset):
    # 1단계(잡음 제거) -> 2단계(증폭) -> 3단계(보정값 추가)를 순서대로 완성하세요.
    pass
`,
        testCases: [
          { inputs: { raw_signal: 10, noise: 2, gain: 3, offset: 4 }, expected: 28 },
          { inputs: { raw_signal: 20, noise: 5, gain: 2, offset: 0 }, expected: 30 },
          { inputs: { raw_signal: 5, noise: 0, gain: 4, offset: 10 }, expected: 30 },
        ],
      },
    ],
  },
})
