# 중등수학 단원 구조 자동화 작업 명세서

이 문서는 신규 챕터(단원)를 추가하고 PDF 파일을 매핑하여 Firestore에 자동으로 구축하는 작업 과정을 설명합니다.

## 1. 개요
새로운 단원(예: "방정식과 부등식 III")을 추가할 때, 매번 수동으로 Firestore를 수정하는 대신 `MiddleSchoolMathBuilder.jsx` 어드민 툴을 사용하여 일괄 생성합니다.

## 2. 작업 절차

### 단계 1: PDF 파일 준비 및 업로드
1.  로컬의 신규 PDF 파일들을 프로젝트의 `public` 디렉토리 하위로 복사합니다.
    -   경로 규칙: `public/pdfs/middle_math/[단원명_영문]/`
    -   예시: `public/pdfs/middle_math/eq_and_ineq_3/`
2.  **중요 (인코딩)**: 모든 한글 파일명은 반드시 **NFC(Normalization Form C)** 방식으로 저장되어야 합니다.
    -   Mac(NFD 방식)에서 복사한 파일은 브라우저에서 404 에러가 발생할 수 있으므로, 반드시 NFC로 변환 후 커밋합니다.
3.  파일 이름은 `01_단원명.pdf`, `02_단원명.pdf` 형식을 권장합니다. (빌더에서 숫자를 제거하고 제목으로 사용함)

### 단계 2: 어드민 빌더(`MiddleSchoolMathBuilder.jsx`) 수정
`src/pages/Admin/MiddleSchoolMathBuilder.jsx` 파일을 열고 다음을 추가합니다.

1.  **PDF 파일 목록 정의**:
    ```javascript
    const NEW_CHAPTER_PDF_FILES = [
      "01_파일이름.pdf",
      "02_파일이름.pdf",
      ...
    ];
    ```
2.  **구축 핸들러 함수 추가**:
    -   대상 리전 ID와 챕터 ID를 확인합니다. (이미 생성된 챕터의 ID를 사용하거나, 빌더에서 챕터를 먼저 생성하도록 로직을 짤 수 있음)
    -   `handleBuildNewChapter` 함수를 만들어 `writeBatch`를 통해 `units` 컬렉션을 생성합니다.
3.  **UI 버튼 추가**:
    -   사용자가 클릭할 수 있도록 `return` 문 안에 버튼과 목록 표시 섹션을 추가합니다.

### 단계 3: 실행 및 검증
1.  어드민 페이지(`https://msense.me/admin/middle-math-builder`)에 접속합니다.
2.  새로 추가된 버튼(예: "🚀 방정식 III 유닛 생성")을 클릭합니다.
3.  상태 메시지가 "✅ 구축 완료"로 변경되는지 확인합니다.
4.  실제 학습 페이지나 Firestore Console에서 유닛이 올바른 챕터 하위에 생성되었는지 확인합니다.

## 3. 주의사항: 한글 인코딩 (NFC vs NFD)
Mac OS는 한글 전송 시 자음과 모음을 분리하는 **NFD** 방식을 사용하고, 웹 브라우저와 Windows는 이를 하나로 합친 **NFC** 방식을 표준으로 사용합니다.

-   **현상**: DB에는 "가"라고 적혀 있는데 서버 파일명이 "ㄱㅏ"로 되어 있으면 웹에서 파일을 찾지 못해 검은 화면만 나옵니다.
-   **해결책**:
    1.  서버에 올리는 파일명은 모두 `normalize('NFC')` 변환을 거칩니다.
    2.  `MiddleSchoolMathBuilder.jsx` 코드에 적는 한글 파일명 리스트도 NFC여야 합니다.
-   **도구**: 프로젝트 루트의 `normalize_all_files.mjs` 스크립트를 실행하여 전체 PDF 경로의 인코딩을 일괄 교정할 수 있습니다.

## 4. 주요 설정 정보
-   **Cluster ID**: `middle-math` (중등수학)
-   **Region ID**: `reg_1773407437227` (기본개념 전과정)
-   **Firestore Collections**: `regions` -> `chapters` -> `units`

## 4. 팁
-   파일명에서 숫자를 자동으로 제거하려면 `filename.replace(/^\d+_/, '').replace('.pdf', '')` 로직을 사용합니다.
-   `order` 필드는 유닛의 정렬 순서를 결정하므로 인덱스에 맞춰 1부터 부여합니다.
