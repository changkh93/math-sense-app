# LUMI 알고리즘 성단 — 성단 3 본 항로 완결 개발 가이드

> 범위: `AC-SEQ-RUNNING-35` 신규 구현, `AC-STR-REVERSE-01` Anchor 계약 보정, `AC-STR-PALIN-37`·`AC-SEQ-ROTATE-38` 신규 구현
>
> 목표: 성단 3의 Core 8문제 완결, Published/Public/Private 43개 동등성, 성단 4 정식 개방
>
> 우선순위: 학습 순서의 정합성 > 행동 기반 채점 > 기존 공용 엔진 재사용 > 콘텐츠 수 증가

---

## 1. 계획 평가와 결론

다음 단계는 35번 한 문제만 추가해 성단 4 개방 조건을 빠르게 충족하는 방식보다, 35·37·38을 함께 구현하여 성단 3의 본 항로 8개를 완결하는 편이 낫다.

현재 성단 3에는 다음 Core가 출판되어 있다.

1. 31: 선별 합산
2. 32: 최소·최대 단일 순회
3. 33: 조건에 맞는 항목 개수 세기
4. 34: 인접 값 비교
5. 36: 문자열 역순 Anchor

35를 출판하면 기술적으로 Core 6/8 조건은 충족되지만, 37·38이 비어 있으면 학생에게는 중간 단계가 빠진 과정으로 보인다. 따라서 이번 Wave의 완료 단위는 **Core 35~38 전체**다.

다만 36은 이미 출판된 초기 프로토타입이므로 새 문제로 다시 만들지 않는다. Public/Private 3-Star 계약과 실제 Explore Lens만 보정한다.

### 승인 판단

- 신규 문제 3종: 승인
- 36 Anchor 최소 보정: 필수
- 신규 전용 JSX: 불승인
- 신규 Callable/Firestore 컬렉션: 불승인
- 새 Judge 기능: 불승인
- 학생 파일럿·접근성·별도 출판 심사: 이번 구현 Gate에서 제외

---

## 2. 가장 중요한 설계 수정

### 2.1 존재하지 않는 `string-scanner-lens`를 사용하지 않는다

Catalog에는 `string-scanner-lens`가 기록되어 있지만 현재 `ExploreMode`의 Lens Registry에는 해당 구현이 없다. 이 상태에서는 문자열 문제가 의도한 화면이 아니라 기본 Condition Lens로 떨어질 수 있다.

이번 Wave에서는 새 String Lens를 만들지 않는다. 이미 프레임·상태·예측을 데이터로 표현할 수 있는 `state-transition`을 35~38 모두에 사용한다.

이 결정의 장점:

- 문제별 JSX 0개
- UI 회귀 범위 최소화
- 문자 위치, 누적값, 리스트 이동을 같은 데이터 계약으로 표현
- 향후 전용 String Lens가 필요해져도 Kernel 데이터는 재사용 가능

Catalog와 Public Kernel의 `lensId`는 반드시 일치시킨다.

### 2.2 `sequence-accumulator`를 35와 38에 재사용하지 않는다

현재 `SequenceAccumulatorLens`는 양수만 선별하여 합산하는 31번 경험에 특화되어 있다. `sampleStream`, 양수 판정, 캡슐 문구가 하드코딩되어 있어 누적합 리스트나 회전에 사용하면 잘못된 학습 장면이 나온다.

35와 38도 `state-transition`을 사용한다. 이번 Wave에서 기존 Lens를 범용화하는 작업은 하지 않는다.

### 2.3 `.append()` First Encounter를 35로 이동한다

35는 매 순간의 누적값을 결과 리스트에 기록해야 한다. 가장 자연스러운 Python 도구는 `.append()`다.

현재 Concept Registry의 `method:append` 최초 문제는 Catalog 71의 `AC-NAV-005`로 설정되어 있다. 학생이 35에서 처음 만나므로 다음처럼 정합성을 회복한다.

- `method:append.canonicalFirstProblemId = 'AC-SEQ-RUNNING-35'`
- 35의 `pythonConcepts.introduces`에 `method:append`
- `AC-NAV-005`에서는 `method:append`를 `introduces`에서 `requires`로 이동

