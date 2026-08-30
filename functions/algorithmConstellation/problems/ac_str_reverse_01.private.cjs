/**
 * Private Problem Definition: AC-STR-REVERSE-01 (뒤집힌 구조 메시지)
 */

module.exports = {
  problemId: 'AC-STR-REVERSE-01',
  problemVersion: 1,
  entryFunction: 'decode_message',
  officialSolutionCode: `def decode_message(msg):
    return msg[::-1]
`,
  alternativeSolutions: [
    `def decode_message(msg):
    res = ''
    for i in range(len(msg) - 1, -1, -1):
        res = res + msg[i]
    return res
`,
    `def decode_message(msg):
    res = ''
    for i in range(len(msg)):
        res = msg[i] + res
    return res
`,
  ],
  intendedWrongFixtures: [
    {
      id: 'REVERSE-ORIGINAL-DIRECTLY',
      misconceptionCode: 'STR-RETURN-ORIGINAL',
      expectedMisconception: 'STR-RETURN-ORIGINAL',
      expectedFailingGroup: 'asymmetric_strings',
      code: `def decode_message(msg):
    return msg
`,
    },
    {
      id: 'REVERSE-OFF-BY-ONE',
      misconceptionCode: 'STR-OFF-BY-ONE-SLICE',
      expectedMisconception: 'STR-OFF-BY-ONE-SLICE',
      expectedFailingGroup: 'asymmetric_strings',
      code: `def decode_message(msg):
    return msg[:-1][::-1]
`,
    },
  ],
  hiddenTests: [
    { inputs: { msg: 'PYTHON' }, expected: 'NOHTYP', group: 'asymmetric_strings' },
    { inputs: { msg: 'RADAR' }, expected: 'RADAR', group: 'palindromes' },
    { inputs: { msg: 'Z' }, expected: 'Z', group: 'single_character' },
    { inputs: { msg: '12345' }, expected: '54321', group: 'number_strings' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_str_reverse_01_1',
      title: '★★ 슬라이싱과 역방향 탐색 원리',
      type: 'trace_understanding',
      prompt: '문자열 역순 복원 과정과 슬라이싱 원리를 확인하세요.',
      codeSnippet: `def decode_message(msg):
    return msg[::-1]`,
      questions: [
        {
          id: 'q1',
          text: 'msg[::-1]에서 step이 -1인 것은 어떤 의미일까요?',
          options: [
            { value: 'reverse_step', label: '문자열을 뒤에서 앞으로 역방향으로 1칸씩 읽는다' },
            { value: 'delete_last', label: '마지막 글자를 하나 지운다' },
            { value: 'first_letter', label: '첫 글자만 선택한다' },
          ],
          expected: 'reverse_step',
        },
        {
          id: 'q2',
          text: "회문인 단어 msg = 'RADAR'를 뒤집으면 어떤 결과가 나올까요?",
          options: [
            { value: 'same_word', label: "'RADAR' (앞뒤가 같으므로 뒤집어도 동일하다)" },
            { value: 'empty_word', label: "빈 문자열 ''" },
          ],
          expected: 'same_word',
        },
        {
          id: 'q3',
          text: "한 글자인 msg = 'Z'를 뒤집으면 어떤 결과가 나올까요?",
          options: [
            { value: 'single_z', label: "'Z'" },
            { value: 'none_val', label: 'None' },
          ],
          expected: 'single_z',
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_str_reverse_01_t1',
      title: '거울 암호 인코더',
      description: '단어(word)를 거꾸로 뒤집어 거울 암호 문자열로 변환하세요.',
      contextCard: {
        title: '📋 거울 암호 변환 흐름',
        steps: [
          { label: '관찰', text: '입력 단어의 마지막 글자부터 첫 글자까지 역방향으로 읽습니다.' },
          { label: '구분', text: '글자들을 원래 순서와 반대로 차례대로 모읍니다.' },
          { label: '상태 갱신', text: '뒤집힌 새 문자열을 완성하여 반환합니다.' },
        ],
      },
      thoughtCheck: {
        prompt: '단어를 거꾸로 뒤집었을 때 첫 글자와 마지막 글자의 위치는 어떻게 바뀔까요?',
        options: [
          { id: 'opt_swap_ends', label: '원래 마지막 글자가 맨 앞 글자가 되고, 원래 첫 글자가 맨 뒤로 간다', isCorrect: true },
          { id: 'opt_keep_pos', label: '글자들의 위치는 그대로 유지된다', isCorrect: false },
        ],
        feedback: '맞아요! 전체 읽는 방향이 반대로 뒤집히므로 끝 글자가 시작 글자가 됩니다.',
      },
      entryFunction: 'mirror_encode',
      starterCode: `def mirror_encode(word):
    # 단어 word를 거꾸로 뒤집어 반환하세요.
    pass
`,
      officialSolutionCode: `def mirror_encode(word):
    return word[::-1]
`,
      testCases: [
        { inputs: { word: 'PLANET' }, expected: 'TENALP' },
        { inputs: { word: 'STAR' }, expected: 'RATS' },
        { inputs: { word: 'LUNA' }, expected: 'ANUL' },
        { inputs: { word: 'K' }, expected: 'K' },
      ],
    },
  ],
}
