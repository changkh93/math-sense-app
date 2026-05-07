# 다크매터 정제소 콘텐츠 구축 매뉴얼

이 문서는 다음 작업자가 `4월 평가 [reg_1774390167801_chap_1774390206639_unit_1777506272514] 작업해주세요`처럼 특정 단원 ID만 받아도 다크매터 정제소 콘텐츠를 이어서 구축할 수 있도록 작성한 실무 매뉴얼이다.

## 핵심 개념

다크매터와 다크매터 정제소는 별도 기능이다.

- 다크매터: 학생이 틀린 문제의 풀이 방법을 학습하는 곳
- 다크매터 정제소: 다크매터에서 익힌 풀이를 바탕으로 변형 조건을 풀어 진짜 이해를 증명하는 곳

정제소는 원문항을 다시 푸는 기능이 아니다. 반드시 원문항을 바탕으로 한 `징검다리 문제`와 `변형문항`을 제공해야 한다.

## 현재 구현 위치

정제소 콘텐츠를 추가할 때 주로 보는 파일은 아래 3개다.

- `src/utils/refineryVariantCatalog.js`
  - 정제소 전용 변형문항 카탈로그
  - 단원 ID, 문항 ID, 개념 ID, 징검다리 문제, 변형문항, 풀이 발판을 정의한다.
- `src/components/Space/DarkMatterRefineryView.jsx`
  - 정제소 홈, 원인 선택, 재확인, 오늘 작전 UI
  - 원인 선택 통계와 풀이 발판을 표시한다.
- `src/components/Space/SpaceHome.jsx`
  - 사용자별 `incorrect_questions`, `review_marks`를 불러와 정제소에 전달한다.
  - 정제소 완료 결과를 Firestore에 저장한다.

운영툴 관련 파일:

- `src/pages/Admin/QuizEditor.jsx`
  - 문항별 `refineryPrompt`, `refineryImageUrl`, `conceptId`, `variantGroupId`를 수정할 수 있다.

설계 메모:

- `docs/DARK_MATTER_REFINERY_PLAN.md`

이 파일은 과거 설계 메모다. 실제 작업 절차는 현재 문서를 우선한다.

## 학생 경험 규칙

### 오늘의 정화 작전

오늘의 정화 작전은 최대 8문항이다.

오늘 배정된 8문항을 모두 시도하면 오늘 작전은 완료다. 8문항 중 일부를 틀렸다고 해서 처음부터 다시 풀게 만들면 안 된다. 틀린 문항만 정제소에 남는다.

진행 흐름:

1. 원문항 확인
2. 원인 선택
3. 징검다리 문제
4. 변형문항
5. 결과 저장

변형문항까지 맞힌 문항은 즉시 완전 정화가 아니라 `recheck_pending` 상태가 된다.

### 완전 정화 재확인

전날 변형문항까지 맞힌 문항은 다음날 별도 큐에 뜬다.

- 위치: 정제소 홈의 `완전 정화 재확인`
- 오늘 8문항 작전과 별도
- 맞히면 `mastered`
- 틀리면 다시 오염 문항으로 돌아감

예시:

```text
오염 문항 30개
첫날 오늘 작전 8문항
- 7문항 성공
- 1문항 실패

다음날
[완전 정화 재확인] 7문항
[오늘의 정화 작전] 8문항 = 어제 실패 1문항 + 신규/우선순위 7문항
```

## 원인 선택 분류

정제소 1단계에서 학생은 아래 5개 중 하나를 고른다.

| 저장 ID | 화면 문구 | 통계 표시명 |
| --- | --- | --- |
| `concept_gap` | 개념 이해가 부족했어요 | 개념 이해 부족 |
| `equation_setup` | 문제를 식으로 바꾸기 어려웠어요 | 식 세우기 어려움 |
| `missed_condition` | 조건을 놓쳤어요 | 조건 놓침 |
| `calculation_error` | 계산 실수를 했어요 | 계산 실수 |
| `no_checking` | 검산하지 못했어요 | 검산 부족 |

이 값은 `refineryCause`와 `lastRefineryCause`로 저장된다.

