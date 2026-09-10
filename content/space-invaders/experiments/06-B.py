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
    # 객체를 생성할 때 필요한 초기 값과 참조를 준비합니다.
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

    # 그룹에서 호출하는 한 프레임의 처리 순서입니다.
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

    # 발사 조건을 확인하고 발사체를 생성합니다.
    def fire(self):
        if len(self.pulses) < 2:
            self.shoot_sound.play()
            ScoutPulse(self.rect.centerx, self.rect.top, self.pulses)

    # 정해 둔 시작 상태로 이 객체를 복귀시킵니다.
    def reset(self):
        self.rect.centerx = SCREEN_WIDTH // 2

# 적 한 기: 이동·발사와 시작 위치를 관리합니다.
class Raider(pygame.sprite.Sprite):
    # 객체를 생성할 때 필요한 초기 값과 참조를 준비합니다.
    def __init__(self, x, y, velocity, pulse_group):
        super().__init__()
        if not hasattr(Raider, 'shared_image'):
            Raider.shared_image = pygame.transform.smoothscale(
                pygame.image.load('assets/raider.png').convert_alpha(), (56, 48)
            )
            Raider.shared_shoot_sound = pygame.mixer.Sound('assets/raider_pulse.ogg')
        self.image = Raider.shared_image
        self.rect = self.image.get_rect()
        self.rect.topleft = (x, y)
        self.starting_x = x
        self.starting_y = y
        self.direction = 1
        self.velocity = velocity
        self.pulses = pulse_group
        self.shoot_sound = Raider.shared_shoot_sound

    # 그룹에서 호출하는 한 프레임의 처리 순서입니다.
    def update(self):
        self.rect.x += self.direction * self.velocity
        if random.randint(0, 1000) > 999 and len(self.pulses) < 3:
            self.shoot_sound.play()
            self.fire()

    # 발사 조건을 확인하고 발사체를 생성합니다.
    def fire(self):
        RaiderPulse(self.rect.centerx, self.rect.bottom, self.pulses)

    # 정해 둔 시작 상태로 이 객체를 복귀시킵니다.
    def reset(self):
        self.rect.topleft = (self.starting_x, self.starting_y)
        self.direction = 1

# 아군 탄환 한 발: 위로 이동합니다.
class ScoutPulse(pygame.sprite.Sprite):
    # 객체를 생성할 때 필요한 초기 값과 참조를 준비합니다.
    def __init__(self, x, y, pulse_group):
        super().__init__()
        self.image = pygame.Surface((4, 16), pygame.SRCALPHA)
        self.image.fill((78, 240, 255))
        self.rect = self.image.get_rect()
        self.rect.centerx = x
        self.rect.centery = y
        self.velocity = 10
        pulse_group.add(self)

    # 그룹에서 호출하는 한 프레임의 처리 순서입니다.
    def update(self):
        self.rect.y -= self.velocity
        if self.rect.bottom < 0:
            self.kill()

# 적 탄환 한 발: 아래로 이동합니다.
class RaiderPulse(pygame.sprite.Sprite):
    # 객체를 생성할 때 필요한 초기 값과 참조를 준비합니다.
    def __init__(self, x, y, pulse_group):
        super().__init__()
        self.image = pygame.Surface((4, 16), pygame.SRCALPHA)
        self.image.fill((255, 92, 124))
        self.rect = self.image.get_rect()
        self.rect.centerx = x
        self.rect.centery = y
        self.velocity = 10
        pulse_group.add(self)

    # 그룹에서 호출하는 한 프레임의 처리 순서입니다.
    def update(self):
        self.rect.y += self.velocity

# --- 스프라이트 그룹 및 객체 생성 ---
# 현재 아군 탄환을 담아 이동·충돌·개수를 관리합니다.
scout_pulses = pygame.sprite.Group()
# 현재 적 탄환을 담아 이동·충돌·개수를 관리합니다.
raider_pulses = pygame.sprite.Group()

# 아군 탐사선을 담습니다.
scouts = pygame.sprite.Group()
scout = Scout(scout_pulses)
scouts.add(scout)

# 현재 편대의 적들을 담습니다.
raiders = pygame.sprite.Group()

for i in range(10):
    raiders.add(Raider(64 + i * 64, 100, 2, raider_pulses))

mission = Mission(scout, raiders, scout_pulses, raider_pulses)

raiders.sprites()[0].fire()

running = True
# 입력과 상태 변화, 그리기를 매 프레임 반복합니다.
while running:
    # 지난 프레임 이후 쌓인 입력 이벤트를 처리합니다.
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_SPACE:
                scout.fire()

    if not running:
        break

    screen.fill((9, 17, 37))
    scouts.update()
    raiders.update()
    scout_pulses.update()
    raider_pulses.update()
    mission.update()

    scouts.draw(screen)
    raiders.draw(screen)
    scout_pulses.draw(screen)
    raider_pulses.draw(screen)
    mission.draw()

    pygame.display.update()
    clock.tick(FPS)

pygame.quit()
