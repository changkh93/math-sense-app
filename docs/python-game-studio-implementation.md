# Python Game Studio — 초기 구현과 검증

2026-09-09. 로컬 MVP 구현 완료. 사용자 요청으로 클라우드 저장을 제거했고, 새 프로젝트는 빈 main.py 하나로 시작한다. 운영 배포 전.

## 사용 방법

- 개발 실행: `npm run dev`. `/dev/python-game-studio`는 개발 빌드에서만 열리는 로그인 없는 테스트 공간이다. 테스트 초안은 `local-preview`로 구분하며 실제 계정 저장 API를 호출하지 않는다.
- 실제 회원 진입: `/python-game-studio`, 파이썬 성단의 2D ‘게임 스튜디오’ 항목, 3D 화면의 ‘게임 스튜디오 열기’ 버튼. 관리자 또는 Python 과정 active 회원만 입장한다.
- ‘내 프로젝트 → 몬스터 잡기 예제’에 제공 코드의 웹용 사본과 작은 기본 이미지/효과음이 있다. 원본 에셋을 재현한 그림은 아니다. 예제 폰트는 pygame 기본 폰트이며 사용자가 TTF/OTF를 올려 교체할 수 있다.
- 이미지/폰트/효과음을 업로드한 뒤 파일명으로 읽는다. 기존 파일은 ‘파일 교체’로 코드의 경로를 유지하며 바꿀 수 있다. 파일 미리보기에서 사용 예시 코드를 실행 파일에 추가할 수 있다.
- 새 프로젝트는 내용이 비어 있는 `main.py` 하나로 시작한다. 예제는 사용자가 따로 선택할 때만 불러온다. 기존 초안 코드는 유지한다.
- 코드 편집, Python 보조 파일 추가, 폴더 경로, 파일명 변경, 파일/프로젝트 다운로드를 지원한다. 내 프로젝트의 ‘프로젝트 가져오기’는 로컬 폴더 전체에서 지원 파일을 읽고 하위 경로를 유지한다. ‘백업 파일 복원’은 .mspygame.json/.json 또는 .py 파일을 별도로 연다.
- ‘실행’을 누르면 준비 후 코드가 자동 실행된다. 별도 게임 시작 버튼은 없다. 키보드/마우스는 게임 화면 포커스에서 사용한다. ‘정지’는 현재 작업을 취소하고 초기화하며, 실행 환경은 다음 실행을 위해 유지한다.

## 설계에서 구체화한 결정

### 실행과 격리

Pygbag archive `0.9`, CPython 3.12, 관찰된 pygame `2.5.0.dev1` 조합을 사용한다. 현재 런타임 식별자는 `pygame-web-0.9-cp312-v1`이다. 배포 시 무조건 최신 버전으로 바꾸지 않는다. 런타임 바이너리와 초기화 스크립트는 pygame-web 공식 CDN에서 로드하므로 첫 실행에는 인터넷이 필요하다. archive 경로 고정은 원격 파일 전체의 불변 해시 보장과 다르다.

`runtime/python-game-runner/index.html`을 `srcdoc`로 주입하고 `sandbox="allow-scripts"`를 적용했다. 동일 origin 권한은 주지 않으므로 실행 문서는 고유 opaque origin이며 부모 DOM·localStorage에 접근하지 못한다. 별도 도메인 배포가 없어도 동작하도록 한 초기 구현 결정이다. 전용 도메인을 별도로 운영할 때 사용할 독립 실행 서버도 `npm run dev:python-game-runner`로 제공한다.

입력 파일은 HTML에 삽입하지 않고 MessageChannel로 전달한다. 프레임 식별·프로토콜 버전·runId를 확인한다. 캐시가 빠를 때 load 이벤트를 놓치는 상황은 반복 HELLO/일회 연결로 복구한다. 네트워크 접근은 CSP로 런타임 CDN에 제한하며 인증 토큰을 전달하지 않는다. Python↔JS 문자열은 Base64 UTF-8을 거쳐 한글 깨짐을 막는다.

