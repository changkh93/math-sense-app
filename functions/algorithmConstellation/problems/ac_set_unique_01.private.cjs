/**
 * Server-only Private Problem Definition for AC-SET-UNIQUE-01 (서로 다른 광물은 몇 종?)
 */

module.exports = {
  problemId: 'AC-SET-UNIQUE-01',
  problemVersion: 1,
  entryFunction: 'count_unique_minerals',
  officialSolutionCode: `def count_unique_minerals(minerals):
    kinds = set(minerals)
    return len(kinds)
`,
  alternativeSolutions: [
    `def count_unique_minerals(minerals):
    unique_minerals = set(minerals)
    return len(unique_minerals)
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'SET-RETURNS-TOTAL-LENGTH',
      misconceptionCode: 'SET-RETURNS-TOTAL-LENGTH',
      expectedMisconception: 'SET-RETURNS-TOTAL-LENGTH',
      expectedFailingGroup: 'mixed-duplicates',
      code: `def count_unique_minerals(minerals):
    return len(minerals)
`,
    },
    {
      id: 'SET-ALWAYS-ONE',
      misconceptionCode: 'SET-ALWAYS-ONE',
      expectedMisconception: 'SET-ALWAYS-ONE',
      expectedFailingGroup: 'all-distinct',
      code: `def count_unique_minerals(minerals):
    if len(minerals) == 0:
        return 0
    return 1
`,
    },
    {
      id: 'SET-DROPS-LAST-ITEM',
      misconceptionCode: 'SET-DROPS-LAST-ITEM',
      expectedMisconception: 'SET-DROPS-LAST-ITEM',
      expectedFailingGroup: 'duplicates-separated',
      code: `def count_unique_minerals(minerals):
    if len(minerals) <= 1:
        return len(minerals)
    return len(set(minerals[:-1]))
`,
    },
  ],
  hiddenTests: [
    { inputs: { minerals: ['A', 'B', 'A', 'C', 'B'] }, expected: 3, group: 'mixed-duplicates' },
    { inputs: { minerals: ['X', 'Y', 'Z'] }, expected: 3, group: 'all-distinct' },
    { inputs: { minerals: ['ONE'] }, expected: 1, group: 'single-item' },
    { inputs: { minerals: [] }, expected: 0, group: 'empty-list' },
    { inputs: { minerals: ['A', 'B', 'A', 'C'] }, expected: 3, group: 'duplicates-separated' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_set_041_1',
      title: '★★ 집합의 중복 제거와 크기 측정',
      type: 'trace_understanding',
      prompt: '광물 목록에서 고유한 종류를 세는 원리를 점검하세요.',
      questions: [
        {
          id: 'q1',
          text: "minerals = ['철', '철', '얼음', '철', '수정']일 때 집합으로 모은 뒤 측정한 종류 수는 얼마일까요?",
          options: [
            { value: '3', label: '3개' },
            { value: '5', label: '5개' },
          ],
          expected: '3',
        },
        {
          id: 'q2',
          text: '같은 광물("철")이 여러 번 들어와도 집합의 종류 수가 늘어나지 않는 이유는 무엇일까요?',
          options: [
            { value: 'set_unique', label: '집합(Set)은 같은 값을 한 번만 보관하는 특성이 있기 때문' },
            { value: 'error', label: '오류가 발생하기 때문' },
          ],
          expected: 'set_unique',
        },
        {
          id: 'q3',
          text: '빈 목록 []이 주어졌을 때 서로 다른 종류 수가 0이 되는 이유는 무엇일까요?',
          options: [
            { value: 'empty_set', label: '담긴 광물이 없어 집합에 원소가 하나도 없기 때문' },
            { value: 'always_one', label: '최소 1개는 있어야 하기 때문' },
          ],
          expected: 'empty_set',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_set_041_transfer_1',
      title: '고유 행성 방문 수',
      description: '방문한 행성 코드 목록(planets)에서 중복을 제외한 서로 다른 방문 행성 수를 반환하세요.',
      contextCard: {
        title: '📋 고유 행성 종류 수 측정 사고 흐름',
        steps: [
          { label: '관찰', text: '방문 기록 목록에 적힌 행성 코드들을 확인합니다.' },
          { label: '구분', text: '중복 방문한 행성을 하나로 모아 집합으로 구성합니다.' },
          { label: '상태 갱신', text: '완성된 집합의 크기를 측정하여 고유한 행성 수를 구합니다.' },
        ],
      },
      thoughtCheck: {
        prompt: '광물 이름에서 행성 코드로 바뀌었을 때 중복을 없애고 종류를 세는 원리는 어떻게 될까요?',
        options: [
          { id: 'opt_same_set', label: '자료의 이름만 달라졌을 뿐, 집합으로 중복을 없애고 개수를 재는 원리는 완전히 동일하다', isCorrect: true },
          { id: 'opt_diff_set', label: '행성 코드는 집합으로 중복을 없앨 수 없다', isCorrect: false },
        ],
        feedback: '맞아요! 집합(set)과 len()을 활용하면 어떤 종류의 데이터든 고유한 항목 수를 정확히 구할 수 있습니다.',
      },
      entryFunction: 'count_unique_planets',
      starterCode: `def count_unique_planets(planets):
    # 방문한 서로 다른 행성의 수를 반환하세요.
    pass
`,
      officialSolutionCode: `def count_unique_planets(planets):
    visited = set(planets)
    return len(visited)
`,
      testCases: [
        { inputs: { planets: ['Mercury', 'Venus', 'Mars', 'Mercury', 'Venus'] }, expected: 3 },
        { inputs: { planets: ['Saturn', 'Jupiter', 'Neptune'] }, expected: 3 },
        { inputs: { planets: ['Pluto'] }, expected: 1 },
        { inputs: { planets: [] }, expected: 0 },
      ],
    },
  ],
}
