# 미션 컨트롤 덱 & AI 오토-태깅 개발 로그 (Mission Control Deck DevLog)

> **작성일:** 2026-02-26  
> **범위:** Phase 1 ~ Phase 7 (멀티-트랜스미션 & AI 자동 매핑)  
> **연관 문서:** `META_SENSE_MULTI_TRANSMISSION_AI_TAGGING.md` (전략 원본)

---

## 📋 완료된 작업 요약

### Phase 1: 미션 컨트롤 덱 (Frontend) ✅
학생 화면(`MissionHub`)에서 단원별 영상과 텍스트 학습 자료를 탐색할 수 있는 핵심 컴포넌트를 구현했습니다.

| 파일 | 역할 |
|------|------|
| `src/components/Space/MissionHub.jsx` | 영상(Transmission) 탭 / 텍스트(Data Log) 탭 전환, 유튜브 플레이어 렌더링 |
| `src/components/Space/MissionMarkdownViewer.jsx` | 마크다운 텍스트를 HTML로 렌더링 (헤더, 표, 수식, 볼드, 이미지 등) |

### Phase 2: 어드민 콘텐츠 에디터 ✅
관리자가 단원별 영상 정보와 텍스트 자료를 편집할 수 있는 관리 도구를 개발했습니다.

| 파일 | 역할 |
|------|------|
| `src/pages/Admin/MissionContentEditor.jsx` | 영상 ID/시작/종료 시간 입력, Data Log 마크다운 편집기, Firebase Storage 이미지 업로드 |
| 라우트: `/admin/mission/:unitId` | ContentManager에서 "Mission Content" 버튼으로 진입 |

### Phase 3: 라이브 프리뷰 ✅
`MissionContentEditor`에 실시간 마크다운 미리보기 패널을 추가했습니다.
- 좌측 에디터, 우측 프리뷰의 Side-by-Side 레이아웃
- `MissionMarkdownViewer` 컴포넌트를 공유하여 학생 화면과 동일한 렌더링 보장

### Phase 4: 보안 & 안전 강화 ✅
- Firestore Rules: `quizzes` 컬렉션을 `isAuth()` 조건으로 읽기 제한
- 유튜브 플레이어 `onError` 핸들러 추가 ("교신 장애" 폴백 UI)
- 유저 활동 로그(`activityLogs`)를 Firestore에 기록

### Phase 5: 어드민 운영 & 검증 도구 ✅
- `MissionContentEditor`에 YouTube ID 정규식 및 시간 범위 검증 로직 추가
- `GhostCleaner.jsx`에 Firebase Storage 고아 이미지 자동 탐지 및 삭제 기능 구현

### Phase 6: 멀티-트랜스미션 구조 ✅
단일 영상 → 다중 영상(Transmission) 지원으로 확장했습니다.

**Firestore 스키마 변경:**
```json
// units/{unitId}
{
  "transmissions": [
    { "id": "tx_1", "title": "비의 개념", "videoId": "abc123", "start": 0, "end": 300 },
    { "id": "tx_2", "title": "분수 형태로 표현", "videoId": "def456", "start": 0, "end": 0 }
  ]
}

// quizzes/{quizId}
{
  "reference": { "transmissionId": "tx_1", "timestamp": 120 }
}
```

| 파일 | 변경 내용 |
|------|-----------|
| `MissionContentEditor.jsx` | `[+ 트랜스미션 추가]` 동적 배열 입력 → Firestore `transmissions` 필드 저장 |
| `MissionHub.jsx` | 영상 탭 진입 시 영상 목록 리스트 표시 → 선택 시 재생 |
| `SpaceQuizView.jsx` | 오답 시 `reference.transmissionId` + `timestamp` 기반 팝업 영상 재생 |

### Phase 7: AI 오토-태깅 프로토타입 ✅ (현재 진행 중)
Gemini API를 활용한 퀴즈-영상 자동 매핑 시스템의 초기 프로토타입을 구현했습니다.

| 파일 | 역할 |
|------|------|
| `src/services/geminiService.js` | Gemini API 호출, 자동 재시도(429 Backoff), JSON 파싱 |
| `src/pages/Admin/AITaggingEditor.jsx` | 단원별 퀴즈 목록 로드, AI 분석 실행, 결과 미리보기, 일괄 저장 |
| 라우트: `/admin/mission/:unitId/ai-tagging` | MissionContentEditor에서 진입 |

---

## 🔧 현재 구현 상태 (AI 오토-태깅 상세)

### geminiService.js 핵심 로직
```
모델: gemini-2.0-flash (무료 요금제 최적화)
프롬프트 전략:
  - 수학적 비례 추정 (텍스트 블록 K/M × 영상 길이)
  - 다중 트랜스미션 ID 정확 선택 강제
  - 0초 기본값 금지 (도입부 개념만 허용)
  - uncertain: true 플래그 (근거 부족 시)
Rate Limit 대응:
  - 429 에러 시 retryDelay 자동 파싱
  - 최대 3회 재시도 (exponential backoff)
  - 기본 요청 간격: 8초
```

### AITaggingEditor.jsx 핵심 로직
```
데이터 소스: Firestore 'quizzes' 컬렉션 (unitId 기준 조회)
AI 입력 컨텍스트:
  - 퀴즈 문제 + 선택지 + 정답 (풍부한 키워드 매칭)
  - 인덱싱된 텍스트 블록 [블록 1/M] ~ [블록 M/M]
  - 트랜스미션 메타데이터 (ID, 제목, 구간초)
UI 기능:
  - 실시간 진행 표시 (⏳ 분석 중 3/20...)
  - 라이브 결과 스트리밍 (완료된 건 즉시 UI 반영)
  - ⚠️ 검토 필요 배지 (uncertain === true인 항목)
  - 미니 유튜브 플레이어 (타임스탬프 미리보기)
  - [전체 매핑 확정 저장] 일괄 Firestore 업데이트
```

