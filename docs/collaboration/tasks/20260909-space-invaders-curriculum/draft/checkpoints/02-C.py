import pygame
import random

pygame.init()

SCREEN_WIDTH = 1200
SCREEN_HEIGHT = 700
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption('우주 방어대')

FPS = 60
clock = pygame.time.Clock()

# --- 클래스 설계도 ---
class Mission:
    def __init__(self, scout, raiders, scout_pulses, raider_pulses):
        pass

    def update(self):
        pass

    def draw(self):
        pass

    def shift_raiders(self):
        pass

    def check_collisions(self):
        pass

    def check_round_completion(self):
        pass

    def start_new_round(self):
        pass

    def check_game_status(self, main_text, sub_text):
        pass

    def pause_game(self, main_text, sub_text):
        pass

    def reset_game(self):
        pass

    def restart_game(self):
        pass

class Scout(pygame.sprite.Sprite):
    def __init__(self, pulses):
        pass

    def update(self):
        pass

    def fire(self):
        pass

    def reset(self):
        pass

class Raider(pygame.sprite.Sprite):
    def __init__(self, x, y, velocity, pulse_group):
        pass

    def update(self):
        pass

    def fire(self):
        pass

    def reset(self):
        pass

class ScoutPulse(pygame.sprite.Sprite):
    def __init__(self, x, y, pulse_group):
        pass

    def update(self):
        pass

class RaiderPulse(pygame.sprite.Sprite):
    def __init__(self, x, y, pulse_group):
        pass

    def update(self):
        pass

running = True
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    screen.fill((9, 17, 37))
    pygame.display.update()
    clock.tick(FPS)

pygame.quit()
