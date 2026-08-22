# LUMI Protocol Gate 3~6 일괄 구현 개발 가이드

- 작성일: 2026-08-22
- 문서 성격: 다른 AI/개발자에게 전달하는 구현 작업 명세 및 승인 기준
- 기준선: Gate 1 기술 계약 완료, Gate 2 학습 Vertical Slice 코드 완료
- 구현 대상: Gate 3 전술 파일럿 → Gate 4 Object Core 정식 과정 → Gate 5 Object Frontier 선택 과정 → Gate 6 Final 개편
- 중요한 전제: **일괄 개발은 가능하지만 일괄 공개는 금지한다.**

---

## 0. 먼저 읽을 결론

이 작업은 네 기능을 한 화면에 한꺼번에 얹는 작업이 아니다. 공통 기반을 한 번 만들고, 네 개의 Gate를 서로 독립된 카탈로그·플래그·테스트·승인 조건으로 차례대로 구현하는 작업이다.

```text
Gate 2 학습 검증 승인
        ↓
Gate 3 전술 Vertical Slice 승인
        ↓
Gate 4 Object Core 정식 과정 승인 ───────────────┐
        ↓                                       │
Gate 5 Object Frontier 선택 과정                │
                                                ↓
ACT 2~8 정식 콘텐츠·전이 평가 완료 ───────→ Gate 6 Final 공개
```

고정 결정은 다음과 같다.

1. Gate 3과 Gate 5는 기본적으로 **개발용 무저장 파일럿**이다.
2. Gate 4와 Gate 6만 정식 진도·일일 학습기록·광석·Python 과제 피드백 근거가 된다.
3. Gate 5는 선택 심화 과정이며 Gate 6의 선수 조건이 아니다.
4. Gate 6는 코드가 완성되어도 ACT 2~8이 실제 정식 콘텐츠와 평가를 갖추기 전에는 열지 않는다.
5. 전술 표현은 적을 파괴하는 전투가 아니라 손상된 탐사체를 정화·복구하는 서사로 통일한다.
6. Python Worker는 범용 실행·Trace 엔진으로 유지한다. 전술 상태를 Worker 안에 하드코딩하지 않는다.
7. 프레임별 Firestore 저장, 서버 Python 실행, LLM 판정, 실시간 투사체 물리는 도입하지 않는다.
8. 기존 ACT 0~2, Gate 1~2, 보상 원장, 과정 격리 테스트를 깨뜨리면 어떤 Gate도 승인하지 않는다.

---

## 1. 구현 전 필독 문서와 우선순위

구현 담당 AI는 작업 전에 아래 문서를 읽는다.

1. `12_OBJECT_CORE_AND_TACTICAL_SIMULATION_PLAN.md`
2. `13_ACT2_TO_FINAL_AND_OBJECT_TRACE_PLAN_REVIEW.md`
3. `14_GATE2_OBJECT_LEARNING_VERTICAL_SLICE_GUIDE.md`
4. `10_DAILY_RECORD_REWARD_AND_ASSIGNMENT_FEEDBACK_SPEC.md`
5. `04_TECHNICAL_IMPLEMENTATION_SPEC.md`
6. `05_BACKLOG_ACCEPTANCE_AND_TEST_PLAN.md`
7. `07_REQUIREMENTS_TRACEABILITY.md`

충돌 시 이 문서는 Gate 3~6의 구현 순서·격리·비용 상한·승인 조건에 한해 우선한다. 제품 철학과 전체 커리큘럼은 01·02 문서의 원칙을 유지한다.

---

## 2. 현재 기준선과 구현 시작 조건

### 2.1 보존해야 할 Gate 2 기준선

- 고유하고 결정적인 Python instance ID
- class/instance 불변 JSON snapshot
- in-place mutation 감지
- `frame_entered`, `frame_returned`, attribute 변화와 receiver 연결
- BLUEPRINT / INSTANCES / SELF FOCUS 시각화
- 파일럿 전용 카탈로그와 fail-closed feature flag
- Firestore·localStorage·광석 원장 쓰기 0건
- 일반 Python 소재 전이 미션

Gate 3 구현을 위해 이 계약을 임의로 다시 설계하거나 Gate 2 파일럿 ID를 정식 ID로 재사용하지 않는다.

### 2.2 Gate 2의 남은 제품 승인 조건

Gate 3 코드는 병행 개발할 수 있지만 공개 승인은 다음 학생 관찰 결과 뒤에만 가능하다.

- 5명 중 4명 이상: class와 instance를 자기 말로 구분
- 5명 중 4명 이상: `self`를 현재 메서드 수신 객체로 설명
- 5명 중 3명 이상: 최대 1회 개념 힌트로 일반 Python 전이 문제 해결
- 실제 브라우저 Pyodide 환경에서 9-1~9-5와 전이 미션 수동 확인

이 결과는 브라우저 localStorage로 승인 여부를 결정하지 않는다. 소스 관리되는 readiness manifest에서 사람이 명시적으로 승인한다.

---

## 3. Gate별 범위와 공개 정책

| Gate | 제품 목적 | 핵심 범위 | 저장·보상 | 기본 공개 상태 | 승인 전제 |
| --- | --- | --- | --- | --- | --- |
| Gate 3 | 객체 개념이 실제 전략으로 연결되는지 검증 | 1개 전술 Vertical Slice + 공개 맵 1개 + 전이 variant 2개 | 모두 0건 | DEV 전용 | Gate 2 학생 검증 |
| Gate 4 | Object Core 정식 학습 단원 | 9-1~9-7 + 9-F, 총 8개 | 정식 기록·최초 완료 광석 | 잠김 | Gate 3 학습·기술 승인 |
| Gate 5 | 객체 심화의 필요성과 난이도 검증 | XF-1 상속, XF-2 override, XF-3 composition | 파일럿 0건 | DEV/선택 과정 | Gate 4 학습 데이터 |
| Gate 6 | 전 과정 통합 Final | F-01~F-04, 총 4개 | 정식 기록·최초 완료 광석 | 잠김 | Gate 4 + ACT 2~8 완료 |