새 문법을 설명 없이 사용하는 것은 금지한다. Code 진입 전에 기존 First Encounter 카드가 자동으로 노출되어야 한다.

### 2.4 38의 선수 조건을 실제 풀이 도구와 맞춘다

Catalog 초안의 38 선수 조건은 31 하나뿐이지만, 권장 해법은 다음 두 기반을 사용한다.

- 35: 결과 리스트에 차례로 기록하는 `.append()`
- 36: 경계 부분을 선택하는 슬라이싱

따라서 38의 선수 조건은 아래로 변경한다.

```js
prerequisites: ['AC-SEQ-RUNNING-35', 'AC-STR-REVERSE-01']
```

학생이 아직 배우지 않은 문법을 이미 알고 있다고 가정하지 않는다.

---

## 3. 최종 학습 사다리

```text
31 선별하며 합산
 ├─ 32 하나의 순회로 두 경계 갱신
 ├─ 33 조건을 통과할 때 개수 갱신
 └─ 35 매 순간의 누적 상태를 리스트에 기록

31 → 36 문자열을 역방향으로 바라보기
       └─ 37 원본과 역방향 결과를 비교해 회문 판정

35 + 36 → 38 경계 항목을 반대편으로 보내 리스트 회전
```

35는 누적 상태를 하나의 숫자로 끝내지 않고 **중간 상태 전체를 결과로 남기는 단계**다. 37은 역순 결과를 만드는 것에서 **비교·판정**으로 확장한다. 38은 슬라이싱과 순차 기록을 결합하는 종합 문제다.

---

## 4. 공통 구현 불변조건

모든 문제는 다음 계약을 지킨다.

- `createCapabilityPrototypeKernel` 재사용
- Public에는 공개 테스트와 Preview Transfer만 포함
- Private에 공식 해법, 대안 해법, 오답 fixture, Hidden/Transfer Master Set 보관
- Public/Private Hidden 입력 중복 0건
- Preview/Authoritative Transfer 입력 중복 0건
- Base, 2★ 이해 확인, Fresh Transfer 모두 완결
- 학생에게 보이는 `identity.subtitle`와 `contextCard`에 완성 코드 노출 금지
- 정답 코드의 특정 AST 형태를 강제하지 않고 반환 행동으로 채점
- 문제별 컴포넌트, API, Firestore 읽기·쓰기 추가 금지
- 공식 해법 Base/Transfer 각각 누적 20,000 step 이내
- 입력 크기는 교육용 소형 도메인으로 제한

Public과 Private에 함께 존재하는 다음 항목은 값까지 동일해야 한다.

- `understandingChallenges`
- Transfer의 ID, title, description, contextCard, thoughtCheck, entryFunction, starterCode

Private만 더 강해야 하는 항목:

- `officialSolutionCode`
- `alternativeSolutions`
- `intendedWrongFixtures`
- `hiddenTests`
- Authoritative Transfer `testCases`

---

## 5. AC-SEQ-RUNNING-35 — 항해 일지의 누적 에너지

### 5.1 학습 목표

입력 변화량을 차례로 더하면서 매 시점의 누적 상태를 결과 리스트에 기록한다.

합계 하나만 반환하는 31과 구분해야 한다.

### 5.2 계약

```js
problemId: 'AC-SEQ-RUNNING-35'
entryFunction: 'build_energy_journal'
routeRole: 'core'
learningRole: 'practice'
prerequisites: ['AC-SEQ-005']
lensId: 'state-transition'
```

입력·출력:

```text
changes: 정수 리스트, 길이 0~20, 각 값 -20~20
return: 같은 길이의 누적합 리스트
```

예:

```text
[3, -1, 4] → [3, 2, 6]
[] → []
```

### 5.3 개념과 사고 패턴

```js
pythonConcepts: {
  requires: [
    'builtin:list',
    'statement:for',
    'operator:assignment',
    'operator:arithmetic-state-update',
  ],
  introduces: ['method:append'],
}
```

Pattern Registry에 다음 한 항목을 추가한다.

