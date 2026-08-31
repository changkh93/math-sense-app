# LUMI 알고리즘 성단 — 성단 4 선택 항로 Branch 49·50 개발 가이드 (v2)

> 범위: `AC-DICT-ANAGRAM-49`, `AC-DICT-BUG-50`
>
> 목표: 빈도표를 “만드는 도구”에서 **두 구조를 비교하는 증거**와 **오류의 최초 발생 지점을 찾는 디버깅 도구**로 확장한다.
>
> 구현 원칙: 새 Callable·Firestore 구조·runtime capability·Lens 컴포넌트를 만들지 않는다. 기존 Dictionary 런타임, `state-transition` Lens, 서버 Judge와 3-Star 학습 루프를 재사용한다.
>
> **v2 변경 요약** (원안 대비 수정·보강):
> 1. 원안이 가정한 런타임 동작(dict 동등성·문자열 순회·set(문자열)·슬라이싱)을 클라이언트·서버 양쪽 평가기에서 **실행 검증 완료** — §1.3에 결과 명시
> 2. **누락됐던 필수 작업 추가**: `StateTransitionLens`의 dict 상태 표시 결함(`[object Object]`) 수정 — 현재 44~46에도 영향 있는 기존 버그 (§2 Gate 0)
> 3. 47·48에서 확립된 **반례 프레임 분리 규칙**(`experimentReset` + `stateBefore`)과 `stateDisplayTypes`를 49·50 Explore 계약에 추가 (§5.4, §6.3)
> 4. 게이트 테스트 번호 정정: 원안의 "Test 17" → **신규 Test 16** (현재 마지막은 Test 15)
> 5. 저작 테스트 총 개수 단언 `52 → 54` 갱신 위치 명시 (누락됐던 필수 수정, §9.1)
> 6. 사고 패턴 레지스트리 **전체 필드 계약** 10종 + syntax-leak 검사 목록 추가 (§4)
> 7. 2★ 질문 수를 기존 관행(3문항)으로 축소 — 원안 4~5문항은 인지 부하 예산 초과 (§5.6, §6.5)
> 8. 49 Hidden에 **한쪽만 빈 입력** 경계 케이스 추가 (§5.8)
> 9. fixture 구현 힌트 추가: `set(a) == set(b)` 리터럴 사용 가능(검증됨), DROPS-LAST는 슬라이싱으로(검증됨)

---

## 1. 현재 상태와 다음 Wave의 역할

### 1.1 성단 4 본 항로 완결 상태

```text
41 Set으로 중복 제거
42 포함 여부 질의
43 공통 항목 기록
44 Dictionary 빈도표
45 빈도표 값의 최댓값 주인
46 key별 상태 갱신
47 필요한 짝을 계산하고 뒤쪽 확인
48 지나온 값을 기억하며 한 번 확인
```

49·50은 새로운 Python 문법을 가르치는 문제가 아니다. 이미 배운 빈도표를 다른 사고 목적으로 재사용하는 선택 심화 항로다.

```text
49 두 통신 패킷의 문자별 빈도표가 같은지 비교한다.
50 잘못된 빈도표 코드가 처음 기대 상태에서 벗어나는 순간을 찾아 고친다.
```

두 문제를 같은 Wave로 묶는 이유:

- 49는 44에서 만든 Dictionary 결과의 구조적 비교를 복습한다.
- 50은 44의 초기화·증가 불변식을 코드 심판으로 회수한다.
- 두 문제 모두 기존 런타임 의미만으로 완결할 수 있다.
- Branch이므로 성단 5 개방 정책을 변경하지 않는다.

### 1.2 카탈로그 현재 상태 (구현 전 확인 사항)

카탈로그에 49·50 초안 항목이 이미 존재한다. `status: 'draft'`이며 lensId가 각각 `set-frequency-lens`, `source-debug-lens`로 되어 있다. 이번 Wave에서 아래 값을 교체한다.

```text
49 현재: status 'draft', lensId 'set-frequency-lens',  prereqs [44]
50 현재: status 'draft', lensId 'source-debug-lens',   prereqs [44]
```

### 1.3 런타임 실행 검증 결과 (원안 가정 확인 완료)

구현 착수 전 아래 사실을 클라이언트·서버 양쪽 평가기에서 실제 실행으로 확인했다. **모두 지원되므로 evaluator 확장이 필요 없다.**

| 검증 항목 | 결과 | 비고 |
| --- | --- | --- |
| dict `==` dict 구조 비교 (삽입 순서 상이) | ✅ 양쪽 모두 순서 무관 `True` | `"AABC"`/`"CABA"` 빈도표 비교로 확인 — 49 공식 해법의 핵심 의존성 |
| 문자열 `for` 순회 (`for ch in packet`) | ✅ | 빈 문자열은 0회 순회 |
| `set(문자열)` 생성 | ✅ | 49의 SET-ONLY fixture를 `return set(a) == set(b)` 리터럴로 작성 가능 |
| 리스트 슬라이싱 `signals[:len(signals) - 1]` | ✅ | 50의 DROPS-LAST fixture에 사용 가능 |
| `len(문자열)` | ✅ | 49의 LENGTH-ONLY fixture용 |
| dict 반환값 ↔ expected `{ A: 1 }` 매칭 | ✅ | 44 publicTests 형식과 동일 (plain object) |
| 빈 문자열 두 개 → `{} == {}` → `True` | ✅ | 한쪽만 빈 경우 → `False` |

