// Curated signatures for the studio runtime. Suggestions never import or execute code.
export const catalog = Object.create(null)
const fn = (label, signature, info, returns = null) => ({ label, kind: /^[A-Z]/.test(label) ? 'class' : 'function', type: /^[A-Z]/.test(label) ? 'class' : 'function', ref: /^[A-Z]/.test(label) ? returns : undefined, signature: `${label}(${signature})`, info, returns })
const mod = ref => ({ kind: 'module', type: 'namespace', ref, label: ref.split('.').at(-1), info: `${ref} 모듈` })
export const instance = ref => ({ kind: 'instance', ref })
function define(ref, rows) {
  catalog[ref] = Object.fromEntries(rows.map(([name, args, info, returns]) => [name, fn(name, args, info, returns)]))
}
define('builtins', [
  ['print', "*values, sep=' ', end='\\n'", '값을 출력 · 오류 영역에 보여 줍니다.'],
  ['len', 'obj', '문자열이나 리스트에 들어 있는 항목 수를 구합니다.', 'int'],
  ['range', 'start, stop, step=1', '반복문에서 사용할 정수 범위. range(5)는 0부터 4까지입니다.', 'list[int]'],
  ['int', 'value=0', '정수로 바꿉니다.', 'int'], ['float', 'value=0', '소수로 바꿉니다.', 'float'],
  ['str', "value=''", '문자열로 바꿉니다.', 'str'], ['bool', 'value=False', '참 또는 거짓으로 바꿉니다.', 'bool'],
  ['list', 'iterable=()', '순서가 있는 목록을 만듭니다.', 'list'], ['dict', '**items', '키와 값의 사전을 만듭니다.', 'dict'],
  ['tuple', 'iterable=()', '변경할 수 없는 목록을 만듭니다.', 'tuple'], ['set', 'iterable=()', '중복 없는 집합을 만듭니다.', 'set'],
  ['abs', 'number', '절댓값을 구합니다.', 'float'], ['round', 'number, ndigits=None', '반올림합니다.', 'float'],
  ['min', '*values', '가장 작은 값을 구합니다.'], ['max', '*values', '가장 큰 값을 구합니다.'], ['sum', 'iterable, start=0', '항목들을 더합니다.'],
  ['sorted', 'iterable, key=None, reverse=False', '정렬한 새 리스트를 만듭니다.', 'list'],
  ['enumerate', 'iterable, start=0', '번호와 값을 함께 반복합니다.'], ['zip', '*iterables', '여러 목록의 같은 위치 항목을 묶습니다.'],
  ['type', 'obj', '값의 자료형을 확인합니다.'], ['isinstance', 'obj, classinfo', '특정 자료형의 값인지 확인합니다.', 'bool'],
  ['open', "file, mode='r', encoding=None", '프로젝트의 파일을 엽니다. 예: open("data.txt", encoding="utf-8")'],
  ['input', "prompt=''", '입력 요청. 현재 게임 실행기에는 대화형 입력창이 없으므로 수업에서는 변수에 값을 지정해 주세요.', 'str'],
  ['help', 'object', '객체의 도움말을 확인합니다.'], ['dir', 'object', '객체에 있는 이름을 확인합니다.', 'list[str]'],
  ['super', '', '부모 클래스의 메서드에 접근합니다.'], ['any', 'iterable', '하나라도 참인지 확인합니다.', 'bool'], ['all', 'iterable', '모두 참인지 확인합니다.', 'bool'],
])
define('str', [['upper', '', '대문자로 바꾼 문자열.', 'str'], ['lower', '', '소문자로 바꾼 문자열.', 'str'], ['strip', 'chars=None', '양 끝의 공백을 제거합니다.', 'str'], ['split', 'sep=None, maxsplit=-1', '문자열을 나눕니다.', 'list[str]'], ['join', 'iterable', '문자열 목록을 이어 붙입니다.', 'str'], ['replace', 'old, new, count=-1', '문자열 일부를 바꿉니다.', 'str'], ['startswith', 'prefix', '주어진 글자로 시작하는지 확인합니다.', 'bool'], ['endswith', 'suffix', '주어진 글자로 끝나는지 확인합니다.', 'bool'], ['find', 'sub', '처음 나타나는 위치. 없으면 -1입니다.', 'int'], ['count', 'sub', '나타나는 횟수.', 'int'], ['format', '*args, **kwargs', '값을 넣어 문자열을 만듭니다.', 'str'], ['isdigit', '', '숫자로만 된 문자열인지 확인합니다.', 'bool']])
define('list', [['append', 'value', '목록 끝에 항목 하나를 추가합니다.'], ['extend', 'iterable', '목록 끝에 여러 항목을 추가합니다.'], ['insert', 'index, value', '원하는 위치에 넣습니다.'], ['pop', 'index=-1', '항목을 꺼내고 목록에서 제거합니다.'], ['remove', 'value', '같은 값인 첫 항목을 제거합니다.'], ['clear', '', '모든 항목을 지웁니다.'], ['sort', 'key=None, reverse=False', '이 목록 자체를 정렬합니다.'], ['reverse', '', '목록 순서를 뒤집습니다.'], ['copy', '', '얕은 복사본을 만듭니다.', 'list'], ['count', 'value', '같은 항목 수.', 'int'], ['index', 'value', '항목의 위치.', 'int']])
define('dict', [['get', 'key, default=None', '키의 값을 찾고 없으면 기본값을 반환합니다.'], ['keys', '', '키 목록.'], ['values', '', '값 목록.'], ['items', '', '키와 값의 쌍.'], ['update', 'other', '여러 값을 추가·변경합니다.'], ['pop', 'key, default=None', '키의 값을 꺼내고 제거합니다.'], ['clear', '', '모든 항목을 지웁니다.'], ['copy', '', '사전 복사본.', 'dict']])
define('set', [['add', 'value', '값을 추가합니다.'], ['discard', 'value', '값이 있으면 제거합니다.'], ['union', 'other', '합집합.', 'set'], ['intersection', 'other', '교집합.', 'set'], ['clear', '', '모두 제거합니다.']])
catalog.tuple = { count: catalog.list.count, index: catalog.list.index }
define('turtle.Turtle', [
  ['forward', 'distance', '바라보는 방향으로 이동하며 펜이 내려져 있으면 선을 그립니다.'], ['backward', 'distance', '뒤로 이동합니다.'],
  ['left', 'angle', '왼쪽으로 각도만큼 회전합니다.'], ['right', 'angle', '오른쪽으로 각도만큼 회전합니다.'],
  ['goto', 'x, y', '지정한 좌표로 이동합니다. 화면 중심은 (0, 0)입니다.'], ['setx', 'x', '가로 좌표를 바꿉니다.'], ['sety', 'y', '세로 좌표를 바꿉니다.'],
  ['setheading', 'angle', '방향을 지정합니다. 0도 오른쪽, 90도 위쪽.'], ['heading', '', '현재 방향 각도.', 'float'],
  ['xcor', '', '현재 가로 좌표.', 'float'], ['ycor', '', '현재 세로 좌표.', 'float'], ['position', '', '현재 (x, y) 좌표.', 'tuple'],
  ['home', '', '중심으로 이동하고 오른쪽을 바라봅니다.'], ['circle', 'radius, extent=None, steps=None', '원을 그립니다. extent를 넣으면 원의 일부를 그립니다.'],
  ['penup', '', '선을 그리지 않고 움직이도록 펜을 듭니다.'], ['pendown', '', '움직일 때 선을 그리도록 펜을 내립니다.'], ['isdown', '', '펜이 내려져 있는지 확인합니다.', 'bool'],
  ['pensize', 'width=None', '선 두께. 1.5처럼 소수도 사용할 수 있습니다.', 'float'],
  ['color', '*colors', '선과 채우기 색. color("black", "white")처럼 두 색을 줄 수 있습니다.'], ['pencolor', '*color', '선 색을 지정합니다.'], ['fillcolor', '*color', '채우기 색을 지정합니다.'],
  ['begin_fill', '', '색을 채울 도형을 시작합니다.'], ['end_fill', '', '도형을 현재 채우기 색으로 채웁니다.'], ['filling', '', '색 채우기를 기록 중인지 확인합니다.', 'bool'],
  ['speed', 'value=None', '0은 즉시 그리기, 1~15는 느리게~빠르게입니다.', 'float'], ['shape', "name='turtle'", '거북이 모양: turtle, classic, arrow, circle, square, triangle, blank.'],
  ['hideturtle', '', '거북이 모양을 숨깁니다.'], ['showturtle', '', '거북이 모양을 보여 줍니다.'], ['isvisible', '', '거북이 표시 여부.', 'bool'],
  ['write', "text, move=False, align='left', font=('Arial', 8, 'normal')", '현재 위치에 글씨를 씁니다. 한글도 사용할 수 있습니다.'], ['dot', 'size=None, *color', '현재 위치에 점을 찍습니다.'],
  ['clear', '', '이 거북이가 그린 그림을 지웁니다.'], ['reset', '', '이 거북이를 초기화합니다.'], ['getscreen', '', '이 거북이의 화면.', 'turtle.Screen'],
  ['distance', 'x, y=None', '지점까지의 거리.', 'float'], ['towards', 'x, y=None', '지점 쪽 방향.', 'float'], ['shapesize', 'stretch_wid=None, stretch_len=None, outline=None', '거북이 모양 크기를 조절합니다.'],
])
for (const [alias, name] of Object.entries({ fd: 'forward', bk: 'backward', back: 'backward', lt: 'left', rt: 'right', pu: 'penup', up: 'penup', pd: 'pendown', down: 'pendown', width: 'pensize', pos: 'position', setpos: 'goto', setposition: 'goto', seth: 'setheading', ht: 'hideturtle', st: 'showturtle', turtlesize: 'shapesize' })) catalog['turtle.Turtle'][alias] = { ...catalog['turtle.Turtle'][name], label: alias }
catalog['turtle.Turtle'].screen = { label: 'screen', type: 'property', kind: 'instance', ref: 'turtle.Screen', info: '이 거북이가 그리는 화면' }
define('turtle.Screen', [['setup', 'width=800, height=600', '화면 크기를 픽셀로 지정합니다.'], ['bgcolor', '*color', '배경색을 바꿉니다.'], ['title', 'text', '그림 제목을 바꿉니다.'], ['clear', '', '화면을 초기화합니다.'], ['clearscreen', '', '화면과 거북이를 초기화합니다.'], ['reset', '', '거북이들을 초기화합니다.'], ['window_width', '', '화면 너비.', 'int'], ['window_height', '', '화면 높이.', 'int'], ['turtles', '', '화면에 있는 거북이 목록.', 'list[turtle.Turtle]'], ['colormode', 'value=None', 'RGB 숫자 범위를 1 또는 255로 지정합니다.'], ['tracer', 'n=None, delay=None', '0이면 움직임 애니메이션을 생략합니다.'], ['update', '', '그림 갱신. 브라우저가 자동 표시합니다.'], ['mainloop', '', '그림을 표시합니다. 스튜디오에서는 완료 뒤에도 그림이 남습니다.']])
catalog.turtle = { ...catalog['turtle.Turtle'], ...catalog['turtle.Screen'], Turtle: { ...fn('Turtle', "shape='classic'", '새 거북이 객체를 만듭니다.', 'turtle.Turtle'), kind: 'class', type: 'class' }, Screen: { ...fn('Screen', '', '그림 화면을 가져옵니다.', 'turtle.Screen'), kind: 'class', type: 'class' }, done: fn('done', '', '완성한 그림을 표시합니다.') }
delete catalog.turtle.screen
delete catalog.turtle.turtles // No module-level turtles() in our compatibility module.
catalog['ColabTurtlePlus.Turtle'] = catalog.turtle
catalog.ColabTurtlePlus = { Turtle: mod('ColabTurtlePlus.Turtle') }
define('pygame', [['init', '', 'pygame 모듈을 초기화합니다.', 'tuple'], ['quit', '', 'pygame을 종료합니다.'], ['get_init', '', '초기화 상태.', 'bool'], ['Rect', 'x, y, width, height', '위치와 크기를 가진 사각형.', 'pygame.Rect'], ['Surface', 'size, flags=0', '그림을 그릴 이미지 표면.', 'pygame.Surface'], ['Color', 'color', '색상 객체.', 'pygame.Color']])
define('pygame.display', [['set_mode', 'size=(0, 0), flags=0', '게임 화면을 만듭니다. 예: (800, 600).', 'pygame.Surface'], ['set_caption', 'title', '게임 창 제목을 설정합니다.'], ['update', 'rectangle=None', '그린 내용을 화면에 반영합니다.'], ['flip', '', '화면 전체를 갱신합니다.'], ['get_surface', '', '현재 게임 화면.', 'pygame.Surface']])
define('pygame.image', [['load', 'filename', '업로드한 이미지 파일을 읽습니다.', 'pygame.Surface'], ['save', 'surface, filename', '이미지를 실행 환경의 파일에 저장합니다.']])
define('pygame.Surface', [['blit', 'source, dest, area=None, special_flags=0', '다른 이미지를 이 표면에 그립니다.', 'pygame.Rect'], ['fill', 'color, rect=None, special_flags=0', '색으로 채웁니다.', 'pygame.Rect'], ['get_rect', '**attributes', '이미지 크기의 사각형. center=(x, y) 등을 지정할 수 있습니다.', 'pygame.Rect'], ['convert_alpha', '', '투명도를 유지한 표면으로 변환합니다.', 'pygame.Surface'], ['convert', '', '빠르게 그릴 수 있는 표면으로 변환합니다.', 'pygame.Surface'], ['get_width', '', '너비.', 'int'], ['get_height', '', '높이.', 'int'], ['get_size', '', '(너비, 높이).', 'tuple'], ['copy', '', '복사한 표면.', 'pygame.Surface'], ['set_alpha', 'value', '투명도 0~255.'], ['set_colorkey', 'color', '지정한 색을 투명하게 처리합니다.'], ['get_at', 'pos', '픽셀 색.', 'pygame.Color'], ['set_at', 'pos, color', '픽셀 색을 바꿉니다.'], ['subsurface', 'rect', '일부 영역의 표면.', 'pygame.Surface']])
define('pygame.Rect', [['colliderect', 'other', '다른 사각형과 겹치는지 확인합니다.', 'bool'], ['collidepoint', 'x, y', '점이 사각형 안에 있는지 확인합니다.', 'bool'], ['move', 'x, y', '이동한 새 사각형을 만듭니다.', 'pygame.Rect'], ['move_ip', 'x, y', '이 사각형을 이동시킵니다.'], ['inflate', 'x, y', '크기를 바꾼 새 사각형.', 'pygame.Rect'], ['clamp_ip', 'other', '다른 사각형 안쪽으로 위치를 제한합니다.'], ['copy', '', '사각형 복사본.', 'pygame.Rect']])
for (const name of 'x y width height w h top bottom left right centerx centery'.split(' ')) catalog['pygame.Rect'][name] = { label: name, kind: 'instance', type: 'property', ref: 'int', info: '사각형의 위치 또는 크기. 값을 대입해 바꿀 수 있습니다.' }
for (const name of 'center topleft topright bottomleft bottomright midtop midbottom midleft midright size'.split(' ')) catalog['pygame.Rect'][name] = { label: name, kind: 'instance', type: 'property', ref: 'tuple', info: '(x, y) 또는 (너비, 높이) 쌍입니다.' }
define('pygame.draw', [['rect', 'surface, color, rect, width=0, border_radius=0', '사각형을 그립니다.', 'pygame.Rect'], ['circle', 'surface, color, center, radius, width=0', '원을 그립니다.', 'pygame.Rect'], ['line', 'surface, color, start_pos, end_pos, width=1', '선을 그립니다.', 'pygame.Rect'], ['lines', 'surface, color, closed, points, width=1', '여러 점을 선으로 연결합니다.', 'pygame.Rect'], ['polygon', 'surface, color, points, width=0', '다각형을 그립니다.', 'pygame.Rect'], ['ellipse', 'surface, color, rect, width=0', '타원을 그립니다.', 'pygame.Rect']])
define('pygame.event', [['get', '', '이벤트 목록을 가져옵니다.', 'list[pygame.Event]'], ['poll', '', '이벤트 하나를 가져옵니다.', 'pygame.Event'], ['clear', '', '이벤트 대기열을 비웁니다.'], ['Event', 'type, **attributes', '이벤트 객체를 만듭니다.', 'pygame.Event']])
catalog['pygame.Event'] = Object.fromEntries('type key pos button buttons rel unicode'.split(' ').map(label => [label, { label, type: 'property', info: '이벤트 종류에 따라 제공되는 속성입니다.' }]))
catalog['pygame.Event'].type.ref = 'int'
catalog['pygame.Event'].pos.ref = 'tuple'
define('pygame.key', [['get_pressed', '', '각 키가 눌렸는지 확인합니다.', 'list[bool]'], ['name', 'key', '키 이름.', 'str']])
define('pygame.mouse', [['get_pos', '', '마우스 (x, y).', 'tuple'], ['get_pressed', 'num_buttons=3', '마우스 버튼 상태.', 'tuple'], ['set_visible', 'visible', '마우스 커서 표시 여부.'], ['get_rel', '', '이전 위치에서 이동한 거리.', 'tuple']])
define('pygame.time', [['Clock', '', '프레임 속도 관리 객체.', 'pygame.Clock'], ['get_ticks', '', '초기화 이후 지난 밀리초.', 'int'], ['set_timer', 'event, millis, loops=0', '일정 간격으로 이벤트를 발생시킵니다.']])
define('pygame.Clock', [['tick', 'framerate=0', '초당 프레임 수를 제한합니다. 예: tick(60).', 'int'], ['get_fps', '', '현재 초당 프레임 수.', 'float'], ['get_time', '', '이전 프레임에 걸린 시간.', 'int']])
define('pygame.font', [['Font', 'filename, size', '업로드한 폰트로 글꼴을 만듭니다. filename=None이면 기본 폰트.', 'pygame.Font'], ['SysFont', 'name, size, bold=False, italic=False', '사용 가능한 시스템 글꼴을 만듭니다.', 'pygame.Font'], ['init', '', '폰트 기능을 초기화합니다.']])
define('pygame.Font', [['render', 'text, antialias, color, background=None', '글씨를 이미지 표면으로 만듭니다.', 'pygame.Surface'], ['size', 'text', '글씨 이미지 크기.', 'tuple'], ['set_bold', 'value', '굵은 글씨 여부.']])
define('pygame.mixer', [['Sound', 'file', '효과음을 불러옵니다.', 'pygame.Sound'], ['init', '', '소리 기능을 초기화합니다.'], ['stop', '', '모든 효과음을 멈춥니다.']])
define('pygame.Sound', [['play', 'loops=0', '효과음을 재생합니다.', 'pygame.Channel'], ['stop', '', '소리를 멈춥니다.'], ['set_volume', 'value', '볼륨 0.0~1.0.'], ['get_length', '', '길이(초).', 'float']])
define('pygame.mixer.music', [['load', 'filename', '배경 음악을 불러옵니다.'], ['play', 'loops=0', '배경 음악을 재생합니다. -1은 반복 재생.'], ['stop', '', '음악을 멈춥니다.'], ['pause', '', '일시 정지합니다.'], ['unpause', '', '다시 재생합니다.'], ['set_volume', 'value', '볼륨 0.0~1.0.'], ['get_busy', '', '재생 중인지 확인합니다.', 'bool']])
define('pygame.transform', [['scale', 'surface, size', '이미지 크기를 바꿉니다.', 'pygame.Surface'], ['smoothscale', 'surface, size', '부드럽게 크기를 바꿉니다.', 'pygame.Surface'], ['rotate', 'surface, angle', '이미지를 회전합니다.', 'pygame.Surface'], ['flip', 'surface, flip_x, flip_y', '가로·세로로 뒤집습니다.', 'pygame.Surface'], ['rotozoom', 'surface, angle, scale', '회전과 확대·축소.', 'pygame.Surface']])
define('pygame.sprite', [['Sprite', '*groups', '게임 캐릭터의 기본 클래스.', 'pygame.Sprite'], ['Group', '*sprites', '여러 캐릭터를 모읍니다.', 'pygame.Group'], ['spritecollide', 'sprite, group, dokill', '그룹과 충돌한 캐릭터 목록.', 'list[pygame.Sprite]'], ['groupcollide', 'group1, group2, dokill1, dokill2', '두 그룹의 충돌.', 'dict']])
define('pygame.Sprite', [['update', '*args', '캐릭터의 갱신 동작을 정의합니다.'], ['kill', '', '모든 그룹에서 제거합니다.'], ['alive', '', '그룹에 속해 있는지 확인합니다.', 'bool']])
catalog['pygame.Sprite'].image = { label: 'image', type: 'property', ...instance('pygame.Surface'), info: '직접 지정하는 캐릭터 이미지.' }
catalog['pygame.Sprite'].rect = { label: 'rect', type: 'property', ...instance('pygame.Rect'), info: '직접 지정하는 캐릭터 위치.' }
define('pygame.Group', [['add', '*sprites', '캐릭터를 넣습니다.'], ['remove', '*sprites', '캐릭터를 제거합니다.'], ['draw', 'surface', '그룹의 캐릭터들을 그립니다.'], ['update', '*args', '캐릭터의 update를 호출합니다.'], ['sprites', '', '캐릭터 목록.', 'list[pygame.Sprite]'], ['empty', '', '그룹을 비웁니다.']])
for (const path of Object.keys(catalog).filter(key => key.startsWith('pygame.') && /^[a-z]/.test(key.split('.').at(-1)))) {
  const parent = path.slice(0, path.lastIndexOf('.')); catalog[parent][path.split('.').at(-1)] = mod(path)
}
for (const name of ['QUIT', 'KEYDOWN', 'KEYUP', 'MOUSEBUTTONDOWN', 'MOUSEBUTTONUP', 'MOUSEMOTION', 'SRCALPHA', 'RESIZABLE', 'USEREVENT', ...'LEFT RIGHT UP DOWN SPACE ESCAPE RETURN'.split(' ').map(k => `K_${k}`), ...'abcdefghijklmnopqrstuvwxyz0123456789'.split('').map(k => `K_${k}`)]) catalog.pygame[name] = { label: name, type: 'constant', info: 'pygame 상수', ...instance('int') }
catalog['pygame.locals'] = Object.fromEntries(Object.entries(catalog.pygame).filter(([, value]) => value.type === 'constant'))
catalog.pygame.locals = mod('pygame.locals')
catalog['pygame.image'].load.fileKind = 'image'
catalog['pygame.mixer.music'].load.fileKind = 'audio'
catalog['pygame.mixer'].Sound.fileKind = 'audio'
catalog['pygame.font'].Font.fileKind = 'font'
define('random', [['randint', 'a, b', 'a부터 b까지의 정수 하나. 양 끝을 포함합니다.', 'int'], ['choice', 'sequence', '목록에서 하나를 고릅니다.'], ['uniform', 'a, b', '두 수 사이의 소수.', 'float'], ['random', '', '0 이상 1 미만의 소수.', 'float'], ['shuffle', 'sequence', '목록 순서를 무작위로 섞습니다.'], ['sample', 'population, k', '중복 없이 k개를 고릅니다.', 'list'], ['seed', 'value=None', '난수의 시작값을 설정합니다.']])
define('math', [['sqrt', 'x', '제곱근.', 'float'], ['sin', 'x', '사인. 각도는 라디안.', 'float'], ['cos', 'x', '코사인. 각도는 라디안.', 'float'], ['radians', 'degrees', '도를 라디안으로 바꿉니다.', 'float'], ['degrees', 'radians', '라디안을 도로 바꿉니다.', 'float'], ['hypot', '*coordinates', '거리 계산.', 'float'], ['ceil', 'x', '올림.', 'int'], ['floor', 'x', '내림.', 'int']])
for (const name of ['pi', 'e', 'tau', 'inf']) catalog.math[name] = { label: name, type: 'constant', ...instance('float'), info: '수학 상수' }
define('asyncio', [['sleep', 'delay', 'await asyncio.sleep(0)은 브라우저에 화면을 갱신할 시간을 줍니다.'], ['run', 'coroutine', '비동기 함수를 실행합니다.']])
export const modules = ['turtle', 'ColabTurtlePlus', 'pygame', 'random', 'math', 'asyncio'].map(mod)
export const colors = ['black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'gray', 'brown', 'deepskyblue', 'saddlebrown', 'peru', 'firebrick', 'seagreen', 'mediumseagreen', 'gold', 'cyan', 'navy', 'lime', 'lightblue']
