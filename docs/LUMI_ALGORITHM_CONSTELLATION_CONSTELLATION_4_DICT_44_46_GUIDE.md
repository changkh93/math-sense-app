# LUMI 알고리즘 성단 — 성단 4 Dictionary Anchor 44 · Core 45~46 개발 가이드

> 범위: R2 Dictionary 최소 런타임 계약, `AC-DICT-FREQ-44`, `AC-DICT-MODE-45`, `AC-DICT-STOCK-46`
>
> 목표: 항목별 횟수 기록 → 기록값 비교 → 키별 상태 갱신으로 이어지는 Dictionary 학습 사다리를 완성한다.
>
> 구현 원칙: 새 JSX·Lens·Callable·Firestore 구조를 만들지 않는다. 기존 `state-transition` Lens와 Public/Private Kernel 계약을 재사용한다.

---

## 1. 계획 평가와 최종 범위

성단 4의 41~43은 다음 Set 기초를 완성했다.

```text
41 중복 제거와 고유 종류 수
42 포함 여부 질의
43 공통 항목 기록
```

다음 44~46은 같은 “기록” 사고를 Dictionary로 확장한다.

```text
44 항목마다 이름표가 붙은 칸을 만들고 횟수를 누적한다.
45 각 칸의 횟수를 비교해 가장 큰 항목을 선택한다.
46 항목 이름으로 장부를 찾아 수량을 갱신하고 조회한다.
```

세 문제를 하나의 Wave로 묶는 이유는 다음과 같다.

- 44만 만들면 Dictionary가 단일 문제 전용 기능으로 남는다.
- 45와 46은 44의 동일한 기록표 상태를 재사용하므로 저작·검증 비용이 낮다.
- 44~46을 완료하면 성단 4 Core가 6/8이 되어 기존 성단 개방 규칙과 정확히 맞는다.
- 47~48의 “기억하며 찾기”는 Dictionary 기초가 안정된 뒤 별도 Wave로 설계하는 편이 안전하다.

### 승인 범위

- R2 Dictionary 최소 의미 보강: 승인
- 44~46 Public Kernel·Private Definition: 승인
- Python 개념 1종과 사고 패턴 3종 등록: 승인
- 새 Dictionary 전용 Lens: 불승인
- `.keys()`, `.values()`, `.items()`, dictionary comprehension: 이번 Wave 제외
- `.get()`: 이번 Wave 제외
- 47~50 동시 구현: 제외
- 접근성 심사·학생 파일럿·별도 출판 승인 Gate: 제외

---

## 2. 구현 전 확인된 런타임 Gap

현재 제한형 Python은 다음을 이미 지원한다.

- 비어 있지 않은 Dictionary literal: `{'A': 1}`
- `table[key]` 조회
- `table[key] = value` 갱신과 `container-mutation` Trace
- 문자열·리스트·Set의 `in`

하지만 44~46을 정직하게 실행하려면 다음이 부족하다.

1. Python에서 `{}`는 빈 Dictionary지만 현재 런타임에서는 빈 Set으로 해석된다.
2. `key in table`이 Dictionary key membership로 동작하지 않는다.
3. Dictionary 반환값을 Judge가 구조적으로 비교하지 않는다.
4. 존재하지 않는 key 조회가 명시적인 `KEY_ERROR`가 아니라 `undefined`로 흐를 수 있다.
5. 빈 Dictionary의 truthiness와 `len()` 의미가 Python과 다르다.

문제별 우회 코드를 만들지 말고 이 다섯 의미만 R2 공통 계약으로 고친다.

### 명시적 비범위

이번 Wave의 공식·대안 해법은 아래 기능을 사용하지 않는다.

```text
dict.get
dict.keys
dict.values
dict.items
for key in dictionary
dictionary comprehension
```

따라서 위 기능을 런타임에 추가하지 않는다. 새 메서드 예외 목록을 늘리는 대신 현재 세 문제에 필요한 최소 의미만 구현한다.

---

## 3. R2 Dictionary 최소 런타임 계약

수정 대상:

```text
src/components/AlgorithmConstellation/runtime/sharedPythonEvaluatorCore.js
functions/algorithmConstellation/sharedPythonEvaluatorCore.cjs
scripts/test-client-server-runtime-parity.mjs
scripts/test-semantic-trace-v2.mjs
```

