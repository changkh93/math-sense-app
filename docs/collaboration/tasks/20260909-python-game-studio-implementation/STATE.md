# Python Game Studio 구현

- ID: 20260909-python-game-studio-implementation
- Original goal: 승인된 pygame 온라인 IDE 설계에 따라 이미지·폰트·사운드 직접 업로드, 편집·실행·저장, 메타센스 진입을 구현.
- Phase: DONE (local MVP, warm runtime; not deployed)
- Last updated: 2026-09-09 KST
- Coordinator: Codex, 모델 전환 없음.
- Baseline: 1a5caaa03079477a2c9eb199d4dd6e25a20995f4
- Existing dirty state: 앞선 설계 문서, 설계 STATE, INDEX 수정만 존재. 보존.
- Workspace: 현재 math-sense-app. Codex 단독 작성. 외부 전달/별도 worktree 없음.
- Scope: PythonGameStudio UI, runner, 저장 계약/서비스/규칙, 메타센스 진입, 예제, 관련 검증·문서. 기존 과제 피드백·보상 판정은 변경하지 않음.
- Acceptance: 동적 Python/에셋 주입과 pygame 실행; 이미지·폰트·사운드 업로드/미리보기; 키보드/마우스; 오류 콘솔; 정지/재실행; 로컬 복구 및 개인 프로젝트 저장; 기존 루미/과정 격리; 실제 브라우저 및 관련 테스트.
- Dependency order: A runner 검증 → B 편집/업로드/저장 → C 기존 앱 진입 및 QA. 공개 링크/AI 힌트/모바일 터치는 설계의 후속 확장으로 분리.
- Local progress: CodeMirror 기반 스튜디오, 직접 파일 업로드/교체/미리보기, 격리 pygame runner, MP3/WAV→OGG 브라우저 변환, 오류 콘솔, 기기 초안/CAS, callable 개인 저장, 파이썬 성단 2D/3D 진입, 웹용 몬스터 예제 구현 완료.
- Checks: 새 코드 lint, production build, python-game-studio 6개 검사, course-2d/course-planets/overlay-interaction 통과. Firestore Emulator의 권한·학생 격리·CAS·할당량 검사 통과(바이트 저장은 메모리 대역). 실제 Chrome에서 PNG/TTF/MP3/한글 경로, 마우스, 오류 이동, 동기 무한루프 복구, 몬스터 충돌/게임오버/재시작, 20회 실행/정지, 좁은 화면 검증. 두 탭 충돌 보존·오프라인 초안·프로젝트 가져오기/내보내기 통과.
- External packets/returns: 없음. 실행기 불확실성을 먼저 직접 해결하고 연계 작업을 구체화.
- Next action: 요청 시 웹 번들 배포. 사용자 변경 요청으로 클라우드 저장 및 서버 배포 필요성 제거.
- Limitations: 운영 배포·실제 GCS/Auth 저장·Safari/Firefox·스피커 청취·장기 WASM 메모리 측정 미수행. 원본 게임 에셋 대신 기본 도형/합성 효과음과 별도 업로드 폰트로 검증. opaque iframe+trace는 C 내부의 장시간 작업까지 강제 선점하는 Worker가 아님.

- Artifacts: `docs/python-game-studio-implementation.md`; 이 폴더 `verification/`의 화면 3개, browser-qa.txt, draft-qa.txt.
- Runtime finding: 캐시된 iframe load 이벤트 누락 가능성을 발견해 HELLO/MessageChannel 연결 복구 추가 후 20회 연속 검증 통과.
- Saving decisions: 초안 자동 저장 + 클라우드 수동 저장. 초기 총량 6 MiB/프로젝트, 20개/회원. 파일 원본 보존, 실행 바이트만 OGG 변환. 기존 사용자 계정 삭제에 프로젝트 정리 경로 추가.
- Preview: Vite local server `http://127.0.0.1:5179/dev/python-game-studio` 실행 중. Codex 오른쪽 브라우저 탭 열기 요청 queued. 독립 runner 및 Firestore 테스트 서버는 종료.
- No external app dispatch, no user-owned task creation, no production data writes, no commit/deployment.

## 사용자 수정 요청 반영 (2026-09-09)

