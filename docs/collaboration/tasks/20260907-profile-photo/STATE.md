# 20260907-profile-photo

- Original goal: 이용자 공개 프로필에 SNS처럼 사진을 표시하고, 프로필 수정 페이지에서 본인이 프로필 사진을 등록할 수 있게 한다.
- Coordinator: Codex (local implementation)
- Phase: DONE
- Last updated: 2026-09-07 09:57 KST
- Source baseline: `95b28d57e8412cee986873aad24ef061b30829e6`
- Dirty-state note: 시작 시 추적되지 않은 사용자 소유 경로 `.tmp-work/`가 있었으며 작업 범위에서 제외한다.
- Task worktree/branch: shared checkout; no branch switch; Codex is the only writer for this task.
- External packets: none. 현재 범위는 기존 프로필 저장 흐름 안에서 로컬 구현·검증하는 편이 사용자 릴레이보다 효율적이다.

## Acceptance criteria

- 로그인한 사용자가 프로필 수정 화면에서 JPEG/PNG/WebP 사진을 선택하고 미리 볼 수 있다.
- 허용되지 않은 형식과 과도하게 큰 원본은 업로드 전에 이해 가능한 메시지로 거부한다.
- 저장 시 이미지를 최적화해 사용자 전용 Firebase Storage 경로에 업로드하고 사용자 문서에 URL/경로를 저장한다.
- 사용자는 자신 경로만 쓸 수 있고, 프로필을 볼 수 있는 로그인 멤버는 사진을 읽을 수 있다.
- 공개 프로필, 내비게이션 프로필 버튼, 답변 공개 명함, 랭킹 사용자 셀에 사진이 표시되며 실패하거나 없을 때 이름 첫 글자로 안전하게 대체된다.
- 프로필 저장 시 기존 답변의 `publicProfileSnapshot`에도 사진 URL이 동기화된다.
- 업로드 사진 제거가 가능하고, 교체/제거 후 이전 전용 파일은 가능한 범위에서 정리된다.
- 유틸리티 테스트, lint, production build를 통과한다.

## Ownership and dependencies

- Codex-owned paths: 프로필 UI/CSS, 공개 프로필·답변·랭킹·내비게이션 표시, 이미지 유틸리티/테스트, `storage.rules`, 이 task record와 INDEX row.
- Excluded: `.tmp-work/`, 배포, 운영 데이터 수정, 인증/권한 모델의 기타 변경.
- Dependency order: 이미지 계약과 보안 규칙 → 편집/업로드 → 공개 노출 지점 → 자동 검증 → 가능하면 브라우저 시각 확인.

## Local work and checks

- 기존 `users/{uid}` 공개 프로필 필드와 답변 스냅샷 동기화 흐름, Firebase Storage 규칙, 프로필 노출 지점을 조사했다.
- 재사용 가능한 `ProfileAvatar`와 안전한 이미지 URL/검증/경로 유틸리티를 추가했다. 이미지가 없거나 로드에 실패하면 표시 이름 첫 글자로 대체한다.
- 프로필 수정 화면에 원형 미리보기, 등록/변경/업로드 사진 제거, 5MB·MIME 검증을 추가했다.
- 저장 시 720px 이내 JPEG로 최적화해 `profile-images/{uid}/...`에 업로드하고 `profileImageUrl`/`profileImagePath`를 사용자 문서에 기록한다. 교체/제거 시 이전 소유 파일을 best-effort로 정리하고 문서 저장 실패 시 새 업로드도 정리한다.
- 공개 프로필, 데스크톱/모바일 내비게이션, 답변자 명함, 랭킹 탐사선 배지에 사진을 연결했다. 공개 답변 스냅샷의 클라이언트·서버 생성 경로 모두 사진 URL을 포함한다.
- 기존 답변 갱신을 450건 단위 배치로 나눠 Firestore 단일 배치 한도를 넘지 않도록 했다.
- `storage.rules`에 로그인 멤버 읽기, 소유자 전용 쓰기/삭제, 2MB 최적화 결과 및 JPEG/PNG/WebP 형식 제한을 추가했다.
- `npm run test:profile-image`: PASS.
- 변경 클라이언트/테스트 파일 대상 ESLint: PASS.
- `node --check functions/index.js`: PASS. 서버 함수 전체 ESLint는 기존 설정이 CommonJS 전역을 인식하지 못해 `require`/`exports` 등 선행 오류가 있으므로 적용하지 않았다.
- `git diff --check`: PASS (기존 fsmonitor daemon 경고는 결과에 영향 없음).
- `npm run build`: PASS. 기존 오디오 라이선스 provisional 및 대형 청크 경고는 남아 있다.
- 로컬 브라우저에서 앱 기동과 로그인 랜딩 렌더링은 확인했다. 인증된 테스트 계정이 없어 프로필 화면의 실제 Firebase 업로드·시각 QA는 수행하지 않았다.

## Final verification and remaining limitations

- 구현과 정적/빌드 검증은 완료했다. 운영 반영에는 앱 번들과 새 `storage.rules`, 변경된 Cloud Functions의 배포가 함께 필요하다.
- 실제 계정에서 JPG/PNG/WebP 등록·변경·제거, 공개 프로필/답변/랭킹 반영을 스테이징 또는 운영 전 환경에서 한 번 확인해야 한다.
