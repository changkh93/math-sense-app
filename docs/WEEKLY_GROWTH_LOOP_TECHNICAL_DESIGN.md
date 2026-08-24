# 과제 기록소 주간 성장 루프 개발 설계

- 문서 상태: 구현 전 기술 설계안 v1
- 작성일: 2026-08-24
- 제품 계획: `docs/WEEKLY_GROWTH_LOOP_PLAN.md`
- 제품명: `이번 주 항로`
- 내부 도메인명: `Weekly Growth Loop`

## 1. 기술 목표

기존 과제 기록소에 다음 기능을 추가한다.

1. 사용자별·주차별 주간 성장 루프를 정확히 한 문서로 관리한다.
2. 지난주 기록 요약, 이전 목표 결과, 성찰, 전략, 새 목표를 하나의 순환으로 저장한다.
3. 원본 학습 이력을 화면 진입마다 읽지 않고 기존 요약 문서와 집계 쿼리를 사용한다.
4. 과제 기록소의 기존 일별 과제·항해 일지 데이터 모델을 변경하지 않는다.
5. 작성 중 입력은 로컬에 저장하고 완료·수정 시에만 서버에 쓴다.
6. 모든 서버 쓰기는 검증·멱등·동시성 보호를 갖춘 Callable Function을 통한다.

## 2. 아키텍처 결정

### 2.1 선택한 구조

```text
AssignmentHub
  └─ 사용자가 "이번 주 항로" 클릭
       └─ openWeeklyGrowthLoop Callable
            ├─ weeklyGrowthLoops/{uid__weekStart} 정확 조회
            ├─ 있으면 그대로 반환
            └─ 없으면 지난주 증거를 1회 집계하여 문서 생성
                 ├─ learningSummaries/{uid} 1문서
                 ├─ assignments 지난주 count 집계
                 ├─ users/{uid}/readingDayCredits 지난주 count 집계
                 └─ 직전 weeklyGrowthLoops 문서 1개

WeeklyGrowthLoopDrawer
  ├─ 로컬 초안(localStorage)
  └─ completeWeeklyGrowthLoop Callable
       └─ 주간 문서 1건 트랜잭션 갱신
```

핵심은 **주간 화면 최초 열기 때만 지난주 증거를 스냅샷으로 고정**하는 것이다. 이후 재진입과 상세 표시는 주간 문서 1건만 읽는다.

### 2.2 사용하지 않는 구조

- 주간 화면에서 `useLearningHistory`를 호출하지 않는다. 이 훅은 일별 상세용 실시간 리스너 4개를 사용한다.
- `useStudentReport`를 재사용하지 않는다. 현재 보고서는 전체 과제·전체 이력·콘텐츠 메타데이터·동료 비교까지 읽는 무거운 분석 경로다.
- 원본 `history` 문서를 7일 범위로 매번 가져오지 않는다.
- 주간 목표를 일별 과제 문서에 중첩 저장하지 않는다.
- 목표별 하위 컬렉션을 만들지 않는다.
- 매일 목표 상태를 자동 갱신하는 트리거를 만들지 않는다.
- 주간 화면을 실시간 `onSnapshot`으로 구독하지 않는다.

## 3. 주차 계산

### 3.1 기준

- 시간대: `Asia/Seoul`
- 주 시작: 월요일 00:00:00
- 주 종료: 일요일 23:59:59.999
- 저장 키: 주 시작일 `YYYY-MM-DD`
- 문서 ID: `${uid}__${weekStartKey}`

예:

```text
현재 시각: 2026-08-24 월요일 KST
현재 주:   2026-08-24 ~ 2026-08-30
검토 주:   2026-08-17 ~ 2026-08-23
문서 ID:   uid123__2026-08-24
```

### 3.2 서버 권위

- 서버가 현재 KST 시각으로 주차를 계산한다.
- 클라이언트가 보낸 `weekStartKey`는 조회 힌트로만 사용하거나 MVP에서는 받지 않는다.
- 완료 요청 중 주차가 바뀌면 `WEEK_ROLLED_OVER`를 반환하고 새 주 흐름을 다시 열게 한다.
- 과거 주 소급 생성은 MVP에서 허용하지 않는다.

