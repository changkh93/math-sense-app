from engine import *

EJ="elif event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE:\n    explorer.jump()"
EF="elif event.type == pygame.KEYDOWN:\n    if event.key == pygame.K_SPACE:\n        explorer.jump()\n    elif event.key == pygame.K_UP:\n        explorer.fire()"
ET=EF+"\n    elif event.key == pygame.K_RETURN:\n        robots.add(Robot(platforms, gates, 2, 7))"
U3=U+'\nexplorers.update(seconds)'
D3=D+'\nexplorers.draw(screen)'

def no_mask(code):
    return code.replace('\n        self.mask = pygame.mask.from_surface(self.image)','')

add(21,'행동과 방향에 맞는 프레임 재생','기초 실험의 달리기·대기에 점프와 발사를 더할 준비를 합니다.',
    [method('Explorer.animate',no_mask(GAME_METHODS['Explorer']['animate'])),method('Explorer.check_animations')],
    '먼저 발사 중인지, 다음으로 공중인지, 그다음 이동 입력이 있는지 검사합니다. 먼저 참이 된 상태가 우선합니다. action이 바뀔 때만 frame을0으로 돌립니다. 방향은 facing에 따로 저장하므로 키를 놓고 속도가0이 되어도 마지막으로 바라본 쪽을 유지합니다. 초당8프레임의 달리기·점프와4프레임의 대기를 비교합니다.',
    '좌우 달리기, 키 놓기, 점프를 차례로 해 보세요. 달리다 멈추면 대기 자세, 공중에서는 점프 자세가 보여야 합니다.',
    '발사 입력은 다음 편집에서 연결하므로 fire 동작은 아직 볼 수 없습니다.',
    '항상 첫 장이면 action이 같을 때도 frame=0을 실행하는지 확인합니다.')
add(21,'펄스 생성과 이동 연결','위쪽키를 누르면 현재 방향으로 발사하고500픽셀을 지나면 제거합니다.',
    [method('Pulse.__init__',no_mask(GAME_METHODS['Pulse']['__init__'])),method('Pulse.update'),method('Explorer.fire'),part('loop',plain_loop(U3+'\npulses.update(seconds)\nmission.update(seconds)',D3+'\npulses.draw(screen)\nmission.draw()',EF))],
    'Pulse의생성자는pulses그룹에직접등록합니다. direction이-1이면속도가-20이고그림도뒤집습니다. start_x와현재x의차이에abs를써왼쪽발사도같은사거리를가집니다. kill은등록된그룹에서자기를제거합니다. fire_remaining=0.35는연속입력을제한하고발사그림을보여주는시간입니다. get_pressed가아니라KEYDOWN이라한번누를때한번시도합니다.',
    '오른쪽을보고위쪽키,왼쪽을보고위쪽키를누릅니다. 펄스가양방향으로날아가다가사라지고,발사자세와소리가나와야합니다. 빠르게반복눌러도0.35초보다촘촘하게나오지않습니다.',
    '아직맞을로봇이없어펄스는공간을그대로통과합니다.',
    '화면에계속남으면update와range조건을확인합니다. 왼쪽발사가사라지지않으면abs가필요합니다.')
robot_init_plain=no_mask(GAME_METHODS['Robot']['__init__'])
add(22,'두 종류의 로봇 생성자','걷기·쓰러짐 그림과 거꾸로 재생할 복구 그림을 준비합니다.',
    [method('Robot.__init__',robot_init_plain)],
    'teal과amber중하나,방향-1과1중하나를무작위로고릅니다. 생성자가받은최소·최대속도사이의정수를사용합니다. down_frames를reversed로뒤집으면복구순서가됩니다. 원본리스트를바꾸지않도록list로새리스트를만듭니다. 시작발높이-64로화면위에서등장하게합니다. state는walking으로시작하고나중에falling/down/rising을사용합니다.',
    '실행화면이전과같아야합니다. 아직Robot을한번도생성하지않았습니다. 생성자에서무작위선택이매프레임이아닌한번만일어나는지확인합니다.',
    '이번단원에서는적이등장하지않는것이정상입니다.',
    '프레임파일이없다는오류가나면robot/teal/walk등의폴더이름을확인합니다. 생성하기전에는경로오류가드러나지않을수있습니다.')
