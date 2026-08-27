const SOLUTIONS = Object.freeze({
  // ACT 0 · Awakening
  'lumi-vs-01': `lumi.wake()`,
  'lumi-vs-02': `lumi.move(1)`,
  'lumi-vs-03': `lumi.move(3)`,
  'lumi-vs-04': `lumi.move(2)
lumi.turn(90)
lumi.move(1)`,
  'lumi-vs-05': `lumi.say("신호 수신")`,
  'lumi-vs-06': `lumi.wake()
lumi.turn(-50)
lumi.move(4.2)
lumi.turn(40)
lumi.move(3.0)
lumi.say("비콘 도착!")`,
  'lumi-vs-07': `steps = 3
lumi.move(steps)`,
  'lumi-vs-08': `energy = 5
energy = energy - 2
lumi.say(energy)`,
  'lumi-vs-09': `steps = world.steps_to_target
lumi.move(steps)`,
  'lumi-vs-10': `if world.path_clear:
    lumi.move(world.steps_to_target)`,

  // ACT 1 · Command Core
  'lumi-act1-01': `from msense import lumi

lumi.move(2)`,
  'lumi-act1-02': `from msense import lumi

lumi.move(1)
lumi.turn(90)
lumi.move(2)
lumi.turn(-90)
lumi.move(3)`,
  'lumi-act1-03': `from msense import lumi

lumi.move(2 + 3)`,
  'lumi-act1-04': `from msense import lumi

print("LUMI ONLINE")
lumi.move(3)`,
  'lumi-act1-05': `from msense import lumi

# 위험한 직진 명령은 실행하지 않습니다.
# lumi.move(4)

lumi.turn(90)
lumi.move(2)
lumi.turn(-90)
lumi.move(3)`,
  'lumi-act1-06': `from msense import lumi

print("COMMAND CORE 100%")
lumi.move(1 + 2)
lumi.turn(90)
lumi.move(2)
lumi.turn(-90)
lumi.move(2)`,

  // ACT 2 · Memory Core (v2 Game Enrichment)
  'lumi-act2-01': `from msense import lumi

callsign = "NOVA"
lumi.say(callsign)`,
  'lumi-act2-02': `from msense import lumi

power = 10
lumi.say(power)`,
  'lumi-act2-03': `from msense import lumi

shield = 5
shield = shield - 2
lumi.say(shield)`,

  // ACT 2 · Memory Core (Legacy)
  'lumi-act2-01-legacy': `from msense import lumi

steps = 3
lumi.move(steps)`,
  'lumi-act2-02-legacy': `from msense import lumi

target_steps = 4
lumi.move(target_steps)`,
  'lumi-act2-03-legacy': `from msense import lumi

energy = 5
energy = energy - 2
lumi.move(energy)`,
  'lumi-act2-04': `from msense import lumi

val_type = type(100)
lumi.say(val_type)
lumi.move(3)`,
  'lumi-act2-05': `from msense import lumi

energy = 100
msg = f"ENERGY {energy}"
lumi.say(msg)
lumi.move(3)`,
  'lumi-act2-06': `from msense import lumi

steps_text = input("이동할 칸 수를 입력하세요: ")
steps = int(steps_text)
lumi.move(steps)`,

  // Vertical Slice Gameplay Enrichment Set (5 Slices)
  'lumi-vs-game-01': `from msense import game

game.init()
game.screen.blit("lumi_blue", position=(2, 2))
game.draw.circle("#38bdf8", (2, 2), 2)
game.quit()`,
  'lumi-vs-game-02': `from msense import game

shield = 5
shield = shield - 2
game.hud.bar("SHIELD", shield, maximum=5)
game.sound.play("shield")`,
  'lumi-vs-game-03': `from msense import game

right_pressed = game.key.pressed("RIGHT")
if right_pressed:
    game.text.render("KEY: RIGHT", position="bottom")`,
  'lumi-vs-game-04': `from msense import lumi, world, game

if world.incoming_pulse:
    lumi.shield()
    game.sound.play("shield")`,
  'lumi-vs-game-05': `from msense import lumi, world, game

game.init()
while game.running:
    if world.incoming_pulse:
        lumi.shield()
    if game.key.pressed("RIGHT"):
        lumi.move(1)
    game.clock.tick(10)
game.quit()`,

  // ACT 3 · Sensor Core
  'lumi-sensor-3-01': `from msense import lumi, world

distance = world.target_distance
lumi.move(distance)`,
  'lumi-sensor-3-02': `from msense import lumi, world

route_open = world.path_clear
lumi.say(route_open)`,
  'lumi-sensor-3-03': `from msense import lumi, world

obstacle_distance = world.obstacle_ahead_distance
lumi.say(obstacle_distance)`,
  'lumi-sensor-3-04': `from msense import lumi, world

safe_distance = world.obstacle_ahead_distance >= 3
lumi.say(safe_distance)`,
  'lumi-sensor-3-05': `from msense import lumi, world

can_depart = world.path_clear and (world.obstacle_ahead_distance > world.target_distance)
lumi.say(can_depart)`,

  // ACT 4 · Decision Core
  'if-charge-01': `from msense import lumi

if lumi.energy < 30:
    lumi.charge()`,
  'if-launch-02': `from msense import lumi, world

if world.path_clear:
    lumi.move(world.target_distance)
else:
    lumi.say("대기")`,
  'if-signal-03': `from msense import lumi, world

dist = world.obstacle_ahead_distance
if dist <= 2:
    lumi.shield()
elif dist <= 4:
    lumi.dodge()
else:
    lumi.move(1)`,
  'if-route-04': `from msense import lumi, world

target_x = world.target_x
if target_x < lumi.x:
    lumi.turn(180)
lumi.move(world.target_distance)`,
  'if-dual-05': `from msense import lumi, world

distance = world.target_distance
if (lumi.energy >= distance and distance <= 6) or world.emergency:
    lumi.move(distance)`,
  'if-rescue-06': `from msense import lumi, world

if lumi.energy < 20:
    lumi.charge()
if world.incoming_pulse:
    lumi.shield()
lumi.move(world.target_distance)`,

  // ACT 5 · Automation Core
  'lumi-automation-5-01': `from msense import lumi

for step in range(3):
    lumi.move(1)`,
  'lumi-automation-5-02': `from msense import lumi, world

distance = world.target_distance
for step in range(distance):
    lumi.move(1)`,
  'lumi-automation-5-03': `from msense import lumi, world

row_count = world.survey_rows
for step in range(row_count):
    lumi.say(step)`,
  'lumi-automation-5-04': `from msense import world

signal_count = world.survey_columns
total = 0
for energy in range(1, signal_count + 1):
    total = total + energy
print(total)`,
  'lumi-automation-5-05': `from msense import lumi

signals = lumi.scan()
for signal in signals:
    lumi.collect(signal)`,
  'lumi-automation-5-06': `from msense import lumi, world

side_length = world.target_distance
for side in range(4):
    for step in range(side_length):
        lumi.move(1)
    lumi.turn(90)`,
  'lumi-automation-5-07': `from msense import lumi, world

rows = world.survey_rows
columns = world.survey_columns
cells = 0
for row in range(rows):
    for column in range(columns):
        cells = cells + 1
lumi.say(cells)`,

  // ACT 6 · Persistence Core
  'while-approach-01': `from msense import lumi, world

while world.target_distance > 0:
    lumi.move(1)`,
  'while-charge-02': `from msense import lumi, world

while lumi.energy < 50:
    lumi.charge()
lumi.move(world.target_distance)`,
  'while-collect-03': `from msense import lumi, world

while world.signal_count > 0:
    lumi.collect()`,
  'while-countdown-04': `count = 3
while count > 0:
    print(count)
    count = count - 1
print("LAUNCH")`,
  'while-break-05': `from msense import lumi, world

while True:
    obstacle_dist = world.obstacle_ahead_distance
    if obstacle_dist <= 1:
        break
    lumi.move(1)`,
  'while-continue-06': `from msense import lumi

signals = lumi.scan()
for sig in signals:
    if sig.kind == "noise":
        continue
    lumi.collect(sig)`,
  'while-rescue-07': `from msense import game, lumi, world

game.init()
while game.running and world.target_distance > 0:
    lumi.move(1)
    game.clock.tick(10)
game.quit()`,

  // ACT 7 · Data Core (10 Missions)
  'lumi-data-7-01': `from msense import world

signals = world.signals
print(len(signals))`,
  'lumi-data-7-02': `from msense import world

items = world.inventory_items
first_item = items[0]
last_item = items[-1]
print(first_item)
print(last_item)`,
  'lumi-data-7-03': `from msense import world

items = world.inventory_items
items.append("radar")
print(len(items))`,
  'lumi-data-7-04': `from msense import world

cells = world.battery_cells
used = cells.pop()
print(used)`,
  'lumi-data-7-05': `from msense import world

items = world.inventory_items
for item in items:
    print(item)`,
  'lumi-data-7-06': `from msense import world

packet = world.data_packet
signals = packet.split("|")
print(len(signals))`,
  'lumi-data-7-07': `from msense import world

signals = world.signals
message = "-".join(signals)
print(message)`,
  'lumi-data-7-08': `from msense import world

target_pos = world.target_pos
print(target_pos)`,
  'lumi-data-7-09': `from msense import world

stats = world.status_data
energy_val = stats["energy"]
print(energy_val)`,
  'lumi-data-7-10': `from msense import world

raw_packet = world.data_packet
pairs = raw_packet.split("|")
telemetry = {}
for pair in pairs:
    parts = pair.split(":")
    k = parts[0]
    v = parts[1]
    telemetry[k] = v
print(telemetry["STATUS"])`,

  // ACT 8 · Ability Core (7 Missions)
  'function-move-01': `from msense import lumi, world

def move_to_beacon():
    lumi.move(world.target_distance)

move_to_beacon()`,
  'function-parameter-02': `from msense import lumi, world

def travel(distance):
    lumi.move(distance)

travel(world.target_distance)`,
  'function-return-03': `from msense import lumi

def is_safe():
    return lumi.energy >= 30

if is_safe():
    print("SAFE")`,
  'function-collect-04': `from msense import lumi

def rescue(signal):
    if signal.priority >= 3:
        lumi.collect(signal)

for sig in lumi.scan():
    rescue(sig)`,
  'function-scope-05': `def calc_shield():
    local_bonus = 10
    return local_bonus

total_power = calc_shield()
print(total_power)`,
  'function-multi-06': `from msense import lumi

def check_energy():
    return lumi.energy < 30

def handle_charge():
    lumi.charge()

if check_energy():
    handle_charge()`,
  'function-field-07': `from msense import lumi, world

def detect_threat():
    return world.incoming_pulse

def choose_action(threat):
    if threat:
        lumi.shield()

def navigate(distance):
    lumi.move(distance)

threat = detect_threat()
choose_action(threat)
navigate(world.target_distance)`,

  // ACT 9 · Object Core
  'lumi-object-9-01': `print(type(lumi))`,
  'lumi-object-9-02': `class Drone:
    pass`,
  'lumi-object-9-03': `class Drone:
    pass

scout_1 = Drone()
scout_2 = Drone()`,
  'lumi-object-9-04': `class Drone:
    def __init__(self, name, integrity):
        self.name = name
        self.integrity = integrity

scout_1 = Drone("ALPHA", 20)
scout_2 = Drone("BETA", 40)`,
  'lumi-object-9-05': `class Drone:
    def __init__(self, name, integrity):
        self.name = name
        self.integrity = integrity

    def charge(self, amount):
        self.integrity += amount

scout_1 = Drone("ALPHA", 20)
scout_2 = Drone("BETA", 20)
scout_1.charge(10)`,
  'lumi-object-9-06': `class Drone:
    def __init__(self, name, integrity):
        self.name = name
        self.integrity = integrity

    def repair(self, amount):
        self.integrity += amount

scout = Drone("ALPHA", 10)
scout.repair(15)`,
  'lumi-object-9-07': `class Drone:
    def __init__(self, name, integrity):
        self.name = name
        self.integrity = integrity

    def charge(self, amount):
        self.integrity += amount

d1 = Drone("D-1", 10)
d2 = Drone("D-2", 10)
d3 = Drone("D-3", 10)
fleet = [d1, d2, d3]

for drone in fleet:
    drone.charge(20)`,
  'lumi-object-9-f': `class Drone:
    def __init__(self, name, integrity):
        self.name = name
        self.integrity = integrity

    def recharge(self, amount):
        self.integrity += amount

fleet = []
for spec in world.entity_specs:
    fleet.append(Drone(spec["name"], spec["integrity"]))

for drone in fleet:
    drone.recharge(30)`,

  // FINAL · The Lost Light
  'lumi-lost-light-f-01': `signals = world.entity_specs

def find_urgent(signal_list):
    urgent = signal_list[0]
    for s in signal_list:
        if s["corruption"] > urgent["corruption"]:
            urgent = s
    return urgent["name"]

target_name = find_urgent(signals)`,
  'lumi-lost-light-f-02': `from msense import lumi, world

while world.target_distance > 0:
    if world.threat_type == "pulse":
        lumi.shield()
    elif world.threat_type == "mine":
        lumi.dodge()
    elif lumi.energy < 20:
        lumi.charge()
    else:
        lumi.move(1)`,
  'lumi-lost-light-f-03': `class Drone:
    def __init__(self, name, corruption):
        self.name = name
        self.corruption = corruption

    def purify(self, amount):
        if self.corruption > amount:
            self.corruption = self.corruption - amount
        else:
            self.corruption = 0

specs = world.entity_specs
fleet = []
for s in specs:
    fleet.append(Drone(s["name"], s["corruption"]))

for d in fleet:
    d.purify(30)`,
  'lumi-lost-light-f-04': `class RelayBeacon:
    def __init__(self, name, power):
        self.name = name
        self.power = power
        self.active = False

    def activate(self):
        if self.power >= 50:
            self.active = True

beacons = [RelayBeacon("ALPHA", 60), RelayBeacon("BETA", 80), RelayBeacon("GAMMA", 100)]
for b in beacons:
    b.activate()`,

  // Student beta / optional object labs
  'pilot-object-9-1': `print(type(lumi))`,
  'pilot-object-9-2': `class Drone:
    pass`,
  'pilot-object-9-3': `class Drone:
    pass

scout = Drone()`,
  'pilot-object-9-4': `class Drone:
    def __init__(self, name, integrity):
        self.name = name
        self.integrity = integrity

scout_1 = Drone("ALPHA", 20)
scout_2 = Drone("BETA", 40)`,
  'pilot-object-9-5': `class Drone:
    def __init__(self, name, integrity):
        self.name = name
        self.integrity = integrity

    def charge(self, amount):
        self.integrity += amount

scout_1 = Drone("ALPHA", 20)
scout_2 = Drone("BETA", 20)
scout_1.charge(10)`,
  'pilot-object-transfer-1': `class Pet:
    def __init__(self, name, energy):
        self.name = name
        self.energy = energy

    def feed(self, amount):
        self.energy += amount

p1 = Pet("MOMO", 50)
p2 = Pet("COCO", 50)
p1.feed(20)`,
  'pilot-tactical-3-01': `class Drone:
    def __init__(self, name, corruption):
        self.name = name
        self.corruption = corruption

    def purify_signal(self, amount):
        self.corruption = self.corruption - amount

squad = []
for spec in world.entity_specs:
    squad.append(Drone(spec["name"], spec["corruption"]))

for drone in squad:
    drone.purify_signal(drone.corruption)`,
  'pilot-frontier-xf-01': `class Drone:
    def __init__(self, name, integrity):
        self.name = name
        self.integrity = integrity

    def charge(self, amount):
        self.integrity += amount

class ScoutDrone(Drone):
    pass

s = ScoutDrone("ALPHA", 20)
s.charge(10)`,
  'pilot-frontier-xf-02': `class Drone:
    def __init__(self, name, integrity):
        self.name = name
        self.integrity = integrity

    def charge(self, amount):
        self.integrity += amount

class TurboDrone(Drone):
    def charge(self, amount):
        self.integrity += amount * 2

t = TurboDrone("TURBO-1", 20)
t.charge(10)`,
  'pilot-frontier-xf-03': `class Battery:
    def __init__(self, capacity):
        self.capacity = capacity

    def charge(self, amount):
        self.capacity += amount

class Drone:
    def __init__(self, name, battery_capacity):
        self.name = name
        self.battery = Battery(battery_capacity)

d = Drone("ALPHA", 50)
d.battery.charge(30)`,
})

