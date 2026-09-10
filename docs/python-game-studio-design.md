# MetaSense Python Code Studio 통합 설계

작성: 2026-09-09. 이 문서는 초기 설계 기록이다. 후속 초기 MVP 구현·검증·설계 구체화는 [구현 기록](python-game-studio-implementation.md)을 참조한다.

## 1. 결론과 범위

사용자가 제공한 몬스터 잡기 게임 수준의 온라인 Python 개발 환경은 구현 가능하다. 이미지·효과음·폰트·스프라이트·충돌·키보드·마우스를 지원하는 pygame-ce WebAssembly 실행기를 기존 메타센스에 붙인다. VS Code 전체 기능 대신 파일 탐색기, Python 편집기, 실행/정지, 게임 화면, 오류 콘솔, 저장/불러오기를 제공한다.

Pygbag은 pygame-ce 게임을 웹용으로 패키징하는 도구다. React에 설치하면 온라인 IDE가 완성되는 SDK는 아니다. 특히 편집 중인 코드와 에셋을 실행기에 전달하고 매번 깨끗하게 재실행하는 연결부는 직접 구현·검증해야 한다. 제품 구현의 첫 관문으로 둔다.

목표 환경은 우선 데스크톱 Chrome/Edge, 이후 Firefox/Safari 검증이다. 모바일 게임 감상과 터치 조작은 후속 단계이며, 키보드 게임이 모바일에서 자동으로 조작 가능해지지는 않는다. 터미널, VS Code 확장, 임의 pip 설치, 네이티브 OS 기능, 실시간 공동 편집, 브레이크포인트 디버거는 초기 범위에 넣지 않는다.

## 2. 실제 저장소 조사 결과

기준 커밋: `1a5caaa03079477a2c9eb199d4dd6e25a20995f4`. 조사 시작 당시 작업 트리는 clean.

| 기존 코드 | 확인 내용 | 통합 결정 |
|---|---|---|
| `package.json`, `src/App.jsx` | React 19 + Vite + React Router, Firebase | Next.js 전환 없이 기존 구조 사용 |
| `src/components/PythonWorld/PythonEditor.jsx` | CodeMirror 6 Python 편집기, 스니펫 삽입, 실행 줄 표시 | 편집기 재사용. Monaco 신규 도입은 보류 |
| `src/components/PythonWorld/runtime/pythonWorld.worker.js` | Pyodide 0.29.4, msense/metasense 외 import 제한, 상속 제한 | 루미 학습 실행기를 pygame 용도로 변경하지 않음 |
| `src/components/PythonWorld/runtime/PythonRuntimeClient.js` | 실행 제한 10초, Worker 종료/복구 | 장시간 게임과 별도 수명주기 사용 |
| `src/components/Space/coursePlanetCatalog.js` | `python_project`에 ‘게임 만들기 / Code Studio’ 표시 | 해당 행성의 기존 수업 진입을 유지하고 ‘코드 스튜디오’ 진입 추가 |
| `src/components/Space/SpaceHome.jsx`, `MissionHub.jsx` | 루미 허브와 단원별 미션 화면 연결 | 기존 탐색·복귀 패턴, 수업 메타데이터 연계 |
| `src/components/PrivateRoute.jsx` | 로그인 여부 검사 | 수강 권한은 별도 확인; 로그인만으로 모든 강좌를 허용하지 않음 |
| `firebase.json` | Firebase Hosting `dist`, SPA rewrite | 편집기는 현재 호스팅, 실행기는 별도 origin 배치 |
| `firestore.rules`, `storage.rules` | 기존 학습 기록·업로드 정책 | 새 전용 경로와 명시적 정책 추가 필요 |

## 3. 제공 게임의 호환성 및 필요한 수정

| 사용 기능 | 판단과 검증 조건 |
|---|---|
| `display.set_mode((1200, 700))`, blit, rect | 2D 캔버스 지원 대상. 내부 좌표 1200×700 유지, 화면은 비율에 맞춰 축소 |
| `Sprite`, `Group`, `spritecollideany` | pygame-ce 기능 사용. 실제 충돌·점수·라운드 전환 검증 |
| `image.load`, PNG | 업로드한 파일을 실행기 가상 파일시스템에 원래 상대경로로 배치 |
| `font.Font`, TTF | 폰트 파일 업로드 포함. 누락 시 정확한 파일명 안내 |
| `mixer.Sound`, MP3 네 개 | 원본 MP3 무수정 재생을 보장하지 않음. OGG 변환본과 경로 수정 제공 |
| 방향키, Space, Enter | 게임 영역 포커스·브라우저 기본 스크롤·에디터 입력 충돌 검증 |
| 마우스 위치·클릭·드래그 | 지원 범위에 포함. 제공 게임에는 마우스 코드가 없으므로 별도 테스트 게임 필요 |
| `random`, 클래스, f-string | 지원 대상. 기존 루미의 제한된 evaluator를 경유하지 않음 |

