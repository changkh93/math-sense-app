# 아스트라 프론티어 사운드 시스템 기획·설계

작성일: 2026-07-23

상태: 구현 전 설계안

대상: React 19 + React Three Fiber + Three.js + Howler 기반 아스트라 프론티어

## 1. 결론

첨부 제안의 제품 철학은 적합하다.

> 음악이 계속 감정을 밀어붙이는 게임이 아니라, 걷는 위치와 행동에 따라 행성 자체가 조용히 소리를 내는 세계를 만든다.

특히 다음 방향은 그대로 채택한다.

- 자연환경음이 음악보다 앞선다.
- 숲·강·착륙장처럼 장소마다 다른 소리층을 둔다.
- 발걸음, 상호작용, 충돌, 미션 결과를 소리로 확인시킨다.
- 실패·시간 경고·보상음을 공격적으로 만들지 않는다.
- 파일 경로가 아니라 `frontier.mission.complete` 같은 의미 ID로 호출한다.
- 거리, 재생 간격, 동시 재생 수, 페이드, 탭 숨김 상태를 중앙에서 관리한다.
- 음원 출처와 라이선스를 파일과 함께 관리한다.

다만 기술 구조와 1차 범위는 현재 코드에 맞게 수정해야 한다.

핵심 결정은 다음과 같다.

1. 별도의 Three.js 오디오 엔진을 만들지 않는다.
   - 앱에는 이미 Howler 기반 전역 `SoundManager`가 있고 27개 컴포넌트가 사용한다.
   - 기존 매니저를 하위 호환으로 확장해 UI 효과음과 프론티어 공간음을 같은 음소거·볼륨·브라우저 생명주기 아래 둔다.
   - Howler가 제공하는 3D `pos`, `orientation`, `pannerAttr`를 사용한다.

2. 프론티어 음원은 프론티어 진입 때만 지연 로드한다.
   - 현재 `SoundManager`는 import 시 바로 생성되고 기존 음원을 기본 선로딩한다.
   - 긴 자연음까지 같은 방식으로 등록하면 앱의 모든 화면에서 불필요한 다운로드와 디코딩이 일어난다.

3. 실제 게임 기능이 있는 곳에만 소리를 붙인다.
   - 현재 가능한 것: 걷기, 길·다리·착륙장, 이동 차단, 강 근접, 나무·생태 구역, 자원 수집, 시설 행동, 건설, 미션, 비동기 로버 원정.
   - 현재 없는 것: 점프, 얕은 물 보행, 직접 운전하는 로버, 실내 전환, 자동문, 낮·밤, 날씨.

4. 보상음은 서버 성공 이후에만 재생한다.
   - 미션, 건설, 일일 사건, 시설 행동, 로버 원정 결과는 Firebase callable 응답이 성공한 뒤 확정된다.
   - 다섯 번째 아이템에 닿은 순간 큰 성공음을 내면 서버 통신이 실패했을 때 잘못된 성공 피드백이 된다.

5. 1차 목표는 “많은 소리”가 아니라 “조용하지만 반응하는 세계”다.
   - 동시 환경 루프 최대 4개
   - 로컬 플레이어 발소리 1개
   - 단발 효과음 최대 8개
   - 메뉴·알림·보상보다 자연환경음을 기본 중심으로 둔다.

## 2. 현재 시스템과 첨부 제안의 차이

| 항목 | 첨부 제안 | 현재 시스템 | 결정 |
| --- | --- | --- | --- |
| 오디오 엔진 | `AudioManager` + Three `AudioListener`/`PositionalAudio` | Howler `SoundManager`가 전역 사용 중 | Howler 매니저 확장 |
| 전역 효과음 | 새로 설계하는 것으로 가정 | 클릭·정답·오답·광석·레벨업·워프가 이미 존재 | 기존 API 유지 |
| 발걸음 | 잔디·흙·금속·돌·물·실내 | 일반 지형·길·목재 다리·금속 착륙장, 테마 지형 6종 | 실제 표면 분류부터 구현 |
| 점프·착지 | 1차 후보 | 점프 동작 없음 | 제외 |
| 얕은 물 | 물속 발소리 | 강은 다리 외 진입 차단 | 제외 |
| 충돌 | 물리 강도별 | 다음 위치가 막히면 이동을 취소하는 방식 | 최초 막힘 + 재질 + cooldown |
| 로버 | 직접 주행 차량 | 6~8시간 비동기 원정용 고정 오브젝트 | 근접 hum, 출발, 귀환, 수령 |
| 낮·밤 | 시간대별 환경음 | 낮·밤 상태 없음 | 시각 시스템 도입 후 |
| 실내 | 실내 잔향 | 실내 전환 없음 | 제외 |
| 배경음악 | 선택적 음악 버스 | 실제 BGM 없음, 과거 지속 BGM도 제거됨 | 자연음 우선, 음악 UI도 보류 |
| 루프 길이 | 1~3분 | 모바일 Web Audio 메모리 고려 필요 | 20~45초 루프 + 불규칙 단발음 |
| 사용자 설정 | 5개 슬라이더 | 저장되는 사운드 설정 없음 | 1차는 프론티어/환경/효과·UI |
| 성공 판정 | 일반 이벤트 | 보상은 서버 권위 | 서버 성공 뒤 성공음 |

## 3. 제품 목표와 비목표

### 3.1 목표

- 학생이 강, 생태 구역, 착륙장, 길을 서로 다른 장소로 느낀다.
- 학생이 화면을 보지 않아도 걷는 표면과 행동 완료를 부드럽게 인지한다.
- 소리가 학습 후 휴식을 방해하지 않고 오래 들어도 피로가 낮다.
- 첫 진입, 탭 복귀, 메뉴 열기, 안전 귀환에서 소리가 튀거나 중복되지 않는다.
- 음소거 상태에서도 모든 기능과 안내가 완전하게 동작한다.
- 모바일·태블릿에서 오디오 때문에 프레임과 메모리가 크게 악화되지 않는다.

### 3.2 비목표

- 소리만으로 필수 정보를 전달하지 않는다.
- 치료, 정서 안정, 집중력 향상 같은 의학적 효과를 주장하지 않는다.
- 모든 나무·시설·친구가 각각 루프를 재생하게 만들지 않는다.
- 1차에서 전 행성용 음악 앨범이나 복잡한 실내 음향을 만들지 않는다.
- 음원 재생 시각이나 발소리를 서버에 매 프레임 전송하지 않는다.

## 4. 사운드 경험 설계

### 4.1 우선순위

동시에 여러 소리가 날 때의 중요도는 다음 순서를 따른다.

1. 현재 학생의 직접 행동
2. 안전 귀환과 시스템 상태
3. 서버에서 확정된 미션·건설·로버 결과
4. 가까운 강·생태 구역·착륙장
5. 현재 행성의 기본 환경음
6. 가까운 시설과 생명체의 장식성 단발음
7. 후속 단계의 원격 친구 소리

활성 음원이 한도를 넘으면 아래쪽 소리부터 생략한다.

### 4.2 기본 믹스

- 자연환경음: 항상 낮고 넓게
- 발걸음: 짧고 분명하지만 환경음을 덮지 않게
- 상호작용: 행동의 물성을 먼저, 보상음은 작게
- UI: 화면 조작을 확인할 정도만
- 미션 완료: 1~2초, 부드러운 상승과 짧은 잔향
- 오류·시간 종료: 낮고 중립적인 한 번의 신호
- 음악: 1차에는 없음

기본 볼륨 숫자는 최종 음원 마스터링 뒤 청취 테스트로 확정한다. 코드의 `0.5`가 체감 음량 50%를 뜻하지 않으므로, 숫자만으로 믹스를 결정하지 않는다.

