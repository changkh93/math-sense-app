# Python 신청 전환 개선
Phase: DEPLOYED
사용자 목표: 한 달 신청0 보고에 따라 /python 검색·설명·결과물·체험 동선을 개선하고 마케팅 실행 기준 전환.
Baseline:40362f0. 기존 crew 관련 source/functions/package 수정 보존. Codex 단독 작성, 외부 위임 없음.
범위: PythonEducation, 검색용 HTML 빌드, 공개 SEO 자산, 전환 측정 준비와 마케팅 문서. 타 서비스·학생 기록 변경 없음.
완료 기준: JS 실행 전 /python HTML 본문/메타 존재, 모바일 CTA·폼 성공/실패 검증, 실제 교육 근거 문구, 개인정보 없는 전환 이벤트, 빌드/검증 기록. 운영 배포는 전체 dirty 변경 검토 후 별도 범위 결정.
확인: 현재 index.html은 빈root와 Meta Sense 제목, PythonEducation은 클라이언트에서만 메타 설정. 신청 백엔드는 학생 이름도 필수. 7일 체험/추천4주 기존 정책 유지하며 운영 조건 질문 중.

## 최종 결과 — 2026-09-13
- 확정 조건: 초3부터, 자율 학습, 월 15만 원, 기본 7일 체험, 신청 후 1일 이내 연락.
- 첫 화면, 실제 8초 시연, 결과물 카드, 저자 소개, 반복 CTA, FAQ와 선택 입력 개선. 검색용 HTML·메타·robots·sitemap 배포.
- Firebase Hosting 배포 완료. Functions/rules 변경 없이 기존 사용자 수정 보존.
- 운영 https://msense.me/python HTML에서 H1·초3·월15만 원·7일·1일 이내·canonical 확인. Chrome 새로고침 후 새 화면과 신청 폼 렌더링 확인.
- 빌드, 집중 ESLint, scripts/test-python-funnel.mjs 통과. 모바일 폭 및 CTA 확인. 브라우저 모의 응답으로 오류·입력 유지·재시도·중복 잠금·성공 확인. 실제 신청/알림 수신 검증은 이번 작업에 포함하지 않음.
- 후속: GA/GTM 수집 연결 및 수신 확인, Google/네이버 색인 확인, 채널 유입 링크 적용. dataLayer 이벤트 준비만 완료했으며 통계 수집 완료로 간주하지 않음.
- 마케팅 실행 계획: docs/marketing/PYTHON-CONVERSION-PLAN.md. 광고 집행·외부 게시 없음.
