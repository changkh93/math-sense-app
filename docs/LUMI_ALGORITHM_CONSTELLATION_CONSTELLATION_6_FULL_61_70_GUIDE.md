# LUMI 알고리즘 성단 — 성단 6 전체 10문제(61~70) 개발 가이드 (v2)

> 대상: 다른 AI 구현자 및 코드 리뷰어
> 구현 단위: 기존 61번 현대화 + 신규 62~70번 9문제
> 최종 목표: Published = Public = Private = 72개
>
> **v2 변경 요약** (원안 대비 — 전 항목 코드 대조 또는 실행 측정으로 확인):
>
> 1. **Gate 5R 재구성**: 원안이 "해결해야 할 결함"으로 묘사한 4건(Transfer contextCard/thoughtCheck 누락, 60번 누적합 오류, 56번 음수 Hidden 부재, UI 스키마 불일치)은 **이미 작업 트리에 구현돼 있고 전체 테스트가 통과 중**이다(§1.3 검증표). Gate 5R은 "수정 작업"이 아니라 **"커밋 + 확인 마감 + 잔여 강화"**로 바뀐다.
> 2. **`%` 정정을 독립 재검증으로 확정**: 클라이언트·서버 양쪽 `(0-1)%4 → 3` 확인, 구현 코드 확인(§1.2). 원안의 정정은 정확하다.
> 3. **70번 재설계 (핵심 변경)**: 3자리 암호 × 단서 6개는 실행 측정 결과 step 예산을 초과한다(최적화해도 100,000 step 상한 초과). **2자리(00..99)로 재설계**하고 측정치를 명시한다(§5.10).
> 4. **67·68 도메인 축소**: 항목 8개는 한 테스트만으로 31k~37k step로 fixture 저작 예산(20,000 누적)을 초과한다. **둘 다 1..6으로 제한**한다(§5.7, §5.8).
> 5. **Gate 6A를 "사전 검증 대기"에서 "측정 완료 표"로 전환**: 핵심 8개 패턴을 전부 실행 측정해 문서화했다. 구현자는 재검증 없이 착수 가능하다(§8).
> 6. **thoughtCheck 스키마**: 원안의 "51~60을 신규 스키마로 일괄 변환"은 불필요한 변경이다 — UI가 이미 양쪽 스키마를 읽는다. 신규 문제는 **현행 63개 커널이 쓰는 `{question, options[{value,label}], expected}` 스키마로 통일**한다(§2.1).
> 7. 61번 기존 계약·fixture 현황을 실제 파일과 대조해 명시(§5.1), 레지스트리 현재값 확인(§3.3), 저작 fixture 20k 누적 예산 규칙을 수치와 함께 명문화(§4.6).

---

## 0. 결론

다음 Wave는 **성단 6 가능성 연구소 61~70 전체 10문제**를 한 번에 완성한다.

다만 바로 문제 파일부터 만들지 않는다. 커밋되지 않은 성단 5 작업 트리를 먼저 확정하고(Gate 5R), 이미 측정된 런타임 예산 표를 근거로 문제를 설계한다.

```text
Gate 5R  C5 작업 트리 커밋 + 출판 안정화 확인 마감
Gate 6A  (측정 완료 — §8 표 참조, 추가 probe 불필요)
Gate 6B  61 현대화 + 62~64 구현
Gate 6C  65~68 구현 (도메인 상한 규칙 적용)
Gate 6D  69~70 구현 (70은 2자리 재설계)
Gate 6E  등록·게이트·테스트·출판
Gate 6F  전체 회귀·빌드·번들 기록
```

이번 Wave의 핵심 원칙은 다음과 같다.

1. 새 React Lens를 만들지 않는다.
2. 새 Callable, Firestore 컬렉션, 보상 시스템을 만들지 않는다.
3. 재귀, 비트 연산, `itertools`, `break`를 평가기에 추가하지 않는다.
4. 모든 문제는 등록된 `state-transition` Lens를 재사용한다.
5. 부분집합은 `range`, `//`, `%`, `.append()`만으로 작은 선택 상태를 열거한다.
6. 61번의 ID, version, entryFunction과 기존 통과 의미를 보존한다.
7. 69·70 Branch는 성단 7 개방 Core 6/8 계산에 포함하지 않는다.
8. **모든 Hidden 구성은 "fixture 누적 20,000 step 이내" 저작 예산을 만족해야 한다** (§4.6 — 기존 Invariant 5가 강제한다).

---

## 1. 착수 전 정정 및 현재 상태

### 1.1 등록 상태 — 작업 트리 확인 필수

- 현재 등록 문제: **63개 — 단, 커밋되지 않은 작업 트리 기준이다.** 마지막 커밋(`42c20ee`)은 성단 4 Branch(49·50)까지이며, 성단 5 전체(51~60 구현, `%` Python 의미 수정, Transfer presentation 수정, 56 현대화, 레지스트리 갱신)가 **38개 파일의 미커밋 변경+신규 파일**로 존재한다.
- 작업 트리에서 `npm run test:algorithm-constellation` 전체 통과를 확인했다(13개 스크립트, 63문제).
- 61번 `AC-ENUM-PAIR-01`: 이미 published (catalogOrder 61, constellation-6, core/anchor, `entryFunction: find_pair_sum`, transfer `find_pair_diff` — 실제 파일에서 확인).
- 62~70: catalog draft(`combination-tree-lens` 8건 + `source-debug-lens` 1건), Public/Private 미구현.
- 완료 후 등록 문제: 72개.

> **Gate 5R의 첫 번째 작업은 이 성단 5 작업 트리를 커밋하는 것이다.** 미커밋 상태에서 성단 6 작업을 겹치면 리뷰와 롤백 단위가 붕괴한다.

### 1.2 `%` 동작 재검증 — 정정 확정 (독립 재검증 완료)

성단 5 가이드 v2는 "평가기 `%`가 음수에서 JS 나머지 동작"이라고 기록했으나, 현재 코드는 양쪽 평가기 모두 Python 나머지 의미를 구현한다. **이 문서 작성 시점에 독립적으로 재검증해 확정했다:**

```text
서버 평가기: (0 - 1) % 4 → 3   ✅
클라이언트 평가기: (0 - 1) % 4 → 3   ✅
구현: left - right * Math.floor(left / right)   (sharedPythonEvaluatorCore 양쪽 동일)
```

성단 5 시점의 관찰은 당시 코드에 대해서는 정확했으나 이후 작업 트리에서 수정됐다. 따라서:

