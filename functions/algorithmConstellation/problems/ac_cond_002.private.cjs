/**
 * Private Problem Definition: AC-COND-002 (Lifeboat Boarding Permission)
 * Focus: Boolean disjunction (or)
 */

module.exports = {
  problemId: 'AC-COND-002',
  version: 1,
  checksum: 'sha256:ac_cond_002_v1_auth_2026',
  entryFunction: 'can_board',
  canonicalStrategy: 'has_card or emergency_approved',
  officialSolutionCode: `def can_board(has_card, emergency_approved):\n    return bool(has_card or emergency_approved)\n`,
  alternativeSolutions: [
    `def can_board(has_card, emergency_approved):\n    if has_card:\n        return True\n    return bool(emergency_approved)\n`,
    `def can_board(has_card, emergency_approved):\n    return True if (has_card or emergency_approved) else False\n`,
  ],
  intendedWrongSolutions: [
    {
      id: 'wrong_or_as_and',
      misconceptionCode: 'COND-AND-OR-01',
      code: `def can_board(has_card, emergency_approved):\n    return bool(has_card and emergency_approved)\n`,
      expectedFailureGroup: 'single_active',
    },
    {
      id: 'wrong_always_false',
      misconceptionCode: 'COND-BOUNDARY-01',
      code: `def can_board(has_card, emergency_approved):\n    return False\n`,
      expectedFailureGroup: 'single_active',
    },
    {
      id: 'wrong_inverted_or',
      misconceptionCode: 'COND-AND-OR-01',
      code: `def can_board(has_card, emergency_approved):\n    return bool(not has_card or not emergency_approved)\n`,
      expectedFailureGroup: 'both_active',
    },
  ],
  publicTests: [
    { id: 'p1', inputs: { has_card: true, emergency_approved: false }, expected: true },
    { id: 'p2', inputs: { has_card: false, emergency_approved: true }, expected: true },
    { id: 'p3', inputs: { has_card: true, emergency_approved: true }, expected: true },
    { id: 'p4', inputs: { has_card: false, emergency_approved: false }, expected: false },
  ],
  hiddenTests: [
    { id: 'h1', inputs: { has_card: true, emergency_approved: false }, expected: true, group: 'single_active' },
    { id: 'h2', inputs: { has_card: false, emergency_approved: true }, expected: true, group: 'single_active' },
    { id: 'h3', inputs: { has_card: false, emergency_approved: false }, expected: false, group: 'all_inactive' },
    { id: 'h4', inputs: { has_card: true, emergency_approved: true }, expected: true, group: 'both_active' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_cond_02_01',
      type: 'truth_table_completion',
      prompt: 'has_card or emergency_approved 조건식에 대한 다음 상황의 결과를 15초 내에 예측해 보세요.',
      questions: [
        { id: 'q1', text: 'has_card=False, emergency_approved=True 일 때의 결과는?', expected: true },
        { id: 'q2', text: 'has_card=False, emergency_approved=False 일 때의 결과는?', expected: false },
      ],
    },
  ],
  transferChallenges: [
    {
      transferChallengeId: 'AC-COND-002-T1',
      title: '우주선 비상 연료 재보충',
      description: '정거장에 연결되어 있거나(at_station), 비상 보급선이 연결되어 있을 때(tanker_connected)만 연료를 주입할 수(True) 있습니다.',
      entryFunction: 'can_refuel',
      starterCode: `def can_refuel(at_station, tanker_connected):\n    # 발견한 대안 규칙을 새로운 상황에 적용해 보세요.\n    pass\n`,
      testCases: [
        { inputs: { at_station: true, tanker_connected: false }, expected: true },
        { inputs: { at_station: false, tanker_connected: true }, expected: true },
        { inputs: { at_station: true, tanker_connected: true }, expected: true },
        { inputs: { at_station: false, tanker_connected: false }, expected: false },
      ],
    },
  ],
  get transferMasterSet() {
    return this.transferChallenges
  },
}
