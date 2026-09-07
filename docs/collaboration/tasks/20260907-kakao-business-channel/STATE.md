# Kakao channel setup

- ID: 20260907-kakao-business-channel
- Goal: 기존 카카오톡 채널을 메타센스 마케팅·상담 채널로 개선.
- Coordinator: Codex. 외부 위임 없음. 사용자가 브라우저 직접 작업 요청.
- Phase: ACTIVE — 관리자 추가인증 및 채널명 제한 해결 대기.
- Updated: 2026-09-07 12:16 KST
- Baseline: 440b4a28f0b31eb14e998f59f2aa740be0ddf195
- Workspace: shared project checkout, 별도 코드 수정 없음.
- Existing dirty files: functions/crewGrowthEventPolicy.cjs, crewGrowthEventService.cjs, index.js; Space/CrewDetailView.jsx, CrewGrowthRewardExperience.jsx, StudyCrewView.jsx; Admin/CrewApproval.jsx; docs marketing/tasks/INDEX; tmp. 모두 보존.
- Allowed work: Kakao channel UI, docs/marketing/official-channels, this state and INDEX.

## Acceptance

공통 로고·소개·링크 적용과 공개 화면 검증, 온라인교육 분류와 검색 활성화, 안내 소식, 상담 진입 구성. 이름·비즈니스 인증 제한은 실제 결과와 필요한 사용자 조치 기록.

## Completed and verified

- Dashboard space1514615; channel _xfxkGDn. Public https://pf.kakao.com/_xfxkGDn
- 검색 허용 ON, 교육 → 온라인교육 저장. 저장 완료 알림 및 이후 화면 확인.
- profile-logo.png 적용. 공개 화면 스크린샷에서 로고 확인.
- 소개: 메타센스, AI 시대 스스로 배우는 힘. 수학·파이썬·고전읽기로 질문하고 판단하며 성장해요.
- 웹사이트 https://msense.me, 더 알아보기 https://msense.me/trial, Instagram metasense_edu. 공개 AX에서 각 href 확인.
- 기존 공개 전화·이메일 보존, 상담시간 변경 없음.
- 첫 소식 발행 성공: 114504885, 2026-09-07 12:13. 제목 'AI 시대, 우리 아이의 배움은 어떻게 달라져야 할까요?'. ai-era-launch.png 첨부, 부모 고민과 수학·파이썬·고전읽기 학습 방향, 상담·과정·블로그·Instagram 링크 포함. 관리자 발행한 글1과 성공 모달 확인.
- 소식 바로가기 ON, 소식 카드 추가/활성화/리스트형 저장 성공.
- 기존 친구에게 메시지 발송 없음. 광고·유료서비스 연결 없음.

## Blockers / next

- User explicitly chose name '메타센스'. Rename attempted once, server rejected: '친구수 100명 초과 또는 이름을 변경한 이력이 있거나 알림톡을 이용중인 경우 이름을 변경할 수 없습니다.' Public friend count8, exact cause undetermined. Current name remains '둘시네 온라인 교육', search ID '왕새우쌤'. Do not claim renamed. Customer support inquiry draft in marketing setup doc; no inquiry sent without authorization.
- Chat requires 관리자 추가인증. Async request sent asking user to authenticate in tab187665060; credentials/OTP entered only by user. Do not turn authentication OFF.
- Business review page says not yet applied. Requires 사업자등록증/고유번호증, electronic certificate phone, applicable license evidence; profile and paperwork must match. No submission with invented information.
- Next after user says 인증 완료: inspect chat settings, set useful welcome/FAQ/menu, verify public channel news card. Preserve 09:00–22:00 existing hours unless user changes.
- Browser tabs: 187665057 original admin, 187665060 chat/auth, 187665063 public, 187665066 home configuration after news published. Original admin link clicks sometimes land wrong sidebar destination; use observed exact URL if needed.
- Other task: Naver/Instagram completed, IG mobile external link still pending, track original marketing task.

## Latest verification — 2026-09-07 12:24 KST

- 운영 설정은 추가인증 없이 정상 접근 가능. 대화 목록만 인증 요구. 첫인사 및 부재중 메시지 저장 완료, 재진입 후 두 문구 유지 확인. 상담시간 매일09:00–22:00 유지.
- 커스텀 메뉴 1단3칸: 과정·체험 → https://msense.me/trial, 교육 이야기 → https://blog.naver.com/metasense_edu, 인스타그램 → https://www.instagram.com/metasense_edu/.
- 임시저장 후 상시노출 등록 성공 알림, 커스텀 메뉴 ON 및 상시노출 메뉴 노출중 확인. 카카오톡 모바일 실기기 클릭/자동 메시지 수신은 미검증.
- 공개 채널 재진입 후 소식 카드·첫 글 제목/본문·소식 바로가기 확인.
- 상담 기본 구성은 완료. 남은 작업은 채널명 플랫폼 제한 문의와 비즈니스 증빙 확보/심사, 사용자 실제 상담 수신 확인. 인증 요청은 대화 관리용이며 설정 완료의 필수 전제는 아님.
- Phase: WAITING_EXTERNAL (카카오 이름 제한/사업자 증빙). No external message dispatched.

## User-directed positioning update

User chose to retain Kakao name and position MetaSense as operated by Dulcine. Rename no longer required. Applied Instagram/Naver bios, shortened Naver title, Kakao first greeting, published and pinned onboarding post114505358. Public IG/Naver/Kakao inspected. Detailed final copy and limitations: docs/marketing/official-channels/POSITIONING.md. Kakao short profile replacement blocked by validation; original retained. Business certification remains unapplied. Basic positioning improvements completed with stated platform limitation; no customer support inquiry sent.
