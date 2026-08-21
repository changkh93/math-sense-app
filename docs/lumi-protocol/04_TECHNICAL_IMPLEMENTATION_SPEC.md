# LUMI Protocol 기술 구현 명세

## 1. 현재 구현에서 유지할 기반

현재 코드에는 다음 기반이 있으므로 재작성보다 확장을 우선한다.

| 기반 | 현재 위치 | 처리 |
| --- | --- | --- |
| Pyodide Worker | `src/components/PythonWorld/runtime/pythonWorld.worker.js` | 유지·계약 확장 |
| Worker client | `runtime/PythonRuntimeClient.js` | 유지·run payload와 상태 확장 |
| AST 개념 분석 | worker의 `_analyze` | 유지·개념 키 확장 |
| line/world events | worker `emit` | event tape v2로 정규화 |
| 월드 렌더러 | `PythonWorldCanvas.jsx` | action renderer와 카메라 확장 |
| Mission 평가 | `missionEvaluator.js` | 3단계 mastery와 assistance 분리 |
| hidden variants | `getMissionVariant` | transfer variant로 명명 보강 |
| 초안·시도 저장 | `PythonMissionLab.jsx` | 데이터 버전과 assistance 확장 |
| 진행 병합 | `pythonMissionProgressUtils.js` | 기존 기록 보존하며 v2 필드 추가 |

## 2. 목표 아키텍처

```text
Student Code + Mission Snapshot + Input Values
                    ↓
            Pyodide Worker 실행
                    ↓
   eventTape + stdout + finalState + evidence
                    ↓
              Mission 평가
                    ↓
        deterministic World Playback
                    ↓
       Progress/Attempt 비동기 저장
```

불변 규칙:

- Renderer는 최종 상태나 평가의 진실 원천이 아니다.
- Python 실행 중 React state를 직접 변경하지 않는다.
- 같은 mission/version/seed/code/input은 같은 의미 이벤트와 finalState를 만든다.
- 애니메이션 프레임 수나 기기 성능이 평가에 영향을 주지 않는다.
- playback을 건너뛰어도 평가 결과와 진행 저장은 동일하다.

## 3. Beginner API v1

### 3.1 학생에게 노출할 API

```python
# Rover commands
lumi.wake()
lumi.move(steps=1)
lumi.turn(degrees)
lumi.say(message)
lumi.scan(radius=99)
lumi.collect(target)
lumi.charge()

# Rover state
lumi.energy
lumi.position       # (x, y) tuple
lumi.awake

# World state
world.steps_to_target
world.path_clear
world.signal_strength
world.target_detected
world.objects
```

초기 10개 미션에 실제로 필요한 API부터 구현한다. 나머지는 catalog에서 사용하기 전에 계약 테스트와 도입 미션을 추가한다.

### 3.2 Legacy API

- `world.target_distance`는 기존 미션을 위해 alias로 유지할 수 있다.
- 새 미션과 새 UI 설명에서는 `world.steps_to_target`을 사용한다.
- 현재 계산이 맨해튼 거리이므로 “직선 거리”라는 설명을 사용하지 않는다.
- `world.snapshot()["target"]["x"]`는 런타임 디버깅용으로 남길 수 있지만 Beginner API 패널에는 노출하지 않는다.
- legacy alias 사용 시 개발 콘솔 경고는 가능하지만 학생 output을 오염시키면 안 된다.

### 3.3 API 의미

- `move(steps)`의 steps는 격자에서 실제로 시도할 칸 수다.
- 장애물·경계·에너지로 중단되면 이동한 path와 blocked reason을 이벤트에 기록한다.
- `turn(degrees)`는 v1에서 90도의 배수만 허용한다.
- `position`은 `(x, y)` tuple을 반환한다.
- `steps_to_target`은 현재 위치에서 목표까지의 격자 이동 칸 수다. 장애물을 고려한 최단 경로가 아니라면 문서에 “좌우·상하 칸 차이의 합”으로 정의한다.
- `path_clear`는 미션이 정의한 현재 전방 항로의 안전 Boolean이며, 목표까지 전체 경로 안전을 뜻하지 않게 모호하게 사용하지 않는다.