- 평가기 `%` 수정은 이번 Wave 대상이 아니다.
- `(direction - 1) % 4` 형태의 감산 풀이는 행동 채점에서 **정상 통과**해야 한다.
- 공식 해법·저작물은 가산 형식(`(d+3)%4`)을 유지해도 되지만 이는 교육적 선택이지 제약이 아니다.
- **회귀 방어 권장**: 패리티 테스트에 음수 modulo 케이스(`(0-1)%4 == 3`, 클라이언트==서버)를 추가한다. 현재 패리티 매트릭스에 이 케이스가 명시적으로 있는지는 확인되지 않았다(§2.3).

### 1.3 원안 "선행 Blocker" 4건의 실제 상태 (전건 코드 대조 완료)

| # | 원안 주장 | 실제 상태 (파일 대조) | 남은 작업 |
|---|---|---|---|
| 1 | Production Callable이 Transfer의 `contextCard`/`thoughtCheck`를 제거 | **이미 전달됨** — `publicTransferChallenge`가 두 필드를 명시적으로 반환(설계 주석 포함), `test-server-orchestration-and-judge.mjs:218-225`가 전달을 단언 중 | 없음 (회귀 테스트 이미 존재) |
| 2 | Mock은 전달하지만 UI 스키마가 달라 사고 점검이 깨짐 | **UI가 양쪽 스키마를 모두 읽음** — `TransferChallengeMode.jsx`가 `.prompt \|\| .question`으로 읽고 `strategyGuide`·`steps` 렌더링 지원 | 없음. 신규 문제는 §2.1의 스키마 통일 규칙만 지키면 됨 |
| 3 | 60번 Transfer 사고 점검의 누적합 계산이 잘못됨 | **이미 올바름** — 현행 문구가 "12가 아니라 12 빼기 2인 10 — 두 누적값의 차다"로 원안이 요구하는 정답 그 자체 | 없음 |
| 4 | 56번 Base Hidden에 `negative-minimum` 그룹이 없음 | **음수 최솟값 케이스는 존재** — `minimum_in_middle` 그룹의 `[6, 3, -7, 1, 9] → [-7, …]`. 그룹 "이름"으로는 없음 | 선택 강화: 별도 그룹 분리는 선택 사항 (§2.2) |

부수 주장들: "52번 '중간 값이 항상 범위 안' 문구" — 해당 문구는 현행 파일에 없으며, 현행 안내문은 이미 가산 형식 논리("왼쪽 회전은 오른쪽 세 칸")로 작성돼 있다. "56번 Explore swap syntax 노출" — Explore 프레임에 코드형 swap 노출 없음(개념 ID `syntax:swap`만 존재, 이는 정상). "오탈자 훓다" — 발견되지 않음.

> 결론: 원안의 Gate 5R은 **"고치는 작업"이 아니라 "이미 고쳐진 작업 트리를 커밋하고 확인서를 남기는 작업"**이다. 아래 §2는 그에 맞게 재작성했다.

---

## 2. Gate 5R — 성단 5 출판 안정화 (확인 마감형)

### 2.0 Step 0 — 작업 트리 커밋 (신설, 최우선)

성단 5 구현(38개 파일: 신규 18 + 수정 20)을 **성단 6 착수 전에 커밋**한다. 커밋 전 전제:

```bash
npm run test:algorithm-constellation   # 63문제 전체 통과 확인 (이 문서 작성 시점 통과 확인됨)
npx eslint src/components/AlgorithmConstellation functions/algorithmConstellation
```

### 2.1 Transfer Presentation 계약 — 확정된 현행 계약 (변경 없음)

현행 63개 커널과 UI가 이미 다음 두 형식으로 공존하며 UI는 둘 다 렌더링한다.

```js
// 현행 표준 (51~61 전부 사용 — 신규 62~70도 이 형식으로 저작한다)
thoughtCheck: {
  question: '...',
  options: [{ value: '...', label: '...' }],
  expected: '...',
}
contextCard: { title, strategyGuide }   // steps는 선택
```

```js
// 레거시 대응 (UI가 읽을 수 있으나 신규 저작에 사용하지 않는다)
thoughtCheck: { prompt, options: [{ id, label, isCorrect }], feedback }
```

결정:

- **51~60의 기존 데이터를 신규 스키마로 변환하지 않는다.** (원안의 일괄 변환은 불필요한 변경이며, UI가 이미 양쪽을 지원한다.)
- 신규 62~70은 현행 표준(`question/value/expected`)으로 저작한다.
- `publicTransferChallenge`의 안전 필드 명시 복사(정답 코드·테스트 미반환)는 이미 구현된 대로 유지한다.
- thoughtCheck는 별·마스터리 증거가 아닌 10초 자기점검이므로 클라이언트 상호작용으로 유지한다.

### 2.2 잔여 콘텐츠 강화 (선택, 소규모)

- 56번: 음수 최솟값이 `minimum_in_middle`에 묶여 있다. **별도 `negative-minimum` 그룹 분리는 선택 사항** — 행동 커버리지는 이미 존재하므로 성단 6을 막지 않는다. 분리 시 기존 테스트는 유지(추가 전용)하고 "음수를 무시하는 오답 fixture"(예: 최솟값 후보를 0으로 초기화해 양수 목록에서 오답)의 기각 그룹으로 삼는다.
- 52번: `%` Python 의미 확정에 따라 안내문에 "빼기로 계산해도 한 번의 나머지로 감싸진다"를 한 문장 추가할 수 있다(선택). 가산 형식 교육은 그대로 유지.
- 60번·오탈자: 조치 필요 없음(§1.3).

### 2.3 Gate 5R 잔여 회귀 테스트 (신규 추가 가치만)

이미 존재: Transfer contextCard/thoughtCheck 서버 전달 단언, 전체 스위트 통과.

추가 권장 (작은 항목만):

```text
1. 음수 modulo 패리티: (0-1)%4 == 3, 클라이언트 == 서버 (§1.2 회귀 방어)
2. thoughtCheck 스키마 무결성: 전 63+문제에서 options 값 중복 없음·expected가 options에 존재
3. (선택) TransferChallengeMode 렌더 스모크: undefined 문구 0건
```

---

## 3. 성단 6 학습 설계

### 3.1 학습 흐름

```text
61  서로 다른 두 위치를 체계적으로 훑는다
62  조건에 맞는 모든 두 쌍을 모은다
63  선택 깊이를 세 개로 늘린다
64  조건 없이 조합 자체를 목록으로 만든다
65  각 항목의 포함/제외로 모든 부분집합을 만든다
66  위치마다 다른 선택지를 조합한다
67  모든 후보 중 제한을 만족하는 것만 센다
68  제한을 만족하는 후보 중 최고를 기억한다
69  정렬된 정보로 불필요한 비교를 줄인다
70  여러 단서를 동시에 만족하는 후보를 역으로 찾는다
```