U4=U3+'\npulses.update(seconds)\nrobots.update(seconds)'
D4=D3+'\npulses.draw(screen)\nrobots.draw(screen)'
add(23,'이동·착지·게이트 메서드와 임시 생성키','Enter를 시험 도구로 사용해 로봇 한 대씩 생성합니다.',
    [method('Robot.update'),method('Robot.move'),method('Robot.check_collisions'),part('loop',plain_loop(U4+'\nmission.update(seconds)',D4+'\nmission.draw()',ET))],
    '로봇은키입력을읽지않고처음고른x속도로계속걷습니다. 중력3과최대낙하속도25를적용하고발판에착지하면y속도만0으로만듭니다. 탐사원과달리천장점프판정은필요없습니다. 화면끝과게이트를통해계속순환합니다. Enter는개발중관찰을위한임시키이며31에서제거합니다. 원강의83은이동단계이며마스크단계가아닙니다.',
    'Enter를세번눌러세로봇을만듭니다. 위에서떨어져발판을걷고서로다른속도와방향을보이는지관찰합니다. 게이트에도들어가게기다려보세요.',
    '걷는그림은아직한장이고펄스를맞아도아무일이없습니다.',
    'Enter한번에매프레임생성되면get_pressed가아닌KEYDOWN분기인지확인합니다.')
robot_walk=body('Robot.check_animations',"if self.state == 'walking':\n    self.animate(self.walk_frames, seconds, 8, True)")
add(24,'로봇의 걷기 애니메이션','로봇도 자기 프레임 번호를 갱신해 걷는 모션을 보입니다.',
    [method('Robot.animate',no_mask(GAME_METHODS['Robot']['animate'])),robot_walk],
    'animate는loop=True일때반복하고False일때마지막장에머뭅니다. finished는끝을지났는지알려주는반환값입니다. 지금은걷기에서True만쓰고다음편집에서쓰러짐에False를사용합니다. 마지막인덱스밖으로나가지않도록len(frames)-1e-6으로제한합니다.',
    'Enter로로봇을만들어양쪽방향의다리가움직이는지확인합니다. 멀리가는속도와다리의프레임속도가서로다른값임을관찰합니다.',
    '아직피격반응은없습니다.',
    '반대방향그림이면생성자에서direction<0일때모든프레임을뒤집었는지확인합니다.')
robot_fall='''if self.state == 'walking':
    self.animate(self.walk_frames, seconds, 8, True)
elif self.state == 'falling':
    if self.animate(self.down_frames, seconds, 6, False):
        self.state = 'down'
        self.down_elapsed = 0.0'''
collision_hit=GAME_METHODS['Expedition']['check_collisions'].split('        for robot in pygame.sprite.spritecollide')[0].replace(', pygame.sprite.collide_mask','').rstrip()
refs='''self.explorer = explorer
self.robots = robots
self.platforms = platforms
self.gates = gates
self.pulses = pulses
self.crystals = crystals'''
add(24,'펄스 충돌과 쓰러진 자세 유지','관리자가 두 그룹을 비교하고 맞은 로봇의 상태를 바꿉니다.',
    [body('Expedition.__init__',hud_init+'\n'+refs),part('setup',setup_with(GR,True)),method('Expedition.check_collisions',collision_hit),body('Expedition.update','self.check_collisions()\n'+hud_update),body('Robot.check_animations',robot_fall)],
    'groupcollide(pulses,robots,True,False)는맞은펄스를제거하고로봇은남깁니다. 결과딕셔너리의values는맞은로봇리스트들입니다. walking일때만피격음과falling전환을실행합니다. frame=0으로쓰러짐첫장부터시작하고끝나면down으로멈춥니다. 이동메서드가walking외에는return하므로쓰러진로봇이옆으로미끄러지지않습니다. 현재는사각형충돌이며30에서정밀판정을붙입니다.',
    'Enter로로봇을생성하고같은높이에서펄스를맞힙니다. 로봇이쓰러진마지막자세로멈추고펄스가사라지는지확인합니다. 다시맞혀도쓰러짐이처음부터반복되지않아야합니다.',
    '아직로봇이일어나거나접촉피해를주지않습니다.',
    '로봇자체가즉시사라지면groupcollide의두번째삭제인수를False로바꿉니다.')