### 3.1 공통 Dictionary 판별

Array, Set, `null`이 아니며 object인 값을 교육용 Dictionary로 취급한다.

권장 공통 helper:

```js
function isDictionary(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Set)
}
```

Client와 Server 파일에 의미가 같은 helper를 둔다. 한쪽만 수정하면 안 된다.

### 3.2 빈 literal

```text
{}       → Dictionary
{1, 2}   → Set
{'A': 1} → Dictionary
set()    → 빈 Set
```

빈 `{}`를 Dictionary로 해석한다. 빈 Set은 기존처럼 `set()`으로만 만든다.

### 3.3 Dictionary key membership

```python
'A' in table
'A' not in table
```

값이 아니라 key 존재 여부를 `Object.hasOwn(table, key)`로 판정한다. prototype chain을 조회하면 안 된다.

### 3.4 조회·갱신·누락 key

- `table[key]`는 own key만 읽는다.
- key가 없으면 `KEY_ERROR`로 실패 폐쇄한다.
- `table[key] = value`는 기존 `container-mutation` Trace를 유지한다.
- 위험 key `__proto__`, `prototype`, `constructor`는 입력 또는 학생 코드에서 들어와도 실패 폐쇄한다.

에러 메시지는 학생용으로 다음 수준이면 충분하다.

```text
기록표에 해당 이름표가 아직 없습니다. 먼저 존재 여부를 확인하거나 처음 값을 기록해 보세요.
```

### 3.5 반환값 비교

`matchesExpected()`에 Dictionary 구조 비교를 추가한다.

- key 순서에 의존하지 않는다.
- key 집합이 같아야 한다.
- 각 value는 기존 `matchesExpected()`로 재귀 비교한다.
- Set과 Dictionary를 같은 값으로 취급하지 않는다.

### 3.6 Python 기본 의미 정합성

다음 두 의미도 같은 helper를 재사용해 함께 고정한다.

```text
bool({}) == False
len({'A': 1, 'B': 2}) == 2
```

문제 공식 해법에서 필수로 사용하지 않더라도 Python 기본 의미를 어긋난 채 출판하지 않는다.

### 3.7 Trace 계약

Dictionary 갱신은 기존 event를 재사용한다.

```js
{
  eventType: 'container-mutation',
  stateDiff: [{
    kind: 'mutation',
    path: 'counts[A]',
    before: 1,
    after: 2,
  }],
  metadata: {
    operation: 'index-assignment',
  },
}
```

새 event type이나 Evidence Primitive를 만들지 않는다. 기존 `container-scan`, `container-membership`, `scalar-sequence`, `decision`을 조합한다.

### 3.8 R2 Gate

콘텐츠 등록 전에 다음 스니펫이 Client와 Server에서 동일해야 한다.

```python
def build_counts(items):
    counts = {}
    for item in items:
        if item in counts:
            counts[item] = counts[item] + 1
        else:
            counts[item] = 1
    return counts
```

필수 입력·결과:

```text
['A', 'B', 'A'] → {'A': 2, 'B': 1}
[]              → {}
```

추가 보안 회귀:

```text
key='__proto__'    → fail closed
key='constructor'  → fail closed
없는 key 직접 조회 → KEY_ERROR
```

---

## 4. 최종 선수 관계와 성단 개방

기존 초안의 44 선수 조건은 `AC-SET-UNIQUE-01`이지만, 실제 공식 해법은 `in`을 사용한다. 따라서 42를 선수 문제로 보강한다.

```js
// 44 Dictionary Anchor
prerequisites: ['AC-SET-MEMBERSHIP-42']

// 45 빈도표 비교
prerequisites: ['AC-DICT-FREQ-44']

// 46 기록표 갱신과 조회
prerequisites: ['AC-DICT-FREQ-44']
```

43과 44는 모두 42에서 갈라지는 학습 가지다.

```text
41 → 42 ─┬→ 43 Set 공통 항목
         └→ 44 Dictionary 빈도표 → 45
                              └→ 46
```

성단 5 개방 계약:

```text
41~45의 Core 5개 완료 → 잠금 유지
41~46의 Core 6개 완료 → 성단 5 개방
Branch 문제는 계산에서 제외
```

새 Firestore 조회나 별도 게이트 API는 필요하지 않다. 기존 `progressMap`과 `isConstellationUnlocked()`를 그대로 사용한다.

