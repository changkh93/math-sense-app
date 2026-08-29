# LUMI 알고리즘 성단 — Wave A 구현 평가 및 개발 가이드

> 대상: 후속 구현을 담당하는 AI/개발자  
> 범위: 성단 0 Wave A의 공통 기반과 4개 문제 구현  
> 문서 우선순위: **사용자의 최신 결정 → 이 가이드 → Wave A v2 계획 → 기존 문서**

## 1. 최종 평가

Wave A v2는 성단 0을 `실행 순서 → 상태 갱신 → 정보 보존 → 반복 상태 추적`으로 연결한 점이 좋고, 문제별 전용 화면을 늘리지 않고 계약과 검증기로 확장하려는 방향도 적절하다. 그대로 구현하기에는 다음 세 가지가 치명적이다.

1. “Python은 이미 배웠다”는 전제가 최신 제품 원칙과 충돌한다.
2. 첫 문제의 연산이 순서에 무관하여 목표 오개념을 실제로 판별할 수 없다.
3. 현재 이해 확인 UI와 공개 계약이 참/거짓 중심이라 Wave A의 수치·상태 질문을 표현하지 못한다.

따라서 **조건부 승인**한다. 아래 P0 수정사항을 먼저 반영한 뒤 구현해야 한다.

### 채택·수정·폐기 결정

| 계획 요소 | 결정 | 구현 기준 |
|---|---|---|
| 성단 0의 10문제 지도와 선수 DAG | 채택 | Wave A는 01, 02, 04, 06만 구현한다. |
| 실행 추적 중심 학습 목표 | 채택 | 문법 암기가 아니라 상태 변화의 원인 설명을 증거로 삼는다. |
| Python 선행 학습 가정 | 폐기 | LUMI 안에서 학습 이력이 없는 개념은 **미학습**으로 취급한다. |
| First Encounter | 강화 | `requires`와 `introduces` 모두 미이수라면 Code 이전에 한 번만 제공한다. |
| 문법과 문제 해결 패턴 구분 | 채택 | 서로 다른 레지스트리와 메타데이터로 관리한다. |
| 10대 저작 불변식 | 수정 채택 | 실제 저장 필드와 채점 계약에 맞게 수정한다. |
| 문제별 전용 Explore UI | 폐기 | 하나의 설정 기반 상태 전이 Lens를 공유한다. |
| `draft → prototype → pilot → published` 필수 흐름 | 폐기 | Wave A는 자동 검증 기반 `draft → prototype → published`를 사용한다. |
| 접근성 검사·학생 파일럿·출판 승인 | 출판 비차단 | 추후 품질 관찰 항목일 뿐 이번 공개의 선행 조건이 아니다. |

## 2. Wave A 제품 불변 원칙

### 2.1 미학습 우선 원칙

학생이 다른 MetaSense 과정에서 배웠을 가능성을 추측하지 않는다. 알고리즘 성단의 학습 기록에 해당 항목이 없으면 미학습으로 판단한다.

- `requires`: 문제 풀이에 필요하지만 이 문제에서 처음 가르치려는 핵심은 아닌 항목
- `introduces`: 이 문제에서 처음 발견하게 할 항목
- 미이수 `requires`와 `introduces`는 모두 Code 진입 전에 First Encounter로 제공한다.
- 완료한 항목은 로컬 학습 기록을 이용해 다시 띄우지 않는다.
- First Encounter는 정답 코드를 주는 해설이 아니라 작은 예측 문제와 최소 예제로 구성한다.

### 2.2 사고 목표와 Python 도구의 분리

문제의 `learningObjectives`에는 사고 목표를 쓰고, Python 문법/도구는 `pythonConcepts`, 재사용 가능한 해결 전략은 `thinkingPatterns`에 둔다.

예:

```js
learningObjectives: ['상태 변화의 원인이 된 실행 순간을 찾는다'],
pythonConcepts: {
  requires: ['concept:function-body-focus', 'operator:assignment'],
  introduces: [],
},
thinkingPatterns: {
  requires: [],
  introduces: ['pattern:preserve-before-overwrite'],
},
```

`temp`라는 변수명 사용 자체를 정답 조건으로 삼지 않는다. `temp` 패턴은 정보 보존 전략이며 Python 튜플 교환처럼 정확한 대안 풀이도 통과시킨다.

### 2.3 빠른 공개 원칙

Wave A의 상태 흐름은 다음과 같다.

