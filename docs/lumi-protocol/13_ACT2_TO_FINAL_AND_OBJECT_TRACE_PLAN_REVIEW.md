# ACT 2~8·FINAL 통합 관점의 Object Trace Gate 0→1 계획 평가

- 작성일: 2026-08-22
- 평가 대상: `LUMI Protocol Gate 0 → Gate 1 Object Trace 기술 Spike` 구현 계획
- 결론: **조건부 승인 — 아래 P0 설계 수정을 반영한 뒤 Gate 1 구현 가능**
- 범위: 코드 구현 없음, 계획·계약·검증 기준 리뷰

## 1. 총평

제안의 방향은 좋다.

- 전체 전술 시스템보다 class/instance/state trace 두 미션을 먼저 검증한다.
- 실제 Pyodide Python semantics를 사용한다.
- in-place mutation 누락을 함께 해결한다.
- 서버 실행과 Firestore write를 추가하지 않는다.
- `self`를 텍스트 설명이 아니라 instance별 상태 변화로 보여 준다.

그러나 현재안은 Object Trace를 독립 기능으로 보는 경향이 있다. LUMI 전체 과정에서는 다음이 하나의 연속된 실행 모델이어야 한다.

```text
ACT 2  변수 값 변화
ACT 5  반복 프레임과 반복 변수
ACT 7  list/dict 내부 변화
ACT 8  함수 호출·매개변수·지역 변수·return
ACT 9  method 호출·self·attribute 변화
```

따라서 Gate 1의 진짜 산출물은 “class 카드 UI”가 아니라 다음이어야 한다.

> ACT 2부터 Object Core까지 재사용하는 일반화된 Execution Trace 계약

이 계약을 먼저 바로잡으면 ACT 2~8 구현 비용과 재작업을 크게 줄일 수 있다.

## 2. 현재 계획에서 유지할 부분

1. Spike를 2개 미션으로 제한한다.
2. 전체 전술·보스·상속은 구현하지 않는다.
3. custom instance를 bounded JSON snapshot으로 변환한다.
4. private/callable/runtime 내부 값을 학생 UI에 노출하지 않는다.
5. list/dict/custom instance의 in-place mutation을 회귀 테스트한다.
6. 기존 6초 Worker timeout과 event cap을 유지한다.
7. 클라이언트 실행과 replay를 사용해 서버 비용을 늘리지 않는다.
8. ACT 0·1의 mission ID와 기존 학습 진행을 변경하지 않는다.

## 3. 구현 전 반드시 수정할 P0 사항

### P0-01. allowed builtins를 최소 권한으로 축소

현재 계획은 다음을 한 번에 연다.

```text
__build_class__, object, isinstance, hasattr, getattr, setattr, type, id
```

Gate 1에는 너무 넓다.

- `getattr`/`setattr`는 문자열로 dunder와 내부 attribute에 접근하는 우회 경로가 된다.
- raw `type`은 3개 인자로 동적 class를 만들 수 있어 ClassDef AST 정책을 우회할 수 있다.
- `id`는 교육 목표가 아니며 메모리 identity 값을 노출한다.
- `hasattr`, `isinstance`도 Gate 1 필수 개념이 아니다.

Gate 1 허용:

```text
__build_class__  # compiler 내부 필요, 학생의 직접 호출은 AST에서 금지
object
```

ACT 2의 `type(value)`는 raw builtin 대신 인자 1개만 받는 `safe_type` wrapper를 `type` 이름으로 제공한다. Object Frontier 전까지 `super`, dynamic attribute API, raw type constructor는 열지 않는다.

추가 AST 제한:

- 허용 dunder: `__init__`만
- 금지: class decorator, metaclass keyword, 다중 상속
- 금지: `__getattribute__`, `__setattr__`, `__del__`, `__class__`, `__mro__`, `__subclasses__` 등 내부 접근
- class 수, instance 수, public attribute 수와 snapshot depth 제한

### P0-02. 실행 상태와 월드 상태를 분리

계획은 `lumiWorldReducer`에 `classes`, `instances`, `activeSelfRef`를 넣는다. 이는 장기적으로 맞지 않는다.

- class와 local variable은 Python 실행 상태다.
- LUMI 위치, 장애물, 드론 복구 상태는 월드 상태다.
- active self는 playhead의 현재 frame 상태다.

권장 구조:

```text
LumiEvent v2
   ├─ ExecutionTraceReducer
   │    variables, frames, classes, instances, activeFrameId, activeSelfRef
   └─ LumiWorldReducer
        rover, sensors, objects/entities, inventory, tactical state
```

