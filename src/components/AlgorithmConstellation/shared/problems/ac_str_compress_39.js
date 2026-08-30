import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_STR_COMPRESS_39 = createCapabilityPrototypeKernel({
  problemId: 'AC-STR-COMPRESS-39',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-3',
    routeRole: 'branch',
    learningRole: 'review',
    recommendedBand: 'E',
    prerequisites: [
      'AC-SEQ-ADJACENT-34',
      'AC-SEQ-RUNNING-35',
      'AC-STR-REVERSE-01',
    ],
  },
  identity: {
    studentTitle: '반복 신호 압축기',
    subtitle: '연속으로 이어지는 같은 신호들을 묶어 신호와 연속 횟수의 목록으로 요약합니다.',
  },
  pythonConcepts: {
    requires: [
      'builtin:list',
      'statement:for',
      'statement:if',
      'operator:equality',
      'operator:assignment',
      'operator:arithmetic-state-update',
      'method:append',
      'syntax:slicing',
    ],
    introduces: [],
  },
  thinkingPatterns: {
    requires: [
      'pattern:first-item-initialization',
      'pattern:preserve-before-overwrite',
    ],
    introduces: ['pattern:run-boundary-flush'],
  },
  evidenceRecipe: {
    primitives: ['container-scan', 'ordered-buffer', 'scalar-sequence'],
    requiredClaims: [
      'groups-consecutive-identical-signals',
      'resets-count-on-symbol-boundary',
      'flushes-final-group-after-loop',
    ],
  },
  modes: {
    observe: {
      prompt: '신호 "AABBA"에서 첫 번째 "A" 묶음과 마지막 "A"는 어떻게 다루어야 할까요?',
      expected: 'separate_runs',
      options: [
        { value: 'separate_runs', label: '[["A", 2], ["B", 2], ["A", 1]] (중간에 B로 끊어져 있으므로 별도의 묶음으로 기록한다)' },
        { value: 'merged_runs', label: '[["A", 3], ["B", 2]] (같은 문자이므로 떨어진 곳도 하나의 묶음으로 합친다)' },
        { value: 'flat_chars', label: '["A", "A", "B", "B", "A"] (묶지 않고 그대로 나열한다)' },
      ],
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '📦 연속 신호 압축실',
          description: '신호 "AABBA"를 순회하며 같은 신호가 이어질 때 횟수를 세고, 신호가 바뀔 때 지금까지의 묶음을 결과에 기록합니다.',
          variables: [
            { name: 'current', value: '"A"', label: '현재 신호' },
            { name: 'previous', value: '"A"', label: '이전 신호' },
            { name: 'count', value: '2', label: '연속 횟수' },
            { name: 'groups', value: '[["A", 2]]', label: '압축 묶음 목록' },
          ],
          guidance: '신호가 바뀔 때 이전 묶음이 어떻게 기록되고 새 묶음이 시작되는지 확인하세요.',
        },
        initialState: { current: null, previous: 'A', count: 1, groups: [] },
        initialStateLabel: '시작: 첫 신호 "A", 횟수 1',
        initialStepTitle: '🚀 시작 (첫 신호 기준 초기화)',
        initialPrompt: '첫 번째 신호 "A"로 묶음 측정을 시작합니다.',
        frames: [
          {
            id: 'f1_same_a',
            stepTitle: '① 두 번째 신호 "A" (동일)',
            operationLabel: '같은 신호 → 연속 횟수 2',
            codeSnippet: '# 같은 신호가 이어져 묶음의 횟수를 늘림',
            prompt: '같은 신호 "A"가 이어지므로 연속 횟수를 2로 늘립니다.',
            stateAfter: { current: 'A', previous: 'A', count: 2, groups: [] },
          },
          {
            id: 'f2_diff_b',
            stepTitle: '② 세 번째 신호 "B" (경계 변경)',
            operationLabel: '경계 발견 → ["A", 2] 기록 → B 묶음 시작',
            codeSnippet: '# 신호가 바뀌어 이전 묶음을 기록하고 새 묶음을 시작',
            prompt: '신호가 "B"로 바뀌었습니다! 지금까지 센 ["A", 2]를 기록하고 새 신호 "B", 횟수 1로 시작합니다.',
            stateAfter: { current: 'B', previous: 'B', count: 1, groups: [['A', 2]] },
          },
          {
            id: 'f3_same_b',
            stepTitle: '③ 네 번째 신호 "B" (동일)',
            operationLabel: '같은 신호 → 연속 횟수 2',
            codeSnippet: '# 같은 신호가 이어져 묶음의 횟수를 늘림',
            prompt: '같은 신호 "B"가 이어지므로 연속 횟수를 2로 늘립니다.',
            stateAfter: { current: 'B', previous: 'B', count: 2, groups: [['A', 2]] },
          },
          {
            id: 'f4_diff_a',
            stepTitle: '④ 다섯 번째 신호 "A" (경계 변경)',
            operationLabel: '경계 발견 → ["B", 2] 기록 → A 묶음 시작',
            codeSnippet: '# 신호가 바뀌어 이전 묶음을 기록하고 새 묶음을 시작',
            prompt: '신호가 다시 "A"로 바뀌었습니다! ["B", 2]를 기록하고 새 신호 "A", 횟수 1로 시작합니다.',
            stateAfter: { current: 'A', previous: 'A', count: 1, groups: [['A', 2], ['B', 2]] },
          },
          {
            id: 'f5_flush',
            stepTitle: '⑤ 순회 종료 후 마지막 묶음 기록',
            operationLabel: '탐색 종료 → 마지막 ["A", 1] 기록',
            codeSnippet: '# 경계를 만나지 못한 마지막 묶음도 결과에 기록',
            prompt: '순회가 끝났습니다! 아직 보관 중이던 마지막 묶음 ["A", 1]을 잊지 않고 결과에 추가합니다.',
            stateAfter: { current: null, previous: 'A', count: 1, groups: [['A', 2], ['B', 2], ['A', 1]] },
          },
        ],
        predictionPrompt: '압축 묶음 [["A", 2], ["B", 2], ["A", 1]]을 반환하세요.',
        rulePrompt: '연속 묶음 요약 및 경계 기록 규칙',
        ruleStatement: '같은 신호가 이어지는 동안 횟수를 누적하고, 신호가 바뀌는 경계와 순회 종료 직후에 지금까지의 [신호, 횟수] 묶음을 결과에 기록합니다.',
      },
    },
    code: {
      entryFunction: 'compress_signal_runs',
      starterCode: `def compress_signal_runs(signal):
    # signal에는 한 글자 이상의 대문자 신호가 주어집니다.
    groups = []
    previous = signal[0]
    count = 1

    for current in signal[1:]:
        # 같은 신호가 이어질 때와 바뀔 때 상태를 갱신하세요.
        pass

    # 마지막 묶음을 잊지 말고 기록하세요.
    return groups
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { signal: 'AAABB' }, expected: [['A', 3], ['B', 2]] },
      { inputs: { signal: 'ABBA' }, expected: [['A', 1], ['B', 2], ['A', 1]] },
      { inputs: { signal: 'Z' }, expected: [['Z', 1]] },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_str_compress_39_1',
        title: '★★ 연속 묶음과 전체 빈도의 차이',
        type: 'trace_understanding',
        prompt: '신호 "AABA"를 압축하는 흐름을 확인하세요.',
        questions: [
          {
            id: 'q1',
            text: '신호 "AABA"에서 앞의 A와 맨 뒤의 A를 하나의 묶음으로 합치지 않는 이유는 무엇일까요?',
            options: [
              { value: 'keep_consecutive', label: '전체 개수를 세는 것이 아니라 연속으로 이어진 묶음 단위로 기록하기 때문' },
              { value: 'alphabet_order', label: '알파벳 순서대로 정렬해야 하기 때문' },
            ],
            expected: 'keep_consecutive',
          },
          {
            id: 'q2',
            text: '신호가 바뀌는 순간 새로운 신호로 넘어가기 전에 반드시 먼저 해야 할 일은 무엇일까요?',
            options: [
              { value: 'flush_previous', label: '지금까지 센 이전 신호와 횟수 묶음을 결과 목록에 기록한다' },
              { value: 'clear_all', label: '결과 목록을 비운다' },
            ],
            expected: 'flush_previous',
          },
          {
            id: 'q3',
            text: '모든 신호를 확인한 직후 마지막 묶음을 별도로 한 번 더 기록해야 하는 이유는 무엇일까요?',
            options: [
              { value: 'flush_last', label: '마지막 묶음은 신호가 바뀌는 경계를 만나지 못해 루프 안에서 아직 기록되지 않았기 때문' },
              { value: 'make_even', label: '전체 묶음 개수를 짝수로 맞추기 위해' },
            ],
            expected: 'flush_last',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_str_compress_39_t1',
        title: '온도 센서 연속 구간 요약',
        description: '길이 1 이상의 정수 센서 측정값 리스트(readings)가 주어질 때, 같은 온도가 연속으로 이어진 구간을 [온도, 연속 횟수] 형태의 묶음 목록으로 요약하여 반환하세요.',
        contextCard: {
          title: '📋 연속 구간 요약 사고 흐름',
          steps: [
            { label: '관찰', text: '첫 번째 측정값을 초기 기준값으로 삼고 연속 횟수를 1로 시작합니다.' },
            { label: '구분', text: '새 측정값이 이전 값과 같으면 횟수를 늘리고, 달라지면 이전 구간 묶음을 결과에 기록한 뒤 새 값으로 시작합니다.' },
            { label: '상태 갱신', text: '모든 측정값을 확인한 뒤 마지막 남은 구간 묶음까지 결과 목록에 추가합니다.' },
          ],
        },
        thoughtCheck: {
          prompt: '자료형이 문자열에서 숫자 리스트로 바뀌었을 때 연속 구간을 요약하는 원리는 어떻게 될까요?',
          options: [
            { id: 'opt_same_principle', label: '자료형만 달라졌을 뿐, 이전 값과 비교하며 경계에서 묶음을 기록하고 초기화하는 원리는 완전히 동일하다', isCorrect: true },
            { id: 'opt_diff_principle', label: '숫자는 크기순으로 정렬한 뒤에만 요약할 수 있다', isCorrect: false },
          ],
          feedback: '맞아요! 리스트의 원소들도 이전 항목과의 일치 여부를 대조해 동일한 방식으로 연속 묶음을 압축할 수 있습니다.',
        },
        entryFunction: 'compress_temperature_runs',
        starterCode: `def compress_temperature_runs(readings):
    # readings에는 한 개 이상의 정수가 주어집니다.
    # readings 리스트의 연속된 같은 값들을 [값, 횟수] 묶음 목록으로 요약하세요.
    pass
`,
        testCases: [
          { inputs: { readings: [2, 2, 5, 5, 5, 2] }, expected: [[2, 2], [5, 3], [2, 1]] },
          { inputs: { readings: [10] }, expected: [[10, 1]] },
        ],
      },
    ],
  },
})
