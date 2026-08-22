# 수동 과제 피드백 일괄 작업 절차

이 문서는 대기중(`submitted`) 과제를 Codex가 직접 검토해 운영툴의 AI 피드백 초안에 저장하는 절차다. Gemini API나 자동 생성 모델을 쓰지 않는다.

## 핵심 원칙

- 학생에게 바로 노출되는 `feedback` 필드는 수정하지 않는다.
- 운영자가 확인할 수 있는 `aiFeedbackDraft`, `aiFeedbackPayload`만 저장한다.
- 상태(`status`)는 `submitted` 그대로 둔다. 승인/보완요청은 운영툴에서 사람이 결정한다.
- 추가 미션이나 커리큘럼 밖 과제는 쓰지 않는다.
- 피드백은 `잘한 점`, `이전보다 좋아진 점`, `더 발전시키면 좋은 점` 중심으로 쓴다.
- 그날 해당 행성의 실제 학습 기록만 단정해서 말한다. 누적 진도나 다른 행성 기록을 섞어 “영상을 여러 개 봤다”처럼 과장하지 않는다.
- 학생을 사랑하고 성장을 돕는 선생님의 말투로 쓴다. 지적할 때도 학생이 “다음에는 해볼 수 있겠다”고 느끼게 한다.
- 문구를 반복해서 복사한 듯한 피드백을 쓰지 않는다. 각 섹션에는 해당 학생의 제출물, 오늘 학습 기록, 이전 피드백 반응 중 적어도 하나의 구체 근거가 들어가야 한다.
- 이전 피드백에 대한 학생의 이모티콘 평가나 코멘트가 있으면 반드시 읽고, 다음 피드백에서 짧게 반응한다.
- 학습량이 매우 낮거나 제출물과 학습 기록이 맞지 않는 경우에도 단정적으로 비난하지 않는다. 대신 확인된 사실, 다음 제출에서 회복할 행동, 반복 시 운영자가 검토할 조치를 분명히 남긴다.
- 고전 읽기(`western-classic`) 과제는 수학·Python의 영상/코드 학습량 기준을 적용하지 않는다. 약 15분간 함께 읽고, 도달 쪽수와 독서 퀴즈를 확인하는 활동이라는 전제에서 아래 **고전 읽기 과제 전용 피드백 규칙**으로 평가한다.
- **CODE TRACE와 LUMI Protocol은 Python 전용 활동이다.** 현재 과제가 Python이 아니면 같은 학생·같은 날짜에 기록이 있어도 학습량, 칭찬, 보완점, 보너스 광석, `allTitles`, AI 프롬프트에 포함하지 않는다. 초등수학의 중등수학 레벨업 예외도 이 두 활동에는 적용하지 않는다.

### 문서 규정과 코드 구현의 일치

이 문서의 레벨업 예외, 학습 기록 필터, 진행 중 퀴즈 인정 규칙, Python CODE TRACE·LUMI Protocol 인정 규칙과 Python 전용 활동 격리는 단순 가이드가 아니라 **코드가 자동으로 적용해야 하는 규칙**이다. 수동 작업(export 스크립트)과 운영툴의 “AI 피드백 생성” 버튼(`assignmentFeedbackService.js`) 양쪽 모두 같은 규칙을 구현해야 한다. 한쪽만 고치면 다른 경로에서 같은 버그가 재발한다.

특히 아래 항목은 코드 누락이 잦은 지점이므로, 문서를 고칠 때 반드시 코드도 함께 확인한다.

- **레벨업 감지**: 제출문 키워드 정규식뿐 아니라 “같은 날짜 history/learning_progress에 `middle-math` 기록이 존재하는지”로도 감지해야 한다. 제출문 키워드만 쓰면 “SSS 합동을 배웠다”처럼 키워드에 안 걸리는 중등 단원이 누락된다(조하람 사례).
- **`learning_progress` 병합**: 학생이 퀴즈/영상을 끝까지 완료하지 않으면 `history`에 기록이 쌓이지 않고 `learning_progress`에만 진행 상태가 남는다. 두 컬렉션을 모두 읽지 않으면 실제 학습한 내용이 “0건”으로 잡힌다(조승아 사례).
- **한글 NFD 인코딩**: macOS/iOS에서 입력된 한글이 NFD(분해 자모)로 저장되는 경우, 정규식/비교 전에 반드시 NFC로 정규화하지 않으면 “함수/방정식” 키워드가 매칭되지 않아 과정 분류가 실패하고 기록이 누락된다(조승아 사례).
- **학습 메타데이터 역추적 우선**: `learning_progress` 문서에 `clusterId`가 없어도 제목/unitId 정규식으로 과정을 맞히면 안 된다. 먼저 `learning_progress/{unitId}` → `units/{unitId}.chapterId` → `chapters/{chapterId}.regionId` → `regions/{regionId}.clusterId` 순서로 역추적해 실제 과정을 찾는다. 새 CODE TRACE 진행 기록은 `learning_progress` 최상위와 `codeTrace` 내부에 `clusterId/chapterId`를 함께 저장한다. 그래야 `unit_py_math_2` 같은 파이썬 수학 단원이 “unknown”으로 빠지지 않는다(인효린 사례).
- **Python CODE TRACE 반영**: CODE TRACE는 영상을 보는 활동도, 퀴즈를 푸는 활동도 아니지만 코드를 보고 구조를 손으로 따라 쓰는 별도 고난도 학습이다. `history.type === "code_trace"` 완료 기록과 `learning_progress.codeTrace` 진행 기록을 Python 학습 근거로 반드시 합산해야 한다. 수동 export와 운영툴 “AI 피드백 생성” 양쪽 모두 `codeTraces`, `inProgressCodeTraces`, `codeTraceCount`, `codeTraceProgressCount` 같은 요약 필드를 제공해야 하며, 이 필드가 없으면 영상 시간이 짧다는 이유만으로 Python 학습을 낮게 평가할 위험이 있다.
- **Python LUMI Protocol 반영**: LUMI Protocol은 코드를 직접 실행해 로버를 움직이고, Trace로 상태 변화를 관찰하며, 미션을 해결하는 Python 실습이다. `history.type === "lumi_protocol"` 최초 완료 기록과 `learning_progress.lumi_protocol_vertical_slice.missionLab` 진행 상태를 Python 학습 근거로 합산한다. 양쪽 생성 경로 모두 `lumiProtocols`, `inProgressLumiProtocols`, `lumiProtocolCount`, `lumiProtocolProgressCount`, `lumiProtocolMissionCount`, `lumiProtocolCrystalsEarned`를 같은 의미로 제공한다.
- **Python 전용 활동 선차단**: `code_trace`, `lumi_protocol` 및 명시적 레거시 LUMI 기록은 제목·unitId 추론이나 초등→중등 레벨업 병합보다 먼저 활동 타입으로 판별한다. 현재 과제가 Python이 아니면 즉시 제외하고, `allTitles`, `progressTitles`, `balanceSignals`, `concernSignals`, 증거 목록, 프롬프트에도 흘려보내지 않는다. 제목에 “코드”가 있다는 이유로 다른 과정에 포함하거나, `unknown` 기록을 현재 과정으로 흡수해서는 안 된다.
- **퀴즈 배틀 분리 평가**: 퀴즈 배틀(`history.type === "quiz_battle"`)은 점수 체계가 0~1500(정답×100)으로 일반 퀴즈(0~100)와 다르다. 배틀을 일반 퀴즈 버킷에 그냥 섞어 넣으면 `averageScore`가 오염되고 “완료 퀴즈 N개”에 묻혀 배틀 복습 활동이 보이지 않는다. 수동 export와 운영툴 “AI 피드백 생성” 양쪽 모두 `quiz_battle`을 일반 퀴즈에서 분리해 별도 요약 필드(`battles`, `battleCount`, `battleWinCount`, `battleDrawCount`, `battleLossCount`, `battleForfeitCount`, `battleAverageAccuracy`, `isSufficientBattleReview`)로 제공해야 한다. 이 필드가 없으면 영상이 없다는 이유만으로 배틀만 열심히 한 학생을 25광석으로 낮게 평가한다.
- **스마트 워크북 분리 평가**: 완료 기록은 `history.type === "workbook"`, 진행 기록은 `learning_progress.workbookSession`에 남는다. 워크북은 일반 퀴즈와 별도 활동이므로 `averageScore`/`quizCount`에 섞지 않고 `workbooks`, `inProgressWorkbooks`, `workbookCount`, `workbookProgressCount`, `workbookAverageScore`로 제공한다. 완료 점수·정답 수·재시도 수와 진행 페이지를 풀이 활동 근거로 인정한다.
- **고전 읽기 전용 컨텍스트**: `western-classic` 과제에는 현재 `assignment.reading`과 같은 학생의 이전 고전 읽기 제출을 함께 제공해야 한다. 같은 `bookId`의 가장 최근 이전 제출 페이지를 기준으로 `previousSubmittedPage`, `currentSubmittedPage`, `pagesAdvancedSincePreviousSubmission`, `comparisonState`를 계산한다. 수동 export와 운영툴 “AI 피드백 생성” 양쪽이 같은 비교 규칙을 사용해야 한다.
- **고전 읽기 퀴즈 반영**: 같은 날짜·같은 과정의 완료 퀴즈와 진행 중 퀴즈를 모두 읽는다. 퀴즈 정답률이 낮더라도 시도 자체를 독서 확인 활동으로 인정하며, 틀린 문제는 감점 사유보다 다음 읽기에서 다시 확인할 내용으로 활용한다.

### CODE TRACE 코드 반영 체크리스트

CODE TRACE 규정을 문서에 추가한 뒤에는 아래 구현을 함께 맞춘다.

- `scripts/export-pending-assignment-contexts.mjs`
  - `history`에서 `type === "code_trace"`인 Python 기록을 퀴즈가 아니라 CODE TRACE로 분리한다.
  - `learning_progress`에서 `codeTrace.completedExerciseCount > 0`인 진행 기록을 `inProgressCodeTraces`로 추출한다.
  - 진행 기록의 과정 분류는 제목/unitId 정규식이 아니라 `clusterId/courseId` 필드, `codeTrace.clusterId`, 또는 `units → chapters → regions` 역추적으로 처리한다.
  - `buildLearningLoadSummary`의 입력과 `balanceSignals`에 CODE TRACE를 포함한다.
  - `hasPractice` 또는 이에 준하는 확인 활동 판단에 완료/진행 CODE TRACE를 포함한다.
  - `learningSummary`에 `codeTraceCount`, `codeTraceProgressCount`, `codeTraces`, `inProgressCodeTraces`를 저장한다.
- `src/services/assignmentFeedbackService.js`
  - 운영툴 “AI 피드백 생성” 경로에서도 같은 CODE TRACE 필드를 생성한다.
  - `buildFeedbackPolicyGuidance`의 `hasLearningFollowUpActivity`, `hasCourseLearningRecord`, `isVeryLowLearning`, `isReasonableFlow` 판단에 CODE TRACE를 포함한다.
  - 자동 생성 문구에서 “영상/퀴즈/데이터 로그”만 나열하지 말고 Python 과제에서는 CODE TRACE를 함께 언급한다.
- 저장 검증
  - Python 과제 샘플에서 `history.type === "code_trace"` 완료 기록만 있고 영상이 짧아도 `learningLoad.level`이 과도하게 낮아지지 않는지 확인한다.
  - `learning_progress.codeTrace.completedExerciseCount > 0`이지만 완료 전인 경우, 완료로 단정하지 않고 “진행 중 CODE TRACE”로 노출되는지 확인한다.
- CODE TRACE가 없는 기존 Python 과제, 수학 과제, 초등수학 레벨업 예외가 기존과 동일하게 동작하는지 회귀 확인한다.
- CODE TRACE 앱 내부 보상은 과제 보너스 광석과 별개다. 코드 세트별 즉시 보상을 지급하고, 단원 전체 기준 총 30~80광석 범위가 되도록 분배한다. 중복 지급 방지는 `learning_progress.codeTrace.earnedExerciseIds`로 판단하고, 일일 학습 기록에는 `crystalsEarnedTotal`을 노출한다.

### LUMI Protocol 및 Python 전용 활동 격리 체크리스트

상세 데이터 계약·보상·마이그레이션·테스트 기준은 [`docs/lumi-protocol/10_DAILY_RECORD_REWARD_AND_ASSIGNMENT_FEEDBACK_SPEC.md`](./lumi-protocol/10_DAILY_RECORD_REWARD_AND_ASSIGNMENT_FEEDBACK_SPEC.md)를 따른다.

- `scripts/export-pending-assignment-contexts.mjs`
  - `history.type === "lumi_protocol"`인 최초 완료 기록을 LUMI 전용 버킷으로 분리하고, 미션 제목·ACT·미션 ID·별·도움 사용량·획득 광석을 보존한다.
  - `learning_progress/lumi_protocol_vertical_slice.missionLab`에서 실제 진행이 있는 미완료 미션만 `inProgressLumiProtocols`로 추출한다.
  - `learningSummary`에 `lumiProtocols`, `inProgressLumiProtocols`, `lumiProtocolCount`, `lumiProtocolProgressCount`, `lumiProtocolMissionCount`, `lumiProtocolCrystalsEarned`를 생성한다.
  - Python 과제일 때만 CODE TRACE와 LUMI를 `hasPractice`, `hasCourseLearningRecord`, `learningLoad`, `balanceSignals`에 포함한다.
  - 현재 과제가 Python이 아니면 CODE TRACE와 LUMI를 과정 메타데이터 역추적 전에 제거한다. 초등수학 레벨업 병합 대상은 `middle-math`의 수학 활동뿐이며 Python 전용 활동은 포함하지 않는다.
- `src/services/assignmentFeedbackService.js`
  - 운영툴 단건 생성 경로에서도 위와 동일한 필드·집계·필터 순서를 사용한다.
  - Python 과제 프롬프트에만 CODE TRACE와 LUMI 요약을 조건부로 추가한다. 다른 과정 프롬프트에는 활동명이 0건 안내 문구로도 등장하지 않아야 한다.
  - Python 과제에서는 LUMI 완료/진행을 코드 실행·수정·Trace 관찰 근거로 인정하되, 실행 횟수만 많은 실패·Reset·단순 재실행을 진도나 성취로 부풀리지 않는다.
- 일일 학습 기록
  - 타임라인에는 정규화 타입 `lumi`로 표시하며 최초 미션 완료, 별/도움 사용, 해당 완료에서 실제 지급된 광석을 보여 준다.
  - 일일 통계에는 `lumiProtocolCount`, `lumiProtocolProgressCount`, `lumiProtocolMissionCount`, `lumiProtocolCrystalsEarned`를 별도 집계한다. 영상 수·퀴즈 수·CODE TRACE 수와 섞지 않는다.
- LUMI 앱 내부 광석과 과제 피드백 보너스는 별개다.
  - 수직 슬라이스 기준 앱 내부 기본 보상은 일반 미션 8개×4광석 + 필드 테스트 2개×8광석 = 총 48광석이다. 기존 시간대/휴일 배율은 미션별 산정 후 적용한다.
  - 최초 성공한 미션에만 지급하며 실패, 힌트, Reset, STOP, 재실행·재완료에는 지급하거나 회수하지 않는다.
  - 사용자 잔고·성장 카운터·진도 보상 키·`history`·`crystal_transactions(type: "lumi_protocol_mission_reward")`를 하나의 멱등 트랜잭션으로 확정한다.
  - 위 48광석은 앱 안에서 이미 받은 학습 보상이고, `suggestedBonusCrystals`는 제출 품질과 일일 학습 흐름에 대한 별도 과제 보너스다. 과제 피드백이 앱 내부 광석을 다시 지급하면 안 된다.
