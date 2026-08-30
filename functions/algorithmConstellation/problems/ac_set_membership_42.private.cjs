/**
 * Private Problem Definition: AC-SET-MEMBERSHIP-42 (승선 명단 확인)
 */

module.exports = {
  problemId: 'AC-SET-MEMBERSHIP-42',
  problemVersion: 1,
  entryFunction: 'is_passenger_listed',
  officialSolutionCode: `def is_passenger_listed(passenger, manifest):
    if passenger in manifest:
        return True
    return False
`,
  alternativeSolutions: [
    `def is_passenger_listed(passenger, manifest):
    return passenger in manifest
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'MEMBERSHIP-FIRST-ONLY',
      misconceptionCode: 'MEMBERSHIP-FIRST-ONLY',
      expectedMisconception: 'MEMBERSHIP-FIRST-ONLY',
      expectedFailingGroup: 'present-last',
      code: `def is_passenger_listed(passenger, manifest):
    if len(manifest) == 0:
        return False
    return manifest[0] == passenger
`,
    },
    {
      id: 'MEMBERSHIP-INVERTED',
      misconceptionCode: 'MEMBERSHIP-INVERTED',
      expectedMisconception: 'MEMBERSHIP-INVERTED',
      expectedFailingGroup: 'present-first',
      code: `def is_passenger_listed(passenger, manifest):
    return not (passenger in manifest)
`,
    },
    {
      id: 'MEMBERSHIP-NONEMPTY-MEANS-TRUE',
      misconceptionCode: 'MEMBERSHIP-NONEMPTY-MEANS-TRUE',
      expectedMisconception: 'MEMBERSHIP-NONEMPTY-MEANS-TRUE',
      expectedFailingGroup: 'absent',
      code: `def is_passenger_listed(passenger, manifest):
    return len(manifest) > 0
`,
    },
  ],
  hiddenTests: [
    { inputs: { passenger: 'A', manifest: ['A', 'B', 'C'] }, expected: true, group: 'present-first' },
    { inputs: { passenger: 'C', manifest: ['A', 'B', 'C'] }, expected: true, group: 'present-last' },
    { inputs: { passenger: 'Z', manifest: ['A', 'B', 'C'] }, expected: false, group: 'absent' },
    { inputs: { passenger: 'A', manifest: [] }, expected: false, group: 'empty-manifest' },
    { inputs: { passenger: 'B', manifest: ['B', 'B', 'B'] }, expected: true, group: 'duplicate-does-not-change-result' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_set_membership_42_1',
      title: '★★ 명단 포함 여부와 in 연산자',
      type: 'trace_understanding',
      prompt: '승선 명단에서 포함 여부를 판정하는 원리를 점검하세요.',
      questions: [
        {
          id: 'q1',
          text: '같은 승객 이름("루미")이 명단에 여러 번 적혀 있어도 "루미"의 포함 여부 결과는 어떻게 될까요?',
          options: [
            { value: 'single_true', label: '중복 횟수와 상관없이 포함되어 있으므로 True 하나이다' },
            { value: 'count_two', label: '2가 된다' },
          ],
          expected: 'single_true',
        },
        {
          id: 'q2',
          text: '빈 명단 []에서 어떤 승객을 찾아도 항상 False가 나오는 이유는 무엇일까요?',
          options: [
            { value: 'no_elements', label: '명단에 아무도 등록되어 있지 않아 어떤 승객도 포함될 수 없기 때문' },
            { value: 'error', label: '오류가 발생하기 때문' },
          ],
          expected: 'no_elements',
        },
        {
          id: 'q3',
          text: '개수를 세는 문제(len)와 포함 여부를 묻는 문제(in)의 반환값 형태는 어떻게 다를까요?',
          options: [
            { value: 'count_vs_bool', label: '개수 세기는 정수(0, 1, 2...)이고, 포함 여부는 참/거짓(True/False)이다' },
            { value: 'always_same', label: '항상 같다' },
          ],
          expected: 'count_vs_bool',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_set_membership_42_t1',
      title: '수리 부품 재고 확인',
      description: '필요한 수리 부품 코드(part)가 창고 재고 목록(inventory)에 존재하는지 True 또는 False로 반환하세요.',
      contextCard: {
        title: '📋 부품 재고 확인 사고 흐름',
        steps: [
          { label: '관찰', text: '찾으려는 부품 코드와 창고 재고 목록을 확인합니다.' },
          { label: '구분', text: '재고 목록을 바탕으로 찾는 부품이 포함되어 있는지 판정합니다.' },
          { label: '상태 갱신', text: '포함되어 있으면 True, 없으면 False를 반환합니다.' },
        ],
      },
      thoughtCheck: {
        prompt: '승객 명단에서 부품 재고로 도메인이 바뀌었을 때 포함 여부를 묻는 원리는 어떻게 될까요?',
        options: [
          { id: 'opt_same_in', label: '데이터 종류만 바뀌었을 뿐, 목록이나 집합에 특정 항목이 포함되어 있는지 판정하는 원리는 완전히 동일하다', isCorrect: true },
          { id: 'opt_diff_in', label: '부품 재고는 in 연산자로 확인할 수 없다', isCorrect: false },
        ],
        feedback: '맞아요! 목록이나 집합에서도 같은 포함 여부 규칙을 적용할 수 있습니다.',
      },
      entryFunction: 'is_part_available',
      starterCode: `def is_part_available(part, inventory):
    # part가 inventory에 포함되어 있는지 True 또는 False로 반환하세요.
    pass
`,
      officialSolutionCode: `def is_part_available(part, inventory):
    known = set(inventory)
    if part in known:
        return True
    return False
`,
      testCases: [
        { inputs: { part: 'CHIP_X', inventory: ['CHIP_X', 'SENSOR_Y'] }, expected: true },
        { inputs: { part: 'WIRES', inventory: ['CHIP_X', 'SENSOR_Y', 'WIRES'] }, expected: true },
        { inputs: { part: 'FUSE', inventory: ['CHIP_X', 'SENSOR_Y'] }, expected: false },
        { inputs: { part: 'CORE', inventory: [] }, expected: false },
      ],
    },
  ],
}