`PythonMissionLab`이 두 reducer 결과를 같은 playhead로 합성한다. 이렇게 해야 ACT 8 함수 frame과 ACT 9 method frame이 같은 UI 계약을 사용한다.

### P0-03. method/self 이벤트 생성 방식을 명시

deep local snapshot만으로는 다음 이벤트를 신뢰성 있게 만들 수 없다.

```text
method_entered
method_returned
activeSelfRef
```

`sys.settrace`의 `call`, `line`, `return`을 모두 처리해야 한다.

일반화된 이벤트를 권장한다.

```js
frame_entered: {
  frameId,
  callableKind: 'function' | 'method',
  functionName,
  parameters,
  receiverInstanceId: null | 'instance-2'
}

frame_exited: {
  frameId,
  returnValue
}
```

ACT 8은 function frame으로, ACT 9는 `receiverInstanceId`가 있는 method frame으로 같은 UI를 사용한다. `method_entered/returned`는 필요하면 normalizer가 파생할 수 있다.

### P0-04. 안정적인 객체 identity와 alias 규칙 추가

다음 코드는 instance 2개가 아니라 1개다.

```python
a = Drone()
b = a
```

따라서 변수 binding 수로 `instanceCount`를 세면 안 된다.

필수 계약:

- runtime 내부에서만 Python `id(obj)`를 사용해 run-local identity registry를 만든다.
- 학생에게 raw id/address를 노출하지 않는다.
- UI에는 `instance-1`, `instance-2` 같은 안정적인 run-local ID를 쓴다.
- 한 instance가 여러 변수명으로 참조될 수 있음을 bindings로 별도 표현한다.
- Reset 후 ID가 달라져도 semantic event tape 비교가 가능하도록 생성 순서 기반 ID를 사용한다.

### P0-05. AST 증거와 runtime 증거를 구분

다음은 AST만으로 확정할 수 없다.

- 실제 instance가 생성됐는가
- method가 실행됐는가
- 특정 self의 attribute가 변했는가

구분:

```text
AST evidence
class, __init__, self_attribute, method definition, inheritance syntax

Runtime evidence
distinct instance count, binding, frame call/return, receiver, attribute before/after
```

`User Class 호출 → instance`를 단순 AST concept으로 판정하지 않는다. factory, alias, 조건 분기 때문에 오탐·누락이 생긴다.

### P0-06. Spike 미션을 production catalog lookup에서 격리

현재 다른 AI가 reward canonical mapping, course policy, progress를 동시에 수정 중이다. Spike를 바로 `lumiCourseCatalog.js`의 일반 lookup에 넣으면 다음 위험이 생긴다.

- 보상 대상 미션으로 오인
- total mission count 변경
- ACT 진행 잠금에 혼입
- 일일 기록과 과제 피드백에 개발 미션 노출

Gate 1에서는 별도 개발 카탈로그를 사용한다.

```text
lumiObjectTraceSpikeCatalog.js
VITE_LUMI_OBJECT_SPIKE=true
개발 전용 route
reward/history/progress write 없음
```

학생 과정 카탈로그 편입은 Gate 2 학생 검증 후 별도 version에서 한다.

### P0-07. 실제 E2E와 계약 테스트를 구분

현재 프로젝트의 `test:python-mission`은 Node script이며 브라우저 Worker/Pyodide E2E 인프라는 확인되지 않는다. `node scripts/test-phase10-object-trace-spike.mjs`만으로 실제 Pyodide class 실행을 검증했다고 부르면 안 된다.

테스트를 구분한다.

1. Node contract test
   - normalizer
   - execution reducer
   - evaluator
   - snapshot fixture
2. Python runner test
   - 실제 허용/금지 AST와 class semantics
3. Browser Worker integration
   - 실제 Pyodide 로드
   - worker timeout/terminate
   - 실제 event tape
4. UI manual 또는 browser automation
   - Memory/Inspector/self highlight
   - Replay 결정론

브라우저 자동화 도구를 추가하지 않는다면 Phase 10을 “E2E”가 아니라 contract test로 정확히 명명하고 개발 harness 수동 검증을 필수화한다.

## 4. P1 개선 사항

### P1-01. exact class/variable 이름 판정 완화

`classDefined: 'Drone'`, `scout.integrity == 30` 같은 판정은 Spike scaffold에서는 쓸 수 있지만 일반 미션 기본 계약으로 삼지 않는다.

우선하는 goal:

```text
classCountAtLeast
classHasMethod
distinctInstanceCount
anyInstanceAttributeEquals
allInstancesHaveAttribute
onlyTargetInstanceAttributeChanged
runtimeMethodCalled
```