- 저장·회귀 검증
  - Python 과제에서 LUMI만 완료한 경우 “학습 기록 0건”이 아니며, 완료 미션과 Trace 기반 실습을 구체적으로 언급하는지 확인한다.
  - Python 과제에서 LUMI가 진행 중이면 완료로 단정하지 않고 현재 미션/진행도를 표시하는지 확인한다.
  - 초등수학·중등수학·고전 읽기 과제 컨텍스트와 최종 피드백에서 `CODE TRACE`, `code_trace`, `LUMI`, `lumi_protocol`, `루미`가 모두 사라지는지 확인한다.
  - 초등수학→중등수학 레벨업 사례와 같은 날짜에 Python 전용 기록이 함께 있어도 중등수학 영상·퀴즈·데이터 로그만 인정되는지 확인한다.
  - 과정이 `unknown`이면 CODE TRACE/LUMI를 어떤 비-Python 과제에도 넣지 않는다. Python 귀속을 명시적으로 확인할 수 있을 때만 Python 과제에 포함한다.

### 퀴즈 배틀 코드 반영 체크리스트

퀴즈 배틀 규정을 문서에 추가한 뒤에는 아래 구현을 함께 맞춘다.

- `scripts/export-pending-assignment-contexts.mjs`
  - `history`에서 `type === "quiz_battle"`인 기록을 일반 퀴즈 버킷에서 분리해 별도로 추출한다.
  - 분리한 배틀 기록으로 `battles`, `battleCount`, `battleWinCount`, `battleDrawCount`, `battleLossCount`, `battleForfeitCount`, `battleAverageAccuracy`, `isSufficientBattleReview`를 계산해 `learningSummary`에 저장한다.
  - `averageScore` 계산에서 배틀 점수(0~1500)를 제외한다. 일반 퀴즈 점수(0~100)만으로 평균을 낸다.
  - `buildLearningLoadSummary`의 `hasPractice` 판단에 완료 배틀(포기 제외)을 포함한다.
  - `balanceSignals`에 “퀴즈 배틀 N회 (승 W 무 D 패 L, 정답률 A%)”를 추가한다.
  - 영상 없이 배틀만 있을 때는 “퀴즈 위주 학습” 대신 “퀴즈 배틀 중심 학습(복습)” 신호를 쓴다.
- `src/services/assignmentFeedbackService.js`
  - 운영툴 “AI 피드백 생성” 경로에서도 같은 배틀 분리와 요약 필드를 생성한다.
  - `buildFeedbackPolicyGuidance`의 `hasLearningFollowUpActivity`, `isReasonableFlow` 판단에 충분한 배틀 복습(`isSufficientBattleReview`)을 포함한다.
  - 폴백 보너스 산정에서 충분한 배틀 복습은 영상 없이도 30~35광석 범위로 인정한다.
  - 자동 생성 문구에서 배틀을 “영상/퀴즈/데이터 로그”에 묻지 말고 참여 횟수·승패·정답률로 함께 언급한다.
- 저장 검증
  - 배틀만 여러 회 한 학생(예: 13회, 17회)의 `learningSummary.battles`와 `balanceSignals`에 배틀 요약이 노출되는지 확인한다.
  - 영상 0분 + 배틀 충분 시 폴백 보너스가 25에 머물지 않고 30~35로 올라가는지 확인한다.
  - 배틀 점수가 `averageScore`에 섞이지 않는지(일반 퀴즈 점수만 평균) 확인한다.
  - 중도 포기(forfeited)가 많은 경우 충분한 복습으로 인정되지 않는지 확인한다.
- 배틀이 없는 기존 Python/수학/초등수학 과제가 기존과 동일하게 동작하는지 회귀 확인한다.

### 스마트 워크북 코드 반영 체크리스트

- `assignmentFeedbackService.js`와 `scripts/export-pending-assignment-contexts.mjs` 양쪽에서 `workbook`을 일반 퀴즈 필터에서 제외하고 별도 배열과 통계를 만든다.
- 완료 전 세션은 `workbookSessionUpdatedAt` 또는 `savedAtMs`가 제출일 범위 안이고, 답안·채점 페이지·현재 페이지 중 실제 진행 증거가 있을 때만 `inProgressWorkbooks`에 넣는다.
- 진행 중 워크북을 완료로 표현하지 않는다. “3/8페이지 진행, 답안 5개 입력”처럼 현재 상태를 적는다.
- 워크북 평균은 워크북 점수만으로 계산하고 일반 퀴즈 평균과 섞지 않는다.
- `hasPractice`, `hasLearningFollowUpActivity`, `hasCourseLearningRecord`, 저학습 판단에 완료/진행 워크북을 포함한다.
- 워크북 기본 광석은 각 페이지의 “정답 확인”이 성공할 때 즉시 지급한다. “오늘은 여기까지”로 종료해도 이미 확정된 페이지 보상은 잔고와 `crystal_transactions` 원장에 남아야 한다. 전체 완료 시점에는 미지급 기존 세션분과 최초 만점 보너스만 정산한다.
- 페이지 보상은 `workbookSignature + pageId + pageAttempt`로 멱등성을 보장하고, 사용자 잔고·성장 카운터·`learning_progress.workbookPageRewardAttempts`·`crystal_transactions`를 하나의 Firestore transaction에서 함께 저장한다. 네트워크 재시도나 재접속으로 같은 페이지 시도가 중복 지급되어서는 안 된다.
- 완료 워크북은 `history.crystalsEarned`(완료 시 추가 정산분), `history.workbookPageCrystalsEarned`(페이지 즉시 지급분), `history.workbookTotalCrystalsEarned`(합계)를 구분한다. 진행 중 워크북은 `workbookSession.pageActualRewardsPaid`를 일일 학습 기록과 과제 피드백 컨텍스트에 노출한다.
- 과거 워크북 보상이 잔고/history에는 있으나 원장에 없을 때는 `node scripts/backfill-workbook-crystal-ledger.mjs`로 dry-run한 뒤 `--apply`를 붙인다. 이 도구는 잔고를 다시 지급하지 않고 누락 원장과 history의 `crystalTransactionId`만 복원하며, 금액 충돌이 있으면 쓰기를 중단한다.

### 고전 읽기 피드백 코드 반영 체크리스트

- `scripts/export-pending-assignment-contexts.mjs`
  - `western-classic`과 레거시 별칭 과제를 대기중 과제 내보내기에서 제외하지 않는다.
  - 현재 `assignment.reading`의 책 ID·제목·저자·쪽수·읽은 시각을 별도 `readingSummary`에 보존한다.
  - 같은 학생의 이전 고전 읽기 과제에서 같은 `bookId`의 가장 최근 유효 페이지를 찾는다.
  - `previousSubmittedPage`, `currentSubmittedPage`, `pagesAdvancedSincePreviousSubmission`, `comparisonState`, 비교 과제 ID·날짜를 컨텍스트에 넣는다.
  - 책이 바뀌었거나 첫 기록이면 증가량을 `0`으로 저장하지 않는다. `null`과 `first_for_book`/`book_changed` 상태로 구분한다.
  - 같은 날짜 고전 읽기 완료 퀴즈와 진행 중 퀴즈를 모두 추출하고 다른 과정 퀴즈를 제외한다.
- `src/services/assignmentFeedbackService.js`
  - 운영툴 “AI 피드백 생성”에서도 수동 export와 같은 이전 제출 선택·페이지 비교 규칙을 사용한다.
  - 고전 읽기에는 일반 과정의 영상 시간 부족, 50분 기준, 코드/CODE TRACE 요구를 적용하지 않는다.
  - 고전 읽기용 안내문과 40광석 평가표를 모델 컨텍스트 및 폴백 보너스 산정에 반영한다.
  - `pagesAdvancedSincePreviousSubmission`은 “오늘 읽은 쪽수”가 아니라 “직전 제출 이후 진행 쪽수”라는 문구 제약을 포함한다.
- 저장·운영툴 검증
  - 고전 읽기 `submitted` 과제가 수동 일괄 피드백과 운영툴 단건 생성 양쪽에 나타나는지 확인한다.
  - 첫 제출, 같은 책 진행, 같은 쪽 재독, 낮은 쪽 정정, 새 책 변경, 레거시 책 정보 없음 사례를 각각 검증한다.
  - 퀴즈 완료, 퀴즈 진행 중, 퀴즈 기록 없음 사례에서 다른 과정 기록이 섞이지 않는지 확인한다.
  - `suggestedBonusCrystals`가 항상 10~40 범위이고 만점이 40을 넘지 않는지 확인한다.

## 정규 학습 시간 기준

피드백과 보너스 광석은 아래 기준 대비로 판단한다.

| 과정 | 정규 기준 | 판단 방식 |
| --- | --- | --- |
| 초등수학 | 독서 20분 + 수학 20분 | 플랫폼 기록은 수학 20분 기준으로 보고, 독서는 제출문 근거로만 판단. 단, 초등수학을 모두 학습하고 레벨업한 학생이 초등수학 수업 시간에 중등수학을 학습한 경우에는 중등수학 영상/퀴즈/데이터 로그/풀이 정리도 초등수학 과제의 수학 학습으로 인정한다 |
| 중등수학 | 50분 | 영상, 멈춰서 풀이하는 시간, 데이터 로그, 퀴즈 기록, 제출문 정리 근거를 합쳐 학습 흐름 판단 |
| Python | 50분 | 영상, 멈춰서 코드 작성/실행/수정한 시간, 데이터 로그, 퀴즈, CODE TRACE, LUMI Protocol 미션·Trace, 원본 코드 제출을 함께 판단 |
| 고전 읽기 | 함께 읽기 약 15분 + 독서 퀴즈 | 선택한 책, 도달 쪽수, 직전 같은 책 제출 대비 진행, 같은 날짜 독서 퀴즈, 오늘 읽은 내용의 짧은 기록을 함께 판단. 페이지 수만으로 성실도를 단정하지 않는다 |

주의:

- 영상 시청은 반드시 실제 기록된 개수와 시간을 쓴다. 예: `자연수와 소수의 곱셈 #1` 1개, 4분 47초.
- 영상 시간은 전체 학습 시간을 그대로 의미하지 않는다. 학생은 영상을 멈추고 문제를 풀거나, 코드를 작성/실행하거나, 노트에 정리하는 시간이 필요하다.
- 따라서 중등수학/Python에서 영상 시간이 정규 기준의 절반 안팎이고 해당 과정의 퀴즈, 데이터 로그, 퀴즈 배틀, 코드 제출, 풀이 정리가 함께 확인되거나, **Python 과제에서만** CODE TRACE·LUMI Protocol이 확인되면 성실한 학습 흐름으로 본다. 이 경우 “기준 학습량 대비 부족”을 피드백 중심 근거로 쓰지 않는다.
- 퀴즈 배틀은 경쟁 복습/확인 활동이다. 같은 행성 학생과 1:1로 기존 학습 범위에서 출제된 문제를 풀며, 틀린 문제는 다크매터에 등록된다. 영상 시간이 짧거나 없어도 배틀을 통해 배운 개념을 확인하고 복습한 근거로 본다. 단, 중도 포기(forfeited)는 성실한 복습에서 제외한다.
- Python에서 CODE TRACE 완료 또는 의미 있는 진행 기록이 있으면 “영상 뒤 확인 활동”보다 강한 코드 실습 근거로 본다. CODE TRACE는 정답 코드를 보고 필수 이름, 클래스/함수 위치, 들여쓰기와 실행 흐름을 따라 쓰는 활동이므로, 영상 시간이 짧아도 완료율·정확도와 제출 설명이 좋으면 성실한 학습 흐름으로 인정한다.
- CODE TRACE는 퀴즈 점수처럼 단순히 100점 여부만 보지 않는다. 완료한 exercise 수, 전체 exercise 수, 정확도(`accuracy` 또는 `bestAccuracy`), 학생 제출 코드/설명과의 연결을 함께 본다.
- 진행 중 CODE TRACE도 학습 근거다. `learning_progress.codeTrace.completedExerciseCount > 0`이면 완료 전이라도 “코드 따라쓰기 진행 중”으로 언급하고, 완료로 단정하지 않는다.
- Python에서 LUMI 미션 최초 완료 기록은 코드 실행과 상태 변화 관찰이 결합된 실습 근거다. 완료 미션 수, 미션 제목/개념, 별, 도움 사용, Trace 관찰과 제출 설명의 연결을 함께 본다.
- 진행 중 LUMI도 실제 코드 실행 또는 미션 상태 변화가 있을 때 학습 근거로 인정하되 완료로 표현하지 않는다. 단순 화면 진입, 빈 초안 저장, 실패 실행 반복은 완료 미션 수나 성취로 합산하지 않는다.
- CODE TRACE와 LUMI는 Python 과제에서만 위 규칙을 적용한다. 초등수학·중등수학·고전 읽기 등 비-Python 과제에서는 같은 날짜 기록이라도 학습량과 보너스 판단에서 완전히 제외한다.
- 퀴즈 배틀은 승패가 아니라 참여 횟수와 정답률을 중심으로 평가한다(SEI 랭킹과 같은 철학). 패배해도 정답률과 참여가 학습 근거가 된다. 완료한 배틀이 3회 이상이거나 평균 정답률이 60% 이상(포기 제외)이면 충분한 복습 활동(`isSufficientBattleReview`)으로 인정한다. 이 경우 영상이 없어도 성실한 학습 흐름으로 보고 “확인 활동이 부족하다”고 쓰지 않는다.
- 퀴즈 배틀 점수(0~1500, 정답×100)는 일반 퀴즈 점수(0~100)와 체계가 다르다. 두 점수를 섞어 `averageScore`를 계산하면 안 된다. `learningSummary.battles`와 `learningSummary.quizzes`를 분리해 본다.
- 퀴즈 배틀이 충분하면 배틀에서 틀린 개념·남은 약점을 다음 행동으로 연결한다. “확인 활동이 부족하다”고 쓰지 않는다. 반대로 중도 포기가 많거나 정답률이 매우 낮으면 인정을 약하게 하되, “공부를 안 했다”고 단정하지 않고 남은 배틀 마무리나 약점 개념 영상 시청으로 유도한다.
- “영상 29.9분 / 기준 50분”처럼 숫자만 놓고 부족하다고 단정하지 않는다. 퀴즈와 데이터 로그가 있고 제출문도 과제와 맞으면 “영상 뒤 확인 활동까지 이어진 점”을 먼저 인정한다.
- 정규 기준 대비 평가는 플랫폼에 남은 직접 기록만으로 하는 보조 신호다. 학생이 플랫폼 밖에서 코드를 실행하거나 손풀이를 한 시간은 기록되지 않을 수 있으므로, 제출물의 구체성과 실행 근거를 반드시 함께 본다.
- 같은 날 다른 행성 기록은 원칙적으로 “같은 날 다른 학습도 있었다”로만 말하고, 해당 과제의 학습량으로 합산하지 않는다.
- 예외: 초등수학 과제(`cluster_elementary`)에서 학생이 초등수학을 마친 뒤 레벨업하여 초등수학 수업 시간에 중등수학을 학습한 경우, 같은 날 중등수학(`middle-math`) 기록과 중등수학 풀이 제출은 초등수학 과제의 수학 학습 근거로 인정한다. 이 경우 “초등수학 시간에 레벨업 학습으로 중등수학을 진행했다”고 표현하고, 과정 불일치나 학습 기록 없음으로 감점/경고하지 않는다.
- 특히 초등수학 과제 문서의 `clusterId`가 `cluster_elementary`여도, 학생 제출문이 `방정식`, `부등식`, `등식`, `유리수`, `절댓값`, `이차방정식`, `완전제곱식`, `다항식`, `곱셈공식`, `제곱근`, `소인수분해`, `함수`, `중등 기하`처럼 중등수학 내용을 말하면 레벨업 가능성을 먼저 의심한다. 이때 일일 학습 기록 원본 또는 내보낸 컨텍스트의 `allTitles`/중등수학 기록을 확인해 `middle-math` 퀴즈, 영상, 데이터 로그, 다크매터가 같은 날짜에 있는지 반드시 본다.
- 레벨업 감지는 제출문 키워드 정규식 **한 가지로만 하면 안 된다**. “SSS 합동을 배웠다”처럼 단원은 중등 기하인데 제출문 키워드(`기하/방정식/함수/...`)에 안 걸리면 누락된다(조하람 사례). 따라서 레벨업 여부는 아래 두 신호를 OR로 결합해 판단한다.
  1. 제출문/제목에 중등수학 키워드가 있다.
  2. 같은 날짜의 `history` 또는 `learning_progress`에 `clusterId: "middle-math"`로 분류되는 기록이 하나라도 있다.
