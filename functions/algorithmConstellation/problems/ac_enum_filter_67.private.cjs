/**
 * AC-ENUM-FILTER-67 Private Problem Definition
 */
module.exports = {
  problemId: 'AC-ENUM-FILTER-67',
  problemVersion: 1,
  entryFunction: 'count_mission_sets',
  // §4.6: 도메인 1..6 (8항목은 단일 테스트만으로 31,343 step — fixture 예산 초과).
  // 6항목 1건 기준 약 7,800 step으로 여유.
  officialSolutionCode: `def count_mission_sets(durations, time_limit):
    limit = 1
    for duration in durations:
        limit = limit * 2
    valid = 0
    for mask in range(limit):
        total = 0
        remaining = mask
        for duration in durations:
            if remaining % 2 == 1:
                total = total + duration
            remaining = remaining // 2
        if mask > 0 and total <= time_limit:
            valid = valid + 1
    return valid
`,
  intendedWrongFixtures: [
    {
      // 빈 묶음까지 세는 오개념.
      id: 'FILTER-COUNTS-EMPTY-SET',
      expectedFailingGroup: 'all-fit',
      code: `def count_mission_sets(durations, time_limit):
    limit = 1
    for duration in durations:
        limit = limit * 2
    valid = 0
    for mask in range(limit):
        total = 0
        remaining = mask
        for duration in durations:
            if remaining % 2 == 1:
                total = total + duration
            remaining = remaining // 2
        if total <= time_limit:
            valid = valid + 1
    return valid
`,
    },
    {
      // 한도와 같은 후보를 "<"로 제외하는 오개념.
      id: 'FILTER-USES-STRICT-LESS',
      expectedFailingGroup: 'boundary-exact',
      code: `def count_mission_sets(durations, time_limit):
    limit = 1
    for duration in durations:
        limit = limit * 2
    valid = 0
    for mask in range(limit):
        total = 0
        remaining = mask
        for duration in durations:
            if remaining % 2 == 1:
                total = total + duration
            remaining = remaining // 2
        if mask > 0 and total < time_limit:
            valid = valid + 1
    return valid
`,
    },
    {
      // 부분집합을 만들지 않고 개별 임무만 검사하는 오개념.
      id: 'FILTER-SINGLE-ITEMS-ONLY',
      expectedFailingGroup: 'mixed-fit',
      code: `def count_mission_sets(durations, time_limit):
    valid = 0
    for duration in durations:
        if duration <= time_limit:
            valid = valid + 1
    return valid
`,
    },
    {
      // 같은 묶음을 순서를 바꾼 조합으로 중복 계산하는 오개념.
      id: 'FILTER-COUNTS-PERMUTATIONS',
      expectedFailingGroup: 'all-fit',
      code: `def count_mission_sets(durations, time_limit):
    limit = 1
    for duration in durations:
        limit = limit * 2
    valid = 0
    for mask in range(limit):
        total = 0
        remaining = mask
        item_count = 0
        for duration in durations:
            if remaining % 2 == 1:
                total = total + duration
                item_count = item_count + 1
            remaining = remaining // 2
        if mask > 0 and total <= time_limit:
            valid = valid + 1
            if item_count > 1:
                valid = valid + 1
    return valid
`,
    },
  ],
  hiddenTests: [
    // 모든 묶음이 한도 안: 2^3 - 1 = 7.
    { inputs: { durations: [2, 2, 2], time_limit: 60 }, expected: 7, group: 'all-fit' },
    // 아무 묶음도 한도 안에 못 든다.
    { inputs: { durations: [30, 30], time_limit: 10 }, expected: 0, group: 'none-fit' },
    // 한도와 정확히 같은 묶음 포함: "<" 오답을 기각한다.
    { inputs: { durations: [5, 10], time_limit: 15 }, expected: 3, group: 'boundary-exact' },
    // 임무 하나.
    { inputs: { durations: [7], time_limit: 7 }, expected: 1, group: 'single-mission' },
    // 일부만 가능한 혼합.
    { inputs: { durations: [4, 9, 2], time_limit: 10 }, expected: 4, group: 'mixed-fit' },
    // 여섯 항목: §4.6 규칙상 최대 1건의 최대 크기 테스트.
    { inputs: { durations: [1, 1, 1, 1, 1, 1], time_limit: 3 }, expected: 41, group: 'six-missions' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_enum_067_1',
      title: '열거 후 필터 이해',
      prompt: '묶음을 만들고 조건으로 거르는 원리를 점검하세요.',
      questions: [
        {
          id: 'q1',
          text: '빈 묶음을 개수에서 제외하는 이유는 무엇일까요?',
          options: [
            { value: 'empty_not_a_mission', label: '아무 임무도 하지 않는 묶음은 임무 조합이 아니기 때문에' },
            { value: 'always_over_limit', label: '빈 묶음은 항상 한도를 넘기 때문에' },
          ],
          expected: 'empty_not_a_mission',
        },
        {
          id: 'q2',
          text: '한도와 총 시간이 정확히 같은 묶음은 어떻게 처리할까요?',
          options: [
            { value: 'count_exact', label: '한도 "이하"이므로 유효한 묶음으로 센다' },
            { value: 'exclude_exact', label: '한도를 꽉 채웠으므로 제외한다' },
          ],
          expected: 'count_exact',
        },
        {
          id: 'q3',
          text: '묶음을 만드는 단계와 조건을 판정하는 단계를 나누면 좋은 이유는 무엇일까요?',
          options: [
            { value: 'clear_two_steps', label: '모든 후보를 놓치지 않고 만든 뒤 판정하면 조건이 복잡해도 실수가 줄기 때문에' },
            { value: 'no_reason', label: '나눠도 달라지는 것이 없기 때문에' },
          ],
          expected: 'clear_two_steps',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_enum_067_transfer_1',
      title: '무게 제한 안의 화물 묶음',
      description: '화물 무게 목록(weights)에서 묶음의 총 무게가 제한(weight_limit) 이하인 비어 있지 않은 묶음의 개수를 세어 반환합니다.',
      entryFunction: 'count_cargo_bundles',
      starterCode: `def count_cargo_bundles(weights, weight_limit):
    # 제한 이하로 실을 수 있는 비어 있지 않은 묶음의 개수를 반환하세요.
    pass
`,
      officialSolutionCode: `def count_cargo_bundles(weights, weight_limit):
    limit = 1
    for weight in weights:
        limit = limit * 2
    valid = 0
    for mask in range(limit):
        total = 0
        remaining = mask
        for weight in weights:
            if remaining % 2 == 1:
                total = total + weight
            remaining = remaining // 2
        if mask > 0 and total <= weight_limit:
            valid = valid + 1
    return valid
`,
      contextCard: {
        title: '📦 화물 묶음 필터 전략',
        strategyGuide: '모든 묶음을 선택 상태로 만들어 본 뒤, 비어 있지 않고 총 무게가 제한 이하인 묶음만 센다.',
      },
      thoughtCheck: {
        question: '화물 [3, 4]와 제한 7이면 유효한 묶음은 모두 몇 개일까요?',
        options: [
          { value: 'three', label: '3개 — 3, 4, 그리고 7(정확히 제한)' },
          { value: 'two', label: '2개 — 꽉 찬 묶음은 제외한다' },
        ],
        expected: 'three',
      },
      testCases: [
        { inputs: { weights: [2, 2, 2], weight_limit: 6 }, expected: 7 },
        { inputs: { weights: [10, 10, 10], weight_limit: 5 }, expected: 0 },
        { inputs: { weights: [6, 1], weight_limit: 7 }, expected: 3 },
        { inputs: { weights: [3, 5, 2, 8], weight_limit: 10 }, expected: 9 },
      ],
    },
  ],
}
