# LUMI Protocol 구현 백로그·완료 조건·테스트 계획

## 1. 작업 원칙

- 우선순위는 `P0 Vertical Slice → P1 Core Engine → P2 Curriculum Expansion` 순서다.
- P0가 학생 테스트 게이트를 통과하기 전에 전체 미션 제작을 시작하지 않는다.
- 각 작업은 관련 요구사항 ID, 테스트, 수동 QA 증거를 포함해야 완료다.
- 현재 `npm run test:python-mission`을 깨뜨리지 않고 v2 계약 테스트를 점진 추가한다.
- 기존 20개 미션과 진행 기록의 호환을 별도 완료 조건으로 취급한다.

## 2. P0 — Vertical Slice

### P0-01. Baseline과 feature flag

관련: `RT-01`, `COMPAT-01`

작업:

- 현재 20개 미션, evaluator, progress utility의 baseline 테스트 고정
- `lumiProtocolV2` feature flag 또는 동등한 안전한 라우팅 추가
- flag off에서 기존 Hub와 미션 진입 동작 보존
- 새 course catalog와 legacy unit adapter 골격 추가

완료 조건:

- `npm run test:python-mission` 통과
- flag off 화면·진행 변경 없음
- flag on에서 Act 0 route가 표시되며 legacy direct link도 동작
- 기존 완료 데이터가 새 화면에서 사라지지 않음

### P0-02. Beginner API와 pre-bound globals

관련: `API-01`, `VS-01`~`VS-03`

작업:

- `lumi.wake()`와 `lumi.awake` 추가
- `world.steps_to_target` 추가
- `world.target_distance` legacy alias 유지 및 설명 수정
- `lumi.position` tuple 추가
- student globals에 `lumi`, `world` pre-bind
- visible code에서 import 제거

완료 조건:

- `lumi.move(1)`이 import 없이 실행
- SyntaxError/Trace line이 student code line과 일치
- legacy import 코드도 계속 실행
- `steps_to_target`과 alias가 동일 값 반환
- `(x, y)` position이 JSON-safe trace에서 tuple 의미를 잃지 않도록 표시 정책 존재

### P0-03. Event tape v2와 playback reducer

관련: `PB-01`, `MEM-01`, 기술 명세 5장

작업:

- v2 event envelope와 normalization layer 추가
- line, command, move, turn, say, wake, error 이벤트 생성
- pure world reducer 추가
- event grouping으로 의미 Step 생성
- play/pause/previous/next/replay/speed 구현

완료 조건:

- 같은 입력으로 의미 이벤트 snapshot이 동일
- playhead를 앞뒤로 움직여도 같은 world state 재구성
- playback skip 뒤 final world가 normal playback과 동일
- runtime error 앞까지 event tape 재생 가능
- reduced-motion mode에서도 상태와 강조가 이해 가능

### P0-04. Progressive Tool Shell

관련: `UX-01`~`UX-04`

작업:

- mission의 `visibleTools`에 따라 패널/컨트롤 노출
- 첫 미션의 최소 화면 구현
- Step, Memory, Sensor, Timeline unlock 상태 저장
- Hub를 병렬 카드에서 선형 항로 지도 형태로 v2 flag 아래 교체

완료 조건:

- VS-01에서 API/Trace/raw JSON/전체 탭이 보이지 않음
- VS-04 완료 전 STEP이 활성 학습 도구로 노출되지 않음
- VS-07에서 Memory Core가 나타남
- VS-09에서 Sensor Overlay가 나타남
- 새로고침 후 unlock 상태 유지
- 키보드와 터치로 주요 컨트롤 접근 가능

### P0-05. World action effects

관련: `VS-01`~`VS-06`, `UX-02`

작업:

- wake, move, turn, say action renderer
- line-to-world command pulse
- path tween, 말풍선, target highlight
- 성공·충돌·blocked 상태 표현
- 카메라/레이아웃 프레이밍 개선

완료 조건:

- 기본 화면에서 루미와 목표 식별 가능
- multi-step move가 path별로 보임
- say 메시지가 월드 말풍선으로 보임
- 효과를 skip/reset해도 UI가 stuck되지 않음
- 작은 화면에서 월드 오브젝트가 editor에 가려지지 않음

### P0-06. Visual Memory와 Sensor Overlay

관련: `VS-07`~`VS-10`, `MEM-02`, `API-01`