웹 실행에는 협력적 스케줄링이 필요하다. 기본 모듈 수준 pygame 반복문은 실행용 AST에 자동 yield를 삽입하므로 사용자가 async 코드를 직접 추가하지 않아도 된다. 제공 게임은 main/pause_game/check_collision/update 호출 체인을 async로 옮겼고 초기 running 덮어쓰기를 수정했다. 임의의 학생 코드를 정규식으로 재작성하지 않는다. 동기 무한루프는 프로젝트 코드의 trace 시간 제한으로 중단한다. C 확장 내부의 긴 작업이나 의도적인 trace 해제까지 강제 선점하는 Worker 샌드박스는 아니며, 브라우저 프로세스 강제 격리를 보장하지 않는다.

스튜디오 세션당 하나의 interpreter/iframe을 준비하고 재사용한다. 실행마다 사용자 namespace·프로젝트 모듈·파일·async 작업·타이머·pygame 화면/사운드 상태를 정리한다. 화면을 떠나거나 탭이 숨겨지면 정지한다. 오류는 원본 파일/줄번호로 표시한다. 게임 실행·점수는 메타센스 진도·보상 근거로 사용하지 않는다.

### 사운드 변환

공식 wasm-media-encoders `0.7.0`을 lazy load해 브라우저에서 MP3/WAV → OGG Vorbis로 변환한다. 별도 변환 서버·SharedArrayBuffer가 필요하지 않다. PCM 디코드는 OfflineAudioContext를 사용하며 변환 중 UI에 제어권을 반환한다. 최대 2분·모노/스테레오를 허용한다.

원본 파일은 저장/다운로드에 그대로 보존한다. 실행기에 전달하는 바이트만 OGG로 대체하며 SDL_mixer의 헤더 판별을 사용하므로 `Sound("sound.mp3")` 같은 원래 파일명도 유지된다. 직접 OGG 사본을 만들어 다운로드하는 기능도 있다. 실제 테스트에서 MP3 직접 재생 실패를 재현한 후 이 경로로 로딩/채널 재생 호출을 확인했다.

### 저장

- IndexedDB 초안: UID+projectId별 자동 저장. 낡은 탭이 최신 초안을 덮어쓰면 CAS로 차단하고 충돌 사본을 생성한다. 원본 프로젝트 두 개가 실제 브라우저에서 보존되는지 검증했다.
- 클라우드 저장/목록 UI와 callable 서비스, 서버 함수, 전용 규칙, 계정 삭제 연동을 제거했다. 프로젝트 파일은 기기 초안과 다운로드로 관리한다.
- 파일 검증은 `src/components/PythonGameStudio/projectPolicy.mjs`에서 처리한다. 파일 100개, 코드당 200 KiB, 에셋당 5 MiB, 프로젝트 합계 6 MiB 한도를 유지한다.
- 오프라인 저장은 이미 열린 편집 화면에서 동작한다. 네트워크 없이 앱/런타임을 최초 로드하는 완전 오프라인 PWA는 아니다.

## 수행한 검증

- 사용자 수정 요청 반영 후: Chrome에서 최초 빈 main.py, 새 프로젝트 빈 코드, 새로고침 후 빈 상태 유지, 기존 코드 보존, 클라우드 UI/API 호출 없음 확인. 검증 테스트 6개, scoped ESLint, production build 통과.

- `npm run test:python-game-studio`: 경로 탈출/중복/가짜 파일/용량·revision/한글 직렬화/서버 필드 주입 방지.
- `scripts/qa-python-game-studio.mjs`: 실제 Chrome에서 마우스 입력, 한글 출력, opaque origin 격리, 동기 무한루프 복구, NameError/SyntaxError, 오류 줄 이동, PNG/TTF/MP3 업로드, OGG 변환, 게임 렌더링, 몬스터 이동·안전지대·충돌 점수·게임오버/재시작, 20회 재실행과 단일 iframe 유지, 좁은 화면을 확인했다.
- `scripts/qa-python-game-drafts.mjs`: 두 탭 충돌, 오프라인 편집 저장, 사용자별 초안 분리, 다운로드/가져오기를 확인했다.
- 기존 `test:course-2d`, `test:course-planets`, `test:overlay-interaction` 통과. 새 코드 대상 lint와 production build 확인.
- 소리는 유효한 디코딩·길이·pygame 재생 호출을 확인했다. 스피커 청취, Safari/Firefox, 모바일 터치 게임 조작, WASM 메모리 장기 추세는 아직 확인하지 않았다.

