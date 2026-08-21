# 프리미엄 각성 배지 이미지 제작 가이드

## 1. 제작 범위

- 스텔라 아고라 12종
- 스터디 크루 11종
- 고전 독서 12종
- 합계 35종
- 현재 저장소에 프리미엄 이미지가 존재하는 대상: `agora_helper`, `kind_solver`, `question_pioneer` 3종
- 신규 제작 우선 대상: 나머지 32종

기존 3종을 기준 카드로 유지하되, 전체 재제작을 원할 경우에도 아래 규격을 동일하게 적용한다.

## 2. 핵심 제작 원칙

1. 모든 카드는 하나의 게임에 속한 동일한 시리즈처럼 보여야 한다.
2. 카테고리는 색과 프레임 문법으로, 난이도는 광량과 장식 밀도로 구분한다.
3. AI에는 한글 문자를 그리게 하지 않는다. AI는 **텍스트 없는 카드 본체**만 만들고 제목·설명·획득 완료 문구는 후편집으로 합성한다.
4. 작은 화면에서도 중앙 상징물이 즉시 식별되어야 한다. 복잡한 인물 장면보다 상징물 1개와 보조 요소 2~3개를 사용한다.
5. 숫자, 체크 표시, 진행도, 조건 문구를 그림에 넣지 않는다. 조건 변경 시 이미지를 다시 만들지 않기 위함이다.
6. 기존 상표, 유명 게임 카드, 영화 캐릭터, 실제 인물의 얼굴이나 고유 복식을 모사하지 않는다.

## 3. 납품 규격

| 항목 | 규격 |
|---|---|
| 생성 원본 | 1024 × 1280 px, 세로 4:5 |
| 앱 최종본 | 409 × 512 px PNG, sRGB, 불투명 RGB |
| 권장 용량 | 장당 500 KB 이하, 품질 저하가 보이면 700 KB까지 허용 |
| 파일명 | 정확히 `{badge_id}.png` |
| 배경 | 카드 전체를 채우는 어두운 우주 배경, 투명 여백 금지 |
| 안전 여백 | 바깥쪽 5%, 핵심 상징물은 중앙 12~88% 영역 |
| 텍스트 영역 | 상단 8%, 제목 66~77%, 설명 78~87%, 완료 플레이트 89~96%를 비워 둠 |
| 최종 확인 크기 | 205 × 256 px와 120 × 150 px에서 육안 확인 |

원본과 최종본을 함께 보관한다. 예: `source/first_contact_1024x1280.png`, 앱 파일 `first_contact.png`.

## 4. 공통 시각 체계

### 공통 골격

- 세로형 SF 판타지 업적 카드
- 대칭형 금속 프레임, 네 모서리 장식, 중앙 휘장 또는 유물
- 깊은 우주 배경, 미세한 별가루와 은은한 에너지 광선
- 중앙 상징물이 전체 면적의 약 35~45%
- 하단에는 빛나는 `획득 완료` 버튼을 올릴 수 있는 비어 있는 플레이트
- 고급 3D 게임 일러스트와 정교한 디지털 페인팅의 중간 질감
- 지나친 사진 실사, 귀여운 SD 캐릭터, 평면 이모지 스타일은 사용하지 않음

### 카테고리 문법

| 계열 | 프레임 형태 | 주조색 | 보조색 | 반복 문양 |
|---|---|---|---|---|
| 아고라 | 육각 통신망·회로형 프레임 | 딥 네이비 `#071A2F` | 청록 `#00E5C8`, 골드 `#E8C56A` | 말풍선, 연결 노드, 궤도선 |
| 크루 | 함선 장갑·방패형 프레임 | 인디고 `#101A3A` | 스카이블루 `#4BC3FF`, 앰버 `#FFB74D` | 리벳, 함대 문장, 결속 고리 |
| 독서 | 고전 서가·아치형 프레임 | 플럼 `#160F2A` | 보라 `#8D6BFF`, 양피지 골드 `#E7C46A` | 책등, 월계수, 별자리, 잉크 선 |

### 희귀도 문법