add(25,'정지한 로봇의 재부팅','쓰러진 뒤2초를 기다리고 역순 프레임을 재생합니다.',
    [method('Robot.check_animations')],
    'down상태에서만down_elapsed를늘립니다.2초뒤rising으로바꾸고frame을0으로되돌립니다. 역순애니메이션이끝나면walking으로돌아갑니다. 이수업은쓰러지는동작이완료된시점부터2초를재어회수기회를명확히줍니다. 원강의는피격시점부터시간을재므로대기기준이다릅니다. 다음피격을위해시간과프레임을매번초기화합니다.',
    '로봇을맞힌뒤가까이다가가지말고기다립니다. 쓰러짐→2초정지→일어남→걷기순서가보이는지확인합니다. 두번연속맞혀도같은순서여야합니다.',
    '아직접촉해도에너지는줄지않습니다.',
    '즉시일어나면down_elapsed를쓰러짐완료시0으로만드는지확인합니다.')
collision_contact=GAME_METHODS['Expedition']['check_collisions'].split('        collected =')[0].replace(', pygame.sprite.collide_mask','').replace('                self.crystals.add(Crystal(self.platforms, self.gates))\n','').rstrip()
hud_health=hud_draw.replace('{100}','{self.explorer.health}')
add(25,'쓰러진 로봇 회수와 살아 있는 로봇 피해','로봇상태에따라같은접촉이다른결과를만들게합니다.',
    [method('Expedition.check_collisions',collision_contact),method('Expedition.draw',hud_health)],
    'walking이아닌로봇을접촉하면제거하고25점을얻습니다. walking로봇은에너지20을줄이고반대쪽128픽셀로밀어냅니다. hurt_remaining을1초로설정해한번겹쳤다고매프레임피해를받지않게합니다. 에너지는max로0아래로내려가지않게합니다. HUD의임시100을현재health로교체합니다.0이면충돌처리를즉시끝내같은프레임회복으로죽음을취소하지않게합니다.',
    '쓰러진로봇에닿아25점만증가하는지확인합니다. 걷는로봇에닿으면에너지100→80,밀림이한번일어나야합니다. 연속접촉해도한프레임에0이되지않아야합니다.',
    '0에너지가되어도종료화면은아직없습니다.30에서연결합니다.',
    '피해가계속누적되면Explorer.update에서hurt_remaining을초단위로줄이고있는지확인합니다.')
spawn_init='''self.initial_spawn_interval = 5
self.spawn_interval = self.initial_spawn_interval
self.spawn_elapsed = 0.0'''
add(26,'5초마다 로봇 자동 생성','남은 시간의 나머지 대신 별도 경과 시간을 써 한 번씩 생성합니다.',
    [body('Expedition.__init__',hud_init+'\n'+refs+'\n'+spawn_init),method('Expedition.add_robot'),body('Expedition.update','self.check_collisions()\n'+hud_update+'\nself.add_robot(seconds)')],
    'spawn_elapsed가간격에도달하면로봇한대를만들고간격만큼빼줍니다. 남은시간%5==0을매프레임검사하면같은초에60대가생길수있습니다. 별도누적시간으로그문제를피합니다. 실수오차를감안한비교후max(0,경과-간격)로정리하여연속두번생성되는경계오류도막습니다. 속도범위는탐사번호부터번호+5입니다. Enter임시생성도최종정리까지남겨둡니다.',
    'Enter를누르지않고약16초기다려5,10,15초에각한대가추가되는지확인합니다. 중간에Enter를누르면자동생성과별도로한대가추가됩니다.',
    '다음탐사는아직없고시간0뒤에도자동생성은계속됩니다.29에서상태전환으로멈춥니다.',
    '같은순간두대이상나오면루프에서mission.update를두번호출했는지확인합니다.')
