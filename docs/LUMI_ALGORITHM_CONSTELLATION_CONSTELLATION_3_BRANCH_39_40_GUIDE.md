# LUMI 알고리즘 성단 — 성단 3 선택 항로 39·40 개발 가이드

> 범위: `AC-STR-COMPRESS-39`, `AC-STR-PATTERN-40`
>
> 목표: 이미 배운 순회·인접 비교·누적 기록·슬라이싱을 조합해 문자열 심화 Branch 2종을 완결한다.
>
> 구현 원칙: 새 Python 기능·런타임·Lens를 만들지 않고 기존 Kernel/3-Star/Judge 계약을 그대로 재사용한다.

---

## 1. 계획 평가와 최종 결정

성단 3의 Core 8문제는 이미 완결되었다. 다음 단계는 계획대로 39·40 선택 항로를 출판해 성단 3 전체 10문제를 닫는 것이다.

두 초안의 방향은 타당하지만 그대로 구현하면 다음 위험이 있다.

1. 39를 `A3B2` 같은 문자열로 반환하면 현재 학습하지 않은 정수→문자열 변환이 필요하다.
2. 40을 `.find()` 또는 `.count()`로 풀게 하면 새 문자열 메서드가 갑자기 등장하고 겹치는 패턴의 의미도 흐려진다. `len()`도 현재 Concept Registry에 등록되어 있지 않아 신규 요구 도구로 사용하지 않는다.
3. Catalog의 `string-scanner-lens`는 실제 Lens Registry에 없으므로 잘못된 기본 화면으로 떨어질 수 있다.
4. 현재 두 문제의 선수 조건은 36 하나뿐이라 실제 풀이에 필요한 33~35의 학습 이력을 반영하지 못한다.

따라서 아래처럼 확정한다.

| 문제 | 초안 의도 | 최종 계약 |
|---|---|---|
| 39 반복 신호 압축기 | Run-length 사고 | 연속 묶음을 `[[신호, 횟수], ...]`로 반환 |
| 40 IOI 구조 신호 찾기 | 부분 패턴 scan | 최근 문자 창을 한 칸씩 갱신해 `IOI`의 겹침 포함 개수 반환 |

### 승인 판단

- Branch 39·40 신규 구현: 승인
- 새 String Lens: 불승인
- `str()`, `.join()`, `.find()`, `.count()` 런타임 추가: 불승인
- 새 Callable, Firestore 스키마, React 화면: 불승인
- 새로운 Python 개념 First Encounter: 없음
- 사고 패턴 Registry 2종 추가: 승인
- 접근성 검증·학생 파일럿·별도 출판 승인: 이번 Gate에서 제외

---

## 2. 학습 사다리와 선수 조건

학생이 학습하지 않은 기능을 알고 있다고 가정하지 않는다. 두 문제는 새 문법 문제가 아니라 기존 도구의 조합 문제다.

```text
33 조건을 만족할 때 개수 누적
35 리스트에 순서대로 상태 기록
36 문자열·리스트 슬라이싱
  └─ 40 최근 문자 창을 한 칸씩 갱신해 겹치는 패턴 세기

34 인접 값 비교와 상태 보존
35 결과 리스트에 중간 상태 기록
36 문자열 일부 선택
  └─ 39 같은 신호의 연속 묶음을 확정·기록·초기화
```

Catalog 선수 조건은 다음으로 교체한다.

```js
// 39
prerequisites: [
  'AC-SEQ-ADJACENT-34',
  'AC-SEQ-RUNNING-35',
  'AC-STR-REVERSE-01',
]

// 40
prerequisites: [
  'AC-SEQ-COUNT-33',
  'AC-SEQ-RUNNING-35',
  'AC-STR-REVERSE-01',
]
```

선수 문제는 1★ 이상이어야 Branch 카드가 열린다. Branch 완료 여부는 성단 4 개방의 Core 6/8 계산에 영향을 주지 않는다.

---

## 3. 공통 구현 불변조건

두 문제는 기존 `createCapabilityPrototypeKernel`을 사용한다.

