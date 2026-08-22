# LUMI Protocol Object Core·전술 시뮬레이션 통합 계획

- 작성일: 2026-08-22
- 문서 성격: 제품·학습·기술 통합 계획
- 구현 상태: 계획 단계 — 기존 작업과 분리된 feature flag 전제
- 핵심 목표: 클래스와 객체를 “설명하는 단원”이 아니라, 학생의 Python 코드가 로봇을 만들고 상태를 바꾸며 자율적으로 문제를 해결하는 경험으로 만든다.

## 1. 결론

클래스 학습과 코드 기반 드론 전술은 LUMI Protocol에 잘 맞는다. 특히 학생이 이미 사용해 온 다음 코드가 객체의 비밀을 공개하는 훌륭한 도입점이다.

```python
lumi.move(3)
lumi.turn(90)
```

후반부에 다음 사실을 공개한다.

> `lumi`는 처음부터 Python 객체였고, `move()`와 `turn()`은 LUMI가 가진 메서드였다.

다만 다음 두 범위 조정이 필요하다.

1. `class`, instance, `__init__`, `self`, attribute, method는 Season 1 Core에 넣는다.
2. inheritance, override, composition은 선택형 Object Frontier로 둔다. 첫 Python 과정의 필수 졸업 조건으로 한꺼번에 강제하지 않는다.

전술 장면은 실시간 슈팅이 아니라 반드시 다음 루프를 따른다.

```text
월드 관찰 → Python 전략 작성 → RUN → 결정론적 전술 재생 → Trace/Inspector → 수정 → 변형 맵 검증
```

학생의 반응 속도가 아니라 코드의 판단과 구조가 결과를 결정해야 한다.

## 2. 현재 상황 진단

### 2.1 제품 상태

- 제품 명세에는 ACT 0~8과 Final, 총 61개 후보 경험이 정의되어 있다.
- 실제 카탈로그에 플레이 가능한 새 콘텐츠는 현재 ACT 0 Vertical Slice와 ACT 1까지다.
- ACT 2~8과 Final은 아직 커리큘럼 지도 성격이 강하다.
- 현재 워크트리에서는 다른 AI가 보상, 일일 기록, 과제 격리, UI/음향을 동시에 수정 중이다.

따라서 Object Core 구현은 현재 변경에 직접 섞지 않는다. 먼저 현재 작업을 하나의 검증된 baseline으로 고정한 뒤 별도 feature flag와 작업 단위로 시작한다.

### 2.2 기술 상태

현재 강점:

- 실제 Pyodide Python을 Web Worker에서 실행한다.
- 6초 실행 제한과 Worker 종료 경계가 있다.
- 코드 줄, 변수, 월드 행동을 event tape로 만들고 결정론적으로 재생한다.
- evaluator가 월드 목표와 AST 개념 증거를 분리한다.
- Canvas, Memory Core, Timeline, Inspector로 확장할 UI 기반이 있다.

현재 부족한 계약:

- 학생 sandbox의 allowed builtins에 클래스 생성에 필요한 `__build_class__`, `object`, `super`가 없다.
- AST 분석기는 `ClassDef`, `__init__`, `self`, attribute assignment, inheritance, override를 개념 증거로 수집하지 않는다.
- 객체 내부 attribute가 변해도 trace가 이전 객체의 참조를 보관해 변경을 놓칠 수 있다. 이 문제는 list/dict mutation 추적에도 영향을 준다.
- event schema와 reducer에는 class/instance/method/attribute 및 전술 entity 상태가 없다.
- 월드 객체는 현재 신호 수집 중심이며 integrity, shield, faction, tactical state를 표현하지 않는다.
- evaluator에는 객체 생성 수, attribute 값, method 호출, 드론 복구 같은 goal이 없다.

즉, 그래픽보다 먼저 **Python 객체 상태를 안전하게 관찰하고 event tape로 바꾸는 기반**이 필요하다.

## 3. Season 1 개편안

현재:

```text
ACT 8 ABILITY CORE
FINAL AUTONOMOUS LUMI
```

개편:

```text
ACT 8 ABILITY CORE
ACT 9 OBJECT CORE
OBJECT FRONTIER (선택)
FINAL THE LOST LIGHT
```

미션 수:

- 기존 후보: 61
- Object Core: Core 7 + Field Test 1
- Object Frontier: 선택 3
- 전체: 필수 약 69, 선택 포함 약 72

