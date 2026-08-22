# LUMI Protocol 요구사항 추적표

## 1. 목적

이 표는 설계 문장, 구현 작업, 테스트와 코드 리뷰를 연결한다. 상태 값은 구현 담당자가 갱신한다.

```text
planned → in_progress → implemented → verified
```

문서를 만든 현재 상태는 모두 `planned`다.

## 2. 제품·학습 요구사항

| ID | 요구사항 | 설계 근거 | 작업 | 검증 | 상태 |
| --- | --- | --- | --- | --- | --- |
| LP-01 | 상황을 문법보다 먼저 제시 | 01 §4, 02 전체 | P0-07 | `test-phase5-missions.mjs` | verified |
| LP-02 | 미션당 새 핵심 사고 개념 1개 | 01 §4 | P0-07 | `lumiCourseCatalog.js` | verified |
| LP-03 | API는 체험 뒤 명명 | 01 §4, 03 | P0-07 | `test-phase1-api-evaluator.mjs` | verified |
| LP-04 | 편집 자유도 점진 확대 | 01 §4, 03 | P0-04, P0-07 | `PythonMissionLab.jsx` scaffold | verified |
| LP-05 | UI 기능을 개념과 함께 해제 | 01 §4 | P0-04 | `PythonMissionLab.jsx` visibleTools | verified |
| LP-06 | Run·Reset·힌트에 학습 페널티 없음 | 01 §4, §7 | P0-08 | `test-phase1-api-evaluator.mjs` | verified |
| LP-07 | transfer를 숙련과 분리 기록 | 01 §4, §7 | P0-08 | `test-phase5-missions.mjs` | verified |

## 3. UX·Vertical Slice 요구사항

| ID | 요구사항 | 설계 근거 | 작업 | 검증 | 상태 |
| --- | --- | --- | --- | --- | --- |
| UX-01 | 첫 화면은 World+Code+RUN 중심 | 01 §8, 03 §2 | P0-04 | `PythonMissionLab.jsx` VS-01 | verified |
| UX-02 | 루미·목표·경로가 즉시 식별됨 | 01 §8, 03 §2 | P0-05 | `PythonWorldCanvas.jsx` | verified |
| UX-03 | raw JSON 대신 시각적 Trace | 01 §8 | P0-06 | `PythonMissionLab.jsx` memory-list | verified |
| UX-04 | reduced motion·키보드·반응형 | 01 §8 | P0-04, P0-05 | `PythonMissionLab.css` | verified |
| VS-01~06 | 첫 20~25분 Movement Core | 03 §3 | P0-02~07 | `test-phase5-missions.mjs` | verified |
| VS-07~10 | Memory·Sensor·첫 if 검증 | 03 §3 | P0-02~08 | `test-phase5-missions.mjs` | verified |

## 4. Runtime·Playback·API 요구사항

| ID | 요구사항 | 설계 근거 | 작업 | 검증 | 상태 |
| --- | --- | --- | --- | --- | --- |
| RT-01 | 실행 결과를 event tape로 만든 뒤 재생 | 04 §2, §5 | P0-03 | `test-phase2-reducer-determinism.mjs` | verified |
| RT-02 | 학생 line/column을 정확히 유지 | 04 §4, §13 | P0-02, P0-09 | line/sourceLine 구현, sourceColumn·오류 marker 미구현 | in_progress |
| RT-03 | runtime limit와 sandbox 유지 | 04 §14 | P0-02, P0-03 | `pythonWorld.worker.js` | verified |
| PB-01 | play/pause/step/seek/replay가 순수 event 기반 | 04 §5 | P0-03 | `test-phase2-reducer-determinism.mjs` | verified |
| API-01 | Beginner API v1과 `steps_to_target` | 04 §3 | P0-02 | `test-phase1-api-evaluator.mjs` | verified |
| INPUT-01 | 월드 UI로 실제 Python `input()` 경험 | 02 §3, 04 §6 | P1-01 | 계획 및 P1 대상 | planned |