예전 기록 호환 매핑:

| 예전 ID | 새 ID |
| --- | --- |
| `concept` | `concept_gap` |
| `guess` | `equation_setup` |
| `condition` | `missed_condition` |
| `calculation` | `calculation_error` |

통계는 `incorrect_questions`와 `review_marks`의 원인 기록을 합산한다. 같은 문항이 두 컬렉션에 모두 있어도 중복 집계하지 않도록 `SpaceHome.jsx`의 `buildRefineryCauseStats()`에서 문항 ID 기준으로 정리한다.

## Firestore 데이터 흐름

### 오답/오염 문항

사용자별 컬렉션:

```text
users/{uid}/incorrect_questions/{questionId}
```

주요 필드:

- `id`
- `unitId`
- `unitTitle`
- `conceptId`
- `failCount`
- `lastFailedAt`
- `refineryCause`
- `lastRefineryCause`

### 재검토/재확인/완전 정화 상태

사용자별 컬렉션:

```text
users/{uid}/review_marks/{questionId}
```

주요 상태:

- `active`: 정제소에 남아야 하는 문항
- `recheck_pending`: 다음날 완전 정화 재확인 대상
- `mastered`: 완전 정화 완료

주요 필드:

- `status`
- `markedAt`
- `recheckAvailableAt`
- `masteredAt`
- `masteryStage`
- `lastRefineryCause`

### 정제소 완료 저장 규칙

정제소 결과 저장은 `SpaceHome.jsx`의 `handleComplete()` 안에서 처리된다.

틀린 문항:

- `incorrect_questions/{questionId}`에 남긴다.
- `failCount`를 증가시킨다.
- `review_marks/{questionId}`는 `status: active`로 둔다.

변형문항까지 맞힌 문항:

- `incorrect_questions/{questionId}`에서 삭제한다.
- `review_marks/{questionId}`를 `status: recheck_pending`으로 저장한다.
- `recheckAvailableAt`은 현재 시각 기준 24시간 뒤로 저장한다.

다음날 재확인까지 맞힌 문항:

- `incorrect_questions/{questionId}`에서 삭제한다.
- `review_marks/{questionId}`를 `status: mastered`로 저장한다.

## 정제소 콘텐츠 구조

정제소 콘텐츠는 `src/utils/refineryVariantCatalog.js`의 `REFINERY_VARIANT_CATALOG`에 추가한다.

현재 4월 평가는 아래 단원 ID로 구현되어 있다.

```js
const APRIL_EVAL_UNIT_ID = 'reg_1774390167801_chap_1774390206639_unit_1777506272514'
```

문항 ID 패턴:

```js
const qid = (n) => `${APRIL_EVAL_UNIT_ID}_q${String(n).padStart(2, '0')}`
```

카탈로그 기본 형태:

```js
[qid(1)]: item(1, 'concept_id', '개념 이름', {
  question: '징검다리 문제 텍스트',
  options: mc('정답', ['오답1', '오답2', '오답3', '오답4'])
}, {
  question: '변형문항 텍스트',
  options: mc('정답', ['오답1', '오답2', '오답3', '오답4'])
})
```

`mc()`는 첫 번째 인자를 정답으로, 배열을 오답으로 만든다. 화면에서는 선택지가 셔플된다.

정답은 반드시 하나만 있어야 한다.

## 풀이 발판 구조

각 개념은 `HINT_RECIPES`에 풀이 발판을 등록한다.

```js
concept_id: {
  target: '학생이 먼저 무엇을 구해야 하는지 알려준다.',
  rule: '바로 적용할 수 있는 수학 규칙을 알려준다.',
  check: '자주 틀리는 지점이나 검산 기준을 알려준다.'
}
```

화면 표시:

- `1. 구해야 할 것`
- `2. 바로 쓰는 규칙`
- `3. 실수 체크`

나쁜 힌트:

```text
문제의 조건을 잘 읽어보세요.
식을 세워 보세요.
차례대로 계산하세요.
```

좋은 힌트:

```text
n각기둥의 모서리 수는 3n입니다.
평행사변형의 밑변 = 넓이 ÷ 높이입니다.
색칠한 부분이 전체의 1/8이면 전체 넓이에 1/8을 곱합니다.
```

## 새 단원 정제소 구축 절차

아래 절차를 그대로 따르면 된다.

### 1. 단원 ID 확인

사용자가 다음처럼 요청할 수 있다.

```text
4월 평가 [reg_1774390167801_chap_1774390206639_unit_1777506272514] 정제소 작업해주세요
```

이때 대괄호 안의 값이 `unitId`다.

### 2. 해당 단원의 퀴즈 목록 확인

Firestore의 `quizzes` 컬렉션에서 `unitId`가 일치하는 문항을 확인한다.

확인해야 할 항목:

- 문항 ID
- 문항 번호
- 원문항 텍스트
- 선택지
- 정답
- 이미지 유무
- 이미지 안에 숫자/라벨이 박혀 있는지
- 핵심 개념

문항 ID가 다음 패턴인지 확인한다.

```text
{unitId}_q01
{unitId}_q02
...
```

만약 패턴이 다르면 `qid()` 헬퍼를 그 단원에 맞게 조정해야 한다.

### 3. 문항별 개념 ID를 정한다

개념 ID는 영어 snake_case로 작성한다.

예:

```text
fraction_sharing
prism_edges_from_net
area_between_parallel_lines
solid_vertices_game
```

규칙:

- 같은 풀이 구조면 같은 conceptId를 재사용한다.
- 문항 번호나 월명을 conceptId에 넣지 않는다.
- 단, 평가 전용 특수 유형이면 접두어를 붙여도 된다.
  - 예: `apr_eval_pattern_boxes`

### 4. 징검다리 문제를 만든다

징검다리 문제는 원문항보다 쉬워야 한다.

목적:

- 학생이 개념 규칙을 다시 꺼내게 한다.
- 원문항 정답 암기를 막는다.
- 변형문항 전에 작은 성공을 준다.

작성 기준:

- 수를 더 작게 한다.
- 조건을 하나 줄인다.
- 도형 개념은 같은 공식이 드러나게 한다.
- 원문항과 답이 같지 않게 한다.

예:

원문항이 `정육각기둥의 모든 모서리 합으로 옆면 직사각형 둘레 구하기`라면 징검다리는:

```text
정육각기둥의 모든 모서리 길이의 합이 84cm이고 밑면의 한 변이 4cm입니다.
옆면인 직사각형 하나의 둘레는 몇 cm입니까?
```

### 5. 변형문항을 만든다

변형문항은 원문항과 같은 개념이지만 숫자, 조건, 도형 이름, 맥락을 바꾼다.

작성 기준:

- 정답은 원문항과 달라야 한다.
- 보기는 계산 실수를 반영한 오답으로 만든다.
- 원문항을 그대로 다시 풀면 맞힐 수 없어야 한다.
- 문제는 텍스트 조건만 보고 풀 수 있어야 한다.

이미지가 있는 문항도 변형문항에서는 텍스트 조건을 우선한다.

필수 안내 문구는 화면에서 자동으로 붙는 경우가 있다. 직접 문제에 넣어야 하는 경우 아래 문구를 사용한다.

```text
아래 이미지는 참고용입니다. 이미지 안의 숫자나 표시와 다를 수 있으니, 반드시 문제 글에 제시된 조건과 숫자를 기준으로 풀어주세요.
```

### 6. 선택지를 만든다

정답 1개, 오답 4개를 권장한다.

좋은 오답 유형:

- 자주 하는 계산 실수
- 조건 하나를 빠뜨린 값
- 반대로 계산한 값
- 약분을 안 한 값
- 단위나 개수를 착각한 값

나쁜 오답:

- 너무 말이 안 되는 값
- 정답과 같은 값의 다른 표현
- 실제로도 맞는 값

주의:

`mc()`의 첫 번째 인자는 정답이다.

```js
options: mc('$8$', ['$6$', '$7$', '$9$', '$12$'])
```

### 7. 풀이 발판을 만든다

개념마다 `target`, `rule`, `check`를 작성한다.