```text
draft
  → 공통 계약·권위 채점·번들 누출·빌드 검증 통과
prototype
  → 네 문제의 전체 학습 루프와 회귀 테스트 통과
published
```

파일럿, 별도 접근성 승인, 수동 출판 승인은 `published`의 차단 조건이 아니다. 실제 운영에서 발견한 문제는 버전 증가와 회귀 테스트 추가로 고친다.

## 3. 구현 전 반드시 해결할 P0

### P0-1. 이해 확인 계약을 데이터 기반 선택지로 일반화

현재 `UnderstandingCheckMode.jsx`의 참/거짓 고정 UI와 “열림/닫힘” 문구는 조건 문제의 잔재다. Wave A를 추가하기 전에 모든 문제 계열에서 재사용할 선택지 계약으로 교체한다.

서버가 공개할 질문 형식:

```js
{
  id: 'SEQ-STATE-AFTER-SCALE',
  text: '두 번째 상태 갱신 직후 위치는 얼마인가요?',
  options: [
    { value: '5', label: '5' },
    { value: '10', label: '10' },
    { value: '7', label: '7' },
  ],
}
```

Private 정의에는 위 필드와 함께 `expected: '10'`을 둔다. `publicUnderstandingChallenge()`은 `id`, `text`, `options`만 전달하고 `expected`는 절대 전달하지 않는다.

구현 요구:

- `UnderstandingCheckMode`는 `question.options`를 렌더링한다.
- 선택값은 문자열로 직렬화하여 비교 계약을 단순화한다.
- 기존 Boolean 문제는 `true/false` 대신 `'true'/'false'` 값의 옵션으로 호환한다.
- 질문별 답변이 모두 선택되기 전 제출하지 못하게 한다.
- 오류 문구에서 스위치, 게이트, 열림/닫힘 같은 도메인 고정 표현을 제거한다.
- 기존 공개 문제의 이해 질문도 같은 계약으로 작동하는지 함께 점검한다.
- 클라이언트 응답과 Callable 응답 어디에도 `expected`가 노출되지 않는 테스트를 추가한다.

### P0-2. AC-EXP-SEQ-01을 순서 민감 문제로 수정

계획의 `+5 → -2 → +3`은 순서를 바꿔도 최종 합이 같다. `SEQ-REVERSE-ORDER`를 판별할 수 없으므로 사용하지 않는다.

권장 인터페이스:

```python
def trace_rover_path(start, boost, scale, drift):
    pos = start
    pos = pos + boost
    pos = pos * scale
    pos = pos - drift
    return pos
```

덧셈·곱셈·뺄셈을 섞어 순서를 바꾸면 결과가 달라지게 한다. 공개/히든 테스트의 입력도 반드시 바꾼다. 무인자 함수와 고정값 `6` 반환은 허용하지 않는다.

질문은 “2번째 줄”처럼 편집에 따라 의미가 달라지는 표현 대신 “두 번째 상태 갱신 직후” 또는 실제 trace event ID를 사용한다.

### P0-3. 하나의 공용 상태 전이 Lens 마련

네 문제마다 React 컴포넌트를 만들지 않는다. `StateTransitionLens` 하나를 만들거나 기존 범용 Lens를 확장하여 설정으로 동작하게 한다.

권장 공개 설정:

```js
explore: {
  lensId: 'state-transition',
  initialState: { pos: 1 },
  frames: [
    { id: 'boost', operationLabel: '+4', stateAfter: { pos: 5 } },
    { id: 'scale', operationLabel: '×2', stateAfter: { pos: 10 } },
    { id: 'drift', operationLabel: '-3', stateAfter: { pos: 7 } },
  ],
  predictionPrompt: '다음 명령 뒤의 위치를 먼저 예상해 보세요.',
  rulePrompt: '명령의 순서가 바뀌면 결과도 같을까요?',
  ruleStatement: '프로그램은 명령을 순서대로 실행하며, 각 결과가 다음 상태가 됩니다.',
}
```

Lens는 다음만 지원하면 충분하다.

- 이전/다음 프레임 이동
- 현재 상태와 직전 상태의 차이 표시
- 다음 상태 예측 후 실제 상태 공개
- 예측 후에만 규칙 문장 공개

완성 코드를 Lens에 보여주지 않는다. Code 실행 후의 정밀 Time-Travel은 기존 Semantic Trace를 그대로 사용한다.

## 4. 공통 데이터 계약

