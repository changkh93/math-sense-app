import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_COND_NOT_13 = createCapabilityPrototypeKernel({
  problemId: 'AC-COND-NOT-13',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-1',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'E',
    prerequisites: ['AC-COND-001'],
  },
  identity: {
    studentTitle: '반전된 경보등',
    subtitle: '침묵 모드 설정과 반대로 작동하는 경보등을 관찰하며 참과 거짓을 뒤집는 규칙을 발견합니다.',
  },
  pythonConcepts: {
    requires: ['concept:function-body-focus', 'value:boolean'],
    introduces: ['operator:not'],
  },
  thinkingPatterns: {
    requires: [],
    introduces: [],
  },
  evidenceRecipe: {
    primitives: ['decision'],
    requiredClaims: ['boolean-inversion'],
  },
  modes: {
    observe: {
      prompt: '침묵 모드가 꺼져(False) 있을 때 경보등은 켜집니다(True). 침묵 모드를 켜면(True) 경보등은 어떻게 될까요?',
      expected: '경보등이 꺼진다 (False)',
      options: ['경보등이 꺼진다 (False)', '경보등이 켜진다 (True)', '알 수 없다'],
    },
    explore: {
      lensId: 'state-transition',
      initialState: { status: '두 상태 비교 전' },
      frames: [
        {
          id: 'case_inactive',
          operationLabel: '침묵 모드 OFF (False)',
          prompt: '침묵 모드가 꺼져 있으므로 경보등이 켜집니다(True).',
          stateAfter: { silentMode: false, alarmLightOn: true },
        },
        {
          id: 'case_active',
          operationLabel: '침묵 모드 ON (True)',
          prompt: '침묵 모드가 켜지자 경보등이 꺼집니다(False). 상태가 항상 반대로 바뀝니다!',
          stateAfter: { silentMode: true, alarmLightOn: false },
        },
        {
          id: 'case_summary',
          operationLabel: '반전 규칙 정리',
          prompt: '입력 상태가 True면 출력은 False, 입력이 False면 출력은 True가 됩니다.',
          stateAfter: { inputChanged: 'False → True', outputChanged: 'True → False' },
        },
      ],
      predictionPrompt: '침묵 모드의 상태가 바뀔 때 경보등의 상태가 어느 방향으로 바뀌는지 비교해 보세요.',
      rulePrompt: '입력 상태와 경보등 상태 사이에는 어떤 관계가 있나요?',
      ruleStatement: '침묵 모드와 경보등은 항상 반대 상태입니다. 침묵 모드가 참이면 경보등은 거짓이고, 침묵 모드가 거짓이면 경보등은 참입니다.',
    },
    code: {
      entryFunction: 'is_alarm_light_on',
      starterCode: `def is_alarm_light_on(silent_mode):
    # 앞에서 발견한 경보등 규칙을 코드로 표현하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { silent_mode: false }, expected: true },
      { inputs: { silent_mode: true }, expected: false },
    ],
  },
})