## 4. 데이터 모델

### 4.1 `weeklyGrowthLoops/{loopId}`

```js
{
  ownerId: "uid123",
  weekStartKey: "2026-08-24",
  weekEndKey: "2026-08-30",
  timezone: "Asia/Seoul",
  status: "open", // open | completed

  reviewedWeek: {
    startKey: "2026-08-17",
    endKey: "2026-08-23",
    previousLoopId: "uid123__2026-08-17" | null,
    previousGoals: [
      {
        id: "goal_read_3_days",
        templateId: "learn_read_3_days",
        category: "learn",
        label: "책 3일 읽기"
      }
    ],
    evidence: {
      learningActivityDays: 4,
      learningActivityCount: 11,
      assignmentCount: 3,
      readingDays: 2,
      learningSummaryUpdatedAt: Timestamp | null,
      availability: {
        learning: true,
        assignments: true,
        reading: true
      }
    }
  },

  previousGoalOutcomes: [
    {
      goalId: "goal_read_3_days",
      result: "partial" // done | partial | not_yet
    }
  ],

  reflection: {
    observationCodes: ["too_many_plans", "delayed_start"], // 1~2
    prideCode: "kept_going" | "not_sure" | null,
    strategyCode: "reduce_plans" // exactly 1
  },

  plan: {
    goals: [
      {
        id: "goal_math_3_times",
        templateId: "learn_math_3_times",
        category: "learn",
        label: "수학 3번 하기"
      }
    ]
  },

  promptVersion: 1,
  schemaVersion: 1,
  revision: 1,
  openedAt: Timestamp,
  completedAt: Timestamp | null,
  updatedAt: Timestamp
}
```

### 4.2 모델링 원칙

- 학생의 선택은 안정적인 코드로 저장한다. 화면 문구 변경이 과거 통계를 깨지 않게 한다.
- 목표 라벨은 `label` 스냅샷도 함께 저장한다. 템플릿 문구가 바뀌어도 과거 기록은 당시 표현을 보존한다.
- 이전 주 목표는 현재 문서에 작은 스냅샷으로 복사한다. 현재 화면에서 이전 문서를 다시 읽지 않는다.
- 증거 수치는 작성 시작 시 고정한다. 과거 기록이 나중에 수정돼도 학생이 당시 본 화면은 변하지 않는다.
- 목표 3개와 선택 코드만 저장하므로 문서 크기는 매우 작게 유지된다.
- 자유 서술, 상담 메모, 교사 평가는 같은 문서에 저장하지 않는다.

### 4.3 명령 문서

`weeklyGrowthCommands/{uid__commandId}`

```js
{
  ownerId: "uid123",
  commandId: "cmd_...",
  type: "complete_weekly_growth_loop",
  payloadHash: "sha256...",
  targetId: "uid123__2026-08-24",
  result: { success: true, loopId: "...", revision: 1 },
  createdAt: Timestamp,
  expiresAt: Timestamp
}
```

- 동일 명령 재시도는 같은 결과를 반환한다.
- 같은 `commandId`에 다른 payload가 오면 거부한다.
- TTL 정책으로 만료 명령을 정리한다.

## 5. 선택 코드와 템플릿

### 5.1 성찰 코드

```js
const OBSERVATION_CODES = [
  "too_many_plans",
  "delayed_start",
  "avoided_difficulty",
  "kept_consistent",
  "focused_well",
  "skipped_unknowns",
  "plan_fit_well",
  "unexpected_events",
  "not_sure"
];
```

- 최소 1개, 최대 2개
- 중복 금지
- 서버 allow-list 검증

### 5.2 자랑스러운 점 코드

```js
const PRIDE_CODES = [
  "consistency",
  "did_not_give_up",
  "tried_difficulty",
  "started_by_myself",
  "tried_again",
  "not_sure"
];
```

