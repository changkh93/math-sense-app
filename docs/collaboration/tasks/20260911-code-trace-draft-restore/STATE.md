# CODE TRACE 작성 중 초안 복원

- Phase: DONE (local; not deployed), 2026-09-11. Coordinator: Codex; local implementation, no external handoff.
- Goal: `오늘은 여기까지`로 저장한 미완료 CODE TRACE 코드가 일반적인 재진입에서 빈 편집기로 보이는 문제를 수정한다.
- Evidence: 인효린 계정 `unit_gameproj_23` 1번 세트 초안 1,215자/66줄과 paul 계정 1번·4번 세트 초안이 Firestore에 남아 있으나 재진입 화면은 비어 있음. 운영 데이터는 읽기만 했음.
- Root cause: 편집기 `studentCode`가 항상 빈 문자열로 시작하며 현재 세트의 서버 `drafts`를 적용하지 않음. `lastExerciseId`도 초기 세트 선택에 사용하지 않고, 진도 로딩 완료 전에 CODE TRACE 화면이 열릴 수 있음.
- Scope/owner: Codex in current workspace; CODE TRACE 복원 유틸리티·플레이어·진도 로딩 게이트·회귀 검사. 운영 데이터 변경 및 배포는 범위 밖.
- Baseline/dirty state: current checkout; existing user-owned modification in `docs/collaboration/tasks/20260911-studio-input/STATE.md` preserved.
- Acceptance: 첫 세트 포함 저장 초안 복원, 마지막 미완료 세트/모드 복원, 지연된 서버 데이터가 새 로컬 입력을 덮지 않음, 변경된 콘텐츠 ID 안전 처리, 관련 검사와 빌드 통과.

## Implementation

- The editor now initializes from the saved `lastExerciseId`, its matching draft, and `lastMode`; when the saved ID no longer exists it falls back to the first current incomplete exercise.
- A later Firestore snapshot can hydrate the editor until the student interacts. External editor synchronization is distinguished from actual typing, so a delayed server result does not become a false local edit and actual new typing is never overwritten.
- Code Trace waits for both exercise content and learning-progress loading before mounting.
- Switching between `가리고 쓰기` and `한 줄씩` no longer clears the draft; explicit reset remains the only reset action.
- Keystrokes keep the in-memory per-exercise draft map current so set navigation and `오늘은 여기까지` share the same latest value.

## Verification

- `node scripts/test-code-trace-progress-utils.mjs`: PASS. Covers first-set draft, last incomplete set/mode, and removed content ID fallback in addition to completion checks.
- Read-only live-data fixture check: PASS. Current production exercise IDs restored the existing student draft as 1,215 chars/66 lines and paul draft as 44 chars/6 lines for set 1; no student data writes.
- Targeted ESLint for `CodeTracePlayer`, restore utility, and test: PASS. Whole `MissionHub` lint still reports its pre-existing unrelated lint debt; the changed loading gate is build-verified.
- `npm run build`: PASS (4,304 modules; existing large-chunk and provisional audio-license warnings only).
- `git diff --check`: PASS apart from the repository's recurring fsmonitor daemon warning.

## Remaining

- No Hosting deployment or production mutation was performed. A signed-in browser save/re-entry check should be run after deployment; the local session did not have test-account credentials.