- 신호 2(실제 데이터 기반)가 더 신뢰할 만하다. 코드는 `belongsToCourse`/`shouldIncludeCourse`에서 `includeMiddleMathLevelUp` 옵션을 받되, `fetchLearningSummary`가 `allRows`를 읽은 뒤 `middle-math` row 존재 여부로 이 옵션을 스스로 다시 켜도록 구현한다. 그래야 호출부가 키워드 신호를 놓쳐도 기록 누락이 발생하지 않는다.
- 위 레벨업 예외에서 영상 시간이 짧아도 같은 날짜 중등수학 퀴즈 여러 개, 데이터 로그, 다크매터 회복 기록이 있으면 “수학 기록 없음” 또는 “기록 없음으로 보완요청”으로 판단하지 않는다. 피드백에는 “초등수학 시간에 레벨업 학습으로 중등수학을 진행한 기록을 확인했다”고 명시한다.
- 위 레벨업 예외가 허용하는 것은 `middle-math`로 확인된 수학 활동뿐이다. 같은 날짜의 CODE TRACE·LUMI Protocol은 Python 전용이므로 초등수학 과제의 `allTitles`, 학습량, 칭찬, 보너스 근거에 포함하지 않는다.
- 위 예외는 한 방향으로만 적용한다. 중등수학 과제(`middle-math`)에서는 초등수학(`cluster_elementary`) 영상/퀴즈/데이터 로그를 중등수학 학습량으로 인정하지 않는다.
- 과제 과정과 다른 과정의 기록은 위 예외를 제외하고 피드백 근거에서 제외한다. 예: Python 과제에서 초등수학 `4월 평가` 진행 기록을 “Python 진행 중 퀴즈/코드”로 쓰면 안 된다.
- 과정이 명확하지 않은 진행 중 퀴즈나 `learning_progress` 문서는 현재 과제의 학습 근거로 쓰지 않는다. 과정이 불명확하면 “다른 과정 또는 과정 미확인 기록”으로 제외하고, 피드백에는 포함하지 않는다. 단, 과정 분류 자체가 실패해서 누락된 경우는 `units → chapters → regions` 역추적과 아래 “NFD 인코딩” 항목을 반드시 확인한다.
- `learningSummary`의 기준 필드는 `videos`, `quizzes`, `workbooks`, `dataLogs`, `inProgressQuizzes`, `inProgressWorkbooks`, `progressVideos`, 퀴즈 배틀의 `battles`, 그리고 **Python 과제에 한해서만** `codeTraces`, `inProgressCodeTraces`, `lumiProtocols`, `inProgressLumiProtocols`다. 완료 기록뿐 아니라 실제 진행이 있는 활동도 근거로 인정하되, 학생이 끝까지 완료하지 않으면 `history`가 아니라 `learning_progress`에만 남을 수 있으므로 두 컬렉션을 합쳐 본다.
- `learningSummary.allTitles`는 필터링을 마친 참고용 기록이다. 피드백 문장의 기준은 과정별 배열이며, 비-Python 과제의 `allTitles`와 `progressTitles`에는 CODE TRACE·LUMI 제목 자체가 들어가면 안 된다.
- `learningSummary.progressTitles`와 `progressVideos`는 진행/부분 시청 참고용이다. 완료 영상 개수처럼 말하지 않는다.
- `learningSummary.codeTraces`는 완료된 CODE TRACE 기록이다. 피드백에는 완료한 단원명, 정확도, 완료 exercise 수를 우선 적는다.
- `learningSummary.inProgressCodeTraces`는 진행 중 CODE TRACE 기록이다. 피드백에는 완료로 쓰지 말고 “진행 중: 2/5, 최고 정확도 86%”처럼 현재 상태를 적는다.
- `learningSummary.lumiProtocols`는 Python 과제에서 제출일에 최초 완료한 LUMI 미션 기록이다. 완료 미션명·학습 개념·별/도움·Trace 기반 실습을 적고, `lumiProtocolCrystalsEarned`는 앱 내부 지급 사실로만 표시한다.
- `learningSummary.inProgressLumiProtocols`는 Python 과제의 진행 중 미션이다. 실제 진행이 있을 때만 “진행 중”으로 적고 완료·광석 획득으로 표현하지 않는다.
- `learningSummary.battles`는 완료/포기된 퀴즈 배틀 기록이다. 피드백에는 참여 횟수, 승패(승 W 무 D 패 L), 평균 정답률을 함께 적는다. 예: “퀴즈 배틀 5회 (승 4 무 0 패 1, 정답률 72%)로 기존 학습 범위를 경쟁하며 복습했습니다.” 배틀 점수(0~1500)는 일반 퀴즈 점수(0~100)와 섞지 않는다.
- `learningSummary.workbooks`는 완료 워크북, `inProgressWorkbooks`는 이어 풀기 세션이다. 예: “스마트 워크북 2건을 완료해 평균 85점이었고, 다음 워크북은 3/8페이지까지 진행했습니다.” 일반 퀴즈 평균과 워크북 평균을 합치지 않는다.
- **한글 NFD 인코딩 주의**: `history`/`learning_progress` 문서의 한글 제목/unitId/unitTitle이 NFD(분해 자모, 예: `중2_05_일차함수`)로 저장되는 경우가 있다. 코드가 비교 전에 NFC(`중2_05_일차함수`)로 정규화하지 않으면 `clusterId`, `regionId`, `chapterId`, 제출문 키워드 비교가 실패해 기록이 누락될 수 있다. 모든 과정 정규화/메타데이터 역추적 함수는 입력을 NFC로 정규화한 뒤 비교해야 한다. 제출문 한글 비교(`hasMiddleMathLevelUpSignal`)도 마찬가지다.
- 초등수학에서 독서퀴즈/독서 활동만 있고 초등수학 또는 중등수학 수학 영상, 수학 퀴즈, 데이터 로그가 모두 없으면 수학 20분 학습이 비어 있다는 점을 반드시 언급한다.
- 이때 독서 활동은 인정하되, “오늘 수학 기록은 아직 확인되지 않았어요. 다음 시간에는 수학 영상 뒤에 확인 퀴즈까지 이어가면 좋겠습니다.”처럼 부드럽게 안내한다.

## 고전 읽기 과제 전용 피드백 규칙

적용 대상은 `clusterId`가 `western-classic`, `서양고전`, `서양고전읽기`, `classic`, `classics` 중 하나인 과제다. 고전 읽기는 약 15분 동안 함께 책을 읽고, 어디까지 읽었는지 기록하고, 관련 퀴즈를 푸는 활동이다. 따라서 중등수학/Python의 50분 영상 기준, 코드 실행 근거, 데이터 로그 균형을 요구하지 않는다.

### 평가에 사용하는 근거

현재 제출에서 확인한다.

- `assignment.reading.bookId`
- `assignment.reading.title`, `assignment.reading.author`
- `assignment.reading.page`
- `assignment.reading.readAt`, `assignment.reading.readDateKst`
- `assignment.content`: 오늘 읽은 내용에 대한 짧은 기록
- 같은 날짜 고전 읽기 퀴즈 완료 기록과 진행 중 기록
- 같은 학생의 이전 고전 읽기 과제 중 같은 `bookId`의 가장 최근 제출

`readingBooks.progress.furthestPage`는 현재보다 나중에 입력한 책장 기록까지 반영될 수 있으므로, 과거 과제 사이의 페이지 증가량 기준으로 사용하지 않는다. 반드시 **과제 제출 당시 저장된 `assignment.reading.page`끼리 비교**한다.

퀴즈 기록은 다음 순서로 확인한다.

1. 같은 날짜 `history`의 고전 읽기 완료 퀴즈
2. 같은 날짜 `learning_progress`의 고전 읽기 진행 중 퀴즈
3. 과정 메타데이터가 불명확하면 `units → chapters → regions`를 역추적해 고전 읽기 과정인지 확인

완료 퀴즈가 없더라도 진행 중 퀴즈가 실제로 시작되었다면 “퀴즈 기록 없음”으로 쓰지 않는다. 반대로 다른 과정의 퀴즈는 고전 읽기 활동으로 합산하지 않는다.

### 직전 제출 대비 페이지 계산

비교 대상은 아래 조건을 모두 만족하는 이전 제출 한 건이다.

1. 같은 학생의 과제다.
2. 고전 읽기 군집 과제다.
3. 현재 과제보다 `reading.readAt` 또는 제출일이 앞선다.
4. 현재 과제와 `reading.bookId`가 같다.
5. `reading.page`가 1~99,999 범위의 정수다.

조건을 만족하는 과제를 최신순으로 정렬해 첫 번째 과제를 기준으로 삼는다.

```text
pagesAdvancedSincePreviousSubmission = currentSubmittedPage - previousSubmittedPage
```

예:

```text
직전 제출: 『어린 왕자』 42쪽
이번 제출: 『어린 왕자』 57쪽
직전 제출 이후 진행: +15쪽
```

피드백에는 “오늘 15쪽을 읽었다”고 단정하지 않고, **“지난 제출의 42쪽에서 이번에는 57쪽까지, 직전 제출보다 15쪽 더 진행했어요”**라고 쓴다. 두 제출 사이에 책장에서 별도로 읽은 기록이 있을 수 있기 때문이다.

비교 상태는 다음처럼 저장하거나 컨텍스트에 제공하는 것을 권장한다.

| `comparisonState` | 의미 | 피드백 처리 |
| --- | --- | --- |
| `advanced` | 같은 책의 현재 쪽수가 이전보다 큼 | 증가한 쪽수를 구체적으로 칭찬하고 퀴즈·내용 기록과 함께 평가 |
| `same_page` | 같은 책의 쪽수가 이전과 같음 | 재독, 과제 수정, 입력 실수 가능성을 확인. 내용 기록이나 퀴즈가 새로우면 자동 감점하지 않음 |
| `lower_page` | 같은 책의 현재 쪽수가 이전보다 작음 | 판본 변경, 재독, 이전 입력 오류 가능성을 확인. 음수 진행으로 표현하거나 자동 감점하지 않음 |
| `first_for_book` | 같은 책의 비교 가능한 이전 제출 없음 | 첫 기준점으로 기록. 비교 자료가 없다는 이유로 감점하지 않음 |
| `book_changed` | 직전 고전 읽기 제출과 책이 다름 | 서로 다른 책의 쪽수를 빼지 않음. 새 책의 첫 기준점으로 평가 |
| `legacy_or_missing` | 현재 또는 이전 과제에 책 ID/유효 페이지가 없음 | 확인 가능한 제목·저자·본문만 사용하고 페이지 증가량을 만들지 않음 |

상태 우선순위도 고정한다. 같은 `bookId`의 비교 가능한 이전 제출이 있으면 직전 고전 읽기 제출이 다른 책이더라도 그 같은 책 기록과 비교해 `advanced`·`same_page`·`lower_page` 중 하나를 사용한다. 같은 책 기록은 없지만 다른 책의 이전 고전 읽기 제출이 있으면 `book_changed`, 이전 고전 읽기 제출 자체가 없으면 `first_for_book`으로 둔다. 현재 책 ID나 쪽수가 유효하지 않으면 다른 상태보다 `legacy_or_missing`을 우선한다.

같은 제목이라도 판본에 따라 쪽수가 다를 수 있으므로 제목만 같다는 이유로 페이지를 빼지 않는다. `bookId`가 같을 때만 정확한 증가량을 계산한다. 레거시 과제에 `bookId`가 없으면 제목·저자는 참고로만 쓰고 `pagesAdvancedSincePreviousSubmission`은 `null`로 둔다.

### 페이지 증가량 해석 원칙

- 페이지 증가가 1쪽이라도 실제로 읽고 퀴즈와 내용 기록을 남겼다면 학습으로 인정한다.
- 책마다 글자 크기, 판형, 주석, 문장 난도가 다르므로 “15분이면 최소 N쪽” 같은 획일적 최저 기준을 만들지 않는다.
- 수업 운영상 함께 읽는 시간이 약 15분이라는 사실과 개별 학생이 정확히 15분 읽었다는 사실은 구분한다. 별도 시간 기록이 없으면 “15분을 모두 읽었다”고 단정하지 말고 책·쪽수·퀴즈·내용 기록으로 활동을 설명한다.
- 많은 쪽수를 기록했다는 이유만으로 자동 만점을 주지 않는다. 오늘 읽은 내용과 퀴즈가 해당 책의 흐름과 맞는지 함께 본다.
- 페이지가 그대로여도 어려운 부분을 다시 읽고 새 퀴즈를 풀었거나 내용 기록이 구체적이면 재독 활동으로 인정할 수 있다.
- 페이지가 낮아졌다면 “퇴보했다”, “덜 읽었다”고 쓰지 않는다. 판본 변경·재독·기록 정정 여부를 운영자 확인 포인트로 남긴다.
- 페이지 증가량은 학생 간 비교나 순위에 사용하지 않고, 같은 학생·같은 책의 독서 연속성을 설명하는 근거로만 사용한다.

### 고전 읽기 40광석 평가표

고전 읽기 과제의 만점은 40광석이다. 아래 네 항목을 각 0~10광석으로 판단한다. 점수는 페이지 수의 많고 적음보다 기록의 신뢰성과 독서 활동의 연결을 본다.

| 항목 | 10광석 | 5~8광석 | 0~4광석 |
| --- | --- | --- | --- |
| 책·쪽수 기록 | 책 ID, 제목, 저자, 유효한 도달 쪽수가 서로 일치 | 일부 스냅샷이 없지만 책과 쪽수를 판단 가능 | 책 선택/쪽수가 없거나 서로 충돌해 무엇을 읽었는지 확인 곤란 |
| 독서 연속성 | 같은 책에서 진행이 확인되거나, 첫 제출/책 변경의 기준점이 명확함. 재독이면 새 활동 근거가 있음 | 같은 쪽수·낮은 쪽수의 이유가 불명확하지만 내용/퀴즈 일부 확인 | 이전 기록을 그대로 복사한 정황이 강하고 새 활동 근거도 없음 |
| 독서 퀴즈 | 완료 퀴즈 또는 의미 있는 진행 기록이 확인됨. 정답률이 낮아도 끝까지 시도하고 오답을 확인함 | 퀴즈를 시작했으나 진행이 매우 적거나 기록이 부분적 | `history`와 `learning_progress`를 모두 확인했는데도 해당 과정 퀴즈 근거가 없음 |
| 오늘 읽은 내용 | 짧아도 책의 인물·사건·생각·인상 중 하나를 자기 말로 구체적으로 기록 | 책과 관련은 있으나 매우 일반적이거나 이전 문장과 거의 같음 | 책 내용과 맞지 않거나 의미 있는 기록이 없음 |