브라우저 QA에는 `PLAYWRIGHT_MODULE`, `CHROME_PATH`, `GAME_STUDIO_QA_URL`을 지정할 수 있다. 폰트/MP3 테스트에는 `GAME_STUDIO_QA_FONT`, `GAME_STUDIO_QA_MP3`를 지정한다. QA 이미지 기본 출력은 `/tmp/metasense-pygame-qa`다. 미디어 파일을 제공하지 않은 실행은 해당 업로드 검사를 생략한다.

## 배포와 후속 범위

초기 MVP는 빈 프로젝트 생성·편집·직접 업로드·게임 실행·기기 초안·메타센스 진입까지다. 클라우드 저장은 범위에서 제외했으므로 이 기능을 위한 서버 함수/규칙 배포는 필요 없다. 웹 번들은 아직 운영 배포하지 않았다.

단원별 과제 제출의 불변 revision, 일일 학습 집계, 게임 공개 URL/공개 취소, AI 힌트, 모바일 터치 조작은 원래 설계의 후속 단계로 남긴다. 기존 과제 피드백·광석 지급·루미 실행 정책은 변경하지 않았다.

## 출처와 에셋

- 런타임: https://github.com/pygame-web/pygbag 및 https://pygame-web.github.io/archives/0.9/
- 오디오 변환기: https://github.com/arseneyr/wasm-media-encoders (npm MIT, Ogg/Vorbis 포함 라이선스는 패키지/업스트림 참조).
- `public/python-game-examples`의 PNG는 코드로 그린 단순 도형, OGG는 합성 사인파다. `monster-main.py`는 사용자가 제공한 코드를 웹용으로 이식했다.
- 테스트에 사용한 시스템 폰트는 제품에 복사하거나 배포하지 않았다. 제품 예제는 pygame 기본 폰트를 사용한다.

## 프로젝트 목록 변경 (2026-09-09)

- 프로젝트별 삭제 버튼 및 이름이 표시되는 삭제 확인창을 추가했다. 취소 가능. 현재 프로젝트 삭제 시 남은 최신 초안을 열고, 마지막 프로젝트 삭제 시 빈 main.py 프로젝트를 만든다.
- 삭제 전 자동 저장 큐를 정리하고 예약된 저장을 무효화해 같은 프로젝트가 되살아나지 않도록 처리한다. 다른 탭의 뒤늦은 편집은 기존 CAS 정책에 따라 별도 사본으로 보존한다.
- 프로젝트 가져오기 handler/ref/버튼/input은 주석으로 보류했다. 이미지·폰트·사운드·Python 파일 업로드는 계속 지원한다.
- 검증: `scripts/qa-python-game-project-deletion.mjs` (취소, 비활성/현재/마지막 프로젝트 삭제, 새로고침, 사용자 격리, 다른 탭 편집 보존, 가져오기 숨김), 파일 검증 6개, scoped ESLint, build.

## 추가 시작 클릭 제거 (2026-09-09)

- READY 뒤 클릭 대기를 제거했다. print 등 일반 Python도 실행 버튼 한 번으로 출력/종료한다. pygame 준비는 프로젝트 Python AST의 import/from/dynamic import 사용 여부로 결정하며, pygame.init()은 사용자 코드에서 실행한다. 보조 모듈과 별칭도 지원한다.
- 오디오 준비는 실행을 막지 않는다. AudioContext가 suspended 상태에서 재생을 요청한 경우에만 작은 클릭 안내를 표시하고 게임 화면의 실제 pointer/key 입력으로 resume한다. 별도 소리/게임 시작 버튼은 없다.
- Chrome `qa-python-game-autorun.mjs`: print 출력/pygame 미로드/오디오 안내 없음, 보조 모듈의 from pygame import display와 자동 창 생성, 차단된 Web Audio를 게임 화면 클릭으로 재개 확인.
- 기존 런타임 QA를 자동 시작 방식으로 갱신. 한글/마우스/격리/오류/무한루프/MP3 변환/몬스터 게임/20회 실행 검사 및 lint·정책 검사·build 확인.
- 브라우저 오디오 정책 참고: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay

