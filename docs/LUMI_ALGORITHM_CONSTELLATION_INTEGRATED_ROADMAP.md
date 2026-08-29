# LUMI 알고리즘 성단 — MASTER PLAN × CORE 100 통합 실행 로드맵

> 문서 상태: 실행 기준안 v1  
> 기준 문서: `LUMI_ALGORITHM_CONSTELLATION_MASTER_PLAN.md`  
> 콘텐츠 확장 문서: `LUMI_ALGORITHM_CONSTELLATION_CORE_100_PLAN.md`

## 1. 결론

두 계획은 경쟁하거나 대체하는 문서가 아니다.

- `MASTER_PLAN`은 **무엇을 어떤 학습 원리와 증거 체계로 만들 것인가**를 정한다.
- `CORE_100_PLAN`은 **그 체계를 초·중등용 100개 문제로 어떻게 확장할 것인가**를 정한다.
- 이 문서는 **현재 구현에서 무엇이 실제로 끝났고, 어떤 순서로 두 계획을 연결할 것인가**를 정한다.

현재 상태는 “Phase 7까지 완료”도 아니고 “100문제 제작을 바로 시작할 단계”도 아니다. 가장 정확한 정의는 다음과 같다.

> **신뢰 경계와 학습 루프의 핵심 골격, 7개 기술 알파 커널은 구현되었다. 그러나 진짜 Time-Travel, 범용 진단·AI 코치, 운영 지표, 12문제 학생 파일럿은 아직 완결되지 않았다.**

따라서 다음 우선순위는 문제 수를 빠르게 늘리는 것이 아니라 다음 세 가지다.

1. 현재 7개 커널을 교육적으로 정직한 파일럿 제품으로 완결한다.
2. 12개 원형에서 런타임과 공용 저작 단위를 확정한다.
3. 검증된 공용 부품으로만 20→40→60→80→100개를 확장한다.

---

## 2. 문서의 역할과 충돌 해결 규칙

### 2.1 문서 위계

| 우선순위 | 문서 | 역할 |
|---|---|---|
| 1 | `MASTER_PLAN` | 제품 철학, 학습 순서, 평가 증거, 안전·접근성의 불변 원칙 |
| 2 | 이 통합 로드맵 | 현재 구현의 사실 판정, 실행 순서, 중단 관문 |
| 3 | `CORE_100_PLAN` | 100개 콘텐츠 범위, 난이도 상한, 문제 역할과 제작 Wave |
| 4 | 과거 Phase별 설계·구현 계획 | 당시 의사결정의 기록. 상위 문서와 충돌하면 갱신 또는 역사 문서로 보존 |

### 2.2 해석 규칙

- 문제 수가 학습 증거의 품질보다 우선하지 않는다.
- 모든 문제를 10단계 Anchor로 만들지 않는다. `Anchor / Practice / Review / Capstone` 등급을 지킨다.
- 자동 테스트 통과는 제품·교육 단계의 완료를 뜻하지 않는다. 학생 관찰과 전이 증거가 별도로 필요하다.
- UI에 표시된 이름이 구현의 실체보다 앞서가면 명칭을 낮춘다. 예를 들어 테스트 케이스 이동만 가능한 기능은 완전한 Time-Travel로 부르지 않는다.
- 새 문제 때문에 런타임 예외 분기나 전용 JSX가 계속 늘어나면 제작을 중단하고 공용 Capability를 먼저 보완한다.

---

## 3. 현재 구현의 정확한 기준선

### 3.1 이미 확보한 자산

- Problem Kernel, Replay, Assistance Evidence, 3-Star Evidence, Variant Seed 계약
- 서버 권위 Callable 흐름, 히든 테스트·전이 문제 분리, 시도 기록·보상 원장
- 클라이언트 Worker 실행과 제한형 Python 평가기
- 일반 학습, AI 연구, 독립 귀환, Arena 의도 구분의 기초
- 규칙 기반 오개념 후보, S1~S5 Scaffold Graph, 정체 감지
- 외부 AI 코치 프롬프트 복사와 서버 우선 기록 흐름
- 초안 저장·재진입과 Gateway 경계
- 조건·패턴·수열·Queue·Grid BFS 계열의 공용 Lens
- 현재 공개된 7개 기술 알파 커널