Gate 4의 완료 수에는 Gate 5를 포함하지 않는다. Gate 6의 해금 조건에도 Gate 5를 넣지 않는다.

---

## 4. Feature Flag와 Release Readiness 설계

### 4.1 플래그는 기능 요청, readiness는 공개 자격이다

환경 변수 하나만 켰다고 미승인 과정이 열리면 안 된다. 다음 두 계층을 분리한다.

```js
requestedByEnvironment && prerequisiteApproved && catalogContractValid
```

권장 신규 파일:

- `src/config/lumiReleaseReadiness.js`

권장 계약:

```js
export const LUMI_RELEASE_READINESS = Object.freeze({
  gate2LearningApproved: false,
  gate3TacticalApproved: false,
  gate4ObjectCoreApproved: false,
  gate5FrontierApproved: false,
  act2To8ProductionReady: false,
  gate6FinalApproved: false,
})
```

권장 feature flag:

```js
LUMI_TACTICAL_PILOT_ENABLED
LUMI_OBJECT_CORE_CANDIDATE_ENABLED
LUMI_OBJECT_FRONTIER_ENABLED
LUMI_LOST_LIGHT_FINAL_ENABLED
```

규칙:

- 모든 플래그 기본값은 `false`다.
- Gate 3·5는 `DEV` 조건도 요구한다.
- production build에서 query string, localStorage, 학생 입력으로 readiness를 우회하지 못한다.
- 플래그가 꺼졌을 때 해당 route·카탈로그·UI chunk·저장 분기가 노출되지 않는다.
- readiness 변경은 별도 작은 커밋으로 남기며 어떤 검증 결과에 근거했는지 문서화한다.

### 4.2 의존성 규칙

| 기능 | 실행에 필요한 readiness |
| --- | --- |
| Gate 3 | `gate2LearningApproved` |
| Gate 4 | `gate3TacticalApproved` |
| Gate 5 | `gate4ObjectCoreApproved` |
| Gate 6 | `gate4ObjectCoreApproved && act2To8ProductionReady && gate6FinalApproved` |

Gate 5 readiness는 Gate 6 조건에 포함하지 않는다.

---

## 5. 공통 아키텍처: 실행 Trace와 전술 월드를 분리한다

### 5.1 처리 흐름

```text
학생 Python 코드
  → Pyodide Worker 실행
  → execution event tape + immutable snapshots
  → event normalizer
  → executionTraceReducer
  → tactical event projector (전술 미션에서만)
  → tactical reducer
  → 같은 playhead로 Inspector와 World UI 재생
  → playback 종료
  → evaluator 결과·대사·축하 공개
```

### 5.2 새로 분리할 순수 모듈

권장 파일:

- `lumiTacticalEventProjector.js`: 실행 이벤트를 의미 있는 전술 이벤트로 투영
- `lumiTacticalReducer.js`: 전술 entity 상태를 결정적으로 갱신
- `lumiTacticalSelectors.js`: 현재 대상·복구 수·상태 레이블 계산
- `tacticalGoalEvaluators.js`: 전술 목표만 평가
- `objectGoalEvaluators.js`: 객체 목표가 커지면 기존 evaluator에서 분리
- `LumiTacticalWorldLayer.jsx`: 전술 entity 렌더링
- `LumiTacticalInspector.jsx`: 대상·상태·메서드 수신 객체 표현

기존 `missionEvaluator.js`에는 모든 세부 구현을 계속 추가하지 말고 goal type → evaluator registry를 연결하는 얇은 dispatch만 둔다.

### 5.3 Worker가 책임지는 것과 책임지지 않는 것

Worker 책임:

- 안전한 Python 실행
- AST 개념 증거
- 함수·메서드 frame과 receiver
- 변수·객체 snapshot
- 결정적인 실행 이벤트
- 제한된 읽기 전용 `world` 입력 제공

Worker 비책임:

- 전술 entity의 색상과 애니메이션
- DETECTED/TARGETED/RESTORED 같은 제품 서사 상태
- 미션별 목표 대사
- 투사체 궤적과 충돌 물리
- 보상과 Firestore 저장

### 5.4 전술 event 계약

최소 의미 이벤트:

| event type | 발생 근거 | 필수 payload |
| --- | --- | --- |
| `entity_materialized` | Python instance snapshot 최초 관찰 | `entityId`, `instanceId`, `className`, `binding` |
| `entity_targeted` | 목표 메서드 frame 진입 | `entityId`, `receiverInstanceId`, `methodName` |
| `pulse_emitted` | 정화 메서드 실행 | `entityId`, `amount`, `sourceSeq` |
| `entity_attribute_changed` | 메서드 범위 안 attribute 변화 | `entityId`, `attribute`, `before`, `after` |
| `entity_restored` | 복구 임계값 충족 | `entityId`, `attribute`, `value` |

전술 이벤트에는 원본 실행 이벤트의 `sourceSeq`를 보존한다. 같은 `sourceSeq`에서 여러 이벤트가 생기면 고정 ordinal로 정렬한 뒤 다시 순번을 부여한다. `Date.now()`, `Math.random()`, animation callback 순서에 의존하지 않는다.

### 5.5 전술 상태 모델

```text
DETECTED → TARGETED → DISABLED → PURIFIED → RESTORED
```

