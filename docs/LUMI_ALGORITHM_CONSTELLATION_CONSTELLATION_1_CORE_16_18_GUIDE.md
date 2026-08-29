# LUMI 알고리즘 성단 — 성단 1 본 항로 Core 16~18 구현 평가 및 개발 가이드

> 대상: 후속 구현을 담당하는 AI/개발자  
> 범위: `AC-COND-CLAMP-16`, `AC-COND-GRADE-17`, `AC-COND-COMPLEX-18`  
> 우선순위: **사용자의 최신 결정 → 이 가이드 → Core 16~18 계획 v2 → 기존 문서**  
> 핵심 원칙: 새 UI·Callable·저장 구조를 만들지 않고, 기존 데이터 기반 학습 루프에 세 문제를 추가한다.

## 1. 최종 평가

계획 v2는 성단 1의 후반부를 단순한 조건문 연습이 아니라 다음 세 가지 사고 전략으로 확장한다는 점에서 적절하다.

- 입력을 한도 안으로 보정하는 **상한 제한**
- 겹치는 기준을 올바른 순서로 배치하는 **조건 우선순위**
- 여러 Boolean 조건을 의미 단위로 묶는 **복합 논리 그룹화**

특히 Base와 Fresh Transfer의 표면을 달리하고, AST 형태가 아니라 실행 결과로 채점하며, COMPLEX-18의 8개 Boolean 공간을 전부 검증하려는 방향은 그대로 채택한다.

다만 구현 전 다음 사항을 수정해야 한다.

1. CLAMP-16의 `min()`은 이후 과정에서 정식으로 만나는 개념이다. 행동 채점은 이를 허용하되, Public Kernel·First Encounter·예시 대안 풀이에서 먼저 가르치지 않는다.
2. CLAMP-16의 선수 조건은 대체 경로를 두지 않고 `AC-COND-RANGE-15` 하나로 고정한다. 그래야 성단 내부 학습 순서가 흔들리지 않는다.
3. GRADE-17의 숨은 테스트 11개는 교육적 증거가 중복된다. 각 경계의 바로 아래와 경계값을 중심으로 8개로 줄여 Judge 비용을 낮춘다.
4. COMPLEX-18의 핵심 오개념은 단순 `all-or`뿐 아니라 `(A or B) and C`처럼 괄호 범위를 잘못 잡는 것이다. 이 fixture와 2★ 증거를 추가한다.
5. COMPLEX-18의 Explore는 대표 5개가 아니라 8개 전체 진리 공간을 보여 준다. 이 문제에서 완전 탐색은 부가 기능이 아니라 학습 목표다.
6. `27개` 같은 총개수는 테스트에 하드코딩하지 않는다. Published/Public/Private의 **동적 집합 동등성**을 검증한다.
7. GRADE·COMPLEX 전용 전역 패턴이나 전용 Lens는 이번 단계에서 만들지 않는다. 재사용 사례가 생기기 전까지 문제 증거 계약으로만 표현한다.

따라서 계획을 **수정 승인**한다. 아래 항목을 최종 구현 계약으로 사용한다.

## 2. 채택·수정·폐기 결정

