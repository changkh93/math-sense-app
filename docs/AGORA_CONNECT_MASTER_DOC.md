# 🌌 아고라 커넥트 (Agora Connect) 마스터 문서

> **"인터넷의 모든 페이지가 당신의 강의실이 됩니다."**
> 
> 이 문서는 수학 아고라의 전용 크롬 확장 프로그램인 **'아고라 커넥트'**의
> 기획 의도, 기술 아키텍처, 개발 현황, 로드맵, 검토사항, 아이디어를
> **빠짐없이** 정리한 마스터 문서입니다.

---

## 목차
1. [프로젝트 개요 및 목적](#1-프로젝트-개요-및-목적)
2. [개발 가이드](#2-개발-가이드)
3. [완료한 과업](#3-완료한-과업)
4. [앞으로 해야 할 것](#4-앞으로-해야-할-것)
5. [검토사항 및 주의점](#5-검토사항-및-주의점)
6. [운영 및 배포 고려사항](#6-운영-및-배포-고려사항)
7. [기타 아이디어](#7-기타-아이디어)
8. [핵심 설계 결정 기록](#8-핵심-설계-결정-기록)

---

## 1. 프로젝트 개요 및 목적

### 🎯 핵심 목표
학생들이 우리 사이트(수학 아고라)를 떠나 유튜브, 블로그, 위키백과 등 외부 웹사이트에서 학습하다가 막혔을 때, **'맥락을 유지한 채'** 즉시 질문할 수 있도록 지원합니다.

### 💡 기획 의도
1.  **학습 경험의 확장:** 우리 앱의 '질문하기' 기능을 브라우저 전체로 확장하여, 수학 아고라를 인터넷 학습의 **'베이스캠프(Hub)'**로 만듭니다.
2.  **원클릭 워크플로우:** [캡처 → 저장 → 사이트 이동 → 업로드]의 번거로운 4단계를 **[캡처 & 판서 → 전송]**의 1단계로 단축합니다.
3.  **질문의 퀄리티 향상:** '어느 부분이 모르는지' 텍스트로 설명하기 힘든 수학 질문의 특성을 고려하여, **화면 위에 직접 그림(판서), 번호(Stamp), "여기가 모르겠어요!" 화살표**를 남길 수 있게 합니다.

### 🚀 핵심 혁신 아이디어
| 아이디어 | 설명 |
|---------|------|
| **맥락 인식 캡처** | 유튜브 타임스탬프, 텍스트 선택, 페이지 제목을 자동으로 수집 |
| **소셜 발자국 ("여기서도 질문이!")** | 학생이 방문한 URL에 다른 학생의 질문이 있으면 아이콘 뱃지로 표시 |
| **원클릭 전송** | 파일 저장 과정 없이 캡처 → 판서 → 전송을 5초 이내에 완료 |

---

## 2. 개발 가이드

### 🏗️ 기술 스택
| 항목 | 기술 |
|------|------|
| Content Script | Vanilla JS (모듈 import 불가 → 순수 JS) |
| Background Service Worker | ES Module (Firebase SDK 번들링) |
| Popup | HTML + ES Module JS (Firebase Auth) |
| Build Tool | Vite (커스텀 multi-entry config) |
| Extension Spec | **Manifest V3** (Chrome 최신 표준) |
| Backend | Firebase (Auth, Firestore, Storage) — 메인 웹 앱과 프로젝트 공유 |

### 📂 프로젝트 구조
```
math-sense-app/
├── agora-connect-ext/           # 확장 프로그램 소스 루트
│   ├── background.js            # 서비스 워커
│   │   └─ Firebase 초기화, 캡처 API, 질문 제출, Auth 동기화
│   ├── content.js               # 웹페이지 주입 스크립트
│   │   └─ 오버레이 UI, Canvas 드로잉 (펜/스탬프/화살표/Undo)
│   ├── popup.html               # 팝업 UI
│   ├── popup.js                 # 팝업 로직
│   │   └─ Firebase Auth (로그인/로그아웃), Auth Persistence
│   ├── styles.css               # 팝업 스타일
│   ├── manifest.json            # Manifest V3 설정
│   └── icons/                   # 아이콘 리소스 (SVG)
├── vite.config.ext.js           # 확장 프로그램 전용 빌드 설정
├── dist-ext/                    # [빌드 결과물] 이 폴더를 크롬에 로드
└── package.json                 # "build:ext" 스크립트 포함
```

### 🛠️ 빌드 및 설치

```bash
# 확장 프로그램 빌드 (./dist-ext 폴더 생성)
npm run build:ext
```

**크롬에서 설치:**
1.  `chrome://extensions` 접속
2.  우측 상단 **'개발자 모드'** 켜기
3.  **'압축해제된 확장 프로그램을 로드합니다'** 클릭
4.  프로젝트 루트의 **`dist-ext`** 폴더 선택

### 🔗 데이터 스키마 (Firestore `questions` 컬렉션)
확장 프로그램에서 생성하는 문서는 메인 웹 앱(`useQA.js`)과 **완전히 호환**됩니다.

```javascript
{
  // ===== 기본 필드 (useQA.js 호환) =====
  userId: "abc123",
  userName: "학생이름",
  content: "이 공식이 왜 여기서 쓰이나요?",
  type: "concept",
  category: "general",
  isPublic: true,
  status: "open",
  upvotes: 0,
  upvotedBy: [],
  answerCount: 0,
  drawingUrl: "https://storage.../agora-connect/...",
  quizId: null,
  quizContext: { chapterId: '', unitId: '', questionId: '', wrongAnswer: null, quizTitle: '' },
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),

  // ===== 확장 프로그램 전용 필드 =====
  source: "agora-connect",                              // 출처 구분
  sourceUrl: "https://youtube.com/watch?v=xxx&t=145",    // 캡처한 페이지 URL
  sourceTitle: "EBS 수학 - 일차함수"                       // 캡처한 페이지 제목
}
```

---

## 3. 완료한 과업

### ✅ 기본 인프라
- [x] **Manifest V3** 설정 완료 (`activeTab`, `scripting`, `storage`, `contextMenus`)
- [x] **Vite 빌드 파이프라인** (`npm run build:ext`) 자동화

### ✅ 캡처 & 드로잉
- [x] **원클릭 캡처:** 팝업 버튼 클릭 → `captureVisibleTab` API → 오버레이
- [x] **우클릭 컨텍스트 메뉴:** "📸 아고라에 질문하기" → 캡처 & 오버레이
- [x] **펜 도구:** 빨간색 / 파란색 펜
- [x] **번호 스탬프 (①②③):** 금색 원형 배경 + 흰 테두리 + 번호 자동 증가
- [x] **"여기가 모르겠어요!" 화살표 프리셋:** 클릭 한 번으로 빨간 화살표 + 라벨 배치
- [x] **Undo 기능:** `Ctrl+Z` 또는 ↩ 버튼 (최대 20단계)
- [x] **ESC 키로 오버레이 닫기**
- [x] **마우스 이탈 시 그리기 자동 종료** (경계 밖 드래그 방지)

### ✅ Firebase 연동
- [x] **Auth:** Google 로그인 + `browserLocalPersistence` (IndexedDB)
- [x] **Auth 영속성:** `chrome.storage.local`에 토큰 저장 → 팝업 닫아도 유지
- [x] **Auth 동기화:** popup 로그인 → `SYNC_AUTH` 메시지 → background 인증 복원
- [x] **Storage:** 캡처 이미지 업로드 (`agora-connect/{uid}/{timestamp}.png`)
- [x] **Firestore:** `questions` 컬렉션에 문서 생성 (메인 앱과 완전 호환)

### ✅ UX 개선
- [x] **저작권 안내 배너:** 하단에 "출처 정보가 함께 기록됩니다" 표시
- [x] **전송 진행 상태 표시:** 버튼 텍스트 변경 ("⏳ 전송 중...")
- [x] **성공 토스트 알림:** 전송 완료 시 화면 상단에 초록색 토스트
- [x] **로그인 유도 안내:** 미로그인 시 친절한 에러 메시지

---

## 4. 앞으로 해야 할 것

### 🚀 Phase 2: 스마트 컨텍스트 (우선순위: 높음)
| 항목 | 설명 | 난이도 |
|------|------|--------|
| 유튜브 타임스탬프 | 유튜브 페이지 감지 → 현재 재생 시간 자동 추출 → `contextData.timestamp` 저장 | 중 |
| 텍스트 선택 | 드래그로 선택된 텍스트를 자동으로 질문 본문에 인용 | 하 |
| 페이지 메타 태그 | `<title>`, `<meta description>` 파싱 → 자동 태그 추천 | 하 |

### 🧩 Phase 3: 소셜 레이어 (우선순위: 중간)
| 항목 | 설명 | 난이도 |
|------|------|--------|
| "여기서도 질문이!" | 방문 URL ↔ Firestore `sourceUrl` 매칭 → 아이콘 뱃지 | 중 |
| 외부 질문 필터 | 아고라 메인에 `source === 'agora-connect'` 질문만 보는 탭 추가 | 하 |
| 인기 학습 행성 | 어느 사이트에서 질문이 가장 많이 나오는지 통계 → 추천 소스 | 높 |

### 🎨 Phase 4: UX 고도화 (우선순위: 낮음)
| 항목 | 설명 |
|------|------|
| 드로잉 굵기 조절 | 슬라이더로 펜 두께 1~10px 조절 |
| 형광펜 모드 | 반투명 노란색 하이라이터 |
| Physics Pen | `perfect-freehand` 라이브러리로 부드러운 잉크 느낌 |
| 사운드 디자인 | 캡처 시 셔터음, 전송 시 "슈웅" 효과음 (토글 가능) |

---

## 5. 검토사항 및 주의점

### 🔴 1. Firebase 인증 도메인 설정 (필수)
확장 프로그램의 고유 출처(`chrome-extension://<ID>`)를 Firebase에 등록해야 합니다.
1.  **Firebase Console > Authentication > Settings > Authorized Domains**
2.  `chrome-extension://<확장 프로그램 ID>` 추가
3.  ⚠️ 개발자 모드에서 재설치하면 **ID가 변경**될 수 있으므로, 업데이트마다 확인 필요

### 🔴 2. 로그인 지속성 (Auth Persistence) — **해결 완료**
| 문제 | 해결 방법 |
|------|----------|
| 팝업 닫으면 Firebase Auth 세션 소실 | `setPersistence(auth, browserLocalPersistence)` → IndexedDB 영속 저장 |
| background 워커 재시작 시 인증 없음 | popup 로그인 시 Google OAuth `idToken`을 `chrome.storage.local`에 저장 → background 시작 시 `signInWithCredential()`로 복원 |
| popup ↔ background 인증 불일치 | `SYNC_AUTH` 메시지로 즉시 동기화 |

### 🟡 3. 권한 전략 (Chrome 웹스토어 심사 대비)
| 현재 | 목표 (배포 시) |
|------|----------------|
| `content_scripts.matches: <all_urls>` | `activeTab`만 사용 + `chrome.scripting.executeScript`로 사용자 클릭 시에만 주입 |
| `host_permissions: <all_urls>` (제거됨) | `activeTab` 권한으로 대체 (사용자가 아이콘 클릭했을 때만 해당 탭 접근) |

> **전략:** MVP 기간에는 `content_scripts`에서 `<all_urls>`를 사용하되,
> 웹스토어 배포 전에 아래와 같이 변경합니다:
> 1. `content_scripts` 항목 삭제
> 2. popup.js에서 `chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] })` 호출
> 이렇게 하면 사용자가 명시적으로 클릭할 때만 권한이 발동되어 심사 통과율이 크게 올라갑니다.

### 🟡 4. CORS 및 이미지 오염
`captureVisibleTab`은 브라우저 네이티브 API이므로 Cross-Origin 문제가 없습니다.
단, 추후 DOM 요소를 직접 캡처(`html-to-image` 등)할 경우 Tainted Canvas 에러에 주의해야 합니다.

---

## 6. 운영 및 배포 고려사항

### 📋 저작권 가이드라인
외부 사이트를 캡처하는 기능이므로 저작권 이슈에 대비해야 합니다.

| 조치 | 상태 |
|------|------|
| 캡처 오버레이 하단에 **"출처 정보가 함께 전송됩니다"** 안내 배너 표시 | ✅ 구현 완료 |
| Firestore 문서에 `sourceUrl` 필드 자동 포함 | ✅ 구현 완료 |
| 아고라 앱에서 외부 질문 답변 시 원문 링크 바로가기 버튼 표시 | ⬜ 미구현 |
| 이용약관에 "캡처 이미지는 학습 질문 목적으로만 사용" 명시 | ⬜ 미구현 |

### 🏪 Chrome 웹스토어 등록 체크리스트
- [ ] 스크린샷 5장 이상 (1280×800 또는 640×400)
- [ ] 설명문 (한국어/영어)
- [ ] 개인정보처리방침 URL
- [ ] 아이콘 (128px PNG, 투명 배경 권장)
- [ ] 권한 축소 (`activeTab` 전략 적용 후)

---

## 7. 기타 아이디어

### 💡 Ctrl+V 붙여넣기 (웹 앱 측)
확장 프로그램이 없어도 윈도우/맥 캡처 도구로 캡처한 이미지를 아고라 질문창에 `Ctrl+V`로 즉시 첨부할 수 있도록 `onPaste` 핸들러를 강화합니다.
> 📌 현재 `QuestionModal.jsx`에 `handlePaste` 기능이 **이미 구현되어 있음** (line 180-192).

### 💡 게이미피케이션 연동
- 외부 질문(`source: 'agora-connect'`)도 **연속 학습(Streak)**에 포함
- "아고라 커넥트로 외부에서 질문 3번 해결" → **'우주 탐험가' 뱃지** 획득
- 외부 질문 시 **광석(Crystals) 보상** 동일 적용

### 💡 자동 출처 랭킹 ("인기 학습 행성")
어느 사이트(EBS, 수학 블로그 등)에서 학생들이 가장 많이 질문하는지 통계를 내어,
아고라의 **'인기 학습 행성'** 메뉴로 보여줍니다.

### 💡 유튜브 수학 선생님 소환
유튜브 영상 위에서 질문하면, 해당 영상의 **재생 시간(Timestamp)**까지 기록합니다.
선생님은 영상의 해당 시점을 바로 확인하며 답변할 수 있습니다.

---

## 8. 핵심 설계 결정 기록

### 🏛️ 왜 popup과 background가 각각 Firebase를 초기화하는가?
크롬 확장 프로그램에서 popup과 background service worker는 **별도의 실행 컨텍스트**입니다.
같은 Firebase App 인스턴스를 공유할 수 없으므로, 각각 `initializeApp()`을 호출합니다.
이 문제를 해결하기 위해 **`SYNC_AUTH` 메시지 패턴**을 도입했습니다:

```
[popup 로그인] 
  → Google OAuth idToken 획득 
  → chrome.storage.local에 저장 
  → background에 SYNC_AUTH 메시지 전송 
  → background에서 signInWithCredential()로 인증

[background 재시작 시] 
  → chrome.storage.local에서 토큰 읽기 
  → signInWithCredential()로 인증 복원
```

### 🏛️ 왜 content_scripts에 `<all_urls>`를 사용하는가?
MVP 단계에서는 모든 페이지에서 즉시 캡처가 가능해야 합니다.
배포 시에는 `chrome.scripting.executeScript`를 사용하여 사용자 클릭 시에만 주입하는 방식으로 전환합니다.
이는 Chrome 웹스토어 심사 통과를 위한 핵심 전략입니다.

---

**문서 최종 업데이트:** 2026.02.19 (v2.0 — 코드 전면 점검 및 보강 후)