필수 에셋은 총 10개이며 현재 첨부에는 코드 텍스트만 있다.

- PNG 5개: `blue_monster.png`, `green_monster.png`, `orange_monster.png`, `purple_monster.png`, `knight.png`
- 효과음 4개: `level_up.mp3`, `success.mp3`, `die.mp3`, `safe_zone.mp3`
- 폰트 1개: `CrotahFreeVersionItalic-z8Ev3.ttf`

원본 에셋 없이 동일 게임의 시각·음향 검증을 완료했다고 판단하면 안 된다. 초기 연결 테스트에는 대체 PNG·OGG·사용 가능한 폰트를 쓰고, 원본 에셋 최종 검증과 구분한다.

### 이벤트 루프 수정

메인 `while running`에만 `await`를 넣으면 부족하다. 시작 화면부터 `pause_game()` 내부 `while is_paused`가 브라우저에 제어권을 반환하지 않는다. 최소 이식 시 변경은 다음과 같다.

1. `import asyncio` 추가, 엔트리 포인트를 `async def main()`으로 구성.
2. `pause_game()`를 async로 바꾸고 대기 루프마다 `await asyncio.sleep(0)` 추가.
3. `check_collision()` → `update()`도 async로 바꾸어 `await self.pause_game(...)`, `await self.check_collision()`이 호출되도록 연결.
4. 메인에서 `await my_game.pause_game(...)`, `await my_game.update()` 사용. 매 프레임 `clock.tick(FPS)`와 `await asyncio.sleep(0)` 호출.
5. `running = True`는 최초 시작 화면 호출 전에 설정. 원본은 시작 화면 QUIT 후에도 아래 `running = True`로 덮어쓸 수 있다.
6. `pygame.quit()`는 main의 정리 구간에 배치하고 파일 마지막은 `asyncio.run(main())`으로 끝낸다. 기존 함수가 참조하는 전역 객체 범위도 유지한다.

정규식으로 모든 학생 코드를 무조건 async 변환하지 않는다. 이 게임에는 변경 내역이 보이는 웹용 사본을 제공한다. 새 수업 템플릿은 `title / playing / game_over` 상태를 하나의 루프로 처리하면 중첩 대기 루프를 줄일 수 있다. 원본 코드 다운로드는 별도로 보존한다.

라운드 시간은 원본에서 60프레임마다 증가하므로 프레임 저하 시 실제 초와 다르다. 이식 시 게임 규칙을 몰래 바꾸지 말고, 실제 경과시간을 쓰는 개선을 별도 옵션으로 설명한다.

## 4. 화면과 학습 동선

`파이썬 성단 → 게임 만들기 행성 → 코드 스튜디오 → 내 프로젝트 / 수업 예제`

```text
← 수업으로   몬스터 잡기   저장됨       실행   정지   크게 보기
파일 목록        Python 편집기               게임 화면
 main.py         줄번호·들여쓰기              시작하려면 클릭
 images/         오류 줄로 이동              키보드·마우스 입력
 sounds/                                     1200×700 비율 유지
 폰트            출력 / 오류 콘솔
```

- 첫 단계는 `main.py`와 루트 에셋만 보여주고, 여러 파일·폴더는 필요할 때 펼친다. 데이터 모델은 처음부터 다중 파일 지원.
- 파일명 옆 ‘코드 넣기’로 `pygame.image.load(...)`, `pygame.mixer.Sound(...)` 삽입. 임의 파일명은 문자열로 안전하게 이스케이프.
- 실행 전 누락 파일·지원하지 않는 형식·에셋 준비 상태 안내. 정적 검사로 계산된 경로까지 모두 알아낼 수는 없으므로 런타임 예외도 표시.
- ‘게임 시작’은 실제 게임 iframe 안의 클릭으로 처리하여 오디오 활성화·포커스를 확보. 부모의 실행 버튼만으로 브라우저 오디오가 항상 풀린다고 가정하지 않음.
- 오류 원문과 파일/줄번호를 기본 제공. 교육용 설명은 후속 기능이며, 학생 코드를 자동으로 외부 모델에 전송하지 않음.
- 에디터 복귀 시 게임 입력 해제, 숨겨진 탭에서 음소거/일시정지. 수업 화면으로 돌아갈 때 실행기 정리.

