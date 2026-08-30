import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_STR_REVERSE_01 = createCapabilityPrototypeKernel({
  problemId: 'AC-STR-REVERSE-01',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-3',
    routeRole: 'core',
    learningRole: 'anchor',
    recommendedBand: 'EN',
    prerequisites: ['AC-SEQ-005'],
  },
  identity: {
    studentTitle: '뒤집힌 구조 메시지',
    subtitle: '거꾸로 전송된 외계 신호 문자열을 올바른 순서로 뒤집어 복원합니다.',
  },
  evidenceRecipe: {
    primitives: ['container-scan', 'ordered-buffer', 'scalar-sequence'],
    requiredClaims: [
      'reverse-order-reconstructed',
      'slicing-step-inverts-direction',
      'palindrome-preserves-identity',
    ],
  },
  pythonConcepts: {
    requires: [],
    introduces: ['syntax:slicing'],
  },
  thinkingPatterns: {
    requires: [],
    introduces: [],
  },
  modes: {
    observe: {
      prompt: "거꾸로 들어온 외계 신호 'IMUL'을 뒤집으면 어떤 단어가 될까요?",
      expected: 'LUMI',
      options: [
        { value: 'LUMI', label: "'LUMI' (마지막 글자부터 차례로 읽은 단어)" },
        { value: 'IMUL', label: "'IMUL' (원래 신호 그대로)" },
        { value: 'MUIL', label: "'MUIL'" },
      ],
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '📡 외계 신호 역방향 복원실',
          description: '거꾸로 전송된 신호 "EDOC"을 마지막 글자부터 차례로 읽어 올바른 단어로 복원합니다.',
          variables: [
            { name: 'decoded', value: '""', label: '복원된 메시지' },
          ],
          guidance: '마지막 글자부터 시작하여 문자열이 뒤집혀 결합되는 과정을 확인하세요.',
        },
        initialState: { sourceIndex: 3, currentChar: null, decoded: '' },
        initialStateLabel: '시작: decoded = ""',
        initialStepTitle: '🚀 시작 (역방향 스캔 준비)',
        initialPrompt: '신호 "EDOC"의 마지막 글자(3번 위치)부터 차례로 읽기 시작합니다.',
        frames: [
          {
            id: 'scan_C',
            stepTitle: '① 3번 인덱스 C 읽기',
            operationLabel: 'currentChar = "C" -> decoded에 덧붙임',
            codeSnippet: 'decoded = decoded + msg[3]  # "C"',
            prompt: '마지막 글자 "C"를 읽어 decoded에 "C"가 추가됩니다.',
            stateAfter: { sourceIndex: 3, currentChar: 'C', decoded: 'C' },
          },
          {
            id: 'scan_O',
            stepTitle: '② 2번 인덱스 O 읽기',
            operationLabel: 'currentChar = "O" -> decoded에 덧붙임',
            codeSnippet: 'decoded = decoded + msg[2]  # "CO"',
            prompt: '그 앞 글자 "O"를 읽어 decoded가 "CO"가 됩니다.',
            stateAfter: { sourceIndex: 2, currentChar: 'O', decoded: 'CO' },
          },
          {
            id: 'scan_D',
            stepTitle: '③ 1번 인덱스 D 읽기',
            operationLabel: 'currentChar = "D" -> decoded에 덧붙임',
            codeSnippet: 'decoded = decoded + msg[1]  # "COD"',
            prompt: '"D"를 읽어 decoded가 "COD"가 됩니다.',
            stateAfter: { sourceIndex: 1, currentChar: 'D', decoded: 'COD' },
          },
          {
            id: 'scan_E',
            stepTitle: '④ 0번 인덱스 E 읽기',
            operationLabel: 'currentChar = "E" -> decoded 완성',
            codeSnippet: 'decoded = decoded + msg[0]  # "CODE"',
            prompt: '첫 글자 "E"를 읽어 마침내 "CODE"로 복원됩니다.',
            stateAfter: { sourceIndex: 0, currentChar: 'E', decoded: 'CODE' },
          },
        ],
        predictionPrompt: '복원된 완성 단어 "CODE"를 반환하세요.',
        rulePrompt: '문자열 역순 복원 규칙',
        ruleStatement: '문자열의 마지막 글자부터 첫 글자까지 역방향으로 읽어 새 문자열을 만들면 원래 순서로 복원됩니다.',
      },
    },
    code: {
      entryFunction: 'decode_message',
      starterCode: `def decode_message(msg):
    # 뒤집힌 문자열 msg를 원래 순서로 복원하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { msg: 'IMUL' }, expected: 'LUMI' },
      { inputs: { msg: 'SOS' }, expected: 'SOS' },
      { inputs: { msg: 'A' }, expected: 'A' },
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
    transferChallenges: [
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
        testCases: [
          { inputs: { word: 'SPACE' }, expected: 'ECAPS' },
          { inputs: { word: 'GALAXY' }, expected: 'YXALAG' },
        ],
      },
    ],
  },
})
