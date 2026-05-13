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
- 이전 피드백에 대한 학생의 이모티콘 평가나 코멘트가 있으면 반드시 읽고, 다음 피드백에서 짧게 반응한다.
- 학습량이 매우 낮거나 제출물과 학습 기록이 맞지 않는 경우에도 단정적으로 비난하지 않는다. 대신 확인된 사실, 다음 제출에서 회복할 행동, 반복 시 운영자가 검토할 조치를 분명히 남긴다.

## 정규 학습 시간 기준

피드백과 보너스 광석은 아래 기준 대비로 판단한다.

| 과정 | 정규 기준 | 판단 방식 |
| --- | --- | --- |
| 초등수학 | 독서 20분 + 수학 20분 | 플랫폼 기록은 수학 20분 기준으로 보고, 독서는 제출문 근거로만 판단 |
| 중등수학 | 50분 | 영상, 데이터 로그, 퀴즈 기록을 합쳐 학습 흐름 판단 |
| Python | 50분 | 영상, 데이터 로그, 퀴즈, 코드 제출을 함께 판단 |

주의:

- 영상 시청은 반드시 실제 기록된 개수와 시간을 쓴다. 예: `자연수와 소수의 곱셈 #1` 1개, 4분 47초.
- 같은 날 다른 행성 기록은 “같은 날 다른 학습도 있었다”로만 말하고, 해당 과제의 학습량으로 합산하지 않는다.
- `learningSummary.allTitles`는 참고용 전체 기록이고, 피드백 문장의 기준은 `learningSummary.videos`, `quizzes`, `dataLogs`, `inProgressQuizzes`다.
- `learningSummary.progressTitles`와 `progressVideos`는 진행/부분 시청 참고용이다. 완료 영상 개수처럼 말하지 않는다.
- 초등수학에서 독서퀴즈/독서 활동만 있고 수학 영상, 수학 퀴즈, 데이터 로그가 없으면 수학 20분 학습이 비어 있다는 점을 반드시 언급한다.
- 이때 독서 활동은 인정하되, “오늘 수학 기록은 아직 확인되지 않았어요. 다음 시간에는 수학 영상 뒤에 확인 퀴즈까지 이어가면 좋겠습니다.”처럼 부드럽게 안내한다.

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
- 메타센스 프로필명
- 같은 학생의 이전 과제 5건
- 같은 날짜 다른 제출
- 제출일 학습 기록 상세
  - 영상 시청 시간
  - 집중도 광석 획득/놓침
  - 타임어택 성공/실패
  - 완료 보너스 획득/놓침
  - 완료 또는 진행 중 퀴즈 현황
  - 과정별 정규 학습량 대비 수준
  - 영상/퀴즈/데이터 로그 균형
- 매터센스/복습 기록 요약
  - 최근 오답/복습 표시 개념
  - 문제 미리보기
  - 마지막 실패/복습 시점

## 2. Codex가 직접 검토해 피드백 JSON 작성

