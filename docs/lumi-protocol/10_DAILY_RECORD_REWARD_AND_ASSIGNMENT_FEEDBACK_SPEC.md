# LUMI Protocol 일일 학습기록·광석·과제 피드백 통합 명세

상태: **구현 계획 및 데이터 계약**  
기준일: 2026-08-22  
구현 범위: LUMI Protocol 학습기록, 광석 보상, 일일 타임라인, Python 과제 피드백, 과정 격리

## 1. 목적

LUMI Protocol을 영상 학습과 CODE TRACE처럼 정식 학습 활동으로 취급한다.

구현 후에는 다음이 모두 성립해야 한다.

1. 학생이 LUMI 미션을 처음 완료하면 일일 학습기록에 남는다.
2. 코스 전체가 끝나기 전이라도 `3/10 진행`처럼 진행 중 활동이 보인다.
3. 미션 최초 완료에는 다른 코드 학습과 비슷한 수준의 광석을 지급한다.
4. 재실행, 실패, 타임라인 재생, 힌트 열람에는 광석을 지급하거나 차감하지 않는다.
5. Python 과제 피드백은 당일 LUMI 완료·진행 기록을 실제 코드 실습 근거로 사용한다.
6. CODE TRACE와 LUMI Protocol은 Python 과제에서만 피드백 근거가 된다.
7. 초등수학, 중등수학, 고전 읽기 등 다른 과정의 과제에는 두 활동의 제목·횟수·광석·권장 문구가 노출되지 않는다.

이 문서는 기존 장기 계획의 “MVP에서는 Mission Lab 광석을 지급하지 않는다”는 결정을 변경한다. 단, 실행 횟수 보상 금지와 클라이언트 결과를 무조건 신뢰하지 않는 원칙은 유지한다.

## 2. 고정 결정

### 2.1 활동 이름과 저장 타입

- 학생 UI 이름: `LUMI PROTOCOL`
- 신규 `history.type`: `lumi_protocol`
- 신규 원장 타입: `lumi_protocol_mission_reward`
- 진행 필드: `learning_progress/{unitId}.missionLab`
- 기존 `history.type === "python_mission"`은 레거시 호환 입력으로만 읽는다.
- 레거시 행은 `experienceType === "lumi_protocol"`, LUMI 전용 `missionSetId`, 또는 LUMI 전용 `unitId`가 확인될 때만 LUMI 기록으로 변환한다.
- 일반 `python_mission` 행을 제목만 보고 LUMI로 추측하지 않는다.

### 2.2 과정 식별자

과정 필터가 혼동하지 않도록 두 식별자를 분리한다.

```json
{
  "clusterId": "python",
  "lumiCourseId": "lumi-season-1"
}
```

- `clusterId`는 과제 과정 필터에 사용한다.
- `lumiCourseId`는 LUMI 내부 시즌·코스 식별에 사용한다.
- `courseId: "lumi-season-1"`처럼 일반 과정 필드에 LUMI 코스 ID를 넣지 않는다.
- 신규 LUMI `history`와 `learning_progress`에는 최상위와 `missionLab` 내부 모두 `clusterId: "python"`을 저장한다.

### 2.3 보상 원칙

- 미션별 최초 검증 완료에만 지급한다.
- 같은 미션 재실행 보상은 0이다.
- 실패, 문법 오류, 충돌, STOP, Reset에는 지급하거나 차감하지 않는다.
- 힌트 사용과 Assistance Level은 보상에 영향을 주지 않는다.
- 별 재도전과 최적화에는 별·기록·배지만 갱신하고 광석은 다시 지급하지 않는다.
- LUMI 내부 보상과 과제 승인 시 지급하는 `suggestedBonusCrystals`는 서로 다른 보상이다.
- 과제 피드백은 “LUMI에서 이미 16광석을 받았으므로 과제 보너스를 줄인다”처럼 내부 보상을 감점 근거로 쓰지 않는다.

## 3. 학생 진행 데이터 계약

### 3.1 과정 진행 문서