## 4. import 숨김 방식

### 4.1 P0 권장: pre-bound globals

P0에서는 학생 코드 앞에 문자열을 prepend하지 않는다. Worker의 `student_globals`에 `lumi`와 필요한 경우 `world`를 직접 바인딩한다.

```python
student_globals = {
    "__builtins__": allowed_builtins,
    "__name__": "__main__",
    "lumi": lumi,
    "world": world,
}
```

장점:

- 학생 코드와 runtime code의 줄 번호가 동일하다.
- Trace, SyntaxError, breakpoint 줄 변환이 필요 없다.
- 초반 UI에서 import를 숨겨도 실행 의미가 단순하다.
- Ability Core에서 실제 import를 작성해도 기존 `metasense` module과 함께 작동한다.

`world`를 배우기 전에도 runtime에 존재할 수 있지만 UI/자동완성/API 패널에서는 잠근다. 교육 잠금과 보안 경계를 혼동하지 않는다.

### 4.2 미래의 hidden prelude

미션별 setup code가 꼭 필요해 hidden prelude를 도입할 경우 단순 문자열 prepend만 허용하지 않는다.

```js
{
  runtimeSource,
  visibleSource,
  lineMap: {
    runtimeToStudent: { 3: 1, 4: 2 },
    studentToRuntime: { 1: 3, 2: 4 }
  }
}
```

Trace, exception, lint marker, active line, future breakpoint는 모두 student line으로 변환한 뒤 UI에 전달한다. hidden line event는 학생 event tape에서 제거하거나 `sourceLine: null`, `hidden: true`로 표시해 playback에서 건너뛴다.

## 5. event tape v2

### 5.1 이벤트 envelope

모든 이벤트는 다음 계약을 따른다.

```ts
type LumiEvent = {
  schemaVersion: 2
  seq: number
  type: string
  sourceLine: number | null
  frameId: string
  logicalTime: number
  phase: "execute" | "evaluate" | "system"
  payload: Record<string, unknown>
}
```

- `seq`: 0부터 증가하는 유일한 재생 순서
- `sourceLine`: 학생에게 보이는 1-based line. 해당 없으면 null
- `frameId`: `main`, `function:travel#1`처럼 실행 프레임을 구분하는 안정적 ID
- `logicalTime`: 실제 wall clock이 아니라 renderer용 결정적 상대 시간 힌트
- `phase`: 실행, 평가, 시스템 연출을 구분
- `payload`: 이벤트별 데이터

wall-clock timestamp, 랜덤 DOM ID, React key를 의미 이벤트에 넣지 않는다. 그렇지 않으면 결정성 테스트가 깨진다.

### 5.2 P0 이벤트 타입

```text
line_entered
memory_changed
condition_evaluated
command_started
command_completed
rover_moved
rover_turned
rover_spoke
rover_woke
sensor_read
input_read
collision
runtime_output
runtime_error
mission_evaluated
```

예:

```js
{
  schemaVersion: 2,
  seq: 17,
  type: "memory_changed",
  sourceLine: 4,
  frameId: "main",
  logicalTime: 920,
  phase: "execute",
  payload: {
    name: "energy",
    before: 10,
    after: 8,
    valueType: "int"
  }
}
```

이동 이벤트:

```js
{
  type: "rover_moved",
  payload: {
    start: { x: 1, y: 2 },
    end: { x: 4, y: 2 },
    path: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }],
    energyBefore: 100,
    energyAfter: 97,
    reachedTarget: true,
    blocked: false,
    blockedReason: null
  }
}
```

### 5.3 변수 delta

현재 line event에 전체 variables snapshot을 넣는 방식은 legacy 호환을 위해 유지할 수 있다. UI v2에서는 인접 snapshot을 비교해 `memory_changed`를 생성하거나 Worker에서 직접 delta를 기록한다.

주의:

