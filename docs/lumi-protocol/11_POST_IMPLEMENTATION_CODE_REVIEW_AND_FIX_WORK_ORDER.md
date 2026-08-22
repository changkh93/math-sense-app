# LUMI Protocol 일일 기록·광석·과제 피드백 구현 후 코드 리뷰 및 수정 작업지시서

- 작성일: 2026-08-22
- 상태: 수정 필요 — LUMI 광석 보상과 과제 피드백 반영은 출시 보류
- 대상 구현: `10_DAILY_RECORD_REWARD_AND_ASSIGNMENT_FEEDBACK_SPEC.md` 후속 구현
- 원칙: 기존 UI/커리큘럼을 다시 설계하지 말고, 경제 무결성·과정 격리·집계 정확성·비용만 바로잡는다.

## 1. 리뷰 결론

현재 구현은 다음 뼈대는 갖추었다.

- LUMI 미션 카탈로그에 보상 정책이 연결되어 있다.
- 완료 시 progress/history/광석 원장을 함께 쓰려는 transaction이 있다.
- 일일 기록과 Python 과제 피드백에 LUMI 필드가 추가되었다.
- 비-Python 과정에서 CODE TRACE/LUMI 배열을 비우려는 필터가 추가되었다.

그러나 다음 출시 차단 결함이 남아 있다.

1. 동일 미션을 별칭 또는 호출자 지정 과정 ID로 여러 번 보상받을 수 있다.
2. 보상 시각·과정·단원·총 미션 수를 클라이언트가 결정하며, 잔고도 클라이언트가 직접 쓴다.
3. 기존 완료자 마이그레이션과 보상 적용일, 보상 feature flag가 없다.
4. 비-Python 과제의 실제 AI 프롬프트에 CODE TRACE 지침이 항상 포함되고, Python 전용 활동 수가 `allActivityCount`로 남는다.
5. 일일 LUMI 통계가 `undefined`에서 증가되어 `NaN`이 된다.
6. 통과한 Phase 8/9 테스트는 실제 transaction과 실제 과정 필터를 검증하지 않는다.

따라서 **광석 보상과 과제 피드백 반영 feature flag는 아래 P0 완료 전까지 켜지 않는다.** 일일 기록도 P1 집계 수정 후 공개한다.

## 2. 리뷰에서 확인한 재현 근거

### 2.1 동일 미션 별칭으로 원장 키가 달라짐

현재 카탈로그는 `VS-01`과 `lumi-vs-01`을 같은 미션으로 반환하지만 원장 ID는 입력 문자열을 그대로 사용한다.

```text
input=VS-01       canonical=lumi-vs-01 tx=lumi_mission_lumi-season-1_VS-01_reward-v1
input=lumi-vs-01  canonical=lumi-vs-01 tx=lumi_mission_lumi-season-1_lumi-vs-01_reward-v1
```

관련 코드:

- `src/services/lumiRewardService.js:32-48`
- `src/services/lumiRewardService.js:211-212`

### 2.2 현재 테스트는 모두 통과하지만 핵심 계약을 검증하지 않음

실행 결과:

```text
node scripts/test-phase8-lumi-rewards-ledger.mjs  -> PASS
node scripts/test-phase9-course-isolation-matrix.mjs -> PASS
git diff --check -> PASS
```

그러나 Phase 8은 실제 `runTransaction`을 호출하지 않고 보상 계산과 ID 문자열만 검사한다. Phase 9는 운영 helper를 import하지 않고 테스트 파일 안에 `isPythonExclusiveActivity`와 `belongsToCourse`를 다시 작성한다. 비-Python 사례도 이미 LUMI/CODE TRACE가 0인 수동 context를 fallback에 넘길 뿐, 혼합 원시 데이터를 운영 요약기에 통과시키지 않는다.

관련 코드:

- `scripts/test-phase8-lumi-rewards-ledger.mjs:1-123`
- `scripts/test-phase9-course-isolation-matrix.mjs:6-32`
- `scripts/test-phase9-course-isolation-matrix.mjs:156-200`

## 3. P0 — 출시 차단 수정

### P0-01. 보상 경계를 서버 권한으로 이동하고 요청값을 최소화

#### 문제

`claimLumiMissionReward`가 다음 값을 호출자에게서 받는다.

- `userId`
- `unitId`, `unitTitle`
- `lumiCourseId`
- `missionSetId`, `missionSetVersion`
- `totalMissionCount`
- `stars`, `assistanceLevel`

