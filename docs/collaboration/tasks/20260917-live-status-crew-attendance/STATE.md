# 실시간 학습 현황 크루 참여 개선

- ID: `20260917-live-status-crew-attendance`
- Phase: `DEPLOYED_AND_VERIFIED`
- Coordinator: Codex
- Last updated: 2026-09-17 KST
- Baseline: `b02a9977` on `main`; implementation commit `895746ed`
- Dirty-state note: 기존 작업 트리에 다수의 사용자 변경이 있었으며, 이 작업은 아래 명시 파일만 수정·추가했다. `functions/index.js`와 `docs/collaboration/INDEX.md`에는 선행 미커밋 변경이 존재한다.

## Original goal

운영툴의 실시간 학습 현황에서 수업 시작 즉시 결석자를 먼저 보여주고, 전체 및 스터디 크루별 탭을 제공하며, 크루 탭에서 실제 집중방 참여 여부와 미참여 학생을 우선 확인하고 각 크루 Google Meet에 바로 입장할 수 있게 한다.

## Acceptance criteria

- 수업 시작 후 결석 판정의 기존 5분 유예를 제거한다.
- `전체`와 각 실제 스터디 크루 이름 탭을 제공한다.
- 크루 탭은 해당 크루의 실제 멤버만 표시한다.
- 오늘 집중방 링크를 연 회원 또는 앱 내 집중방에 현재 참여 중인 회원을 참여로 표시한다.
- 미참여 회원을 크루 탭 상단 경고와 표 최상단에 표시한다.
- 선택 크루의 Google Meet 링크를 바로 열 수 있다.

## Local changes

- `src/pages/Admin/LiveStatus.jsx`: 전체/크루 탭, 미참여 우선 화면, Meet 바로가기, 무유예 결석 판정.
- `src/utils/liveStatusCrew.js`: 오늘의 크루 참여 판정 및 참여/미참여 분할.
- `functions/index.js`: `enterStudyCrewMeet` 성공 시 회원 문서에 KST 날짜·크루·입장 시각 기록.
- `scripts/test-live-status-crew.mjs`: 참여 판정, 정렬, 무유예 및 서버 기록 계약 검사.

## Verification

- `node scripts/test-live-status-crew.mjs`: 통과.
- `npx eslint src/pages/Admin/LiveStatus.jsx src/utils/liveStatusCrew.js scripts/test-live-status-crew.mjs`: 통과.
- `node --check functions/index.js`: 통과.
- `npm run test:crew-member-removal`: 7/7 및 UI 계약 통과.
- `npm run build`: 통과.
- Firebase Functions `enterStudyCrewMeet`와 Hosting 배포 성공.
- 운영 HTML이 새 메인 번들 `index-ZY1Rp3Oo.js`를 제공함을 확인.
- 운영 `LiveStatus-Dgq7SHjW.js`에서 전체 탭, `오늘 집중방 미참여`, `집중방 바로가기` 문구 확인.
- 로그인 세션이 없는 격리 환경에서는 관리자 실제 데이터 화면의 클릭 실기는 수행하지 못함.

## Remaining limitations

Google Meet 내부 참가자 명단 API를 조회하는 방식은 아니다. 앱의 집중방 입장 버튼을 사용해 Meet 링크를 발급받은 기록을 참여 근거로 사용하며, 앱 내 Study Stream 활성 참여도 인정한다.

## Next action

관리자 계정으로 운영 `실시간 학습 현황`에서 실제 크루 탭과 오늘 참여 표시를 확인한다.
