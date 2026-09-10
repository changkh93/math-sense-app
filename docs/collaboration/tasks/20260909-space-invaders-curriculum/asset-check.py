import pygame

pygame.init()
screen = pygame.display.set_mode((1200, 700))
clock = pygame.time.Clock()
font = pygame.font.Font('assets/DoHyeon-Regular.ttf', 38)
ship = pygame.transform.smoothscale(pygame.image.load('assets/scout.png').convert_alpha(), (160, 160))
enemy = pygame.transform.smoothscale(pygame.image.load('assets/raider.png').convert_alpha(), (160, 160))
names = ['scout_pulse', 'raider_pulse', 'raider_break', 'shield_hit', 'line_alert', 'wave_ready']
sounds = [pygame.mixer.Sound('assets/' + name + '.ogg') for name in names]
print('에셋 확인: 이미지 2개, 한글 폰트, 효과음 6개 로딩 완료')
print('효과음 길이:', [round(sound.get_length(), 2) for sound in sounds])
running = True
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        if event.type == pygame.KEYDOWN and pygame.K_1 <= event.key <= pygame.K_6:
            index = event.key - pygame.K_1
            sounds[index].play()
            print('효과음 재생:', names[index])
    screen.fill((9, 17, 37))
    screen.blit(font.render('우주 방어대 - 한글 표시 확인', True, (210, 247, 255)), (70, 65))
    screen.blit(font.render('점수 1200   라운드 3   남은 기체 5', True, (255, 217, 156)), (70, 135))
    screen.blit(ship, (160, 260))
    screen.blit(enemy, (480, 260))
    screen.blit(font.render('화면을 누른 뒤 숫자 1~6: 효과음 확인', True, (200, 210, 236)), (70, 520))
    pygame.display.update()
    clock.tick(60)
pygame.quit()