- 선택 입력
- `null`은 건너뛰기

### 5.3 전략 코드

```js
const STRATEGY_CODES = [
  "reduce_plans",
  "small_every_day",
  "hard_first",
  "retry_mistakes",
  "set_start_time",
  "remove_distractions",
  "ask_when_stuck",
  "keep_current_plan"
];
```

- 정확히 1개
- 서버에서 학생 대신 기본값을 채우지 않는다.

### 5.4 목표 템플릿

클라이언트와 서버가 공유 가능한 버전 고정 카탈로그를 둔다.

```js
{
  id: "learn_read_3_days",
  category: "learn",
  label: "책 3일 읽기",
  active: true,
  minPromptVersion: 1
}
```

카테고리:

- `learn`
- `habit`
- `challenge`
- `together`

검증:

- 1~3개
- 템플릿 ID 중복 금지
- 비활성 템플릿 신규 선택 금지
- 서버가 공식 라벨과 카테고리를 다시 채운다. 클라이언트 라벨을 신뢰하지 않는다.

## 6. 지난주 증거 스냅샷

### 6.1 학습 활동

소스: `learningSummaries/{uid}` 한 문서

`daily` 배열에서 `reviewedWeek.startKey <= date <= endKey`인 항목만 필터링한다.

```js
learningActivityDays = matchingDailyRows.length
learningActivityCount = sum(
  quizzes + workbooks + videos + texts + codeTraces
)
```

중요:

- 주간 루프를 위해 `getOrRebuildLearningSummary`를 자동 호출하지 않는다.
- 요약이 없거나 스키마가 오래됐으면 `availability.learning = false`로 반환한다.
- 전체 `history` 재구축은 사용자가 주간 화면을 연 행동보다 훨씬 비싸므로 분리한다.

### 6.2 과제 제출

소스: `assignments` 집계 쿼리

조건:

```text
userId == uid
date >= reviewedWeek.startKey
date <= reviewedWeek.endKey
```

결과는 `count()`만 사용하고 원문, 파일, 피드백은 읽지 않는다. 상태상 과제 문서는 제출 이후 생성되므로 MVP에서는 총 문서 수를 `assignmentCount`로 사용한다.

### 6.3 독서일

소스: `users/{uid}/readingDayCredits`

문서 ID가 KST 날짜 키이므로 지난주 범위에 대한 집계 쿼리로 `readingDays`를 계산한다. 원본 `readingLogs`는 읽지 않는다.

### 6.4 이전 목표

직전 주의 결정적 문서 ID를 정확히 한 번 읽는다.

```text
weeklyGrowthLoops/{uid__previousWeekStartKey}
```

- 문서가 `completed`일 때만 목표를 복사한다.
- 없거나 `open`이면 `previousGoals = []`로 처리한다.
- 더 오래된 주를 찾는 검색 쿼리는 MVP에서 하지 않는다.

### 6.5 표현 안전성

증거는 다음처럼만 표현한다.

- `학습 활동을 4일 기록했어요.`
- `과제를 3건 제출했어요.`
- `독서 기록이 2일 있어요.`

다음 표현은 금지한다.

- `4일밖에 공부하지 않았어요.`
- `계획을 실패했어요.`
- `집중력이 부족해요.`
- `다음 주에는 수학을 해야 합니다.`

## 7. 서버 API 설계

### 7.1 `openWeeklyGrowthLoop`

요청:

```js
{}
```

처리:

1. 인증과 App Check 상태를 확인한다.
2. 서버 KST 기준 현재 주·검토 주를 계산한다.
3. 현재 주 문서를 정확 조회한다.
4. 존재하면 즉시 반환한다.
5. 없으면 학습 요약, 과제 집계, 독서일 집계, 직전 루프를 병렬로 읽는다.
6. 증거와 이전 목표 스냅샷을 구성한다.
7. 문서를 `create`한다.
8. 동시 생성 충돌이면 기존 문서를 다시 읽어 반환한다.

응답:

```js
{
  loop: { ... },
  created: true,
  costProfile: "weekly_snapshot_v1"
}
```