첫 제출 또는 새 책으로 바꾼 제출은 이전 페이지가 없다는 이유로 연속성 점수를 깎지 않는다. 유효한 첫 기준점을 남기고 퀴즈와 내용 기록이 확인되면 40광석도 가능하다.

권장 총점 해석:

| 광석 | 고전 읽기 과제 판단 |
| --- | --- |
| 40 | 책·쪽수 기록이 정확하고, 직전 제출 이후 진행 또는 유효한 첫 기준점이 있으며, 퀴즈 활동과 짧은 내용 기록이 모두 확인됨 |
| 35 | 독서 진행과 내용 기록은 분명하나 퀴즈가 진행 중이거나, 네 근거 중 하나가 조금 약함 |
| 30 | 책·쪽수와 실제 독서 근거는 확인되며, 퀴즈 또는 내용 기록 중 하나가 약함 |
| 20~25 | 제출은 유효하지만 페이지 연속성, 퀴즈, 내용 기록 중 둘 이상이 충분히 확인되지 않음 |
| 10 | 책/쪽수 누락, 제출 내용 불일치, 이전 기록 복사 등으로 실제 독서 활동을 확인하기 매우 어려움 |

`aiFeedbackRubricScores`에는 일반 과정 점수와 혼동되지 않도록 고전 읽기 하위 점수를 별도로 남기는 것을 권장한다.

```json
{
  "classicReading": {
    "bookAndPage": 10,
    "continuity": 10,
    "quizActivity": 10,
    "readingNote": 10,
    "total": 40,
    "previousSubmittedPage": 42,
    "currentSubmittedPage": 57,
    "pagesAdvancedSincePreviousSubmission": 15,
    "comparisonState": "advanced"
  }
}
```

`total`은 네 하위 점수의 합과 같아야 하고 40을 넘을 수 없다. 비교할 이전 제출이 없으면 페이지 필드는 `null`로 두고 `comparisonState`로 이유를 남긴다.

퀴즈 점수가 낮다는 사실만으로 20광석 이하로 내리지 않는다. 오답은 읽은 내용을 다시 확인할 지점을 알려 주는 학습 근거다. 퀴즈를 성실하게 시도했다면 시도를 인정하고, 틀린 인물·사건·순서를 다음 읽기에서 한 번 더 확인하도록 안내한다.

### 고전 읽기 승인·보완요청 기준

다음 경우는 기본적으로 `reviewed`를 제안한다.

- 유효한 책과 쪽수가 있고, 짧더라도 오늘 읽은 내용이 책과 맞는다.
- 페이지 증가가 작거나 같은 쪽수여도 퀴즈 또는 재독 내용이 확인된다.
- 퀴즈 점수가 낮지만 실제 응시 기록이 있다.
- 첫 제출 또는 새 책의 첫 제출이라 이전 페이지 비교가 불가능하다.

다음 경우에만 `needs_revision`을 검토한다.

- 책 또는 쪽수가 없어 어떤 독서 활동인지 확인할 수 없다.
- 선택한 책과 제출 내용이 명백히 다르다.
- 유효 범위를 벗어난 쪽수나 앞뒤가 맞지 않는 기록이 있고 확인 설명도 없다.
- 이전 제출문을 그대로 복사했고 새 페이지 진행·퀴즈·새 내용 근거가 모두 없다.

페이지 증가가 적다는 이유, 퀴즈 오답이 많다는 이유, 첫 제출이라 비교값이 없다는 이유만으로 보완요청하지 않는다.

### 고전 읽기 피드백 권장 구조

```markdown
### 고전 읽기 피드백

{학생 이름}님은 오늘 『{책 제목}』을 {현재 쪽수}쪽까지 읽고, {읽은 내용의 짧은 요약}을 기록했어요.

#### 지난 제출과 비교
{같은 책의 이전 제출이 있으면: 지난 제출의 {이전 쪽수}쪽에서 이번에는 {현재 쪽수}쪽까지, 직전 제출보다 {증가 쪽수}쪽 더 진행했어요.}
{비교할 제출이 없으면: 이 책은 이번 기록을 첫 독서 기준점으로 남겼어요.}

#### 퀴즈에서 확인한 점
{완료/진행 중 퀴즈 수, 점수 또는 오답에서 확인할 내용. 기록이 없으면 history와 learning_progress를 모두 확인했다는 전제에서만 안내}

#### 잘한 점
{페이지 수 자체가 아니라 꾸준히 이어 읽은 점, 퀴즈 시도, 자기 말로 남긴 내용 중 구체 근거}

#### 다음 읽기에서 확인할 점
{퀴즈에서 헷갈린 인물·사건·순서 또는 오늘 기록에서 한 가지. 새 과제나 장문의 감상문을 요구하지 않음}
```

좋은 예:

```markdown
지난 제출에서는 『어린 왕자』를 42쪽까지 읽었고, 이번에는 57쪽까지 기록했어요. 직전 제출보다 15쪽 더 진행했고, 여우가 관계를 맺는 데 시간이 필요하다고 말한 장면을 자기 말로 남긴 점이 좋았습니다. 독서 퀴즈도 끝까지 풀었어요. 틀린 문제에 나온 “길들인다”의 뜻만 다음 읽기 전에 한 번 다시 떠올려 보면 충분합니다.
```

피해야 할 예:

```markdown
15분 동안 15쪽을 읽었으니 분당 1쪽으로 학습량이 충분합니다. 다음에는 20쪽 이상 읽으세요.
```

위 문구가 부적절한 이유:

- 과제 제출 사이의 +15쪽은 오늘 15분 동안 읽은 정확한 분량이라는 뜻이 아니다.
- 책마다 판형과 난도가 다르므로 분당 쪽수나 최소 쪽수를 평가 기준으로 삼을 수 없다.
- 고전 읽기의 다음 행동은 더 많은 페이지 경쟁이 아니라, 읽은 흐름을 이어가고 퀴즈에서 헷갈린 내용을 확인하는 것이다.

## 피드백 품질 기준

대기중 과제가 많아도 피드백은 학생별로 달라야 한다. 다음 기준을 지킨다.

- 첫 문단은 “과제 제출을 확인했습니다”로 끝내지 말고, 오늘 학생이 실제로 제출한 내용이나 학습 기록을 한 문장 이상 넣는다.
- `잘한 점`은 일반 칭찬이 아니라 확인된 행동을 칭찬한다. 예: “영상 뒤에 퀴즈까지 이어간 점”, “코드에서 직접 바꾼 변수명/조건문”, “오답이 있었지만 다시 시도한 흔적”.
- `이전보다 좋아진 점`은 이전 제출과 비교할 근거가 있을 때만 구체적으로 쓴다. 비교 근거가 부족하면 “최근 흐름과 비교해 확인할 데이터가 더 필요하다”처럼 억지로 칭찬하지 않는다.
- `더 발전시키면 좋은 점`은 “더 열심히 하자”가 아니라 다음 제출에서 확인 가능한 행동 1~2개로 좁힌다.
- 같은 문장 틀을 여러 학생에게 반복하지 않는다. 작업 후에는 대표 문구가 과도하게 반복되지 않았는지 눈으로 확인한다.

피해야 할 문장:

- “기준 학습량 대비 조금 부족: 영상 29.9분 / 기준 50분”
- “다음에는 영상 뒤에 퀴즈나 데이터 로그 확인까지 이어가면 좋겠습니다.”라고 쓰면서 이미 해당 과정의 퀴즈·데이터 로그가 있거나, Python 과제에 CODE TRACE·LUMI가 있는 경우
- “영상 시간이 부족합니다.”라고만 쓰고 코드 작성, 실행, 정리, 해당 과정의 퀴즈·데이터 로그를 보지 않거나, Python 과제의 CODE TRACE·LUMI를 보지 않은 경우
- “좋은 시도입니다.”처럼 제출물의 어떤 부분이 좋은지 말하지 않는 빈 칭찬

대신 이렇게 쓴다:

- “영상 29.9분에 퀴즈와 데이터 로그까지 이어진 점을 보면, 단순히 보기만 한 기록은 아닙니다. 다음에는 풀이 과정에서 막힌 부분 1가지를 제출문에 더 적어 주면 선생님이 이해 상태를 더 정확히 볼 수 있어요.”
- “오늘은 영상 절반가량을 보고 확인 활동까지 남겼으니 학습 흐름은 괜찮습니다. 더 좋아지려면 퀴즈에서 틀린 문제를 왜 틀렸는지 한 줄만 덧붙여 주세요.”
- “Python 과제에서는 영상 시간보다 코드 실행 근거가 중요합니다. 오늘 제출한 코드에서 직접 바꾼 줄과 실행 결과가 보이면 그 부분을 중심으로 칭찬하고, 실행 결과가 없을 때만 다음 행동으로 요청합니다.”
- “오늘은 영상보다 CODE TRACE 중심 학습입니다. `Game` 클래스 구조를 4/4까지 따라 쓰고 정확도 92%가 확인되어, 코드를 손으로 익히는 연습은 충분히 남았습니다. 다음에는 따라 쓴 코드에서 직접 바꾼 줄 1곳을 설명해 주세요.”

## 이름 우선순위

학생들은 부모님 구글 계정을 쓰는 경우가 많으므로 구글 프로필명보다 메타센스 수정 이름을 반드시 우선한다.

이름 우선순위:

1. `users/{uid}.studentName`
2. `assignments/{assignmentId}.userName`
3. `users/{uid}.publicDisplayName`
4. `users/{uid}.name`
5. `users/{uid}.displayName`

예: `users.name`이 `김영광`이어도 `users.studentName` 또는 `assignment.userName`이 `김리아`이면 피드백에는 `김리아님`을 쓴다.

## 1. 대기중 과제 자료 내보내기

```bash
node scripts/export-pending-assignment-contexts.mjs --out=/private/tmp/pending_assignment_contexts.json
```

이 스크립트는 Firestore에서 다음 자료를 읽어 로컬 JSON으로 저장한다.

- 대기중 과제 본문
- 제출 본문에 포함된 학생 질문
- 첨부파일명과 링크
- 첨부파일/링크로 제출된 원본 코드 또는 원본 자료
- 코드 첨부 원문 일부와 이전 같은 과정 코드 첨부 비교 결과
- 메타센스 프로필명
- 같은 학생의 이전 과제 5건
- 고전 읽기 과제의 현재 독서 스냅샷
  - `bookId`, 책 제목, 저자, 도달 쪽수, 읽은 날짜·시각
  - 같은 `bookId`의 가장 최근 이전 과제와 그 제출 당시 쪽수
  - `previousSubmittedPage`, `currentSubmittedPage`, `pagesAdvancedSincePreviousSubmission`, `comparisonState`
  - 같은 책 이전 제출이 없거나 책이 바뀌었으면 증가량을 `0`으로 만들지 말고 `null`과 명시적 비교 상태를 사용
- 같은 날짜 다른 제출
- 제출일 학습 기록 상세
  - 영상 시청 시간
  - 집중도 광석 획득/놓침
  - 타임어택 성공/실패
  - 완료 보너스 획득/놓침
  - 완료 또는 진행 중 퀴즈 현황
  - Python CODE TRACE 완료/진행 현황
    - 완료 기록: `history.type === "code_trace"`의 단원명, 정확도, 완료 exercise 수, 획득 광석
    - 진행 기록: `learning_progress.codeTrace.completedExerciseCount`, `totalExerciseCount`, `bestAccuracy`, `lastMode`, `updatedAt`
  - Python LUMI Protocol 완료/진행 현황
    - 완료 기록: `history.type === "lumi_protocol"`의 미션명, 개념, 별, 도움 수준, 획득 광석
    - 진행 기록: `learning_progress/lumi_protocol_vertical_slice.missionLab`의 완료 미션 수, 전체 미션 수, 최근 미션, 누적 획득 광석
  - 퀴즈 배틀 완료/포기 현황
    - 완료 기록: `history.type === "quiz_battle"`의 참여 횟수, 승패(win/draw/loss), 정답률(correctCount/totalCount), 중도 포기(forfeited) 여부
    - 배틀 점수(0~1500)는 일반 퀴즈 점수(0~100)와 체계가 다르므로 분리해서 본다
  - 과정별 정규 학습량 대비 수준
  - 해당 과정의 영상/퀴즈/데이터 로그/퀴즈 배틀 균형과 Python 과제의 CODE TRACE/LUMI 균형
  - `history`(완료 활동)와 `learning_progress`(진행 중 퀴즈/부분 시청 영상, Python의 진행 중 CODE TRACE/LUMI)를 **모두** 읽어 합친다. 어느 한쪽만 읽으면 실제 진행 기록이 “0건”으로 누락된다.
- 매터센스/복습 기록 요약
  - 최근 오답/복습 표시 개념
  - 문제 미리보기
  - 마지막 실패/복습 시점

## 2. Codex가 직접 검토해 피드백 JSON 작성

출력 파일 `/private/tmp/pending_assignment_contexts.json`을 읽고, 과제별로 직접 피드백을 작성한다. 저장 파일은 아래 경로를 사용한다.

주의: 이미 Firestore에 저장된 `aiFeedbackDraft`는 로직이나 문서가 바뀌어도 자동으로 고쳐지지 않는다. 금지 문구나 다른 과정 기록 오인이 발견되면 해당 과제의 AI 피드백을 다시 생성하거나, 이 문서 기준으로 수동 교체한 뒤 저장해야 한다.

```text
/private/tmp/manual_assignment_feedbacks.json
```

형식:

```json
{
  "assignmentId": {
    "studentFeedback": "### 과제 피드백\n\n...",
    "suggestedBonusCrystals": 40,
    "suggestedStatus": "reviewed",
    "revisionRequest": ""
  }
}
```

모든 `submitted` 과제 ID가 빠짐없이 들어가야 한다. 스크립트가 ID 누락/초과를 검증한다.

작성 기준:

- 학생 호칭은 각 컨텍스트의 `displayName` 값을 그대로 사용한다.
- `student.name`, `student.displayName`은 구글/부모 계정 이름일 수 있으므로 호칭 판단에 직접 쓰지 않는다.
- 과제 내용, 첨부파일, 학습 기록, 이전 제출 기록에 근거가 있는 내용만 쓴다.
- 고전 읽기 과제는 반드시 위 “고전 읽기 과제 전용 피드백 규칙”을 적용한다. 수학/Python 영상 시간이나 50분 기준을 적용하지 않고, 현재 책·도달 쪽수·직전 같은 책 제출 대비 진행·독서 퀴즈·짧은 내용 기록으로 최대 40광석을 판단한다.
- 고전 읽기의 페이지 증가량은 같은 `bookId`의 이전 과제 제출 스냅샷과만 비교한다. `readingBooks.progress`나 다른 판본의 쪽수를 기준으로 삼지 않는다.
- 고전 읽기에서 `pagesAdvancedSincePreviousSubmission`을 “오늘 읽은 쪽수”로 바꾸어 말하지 않는다. 반드시 “직전 제출보다 N쪽 더 진행”이라고 표현한다.
- Python 또는 코드 제출 과제는 제출 본문뿐 아니라 첨부파일/링크의 원본 코드까지 확인한다. 첨부 원본 코드, 제출 본문에 붙여 넣은 코드, 제출하면서 기입한 설명 텍스트가 서로 맞지 않으면 반드시 운영자 확인 포인트로 남긴다.
- Python 과제에서 제출일 Python 학습 기록이 없더라도 첨부 코드가 있으면 코드 자체는 반드시 검토한다. 이때 피드백은 “Python 학습 기록은 확인되지 않지만, 첨부 코드에서는 어떤 변화가 보인다”처럼 학습 기록과 코드 검토를 분리해서 쓴다.
- Python 첨부 코드가 있으면 같은 학생의 이전 Python 제출 첨부와 비교해 새로 추가된 기능, 수정된 함수/클래스, 실행 결과 확인 여부를 피드백에 반영한다.
- Python 과제에서 CODE TRACE 기록이 있으면 영상/퀴즈와 분리해 반드시 언급한다. 예: “오늘은 `몬스터 잡기 게임` CODE TRACE를 5/5 완료했고 정확도 92%로 구조를 따라 쓰는 연습을 했습니다.”
- Python 과제에서 LUMI Protocol 기록이 있으면 영상·퀴즈·CODE TRACE와 분리해 반드시 언급한다. 예: “오늘은 LUMI `첫 걸음` 미션을 완료하며 `lumi.move()`를 실행하고 Trace에서 위치 변화를 확인했습니다.”
- LUMI 완료는 미션 성공과 최초 완료 기록이 모두 확인될 때만 쓴다. 진행 중에는 “현재 `변수 전달` 미션을 진행 중”처럼 표현하고, 실패 실행·Reset·재실행 횟수를 학습량으로 부풀리지 않는다.
- LUMI에서 받은 광석은 앱 내부 학습 보상으로만 설명한다. 예: “LUMI 미션 최초 완료 보상 4광석도 획득했습니다.” 이를 과제 보너스에 다시 더하거나 같은 보상을 두 번 지급하지 않는다.
- CODE TRACE 완료 기록은 코드 실습 근거로 인정한다. 영상 시간이 짧더라도 CODE TRACE 완료율과 정확도가 좋고 제출문이 해당 코드 구조를 설명하면 저학습 경보를 피한다.
- 진행 중 CODE TRACE는 완료로 포장하지 않는다. 예: “CODE TRACE는 2/5까지 진행 중이고 최고 정확도 86%입니다. 다음에는 남은 3개를 마무리해 주세요.”
- CODE TRACE는 “베껴 썼다”는 부정적 표현으로 다루지 않는다. 정답 코드를 보고 따라 쓰는 것이 목적이므로, 피드백에는 “필수 이름과 구조를 정확히 따라 쓰는 연습”, “클래스/함수 위치와 들여쓰기 흐름을 익히는 연습”으로 설명한다.
- CODE TRACE만 있고 제출 코드나 실행 결과가 없을 때는 CODE TRACE 자체는 인정하되, 다음 행동은 “따라 쓴 코드에서 직접 바꾼 줄 1~2곳 또는 실행 결과를 적기”로 둔다.
- CODE TRACE 정확도가 낮거나 완료율이 낮으면 감점 문구보다 다음 행동을 구체화한다. 예: “`__init__`, `update`, `draw`의 위치가 아직 헷갈린 신호일 수 있으니 다음 제출에서는 이 세 함수 이름을 먼저 적고 시작해 보세요.”
- 퀴즈 배틀 기록이 있으면 영상/일반 퀴즈와 분리해 반드시 언급한다. 예: “오늘은 퀴즈 배틀 5회(승 4 무 0 패 1, 정답률 72%)로 기존 학습 범위를 경쟁하며 복습했습니다.” 승패보다 참여 횟수와 정답률을 중심으로 평가한다.
- 퀴즈 배틀만 있고 영상·코드·일반 퀴즈가 없을 때는 배틀 자체는 인정하되, 다음 행동은 “배틀에서 틀린 개념 1가지를 영상이나 퀴즈로 다시 확인하기”로 둔다. 영상이 없다는 이유만으로 저학습 경보로 쓰지 않는다.
- 중도 포기(forfeited)가 많거나 정닥률이 매우 낮은 배틀은 성실 복습에서 약하게 인정한다. 다만 “공부를 안 했다”고 단정하지 않고, 남은 배틀 마무리나 약점 개념 영상 시청으로 유도한다.
- 같은 파일명 이력이 있으면 같은 파일명을 우선 비교한다. 예: 현재 `add_sound.py`는 최근 `new.py`보다 이전 `add_sound.py`와 먼저 비교해야 한다.
- 비교 결과 코드 내용이 이전 같은 파일과 동일하면 “첨부 코드는 확인되지만 이번 제출에서 새로 개선된 코드 변화는 확인되지 않는다”고 쓴다. 동일 코드 재제출을 “이전보다 좋아진 점”으로 포장하지 않는다.
- 반대로 영상 기록이 1분 안팎으로 짧아 경고 대상이어도, 코드 비교에서 구조적 개선이 확인되면 그 개선은 인정한다. 이때 경고 문구는 “확인 활동이 없습니다”가 아니라 “코드 개선은 확인되지만, 학습 기록과 제출 설명이 크게 맞지 않습니다”처럼 분리해서 쓴다.
- 평소 성실한 학생이라도 해당 날짜 기록이 정책 기준에 미달하면 경고는 가능하다. 다만 피드백에는 “평소 흐름은 좋지만 오늘은 기록 관리가 맞지 않았다”는 식으로 회복 가능한 행동을 제시한다.
- 이전 첨부 코드 원문을 읽을 수 없으면 비교를 지어내지 말고 “이전 코드 원문 확인이 필요하다”고 운영자 확인 포인트로 남긴다.
- 내보낸 컨텍스트에 원본 코드 내용이 없고 첨부 URL만 있으면, 해당 URL의 원본 파일을 내려받아 확인한다. 내려받은 파일이 비어 있거나 실패하면 피드백과 운영자 요약에 “첨부 원본 확인 필요”를 남긴다.
- 정해진 커리큘럼을 벗어나는 별도 다음 미션은 쓰지 않는다.
- `learningSummary.concernSignals`가 있으면 반드시 `더 발전시키면 좋은 점`에 반영한다.
- `learningSummary.learningLoad`는 참고하되, 영상 시간만으로 충분/부족을 단정하지 않는다. 해당 과정의 퀴즈, 데이터 로그, 코드 제출, 실행 결과, 손풀이/정리 흔적을 함께 보고, Python 과제에서만 CODE TRACE·LUMI를 더한다.
- 초등수학은 `learningSummary.mathActivityCount`, `readingActivityCount`, `readingQuizCount`를 함께 본다. 독서 기록만으로 수학 학습을 했다고 쓰지 않는다.
- 초등수학 과제에서 제출문이 다항식, 제곱근, 소인수분해, 방정식, 함수, 중등 기하처럼 중등수학 내용이고, 학생이 레벨업 학습자인 정황이 있으면 `learningSummary`에 초등수학 기록이 0건이어도 바로 “수학 기록 없음”으로 판단하지 않는다. 같은 날짜 중등수학 기록, `sameDay`, `allTitles`, 제출문 풀이 근거를 추가 확인하고, 확인되면 초등수학 과제의 수학 학습으로 인정한다.
- 초등수학 과제에서 `learningSummary.videos`, `quizzes`, `dataLogs`가 비어 있는데 제출문이 중등수학 내용이면, 이것은 “학습 기록 없음” 확정이 아니라 “초등수학 필터에 중등수학 레벨업 기록이 빠졌을 가능성”이다. 이 경우 Firestore `users/{uid}/history`의 해당 날짜 원본 또는 내보낸 `allTitles`를 확인해 `clusterId: "middle-math"` 기록이 있는지 점검한다.
- 레벨업 중등수학 기록이 확인되면 `learningSummary.mathActivityCount`가 0이더라도 피드백 근거에 중등수학 퀴즈/영상/데이터 로그를 직접 적고, `suggestedStatus`는 정상 `reviewed`를 우선 검토한다. 단, 제출문이 한 문장으로 너무 짧으면 “다음에는 퀴즈 중 헷갈린 유형 1개를 적어 달라”처럼 제출문 구체성만 보완점으로 둔다.
- 반대로 중등수학 과제에서 초등수학 기록만 확인되는 경우에는 레벨업 예외를 적용하지 않는다. 중등수학 과제는 중등수학 기록, 중등수학 풀이 근거, 또는 해당 중등수학 첨부/코드만 학습 근거로 본다.
- 영상 개수와 시간은 `learningSummary.videos` 기준으로만 적는다.
- 영상만 있고 해당 과정의 퀴즈, 데이터 로그, 퀴즈 배틀, 코드 실행 근거, 제출문 정리 중 아무것도 없을 때만 “확인 활동이 부족하다”고 안내한다. Python 과제에서는 CODE TRACE·LUMI도 먼저 확인하고, 이미 있으면 해당 실습을 인정한다.
- 퀴즈가 진행 중이면 완료로 단정하지 말고 진행도와 오답 수를 함께 언급한다.
- `learningSummary.attention.opportunities > 0`이면 집중도 광석 획득률을 확인하고, 낮을 때는 부드럽지만 구체적으로 언급한다.
- `learningSummary.inProgressQuizzes`가 있으면 완료 여부보다 현재 진행도와 오답 개수를 함께 본다.
- `darkMatterSummary.concepts` 또는 `darkMatterSummary.items`가 있으면 “어떤 개념이 아직 불안정한지”를 피드백에 연결한다.
- 제출문만 길게 요약하고 학습 기록/매터센스를 언급하지 않는 피드백은 불합격으로 보고 다시 작성한다.
- 제출 원본, 제출문, 학습 기록 사이에 불일치가 있으면 “좋은 시도”로 뭉개지 않는다. 예: 첨부 원본 코드에는 `draw()` 메서드가 없는데 제출 본문 코드에는 `draw()`가 있는 것처럼 적혀 있거나, 원본 코드는 조건문 실습인데 제출 설명은 반복문 게임을 말하는 경우처럼 코드 내용과 설명이 서로 다르면 `학습 기록에서 확인한 점` 또는 `더 발전시키면 좋은 점`에 구체적으로 쓴다.
- 영상 시청이 1분 미만이거나 정규 기준의 10% 미만이고, 해당 과정의 퀴즈/데이터 로그/코드 실행/제출문 정리 근거도 없으면 “거의 학습하지 않은 기록”으로 본다. Python 과제에서는 CODE TRACE·LUMI도 확인하며, 둘 중 하나의 의미 있는 완료/진행이나 코드 실행 결과가 충분하면 부족 판단을 보류한다.
- 현재 과제 과정의 학습 기록이 0건이면, 같은 날짜 다른 과정 기록이 있더라도 원칙적으로 “해당 과정 학습 기록 없음”으로 판단한다. 첨부 코드가 있으면 코드는 별도 검토하되, 학습 기록 없음 자체는 경고/보완 검토 근거가 될 수 있다.
- 단, 초등수학 과제에서 같은 날짜 중등수학 학습 기록 또는 중등수학 풀이 제출이 확인되는 레벨업 학생은 예외다. 이 경우 현재 과제 과정의 초등수학 기록이 0건이어도 “학습 기록 없음” 경고로 처리하지 말고, 중등수학 학습 기록을 초등수학 수학 학습 근거로 반영한다.
- “0건” 판단 자체가 코드 결함일 수 있다. 진행 중 퀴즈가 `learning_progress`에만 남았거나(조승아 사례), 한글이 NFD로 저장되어 과정 분류가 실패했거나(조승아 사례), 제출문 키워드에 안 걸려 레벨업 감지가 안 된 경우(조하람 사례)는 “학습 기록 없음”이 아니다. 위 “학습 기록 0건 진단 체크리스트”를 먼저 통과한 뒤에만 경보를 검토한다.
- `assignment.codeComparison.isIdenticalToPrevious === true`이면 새 학습/개선 근거로 계산하지 않는다. 특히 Python 학습 기록도 0건이면 불성실 과제 제출 경고 검토 대상이다.
- 이전 제출 5건 중 같은 유형의 낮은 학습량, 원본/설명 불일치, 복사한 듯한 제출이 반복되면 `previous` 비교를 통해 “이번만의 문제가 아니라 반복 신호”로 다룬다.
- `previous[].feedbackReaction` 또는 `previous[].feedbackComment`가 있으면 학생의 반응을 다음 피드백에 반영한다.
- 이전 피드백에서 제안한 행동을 학생이 다음 제출에서 실제로 수행했으면, 상호작용을 느끼게 한 문장과 보너스 근거를 넣는다.
- `assignment.studentQuestions`가 비어 있지 않으면 반드시 `#### 질문에 대한 답변` 섹션을 추가한다.
- 학생 질문에는 정확히 답한다. 확실하지 않거나 자료가 부족하면 모르는 내용을 지어내지 말고, “이 부분은 원문/문제/코드 실행 결과를 확인한 뒤 답해야 한다”고 운영자 확인 포인트로 남긴다.
- 질문 답변은 칭찬이나 보완점에 묻히면 안 된다. 학생이 본인이 물어본 내용의 답을 바로 찾을 수 있어야 한다.
- 질문 추출기가 학습 기록 문장을 질문으로 오탐할 수 있다. 이때도 저장 검증을 통과하도록 `#### 질문에 대한 답변` 섹션을 두고, “질문이라기보다 오늘 학습 기록으로 보인다”처럼 정정한 뒤 해당 개념의 핵심을 짧게 보완한다.

권장 구조:

```markdown
### 과제 피드백

{제출 내용 요약 + 같은 날짜 실제 학습 내용 요약}

#### 잘한 점
{제출물에서 확인되는 구체적 장점 + 학습 기록에서 확인되는 성실한 부분}

#### 학습 기록에서 확인한 점
{영상 시청 시간, 집중도 광석, 타임어택, 완료 보너스, 퀴즈 진행도/점수, 데이터 로그, 퀴즈 배틀 참여 횟수/승패/정답률, 코드 실행/수정 근거. Python 과제일 때만 CODE TRACE 완료/진행도/정확도와 LUMI 완료/진행 미션·Trace·앱 내부 획득 광석을 추가한다. 영상 시간은 전체 학습 시간과 다를 수 있음을 고려}

#### 질문에 대한 답변
{학생이 질문한 내용에 대한 정확한 답변. 질문이 없으면 이 섹션 생략}

#### 이전보다 좋아진 점
{이전 제출/이전 피드백/최근 학습 흐름과 비교한 변화}

#### 더 발전시키면 좋은 점
{매터센스 약점, 집중도/퀴즈 오답, 코드 실행 결과, 제출문 정리의 빈틈 중 1~2개만 골라 다음 행동으로 연결}
```

## 학습 기록 “0건” 진단 체크리스트

운영툴 “AI 피드백 생성” 버튼이나 수동 export 결과가 “학습 기록 0건”으로 나올 때, 그것이 **진짜 안 한 것인지 아니면 코드가 기록을 못 찾은 것인지** 반드시 구분한다. 아래 순서대로 점검하고, 하나라도 해당하면 “0건” 판단을 보류한다.