- 새 프로젝트는 빈 `main.py` 하나로 시작. 자동 예제 코드를 없애고 기존 초안 및 명시적 몬스터 예제 선택은 보존.
- 클라우드 저장 버튼/목록/API, 서버 함수, 전용 규칙, 계정 삭제 연동, cloud emulator script 제거. 앞선 클라우드 구현/검사 기록은 과거 이력이다.
- 파일 정책을 frontend `projectPolicy.mjs`로 이동. 기기 초안 및 파일 다운로드/가져오기는 유지.
- Chrome 검증: 최초/새 프로젝트 빈 코드, 새로고침 복구, 기존 코드 보존, cloud UI/API 호출 없음 통과. `test:python-game-studio` 6개, scoped lint, build 통과.
- 운영 배포 없음.

## 프로젝트 삭제 및 가져오기 보류 (2026-09-09)

- 목록의 개별 삭제 버튼/확인창 구현. 활성 프로젝트 및 마지막 프로젝트 삭제 시 편집 화면 전환. 예약 자동 저장이 삭제를 취소하지 않도록 가드 추가.
- 프로젝트 가져오기 UI/ref/handler 주석 처리. 파일 업로드/다운로드는 유지.
- Chrome 삭제 QA: 취소, 비활성/마지막 활성 삭제, 새로고침, UID 격리, 다른 탭 수정 시 별도 사본 보존. scoped lint, 정책 테스트 6개, production build 확인.
- Phase remains DONE (local, not deployed).

## 실행 버튼 한 번으로 실행 (2026-09-09)

- 사용자 요청: print 코드에도 노출되던 ‘게임 시작 · 소리 켜기’ 제거, pygame 자동 준비.
- READY 클릭 대기 삭제, 일반 Python은 pygame 사전 준비 생략, AST로 보조 모듈·별칭 import 감지. 사용자 init 호출 유지.
- 브라우저가 오디오를 차단할 때만 클릭 안내, 정상 게임 입력으로 resume. 실행 자체는 차단하지 않음.
- Chrome 자동 실행 QA(print/보조 모듈 pygame/오디오 resume) 통과. 기존 게임 회귀·연속 20회 재실행, lint, 정책 6개, build 검증.
- Phase remains DONE (local, not deployed).

## 실행 환경 재사용 (완료)

- 반복 실행마다 iframe과 WASM을 재생성하던 원인 확인. 세션당 한 번 로드하고 실행/정지 명령을 전달하는 방식으로 변경 완료.
- 파일/사용자 모듈/전역 이름/async 작업/타이머/pygame 상태 정리 검증 완료. 20회 warm median 405 ms, max 439 ms; main.js/main.wasm 각 1회. pygame 화면/사운드 5회 재시작 및 정지·무한루프 복구도 같은 엔진 유지.

## 기본 pygame while 루프 자동 지원 (2026-09-09)

- 사용자 코드의 동기 while running이 trace 시간 제한에 걸리는 문제 수정. 모듈 수준 pygame 루프의 실행용 AST만 변환하고 원본/줄 번호/전역 변수 의미 유지.
- 실제 사용자 코드로 800×600·게임 왕국 제목·3초 이상 정상 실행·QUIT 종료 검증. 별칭/flip/continue/마우스/정지/동일 엔진 재실행 확인.
- Python 동작 검사 4개, 기존 정책 6개, build 통과. warm runtime 회귀 검증 수행.
- 제한: sync 함수/메서드 내부 루프는 자동 변환하지 않으며, 기존 명시적 async 프로그램은 그대로 지원.
- DONE (local; not deployed).

## 작업 영역 드래그 크기 조절 (2026-09-09)

- 파일/코드/게임 너비, 출력·오류 높이 조절 구현. 최소 크기와 반응형 경계, 사용자별 기기 크기 저장, 더블클릭 초기화, 키보드 지원.
- 실제 Chrome에서 실행 중 게임을 유지한 채 세 경계 드래그·마우스 입력·새로고침·최소 크기·좁은 화면 검증. 화면 시각 확인 및 scoped lint/build 통과.
- DONE (local; not deployed). 기존 다른 작업 문서는 보존.

## 프로젝트 가져오기 재개 (2026-09-09)

- .mspygame.json/.json/.py 가져오기 복원. Worker로 파싱/검증 분리, 읽는 중 표시·실패 안내·재선택 지원.
- 전환 Promise를 기다리지 않던 기존 문제 수정. 현재 작업 및 가져온 사본 저장 완료 후 성공 안내, 오류 때 기존 프로젝트 유지.
- Chrome 실제 picker로 에셋/코드/font round-trip, reload, repeated selection, invalid/large/Python files, quota failure 검증. 사용자 과거 실패 원인은 당시 파일/로그가 없어 확정하지 않음.
- 정책 검사 6개, lint/build 통과. DONE (local; not deployed).

