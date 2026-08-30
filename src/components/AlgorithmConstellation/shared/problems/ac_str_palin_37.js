import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_STR_PALIN_37 = createCapabilityPrototypeKernel({
  problemId: 'AC-STR-PALIN-37',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-3',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'E',
    prerequisites: ['AC-STR-REVERSE-01'],
  },
  identity: {
    studentTitle: '거울 통신',
    subtitle: '문자열의 앞뒤가 완벽히 대칭을 이루는 회문(Palindrome)인지 판정합니다.',
  },
  pythonConcepts: {
    requires: [
      'syntax:slicing',
      'operator:equality',
      'value:boolean',
    ],
    introduces: [],
  },
  thinkingPatterns: {
    requires: [],
    introduces: [],
  },
  evidenceRecipe: {
    primitives: ['container-scan', 'decision', 'scalar-sequence'],
    requiredClaims: [
      'palindrome-identity-check',
      'non-palindrome-rejection',
      'single-character-is-palindrome',
    ],
  },
  modes: {
    observe: {
      prompt: '통신 신호 "LEVEL", "LUMI", "ABBA" 중 앞뒤로 읽어도 같은 회문(거울 신호)이 아닌 것은 무엇일까요?',
      expected: 'LUMI',
      options: [
        { value: 'LUMI', label: '"LUMI" (뒤집으면 "IMUL"이 되어 원래와 다르다)' },
        { value: 'LEVEL', label: '"LEVEL"' },
        { value: 'ABBA', label: '"ABBA"' },
      ],
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🪞 거울 신호 대칭 검사실',
          description: '신호 "RADAR"의 양끝 문자 쌍을 차례로 대조하며 대칭 여부를 판정합니다.',
          variables: [
            { name: 'leftChar', value: '"R"', label: '왼쪽 문자' },
            { name: 'rightChar', value: '"R"', label: '오른쪽 문자' },
            { name: 'pairMatches', value: 'True', label: '현재 쌍 일치' },
            { name: 'allMatchedSoFar', value: 'True', label: '전체 대칭 상태' },
          ],
          guidance: '양끝에서 안쪽으로 좁혀오며 모든 짝이 일치하는지 확인하세요.',
        },
        initialState: { leftChar: null, rightChar: null, pairMatches: null, allMatchedSoFar: true },
        initialStateLabel: '시작: 대칭 검사 준비',
        initialStepTitle: '🚀 시작 (양끝 문자 대조)',
        initialPrompt: '신호 "RADAR"의 바깥쪽부터 양끝 문자를 비교합니다.',
        frames: [
          {
            id: 'pair_1',
            stepTitle: '① 0번 R과 4번 R 비교',
            operationLabel: '"R" == "R" -> True',
            codeSnippet: 'msg[0] == msg[-1]  # "R" == "R"',
            prompt: '첫 글자 "R"과 마지막 글자 "R"이 완벽히 일치합니다.',
            stateAfter: { leftChar: 'R', rightChar: 'R', pairMatches: true, allMatchedSoFar: true },
          },
          {
            id: 'pair_2',
            stepTitle: '② 1번 A와 3번 A 비교',
            operationLabel: '"A" == "A" -> True',
            codeSnippet: 'msg[1] == msg[-2]  # "A" == "A"',
            prompt: '안쪽의 두 번째 글자 "A"와 뒤에서 두 번째 "A"도 일치합니다.',
            stateAfter: { leftChar: 'A', rightChar: 'A', pairMatches: true, allMatchedSoFar: true },
          },
          {
            id: 'center_D',
            stepTitle: '③ 가운데 2번 D 확인',
            operationLabel: '가운데 1글자는 항상 대칭',
            codeSnippet: '# 홀수 길이 가운데 "D"는 짝 없이 자가 대칭',
            prompt: '가운데 남은 "D"는 자기 자신과 같으므로 전체가 완벽한 회문(True)입니다.',
            stateAfter: { leftChar: 'D', rightChar: 'D', pairMatches: true, allMatchedSoFar: true },
          },
        ],
        predictionPrompt: '신호 "RADAR"가 회문인지 True/False로 반환하세요.',
        rulePrompt: '거울 신호 회문 판정 규칙',
        ruleStatement: '문자열 전체를 뒤집은 결과가 원본과 정확히 같으면 True, 다르면 False를 반환합니다.',
      },
    },
    code: {
      entryFunction: 'is_mirror_message',
      starterCode: `def is_mirror_message(message):
    # message가 앞뒤로 읽어도 같은 회문이면 True, 아니면 False를 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { message: 'LEVEL' }, expected: true },
      { inputs: { message: 'LUMI' }, expected: false },
      { inputs: { message: 'AA' }, expected: true },
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
    transferChallenges: [
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
        testCases: [
          { inputs: { stops: [1, 2, 3, 2, 1] }, expected: true },
          { inputs: { stops: [1, 2, 3, 4] }, expected: false },
        ],
      },
    ],
  },
})