## 5. 실행 구조와 첫 기술 검증

```text
현재 MetaSense origin
  React 스튜디오 + 기존 CodeMirror + Auth + 저장 서비스
           │ 코드/에셋 스냅샷, runId, MessageChannel
           ▼
별도 실행 전용 origin의 sandbox iframe
  고정 버전 부트스트랩 → CPython WASM + pygame-ce
  가상 프로젝트 파일시스템 → main.py → SDL canvas / audio
           │ stdout / stderr / ready / exited
           └───────────────────────────────▶ 편집기
```

제안 파일 경계: `src/components/PythonGameStudio/`에 Studio, FileExplorer, AssetPanel, GamePreview, Console, runtime client, project model을 둔다. 저장 서비스는 `src/services/pythonGameProjectService.js`. 실행 호스트 소스는 `runtime/python-game-runner/`로 분리한다. 모두 제안 경로이며 현재 생성된 구현이 아니다.

### 실행 계약

1. 편집기와 WASM은 스튜디오 진입 시 lazy load. 기존 홈·수학·루미 진입에서 게임 WASM 다운로드 금지.
2. 실행 버튼을 누르면 현재 파일·에셋의 일관된 로컬 스냅샷을 만든다. 클라우드 저장 성공을 실행의 전제조건으로 두지 않는다.
3. 고정한 Pygbag 템플릿/런타임의 부트스트랩이 파일 전달을 기다리고, 바이너리를 가상 FS에 쓴 후 작업 경로·import 경로를 설정하여 엔트리 실행.
4. READY, LOAD_PROJECT, START, STDOUT, STDERR, EXIT, ERROR에 protocolVersion/runId를 사용한다. 콘솔은 텍스트로만 렌더링하고 출력량·메시지 크기를 제한한다.
5. 실행마다 새 iframe/런타임 생성. Python 전역 변수, 모듈 캐시, mixer, 타이머가 이전 실행에서 남지 않도록 한다. 정적 WASM 다운로드는 브라우저 캐시 재사용.
6. 정지는 협력적 종료 요청 뒤 응답이 없으면 iframe 제거. 교차 origin만으로 무한루프에서 부모 UI가 항상 살아 있다고 보장할 수 없으므로 목표 브라우저에서 의도적 `while True: pass`까지 시험한다. 실패하면 별도 창 또는 검증된 Worker 실행 경로를 도입하기 전 출시하지 않는다.

**가장 먼저 검증할 불확실성:** 고정 버전 런타임에서 사전 패키징하지 않은 편집 파일·에셋 주입, 오류 회수, 반복 실행, 강제 정지가 안정적으로 되는가. 공식 문서의 패키징 성공만으로 이 계약을 달성했다고 보지 않는다. 순수 Python 보조 파일의 import도 확인한다. 임의 패키지는 지원 목록 밖으로 명시한다.

Pygbag CLI와 개발 서버를 매 실행마다 학생별로 띄우는 구조는 채택하지 않는다. 공통 부트스트랩을 개발/배포 단계에서 준비하고 게임 연산은 학생 브라우저에서 한다. 오디오 변환·저장 검증 같은 서버 작업은 별개다. 런타임·템플릿·pygame-ce·CPython 조합과 해시를 버전으로 고정하고 업그레이드 때 수업 예제를 회귀 검증한다.

### 격리와 메타센스 연동