### 4.1 Public Kernel

기존 `createCapabilityPrototypeKernel()`과 canonical schema를 재사용한다. 새 문제 전용 스키마를 만들지 않는다.

필수 항목:

```js
{
  id,
  version,
  title,
  entryFunction,
  functionSignature,
  learningObjectives,
  pythonConcepts: { requires, introduces },
  thinkingPatterns: { requires, introduces },
  observe,
  explore,
  code,
  trace,
  evidenceRecipe,
  transfer,
}
```

Factory가 `thinkingPatterns`와 전체 `explore` 설정을 canonical kernel에 전달하도록 한 번만 확장한다. 문제 파일에서 factory 결과를 다시 수동 변형하지 않는다.

### 4.2 Python 개념 레지스트리

다음을 추가한다.

- `concept:function-body-focus`
- `operator:assignment`
- `operator:arithmetic-state-update`

`statement:for`, `builtin:range`는 기존 항목을 재사용한다. 같은 개념 ID를 다른 설명으로 중복 등록하지 않는다.

각 항목의 필수 필드:

```js
{
  conceptId,
  displayName,
  kind,
  canonicalFirstProblemId,
  why,
  tinyExample,
  syntaxExample,
  predictionCheck: { prompt, options, expected },
  protocolRepairId,
}
```

### 4.3 문제 해결 패턴 레지스트리

`pattern:preserve-before-overwrite`는 Python 개념 레지스트리에 넣지 않는다. 다음 파일에 별도 등록한다.

```text
src/components/AlgorithmConstellation/shared/patterns/problemSolvingPatternRegistry.js
```

First Encounter 렌더러는 Python 개념과 패턴을 같은 카드 UI로 표시할 수 있지만, 저장 ID와 종류는 유지한다. Shell에는 두 레지스트리의 미이수 항목을 병합하는 공용 resolver 하나만 둔다.

### 4.4 Server Private Definition

현재 코드의 실제 필드명을 따른다.

```js
{
  problemId,
  problemVersion,
  entryFunction,
  officialSolutionCode,
  alternativeSolutions,
  intendedWrongFixtures: [
    {
      id,
      code,
      expectedFailingGroup,
      expectedMisconception, // Wave A에서는 권장, 전체 레거시에는 즉시 강제하지 않음
    },
  ],
  hiddenTests,
  understandingChallenges,
  transferMasterSet,
}
```

`intendedWrongSolutions`, `expectedFailureGroup` 같은 새 별칭을 만들지 않는다.

## 5. 문제별 확정 스펙

### 5.1 AC-EXP-SEQ-01 — 루미의 세 명령

- 역할: Anchor
- 진짜 목표: 이전 실행 결과가 다음 실행의 입력 상태가 됨을 추적한다.
- 함수: `trace_rover_path(start, boost, scale, drift)`
- 계산 순서: 더하기 → 곱하기 → 빼기
- Python 지원:
  - requires: `concept:function-body-focus`, `operator:assignment`, `operator:arithmetic-state-update`
  - introduces: 없음
- 사고 패턴: 없음
- 이해 증거: 특정 입력에서 두 번째 갱신 직후 `pos` 값 선택
- 오답 fixture:
  - `SEQ-REVERSE-ORDER`
  - `SEQ-IGNORE-SCALE`
  - `SEQ-HARDCODED-RESULT`
- 히든 그룹:
  - `order_sensitive`
  - `negative_drift`
  - `zero_start`
  - `varied_parameters`

공개 예시 하나만으로 상수를 반환할 수 없도록 최소 2개 공개 입력을 제공한다.

### 5.2 AC-EXP-VAR-02 — 사라진 변수 값

- 역할: Practice
- 선수: AC-EXP-SEQ-01
- 목표: 새 대입 뒤 이전 변수 상태가 교체된다는 것을 추적한다.
- 함수: `update_signal(old_level, new_level)`
- Python 지원:
  - requires: `concept:function-body-focus`
  - introduces: `operator:assignment`
- 이해 증거: 두 번째 대입 직후 `signal`의 현재값 선택
- 오답 fixture:
  - `VAR-COMBINE-NOT-OVERWRITE`
  - `VAR-RETURN-OLD`
  - `VAR-HARDCODED-NEW`
- 히든 그룹:
  - `positive_levels`
  - `zero_level`
  - `negative_level`
  - `same_value`

판정 입력은 우선 정수로 제한한다. 문자열 결합 등 타입별 의미 차이를 이번 문제의 핵심으로 섞지 않는다.