학생이 새 문법에 막히지 않도록 Python 도구는 모두 앞 성단에서 학습한 것으로 제한한다.

### 3.2 역할 (카탈로그 초안과 일치 확인 완료)

| 번호 | ID | 역할 | 핵심 사고 |
|---|---|---|---|
| 61 | `AC-ENUM-PAIR-01` | Core / Anchor | 서로 다른 두 위치의 중복 없는 열거 |
| 62 | `AC-ENUM-TARGET-62` | Core / Practice | 조건을 만족하는 모든 쌍 수집 |
| 63 | `AC-ENUM-TRIPLE-63` | Core / Practice | 세 위치의 체계적 열거 |
| 64 | `AC-ENUM-COMB-64` | Core / Practice | 조합 결과 자체를 순서 있게 생성 |
| 65 | `AC-ENUM-SUBSET-65` | Core / Anchor | 포함/제외 선택으로 부분집합 생성 |
| 66 | `AC-ENUM-KEYPAD-66` | Core / Practice | 선택 frontier 확장 |
| 67 | `AC-ENUM-FILTER-67` | Core / Practice | 열거 후 조건 필터 |
| 68 | `AC-ENUM-BEST-68` | Core / Practice | 열거 중 best-so-far 갱신 |
| 69 | `AC-ENUM-PRUNE-69` | Branch / Review | 단조 조건을 이용한 가지치기 |
| 70 | `AC-ENUM-LOCK-70` | Branch / Review | 여러 제약의 교집합 |

카탈로그 초안의 `routeRole`/`learningRole`는 위 표와 일치함을 확인했다. 변경 대상은 `status`(draft→published), `lensId`(전부 `state-transition`), `prerequisites`(§3.3)이다.

### 3.3 선수 조건 (카탈로그 초안과 다름 — 수정 필요)

| 번호 | 최종 prerequisites | 초안 | 이유 |
|---|---|---|---|
| 61 | `AC-SEQ-005`, `AC-EXP-LOOP-06` | `[SEQ-005]` | 목록 순회와 반복 상태 |
| 62 | `AC-ENUM-PAIR-01` | (동일) | 첫 쌍 찾기에서 모든 쌍 모으기로 확장 |
| 63 | `AC-ENUM-TARGET-62` | `[PAIR-01]` | 두 선택에서 세 선택으로 확장 |
| 64 | `AC-ENUM-PAIR-01`, `AC-SEQ-RUNNING-35` | `[PAIR-01]` | 생성 결과를 목록에 누적 |
| 65 | `AC-ENUM-COMB-64`, `AC-PAT-DIGIT-24` | `[COMB-64]` | 선택 상태의 몫·나머지 해석 |
| 66 | `AC-ENUM-SUBSET-65`, `AC-STR-COMPRESS-39` | `[SUBSET-65]` | 선택 단계와 문자열 누적 |
| 67 | `AC-ENUM-SUBSET-65`, `AC-COND-RANGE-15` | `[SUBSET-65]` | 모든 후보 생성 후 제한 판정 |
| 68 | `AC-ENUM-FILTER-67`, `AC-SEQ-MINMAX-32` | `[FILTER-67]` | 유효 후보 중 최댓값 기억 |
| 69 | `AC-ENUM-BEST-68`, `AC-SRCH-BINARY-59` | `[BEST-68]` | 정렬·단조성으로 탐색 축소 |
| 70 | `AC-ENUM-PAIR-01`, `AC-PAT-DIGIT-24`, `AC-COND-COMPLEX-18` | `[PAIR-01]` | 자릿수 분해와 복수 조건 결합 |

성단 6 requiredAnchors는 다음과 같이 수정한다. **현재값은 `['AC-ENUM-PAIR-01']`(61 하나)이므로 레지스트리 수정이 필요하다** (`constellationRegistry.js`는 §7.5 파일 목록에 포함됨).

```js
['AC-ENUM-PAIR-01', 'AC-ENUM-SUBSET-65']
```

성단 7 개방은 Anchor 61·65 완료 + Core 6/8이다. 성단 7 엔트리(`AC-STACK-BOX-71` 초안 포함)는 레지스트리·카탈로그에 이미 존재한다.

---

## 4. 공통 저작 계약

### 4.1 공통 구조

모든 문제는 `createCapabilityPrototypeKernel()`을 사용한다.

```text
Observe 1문항
Explore state-transition 4~8 frame (독립 실험 프레임은 experimentReset + stateBefore 쌍)
Public Base 2건
Hidden Base 5~6건
Wrong Fixture 4종
Understanding 3문항 (uc_enum_062_1 … 규칙)
Public Transfer Preview 2건
Private Transfer Master 4건 (tc_enum_062_transfer_1 … 규칙, 61은 기존 tc_comb_061_transfer_1 유지)
```

### 4.2 Lens

61~70 전부 `state-transition`을 사용한다 (커널과 카탈로그 양쪽). 초안의 `combination-tree-lens`, `source-debug-lens`는 등록된 렌더러가 아니므로 사용하지 않는다.

### 4.3 Trace 상태 이름

가능한 한 다음 공통 상태 이름을 재사용한다.

```text
i, j, k / candidate / candidateCount / selected / remaining / matches / valid / bestValue / checks / clueIndex
```

### 4.4 Syntax Leak

Observe, Explore, Pattern Card, 2★, Transfer Context에는 제출 가능한 핵심 코드 줄을 노출하지 않는다.

허용:

```text
첫 번째 위치보다 뒤쪽 위치만 후보로 확인한다.
각 장비를 포함할지 제외할지 선택한다.
제한 안에 들어온 후보만 남긴다.
```

금지:

```python
for j in range(i + 1, n):
remaining = remaining // 2
result.append(prefix + letter)
```

### 4.5 행동 채점

- AST로 중첩 반복문의 개수나 변수명을 강제하지 않는다.
- 올바른 결과를 만드는 다른 전략도 통과시킨다.
- 단, 69번은 반환 계약에 `checks`가 포함되므로 지정된 가지치기 절차를 행동으로 검증한다.
- Public Preview와 Private Master 입력은 중복시키지 않는다.

### 4.6 Step 예산 계약 (v2 신설 — 측정값 기반)

저작 테스트 Invariant 5는 **intended wrong fixture를 "모든 Hidden 누적 20,000 step"** 예산으로 평가한다. fixture의 실행 비용은 공식 해법과 대동소이하므로, 이는 곧 **"가장 비싼 해법 × Hidden 전체의 누적 step ≤ 20,000"**을 저작 시 설계해야 함을 뜻한다. (공식 해법의 서버 기본 누적 상한은 200,000으로 넉넉하지만 fixture 예산이 먼저 묶는다.)