현재 커널 기준선:

1. `AC-COND-001`
2. `AC-COND-002`
3. `AC-PAT-003`
4. `AC-PAT-004`
5. `AC-SEQ-005`
6. `AC-NAV-005`
7. `AC-NAV-006`

### 3.2 완료로 표시하면 안 되는 항목

| 항목 | 현재 판정 | 이유 |
|---|---|---|
| 실제 Python Sandbox | 부분 완료 | 제한형 실행기는 존재하지만 메모리·출력·언어 Capability 전체가 운영 수준으로 증명된 것은 아님 |
| AC-COND-001 완결 루프 | 기술 완료·교육 미검증 | 서버 흐름과 UI는 있으나 실제 학생 관찰 및 귀환 학습효과 검증이 남음 |
| 적응형 Scaffold | 부분 완료 | 문제별 수공예 Graph는 있으나 범용 가족 템플릿, 실제 Parsons 조작, 진단 미션이 부족 |
| Time-Travel | 핵심 미완료 | 현재 Trace는 실제 문장별 변수 변화보다 테스트 실행 결과 중심임 |
| BFS Vertical Slice | 부분 완료 | Queue/Grid Lens와 커널은 있으나 문장 단위 Trace와 BFS 오개념 증거가 충분하지 않음 |
| 외부 AI 사고 코치 | 조건 문제 MVP | 프롬프트의 목표·장면 포맷이 조건 문제에 치우쳐 다른 계열에서 부정확할 수 있음 |
| Arena | 정책·가드 프로토타입 | 전체화면, 종료 상태, 접근성 예외, 공식 운영·랭킹 규칙이 완결되지 않음 |
| 12개 원형 파일럿 | 미완료 | 7개 커널이며 학생 집단 파일럿 결과가 없음 |
| ASI 운영 지표 | 미완료 | 계산 로직 자산은 있으나 Functions 권위 원장과 제품 리포트의 단일 구현으로 연결되지 않음 |
| 크리스털 경제 연동 | 미확인/부분 | 멱등 보상 원장은 있으나 전역 경제와 학생 가시 UX까지 완결되었다고 보기 어려움 |
| 교사·학부모 경험 | 미착수에 가까움 | 근거 데이터와 실제 사용 흐름이 아직 검증되지 않음 |
| 저작 엔진 | 계약만 일부 완료 | 100개용 Catalog, Validator, Preview, 수명주기 도구가 없음 |

### 3.3 MASTER PLAN Phase 판정

| Phase | 원래 목표 | 현재 상태 | 다음 판정 관문 |
|---|---|---|---|
| 0 | 핵심 계약 | 완료 | 계약 변경은 버전 마이그레이션을 동반 |
| 1 | 최소 실행 엔진 | 부분 완료 | Capability·메모리·출력·복구 한계의 실측 |
| 2 | AC-COND-001 완결 Slice | 기술 완료, 교육 미검증 | 학생 파일럿과 독립 귀환 확인 |
| 3 | 적응형 Scaffold | 부분 완료 | 가족 기반 Scaffold와 실제 Parsons 검증 |
| 4 | Time-Travel·Data Lens | 핵심 미완료 | 문장 단위 semantic event와 line/state 동기화 |
| 5 | BFS 종합 Slice | 부분 완료 | Queue/Grid 의미 Trace와 BFS 오개념 전이 검증 |
| 6 | API 없는 AI 코치 | MVP 부분 완료 | 문제 계열별 Evidence Adapter와 정보 누출 테스트 |
| 7 | 공식 무결성·Arena | 프로토타입 | 학습 제품 안정화 뒤 별도 출시 관문 적용 |
| 8 | 12개 원형 파일럿 | 미완료 | 12개 Capability 대표 원형 + 학생 파일럿 |
| 9 | 36개 Season 1 | 미착수 | 공용 저작 단가가 입증된 뒤 시작 |
| 10 | 정규 과정·대회 전이 | 미착수 | Core 100 후반과 별도 PRO 경로로 진행 |

---

## 4. 통합 개발 전략: 제품 Gate와 콘텐츠 Wave를 분리한다