| 단계 | 적용 대상 | 표현 |
|---|---|---|
| I 입문 | 첫 행동·1회 조건 | 브론즈/실버 테두리, 낮은 광량, 단일 상징 |
| II 성장 | 5~10회·7일 조건 | 실버+카테고리 컬러, 보조 궤도 1개 |
| III 숙련 | 15~30회·30일 조건 | 골드 테두리, 에너지 링과 별가루 증가 |
| IV 영웅 | 50~100회 또는 복합 조건 | 이중 프레임, 보석, 깊은 공간감 |
| V 전설 | 최상위 복합 조건 | 블랙 골드/프리즘, 왕관형 상단, 삼중 후광 |

## 5. AI 공통 프롬프트

아래 공통 프롬프트 뒤에 배지별 지시문을 붙인다. 가능하면 기존 `agora_helper.png`를 스타일 참조 이미지로 함께 제공한다.

```text
Create one premium achievement card for a Korean space-learning game, portrait 4:5.
Use a perfectly centered, symmetrical ornate sci-fi fantasy frame, dark cosmic depth,
refined metallic materials, luminous energy accents, a single instantly readable central emblem,
high-end collectible game card illustration, crisp silhouette, elegant and aspirational,
consistent with the supplied reference card but not a copy.

Keep four clean dark plates reserved for later typography: a small top category label,
a large Korean title area in the lower third, a short description area below it,
and a glowing acquisition-status plate at the bottom. Do not render any letters, words,
numbers, logos, UI text, watermark, signature, or pseudo-writing. Opaque full-bleed background.

[CATEGORY STYLE]
[RARITY STYLE]
[BADGE-SPECIFIC SUBJECT]
```

### 공통 네거티브 프롬프트

```text
readable text, letters, Korean characters, numbers, watermark, logo, signature,
cropped frame, asymmetric border, multiple competing focal points, cluttered scene,
tiny central object, flat emoji, childish sticker, chibi, photorealistic human face,
real brand, copyrighted character, muddy colors, low contrast, blur, noisy compression,
transparent margins, landscape composition
```

## 6. 배지별 아트 명세

### A. 스텔라 아고라 12종

| ID / 제목 | 단계 | 배지별 지시문 |
|---|---:|---|
| `agora_helper` / 아고라 조력자 | I | 서로 맞잡은 두 개의 금빛 장갑 손, 청록 통신 노드가 연결된 육각 휘장 |
| `kind_solver` / 친절한 해결사 | II | 따뜻한 별빛을 품은 열린 손과 해결을 뜻하는 빛나는 별, 부드러운 청록·골드 후광 |
| `question_pioneer` / 질문 개척자 | II | 미지의 별을 향해 떠오르는 말풍선 탐사 비콘, 질문의 불꽃과 개척 궤도 |
| `first_contact` / 첫 번째 교신 | I | 두 행성 사이에 처음 연결된 단 하나의 청록 전파, 소형 안테나와 응답 신호 |
| `stellar_responder` / 별빛 응답자 | II | 여러 질문 신호에 별빛 답변을 보내는 수정 통신 구체, 10개의 작은 노드는 암시만 하고 숫자는 쓰지 않음 |
| `knowledge_relay` / 지식 중계자 | III | 빛나는 지식 캡슐을 다음 궤도로 전달하는 성간 중계 위성, 연속 연결망 |
| `trusted_guide` / 신뢰받는 길잡이 | III | 별자리 항로를 가리키는 황금 나침반, 채택을 상징하는 청록 보석 인장 |
| `problem_solver_pilot` / 문제 해결 파일럿 | III | 조종석 문장 위의 소형 로켓과 나침반·체크 보석이 하나의 휘장으로 결합된 모습 |
| `galaxy_mentor` / 은하 멘토 | IV | 지식의 별지도를 펼친 현자형 홀로그램 실루엣, 여러 작은 항로를 인도하는 중심별 |
| `hundred_answers_navigator` / 백답 항해사 | IV | 수많은 응답 궤적을 지나온 황금 성간 범선 또는 탐사선, 거대한 별지도와 이중 후광 |
| `agora_sage` / 아고라 현자 | IV | 별자리 문자가 아닌 추상 문양이 흐르는 고대 지식 두루마리와 청록 수정관 |
| `agora_archimedes` / 아고라의 아르키메데스 | V | 우주 기하학 구체·황금 왕관·지혜의 나침반이 결합된 최고 현자 휘장, 삼중 궤도와 프리즘 광휘 |