---

## 5. Concept Registry

### 5.1 신규 Python 개념 1종

```text
conceptId: builtin:dict
표시명: dict / {} — 이름표가 붙은 기록표
kind: builtin-type
canonicalFirstProblemId: AC-DICT-FREQ-44
```

First Encounter 내용:

```text
why:
  항목의 이름을 key로, 그 항목에 대한 수량이나 횟수를 value로 연결해 기억할 때 사용한다.

tinyExample:
  A가 2번, B가 1번 → {'A': 2, 'B': 1}

syntaxExample:
  counts = {}
  counts['A'] = 1

predictionCheck:
  {'A': 2, 'B': 1}에서 A 이름표의 값은? → 2
```

Dictionary literal과 key 조회·갱신을 하나의 “이름표 기록표” 개념으로 묶는다. 이번 Wave에서 별도의 `syntax:dict-subscript` 개념을 만들지 않는다.

### 5.2 기존 개념 재사용

44:

```js
requires: [
  'builtin:list',
  'statement:for',
  'statement:if',
  'operator:membership-in',
]
introduces: ['builtin:dict']
```

45:

```js
requires: [
  'builtin:list',
  'builtin:dict',
  'statement:for',
  'statement:if',
  'operator:comparison-lower-bound',
]
introduces: []
```

46:

```js
requires: [
  'builtin:list',
  'builtin:dict',
  'statement:for',
  'statement:if',
  'operator:membership-in',
]
introduces: []
```

---

## 6. 사고 패턴 Registry

### 6.1 `pattern:frequency-table`

```text
canonicalFirstProblemId: AC-DICT-FREQ-44
표시명: 항목마다 횟수 칸을 만들어 누적하기
```

사고 흐름:

```text
항목 도착 → 이름표가 있는지 확인 → 있으면 1 증가 → 없으면 1에서 시작
```

### 6.2 `pattern:argmax-by-associated-value`

```text
canonicalFirstProblemId: AC-DICT-MODE-45
표시명: 이름표에 연결된 값을 비교해 최댓값의 주인 찾기
```

동률 규칙까지 패턴에 포함한다.

```text
더 큰 값을 발견했을 때만 주인을 바꾸면 먼저 등장한 항목이 동률에서 유지된다.
```

### 6.3 `pattern:keyed-state-update`

```text
canonicalFirstProblemId: AC-DICT-STOCK-46
표시명: 이름표로 상태를 찾아 누적 갱신하기
```

세 Pattern Card의 `tinyExample`과 `syntaxExample`에는 완성된 함수, `for/if/return` 조합 또는 정답 코드 블록을 넣지 않는다. 사고 언어와 한 단계 예측만 제공한다.

---

## 7. AC-DICT-FREQ-44 — 신호 빈도표

### 7.1 교육 목표

동일한 신호가 다시 등장할 때 새 칸을 만들지 않고 기존 이름표의 횟수를 증가시키는 기록 모델을 학습한다.

```text
입력: ['A', 'B', 'A', 'C', 'B', 'A']
출력: {'A': 3, 'B': 2, 'C': 1}
```

### 7.2 Public Kernel

파일:

```text
src/components/AlgorithmConstellation/shared/problems/ac_dict_freq_44.js
```

핵심 계약:

```js
problemId: 'AC-DICT-FREQ-44'
problemVersion: 1
catalogOrder: 44
routeRole: 'core'
learningRole: 'anchor'
recommendedBand: 'EN'
prerequisites: ['AC-SET-MEMBERSHIP-42']
lensId: 'state-transition'
entryFunction: 'build_signal_frequency'
```

학습 메타데이터:

```js
thinkingPatterns: {
  requires: ['pattern:membership-query'],
  introduces: ['pattern:frequency-table'],
}
evidenceRecipe: {
  primitives: ['container-scan', 'container-membership', 'decision', 'scalar-sequence'],
  requiredClaims: ['DICT_FREQUENCY_TABLE'],
}
```

함수 계약:

```python
def build_signal_frequency(signals):
    # 신호별 등장 횟수를 기록표로 반환
```

입력 도메인:

- `signals`: 길이 0~12의 문자열 코드 목록
- 각 코드는 `A`~`F` 중 하나
- 반환값: `str -> int` Dictionary