서사상 이름이 꼭 필요할 때만 exact name을 사용한다.

### P1-02. `instancesHaveDistinctState`를 구체화

아무 attribute 하나가 다르기만 해도 통과하면 학습 목표를 우회할 수 있다.

```js
{
  type: 'onlyTargetInstanceAttributeChanged',
  attribute: 'integrity',
  targetSelector: { publicAttribute: ['name', 'SCOUT-02'] },
  expectedDelta: 10,
  unchangedOthers: true
}
```

처럼 before/after와 비대상 유지까지 확인한다.

### P1-03. snapshot 비용 한도 추가

모든 line에서 모든 local의 전체 객체 그래프를 deep snapshot하면 ACT 5/6 반복과 ACT 7 큰 컨테이너에서 비용이 커진다.

초기 예산 예시:

- local 변수 최대 30개
- collection 항목 최대 20개
- instance public attribute 최대 20개
- depth 최대 4
- class 최대 10개
- distinct instance 최대 30개
- 단일 event payload와 전체 event tape 크기 상한
- 순환 참조는 `circular_ref` marker

대표 1,600 event worst-case benchmark를 추가한다. 전술 효과가 Python trace payload를 폭증시키지 않게 한다.

### P1-04. UI의 self 강조는 playhead에서 파생

실행 시점 DOM timer로 self를 강조하지 않는다. 현재 playhead가 가리키는 `activeFrameId`와 `receiverInstanceId`로 표시해야 Step/뒤로/Replay에서도 정확히 재현된다.

### P1-05. “baseline 100% 안정”을 검증 가능한 Gate로 변경

현재 ACT 1 구현 완료와 production 안정화는 같은 말이 아니다. 다른 AI의 변경이 진행 중이므로 다음을 기록한 뒤 시작한다.

- baseline commit hash
- 보상 flag 상태
- ACT 0/1 회귀 테스트 결과
- course isolation 결과
- 일일 기록 집계 결과
- dirty worktree 없음 또는 변경 소유권 목록

## 5. ACT 2~8·Object Core·FINAL 통합 학습선

### 전체 능력과 서사

```text
ACT 2 기억한다
  ↓
ACT 3 세계를 감지한다
  ↓
ACT 4 상황을 판단한다
  ↓
ACT 5 정해진 일을 자동화한다
  ↓
ACT 6 상태가 바뀔 때까지 지속한다
  ↓
ACT 7 여러 신호를 구조화하고 해독한다
  ↓
ACT 8 행동을 재사용 가능한 능력으로 만든다
  ↓
ACT 9 객체마다 독립된 상태와 행동을 설계한다
  ↓
FINAL 입력이 달라도 스스로 탐사·판단·복구한다
```

### ACT 2. MEMORY CORE

학습 통합:

- 변수는 이후 모든 sensor 값, loop counter, function parameter, instance attribute의 선수 개념이다.
- f-string은 단순 문자열 문제가 아니라 LUMI 상태 보고로 사용한다.
- `type()`은 safe one-argument wrapper를 사용한다.
- `input()`은 콘솔이 아니라 CONTROL INPUT 패널에서 값을 준비하고, Python `input()`이 문자열을 소비한다.

공통 실행 계약:

```text
variable_bound
value_changed
input_requested
input_received
type_observed
```

현재 runtime에는 학생용 `input()` 계약이 없으므로 ACT 2 구현 범위에 반드시 포함한다. 가장 단순한 구현은 RUN 전에 입력값을 UI에서 준비하고 mission payload의 input queue로 전달하는 방식이다.

FINAL 기여: 외부 명령, 에너지 임계값, 목표 값을 변수에 보관한다.

### ACT 3. SENSOR CORE

학습 통합:

- `lumi`는 행동 주체, `world`는 읽는 환경이라는 구분을 확립한다.
- 한 미션에서 새 sensor를 하나씩 공개한다.
- sensor 값은 Memory Core에 변수와 함께 표시한다.

공통 실행 계약:

```text
sensor_read(sensor, value, sourceLine)
```

현재 `steps_to_target`, `path_clear` 기반은 있다. 장애물 거리 등 새 API는 실제 미션이 필요할 때만 추가한다.

FINAL 기여: 고정 숫자가 아니라 바뀌는 월드 상태를 읽는다.

### ACT 4. DECISION CORE

학습 통합:

- Boolean을 읽는 것에서 실제 행동 선택으로 전환한다.
- 분기마다 월드 결과가 시각적으로 달라야 한다.
- hidden variant에서 True/False 상태를 모두 검증한다.