측정 기준표(§8 참조)로 다음 규칙을 정한다:

```text
65: 항목 6개짜리 Hidden은 최대 1건 (6항목 1회 = 5,481 step)
67: 도메인 1..6 항목 (8항목은 1건만으로 31,343 step — fixture 예산 초과)
68: 도메인 1..6 항목 (8항목 = 36,666 step / 6항목 = 7,269 step)
70: 2자리 재설계 + 자릿수 사전 계산 (2자리 최악 = 14,867 step — Hidden에 최악 케이스 1건까지만)
62~64, 66, 69: 측정 결과 여유 (≤ 700 step 수준)
```

각 문제 구현 시 "공식 해법의 Hidden별 step 합"을 저작 테스트 로그로 남기고 20,000 이내임을 확인한다. 초과 시 도메인 상한이나 해당 크기의 테스트 수를 먼저 줄인다(evaluator 확장 금지 원칙).

---

## 5. 문제별 명세

> 각 문제의 "측정" 항목은 이 문서에서 실제 실행한 값이다. 공식 해법 골격도 실행 검증을 마친 코드다.

## 5.1 61 — 두 탐사 지점 모두 비교하기 (기존 계약 실측 확인)

기존 published 문제를 현대화한다. **현재 상태(파일 대조): `find_pair_sum` 진입, Hidden 4그룹(`distinct_pairs_only`, `duplicate_values`, `no_match`, `negative_numbers`), fixture 1종(`same_element_used_twice`), transfer `tc_comb_061_transfer_1`/`find_pair_diff`.**

```text
problemId: AC-ENUM-PAIR-01
problemVersion: 1 유지
entryFunction: find_pair_sum 유지
input: capsules 정수 목록 길이 2..10, target 정수
output: 합이 target인 첫 [i,j] (i<j), 없으면 []
순서: i 오름차순, 같은 i에서는 j 오름차순
```

기존 Public/Hidden/Transfer는 삭제하거나 의미를 바꾸지 않는다. 신규 테스트는 추가 전용이다.

공식 해법 골격 (실행 검증 완료 — 12항목 675 step):

```python
def find_pair_sum(capsules, target):
    n = len(capsules)
    for i in range(n):
        for j in range(i + 1, n):
            if capsules[i] + capsules[j] == target:
                return [i, j]
    return []
```

신규 Wrong Fixture (기존 1종에 3종 추가 — 4종 계약 충족):

- 같은 항목을 두 번 사용 (기존)
- `[j,i]` 역순 반환 (신규)
- 마지막 일치 쌍 반환 (신규)
- 값 `[capsules[i], capsules[j]]` 반환 (신규)

Fresh Transfer는 기존 `find_pair_diff`를 유지하되 Public Context/Thought를 현행 표준 스키마(§2.1)로 완성한다.

## 5.2 62 — 목표 합을 만드는 모든 두 캡슐

```text
entryFunction: find_all_pair_sums(capsules, target)
domain: 정수 목록 길이 0..10
return: 조건을 만족하는 모든 [i,j], i<j, 사전식 순서
```

예:

```text
capsules=[1,4,5,4], target=5
return [[0,1],[0,3]]
```

공식 해법 (실행 검증 완료 — 중첩 리스트 append·반환·matchesExpected 전부 확인, 6항목 211 step):

```python
def find_all_pair_sums(capsules, target):
    pairs = []
    for i in range(len(capsules)):
        for j in range(i + 1, len(capsules)):
            if capsules[i] + capsules[j] == target:
                pairs.append([i, j])
    return pairs
```

오답 그룹:

- 첫 일치에서 즉시 반환
- 같은 위치 재사용
- 중복 값 쌍 누락
- 값 쌍 반환

Transfer: `find_all_signal_pairs(strengths, target)`.

Hidden에 빈 목록 케이스 포함 (return `[]` — "조건 만족 쌍 없음"과 "입력 없음" 구분).

## 5.3 63 — 세 캡슐의 정확한 에너지

```text
entryFunction: find_triple_sum(capsules, target)
domain: 정수 목록 길이 0..12
return: 첫 [i,j,k], i<j<k, 없으면 []
```

공식 해법 (실행 검증 완료 — 3중 루프 지원 확인, 12항목 무매칭 스캔 675 step):

```python
def find_triple_sum(capsules, target):
    n = len(capsules)
    for i in range(n):
        for j in range(i + 1, n):
            for k in range(j + 1, n):
                if capsules[i] + capsules[j] + capsules[k] == target:
                    return [i, j, k]
    return []
```

> 도메인 상한 산출 근거: 12항목 3중 루프는 C(12,3)=220 조합으로 측정 675 step — Hidden 6건 누적도 수천 step 수준으로 여유.

오답 그룹:

- 두 캡슐만 검사
- 같은 위치 재사용
- `k`를 `i+1`부터 시작해 중복 순서 생성
- 값 세 개 반환

Transfer: 세 센서의 곱이 target인 첫 위치 세 쌍. 입력 값은 작은 정수로 제한한다(곱 폭발 방지 — 결과 비교는 정수라 안전하나 도메인 단순화).

## 5.4 64 — 센서 두 개 고르기

```text
entryFunction: list_sensor_pairs(sensors)
domain: 서로 다른 짧은 문자열 목록 길이 0..8
return: 모든 값 쌍 [sensors[i], sensors[j]], i<j
```

예:

```text
['A','B','C'] -> [['A','B'],['A','C'],['B','C']]
```

해법 골격은 62와 동일 구조(append `[sensors[i], sensors[j]]`) — 62에서 패턴 검증 완료. 도메인 8항목 = C(8,2)=28 쌍으로 step 여유.

오답 그룹:

- 순서쌍까지 생성해 두 배 반환
- 자기 자신 쌍 포함
- 마지막 센서 누락
- 인덱스 쌍 반환

Transfer: 모든 두 승무원 팀 구성.

Hidden에 빈 목록·단일 항목 케이스 포함 (모두 `[]`).

## 5.5 65 — 작은 장비 조합 보기

재귀와 비트 연산 없이 몫·나머지로 포함/제외 상태를 읽는다.

```text
entryFunction: build_equipment_subsets(items)
domain: 서로 다른 짧은 문자열 목록 길이 0..6
return: 모든 부분집합, mask 0부터 증가하는 순서
```

순서 예:

```text
['A','B'] -> [[],['A'],['B'],['A','B']]
```

공식 해법 (실행 검증 완료 — 측정: 4항목 991 step, 5항목 2,356 step, 6항목 5,481 step):

