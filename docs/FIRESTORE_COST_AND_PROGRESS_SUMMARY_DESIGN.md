# Firestore 비용 점검 및 학습 완료 요약 개선 설계

작성일: 2026-09-02  
개정: 2026-09-02 (2차 코드 검토 반영)  
범위: `18ce961`, `0df37d1`, `c7c5e67`, `7725d48` 및 이 변경들이 사용하는 기존 학습 진도 경로

> **2차 검토 요약 (무엇이 바뀌었나)**
>
> 1차 설계가 놓친 비용원과 정합성 함정 4건을 반영했다.
>
> - 전체 `learning_progress` 리스너는 SpaceHome 것 하나가 아니다. `useLearningHistory`가 같은 무필터 리스너를 추가로 띄우며 AssignmentHub(SpaceHome 루트 상시 마운트), ParentDashboard(자녀 컬렉션), CrewDetailView 등이 쓴다. Release B가 SpaceHome 리스너만 제거하면 절감 효과가 반감된다. (§3.1, §4.8)
> - `syncLearningSummary` 트리거가 history 쓰기마다 해당 단원의 history 문서 전체를 재조회한다. 건당 O(U), 단원 누적 O(U²)의 기존 증폭원이다. 증분 계산으로 대체 가능하다. (§3.5, §4.7)
> - `type:'video'` history는 완료가 아니어도(명시적 종료 저장 시 세션 시청 시간 > 0이면) 기록된다. 따라서 현재 summary의 `modalities.video` 의미는 "완료"가 아니라 "시청 세션 존재"다. 1차 설계의 video 완료 정의(4.2)와 "기존 트리거 유지"(4.3)는 이 지점에서 모순이었으며, `completionModalities` 통합 마커로 해소한다. (§3.4, §4.2, §4.3)
> - 완료 history 중복 기록은 비콘 경로뿐 아니라 클라이언트 exit-save 경로에서도 발생한다(이미 완료된 영상을 다른 날 다시 보고 종료하면 그날의 `video_daily_` 문서가 새로 생김). `completionHistorySynced` 게이트는 양쪽을 모두 덮어야 한다. (§3.6, §4.3)
> - 그 외: `missionLab.isCompleted` 리더 3곳 추가 확인, `LUMI DAILY_RECORD_ENABLED` 의존성, v2/v3 트리거 배포 순서 위험, visibilitychange 세 번째 쓰기 경로, pagehide 비콘, 원격 킬스위치를 추가했다.

## 1. 결론

- 네 커밋 때문에 지속적인 대규모 비용 누수가 새로 생긴 것은 아니다.
- 다만 `18ce961`은 탭 이탈 비콘 처리마다 Firestore 트랜잭션 읽기를 최소 1회 추가한다. 누적 영상 기록을 줄어들지 않게 보존하기 위한 읽기이므로 현재는 유지하는 편이 안전하다.
- `0df37d1`은 같은 탭의 중복 퀴즈 초기화를 차단하므로 중복 `getDoc`과 트랜잭션을 줄인다.
- `c7c5e67`은 쓰기 횟수를 늘리지 않고 `quizSession` 필드를 완전 교체한다. 문서 payload는 소폭 커질 수 있지만 과금 작업 수는 동일하다.
- `7725d48`은 이미 존재하던 `learning_progress` 전체 컬렉션 리스너의 파싱 범위만 넓혔다. 이 커밋 자체의 추가 읽기는 없다.
- 가장 큰 최적화 대상은 네 커밋 이전부터 존재한 (a) `learning_progress` 전체 실시간 구독 — SpaceHome과 `useLearningHistory` 계열에서 **각각** 뜬다 —, (b) 변경이 없어도 10초마다 실행되는 영상 자동 저장, (c) history 쓰기마다 단원 history 전체를 재조회하는 `syncLearningSummary` 트리거다.

2026-09-02 운영 데이터의 개인정보 없는 집계치는 다음과 같다.

| 항목 | 문서 수 |
| --- | ---: |
| `learning_progress` | 5,917 |
| `users` | 219 |
| `learningSummaries` | 185 |
| 요약 보유자당 평균 진도 문서 | 31.98 |

현재 구조에서는 SpaceHome 화면에 전체 progress 리스너가 **2개** 뜬다(SpaceHome 자체 + AssignmentHub의 `useLearningHistory`). 요약 보유 학생이 장기 이탈 후 재진입하면 평균 약 32개가 아니라 **약 64개**의 진도 문서를 읽는다. 오프라인 캐시가 30분 이내 재연결 비용을 완화할 수 있지만, 30분 이상 단절 후 재연결은 새 쿼리처럼 과금되고 리스너 결과의 문서가 갱신될 때마다 읽기가 과금된다(문서 삭제는 과금 없음).

## 2. 커밋별 비용 판정

### `18ce961`

비용이 줄어드는 변경:

- stamp가 하나도 없는 영상 자동 저장을 건너뛴다.
- 로컬 캐시와 서버 값을 병합해 손상 복구를 위한 반복 작업 가능성을 줄인다.
- 로그인 안내 정리는 `sessionStorage` 작업이므로 Firebase 비용이 없다.

비용이 늘 수 있는 변경:

- `syncVideoProgress`가 `learning_progress`를 트랜잭션에서 읽는다. 정상 실행 기준 비콘 1회당 최소 문서 읽기 1회가 추가된다.
- MissionHub 단일 문서 리스너가 실패할 때 최대 두 번 재시도한다. 정상 상황에서는 추가 비용이 없고 장애 시에만 제한적으로 발생한다.

판정: 소폭 증가 가능. 영상 누적값의 단조 증가 보장을 위한 정당한 비용이다. 트랜잭션은 경합 시 재실행될 수 있으므로 실제 읽기가 1회를 넘을 수도 있다.

### `0df37d1`

- React 재렌더 사이의 비동기 공백에서 같은 초기화가 두 번 시작되는 것을 막는다.
- 차단된 중복 초기화마다 기존에 발생할 수 있었던 진도 문서 `getDoc` 1회와 초기화 트랜잭션 읽기/쓰기 1세트를 없앤다.

판정: 비용 절감.

### `c7c5e67`

- 기존 `transaction.set(..., { merge: true })`를 top-level `mergeFields` 기반 쓰기로 변경했다.
- 작업 횟수는 동일하며 오래된 중첩 답안 필드를 남기지 않는다.
- 초기화 시 정규화된 세션 필드를 함께 쓰므로 전송/저장 byte는 소폭 증가할 수 있으나 Firestore read/write 작업 수는 증가하지 않는다.

판정: 작업 수 기준 중립, 데이터 정합성 개선.

### `7725d48`

- `learning_progress` 전체 구독은 `592e2957`(2026-07-28)부터 존재했다.
- 새 커밋은 동일 snapshot에서 `logRead`, 영상 완료, Mission Lab 완료를 함께 해석한다.
- 쿼리, 리스너, 서버 쓰기 또는 Cloud Function 호출을 새로 추가하지 않았다.

판정: 이 커밋만 보면 비용 중립.

## 3. 현재 구조의 실제 증폭 지점

### 3.1 전체 진도 리스너는 하나가 아니라 두 계열이다

**첫 번째: SpaceHome 자체 리스너** (`src/components/Space/SpaceHome.jsx:1794-1810`). `users/{uid}/learning_progress` 컬렉션을 조건 없이 전체 구독하며, 각 문서를 `getLearningProgressCompletion`으로 `{text, video, missionLab}` 완료 boolean만 축소한다. 이 결과는 오직 한 곳(1916행 OR 병합)에서만 쓰이고, 이어보기 위치 등 다른 상태는 읽지 않는다.

**두 번째: `useLearningHistory` 훅의 리스너** (`src/hooks/useLearningHistory.js:120-130`). 같은 컬렉션을 조건 없이 전체 구독한다. 소비자는:

| 소비자 | 마운트 시점 | 구독 대상 |
| --- | --- | --- |
| `AssignmentHub` (SpaceHome 루트에 lazy 상시 마운트, SpaceHome.jsx:5553) | SpaceHome 열림 | 본인 컬렉션 전체 |
| `DailyLearningTimeline`, `AssignmentChronicle` | 타임라인 열림 | 본인 컬렉션 전체 |
| `CrewDetailView` | 크루 멤버 상세 | 멤버 컬렉션 전체 |
| `ParentDashboard` | 부모 대시보드 | 자녀 컬렉션 전체 |
| `StudentReport`, Admin 페이지 | 리포트 열림 | 대상 컬렉션 전체 |

이 훅은 "오늘" 타임라인을 그리기 위해 progress 문서의 `updatedAt`/`missionLab`/`codeTrace` 중 **오늘 범위 것**만 필요로 하지만 쿼리에 날짜 조건이 없어 전체를 읽는다. 학생이 SpaceHome에서 숙제 허브를 열면 같은 컬렉션이 리스너 2개 target으로 과금된다.

현재 비용 모델은 학생별로 다음과 같다.

```text
초기/장기 재연결 읽기 ≈ 2 × 해당 학생의 learning_progress 문서 수(P)   ← 리스너 2개
리스너 유지 중 읽기 ≈ 쿼리 결과에 속한 문서 변경 횟수(U) × 마운트된 리스너 수
총량 ≈ 2P + (마운트 수) × U
```

MissionHub에는 현재 열린 단원의 단일 문서 리스너가 별도로 있다(재시도 최대 3회). 영상 자동 저장이 활성 단원 문서를 갱신하면 다음 경로가 동시에 반응한다.

```text
10초 자동 저장 1 write
  ├─ MissionHub 단일 문서 listener: 변경 문서 1 read
  ├─ SpaceHome 전체 collection listener: 변경 문서 1 read
  └─ (AssignmentHub/타임라인 열림 시) useLearningHistory 전체 listener: 추가 1 read
```

SDK 내부 캐시가 UI 지연은 줄이지만 서로 다른 query target의 서버 변경 전달 자체를 비용 0으로 만들지는 않는다.

추가로, 퀴즈 진행 중 `SpaceQuizView`가 답안 체크포인트마다 `learning_progress.quizSession`을 트랜잭션으로 갱신한다(SpaceQuizView.jsx:705-755). 건당 읽기 1 + 쓰기 1이며, 위 리스너들이 살아 있는 동안 답안 수만큼 listener read를 반복 유발한다. 이 문서의 최적화 범위는 아니지만 리스너 제거(릴리스 B)가 이 비용도 함께 줄인다는 점은 기대 효과에 반영한다.

