# 게임 화면·입력·소리를 다루는 도구를 불러옵니다.
import pygame

# 화면과 소리 모듈을 사용하기 전에 초기화합니다.
pygame.init()
SCREEN_WIDTH, SCREEN_HEIGHT = 960, 640
TILE_SIZE = 32
FPS = 60
# 화면은 한 번 만들고, 반복문 안에서 내용을 갱신합니다.
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption('화성 탐사대 - 기초 실험')
clock = pygame.time.Clock()

# 각 행을 따로 만들어 칸 변경이 다른 행에 번지지 않게 합니다.
level_map = [[0 for column in range(30)] for row in range(20)]
level_map[19] = [1] * 30
level_map[18] = [2] * 10 + [6] * 10 + [2] * 10
level_map[14][4:12] = [3] + [4] * 6 + [5]
level_map[10][14:22] = [3] + [4] * 6 + [5]
level_map[6][5:13] = [3] + [4] * 6 + [5]

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
    screen.fill((15, 25, 42))
    pygame.display.update()

pygame.quit()