```python
def build_equipment_subsets(items):
    limit = 1
    for item in items:
        limit = limit * 2
    subsets = []
    for mask in range(limit):
        selected = []
        remaining = mask
        for item in items:
            if remaining % 2 == 1:
                selected.append(item)
            remaining = remaining // 2
        subsets.append(selected)
    return subsets
```

**Hidden 구성 규칙 (§4.6)**: 6항목 테스트는 최대 1건. 예산 예시 — [2,3,4,5,6]항목 구성 시 누적 약 9,400 step로 20,000 이내. (단, `%`의 Python 의미 확정으로 `remaining % 2`는 값이 항상 음수가 아니므로 의미 차이 없음.)

오답 그룹:

- 빈 부분집합 누락
- 전체 집합 누락
- 포함/제외 자릿수 갱신 누락 (`remaining` 갱신 없이 항상 첫 항목 판정)
- 원소 순서 반전

Transfer: 가능한 모든 탐사 도구 묶음.

## 5.6 66 — 통신 키패드 문자 조합

```text
entryFunction: build_keypad_codes(groups)
domain: groups 길이 1..3, 각 그룹 문자열 목록 길이 1..4
return: 각 위치에서 하나씩 고른 모든 문자열
```

예:

```text
groups=[['A','B'],['1','2']]
return ['A1','A2','B1','B2']
```

공식 해법 (실행 검증 완료 — **문자열 `+` 결합은 지원됨** (리스트 결합과 달라 안전), 3×4×3 최대 구성 382 step):

```python
def build_keypad_codes(groups):
    codes = ['']
    for choices in groups:
        next_codes = []
        for prefix in codes:
            for letter in choices:
                next_codes.append(prefix + letter)
        codes = next_codes
    return codes
```

> 저작 주의: `codes = next_codes` 재할당(frontier 교체)이 동작함을 확인했다. 리스트끼리의 `+` 결합(`[a] + list`)은 여전히 미지원이므로 문자열 결합과 혼동하지 않는다.

오답 그룹:

- 첫 그룹만 반환
- 같은 위치에서 여러 글자 선택 (prefix 없이 letter만 누적)
- frontier를 누적하지 않고 매 단계 초기 결과 손실 (`codes = []`로 시작하는 오류)
- 조합 순서 반전

Transfer: 로봇 부품 옵션 조합 문자열 생성.

## 5.7 67 — 시간 안에 할 수 있는 임무 조합

```text
entryFunction: count_mission_sets(durations, time_limit)
domain: durations 길이 1..6   # v2: 원안 1..8에서 축소 — 8항목 측정 31,343 step로 fixture 예산 초과
        각 1..30, limit 1..60
return: 비어 있지 않은 부분집합 중 합이 limit 이하인 개수
```

부분집합 생성은 65의 mask 방식을 재사용한다. 결과 목록 전체를 반환하지 않고 유효 후보 수만 누적한다.

**측정 근거**: 동일 구조 mask 카운트 해법 — 8항목 31,343 step(예산 초과) → 6항목 ≈ 7,800 step. Hidden 구성은 [2,3,4,5,6]항목 수준으로 누적 ≤ 20,000 유지.

오답 그룹:

- 빈 집합까지 셈
- 정확히 limit인 후보 누락 ( `<` vs `<=` )
- 개별 임무만 검사 (부분집합 미생성)
- 순서를 다른 조합으로 중복 계산

Transfer: 무게 제한 안의 화물 묶음 개수.

## 5.8 68 — 한도 안의 최고 장비 세트

```text
entryFunction: best_equipment_value(weights, values, capacity)
domain: 두 목록 길이 동일 1..6   # v2: 원안 1..8에서 축소 — 측정 8항목 36,666 / 6항목 7,269 step
        weight 1..20, value 0..50
return: 총 무게가 capacity 이하인 부분집합의 최대 총 가치
```

공식 흐름 (실행 검증 완료 — 6항목 7,269 step):

```text
limit = 2^len (곱셈 누적으로 계산)
모든 mask에 대해 total_weight/total_value 합산
제한 안이고 현재 best보다 크면 갱신
```

> 구현 디테일: 65와 동일하게 `remaining` mask 분해 방식 사용. 두 목록 인덱스 접근 `weights[i]`/`values[i]`는 변수 i를 통한 인덱싱으로 지원 확인.

오답 그룹:

- 가장 가치가 큰 단일 장비만 선택
- capacity와 같은 후보 누락 (`<` 오류)
- 무게와 가치 목록 인덱스 불일치
- 제한 초과 후보를 best로 채택

Transfer: 제한 시간 안의 최대 연구 점수.

## 5.9 69 — 중복 탐색을 줄여라

평가기에 `break`를 추가하지 않는다. **플래그 기반 스킵이 동작함을 실행 검증했다** (가이드 예시 `[1,2,8,9], limit=5 → [1, 4]` 재현, 130 step).

```text
entryFunction: pruned_pair_scan(sorted_values, limit)
domain: 오름차순 비음수 정수 목록 길이 0..10
return: [limit 이하인 서로 다른 쌍 수, 실제로 확인한 쌍 수]
```

지정 절차:

```text
i를 고정하고 j를 오른쪽으로 이동한다.
합이 limit를 처음 넘는 순간 이후의 j 후보는 확인하지 않는다(skip 플래그).
처음 초과한 쌍은 checks에 포함한다.
```

공식 해법 골격 (실행 검증 완료):

```python
def pruned_pair_scan(sorted_values, limit):
    n = len(sorted_values)
    count = 0
    checks = 0
    for i in range(n):
        skip = False
        for j in range(i + 1, n):
            if skip:
                pass
            else:
                checks = checks + 1
                if sorted_values[i] + sorted_values[j] > limit:
                    skip = True
                else:
                    count = count + 1
    return [count, checks]
```

> 주의: `pass` 문 지원 여부는 별도 확인되지 않았다. 스킵 분기가 아예 비어 있으면 안 되므로, `if not skip:` 조건형으로 감싸는 형태를 기본으로 하고 착수 시 `pass` 지원을 먼저 probe한다 (미지원 시 조건형 사용 — 동작 동일).

예:

```text
values=[1,2,8,9], limit=5
i=0: (1,2) 확인 → 카운트, (1,8) 확인 후 초과 → 이후 스킵
i=1: (2,8) 확인 후 초과 → 스킵
i=2: (8,9) 확인 후 초과 → 스킵
return [1,4]
```

Starter는 초과 이후에도 `checks`를 늘리는 버그 코드로 제공하고 학생이 최초 불필요 비교 지점을 찾게 한다.

Transfer: 정렬된 배송 무게에서 허용 한도까지의 쌍과 검사 횟수.

