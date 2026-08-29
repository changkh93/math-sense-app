import { deepFreeze, validateProblemKernelSchema } from '../contracts/problemKernelSchema.js'

function withTestIds(tests = [], prefix = 'p') {
  return tests.map((test, index) => ({ id: test.id || `${prefix}${index + 1}`, ...test }))
}

/**
 * Normalizes a compact capability prototype into the same public contract used
 * by the original seven kernels. Prototype metadata may be compact, but the
 * runtime and MissionShell must never receive a second, incompatible shape.
 */
export function createCapabilityPrototypeKernel(definition) {
  const id = definition.problemId
  const version = definition.problemVersion || 1
  const family = id.split('-')[1] || 'GEN'
  const observe = definition.modes?.observe || {}
  const explore = definition.modes?.explore || {}
  const code = definition.modes?.code || {}
  const publicTests = withTestIds(definition.assessment?.publicTests)

  const kernel = {
    id,
    version,
    schemaVersion: 1,
    family,
    curriculum: definition.curriculum,
    evidenceRecipe: definition.evidenceRecipe,
    pythonConcepts: definition.pythonConcepts,
    thinkingPatterns: definition.thinkingPatterns || { requires: [], introduces: [] },

    identity: {
      systemTitle: `${family} capability prototype`,
      studentTitle: definition.identity?.studentTitle,
      subtitle: definition.identity?.subtitle,
      difficultyLevel: definition.curriculum?.recommendedBand === 'N' ? 3 : 2,
    },

    learning: {
      objective: definition.identity?.subtitle,
      thinkingSkills: definition.evidenceRecipe?.primitives || ['algorithmic-reasoning'],
      concepts: definition.evidenceRecipe?.requiredClaims || ['capability-prototype'],
      prerequisites: definition.curriculum?.prerequisites || [],
    },

    shells: {
      explorer: {
        story: definition.identity?.subtitle,
        terms: { result: '탐사 결과' },
        visualTheme: 'capability_prototype',
      },
      navigator: {
        story: definition.identity?.subtitle,
        terms: { result: '실행 결과' },
        visualTheme: 'capability_prototype',
      },
      pro: {
        story: definition.identity?.subtitle,
        terms: { result: 'return value' },
        visualTheme: 'code_terminal',
      },
    },

    modes: {
      observe: {
        givenRecords: [
          {
            label: '탐사 기록',
            input: String(observe.prompt || ''),
            result: true,
            text: observe.prompt || definition.identity?.subtitle,
          },
        ],
        truthTable: observe.prompt
          ? [{
              input: observe.prompt,
              expected: observe.expected,
              prompt: observe.prompt,
              answer: { type: 'single-choice', options: observe.options || [] },
            }]
          : [],
      },
      explore: {
        lensId: explore.lensId || explore.lens || definition.curriculum?.lensId || 'prototype-concept',
        lensConfig: {
          defaultValues: explore.defaultValues || {},
          ruleStatement: explore.ruleStatement || definition.identity?.subtitle,
          ...(explore.lensConfig || {}),
          initialState: explore.initialState || explore.lensConfig?.initialState,
          frames: explore.frames || explore.lensConfig?.frames,
          predictionPrompt: explore.predictionPrompt || explore.lensConfig?.predictionPrompt,
          rulePrompt: explore.rulePrompt || explore.lensConfig?.rulePrompt,
        },
        allowedManipulations: explore.allowedManipulations || ['inspect-example', 'confirm-rule'],
      },
      code: {
        entryFunction: code.entryFunction,
        starterCode: code.starterCode,
      },
    },

    runtime: {
      language: 'python',
      worldModel: 'function_return',
      limits: {
        maxExecutionMs: 1500,
        maxSteps: 50000,
        maxOutputBytes: 16384,
        maxMemoryMb: 64,
        maxTraceEvents: 500,
        maxRawEvents: 500,
        maxMeaningfulEvents: 50,
      },
      seedContract: { policy: 'deterministic_practice' },
    },

    assessment: {
      publicTests,
      diagnosticTests: publicTests,
      understandingChallenges: definition.assessment?.understandingChallenges || definition.understandingChallenges || [],
      transferChallenges: definition.assessment?.transferChallenges || definition.transferChallenges || [],
      hiddenTestsRef: `sec_${id.toLowerCase().replaceAll('-', '_')}_hidden_suite_v1`,
      transferFamily: definition.curriculum?.transferTemplateId || `${family.toLowerCase()}-prototype-transfer`,
      transferDescription: '같은 사고 규칙을 새로운 탐사 상황에 적용하기',
      completionEvidence: {
        resultStar: 'hidden_suite_pass',
        understandingStar: 'fresh_micro_evidence',
        transferStar: 'fresh_transfer_pass',
      },
    },

    scaffolding: {
      publicPolicy: { parsonAvailable: true, maxHints: 3 },
    },
  }

  const errors = validateProblemKernelSchema(kernel)
  if (errors.length > 0) {
    throw new Error(`Invalid capability prototype ${id}: ${errors.join('; ')}`)
  }
  return deepFreeze(kernel)
}