### 7.3 Observe·Explore

Observe 예시:

```text
A, B, A, C, B, A
```

학생은 각 신호가 몇 번 왔는지 이름표 카드에 토큰을 올린다.

Explore frame:

```text
시작: 빈 이름표 기록판
A 도착: A 칸을 만들고 1
B 도착: B 칸을 만들고 1
A 재도착: A 칸만 2로 갱신
C 도착: C 칸을 만들고 1
B 재도착: B 칸을 2로 갱신
A 재도착: A 칸을 3으로 갱신
```

Observe·Explore에는 `{}`, `counts[key]`, 완성된 조건문을 노출하지 않는다. First Encounter가 `dict` 이름과 문법을 처음 공개한다.

### 7.4 Private Definition

파일:

```text
functions/algorithmConstellation/problems/ac_dict_freq_44.private.cjs
```

공식 해법:

```python
def build_signal_frequency(signals):
    counts = {}
    for signal in signals:
        if signal in counts:
            counts[signal] = counts[signal] + 1
        else:
            counts[signal] = 1
    return counts
```

Hidden groups:

```text
mixed-repeats    ['A','B','A','C','B','A'] → {'A':3,'B':2,'C':1}
all-distinct     ['A','B','C','D']           → 각 1
single-kind      ['C','C','C','C']           → {'C':4}
single-item      ['F']                       → {'F':1}
empty-input      []                          → {}
late-new-key     ['A','A','A','B']           → {'A':3,'B':1}
```

Intended wrong fixtures:

```text
FREQ-RESET-TO-ONE
  재등장할 때도 항상 1로 덮어씀
  expectedFailingGroup: mixed-repeats

FREQ-TOTAL-UNDER-ONE-KEY
  전체 길이만 한 key에 저장
  expectedFailingGroup: all-distinct

FREQ-MISSING-INITIALIZATION
  없는 key를 바로 +1
  expectedFailingGroup: single-item

FREQ-DROPS-LAST
  마지막 입력을 처리하지 않음
  expectedFailingGroup: late-new-key
```

### 7.5 2★ 이해 확인

객관적 질문:

1. 같은 A가 다시 왔을 때 칸 수가 늘어나는가, A 칸의 숫자가 늘어나는가?
2. 처음 본 C는 왜 1에서 시작하는가?
3. 빈 목록의 기록표가 비어 있는 이유는 무엇인가?

### 7.6 3★ Fresh Transfer

```text
title: 탐사팀 투표 빈도표
entryFunction: build_vote_frequency
입력: votes
출력: 후보 코드별 득표수 Dictionary
```

Public Preview 2건과 Private Master 5건의 입력은 중복시키지 않는다.

권장 Public Base:

```text
['D','E','D']     → {'D':2,'E':1}
['F','F','F']     → {'F':3}
```

---

## 8. AC-DICT-MODE-45 — 가장 많이 온 신호

### 8.1 교육 목표

빈도표를 만든 뒤 각 신호와 연결된 횟수를 비교해 가장 많이 등장한 신호를 선택한다.

동률 규칙을 반드시 명시한다.

> 가장 높은 횟수가 같으면 입력에서 먼저 등장한 신호를 반환한다.

### 8.2 Public Kernel

파일:

```text
src/components/AlgorithmConstellation/shared/problems/ac_dict_mode_45.js
```

핵심 계약:

```js
problemId: 'AC-DICT-MODE-45'
catalogOrder: 45
routeRole: 'core'
learningRole: 'practice'
prerequisites: ['AC-DICT-FREQ-44']
lensId: 'state-transition'
entryFunction: 'most_frequent_signal'
```

학습 메타데이터:

```js
thinkingPatterns: {
  requires: ['pattern:frequency-table'],
  introduces: ['pattern:argmax-by-associated-value'],
}
evidenceRecipe: {
  primitives: ['container-scan', 'decision', 'scalar-sequence'],
  requiredClaims: ['ASSOCIATED_VALUE_ARGMAX'],
}
```

입력 도메인:

- 길이 1~12의 비어 있지 않은 문자열 목록
- 동률이면 최초 등장 우선
- 반환값은 신호 코드 문자열

### 8.3 구현 전략

Dictionary 자체 순회나 `.items()`를 새로 지원하지 않는다. 입력 목록을 다시 순회하면서 연결된 count를 비교한다.

