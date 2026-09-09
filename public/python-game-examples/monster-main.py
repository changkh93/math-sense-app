import asyncio
import pygame
import random

pygame.init()

WINDOW_WIDTH = 1200
WINDOW_HEIGHT = 700

window_surface = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
pygame.display.set_caption("몬스터 잡기 게임")

FPS = 60
clock = pygame.time.Clock()

class Game():
    def __init__(self, player, monster_group):
        self.score = 0
        self.round_number = 0
        self.round_time = 0
        self.frame_count = 0
        self.player = player
        self.monster_group = monster_group

        #사운드 설정
        self.next_level_sound = pygame.mixer.Sound("level_up.ogg")

        # wanted monster 생성을 위한 이미지 세팅
        blue_monster = pygame.image.load("blue_monster.png")
        green_monster = pygame.image.load("green_monster.png")
        orange_monster = pygame.image.load("orange_monster.png")
        purple_monster = pygame.image.load("purple_monster.png")

        self.monster_images = [blue_monster, green_monster, orange_monster, purple_monster]

        self.wanted_monster_type = random.randint(0, 3)
        self.wanted_monster_image = self.monster_images[self.wanted_monster_type]
        self.wanted_monster_rect = self.wanted_monster_image.get_rect()
        self.wanted_monster_rect.centerx = WINDOW_WIDTH/2
        self.wanted_monster_rect.top = 35


        # 폰트 설정
        self.font = pygame.font.Font(None, 24)


    async def update(self):
        self.frame_count += 1
        if self.frame_count == 60:
            self.round_time += 1
            self.frame_count = 0
        await self.check_collision()


    def draw(self):
        WHITE = (255, 255, 255)
        BLUE = (0, 0, 255)
        GREEN = (0, 255, 0)
        ORAGNE = (255, 128, 0)
        PURPLE = (102, 0, 204)

        colors = [BLUE, GREEN, ORAGNE, PURPLE]

        score_text = self.font.render(f"Score: {self.score}", True, WHITE)
        score_rect = score_text.get_rect()
        score_rect.topleft = (10, 10)

        round_text = self.font.render(f"Round: {self.round_number}", True, WHITE)
        round_rect = round_text.get_rect()
        round_rect.topleft = (10, 40)

        lives_text = self.font.render(f"Lives: {self.player.lives}", True, WHITE)
        lives_rect = lives_text.get_rect()
        lives_rect.topleft = (10, 70)

        wanted_text = self.font.render("Wanted Monster", True, WHITE)
        wanted_rect = wanted_text.get_rect()
        wanted_rect.centerx = WINDOW_WIDTH/2
        wanted_rect.top = 10

        round_time_text = self.font.render(f"Round Time: {self.round_time}", True, WHITE)
        round_time_rect = round_time_text.get_rect()
        round_time_rect.topright = (WINDOW_WIDTH - 10, 10)

        safe_zone_text = self.font.render(f"Safe Zone: {self.player.safe}", True, WHITE)
        safe_zone_rect = safe_zone_text.get_rect()
        safe_zone_rect.topright = (WINDOW_WIDTH - 10, 40)


        window_surface.blit(score_text, score_rect)
        window_surface.blit(round_text, round_rect)
        window_surface.blit(lives_text, lives_rect)
        window_surface.blit(wanted_text, wanted_rect)
        window_surface.blit(round_time_text, round_time_rect)
        window_surface.blit(safe_zone_text, safe_zone_rect)

        window_surface.blit(self.wanted_monster_image, self.wanted_monster_rect)

        pygame.draw.rect(surface=window_surface, color=colors[self.wanted_monster_type], rect=self.wanted_monster_rect, width=2)
        pygame.draw.rect(surface=window_surface, color=colors[self.wanted_monster_type], rect=(0, 100, WINDOW_WIDTH, WINDOW_HEIGHT - 200), width=4)



    async def check_collision(self):
        collided_monster = pygame.sprite.spritecollideany(self.player, self.monster_group)
        if collided_monster:
            if collided_monster.type == self.wanted_monster_type:
                self.score += 100
                self.monster_group.remove(collided_monster)
                if self.monster_group:
                    self.player.catch_sound.play()
                    self.choose_new_wanted()
                else:
                    self.player.reset()
                    self.start_new_round()
            else:
                self.player.die_sound.play()
                self.player.lives -= 1
                if self.player.lives <= 0:
                    await self.pause_game("Final Score: " + str(self.score), "Press 'Enter' to play again")
                else:
                    self.player.reset()


    def choose_new_wanted(self):
        new_wanted_monster = random.choice(list(self.monster_group))
        self.wanted_monster_type = new_wanted_monster.type
        self.wanted_monster_image = new_wanted_monster.image


    def start_new_round(self):
        self.round_number += 1
        self.round_time = 0
        self.frame_count = 0

        self.next_level_sound.play()

        for monster in self.monster_group:
            self.monster_group.remove(monster)

        for i in range(self.round_number):
            self.monster_group.add(Monster(random.randint(0, WINDOW_WIDTH - 64), random.randint(100, WINDOW_HEIGHT - 164), self.monster_images[0], 0))
            self.monster_group.add(Monster(random.randint(0, WINDOW_WIDTH - 64), random.randint(100, WINDOW_HEIGHT - 164), self.monster_images[1], 1))
            self.monster_group.add(Monster(random.randint(0, WINDOW_WIDTH - 64), random.randint(100, WINDOW_HEIGHT - 164), self.monster_images[2], 2))
            self.monster_group.add(Monster(random.randint(0, WINDOW_WIDTH - 64), random.randint(100, WINDOW_HEIGHT - 164), self.monster_images[3], 3))


    async def pause_game(self, main_text, sub_text):
        global running
        WHITE = (255, 255, 255)

        main_text = self.font.render(main_text, True, WHITE)
        main_rect = main_text.get_rect()
        main_rect.center = (WINDOW_WIDTH/2, WINDOW_HEIGHT/2)

        sub_text = self.font.render(sub_text, True, WHITE)
        sub_rect = sub_text.get_rect()
        sub_rect.center = (WINDOW_WIDTH/2, WINDOW_HEIGHT/2 + 40)

        window_surface.fill((0, 0, 0))
        window_surface.blit(main_text, main_rect)
        window_surface.blit(sub_text, sub_rect)
        pygame.display.update()

        is_paused = True
        while is_paused:
            await asyncio.sleep(0)
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    is_paused = False
                    running = False

                elif event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_RETURN:
                        is_paused = False
                        self.reset_game()


    def reset_game(self):
        self.score = 0
        self.round_number = 0

        self.player.lives = 5
        self.player.safe = 3
        self.player.reset()

        self.start_new_round()


