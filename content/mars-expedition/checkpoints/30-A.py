import random
# 게임 화면·입력·소리를 다루는 도구를 불러옵니다.
import pygame

# 화면과 소리 모듈을 사용하기 전에 초기화합니다.
pygame.init()
Vector = pygame.math.Vector2
SCREEN_WIDTH, SCREEN_HEIGHT = 1280, 736
TILE_SIZE = 32
FPS = 60
# 화면은 한 번 만들고, 반복문 안에서 내용을 갱신합니다.
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption('화성 탐사대: 신호 복구')
clock = pygame.time.Clock()

# 같은 그림과 소리는 한 번만 읽고, 위치와 게임 상태는 객체마다 보관합니다.
image_cache = {}
sound_cache = {}


# 그림을 준비하고 같은 요청에는 저장한 그림을 재사용합니다.
def load_image(path, size):
    key = (path, size)
    # 처음 요청한 그림만 읽고 크기를 맞춥니다.
    if key not in image_cache:
        original = pygame.image.load(path).convert_alpha()
        image_cache[key] = pygame.transform.smoothscale(original, size)
    return image_cache[key]


# 번호순 이미지들을 애니메이션 목록으로 준비합니다.
def load_frames(folder, size=(64, 64)):
    return [load_image(f'assets/{folder}/{index}.png', size) for index in range(4)]


# 효과음을 준비하고 재사용합니다.
def load_sound(name):
    if name not in sound_cache:
        sound_cache[name] = pygame.mixer.Sound(f'assets/sounds/{name}.ogg')
    return sound_cache[name]

