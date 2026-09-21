# 초등수학 콘텐츠 운영

## 구조
- /math/ 과정 전환 페이지
- /math/books/ 교재 안내 및 공식 판매 링크
- /math/guides/ 공개 학습 노트: catalog.json + slug.md, 20편씩 자동 페이지 분할
- /math/guides/fractions/ 수학감각 분수 1·2권 기반 개념 노트 순서별 모음
- /math/guides/multiplication/ 수학감각 곱셈 기반 개념 노트 순서별 모음
- /math/guides/division/ 수학감각 나눗셈 기반 개념 노트 순서별 모음
- /math/guides/decimals/ 수학감각 소수 기반 개념 노트 순서별 모음
- /math/guides/ratios/ 수학감각 비와 비례식 1·2권 기반 개념 노트 순서별 모음
- /math/guides/editorial/ 출처와 제작 기준

## 확장 원칙
수와 연산 → 곱셈과 나눗셈 → 분수 → 소수·비례 → 학습 습관 → 부모와의 대화로 확장한다. 100편을 채우기 위한 유사 글 양산 대신, 서로 다른 질문·예제·관찰 기준을 가진 글만 발행한다. 초기 10편 동시 공개 자체보다 각 글의 독립적인 유용성과 정확성이 중요하다.

새 원고: catalog에 고유 slug, title, description, answer, category, status, published, updated, related, faq를 추가하고 같은 이름의 Markdown 파일을 만든다. status=published만 발행. 20편을 넘으면 정적 목록 페이지가 생성된다. 관련 글 slug는 실제 발행 글이어야 한다. 수정일은 실질 수정 시 변경한다.

분수 교재 기반 글은 source에 title, page, image, alt를 함께 기록한다. `public/math-assets/fractions/book-{권}/page-{쪽}.webp`는 해당 PDF 쪽을 직접 렌더링한 실제 교재 화면이며, 글의 설명·예제와 권·쪽이 일치해야 한다. `scripts/generate-fraction-guides.mjs`는 교재 기반 56편의 Markdown과 catalog 항목을 재생성한다.

곱셈 교재 기반 글도 같은 source 규칙을 사용한다. 이미지는 `public/math-assets/multiplication/book/page-{쪽}.webp`에 두며 `scripts/generate-multiplication-guides.mjs`가 50편의 Markdown과 catalog 항목을 재생성한다. 곱셈구구는 단별 유사 글을 만들지 않고 곱셈표 읽기, 종이 카드 제작, 맞음·다시 보기 분류와 자주 틀린 카드 반복이라는 실제 학습 흐름에 집중한다.

나눗셈 교재 기반 글도 같은 source 규칙을 사용한다. 이미지는 `public/math-assets/division/book/page-{쪽}.webp`에 두며 `scripts/generate-division-guides.mjs`가 50편의 Markdown과 catalog 항목을 재생성한다. 나눗셈구구는 단별 유사 글을 만들지 않고 종이 카드 제작, 맞음·다시 보기 분류, 자주 틀린 카드 반복과 관련 곱셈식 검산에 집중한다.

소수 교재 기반 글도 같은 source 규칙을 사용한다. 이미지는 `public/math-assets/decimals/book/page-{쪽}.webp`에 두며 `scripts/generate-decimal-guides.mjs`가 50편의 Markdown과 catalog 항목을 재생성한다. 각 글은 소수점을 옮기는 절차보다 1·0.1·0.01의 단위, 자릿값, 그림과 분수의 관계를 먼저 설명한다.

비와 비례식 교재 기반 글도 같은 source 규칙을 사용한다. 이미지는 `public/math-assets/ratios/book-{권}/page-{쪽}.webp`에 두며 `scripts/generate-ratio-guides.mjs`가 1권 55편과 2권 45편, 총 100편의 Markdown과 catalog 항목을 재생성한다. 각 글은 비의 항 순서와 비교량·기준량을 먼저 확인하고 비례식, 퍼센트, 단위변환, 속력과 농도로 이어 간다.

한 글: 질문 → 짧은 직접 답 → 구체적인 수학 예제 → 집에서 해볼 활동 → 관찰 기준 → 관련 글/과정. 숫자·계산·단위·전체의 기준을 검토한다. AI 초안은 그대로 학생 경험으로 꾸미지 않는다. 실제 학생 자료 없이 도구와 교재의 공개 가능한 화면을 사용한다.

## 초기 배포 후 운영
- 블로그: 전체 복제보다 질문 하나와 활동을 중심으로 재편집하고 해당 원문 링크.
- 릴스/쇼츠/클립: 불빛 카드 → 받아올림 → 분수 순서, 실제 장면 하나와 질문 하나.
- 카카오: 과정·교재 선택 안내, 관련 글 연결.
- 매주: 검색 유입어와 페이지 방문→상담/체험 이동을 확인하고 약한 문구를 수정한다. 현재 새 math 페이지의 전환 이벤트 수집은 후속 작업이다.
- Search Console/서치어드바이저 sitemap 재수집 및 URL 검사. 배포와 색인 완료를 구별한다.
- FAQ 구조화 데이터는 실제 화면 답변과 일치시킨다. 검색 리치 결과나 AI 인용을 보장하지 않는다.

## 확인된 과정 범위 (2026-09-18 사용자 보충)
현재 과정은 곱셈·나눗셈·분수·소수·비와 비례식의 5영역이며 모두 수학감각 교재 기반이다. 수세기·덧뺄셈 글은 기초 학습 안내이지 별도 개설 과정의 약속이 아니다. 다음 원고 우선순위는 소수 자릿값(0.5와 0.50), 비와 비율(기준량이 달라질 때), 비례식의 의미로 한다. 곱셈·나눗셈·소수 교재는 절판 종이책 대신 PDF로 구매 가능하다는 사실을 관련 글/교재 안내에서 일관되게 유지한다.
