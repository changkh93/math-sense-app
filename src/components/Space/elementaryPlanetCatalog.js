// Presentation only: learning/access decisions stay in SpaceHome.
const WORLDS = [
  { match: /아디테라|덧셈|뺄셈/, key: 'forest', topic: '덧셈과 뺄셈', color: '#69d9a8', colors: ['#073c58', '#26896c', '#9dbf82'], kind: 'land', size: 1.05 },
  { match: /멀티플루비아|곱셈/, key: 'ocean', topic: '곱셈', color: '#6fbaff', colors: ['#082752', '#197fa8', '#a1e7ed'], kind: 'bands', size: 1.12 },
  { match: /디비디아|나눗셈/, key: 'lava', topic: '나눗셈', color: '#f8a292', colors: ['#532329', '#b95742', '#f2b287'], kind: 'land', size: .94 },
  { match: /프락토니스|분수/, key: 'ice', topic: '분수', color: '#83e0e6', colors: ['#12556b', '#58b8b7', '#d8f3de'], kind: 'land', size: .88 },
  { match: /데시멜라|소수/, key: 'cloud', topic: '소수', color: '#b5c9f8', colors: ['#41487c', '#8a9ec8', '#e3e5f7'], kind: 'bands', size: .9 },
  { match: /라티오카스|비와|비례/, key: 'sand', topic: '비와 비율', color: '#ecd193', colors: ['#75533a', '#c49b63', '#f0dbb0'], kind: 'bands', ring: true, size: .88 },
  { match: /월간평가/, key: 'assessment', topic: '실력 확인', color: '#abaaff', colors: ['#282657', '#7364b8', '#bfc8ee'], kind: 'land', ring: true, size: .8 },
]
export function getElementaryWorld(region, index = 0) {
  const preset = WORLDS.find(world => world.match.test(region.title || '')) || WORLDS[index % WORLDS.length]
  const title = region.title || '학습 행성'
  return { ...preset, id: region.id, title: title.replace(/\s*\([^)]*\)/g, '').trim(), subtitle: title.match(/\(([^)]+)\)/)?.[1] || preset.topic, region }
}
export const ELEMENTARY_STATIONS = [
  { id: 'archive', title: '과제 기록소', topic: '오늘의 과제와 학습 기록', color: '#edc17c', colors: ['#65412d', '#bc8750', '#edc891'], kind: 'land' },
  { id: 'notebook', title: '오답노트 행성', topic: '틀린 문제 다시 살펴보기', color: '#76dacf', colors: ['#123945', '#348c90', '#a0e0d3'], kind: 'land', ring: true },
  { id: 'dark', title: '다크 매터', topic: '복습할 문제', color: '#bca5f5', colors: ['#201e42', '#60508b', '#ab8cb9'], kind: 'land' },
  { id: 'refinery', title: '다크매터 정제소', topic: '오답 정제하기', color: '#e2b18c', colors: ['#463344', '#9e6b68', '#d9a280'], kind: 'bands' },
]
export function getElementaryAccess(region, regionAccess = {}) {
  if (!region.isPrivate) return 'open'
  const status = regionAccess[region.id]
  if (status === 'active' || status === 'completed') return 'open'
  return status === 'suspended' ? 'suspended' : 'locked'
}