## 프로젝트 = 로컬 폴더 가져오기 (2026-09-09)

- 사용자 정정 반영: ‘프로젝트 가져오기’는 폴더 선택, 기존 JSON/Python 파일 가져오기는 ‘백업 파일 복원’으로 구분.
- 하위 파일 구조/에셋 보존, 루트 main.py 자동 선택, 여러 실행 후보 선택, 제외 파일 개수 표시, 오류·취소 시 기존 프로젝트 유지.
- 실제 디렉터리 chooser에서 하위 모듈/이미지/font/sound 실행과 재선택·진입 파일·오류 경로 확인. 폴더 정책 검사 4개, lint/build 통과.
- 로컬 원본 폴더와 자동 동기화하지 않고 IndexedDB 사본으로 가져옴. DONE (local; not deployed).

## 하위 폴더 만들기 (2026-09-09)

- 폴더 만들기 버튼, 폴더 탐색기, 선택 위치 기준 파일/폴더 생성·업로드, 루트 선택 추가.
- 선택적 folders 스키마와 빈 폴더의 초안/백업/runner 보존. 기존 프로젝트 호환 및 파일·폴더 충돌/경로 검증.
- 실제 Chrome에서 생성·업로드·Python 디렉터리 접근·새로고침·백업복원, 정책 8개·폴더검사 4개, lint/build 확인. DONE (local; not deployed).

## 파일 드래그 이동 및 대안 메뉴 (2026-09-09)

- 기존 파일 → 폴더/루트 드래그 이동, 컴퓨터 파일 → 폴더 업로드, 파일 ‘이동’ 대화상자 구현. 선택과 접기 분리 및 드롭 대상 강조.
- 상위 capture handler가 폴더 drop보다 먼저 업로드하던 구조 개선. 경로 변경 시 entrypoint 갱신, 바이트/빈 폴더 보존, 동일 이름 덮어쓰기 방지. 코드 내부 경로 문자열은 이용자 확인 필요.
- Chrome 실제 내부 드래그, 외부 PNG drop, 이동 메뉴, 충돌 시 양쪽 파일 보존, reload/실행 검증. 정책·폴더·이동 검사 14개, scoped lint/build 통과. 스크린샷 시각 확인.
- DONE (local; not deployed). 별도 외부 전달 없이 Codex에서 완료.

## 열린 Python 파일 바로 실행 (2026-09-09)

- 현재 Python 파일을 실행 사본의 entrypoint로 사용. 에셋 미리보기는 기본 파일 실행, 저장 entrypoint는 유지. 실행 대상 경로/기본 표시 개선, 오류 이동 시 폴더 선택 동기화.
- 실제 Chrome에서 게임 → 하위 print 파일, 캔버스/출력 교체, 엔진 재사용, 편집 내용 반영, 하위 파일 오류와 줄 이동, 기본 파일 복귀/에셋 fallback 검증. lint/build 통과. DONE (local; not deployed).

## 초·중등 학생용 코드 놀이터 (2026-09-09)

