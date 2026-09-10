# 화성 탐사대 에셋 안내

메타센스 게임 스튜디오의 **내 프로젝트 → 화성 탐사대 수업 준비**를 누르면 빈 main.py와 모든 에셋이 있는 새 프로젝트가 만들어집니다. 기존 프로젝트는 남습니다. 01~08은 기초 실험, 10부터는 별도 본 게임 프로젝트로 진행합니다. VS Code나 별도 파이썬 설치는 필요하지 않습니다.

| 경로 | 내용 |
| --- | --- |
| assets/background.png | 1280×736 화성 탐사 기지 배경 |
| assets/tiles/1.png~6.png | 32×32 흙, 표면, 발판 왼쪽·중간·오른쪽, 지열 위험 구역 |
| assets/explorer/run, idle, jump, fire/0.png~3.png | 64×64 탐사원 네 행동, 각4프레임 |
| assets/robot/teal, amber/walk, down/0.png~3.png | 두 로봇의 걷기와 쓰러짐, 각4프레임. 역순으로 재부팅 |
| assets/gate/teal, violet/0.png~3.png | 72×72 이동 게이트, 각4프레임 |
| assets/crystal/0.png~3.png | 64×64 신호 결정. 회수물은 코드에서32×32로 축소 |
| assets/pulse.png | 32×24 펄스 발사체 |
| assets/sounds/*.ogg | jump, pulse, portal, hurt, robot_down, robot_clear, collect, signal_lost 효과음과 expedition 음악 |
| assets/fonts/DoHyeon-Regular.ttf | 도현체 한글 폰트 |

슬래시로 구분된 경로는 프로젝트 폴더 구조입니다. 대소문자와 0부터 시작하는 프레임 번호를 그대로 사용합니다. 모든 캐릭터·게이트·타일은 실제 알파 투명도를 가진 PNG입니다. 배경만 불투명 이미지입니다.

그림은 이번 커리큘럼을 위해 새로 생성하고, 스프라이트 시트를 나누어 크기와 기준점을 맞췄습니다. 원강의의 캐릭터·배경·타일을 재배포하지 않습니다. 네 프레임을 사용하므로 원강의의8·10·22프레임과 재생 속도 설정이 다릅니다. 학습 원리는 같은 리스트 순환입니다.

효과음8종과16초 배경음악은 외부 샘플 없이 파형으로 새로 합성했습니다. 브라우저에서 게임 화면을 클릭한 다음 Enter로 시작하면 음악이 재생됩니다. 기기 볼륨은 처음에 낮게 조절하세요.

도현체는 수정 없는 SIL Open Font License 1.1 배포본입니다. 라이선스 전체는 OFL.txt와 프로젝트의 asset_credits.py에 포함했습니다. 원본: https://github.com/google/fonts/tree/main/ofl/dohyeon

## 자료 사용 순서

1. Data Log에서 수정 위치와 코드를 읽고 main.py에 직접 작성합니다.
2. 실행 지점의 화면과 조작 결과를 확인합니다.
3. 막히면 누적 코드 링크를 눌러 스크롤 창에서 비교합니다.
4. 별도 실행 비교가 필요하면 스튜디오의 ‘화성 탐사대 단계 비교·수업 자료’에서 선택합니다.
5. 임시 시험은 문서의 복원 절차를 마친 뒤 다음 단계로 넘어갑니다.
6. 완성 게임 비교는 final-main입니다. 완성 코드를 처음부터 붙여 넣는 과정이 아닙니다.
