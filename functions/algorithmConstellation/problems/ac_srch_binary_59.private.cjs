/**
 * AC-SRCH-BINARY-59 Private Problem Definition
 */
module.exports = {
  problemId: 'AC-SRCH-BINARY-59',
  problemVersion: 1,
  entryFunction: 'binary_find_planet',
  officialSolutionCode: `def binary_find_planet(sorted_planets, target):
    low = 0
    high = len(sorted_planets) - 1
    while low <= high:
        mid = (low + high) // 2
        if sorted_planets[mid] == target:
            return mid
        if sorted_planets[mid] > target:
            high = mid - 1
        else:
            low = mid + 1
    return -1
`,
  intendedWrongFixtures: [
    {
      // 가운데 한 번만 확인하고 포기하는 오개념.
      id: 'BINARY-CHECKS-MIDDLE-ONLY',
      expectedFailingGroup: 'last-position',
      code: `def binary_find_planet(sorted_planets, target):
    mid = len(sorted_planets) // 2
    if sorted_planets[mid] == target:
        return mid
    return -1
`,
    },
    {
      // 부등호 방향이 반대인 오개념: 찾을 수 있는 절반을 버린다.
      id: 'BINARY-DISCARDS-WRONG-HALF',
      expectedFailingGroup: 'first-position',
      code: `def binary_find_planet(sorted_planets, target):
    low = 0
    high = len(sorted_planets) - 1
    while low <= high:
        mid = (low + high) // 2
        if sorted_planets[mid] == target:
            return mid
        if sorted_planets[mid] > target:
            low = mid + 1
        else:
            high = mid - 1
    return -1
`,
    },
    {
      // 위치가 아니라 값을 반환하는 오개념.
      id: 'BINARY-RETURNS-VALUE-NOT-INDEX',
      expectedFailingGroup: 'middle-position',
      code: `def binary_find_planet(sorted_planets, target):
    low = 0
    high = len(sorted_planets) - 1
    while low <= high:
        mid = (low + high) // 2
        if sorted_planets[mid] == target:
            return sorted_planets[mid]
        if sorted_planets[mid] > target:
            high = mid - 1
        else:
            low = mid + 1
    return -1
`,
    },
    {
      // high 경계를 검사 범위에서 누락하는 오개념(low < high): 마지막 위치를 못 찾는다.
      id: 'BINARY-EXCLUDES-HIGH-BOUNDARY',
      expectedFailingGroup: 'last-position',
      code: `def binary_find_planet(sorted_planets, target):
    low = 0
    high = len(sorted_planets) - 1
    while low < high:
        mid = (low + high) // 2
        if sorted_planets[mid] == target:
            return mid
        if sorted_planets[mid] > target:
            high = mid - 1
        else:
            low = mid + 1
    return -1
`,
    },
  ],
  hiddenTests: [
    // 빈 목록: low 0, high -1 -> 즉시 -1.
    { inputs: { sorted_planets: [], target: 4 }, expected: -1, group: 'empty-list' },
    // 첫 위치.
    { inputs: { sorted_planets: [1, 3, 5, 7], target: 1 }, expected: 0, group: 'first-position' },
    // 마지막 위치: high 경계 누락 오답을 가른다.
    { inputs: { sorted_planets: [1, 3, 5, 7], target: 7 }, expected: 3, group: 'last-position' },
    // 중간 위치.
    { inputs: { sorted_planets: [10, 20, 30, 40, 50, 60], target: 30 }, expected: 2, group: 'middle-position' },
    // 값들 사이에 없음.
    { inputs: { sorted_planets: [2, 4, 6, 8], target: 5 }, expected: -1, group: 'absent-between-values' },
    // 범위 밖에 없음.
    { inputs: { sorted_planets: [3, 6, 9], target: 12 }, expected: -1, group: 'absent-outside-range' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_srch_059_1',
      title: '절반 축소 탐색 이해',
      prompt: '정렬된 목록에서 절반을 버릴 수 있는 이유와 구간 갱신 원리를 점검하세요.',
      questions: [
        {
          id: 'q1',
          text: '정렬된 목록에서는 가운데 값 하나만 봐도 절반을 버릴 수 있는 이유는 무엇일까요?',
          options: [
            { value: 'order_tells_side', label: '크기 순서대로 줄 서 있어서 가운데보다 작은지 큰지가 어느 쪽에 있는지 알려주기 때문에' },
            { value: 'lucky_guess', label: '가운데 값에 찾는 값이 있을 확률이 높아서' },
          ],
          expected: 'order_tells_side',
        },
        {
          id: 'q2',
          text: '가운데 값이 찾는 값보다 작을 때 low를 mid + 1로 옮기는 이유는 무엇일까요?',
          options: [
            { value: 'exclude_checked_mid', label: '가운데 값은 이미 확인했고 그 왼쪽은 모두 더 작으므로 그 다음 칸부터 남기기 위해' },
            { value: 'include_mid_again', label: '가운데 값을 다시 확인하기 위해' },
          ],
          expected: 'exclude_checked_mid',
        },
        {
          id: 'q3',
          text: '선형 탐색 풀이도 올바른 위치를 반환하면 정답으로 인정되는 이유는 무엇일까요?',
          options: [
            { value: 'behavior_judged', label: '채점은 결과(행동) 기준이라 올바른 답을 내면 방법을 가리지 않기 때문에' },
            { value: 'linear_always_faster', label: '선형 탐색이 항상 더 빠르기 때문에' },
          ],
          expected: 'behavior_judged',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_srch_059_transfer_1',
      title: '정렬된 에너지 코어 탐색',
      description: '오름차순으로 정렬된 에너지 코어 목록(sorted_energy)에서 찾는 값(target)의 위치를 반환하고, 없으면 -1을 반환합니다.',
      entryFunction: 'binary_find_energy',
      starterCode: `def binary_find_energy(sorted_energy, target):
    # 정렬된 목록에서 target의 위치를 반환하고, 없으면 -1을 반환하세요.
    pass
`,
      officialSolutionCode: `def binary_find_energy(sorted_energy, target):
    low = 0
    high = len(sorted_energy) - 1
    while low <= high:
        mid = (low + high) // 2
        if sorted_energy[mid] == target:
            return mid
        if sorted_energy[mid] > target:
            high = mid - 1
        else:
            low = mid + 1
    return -1
`,
      contextCard: {
        title: '⚡ 에너지 축소 탐색 전략',
        strategyGuide: '정렬된 목록의 가운데 값과 비교해 찾는 값이 없는 쪽 절반을 버리고, 남은 구간에서 같은 방법을 되풀이합니다.',
      },
      thoughtCheck: {
        question: '가운데 값이 찾는 값보다 클 때 어느 쪽을 버려야 할까요?',
        options: [
          { value: 'discard_back', label: '뒤쪽 절반 — 찾는 값은 가운데보다 앞쪽에만 있을 수 있다' },
          { value: 'discard_front', label: '앞쪽 절반 — 찾는 값은 가운데보다 뒤쪽에만 있을 수 있다' },
        ],
        expected: 'discard_back',
      },
      testCases: [
        // 첫 위치.
        { inputs: { sorted_energy: [1, 2, 3, 4, 5, 6, 7], target: 1 }, expected: 0 },
        // 마지막 위치.
        { inputs: { sorted_energy: [1, 2, 3, 4, 5, 6, 7], target: 7 }, expected: 6 },
        // 빈 목록.
        { inputs: { sorted_energy: [], target: 3 }, expected: -1 },
        // 범위 사이에 없음.
        { inputs: { sorted_energy: [10, 20], target: 15 }, expected: -1 },
      ],
    },
  ],
}
