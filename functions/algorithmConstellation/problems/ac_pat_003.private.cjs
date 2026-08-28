/**
 * Private Problem Definition: AC-PAT-003 (Frozen Signal Bridge)
 * Focus: Periodic Pattern & Modulo Arithmetic (time % 3 == 0)
 */

module.exports = {
  problemId: 'AC-PAT-003',
  version: 1,
  checksum: 'sha256:ac_pat_003_v1_auth_2026',
  entryFunction: 'check_bridge',
  canonicalStrategy: 'time % 3 == 0',
  officialSolutionCode: `def check_bridge(time):\n    return time % 3 == 0\n`,
  alternativeSolutions: [
    `def check_bridge(time):\n    if time % 3 == 0:\n        return True\n    else:\n        return False\n`,
    `def check_bridge(time):\n    return True if time % 3 == 0 else False\n`,
  ],
  intendedWrongSolutions: [
    {
      id: 'wrong_offset_by_one',
      misconceptionCode: 'PAT-OFFSET-01',
      code: `def check_bridge(time):\n    return time % 3 == 1\n`,
      expectedFailureGroup: 'cycle_multiples',
    },
    {
      id: 'wrong_cycle_two',
      misconceptionCode: 'PAT-CYCLE-02',
      code: `def check_bridge(time):\n    return time % 2 == 0\n`,
      expectedFailureGroup: 'cycle_multiples',
    },
    {
      id: 'wrong_constant_true',
      misconceptionCode: 'PAT-CONSTANT-01',
      code: `def check_bridge(time):\n    return True\n`,
      expectedFailureGroup: 'closed_bridge_times',
    },
  ],
  publicTests: [
    { id: 't0', inputs: { time: 0 }, expected: true },
    { id: 't1', inputs: { time: 1 }, expected: false },
    { id: 't2', inputs: { time: 2 }, expected: false },
    { id: 't3', inputs: { time: 3 }, expected: true },
    { id: 't4', inputs: { time: 4 }, expected: false },
    { id: 't6', inputs: { time: 6 }, expected: true },
  ],
  hiddenTests: [
    { id: 'h0', inputs: { time: 0 }, expected: true, group: 'base_case' },
    { id: 'h1', inputs: { time: 1 }, expected: false, group: 'closed_bridge_times' },
    { id: 'h2', inputs: { time: 2 }, expected: false, group: 'closed_bridge_times' },
    { id: 'h3', inputs: { time: 3 }, expected: true, group: 'cycle_multiples' },
    { id: 'h4', inputs: { time: 4 }, expected: false, group: 'closed_bridge_times' },
    { id: 'h5', inputs: { time: 5 }, expected: false, group: 'closed_bridge_times' },
    { id: 'h6', inputs: { time: 6 }, expected: true, group: 'cycle_multiples' },
    { id: 'h9', inputs: { time: 9 }, expected: true, group: 'cycle_multiples' },
    { id: 'h10', inputs: { time: 10 }, expected: false, group: 'closed_bridge_times' },
    { id: 'h15', inputs: { time: 15 }, expected: true, group: 'cycle_multiples' },
    { id: 'h99', inputs: { time: 99 }, expected: true, group: 'large_multiples' },
    { id: 'h100', inputs: { time: 100 }, expected: false, group: 'large_non_multiples' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_pat_01',
      type: 'modulo_cycle_prediction',
      prompt: '신호 다리가 3초 주기로 열릴 때, 다음 시간에 다리가 열리는지(True) 닫히는지(False) 선택하세요.',
      questions: [
        { id: 'q1', text: '시간: 9초 (9 % 3 == 0)', expected: true },
        { id: 'q2', text: '시간: 10초 (10 % 3 == 1)', expected: false },
      ],
    },
  ],
  transferChallenges: [
    {
      transferChallengeId: 'AC-PAT-003-T1',
      title: '4초 주기 냉각 장치',
      description: '냉각 장치가 4초 주기(time % 4 == 1)로 1초, 5초, 9초에 가동됩니다. 현재 시간(time)에 냉각 장치가 가동(True)하는지 판단하세요.',
      entryFunction: 'check_cooling',
      starterCode: `def check_cooling(time):\n    # 4초 주기(1, 5, 9, 13...) 가동 조건을 완성해 보세요.\n    pass\n`,
      testCases: [
        { inputs: { time: 1 }, expected: true },
        { inputs: { time: 2 }, expected: false },
        { inputs: { time: 5 }, expected: true },
        { inputs: { time: 9 }, expected: true },
        { inputs: { time: 10 }, expected: false },
      ],
    },
  ],
  get transferMasterSet() {
    return this.transferChallenges
  },
}