## 반복 실행 성능 개선 (2026-09-09)

- 이전 구조는 실행할 때마다 iframe/WASM을 재생성했다. 지금은 화면 진입 시 한 번 사전 준비하고 MessageChannel protocol v2의 RUN/STOP으로 실행을 교체한다. 일반 재실행은 준비 화면을 다시 띄우지 않는다. 첫 pygame 패키지 준비도 이후 실행에서 재사용한다.
- sessionId/runId로 이전 실행의 출력/종료 이벤트를 걸러낸다. 정지는 실제 task cancellation·pygame.quit·namespace/module/file 정리 후 승인된다. 정리 불응 또는 엔진 무응답일 때만 iframe을 복구한다. 숨긴 탭의 animation frame 정지는 엔진 고장으로 판단하지 않는다.
- 프레임을 CSS visibility:hidden으로 숨기면 Chrome이 Python 스케줄링도 멈추므로, 정지 화면은 iframe 위에 덮는 방식으로 표시한다. 페이지를 나가면 iframe은 제거된다.
- Chrome 측정: 20회 재실행 중앙값 405 ms, 최대 439 ms, 초기 실행 926 ms. 캐시와 기기/네트워크 상태에 따라 달라지며 클릭 자동화/출력 관찰 시간을 포함한다. 전체 검사 동안 main.js/main.wasm은 각 한 번만 요청했다.
- `qa-python-game-session.mjs`: 새 globals/파일, 보조 모듈 내용 교체·삭제, 5회 pygame 화면/사운드 시작·정지, background task/timer 취소, 무한루프 후 복구, 동일 엔진 유지 확인.
- 이는 새 OS 프로세스 수준의 격리는 아니다. 학생 코드에서 임의의 런타임 내부나 전역 JS를 변조하는 경우까지 완전 초기화를 보장하지 않으며, 브라우저 탭을 새로 열거나 앱을 다시 방문하면 실행 환경을 다시 준비한다.

## 기본 pygame 동기 반복문 지원 (2026-09-09)

- 사용자 제공 코드(`pygame.init()`, 800×600 화면, ‘게임 왕국’, 모듈 수준 `while running`/event.get/display.update/quit)를 그대로 실행할 수 있도록 변경.
- AST로 pygame import/별칭/from import와 모듈 수준 while/for의 display.update/flip/event.get/poll 호출을 식별한다. 해당 게임 루프 시작에 await를 추가한 실행용 사본을 PyCF_ALLOW_TOP_LEVEL_AWAIT로 컴파일한다. 원본 파일/편집기/다운로드와 줄 번호는 보존한다.
- 함수로 감싸지 않으므로 globals와 전역 변수를 읽는 사용자 함수의 의미를 유지한다. continue도 화면 갱신을 막지 않게 루프 시작에서 양보하며, 중첩 이벤트 루프마다 불필요하게 양보하지 않는다.
- 적용 범위는 모듈 수준에서 직접 pygame 화면/이벤트 API를 호출하는 기본 게임 루프다. 기존 async 함수는 그대로 실행한다. 동기 함수/메서드 내부의 게임 루프, 동적으로 간접 호출하는 렌더 함수까지 자동 async로 변경하지 않는다. 이러한 복잡한 코드에는 명시적 async 구성이 필요하다. 관련 없는 동기 무한루프 보호도 유지한다.
- 검증: `python3 scripts/test-python-game-sync.py` 4개 (globals/continue/else, from별칭/for, 원래 오류 줄, 문자열·함수·일반루프 미변경), 실제 Chrome의 `qa-python-game-sync.mjs` (제공 코드 원본 보존·3초 이상 유지·크기/제목·QUIT 종료·마우스·정지·같은 엔진 재실행), 정책 검사 6개 및 production build.

## 작업 영역 크기 조절 (2026-09-09)