출력 파일 `/private/tmp/pending_assignment_contexts.json`을 읽고, 과제별로 직접 피드백을 작성한다. 저장 파일은 아래 경로를 사용한다.

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
- Python 또는 코드 제출 과제는 제출 본문뿐 아니라 첨부파일/링크의 원본 코드까지 확인한다. 첨부 원본 코드, 제출 본문에 붙여 넣은 코드, 제출하면서 기입한 설명 텍스트가 서로 맞지 않으면 반드시 운영자 확인 포인트로 남긴다.
- 정해진 커리큘럼을 벗어나는 별도 다음 미션은 쓰지 않는다.
- `learningSummary.concernSignals`가 있으면 반드시 `더 발전시키면 좋은 점`에 반영한다.
- `learningSummary.learningLoad`를 확인해 정규 학습량 대비 충분/조금 부족/부족을 판단한다.
- 초등수학은 `learningSummary.mathActivityCount`, `readingActivityCount`, `readingQuizCount`를 함께 본다. 독서 기록만으로 수학 학습을 했다고 쓰지 않는다.
- 영상 개수와 시간은 `learningSummary.videos` 기준으로만 적는다.
- 영상만 있고 퀴즈나 데이터 로그가 없으면 “영상을 본 뒤 확인 활동이 부족하다”고 부드럽게 안내한다.
- 퀴즈가 진행 중이면 완료로 단정하지 말고 진행도와 오답 수를 함께 언급한다.
- `learningSummary.attention.opportunities > 0`이면 집중도 광석 획득률을 확인하고, 낮을 때는 부드럽지만 구체적으로 언급한다.
- `learningSummary.inProgressQuizzes`가 있으면 완료 여부보다 현재 진행도와 오답 개수를 함께 본다.
- `darkMatterSummary.concepts` 또는 `darkMatterSummary.items`가 있으면 “어떤 개념이 아직 불안정한지”를 피드백에 연결한다.
- 제출문만 길게 요약하고 학습 기록/매터센스를 언급하지 않는 피드백은 불합격으로 보고 다시 작성한다.
- 제출 원본, 제출문, 학습 기록 사이에 불일치가 있으면 “좋은 시도”로 뭉개지 않는다. 예: 첨부 원본 코드에는 `draw()` 메서드가 없는데 제출 본문 코드에는 `draw()`가 있는 것처럼 적혀 있거나, 원본 코드는 조건문 실습인데 제출 설명은 반복문 게임을 말하는 경우처럼 코드 내용과 설명이 서로 다르면 `학습 기록에서 확인한 점` 또는 `더 발전시키면 좋은 점`에 구체적으로 쓴다.
- 영상 시청이 1분 미만이거나 정규 기준의 10% 미만이면 “거의 학습하지 않은 기록”으로 본다. 이때 제출 자체는 인정하되, 학습량 부족을 피드백의 중심 근거로 삼고 보너스와 운영자 조치 판단에도 반영한다.
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
{영상 시청 시간, 집중도 광석, 타임어택, 완료 보너스, 퀴즈 진행도/점수}

#### 질문에 대한 답변
{학생이 질문한 내용에 대한 정확한 답변. 질문이 없으면 이 섹션 생략}

#### 이전보다 좋아진 점
{이전 제출/이전 피드백/최근 학습 흐름과 비교한 변화}

