# LUMI Protocol 구현 문서 인덱스

상태: **구현 기준안**  
기준일: 2026-08-22  
범위: MetaSense Python World의 LUMI Protocol 재설계 및 Vertical Slice 구현

## 1. 이 문서 묶음의 목적

이 디렉터리는 구현 담당 AI/개발자와 이후 코드 리뷰 담당자가 같은 제품 계약을 사용하도록 만든 단일 기준 문서다.

기존 `docs/LUMI_PROTOCOL_PYTHON_WORLD_CURRICULUM_PLAN.md`는 초기 Mission Lab 설계와 장기 참고 자료로 유지한다. 단, **초급 진입 순서, 첫 Vertical Slice, Beginner API, 이벤트 계약, 진행 데이터와 구현 우선순위는 이 디렉터리의 문서가 우선한다.**

충돌 시 우선순위는 다음과 같다.

1. 이 `README.md`의 범위·우선순위 규칙
2. `01_PRODUCT_AND_LEARNING_SPEC.md`
3. `02_CURRICULUM_AND_CONTENT_SPEC.md`
4. `03_VERTICAL_SLICE_SPEC.md`
5. `04_TECHNICAL_IMPLEMENTATION_SPEC.md`
6. `05_BACKLOG_ACCEPTANCE_AND_TEST_PLAN.md`
7. `06_CODE_REVIEW_CHECKLIST.md`
8. 기존 `docs/LUMI_PROTOCOL_PYTHON_WORLD_CURRICULUM_PLAN.md`

## 2. 문서별 역할

| 문서 | 구현자가 답을 얻는 질문 |
| --- | --- |
| [01 제품·학습 명세](./01_PRODUCT_AND_LEARNING_SPEC.md) | 무엇을 만들며, 학생 경험에서 무엇을 지켜야 하는가? |
| [02 커리큘럼·콘텐츠 명세](./02_CURRICULUM_AND_CONTENT_SPEC.md) | 무엇을 어떤 순서로 가르치며, `input`·tuple·`split/join`은 어떻게 다루는가? |
| [03 Vertical Slice 명세](./03_VERTICAL_SLICE_SPEC.md) | 첫 10개 미션에서 화면·코드·이벤트·성공 조건은 정확히 무엇인가? |
| [04 기술 구현 명세](./04_TECHNICAL_IMPLEMENTATION_SPEC.md) | 런타임, 이벤트 테이프, API, 데이터 모델을 어떻게 구현하는가? |
| [05 백로그·완료 조건·테스트](./05_BACKLOG_ACCEPTANCE_AND_TEST_PLAN.md) | 어떤 순서로 개발하고 무엇을 통과해야 완료인가? |
| [06 코드 리뷰 체크리스트](./06_CODE_REVIEW_CHECKLIST.md) | 구현 후 어떤 기준으로 변경을 검토하고 승인하는가? |
| [07 요구사항 추적표](./07_REQUIREMENTS_TRACEABILITY.md) | 요구사항이 어느 설계·작업·테스트로 이어지는가? |
| [08 AI 협업 전달 템플릿](./08_AI_HANDOFF_TEMPLATE.md) | 다른 AI에게 어떻게 구현을 맡기고 이후 리뷰를 요청하는가? |

## 3. 이번 구현 범위

이번 기준 구현은 전체 50~65개 Core Mission을 한 번에 만드는 작업이 아니다.

P0 범위는 다음과 같다.

- 첫 세션 6개 미션과 전체 Vertical Slice 10개 미션
- 처음에는 import를 보이지 않는 pre-bound `lumi`/`world` 실행 환경
- 코드 실행 결과를 결정적 event tape로 만든 뒤 월드에서 재생하는 구조
- 단계적으로 해제되는 UI
- Beginner API v1
- 시각적 Memory/Trace
- 보상과 분리된 Assistance 진단 데이터
- 기존 20개 미션과 진행 데이터의 보존 경로
- 단위·계약·회귀 테스트

P0가 아닌 항목:

- 전체 커리큘럼 제작
- 자유 프로젝트 모드
- 진짜 인터프리터 일시정지형 디버거
- 3D 월드 전환
- 학생 코드를 아스트라 공유 월드에서 실행
- AI 기반 정답 판정
- 공개 랭킹과 코드 골프

## 4. 고정된 제품 결정

1. 첫 화면은 반복문 단원이 아니라 `LUMI AWAKENING`이다.
2. 첫 20~25분은 Wake → Move → 숫자 변경 → 순차 실행 → Say → Field Test로 끝낸다.
3. Vertical Slice 10개는 약 40~70분 분량이며 첫 세션과 동일하지 않다.
4. 전체 과정은 10 Acts, 약 50~65 Core Missions 범위로 운영하며 파일럿 뒤 개수를 확정한다.
5. 한 미션에는 하나의 새로운 **핵심 사고 개념**만 둔다. 직관적인 부수 문법은 허용한다.
6. `input()`은 제외하지 않는다. 콘솔 대신 월드 안의 관제 입력 패널로 값을 받아 실제 Python `input()`과 형 변환을 경험시킨다.
7. tuple과 `split/join`도 가르친다. 좌표 묶음과 신호 패킷이라는 실제 필요에서 도입한다.
8. `from metasense import lumi, world`는 초반에 보이지 않는다. Module/Ability 단계에서 의미를 공개한다.
9. Python 실행과 애니메이션은 직접 결합하지 않는다. 실행 → event tape 생성 → 평가 → playback 순서를 사용한다.
10. 힌트 사용은 별과 보상을 깎지 않는다. Assistance Level은 교사용 진단 데이터로 별도 저장한다.
11. 서사는 코딩을 방해하지 않도록 `코딩 70 / 월드 상호작용 20 / 서사 10`을 목표로 한다.
12. 기존 완료 기록과 현재 20개 미션은 삭제하지 않는다. 새 과정에 재배치하거나 legacy adapter로 유지한다.

## 5. 구현 담당 AI의 작업 규칙

- 구현 시작 전에 01~05 문서를 읽고, 작업 PR/커밋 설명에 관련 요구사항 ID를 적는다.
- 한 번에 P0 전체를 크게 바꾸지 말고 `P0-01`부터 수직 단위로 구현한다.
- 기존 사용자 변경과 무관한 파일을 정리하거나 포맷하지 않는다.
- mission catalog의 안정적인 ID를 임의로 재사용하거나 변경하지 않는다.
- 현재 Pyodide sandbox, 저장 경로, hidden variant 평가를 가능한 한 보존한다.
- API나 이벤트 스키마를 변경하면 계약 테스트를 먼저 추가한다.
- UX 구현은 데스크톱만 확인하고 끝내지 않는다. 최소 1100px, 720px breakpoint와 태블릿 터치를 검증한다.

## 6. 완료 산출물

구현 담당자는 최종적으로 다음을 제공해야 한다.

- 변경 파일 목록
- 충족한 요구사항 ID 목록
- 미완료·의도적 제외 항목
- 데이터 마이그레이션 또는 호환 방식
- 실행한 테스트와 결과
- 첫 10개 미션의 수동 QA 결과
- 알려진 위험과 후속 작업

## 7. 요구사항 ID 규칙

| 접두사 | 영역 |
| --- | --- |
| `LP` | 학습 원칙 |
| `UX` | 화면·접근성 |
| `VS` | Vertical Slice 미션 |
| `RT` | Python runtime·event tape |
| `PB` | playback |
| `API` | Beginner API |
| `INPUT` | 관제 입력과 Python `input()` |
| `DATA` | list·tuple·split/join·dictionary |
| `ASMT` | 평가·별·transfer |
| `PROG` | Assistance·진행 저장 |
| `COMPAT` | 기존 미션·진행 호환 |

구현 PR은 최소 하나 이상의 요구사항 ID와 P0/P1/P2 백로그 ID를 함께 적는다.