- 같은 값으로 다시 대입한 경우 `before === after`를 표시할지 mission setting으로 정한다.
- 객체 repr을 그대로 장기 저장하지 않는다.
- list/dict/tuple은 깊이와 항목 수를 제한한 JSON-safe 값으로 변환한다.
- frame이 바뀌면 지역 변수 패널도 frame별로 구분한다.

### 5.4 Playback controller

필수 기능:

- play
- pause
- previous meaningful event
- next meaningful event
- seek by event index
- reset to initial world
- replay
- speed 0.5×, 1×, 2×
- skip animation while preserving final state

`line_entered`만 연속되는 경우 모든 이벤트를 동일한 화면 시간으로 재생하지 않는다. 의미 이벤트 그룹을 만들어 한 Step이 “한 실행 줄과 그로 인한 memory/world 변화”를 보여주도록 한다.

```js
type PlaybackStep = {
  sourceLine: number | null
  eventRange: [number, number]
  worldEvents: LumiEvent[]
  memoryEvents: LumiEvent[]
  annotation?: string
}
```

## 6. `input()` UI와 런타임 계약

### 6.1 목표

실제 Python `input()`의 의미를 유지하되 콘솔 프로그램처럼 보이지 않게 한다. P0/P1에서 Python 실행을 도중에 비동기 pause하지 않는다.

### 6.2 Mission schema

```js
interaction: {
  inputPanel: {
    title: "CONTROL INPUT",
    description: "관제소가 이동 칸 수를 전송합니다.",
    fields: [
      {
        id: "steps",
        label: "이동할 칸 수",
        inputMode: "numeric",
        defaultValue: "4",
        maxLength: 3
      }
    ]
  }
}
```

RUN 전에 UI가 필드 값을 수집해 문자열 배열로 Worker에 보낸다.

```js
runtime.run({
  mission,
  code,
  inputValues: ["4"]
})
```

### 6.3 Worker built-in

허용 builtins에 표준 `input` 대신 mission input queue를 읽는 함수를 넣는다.

```python
def mission_input(prompt=""):
    if not input_queue:
        raise MissionInputError("관제 입력값이 더 필요합니다.")
    value = input_queue.pop(0)
    emit("input_read", prompt=str(prompt), value=value)
    return str(value)
```

학생에게는 Python과 동일하게 항상 문자열을 반환한다. `int()`나 `float()` 변환은 학생 코드가 수행한다.

### 6.4 평가와 hidden variants

- 공개 실행은 학생이 입력 패널에 전송한 값 사용
- transfer run은 variant에 정의한 별도 `inputValues` 사용
- input 값이 바뀌어도 동작해야 3성
- 입력값 자체를 대표 성공 코드와 함께 영구 저장하지 않아도 된다. 민감 정보 입력을 허용하지 않는 미션 UI를 사용한다.
- mission input은 텍스트/숫자 학습용이며 비밀번호·개인정보를 요청하지 않는다.

## 7. Mission schema v2

```js
{
  id: "lumi-awakening-move-03",
  schemaVersion: 2,
  version: 1,
  actId: "act-0-awakening",
  order: 3,
  status: "draft",

  title: "에너지 셀까지",
  estimatedMinutes: 3,
  prerequisites: ["lumi-awakening-move-02"],

  story: {
    intro: [{ speaker: "LUMI", text: "에너지 신호가 세 칸 앞에 있어요." }],
    maxIntroSeconds: 15
  },

  learning: {
    primaryConcept: "call_argument_value",
    supportingConcepts: ["integer_literal"],
    misconception: "move(1)을 여러 번 실행해야만 멀리 갈 수 있다고 생각함"
  },

  scaffold: {
    mode: "edit-token",
    editableRanges: [{ line: 1, fromColumn: 11, toColumn: 12 }],
    visibleTools: ["run", "reset"],
    unlocksOnComplete: []
  },

  starterCode: "lumi.move(1)",
  api: ["lumi.move"],
  world: {},
  interaction: {},

  goals: [],
  conceptEvidence: {},
  transferVariants: [],
  hints: [],
  rewards: { coreProgress: 4 },
  limits: {}
}
```