# 탐사 규칙: 점수·시간·충돌 결과와 진행 상태를 관리합니다.
class Expedition:
    # 객체를 생성할 때 필요한 초기 값과 참조를 준비합니다.
    def __init__(self, explorer, robots, platforms, gates, pulses, crystals):
        self.round_duration = 30
        self.initial_spawn_interval = 5
        self.score = 0
        self.round_number = 1
        self.remaining = self.round_duration
        self.spawn_interval = self.initial_spawn_interval
        self.elapsed = 0.0
        self.spawn_elapsed = 0.0
        self.explorer = explorer
        self.robots = robots
        self.platforms = platforms
        self.gates = gates
        self.pulses = pulses
        self.crystals = crystals
        self.title_font = pygame.font.Font('assets/fonts/DoHyeon-Regular.ttf', 42)
        self.hud_font = pygame.font.Font('assets/fonts/DoHyeon-Regular.ttf', 23)
        self.pickup_sound = load_sound('collect')
        self.lost_sound = load_sound('signal_lost')
        pygame.mixer.music.load('assets/sounds/expedition.ogg')
        self.state = 'playing'
        self.message = ''
        self.hint = ''

    # 그룹에서 호출하는 한 프레임의 처리 순서입니다.
    def update(self, seconds):
        if self.state != 'playing':
            return
        self.check_collisions()
        self.check_game_over()
        if self.state != 'playing':
            return
        self.elapsed += seconds
        self.remaining = max(0, self.round_duration - int(self.elapsed + 1e-9))
        self.check_round_completion()
        if self.state != 'playing':
            return
        self.add_robot(seconds)

    # 현재 값을 읽어 화면과 안내를 그립니다.
    def draw(self):
        pygame.draw.rect(screen, (13, 24, 40), (0, SCREEN_HEIGHT - 58, SCREEN_WIDTH, 58))
        rows = [
            (f'점수 {self.score}', (16, SCREEN_HEIGHT - 56), 'topleft'),
            (f'에너지 {self.explorer.health}', (16, SCREEN_HEIGHT - 29), 'topleft'),
            (f'탐사 {self.round_number}', (SCREEN_WIDTH - 16, SCREEN_HEIGHT - 56), 'topright'),
            (f'신호 복구까지 {self.remaining}초', (SCREEN_WIDTH - 16, SCREEN_HEIGHT - 29), 'topright'),
        ]
        for text, point, anchor in rows:
            surface = self.hud_font.render(text, True, (237, 244, 252))
            rect = surface.get_rect(**{anchor: point})
            screen.blit(surface, rect)
        title = self.title_font.render('화성 탐사대', True, (101, 229, 217))
        screen.blit(title, title.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT - 29)))
        if self.state != 'playing':
            veil = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
            veil.fill((5, 12, 25, 210))
            screen.blit(veil, (0, 0))
            main = self.title_font.render(self.message, True, (116, 237, 223))
            sub = self.hud_font.render(self.hint, True, (242, 243, 248))
            screen.blit(main, main.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 28)))
            screen.blit(sub, sub.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 32)))

    # 생성 간격을 확인해 새 로봇을 추가합니다.
    def add_robot(self, seconds):
        self.spawn_elapsed += seconds
        if self.spawn_elapsed + 1e-9 >= self.spawn_interval:
            self.spawn_elapsed = max(0.0, self.spawn_elapsed - self.spawn_interval)
            self.robots.add(Robot(self.platforms, self.gates, self.round_number, self.round_number + 5))

    # 접촉 대상을 검사하고 이 단계의 충돌 규칙을 적용합니다.
    def check_collisions(self):
        collisions = pygame.sprite.groupcollide(self.pulses, self.robots, True, False)
        for targets in collisions.values():
            for robot in targets:
                if robot.state == 'walking':
                    robot.hit_sound.play()
                    robot.state = 'falling'
                    robot.frame = 0.0
                    robot.down_elapsed = 0.0
        for robot in pygame.sprite.spritecollide(self.explorer, self.robots, False):
            if robot.state != 'walking':
                robot.kick_sound.play()
                robot.kill()
                self.score += 25
                self.crystals.add(Crystal(self.platforms, self.gates))
            elif self.explorer.hurt_remaining <= 0:
                self.explorer.health = max(0, self.explorer.health - 20)
                self.explorer.hit_sound.play()
                self.explorer.hurt_remaining = 1.0
                self.explorer.position.x = (self.explorer.position.x - 128 * robot.direction) % SCREEN_WIDTH
                self.explorer.rect.midbottom = self.explorer.position
                if self.explorer.health <= 0:
                    return
        collected = pygame.sprite.spritecollide(self.explorer, self.crystals, True)
        if collected:
            self.pickup_sound.play()
            self.score += 100 * len(collected)
            self.explorer.health = min(self.explorer.starting_health, self.explorer.health + 10 * len(collected))
        for robot in list(self.robots):
            if robot.state != 'walking':
                continue
            lost = pygame.sprite.spritecollide(robot, self.crystals, True)
            if lost:
                self.lost_sound.play()
                for _ in lost:
                    self.robots.add(Robot(self.platforms, self.gates, self.round_number, self.round_number + 5))

    # 이번 라운드의 완료 조건을 검사합니다.
    def check_round_completion(self):
        if self.remaining <= 0:
            self.pause_game('이번 탐사의 신호를 복구했습니다', 'Enter - 다음 탐사', 'round_clear')

    # 에너지가 소진되었는지 확인합니다.
    def check_game_over(self):
        if self.explorer.health <= 0:
            pygame.mixer.music.stop()
            self.pause_game(f'탐사 종료 - 최종 점수 {self.score}', 'Enter - 새 탐사 시작', 'game_over')

    # 다음 라운드의 객체와 진행 값을 준비합니다.
    def start_new_round(self):
        self.round_number += 1
        self.spawn_interval = max(1, self.initial_spawn_interval - self.round_number + 1)
        self.remaining = self.round_duration
        self.elapsed = 0.0
        self.spawn_elapsed = 0.0
        self.robots.empty()
        self.pulses.empty()
        self.crystals.empty()
        self.explorer.reset()
        self.state = 'playing'
        pygame.mixer.music.unpause()

    # 안내 문구와 대기 상태를 저장합니다.
    def pause_game(self, message, hint, state='paused'):
        self.message, self.hint, self.state = message, hint, state
        pygame.mixer.music.pause()

    # 종료 또는 재시작에 필요한 게임 상태를 처리합니다.
    def reset_game(self):
        self.score = 0
        self.round_number = 1
        self.remaining = self.round_duration
        self.spawn_interval = self.initial_spawn_interval
        self.elapsed = 0.0
        self.spawn_elapsed = 0.0
        self.explorer.health = self.explorer.starting_health
        self.explorer.reset()
        self.robots.empty()
        self.pulses.empty()
        self.crystals.empty()
        self.state = 'playing'
        pygame.mixer.music.play(-1)

