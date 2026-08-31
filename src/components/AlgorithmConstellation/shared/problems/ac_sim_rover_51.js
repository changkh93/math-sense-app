import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_SIM_ROVER_51 = createCapabilityPrototypeKernel({
  problemId: 'AC-SIM-ROVER-51',
  problemVersion: 1,
  curriculum: {
    catalogOrder: 51,
    constellationId: 'constellation-5',
    routeRole: 'core',
    learningRole: 'anchor',
    recommendedBand: 'N',
    prerequisites: ['AC-SEQ-005', 'AC-PAT-003', 'AC-COND-ELIF-14'],
  },
  identity: {
    studentTitle: '로버의 방향 명령',
    subtitle: '명령 목록을 순서대로 처리하며 1차원 로버의 위치와 방향 상태를 갱신합니다.',
  },
  pythonConcepts: {
    requires: ['builtin:list', 'statement:for', 'statement:if', 'operator:equality', 'operator:arithmetic-state-update'],
    introduces: [],
  },
  thinkingPatterns: {
    requires: ['pattern:procedure-decomposition'],
    introduces: ['pattern:command-state-machine'],
  },
  evidenceRecipe: {
    primitives: ['container-scan', 'decision', 'scalar-sequence'],
    requiredClaims: ['COMMAND_STATE_MACHINE'],
  },
  modes: {
    observe: {
      type: 'single-choice',
      prompt: '로버가 0칸에서 오른쪽을 보고 있을 때 명령 [MOVE, TURN, MOVE]를 처리하면 최종 상태는 어떻게 될까요?',
      options: [
        { value: 'pos0_left', label: '위치 0, 왼쪽 보기' },
        { value: 'pos1_left', label: '위치 1, 왼쪽 보기' },
        { value: 'pos0_right', label: '위치 0, 오른쪽 보기' },
      ],
      expected: 'pos0_left',
    },
    explore: {
      lensId: 'state-transition',
      lensConfig: {
        introContext: {
          title: '🤖 로버 명령 실행판',
          description: '로버는 현재 위치(pos)와 바라보는 방향(direction: 1은 오른쪽, -1은 왼쪽)을 상태로 가집니다.',
          variables: [
            { name: 'start_pos', value: '0' },
            { name: 'commands', value: '[MOVE, TURN, MOVE, MOVE]', label: '명령 목록' },
            { name: 'direction', value: '1 (오른쪽)', label: '초기 방향' },
          ],
          guidance: 'MOVE는 방향만큼 위치를 옮기고, TURN은 방향만 뒤집습니다.',
        },
        initialState: { pos: 0, direction: 1, commandIndex: null, currentCommand: null },
        initialStateLabel: '시작: 위치 0, 오른쪽 보기',
        initialStepTitle: '🚀 시작 (위치 0, 방향 오른쪽)',
        initialPrompt: '명령을 하나씩 처리하며 위치와 방향 상태를 확인합니다.',
        frames: [
          {
            id: 'f0',
            stepTitle: '① 명령 1: MOVE',
            operationLabel: 'MOVE -> 방향(오른쪽)으로 한 칸',
            codeSnippet: '# pos = pos + direction',
            prompt: '방향이 오른쪽(1)이므로 위치가 1 늘어납니다.',
            stateAfter: { pos: 1, direction: 1, commandIndex: 1, currentCommand: 'MOVE' },
          },
          {
            id: 'f1',
            stepTitle: '② 명령 2: TURN',
            operationLabel: 'TURN -> 방향만 뒤집기 (위치 그대로)',
            codeSnippet: '# direction = 0 - direction',
            prompt: 'TURN은 위치를 바꾸지 않아요. 방향만 오른쪽에서 왼쪽으로 바뀝니다.',
            stateAfter: { pos: 1, direction: -1, commandIndex: 2, currentCommand: 'TURN' },
          },
          {
            id: 'f2',
            stepTitle: '③ 명령 3: MOVE',
            operationLabel: 'MOVE -> 방향(왼쪽)으로 한 칸',
            codeSnippet: '# pos = pos + (-1)',
            prompt: '이제 왼쪽을 보고 있으므로 위치가 1 줄어듭니다.',
            stateAfter: { pos: 0, direction: -1, commandIndex: 3, currentCommand: 'MOVE' },
          },
          {
            id: 'f3',
            stepTitle: '④ 명령 4: MOVE',
            operationLabel: 'MOVE -> 방향(왼쪽)으로 한 칸 더',
            codeSnippet: '# 최종 [pos -1, direction -1]',
            prompt: '같은 MOVE라도 방향 상태에 따라 결과가 다릅니다.',
            stateAfter: { pos: -1, direction: -1, commandIndex: 4, currentCommand: 'MOVE' },
          },
          {
            // 명령 순서가 결과를 바꾼다는 독립 실험: TURN을 먼저 하면 다른 곳에 도착한다.
            id: 'f4_turn_first',
            stepTitle: '⑤ 새 실험: [TURN, MOVE, MOVE, MOVE]',
            experimentReset: true,
            stateBefore: { pos: 0, direction: 1, commandIndex: null, currentCommand: null },
            operationLabel: 'TURN을 먼저 실행한 새 명령 목록',
            codeSnippet: '# 새 실험: TURN 먼저 -> 왼쪽으로 세 칸',
            prompt: '위 성공 실행과 같은 개수의 명령이지만 순서가 달라요. TURN이 먼저 오면 이동 전부 왼쪽이라 최종 위치가 달라집니다. 명령 순서가 곧 결과예요.',
            stateAfter: { pos: -3, direction: -1, commandIndex: 4, currentCommand: 'MOVE' },
          },
        ],
        predictionPrompt: '명령 목록을 순서대로 처리한 뒤 최종 [위치, 방향] 목록을 반환하세요.',
        rulePrompt: '명령 상태 갱신 규칙',
        ruleStatement: 'MOVE는 방향만큼 위치를 옮기고, TURN은 위치를 그대로 둔 채 방향만 반대로 바꾼다.',
      },
    },
    code: {
      entryFunction: 'run_rover_commands',
      starterCode: `def run_rover_commands(start_pos, commands):
    # 명령을 순서대로 처리해 최종 [위치, 방향]을 반환하세요.
    # MOVE는 방향만큼 이동, TURN은 방향만 뒤집습니다.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { start_pos: 0, commands: ['MOVE', 'TURN', 'MOVE', 'MOVE'] }, expected: [-1, -1] },
      { inputs: { start_pos: 5, commands: [] }, expected: [5, 1] },
    ],
    understandingChallenges: [
      {
        challengeId: 'uc_sim_051_1',
        title: '명령 상태 머신 이해',
        prompt: '로버의 위치와 방향 상태가 명령에 따라 어떻게 바뀌는지 점검하세요.',
        questions: [
          {
            id: 'q1',
            text: 'TURN 명령 뒤에 로버의 위치가 그대로인 이유는 무엇일까요?',
            options: [
              { value: 'turn_only_flips', label: 'TURN은 방향 상태만 바꾸는 명령이라 위치에는 영향이 없어서' },
              { value: 'turn_moves_back', label: 'TURN이 이동을 취소해서' },
              { value: 'turn_waits', label: 'TURN은 아무 일도 일어나지 않아서' },
            ],
            expected: 'turn_only_flips',
          },
          {
            id: 'q2',
            text: 'TURN을 두 번 연속 실행하면 방향은 어떻게 될까요?',
            options: [
              { value: 'restores_direction', label: '원래 방향으로 돌아온다 — 반대로 뒤집기를 두 번 하면 제자리다' },
              { value: 'stays_flipped', label: '계속 뒤집힌 상태로 유지된다' },
            ],
            expected: 'restores_direction',
          },
          {
            id: 'q3',
            text: '같은 명령 목록이라도 [MOVE, TURN, MOVE]와 [TURN, MOVE, MOVE]의 결과가 다른 이유는 무엇일까요?',
            options: [
              { value: 'order_changes_state', label: 'MOVE의 결과가 그 순간의 방향 상태에 달려 있어 명령 순서가 곧 결과라서' },
              { value: 'order_irrelevant', label: '명령은 순서와 상관없이 같은 결과를 내서' },
            ],
            expected: 'order_changes_state',
          },
        ],
      },
    ],
    transferChallenges: [
      {
        transferChallengeId: 'tc_sim_051_transfer_1',
        title: '탐사선의 단계 이동 명령',
        description: '탐사선이 깊이 수준(start_level)에서 명령 목록(commands)을 순서대로 처리합니다. STEP은 현재 방향으로 한 단계 이동, FLIP은 방향만 반대로 바꿉니다.',
        entryFunction: 'run_probe_commands',
        starterCode: `def run_probe_commands(start_level, commands):
    # 명령을 순서대로 처리해 최종 [수준, 방향]을 반환하세요.
    pass
`,
        contextCard: {
          title: '🛰️ 탐사선 명령 실행 전략',
          strategyGuide: '명령을 하나씩 확인해 STEP이면 현재 방향으로 한 칸 이동하고, FLIP이면 방향만 반대로 바꿉니다.',
        },
        thoughtCheck: {
          question: '탐사선이 [STEP, FLIP, STEP]을 처리한다면 마지막 STEP은 어느 방향으로 움직일까요?',
          options: [
            { value: 'move_backward', label: '뒤쪽 — FLIP 뒤의 방향을 따른다' },
            { value: 'move_forward', label: '앞쪽 — 처음 방향을 유지한다' },
          ],
          expected: 'move_backward',
        },
        testCases: [
          { inputs: { start_level: 2, commands: ['STEP', 'STEP'] }, expected: [4, 1] },
          { inputs: { start_level: 0, commands: ['FLIP', 'STEP'] }, expected: [-1, -1] },
        ],
      },
    ],
  },
})