검증 규칙:

- id, schemaVersion, version, title, primaryConcept, starterCode, world, goals 필수
- prerequisites 순환 금지
- editableRanges가 starterCode 범위를 벗어나면 실패
- visibleTools에 잠긴 도구를 임의로 표시하지 않음
- API는 Beginner API catalog에 존재해야 함
- transfer variant는 base mission의 안정적 필드를 임의로 덮어쓰지 않음
- story intro 추정 시간이 일반 미션 상한을 넘으면 경고
- required concept와 starterCode에 이미 완성되어 있는 concept가 충돌하면 경고

## 8. 평가 모델 v2

### 8.1 평가 결과

```js
{
  completed: true,
  stars: 3,
  mastery: {
    worldGoalPassed: true,
    conceptPassed: true,
    understandingPassed: true,
    transferPassed: true
  },
  assistance: {
    maxLevel: 2,
    hintsViewed: ["context", "concept"],
    rescueUsed: false
  },
  evidence: {
    conceptsUsed: ["if", "comparison"],
    callsUsed: ["lumi.move"],
    failedTransferVariantIds: []
  },
  feedback: {
    code: "FIELD_VERIFIED",
    message: "길 상태가 바뀌어도 안전하게 판단했습니다."
  }
}
```

### 8.2 별 계산

- 1성: world goal 통과
- 2성: concept evidence + 이해 확인 통과
- 3성: transfer variant 통과
- 해당 미션에 이해 확인이나 transfer가 없으면 획득 가능한 별 수를 UI에 명확히 표시하거나, 간단한 이해 확인/transfer를 제공한다.
- 구조적으로 다른 올바른 풀이를 문자열 비교로 거절하지 않는다.

현재 evaluator는 완료 시 conceptPassed가 항상 true이므로 hidden variant가 없는 미션이 자동으로 2성이 되는 구조다. v2에서는 별별 근거를 별도 Boolean으로 저장해 의미를 명확히 한다.

## 9. 진행 데이터 v2

기존 경로를 유지한다.

```text
users/{uid}/learning_progress/{unitOrCourseId}
users/{uid}/pythonMissionProgress/{missionId}
users/{uid}/pythonMissionProgress/{missionId}/runs/{runId}
```

요약:

```js
missionLab: {
  schemaVersion: 2,
  courseId: "lumi-season-1",
  courseVersion: 1,
  completedMissionIds: [],
  bestStarsByMission: {},
  bestAssistanceByMission: {},
  conceptMastery: {},
  unlockedToolIds: [],
  unlockedActIds: [],
  lastMissionId: "",
  completed: false
}
```

미션 시도:

```js
{
  missionId,
  missionVersion,
  code,
  completed,
  stars,
  mastery,
  assistance,
  error: { type, sourceLine, feedbackCode } | null,
  commandCount,
  eventCount,
  durationMs,
  timestamp
}
```

Assistance의 “best”는 숫자가 큰 것이 좋은 값이 아니다. `bestAssistanceByMission`은 가장 낮은 도움 수준으로 성공한 기록을 저장한다. 별과 도움 수준은 독립적으로 병합한다.

## 10. 코스와 기존 unit ID 분리

현재 `PYTHON_PROTOCOL_ENTRY_UNITS`는 4개 mission set을 `unit_py_math_10` 등의 단원 ID에 직접 연결한다. v2에서는 다음을 추가한다.

```js
LUMI_COURSE_CATALOG = {
  id: "lumi-season-1",
  version: 1,
  acts: [
    { id: "act-0-awakening", missionSetId: "lumi-awakening-v1" }
  ]
}
```

- Hub는 course catalog로 항로 지도를 렌더링한다.
- 기존 unit 기반 진입은 legacy adapter가 현재 mission set으로 연결한다.
- 기존 `completedMissionIds`와 bestStars를 삭제하지 않는다.
- 기존 완료자가 새 코스 도입으로 미완료 처리되지 않도록 grandfathering을 적용한다.
- legacy 4개 카드는 feature flag 뒤에서 새 항로 지도로 교체한다.

