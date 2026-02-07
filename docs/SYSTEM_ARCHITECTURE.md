# 시스템 아키텍처 가이드

이 앱은 React로 구축되었으며 파이어베이스를 백엔드로 사용합니다.

## 1. 상위 컴포넌트 구조 (`App.jsx`)
- **상태 관리**: 사용자 로그인, `userData`, 현재 뷰(map, dashboard, ranking), 선택된 지역/장/단원을 관리합니다.
- **내비게이션**: 상단 메뉴바를 통해 대시보드와 랭킹을 전환합니다.
- **인증**: Firebase Auth(Google)를 사용하여 학생을 식별합니다.

## 2. 핵심 모듈
### QuizView.jsx
- 퀴즈 풀이 엔진입니다.
- **주요 기능**: 보기 랜덤 셔플, LaTeX 렌더링 지원, 오답 재풀이 모드.
- **데이터 흐름**: `onComplete` 콜콜백을 통해 `{ score, total, questions }` 데이터를 부모(`App`)에게 전달합니다.

### Dashboard.jsx / Ranking.jsx
- **Dashboard**: 파이어베이스에서 해당 유저의 `history` 서브컬렉션을 쿼리하여 표 형태로 보여줍니다.
- **Ranking**: `users` 컬렉션에서 `orbs` 순으로 상위 10명을 실시간으로 가져옵니다.

## 3. 확장 시 주의사항
- 신규 주제(예: 곱셈) 추가 시 `src/data/regions.js`에 새 지역을 등록하고 아이콘과 색상을 지정하세요.
- `App.jsx`의 `getQuizData` 함수에서 조건문을 추가하여 신규 JS 데이터를 연결해야 합니다.