공통 실행 계약:

- line trace와 sensor trace를 이용해 선택된 branch를 보여 준다.
- 필요하면 `branch_evaluated`를 파생하되 evaluator는 최종 상태와 실제 call을 함께 본다.

FINAL 기여: 거리, shield, energy에 따른 행동 선택.

### ACT 5. AUTOMATION CORE

학습 통합:

- 수동 명령의 불편을 먼저 경험한 뒤 `for/range`를 공개한다.
- 반복 변수와 누적 변수를 Execution Trace에서 분리해 보여 준다.
- 중첩 반복은 반복 깊이를 시각화한다.

공통 실행 계약:

```text
loop_iteration_entered(loopId, index, depth)
```

raw line event만 1,600개 나열하지 말고 같은 source block의 반복을 UI에서 iteration 단위로 묶는다.

FINAL 기여: 여러 신호와 드론을 순회한다.

### ACT 6. PERSISTENCE CORE

학습 통합:

- while body에서 종료 조건이 실제로 여러 번 변해야 한다.
- `break`와 `continue`는 서로 다른 월드 효과를 가져야 한다.
- timeout은 실패 벌점이 아니라 반복 조건 진단으로 번역한다.

공통 실행 계약:

```text
while_condition_observed
loop_break
loop_continue
```

FINAL 기여: 신호가 남아 있는 동안 행동하고 안전 상태에서 멈춘다.

### ACT 7. DATA CORE

학습 통합:

- list는 여러 표본/드론, tuple은 좌표, dict는 상태표에 대응한다.
- `split()`과 `join()`은 손상 신호 패킷을 해독·조립한다.
- Object Trace의 deep snapshot은 이 Act에서 먼저 실제 가치가 생긴다.

공통 실행 계약:

```text
collection_created
collection_item_added/removed/changed
mapping_entry_changed
```

모든 변경을 별도 event로 만들 필요는 없다. bounded before/after snapshot에서 UI가 의미 있는 diff를 파생해도 된다.

서사 연결: 복구된 패킷에서 `NULL DRONE`, 인공 신호 폭풍, 로봇 공장 기록을 처음 발견한다.

FINAL 기여: 여러 entity와 구조화된 상태를 처리한다.

### ACT 8. ABILITY CORE

학습 통합:

- 함수 정의와 호출의 차이를 call frame으로 보여 준다.
- 매개변수 binding, local scope, return 이동을 시각화한다.
- `from metasense import lumi, world`는 이 Act에서 module 의미를 공개한다.

공통 실행 계약:

```text
frame_entered
parameter_bound
local_changed
frame_exited(returnValue)
```

이 frame 계약이 Gate 1 method/self trace의 직접적인 기반이다. ACT 8과 Object Trace가 서로 다른 call event를 만들면 안 된다.

서사 연결: LUMI가 반복 가능한 정화·구조 능력을 얻고 자신의 내부 모듈 기록을 발견한다.

FINAL 기여: 탐사 전략을 작은 함수로 분해하고 결과를 반환한다.

### ACT 9. OBJECT CORE

학습 통합:

- `lumi`가 기존부터 object였다는 사실을 공개한다.
- class → instance → `__init__` → self → attribute → method → list of instances 순서를 지킨다.
- inheritance/override/composition은 선택 Frontier로 둔다.

Gate 1 Spike는 이 Act의 production 콘텐츠가 아니라 기술·학습 계약 검증용이다.

FINAL 기여: 각 entity의 독립된 상태와 행동을 읽고 조정한다.

### FINAL. AUTONOMOUS LUMI / THE LOST LIGHT

Final은 새 문법을 가르치지 않는다.

통합 구조:

1. input/config로 임무 조건 수신
2. sensor로 월드 읽기
3. if/elif로 행동 선택
4. list/for로 여러 entity 처리
5. while로 변화하는 임무 지속
6. dict/tuple/split로 패킷과 좌표 처리
7. 함수로 전략 분해
8. 객체 attribute/method로 entity별 상태 대응

Object Core가 production에 들어오기 전 Final v1을 먼저 출시한다면 기존 자율항법 목표로 유지한다. Object Core 편입 뒤에는 기존 mission ID 내용을 덮어쓰지 말고 새 version/mission ID의 `THE LOST LIGHT` Final을 만든다.

## 6. 과정 전체의 스캐폴딩 증가

