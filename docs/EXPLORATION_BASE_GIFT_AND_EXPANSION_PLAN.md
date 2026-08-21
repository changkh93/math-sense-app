# 나의 탐험기지 배경 선물·확장 구현 계획

## 1. 목표

1. `나의 탐험기지 배경` 카드에서 다른 학생에게 배경을 선물할 수 있게 한다.
2. 새 배경을 추가할 때 클라이언트·Cloud Function·이미지 매핑을 각각 손으로 맞춰야 하는 현재 구조를 개선한다.
3. 가격 변조, 중복 선물, 자기 선물, 동시 선물을 서버 트랜잭션으로 차단한다.

## 2. 현재 구조 진단

### 클라이언트

- `src/utils/socialUtils.js`
  - `BASE_THEMES`: 배경의 ID, 이름, 색, CSS 배경, 설명을 정의한다.
  - `SOCIAL_STORE_ITEMS`: 유료 배경의 상품 ID, 가격, `themeId`를 별도로 정의한다.
  - `normalizeOwnedBaseThemes()`: `orbital`을 항상 기본 보유로 보정한다.
- `src/components/Space/SpaceStore.jsx`
  - 일반 상품/프로필 아이템은 `renderGiftButton(item)`을 노출한다.
  - 배경 카드는 구매/장착 버튼만 있고 선물 버튼이 없다.
  - 선물 수신자 중복 검사는 시그니처와 프로필 프레임만 처리한다.
- `src/pages/Community/PublicProfile.jsx`
  - `BASE_THEME_IMAGES`에 테마 ID와 JPG import를 다시 매핑한다.

### 서버

- `functions/index.js`
  - `STORE_ITEM_GIFT_CATALOG`은 선물 가능 아이템을 클라이언트 카탈로그와 별도로 하드코딩한다.
  - 현재 배경 3종은 서버 선물 카탈로그에 없다.
  - `giftStoreItem` 트랜잭션은 소모성 수량, 레이더, 시그니처, 프레임은 처리하지만 `ownedBaseThemes` 배열 추가는 처리하지 않는다.
- `storeItemGifts` 문서와 보내는 사람/받는 사람의 `crystal_transactions`는 이미 트랜잭션 내에서 기록된다.

### 핵심 결론

배경 카드에 버튼만 추가하면 안 된다. 클라이언트 중복 안내와 서버 카탈로그/소유권 추가 로직을 함께 바꿔야 한다.

## 3. 제품 정책

### 3.1 선물 방식

- 유료 배경은 **`구매해서 선물`**만 지원한다.
- 보내는 사람이 이미 같은 배경을 보유해도 다른 학생을 위해 다시 구매할 수 있다.
- **`보유분 선물`**은 지원하지 않는다. 영구 해금 권리를 보내면 보내는 사람에게서 제거해야 하고, 현재 장착 상태 복구와 악용 방지 정책이 추가로 필요하다.
- 기본 배경 `orbital`은 선물 버튼을 노출하지 않는다.

### 3.2 수신 결과

- 수신자의 `ownedBaseThemes`에 해당 `themeId`를 추가한다.
- 선물이 수신자의 현재 꾸미기를 임의로 바꾸지 않도록 `selectedBaseTheme`은 변경하지 않는다.
- 수신자가 이미 보유한 배경은 선물할 수 없다. 클라이언트에서 미리 안내하고, 서버에서 반드시 다시 검증한다.
- 성공 문구: `OOO님에게 오로라 관측소 선물 완료!`
- 수신 알림 시스템이 추가되기 전까지는 거래 내역이 수신 기록의 기준이다. 알림 UI는 별도 후속 작업으로 둔다.

## 4. Phase 1 — 배경 선물 MVP

### 4.1 `src/components/Space/SpaceStore.jsx`

1. 배경 카드 하단을 `display: flex` 버튼 행으로 바꾸고, 유료 `item`에만 `renderGiftButton(item)`을 추가한다.
2. 주 버튼은 기존 구매/장착 상태를 그대로 유지한다.
3. `getRecipientGiftBlockReason()`에 배경 검사를 추가한다.