### 3.2 변경 없는 10초 영상 저장

한 번이라도 stamp가 생기면 재생이 멈춰 있어도 interval이 진행 문서에 `updatedAt`을 포함해 계속 쓸 수 있다(MissionHub.jsx:1761-1852). skip 조건은 "stamp 0개"뿐, pause/hidden/dirty 검사가 없다.

- 최대 6 writes/minute
- 리스너 2~3개가 유지되면 논리상 최대 12~18 listener reads/minute
- 여기에 **세 번째 쓰기 경로**가 별도로 존재한다: 탭 숨김 시 `visibilitychange` 핸들러가 또 하나의 `setDoc` 배경 저장을 즉시 실행한다(MissionHub.jsx:2284-2312). 이 핸들러도 dirty 검사 없이 위치가 0보다 크면 무조건 쓴다. interval이 백그라운드에서 스로틀되더라도 이 경로가 항상 추가 쓴다.
- `popstate`와 `beforeunload`가 같은 이탈에서 연달아 발화하면 비콘도 2회 전송될 수 있다(현재 중복 방지 없음, MissionHub.jsx:1854-1915).

`sendBeacon` 디바운싱만으로는 이 비용을 해결할 수 없다. 우선순위는 interval의 dirty-check와 세 쓰기 경로의 단일 컨트롤러 통합이다.

### 3.3 매 진입 시 요약 freshness callable

SpaceHome 진입 때 `getOrRebuildLearningSummary`가 매번 호출된다(SpaceHome.jsx:1750-1769). `requestedValidation` ref는 마운트 내 중복만 막을 뿐 재진입마다 다시 호출된다. TTL/캐시 없음. 정상 요약도 서버에서 대략 다음 작업을 수행한다.

- 요약 문서 1 read
- 최신 history 1 read
- history `count()` — 과금은 **1,000개 index entry 묶음당 read 1회(최소 1)**. history 1,000개 미만 학생은 1 read지만, 1,000개를 넘는 heavy 사용자는 2 read 이상으로 늘어난다.
- callable invocation 1회

클라이언트의 요약 문서 리스너 읽기와 별개다. 정합성 안전망으로 의미는 있지만 매 진입 검증은 과하다.

### 3.4 완료 집계의 스키마·의미 불일치

**Mission Lab 필드 불일치.** Firestore에 `missionLab`을 쓰는 유일한 경로는 `claimLumiMissionReward`이며 `isCompleted`를 쓴다(lumiRewardService.js:162). 반면 읽는 쪽은 전부 `completed`를 기대한다:

- `getLearningProgressCompletion` (learningSummaryUtils.js:31) — SpaceHome 전체 리스너의 파서
- `useLearningHistory.js:574-605` — 타임라인/리포트 계열
- SpaceHome의 history 타입 매퍼는 `python_mission`만 missionLab로 인식하고 실제 LUMI 기록 타입 `lumi_protocol`은 'unknown'으로 버린다(SpaceHome.jsx:1892-1896). 즉 오늘-history 리스너 경로로도 missionLab 완료가 표시되지 않는다.
- PythonProtocolHub 입장 카드는 SpaceHome의 병합 결과를 props로 받으므로(PythonProtocolHub.jsx:390) 위 버그의 영향이 그대로 전파된다.

**LUMI history는 요약에 집계되지 않는다.** `historyActivityType`이 `lumi_protocol`을 "other"로 분류하므로(functions/index.js:273-280) modalities·daily 활동 수에 반영되지 않는다(crystals 합산만 됨).

**video 모달리티의 실제 의미는 "완료"가 아니다.** `handleNonQuizActivityComplete`은 완료가 아닌 영상 활동('영상 학습 기록 동기화', '영상 교신 수신')도 세션 시청 시간이 1초라도 있으면 같은 일일 문서 `video_daily_{KST}_{unitId}_{txId}`에 `type:'video'`로 기록한다(SpaceHome.jsx:2818-2822, 3057-3095의 type 판정). 비콘 경로는 완료 시에만 쓰지만(functions/index.js:5437-5460) 클라이언트 종료 저장 경로가 그렇지 않다. 따라서 현재 `learningSummaries.units[].modalities.video`가 참인 조건은 "명시적 종료 저장이 있었던 임의 시청 세션 존재"이며, progress의 `completed === true`와 의미가 다르다. 기존 리스너 제거 후 이 차이를 정의하지 않으면 완료 표시의 의미가 조용히 바뀐다.

따라서 단순 리스너 삭제는 금지한다.

### 3.5 `syncLearningSummary` 트리거의 단원 전체 재조회

history 문서 하나가 쓰일 때마다 트리거가 다음을 수행한다(functions/index.js:418-491).

1. summary 문서 `get` 1회 (트랜잭션 밖)
2. 영향 단원별 `where('unitId','==',unitId)` 전체 재조회 — **그 단원의 history 문서 전체(U개) read**
3. 트랜잭션 안 summary 재조회 1회 + 쓰기 1회