```text
pattern:running-prefix-state
표시명: 지나온 상태를 매 순간 기록하기
canonicalFirstProblemId: AC-SEQ-RUNNING-35
```

핵심은 “현재 합을 갱신한 뒤 그 시점의 값을 기록한다”이다. 최종 합만 기록하거나 입력값 자체를 기록하는 오류를 구분한다.

### 5.4 Observe·Explore

Observe 질문은 `[4, -2, 3]`의 세 시점 기록을 예측하게 한다. 완성 코드나 `.append()` 문법은 First Encounter 전에 노출하지 않는다.

Explore는 `state-transition` 프레임을 사용한다.

```text
초기: total=0, journal=[]
4 확인: total=4, journal=[4]
-2 확인: total=2, journal=[4,2]
3 확인: total=5, journal=[4,2,5]
```

각 프레임은 `current`, `total`, `journal`을 포함한다. 코드 조각은 First Encounter 이후의 Explore 단계에서만 보여도 된다.

### 5.5 평가 세트

Public 예시:

- `[3, -1, 4] → [3, 2, 6]`
- `[5] → [5]`
- `[] → []`

Hidden 필수 그룹:

- `all_positive`
- `all_negative`
- `returns_to_zero`
- `contains_zero`
- `empty`

오답 fixture:

1. `RUNNING-RETURNS-FINAL-ONLY`: 최종 합 숫자만 반환
2. `RUNNING-APPENDS-RAW-ITEM`: 누적합이 아니라 현재 입력값 기록
3. `RUNNING-RESETS-TOTAL`: 반복마다 total을 0으로 다시 시작

각 fixture에는 `expectedMisconception`과 `expectedFailingGroup`을 모두 둔다.

### 5.6 2★ 이해 확인

최소 3문항:

1. 음수 변화량을 만나면 직전 누적값에서 감소한다.
2. 결과 리스트의 길이는 입력 리스트의 길이와 같다.
3. 최종 합 하나와 running total 리스트는 서로 다른 결과다.

### 5.7 Fresh Transfer

```text
함수: build_position_log(moves)
상황: 로버의 이동량을 차례로 적용한 뒤 매 순간의 위치 기록
```

Base의 에너지와 다른 “위치 변화” 맥락을 사용하되 동일한 running-prefix-state 패턴을 요구한다.

Transfer 안내 카드는 다음 사고만 제공한다.

- 출발 위치에서 시작
- 이동 하나를 적용
- 이동 직후의 위치를 일지에 기록

`for`, `.append()`, 대입문, 완성 반환문을 contextCard에 쓰지 않는다.

---

## 6. AC-STR-REVERSE-01 — 뒤집힌 구조 메시지 Anchor 보정

### 6.1 보정 이유

현재 문제는 Base 동작은 가능하지만 다음이 부족하다.

- Public에 2★와 Fresh Transfer 계약이 없음
- Explore의 `string-scanner-lens`가 실제 Registry에 없음
- `builtin:range`를 새 개념으로 중복 소개
- Public/Private 오답 진단 필드가 최신 계약보다 약함

### 6.2 유지할 것

- `problemId`, `problemVersion`, entryFunction
- 기존 학생 제목
- 기존 완료 기록
- 슬라이싱을 이용한 공식 해법과 행동 기반 대안 해법 허용

### 6.3 보정 계약

```js
prerequisites: ['AC-SEQ-005']
lensId: 'state-transition'
pythonConcepts: {
  requires: [],
  introduces: ['syntax:slicing'],
}
```

`builtin:range`는 이미 `AC-EXP-LOOP-06`에서 소개되므로 36의 `introduces`에서 제거한다. 역방향 range 해법은 대안 풀이로 계속 허용한다.

### 6.4 Explore

`'EDOC' → 'CODE'`를 마지막 문자부터 읽는 4개 프레임으로 표현한다.

상태:

- `sourceIndex`
- `currentChar`
- `decoded`

학생은 결과가 한 번에 뒤집히는 것이 아니라 역방향 순회로 재구성된다는 정신 모델을 확인한다.