- `routeRole: 'branch'`, `learningRole: 'review'`
- `lensId: 'state-transition'`
- Public에는 공개 테스트, 학습 장면, Preview Transfer만 둔다.
- Private에 공식 해법, 대안 해법, 의도된 오답, Hidden/Transfer Master Set을 둔다.
- Public/Private의 이해 확인 및 Transfer 서술 계약은 동일해야 한다.
- Base Hidden과 Public 입력은 중복하지 않는다.
- Preview Transfer와 Authoritative Transfer 입력도 중복하지 않는다.
- 행동 결과로 채점하며 AST 모양, 변수명, 특정 풀이 문장을 강제하지 않는다.
- 입력은 교육용 소형 도메인으로 제한하고 Base/Transfer 공식 해법은 각각 누적 20,000 step 이내로 둔다.
- 문제별 JSX, API, Firestore 읽기·쓰기, 실시간 Listener를 추가하지 않는다.
- 원 출처의 지문·예시를 복제하지 않고 MetaSense 세계관과 테스트를 독자 작성한다.

### 구현 전 10분 적합성 확인

현재 evaluator로 아래 두 코드 형태가 실행되는지만 표적 테스트한다.

```python
groups.append([previous, count])
window.append(char)
window = window[-2:]
```

둘 중 하나가 실패해도 즉시 runtime을 확장하지 않는다. 먼저 기존 evaluator 문법과 Kernel 표현 오류인지 확인한다. 이번 Wave의 범위는 콘텐츠 구현이며 범용 인터프리터 확장이 아니다.

---

## 4. AC-STR-COMPRESS-39 — 반복 신호 압축기

### 4.1 학습 목표

전체 빈도와 연속 빈도를 구분한다. 현재 묶음의 신호와 길이를 유지하다가 신호가 바뀌는 경계에서 묶음을 결과에 기록하고 새 묶음을 시작한다.

일반적인 문자열 압축 결과인 `A3B2`는 사용하지 않는다. 현재 과정에서 `str(count)`가 학습되지 않았기 때문이다. 대신 아래의 명시적인 압축 표를 반환한다.

```text
"AAABBCCCC" → [["A", 3], ["B", 2], ["C", 4]]
```

이 표현은 연속 묶음의 핵심 구조를 그대로 보존하고, 이후 문자열 포맷팅 개념이 도입되어도 재사용할 수 있다.

### 4.2 Kernel 계약

```js
problemId: 'AC-STR-COMPRESS-39'
entryFunction: 'compress_signal_runs'
routeRole: 'branch'
learningRole: 'review'
lensId: 'state-transition'
```

입력·출력:

```text
signal: 길이 1~20의 대문자 문자열
return: [문자, 양의 연속 횟수] 형태의 2원소 리스트들을 담은 리스트
```

도메인은 비어 있지 않은 문자열로 고정한다. 빈 문자열 방어는 이 문제의 목표가 아니며 첫 항목 기준 초기화를 명확히 연습하기 위한 결정이다.

### 4.3 개념 및 사고 패턴

```js
pythonConcepts: {
  requires: [
    'builtin:list',
    'statement:for',
    'statement:if',
    'operator:equality',
    'operator:assignment',
    'operator:arithmetic-state-update',
    'method:append',
    'syntax:slicing',
  ],
  introduces: [],
}
```

Pattern Registry에 다음 항목을 추가한다.

```text
patternId: pattern:run-boundary-flush
표시명: 바뀌는 경계에서 묶음 기록하기
canonicalFirstProblemId: AC-STR-COMPRESS-39
```

핵심 설명:

> 같은 값이 이어지는 동안 횟수를 늘린다. 값이 바뀌는 순간 지금까지의 묶음을 기록하고, 새 값과 횟수 1로 다시 시작한다. 반복이 끝난 뒤 마지막 묶음은 별도로 기록한다.

```js
thinkingPatterns: {
  requires: [
    'pattern:first-item-initialization',
    'pattern:preserve-before-overwrite',
  ],
  introduces: ['pattern:run-boundary-flush'],
}
```

### 4.4 Observe·Explore 설계

Observe는 `A A A B B A` 카드열을 보여주고 다음을 묻는다.

- 같은 A가 마지막에 다시 나오면 앞의 A 묶음과 합쳐야 하는가?
- B가 처음 나타나는 순간 어떤 정보를 먼저 기록해야 하는가?
- 순회가 끝났을 때 아직 결과에 들어가지 않은 묶음은 무엇인가?

Explore는 완성 코드를 보여주지 않고 다음 상태 장면을 사용한다.