```js
if (item.type === 'base' && item.themeId) {
  const recipientThemes = normalizeOwnedBaseThemes(recipient)
  if (recipientThemes.includes(item.themeId)) {
    return `${getProfileName(recipient)}님은 이미 ${item.name}을 보유 중입니다.`
  }
}
```

4. 배경은 `canGiftOwned(item) === false`이므로 모달의 기본 모드가 `purchase`가 되어야 한다.
5. 모달의 `보유분 선물` 선택지는 비활성화하고 `영구 해금 아이템은 구매해서 선물만 가능`이라는 안내를 보여준다.
6. 모바일에서는 두 버튼이 너무 좁으면 세로로 쌓이도록 반응형 class를 사용한다. 새 inline style로 중복하기보다 배경 카드/버튼 CSS class를 추출하는 것을 권장한다.

### 4.2 `functions/index.js`

1. `STORE_ITEM_GIFT_CATALOG`에 현재 유료 배경 3종을 추가한다.

```js
base_aurora_observatory: {
  name: "오로라 관측소",
  cost: 120,
  ownedMode: "purchase_only",
  baseThemeId: "aurora_observatory",
},
base_solar_archive: {
  name: "황금 기록보관소",
  cost: 160,
  ownedMode: "purchase_only",
  baseThemeId: "solar_archive",
},
base_deep_lab: {
  name: "심해 연구기지",
  cost: 140,
  ownedMode: "purchase_only",
  baseThemeId: "deep_lab",
},
```

2. 서버 용 `getOwnedBaseThemes(userData)`를 추가하고 `orbital`을 항상 포함하며 중복을 제거한다.
3. `giftStoreItem` 수신자 적용 분기에 `item.baseThemeId`를 추가한다. 이 분기는 일반 `recipientField` 수량 분기보다 앞에 있어야 한다.

```js
} else if (item.baseThemeId) {
  const themes = getOwnedBaseThemes(recipientData)
  if (themes.includes(item.baseThemeId)) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      `${recipientName}님은 이미 ${item.name}을 보유 중입니다.`,
    )
  }
  recipientUpdates.ownedBaseThemes = [...themes, item.baseThemeId]
```

4. `selectedBaseTheme`은 쓰지 않는다.
5. `giftData`와 양쪽 `crystal_transactions.metadata`에 `baseThemeId`를 포함해 추후 감사/알림에 쓸 수 있게 한다.
6. 가격 차감, 소유권 추가, 선물 기록은 현재처럼 하나의 Firestore transaction에서 완료한다.

### 4.3 Firestore rules

- MVP에서 `storeItemGifts`를 클라이언트가 직접 쓰거나 읽을 필요가 없다. 현재와 같이 callable-only로 유지한다.
- 선물함/선물 내역 화면을 만들 때만 보내는 사람·받는 사람·관리자에게 읽기를 허용하는 규칙을 추가한다.

## 5. Phase 2 — 배경 확장을 위한 카탈로그화

### 5.1 문제

새 배경 하나를 추가하려면 최소 다음 세 곳을 맞춰야 한다.

1. `BASE_THEMES`
2. `SOCIAL_STORE_ITEMS`
3. `PublicProfile.jsx`'의 `BASE_THEME_IMAGES`
4. 선물을 지원하려면 `STORE_ITEM_GIFT_CATALOG`까지 추가

이름, 가격, ID 중 하나만 다르게 배포되어도 구매와 선물의 가격/결과가 어괋날 수 있다.

### 5.2 권장 카탈로그 스키마

배경 마스터 데이터를 하나의 카탈로그로 관리한다.

```ts
type BaseThemeCatalogItem = {
  id: string                 // aurora_observatory
  storeItemId: string | null // base_aurora_observatory; 기본 테마는 null
  name: string
  icon: string
  description: string
  cost: number               // 기본 테마는 0
  purchasable: boolean
  giftable: boolean
  giftMode: 'purchase_only' | 'none'
  status: 'active' | 'hidden' | 'seasonal' | 'retired'
  sortOrder: number
  accent: string
  pageBackground: string
  surface: string
  imagePath: string | null
  tags: string[]
  releaseKey?: string
}
```

### 5.3 구현 방식