경로:

```text
users/{uid}/learning_progress/lumi_protocol_vertical_slice
```

권장 스키마:

```json
{
  "unitId": "lumi_protocol_vertical_slice",
  "unitTitle": "LUMI Protocol: 사라진 빛의 항로",
  "clusterId": "python",
  "lumiCourseId": "lumi-season-1",
  "missionLab": {
    "schemaVersion": 3,
    "experienceType": "lumi_protocol",
    "clusterId": "python",
    "lumiCourseId": "lumi-season-1",
    "missionSetId": "lumi-vertical-slice-v1",
    "missionSetVersion": 1,
    "completed": false,
    "completedMissionIds": ["lumi-vs-01", "lumi-vs-02"],
    "completedMissionCount": 2,
    "totalMissionCount": 10,
    "bestStarsByMission": {
      "lumi-vs-01": 2,
      "lumi-vs-02": 2
    },
    "bestAssistanceByMission": {
      "lumi-vs-01": 0,
      "lumi-vs-02": 1
    },
    "rewardedMissionKeys": [
      "lumi-season-1:lumi-vs-01:reward-v1",
      "lumi-season-1:lumi-vs-02:reward-v1"
    ],
    "crystalsEarnedTotal": 8,
    "lastMissionId": "lumi-vs-02",
    "lastCompletedMissionId": "lumi-vs-02",
    "lastCompletedAt": "server timestamp",
    "lastPlayedAt": "server timestamp",
    "updatedAt": "server timestamp"
  },
  "updatedAt": "server timestamp"
}
```

불변식:

- `completedMissionCount`는 `completedMissionIds`의 고유 개수와 같다.
- `completed`는 `completedMissionCount >= totalMissionCount`일 때만 `true`다.
- `crystalsEarnedTotal`은 실제 원장에 지급된 LUMI 보상의 누적 합이다.
- `rewardedMissionKeys`는 재시도 멱등성의 보조 인덱스다. 최종 근거는 원장 문서와 transaction 안의 현재 progress를 함께 본다.
- `bestAssistanceByMission`은 가장 낮은 도움 수준을 저장하며 보상 계산에는 사용하지 않는다.
- 학생 코드 원문과 최근 실행 20회 ring buffer는 기존 `pythonMissionProgress`에 유지하고 일일 요약 문서에 중복 저장하지 않는다.

### 3.2 미션 최초 완료 history

미션별 최초 완료마다 한 건을 쓴다.

```text
users/{uid}/history/lumi_protocol_{lumiCourseId}_{missionId}_{rewardPolicyVersion}
```

예:

```json
{
  "type": "lumi_protocol",
  "activityType": "lumi_protocol_mission_complete",
  "historyScope": "mission",
  "clusterId": "python",
  "lumiCourseId": "lumi-season-1",
  "unitId": "lumi_protocol_vertical_slice",
  "unitTitle": "LUMI Protocol: 사라진 빛의 항로",
  "missionSetId": "lumi-vertical-slice-v1",
  "missionId": "lumi-vs-03",
  "missionTitle": "에너지 셀까지",
  "actId": "act-0-awakening",
  "concepts": ["값 수정", "정수 리터럴"],
  "completed": true,
  "stars": 2,
  "assistanceLevel": 0,
  "rewardPolicyVersion": "reward-v1",
  "baseCrystals": 4,
  "bonusCrystals": 0,
  "crystalsEarned": 4,
  "crystalTransactionId": "lumi_mission_lumi-season-1_lumi-vs-03_reward-v1",
  "timestamp": "server timestamp"
}
```

기존 세트 전체 완료용 `python_mission` history를 당장 삭제하지 않는다. 신규 요약기는 다음 순서로 중복을 막는다.

1. 같은 날짜에 `historyScope: "mission"`인 신규 LUMI 행이 있으면 이를 사용한다.
2. 신규 행이 없을 때만 레거시 세트 완료 행을 한 건의 완료 기록으로 사용한다.
3. 신규 미션 행과 레거시 세트 행을 동시에 완료 횟수에 더하지 않는다.

