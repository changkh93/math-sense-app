/**
 * Private Problem Definition: AC-COND-001 (Two Safety Switches)
 * Focus: Boolean conjunction (and)
 */

module.exports = {
  problemId: 'AC-COND-001',
  version: 1,
  checksum: 'sha256:ac_cond_001_v1_auth_2026',
  entryFunction: 'check_gate',
  canonicalStrategy: 's1 and s2',
  officialSolutionCode: `def check_gate(s1, s2):\n    return bool(s1 and s2)\n`,
  alternativeSolutions: [
    `def check_gate(s1, s2):\n    if s1:\n        if s2:\n            return True\n    return False\n`,
    `def check_gate(s1, s2):\n    return True if (s1 and s2) else False\n`,
  ],
  intendedWrongSolutions: [
    {
      id: 'wrong_and_or',
      misconceptionCode: 'COND-AND-OR-01',
      code: `def check_gate(s1, s2):\n    return bool(s1 or s2)\n`,
      expectedFailureGroup: 'single_active',
    },
    {
      id: 'wrong_always_true',
      misconceptionCode: 'COND-BOUNDARY-01',
      code: `def check_gate(s1, s2):\n    return True\n`,
      expectedFailureGroup: 'single_active',
    },
    {
      id: 'wrong_inverted',
      misconceptionCode: 'COND-AND-OR-01',
      code: `def check_gate(s1, s2):\n    return bool(not s1 and not s2)\n`,
      expectedFailureGroup: 'both_active',
    },
    {
      id: 'wrong_single_condition',
      misconceptionCode: 'COND-AND-OR-01',
      code: `def check_gate(s1, s2):\n    return bool(s1)\n`,
      expectedFailureGroup: 'single_active',
    },
  ],
  publicTests: [
    { id: 'p1', inputs: { s1: true, s2: true }, expected: true },
    { id: 'p2', inputs: { s1: true, s2: false }, expected: false },
    { id: 'p3', inputs: { s1: false, s2: true }, expected: false },
    { id: 'p4', inputs: { s1: false, s2: false }, expected: false },
  ],
  hiddenTests: [
    { id: 'h1', inputs: { s1: true, s2: false }, expected: false, group: 'single_active' },
    { id: 'h2', inputs: { s1: false, s2: true }, expected: false, group: 'single_active' },
    { id: 'h3', inputs: { s1: false, s2: false }, expected: false, group: 'all_inactive' },
    { id: 'h4', inputs: { s1: true, s2: true }, expected: true, group: 'both_active' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_cond_01',
      type: 'truth_table_completion',
      prompt: 's1 and s2 조건식에 대한 다음 상황의 결과를 15초 내에 빠르게 예측해 보세요.',
      questions: [
        { id: 'q1', text: 's1=False, s2=True 일 때 s1 and s2 의 결과는?', expected: false },
        { id: 'q2', text: 's1=True, s2=True 일 때 s1 and s2 의 결과는?', expected: true },
      ],
    },
  ],
  transferChallenges: [
    {
      transferChallengeId: 'AC-COND-001-T1',
      title: '우주선 외부 탐사 허가',
      description: '우주복이 준비되었고(suit_ready), 산소가 충분할 때(oxygen_ok)만 안전하게 외부로 나갈 수(True) 있습니다.',
      entryFunction: 'can_exit',
      starterCode: `def can_exit(suit_ready, oxygen_ok):\n    # 발견한 규칙을 새로운 상황에 적용해 보세요.\n    pass\n`,
      testCases: [
        { inputs: { suit_ready: true, oxygen_ok: true }, expected: true },
        { inputs: { suit_ready: true, oxygen_ok: false }, expected: false },
        { inputs: { suit_ready: false, oxygen_ok: true }, expected: false },
        { inputs: { suit_ready: false, oxygen_ok: false }, expected: false },
      ],
    },
    {
      transferChallengeId: 'AC-COND-001-T2',
      title: '3개의 안전 스위치',
      description: '보안 등급이 올라가 스위치가 3개(s1, s2, s3)로 늘어났습니다. 3개가 모두 True일 때만 True를 반환하세요.',
      entryFunction: 'check_gate_3',
      starterCode: `def check_gate_3(s1, s2, s3):\n    # 여기에 코드를 작성하세요\n    pass\n`,
      testCases: [
        { inputs: { s1: true, s2: true, s3: true }, expected: true },
        { inputs: { s1: true, s2: true, s3: false }, expected: false },
        { inputs: { s1: false, s2: true, s3: true }, expected: false },
        { inputs: { s1: false, s2: false, s3: false }, expected: false },
      ],
    },
  ],
  get transferMasterSet() {
    return this.transferChallenges
  },
}