- 파일 탐색기/소스코드/게임 화면 사이 2개 경계와 게임/출력·오류 사이 경계를 pointer capture로 드래그할 수 있다. 드래그 중 iframe 입력을 잠시 차단해 경계를 넘어서도 조절이 끊기지 않는다. 실행 프레임을 다시 만들지 않는다.
- 최소 너비/높이를 유지하며 창 크기가 바뀌면 보이는 범위로 제한한다. 좁은 화면에서는 코드/게임 경계가 높이 조절로 전환된다. 전체 화면에서는 출력 경계를 숨긴다.
- 기기 localStorage의 사용자별 layout key로 크기를 기억한다. 경계 더블클릭은 기본 크기 복원, 키보드 방향키/Home/End도 지원한다.
- `qa-python-game-layout.mjs`: 실제 Chrome에서 세 경계 드래그, 실행 중 게임/마우스 입력 유지, 새로고침 복원, 키보드/더블클릭/최소 크기, 좁은 화면 조절 검증. scoped lint 및 production build 통과. 화면 `/tmp/metasense-pygame-layout.png` 확인.

## 프로젝트 가져오기 재개 및 오류 처리 (2026-09-09)

- 앞선 가져오기 보류를 사용자 요청으로 해제했다. 실제 파일 선택 버튼을 복원하고 지원 형식(.mspygame.json/.json/.py)을 표시한다. .py는 파일명을 유지한 새 프로젝트가 된다.
- 과거 handler는 async switchProject 완료를 기다리지 않아 전환 실패에도 성공 안내를 표시할 수 있었다. 현재 작업 저장과 가져온 사본의 IndexedDB 저장/전환 완료 후에만 성공 표시한다. 실패하면 기존 프로젝트/모달을 유지한다.
- 별도 Worker에서 File 읽기·JSON 파싱·경로/용량/에셋 검증을 수행한다. 진행 문구와 버튼 잠금, 손상/미지원 형식/저장 실패 안내, 20초 Worker timeout, 같은 파일 재선택을 처리한다. 원본 프로젝트는 덮어쓰지 않는다.
- Chrome `qa-python-game-import.mjs`: 실제 picker → 다운로드한 코드·이미지·OGG·TTF 바이트 복구, 즉시 기기 저장, 새로고침, 중복 파일 재선택, 손상 JSON/스키마/ZIP 오류, .py 실행, 3 MiB 추가 이미지 데이터, 강제 저장 실패 시 기존 작업 보존·재시도 버튼 복구 확인. 정책 검사 6개, lint/build 통과.
- 이전 사용자의 실패 당시 파일/브라우저 로그는 없어 동일 원인이라고 단정하지 않는다. 확인된 비동기 처리 결함을 고치고 지원 경로 및 오류 경로를 직접 검증했다.

## 로컬 폴더를 프로젝트로 가져오기 (2026-09-09)

- 사용자 의도에 맞춰 ‘프로젝트 가져오기’는 directory picker로 변경. 기존 파일 기반 가져오기는 ‘백업 파일 복원’으로 분리.
- 폴더 이름이 프로젝트 이름이 되며 루트 경로 한 단계만 제거한다. 하위 Python/PNG/JPG/WebP/OGG/WAV/MP3/TTF/OTF 경로와 바이트를 보존한다. worker 전송 시 webkitRelativePath를 문자열로 따로 전달한다.
- 루트 main.py 우선, Python 파일 한 개면 해당 파일 자동 선택. 나머지는 실행 파일 선택창을 제공하며 취소할 수 있다. Python이 없거나 한도를 넘거나 경로가 충돌하면 기존 프로젝트를 보존하고 오류를 표시한다.
- 숨김/환경 폴더(.venv, .git, __pycache__, venv, env, node_modules 등)와 미지원 파일은 읽기 전에 제외하고 개수를 표시한다. 기존 100파일/6MiB 한도를 적용한다. 빈 폴더 자체는 File API에서 전달되지 않아 별도 보존하지 않는다.
- 가져온 프로젝트는 브라우저 IndexedDB 사본이다. 원본 로컬 폴더에 대한 실시간 연결이나 자동 덮어쓰기는 하지 않는다.
- 검증: 실제 Chrome directory picker로 중첩 모듈·이미지·TTF·OGG 가져오기/실행, 같은 폴더 재선택, 실행 파일 선택/취소, Python 없는 폴더 오류. `test-python-game-folder.mjs` 4개 통과, scoped lint/build 통과.

## 하위 폴더 생성과 파일 탐색기 (2026-09-09)

