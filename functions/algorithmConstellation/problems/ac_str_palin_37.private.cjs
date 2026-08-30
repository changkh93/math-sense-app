/**
 * Private Problem Definition: AC-STR-PALIN-37 (거울 통신)
 */

module.exports = {
  problemId: 'AC-STR-PALIN-37',
  problemVersion: 1,
  entryFunction: 'is_mirror_message',
  officialSolutionCode: `def is_mirror_message(message):
    return message == message[::-1]
`,
  alternativeSolutions: [
    `def is_mirror_message(message):
    left = 0
    right = len(message) - 1
    while left < right:
        if message[left] != message[right]:
            return False
        left += 1
        right -= 1
    return True
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'PALIN-FIRST-LAST-ONLY',
      misconceptionCode: 'STR-COMPARE-FIRST-LAST-ONLY',
      expectedMisconception: 'STR-COMPARE-FIRST-LAST-ONLY',
      expectedFailingGroup: 'same_ends_but_not_palindrome',
      code: `def is_mirror_message(message):
    return message[0] == message[-1]
`,
    },
    {
      id: 'PALIN-ALWAYS-TRUE',
      misconceptionCode: 'STR-ALWAYS-TRUE',
      expectedMisconception: 'STR-ALWAYS-TRUE',
      expectedFailingGroup: 'near_palindrome',
      code: `def is_mirror_message(message):
    return True
`,
    },
    {
      id: 'PALIN-REVERSED-TEXT',
      misconceptionCode: 'STR-RETURN-REVERSED-STRING',
      expectedMisconception: 'STR-RETURN-REVERSED-STRING',
      expectedFailingGroup: 'near_palindrome',
      code: `def is_mirror_message(message):
    return message[::-1]
`,
    },
  ],
  hiddenTests: [
    { inputs: { message: 'RACECAR' }, expected: true, group: 'odd_palindrome' },
    { inputs: { message: 'NOON' }, expected: true, group: 'even_palindrome' },
    { inputs: { message: 'Z' }, expected: true, group: 'single_character' },
    { inputs: { message: 'READER' }, expected: false, group: 'same_ends_but_not_palindrome' },
    { inputs: { message: 'PLANET' }, expected: false, group: 'near_palindrome' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_str_palin_37_1',
      title: '★★ 전체 대칭과 양끝 비교의 차이',
      type: 'trace_understanding',
      prompt: '문자열 "ROBOT"과 "RADAR"의 회문 판정 과정을 확인하세요.',
      codeSnippet: `def is_mirror_message(message):
    return message == message[::-1]`,
      questions: [
        {
          id: 'q1',
          text: '만약 "ROTAT"처럼 첫 글자와 마지막 글자만 같고 중간이 다르면 회문일까요?',
          options: [
            { value: 'not_palindrome', label: '회문이 아니다 (안쪽 모든 글자 쌍까지 전부 같아야 한다)' },
            { value: 'is_palindrome', label: '양끝만 같으면 회문이다' },
          ],
          expected: 'not_palindrome',
        },
        {
          id: 'q2',
          text: "홀수 길이 단어 'RADAR'(길이 5)에서 가운데 문자 'D'는 대칭 판정에 어떤 영향을 줄까요?",
          options: [
            { value: 'center_self_match', label: '자기 자신과 대칭이므로 양쪽 짝만 맞으면 회문이 성립한다' },
            { value: 'center_blocks', label: '짝이 없으므로 회문이 될 수 없다' },
          ],
          expected: 'center_self_match',
        },
        {
          id: 'q3',
          text: "한 글자인 message = 'X'는 회문일까요?",
          options: [
            { value: 'single_true', label: 'True (한 글자는 뒤집어도 항상 자기 자신과 같다)' },
            { value: 'single_false', label: 'False' },
          ],
          expected: 'single_true',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_str_palin_37_t1',
      title: '대칭 탐사 경로 판정',
      description: '정수로 된 탐사 지점 리스트(stops)가 주어질 때, 출발점에서 도착점까지의 경로가 앞뒤 대칭인지 판정하여 True 또는 False를 반환하세요.',
      contextCard: {
        title: '📋 대칭 경로 판정 흐름',
        steps: [
          { label: '관찰', text: '경로 목록 전체를 역방향으로 나열한 순서를 확인합니다.' },
          { label: '구분', text: '원래 경로 순서와 역방향 경로 순서가 모든 위치에서 일치하는지 비교합니다.' },
          { label: '상태 갱신', text: '완벽히 일치하면 참, 하나라도 다르면 거짓을 반환합니다.' },
        ],
      },
      thoughtCheck: {
        prompt: '자료형이 문자열에서 숫자 리스트로 바뀌었을 때 대칭 판정 원리는 어떻게 될까요?',
        options: [
          { id: 'opt_same_logic', label: '자료형만 달라졌을 뿐, 원래 순서와 뒤집은 순서가 같은지 비교하는 원리는 완전히 동일하다', isCorrect: true },
          { id: 'opt_diff_logic', label: '숫자는 뒤집어 비교할 수 없다', isCorrect: false },
        ],
        feedback: '맞아요! 리스트도 슬라이싱 [::-1]이나 역방향 비교로 대칭 여부를 동일하게 판정할 수 있습니다.',
      },
      entryFunction: 'is_symmetric_route',
      starterCode: `def is_symmetric_route(stops):
    # stops 리스트가 앞뒤 대칭 경로이면 True, 아니면 False를 반환하세요.
    pass
`,
      officialSolutionCode: `def is_symmetric_route(stops):
    return stops == stops[::-1]
`,
      testCases: [
        { inputs: { stops: [5, 9, 5] }, expected: true },
        { inputs: { stops: [10, 20, 20, 10] }, expected: true },
        { inputs: { stops: [7] }, expected: true },
        { inputs: { stops: [1, 2, 3, 1] }, expected: false },
      ],
    },
  ],
}