에러가 난 한 소스 때문에 전체 흐름을 막지 않는다. 해당 영역의 `availability`만 `false`로 설정한다. 단, 주간 문서 자체를 만들 수 없으면 실패한다.

### 7.2 `completeWeeklyGrowthLoop`

요청:

```js
{
  commandId,
  expectedRevision: 0,
  previousGoalOutcomes: [{ goalId, result }],
  observationCodes: ["too_many_plans"],
  prideCode: "did_not_give_up" | null,
  strategyCode: "reduce_plans",
  goalTemplateIds: ["learn_math_3_times", "habit_set_start_time"]
}
```

처리:

1. 모든 배열 크기·코드·문자열 길이를 검증한다.
2. 명령 문서와 현재 루프를 트랜잭션으로 읽는다.
3. 중복 명령이면 기존 결과를 반환한다.
4. 문서 소유자, 현재 주, 상태, `expectedRevision`을 검증한다.
5. 이전 목표가 있으면 모든 목표에 결과가 정확히 하나씩 있는지 검증한다.
6. 서버 카탈로그에서 목표 라벨·카테고리를 채운다.
7. `status = completed`, `revision = 1`로 갱신한다.
8. 명령 결과를 기록한다.

MVP에서는 광석을 지급하지 않는다. 보상 실험을 추가할 때만 같은 트랜잭션에 사용자·광석 원장 쓰기를 추가한다.

### 7.3 `updateWeeklyGrowthLoop`

완료 문서를 수정할 때 사용한다.

- `expectedRevision` 필수
- 같은 주 문서만 수정 가능
- 다음 주가 시작된 뒤에는 기본 읽기 전용
- 증거 스냅샷과 이전 목표는 수정 불가
- 성찰, 전략, 현재 목표만 교체
- `revision + 1`
- 명령 멱등 처리

초기 구현에서는 `completeWeeklyGrowthLoop`가 `completed` 문서 수정까지 처리하도록 합칠 수 있으나, 감사 로그와 오류 문구를 위해 명령 타입은 분리하는 것을 권장한다.

### 7.4 후속 API

MVP 비범위:

- `listStudentWeeklyGrowthLoops` — 교사 최근 6주
- `getMonthlyGrowthReflection`
- `suggestWeeklyGoalTemplates`

## 8. 클라이언트 설계

### 8.1 예정 파일

| 영역 | 예정 파일 | 책임 |
|---|---|---|
| 진입점 | `src/components/Space/AssignmentHub.jsx` | 버튼과 드로어 열기 |
| 주간 흐름 | `src/components/Space/WeeklyGrowthLoop/WeeklyGrowthLoopDrawer.jsx` | 단계 전환·완료 화면 |
| 단계 UI | `WeeklyReviewStep.jsx`, `WeeklyStrategyStep.jsx`, `WeeklyGoalsStep.jsx` | 선택형 입력 |
| 훅 | `src/hooks/useWeeklyGrowthLoop.js` | 열기·완료·수정 Callable과 캐시 |
| 도메인 | `src/utils/weeklyGrowthLoopDomain.js` | 주차 표시, 선택 문구, 로컬 검증 |
| 스타일 | `WeeklyGrowthLoop.css` | 모바일·데스크톱 레이아웃 |

실제 파일 분리는 구현 시 프로젝트의 번들 전략에 맞게 조정할 수 있다.

### 8.2 지연 로드

- `WeeklyGrowthLoopDrawer`는 동적 import 후보로 둔다.
- 버튼 클릭 전에는 주간 Callable을 실행하지 않는다.
- 과제 기록소 기본 진입 비용은 현재와 동일하게 유지한다.

### 8.3 TanStack Query

```js
queryKey: ["weeklyGrowthLoop", uid, weekStartKey]
staleTime: Infinity
gcTime: 30 * 60 * 1000
refetchOnWindowFocus: false
refetchOnReconnect: false
retry: 1
```