- 탐색기 상단 ‘폴더 만들기’ 추가. 선택한 폴더 기준으로 새 폴더/파일을 만들고 업로드한다. 대화상자와 하단에 대상 위치를 표시하며 ‘프로젝트 루트’로 최상위 위치를 선택할 수 있다.
- 폴더와 하위 파일을 들여쓴 탐색기로 표시한다. 하위 경로(`assets/images`)도 한 번에 만들 수 있다.
- schemaVersion 1에 선택적 folders 배열을 추가해 기존 프로젝트와 호환하며 빈 폴더를 보존한다. 상위 폴더를 추론하고 파일/폴더·대소문자 충돌, 경로 탈출, 100폴더 제한을 검증한다.
- 실행 payload에 폴더 목록을 전달하고 Python 실행 전에 생성한다. 브라우저 초안·프로젝트 백업·복원에서도 빈 폴더를 보존한다.
- Chrome `qa-python-game-folders.mjs`: 중첩 폴더, 폴더 안 이미지 업로드·Python 파일 생성, 빈 디렉터리 Python 접근, reload, 충돌 거부, 백업 복원 확인. 정책 검사 8개·폴더 가져오기 검사 4개 및 lint/build 통과.

## 파일을 하위 폴더로 이동 (2026-09-09)

- 탐색기 파일을 폴더/프로젝트 루트 위에 드래그하면 이동한다. 컴퓨터 파일을 폴더 위에 놓으면 해당 폴더에 업로드한다. 기존 최상위 drop capture를 일반 bubbling handler로 바꿔 폴더가 지정한 업로드 위치를 우선한다.
- 드래그 대상 강조, 폴더 선택 시 펼치기, 별도 접기 버튼을 제공한다. 드래그 대안으로 파일 선택 → 편집기 상단 ‘이동’ → 대상 폴더 선택을 제공하며, 폴더 선택 후 ‘파일 올리기’도 유지한다.
- 경로만 변경하고 코드/에셋 바이트는 보존한다. 실행 파일을 옮기면 entrypoint도 갱신한다. 동일 이름 충돌은 덮어쓰지 않고 안내하며 원본과 대상 모두 보존한다. 코드 안의 import/에셋 경로 문자열은 자동 수정하지 않으며 이동 안내에서 경로 확인을 요청한다.
- 검증: 정책/폴더/이동 단위 검사 14개, scoped ESLint, production build 통과. Chrome `qa-python-game-file-move.mjs`로 실제 파일 dragTo, 외부 PNG DataTransfer drop(선택 폴더와 다른 대상), 이동 메뉴, 충돌 보호, 새로고침 후 바이트/경로 보존 및 옮긴 실행 파일 실행 확인. 화면 `/tmp/metasense-pygame-file-move.png` 시각 확인. 폴더 자체 이동/다중 파일 선택 이동은 이번 범위에 포함하지 않음.

## 현재 열린 Python 파일 실행 (2026-09-09)

- 실행은 현재 편집 중인 Python 파일을 실행용 entrypoint로 사용한다. 저장된 프로젝트 기본 entrypoint를 바꾸거나 ‘기본 실행 파일로’를 누를 필요가 없다. 이미지/사운드/폰트 미리보기에서는 기존 기본 entrypoint를 사용한다.
- 실행 버튼 옆에 대상 경로를 표시하고 탐색기 표시는 ‘기본’, 지정 버튼은 ‘기본 실행 파일로’로 명확히 했다. 오류 줄 이동은 해당 파일의 폴더 선택도 갱신한다.
- Chrome `qa-python-game-active-file.mjs`: main.py 게임 → images/test1.py 출력, 이전 캔버스/출력 전환, 동일 인터프리터 유지, 최신 편집 내용, 하위 파일 traceback/오류 줄 이동, main.py 재선택, 에셋 미리보기 기본 실행 및 저장된 entrypoint 미변경 확인. scoped lint 및 production build 통과.

## 학생용 코드 색상과 놀이터 (2026-09-09)

