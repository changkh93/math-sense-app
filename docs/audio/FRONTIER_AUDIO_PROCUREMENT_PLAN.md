# 아스트라 프론티어 음원 조달·협업 계획

작성 기준일: 2026-07-23

대상: 상업 운영 가능성이 있는 폐쇄형 웹게임

연결 문서: [`../ASTRA_FRONTIER_AUDIO_SYSTEM_PLAN.md`](../ASTRA_FRONTIER_AUDIO_SYSTEM_PLAN.md)

## 1. 결론

공개·무료 음원 사이트에서 필요한 음원을 직접 찾아 확보하는 것은 가능하다.

다만 다음을 구분한다.

- 후보 검색, 개별 라이선스 확인, 음질 분석, 편집, 포맷 변환, 코드 연결, 자산 원장 작성: Codex 담당 가능
- 계정 생성·로그인, 회사 또는 개인을 법적으로 구속하는 이용약관·EULA 동의: 사용자 또는 권한 있는 담당자 확인 필요
- 제품의 최종 음색과 학생 대상 적합성 승인: 사용자 확인 필요
- 실제 최저 지원 교실 기기 청취·발열·Bluetooth 테스트: 사용자 기기 또는 원격 테스트 협업 필요

따라서 “사용자가 60개 파일을 직접 찾아 전달”하는 방식은 권장하지 않는다. Codex가 후보를 수집·정리하고, 사용자는 적은 수의 명확한 승인 지점만 담당한다.

## 2. 조달 원칙

### 2.1 기본 정책

- 무료와 royalty-free를 public domain과 같은 뜻으로 해석하지 않는다.
- 상업 사용, 수정, 웹게임 포함, 표시, 재배포 조건을 자산별로 확인한다.
- 원본 페이지와 다운로드 시점의 라이선스 증거를 보관한다.
- 자동 scraper나 대량 다운로드 bot을 사용하지 않는다.
- 원본 WAV 라이브러리를 제품 또는 공개 저장소에서 별도 배포하지 않는다.
- 게임에는 편집·압축된 runtime 자산만 포함한다.
- 표시가 필요 없는 음원도 제작자와 출처를 내부 원장에 남긴다.
- 유명 게임·영화·브랜드에서 추출한 것으로 보이는 음원은 사용하지 않는다.
- 사람·어린이 목소리, 라디오, TV, 배경 음악이 우연히 섞인 자연 녹음은 제외한다.

### 2.2 기본 라이선스 allowlist

우선 허용:

- 자체 녹음 또는 계약 제작
- CC0
- 게임 사용을 명시적으로 허용하는 Sonniss GDC bundle
- 라이선스 증거를 보관한 Pixabay sound effect
- 라이선스 증거를 보관한 Mixkit sound effect

조건부:

- CC BY 4.0
  - 제품 내 Credits와 공개 audio credits 페이지를 운영할 때만
  - 제목, 제작자, 원문 URL, 라이선스·버전, 변경 여부를 표시

기본 제외:

- CC BY-NC
- Sampling+
- CC BY-SA
- GPL·LGPL 계열 audio
- 해석이 불명확한 custom license
- 자산 페이지와 README·설명의 조건이 충돌하는 파일
- 원본 landing page와 다운로드 기록을 남길 수 없는 파일
- preview 또는 미리듣기용 저품질 파일

이 정책은 법률 자문을 대체하지 않는다. 서비스 규모나 배포 채널이 바뀌면 최종 배포 전 권리 검토를 다시 한다.

## 3. 소스별 판단

| 소스 | 판단 | 주 용도 | 중요한 조건 |
| --- | --- | --- | --- |
| Sonniss GDC | 우선 소스 | 재질 충돌, 금속·목재, 기계·로버 Foley | 게임·상업 이용과 수정 허용, 표시 불필요, 원본 재판매와 AI/ML 학습 금지 |
| Pixabay | 우선 후보 소스 | 강·물·바람·새·자연 bed | 상업 이용·수정·무표시 가능, 원본 standalone 배포 금지, 사용자 업로드 provenance 확인 |
| Mixkit SFX | 우선 후보 소스 | UI, 발걸음, 자연·기술 단발음 | SFX와 music 라이선스를 구분, 개별 수동 다운로드, 원본 재판매·대량 수집 금지 |
| OpenGameArt | 보충 소스 | CC0 UI·발걸음 pack | 자산별 라이선스와 별도 attribution notice 확인, 기본적으로 CC0만 |
| Freesound | 마지막 gap filler | 특정 자연·물성음 | 다운로드에 등록 계정 필요, 기본적으로 CC0만, 사용자 업로드 위험 검수 |

