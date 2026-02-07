# 교재 기반 퀴즈 제작 및 데이터 마이그레이션 가이드

이 문서는 '수학감각' 교재를 바탕으로 앱 내 퀴즈 데이터를 생성, 검수, 그리고 데이터베이스(Firestore)에 반영하는 전체 과정을 설명합니다.

## 1. 작업 목표
- 교재의 목차와 페이지 내용을 정확히 반영한 퀴즈 데이터 생성.
- 수학 수식(분수, 소수 등)의 올바른 웹 렌더링(LaTeX).
- 데이터베이스 구조(Region -> Chapter -> Unit -> Quiz)의 일관성 유지.

## 2. 파일 구조 및 역할

작업 시 주로 다루게 될 파일들은 다음과 같습니다.

| 파일 경로 | 역할 | 비고 |
|---|---|---|
| `src/data/regions.js` | 전체 대단원(Region), 챕터(Chapter), 유닛(Unit)의 구조와 메타데이터 정의 | **목차의 기준**이 되는 파일 |
| `src/data/decimalChapter2Quizzes.js` 등 | 실제 퀴즈 문제, 보기, 정답, 힌트 데이터가 담긴 파일 | 파일명은 챕터별로 구분 |
| `src/utils/seedFirestore.js` | 정의된 정적 데이터(JS)를 Firestore에 업로드하는 스크립트 | 데이터 매핑 로직 포함 |
| `src/pages/MigratePage.jsx` | 마이그레이션을 실행하는 관리자용 UI 페이지 | `/migrate` 경로 |

## 3. 작업 프로세스 상세

### 1단계: 목차 및 구조 정의 (`regions.js`)
가장 먼저 교재의 목차를 보고 `src/data/regions.js`에 구조를 잡아야 합니다.
*   **주의사항:** `regions.js`에 정의된 `id`와 순서는 데이터베이스의 키(Key)가 되므로 신중하게 작성해야 합니다.
*   **페이지 매핑:** 유닛 제목에 `(p123-130)`과 같이 교재 페이지를 명시하여 검수 시 혼동을 방지합니다.

```javascript
// 예시: regions.js
{
  id: 'decimals', // 대단원 ID
  chapters: [
    {
      id: 'chap6', // 챕터 ID
      title: '제2장: 소수의 사칙연산',
      units: [
        { id: 'unit9', title: '9. 자연수 나누기 자연수 (p132-136)' }, // 유닛 ID와 제목
        // ...
      ]
    }
  ]
}
```

### 2단계: 퀴즈 데이터 파일 생성 및 작성
각 챕터에 해당하는 JS 파일을 `src/data/` 폴더에 생성하거나 수정합니다.

#### 데이터 구조
```javascript
export const decimalChapter2Quizzes = {
  'unit9': { // regions.js의 unit ID와 일치해야 함
    title: '9. 자연수 나누기 자연수 (p132-136)',
    questions: [
      {
        id: '6-9-1', // 고유 ID (학년-단원-문제번호 규칙 권장)
        question: '$1 \\div 2$의 값은?', // 질문
        options: ['0.5', '0.2', '0.1', '0.05'], // 보기 (4지선다)
        answer: '0.5', // 정답 (보기 텍스트와 정확히 일치)
        hint: '1을 2로 나누면 반입니다.' // 힌트
      },
      // ...
    ]
  }
};
```

#### ⚠️ 중요: 수학 수식 (LaTeX) 작성 규칙
앱은 `KaTeX`를 사용하여 수식을 렌더링합니다. 따라서 **모든 수식은 `$` 기호로 감싸야 합니다.**

*   **분수 표현:**
    *   ❌ 잘못된 예: `1/2`, `\frac{1}{2}` (텍스트로만 나옴)
    *   ✅ 올바른 예: `$\frac{1}{2}$` (수식으로 렌더링됨)
    *   보기(Options)에도 적용 필수: `['$\\frac{1}{2}$', '$\\frac{1}{3}$', ...]`

*   **나눗셈 기호:**
    *   `÷` 기호 대신 `$\\div$`를 권장합니다. (예: `$1 \\div 2$`)
    *   곱셈은 `$\\times$`를 사용합니다.

### 3단계: 데이터 매핑 (`seedFirestore.js`)
새로 만든 퀴즈 파일이 있다면 `src/utils/seedFirestore.js`에 임포트하고 매핑을 추가해야 합니다.

```javascript
// src/utils/seedFirestore.js
import { decimalChapter2Quizzes } from '../data/decimalChapter2Quizzes.js';

const quizDataMapping = {
  // regions.js의 chapter ID : 임포트한 퀴즈 데이터 객체
  'chap6': decimalChapter2Quizzes,
  // ...
};
```

### 4단계: 데이터 마이그레이션 (DB 반영)
작성한 코드는 로컬 파일에만 존재하므로, 이를 Firestore 데이터베이스에 업로드해야 앱에서 볼 수 있습니다.

1.  로컬 개발 서버 실행: `npm run dev`
2.  마이그레이션 페이지 접속: `http://localhost:5173/migrate`
3.  **"Start Migration"** 버튼 클릭.
4.  콘솔(F12)에 "Seeding Complete!" 메시지가 뜨는지 확인.

## 4. 자주 발생하는 실수 (Checklist)

1.  **Unit ID 불일치:** `regions.js`의 unit ID와 퀴즈 파일의 key(`'unit9'`)가 다르면 퀴즈가 로드되지 않습니다.
2.  **페이지 밀림:** 중간에 유닛을 임의로 추가하거나 빼면, 이후 유닛들의 내용이 교재 페이지와 맞지 않게 됩니다. 반드시 교재 목차를 기준으로 인덱싱하세요.
3.  **LaTeX `$` 누락:** 분수나 수식이 렌더링되지 않고 `\frac...` 코드가 그대로 보인다면 `$` 기호가 빠진 것입니다.
4.  **정답 불일치:** `answer` 필드의 값은 `options` 배열에 있는 문자열과 **띄어쓰기 포함 정확히 일치**해야 정답 처리가 됩니다.

이 가이드를 준수하여 작업을 진행해 주시기 바랍니다.
