# 루미 로버 원정 관제: 최종 제품·구현 설계

작성일: 2026-07-30  
상태: 구현 기준 확정안  
범위: 기존 로버 원정의 안정적인 트랜잭션은 유지하고, 학생이 목적·진행·결과·성장을 한 흐름으로 이해하도록 재구성한다.

## 1. 한 문장 결론

루미 로버 원정은 “6시간 뒤 재료를 받는 타이머”가 아니라, **아스트라 프론티어의 잃어버린 기억을 되찾기 위해 학생이 한 항로를 선택하고, 루미가 수행한 임무가 행성·발견 도감·이야기에 남는 장거리 원정**이어야 한다.

따라서 다음 흐름을 제품의 불변 규칙으로 삼는다.

```text
출항 준비 → 원정 진행 → 귀환 완료 → 귀환 보고서 확인 → 보고서 보관 → 다음 출항 준비
```

보고서를 보관하기 전에는 새 원정을 시작할 수 없다. 완료한 원정은 지워지지 않고 원정 일지에 남으며, 발견물은 별도의 발견 도감에 남는다.

## 2. 현행 코드에서 확인한 사실

### 유지할 기반

회원 원정의 서버 트랜잭션은 좋은 기반이다. 다음은 바꾸지 않는다.

| 현재 기반 | 위치 | 유지 이유 |
| --- | --- | --- |
| `operationId` 기반 출발 재시도 | `functions/galaxyGame.js` | 네트워크 응답이 끊겨도 같은 원정을 복구하며 중복 출발을 막는다. |
| 서버 시각으로 귀환 판정 | 같은 파일 | 사용자가 기기 시간을 바꿔 보상을 앞당길 수 없다. |
| 출항 시점 보너스 스냅샷 | `buildGalaxyRoverDeparture` | 출항 뒤 시설/능력이 바뀌어도 현재 원정의 약속이 바뀌지 않는다. |
| 정확히 한 번 보상 지급 | `planGalaxyRoverClaim` | 수령 재시도에도 재료·발견물이 중복 지급되지 않는다. |
| 개별 operation 영구 기록 | `users/{uid}/galaxyOperations/{operationId}` | 원정 일지의 원본 데이터가 이미 존재한다. |

### 반드시 고칠 사실

| 문제 | 실제 원인 | 영향 |
| --- | --- | --- |
| 결과와 다음 출항이 같은 화면에 보임 | `claimed`도 항로 선택 가능 상태로 처리 | “새 6시간 원정 시작”이 기존 원정을 덮는 듯 보인다. |
| 결과가 새로고침 후 빈약해질 수 있음 | 현재 슬롯의 `claimed` 원정에 완전한 `claimResult`가 저장되지 않음 | 전후 재료 수량·신규 발견 여부·스토리 결과를 안정적으로 보여주기 어렵다. |
| 게스트의 약속과 실제 결과가 다름 | 게스트는 8시간 고정, 기본 보상 고정, 첫 발견물 고정 | 화면에 6시간·비콘·학습 보너스를 보여도 실제로는 적용되지 않을 수 있다. |
| 희귀도가 장식에 가까움 | 회원은 `operationId` 해시를 3으로 나눈 같은 비율 선택 | ‘일반/희귀/전설’이 실제 획득 규칙과 맞지 않는다. |
| 기존 프론티어 서사가 관제에 없음 | `GalaxyRoverPanel`에 스토리 목적을 전달하지 않음 | 학생이 왜 지금 이 항로를 고르는지 알 수 없다. |
| `2/9`의 목적이 불명확함 | 전체 도감 수와 스토리의 3종 목표가 같은 자리에 섞임 | “9개를 모아야 하는지, 3개면 되는지” 알 수 없다. |

참고로 진행 중 원정이 실제로 여러 개 생기는 회원 모드 버그는 아니다. 현 서버는 `exploring`/`ready` 원정을 차단한다. 문제는 **수령 완료 원정과 다음 출항 준비가 한 화면에 섞인 경험**이며, 게스트에는 별도의 계약 불일치가 있다.

## 3. 제품 서사와 용어: 하나의 세계로 말하기

### 핵심 서사

암흑물질 폭풍은 행성 밖 항로의 기억을 흩뜨렸다. 루미는 사람이 직접 조종하지 않아도 정해진 항로를 탐사할 수 있는 자율 로버다. 학생은 관제소에서 “지금 필요한 기억과 재료가 있는 항로”를 골라 루미를 보낸다. 루미가 귀환하면:

1. 행성을 성장시키는 건설 재료를 회수하고,
2. 폭풍 이전의 고유 발견물을 복원하며,
3. 그 원정이 프론티어 이야기의 한 장면과 내 원정 일지에 남는다.

즉, 재료는 건설의 이유이고 발견물은 세계를 이해하는 이유이며, 원정 일지는 학생이 해낸 일을 기억하는 장치다.

### 고정 용어

| 개념 | 사용할 말 | 사용하지 않을 말 |
| --- | --- | --- |
| 전체 기능 | 루미 로버 원정 관제 | 오프라인 익스페디션, 원정 예약 |
| 6/8시간 자동 콘텐츠 | 장거리 원정 | 현장 탐사, 미션 |
| 45초 직접 플레이 | 현장 탐사 | 로버 원정 |
| 목적지 | 항로 | 루트, 원정장, 섹터 |
| 항로에서 얻는 건설 자원 | 건설 재료 | 회수물, 보급품 |
| 고유 컬렉션 | 발견물 | 유물·표본·기록 혼용 |
| 한 번의 귀환 결과 | 귀환 보고서 | 귀환 상자, 귀환 결과 기록 |
| 모든 완료 원정 | 원정 일지 | 도감, 아카이브 |
| 고유 발견물 목록 | 발견 도감 | 원정 기록소 |
| 중복으로 다시 만난 발견물 | 재관측 | 새 발견 |

모달의 공통 제목은 `루미 로버 원정 관제` 하나만 사용한다. 내부에서 서비스 제목을 다시 반복하지 않는다. `밤사이`는 낮에도 출항할 수 있으므로 제거한다.

### 세 항로의 역할

| 항로 | 지금 하는 일 | 회수 재료와 행성 기여 | 3단계 발견 서사 |
| --- | --- | --- | --- |
| 성운 생태 항로 | 폭풍 뒤 사라진 생태 신호를 추적한다. | 바이오 섬유 → 루멘 나무·별꽃 정원·온실 | 루멘 포자낭 → 에테르 씨앗 → 성운고래의 메아리 |
| 혜성 구조 항로 | 끊긴 구조 신호와 오래된 장비를 회수한다. | 혜성 합금 → 로버 정비소·원정대 비콘·항로문 | 혜성 철편 → 꼬리빛 결정 → 개척자 구조 캡슐 |
| 고대 정거장 항로 | 멈춘 정거장의 기억 장치를 복원한다. | 수정 유리 → 수정 연못·성운 관측소·귀환 신호 광장 | 정거장 인장 → 프리즘 기억핵 → 잃어버린 아스트라 성도 |

`에테르 씨앗` 같은 발견물은 이름만 노출하지 않는다. 발견 도감에서 분류, 기록 등급, 최초 발견 원정, 짧은 세계관 기록, 항로별 복원 진행도를 함께 보여준다.

## 4. 최종 상태 모델

서버의 지급 상태와 학생에게 보이는 화면 상태는 분리한다. 이는 가장 중요한 설계 결정이다.

### 화면 상태

| 화면 상태 | 원정 슬롯/시간 조건 | 학생에게 보이는 한 가지 행동 |
| --- | --- | --- |
| `PREPARATION` 출항 준비 | 현재 슬롯 없음 | 항로를 고르고 출항한다. |
| `EXPEDITION` 원정 진행 | `exploring`, 귀환 시각 전 | 진행 단계와 귀환 예정 시각을 확인한다. |
| `RETURNED` 귀환 완료 | `exploring`, 귀환 시각 도달 | 귀환 보고서를 연다. |
| `REPORT` 결과 확인 | `claimed`, 보고서 미보관 | 결과를 읽고 보관한다. |

`REPORT`를 끝내면 현재 슬롯이 비워지고 `PREPARATION`으로 돌아간다. 항로 선택기는 `PREPARATION`에서만 렌더링한다.

### 서버 상태와 데이터 원칙

`operation.status`는 지급 안정성을 위해 간결하게 유지한다.

```text
exploring → claimed
```

`ready`는 서버 시각과 `readyAtMs`로 파생한다. `roverExpedition`은 **현재 처리 중인 한 개의 슬롯**이다.

```text
출항:           roverExpedition = exploring
귀환 시각 도달:  쓰지 않고 ready를 파생
수령:           roverExpedition = claimed + 완전한 result
보고서 보관:     roverExpedition = null
```