즉 학습 활동 1건당 `U + 2` reads + 1 write + invocation. 한 단원에서 퀴즈 재도전을 30회 하면 그 단원의 누적 트리거 읽기는 대략 `ΣU ≈ U²/2`로 자라는, 1차 설계가 계상하지 않은 지속 증폭원이다. modalities(OR), bestScore(max), lastActivityMs(max)는 모두 단조 값이라 **신규 생성(write create)은 재조회 없이 증분 계산이 가능하다**. 갱신/삭제(드묾)만 재조회 폴백이 필요하다. §4.7에서 채택.

### 3.6 완료 history 중복 기록은 비콘만의 문제가 아니다

video 완료 history 문서 ID는 날짜를 포함한다(`video_daily_{KST날짜}_{unitId}_{txId}`). 같은 날의 중복 비콘/중복 종료 저장은 같은 문서에 merge되어 자연 멱등이지만, **이미 완료된 영상을 다른 날 다시 시청하고 종료하면 새 문서가 만들어진다**:

- 비콘 경로: `progressData.completed === true`이면 무조건 그날의 history를 쓴다(functions/index.js:5440-5460). 완료 여부 판정에 이전 기록을 보지 않는다.
- 클라이언트 종료 저장 경로: `wasAlreadyCompleted`는 **보상만** 차단하고(SpaceHome.jsx:2833-2840) history 기록은 차단하지 않는다. '영상 교신 완료' 활동이면 그날의 `video_daily_` 문서가 계속 생긴다.

영향: daily `videos` 카운트와 `totalHistoryCount`가 재시청일마다 증가 → 일일 학습 통계 부풀림. 단, 재시청일에 실제 시청 시간이 있었다면 그날의 활동 기록 자체는 타임라인상 의미가 있으므로(종료 저장의 sync-only 경로가 세션 시청 시간과 함께 같은 문서를 쓴다), 게이트가 막아야 할 대상은 "새로운 시청 활동이 없는데 완료 플래그 재전송만으로 생기는 기록"으로 한정하는 것이 맞다. §4.3에서 이 의미로 정의한다.

## 4. 채택 설계

### 4.1 목표 상태

```text
history / learning_progress 완료 이벤트
               │
               ▼
    learningSummaries/{uid} (server-managed)
      units[].modalities = {
        quiz, workbook, video, text, codeTrace, missionLab
      }
               │
               ▼
  SpaceHome / PythonProtocolHub: 기존 단일 문서 listener만 사용
  useLearningHistory: "오늘" 활성 진도만 보는 날짜 필터 쿼리로 축소
  MissionHub: 현재 열어 둔 단원 문서 하나만 구독 (현행 유지)
```

SpaceHome은 `learning_progress` 전체 컬렉션을 더 이상 구독하지 않는다. `useLearningHistory`의 무필터 리스너도 날짜 필터 쿼리로 대체한다(§4.8). 이 둘을 함께 처리해야 진입 읽기 `2P → 0`(완료 상태는 summary 1문서)가 성립한다.

### 4.2 요약 스키마 v3 — 완료 의미론을 먼저 확정한다

`LEARNING_SUMMARY_SCHEMA_VERSION`을 3으로 올리고 각 단원에 여섯 완료 모달리티를 저장한다. 단, 모달리티별 의미를 명시적으로 고정한다.

| 모달리티 | v3 의미 | 근거 |
| --- | --- | --- |
| `quiz`, `workbook` | **이력 존재**(시도 있음, 현행 유지) | 현재 SpaceHome 배지가 시도 기반이며 점수는 별도 필드 |
| `text` | 완료 (`type:'text'` history는 완료 시에만 기록됨) | `logRead === true`와 동치 |
| `video` | **완료** (신규 기록부터). 단, 이관 시 기존 "시청 세션 존재" true는 OR 보존 | §3.4의 의미 불일치 해소 |
| `codeTrace` | 이력 존재 (현행 유지) | |
| `missionLab` | 완료 | 아래 판정 |

완료 판정은 다음과 같이 제한한다.

- `text`: `logRead === true`
- `video`: 하나 이상의 `videoProgress.*.completed === true` (이관 소스), 신규 기록은 history의 `completionModalities.video` (§4.3)
- `missionLab`: 아래 중 하나
  - `missionLab.isCompleted === true` **또는** `missionLab.completed === true` (리더 통일, §4.8)
  - 유효한 total이 1 이상이고 completed count가 total 이상
- quiz/workbook score는 history에서만 계산한다.
- progress fallback은 완료 boolean만 보강하며 점수, daily 통계, streak, 보상 또는 활동일을 생성하지 않는다.

완료 모달리티는 단조 증가 데이터로 취급한다. incremental summary 갱신 시 새 history 계산 결과와 기존 요약의 완료 boolean을 OR 병합한다. 운영자가 의도적으로 진도를 초기화하는 기능은 일반 history 삭제와 분리된 전용 reset 경로에서 처리한다(이 경로만 요약 완료 boolean을 내릴 수 있다).

