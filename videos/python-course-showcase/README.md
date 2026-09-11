# 메타센스 파이썬 — 과정 소개 영상

다섯 편 모두 **57초 / 1920×1080 / 30fps**, 한국어 화면 설명과 과정별로 서로 다른 배경음악으로 구성했습니다. 최종 MP4, 표지, WebVTT는 앱의 `public/python-showcase/`에 있습니다. 게임 프로젝트는 사용자가 제공한 기존 YouTube 영상을 페이지에서 연결합니다.

| 파일 | 과정 | 실제 촬영 내용 |
|---|---|---|
| foundation.mp4 | 처음 파이썬 | Code Studio / turtle 반복문으로 색깔 꽃 그리기 |
| lumi.mp4 | 루미 프로토콜 | 실제 PythonMissionLab / 이동·회전 명령 실행 및 목표 도착 |
| advanced.mp4 | 파이썬 심화 | Code Studio / tkinter 단어 카드의 두 버튼과 콜백 |
| math.mp4 | 파이썬 수학 | Code Studio / NumPy·matplotlib로 기울기가 다른 직선 비교 |
| algorithm.mp4 | 생각의 항로 | 실제 관찰 UI에서 예측 선택 + Code Studio에서 반복 신호 규칙 검증 |

## 화면의 출처와 편집

- 모든 실행 결과는 로컬 MetaSense 앱의 실제 런타임에서 계산했습니다. 소스는 `examples/`에 있습니다. 영상 초반 코드 입력은 이미 작성한 코드의 마지막 부분을 실제 CodeMirror에 입력한 장면입니다.
- 실제 학생 화면·이름·성적·과제·학부모 정보는 사용하지 않았습니다. 영상과 페이지에 **시연용 예제**로 표시했습니다.
- LUMI는 실제 미션·실행기·평가기를 사용했고, `persistencePolicy: 'none'`으로 학생 서버 기록을 만들지 않았습니다.
- 생각의 항로의 관찰 장면은 실제 공개 문제 UI입니다. 테스트 gateway는 화면을 독립적으로 마운트하는 용도이며, 평가 제출·모의 채점 결과는 촬영하지 않았습니다. 이후 규칙을 별도 Code Studio에서 실제 Python으로 실행했습니다.
- 엔진 초기 준비와 예제 교체 구간은 제외하고 장면을 연결했습니다. 작성·실행 장면의 재생 속도는 바꾸지 않았으며 끝부분은 결과 프레임을 유지합니다.
- 과제·AI 분석·교사 확인·학부모 확인 부분은 실제 기능에 근거한 설명 그래픽입니다. 학생이 받지 않은 평가 결과나 학습 성과를 재현하지 않았습니다.
- AI 분석 후 선생님이 확인한 공개 피드백과, 연결된 자녀의 학습 기록을 학부모가 확인하는 실제 운영 흐름을 표현했습니다.

## 구성

0–5.5초: 과정과 결과 / 5.5–37초: 실제 시연 / 37–43.5초: 질문과 배울 개념 / 43.5–50초: 학습 관리 흐름 / 50–57초: 체험 신청 안내.

음악의 저작자·라이선스와 편집 내역은 `MUSIC-CREDITS.md`에 있습니다. 각 영상 마지막 화면과 소개 페이지에도 표기했습니다. 게시할 때 전체 음악 크레딧을 설명란에도 포함해 주세요. Do Hyeon 폰트는 `public/OFL-DoHyeon.txt`를 동봉했습니다.

## 편집 및 재생성

```sh
npm ci
npm run dev -- --no-open --port=3110
npx tsc --noEmit
npx remotion render foundation ../../public/python-showcase/foundation.mp4 --codec=h264 --crf=22 --concurrency=3
```

`foundation` 대신 `lumi`, `advanced`, `math`, `algorithm`을 지정하면 각 영상을 렌더링합니다. 로컬에서는 기존 형제 영상 프로젝트의 node_modules 링크를 재사용합니다. 다른 컴퓨터에서는 이 링크를 제거한 뒤 npm ci로 독립 설치합니다.

촬영 스크립트는 `capture.mjs`, `capture-observe.mjs`, 시연 전용 React 마운트는 `capture-entry.jsx`입니다. 로컬 Vite를 5180 포트에서 실행하면 `videos/python-course-showcase/capture.html`이 capture-entry를 로드합니다. 이 촬영용 HTML은 앱의 Vite 빌드 진입점에 포함되지 않으며, DEV 환경에서만 작동합니다. 원본 녹화와 시간표는 로컬 `out/captures*`에 보관하며, 잘라낸 실제 녹화는 `public/*-capture.mp4`와 `public/algorithm-observe.mp4`에 동봉했습니다. `prepare-media.py`로 잘라내기·정지화면을 생성하고 `captions.mjs`로 자막을 생성합니다.

최종 파일 검증 기록은 `docs/collaboration/tasks/20260911-python-showcase/verification/`에 있습니다. 실제 사이트·YouTube 게시 또는 실제 체험 접수는 이 작업에서 수행하지 않습니다.

음악 수정: `src/data/pythonCourseMusic.json`에 과정별 곡·출처·발췌 지점을 지정합니다. `python3 prepare-music.py`로 음량을 맞춘 후 영상을 렌더링합니다. 전체 출처는 `MUSIC-CREDITS.md`를 참고하세요.
