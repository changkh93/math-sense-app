import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_SEQ_COUNT_33 = createCapabilityPrototypeKernel({
  problemId: 'AC-SEQ-COUNT-33',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-3',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'E',
    prerequisites: ['AC-SEQ-005', 'AC-COND-RANGE-15'],
  },
  identity: {
    studentTitle: '정상 캡슐은 몇 개?',
    subtitle: '정상 범위에 포함되는 캡슐을 구분해 그 개수를 셉니다.',
  },
  pythonConcepts: {
    requires: [
      'builtin:list',
      'statement:for',
      'statement:if',
      'operator:and',
      'operator:comparison-bound',
      'operator:comparison-lower-bound',
      'operator:assignment',
      'operator:arithmetic-state-update',
    ],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:filter-accumulate'],
    introduces: [],
  },
  evidenceRecipe: {
    primitives: ['container-scan', 'decision', 'scalar-sequence'],
    requiredClaims: [
      'range-condition-filters-elements',
      'count-increments-by-one-not-value',
      'empty-list-returns-zero-count',
    ],
  },
  modes: {
    observe: {
      prompt: '정상 범위 [0..9]에 속하는 캡슐 [-2, 0, 5, 9, 12]의 개수를 셀 때, 캡슐의 에너지 값을 더해야 할까요 아니면 1씩 세어야 할까요?',
      expected: 'add_one_each',
      options: [
        { value: 'add_one_each', label: '조건에 맞을 때마다 개수를 1씩 더해야 한다 (count = count + 1).' },
        { value: 'add_energy_value', label: '캡슐의 에너지 값 자체(0 + 5 + 9)를 더해야 한다.' },
        { value: 'add_ten', label: '항상 10을 더한다.' },
      ],
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🧪 정상 범위 캡슐 개수 측정실',
          description: 'capsules = [-2, 0, 5, 9, 12], 정상 범위 [0, 9]에서 조건 만족 여부와 count 변화를 추적합니다.',
          variables: [
            { name: 'count', value: '0', label: '조건 만족 캡슐 수' },
          ],
          guidance: '양쪽 경계값(0과 9)을 포함하여 1씩 증가하는 과정을 확인하세요.',
        },
        initialState: { current: null, in_range: null, count: 0 },
        initialStateLabel: '시작: count = 0',
        initialStepTitle: '🚀 시작 (count 초기화)',
        initialPrompt: '정상 캡슐의 개수를 세기 위해 count를 0으로 초기화합니다.',
        frames: [
          {
            id: 'scan_neg2',
            stepTitle: '① 첫 번째 캡슐 -2 검사',
            operationLabel: '-2 in [0..9] -> False',
            codeSnippet: 'if min_energy <= e <= max_energy:  # -2는 범위 밖',
            prompt: '-2는 0보다 작으므로 조건을 만족하지 않아 count가 0으로 유지됩니다.',
            stateAfter: { current: -2, in_range: false, count: 0 },
          },
          {
            id: 'scan_0',
            stepTitle: '② 두 번째 캡슐 0 검사 (하한 경계)',
            operationLabel: '0 in [0..9] -> True (count + 1)',
            codeSnippet: 'if min_energy <= e <= max_energy:\n    count = count + 1  # 1로 증가',
            prompt: '0은 하한 min_energy(0)를 포함하므로 조건 만족! count가 1로 증가합니다.',
            stateAfter: { current: 0, in_range: true, count: 1 },
          },
          {
            id: 'scan_5',
            stepTitle: '③ 세 번째 캡슐 5 검사',
            operationLabel: '5 in [0..9] -> True (count + 1)',
            codeSnippet: 'count = count + 1  # 2로 증가',
            prompt: '5는 범위 내부이므로 조건 만족! count가 2로 증가합니다.',
            stateAfter: { current: 5, in_range: true, count: 2 },
          },
          {
            id: 'scan_9',
            stepTitle: '④ 네 번째 캡슐 9 검사 (상한 경계)',
            operationLabel: '9 in [0..9] -> True (count + 1)',
            codeSnippet: 'count = count + 1  # 3으로 증가',
            prompt: '9는 상한 max_energy(9)를 포함하므로 조건 만족! count가 3으로 증가합니다.',
            stateAfter: { current: 9, in_range: true, count: 3 },
          },
          {
            id: 'scan_12',
            stepTitle: '⑤ 다섯 번째 캡슐 12 검사',
            operationLabel: '12 in [0..9] -> False',
            codeSnippet: '# 12는 9 초과 -> 유지',
            prompt: '12는 9보다 크므로 조건 불만족, count는 3으로 유지됩니다.',
            stateAfter: { current: 12, in_range: false, count: 3 },
          },
        ],
        predictionPrompt: '정상 캡슐의 총 개수(3)를 반환하세요.',
        rulePrompt: '구간 필터 개수 누적 규칙',
        ruleStatement: '조건 min_energy <= e <= max_energy를 만족할 때마다 count를 1씩 증가시키며, 에너지 값의 합(14)이 아닌 개수(3)를 반환합니다.',
      },
    },
    code: {
      entryFunction: 'count_normal_capsules',
      starterCode: `def count_normal_capsules(capsules, min_energy, max_energy):
    # min_energy <= energy <= max_energy 인 정상 캡슐의 개수를 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { capsules: [-2, 0, 5, 9, 12], min_energy: 0, max_energy: 9 }, expected: 3 },
      { inputs: { capsules: [10, 20, 30], min_energy: 10, max_energy: 25 }, expected: 2 },
      { inputs: { capsules: [], min_energy: -5, max_energy: 5 }, expected: 0 },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_seq_count_33_1',
        title: '★★ 구간 경계와 개수 누적의 차이',
        type: 'trace_understanding',
        prompt: 'capsules = [-2, 0, 5, 9, 12], min_energy = 0, max_energy = 9 일 때 개수 누적 과정을 확인하세요.',
        codeSnippet: `def count_normal_capsules(capsules, min_energy, max_energy):
    count = 0
    for e in capsules:
        if min_energy <= e <= max_energy:
            count = count + 1
    return count`,
        questions: [
          {
            id: 'q1',
            text: '0과 9처럼 min_energy, max_energy와 정확히 같은 경계값도 count에 포함될까요?',
            options: [
              { value: 'inclusive', label: '포함된다 (<= 이므로 양쪽 경계값을 포함하여 count가 증가)' },
              { value: 'exclusive', label: '경계값은 제외된다' },
            ],
            expected: 'inclusive',
          },
          {
            id: 'q2',
            text: '조건을 만족하는 캡슐 [0, 5, 9]의 합(14)과 개수(3) 중 이 함수가 반환해야 하는 것은?',
            options: [
              { value: 'count_val', label: '개수인 3 (count = count + 1)' },
              { value: 'sum_val', label: '합인 14 (total = total + e)' },
            ],
            expected: 'count_val',
          },
          {
            id: 'q3',
            text: '빈 리스트 capsules = []가 주어졌을 때 반환 결과는 무엇일까요?',
            options: [
              { value: 'zero_empty', label: '0 (루프를 돌지 않고 초기 count 0 반환)' },
              { value: 'none_empty', label: 'None' },
              { value: 'error_empty', label: '에러 발생' },
            ],
            expected: 'zero_empty',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_seq_count_33_t1',
        title: '위험 수치 경보 개수 측정',
        description: '센서 측정값 리스트(readings)에서 경보 기준값(alert_threshold) 이상(>=)인 위험 수치의 개수를 반환하세요.',
        contextCard: {
          title: '📋 단일 하한 경보 개수 측정 흐름',
          steps: [
            { label: '아직 경보 없음', text: '아무 측정값도 보기 전의 경보 개수에서 시작하세요.' },
            { label: '경보 대상 구분', text: '측정값이 경보 기준에 닿거나 넘어섰는지 확인하세요.' },
            { label: '개수 기록', text: '경보 대상 하나를 찾을 때마다 결과에 한 번 기록하세요.' },
          ],
        },
        thoughtCheck: {
          prompt: '범위 조건 대신 단일 하한(>=) 조건으로 바뀔 때 누적하는 방식은 어떻게 될까요?',
          options: [
            { id: 'opt_count_one', label: '조건만 reading >= threshold 로 바뀌고 개수는 똑같이 1씩 센다', isCorrect: true },
            { id: 'opt_add_reading', label: 'reading 값을 직접 더한다', isCorrect: false },
          ],
          feedback: '맞아요! 조건의 형태만 바뀌었을 뿐, 조건 통과 시 1을 더하는 filter-accumulate 패턴은 동일합니다.',
        },
        entryFunction: 'count_alerts',
        starterCode: `def count_alerts(readings, alert_threshold):
    # reading >= alert_threshold 인 위험 측정값의 개수를 반환하세요.
    pass
`,
        testCases: [
          { inputs: { readings: [70, 85, 60, 95], alert_threshold: 80 }, expected: 2 },
          { inputs: { readings: [50, 40], alert_threshold: 60 }, expected: 0 },
        ],
      },
    ],
  },
})
