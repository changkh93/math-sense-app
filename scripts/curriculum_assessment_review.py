"""Reviewed exercise contexts and exact stage excerpts; keep IDs and scoring stable."""
import ast
import json
import textwrap
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def clean(code):
    return '\n'.join(line for line in code.splitlines() if not line.lstrip().startswith('#')).strip('\n')

def method(course,sid,target):
    code=(ROOT/'content'/course/'checkpoints'/f'{sid}.py').read_text()
    tree=ast.parse(code);cls,fn=target.split('.')
    node=next(n for c in tree.body if isinstance(c,ast.ClassDef) and c.name==cls for n in c.body if isinstance(n,ast.FunctionDef) and n.name==fn)
    lines=code.splitlines()
    return textwrap.dedent(clean('\n'.join(lines[node.body[0].lineno-1:node.end_lineno])))

def review_bank(course,bank):
    def set_trace(unit,index,title,scope,code,reason):
        ex=bank['units'][unit-1]['exercises'][index-1]
        ex.update(title=title,prompt=scope+' '+reason,answerLines=clean(textwrap.dedent(code)).splitlines(),hints=[reason,'설명용 주석은 입력하지 않습니다. 표시된 실행 코드와 들여쓰기를 기준으로 연습하세요.'])
    if course=='space-invaders':
        base=ROOT/'content'/course/'checkpoints'
        lines=(base/'01-A.py').read_text().splitlines()
        set_trace(1,2,'수업 준비 문구와 버전 출력','01-A의 초기화 다음 두 줄입니다.', '\n'.join(line for line in lines if line.startswith('print(')), '따옴표 안의 글은 출력 내용이며 pygame.__version__은 현재 버전을 읽습니다.')
        code=(base/'02-A.py').read_text();start=code.index('SCREEN_WIDTH =');end=code.index('clock = pygame.time.Clock()')+len('clock = pygame.time.Clock()')
        set_trace(2,1,'화면 크기와 프레임 시계 준비','02-A 파일 위쪽의 준비 구간입니다.',code[start:end], '화면을 먼저 만들고 제목을 지정한 뒤 FPS와 시계를 준비합니다. while 안에서 반복 생성하지 않습니다.')
        code=(base/'02-C.py').read_text();start=code.index('class Scout(');end=code.index('    def fire(',start)
        set_trace(2,3,'탐사선의 빈 생성자와 update','02-C의 Scout 클래스 앞부분입니다.',code[start:end], '각 메서드 안의 pass는 빈 본문 자리입니다. 이어지는 fire/reset 메서드는 전체 클래스에서 그대로 유지합니다.')
        set_trace(4,1,'아군 탄환의 그림·좌표·그룹 준비','04-A의 ScoutPulse.__init__ 본문입니다.',method(course,'04-A','ScoutPulse.__init__'), '좌표를 받는 두 줄과 그룹 등록까지 Data Log의 같은 순서로 연결합니다.')
        set_trace(6,1,'임시 열 기 편대 생성','06-A의 객체 준비 구간에서 한 번 실행할 반복문입니다.', 'for i in range(10):\n    raiders.add(Raider(64 + i * 64, 100, 2, raider_pulses))', 'Raider 생성 결과를 바로 그룹에 넣습니다. i=0부터 9까지이므로 열 기가 생깁니다.')
        set_trace(7,1,'Mission의 값과 객체 참조 준비','07-A의 Mission.__init__ 앞부분입니다.', '\n'.join(method(course,'07-A','Mission.__init__').splitlines()[:6]), '점수/라운드 값과 전달받은 같은 그룹 참조를 저장합니다. 뒤의 소리·폰트 준비는 전체 파일에서 유지합니다.')
        set_trace(7,2,'한글 점수를 Surface로 만들어 표시','07-B의 Mission.draw 본문입니다.',method(course,'07-B','Mission.draw'), '현재 점수로 글자 그림을 만들고 위 중앙에 정렬한 뒤 blit합니다.')
        draw=method(course,'09-C','Mission.draw');start=draw.index('    overlay =');end=draw.index('    title =',start)
        set_trace(9,2,'반투명 대기 화면 덮기','09-C의 Mission.draw에서 paused/game_over 조건 안의 앞부분입니다.',textwrap.dedent(draw[start:end]), '전장을 먼저 그린 뒤 알파 180의 막을 덮습니다. 뒤에서 안내 제목과 보조 문구를 그립니다.')
        set_trace(3,1,'탐사선 생성자의 그림과 위치 준비','03-A의 Scout.__init__ 안에서 사용하는 본문입니다.', '\n'.join(method(course,'03-A','Scout.__init__').splitlines()[:6]),'super는 Sprite 내부를 준비하고 image는 그림, rect는 위치를 보관합니다. 별도 raw_img 변수를 만들지 않고 Data Log의 실제 코드를 연습합니다.')
        set_trace(5,1,'공유 그림과 적별 시작 위치','05-A의 Raider.__init__에서 shared_image가 준비된 다음의 본문입니다.', '''self.image = Raider.shared_image
self.rect = self.image.get_rect()
self.rect.topleft = (x, y)
self.starting_x = x
self.starting_y = y
self.direction = 1''','그림은 공유하지만 rect와 starting 좌표는 적마다 따로 만듭니다. 파일을 매 적마다 다시 읽는 코드로 되돌리지 않습니다.')
        ex=bank['units'][4]['exercises'][1]
        ex['prompt']='05-A의 Raider.update 본문입니다. direction×velocity로 이동하고, randint(0,1000)>999의 확률 1/1001과 공유 탄환 3발 미만 조건을 함께 검사하세요. 추첨 성공은 고정된 발사 주기를 뜻하지 않습니다.'
        set_trace(8,3,'침범 후 생명은 반복문 밖에서 한 번 차감','08-B의 Mission.shift_raiders에서 적 전체 조사와 하강 반복이 끝난 다음의 처리입니다.', '''if breach:
    self.breach_sound.play()
    self.scout.lives -= 1
    self.check_game_status('외계 함선이 방어선을 침범했습니다!', 'Enter 키를 눌러 계속하세요')''','breach는 앞의 for 안에서 침범을 발견하면 True로 바꾼 값입니다. 여기에는 for가 없으며 침범한 적 수와 관계없이 생명을 한 번만 차감합니다.')
    else:
        code=(ROOT/'content'/course/'checkpoints/01-C.py').read_text();start=code.index('level_map =');end=code.index('running = True')
        set_trace(1,1,'독립된 행과 발판 숫자 배치','01-C의 지도 준비 구간입니다.',code[start:end], '이 연습에는 게임 루프와 pygame.quit를 넣지 않습니다. 지도 준비 뒤에 원래 실행 루프가 이어집니다.')
        set_trace(2,2,'캐시에 있는 그림 다시 사용하기','02-A의 load_image 함수 전체입니다.', '''def load_image(path, size):
    key = (path, size)
    if key not in image_cache:
        image_cache[key] = pygame.transform.smoothscale(pygame.image.load(path).convert_alpha(), size)
    return image_cache[key]''','image_cache는 함수 위에서 만든 딕셔너리입니다. return은 if 밖에 있어 두 번째 요청에서도 저장한 그림을 반환합니다.')
        set_trace(3,2,'지도 숫자에서 탐사원 생성 연결','03-B까지 작성한 지도 해석의 kind==9 분기 내부 두 줄입니다.', '''explorer = Explorer(x, y + TILE_SIZE, platforms, hazards)
explorers.add(explorer)''','x,y는 현재 칸의 왼쪽 위입니다. y에 타일 높이를 더해 발을 맞추고 explorers에 등록해야 update와 draw 대상이 됩니다.')
        landing=method(course,'05-B','Explorer.update')
        start=landing.index('self.grounded = False');end=landing.index('if pygame.sprite.spritecollide',start)
        set_trace(5,2,'낙하 경로로 발판 착지 판정','05-B의 Explorer.update에서 이동을 마친 뒤 착지 처리 구간입니다.',landing[start:end], '이전 발 높이와 현재 발 높이 사이의 발판을 검사합니다. 위치·y속도·rect·grounded를 함께 고치고 첫 착지에서 break합니다.')
        set_trace(13,2,'그리기·충돌·객체별 그룹 나누기','13-A의 클래스 정의 아래, 지도 생성보다 앞의 그룹 준비 구간입니다.', '''all_tiles = pygame.sprite.Group()
platforms = pygame.sprite.Group()
explorers = pygame.sprite.Group()
pulses = pygame.sprite.Group()
robots = pygame.sprite.Group()
gates = pygame.sprite.Group()
crystals = pygame.sprite.Group()''','그룹은 각기 별도의 관리 목록입니다. 객체를 새로 만드는 것과 같은 객체를 여러 그룹에 등록하는 것을 구별하세요.')
        set_trace(14,2,'숫자 타일의 생성 분기','14-B의 중첩 지도 반복문에서 x,y를 계산한 다음의 분기입니다.', '''if kind == 1:
    Terrain(x, y, kind, all_tiles)
elif 2 <= kind <= 5:
    Terrain(x, y, kind, all_tiles, platforms)''','흙은 표시 그룹에만, 발판은 표시와 착지 그룹에 함께 등록합니다. 이 조각은 기존 for 안에 들어갑니다.')
        code=method(course,'25-B','Expedition.check_collisions');start=code.index('for robot in pygame.sprite.spritecollide')
        set_trace(25,2,'회수와 접촉 피해를 상태로 구분','25-B의 Expedition.check_collisions에서 펄스 피격을 처리한 다음의 로봇 접촉 반복문입니다.',code[start:], 'walking이 아닌 로봇은 회수하고, walking이면 피해 대기시간을 검사합니다. 에너지 0에서는 return하여 이후 처리를 중단합니다.')
        code=method(course,'28-B','Expedition.check_collisions')
        start=code.index('collected =');end=code.index('for robot in list',start)
        set_trace(28,1,'회수한 결정 수만큼 보상 계산','28-A/B의 Expedition.check_collisions에서 탐사원 결정 회수 구간입니다.',code[start:end], '반환 목록 길이를 사용하므로 두 개면 200점과 에너지 20입니다. 에너지는 starting_health를 넘지 않습니다.')
        set_trace(28,2,'걷는 로봇의 결정 회수만 처리','28-B의 Expedition.check_collisions 마지막 반복문입니다.',code[end:], '검사 시작 목록을 복사하고 walking만 검사합니다. 제거된 결정 한 개마다 새 로봇 한 대를 만듭니다.')
        set_trace(31,1,'완성 버전의 Enter 상태별 동작','31-A 이후 메인 이벤트 처리에서 event.key==pygame.K_RETURN인 분기 안입니다.', '''if mission.state == 'title':
    mission.state = 'playing'
    pygame.mixer.music.play(-1)
elif mission.state == 'round_clear':
    mission.start_new_round()
elif mission.state == 'game_over':
    mission.reset_game()''','playing의 임시 로봇 생성은 제거하고 시작·다음 탐사·새 게임 분기만 유지합니다.')
    if course=='space-invaders':
        q=bank['units'][4]['quizzes'][5]
        for option in q['options']:
            if option['isCorrect']:option['text']='RaiderPulse의 빈 설계도는 있지만 탄환 생성·이동 본문과 발사 연결을 06단원에서 완성하기 때문이다.'
        q['explanation']='클래스 선언은 02-C에서 했습니다. 아직 구현하지 않은 생성자와 이동을 06에서 채우고 Raider.fire에 생성 호출을 연결합니다.'
    for u in bank['units']:
        for ex in u['exercises']:
            note=' 이 문제는 발췌 코드 연습입니다. main.py 전체를 대체하거나 단독 실행하지 않습니다. 설명 주석은 따라 적지 않아도 됩니다.'
            if note not in ex['prompt']:ex['prompt']+=note
    return bank

if __name__=='__main__':
    for course in ['space-invaders','mars-expedition']:
        p=ROOT/'content'/course/'assessments.json'
        bank=review_bank(course,json.loads(p.read_text()))
        p.write_text(json.dumps(bank,ensure_ascii=False,indent=2)+'\n')
        print('Reviewed exercise contexts:',course)
