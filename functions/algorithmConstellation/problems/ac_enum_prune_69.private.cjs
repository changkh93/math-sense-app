/**
 * AC-ENUM-PRUNE-69 Private Problem Definition
 */
module.exports = {
  problemId: 'AC-ENUM-PRUNE-69',
  problemVersion: 1,
  entryFunction: 'pruned_pair_scan',
  // break 없이 플래그 기반으로 가지치기한다(조건형: if not skip). 실행 검증 완료
  // ([1,2,8,9], 5 -> [1, 4], 130 step).
  officialSolutionCode: `def pruned_pair_scan(sorted_values, limit):
    n = len(sorted_values)
    count = 0
    checks = 0
    for i in range(n):
        skip = False
        for j in range(i + 1, n):
            if not skip:
                checks = checks + 1
                if sorted_values[i] + sorted_values[j] > limit:
                    skip = True
                else:
                    count = count + 1
    return [count, checks]
`,
  intendedWrongFixtures: [
    {
      // 가지치기 없이 모든 짝을 확인하는 오개념.
      id: 'PRUNE-NEVER-SKIPS',
      expectedFailingGroup: 'prunes-mid-row',
      code: `def pruned_pair_scan(sorted_values, limit):
    n = len(sorted_values)
    count = 0
    checks = 0
    for i in range(n):
        for j in range(i + 1, n):
            checks = checks + 1
            if sorted_values[i] + sorted_values[j] <= limit:
                count = count + 1
    return [count, checks]
`,
    },
    {
      // 처음 초과한 짝을 checks에 세지 않고 바로 건너뛰는 오개념.
      id: 'PRUNE-SKIPS-BEFORE-CHECK',
      expectedFailingGroup: 'prunes-mid-row',
      code: `def pruned_pair_scan(sorted_values, limit):
    n = len(sorted_values)
    count = 0
    checks = 0
    for i in range(n):
        skip = False
        for j in range(i + 1, n):
            if not skip:
                if sorted_values[i] + sorted_values[j] <= limit:
                    count = count + 1
                else:
                    skip = True
    return [count, checks]
`,
    },
    {
      // 유효 여부와 무관하게 확인 횟수를 개수로 잘못 반환하는 오개념.
      id: 'PRUNE-COUNTS-INVALID-PAIRS',
      expectedFailingGroup: 'all-pruned',
      code: `def pruned_pair_scan(sorted_values, limit):
    n = len(sorted_values)
    total = 0
    for i in range(n):
        skip = False
        for j in range(i + 1, n):
            if not skip:
                total = total + 1
                if sorted_values[i] + sorted_values[j] > limit:
                    skip = True
    return [total, total]
`,
    },
    {
      // 개수만 반환하고 확인 횟수를 생략하는 오개념.
      id: 'PRUNE-RETURNS-COUNT-ONLY',
      expectedFailingGroup: 'empty-list',
      code: `def pruned_pair_scan(sorted_values, limit):
    n = len(sorted_values)
    count = 0
    for i in range(n):
        skip = False
        for j in range(i + 1, n):
            if not skip:
                if sorted_values[i] + sorted_values[j] > limit:
                    skip = True
                else:
                    count = count + 1
    return count
`,
    },
  ],
  hiddenTests: [
    // 빈 목록: 둘 다 0.
    { inputs: { sorted_values: [], limit: 5 }, expected: [0, 0], group: 'empty-list' },
    // 한 항목: 짝이 없다.
    { inputs: { sorted_values: [4], limit: 5 }, expected: [0, 0], group: 'single-item' },
    // 가지치기가 전혀 발동하지 않는 경우.
    { inputs: { sorted_values: [1, 2, 3], limit: 100 }, expected: [3, 3], group: 'no-pruning-needed' },
    // 모든 짝이 초과: 초과 확인만 2회.
    { inputs: { sorted_values: [5, 6, 7], limit: 5 }, expected: [0, 2], group: 'all-pruned' },
    // 중간에서 가지치기가 발동: 스킵 누수 오답을 가른다.
    { inputs: { sorted_values: [1, 2, 5, 6, 7], limit: 4 }, expected: [1, 5], group: 'prunes-mid-row' },
    // 두 항목 기본형.
    { inputs: { sorted_values: [2, 3], limit: 10 }, expected: [1, 1], group: 'two-items' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_enum_069_1',
      title: '단조 가지치기 이해',
      prompt: '정렬된 정보로 확인 횟수를 줄이는 원리를 점검하세요.',
      questions: [
        {
          id: 'q1',
          text: '짝의 합이 처음 한도를 넘은 뒤의 짝도 반드시 초과하는 이유는 무엇일까요?',
          options: [
            { value: 'sorted_monotone', label: '값이 정렬되어 있어 뒤쪽 값이 같거나 크므로 합도 같거나 커지기 때문에' },
            { value: 'lucky_order', label: '우연히 뒤의 값이 작아서' },
          ],
          expected: 'sorted_monotone',
        },
        {
          id: 'q2',
          text: '처음으로 한도를 초과한 짝도 checks에 포함하는 이유는 무엇일까요?',
          options: [
            { value: 'checked_once', label: '초과인지 알아내기 위해 그 짝은 실제로 확인했기 때문에' },
            { value: 'never_checked', label: '확인한 적이 없기 때문에' },
          ],
          expected: 'checked_once',
        },
        {
          id: 'q3',
          text: '가지치기가 올바르게 동작했는지 검증하는 방법은 무엇일까요?',
          options: [
            { value: 'checks_in_result', label: '반환값의 확인 횟수(checks)가 줄어든 만큼 실제로 건너뛰었는지 비교한다' },
            { value: 'huge_input_timeout', label: '거대한 입력으로 시간이 초과되는지 본다' },
          ],
          expected: 'checks_in_result',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_enum_069_transfer_1',
      title: '정렬된 배송 무게의 허용 짝',
      description: '오름차순으로 정렬된 배송 무게(sorted_weights)에서 두 무게의 합이 허용 한도(limit) 이하인 짝의 수와, 가지치기로 실제 확인한 짝 수를 반환합니다.',
      entryFunction: 'pruned_weight_scan',
      starterCode: `def pruned_weight_scan(sorted_weights, limit):
    # [한도 이하인 짝 수, 실제로 확인한 짝 수]를 반환하세요.
    pass
`,
      officialSolutionCode: `def pruned_weight_scan(sorted_weights, limit):
    n = len(sorted_weights)
    count = 0
    checks = 0
    for i in range(n):
        skip = False
        for j in range(i + 1, n):
            if not skip:
                checks = checks + 1
                if sorted_weights[i] + sorted_weights[j] > limit:
                    skip = True
                else:
                    count = count + 1
    return [count, checks]
`,
      contextCard: {
        title: '⚖️ 무게 짝 가지치기 전략',
        strategyGuide: '정렬된 무게에서 짝의 합이 처음 한도를 넘은 순간 표시하고, 표시 뒤의 짝은 확인하지 않습니다. 처음 초과한 짝도 확인 횟수에 포함됩니다.',
      },
      thoughtCheck: {
        question: '무게 [2, 3, 8]에서 한도 5일 때 확인 횟수는 몇일까요?',
        options: [
          { value: 'three', label: '3회 — (2,3) 확인, (2,8) 초과 확인 후 스킵, (3,8) 확인' },
          { value: 'two', label: '2회 — 초과한 짝은 세지 않는다' },
        ],
        expected: 'three',
      },
      testCases: [
        { inputs: { sorted_weights: [1, 2, 3, 4], limit: 100 }, expected: [6, 6] },
        { inputs: { sorted_weights: [7], limit: 3 }, expected: [0, 0] },
        { inputs: { sorted_weights: [1, 1, 1], limit: 2 }, expected: [3, 3] },
        { inputs: { sorted_weights: [2, 5, 6, 9], limit: 7 }, expected: [1, 4] },
      ],
    },
  ],
}
