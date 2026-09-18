# 공개 3개 페이지 SEO
Phase: DONE (student-root regression fixed and Hosting deployed)
사용자 요청: /, /trial, /python 크롤링 가능한 HTML과 고유 메타.
Codex 단독 작성. 기존 dirty 변경과 직전 배포 유지.
범위: 공개 React 소개/메타, 프리렌더 빌드, Hosting 경로, sitemap.
검증: 각 HTML 본문/고유 title/canonical, 브라우저 렌더, 운영 응답. 검색 색인 자체는 별도.

완료: 세 페이지 React 기반 정적 본문, 공통 메타 정의와 클라이언트 경로 갱신, 홈페이지 소개 섹션, robots/sitemap, SPA fallback 분리. /trial 기존 Python 고정 시간표는 확정 자율학습 조건으로 교정.
검증: 빌드·집중 ESLint·test-public-seo 및 기존 python-funnel 통과. Hosting 배포 성공. curl(인증서 검증 유지)로 세 운영 HTML의 고유 title/H1/canonical 및 robots/sitemap 확인. Chrome 메인 소개/링크, 체험 페이지 제목·본문·폼·canonical 확인. 기존 브라우저 캐시는 새로고침하여 최신 배포 확인.
제한: 홈 학습 앱 전체를 서버 렌더링하지 않음. 공개 소개는 동일 React 구성으로 초기 HTML과 실제 화면 모두 제공. 폼/학습 도구에는 JS 필요. Search Console/네이버 소유 확인·색인 요청 및 실제 검색 반영은 별도 미확인. Functions/rules 배포 없음.

## 2026-09-14 학생 루트 화면 회귀 수정
- 제보: 이수진(`y9o4DrLVFkdoednQ7Tq5DyPYLrZ2`) 학생이 초등수학 행성 진입 시 학습 화면 아래의 공개 소개 본문을 본 화면처럼 보게 됨.
- 운영 계정 읽기 확인: 사용자 문서·학생 역할·계정 활성 정상, `cluster_elementary` 문서/토큰 권한 모두 활성. 학생 데이터 수정 없음.
- 원인: `App` 루트에서 `SpaceHome`과 `PublicHomeIntro`/푸터를 항상 동시 렌더링하여 인증 학습 앱에도 공개 본문이 이어짐.
- 수정: 공개 소개·푸터를 `SpaceHome`의 `!user` 분기 안으로 이동. 기타 공개 경로의 푸터와 홈 SEO 프리렌더 HTML은 유지.
- 검증: 빌드, 공개 SEO 3경로, 학습 루트 계약, 코스 카탈로그 복구 8건+UI, 초등 행성 계약, 관련 ESLint 오류 0(기존 hook 경고 2) 통과.
- GitHub: `b4037ff57239e0071f66a53846c928a455db1bb6` (`main`) 커밋·푸시 완료. 다른 dirty 파일은 커밋하지 않음.
- 배포: Firebase Hosting 배포 완료. Functions·Firestore·Storage는 미배포.
- 운영 검증: `msense.me` 루트가 신규 메인 번들을 참조하고, 메인 번들에 공개 소개 문구 0개, 실제 참조되는 `SpaceHome-CqQB2H_h.js`에만 1개가 있음을 확인. 홈 title/canonical도 유지.