보상 키에 호출자 지정 `lumiCourseId`와 원본 `missionId`가 들어간다. 같은 미션도 course ID나 별칭을 바꾸면 새 원장이 된다. `totalMissionCount=1`처럼 보내면 완료 상태도 조작할 수 있다. 배율은 클라이언트 현재 시각으로 계산되어 기기 시각 변경에도 취약하다.

Firestore 규칙도 본인 사용자 문서의 `crystals`와 일반 하위 컬렉션 쓰기를 허용한다.

- `firestore.rules:70-94`
- `firestore.rules:123-130`
- `firestore.rules:488-520`

#### 필수 변경

1. `claimLumiMissionRewardV1` callable 또는 동등한 서버 권한 경계를 만든다.
2. 요청은 원칙적으로 `missionId`와 최소 완료 증거만 받는다. `userId`는 `context.auth.uid`에서 얻는다.
3. 서버 카탈로그에서 다음 값을 확정한다.
   - canonical mission ID
   - course/unit/mission-set ID와 version
   - total mission count
   - tier/base crystals/policy version
4. `VS-01` 같은 별칭은 즉시 canonical ID로 변환한 뒤 모든 키와 저장 필드에 canonical ID만 쓴다.
5. 배율은 서버 시각으로 계산한다. 요청 timestamp는 무시한다.
6. 등록되지 않은 보상 설정은 기본 4/8로 추정 지급하지 말고 fail closed 한다.
7. 사용자 문서가 없으면 transaction 전체를 실패시킨다. progress/history/ledger만 남기는 phantom success를 금지한다.
8. App Check와 인증을 적용하고, 서버 로그에 claim 결과와 거절 사유를 구조화해 남긴다.
9. LUMI용 서버 원장/청구 컬렉션은 클라이언트 write를 금지한다.
10. 기존 클라이언트 경제 흐름을 조사하지 않은 채 `crystals` 전역 쓰기를 갑자기 막아 다른 학습을 깨뜨리지 않는다. 전역 보호는 별도 경제 마이그레이션 계획으로 진행하되, LUMI 신규 지급만큼은 서버 경계 밖에서 활성화하지 않는다.

#### 비용 원칙

- callable은 성공 가능성이 있는 최초 완료 전이에만 호출한다. RUN/실패/재생마다 호출하지 않는다.
- UI의 `isFirstMissionClear`는 불필요 호출을 줄이는 힌트로만 쓰고, 멱등성은 서버 원장이 보장한다.
- 하나의 transaction에서 잔고·통계·progress·history·ledger를 끝낸다. 별도 후속 write를 추가하지 않는다.

#### 완료 조건

- `VS-01`과 `lumi-vs-01`을 순서대로 청구해도 총 지급은 1회다.
- 임의 `lumiCourseId`, `unitId`, `totalMissionCount`, client timestamp를 보내도 저장 결과와 금액이 변하지 않는다.
- 같은 요청 20개를 병렬 실행해도 ledger 1개, history 1개, 잔고 증가 1회다.
- 사용자 문서가 없으면 아무 문서도 생성되지 않는다.

### P0-02. 보상 적용일·레거시 완료자·feature flag 복구

#### 문제

기존 완료 미션을 `legacyRewardIneligibleMissionIds`로 옮기는 마이그레이션과 `effectiveAt` 검사가 없다. UI는 로컬에서 이미 완료한 미션도 reward service를 호출하며, 과거 완료자에게 ledger가 없으면 재실행으로 신규 보상을 받을 수 있다.

- `src/components/PythonWorld/PythonMissionLab.jsx:316-371`
- `src/services/lumiRewardService.js:63-88`

보상 전용 feature flag도 확인되지 않았다.

#### 필수 변경

1. 보상 정책에 `effectiveAt`을 추가한다.
2. 배포 전 dry-run으로 기존 `completedMissionIds`를 조사한다.
3. 기존 완료 ID는 `legacyRewardIneligibleMissionIds` 또는 서버 마이그레이션 원장으로 표시한다.
4. 과거 완료일을 확정할 수 없는 기록은 소급 지급하지 않는다.
5. 다음 flag를 분리한다.
   - 일일 기록 표시
   - LUMI 광석 지급
   - 과제 피드백 LUMI 반영
6. 기본값은 모두 off로 두고 일일 기록 → 보상 → 과제 피드백 순으로 연다.
7. ACT 1 보상은 Vertical Slice 10개와 별도 상품 결정으로 승인받는다. 현재처럼 카탈로그에 넣었다는 이유만으로 자동 지급하지 않는다.

### P0-03. 비-Python 모델 입력에서 Python 전용 문맥을 물리적으로 제거

#### 문제

