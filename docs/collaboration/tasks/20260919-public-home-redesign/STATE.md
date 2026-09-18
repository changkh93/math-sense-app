# 로그아웃 홈페이지 전면 개편
- 상태: DEPLOYED_AND_VERIFIED / 2026-09-19
- 사용자 목표: 로그인 전 메인 페이지를 학부모에게 이해·신뢰·과정 선택을 제공하는 디자인으로 전면 개선.
- 기준: 911b262adf7b6189f60dd84fdf1136c64d5c8d68. 시작 시 dirty는 이전 캐시진단 문서/검증파일뿐; 보존.
- 담당: Codex 단독 구현·검증. 별도 외부 릴레이는 이번 동일 컴포넌트 통합 작업에 추가하지 않음.
- 범위: PublicHomeIntro, 공개홈 CSS/로그인대화상자, SpaceHome 비로그인 분기, prerender와 검증.
- 보존: 로그인 후 학습앱·회원인증 처리함수·Google/게스트로그인·신청 API·학생데이터.
- 완료 기준: 학부모 중심 첫화면, 실제 화면/교재 근거, 수학·파이썬·고전 안내, 체험/로그인 동선, 모바일 가로넘침 없음, HTML본문/메타 유지, 로그인 대화상자 동작, Hosting 운영 확인.
- 다음: 운영 중 실제 유입·체험 신청 전환을 별도로 측정. 디자인 배포 자체를 전환 개선 성과로 기록하지 않음.

## 완료 내용
- 밝은 아이보리·진녹색 디자인, 큰 한글 제목, 수학·파이썬 과정 카드와 고전읽기 안내, 실제 학습 화면 선택, 학습 지원 흐름, 저자·교재 소개, FAQ, 7일 무료체험 CTA.
- 로그인은 별도 native dialog로 제공. 기존 아이디/Google/초대 로그인 처리함수 유지, Escape 닫기·포커스 복귀·모바일 폭 검증.
- 첫 HTML과 로딩 중에도 새 공개홈 표시. /home-assets/** no-cache 적용.
- 2026-09-19 00:30:37 KST Hosting 배포 완료. version: 97bb8d0da6eec149. Functions/규칙/데이터 변경 없음.

## 검증
- npm run build, test-public-seo, test-math-pages(14페이지), test-python-guides(10편), test-google-auth-flow 통과.
- 신규 두 컴포넌트 ESLint 및 git diff --check 통과.
- Chrome 데스크톱 1440·모바일 390/360 폭에서 레이아웃·가로 넘침·이미지 확인. 화면 선택·로그인 열고 닫기·초대 입력 표시 확인.
- 운영 https://msense.me/ 새 디자인 및 로그인 dialog 실제 열고 닫기 확인.
- 운영 루트·CSS·수학·파이썬·체험 HTML이 dist와 해시 일치: [증거](verification/live.json). /python, /trial은 리디렉션을 따라 최종 HTML 비교.
- 실제 계정 로그인/가입/체험 제출은 수행하지 않음. 기존 빌드 경고(대형 chunk·reading.png 참조)는 이번 변경 밖의 기존 항목.

## 후속: 회원가입 진입 동선 보강
- 상단 로그인 옆에 회원가입 버튼 추가, 모바일에서는 독립 행으로 로그인·회원가입·무료체험 모두 표시.
- 첫 화면에 “상담을 마치셨나요? 학부모 회원가입” 링크와 가입 후 자녀 계정 생성 안내 추가. FAQ에도 같은 순서와 가입 링크 반영.
- 기존 /signup의 학부모 Google 인증 가입→자녀 계정 생성 흐름과 일치 확인. 실제 가입 제출 없음.
- Hosting 배포 완료, 운영 메인에서 버튼·모바일 화면(실제 viewport 400px) 확인. 가입 화면 표시 확인. 빌드·ESLint·SEO 검사 통과.

## 후속: 회원가입 정책 열람 동선 수정
- 이용약관과 개인정보처리방침 링크를 분리하고, 상단·동의 영역 모두 새 탭(_blank, noopener noreferrer)으로 열도록 변경.
- 링크를 동의 체크박스 label 밖으로 분리하여 문서 열람과 동의 선택을 구분. 기존 동의 값과 가입 처리 로직 유지.
- Hosting 배포 완료. 운영 /signup에서 두 링크가 각각 /terms, /privacy 새 탭 생성 확인. 개인정보처리방침 본문 표시 확인.
- 임시 이름 입력 후 개인정보 링크를 열어도 원래 /signup과 입력값 유지 확인, 테스트 입력은 비움. 동의/가입 제출은 하지 않음.
- ESLint, Google 인증 흐름 검사, 배포 빌드, 공개 SEO 검사 통과.

## 후속: 새로고침 시 스타일 없는 화면 노출 수정
- 원인: 홈페이지 CSS link가 React root 내부 컴포넌트에 있어 초기 본문 노출·클라이언트 재마운트 시 스타일 수명이 불안정함.
- 수정: index.html head의 렌더 차단 stylesheet로 이동, PublicHomeIntro 내부 link 제거. SPA fallback에도 유지.
- 검증: 빌드·SEO 회귀 검사 통과. JavaScript를 끈 로컬 새로고침에서도 완성된 디자인 표시, JavaScript 복원 후 headCSS=true/bodyCSS=false 및 grid·배경 유지 확인. 테스트용 실행 차단 설정 복원.

## 후속: 파이썬 새로고침 공통 로딩 화면 제거
- 원인: prerender된 파이썬 본문을 createRoot가 교체한 뒤 lazy route와 전역 퀴즈배틀 수신기가 같은 Suspense에서 대기하여 학습 앱 로딩 화면 노출.
- 수정: /python(/ 포함)·/trial/python·/trial·/consultation 초기 진입은 해당 공개 모듈을 준비한 뒤 React 시작. 준비 중 기존 HTML 유지, 준비 완료 컴포넌트는 동기 렌더. 전역 배틀 수신기는 독립 Suspense(null)로 분리.
- 모듈 다운로드 실패는 기존 ErrorBoundary 경로로 처리. 데이터/API 변경 없음.
- 검증: 지연 모듈 대기·중복 요청 방지·완료 후 동기 참조·실패 재시도 단위검사, 빌드, 공개 SEO·Google 인증 검사 통과. 로컬 /python/ 실제 제목·무료체험 안내 표시 확인. 후속 새로고침 UI 검증은 브라우저 연결 오류로 중단되어 운영 배포 후 다시 확인.
