/**
 * Private Problem Definition: AC-PAT-004 (Rotating Space Beacon)
 * Focus: Periodic Interval Pattern & Modulo Inequality (time % 4 < 2)
 */

module.exports = {
  problemId: 'AC-PAT-004',
  version: 1,
  checksum: 'sha256:ac_pat_004_v1_auth_2026',
  entryFunction: 'beacon_light',
  canonicalStrategy: 'time % 4 < 2',
  officialSolutionCode: `def beacon_light(time):\n    return time % 4 < 2\n`,
  alternativeSolutions: [
    `def beacon_light(time):\n    if time % 4 < 2:\n        return True\n    return False\n`,
    `def beacon_light(time):\n    return time % 4 == 0 or time % 4 == 1\n`,
  ],
  intendedWrongSolutions: [
    {
      id: 'wrong_single_instant',
      misconceptionCode: 'PAT-INTERVAL-01',
      code: `def beacon_light(time):\n    return time % 4 == 0\n`,
      expectedFailureGroup: 'second_active_second',
    },
    {
      id: 'wrong_cycle_two',
      misconceptionCode: 'PAT-CYCLE-02',
      code: `def beacon_light(time):\n    return time % 2 == 0\n`,
      expectedFailureGroup: 'second_active_second',
    },
    {
      id: 'wrong_inverted_interval',
      misconceptionCode: 'PAT-INTERVAL-01',
      code: `def beacon_light(time):\n    return time % 4 >= 2\n`,
      expectedFailureGroup: 'second_active_second',
    },
  ],
  publicTests: [
    { id: 't0', inputs: { time: 0 }, expected: true },
    { id: 't1', inputs: { time: 1 }, expected: true },
    { id: 't2', inputs: { time: 2 }, expected: false },
    { id: 't3', inputs: { time: 3 }, expected: false },
    { id: 't4', inputs: { time: 4 }, expected: true },
    { id: 't5', inputs: { time: 5 }, expected: true },
    { id: 't6', inputs: { time: 6 }, expected: false },
  ],
  hiddenTests: [
    { id: 'h0', inputs: { time: 0 }, expected: true, group: 'base_case' },
    { id: 'h1', inputs: { time: 1 }, expected: true, group: 'second_active_second' },
    { id: 'h2', inputs: { time: 2 }, expected: false, group: 'dark_beacon_times' },
    { id: 'h3', inputs: { time: 3 }, expected: false, group: 'dark_beacon_times' },
    { id: 'h4', inputs: { time: 4 }, expected: true, group: 'cycle_start_multiples' },
    { id: 'h5', inputs: { time: 5 }, expected: true, group: 'second_active_second' },
    { id: 'h6', inputs: { time: 6 }, expected: false, group: 'dark_beacon_times' },
    { id: 'h7', inputs: { time: 7 }, expected: false, group: 'dark_beacon_times' },
    { id: 'h8', inputs: { time: 8 }, expected: true, group: 'cycle_start_multiples' },
    { id: 'h9', inputs: { time: 9 }, expected: true, group: 'second_active_second' },
    { id: 'h100', inputs: { time: 100 }, expected: true, group: 'large_cycle_starts' },
    { id: 'h101', inputs: { time: 101 }, expected: true, group: 'large_second_active' },
    { id: 'h102', inputs: { time: 102 }, expected: false, group: 'large_dark_times' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_pat_04_01',
      type: 'modulo_interval_prediction',
      prompt: '우주 등대가 4초 주기 중 0초와 1초(time % 4 < 2)에 불이 켜질 때, 다음 시간의 등대 상태를 예측하세요.',
      questions: [
        { id: 'q1', text: '시간: 12초 (12 % 4 == 0)', expected: true },
        { id: 'q2', text: '시간: 14초 (14 % 4 == 2)', expected: false },
      ],
    },
  ],
  transferChallenges: [
    {
      transferChallengeId: 'AC-PAT-004-T1',
      title: '5초 주기 방어막 충전',
      description: '방어막은 5초 주기(time % 5 < 3)로 0초, 1초, 2초에 충전(True)되고, 3초와 4초에는 냉각(False)됩니다. 현재 시간(time)에 충전 중인지 판단하세요.',
      entryFunction: 'shield_charging',
      starterCode: `def shield_charging(time):\n    # 5초 주기 중 0, 1, 2초 충전 조건을 작성해 보세요.\n    pass\n`,
      testCases: [
        { inputs: { time: 0 }, expected: true },
        { inputs: { time: 2 }, expected: true },
        { inputs: { time: 3 }, expected: false },
        { inputs: { time: 4 }, expected: false },
        { inputs: { time: 7 }, expected: true },
        { inputs: { time: 8 }, expected: false },
      ],
    },
  ],
  get transferMasterSet() {
    return this.transferChallenges
  },
}