`MASTER_PLAN`의 Phase와 `CORE_100_PLAN`의 Wave를 한 줄로 이어 붙이지 않는다.

```text
제품 준비도 Gate
계약 → 학습 루프 → 의미 Trace → 범용 진단 → 저작 기반 → 운영 검증
                         │
                         └─ 통과한 Capability만 콘텐츠 Wave에 사용

콘텐츠 Wave
7개 기준선 → 12개 원형 → 20개 → 40개 → 60개 → 80개 → 96개 + Capstone 4개
```

이 분리는 다음 실패를 막는다.

- 100개 문제마다 전용 UI와 전용 진단 코드를 만드는 문제
- 제한형 런타임이 감당하지 못하는 문법을 콘텐츠가 먼저 요구하는 문제
- 자동 테스트 수만 늘고 실제 학습효과는 확인하지 못하는 문제
- Phase 명칭만 완료되고 출시 승인 기준은 남는 문제

---

## 5. 통합 실행 로드맵

## Stage A — 기준선 동결과 진실한 상태표

목표: 현재 7개를 이후 회귀 검증의 기준선으로 확정한다.

작업:

1. 7개 커널의 `problemVersion`, `generatorVersion`, runtime capability를 고정한다.
2. Production 권위 구현과 client/shared 중복 구현을 목록화한다.
3. 사용되지 않는 서버 서비스나 호환 Facade는 `migrate / retain / retire`로 판정한다.
4. 문서에서 `구현됨`, `자동 검증됨`, `학생 검증됨`, `운영 검증됨`을 분리한다.
5. 전체 테스트 결과와 기능 상태를 연결한 단일 Release Matrix를 만든다.

완료 Gate A:

- 같은 기능의 권위 구현이 하나로 명시된다.
- 7개 커널의 버전과 Capability가 재현된다.
- 실패한 기능을 UI가 완료된 기능처럼 표현하지 않는다.

## Stage B — Pilot-ready 7: 학습 루프 완결

목표: 새 문제 추가 전에 현재 7개를 학생에게 보여줄 수 있는 품질로 닫는다.

### B1. Semantic Trace MVP

완전한 범용 디버거를 만들지 않는다. 초·중등 학습에 필요한 최소 이벤트만 지원한다.

- `statement-enter`
- `assignment`
- `branch-decision`
- `loop-iteration`
- `container-mutation`
- `function-return`

각 이벤트는 실제 `sourceLine`, `stateDiff`, 필요한 경우 `worldDiff`를 가져야 한다. 코드 줄, 변수 상태, Lens 장면이 같은 `stepIndex`로 이동해야 한다.

완료 기준:

- 학생이 “어느 줄에서 값이 처음 달라졌는지” 앞뒤로 찾을 수 있다.
- 테스트 케이스 단위 이동을 Time-Travel 완료로 간주하지 않는다.
- 무한 루프·이벤트 폭주에서도 압축과 중단이 작동한다.

### B2. 가족 기반 Evidence Adapter

문제별 프롬프트 문자열을 추가하는 대신 다음 인터페이스를 만든다.

- `conditionEvidenceAdapter`
- `patternEvidenceAdapter`
- `sequenceEvidenceAdapter`
- `queueEvidenceAdapter`
- `gridSearchEvidenceAdapter`

Adapter는 학습 목표, 공개 실패 요약, 대표 Trace 장면, 진단 후보, 금지할 정답 노출을 제공한다. 외부 AI 코치는 이 중립 계약만 사용한다.

### B3. Scaffold 정리

- Anchor에만 실제 드래그/키보드 조작 가능한 Parsons를 제공한다.
- Practice는 공용 순서 카드 또는 부분 코드로 제한한다.
- 문법 오류는 실제 오류 코드에 맞는 Protocol Repair로 연결한다.
- 삭제된 하드코딩 진단 모달을 되살리지 않는다. 진단은 문제 가족과 증거 계약으로 생성한다.
- S5와 Rescue가 정답 전체를 노출하는지 자동 검사한다.

### B4. 운영 증거 정리

- ASI를 운영 Functions의 불변 Assistance Evidence에서 계산하거나, 그렇지 않으면 학생·학부모 UI 노출을 보류한다.
- 전역 보상 경제와 연결하기 전까지 Reward Ledger를 “보상 지급 권리 기록”으로 정의한다.
- 독립 귀환은 예약, 재진입, 새 변형, 성공 증거까지 한 흐름으로 검증한다.