Hidden에 빈 목록·단일 항목 케이스 포함 (둘 다 `[0, 0]`).

## 5.10 70 — 두 자릿수 암호 추리 (v2: 3자리 → 2자리 재설계)

> **재설계 근거 (측정 실증)**: 3자리(000..999) 설계는 예산적으로 성립하지 않는다.
>
> | 구성 | 측정 step | 판정 |
> |---|---|---|
> | 3자리, 자릿수 사전 계산, 답=999, 단서 1개 | 42,228 | 단일 테스트 50,000 기준 아슬아슬 |
> | 3자리, 사전 계산, 단서 6개 | **100,000 초과(런타임 상한)** | 불가 |
> | 3자리, 루프 내 분해(원안 스케치), 단서 1개 최악 | 53,203 | 기준 초과 |
> | **2자리(00..99), 사전 계산, 단서 6개 최악(답=99)** | **14,867** | **통과** |
>
> 3자리 × 단서 6개는 후보 1,000 × 단서 6 구조적으로 수만~수십만 step이라 fixture 누적 20,000 예산과 양립할 수 없다. 도메인을 2자리로 줄이면 학습 목표(여러 제약의 교집합)가 그대로 보존되고 여유 예산이 확보된다.

```text
entryFunction: deduce_lock_code(clues)
candidate: 00..99 (정수 0..99로 표현)
clue: [guess, exact_position_count]
contract: 단서가 유일한 답을 보장, 일치 코드 반환; 없으면 -1
clues length: 1..6
```

자릿수는 문자열 변환 없이 `//`와 `%`로 분해한다. **단서의 자릿수는 루프 밖에서 사전 계산**한다(측정표의 "사전 계산"이 이것 — 루프 내 분해는 2자리에서도 비용이 3~4배).

```python
def deduce_lock_code(clues):
    hints = []
    for clue in clues:
        guess = clue[0]
        hints.append([guess // 10, guess % 10, clue[1]])
    for code in range(100):
        match = True
        for hint in hints:
            hits = 0
            if hint[0] == code // 10:
                hits = hits + 1
            if hint[1] == code % 10:
                hits = hits + 1
            if hits != hint[2]:
                match = False
        if match:
            return code
    return -1
```

공식 흐름:

```text
단서 자릿수를 hints로 사전 계산 (중첩 리스트 append — 62에서 검증)
00부터 99까지 후보 생성
각 단서와 같은 위치의 숫자 개수 계산
모든 단서를 만족한 첫 후보 반환
끝까지 없으면 -1
```

독립 JS Oracle로 00..99 전체 후보 수를 계산해 각 테스트 단서가 정확히 하나의 후보만 남기는지 검증한다. **Oracle은 JS에서 돌므로 샌드박스 예산과 무관하게 전수 검사 가능** — 유일성 검증을 Hidden 수 확대 없이 저작 테스트에서 수행한다.

사용 가능한 검증 예 (2자리 환산):

```text
secret 31: clues [[23, 2], [83, 1], [19, 0]]
secret 99: clues [[99, 2], [11, 0], [95, 1]]
secret 7 (＝07): clues [[7, 1], [17, 1], [70, 1]]
```

> 단서 예시는 착수 시 JS Oracle로 유일성을 재확인하고 확정한다. 위 값은 구조 예시다.

**Hidden 구성 규칙**: 최악 스캔(답이 90 이상 또는 무매칭)은 최대 1건(14,867 step). 나머지는 이른 답(수백~수천 step)으로 조합해 fixture 누적 ≤ 20,000을 유지한다.

Transfer: 두 자리 탐사 채널 번호 추리.

오답 그룹:

- 위치 무시하고 "포함 숫자 개수"만 비교
- 첫 단서만 만족하면 반환
- 자릿수 분해 오류 (`% 10` 누락 등)
- 코드가 아니라 단서를 반환

---

## 6. 사고 패턴 레지스트리

다음 10종을 기존 10필드 스키마로 추가한다. **저작 테스트의 Pattern Card Syntax Leak 하드코딩 목록에도 10종을 추가한다.**

| Pattern ID | 최초 문제 | 표시명 |
|---|---|---|
| `pattern:unordered-pair-enumeration` | 61 | 앞 위치보다 뒤 위치만 골라 쌍 만들기 |
| `pattern:collect-all-matches` | 62 | 첫 답에서 멈추지 않고 모든 답 모으기 |
| `pattern:triple-enumeration` | 63 | 선택 경계를 세 단계로 늘리기 |
| `pattern:combination-output` | 64 | 생성 순서를 지키며 조합 기록하기 |
| `pattern:subset-choice-state` | 65 | 포함과 제외 선택으로 부분집합 만들기 |
| `pattern:choice-frontier-expansion` | 66 | 현재 후보마다 다음 선택지 붙이기 |
| `pattern:enumerate-then-filter` | 67 | 모든 후보 중 조건에 맞는 것만 남기기 |
| `pattern:enumerate-and-best` | 68 | 유효 후보를 만날 때마다 최고 기록 갱신하기 |
| `pattern:monotone-pruning` | 69 | 이후도 실패함을 알면 후보 묶음 건너뛰기 |
| `pattern:constraint-intersection` | 70 | 여러 단서를 모두 만족하는 후보만 남기기 |

`syntaxExample`은 반드시 주석형 사고 절차로 작성한다.

---

## 7. 파일 변경 계획

### 7.1 Gate 5R (v2: 대부분 확인 완료 — 잔여만)

```text
[커밋] 성단 5 작업 트리 38개 파일 (신규 18 + 수정 20)
[선택] scripts/test-client-server-runtime-parity.mjs   # 음수 modulo 케이스 추가
[선택] scripts/test-authoring-integrity-contracts.mjs  # thoughtCheck 스키마 무결성
[선택] 52 안내문 한 문장, 56 negative-minimum 별도 그룹
```

### 7.2 61 현대화

```text
MODIFY src/components/AlgorithmConstellation/shared/problems/ac_enum_pair_01.js
MODIFY functions/algorithmConstellation/problems/ac_enum_pair_01.private.cjs
```

### 7.3 62~70 신규 Public

```text
ac_enum_target_62.js
ac_enum_triple_63.js
ac_enum_comb_64.js
ac_enum_subset_65.js
ac_enum_keypad_66.js
ac_enum_filter_67.js
ac_enum_best_68.js
ac_enum_prune_69.js
ac_enum_lock_70.js
```

### 7.4 62~70 신규 Private

동일 basename의 `.private.cjs` 9개를 `functions/algorithmConstellation/problems/`에 만든다.

### 7.5 공용 등록