정확한 미션 수보다 “하나의 새 핵심 사고 개념” 원칙과 학생 테스트 결과를 우선한다.

## 4. ACT 9 — OBJECT CORE

서사 제목: **로봇 공장과 LUMI의 비밀**

### 9-1. LUMI의 정체

- 새 개념: object
- 경험: 기존 `lumi` Inspector를 열어 class, public attributes, methods를 관찰한다.
- 학생 행동: 완성 코드를 RUN하고 `type(lumi)` 또는 Object Inspector 결과를 예측한다.
- 공개 문장: “지금까지 조종한 LUMI도 하나의 객체였습니다.”
- 편집량: 없음 또는 한 토큰

### 9-2. 홀로그램 설계도

- 새 개념: `class`
- 경험: `class Drone: pass`를 실행하면 `CLASS REGISTERED`와 설계도 카드가 생성된다.
- 중요한 구분: class는 아직 실제 드론이 아니라 설계도다.

### 9-3. 첫 번째 실체

- 새 개념: instance
- 경험: `scout = Drone()`을 실행하면 설계도에서 instance가 조립된다.
- 시각화: `Drone class → scout instance`
- transfer: 변수 이름이 달라도 instance 생성으로 인정한다.

### 9-4. 생성될 때 정하는 상태

- 새 개념: `__init__`과 초기 attribute
- 경험: 이름과 signal integrity가 다른 드론을 만든다.

```python
class Drone:
    def __init__(self, name, integrity):
        self.name = name
        self.integrity = integrity
```

- UI: 설계도의 입력 슬롯과 생성된 instance의 실제 값을 연결한다.

### 9-5. 바로 그 객체 자신

- 새 개념: `self`
- 경험: 세 instance 중 하나의 상태만 바뀌고 나머지는 유지된다.
- UI: 현재 method가 실행 중인 instance를 강조하고 `self → scout_2`처럼 표시한다.
- 이해 확인: “왜 다른 드론의 값은 변하지 않았나요?”

### 9-6. 객체가 할 수 있는 행동

- 새 개념: method
- 경험: `purify_signal()` 또는 `take_pulse()`가 해당 instance의 상태를 바꾼다.
- 구분:
  - attribute: 객체가 가진 상태
  - method: 객체가 수행할 수 있는 행동

### 9-7. 드론 편대

- 새 개념: 여러 instance를 list와 `for`로 다루기
- 목적: ACT 7 list와 ACT 5 for가 왜 필요한지 다시 살아나게 한다.

```python
drones = [drone1, drone2, drone3]

for drone in drones:
    drone.purify_signal(10)
```

### 9-F. Field Test — 중계소 복구

- 새 개념 없음: class, instance, attribute, method, list, for 통합
- 한 class로 여러 instance를 만들고 서로 다른 초기 상태를 준다.
- 코드를 실행하면 오염된 드론이 파괴되지 않고 정상 탐사 드론으로 복구된다.
- 최소 2개 transfer variant에서 드론 수와 초기 상태가 달라진다.

## 5. Object Frontier — 선택 심화

기본 Object Core가 안정된 후에만 연다.

### XF-1. 서로 다른 드론 종

- inheritance
- `ScoutDrone(Drone)`와 `GuardDrone(Drone)`이 공통 상태와 행동을 물려받는다.

### XF-2. 같은 명령, 다른 행동

- override
- 같은 `respond()` 호출이 class에 따라 다른 시각·상태 결과를 만든다.

### XF-3. 능력 모듈 조립

- composition
- 드론이 Blaster가 아니라 `PulseModule`, `ShieldModule`, `SensorModule`을 가진다.
- “객체 안에 다른 객체가 있다”를 장비 슬롯으로 시각화한다.

캡슐화, property, 다중 상속, 추상 클래스, metaclass, 복잡한 특수 메서드는 Season 1 범위가 아니다.

## 6. 전술 시스템의 제품 원칙

### 6.1 적이 아니라 복구 대상

명칭은 `NULL DRONE` 또는 `CORRUPTED EXPLORER`로 한다.

상태 흐름:

```text
DETECTED → TARGETED → DISABLED → PURIFIED → RESTORED
```

