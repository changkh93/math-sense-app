# LUMI Protocol Gate 2: Object Learning Vertical Slice 가이드

## 1. 개요 및 목적

Gate 2는 Gate 1에서 검증된 기술 엔진(Trace, Snapshot, Current-Binding, Time-Travel, Zero-Persistence)을 바탕으로, **`class`, instance, `__init__`, `self`를 학생이 진정으로 이해하는지 검증하는 학습 Vertical Slice 파일럿**입니다.

- **목표**: 9-1~9-5 및 전이 미션을 통한 개념 습득 및 오개념 차단 검증
- **격리 원칙**: Feature Flag (`VITE_LUMI_OBJECT_LEARNING_PILOT=true`) 하에 개발 환경에서만 작동하며, 정규 ACT 진도 및 Firestore/localStorage 영속성 0건 유지.

---

## 2. 파일럿 미션 구성표

| 미션 ID | 미션명 | 핵심 학습 목표 | 학생 경험 및 스캐폴딩 | 통과 기준 |
|---|---|---|---|---|
| **pilot-object-9-1** | LUMI의 정체 | `lumi`가 `Rover` 객체(상태+행동)임을 이해 | `type(lumi)` 실행 후 SYSTEM OBJECTS에서 Rover 상태·메서드 관찰 | `inspectSystemObject: { objectName: 'lumi', className: 'Rover' }` |
| **pilot-object-9-2** | 홀로그램 설계도 | `class`는 실체가 아닌 조립 설계도임을 이해 | `class Drone:\n pass` 실행 관찰 | `classCountAtLeast: 1`, `distinctInstanceCount: 0` |
| **pilot-object-9-3** | 첫 번째 실체 | `Drone()` 호출로 고유 identity 인스턴스 조립 | `scout = Drone()` 한 줄 작성 (대체 변수명 허용) | `distinctInstanceCount: 1` |
| **pilot-object-9-4** | 생성될 때 정하는 상태 | `__init__`을 통한 인스턴스별 독립 초기 상태 | `self.integrity = integrity` 작성 | `allInstancesHaveAttribute: integrity`, `instancesHaveDistinctState: integrity` |
| **pilot-object-9-5** | 바로 그 객체 자신 | `self`가 현재 메서드 대상 객체임을 이해 | `scout_1.charge(10)` 호출 및 `scout_2` 불변 확인 | `onlyTargetInstanceAttributeChanged` (`scout_1`: 20 ➔ 30, `scout_2`: 20 유지, receiver match) |
| **pilot-object-transfer-1** | MetaSense 밖으로의 전이 | MetaSense 밖의 일반 Python 소재 전이 | `Pet` 클래스 인스턴스 2개 생성 및 메서드 호출 | `onlyTargetInstanceAttributeChanged` (`energy`: 50 ➔ 70, `unchangedOthers: true`) |

---

## 3. 학생 관찰 테스트 프로토콜

- **대상**: `def`, 매개변수, 함수 호출을 읽을 수 있는 선발 학생 5명
- **진행 방식**:
  1. 9-1 ~ 9-5 수행 (첫 90초간 개념 힌트 없이 관찰)
  2. 인스펙터 화면(SYSTEM OBJECTS / BLUEPRINT / INSTANCES / SELF FOCUS)을 활용하여 상태 변화 설명 요청
  3. LUMI/Drone 서사가 없는 `Pet` / `Book` 전이 과제 독립 수행
- **통과 기준**:
  - 5명 중 4명 이상이 class(설계도)와 instance(실체)를 자기 말로 명확히 구분
  - 5명 중 4명 이상이 `self`를 "현재 charge를 호출한 바로 그 드론"으로 설명
  - 5명 중 3명 이상이 최대 1회의 개념 힌트로 전이 문제 성공

---

## 4. 격리 및 보안 계약

- **Feature Flag**: `LUMI_OBJECT_LEARNING_PILOT_ENABLED` (기본값 `false`, fail-closed)
- **Zero-Persistence**: Firestore 쓰기 0건, `localStorage` 진행도 쓰기 0건, 보상 원장 쓰기 0건
- **프로덕션 카탈로그 분리**: `getLumiMissionById`에 노출되지 않으며 전용 `getLumiPilotMissionById`로만 접근 가능.
