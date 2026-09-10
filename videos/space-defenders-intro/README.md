# 우주 방어대 — 학생용 게임 소개 영상

최종 게임 코드를 실제로 실행한 화면에 한글 설명을 입힌 1분 소개 영상입니다.

- 완성 영상: `out/space-defenders-intro.mp4` (1920×1080, 30 fps, H.264 / AAC, 약 13.7 MB)
- 썸네일: `out/thumbnail.png`
- 편집 소스: `src/Composition.tsx`, `src/scenes/`, `src/style.tsx`
- 실제 플레이 원본: `public/gameplay.mp4`, `public/damage.mp4`
- 촬영 증거: `out/gameplay-report.json`, `out/damage-report.json` (원본 코드 SHA-256와 상태 변화 시각)

## 장면 구성

| 영상 시간 | 내용 |
|---|---|
| 00:00–00:05 | 우주 방어대 제목과 완성 게임 예고 |
| 00:05–00:09 | Enter로 시작, 적 55기와 기체 5대 |
| 00:09–00:15 | 방향키로 좌우 이동 |
| 00:15–00:22 | Space 발사, 적 한 기당 100점, 아군 탄환 최대 2발 |
| 00:22–00:29 | 적 편대의 반격과 방향 전환, 방어선 |
| 00:29–00:34.77 | 편대 격파, 1라운드 보너스 1,000점 |
| 00:34.77–00:42.5 | 2라운드 진입 및 빨라진 편대 |
| 00:42.5–00:47.5 | 별도 플레이: 피격, 기체 감소, Enter 재개 |
| 00:47.5–00:51.5 | 게임오버와 새 게임 재시작 |
| 00:51.5–01:00 | 게임 스튜디오에서 직접 만들기 안내 |

## 촬영 방법과 정확성

`content/space-invaders/checkpoints/final-main.py`를 수정하지 않고 실행했습니다. 촬영 도구는 SDL 화면, 일정한 60 Hz 시계, 자동 키보드 입력만 사용하며 점수·생명·적 객체·게임 규칙을 조작하지 않습니다. 게임은 60 fps로 업데이트하고 30 fps로 촬영했습니다. 게임 내부의 실제 `Sound.play()` 호출 시점에 원래 효과음을 합성했습니다. 영상에는 음성 해설과 외부 배경음악이 없습니다.

기본 플레이에서 원본 시각 29.767초에 55기 격파와 보너스가 적용되어 점수 6,500으로 2라운드 대기 화면이 나타났습니다. 피격과 게임오버는 같은 최종 코드를 별도 입력으로 실행한 촬영분이며, 피격 장면에 별도 플레이임을 표시했습니다. 두 촬영 모두 재생 속도는 1배입니다.

원본 코드 SHA-256: `dd8b16468c28c0701d592bb9c5ff98a715b81c912a4e2fe16e05d4af1a09af98`

## 편집과 렌더링

이 폴더에서 실행합니다.

```sh
npm ci
npm run dev -- --no-open --port=3105
npm run lint
npx remotion render SpaceDefendersIntro out/space-defenders-intro.mp4 --codec=h264 --crf=18 --concurrency=4
```

촬영을 다시 하려면 Python에 pygame과 numpy, 시스템에 ffmpeg가 필요합니다. 이 저장소의 게임 코드와 에셋을 참조합니다.

```sh
python3 capture_gameplay.py --record
python3 capture_gameplay.py --record --scenario damage
```

피격 촬영 도구는 필요한 처음 18초를 촬영하도록 정리했습니다. 최초 촬영본은 180초였으며 영상은 그중 1–6초와 13.5–17.5초만 사용합니다. 상태 보고서에는 최초 전체 촬영 이력이 남아 있습니다.

## 에셋 및 검증

- 이미지: 우주 방어대 수업에서 새로 생성한 탐사선·외계 함선 에셋.
- 효과음: 같은 수업의 수학 파형 합성 효과음. 외부 음원 샘플 없음.
- 폰트: Do Hyeon, 수정하지 않은 배포본. SIL OFL 원문은 `public/OFL-DoHyeon.txt`에 포함.
- ESLint / TypeScript 통과.
- 완성 MP4의 12개 시점 렌더 프레임을 확인하여 한글 깨짐, 잘림, 게임 화면 가림 여부를 검토.
- ffprobe로 1080p, 30 fps, H.264, AAC 스테레오 확인. 전체 오디오 디코딩 검사 통과.
- 기존 앱·커리큘럼 코드 변경이나 운영 배포 없음.