### 4.3 여섯 행성 테마

현재 행성 테마를 사운드에도 반영하되, 모든 테마에서 끊임없이 강한 특징음을 재생하지 않는다.

| 테마 | 기본 환경 베드 | 드문 장식음 | 일반 지형 발소리 |
| --- | --- | --- | --- |
| `forest` 루멘 숲 | 부드러운 바람과 먼 잎결 | 작은 새·곤충·생명체 | 풀과 부드러운 흙 |
| `ocean` 심해 행성 | 습한 바람과 먼 수면의 울림 | 물새 또는 낮은 생명체 호출 | 젖은 흙·짧은 풀 |
| `crystal` 수정 협곡 | 얇은 협곡 바람 | 매우 드문 수정 공명 | 단단한 광물 가루 |
| `desert` 황혼 사막 | 건조한 넓은 바람 | 먼 모래 흩날림 | 모래 |
| `mechanical` 기계 도시 | 바람 + 아주 낮은 기반 진동 | 드문 전력 신호 | 금속 가루·단단한 지면 |
| `ice` 빙하 천문대 | 부드러운 극지 바람 | 먼 얼음 갈라짐 | 눈·얼음 |

테마 특징음은 위치와 행동을 설명하는 강·착륙장·발소리보다 낮게 유지한다.

### 4.4 조용한 순간

“힐링”은 모든 장소를 소리로 채우는 것이 아니다.

- 북쪽 산지와 월드 가장자리는 테마 환경음만 남긴다.
- 미션 결과음이 끝난 직후 1~2초 동안 새·생명체 랜덤음을 억제한다.
- 안전 귀환 1분 전에도 반복 경보를 사용하지 않는다.
- 메뉴가 열리면 환경음을 약 6dB 낮추고 발소리와 충돌음은 중지한다.

## 5. 권장 기술 구조

```text
SpaceHome
├─ 탐험 시작 클릭 시 audio unlock/resume
└─ 프론티어 세션 enter/exit

SoundManager (기존 facade 유지)
├─ 기존 playClick/playCorrect/playWrong/... API
├─ 의미 기반 Sound Registry
├─ 논리 볼륨 그룹
│  ├─ feedback
│  ├─ ui
│  ├─ frontierAmbience
│  ├─ frontierSfx
│  └─ social (후속)
├─ 프론티어 scope lazy load/unload
├─ cooldown / shuffle / voice limit / priority
├─ play / playAt / loopAt / updateSource / fade / stop
└─ unlock / visibility / scene lifecycle

MetaGalaxy · FrontierAudioDirector
├─ 테마와 overlay 상태
├─ 서버 성공 후 의미 이벤트
├─ 행성·방문 대상 교체
└─ 설정 UI

GalaxyWorld3D · FrontierAudioBridge
├─ 플레이어 위치 + 카메라 방향 → Howler listener
├─ 실제 이동 거리 → 발걸음
├─ 이동 차단의 최초 전이 → 충돌
├─ 강·생태·착륙장 거리 → 환경 mix
└─ 수집 접촉 → 로컬 단발음
```

### 5.1 왜 1차 후보가 Howler 단일 엔진인가

Three `PositionalAudio`를 영구적으로 배제하는 결정은 아니다. 1차 후보를 Howler로 두고 Phase 0 결과로 확정한다.

- 현재 앱의 효과음 27개 사용처가 이미 Howler의 mute, volume, unlock 생명주기를 공유한다.
- Howler 2.2.4의 spatial plugin과 Three `PositionalAudio`는 모두 브라우저 Web Audio의 `PannerNode`를 사용한다. 따라서 Three라는 이름만으로 HRTF 품질이나 모바일 성능이 자동으로 좋아지지는 않는다.
- Howler는 listener의 `pos(x,y,z)`와 `orientation(forward,up)`을 별도로 제공하므로 “위치는 플레이어, 방향은 카메라” 표현이 API상 가능하다.
- Three를 독립적으로 추가하면 별도 AudioContext, master mute, 탭 숨김, unlock, cleanup 경로가 생길 수 있다.

다만 API상 가능하다는 것과 실제 3인칭 체감이 자연스럽다는 것은 다르다. Phase 0에서 다음 분기를 사용한다.

| spike 결과 | 결정 |
| --- | --- |
| 방향감·거리감·모바일 성능·생명주기 모두 통과 | Howler 단일 엔진 확정 |
| HRTF 방향감만 과하거나 불안정하고 수동 거리 계산은 안정적 | Howler 안에서 `StereoPanner` 또는 중앙 재생 + JavaScript 거리 감쇠로 단순화 |
| Howler wrapper의 갱신·노드 관리만 실패하고 native Web Audio 기준 구현은 통과 | 공유 AudioContext 기반 adapter 또는 Three 병행을 ADR로 재검토 |
| native `PannerNode` 자체가 목표 기기에서 성능·품질 기준 미달 | Three로 교체하지 않고 공간 loop 수 축소 또는 비공간 구역 mix로 전환 |

대안을 검토하더라도 다음 조건은 지킨다.

- AudioContext는 가능하면 하나만 소유한다.
- 기존 `Howler.mute()`와 프론티어 master mute가 함께 동작한다.
- unlock, visibility, scene exit의 최종 소유자는 `SoundManager` 하나다.
- shared-context node는 unlock 완료와 `Howler.ctx.state === 'running'` 뒤에 만들고, context identity가 바뀌면 모두 rebuild한다.
- 두 엔진을 병행한다면 선택 이유와 제거 조건을 ADR로 남긴다.

즉 §5의 구조는 “Howler 확정안”이 아니라 가장 작은 1차 후보이며, Phase 0은 형식적인 확인이 아니라 아키텍처 결정 게이트다.

### 5.2 실제 버스 대신 1차 논리 버스

Howler 내부 Web Audio 노드를 직접 재배선하지 않는다. 1차는 다음 계산으로 충분하다.

```text
실제 instance volume
= soundDefinition.baseVolume
× busVolume
× 호출별 volume
```

전체 프론티어 음소거는 scope 또는 관련 bus를 0으로 만들고, 앱 전체 효과음 음소거가 필요할 때만 기존 `Howler.mute()`를 사용한다.

학습 영상은 별도 `<video>` 음량 설정을 사용하므로 프론티어 설정의 “전체”라는 표현을 쓰지 않는다. UI 명칭은 “프론티어 소리”로 한다.

## 6. 파일 구조

기존 import 경로를 깨지 않기 위해 `src/utils/SoundManager.js`는 facade로 유지한다.

```text
src/
├─ audio/
│  ├─ soundRegistry.js
│  ├─ audioPreferences.js
│  ├─ frontierSoundCatalog.js
│  └─ frontierAudioMath.js
├─ utils/
│  └─ SoundManager.js
└─ components/GalaxySocial/
   ├─ FrontierAudioBridge.jsx
   ├─ FrontierAudioSettings.jsx
   ├─ GalaxyTerrainModel.js
   ├─ GalaxyWorld3D.jsx
   └─ MetaGalaxy.jsx

public/sounds/frontier/v1/
├─ ambience/
│  ├─ themes/
│  ├─ river/
│  ├─ ecology/
│  └─ landing/
├─ footsteps/
├─ collisions/
├─ interactions/
├─ missions/
├─ rover/
└─ ui/

docs/audio/
└─ FRONTIER_AUDIO_ASSETS.md
```

배포 파일 경로에 `v1`을 둔다. 음원을 교체할 때 `v2` 또는 content hash를 사용해 Firebase Hosting과 브라우저 캐시가 예전 파일을 계속 쓰는 문제를 막는다.

## 7. 의미 기반 카탈로그

JavaScript 코드베이스이므로 TypeScript 도입 없이 JSDoc으로 형태를 고정한다.