### B. 스터디 크루 11종

| ID / 제목 | 단계 | 배지별 지시문 |
|---|---:|---|
| `crew_first_boarding` / 첫 승선 | I | 처음 열린 우주선 승선 게이트와 작은 승무원 핀, 환영하는 푸른 안내광 |
| `crew_first_mission` / 첫 공동 작전 | I | 두 소형 함선이 하나의 신호 비콘을 향해 비행하는 함대 휘장 |
| `crew_weekly_navigator` / 일주 항해사 | II | 일곱 점의 별 궤도를 잇는 은빛 나침반, 숫자나 요일 문자는 넣지 않음 |
| `crew_mission_veteran` / 작전 베테랑 | III | 여러 작전 리본이 달린 견고한 위성 휘장과 전투가 아닌 탐사 항로 |
| `crew_team_signal` / 팀워크 점화 | II | 여러 개의 작은 별빛이 중앙 코어를 처음 점화하는 순간, 협력의 방사형 구조 |
| `crew_team_core` / 팀워크 코어 | III | 세 개의 금속 손 또는 결속 고리가 푸른 에너지 코어를 안정적으로 감싼 문장 |
| `crew_chest_contributor` / 광석 상자 기여자 | I | 공동 상자에 처음 안착하는 빛나는 광석 한 개, 앰버·청색 에너지 |
| `crew_chest_engineer` / 상자 동력공 | III | 기어와 에너지 관로가 공동 광석 상자를 완성하는 정교한 기관 휘장 |
| `crew_quartermaster` / 크루 보급관 | III | 질서 있게 배치된 보급 상자·선물 캡슐·함대 인장, 풍요롭지만 전투적이지 않음 |
| `crew_commander` / 성간 함장 | IV | 얼굴 없는 함장 헬멧과 함대 지휘 문장, 별지도 위를 이끄는 황금 지휘봉 |
| `crew_galaxy_vanguard` / 은하 크루 선봉대 | V | 세 척의 함선이 하나의 거대 은하 문장으로 돌진하는 선봉대, 방패·코어·광석 상징을 통합한 프리즘 휘장 |

### C. 고전 독서 12종

| ID / 제목 | 단계 | 배지별 지시문 |
|---|---:|---|
| `first_bookmark` / 첫 책갈피 | I | 처음 펼친 고전 책과 별빛 책갈피 하나, 따뜻한 양피지 빛 |
| `weekly_reading_voyager` / 일주일 독서 항해 | II | 펼친 책이 작은 별빛 범선으로 변해 일곱 별의 항로를 항해하는 장면 |
| `moonlight_reader` / 달빛 독서가 | III | 보름달 아래 펼쳐진 고전 책과 은빛 독서대, 고요한 남보라색 분위기 |
| `hundred_reading_days` / 백일의 기록자 | IV | 오랜 기록이 층층이 쌓인 황금 두루마리 탑과 백 개를 직접 세지 않는 무수한 별점 |
| `unfading_reading_lamp` / 꺼지지 않는 독서등 | II | 열린 책 위에서 꺼지지 않는 작은 황금 램프, 일곱 별의 은은한 연속 궤도 |
| `galactic_reading_habit` / 은하의 독서 습관 | IV | 책장을 넘길 때마다 은하 소용돌이가 이어지는 영원한 독서등과 완전한 별자리 고리 |
| `first_reading_logbook` / 첫 항행 일지 | I | 첫 검토 인장이 찍힌 항행 일지와 깃펜, 인장에는 글자 없이 별 문양만 사용 |
| `reflective_chronicler` / 사유의 기록자 | III | 깊은 생각의 잉크가 별자리로 번지는 깃펜과 여러 겹의 기록지, 지적인 보라·골드 광휘 |
| `one_book_universe` / 한 권의 우주 | II | 한 권의 열린 책 안에서 하나의 완전한 행성과 작은 우주가 솟아오르는 모습 |
| `classic_bookshelf_keeper` / 작은 고전 서재 | III | 다섯 권을 직접 세지 않아도 되는 아늑한 소형 고전 서가와 수호 열쇠, 별빛 먼지 |
| `library_of_stars` / 별들의 도서관 | IV | 끝없이 이어지는 장엄한 우주 도서관, 책들이 별자리 아치로 변하는 중심 원근 |
| `galactic_archivist` / 은하 기록보관자 | V | 황금 우주 기록보관소의 아치, 고전 책·두루마리·검토 인장·별지도가 하나의 왕관형 문장으로 결합된 최고 등급 카드 |