1. **초등수학 과제인데 제출문이 중등수학 내용인가?** → 레벨업 학생일 수 있다. `history`/`learning_progress`에 `clusterId: "middle-math"` 기록이 있는지 본다(조하람 사례). 레벨업 기록이 있으면 “0건”이 아니라 중등수학 학습으로 인정한다.
2. **`learning_progress`에 진행 중 퀴즈가 남아 있는가?** → 학생이 퀴즈를 끝까지 완료하지 않으면 `history`에 안 쌓이고 `learning_progress`에만 남는다(조승아 사례). `history`만 보면 “0건”으로 나오지만 실제로는 학습했다. 진행 중 퀴즈(`quizSession.currentIdx > 0`)는 완료 퀴즈와 같은 학습 근거로 인정한다.
3. **한글 제목/unitId가 NFD로 저장되어 과정 분류가 실패했는가?** → `unitTitle`이 `중2_05_일차함수`처럼 분해 자모라면, 코드가 NFC 정규화 없이 “함수”를 찾으면 매칭이 실패해 과정이 `unknown`으로 빠지고 기록이 누락된다(조승아 사례). 모든 한글 비교는 NFC 정규화 후 해야 한다.
4. **학습 메타데이터 역추적이 빠졌는가?** → `learning_progress` 문서에 `clusterId`가 없더라도 제목/unitId 정규식으로 과정을 맞히지 않는다. `learning_progress/{unitId}` 문서 ID를 기준으로 `units/{unitId}`를 읽고, `chapterId`가 있으면 `chapters/{chapterId}`를 읽은 뒤, `regionId`로 `regions/{regionId}.clusterId`를 확인한다. 이 역추적이 빠지면 `unit_py_math_2`처럼 region id가 문서 ID에 없는 파이썬 단원이 unknown으로 누락된다(인효린 사례).
5. **제출문에 따르면 분명히 공부했는데 기록이 없는가?** → 학생이 종이 문제집으로 풀었거나, 플랫폼 밖에서 공부했을 수 있다. 이때는 “플랫폼 기록이 없어 확인이 어렵다”고 안내하되, 제출문 구체성을 다음 행동으로 요청한다. 단, “안 했다”고 단정하지 않는다.
6. **퀴즈 배틀만 있고 영상/일반 퀴즈가 0건인가?** → 학생이 배틀 데이 등으로 퀴즈 배틀만 집중적으로 했을 수 있다. `history.type === "quiz_battle"` 기록이 있으면 “학습 기록 0건”이 아니다. 배틀은 경쟁 복습 활동으로 학습 근거로 인정한다. 단, 배틀 점수(0~1500)가 일반 퀴즈 점수(0~100)와 섞여 averageScore를 오염시키지 않았는지 확인한다. 배틀이 일반 퀴즈 버킷에 묻혀 `quizCount`로만 보이는 경우도 점검한다.
7. **고전 읽기 과제인가?** → 고전 읽기는 영상·코드·데이터 로그가 없어도 책/쪽수 제출과 같은 날짜 독서 퀴즈가 핵심 학습 기록이다. `assignment.reading`, 같은 책의 이전 과제, 고전 읽기 `history`와 `learning_progress`를 먼저 확인한다. 이 근거가 있으면 일반 과정의 “영상 0분/학습 기록 0건” 경보를 적용하지 않는다.
8. **Python 과제에 CODE TRACE 또는 LUMI만 있는가?** → `history.type === "code_trace"`, `history.type === "lumi_protocol"`, `learning_progress.codeTrace`, `learning_progress.lumi_protocol_vertical_slice.missionLab`의 실제 완료/진행을 확인한다. 있으면 Python 학습 기록 0건이 아니다. 단, 현재 과제가 Python이 아니면 이 확인 결과를 해당 과제에 사용하지 않는다.
9. **비-Python 과제 컨텍스트에 Python 전용 활동이 섞였는가?** → 발견되면 학습 근거가 아니라 필터 결함이다. CODE TRACE·LUMI를 모든 요약 배열, 제목 목록, 신호, 프롬프트에서 제거한 뒤 해당 과정 기록만으로 0건 여부를 다시 판단한다.

위 항목을 모두 확인한 뒤에도 해당 과정의 완료/진행 기록이 정말로 없을 때만 “학습 기록 없음” 경보를 검토한다. 코드와 export 스크립트 양쪽 모두 이 체크리스트를 자동으로 통과해야 한다.

### 과정 메타데이터 역추적 원칙

`learning_progress` 문서는 진행 중 상태만 남고 `clusterId`가 비어 있을 수 있다. 이때 과정은 제목/unitId 정규식으로 추론하지 않고, 실제 콘텐츠 메타데이터를 따라가서 정한다.

- **명시 필드 우선**: `clusterId`, `courseId`, `regionId`, `codeTrace.clusterId`가 있으면 먼저 사용한다.
- **전용 활동 타입 선차단**: `type === "code_trace"` 또는 `type === "lumi_protocol"`이면 과정 메타데이터 역추적보다 먼저 Python 전용으로 표시한다. 현재 과제가 비-Python이면 즉시 제외한다. LUMI 레거시 `python_mission`은 명시적 `experienceType: "lumi_protocol"` 또는 `lumiCourseId/missionId` 계약이 함께 있을 때만 같은 규칙을 적용한다.
- **unit 역추적**: 명시 필드가 없으면 `units/{unitId}`를 조회한다. unit 문서에 `clusterId/courseId/regionId`가 있으면 사용하고, `chapterId`만 있으면 다음 단계로 간다.
- **chapter/region 역추적**: `chapters/{chapterId}.regionId`를 읽고, `regions/{regionId}.clusterId`로 실제 과정을 확정한다.
- **문서 ID에 region id가 들어 있는 레거시 단원**은 `reg_..._chap_...` 구조에서 region id만 추출한 뒤 `regions/{regionId}.clusterId`를 조회한다. 이것은 과정 키워드 추론이 아니라 저장 구조 역추적이다.
- **역추적 실패 시 제외**: 그래도 과정이 확인되지 않으면 해당 과제의 학습 근거로 쓰지 않는다. 제목에 “소수/함수/코드”가 들어 있다는 이유만으로 초등/중등/Python을 단정하지 않는다.
- **회귀 검증**: 실제 데이터로 (a) 인효린 `unit_py_math_2` CODE TRACE → python, (b) LUMI 완료/진행 → python, (c) 하다솜 중등 진행 기록 → middle-math, (d) 조승아 NFD 단원 → middle-math, (e) 조하람 SSS 합동 history → middle-math 레벨업, (f) 초등·중등·고전 과제에 CODE TRACE/LUMI가 노출되지 않는지 확인한다.

## 저학습/제출 불일치 경보 처리

아래 중 하나라도 해당하면 피드백 초안에 경보를 반영하고, 필요한 경우 `suggestedStatus`, `revisionRequest`, `suggestedBonusCrystals`를 보수적으로 제안한다.

경보 조건:

- 제출일 영상 시청이 1분 미만이거나 정규 기준의 10% 미만이고, 해당 과정의 퀴즈/데이터 로그/충분한 퀴즈 배틀(완료 3회+ 또는 정답률 60%+, 포기 제외)/코드 실행/제출문 정리 근거도 없다. Python 과제에서는 CODE TRACE·LUMI도 확인한다. 단, 충분한 퀴즈 배틀이 있으면 경보 조건에서 제외한다.
- 현재 과제 과정의 학습 기록이 0건이다. 같은 날짜 다른 과정 기록이 있어도 원칙적으로 해당 과정 기록으로 합산하지 않는다.
- 예외: 초등수학 과제에서 같은 날짜 중등수학 기록 또는 중등수학 풀이 정리가 확인되는 레벨업 학생은 경보 조건에서 제외한다. 이때 중등수학 기록을 초등수학 수학 학습으로 인정하고, 보너스도 초등수학 수학 20분 기준에 준해 판단한다.
- 초등수학 과제의 제출문이 중등수학 내용인데 `learningSummary`가 비어 있거나 `수학 기록 없음`으로 보이면, 경보를 쓰기 전에 반드시 같은 날짜 `middle-math` 기록을 확인한다. `유리수`, `절댓값`, `정수와 유리수`, `방정식`, `부등식`, `완전제곱식` 등의 퀴즈/영상/데이터 로그가 있으면 경보 조건에서 제외한다.
- 중등수학 과제에서 초등수학 기록만 있는 경우는 예외가 아니다. 이 경우 중등수학 기록 없음 경보를 유지한다.
- 영상 기록만 아주 짧고 해당 과정의 퀴즈, 데이터 로그, 코드 실행 흔적, 진행 중 퀴즈가 없다. Python 과제에서는 CODE TRACE·LUMI도 없을 때만 이 조건을 적용한다.
- 첨부 원본 코드와 제출 본문에 붙여 넣은 코드가 서로 다르거나, 실행하면 바로 오류가 날 가능성이 크다.
- 첨부 원본 코드와 제출 본문 설명이 서로 다른 과제를 말하는 것처럼 보인다.
- 제출 본문이 코드 원본을 설명하지 못하고, 이전 제출과 비교해 새로 배운 흔적이 거의 없다.
- 같은 학생의 이전 제출에서도 낮은 학습량 또는 제출 불일치가 2회 이상 반복된다.

피드백 작성 원칙:

- 학생에게는 “아무거나 복사했다”, “공부를 안 했다”처럼 의도를 단정하는 문장을 쓰지 않는다.
- 대신 “오늘 기록으로는 영상 학습이 16초만 확인되어, 이 과제를 충분히 학습했다고 보기는 어렵습니다.”처럼 관찰 사실을 말한다.
- 단, 영상 시간이 정규 기준의 절반 안팎이고 해당 과정의 퀴즈/데이터 로그/코드 근거가 있거나, Python 과제에서 CODE TRACE·LUMI가 있으면 저학습 경보로 쓰지 않는다. 이때는 “영상과 확인 활동이 이어졌다”는 점을 인정하고, 부족한 부분은 제출문 구체성이나 오답 정리처럼 실제 빈틈으로 좁힌다.
- 첨부 코드가 있는 Python 과제에서 Python 학습 기록이 0건이면, 코드 개선점은 인정하되 학습 기록 공백은 별도 문장으로 명확히 쓴다. 예: “첨부한 `add_sound.py`에서는 이전보다 사운드 기능을 넣으려는 변화가 보입니다. 다만 제출일 Python 영상/퀴즈/데이터 로그/CODE TRACE/LUMI는 확인되지 않아, 이 코드가 어떤 학습 과정을 거쳐 작성됐는지는 확인하기 어렵습니다.”
- 첨부 코드가 이전 같은 파일과 동일하면 개선점으로 인정하지 않는다. 예: “첨부한 `add_sound.py`는 4월 29일 제출의 `add_sound.py`와 코드 내용이 동일합니다. 제출일 Python 학습 기록도 없어 이번 과제에서 새로 학습하고 수정한 부분은 확인되지 않습니다.”
- 첨부 코드에 의미 있는 개선이 있는데 영상 기록만 매우 짧으면, “과제 전체가 불성실”처럼 뭉뚱그리지 않는다. 예: “코드에서는 `monster_group`과 충돌 감지 구조로 나아간 변화가 보입니다. 다만 제출문은 25분 학습을 말하지만 플랫폼 기록은 49초라, 학습 기록과 제출 설명이 크게 맞지 않습니다.”
- Python CODE TRACE 완료 기록이 있으면 학습 기록 0건이나 확인 활동 없음으로 처리하지 않는다. 예: “영상은 짧지만 `Game` 클래스 CODE TRACE를 4/4 완료했고 정확도 90%가 확인되어, 코드 구조를 손으로 따라 쓰는 학습은 이루어졌습니다.”
- Python LUMI 미션 완료 기록이 있으면 학습 기록 0건이나 실행 근거 없음으로 처리하지 않는다. 예: “영상은 짧지만 LUMI `첫 걸음` 미션을 완료하며 코드를 실행하고 Trace에서 위치 변화를 확인한 기록이 있습니다.”
- Python LUMI 진행 기록만 있으면 완료로 단정하지 않는다. 실제 진행 미션과 상태를 인정하되, 다음 행동은 “현재 미션에서 바꾼 인자와 실행 후 달라진 상태 1가지를 적기”처럼 작게 제시한다.
- Python CODE TRACE만 있고 제출문이 “영상 봤다” 또는 “코드 짰다”처럼 실제 기록과 다르게 적혀 있으면, CODE TRACE는 인정하되 제출 설명 불일치는 분리해서 안내한다. 예: “오늘 기록은 영상/퀴즈보다 CODE TRACE 중심입니다. 다음 제출에서는 따라 쓴 코드에서 헷갈린 함수 이름 1개를 적어 주세요.”
- CODE TRACE 정확도가 낮거나 완료율이 낮은 경우에도 곧바로 불성실로 보지 않는다. 다만 같은 exercise를 거의 진행하지 못했거나 `completedExerciseCount`가 0이면 학습 근거로 세게 인정하지 않는다.
- 불일치는 “첨부한 원본 코드와 제출 본문에 적은 코드/설명이 서로 맞지 않아, 선생님이 어떤 부분을 직접 이해하고 만든 것인지 확인하기 어렵습니다.”처럼 설명한다.
- 다음 행동은 작고 확인 가능하게 제시한다. 예: “다음 제출에서는 영상 1개를 끝까지 보고, 코드에서 직접 바꾼 줄 2곳과 실행 결과 1가지를 적어 주세요.”
- CODE TRACE 중심 학습의 다음 행동은 작고 코드 구조에 가깝게 제시한다. 예: “다음 제출에서는 `Game`, `Player`, `Monster` 클래스 이름을 먼저 적고, `__init__`, `update`, `draw`가 각각 어디에 들어가는지 한 줄로 설명해 주세요.”
- 반복 신호가 있으면 “지난 제출과 비교해 새로 늘어난 학습 기록이 거의 보이지 않습니다. 이번에는 제출보다 먼저 학습 기록을 남기는 순서로 바꿔 봅시다.”처럼 행동 변화를 요구한다.
- 학습을 회복할 여지를 반드시 남긴다. 예: “다음 제출에서 영상 끝까지 보기와 확인 퀴즈/실행 결과를 함께 남기면 보너스 광석을 다시 높게 받을 수 있습니다.”

레벨업 학생 처리 예시:

- 초등수학 과제에 “다항식의 덧셈과 뺄셈”, “제곱근”, “소인수분해” 같은 중등수학 내용을 제출했고, 같은 날짜 중등수학 영상/퀴즈/데이터 로그 또는 충분한 손풀이 정리가 확인되면 성실한 수학 학습으로 인정한다. 피드백에는 “초등수학 시간에 레벨업 학습으로 중등수학을 진행한 점을 확인했다”고 적는다.
- 이때 `learningSummary.mathActivityCount`가 0이어도 바로 보완요청이나 불성실 경고를 제안하지 않는다. 중등수학 학습 근거가 충분하면 `suggestedStatus: "reviewed"`와 정상 보너스를 검토한다.
- 조하람 사례처럼 초등수학 과제에 “방정식과 부등식”을 제출했고, 일일 학습 기록에는 `middle-math` 퀴즈 9회, 데이터 로그 1개, 중등수학 영상 1개가 있는 경우가 있다. 이 경우 과제 문서의 `clusterId`만 보고 “초등수학 기록 없음”으로 판단하면 안 된다. 중등수학 레벨업 기록을 초등수학 과제의 수학 학습 근거로 인정하고, “퀴즈 9회와 데이터 로그가 확인되어 학습 기록 없음으로 볼 수 없다”고 적는다.
- 조하람 사례의 변형: 제출문이 “SSS 합동에 대해 배웠다”처럼 중등 기하 단원인데 제출문 키워드에 안 걸려 레벨업 감지가 실패할 수 있다. 이때는 제출문 키워드가 아니라 **같은 날짜 history/learning_progress에 `middle-math` 기록이 존재하는지**로 레벨업을 판단한다. 코드는 키워드 신호가 꺼져 있어도 `allRows`에서 `middle-math` row가 보이면 `includeMiddleMathLevelUp`을 스스로 켠다.
- 조승아 사례(중등수학 과제, `history` 0건): 학생이 일차함수 퀴즈를 끝까지 완료하지 않아 `history`에는 아무 기록도 쌓이지 않고, `learning_progress`에만 진행 중 상태(`quizSession.currentIdx` = 19, 답 12/20)가 남았다. 이 경우 `history`만 보면 “기록 0건”으로 잘못 판단한다. `learning_progress`의 `inProgressQuizzes`까지 합쳐 봐야 “일차함수 심화문제 12/20 진행 중”이라는 실제 학습이 잡힌다. 진행 중 퀴즈는 완료 퀴즈와 같은 학습 근거로 인정한다.
- 조승아 사례의 인코딩 함정: 그 `learning_progress` 문서의 `unitTitle`이 NFD(`중2_05_일차함수`)로 저장되어 있었다. 코드가 NFC 정규화 없이 “함수” 키워드를 찾으면 매칭이 실패해 과정이 `unknown`으로 분류되고, 중등수학 과제인데도 기록이 전부 누락된다. 한글 비교는 반드시 NFC 정규화 후 한다.
- 하다솜 사례(중등수학 과제, 과정 분류 누락): 6/29에 유리수·순환소수 퀴즈와 1학년 기말 3회 퀴즈를 풀었지만 두 기록 모두 `learning_progress`에만 있고 `clusterId` 필드가 없었다. 제목 정규식으로 과정을 맞히면 초등 오탐 또는 unknown 누락이 생긴다. 해결은 `learning_progress/{unitId}`가 가리키는 `units → chapters → regions` 메타데이터를 역추적해 `middle-math`를 확인하는 것이다.
- 중등수학 과제에 초등수학 비율/소수/분수 기록만 있는 경우에는 반대로 인정하지 않는다. “중등수학 과제 기준으로는 중등수학 기록이 확인되지 않는다”고 분리해서 안내한다.

운영자 조치 제안:

- 첫 발생: `suggestedStatus: "reviewed"`를 유지할 수 있으나, 보너스는 낮게 제안하고 다음 행동을 명확히 적는다.
- 2회 반복: `suggestedStatus: "needs_revision"` 또는 `revisionRequest` 작성을 검토한다. 보완요청 문구에는 다시 제출할 최소 조건을 넣는다.
- 3회 이상 반복: 운영자가 보호자 안내, 개별 학습 점검, 제출 방식 재안내를 검토할 수 있도록 `aiFeedbackPayload.parentSummary` 또는 운영자 메모용 요약에 반복 신호를 남긴다.

### 불성실 과제 제출 경고 저장

불성실 과제 제출로 판단한 경우 피드백 문장에만 남기지 말고 `assignmentWarnings/{warningId}` 문서도 저장한다. 이 경고는 과제 1건당 1회로 계산한다.

경고 유형:

- `poor_assignment_submission`: 불성실 과제 제출 1회
- `consecutive_missing_assignment`: 연속 3회 과제 미제출 1회

경고 카운트 기준:

- `status`가 `active` 또는 `appealed`인 경고만 활성 경고로 계산한다.
- `cancelled` 경고는 누적 경고에서 제외한다.
- 활성 경고가 3회 이상이면 학생 화면에 `경고 3회 누적 시 수강료가 10% 인상될 수 있습니다.` 문구가 표시되어야 한다.
- 학생 이의 신청은 1회만 가능하고, 제출 후 수정할 수 없다. 이의 신청 후에는 `status: "appealed"`, `appealLocked: true`, `appeal.status: "submitted"`로 저장한다.
- 운영자는 어드민 과제 제출 검토 페이지에서 경고를 취소할 수 있고, 취소 시 `status: "cancelled"`로 변경한다.
- 연속 3회 미제출 경고는 출석/과제 이력을 기준으로 생성한다. 학생이 과제 기록소에 들어오지 않아 클라이언트 스윕이 실행되지 않을 수 있으므로, 운영 검토 중 연속 미제출이 확인되면 운영자 또는 서버 작업으로도 같은 문서 ID 규칙에 맞춰 저장한다.

`poor_assignment_submission` 저장 필드:

```json
{
  "userId": "학생 uid",
  "userName": "학생 이름",
  "assignmentId": "과제 id",
  "clusterId": "python",
  "regionId": "",
  "date": "2026-05-13",
  "type": "poor_assignment_submission",
  "status": "active",
  "severity": "warning",
  "message": "Python 기준 50분 대비 영상 16초만 확인되고 퀴즈/데이터 로그가 없습니다.",
  "policyMessage": "경고 3회 누적 시 수강료가 10% 인상될 수 있습니다.",
  "evidence": {
    "videoMinutes": 0.3,
    "platformTargetMinutes": 50,
    "quizCount": 0,
    "activityCount": 1,
    "currentCourseActivityCount": 0,
    "codeComparisonSummary": "첨부 코드 add_sound.py는 2026-04-29의 add_sound.py와 코드 내용이 동일함",
    "concernSignals": ["Python 학습 기록 없음", "동일 코드 재제출"]
  },
  "appealLocked": false,
  "createdBy": "codex-manual-review"
}
```

권장 문서 ID:

- 불성실 제출: `warning_{assignmentId}_poor_assignment_submission`
- 연속 3회 미제출: `warning_{userId}_{clusterId}_{date}_consecutive_missing_3`

경고 저장 후에는 반드시 `users/{userId}.assignmentWarningSummary`를 다시 계산한다.

```json
{
  "activeCount": 3,
  "totalIssuedCount": 3,
  "cancelledCount": 0,
  "activeCountByCluster": { "middle-math": 3 },
  "feeIncreaseRisk": true,
  "policyMessage": "경고 3회 누적 시 수강료가 10% 인상될 수 있습니다."
}
```

검증 체크:

- 경고 대상 과제마다 `assignmentWarnings` 문서가 1개씩 존재한다.
- `policyMessage`가 정확히 들어 있다.
- 이의 신청 전에는 `appealLocked: false`다.
- 같은 학생 활성 경고가 3회 이상이면 `assignmentWarningSummary.feeIncreaseRisk === true`다.
- 어드민이 경고를 취소하면 활성 경고 카운트와 `feeIncreaseRisk`가 즉시 다시 계산된다.

보완요청 문구 예시:

```markdown
이번 제출은 첨부한 원본 코드와 제출 본문에 적은 코드/설명이 서로 맞지 않고, 제출일 학습 기록도 매우 짧아 과제를 충분히 수행했는지 확인하기 어렵습니다. 영상을 끝까지 학습한 뒤, 직접 수정한 코드 2곳과 실행 결과 1가지를 적어 다시 제출해 주세요.
```

사용하면 안 되는 보완요청 예시:

```markdown
기준 학습량 대비 조금 부족: 영상 29.9분 / 기준 50분 다음에는 영상 뒤에 퀴즈나 데이터 로그 확인까지 이어가면 학습이 더 단단해집니다.
```

위 문구가 부적절한 이유:

- 영상 29.9분은 50분 기준의 절반 이상이며, 중간에 멈춰 풀이/코딩/정리하는 시간이 있을 수 있다.
- 이미 퀴즈나 데이터 로그가 있는 학생에게 “퀴즈나 데이터 로그까지 이어가라”고 말하면 실제 기록을 보지 않은 피드백처럼 보인다.
- 개선점은 “영상 시간이 부족하다”가 아니라 “오답 이유 1줄 정리”, “코드 실행 결과 첨부”, “오늘 바꾼 코드 2곳 설명”처럼 실제로 비어 있는 근거에서 찾아야 한다.

다른 과정 기록 오인 금지 예시:

```markdown
영상 기록 0분, 진행 중 퀴즈 1개가 확인됩니다. 진행 중: 4월 평가 24/25, 오답 6개
```

위 문구가 Python 과제에서 부적절한 이유:

- `4월 평가`는 Python 과제 기록이 아니라 초등수학 또는 다른 과정 기록일 수 있다.
- 현재 과제의 `clusterId`가 `python`이면 Python으로 판별되는 영상/퀴즈/데이터 로그/CODE TRACE/LUMI/코드 기록만 학습 근거로 쓴다.
- 과정이 불명확한 진행 중 퀴즈는 피드백 근거에서 제외하고, 운영자 요약에 “제외된 다른 과정/과정 미확인 기록”으로만 남긴다.

초등수학 레벨업 예외를 잘못 처리한 예시:

```markdown
초등수학 과제인데 제출일 초등수학 기록이 0건이므로 수학 학습 기록이 없습니다. 중등수학 다항식 내용은 다른 과정 기록이라 인정하지 않습니다.
```

위 문구가 부적절한 이유:

- 초등수학을 마친 학생이 초등수학 수업 시간에 중등수학을 학습하는 경우가 있다.
- 초등수학 과제에서 중등수학 내용과 같은 날 중등수학 기록 또는 충분한 중등수학 풀이 근거가 확인되면, 이는 초등수학 과제의 수학 학습으로 인정해야 한다.
- 다만 반대 방향은 적용하지 않는다. 중등수학 과제에서 초등수학 기록만 있는 경우에는 중등수학 학습으로 인정하지 않는다.

초등수학 레벨업 기록 누락 방지 예시:

```markdown
오늘 초등수학 학습 기록은 확인되지 않습니다. 방정식과 부등식을 배웠다고 적었지만, 과제 과정과 다른 기록이라 인정하지 않습니다.
```

위 문구가 부적절한 이유:

- 제출문이 방정식/부등식처럼 중등수학 내용이면 레벨업 학생일 가능성이 높다.
- 실제 일일 학습 기록에는 `middle-math`로 저장된 퀴즈와 영상이 있을 수 있다. 화면의 일일 학습 기록에는 보이지만, 초등수학 필터만 적용한 내보내기 결과에는 빠질 수 있다.
- 반드시 같은 날짜 원본 학습 기록에서 `clusterId: "middle-math"` 퀴즈, 영상, 데이터 로그, 다크매터를 확인한다.
- 확인되면 “초등수학 시간에 레벨업 학습으로 중등수학을 진행했고, 중등수학 퀴즈/데이터 로그가 확인된다”고 정정한다.
- **제출문 키워드에 의존하지 않는다**: “SSS 합동을 배웠다”처럼 단원은 중등 기하인데 키워드 정규식(`기하/방정식/함수/...`)에 안 걸리면 레벨업 감지 자체가 실패한다. 키워드 신호가 꺼져 있어도, `history`/`learning_progress` 원본에서 `clusterId: "middle-math"` row가 존재하면 레벨업으로 판단한다(조하람 사례).
- **`learning_progress`도 본다**: 퀴즈를 끝까지 완료하지 않으면 `history`에 안 쌓이고 `learning_progress`에만 진행 중 상태가 남는다. `history`만 보면 “0건”으로 나오므로, `learning_progress`의 `inProgressQuizzes`까지 합쳐 확인해야 한다(조승아 사례).
- **한글이 NFD로 저장되어 있을 수 있다**: `learning_progress` 문서의 `unitTitle`, `unitId`, `chapterId`, `regionId`가 분해 자모로 저장될 수 있으므로 모든 비교와 메타데이터 역추적 전에 NFC 정규화가 필요하다(조승아 사례).

상호작용 문장 예시:

```markdown
지난번에 이야기했던 “영상 뒤 확인 퀴즈까지 이어가기”를 오늘 바로 챙겨 준 점이 보여서 정말 반가웠어요. 이런 식으로 피드백을 듣고 바로 실천하는 태도에는 보너스 광석 10개를 더 얹어 주고 싶습니다.
```

주의: 이 문장은 실제로 이전 피드백에 해당 제안이 있었고, 오늘 학습 기록에서 그 행동이 확인될 때만 쓴다.

## 보너스 광석 기준

`suggestedBonusCrystals`는 10~40 사이로 준다. 박하게 깎기보다 다음 학습 행동을 유도하는 신호로 쓴다.

고전 읽기 과제는 아래 일반 영상/코드 중심 표보다 앞의 **고전 읽기 40광석 평가표**를 우선 적용한다. 고전 읽기에는 영상 시청, CODE TRACE, 코드 실행을 요구하지 않으며, 책·쪽수 기록 10 + 독서 연속성 10 + 독서 퀴즈 10 + 오늘 읽은 내용 10으로 최대 40광석을 산정한다.

| 광석 | 기준 |
| --- | --- |
| 10 | 제출은 했지만 해당 과정의 학습 기록/내용 근거가 매우 약하고, 원본/설명 불일치와 이전 대비 진전 없음이 함께 보이면 이 범위를 우선 검토 |
| 20 | 기본 제출은 했으나 해당 과정의 영상/퀴즈/데이터 로그/코드 실행/정리 근거 중 확인되는 것이 거의 없음. Python 과제에서는 CODE TRACE·LUMI도 없음 |
| 25 | 일부 학습 기록은 있으나 제출문이 짧거나 확인 활동·실행 근거가 약함. Python 과제에서 CODE TRACE 또는 LUMI를 일부 진행했지만 완료/설명 연결이 약한 경우도 이 범위 |
| 30 | 영상이 기준의 절반 안팎이고 해당 과정의 확인·실습 근거가 이어지며 제출 기록이 과제와 맞음. Python 과제에서는 영상이 짧아도 CODE TRACE 또는 LUMI를 의미 있게 진행하고 제출문이 해당 구조·상태 변화를 설명함 |
| 35 | 해당 과정의 영상/퀴즈/데이터 로그/실행 또는 정리 흐름이 균형 있고, 오답/막힌 부분을 일부 설명함. Python 과제에서 CODE TRACE 대부분 완료 또는 LUMI 여러 미션 완료와 제출 설명 연결이 양호한 경우도 이 범위 |
| 40 | 기준 학습량 충족, 기록 구체성, 집중도, 약점 보완 또는 질문까지 모두 좋음. Python 과제에서 CODE TRACE/LUMI의 높은 완성도와 제출 코드·설명 연결까지 좋으면 이 범위 |

예: 초등수학 과제에서 수학 영상 1개를 4분 47초 시청하고 독서 기록을 남겼다면, “영상 3개 시청”처럼 쓰면 안 된다. 수학 플랫폼 학습량은 20분 기준으로는 부족한 편이므로, 제출 성실도와 독서 기록을 인정하되 25~30광석 범위에서 판단한다.

예: 초등수학 과제에서 독서퀴즈 2개만 있고 수학 영상/수학 퀴즈/데이터 로그가 없다면, 독서 활동은 인정하되 수학 20분 기록이 비어 있음을 언급한다. 이 경우 기본 보너스는 20~25광석이 적절하고, 다음 시간에 안내한 학습 흐름을 실제로 따르면 +10광석을 더해 30~35광석까지 줄 수 있다.

예: 초등수학 과제에 중등수학 다항식 풀이가 제출되었고, 같은 날짜 중등수학 영상/퀴즈/데이터 로그 또는 충분한 손풀이 정리가 확인된다면 초등수학 수학 학습으로 인정한다. 이 경우 초등수학 기록이 0건이라는 이유만으로 10~20광석이나 보완요청을 제안하지 말고, 중등수학 학습의 구체성과 확인 활동을 기준으로 30~40광석까지 검토한다.

예: 중등수학 과제에 초등수학 비율 퀴즈만 있고 중등수학 기록이나 중등수학 풀이 근거가 없다면 초등수학 기록을 중등수학 학습으로 인정하지 않는다. 이 경우 중등수학 과제 기준으로 학습 근거가 부족하다고 안내한다.

