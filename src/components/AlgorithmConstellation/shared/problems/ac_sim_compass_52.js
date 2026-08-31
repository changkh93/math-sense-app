import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_SIM_COMPASS_52 = createCapabilityPrototypeKernel({
  problemId: 'AC-SIM-COMPASS-52',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 52,
    constellationId: 'constellation-5',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'N',
    prerequisites: ['AC-SIM-ROVER-51', 'AC-PAT-003'],
  },
  identity: {
    studentTitle: '네 방향 우주 나침반',
    subtitle: 'R과 L 명령으로 4방향(0북 1동 2남 3서)을 순환 회전하고 범위 끝을 반대편으로 감쌉니다.',
  },
  pythonConcepts: {
    requires: ['builtin:list', 'statement:for', 'statement:if', 'operator:equality', 'operator:modulo'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:command-state-machine'],
    introduces: ['pattern:cyclic-state-wrap'],
  },
  evidenceRecipe: {
    primitives: ['scalar-sequence', 'decision'],
    requiredClaims: ['CYCLIC_DIRECTION_WRAP'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '나침반이 서쪽(3)을 가리킬 때 오른쪽 회전(R)을 한 번 하면 몇 번 방향이 될까요?',
      options: [
        { value: 'north_zero', label: '0 (북) — 끝을 지나 첫 방향으로 돌아온다' },
        { value: 'four', label: '4 — 그대로 하나가 더해진다' },
        { value: 'two', label: '2 (남) — 두 번 돌아간다' },
      ],
      expected: 'north_zero',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🧭 나침반 회전 관찰판',
          description: '방향은 0(북), 1(동), 2(남), 3(서)으로 기록됩니다. R은 오른쪽 한 칸, L은 왼쪽 한 칸입니다.',
          variables: [
            { name: 'start_direction', value: '0 (북)' },
            { name: 'commands', value: '[R, R, R, R]' },
            { name: 'wrapRule', value: '범위를 넘으면 반대편으로', label: '감싸기 규칙' },
          ],
          guidance: '왼쪽 회전은 "오른쪽 세 칸"으로 표현하면 감소 계산 없이 범위 안에서 처리됩니다.',
        },
        initialState: { directionBefore: null, command: null, rawDirection: null, wrappedDirection: null },
        initialStateLabel: '시작: 북(0)을 가리키는 나침반',
        initialStepTitle: '🚀 시작 (방향 0, 북)',
        initialPrompt: '각 회전 뒤 원래 값과 감싼 뒤의 값을 나란히 비교합니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① 북(0)에서 R',
            operationLabel: 'R: 방향 + 1 = 1 (범위 안)',
            codeSnippet: '# raw 1 -> wrap 1',
            prompt: '아직 범위 안이므로 원래 값과 감싼 값이 같습니다.',
            stateAfter: { directionBefore: 0, command: 'R', rawDirection: 1, wrappedDirection: 1 },
          },
          {
            id: 'f1',
            stepTitle: '② 동(1)에서 R',
            operationLabel: 'R: 방향 + 1 = 2 (범위 안)',
            codeSnippet: '# raw 2 -> wrap 2',
            prompt: '남(2)을 가리킵니다.',
            stateAfter: { directionBefore: 1, command: 'R', rawDirection: 2, wrappedDirection: 2 },
          },
          {
            id: 'f2',
            stepTitle: '③ 남(2)에서 R',
            operationLabel: 'R: 방향 + 1 = 3 (범위 안)',
            codeSnippet: '# raw 3 -> wrap 3',
            prompt: '서(3)을 가리킵니다. 여기가 마지막 방향이에요.',
            stateAfter: { directionBefore: 2, command: 'R', rawDirection: 3, wrappedDirection: 3 },
          },
          {
            id: 'f3',
            stepTitle: '④ 서(3)에서 R — 첫 경계 통과!',
            operationLabel: 'R: 방향 + 1 = 4 -> 범위를 넘음 -> 4를 4로 나눈 나머지 0',
            codeSnippet: '# raw 4 -> wrap (3 + 1) % 4 = 0',
            prompt: '원래 값 4는 존재하지 않는 방향이에요. 나머지로 감싸면 첫 방향 북(0)으로 돌아옵니다.',
            stateAfter: { directionBefore: 3, command: 'R', rawDirection: 4, wrappedDirection: 0 },
          },
          {
            // 왼쪽 회전도 감소 없이 가산 형식으로 처리하는 독립 실험.
            id: 'f4_left_wrap',
            stepTitle: '⑤ 새 실험: 북(0)에서 L',
            experimentReset: true,
            stateBefore: { directionBefore: null, command: null, rawDirection: null, wrappedDirection: null },
            operationLabel: 'L: 방향 + 3 = 3 (왼쪽 한 칸 = 오른쪽 세 칸)',
            codeSnippet: '# 새 실험: (0 + 3) % 4 = 3',
            prompt: '0에서 왼쪽으로 돌면 서(3)가 되어야 해요. 빼기 대신 더하기 3으로 계산하면 어떤 방향에서도 범위 안에서 처리됩니다.',
            stateAfter: { directionBefore: 0, command: 'L', rawDirection: 3, wrappedDirection: 3 },
          },
        ],
        predictionPrompt: '회전 명령을 모두 처리한 뒤 최종 방향(0~3)을 반환하세요.',
        rulePrompt: '순환 방향 감싸기 규칙',
        ruleStatement: 'R은 방향에 1을 더하고 4로 나눈 나머지로, L은 3을 더하고 4로 나눈 나머지로 감싼다.',
      },
    },
    code: {
      entryFunction: 'rotate_compass',
      starterCode: `def rotate_compass(start_direction, commands):
    # R과 L을 순서대로 처리해 최종 방향(0~3)을 반환하세요.
    # 범위 끝을 지나면 반대편으로 감싸야 합니다.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { start_direction: 0, commands: ['R', 'R', 'L'] }, expected: 1 },
      { inputs: { start_direction: 3, commands: ['R'] }, expected: 0 },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_sim_052_1',
        title: '순환 방향 감싸기 이해',
        prompt: '4방향 나침반의 순환 회전 원리를 점검하세요.',
        questions: [
          {
            id: 'q1',
            text: '서(3)에서 R을 하면 북(0)이 되는 이유는 무엇일까요?',
            options: [
              { value: 'wrap_to_start', label: '방향이 네 개로 순환하므로 끝을 지나면 첫 방향으로 돌아가서' },
              { value: 'stays_four', label: '4라는 새 방향이 생겨서' },
              { value: 'turns_back', label: '회전이 무시되어서' },
            ],
            expected: 'wrap_to_start',
          },
          {
            id: 'q2',
            text: '왼쪽 회전(L)을 "방향에 3을 더한 뒤 감싸기"로 표현하면 좋은 이유는 무엇일까요?',
            options: [
              { value: 'always_in_range', label: '어떤 방향에서 계산해도 중간 값이 음수가 되지 않아 나머지로 한 번에 감쌀 수 있어서' },
              { value: 'shorter_code', label: '코드가 더 짧아져서' },
              { value: 'same_as_right', label: '왼쪽과 오른쪽이 같은 회전이어서' },
            ],
            expected: 'always_in_range',
          },
          {
            id: 'q3',
            text: '어느 방향에서 R을 네 번 하면 어떻게 될까요?',
            options: [
              { value: 'full_cycle', label: '한 바퀴 돌아 처음 방향으로 돌아온다' },
              { value: 'off_range', label: '방향이 4만큼 늘어나 범위를 벗어난다' },
            ],
            expected: 'full_cycle',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_sim_052_transfer_1',
        title: '일주일 요일 이동기',
        description: '요일을 0(월)부터 6(일)까지 일곱 개로 기록할 때, NEXT와 PREV 이동 명령을 처리해 최종 요일을 구합니다.',
        entryFunction: 'shift_weekday',
        starterCode: `def shift_weekday(start_day, moves):
    # NEXT와 PREV를 처리해 최종 요일(0~6)을 반환하세요.
    pass
`,
        contextCard: {
          title: '📅 요일 이동 전략',
          strategyGuide: 'NEXT는 하루를 더하고, PREV는 하루 전으로 돌아가되 요일 범위를 벗어나면 반대편 끝으로 감싸 줍니다.',
        },
        thoughtCheck: {
          question: '요일 0(월)에서 PREV를 처리하면 몇 번 요일이 될까요?',
          options: [
            { value: 'sunday_six', label: '6 (일) — 앞쪽 끝을 지나 반대편 끝으로 감싸진다' },
            { value: 'minus_one', label: '-1 — 범위 밖의 새 요일이 된다' },
          ],
          expected: 'sunday_six',
        },
        testCases: [
          { inputs: { start_day: 0, moves: ['NEXT'] }, expected: 1 },
          { inputs: { start_day: 6, moves: ['NEXT'] }, expected: 0 },
        ],
      },
    ],
  },
})