## 4. 광석 보상 설계

### 4.1 파일럿 10개 기본량

| 미션 유형 | 미션 수 | 미션당 기본 광석 | 합계 |
| --- | ---: | ---: | ---: |
| 일반 Core Mission | 8 | 4 | 32 |
| Field Test | 2 | 8 | 16 |
| 합계 | 10 |  | 48 |

기본 48광석은 CODE TRACE 단원 총 30~80광석 범위와 비슷한 수준이다.

기존 `applyCrystalRewardMultiplier`를 Python 과정으로 적용한다.

| 상황 | 일반 미션 | Field Test | 10개 총량 |
| --- | ---: | ---: | ---: |
| 정규 수업시간 | 4 | 8 | 48 |
| 수업시간 외 1.2배 | 5 | 10 | 60 |
| 주말·휴일 1.5배 | 6 | 12 | 72 |

배율은 미션별 실제 지급 시점에 적용한다. 총량 표는 10개 모두 같은 배율 상황에서 완료했을 때의 예시다.

### 4.2 보상 설정 위치

미션 카탈로그에는 금액을 직접 흩어 쓰지 않고 보상 정책을 명시한다.

```js
reward: {
  policyVersion: 'reward-v1',
  tier: 'core',
  baseCrystals: 4,
  firstCompletionOnly: true,
}
```

Field Test는 `tier: "field-test"`, `baseCrystals: 8`을 사용한다.

클라이언트가 요청한 금액은 신뢰하지 않는다. 지급 로직은 등록된 mission catalog에서 `missionId + policyVersion`의 금액을 다시 찾는다.

### 4.3 정확히 한 번 지급

보상 키:

```text
{lumiCourseId}:{missionId}:{rewardPolicyVersion}
```

원장 문서 ID:

```text
lumi_mission_{lumiCourseId}_{missionId}_{rewardPolicyVersion}
```

하나의 Firestore transaction에서 다음을 함께 처리한다.

1. 사용자 문서의 현재 광석과 성장 통계를 읽는다.
2. `learning_progress`의 `rewardedMissionKeys`와 완료 상태를 읽는다.
3. 같은 원장 문서가 이미 존재하는지 확인한다.
4. 이미 지급됐다면 잔고를 바꾸지 않고 기존 지급 결과를 반환한다.
5. 최초 지급이면 등록된 보상 정책에 배율을 적용한다.
6. 사용자 광석·성장 카운터를 갱신한다.
7. `missionLab.completedMissionIds`, `rewardedMissionKeys`, `crystalsEarnedTotal`을 갱신한다.
8. 미션 완료 `history`와 `crystal_transactions` 원장을 쓴다.

부분 성공, 이벤트 재생 완료, 결과 카드 노출은 지급 근거가 아니다. evaluator의 최종 `completed === true`와 미션 ID가 일치한 완료 전이만 청구할 수 있다.

현재 브라우저 Worker 결과만으로 경제 보상을 완전히 보호할 수는 없다. 구현은 두 단계로 구분한다.

- P0: 기존 CODE TRACE와 같은 Firestore transaction·고정 보상·멱등 원장을 사용한다. 금액을 클라이언트 입력으로 받지 않는다.
- P1: `claimLumiMissionReward` 같은 서버 권한 경계로 옮기고 App Check·미션 버전·완료 증거 검증을 추가한다.

프로덕션에서 클라이언트의 사용자 잔고 직접 쓰기를 금지하는 규칙이 먼저 적용된다면, P1 callable이 준비되기 전에는 LUMI 경제 보상 feature flag를 켜지 않는다.

## 5. 일일 학습기록 UI

### 5.1 데이터 수집

`useLearningHistory`는 다음을 병합한다.

- 완료: 당일 `history.type === "lumi_protocol"`
- 레거시 완료: LUMI로 식별 가능한 `history.type === "python_mission"`
- 진행 중: 당일 갱신된 `learning_progress.missionLab`