운영 요약기는 비-Python 과정의 LUMI/CODE TRACE 배열을 비우려 하지만 다음 우회 경로가 남는다.

1. `allActivityCount`가 필터 전 `allRows.length`/`allItems.length`라 같은 날 Python 전용 활동 수가 비-Python 평가 근거에 들어간다.
2. `buildEvidence`가 이 값을 “다른 과정 기록 N건”으로 모델에 전달한다.
3. `zcodeApiService`의 실제 AI 프롬프트는 과제 과정과 관계없이 CODE TRACE 지침과 문자열을 항상 포함한다.
4. local fallback은 course guard 없이 LUMI/CODE TRACE count가 있으면 바로 문구를 만든다.
5. Phase 9 테스트는 이미 정제된 context만 넘겨 실제 누출을 검증하지 않는다.

관련 코드:

- `src/services/assignmentFeedbackService.js:652-715`
- `src/services/assignmentFeedbackService.js:931-952`
- `src/services/assignmentFeedbackService.js:1220-1249`
- `src/services/zcodeApiService.js:99-119`
- `src/services/zcodeApiService.js:166-167`
- `scripts/export-pending-assignment-contexts.mjs:817-894`
- `src/components/Admin/AdminAssignmentDetail.jsx:250-275`

#### 필수 변경

1. `sanitizeLearningSummaryForCourse` 같은 단일 순수 함수를 만든다.
2. 비-Python 과정에서는 다음 필드를 모델 DTO에서 **삭제**한다. 0/빈 배열을 남기는 것보다 삭제를 우선한다.
   - CODE TRACE/LUMI count, title, 배열, progress, crystals, mission/core 관련 필드
3. 비-Python용 `allActivityCount`에서도 Python 전용 활동을 제외한다.
4. 필요하다면 `excludedPythonExclusiveActivityCount`는 운영 진단 전용 별도 필드로만 보관하고 AI prompt/evidence/fallback/학생·학부모 문구에는 전달하지 않는다.
5. 모델 프롬프트를 공통 규칙과 과정별 규칙으로 분리한다. Python 과제에서만 CODE TRACE/LUMI 규칙 블록을 붙인다.
6. local fallback도 `courseId === 'python'`일 때만 CODE TRACE/LUMI 문구를 만들도록 방어한다.
7. Admin UI도 저장된 오래된 context에 Python 필드가 있어도 비-Python 과제에서는 렌더링하지 않는다.
8. 수동 export와 웹 서비스가 동일한 분류·정제 함수를 사용하게 한다. 복사 구현을 두지 않는다.

#### 완료 조건

혼합 원시 데이터에 초등수학 1건, CODE TRACE 1건, LUMI 1건을 넣고 실제 최종 prompt 문자열을 캡처한다.

- 초등/중등/고전 prompt와 fallback 결과에 `CODE TRACE`, `LUMI`, `루미`, `코어`, LUMI 미션명, Python 광석이 한 번도 없어야 한다.
- 위 활동 2건이 `activityCount`, `allActivityCount`, evidence, rubric, bonus 제안에 영향을 주지 않아야 한다.
- Python 과제에는 두 활동이 별도 실습 근거로 남아야 한다.
- 초등수학의 허용된 middle-math 레벨업 예외는 유지되어야 한다.

## 4. P1 — 기능 정확성 수정

### P1-01. 일일 LUMI 통계 `NaN` 수정

`dailyStats` React 초기값에는 LUMI 필드가 있지만 실제 집계용 `stats` 객체에는 없다. 이후 `undefined++`, `undefined + amount`가 실행된다.

- 초기 상태: `src/hooks/useLearningHistory.js:33-45`
- 누락된 집계 객체: `src/hooks/useLearningHistory.js:155-182`
- 증가 지점: `src/hooks/useLearningHistory.js:248-260`, `src/hooks/useLearningHistory.js:570-572`

집계 객체에도 네 필드를 0으로 초기화하고, 반환 전 모든 count/reward가 `Number.isFinite`인지 검증한다.

필수 테스트:

- history 완료 2건 → 완료 2, 미션 2, 광석 합계 정확
- progress만 1건 → 진행 1
- LUMI 없음 → 모두 0
- 모든 값이 finite이며 `NaN`이 아님

### P1-02. 로컬 완료와 서버 보상 실패의 분리 상태 복구

현재 UI는 먼저 로컬 progress와 축하 상태를 완료 처리한 뒤 reward transaction을 호출한다. service는 오류를 throw하지 않고 `{ rewarded:false, error }`로 반환하며 UI는 이 결과를 검사하지 않는다.