```js
export const FRONTIER_SOUNDS = {
  'frontier.ambience.river': {
    sources: [
      '/sounds/frontier/v1/ambience/river/river-loop.webm',
      '/sounds/frontier/v1/ambience/river/river-loop.mp3',
    ],
    scope: 'frontier',
    bus: 'frontierAmbience',
    kind: 'loop',
    spatial: true,
    baseVolume: 0.32,
    priority: 40,
    maxInstances: 1,
    panner: {
      distanceModel: 'linear',
      refDistance: 1.5,
      maxDistance: 11,
      rolloffFactor: 1,
      panningModel: 'HRTF',
    },
  },

  'frontier.footstep.path': {
    variants: [
      ['/sounds/frontier/v1/footsteps/path-01.webm', '/sounds/frontier/v1/footsteps/path-01.mp3'],
      ['/sounds/frontier/v1/footsteps/path-02.webm', '/sounds/frontier/v1/footsteps/path-02.mp3'],
      ['/sounds/frontier/v1/footsteps/path-03.webm', '/sounds/frontier/v1/footsteps/path-03.mp3'],
    ],
    scope: 'frontier',
    bus: 'frontierSfx',
    kind: 'oneshot',
    spatial: false,
    baseVolume: 0.38,
    cooldownMs: 90,
    maxInstances: 2,
    priority: 90,
    rateRange: [0.97, 1.03],
    selection: 'shuffle-no-repeat',
  },

  'frontier.mission.complete': {
    sources: [
      '/sounds/frontier/v1/missions/mission-complete.webm',
      '/sounds/frontier/v1/missions/mission-complete.mp3',
    ],
    scope: 'frontier',
    bus: 'frontierSfx',
    kind: 'oneshot',
    spatial: false,
    baseVolume: 0.52,
    cooldownMs: 1500,
    maxInstances: 1,
    priority: 100,
  },
}
```

`sources`는 같은 음원의 브라우저 포맷 fallback이고, `variants`는 반복감을 줄이는 서로 다른 연주다. 두 개념을 섞지 않는다.

### 7.1 권장 API

```js
soundManager.unlock()

await soundManager.enterScope('frontier', {
  theme: planet.theme,
})

soundManager.play('frontier.pickup.collect')

const riverLoop = soundManager.loopAt(
  'frontier.ambience.river',
  [x, y, z],
  { key: 'frontier:river' },
)

soundManager.updateSource(riverLoop, {
  position: [nextX, nextY, nextZ],
  volume: riverMix,
})

soundManager.setListenerTransform({
  position: playerPosition,
  forward: cameraForward,
  up: cameraUp,
})

soundManager.setBusVolume('frontierAmbience', 0.55)
soundManager.duck('frontier-overlay', {
  frontierAmbience: 0.5,
  frontierSfx: 0,
})

soundManager.exitScope('frontier', {
  fadeOutMs: 900,
  unload: true,
})
```

`enterScope`, `loopAt`, `exitScope`는 idempotent해야 한다. React `StrictMode`의 개발용 effect 재실행과 빠른 화면 왕복에서도 같은 key의 루프가 두 개 생기면 안 된다.

### 7.2 누락·손상 음원의 graceful fallback

현재 `SoundManager`는 `onloaderror`에서 경고만 남기고 실패한 `Howl`을 등록 상태로 유지한다. 확장 구현에서는 오류를 정상 상태의 하나로 취급한다.

```text
UNLOADED
  └─ ensureLoaded → LOADING

LOADING
  ├─ onload → READY
  ├─ 파일 후보가 남음 → 다음 후보로 LOADING
  ├─ offline → WAITING_ONLINE
  ├─ 일시 오류이고 retry < 2 → RETRY_WAIT → LOADING
  └─ 후보·재시도 소진 → DISABLED_SESSION

WAITING_ONLINE
  └─ 전역 online 이벤트 → 한 번만 재시도

DISABLED_SESSION
  └─ 명시적 다시 불러오기 또는 페이지 reload → UNLOADED
```

Howler의 `sources` 배열은 지원 codec 중 첫 파일을 고르는 용도이지, 선택된 URL의 404 뒤에 자동으로 다음 URL을 시도한다는 보장이 아니다. loader가 호환 가능한 후보 목록과 현재 index를 직접 관리한다.

구현 규칙:

- 같은 ID가 `LOADING`이면 기존 Promise를 반환하고 `Howl`을 중복 생성하지 않는다.
- 404, 지원 불가, decode 실패는 다음 파일 후보로 이동한다.
- 일시 네트워크 오류는 1.5초, 4초 정도의 제한된 backoff와 jitter만 사용한다.
- `onplayerror`의 autoplay lock은 자산 실패로 분류하지 않는다. unlock 뒤 최초 요청만 한 번 재시도한다.
- 최종 실패 시 해당 `Howl`을 `unload()`하고 active·queued handle을 제거한다.
- unload된 구세대 instance의 늦은 callback은 generation token으로 무시한다.
- 자산 실패가 게임 action, 서버 결과, 화면 전환 Promise를 reject하거나 지연시키면 안 된다.

fallback은 두 단계다.

1. 같은 의미 ID의 WebM/MP3 또는 승인된 대체 파일
2. `fallbackId`가 지정된 핵심 단발음

권장 의미 fallback:

| 실패 ID | 대체 | 비고 |
| --- | --- | --- |
| 미션·대형 보상 완료 | 기존 `levelUp` | 낮은 호출 volume |
| 조각·재료 수집 | 기존 `crystal` | 기존 제품 의미와 일치 |
| UI 선택 | 기존 `click` | 기존 API 재사용 |
| 입장·귀환 | 기존 `warp` 또는 `whoosh` | 상황별 한 단계만 |
| 환경 loop·발걸음·충돌 | 무음 | 잘못된 물성을 들려주지 않음 |

fallback chain은 순환 방지 `visited` 집합과 최대 깊이 2를 사용한다. 새 API는 실패 시 예외 대신 `{ played: false, reason: 'asset-disabled' }` 형태의 결과 또는 안전한 no-op handle을 반환한다. 기존 `playClick()` 등의 반환 형식은 바꾸지 않는다.

운영 규칙:

- terminal 경고는 `manifestVersion:soundId:errorClass`별 한 번만 남긴다.
- 이후 `play()`마다 같은 경고나 네트워크 요청을 반복하지 않는다.
- 사용자에게 개별 오류 toast를 띄우지 않는다. 설정 패널에서만 “일부 환경음을 불러오지 못함 · 다시 시도”를 집계형으로 표시한다.
- telemetry에는 ID, category, error class, 시도 횟수, fallback 성공 여부만 남기고 URL query나 UID는 넣지 않는다.
- 실패 상태는 localStorage에 저장하지 않는다. 다음 배포에서 고친 파일이 계속 비활성화되는 것을 막는다.
- 개발·배포 전 catalog 검사에서 선언 경로 존재, 0 byte, fallback cycle, 필수 license 상태를 먼저 잡는다.

## 8. 브라우저 진입과 생명주기

### 8.1 첫 unlock

현재 진입 흐름은 다음과 같다.

```text
학생이 [탐험 시작] 클릭
→ startGalaxyEntry()
→ await galaxyPlay.startSession()
→ 프론티어 화면 전환
```

`soundManager.unlock()`은 `await` 이후가 아니라 클릭 handler가 시작되는 즉시 호출한다.

```js
const startGalaxyEntry = useCallback(async () => {
  soundManager.unlock()
  const playSession = await galaxyPlay.startSession()
  if (!playSession) return
  // ...
}, [galaxyPlay, switchRootView])
```