모든 미션이 모든 중간 단계를 쓸 필요는 없다. 단, 상태 역행은 명시적 reset 이벤트가 없으면 허용하지 않는다.

권장 entity snapshot:

```js
{
  id: 'entity:instance-4',
  instanceId: 'instance-4',
  binding: 'nova',
  className: 'Drone',
  faction: 'corrupted-explorer',
  position: { x: 4, y: 2 },
  corruption: 20,
  maxCorruption: 20,
  shield: 0,
  integrity: 100,
  state: 'DETECTED'
}
```

### 5.6 읽기 전용 시나리오 입력

일회성 `drone_specs`, `enemy_specs`를 계속 추가하지 않는다. 범용적인 읽기 전용 입력 하나를 사용한다.

```js
world: {
  entitySpecs: [
    { name: 'NOVA-1', corruption: 10, x: 2, y: 1 },
    { name: 'NOVA-2', corruption: 20, x: 4, y: 2 },
  ]
}
```

Python에서는 복사된 제한 자료만 `world.entity_specs`로 읽게 한다. 학생 코드가 원본 미션 설정을 변형할 수 없어야 하며, callable·private field·순환 참조를 주입하지 않는다.

### 5.7 공통 미션 metadata

모든 신규 catalog는 다음 필드를 명시한다.

```js
{
  id,
  missionSetId,
  missionSetVersion,
  course: 'python',
  activityType: 'lumi-protocol',
  gate,
  coreOrOptional,
  persistencePolicy,
  rewardPolicy,
  assignmentEvidencePolicy,
  requiredConcepts,
  goals,
  transferVariants,
  runtimeLimits,
}
```

정책을 ID prefix로 추론하지 않는다. 특히 `lumiRewardPolicy.js`에 Gate별 삼항 연산자나 fallback을 계속 추가하지 말고 catalog metadata 기반 generic resolver를 사용한다.

---

## 6. Gate 3: Tactical Vertical Slice

### 6.1 목적

Gate 3는 그래픽 데모가 아니다. 학생이 `class`로 공통 구조를 만들고, 여러 instance를 list에 담고, `for`로 같은 method를 보내며 각 객체의 상태가 독립적으로 변한다는 것을 이해하는지 검증한다.

파일럿 참여자는 함수·매개변수뿐 아니라 list와 `for`의 기초를 이미 이수해야 한다. Gate 3는 이 문법을 처음 가르치는 단원이 아니라 객체와 기존 문법의 통합 가능성을 검증하는 기술·학습 파일럿이다.

### 6.2 범위

- 전용 catalog: `lumiObjectTacticalPilotCatalog.js`
- 미션 ID 예: `pilot-tactical-3-01`
- 공개 시나리오 1개
- 같은 학생 코드가 실행되는 hidden/transfer variant 2개
- 저장, 광석, 일일 기록, 과제 피드백: 모두 `none`

### 6.3 추천 학습 시나리오

상황: 관제망에서 손상된 탐사 드론 신호 여러 개를 발견했다. 학생은 `Drone` 설계도로 각 신호의 상태를 복원하고, list와 `for`를 사용해 각 드론에 `purify_signal()`을 보낸다.

핵심 학습 증거:

- 하나의 class 정의
- `__init__`에서 `name`, `corruption`을 `self`에 저장
- variant가 제공한 개수만큼 instance 생성
- instance들을 list에 보관
- `for`로 모든 instance 순회
- 각 instance를 receiver로 같은 method 호출
- method 안에서 자신의 `corruption`만 변경
- 모든 instance가 최종 복구 상태

예시 구조는 설명용이며 starterCode나 홀로그램에 완성 정답으로 노출하지 않는다.

```python
class Drone:
    def __init__(self, name, corruption):
        self.name = name
        self.corruption = corruption

    def purify_signal(self, amount):
        self.corruption = self.corruption - amount
```

공개 맵과 variant는 최소 다음 차이를 둔다.

| 시나리오 | entity 수 | corruption 값 | 목적 |
| --- | ---: | --- | --- |
| 공개 | 3 | 서로 다른 값 | 학습·시각 확인 |
| variant A | 2 | 다른 순서·값 | 3개 하드코딩 차단 |
| variant B | 4 | 경계값 포함 | list/for와 일반화 확인 |

### 6.4 projection 설정 예

```js
tacticalProjection: {
  entitySource: 'python_instances',
  requiredAttributes: ['name', 'corruption'],
  targetMethod: 'purify_signal',
  stateAttribute: 'corruption',
  restoredWhen: { lte: 0 },
  initialState: 'DETECTED',
}
```

클래스명·변수명은 학습 초반 guided mission에서만 요구할 수 있다. hidden variant와 평가기는 가능한 한 instance identity, receiver, state transition, 결과 상태를 판정한다.

### 6.5 Gate 3 평가 항목

필수 goal type:

- `classDefined`
- `initAssignsAttributes`
- `distinctInstanceCountEquals`
- `instancesCollectedInSequence`
- `forIteratesInstances`
- `methodCalledOnEveryInstance`
- `attributeChangedInsideReceiverMethod`
- `allInstancesAttributeSatisfy`
- `allEntitiesRestored`
- `transferVariantsPassed`

`methodCalledOnEveryInstance`는 단순 호출 횟수가 아니라 서로 다른 receiver instance ID 집합과 기대 instance 집합이 일치해야 한다.

### 6.6 반드시 실패해야 하는 풀이

- class만 정의하고 instance를 만들지 않은 코드
- instance 수가 variant와 다른 코드
- `drone_1`, `drone_2`, `drone_3`만 직접 호출한 하드코딩 코드
- method를 정의했지만 호출하지 않은 코드
- method 밖에서 모든 `corruption`을 0으로 직접 대입한 코드
- 한 instance의 상태만 바꾸고 모든 entity를 복구한 것처럼 보이게 한 코드
- 주석이나 문자열에 `class`, `for`, `self`를 적은 코드
- 공개 맵만 통과하고 variant를 실패한 코드