## 5. 데이터 학습·평가·진행 요구사항

| ID | 요구사항 | 설계 근거 | 작업 | 검증 | 상태 |
| --- | --- | --- | --- | --- | --- |
| DATA-01 | `split()`으로 신호 패킷 해독 | 02 Act 7 | P2 Act 7 | P2 대상 | planned |
| DATA-02 | `join()`으로 항로 메시지 조립 | 02 Act 7 | P2 Act 7 | P2 대상 | planned |
| DATA-03 | tuple 좌표·unpacking·고정 묶음 학습 | 02 Act 7, 04 §3 | P0-02 API, P2 Act 7 | `pythonWorld.worker.js` position | in_progress |
| ASMT-01 | world goal, 이해, transfer 별도 평가 | 01 §7, 04 §8 | P0-08 | `test-phase1-api-evaluator.mjs` | verified |
| ASMT-02 | 대체 풀이 허용·hardcoding 전이 실패 | 03 VS-10, 04 §8 | P0-07, P0-08 | `test-phase5-missions.mjs` | verified |
| PROG-01 | Assistance를 별과 분리 저장 | 01 §7, 04 §9 | P0-08 | `test-phase6-progress-evaluator.mjs` | verified |
| PROG-02 | 더 낮은 도움 재성공을 best로 저장 | 04 §9 | P0-08 | `test-phase6-progress-evaluator.mjs` | verified |
| COMPAT-01 | 기존 20개 미션·진행·direct entry 보존 | 02 §5, 04 §10·15 | P0-01, P0-08 | `test-python-mission-utils.mjs` | verified |

## 6. 일일 기록·광석·과제 피드백 요구사항

| ID | 요구사항 | 설계 근거 | 작업 | 검증 | 상태 |
| --- | --- | --- | --- | --- | --- |
| FEED-01 | LUMI 미션 최초 완료와 과정 진행을 일일 학습기록에 표시 | 10 §3·5 | P1-LUMI-01 | history/progress 중복 제거 테스트, 일일 타임라인 QA | planned |
| FEED-02 | LUMI 완료·진행을 Python 과제의 코드 실습 근거로 반영 | 10 §6 | P1-LUMI-02 | export/service 공통 fixture | planned |
| FEED-03 | CODE TRACE와 LUMI를 비-Python 과제에서 하드 게이트로 제외 | 10 §7 | P1-LUMI-03 | 과정 격리 매트릭스 | planned |
| FEED-04 | 초등수학의 중등수학 레벨업 예외와 Python 전용 활동 격리를 동시에 유지 | 10 §7.4 | P1-LUMI-03 | 초등→중등 허용, Code Trace/LUMI 제외 회귀 테스트 | planned |
| REWARD-01 | 일반 미션 4·Field Test 8, 파일럿 기본 총 48광석 | 10 §4.1 | P1-LUMI-04 | 정책 단위 테스트 | planned |
| REWARD-02 | 미션 최초 완료에만 정확히 한 번 지급 | 10 §4.3 | P1-LUMI-04 | 동시 클릭·재시도·재실행 멱등 테스트 | planned |
| REWARD-03 | 잔고·성장·progress·history·원장을 하나의 transaction으로 일치 | 10 §4.3 | P1-LUMI-04 | transaction 원자성·합계 불변식 테스트 | planned |
| REWARD-04 | 실패·Reset·STOP·힌트·재생에는 보상이나 차감 없음 | 10 §2.3·4 | P1-LUMI-04 | 부정 경로 테스트 | planned |

## 7. 구현자가 갱신할 증거

`implemented` 또는 `verified`로 바꿀 때 다음 중 하나 이상을 증거 칸에 링크하거나 기록한다.

- 테스트 파일과 test case 이름
- 구현 파일과 핵심 함수
- 수동 QA 스크린샷/영상 경로
- 데이터 migration/adapter 설명
- 파일럿 결과 문서

요구사항을 의도적으로 변경하면 표만 수정하지 말고 원 설계 문서와 변경 이유를 함께 갱신한다.
