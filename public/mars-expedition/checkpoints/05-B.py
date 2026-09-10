# 게임 화면·입력·소리를 다루는 도구를 불러옵니다.
import pygame

# 화면과 소리 모듈을 사용하기 전에 초기화합니다.
pygame.init()
Vector = pygame.math.Vector2
SCREEN_WIDTH, SCREEN_HEIGHT = 960, 640
TILE_SIZE = 32
FPS = 60
# 화면은 한 번 만들고, 반복문 안에서 내용을 갱신합니다.
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption('화성 탐사대 - 기초 실험')
clock = pygame.time.Clock()

image_cache = {}


# 그림을 준비하고 같은 요청에는 저장한 그림을 재사용합니다.
def load_image(path, size):
    key = (path, size)
    # 처음 요청한 그림만 읽고 크기를 맞춥니다.
    if key not in image_cache:
        image_cache[key] = pygame.transform.smoothscale(pygame.image.load(path).convert_alpha(), size)
    return image_cache[key]

# 지형 한 칸: 그림·위치와 소속 그룹을 준비합니다.
class Terrain(pygame.sprite.Sprite):
    # 객체를 생성할 때 필요한 초기 값과 참조를 준비합니다.
    def __init__(self, x, y, kind, tiles, subgroup=None):
        super().__init__(tiles)
        self.image = load_image(f'assets/tiles/{kind}.png', (TILE_SIZE, TILE_SIZE))
        self.rect = self.image.get_rect(topleft=(x, y))
        if subgroup is not None:
            subgroup.add(self)

# 탐사원: 입력·이동·점프와 상태를 관리합니다.
class Explorer(pygame.sprite.Sprite):
    # 객체를 생성할 때 필요한 초기 값과 참조를 준비합니다.
    def __init__(self, x, y, platforms, hazards):
        super().__init__()
        self.image = load_image('assets/explorer/idle/0.png', (64, 64))
        self.rect = self.image.get_rect(midbottom=(x, y))
        self.position = Vector(x, y)
        self.velocity = Vector(0, 0)
        self.acceleration = Vector(0, 0)
        self.horizontal_acceleration = 2
        self.friction = 0.15
        self.gravity = 0.5
        self.platforms = platforms
        self.hazards = hazards
        self.start = Vector(x, y)
        self.previous_rect = self.rect.copy()
        self.grounded = False

    # 그룹에서 호출하는 한 프레임의 처리 순서입니다.
    def update(self, seconds=1 / FPS):
        self.previous_rect = self.rect.copy()
        self.acceleration = Vector(0, self.gravity)
        keys = pygame.key.get_pressed()
        if keys[pygame.K_LEFT]:
            self.acceleration.x = -self.horizontal_acceleration
        elif keys[pygame.K_RIGHT]:
            self.acceleration.x = self.horizontal_acceleration
        self.acceleration.x -= self.velocity.x * self.friction
        scale = min(seconds * FPS, 3)
        # 이전 속도로 위치를 계산한 뒤 다음 줄에서 속도를 갱신합니다.
        self.position += self.velocity * scale + 0.5 * self.acceleration * scale * scale
        self.velocity += self.acceleration * scale
        self.rect.midbottom = self.position
        self.grounded = False
        for tile in sorted(self.platforms, key=lambda tile: tile.rect.top):
            if self.rect.right <= tile.rect.left or self.rect.left >= tile.rect.right:
                continue
            if self.previous_rect.bottom <= tile.rect.top + 1 <= self.rect.bottom + 1:
                self.position.y = tile.rect.top
                self.velocity.y = 0
                self.rect.midbottom = self.position
                self.grounded = True
                break
        if pygame.sprite.spritecollide(self, self.hazards, False):
            print('지열 위험 구역에 닿았습니다')

# 화면에 그릴 타일 전체입니다.
tiles = pygame.sprite.Group()
# 착지 검사에 사용할 발판만 담습니다.
platforms = pygame.sprite.Group()
# 위험 접촉을 검사할 타일만 담습니다.
hazards = pygame.sprite.Group()
# 탐사원을 갱신하고 그릴 그룹입니다.
explorers = pygame.sprite.Group()
# 각 행을 따로 만들어 칸 변경이 다른 행에 번지지 않게 합니다.
level_map = [[0 for column in range(30)] for row in range(20)]
level_map[19] = [1] * 30
level_map[18] = [2] * 10 + [6] * 10 + [2] * 10
level_map[14][4:12] = [3] + [4] * 6 + [5]
level_map[10][14:22] = [3] + [4] * 6 + [5]
level_map[6][5:13] = [3] + [4] * 6 + [5]
level_map[5][8] = 9

# 행 번호와 그 행의 칸 목록을 하나씩 꺼냅니다.
for row, cells in enumerate(level_map):
    for column, kind in enumerate(cells):
        x, y = column * TILE_SIZE, row * TILE_SIZE
        if kind == 1:
            Terrain(x, y, kind, tiles)
        elif 2 <= kind <= 5:
            Terrain(x, y, kind, tiles, platforms)
        elif kind == 6:
            Terrain(x, y, kind, tiles, hazards)
        elif kind == 9:
            explorer = Explorer(x, y + TILE_SIZE, platforms, hazards)
            explorers.add(explorer)

background = load_image('assets/background.png', (SCREEN_WIDTH, SCREEN_HEIGHT))

running = True
# 입력과 상태 변화, 그리기를 매 프레임 반복합니다.
while running:
    seconds = min(clock.tick(FPS) / 1000, 0.05)
    # 지난 프레임 이후 쌓인 입력 이벤트를 처리합니다.
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
    if not running:
        break
    explorers.update(seconds)
    screen.blit(background, (0, 0))
    tiles.draw(screen)
    explorers.draw(screen)
    pygame.display.update()

pygame.quit()
