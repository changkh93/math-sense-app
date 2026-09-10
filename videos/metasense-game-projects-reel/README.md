# MetaSense Python Game Projects — Parent Reel

학부모가 아이의 게임 제작 경험을 상상하도록 구성한 36초 세로 영상입니다. 기존 메타센스 공식 로고와 청록·보라·초록 색상, 우주 탐험 배경, 한글 폰트를 사용합니다.

## 산출물

- `out/metasense-game-projects-vertical-v2.mp4` (동일 내용 canonical: `out/metasense-game-projects-vertical.mp4`): 쇼츠·릴스 공용 1080×1920, 30fps, 36초 MP4.
- `out/cover.jpg`: 게시용 세로 표지.
- `게시문구.md`: 제목·소개 문구·해시태그·댓글 질문 초안.
- `src/`: 편집 가능한 Remotion 소스.
- `MUSIC-CREDITS.md`: 현재 음악 Pixelland의 출처, CC BY 4.0 및 편집 내역.
- `make_music.py`: 첫 검토본의 합성 음악 소스만 보관. 현재 영상에는 사용하지 않습니다.

## 구성

| 시간 | 핵심 메시지 |
|---|---|
| 0–4초 | 우리 아이가 이런 게임을 만든다고? 두 게임 실제 플레이 |
| 4–9초 | 우주 방어대: 이동·발사·점수 규칙을 직접 구현 |
| 9–14초 | 화성 탐사대: 점프·충돌·탐사 |
| 14–20초 | 움직임을 만드는 아이의 Python 코드 / 실제 수업 코드 일부 |
| 20–26초 | 원리 이해 → 게임 스튜디오에서 구현 → 실행하며 실험 |
| 26–30초 | 게임을 좋아하는 마음이 만드는 힘으로 |
| 30–36초 | 공식 메타센스 로고, 게임 프로젝트, msense.me |

영상은 학생 실적·후기를 제시하지 않습니다. 게임 창에 ‘수업 완성 예제’를 표시하고, 이전에 최종 코드로 실제 촬영한 영상을 사용합니다. 코드 장면은 화성 탐사대 최종 코드의 grounded 조건과 jump_speed 대입을 발췌한 것으로, 중간 효과음 호출을 생략한 일부 코드입니다.

## 자료 출처

- `public/m-logo.svg`: 앱의 기존 공식 로고를 변경 없이 사용.
- `public/space.mp4`: 앞서 기록한 우주 방어대 실제 플레이.
- `public/mars.mp4`: 앞서 기록한 화성 탐사대 실제 플레이의 무음 원본.
- 음악: Kevin MacLeod의 Pixelland. 공식 배포처의 CC BY 4.0 버전, 36초 발췌·페이드·음량 조정. 전체 출처는 MUSIC-CREDITS.md 및 게시문구.md 참고.
- 사용자 피드백에 따라 전환음, 별도 jump/collect 효과음, 게임 원음은 제거했습니다. 하나의 음악 트랙만 이어집니다.
- 폰트: Do Hyeon, 원본 SIL OFL 포함.
- 관련 원본 촬영 보고서는 형제 영상 프로젝트들의 `out/`에 보존.

## 재현

```sh
npm ci
npm run dev -- --no-open --port=3107
npm run lint
npx remotion render MetaSenseGameProjects out/master-render.mp4 --codec=h264 --crf=18 --concurrency=4
python3 finalise_video.py
```

현재 로컬에서는 앞서 설치한 형제 프로젝트의 node_modules를 심볼릭 링크로 재사용합니다. 다른 컴퓨터로 복사할 때는 해당 링크를 제거한 뒤 npm ci로 독립 설치합니다.

게시 자체는 하지 않았습니다. 앱 코드·커리큘럼·이전 소개 영상은 변경하지 않았습니다.

음악 파일 재편집: `ffmpeg -y -i public/Pixelland-Kevin-MacLeod.mp3 -t 36 -af "afade=t=in:st=0:d=0.025,afade=t=out:st=35.2:d=0.8" -ar 48000 -ac 2 public/pixelland-reel.wav`

리듬에 맞춘 최종 장면 전환: 4.167초, 9.133초, 14.1초, 20.1초, 26.1초, 30초. 영상 길이는 36초로 유지합니다.

## 최종 검증

수정본 v2: 정확히 36초, 1080×1920/30fps, H.264/AAC 48kHz stereo, 약 13MB. 전체 구성 8시점 및 수정한 후반 장면·출처 표기 시각 검토. ESLint/TypeScript 통과. 한글·기호 글리프 확인. 오디오 전체 디코딩 통과, -17.5 LUFS / true peak -2.3 dBFS. 전환음은 없고 Pixelland 한 트랙만 재생합니다.