`buildUnitLearningSummary` v3는 video/missionLab 모달리티를 문서의 `completionModalities` 필드에서 읽고, 그 필드가 없는 레거시 행은 종래대로 "행 존재"로 판정한다(레거시 true는 OR 보존, 하향 없음). 이 규칙이 "기존 트리거 유지"와 4.2의 완료 정의를 양립시키는 유일한 지점이다.

### 4.3 신규 완료의 원자성 — `completionModalities` 단일 메커니즘

video와 missionLab 완료를 같은 마커 메커니즘으로 통일한다. 별도 Cloud Function도, 별도 write도 추가하지 않는다.

- 데이터 로그: 현재처럼 progress(`logRead`)와 `type:'text'` history를 한 트랜잭션에 기록한다. `type:'text'`는 완료 시에만 쓰이므로 마커 불필요.
- 영상 정상 완료(클라이언트 종료 저장): progress(`completed`, `completionBonusGiven`)와 `type:'video'` history를 한 트랜잭션에 기록하되, history 문서에 `completionModalities.video: true`를 함께 쓴다. 트랜잭션에서 fresh progress의 `videoProgress.{txId}.completionHistorySynced`를 읽어 이미 true면 **완료 history 작성과 마커 갱신을 건너뛴다**(§3.6의 클라이언트 경로 게이트). sync-only/interval 활동 기록은 세션 시청 시간이 있는 한 현행대로 그날의 문서에 남긴다(타임라인 보존).
- 영상 이탈 비콘: 기존 progress read를 유지하고 `completionHistorySynced`를 같은 트랜잭션에서 확인/기록한다. false일 때만 완료 history(`completionModalities.video: true` 포함)를 쓰고 마커를 true로 올린다. 게이트가 막는 대상은 "새 시청 활동 없는 완료 재전송"이며, 그날 실제 시청 기록은 클라이언트 경로가 이미 남긴다.
- Mission Lab: 마지막 미션 완료 시 기존 `lumi_protocol` history 문서에 `completionModalities.missionLab: true`를 같은 보상 트랜잭션에 기록한다(lumiRewardService.js:199-224 위치).
  - **의존성 명시**: 이 마커의 운반체는 history 문서이며, history 기록 자체가 `LUMI_REWARD_FLAGS.DAILY_RECORD_ENABLED`(현재 true, lumiRewardPolicy.js:15)에 제어된다. 이 플래그를 끄면 missionLab 완료가 summary에 도달할 방법이 사라진다. 따라서 v3 배포 후 이 플래그는 요약 정합성의 선행 조건으로 취급하고, 끄어야 하는 경우 progress 문서의 `missionLab.historySynced` 마커로 운반체를 옮기는 변경을 동반한다.

`syncLearningSummary`는 기존 history trigger를 그대로 사용하되 `completionModalities`를 인식한다. `learning_progress`의 모든 10초 저장에 반응하는 새 Cloud Function trigger는 만들지 않는다. 그런 trigger는 영상 저장마다 invocation과 summary write를 추가하고 단일 요약 문서를 hot spot으로 만들기 때문이다.

### 4.4 기존 데이터 이관

리스너 제거 전에 resumable/idempotent 관리 스크립트를 실행한다.

**배포 순서 위험(신규): 스크립트 실행 전에 v3 함수를 먼저 배포한다.** 배포된 트리거의 `LEARNING_SUMMARY_SCHEMA_VERSION`이 여전히 2인 상태에서 이관이 완료된 사용자가 history를 쓰면, 트리거가 schemaVersion 불일치를 보고 v2 빌더로 전체 rebuild를 돌려 **이관 결과를 다운그레이드**한다. 이관 창 동안 사용자 활동으로 인한 경합은 OR 병합이 멱등하므로(단조 증가) v3 트리거 배포 후에는 안전하다.

절차:

1. v3 함수(빌더·트리거·callable) 배포 및 스테이징 검증.
2. dry-run으로 `learning_progress`를 projection 조회한다.
3. 사용자별 완료 boolean만 계산한다. 이때 리더 규칙은 §4.2(`isCompleted || completed`)와 동일해야 한다.
4. 기존 summary를 읽어 `units[].modalities`에 OR 병합하고 schemaVersion 3으로 갱신한다.
5. 점수, daily, stats, timestamp는 변경하지 않는다.
6. **`completionHistorySynced` 백fill(신규)**: progress의 `videoProgress.{txId}.completed === true`인 항목에 마커 `true`를 함께 기록한다. 이걸 빼면 릴리스 C 직후, 과거에 완료한 영상을 다시 연 뒤 탭을 닫는 학생이 마커 부재로 완료 history를 한 번 더 만든다(§3.6). 같은 이유로 missionLab도 완료 상태 이관 시 `lumi_protocol` history에 마커를 소급 기록하거나, rebuild가 progress로부터 `modalities.missionLab`을 보강하므로 최소한 summary 이관만은 누락 없이 수행한다.
7. 적용 모드는 cursor/checkpoint를 남기고 BulkWriter로 제한된 동시성으로 처리한다.
8. 두 번째 dry-run에서 progress 완료와 summary 완료의 mismatch가 0인지 확인한다.