## 7. 후편집 텍스트 규격

AI 생성본에는 텍스트를 넣지 않고 Figma, Canva 또는 이미지 합성 스크립트로 아래 문구를 올린다.

- 상단 카테고리: `탐사 배지`
- 제목: 코드에 등록된 한국어 `title` 그대로 사용
- 설명: 코드의 `desc` 그대로 사용하되 2줄 이내, 너무 길면 UI 설명과 의미가 같은 28자 내외 축약문 사용
- 하단 상태: `✓ 획득 완료`
- 권장 글꼴: Pretendard 또는 Noto Sans KR
- 제목: ExtraBold, 크림 골드, 검은색 2 px 외곽선 또는 짙은 그림자
- 설명: Medium, 밝은 회백색, 줄간격 1.25
- 상태: Bold, 카테고리 포인트 컬러

텍스트는 앱 UI에서 별도로 표시하는 방향으로 개편할 수 있다면, 최종 이미지에도 텍스트를 굽지 않는 편이 유지보수 비용과 접근성 측면에서 더 좋다.

## 8. 제작 순서와 승인 게이트

1. 앵커 카드 3종만 먼저 제작한다: `first_contact`, `crew_team_core`, `one_book_universe`.
2. 세 카드의 프레임 두께, 중앙 상징 크기, 빈 텍스트 영역을 확정한다.
3. 각 계열의 전설 카드 3종을 제작한다: `agora_archimedes`, `crew_galaxy_vanguard`, `galactic_archivist`.
4. 입문과 전설의 광량 차이가 충분한지 확인한 뒤 나머지를 배치 생성한다.
5. 각 카드에 대해 원본, 텍스트 없는 최종 크기본, 텍스트 합성 최종본을 납품한다.

한 번에 35장을 생성하지 않는다. 앵커 3장 승인 후 계열별로 4~6장씩 생성해야 스타일 붕괴와 재작업 비용을 줄일 수 있다.

## 9. 최종 검수 체크리스트

- [ ] 정확한 4:5 비율과 409 × 512 최종 크기인가
- [ ] 파일명이 배지 ID와 정확히 일치하는가
- [ ] 120 × 150에서도 중앙 상징을 알아볼 수 있는가
- [ ] 프레임이나 하단 플레이트가 잘리지 않았는가
- [ ] 한 카드에 주인공 상징이 하나뿐인가
- [ ] 계열 색상은 구분되지만 35장이 같은 게임 카드처럼 보이는가
- [ ] 입문보다 전설 카드의 광량·재질·장식 밀도가 분명히 높은가
- [ ] AI가 만든 가짜 글자, 숫자, 로고, 워터마크가 전혀 없는가
- [ ] 인물 얼굴·손가락 오류가 없는가
- [ ] 기존 IP나 상표를 연상시키는 고유 요소가 없는가
- [ ] PNG가 sRGB이며 앱 최종본이 권장 용량 이내인가

## 10. 개발 연동 시 주의점

- 이미지는 `src/assets/badge/{badge_id}.png`에 둔다.
- `badgeUtils.js`에서 정적 import 후 `BADGE_PREMIUM_IMAGES`에 ID별로 등록한다.
- `UPGRADABLE_BADGE_IDS`는 이미지 맵에서 자동 생성되므로 별도 목록을 중복 관리하지 않는다.
- 35종이 모두 등록되기 전에는 이미지가 없는 배지에 각성 버튼을 노출하지 않는 현재 방식이 안전하다.
- 배지 ID는 파일명과 매핑 키에서 절대 번역하거나 축약하지 않는다.
