import pygame

pygame.init()
Vector = pygame.math.Vector2
SCREEN_WIDTH, SCREEN_HEIGHT = 960, 640
TILE_SIZE = 32
FPS = 60
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption('화성 탐사대 - 기초 실험')
clock = pygame.time.Clock()
image_cache = {}


def load_image(path, size):
    key = (path, size)
    if key not in image_cache:
        image_cache[key] = pygame.transform.smoothscale(pygame.image.load(path).convert_alpha(), size)
    return image_cache[key]


class Terrain(pygame.sprite.Sprite):
    def __init__(self, x, y, kind, tiles, subgroup=None):
        super().__init__(tiles)
        self.image = load_image(f'assets/tiles/{kind}.png', (TILE_SIZE, TILE_SIZE))
        self.rect = self.image.get_rect(topleft=(x, y))
        self.mask = pygame.mask.from_surface(self.image)
        if subgroup is not None:
            subgroup.add(self)


class Explorer(pygame.sprite.Sprite):
    def __init__(self, x, y, platforms, hazards):
        super().__init__()
        self.frames = {}
        for action in ['run', 'idle']:
            right = [load_image(f'assets/explorer/{action}/{index}.png', (64, 64)) for index in range(4)]
            self.frames[(action, 1)] = right
            self.frames[(action, -1)] = [pygame.transform.flip(frame, True, False) for frame in right]
        self.facing = 1
        self.action = 'idle'
        self.frame = 0.0
        self.image = self.frames[('idle', 1)][0]
        self.rect = self.image.get_rect(midbottom=(x, y))
        self.mask = pygame.mask.from_surface(self.image)
        self.start = Vector(x, y)
        self.position = Vector(x, y)
        self.velocity = Vector(0, 0)
        self.acceleration = Vector(0, 0)
        self.horizontal_acceleration = 2
        self.friction = 0.15
        self.gravity = 0.5
        self.jump_speed = 15
        self.platforms = platforms
        self.hazards = hazards
        self.previous_rect = self.rect.copy()
        self.grounded = False

    def update(self, seconds=1 / FPS):
        self.move(seconds)
        self.check_collisions()
        action = 'run' if pygame.key.get_pressed()[pygame.K_LEFT] or pygame.key.get_pressed()[pygame.K_RIGHT] else 'idle'
        if action != self.action:
            self.action = action
            self.frame = 0.0
        self.animate(self.frames[(action, self.facing)], seconds, 8 if action == 'run' else 4)

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
        self.position += self.velocity * scale + 0.5 * self.acceleration * scale * scale
        self.velocity += self.acceleration * scale
        self.velocity.y = min(25, self.velocity.y)
        self.position.x %= SCREEN_WIDTH
        self.rect.midbottom = self.position

    def check_collisions(self):
        self.grounded = False
        for tile in sorted(self.platforms, key=lambda tile: tile.rect.top):
            if self.rect.centerx + 12 <= tile.rect.left or self.rect.centerx - 12 >= tile.rect.right:
                continue
            if self.velocity.y >= 0 and self.previous_rect.bottom <= tile.rect.top + 1 <= self.rect.bottom + 1:
                self.position.y = tile.rect.top
                self.velocity.y = 0
                self.rect.midbottom = self.position
                self.grounded = True
                break
        if pygame.sprite.spritecollide(self, self.hazards, False, pygame.sprite.collide_mask):
            self.position = self.start.copy()
            self.velocity = Vector(0, 0)
            self.rect.midbottom = self.position
            self.grounded = False

    def jump(self):
        if self.grounded:
            self.velocity.y = -self.jump_speed
            self.grounded = False

    def animate(self, frames, seconds, speed):
        self.frame = (self.frame + seconds * speed) % len(frames)
        self.image = frames[int(self.frame)]
        self.mask = pygame.mask.from_surface(self.image)


tiles = pygame.sprite.Group()
platforms = pygame.sprite.Group()
hazards = pygame.sprite.Group()
explorers = pygame.sprite.Group()
level_map = [[0 for column in range(30)] for row in range(20)]
level_map[19] = [1] * 30
level_map[18] = [2] * 10 + [6] * 10 + [2] * 10
level_map[14][4:12] = [3] + [4] * 6 + [5]
level_map[10][14:22] = [3] + [4] * 6 + [5]
level_map[6][5:13] = [3] + [4] * 6 + [5]
level_map[5][8] = 9

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
show_debug = True

running = True
while running:
    seconds = min(clock.tick(FPS) / 1000, 0.05)
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.KEYDOWN:
            if event.key == pygame.K_SPACE:
                explorer.jump()
            elif event.key == pygame.K_d:
                show_debug = not show_debug
    if not running:
        break
    explorers.update(seconds)
    screen.blit(background, (0, 0))
    tiles.draw(screen)
    explorers.draw(screen)
    if show_debug:
        for tile in platforms:
            pygame.draw.rect(screen, (70, 165, 255), tile.rect, 1)
        pygame.draw.rect(screen, (255, 210, 100), explorer.rect, 1)
        outline = explorer.mask.outline()
        if len(outline) > 1:
            points = [(x + explorer.rect.x, y + explorer.rect.y) for x, y in outline]
            pygame.draw.lines(screen, (90, 255, 130), True, points, 1)
    pygame.display.update()

pygame.quit()