- `src/components/PythonWorld/PythonMissionLab.jsx:325-371`
- `src/services/lumiRewardService.js:194-204`

필수 변경:

- 학습 완료와 경제 지급 상태를 별도 상태로 표현한다.
- 서버 실패 시 학습 완료는 유지하되 `rewardPending`을 남기고 안전한 재시도 경로를 제공한다.
- 성공 팡파르와 “광석 획득” 문구는 서버 지급 성공 후에만 표시한다.
- 이미 지급 응답은 성공적으로 정산된 상태로 취급하되 추가 획득 애니메이션은 재생하지 않는다.
- 무한 자동 재시도는 금지하고 지수 backoff와 최대 횟수를 둔다.

### P1-03. history와 progress fallback 중복 제거

부분 완료한 날에는 같은 LUMI course가 history 미션 행과 `inProgressLumiProtocols`로 함께 들어가 `activityCount`가 이중 증가할 수 있다.

- `src/services/assignmentFeedbackService.js:685-715`
- `scripts/export-pending-assignment-contexts.mjs:850-895`

history가 같은 `lumiCourseId + unitId`의 당일 완료를 대표하면 progress는 누적 진행 정보로 병합하되 별도 활동 수로 더하지 않는다. history가 없을 때만 progress fallback을 활동 1건으로 센다. CODE TRACE에도 같은 원칙을 확인한다.

### P1-04. 실제 운영 코드를 검증하는 테스트로 교체

1. Python 전용 분류·과정 필터·요약 정제를 dependency-free 공유 모듈로 추출한다.
2. Phase 9가 mock 복사본이 아니라 공유 모듈과 실제 summary builder를 import한다.
3. 웹 서비스와 수동 export가 동일 fixture 파일을 사용한다.
4. 최종 AI prompt builder를 순수 함수로 분리해 prompt snapshot/금지어 테스트를 한다.
5. Firestore Emulator로 실제 보상 transaction과 rules를 검사한다.

최소 보상 테스트:

- canonical/alias 중복
- 임의 course/unit/version/total count
- 20개 동시 claim
- 네트워크 재시도
- 사용자 없음
- client clock 조작
- effectiveAt 전후
- legacy 완료자
- history/ledger/progress 일부만 존재하는 손상 상태
- 잔고·통계·progress·history·ledger 금액 불변식

## 5. P1 — 비용 효율성 수정

### P1-COST-01. 수동 export의 사용자·날짜별 중복 Firestore read 제거

현재 pending assignment를 순차 순회하며 과제마다 다음을 다시 읽는다.

- 같은 사용자·날짜 history
- 같은 사용자의 전체 `learning_progress`
- 같은 사용자의 dark matter
- 현재/이전 첨부 파일

관련 코드:

- `scripts/export-pending-assignment-contexts.mjs:796-807`
- `scripts/export-pending-assignment-contexts.mjs:1051-1115`

필수 변경:

- history raw cache: `uid|date`
- progress raw cache: `uid`
- dark matter cache: `uid`
- attachment preview cache: URL 또는 안정 파일 키
- 과정별 결과를 따로 읽지 말고 raw 데이터를 한 번 읽은 뒤 메모리에서 course sanitizer를 적용한다.
- pending 처리에는 4~8 수준의 bounded concurrency를 적용한다. 무제한 `Promise.all`은 금지한다.
- 실행 종료 시 예상/실제 Firestore read 수, cache hit, attachment fetch 수를 요약 출력한다.

비용 완료 조건 예시:

- 같은 학생·같은 날짜 과제 3건: history query 1회
- 같은 학생 과제 5건: learning_progress 전체 read 1회, dark matter read 1회
- 동일 첨부 URL 재사용: fetch 1회

### P1-COST-02. Python 전용 하드 게이트를 metadata 역조회보다 먼저 적용

현재 모든 history row의 course를 먼저 resolve한 뒤 필터한다.

- `src/services/assignmentFeedbackService.js:652-664`
- `scripts/export-pending-assignment-contexts.mjs:817-830`

비-Python 과제에서는 명백한 CODE TRACE/LUMI row를 먼저 제거한 뒤 남은 row만 region/unit 역조회한다. 이는 누출 가능성과 Firestore read를 함께 줄인다.

### P1-COST-03. 모델 입력을 과정별 whitelist DTO로 축소

`zcodeApiService`는 현재 전체 `feedbackContext`를 JSON으로 직렬화한다. 과정별 whitelist DTO를 만들어 다음만 보낸다.

- 현재 과제 판단에 필요한 제출 근거
- 현재 과정으로 정제된 당일 요약
- 제한된 이전 제출 비교
- 필요한 evidence와 정책 신호