# 지형 한 칸: 그림·위치와 소속 그룹을 준비합니다.
class Terrain(pygame.sprite.Sprite):
    # 객체를 생성할 때 필요한 초기 값과 참조를 준비합니다.
    def __init__(self, x, y, tile_kind, all_tiles, platforms=None):
        super().__init__(all_tiles)
        self.image = load_image(f'assets/tiles/{tile_kind}.png', (TILE_SIZE, TILE_SIZE))
        self.rect = self.image.get_rect(topleft=(x, y))
        if platforms is not None:
            platforms.add(self)

# 탐사원: 입력·이동·점프와 상태를 관리합니다.
class Explorer(pygame.sprite.Sprite):
    # 객체를 생성할 때 필요한 초기 값과 참조를 준비합니다.
    def __init__(self, x, y, platforms, gates, pulses):
        super().__init__()
        self.horizontal_acceleration = 2
        self.friction = 0.15
        self.gravity = 0.8
        self.jump_speed = 18
        self.starting_health = 100
        self.frames = {}
        for action in ['run', 'idle', 'jump', 'fire']:
            right = load_frames(f'explorer/{action}')
            self.frames[(action, 1)] = right
            self.frames[(action, -1)] = [pygame.transform.flip(frame, True, False) for frame in right]
        self.facing = 1
        self.action = 'idle'
        self.frame = 0.0
        self.image = self.frames[('idle', 1)][0]
        self.rect = self.image.get_rect(midbottom=(x, y))
        self.platforms, self.gates, self.pulses = platforms, gates, pulses
        self.jump_sound = load_sound('jump')
        self.fire_sound = load_sound('pulse')
        self.portal_sound = load_sound('portal')
        self.hit_sound = load_sound('hurt')
        self.start = Vector(x, y)
        self.position = Vector(x, y)
        self.velocity = Vector(0, 0)
        self.acceleration = Vector(0, self.gravity)
        self.health = self.starting_health
        self.grounded = False
        self.previous_rect = self.rect.copy()
        self.fire_remaining = 0.0
        self.hurt_remaining = 0.0
        self.portal_remaining = 0.0

    # 그룹에서 호출하는 한 프레임의 처리 순서입니다.
    def update(self, seconds=1 / FPS):
        self.fire_remaining = max(0, self.fire_remaining - seconds)
        self.hurt_remaining = max(0, self.hurt_remaining - seconds)
        self.portal_remaining = max(0, self.portal_remaining - seconds)
        self.move(seconds)
        self.check_collisions()
        self.check_animations(seconds)

    # 입력 또는 정해진 속도로 위치를 갱신합니다.
    def move(self, seconds):
        scale = min(seconds * FPS, 3)
        self.previous_rect = self.rect.copy()
        self.acceleration = Vector(0, self.gravity)
        keys = pygame.key.get_pressed()
        if keys[pygame.K_LEFT]:
            self.acceleration.x = -self.horizontal_acceleration
            self.facing = -1
        elif keys[pygame.K_RIGHT]:
            self.acceleration.x = self.horizontal_acceleration
            self.facing = 1
        self.acceleration.x -= self.velocity.x * self.friction
        # 이전 속도로 위치를 계산한 뒤 다음 줄에서 속도를 갱신합니다.
        self.position += self.velocity * scale + 0.5 * self.acceleration * scale * scale
        self.velocity += self.acceleration * scale
        self.velocity.y = min(self.velocity.y, 25)
        self.position.x %= SCREEN_WIDTH
        self.rect.midbottom = self.position

    # 접촉 대상을 검사하고 이 단계의 충돌 규칙을 적용합니다.
    def check_collisions(self):
        self.grounded = False
        # 발의 지지 폭은 일정하게 유지합니다. 팔을 펴도 발판 판정이 넓어지지 않습니다.
        left, right = self.rect.centerx - 12, self.rect.centerx + 12
        for tile in sorted(self.platforms, key=lambda tile: tile.rect.top):
            if right <= tile.rect.left or left >= tile.rect.right:
                continue
            if self.velocity.y >= 0 and self.previous_rect.bottom <= tile.rect.top + 1 <= self.rect.bottom + 1:
                self.position.y = tile.rect.top
                self.velocity.y = 0
                self.rect.midbottom = self.position
                self.grounded = True
                break
            if self.velocity.y < 0 and self.previous_rect.top >= tile.rect.bottom and self.rect.top <= tile.rect.bottom:
                self.rect.top = tile.rect.bottom
                self.position.update(self.rect.midbottom)
                self.velocity.y = 0
                break
        for gate in self.gates:
            if self.portal_remaining <= 0 and self.rect.colliderect(gate.rect):
                target = next((other for other in self.gates if other is not gate and other.channel == gate.channel), None)
                if target is not None:
                    self.position.x = target.rect.centerx + (80 if target.rect.centerx < SCREEN_WIDTH / 2 else -80)
                    self.position.y = target.rect.bottom
                    self.rect.midbottom = self.position
                    self.previous_rect = self.rect.copy()
                    # 도착 즉시 같은 문으로 되돌아가는 연쇄 이동을 막습니다.
                    self.portal_remaining = 0.4
                    self.portal_sound.play()
                    break
        if self.position.y > SCREEN_HEIGHT + 128:
            self.reset()

    # 현재 행동이나 상태에 맞는 그림 묶음을 고릅니다.
    def check_animations(self, seconds):
        if self.fire_remaining > 0:
            action = 'fire'
        elif not self.grounded:
            action = 'jump'
        elif abs(self.acceleration.x + self.velocity.x * self.friction) > 0.1:
            action = 'run'
        else:
            action = 'idle'
        if action != self.action:
            self.frame = 0.0
            self.action = action
        self.animate(self.frames[(action, self.facing)], seconds, 8 if action != 'idle' else 4)

    # 점프가 가능한 상태인지 확인하고 상승 속도를 줍니다.
    def jump(self):
        if self.grounded:
            self.jump_sound.play()
            self.velocity.y = -self.jump_speed
            self.grounded = False

    # 발사 조건을 확인하고 발사체를 생성합니다.
    def fire(self):
        if self.fire_remaining <= 0:
            self.fire_sound.play()
            Pulse(self.rect.centerx, self.rect.centery, self.pulses, self.facing)
            self.fire_remaining = 0.35
            self.frame = 0.0

    # 정해 둔 시작 상태로 이 객체를 복귀시킵니다.
    def reset(self):
        self.position = self.start.copy()
        self.velocity = Vector(0, 0)
        self.acceleration = Vector(0, self.gravity)
        self.rect.midbottom = self.position
        self.previous_rect = self.rect.copy()
        self.grounded = False
        self.fire_remaining = 0.0
        self.hurt_remaining = 0.0
        self.portal_remaining = 0.0
        self.action = 'idle'
        self.frame = 0.0
        self.facing = 1
        self.image = self.frames[('idle', 1)][0]

    # 표시할 애니메이션 프레임을 선택합니다.
    def animate(self, frames, seconds, speed):
        self.frame = (self.frame + seconds * speed) % len(frames)
        self.image = frames[int(self.frame)]

