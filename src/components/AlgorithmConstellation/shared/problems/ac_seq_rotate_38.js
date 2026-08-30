import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_SEQ_ROTATE_38 = createCapabilityPrototypeKernel({
  problemId: 'AC-SEQ-ROTATE-38',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-3',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'E',
    prerequisites: ['AC-SEQ-RUNNING-35', 'AC-STR-REVERSE-01'],
  },
  identity: {
    studentTitle: '화물 한 칸씩 밀기',
    subtitle: '리스트의 마지막 화물을 맨 앞으로 보내고 나머지 순서를 유지하여 오른쪽으로 한 칸 회전합니다.',
  },
  pythonConcepts: {
    requires: [
      'builtin:list',
      'statement:for',
      'operator:assignment',
      'method:append',
      'syntax:slicing',
    ],
    introduces: [],
  },
  thinkingPatterns: {
    requires: [],
    introduces: ['pattern:boundary-wraparound'],
  },
  evidenceRecipe: {
    primitives: ['container-scan', 'ordered-buffer', 'scalar-sequence'],
    requiredClaims: [
      'last-element-wraps-to-front',
      'remaining-elements-preserve-order',
      'single-element-remains-identical',
    ],
  },
  modes: {
    observe: {
      prompt: '화물 리스트 ["A", "B", "C", "D"]를 오른쪽으로 한 칸 밀었을 때 올바른 결과는 무엇일까요?',
      expected: 'rot_D_A_B_C',
      options: [
        { value: 'rot_D_A_B_C', label: '["D", "A", "B", "C"] (마지막 D가 맨 앞으로 오고 나머지는 순서 유지)' },
        { value: 'rev_D_C_B_A', label: '["D", "C", "B", "A"] (전체가 완전히 뒤집힌다)' },
        { value: 'rot_left', label: '["B", "C", "D", "A"] (왼쪽으로 한 칸 밀린다)' },
      ],
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🔄 화물 오른쪽 회전실',
          description: '화물 리스트 [10, 20, 30, 40]에서 마지막 항목 40을 분리하여 맨 앞에 배치하고 나머지를 이어 붙입니다.',
          variables: [
            { name: 'lastCargo', value: '40', label: '경계 화물' },
            { name: 'restCargos', value: '[10, 20, 30]', label: '나머지 화물' },
            { name: 'rotated', value: '[40, 10, 20, 30]', label: '회전된 리스트' },
          ],
          guidance: '마지막 경계 항목만 이동하고 나머지 항목들의 순서는 그대로 보존되는지 확인하세요.',
        },
        initialState: { lastCargo: null, restCargos: null, rotated: [] },
        initialStateLabel: '시작: 원본 [10, 20, 30, 40]',
        initialStepTitle: '🚀 시작 (경계 화물 분리)',
        initialPrompt: '화물 [10, 20, 30, 40]의 마지막 항목 40을 확인합니다.',
        frames: [
          {
            id: 'isolate_last',
            stepTitle: '① 마지막 화물 40 분리',
            operationLabel: 'lastCargo = cargos[-1] -> 40',
            codeSnippet: 'last_cargo = cargos[-1]  # 40',
            prompt: '맨 끝에 있던 40을 따로 기억해 둡니다.',
            stateAfter: { lastCargo: 40, restCargos: null, rotated: [40] },
          },
          {
            id: 'slice_rest',
            stepTitle: '② 앞부분 화물 [10, 20, 30] 슬라이싱',
            operationLabel: 'restCargos = cargos[:-1]',
            codeSnippet: 'rest_cargos = cargos[:-1]  # [10, 20, 30]',
            prompt: '40을 제외한 앞부분 화물 [10, 20, 30]의 순서를 그대로 유지합니다.',
            stateAfter: { lastCargo: 40, restCargos: [10, 20, 30], rotated: [40] },
          },
          {
            id: 'combine',
            stepTitle: '③ [40] + [10, 20, 30] 결합',
            operationLabel: 'rotated = [40] + [10, 20, 30]',
            codeSnippet: 'for cargo in rest_cargos:\n    rotated.append(cargo)',
            prompt: '경계 화물 40 뒤에 나머지 화물들을 덧붙여 [40, 10, 20, 30]을 완성합니다.',
            stateAfter: { lastCargo: 40, restCargos: [10, 20, 30], rotated: [40, 10, 20, 30] },
          },
        ],
        predictionPrompt: '오른쪽으로 회전된 리스트 [40, 10, 20, 30]을 반환하세요.',
        rulePrompt: '경계 이동 및 상대 순서 보존 규칙',
        ruleStatement: '마지막 경계 항목을 맨 앞에 두고, 나머지 앞쪽 항목들을 원래 순서대로 이어 붙이면 오른쪽 1칸 회전이 완성됩니다.',
      },
    },
    code: {
      entryFunction: 'rotate_cargo_right',
      starterCode: `def rotate_cargo_right(cargos):
    # cargos 리스트를 오른쪽으로 한 칸 회전한 새 리스트를 반환하세요.
    # (길이 1 이상의 리스트가 주어집니다)
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { cargos: [1, 2, 3, 4] }, expected: [4, 1, 2, 3] },
      { inputs: { cargos: [7] }, expected: [7] },
      { inputs: { cargos: [2, 2, 5] }, expected: [5, 2, 2] },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_seq_rotate_38_1',
        title: '★★ 회전과 단순 역순의 차이',
        type: 'trace_understanding',
        prompt: 'cargos = [1, 2, 3, 4]를 오른쪽으로 1칸 회전하는 과정을 확인하세요.',
        codeSnippet: `def rotate_cargo_right(cargos):
    rotated = [cargos[-1]]
    for cargo in cargos[:-1]:
        rotated.append(cargo)
    return rotated`,
        questions: [
          {
            id: 'q1',
            text: '회전 후 결과 리스트의 길이는 원래 리스트의 길이와 비교하여 어떨까요?',
            options: [
              { value: 'same_length', label: '원소가 유실되지 않고 위치만 바뀌므로 항상 같다' },
              { value: 'smaller', label: '하나 줄어든다' },
              { value: 'larger', label: '하나 늘어난다' },
            ],
            expected: 'same_length',
          },
          {
            id: 'q2',
            text: '[1, 2, 3, 4]를 회전했을 때 [4, 3, 2, 1]이 아니라 [4, 1, 2, 3]이 되는 이유는 무엇일까요?',
            options: [
              { value: 'relative_order_kept', label: '마지막 원소 4만 맨 앞으로 가고 나머지 [1, 2, 3]의 상대적 순서는 그대로 유지되기 때문' },
              { value: 'random_sort', label: '무작위로 섞이기 때문' },
            ],
            expected: 'relative_order_kept',
          },
          {
            id: 'q3',
            text: '원소가 1개인 cargos = [7]을 회전하면 어떤 결과가 나올까요?',
            options: [
              { value: 'single_seven', label: '[7] (1개인 리스트는 회전해도 변하지 않는다)' },
              { value: 'empty_res', label: '[]' },
            ],
            expected: 'single_seven',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_seq_rotate_38_t1',
        title: '신호 왼쪽 한 칸 회전',
        description: '신호 리스트 signals(길이 1 이상)가 주어질 때, 맨 앞의 신호를 맨 뒤로 보내 왼쪽으로 한 칸 회전한 새 리스트를 반환하세요.',
        contextCard: {
          title: '📋 왼쪽 회전 변환 흐름',
          steps: [
            { label: '관찰', text: '맨 앞의 첫 번째 신호를 경계 신호로 분리합니다.' },
            { label: '구분', text: '첫 신호를 제외한 나머지 신호들의 순서를 그대로 유지합니다.' },
            { label: '상태 갱신', text: '나머지 신호들 뒤에 첫 신호를 덧붙여 왼쪽 회전 리스트를 완성합니다.' },
          ],
        },
        thoughtCheck: {
          prompt: '오른쪽 회전에서 왼쪽 회전으로 바뀔 때 경계 항목의 위치는 어떻게 될까요?',
          options: [
            { id: 'opt_first_to_last', label: '첫 번째 항목을 분리하여 나머지 항목들 뒤에 보낸다', isCorrect: true },
            { id: 'opt_last_to_first', label: '마지막 항목을 앞으로 보낸다', isCorrect: false },
          ],
          feedback: '맞아요! 왼쪽으로 밀어낼 때는 맨 앞의 원소가 맨 뒤로 이동합니다.',
        },
        entryFunction: 'rotate_signal_left',
        starterCode: `def rotate_signal_left(signals):
    # signals 리스트를 왼쪽으로 한 칸 회전한 새 리스트를 반환하세요.
    pass
`,
        testCases: [
          { inputs: { signals: [10, 20, 30, 40] }, expected: [20, 30, 40, 10] },
          { inputs: { signals: [5] }, expected: [5] },
        ],
      },
    ],
  },
})
