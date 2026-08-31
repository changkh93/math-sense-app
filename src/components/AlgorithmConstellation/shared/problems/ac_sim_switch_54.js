import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_SIM_SWITCH_54 = createCapabilityPrototypeKernel({
  problemId: 'AC-SIM-SWITCH-54',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 54,
    constellationId: 'constellation-5',
    routeRole: 'core',
    learningRole: 'anchor',
    recommendedBand: 'N',
    prerequisites: ['AC-SEQ-005', 'AC-COND-NOT-13'],
  },
  identity: {
    studentTitle: '꺼졌다 켜지는 행성 스위치',
    subtitle: '명령이 가리킨 인덱스의 스위치만 반대 상태로 뒤집어, 명령 목록을 순서대로 적용합니다.',
  },
  pythonConcepts: {
    requires: ['builtin:list', 'statement:for', 'operator:not'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:command-state-machine'],
    introduces: ['pattern:indexed-toggle-update'],
  },
  evidenceRecipe: {
    primitives: ['container-scan', 'decision'],
    requiredClaims: ['INDEXED_TOGGLE_UPDATE'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '스위치 [꺼짐, 켜짐, 꺼짐]에 명령 [1]을 처리하면 어떤 상태가 될까요?',
      options: [
        { value: 'middle_off', label: '[꺼짐, 꺼짐, 꺼짐] — 가운데 칸만 반대로 뒤집힌다' },
        { value: 'all_flip', label: '[켜짐, 꺼짐, 켜짐] — 모든 칸이 뒤집힌다' },
        { value: 'unchanged', label: '[꺼짐, 켜짐, 꺼짐] — 아무 일도 일어나지 않는다' },
      ],
      expected: 'middle_off',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🪐 행성 스위치 관찰판',
          description: '명령 목록의 숫자는 인덱스입니다. 명령 하나당 그 인덱스의 스위치 하나만 반대 상태로 뒤집습니다.',
          variables: [
            { name: 'switches', value: '[False, True, False]' },
            { name: 'commands', value: '[0, 2, 0]' },
            { name: 'rule', value: '같은 칸을 두 번 뒤집으면 원래대로', label: '반전 규칙' },
          ],
          guidance: '선택된 인덱스와 그 칸의 전/후 값에 주목하세요. 다른 칸은 그대로입니다.',
        },
        initialState: { selectedIndex: null, switchBefore: null, switchAfter: null, switches: [] },
        initialStateLabel: '시작: [False, True, False]',
        initialStepTitle: '🚀 시작 (스위치 3칸)',
        initialPrompt: '명령 [0, 2, 0]을 하나씩 처리하며 선택된 칸의 변화를 확인합니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① 명령 0 처리',
            operationLabel: '인덱스 0 선택: False -> True',
            codeSnippet: '# switches[0] = not switches[0]',
            prompt: '0번 칸만 꺼짐에서 켜짐으로 바뀌고, 다른 칸은 그대로예요.',
            stateAfter: { selectedIndex: 0, switchBefore: false, switchAfter: true, switches: [true, true, false] },
          },
          {
            id: 'f1',
            stepTitle: '② 명령 2 처리',
            operationLabel: '인덱스 2 선택: False -> True',
            codeSnippet: '# switches[2] = not switches[2]',
            prompt: '이번에는 2번 칸만 뒤집힙니다.',
            stateAfter: { selectedIndex: 2, switchBefore: false, switchAfter: true, switches: [true, true, true] },
          },
          {
            id: 'f2',
            stepTitle: '③ 명령 0 다시 처리',
            operationLabel: '인덱스 0 선택: True -> False (두 번째 반전은 원래대로)',
            codeSnippet: '# 같은 칸을 두 번 뒤집으면 원래 상태',
            prompt: '같은 칸을 두 번 뒤집으면 처음 상태로 돌아와요. 반전은 두 번 하면 취소됩니다.',
            stateAfter: { selectedIndex: 0, switchBefore: true, switchAfter: false, switches: [false, true, true] },
          },
          {
            // 홀수 칸만 반전하는 독립 실험: 선택된 칸만 바뀐다는 규칙을 다시 확인.
            id: 'f3_single',
            stepTitle: '④ 새 실험: [False, True, False]에 명령 [1]',
            experimentReset: true,
            stateBefore: { selectedIndex: null, switchBefore: null, switchAfter: null, switches: [] },
            operationLabel: '인덱스 1만 선택: True -> False',
            codeSnippet: '# 새 실험: 명령 [1] -> 가운데 칸만 반전',
            prompt: '명령이 하나면 칸 하나만 바뀌어요. 전체가 뒤집히는 게 아니라 명령이 가리킨 칸만 뒤집힙니다.',
            stateAfter: { selectedIndex: 1, switchBefore: true, switchAfter: false, switches: [false, false, false] },
          },
        ],
        predictionPrompt: '명령 목록을 순서대로 적용해 반전된 스위치 목록을 반환하세요.',
        rulePrompt: '선택 칸 반전 규칙',
        ruleStatement: '명령이 가리킨 인덱스의 칸만 반대 상태로 뒤집는다. 같은 칸을 짝수 번 뒤집으면 원래 상태다.',
      },
    },
    code: {
      entryFunction: 'toggle_planet_switches',
      starterCode: `def toggle_planet_switches(switches, commands):
    # 명령이 가리킨 인덱스의 스위치만 반대로 뒤집어 반환하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { switches: [false, true, false], commands: [0, 2, 0] }, expected: [false, true, true] },
      { inputs: { switches: [true, false], commands: [] }, expected: [true, false] },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_sim_054_1',
        title: '선택 칸 반전 이해',
        prompt: '인덱스 명령에 따른 스위치 반전 원리를 점검하세요.',
        questions: [
          {
            id: 'q1',
            text: '명령 [1]을 처리할 때 0번과 2번 칸이 그대로인 이유는 무엇일까요?',
            options: [
              { value: 'only_selected_index', label: '명령이 가리킨 1번 칸만 뒤집기 때문에' },
              { value: 'left_to_right', label: '왼쪽부터 순서대로만 뒤집히기 때문에' },
              { value: 'even_only', label: '짝수 번째 칸은 뒤집을 수 없기 때문에' },
            ],
            expected: 'only_selected_index',
          },
          {
            id: 'q2',
            text: '같은 칸을 두 번 뒤집으면 원래 상태로 돌아오는 이유는 무엇일까요?',
            options: [
              { value: 'double_toggle_restores', label: '반전을 두 번 하면 다시 제자리라 꺼짐-켜짐-꺼짐처럼 되돌아가서' },
              { value: 'second_ignored', label: '두 번째 명령은 무시되기 때문에' },
            ],
            expected: 'double_toggle_restores',
          },
          {
            id: 'q3',
            text: '명령 목록이 빈 목록([])이면 결과는 어떻게 될까요?',
            options: [
              { value: 'unchanged', label: '아무 칸도 뒤집히지 않아 처음 상태 그대로다' },
              { value: 'all_off', label: '모든 칸이 꺼진다' },
            ],
            expected: 'unchanged',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_sim_054_transfer_1',
        title: '잠금 장치가 있는 조명 패널',
        description: '조명 패널(lights)에 명령 목록(commands)을 적용합니다. 패널이 잠겨 있으면(panel_locked가 True) 원래 상태를 그대로 돌려줍니다.',
        entryFunction: 'apply_light_commands',
        starterCode: `def apply_light_commands(lights, commands, panel_locked):
    # panel_locked가 True면 원본을 그대로, False면 명령 칸만 반전해 반환하세요.
    pass
`,
        contextCard: {
          title: '💡 조명 패널 수리 전략',
          strategyGuide: '패널이 잠겨 있으면 원래 상태를 그대로 돌려주고, 열려 있으면 명령이 가리킨 칸만 반대 상태로 뒤집습니다.',
        },
        thoughtCheck: {
          question: '패널이 잠겨 있을 때 명령 [0]을 보내면 어떻게 될까요?',
          options: [
            { value: 'unchanged', label: '원래 상태 그대로다' },
            { value: 'toggled', label: '0번 칸만 반전된다' },
          ],
          expected: 'unchanged',
        },
        testCases: [
          { inputs: { lights: [false, true], commands: [0], panel_locked: false }, expected: [true, true] },
          { inputs: { lights: [false, true], commands: [0], panel_locked: true }, expected: [false, true] },
        ],
      },
    ],
  },
})
