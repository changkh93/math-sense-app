/**
 * Server-only Private Problem Definition for AC-STR-REVERSE-01
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
      label: 'returns_original_string',
      code: `def decode_message(msg):
    return msg
`,
      expectedFailingGroup: 'asymmetric_strings',
    },
  ],
  hiddenTests: [
    { inputs: { msg: 'PYTHON' }, expected: 'NOHTYP', group: 'asymmetric_strings' },
    { inputs: { msg: 'RADAR' }, expected: 'RADAR', group: 'palindromes' },
    { inputs: { msg: 'A' }, expected: 'A', group: 'single_character' },
    { inputs: { msg: '12345' }, expected: '54321', group: 'number_strings' },
  ],
  understandingChallenges: [
    {
      challengeId: 'uc_str_036_1',
      prompt: '문자열 슬라이싱 msg[::-1]의 실행 결과를 예측해 보세요.',
      questions: [
        {
          id: 'q1',
          text: "msg = 'HELLO'일 때 decode_message(msg)의 결과는 무엇일까요?",
          options: [
            { value: "'OLLEH'", label: "'OLLEH'" },
            { value: "'HELLO'", label: "'HELLO'" },
            { value: "'OLLHE'", label: "'OLLHE'" },
          ],
          expected: "'OLLEH'",
        },
      ],
    },
  ],
  transferMasterSet: [
    {
      transferChallengeId: 'tc_str_036_transfer_1',
      title: '거울 암호 인코더',
      description: '단어를 거꾸로 뒤집어 거울 암호로 변환하세요.',
      entryFunction: 'mirror_encode',
      starterCode: 'def mirror_encode(word):\n    pass\n',
      officialSolutionCode: `def mirror_encode(word):
    return word[::-1]
`,
      testCases: [
        { inputs: { word: 'SPACE' }, expected: 'ECAPS' },
        { inputs: { word: 'GALAXY' }, expected: 'YXALAG' },
      ],
    },
  ],
}