### 6.7 Gate 3 UI

- instance 카드와 월드 entity가 같은 stable ID로 연결되어야 한다.
- playhead가 method receiver에 진입한 순간 해당 카드와 entity가 동시에 강조된다.
- `pulse_emitted`는 1회성 CSS/SVG 효과로 표현한다.
- `entity_restored` 뒤에만 색상·상태가 RESTORED로 바뀐다.
- 최종 성공 카드와 성공음은 playback 종료 뒤에만 공개한다.
- `prefers-reduced-motion`에서는 펄스 이동 대신 대상 테두리·상태 텍스트로 표현한다.
- 소리 없이도 상태 변화가 모두 이해되어야 한다.

### 6.8 Gate 3 승인 조건

기술 승인:

- 동일 입력의 event tape와 최종 tactical state hash가 반복 실행에서 같다.
- 1개 공개 맵과 2개 variant가 모두 통과한다.
- 오답·하드코딩 fixture가 모두 실패한다.
- Firestore/localStorage/보상 write spy가 0건이다.
- Gate 2와 ACT 0~2 회귀 테스트가 통과한다.

학습 승인:

- 학생이 class를 여러 실체를 만드는 공통 설계로 설명한다.
- 학생이 list/for를 entity 수 변화에 대응하는 일반화로 사용한다.
- 학생이 특정 receiver의 상태만 바뀌는 이유를 `self`로 설명한다.

Gate 3가 시각적으로 멋져도 위 학습 증거가 없으면 승인하지 않는다.

---

## 7. Gate 4: Object Core 정식 과정

### 7.1 목적과 정식 ID

Gate 2·3 파일럿에서 검증된 학습 순서를 8개 정식 미션으로 완성한다.

권장:

- catalog: `lumiObjectCoreCatalog.js`
- `missionSetId: 'lumi-object-core-v1'`
- ID: `lumi-object-9-01` ~ `lumi-object-9-07`, `lumi-object-9-f`

파일럿 ID를 정식 ID로 바꾸거나 파일럿 완료를 자동 완료 처리하지 않는다. 파일럿은 실험 데이터이고 정식 과정은 보상·진도 계약을 가진 별도 콘텐츠다.

### 7.2 미션 구성

| ID | 제목 | 새 핵심 개념 | 학생이 하는 일 | 스캐폴딩 수준 |
| --- | --- | --- | --- | --- |
| 9-01 | LUMI의 정체 | 객체 = 상태 + 행동 | `type(lumi)`와 시스템 객체 관찰 | 실행·관찰 |
| 9-02 | 홀로그램 설계도 | class | 빈 class 구조 완성 | 토큰/구조 |
| 9-03 | 첫 번째 실체 | instance | class를 호출해 두 실체 생성 | 한 줄 완성 |
| 9-04 | 생성 신호 | `__init__`, attribute | 서로 다른 초기 상태 저장 | 핵심 줄 완성 |
| 9-05 | 현재 수신자 | self | 한 receiver만 변하는 호출 확인 | 수정·예측 |
| 9-06 | 능력 회로 | method, parameter, return | 상태를 바꾸는 method body 작성 | 여러 줄 작성 |
| 9-07 | 복구 편대 | list + for + instance | entity 수와 무관하게 편대 순회 | 조합 문제 |
| 9-F | 잃어버린 편대 | 종합 전이 | 설명을 줄이고 전체 복구 | 자유 해결 + variants |

한 미션에 새 개념을 여러 개 동시에 던지지 않는다. 9-07의 list/for는 ACT 7 및 ACT 5에서 이미 학습했다는 선수 조건을 확인하고, Object Core에서는 그 개념을 새로 가르치기보다 객체에 적용한다.

### 7.3 파일럿 콘텐츠 재사용 방식

문구·미션 설정 중복을 복사해 두 catalog가 서서히 달라지게 하지 않는다. 순수 content factory 또는 authored fragment를 공유할 수 있다.

단, 다음은 공유하지 않는다.

- mission ID
- persistence/reward policy
- completion namespace
- 파일럿과 정식 해금 조건

### 7.4 평가와 3성 Mastered

별은 다음처럼 행동 증거로 분리한다.

- 1성: 공개 시나리오 목표 상태 달성
- 2성: 필수 개념·구조 증거 충족
- 3성: hidden/transfer variant 모두 통과

힌트 사용은 별이나 광석을 깎지 않는다. Assistance Level만 별도로 남긴다.

필수 evaluator 원칙:

- 최종 attribute 값만 보지 않고 receiver·method frame·상태 변화 범위를 본다.
- exact instance count가 필요한 미션은 `atLeast`로 느슨하게 판정하지 않는다.
- return 미션은 정의 여부와 실제 호출·반환값 사용을 구분한다.
- 변수명은 학습 목표가 이름 짓기인 경우에만 강제한다.
- 정답 소스 문자열 일치를 사용하지 않는다.

### 7.5 정식 저장·일일 기록·광석

Gate 4부터 `10_DAILY_RECORD_REWARD_AND_ASSIGNMENT_FEEDBACK_SPEC.md`를 적용한다.

필수 정책:

- `course: 'python'`
- `activityType: 'lumi-protocol'`
- 미션별 최초 검증 완료에만 멱등 광석 지급
- 재실행·variant 재생·힌트 열람에는 광석 0
- 실행 event tape, 객체 전체 snapshot, 애니메이션 frame은 Firestore에 저장하지 않음
- 일일 기록에는 요약만 저장: mission ID, title, concept IDs, stars, assistance, completedAt
- Python 과제 피드백에는 관련 개념 요약만 제공
- 비-Python 과제 컨텍스트에서는 LUMI와 Code Trace 근거를 조회·언급하지 않음