function looksIncomplete(code = '') {
  return /\bTODO\b|_{3,}|\?\)|(^|\n)\s*pass\s*(#.*)?$/m.test(String(code))
}

export function getLumiSolutionBody(mission = {}) {
  if (mission?.solutionCode) return String(mission.solutionCode).trim()
  if (SOLUTIONS[mission?.id]) return SOLUTIONS[mission.id].trim()
  if (mission?.codeName && SOLUTIONS[mission.codeName]) return SOLUTIONS[mission.codeName].trim()
  if (Array.isArray(mission?.aliases)) {
    for (const alias of mission.aliases) {
      if (SOLUTIONS[alias]) return SOLUTIONS[alias].trim()
    }
  }
  const explicit = String(mission?.solutionCode || SOLUTIONS[mission?.id] || '').trim()
  if (explicit) return explicit

  const starter = String(mission?.starterCode || '').trim()
  return starter && !looksIncomplete(starter) ? starter : ''
}

export function getLumiSolutionDuration(code = '') {
  const lines = String(code).split('\n').filter((line) => line.trim()).length
  const characters = String(code).length
  return Math.max(20_000, Math.min(60_000, 16_000 + (lines * 1_100) + (characters * 18)))
}

export function hasLumiSolution(mission = {}) {
  return Boolean(getLumiSolutionBody(mission))
}
