# 게임 화면·입력·소리를 다루는 도구를 불러옵니다.
import pygame

# 화면과 소리 모듈을 사용하기 전에 초기화합니다.
pygame.init()
# 화면은 한 번 만들고, 반복문 안에서 내용을 갱신합니다.
screen = pygame.display.set_mode((640, 360))
clock = pygame.time.Clock()
font = pygame.font.Font('assets/fonts/DoHyeon-Regular.ttf', 32)
explorer_image = pygame.image.load('assets/explorer/idle/0.png').convert_alpha()
sample_sound = pygame.mixer.Sound('assets/sounds/collect.ogg')

running = True
# 입력과 상태 변화, 그리기를 매 프레임 반복합니다.
while running:
    clock.tick(60)
    # 지난 프레임 이후 쌓인 입력 이벤트를 처리합니다.
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE:
            sample_sound.play()
    if not running:
        break
    screen.fill((15, 25, 42))
    screen.blit(explorer_image, (288, 120))
    screen.blit(font.render('화성 탐사대 준비 완료', True, (110, 235, 215)), (160, 220))
    pygame.display.update()

pygame.quit()
