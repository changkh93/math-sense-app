import * as THREE from 'three'

export const WORLD_RADIUS = 20
export const BUILD_RADIUS = 14.2

export const WORLD_ZONES = [
  { id: 'landing', label: '착륙장', shortLabel: '착륙', position: [0, 5], color: '#7cf2bd' },
  { id: 'habitat', label: '주거 구역', shortLabel: '기지', position: [-7.5, -4.5], color: '#74c7ff' },
  { id: 'ecology', label: '생태 구역', shortLabel: '생태', position: [6.8, -6.2], color: '#8df2a7' },
  { id: 'expedition', label: '탐사 구역', shortLabel: '탐사', position: [8.7, 5.4], color: '#c89cff' },
  { id: 'plaza', label: '친구 광장', shortLabel: '광장', position: [-8.8, 7], color: '#ffd17c' },
]

const PLATEAUS = [
  { x: 0, z: 5, radius: 3.2, height: .2 },
  { x: -7.5, z: -4.5, radius: 3.15, height: .3 },
  { x: 6.8, z: -6.2, radius: 3.3, height: .38 },
  { x: 8.7, z: 5.4, radius: 3.05, height: .5 },
  { x: -8.8, z: 7, radius: 2.85, height: .28 },
  { x: 9.2, z: 7.8, radius: 1.35, height: .52 },
  { x: 7.8, z: -7.3, radius: 1.3, height: .4 },
  { x: 11.7, z: 3.2, radius: 1.3, height: .46 },
  { x: -10.5, z: 7.4, radius: 1.3, height: .32 },
  { x: 4.8, z: -8.7, radius: 1.25, height: .34 },
  { x: -12.2, z: 1.5, radius: 1.65, height: .3 },
  { x: 1.2, z: -12.4, radius: 1.7, height: .25 },
  { x: 12.4, z: .2, radius: 1.65, height: .38 },
]

export const MOUNTAINS = [
  { x: -16.2, z: 10.8, height: 3.7, sigma: 2.7 },
  { x: -9.3, z: 15.3, height: 4.8, sigma: 3.1 },
  { x: 1.8, z: 16.7, height: 5.2, sigma: 3.25 },
  { x: 13.7, z: 11.9, height: 4.1, sigma: 2.85 },
]

export const VILLAGE_SLOTS = [
  { id: 'village_home_west', position: [-9.25, -5.15], rotation: .42, variant: 0 },
  { id: 'village_home_south', position: [-6.45, -5.85], rotation: -.3, variant: 1 },
  { id: 'village_home_north', position: [-8.75, -2.65], rotation: 2.45, variant: 2 },
  { id: 'village_workshop', position: [-5.55, -3.15], rotation: -1.2, variant: 3 },
]
export const VILLAGE_BEACON_POSITION = [-7.45, -4.25]

// 길 네트워크는 더 이상 정적이지 않다. 구조물 위치를 받아 연결망(MST + 루프)을 자동 생성한다.
// 렌더/발소리는 항상 한 개의 현재 네트워크를 사용하므로, 기본값으로 zones를 잇는 폴백을 둔다.
function buildFallbackPathNetwork() {
  // zones만으로도 연결되도록 최소 폴백 (노드가 비어 있을 때 안전망)
  const zonePositions = WORLD_ZONES.map((zone) => zone.position)
  return generatePathNetwork(zonePositions)
}

export const BRIDGE_X = 1.2
export const BRIDGE_DECK_HEIGHT = .38
export const LANDING_PAD_RADIUS = 2.72
export const LANDING_PAD_SURFACE_LIFT = .18
export const ROAD_EDGE_HALF_WIDTH = .7
export const ROAD_CENTER_HALF_WIDTH = .5
// 길 표면이 지형 위로 떠 있는 높이. 캐릭터 보행 높이와 리본 yOffset가 이 값을 공유해
// 길 위에서 발이 묻히거나 뜨지 않게 한다.
export const ROAD_SURFACE_LIFT = .066

