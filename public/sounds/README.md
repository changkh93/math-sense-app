# 🎵 수학 행성 효과음 가이드

이 애플리케이션의 '수학 행성' 테마는 소리를 통해 아이들의 학습 몰입도를 높입니다.
아래 파일들을 `public/sounds/` 폴더에 넣어주세요. (mp3 또는 wav 형식)

## 필수 효과음 파일 목록

| 파일명 | 역할 | 추천 느낌 |
|--------|------|----------|
| `correct.mp3` | 정답 맞혔을 때 | 에너지 넘치는 '딩동댕', '반짝' 소리 |
| `wrong.mp3` | 오답 시 | 부드러운 '오답' 알림음 (너무 부정적이지 않게) |
| `click.mp3` | 버튼 클릭 시 | 우주 버튼을 누르는 듯한 '툭' 또는 '삐' 소리 |
| `crystal.mp3` | 결정 획득 시 | 보석이 짤랑거리는 맑은 소리 |
| `levelup.mp3` | 만점/레벨업 시 | 화려한 축하 사운드 |
| `whoosh.mp3` | 화면 전환/우주선 | '쉬익-' 하고 지나가는 우주 이동 효과음 |
| `space-bgm.mp3` | 배경 음악 | 몽환적이고 집중하기 좋은 잔잔한 우주 BGM |

## 팁
- 모든 사운드는 용량을 위해 압축된 mp3 형식을 권장합니다.
- `BGM`은 반복 재생(loop)에 적합한 끊김 없는 곡이 좋습니다.
- 사운드 파일이 준비되지 않아도 앱은 에러 없이 동작합니다 (콘솔 경고만 발생).

# Frontier audio asset gate

프론티어 전용 음원이 모두 검수되어 아래 경로에 배치되기 전에는
`VITE_FRONTIER_AUDIO_ASSETS_READY`를 설정하지 않습니다. 이 상태에서는 환경음·발걸음
요청이 네트워크 404를 만들지 않으며, 획득·미션·건설·오류 피드백만 기존 앱 음원으로
안전하게 대체됩니다.

자산 배치 후 다음 검증을 통과해야 기능을 켤 수 있습니다.

```sh
npm run test:frontier-audio-assets
VITE_FRONTIER_AUDIO_ASSETS_READY=true npm run test:frontier-audio-assets -- --strict
```

각 런타임 파일은 `docs/audio/frontier-audio-assets.json`에도 기록해야 합니다.
`path`는 레지스트리에 선언된 `/sounds/...` 경로와 정확히 같아야 하며, 아래 정보가
모두 있어야 strict 검수를 통과합니다.

- `sourceUrl`: 원본을 확보한 페이지
- `creator`: 제작자 또는 제공 기관
- `license`, `licenseUrl`: 라이선스 이름과 원문
- `downloadedAt`: 확보일(ISO 날짜)
- `sha256`: 실제 배치 파일의 64자리 SHA-256

같은 경로의 중복 항목, 레지스트리에 없는 오래된 항목, 메타데이터가 없는 파일도
strict 모드에서는 실패합니다. 따라서 자산 파일만 복사하고 출처 기록을 나중으로
미루는 상태로는 프로덕션 음원이 켜지지 않습니다.

프로덕션에서 전용 음원을 활성화할 때만 빌드 환경에 다음 값을 설정합니다.

```text
VITE_FRONTIER_AUDIO_ASSETS_READY=true
```

## 로컬 QA 합성 음원

실제 녹음 음원이 준비되기 전 트리거·공간감·믹스를 확인하기 위한 자체 합성 QA
세트는 다음 명령으로 다시 만들 수 있습니다.

```sh
npm run generate:frontier-audio-qa
npm run test:frontier-audio-assets:qa
```

QA manifest의 모든 항목은 `provisional: true`입니다. 일반 strict 검수는 이 자산을
의도적으로 거부하며, `--allow-provisional`은 로컬 기능 검증에만 사용합니다. 정식
배포 전에는 실제 승인 음원으로 교체하고 provisional 항목을 모두 제거해야 합니다.

`public/sounds/frontier/v1/sound/`에 사용자 제공 원본이 있으면 QA 세트를 만든 뒤 다음
명령으로 해당 슬롯만 다시 편집·변환·매핑할 수 있습니다.

```sh
npm run import:frontier-audio-custom
```

사용자 제공 원본도 creator·source URL·license가 확인될 때까지 provisional 상태를
유지합니다.