| 계획 요소 | 결정 | 구현 기준 |
|---|---|---|
| CLAMP 상한 제한 사고 | 채택 | `pattern:upper-clamp`만 경량 등록한다. |
| CLAMP Fresh Transfer의 누적 후 제한 | 채택 | 단순 변수명 교체가 아닌 `current + charge` 후 제한으로 평가한다. |
| CLAMP의 `min()` 공개 대안 | 폐기 | 행동 채점상 통과는 허용하되 학습 자료와 회귀 예시에서는 노출하지 않는다. |
| GRADE 조건 우선순위 | 채택 | 높은 `>=` 기준부터 내려가는 전략을 증거로 확인한다. |
| GRADE 전용 전역 패턴 등록 | 보류 | 다른 문제에서 재사용될 때 등록한다. |
| GRADE 오름차순 `<=` Transfer | 채택 | 같은 문법 복제가 아닌 반대 방향의 경계 정렬을 평가한다. |
| COMPLEX 8개 Boolean 전수 검사 | 채택 | Base와 Transfer 모두 정확히 8개 고유 조합을 검사한다. |
| COMPLEX 대표 5개 Explore | 수정 | 학습 화면에서도 8개 조합을 모두 관찰한다. |
| COMPLEX 전용 Lens | 폐기 | 기존 `StateTransitionLens`를 사용한다. |
| 코드 형태·괄호 AST 강제 | 폐기 | 의미가 같은 대안 풀이는 모두 통과시킨다. |
| 문제별 Callable·저장 모델 | 폐기 | 기존 Gateway, Callable, Ledger를 그대로 사용한다. |
| Published/Public/Private 정확한 집합 일치 | 채택 | 숫자가 아니라 문제 ID 집합을 비교한다. |
| 접근성 파일럿·수동 승인 | 비차단 | 자동 계약 통과 후 같은 변경에서 `published` 처리한다. |

## 3. 성단 1 후반 학습 사다리

```text
13 NOT       단일 상태 반전
14 ELIF      순서 있는 분기와 건너뜀
15 RANGE     두 경계를 동시에 결합
16 CLAMP     경계 밖 입력을 안전 범위로 보정
17 GRADE     겹치는 기준의 검사 순서를 설계
18 COMPLEX   and/or/not을 의미 단위로 그룹화
```

### 3.1 확정 선수 조건

| 문제 | 선수 조건 | 이유 |
|---|---|---|
| CLAMP-16 | `AC-COND-RANGE-15` | 상·하한 비교와 조건 분기 경험을 이수한 뒤 보정 전략을 배운다. |
| GRADE-17 | `AC-COND-ELIF-14` | `elif`, `>=`, 최초 참 분기에서 멈추는 실행 모델이 필요하다. |
| COMPLEX-18 | `AC-COND-002`, `AC-COND-NOT-13` | Base의 `and/or`와 Transfer의 `not`을 모두 사전 학습한다. |

`AC-COND-001`은 위 두 선수 문제의 선행 관계에 이미 포함되므로 COMPLEX-18에 중복 기재하지 않는다. Hub는 기존 `progressMap`과 1★ 완료 기준을 사용한다. 추가 읽기나 Callable을 만들지 않는다.

### 3.2 개념 등록 원칙

- 새 Python 문법 개념은 없다.
- `operator:comparison-lower-bound`, `statement:elif`, `operator:and`, `operator:or`, `operator:not`은 앞 문제에서 이미 만났다.
- CLAMP-16만 재사용 가치가 명확한 사고 전략 `pattern:upper-clamp`를 `problemSolvingPatternRegistry`에 등록한다.
- GRADE-17의 우선순위와 COMPLEX-18의 그룹화는 우선 `evidenceRecipe.requiredClaims`로 관리한다. 후속 문제에서 실제 재사용될 때 전역 패턴으로 승격한다.

이 원칙은 학생에게 필요한 개념은 분명히 보여 주면서, 사용처가 하나뿐인 전역 분류를 늘리지 않기 위한 것이다.

## 4. 공통 구현 아키텍처

세 문제 모두 기존 경로만 사용한다.

```text
Public Kernel
  → ObserveMode
  → ExploreMode / StateTransitionLens
  → FirstEncounterCard(필요한 경우)
  → CodeMode / Student Sandbox
  → Existing Callable / Isolated Judge
  → UnderstandingCheckMode
  → TransferChallengeMode
  → Existing Progress Ledger
```

추가하지 않는 것:

- `ClampLens`, `GradeLens`, `ComplexLogicLens`
- 문제별 React 화면과 CSS
- 신규 Firebase Callable 또는 Firestore collection
- 신규 Python 실행기, AST 검사기, 정규식 채점기
- 문제별 오개념 matcher
- 문제 수에 비례하는 Hub 조건문

### 4.1 Lens 계약