### 7.6 보상 resolver의 필수 리팩터링

신규 ID prefix마다 보상 분기를 추가하면 Gate 6에서 다시 깨진다. `lumiRewardPolicy.js`는 catalog metadata를 기준으로 다음을 해석해야 한다.

```js
{
  rewardEligible: true,
  rewardTier: 'core', // 또는 'field'
  canonicalMissionId: 'lumi-object-9-01',
  course: 'python',
  activityType: 'lumi-protocol'
}
```

알 수 없는 catalog/mission은 fail-closed로 광석 0을 반환한다. 알 수 없는 ID를 Vertical Slice 보상으로 fallback하지 않는다.

### 7.7 Gate 4 접근성·기기 대응

- 1100px와 720px 이하에서 전체 패널 접근 가능
- 태블릿 터치 target 최소 44px
- 키보드만으로 RUN, reset, playhead, tab 이동 가능
- 색상만으로 instance/상태를 구분하지 않음
- screen reader용 상태 텍스트 제공
- reduced motion과 mute에서도 같은 학습 정보 제공

### 7.8 Gate 4 승인 조건

- 8개 미션 공개/variant 계약 테스트 통과
- 9-F 일반화 풀이만 3성 획득
- 첫 완료 보상 1회, 재실행 0회, 병렬 중복 호출에도 1회
- 일일 기록 중복 없이 1개 요약 반영
- Python 과제에는 반영되고 초등수학 등 비-Python 과제에는 완전히 격리
- 파일럿 completion과 정식 completion이 섞이지 않음
- 모바일·태블릿·키보드·reduced motion 수동 QA 통과
- ACT 0~8 전체 회귀 통과

---

## 8. Gate 5: Object Frontier 선택 심화

### 8.1 공개 판단

Gate 5는 전체 학생에게 필요한 필수 과정으로 가정하지 않는다. 다음 근거가 모일 때만 파일럿을 연다.

- 최소 10명이 9-F까지 완료
- 80% 이상이 class와 instance를 구분
- 70% 이상이 최대 1회 힌트로 self 전이 문제 해결
- 교사 관찰에서 상속을 배우기 전 공통 구조 중복 문제를 실제로 인식

표본이 작으면 결과를 절대적인 제품 결론으로 확대하지 않고 추가 파일럿으로 판단한다.

### 8.2 미션 구성

| ID | 핵심 | 학습 문제 |
| --- | --- | --- |
| XF-01 | 단일 상속 | 공통 상태·행동을 부모 설계도에서 이어받기 |
| XF-02 | override | 같은 method 호출이 subclass마다 다른 행동을 만드는 이유 |
| XF-03 | composition | 드론이 ShieldModule 같은 별도 객체를 부품으로 가지기 |

Gate 5는 정식 완료 수, Final 해금, 기본 광석 총량에 포함하지 않는다. 초기에는 저장·보상 0건인 파일럿으로 운영한다.

### 8.3 Sandbox 확장 제한

허용:

- 사용자 정의 안전 class 하나를 base로 하는 단일 상속
- subclass method override
- 사용자 정의 object를 public attribute에 담는 composition
- 안전한 zero-argument `super()` 호출

금지:

- 다중 상속
- 내장 type 상속
- metaclass
- class/function decorator
- `__bases__`, `__mro__`, `__subclasses__` 등 introspection
- 동적 class 생성·monkey patch
- 임의 import

`super()`를 허용할 때는 raw built-in을 무조건 노출하지 않는다. AST에서 zero-argument 호출, user-defined safe base, method 내부라는 조건을 검증하고 sandbox 회귀 테스트를 추가한다.

### 8.4 추가 AST·평가 증거

- `singleInheritanceDefined`
- `inheritedMethodCalled`
- `methodOverridden`
- `overrideBehaviorDiffers`
- `composedInstanceAttribute`
- `composedMethodDelegated`

상속은 class 이름 문자열만으로 판정하지 않고 실제 안전 base 관계를 snapshot에 직렬화한다. composition은 단순 dict가 아니라 custom instance attribute가 다른 custom instance ID를 참조하는지를 본다.

### 8.5 Gate 5 승인 조건

- 금지 문법·dunder 우회 fixture 전부 차단
- 상속·override·composition snapshot이 순환 참조 없이 결정적
- 기존 Gate 1~4 object trace 회귀 없음
- 학생이 상속과 composition을 “재사용” 한 단어가 아니라 `is-a`/`has-a` 관계로 구분
- 기능을 껐을 때 production bundle 진입 경로와 Hub에 노출 없음

---

## 9. Gate 6: Final `THE LOST LIGHT`

### 9.1 절대 선수 조건

Gate 6는 Object Core만 끝났다고 열지 않는다. 다음 readiness matrix가 모두 참이어야 한다.

| 선수 단원 | 필요한 실제 증거 |
| --- | --- |
| ACT 2 Memory | 변수·자료형·f-string·관제 input·형 변환 정식 미션과 transfer |
| ACT 3 Sensor | 센서·거리·비교·Boolean 정식 미션과 transfer |
| ACT 4 Decision | if/elif/else·and/or 정식 미션과 transfer |
| ACT 5 Automation | for·range·누적·중첩 반복 정식 미션과 transfer |
| ACT 6 Persistence | while·상태 변화·break·continue 정식 미션과 transfer |
| ACT 7 Data | list·tuple·dict·split/join 정식 미션과 transfer |
| ACT 8 Ability | def·parameter·return·모듈화 정식 미션과 transfer |
| ACT 9 Object Core | 9-1~9-F 정식 미션과 transfer |