진행 중 기록은 다음 조건을 모두 만족할 때만 만든다.

- `missionLab.experienceType === "lumi_protocol"`
- `missionLab.clusterId === "python"` 또는 최상위 `clusterId === "python"`
- `completedMissionCount > 0`
- `lastCompletedAt` 또는 `updatedAt`이 선택한 KST 날짜 범위 안에 있음
- 같은 course/unit의 당일 신규 history가 이미 같은 정보를 대표하지 않음

실패 실행만 여러 번 한 경우를 “미션 완료”로 표현하지 않는다. 실행 시도는 상세 run 기록에는 남지만, 일일 요약의 진행도는 최소 한 미션을 검증 완료한 뒤부터 표시한다. 이는 CODE TRACE가 최소 한 exercise 완료 후 진행 기록으로 잡히는 규칙과 같다.

### 5.2 일일 통계 필드

```js
dailyStats: {
  lumiProtocolCount: 3,
  lumiProtocolProgressCount: 1,
  lumiProtocolMissionCount: 3,
  lumiProtocolCrystalsEarned: 12,
}
```

- `lumiProtocolCount`: 선택 날짜에 최초 완료한 고유 미션 수
- `lumiProtocolProgressCount`: 완료 코스가 아니며 진행 중 카드로 노출된 LUMI 코스 수
- `lumiProtocolMissionCount`: `lumiProtocolCount`와 같은 의미의 명시적 별칭. 신규 소비자는 이 이름을 우선한다.
- `lumiProtocolCrystalsEarned`: 선택 날짜 신규 LUMI history의 실제 지급 합계

### 5.3 그룹 카드

일일 타임라인은 신규 normalized type `lumi`를 추가한다.

표시 예:

```text
🛰️ LUMI PROTOCOL · 사라진 빛의 항로
오늘 3개 미션 완료 · 전체 4/10 진행
최고 별 2 · 광석 12개 획득
마지막 미션: 꺾인 항로
```

완료와 누적을 혼동하지 않는다.

- `오늘 3개 완료`: 당일 history 기준
- `전체 4/10`: learning_progress 누적 기준
- `광석 12개`: 당일 실제 지급 기준
- `누적 16개`: 상세 화면에서만 선택적으로 표시

진행 중 카드에는 `완료` 배지를 붙이지 않는다.

## 6. 과제 피드백 컨텍스트

### 6.1 learningSummary 필드

수동 export와 운영툴 서비스가 동일한 필드를 만든다.

```json
{
  "lumiProtocolCount": 3,
  "lumiProtocolProgressCount": 1,
  "lumiProtocolMissionCount": 3,
  "lumiProtocolCrystalsEarned": 12,
  "lumiProtocols": [
    {
      "lumiCourseId": "lumi-season-1",
      "unitId": "lumi_protocol_vertical_slice",
      "title": "LUMI Protocol: 사라진 빛의 항로",
      "missionId": "lumi-vs-04",
      "missionTitle": "꺾인 항로",
      "concepts": ["순차 실행", "회전 명령"],
      "stars": 2,
      "assistanceLevel": 0,
      "crystalsEarned": 4,
      "completed": true
    }
  ],
  "inProgressLumiProtocols": [
    {
      "lumiCourseId": "lumi-season-1",
      "unitId": "lumi_protocol_vertical_slice",
      "title": "LUMI Protocol: 사라진 빛의 항로",
      "completedMissionCount": 4,
      "totalMissionCount": 10,
      "lastMissionId": "lumi-vs-04",
      "bestStars": 2,
      "crystalsEarnedTotal": 16,
      "completed": false
    }
  ]
}
```

`lumiProtocols`는 당일 완료 미션을 담고, `inProgressLumiProtocols`는 코스 누적 상태를 담는다. 동일한 미션 완료를 양쪽의 활동 횟수에 두 번 더하지 않는다.

### 6.2 Python 과제 평가에서의 의미

LUMI는 다음 성격의 근거다.

