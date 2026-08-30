/**
 * Private Problem Definition: AC-SEQ-COUNT-33 (정상 캡슐은 몇 개?)
 */

module.exports = {
  problemId: 'AC-SEQ-COUNT-33',
  problemVersion: 1,
  entryFunction: 'count_normal_capsules',
  officialSolutionCode: `def count_normal_capsules(capsules, min_energy, max_energy):
    count = 0
    for e in capsules:
        if min_energy <= e <= max_energy:
            count = count + 1
    return count
`,
  alternativeSolutions: [
    `def count_normal_capsules(capsules, min_energy, max_energy):
    ans = 0
    for val in capsules:
        if val >= min_energy and val <= max_energy:
            ans += 1
    return ans
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'COUNT-SUM-INSTEAD',
      misconceptionCode: 'SEQ-SUM-INSTEAD-OF-COUNT',
      expectedMisconception: 'SEQ-SUM-INSTEAD-OF-COUNT',
      expectedFailingGroup: 'sum_differs',
      code: `def count_normal_capsules(capsules, min_energy, max_energy):
    total = 0
    for e in capsules:
        if min_energy <= e <= max_energy:
            total = total + e
    return total
`,
    },
    {
      id: 'COUNT-STRICT-BOUNDARY',
      misconceptionCode: 'SEQ-STRICT-INEQUALITY',
      expectedMisconception: 'SEQ-STRICT-INEQUALITY',
      expectedFailingGroup: 'boundary_inclusive',
      code: `def count_normal_capsules(capsules, min_energy, max_energy):
    count = 0
    for e in capsules:
        if min_energy < e < max_energy:
            count = count + 1
    return count
`,
    },
    {
      id: 'COUNT-LOWER-ONLY',
      misconceptionCode: 'SEQ-LOWER-BOUND-ONLY',
      expectedMisconception: 'SEQ-LOWER-BOUND-ONLY',
      expectedFailingGroup: 'upper_exceeded',
      code: `def count_normal_capsules(capsules, min_energy, max_energy):
    count = 0
    for e in capsules:
        if e >= min_energy:
            count = count + 1
    return count
`,
    },
    {
      id: 'COUNT-INIT-ONE',
      misconceptionCode: 'SEQ-INIT-COUNT-ONE',
      expectedMisconception: 'SEQ-INIT-COUNT-ONE',
      expectedFailingGroup: 'no_match',
      code: `def count_normal_capsules(capsules, min_energy, max_energy):
    count = 1
    for e in capsules:
        if min_energy <= e <= max_energy:
            count = count + 1
    return count
`,
    },
  ],
  hiddenTests: [
    { inputs: { capsules: [1, 2, 3, 4], min_energy: 1, max_energy: 4 }, expected: 4, group: 'sum_differs' },
    { inputs: { capsules: [10, 25, 50], min_energy: 10, max_energy: 50 }, expected: 3, group: 'boundary_inclusive' },
    { inputs: { capsules: [5, 15, 25, 35], min_energy: 10, max_energy: 20 }, expected: 1, group: 'upper_exceeded' },
    { inputs: { capsules: [-10, -20, -30], min_energy: 0, max_energy: 50 }, expected: 0, group: 'no_match' },
    { inputs: { capsules: [0, 0, 0], min_energy: 0, max_energy: 0 }, expected: 3, group: 'same_boundary' },
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
  transferMasterSet: [
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
      officialSolutionCode: `def count_alerts(readings, alert_threshold):
    alert_count = 0
    for r in readings:
        if r >= alert_threshold:
            alert_count = alert_count + 1
    return alert_count
`,
      testCases: [
        { inputs: { readings: [10, 20, 30, 40, 50], alert_threshold: 30 }, expected: 3 },
        { inputs: { readings: [100], alert_threshold: 100 }, expected: 1 },
        { inputs: { readings: [5, 10, 15], alert_threshold: 20 }, expected: 0 },
        { inputs: { readings: [], alert_threshold: 10 }, expected: 0 },
      ],
    },
  ],
}