> 주의: 한 줄 `if ...: x` / `else: y` 압축 문법은 지원되지 않는다(기존 문제들과 동일하게 다중 줄 if/else만 사용). fixture·공식 해법 모두 다중 줄로 작성한다.

### 1.4 등록 ID 확인 결과

| ID | 상태 | 조치 |
| --- | --- | --- |
| `builtin:dict` | ✅ 등록됨 | 재사용 |
| `operator:equality` | ✅ 등록됨 | 재사용 |
| `operator:membership-in` | ✅ 등록됨 | 재사용 |
| `pattern:frequency-table` | ✅ 등록됨 | 49·50의 requires로 재사용 |
| `source-debug` (Evidence Primitive) | ✅ 등록됨 | 50의 Evidence Recipe에 재사용 |
| `pattern:frequency-signature-comparison` | ❌ 미등록 | §4.1에서 등록 |
| `pattern:first-state-divergence` | ❌ 미등록 | §4.2에서 등록 |

선수 문제 확인: `AC-CODE-FIRST-ERROR-01`은 **성단 0 core, status published**다. 50의 선수 조건으로 사용 가능하며, 카탈로그/커널의 prerequisites 불일치가 없도록 양쪽에 동일하게 반영한다. 참고로 해당 문제 자체는 `source-debug-lens`를 lensId로 쓰고 있어(ConditionTableLens로 폴백 렌더링) 미등록 lensId를 새 문제에 쓰지 말아야 할 원안 판단의 근거가 된다.

성단 개방 로직 확인: `getConstellationAccess`는 이전 성단의 완료 판정에서 `routeRole === 'core'`만 집계하므로 **Branch 완료 여부는 성단 5 개방에 영향을 주지 않는다** (이미 구현된 동작 — 이번 Wave는 게이트 테스트에 단언만 추가한다).

---

## 2. Gate 0 — Lens dict 표시 결함 수정 (신규, 49·50 구현의 전제)

### 2.1 문제

`StateTransitionLens`의 `formatValue`는 배열은 `[a, b]`, set은 `{a, b}`(stateDisplayTypes)로 포맷하지만 **plain object를 처리하지 않아 `String(val)`인 `[object Object]`로 렌더링된다.**

이것은 49·50만의 문제가 아니라 **현재 44·45·46의 Explore 화면에 이미 존재하는 버그**다. 44의 프레임은 `stateAfter: { signal: 'A', signalCounts: { A: 1 } }`처럼 dict를 직접 담고 있어 학생에게 `[object Object]`가 보인다.

### 2.2 수정 내용

수정 파일:

```text
src/components/AlgorithmConstellation/client/modes/lenses/StateTransitionLens.jsx
```

`formatValue(val, displayType)`의 배열 분기 **앞에** plain object 분기를 추가한다 (새 컴포넌트 아님, 기존 함수 확장):

```text
{ A: 1, B: 2 }        →  {A: 1, B: 2}
{}                    →  {}
문자열 값은 그대로     →  {STAR: 2}
```

- 표시 순서는 `Object.entries` 삽입 순서를 그대로 따른다 (프레임 데이터는 저작자가 작성한 순서가 곧 교육적 순서).
- `null`/빈 값 표시(`아직 값 없음`) 기존 규칙 유지.
- 49·50의 lensConfig에서 dict 상태(`countsA`, `expectedCounts`, `buggyCounts`)는 이 포맷으로 화면에 표시된다.

### 2.3 왜 이번 Wave에 포함하는가

- 49·50의 Explore 상태 설계가 dict 표시에 직접 의존한다. 이 결함을 남긴 채 출판하면 새 문제 두 개가 모두 `[object Object]` 화면으로 나간다.
- 44~46이 같은 결함을 공유하므로 수정 한 번으로 기존 문제 화면도 함께 고쳐진다.
- "새 UI 0건" 원칙과 충돌하지 않는다 — 기존 lens 파일 내 함수 분기 추가다.

---

## 3. 공통 저작 규칙

### 3.1 문자열 도메인 (49)

```text
0 <= len(packet) <= 20
문자 범위: A~Z (대문자만)
대소문자 정규화 없음
공백·구두점 제거 없음
```

문제의 초점을 전처리가 아니라 빈도 동치에 유지한다.

### 3.2 Dictionary 계약 (49·50 공통)

```text
{} → 빈 Dictionary
key in table → own key membership
table[key] → 존재하는 key 조회
table[key] = value → container-mutation Trace
tableA == tableB → key 삽입 순서와 무관한 구조 비교 (실행 검증 완료, §1.3)
```

### 3.3 Syntax Leak

Observe, Explore, 사고 패턴 카드, 2★ 질문에서는 완성 정답 코드를 노출하지 않는다. **사고 패턴의 `syntaxExample` 필드도 정답 코드 문법을 포함하면 안 된다** (저작 테스트의 Pattern Card Syntax Leak 검사가 자동 검사한다 — §9.1).

