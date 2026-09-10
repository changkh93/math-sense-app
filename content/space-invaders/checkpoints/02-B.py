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

running = True
# 입력과 상태 변화, 그리기를 매 프레임 반복합니다.
while running:
    # 지난 프레임 이후 쌓인 입력 이벤트를 처리합니다.
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    if not running:
        break

    screen.fill((15, 45, 65))
    pygame.display.update()
    clock.tick(FPS)

pygame.quit()