작업:

- 변수 snapshot delta 생성
- frame-aware Memory Core
- sensor read event와 code/world/value 연결 표시
- condition evaluated/skip 표시

완료 조건:

- `energy: 5 → 3`이 raw JSON 없이 표시
- 변수 생성과 변경을 구분
- `world.steps_to_target → 4 → steps` 흐름 표시
- False if block은 `SKIPPED`로 표현
- list/dict가 아직 등장하지 않은 미션에서 복잡한 inspector를 노출하지 않음

### P0-07. 첫 10개 mission catalog

관련: `VS-01`~`VS-10`

작업:

- schema v2 validation
- Act 0 6개 + 다음 세션 4개 작성
- 각 미션 starter, world, goals, evidence, hints, transfer 정의
- 모든 API가 도입 순서를 지키는지 catalog validation

완료 조건:

- 10개 미션 모두 대표 풀이 통과
- 의도된 오답과 우회 풀이 테스트 존재
- transfer가 있는 미션은 base hardcoding을 탐지
- VS-01~06이 선수 지식 없이 순서대로 플레이 가능
- 일반 story intro가 15초 이내 또는 skip 가능

### P0-08. 평가·Assistance·진행 저장

관련: `ASMT-01`, `ASMT-02`, 제품 명세 7장

작업:

- mastery 세 층과 stars 분리
- Assistance Level/힌트 종류 기록
- 가장 낮은 도움 수준 성공 기록 병합
- 기존 independent/hinted count 보존
- course/act/tool unlock 저장

완료 조건:

- 힌트 사용이 별을 직접 깎지 않음
- 같은 3성이라도 assistance 0과 3을 구분 저장
- 나중에 assistance 0으로 재성공하면 best assistance가 개선
- 기존 progress 문서 읽기 가능
- 저장 실패가 미션 결과 playback을 막지 않고 재시도 경로 제공

### P0-09. 친절한 오류와 컬럼 표시

관련: `VS-05`, 기술 명세 13장

작업:

- sourceLine/sourceColumn normalization
- 괄호, 따옴표, 콜론, 들여쓰기, 이름 오류 피드백 코드
- editor marker와 world evidence 연동
- raw Python error 펼쳐 보기

완료 조건:

- import를 숨긴 상태에서도 줄 번호 오프셋 없음
- 잘못된 원인을 단정하지 않음
- syntax/semantic/world-goal failure가 다른 UI로 구분
- 오류 직전 event replay 가능

### P0-10. QA·측정·문서 handoff

작업:

- Vertical Slice metrics event 정의
- PC/태블릿/작은 화면 수동 QA
- 느린 런타임 load/retry/worker recycle QA
- 구현 결과와 미완료 항목 문서화

완료 조건:

- 이 문서의 출시 게이트 결과 표 작성
- 10개 미션 smoke test 기록
- 알려진 이슈와 severity 제공
- 코드 리뷰 체크리스트의 P0 항목 자체 점검 완료

## 3. P1 — Core Engine 보강

P0 파일럿 뒤 진행한다.

| ID | 작업 | 핵심 완료 조건 |
| --- | --- | --- |
| P1-01 | 관제 `input()` 패널과 runtime queue | 실제 `input()`은 str 반환, hidden input variant 지원 |
| P1-02 | Predict/Understanding 평가 | 별 2개의 근거가 명시적이며 오답이 별을 영구 차단하지 않음 |
| P1-03 | Hint ladder/Rescue | 4단계 도움과 assistance 저장, transfer 재도전 |
| P1-04 | Mission schema validator | prerequisite cycle, editable range, API unlock 검증 |
| P1-05 | Mission author preview | base/transfer/오류/reduced-motion 미리보기 |
| P1-06 | 교사 진단 요약 | concept와 assistance를 분리해 표시 |
| P1-07 | tablet input bar | 들여쓰기·괄호·콜론·따옴표 입력 지원 |

## 4. P2 — 커리큘럼 확장

P1 엔진을 사용해 Act 단위로 확장한다.

```text
Act 1~2 → Act 3~4 → Act 5~6 → Act 7 → Act 8 → Final
```

특히 다음 콘텐츠는 명시적으로 포함한다.

- A2-06: 관제 입력 UI + `input()` + `int()`
- A7-05: `split()` 신호 패킷 해독
- A7-06: `join()` 항로 메시지 조립
- A7-07~08: tuple 좌표와 unpacking
- A8-07: 실제 import 공개