사람이나 생명체를 공격하지 않는다. 피, 폭발 사망, 실제 총기 묘사는 사용하지 않는다. 에너지 pulse, shield, signal corruption을 사용한다.

### 6.2 실시간 조작 금지

- WASD 이동, 마우스 조준, 연타 보너스 없음
- 학생 코드 실행 중 수동 개입 없음
- 동일 코드와 동일 초기 상태는 항상 동일 event tape를 만든다.
- 일시정지, Step, Replay, 속도 변경은 관찰 도구일 뿐 결과에 영향을 주지 않는다.

### 6.3 전투가 아니라 알고리즘 문제

좋은 보스는 HP가 큰 대상이 아니다.

- shield가 있을 때 pulse 종류 선택
- 가까운 드론과 먼 드론의 행동 분기
- 에너지 임계값에서 충전
- 생성된 작은 드론을 list/for로 처리
- phase 상태가 변할 때 while 종료 조건 갱신

최종 승패는 “알맞은 Python 전략을 작성했는가”로 결정한다.

## 7. FINAL — THE LOST LIGHT

Final은 클래스 문법 시험으로 만들지 않는다. 앞서 배운 객체를 읽고, 함수·조건·반복·데이터와 결합해 자율 전략을 만드는 종합 경험으로 둔다.

### F-01. 복구 우선순위

- 드론 instance의 `shield`, `distance`, `corruption` attribute를 읽어 우선순위를 정한다.

### F-02. 상태별 대응 함수

- `choose_action(drone)`이 적절한 행동을 return한다.

### F-03. 변화하는 편대

- list, for/while, 에너지 상태, 새 instance 등장에 대응한다.

### F-04. 최종 중계망 복구

- 힌트 없는 transfer Field Test
- RUN 뒤 LUMI가 스스로 탐색·판단·이동·pulse·충전·복구한다.
- 마지막에는 붉은 오염 신호가 청록색 탐사 신호로 돌아온다.

## 8. 기술 설계

### 8.1 Runtime sandbox

클래스 문법을 무조건 전부 열지 않는다.

필수:

- 안전하게 제한된 `__build_class__`, `object` 제공
- inheritance extension에서만 `super` 제공
- ClassDef AST 검증
- class decorator, metaclass, 다중 상속, 위험 dunder 차단
- Core에서 허용하는 dunder는 우선 `__init__`만
- 기존 6초 timeout, command/event/output cap 유지

Pyodide가 브라우저 Worker 안에서 실행된다는 이유로 AST 정책을 생략하지 않는다. 무한 연산, 과도한 객체 생성, 거대한 repr도 제한한다.

### 8.2 객체 snapshot 계약

학생 객체를 raw `repr()` 문자열로만 보내지 않는다.

```js
{
  kind: 'python_instance',
  className: 'Drone',
  variableName: 'scout',
  publicAttributes: {
    name: 'SCOUT-01',
    integrity: 30,
    shield: 0
  }
}
```

규칙:

- public attribute만 포함
- key 수, depth, 문자열 길이 제한
- callable, module, 내부 runtime 객체 제외
- 순환 참조 안전 처리
- 객체 주소가 포함된 기본 repr을 학생 UI에 노출하지 않음

현재 trace가 raw object reference를 이전 값으로 보관하면 in-place mutation을 놓친다. 이전 locals도 즉시 immutable JSON snapshot으로 저장해 list/dict/custom instance 변경을 정확히 비교한다.

### 8.3 이벤트 계약

코드 의미 이벤트:

```text
class_defined
instance_created
method_entered
method_returned
attribute_changed
```

월드 의미 이벤트:

```text
entity_targeted
pulse_emitted
shield_changed
entity_disabled
entity_restored
```

모든 이벤트는 기존 LumiEvent v2 envelope, seq, sourceLine, frameId, logicalTime을 사용한다. UI가 Python raw trace를 직접 해석하지 않게 한다.

### 8.4 World state

초기 버전은 물리 엔진을 만들지 않는다. 기존 격자와 결정론적 상태 전이를 확장한다.

```js
entity: {
  id,
  kind,
  className,
  faction,
  x,
  y,
  integrity,
  maxIntegrity,
  shield,
  speed,
  corruption,
  state
}
```

projectile 충돌 물리는 계산하지 않는다. `pulse_emitted`와 판정된 target/state transition을 시각 재생한다. 그래야 코드 결과와 애니메이션이 어긋나지 않는다.