```python
def most_frequent_signal(signals):
    counts = {}
    for signal in signals:
        if signal in counts:
            counts[signal] = counts[signal] + 1
        else:
            counts[signal] = 1

    best = signals[0]
    for signal in signals:
        if counts[signal] > counts[best]:
            best = signal
    return best
```

`>`일 때만 교체하므로 동률에서 최초 등장 항목이 유지된다.

### 8.4 Hidden groups

```text
clear-winner        A,B,A,C,A → A
winner-at-end       A,B,C,C   → C
first-tie-wins      B,A,B,A   → B
all-tied            C,A,B     → C
single-item         F         → F
non-lexical-winner  Z,A,A     → A
```

Intended wrong fixtures:

```text
MODE-LAST-TIE-WINS       >= 사용 → first-tie-wins 실패
MODE-LEXICOGRAPHIC-MAX   문자 자체의 최댓값 반환 → non-lexical-winner 실패
MODE-RETURNS-COUNT       신호가 아니라 최대 횟수 반환 → clear-winner 실패
MODE-FIRST-ITEM-ONLY     첫 신호를 무조건 반환 → winner-at-end 실패
```

### 8.5 2★ 이해 확인

1. 빈도 3인 A와 빈도 2인 B 중 무엇을 선택하는가?
2. B와 A가 모두 2회이고 B가 먼저 등장했다면 왜 B가 유지되는가?
3. 가장 큰 횟수와 그 횟수의 주인을 구분할 수 있는가?

### 8.6 3★ Fresh Transfer

```text
title: 가장 많이 모은 탐사 배지
entryFunction: most_frequent_badge
동률: 최초 등장 배지 우선
```

Base와 Transfer 모두 같은 tie policy를 사용하되 데이터 값은 겹치지 않는다.

권장 Public Base:

```text
['A','B','A'] → 'A'
['C','B','B'] → 'B'
```

---

## 9. AC-DICT-STOCK-46 — 화물 재고 장부

### 9.1 교육 목표

화물 코드라는 key로 현재 수량을 찾고, 입고량을 누적한 뒤 요청한 화물의 최종 수량을 조회한다.

이번 문제는 출고·음수·삭제를 다루지 않는다. 모든 update는 양의 입고량이다.

### 9.2 Public Kernel

파일:

```text
src/components/AlgorithmConstellation/shared/problems/ac_dict_stock_46.js
```

핵심 계약:

```js
problemId: 'AC-DICT-STOCK-46'
catalogOrder: 46
routeRole: 'core'
learningRole: 'practice'
prerequisites: ['AC-DICT-FREQ-44']
lensId: 'state-transition'
entryFunction: 'get_final_stock'
```

학습 메타데이터:

```js
thinkingPatterns: {
  requires: ['pattern:frequency-table'],
  introduces: ['pattern:keyed-state-update'],
}
evidenceRecipe: {
  primitives: ['container-scan', 'container-membership', 'decision', 'scalar-sequence'],
  requiredClaims: ['KEYED_STATE_UPDATE'],
}
```

함수 계약:

```text
stock: 초기 재고 Dictionary
updates: [[화물 코드, 입고량], ...]
requested_part: 최종 수량을 조회할 코드
return: 요청한 코드의 최종 수량, 끝까지 없으면 0
```

도메인:

- 초기 key 0~5개
- update 0~8개
- 모든 수량·입고량은 0~100의 정수
- update 적용 후 값은 0~500

### 9.3 공식 해법

```python
def get_final_stock(stock, updates, requested_part):
    for update in updates:
        part = update[0]
        amount = update[1]
        if part in stock:
            stock[part] = stock[part] + amount
        else:
            stock[part] = amount

    if requested_part in stock:
        return stock[requested_part]
    return 0
```

`.get()`은 사용하지 않는다. 42에서 배운 membership와 44에서 배운 Dictionary 갱신을 재사용한다.

### 9.4 Hidden groups

```text
existing-key-update   기존 BOLT 2 + 입고 3 → 5
new-key-update        없던 CORE + 입고 4 → 4
repeated-updates      같은 key가 여러 번 입고됨
unrequested-updates   다른 key 갱신이 요청 key 값을 바꾸지 않음
missing-request       끝까지 없는 key → 0
empty-updates         초기값 그대로 조회
```