- 주간 문서는 완료 전이라도 서버 증거가 바뀌지 않는다.
- 완료·수정 성공 후 `setQueryData`로 캐시를 직접 갱신한다.
- 피드나 과제 목록 전체를 무효화하지 않는다.
- 주차가 바뀌면 query key가 바뀌므로 이전 캐시와 충돌하지 않는다.

### 8.4 로컬 초안

키:

```text
metasense.weeklyGrowthLoopDraft.v1:{uid}:{weekStartKey}
```

저장 항목:

- 현재 단계
- 이전 목표 결과 선택
- 성찰 코드
- 자랑스러운 점 코드
- 전략 코드
- 목표 템플릿 ID
- 저장 시각

원칙:

- 선택이 바뀔 때 로컬에만 저장한다.
- 서버 자동 저장은 하지 않는다.
- 완료 성공 후 로컬 초안을 삭제한다.
- 다른 계정의 초안을 읽지 않도록 UID를 키에 포함한다.
- 주차가 끝난 초안은 열지 않고 정리한다.

## 9. Firestore 비용 예산

### 9.1 학생 1명 기준

| 행동 | 읽기 | 쓰기 | 비고 |
|---|---:|---:|---|
| 과제 기록소만 열기 | **추가 0** | 0 | 주간 기능은 클릭 전 실행하지 않음 |
| 새 주 최초 열기 | 예상 5 | 1 | 현재 문서, 학습 요약, 과제 count, 독서 count, 이전 문서 |
| 같은 주 재열기 | 1 | 0 | 주간 문서 정확 조회 |
| 작성 중 선택 변경 | 0 | 0 | localStorage만 사용 |
| 최초 완료 | 2 | 2 | 주간 문서+명령 문서 읽기/쓰기 |
| 같은 명령 재시도 | 1~2 | 0 | 저장된 명령 결과 반환 |
| 계획 명시적 수정 | 2 | 2 | 주간 문서+명령 문서 |

집계 쿼리는 Firestore 집계 과금 단위를 따르므로 실제 청구 읽기는 인덱스 항목 수에 따라 달라질 수 있다. 사용자 1명의 7일 범위로 제한해 정상 사용에서는 최소 단위에 머무는 것을 목표로 한다.

### 9.2 비용 방어 규칙

1. 모든 원본 쿼리는 사용자 ID와 정확한 7일 범위를 갖는다.
2. 반환 문서가 필요 없는 곳은 `count()`를 사용한다.
3. 요약이 없다고 전체 이력을 자동 재구축하지 않는다.
4. 현재 주 문서가 있으면 다른 집계를 실행하지 않는다.
5. 주간 문서는 결정적 ID로 중복 생성을 막는다.
6. 목록 페이지네이션과 교사 조회는 MVP에 넣지 않는다.
7. 알림·스케줄러·매일 집계 트리거를 만들지 않는다.
8. 클라이언트 포커스·재연결 재조회는 끈다.
9. 저장은 완료와 명시적 수정에만 발생한다.

### 9.3 부하 상한

- 사용자당 주간 스냅샷 생성: 최대 1회/주
- 완료 명령: 최대 1회/주, 수정은 일일 한도 적용 가능
- 한 문서 목표: 최대 3개
- 성찰 선택: 최대 2개
- 문서 예상 크기: 10KB 미만
- Callable 요청 본문: 8KB 미만

## 10. 인덱스 계획

필수 검토 인덱스:

```json
{
  "collectionGroup": "assignments",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "date", "order": "ASCENDING" }
  ]
}
```

MVP의 `weeklyGrowthLoops`는 결정적 ID 정확 조회만 사용하므로 별도 복합 인덱스가 필요 없다.

Phase 2 교사 화면에서 다음 인덱스를 검토한다.

```text
weeklyGrowthLoops: ownerId ASC, weekStartKey DESC
```

`readingDayCredits`는 사용자 하위 컬렉션의 문서 ID 범위 집계이므로 추가 복합 인덱스를 만들지 않는다.

## 11. 보안과 개인정보

### 11.1 Firestore 규칙

권장 정책:

```text
weeklyGrowthLoops
  read: 본인 또는 관리자
  write: false

weeklyGrowthCommands
  read/write: false
```

- 모든 쓰기는 Callable 전용이다.
- MVP에서는 다른 학생, 크루원, 아고라 사용자가 읽을 수 없다.
- 연결 학부모 조회는 제품 정책 확정 전 허용하지 않는다.
- 교사/관리자 열람은 기존 관리자 판정 함수를 사용한다.

### 11.2 입력 검증

- allow-list에 없는 코드 거부
- 배열 크기와 중복 검증
- 이전 목표 결과가 서버 스냅샷과 정확히 대응하는지 검증
- 현재 주 문서 소유자 검증
- 목표 라벨은 서버 카탈로그에서 생성
- 예상 revision 불일치 시 `CONFLICT` 반환
- 명령 ID와 payload hash 검증

### 11.3 민감도

주간 성찰은 학생의 습관·어려움에 관한 비공개 교육 기록이다.

- 공개 프로필, 아고라, 랭킹에 사용하지 않는다.
- 선택 결과를 광고·추천 알고리즘에 사용하지 않는다.
- 교사 화면에 표시할 때도 평가 등급으로 변환하지 않는다.
- 계정 삭제 시 주간 문서와 명령 문서를 삭제 대상에 포함한다.

## 12. 동시성·멱등·실패 처리

### 12.1 동시 기기

- 문서 `revision`으로 낙관적 동시성을 제어한다.
- 오래된 화면에서 저장하면 최신 문서를 덮어쓰지 않고 충돌 안내를 보여준다.
- 사용자는 최신 내용 다시 불러오기 또는 자신의 로컬 선택 검토 중 하나를 고른다.

### 12.2 중복 열기

- 결정적 문서 ID와 서버 `create`를 사용한다.
- 두 요청이 동시에 증거를 계산해도 한 문서만 생성된다.
- 충돌한 요청은 생성된 문서를 다시 읽어 반환한다.

### 12.3 부분 증거 실패

- 학습·과제·독서 집계를 독립적으로 실행한다.
- 한 영역 실패는 `availability.{area} = false`로 기록한다.
- 화면은 `기록을 불러오지 못했어요`라고 표시하고 나머지 단계 진행을 허용한다.
- 오류 때문에 원본 전체 스캔으로 자동 폴백하지 않는다.

### 12.4 주차 전환

- 자정 직전에 연 화면을 월요일 00시 이후 제출하면 서버가 현재 주 불일치를 감지한다.
- 과거 초안은 로컬에 보존하되 새 주 화면에서 자동 제출하지 않는다.

## 13. 관측성과 운영

구조화 로그:

```text
weekly_loop_open_existing
weekly_loop_snapshot_created
weekly_loop_snapshot_partial
weekly_loop_completed
weekly_loop_updated
weekly_loop_revision_conflict
weekly_loop_duplicate_command
```

로그 필드:

- `uidHash` 또는 내부 UID
- `loopId`
- `weekStartKey`
- `durationMs`
- `evidenceAvailability`
- `created`
- `revision`
- 오류 코드

원본 성찰 코드나 목표 문구는 일반 애플리케이션 로그에 남기지 않는다.

운영 경보 후보:

- 스냅샷 생성 실패율 2% 초과
- p95 2초 초과
- 중복 문서 발견
- revision 충돌 5% 초과
- 학습 요약 unavailable 10% 초과

## 14. 테스트 계획

### 14.1 정책 단위 테스트

- KST 월요일·일요일·연말·윤년 주차 계산
- 성찰 0개/3개 거부, 1~2개 허용
- 전략 0개/2개 거부
- 목표 0개/4개와 중복 거부
- 잘못된 코드와 비활성 템플릿 거부
- 이전 목표 결과 누락·중복·타 목표 ID 거부
- revision 검증
- payload hash 안정성

### 14.2 함수 통합 테스트