50의 Starter Code는 수리 대상이므로 예외다. 학생에게 버그 코드를 제공하되, 문제 설명이나 주석으로 잘못된 줄과 정답 값을 직접 알려주지 않는다.

### 3.4 반례 프레임 분리 규칙 (47·48에서 확립된 규칙 적용)

Explore 타임라인에서 **성공 실행 뒤에 다른 입력의 반례 프레임을 배치할 때는 반드시 명시적 새 실험으로 분리**한다:

```js
{
  id: 'f4_counter',
  stepTitle: '⑤ 새 실험: …',
  experimentReset: true,                      // "🔄 새 실험 시작" 배너 표시
  stateBefore: { /* 초기화된 상태 */ },        // 직전 프레임 stateAfter를 이어받지 않음
  // ...
}
```

이 규칙이 없으면 이미 `True`를 반환한 실행이 갑자기 다른 입력으로 이어지는 것처럼 보인다(47·48 리뷰에서 지적·수정된 동일 결함). 49의 반례 프레임에 필수 적용.

### 3.5 상태 표시 타입 선언

set 상태는 `stateDisplayTypes`로 선언해 `{3, 8, 2}` / `set()`으로 표시한다 (48의 `seen` 사례). dict는 §2의 포맷이 자동 적용되므로 선언이 필요 없다.

---

## 4. 사고 패턴 레지스트리

수정 파일:

```text
src/components/AlgorithmConstellation/shared/patterns/problemSolvingPatternRegistry.js
```

### 4.1 필드 계약 (기존 항목과 동일한 10개 필드 필수)

Invariant 6이 `why`, `tinyExample`, `predictionCheck`를, 저작 테스트의 syntax-leak 검사가 `tinyExample`/`syntaxExample`을 검사한다. **신규 패턴은 기존 항목(예: `pattern:frequency-table`)의 필드 구조를 그대로 따른다:**

```js
{
  conceptId,              // 개념 카드 식별자
  patternId,              // 'pattern:frequency-signature-comparison' 등
  displayName,            // 학생 표시명
  kind,                   // 기존 항목의 kind 값 관행 따름
  canonicalFirstProblemId,// 아래 각 문제 ID
  why,                    // 왜 이 사고가 필요한가 (아동 친화적 문장)
  tinyExample,            // 코드 없는 극소 예 (예: "A,B,A와 B,A,A → A칸 2, B칸 1로 같음")
  syntaxExample,          // 정답 코드 문법 누출 금지 (검사 대상)
  predictionCheck,        // 예측 확인 질문
  protocolRepairId,       // 기존 항목 관행 따름
}
```

### 4.2 49 — frequency signature comparison

```js
'pattern:frequency-signature-comparison'
```

- 표시명: `항목별 횟수표를 지문처럼 비교하기`
- why (초안): `순서가 달라도 항목의 종류와 각 횟수가 모두 같으면 같은 구성이에요. 두 목록을 각각 빈도표로 바꾼 뒤 표 전체를 비교해요.`
- tinyExample (초안): `A,B,A 와 B,A,A → 둘 다 A칸 2, B칸 1이라 같은 구성`
- canonicalFirstProblemId: `AC-DICT-ANAGRAM-49`

### 4.3 50 — first state divergence

```js
'pattern:first-state-divergence'
```

- 표시명: `기대 상태와 처음 달라진 순간 찾기`
- why (초안): `최종 결과만 보지 않고 입력을 하나씩 처리한 뒤의 기대 상태와 실제 상태를 비교해요. 처음 달라진 단계의 규칙을 고치면 뒤의 오류가 함께 사라질 수 있어요.`
- tinyExample (초안): `A 처리 후 기대 A:1 / 실제 A:0 → 첫 단계에서 이미 어긋남`
- canonicalFirstProblemId: `AC-DICT-BUG-50`

### 4.4 Python Concept Registry

새 항목을 등록하지 않는다.

---

## 5. AC-DICT-ANAGRAM-49 — 같은 문자로 된 통신 패킷

### 5.1 학생 과제

두 패킷의 문자 순서는 달라도 된다. 각 문자의 종류와 등장 횟수가 모두 같으면 `True`, 하나라도 다르면 `False`를 반환한다.

```text
"AABC", "CABA" → True
"AAB",  "ABB"  → False
"",     ""     → True
"",     "A"    → False
```

학생용 설명에서는 “아나그램” 용어보다 “같은 문자 재료와 같은 개수”를 먼저 사용하고, 개념 이름은 규칙 발견 뒤에 연결한다.

### 5.2 Public Kernel

신규 파일:

```text
src/components/AlgorithmConstellation/shared/problems/ac_dict_anagram_49.js
```

핵심 계약:

```js
problemId: 'AC-DICT-ANAGRAM-49'
problemVersion: 1
entryFunction: 'have_same_packet_letters'
routeRole: 'branch'
learningRole: 'review'
lensId: 'state-transition'
prerequisites: ['AC-DICT-FREQ-44']
understandingChallenges[0].challengeId: 'uc_dict_049_1'
```

Python 개념:

```js
requires: [
  'builtin:dict',
  'statement:for',
  'statement:if',
  'operator:membership-in',
  'operator:equality',   // 등록 확인 완료 (§1.4)
]
introduces: []
```