### 8.5 AST 개념 증거

추가 concept evidence:

```text
class
instance
__init__
self_attribute
method
inheritance
override
composition
```

정확한 변수명이나 class명을 정답으로 요구하지 않는다. AST 구조와 최종 객체/월드 상태를 함께 판정한다.

### 8.6 evaluator goal

추가 후보:

```text
classDefined
instanceCount
instanceAttributeEquals
instancesHaveDistinctState
methodCalled
attributeChanged
allEntitiesRestored
minimumEnergy
noUnsafeTarget
```

`class Enemy`라는 문자열이 있는지만 검사하지 않는다. 주석 속 정답이나 실행되지 않은 method로 통과하지 못하게 실제 trace와 최종 상태를 확인한다.

### 8.7 UI

새 패널을 계속 추가하지 말고 기존 Inspector와 Memory Core를 확장한다.

- Blueprint 탭: class 이름, `__init__` 입력, methods
- Instances 탭: 변수명, class, public attributes
- `self` focus: 현재 method 대상 instance 강조
- Tactical Inspector: entity의 class/state/shield/corruption
- 월드: 최대 3개 기본 실루엣을 SVG/CSS 변형으로 재사용

필수 연출:

- `CLASS REGISTERED`
- `INSTANCE CREATED`
- 한 instance attribute만 변하는 비교
- target lock → pulse → restored

연출은 Replay를 설명하는 데 사용하고, 결과 판정보다 먼저 축하 화면을 띄우지 않는다.

## 9. 비용 효율성

### 하지 않는 것

- 실행마다 서버 Python 또는 LLM 호출
- 실시간 멀티플레이
- projectile 물리 서버 동기화
- 매 프레임 Firestore 저장
- 드론 종류마다 별도 대형 이미지·오디오 세트
- 전술 event 전체를 영구 history에 저장

### 사용하는 것

- 기존 Pyodide Worker와 event tape 재사용
- 클라이언트 결정론적 reducer/replay
- CSS/SVG 기반 3개 실루엣과 색·장비 조합
- 기존 WebAudio bus와 짧은 pulse/shield/restoration cue
- 실행 tape는 메모리와 제한된 최근 run buffer에만 유지
- 영구 저장은 미션 완료 요약, mastery, assistance, 핵심 concept만 저장
- Object Core route와 자산 lazy loading

서버 비용은 일반 LUMI 미션 완료와 같은 수준이어야 한다. 전술 효과가 많아져도 Firestore write 수는 늘지 않아야 한다.

## 10. 기존 학습기록·보상·과제 피드백 연결

- `history.type = lumi_protocol`, `clusterId = python` 계약을 그대로 쓴다.
- concepts에 `class`, `instance`, `self`, `method` 등을 기록한다.
- Python 과제 피드백에서는 “Object Core 9-5 완료, self로 instance별 상태를 구분함” 정도의 학습 근거로 사용할 수 있다.
- 비-Python 과제에는 기존 course sanitizer를 통해 절대 전달하지 않는다.
- 새 보상 금액이나 별도 전투 재화를 만들지 않는다.
- 현재 보상 remediation이 완료되기 전에는 Object Core reward flag를 켜지 않는다.
- 재실행, Replay, 애니메이션 감상으로 추가 광석을 주지 않는다.

## 11. 다른 AI와의 충돌 방지

### Baseline Gate

현재 변경 중인 다음 영역이 검증·커밋되기 전에는 Object Core 구현을 시작하지 않는다.

- LUMI reward policy/service
- course policy와 assignment feedback sanitizer
- 일일 학습 기록 집계
- PythonMissionLab 결과 lifecycle
- ACT 0/1 카탈로그와 Canvas 시각 변경

baseline을 고정할 때 관련 테스트와 commit hash를 handoff 문서에 기록한다.

### 초기 작업 분리

기술 spike는 가능하면 새 모듈로 분리한다.

- Object snapshot serializer
- class AST analyzer
- object/tactical fixture
- Object Core mission catalog 초안
- shared test fixtures

Worker, event normalizer, reducer, evaluator, Canvas 같은 공용 파일 변경은 baseline 이후 한 담당자가 순서대로 통합한다. 여러 AI가 같은 파일을 동시에 수정하지 않는다.

### 금지