예: Python 과제에서 제출일 영상 시청이 총 16초이고, 퀴즈/데이터 로그/코드 실행 근거가 없으며, 첨부 원본 코드와 제출 본문 코드/설명이 서로 맞지 않는다면 10광석을 우선 검토한다. 같은 신호가 이전 제출에서도 반복되면 보완요청 또는 운영자 개별 점검 대상으로 제안한다.

예: Python 과제에서 영상은 5분 이하라도 CODE TRACE를 4/4 완료했고 정확도 90% 이상이며 제출문에 `Game`, `Player`, `Monster` 구조를 설명했다면 30~35광석을 우선 검토한다. 영상 시간이 짧다는 이유만으로 20광석 이하로 낮추지 않는다.

예: Python 과제에서 CODE TRACE를 전체 완료했고 정확도 95% 이상이며, 제출한 원본 코드나 설명에 따라 쓴 구조를 직접 응용한 흔적이 있으면 35~40광석을 검토한다. CODE TRACE는 손으로 코드를 따라 쓰는 고난도 실습이므로 단순 데이터 로그 1개보다 강한 확인 활동으로 본다.

예: Python 과제에서 CODE TRACE가 1/5 진행 중이고 정확도 70% 안팎이라면, 진행 자체는 인정하되 보너스는 25~30광석 범위에서 검토한다. 이때 개선점은 “남은 exercise 마무리”보다 “필수 이름과 들여쓰기 위치를 먼저 확인하기”처럼 구체적으로 쓴다.

예: Python 과제에서 CODE TRACE 완료 기록은 있지만 제출문이 전혀 다른 영상/게임 기능을 말하거나 첨부 코드가 같은 날짜 학습과 맞지 않으면, CODE TRACE 학습은 인정하되 제출 설명 불일치 때문에 25~30광석으로 보수적으로 본다.

예: 중등수학 과제에서 영상 29.9분, 퀴즈, 데이터 로그가 함께 확인되고 제출문도 과제 내용과 맞는다면 30~35광석 범위를 우선 검토한다. “50분 기준보다 부족”이라는 숫자 비교만으로 20~25광석으로 낮추지 않는다.

예: Python 과제에서 영상은 20~30분 수준이지만 원본 코드에 직접 수정한 흔적, 실행 결과, 오류를 고친 설명이 있으면 30~40광석까지 검토한다. Python 학습은 영상 시청보다 직접 실행과 수정 시간이 중요하다.

예: Python 과제에서 영상, 퀴즈, 데이터 로그는 없지만 CODE TRACE 전체 완료와 높은 정확도가 있고 제출문이 해당 코드 구조를 설명한다면 “학습 기록 없음”이 아니다. 이 경우 30~35광석을 우선 검토하고, 다음 행동은 “따라 쓴 코드를 한 줄 응용하기”로 둔다.

예: Python 과제에서 LUMI 일반 미션 3개를 최초 완료하고 각 미션에서 사용한 함수·인자와 Trace 상태 변화를 제출문에 설명했다면 30~35광석을 우선 검토한다. 앱에서 받은 미션 광석은 이미 지급된 별도 보상이므로 과제 보너스에 더하지 않는다.

예: Python 과제에서 LUMI 필드 테스트까지 완료하고, 실패 원인과 코드를 고친 과정을 제출 코드·설명으로 연결했다면 35~40광석을 검토한다. 별 수만 보지 말고 디버깅과 상태 관찰의 구체성을 본다.

예: Python 과제에서 LUMI 미션을 진행 중이지만 아직 성공하지 못했다면 실제 실행·수정·Trace 관찰은 인정하되 완료로 표현하지 않고 25~30광석 범위에서 다른 학습 근거와 함께 판단한다.

예: 초등수학 또는 중등수학 과제일에 CODE TRACE/LUMI 기록이 함께 존재해도 이를 수학 학습이나 보너스 근거로 사용하지 않는다. 초등수학 레벨업 사례라면 `middle-math` 수학 활동만 인정한다.

예: 영상 없이 퀴즈 배틀만 5회 이상 했고 평균 정답률이 60% 이상이면 충분한 복습 활동으로 인정해 30~35광석을 우선 검토한다. “영상 0분”이라는 숫자만으로 20~25광석으로 낮추지 않는다. 배틀에서 틀린 개념을 다음 행동으로 연결한다.

예: 퀴즈 배틀을 13회 했고 정답률이 70% 안팎이라면, 영상이 없어도 다수 단원을 경쟁하며 복습한 성실한 활동으로 35광석까지 검토한다. 다음 행동은 “배틀에서 틀린 개념 1가지를 영상이나 퀴즈로 다시 확인하기”로 둔다.

예: 퀴즈 배틀을 1~2회만 했고 정답률이 보통(50% 안팎)이라면, 복습 활동 자체는 인정하되 보너스는 25~30광석 범위에서 검토한다. Python 과제에서 CODE TRACE·LUMI가 함께 있거나 해당 과정 영상이 있으면 그 근거도 함께 평가한다.

예: 퀴즈 배틀 중 중도 포기(forfeited)가 대부분이거나 정답률이 매우 낮으면(30% 미만), 인정을 약하게 해 20~25광석 범위에서 검토한다. 다만 “공부를 안 했다”고 단정하지 않고, 남은 배틀을 끝까지 마무리하거나 약점 개념 영상을 보는 행동으로 유도한다.

이전 피드백 반영 보너스:

- 피드백에서 제안한 행동이 다음 제출의 학습 기록에 명확히 확인되면 `+10`을 고려한다.
- 총점은 항상 40 이하로 제한한다.
- 피드백 문장에 왜 추가 보너스를 주는지 학생이 알 수 있게 쓴다.
- 예: “지난 시간에 말한 확인 퀴즈까지 이어가는 방법을 오늘 바로 해냈네요. 선생님 말을 흘려듣지 않고 실천한 점이 보여서 보너스 광석 10개를 더 챙겨 주고 싶습니다.”

## 학생 피드백 반응 활용

학생 화면에는 교사 피드백 아래에 이모티콘 평가와 코멘트 입력이 있다.

- `👍`: 피드백을 잘 이해했거나 도움이 되었다는 신호
- `👎`: 설명이 더 필요하거나 아쉬웠다는 신호
- 코멘트: 학생이 피드백에 대해 남긴 자유 응답

다음날 피드백 작성 시 확인할 필드:

- `previous[].feedbackReaction`
- `previous[].feedbackComment`
- `previous[].feedbackResponse`

반영 방식:

- `👍`이면 학생이 받아들인 지점을 다음 학습 행동과 연결해 준다.
- `👎`이면 전날 설명이 어려웠을 수 있으므로 더 짧고 구체적으로 다시 설명한다.
- 코멘트에 질문이나 감정 표현이 있으면 피드백 초반이나 `질문에 대한 답변`에서 짧게 응답한다.
- “부족한 점도 적어 주세요”, “계속 이렇게 하면 되나요?”처럼 피드백 방식에 대한 요청이 있으면 다음 피드백의 `더 발전시키면 좋은 점`이나 `질문에 대한 답변`에서 직접 응답한다.
- 학생 반응을 확인했다는 문장은 실제 반응이 있을 때만 쓴다. 예: “지난 피드백에 엄지척을 남긴 것도 확인했어요.”, “지난 피드백이 아쉬웠을 수 있어 오늘은 더 짧고 구체적으로 적어볼게요.”
- `thumbs_down`에 코멘트가 없으면 원인을 추측해 단정하지 않는다. 대신 “이번에는 핵심을 더 짧고 구체적으로 적겠다”처럼 피드백 형식을 조정한다.
- 코멘트가 긴 감정 표현이면 그대로 길게 반복하지 말고, “이해받는 느낌이 좋았다는 코멘트를 확인했다”처럼 요지를 짧게 반영한다.

반응 반영 점검:

```bash
node --input-type=module -e 'import { readFileSync } from "fs"; const contexts=JSON.parse(readFileSync("/private/tmp/pending_assignment_contexts.json","utf8")).contexts||[]; const rows=contexts.map(c=>({ id:c.assignment?.id, name:c.displayName, responses:(c.previous||[]).filter(p=>p.feedbackReaction||p.feedbackComment||p.feedbackResponse).map(p=>({ date:p.date, reaction:p.feedbackReaction||p.feedbackResponse?.reaction||"", comment:p.feedbackComment||p.feedbackResponse?.comment||"" })) })).filter(r=>r.responses.length); console.log(JSON.stringify(rows,null,2));'
```

작성 전 이 목록의 모든 학생에 대해 다음 피드백 안에 반응 반영 문장이 들어갔는지 확인한다.

## 3. 운영툴 초안 필드에 저장

```bash
node scripts/apply-manual-assignment-feedbacks.mjs \
  --contexts=/private/tmp/pending_assignment_contexts.json \
  --feedbacks=/private/tmp/manual_assignment_feedbacks.json \
  --apply
```

저장 스크립트는 질문 누락을 검증한다. `assignment.studentQuestions`가 있는데 `studentFeedback`에 `질문에 대한 답변`, `질문 답변`, `궁금한 점`, `답변` 중 하나가 없으면 저장을 중단한다.

저장되는 필드:

- `aiFeedbackDraft`
- `aiFeedbackPayload`
- `aiFeedbackEvidence`
- `aiFeedbackRubricScores`
- `aiFeedbackGeneratedBy: "codex-manual-review"`
- `aiFeedbackManualReviewedAt`

선택적으로 함께 저장되는 판단 필드:

- `aiFeedbackPayload.suggestedStatus`
- `aiFeedbackPayload.revisionRequest`
- `aiFeedbackPayload.parentSummary`

저학습/불일치 경보가 있으면 `studentFeedback`만 쓰고 끝내지 말고, 운영자가 빠르게 판단할 수 있도록 위 선택 필드에도 요지를 남긴다.

저장 전 품질 점검:

- 각 피드백의 `잘한 점`, `학습 기록에서 확인한 점`, `더 발전시키면 좋은 점`에 학생별 구체 근거가 있는지 확인한다.
- “기준 학습량 대비 조금 부족”을 썼다면, 그 근거가 영상 시간 하나뿐인지 확인한다. 영상 시간 하나뿐이면 문장을 고친다.
- 해당 과정의 퀴즈·데이터 로그가 있거나 Python 과제에 CODE TRACE·LUMI가 있는 학생에게 “퀴즈나 데이터 로그까지 이어가라”고 쓰지 않았는지 확인한다.
- Python 과제에서 코드 제출/실행, CODE TRACE 또는 LUMI 근거를 보지 않고 영상 시간만으로 낮은 평가를 하지 않았는지 확인한다.
- Python 과제에서 CODE TRACE가 있으면 완료/진행 여부, 정확도, exercise 수를 `학습 기록에서 확인한 점`에 적었는지 확인한다.
- Python 과제에서 LUMI가 있으면 완료/진행 여부, 미션명·개념, Trace 관찰, 앱 내부 획득 광석을 `학습 기록에서 확인한 점`에 정확히 적었는지 확인한다.
- 비-Python 과제의 컨텍스트·초안·최종 피드백에 CODE TRACE/LUMI 명칭, 제목, 개수, 진행도, 획득 광석이 한 번도 등장하지 않는지 확인한다.
- LUMI 앱 내부 미션 광석을 `suggestedBonusCrystals`에 합산하거나 과제 승인 시 다시 지급하도록 쓰지 않았는지 확인한다.
- 고전 읽기 과제에서 현재 책과 도달 쪽수, 같은 책의 직전 제출 쪽수, 증가량 또는 비교 불가 사유, 독서 퀴즈, 오늘 읽은 내용이 반영되었는지 확인한다.
- 고전 읽기 페이지 증가량을 “오늘 읽은 분량”으로 단정하거나, 분당 쪽수·최소 쪽수로 평가하지 않았는지 확인한다.
- 고전 읽기 첫 제출·책 변경·낮은 쪽수 기록을 비교 자료 부족만으로 감점하거나 보완요청하지 않았는지 확인한다.
- 같은 문장이나 같은 보완점이 여러 학생에게 반복되면, 각 학생의 실제 기록에 맞게 다시 쓴다.
- “부족”이라는 단어가 들어간 문장은 학생이 다음에 무엇을 하면 회복되는지 바로 이어져야 한다.

금지/주의 문구 검색:

```bash
node --input-type=module -e 'import { readFileSync } from "fs"; const data=JSON.parse(readFileSync("/private/tmp/manual_assignment_feedbacks.json","utf8")); const banned=[/기준 학습량 대비 조금 부족: 영상/i,/퀴즈나 데이터 로그 확인까지 이어가면/i,/영상 시간이 부족/i]; for (const [id,row] of Object.entries(data)) { const text=row.studentFeedback||""; const hits=banned.filter(rx=>rx.test(text)).map(String); if(hits.length) console.log(id, hits); }'
```

이 검색에 걸리는 문장이 있으면 무조건 다시 읽는다. 실제로 퀴즈/데이터 로그/코드 근거가 없는 경우에만 유지하고, 그렇지 않으면 학생의 실제 학습 흐름을 반영해 고친다.

수정하지 않는 필드:

- `feedback`
- `status`
- `reviewedAt`
- `reviewedBy`
- `bonusCrystals`

## 4. 저장 확인

```bash
node --input-type=module -e 'import admin from "firebase-admin"; import { readFileSync } from "fs"; const key=JSON.parse(readFileSync("./service-account.json","utf8")); admin.initializeApp({credential:admin.credential.cert(key)}); const db=admin.firestore(); const snap=await db.collection("assignments").where("status","==","submitted").get(); let withDraft=0, manual=0; const missing=[]; snap.forEach(doc=>{const d=doc.data(); if(d.aiFeedbackDraft) withDraft++; if(d.aiFeedbackGeneratedBy==="codex-manual-review") manual++; else missing.push(doc.id);}); console.log({submitted:snap.size, withDraft, manual, missing}); process.exit(0);'
```

정상 예시:

```json
{ "submitted": 30, "withDraft": 30, "manual": 30, "missing": [] }
```

## 운영툴에서 마무리

운영툴에서 각 과제를 열고 `AI 피드백 초안`을 확인한다. 필요하면 문장을 수정한 뒤 `초안 적용`을 누르고 승인 또는 보완요청을 처리한다.

저학습/제출 불일치 경보가 있는 과제는 마무리 전에 아래를 추가로 확인한다.

- 첨부파일 또는 링크의 원본 코드가 실제 과제와 맞는지 확인한다.
- 제출 본문의 코드가 첨부 원본 코드와 같은지, 다르다면 학생이 무엇을 수정했는지 설명했는지 확인한다.
- 제출 본문 설명이 원본 코드의 핵심 동작, 직접 수정한 부분, 실행 결과와 연결되는지 확인한다.
- 당일 해당 과정의 영상/퀴즈/데이터 로그가 정규 기준 대비 어느 정도인지 확인하고, Python 과제에서만 CODE TRACE·LUMI 기록을 추가 확인한다.
- 비-Python 과제라면 최종 문안과 근거 패널에 CODE TRACE·LUMI가 노출되지 않는지 마지막으로 확인한다.
- 이전 제출에서도 같은 문제가 반복되는지 확인한다.
- 반복되는 경우 단순 감점으로 끝내지 말고, 보완요청, 보호자 안내, 개별 학습 점검 중 어떤 조치가 학생 행동 변화를 만들 수 있을지 결정한다.

초안 저장만으로는 학생 화면에 피드백이 노출되지 않는다.