- 영상이 아닌 직접 코드 작성·실행·수정 활동
- 퀴즈와 별도의 게임 기반 코드 실습
- 완료 미션 수, 다룬 개념, 별, 도움 수준으로 설명 가능한 학습
- CODE TRACE와 동급의 “의미 있는 코드 확인 활동”이지만 동일 활동으로 합치지 않음

Python 과제에서 완료 또는 의미 있는 진행 LUMI 기록이 있으면 다음 Boolean에 포함한다.

- `hasLearningFollowUpActivity`
- `hasCourseLearningRecord`
- `hasPythonCodePractice`
- `isReasonableFlow`

LUMI 기록만 있다는 이유로 자동 만점이나 과제 승인으로 단정하지 않는다. 제출문·첨부 코드·오늘 배운 개념의 연결을 함께 본다.

권장 문장:

```text
오늘 LUMI Protocol에서 ‘첫걸음’과 ‘에너지 셀까지’ 미션을 완료하며
함수 호출의 괄호와 이동 인자 값을 직접 바꾸어 실행했습니다.
```

진행 중 예:

```text
LUMI Protocol은 4/10까지 진행 중이며, 오늘은 순차 실행과 회전 명령을 다룬 기록이 확인됩니다.
```

금지 문장:

```text
LUMI에서 광석을 많이 받았으므로 Python을 충분히 공부했습니다.
```

광석은 보상 결과이며 학습의 질 자체가 아니다. 완료 개념·미션·제출 설명을 우선한다.

## 7. Python 전용 활동의 과정 격리

### 7.1 전용 활동 판별

다음 중 하나면 Python 전용 활동이다.

```text
history.type === "code_trace"
history.type === "lumi_protocol"
learning_progress.codeTrace 존재
learning_progress.missionLab.experienceType === "lumi_protocol"
LUMI로 확인된 레거시 history.type === "python_mission"
```

### 7.2 하드 게이트

과제 대상 과정이 `python`이 아니면 Python 전용 활동을 무조건 제외한다.

```js
if (isPythonExclusiveActivity(item) && assignmentCourseId !== 'python') {
  return EXCLUDE
}
```

이 검사는 `clusterId` 역추적이나 초등수학 레벨업 예외보다 먼저 실행한다. 따라서 잘못 저장된 `clusterId`, 제목 오탐, unknown 과정이 있어도 CODE TRACE와 LUMI가 수학 과제에 들어가지 않는다.

### 7.3 Python 과제에서도 과정 확인

Python 과제라고 모든 CODE TRACE/LUMI를 자동 포함하지 않는다.

- 명시적 `clusterId: "python"`을 우선한다.
- 없으면 `units → chapters → regions` 역추적으로 Python인지 확인한다.
- LUMI 전용 synthetic unit은 허용 목록과 `experienceType`을 함께 확인한다.
- 그래도 과정이 unknown이면 학습 근거에서 제외하고 운영 진단 카운트만 올린다.
- 제목에 `코드`, `Python`, `LUMI`가 있다는 이유만으로 포함하지 않는다.

### 7.4 초등수학 레벨업 예외와의 관계

초등수학 레벨업 예외는 `middle-math` 기록만 허용하는 단방향 예외다.

```text
초등수학 과제 + 중등수학 레벨업 기록 → 허용 가능
초등수학 과제 + CODE TRACE → 항상 제외
초등수학 과제 + LUMI Protocol → 항상 제외
중등수학 과제 + CODE TRACE/LUMI → 항상 제외
고전 읽기 과제 + CODE TRACE/LUMI → 항상 제외
```

제출문에 `함수`, `코드`, `조건문`이 적혀 있어도 이 규칙을 바꾸지 않는다.

### 7.5 네 단계 방어

1. **수집 단계**: history와 learning_progress를 Python 전용 타입으로 먼저 분류한다.
2. **요약 단계**: 비-Python 과제의 `codeTraces`, `lumiProtocols` 및 관련 count를 빈 값으로 강제한다.
3. **프롬프트 단계**: CODE TRACE/LUMI 안내문은 Python 과제일 때만 생성한다.
4. **운영툴 표시 단계**: 비-Python 과제에서는 CODE TRACE/LUMI 요약 섹션을 렌더링하지 않는다.