“설계 완료”나 catalog placeholder는 readiness로 보지 않는다. 브라우저에서 학생이 수행할 수 있고 평가·진도·회귀 테스트가 있는 상태만 완료다.

### 9.2 Final의 학습 원칙

- 새로운 Python 문법을 가르치지 않는다.
- 학생은 이미 배운 센서·판단·반복·데이터·함수·객체를 조합한다.
- exact source나 특정 변수명보다 행동과 상태를 평가한다.
- 실시간 반사 신경이 아니라 코드 작성 → 결정적 시뮬레이션 → replay로 진행한다.
- Gate 5 상속·override는 요구하지 않는다.

### 9.3 미션 구성

| ID | 제목/목표 | 통합 개념 | 핵심 평가 |
| --- | --- | --- | --- |
| F-01 | 구조 신호 우선순위 | list/dict, attribute, 비교, 조건 | shield·distance·corruption에 따라 올바른 대상 선택 |
| F-02 | `choose_action` 항법 회로 | function, parameter, return, if/elif | 입력 상태에 따라 올바른 action 반환·사용 |
| F-03 | 변화하는 편대 | list, for, while, state update | scripted wave 변화에 대응하고 종료 조건 충족 |
| F-04 | THE LOST LIGHT | 센서·판단·반복·데이터·함수·객체 종합 | 모든 relay 복구, 안전 규칙 준수, variants 통과 |

F-01에서 아직 가르치지 않은 정렬 API를 갑자기 요구하지 않는다. 기존 반복·비교로 우선순위를 찾을 수 있게 한다. F-03의 변화는 mission config에 있는 결정적 scripted wave이며 네트워크·시간·난수에 의존하지 않는다.

### 9.4 Final scenario 계약

권장 catalog:

- `lumiLostLightFinalCatalog.js`
- `missionSetId: 'lumi-lost-light-final-v1'`
- 기존 Final ID를 덮어쓰지 않는 versioned stable ID

권장 scenario config:

```js
scenario: {
  seed: 'lost-light-f04-v1',
  entities: [...],
  scriptedWaves: [...],
  safetyRules: [...],
  completion: { allRelaysRestored: true },
}
```

seed는 난수 플레이를 허용하라는 뜻이 아니라 fixture와 결과 hash를 식별하는 안정 ID다.

### 9.5 Final 평가

- `priorityTargetSelected`
- `functionDefinedAndCalled`
- `returnValueUsed`
- `stateLoopTerminates`
- `safetyRulesPreserved`
- `allRequiredEntitiesRestored`
- `transferVariantsPassed`

variant는 entity 수, 초기 속성, 순서, scripted wave 구성을 바꾼다. 공개 시나리오의 이름·좌표·리스트 길이를 하드코딩한 풀이는 3성을 얻지 못해야 한다.

### 9.6 Final 보상·기록

Gate 4와 같은 정식 정책을 사용한다.

- 최초 완료만 광석
- core/field tier는 catalog metadata로 결정
- F-04 완료 축하 때문에 별도 고액 화폐나 중복 광석을 만들지 않음
- daily record에는 개념·별·도움 수준·완료 요약만 저장
- Python 과제 피드백에서만 종합 역량 근거로 사용
- 비-Python 과제에서는 조회·언급 금지

### 9.7 Gate 6 승인 조건

- readiness matrix의 모든 ACT가 실제로 완료
- 4개 미션과 각 variant 통과
- 공개 시나리오 하드코딩 풀이 실패
- replay hash 결정성 통과
- event/runtime 한도 초과 시 안전 종료와 친절한 오류 제공
- 정식 보상·일일 기록·과제 격리 테스트 통과
- 저사양 태블릿에서 허용 성능 범위 통과
- Gate 5 flag가 꺼져도 Gate 6 전체 수행 가능

---

## 10. 파일 변경 가이드

### 10.1 신규 파일 권장

```text
src/config/lumiReleaseReadiness.js

src/components/PythonWorld/lumiObjectTacticalPilotCatalog.js
src/components/PythonWorld/lumiObjectCoreCatalog.js
src/components/PythonWorld/lumiObjectFrontierCatalog.js
src/components/PythonWorld/lumiLostLightFinalCatalog.js

src/components/PythonWorld/lumiTacticalEventProjector.js
src/components/PythonWorld/lumiTacticalReducer.js
src/components/PythonWorld/lumiTacticalSelectors.js
src/components/PythonWorld/objectGoalEvaluators.js
src/components/PythonWorld/tacticalGoalEvaluators.js

src/components/PythonWorld/LumiTacticalWorldLayer.jsx
src/components/PythonWorld/LumiTacticalInspector.jsx
src/components/PythonWorld/LumiTacticalWorldLayer.css

scripts/test-gate3-tactical-contract.mjs
scripts/test-gate4-object-core-contract.mjs
scripts/test-gate5-object-frontier-contract.mjs
scripts/test-gate6-lost-light-contract.mjs
scripts/test-gate3-6-release-isolation.mjs
```

### 10.2 기존 파일 수정 최소화

| 파일 | 허용되는 변경 |
| --- | --- |
| `lumiFeatureFlags.js` | fail-closed 플래그와 readiness 조합 |
| `lumiCourseCatalog.js` | 정식 catalog registry 연결. 파일럿은 별도 lookup 유지 |
| `pythonWorld.worker.js` | bounded `entity_specs`, Gate 5 안전 단일 상속에 필요한 최소 확장 |
| `lumiEventNormalizer.js` | 표준 이벤트 normalization; 전술 의미 하드코딩 금지 |
| `missionEvaluator.js` | evaluator registry dispatch |
| `PythonMissionLab.jsx` | mission capability에 따른 lazy adapter 연결 |
| `PythonWorldCanvas.jsx` | 전술 layer slot 제공; 거대 조건 분기 금지 |
| `PythonProtocolHub.jsx` | 승인된 정식 과정만 진행도에 포함 |
| `lumiRewardPolicy.js` | metadata 기반 generic resolver |
| 기록·피드백 서비스 | Gate 4·6의 Python 전용 요약만 연결 |