### B5. 접근성과 첫 학생 관찰

- 키보드만으로 Observe→Explore→Code→Trace→Submit 진행
- 태블릿 세로/가로, 터치 Target, 긴 한글 코드 설명 확인
- `prefers-reduced-motion`에서 핵심 정보 손실 없음
- 초등 고학년·중학생 6~12명을 대상으로 관찰 테스트

완료 Gate B:

- `AC-COND-001`과 `AC-NAV` 대표 문제에서 실제 semantic Time-Travel이 작동한다.
- 외부 AI 프롬프트가 모든 5개 가족에서 잘못된 목표·필드를 출력하지 않는다.
- 학생 80% 이상이 운영자 개입 없이 첫 미션을 완료한다.
- 24시간 이내 또는 파일럿용 단축 귀환에서 전이 흐름이 확인된다.

## Stage C — 12개 Capability 원형과 Runtime Decision

목표: MASTER PLAN Phase 8과 CORE 100 Wave 0을 하나의 검증 단계로 합친다.

현재 7개에 다음 5개 원형을 추가한다.

1. 코드 읽기·디버깅 원형
2. 문자열·리스트 변환 원형
3. `set / dict` 기록 원형
4. 작은 완전 탐색 원형
5. 정렬·이진 탐색 입문 원형

동시에 Runtime Capability Pack을 검증한다.

| Pack | 범위 | 이 단계의 결정 |
|---|---|---|
| R0 | 조건·반복·기본 list·함수 | 현재 구현을 기준선으로 유지 |
| R1 | 문자열·`range`·기본 메서드 | 12개 파일럿 전에 구현·검증 |
| R2 | `dict`·`set` | 12개 파일럿에서 대표 원형 1개씩 검증 |
| R3 | `sorted`, 안전한 helper | 20개 전 확정 |
| R4 | 제한 재귀 | 60개 이후 필요 시 도입 |
| R5 | semantic instrumentation | Stage B에서 최소형을 먼저 완료 |

### Runtime 선택 관문

다음 중 하나를 명시적으로 선택한다.

- 제한형 교육용 evaluator를 유지하고 지원 문법을 좁게 고정
- 고정 버전 Python 런타임으로 전환하고 격리·비용을 별도 해결

선택 기준:

- 학생이 배운 Python과의 의미 일치
- 클라이언트/서버 parity 유지비
- 문제당 신규 문법 추가 공수
- 실행 비용과 cold start
- Trace 계측 가능성
- 보안 실패 폐쇄

중단 기준:

- 새 Practice 1개가 evaluator 수정까지 요구하며 1.5인일을 반복 초과
- 클라이언트와 서버의 의미 차이 회귀가 두 Wave 연속 발생
- R2 이후 메서드 예외 목록이 지속 증가

완료 Gate C:

- 12개가 서로 다른 Capability를 대표한다.
- 새 Practice 커널이 전용 컴포넌트 없이 공용 Lens로 실행된다.
- Runtime 유지/전환 결정과 40개까지의 비용 추정이 승인된다.
- 초등·중등 각각의 학생 파일럿 결과가 기록된다.

## Stage D — Core 100 저작 기반

목표: 사람이 문제 100개를 코드에 직접 박아 넣지 않도록 한다.

먼저 만들 것:

1. Editorial Catalog Schema
   - 출처 URL, 원형 유형, 라이선스·재서술 상태
   - 연령, 선수 개념, 난이도, 성단, 역할
   - 채택·보류·폐기 사유
2. Curriculum Graph
   - `catalogOrder`, `prerequisites`, `core/branch`, `A/P/R/C`
3. Lens Registry
   - Kernel의 Lens ID와 공용 UI를 선언적으로 연결
4. Transfer Family Registry
   - 문제별 전이 100개가 아니라 약 20~24개 가족 템플릿 재사용
5. Misconception Template Registry
   - 개념 가족별 증거와 질문을 재사용
6. Authoring CLI·Validator·Preview
   - Schema, seed 결정성, 힌트 누출, 테스트 중복, Trace 예산, 접근성 필드 검사