`allTitles`, `balanceSignals`, `evidence`, `contextSummary`, `excludedOtherCourseTitles`를 통해 우회 노출되지 않도록 한다. 비-Python 과제의 모델 입력에는 Python 전용 활동의 제목을 전달하지 않고, 필요하면 `excludedPythonExclusiveActivityCount` 숫자만 운영 진단용으로 보관한다.

## 8. 비용 및 쓰기 최적화

- 키 입력과 자동 저장은 localStorage를 사용한다.
- Firestore 초안은 RUN, 미션 이탈, 완료 같은 체크포인트에서만 저장한다.
- 실패 RUN마다 학습 progress와 history를 쓰지 않는다. 기존 최근 20회 run ring buffer 정책만 적용한다.
- 최초 완료 transaction 한 번에서 progress, history, 원장을 함께 갱신한다.
- 일일 기록용 별도 컬렉션을 만들지 않고 기존 history와 learning_progress를 집계한다.
- 피드백 생성 시 history는 날짜 범위 쿼리, progress는 기존 과정 역추적 캐시를 재사용한다.
- 같은 LUMI 미션의 history, progress fallback, transaction 원장을 세 번의 활동으로 세지 않는다.

## 9. 구현 파일 계획

코드 구현 담당자는 최소 다음 경로를 검토한다.

| 영역 | 파일 | 변경 책임 |
| --- | --- | --- |
| 미션 완료·보상 | `src/components/PythonWorld/PythonMissionLab.jsx` 또는 분리된 reward service | 최초 완료 전이, 지급 요청, 결과 UI |
| 미션 카탈로그 | `src/components/PythonWorld/lumiCourseCatalog.js` | reward tier와 정책 버전 |
| 원장·배율 | `src/utils/crystalLedger.js`, `src/utils/holidayUtils.js` | 기존 원장과 Python 배율 재사용 |
| 일일 기록 수집 | `src/hooks/useLearningHistory.js` | LUMI history/progress 병합과 중복 제거 |
| 일일 기록 UI | `src/components/Space/DailyLearningTimeline.jsx` | LUMI 통계 chip과 카드 |
| 수동 피드백 export | `scripts/export-pending-assignment-contexts.mjs` | LUMI 요약과 Python 전용 하드 게이트 |
| 운영툴 피드백 | `src/services/assignmentFeedbackService.js` | 동일 요약·정책·폴백 |
| 운영자 화면 | `src/components/Admin/AdminAssignmentDetail.jsx` | Python 과제에서만 LUMI 근거 표시 |
| 보안 | `firestore.rules`, 선택적 Firebase Function | 잔고 쓰기 권한과 보상 청구 경계 |

수동 export와 운영툴 서비스는 같은 fixture와 기대값을 공유해야 한다. 한쪽만 구현하면 완료로 인정하지 않는다.

## 10. 마이그레이션

### 10.1 기존 완료 기록

- 기존 `learning_progress.missionLab.completedMissionIds`는 유지한다.
- 기존 `python_mission` history는 삭제하지 않는다.
- 과거 완료일을 알 수 없는 미션별 history를 임의 생성하지 않는다.
- 과거 완료 미션에 광석을 자동 소급 지급하지 않는다.
- 배포 시 기존 완료 ID를 `legacyRewardIneligibleMissionIds`로 표시해 재실행 보상 악용을 막는다.
- 소급 보상이 필요하면 별도 관리자 스크립트로 dry-run·승인·원장 생성 후 적용한다.

### 10.2 적용일

보상 정책에는 `effectiveAt`을 둔다. 적용일 이후 최초 완료만 `reward-v1` 대상이다. 진행 기록 표시는 과거 데이터를 읽을 수 있지만, 정확한 날짜 근거가 없으면 오늘 활동으로 만들지 않는다.

