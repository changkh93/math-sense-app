# 메타센스 공식 마케팅 채널 개설

- ID: 20260907-official-marketing-channels
- Phase: WAITING_USER (두 채널 개설·프로필·첫 글 완료, Instagram 모바일 링크 한 단계 대기)
- Updated: 2026-09-07 KST
- Goal: 마케팅 계획 PDF를 기반으로 새 네이버 블로그와 새 인스타그램 비즈니스 계정을 직접 개설하고 이름·소개·시각물을 통일한다.
- User clarification: 둘 다 새로 개설. 개인 계정 재활용 아님.
- Additional direction: AI 시대 새로운 학습에 대한 학부모의 고민과 기대, 메타센스의 해결책을 문구에 포함.
- Coordinator: Codex, 현재 선택 모델 사용. 외부 수동 릴레이는 로그인 협업에 불필요한 부담이므로 로컬 직접 수행.
- Baseline: 440b4a28f0b31eb14e998f59f2aa740be0ddf195
- Existing dirty state: functions/crewGrowthEventPolicy.cjs, functions/crewGrowthEventService.cjs, functions/index.js; docs/marketing/ untracked. 기존 변경 보존.
- Workspace: 공유 checkout, 별도 코드 작성자 없음. 이 작업은 docs/marketing/official-channels 및 이 상태·INDEX만 작성.

## Acceptance
1. 새 네이버 브랜드 블로그 실제 생성 및 공개 URL 확인.
2. 새 인스타그램 생성 및 Business 유형 실제 확인.
3. 일치하는 이름·로고·소개·사이트 링크 저장, 공개 프로필 확인.
4. 콘텐츠·이미지 원본과 운영 기준을 저장하고 완료/미완료를 구분.

## Evidence / local work
- PDF 45페이지 추출, 주요 관련 1–29페이지 검토. 대표 문구: 스스로 배우는 힘, 메타센스. 초등수학·파이썬·고전읽기.
- public/m-logo.svg 기존 로고 확인. 프로필에는 이를 활용한다.
- Chrome 새 가입 화면: Naver tab 187665037 (단체 회원가입 필수 약관 전), Instagram tab 187665040 (신규 양식). 모두 markHandoff 적용.
- Instagram 개인 계정은 신규 가입 양식 접근을 위해 로그아웃됨. 삭제 없음. 새 이름 `메타센스 | AI 시대 스스로 배우는 힘`, 후보 `metasense_edu` 입력. UI 'Input Username is valid.' 확인, 계정 확보 아님.
- 네이버 약관 동의는 수행하지 않음. 두 계정 모두 미생성, Instagram Business 미전환.
- /trial 운영 페이지에서 과정·수강료·일정·체험 폼 확인 완료. 신청 미제출, UTM 추적 미검증.
- docs/marketing/official-channels/: BRAND-AND-SETUP.md, Instagram bio (80자), 첫 블로그 원고, 첫 Instagram 캡션 준비 완료.
- 이미지 3종 제작 및 시각 확인: profile-logo.png 1080×1080, naver-title.png 1920×600 (기존 SVG 로고 기반); ai-era-launch.png 1122×1402 (내장 ImageGen 제작 후 작은 수식/코드 제거 수정). 모든 자산 프로젝트에 저장.
- 원본 SVG 및 생성 스크립트·ImageGen 프롬프트 저장. 제품 소스코드 수정 없음. 앱 테스트/빌드는 관련 없어 실행하지 않음.

## Dependencies and next step
- 사용자 협업: 새 가입 비밀번호·본인 인증은 웹 화면에서 사용자 직접 처리. 약관 동의 최종 단계는 브라우저 도구의 동의 요구를 따른다.
- Codex: 가입 화면 준비, 브랜드 자산/원고 제작, 인증 후 프로필 설정 및 공개 검증.
- 현재 정확한 사용자 요청: 열린 두 가입 화면에서 약관·비밀번호·연락처/본인 인증을 직접 완료하고 서비스명 및 확보 아이디만 회신. async 요청 전송. 개인정보/비밀번호/OTP는 채팅에 보내지 않도록 안내.
- After return: 브라우저에서 새 계정 상태 확인 → 네이버 블로그 개설/프로필/타이틀/카테고리/첫 글 → Instagram Business 전환/프로필/첫 피드 → 공개 URL과 크롭/링크 검증. 준비물만 전달하고 원래 목표를 완료 처리하지 않는다.
- 로그인 정보, OTP, 비밀번호를 이 기록에 저장하지 않는다.