Intended wrong fixtures:

```text
STOCK-OVERWRITES       기존 수량에 더하지 않고 입고량으로 덮어씀
STOCK-IGNORES-NEW-KEY  초기 장부에 없는 화물을 기록하지 않음
STOCK-FIRST-UPDATE     첫 입고만 처리
STOCK-RETURNS-TOTAL    요청 key가 아니라 전체 재고 합을 반환
```

### 9.5 2★ 이해 확인

1. 기존 BOLT 2개에 3개가 입고되면 최종값은 3인가 5인가?
2. 처음 등장한 CORE는 왜 새 이름표를 만들어야 하는가?
3. 요청하지 않은 화물의 입고가 요청 화물 수량을 바꾸는가?

### 9.6 3★ Fresh Transfer

```text
title: 탐사팀 점수 장부
entryFunction: get_final_crew_score
초기 점수 + 여러 보너스 기록 후 특정 팀의 최종 점수 반환
없는 팀은 0
```

재고에서 점수로 도메인을 바꾸되 “key별 현재 상태를 누적 갱신하고 한 key를 조회한다”는 구조는 유지한다.

권장 Public Base:

```text
stock={'BOLT':2}, updates=[['BOLT',3]], requested_part='BOLT' → 5
stock={'NUT':4}, updates=[['CORE',2]], requested_part='CORE'  → 2
```

---

## 10. 인덱스·카탈로그 등록

수정 파일:

```text
src/components/AlgorithmConstellation/shared/problems/index.js
functions/algorithmConstellation/problems/index.cjs
src/components/AlgorithmConstellation/shared/catalog/algorithmEditorialCatalog.js
src/components/AlgorithmConstellation/shared/python/pythonConceptRegistry.js
src/components/AlgorithmConstellation/shared/patterns/problemSolvingPatternRegistry.js
```

카탈로그 변경:

```text
44 status: published, lensId: state-transition, prerequisite: 42
45 status: published, lensId: state-transition, prerequisite: 44
46 status: published, lensId: state-transition, prerequisite: 44
```

완료 후 집합 동등성:

```text
Published Catalog = Public Kernels = Private Definitions = 50개
```

---

## 11. 저작 무결성 계약

### 11.1 Public·Private 동기화

각 문제에서 다음을 자동 비교한다.

- Understanding Challenge 전체
- Transfer ID, title, description
- contextCard, thoughtCheck
- entryFunction, starterCode

### 11.2 테스트 격리

- Public Base와 Hidden Base 입력 중복 0건
- Public Transfer Preview와 Private Transfer Master 입력 중복 0건
- Public에는 authoritative expected set 전체를 넣지 않는다.

### 11.3 독립 Oracle

테스트 파일의 expected는 문제 정의를 그대로 복사하지 않고 JS Oracle로 다시 계산한다.

```js
// 44
signals.reduce((table, signal) => {
  table[signal] = (table[signal] || 0) + 1
  return table
}, {})

// 45
// 빈도 계산 후 최초 등장 순서를 유지하는 strict argmax

// 46
// 초기 장부 복제 후 update를 순서대로 누적하고 requested key 조회
```

### 11.4 Syntax Leak

Observe·Explore와 Transfer 사고 카드에서 다음 정답 조각을 검사한다.

```text
counts = {}
counts[key] = counts[key] + 1
if key in counts
return counts
```

First Encounter의 짧은 Dictionary 문법 예시는 허용한다. 학생이 정답 함수를 그대로 복사할 수 있는 완성 구조는 허용하지 않는다.

### 11.5 오답 Fixture 판별력

각 fixture는 다음을 모두 만족해야 한다.

- 전체 Judge 결과 실패
- 지정된 `expectedFailingGroup`에서 실제 실패
- 다른 fixture와 가능한 한 다른 첫 실패 원인
- 20,000 누적 step 이내 종료

---

## 12. 자동 검증 계획

### 12.1 Runtime R2

```bash
node scripts/test-semantic-trace-v2.mjs
node scripts/test-client-server-runtime-parity.mjs
```

검증:

- 빈 Dictionary literal
- key membership / not in
- key read / mutation
- missing key `KEY_ERROR`
- 위험 key fail closed
- Dictionary 구조 비교
- mutation Trace의 before/after
- Client/Server 100% parity

