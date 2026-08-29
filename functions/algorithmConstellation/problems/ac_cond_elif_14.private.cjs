module.exports = {
  problemId: 'AC-COND-ELIF-14',
  problemVersion: 1,
  entryFunction: 'classify_hazard_level',
  officialSolutionCode: `def classify_hazard_level(danger_score):
    if danger_score >= 80:
        return 'CRITICAL'
    elif danger_score >= 50:
        return 'WARNING'
    else:
        return 'SAFE'
`,
  alternativeSolutions: [
    `def classify_hazard_level(danger_score):
    if danger_score >= 80:
        return 'CRITICAL'
    if danger_score >= 50:
        return 'WARNING'
    return 'SAFE'
`,
  ],
  intendedWrongFixtures: [
    {
      label: 'ELIF-ORDER-REVERSAL',
      code: `def classify_hazard_level(danger_score):
    if danger_score >= 50:
        return 'WARNING'
    elif danger_score >= 80:
        return 'CRITICAL'
    else:
        return 'SAFE'
`,
      expectedFailingGroup: 'critical_boundary',
      expectedMisconception: 'BRANCH-ORDER-EVALUATION-ERROR',
    },
    {
      label: 'ELIF-MISSING-FALLTHROUGH',
      code: `def classify_hazard_level(danger_score):
    if danger_score >= 80:
        return 'CRITICAL'
    elif danger_score >= 50:
        return 'WARNING'
`,
      expectedFailingGroup: 'safe_zone',
      expectedMisconception: 'MISSING-FALLTHROUGH',
    },
    {
      label: 'ELIF-ALWAYS-WARNING',
      code: `def classify_hazard_level(danger_score):
    return 'WARNING'
`,
      expectedFailingGroup: 'varied_scores',
      expectedMisconception: 'HARDCODED-SAMPLE-RETURN',
    },
  ],
  hiddenTests: [
    { inputs: { danger_score: 80 }, expected: 'CRITICAL', group: 'critical_boundary' },
    { inputs: { danger_score: 100 }, expected: 'CRITICAL', group: 'critical_boundary' },
    { inputs: { danger_score: 50 }, expected: 'WARNING', group: 'warning_boundary' },
    { inputs: { danger_score: 79 }, expected: 'WARNING', group: 'warning_boundary' },
    { inputs: { danger_score: 0 }, expected: 'SAFE', group: 'safe_zone' },
    { inputs: { danger_score: 49 }, expected: 'SAFE', group: 'safe_zone' },
    { inputs: { danger_score: 65 }, expected: 'WARNING', group: 'varied_scores' },
    { inputs: { danger_score: 95 }, expected: 'CRITICAL', group: 'varied_scores' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_cond_elif_14_1',
      prompt: 'if/elif/else 다중 분기문의 실행 순서와 특징을 확인해 보세요.',
      questions: [
        {
          id: 'q1',
          text: 'score=85일 때 score >= 50을 먼저 검사하면 왜 잘못된 결과(WARNING)가 나올까요?',
          options: [
            { value: 'WARNING이 먼저 선택되어 CRITICAL 분기에 도달하지 못하기 때문', label: 'WARNING이 먼저 선택되어 CRITICAL 분기에 도달하지 못하기 때문' },
            { value: '두 조건을 모두 검사해 마지막 결과를 쓰기 때문', label: '두 조건을 모두 검사해 마지막 결과를 쓰기 때문' },
          ],
          expected: 'WARNING이 먼저 선택되어 CRITICAL 분기에 도달하지 못하기 때문',
        },
        {
          id: 'q2',
          text: 'score=90이고 첫 조건 score >= 80이 참(True)이면 다음 elif score >= 50 조건은 검사할까요?',
          options: [
            { value: '검사하지 않고 건너뛴다', label: '검사하지 않고 건너뛴다' },
            { value: '항상 검사한다', label: '항상 검사한다' },
          ],
          expected: '검사하지 않고 건너뛴다',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_cond_elif_14_transfer_1',
      title: '배터리 충전 잔량 3단계 분류',
      description: '배터리 잔량(battery: 0~100)이 20 미만이면 "LOW", 70 미만이면 "NORMAL", 그 외는 "FULL"을 반환하는 함수를 작성하세요.',
      entryFunction: 'classify_battery_level',
      starterCode: `def classify_battery_level(battery):
    # 20 미만은 "LOW", 70 미만은 "NORMAL", 나머지는 "FULL"입니다.
    pass
`,
      officialSolutionCode: `def classify_battery_level(battery):
    if battery < 20:
        return 'LOW'
    elif battery < 70:
        return 'NORMAL'
    else:
        return 'FULL'
`,
      testCases: [
        { inputs: { battery: 0 }, expected: 'LOW' },
        { inputs: { battery: 19 }, expected: 'LOW' },
        { inputs: { battery: 20 }, expected: 'NORMAL' },
        { inputs: { battery: 69 }, expected: 'NORMAL' },
        { inputs: { battery: 70 }, expected: 'FULL' },
        { inputs: { battery: 100 }, expected: 'FULL' },
      ],
    },
  ],
}
