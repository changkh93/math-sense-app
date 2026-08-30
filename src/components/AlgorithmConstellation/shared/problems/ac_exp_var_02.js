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
      lensConfig: {
        introContext: {
          title: '🔍 상태 변화 실험실',
          description: '관제소에서 두 개의 신호 값이 도착했습니다.',
          variables: [
            { name: 'old_level', value: 30, label: '이전 신호 값' },
            { name: 'new_level', value: 70, label: '새 신호 값' },
          ],
          guidance: '이제 이 값들을 차례로 signal 변수에 저장해 보겠습니다. 새 값을 저장할 때 signal이 어떻게 변하는지 관찰해 보세요.',
        },
        initialState: { signal: null },
        initialStateLabel: '아직 signal 변수에 값을 저장하지 않았습니다.',
        initialStepTitle: '🚀 시작 (값 없음)',
        initialPrompt: '먼저 이전 신호 값 old_level(30)을 signal에 저장해 볼까요?',
        frames: [
          {
            id: 'first_assign',
            stepTitle: '① 첫 값 저장',
            operationLabel: 'signal = old_level',
            codeSnippet: 'signal = old_level  # 30 저장',
            prompt: 'old_level에 들어 있던 30이 signal에 저장되었습니다.',
            stateAfter: { signal: 30 },
          },
          {
            id: 'second_assign',
            stepTitle: '② 새 값으로 교체',
            operationLabel: 'signal = new_level',
            codeSnippet: 'signal = new_level  # 70 대입',
            prompt: '새 값을 대입하면서 signal의 이전 값 30은 새 값 70으로 바뀌었습니다.',
            stateAfter: { signal: 70 },
          },
        ],
        predictionPrompt: '신호 값을 차례로 대입하며 변수의 상태 변화를 관찰해 보세요.',
        discoveryQuestion: {
          prompt: '🔎 그럼 signal에 처음에 들어 있던 30은 어디로 갔을까요?',
          options: [
            { id: 'opt_overwritten', label: 'signal에서 30이 사라지고 70으로 덮어써졌다', isCorrect: true },
            { id: 'opt_coexist', label: 'signal 안에 30과 70이 함께 남아 있다', isCorrect: false },
            { id: 'opt_other_var', label: '자동으로 다른 변수에 저장되었다', isCorrect: false },
          ],
          successFeedback: '맞아요! 변수는 오직 가장 마지막에 넣은 하나의 값만 기억합니다. 이전 값(30)이 나중에도 필요하다면, 덮어쓰기 전에 다른 변수(temp)에 미리 보관해야 합니다.',
          wrongFeedback: '변수는 여러 값을 동시에 보관하지 않아요. 새 값을 넣으면 이전 값은 덮어씌워져 사라집니다.',
        },
        rulePrompt: '변수의 대입(=) 규칙',
        ruleStatement: '변수에 새 값을 대입(=)하면 이전 값은 완전히 덮어씌워져 사라지고 오직 새 값 하나만 유지됩니다.',
      },
    },
    code: {
      entryFunction: 'update_signal',
      starterCode: `def update_signal(old_level, new_level):
    # signal 변수에 old_level을 넣은 뒤, new_level로 갱신하여 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { old_level: 30, new_level: 70 }, expected: 70 },
      { inputs: { old_level: 10, new_level: 50 }, expected: 50 },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_var_02_1',
        title: '★★ 30은 언제 사라졌을까?',
        type: 'trace_understanding',
        prompt: '새 값을 저장할 때 변수 안에서 어떤 일이 일어나는지 찾아보세요.',
        codeSnippet: `def update_signal(old_level, new_level):
    signal = old_level    # 1행: old_level (30) 대입
    signal = new_level    # 2행: new_level (70) 대입 (이전 값 덮어쓰기)
    return signal         # 3행: signal 반환`,
        questions: [
          {
            id: 'q1',
            text: 'signal에 들어 있던 30이 더 이상 signal에 남아 있지 않게 되는 순간은 어느 줄일까요?',
            options: [
              { value: 'line2', label: '2행: signal = new_level' },
              { value: 'line1', label: '1행: signal = old_level' },
              { value: 'line3', label: '3행: return signal' },
            ],
            expected: 'line2',
          },
          {
            id: 'q2',
            text: '관제소에서 이전 신호 30도 나중에 필요하다고 합니다. signal = new_level을 실행하기 전에 무엇을 해야 할까요?',
            options: [
              { value: 'backup', label: 'backup = signal (덮어쓰기 전에 다른 변수에 미리 보관한다)' },
              { value: 'overwrite', label: 'signal = new_level (그대로 새 값을 덮어쓴다)' },
              { value: 'reset', label: 'signal = 0 (변수를 0으로 비운다)' },
            ],
            expected: 'backup',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_var_02_t1',
        title: '사라지기 전에 기억하라 — 관제소 재고 보정',
        description: '초기 재고(initial_stock)에 도착한 광석(arrived)을 더한 계산 재고를 구하세요. 이후 실제 확인 재고(verified_stock)로 덮어쓰기 전에 필요한 값을 보관하여, 계산 재고와 실제 확인 재고의 차이(계산 재고 - 실제 확인 재고)를 반환하세요.',
        contextCard: {
          title: '📋 광석 창고 재고 보정 흐름',
          steps: [
            { label: '① 초기 재고', text: 'initial_stock (예: 40)' },
            { label: '② 광석 도착 (+)', text: '계산 재고 = 40 + 15 = 55' },
            { label: '③ 실제 조사값 도착', text: 'verified_stock = 52' },
            { label: '④ 최종 반환값', text: '보정량 = 55 - 52 = 3' },
          ],
        },
        thoughtCheck: {
          prompt: '실제 확인 수량(52)으로 재고 변수를 덮어쓰고 나면, 앞서 계산했던 55는 어떻게 될까요?',
          options: [
            { id: 'opt_lost', label: '변수에서 사라진다 (덮어쓰기 전에 미리 보관해야 한다)', isCorrect: true },
            { id: 'opt_stay', label: '변수 안에 계속 남아 있다', isCorrect: false },
          ],
          feedback: '맞아요! 새 값을 대입하면 이전 계산값(55)은 사라지므로, 차이를 구하려면 덮어쓰기 전에 보존하거나 기억해야 합니다.',
        },
        entryFunction: 'calculate_stock_correction',
        starterCode: `def calculate_stock_correction(initial_stock, arrived, verified_stock):
    # 1. 초기 재고에 도착한 광석을 더해 계산 재고를 구하세요.
    # 2. 계산 재고가 덮어써지기 전에 보관하여, (계산 재고 - 실제 확인 재고)의 차이를 반환하세요.
    pass
`,
        testCases: [
          { inputs: { initial_stock: 40, arrived: 15, verified_stock: 52 }, expected: 3 },
          { inputs: { initial_stock: 100, arrived: 20, verified_stock: 110 }, expected: 10 },
          { inputs: { initial_stock: 30, arrived: 0, verified_stock: 30 }, expected: 0 },
          { inputs: { initial_stock: 50, arrived: 25, verified_stock: 80 }, expected: -5 },
        ],
      },
    ],
  },
})
