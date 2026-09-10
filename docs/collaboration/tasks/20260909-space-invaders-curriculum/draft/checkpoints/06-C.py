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
        if len(self.pulses) < 2:
            self.shoot_sound.play()
            ScoutPulse(self.rect.centerx, self.rect.top, self.pulses)

    def reset(self):
        self.rect.centerx = SCREEN_WIDTH // 2

class Raider(pygame.sprite.Sprite):
    def __init__(self, x, y, velocity, pulse_group):
        super().__init__()
        self.image = pygame.transform.smoothscale(
            pygame.image.load('assets/raider.png').convert_alpha(), (56, 48)
        )
        self.rect = self.image.get_rect()
        self.rect.topleft = (x, y)
        self.starting_x = x
        self.starting_y = y
        self.direction = 1
        self.velocity = velocity
        self.pulses = pulse_group
        self.shoot_sound = pygame.mixer.Sound('assets/raider_pulse.ogg')

    def update(self):
        self.rect.x += self.direction * self.velocity
        if random.randint(0, 1000) > 999 and len(self.pulses) < 3:
            self.shoot_sound.play()
            self.fire()

    def fire(self):
        RaiderPulse(self.rect.centerx, self.rect.bottom, self.pulses)

    def reset(self):
        self.rect.topleft = (self.starting_x, self.starting_y)
        self.direction = 1

class ScoutPulse(pygame.sprite.Sprite):
    def __init__(self, x, y, pulse_group):
        super().__init__()
        self.image = pygame.Surface((4, 16), pygame.SRCALPHA)
        self.image.fill((78, 240, 255))
        self.rect = self.image.get_rect()
        self.rect.centerx = x
        self.rect.centery = y
        self.velocity = 10
        pulse_group.add(self)

    def update(self):
        self.rect.y -= self.velocity
        if self.rect.bottom < 0:
            self.kill()

class RaiderPulse(pygame.sprite.Sprite):
    def __init__(self, x, y, pulse_group):
        super().__init__()
        self.image = pygame.Surface((4, 16), pygame.SRCALPHA)
        self.image.fill((255, 92, 124))
        self.rect = self.image.get_rect()
        self.rect.centerx = x
        self.rect.centery = y
        self.velocity = 10
        pulse_group.add(self)

    def update(self):
        self.rect.y += self.velocity
        if self.rect.top > SCREEN_HEIGHT:
            self.kill()

# --- 스프라이트 그룹 및 객체 생성 ---
scout_pulses = pygame.sprite.Group()
raider_pulses = pygame.sprite.Group()

scouts = pygame.sprite.Group()
scout = Scout(scout_pulses)
scouts.add(scout)

raiders = pygame.sprite.Group()
for i in range(10):
    raider = Raider(64 + i * 64, 100, 2, raider_pulses)
    raiders.add(raider)

running = True
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_SPACE:
                scout.fire()

    screen.fill((9, 17, 37))

    scouts.update()
    scouts.draw(screen)

    raiders.update()
    raiders.draw(screen)

    scout_pulses.update()
    scout_pulses.draw(screen)

    raider_pulses.update()
    raider_pulses.draw(screen)

    pygame.display.update()
    clock.tick(FPS)

pygame.quit()