## 11. UI 컴포넌트 분리 권장안

현재 `PythonMissionLab.jsx`에 실행·저장·렌더링 책임이 집중되어 있다. Vertical Slice에서 다음 경계로 점진 분리한다.

```text
PythonMissionLab
├─ MissionStoryStrip
├─ MissionObjectivePanel
├─ ProgressiveToolShell
├─ PythonWorldCanvas
│  └─ WorldActionRenderer registry
├─ PythonEditor
├─ RunControls
├─ PlaybackTimeline
├─ MemoryCorePanel
├─ SensorOverlay
├─ HintSignalPanel
└─ MissionResultCard
```

Hooks/services:

```text
useMissionRuntime
useEventPlayback
useMissionProgress
useProgressiveTools
missionInputController
```

한 PR에서 전부 분리하는 것을 요구하지 않는다. 새 로직이 `PythonMissionLab.jsx`에 계속 누적되지 않게 경계를 정하는 것이 목적이다.

## 12. World renderer

Renderer는 event type별 action registry를 사용한다.

```js
const actionRenderers = {
  rover_woke: renderWake,
  rover_moved: renderMove,
  rover_turned: renderTurn,
  rover_spoke: renderSpeech,
  sensor_read: renderSensor,
  collision: renderCollision,
}
```

P0 시각 요구:

- 루미 최소 화면 크기 보장
- target과 interactive object의 라벨 가독성
- path별 이동 tween
- 현재 code line과 action 간 pulse/tether
- reduced motion에서는 tween 대신 상태 전환과 짧은 highlight
- 효과가 끝나지 않아도 skip/reset 가능
- playhead를 뒤로 옮기면 base world + 이전 events로 상태를 재구성

현재처럼 처음부터 모든 visible events를 누적 적용해 상태를 만드는 방식은 유지 가능하지만, event reducer를 순수 함수로 분리해 테스트한다.

## 13. 오류 피드백

오류 결과는 다음 계약을 따른다.

```js
{
  type: "SyntaxError",
  sourceLine: 1,
  sourceColumn: 12,
  feedbackCode: "MISSING_CLOSING_PAREN",
  title: "명령 신호가 닫히지 않았어요",
  explanation: "여는 괄호와 짝이 되는 닫는 괄호가 필요합니다.",
  nextAction: "줄 끝에 )를 추가해 보세요.",
  rawMessage: "..."
}
```

- 가능한 경우 Python error의 offset을 사용해 column marker를 표시한다.
- rawMessage는 펼쳐 보기로 제공하되 초급 기본 화면을 차지하지 않는다.
- friendly error가 원래 의미와 다른 단정적 원인을 말하지 않게 한다.
- 논리 실패는 syntax error처럼 표현하지 않고 world evidence를 먼저 보여준다.

## 14. 보안·성능

- 허용 builtins와 import allowlist 유지
- `eval`, `exec`, `compile`, `open`, 임의 `__import__` 차단
- DOM, network, Firebase credential 미노출
- max command, event, output, execution time 제한
- STOP은 현재처럼 worker terminate/recreate를 P0 기본으로 사용 가능
- Pyodide 버전 고정
- 일반 SpaceHome 진입 시 런타임 eager load 금지
- mission 진입/idle 시 preload하고 로드 상태·재시도 제공
- 평가·경제 보상의 서버 신뢰 경계를 분리

## 15. 호환과 배포

- 새 Course Hub와 Mission Lab v2는 feature flag 뒤에서 시작한다.
- legacy direct entry는 flag off에서 기존 화면을 유지한다.
- progress write는 v1 필드를 제거하지 않는 merge 방식으로 한다.
- mission version 상승 시 기존 완료·별을 보존하고 새 도전 가능 상태만 표시한다.
- major learning goal 변경은 새 mission ID 사용을 기본으로 한다.
- rollback 시 v2 필드가 남아 있어도 v1 코드가 읽을 수 있도록 additive schema를 사용한다.

