import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_SEQ_RUNNING_35 = createCapabilityPrototypeKernel({
  problemId: 'AC-SEQ-RUNNING-35',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-3',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'E',
    prerequisites: ['AC-SEQ-005'],
  },
  identity: {
    studentTitle: '항해 일지의 누적 에너지',
    subtitle: '에너지 변화량을 차례로 반영하며 매 시점의 누적 에너지를 일지 목록에 기록합니다.',
  },
  pythonConcepts: {
    requires: [
      'builtin:list',
      'statement:for',
      'operator:assignment',
      'operator:arithmetic-state-update',
    ],
    introduces: ['method:append'],
  },
  thinkingPatterns: {
    requires: [],
    introduces: ['pattern:running-prefix-state'],
  },
  evidenceRecipe: {
    primitives: ['container-scan', 'ordered-buffer', 'scalar-sequence'],
    requiredClaims: [
      'prefix-state-accumulates-step-by-step',
      'each-running-state-appended-to-journal',
      'negative-changes-reduce-running-state',
      'empty-changes-yields-empty-journal',
    ],
  },
  modes: {
    observe: {
      prompt: '에너지 변화량 [4, -2, 3]이 주어질 때, 각 단계 직후의 누적 에너지 기록은 어떻게 변할까요?',
      expected: 'seq_4_2_5',
      options: [
        { value: 'seq_4_2_5', label: '4 -> 2 -> 5 (각 시점의 누적값이 차례로 [4, 2, 5]로 기록된다)' },
        { value: 'final_only', label: '최종 결과 5만 하나의 숫자로 기록된다' },
        { value: 'raw_inputs', label: '누적되지 않고 입력값 그대로 [4, -2, 3]이 된다' },
      ],
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '📓 항해 에너지 누적 일지실',
          description: '변화량 리스트 [4, -2, 3]을 순회하며 매 시점의 total과 journal 리스트의 성장을 관찰합니다.',
          variables: [
            { name: 'total', value: '0', label: '현재 누적 에너지' },
            { name: 'journal', value: '[]', label: '누적 일지 리스트' },
          ],
          guidance: '각 변화량을 더한 뒤, 그 시점의 total 값을 journal에 추가하는 순서를 확인하세요.',
        },
        initialState: { current: null, total: 0, journal: [] },
        initialStateLabel: '시작: total = 0, journal = []',
        initialStepTitle: '🚀 시작 (빈 일지 준비)',
        initialPrompt: '누적 에너지를 0으로, 일지 목록을 빈 리스트 []로 초기화합니다.',
        frames: [
          {
            id: 'step_4',
            stepTitle: '① 첫 번째 변화량 4 반영',
            operationLabel: 'total = 0 + 4 = 4 -> journal에 4 기록',
            codeSnippet: '# 변화량을 반영한 뒤 현재 누적값을 일지 맨 뒤에 기록',
            prompt: '4를 더해 total이 4가 되고, journal에 [4]가 기록됩니다.',
            stateAfter: { current: 4, total: 4, journal: [4] },
          },
          {
            id: 'step_neg2',
            stepTitle: '② 두 번째 변화량 -2 반영',
            operationLabel: 'total = 4 + (-2) = 2 -> journal에 2 기록',
            codeSnippet: '# 변화량을 반영한 뒤 현재 누적값을 일지 맨 뒤에 기록',
            prompt: '-2를 더해 total이 2로 줄어들고, journal에 [4, 2]가 기록됩니다.',
            stateAfter: { current: -2, total: 2, journal: [4, 2] },
          },
          {
            id: 'step_3',
            stepTitle: '③ 세 번째 변화량 3 반영',
            operationLabel: 'total = 2 + 3 = 5 -> journal에 5 기록',
            codeSnippet: '# 변화량을 반영한 뒤 현재 누적값을 일지 맨 뒤에 기록',
            prompt: '3을 더해 total이 5가 되고, journal에 [4, 2, 5]가 완성됩니다.',
            stateAfter: { current: 3, total: 5, journal: [4, 2, 5] },
          },
        ],
        predictionPrompt: '최종 누적 일지 리스트 [4, 2, 5]를 반환하세요.',
        rulePrompt: '누적 상태 리스트 기록 규칙',
        ruleStatement: '루프를 돌며 상태 변수를 갱신한 직후 그 시점의 상태를 결과 리스트에 덧붙이면 전체 변화 과정이 담긴 일지가 완성됩니다.',
      },
    },
    code: {
      entryFunction: 'build_energy_journal',
      starterCode: `def build_energy_journal(changes):
    # changes의 각 변화량을 차례로 반영하며
    # 매 시점의 누적 에너지를 담은 리스트를 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { changes: [3, -1, 4] }, expected: [3, 2, 6] },
      { inputs: { changes: [5] }, expected: [5] },
      { inputs: { changes: [10, -10] }, expected: [10, 0] },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_seq_running_35_1',
        title: '★★ 매 순간 상태 기록과 단일 합산의 차이',
        type: 'trace_understanding',
        prompt: 'changes = [4, -2, 3]에서 누적합 리스트를 만드는 과정을 확인하세요.',
        codeSnippet: `def build_energy_journal(changes):
    journal = []
    total = 0
    for delta in changes:
        total = total + delta
        journal.append(total)
    return journal`,
        questions: [
          {
            id: 'q1',
            text: '중간에 음수 변화량(-2)을 만나면 그 시점의 journal 항목은 어떻게 될까요?',
            options: [
              { value: 'decreases', label: '직전 누적값에서 감소한 값이 기록된다 (4 -> 2)' },
              { value: 'ignored', label: '음수는 무시되고 4가 유지된다' },
              { value: 'resets', label: '0으로 초기화된다' },
            ],
            expected: 'decreases',
          },
          {
            id: 'q2',
            text: '반환되는 journal 리스트의 원소 개수는 입력 changes 리스트의 원소 개수와 어떤 관계일까요?',
            options: [
              { value: 'same_length', label: '매 원소마다 하나씩 append되므로 길이가 항상 같다' },
              { value: 'always_one', label: '최종 합 하나이므로 항상 길이가 1이다' },
            ],
            expected: 'same_length',
          },
          {
            id: 'q3',
            text: 'changes = [] 빈 리스트가 주어지면 반환값은 무엇일까요?',
            options: [
              { value: 'empty_list', label: '[] (빈 리스트)' },
              { value: 'zero_val', label: '0' },
              { value: 'none_val', label: 'None' },
            ],
            expected: 'empty_list',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_seq_running_35_t1',
        title: '탐사 로버 위치 일지 작성',
        description: '로버의 1차원 이동량 리스트(moves)가 주어질 때, 0번 지점에서 출발하여 매 이동 직후의 위치를 담은 일지 리스트를 반환하세요.',
        contextCard: {
          title: '📋 이동 위치 일지 작성 흐름',
          steps: [
            { label: '관찰', text: '출발 위치 0에서 시작하여 빈 일지를 준비합니다.' },
            { label: '구분', text: '각 이동량을 차례로 반영하여 현재 위치를 갱신합니다.' },
            { label: '상태 갱신', text: '이동 직후의 위치를 일지 목록의 맨 뒤에 차례로 기록합니다.' },
          ],
        },
        thoughtCheck: {
          prompt: '이동 직후의 위치를 일지에 기록하는 시점은 언제여야 할까요?',
          options: [
            { id: 'opt_after_update', label: '현재 위치에 이동량을 반영한 직후', isCorrect: true },
            { id: 'opt_before_update', label: '이동량을 반영하기 직전', isCorrect: false },
          ],
          feedback: '맞아요! 이동이 반영된 후의 새로운 위치를 일지에 차례로 덧붙여야 정확한 이동 궤적이 기록됩니다.',
        },
        entryFunction: 'build_position_log',
        starterCode: `def build_position_log(moves):
    # 매 이동 직후의 위치를 담은 리스트를 반환하세요.
    pass
`,
        testCases: [
          { inputs: { moves: [2, 5, -3] }, expected: [2, 7, 4] },
          { inputs: { moves: [-10] }, expected: [-10] },
        ],
      },
    ],
  },
})