별도의 “소리를 허용할까요?” 팝업은 만들지 않는다. 탐험 시작 버튼이 이미 명확한 사용자 동작이다.

### 8.2 scene enter

- `MetaGalaxy`가 유효한 `home`과 `planet.theme`을 얻은 뒤 `enterScope('frontier')`
- 필수 pack만 로드
  - 현재 테마의 기본 환경음
  - 강
  - 착륙장
  - 현재 표면 발소리 또는 공통 핵심 발소리
- 새·생명체·희귀 보상음은 첫 필요 시 로드
- 도착 브리핑이 열려 있으면 낮은 음량으로 시작

### 8.3 overlay

현재 `menu`, `arrivalOpen`, `objectDialogOpen`은 월드를 `paused`로 만든다.

- 발걸음과 충돌음 즉시 중지
- 환경음은 중지하지 않고 약 6dB duck
- UI와 서버 결과음은 허용
- overlay를 닫을 때 400~700ms로 원래 환경음 복귀

### 8.4 탭 숨김과 복귀

- `document.hidden` 또는 `pagehide`
  - 프론티어 루프 pause
  - 랜덤 새·생명체 timer 취소
  - pending fade 정리
- 다시 visible
  - 사용자가 음소거하지 않았고 세션이 살아 있을 때만 resume
  - 500~1000ms fade-in
  - 숨김 시간 동안 밀린 단발음을 한꺼번에 재생하지 않음

### 8.5 안전 귀환과 unmount

- 수동 귀환, 시간 종료, idle 종료 모두 같은 `exitScope` 사용
- 모든 프론티어 loop를 600~1200ms fade-out
- fade 뒤 stop
- 프론티어 scope의 timer와 source handle 정리
- 메타센스 기존 UI 효과음은 계속 사용 가능

## 9. listener와 공간음

### 9.1 listener 위치와 방향

3인칭 카메라는 플레이어에게서 떨어져 있으므로 카메라 위치를 거리 계산에 그대로 쓰면 카메라 zoom과 회전에 따라 강 소리 크기가 크게 바뀐다.

따라서 다음처럼 분리한다.

- listener 위치: 플레이어 머리 위치
- listener 방향: 현재 카메라 forward/up
- 구역 진입·거리 mix: 플레이어 위치

이 방식이면 강까지의 체감 거리는 플레이어 기준으로 안정되고, 화면 왼쪽·오른쪽 방향감은 카메라 방향과 일치한다.

Howler 2.2.4는 전역 listener의 위치와 `forward/up`을 독립된 Web Audio listener 값으로 기록하므로 이 분리가 가능하다. 다만 구현 시 다음을 지킨다.

- `forward`: 카메라 world quaternion에 `(0, 0, -1)`을 적용하고 normalize
- `up`: 같은 quaternion에 `(0, 1, 0)`을 적용하고 normalize
- `camera.up` 상수만 넘기지 않음
- 두 벡터가 직교하는지 개발 환경에서 검증
- 같은 `Howl`의 여러 voice를 공간 배치할 때 반드시 재생 instance ID를 `pos(..., id)`에 전달
- Web Audio가 아닌 HTML5 Audio fallback에서는 spatial API가 no-op일 수 있으므로 비공간 거리 mix를 유지

Howler의 listener setter는 현재 값에 약 0.1초 time constant의 smoothing을 사용한다. 급격한 카메라 회전에서 방향 추종이 늦게 느껴질 수 있으므로 Phase 0에서 측정한다. 이것만 실패하면 엔진 전체 교체보다 listener AudioParam 갱신을 담당하는 작은 shared-context adapter를 먼저 검토한다.

listener transform은 React state로 매 프레임 올리지 않는다. `Astronaut`와 같은 R3F `useFrame` 경로에서 ref를 사용하고 우선 15~20Hz로 제한하되, 회전 지연 청취 결과에 따라 갱신 빈도와 smoothing을 함께 조정한다.

### 9.2 공간감 줄이기

1차 필수는 아니지만 접근성 후속 옵션으로 둔다.

- 좌우 HRTF 대신 중앙 재생
- 거리에 따른 음량은 JavaScript로 유지
- 기능명은 “모노”보다 “공간 방향감 줄이기”가 정확하다.

`prefers-reduced-motion`을 자동 음소거 신호로 사용하지 않는다.

## 10. 월드 환경음 모델

### 10.1 기본 테마 환경음

- 항상 1개
- 비공간 또는 아주 넓은 stereo
- 현재 행성 테마가 바뀌면 1.2~2초 crossfade
- 반복이 들리지 않도록 20~45초 seamless loop와 낮은 확률의 단발음을 조합

### 10.2 강

현재 강은 `riverCenterZ(x)`로 절차적으로 정의되어 있다. 고정 점음원 5개를 동시에 재생하기보다 플레이어에 가장 가까운 가상 음원 1개를 둔다.

```js
function getRiverAudioPoint(playerX) {
  const x = clamp(playerX, -19.5, 19.5)
  return [x, 0.05, riverCenterZ(x)]
}
```

- 플레이어와 강의 거리가 약 11 world unit 밖이면 정지 또는 완전 fade
- 약 7~11 unit: 희미하게
- 약 3~7 unit: 방향이 느껴짐
- 다리 위: 가장 풍부하지만 다른 효과음을 덮지 않음
- 강은 진입 불가이므로 물속 발소리를 재생하지 않음

정확한 가장 가까운 곡선점을 구할 필요가 생기면 x 주변을 짧게 샘플링하는 pure function으로 확장한다.

### 10.3 생태 구역

현재 생태 구역은 `WORLD_ZONES.ecology = [6.8, -6.2]`이고, 인근에 `fiber_grove`, `wild_soil`, 생명체 두 마리가 있다.

- 중심 `[6.8, -6.2]`
- 기본 반경 약 5~6 world unit
- `forest`: 잎결 + 새·곤충
- `ocean`: 습한 식생 + 드문 수생 생명체
- 나머지 테마: 테마에 맞는 조용한 생태 texture 또는 기본 환경음만
- 새·생명체는 loop가 아니라 8~25초 범위의 불규칙 one-shot
- 미션 완료·시간 경고 직후에는 최소 2초 억제

### 10.4 착륙장과 로버

- 착륙장 중심: `[0, 5]`
- 로버: `[-1.45, 4.85]`
- 약 6~7 unit 안에서 낮은 전력장 hum
- 가장 가까운 곳에서도 말소리나 UI를 덮지 않게 제한
- 로버 상태가 `active`여도 고정 오브젝트가 주행하는 것처럼 연속 모터음을 내지 않음
- 로버 관제 근접 시 낮은 전자 pulse는 가능

### 10.5 동적 시설

1차 안정화 뒤 다음 `itemId`에만 특수 음원을 허용한다.

- `crystal_pond`: 가까운 작은 물소리
- `lumen_tree`: 가까운 잎결
- `rover_bay`: 낮은 기계음
- `friend_greenhouse`: 매우 약한 환기·물방울
- `expedition_beacon`: 드문 신호 pulse
- `route_gateway`: 낮은 에너지장

모든 동적 시설이 loop를 갖지 않는다. 플레이어와 가장 가까운 특수 시설 최대 1개만 활성화한다.

## 11. 발걸음과 표면 판정

### 11.1 공용 표면 함수

현재 길 근접 판정은 `GalaxyTerrain3D.jsx` 내부 함수이고, 강·다리·길 데이터는 `GalaxyTerrainModel.js`에 있다. 렌더와 소리의 판정이 달라지지 않도록 다음 pure function을 `GalaxyTerrainModel.js`에 둔다.

```js
export function getWalkSurface(x, z, theme) {
  if (isLandingPad(x, z)) return 'landingMetal'
  if (isBridgeDeck(x, z)) return 'bridgeWood'
  if (isRoadSurface(x, z)) return 'path'
  return `terrain.${normalizeTheme(theme)}`
}
```