| 구간 | 학생 편집 자유도 | 일반 코드 길이 |
| --- | --- | ---: |
| ACT 2 | 값·변수 한 줄 변경, 입력값 전송 | 2~4줄 |
| ACT 3 | sensor 값을 변수에 연결 | 2~5줄 |
| ACT 4 | 조건식/한 branch 완성 | 3~7줄 |
| ACT 5 | 반복 header와 body 조립 | 4~9줄 |
| ACT 6 | 종료 조건과 break/continue 선택 | 5~10줄 |
| ACT 7 | 데이터 처리 블록 작성 | 5~12줄 |
| ACT 8 | 함수 body/parameter/return 작성 | 7~15줄 |
| ACT 9 | class의 일부와 method 작성 | 8~18줄 |
| FINAL | 여러 함수와 전략 조합 | 15~30줄 |

모바일/태블릿에서는 긴 class 전체를 매번 처음부터 입력시키지 않는다. 핵심 줄을 완성하고, 후반 Field Test에서만 더 넓은 자유 작성을 요구한다.

## 7. 수정된 구현 순서

### Gate A. 현재 baseline 고정

- ACT 0/1, reward flag, course isolation, daily record 검증
- commit hash와 파일 소유권 기록

### Gate B. Execution Trace 계약

- immutable bounded snapshot
- stable frame/instance IDs
- execution reducer와 world reducer 분리
- function/method 공통 frame schema

### Gate C. Object Trace 개발 Spike

- 별도 dev catalog와 route
- class/instance 1개 미션
- self/attribute mutation 1개 미션
- reward/history/progress 없음

### Gate D. ACT 2~7 구현

- 각 Act 첫 1~2개 vertical slice 후 전체 콘텐츠 확장
- input, sensor, branch, loop, container trace를 같은 Execution Trace에 추가

### Gate E. ACT 8 구현

- function call/return/scope frame 완성
- Gate C의 method frame을 동일 계약으로 재검증

### Gate F. Object Core production 편입

- 학생 관찰 테스트 통과
- 새 course/catalog version
- 7 Core + 1 Field Test

### Gate G. FINAL

- ACT 2~9 transfer 성공 데이터 확인 후 통합 Final 구현
- 새로운 문법 없이 종합 문제로만 구성

기술 Spike는 Gate C에서 먼저 할 수 있지만, 학생 progression에는 ACT 8 이후에만 편입한다.

## 8. 수정된 Phase 10 테스트 요구사항

### Sandbox

- `class Drone: pass` 성공
- `__init__` 성공
- 허용되지 않은 dunder 차단
- decorator/metaclass/다중 상속 차단
- raw `getattr/setattr/id/type(name,bases,dict)` 사용 불가
- instance/class/attribute cap 동작

### Identity

- `a = Drone(); b = a`는 distinct instance 1개
- `a = Drone(); b = Drone()`은 2개
- private attribute가 snapshot에 없음
- 순환 참조가 실행을 깨뜨리지 않음

### Mutation

- `self.integrity += 10` before/after 정확
- 다른 instance는 unchanged
- `list.append`, `dict` entry 수정 회귀 통과
- 같은 code 재실행의 semantic event tape 동일

### Frame

- function과 method의 frame ID가 구분됨
- method receiverInstanceId 정확
- return 후 active self가 해제됨
- Step/Replay에서 self 강조가 playhead와 일치

### Evaluator

- class 정의만 하고 instance를 만들지 않으면 실패
- method를 정의만 하고 호출하지 않으면 `methodCalled` 실패
- alias 변수로 같은 instance를 두 번 세지 않음
- 다른 class/variable 이름의 동등 풀이 통과

### 회귀

- ACT 0/1 전체
- primitive variable trace
- list/dict bounded mutation
- timeout/worker 재생성
- event normalizer/reducer determinism

## 9. 최종 승인 의견

계획은 다음 수정 후 승인할 수 있다.

1. builtins 최소 권한화
2. Execution Trace와 World State 분리
3. call/return frame 기반 self 추적
4. stable identity와 alias 처리
5. AST 증거와 runtime 증거 분리
6. Spike dev catalog 격리
7. Node contract test와 실제 Browser Worker 검증 구분
8. ACT 8 함수 frame과 같은 계약 사용

이 수정 없이 구현하면 Spike 화면은 작동해 보여도 ACT 2~8을 구현하면서 trace와 reducer를 다시 설계해야 할 가능성이 높다.

반대로 위 계약을 먼저 세우면 Object Trace Spike는 미래 기능의 옆가지가 아니다.

> 변수, 반복, 데이터, 함수, 객체를 하나의 “내 코드가 실행되는 모습”으로 연결하는 LUMI Protocol의 공통 학습 엔진이 된다.