add(27,'회수 가능한 신호 결정 생성자','중앙위쪽에서출발할작은결정의그림·벡터·그룹참조를정합니다.',
    [method('Crystal.__init__',no_mask(GAME_METHODS['Crystal']['__init__']))],
    '장식신호원은64픽셀,회수물은32픽셀로구분합니다. 시작x는화면중앙,y는100이며가로속도는-5또는5입니다. 중력3으로떨어지고게이트연결을위해gates도저장합니다. 생성자만정의했고아직만들지않으므로화면변화는없습니다.',
    '실행하여기존이동·발사·피격이유지되는지확인합니다. 중앙큰신호원과앞으로나올작은결정이서로다른클래스인지코드에서찾습니다.',
    '이번편집에서작은결정이없는것이정상입니다.',
    'SignalSource를수정하지않고Crystal생성자를채웠는지확인합니다.')
U5=U4+'\ncrystals.update(seconds)'
D5=D4+'\ncrystals.draw(screen)'
collision_drop=collision_contact.replace('                self.score += 25','                self.score += 25\n                self.crystals.add(Crystal(self.platforms, self.gates))')
add(27,'로봇 회수로 결정 떨어뜨리기','결정의움직임을완성하고쓰러진로봇접촉에생성을연결합니다.',
    [method('Crystal.update'),method('Crystal.move'),method('Crystal.check_collisions'),method('Crystal.animate',no_mask(GAME_METHODS['Crystal']['animate'])),method('Expedition.check_collisions',collision_drop),part('loop',plain_loop(U5+'\nmission.update(seconds)',D5+'\nmission.draw()',ET))],
    '회수한로봇한대마다Crystal을한개만만듭니다. 죽인로봇을그룹에서제거하므로다음프레임같은로봇으로또생성되지않습니다. 결정은회전→이동→충돌순으로갱신하고발판에서y속도를0으로만듭니다. 탐사원처럼방향키를읽지않습니다. 생성한객체를crystals그룹에추가해야update와draw가작동합니다.',
    '로봇을쓰러뜨린뒤접촉합니다.25점이오르고화면중앙위쪽에서작은결정한개가떨어져좌우로이동해야합니다. 발판착지와게이트통과도관찰합니다.',
    '결정에닿아도아직점수나회복이일어나지않습니다.',
    '결정이제자리면crystals.update,안보이면crystals.draw와그룹추가를확인합니다.')
pickup_init="self.pickup_sound = load_sound('collect')\nself.lost_sound = load_sound('signal_lost')\npygame.mixer.music.load('assets/sounds/expedition.ogg')"
full_rect=GAME_METHODS['Expedition']['check_collisions'].replace(', pygame.sprite.collide_mask','')
player_collect=full_rect.split('        for robot in list(self.robots):')[0].rstrip()
add(28,'탐사원의 결정 회수와 회복','결정을먼저회수하면100점과에너지10을얻습니다.',
    [body('Expedition.__init__',hud_init+'\n'+refs+'\n'+spawn_init+'\n'+pickup_init),method('Expedition.check_collisions',player_collect)],
    'spritecollide의True는회수한결정을즉시그룹에서지웁니다. len(collected)로같은프레임두개를회수하면200점과에너지20을계산합니다. min(starting_health,...)가100상한을지킵니다. 음악은여기서파일만읽고29의시작화면에서재생합니다.',
    '피해를한번받아에너지80으로만든뒤결정을회수해90이되는지확인합니다. 에너지100에서회수하면점수만오르고100을넘지않아야합니다.',
    '배경음악이아직들리지않는것이정상입니다.',
    '회수점수가계속오르면결정삭제인수가True인지확인합니다.')
add(28,'로봇에게 결정을 빼앗긴 경우','걷는로봇이먼저닿으면결정을제거하고로봇을한대늘립니다.',
    [method('Expedition.check_collisions',full_rect)],
    '쓰러졌거나재부팅중인로봇은continue로건너뜁니다. 살아있는로봇만신호를가져갑니다. list(self.robots)는검사시작목록을복사하여루프중새로추가한로봇을이번검사에다시넣지않습니다. 결정하나당로봇한대이며탐사원회수검사를먼저하므로동시에닿으면탐사원이먼저회수합니다.',
    '결정을직접회수하지않고로봇이닿도록기다립니다. 결정이사라지고위쪽에새로봇이추가되어야합니다. 쓰러진로봇위로지나는결정은빼앗기지않아야합니다.',
    '탐사원점수는로봇이회수한결정으로오르지않습니다.',
    '로봇수가폭증하면삭제된결정을다시세거나새로추가된로봇까지같은루프에서검사하는지확인합니다.')
