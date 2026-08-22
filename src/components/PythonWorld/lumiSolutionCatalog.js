const SOLUTIONS = Object.freeze({
  // ACT 0 · Awakening
  'lumi-vs-01': `lumi.wake()`,
  'lumi-vs-02': `lumi.move(1)`,
  'lumi-vs-03': `lumi.move(3)`,
  'lumi-vs-04': `lumi.move(2)
lumi.turn(90)
lumi.move(1)`,
  'lumi-vs-05': `lumi.say("신호 수신")`,
  'lumi-vs-06': `lumi.move(2)
lumi.turn(90)
lumi.move(2)
lumi.say("비콘 도착")`,
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
  'lumi-act1-01': `lumi.move(2)
lumi.turn(90)
lumi.move(2)`,
  'lumi-act1-02': `lumi.move(2 + 3)`,
  'lumi-act1-03': `print("LUMI ONLINE")
lumi.move(3)`,
  'lumi-act1-04': `from metasense import lumi, world

# 위험한 직진 명령은 실행하지 않습니다.
# lumi.move(4)

lumi.turn(90)
lumi.move(2)
lumi.turn(-90)
lumi.move(world.target_distance)`,
  'lumi-act1-05': `from metasense import lumi, world

print("COMMAND CORE 100%")
lumi.move(1 + 2)
lumi.turn(90)
lumi.move(2)
lumi.turn(-90)
lumi.move(world.target_distance)`,

  // ACT 2 · Memory Core
  'lumi-act2-01': `steps = 3
lumi.move(steps)`,
  'lumi-act2-02': `target_steps = 4
lumi.move(target_steps)`,
  'lumi-act2-03': `energy = 5
energy = energy - 2

# 실제 항로가 바뀌어도 도착하도록 현재 거리를 사용합니다.
distance = world.target_distance
lumi.move(distance)`,
  'lumi-act2-04': `val_type = type(100)
lumi.say(val_type)
lumi.move(3)`,
  'lumi-act2-05': `energy = 100
msg = f"ENERGY {energy}"
lumi.say(msg)
lumi.move(3)`,
  'lumi-act2-06': `steps_text = input("이동 신호")
steps = int(steps_text)
lumi.move(steps)`,

  // ACT 3 · Sensor Core
  'lumi-sensor-3-01': `distance = world.steps_to_target
lumi.move(distance)`,
  'lumi-sensor-3-02': `route_open = world.path_clear
lumi.say(route_open)`,
  'lumi-sensor-3-03': `obstacle_distance = world.obstacle_ahead_distance
lumi.say(obstacle_distance)`,
  'lumi-sensor-3-04': `safe_distance = world.obstacle_ahead_distance >= 3
lumi.say(safe_distance)`,
  'lumi-sensor-3-05': `can_depart = (
    world.path_clear
    and world.obstacle_ahead_distance > world.steps_to_target
)
lumi.say(can_depart)`,

  // ACT 4 · Decision Core
  'if-charge-01': `from metasense import lumi

if lumi.energy < 30:
    lumi.charge()`,
  'if-launch-02': `from metasense import lumi, world

distance = world.target_distance
if lumi.energy >= distance:
    lumi.move(distance)`,
  'if-signal-03': `from metasense import lumi

objects = lumi.scan()
for obj in objects:
    if obj.strength >= 5:
        lumi.collect(obj)`,
  'if-route-04': `from metasense import lumi, world

if world.snapshot()["target"]["x"] < lumi.x:
    lumi.turn(180)

lumi.move(world.target_distance)`,
  'if-dual-05': `from metasense import lumi, world

distance = world.target_distance
if lumi.energy >= distance and distance <= 6:
    lumi.move(distance)`,
  'if-rescue-06': `from metasense import lumi, world

if lumi.energy < world.target_distance:
    lumi.charge()

for obj in lumi.scan():
    if obj.kind == "signal" and obj.priority >= 3:
        lumi.collect(obj)

lumi.move(world.target_distance)`,

  // ACT 5 · Automation Core
  'lumi-automation-5-01': `for step in range(3):
    lumi.move(1)`,
  'lumi-automation-5-02': `distance = world.steps_to_target
for step in range(distance):
    lumi.move(1)`,
  'lumi-automation-5-03': `row_count = world.survey_rows
for step in range(row_count):
    lumi.say(step)`,
  'lumi-automation-5-04': `signal_count = world.survey_columns
total = 0

for energy in range(1, signal_count + 1):
    total = total + energy

print(total)`,
  'lumi-automation-5-05': `signals = lumi.scan()

for signal in signals:
    lumi.collect(signal)`,
  'lumi-automation-5-06': `side_length = world.steps_to_target

for side in range(4):
    for step in range(side_length):
        lumi.move(1)
    lumi.turn(90)`,
  'lumi-automation-5-07': `rows = world.survey_rows
columns = world.survey_columns
cells = 0

for row in range(rows):
    for column in range(columns):
        cells = cells + 1

lumi.say(cells)`,

  // ACT 6 · Persistence Core
  'while-approach-01': `from metasense import lumi, world

# target_distance는 이동할 때마다 다시 계산되는 현재 거리입니다.
while world.target_distance > 0:
    lumi.move(1)`,
  'while-charge-02': `from metasense import lumi, world

while lumi.energy < 50:
    lumi.charge()

lumi.move(world.target_distance)`,
  'while-collect-03': `from metasense import lumi, world

# 수집할 때마다 world.objects에서 해당 신호가 사라집니다.
while world.objects:
    obj = world.objects[0]
    lumi.collect(obj)`,
  'while-countdown-04': `count = 3

while count > 0:
    print(count)
    count = count - 1

print("LAUNCH")`,
  'while-energy-05': `from metasense import lumi, world

while lumi.energy > 0 and world.target_distance > 0:
    lumi.move(1)`,
  'while-rescue-06': `from metasense import lumi, world

# 첫 번째 반복: 남은 신호를 모두 회수합니다.
while world.objects:
    signal = world.objects[0]
    lumi.collect(signal)

# 두 번째 반복: 현재 거리를 매번 다시 확인하며 이동합니다.
while world.target_distance > 0:
    lumi.move(1)`,

  // ACT 7 · Data Core
  'lumi-data-7-01': `signals = ["ALPHA", "BETA", "GAMMA"]
print(len(signals))`,
  'lumi-data-7-02': `packet = "ALPHA|BETA|GAMMA"
signals = packet.split("|")
print(len(signals))`,
  'lumi-data-7-03': `signals = ["ALPHA", "BETA", "GAMMA"]
message = "-".join(signals)
print(message)`,
  'lumi-data-7-04': `target = (4, 2)
print(target)`,
  'lumi-data-7-05': `status = {"name": "LUMI", "energy": 80}
print(status.get("energy", 0))`,

  // ACT 8 · Ability Core
  'function-move-01': `from metasense import lumi, world

def move_to_beacon():
    lumi.move(world.target_distance)

move_to_beacon()`,
  'function-parameter-02': `from metasense import lumi, world

def travel(distance):
    lumi.move(distance)

travel(world.target_distance)`,
  'function-return-03': `from metasense import lumi

def is_safe():
    return lumi.energy >= 30

if is_safe():
    print("SAFE")`,
  'function-collect-04': `from metasense import lumi

def rescue(signal):
    if signal.priority >= 3:
        lumi.collect(signal)

for signal in lumi.scan():
    rescue(signal)`,
  'function-charge-05': `from metasense import lumi, world

def ensure_energy(required):
    if lumi.energy < required:
        lumi.charge()

distance = world.target_distance
ensure_energy(distance)
lumi.move(distance)`,
  'function-expedition-06': `from metasense import lumi, world

def prepare():
    if lumi.energy < world.target_distance:
        lumi.charge()

def rescue():
    for signal in lumi.scan():
        if signal.kind == "signal":
            lumi.collect(signal)

def navigate():
    lumi.move(world.target_distance)

prepare()
rescue()
navigate()`,

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
    for signal in signal_list:
        if signal["corruption"] > urgent["corruption"]:
            urgent = signal
    return urgent["name"]

target_name = find_urgent(signals)`,
  'lumi-lost-light-f-02': `def choose_action(energy, corruption):
    if energy < 30:
        return "CHARGE"
    elif corruption > 0:
        return "PURIFY"
    else:
        return "STANDBY"

act_1 = choose_action(20, 50)
act_2 = choose_action(80, 40)`,
  'lumi-lost-light-f-03': `class Drone:
    def __init__(self, name, corruption):
        self.name = name
        self.corruption = corruption

    def purify(self, amount):
        self.corruption = max(0, self.corruption - amount)

fleet = [Drone("D1", 20), Drone("D2", 30)]
total_corruption = sum(d.corruption for d in fleet)

while total_corruption > 0:
    for drone in fleet:
        drone.purify(10)
    total_corruption = sum(d.corruption for d in fleet)`,
  'lumi-lost-light-f-04': `class RelayBeacon:
    def __init__(self, name, power):
        self.name = name
        self.power = power
        self.active = False

    def activate(self):
        self.active = True

relays = []
for spec in world.entity_specs:
    relays.append(RelayBeacon(spec["name"], spec["power"]))

for relay in relays:
    relay.activate()`,

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