| 장면 | 현재 문자 | 보관 중 묶음 | 결과 |
|---|---:|---|---|
| 시작 | A | `[A, 1]` | `[]` |
| 같은 A | A | `[A, 2]` | `[]` |
| B로 변경 | B | `[B, 1]` | `[[A, 2]]` |
| 같은 B | B | `[B, 2]` | `[[A, 2]]` |
| A로 변경 | A | `[A, 1]` | `[[A, 2], [B, 2]]` |
| 종료 | - | - | `[[A, 2], [B, 2], [A, 1]]` |

`state-transition` 프레임에는 `index`, `current`, `previous`, `count`, `groups`를 둔다. Explore에서 `run-length encoding`이라는 성인 용어를 먼저 요구하지 않는다. 학생은 “묶음”과 “경계”로 경험한 뒤 Pattern Card에서 이름을 연결한다.

### 4.5 Starter와 공식 해법

Starter는 코드 완성형으로 제공한다.

```python
def compress_signal_runs(signal):
    groups = []
    previous = signal[0]
    count = 1

    for current in signal[1:]:
        # 같은 신호가 이어질 때와 바뀔 때 상태를 갱신하세요.
        pass

    # 마지막 묶음을 잊지 말고 기록하세요.
    return groups
```

공식 해법의 행동 계약:

```python
def compress_signal_runs(signal):
    groups = []
    previous = signal[0]
    count = 1
    for current in signal[1:]:
        if current == previous:
            count = count + 1
        else:
            groups.append([previous, count])
            previous = current
            count = 1
    groups.append([previous, count])
    return groups
```

공식 해법은 Private에만 둔다. 대안 풀이는 인덱스 순회처럼 행동이 같은 방법을 1개만 추가한다. Dictionary나 전체 문자별 빈도표를 정답 대안으로 넣지 않는다.

### 4.6 테스트와 오개념

Public 예시:

- `"AAABB" → [["A", 3], ["B", 2]]`
- `"ABBA" → [["A", 1], ["B", 2], ["A", 1]]`
- `"Z" → [["Z", 1]]`

Hidden 그룹은 5개면 충분하다.

1. `single-run`: 한 문자만 길게 반복
2. `alternating`: 매 위치에서 묶음 변경
3. `separated-same-symbol`: 같은 문자가 떨어져 다시 등장
4. `single-character`: 길이 1
5. `long-final-run`: 마지막 묶음 길이가 2 이상

의도된 오답 fixture:

| 오류 코드 | 행동 | 반드시 실패할 입력 |
|---|---|---|
| `RUN-GLOBAL-FREQUENCY` | 떨어진 같은 문자를 합침 | `AABA` |
| `RUN-MISSING-FINAL` | 루프 뒤 마지막 묶음 미기록 | `ABB` |
| `RUN-NO-RESET` | 신호 변경 뒤 count를 1로 초기화하지 않음 | `AABCC` |
| `RUN-APPEND-EVERY-CHAR` | 묶음이 아닌 문자마다 기록 | `AAA` |

테스트 계약에서 추가로 확인한다.

- 모든 count는 양의 정수다.
- 인접한 결과 묶음의 문자는 서로 다르다.
- 각 문자를 count만큼 다시 펼치면 원본 signal과 같다.

이 세 속성은 동일한 정상 입력을 여러 개 늘리는 것보다 오류를 잘 설명하면서 테스트 비용도 작다.

### 4.7 2★ 이해 확인

객관식 3문항으로 충분하다.

1. `AABA`의 첫 A 묶음과 마지막 A를 합치지 않는 이유
2. 신호가 바뀌는 순간 `previous`를 바꾸기 전에 해야 할 일
3. 반복문이 끝난 뒤 마지막 묶음을 별도로 기록하는 이유

학생 답안은 서버가 정답 ID로 검증한다. 자유 서술 AI 평가는 추가하지 않는다.

### 4.8 Fresh Transfer

문자열 대신 정수 센서열의 연속 구간을 요약한다.

```text
entryFunction: compress_temperature_runs
[2, 2, 5, 5, 5, 2] → [[2, 2], [5, 3], [2, 1]]
```

도메인은 길이 1~15의 정수 리스트다. 설명에는 “연속된 같은 값의 묶음”만 제시하고 Base의 완성 코드나 변수명을 복사하지 않는다.

---

## 5. AC-STR-PATTERN-40 — IOI 구조 신호 찾기

### 5.1 학습 목표

문자열을 한 글자씩 읽으면서 최근 문자만 담은 고정 길이 검사 창을 갱신하고, 창의 내용이 목표와 같은지 비교한다. 겹치는 일치도 놓치지 않는다.