- Game Studio의 PythonEditor에만 opt-in 문법 색상을 적용. Python 파서 태그로 변수/함수/클래스 정의/문자열/숫자/키워드/주석을 구분하고 괄호 짝과 현재 줄을 강조한다. 타입 추론 기반 의미 분석은 아니므로 클래스 생성 호출 등은 Python 파서의 호출 태그를 따른다. 다른 수업 편집기에는 새 색상 확장을 적용하지 않는다. @lezer/highlight를 기존 설치 버전 1.2.3에 맞춰 직접 의존성으로 명시.
- 오로라·캔디·바다 색상과 색상 범례. CSS 변수 전환으로 편집기/실행 환경을 재생성하지 않는다. 사용자별 기기 localStorage에 테마/집중 모드만 저장한다.
- 접을 수 있는 ‘코드 놀이터’에 별명 변수, 주사위 함수, 펫 클래스, pygame 마우스·색상 공 실험 제공. 각 카드에는 바꿔 볼 도전과 코드 미리보기, 새 파일 열기 버튼이 있다. play/ 아래 고유 파일명을 만들며 기존 코드와 기본 entrypoint를 보존한다. 새 프로젝트 main.py는 여전히 빈 파일이다.
- 실제 실행 상태에 따라 짧은 관찰/오류 안내를 출력 위에 표시. 실행 완료는 정답/학습 완료 판정이 아니다. 집중 모드는 놀이터와 피드백을 숨기고 문법 색상은 유지한다. 별 표시의 짧은 애니메이션은 prefers-reduced-motion을 존중한다.
- Chrome `qa-python-game-playtools.mjs`: 실제 토큰 색상, 테마 변경, 원본/중복 파일 보존, 네 예제 실행, pygame 마우스/색 변경, 오류/완료 피드백 구분, 집중 모드, 설정 재로딩, reduced motion, 좁은 화면 검증. 데스크톱/좁은 화면 스크린샷 시각 확인, scoped ESLint와 production build 통과.

## 코드 놀이터·작은 도전 제거 (2026-09-09)

- 사용자 요청으로 놀이터 열기 버튼, 네 실험 카드·미리보기·도전 문구, 새 실험 파일 생성 핸들러/템플릿과 관련 스타일을 제거했다.
- 문법 색상·세 테마·집중 모드·실행 피드백은 유지한다. 기존 프로젝트에 이용자가 생성/편집한 파일은 삭제하지 않는다. 앞선 놀이터 구현 기록은 과거 이력이다.
- Chrome에서 놀이터 부재, 문법 색상과 테마·집중 설정/코드 저장 유지 확인. 관련 lint와 production build 통과.

## 과제 기록소 첨부와 새 탭 (2026-09-09)

- 과제 파일 버튼을 ‘내 컴퓨터 파일 추가’로 명시하고 Python/python·파이썬 과제에만 ‘게임 스튜디오에서 추가’를 제공. 같은 UID의 로컬 IndexedDB 초안을 읽는 lazy picker이며 파일 선택/프로젝트 전체 두 방식을 제공한다.
- 개별 파일은 프로젝트명/하위 경로와 원문 또는 바이너리 바이트를 유지한 File 사본이다. 프로젝트 전체는 검증된 .mspygame.json으로 코드·에셋·빈 폴더를 담으며 기존 ‘백업 파일 복원’으로 열 수 있다. 첨부 직전에 해당 UID의 최신 저장본을 다시 읽고 삭제/경로 변경은 오류로 처리한다. 목록 새로고침·빈 목록·읽기 실패 안내 포함.
- File 사본을 SubmissionPanel의 기존 파일 추가/초안 저장/첨부 목록/전송 경로에 전달한다. 선택 중에는 서버 전송하지 않으며 과제 전송 시 기존 assignments/{uid}/... Storage 경로에 업로드한다. 저장 경로에 UUID를 더해 동명 파일 충돌을 방지한다. 첨부 준비 중 과제 전송을 잠그고, 전송 중 picker도 잠근다. 선택 후 원본 변경은 사본에 자동 반영하지 않는다.
- 피드백/승인/보상/공개 정책은 변경하지 않는다. 다른 과정에는 스튜디오 첨부가 표시되지 않는다.
- 2D·3D 스튜디오 진입은 /python-game-studio를 noopener/noreferrer 새 탭으로 연다. 과제 picker에서도 동일한 새 탭 링크 제공. 독립 스튜디오는 onBack을 전달하지 않아 이전 화살표를 숨기고, 기존 embedded/legacy 진입의 onBack은 유지한다. 인증·수강 권한 조건 유지.
- 검증: 첨부 스냅샷·Unicode/이미지 바이트·하위 경로·빈 폴더·잘못된 경로 단위 검사 3개, 2D 과정 계약 검사, 관련 ESLint/build 통과. Chrome fixture에서 실제 picker의 UID 목록 분리·최신 저장본·첨부 후 불변성·개별 파일·삭제 오류·빈 상태·새 탭/opener 차단·독립 편집기 화살표 부재 확인. 실제 로그인 과제 전송/Storage 업로드와 운영 배포는 수행하지 않았다.

