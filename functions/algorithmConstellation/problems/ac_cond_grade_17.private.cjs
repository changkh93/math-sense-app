module.exports = {
  problemId: 'AC-COND-GRADE-17',
  problemVersion: 1,
  entryFunction: 'evaluate_exploration_grade',
  officialSolutionCode: `def evaluate_exploration_grade(score):
    if score >= 90:
        return 'S'
    elif score >= 80:
        return 'A'
    elif score >= 70:
        return 'B'
    return 'C'
`,
  alternativeSolutions: [
    `def evaluate_exploration_grade(score):
    if score >= 90:
        return 'S'
    if score >= 80:
        return 'A'
    if score >= 70:
        return 'B'
    return 'C'
`,
  ],
  intendedWrongFixtures: [
    {
      label: 'GRADE-ORDER-REVERSAL',
      code: `def evaluate_exploration_grade(score):
    if score >= 70:
        return 'B'
    elif score >= 80:
        return 'A'
    elif score >= 90:
        return 'S'
    return 'C'
`,
      expectedFailingGroup: 'top_tier_boundaries',
      expectedMisconception: 'BRANCH-ORDER-EVALUATION-ERROR',
    },
    {
      label: 'GRADE-MISSING-FALLTHROUGH',
      code: `def evaluate_exploration_grade(score):
    if score >= 90:
        return 'S'
    elif score >= 80:
        return 'A'
    elif score >= 70:
        return 'B'
`,
      expectedFailingGroup: 'low_scores',
      expectedMisconception: 'MISSING-FALLTHROUGH',
    },
    {
      label: 'GRADE-ALWAYS-A',
      code: `def evaluate_exploration_grade(score):
    return 'A'
`,
      expectedFailingGroup: 'top_tier_boundaries',
      expectedMisconception: 'HARDCODED-SAMPLE-RETURN',
    },
  ],
  hiddenTests: [
    { inputs: { score: 90 }, expected: 'S', group: 'top_tier_boundaries' },
    { inputs: { score: 100 }, expected: 'S', group: 'top_tier_boundaries' },
    { inputs: { score: 80 }, expected: 'A', group: 'a_tier_boundaries' },
    { inputs: { score: 89 }, expected: 'A', group: 'a_tier_boundaries' },
    { inputs: { score: 70 }, expected: 'B', group: 'b_tier_boundaries' },
    { inputs: { score: 79 }, expected: 'B', group: 'b_tier_boundaries' },
    { inputs: { score: 0 }, expected: 'C', group: 'low_scores' },
    { inputs: { score: 69 }, expected: 'C', group: 'low_scores' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_cond_grade_17_1',
      prompt: '다중 분기의 검사 순서 전략과 실행 중단을 확인해 보세요.',
      questions: [
        {
          id: 'q1',
          text: 'score=92일 때 if score >= 70을 가장 먼저 검사하면 왜 B 등급으로 잘못 판정될까요?',
          options: [
            { value: '70 이상 조건이 먼저 참이 되어 조기 반환되기 때문', label: '70 이상 조건이 먼저 참이 되어 조기 반환되기 때문' },
            { value: '92가 70보다 작기 때문', label: '92가 70보다 작기 때문' },
          ],
          expected: '70 이상 조건이 먼저 참이 되어 조기 반환되기 때문',
        },
        {
          id: 'q2',
          text: 'score=85이고 if score >= 90이 거짓, elif score >= 80이 참이 되었을 때 그 아래의 70점 조건은 실행될까요?',
          options: [
            { value: '검사하지 않고 바로 건너뛴다', label: '검사하지 않고 바로 건너뛴다' },
            { value: '70점 조건도 함께 검사한다', label: '70점 조건도 함께 검사한다' },
          ],
          expected: '검사하지 않고 바로 건너뛴다',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_cond_grade_17_transfer_1',
      title: '방사선 위험 등급 분류',
      description: '방사선 수치(radiation: 0~150)에 따라 20 이하는 "SAFE", 50 이하는 "CAUTION", 80 이하는 "DANGER", 그 외는 "CRITICAL"을 반환하는 함수를 작성하세요.',
      entryFunction: 'classify_radiation_danger',
      starterCode: `def classify_radiation_danger(radiation):
    # 20 이하는 "SAFE", 50 이하는 "CAUTION", 80 이하는 "DANGER", 나머지는 "CRITICAL"입니다.
    pass
`,
      officialSolutionCode: `def classify_radiation_danger(radiation):
    if radiation <= 20:
        return 'SAFE'
    elif radiation <= 50:
        return 'CAUTION'
    elif radiation <= 80:
        return 'DANGER'
    return 'CRITICAL'
`,
      testCases: [
        { inputs: { radiation: 0 }, expected: 'SAFE' },
        { inputs: { radiation: 20 }, expected: 'SAFE' },
        { inputs: { radiation: 21 }, expected: 'CAUTION' },
        { inputs: { radiation: 50 }, expected: 'CAUTION' },
        { inputs: { radiation: 51 }, expected: 'DANGER' },
        { inputs: { radiation: 80 }, expected: 'DANGER' },
        { inputs: { radiation: 81 }, expected: 'CRITICAL' },
        { inputs: { radiation: 150 }, expected: 'CRITICAL' },
      ],
    },
  ],
}