한 AI가 shared hot file을 순차적으로 소유한다. 같은 시점에 여러 작업자가 `PythonMissionLab.jsx`, Worker, catalog registry를 각각 다른 방향으로 편집하게 하지 않는다.

---

## 11. 성능·비용 상한

### 11.1 서버·Firestore

Gate 3·5:

- Python 서버 실행 0회
- Firestore write 0회
- 광석 ledger write 0회
- localStorage 진도 write 0회

Gate 4·6:

- 초안은 localStorage 우선
- 실행 event마다 저장 금지
- replay playhead 변경마다 저장 금지
- 객체 snapshot 전체 저장 금지
- 첫 완료 시 기존 멱등 transaction과 최소 요약 checkpoint만 사용
- 실패 시도 원격 telemetry를 새로 추가하지 않음
- 꼭 필요한 최근 시도 저장은 기존 bounded slot 정책 안에서만 수행

목표는 Gate 4·6이 기존 정식 LUMI 미션 1회 완료보다 더 많은 종류의 원격 write 경로를 만들지 않는 것이다.

### 11.2 런타임

기존 안전 상한을 넘기지 않는다.

- 실행 시간: 최대 6초
- command: 최대 200
- trace event: 미션 기본 최대 1600
- output: 최대 5000자
- custom instance: 기존 전역 상한 50 이하

전술 미션은 더 낮은 콘텐츠 상한을 권장한다.

- 화면 entity: 최대 8
- 학습용 instance: 최대 12
- public attribute: 객체당 최대 20
- snapshot depth: 최대 4
- 동시에 움직이는 pulse: 최대 8

이 한도는 catalog validation과 runtime 양쪽에서 확인한다.

### 11.3 번들·그래픽·음향

- tactical/frontier/final UI는 mission capability에 따라 lazy load
- 신규 대형 게임 엔진·물리 엔진·차트 라이브러리 금지
- CSS/SVG silhouette 2~3종을 색·상태로 재사용
- entity별 개별 음원 파일 금지; 기존 WebAudio cue 재사용
- particle 수는 상한을 두고 reduced motion에서는 0
- 저사양 기기에서 장식보다 Trace·코드·상태 텍스트를 우선

### 11.4 테스트 비용

현재 프로젝트에 없는 무거운 E2E 도구를 이 파일럿만 위해 바로 추가하지 않는다.

- 순수 reducer/evaluator/catalog는 Node fixture 테스트
- Python 의미는 기존 CPython/Pyodide 계약 테스트
- 실제 Worker와 화면은 필수 브라우저 수동 QA
- 프로젝트 전체에서 브라우저 CI를 채택할 때만 동일 인프라에 편입

---

## 12. 테스트 계획

### 12.1 공통 자동 테스트

```bash
node scripts/test-gate1-object-trace-contract.mjs
node scripts/test-gate2-object-learning-contract.mjs
node scripts/test-gate3-tactical-contract.mjs
node scripts/test-gate4-object-core-contract.mjs
node scripts/test-gate5-object-frontier-contract.mjs
node scripts/test-gate6-lost-light-contract.mjs
node scripts/test-gate3-6-release-isolation.mjs
node scripts/test-phase8-lumi-rewards-ledger.mjs
node scripts/test-phase9-course-isolation-matrix.mjs
npm run test:python-mission
npm run build
```

존재하는 프로젝트 스크립트 이름이 다르면 동일 계약을 기존 suite에 편입하되, 완료 보고서에 실제 명령을 적는다.

### 12.2 결정성 테스트

각 대표 미션을 같은 코드·설정으로 3회 실행한다.

검사 대상:

- normalized execution tape hash
- tactical tape hash
- final execution state hash
- evaluator result
- 별 결과

네 값 중 하나라도 다르면 실패다.

### 12.3 격리 matrix

| 조건 | 기대 결과 |
| --- | --- |
| 모든 신규 flag off | 기존 route·Hub·bundle 동작과 동일 |
| Gate 3 flag on, readiness false | 접근 불가, 저장 0 |
| Gate 3 ready | 전술 파일럿만 접근, 정식 진도 변화 0 |
| Gate 4 flag on, Gate 3 미승인 | 접근 불가 |
| Gate 4 승인 | 정식 Object Core만 진도·보상 가능 |
| Gate 5 flag off | Gate 4 완료 수와 Gate 6 조건 영향 0 |
| Gate 6 flag on, ACT 준비 false | 접근 불가 |
| 비-Python 과제 | LUMI·Code Trace 근거 0건, 문구 언급 0회 |

### 12.4 필수 수동 QA

- 실제 브라우저 Pyodide에서 각 Gate 대표 미션 실행
- playhead 전후 이동 시 instance/self/entity가 같은 시점 표시
- autoplay 마지막 step 뒤 결과 공개
- reset 뒤 이전 entity·receiver 잔상 없음
- 1100px, 720px, 태블릿 touch 확인
- 키보드만으로 수행
- mute/reduced motion 수행
- 긴 class/instance 이름, 한글 문자열, 실행 오류 상태 확인
- flag off production-like build에서 route 직접 접근 차단

---

## 13. 구현 순서와 권장 커밋 단위