원정 operation 문서는 마지막 단계에서도 유지된다. 이 문서가 원정 일지의 단일 진실 공급원이다.

### 새 서버 액션

`acknowledgeGalaxyRoverReport({ operationId })`를 추가한다.

트랜잭션에서 다음을 원자적으로 확인·처리한다.

1. 요청 사용자가 이 원정의 소유자인지 확인한다.
2. 현재 행성의 `roverExpedition.operationId`와 일치하는지 확인한다.
3. operation과 슬롯이 모두 `claimed`인지 확인한다.
4. operation에 `reportAcknowledgedAtMs`와 서버 timestamp를 기록한다.
5. 행성 문서의 `roverExpedition`을 `null`로 비우고 `roverStats.lastAcknowledgedOperationId`를 갱신한다.

이후에만 `startGalaxyRoverExpedition`이 새 출발을 허용한다. 출발 가능 조건은 “`claimed`가 아님”이 아니라 **현재 슬롯이 없음**이다.

이 액션은 idempotent해야 한다. 같은 보고서의 재시도는 `deduplicated` 성공을 반환한다. 이미 다른 원정이 현재 슬롯을 차지한 경우는 `stale_operation`, 아직 수령 전이면 `not_claimed`, 기록이 없으면 `not_found`을 명시적으로 반환한다. 이 세 가지 쓰기는 반드시 같은 트랜잭션 안에서 끝난다.

## 5. 데이터 계약

### 출항 스냅샷

출항 시 원정 안에 다음을 고정한다. 화면은 진행 중에 전역 상태가 바뀌어도 이 스냅샷을 사용한다.

```js
{
  operationId,
  expeditionNo,
  type: 'galaxy_rover_expedition',
  route,
  routeTitle,
  startedAtMs,
  readyAtMs,
  durationMs,
  status: 'exploring',
  reward: { material, title, baseAmount, beaconBonus, abilityBonus, amount },
  discoveryId, // operation 내부의 확정 결과. 진행 중 client view에는 노출하지 않는다.
  discoveryPending: true,
  bonuses: { roverBay, expeditionBeacon, abilityId, abilityLevel, ability },
  storyContextAtLaunch: { chapterId, chapterTitle, stepId, eyebrow, title, detail }
}
```

`storyContextAtLaunch`은 출항 직전의 프론티어 목적을 담는다. 첫 원정 출항으로 프롤로그가 다음 장으로 이동해도, 6시간 뒤 원정 보고서는 “프롤로그 · 첫 항로를 위해 떠난 원정”으로 남는다. 발견 결과도 출항 트랜잭션에서 확정하지만, 진행 중인 회원용 client view에는 `discoveryPending: true`만 보낸다. 귀환 보고서에서 처음 공개한다. 이는 보안 장벽이 아니라 귀환의 작은 발견감을 지키는 제품 규칙이다.

### 수령 결과 스냅샷

보상 지급 때 operation의 `claimResult`와 현재 슬롯의 `result`에 같은 표시용 결과를 남긴다.

```js
{
  operationId,
  route,
  claimedAtMs,
  reward: {
    material, title, baseAmount, beaconBonus, abilityBonus, amount,
    balanceBefore, balanceAfter,
  },
  discovery,
  isNewDiscovery,
  routeDiscoveryCount,
  totalDiscoveryCount,
  storyProgressAtClaim: {
    beforeChapterId, beforeStepId,
    afterChapterId, afterStepId,
    advancedStepIds,
    restorationBefore, restorationAfter,
  }
}
```

예를 들어 학생이 보게 되는 값은 `수정 유리 +4 · 출항 전 37개 → 현재 41개`다. 보너스의 근거도 함께 보인다. 이미 계산되어 있는 `baseAmount`, `beaconBonus`, `abilityBonus`를 다시 추정하지 않는다.

### 원정 번호와 요약 통계

행성 문서에 가벼운 `roverStats` rollup을 추가한다.

```js
{
  version: 1,
  totalLaunched,
  totalClaimed,
  nextExpeditionNo,
  routeLaunchCounts: { nebula, comet, ruins },
  uniqueDiscoveryCount,
  lastOperationId,
  lastClaimedOperationId,
  lastAcknowledgedOperationId,
}
```

`roverStats`는 원정 이력의 원본이 아니라 빠른 표시를 위한 **캐시 rollup**이다. 출발·수령·보고서 보관 트랜잭션에서 함께 갱신하지만, 누락·구버전이어도 operation의 유효성은 변하지 않는다. 새 출항에서 `expeditionNo = nextExpeditionNo`을 부여한 뒤 증가시킨다. 과거 operation에 번호를 일괄 backfill하지 않으며, 번호가 없는 기록은 날짜와 항로로 표시한다.