### 12.2 저작 무결성

```bash
node scripts/test-authoring-integrity-contracts.mjs
```

추가 계약:

- 44~46 도메인과 독립 Oracle
- Public/Hidden, Preview/Master 격리
- Public/Private 학습 콘텐츠 동기화
- First Encounter 이전 syntax leak 차단
- 50개 집합 동등성

### 12.3 커리큘럼 Gate

```bash
node scripts/test-gate0-curriculum-contracts.mjs
```

검증:

```text
44는 42 전 잠김
45·46은 44 전 잠김
Core 5/8에서는 성단 5 잠김
Core 6/8 + Anchor 41에서는 성단 5 개방
Branch 완료는 개방 계산에 영향 없음
```

### 12.4 서버 수명주기

```bash
node scripts/test-server-orchestration-and-judge.mjs
```

- 44~46 Base 1★
- Understanding 2★
- Fresh Transfer 3★
- 대표 오답 fixture 기각
- 멱등 보상과 기존 AI 연구 정책 유지

### 12.5 전체 검증

```bash
npm run test:algorithm-constellation
npx eslint src/components/AlgorithmConstellation functions/algorithmConstellation scripts/test-authoring-integrity-contracts.mjs scripts/test-gate0-curriculum-contracts.mjs scripts/test-client-server-runtime-parity.mjs scripts/test-semantic-trace-v2.mjs scripts/test-server-orchestration-and-judge.mjs
npm run build
```

---

## 13. 구현 순서

다른 AI는 다음 순서를 바꾸지 않는다.

```text
1. R2 Dictionary 의미를 Client evaluator에 구현
2. 동일 변경을 Server evaluator에 반영
3. R2 전용 parity·security·Trace 테스트 통과
4. builtin:dict와 사고 패턴 3종 등록
5. 44 Public/Private 구현 및 단독 검증
6. 45 Public/Private 구현 및 tie policy 검증
7. 46 Public/Private 구현 및 missing-key 정책 검증
8. Public/Private index와 Catalog를 한 번에 등록
9. 저작 무결성·게이트·서버 수명주기 테스트 갱신
10. 전체 13개 스위트, ESLint, Build
```

R2 Gate가 실패한 상태에서 문제 파일을 우회 구현하지 않는다.

---

## 14. 비용·공수 통제

### 허용되는 신규 파일

```text
Public Kernel 3개
Private Definition 3개
```

### 금지되는 확장

```text
신규 React 컴포넌트
Dictionary 전용 Lens
신규 Callable
Firestore collection 또는 index
문제별 Gateway 분기
문제별 Judge 코드
외부 AI API
```

### 예상 작업량

```text
R2 최소 런타임 + parity/security: 0.5~1.0 인일
44 Anchor:                         1.0~1.5 인일
45 Practice:                       0.5~0.8 인일
46 Practice:                       0.5~0.8 인일
통합 검증·회귀 수정:              0.5 인일
합계:                              약 3.0~4.6 인일
```

`.items()`나 `.get()`까지 선제 구현하면 검증 표면만 커진다. 실제 47~48 설계에서 필요성이 확정될 때 별도 추가한다.

---

## 15. 완료 정의

다음 조건을 모두 만족해야 완료다.

- R2 Dictionary 최소 계약이 Client/Server에서 동일하다.
- 위험 key와 missing key가 실패 폐쇄된다.
- 44~46의 공식·대안 해법이 모든 Base·Transfer를 통과한다.
- 의도된 오답이 지정 failure group에서 실패한다.
- 학생은 Dictionary 문법 전에 이름표 기록판의 행동을 먼저 경험한다.
- 41~46의 학습 순서에서 미학습 개념을 암묵적으로 요구하지 않는다.
- Published = Public = Private = 50이다.
- Core 5/8 잠금과 Core 6/8 개방이 모두 검증된다.
- 신규 UI·API·Firestore 비용은 0이다.
- 전체 테스트, ESLint, 프로덕션 빌드가 통과한다.

이 Gate를 통과한 다음 Wave는 `AC-DICT-TWOSUM-47`과 `AC-DICT-ONESHOT-48`이다. 그 단계에서 “모든 쌍 비교”와 “한 번 지나가며 기억하기”를 직접 비교하여 Dictionary의 효율성 가치를 처음 도입한다.
