# Python Game Studio 설계

- ID: 20260909-python-game-studio-design
- Original goal: 제공 pygame 게임과 참고 의견을 검토해 온라인 편집·실행 환경의 가능성을 판단하고 현재 메타센스에 원활하게 통합할 설계 마련.
- Coordinator: 현재 Codex 세션. 모델 전환·외부 전송 없음.
- Phase: DONE (design only)
- Last updated: 2026-09-09 KST
- Baseline: 1a5caaa03079477a2c9eb199d4dd6e25a20995f4
- Dirty state at start: clean (`git -c core.fsmonitor=false status --short`).
- Workspace: 기존 math-sense-app 작업 디렉터리. 별도 worktree 없음, 코드 작성자 없음.
- Acceptance: 첨부 코드의 API/루프/에셋 분석, 기존 구조와 재사용 경계 확인, 런타임·저장·입력·권한·학습 기록 통합, 구현 순서·검증 관문 명시.
- Owners/allowed paths: Codex가 설계 문서, 이 STATE, INDEX만 작성. 앱 코드·규칙·배포 변경 없음.
- Local artifact: `docs/python-game-studio-design.md`.
- Checks: 첨부 두 텍스트 전체 검토, React/Vite/CodeMirror/Pyodide 런타임 및 import 제한 확인, Game Studio 행성/화면 진입·Firebase 정책·수동 피드백 원칙 검토, 공식 Pygbag/pygame-ce/MDN 문서 조회. 문서 경로 및 diff 검증.
- Findings: 현재 루미 runtime은 일반 pygame을 지원하지 않음. 별도 pygame-ce WASM 실행기 필요. main뿐 아니라 pause_game과 호출 체인의 async 이식 필요. PNG 5/효과음 4/TTF 1 원본 에셋 미첨부. MP3는 OGG 변환 설계. 동적 파일 주입·강제 정지는 구현 검증 전.
- External packets / returned artifacts: 없음. 이번 요청은 로컬 설계로 완결하여 수동 중계 부담을 만들지 않음.
- Final verification: 설계 인수 조건 충족. 실행 가능성 판단과 실제 작동 검증을 분리해 명시.
- Limitations: 게임 구현·브라우저 실행·빌드·성능·배포 미수행. 실물 에셋 동작 미확인.
- Next action: 구현으로 진행할 때 설계 A 단계부터 시작. 초기 연결은 대체 에셋 가능, 동일 게임 최종 검증에는 원본 에셋 10개 필요.
- Expected user return: 현재 설계 요청을 완료하기 위한 추가 응답 없음.