일괄 작업을 다음 순서로 나눈다. 각 단계에서 테스트를 통과한 뒤 다음 단계로 이동한다.

### Step 0. 기준선 고정

- 현재 변경 파일과 테스트 결과 기록
- Gate 1·2 및 ACT 0~2 회귀 결과 확보
- 기존 사용자 변경을 되돌리거나 일괄 포맷하지 않음

### Step 1. Release contract

- readiness manifest
- feature flags
- catalog capability schema
- flag/readiness isolation 테스트

아직 Hub와 학생 route에는 아무것도 공개하지 않는다.

### Step 2. Gate 3 순수 엔진

- tactical projector/reducer/selectors
- evaluator fixture
- 결정성·오답 테스트

React UI보다 순수 계약을 먼저 완성한다.

### Step 3. Gate 3 파일럿 UI·catalog

- 1개 미션 + 2 variants
- lazy tactical layer/inspector
- zero-persistence spy
- 브라우저 수동 QA

### Step 4. Gate 4 콘텐츠와 정식 ID

- 9-1~9-F catalog
- progressive scaffolding
- hidden/transfer variants
- 파일럿/정식 namespace 격리

### Step 5. Gate 4 정식 서비스 연결

- generic reward metadata resolver
- 일일 기록 요약
- Python 과제 근거
- 비-Python 과정 격리
- Hub 진행도와 해금

### Step 6. Gate 5 선택 파일럿

- 제한된 단일 상속 sandbox
- XF-01~03
- zero persistence
- 보안·dunder 회귀

Gate 4 학습 데이터가 승인되기 전에는 flag를 켜지 않는다.

### Step 7. Gate 6 scenario·Final

- ACT readiness matrix
- deterministic scripted scenario
- F-01~F-04 + variants
- 정식 기록·보상·과제 연결

코드는 만들 수 있지만 readiness가 거짓이면 route와 Hub에서 잠긴다.

### Step 8. 통합 검증과 문서화

- 모든 회귀·격리·비용 테스트
- 수동 QA 표 작성
- 알려진 한계와 학생 검증 대기 항목 명시
- readiness는 별도 승인 전까지 false 유지

---

## 14. 다른 AI가 해서는 안 되는 일

- Gate 2 학생 검증 없이 Gate 3 readiness를 임의로 `true`로 변경
- Gate 3~6을 하나의 거대한 catalog와 하나의 feature flag로 묶기
- 파일럿 ID를 정식 보상 ID로 재사용
- Gate 5를 필수 완료 수나 Final 선수 조건에 넣기
- ACT 2~8 placeholder만 보고 Gate 6를 공개
- Python Worker에 미션 이름·드론 색·RESTORED 서사를 하드코딩
- class 이름이나 정답 코드 문자열만으로 성공 판정
- hidden variant 실행마다 Firestore 기록
- event tape·frame·snapshot을 원격 저장
- raw `super`, introspection dunder, 다중 상속을 제한 없이 허용
- 파괴·공격 중심 전투 문구로 제품 서사를 변경
- UI 연출을 이유로 replay 결정성을 깨뜨리기
- 기존 ACT·보상·과제 피드백 코드를 대규모로 정리하거나 포맷
- 테스트가 통과했다는 이유만으로 학생 학습 승인까지 완료했다고 보고

---

## 15. 완료 보고서 형식

구현 담당 AI는 다음 형식으로 보고한다.

```md
## 구현 결과
- 완료 Gate:
- 실제 공개 상태:
- readiness 값과 근거:

## 변경 파일
- 신규:
- 수정:

## 계약 충족
- runtime/event:
- evaluator/variants:
- persistence/reward:
- course isolation:
- accessibility:

## 비용
- Gate 3 Firestore write:
- Gate 4 최초 완료 write 경로:
- Gate 5 Firestore write:
- Gate 6 최초 완료 write 경로:
- 추가 dependency와 bundle 영향:

## 테스트
- 명령:
- 결과:
- 브라우저 수동 QA:

## 미완료·승인 대기
- 학생 관찰:
- readiness:
- 의도적 제외:

## 알려진 위험
- ...
```

“Gate 3~6 구현 완료”라고 한 줄로 보고하지 않는다. 각 Gate를 **코드 완료 / 기술 승인 / 학습 승인 / 공개 승인** 네 상태로 나눠 보고한다.

---

## 16. 최종 승인 체크리스트

### Gate 3

- [ ] Gate 2 학생 검증 승인
- [ ] 1 public + 2 variants
- [ ] stable instance ↔ entity 연결
- [ ] method receiver 기반 상태 변화
- [ ] zero persistence
- [ ] 결정성·오답·브라우저 테스트

### Gate 4

- [ ] 9-1~9-F 8개 정식 미션
- [ ] 점진적 스캐폴딩과 3성 transfer
- [ ] metadata 기반 보상 resolver
- [ ] 최초 완료 멱등 광석
- [ ] 일일 기록·Python 과제 연결
- [ ] 비-Python 완전 격리
- [ ] 접근성·태블릿 QA

### Gate 5

- [ ] 공개 근거가 되는 Gate 4 학습 데이터
- [ ] 단일 상속·override·composition만 허용
- [ ] sandbox 보안 회귀
- [ ] optional/zero-persistence
- [ ] Gate 6 비의존성

### Gate 6

- [ ] ACT 2~8 정식 readiness
- [ ] F-01~F-04와 variants
- [ ] 새 문법 없는 종합 문제
- [ ] scripted deterministic scenario
- [ ] 정식 보상·기록·과제 격리
- [ ] Gate 5 flag off 상태 통과
- [ ] 전체 회귀·성능·접근성 승인

이 체크리스트를 모두 채우기 전에는 readiness를 올리지 않는다.