사고 패턴:

```js
requires: ['pattern:frequency-table']
introduces: ['pattern:frequency-signature-comparison']
```

Evidence Recipe:

```js
primitives: [
  'container-scan',
  'container-membership',
  'decision',
  'scalar-sequence',
]
requiredClaims: ['FREQUENCY_SIGNATURE_EQUIVALENCE']
```

### 5.3 공식 해법

```python
def have_same_packet_letters(packet_a, packet_b):
    counts_a = {}
    for char in packet_a:
        if char in counts_a:
            counts_a[char] = counts_a[char] + 1
        else:
            counts_a[char] = 1

    counts_b = {}
    for char in packet_b:
        if char in counts_b:
            counts_b[char] = counts_b[char] + 1
        else:
            counts_b[char] = 1

    return counts_a == counts_b
```

- dict 순회나 `.items()` 없이 현재 런타임만 사용한다.
- `counts_a == counts_b`의 삽입 순서 무관성은 **양쪽 평가기에서 실행 검증 완료** (§1.3).
- 선택: `alternativeSolutions`에 "counts_a에서 빼기" 단일 표 해법(길이 검사 + membership + 감소 + 총합 확인)을 넣으면 전략 다양성을 보여줄 수 있으나 필수는 아니다. 이 해법도 dict 순회 없이 작성 가능하다.

### 5.4 Observe·Explore

Observe 대표 입력:

```text
packet_a = "AABC"
packet_b = "CABA"
```

Explore 프레임 설계 (구체 계약 — 원안에는 프레임이 없었음):

```text
introContext.variables — 최종 상태 안내
initialState: { currentPacket: null, countsA: {}, countsB: {}, sameFrequency: null }

f0  "① AABC 스캔 — A,B,C 순으로 기록"   stateAfter: { countsA: {A:2,B:1,C:1}, ... }
f1  "② CABA 스캔 — C,A,B 순으로 기록"   stateAfter: { countsB: {C:1,A:2,B:1}, ... }
f2  "③ 두 표 비교 — 순서는 달라도 구성 같음 → True"
f3_counter  "④ 새 실험: AAB vs ABB"
    experimentReset: true
    stateBefore: { currentPacket: null, countsA: {}, countsB: {}, sameFrequency: null }
    stateAfter: { countsA: {A:2,B:1}, countsB: {A:1,B:2}, sameFrequency: false }
```

- f3_counter는 §3.4의 반례 분리 규칙을 **반드시** 적용한다 (experimentReset + stateBefore).
- dict 상태는 §2의 lens 포맷으로 `{A: 2, B: 1}`처럼 표시된다.
- 반례가 `set(packet_a) == set(packet_b)` 오답을 직접 깨야 한다는 원안 의도 유지: "종류는 {A,B}로 같지만 A와 B의 횟수가 달라 False"를 prompt에 명시.

### 5.5 Public Tests

```js
[
  { inputs: { packet_a: 'AABC', packet_b: 'CABA' }, expected: true },
  { inputs: { packet_a: 'AAB', packet_b: 'ABB' }, expected: false },
]
```

### 5.6 2★ 이해 확인 (3문항 — 기존 44·47·48 관행과 동일)

`challengeId: 'uc_dict_049_1'` 필수 질문:

1. 문자 순서가 달라도 `True`가 될 수 있는 이유 (선택지에 "빈도표는 순서를 기억하지 않고 종류와 개수만 기억한다" 포함 — 삽입 순서 무관성을 추상 용어 없이 여기에 녹인다)
2. 문자 종류만 같은 것으로는 부족한 이유 (AAB vs ABB 반례 언급)
3. 두 빈 문자열이 `True`인 이유 (빈 표 두 개는 같은 표)

> 원안의 4번째 질문("key 삽입 순서 비의존")은 초·중등 학생에게 추상적이므로 독립 문항에서 제외하고 1번 선택지에 구체적으로 녹인다.

### 5.7 Fresh Transfer

문자열을 그대로 복제하지 않고 문자열 토큰 목록으로 전이한다.

```text
title: 같은 재료로 만든 배지 조합
entryFunction: have_same_badge_recipe
inputs: badges_a, badges_b
output: 배지 종류별 개수가 모두 같으면 bool
transferChallengeId: 'tc_dict_049_transfer_1'
```

예시:

```text
['STAR', 'MOON', 'STAR']
['MOON', 'STAR', 'STAR'] → True
```

다문자 key('STAR')도 dict key로 사용 가능 — 런타임 제약 없음(44의 이름표 key와 동일한 방식).

### 5.8 Private Definition

신규 파일 (파일명은 카탈로그 ID 표기 `AC-DICT-ANAGRAM-49`를 따른다):

```text
functions/algorithmConstellation/problems/ac_dict_anagram_49.private.cjs
```

Hidden Test 그룹:

| group | 입력 의도 |
| --- | --- |
| `reordered-equivalent` | 순서만 다르고 빈도 동일 |
| `multiplicity-different` | 문자 종류는 같고 횟수만 다름 |
| `same-length-different` | 길이는 같지만 구성 다름 |
| `one-side-empty` | **한쪽만 빈 문자열 — 양 방향 모두** (v2.1 정정: 인수 순서에 비대칭인 오답이 존재하므로 `('', 'A')`와 `('A', '')`를 쌍으로 검사한다) |
| `empty-both` | 빈 문자열 두 개 |
| `identical-order` | 입력 자체가 동일 |
| `different-length` | 길이부터 다름 |