- 별도 실행 origin에는 메타센스 Auth SDK, 로그인 쿠키, 토큰, 학생 기록을 넣지 않는다. Python에서 JS에 접근할 수 있음을 전제로 설계한다.
- sandbox 기본 후보는 `allow-scripts`; 런타임 CORS/캐시 때문에 `allow-same-origin`이 필요하면 로그인 origin과 분리된 실행 호스트에서만 검토한다. 실제 origin 구성은 기술 검증 후 확정.
- 부모는 event.source와 예상 origin(opaque origin이면 source와 일회성 채널 설정)을 검증하고 제한된 MessageChannel로 통신한다. 메시지를 ‘학습 완료·보상 승인·저장 권한’으로 신뢰하지 않는다.
- 부모가 권한을 확인해 다운로드한 프로젝트 바이트만 전달한다. 실행기에 Firebase 토큰이나 장기 비공개 다운로드 URL을 넘기지 않는다. 임의 URL fetch/HTML 실행을 제공하지 않는다.
- 실행 호스트 응답에 CSP·frame-ancestors·최소 네트워크 허용 정책을 둔다. 공유 런타임 origin의 잔존 저장소·Service Worker 등록도 제어하고 다른 프로젝트에 비밀이 누적되지 않게 한다.
- WASM 실행 자체와 SharedArrayBuffer 요구를 혼동하지 않는다. COOP/COEP는 선택한 빌드가 실제로 요구하는지 확인한 뒤 적용하며, 메타센스 전체에 일괄 추가해 로그인 팝업·영상에 영향을 주지 않는다.

## 6. 프로젝트 저장 계약

Firestore 제안 경로는 최상위 `pythonGameProjects/{projectId}`이며 `files/{fileId}`, `revisions/{revisionId}`를 둔다. `users/{uid}/...` 아래의 기존 포괄 쓰기 규칙을 그대로 상속하지 않도록 별도 경로를 선택한다.

프로젝트: `ownerId`, `title`, `runtimeVersion`, `entrypoint`, `schemaVersion`, `revision`, `courseId`, `clusterId`, `unitId`, `createdAt`, `updatedAt`. 자유 프로젝트의 수업 연결은 nullable이며 임의 단원 완료로 변환하지 않는다.

코드 파일: `path`, `kind: python`, `text`, `contentHash`. 에셋은 Storage `python-game-projects/{uid}/{projectId}/{assetId}/{version}`에 바이트를 저장하고 manifest에 `path`, `mime`, `size`, `hash`, `storagePath`, `originalAssetId`, `conversionState` 기록. 이미지·사운드 Base64를 Firestore 단일 문서에 넣지 않는다.

- 파일 경로는 상대경로만 허용. `..`, 절대경로, 중복/대소문자 충돌, 예약 경로를 검증하고 한글 경로 정규화를 명시한다.
- 초안은 UID+projectId별 IndexedDB에 먼저 저장. 새로고침·오프라인 복구와 브라우저 저장 실패 안내를 지원한다. 사용자 전환 시 다른 학생 초안을 불러오지 않는다.
- 클라우드는 변경분 debounce 저장. revision 기반 충돌 검출 후 충돌 사본을 제공하며 최근 도착 요청으로 덮어쓰지 않는다.
- 에셋 업로드 완료 후 manifest revision 확정. 업로드 실패 시 기존 revision 유지. 사용 중인 에셋은 즉시 삭제하지 않고 revision 참조와 보존 정책에 따라 정리.
- 실행, 정지, 저장 완료, 제출 완료는 별도 상태로 표시한다.
- 초기 한도 제안: 파일 100개, 코드 파일당 200 KiB, 에셋당 10 MiB, 프로젝트 30 MiB. 실제 원본 에셋 크기를 본 뒤 조정한다. 총량·개수는 UI만으로 제한하지 않고 서버 검증과 업로드 예약/정산으로 강제한다.
- Storage/Firestore 소유권·수강 정책·불변 ownerId·필드 크기를 명시 검증. MIME뿐 아니라 파일 내용도 검증. Firebase 규칙은 매칭되는 허용 조건이 합쳐지므로 좁은 규칙을 추가하는 것만으로 넓은 기존 허용이 사라진다고 가정하지 않는다.

### 사운드 업로드

웹 실행 표준은 OGG로 둔다. MP3/WAV 업로드는 제한된 변환 작업에서 OGG 파생 에셋을 만들고 원본을 보존한다. 초기 기술 검증에서는 미리 변환한 OGG를 사용 가능하다. 수업용 MVP 완료에는 MP3 업로드→변환→경로 변경 안내→재생 확인이 포함된다. 파일 확장자만 바꾸는 방식은 금지한다. 자동 코드 변경은 변경 미리보기/되돌리기를 제공하고 계산된 파일 경로는 사용자가 수정할 수 있게 안내한다.

## 7. 과제·학습 기록·공개

스튜디오 실행 성공이나 게임 점수는 학습 완료의 증거가 아니다. 브라우저에서 수정 가능한 게임 점수를 광석 지급 근거로 사용하지 않는다.