### 6.5 평가 보정

Public 테스트는 기존과 호환한다. Private Hidden은 다음 그룹을 유지 또는 보강한다.

- 비대칭 문자열
- 이미 회문인 문자열
- 한 글자
- 숫자로 된 문자열

오답 fixture는 최소 2종:

1. 원문 그대로 반환
2. 첫 글자 또는 마지막 글자를 빠뜨리는 off-by-one 역순

모든 fixture에 최신 필드를 사용한다.

### 6.6 2★와 Fresh Transfer

2★는 다음을 확인한다.

- `step=-1`이 읽는 방향을 바꾼다.
- 시작·끝을 생략한 역방향 슬라이싱이 전체 문자열에 적용된다.
- 회문도 뒤집으면 같은 문자열이 된다.

Fresh Transfer:

```text
함수: mirror_encode(word)
목표: 단어 전체를 역순 거울 암호로 변환
```

Public Preview와 Private Master 테스트는 서로 다른 단어를 사용한다. contextCard에는 `[::-1]` 또는 완성 반환문을 노출하지 않는다.

---

## 7. AC-STR-PALIN-37 — 거울 통신

### 7.1 학습 목표

문자열 원본과 역방향 결과가 같은지 비교하여 회문을 판정한다.

문자의 종류나 개수가 같은지만 확인하는 문제가 아니다. 양쪽에서 읽은 **순서 전체의 동치**를 확인한다.

### 7.2 계약

```js
problemId: 'AC-STR-PALIN-37'
entryFunction: 'is_mirror_message'
prerequisites: ['AC-STR-REVERSE-01']
lensId: 'state-transition'
```

도메인:

```text
message: 영문 대문자 A~Z, 길이 1~20, 공백 없음
return: bool
```

대소문자 무시, 공백 제거, 특수문자 정규화는 이번 문제 범위에서 제외한다. 문자열 전처리 문법을 추가로 요구하지 않기 위함이다.

### 7.3 개념

```js
pythonConcepts: {
  requires: ['syntax:slicing', 'operator:equality', 'value:boolean'],
  introduces: [],
}
thinkingPatterns: {
  requires: [],
  introduces: [],
}
```

새 사고 패턴 Registry는 추가하지 않는다. 36의 reverse traversal과 기존 equality를 결합하는 문제이므로 현재 개념 조합으로 충분하다.

### 7.4 Observe·Explore

Observe는 `LEVEL`, `LUMI`, `ABBA`를 비교하여 규칙을 찾게 한다. 부제에는 `message == message[::-1]`을 쓰지 않는다.

Explore 프레임은 `RADAR`의 양끝 문자 쌍을 보여준다.

```text
R ↔ R
A ↔ A
D (가운데)
```

프레임 상태:

- `leftChar`
- `rightChar`
- `pairMatches`
- `allMatchedSoFar`

실제 제출은 슬라이싱, 수동 양끝 비교 등 어느 올바른 풀이도 허용한다.

### 7.5 평가 세트

Public 예시:

- `LEVEL → True`
- `LUMI → False`
- `AA → True`

Hidden 필수 그룹:

- `odd_palindrome`
- `even_palindrome`
- `single_character`
- `same_ends_but_not_palindrome`
- `near_palindrome`

오답 fixture:

1. `PALIN-FIRST-LAST-ONLY`: 첫 글자와 마지막 글자만 비교
2. `PALIN-ALWAYS-TRUE`: 항상 True 반환
3. `PALIN-REVERSED-TEXT`: Boolean 대신 뒤집힌 문자열 반환

### 7.6 2★ 이해 확인

1. 첫 글자와 마지막 글자가 같아도 내부가 다르면 회문이 아니다.
2. 홀수 길이 문자열의 가운데 한 글자는 짝이 없어도 된다.
3. 뒤집은 결과를 만드는 것과 원본과 비교해 Boolean을 반환하는 것은 다르다.

### 7.7 Fresh Transfer

```text
함수: is_symmetric_route(stops)
입력: 정수로 된 탐사 지점 리스트, 길이 1~20
출력: 앞뒤가 같은 경로인지 bool
```

