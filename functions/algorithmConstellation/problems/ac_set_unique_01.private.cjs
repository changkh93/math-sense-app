/**
 * Server-only Private Problem Definition for AC-SET-UNIQUE-01
 */

module.exports = {
  problemId: 'AC-SET-UNIQUE-01',
  problemVersion: 1,
  entryFunction: 'count_unique_minerals',
  officialSolutionCode: `def count_unique_minerals(minerals):
    return len(set(minerals))
`,
  alternativeSolutions: [
    `def count_unique_minerals(minerals):
    seen = set()
    for item in minerals:
        seen.add(item)
    return len(seen)
`,
  ],
  intendedWrongFixtures: [
    {
      label: 'returns_total_length',
      code: `def count_unique_minerals(minerals):
    return len(minerals)
`,
      expectedFailingGroup: 'duplicate_minerals',
    },
  ],
  hiddenTests: [
    { inputs: { minerals: ['A', 'B', 'A', 'C', 'B'] }, expected: 3, group: 'duplicate_minerals' },
    { inputs: { minerals: ['X', 'Y', 'Z'] }, expected: 3, group: 'all_distinct' },
    { inputs: { minerals: ['ONE'] }, expected: 1, group: 'single_mineral' },
    { inputs: { minerals: [] }, expected: 0, group: 'empty_minerals' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_set_041_1',
      prompt: 'set 집합 연산의 중복 제거 결과를 예측해 보세요.',
      questions: [
        {
          id: 'q1',
          text: "minerals = ['A', 'B', 'A', 'C', 'B']일 때 len(set(minerals))는 얼마일까요?",
          options: [
            { value: '3', label: '3' },
            { value: '5', label: '5' },
            { value: '2', label: '2' },
          ],
          expected: '3',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_set_041_transfer_1',
      title: '고유 행성 방문 수',
      description: '방문한 행성 목록에서 중복을 제외한 방문 행성 수를 구하세요.',
      entryFunction: 'count_unique_planets',
      starterCode: 'def count_unique_planets(planets):\n    pass\n',
      officialSolutionCode: `def count_unique_planets(planets):
    return len(set(planets))
`,
      testCases: [
        { inputs: { planets: ['Earth', 'Mars', 'Earth', 'Jupiter'] }, expected: 3 },
        { inputs: { planets: ['Moon', 'Moon'] }, expected: 1 },
      ],
    },
  ],
}