7. 콘텐츠 수명주기
   - `draft → review → pilot → published → archived`
   - 버전 변경 시 기존 mastery 처리 규칙

지금 만들지 않을 것:

- 대형 WYSIWYG 저작 UI
- AI가 자동으로 100개를 생성·출판하는 파이프라인
- 문제마다 별도 Lens와 전이 UI

완료 Gate D:

- Practice 1개를 데이터 추가만으로 Preview까지 만들 수 있다.
- Anchor도 새 컴포넌트 없이 기존 블록 조합으로 제작할 수 있다.
- 출처·재서술·권리 검토가 없으면 publish가 거부된다.
- public bundle과 프롬프트에 hidden/transfer master가 누출되지 않는다.

## Stage E — Wave A: 20개

목표: Core 100의 첫 실제 코스 단위를 출시한다.

- 사고 탐사 면허와 조건·패턴 중심
- 20개 전체를 10단계로 만들지 않음
- Anchor는 완전 루프, Practice는 공용 Lens, Review는 혼합 회상
- 8명 이상 학생 파일럿과 관찰 기록

완료 Gate E:

- 신규 Practice 중앙 제작시간 1.5인일 이하
- 신규 Anchor 중앙 제작시간 5인일 이하
- 외부 AI 프롬프트의 정답·hidden 누출 0건
- 첫 시도 도움 요청과 독립 귀환 성공을 함께 측정
- 중단률이 높은 미션은 40개로 복제하지 않고 먼저 수정

## Stage F — Wave B/C: 40개·60개

### 40개

- 문자열, 수열, `dict/set`, 정렬·탐색을 확장
- R1·R2·R3를 운영 수준으로 고정
- 교사용 리포트는 전체 대시보드가 아니라 다음 세 질문만 제공
  1. 어디에서 막혔는가
  2. 어떤 지원을 사용했는가
  3. 독립 귀환에서 무엇이 달라졌는가
- 40개 시점에 실제 제작 단가를 다시 추정하고 100개 범위를 재승인

### 60개

- 시뮬레이션·작은 탐색까지 확장
- 첫 코어 경로 수료 배지 또는 인증
- Review의 간격 반복과 개념 혼합을 검증
- 문제 수보다 성단별 최소 학습 증거 충족을 우선

## Stage G — Wave D: 80개

- 작은 완전 탐색, Stack, Queue 확장
- 이미 검증한 Lens와 Transfer Family만 재사용
- 새 bespoke Lens는 Capstone 후보가 아니면 원칙적으로 금지
- 성능 최적화는 입력 크기 경쟁이 아니라 전략 비교·코드 심판 형태로 제시

## Stage H — Wave E: 96개 + Capstone 4개

- Grid/BFS, 제한 재귀·memo, 단순 greedy를 연령 상한 안에서 마무리
- Capstone은 여러 개념을 연결하되 성인 대회형 난이도로 상승시키지 않음
- 100번째 문제는 “가장 어려운 문제”가 아니라 학생이 자신의 사고 과정을 설명하고 검증하는 종합 프로젝트로 설계
- PRO Shell과 외부 저지 전이는 Core 과정과 분리된 선택 경로로 제공

---

## 6. 우선순위 백로그

### P0 — 문제 수 확대 전에 필수

1. 실제 semantic Trace와 line/state/Lens 동기화
2. 5개 문제 가족용 Evidence Adapter
3. 운영 권위 Assistance Evidence와 ASI 처리 결정
4. 7개 커널의 접근성·재진입·귀환 QA
5. 12개 Capability 원형과 Runtime Decision
6. 학생 파일럿 프로토콜과 관찰 기록
7. Editorial Catalog와 출처·권리 검토 필드

### P1 — 20개 전에 필수

1. Lens Registry
2. Transfer Family Registry
3. 가족 기반 Scaffold·오개념 Template
4. Authoring CLI·Validator·Preview
5. Curriculum Graph와 콘텐츠 수명주기
6. 실제 Parsons 상호작용의 공용 컴포넌트
7. hidden bundle·prompt leakage 자동 검사 확대

### P2 — 검증 뒤 진행