문자열에서 리스트로 자료형을 바꾸어 동일한 대칭 사고가 전이되는지 확인한다.

---

## 8. AC-SEQ-ROTATE-38 — 화물 한 칸씩 밀기

### 8.1 학습 목표

리스트의 마지막 화물을 맨 앞으로 보내고, 나머지 순서를 유지하여 오른쪽으로 한 칸 회전한 새 리스트를 만든다.

회전은 역순 정렬과 다르다.

### 8.2 계약

```js
problemId: 'AC-SEQ-ROTATE-38'
entryFunction: 'rotate_cargo_right'
prerequisites: ['AC-SEQ-RUNNING-35', 'AC-STR-REVERSE-01']
lensId: 'state-transition'
```

도메인:

```text
cargos: 정수 리스트, 길이 1~20, 각 값 -100~100
return: 오른쪽으로 한 칸 회전한 새 리스트
```

입력 리스트를 직접 수정했는지는 채점하지 않는다. 결과 행동만 채점한다.

### 8.3 개념과 패턴

```js
pythonConcepts: {
  requires: [
    'builtin:list',
    'statement:for',
    'operator:assignment',
    'method:append',
    'syntax:slicing',
  ],
  introduces: [],
}
```

Pattern Registry에 다음 항목을 추가한다.

```text
pattern:boundary-wraparound
표시명: 경계 항목을 반대편으로 보내기
canonicalFirstProblemId: AC-SEQ-ROTATE-38
```

### 8.4 Observe·Explore

Observe:

```text
[A, B, C, D]를 오른쪽으로 한 칸 밀면 [D, A, B, C]
```

다음 오답을 명확히 구분한다.

- 역순 `[D,C,B,A]`
- 왼쪽 회전 `[B,C,D,A]`
- 마지막 항목 유실 `[A,B,C]`

Explore 프레임:

1. 마지막 항목 D를 경계 화물로 기억
2. 새 결과의 맨 앞에 D 배치
3. 기존 A, B, C를 원래 순서대로 뒤에 기록
4. `[D,A,B,C]` 완성

### 8.5 평가 세트

Public 예시:

- `[1,2,3,4] → [4,1,2,3]`
- `[7] → [7]`
- `[2,2,5] → [5,2,2]`

Hidden 필수 그룹:

- `two_elements`
- `negative_values`
- `duplicates`
- `contains_zero`
- `longer_sequence`

오답 fixture:

1. `ROTATE-REVERSES-ALL`
2. `ROTATE-WRONG-DIRECTION`
3. `ROTATE-LOSES-BOUNDARY`

### 8.6 2★ 이해 확인

1. 회전 후에도 리스트 길이는 같다.
2. 마지막 항목만 맨 앞으로 이동하고 나머지 상대 순서는 유지된다.
3. 원소가 하나면 회전 전후가 같다.

### 8.7 Fresh Transfer

```text
함수: rotate_signal_left(signals)
목표: 첫 신호를 맨 뒤로 보내 왼쪽으로 한 칸 회전
```

Base와 반대 방향을 요구하여 단순 코드 복사를 방지한다. contextCard는 “첫 경계 기억 → 나머지 순서 유지 → 경계를 끝으로 이동”만 제공하고 완성 코드는 제공하지 않는다.

---

## 9. 파일 변경 범위

### 9.1 신규 Public Kernel

```text
src/components/AlgorithmConstellation/shared/problems/ac_seq_running_35.js
src/components/AlgorithmConstellation/shared/problems/ac_str_palin_37.js
src/components/AlgorithmConstellation/shared/problems/ac_seq_rotate_38.js
```

### 9.2 신규 Private Definition

```text
functions/algorithmConstellation/problems/ac_seq_running_35.private.cjs
functions/algorithmConstellation/problems/ac_str_palin_37.private.cjs
functions/algorithmConstellation/problems/ac_seq_rotate_38.private.cjs
```

### 9.3 기존 파일 보정