# 펄스 한 발: 방향과 사거리로 이동/제거를 정합니다.
class Pulse(pygame.sprite.Sprite):
    # 객체를 생성할 때 필요한 초기 값과 참조를 준비합니다.
    def __init__(self, x, y, pulses, direction):
        super().__init__(pulses)
        self.speed = 20 * direction
        self.range = 500
        self.image = load_image('assets/pulse.png', (32, 24))
        if direction < 0:
            self.image = pygame.transform.flip(self.image, True, False)
        self.rect = self.image.get_rect(center=(x, y))
        self.x = float(x)
        self.start_x = x

    # 그룹에서 호출하는 한 프레임의 처리 순서입니다.
    def update(self, seconds=1 / FPS):
        self.x += self.speed * min(seconds * FPS, 3)
        self.rect.centerx = round(self.x)
        if abs(self.x - self.start_x) >= self.range:
            self.kill()

# 로봇 한 대: 이동·피격·재부팅 상태를 관리합니다.
class Robot(pygame.sprite.Sprite):
    # 객체를 생성할 때 필요한 초기 값과 참조를 준비합니다.
    def __init__(self, platforms, gates, minimum_speed, maximum_speed):
        super().__init__()
        self.gravity = 3
        self.rise_delay = 2.0
        self.variant = random.choice(['teal', 'amber'])
        self.walk_frames = load_frames(f'robot/{self.variant}/walk')
        self.down_frames = load_frames(f'robot/{self.variant}/down')
        self.rise_frames = list(reversed(self.down_frames))
        self.direction = random.choice([-1, 1])
        if self.direction < 0:
            self.walk_frames = [pygame.transform.flip(frame, True, False) for frame in self.walk_frames]
            self.down_frames = [pygame.transform.flip(frame, True, False) for frame in self.down_frames]
            self.rise_frames = list(reversed(self.down_frames))
        self.frame = 0.0
        self.image = self.walk_frames[0]
        self.rect = self.image.get_rect(midbottom=(random.randint(100, SCREEN_WIDTH - 100), -64))
        self.platforms, self.gates = platforms, gates
        self.hit_sound = load_sound('robot_down')
        self.kick_sound = load_sound('robot_clear')
        self.portal_sound = load_sound('portal')
        self.position = Vector(self.rect.midbottom)
        self.velocity = Vector(self.direction * random.randint(minimum_speed, maximum_speed), 0)
        self.acceleration = Vector(0, self.gravity)
        self.previous_rect = self.rect.copy()
        self.state = 'walking'
        self.down_elapsed = 0.0
        self.portal_remaining = 0.0

    # 그룹에서 호출하는 한 프레임의 처리 순서입니다.
    def update(self, seconds=1 / FPS):
        self.portal_remaining = max(0, self.portal_remaining - seconds)
        self.move(seconds)
        self.check_collisions()
        self.check_animations(seconds)

    # 입력 또는 정해진 속도로 위치를 갱신합니다.
    def move(self, seconds):
        self.previous_rect = self.rect.copy()
        if self.state != 'walking':
            return
        scale = min(seconds * FPS, 3)
        # 이전 속도로 위치를 계산한 뒤 다음 줄에서 속도를 갱신합니다.
        self.position += self.velocity * scale + 0.5 * self.acceleration * scale * scale
        self.velocity += self.acceleration * scale
        self.velocity.y = min(self.velocity.y, 25)
        self.position.x %= SCREEN_WIDTH
        self.rect.midbottom = self.position

    # 접촉 대상을 검사하고 이 단계의 충돌 규칙을 적용합니다.
    def check_collisions(self):
        if self.state != 'walking':
            return
        for tile in sorted(self.platforms, key=lambda tile: tile.rect.top):
            if self.rect.centerx + 12 <= tile.rect.left or self.rect.centerx - 12 >= tile.rect.right:
                continue
            if self.previous_rect.bottom <= tile.rect.top + 1 <= self.rect.bottom + 1:
                self.position.y = tile.rect.top
                self.velocity.y = 0
                self.rect.midbottom = self.position
                break
        for gate in self.gates:
            if self.portal_remaining <= 0 and self.rect.colliderect(gate.rect):
                target = next((other for other in self.gates if other is not gate and other.channel == gate.channel), None)
                if target is not None:
                    self.position.update(target.rect.centerx + (80 if target.rect.centerx < SCREEN_WIDTH / 2 else -80), target.rect.bottom)
                    self.rect.midbottom = self.position
                    # 도착 즉시 같은 문으로 되돌아가는 연쇄 이동을 막습니다.
                    self.portal_remaining = 0.4
                    self.portal_sound.play()
                    break
        if self.position.y > SCREEN_HEIGHT + 128:
            self.position.update(SCREEN_WIDTH / 2, -64)
            self.rect.midbottom = self.position
            self.velocity.y = 0

    # 현재 행동이나 상태에 맞는 그림 묶음을 고릅니다.
    def check_animations(self, seconds):
        if self.state == 'walking':
            self.animate(self.walk_frames, seconds, 8, True)
        elif self.state == 'falling':
            if self.animate(self.down_frames, seconds, 6, False):
                self.state = 'down'
                self.down_elapsed = 0.0
        elif self.state == 'down':
            self.down_elapsed += seconds
            if self.down_elapsed >= self.rise_delay:
                self.state = 'rising'
                self.frame = 0.0
        elif self.state == 'rising':
            if self.animate(self.rise_frames, seconds, 6, False):
                self.state = 'walking'
                self.frame = 0.0

    # 표시할 애니메이션 프레임을 선택합니다.
    def animate(self, frames, seconds, speed, loop):
        self.frame += seconds * speed
        finished = self.frame >= len(frames)
        self.frame = self.frame % len(frames) if loop else min(self.frame, len(frames) - 1e-6)
        self.image = frames[int(self.frame)]
        return finished