빈 배열, 0뿐인 다른 과정 필드, 운영 진단용 count, 중복 title/evidence는 제거한다. prompt 문자 수 또는 추정 token 수를 개발 로그에서 확인할 수 있게 하되 학생 개인정보 원문은 로그에 남기지 않는다.

## 6. P2 — 후속 정리

### P2-01. 일일 타임라인의 LUMI 원장 중복 카드

`history`가 이미 미션과 획득 광석을 표현하지만 `lumi_protocol_mission_reward` transaction은 skip 목록에 없어 일반 광석 카드로 다시 들어갈 수 있다.

- `src/hooks/useLearningHistory.js:335-395`

동일 `crystalTransactionId`를 연결해 하나의 학습 활동으로 표현하거나 LUMI reward transaction을 별도 활동 집계에서 제외한다. 원장은 회계 근거이지 세 번째 학습 활동이 아니다.

### P2-02. 일일 광석과 누적 광석 라벨 구분

진행 fallback만 있는 카드에서 누적 `crystalsEarnedTotal`이 “광석 N개 획득”으로 보일 수 있다.

- `src/hooks/useLearningHistory.js:936-951`
- `src/components/Space/DailyLearningTimeline.jsx:638-646`

일일 카드는 `crystalsEarnedToday`, 상세/진행 카드는 `누적 N개`로 라벨을 분리한다.

### P2-03. 테스트 때문에 브라우저 Firebase 초기화를 Node와 결합하지 않기

순수 보상 계산 테스트가 `lumiRewardService`를 import하면서 `src/firebase.js`까지 로드한다. 순수 계산·canonical key 생성은 Firebase 비의존 모듈로 분리한다. Node 테스트를 통과시키기 위해 브라우저 Firebase bootstrap을 확장하지 않는다.

## 7. 권장 구현 순서

1. 현재 상태에서 LUMI 보상/피드백 flag off 확인
2. 공유 course policy·sanitizer와 실제 테스트 작성
3. 비-Python prompt/fallback/export 격리 수정
4. 일일 통계 `NaN` 및 history/progress 중복 수정
5. 서버 보상 callable·canonical ID·서버 시각·원자 transaction 구현
6. 레거시 dry-run과 `effectiveAt` 적용
7. Emulator 보안·동시성 테스트
8. export cache·bounded concurrency·prompt DTO 비용 최적화
9. 개발 계정 일일 기록만 활성화
10. 원장 대조 후 보상 활성화
11. 비-Python 금지어 prompt 검증 후 과제 피드백 활성화

## 8. 검증 명령과 산출물

기존 명령은 유지하되 테스트 내용을 위 계약으로 보강한다.

```bash
node scripts/test-phase8-lumi-rewards-ledger.mjs
node scripts/test-phase9-course-isolation-matrix.mjs
npm run test:python-mission
npx eslint src/components/PythonWorld src/services scripts/test-phase8-lumi-rewards-ledger.mjs scripts/test-phase9-course-isolation-matrix.mjs
git diff --check
```

추가 산출물:

1. Firestore Emulator transaction/rules 테스트 결과
2. 레거시 완료자 dry-run 건수와 샘플
3. 과정별 최종 prompt snapshot
4. 비-Python 금지어 검사 결과
5. export 전후 Firestore read/fetch 수 비교
6. 동일 미션 동시 청구 전후 잔고·ledger·history 대조표

## 9. 다른 AI의 완료 보고 형식

완료 보고는 “테스트 통과” 한 줄로 끝내지 말고 다음을 포함한다.

1. 수정한 P0/P1/P2 ID
2. 변경 파일과 핵심 설계 결정
3. canonical ID와 서버 권한 경계 설명
4. 레거시/effectiveAt/feature flag 상태
5. 과정별 prompt 금지어 테스트 결과
6. 실제 Emulator 동시성·멱등성 결과
7. export read 비용 전후 수치
8. 남은 위험과 의도적으로 미룬 항목

## 10. 범위 제한

- 이번 수정에서 LUMI 화면 연출, 음향, 스토리, 미션 문구를 다시 바꾸지 않는다.
- 광석 금액을 임의로 재조정하지 않는다. Vertical Slice 승인 기준은 core 4, field test 8, 기본 합계 48이다.
- ACT 1 보상은 별도 승인 전 활성화하지 않는다.
- 새 일일 집계 컬렉션을 만들지 않는다. 기존 history/progress를 정확히 읽고 중복을 제거한다.
- 비용 절감을 이유로 과정 격리나 원장 불변식을 약화하지 않는다.
