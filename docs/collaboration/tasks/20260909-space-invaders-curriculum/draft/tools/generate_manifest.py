# -*- coding: utf-8 -*-
"""
generate_manifest.py
Generates draft/manifest.json with all 10 units, 24 steps, and 25 total checkpoints.
"""

import json
from pathlib import Path

TASK_DIR = Path(__file__).resolve().parents[1]
MANIFEST_FILE = TASK_DIR / "manifest.json"

manifest = {
    "project": "우주 방어대 (Space Invaders)",
    "target": "MetaSense Game Studio",
    "totalUnits": 10,
    "totalSteps": 24,
    "totalCheckpoints": 25,
    "finalMainPath": "draft/checkpoints/final-main.py",
    "units": [
        {
            "unitNumber": 1,
            "unitKey": "si01",
            "title": "작전 본부와 우주 방어대 비행 규칙",
            "lectureId": "27597170",
            "dataLogPath": "draft/data-log/01.md",
            "steps": [
                {
                    "stepId": "01-A",
                    "prevCheckpoint": None,
                    "codePath": "draft/checkpoints/01-A.py",
                    "editLocation": "빈 main.py 1행부터",
                    "expectedResult": "콘솔에 '우주 방어대 수업 준비 완료!'와 Pygame 버전 출력",
                    "controls": "실행 버튼 클릭 후 콘솔 확인",
                    "normalIncomplete": "게임 그래픽 창이 아직 생성되지 않음",
                    "errorDiagnosis": "pygame 오타 시 NameError, 따옴표 미스 시 SyntaxError"
                }
            ]
        },
        {
            "unitNumber": 2,
            "unitKey": "si02",
            "title": "우리의 우주 창 열기와 5개 클래스 설계도",
            "lectureId": "27597174",
            "dataLogPath": "draft/data-log/02.md",
            "steps": [
                {
                    "stepId": "02-A",
                    "prevCheckpoint": "01-A.py",
                    "codePath": "draft/checkpoints/02-A.py",
                    "editLocation": "main.py 전체 (1200x700 화면 생성 및 60FPS 이벤트 루프)",
                    "expectedResult": "1200x700 남색(9, 17, 37) 창이 안정적으로 열리고 유지됨",
                    "controls": "실행 버튼 클릭 및 정지 후 재실행",
                    "normalIncomplete": "배경만 있고 우주선, 적, 글자, 소리 없음",
                    "errorDiagnosis": "들여쓰기 4/8/12칸 불일치 시 IndentationError, quit 위치 확인"
                },
                {
                    "stepId": "02-B",
                    "prevCheckpoint": "02-A.py",
                    "codePath": "draft/checkpoints/02-B.py",
                    "editLocation": "main.py screen.fill((15, 45, 65)) 줄 교체",
                    "expectedResult": "배경이 조금 더 밝은 청록빛으로 변경됨",
                    "controls": "정지 후 수정, 재실행하여 색상 관찰",
                    "normalIncomplete": "색상 외 오브젝트 없음",
                    "errorDiagnosis": "RGB 튜플 괄호 짝 확인 및 정지 후 재실행 여부 점검"
                },
                {
                    "stepId": "02-C",
                    "prevCheckpoint": "02-B.py",
                    "codePath": "draft/checkpoints/02-C.py",
                    "editLocation": "clock 아래, running = True 위 5개 클래스 및 메서드 pass 뼈대",
                    "expectedResult": "오류 없이 청록 화면 유지",
                    "controls": "실행 후 문법 점검",
                    "normalIncomplete": "클래스 설계도와 메서드 뼈대만 작성되었고 인스턴스 미생성으로 화면 변화 없음",
                    "errorDiagnosis": "클래스 내 메서드 들여쓰기 4칸, pass 누락 여부 확인"
                }
            ]
        },
        {
            "unitNumber": 3,
            "unitKey": "si03",
            "title": "정찰선 출격과 그룹 연결, 정밀 경계 제어",
            "lectureId": "27597177",
            "dataLogPath": "draft/data-log/03.md",
            "steps": [
                {
                    "stepId": "03-A",
                    "prevCheckpoint": "02-C.py",
                    "codePath": "draft/checkpoints/03-A.py",
                    "editLocation": "스프라이트 그룹 생성, Scout 인스턴스화, Mission 연결 및 update/draw 루프",
                    "expectedResult": "화면 하단 중앙(x=600, y=700)에 Scout 아군 우주선 출격",
                    "controls": "실행 후 우주선 출현 확인",
                    "normalIncomplete": "키를 눌러도 움직이지 않음 (update 미구현)",
                    "errorDiagnosis": "이미지 경로 assets/images/scout.png 확인 및 Group add 여부"
                },
                {
                    "stepId": "03-B",
                    "prevCheckpoint": "03-A.py",
                    "codePath": "draft/checkpoints/03-B.py",
                    "editLocation": "Scout.update() 키보드 좌우 입력과 양쪽 경계 보정(clamp)",
                    "expectedResult": "좌우 방향키로 이동하며, 양쪽 벽에 닿아도 화면 밖으로 벗어나지 않고 멈춤",
                    "controls": "좌/우 방향키를 누르고 화면 양 끝까지 밀어보기",
                    "normalIncomplete": "스페이스바를 눌러도 탄환이 발사되지 않음",
                    "errorDiagnosis": "rect.left < 0 및 rect.right > SCREEN_WIDTH 부등호와 0/SCREEN_WIDTH 대입 확인"
                },
                {
                    "stepId": "03-C",
                    "prevCheckpoint": "03-B.py",
                    "codePath": "draft/checkpoints/03-C.py",
                    "editLocation": "Scout.reset() 중앙 하단 복귀 메서드 구현 및 임시 확인",
                    "expectedResult": "Scout.reset()이 정의되어 추후 피격 시 중앙 하단으로 복귀할 준비 완료",
                    "controls": "임시 위치 이동 후 reset() 호출 결과 관찰 및 임시 코드 제거",
                    "normalIncomplete": "아직 피격이나 라운드 전환 연결이 없어 평상시 자동 호출되지 않음",
                    "errorDiagnosis": "centerx // 2 연산자 오타, bottom 대입값 확인"
                }
            ]
        },
        {
            "unitNumber": 4,
            "unitKey": "si04",
            "title": "플라즈마 탄환과 발사 제약",
            "lectureId": "27597179",
            "dataLogPath": "draft/data-log/04.md",
            "steps": [
                {
                    "stepId": "04-A",
                    "prevCheckpoint": "03-C.py",
                    "codePath": "draft/checkpoints/04-A.py",
                    "editLocation": "Pulse 클래스 정의, Scout.fire() 스페이스바 이벤트 연결",
                    "expectedResult": "스페이스바를 누르면 발사음과 함께 플라즈마 탄환이 위로 날아감",
                    "controls": "스페이스바 연타 시험",
                    "normalIncomplete": "화면 상단으로 벗어난 탄환이 메모리/그룹에 남아 추가 발사 차단 문제 발생 예정",
                    "errorDiagnosis": "KEYDOWN 이벤트 블록 들여쓰기 및 assets/sounds/scout_pulse.wav 확인"
                },
                {
                    "stepId": "04-B",
                    "prevCheckpoint": "04-A.py",
                    "codePath": "draft/checkpoints/04-B.py",
                    "editLocation": "Scout.fire() 아군 탄환 2발 제한 조건문 추가",
                    "expectedResult": "2발을 쏘고 나면 더 이상 탄환이 발사되지 않고 먹통이 됨 (의도된 현상)",
                    "controls": "스페이스바 2번 이상 연타 관찰",
                    "normalIncomplete": "2발 후 추가 발사 불가 (화면 밖 소멸 처리 미구현)",
                    "errorDiagnosis": "len(self.scout_pulses) < 2 조건 비교 확인"
                },
                {
                    "stepId": "04-C",
                    "prevCheckpoint": "04-B.py",
                    "codePath": "draft/checkpoints/04-C.py",
                    "editLocation": "Pulse.update() 상단 경계 이탈(rect.bottom < 0) 시 kill() 호출",
                    "expectedResult": "화면 밖으로 나간 탄환이 자동 소멸되어 다시 2발씩 자유롭게 연속 발사 가능",
                    "controls": "스페이스바를 계속 연타하며 화면 상단 이탈 후 재발사 확인",
                    "normalIncomplete": "아직 요격할 적기가 없음",
                    "errorDiagnosis": "rect.bottom < 0 부등호 및 kill() 호출 여부 확인"
                }
            ]
        },
        {
            "unitNumber": 5,
            "unitKey": "si05",
            "title": "외계 침략선 Raider의 기동 원리",
            "lectureId": "27597181",
            "dataLogPath": "draft/data-log/05.md",
            "steps": [
                {
                    "stepId": "05-A",
                    "prevCheckpoint": "04-C.py",
                    "codePath": "draft/checkpoints/05-A.py",
                    "editLocation": "Raider 클래스 속성, 이동, 확률 발사 조건(1/1001) 및 reset 완성",
                    "expectedResult": "문법 오류 없이 실행되며, 침략선 설계도가 완성됨",
                    "controls": "실행 버튼 클릭 후 에러 여부 확인",
                    "normalIncomplete": "아직 적 인스턴스를 생성하지 않아 화면에 적이 나타나지 않음",
                    "errorDiagnosis": "assets/images/raider.png 경로 및 random.randint(0, 1000) 조건 확인"
                }
            ]
        },
        {
            "unitNumber": 6,
            "unitKey": "si06",
            "title": "적 탄환 발사와 버그 진단",
            "lectureId": "27597184",
            "dataLogPath": "draft/data-log/06.md",
            "steps": [
                {
                    "stepId": "06-A",
                    "prevCheckpoint": "05-A.py",
                    "codePath": "draft/checkpoints/06-A.py",
                    "editLocation": "게임 준비 구간에 임시 10기 적 편대 배치",
                    "expectedResult": "화면 상단에 10기의 외계 침략선이 일렬로 나타남",
                    "controls": "실행 후 10기 침략선 확인",
                    "normalIncomplete": "적들이 제자리에 멈춰 있고 탄환을 쏘지 않음",
                    "errorDiagnosis": "for i in range(10) 루프 및 raiders.add(raider) 확인"
                },
                {
                    "stepId": "06-B",
                    "prevCheckpoint": "06-A.py",
                    "codePath": "draft/checkpoints/06-B.py",
                    "editLocation": "RaiderPulse 클래스 및 Raider.fire() 하향 발사 연결",
                    "expectedResult": "적들이 붉은 탄환을 아래로 쏘며 발사음이 울림",
                    "controls": "화면을 바라보며 적 탄환 발사 관찰",
                    "normalIncomplete": "적 탄환이 화면 하단 밖으로 나가도 소멸되지 않고 남는 문제 발생 예정",
                    "errorDiagnosis": "Raider.fire() 조건 및 raider_pulses 그룹 추가 확인"
                },
                {
                    "stepId": "06-C",
                    "prevCheckpoint": "06-B.py",
                    "codePath": "draft/checkpoints/06-C.py",
                    "editLocation": "RaiderPulse.update() 잘못된 부등호(<) 직접 관찰 및 올바른 부등호(>) 수정",
                    "expectedResult": "적 탄환이 발사 즉시 사라지지 않고 화면 하단 끝까지 정상 비행 후 소멸",
                    "controls": "진단용 < 코드 실행 관찰 후 > 로 복원하여 정상 비행 확인",
                    "normalIncomplete": "적 탄환에 아군이 맞아도 아직 피격 판정이 없음",
                    "errorDiagnosis": "rect.top > SCREEN_HEIGHT 부등호 방향 및 kill() 확인"
                }
            ]
        },
        {
            "unitNumber": 7,
            "unitKey": "si07",
            "title": "사령탑 Mission과 정식 55기 편대 출격",
            "lectureId": "27597188",
            "dataLogPath": "draft/data-log/07.md",
            "steps": [
                {
                    "stepId": "07-A",
                    "prevCheckpoint": "06-C.py",
                    "codePath": "draft/checkpoints/07-A.py",
                    "editLocation": "Mission.__init__ 초기화, Dohyeon 폰트, 사운드, draw HUD와 방어선 표시",
                    "expectedResult": "상단에 점수/생명/라운드 HUD가 표시되고 하단 y=630에 흰색 방어선 표시",
                    "controls": "실행 후 HUD 텍스트와 방어선 확인",
                    "normalIncomplete": "아직 임시 10기 적이 그대로 남아있음",
                    "errorDiagnosis": "assets/fonts/Dohyeon.ttf 경로 및 get_surface() 점검"
                },
                {
                    "stepId": "07-B",
                    "prevCheckpoint": "07-A.py",
                    "codePath": "draft/checkpoints/07-B.py",
                    "editLocation": "임시 10기 제거, Mission.start_new_round() 55기 편대 생성 및 Mission 단일 인스턴스화",
                    "expectedResult": "오류 없이 실행 준비 완료 (임시 편대 제거됨)",
                    "controls": "실행 후 문법 점검",
                    "normalIncomplete": "start_new_round()를 아직 호출하지 않아 화면에 적이 나타나지 않음",
                    "errorDiagnosis": "이중 생성 코드 제거 확인 및 5x11 이중 for문 확인"
                },
                {
                    "stepId": "07-C",
                    "prevCheckpoint": "07-B.py",
                    "codePath": "draft/checkpoints/07-C.py",
                    "editLocation": "mission 생성 직후 mission.start_new_round() 호출",
                    "expectedResult": "화면 상단에 5열 11행 총 55기의 침략군 대편대 출격 완료",
                    "controls": "실행 후 55기 편대 위용 확인",
                    "normalIncomplete": "적 편대가 아직 좌우로 전진/하강 기동하지 않음",
                    "errorDiagnosis": "mission.start_new_round() 호출 위치 확인"
                }
            ]
        },
        {
            "unitNumber": 8,
            "unitKey": "si08",
            "title": "편대 기동과 방어선 침범",
            "lectureId": "27597190",
            "dataLogPath": "draft/data-log/08.md",
            "steps": [
                {
                    "stepId": "08-A",
                    "prevCheckpoint": "07-C.py",
                    "codePath": "draft/checkpoints/08-A.py",
                    "editLocation": "Mission.shift_raiders() 벽 충돌 시 반전, 라운드 비례 하강, 방어선 침범 판정",
                    "expectedResult": "55기 편대가 좌우로 지그재그 행진하며 벽에 닿을 때마다 10픽셀씩 하강",
                    "controls": "편대의 단체 기동과 벽 반전 관찰",
                    "normalIncomplete": "적들이 방어선에 닿아도 아직 게임 정지/리셋 연동이 미완성",
                    "errorDiagnosis": "shift_raiders() 내 drop_distance = 10 * self.round_number 확인"
                },
                {
                    "stepId": "08-B",
                    "prevCheckpoint": "08-A.py",
                    "codePath": "draft/checkpoints/08-B.py",
                    "editLocation": "빠른 침범 시험(round_number=30)으로 방어선 돌파 확인 후 정상(1) 복원",
                    "expectedResult": "침범 시 침범음 울림 및 생명 감소 확인 후 1라운드로 안전하게 복원",
                    "controls": "임시 30라운드로 빠른 침범 확인 후 round_number=1 복원",
                    "normalIncomplete": "아직 일시정지 오버레이와 Enter 재개 루프가 미연결",
                    "errorDiagnosis": "시험 후 round_number를 반드시 1로 복원했는지 점검"
                }
            ]
        },
        {
            "unitNumber": 9,
            "unitKey": "si09",
            "title": "비상 정돈과 일시정지 상태 머신",
            "lectureId": "27597194",
            "dataLogPath": "draft/data-log/09.md",
            "steps": [
                {
                    "stepId": "09-A",
                    "prevCheckpoint": "08-B.py",
                    "codePath": "draft/checkpoints/09-A.py",
                    "editLocation": "check_game_status() 비상정돈, pause_game(), 메인 루프 상태 분기 전체 교체",
                    "expectedResult": "침범 시 게임이 '일시 정지'되며 안내 메시지가 중앙에 표시되고 적/탄환이 멈춤",
                    "controls": "방어선 침범 시 일시정지 화면 확인",
                    "normalIncomplete": "Enter 키를 눌러도 아직 재개되지 않음",
                    "errorDiagnosis": "running 루프 교체 코드에서 if mission.state == 'playing': 확인"
                },
                {
                    "stepId": "09-B",
                    "prevCheckpoint": "09-A.py",
                    "codePath": "draft/checkpoints/09-B.py",
                    "editLocation": "메인 루프 이벤트에 paused 상태 시 K_RETURN(Enter) 재개 처리 추가",
                    "expectedResult": "Enter를 누르면 안내창이 닫히고 우주선과 편대가 다시 전투 개시",
                    "controls": "일시정지 중 조작 차단 확인 후 Enter 키 입력으로 재개",
                    "normalIncomplete": "생명이 0이 되어도 게임오버 후 재시작 처리가 미완성",
                    "errorDiagnosis": "if event.key == pygame.K_RETURN 및 mission.state = 'playing' 확인"
                }
            ]
        },
        {
            "unitNumber": 10,
            "unitKey": "si10",
            "title": "격추 판정과 게임 완성",
            "lectureId": "27597198",
            "dataLogPath": "draft/data-log/10.md",
            "steps": [
                {
                    "stepId": "10-A",
                    "prevCheckpoint": "09-B.py",
                    "codePath": "draft/checkpoints/10-A.py",
                    "editLocation": "Mission.reset_game() 최종 점수 보존, restart_game(), Enter 새 게임 분기",
                    "expectedResult": "생명 0 시 게임오버 화면에서 최종 점수가 보존되고, Enter 입력 시 1라운드 0점으로 새 게임 시작",
                    "controls": "임시 생명 0 설정으로 게임오버 확인 후 Enter로 새 게임 시작",
                    "normalIncomplete": "아직 탄환 충돌과 편대 격파 판정이 연결되지 않음",
                    "errorDiagnosis": "reset_game에서 start_new_round를 즉시 호출하지 않고 game_over 상태 유지 확인"
                },
                {
                    "stepId": "10-B",
                    "prevCheckpoint": "10-A.py",
                    "codePath": "draft/checkpoints/10-B.py",
                    "editLocation": "Mission.check_collisions() 스프라이트 충돌 검사 및 상태 가드(state != 'playing')",
                    "expectedResult": "아군 탄환으로 적 격파 시 100점 획득 및 격파음, 적 탄환/적기 충돌 시 피격 처리",
                    "controls": "방향키 이동 및 스페이스바로 적 요격 시험",
                    "normalIncomplete": "55기를 모두 격파했을 때 다음 라운드로 넘어가는 처리 미구현",
                    "errorDiagnosis": "groupcollide 및 spritecollide 파라미터, 킬당 100점 가산 확인"
                },
                {
                    "stepId": "10-C",
                    "prevCheckpoint": "10-B.py",
                    "codePath": "draft/checkpoints/10-C.py",
                    "editLocation": "Mission.check_round_completion() 전멸 판정, 탄환 비우기, 라운드 보너스 및 다음 라운드 진입",
                    "expectedResult": "우주 방어대 100% 완성! 편대 전멸 시 라운드 보너스 획득 및 더 빠른 다음 라운드 출격",
                    "controls": "적 요격, 회피, 라운드 클리어 및 게임오버 전 과정 플레이",
                    "normalIncomplete": "없음 (최종 완성본)",
                    "errorDiagnosis": "raiders.empty() 조건 및 1000 * round_number 보너스 연산 확인"
                }
            ]
        }
    ]
}

def main():
    with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"Wrote manifest to {MANIFEST_FILE} (24 steps, 25 total checkpoints)")

if __name__ == "__main__":
    main()
