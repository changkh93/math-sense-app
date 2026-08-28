/**
 * Server-Only Private Problem Catalog (Cloud Functions / Server Authority)
 * STRICT SECURITY INVARIANT:
 * This file contains official solutions, mutation fixtures, and hidden test suites.
 * It is located in `functions/` and MUST NEVER be imported by Vite / client bundles.
 */

const PRIVATE_PROBLEM_DEFINITIONS = {
  'AC-COND-001@v1': {
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
      {
        id: 'wrong_hardcode_base',
        misconceptionCode: 'COND-BOUNDARY-01',
        code: `def check_gate(s1, s2):\n    if s1 == True and s2 == True: return True\n    return False\n`,
        expectedFailureGroup: 'none',
      },
    ],
    publicTests: [
      { id: 'p1', inputs: { s1: true, s2: true }, expected: true },
      { id: 'p2', inputs: { s1: true, s2: false }, expected: false },
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
        prompt: '스위치 1과 스위치 2의 다음 상태에서 게이트가 열리는지(True) 닫히는지(False) 선택하세요.',
        questions: [
          { id: 'q1', text: '스위치 1=ON (True), 스위치 2=ON (True)', expected: true },
          { id: 'q2', text: '스위치 1=ON (True), 스위치 2=OFF (False)', expected: false },
        ],
      },
      {
        challengeId: 'uc_cond_02',
        type: 'truth_table_completion',
        prompt: '스위치 1과 스위치 2의 다음 상태에서 게이트가 열리는지(True) 닫히는지(False) 선택하세요.',
        questions: [
          { id: 'q1', text: '스위치 1=OFF (False), 스위치 2=ON (True)', expected: false },
          { id: 'q2', text: '스위치 1=OFF (False), 스위치 2=OFF (False)', expected: false },
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
  },
  'AC-PAT-003@v1': {
    problemId: 'AC-PAT-003',
    version: 1,
    checksum: 'sha256:ac_pat_003_v1_auth_2026',
    entryFunction: 'check_bridge',
    canonicalStrategy: 'time % 3 == 0',
    officialSolutionCode: `def check_bridge(time):\n    return time % 3 == 0\n`,
    alternativeSolutions: [
      `def check_bridge(time):\n    if time % 3 == 0:\n        return True\n    return False\n`,
      `def check_bridge(time):\n    return True if time % 3 == 0 else False\n`,
    ],
    intendedWrongSolutions: [
      {
        id: 'wrong_hardcode',
        misconceptionCode: 'PAT-HARDCODE-01',
        code: `def check_bridge(time):\n    return time == 0 or time == 3 or time == 6\n`,
        expectedFailureGroup: 'large_cycle',
      },
      {
        id: 'wrong_quotient',
        misconceptionCode: 'PAT-QUOTIENT-01',
        code: `def check_bridge(time):\n    return time // 3 == 0\n`,
        expectedFailureGroup: 'nonzero_cycle',
      },
      {
        id: 'wrong_cycle_len',
        misconceptionCode: 'PAT-CYCLE-01',
        code: `def check_bridge(time):\n    return time % 2 == 0\n`,
        expectedFailureGroup: 'odd_cycle',
      },
    ],
    publicTests: [
      { id: 'p0', inputs: { time: 0 }, expected: true },
      { id: 'p1', inputs: { time: 1 }, expected: false },
      { id: 'p2', inputs: { time: 2 }, expected: false },
      { id: 'p3', inputs: { time: 3 }, expected: true },
    ],
    hiddenTests: [
      { id: 'h1', inputs: { time: 4 }, expected: false, group: 'small_cycle' },
      { id: 'h2', inputs: { time: 6 }, expected: true, group: 'small_cycle' },
      { id: 'h3', inputs: { time: 99 }, expected: true, group: 'large_cycle' },
      { id: 'h4', inputs: { time: 100 }, expected: false, group: 'large_cycle' },
      { id: 'h5', inputs: { time: 300 }, expected: true, group: 'large_cycle' },
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
        starterCode: `# 4초 주기(1, 5, 9, 13...)로 가동될 때 True를 반환하세요.\ndef check_cooling(time):\n    # 여기에 코드를 작성하세요\n    pass\n`,
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
  },
}

function getPrivateProblemDefinition(problemId, version = 1) {
  if (typeof version !== 'number' || version < 1) {
    throw new Error(`Invalid version: ${version}`)
  }
  const key = `${problemId}@v${version}`
  const definition = PRIVATE_PROBLEM_DEFINITIONS[key]
  if (!definition) {
    throw new Error(`Private problem definition not found for key: ${key}`)
  }
  return definition
}

module.exports = {
  PRIVATE_PROBLEM_DEFINITIONS,
  getPrivateProblemDefinition,
}