- 현재 ACT 0/1 mission ID 의미 변경
- 진행 중 reward/course policy 코드를 Object Core 편의를 위해 수정
- dirty worktree에서 대규모 catalog 재작성
- Object Core와 전체 Final/보스 시스템을 한 PR에 구현

## 12. 단계별 구현 Gate

### Gate 0. 교육·이벤트 계약 승인

- 필수/선택 개념 범위 승인
- object snapshot/event/evaluator schema 승인
- 공격 대신 복구라는 서사·연령 정책 승인

### Gate 1. Object Trace 기술 spike

feature flag 아래 개발 전용 2개 미션만 만든다.

1. `class Drone: pass`와 instance 생성
2. 두 instance 중 하나의 attribute를 method로 변경

통과 기준:

- 실제 Python class 문법 실행
- class/instance/attribute 이벤트 정확
- `self` 대상 instance 시각 강조
- Reset/Replay 결정론 일치
- list/dict 기존 trace 회귀 없음
- 6초 timeout과 event cap 유지

### Gate 2. 학습 Vertical Slice

9-1~9-5를 구현하고 학생 5명 이상에게 관찰 테스트한다.

확인 질문:

- class와 instance를 자기 말로 구분하는가?
- `self`가 “모든 드론”이 아니라 “현재 그 객체”임을 설명하는가?
- MetaSense 밖의 간단한 `Pet`/`Book` class로 전이할 수 있는가?

통과하지 못하면 전술 시스템을 확장하지 않고 스캐폴딩부터 수정한다.

### Gate 3. 전술 Vertical Slice

- 한 종류의 드론 class
- 서로 다른 3개 instance
- list/for 전략
- target lock/pulse/restoration 연출
- 1개 공개 맵 + 2개 transfer variant

이 단계에서는 inheritance와 보스를 넣지 않는다.

### Gate 4. Object Core 완성

- 9-1~9-F
- 일일 기록, mastery/assistance, Python 과제 근거 연결
- 태블릿/키보드 접근성
- reduced motion/audio 설정

### Gate 5. Object Frontier 선택 심화

Gate 4 학습 데이터에서 기본 클래스 이해가 확인된 경우에만 inheritance/override/composition을 연다.

### Gate 6. Final 개편

기존 ACT 2~8 실제 콘텐츠가 완성되고 회귀 테스트를 통과한 뒤 Final을 `THE LOST LIGHT`로 확장한다. Object Core만 먼저 만든 상태에서 Season Final을 앞질러 구현하지 않는다.

## 13. 학습·재미 성공 지표

학습 지표:

- class/instance/self 구분 질문 정답률
- 공개 맵 성공 후 transfer 성공률
- 한 instance만 바뀌는 이유 설명
- LUMI API 없는 간단한 class 문제 전이
- Rescue 이전 독립 수정 비율

재미 지표:

- 자발적 Replay 비율
- 다음 Object Core 미션 진입률
- Field Test 재도전률
- 학생이 만든 instance 이름·상태 조합의 다양성

잘못된 지표:

- 코드 길이
- 타이핑 속도
- 최단 실행 시간
- 연타 횟수
- 힌트를 적게 쓴 학생만 높은 점수

## 14. 출시 승인 조건

다음을 모두 만족해야 한다.

- 학생 코드가 실제 Python class semantics를 사용한다.
- 객체 mutation이 Memory/Inspector/World에 같은 step으로 보인다.
- 같은 code + world가 같은 event tape와 결과를 만든다.
- exact 정답 문자열 없이 대체 풀이가 통과한다.
- transfer variant에서 고정값 답안을 걸러낸다.
- 비-Python 과제 피드백에 Object Core/LUMI가 노출되지 않는다.
- 전술 연출로 Firestore write나 AI 호출이 증가하지 않는다.
- 태블릿에서 필수 코드를 입력하고 모든 패널에 접근 가능하다.
- reduced motion에서도 target/state 변화가 텍스트와 모양으로 이해된다.
- 학생 관찰 테스트에서 class, instance, self의 의미가 MetaSense 밖 예제로 전이된다.

출시 기준은 드론이 멋있게 움직이는지가 아니다.

> 학생이 “내가 만든 객체들이 각자의 상태를 가지고, 내가 작성한 코드대로 스스로 행동했다”고 이해하고 설명할 수 있는지가 기준이다.