- 최초 열기 시 주간 문서 1개 생성
- 재열기 시 증거 집계 미실행
- 동시 열기 시 한 문서만 존재
- 일부 증거 실패에도 문서 생성
- 완료 재시도 멱등
- 동일 command ID 다른 payload 거부
- 다음 주에 지난 목표 스냅샷 연결
- 놓친 주 소급 생성 없음
- 주차 전환 중 완료 거부

### 14.3 Firestore 규칙 테스트

- 학생 본인 읽기 허용
- 다른 학생 읽기 거부
- 학생 직접 쓰기 거부
- 관리자 읽기 허용
- 명령 문서 클라이언트 접근 거부

### 14.4 클라이언트 테스트

- 첫 이용 흐름
- 이전 목표가 있는 흐름
- 기록 없음·부분 실패 표시
- 선택 상한과 버튼 활성화
- 로컬 초안 복원·완료 후 삭제
- 모바일 스크롤과 뒤로가기
- 중복 제출 방지
- revision 충돌 안내

### 14.5 비용 회귀 테스트

정적·에뮬레이터 검증으로 다음을 확인한다.

- 과제 기록소 기본 렌더에서 주간 Callable 0회
- 기존 주 재진입에서 원본 집계 0회
- `history.get()` 전체 스캔 금지
- `useLearningHistory`와 `useStudentReport` 미사용
- 자동 저장 Firestore write 없음
- 현재 문서 존재 확인 후 집계 실행 순서 보장

## 15. 구현 순서

### Step 1 — 도메인 계약

- 주차 계산, 선택 코드, 목표 카탈로그, 오류 코드
- 제품 문구와 카탈로그 확정
- 정책 단위 테스트

### Step 2 — 서버 읽기·스냅샷

- `openWeeklyGrowthLoop`
- 요약·집계 어댑터
- 결정적 생성과 부분 실패 처리
- 비용 계측

### Step 3 — 서버 완료·수정

- 입력 검증
- 명령 멱등
- revision 충돌
- 완료·수정 함수

### Step 4 — 규칙·인덱스·삭제

- Firestore 규칙
- assignments 범위 인덱스
- 계정 삭제 정리 경로
- Emulator 테스트

### Step 5 — 학생 UI

- 과제 기록소 버튼
- 드로어와 5단계 흐름
- 로컬 초안
- 캐시 직접 갱신
- 모바일 접근성

### Step 6 — QA와 제한 출시

- 내부 학생 계정 파일럿
- 비용·완료 시간·이탈 단계 확인
- 선택지와 목표 템플릿 조정
- 보상 없이 4주 관찰

## 16. 완료 기준

다음 조건을 모두 만족해야 MVP 구현 완료로 본다.

1. 과제 기록소 기본 진입에 추가 Firestore 호출이 없다.
2. 학생은 2~3분 안에 주간 루프를 완료할 수 있다.
3. 성찰 1~2개, 전략 1개, 목표 최대 3개가 서버에서도 강제된다.
4. 지난주 증거는 원본 전체 스캔 없이 생성된다.
5. 같은 주 재진입은 주간 문서 1건만 읽는다.
6. 선택 변경 중 서버 쓰기가 발생하지 않는다.
7. 중복 요청과 동시 기기 저장이 데이터를 중복·덮어쓰기 하지 않는다.
8. 다른 학생은 주간 기록을 읽거나 쓸 수 없다.
9. 이전 목표와 이번 결과가 다음 주 문서에 연결된다.
10. 목표 성공 여부와 무관하게 평가·보상 차이가 없다.

## 17. 후속 설계 전에 확인할 결정

- 교사 외 연결 학부모에게 주간 기록을 보여줄지
- 목표 최소 개수를 1개로 강제할지, 돌아보기만 허용할지
- 완료 후 같은 주 수정 가능 기간
- 파일럿 대상 연령에 따라 선택지 문구를 나눌지
- 4주 후 소량 돌아보기 보상 실험을 할지

이 다섯 항목은 데이터 모델을 크게 바꾸지 않으므로 Phase 0 또는 파일럿 과정에서 결정할 수 있다.