## 6. 발견 규칙: 확률형 대신 보장형 복원

학생용 학습 서비스에서 발견물은 운이 나쁜 반복보다 “노력하면 완성되는 기록”이어야 한다. 따라서 항로마다 다음 순서로 **미발견 항목을 보장**한다.

```text
1번째 신규 발견: 일반
2번째 신규 발견: 희귀
3번째 신규 발견: 전설
3종 완성 뒤: 기존 발견물 재관측
```

처음 세 번의 원정이 반드시 연속일 필요는 없다. 다른 항로를 다녀와도 해당 항로의 미발견 순서가 이어진다. 서버는 출항 트랜잭션에서 `planet.roverDiscoveries`의 id를 기준으로 해당 항로의 첫 미발견 항목을 결정해 operation에 고정한다. 항로 3종을 모두 복원한 뒤에만 `operationId` 기반으로 기존 3종 중 하나를 재관측으로 고정한다.

이 규칙으로:

- `일반/희귀/전설`은 실제 진행 순서와 일치한다.
- 게스트도 9종 모두 획득할 수 있다.
- 피날레의 첫 목표는 세 항로에서 하나씩 발견하는 성취가 되고, 9종 도감 완성은 장기 성취가 된다.
- 중복은 실패가 아니라 `재관측`으로 정직하게 표시된다.

라이브 스토리의 `recover_pre_storm_discovery`는 `rover_claimed && isNewDiscovery`일 때만 완료한다. 기존 발견물을 다시 확인한 것으로 “첫 발견 복원”이 완료되면 안 된다. 단, 마이그레이션은 별도 규칙이다. 기존 `roverDiscoveries`에 고유 발견이 하나 이상 있으면 이미 달성한 증거로 복구하며 새 발견을 다시 요구하지 않는다.

`일반/희귀/전설`은 확률 등급이 아니라 복원 순서를 뜻하는 **기록 등급**이다. UI는 `기록 등급 · 희귀`처럼 표시해 확률형 보상으로 오해하지 않게 한다.

## 7. 화면 설계

관제 모달은 긴 한 페이지가 아니라 상태 화면과 기록 탭으로 구성한다.

```text
[현재 원정 상태]
[발견 도감] [원정 일지]
```

현재 원정 상태는 항상 상단에 고정한다. 원정 중에는 일지·도감은 탭으로만 열 수 있으며, 현재 행동을 가리는 긴 컬렉션을 기본 화면 아래에 붙이지 않는다.

### 공통 헤더

```text
LUMI ROVER CONTROL
루미 로버 원정 관제                         ● 출항 준비

현재 이야기
제2장 · 잃어버린 항로
폭풍 이전의 항로 기록을 되찾기 위해 루미를 장거리 항로로 보냅니다.
```

상태 표시는 버튼처럼 보이는 캡슐이 아니라 정보 인디케이터다. `이전 원정 수령 완료`, `EXPEDITION ARCHIVED`, `새 원정 예약`은 사용하지 않는다.

### 출항 준비

순서는 `현재 이야기 → 항로 선택 → 선택 항로의 예상 결과 → 적용 보너스 → 출항`이다.

```text
고대 정거장 항로
멈춘 정거장의 기억 장치를 복원해 사라진 항로의 기억을 읽습니다.

예상 회수: 수정 유리 4개
기본 2 + 원정대 비콘 1 + 정밀 제어 Lv.5 1
예상 귀환: 오늘 오후 5:40

[고대 정거장으로 출항]
```

정비소·비콘·능력은 화면 상단을 차지하는 독립 카드가 아니라 선택 결과의 산출 근거로 우선 보여준다. 시설이 없다면 짧은 “다음 원정 개선 방법”으로 보조한다.

### 원정 진행

항로 선택기는 완전히 숨긴다. 보여줄 것은 출항 당시 목적, 남은 시간, 출발·귀환 시각, 확정된 보너스와 관제 단계 보고다.

관제 단계 보고는 서버가 6시간 내내 가짜 로그를 쓰는 기능이 아니다. 출항 스냅샷과 진행률로 클라이언트가 결정적으로 만든다.