```text
MODIFY src/.../shared/problems/index.js
MODIFY functions/.../problems/index.cjs
MODIFY algorithmEditorialCatalog.js          # status/lensId/prerequisites (§3.2·§3.3)
MODIFY constellationRegistry.js              # requiredAnchors [61] → [61, 65] (현재값 확인 완료)
MODIFY problemSolvingPatternRegistry.js
MODIFY scripts/test-authoring-integrity-contracts.mjs   # c6ProblemIds + 총 72 + syntax-leak 목록
MODIFY scripts/test-gate0-curriculum-contracts.mjs      # [Test 18]
MODIFY scripts/test-server-orchestration-and-judge.mjs  # 수명주기 10문제
```

새 Python Concept는 추가하지 않는다.

---

## 8. Gate 6A — 런타임 능력 측정 결과 (v2: 사전 검증 완료)

> 원안은 "구현 전 probe" 목록이었다. **이 문서에서 전 항목을 클라이언트·서버 공유 코어에서 실행 측정했다.** 구현자는 아래 표를 근거로 바로 착수한다.

| # | 패턴 | 측정 입력 | 결과 | steps |
|---|---|---|---|---|
| 1 | 3중 for + `range(i+1, n)` + 조기 return | 12항목, target 24 | `[0,9,11]` 정상 | 675 |
| 2 | 중첩 리스트 append `pairs.append([i,j])` + 반환 | 6항목 | 중첩 반환 정상, `matchesExpected` 중첩 비교 **통과** | 211 |
| 3 | mask 상태 `remaining % 2` / `// 2` (부분집합 생성) | 6항목 | 64개 부분집합 순서 정상 | 5,481 |
| 4 | frontier 재할당 `codes = next_codes` + **문자열 `+` 결합** | 3×4×3 그룹 | 36개 조합 문자열 정상 | 382 |
| 5 | 플래그 기반 가지치기 (break 없음) | `[1,2,8,9]`, limit 5 | `[1,4]` — 가이드 예시와 일치 | 130 |
| 6 | 중첩 리스트 입력 (clues) | — | 60번에서 이미 검증 (C5) | — |
| 7 | 67형 mask 카운트 | 8항목 | 39 정상 | **31,343 — 예산 초과, 도메인 6으로 제한** |
| 8 | 68형 mask 최댓값 | 6항목 / 8항목 | 55 / 70 정상 | 7,269 / **36,666(초과)** |
| 9 | 70형 3자리 전수 스캔 | 단서 6개 | **100,000 상한 초과 — 2자리로 재설계** | — |
| 10 | 70형 2자리 전수 스캔 | 단서 6개, 최악 | 99 정상 | 14,867 |

잔여 확인 1건 (착수 시 1분): `pass` 문 지원 여부(§5.9) — 미지원 시 `if not skip:` 조건형으로 동일 동작.

검증 기준 (유지):

- Client/Server 반환값 100% 동일 (패리티 테스트가 등록 시 자동 수행)
- 단일 테스트 50,000 step 이하, 문제 Hidden 누적 fixture 20,000 step 이하 (§4.6)
- Gate 6A 재측정이 필요한 경우: 위 표의 해법 골격을 수정했을 때뿐이다.

---

## 9. 자동화 검증 계획

### 9.1 저작 무결성

`test-authoring-integrity-contracts.mjs`에 `c6ProblemIds` 10개를 추가한다 (기존 `c4ProblemIds`/`c5ProblemIds` 패턴).

```text
총 등록 수 단언 63 → 72
Published/Public/Private 집합 동등성
Public/Private Understanding 동기화 (현행 스키마 §2.1)
Public Preview/Private Transfer 입력 중복 0건
공식 Base/Transfer 통과
Wrong Fixture 4종 각각 지정 그룹 기각 + Invariant 5b(문법 크래시 0)
fixture 누적 20,000 step 예산 (기존 Invariant 5가 강제 — 67·68·70 도메인 규칙의 자동 검증)
user-facing surface 전체 syntax leak 검사
Pattern Card syntax leak 목록에 신규 10종 포함
70 단서 세트의 유일성 (JS Oracle 전수 검사 — 샌드박스 외)
```

독립 JS Oracle:

- 61: i<j 첫 target pair
- 62: 모든 target pair
- 63: i<j<k 첫 triple
- 64: 모든 조합 값 쌍
- 65: mask 기반 부분집합 또는 독립 재귀 JS oracle
- 66: Cartesian product
- 67: subset 합 필터
- 68: subset 최대 가치
- 69: 정렬 단조 pruning check 수 (JS로 동일 절차 시뮬레이션)
- 70: 00..99 전체 제약 필터

### 9.2 커리큘럼·게이트

`test-gate0-curriculum-contracts.mjs`에 **`[Test 18]`**을 추가한다 (현재 마지막은 `[Test 17]` 성단 5 — 확인 완료). 성단 7은 아직 출판 미션이 없으므로 개방 **조건** 검증은 `isConstellationUnlocked(7, …)` 직접 호출로 수행한다 (성단 5 가이드에서 확립한 방식).

```text
61~70 catalogOrder/역할/선수 조건 (카탈로그 ↔ 커널 일치)
requiredAnchors == [61, 65] (레지스트리 수정 반영)
Core 5 + Branch 2 -> isConstellationUnlocked(7) === false
Core 7이지만 Anchor 65 누락 -> false
Anchor 61·65 + Core 6/8 -> true
Core 8 후 Branch 완료 -> 개방 상태 불변
기존 61 완료 학생은 강화된 선수 조건과 무관하게 재접근 가능 (completed-set 우선 회귀)
```

### 9.3 서버 생명주기

10문제 모두 다음 전체 경로를 검증한다.

```text
start → submit base → submit understanding → issue transfer
→ transfer presentation 계약 (contextCard/thoughtCheck 전달 — 기존 단언 재사용)
→ submit transfer → progress 3-star
```

대표 fixture 하나만 검사하지 말고 저작 테스트에서 네 fixture 전부를 평가한다.

### 9.4 패리티

Public/Private index 등록만 하면 기존 매트릭스가 자동 순회한다. 신규 Matrix를 만들지 않는다. 음수 modulo 회귀 케이스 추가(§2.3)만 별도 반영.

### 9.5 UI 계약 (선택)

`TransferChallengeMode`는 이미 양쪽 스키마를 지원한다(§1.3). 신규 문제가 현행 표준 스키마를 쓰는지는 저작 테스트의 Understanding/Transfer 동기화 검사로 잡힌다. 별도 render 테스트는 선택.

---

## 10. 성능·개발비 정책

현재 빌드 기준 `AlgorithmConstellationHub`는 약 629kB(minified), 162kB(gzip)이다. 성단 6 Public 9개를 정적 등록하면 650kB를 넘을 가능성이 높다.