우선순위가 중요하다.

1. 금속 착륙장
2. 목재 다리
3. 길
4. 현재 테마의 일반 지형

테마 일반 지형은 여섯 종류의 sound profile로 매핑한다.

### 11.2 실제 변위 기반 발걸음

현재 `locomoting`은 입력 여부로 계산되므로 벽을 밀 때도 true다. 여기에 소리를 바로 연결하면 실제로 움직이지 않는데 계속 발소리가 난다.

발걸음은 승인된 실제 변위를 누적해 재생한다.

```text
프레임 시작 위치 저장
→ 이동 승인 뒤 실제 위치 계산
→ movedDistance 누적
→ 누적 거리가 strideDistance를 넘으면 한 걸음 재생
→ 남은 거리 보존
```

- `PLAYER_SPEED = 6`과 현재 보행 animation을 기준으로 초기 `strideDistance`는 약 1.2~1.4 world unit에서 튜닝
- 방향키를 누른 시간이나 고정 `setInterval`을 사용하지 않음
- 로컬 플레이어 발소리는 화면 중앙의 비공간음으로 시작
- 표면이 바뀌면 다음 걸음부터 새 표면 사용
- 동일 sample이 연속되지 않게 3개 이상 변형을 shuffle

### 11.3 표면별 1차 범위

- `terrain.forest`
- `terrain.ocean`
- `terrain.crystal`
- `terrain.desert`
- `terrain.mechanical`
- `terrain.ice`
- `path`
- `bridgeWood`
- `landingMetal`

각 표면 3개 변형으로 시작하고, 청취 테스트에서 반복감이 큰 표면만 4~6개로 늘린다.

## 12. 충돌음

현재 충돌은 물리 impulse가 아니라 이동 거절이다. 따라서 “충돌 강도”라는 값을 만들지 않는다.

### 12.1 1차 규칙

- 이전 프레임에는 이동 가능했고 이번 프레임에 처음 막힌 순간 1회
- 같은 장애물에 계속 입력 중이면 반복 재생하지 않음
- 입력을 놓거나 막힘에서 벗어난 뒤 다시 부딪히면 재생 가능
- 안전망으로 동일 충돌 key에 500~700ms cooldown
- 월드 경계와 급경사는 기본적으로 무음 또는 아주 작은 중립음
- 강둑은 물속 발소리가 아니라 낮은 둑 접촉음

### 12.2 typed collider

현재 일부 blocker는 좌표 배열만 있어 재질 정보가 사라진다. 다음 형태로 통합한다.

```js
{
  id: 'landing_rover',
  position: [-1.45, 0.25, 4.85],
  radius: 1.05,
  acousticMaterial: 'metal',
}
```

1차 재질:

- `metal`
- `wood`
- `stone`
- `soft`

분류할 수 없으면 `soft`의 우주복 “툭”을 사용한다. 큰 저음이나 화면 진동은 사용하지 않는다.

## 13. 이벤트 연결표

| 의미 이벤트 | 실제 코드 지점 | 재생 시점 | 서버 확정 필요 |
| --- | --- | --- | --- |
| `frontier.entry` | `SpaceHome.startGalaxyEntry` | 세션 성공 후 화면 전환 | 예 |
| `frontier.footstep.*` | `GalaxyWorld3D.Astronaut` 이동 승인 | 실제 이동 거리 누적 | 아니오 |
| `frontier.collision.*` | `Astronaut` 이동 거절 | 최초 막힘 전이 | 아니오 |
| `frontier.nearby.enter` | `onNearbyChange` signature 변경 | 대상이 처음 가까워짐 | 아니오 |
| `frontier.pickup.collect` | pickup `collectLock` 직후 | 각 조각에 닿음 | 아니오 |
| `frontier.mission.start` | `startMission` | 로컬 시작 조건 통과 | 아니오 |
| `frontier.mission.timeout` | 45초 timer 종료 | 한 번 | 아니오 |
| `frontier.mission.complete` | `requestMissionCompletion` | `onMissionComplete` 성공 반환 뒤 | 예 |
| `frontier.interaction.water` | 월드·시설 행동 | 행동 요청 시 작은 물성음 | 아니오 |
| `frontier.interaction.confirm` | `runAction` 결과 | 성공 응답 뒤 | 예 |
| `frontier.daily.complete` | `completeDailyEvent` | `result.dailyEvent` 확인 뒤 | 예 |
| `frontier.build.invalid` | `onInvalidBuild` | 유효하지 않은 위치 클릭 | 아니오 |
| `frontier.build.complete` | `buildItemAt` | `result.placed` 성공 뒤 | 예 |
| `frontier.rover.dispatch` | `dispatchRover` | `result.expedition` 성공 뒤 | 예 |
| `frontier.rover.ready` | 로버 상태가 `active → ready` | 세션 중 최초 전이 1회 | 서버 상태 |
| `frontier.rover.claim` | `claimRover` | `result.claimResult` 성공 뒤 | 예 |
| `frontier.timer.5m` | `warningStage` | stage 진입 시 한 번 | 아니오 |
| `frontier.timer.2m` | `warningStage` | stage 진입 시 한 번 | 아니오 |
| `frontier.timer.1m` | `warningStage` | 아주 작은 한 번 또는 무음 | 아니오 |
| `frontier.connection.softError` | mission/action catch | 한 번, 중립적 | 실패 |
| `frontier.exit` | session 종료 | loop fade-out | 예/로컬 |

### 13.1 `runAction` 확장

문자열 key를 분석해 소리를 추측하지 않는다. optional metadata를 명시적으로 받는다.

```js
await runAction(
  `build:${itemId}`,
  () => callGalaxy('buildGalaxyItem', payload),
  successMessage,
  {
    successSound: 'frontier.build.complete',
    errorSound: 'frontier.connection.softError',
  },
)
```

작은 물주기와 대형 미션 완료를 같은 성공음으로 만들지 않는다.

## 14. 설정 UI와 저장

### 14.1 1차 UI

프론티어 상단 HUD에 speaker 버튼을 둔다.

```text
프론티어 소리        켜짐 / 꺼짐
자연·환경음          ─────●──
행동·발걸음          ────●───
알림·UI              ───●────

[조용한 모드]
[기본값으로 되돌리기]
```

- 음악 slider는 실제 음악 기능이 생길 때만 추가
- 학습 영상 음량과 별개라는 설명을 짧게 표시
- 버튼은 `role="switch"`와 명확한 label 제공
- 슬라이더를 움직이는 동안 서버에 쓰지 않음

### 14.2 조용한 모드

- 환경음은 유지
- 발소리는 낮춤
- 충돌·UI·보상음을 크게 낮춤
- 미션 결과와 시간 안내의 시각·텍스트는 그대로 유지

### 14.3 저장

1차는 user-scoped localStorage를 사용한다.

```js
{
  version: 1,
  enabled: true,
  ambience: 0.55,
  action: 0.65,
  ui: 0.45,
  quietMode: false,
  reducedSpatial: false
}
```

키 예시:

```text
metasense_audio_preferences_v1_{uid}
```

장점:

- slider 변경 때 Firestore 쓰기가 발생하지 않는다.
- 활성 UID의 key만 읽으면 교실 공용 기기에서도 다른 학생 설정이 적용되지 않는다.
- 오프라인에서도 즉시 적용된다.

UID가 key에 포함되어도 이전 사용자의 값이 기기에 남는다는 사실은 별도 문제다. 다음 정책을 명시한다.