| 진행률 | 보고 |
| --- | --- |
| 0–10% | 출항 완료 · 항로 진입 |
| 10–35% | 원거리 신호 탐색 |
| 35–65% | 목표 지대 접근 및 분석 |
| 65–90% | 재료·기억 신호 회수 |
| 90–100% | 귀환 항로 진입 |

operationId를 시드로 문장만 변주하면 새로고침·다른 기기에서도 같은 기록이 보인다. 이를 `실시간 로그`라고 부르지 않는다.

### 귀환 완료

보상을 모두 미리 펼치거나 상자를 강조하지 않는다.

```text
루미가 고대 정거장에서 귀환했습니다.
수정 유리 회수 완료 · 미확인 발견 신호 1건

[귀환 보고서 열기]
```

주 행동은 하나다.

### 귀환 보고서

`REPORT`에서만 다음을 연결해 보여준다.

1. 원정 개요: 항로, 출발·귀환 시각, 총 소요 시간
2. 재료: 완전한 스냅샷이 있을 때만 `37 → 41`과 기본/비콘/능력 산출 근거
3. 발견: 신규 또는 재관측, 항로별 `1/3`, 전체 도감 `2/9`
4. 이야기: 출항 당시 임무와 이 원정이 실제로 완료한 스토리 단계·복원도 변화
5. 활용: 재료를 실제로 쓰는 시설과 현재 충족/부족 수량
6. 종료: `[원정 보고서 보관하기]`

구버전 원정처럼 전후 수량이 없으면 당시 수량을 역산하지 않는다. `당시 회수한 재료: 수정 유리 +4 · 현재 보유: 41개`처럼 보여주고 화살표와 신규/재관측 표현은 증거가 있을 때만 쓴다.

보고서 본문에는 사용처를 설명하되 주 행동은 `[원정 보고서 보관하기]` 하나만 둔다. 보관 성공 뒤에 `획득 재료 사용처 보기`와 `다음 원정 준비`를 선택하게 한다. 즉 사용처 보기 때문에 보고서가 미보관 상태로 남지 않는다. `수정 유리 사용처 보기`는 상위 `MetaGalaxy`의 `onOpenBuildForMaterial('crystalGlass')`로 연결한다. 관제 패널이 건설 카탈로그를 직접 해석하지 않는다. 상위가 현재 재료·광석으로 가장 가까운 시설을 계산하고 건설 메뉴를 해당 항목에 포커스한다.

### 원정 일지

매 수령 완료 원정을 하나씩 남긴다. 같은 발견물이 재관측되어도 일지는 남는다.

```text
제7차 루미 로버 원정 · 고대 정거장 항로
7월 30일 01:20 출항 → 07:20 귀환
수정 유리 +4 · 프리즘 기억핵 신규 발견
정비소 가속 · 원정대 비콘 · 정밀 제어 Lv.5
```

초기에는 최근 10건과 더보기만 제공한다. 필터·정렬·공유 기능은 이 단계에 넣지 않는다.

### 발견 도감

도감의 두 진행도를 명확히 분리한다.

```text
전체 발견 도감 2 / 9
현재 이야기: 세 항로의 발견 기록 복원 2 / 3
```

피날레의 첫 목표는 성운·혜성·고대 정거장에서 각각 하나 이상의 발견물을 복원하는 것이다. 같은 항로 3종만 모아 피날레로 넘어가지는 않는다. 각 항로에는 `성운 생태 기록 1/3`처럼 항로별 완성도를 보인다. 잠긴 카드는 정확한 순서 힌트만 준다. 예: `성운 생태 항로의 다음 미발견 신호`.

## 8. 회원·게스트 계약

게스트는 축소판이 아니라 가입 전 체험이다. 같은 관제 화면을 공유한다면 아래 결과도 같아야 한다.

| 계약 | 회원 | 게스트 |
| --- | --- | --- |
| 시간 | 기본 8시간 / 정비소 6시간 | 동일 |
| 보너스 | 비콘 +1, 관련 능력 Lv.4 이상 +1 | 동일 |
| 발견 | 항로별 1→2→3 보장형 | 동일 |
| 상태 | 단일 슬롯, 보고서 보관 전 출항 불가 | 동일 |
| 결과 | 신규/재관측, 전후 보유량, 산출 근거 | 동일 형식 |
| 일지 | 영구 operation 기반 | localStorage 최근 60건 |

게스트 출항에는 현재 `layout`, `abilitySnapshot`, `roverDiscoveries`, `roverStats`를 사용해 회원과 같은 `durationMs`, `reward`, `bonuses`, `discovery`, `storyContextAtLaunch`를 고정한다. 게스트 수령도 해당 스냅샷만 사용한다.