세 문제의 Catalog와 Public Kernel `lensId`는 모두 `state-transition`으로 맞춘다. 프레임은 기존 공용 구조만 사용한다.

```js
{
  id: 'stable-id',
  operationLabel: '학생용 장면 이름',
  prompt: '이번 장면에서 살펴볼 질문',
  stateAfter: {
    // 문제별로 필요한 원시값·판정·출력
  },
}
```

각 프레임의 `id`, `operationLabel`, 핵심 `stateAfter` 조합은 고유해야 한다. 장면 수를 맞추기 위한 중복 프레임은 금지한다.

### 4.2 행동 기반 Judge 계약

- 함수명과 인자 개수는 프로토콜 계약으로 검증한다.
- 정답 여부는 반환 행동으로만 판단한다.
- Guard Return, `if/else`, 중첩 `if`, 논리식 등 의미가 같은 구현을 허용한다.
- 특정 키워드, 괄호, 줄 수, AST 형태를 정답 조건으로 강제하지 않는다.
- 한 테스트가 실패하면 해당 실패 그룹까지만 학생에게 요약하고 숨은 입력값은 노출하지 않는다.

## 5. AC-COND-CLAMP-16 — 최대 출력 제한기

### 5.1 확정 계약

| 항목 | 값 |
|---|---|
| ID | `AC-COND-CLAMP-16` |
| Catalog order | `16` |
| 역할 | `Core / Practice` |
| 함수 | `clamp_engine_power(requested_power, max_power)` |
| 선수 조건 | `['AC-COND-RANGE-15']` |
| Lens | `state-transition` |
| 입력 | 두 값 모두 정수, `0 <= value <= 1000` |
| 반환 | `requested_power`와 `max_power` 중 더 크지 않은 값 |
| 도입 패턴 | `pattern:upper-clamp` |

공식 기준 구현:

```python
def clamp_engine_power(requested_power, max_power):
    if requested_power > max_power:
        return max_power
    return requested_power
```

학생이 독립적으로 `min(requested_power, max_power)`를 사용해 올바르게 풀면 통과시킨다. 그러나 `min()`은 이 문제의 Public Kernel, First Encounter, 해설 전 힌트, `alternativeSolutions` 회귀 목록에 넣지 않는다. 이후 개념을 앞당겨 가르치지 않기 위함이다.

### 5.2 Observe·Explore

4개 프레임으로 충분하다.

| 프레임 | 입력 | 기대 출력 | 관찰 초점 |
|---|---:|---:|---|
| normal | `(80, 100)` | `80` | 안전한 요청은 보존한다. |
| exact | `(100, 100)` | `100` | 경계값도 그대로 유지한다. |
| exceeded | `(120, 100)` | `100` | 초과분만 제한한다. |
| extreme | `(500, 100)` | `100` | 초과 크기와 관계없이 한도는 같다. |

확정 문구:

- `predictionPrompt`: 요청 출력이 최대 한도를 넘을 때 최종 출력은 어떤 값이어야 할까요?
- `rulePrompt`: 안전한 요청은 보존하고, 한도를 넘은 요청만 최대치로 되돌리는 규칙을 찾아보세요.
- `ruleStatement`: 요청 출력이 최대 출력을 초과하면 최대 출력을, 그렇지 않으면 요청 출력을 그대로 반환합니다.

Starter 주석은 규칙을 코드로 번역할 여지를 남긴다.

```python
def clamp_engine_power(requested_power, max_power):
    # 요청 출력이 안전 한도를 넘지 않도록 최종 출력을 결정하세요.
    pass
```

### 5.3 First Encounter

`pattern:upper-clamp`를 완전한 레지스트리 항목으로 등록한다.

- 학생 이름: `상한 제한`
- 핵심 질문: `값이 한도를 넘었을 때 버릴 것인가, 한도 안으로 되돌릴 것인가?`
- 규칙: `정상 값은 보존하고 초과 값만 최대 허용값으로 바꾼다.`
- 정규 최초 문제: `AC-COND-CLAMP-16`