// 결정론적 의사난수(길 경유점 지터용). 입력에 대해 안정적.
function pathHash(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

// 구조물 위치들([x,z])을 받아 모두를 잇는 길 네트워크 폴리선 배열을 반환.
// MST(Prim)로 어떤 노드도 고립되지 않게 하고, 여유 엣지로 마을 한 바퀴 루프를 만든다.
export function generatePathNetwork(structurePositions) {
  const nodes = (Array.isArray(structurePositions) ? structurePositions : [])
    .map((pos) => (Array.isArray(pos) ? [Number(pos[0]) || 0, Number(pos[1]) || 0] : null))
    .filter((pos) => pos !== null)
    // 중복/근접 노드 제거 (같은 자리에 여러 구조물이 있을 수 있음)
    .filter((pos, idx, arr) => arr.findIndex((other) => Math.hypot(other[0] - pos[0], other[1] - pos[1]) < 1.2) === idx)

  if (nodes.length < 2) {
    return nodes.length === 1 ? [[nodes[0], [nodes[0][0] + 0.01, nodes[0][1]]]] : []
  }

  // 1. MST (Prim)
  const inTree = new Array(nodes.length).fill(false)
  const edges = []
  inTree[0] = true
  for (let step = 1; step < nodes.length; step += 1) {
    let best = null
    for (let i = 0; i < nodes.length; i += 1) {
      if (!inTree[i]) continue
      for (let j = 0; j < nodes.length; j += 1) {
        if (inTree[j]) continue
        const d = Math.hypot(nodes[i][0] - nodes[j][0], nodes[i][1] - nodes[j][1])
        if (!best || d < best.dist) best = { from: i, to: j, dist: d }
      }
    }
    if (!best) break
    inTree[best.to] = true
    edges.push([best.from, best.to])
  }

  // 2. 루프용 여유 엣지 (MST에 없는 가장 가까운 인접쌍 몇 개 추가 → 폐루프)
  const edgeKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`)
  const usedEdges = new Set(edges.map((e) => edgeKey(e[0], e[1])))
  const extraCandidates = []
  for (let i = 0; i < nodes.length; i += 1) {
    // 각 노드의 가장 가까운 비-MST 이웃 1개
    let nearest = null
    for (let j = 0; j < nodes.length; j += 1) {
      if (i === j || usedEdges.has(edgeKey(i, j))) continue
      const d = Math.hypot(nodes[i][0] - nodes[j][0], nodes[i][1] - nodes[j][1])
      if (!nearest || d < nearest.dist) nearest = { from: i, to: j, dist: d }
    }
    if (nearest) extraCandidates.push(nearest)
  }
  // 짧은 순으로 최대 3개 추가 (루프 형성). 전체 엣지 대비 너무 긴 것은 제외.
  extraCandidates.sort((a, b) => a.dist - b.dist)
  const loopBudget = Math.min(3, Math.max(1, Math.floor(nodes.length / 3)))
  const maxEdgeLen = edges.reduce((max, e) => Math.max(max, Math.hypot(nodes[e[0]][0] - nodes[e[1]][0], nodes[e[0]][1] - nodes[e[1]][1])), 0) * 1.6
  let added = 0
  for (const cand of extraCandidates) {
    if (added >= loopBudget) break
    if (usedEdges.has(edgeKey(cand.from, cand.to))) continue
    if (cand.dist > maxEdgeLen) continue
    usedEdges.add(edgeKey(cand.from, cand.to))
    edges.push([cand.from, cand.to])
    added += 1
  }

  // 3. 각 엣지 → 곡선 제어점. 모든 제어점은 시작→끝 축에서 단조 증가하게 두어
  //    교차로 주변에서 곡선이 되감기거나 리본의 좌우 면이 뒤집히지 않게 한다.
  return edges.map(([a, b], edgeIdx) => {
    const start = nodes[a]
    const end = nodes[b]
    const dx = end[0] - start[0]
    const dz = end[1] - start[1]
    const segLen = Math.hypot(dx, dz)
    const dirX = dx / Math.max(.001, segLen)
    const dirZ = dz / Math.max(.001, segLen)
    const perpX = -dirZ
    const perpZ = dirX
    // 곡률 강도: 거리에 비례하되 너무 급하지 않게. 짧은 엣지는 거의 직선.
    const curveAmp = Math.min(1.1, segLen * 0.16)
    // 곡선 방향(좌/우)은 엣지마다 일관되게: 해시로 결정.
    const curveSign = pathHash(edgeIdx * 23.7) > 0.5 ? 1 : -1

    const controlCount = Math.min(4, Math.max(2, Math.ceil(segLen / 3.5)))
    const pts = [start]
    for (let m = 1; m <= controlCount; m += 1) {
      const t = m / (controlCount + 1)
      const baseX = start[0] + dx * t
      const baseZ = start[1] + dz * t
      const curvature = Math.sin(t * Math.PI) * curveAmp * curveSign
      pts.push([baseX + perpX * curvature, baseZ + perpZ * curvature])
    }
    pts.push(end)
    return pts
  })
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value))
}

function smoothstep(min, max, value) {
  const t = clamp01((value - min) / Math.max(.0001, max - min))
  return t * t * (3 - 2 * t)
}

function gaussian(x, z, peak) {
  const dx = x - peak.x
  const dz = z - peak.z
  return peak.height * Math.exp(-(dx * dx + dz * dz) / (2 * peak.sigma * peak.sigma))
}

export function riverCenterZ(x) {
  return -14.72 + Math.sin((x + 4) * .22) * .66 + Math.sin(x * .51) * .23
}

export function riverWidth(x) {
  return 1.02 + Math.sin(x * .37 + 1.3) * .14
}

export function isLandingPad(x, z) {
  return Math.hypot(x - 0, z - 5) <= LANDING_PAD_RADIUS
}

export function distanceToSegment(x, z, start, end) {
  const dx = end[0] - start[0]
  const dz = end[1] - start[1]
  const lengthSquared = dx * dx + dz * dz
  const amount = lengthSquared > 0 ? Math.min(1, Math.max(0, ((x - start[0]) * dx + (z - start[1]) * dz) / lengthSquared)) : 0
  return Math.hypot(x - (start[0] + dx * amount), z - (start[1] + dz * amount))
}

// 현재 활성 길 네트워크(폴리선 배열). 기본값은 zones 폴백.
// WorldTerrain이 generatePathNetwork 결과로 교체한다.
let activePathNetwork = buildFallbackPathNetwork()

// 폴리선 배열을 받아 샘플링된 중심선 세그먼트 배열로 변환 (isNearRoad용).
function sampleCenterlines(paths) {
  return paths.map((path) => {
    const points = path.map(([pathX, pathZ]) => new THREE.Vector3(pathX, 0, pathZ))
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal')
    const sampleCount = Math.max(16, (points.length - 1) * 18)
    return Array.from({ length: sampleCount + 1 }, (_, index) => {
      const point = curve.getPoint(index / sampleCount)
      return [point.x, point.z]
    })
  })
}

let activeRoadCenterlines = sampleCenterlines(activePathNetwork)

// 외부(WorldTerrain)에서 생성된 길 네트워크를 등록. 발소리/분산 판정이 새 길을 따른다.
export function setActivePathNetwork(paths) {
  activePathNetwork = paths && paths.length ? paths : buildFallbackPathNetwork()
  activeRoadCenterlines = sampleCenterlines(activePathNetwork)
}

export function getActivePathNetwork() {
  return activePathNetwork
}

export function isNearRoad(x, z) {
  return activeRoadCenterlines.some((path) => {
    for (let index = 1; index < path.length; index += 1) {
      if (
        distanceToSegment(
          x,
          z,
          path[index - 1],
          path[index],
        ) <= ROAD_EDGE_HALF_WIDTH
      ) {
        return true
      }
    }
    return false
  })
}

export function getWalkSurface(x, z, theme = 'forest') {
  if (isLandingPad(x, z)) return 'landingMetal'
  if (isBridgeDeck(x, z)) return 'bridgeWood'
  if (isNearRoad(x, z)) return 'path'
  const validThemes = ['forest', 'ocean', 'crystal', 'desert', 'mechanical', 'ice']
  const normalizedTheme = validThemes.includes(theme) ? theme : 'forest'
  return `terrain.${normalizedTheme}`
}

export function getRiverAudioPoint(playerX) {
  const clampX = Math.max(-19.5, Math.min(19.5, playerX))
  return [clampX, 0.05, riverCenterZ(clampX)]
}

export function getRiverAudioProximity(playerX, playerZ) {
  const point = getRiverAudioPoint(playerX)
  const distance = Math.hypot(
    Number(playerX || 0) - point[0],
    Number(playerZ || 0) - point[2],
  )
  const normalized = Math.max(0, Math.min(1, 1 - distance / 15))
  return {
    point,
    distance,
    volumeMultiplier: normalized <= 0 ? 0 : 0.15 + normalized * 1.25,
    musicDuck: distance <= 7 ? 0.52 : distance <= 11 ? 0.72 : 1,
  }
}

export function isBridgeDeck(x, z) {
  return Math.abs(x - BRIDGE_X) < 1.15 && Math.abs(z - riverCenterZ(BRIDGE_X)) < 2.65
}

export function isRiverWater(x, z) {
  if (Math.hypot(x, z) > WORLD_RADIUS - .35) return false
  return Math.abs(z - riverCenterZ(x)) < riverWidth(x) * .9
}

export function terrainHeight(x, z) {
  const radius = Math.hypot(x, z)
  let height = .16
    + Math.sin(x * .31 + z * .16) * .12
    + Math.sin(x * .14 - z * .27 + 1.1) * .09
    + Math.cos((x + z) * .47 - .8) * .045

  MOUNTAINS.forEach((peak, index) => {
    const mountain = gaussian(x, z, peak)
    const ridgeDetail = 1
      + Math.sin(x * .92 + z * .38 + index * 1.7) * .055
      + Math.cos(x * .47 - z * .81 + index) * .035
    height += mountain * ridgeDetail
  })

  const riverDistance = Math.abs(z - riverCenterZ(x))
  const width = riverWidth(x)
  const bedBlend = 1 - smoothstep(width * .68, width * 1.18, riverDistance)
  const bank = Math.exp(-Math.pow((riverDistance - width * 1.32) / .34, 2)) * .16
  height = THREE.MathUtils.lerp(height + bank, -.42, bedBlend)

  PLATEAUS.forEach((plateau) => {
    const distance = Math.hypot(x - plateau.x, z - plateau.z)
    const blend = 1 - smoothstep(plateau.radius * .58, plateau.radius, distance)
    height = THREE.MathUtils.lerp(height, plateau.height, blend)
  })

  const edgeBlend = smoothstep(WORLD_RADIUS - 2.1, WORLD_RADIUS, radius)
  height = THREE.MathUtils.lerp(height, .03, edgeBlend)
  return THREE.MathUtils.clamp(height, -.44, 5.8)
}

export function walkSurfaceHeight(x, z) {
  if (isBridgeDeck(x, z)) return BRIDGE_DECK_HEIGHT
  if (isLandingPad(x, z)) return terrainHeight(0, 5) + LANDING_PAD_SURFACE_LIFT
  if (isNearRoad(x, z)) return terrainHeight(x, z) + ROAD_SURFACE_LIFT
  return terrainHeight(x, z)
}

export function terrainSlope(x, z) {
  const step = .24
  const dx = (terrainHeight(x + step, z) - terrainHeight(x - step, z)) / (step * 2)
  const dz = (terrainHeight(x, z + step) - terrainHeight(x, z - step)) / (step * 2)
  return Math.hypot(dx, dz)
}

export function getAvailableVillageSlots(blockers = []) {
  return VILLAGE_SLOTS.filter((slot) => blockers.every((position) => (
    Math.hypot(slot.position[0] - position[0], slot.position[1] - position[2]) >= 2
  )))
}

export function isVillageBeaconAvailable(blockers = []) {
  return blockers.every((position) => (
    Math.hypot(VILLAGE_BEACON_POSITION[0] - position[0], VILLAGE_BEACON_POSITION[1] - position[2]) >= 2
  ))
}

export function createTerrainGeometry(palette) {
  const radialSegments = 42
  const angularSegments = 112
  const positions = [0, terrainHeight(0, 0), 0]
  const colors = []
  const uvs = [.5, .5]
  const indices = []
  const base = new THREE.Color(palette.ground)
  const deep = new THREE.Color(palette.groundDeep)
  const high = new THREE.Color(palette.path).lerp(new THREE.Color('#d9e5df'), .28)
  const river = new THREE.Color(palette.water).lerp(deep, .42)

  const pushColor = (x, z, height) => {
    const color = base.clone()
    if (isRiverWater(x, z)) color.lerp(river, .74)
    else if (height > 1.2) color.lerp(high, clamp01((height - 1.2) / 3.6) * .72)
    else if (height < .03) color.lerp(deep, .5)
    const variation = (Math.sin(x * 2.13 + z * 1.73) + 1) * .018
    color.offsetHSL(0, 0, variation - .018)
    colors.push(color.r, color.g, color.b)
  }

  pushColor(0, 0, positions[1])
  for (let ring = 1; ring <= radialSegments; ring += 1) {
    const radius = WORLD_RADIUS * ring / radialSegments
    for (let segment = 0; segment < angularSegments; segment += 1) {
      const angle = segment / angularSegments * Math.PI * 2
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const y = terrainHeight(x, z)
      positions.push(x, y, z)
      uvs.push((x + WORLD_RADIUS) / (WORLD_RADIUS * 2), (z + WORLD_RADIUS) / (WORLD_RADIUS * 2))
      pushColor(x, z, y)
    }
  }

  const ringStart = (ring) => 1 + (ring - 1) * angularSegments
  for (let segment = 0; segment < angularSegments; segment += 1) {
    indices.push(0, ringStart(1) + ((segment + 1) % angularSegments), ringStart(1) + segment)
  }
  for (let ring = 1; ring < radialSegments; ring += 1) {
    const inner = ringStart(ring)
    const outer = ringStart(ring + 1)
    for (let segment = 0; segment < angularSegments; segment += 1) {
      const next = (segment + 1) % angularSegments
      const a = inner + segment
      const b = inner + next
      const c = outer + segment
      const d = outer + next
      indices.push(a, b, d, a, d, c)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

export function createRibbonGeometry(paths, width, heightSampler = terrainHeight, yOffset = .055) {
  const positions = []
  const uvs = []
  const indices = []
  paths.forEach((path) => {
    const points = path.map(([x, z]) => new THREE.Vector3(x, 0, z))
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal')
    const sampleCount = Math.max(16, (points.length - 1) * 18)
    const lengths = curve.getLengths(sampleCount)
    const totalLength = Math.max(.001, lengths[lengths.length - 1])
    const startIndex = positions.length / 3
    let previousSideX = null
    let previousSideZ = null
    for (let index = 0; index <= sampleCount; index += 1) {
      const t = index / sampleCount
      const point = curve.getPoint(t)
      const before = curve.getPoint(Math.max(0, t - .01))
      const after = curve.getPoint(Math.min(1, t + .01))
      const tangentX = after.x - before.x
      const tangentZ = after.z - before.z
      const tangentLength = Math.max(.001, Math.hypot(tangentX, tangentZ))
      let sideX = -tangentZ / tangentLength * width
      let sideZ = tangentX / tangentLength * width
      if (previousSideX !== null && previousSideX * sideX + previousSideZ * sideZ < 0) {
        sideX *= -1
        sideZ *= -1
      }
      previousSideX = sideX
      previousSideZ = sideZ
      const leftX = point.x + sideX
      const leftZ = point.z + sideZ
      const rightX = point.x - sideX
      const rightZ = point.z - sideZ
      positions.push(leftX, heightSampler(leftX, leftZ) + yOffset, leftZ)
      positions.push(rightX, heightSampler(rightX, rightZ) + yOffset, rightZ)
      const along = lengths[index] / totalLength
      uvs.push(along, 0, along, 1)
      if (index < sampleCount) {
        const a = startIndex + index * 2
        indices.push(a, a + 3, a + 1, a, a + 2, a + 3)
      }
    }
  })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

export function createRiverGeometry() {
  const path = []
  const steps = 72
  for (let index = 0; index <= steps; index += 1) {
    const x = -19.5 + index / steps * 39
    path.push([x, riverCenterZ(x)])
  }
  return createRibbonGeometry([path], 1.03, () => .015)
}
