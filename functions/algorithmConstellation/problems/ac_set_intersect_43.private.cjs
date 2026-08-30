/**
 * Private Problem Definition: AC-SET-INTERSECT-43 (두 기지가 공통으로 가진 부품)
 */

module.exports = {
  problemId: 'AC-SET-INTERSECT-43',
  problemVersion: 1,
  entryFunction: 'count_common_parts',
  officialSolutionCode: `def count_common_parts(base_a, base_b):
    common = set()
    for part in base_a:
        if part in base_b:
            common.add(part)
    return len(common)
`,
  alternativeSolutions: [
    `def count_common_parts(base_a, base_b):
    common = set()
    for part in base_b:
        if part in base_a:
            common.add(part)
    return len(common)
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'INTERSECTION-COUNTS-DUPLICATES',
      misconceptionCode: 'INTERSECTION-COUNTS-DUPLICATES',
      expectedMisconception: 'INTERSECTION-COUNTS-DUPLICATES',
      expectedFailingGroup: 'duplicate-common-item',
      code: `def count_common_parts(base_a, base_b):
    count = 0
    for part in base_a:
        if part in base_b:
            count = count + 1
    return count
`,
    },
    {
      id: 'INTERSECTION-USES-UNION',
      misconceptionCode: 'INTERSECTION-USES-UNION',
      expectedMisconception: 'INTERSECTION-USES-UNION',
      expectedFailingGroup: 'no-common',
      code: `def count_common_parts(base_a, base_b):
    union_set = set()
    for part in base_a:
        union_set.add(part)
    for part in base_b:
        union_set.add(part)
    return len(union_set)
`,
    },
    {
      id: 'INTERSECTION-FIRST-MATCH-ONLY',
      misconceptionCode: 'INTERSECTION-FIRST-MATCH-ONLY',
      expectedMisconception: 'INTERSECTION-FIRST-MATCH-ONLY',
      expectedFailingGroup: 'all-common',
      code: `def count_common_parts(base_a, base_b):
    for part in base_a:
        if part in base_b:
            return 1
    return 0
`,
    },
    {
      id: 'INTERSECTION-SAME-POSITION-ONLY',
      misconceptionCode: 'INTERSECTION-SAME-POSITION-ONLY',
      expectedMisconception: 'INTERSECTION-SAME-POSITION-ONLY',
      expectedFailingGroup: 'order-independent-count',
      code: `def count_common_parts(base_a, base_b):
    common = set()
    min_len = len(base_a)
    if len(base_b) < min_len:
        min_len = len(base_b)
    for i in range(min_len):
        if base_a[i] == base_b[i]:
            common.add(base_a[i])
    return len(common)
`,
    },
  ],
  hiddenTests: [
    { inputs: { base_a: ['A', 'A', 'B'], base_b: ['A', 'A', 'Z'] }, expected: 1, group: 'duplicate-common-item' },
    { inputs: { base_a: ['K', 'M', 'N'], base_b: ['K', 'M', 'N'] }, expected: 3, group: 'all-common' },
    { inputs: { base_a: ['P', 'Q'], base_b: ['R', 'S'] }, expected: 0, group: 'no-common' },
    { inputs: { base_a: [], base_b: ['T', 'U'] }, expected: 0, group: 'one-side-empty' },
    { inputs: { base_a: ['A', 'B', 'C'], base_b: ['C', 'A', 'X'] }, expected: 2, group: 'order-independent-count' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_set_intersect_43_1',
      title: '★★ 공통 항목 탐색과 교집합 구성',
      type: 'trace_understanding',
      prompt: '두 목록의 공통 항목 수를 구하는 원리를 점검하세요.',
      questions: [
        {
          id: 'q1',
          text: "기지A에 'A'가 2개 있고 기지B에 'A'가 1개 있을 때, 공통 종류 수가 1개로 계산되는 이유는 무엇일까요?",
          options: [
            { value: 'set_dedup', label: '공통 보관함을 집합(Set)으로 관리하여 동일한 부품은 한 번만 세기 때문' },
            { value: 'ignore_first', label: '첫 번째 A를 무시하기 때문' },
          ],
          expected: 'set_dedup',
        },
        {
          id: 'q2',
          text: '기지A와 기지B의 입력 순서를 서로 바꿔서 실행해도 공통 종류 수는 어떻게 될까요?',
          options: [
            { value: 'same_result', label: '공통으로 존재하는 부품의 종류는 순서가 바뀌어도 항상 동일하다' },
            { value: 'different_result', label: '순서에 따라 달라진다' },
          ],
          expected: 'same_result',
        },
        {
          id: 'q3',
          text: '어느 한 기지의 부품 목록이 빈 목록 []이면 공통 부품 수는 얼마일까요?',
          options: [
            { value: 'always_zero', label: '공통으로 존재할 부품이 없으므로 항상 0이다' },
            { value: 'other_len', label: '다른 기지의 전체 부품 수이다' },
          ],
          expected: 'always_zero',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_set_intersect_43_t1',
      title: '팀 공통 배지 종류 수',
      description: '두 탐사팀이 보유한 배지 목록(badges_a, badges_b)에서 두 팀 모두가 보유하고 있는 서로 다른 배지 종류의 수를 반환하세요.',
      contextCard: {
        title: '📋 공통 배지 종류 수 측정 사고 흐름',
        steps: [
          { label: '관찰', text: '두 팀의 배지 목록을 확인합니다.' },
          { label: '구분', text: '첫 번째 팀의 배지를 순회하며 두 번째 팀에도 있는 배지만 고릅니다.' },
          { label: '상태 갱신', text: '공통 집합에 배지를 기록한 뒤 최종 집합 크기를 반환합니다.' },
        ],
      },
      thoughtCheck: {
        prompt: '부품 목록에서 팀 배지 목록으로 도메인이 바뀌었을 때 공통 종류를 세는 원리는 어떻게 될까요?',
        options: [
          { id: 'opt_same_intersect', label: '자료의 의미만 달라졌을 뿐, 두 목록에 모두 존재하는 원소를 집합으로 모아 크기를 재는 원리는 완전히 동일하다', isCorrect: true },
          { id: 'opt_diff_intersect', label: '배지는 공통 개수를 셀 수 없다', isCorrect: false },
        ],
        feedback: '맞아요! 두 집단 사이의 공통 원소를 집합으로 모으면 어떤 도메인이든 고유 공통 종류를 정확히 계산할 수 있습니다.',
      },
      entryFunction: 'count_shared_badges',
      starterCode: `def count_shared_badges(badges_a, badges_b):
    # 두 팀이 공통으로 가진 서로 다른 배지 종류 수를 반환하세요.
    pass
`,
      officialSolutionCode: `def count_shared_badges(badges_a, badges_b):
    common = set()
    for badge in badges_a:
        if badge in badges_b:
            common.add(badge)
    return len(common)
`,
      testCases: [
        { inputs: { badges_a: ['RUBY', 'RUBY', 'SAPPHIRE'], badges_b: ['RUBY', 'DIAMOND'] }, expected: 1 },
        { inputs: { badges_a: ['GOLD', 'SILVER', 'BRONZE'], badges_b: ['BRONZE', 'GOLD', 'SILVER'] }, expected: 3 },
        { inputs: { badges_a: ['A', 'B'], badges_b: ['C', 'D'] }, expected: 0 },
        { inputs: { badges_a: ['A', 'B'], badges_b: [] }, expected: 0 },
      ],
    },
  ],
}
