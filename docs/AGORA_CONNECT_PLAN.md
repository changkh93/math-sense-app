# Agora Connect: 기술 기획서 (Technical Plan)

> 이 문서는 초기 기획 단계에서 작성된 비전 문서입니다.
> **최신 구현 현황과 운영 가이드는 [AGORA_CONNECT_MASTER_DOC.md](./AGORA_CONNECT_MASTER_DOC.md)를 참고하세요.**

---

## 프로젝트 코드명: `Agora Connect`
## 슬로건: "인터넷 전체가 당신의 강의실"

**대상 플랫폼:** Chrome / Edge / Whale (Chromium 기반)  
**기술 스택:** Vanilla JS, Vite, Manifest V3, Firebase SDK

---

## 1. 비전 및 핵심 가치

**현재 상황:** 학생들은 모르는 것을 찾으려고 학습 플랫폼을 떠납니다.  
**새로운 패러다임:** 플랫폼이 *학생을 따라갑니다.* 유튜브, 수학 블로그, 위키백과 어디에 있든 "수학 아고라"는 한 번의 클릭 거리에 있습니다.

### 핵심 혁신 아이디어
1.  **맥락 인식 캡처 (Context-Aware Capture)**
    *   **유튜브:** 정확한 타임스탬프(`?t=123s`)와 동영상 ID를 자동 캡처
    *   **텍스트 선택:** 하이라이트된 텍스트를 질문 본문에 자동 인용
    *   **스마트 태깅:** 페이지 `<title>`과 `<meta>` 태그를 활용한 자동 태그 추천

2.  **소셜 발자국 ("여기서도 질문이!" 기능)**
    *   학생이 다른 학생들이 질문을 남긴 URL을 방문하면, 확장 프로그램 아이콘이 빛나거나 토스트가 표시됨
    *   열린 웹 전체에서 '학습 커뮤니티'를 시각화

3.  **아고라 직통 워크플로우**
    *   데스크톱에 파일 저장 ❌
    *   드래그 앤 드롭 ❌
    *   **캡처 → 판서 → 질문** 5초 이내 완료 ✅

---

## 2. 기술 아키텍처

### A. Manifest V3 구조
*   **Background Service Worker:** `captureVisibleTab` 처리 및 Firebase 업로드 담당
*   **Content Script:** "오버레이 UI" — 현재 페이지 위에 떠있는 Canvas 드로잉 레이어
*   **Popup:** 로그인 상태, "최근 활동", 설정을 위한 경량 메뉴
*   **Options Page:** 상세 설정 (예: "유효한 URL에서 자동 열기") — *미구현*

### B. Firebase 연동 전략
확장 프로그램은 다른 출처(`chrome-extension://…`)에서 실행되므로, 자체 Auth 인스턴스를 초기화하되 *같은* Firebase 프로젝트를 공유합니다.
*   **Auth:** 사용자는 확장 프로그램 팝업에서 구글 로그인 (IndexedDB Persistence)
*   **Firestore:** `questions` 컬렉션에 직접 쓰기
*   **Storage:** `/agora-connect/{uid}/{timestamp}.png` 경로에 업로드

### C. 데이터 스키마 확장
기존 `questions` 문서 구조에 확장 프로그램 전용 필드를 추가합니다:
```javascript
{
  ...기존필드전체,
  source: "agora-connect",        // 'web-app'과 구분
  sourceUrl: "https://youtube.com/watch?v=...",
  sourceTitle: "EBS 수학 가이드 - 선형대수",
  contextData: {                  // Phase 2에서 추가 예정
    timestamp: 145,               // 동영상용
    selection: "이차함수의 공식은…",  // 선택된 텍스트
  }
}
```

---

## 3. 구현 단계

### Phase 1: MVP — "렌즈" (핵심 캡처) ✅ 완료
*   브라우저 아이콘 클릭 → "캡처 모드" 진입
*   화면 고정 (이미지 오버레이)
*   브러시 도구 (빨강/파랑), 스탬프 (①②③), 화살표 프리셋
*   "질문하기" 버튼 → Firebase 업로드 → 오버레이 닫힘

### Phase 2: 컨텍스트 & "스마트" 기능 — ⬜ 예정
*   유튜브 Player API 연동으로 재생 시간 추출
*   HTML 파싱으로 페이지 제목/메타 추출
*   Shift+Click으로 특정 DOM 요소 캡처

### Phase 3: "커넥트" (소셜 레이어) — ⬜ 예정
*   Background 스크립트가 `sourceUrl == currentTab.url` 쿼리
*   확장 프로그램 아이콘에 뱃지 카운터 업데이트
*   카운터 클릭 시 "이 페이지에서 올린 질문 목록" 표시

---

## 4. UI/UX 핵심 포인트
*   **"프리즈" 이펙트:** 활성화 시 페이지 채도를 약간 낮추고, 활성 영역은 선명하게 유지
*   **물리 기반 펜:** `perfect-freehand` 라이브러리로 실제 잉크 느낌의 부드러운 가변 두께 선
*   **사운드 디자인:** 캡처 시 "찰칵" 셔터음, 전송 시 "슈웅" 효과음 (선택적, 토글 가능)

---

**문서 최종 업데이트:** 2026.02.19 (v2.0 — 마스터 문서와 역할 분리)