- `uid A → uid B` 전환 순간 manager를 기본값으로 먼저 reset한 뒤 B의 key를 읽는다. A의 설정을 잠시라도 B에게 적용하지 않는다.
- 익명 crew guest는 localStorage가 아니라 sessionStorage를 사용하고 게스트 종료 시 삭제한다.
- 계정 삭제 시 해당 UID의 audio key를 삭제한다.
- “이 공용 기기의 저장된 사운드 설정 지우기” 동작을 제공한다.
- local-only MVP에서는 일반 로그아웃 뒤 설정을 최대 30일 보존한다. 음량·접근성 선호를 매번 잃지 않기 위한 선택이며, 최대 저장 UID 수를 제한한다.
- 만료된 key는 `storageUtils.cleanExpiredLocalStorage()`의 audio 규칙으로 정리한다.
- zone, 재생 기록, 오류 상태, source URL은 저장하지 않는다.

로그아웃 경로가 `SpaceNavbar`, `SpaceHome`, `useAuth` 등에 분산되어 있으므로 각 버튼에서 직접 정리하지 않는다. 앱 최상위의 단일 `AudioSessionBoundary`가 auth UID 변화를 감시해 scene stop, loop unload, bus reset, user binding을 idempotent하게 처리한다.

계정 간 동기화가 필요해지면 `users/{uid}.audioPreferences`를 원본으로 두고 localStorage는 빠른 cache로만 사용한다. 이때는 일반 로그아웃과 UID 전환 시 cache를 지워도 다음 로그인에서 복원되므로 자동 purge로 정책을 바꾼다. drag 종료 뒤 debounce 저장하고, 서버 값보다 현재 기기에서 명시적으로 누른 즉시 음소거를 우선하는 병합 규칙이 필요하다.

## 15. 음원 제작 규격

### 15.1 포맷

- 원본 보관: WAV, 24bit
- 런타임 기본: Opus(WebM) 또는 지원되는 Opus 컨테이너
- Safari 등 fallback: MP3
- 위치 음향: mono
- 전역 환경 베드: 필요할 때만 stereo
- 샘플레이트: 44.1kHz 또는 48kHz 중 프로젝트 전체를 한 기준으로 통일

Howler `sources`에는 같은 음원의 포맷 fallback을 순서대로 둔다.

### 15.2 길이

- 테마 환경 loop: 25~45초
- 강·잎·착륙장 loop: 20~35초
- 새·생명체: 0.5~3초 단발
- 발걸음: 0.12~0.45초
- 상호작용: 0.15~1초
- 미션 완료: 1~2초
- 큰 시설 완공: 필요 시 2~3초

1~3분 stereo loop는 Web Audio가 압축 파일을 메모리에 디코딩할 때 모바일 부담이 커질 수 있다. 긴 반복감을 숨기기 위해 파일을 길게만 만들지 말고 짧은 seamless bed와 낮은 확률의 단발음을 조합한다.

### 15.3 마스터링

- 갑작스러운 고역과 과한 저역을 피한다.
- 모든 파일 시작·끝의 click을 제거한다.
- loop 이음새에서 위상과 배경 noise가 튀지 않게 한다.
- 실제 앱 bus 설정에서 여러 소리가 겹쳐도 clipping이 없어야 한다.
- 작은 스마트폰 speaker와 이어폰 양쪽에서 확인한다.
- 자연음은 소리가 “좋아 보이도록” 과도하게 밝게 EQ하지 않는다.

### 15.4 자산 기록

`docs/audio/FRONTIER_AUDIO_ASSETS.md`에 각 음원의 다음 정보를 기록한다.

| 필드 | 내용 |
| --- | --- |
| semantic ID | 코드에서 쓰는 의미 ID |
| runtime files | WebM/MP3 경로 |
| duration / channels | 길이와 mono/stereo |
| creator | 제작자 |
| original source | 원본 주소 또는 자체 제작 기록 |
| license | 상업 사용·수정·표기 조건 |
| downloaded at | 다운로드 날짜와 라이선스 확인 날짜 |
| evidence | 자산·라이선스 페이지 PDF 또는 screenshot |
| hashes | 원본과 편집본 SHA-256 |
| edit history | 자르기, EQ, noise 제거, loop 편집 |
| in-game use | 구역과 이벤트 |
| status | candidate / approved / rejected와 사유 |
| approved by | 최종 검수자와 날짜 |

출처가 불명확한 `public/metasense-promo` 음원을 프론티어 제품 음원으로 임의 재사용하지 않는다.

### 15.5 음원 조달 게이트

기술 구현과 최종 음원 50~60개의 조달을 한 일정으로 묶지 않는다.

```text
semantic slot 확정
→ 슬롯별 후보 2~3개 수동 수집
→ 라이선스 격리 검수
→ 3개 사운드 팔레트 청취 승인
→ 편집·loop·mono·정규화
→ 실제 게임 mix QA
→ approved 자산만 production manifest에 포함
```

Phase 0에는 최종 자산 전체가 필요하지 않다. 출처가 확인된 임시 자산으로 다음 4~6개만 먼저 확보한다.

- 강 loop 1개
- 금속 발걸음 3개
- 저음량 자연 bed 1개
- 기지 hum 또는 성능 부하용 spatial loop 1개

Phase 0 통과 뒤 70~90개 후보를 수집해 약 50~60개 source clip으로 줄인다. 후보 수집은 봇·스크래핑이 아니라 개별 자산 페이지에서 수동으로 수행한다.

기본 허용 정책:

- 우선: 자체 녹음, Sonniss GDC, 명확한 CC0
- 조건부: Pixabay·Mixkit sound effect는 해당 자산과 다운로드 시점 약관 증거를 보관
- 예외: Freesound CC BY는 제품 credits와 공개 audio credits 페이지를 실제 운영할 때만
- 제외: CC BY-NC, Sampling+, CC BY-SA, GPL, 출처 불명, 유명 게임·영화·브랜드 추출 의심, 사람 목소리·배경 음악 혼입
- Mixkit stock music은 video game 사용 제한이 있으므로 사용하지 않는다. sound effect와 music 라이선스를 혼동하지 않는다.

무료는 “권리 검토가 필요 없다”는 뜻이 아니다. 특히 사용자 업로드 기반 사이트는 업로더가 실제 권리를 보유했는지, 설명과 라이선스가 충돌하지 않는지 확인한다. 웹게임에는 편집·압축된 runtime 파일만 포함하고 원본 WAV 묶음이나 별도 SFX 다운로드 인덱스를 제공하지 않는다.

상세 소싱 순서, 책임, 사용자 협업 요청은 [`docs/audio/FRONTIER_AUDIO_PROCUREMENT_PLAN.md`](audio/FRONTIER_AUDIO_PROCUREMENT_PLAN.md)에 둔다.

## 16. 성능 예산

### 16.1 voice

- 환경 loop: 최대 4
  - 테마 베드 1
  - 강 1
  - 생태 또는 가장 가까운 나무 1
  - 착륙장 또는 가장 가까운 특수 시설 1
- 단발 효과음: 최대 8
- 로컬 발걸음: 최대 1~2
- 같은 semantic ID의 collision: cooldown
- 원격 친구 발소리: 1차 비활성

### 16.2 네트워크

- 초기 앱 로드에서 프론티어 신규 음원: 0B
- 프론티어 첫 진입 핵심 pack 목표: 약 3~5MB 이하
- 희귀 음원은 첫 필요 시 lazy
- JS bundle에 audio를 import하지 않고 public URL로 로드

### 16.3 메모리

압축 파일 크기만 보지 않는다. 디코딩된 PCM은 대략 다음과 같이 증가한다.

```text
duration × sampleRate × channels × 4 bytes
```

예를 들어 44.1kHz, 30초, stereo 한 개는 약 10MB다. 따라서 위치 loop는 mono로 만들고, 활성 loop 수와 길이를 동시에 제한한다.