- 스튜디오 opt-in Python 문법 색상/괄호/현재 줄, 세 가지 팔레트와 범례, 기기별 집중 모드 설정 구현. 기존 타 수업 편집기 동작 보존.
- 코드 미리보기와 바꿔 보기 도전을 담은 네 실험 카드. 기존 파일을 덮어쓰지 않고 고유한 play/*.py 생성, 빈 새 프로젝트와 기본 실행 파일 보존. 실제 실행 상태에 따른 관찰/오류 피드백과 reduced-motion 대응.
- 실제 Chrome에서 색상·모든 예제·pygame 클릭·테마/집중 설정 저장·오류 피드백·좁은 화면 확인. 시각 확인 및 lint/build 통과. 정답/학습 성취 판정이나 외부 보상 기록은 추가하지 않음.
- DONE (local; not deployed). Codex 단독 구현·검증.

## 놀이터와 작은 도전 제거 (2026-09-09)

- 사용자 철회 반영: 놀이터 UI·실험 템플릿·생성 로직·도전 안내 제거. 기존 프로젝트 파일과 색상/테마는 보존.
- Chrome 부재/색상/설정/저장 검사 및 lint/build 통과. DONE (local; not deployed).

## 과제 첨부 통합·새 탭 (2026-09-09)

- 사용자 요청: 과제 기록소에서 로컬 파일과 스튜디오 파일을 구분해 첨부하고, 스튜디오 진입을 이전 화살표 없는 새 탭으로 변경.
- AssignmentHub Python 전용 picker 연결. 프로젝트 전체/개별 파일 사본을 기존 File 임시저장 및 과제 전송 경로에 전달. 최신 저장본 재조회·UID 분리·변경/삭제 오류·전송 중 잠금. Storage 경로 UUID로 동명 파일 충돌 방지.
- 2D·3D 스튜디오 진입 및 picker 링크 새 탭, 독립 편집기 onBack 미지정. 기존 권한/피드백/보상 흐름 유지.
- 첨부 단위 3개, 2D 계약, 관련 lint/build 통과. Chrome fixture에서 실제 picker와 IndexedDB·File 사본·새 탭·화살표 부재 확인. 실제 로그인 제출·서버 업로드는 미실시. DONE (local; not deployed).

## Python 파일 전용 첨부·과제 새로고침·인덱스 (2026-09-09)

- 전체 프로젝트 첨부 제거; .py UI 필터와 생성 단계 강제. 새로고침 시 과제 과목 복원 및 인증/카탈로그 로딩 중 잘못된 초기화 방지. NAV 첫 진입은 유지.
- 첨부/과목 단위 3개, NAV/2D 계약, lint/build, Chrome picker/새로고침 fixture 검증 완료.
- 제출시각 인덱스 누락 별도 확인. 기존 gcloud 인증은 만료, 서버 계정은 생성 권한 없음. 기존 Firebase CLI 로그인으로 assignments(userId ASC, submittedAt ASC) 한 개만 추가. 운영 인덱스 CICAgLix9IYK 생성 중; READY/쿼리 검증 대기. 문서·보안 규칙·기존 인덱스는 수정하지 않음.

### 인덱스 최종 확인

- 운영 assignments 인덱스 CICAgLix9IYK READY 확인. 동일한 userId equality + submittedAt KST 날짜 범위 REST 조회 성공. 실제 학생 대신 존재하지 않는 점검용 UID, 문서 이름 필드/limit 1만 사용했으며 0건 반환. 학생 문서나 제출 상태를 수정하지 않음.
- UI는 로컬 코드·브라우저 fixture·빌드 검증 완료, 웹 배포 전. 인덱스는 운영 반영 완료. DONE.

## 실행기 콘솔 로그 정리 (2026-09-09)

- 첨부 로그의 대부분은 Pygbag 0.9 초기화 진단이다. upstream이 quiet=true를 false로 재설정하며 bootstrap 스크립트 전체·config·정상 fetch를 출력한다. hash/blanker SecurityError는 opaque sandbox에서 상위 창을 탐색한 뒤 잡아서 처리하는 capability probe임을 소스에서 확인했다.
- runtime HTML 시작부의 iframe 전용 console policy로 확인된 정상 메시지만 제외한다. 부모 페이지 console, 미확인 경고/오류, 실패 HTTP 상태, uncaught 에러는 유지한다. BrowserFS는 이 실행기의 Emscripten FS와 별개의 선택 기능이며 없어도 실행/파일 로딩이 동작한다. sandbox 권한을 넓히지 않는다.
- Python print/traceback은 기존 StudioOutput→MessagePort 경로를 유지한다. 개발자는 DevTools에서 실행기 iframe 컨텍스트를 선택해 studioSetRuntimeDiagnostics(true)로 이후 전체 로그를 다시 볼 수 있고 false로 복귀한다. 필터 판별 실패 시 원본 메시지를 그대로 출력한다.
- Chrome에서 cold boot, pygame 화면/마우스, 동일 인터프리터 재실행, print와 ValueError 출력, 부모 console·미확인 warn/error 보존, 진단 모드 전환 확인. 대량 bootstrap/config 로그는 사라졌다. Vite/React 개발 안내, 브라우저 ScriptProcessorNode deprecated 경고, 미확인 upstream focus/blur DISCARD 로그는 남긴다.
- rhwpDev.help() 안내는 src/public/runtime 검색에서 찾지 못했다. 외부 도구/확장 출처 가능성이 있으나 확정하지 않으며 전역 console 차단으로 숨기지 않았다.
- 단위 검사와 scoped ESLint, production build 통과. 실제 서비스 배포는 하지 않음.

- DONE (local; not deployed). Codex 직접 수정·검증.