```text
src/components/AlgorithmConstellation/shared/problems/ac_str_reverse_01.js
functions/algorithmConstellation/problems/ac_str_reverse_01.private.cjs
src/components/AlgorithmConstellation/shared/problems/ac_nav_005.js
src/components/AlgorithmConstellation/shared/problems/index.js
functions/algorithmConstellation/problems/index.cjs
src/components/AlgorithmConstellation/shared/catalog/algorithmEditorialCatalog.js
src/components/AlgorithmConstellation/shared/python/pythonConceptRegistry.js
src/components/AlgorithmConstellation/shared/patterns/problemSolvingPatternRegistry.js
```

### 9.4 테스트 파일

```text
scripts/test-authoring-integrity-contracts.mjs
scripts/test-gate0-curriculum-contracts.mjs
scripts/test-server-orchestration-and-judge.mjs
scripts/test-client-server-runtime-parity.mjs
```

### 9.5 변경하지 않을 파일

```text
AlgorithmMissionShell.jsx
ExploreMode.jsx
StateTransitionLens.jsx
AlgorithmConstellationGateway.js
callableOrchestrator.cjs
algorithmProgressLedger.cjs
firestore.rules
```

기존 공용 계약으로 구현할 수 없을 때만 범위 변경을 검토한다. 문제별 예외 코드를 위 파일에 추가하지 않는다.

---

## 10. Catalog와 게이트 전환

최종 상태:

```text
31 core anchor published
32 core practice published
33 core practice published
34 core practice published
35 core practice published
36 core anchor published
37 core practice published
38 core practice published
39 branch review draft
40 branch review draft
```

성단 3은 Core 8/8이 된다. 필수 Anchor는 기존대로 31과 36이다.

게이트 테스트:

- Anchor 31 없이 Core 수만 채우면 성단 4 잠김
- Anchor 36 없이 Core 수만 채우면 성단 4 잠김
- 두 Anchor 포함 Core 5개 완료 시 잠김
- 두 Anchor 포함 Core 6개 완료 시 개방
- Branch 39·40은 개방 계산에서 제외
- 기존 완료 학생은 바뀐 선수 조건에도 복습 가능

Catalog의 35·37·38 `status: 'published'` 전환은 모든 Public/Private 등록과 표적 테스트가 통과한 뒤 마지막에 한다.

---

## 11. 자동화 검증 계약

### 11.1 저작 무결성

추가 검증:

- Published = Public = Private = 43
- 35 `.append()` 최초 Encounter 정합성
- 36에서 `builtin:range` 중복 소개 제거
- 35~38 실제 Lens ID가 모두 Registry에 존재
- Public/Hidden 입력 중복 없음
- Preview/Private Transfer 입력 중복 없음
- 4문제 Transfer contextCard에 `def`, `for`, `if`, `return`, 대입문 형태의 정답 코드 없음
- Public/Private 이해·전이 안내 동기화
- 공식·대안 해법 20,000 step 이내
- 모든 intended wrong fixture가 지정 그룹에서 실패

### 11.2 도메인

- 35: 길이 0~20, 정수 -20~20, 결과 길이 동일
- 36: 영문·숫자 문자열의 역순, singleton 포함
- 37: 대문자 문자열 길이 1~20, Boolean 반환
- 38: 리스트 길이 1~20, 정수 -100~100, 결과 길이 동일

### 11.3 런타임 패리티

다음 문법을 네 문제의 실제 공식 해법으로 Client Worker와 Server Judge에서 비교한다.

- 리스트 `.append()`
- 문자열·리스트 슬라이싱
- 문자열·리스트 equality
- 음수 인덱스
- 리스트 반환과 Boolean 반환

### 11.4 서버 수명주기

35·37·38 각각에 대해 다음을 한 번씩 검증한다.

```text
startAttempt
→ submitBase
→ submitUnderstandingEvidence
→ issueTransferChallenge
→ submitTransfer
→ progress 3-star 확인
```

모든 조합을 중복 테스트하지 않는다. 공용 Orchestrator 계약은 이미 검증되어 있으므로 신규 문제별 긍정 경로 1회와 대표 오답 경로만 추가한다.

---

## 12. 구현 순서