### 3.1 Sonniss GDC

[공식 archive](https://sonniss.com/gameaudiogdc/)와 [GDC bundle license](https://sonniss.com/gdc-bundle-license/)는 게임·interactive project의 상업 사용, 수정, 무표시 사용을 명시한다.

장점:

- 전문 field recording과 Foley 품질
- 라이선서가 배포 권한을 보유한다고 명시
- 충돌·금속·목재·기계류에 유리

주의:

- bundle이 매우 커서 검색·선별 시간이 든다.
- 다운로드와 사용이 EULA 동의가 되므로 권한 있는 주체가 받아야 한다.
- 원본 collection을 공유 drive나 공개 저장소에 통째로 올리지 않는다.
- AI·ML 학습에 사용하지 않는다.

### 3.2 Pixabay

[Content License](https://pixabay.com/service/license-summary/)는 무료·상업 사용, 수정, 무표시 사용을 허용하고 원본 standalone 배포를 금지한다. [FAQ](https://pixabay.com/service/faq/)는 sound effect도 상업·비상업 용도로 사용할 수 있다고 설명한다.

장점:

- 자연환경음 검색과 개별 다운로드가 쉽다.
- 강, 바람, 새, 숲 후보가 많다.

주의:

- 사용자 업로드 기반이므로 원저작 업로더인지 확인한다.
- 다른 커뮤니티의 재업로드, 유명 IP 이름, 출처가 의심되는 계정은 제외한다.
- 라이선스와 자산 페이지를 다운로드 날짜 기준으로 보관한다.
- runtime 게임 자산으로만 사용하고 원본 음원을 별도 제공하지 않는다.

### 3.3 Mixkit

[Sound Effects 페이지](https://mixkit.co/free-sound-effects/)는 SFX의 상업·개인 사용과 무표시 사용을 안내한다. [License](https://mixkit.co/license/)와 [User Terms](https://mixkit.co/terms/)도 함께 보관한다.

장점:

- UI, video game, footsteps, nature, technology 카테고리의 짧은 파일 탐색이 쉽다.
- 가입 없이 받을 수 있는 SFX가 많다.

주의:

- 자동화된 대량 다운로드와 stock library 재구성을 금지한다.
- Mixkit stock music FAQ는 video game 사용을 허용하지 않으므로 music은 사용하지 않는다.
- “music처럼 들리는 SFX”도 실제 item type이 Sound Effects인지 확인한다.
- 약관은 바뀔 수 있으므로 채택 자산마다 당시 license 증거를 남긴다.

### 3.4 OpenGameArt

[공식 FAQ](https://opengameart.org/node/5571)는 상업 사용이 가능하다고 설명하지만 자산별 조건이 다르다.

- 기본적으로 CC0만 채택한다.
- CC BY·OGA-BY, BY-SA, GPL 계열은 이번 1차 조달에서 제외한다.
- preview에만 있고 다운로드 package에는 없는 파일은 사용하지 않는다.
- 자산 설명의 별도 attribution notice도 함께 확인한다.

### 3.5 Freesound

[공식 FAQ](https://freesound.org/help/faq/)에 따르면 CC0, CC BY, CC BY-NC와 과거 Sampling+가 섞여 있고, 다운로드에는 등록 계정 로그인이 필요하다.

- 기본적으로 CC0만 채택한다.
- CC BY는 credits 운영이 확정된 경우에만 예외 승인한다.
- BY-NC와 Sampling+는 제외한다.
- 업로더가 권리를 잘못 판단했을 가능성을 사이트도 경고하므로 다른 소스에 없는 음원의 보충용으로만 사용한다.

## 4. 조달 수량과 순서

### 4.1 Phase 0 임시 승인 pack

최종 50~60개를 기다리지 않고 다음 4~6개로 기술 spike를 시작한다.

| slot | 수량 | 조건 |
| --- | ---: | --- |
| 강 loop | 1 | 25~35초, mono 변환 가능, seamless 편집 가능 |
| 금속 발걸음 | 3 | 같은 신발·공간으로 들리는 변형 |
| 조용한 자연 bed | 1 | 고음 새소리와 음악이 없는 파일 |
| 기지 hum 또는 부하용 loop | 1 | mono, 저역 과다 없음 |

이 자산은 기술 검증용 `candidate`다. Phase 0을 통과해도 자동으로 최종 제품 승인이 되지는 않는다.
공간 성능 부하는 강·hum loop를 서로 다른 instance ID와 위치에 중복 배치해 persistent panner 4개를 만들 수 있으므로, spike를 위해 서로 다른 loop 네 개를 먼저 구매·확보할 필요는 없다.

### 4.2 MVP 필수 pack

Phase 0 뒤 다음 묶음을 먼저 완성한다.

- 자연·환경
  - 중립 bed
  - 강
  - 생태 잎결
  - 착륙장·기지 hum
- 이동
  - 기본 지형 3변형
  - 길 3변형
  - 목재 다리 3변형
  - 금속 착륙장 3변형
- 직접 피드백
  - soft collision
  - pickup
  - 건설
  - 미션 완료
  - 로버 출발
  - 로버 수령

여섯 행성 전용 bed와 전체 물성 변형은 이 필수 pack이 실제 게임에서 안정된 뒤 확장한다.

### 4.3 최종 1차 pack

- 목표: 약 25~30개 semantic type
- 목표: 약 50~60개 서로 다른 source clip
- 후보: 약 70~90개
- 같은 연주의 WebM/MP3는 source clip 한 개로 계산

정확한 사이트별 할당량을 강제하지 않는다. 법적 명확성, 음질, 같은 팔레트의 일관성이 수량 균형보다 우선이다.

## 5. 사운드 팔레트 승인

50~60개를 각각 사용자에게 승인받지 않는다. 먼저 다음 세 개의 작은 팔레트를 만든다.

### A. 자연 중심

- 실제 숲·물·바람 비중이 높음
- UI와 보상음은 매우 작고 유기적
- 가장 편안하지만 우주 배경의 개성이 약할 수 있음

### B. 자연 + 부드러운 SF

- 자연 bed 위에 낮은 기지 hum과 맑은 상호작용음
- 아스트라 프론티어의 정체성과 휴식감을 함께 유지
- 기본 권장안

### C. 미니멀

- 상시 bed가 매우 작음
- 강·나무·기지 등 가까운 장소만 들림
- 피로도는 낮지만 일부 기기에서는 너무 조용하게 느껴질 수 있음

각 팔레트는 강, 발걸음, 나뭇잎, 기지, pickup, 미션 완료의 6개 짧은 preview로 구성한다. 사용자는 팔레트 하나와 “좋은 요소·피할 요소”만 선택한다.

## 6. Codex가 담당할 작업

1. semantic slot 목록과 검색어 작성
2. 사이트별 개별 후보 탐색
3. allowlist와 제외 조건으로 1차 라이선스 필터
4. 후보 URL, creator, license, 다운로드 날짜 기록
5. 자산·license 페이지 증거 보관
6. 원본·편집본 SHA-256 기록
7. 무음, clipping, DC offset, 과도한 noise, 음성·음악 혼입 검사
8. trim, fade, seamless loop, mono 변환, loudness 정리
9. WebM/MP3 runtime 변환
10. `FRONTIER_AUDIO_ASSETS.md` 작성
11. manifest 연결과 누락·fallback 검사
12. 세 팔레트 preview 준비
13. 게임 내 mix와 성능 검증

## 7. 사용자에게 요청할 협업

사용자 협업은 다음 네 지점으로 제한한다.

### 협업 1. 계정·EULA

- Sonniss, Freesound 등 계정 또는 계약 동의가 필요한 다운로드는 사용자 또는 권한 있는 조직 계정으로 수행
- Codex가 브라우저에서 작업하기를 원하면 사용자가 먼저 해당 계정에 로그인하고, 그 계정으로 다운로드·약관 동의를 진행해도 된다고 명시
- 무가입 공개 SFX도 최종 채택 전 라이선스 승인자는 사용자 또는 지정 담당자로 기록

### 협업 2. 사운드 팔레트

- A/B/C 중 하나 선택
- “놀라운 새소리 금지”, “SF hum을 더 작게” 같은 금지·선호 기준 전달
- 개별 60개 파일의 세부 편집 승인은 Codex가 일관된 기준으로 처리

### 협업 3. 최저 지원 기기

- 실제 교실에서 가장 낮은 사양의 iPad 또는 Android 모델 지정
- 가능하면 한 대를 Phase 0과 release QA에 사용
- 지정 전에는 iPad 9세대 Safari와 RAM 4GB급 Android Chrome을 임시 기준으로만 사용

### 협업 4. 최종 권리·제품 승인

- asset ledger의 `approved by` 확인
- CC BY 예외 사용 여부 결정
- 외부 법률 검토가 필요한 사업·배포 조건인지 결정
- 학생 대상 실제 청취 결과를 바탕으로 출시 승인

## 8. 자산 원장

권장 파일:

```text
docs/audio/FRONTIER_AUDIO_ASSETS.md
docs/audio/evidence/
  <asset-id>/
    source-page.pdf
    license-page.pdf
    notes.md
```

원장 필드:

| 필드 | 설명 |
| --- | --- |
| semantic ID | 코드 의미 ID |
| slot / use | 용도와 구역 |
| original filename | 원본 파일명 |
| creator / uploader | 제작자와 업로더 |
| landing URL | 직접 파일이 아닌 원본 자산 페이지 |
| download URL | 확보 당시 직접 다운로드 주소 |
| license | 이름, 버전, URL |
| attribution | 필수 표시문 |
| downloaded at | 다운로드 날짜 |
| evidence | source·license 증거 경로 |
| original SHA-256 | 원본 hash |
| runtime SHA-256 | 편집본 hash |
| edits | trim, EQ, denoise, loop, pitch 등 |
| channels / duration | mono·stereo와 길이 |
| provenance risk | 재업로드·상표·음성 등 위험 |
| status | candidate / approved / rejected |
| decision | 채택·탈락 사유 |
| approved by / at | 최종 승인 |

license 페이지가 나중에 바뀌더라도 확보 당시 권리와 판단 근거를 설명할 수 있어야 한다.

## 9. 저장소·배포 규칙

- 선택한 runtime 파일만 `public/sounds/frontier/v1/`에 둔다.
- 대용량 Sonniss bundle과 원본 library 전체를 Git에 넣지 않는다.
- 원본 보관 위치는 계약 조건을 만족하는 제한된 작업 폴더로 정한다.
- 저장소가 공개라면 license PDF·screenshot도 private evidence archive에 두고 원장에는 내부 참조와 hash만 남긴다.
- 웹에서 직접 directory listing이나 SFX ZIP을 제공하지 않는다.
- runtime filename은 semantic ID 또는 content hash를 사용한다.
- hash filename은 캐시와 우발적 재배포를 줄이는 수단일 뿐 라이선스 대체 수단이 아니다.
- 배포 전 catalog 경로, file size, duration, channels, license approval, fallback cycle을 검사한다.

## 10. 예상 일정

병렬 진행 기준의 현실적인 범위다.

| 작업 | 예상 |
| --- | --- |
| Phase 0 자산 4~6개 확보·편집 | 0.5~1일 |
| 세 팔레트 후보 수집·preview | 1~2일 |
| 사용자 팔레트 승인 | 사용자 일정 |
| 70~90개 후보 수집·권리 필터 | 2~4일 |
| 50~60개 편집·loop·변환·원장 | 3~6일 |
| 실제 게임 mix·모바일 청취 QA | 2~3일 |

코드 개발과 일부 병렬화할 수 있지만, 최종 승인 음원의 준비만 약 1~2주 규모로 보는 것이 안전하다. 계정·EULA 승인과 실제 기기 제공이 늦어지면 calendar 일정은 늘어난다.

## 11. 착수 조건

다음 기본값으로 바로 시작할 수 있다.

- 제품 형태: 상업 가능 폐쇄형 웹게임
- 라이선스: CC0·무표시 상업 라이선스 우선
- CC BY: 기본 제외
- 팔레트: B “자연 + 부드러운 SF”를 첫 제안으로 제작
- 음악: 제외
- Phase 0: 4~6개 candidate만 먼저 확보

사용자에게 필요한 첫 응답은 다음 두 가지뿐이다.

1. 위 기본값으로 Phase 0 음원 후보 수집을 시작해도 되는지
2. 실제 최저 지원 교실 기기 모델이 무엇인지