회원은 `roverHistory` 배열을 행성 문서에 저장하지 않는다. 회원의 이력 원본은 operation이고, `roverHistory`는 callable이 반환하는 읽기 전용 view model 이름으로만 사용한다. 게스트만 localStorage에 최근 60건의 `roverHistory`를 저장한다.

## 9. 구현 경계와 파일별 작업

### 9.1 서버 우선 작업

`functions/galaxyGame.js`

- `buildGalaxyRoverDeparture`에 보장형 발견 선택, `expeditionNo`, `storyContextAtLaunch`을 넣는다.
- `buildGalaxyRoverDeparture`은 서버 operation 안에 발견 결과를 고정하고, `getGalaxyRoverExpeditionView`/callable 응답은 active client view에서 이를 제거해 `discoveryPending`만 전달한다.
- `planGalaxyRoverStart`는 기능 플래그가 활성화된 뒤 슬롯이 존재하면 `claimed`도 포함해 시작을 차단한다. 같은 `operationId` 재시도만 예외다.
- `planGalaxyRoverClaim`은 `balanceBefore`, `balanceAfter`, `routeDiscoveryCount`, `totalDiscoveryCount`, `storyProgressAtClaim`을 만든다. 결과를 claimed 슬롯의 `result`로 보존한다.
- `acknowledgeGalaxyRoverReport` callable을 추가한다.
- 원정 번호와 통계를 `roverStats`에 트랜잭션으로 갱신한다.
- 기존 `claimGalaxyRoverExpedition`의 deduplicated 경로에서도 이전 `claimResult`와 claimed 슬롯의 결과를 그대로 반환한다.
- `recover_pre_storm_discovery` 이벤트에 `isNewDiscovery`를 넘기고, 라이브 이벤트와 레거시 증거 마이그레이션을 분리한다.
- 피날레의 발견 목표는 `uniqueDiscoveryCount >= 3`만 보지 않고 `discoveredRouteIds`가 세 항로를 모두 포함하는지 확인한다.

`functions/galaxyGame.rover.test.cjs`

- claimed·미보관 상태에서 새 출항 거부
- 보고서 보관 뒤 슬롯 비움과 새 출항 허용
- acknowledge 재시도 멱등성
- acknowledge의 `stale_operation`/`not_claimed`/`not_found` 분기
- 재료 전후 수량
- 항로별 1→2→3 보장형과 이후 재관측
- 새 발견만 라이브 스토리 진행 및 기존 발견의 migration 증거
- 세 항로 발견 목표

### 9.2 클라이언트 작업

`src/components/GalaxySocial/GalaxyRoverPanel.jsx`

- 하나의 긴 페이지를 `CurrentExpeditionView`, `HistoryView`, `DiscoveryCodexView`로 분리한다.
- `claimed`에서 항로 선택을 제거하고 `onAcknowledgeReport`를 받는다.
- 출항 준비/진행/귀환/보고서의 복사와 주 행동을 위 상태 모델에 맞춘다.
- 보고서에 전후 수량, 보너스, 신규·재관측, 두 진행도, 스토리 결과, 재료 사용처 동작을 넣는다.
- 발견물 카드에 최초 발견 원정과 항로 완성도를 표시한다.

`src/components/GalaxySocial/MetaGalaxy.jsx`

- `acknowledgeRoverReport` 액션을 추가해 member callable 또는 guest hook에 연결한다.
- 관제에 현재 전역 목표와 출항 스냅샷 목적을 각각 전달한다.
- `todayObjective`, 관측소 브리핑, 로버 버튼 라벨을 `REPORT`도 인식하게 바꾼다.
- 재료별 건설 메뉴 포커스 액션을 제공한다.
- 최근 원정 일지는 관제의 일지 탭을 처음 열 때만 가져온다.

`src/hooks/useGuestGalaxyData.js`

- 게스트 전용 `roverHistory`(최근 20건), `roverStats`, report acknowledge 상태를 migration-safe하게 정규화한다.
- 게스트 출항/수령을 회원 결과 스키마로 맞춘다.
- localStorage에는 최근 20개만 보관한다.

`src/utils/galaxyGame.js`, `src/utils/frontierStory.js`

- 항로 문구·발견물 상세 기록·관제 단계 보고 템플릿을 정리한다.
- `getGalaxyRoverPhase` 같은 화면 상태 helper를 추가한다.
- `recover_pre_storm_discovery`에 신규 발견 조건을 반영한다.

