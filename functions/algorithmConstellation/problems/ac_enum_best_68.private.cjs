/**
 * AC-ENUM-BEST-68 Private Problem Definition
 */
module.exports = {
  problemId: 'AC-ENUM-BEST-68',
  problemVersion: 1,
  entryFunction: 'best_equipment_value',
  // §4.6: 도메인 1..6 (8항목은 36,666 step — fixture 예산 초과).
  // 6항목 1건 기준 7,269 step.
  officialSolutionCode: `def best_equipment_value(weights, values, capacity):
    limit = 1
    for weight in weights:
        limit = limit * 2
    best_value = 0
    for mask in range(limit):
        total_weight = 0
        total_value = 0
        remaining = mask
        for i in range(len(weights)):
            if remaining % 2 == 1:
                total_weight = total_weight + weights[i]
                total_value = total_value + values[i]
            remaining = remaining // 2
        if total_weight <= capacity and total_value > best_value:
            best_value = total_value
    return best_value
`,
  intendedWrongFixtures: [
    {
      // 가장 가치 큰 단일 장비만 고려하는 오개념.
      id: 'BEST-SINGLE-BEST-ITEM-ONLY',
      expectedFailingGroup: 'combined-beats-single',
      code: `def best_equipment_value(weights, values, capacity):
    best_value = 0
    for i in range(len(weights)):
        if weights[i] <= capacity and values[i] > best_value:
            best_value = values[i]
    return best_value
`,
    },
    {
      // 한도와 같은 조합을 "<"로 제외하는 오개념.
      id: 'BEST-EXCLUDES-EXACT-CAPACITY',
      expectedFailingGroup: 'exact-capacity',
      code: `def best_equipment_value(weights, values, capacity):
    limit = 1
    for weight in weights:
        limit = limit * 2
    best_value = 0
    for mask in range(limit):
        total_weight = 0
        total_value = 0
        remaining = mask
        for i in range(len(weights)):
            if remaining % 2 == 1:
                total_weight = total_weight + weights[i]
                total_value = total_value + values[i]
            remaining = remaining // 2
        if total_weight < capacity and total_value > best_value:
            best_value = total_value
    return best_value
`,
    },
    {
      // 무게 목록과 가치 목록의 인덱스를 어긋나게 읽는 오개념.
      id: 'BEST-MISMATCHED-INDEX',
      expectedFailingGroup: 'five-items',
      code: `def best_equipment_value(weights, values, capacity):
    limit = 1
    for weight in weights:
        limit = limit * 2
    best_value = 0
    for mask in range(limit):
        total_weight = 0
        total_value = 0
        remaining = mask
        for i in range(len(weights)):
            if remaining % 2 == 1:
                total_weight = total_weight + weights[i]
                total_value = total_value + values[len(values) - 1 - i]
            remaining = remaining // 2
        if total_weight <= capacity and total_value > best_value:
            best_value = total_value
    return best_value
`,
    },
    {
      // 한도를 확인하지 않고 가치만 보고 기록을 갱신하는 오개념.
      id: 'BEST-ACCEPTS-OVER-CAPACITY',
      expectedFailingGroup: 'exact-capacity',
      code: `def best_equipment_value(weights, values, capacity):
    limit = 1
    for weight in weights:
        limit = limit * 2
    best_value = 0
    for mask in range(limit):
        total_value = 0
        remaining = mask
        for i in range(len(weights)):
            if remaining % 2 == 1:
                total_value = total_value + values[i]
            remaining = remaining // 2
        if total_value > best_value:
            best_value = total_value
    return best_value
`,
    },
  ],
  hiddenTests: [
    // 조합이 단일 장비보다 나은 경우.
    { inputs: { weights: [2, 3], values: [10, 20], capacity: 5 }, expected: 30, group: 'combined-beats-single' },
    // 한도와 정확히 같은 조합이 최고: "<" 오답을 기각한다.
    { inputs: { weights: [5, 2], values: [40, 10], capacity: 5 }, expected: 40, group: 'exact-capacity' },
    // 아무것도 담을 수 없으면 0.
    { inputs: { weights: [9, 9], values: [100, 100], capacity: 3 }, expected: 0, group: 'empty-selection-zero' },
    // 가치 0 장비가 섞인 경우.
    { inputs: { weights: [1, 1], values: [0, 50], capacity: 2 }, expected: 50, group: 'zero-value-item' },
    // 다섯 항목.
    { inputs: { weights: [4, 3, 2, 1, 5], values: [20, 15, 10, 5, 30], capacity: 8 }, expected: 45, group: 'five-items' },
    // 여섯 항목: §4.6 규칙상 최대 1건의 최대 크기 테스트.
    { inputs: { weights: [1, 2, 3, 4, 5, 6], values: [10, 20, 30, 40, 50, 60], capacity: 21 }, expected: 210, group: 'six-items' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_enum_068_1',
      title: '최고 기록 갱신 이해',
      prompt: '유효한 조합 중 최고 가치를 기록하는 원리를 점검하세요.',
      questions: [
        {
          id: 'q1',
          text: '한도를 넘는 조합을 만났을 때 최고 기록은 어떻게 될까요?',
          options: [
            { value: 'ignored', label: '그 조합은 무시되고 현재 기록이 유지된다' },
            { value: 'updated_anyway', label: '가치가 크면 한도를 넘어도 기록이 바뀐다' },
          ],
          expected: 'ignored',
        },
        {
          id: 'q2',
          text: '한도와 무게가 정확히 같은 조합은 어떻게 처리할까요?',
          options: [
            { value: 'capacity_inclusive', label: '한도 "이하"이므로 유효한 후보다' },
            { value: 'capacity_exclusive', label: '한도를 꽉 채웠으므로 후보에서 뺀다' },
          ],
          expected: 'capacity_inclusive',
        },
        {
          id: 'q3',
          text: '가장 가치가 큰 장비 하나만 고르는 방법이 항상 틀리는 이유는 무엇일까요?',
          options: [
            { value: 'combo_beats_single', label: '가치가 작은 장비들을 합쳐 담으면 한도 안에서 총 가치가 더 커질 수 있기 때문에' },
            { value: 'single_always_best', label: '하나만 담는 것이 항상 최고라서' },
          ],
          expected: 'combo_beats_single',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_enum_068_transfer_1',
      title: '제한 시간 안의 최고 연구 점수',
      description: '연구 과제의 소요 시간(times)과 점수(scores) 목록에서, 총 시간이 제한(time_limit) 이하인 조합 중 최대 총 점수를 반환합니다.',
      entryFunction: 'best_research_score',
      starterCode: `def best_research_score(times, scores, time_limit):
    # 제한 이하 조합 중 최대 총 점수를 반환하세요.
    pass
`,
      officialSolutionCode: `def best_research_score(times, scores, time_limit):
    limit = 1
    for duration in times:
        limit = limit * 2
    best_score = 0
    for mask in range(limit):
        total_time = 0
        total_score = 0
        remaining = mask
        for i in range(len(times)):
            if remaining % 2 == 1:
                total_time = total_time + times[i]
                total_score = total_score + scores[i]
            remaining = remaining // 2
        if total_time <= time_limit and total_score > best_score:
            best_score = total_score
    return best_score
`,
      contextCard: {
        title: '🔬 연구 점수 최고 기록 전략',
        strategyGuide: '모든 과제 조합을 만들어 보고, 총 시간이 제한 이하인 조합의 총 점수가 현재 최고 기록보다 클 때만 기록을 교체합니다.',
      },
      thoughtCheck: {
        question: '시간 [3, 2], 점수 [30, 40], 제한 5이면 최고 총 점수는 얼마일까요?',
        options: [
          { value: 'seventy', label: '70 — 둘 다 담으면 시간 5로 제한 안에 든다' },
          { value: 'forty', label: '40 — 하나만 담을 수 있다' },
        ],
        expected: 'seventy',
      },
      testCases: [
        { inputs: { times: [2, 3], scores: [10, 20], time_limit: 5 }, expected: 30 },
        { inputs: { times: [5, 2], scores: [40, 10], time_limit: 5 }, expected: 40 },
        { inputs: { times: [1, 1, 1, 1], scores: [10, 20, 30, 40], time_limit: 2 }, expected: 70 },
        { inputs: { times: [4, 3, 2, 1, 5], scores: [20, 15, 10, 5, 30], time_limit: 8 }, expected: 45 },
      ],
    },
  ],
}