- 가격·선물 가능 여부를 판단하는 **서버 카탈로그가 최종 기준**이다.
- Firebase Functions 배포 경계가 `functions/`이므로, 공유 파일을 루트 `src/`에 두고 Functions에서 직접 require하지 않는다.
- 권장 선택지:
  1. `functions/catalog/baseThemes.json`을 원본으로 두고, 검증/생성 스크립트가 프런트용 `src/generated/baseThemeCatalog.js`를 만든다.
  2. 또는 카탈로그를 Firestore 관리 컬렉션으로 옮기되, 구매 트랜잭션은 항상 서버가 읽은 스냅샷으로 가격을 결정한다.
- 현 규모에서는 1번이 더 간단하고 배포 재현성이 좋다.
- `validate-base-theme-catalog.mjs`를 추가해 다음을 build 전에 검사한다.
  - ID/`storeItemId` 중복 없음
  - 유료 테마의 가격이 양의 정수
  - `giftable` 테마에 `storeItemId`가 있음
  - `imagePath`가 실제 파일을 가리킴
  - 기본 테마 `orbital`이 정확히 하나
  - 상품 가격과 서버 가격이 동일

### 5.4 구매 경로 강화

- 현재 일반 배경 구매는 `SpaceStore.jsx`가 사용자 문서에 직접 transaction을 실행하고, 선물만 Cloud Function을 통한다.
- 확장 단계에서 배경 구매도 `purchaseStoreItem` callable로 옮기고, 클라이언트가 보낸 가격을 믿지 않아야 한다.
- 이후 `purchaseStoreItem` / `giftStoreItem`은 같은 서버 카탈로그와 `grantStoreItem()` 헬퍼를 공유한다.

## 6. Phase 3 — 배경 콘텐츠 확장

### 6.1 1차 확장 권장안

| ID | 이름 | 테마 | 권장 가격 | 태그 |
|---|---|---|---:|---|
| `lunar_library` | 달빛 수학 서재 | 고전 서재, 달빛, 기하학 도구 | 130 | 차분함, 수학 |
| `crystal_cavern` | 수정 공식 동굴 | 발광 결정, 공식 홀로그램 | 150 | 판타지, 청록 |
| `mars_greenhouse` | 화성 생태 온실 | 주황 사막, 유리 돔, 식물 | 140 | 자연, 온난 |
| `quantum_terminal` | 양자 연산 실험실 | 네온 터미널, 그리드, 수식 | 170 | 기술, 네온 |
| `comet_camp` | 혜성 관측 캠프 | 투명 텐트, 혜성, 별자리 | 110 | 포근함, 야외 |
| `infinity_garden` | 무한의 정원 | 프랙탈 정원, 무한 문양 | 180 | 프리미엄, 수학 |

가격은 현재 120∼160 광석대를 중심으로 하되, 시각 품질·희소성에 따라 110∼180으로 분포시킨다. 성능 보너스를 붙이지 않고 순수 커스터마이징 아이템으로 유지한다.

### 6.2 자산 제작 규격

- 새 배경 이미지: WebP 권장, 1920×1080 이상, 가능하면 300∼500KB 내외.
- 중요 피사체를 중앙 카드 영역에 두지 않고 양쪽 가장자에 분산한다.
- 텍스트·로고·워터마크를 포함하지 않는다.
- 밝은 이미지에서도 흰색 본문이 읽히도록 overlay 조합으로 WCAG AA 수준 대비를 확인한다.
- 1440px, 1024px, 768px, 390px 너비에서 프로필 영역 잘림과 가독성을 확인한다.
- `prefers-reduced-motion`을 존중하고, 배경에 애니메이션을 추가하더라도 정적 fallback을 제공한다.

### 6.3 상점 UX 확장

배경이 8개를 넘으면 현재의 단순 grid만으로는 탐색성이 떨어진다. 다음을 추가한다.

- 탭: `전체 / 보유 중 / 미보유`
- 필터: `차분함 / 화려함 / 우주 / 자연 / 수학`
- 정렬: `추천순 / 가격 낮은순 / 새로운순`
- 카드 상태 badge: `장착 중`, `보유`, `NEW`, `기간 한정`
- 카드를 눌러 크게 미리보기한 뒤 `구매`, `선물`, `장착`을 선택