## 11. 테스트 및 완료 조건

### 11.1 단위·계약 테스트

- 일반 미션 최초 완료가 기본 4광석을 지급한다.
- Field Test 최초 완료가 기본 8광석을 지급한다.
- 같은 미션 중복 클릭·네트워크 재시도·재실행의 추가 지급은 0이다.
- 실패·STOP·Reset·힌트 사용은 잔고에 영향을 주지 않는다.
- 사용자 잔고, 성장 통계, progress 총액, history, ledger 금액이 일치한다.
- 휴일·수업시간 외 배율이 기존 학습과 동일하게 적용된다.
- 신규 LUMI history와 progress fallback이 일일 기록에서 중복되지 않는다.
- 선택한 날짜에 완료한 미션만 `오늘 완료`로 집계된다.
- 누적 완료 수와 오늘 완료 수가 구분된다.

### 11.2 과정 격리 매트릭스

| 과제 과정 | 일반 Python 영상 | CODE TRACE | LUMI | 중등수학 레벨업 기록 |
| --- | --- | --- | --- | --- |
| Python | 포함 | 포함 | 포함 | 제외 |
| 초등수학 | 제외 | 제외 | 제외 | 조건부 포함 |
| 중등수학 | 제외 | 제외 | 제외 | 해당 과정이면 포함 |
| 고전 읽기 | 제외 | 제외 | 제외 | 제외 |

필수 회귀 사례:

1. 초등수학 제출일에 CODE TRACE만 있어도 초등 피드백에는 CODE TRACE가 한 번도 언급되지 않는다.
2. 초등수학 제출일에 LUMI만 있어도 초등 피드백에는 LUMI·코어·미션·Python 광석이 언급되지 않는다.
3. 중등수학과 고전 읽기에서도 동일하게 제외된다.
4. 초등수학 레벨업의 실제 `middle-math` 영상·퀴즈·데이터 로그는 기존대로 인정된다.
5. Python 과제에서는 CODE TRACE와 LUMI가 각각 별도 활동으로 표시되고 저학습 오판을 막는다.
6. 과정이 unknown인 CODE TRACE/LUMI는 어떤 과제에도 자동 포함되지 않는다.
7. `allTitles`, evidence, fallback 문구, 운영툴 카드에도 비-Python 활동명이 남지 않는다.

### 11.3 수동 QA

- LUMI 일반 미션을 완료하고 잔고·원장·일일 기록의 4광석이 일치하는지 확인한다.
- Field Test 8광석과 배율 적용 금액을 확인한다.
- 같은 미션을 다시 실행해도 성공 연출만 나오고 광석은 0인지 확인한다.
- 일부 미션만 완료한 날 `진행 중 3/10` 카드가 보이는지 확인한다.
- 다른 날 조회 시 오늘 완료 수가 섞이지 않는지 확인한다.
- Python 과제 피드백에 미션명·개념·진행도가 정확히 들어가는지 확인한다.
- 초등수학 과제의 모델 입력 JSON과 최종 문장에서 CODE TRACE/LUMI 문자열이 모두 제거됐는지 확인한다.

## 12. 출시 순서

1. 데이터 필드와 과정 하드 게이트 테스트를 먼저 추가한다.
2. LUMI 완료 history와 일일 기록 UI를 구현한다.
3. 광석 transaction과 원장 멱등성을 구현한다.
4. 수동 export와 운영툴 피드백을 함께 구현한다.
5. 기존 완료자 마이그레이션을 dry-run한다.
6. 개발 환경에서 과정 격리 매트릭스를 통과시킨다.
7. 소수 계정 feature flag로 일일 기록만 먼저 연다.
8. 원장·잔고 일치가 확인된 뒤 광석 보상을 연다.
9. 마지막으로 과제 피드백 반영을 연다.

출시 승인 조건은 “화면에 LUMI 카드가 보임”이 아니다. 일일 기록, 원장, 잔고, 과제 컨텍스트, 과정 격리 테스트가 모두 통과해야 한다.
