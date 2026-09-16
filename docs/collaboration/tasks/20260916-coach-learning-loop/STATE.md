# 지속 개선형 오류·질문 도움 시스템

- Goal: 향후 학생 오류·질문·재실행 결과로 기본 설명이 개선되는 저비용 운영 루프.
- Status: IMPLEMENTED, local verification complete (2026-09-16). 배포/실운영 수집 활성화 미실행.
- Baseline: 14048c99 + 이전 구조 변환형 코치의 로컬 미커밋 구현. 다른 마케팅·SEO·크루 작업의 변경을 보존했다.
- Coordinator: Codex. 진단/인증/실행 연결/집계가 밀접하여 로컬에서 통합했다. 외부 전달 없음.

## 구현
- 학생 질문 의도 6종, 로컬 보충 설명, 탭 내 선택 참여.
- 파일/노트북 실행 ID와 오류 도움 연결. 원문은 메모리에만 두고 수정 여부·같은/다른 오류·일반/그림 종료·관찰 불가를 구분.
- 고정 스키마 서버 검증, 계정·유형·전역 기여 한도, 원자적 중복 차단.
- 최근 14일 관리자 보고서, 참여 요청의 실제 토큰 사용량, 총비용 비교 계산기.
- 이미 받은 변환 AI 답변의 제한적 재사용. 운영자의 별도 설정 및 해당 범위를 안내받은 탭의 선택 필요.
- 불변 설명 버전, 합성 진단기 검사, 교사 검토, 비노출 일치 관찰, 약 10% 탭 적용, 전체 적용·회수.
- 진단기/실행기 버전 불일치 시 카드 적용 금지 및 통계 분리.
- 7/14/90일 만료 기준 + 일일 제한 삭제 함수. 직접 Firestore 접근 차단.
- 예정 개인정보 안내에 선택적 개선 기록의 목적·범위·삭제 방식을 추가.

## 검증
- `npm run test:studio-coach-learning`: 46/46 통과. 현재/기존 진단·구조 변환·유료 경계 및 새 집계·권한·경합·상한·카드·샘플·삭제·추적 테스트.
- `scripts/qa-studio-coach-learning.mjs`: 실제 Chrome/WASM 파일·노트북 실행과 질문/참여 UI 통과. 파일 same-error → completed, 노트북 surface-ended 확인. 원문 없는 이벤트 확인. 관리자 UI는 합성 callable 경계로 검증.
- `scripts/qa-studio-private-coach.mjs`: 실제 컴포넌트의 변환 미리보기·로컬 이름 복원·정책 페이지 통과.
- 브라우저 검증 중 Vite HMR URL이 다른 테스트 모듈 인스턴스 문제를 발견하여 검증 스크립트가 앱과 동일한 URL을 사용하도록 수정. 수정 후 통과.
- 관련 신규/변경 모듈 ESLint 및 backend syntax 검사 통과. 기존 PythonGameStudio 전체 파일의 unrelated ref lint 문제는 수정하지 않았다.
- production build 통과 (기존 대형 번들 경고 존재).
- 이번 구현/검증에서 유료 API 호출 0회, 실학생 자료·운영 DB 변경 0회.
- 증빙: browser-checks.json, student-tablet.png, admin-tablet.png. 초기 실패 스크린샷은 실패 원인 기록용이며 최종 결과는 browser-checks.json.

## 정확한 범위와 남은 운영 절차
- 구현된 자동화: 제한 집계·우선순위 계산·검증·버전 적용·만료 삭제. AI 학습/자동 문구 생성/무인 배포는 하지 않는다.
- 새 진단 조건 추가와 설명의 교육적 검토는 사람이 수행한다. 이 기능의 실사용 효과나 비용 절감률은 아직 측정하지 않았다.
- 카드 회수는 새로고침 후 새 오류부터 반영된다. 기존 열린 탭의 설명을 강제로 바꾸는 기능은 없다.
- 실제 Firebase emulator/배포 환경·실제 관리자 계정·일일 삭제 스케줄은 미검증. 로컬 backend fixture와 실제 브라우저 실행을 구분한다.
- 프런트·기존 코치·새 함수 4개·Firestore 규칙을 함께 배포하고 관리자 권한/스케줄을 확인한 후 운영 설정을 켠다. AI 준비/ZDR 조건은 별도이며 그대로 유지.
- 상세 동작·상한·배포 경로: [OPERATIONS.md](OPERATIONS.md). 설계 기준: [DESIGN.md](DESIGN.md).

## 2026-09-16 production release supersedes local-only status above
Source commit 67c3f71a pushed; Hosting, structural coach, learning functions and Firestore rules deployed. Student structural AI enabled and authenticated real Luna request verified. Optional learning collection/case reuse remains off. ZDR remains pending. See [release evidence](../20260916-coach-production-release/STATE.md) for exact scope, controls and verification limitations.
