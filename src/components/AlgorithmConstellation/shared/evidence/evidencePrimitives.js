/** Neutral, composable learning-evidence primitives. */
export const EVIDENCE_PRIMITIVES = Object.freeze({
  DECISION: 'decision',
  SCALAR_SEQUENCE: 'scalar-sequence',
  CONTAINER_SCAN: 'container-scan',
  CONTAINER_MEMBERSHIP: 'container-membership',
  ORDERED_BUFFER: 'ordered-buffer',
  ENUMERATION: 'enumeration',
  GRID_FRONTIER: 'grid-frontier',
  SOURCE_DEBUG: 'source-debug',
})

const VALID_PRIMITIVES = new Set(Object.values(EVIDENCE_PRIMITIVES))

function stableHash(value) {
  let hash = 2166136261
  for (const char of value) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function eventType(scene) {
  return scene?.eventType || scene?.type || ''
}

function sceneRef(scene, fallbackIndex) {
  return {
    runtimeStepIndex: scene?.runtimeStepIndex ?? scene?.stepIndex ?? fallbackIndex,
    statementId: scene?.statementId || `stmt_${scene?.sourceSpan?.startLine ?? scene?.sourceLine ?? fallbackIndex}`,
  }
}

function stateOf(scene) {
  if (scene?.env && typeof scene.env === 'object') return scene.env
  if (scene?.displayState && typeof scene.displayState === 'object') return scene.displayState
  if (Array.isArray(scene?.stateDiff)) {
    return Object.fromEntries(scene.stateDiff
      .filter((diff) => typeof diff?.path === 'string' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(diff.path))
      .map((diff) => [diff.path, diff.after]))
  }
  if (scene?.stateDiff && typeof scene.stateDiff === 'object') return scene.stateDiff
  return {}
}

export function createLearningEvidence({
  primitive,
  claim,
  observations = [],
  confidence = 'observed',
  publicSafe = true,
  metadata = {},
}) {
  if (!VALID_PRIMITIVES.has(primitive)) {
    throw new Error(`Unsupported evidence primitive: ${primitive}`)
  }
  const normalizedObservations = observations.map((observation, index) => ({
    sceneRef: observation.sceneRef || { runtimeStepIndex: index, statementId: `stmt_${index}` },
    factCode: observation.factCode || 'OBSERVED_FACT',
    values: observation.values || {},
  }))
  const evidenceKey = JSON.stringify({ primitive, claim, normalizedObservations })
  return Object.freeze({
    evidenceVersion: 1,
    evidenceId: `ev_${primitive}_${stableHash(evidenceKey)}`,
    primitive,
    claim,
    observations: normalizedObservations,
    confidence,
    publicSafe: publicSafe === true,
    metadata,
  })
}

function addEvidence(target, definition) {
  if (!definition.observations?.length) return
  target.push(createLearningEvidence(definition))
}

/** Builds evidence only from observable public trace facts; no observation means no evidence. */
export function buildEvidenceFromTrace(recipe = {}, traceScenes = [], testResult = {}) {
  const evidences = []
  for (const primitive of recipe.primitives || []) {
    if (!VALID_PRIMITIVES.has(primitive)) continue

    if (primitive === EVIDENCE_PRIMITIVES.DECISION) {
      const observations = traceScenes.filter((scene) => ['branch-decision', 'DECISION'].includes(eventType(scene))).map((scene, index) => ({
        sceneRef: sceneRef(scene, index),
        factCode: 'BRANCH_EVALUATED',
        values: { condition: scene.metadata?.condition || scene.cond || '', result: scene.metadata?.result ?? scene.result, selectedBranch: scene.metadata?.selectedBranch || scene.selectedBranch || null },
      }))
      addEvidence(evidences, { primitive, claim: '입력에 따라 선택된 분기를 실행 장면으로 설명할 수 있다.', observations })
    }

    if (primitive === EVIDENCE_PRIMITIVES.SCALAR_SEQUENCE) {
      const observations = traceScenes.filter((scene) => eventType(scene) === 'assignment' || Object.keys(stateOf(scene)).length > 0).map((scene, index) => ({
        sceneRef: sceneRef(scene, index), factCode: 'SCALAR_STATE_CHANGED', values: { state: stateOf(scene) },
      }))
      addEvidence(evidences, { primitive, claim: '값이 실행 순서에 따라 어떻게 갱신되는지 추적할 수 있다.', observations })
    }

    if (primitive === EVIDENCE_PRIMITIVES.CONTAINER_SCAN) {
      const observations = traceScenes.filter((scene) => ['loop-iteration', 'LOOP_FOR'].includes(eventType(scene))).map((scene, index) => ({
        sceneRef: sceneRef(scene, index), factCode: 'CONTAINER_ITEM_VISITED', values: { item: scene.metadata?.item ?? scene.item, iteration: scene.metadata?.iteration ?? index },
      }))
      addEvidence(evidences, { primitive, claim: '컨테이너의 항목을 정해진 순서로 빠짐없이 확인한다.', observations })
    }

    if (primitive === EVIDENCE_PRIMITIVES.CONTAINER_MEMBERSHIP) {
      const observations = traceScenes.filter((scene) => {
        const state = stateOf(scene)
        return scene.metadata?.operation === 'set.add' || state.visited !== undefined || state.seen !== undefined || state.kinds !== undefined
      }).map((scene, index) => ({
        sceneRef: sceneRef(scene, index), factCode: 'MEMBERSHIP_STATE_CHANGED', values: { operation: scene.metadata?.operation || null, state: stateOf(scene) },
      }))
      addEvidence(evidences, { primitive, claim: '이미 기록한 항목과 새 항목을 구분한다.', observations })
    }

    if (primitive === EVIDENCE_PRIMITIVES.ORDERED_BUFFER) {
      const observations = traceScenes.filter((scene) => {
        const state = stateOf(scene)
        return ['append', 'appendleft', 'popleft', 'pop'].includes(scene.metadata?.operation) || state.queue !== undefined || state.q !== undefined || state.stack !== undefined
      }).map((scene, index) => ({
        sceneRef: sceneRef(scene, index), factCode: 'BUFFER_OPERATION', values: { operation: scene.metadata?.operation || null, state: stateOf(scene) },
      }))
      addEvidence(evidences, { primitive, claim: '추가·제거 위치가 처리 순서를 어떻게 바꾸는지 설명한다.', observations })
    }

    if (primitive === EVIDENCE_PRIMITIVES.ENUMERATION) {
      const observations = traceScenes.filter((scene) => {
        const state = stateOf(scene)
        return ['loop-iteration', 'LOOP_FOR'].includes(eventType(scene)) && (state.i !== undefined || state.j !== undefined)
      }).map((scene, index) => ({
        sceneRef: sceneRef(scene, index), factCode: 'CANDIDATE_ENUMERATED', values: { i: stateOf(scene).i, j: stateOf(scene).j },
      }))
      addEvidence(evidences, { primitive, claim: '후보를 중복 없이 빠짐없이 열거한다.', observations })
    }

    if (primitive === EVIDENCE_PRIMITIVES.GRID_FRONTIER) {
      const observations = traceScenes.filter((scene) => {
        const state = stateOf(scene)
        return state.r !== undefined && state.c !== undefined && (state.dist !== undefined || state.queue !== undefined)
      }).map((scene, index) => ({
        sceneRef: sceneRef(scene, index), factCode: 'GRID_FRONTIER_VISITED', values: { r: stateOf(scene).r, c: stateOf(scene).c, distance: stateOf(scene).dist },
      }))
      addEvidence(evidences, { primitive, claim: '격자 frontier가 거리 순서에 따라 확장되는지 확인한다.', observations })
    }

    if (primitive === EVIDENCE_PRIMITIVES.SOURCE_DEBUG) {
      const observations = traceScenes.filter((scene) => eventType(scene) === 'runtime-error' || scene.metadata?.firstMismatch === true).map((scene, index) => ({
        sceneRef: sceneRef(scene, index), factCode: 'FIRST_ERROR_CANDIDATE', values: { errorCode: scene.metadata?.errorCode || testResult.errorCode || null },
      }))
      addEvidence(evidences, { primitive, claim: '최종 결과보다 앞선 최초 오류 후보 장면을 특정한다.', observations })
    }
  }
  return evidences
}