# 신호 장치: 제자리에서 회전하는 표시물입니다.
class SignalSource(pygame.sprite.Sprite):
    # 객체를 생성할 때 필요한 초기 값과 참조를 준비합니다.
    def __init__(self, x, y, all_tiles):
        super().__init__(all_tiles)
        self.frames = load_frames('crystal', (64, 64))
        self.frame = 0.0
        self.image = self.frames[0]
        self.rect = self.image.get_rect(midbottom=(x, y))

    # 그룹에서 호출하는 한 프레임의 처리 순서입니다.
    def update(self, seconds=1 / FPS):
        self.animate(seconds)

    # 표시할 애니메이션 프레임을 선택합니다.
    def animate(self, seconds):
        self.frame = (self.frame + seconds * 6) % len(self.frames)
        self.image = self.frames[int(self.frame)]

# 신호 결정: 떨어져 이동하는 회수 대상입니다.
class Crystal(pygame.sprite.Sprite):
    # 객체를 생성할 때 필요한 초기 값과 참조를 준비합니다.
    def __init__(self, platforms, gates):
        super().__init__()
        self.gravity = 3
        self.frames = load_frames('crystal', (32, 32))
        self.frame = 0.0
        self.image = self.frames[0]
        self.rect = self.image.get_rect(midbottom=(SCREEN_WIDTH // 2, 100))
        self.platforms, self.gates = platforms, gates
        self.position = Vector(self.rect.midbottom)
        self.velocity = Vector(random.choice([-5, 5]), 0)
        self.acceleration = Vector(0, self.gravity)
        self.previous_rect = self.rect.copy()
        self.portal_sound = load_sound('portal')
        self.portal_remaining = 0.0

    # 그룹에서 호출하는 한 프레임의 처리 순서입니다.
    def update(self, seconds=1 / FPS):
        self.portal_remaining = max(0, self.portal_remaining - seconds)
        self.animate(seconds)
        self.move(seconds)
        self.check_collisions()

    # 입력 또는 정해진 속도로 위치를 갱신합니다.
    def move(self, seconds):
        self.previous_rect = self.rect.copy()
        scale = min(seconds * FPS, 3)
        # 이전 속도로 위치를 계산한 뒤 다음 줄에서 속도를 갱신합니다.
        self.position += self.velocity * scale + 0.5 * self.acceleration * scale * scale
        self.velocity += self.acceleration * scale
        self.velocity.y = min(self.velocity.y, 25)
        self.position.x %= SCREEN_WIDTH
        self.rect.midbottom = self.position

    # 접촉 대상을 검사하고 이 단계의 충돌 규칙을 적용합니다.
    def check_collisions(self):
        for tile in sorted(self.platforms, key=lambda tile: tile.rect.top):
            if self.rect.right <= tile.rect.left or self.rect.left >= tile.rect.right:
                continue
            if self.previous_rect.bottom <= tile.rect.top + 1 <= self.rect.bottom + 1:
                self.position.y = tile.rect.top
                self.velocity.y = 0
                self.rect.midbottom = self.position
                break
        for gate in self.gates:
            if self.portal_remaining <= 0 and self.rect.colliderect(gate.rect):
                target = next((other for other in self.gates if other is not gate and other.channel == gate.channel), None)
                if target is not None:
                    self.position.update(target.rect.centerx + (80 if target.rect.centerx < SCREEN_WIDTH / 2 else -80), target.rect.bottom)
                    self.rect.midbottom = self.position
                    # 도착 즉시 같은 문으로 되돌아가는 연쇄 이동을 막습니다.
                    self.portal_remaining = 0.4
                    self.portal_sound.play()
                    break

    # 표시할 애니메이션 프레임을 선택합니다.
    def animate(self, seconds):
        self.frame = (self.frame + seconds * 6) % len(self.frames)
        self.image = self.frames[int(self.frame)]

# 이동문: 색 채널과 위치·애니메이션을 보관합니다.
class Gate(pygame.sprite.Sprite):
    # 객체를 생성할 때 필요한 초기 값과 참조를 준비합니다.
    def __init__(self, x, y, channel, gates):
        super().__init__(gates)
        self.channel = channel
        self.frames = load_frames(f'gate/{channel}', (72, 72))
        self.frame = float(random.randrange(len(self.frames)))
        self.image = self.frames[int(self.frame)]
        self.rect = self.image.get_rect(midbottom=(x, y))

    # 그룹에서 호출하는 한 프레임의 처리 순서입니다.
    def update(self, seconds=1 / FPS):
        self.animate(seconds)

    # 표시할 애니메이션 프레임을 선택합니다.
    def animate(self, seconds):
        self.frame = (self.frame + seconds * 6) % len(self.frames)
        self.image = self.frames[int(self.frame)]

# 화면에 그릴 지형 전체입니다.
all_tiles = pygame.sprite.Group()
# 착지 검사에 사용할 발판만 담습니다.
platforms = pygame.sprite.Group()
# 탐사원을 갱신하고 그릴 그룹입니다.
explorers = pygame.sprite.Group()
# 화면에 남아 있는 펄스들을 담습니다.
pulses = pygame.sprite.Group()
# 현재 로봇을 갱신하고 충돌 검사할 그룹입니다.
robots = pygame.sprite.Group()
# 서로 연결할 이동문들을 담습니다.
gates = pygame.sprite.Group()
# 아직 회수되지 않은 신호 결정들을 담습니다.
crystals = pygame.sprite.Group()

# 0 빈칸 / 1 흙 / 2-5 발판 / 6 신호원 / 7-8 게이트 / 9 탐사원
# 각 행을 따로 만들어 칸 변경이 다른 행에 번지지 않게 합니다.
level_map = [[0 for column in range(40)] for row in range(23)]
for row, spans in [(3, [(0, 15), (25, 40)]), (8, [(11, 29)]),
                   (10, [(0, 6), (34, 40)]), (15, [(0, 16), (24, 40)]), (18, [(18, 22)])]:
    for start, end in spans:
        level_map[row][start:end] = [3] + [4] * (end - start - 2) + [5]
level_map[21] = [2] * 40
level_map[22] = [1] * 40
level_map[3][20] = 6
level_map[2][1], level_map[2][38] = 7, 8
level_map[20][1], level_map[20][38] = 8, 7
level_map[17][20] = 9

# 행 번호와 그 행의 칸 목록을 하나씩 꺼냅니다.
for row, cells in enumerate(level_map):
    for column, kind in enumerate(cells):
        x, y = column * TILE_SIZE, row * TILE_SIZE
        if kind == 1:
            Terrain(x, y, kind, all_tiles)
        elif 2 <= kind <= 5:
            Terrain(x, y, kind, all_tiles, platforms)
        elif kind == 6:
            SignalSource(x, y, all_tiles)
        elif kind in (7, 8):
            Gate(x + TILE_SIZE // 2, y + TILE_SIZE, 'teal' if kind == 7 else 'violet', gates)
        elif kind == 9:
            explorer = Explorer(x, y + TILE_SIZE, platforms, gates, pulses)
            explorers.add(explorer)

background = load_image('assets/background.png', (SCREEN_WIDTH, SCREEN_HEIGHT))
mission = Expedition(explorer, robots, platforms, gates, pulses, crystals)
mission.pause_game('화성 탐사대: 신호 복구', 'Enter - 시작 / 방향키 - 이동 / Space - 점프 / 위쪽키 - 펄스', 'title')

running = True
# 입력과 상태 변화, 그리기를 매 프레임 반복합니다.
while running:
    seconds = min(clock.tick(FPS) / 1000, 0.05)
    # 지난 프레임 이후 쌓인 입력 이벤트를 처리합니다.
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.KEYDOWN:
            if event.key == pygame.K_RETURN:
                if mission.state == 'title':
                    mission.state = 'playing'
                    pygame.mixer.music.play(-1)
                elif mission.state == 'round_clear':
                    mission.start_new_round()
                elif mission.state == 'game_over':
                    mission.reset_game()
                elif mission.state == 'playing':
                    robots.add(Robot(platforms, gates, 2, 7))
            elif mission.state == 'playing':
                if event.key == pygame.K_SPACE:
                    explorer.jump()
                elif event.key == pygame.K_UP:
                    explorer.fire()
    if not running:
        break
    if mission.state == 'playing':
        all_tiles.update(seconds)
        gates.update(seconds)
        explorers.update(seconds)
        pulses.update(seconds)
        robots.update(seconds)
        crystals.update(seconds)
        mission.update(seconds)
    screen.blit(background, (0, 0))
    all_tiles.draw(screen)
    gates.draw(screen)
    explorers.draw(screen)
    pulses.draw(screen)
    robots.draw(screen)
    crystals.draw(screen)
    mission.draw()
    pygame.display.update()

pygame.quit()