현재 규모의 일회성 이관 비용은 대략 progress 5,917 reads + summary 최대 185 reads/writes (+ 마커 백fill writes, 완료 tx 수에 비례하나 문서 수 증가는 없음 — 같은 문서 merge). 전체 리스너는 사용자들이 한 번씩 장기 재진입하는 것만으로도 약 5,917 reads(리스너 2개 계열이면 그 이상)가 재발할 수 있으므로, 이관은 평균적으로 한 번의 전체 사용자 진입 주기 내에 손익분기한다.

향후 드문 full rebuild는 history와 해당 사용자의 progress를 함께 읽어 v3를 재생성한다(§4.2의 완료 판정 포함). rebuild당 progress reads + P가 추가되는 점은 TTL 완화(§4.6)의 근거와 함께 감안한다. 정상적인 incremental 갱신은 기존 history trigger만 사용한다.

구현 노트: 이관 스크립트는 `functions/index.js`의 `buildLearningSummary`/빌더를 export해 재사용한다(스크립트와 요약기의 로직 분기 방지). `functions/*.test.cjs` 패턴으로 빌더 단위 테스트를 먼저 붙인다.

### 4.5 영상 저장 제어기 — 세 쓰기 경로를 하나로

서버 저장을 단순 interval이 아니라 dirty 기반 flush로 바꾼다. 현재 존재하는 **세 경로**(10초 interval, visibilitychange hidden 즉시 저장, 종료 저장/비콘)를 전부 이 컨트롤러로 통합한다. 통합 없이 interval만 고치면 hidden 시 setDoc이 여전히 별도로 발생한다(§3.2).

- 유효한 재생 진행이 생길 때만 `dirtySequence` 증가
- 재생 중 dirty 상태에서 최대 30초에 한 번 trailing flush
- pause, visibility hidden, 단원 나가기, 완료 시 즉시 flush — **dirty일 때만**. 기존 visibilitychange 핸들러의 무조건 setDoc은 제거하고 flush 1회로 대체
- 저장 중에는 동시 flush를 합치고, 성공한 sequence까지만 clean 처리
- 변경이 없으면 Firestore write 0
- 로컬 캐시는 5~10초 간격으로 유지하여 비정상 종료 시 복구
- unload beacon은 동일 navigation에서 한 번만 전송(`beforeunload`/`popstate`/`pagehide`를 하나의 sent 플래그로 멱등 처리)하고, 마지막 서버 저장 fingerprint와 동일하면 생략
- **`pagehide` 추가 등록(신규)**: 현재 비콘은 `beforeunload`+`popstate`뿐이며(MissionHub.jsx:1907-1908) iOS Safari 등 모바일은 `beforeunload`를 신뢰성 있게 발화하지 않는다. `pagehide`는 모바일에서 가장 신뢰할 수 있는 이탈 시그널이다.
- **idToken 만료(신규 주의)**: 비콘 payload의 idToken은 5분 주기 갱신이지만 장시간 백그라운드 탭에서는 1시간 토큰이 만료될 수 있고, 만료 시 서버가 403으로 거부한다. 손실은 치명적이지 않다 — localStorage 캐시의 stamp가 다음 진입 시 `mergeCumulativeVideoProgress`로 복구되어 이후 저장에서 서버로 반영되기 때문이다. 다만 `visibilitychange → visible` 시점에 토큰을 선제 갱신하면 이 창을 줄일 수 있다(선택).

이 설계는 재생 중 최대 쓰기를 6회/분에서 2회/분 이하로 낮추고, 일시정지 상태를 0회/분으로 만든다. 단원 완료 때만 저장하는 완전 local-first 방식은 모바일 브라우저의 unload 비신뢰성과 데이터 손실 범위가 커서 채택하지 않는다.

멀티탭 안전성: 같은 영상을 두 탭에서 재생해도 stamp/누적시간은 서버가 max/union으로 clamp하므로(기존 로직 유지) flush 경합은 데이터를 훼손하지 않는다. dirty sequence는 탭별 로컬 값으로만 쓴다.

### 4.6 요약 freshness 검증 완화

- summary가 없거나 schemaVersion이 다르면 즉시 callable 실행
- 정상 v3 summary는 기기별 24시간 TTL 안에서는 callable 생략 (uid별 키로 저장; 스토리지 삭제 시 그냥 재호출될 뿐이다)
- TTL 경과 시에만 freshness 검증
- 서버는 summary `updatedAt`이 충분히 최근이면 count/latest query 없이 빠르게 반환 — 다만 이 fast path는 count 불일치(누락된 트리거)를 그날은 발견하지 못한다. 트리거가 at-least-once이므로 누락은 드물고, 다음 TTL 만료 때 잡힌다. 이 트레이드오프를 감수한다.
- 최근 당일 history listener는 기존처럼 UI의 짧은 trigger 지연을 보정
- 전체 주기 rebuild를 자동으로 돌리지 않고, mismatch 감사 도구를 관리자용으로 제공

### 4.7 `syncLearningSummary` 트리거 증분 최적화 (신규)

§3.5의 단원 전체 재조회를 없앤다.