성인 알고리즘 문제의 가변 `IOIOI...` 길이나 대규모 최적화는 다루지 않는다. 이 문제의 목표 패턴은 항상 길이 3인 `IOI`다.

### 5.2 Kernel 계약

```js
problemId: 'AC-STR-PATTERN-40'
entryFunction: 'count_ioi_signals'
routeRole: 'branch'
learningRole: 'review'
lensId: 'state-transition'
```

입력·출력:

```text
message: I와 O로만 이루어진 길이 0~30 문자열
return: 겹침을 포함한 "IOI" 시작 위치의 개수
```

예:

```text
"IOI" → 1
"IOIOI" → 2  # 시작 위치 0, 2
"IIOOI" → 0
```

### 5.3 개념 및 사고 패턴

```js
pythonConcepts: {
  requires: [
    'builtin:list',
    'statement:for',
    'statement:if',
    'method:append',
    'syntax:slicing',
    'operator:equality',
    'operator:arithmetic-state-update',
  ],
  introduces: [],
}
```

Pattern Registry에 다음 항목을 추가한다.

```text
patternId: pattern:sliding-window-scan
표시명: 같은 크기 검사 창을 한 칸씩 옮기기
canonicalFirstProblemId: AC-STR-PATTERN-40
```

```js
thinkingPatterns: {
  requires: ['pattern:filter-accumulate'],
  introduces: ['pattern:sliding-window-scan'],
}
```

`.find()`, `.count()`, `len()`은 소개하지 않는다. 도착한 문자를 창에 기록하고 최근 두 문자만 남기는 사고가 학습 목표이며, 35의 `.append()`와 36의 슬라이싱을 그대로 회수한다.

### 5.4 Observe·Explore 설계

`IOIOI` 위에 길이 3의 반투명 검사 창을 둔다. 코드는 시작 위치를 계산하지 않고, 새 문자가 도착할 때마다 창에 추가한 뒤 검사하고 최근 두 문자만 보존한다.

| 새로 도착한 위치 | 검사 직전 window | 일치 | 누적 | 다음 단계에 보존 |
|---:|---|---|---:|---|
| 0 | I | 아니오 | 0 | I |
| 1 | IO | 아니오 | 0 | IO |
| 2 | IOI | 예 | 1 | OI |
| 3 | OIO | 아니오 | 1 | IO |
| 4 | IOI | 예 | 2 | OI |

학생에게 먼저 다음을 예측하게 한다.

- 첫 일치를 찾은 뒤 세 칸을 건너뛰면 무엇을 놓치는가?
- 다음 검사에 최근 두 문자만 남겨야 하는 이유는 무엇인가?
- 길이가 3보다 짧으면 검사할 창이 몇 개인가?

프레임 필드는 `index`, `char`, `windowBeforeTrim`, `matched`, `matches`, `windowAfterTrim`으로 통일한다. 별도의 String Scanner JSX를 만들지 않는다.

### 5.5 Starter와 공식 해법

```python
def count_ioi_signals(message):
    matches = 0
    window = []
    for char in message:
        window.append(char)
        # window가 목표 신호인지 확인하고 matches를 갱신하세요.
        # 다음 검사를 위해 최근 두 문자만 남기세요.
        pass
    return matches
```

Private 공식 해법:

```python
def count_ioi_signals(message):
    matches = 0
    window = []
    for char in message:
        window.append(char)
        if window == ["I", "O", "I"]:
            matches = matches + 1
        window = window[-2:]
    return matches
```

길이 0~2에서는 창이 목표 리스트와 같아질 수 없어 결과 0을 반환한다. 별도 예외 처리는 요구하지 않는다.

### 5.6 테스트와 오개념

Public 예시:

- `"IOI" → 1`
- `"IOIOI" → 2`
- `"OOOO" → 0`

Hidden 그룹:

1. `empty-or-short`: 길이 0~2
2. `overlapping`: `IOIOI`
3. `match-at-last-start`: 마지막 가능한 위치에서만 일치
4. `separated-matches`: 겹치지 않은 여러 일치
5. `no-match`: I와 O가 있지만 목표 없음
6. `exact-one`: 메시지 전체가 IOI

의도된 오답 fixture:

| 오류 코드 | 행동 | 반드시 실패할 입력 |
|---|---|---|
| `PATTERN-DROP-OVERLAP` | 일치 후 window를 비움 | `IOIOI` |
| `PATTERN-TRIM-BEFORE-CHECK` | 검사 전에 최근 두 문자만 남김 | `IOI` |
| `PATTERN-COUNT-CHARACTERS` | I/O 개수로 추정 | 같은 문자 빈도, 다른 순서 입력 |
| `PATTERN-FIRST-WINDOW-ONLY` | 첫 세 글자만 검사 | 뒤쪽에만 IOI가 있는 입력 |

테스트 데이터의 기대값은 작은 독립 JS oracle로 다시 계산해 오탈자를 막는다. Hidden 개수 자체를 늘리지 않는다.

### 5.7 2★ 이해 확인

1. 세 번째 문자가 도착한 뒤 창에서 최근 두 문자만 남기는 이유
2. `IOIOI`에서 첫 일치 뒤 창을 비우면 두 번째 일치를 놓치는 이유
3. 길이 2 문자열의 결과가 0인 이유

### 5.8 Fresh Transfer

문자열에서 정수 리스트로 표현을 바꾼다.

```text
entryFunction: count_beacon_pattern
target pattern: [1, 0, 1]
[1, 0, 1, 0, 1] → 2
```

목표 패턴은 고정한다. 학생은 리스트 슬라이싱과 겹치는 창 스캔을 다시 구성한다. Preview와 Authoritative 입력은 분리한다.

---

## 6. 파일별 작업 목록

### 신규

```text
src/components/AlgorithmConstellation/shared/problems/ac_str_compress_39.js
src/components/AlgorithmConstellation/shared/problems/ac_str_pattern_40.js
functions/algorithmConstellation/problems/ac_str_compress_39.private.cjs
functions/algorithmConstellation/problems/ac_str_pattern_40.private.cjs
```

실제 저장소의 기존 파일명 규칙이 하이픈 또는 다른 접두사를 사용하면 그 규칙을 따른다. Public과 Private basename은 대응 관계가 명확해야 한다.

### 수정

```text
src/components/AlgorithmConstellation/shared/problems/index.js
functions/algorithmConstellation/problems/index.cjs
src/components/AlgorithmConstellation/shared/catalog/algorithmEditorialCatalog.js
src/components/AlgorithmConstellation/shared/patterns/problemSolvingPatternRegistry.js
scripts/test-authoring-integrity-contracts.mjs
scripts/test-gate0-curriculum-contracts.mjs
scripts/test-server-orchestration-and-judge.mjs
```

### 수정하지 않을 파일군

```text
runtime/**
client/modes/**
AlgorithmConstellationGateway*
callableOrchestrator.cjs
algorithmProgressLedger.cjs
firestore.rules
```

기존 공용 계약의 실제 버그가 표적 테스트에서 드러난 경우에만 범위를 다시 평가한다. 콘텐츠 구현 편의를 이유로 공용 엔진을 확장하지 않는다.

---

## 7. 테스트 설계

### 7.1 저작 무결성

- 39·40이 `draft`가 아닌 `published`
- Published/Public/Private ID 집합이 정확히 45개로 동일
- Public에 `officialSolutionCode`, Hidden, Transfer Master 입력이 없음
- Public/Private 이해 확인·Transfer 서술 계약 동기화
- `lensId === 'state-transition'`
- 39 출력이 2원소 리스트 묶음 계약을 만족
- 40이 겹치는 IOI를 포함해 정확히 셈
- 공식/대안 해법 통과, 모든 의도된 오답 fixture 기각

### 7.2 커리큘럼과 게이트

- 39는 34·35·36을 각각 1★ 이상 완료해야 열림
- 40은 33·35·36을 각각 1★ 이상 완료해야 열림
- Branch 39·40 완료가 성단 4 Core 개방 수에 더해지지 않음
- 두 Anchor와 Core 5개 + Branch 2개 상태에서는 성단 4가 잠김
- 두 Anchor와 Core 6개 상태에서만 성단 4가 열림
- 기존 성단 3 완료 이력과 문제 ID는 변경하지 않음

### 7.3 서버 수명주기

문제마다 긍정 경로 1회만 추가한다.

```text
startAttempt
→ submitBase
→ submitUnderstandingEvidence
→ issueTransferChallenge
→ submitTransfer
→ progress 3-star 확인
```

공용 Callable의 모든 음수 상태 전이를 문제마다 반복하지 않는다. 39는 `RUN-MISSING-FINAL`, 40은 `PATTERN-DROP-OVERLAP` 대표 오답만 서버 경로에서 한 번씩 확인한다.