이번 Wave에서 즉흥적인 문제별 dynamic import는 만들지 않는다. 다음처럼 측정 후 결정한다.

```text
1. Gate 6E 전후 minified/gzip 크기 기록
2. Hub >= 700kB 또는 gzip >= 190kB이면 출판 직후 별도 성단 단위 lazy-loading 작업 생성
3. 초기 Hub에는 catalog metadata만 필요하다는 점을 기준으로 설계
4. 최적화 시 문제별 72개 loader가 아니라 constellation pack 단위로 분리
```

이 기준 미만이면 콘텐츠 Wave를 막지 않는다. 성능 최적화를 성단 6 문제 구현과 섞어 개발 공수를 늘리지 않는다.

서버 비용은 다음으로 제한한다.

- Public 2~3, Hidden 5~6, Transfer Master 4
- 동일 오개념을 잡는 숫자만 다른 테스트 금지
- 70번은 유일성 검증을 저작 테스트(JS)에서 수행하고 실서비스 Hidden 수를 늘리지 않는다.
- 69번은 거대 입력으로 timeout을 유도하지 않고 반환된 `checks`로 pruning을 검증한다.
- **67·68·70은 §4.6의 도메인 상한과 Hidden 구성 규칙을 따른다** (fixture 예산은 저작 테스트가 자동 강제).

---

## 11. 구현 순서

### Gate 5R (확인 마감형 — §2)

```text
1. 성단 5 작업 트리 커밋 (전제: 전체 스위트 통과 — 확인 완료)
2. (권장) 음수 modulo 패리티 회귀 추가
3. (선택) thoughtCheck 무결성 검사, 52 안내문, 56 별도 그룹
```

### Gate 6A (완료 — §8 측정표)

```text
잔여: pass 문 지원 probe 1건 (§5.9) — 미지원 시 조건형 우회 확정
```

### Gate 6B

```text
1. 패턴 61~64 등록 (+syntax-leak 목록)
2. 61 현대화 (fixture 3종 추가 전용)
3. 62~64 Public/Private
4. 독립 Oracle 및 fixture
```

### Gate 6C

```text
1. 패턴 65~68 등록
2. 65~68 Public/Private (67·68 도메인 1..6 적용)
3. subset·frontier·best step 예산 — §8 측정표로 사전 확정, 저작 테스트로 최종 확인
```

### Gate 6D

```text
1. 패턴 69~70 등록
2. 69 플래그 기반 가지치기 (pass probe 선행)
3. 70 2자리 재설계 + JS Oracle 유일성 검증
4. Branch 비차단 검증
```

### Gate 6E

```text
1. Public/Private index
2. Catalog 61~70 state-transition + published + prerequisites (§3.3)
3. requiredAnchors [61, 65]
4. 총 72개 집합 동등성
5. 전체 Callable lifecycle
```

### Gate 6F

```bash
npm run test:algorithm-constellation
npx eslint src/components/AlgorithmConstellation functions/algorithmConstellation
npm run build
git diff --check
```

---

## 12. 완료 조건

- [ ] 성단 5 작업 트리가 별도 커밋으로 확정됐다 (성단 6 변경과 분리).
- [ ] (권장) 음수 modulo 패리티 회귀가 추가됐다 (`(0-1)%4 == 3`).
- [ ] Transfer presentation이 Mock/Production에서 동일하게 동작함을 기존 테스트로 확인했다.
- [ ] 61 ID/version/function과 기존 테스트 의미가 보존됐다 (추가 전용).
- [ ] 61~70 모두 실제 등록된 `state-transition`을 사용한다.
- [ ] 재귀·비트 연산·`break`·새 evaluator 문법이 없다.
- [ ] 62~70 Public/Private 9쌍이 등록됐다.
- [ ] 각 문제 Wrong Fixture 4종이 독립 실패 그룹에서 기각된다 (61은 기존 1종 + 3종 추가).
- [ ] 신규 문제의 thoughtCheck가 현행 표준 스키마(`question/value/expected`)다.
- [ ] 65 부분집합 반환 순서가 명시·검증됐다.
- [ ] 67·68 도메인이 1..6으로 제한됐고 fixture 누적 예산이 20,000 이내다.
- [ ] 70이 2자리(00..99) 재설계로 구현됐고 단서 유일성이 JS Oracle로 검증됐다.
- [ ] 69 pruning이 거대 timeout이 아니라 `[valid, checks]` 행동으로 검증된다.
- [ ] 성단 6 Anchor 61·65 + Core 6/8 게이트가 `isConstellationUnlocked` 기반으로 통과한다.
- [ ] Branch 69·70은 성단 7 개방에 영향을 주지 않는다.
- [ ] Published = Public = Private = 72다.
- [ ] 전체 테스트·ESLint·Build가 통과한다.
- [ ] Hub 번들 크기를 전후 기록했다.

---

## 13. 구현자에게 전달할 한 문단 지시문

> 먼저 커밋되지 않은 성단 5 작업 트리(38개 파일, 전체 테스트 통과 상태 확인 완료)를 별도 커밋으로 확정하고, 음수 modulo 패리티 회귀(`(0-1)%4 == 3`)만 추가해 Gate 5R을 마감하라 — Transfer presentation·60번 누적합·56 음수 케이스는 이미 구현돼 있고 테스트로 고정돼 있으므로 다시 손대지 마라. 이후 성단 6의 기존 61번은 ID/version/function과 기존 테스트 의미를 보존한 채(추가 전용) fixture 3종을 보태 현대화하고, 62~70 신규 9문제를 구현하라. 모든 문제는 `state-transition` Lens와 현행 thoughtCheck 스키마(`question/value/expected`)를 사용하고, 조합·재귀·비트·`break`·새 평가기 문법은 만들지 마라. §8의 측정표가 런타임 예산을 이미 확정했다: 67·68은 항목 수 1..6으로 제한하고, 70은 3자리가 아니라 반드시 2자리(00..99)에 단서 자릿수 사전 계산으로 구현하며, 각 문제의 Hidden 구성은 fixture 누적 20,000 step 이내로 설계하라(저작 테스트가 자동 강제한다). 69는 `[validPairs, checks]` 반환으로 가지치기를 행동 검증하고, 70의 단서 유일성은 JS Oracle 전수 검사로만 확인한다. 마지막으로 레지스트리 requiredAnchors를 [61, 65]로 수정하고, `[Test 18]`·총 72개 집합 동등성·Anchor+Core 6/8 게이트(`isConstellationUnlocked` 기반)를 고정한 뒤 전체 테스트·ESLint·Build·번들 크기 기록을 완료하라.