- **create**(신규 history 문서 — 압도적 다수): 재조회 없이 증분 적용. modalities는 OR, bestScore는 max, lastActivityMs는 max, cluster/region/chapter는 timestamp가 갱신될 때만 교체. `completionModalities`가 있으면 그것을 우선 반영(§4.2). 모두 단조 연산이라 트리거 재시도·중복 발화에도 멱등하다.
- **update/delete**(드묾 — 관리자 수정·삭제): 기존처럼 단원 재조회 폴백. delete는 daily/stats를 -1로 되돌리는 기존 경로 유지.
- 트리거 밖 summary `get`을 트랜잭션 첫 읽기로 합쳐 건당 읽기를 1회 줄인다(schemaVersion 불일치 시에만 트랜잭션을 중단하고 rebuild 경로로 빠진다).

효과: 활동 1건당 트리거 비용 `U + 2` reads → **약 2 reads + 1 write**. 퀴즈 재도전이 많은 단원에서 누적 절감이 크다. 단조 필드 외 값(stats, daily)은 기존 delta 계산을 그대로 쓰므로 정합성 규칙의 변경은 없다.

### 4.8 리스너 축소와 missionLab 리더 통일 (신규)

Release B에서 SpaceHome 리스너 제거와 함께 반드시 수행한다. 이걸 빼면 절감 효과가 AssignmentHub/타임라인/부모 대시보드에서 새어 나간다(§3.1).

1. **`missionLab` 리더 통일(즉시 선행 배포 가능)**: `isCompleted || completed`를 허용하도록 `learningSummaryUtils.getLearningProgressCompletion`, `useLearningHistory`(574-605), SpaceHome 타입 매퍼에 `lumi_protocol` → missionLab 매핑을 추가한다. 3~4줄 변경이며 릴리스 A에 포함해 리스너 제거와 무관하게 현재 완료 표시 버그를 먼저 고친다.
2. **`useLearningHistory`의 progress 구독 축소**: 무필터 전체 구독을 `where('updatedAt', '>=', 당일 시작)` 쿼리로 바꾼다. 단일 필드 범위 쿼리라 복합 색인 불필요(자동 색인), 당일 touched 문서만 읽는다(보통 0~2개). 이 훅은 "오늘" 타임라인용이므로 전일 완료 상태는 summary/오늘-history에서 온다. in-progress 세션 표시에 전일 데이터가 필요하면 `>= 전날`로 하루 여유를 준다.
3. **ParentDashboard/CrewDetailView**: 같은 훅을 쓰므로 2의 효과를 그대로 받는다(자녀/멤버 컬렉션 전체 읽기 제거).
4. **킬스위치**: SpaceHome 리스너 제거는 원격 플래그(예: `spaceProgressListenerEnabled`, 기본 false)로 감싸 배포 없이 재활성화 가능하게 한다. 요약 mismatch 제보 시 1분 내 롤백 경로 확보.

## 5. 배포 순서

### 릴리스 A: 기반 및 이관

- `missionLab` 리더 통일 + `lumi_protocol` 타입 매핑 (§4.8-1, 즉시 효과)
- summary v3 builder와 테스트 추가 (빌더 export 및 `.test.cjs` 활용)
- `completionModalities` 마커 추가(video 클라이언트/비콘, missionLab)
- incremental summary의 단조 OR 병합 및 `completionModalities` 인식
- rebuild가 progress 완료를 보강하도록 수정
- §4.7 트리거 증분 최적화 (독립 배포 가능, 먼저 나가도 무방)
- **v3 함수 배포 후** 이관 스크립트 dry-run 및 적용(마커 백fill 포함, §4.4)
- 이 단계에서는 전체 progress 리스너를 안전망으로 유지

### 릴리스 B: 읽기 제거

- 전체 사용자 mismatch 0 확인
- 제보 학생, 영상 복구 학생, Mission Lab 완료 계정 표본 검증
- SpaceHome의 `learning_progress` collection listener 제거(킬스위치 플래그와 함께)
- `useLearningHistory` progress 구독의 날짜 필터 전환(§4.8-2)
- 기존 summary listener만 사용
- freshness callable TTL 적용
- 롤백 기준: 완료 표시 회귀 제보가 표본 검증 범위를 넘으면 킬스위치로 리스너 복구 후 원인 분석

### 릴리스 C: 영상 쓰기/비콘 최적화

- dirty flush 컨트롤러 적용 — interval + visibilitychange + 종료 저장 3경로 통합(§4.5)
- `completionHistorySynced` beacon/클라이언트 양쪽 게이트 적용
- `pagehide` 등록 및 비콘 멱등 플래그
- 네트워크 단절, pause, hidden, popstate, beforeunload, pagehide, 멀티탭 회귀 테스트

## 6. 승인 기준

정합성:

- progress 완료와 summary 완료 mismatch 0
- 기존 best quiz/workbook score 변화 0
- daily/streak/reward 합계 변화 0 (재시청일의 완료 history 중복 제거로 daily videos 카운트는 **감소만 허용**, 증가 불가)
- 데이터 로그·영상·Mission Lab 완료 표시 회귀 0 (`isCompleted` 계정 포함)
- 퀴즈 다중 탭 및 Dark Matter 배치 테스트 통과
- 트리거 증분 경로에서 기존 재조회 경로와 동일한 units 결과 (property 기반 비교 테스트)

비용/성능:

- SpaceHome 진입 시 `learning_progress` query target 0 (AssignmentHub 마운트 상태 포함)
- SpaceHome 완료 상태용 Firestore read는 기존 summary 문서 1개로 통합
- ParentDashboard/CrewDetailView의 전체 progress 읽기 0
- history 쓰기 1건당 트리거 문서 reads 2 이하 (create 경로)
- 영상 pause 60초 동안 progress write 0
- 연속 재생 60초 동안 progress write 2회 이하
- 탭 hidden 전환 시 추가 write는 dirty 상태에서만 1회
- 동일 이탈에서 `syncVideoProgress` 호출 1회 이하
- 완료된 영상의 history completion write는 마커당 정확히 1회

운영 관찰:

- Firestore document reads/writes 일별 추이 (릴리스별 before/after)
- `syncVideoProgress`, `syncLearningSummary`, `getOrRebuildLearningSummary` 호출 수와 오류율
- summary mismatch 감사 결과
- 영상 이어보기 복구 실패 및 완료 표시 고객 제보

## 7. 채택하지 않는 안

- 모든 `learning_progress` write를 트리거로 summary를 갱신: 10초 영상 저장마다 Function과 summary write가 추가되므로 비용이 증가한다.
- 리스너만 즉시 삭제: 기존 누락 완료, Mission Lab 스키마 불일치, video 모달리티 의미 차이(§3.4) 때문에 정합성이 깨진다.
- SpaceHome 리스너만 삭제: `useLearningHistory` 계열 리스너가 남아 AssignmentHub·부모 대시보드에서 같은 비용이 지속된다(§3.1).
- 퀴즈/워크북을 완료 시에만 서버 저장: 브라우저 종료와 모바일 background에서 중간 답안 손실 위험이 커진다.
- 현재 `syncVideoProgress`의 progress read 즉시 제거: max/union 단조 보장이 사라져 이전 영상 기록이 다시 감소할 수 있다.
- `completionHistorySynced`를 비콘에만 적용: 클라이언트 종료 저장 경로의 날짜별 중복(§3.6)이 남는다.

## 8. 근거 문서

- Firestore billing/listener: https://firebase.google.com/docs/firestore/pricing
  - listener는 결과 집합에 문서가 추가/갱신될 때마다 read 1회 과금(삭제는 무과금)
  - persistence 활성 시 30분 이상 단절 후 재연결은 새 쿼리처럼 과금
  - `count()` 등 aggregation은 읽은 index entry 1,000개 묶음당 read 1회(최소 1)
- Firestore transaction 재실행: https://firebase.google.com/docs/firestore/manage-data/transactions
- write-time aggregation 비용/제약: https://firebase.google.com/docs/firestore/solutions/aggregation
- Firestore trigger at-least-once/idempotency: https://firebase.google.com/docs/functions/firestore-events

## 부록: 코드 근거 (2026-09-02 기준)

| 주장 | 위치 |
| --- | --- |
| SpaceHome 전체 progress 리스너 | `src/components/Space/SpaceHome.jsx:1794-1810` |
| SpaceHome summary 리스너 + 진입마다 callable | `src/components/Space/SpaceHome.jsx:1750-1769` |
| progress 완료 OR 병합 | `src/components/Space/SpaceHome.jsx:1916`, `src/utils/learningSummaryUtils.js:35-47` |
| `python_mission`만 인식하는 타입 매퍼 | `src/components/Space/SpaceHome.jsx:1892-1896` |
| `missionLab.completed` 읽기(불일치) | `src/utils/learningSummaryUtils.js:31`, `src/hooks/useLearningHistory.js:574-605` |
| `missionLab.isCompleted` 쓰기(유일한 writer) | `src/services/lumiRewardService.js:146-168` |
| LUMI history 기록 게이트 | `src/services/lumiRewardService.js:43-46, 199-224`, `src/services/lumiRewardPolicy.js:15` |
| useLearningHistory 무필터 progress 리스너 | `src/hooks/useLearningHistory.js:120-130` |
| AssignmentHub의 SpaceHome 루트 마운트 | `src/components/Space/SpaceHome.jsx:5553`, `src/components/Space/AssignmentHub.jsx:1297` |
| 영상 10초 자동 저장(interval) | `src/components/Space/MissionHub.jsx:1761-1852` |
| visibilitychange hidden 즉시 저장(3번째 경로) | `src/components/Space/MissionHub.jsx:2284-2312` |
| unload 비콘(beforeunload+popstate, 중복 방지 없음) | `src/components/Space/MissionHub.jsx:1854-1915` |
| 종료 저장의 완료/보상 처리 순서 | `src/components/Space/MissionHub.jsx:2739-2936` |
| 완료 아닌 video history 기록(type 판정) | `src/components/Space/SpaceHome.jsx:2818-2822, 3057-3095` |
| 퀴즈 세션 체크포인트 트랜잭션 | `src/components/Space/SpaceQuizView.jsx:705-755` |
| summary 빌더(v2, 5모달리티) | `functions/index.js:262-338` |
| freshness callable(count 기준) | `functions/index.js:396-416` |
| history 트리거(단원 전체 재조회) | `functions/index.js:418-491` (재조회 434-437) |
| 비콘 수신 엔드포인트(완료 history, 클램프) | `functions/index.js:5365-5469` |