### 5.3 AC-EXP-SWAP-04 — 바뀌어 버린 두 화물

- 역할: Practice
- 선수: AC-EXP-VAR-02
- 목표: 덮어쓰기 전 정보 보존의 필요성을 발견한다.
- 함수: `swap_cargo_boxes(box_a, box_b)`
- Python 지원:
  - requires: `concept:function-body-focus`, `operator:assignment`
  - introduces: 없음
- 사고 패턴:
  - introduces: `pattern:preserve-before-overwrite`
- 이해 증거: 잘못된 두 줄 교환에서 원래 값이 사라지는 최초 assignment 선택
- 오답 fixture:
  - `SWAP-OVERWRITE-WITHOUT-PRESERVE`
  - `SWAP-PRESERVE-WRONG-SIDE`
  - `SWAP-RETURN-ORIGINAL-ORDER`
- 히든 그룹:
  - `distinct_values`
  - `equal_values`
  - `negative_values`
  - `zero_value`

정확한 튜플 교환 풀이도 통과시킨다. 소스 문자열에서 `temp` 사용 여부를 검사하지 않는다. temp 전략을 이해했는지는 2★ 이해 증거에서 확인한다.

### 5.4 AC-EXP-LOOP-06 — 네 번 반복한 신호

- 역할: Anchor
- 선수: AC-EXP-VAR-02
- 목표: 한 회차마다 상태가 한 단계씩 누적되는 과정을 추적한다.
- 함수: `repeat_pulse(times, step_energy)`
- Python 지원:
  - requires: `concept:function-body-focus`, `operator:assignment`, `operator:arithmetic-state-update`
  - introduces: `statement:for`, `builtin:range`
- 이해 증거: 주어진 `step_energy`에서 2회차 직후 `energy` 선택
- 오답 fixture:
  - `LOOP-ONE-TOO-FEW`
  - `LOOP-RESET-INSIDE`
  - `LOOP-NO-ACCUMULATION`
- 히든 그룹:
  - `zero_iterations`
  - `one_iteration`
  - `many_iterations`
  - `negative_energy`

정답이 반복문 대신 곱셈을 사용해도 결과가 정확하면 1★를 통과시킨다. 특정 문법 강제는 하지 않으며, 반복 상태 이해는 2★와 Trace 질문으로 확인한다.

## 6. 전이 문제 원칙

Fresh Transfer는 변수명만 바꾼 복제 문제가 아니어야 하지만, 새로운 Python 개념을 요구해서도 안 된다.

- SEQ: 온도 보정처럼 `더하기 → 배율 적용 → 손실 빼기`의 다른 맥락
- VAR: 현재 목표를 새 목표로 교체하는 상태 갱신
- SWAP: 두 좌표 또는 두 표식의 위치 교환
- LOOP: 일정량을 정해진 횟수만큼 충전하는 상태 누적

전이 함수는 Base와 다른 함수명·매개변수명을 사용한다. 공개 문제의 완성 코드를 문자열 치환해서 자동 생성하지 않는다.

## 7. Authoring Integrity Validator v1

새 스크립트:

```text
scripts/test-authoring-integrity-contracts.mjs
```

검증기는 기존 validator, authoritative judge, bundle leak guard를 호출하거나 재사용한다. 같은 로직을 복사하지 않는다.

### 확정된 10개 불변식

1. **Public schema/deepFreeze**: 네 kernel이 canonical schema를 통과하고 변경 불가능하다.
2. **Private isolation**: Private definition이 `functions/` 아래에만 있고 필수 채점 필드를 가진다.
3. **Public/Private parity**: `problemId`, `version`, `entryFunction`, 매개변수 개수와 순서가 일치한다.
4. **Wrong fixture contract**: `intendedWrongFixtures`의 `id`, `code`, `expectedFailingGroup`을 검증한다. `expectedMisconception`은 Wave A 신규 fixture에서만 필수로 한다.
5. **Expected failure evidence**: fixture가 Star 1을 통과하지 못하고, 지정 그룹에서 적어도 한 테스트를 실패해야 한다. 다른 그룹도 함께 실패할 수 있으므로 “오직 한 그룹만 실패”를 요구하지 않는다.
6. **Learning support coverage**: 모든 `pythonConcepts`와 `thinkingPatterns` ID가 레지스트리에 존재하고 First Encounter/Protocol Repair 데이터를 가진다.
7. **Runtime capability**: 공식 풀이·대안 풀이·fixture가 현재 제한형 Python evaluator에서 실행된다. 텍스트 정규식만으로 미래 문법을 추정하지 않는다.
8. **Domain-neutral UI**: 공용 UI와 새 질문에 기존 조건 문제의 `스위치`, `게이트`, `열림`, `닫힘`, `s1`, `s2`가 섞이지 않는다. 전체 저장소를 포괄하는 불안정한 키워드 금지 대신 Wave A 공개 텍스트와 생성 프롬프트를 검사한다.
9. **Security/bundle leak**: 기존 `test-bundle-leak-guard.mjs`를 재사용하여 private solution/hidden test/expected answer 누출이 없음을 확인한다.
10. **Independent 3-Star evidence**: Base, Understanding, Transfer를 각각 틀리는 부정 경로와 모두 통과하는 긍정 경로를 검증한다.

