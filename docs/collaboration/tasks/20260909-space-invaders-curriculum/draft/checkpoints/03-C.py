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
        super().__init__()
        self.image = pygame.transform.smoothscale(
            pygame.image.load('assets/scout.png').convert_alpha(), (64, 64)
        )
        self.rect = self.image.get_rect()
        self.rect.centerx = SCREEN_WIDTH // 2
        self.rect.bottom = SCREEN_HEIGHT
        self.lives = 5
        self.velocity = 8
        self.pulses = pulses
        self.shoot_sound = pygame.mixer.Sound('assets/scout_pulse.ogg')

    def update(self):
        keys = pygame.key.get_pressed()
        if keys[pygame.K_LEFT] and self.rect.left > 0:
            self.rect.x -= self.velocity
        if keys[pygame.K_RIGHT] and self.rect.right < SCREEN_WIDTH:
            self.rect.x += self.velocity

        if self.rect.left < 0:
            self.rect.left = 0
        if self.rect.right > SCREEN_WIDTH:
            self.rect.right = SCREEN_WIDTH

    def fire(self):
        pass

    def reset(self):
        self.rect.centerx = SCREEN_WIDTH // 2

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

# --- 스프라이트 그룹 및 객체 생성 ---
scout_pulses = pygame.sprite.Group()
raider_pulses = pygame.sprite.Group()

scouts = pygame.sprite.Group()
scout = Scout(scout_pulses)
scouts.add(scout)

raiders = pygame.sprite.Group()

running = True
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    screen.fill((9, 17, 37))

    scouts.update()
    scouts.draw(screen)

    pygame.display.update()
    clock.tick(FPS)

pygame.quit()
