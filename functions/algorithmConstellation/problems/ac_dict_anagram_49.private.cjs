/**
 * AC-DICT-ANAGRAM-49 Private Problem Definition
 */
module.exports = {
  problemId: 'AC-DICT-ANAGRAM-49',
  problemVersion: 1,
  entryFunction: 'have_same_packet_letters',
  officialSolutionCode: `def have_same_packet_letters(packet_a, packet_b):
    counts_a = {}
    for char in packet_a:
        if char in counts_a:
            counts_a[char] = counts_a[char] + 1
        else:
            counts_a[char] = 1

    counts_b = {}
    for char in packet_b:
        if char in counts_b:
            counts_b[char] = counts_b[char] + 1
        else:
            counts_b[char] = 1

    return counts_a == counts_b
`,
  alternativeSolutions: [
    // 한 개의 표로 "빼기" 전략: 길이·membership·감소·잔액 확인으로 동치를 판정한다.
    // dict 순회 없이 현재 런타임 문법만 사용한다.
    `def have_same_packet_letters(packet_a, packet_b):
    counts = {}
    for char in packet_a:
        if char in counts:
            counts[char] = counts[char] + 1
        else:
            counts[char] = 1

    balance = 0
    for char in packet_b:
        if char in counts:
            counts[char] = counts[char] - 1
            if counts[char] < 0:
                return False
            balance = balance + 1
        else:
            return False

    if balance == len(packet_a):
        return True
    return False
`,
  ],
  intendedWrongFixtures: [
    {
      // "문자 종류만 같으면 된다" 오개념: set 비교는 횟수 차이를 놓친다.
      id: 'ANAGRAM-SET-ONLY',
      expectedFailingGroup: 'multiplicity-different',
      code: `def have_same_packet_letters(packet_a, packet_b):
    return set(packet_a) == set(packet_b)
`,
    },
    {
      // "길이만 같으면 된다" 오개념: 같은 길이의 다른 구성을 잡지 못한다.
      id: 'ANAGRAM-LENGTH-ONLY',
      expectedFailingGroup: 'same-length-different',
      code: `def have_same_packet_letters(packet_a, packet_b):
    if len(packet_a) == len(packet_b):
        return True
    return False
`,
    },
    {
      // "원본 문자열이 완전히 같아야 한다" 오개념: 순서만 다른 동치를 놓친다.
      id: 'ANAGRAM-ORDER-ONLY',
      expectedFailingGroup: 'reordered-equivalent',
      code: `def have_same_packet_letters(packet_a, packet_b):
    return packet_a == packet_b
`,
    },
    {
      // "내용 없이 비어 있지 않음만 판정" 오개념: 비어 있지 않기만 하면 무조건 True.
      id: 'ANAGRAM-ALWAYS-TRUE-FOR-NONEMPTY',
      expectedFailingGroup: 'same-length-different',
      code: `def have_same_packet_letters(packet_a, packet_b):
    if len(packet_a) > 0 and len(packet_b) > 0:
        return True
    return False
`,
    },
  ],
  hiddenTests: [
    // 순서만 다르고 빈도 동일: 원본 문자열 동치 비교 오답을 기각한다.
    { inputs: { packet_a: 'CABA', packet_b: 'ABCA' }, expected: true, group: 'reordered-equivalent' },
    // 문자 종류는 같고({A,B}) 횟수만 다름: set 비교 오답을 기각한다.
    { inputs: { packet_a: 'AABB', packet_b: 'ABBB' }, expected: false, group: 'multiplicity-different' },
    // 길이는 같지만 구성 자체가 다름: 길이 비교 오답을 기각한다.
    { inputs: { packet_a: 'AABB', packet_b: 'CCDD' }, expected: false, group: 'same-length-different' },
    // 한쪽만 빈 문자열 경계(양방향): different-length 그룹에 포함한다.
    // 한 방향만 검사하면 "한쪽이 비면 무조건 True" 같은 비대칭 오답이
    // 통과하므로 두 방향을 모두 유지해야 한다.
    { inputs: { packet_a: '', packet_b: 'A' }, expected: false, group: 'different-length' },
    { inputs: { packet_a: 'A', packet_b: '' }, expected: false, group: 'different-length' },
    // 빈 문자열 두 개: 빈 표 두 개는 같은 표.
    { inputs: { packet_a: '', packet_b: '' }, expected: true, group: 'empty-both' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_dict_049_1',
      title: '빈도표 구성 비교 이해',
      prompt: '두 패킷의 빈도표를 비교할 때의 핵심 원리를 점검하세요.',
      questions: [
        {
          id: 'q1',
          text: '"AABC"와 "CABA"처럼 글자 순서가 달라도 True가 될 수 있는 이유는 무엇일까요?',
          options: [
            { value: 'table_ignores_order', label: '빈도표는 글자 순서를 기억하지 않고 종류와 개수만 기록하므로' },
            { value: 'same_length_reason', label: '두 패킷의 길이가 같아서' },
            { value: 'first_letter_reason', label: '첫 글자가 서로 비슷해서' },
          ],
          expected: 'table_ignores_order',
        },
        {
          id: 'q2',
          text: '"AAB"와 "ABB"는 문자 종류가 둘 다 A와 B로 같은데도 False가 됩니다. 그 이유는 무엇일까요?',
          options: [
            { value: 'counts_differ', label: 'A와 B의 등장 횟수가 서로 달라 표 전체가 같지 않으므로' },
            { value: 'kinds_differ', label: '문자 종류 자체가 다르므로' },
            { value: 'length_differ', label: '글자 수가 다르므로' },
          ],
          expected: 'counts_differ',
        },
        {
          id: 'q3',
          text: '두 패킷이 모두 빈 문자열("")일 때 True가 되는 이유는 무엇일까요?',
          options: [
            { value: 'empty_tables_equal', label: '양쪽 모두 아무 칸도 없는 빈 횟수표이므로 같은 표다' },
            { value: 'empty_is_error', label: '빈 입력은 비교할 수 없으므로 무조건 True다' },
            { value: 'empty_is_false', label: '글자가 없으면 항상 False다' },
          ],
          expected: 'empty_tables_equal',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_dict_049_transfer_1',
      title: '같은 재료로 만든 배지 조합',
      description: '두 탐사팀의 배지 목록(badges_a, badges_b)을 받아, 배지 종류별 개수가 모두 같으면 같은 조합으로 판정합니다.',
      entryFunction: 'have_same_badge_recipe',
      starterCode: `def have_same_badge_recipe(badges_a, badges_b):\n    # 두 배지 목록의 종류별 개수가 모두 같은지 판정하세요.\n    pass\n`,
      officialSolutionCode: `def have_same_badge_recipe(badges_a, badges_b):
    counts_a = {}
    for badge in badges_a:
        if badge in counts_a:
            counts_a[badge] = counts_a[badge] + 1
        else:
            counts_a[badge] = 1

    counts_b = {}
    for badge in badges_b:
        if badge in counts_b:
            counts_b[badge] = counts_b[badge] + 1
        else:
            counts_b[badge] = 1

    return counts_a == counts_b
`,
      contextCard: {
        title: '🎟️ 배지 조합 비교 전략',
        strategyGuide: '각 배지 목록을 종류별 개수표로 정리한 뒤, 두 표에 기록된 종류와 개수가 하나도 빠짐없이 같은지 비교합니다.',
      },
      thoughtCheck: {
        question: '배지 [STAR, MOON, STAR]와 [MOON, MOON, STAR]는 같은 조합일까요?',
        options: [
          { value: 'not_same', label: '아니다 — STAR는 2개 vs 1개, MOON은 1개 vs 2개로 개수가 다르다' },
          { value: 'same', label: '같다 — 두 목록 모두 STAR와 MOON을 포함한다' },
        ],
        expected: 'not_same',
      },
      testCases: [
        { inputs: { badges_a: ['IRON', 'GOLD', 'IRON'], badges_b: ['GOLD', 'IRON', 'GOLD'] }, expected: false },
        { inputs: { badges_a: [], badges_b: [] }, expected: true },
        // 한쪽만 빈 경계는 양방향 모두 유지한다. 한 방향만 있으면
        // "한쪽이 비면 무조건 True" 비대칭 오답이 3★를 통과한다.
        { inputs: { badges_a: ['MOON'], badges_b: [] }, expected: false },
        { inputs: { badges_a: [], badges_b: ['STAR'] }, expected: false },
        { inputs: { badges_a: ['STAR', 'MOON', 'STAR', 'MOON'], badges_b: ['MOON', 'STAR', 'MOON', 'STAR'] }, expected: true },
      ],
    },
  ],
}