> 7개 그룹이면 "문제당 Hidden 5~6건" 예산을 1 초과한다. 예산을 지키려면 `one-side-empty`를 `different-length`에 포함시키고 **양 방향 케이스를 모두 포함**한다(그룹명은 하나로). 어느 쪽이든 총 Hidden 개수는 6 이내로 유지.
>
> v2.1 정정: Transfer Private에도 `badges_a=['STAR'], badges_b=[] -> False`를 `badges_a=[], badges_b=['MOON'] -> False`와 쌍으로 포함한다. 저작 테스트 단언은 "빈 입력 케이스 존재"가 아니라 **양 방향 경계가 모두 존재**함을 검사한다. (성단 5 가이드 §1.1 발견 — 한 방향만 검사하면 비대칭 오답이 전체 Hidden을 통과한다.)

Intended Wrong Fixtures:

| id | 오류 | expectedFailingGroup | 구현 힌트 (검증 완료) |
| --- | --- | --- | --- |
| `ANAGRAM-SET-ONLY` | 문자 종류 Set만 비교 | `multiplicity-different` | `return set(packet_a) == set(packet_b)` 리터럴 그대로 사용 가능 |
| `ANAGRAM-LENGTH-ONLY` | 길이만 같으면 True | `same-length-different` | `len()` 비교 |
| `ANAGRAM-ORDER-ONLY` | 원본 문자열이 완전히 같아야 True | `reordered-equivalent` | `return packet_a == packet_b` |
| `ANAGRAM-ALWAYS-TRUE-FOR-NONEMPTY` | 내용 대신 비어 있지 않음만 판정 | `same-length-different` | `len(a) > 0 and len(b) > 0` — `and`는 지원됨(COND 계열 검증됨) |

> 48번 리뷰에서 확립된 **Invariant 5b**(fixture가 문법·보안 오류로 크래시하면 게이트 실패)가 새 fixture에 자동 적용된다. 네 fixture 모두 §1.3에서 검증한 문법만 사용하므로 통과 가능하다.

---

## 6. AC-DICT-BUG-50 — 빈도표 오류 찾기

### 6.1 학생 과제

학생은 빈 화면에서 빈도표를 다시 작성하지 않는다. 실행은 되지만 잘못된 결과를 내는 코드를 받아 다음 순서로 수리한다.

```text
관찰 → 기대 상태 예측 → 실제 상태와 비교 → 최초 차이 단계 확인 → 코드 수리
```

Base Starter Code:

```python
def repair_signal_frequency(signals):
    counts = {}
    for signal in signals:
        if signal in counts:
            counts[signal] = counts[signal] + 1
        else:
            counts[signal] = 0
    return counts
```

버그는 새 항목을 0으로 시작하는 한 줄이다. Starter 주석으로 정답 `1`을 알려주지 않는다.

> 검증 완료: 이 Starter는 `['A']`에서 `{A: 0}`을 반환해 Public Test 1(`{A: 1}`)에 실제 실패한다. 빈 입력에서는 `{}`를 반환해 통과한다(§6.4 참조).

### 6.2 Public Kernel

신규 파일:

```text
src/components/AlgorithmConstellation/shared/problems/ac_dict_bug_50.js
```

핵심 계약:

```js
problemId: 'AC-DICT-BUG-50'
problemVersion: 1
entryFunction: 'repair_signal_frequency'
routeRole: 'branch'
learningRole: 'review'
lensId: 'state-transition'
prerequisites: [
  'AC-DICT-FREQ-44',
  'AC-CODE-FIRST-ERROR-01',  // 성단 0 core, published — 유효한 선수 (§1.4)
]
understandingChallenges[0].challengeId: 'uc_dict_050_1'
```

카탈로그의 prerequisites도 동일하게 2항목으로 갱신한다(현재 초안은 44만 있다). 커널과 카탈로그의 prerequisites 불일치는 게이트 계약 위반이다.

Python 개념:

```js
requires: [
  'builtin:dict',
  'statement:for',
  'statement:if',
  'operator:membership-in',
]
introduces: []
```

사고 패턴:

```js
requires: ['pattern:frequency-table']
introduces: ['pattern:first-state-divergence']
```

Evidence Recipe:

```js
primitives: [
  'source-debug',   // 등록 확인 완료 (§1.4) — 신규 프리미티브 아님
  'container-scan',
  'decision',
]
requiredClaims: ['FIRST_FREQUENCY_STATE_DIVERGENCE']
```

### 6.3 Observe·Explore

대표 입력:

```text
signals = ['A', 'B', 'A']
```

프레임 (원안 표 유지, 렌즈 인코딩 방식 명시):

| 단계 | 입력 | 기대 counts | 버그 counts | 판정 |
| ---: | --- | --- | --- | --- |
| 시작 | - | `{}` | `{}` | 같음 |
| 1 | A | `{A: 1}` | `{A: 0}` | 최초 차이 |
| 2 | B | `{A: 1, B: 1}` | `{A: 0, B: 0}` | 차이 지속 |
| 3 | A | `{A: 2, B: 1}` | `{A: 1, B: 0}` | 최종 오답 |

