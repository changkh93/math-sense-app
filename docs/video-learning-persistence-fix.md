# 기술 문서: 영상 학습 데이터 보존 및 완료 처리 개선 (2026-03-27)

## 1. 개요
영상 학습 과정에서 시청 위치(이어보기), 누적 학습 시간, 그리고 '데이터 수신 완료' 체크 여부가 페이지 새로고침이나 세션 종료 시 유실되는 고질적인 문제를 해결하기 위한 기술적 내역을 기록합니다.

## 2. 기존의 문제점 (Root Causes)

### A. 상태 복원 로직의 부재 및 Stale Closure
- 사용자가 영상을 선택하거나 페이지를 새로고침했을 때, Firestore에 저장된 `learning_progress` 데이터를 컴포넌트 내부의 Refs(`stampedSetRef`, `totalTimeSpentRef`)와 동기화하는 로직이 없거나 부적절한 위치에 있었습니다.
- 특히 `useEffect`의 의존성 배열에 `selectedTx`가 누락되어, 영상이 바뀔 때 이전 시청 데이터가 활성화되지 않는 "Stale Closure" 현상이 발생했습니다.

### B. 완료 상태 저장 누락
- 시청률 90% 이상을 달성하여 '데이터 수신 완료' 버튼이 활성화되었을 때, 이 버튼을 클릭하더라도 Firestore에 `completed: true` 플래그를 명시적으로 저장하는 코드가 `handleSaveVideoPosition` 함수에 빠져 있었습니다.
- 이로 인해 UI에서는 완료된 것처럼 보이지만, DB에는 반영되지 않아 새로고침 시 미완료 상태(체크표시 없음)로 되돌아갔습니다.

### C. 누적 학습 시간 유실
- `totalTimeSpent`가 단순히 메모리 상의 Ref에만 기록되고, Firestore에서 불러와 합산하는 과정이 누락되어 세션마다 학습 시간이 0초부터 다시 카운트되는 문제가 있었습니다.

### D. 중복되고 파편화된 로직
- `useEffect` 블록이 여러 개로 흩어져 서로의 상태를 덮어씌우거나, 초기화 순서가 꼬이는 레이스 컨디션(Race Condition)이 발생하고 있었습니다.

---

## 3. 개선 사항 (Improvements)

### ✅ 통합된 상태 복원 (Consolidated Restoration)
- `useEffect` 하나로 모든 영상 위치 정보를 통합 관리하도록 개선했습니다.
- `userId`, `selectedTx`, `learningProgress`가 변경될 때마다:
    1. Firestore의 `stampedSeconds`를 `stampedSetRef`로 복원.
    2. `totalTimeSpent`를 Ref로 복원.
    3. 해당 영상의 과거 `completed` 여부를 즉시 UI 상태(`setVideoCompleted`)에 반영.
    4. 마지막 시청 위치(`maxPos`)를 계산하여 영상 시작 지점(`initialStartPosition`)으로 설정.

### ✅ 명시적 완료 플래그 저장
- `handleSaveVideoPosition` 함수 내에 시청률 임계값(90%)을 달성했는지 확인하는 로직을 추가했습니다.
- 버튼 클릭 시 `completed: true`와 `completionBonusGiven: true`를 강제로 저장하여 DB와 UI의 싱크를 맞췄습니다.

### ✅ 비동기 저장 강화 (Auto-save & Unload-save)
- **10초 주기 자동 저장**: 학습 중 예기치 않은 종료에 대비해 주기적으로 Firestore와 동기화합니다.
- **Beacon API 도입**: 브라우저 탭을 닫거나 뒤로 가기를 누를 때 `navigator.sendBeacon`을 사용하여 서버에 최종 상태를 안정적으로 전송합니다.

### ✅ 오프라인 우선 정책 (Offline-First Union)
- Firestore 데이터와 LocalStorage의 로컬 캐시 중 더 진보된 데이터(더 많은 스탬프, 더 뒤의 재생 위치)를 병합하여 사용자가 어떤 환경에서도 최신 기록을 유지할 수 있도록 보장합니다.

---

## 4. 향후 주의사항
1. **Tx ID 일관성**: 영상 식별자(`txId`)를 생성할 때 `id` 필드가 없는 경우 `default`로 처리되는데, 이 로직이 모든 기능에서 동일하게 유지되어야 합니다.
2. **Ref vs State**: 실시간 재생 위치와 학습 시간은 성능을 위해 `Ref`를 사용하고, UI 표시용(체크표시, 진행바)은 `State`를 사용합니다. 이들 간의 동기화는 `handleSaveVideoPosition`이나 `autoSaveInterval`을 통해서만 이루어지도록 엄격히 관리해야 합니다.
