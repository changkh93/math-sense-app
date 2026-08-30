import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_SEQ_ADJACENT_34 = createCapabilityPrototypeKernel({
  problemId: 'AC-SEQ-ADJACENT-34',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-3',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'E',
    prerequisites: ['AC-SEQ-MINMAX-32', 'AC-EXP-SWAP-04'],
  },
  identity: {
    studentTitle: '어제보다 세진 신호',
    subtitle: '연속한 두 신호를 차례로 비교해 강해진 순간을 셉니다.',
  },
  pythonConcepts: {
    requires: [
      'builtin:list',
      'statement:for',
      'statement:if',
      'operator:comparison-lower-bound',
      'operator:assignment',
      'operator:arithmetic-state-update',
    ],
    introduces: [],
  },
  thinkingPatterns: {
    requires: [
      'pattern:first-item-initialization',
      'pattern:preserve-before-overwrite',
    ],
    introduces: [],
  },
  evidenceRecipe: {
    primitives: ['container-scan', 'decision', 'scalar-sequence'],
    requiredClaims: [
      'first-element-initializes-previous',
      'compare-before-updating-previous',
      'equal-adjacent-values-not-increasing',
    ],
  },
  modes: {
    observe: {
      prompt: '신호 리스트 [3, 5, 4, 7]에서 이전 값과 현재 값을 비교할 때, 비교하기 전에 previous = current 로 값을 덮어쓰면 어떤 일이 일어날까요?',
      expected: 'comparison_lost',
      options: [
        { value: 'comparison_lost', label: '항상 current == previous가 되어 증가 여부를 전혀 비교할 수 없게 된다.' },
        { value: 'correct_compare', label: '더 정확하게 증가 여부를 판별한다.' },
        { value: 'speed_up', label: '계산 속도가 2배 빨라진다.' },
      ],
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '📈 인접 신호 증가 횟수 추적실',
          description: 'signals = [3, 5, 4, 4, 7]에서 previous와 current의 비교, count 갱신, previous 업데이트 순서를 추적합니다.',
          variables: [
            { name: 'previous', value: '3', label: '직전 신호 값' },
            { name: 'increases', value: '0', label: '증가한 횟수' },
          ],
          guidance: '첫 번째 값(3)은 비교 대상이 없으며, 비교한 후에 previous를 갱신해야 합니다.',
        },
        initialState: { current: null, previous: null, is_increased: null, increases: 0 },
        initialStateLabel: '시작: previous = signals[0], increases = 0',
        initialStepTitle: '🚀 시작 (첫 값 초기화)',
        initialPrompt: '첫 번째 신호 3으로 previous를 초기화하고 increases를 0으로 시작합니다.',
        frames: [
          {
            id: 'scan_3',
            stepTitle: '① 첫 번째 신호 3 (시작점)',
            operationLabel: '3 == previous -> 첫 값은 증가 아님',
            codeSnippet: 'previous = signals[0]\nincreases = 0',
            prompt: '첫 번째 값 3은 이전 값이 자기 자신이므로 증가하지 않고 previous가 3으로 유지됩니다.',
            stateAfter: { current: 3, previous: 3, is_increased: false, increases: 0 },
          },
          {
            id: 'scan_5',
            stepTitle: '② 두 번째 신호 5 검사',
            operationLabel: '5 > 3 -> True (increases + 1, prev -> 5)',
            codeSnippet: 'if current > previous:\n    increases = increases + 1\nprevious = current',
            prompt: '5는 이전 값(3)보다 크므로 증가! increases가 1이 되고 previous가 5로 갱신됩니다.',
            stateAfter: { current: 5, previous: 5, is_increased: true, increases: 1 },
          },
          {
            id: 'scan_4',
            stepTitle: '③ 세 번째 신호 4 검사',
            operationLabel: '4 > 5 -> False (prev -> 4)',
            codeSnippet: '# 4는 5보다 작음 -> 유지 후 prev=4',
            prompt: '4는 이전 값(5)보다 작으므로 증가하지 않고 previous만 4로 갱신됩니다.',
            stateAfter: { current: 4, previous: 4, is_increased: false, increases: 1 },
          },
          {
            id: 'scan_4_again',
            stepTitle: '④ 네 번째 신호 4 검사 (동일 값)',
            operationLabel: '4 > 4 -> False (prev -> 4)',
            codeSnippet: '# 같은 값은 증가 아님 -> 유지',
            prompt: '4는 이전 값(4)과 같으므로 증가가 아닙니다! increases는 1로 유지됩니다.',
            stateAfter: { current: 4, previous: 4, is_increased: false, increases: 1 },
          },
          {
            id: 'scan_7',
            stepTitle: '⑤ 다섯 번째 신호 7 검사',
            operationLabel: '7 > 4 -> True (increases + 1, prev -> 7)',
            codeSnippet: 'increases = increases + 1\nprevious = current',
            prompt: '7은 이전 값(4)보다 크므로 증가! 최종 increases는 2가 됩니다.',
            stateAfter: { current: 7, previous: 7, is_increased: true, increases: 2 },
          },
        ],
        predictionPrompt: '신호가 이전보다 커진 총 횟수(2)를 반환하세요.',
        rulePrompt: '인접 원소 비교 및 상태 갱신 규칙',
        ruleStatement: '비교(if current > previous)를 먼저 수행하여 count를 올린 후에만 previous = current로 덮어써야 안전합니다.',
      },
    },
    code: {
      entryFunction: 'count_signal_increases',
      starterCode: `def count_signal_increases(signals):
    # 바로 이전 신호보다 커진 횟수를 반환하세요.
    # signals에는 하나 이상의 정수가 주어집니다.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { signals: [3, 5, 4, 7] }, expected: 2 },
      { inputs: { signals: [5] }, expected: 0 },
      { inputs: { signals: [2, 2, 2] }, expected: 0 },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_seq_adjacent_34_1',
        title: '★★ 인접 비교와 덮어쓰기 순서 원리',
        type: 'trace_understanding',
        prompt: '신호 리스트 [3, 5, 4, 4, 7]에서 인접 비교 과정을 확인하세요.',
        codeSnippet: `def count_signal_increases(signals):
    previous = signals[0]
    increases = 0
    for current in signals:
        if current > previous:
            increases = increases + 1
        previous = current
    return increases`,
        questions: [
          {
            id: 'q1',
            text: 'if current > previous 비교 전에 previous = current 를 먼저 실행하면 어떤 문제가 생길까요?',
            options: [
              { value: 'prev_overwritten', label: '비교할 때 항상 current == previous가 되어 증가 횟수가 항상 0이 된다' },
              { value: 'double_count', label: '모든 숫자가 2번씩 카운트된다' },
            ],
            expected: 'prev_overwritten',
          },
          {
            id: 'q2',
            text: '[4, 4]처럼 바로 이전 값과 같은 값이 연속으로 나오면 증가 횟수에 포함될까요?',
            options: [
              { value: 'equal_not_increase', label: '포함되지 않는다 (strictly greater > 일 때만 증가)' },
              { value: 'equal_is_increase', label: '포함된다' },
            ],
            expected: 'equal_not_increase',
          },
          {
            id: 'q3',
            text: '원소가 1개인 signals = [5]의 증가 횟수가 0인 이유는 무엇일까요?',
            options: [
              { value: 'no_previous_element', label: '비교할 이전 원소가 없으므로 증가가 발생할 수 없기 때문' },
              { value: 'zero_is_error', label: '에러가 발생해야 하기 때문' },
            ],
            expected: 'no_previous_element',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_seq_adjacent_34_t1',
        title: '기온 하강 횟수 측정',
        description: '기온 측정값 리스트(readings, 길이 1 이상)에서 바로 이전 측정값보다 기온이 낮아진(current < previous) 횟수를 반환하세요.',
        contextCard: {
          title: '📋 기온 하강 횟수 측정 흐름',
          steps: [
            { label: '첫 기준 기억', text: '첫 측정값을 다음 값과 비교할 기준으로 기억하세요.' },
            { label: '먼저 비교', text: '현재 측정값이 바로 전 측정값보다 낮아졌는지 먼저 살펴보세요.' },
            { label: '그다음 이동', text: '판단과 기록을 마친 뒤 현재 값을 다음 비교의 기준으로 옮기세요.' },
          ],
        },
        thoughtCheck: {
          prompt: '증가 횟수에서 하강 횟수로 바뀔 때 변경해야 하는 핵심 부분은 어디일까요?',
          options: [
            { id: 'opt_cond_less', label: '비교 조건만 current < previous (하강)로 바꾼다', isCorrect: true },
            { id: 'opt_prev_init', label: 'previous를 0으로 바꾼다', isCorrect: false },
          ],
          feedback: '맞아요! 비교 조건만 < 로 바뀌고, 이전값 보존 후 덮어쓰는 구조는 동일합니다.',
        },
        entryFunction: 'count_temperature_drops',
        starterCode: `def count_temperature_drops(readings):
    # 바로 이전 측정값보다 낮아진 횟수를 반환하세요.
    pass
`,
        testCases: [
          { inputs: { readings: [20, 18, 19, 15] }, expected: 2 },
          { inputs: { readings: [10, 12, 14] }, expected: 0 },
        ],
      },
    ],
  },
})
