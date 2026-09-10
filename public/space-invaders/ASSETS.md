# 우주 방어대 에셋

첨부된 원본 게임 에셋은 역할을 참고했으며 이 패키지에 복사하지 않았습니다.

- `assets/scout.png`: 새로 생성한 진주색·청록 탐사선. 투명 PNG.
- `assets/raider.png`: 새로 생성한 보라색 만타형 적 드론. 투명 PNG.
- 두 이미지: OpenAI 내장 imagegen으로 생성. 원본 해상도·알파를 보존하며 pygame에서 표시 크기만 줄입니다.
- 탄환은 Pygame의 작은 투명 Surface에 직접 그립니다. 학습자가 색·크기를 바꿀 수 있으며 별도 레이저 이미지가 필요하지 않습니다.
- `assets/*.ogg`: Codex가 수학적 파형으로 직접 합성한 여섯 효과음. 외부 샘플 없음. 재현 소스: `scripts/generate-space-invaders-audio.py`.
- `assets/DoHyeon-Regular.ttf`: 배달의민족 도현체 (Do Hyeon). Google Fonts 공식 저장소의 수정하지 않은 한글 폰트. 라이선스 원문은 `OFL-DoHyeon.txt`에 동봉합니다. https://github.com/google/fonts/tree/main/ofl/dohyeon

## 이미지 생성 프롬프트 기록

방식: 내장 imagegen, 신규 생성. 제공 이미지를 수정하는 방식이 아닙니다.

Scout: transparent PNG game sprite for a Korean Pygame Space Invaders course; one original friendly top-down player spacecraft, nose up; pearl-white and turquoise exploration interceptor, compact swept wings, dark cyan cockpit, two short amber thrusters; polished 2D arcade illustration, strong silhouette legible at 64x64; whole centered ship and transparent padding; no scene, lettering, border or other objects.

Raider: transparent PNG game sprite; one original top-down alien drone, attack direction down; violet armored manta-like robot, curved fins, coral energy core, amber eyes; friendly school-appropriate arcade antagonist, strong silhouette legible at 56x48; whole centered drone and transparent padding; no scene, lettering, border or other objects.

## 소리 구별

| 파일 | 역할 | 길이 |
|---|---|---|
| scout_pulse.ogg | 플레이어 발사: 밝고 짧은 하강음 | 0.18초 |
| raider_pulse.ogg | 적 발사: 낮은 하강음 | 0.28초 |
| raider_break.ogg | 적 격추: 짧은 파열음 | 0.30초 |
| shield_hit.ogg | 기체 피격: 낮은 충격음 | 0.48초 |
| line_alert.ogg | 방어선 침범: 교대 경고음 | 0.80초 |
| wave_ready.ogg | 새 라운드: 상승 네 음 | 0.80초 |