Phase 0의 core pack decoded PCM 합계는 우선 32MiB 이하를 목표로 한다. `exitScope(..., { unload: true })` 뒤에는 음원 cache와 panner·voice 수가 다음 진입마다 단조 증가하지 않아야 한다. 지속 loop가 재생 중이면 AudioContext 자동 suspend를 기대할 수 없으므로 10분 발열·배터리 QA도 포함한다.

### 16.4 update 빈도

- listener 방향: 15~20Hz
- 구역 거리와 volume mix: 8~12Hz
- 발걸음: 실제 이동 프레임에서 거리 누적
- React state: UI 표시가 필요한 값만 갱신
- 프레임마다 `setState`나 전체 Howl volume 재계산을 하지 않음

## 17. 1차 콘텐츠 범위

“15종”이라는 말은 의미 종류와 실제 파일 수를 구분해야 한다. 발소리 변형과 브라우저 포맷 fallback까지 포함하면 실제 파일 수는 더 많다.

### 17.1 환경

- 테마 기본 환경음 6종
- 강 1종
- 착륙장 전력장 1종
- 생태 잎결 1종
- 새·생명체 단발 2~3종

### 17.2 이동

- 테마 일반 지형 6세트 × 각 3변형
- 길 3변형
- 목재 다리 3변형
- 금속 착륙장 3변형

### 17.3 충돌

- metal 2변형
- wood 2변형
- stone 2변형
- soft 2변형

### 17.4 행동과 결과

- 조각 수집
- 물주기
- 수리
- 식물 심기·돌보기
- 시설 행동 확인
- 잘못된 배치
- 건설 완료
- 미션 시작
- 미션 종료
- 미션 완료
- 일일 사건 완료
- 로버 출발
- 로버 귀환 준비
- 로버 수령
- 부드러운 통신 오류
- 5분·2분 시간 안내 motif

최종적으로 약 25~30개 의미 종류, 약 50~60개 서로 다른 source clip이 현실적이다. 각 clip의 WebM/MP3 fallback은 같은 연주이므로 콘텐츠 개수에는 중복 계산하지 않는다.

## 18. 구현 단계

### Phase 0. 오디오 spike와 자산 기준 확정

목표: Howler 단일 엔진이 3인칭 공간감, 모바일 성능, 생명주기 기준을 실제 기기에서 통과하는지 판정한다.

테스트 scene:

- global 2D bed 1개
- 25~35초 mono spatial loop 4개
  - 강
  - 숲·생태
  - 기지
  - 특수 구조물 또는 부하용 emitter
- 자산 확보 단계에서는 승인된 loop 2개를 서로 다른 instance ID·위치에 재사용해 panner 4개 부하를 만들 수 있음
- 이동 중 spatial one-shot 최대 4개
- persistent panner 4개, 순간 총 spatial voice 최대 8개
- listener 위치·방향 20Hz 갱신
- 같은 자산과 고정 동선으로 HRTF/equalpower A/B
- 10분 연속 replay, scene 진입·이탈 10회, background·foreground 5회

테스트 환경:

- Chrome desktop
- Safari macOS
- 실제 최저 지원 교실 태블릿
- 기기가 아직 정해지지 않았다면 iPad 9세대 Safari와 RAM 4GB급 Android Chrome을 임시 하한선으로 사용

Hard gate:

1. AudioContext 생성 수가 1이고 scene 재진입 뒤에도 증가하지 않는다.
2. 탐험 시작 gesture로 unlock되고 cache 상태에서는 500ms 안에 context가 running·audible 상태가 된다.
3. 진입 10회마다 persistent loop가 key별 정확히 1개이고, 이탈 뒤 프론티어 active voice는 0이다.
4. hidden 뒤 500ms 안에 pause 또는 fade되고, 복귀 뒤 조건이 맞을 때만 1초 안에 재개된다.
5. mute 시 모든 backend 출력이 digital zero 또는 측정 RMS -60dBFS 이하가 된다.
6. core decoded PCM 합계가 32MiB 이하이고, 10회 뒤 메모리·node·voice가 cycle마다 단조 증가하지 않는다.
7. 카메라 zoom만 바꿀 때 같은 플레이어·source의 RMS 차이가 1dB 이내다.
8. 좌우 beacon의 pan 부호가 모두 맞고 1·3인칭 전환에서 좌우가 뒤집히지 않는다.
9. 90도 카메라 회전이 목표 방향의 90%까지 250ms 이내에 추종한다.
10. 같은 replay 3회 중앙값에서 audio-on median FPS 감소 5% 이하, p95 frame time 악화 10% 이하, 10분 audible pop·dropout 0이다.

수치 임계값은 첫 baseline 뒤 기기 오차를 기록해 조정할 수 있지만, 배포 후보끼리 같은 scene·동선·측정법을 사용해야 한다.

판정:

- 전부 통과: Howler 단일 엔진 확정
- 9번만 실패하고 listener AudioParam direct ramp가 통과: shared-context listener adapter 검토
- HRTF만 성능 실패하고 equalpower 통과: 해당 모바일에서 equalpower 적용
- HRTF/equalpower 모두 실패: panner 4개를 2~3개로 줄이고 비공간 zone mix로 보완
- Howler wrapper에서만 재현되고 native 기준 구현에서 사라지는 오류: shared-context adapter 또는 Three 병행 ADR 작성
- 별도 AudioContext, master mute 우회, 중복 decode, stale listener 중 하나라도 생기는 Three 구성은 불합격

Three `PositionalAudio`는 음원이 움직이는 `Object3D`에 다수 결합되어 matrix 동기화가 주된 문제가 될 때 다시 비교한다. 현재처럼 정적 구역과 가상 강 emitter가 중심인 구조에서는 우선순위가 낮다.

### Phase 1. 기반 시스템

- `SoundManager` 하위 호환 확장
- semantic registry
- logical bus
- scope lazy load/unload
- shuffle-no-repeat
- cooldown, priority, voice limit
- user-scoped preferences
- unlock, visibility, pagehide, cleanup
- asset load 상태 머신과 제한 재시도
- 파일 fallback, 핵심 단발음의 의미 fallback, 환경음의 무음 degrade
- terminal warning dedupe와 다시 불러오기
- 개발용 audio debug 상태

완료 조건:

- 기존 `playClick`, `playCorrect` 등 호출이 변하지 않음
- 프론티어에 들어가기 전 신규 audio 요청 0건
- 404·decode 실패·offline에서도 게임 action은 정상 완료됨
- 실패 자산은 후보와 제한 재시도 소진 뒤 현재 session에서 비활성화됨
- 같은 terminal 오류 경고와 요청이 `play()`마다 반복되지 않음
- 핵심 단발음 fallback 또는 무음 degrade 결과를 debug 상태에서 확인할 수 있음

### Phase 2. 이동과 직접 피드백

- 공용 `getWalkSurface`
- 실제 변위 기반 발걸음
- typed collider와 최초 막힘 충돌음
- 조각 수집
- 상호작용 물성음
- 잘못된 배치음

완료 조건:

- 벽을 계속 밀어도 발소리와 충돌음이 난사되지 않음
- 표면 전환 후 다음 한 걸음 안에 소리가 바뀜
- 물에 들어갈 수 없는 현재 규칙에서 물속 발소리가 나지 않음

### Phase 3. 환경과 서버 결과

- 현재 테마 bed
- 강 가상 음원
- 생태 구역 잎·생명체
- 착륙장·로버 근접 hum
- 건설·시설·일일 사건·미션·로버 결과음
- 시간 안내와 안전 귀환 fade

완료 조건:

- 큰 성공음은 서버 성공 뒤에만 남
- 서버 실패 시 성공음이 나지 않음
- 행성 방문 대상이나 테마가 바뀔 때 이전 loop가 crossfade 후 정리됨

### Phase 4. 믹스·접근성·운영 검수

- 프론티어 설정 UI
- 조용한 모드
- 승인된 50~60개 runtime source clip 확정
- 실제 학생 기기 청취 테스트
- 라이선스 manifest 검수
- 성능과 네트워크 예산 검수
- feature flag 또는 단계적 rollout

## 19. 테스트 계획

현재 루트에는 Vitest/Jest/Playwright가 없으므로 새 의존성 없이 pure logic부터 Node assert로 검증한다.

제안 파일:

```text
scripts/test-frontier-audio-utils.mjs
```

테스트 항목:

- `getWalkSurface`
  - 착륙장 우선
  - 다리 우선
  - 길
  - 여섯 테마 fallback
- `getRiverAudioPoint`와 거리 mix
- preference 기본값·버전 migration·범위 clamp
- shuffle에서 같은 변형 연속 방지
- collision cooldown과 re-arm
- voice priority와 drop
- 동일 scene key의 loop idempotency
- 서버 성공 전후 sound event 순서
- catalog의 ID, source, bus, kind 유효성

추가 npm script:

```json
"test:frontier-audio": "node scripts/test-frontier-audio-utils.mjs"
```

이 자동 검증은 계산·상태 전이·catalog 무결성만 보장한다. Safari unlock, 실제 panner 체감, iPad decoded memory, 화면 잠금, Bluetooth 출력 전환은 Web Audio mock이나 Node assert로 통과 판정을 대신할 수 없다.

따라서 수동 matrix는 권장 확인이 아니라 release gate다. 최소 일정은 다음처럼 잡는다.

- 플랫폼별 30~45분 structured pass
- 4개 필수 환경을 2회 반복하면 약 4~6 person-hour
- 결함 수정 뒤 재검증과 실제 기기 준비를 포함해 최소 1~2 QA day
- 음원 팔레트가 바뀌면 전체 기능이 아니라 loudness·loop·놀람 강도 청취 pass를 별도로 반복

실제 최저 지원 교실 기기가 정해지지 않으면 Phase 0 아키텍처 확정도 보류한다.

### 19.1 수동 브라우저 matrix

| 환경 | 필수 시나리오 |
| --- | --- |
| Chrome desktop | 첫 진입, 1·3인칭, tab hide, 빠른 화면 왕복 |
| Safari macOS | unlock, 포맷 fallback, fade, route change |
| iPad Safari | touch 진입, 화면 잠금·복귀, 메모리, 중복 loop |
| Android Chrome | touch joystick, speaker, Bluetooth 전환 |
| 저사양 기기 | 30fps 이상, voice limit, memory |

### 19.2 수동 시나리오

1. 처음 방문한 학생이 탐험 시작을 누른다.
2. 브리핑을 닫고 잔디, 길, 다리, 착륙장을 걷는다.
3. 건물과 로버에 부딪혀 본다.
4. 강에 가까워지고 멀어진다.
5. 카메라를 돌리고 1인칭으로 전환한다.
6. 조각 5개를 모으고 네트워크 성공·실패를 각각 만든다.
7. 잘못된 건설 위치와 성공 건설을 각각 실행한다.
8. 메뉴를 열고 닫는다.
9. 탭을 숨기고 30초 뒤 돌아온다.
10. 프론티어를 10회 입장·귀환한다.
11. 음소거 후 새로고침하고 다시 입장한다.
12. 오디오 파일 하나를 404로 만들어 graceful fallback을 확인한다.
13. WebM만 404, 모든 포맷 404, decode 손상 파일을 각각 확인한다.
14. offline 진입 뒤 online 복귀에서 제한 재시도와 중복 경고를 확인한다.
15. Bluetooth 연결·해제와 화면 잠금·복귀를 실제 모바일에서 확인한다.
16. UID A에서 설정을 바꾼 뒤 B로 전환해 A의 값과 loop가 B에게 적용되지 않는지 확인한다.

## 20. 최종 완료 기준

### 기능

- Phase 0 측정 결과와 선택 backend가 ADR에 기록됨
- 탐험 시작 클릭에서 오디오가 정상 unlock됨
- 음소거와 세부 볼륨이 학생별 기기 설정으로 저장됨
- 계정 전환 순간 이전 UID의 설정과 loop가 새 UID에 전달되지 않음
- 실제 이동한 경우에만 발소리가 남
- 길·다리·착륙장·테마 지형 소리가 구분됨
- 강과 착륙장 소리가 거리와 방향에 따라 변함
- 충돌음이 연속 난사되지 않음
- 미션·건설·로버 성공음이 서버 성공 뒤에만 남
- 메뉴, 탭 숨김, 안전 귀환에서 loop가 정리됨

### 품질

- 같은 짧은 발소리가 연속되지 않음
- loop 경계의 click과 뚜렷한 반복이 없음
- 자연환경음이 행동 피드백을 덮지 않음
- 갑작스러운 고음, 큰 팡파르, 반복 경보가 없음
- 음소거 학생도 시각·텍스트로 모든 상태를 이해함

### 성능

- 초기 앱 로드에서 프론티어 음원 요청 0건
- 프론티어 진입 핵심 pack이 목표 네트워크 예산 안에 있음
- 환경 loop 최대 4, 단발 최대 8
- 저사양 모바일에서 오디오 도입 전후 프레임 저하가 허용 범위 안에 있음
- 개발 `StrictMode`에서도 중복 loop가 없음

### 운영

- 모든 신규 음원에 제작자·출처·라이선스·편집 이력이 있음
- 누락 파일이 있어도 게임은 계속 동작함
- 누락 파일은 제한 fallback 뒤 session 비활성화되고 동일 경고·요청이 반복되지 않음
- 필수 자산은 다운로드 시점 라이선스 증거와 원본·편집본 hash가 있음
- debug 모드에서 context 상태, 현재 surface, 활성 zone, active voice, drop 이유를 확인할 수 있음

## 21. 후속 단계

실제 게임 기능이 추가될 때 다음 순서로 확장한다.

### P1

- 동적 `crystal_pond`, `lumen_tree`, `rover_bay` 근접음
- 여섯 테마의 생태 one-shot 확대
- 원격 친구의 가까운 발소리
- 공간 방향감 줄이기
- 계정 간 설정 동기화
- 휴식 지점의 더 조용한 soundscape

### P2

- 점프·착지 기능과 동기화된 소리
- 얕은 물 보행 기능과 물 발소리
- 직접 운전 로버의 모터·바퀴·충격
- 실내·자동문·잔향
- 낮·밤·날씨와 연동된 환경음
- 학생이 명시적으로 선택하는 휴식 음악

기능이 없는 상태에서 소리만 먼저 만들어 미래 기능을 암시하지 않는다.

## 22. 참고 자료

- [MDN Web Audio API best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
- [MDN AudioBuffer](https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer)
- [MDN Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- [Howler.js documentation](https://github.com/goldfire/howler.js#documentation)
- [Web Audio panning algorithm](https://www.w3.org/TR/webaudio-1.1/#panningAlgorithm)
- [Three.js AudioContext](https://threejs.org/docs/pages/AudioContext.html)
- [Three.js PositionalAudio](https://threejs.org/docs/#api/en/audio/PositionalAudio)
- [Sonniss GDC bundle license](https://sonniss.com/gdc-bundle-license/)
- [Pixabay Content License](https://pixabay.com/service/license-summary/)
- [Mixkit license](https://mixkit.co/license/)
- [OpenGameArt FAQ](https://opengameart.org/node/5571)
- [Freesound license FAQ](https://freesound.org/help/faq/)