### 7.4 런타임 패리티

기존 패리티 스위트에 최소 행렬만 추가한다.

- 중첩 리스트 생성과 `.append([value, count])`
- 리스트 슬라이싱과 equality
- 문자 순회와 리스트 `.append()`
- 최근 두 문자를 보존하며 겹치는 창을 한 칸씩 순회

---

## 8. 구현 순서

1. evaluator 적합성 표적 테스트 2개 실행
2. Pattern Registry에 39·40 패턴 등록
3. 39 Public/Private 작성
4. 39 속성·오답·Transfer 표적 테스트
5. 40 Public/Private 작성
6. 40 겹침·경계·Transfer 표적 테스트
7. Public/Private index 등록
8. Catalog 선수 조건과 Lens 보정
9. Published/Public/Private 임시 동등성 확인
10. 두 Catalog status를 마지막에 `published`로 전환
11. 게이트와 서버 수명주기 검증
12. 전체 테스트, ESLint, 빌드

Catalog를 먼저 출판하지 않는다. 학생 카드가 열렸는데 Public Kernel 또는 Private Judge 정의가 없는 중간 상태를 만들지 않기 위해서다.

---

## 9. 비용·개발 효율 기준

이번 Wave의 허용 증분은 정적 문제 데이터와 소형 테스트뿐이다.

| 항목 | 허용 증가 |
|---|---:|
| Cloud Functions 종류 | 0 |
| Firestore 컬렉션/문서 종류 | 0 |
| 실시간 Listener | 0 |
| Worker/runtime 기능 | 0 |
| React 컴포넌트 | 0 |
| Python 개념 Registry | 0 |
| 사고 패턴 Registry | 2 |
| 신규 Public Kernel | 2 |
| 신규 Private 정의 | 2 |

Hidden Test는 문제당 5~6개, Transfer Master는 3~4개를 목표로 한다. 같은 오류를 잡는 정상 입력을 중복 추가하지 않는다.

---

## 10. 검증 명령

```bash
node scripts/test-authoring-integrity-contracts.mjs
node scripts/test-gate0-curriculum-contracts.mjs
node scripts/test-server-orchestration-and-judge.mjs
node scripts/test-client-server-runtime-parity.mjs
npm run test:algorithm-constellation
npx eslint src/components/AlgorithmConstellation functions/algorithmConstellation
npm run build
```

실패 시 전체 파일을 다시 만드는 대신 최초 실패한 표적 계약부터 수정한다. 전체 스위트는 표적 테스트가 통과한 뒤 한 번 실행한다.

---

## 11. 완료 조건

### Gate C3-B39 — 연속 묶음 요약

- [ ] 전체 빈도와 연속 묶음이 구분됨
- [ ] 떨어져 다시 등장한 같은 문자를 별도 묶음으로 반환
- [ ] 마지막 묶음 누락 오답 기각
- [ ] 정수 리스트 Fresh Transfer 통과
- [ ] 새 문자열 변환 기능 사용 0건

### Gate C3-B40 — 고정 창 패턴 탐색

- [ ] `IOIOI`를 2개로 계산
- [ ] 마지막 가능한 시작 위치 검사
- [ ] 길이 0~2를 0으로 처리
- [ ] 정수 리스트 패턴 Fresh Transfer 통과
- [ ] `.find()`·`.count()`·`len()` 의존 0건

### Gate 성단 3 완결

- [ ] 성단 3 Core 8 + Branch 2 = 10/10 published
- [ ] Published = Public = Private = 45
- [ ] Branch 비차단 게이트 불변식 유지
- [ ] 신규 JSX/API/Firestore/runtime 변경 0건
- [ ] 전체 테스트·ESLint·빌드 통과

---

## 12. 이번 단계에서 하지 않을 일

- `A3B2` 문자열 포맷 생성
- 빈 문자열 Run-length 처리
- 가변 길이 `IOIOI...` 패턴 또는 대규모 입력 최적화
- KMP, Rabin–Karp, 정규표현식
- `.find()`, `.count()`, `.join()`, `str()` 신규 지원
- 전용 `StringScannerLens` 개발
- 공용 Judge 또는 Sandbox 리팩터링
- AI 자동 채점·힌트 API 추가
- 성단 4 문제 구현

다음 Wave는 이 Gate가 끝난 뒤 성단 4의 Anchor 41과 Core 초반을 설계한다.