추가 카탈로그 검증:

- 선수 DAG에 순환이 없다.
- 선수 문제의 `catalogOrder`가 후속 문제보다 작다.
- `published` 문제는 public/private/understanding/transfer 계약을 모두 가져야 한다.
- 같은 `entryFunction` 안에서 함수 signature가 공개·비공개·전이에 혼동되지 않는다.

## 8. 권장 구현 순서

### A0 — 공용 차단 요소 해결

1. 이해 질문을 data-driven options 계약으로 일반화한다.
2. `publicUnderstandingChallenge()`의 answer 비노출 테스트를 추가한다.
3. 기존 published 문제의 이해 질문이 새 UI에서 실행 가능한지 회귀 검사한다.

### A1 — 학습 지원 계약

1. Python 개념 3개를 레지스트리에 추가한다.
2. 문제 해결 패턴 레지스트리를 추가한다.
3. Shell resolver가 두 종류의 미이수 항목을 합쳐 First Encounter를 순서대로 제공하게 한다.
4. 완료 저장은 기존 학습 진행 저장소를 재사용한다.

### A2 — 공용 탐색 경험

1. 설정 기반 `StateTransitionLens` 하나를 구현한다.
2. factory가 Lens 설정과 `thinkingPatterns`를 보존하게 한다.
3. 네 문제 모두 같은 Lens를 사용한다.

### A3 — 네 Public Kernel

선수 순서대로 구현한다.

1. AC-EXP-SEQ-01
2. AC-EXP-VAR-02
3. AC-EXP-SWAP-04
4. AC-EXP-LOOP-06

각 문제를 추가할 때 catalog, public problem index, capability/evidence mapping을 동시에 연결한다.

### A4 — 네 Private Definition

각 문제마다 다음을 한 파일에서 완결한다.

- official solution
- 허용 가능한 alternative solution
- 최소 3개의 intended wrong fixture
- 최소 2개의 public test와 4개의 hidden test
- 옵션형 understanding challenge
- fresh transfer master set

### A5 — 저작 검증기와 회귀 테스트

1. 10대 불변식 테스트를 추가한다.
2. package test runner에 한 번만 등록한다.
3. 실제 `isolatedJudgeRuntime` 경로로 정답·오답을 검증한다.
4. Student Sandbox와 Server Judge의 지원 문법 parity를 검증한다.

### A6 — 즉시 공개

전체 검증이 통과하면 네 문제를 `prototype`에 머물게 하지 말고 `published`로 전환한다.

Wave A 완료 시 성단 0에는 신규 4개와 기존 `AC-CODE-FIRST-ERROR-01`을 합쳐 **5개의 published Core/Anchor 계열 문제**가 있다. 이것만으로 `Core 6/8`을 달성할 수 없으므로 기존 release-aware early-access 정책을 유지한다. 임계값을 5로 낮추지 않는다. 다음 Wave에서 여섯 번째 Core가 공개될 때 정식 게이트가 자연스럽게 활성화되게 한다.

## 9. 예상 파일 변경 목록

### 신규

```text
src/components/AlgorithmConstellation/shared/problems/ac_exp_seq_01.js
src/components/AlgorithmConstellation/shared/problems/ac_exp_var_02.js
src/components/AlgorithmConstellation/shared/problems/ac_exp_swap_04.js
src/components/AlgorithmConstellation/shared/problems/ac_exp_loop_06.js
src/components/AlgorithmConstellation/shared/patterns/problemSolvingPatternRegistry.js
src/components/AlgorithmConstellation/client/lenses/StateTransitionLens.jsx
functions/algorithmConstellation/problems/ac_exp_seq_01.private.cjs
functions/algorithmConstellation/problems/ac_exp_var_02.private.cjs
functions/algorithmConstellation/problems/ac_exp_swap_04.private.cjs
functions/algorithmConstellation/problems/ac_exp_loop_06.private.cjs
scripts/test-authoring-integrity-contracts.mjs
```