### MissionMarkdownViewer.jsx 핵심 로직
```
블록 단위 파싱: 테이블(|...|), 수평선(---), 일반 라인
인라인 포맷팅: 볼드(**) > 수식($) > 이탤릭(*) 순서 재귀 파싱
  - 볼드 안에 수식이 있어도 정상 렌더링 (**$a$ 대 $b$**)
  - 테이블 셀 내부 인라인 포맷팅 지원
```

---

## ⚠️ 알려진 이슈 및 제한 사항

| # | 이슈 | 상태 | 비고 |
|---|------|------|------|
| 1 | Gemini 무료 요금제 Rate Limit (분당 15~20회) | 완화됨 | 자동 재시도 + 8초 딜레이로 대응, 대량 처리 시 별도 유료 수단 필요 |
| 2 | 타임스탬프 정확도 한계 (자막 데이터 없이 텍스트 비례 추정) | 인지됨 | Phase 8에서 YouTube 자막 API 연동 예정 |
| 3 | CSP 경고 (개발 서버) | 무시 가능 | Vite HMR + 크롬 확장 관련, 프로덕션 빌드에서 자동 해결 |

---

## 🚀 다음 단계 (이어서 작업할 항목)

### Phase 8: AI 태깅 정확도 고도화 (예정)

#### 8-1. YouTube 자막 연동 (The Anchor)
- YouTube Data API v3를 사용하여 영상의 타임라인 자막(`[00:15] 안녕하세요...`) 추출
- 타임라인 자막을 Gemini 프롬프트에 주입하면 비례 추정이 아닌 **실시간 언급 기반** 매핑 가능
- **예상 효과:** 타임스탬프 정확도 300% 향상

#### 8-2. 멀티모달 프레임 분석 (The Eyes) — 선택사항
- `ffmpeg` 또는 서버 사이드 로직으로 영상에서 5~10초 간격 썸네일 추출
- Gemini 1.5 Pro에 이미지 번들 전달 → 화면 속 수식/그림 기반 매핑
- **구현 난이도:** 높음 (서버 인프라 필요)

#### 8-3. 컨텍스트 캐싱 (Context Caching)
- 동일 단원의 20개 퀴즈가 같은 Transmission 데이터를 공유
- Gemini API의 `cacheName` 기능으로 영상 데이터 캐시 → 토큰 비용 50% 절감
- **조건:** Gemini 유료 플랜 전환 시 적용 가능

#### 8-4. 이중 검수 모델 (Flash → Pro Tiering)
- 1차: `gemini-2.0-flash`로 전체 문제 대량 처리
- 2차: 신뢰도 70% 미만 문제만 `gemini-1.5-pro`로 재분석
- **예상 비용:** 2,580문제 전체 매핑 3~5만원

### Phase 9: 학생 UX 고도화 (아이디어)
- 오답 피드백 팝업에서 텍스트/영상 탭 전환 기능
- 학생 개별 약점 분석 대시보드 (틀린 개념 기반 영상 추천)
- 영상 시청 완료율 추적 및 보상 연동

---

## 🗂️ 파일 맵 (Quick Reference)

```
src/
├── services/
│   └── geminiService.js          ← Gemini API 호출 + 재시도 로직
├── pages/Admin/
│   ├── AITaggingEditor.jsx       ← AI 자동 매핑 관리 화면
│   ├── MissionContentEditor.jsx  ← 영상/텍스트 콘텐츠 편집
│   ├── ContentManager.jsx        ← 단원 목록 (진입점)
│   └── GhostCleaner.jsx          ← Storage 고아 파일 정리
├── components/Space/
│   ├── MissionHub.jsx            ← 학생용 영상/텍스트 탐색
│   ├── MissionMarkdownViewer.jsx ← 마크다운 렌더러
│   └── SpaceQuizView.jsx         ← 퀴즈 + 오답 피드백
└── utils/
    └── latexUtils.js             ← LaTeX 수식 정제(sanitize)

docs/
├── META_SENSE_MULTI_TRANSMISSION_AI_TAGGING.md  ← 전략 원본
└── MISSION_CONTROL_DECK_DEVLOG.md               ← 이 문서 (개발 로그)
```

---

## 🔑 환경 변수

| 변수명 | 용도 | 위치 |
|--------|------|------|
| `VITE_GEMINI_API_KEY` | Gemini API 인증 키 | `.env.local` |

> ⚠️ `.env.local`은 Git에 커밋하지 않습니다. `.gitignore`에 포함되어 있음을 확인하세요.

---

## 📝 작업 재개 시 체크리스트

1. **Rate Limit 확인:** Gemini 무료 요금제는 분당/일일 호출 제한이 있음. 이전 테스트에서 쿼터를 소진했다면 시간 경과 후 재시도.
2. **AI 매핑 결과 검증:** `AITaggingEditor`에서 AI가 생성한 타임스탬프를 미니 플레이어로 직접 확인 후 승인.
3. **마크다운 렌더링:** `MissionMarkdownViewer`의 인라인 포맷팅(볼드+수식 중첩) 안정성은 해결 완료.
4. **Firestore 컬렉션 주의:** 퀴즈 데이터는 `quizzes` 컬렉션 사용 (구 `questions` 아님).
