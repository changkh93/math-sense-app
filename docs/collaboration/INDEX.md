# MetaSense collaboration task index

Setup: installed 2026-09-06. No external job dispatched; no cross-app round trip completed yet.

Codex maintains this index. The user only relays packets and returns reports.
For an existing task, read its STATE.md and actual artifacts before continuing.

| ID | Goal | Phase | State file | Next action |
|---|---|---|---|---|
| 20260908-learning-save-stability | 학습 기록 저장·완료 체크 안정화 | ACTIVE (release pending) | [STATE](tasks/20260908-learning-save-stability/STATE.md) | 운영 집계 인덱스 누락 확인·복구; 빈 답안 유실 재현 및 저장·집계 프로세스 수정/검증, 함수·규칙·웹 배포 전 |
| 20260908-youtube-author-brand | 유튜브 공식 전환·네 채널 수학감각 저자 소개 | WAITING_USER | [STATE](tasks/20260908-youtube-author-brand/STATE.md) | 직접 수정·게시 완료; Instagram 모바일 외부 링크2개 추가 대기 |
| 20260908-marketing-day01 | 100일 마케팅 1일차 실행 | ACTIVE | [STATE](tasks/20260908-marketing-day01/STATE.md) | 3채널 발행·댓글2·팔로우1 완료; 매일 계획·일지 예약 설정, 실제 접수 검증·오후 마감 남음 |
| 20260907-workbook-completion-report | 분수 나눗셈 워크북 완료 체크 제보 조사 | DONE (local fix) | [STATE](tasks/20260907-workbook-completion-report/STATE.md) | 완료 문서를 무시하던 카드 판정 수정, 회귀검사·빌드 통과; 웹 배포 전 |
| 20260907-lumi-runtime-recovery | 루미 신호 개수·정답 판정 수정과 엔진 복구 안내 | DONE (local) | [STATE](tasks/20260907-lumi-runtime-recovery/STATE.md) | 실제 브라우저 정답·숨은 조건 통과, 지연 복구 및 빌드 검증; 운영 배포 전 |
| 20260907-code-trace-enter-scroll | 코드 트레이스 Enter 후 줄 시작 복귀 | DONE (local) | [STATE](tasks/20260907-code-trace-enter-scroll/STATE.md) | 사용자 Chrome 탭에서 문서 끝 Enter 3회 및 커서 가시성 확인, 운영 배포 전 |
| 20260907-hoverpack-water | 호버팩 수면 보호·장비 변경 자동 부상 | DONE (local) | [STATE](tasks/20260907-hoverpack-water/STATE.md) | 수면 제한·수중 전환 브라우저 검증 및 빌드 완료, 운영 배포 전 |
| 20260907-crew-member-removal | 크루 리더 멤버 강퇴 및 폐쇄 흐름 | DONE (local) | [STATE](tasks/20260907-crew-member-removal/STATE.md) | 서버·UI 검사 및 빌드 완료, 함수·규칙·웹 배포 전 |
| 20260907-hoverpack-experience | 저비용 절차형 고공 비행·링 탐사 경험 개선 | DONE (local, revised) | [STATE](tasks/20260907-hoverpack-experience/STATE.md) | 추종 입자·모호한 비행체 제거, 구름·카메라 재구성 및 실화면 검증; 운영 배포 전 |
| 20260907-kakao-business-channel | 기존 카카오톡 채널을 메타센스 마케팅·상담 채널로 개선 | WAITING_EXTERNAL | [STATE](tasks/20260907-kakao-business-channel/STATE.md) | 기본 설정·운영 관계 안내 완료; 이름 유지 확정, 사업자 심사 증빙은 별도 필요 |
| 20260907-official-marketing-channels | 네이버 블로그·인스타그램 비즈니스 공식 계정 신규 개설 | DONE | [STATE](tasks/20260907-official-marketing-channels/STATE.md) | 외부 링크 확인 완료, 둘시네 운영 관계 소개 반영 |
| 20260907-profile-performance | 프로필 진입 속도·조회 비용·오류 처리 개선 | DONE (local) | [STATE](tasks/20260907-profile-performance/STATE.md) | 로컬 검증 완료, 답변 인덱스 준비 후 웹 배포 필요 |
| 20260907-profile-photo | 프로필 사진 등록 및 공개 영역 표시 | DONE (local) | [STATE](tasks/20260907-profile-photo/STATE.md) | 로컬 구현·검증 완료, Storage 규칙 포함 운영 배포 전 |
| 20260907-frontier-performance | 진입 멈춤·저사양 렌더링 개선 | DONE (local) | [STATE](tasks/20260907-frontier-performance/STATE.md) | 로컬 성능 비교 완료, 운영 배포 전 |
| 20260907-frontier-crew-routes | 가벼운 크루 성도·항로·협업 방문 흐름 | DONE (local) | [STATE](tasks/20260907-frontier-crew-routes/STATE.md) | 로컬 검증 완료, 운영 배포 전 |
| 20260906-2350-frontier-cost | 프론티어 호출·동기화·전송 비용 최적화 | DONE | [STATE](tasks/20260906-2350-frontier-cost/STATE.md) | 로컬 검증 완료, 운영 배포 전 |
| 20260906-2310-ocean-rebuild | 해양 생물·해저 재구성 및 넓고 깊은 바다 | DONE | [STATE](tasks/20260906-2310-ocean-rebuild/STATE.md) | 로컬 구현·검증 완료, 운영 배포 전 |
| 20260906-frontier-motion | 수영·비행 동작 및 바다·하늘 탐험 확장 | DONE (local) | [STATE](tasks/20260906-frontier-motion/STATE.md) | 실기기 검증 및 운영 배포는 별도 |

New task records belong in `tasks/<unique-ID>/STATE.md` with numbered request and return files.
Keep completed rows for traceability. Do not overwrite other sessions' records.