렌즈 인코딩: 한 프레임의 `stateAfter`에 두 dict를 나란히 담는다 — 별도 UI 없이 기존 상태 표시로 충분하다.

```js
stateAfter: { signal: 'A', expectedCounts: { A: 1 }, buggyCounts: { A: 0 }, diverged: true }
```

- `diverged` 불리언 키로 "최초 차이" 순간을 프레임 상태에 표시한다.
- 50은 **단일 연속 실행**을 다루므로 experimentReset 프레임이 필요 없다(반례 분리 규칙 해당 없음).
- dict 표시는 §2의 lens 포맷이 처리한다.
- "최종 A가 1이므로 증가 줄이 틀렸다"는 성급한 판단을 막고, 첫 A 직후 이미 상태가 달라졌음을 보여준다는 원안 의도 유지.

### 6.4 Public Tests

```js
[
  { inputs: { signals: ['A'] }, expected: { A: 1 } },
  { inputs: { signals: ['B', 'B'] }, expected: { B: 2 } },
]
```

- Public Test 1이 Starter 실패 계약(§7)을 담당한다. `['A']` → Starter `{A: 0}` ❌.
- 빈 입력은 Starter도 통과하므로 Public 대표 테스트로 사용하지 않는다. Hidden에는 회귀 보호용으로 포함한다.
- expected는 44 관행대로 **plain object** `{ A: 1 }` (§1.3 검증).

### 6.5 2★ 이해 확인 (3문항으로 축소 — 원안 5문항은 인지 부하 예산 초과)

`challengeId: 'uc_dict_050_1'` 필수 질문:

1. 기대 상태와 실제 상태가 **처음** 달라지는 단계와 그 이유 (첫 새 항목 초기화 — `['A','B','A']` 표에서 선택)
2. 첫 등장 값이 1이어야 하는 이유 (이미 한 번 등장했다는 사실이 1로 기록되어야 증가 분기와 이어짐)
3. 반복 항목을 증가시키는 분기(`counts[s] + 1`)는 이미 올바르다는 점 — 고칠 줄이 어느 쪽인지 선택

> 원안의 4번(빈 입력으로 발견 불가)·5번(최소 반례 크기)은 좋은 내용이므로 **문항 수를 늘리지 않고** 2번·3번의 오답 선택지·해설 문구에 녹인다 (예: 오답 선택지 "빈 입력으로도 이 버그를 찾을 수 있다").

### 6.6 Fresh Transfer

Base의 초기화 버그와 다른 갱신 버그를 수리하게 한다.

```text
title: 투표 집계기의 반복 득표 오류
entryFunction: repair_vote_frequency
inputs: votes
output: 후보별 득표수 Dictionary
transferChallengeId: 'tc_dict_050_transfer_1'
```

Transfer Starter Code:

```python
def repair_vote_frequency(votes):
    tally = {}
    for vote in votes:
        if vote in tally:
            tally[vote] = 1
        else:
            tally[vote] = 1
    return tally
```

- 첫 표의 초기화는 맞지만 반복 표가 누적되지 않는다. 학생은 Base의 정답 숫자를 그대로 복사하는 것이 아니라 초기화와 갱신의 역할 차이를 전이해야 한다.
- Transfer Private Test에 반복 득표 케이스(`['X', 'X']` → `{X: 2}`)가 반드시 포함되어야 Starter가 실제 실패한다(§7 계약).

### 6.7 Private Definition

신규 파일:

```text
functions/algorithmConstellation/problems/ac_dict_bug_50.private.cjs
```

공식 해법은 정상 빈도표 구현이며 Public Starter와 분리한다.

Hidden Test 그룹:

| group | 입력 의도 | 판별력 비고 |
| --- | --- | --- |
| `first-new-key` | 단일 항목으로 초기화 오류 즉시 노출 | Starter도 실패 (핵심 그룹) |
| `repeated-key` | 동일 항목 누적 | |
| `late-new-key` | 마지막에 새 key 등장 | |
| `mixed-frequency` | 여러 key와 반복 혼합 | |
| `empty-input` | 빈 Dictionary 회귀 | **비판별 그룹**: Starter·합리적 fixture 대부분 통과. 공식 해법 회귀 보호용으로만 존재 |
| `separated-repeat` | 떨어져 다시 등장하는 key | |

Intended Wrong Fixtures:

| id | 오류 | expectedFailingGroup | 구현 힌트 (검증 완료) |
| --- | --- | --- | --- |
| `FREQBUG-INITIALIZES-ZERO` | Base Starter와 같은 오류 | `first-new-key` | §6.1 코드 그대로 |
| `FREQBUG-RESETS-REPEAT` | 반복 등장 때 1로 덮어씀 | `repeated-key` | if 분기에서 `= 1` |
| `FREQBUG-DROPS-LAST` | 마지막 입력 미처리 | `late-new-key` | `signals[:len(signals) - 1]` 슬라이싱 (§1.3 검증) |
| `FREQBUG-TOTAL-UNDER-FIRST` | 전체 길이를 첫 key 하나에 기록 | `mixed-frequency` | 첫 등장 시 `counts[s] = len(signals)` — `first-new-key`({A:1})와 `repeated-key`는 통과하므로 그룹 분리 양호 |