state_init="self.state = 'playing'\nself.message = ''\nself.hint = ''"
state_update='''if self.state != 'playing':
    return
self.check_collisions()
self.elapsed += seconds
self.remaining = max(0, self.round_duration - int(self.elapsed + 1e-9))
self.check_round_completion()
if self.state != 'playing':
    return
self.add_robot(seconds)'''
# Preserve the development-only Enter spawn while introducing state-based pause.
STATE_LOOP=FINAL_LOOP.replace("                elif mission.state == 'game_over':\n                    mission.reset_game()", "                elif mission.state == 'playing':\n                    robots.add(Robot(platforms, gates, 2, 7))")
add(29,'시간0에서 멈추고 다음 탐사로','남은시간이0이면안내상태로바꾸고Enter를기다립니다.',
    [body('Expedition.__init__',hud_init+'\n'+refs+'\n'+spawn_init+'\n'+pickup_init+'\n'+state_init),body('Expedition.update',state_update),method('Expedition.draw'),method('Expedition.check_round_completion'),method('Expedition.start_new_round'),method('Expedition.pause_game'),part('loop',STATE_LOOP)],
    'state가playing일때만객체와시간을갱신합니다. draw는계속하므로멈춘화면위에안내를그릴수있습니다. 원강의의내부무한대기루프를브라우저에맞는상태전환으로바꿔정지버튼과렌더링이계속응답하게합니다. Enter로다음탐사를시작하면번호를늘리고적·펄스·결정을비운뒤탐사원을복귀시킵니다. 에너지는현재값을유지합니다. 생성간격은5→4→3→2→1초이고1아래로내려가지않습니다.',
    '30초뒤안내가나오고캐릭터·로봇·시간이멈추는지확인합니다. Enter를누르면탐사2,30초,빈적그룹으로시작해야합니다.',
    '시작제목은다음편집에서추가합니다. 플레이중Enter는아직개발용생성키입니다.',
    '정지안내중로봇이움직이면그룹update를playing조건밖에두지않았는지확인합니다.',
    {'code':'mission.round_duration = 3\nmission.remaining = 3','observe':'3초마다탐사완료안내를확인합니다. Enter로다음탐사를세번확인한뒤두시험줄을지워30초로복원합니다.'})
add(29,'시작 화면과 배경음악','첫실행은제목상태로두고Enter에서음악과게임을시작합니다.',
    [part('setup',setup_with(GR,True,True))],
    'setup마지막의pause_game이state를title로정합니다. Enter분기의music.play(-1)는음악을반복재생합니다. 탐사완료때pause,next round때unpause하므로음악위치를이어갑니다. 사용자가게임화면을클릭한뒤키를누르게하여브라우저오디오입력조건도충족합니다.',
    '실행직후제목과조작안내가나오고시간30이줄지않아야합니다. 화면을클릭하고Enter를누르면음악과시간이시작됩니다. 탐사완료안내에서는음악이멈추고다음탐사에서이어집니다.',
    '시작전에방향키와발사는동작하지않습니다.',
    '음악이안들리면브라우저탭음소거와기기볼륨을확인하고화면클릭후Enter를다시시험합니다.')
add(30,'에너지0에서 종료하고 새 게임','종료판정을시간완료보다먼저실행해결과가뒤집히지않게합니다.',
    [method('Expedition.__init__'),method('Expedition.update'),method('Expedition.check_game_over'),method('Expedition.reset_game'),part('loop',FINAL_LOOP.replace("                elif mission.state == 'game_over':\n                    mission.reset_game()", "                elif mission.state == 'game_over':\n                    mission.reset_game()\n                elif mission.state == 'playing':\n                    robots.add(Robot(platforms, gates, 2, 7))"))],
    '충돌후먼저check_game_over를호출하고state가바뀌면즉시return합니다. 시간0과에너지0이같은프레임이면종료가우선입니다. reset_game은점수0,탐사1,시간30,생성간격5,에너지100과빈그룹을복구합니다. Explorer.reset은위치뿐아니라속도·가속도·재사용대기시간·그림을함께되돌립니다. 원강의후반의리셋후속도잔존버그를이수업에서는공통reset으로예방합니다.',
    '아래시험으로한번피해를받으면종료되게합니다. 종료점수가고정되고적이멈추는지확인한뒤Enter로새게임을시작합니다. 에너지100과점수0이며이전이동속도가남아있지않아야합니다.',
    '플레이중Enter임시생성은마지막단원에서제거합니다.',
    '종료와동시에다음탐사안내가뜨면update의종료후return과검사순서를확인합니다.',
    {'code':'explorer.health = 20','observe':'게임을시작한뒤걷는로봇에한번닿아종료를확인합니다. Enter로재시작하면생성자상한100으로회복됩니다. 시험줄을삭제한뒤정상시작100을확인합니다.'})