예:

```js
area_between_parallel_lines: {
  target: '평행한 두 직선 사이의 공통 높이를 구합니다.',
  rule: '삼각형 넓이는 밑변×높이÷2, 평행사변형 넓이는 밑변×높이입니다.',
  check: '두 도형의 높이는 같습니다. 높이를 h로 놓고 넓이 식을 하나로 합치세요.'
}
```

### 8. 카탈로그에 추가한다

현재 구조는 4월 평가 단원 하나를 상수로 잡고 있다. 새 단원을 추가할 때는 아래 중 하나를 선택한다.

#### 빠른 방식

현재 파일에 새 단원 상수와 새 qid 헬퍼를 추가한다.

```js
const MAY_EVAL_UNIT_ID = '새_unitId'
const mayQid = (n) => `${MAY_EVAL_UNIT_ID}_q${String(n).padStart(2, '0')}`
```

그리고 `REFINERY_VARIANT_CATALOG`에 추가한다.

```js
[mayQid(1)]: item(1, 'concept_id', '개념 이름', bridge, variant)
```

#### 권장 방식

여러 단원이 늘어나면 아래 구조로 리팩터링한다.

```js
export const REFINERY_SUPPORTED_UNIT_IDS = [
  APRIL_EVAL_UNIT_ID,
  MAY_EVAL_UNIT_ID
]

export function isRefinerySupportedQuestion(question) {
  return REFINERY_SUPPORTED_UNIT_IDS.includes(question?.unitId)
    || REFINERY_SUPPORTED_UNIT_IDS.some(unitId => (question?.id || '').startsWith(`${unitId}_q`))
}
```

그 후 `DarkMatterRefineryView.jsx`에서 현재 `isAprilEvaluationQuestion`을 새 함수로 교체한다.

현재 4월 평가만 지원하기 때문에 `isAprilEvaluationQuestion()` 이름이 남아 있다. 새 단원을 추가할 때 이 부분을 꼭 확인한다.

### 9. 정제소 지원 필터를 갱신한다

현재 정제소 홈은 4월 평가 문항만 미션에 노출한다.

관련 위치:

```js
src/components/Space/DarkMatterRefineryView.jsx
```

현재 코드:

```js
const aprilReadyQuestions = useMemo(() => sortedQuestions.filter(isAprilEvaluationQuestion), [sortedQuestions])
```

새 단원을 추가하면 이 필터가 새 단원도 포함해야 한다.

권장 변경:

```js
const refineryReadyQuestions = useMemo(() => sortedQuestions.filter(isRefinerySupportedQuestion), [sortedQuestions])
```

이름도 함께 바꾼다.

- `aprilReadyQuestions` → `refineryReadyQuestions`
- `recheckMission` 계산은 `refineryReadyQuestions` 기준
- `dailyCandidates` 계산도 `refineryReadyQuestions` 기준

### 10. 관리자 도구에서 보완 필드를 확인한다

운영툴에서 문항별로 아래 필드를 수정할 수 있다.

- `refineryPrompt`
- `refineryImageUrl`
- `conceptId`
- `variantGroupId`

자동 변형문항이 어색한 경우 운영툴에서 `refineryPrompt` 또는 `refineryImageUrl`을 수정해 보완한다.

단, 현재 4월 평가는 `refineryVariantCatalog.js`의 하드코딩 카탈로그가 우선 사용된다. 운영툴 필드는 fallback 또는 향후 확장용으로 본다.

## 이미지 문항 처리 원칙

이미지 문항은 세 유형으로 나눈다.

### 1. 이미지가 단순 참고인 경우

텍스트 조건만 바꿔도 된다.

예:

```text
아래 이미지는 참고용입니다. 문제 글의 조건과 숫자를 기준으로 풀어주세요.
```

### 2. 이미지 안에 숫자가 박혀 있는 경우

이미지를 그대로 쓰되 문제 텍스트의 숫자가 기준이라고 명확히 안내한다.

이 방식은 빠르게 모든 문항을 정제소에 올릴 때 유효하다.

주의:

- 이미지와 텍스트 숫자가 다르면 학생이 헷갈릴 수 있다.
- 가능하면 운영툴에서 `refineryImageUrl`로 숫자 없는 이미지를 별도 지정한다.

### 3. 도형 자체가 달라져야 하는 경우

장기적으로 SVG/Canvas 템플릿을 만든다.

예:

- 각기둥 전개도
- 평행선 사이 넓이
- 정사각형 가운데점
- 입체도형 꼭짓점/모서리 수 비교

하지만 단기 구축에서는 텍스트 조건 우선 방식으로 충분히 시작할 수 있다.

## 검증 체크리스트

새 단원 정제소 콘텐츠를 추가한 뒤 아래를 반드시 확인한다.

### 데이터 검증

- 모든 문항 ID가 실제 `quizzes` 문서 ID와 일치하는가?
- 각 문항에 `bridge`와 `variant`가 모두 있는가?
- 각 선택지 배열에 정답이 정확히 1개인가?
- 정답과 오답이 중복되지 않는가?
- 변형문항 정답이 실제로 맞는가?
- 원문항과 변형문항 정답이 우연히 같아 암기 가능성이 생기지 않는가?
- 이미지 문항은 텍스트 조건 기준 안내가 있는가?

### 코드 검증

현재 4월 평가 카탈로그 검증 예시:

```bash
node -e "import('./src/utils/refineryVariantCatalog.js').then(({REFINERY_VARIANT_CATALOG})=>{const items=Object.values(REFINERY_VARIANT_CATALOG); const bad=items.filter(v=>[v.bridge,v.variant].some(p=>!p||!Array.isArray(p.options)||p.options.length<2||p.options.filter(o=>o.isCorrect).length!==1)||!v.hints?.target||!v.hints?.rule||!v.hints?.check); console.log({count:items.length,bad:bad.map(v=>v.id||v.conceptId)}); if(bad.length) process.exit(1)})"
```

빌드:

```bash
npm run build
```

빌드 경고 중 Firebase dynamic/static import 경고와 큰 chunk 경고는 기존 경고다. 빌드 실패가 아니면 정제소 콘텐츠 추가와 직접 관련 없는 경우가 많다.

### 브라우저 테스트

1. 학생 계정으로 로그인한다.
2. 대상 단원의 문항을 일부러 틀려 `incorrect_questions`에 쌓는다.
3. 다크매터 정제소에 진입한다.
4. 오늘의 정화 작전에 대상 문항이 뜨는지 확인한다.
5. 원인 선택 화면에서 원문항과 이미지가 보이는지 확인한다.
6. 징검다리 문제를 맞히면 변형문항으로 넘어가는지 확인한다.
7. 변형문항을 맞히면 결과에서 `재확인 대기`로 표시되는지 확인한다.
8. 틀린 문항만 정제소에 남는지 확인한다.
9. 다음날 또는 테스트용으로 `recheckAvailableAt`을 과거로 조정한 뒤 `완전 정화 재확인`에 뜨는지 확인한다.
10. 재확인을 맞히면 `mastered`가 되는지 확인한다.

## Firestore로 대상 단원 문항 조사하기

다음 작업자가 Firestore Admin 접근 권한이 있을 때는 간단한 Node 스크립트로 대상 단원 문항을 조사한다.

조사 목표:

- 문항 수
- 문항 ID 목록
- 정답/선택지
- 이미지 여부
- 문제 유형

예시 절차:

```bash
rg -n "firebase-admin|serviceAccount|GOOGLE_APPLICATION_CREDENTIALS|initializeApp" .
```

프로젝트에 이미 Admin 초기화 스크립트가 있으면 재사용한다.

조사 결과는 작업 메모에 아래 형식으로 정리한다.

```text
unitId: reg_...
title: 4월 평가
quizCount: 25

q01
- original: ...
- answer: ...
- image: yes/no
- conceptId: ...
- bridge: ...
- variant: ...
- hints: target/rule/check
```

## 새 단원 추가 시 코드 변경 예시

예를 들어 5월 평가를 추가한다고 가정한다.

### 1. 상수 추가