Python의 `min`을 패턴 설명에 넣지 않는다. 패턴은 해결 전략이고 특정 문법과 동일하지 않다.

### 5.4 Public·Hidden 테스트

Public은 학생이 프로토콜과 세 종류의 상태를 확인할 수 있도록 최소 3개를 둔다.

- `(40, 100) → 40`
- `(100, 100) → 100`
- `(120, 100) → 100`

Hidden 그룹:

- `normal_power`: `(0, 50) → 0`, `(40, 100) → 40`
- `exact_limit`: `(50, 50) → 50`, `(100, 100) → 100`
- `exceeded_power`: `(120, 100) → 100`, `(999, 100) → 100`

의도된 오답:

| Fixture | 행동 | 오개념 | 실패 그룹 |
|---|---|---|---|
| `CLAMP-NO-LIMIT` | 요청값 그대로 반환 | `MISSING-UPPER-CLAMP` | `exceeded_power` |
| `CLAMP-ALWAYS-MAX` | 항상 최대값 반환 | `HARDCODED-SAMPLE-RETURN` | `normal_power` |
| `CLAMP-INVERTED-LOGIC` | 정상값을 최대값으로 바꿈 | `INVERTED-COMPARISON` | `normal_power` |

### 5.5 2★ 이해 증거

1. `requested_power == max_power`인 경계에서 왜 값을 줄이지 않는지 확인한다.
2. 초과 분기가 “출력을 0으로 만드는 것”이 아니라 “최대 허용값으로 보정하는 것”임을 확인한다.

정답 코드를 다시 묻지 말고 상태 변화의 이유를 묻는다.

### 5.6 3★ Fresh Transfer

```python
def charge_battery(current, charge, capacity):
    total = current + charge
    if total > capacity:
        return capacity
    return total
```

입력 계약:

- 정수
- `0 <= current <= capacity <= 1000`
- `0 <= charge <= 1000`

테스트에는 누적 전 정상, 정확한 경계, 초과, 이미 가득 참을 모두 포함한다.

- `(50, 30, 100) → 80`
- `(60, 40, 100) → 100`
- `(70, 50, 100) → 100`
- `(100, 20, 100) → 100`
- `(0, 0, 50) → 0`

Base 결과에 숫자를 더하는 것만으로 Transfer 코드를 자동 생성하지 않는다. 학생이 새 함수 전체를 직접 작성한다.

## 6. AC-COND-GRADE-17 — 탐사 등급 분류기

### 6.1 확정 계약

| 항목 | 값 |
|---|---|
| ID | `AC-COND-GRADE-17` |
| Catalog order | `17` |
| 역할 | `Core / Practice` |
| 함수 | `evaluate_exploration_grade(score)` |
| 선수 조건 | `['AC-COND-ELIF-14']` |
| Lens | `state-transition` |
| 입력 | 정수, `0 <= score <= 100` |
| 반환 | `'S'`, `'A'`, `'B'`, `'C'` 중 하나 |

공식 기준 구현:

```python
def evaluate_exploration_grade(score):
    if score >= 90:
        return 'S'
    elif score >= 80:
        return 'A'
    elif score >= 70:
        return 'B'
    return 'C'
```

### 6.2 학습 차별점

ELIF-14가 “분기를 위에서부터 검사하고 처음 참인 곳에서 멈춘다”를 배웠다면, GRADE-17은 그 실행 모델을 이용해 **조건의 순서를 학생이 설계**하는 문제다.

문제는 기준 카드를 일부러 다음처럼 뒤섞어 제시한다.

```text
A: 80점 이상
C: 나머지
S: 90점 이상
B: 70점 이상
```

학생이 코드 블록을 단순히 베끼지 않고 `90 → 80 → 70 → else`로 재배열해야 한다. Starter에는 정렬된 조건문 뼈대를 제공하지 않는다.

### 6.3 Observe·Explore

중심 반례는 `92`다.