Act 7은 한 번에 제작하지 말고 list → split/join → tuple → dictionary 순서로 학생 테스트한다.

## 5. 파일별 예상 변경 지도

| 파일/영역 | 예상 변경 |
| --- | --- |
| `pythonMissionCatalog.js` | legacy catalog 유지, v2 catalog/adapter 연결 |
| 신규 `lumiCourseCatalog.js` | Act, mission set, prerequisite, unlock 정의 |
| `PythonProtocolHub.jsx` | feature-flagged route map |
| `PythonMissionLab.jsx` | orchestrator 역할로 축소, progressive shell 연결 |
| `PythonWorldCanvas.jsx` | event reducer/action renderer, 프레이밍 |
| `runtime/pythonWorld.worker.js` | Beginner API, input queue, event v2, pre-bound globals |
| `runtime/PythonRuntimeClient.js` | input/event schema/version 전달 |
| `missionEvaluator.js` | mastery/understanding/transfer 평가 |
| `pythonMissionSchema.js` | schema v2 validation |
| `pythonMissionProgressUtils.js` | assistance/tool/act additive merge |
| `scripts/test-python-mission-utils.mjs` | legacy + v2 회귀 |
| 신규 테스트 scripts | event, catalog, evaluator, progress 계약 |

실제 구조가 더 단순하게 목적을 달성한다면 파일명은 변경할 수 있다. 다만 책임 경계와 계약 테스트는 유지해야 한다.

## 6. 자동 테스트 계획

현재 프로젝트 관례에 맞춰 Node assert 기반 script를 우선 사용한다.

### 6.1 Catalog/schema

- mission ID 중복 없음
- prerequisite cycle 없음
- Act 순서와 unlock 일관성
- starterCode와 editable range 유효성
- 사용 API가 catalog에 존재
- hints level 순서와 Rescue 존재 여부
- transfer override가 base를 mutate하지 않음

### 6.2 Evaluator

- world success만으로 1성
- concept/understanding 통과로 2성
- 모든 transfer 통과로 3성
- 힌트 사용이 별을 변경하지 않음
- assistance가 별도 저장
- 대체 풀이가 concept evidence를 만족하면 통과
- hardcoded 공개 답이 transfer에서 실패

### 6.3 Progress

- v1 progress normalization
- 새 완료 병합 시 기존 bestStars 보존
- best assistance는 가장 낮은 값 유지
- course/act/tool unlock union
- mission major ID 변경 mapping
- 기존 unit completion grandfathering

### 6.4 Event/reducer

- seq 단조 증가와 중복 없음
- sourceLine 1-based
- 동일 입력의 event 의미 snapshot 동일
- event prefix별 world state 정확
- playhead rewind/replay 정확
- list/dict/tuple JSON-safe 제한
- error 이전 event 보존

### 6.5 Runtime contract

- import 없는 `lumi.move`
- legacy import 코드
- forbidden import/builtin 차단
- command/event/output limit
- `input()` str 반환과 queue exhaustion 오류
- transfer input override
- infinite loop STOP 후 worker 복구

## 7. 수동 QA 매트릭스

| 환경 | 필수 확인 |
| --- | --- |
| Desktop Chrome | 전체 10개, keyboard, replay, resize |
| Safari macOS | Pyodide load, editor IME, playback |
| iPad Safari | touch controls, keyboard open/close, scroll trap 없음 |
| Android Chrome | 작은 화면, input bar, world 가독성 |
| 느린 네트워크 | loading 설명, retry, draft 보존 |
| reduced motion | 상태 이해 가능, 애니메이션 의존 없음 |
| muted audio | 시각·텍스트만으로 완료 가능 |

## 8. Definition of Done

작업은 코드가 동작하는 것만으로 완료되지 않는다.

- 요구사항 ID가 PR/커밋 설명에 연결됨
- 관련 자동 테스트 추가 및 통과
- 기존 `test:python-mission`, lint, build에 새 회귀 없음
- 접근성/반응형 수동 QA 완료
- progress/schema 호환 설명 존재
- failure/rollback 방식 존재
- 미완료 범위가 명시됨
- 사용자-facing 문자열이 초급 용어와 일치
- 코드 리뷰 체크리스트 자체 점검 완료