```js
const MAY_EVAL_UNIT_ID = 'reg_xxx_chap_xxx_unit_xxx'
const mayQid = (n) => `${MAY_EVAL_UNIT_ID}_q${String(n).padStart(2, '0')}`
```

### 2. 지원 단원 목록 추가

```js
export const REFINERY_SUPPORTED_UNIT_IDS = [
  APRIL_EVAL_UNIT_ID,
  MAY_EVAL_UNIT_ID
]
```

### 3. 지원 여부 함수 추가

```js
export function isRefinerySupportedQuestion(question) {
  return REFINERY_SUPPORTED_UNIT_IDS.includes(question?.unitId)
    || REFINERY_SUPPORTED_UNIT_IDS.some(unitId => (question?.id || '').startsWith(`${unitId}_q`))
}
```

### 4. 기존 함수 호환

기존 코드가 `isAprilEvaluationQuestion`을 import하고 있을 수 있으므로, 즉시 전체 교체가 부담스러우면 임시로 아래처럼 유지한다.

```js
export const isAprilEvaluationQuestion = isRefinerySupportedQuestion
```

장기적으로는 이름을 `isRefinerySupportedQuestion`으로 바꾸는 것이 맞다.

### 5. 카탈로그 추가

```js
[mayQid(1)]: item(1, 'fraction_sharing', '분수 길이 나누기', {
  question: '징검다리 문제',
  options: mc('정답', ['오답1', '오답2', '오답3', '오답4'])
}, {
  question: '변형문항',
  options: mc('정답', ['오답1', '오답2', '오답3', '오답4'])
})
```

## 정제소 콘텐츠 품질 기준

좋은 정제소 문항은 다음 조건을 만족한다.

- 원문항을 외워서는 풀 수 없다.
- 같은 개념을 사용한다.
- 조건이 명확하다.
- 초등학생이 문제 글만 보고 풀 수 있다.
- 풀이 발판이 실제 계산에 도움이 된다.
- 오답 보기가 실수 유형을 반영한다.
- 이미지는 혼란을 만들지 않는다.

나쁜 정제소 문항:

- 원문항 숫자만 하나 바꿨지만 정답 구조가 그대로인 문항
- 풀이 발판이 “잘 읽어보세요” 수준인 문항
- 이미지 숫자와 텍스트 숫자가 충돌하는데 안내가 없는 문항
- 정답이 2개 이상으로 해석될 수 있는 문항
- 원문항보다 갑자기 훨씬 어려워지는 문항

## 작업 완료 보고 템플릿

새 단원 정제소 구축 후 사용자에게 아래 형식으로 보고한다.

```text
다크매터 정제소 콘텐츠를 추가했습니다.

대상 단원:
- 4월 평가 [reg_...]

반영:
- N문항 정제소 카탈로그 추가
- 각 문항별 징검다리 문제 + 변형문항 추가
- conceptId 및 풀이 발판 추가
- 이미지 문항은 텍스트 조건 우선 안내 기준으로 작성

검증:
- 정답 옵션 1개 검증 통과
- npm run build 통과

테스트 포인트:
- 오늘 작전 8문항
- 완전 정화 재확인 분리
- 틀린 문항만 정제소에 잔류
```

## 현재 4월 평가 구현 상태

대상 단원:

```text
reg_1774390167801_chap_1774390206639_unit_1777506272514
```

현재 상태:

- 25문항 정제소 카탈로그 구축 완료
- 문항별 징검다리 문제 구축 완료
- 문항별 변형문항 구축 완료
- 개념별 풀이 발판 구축 완료
- 원인 선택 5분류 적용 완료
- 원인 통계 패널 적용 완료
- 오늘 작전과 완전 정화 재확인 분리 완료

현재 한계:

- 지원 필터 함수 이름이 아직 `isAprilEvaluationQuestion`이다.
- 새 단원을 추가할 때는 지원 단원 목록 방식으로 리팩터링하는 것을 권장한다.
- 이미지 기반 자동 도형 생성기는 아직 없다.
- 4월 평가 외 단원은 정제소 카탈로그에 없으면 오늘 작전에 뜨지 않는다.