1. 교사 최소 리포트
2. 학부모 성장 문장
3. PRO Shell과 표준 입출력
4. Arena 공식 운영
5. Crew 협력 탐사
6. 고급 저작 UI와 AI 저작 보조

---

## 7. 당분간 과감히 버리거나 미룰 것

- 100개 모두를 10단계 완결 커널로 제작
- 문제마다 전용 React 컴포넌트·Lens·전이 미션 제작
- 제한형 evaluator에 Python 전체 문법을 끝없이 추가
- 검증 전 ASI를 소수점 정밀 점수처럼 학생·학부모에게 제시
- 학습효과 확인 전 공개 랭킹과 강한 감시형 Arena를 우선 개발
- 근거 데이터가 쌓이기 전 대형 교사 대시보드 제작
- AI 답변을 다시 붙여 넣어 자동 판독하는 기능
- 출처 문제를 문장과 수치만 조금 바꾸어 이식
- Capstone을 성인 알고리즘 난이도로 만드는 것

---

## 8. Release Gate의 공통 정의

각 Stage는 다음 네 종류의 증거를 따로 통과해야 한다.

| 증거 | 질문 | 예시 |
|---|---|---|
| 기술 | 안전하고 결정적으로 실행되는가 | parity, seed replay, budget, fail-closed |
| 콘텐츠 | 문제와 힌트가 계약을 지키는가 | schema, hidden 누출, 연령·선수 개념 |
| 학습 | 학생이 생각하고 전이하는가 | 이해 별, Fresh Transfer, 지원 감소 |
| 운영 | 실제 서비스에서 유지 가능한가 | 비용, 제작시간, 장애 복구, 버전 수명주기 |

“완료”는 네 증거 중 해당 Stage에 요구된 항목이 모두 있을 때만 사용한다.

### 핵심 성공 지표

- 첫 성공률 하나가 아니라 `첫 시도 → 지원 사용 → 이해 증거 → 독립 귀환`의 변화
- 같은 개념에서의 지원 단계 감소
- 오답 후 무작위 수정 대신 Trace 확인·가설 수정 행동 증가
- Fresh Transfer 성공률
- Practice와 Anchor의 중앙 제작시간
- 런타임·Judge 1회당 비용과 실패율
- 초등·중등별 중단 지점과 접근성 장애

---

## 9. 바로 다음 설계 산출물

코드 작업에 들어가기 전 다음 네 문서를 이 순서로 확정한다.

1. **Pilot-ready 7 Acceptance Spec**
   - 7개 커널별 현재 기능, 부족한 증거, 학생 시나리오, 완료 조건
2. **Semantic Trace Event Spec v2**
   - 지원 이벤트, stateDiff, sourceLine, 압축, checkpoint, Lens Adapter 계약
3. **Runtime Capability Decision Record**
   - R0~R5 지원표, evaluator 유지/전환 비교, 12·40·100개 비용 영향
4. **Editorial Catalog & 12 Prototype Selection Spec**
   - 후보 수집, 권리 검토, 채택 점수, 5개 추가 원형, 파일럿 계획

그 뒤의 최초 구현 순서는 다음과 같다.

```text
Semantic Trace MVP
→ 범용 Evidence Adapter
→ Pilot-ready 7 QA
→ 5개 Capability 원형
→ Runtime Decision
→ 12개 학생 파일럿
→ Authoring Foundation
→ Core 20
```

---

## 10. 최종 방향

LUMI 알고리즘 성단의 경쟁력은 문제 수나 랭킹이 아니다. 학생이 다음 순환을 실제로 경험하도록 만드는 데 있다.

> 관찰한다 → 규칙을 발견한다 → 코드로 표현한다 → 실행 순간을 되짚는다 → 자신의 오개념을 수정한다 → 도움 없이 다른 상황에 전이한다

`MASTER_PLAN`이 이 경험의 품질을 지키고, `CORE_100_PLAN`이 그 경험의 폭과 반복을 만든다. 앞으로의 모든 개발은 다음 질문으로 승인한다.

> **이 작업이 학생의 사고 증거를 더 정확하게 만들거나, 그 경험을 품질 저하 없이 더 많은 문제에 재사용하게 하는가?**

둘 중 어느 것도 아니라면 현재 우선순위에서는 진행하지 않는다.