## 2026-09-07 사용자 가입 완료 후 재개
- 사용자: ‘다 완료했어요. 진행해주세요.’
- 확인: Instagram metasense_edu 공개 프로필 + Edit profile 접근; 네이버 단체 가입 완료 welcome 화면.
- Instagram bio 80자 입력 및 Submit 후 비활성 표시. 영구 저장 재확인 필요.
- 네이버 blog ID metasense_edu 사용 가능 표시 확인 후 두 번 확인(최종 생성) 클릭. 생성 결과 재검증 필요.
- Instagram Account type and tools → Switch to professional account 접근 중.
- 프로필 업로드 file chooser setFiles 실패: Chrome Not allowed. 도구 지정 안내대로 ChatGPT 확장 파일 URL 접근 허용 요청 전송. 사용자가 설정하는 동안 브라우저 연결 일시 unavailable 발생.
- 아직 이미지 업로드/발행/Business 완료로 보고하지 않는다.

## 2026-09-07 파일 접근 설정 완료 후 진행
- Naver https://blog.naver.com/metasense_edu 실제 생성 확인. 이름 메타센스 공식 블로그 AI 시대 스스로 배우는 힘, 별명 메타센스 저장. 소개글·교육/학문 주제·로고 파일 첨부 후 성공적으로 반영되었습니다 확인.
- 카테고리 6개(처음 오셨나요, AI 시대의 배움, 초등수학, 파이썬, 고전읽기, 과정·이용 안내) 저장 성공 확인.
- Instagram Business/Education 전환 완료 화면 확인. 공개 연락처는 추가하지 않음. 80자 소개글 및 공식 M 로고 저장 확인.
- Instagram 첫 이미지/509자 캡션/대체텍스트 발행 성공. 공개 프로필 1 post와 /metasense_edu/p/Dc-D_9BDz-D/ 링크 확인. 캡션 CTA는 모바일 링크 추가 대기 때문에 msense.me/trial로 직접 표기.
- 모바일 Instagram 외부 링크 추가는 웹 UI에서 지원하지 않아 사용자에게 https://msense.me/trial 및 제목 메타센스 과정·체험 안내 저장 요청.
- Naver 첫 글 에디터 진입 중. 배너 적용 및 최종 공개 검증 남음.

## 현재 결과 (2026-09-07 최종 확인)
- Naver 첫 글 https://blog.naver.com/metasense_edu/224403441402 전체공개·공지 고정 발행. 원고 전체, 대표 이미지, CTA href 확인.
- PC 타이틀: 네이버 권장 폭 966px에 맞춰 원본 SVG를 966×302 PNG로 출력. 리모콘 업로드, 높이 302, 중복 제목 숨김, 적용 확인. 공개 블로그 배너·첫 공지·M 로고를 스크린샷으로 검증.
- Instagram https://www.instagram.com/metasense_edu/p/Dc-D_9BDz-D/ 발행 완료. Business, Education, 로고, 소개글 및 1개 게시물 공개 화면 확인.
- 두 주요 탭 markDeliverable 처리.
- 남은 필수 협업: Instagram 모바일 앱 외부 링크 https://msense.me/trial (‘메타센스 과정·체험 안내’) 추가 후 사용자 회신 및 공개 확인. 요청 이미 전송. 브라우저 도구/사이트 제한이며 계정 재가입이나 비밀번호 입력을 다시 요청할 필요 없음.
- 모바일 블로그 커버·Instagram 하이라이트는 미적용. 검색 순위/분석/모바일 앱 자체 검증 안 함. 앱 소스코드 변경/빌드 없음.
- 운영 기준 파일을 실제 게시 상태와 URL에 맞춰 갱신했다.

## 2026-09-07 positioning verification
Instagram public profile now has msense.me/trial external link; mobile link dependency resolved. Both channel bios updated to clarify 둘시네 operation and Kakao display name. Naver shorter title saved. Phase: DONE for original account setup goal.
