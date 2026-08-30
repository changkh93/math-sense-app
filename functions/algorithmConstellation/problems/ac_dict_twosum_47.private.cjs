/**
 * AC-DICT-TWOSUM-47 Private Problem Definition
 */
module.exports = {
  problemId: 'AC-DICT-TWOSUM-47',
  problemVersion: 1,
  entryFunction: 'has_energy_pair',
  officialSolutionCode: `def has_energy_pair(energies, target):
    for i in range(len(energies)):
        needed = target - energies[i]
        if needed in energies[i + 1:]:
            return True
    return False
`,
  alternativeSolutions: [
    `def has_energy_pair(energies, target):
    i = 0
    while i < len(energies):
        req = target - energies[i]
        rest = energies[i + 1:]
        if req in rest:
            return True
        i = i + 1
    return False
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'PAIR-REUSES-SAME-CAPSULE',
      expectedFailingGroup: 'single-self-reuse',
      code: `def has_energy_pair(energies, target):
    for energy in energies:
        needed = target - energy
        if needed in energies:
            return True
    return False
`,
    },
    {
      id: 'PAIR-ADJACENT-ONLY',
      expectedFailingGroup: 'separated-pair',
      code: `def has_energy_pair(energies, target):
    for i in range(len(energies) - 1):
        if energies[i] + energies[i + 1] == target:
            return True
    return False
`,
    },
    {
      id: 'PAIR-FIRST-CAPSULE-ONLY',
      expectedFailingGroup: 'later-pair',
      code: `def has_energy_pair(energies, target):
    if not energies:
        return False
    first = energies[0]
    needed = target - first
    return needed in energies[1:]
`,
    },
    {
      id: 'PAIR-RETURNS-SUM',
      expectedFailingGroup: 'duplicate-values',
      code: `def has_energy_pair(energies, target):
    for i in range(len(energies)):
        needed = target - energies[i]
        if needed in energies[i + 1:]:
            return target
    return 0
`,
    },
  ],
  hiddenTests: [
    { inputs: { energies: [4, 1, 8, 6], target: 10 }, expected: true, group: 'separated-pair' },
    { inputs: { energies: [5, 5], target: 10 }, expected: true, group: 'duplicate-values' },
    { inputs: { energies: [5], target: 10 }, expected: false, group: 'single-self-reuse' },
    { inputs: { energies: [40, 3, 7], target: 10 }, expected: true, group: 'later-pair' },
    { inputs: { energies: [-5, 15, 0], target: 10 }, expected: true, group: 'zero-and-negative' },
    { inputs: { energies: [1, 2, 3], target: 10 }, expected: false, group: 'no-pair' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_dict_047_1',
      title: '필요한 짝 계산과 뒤쪽 탐색 이해',
      prompt: '목표 합을 이루는 두 캡슐을 찾을 때 필요한 원리를 확인하세요.',
      questions: [
        {
          id: 'q1',
          text: '목표 합이 target이고 현재 캡슐의 에너지가 energy일 때, needed = target - energy가 의미하는 것은 무엇일까요?',
          options: [
            { value: 'needed_pair', label: '현재 캡슐과 더해서 target을 만들기 위해 필요한 짝의 에너지' },
            { value: 'difference', label: '두 캡슐 에너지의 단순 차이' },
          ],
          expected: 'needed_pair',
        },
        {
          id: 'q2',
          text: '필요한 짝을 전체 목록이 아니라 현재 위치 뒤쪽 목록에서만 찾는 이유는 무엇일까요?',
          options: [
            { value: 'prevent_self_reuse', label: '현재 위치의 캡슐을 혼자서 두 번 재사용하는 오류를 막기 위해' },
            { value: 'increase_speed', label: '목록의 길이를 늘리기 위해' },
          ],
          expected: 'prevent_self_reuse',
        },
        {
          id: 'q3',
          text: '에너지 목록이 [5] 하나이고 목표가 10일 때, 정답이 False인 이유는 무엇일까요?',
          options: [
            { value: 'distinct_capsules_required', label: '서로 다른 위치의 두 캡슐이 필요한데 5가 하나뿐이어서' },
            { value: 'wrong_target', label: '10은 홀수여서' },
          ],
          expected: 'distinct_capsules_required',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_dict_047_transfer_1',
      title: '제한 무게를 맞추는 두 화물',
      description: '화물 무게 목록(weights)에서 서로 다른 두 화물의 무게 합이 목표 적재량(capacity)과 일치하는지 판정합니다.',
      entryFunction: 'has_cargo_pair',
      starterCode: `def has_cargo_pair(weights, capacity):\n    # 서로 다른 두 화물의 무게 합이 capacity가 되는지 판정하세요.\n    pass\n`,
      officialSolutionCode: `def has_cargo_pair(weights, capacity):
    for i in range(len(weights)):
        req = capacity - weights[i]
        if req in weights[i + 1:]:
            return True
    return False
`,
      contextCard: {
        title: '⚖️ 두 화물 조합 전략',
        strategyGuide: '각 화물마다 필요한 무게(capacity - weight)를 계산하고, 뒤쪽 화물 목록에 있는지 확인합니다.',
      },
      thoughtCheck: {
        question: '무게 목록 [10, 20, 30]에서 용량이 50일 때 조합이 가능할까요?',
        options: [
          { value: 'possible_50', label: '가능하다 (20과 30의 합이 50)' },
          { value: 'impossible_50', label: '불가능하다' },
        ],
        expected: 'possible_50',
      },
      testCases: [
        { inputs: { weights: [5, 12, 15, 8], capacity: 20 }, expected: true },
        { inputs: { weights: [10, 10], capacity: 20 }, expected: true },
        { inputs: { weights: [10], capacity: 20 }, expected: false },
        { inputs: { weights: [50, 4, 6], capacity: 10 }, expected: true },
        { inputs: { weights: [-2, 12, 5], capacity: 10 }, expected: true },
      ],
    },
  ],
}