- `70 이상`을 먼저 검사하면 `B`에서 멈추고 오답이 된다.
- `90 이상`을 먼저 검사하면 `S`가 된다.

그 뒤 4개 경계 주변을 관찰한다.

| 점수 | 결과 | 핵심 |
|---:|---|---|
| 92 | S | 가장 엄격한 기준이 먼저다. |
| 89 | A | 90은 실패하고 80에서 멈춘다. |
| 79 | B | 90·80을 지나 70에서 멈춘다. |
| 69 | C | 모든 명시 기준이 실패한다. |

확정 문구:

- `predictionPrompt`: 겹치는 기준에서 높은 등급을 놓치지 않으려면 어떤 조건을 먼저 검사해야 할까요?
- `rulePrompt`: 위에서부터 처음 참인 조건에서 판정이 끝난다는 점을 이용해 기준 순서를 정해 보세요.
- `ruleStatement`: `이상` 기준은 더 높은 경계부터 낮은 경계 순으로 검사해야 가장 알맞은 등급을 반환합니다.

`evidenceRecipe.requiredClaims`에는 최소 다음을 둔다.

- `ordered-threshold-priority`
- `first-matching-branch-stops`
- `fallback-covers-remaining-values`

### 6.4 Public·Hidden 테스트

Public:

- `92 → 'S'`
- `85 → 'A'`
- `75 → 'B'`
- `60 → 'C'`

Hidden은 중복을 줄여 8개면 충분하다.

- `top_tier_boundaries`: `90 → 'S'`, `100 → 'S'`
- `a_tier_boundaries`: `80 → 'A'`, `89 → 'A'`
- `b_tier_boundaries`: `70 → 'B'`, `79 → 'B'`
- `low_scores`: `0 → 'C'`, `69 → 'C'`

`85`, `75`, `95` 같은 값은 위 경계 쌍이 이미 같은 분기 행동을 증명하므로 Hidden에서 반복하지 않는다. 이는 채점 정확도를 낮추지 않으면서 제출당 실행량을 줄인다.

의도된 오답:

| Fixture | 행동 | 오개념 | 실패 그룹 |
|---|---|---|---|
| `GRADE-ORDER-REVERSAL` | 70부터 검사 | `BRANCH-ORDER-EVALUATION-ERROR` | `top_tier_boundaries` |
| `GRADE-MISSING-FALLTHROUGH` | C 반환 누락 | `MISSING-FALLTHROUGH` | `low_scores` |
| `GRADE-ALWAYS-A` | 항상 A 반환 | `HARDCODED-SAMPLE-RETURN` | `top_tier_boundaries` 또는 `low_scores` |

fixture 검증은 오개념 태그보다 “지정 실패 그룹에서 실제로 실패하는가”를 우선한다.

### 6.5 2★ 이해 증거

1. `92`에서 70점 조건을 먼저 두면 왜 `B`에서 멈추는지 묻는다.
2. `85`에서 80점 조건이 참이 된 뒤 70점 조건이 실행되지 않는 이유를 묻는다.

두 문항은 각각 **설계 순서**와 **실행 중단**을 분리해 증명한다.

### 6.6 3★ Fresh Transfer

```python
def classify_radiation_danger(radiation):
    if radiation <= 20:
        return 'SAFE'
    elif radiation <= 50:
        return 'CAUTION'
    elif radiation <= 80:
        return 'DANGER'
    return 'CRITICAL'
```

입력 계약은 정수 `0 <= radiation <= 150`으로 명시한다. Base의 내림차순 `>=`를 외우는 것만으로는 풀 수 없고, `<=` 기준에서는 낮은 경계부터 올라가야 한다.

테스트:

- `0`, `20` → `SAFE`
- `21`, `50` → `CAUTION`
- `51`, `80` → `DANGER`
- `81`, `150` → `CRITICAL`

## 7. AC-COND-COMPLEX-18 — 문을 열지 말지 심판하라

### 7.1 확정 계약

