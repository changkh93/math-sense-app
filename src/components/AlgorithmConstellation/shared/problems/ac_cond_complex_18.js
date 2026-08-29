import { createCapabilityPrototypeKernel } from './createCapabilityPrototypeKernel.js'

export const AC_COND_COMPLEX_18 = createCapabilityPrototypeKernel({
  problemId: 'AC-COND-COMPLEX-18',
  problemVersion: 1,
  curriculum: {
    constellationId: 'constellation-1',
    routeRole: 'core',
    learningRole: 'practice',
    recommendedBand: 'E',
    prerequisites: ['AC-COND-002', 'AC-COND-NOT-13'],
  },
  identity: {
    studentTitle: '문을 열지 말지 심판하라',
    subtitle: '마스터 키 단독 경로와 카드+생체 동시 인증 경로를 결합한 복합 조건 논리식 A or (B and C)를 작성합니다.',
  },
  pythonConcepts: {
    requires: [
      'concept:function-body-focus',
      'value:boolean',
      'operator:and',
      'operator:or',
      'operator:not',
    ],
    introduces: [],
  },
  thinkingPatterns: {
    requires: [],
    introduces: [],
  },
  evidenceRecipe: {
    primitives: ['decision'],
    requiredClaims: [
      'master-key-is-independent-path',
      'card-and-bio-form-one-group',
      'all-eight-boolean-cases-covered',
    ],
  },
  modes: {
    observe: {
      prompt: '관제 기록(인증 없음: 잠김, 카드만: 잠김, 생체만: 잠김, 카드+생체: 열림, 마스터 키만: 열림)을 볼 때, 마스터 키는 없지만 카드와 생체 인식이 둘 다 통과하면 문은 열릴까요?',
      expected: '열린다 (True)',
      options: ['열린다 (True)', '열리지 않는다 (False)', '알 수 없다'],
    },
    explore: {
      lensId: 'state-transition',
      initialState: { masterKey: false, card: false, bio: false, doorOpen: false, authMode: '인증 대기' },
      frames: [
        {
          id: 'case_fff',
          operationLabel: '일반 경로: 모든 인증 없음 (F, F, F)',
          prompt: '어떤 인증도 없으므로 문은 열리지 않습니다(False).',
          stateAfter: { masterKey: false, card: false, bio: false, doorOpen: false, authMode: '인증 실패' },
        },
        {
          id: 'case_fft',
          operationLabel: '일반 경로: 생체만 통과 (F, F, T)',
          prompt: '생체만 통과하고 카드가 없으므로 카드+생체 그룹이 완성되지 않아 문이 열리지 않습니다(False).',
          stateAfter: { masterKey: false, card: false, bio: true, doorOpen: false, authMode: '인증 실패' },
        },
        {
          id: 'case_ftf',
          operationLabel: '일반 경로: 카드만 통과 (F, T, F)',
          prompt: '카드만 있고 생체 인식이 없으므로 문이 열리지 않습니다(False).',
          stateAfter: { masterKey: false, card: true, bio: false, doorOpen: false, authMode: '인증 실패' },
        },
        {
          id: 'case_ftt',
          operationLabel: '일반 경로: 카드 + 생체 통과 (F, T, T)',
          prompt: '마스터 키가 없어도 카드와 생체 인식이 둘 다 통과하여 문이 열립니다(True)!',
          stateAfter: { masterKey: false, card: true, bio: true, doorOpen: true, authMode: '카드+생체 승인' },
        },
        {
          id: 'case_tff',
          operationLabel: '마스터 경로: 마스터 키만 있음 (T, F, F)',
          prompt: '카드나 생체 인식이 없어도 마스터 키가 있으므로 문이 열립니다(True)!',
          stateAfter: { masterKey: true, card: false, bio: false, doorOpen: true, authMode: '마스터 키 승인' },
        },
        {
          id: 'case_tft',
          operationLabel: '마스터 경로: 마스터 + 생체 (T, F, T)',
          prompt: '마스터 키가 있으므로 카드 여부와 무관하게 문이 열립니다(True).',
          stateAfter: { masterKey: true, card: false, bio: true, doorOpen: true, authMode: '마스터 키 승인' },
        },
        {
          id: 'case_ttf',
          operationLabel: '마스터 경로: 마스터 + 카드 (T, T, F)',
          prompt: '마스터 키가 있으므로 생체 인식 여부와 무관하게 문이 열립니다(True).',
          stateAfter: { masterKey: true, card: true, bio: false, doorOpen: true, authMode: '마스터 키 승인' },
        },
        {
          id: 'case_ttt',
          operationLabel: '마스터 경로: 모든 인증 통과 (T, T, T)',
          prompt: '마스터 키와 카드, 생체 인식이 모두 있으므로 당연히 문이 열립니다(True)!',
          stateAfter: { masterKey: true, card: true, bio: true, doorOpen: true, authMode: '전체 승인' },
        },
      ],
      predictionPrompt: '마스터 키 경로와 카드+생체 경로 중 하나라도 완성되는 조합을 찾아보세요.',
      rulePrompt: '혼자서 충분한 조건과 반드시 함께 있어야 하는 두 조건을 괄호로 묶어 보세요.',
      ruleStatement: '마스터 키가 있거나, 카드와 생체 인식이 모두 통과했을 때 문이 열립니다.',
    },
    code: {
      entryFunction: 'can_open_security_door',
      starterCode: `def can_open_security_door(has_master_key, has_card, bio_passed):
    # 앞에서 발견한 보안 문 개방 규칙을 Python으로 표현하세요.
    pass
`,
    },
  },
  assessment: {
    publicTests: [
      { inputs: { has_master_key: false, has_card: false, bio_passed: false }, expected: false },
      { inputs: { has_master_key: false, has_card: true, bio_passed: false }, expected: false },
      { inputs: { has_master_key: false, has_card: true, bio_passed: true }, expected: true },
      { inputs: { has_master_key: true, has_card: false, bio_passed: false }, expected: true },
    ],
  },
})