---

## 7. Public·Private 동기화

두 문제 모두 다음 항목이 Public Kernel과 Private Definition에서 일치해야 한다.

```text
problemId
problemVersion
entryFunction
prerequisites (커널 curriculum ↔ 카탈로그 양쪽)
understanding challenge ID와 객관식 expected
transferChallengeId
transfer entryFunction
transfer title/description/context/thoughtCheck
```

Public Preview Test와 Private Master Test의 입력 직렬화 값은 중복 0건이어야 한다.

50은 추가로 다음을 검증한다.

- Public Base Starter가 Public Test 최소 1개에서 실제 실패 (`['A']` → `{A: 0}` — 검증 완료)
- Transfer Starter가 Private Transfer Test 최소 1개에서 실제 실패 (반복 득표 케이스)
- Official Solution은 Base/Transfer 전체 통과

---

## 8. 인덱스와 카탈로그

수정 파일:

```text
src/components/AlgorithmConstellation/shared/problems/index.js
functions/algorithmConstellation/problems/index.cjs
src/components/AlgorithmConstellation/shared/catalog/algorithmEditorialCatalog.js
```

카탈로그 최종값 (§1.2의 초안에서 변경되는 필드):

```js
// 49
status: 'published'                        // 'draft' → 'published'
lensId: 'state-transition'                 // 'set-frequency-lens' → 교체
prerequisites: ['AC-DICT-FREQ-44']         // 변경 없음
provenance.adaptationNotes: '두 빈도표의 구조적 동치 비교'

// 50
status: 'published'                        // 'draft' → 'published'
lensId: 'state-transition'                 // 'source-debug-lens' → 교체
prerequisites: ['AC-DICT-FREQ-44', 'AC-CODE-FIRST-ERROR-01']  // 2번째 항목 추가
provenance.adaptationNotes: '최초 상태 차이로 초기화·갱신 오류 수리'
```

완료 후:

```text
성단 4 = Core 8 + Branch 2 = 10/10
Published = Public = Private = 54개
```

> 패리티 테스트(`test-client-server-runtime-parity.mjs`)와 저작 테스트는 `PUBLIC_KERNELS`를 자동 순회하므로 49·50이 인덱스에 등록되는 순간 자동 검사 대상이 된다. 별도 등록 불필요.

---

## 9. 검증 계획

### 9.1 저작 무결성

수정 파일:

```text
scripts/test-authoring-integrity-contracts.mjs
```

**필수 갱신 2건 (원안 누락):**

1. **총 개수 단언**: 파일 말미의 `assert.equal(registeredProblemIds.length, 52, ...)`을 `54`로 변경. 이 갱신을 빠뜨리면 첫 실행에서 즉시 실패한다.
2. **Pattern Card Syntax Leak 검사 목록**: "Pattern Card Syntax Leak Check for 41~48"의 하드코딩된 배열에 `'pattern:frequency-signature-comparison'`, `'pattern:first-state-divergence'` 추가.

49 독립 Oracle:

```js
function frequencyOf(values) {
  const counts = new Map()
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1)
  return [...counts.entries()].sort(([a], [b]) => String(a).localeCompare(String(b)))
}
```

두 signature의 deep equality로 expected를 검증한다. 공식 Python 구현을 그대로 번역한 plain object Oracle은 피한다.

50 독립 Oracle:

- `Map` 기반으로 Base·Hidden·Transfer expected 검증
- Starter가 실제로 실패하는지 실행 검증 (Base `['A']`, Transfer `['X','X']`)
- 각 intended wrong fixture가 선언한 그룹에서 기각되는지 검증
- **Invariant 5b가 자동 적용**되어 문법 크래시 fixture는 게이트에서 차단된다 (48번 사례 재발 방지)

공통:

- 10대 저작 불변식 + Invariant 5b
- 사고 패턴 2종 등록 (10필드 계약 §4.1 충족)
- Syntax Leak 0건
- Public/Private Transfer 중복 0건
- 정확히 54개 집합 동등성

### 9.2 커리큘럼과 게이트

수정 파일:

```text
scripts/test-gate0-curriculum-contracts.mjs
```

**신규 `[Test 16]` 추가** (원안의 "Test 17"은 오류 — 현재 마지막 테스트는 Test 15. Test 16·17은 존재하지 않는다):

- 49는 44 미완료 시 잠김
- 50은 44 또는 AC-CODE-FIRST-ERROR-01 중 하나라도 미완료 시 잠김
- 49·50은 모두 Branch (`routeRole === 'branch'`)
- Branch 완료 여부가 성단 5 개방 조건에 영향 없음 — `getConstellationAccess`가 core만 집계하는 **현재 구현 동작**에 대한 회귀 단언 (구현 변경 불필요)
- 성단 4 Published가 Core 8 + Branch 2로 정확히 구성

### 9.3 서버 수명주기

수정 파일:

```text
scripts/test-server-orchestration-and-judge.mjs
```