| 항목 | 값 |
|---|---|
| ID | `AC-COND-COMPLEX-18` |
| Catalog order | `18` |
| 역할 | `Core / Practice` |
| 함수 | `can_open_security_door(has_master_key, has_card, bio_passed)` |
| 선수 조건 | `['AC-COND-002', 'AC-COND-NOT-13']` |
| Lens | `state-transition` |
| 입력 | Boolean 3개 |
| 반환 | Boolean |

공식 기준 구현:

```python
def can_open_security_door(has_master_key, has_card, bio_passed):
    return has_master_key or (has_card and bio_passed)
```

Guard Return이나 동등한 조건 분기도 허용한다. 괄호를 작성했는지는 검사하지 않는다. Python 우선순위에 의존한 동등식도 행동이 맞으면 통과하지만, 학습 설명과 공식 코드는 의미 그룹을 드러내는 괄호를 사용한다.

### 7.2 Explore는 8개 전체 공간을 사용

3개의 Boolean 입력은 정확히 8개 조합이다. 모든 조합을 프레임으로 제공한다.

| master | card | bio | 결과 | 그룹 |
|---|---|---|---|---|
| F | F | F | F | all_fail |
| F | F | T | F | partial_auth |
| F | T | F | F | partial_auth |
| F | T | T | T | card_and_bio_valid |
| T | F | F | T | master_path |
| T | F | T | T | master_path |
| T | T | F | T | master_path |
| T | T | T | T | all_valid |

한 화면에 표를 새로 만들지 않는다. `StateTransitionLens`에서 앞의 4개를 “일반 인증 경로”, 뒤의 4개를 “마스터 키 경로”라는 `operationLabel`로 묶어 순차 관찰한다.

확정 문구:

- `predictionPrompt`: 마스터 키 경로와 카드+생체 경로 중 하나라도 완성되는 조합을 찾아보세요.
- `rulePrompt`: 혼자서 충분한 조건과 반드시 함께 있어야 하는 두 조건을 괄호로 묶어 보세요.
- `ruleStatement`: 마스터 키가 있거나, 카드와 생체 인식이 모두 통과했을 때 문이 열립니다.

`evidenceRecipe.requiredClaims`:

- `master-key-is-independent-path`
- `card-and-bio-form-one-group`
- `all-eight-boolean-cases-covered`

### 7.3 Public·Hidden 테스트

Public은 서로 다른 의미 그룹을 하나씩 보여 준다.

- `(False, False, False) → False`
- `(False, True, False) → False`
- `(False, True, True) → True`
- `(True, False, False) → True`

Hidden은 8개 조합을 정확히 한 번씩 포함한다. 테스트 작성 순서와 무관하게 집합으로 검증한다.

의도된 오답:

| Fixture | 잘못된 식 | 오개념 | 실패 그룹 |
|---|---|---|---|
| `COMPLEX-ALL-AND` | `A and B and C` | `OVERLY-RESTRICTIVE-CONJUNCTION` | `master_path` |
| `COMPLEX-ALL-OR` | `A or B or C` | `OVERLY-PERMISSIVE-DISJUNCTION` | `partial_auth` |
| `COMPLEX-MISSING-BIO` | `A or B` | `MISSING-CONJUNCTION-TERM` | `partial_auth` |
| `COMPLEX-WRONG-GROUPING` | `(A or B) and C` | `LOGIC-GROUPING-ERROR` | `master_path` |

마지막 fixture가 계획 v2에서 빠진 핵심 보완이다. `A=True, B=False, C=False`에서 정답은 True지만 잘못된 그룹화는 False가 된다.

### 7.4 2★ 이해 증거

1. `A=False, B=True, C=False`에서 카드 하나만으로 열리지 않는 이유를 묻는다.
2. `A=True, B=False, C=False`에서 `(A or B) and C`로 묶으면 왜 마스터 키 단독 경로가 사라지는지 묻는다.

`all-or` 오류는 Judge fixture에서 확인한다. 2★는 더 핵심적인 **의미 그룹의 경계**를 확인한다.

