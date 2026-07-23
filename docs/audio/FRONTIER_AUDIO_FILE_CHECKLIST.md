# 아스트라 프론티어 음원 검색·파일 배치 체크리스트

작성 기준: 2026-07-23

연결 문서:

- [`FRONTIER_AUDIO_PROCUREMENT_PLAN.md`](./FRONTIER_AUDIO_PROCUREMENT_PLAN.md)
- [`../ASTRA_FRONTIER_AUDIO_SYSTEM_PLAN.md`](../ASTRA_FRONTIER_AUDIO_SYSTEM_PLAN.md)
- [`frontier-audio-assets.json`](./frontier-audio-assets.json)

## 1. 가장 안전한 검색 순서

1. [Kenney](https://kenney.nl/assets/category:Audio)
   - asset 페이지에 표시된 CC0 pack만 사용
   - 충돌: [Impact Sounds](https://kenney.nl/assets/impact-sounds)
   - 발걸음·물성: [RPG Audio](https://kenney.nl/assets/rpg-audio)
   - UI: [Interface Sounds](https://kenney.nl/assets/interface-sounds)
   - SF: [Digital Audio](https://kenney.nl/assets/digital-audio)
2. [OpenGameArt](https://opengameart.org/)
   - 검색 결과의 `License(s)`가 CC0인 자산만 사용
   - pack 설명이나 첨부 README에 별도 조건이 없는지 확인
3. [Freesound](https://freesound.org/)
   - 검색 필터에서 `Creative Commons 0`만 선택
   - 다운로드에는 로그인 계정이 필요
   - 원본 페이지, uploader, license, 다운로드 날짜를 반드시 기록
4. Pixabay·Mixkit
   - 위 CC0 소스에서 적절한 자연 녹음을 찾지 못할 때만 사용
   - custom license 증거와 원본 페이지를 별도 보관

사용하지 않는 라이선스:

- CC BY-NC
- CC BY-SA
- Sampling+
- GPL/LGPL audio
- 라이선스가 불명확하거나 유명 게임·영화에서 추출된 음원

## 2. 원본과 런타임 파일 보관 위치

원본 WAV/FLAC:

- 공개 저장소의 `public/`에 넣지 않는다.
- 팀 전용 Drive 또는 저장소 밖의 비공개 폴더에 보관한다.
- 원본 파일명, 제작자, 출처 URL을 바꾸지 않고 보존한다.

게임용 편집본:

```text
public/sounds/frontier/v1/
```

각 논리 음원을 다음 두 포맷으로 만든다.

```text
동일한-이름.webm
동일한-이름.mp3
```

확장자만 바꾸면 안 된다. FFmpeg 또는 Audacity로 실제 변환해야 한다.

## 3. 정확한 폴더와 파일명

### 3.1 환경음: 8개 논리 음원, 16개 파일

```text
public/sounds/frontier/v1/ambience/
├── river/
│   ├── river-loop.webm
│   └── river-loop.mp3
├── landing/
│   ├── landing-hum.webm
│   └── landing-hum.mp3
└── themes/
    ├── forest-bed.webm
    ├── forest-bed.mp3
    ├── ocean-bed.webm
    ├── ocean-bed.mp3
    ├── crystal-bed.webm
    ├── crystal-bed.mp3
    ├── desert-bed.webm
    ├── desert-bed.mp3
    ├── mechanical-bed.webm
    ├── mechanical-bed.mp3
    ├── ice-bed.webm
    └── ice-bed.mp3
```

권장 검색어:

| 파일 | 영문 검색어 |
| --- | --- |
| `river-loop` | `small river stream close field recording seamless CC0` |
| `landing-hum` | `soft machinery electrical room tone hum loop CC0` |
| `forest-bed` | `quiet forest wind leaves sparse birds ambience CC0` |
| `ocean-bed` | `calm ocean gentle waves coast ambience CC0` |
| `crystal-bed` | `airy glass chime soft wind ambience CC0` |
| `desert-bed` | `soft desert wind ambience no music CC0` |
| `mechanical-bed` | `gentle sci fi room tone machine hum CC0` |
| `ice-bed` | `arctic wind ice creak ambience CC0` |

선정 조건:

- 20~60초 구간으로 편집
- loop 시작과 끝에 클릭·급격한 음색 변화가 없어야 함
- 환경음에는 사람 목소리, 라디오, 음악, 큰 경적이 없어야 함
- `river-loop`와 `landing-hum`은 3D 점음원이므로 mono 권장
- 테마 bed는 stereo 사용 가능

### 3.2 발걸음: 12개 논리 음원, 24개 파일

```text
public/sounds/frontier/v1/footsteps/
├── path-01.webm
├── path-01.mp3
├── path-02.webm
├── path-02.mp3
├── path-03.webm
├── path-03.mp3
├── bridge-wood-01.webm
├── bridge-wood-01.mp3
├── bridge-wood-02.webm
├── bridge-wood-02.mp3
├── bridge-wood-03.webm
├── bridge-wood-03.mp3
├── metal-01.webm
├── metal-01.mp3
├── metal-02.webm
├── metal-02.mp3
├── metal-03.webm
├── metal-03.mp3
├── forest-01.webm
├── forest-01.mp3
├── forest-02.webm
├── forest-02.mp3
├── forest-03.webm
└── forest-03.mp3
```

권장 검색어:

| 묶음 | 영문 검색어 |
| --- | --- |
| `path-*` | `single footstep dirt gravel soft CC0` |
| `bridge-wood-*` | `single footstep wooden bridge plank CC0` |
| `metal-*` | `single metal boot footstep platform CC0` |
| `forest-*` | `single footstep grass leaves forest CC0` |

선정 조건:

- 같은 묶음의 01~03은 같은 신발과 같은 녹음 공간처럼 들려야 함
- 긴 걷기 녹음은 한 발씩 잘라 각각 저장
- 각 파일은 약 0.15~0.45초
- 음성, 옷의 큰 마찰음, 배경 차량음이 없는 구간 사용
- stereo 원본도 runtime은 mono 권장

### 3.3 충돌음: 4개 논리 음원, 8개 파일

```text
public/sounds/frontier/v1/collisions/
├── soft-01.webm
├── soft-01.mp3
├── metal-01.webm
├── metal-01.mp3
├── wood-01.webm
├── wood-01.mp3
├── stone-01.webm
└── stone-01.mp3
```

권장 검색어:

| 파일 | 영문 검색어 |
| --- | --- |
| `soft-01` | `soft body bump padded impact CC0` |
| `metal-01` | `light metal bump impact not harsh CC0` |
| `wood-01` | `soft wood knock impact CC0` |
| `stone-01` | `small stone knock impact CC0` |

선정 조건:

- 폭발·총기처럼 들리지 않는 작은 충격음
- 학생이 놀라지 않도록 날카로운 고역과 큰 저역을 줄임
- 약 0.15~0.6초

### 3.4 상호작용·보상음: 6개 논리 음원, 12개 파일

```text
public/sounds/frontier/v1/interactions/
├── water.webm
├── water.mp3
├── repair.webm
├── repair.mp3
├── pickup.webm
├── pickup.mp3
├── build-complete.webm
├── build-complete.mp3
├── daily-complete.webm
├── daily-complete.mp3
├── rover-complete.webm
└── rover-complete.mp3
```

주의: 이 폴더의 논리 음원 수는 6개다. 아래 `mission-complete`는 별도 missions 폴더에 둔다.

권장 검색어:

| 파일 | 영문 검색어 |
| --- | --- |
| `water` | `small water pour splash plant CC0` |
| `repair` | `small tool repair mechanical click CC0` |
| `pickup` | `soft crystal pickup chime game CC0` |
| `build-complete` | `soft construction complete positive UI CC0` |
| `daily-complete` | `gentle positive task complete chime CC0` |
| `rover-complete` | `soft sci fi cargo arrival success CC0` |

### 3.5 미션음: 1개 논리 음원, 2개 파일

```text
public/sounds/frontier/v1/missions/
├── mission-complete.webm
└── mission-complete.mp3
```

검색어:

```text
gentle mission complete achievement chime no music CC0
```

선정 조건:

- 1~2초
- 짧은 상승감은 있으나 팡파르·관중 환호·과도한 저음은 제외

### 3.6 UI·오류음: 3개 논리 음원, 6개 파일

```text
public/sounds/frontier/v1/ui/
├── build-invalid.webm
├── build-invalid.mp3
├── mission-warning.webm
├── mission-warning.mp3
├── soft-error.webm
└── soft-error.mp3
```

권장 검색어:

| 파일 | 영문 검색어 |
| --- | --- |
| `build-invalid` | `soft invalid placement UI sound CC0` |
| `mission-warning` | `gentle timer warning beep UI CC0` |
| `soft-error` | `soft connection error notification CC0` |

선정 조건:

- 오답을 꾸짖는 버저처럼 들리지 않아야 함
- 0.2~0.8초
- `mission-warning`은 한 번만 들어도 시간 안내임을 알 수 있어야 함

## 4. 수량 검산

| 구분 | 논리 음원 | WebM+MP3 파일 |
| --- | ---: | ---: |
| 환경음 | 8 | 16 |
| 발걸음 | 12 | 24 |
| 충돌음 | 4 | 8 |
| 상호작용·보상 | 6 | 12 |
| 미션 | 1 | 2 |
| UI·오류 | 3 | 6 |
| 합계 | 34 | 68 |

## 5. 편집·변환 기준

권장 원본:

- WAV 또는 FLAC
- 44.1kHz 이상
- clipping 없는 파일

권장 출력:

- 48kHz
- 발걸음·충돌·공간음은 mono
- WebM Opus 96kbps
- MP3 128kbps

예시 명령:

```sh
ffmpeg -i ORIGINAL.wav -ar 48000 -ac 1 -af "highpass=f=45,alimiter=limit=0.89" -c:a libopus -b:a 96k TARGET.webm
ffmpeg -i ORIGINAL.wav -ar 48000 -ac 1 -af "highpass=f=45,alimiter=limit=0.89" -c:a libmp3lame -b:a 128k TARGET.mp3
```

환경 loop는 변환 전에 Audacity 등에서 시작·끝을 자연스럽게 연결한다. 단순 fade-out 파일은 반복할 때마다 볼륨이 꺼지므로 loop로 사용하지 않는다.

초기 loudness 목표:

| 종류 | 편집본 목표 |
| --- | --- |
| 환경 bed | 약 -26~-22 LUFS |
| 강·기지 근접 loop | 약 -24~-20 LUFS |
| 발걸음·충돌 | 약 -20~-16 LUFS |
| UI·보상 | 약 -18~-14 LUFS |

최종 크기는 게임 내부 bus와 실제 iPad 청취 테스트로 결정한다.

## 6. 자산 원장 입력

각 WebM/MP3 파일을 `docs/audio/frontier-audio-assets.json`에 별도로 기록한다.

```json
{
  "path": "/sounds/frontier/v1/ambience/river/river-loop.webm",
  "sourceUrl": "https://원본-자산-페이지",
  "creator": "원본 제작자 또는 uploader",
  "license": "CC0 1.0",
  "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
  "downloadedAt": "YYYY-MM-DD",
  "sha256": "64자리 SHA-256"
}
```

SHA-256 확인:

```sh
shasum -a 256 public/sounds/frontier/v1/ambience/river/river-loop.webm
```

WebM과 MP3는 내용이 달라 해시도 다르므로 각각 기록한다.

## 7. 활성화 순서

1. 위 68개 파일을 모두 배치한다.
2. manifest 68개 항목을 모두 작성한다.
3. 다음 검사를 통과한다.

```sh
npm run test:frontier-audio-assets -- --strict
```

4. `.env.local`에 다음 값을 추가한다.

```text
VITE_FRONTIER_AUDIO_ASSETS_READY=true
```

5. 실행 중인 Vite 개발 서버를 완전히 종료하고 다시 시작한다.

```sh
npm run dev
```

환경변수는 Vite 시작 시 읽기 때문에 브라우저 새로고침만으로는 활성화되지 않는다.

## 8. 절대 하지 말아야 할 것

- 파일 없이 환경변수부터 켜기
- `.wav` 파일의 이름만 `.mp3`로 바꾸기
- Freesound preview 파일을 원본 대신 사용하기
- YouTube, 영화, 게임에서 소리를 추출하기
- 원본 WAV pack 전체를 `public/`에 넣기
- 출처와 라이선스를 나중에 기억으로 작성하기
- 같은 발걸음 하나를 01~03으로 단순 복사하기
