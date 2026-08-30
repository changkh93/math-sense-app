import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_DICT_ANAGRAM_49 = createCapabilityPrototypeKernel({
  problemId: 'AC-DICT-ANAGRAM-49',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 49,
    constellationId: 'constellation-4',
    routeRole: 'branch',
    learningRole: 'review',
    recommendedBand: 'EN',
    prerequisites: ['AC-DICT-FREQ-44'],
  },
  identity: {
    studentTitle: '같은 문자로 된 통신 패킷',
    subtitle: '두 패킷의 문자별 빈도표를 만들어, 순서와 상관없이 문자 재료와 개수가 같은지 비교합니다.',
  },
  pythonConcepts: {
    requires: [
      'builtin:dict',
      'statement:for',
      'statement:if',
      'operator:membership-in',
      'operator:equality',
    ],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:frequency-table'],
    introduces: ['pattern:frequency-signature-comparison'],
  },
  evidenceRecipe: {
    primitives: [
      'container-scan',
      'container-membership',
      'decision',
      'scalar-sequence',
    ],
    requiredClaims: ['FREQUENCY_SIGNATURE_EQUIVALENCE'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '패킷 "AABC"와 "CABA"는 글자 순서가 다릅니다. 각 문자의 등장 횟수를 비교하면 두 패킷은 같은 재료로 되어 있을까요?',
      options: [
        { value: 'same_letters_same_counts', label: '같다 — A는 2개, B는 1개, C는 1개로 양쪽 모두 동일' },
        { value: 'different_order_means_different', label: '다르다 — 글자 순서가 다르므로 다른 패킷이다' },
        { value: 'cannot_know', label: '모른다 — 순서를 다시 확인해야 한다' },
      ],
      expected: 'same_letters_same_counts',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '📡 패킷 빈도 비교판',
          description: '두 통신 패킷을 각각 스캔해 문자별 횟수표를 만들고, 두 표 전체를 비교합니다.',
          variables: [
            { name: 'packet_a', value: '"AABC"', label: '첫 번째 패킷' },
            { name: 'packet_b', value: '"CABA"', label: '두 번째 패킷' },
            { name: 'countsA', value: '{A: 2, B: 1, C: 1}', label: '첫 패킷 횟수표' },
            { name: 'countsB', value: '{C: 1, A: 2, B: 1}', label: '둘째 패킷 횟수표' },
            { name: 'sameFrequency', value: 'True', label: '두 표가 같은지' },
          ],
          guidance: '횟수표는 글자 순서를 기억하지 않아요. 종류와 개수만 비교하면 됩니다.',
        },
        initialState: { currentPacket: null, countsA: {}, countsB: {}, sameFrequency: null },
        initialStateLabel: '시작: 빈 횟수표 두 개',
        initialStepTitle: '🚀 시작 (패킷 스캔 대기)',
        initialPrompt: '두 패킷을 차례로 스캔하며 각각의 횟수표를 만듭니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① AABC 스캔 — A,B,C 순으로 기록',
            operationLabel: '첫 패킷 "AABC"를 스캔해 countsA 횟수표 완성',
            codeSnippet: '# AABC -> A칸 2, B칸 1, C칸 1',
            prompt: '첫 패킷의 글자를 하나씩 세어 countsA에 기록합니다.',
            stateAfter: { currentPacket: 'AABC', countsA: { A: 2, B: 1, C: 1 }, countsB: {}, sameFrequency: null },
          },
          {
            id: 'f1',
            stepTitle: '② CABA 스캔 — C,A,B 순으로 기록',
            operationLabel: '둘째 패킷 "CABA"를 스캔해 countsB 횟수표 완성',
            codeSnippet: '# CABA -> C칸 1, A칸 2, B칸 1',
            prompt: '둘째 패킷도 같은 방법으로 countsB에 기록합니다. 기록 순서는 C,A,B지만 표의 내용에 주목하세요.',
            stateAfter: { currentPacket: 'CABA', countsA: { A: 2, B: 1, C: 1 }, countsB: { C: 1, A: 2, B: 1 }, sameFrequency: null },
          },
          {
            id: 'f2',
            stepTitle: '③ 두 표 비교 — 순서는 달라도 구성 같음 → True',
            operationLabel: 'countsA와 countsB 표 전체 비교',
            codeSnippet: '# 표의 종류(A,B,C)와 개수(2,1,1)가 모두 동일 -> True',
            prompt: '두 표는 기록된 순서는 다르지만 종류와 개수가 완전히 같아요. 빈도표는 순서를 기억하지 않으므로 같은 표로 판정됩니다.',
            stateAfter: { currentPacket: 'CABA', countsA: { A: 2, B: 1, C: 1 }, countsB: { C: 1, A: 2, B: 1 }, sameFrequency: true },
          },
          {
            // 성공 실행(True)과 별개의 새 입력이다: experimentReset + stateBefore로
            // 이전 실행에 이어지는 것처럼 보이지 않게 새 실험을 명시적으로 분리한다.
            id: 'f3_counter',
            stepTitle: '④ 새 실험: AAB vs ABB',
            experimentReset: true,
            stateBefore: { currentPacket: null, countsA: {}, countsB: {}, sameFrequency: null },
            operationLabel: '새 입력 "AAB"와 "ABB"를 스캔해 두 표 비교',
            codeSnippet: '# 새 실험: AAB -> {A: 2, B: 1}, ABB -> {A: 1, B: 2}',
            prompt: '문자 종류는 둘 다 {A, B}로 같지만 A와 B의 횟수가 서로 달라요. 종류만 비교하면 True라고 착각하기 쉽지만, 표 전체를 비교하면 False가 됩니다.',
            stateAfter: { currentPacket: 'ABB', countsA: { A: 2, B: 1 }, countsB: { A: 1, B: 2 }, sameFrequency: false },
          },
        ],
        predictionPrompt: '두 패킷의 문자별 횟수표가 완전히 같으면 True, 하나라도 다르면 False를 반환하세요.',
        rulePrompt: '빈도 구성 동치 비교 규칙',
        ruleStatement: '두 목록을 각각 빈도표로 만든 뒤, 표의 종류와 개수 전체가 같은지 비교한다. 빈도표는 순서를 기억하지 않는다.',
      },
    },
    code: {
      entryFunction: 'have_same_packet_letters',
      starterCode: `def have_same_packet_letters(packet_a, packet_b):\n    # 두 패킷의 문자별 횟수표를 각각 만들어 비교한 뒤 True/False를 반환하세요.\n    pass\n`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { packet_a: 'AABC', packet_b: 'CABA' }, expected: true },
      { inputs: { packet_a: 'AAB', packet_b: 'ABB' }, expected: false },
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
    transferChallenges: [
      {
        transferChallengeId: 'tc_dict_049_transfer_1',
        title: '같은 재료로 만든 배지 조합',
        description: '두 탐사팀의 배지 목록(badges_a, badges_b)을 받아, 배지 종류별 개수가 모두 같으면 같은 조합으로 판정합니다.',
        entryFunction: 'have_same_badge_recipe',
        starterCode: `def have_same_badge_recipe(badges_a, badges_b):\n    # 두 배지 목록의 종류별 개수가 모두 같은지 판정하세요.\n    pass\n`,
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
          { inputs: { badges_a: ['STAR', 'MOON', 'STAR'], badges_b: ['MOON', 'STAR', 'STAR'] }, expected: true },
          { inputs: { badges_a: ['GOLD', 'GOLD'], badges_b: ['GOLD', 'IRON'] }, expected: false },
        ],
      },
    ],
  },
})