class Player(pygame.sprite.Sprite):
    def __init__(self):
        super().__init__()
        self.image = pygame.image.load("knight.png")
        self.rect = self.image.get_rect()
        self.rect.centerx = WINDOW_WIDTH/2
        self.rect.bottom = WINDOW_HEIGHT

        self.velocity = 8
        self.lives = 5
        self.safe = 3

        #사운드 설정
        self.catch_sound = pygame.mixer.Sound("success.ogg")
        self.die_sound = pygame.mixer.Sound("die.ogg")
        self.safe_zone_sound = pygame.mixer.Sound("safe_zone.ogg")


    def update(self):
        keys = pygame.key.get_pressed()
        if keys[pygame.K_LEFT] and self.rect.left > 0:
            self.rect.x -= self.velocity
        elif keys[pygame.K_RIGHT] and self.rect.right < WINDOW_WIDTH:
            self.rect.x += self.velocity
        elif keys[pygame.K_UP] and self.rect.top > 100:
            self.rect.y -= self.velocity
        elif keys[pygame.K_DOWN] and self.rect.bottom < WINDOW_HEIGHT - 100:
            self.rect.y += self.velocity

    def reset(self):
        self.rect.centerx = WINDOW_WIDTH/2
        self.rect.bottom = WINDOW_HEIGHT

    def safe_zone(self):
        if self.safe > 0:
            self.safe -= 1
            self.safe_zone_sound.play()
            self.rect.bottom = WINDOW_HEIGHT


class Monster(pygame.sprite.Sprite):
    def __init__(self, x, y, image, monster_type):
        super().__init__()
        self.image = image
        self.rect = self.image.get_rect()
        self.rect.topleft = (x, y)
        self.velocity = random.randint(1, 5)
        self.type = monster_type

        self.dx = random.choice([-1, 1])
        self.dy = random.choice([-1, 1])

    def update(self):
        self.rect.x += self.velocity * self.dx
        self.rect.y += self.velocity * self.dy
        if self.rect.left <= 0 or self.rect.right >= WINDOW_WIDTH:
            self.dx = -self.dx
        elif self.rect.top <= 100 or self.rect.bottom >= WINDOW_HEIGHT - 105:
            self.dy = -self.dy

async def main():
    global running, my_player_group, my_player, my_monster_group, my_game
    my_player_group = pygame.sprite.Group()
    my_player = Player()
    my_player_group.add(my_player)
    
    my_monster_group = pygame.sprite.Group()
    
    running = True
    my_game = Game(my_player, my_monster_group)
    await my_game.pause_game("Monster Collecting", "Press 'Enter' to begin")
    # my_game.start_new_round()
    
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
    
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_SPACE:
                    my_player.safe_zone()
    
        window_surface.fill((0, 0, 0))
        my_player_group.update()
        my_player_group.draw(window_surface)
    
        my_monster_group.update()
        my_monster_group.draw(window_surface)
    
        await my_game.update()
        my_game.draw()
    
        pygame.display.update()
        clock.tick(FPS)
        await asyncio.sleep(0)
    
    pygame.quit()

asyncio.run(main())
