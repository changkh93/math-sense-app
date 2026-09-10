# 게임 화면·입력·소리를 다루는 도구를 불러옵니다.
import pygame
import random

# 화면과 소리 모듈을 사용하기 전에 초기화합니다.
pygame.init()

SCREEN_WIDTH = 1200
SCREEN_HEIGHT = 700
# 화면은 한 번 만들고, 반복문 안에서 내용을 갱신합니다.
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption('우주 방어대')

FPS = 60
clock = pygame.time.Clock()

# 전투 규칙: 점수·편대·생명에 따른 진행 상태를 관리합니다.
class Mission:
    # 나중에 채울 메서드입니다. 지금은 pass로 빈 자리를 둡니다.
    def __init__(self, scout, raiders, scout_pulses, raider_pulses):
        pass

    # 나중에 채울 메서드입니다. 지금은 pass로 빈 자리를 둡니다.
    def update(self):
        pass

    # 나중에 채울 메서드입니다. 지금은 pass로 빈 자리를 둡니다.
    def draw(self):
        pass

    # 나중에 채울 메서드입니다. 지금은 pass로 빈 자리를 둡니다.
    def shift_raiders(self):
        pass

    # 나중에 채울 메서드입니다. 지금은 pass로 빈 자리를 둡니다.
    def check_collisions(self):
        pass

    # 나중에 채울 메서드입니다. 지금은 pass로 빈 자리를 둡니다.
    def check_round_completion(self):
        pass

    # 나중에 채울 메서드입니다. 지금은 pass로 빈 자리를 둡니다.
    def start_new_round(self):
        pass

    # 나중에 채울 메서드입니다. 지금은 pass로 빈 자리를 둡니다.
    def check_game_status(self, main_text, sub_text):
        pass

    # 나중에 채울 메서드입니다. 지금은 pass로 빈 자리를 둡니다.
    def pause_game(self, main_text, sub_text):
        pass

    # 나중에 채울 메서드입니다. 지금은 pass로 빈 자리를 둡니다.
    def reset_game(self):
        pass

# 탐사선: 좌우 이동과 아군 발사를 담당합니다.
class Scout(pygame.sprite.Sprite):
    # 나중에 채울 메서드입니다. 지금은 pass로 빈 자리를 둡니다.
    def __init__(self, pulses):
        pass

    # 나중에 채울 메서드입니다. 지금은 pass로 빈 자리를 둡니다.
    def update(self):
        pass

    # 나중에 채울 메서드입니다. 지금은 pass로 빈 자리를 둡니다.
    def fire(self):
        pass

    # 나중에 채울 메서드입니다. 지금은 pass로 빈 자리를 둡니다.
    def reset(self):
        pass

# 적 한 기: 이동·발사와 시작 위치를 관리합니다.
class Raider(pygame.sprite.Sprite):
    # 나중에 채울 메서드입니다. 지금은 pass로 빈 자리를 둡니다.
    def __init__(self, x, y, velocity, pulse_group):
        pass

    # 나중에 채울 메서드입니다. 지금은 pass로 빈 자리를 둡니다.
    def update(self):
        pass

    # 나중에 채울 메서드입니다. 지금은 pass로 빈 자리를 둡니다.
    def fire(self):
        pass

    # 나중에 채울 메서드입니다. 지금은 pass로 빈 자리를 둡니다.
    def reset(self):
        pass

# 아군 탄환 한 발: 위로 이동합니다.
class ScoutPulse(pygame.sprite.Sprite):
    # 나중에 채울 메서드입니다. 지금은 pass로 빈 자리를 둡니다.
    def __init__(self, x, y, pulse_group):
        pass

    # 나중에 채울 메서드입니다. 지금은 pass로 빈 자리를 둡니다.
    def update(self):
        pass

# 적 탄환 한 발: 아래로 이동합니다.
class RaiderPulse(pygame.sprite.Sprite):
    # 나중에 채울 메서드입니다. 지금은 pass로 빈 자리를 둡니다.
    def __init__(self, x, y, pulse_group):
        pass

    # 나중에 채울 메서드입니다. 지금은 pass로 빈 자리를 둡니다.
    def update(self):
        pass

running = True
# 입력과 상태 변화, 그리기를 매 프레임 반복합니다.
while running:
    # 지난 프레임 이후 쌓인 입력 이벤트를 처리합니다.
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    if not running:
        break

    screen.fill((9, 17, 37))
    pygame.display.update()
    clock.tick(FPS)

pygame.quit()