### 7.5 3★ Fresh Transfer

```python
def can_emergency_land(has_commander_override, fuel_ok, storm_warning):
    return has_commander_override or (fuel_ok and not storm_warning)
```

Base와 다른 점은 두 번째 그룹에 `not`이 포함된다는 것이다. Transfer도 8개 Boolean 조합을 정확히 한 번씩 검사한다.

| override | fuel | storm | 결과 |
|---|---|---|---|
| F | F | F | F |
| F | F | T | F |
| F | T | F | T |
| F | T | T | F |
| T | F | F | T |
| T | F | T | T |
| T | T | F | T |
| T | T | T | T |

## 8. 파일별 구현 지시

실제 경로는 현재 레지스트리 구조를 기준으로 확인하되, 변경 범위는 아래에 한정한다.

### 8.1 Public Kernel 3종

생성:

- `src/components/AlgorithmConstellation/shared/problems/ac_cond_clamp_16.js`
- `src/components/AlgorithmConstellation/shared/problems/ac_cond_grade_17.js`
- `src/components/AlgorithmConstellation/shared/problems/ac_cond_complex_18.js`

각 Kernel은 기존 `createCapabilityPrototypeKernel`을 사용하고 다음을 완성한다.

- identity, learning, shells, modes
- `state-transition` Lens 프레임
- starter code와 public tests
- understanding evidence
- transfer metadata
- misconception fixture 참조
- 입력 도메인과 반환 타입

수정:

- Public problem index에 3종 등록
- `problemSolvingPatternRegistry.js`에 `pattern:upper-clamp` 1종만 추가

### 8.2 Private Definition 3종

생성:

- `functions/algorithmConstellation/problems/ac_cond_clamp_16.private.cjs`
- `functions/algorithmConstellation/problems/ac_cond_grade_17.private.cjs`
- `functions/algorithmConstellation/problems/ac_cond_complex_18.private.cjs`

각 정의에 포함할 것:

- Base hidden groups
- intended wrong fixtures
- 2★ 정답 evidence
- 서명된 Fresh Transfer 정의와 private tests
- 런타임 제한은 기존 기본값 재사용

Private problem index에 등록한다. CLAMP의 `alternativeSolutions`에는 `min()` 예시를 넣지 않는다.

### 8.3 Catalog·Registry

`algorithmEditorialCatalog.js`의 16~18 항목을 다음 기준으로 갱신한다.

- `status: 'published'`
- 정확한 prerequisites
- `lensId: 'state-transition'`
- 기존 `catalogOrder`, `routeRole`, provenance 유지

Hub나 성단 개방 함수를 문제 ID별로 수정하지 않는다. Catalog와 기존 공용 prerequisite 로직이 자동 반영해야 한다.

## 9. 자동 검증 계약

### 9.1 저작 무결성

`test-authoring-integrity-contracts.mjs`에 다음을 추가한다.

- 세 문제의 Public/Private/Catalog 존재
- 모든 StateTransition frame의 고유성
- `predictionPrompt`, `rulePrompt`, `ruleStatement` 존재
- 함수 시그니처와 입력 도메인 일치
- CLAMP Public·First Encounter에 `min(` 조기 노출 없음
- GRADE 필수 경계 `69, 70, 79, 80, 89, 90` 존재
- COMPLEX Base·Transfer가 각각 8개 고유 Boolean tuple 전체를 정확히 포함

`Published Catalog == Public Kernels == Private Definitions`는 개수를 `27`로 비교하지 말고 문제 ID 집합의 양방향 차집합이 비어 있는지 검증한다.

### 9.2 커리큘럼 계약

기존 curriculum contract에 다음만 추가한다.

- CLAMP → RANGE-15
- GRADE → ELIF-14
- COMPLEX → COND-002 + NOT-13
- 세 문제 모두 성단 1 Core
- Branch 완료가 성단 개방 조건을 바꾸지 않는 기존 불변식 유지