- 49·50 Base 1★
- Understanding 2★
- Fresh Transfer 3★
- 대표 오답 fixture 기각
- 50의 제공 Starter가 오답으로 판정되는지 확인 (Base + Transfer 양쪽)
- 멱등 보상과 진도 기록 기존 계약 유지

### 9.4 런타임 패리티

기존 `PUBLIC_KERNELS` 자동 순회를 재사용한다.

```text
scripts/test-client-server-runtime-parity.mjs
```

49의 Dictionary equality와 50의 Dictionary 반환이 Client/Server에서 같아야 한다. 신규 Runtime Matrix는 만들지 않는다. 핵심 동작(dict `==` 순서 무관 등)은 이미 §1.3에서 양쪽 평가기로 사전 검증했다.

### 9.5 전체 검증

```bash
npm run test:algorithm-constellation
npx eslint src/components/AlgorithmConstellation functions/algorithmConstellation
npm run build
```

Lens 수정(§2) 후 기존 44~46의 Explore 렌더링이 회귀 없는지 육안 확인 1회 (렌더링 전용 변경이므로 자동 테스트 대상 아님).

---

## 10. 비용·공수 보호 규칙

- 새 React 컴포넌트 0건 (§2는 기존 lens 파일 내 함수 분기 추가 — 신규 컴포넌트 아님)
- 새 runtime capability 0건
- 새 Callable/Firestore 읽기·쓰기 0건
- 새 rule-based misconception matcher 0건
- 새 Evidence Primitive 0건 (`source-debug` 기존 등록 사용)
- **2★ 질문은 문제당 3문항** (기존 44~48 관행 및 인지 부하 예산)
- 문제당 Hidden 6건 이내, Transfer Private 4~5건 이내
- 입력 길이 최대 20
- 큰 문자열·성능 테스트 없음
- Dictionary iteration이나 Counter 지원을 위해 evaluator를 확장하지 않음
- 49·50 전용 테스트 파일을 새로 만들지 않고 기존 저작·게이트·서버 테스트에 추가

---

## 11. 권장 구현 순서

```text
Gate 0 — StateTransitionLens dict 포맷 추가 (§2) + 사고 패턴 2종 등록 (§4)
  ↓        ← v2에서 신설: 49·50의 Explore·First Encounter가 이에 의존
Gate A — 저작 테스트 갱신 사전 준비: 개수 단언 52→54, syntax-leak 목록 추가
  ↓
Gate B — 49 Public/Private + Map 독립 Oracle
  ↓
Gate C — 50 Public/Private + Starter 실패 계약 (Base + Transfer)
  ↓
Gate D — Public/Private index 및 Catalog published 동기화
  ↓
Gate E — 신규 [Test 16] 게이트 + 저작·서버 수명주기 테스트
  ↓
Gate F — 전체 스위트·ESLint·프로덕션 빌드 + 44~46 Explore 렌더링 육안 확인
```

---

## 12. 완료 체크리스트

```text
[ ] StateTransitionLens가 dict 상태를 {A: 2} / {} 로 표시 (44~46 화면 함께 수정)
[ ] 신규 런타임/API/Callable/Firestore 구조 0건
[ ] 49·50 lensId 모두 state-transition (카탈로그 draft 값 교체)
[ ] 사고 패턴 2종이 10필드 계약으로 등록 + syntax-leak 목록 포함
[ ] 49 반례 프레임 experimentReset + stateBefore 분리
[ ] 49는 문자 종류뿐 아니라 횟수 차이를 검증
[ ] 49 한쪽만 빈 입력 케이스 포함
[ ] 49 빈 문자열 두 개 처리
[ ] 49 Dictionary key 삽입 순서 비의존 (양쪽 평가기 사전 검증 완료)
[ ] 50 Public Starter가 실제 실패 (['A'] → {A: 0})
[ ] 50 Transfer Starter가 실제 실패 (반복 득표 케이스)
[ ] 50 Base 최초 차이 단계는 첫 새 항목 초기화
[ ] 50 Transfer는 반복 항목 갱신 오류로 Base와 구분
[ ] 50 카탈로그·커널 prerequisites 모두 [44, AC-CODE-FIRST-ERROR-01]
[ ] 2★ 질문 각 3문항, challengeId uc_dict_049_1 / uc_dict_050_1
[ ] 저작 테스트 개수 단언 52 → 54 갱신
[ ] 신규 게이트 테스트는 [Test 16]
[ ] Public Preview와 Private Master 입력 중복 0건
[ ] 49·50 Branch 비차단 게이트 계약 통과
[ ] 성단 4 = Core 8 + Branch 2 완결
[ ] Published = Public = Private = 54
[ ] npm run test:algorithm-constellation 통과
[ ] ESLint 0 errors / 0 warnings
[ ] npm run build 성공
```

---

## 13. 다음 Wave

이 Gate 이후 성단 5 본 항로의 첫 Wave로 이동한다.

```text
51 로버의 방향 명령 — 위치와 방향 상태
52 네 방향 우주 나침반 — 순환 방향
53 우주 시계 맞추기 — carry와 modulo
```

성단 5는 격자·방향 시각화 요구가 있으므로 49·50 구현 과정에서 미리 새 Lens를 만들지 않는다. 51~53 계획 단계에서 기존 Lens 재사용 가능 범위를 먼저 평가한다.
