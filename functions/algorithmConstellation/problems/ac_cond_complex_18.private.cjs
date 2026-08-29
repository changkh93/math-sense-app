module.exports = {
  problemId: 'AC-COND-COMPLEX-18',
  problemVersion: 1,
  entryFunction: 'can_open_security_door',
  officialSolutionCode: `def can_open_security_door(has_master_key, has_card, bio_passed):
    return has_master_key or (has_card and bio_passed)
`,
  alternativeSolutions: [
    `def can_open_security_door(has_master_key, has_card, bio_passed):
    if has_master_key:
        return True
    if has_card and bio_passed:
        return True
    return False
`,
  ],
  intendedWrongFixtures: [
    {
      label: 'COMPLEX-ALL-AND',
      code: `def can_open_security_door(has_master_key, has_card, bio_passed):
    return has_master_key and has_card and bio_passed
`,
      expectedFailingGroup: 'master_path',
      expectedMisconception: 'OVERLY-RESTRICTIVE-CONJUNCTION',
    },
    {
      label: 'COMPLEX-ALL-OR',
      code: `def can_open_security_door(has_master_key, has_card, bio_passed):
    return has_master_key or has_card or bio_passed
`,
      expectedFailingGroup: 'partial_auth',
      expectedMisconception: 'OVERLY-PERMISSIVE-DISJUNCTION',
    },
    {
      label: 'COMPLEX-MISSING-BIO',
      code: `def can_open_security_door(has_master_key, has_card, bio_passed):
    return has_master_key or has_card
`,
      expectedFailingGroup: 'partial_auth',
      expectedMisconception: 'MISSING-CONJUNCTION-TERM',
    },
    {
      label: 'COMPLEX-WRONG-GROUPING',
      code: `def can_open_security_door(has_master_key, has_card, bio_passed):
    return (has_master_key or has_card) and bio_passed
`,
      expectedFailingGroup: 'master_path',
      expectedMisconception: 'LOGIC-GROUPING-ERROR',
    },
  ],
  hiddenTests: [
    { inputs: { has_master_key: false, has_card: false, bio_passed: false }, expected: false, group: 'all_fail' },
    { inputs: { has_master_key: false, has_card: false, bio_passed: true }, expected: false, group: 'partial_auth' },
    { inputs: { has_master_key: false, has_card: true, bio_passed: false }, expected: false, group: 'partial_auth' },
    { inputs: { has_master_key: false, has_card: true, bio_passed: true }, expected: true, group: 'card_and_bio_valid' },
    { inputs: { has_master_key: true, has_card: false, bio_passed: false }, expected: true, group: 'master_path' },
    { inputs: { has_master_key: true, has_card: false, bio_passed: true }, expected: true, group: 'master_path' },
    { inputs: { has_master_key: true, has_card: true, bio_passed: false }, expected: true, group: 'master_path' },
    { inputs: { has_master_key: true, has_card: true, bio_passed: true }, expected: true, group: 'all_valid' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_cond_complex_18_1',
      prompt: '복합 논리식의 의미 그룹과 괄호의 중요성을 확인해 보세요.',
      questions: [
        {
          id: 'q1',
          text: 'has_master_key=False, has_card=True, bio_passed=False일 때 문이 열리지 않는(False) 이유는 무엇일까요?',
          options: [
            { value: '마스터 키가 없는 상태에서 카드와 생체 인식이 둘 다 통과하지 못했기 때문', label: '마스터 키가 없는 상태에서 카드와 생체 인식이 둘 다 통과하지 못했기 때문' },
            { value: '마스터 키가 없으면 무조건 문이 열리지 않기 때문', label: '마스터 키가 없으면 무조건 문이 열리지 않기 때문' },
          ],
          expected: '마스터 키가 없는 상태에서 카드와 생체 인식이 둘 다 통과하지 못했기 때문',
        },
        {
          id: 'q2',
          text: 'has_master_key=True, has_card=False, bio_passed=False일 때 (has_master_key or has_card) and bio_passed로 묶으면 왜 문이 열리지 못할까요?',
          options: [
            { value: '마스터 키가 있어도 생체 인식이 없으면 False가 되어 단독 승인 경로가 사라지기 때문', label: '마스터 키가 있어도 생체 인식이 없으면 False가 되어 단독 승인 경로가 사라지기 때문' },
            { value: '생체 인식은 검사하지 않기 때문', label: '생체 인식은 검사하지 않기 때문' },
          ],
          expected: '마스터 키가 있어도 생체 인식이 없으면 False가 되어 단독 승인 경로가 사라지기 때문',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_cond_complex_18_transfer_1',
      title: '우주선 비상 착륙 허가 판정',
      description: '지휘관 승인권(has_commander_override)이 있거나, 연료가 충분(fuel_ok)하고 폭풍 경보가 없을 때(not storm_warning) 비상 착륙이 허가(True)되는 함수를 작성하세요.',
      entryFunction: 'can_emergency_land',
      starterCode: `def can_emergency_land(has_commander_override, fuel_ok, storm_warning):
    # 지휘관 승인권이 있거나, 연료가 충분하고 폭풍 경보가 없을 때 착륙을 허가하세요.
    pass
`,
      officialSolutionCode: `def can_emergency_land(has_commander_override, fuel_ok, storm_warning):
    return has_commander_override or (fuel_ok and not storm_warning)
`,
      testCases: [
        { inputs: { has_commander_override: false, fuel_ok: false, storm_warning: false }, expected: false },
        { inputs: { has_commander_override: false, fuel_ok: false, storm_warning: true }, expected: false },
        { inputs: { has_commander_override: false, fuel_ok: true, storm_warning: false }, expected: true },
        { inputs: { has_commander_override: false, fuel_ok: true, storm_warning: true }, expected: false },
        { inputs: { has_commander_override: true, fuel_ok: false, storm_warning: false }, expected: true },
        { inputs: { has_commander_override: true, fuel_ok: false, storm_warning: true }, expected: true },
        { inputs: { has_commander_override: true, fuel_ok: true, storm_warning: false }, expected: true },
        { inputs: { has_commander_override: true, fuel_ok: true, storm_warning: true }, expected: true },
      ],
    },
  ],
}
