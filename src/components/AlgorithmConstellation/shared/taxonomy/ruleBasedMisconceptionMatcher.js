/**
 * Deterministic misconception candidates for AC-COND-001.
 * A diagnosis is only made as strongly as the available four-scene evidence allows.
 */

function candidate({ misconceptionCode, title, description, guidance, diagnosticMission, confidence }) {
  return {
    category: 'COND',
    misconceptionCode,
    title,
    description,
    guidance,
    diagnosticMission,
    confidence,
  }
}

export function matchRuleBasedMisconception({ testResults = [], syntaxError = null } = {}) {
  if (syntaxError) {
    return {
      category: 'PROTOCOL_SYNTAX',
      misconceptionCode: 'SYNTAX-REPAIR-01',
      title: '문법 점검 필요 (Protocol Repair)',
      description: '알고리즘 논리 이전에 Python 문법을 점검해야 합니다.',
      guidance: '들여쓰기, 콜론(:), 괄호와 함수 이름을 차례로 확인하세요.',
      confidence: 1,
      diagnosticMission: {
        type: 'syntax_check',
        prompt: '문법 오류를 먼저 해결한 후 다시 탐사해 보세요.',
      },
    }
  }

  if (!Array.isArray(testResults) || testResults.length === 0) return null

  // 1. Incomplete solution / missing return (e.g. pass returning None / null)
  const hasMissingReturn = testResults.every(
    (t) => t.actual === null || t.actual === undefined
  )
  if (hasMissingReturn) {
    return {
      category: 'INCOMPLETE_SOLUTION',
      misconceptionCode: 'MISSING-RETURN-01',
      title: '아직 코드가 완성되지 않았어요',
      description: '함수가 아직 결과를 돌려주지(return) 않고 있습니다.',
      guidance: 'pass는 아직 할 일을 정하지 않았다는 뜻입니다. 앞서 발견한 규칙을 return 문과 함께 작성해 보세요.',
      confidence: 1,
      diagnosticMission: {
        type: 'missing_return_guide',
        prompt: '함수 안에서 return 문으로 결과를 돌려주는 방법을 확인해 보세요.',
      },
    }
  }
  const isPatternTest = testResults.some((t) => typeof t?.inputs?.time === 'number')
  if (isPatternTest) {
    const resultsByTime = new Map()
    for (const test of testResults) {
      if (typeof test?.inputs?.time === 'number' && typeof test.actual === 'boolean') {
        resultsByTime.set(test.inputs.time, test.actual)
      }
    }

    const t0 = resultsByTime.get(0)
    const t1 = resultsByTime.get(1)
    const t2 = resultsByTime.get(2)
    const t3 = resultsByTime.get(3)
    const t6 = resultsByTime.get(6)

    // Constant result
    if (resultsByTime.size >= 4 && new Set(resultsByTime.values()).size === 1) {
      return {
        category: 'PAT',
        misconceptionCode: 'PAT-CONSTANT-01',
        title: '시간과 무관한 고정값 반환',
        description: '모든 시간에서 다리가 항상 같은 상태(True 또는 False)로 판정되었습니다.',
        guidance: '0초(열림)와 1초(닫힘)처럼 시간에 따라 결과가 달라져야 합니다. time 변수를 사용해 보세요.',
        confidence: 1,
        diagnosticMission: { type: 'time_contrast', prompt: '0초와 1초의 다리 상태가 왜 달라야 하는지 비교해 보세요.' },
      }
    }

    // Inverted logic
    if (t0 === false && t1 === true && t2 === true && t3 === false) {
      return {
        category: 'PAT',
        misconceptionCode: 'PAT-INVERTED-01',
        title: '신호 주기 반전 (열림/닫힘 반대)',
        description: '다리가 열려야 하는 0초, 3초에 닫히고, 닫혀야 하는 1초, 2초에 열렸습니다.',
        guidance: 'time % 3 == 0 일 때 열림(True)이고, 나머지가 있을 때 닫힘(False)이어야 합니다.',
        confidence: 0.95,
        diagnosticMission: { type: 'condition_inversion', prompt: '== 0 과 != 0 의 조건을 확인해 보세요.' },
      }
    }

    // Hardcoded single value (e.g. time == 3 or time <= 3)
    if (t3 === true && (t6 === false || (resultsByTime.has(9) && resultsByTime.get(9) === false))) {
      return {
        category: 'PAT',
        misconceptionCode: 'PAT-HARDCODE-01',
        title: '일회성 시간 비교 vs 주기적 모듈로(%)',
        description: '3초는 통과했지만 6초나 9초 등 더 큰 주기에서 실패했습니다.',
        guidance: '특정 숫자(`time == 3`)만 비교하면 큰 시간을 처리할 수 없습니다. 주기 연산자 `time % 3 == 0`을 사용해 보세요.',
        confidence: 0.9,
        diagnosticMission: { type: 'infinite_periodicity', prompt: '시간이 9초, 99초로 무한히 커질 때도 열리게 하려면 어떤 연산자가 필요할까요?' },
      }
    }

    // Even cycle confusion (time % 2 == 0)
    if (t0 === true && t2 === true && t3 === false) {
      return {
        category: 'PAT',
        misconceptionCode: 'PAT-CYCLE-01',
        title: '주기 길이 불일치 (2초 vs 3초)',
        description: '2초에서 열리고 3초에서 닫혀 2초 주기로 동작하고 있습니다.',
        guidance: '문제에서 요구한 주기는 3초입니다. 모듈로 나눗셈의 기준을 3으로 설정했는지 확인하세요.',
        confidence: 0.85,
        diagnosticMission: { type: 'cycle_check', prompt: '다리가 3초마다 열리려면 `time % ? == 0` 이어야 할까요?' },
      }
    }
  }

  const resultsByInput = new Map()
  for (const test of testResults) {
    if (typeof test?.inputs?.s1 !== 'boolean' || typeof test?.inputs?.s2 !== 'boolean') continue
    if (typeof test.actual !== 'boolean') continue
    resultsByInput.set(`${test.inputs.s1}_${test.inputs.s2}`, test.actual)
  }

  const tt = resultsByInput.get('true_true')
  const tf = resultsByInput.get('true_false')
  const ft = resultsByInput.get('false_true')
  const ff = resultsByInput.get('false_false')
  const hasFullTruthTable = [tt, tf, ft, ff].every((value) => typeof value === 'boolean')

  if (hasFullTruthTable) {
    if (tt === tf && tf === ft && ft === ff) {
      return candidate({
        misconceptionCode: 'COND-CONSTANT-01',
        title: '입력과 무관한 고정값 반환',
        description: '네 가지 입력에서 모두 같은 결과가 관찰되었습니다.',
        guidance: '둘 다 켜진 장면과 둘 다 꺼진 장면의 결과가 정말 같아야 하는지 비교해 보세요.',
        confidence: 1,
        diagnosticMission: { type: 'contrast_prediction', prompt: '(ON, ON)과 (OFF, OFF)의 결과를 먼저 손으로 적어보세요.' },
      })
    }

    if ((tt === true && tf === true && ft === false && ff === false) ||
        (tt === true && tf === false && ft === true && ff === false)) {
      const ignoredInput = tf ? '스위치 2' : '스위치 1'
      return candidate({
        misconceptionCode: 'COND-SINGLE-INPUT-01',
        title: '한 스위치만 결과에 반영됨',
        description: `${ignoredInput}의 상태를 바꿔도 결과가 달라지지 않습니다.`,
        guidance: '한 스위치는 그대로 두고 다른 스위치만 바꾼 두 장면을 비교해 보세요.',
        confidence: 1,
        diagnosticMission: { type: 'variable_isolation', prompt: '한 번에 스위치 하나만 바꾸면 결과는 언제 달라져야 할까요?' },
      })
    }

    if (tt === true && tf === true && ft === true && ff === false) {
      return candidate({
        misconceptionCode: 'COND-AND-OR-01',
        title: '하나라도 켜짐과 둘 다 켜짐의 혼동',
        description: '스위치 하나만 켜진 두 장면에서도 게이트가 열렸습니다.',
        guidance: '스위치 하나만 켜져도 열려야 하나요, 아니면 두 스위치가 동시에 켜져야 하나요?',
        confidence: 1,
        diagnosticMission: { type: 'scene_comparison', prompt: '(ON, OFF), (OFF, ON), (ON, ON)을 나란히 비교해 보세요.' },
      })
    }

    if (tt === false) {
      return candidate({
        misconceptionCode: 'COND-ALL-TRUE-01',
        title: '모두 켜진 기준 장면 점검',
        description: '두 스위치가 모두 켜진 기준 장면에서 게이트가 열리지 않았습니다.',
        guidance: '두 스위치가 모두 ON인 장면의 예상 결과부터 다시 정해 보세요.',
        confidence: 0.95,
        diagnosticMission: { type: 'truth_prediction', prompt: '(ON, ON)이면 게이트는 열려야 할까요?' },
      })
    }
  }

  // Partial evidence can match several different programs. Keep the language cautious.
  if (tf === true || ft === true) {
    return candidate({
      misconceptionCode: 'COND-AND-OR-01',
      title: '조건 결합 방식 점검',
      description: '스위치 하나만 켜진 장면에서 예상과 다른 결과가 관찰되었습니다.',
      guidance: '나머지 한쪽만 켜진 장면도 실행해 보고, 두 입력이 결과에 모두 반영되는지 확인하세요.',
      confidence: 0.55,
      diagnosticMission: { type: 'complete_truth_table', prompt: '아직 실행하지 않은 스위치 조합까지 표에 채워보세요.' },
    })
  }

  if (tt === false) {
    return candidate({
      misconceptionCode: 'COND-ALL-TRUE-01',
      title: '모두 켜진 기준 장면 점검',
      description: '두 스위치가 모두 켜진 장면에서 예상과 다른 결과가 관찰되었습니다.',
      guidance: '기준 장면의 예상 결과를 정한 뒤, 코드가 그 결과에 도달하는지 한 줄씩 따라가 보세요.',
      confidence: 0.75,
      diagnosticMission: { type: 'truth_prediction', prompt: '(ON, ON)의 예상 결과를 먼저 적어보세요.' },
    })
  }

  return null
}