## 과제 첨부를 Python 파일로 제한·새로고침 수정 (2026-09-09)

- 사용자 변경 요청으로 프로젝트 전체(.mspygame.json) 첨부와 방식 선택을 제거했다. 스튜디오 파일 목록/개수는 .py만 표시하고, File 생성 단계에서도 비-Python 첨부를 거부한다. 프로젝트 백업/복원 기능 자체와 내 컴퓨터 첨부는 유지한다.
- 새로고침 시 currentView=assignment_hub만 복원하고 selectedClusterId는 null로 시작하던 문제 확인. 과제 기록소에서만 route state/query 또는 세션의 과목을 초기 복원한다. 일반 NAV의 Multi-Verse 첫 진입은 그대로 null을 유지한다. 인증·과정 카탈로그가 준비되기 전에 임시 목록으로 복원한 과목을 지우지 않도록 검증 효과를 제한한다.
- 별도의 useLearningHistory 오류는 assignments(userId ASC, submittedAt ASC) 복합 인덱스 누락이다. 소스 인덱스 정의 추가, 운영 인덱스 CICAgLix9IYK 한 개만 생성했다. 인덱스 준비 상태/조회 검증은 STATE의 최종 기록 참조.
- Python 첨부/과목 복원 단위 3개, NAV/2D 계약 검사, 관련 ESLint/build 통과. 실제 Chrome fixture에서 이미지·전체 첨부 제외, Python 선택/스냅샷 보존, 새로고침 시 과목 복원 확인. 로그인된 실제 과제 전송 및 웹 배포는 미실시.

## 실행기 콘솔 로그 정리 (2026-09-09)

- 첨부 로그의 대부분은 Pygbag 0.9 초기화 진단이다. upstream이 quiet=true를 false로 재설정하며 bootstrap 스크립트 전체·config·정상 fetch를 출력한다. hash/blanker SecurityError는 opaque sandbox에서 상위 창을 탐색한 뒤 잡아서 처리하는 capability probe임을 소스에서 확인했다.
- runtime HTML 시작부의 iframe 전용 console policy로 확인된 정상 메시지만 제외한다. 부모 페이지 console, 미확인 경고/오류, 실패 HTTP 상태, uncaught 에러는 유지한다. BrowserFS는 이 실행기의 Emscripten FS와 별개의 선택 기능이며 없어도 실행/파일 로딩이 동작한다. sandbox 권한을 넓히지 않는다.
- Python print/traceback은 기존 StudioOutput→MessagePort 경로를 유지한다. 개발자는 DevTools에서 실행기 iframe 컨텍스트를 선택해 studioSetRuntimeDiagnostics(true)로 이후 전체 로그를 다시 볼 수 있고 false로 복귀한다. 필터 판별 실패 시 원본 메시지를 그대로 출력한다.
- Chrome에서 cold boot, pygame 화면/마우스, 동일 인터프리터 재실행, print와 ValueError 출력, 부모 console·미확인 warn/error 보존, 진단 모드 전환 확인. 대량 bootstrap/config 로그는 사라졌다. Vite/React 개발 안내, 브라우저 ScriptProcessorNode deprecated 경고, 미확인 upstream focus/blur DISCARD 로그는 남긴다.
- rhwpDev.help() 안내는 src/public/runtime 검색에서 찾지 못했다. 외부 도구/확장 출처 가능성이 있으나 확정하지 않으며 전역 console 차단으로 숨기지 않았다.
- 단위 검사와 scoped ESLint, production build 통과. 실제 서비스 배포는 하지 않음.