### 9.3 Judge 회귀

각 문제마다 검증한다.

- 공식 풀이 Base 통과
- 각 intended wrong fixture가 지정 그룹에서 실패
- 2★ 정답·오답 분리
- 학생이 직접 제출한 Transfer 정답 통과
- Base 정답을 문자열 치환한 잘못된 Transfer 기각
- Callable 전체 생명주기와 멱등 보상 유지

특히 다음 사례를 별도 assertion으로 둔다.

- CLAMP: 정확한 경계는 축소되지 않는다.
- GRADE: 90과 70을 모두 만족하는 점수는 S다.
- COMPLEX: `(True, False, False)`는 True다.
- COMPLEX Transfer: `(False, True, True)`는 False다.

### 9.4 실행 순서

빠른 실패를 위해 다음 순서로 실행한다.

```bash
node scripts/test-authoring-integrity-contracts.mjs
node scripts/test-gate0-curriculum-contracts.mjs
node scripts/test-server-orchestration-and-judge.mjs
npm run test:algorithm-constellation
npx eslint src/components/AlgorithmConstellation functions/algorithmConstellation
npm run build
```

앞 단계가 실패하면 전체 테스트와 빌드를 반복하지 말고 해당 계약부터 고친다.

## 10. 작업 순서와 완료 기준

### Step 1 — 계약 선반영

- Catalog 16~18의 최종 ID, prerequisites, Lens 확정
- `pattern:upper-clamp` 등록
- 테스트 파일에 실패하는 계약부터 추가

### Step 2 — Kernel과 Private Definition을 문제별 세로 완성

한 번에 Public 3개를 만든 뒤 Private 3개를 만드는 대신 다음 순서를 권장한다.

1. CLAMP Public → Private → 단독 테스트
2. GRADE Public → Private → 단독 테스트
3. COMPLEX Public → Private → 단독 테스트

문제 하나의 계약 오류를 좁은 범위에서 발견할 수 있어 재작업 비용이 작다.

### Step 3 — Index·Catalog 출판

- Public index 등록
- Private index 등록
- Catalog `published`
- 집합 parity 통과

### Step 4 — 전체 회귀

- 저작 계약
- 커리큘럼 계약
- Judge·Callable
- 전체 스위트
- ESLint
- Production build

### 완료 정의

다음이 모두 참일 때 완료다.

- [ ] 학생이 15 → 16 → 17 → 18의 순서를 Hub에서 이해할 수 있다.
- [ ] 미학습 Python 개념이 필수 풀이로 갑자기 등장하지 않는다.
- [ ] 세 문제 모두 Observe → Explore → Code → 2★ → Fresh Transfer가 완결된다.
- [ ] CLAMP는 정상·경계·초과를 구별한다.
- [ ] GRADE는 중첩 기준의 순서 오류를 잡는다.
- [ ] COMPLEX는 Base와 Transfer의 8개 Boolean 공간을 전부 검증한다.
- [ ] 정답 코드 형태를 강제하지 않는다.
- [ ] 새 UI, Callable, 저장 모델이 없다.
- [ ] Published/Public/Private 문제 ID 집합이 정확히 같다.
- [ ] 전체 자동 테스트, ESLint, build가 통과한다.

## 11. 후속 구현 AI에게 전달할 핵심 지시

> 이 작업은 기능 플랫폼을 확장하는 일이 아니라, 이미 완성된 저작 플랫폼에 세 개의 고품질 Kernel을 추가하는 일이다. 문제별 UI·API·저장소를 만들지 말고 기존 `StateTransitionLens`, Gateway, Callable, Judge, Ledger를 재사용하라. CLAMP의 `min()`을 학생에게 먼저 가르치지 말고, GRADE의 중복 Hidden 테스트는 늘리지 말며, COMPLEX의 Base와 Transfer는 8개 Boolean 조합을 전수 검증하라. 구현 형태가 아니라 반환 행동을 채점하고, 총문제 수를 하드코딩하지 말라.