### 9.3 중복 설정 관리

프론트 ESM과 Cloud Functions CommonJS의 배포 경계가 달라 무리하게 한 런타임 모듈을 공유하지 않는다. 대신:

1. 서버가 권위 있는 보상·발견·시간 계산을 계속 담당한다.
2. `openGalaxyHome`은 공개 로버 카탈로그와 `roverCatalogVersion`을 함께 제공해 후속 UI 전환·원격 진단에 쓸 수 있게 한다. 현재 UI는 배포 경계를 단순하게 유지하기 위해 프론트 사본을 쓰되, 자동 계약 테스트로 서버와 값이 달라지면 실패한다. 진행 중 원정의 구체적 발견 결과는 이 공개 카탈로그와 별개로 숨긴다.
3. 게스트용 프론트 설정은 유지하되, 자동 계약 테스트가 서버와 route id·재료·기본 보상·기간·발견 순서를 비교한다.

이 방식은 보안 경계를 지키면서 설정 드리프트를 검출한다.

## 10. 원정 일지 조회와 접근 제어

원정은 이미 `users/{uid}/galaxyOperations`에 건설·업그레이드 operation과 섞여 저장된다. Firestore 규칙은 본인·관리자·연결 부모의 읽기를 허용한다.

초기 구현은 `listGalaxyRoverExpeditions` callable로 최근 10건을 정규화해 반환한다. 이유는:

- rover operation만 안정적으로 거른다.
- 구버전 문서를 읽기 모델로 정규화할 수 있다.
- 다음 페이지 cursor 계약을 한 곳에 둔다.
- 게스트와 동일한 `RoverHistoryEntry` view model을 제공한다.

이 callable은 원정 소유자만 조회하는 현재 관제 범위를 지킨다. 부모용 읽기 UI가 추가될 때는 별도 권한 정책을 설계한다.

## 11. 마이그레이션

| 기존 상태 | 배포 후 처리 |
| --- | --- |
| `exploring`/파생 `ready` | 그대로 유지한다. 새 코드가 기존 스냅샷의 fallback을 읽는다. |
| 기존 `claimed` 슬롯 (`reportFlowVersion` 없음/1) | 새 관제에서 귀환 결과를 확인·보관할 수 있다. 다만 구 탭이 열려 있어도 출항이 막혀 학습이 멈추지 않도록 서버는 기존 흐름을 호환한다. |
| 신규 `claimed` 슬롯 (`reportFlowVersion: 2`) | 새 귀환 보고서 흐름을 적용하며, 보관 전에는 다음 출항을 차단한다. |
| 과거 operation | 일지에는 날짜·항로·회수량 중심 fallback으로 보인다. 전후 수량과 신규 여부는 증거가 있을 때만 표시한다. 일괄 backfill은 하지 않는다. |
| 기존 `roverDiscoveries` | 고유 발견 목록으로 그대로 사용한다. 앞으로만 미발견 순서 보장을 적용한다. |
| 기존 게스트 데이터 | 누락된 history/stats/result는 안전한 기본값으로 추가한다. |

새 UI는 출항 요청에 `reportFlowVersion: 2`를 보낸다. 서버는 이 버전의 claimed 슬롯만 보관 전 출항 차단 대상으로 삼아, 배포 직후 열려 있던 구 탭이 행동 불능이 되는 일을 막는다. 과거 데이터를 현재 재료에서 역산하거나 신규·재관측을 추정하지 않는 것이 정직하고 안전하다. 기존 발견물이 있는 사용자는 migration 증거로 스토리 단계를 복구한다.

## 12. 구현 순서와 출시 순서

코드 작성 순서와 운영 배포 순서를 분리한다. 보고서 보관 버튼이 없는 구 UI에 서버 차단만 먼저 배포하면 학생에게 “출항 버튼이 보이는데 출항할 수 없는” 오류가 생긴다.

### Phase A — 하위 호환 서버 기반

1. 결과·스토리 스냅샷, balance 전후 수량, `acknowledgeGalaxyRoverReport`, history callable, catalog version, stats 필드를 추가한다.
2. 게스트 시간·보너스·발견 계약을 구현한다.
3. 구버전 데이터를 안전하게 정규화한다.
4. 신규 operation에는 `reportFlowVersion: 2`를 저장한다. 서버는 version 2 원정만 보관 전 출항을 차단하므로, 기존 UI 탭은 기존 version 1 흐름을 유지한다.

