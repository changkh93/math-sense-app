/**
 * LUMI Protocol Gate 5: Object Frontier Optional Exploration Pilot Catalog
 * 
 * Strict Isolation:
 * - kind: 'frontier-pilot'
 * - persistencePolicy: 'none'
 * - rewardPolicy: 'none'
 * - dailyRecordPolicy: 'none'
 * - assignmentEvidencePolicy: 'none'
 */

export const OBJECT_FRONTIER_MISSIONS = [
  {
    id: 'pilot-frontier-xf-01',
    codeName: 'XF-01',
    title: '부모 설계도의 계승 (단일 상속)',
    subtitle: '기본 Drone을 상속받아 ScoutDrone 정의',
    summary: '공통 속성(name, integrity)을 가진 기본 Drone을 상속받아 새로운 ScoutDrone을 조립합니다.',
    difficulty: 'guided',
    gate: 'gate-5',
    isSpike: true,
    isPilot: true,
    persistencePolicy: 'none',
    rewardPolicy: 'none',
    dailyRecordPolicy: 'none',
    assignmentEvidencePolicy: 'none',
    world: {
      width: 8,
      height: 5,
      rover: { x: 0, y: 0, direction: 0, energy: 100, awake: true },
    },
    scaffold: {
      mode: 'code',
      visibleTools: ['run', 'reset', 'step', 'replay', 'inspector'],
    },
    storyIntro: '기존 Drone 설계도의 기능이 마음에 든다면, 처음부터 다시 쓸 필요 없이 Drone을 상속(Inheritance)받아 ScoutDrone을 확장할 수 있습니다.',
    briefing: 'class ScoutDrone(Drone): pass 코드를 완성하고, s = ScoutDrone("ALPHA", 20)을 생성하여 charge(10)을 호출하세요.',
    checklist: [
      'class ScoutDrone(Drone): 단일 상속 정의',
      's = ScoutDrone("ALPHA", 20) 인스턴스 생성',
      's.charge(10) 호출로 내구도 20 -> 30 증가',
    ],
    starterCode: `class Drone:
    def __init__(self, name, integrity):
        self.name = name
        self.integrity = integrity

    def charge(self, amount):
        self.integrity += amount

# TODO: 아래 ScoutDrone이 Drone을 상속하도록 클래스 머리 부분을 수정하세요.
class ScoutDrone:
    pass

s = ScoutDrone("ALPHA", 20)
s.charge(10)
`,
    conceptEvidence: {
      mustUse: ['class', 'inheritance', 'self'],
      mustCall: ['charge'],
    },
    goals: [
      { type: 'classCountAtLeast', count: 2, label: '클래스 2개(기본, 자식) 등록' },
      { type: 'instanceCountEquals', count: 1, label: 'ScoutDrone 인스턴스 1대 생성' },
      {
        type: 'onlyTargetInstanceAttributeChanged',
        targetBinding: 's',
        attribute: 'integrity',
        expectedBefore: 20,
        expectedAfter: 30,
        label: '상속받은 charge 메서드로 내구도 20 -> 30 충전',
      },
    ],
  },
  {
    id: 'pilot-frontier-xf-02',
    codeName: 'XF-02',
    title: '행동의 재정의 (Method Override)',
    subtitle: '자식 클래스에서 충전량 2배 오버라이드',
    summary: 'TurboDrone에서 charge 메서드를 오버라이드하여 2배 효율로 충전되도록 재정의합니다.',
    difficulty: 'normal',
    gate: 'gate-5',
    isSpike: true,
    isPilot: true,
    persistencePolicy: 'none',
    rewardPolicy: 'none',
    dailyRecordPolicy: 'none',
    assignmentEvidencePolicy: 'none',
    world: {
      width: 8,
      height: 5,
      rover: { x: 0, y: 0, direction: 0, energy: 100, awake: true },
    },
    scaffold: {
      mode: 'code',
      visibleTools: ['run', 'reset', 'step', 'replay', 'inspector'],
    },
    storyIntro: '자식 클래스는 부모의 메서드를 자신만의 방식으로 재정의(Override)할 수 있습니다.',
    briefing: 'TurboDrone의 charge 메서드에서 self.integrity += amount * 2 코드로 오버라이드하고 t.charge(10)을 호출하세요.',
    checklist: [
      'TurboDrone에서 charge(self, amount) 재정의',
      't.charge(10) 호출 시 내구도 20 -> 40 (2배) 증가',
    ],
    starterCode: `class Drone:
    def __init__(self, name, integrity):
        self.name = name
        self.integrity = integrity

    def charge(self, amount):
        self.integrity += amount

class TurboDrone(Drone):
    def charge(self, amount):
        # TODO: 충전량이 2배(amount * 2)가 되도록 재정의하세요.
        self.integrity += amount

t = TurboDrone("TURBO-1", 20)
t.charge(10)
`,
    conceptEvidence: {
      mustUse: ['class', 'def', 'inheritance', 'self'],
      mustCall: ['charge'],
    },
    goals: [
      { type: 'instanceCountEquals', count: 1, label: 'TurboDrone 인스턴스 1대 생성' },
      {
        type: 'onlyTargetInstanceAttributeChanged',
        targetBinding: 't',
        attribute: 'integrity',
        expectedBefore: 20,
        expectedAfter: 40,
        label: '오버라이드된 charge로 내구도 20 -> 40 (2배) 충전',
      },
    ],
  },
  {
    id: 'pilot-frontier-xf-03',
    codeName: 'XF-03',
    title: '부품 조립 (Composition)',
    subtitle: '객체를 속성으로 품는 합성 패턴',
    summary: 'Drone이 Battery 객체를 self.battery 속성으로 소유하는 Composition 구조를 확인합니다.',
    difficulty: 'normal',
    gate: 'gate-5',
    isSpike: true,
    isPilot: true,
    persistencePolicy: 'none',
    rewardPolicy: 'none',
    dailyRecordPolicy: 'none',
    assignmentEvidencePolicy: 'none',
    world: {
      width: 8,
      height: 5,
      rover: { x: 0, y: 0, direction: 0, energy: 100, awake: true },
    },
    scaffold: {
      mode: 'code',
      visibleTools: ['run', 'reset', 'step', 'replay', 'inspector'],
    },
    storyIntro: '상속 대신 객체가 다른 객체를 부품으로 가지는 구성(Composition) 방식을 사용하면 더 유연하게 시스템을 조립할 수 있습니다.',
    briefing: 'Drone이 Battery 부품을 소유하고, d.battery.charge(30)을 호출해 배터리 잔량을 50에서 80으로 채우세요.',
    checklist: [
      'Battery 클래스 및 Drone 클래스 작성',
      'd = Drone("ALPHA", 50) 생성',
      'd.battery.charge(30) 호출로 배터리 50 -> 80 증가',
    ],
    starterCode: `class Battery:
    def __init__(self, capacity):
        self.capacity = capacity

    def charge(self, amount):
        self.capacity += amount

class Drone:
    def __init__(self, name, battery_capacity):
        self.name = name
        self.battery = Battery(battery_capacity)

d = Drone("ALPHA", 50)
# TODO: d의 배터리를 30만큼 충전하세요.
`,
    conceptEvidence: {
      mustUse: ['class', 'def', 'self'],
      mustCall: ['charge'],
    },
    goals: [
      { type: 'classCountAtLeast', count: 2, label: 'Battery, Drone 클래스 정의' },
      { type: 'instanceCountEquals', count: 2, label: 'Drone 및 Battery 인스턴스 조립' },
      { type: 'composedInstanceAttribute', className: 'Drone', attribute: 'battery', composedClassName: 'Battery', label: 'Drone이 Battery 객체를 부품으로 보유' },
      { type: 'nestedInstanceAttributeEquals', className: 'Drone', attribute: 'battery', nestedAttribute: 'capacity', value: 80, label: 'Battery 용량 80 충전' },
    ],
  },
]

export const LUMI_OBJECT_FRONTIER_SET = {
  id: 'lumi-object-frontier-pilot-v1',
  kind: 'frontier-pilot',
  actId: 'object-frontier-pilot',
  title: 'Gate 5: Object Frontier (XF-01 ~ XF-03)',
  subtitle: '상속(Inheritance), Override, 합성(Composition) 선택 심화 파일럿',
  version: 1,
  persistencePolicy: 'official',
  rewardPolicy: 'standard-crystals',
  dailyRecordPolicy: 'official',
  assignmentEvidencePolicy: 'python-only',
  unitId: 'lumi_protocol_frontier_pilot',
  lumiCourseId: 'lumi-season-1',
  missions: OBJECT_FRONTIER_MISSIONS.map((mission) => ({
    ...mission,
    persistencePolicy: 'official',
    rewardPolicy: 'standard-crystals',
  })),
}
