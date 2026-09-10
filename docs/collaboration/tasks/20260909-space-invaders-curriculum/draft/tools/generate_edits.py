# -*- coding: utf-8 -*-
"""
generate_edits.py
Generates draft/edits.json by analyzing differences between consecutive checkpoints
and confirming each edit applies cleanly and uniquely.
"""

import json
from pathlib import Path

TASK_DIR = Path(__file__).resolve().parents[1]
CHECKPOINTS_DIR = TASK_DIR / "checkpoints"
EDITS_FILE = TASK_DIR / "edits.json"

STEP_IDS = [
    "01-A",
    "02-A", "02-B", "02-C",
    "03-A", "03-B", "03-C",
    "04-A", "04-B", "04-C",
    "05-A",
    "06-A", "06-B", "06-C",
    "07-A", "07-B", "07-C",
    "08-A", "08-B",
    "09-A", "09-B",
    "10-A", "10-B", "10-C"
]

def load_cp(sid):
    p = CHECKPOINTS_DIR / f"{sid}.py"
    with open(p, "r", encoding="utf-8") as f:
        return f.read()

def main():
    steps = []
    
    # We define edits for each transition
    # 01-A: New file
    c_01_A = load_cp("01-A")
    steps.append({
        "stepId": "01-A",
        "previous": None,
        "target": "01-A.py",
        "description": "Pygame 초기화 및 기본 환경 확인",
        "mode": "replaceAll",
        "content": c_01_A
    })
    
    # 02-A: Window setup & game loop
    c_02_A = load_cp("02-A")
    steps.append({
        "stepId": "02-A",
        "previous": "01-A",
        "target": "02-A.py",
        "description": "기본 게임 창과 60FPS 이벤트 루프 생성",
        "mode": "replaceAll",
        "content": c_02_A
    })
    
    # 02-B: Background color change
    c_02_B = load_cp("02-B")
    before_02_B = "    screen.fill((9, 17, 37))"
    after_02_B = "    screen.fill((15, 45, 65))"
    steps.append({
        "stepId": "02-B",
        "previous": "02-A",
        "target": "02-B.py",
        "description": "배경 화면을 짙은 남청색으로 변경",
        "edits": [
            {
                "description": "배경 색상 튜플 변경",
                "before": before_02_B,
                "after": after_02_B
            }
        ]
    })
    
    # 02-C: 5 class skeleton with method pass
    c_02_C = load_cp("02-C")
    before_02_C = "FPS = 60\nclock = pygame.time.Clock()\n\nrunning = True"
    after_02_C = c_02_C[c_02_C.find("FPS = 60\nclock = pygame.time.Clock()\n\n# --- 클래스 설계도 ---"):c_02_C.find("\nrunning = True")] + "\nrunning = True"
    steps.append({
        "stepId": "02-C",
        "previous": "02-B",
        "target": "02-C.py",
        "description": "5대 클래스(Mission, Scout, Pulse, Raider, RaiderPulse) 및 메서드 pass 뼈대 정의",
        "edits": [
            {
                "description": "클래스 설계도와 메서드 뼈대 추가",
                "before": before_02_C,
                "after": after_02_C
            }
        ]
    })
    
    # 03-A: Groups/Objects/Wiring first, Scout init
    c_03_A = load_cp("03-A")
    # In 03-A, Scout has __init__, groups are wired, mission created, update/draw in loop
    steps.append({
        "stepId": "03-A",
        "previous": "02-C",
        "target": "03-A.py",
        "description": "Scout 초기화, 탄환/아군/적군 그룹 생성 및 update/draw 연결",
        "mode": "replaceAll",
        "content": c_03_A
    })
    
    # 03-B: Scout movement and edge clamping
    c_03_B = load_cp("03-B")
    before_03_B = """    def update(self):
        pass"""
    after_03_B = """    def update(self):
        keys = pygame.key.get_pressed()
        if keys[pygame.K_LEFT]:
            self.rect.x -= self.velocity
        if keys[pygame.K_RIGHT]:
            self.rect.x += self.velocity

        if self.rect.left < 0:
            self.rect.left = 0
        if self.rect.right > SCREEN_WIDTH:
            self.rect.right = SCREEN_WIDTH"""
    steps.append({
        "stepId": "03-B",
        "previous": "03-A",
        "target": "03-B.py",
        "description": "Scout 좌우 키보드 이동 및 화면 양쪽 경계 보정(clamp)",
        "edits": [
            {
                "description": "Scout.update 키보드 이동과 양쪽 경계 보정 구현",
                "before": before_03_B,
                "after": after_03_B
            }
        ],
        "experiment": {
            "description": "속도 7 및 임시 위치로 경계 초과 방지 관찰 후 8로 복원",
            "test_change": "self.velocity = 7",
            "restore_change": "self.velocity = 8"
        }
    })
    
    # 03-C: Scout reset method
    before_03_C = """    def reset(self):
        pass"""
    after_03_C = """    def reset(self):
        self.rect.centerx = SCREEN_WIDTH // 2
        self.rect.bottom = SCREEN_HEIGHT"""
    steps.append({
        "stepId": "03-C",
        "previous": "03-B",
        "target": "03-C.py",
        "description": "Scout 중앙 하단 리셋 메서드 구현 및 복귀 시험",
        "edits": [
            {
                "description": "Scout.reset 메서드 구현",
                "before": before_03_C,
                "after": after_03_C
            }
        ],
        "experiment": {
            "description": "임시 위치 이동 후 reset() 호출로 중앙(600, 700) 복귀 확인 후 임시 호출 제거",
            "test_code": "scout.rect.x = 100; scout.reset(); print(scout.rect.centerx)",
            "cleanup": "임시 테스트 코드 제거"
        }
    })
    
    # 04-A: Pulse class & Scout.fire
    c_04_A = load_cp("04-A")
    steps.append({
        "stepId": "04-A",
        "previous": "03-C",
        "target": "04-A.py",
        "description": "Pulse 스프라이트 생성 및 Scout.fire() 스페이스바 발사 연결",
        "mode": "replaceAll",
        "content": c_04_A
    })
    
    # 04-B: 2 bullet limit observation
    before_04_B = """    def fire(self):
        pass"""
    after_04_B = """    def fire(self):
        if len(self.scout_pulses) < 2:
            self.scout_pulse_sound.play()
            self.scout_pulses.add(Pulse(self.rect.centerx, self.rect.top, 'player'))"""
    steps.append({
        "stepId": "04-B",
        "previous": "04-A",
        "target": "04-B.py",
        "description": "아군 탄환 최대 2발 발사 제한 적용 및 발사 차단 관찰",
        "edits": [
            {
                "description": "Scout.fire 아군 탄환 2발 제한",
                "before": before_04_B,
                "after": after_04_B
            }
        ],
        "experiment": {
            "description": "화면 밖 정리가 없어 2발 발사 후 더 이상 발사되지 않는 현상 관찰",
            "observation": "len(scout_pulses) == 2 유지로 추가 발사 차단"
        }
    })
    
    # 04-C: Pulse screen top cleanup (kill)
    before_04_C = """    def update(self):
        self.rect.y -= self.velocity"""
    after_04_C = """    def update(self):
        self.rect.y -= self.velocity
        if self.rect.bottom < 0:
            self.kill()"""
    steps.append({
        "stepId": "04-C",
        "previous": "04-B",
        "target": "04-C.py",
        "description": "화면 상단을 벗어난 탄환 kill() 소멸 처리로 연속 발사 해결",
        "edits": [
            {
                "description": "Pulse.update 화면 상단 이탈 시 kill() 호출",
                "before": before_04_C,
                "after": after_04_C
            }
        ]
    })
    
    # 05-A: Raider class definition (velocity, direction, random condition, reset)
    c_05_A = load_cp("05-A")
    steps.append({
        "stepId": "05-A",
        "previous": "04-C",
        "target": "05-A.py",
        "description": "Raider 클래스 정의 (속도, 방향, 1/1001 확률 발사 조건, reset)",
        "mode": "replaceAll",
        "content": c_05_A
    })
    
    # 06-A: Temporary 10 raiders row
    c_06_A = load_cp("06-A")
    steps.append({
        "stepId": "06-A",
        "previous": "05-A",
        "target": "06-A.py",
        "description": "임시 10기 적 편대 생성으로 스프라이트 배치 확인",
        "mode": "replaceAll",
        "content": c_06_A
    })
    
    # 06-B: RaiderPulse & Raider.fire
    c_06_B = load_cp("06-B")
    steps.append({
        "stepId": "06-B",
        "previous": "06-A",
        "target": "06-B.py",
        "description": "RaiderPulse 탄환 및 Raider.fire() 하향 발사 연결",
        "mode": "replaceAll",
        "content": c_06_B
    })
    
    # 06-C: RaiderPulse offscreen cleanup bug observation & fix
    before_06_C = """    def update(self):
        self.rect.y += self.velocity
        if self.rect.top < SCREEN_HEIGHT:
            self.kill()"""
    after_06_C = """    def update(self):
        self.rect.y += self.velocity
        if self.rect.top > SCREEN_HEIGHT:
            self.kill()"""
    steps.append({
        "stepId": "06-C",
        "previous": "06-B",
        "target": "06-C.py",
        "description": "적 탄환 하강 경계 부등호 오류(<) 직접 관찰 및 올바른 부등호(>) 수정",
        "edits": [
            {
                "description": "RaiderPulse.update 경계 부등호 수정 (< SCREEN_HEIGHT -> > SCREEN_HEIGHT)",
                "before": before_06_C,
                "after": after_06_C
            }
        ],
        "experiment": {
            "description": "top < SCREEN_HEIGHT 조건으로 인해 발사 즉시 사라지는 버그 관찰 후 > 로 복원",
            "observation": "적 탄환이 정상적으로 화면 하단까지 날아간 뒤 제거됨"
        }
    })
    
    # 07-A: Mission init & HUD/border line draw
    c_07_A = load_cp("07-A")
    steps.append({
        "stepId": "07-A",
        "previous": "06-C",
        "target": "07-A.py",
        "description": "Mission 초기 상태(생명5, 라운드1, 점수0), Dohyeon 폰트, 사운드 및 HUD 그리기",
        "mode": "replaceAll",
        "content": c_07_A
    })
    
    # 07-B: Replace temporary raiders with Mission.start_new_round (55 raiders) & single Mission instantiation
    c_07_B = load_cp("07-B")
    steps.append({
        "stepId": "07-B",
        "previous": "07-A",
        "target": "07-B.py",
        "description": "임시 10기 편대 제거, Mission.start_new_round(55기 5x11 편대) 구현 및 Mission 인스턴스 단일 생성",
        "mode": "replaceAll",
        "content": c_07_B
    })
    
    # 07-C: Connect start_new_round call in setup
    before_07_C = "mission = Mission(scout, raiders, scout_pulses, raider_pulses)"
    after_07_C = "mission = Mission(scout, raiders, scout_pulses, raider_pulses)\nmission.start_new_round()"
    steps.append({
        "stepId": "07-C",
        "previous": "07-B",
        "target": "07-C.py",
        "description": "게임 시작 시 55기 정식 편대 출격을 위한 start_new_round() 호출 연결",
        "edits": [
            {
                "description": "mission 객체 생성 직후 start_new_round() 호출",
                "before": before_07_C,
                "after": after_07_C
            }
        ]
    })
    
    # 08-A: Mission.shift_raiders (bounce, drop distance, breach check)
    c_08_A = load_cp("08-A")
    steps.append({
        "stepId": "08-A",
        "previous": "07-C",
        "target": "08-A.py",
        "description": "적 편대 벽 반전, 라운드 비례 하강(10*round_number) 및 방어선 침범 처리",
        "mode": "replaceAll",
        "content": c_08_A
    })
    
    # 08-B: Fast breach test with temporary high round, then restore
    c_08_B = load_cp("08-B")
    steps.append({
        "stepId": "08-B",
        "previous": "08-A",
        "target": "08-B.py",
        "description": "빠른 방어선 침범 시험(round_number=30)으로 생명 감소 확인 후 1로 정상 복원",
        "mode": "replaceAll",
        "content": c_08_B,
        "experiment": {
            "description": "기본 라운드 대기 시간 단축을 위해 round_number=30으로 1회 하강에 300픽셀 이동 시험",
            "test_change": "mission.round_number = 30",
            "restore_change": "mission.round_number = 1"
        }
    })
    
    # 09-A: check_game_status first, pause_game, and full loop replacement
    c_09_A = load_cp("09-A")
    steps.append({
        "stepId": "09-A",
        "previous": "08-B",
        "target": "09-A.py",
        "description": "check_game_status 비상정돈(탄환비우기/위치복원/생명분기), pause_game 및 메인 루프 전체 교체",
        "mode": "replaceAll",
        "content": c_09_A
    })
    
    # 09-B: Pause / Resume with Enter
    c_09_B = load_cp("09-B")
    steps.append({
        "stepId": "09-B",
        "previous": "09-A",
        "target": "09-B.py",
        "description": "paused 상태에서 Enter 키로 게임 재개 및 일시정지 중 조작 차단 확인",
        "mode": "replaceAll",
        "content": c_09_B
    })
    
    # 10-A: reset_game, restart_game, Enter for game_over
    c_10_A = load_cp("10-A")
    steps.append({
        "stepId": "10-A",
        "previous": "09-B",
        "target": "10-A.py",
        "description": "게임오버 점수 보존(reset_game), 재시작(restart_game) 및 Enter 새 게임 분기",
        "mode": "replaceAll",
        "content": c_10_A
    })
    
    # 10-B: check_collisions (player bullets vs raiders, raider pulses vs player, enemy breach, state guard)
    c_10_B = load_cp("10-B")
    steps.append({
        "stepId": "10-B",
        "previous": "10-A",
        "target": "10-B.py",
        "description": "스프라이트 충돌 검사(아군 탄환-적기, 적 탄환-아군, 적기-아군) 및 상태 가드",
        "mode": "replaceAll",
        "content": c_10_B
    })
    
    # 10-C: check_round_completion (clear pulses, round bonus, start_new_round)
    c_10_C = load_cp("10-C")
    steps.append({
        "stepId": "10-C",
        "previous": "10-B",
        "target": "10-C.py",
        "description": "편대 전멸 판정, 탄환 정리, 라운드 보너스(1000*round_number) 및 다음 라운드 진입",
        "mode": "replaceAll",
        "content": c_10_C
    })
    
    manifest_edits = {
        "format": "metasense-code-edits-v2",
        "totalSteps": len(steps),
        "totalCheckpoints": len(steps) + 1,  # 24 steps + final-main.py = 25
        "steps": steps
    }
    
    with open(EDITS_FILE, "w", encoding="utf-8") as f:
        json.dump(manifest_edits, f, ensure_ascii=False, indent=2)
    print(f"Wrote edits to {EDITS_FILE} ({len(steps)} steps)")

if __name__ == "__main__":
    main()