1. Pattern Registry에 35·38 사고 패턴 추가
2. Concept Registry의 `method:append` 최초 문제를 35로 이동
3. `AC-NAV-005` append 메타데이터를 requires로 보정
4. 35 Public/Private 구현 및 표적 테스트
5. 36 Public/Private 계약과 Lens 보정
6. 36 회귀 및 기존 완료 호환성 확인
7. 37 Public/Private 구현 및 표적 테스트
8. 38 Public/Private 구현 및 표적 테스트
9. Public/Private index에 3문제 등록
10. Catalog 선수 조건·Lens 갱신
11. Published/Public/Private 임시 동등성 확인
12. 35·37·38 status를 마지막에 published로 전환
13. 게이트·서버·패리티 전체 검증
14. ESLint와 프로덕션 빌드

Catalog를 먼저 출판하지 않는다. 중간 상태에서 학생에게 빈 카드가 노출되거나 서버 정의가 없는 문제가 열리지 않게 한다.

---

## 13. 비용·개발 효율 원칙

이번 Wave에서 허용되는 비용 증가는 정적 문제 데이터와 소형 테스트 실행뿐이다.

- Cloud Functions 호출 종류 증가: 0
- Firestore 문서 종류 증가: 0
- 실시간 Listener 증가: 0
- 신규 Worker/runtime 증가: 0
- 신규 React 컴포넌트 증가: 0
- 문제당 Hidden Test 목표: 4~6개
- 문제당 Transfer Master Test 목표: 3~4개

입력 전체 공간을 전수 검사할 필요가 없는 문제는 경계·오개념을 분리하는 최소 테스트만 둔다. 비슷한 정상 입력을 늘려 Judge 비용을 키우지 않는다.

---

## 14. 검증 명령

```bash
node scripts/test-authoring-integrity-contracts.mjs
node scripts/test-gate0-curriculum-contracts.mjs
node scripts/test-server-orchestration-and-judge.mjs
node scripts/test-client-server-runtime-parity.mjs
npm run test:algorithm-constellation
npx eslint src/components/AlgorithmConstellation functions/algorithmConstellation
npm run build
```

---

## 15. 완료 조건

### Gate C3-B — Running State 35

- [ ] `.append()` First Encounter가 35에서 노출
- [ ] 최종합과 누적합 리스트 오개념 분리
- [ ] 빈 리스트와 음수 변화량 처리
- [ ] 위치 일지 Fresh Transfer 통과

### Gate C3-R2 — String Anchor 36

- [ ] 존재하지 않는 Lens ID 제거
- [ ] Public/Private 2★·Transfer 동기화
- [ ] slicing만 신규 개념으로 소개
- [ ] 기존 문제 ID·버전·완료 이력 보존

### Gate C3-C — Palindrome 37 / Rotate 38

- [ ] 37이 첫·끝 비교만 하는 오답을 기각
- [ ] 37 문자열 → 리스트 대칭 Transfer 통과
- [ ] 38 회전·역순·반대 방향을 구분
- [ ] 38 우회전 → 좌회전 Transfer 통과

### Gate 성단 3 Core 완결

- [ ] 성단 3 Core 8/8 published
- [ ] Branch 39·40은 draft 유지
- [ ] Published = Public = Private = 43
- [ ] 두 Anchor + Core 6/8에서만 성단 4 개방
- [ ] 신규 JSX/API/Firestore 변경 0건
- [ ] 전체 테스트·ESLint·빌드 통과

---

## 16. 이번 단계에서 하지 않을 일

- Branch 39 반복 신호 압축기 구현
- Branch 40 IOI 구조 신호 찾기 구현
- 전용 StringScannerLens 신규 개발
- SequenceAccumulatorLens 범용화
- 문자열 대소문자·공백·특수문자 정규화
- N칸 일반 회전 또는 deque 회전
- Prefix Sum 구간합 질의
- 새 AI API 또는 자동 힌트 생성
- 학생 파일럿·접근성·별도 출판 승인으로 구현 차단

다음 Wave는 본 항로 완결 후 Branch 39·40을 코드 완성·패턴 스캔 심화로 구현한다.