### Phase B — 새 관제 UI와 게스트 parity

1. 상태별 화면 분리와 개발자 문구 제거
2. 통일 용어·현재 이야기·출항 당시 임무 표시
3. 귀환 보고서와 재료 사용처 연결
4. 현재 원정·원정 일지·발견 도감 탭
5. 도감 `2/9`와 세 항로 스토리 목표 `2/3` 분리
6. 보고서 보관 동작과 게스트 결과 형식을 연결한다.

### Phase C — 새 규칙 강제

1. `ENFORCE_ROVER_REPORT_ACKNOWLEDGEMENT`를 **true**로 전환한다. Phase B가 충분히 배포된 뒤에만 적용한다.
2. `reportFlowVersion: 2`인 current slot이 존재하면 새 출항을 차단한다. 현재 구현은 새 UI와 같은 배포에 이 조건을 적용한다.
3. 보장형 발견, 신규 발견 스토리 조건, 배포 기준 시각 이전 claimed 자동 보관을 활성화한다.

### Phase D — 성취와 연출

1. 발견물 상세 기록과 최초 발견 원정
2. 항로별 3종 완성 배지/패스포트 표시
3. 결정적 관제 단계 보고
4. 귀환 보고서의 짧은 음향·시각 연출
5. 항로 완성 장면 및 패스포트 전시

새 규칙은 Phase B UI가 실제로 배포된 뒤에만 켠다. Phase A와 B에서 새 앱 화면의 정상 동작을 확인한 뒤 Phase C를 배포한다.

## 13. 테스트와 배포 게이트

테스트 파일을 만드는 것만으로는 충분하지 않다. 아래 실행 경로를 root `package.json`에 추가하고 CI 및 배포 전 검사에 연결한다.

```json
{
  "test:lumi-rover": "node functions/galaxyGame.rover.test.cjs && node functions/galaxyGame.story.test.cjs && node scripts/test-guest-galaxy-data.mjs && node scripts/test-lumi-rover-contract.mjs"
}
```

`test:lumi-rover`는 CI 필수 검사로 두고, production build 및 Firebase Functions 배포 전에도 실행한다. 계약 테스트는 route id, 재료 id, 기본 보상, 기본/정비소 시간, 능력 id, 발견물 id·순서, 결과 응답 스키마까지 비교한다.

## 14. 완료 판정

- 진행 중, 귀환 완료, 결과 확인 중에는 새 출항 카드와 버튼이 없다.
- 보고서 보관 뒤에만 현재 슬롯이 비워지고 새 출항이 가능하다.
- 새로고침·다른 기기에서도 같은 원정과 보고서가 보인다.
- 완전한 결과 스냅샷이 있을 때만 `수정 유리 +4 · 37 → 41`처럼 실제 전후 수량과 산출 근거를 보여준다.
- 신규 발견과 재관측을 다르게 말한다.
- 전체 도감 `2/9`와 세 항로 이야기 목표 `2/3`을 혼동시키지 않는다.
- 기록 등급 일반·희귀·전설은 항로별 보장형 복원 순서와 일치한다.
- 에테르 씨앗을 포함한 모든 발견물이 발견 도감에서 의미와 최초 발견 기록을 가진다.
- 출항 당시 스토리 목적이 진행·귀환·보고서에 계속 보인다.
- 회원과 게스트의 시간·보상·발견·상태·결과 형식이 같다.
- 진행 중 API 응답에는 구체적 발견 결과가 없고, 귀환 보고서에서 처음 공개된다.
- 기존 operationId 중복 방지와 보상 exact-once 테스트가 계속 통과한다.
- 관제 단계 보고 때문에 주기적인 서버 쓰기나 가짜 영구 로그가 생기지 않는다.

## 15. 학생이 느껴야 할 최종 경험

학생은 “6시간을 기다려 재료 4개를 받았다”고 느끼면 안 된다.

> 나는 지금 이야기에서 필요한 항로를 골라 루미를 보냈다.  
> 루미는 그 임무를 수행했고, 돌아와 내 행성을 만들 재료와 폭풍 이전의 기억을 가져왔다.  
> 그 결과는 내 발견 도감과 원정 일지에 남았고, 나는 다음 항로를 고를 준비가 됐다.

이 감각이 생길 때 루미 로버는 방치형 타이머가 아니라, 아스트라 프론티어에서 학생의 선택·기다림·성취를 이어 주는 장기 콘텐츠가 된다.