#### 더 발전시키면 좋은 점
{매터센스 약점 또는 집중도/퀴즈 오답과 연결한 보완점}
```

## 저학습/제출 불일치 경보 처리

아래 중 하나라도 해당하면 피드백 초안에 경보를 반영하고, 필요한 경우 `suggestedStatus`, `revisionRequest`, `suggestedBonusCrystals`를 보수적으로 제안한다.

경보 조건:

- 제출일 영상 시청이 1분 미만이거나 정규 기준의 10% 미만이다.
- 영상 기록만 아주 짧고 퀴즈, 데이터 로그, 코드 실행 흔적, 진행 중 퀴즈가 없다.
- 첨부 원본 코드와 제출 본문에 붙여 넣은 코드가 서로 다르거나, 실행하면 바로 오류가 날 가능성이 크다.
- 첨부 원본 코드와 제출 본문 설명이 서로 다른 과제를 말하는 것처럼 보인다.
- 제출 본문이 코드 원본을 설명하지 못하고, 이전 제출과 비교해 새로 배운 흔적이 거의 없다.
- 같은 학생의 이전 제출에서도 낮은 학습량 또는 제출 불일치가 2회 이상 반복된다.

피드백 작성 원칙:

- 학생에게는 “아무거나 복사했다”, “공부를 안 했다”처럼 의도를 단정하는 문장을 쓰지 않는다.
- 대신 “오늘 기록으로는 영상 학습이 16초만 확인되어, 이 과제를 충분히 학습했다고 보기는 어렵습니다.”처럼 관찰 사실을 말한다.
- 불일치는 “첨부한 원본 코드와 제출 본문에 적은 코드/설명이 서로 맞지 않아, 선생님이 어떤 부분을 직접 이해하고 만든 것인지 확인하기 어렵습니다.”처럼 설명한다.
- 다음 행동은 작고 확인 가능하게 제시한다. 예: “다음 제출에서는 영상 1개를 끝까지 보고, 코드에서 직접 바꾼 줄 2곳과 실행 결과 1가지를 적어 주세요.”
- 반복 신호가 있으면 “지난 제출과 비교해 새로 늘어난 학습 기록이 거의 보이지 않습니다. 이번에는 제출보다 먼저 학습 기록을 남기는 순서로 바꿔 봅시다.”처럼 행동 변화를 요구한다.
- 학습을 회복할 여지를 반드시 남긴다. 예: “다음 제출에서 영상 끝까지 보기와 확인 퀴즈/실행 결과를 함께 남기면 보너스 광석을 다시 높게 받을 수 있습니다.”

운영자 조치 제안:

- 첫 발생: `suggestedStatus: "reviewed"`를 유지할 수 있으나, 보너스는 낮게 제안하고 다음 행동을 명확히 적는다.
- 2회 반복: `suggestedStatus: "needs_revision"` 또는 `revisionRequest` 작성을 검토한다. 보완요청 문구에는 다시 제출할 최소 조건을 넣는다.
- 3회 이상 반복: 운영자가 보호자 안내, 개별 학습 점검, 제출 방식 재안내를 검토할 수 있도록 `aiFeedbackPayload.parentSummary` 또는 운영자 메모용 요약에 반복 신호를 남긴다.

보완요청 문구 예시:

```markdown
이번 제출은 첨부한 원본 코드와 제출 본문에 적은 코드/설명이 서로 맞지 않고, 제출일 학습 기록도 매우 짧아 과제를 충분히 수행했는지 확인하기 어렵습니다. 영상을 끝까지 학습한 뒤, 직접 수정한 코드 2곳과 실행 결과 1가지를 적어 다시 제출해 주세요.
```

상호작용 문장 예시:

```markdown
지난번에 이야기했던 “영상 뒤 확인 퀴즈까지 이어가기”를 오늘 바로 챙겨 준 점이 보여서 정말 반가웠어요. 이런 식으로 피드백을 듣고 바로 실천하는 태도에는 보너스 광석 10개를 더 얹어 주고 싶습니다.
```

주의: 이 문장은 실제로 이전 피드백에 해당 제안이 있었고, 오늘 학습 기록에서 그 행동이 확인될 때만 쓴다.

## 보너스 광석 기준

`suggestedBonusCrystals`는 10~40 사이로 준다. 박하게 깎기보다 다음 학습 행동을 유도하는 신호로 쓴다.

| 광석 | 기준 |
| --- | --- |
| 10 | 제출은 했지만 학습 기록/내용 근거가 매우 약함. 영상 1분 미만, 원본/설명 불일치, 이전과 진전 없음이 함께 보이면 이 범위를 우선 검토 |
| 20 | 기본 제출은 했으나 정규 학습량 대비 부족하거나 확인 활동이 거의 없음 |
| 25 | 제출 내용이 성실하고 일부 학습 기록이 있으나, 기준 시간이나 균형이 부족함 |
| 30 | 학습량이 절반 이상이고 제출 기록이 구체적임 |
| 35 | 정규 기준에 가깝고 영상/퀴즈/데이터 로그 흐름이 비교적 균형 있음 |
| 40 | 기준 학습량 충족, 기록 구체성, 집중도, 약점 보완 또는 질문까지 모두 좋음 |

예: 초등수학 과제에서 수학 영상 1개를 4분 47초 시청하고 독서 기록을 남겼다면, “영상 3개 시청”처럼 쓰면 안 된다. 수학 플랫폼 학습량은 20분 기준으로는 부족한 편이므로, 제출 성실도와 독서 기록을 인정하되 25~30광석 범위에서 판단한다.

예: 초등수학 과제에서 독서퀴즈 2개만 있고 수학 영상/수학 퀴즈/데이터 로그가 없다면, 독서 활동은 인정하되 수학 20분 기록이 비어 있음을 언급한다. 이 경우 기본 보너스는 20~25광석이 적절하고, 다음 시간에 안내한 학습 흐름을 실제로 따르면 +10광석을 더해 30~35광석까지 줄 수 있다.

예: Python 과제에서 제출일 영상 시청이 총 16초이고, 퀴즈/데이터 로그/코드 실행 근거가 없으며, 첨부 원본 코드와 제출 본문 코드/설명이 서로 맞지 않는다면 10광석을 우선 검토한다. 같은 신호가 이전 제출에서도 반복되면 보완요청 또는 운영자 개별 점검 대상으로 제안한다.

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
- 당일 영상/퀴즈/데이터 로그가 정규 기준 대비 어느 정도인지 확인한다.
- 이전 제출에서도 같은 문제가 반복되는지 확인한다.
- 반복되는 경우 단순 감점으로 끝내지 말고, 보완요청, 보호자 안내, 개별 학습 점검 중 어떤 조치가 학생 행동 변화를 만들 수 있을지 결정한다.

초안 저장만으로는 학생 화면에 피드백이 노출되지 않는다.
