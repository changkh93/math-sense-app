# 파이썬 학습 노트 편집·확장 방법

원본은 글마다 독립 MD, 메타데이터는 catalog.json. status=published만 빌드·목록·사이트맵에 포함한다. 원본 파일 이름은 slug와 같아야 한다. 초안은 draft로 등록할 수 있다. 콘텐츠 본문 전체를 앱 번들에 넣지 않고 정적 페이지로 생성한다.

## 새 글

1. 기존 글과 검색 의도가 다른지 확인하고 BACKLOG에서 후보를 고른다.
2. slug.md를 작성한다. 시작에 독자 질문/구체적 장면, H2 3~5개, 직접 해볼 활동, 실제 근거·출처를 넣는다. H1은 템플릿이 생성한다.
3. catalog.json에 title, category, description, answer, image, imageAlt, imageCaption, published, updated, status, author, faq, related, sources를 추가한다. 사람이 집필·검수하지 않았다면 사람의 이름·검수 완료 표시를 임의로 쓰지 않는다.
4. 이미지는 public/python-guides/assets 또는 검증된 공개 파일만 사용한다. 글에 이미지 출처/실제 화면 여부/삽화 여부를 명시한다. 자산 이력은 docs/marketing/PYTHON-GUIDE-ASSETS.md.
5. 코드 실제 실행, 사실 검토, 개인정보·이용권한, 기존 글 중복, 모바일 읽기, 링크를 확인한다. 900자 검사 통과는 품질 인증이 아니다.
6. npm run build && npm run test:python-guides. 페이지가 실제 존재하는 URL인지 확인한 뒤 Hosting 배포. JSON-LD는 화면에 보이는 내용과 일치해야 한다.
7. SNS용 요약과 다음 점검일을 기록한다. 수정일은 실질 수정시에만 바꾼다.

## 규모와 운영

20편 단위 페이지네이션을 자동 생성한다. 101편이면 목록 6페이지가 생긴다. 페이지별 canonical/Article/BreadcrumbList/FAQPage 및 sitemap/llms.txt는 자동 생성한다. llms.txt는 보조 목차다. 향후 카테고리별 자료가 충분해지면 카테고리 허브를 추가하며 빈 허브를 미리 공개하지 않는다.

스크립트: scripts/build-python-guides.mjs. 스타일: public/python-guides/guide.css. 문서 본문에는 앱 JS가 필요 없다. 신청은 /python#apply에서 한다.