### 수정

```text
src/components/AlgorithmConstellation/shared/problems/createCapabilityPrototypeKernel.js
src/components/AlgorithmConstellation/shared/problems/index.js
src/components/AlgorithmConstellation/shared/python/pythonConceptRegistry.js
src/components/AlgorithmConstellation/shared/catalog/algorithmEditorialCatalog.js
src/components/AlgorithmConstellation/client/shell/AlgorithmMissionShell.jsx
src/components/AlgorithmConstellation/client/modes/UnderstandingCheckMode.jsx
src/components/AlgorithmConstellation/client/modes/ExploreMode.jsx
functions/algorithmConstellation/problems/index.cjs
functions/algorithmConstellation/callableOrchestrator.cjs
package.json
```

실제 저장소의 기존 디렉터리명이 다르면 새 병렬 구조를 만들지 말고 기존 위치와 naming convention을 따른다.

## 10. 검증 명령과 합격 기준

```bash
node scripts/test-authoring-integrity-contracts.mjs
npm run test:algorithm-constellation
npx eslint src/components/AlgorithmConstellation functions/algorithmConstellation
npm run build
```

합격 기준:

- 네 공식 풀이와 허용 대안이 Base를 통과한다.
- 모든 intended wrong fixture가 지정 그룹을 포함해 실패한다.
- 이해 질문 정답이 클라이언트에 노출되지 않는다.
- 네 문제의 Base → Understanding → Transfer → Complete 흐름이 끝까지 동작한다.
- First Encounter는 미이수 학생에게만 나타나고 완료 후 반복되지 않는다.
- Private 정의와 hidden input이 프로덕션 번들에 포함되지 않는다.
- 기존 12개 published 문제의 플레이와 진도가 회귀하지 않는다.
- lint error/warning 0, 전체 테스트 통과, production build 성공.

## 11. 구현 AI를 위한 금지사항

- 문제마다 별도 Shell, CodeMode, TracePlayer, Scaffold UI를 만들지 않는다.
- Public Kernel에 hidden test, official solution, understanding expected answer를 넣지 않는다.
- `temp`, `for` 같은 문자열 존재 여부로 정답을 판정하지 않는다.
- 공식 풀이만 통과하도록 과도하게 형식을 강제하지 않는다.
- 기존 실제 필드와 다른 유사 필드명을 새로 만들지 않는다.
- 고정 입력 하나와 하드코딩된 반환값으로 통과할 수 있게 만들지 않는다.
- 조건 문제의 스위치/게이트 문구를 공용 UI에 남기지 않는다.
- 파일럿이나 수동 승인 대기를 이유로 자동 검증을 통과한 문제를 prototype에 방치하지 않는다.
- 성단 개방을 맞추기 위해 `Core 6/8` 기준을 임의로 낮추지 않는다.

## 12. Definition of Done

다음이 모두 참일 때 Wave A가 완료된다.

1. 네 문제가 catalog와 Hub에서 올바른 순서·선수 관계로 보인다.
2. 학습하지 않은 Python 개념과 패턴은 Code 전에 First Encounter로 안내된다.
3. Observe/Explore/Code/Trace/Understanding/Transfer가 공용 컴포넌트로 작동한다.
4. AC-EXP-SEQ-01은 실제로 순서가 결과에 영향을 주며 하드코딩을 기각한다.
5. 이해 확인은 수치·상태·행 선택지를 표현하고 답을 누출하지 않는다.
6. 네 Private Definition이 권위 서버 Judge에서 정답·대안·오답 계약을 만족한다.
7. 저작 불변식, 보안, 회귀, lint, build가 모두 통과한다.
8. 네 문제가 `published` 상태로 전환된다.

이 Wave의 목적은 네 개의 개별 문제를 만드는 데 그치지 않는다. 이후 문제를 **Public Kernel + Private Definition + 공용 학습 지원 데이터**만으로 빠르게 추가할 수 있는 출판 경로를 완성하는 것이 최종 산출물이다.