## 7. 테스트 계획

### 7.1 서버 단위/에뮬레이터 테스트

1. 120 광석으로 오로라 배경 선물 시 송신자 광석이 정확히 120 차감된다.
2. 수신자 `ownedBaseThemes`에 `orbital`과 선물받은 theme ID가 중복 없이 들어간다.
3. 수신자 `selectedBaseTheme`은 변경되지 않는다.
4. 수신자가 이미 보유한 배경이면 광석, 소유권, 기록이 모두 변경되지 않는다.
5. 광석 부족, 자기 선물, 없는 아이템 ID, `owned` 모드를 각각 거절한다.
6. 같은 수신자에게 동시에 두 번 선물하면 트랜잭션 재시도 후 하나만 성공한다.
7. 성공 시 `storeItemGifts` 1개와 양쪽 `crystal_transactions` 1개씩이 모두 생성된다.
8. 학생→학생은 성공하고, 부모/관리자 수신은 거절된다.

### 7.2 프런트 UI 테스트

1. 기본 배경에는 선물 버튼이 없다.
2. 유료 배경에는 보유 여부와 관계없이 선물 버튼이 있다.
3. 선물 모달이 열리면 `구매해서 선물`이 기본 선택된다.
4. 이미 보유한 수신자를 선택하면 전송 버튼이 비활성화되고 이유가 노출된다.
5. 광석이 부족하면 부족한 개수가 표시된다.
6. 성공 후 모달이 닫히고 잔액과 성공 토스트가 실시간 반영된다.
7. 390px 화면에서 구매/장착·선물 버튼과 모달이 잘리지 않는다.

### 7.3 리그레션

- 기존 프로필 프레임, 시그니처, 크라이오 코어, 광자 실드 선물이 계속 동작한다.
- 직접 배경 구매는 즉시 장착되고, 선물받은 배경은 즉시 장착되지 않는다.
- 공개 프로필에서 모든 active 배경의 이미지·gradient fallback이 정상 표시된다.
- `npm run lint`, 카탈로그 검증, 서버 테스트, `npm run build`를 통과한다.

## 8. 작업 순서와 완료 기준

### PR 1: 배경 선물 MVP

- 배경 카드 선물 버튼
- 클라이언트 중복 보유 안내
- 서버 배경 카탈로그 3종
- 서버 `ownedBaseThemes` 지급 분기
- 거래 metadata
- 필수 테스트

**완료 기준:** 유료 배경 3종을 학생 간에 구매해서 선물할 수 있고, 중복/부족/동시성 케이스가 서버에서 안전하게 거절된다.

### PR 2: 카탈로그 단일화

- 배경 마스터 카탈로그
- 서버/프런트 생성 또는 공유 전략
- 카탈로그 validator
- 배경 구매 callable 이전
- `grantStoreItem()` 공유 헬퍼

**완료 기준:** 카탈로그 항목과 이미지 하나를 추가하면 상점·선물·공개 프로필에 누락 없이 노출되며, 가격은 서버 한 곳에서만 결정된다.

### PR 3: 1차 배경 확장

- 새 배경 6종 자산·메타데이터
- 필터/정렬/미리보기
- 반응형·가독성·성능 QA

**완료 기준:** 10종(기본 1 + 기존 유료 3 + 신규 6) 배경을 구매·선물·장착할 수 있고, 모바일에서도 편하게 탐색할 수 있다.

## 9. 다른 AI에게 줄 실행 지시문

> `docs/EXPLORATION_BASE_GIFT_AND_EXPANSION_PLAN.md`를 기준으로 먼저 PR 1 범위만 구현해줘. 배경은 보유분 양도가 아니라 `구매해서 선물`만 지원하고, 수신자의 `ownedBaseThemes`에만 추가하며 `selectedBaseTheme`은 바꾸지 마. 클라이언트 버튼만 추가하지 말고 `giftStoreItem` 서버 카탈로그와 트랜잭션 분기, 중복 검증, 거래 metadata, 자동 테스트까지 함께 완성해. 기존 선물 아이템의 동작을 변경하지 말고 lint/build/관련 테스트 결과를 보고해줘.

