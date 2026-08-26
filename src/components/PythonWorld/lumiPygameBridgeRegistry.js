export const PYGAME_BRIDGE_REGISTRY = Object.freeze({
  // ACT 0 · Awakening
  'wake-init': {
    lumiCode: 'lumi.wake()',
    pygameCode: 'pygame.init()',
    commonIdea: '잠들어 있는 엔진의 전원을 켜고 통신을 개시한다.',
  },
  'move-forward': {
    lumiCode: 'lumi.move(1)',
    pygameCode: 'player.x += 1',
    commonIdea: '전달한 숫자 크기만큼 엔티티를 앞으로 전진시킨다.',
  },
  'turn-navigate': {
    lumiCode: 'lumi.move(2)\nlumi.turn(90)\nlumi.move(1)',
    pygameCode: 'player.forward(2)\nplayer.angle += 90\nplayer.forward(1)',
    commonIdea: '회전과 이동을 결합하여 2차원 공간을 자유롭게 항법한다.',
  },
  'say-text': {
    lumiCode: 'lumi.say("신호 수신")',
    pygameCode: 'font.render("신호 수신", ...)',
    commonIdea: '큰따옴표 안의 문자열 데이터를 화면이나 로그로 전송한다.',
  },
  'sequential-clear': {
    lumiCode: 'lumi.move(2)\nlumi.turn(90)\nlumi.move(2)\nlumi.say("비콘 도착")',
    pygameCode: 'def mission_clear(): ...',
    commonIdea: '여러 동작과 메시지 출력을 순차적으로 조합하여 종합 임무를 완주한다.',
  },

  // ACT 1 · Command
  'import-module': {
    lumiCode: 'from msense import lumi\nlumi.move(2)',
    pygameCode: 'import pygame\nplayer.x += 2',
    commonIdea: '모듈을 불러와(import) 게임 캐릭터를 이동시킨다.',
  },
  'expr-math': {
    lumiCode: 'lumi.move(2 + 3)',
    pygameCode: 'player.x += 2 + 3',
    commonIdea: '연산식(2 + 3)의 결과를 이동 거리 인자로 넘긴다.',
  },
  'comment-debug': {
    lumiCode: '# lumi.move(4)\nlumi.turn(90)',
    pygameCode: '# player.speed = 100\nplayer.turn(90)',
    commonIdea: '버그나 위험 명령을 주석(#)으로 비활성화하고 디버깅한다.',
  },

  // ACT 2 · Memory & HUD
  'hud-callsign': {
    lumiCode: 'pilot_name = "NOVA"\ngame.text.render(pilot_name, position="top-left")',
    pygameCode: 'pilot_name = "NOVA"\nscreen.blit(font.render(pilot_name, True, (0, 240, 255)), (20, 20))',
    commonIdea: '기억한 호출부호 변수 값을 HUD 텍스트로 화면에 표시한다.',
  },
  'skin-reuse': {
    lumiCode: 'ship_image = "lumi_blue"\ngame.screen.blit(ship_image, (2, 2))\ngame.text.render(ship_image, "bottom")',
    pygameCode: 'ship_image = "lumi_blue.png"\nscreen.blit(ship_image, (100, 100))\nscreen.blit(font.render(ship_image, ...))',
    commonIdea: '하나의 변수에 담긴 이미지 이름을 이미지 배치와 HUD에 두 번 재사용한다.',
  },
  'gauge-update': {
    lumiCode: 'shield = 5\nshield = shield - 2\ngame.hud.bar("SHIELD", shield, maximum=5)',
    pygameCode: 'shield = 5\nshield -= 2\npygame.draw.rect(screen, (0,150,255), (10, 10, shield * 20, 15))',
    commonIdea: '연산으로 바뀐 변수 값을 화면 게이지의 길이로 즉시 시각화한다.',
  },
  'memory-type': {
    lumiCode: 'val_type = type(100)\nlumi.say(val_type)',
    pygameCode: 'print(type(player.speed))',
    commonIdea: '변수의 데이터 타입을 확인하여 올바른 게임 로직에 연결한다.',
  },
  'memory-fstring': {
    lumiCode: 'msg = f"ENERGY {energy}"\nlumi.say(msg)',
    pygameCode: 'hud_text = f"HP: {player.hp}/{player.max_hp}"',
    commonIdea: '문자열 포맷팅으로 게임 상태 변수들을 직관적인 HUD 텍스트로 조립한다.',
  },
  'memory-input': {
    lumiCode: 'steps = int(input("이동 신호"))\nlumi.move(steps)',
    pygameCode: 'speed = int(event.unicode)',
    commonIdea: '외부에서 들어온 문자열 입력을 정수로 변환하여 게임 수치로 적용한다.',
  },

  // ACT 3 · Sensor
  'sensor-distance': {
    lumiCode: 'distance = world.steps_to_target\nlumi.move(distance)',
    pygameCode: 'distance = get_target_dist(player, target)\nplayer.move(distance)',
    commonIdea: '매 프레임 달라지는 센서 거리를 변수로 읽어 유연하게 이동한다.',
  },
  'sensor-boolean': {
    lumiCode: 'route_open = world.path_clear\nlumi.say(route_open)',
    pygameCode: 'is_safe = check_raycast(player.pos)\ndraw_hud_indicator(is_safe)',
    commonIdea: 'True/False 불리언 센서 판독 상태를 HUD 인디케이터에 반영한다.',
  },

  // ACT 4 · Decision
  'condition-basic': {
    lumiCode: 'if lumi.energy < 30:\n    lumi.charge()',
    pygameCode: 'if player.energy < 30:\n    player.recharge()',
    commonIdea: '에너지가 부족한 특정 조건에서만 안전 행동을 분기 실행한다.',
  },
  'condition-branch': {
    lumiCode: 'if world.path_clear:\n    lumi.move(world.target_distance)\nelse:\n    lumi.say("대기")',
    pygameCode: 'if path_clear:\n    player.forward()\nelse:\n    player.wait()',
    commonIdea: '조건이 참일 때와 거짓일 때의 행동을 if/else 양갈래로 분기한다.',
  },
  'condition-multi': {
    lumiCode: 'if distance <= 2:\n    lumi.shield()\nelif distance <= 4:\n    lumi.dodge()\nelse:\n    lumi.move(1)',
    pygameCode: 'if dist <= 2:\n    player.shield()\nelif dist <= 4:\n    player.dodge()\nelse:\n    player.move()',
    commonIdea: '적과의 거리에 따라 세 단계(근접·중거리·안전)로 방어/회피/전진을 선택한다.',
  },
  'condition-coordinate': {
    lumiCode: 'if target_x < lumi.x:\n    lumi.turn(180)\nlumi.move(1)',
    pygameCode: 'if target.x < player.x:\n    player.face_left()\nplayer.move()',
    commonIdea: '목표와 나의 상대 좌표를 비교해 이동 방향을 결정한다.',
  },
  'condition-compound': {
    lumiCode: 'if (lumi.energy >= distance and distance <= 6) or world.emergency:\n    lumi.move(distance)',
    pygameCode: 'if (energy >= dist and dist <= 6) or emergency:\n    player.move()',
    commonIdea: 'and와 or 논리 연산자로 복합 안전 조건을 결합한다.',
  },
  'condition-field': {
    lumiCode: 'if world.incoming_pulse:\n    lumi.shield()\nelif world.path_clear:\n    lumi.move(1)',
    pygameCode: 'def update_ai():\n    if incoming_pulse: shield()\n    elif path_clear: move()',
    commonIdea: '적 펄스 감지와 항로 상태를 종합하여 실시간 자율 판단을 수행한다.',
  },

  // ACT 5 · Automation
  'loop-range': {
    lumiCode: 'for step in range(3):\n    lumi.move(1)',
    pygameCode: 'for i in range(3):\n    spawn_particle()',
    commonIdea: '반복 횟수를 range로 지정해 정해진 횟수만큼 동작을 자동화한다.',
  },
  'loop-nested': {
    lumiCode: 'for r in range(3):\n    for c in range(3):\n        scan()',
    pygameCode: 'for y in range(map_h):\n    for x in range(map_w):\n        draw_tile(x, y)',
    commonIdea: '2차원 격자(행과 열)를 2중 for 루프로 순회 탐사한다.',
  },

  // ACT 6 · Persistence
  'loop-while': {
    lumiCode: 'while world.target_distance > 0:\n    lumi.move(1)',
    pygameCode: 'while player.distance_to(target) > 0:\n    player.step()',
    commonIdea: '목적지에 도달할 때까지 조건이 참인 동안 행동을 지속한다.',
  },
  'loop-break': {
    lumiCode: 'while True:\n    if obstacle_ahead:\n        break\n    lumi.move(1)',
    pygameCode: 'while running:\n    if hit_wall:\n        break\n    player.update()',
    commonIdea: '반복 중 긴급 위험이나 종료 조건을 감지하면 break로 루프를 즉시 탈출한다.',
  },
  'loop-continue': {
    lumiCode: 'for item in items:\n    if item.is_noise:\n        continue\n    lumi.collect(item)',
    pygameCode: 'for entity in entities:\n    if not entity.alive:\n        continue\n    entity.render()',
    commonIdea: '불필요하거나 손상된 항목을 continue로 건너뛰고 다음 항목 처리를 이어간다.',
  },
  'loop-game': {
    lumiCode: 'while game.running:\n    game.clock.tick(10)',
    pygameCode: 'while running:\n    handle_input()\n    update()\n    clock.tick(60)',
    commonIdea: '게임이 실행 중인 동안 프레임마다 입력을 읽고 행동한 뒤 시계를 맞춘다.',
  },

  // ACT 7 · Data
  'data-list': {
    lumiCode: 'signals = ["ALPHA", "BETA", "GAMMA"]',
    pygameCode: 'enemies = [Enemy(1), Enemy(2), Enemy(3)]',
    commonIdea: '여러 개의 게임 데이터나 오브젝트를 하나의 list 컨테이너에 보관한다.',
  },
  'data-index': {
    lumiCode: 'first_item = inventory[0]',
    pygameCode: 'active_slot = inventory[selected_idx]',
    commonIdea: '인덱스 번호(0, 1, 2)로 리스트의 특정 슬롯 아이템에 접근한다.',
  },
  'data-methods': {
    lumiCode: 'inventory.append("item")\nused = inventory.pop(0)',
    pygameCode: 'inventory.append(item)\nactive = inventory.pop()',
    commonIdea: '인벤토리에 새 아이템을 넣고(append) 사용한 아이템을 제거(pop)한다.',
  },
  'data-string': {
    lumiCode: 'packet = "ALPHA|BETA"\nsignals = packet.split("|")',
    pygameCode: 'level_data = raw_string.split(",")',
    commonIdea: '원격 텔레메트리 문자열을 split과 join으로 구조화된 리스트와 교환한다.',
  },
  'data-tuple': {
    lumiCode: 'spawn_pos = (4, 2)',
    pygameCode: 'rect.center = (screen_w // 2, screen_h // 2)',
    commonIdea: '변경되지 않아야 하는 고정 좌표(x, y)를 불변 tuple로 보호한다.',
  },
  'data-dict': {
    lumiCode: 'stats = {"energy": 80, "shield": 5}',
    pygameCode: 'player_stats = {"hp": 100, "attack": 25}',
    commonIdea: '이름표(Key)로 상태 값(Value)을 직관적으로 조회하고 관리한다.',
  },

  // ACT 8 · Ability & Functions
  'function-def': {
    lumiCode: 'def move_to_beacon():\n    lumi.move(world.target_distance)\n\nmove_to_beacon()',
    pygameCode: 'def move_player():\n    player.x += speed\n\nmove_player()',
    commonIdea: '자주 쓰이는 행동을 함수로 묶어 필요할 때 이름으로 호출한다.',
  },
  'function-param': {
    lumiCode: 'def travel(distance):\n    lumi.move(distance)',
    pygameCode: 'def fire_bullet(speed, angle):\n    spawn_bullet(speed, angle)',
    commonIdea: '매개변수를 전달받아 상황에 따라 유연하게 달라지는 함수를 만든다.',
  },
  'function-return': {
    lumiCode: 'def is_safe(dist):\n    return dist >= 3',
    pygameCode: 'def can_move(x, y):\n    return not is_wall(x, y)',
    commonIdea: '함수 내부의 판단 결과를 return으로 호출자에게 반환한다.',
  },
  'function-scope': {
    lumiCode: 'def compute_bonus():\n    local_power = 10\n    return local_power',
    pygameCode: 'def calc_damage():\n    temp_dmg = base + roll()\n    return temp_dmg',
    commonIdea: '함수 안에서 만든 지역 변수는 함수가 끝나면 안전하게 소멸되어 전역을 오염시키지 않는다.',
  },
  'function-module': {
    lumiCode: 'def detect(): ...\ndef act(): ...\nif detect(): act()',
    pygameCode: 'def check_input(): ...\ndef update_physics(): ...\ndef render(): ...',
    commonIdea: '감지, 판단, 행동을 작은 독립 함수들로 분리하여 거대한 게임 시스템을 조립한다.',
  },
})

export function getLumiPygameBridge(mission) {
  if (!mission) return null
  if (mission.pygameBridgeKey && PYGAME_BRIDGE_REGISTRY[mission.pygameBridgeKey]) {
    return PYGAME_BRIDGE_REGISTRY[mission.pygameBridgeKey]
  }
  if (mission.pygameBridge) {
    return mission.pygameBridge
  }
  return null
}