add(30,'그림 프레임과 같은 마스크로 정밀 판정','투명여백때문에맞지않은공격이명중하는경우를줄입니다.',
    [method('Terrain.__init__'),method('Explorer.__init__'),method('Explorer.animate'),method('Explorer.reset'),method('Pulse.__init__'),method('Robot.__init__'),method('Robot.animate'),method('Crystal.__init__'),method('Crystal.animate'),method('Expedition.check_collisions')],
    '정적인이미지는생성할때,애니메이션은image를바꾼직후mask를만듭니다. groupcollide와spritecollide의마지막인수에collide_mask를전달합니다. 발판은팔자세에따라흔들리지않도록기존발지지판정을유지하고공격·적·회수물에픽셀판정을적용합니다. 원강의의타일/플레이어선택마스크와고정+5보정은새그림에그대로옮기지않았습니다. 이변경은마스크의용도와갱신시점을배우면서안정적인착지를유지하기위한조정입니다.',
    '로봇의투명한모서리여백으로펄스가스치면지나가고몸통에맞으면쓰러지는지시험합니다. 움직이는그림에맞춰판정이따라가야합니다. 점프·착지도이전과같이안정적인지확인합니다.',
    '마스크를만들었다고모든충돌이자동으로마스크를쓰는것은아닙니다. 충돌함수에명시해야합니다.',
    '한프레임늦게맞으면image선택보다mask갱신을먼저하지않았는지확인합니다.')
add(31,'임시 생성키 제거','개발용Enter생성을지우고시작·다음탐사·새게임입력만남깁니다.',
    [part('loop',FINAL_LOOP)],
    'Enter분기의playing에서Robot을만들던두줄을제거합니다. 다른상태의Enter분기는그대로유지합니다. 완성버전에서적은자동생성또는결정손실로만추가됩니다.5초주기의한번생성,로봇회수25점,결정회수100점과10회복을다시확인합니다.',
    '플레이중Enter를연속으로눌러도적이늘지않아야합니다. 시작화면·탐사완료·종료화면의Enter는계속동작해야합니다.',
    '코드 스튜디오의정지버튼은게임내Enter와별개입니다.',
    '제목에서시작도안되면KEYDOWN전체를삭제하지않았는지확인합니다.')
add(31,'고난도 시험 후 기본값 복원','원강의마지막처럼높은탐사번호와짧은생성간격으로규칙을한번에시험합니다.',
    [],
    '아래시험은정식설정이아닙니다. 로봇속도는탐사번호에의존하므로5라운드는5~10범위를사용합니다. 생성간격2초로빠르게충돌·재부팅·회수경쟁을관찰합니다. 시험을마치면추가한두줄을지우고새로실행하여기본탐사1과5초간격을확인합니다. 직접작성프로젝트를다운로드하고완성비교프로젝트는별도로열어차이를살펴봅니다.',
    '시험설정에서좌우이동,점프,천장,네게이트,발사,피격,재부팅,25점회수,100점결정,회복상한,탐사완료,종료·재시작을차례로확인합니다. 복원후첫적이약5초에한대나오는지마지막으로확인합니다.',
    '완성버전에서도로봇색·방향·속도는무작위이므로실행마다배치가달라집니다.',
    '다음실행도너무어려우면시험두줄이남아있는지확인합니다. 완성누적코드에는그줄이없습니다.',
    {'code':'mission.round_number = 5\nmission.spawn_interval = 2','observe':'빠른로봇과2초생성으로시험합니다. 정지한뒤두줄을삭제하고다시실행하여탐사1·5초간격으로복원합니다.'})
