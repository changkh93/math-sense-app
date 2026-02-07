# 개발환경, 실운영환경 및 배포 가이드

이 문서는 '수학감각(Math Sense)' 애플리케이션의 개발 환경 설정, 실운영 환경 정보, 그리고 배포 절차를 설명합니다.

## 1. 프로젝트 정보

*   **프로젝트명:** Math Sense App (수학감각)
*   **GitHub 리포지토리:** [https://github.com/changkh93/math-sense-app](https://github.com/changkh93/math-sense-app)
*   **실운영 사이트 (Production):** [https://math-sense-1f6a8.web.app](https://math-sense-1f6a8.web.app)
*   **호스팅 플랫폼:** Firebase Hosting

## 2. 개발 환경 (Development Environment)

로컬 컴퓨터에서 코드를 수정하고 테스트하기 위한 환경 설정 방법입니다.

### 필수 요구 사항
*   **Node.js** (v18 이상 권장)
*   **npm** (Node.js 설치 시 포함됨)
*   **Git**
*   **Firebase CLI** (`npm install -g firebase-tools`)

### 설치 및 실행

1.  **리포지토리 복제 (Clone)**
    ```bash
    git clone https://github.com/changkh93/math-sense-app.git
    cd math-sense-app
    ```

2.  **의존성 설치 (Dependencies)**
    ```bash
    npm install
    ```

3.  **개발 서버 실행 (Local Server)**
    ```bash
    npm run dev
    ```
    *   실행 후 브라우저에서 `http://localhost:5173` 접속.
    *   코드를 수정하면 자동으로 새로고침됩니다 (HMR).

## 3. 배포 가이드 (Deployment Guide)

코드를 수정하고 테스트를 마친 후, 실운영 사이트에 반영하는 절차입니다.

### 1단계: 코드 빌드 (Build)
리액트 코드를 브라우저가 이해할 수 있는 정적 파일로 변환합니다.
```bash
npm run build
```
*   결과물은 `dist` 폴더에 생성됩니다.
*   *주의:* 빌드 에러가 발생하면 배포할 수 없습니다. 에러를 먼저 수정해주세요.

### 2단계: Firebase 배포 (Deploy)
빌드된 `dist` 폴더의 내용을 Firebase Hosting 서버로 전송합니다.
```bash
firebase deploy
```
*   배포가 완료되면 콘솔에 `Hosting URL`이 표시됩니다.

## 4. Git 작업 흐름 (Workflow)

코드를 수정할 때마다 버전 관리를 위해 Git을 사용합니다.

1.  **변경 사항 확인**
    ```bash
    git status
    ```

2.  **변경 사항 스테이징 (Staging)**
    ```bash
    git add .
    ```

3.  **커밋 (Commit) - 변경 내용 기록**
    ```bash
    git commit -m "작업 내용 요약 (예: 챕터 2 퀴즈 수정)"
    ```

4.  **푸쉬 (Push) - GitHub에 업로드**
    ```bash
    git push origin main
    ```

## 5. 주요 파일 및 폴더 구조

*   `src/`: 소스 코드 메인 폴더
    *   `data/`: 퀴즈 데이터 및 지역(Region) 설정 파일
    *   `pages/`: 각 페이지 컴포넌트 (Admin, Game 등)
    *   `components/`: 재사용 가능한 UI 컴포넌트
*   `public/`: 정적 이미지 및 에셋
*   `docs/`: 프로젝트 문서 (이 가이드 포함)
*   `firebase.json`: Firebase 호스팅 설정
*   `vite.config.js`: Vite 빌드 도구 설정

---
**문의 및 유지보수**
이 프로젝트는 React + Vite + Firebase로 구축되었습니다. 추가적인 기능 개발이나 유지보수 시 위 가이드를 참고하시기 바랍니다.
