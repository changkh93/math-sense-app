import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_SIM_BELT_55 = createCapabilityPrototypeKernel({
  problemId: 'AC-SIM-BELT-55',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 55,
    constellationId: 'constellation-5',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'N',
    prerequisites: ['AC-SEQ-ROTATE-38'],
  },
  identity: {
    studentTitle: '화물 벨트 한 칸 이동',
    subtitle: '새 화물이 들어오면 맨 끝 화물이 나가고, 나머지는 순서를 유지한 채 한 칸씩 밀려납니다.',
  },
  pythonConcepts: {
    requires: ['builtin:list', 'builtin:range', 'statement:for', 'method:append', 'syntax:slicing'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:boundary-wraparound'],
    introduces: ['pattern:fixed-length-shift'],
  },
  evidenceRecipe: {
    primitives: ['container-scan', 'ordered-buffer', 'decision'],
    requiredClaims: ['FIXED_LENGTH_SHIFT'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '벨트 [10, 20, 30]에 새 화물 5가 들어오면 나가는 화물은 무엇일까요?',
      options: [
        { value: 'last_exits', label: '30 — 맨 끝의 화물이 나간다' },
        { value: 'first_exits', label: '10 — 맨 앞의 화물이 나간다' },
        { value: 'nothing_exits', label: '나가는 화물이 없다' },
      ],
      expected: 'last_exits',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '📦 화물 벨트 관찰판',
          description: '벨트 [10, 20, 30]에 새 화물 5가 들어오는 한 칸 이동을 단계별로 관찰합니다.',
          variables: [
            { name: 'belt', value: '[10, 20, 30]', label: '현재 벨트' },
            { name: 'incoming', value: '5', label: '들어오는 화물' },
            { name: 'lengthRule', value: '이동 후에도 3칸 유지', label: '길이 규칙' },
          ],
          guidance: '유입(앞) - 이동 - 유출(끝)의 흐름과 길이가 유지되는지 확인하세요.',
        },
        initialState: { outgoing: null, newBelt: [] },
        initialStateLabel: '시작: 벨트 [10, 20, 30], 새 화물 5 대기',
        initialStepTitle: '🚀 시작 (3칸 벨트)',
        initialPrompt: '나갈 화물 확인 -> 새 화물을 맨 앞에 놓기 -> 나머지를 순서대로 쌓기.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① 나갈 화물 확인',
            operationLabel: '맨 끝 화물 30이 벨트에서 나감',
            codeSnippet: '# outgoing = belt[-1]',
            prompt: '유출되는 화물은 맨 끝의 30이에요. 이동 전에 먼저 기록해 둡니다.',
            stateAfter: { outgoing: 30, newBelt: [] },
          },
          {
            id: 'f1',
            stepTitle: '② 새 화물을 맨 앞에 놓기',
            operationLabel: '새 화물 5를 새 벨트의 첫 칸에',
            codeSnippet: '# new_belt = [incoming]',
            prompt: '새 벨트는 새 화물 5로 시작합니다.',
            stateAfter: { outgoing: 30, newBelt: [5] },
          },
          {
            id: 'f2',
            stepTitle: '③ 나머지를 순서대로 쌓기',
            operationLabel: '기존 화물 10, 20을 순서대로 추가',
            codeSnippet: '# new_belt = [5, 10, 20]',
            prompt: '맨 끝의 30을 제외한 화물들이 원래 순서대로 뒤에 쌓여요. 길이가 3칸으로 유지됩니다.',
            stateAfter: { outgoing: 30, newBelt: [5, 10, 20] },
          },
          {
            // 한 칸짜리 벨트 독립 실험: 유출과 유입이 같은 칸에서 일어난다.
            id: 'f3_single_slot',
            stepTitle: '④ 새 실험: 한 칸 벨트 [7]에 9가 들어올 때',
            experimentReset: true,
            stateBefore: { outgoing: null, newBelt: [] },
            operationLabel: '나가는 화물 7, 새 벨트는 [9]',
            codeSnippet: '# 새 실험: [7] + 9 -> [7, [9]]',
            prompt: '벨트가 한 칸이면 들어온 9가 유일한 화물이 되고, 있던 7이 바로 나갑니다. 길이는 여전히 1칸이에요.',
            stateAfter: { outgoing: 7, newBelt: [9] },
          },
        ],
        predictionPrompt: '한 칸 이동 뒤 [나간 화물, 새 벨트] 목록을 반환하세요. 새 벨트의 길이는 원래와 같아야 합니다.',
        rulePrompt: '고정 길이 이동 규칙',
        ruleStatement: '맨 끝 항목이 나가고, 새 항목이 맨 앞에 놓이며, 나머지는 상대 순서를 유지한 채 한 칸씩 민다. 길이는 변하지 않는다.',
      },
    },
    code: {
      entryFunction: 'advance_cargo_belt',
      starterCode: `def advance_cargo_belt(belt, incoming):
    # [나간 화물, 새 벨트]를 반환하세요.
    # 새 벨트의 길이는 원래 벨트와 같아야 합니다.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { belt: [10, 20, 30], incoming: 5 }, expected: [30, [5, 10, 20]] },
      { inputs: { belt: [7], incoming: 9 }, expected: [7, [9]] },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_sim_055_1',
        title: '고정 길이 벨트 이동 이해',
        prompt: '벨트의 유입·유출·길이 보존 원리를 점검하세요.',
        questions: [
          {
            id: 'q1',
            text: '벨트에서 나가는 화물은 어느 위치의 화물일까요?',
            options: [
              { value: 'last_exits', label: '맨 끝의 화물 — 새 화물이 앞에서 밀어내므로' },
              { value: 'first_exits', label: '맨 앞의 화물 — 새 화물이 뒤에서 밀어내므로' },
            ],
            expected: 'last_exits',
          },
          {
            id: 'q2',
            text: '한 칸 이동 뒤 벨트 길이가 원래와 같은 이유는 무엇일까요?',
            options: [
              { value: 'in_equals_out', label: '하나가 들어오는 동안 하나가 나가서 들어온 수와 나간 수가 같기 때문에' },
              { value: 'belt_grows', label: '새 화물이 그냥 추가되기 때문에' },
            ],
            expected: 'in_equals_out',
          },
          {
            id: 'q3',
            text: '새 벨트에서 기존 화물들의 상대적 순서는 어떻게 될까요?',
            options: [
              { value: 'order_preserved', label: '원래 순서를 그대로 유지한 채 한 칸씩 뒤로 밀려난다' },
              { value: 'order_reversed', label: '순서가 거꾸로 뒤집힌다' },
            ],
            expected: 'order_preserved',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_sim_055_transfer_1',
        title: '신호 버퍼 전달기',
        description: '고정 길이 신호 버퍼(buffer)에 새 신호(new_signal)가 들어오면 맨 끝 신호가 전달되고, 새 신호가 맨 앞에 놓입니다.',
        entryFunction: 'advance_signal_buffer',
        starterCode: `def advance_signal_buffer(buffer, new_signal):
    # [전달된 신호, 갱신된 버퍼]를 반환하세요.
    pass
`,
        contextCard: {
          title: '📨 신호 버퍼 전달 전략',
          strategyGuide: '버퍼 맨 끝 신호가 전달되고, 새 신호는 맨 앞에 놓이며 나머지 신호는 순서를 유지한 채 한 칸씩 밀려납니다.',
        },
        thoughtCheck: {
          question: '버퍼 [3, 1, 2]에 새 신호 4가 들어오면 전달되는 신호는 무엇일까요?',
          options: [
            { value: 'two_delivered', label: '2 — 맨 끝의 신호가 전달된다' },
            { value: 'three_delivered', label: '3 — 맨 앞의 신호가 전달된다' },
          ],
          expected: 'two_delivered',
        },
        testCases: [
          { inputs: { buffer: ['A', 'B'], new_signal: 'C' }, expected: ['B', ['C', 'A']] },
          { inputs: { buffer: [1], new_signal: 2 }, expected: [1, [2]] },
        ],
      },
    ],
  },
})
