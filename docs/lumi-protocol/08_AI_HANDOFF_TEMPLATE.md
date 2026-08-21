# LUMI Protocol AI 협업 전달 템플릿

## 1. 구현 AI에게 전달할 권장 요청문

아래 문장을 복사한 뒤 이번에 맡길 P0 항목만 조정한다.

```text
MetaSense math-sense-app에서 LUMI Protocol Vertical Slice를 구현해 주세요.

작업 전에 다음 문서를 순서대로 모두 읽고, 문서 간 충돌은 README의 우선순위를 따르세요.

1. docs/lumi-protocol/README.md
2. docs/lumi-protocol/01_PRODUCT_AND_LEARNING_SPEC.md
3. docs/lumi-protocol/02_CURRICULUM_AND_CONTENT_SPEC.md
4. docs/lumi-protocol/03_VERTICAL_SLICE_SPEC.md
5. docs/lumi-protocol/04_TECHNICAL_IMPLEMENTATION_SPEC.md
6. docs/lumi-protocol/05_BACKLOG_ACCEPTANCE_AND_TEST_PLAN.md
7. docs/lumi-protocol/06_CODE_REVIEW_CHECKLIST.md
8. docs/lumi-protocol/07_REQUIREMENTS_TRACEABILITY.md

이번 작업 범위:
- [예: P0-01 Baseline과 feature flag]
- [예: P0-02 Beginner API와 pre-bound globals]

중요한 제약:
- 기존 20개 Python 미션, legacy direct entry와 기존 진행 데이터를 삭제하거나 깨뜨리지 마세요.
- 기능은 feature flag 또는 안전한 adapter 뒤에서 점진적으로 도입하세요.
- 학생에게 설명 없는 import를 다시 노출하지 마세요.
- Python 실행과 React 애니메이션을 직접 결합하지 말고 event tape → playback 구조를 지키세요.
- 힌트 사용은 별점을 깎지 않으며 Assistance는 별도 진단 데이터입니다.
- 요구사항 밖의 대규모 리팩터링과 무관한 파일 포맷 변경을 하지 마세요.

작업 방식:
1. 현재 구현과 테스트를 먼저 조사하세요.
2. 작업 계획에 P0 항목과 요구사항 ID를 연결하세요.
3. 관련 계약 테스트를 먼저 추가하거나 구현과 함께 추가하세요.
4. 각 수직 단위를 구현하고 테스트하세요.
5. docs/lumi-protocol/07_REQUIREMENTS_TRACEABILITY.md의 상태와 증거를 실제 구현 범위에 한해 갱신하세요.

완료 보고에는 다음을 반드시 포함하세요.
- 변경 파일 목록
- 구현한 P0/요구사항 ID
- 설계와 달리 판단한 부분 및 이유
- 실행한 테스트와 실제 결과
- 수동 QA 결과
- 기존 데이터/화면 호환 방식
- 미완료 항목과 알려진 위험
```

## 2. 권장 작업 분할

하나의 AI 작업에 P0 전체를 맡기기보다 다음 순서가 안전하다.

1. `P0-01 + P0-02`: catalog/flag/API/호환
2. `P0-03`: event tape와 pure playback reducer
3. `P0-04 + P0-05`: progressive shell과 world effects
4. `P0-06`: Memory/Sensor
5. `P0-07`: 첫 10개 콘텐츠
6. `P0-08 + P0-09`: 평가·진행·오류
7. `P0-10`: 통합 QA와 측정

각 단계 뒤 테스트가 통과한 상태를 유지한다. 앞 단계 계약이 불안정한데 UI와 콘텐츠를 동시에 확장하지 않는다.

## 3. 구현 완료 후 코드 리뷰 요청문

```text
LUMI Protocol 구현을 코드 리뷰해 주세요.

기준 문서:
- docs/lumi-protocol/README.md
- docs/lumi-protocol/01_PRODUCT_AND_LEARNING_SPEC.md
- docs/lumi-protocol/03_VERTICAL_SLICE_SPEC.md
- docs/lumi-protocol/04_TECHNICAL_IMPLEMENTATION_SPEC.md
- docs/lumi-protocol/05_BACKLOG_ACCEPTANCE_AND_TEST_PLAN.md
- docs/lumi-protocol/06_CODE_REVIEW_CHECKLIST.md
- docs/lumi-protocol/07_REQUIREMENTS_TRACEABILITY.md

구현 담당자의 완료 보고:
[여기에 완료 보고를 붙여 넣기]

리뷰 범위:
- 현재 git diff와 관련 파일을 직접 검사해 주세요.
- 설계 준수 여부보다 실제 버그·회귀·학습 흐름 위반·데이터 손실·평가 오류·접근성 문제를 우선해 주세요.
- P0/P1/P2/P3 우선순위로 actionable finding을 먼저 제시해 주세요.
- 각 finding에 파일과 좁은 줄 범위, 재현 조건, 영향, 수정 방향을 포함해 주세요.
- 문제가 없으면 남은 테스트 공백과 위험만 간단히 알려 주세요.
- 요청하지 않은 수정은 하지 말고 리뷰만 수행해 주세요.
```

## 4. 구현 담당자 완료 보고 템플릿

```markdown
## 구현 범위

- P0 항목:
- 요구사항 ID:

## 변경 파일

- `path`: 변경 이유

## 주요 설계 판단

- 판단:
- 문서와 다른 점:
- 이유:

## 호환과 데이터

- legacy 화면:
- 기존 progress:
- migration/adapter:
- rollback:

## 테스트

- 명령:
- 결과:

## 수동 QA

- 환경:
- 확인 항목:
- 결과:

## 미완료·알려진 위험

- 항목:
- 영향:
- 후속 작업:
```

## 5. 요구사항 변경 절차

구현 중 설계를 그대로 적용하기 어려울 때 구현자가 독단적으로 요구사항을 삭제하지 않는다.

1. 충돌하는 문서와 요구사항 ID를 밝힌다.
2. 현재 코드 근거와 실패 조건을 설명한다.
3. 최소 두 가지 대안을 비교한다.
4. 데이터·학습·UX·일정 영향을 적는다.
5. 결정된 변경을 원 설계와 추적표에 함께 반영한다.

단순한 파일명이나 내부 함수 분리는 구현자가 합리적으로 바꿀 수 있다. 학생 경험, 평가 의미, 진행 데이터, API 의미와 runtime 계약 변경은 명시적으로 합의한다.

