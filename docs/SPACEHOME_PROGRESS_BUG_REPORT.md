# SpaceHome 진행률 표시 오류 (탐험 전 상태 롤백 현상)

## 📅 작성일: 2026-02-18
## ✅ 해결일: 2026-02-18

## 1. 🎯 작업 목표
SpaceHome 컴포넌트에서 전체 챕터 목록을 볼 때, 각 챕터의 미션 진행률(예: 8/9 완료)이:
1.  **정확하게** 데이터베이스(Firestore)의 현재 미션 개수를 반영해야 함. (기존 하드코딩 `11`이 아닌 실제 개수 `9` 표시)
2.  **새로고침 직후에도** 올바르게 표시되어야 함. (현재 새로고침 시 "0", 또는 "탐험 전(Not Started)"으로 초기화되는 버그 발생)

## 2. ✅ 최종 해결 (2026-02-18)

### Root Cause: `where`와 `getDocs` 미 Import 
**핵심 원인은 `SpaceHome.jsx`에서 `where()`와 `getDocs()` 함수를 import하지 않은 것이었습니다.**

`chapterUnitResults`의 `useQueries` queryFn에서 이 두 함수를 사용하고 있었지만:
```javascript
// Line 73-74: 이 함수들이 import되지 않아 항상 실패
const q = query(collection(db, 'units'), where('chapterId', '==', chapter.docId));
const snap = await getDocs(q);
```

import 문에는 포함되어 있지 않았습니다:
```javascript
// 문제: where, getDocs가 누락!
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, setDoc } from 'firebase/firestore'
```

→ 결과적으로 `chapterUnitResults`의 모든 쿼리가 **런타임 에러로 실패** → `chapterProgress`가 항상 `{}` → UI가 "스캔 중..." 또는 "탐험 전" 표시

### 수정 내용

#### Fix 1: Import 추가 (`SpaceHome.jsx`)
```javascript
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, setDoc, where, getDocs } from 'firebase/firestore'
```

#### Fix 2: `chapterProgress` 계산 로직 안정화 (`SpaceHome.jsx`)
- `loadingRegions`, `!bestScores` 등 불필요한 가드 조건 제거 (bestScores는 항상 빈 객체라도 존재)
- `chapter.docDocId || chapter.docId` 오타 수정 → `chapter.docId`로 통일
- `allLoaded` 체크를 `chapterUnitResults.every()` 패턴으로 명확화
- `history.length === 0`일 때도 `bestScores: scores` 반환 (이전에는 `{}` 반환하여 캐시 무효화)

#### Fix 3: 캐시 안정성 강화 (`useContent.js`)
`useChapters`, `useUnits` 훅에 `staleTime`과 `gcTime` 추가:
```javascript
staleTime: 1000 * 60 * 5,  // 5분간 fresh 상태 유지 → 불필요한 refetch 방지
gcTime: 1000 * 60 * 10,    // 10분간 GC 보호 → 단원 목록 미표시 버그 방지
```

### 수정 결과
- ✅ 새로고침 후에도 "진행 중 (2/8)" 정상 표시
- ✅ 단원(미션) 목록 안정적 로딩
- ✅ 챕터 간 이동 시에도 데이터 유지
- ✅ 3D/2D 모드 모두 정상 동작

---

## 3. 📝 이전 시도 내용 (참고용)

### (1) 데이터 소스 변경 (Static → Dynamic)
*   **문제:** 기존에는 `localRegions.js`라는 정적 파일에서 `units.length`를 읽어와 전체 미션 개수를 계산함.
*   **조치:** `SpaceHome.jsx`에 `useQueries`를 도입하여 Firestore에서 직접 조회하도록 변경.
*   **결과:** "8/11"가 "8/9"로 정확하게 수정됨.

### (2) 로딩 상태 관리 강화
*   **조치:** `chapterProgress` useMemo에 가드 절 추가.
*   **결과:** 로딩 도중에는 "스캔 중..."이 표시되나, 로딩 완료 후 "탐험 전"으로 돌아가는 현상 지속.

### (3) ID 매칭 로직 개선
*   **조치:** `bestScores[unit.docId]`와 `bestScores[unit.id]` 이중 체크.
*   **결과:** 여전히 문제 해결 안 됨 (근본 원인이 import 누락이었으므로).