초기 기능은 개인 프로젝트 저장과 수업 실습. 다음 단계에 제출 revision을 고정해 기존 과제에 연결한다. 명시적인 Python 과정 메타데이터로 귀속하고 신규 활동 타입을 다른 과목 기록과 분리한다. 기존 `docs/manual-assignment-feedback-workflow.md`의 Codex 수동 검토·draft-only 원칙을 유지한다. 자동 학생 피드백 게시를 추가하지 않는다. 향후 집계 연결 시 export 스크립트와 운영툴 서비스 양쪽을 함께 변경·검증한다.

공개 게임 URL은 개인 저장 기능과 분리한 후속 단계로 둔다. 공개 버튼에서 별도 불변 release를 만들고 공개 취소를 지원한다. private 프로젝트 전체를 공개하지 않으며 학생 신상·과제 평가 데이터는 포함하지 않는다. 브라우저로 전달한 공개 게임의 Python 코드·에셋을 비밀로 숨길 수 있다고 약속하지 않는다.

## 8. 구현 순서와 완료 기준

| 단계 | 산출물 | 통과 조건 |
|---|---|---|
| A. 실행기 기술 검증 | 별도 origin runner, 웹용 몬스터 게임 사본, 마우스 테스트 | 파일 주입·소리·시작/게임오버·재실행·강제 정지 실제 브라우저 검증 |
| B. 수업용 MVP | CodeMirror+파일/폴더+에셋 업로드+콘솔+개인 저장 | 업로드/변환, 오류 줄 이동, 새로고침 복구, 오프라인 초안, 저장 충돌 시험 |
| C. 메타센스 수업 연계 | 행성 진입, 단원별 예제 복사, 제출 revision | 권한·과정 격리·기존 학습 흐름 회귀 검사 |
| D. 확장 | 공개 release, 힌트, 터치 조작 | 취소·개인정보 분리·기기별 재생 검증 |

### 핵심 인수 테스트

1. 실제 10개 에셋으로 시작 화면 → Enter → 방향키 이동 → 올바른 몬스터 점수 증가 → 오답 충돌 생명 감소 → Space 안전지대 → 라운드 전환 → 게임오버 → Enter 재시작.
2. 이미지 5개·폰트·효과음 4개의 로딩/출력, 최초 클릭 후 오디오, 음소거, 정지 후 잔여 소리 없음.
3. 별도 마우스 테스트에서 좌표·클릭·드래그 확인. 1200×700, 축소 화면, 고해상도 디스플레이에서 좌표 일치. 키 입력이 에디터와 동시에 처리되지 않음.
4. 코드 수정 후 반복 실행 20회; 이전 화면·사운드·전역 상태 잔존 및 메모리 지속 증가 확인. print 폭주·문법 오류·파일 없음·무한루프에도 복구 경로 검증.
5. 학생 A/B 접근 차단, 변조 ownerId, 다른 수업 연결, 악성 경로, 업로드 제한, 오래된 runId와 위조 메시지, 부모 Auth/DOM 접근 차단 검증.
6. 런타임 CDN 실패/느린 첫 로드, 저장 중 새로고침, 오프라인, 다중 탭 충돌, 사용자 전환을 시험.
7. 구현 단계에서 `npm run build`, 관련 lint, `test:course-2d`, `test:course-planets`, `test:overlay-interaction` 및 변경 범위의 학습 기록 검사 실행. 새 저장 권한은 Emulator 통합 테스트, 게임 조작은 실제 브라우저 QA로 확인.

현재 완료한 것은 설계와 소스/문서 확인이다. 빌드·게임 실행·성능 측정·원본 에셋 검증·배포는 수행하지 않았다. 속도와 지원 브라우저 범위는 A 단계의 측정 전 확정하지 않는다.

## 9. 공식 근거

- [Pygbag README](https://github.com/pygame-web/pygbag): pygame-ce 지원, 비동기 루프, Pyodide wheel 비호환, 버전별 런타임과 최초 로딩 특성.
- [Pygbag 사용 문서](https://pygame-web.github.io/wiki/pygbag/): main.py 구성, async yield, 에셋 경로, OGG 권장, 템플릿 기반 패키징.
- [pygame-ce mouse](https://pyga.me/docs/ref/mouse.html), [mixer](https://pyga.me/docs/ref/mixer.html): 마우스/오디오 API. 특정 브라우저 조합의 검증을 대체하지 않음.
- [MDN iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe): sandbox·origin·권한 정책. 구체적인 runner 정책은 제안 설계이며 아직 런타임에서 검증하지 않음.
