import { createElement, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float, Html, OrbitControls, Sparkles, Stars } from '@react-three/drei'
import { Bot, CircleCheck, Compass, Flower2, Gem, Hammer, Image as ImageIcon, Maximize2, Minimize2, Radio, Search, Sparkles as SparklesIcon, Sprout, Wrench } from 'lucide-react'
import * as THREE from 'three'
import {
  FRONTIER_AUDIO_ASSETS_READY,
  getFrontierAmbienceSoundId,
  getFrontierFootstepSoundId,
} from '../../audio/soundRegistry'
import { GALAXY_MISSION_ROUTES } from '../../utils/galaxyGame'
import soundManager from '../../utils/SoundManager'
import AstraBuilderHud from './builder/AstraBuilderHud'
import AstraBuilderPlot from './builder/AstraBuilderPlot'
import {
  ASTRA_BUILDER_BASE_LIFT,
  ASTRA_BUILDER_POC_PLOT,
} from './builder/astraBuilderModel'
import {
  canAstraBuilderCharacterOccupy,
  createAstraBuilderCollisionBodies,
  findAstraBuilderBodyCollision,
  getAstraBuilderWalkSurfaceHeight,
} from './builder/astraBuilderPhysics'
import { isAstraBuilderViewDrag, isAstraBuilderViewPointer } from './builder/astraBuilderInput'
import useAstraBuilderPoc from './builder/useAstraBuilderPoc'
import WorldTerrain from './GalaxyTerrain3D'
import {
  BUILD_RADIUS,
  MOUNTAINS,
  VILLAGE_BEACON_POSITION,
  VILLAGE_SLOTS,
  WORLD_RADIUS,
  WORLD_ZONES as ZONES,
  getAvailableVillageSlots,
  getRiverAudioProximity,
  getWalkSurface,
  isVillageBeaconAvailable,
  isBridgeDeck,
  isRiverWater,
  terrainHeight,
  terrainSlope,
  walkSurfaceHeight,
} from './GalaxyTerrainModel'

const createMissionOperationId = () => globalThis.crypto?.randomUUID?.()
  || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
const PLAYER_WALK_SPEED = 3.4
const PLAYER_SPRINT_MULTIPLIER = 1.8
const PLAYER_TURN_SPEED = Math.PI * 2.4
const PLAYER_MOVE_START_ANGLE = THREE.MathUtils.degToRad(25)
const PLAYER_MOVE_FULL_ANGLE = THREE.MathUtils.degToRad(6)
const WORLD_UP = new THREE.Vector3(0, 1, 0)
const CHARACTER_SCALE = .28
const CHARACTER_MIN_SCALE = .14
const CHARACTER_MAX_SCALE = .7
const CHARACTER_SCALE_STEP = .04
const PLAYER_COLLISION_RADIUS = .14
const STATIC_BLOCKER_COLLISION_RADIUS = .78
const CAMERA_TARGET_HEIGHT = .44
const FIRST_PERSON_DEFAULT_FOV = 58
const PLAYER_JUMP_VELOCITY = 2.55
const PLAYER_JUMP_GRAVITY = 7.2
const FIRST_PERSON_CAMERA_NEAR = .025
const DEFAULT_CAMERA_NEAR = .1
const CAMERA_MIN_POLAR = .24
const CAMERA_MAX_POLAR = Math.PI * .58
const MOUSE_LOOK_YAW_SENSITIVITY = .0026
const MOUSE_LOOK_PITCH_SENSITIVITY = .0021
const MOUSE_LOOK_MAX_FRAME_DELTA = 420
const MOUSE_LOOK_REENTRY_GAP_MS = 180
const MOUSE_LOOK_REENTRY_DISTANCE = 160
const PROXIMITY_CHAT_DISTANCE = 4.2
const COLLISION_REARM_CLEAR_SECONDS = .35
const FOOTSTEP_STRIDE_DISTANCE = 1.7
const MUSIC_ENTRY_DELAY_MS = 900
const AMBIENCE_ENTRY_DELAY_MS = 2800
const LANDING_AUDIO_STOP_DISTANCE = 7.5
const DAILY_EVENT_INTERACTION_RADIUS = 2.8
const ASTRA_BUILDER_POC_ENABLED = import.meta.env.VITE_ASTRA_BUILDER_POC !== 'false'

function createMovementIntent() {
  return {
    active: false,
    basisForward: new THREE.Vector3(),
    basisRight: new THREE.Vector3(),
    targetYaw: 0,
    lastTurnSign: 1,
  }
}

const BIOMES = {
  forest: {
    sky: '#071824', fog: '#0c2430', ground: '#38785c', groundDeep: '#163d36', edge: '#102c2d', water: '#176b76',
    path: '#8bc8a2', glow: '#77f0af', accent: '#a6ffd0', particle: '#c8ffe2', prop: 'forest', light: '#fff0cc',
  },
  ocean: {
    sky: '#061526', fog: '#0a2d43', ground: '#2d8190', groundDeep: '#164a63', edge: '#0c304b', water: '#0d6c98',
    path: '#79d9d2', glow: '#55dcff', accent: '#b0fbff', particle: '#9cf4ff', prop: 'ocean', light: '#d9f7ff',
  },
  crystal: {
    sky: '#100d25', fog: '#241942', ground: '#6e5194', groundDeep: '#342756', edge: '#211d43', water: '#392a72',
    path: '#c39be4', glow: '#c084fc', accent: '#f2ceff', particle: '#e5bcff', prop: 'crystal', light: '#f7e0ff',
  },
  desert: {
    sky: '#21131b', fog: '#4a2b2a', ground: '#a66e43', groundDeep: '#55372e', edge: '#35222a', water: '#6f4235',
    path: '#e4b36f', glow: '#ffbd68', accent: '#ffe0a4', particle: '#ffd297', prop: 'desert', light: '#ffd8ae',
  },
  mechanical: {
    sky: '#08111d', fog: '#192b37', ground: '#536873', groundDeep: '#2b3b46', edge: '#182632', water: '#244b5b',
    path: '#93adb2', glow: '#67e8f9', accent: '#d5f4f7', particle: '#9defff', prop: 'mechanical', light: '#e7f4ff',
  },
  ice: {
    sky: '#071426', fog: '#17374d', ground: '#7db3c0', groundDeep: '#355c72', edge: '#203c5b', water: '#276b85',
    path: '#c5edf0', glow: '#a5efff', accent: '#edffff', particle: '#d9fbff', prop: 'ice', light: '#ecfbff',
  },
}

const DORMANT_FRONTIER_PALETTE = Object.freeze({
  sky: '#05080f', fog: '#121923', ground: '#26302e', groundDeep: '#141b1c', edge: '#11161b', water: '#17252c',
  path: '#52605d', glow: '#73908b', accent: '#91a6a1', particle: '#9aa9aa', light: '#c4c9c5',
})

function blendFrontierPalette(target, restorationPercent = 0) {
  const progress = THREE.MathUtils.clamp(Number(restorationPercent || 0) / 100, 0, 1)
  const mix = (from, to) => `#${new THREE.Color(from).lerp(new THREE.Color(to), progress).getHexString()}`
  return {
    ...target,
    ...Object.fromEntries(Object.keys(DORMANT_FRONTIER_PALETTE).map((key) => [key, mix(DORMANT_FRONTIER_PALETTE[key], target[key])])),
  }
}

const RESOURCE_NODES = [
  { id: 'crystal_north', kind: 'resource', actionId: 'crystal', label: '수정 파편 채집', position: [9.2, .8, 7.8] },
  { id: 'fiber_grove', kind: 'resource', actionId: 'fiber', label: '루멘 섬유 채집', position: [7.8, .7, -7.3] },
  { id: 'ancient_scrap', kind: 'resource', actionId: 'salvage', label: '고대 합금 회수', position: [11.7, .8, 3.2] },
  { id: 'broken_beacon', kind: 'resource', actionId: 'beacon', label: '끊어진 신호기 수리', position: [-10.5, .55, 7.4] },
  { id: 'wild_soil', kind: 'resource', actionId: 'plant', label: '루멘 새싹 심기', position: [4.8, .45, -8.7] },
]

const DAILY_EVENT_VISUALS = {
  lumen_bloom: { color: '#7cf2bd', glow: '#c8ffe2' },
  crystal_rain: { color: '#67e8f9', glow: '#dcfbff' },
  signal_blackout: { color: '#c59aff', glow: '#f0deff' },
  meteor_debris: { color: '#ff9f67', glow: '#ffe0b5' },
  default: { color: '#ffe28a', glow: '#fff3c4' },
}

function resolveDailyEventVisual(dailyEvent = {}) {
  const eventType = String(dailyEvent.type || dailyEvent.eventType || '').toLowerCase()
  if (DAILY_EVENT_VISUALS[eventType]) return DAILY_EVENT_VISUALS[eventType]
  if (eventType.includes('crystal')) return DAILY_EVENT_VISUALS.crystal_rain
  if (eventType.includes('lumen') || eventType.includes('bloom') || eventType.includes('fiber')) return DAILY_EVENT_VISUALS.lumen_bloom
  if (eventType.includes('signal') || eventType.includes('beacon') || eventType.includes('blackout')) return DAILY_EVENT_VISUALS.signal_blackout
  if (eventType.includes('meteor') || eventType.includes('debris') || eventType.includes('salvage')) return DAILY_EVENT_VISUALS.meteor_debris
  return DAILY_EVENT_VISUALS.default
}

function resolvePendingDailyEventNode(dailyEvent) {
  if (String(dailyEvent?.status || '').toLowerCase() !== 'pending') return null
  const nodeId = dailyEvent.nodeId || dailyEvent.worldNodeId
  const resourceNode = RESOURCE_NODES.find((node) => node.id === nodeId)
  if (!resourceNode) return null
  return {
    ...resourceNode,
    kind: 'daily',
    status: 'pending',
    label: dailyEvent.worldLabel || dailyEvent.title || resourceNode.label,
    interactionRadius: DAILY_EVENT_INTERACTION_RADIUS,
    dailyEvent,
  }
}

const GUIDE_NODE = { id: 'lumi_guide', kind: 'guide', actionId: 'guide', label: '루미의 귀환 브리핑 듣기', position: [1.5, 1.1, 4.4] }

const ROVER_NODE = { id: 'landing_rover', kind: 'rover', actionId: 'rover', label: '탐사 로버 제어 열기', position: [-1.45, .25, 4.85] }

const ROVER_STATUS_LABELS = {
  idle: '다음 원정 설정하기',
  active: '진행 중인 원정 확인하기',
  ready: '귀환 결과 수신하기',
  claimed: '새 원정 준비하기',
}

const INTERACTION_SOUND_IDS = {
  crystal: 'frontier.pickup.collect',
  fiber: 'frontier.pickup.collect',
  salvage: 'frontier.interaction.repair',
  beacon: 'frontier.interaction.repair',
  plant: 'frontier.interaction.water',
}

const MISSION_PORTALS = [
  // A single, visible starting point avoids making students hunt for a route by coordinates.
  { id: 'portal_expedition', kind: 'portal', route: 'nebula', label: '탐사 출발대 · E키로 탐사 시작', position: [0, .85, 1.7] },
]

const OBJECTIVE_WORLD_TARGETS = Object.freeze({
  restore_beacon: { type: 'resource', id: 'broken_beacon', label: '고장 난 비콘' },
  field_expedition: { type: 'mission', id: 'portal_expedition', label: '45초 탐사 출발대' },
  trace_lost_route: { type: 'mission', id: 'portal_expedition', label: '항로 좌표 탐사 출발대' },
  launch_rover: { type: 'rover', id: 'landing_rover', label: '로버 관제' },
  dispatch_route_rover: { type: 'rover', id: 'landing_rover', label: '로버 관제' },
  recover_pre_storm_discovery: { type: 'rover', id: 'landing_rover', label: '귀환 로버 관제' },
  complete_discovery_codex: { type: 'rover', id: 'landing_rover', label: '발견 도감·로버 관제' },
  restore_astra_memory: { type: 'structure', id: 'route_gateway', label: '아스트라 항로문' },
})

function resolveObjectiveWorldTarget(objective, planet) {
  const definition = OBJECTIVE_WORLD_TARGETS[objective?.id]
  if (!definition) return null
  if (definition.type === 'resource') {
    const node = RESOURCE_NODES.find((entry) => entry.id === definition.id)
    return node ? { ...node, mapLabel: definition.label, color: '#ffe082' } : null
  }
  if (definition.type === 'mission') {
    const portal = MISSION_PORTALS.find((entry) => entry.id === definition.id)
    return portal ? { ...portal, mapLabel: definition.label, color: '#c9a7ff' } : null
  }
  if (definition.type === 'rover') {
    return { ...ROVER_NODE, mapLabel: definition.label, color: '#75e9ff' }
  }
  if (definition.type === 'structure') {
    const item = (Array.isArray(planet?.layout) ? planet.layout : []).find((entry) => entry?.itemId === definition.id && entry?.locked !== true)
    if (!item) return null
    return {
      id: item.instanceId,
      kind: 'structure',
      mapLabel: definition.label,
      position: worldPositionFromLayout(item),
      interactionRadius: Math.max(2.4, structureFootprint(item.itemId, item.level) + 1.65),
      color: '#ffe082',
    }
  }
  return null
}

const MISSION_PICKUPS = {
  nebula: [[-10, -7], [-5, -11], [1, -10], [6, -8], [10, -3], [7, 3], [-1, 7], [-8, 3]],
  comet: [[-11, 2], [-8, 8], [-3, 11], [3, 9], [9, 7], [11, 1], [6, -4], [-3, -5]],
  ruins: [[-11, -6.5], [-5, -9], [2, -11], [8, -7], [11, -1], [7, 6], [0, 9], [-8, 6]],
}

const MISSION_PICKUP_RESERVED_POINTS = Object.values(MISSION_PICKUPS).flat()

const BIOME_PROP_POSITIONS = [
  [-15, -9, .7], [-11.5, -13, 1.1], [-5, -15, .65], [4, -15.3, 1.2], [12, -11.5, .7], [15, -5, 1],
  [15.5, 7, .8], [12, 12.8, 1.1], [4, 15.6, .7], [-5, 15.4, 1], [-13, 12, .75], [-15.5, 3, 1.15],
  [-3.7, -9.5, .55], [3.5, -10.5, .55], [10.2, 10.2, .5], [-10.8, -7.5, .6],
]

function worldPositionFromLayout(item = {}) {
  return [
    THREE.MathUtils.clamp((Number(item.x || 50) - 50) / 3, -15, 15),
    0,
    THREE.MathUtils.clamp((Number(item.y || 50) - 50) / 3, -15, 15),
  ]
}

function resolveMissionPickupPosition(x, z, blockers = []) {
  const candidates = [
    [x, z],
    [x + 1.7, z], [x - 1.7, z], [x, z + 1.7], [x, z - 1.7],
    [x + 1.3, z + 1.3], [x - 1.3, z + 1.3], [x + 1.3, z - 1.3], [x - 1.3, z - 1.3],
    [x + 2.35, z], [x - 2.35, z], [x, z + 2.35], [x, z - 2.35],
  ]
  return candidates.find(([candidateX, candidateZ]) => (
    Math.hypot(candidateX, candidateZ) < WORLD_RADIUS - .9
    && (!isRiverWater(candidateX, candidateZ) || isBridgeDeck(candidateX, candidateZ))
    && (isBridgeDeck(candidateX, candidateZ) || terrainSlope(candidateX, candidateZ) <= 1.08)
    && blockers.every((position) => Math.hypot(candidateX - position[0], candidateZ - position[2]) >= 1.65)
  )) || [x, z]
}

function ModelMaterial({ color, emissive = '#000000', emissiveIntensity = 0, metalness = .15, roughness = .55, ghost = false }) {
  return (
    <meshStandardMaterial
      color={ghost ? '#71f3bf' : color}
      emissive={ghost ? '#1f765a' : emissive}
      emissiveIntensity={ghost ? .8 : emissiveIntensity}
      metalness={metalness}
      roughness={roughness}
      transparent={ghost}
      opacity={ghost ? .46 : 1}
      wireframe={ghost}
      depthWrite={!ghost}
    />
  )
}

function RoundedLumenTree({ scale = 1, color = '#58c985', ghost = false }) {
  return (
    <group scale={scale}>
      {[[-.2, .42, .08, -.48], [.22, .52, -.06, .48]].map(([x, y, z, tilt], index) => (
        <mesh key={`root_${index}`} position={[x, y, z]} rotation={[0, 0, tilt]} castShadow={!ghost}><cylinderGeometry args={[.08, .13, .72, 7]} /><ModelMaterial color="#684735" roughness={.94} ghost={ghost} /></mesh>
      ))}
      <mesh position={[0, .65, 0]} castShadow={!ghost}><cylinderGeometry args={[.16, .25, 1.3, 9]} /><ModelMaterial color="#79543d" roughness={.9} ghost={ghost} /></mesh>
      {[[-.3, 1.22, .05, -.68], [.32, 1.3, -.04, .72]].map(([x, y, z, tilt], index) => (
        <mesh key={`branch_${index}`} position={[x, y, z]} rotation={[0, 0, tilt]} castShadow={!ghost}><cylinderGeometry args={[.065, .11, .7, 7]} /><ModelMaterial color="#79543d" roughness={.9} ghost={ghost} /></mesh>
      ))}
      <mesh position={[0, 1.55, 0]} scale={[.95, 1.05, .95]} castShadow={!ghost}><dodecahedronGeometry args={[.78, 1]} /><ModelMaterial color={color} emissive="#174c31" emissiveIntensity={.22} roughness={.78} ghost={ghost} /></mesh>
      <mesh position={[-.42, 1.95, .08]} scale={.72} castShadow={!ghost}><dodecahedronGeometry args={[.62, 1]} /><ModelMaterial color="#8be8a5" emissive="#1e5c39" emissiveIntensity={.28} roughness={.76} ghost={ghost} /></mesh>
      <mesh position={[.44, 1.85, -.08]} scale={.64} castShadow={!ghost}><dodecahedronGeometry args={[.62, 1]} /><ModelMaterial color="#6ed794" emissive="#1e5c39" emissiveIntensity={.24} roughness={.76} ghost={ghost} /></mesh>
      {[[-.56, 1.76, .4], [.18, 2.12, .35], [.57, 1.64, .28]].map(([x, y, z], index) => (
        <mesh key={`fruit_${index}`} position={[x, y, z]}><sphereGeometry args={[.075, 9, 7]} /><ModelMaterial color="#c6fff0" emissive="#66f1bd" emissiveIntensity={1.8} roughness={.2} ghost={ghost} /></mesh>
      ))}
    </group>
  )
}

function seededRandom(seed) {
  const x = Math.sin(seed * 999.91 + 12.34) * 43758.5453
  return x - Math.floor(x)
}

function createLumenLeafGeometry(length = 0.26, width = 0.11, fold = 0.035) {
  const positions = new Float32Array([
    // Base (0)
    0, 0, 0,
    // Mid left (1), spine mid (2), mid right (3)
    -width * 0.5, length * 0.35, fold,
    0, length * 0.42, 0,
    width * 0.5, length * 0.35, fold,
    // Upper left (4), spine upper (5), upper right (6)
    -width * 0.35, length * 0.75, fold * 0.6,
    0, length * 0.78, 0,
    width * 0.35, length * 0.75, fold * 0.6,
    // Tip (7)
    0, length, 0,
  ])

  const indices = [
    0, 1, 2,  0, 2, 3,
    1, 4, 5,  1, 5, 2,
    2, 5, 6,  2, 6, 3,
    4, 7, 5,  5, 7, 6,
  ]

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function createTaperedTubeGeometry(points, radii, radialSegments = 8) {
  const numPoints = points.length
  if (numPoints < 2) return new THREE.BufferGeometry()

  const tangents = []
  const normals = []
  const binormals = []

  for (let i = 0; i < numPoints; i++) {
    let t = new THREE.Vector3()
    if (i === 0) {
      t.subVectors(points[1], points[0]).normalize()
    } else if (i === numPoints - 1) {
      t.subVectors(points[numPoints - 1], points[numPoints - 2]).normalize()
    } else {
      t.subVectors(points[i + 1], points[i - 1]).normalize()
    }
    tangents.push(t)
  }

  let n = new THREE.Vector3()
  let initialT = tangents[0]
  if (Math.abs(initialT.y) < 0.99) {
    n.set(0, 1, 0).cross(initialT).normalize()
  } else {
    n.set(1, 0, 0).cross(initialT).normalize()
  }
  normals.push(n)
  binormals.push(new THREE.Vector3().crossVectors(initialT, n).normalize())

  for (let i = 1; i < numPoints; i++) {
    let prevN = normals[i - 1]
    let t = tangents[i]
    let b = new THREE.Vector3().crossVectors(t, prevN)
    if (b.lengthSq() < 0.0001) {
      normals.push(prevN.clone())
      binormals.push(binormals[i - 1].clone())
    } else {
      b.normalize()
      let curN = new THREE.Vector3().crossVectors(b, t).normalize()
      normals.push(curN)
      binormals.push(b)
    }
  }

  const vertices = []
  const indices = []

  for (let i = 0; i < numPoints; i++) {
    const p = points[i]
    const r = radii[i]
    const N = normals[i]
    const B = binormals[i]

    for (let j = 0; j < radialSegments; j++) {
      const angle = (j / radialSegments) * Math.PI * 2
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)

      const vx = p.x + r * (cos * N.x + sin * B.x)
      const vy = p.y + r * (cos * N.y + sin * B.y)
      const vz = p.z + r * (cos * N.z + sin * B.z)

      vertices.push(vx, vy, vz)
    }
  }

  for (let i = 0; i < numPoints - 1; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const nextJ = (j + 1) % radialSegments
      const current = i * radialSegments + j
      const next = i * radialSegments + nextJ
      const currentAbove = (i + 1) * radialSegments + j
      const nextAbove = (i + 1) * radialSegments + nextJ

      indices.push(current, currentAbove, next)
      indices.push(next, currentAbove, nextAbove)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function mergeBufferGeometries(geometries) {
  let totalVertices = 0
  let totalIndices = 0

  geometries.forEach(g => {
    if (!g || !g.attributes || !g.attributes.position) return
    totalVertices += g.attributes.position.array.length
    if (g.index) totalIndices += g.index.array.length
  })

  if (totalVertices === 0) return new THREE.BufferGeometry()

  const mergedPos = new Float32Array(totalVertices)
  // Three.js는 부호 없는(unsigned) 16/32비트 인덱스만 허용. 정점 수가 65536을 넘으면 Uint32.
  const needsUint32 = totalVertices / 3 > 65535
  const mergedIndex = totalIndices > 0
    ? (needsUint32 ? new Uint32Array(totalIndices) : new Uint16Array(totalIndices))
    : null

  let posOffset = 0
  let indexOffset = 0
  let vertIndexOffset = 0

  geometries.forEach(g => {
    if (!g || !g.attributes || !g.attributes.position) return
    const pos = g.attributes.position.array
    mergedPos.set(pos, posOffset)

    if (g.index && mergedIndex) {
      const idx = g.index.array
      for (let i = 0; i < idx.length; i++) {
        mergedIndex[indexOffset + i] = idx[i] + vertIndexOffset
      }
      indexOffset += idx.length
    }

    vertIndexOffset += pos.length / 3
    posOffset += pos.length
  })

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3))
  if (mergedIndex) geo.setIndex(new THREE.BufferAttribute(mergedIndex, 1))
  geo.computeVertexNormals()
  return geo
}

function LeafMaterial({ ghost = false }) {
  return (
    <meshStandardMaterial
      side={THREE.DoubleSide}
      flatShading
      metalness={0}
      roughness={0.9}
      transparent={ghost}
      opacity={ghost ? 0.46 : 1}
      wireframe={ghost}
      depthWrite={!ghost}
      emissive={ghost ? '#1f765a' : '#000000'}
      emissiveIntensity={ghost ? 0.8 : 0}
    />
  )
}

// 수관 부피 덩어리용 저면폴리곤 머티리얼 (flatShading으로 세계관 톤 유지, 루멘 발광)
function CanopyMaterial({ color, emissive, emissiveIntensity = 0.2, ghost = false }) {
  return (
    <meshStandardMaterial
      color={ghost ? '#71f3bf' : color}
      emissive={ghost ? '#1f765a' : emissive}
      emissiveIntensity={ghost ? 0.8 : emissiveIntensity}
      metalness={0}
      roughness={0.88}
      flatShading
      transparent={ghost}
      opacity={ghost ? 0.46 : 1}
      wireframe={ghost}
      depthWrite={!ghost}
    />
  )
}

// 잔가지 끝(twig tip) 주변에 저면폴리곤 덩어리를 군집시켜 울창한 수관 부피를 만든다.
// 기둥(둥치)·뿌리는 노출해야 하므로 덩어리는 가지 끝 영역(상부)에만 작게 형성한다.
function buildCanopyClusters(twigTips) {
  const lower = []
  const middle = []
  const upper = []
  twigTips.forEach((tip, idx) => {
    // 낮은 가지 끝(tip.y < 2.6)에는 덩어리를 아예 두지 않아 둥치가 가려지지 않게 한다.
    if (tip.point.y < 2.6) return
    const clusterCount = 1 + Math.floor(seededRandom(idx * 13 + 1) * 2) // 1~2개 덩어리/tip
    for (let c = 0; c < clusterCount; c++) {
      const cSeed = idx * 31 + c
      const baseRadius = 0.22 + seededRandom(cSeed + 1) * 0.12 // 작게 유지
      const blob = new THREE.IcosahedronGeometry(baseRadius, 1)
      const offset = new THREE.Vector3(
        (seededRandom(cSeed + 2) - 0.5) * 0.26,
        (seededRandom(cSeed + 3) - 0.5) * 0.18 + 0.06,
        (seededRandom(cSeed + 4) - 0.5) * 0.26,
      )
      const pos = tip.point.clone().add(offset)
      const sx = 0.68 + seededRandom(cSeed + 5) * 0.34
      const sy = sx * (0.8 + seededRandom(cSeed + 6) * 0.3)
      const sz = 0.68 + seededRandom(cSeed + 7) * 0.34
      const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(
        seededRandom(cSeed + 8) * Math.PI,
        seededRandom(cSeed + 9) * Math.PI,
        seededRandom(cSeed + 10) * Math.PI,
      ))
      const m = new THREE.Matrix4().compose(pos, quat, new THREE.Vector3(sx, sy, sz))
      blob.applyMatrix4(m)
      if (pos.y < 3.2) lower.push(blob)
      else if (pos.y < 3.7) middle.push(blob)
      else upper.push(blob)
    }
  })
  return {
    lower: mergeBufferGeometries(lower),
    middle: mergeBufferGeometries(middle),
    upper: mergeBufferGeometries(upper),
  }
}

function MatureLumenTree({ scale = 1, ghost = false, seed = 0 }) {
  // 1. 단 하나의 유기적으로 연결된 굽은 줄기 + 뿌리 + 가지(1차, 2차, 잔가지) Merged Wood Geometry
  const { woodGeometry, twigTips } = useMemo(() => {
    const geometries = []
    const tips = []

    // 메인 줄기 S자 곡선 (총 높이 ~3.7, 밑동 0.42 → 상단 0.07). 굵고 또렷한 기둥.
    const trunkPoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-0.06, 0.7, 0.03),
      new THREE.Vector3(0.05, 1.45, -0.03),
      new THREE.Vector3(-0.03, 2.2, 0.04),
      new THREE.Vector3(0.05, 2.9, -0.02),
      new THREE.Vector3(-0.02, 3.5, 0.02),
      new THREE.Vector3(0, 3.7, 0),
    ]
    const trunkRadii = [0.42, 0.36, 0.28, 0.2, 0.13, 0.085, 0.07]
    geometries.push(createTaperedTubeGeometry(trunkPoints, trunkRadii, 10))

    // 넓게 퍼지는 굵은 Buttress Roots (버팀목 가시성 강화)
    const rootDefs = [
      { pts: [new THREE.Vector3(-0.05, 0.3, 0.03), new THREE.Vector3(-0.55, 0.1, 0.28), new THREE.Vector3(-0.92, -0.04, 0.44)], r: [0.27, 0.13, 0.04] },
      { pts: [new THREE.Vector3(0.05, 0.28, -0.02), new THREE.Vector3(0.52, 0.09, -0.32), new THREE.Vector3(0.86, -0.04, -0.52)], r: [0.25, 0.11, 0.035] },
      { pts: [new THREE.Vector3(0, 0.26, -0.04), new THREE.Vector3(-0.18, 0.08, -0.55), new THREE.Vector3(-0.3, -0.04, -0.88)], r: [0.23, 0.1, 0.032] },
      { pts: [new THREE.Vector3(0.03, 0.3, 0.04), new THREE.Vector3(0.4, 0.1, 0.46), new THREE.Vector3(0.64, -0.04, 0.7)], r: [0.22, 0.095, 0.03] },
      { pts: [new THREE.Vector3(-0.04, 0.27, -0.03), new THREE.Vector3(-0.46, 0.09, -0.4), new THREE.Vector3(-0.76, -0.04, -0.64)], r: [0.21, 0.09, 0.028] },
    ]
    rootDefs.forEach(root => {
      geometries.push(createTaperedTubeGeometry(root.pts, root.r, 8))
    })

    // 1차 가지 (6개) - 분기 높이 대폭 상향(y≥2.45): 기둥(둥치)을 완전히 노출.
    const primaryBranchDefs = [
      { tOffset: new THREE.Vector3(0.04, 2.45, -0.03), end: new THREE.Vector3(-1.0, 2.8, 0.28), radii: [0.18, 0.12, 0.07] },
      { tOffset: new THREE.Vector3(0.04, 2.6, -0.03), end: new THREE.Vector3(0.92, 2.95, -0.26), radii: [0.17, 0.115, 0.065] },
      { tOffset: new THREE.Vector3(-0.03, 2.9, 0.04), end: new THREE.Vector3(-0.34, 3.25, 0.8), radii: [0.14, 0.09, 0.055] },
      { tOffset: new THREE.Vector3(-0.03, 3.05, 0.04), end: new THREE.Vector3(0.5, 3.4, -0.72), radii: [0.13, 0.085, 0.05] },
      { tOffset: new THREE.Vector3(0.05, 3.3, -0.02), end: new THREE.Vector3(-0.7, 3.6, -0.38), radii: [0.1, 0.065, 0.04] },
      { tOffset: new THREE.Vector3(0.05, 3.45, -0.02), end: new THREE.Vector3(0.66, 3.7, 0.36), radii: [0.095, 0.06, 0.038] },
    ]

    primaryBranchDefs.forEach((pb, pIdx) => {
      const mid = pb.tOffset.clone().add(pb.end).multiplyScalar(0.5).add(new THREE.Vector3(
        (seededRandom(pIdx * 3) - 0.5) * 0.18,
        0.1,
        (seededRandom(pIdx * 3 + 1) - 0.5) * 0.18
      ))
      const pts = [pb.tOffset, mid, pb.end]
      geometries.push(createTaperedTubeGeometry(pts, pb.radii, 8))

      // 각 1차 가지당 2차 가지 2개씩 분기
      for (let s = 0; s < 2; s++) {
        const sSeed = pIdx * 10 + s
        const sStart = mid.clone().lerp(pb.end, s === 0 ? 0.35 : 0.75)
        const sDir = pb.end.clone().sub(pb.tOffset).normalize()
        const sSpread = new THREE.Vector3(
          (seededRandom(sSeed + 1) - 0.5) * 0.5,
          0.15 + seededRandom(sSeed + 2) * 0.3,
          (seededRandom(sSeed + 3) - 0.5) * 0.5
        ).add(sDir).normalize()

        const sLen = 0.4 + seededRandom(sSeed + 4) * 0.28
        const sEnd = sStart.clone().add(sSpread.clone().multiplyScalar(sLen))
        const sMid = sStart.clone().add(sEnd).multiplyScalar(0.5)

        geometries.push(createTaperedTubeGeometry([sStart, sMid, sEnd], [pb.radii[1] * 0.72, pb.radii[2], 0.03], 6))

        // 잔가지 (Twigs) 2개씩 분기 -> 잔가지 끝이 LeafSpray 중심. 최소 반경 확보(가시성).
        for (let t = 0; t < 2; t++) {
          const tSeed = sSeed * 5 + t
          const tStart = sEnd.clone()
          const tDir = sSpread.clone().add(new THREE.Vector3(
            (seededRandom(tSeed + 1) - 0.5) * 0.55,
            0.12 + seededRandom(tSeed + 2) * 0.25,
            (seededRandom(tSeed + 3) - 0.5) * 0.55
          )).normalize()

          const tLen = 0.24 + seededRandom(tSeed + 4) * 0.16
          const tEnd = tStart.clone().add(tDir.clone().multiplyScalar(tLen))
          geometries.push(createTaperedTubeGeometry([tStart, tEnd], [0.035, 0.028], 5))

          tips.push({ point: tEnd, dir: tDir })
        }
      }
    })

    // 상단 크라운 추가 잔가지
    const topCenterPoint = trunkPoints[trunkPoints.length - 1]
    for (let t = 0; t < 4; t++) {
      const tSeed = 99 + t
      const tStart = topCenterPoint.clone()
      const tDir = new THREE.Vector3(
        (seededRandom(tSeed + 1) - 0.5) * 0.7,
        0.5 + seededRandom(tSeed + 2) * 0.5,
        (seededRandom(tSeed + 3) - 0.5) * 0.7
      ).normalize()
      const tEnd = tStart.clone().add(tDir.clone().multiplyScalar(0.44))
      geometries.push(createTaperedTubeGeometry([tStart, tEnd], [0.03, 0.022], 5))
      tips.push({ point: tEnd, dir: tDir })
    }

    const merged = mergeBufferGeometries(geometries)
    return { woodGeometry: merged, twigTips: tips }
  }, [seed])

  // 2. 부피 수관(clusters) + LeafSpray 잎 카드 겉면 디테일 (이중 레이어)
  //    clusters: 저면폴리곤 덩어리로 울창한 수관 부피 형성 (lower/middle/upper 각 단일 머지 메시)
  //    leafInstances: 덩어리 겉면에 붙는 잎 카드로 표면 질감. 기존 로직 유지하되 높이 기준 상향.
  const canopyClusters = useMemo(() => buildCanopyClusters(twigTips), [twigTips])

  const leafInstances = useMemo(() => {
    const leafGeo = createLumenLeafGeometry(0.26, 0.11, 0.035)

    const lowerData = []  // 2.6 <= Y < 3.2
    const middleData = [] // 3.2 <= Y < 3.7
    const upperData = []  // Y >= 3.7

    const palette = [
      new THREE.Color('#1f633b'), // 어두운 내부
      new THREE.Color('#2d824b'), // 기본 잎
      new THREE.Color('#39995a'), // 바깥 잎
      new THREE.Color('#4aaa68'), // 위쪽 잎
      new THREE.Color('#65bd78'), // 어린 잎
    ]

    twigTips.forEach((tip, tipIdx) => {
      // 낮은 가지 끝은 잎도 두지 않아 둥치·기둥이 가려지지 않게 한다.
      if (tip.point.y < 2.6) return
      const leafCount = 3 + Math.floor(seededRandom(tipIdx * 7) * 2)

      for (let l = 0; l < leafCount; l++) {
        const lSeed = tipIdx * 20 + l
        const leafPos = tip.point.clone().add(new THREE.Vector3(
          (seededRandom(lSeed + 1) - 0.5) * 0.1,
          (seededRandom(lSeed + 2) - 0.5) * 0.08,
          (seededRandom(lSeed + 3) - 0.5) * 0.1
        ))

        const outDir = tip.dir.clone().add(new THREE.Vector3(
          (seededRandom(lSeed + 4) - 0.5) * 0.85,
          (seededRandom(lSeed + 5) - 0.5) * 0.65,
          (seededRandom(lSeed + 6) - 0.5) * 0.85
        )).normalize()

        const quat = new THREE.Quaternion()
        quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), outDir)

        const roll = (seededRandom(lSeed + 7) - 0.5) * 1.3
        const rollQuat = new THREE.Quaternion().setFromAxisAngle(outDir, roll)
        quat.premultiply(rollQuat)

        const scaleVal = 0.82 + seededRandom(lSeed + 8) * 0.42
        const matrix = new THREE.Matrix4().compose(
          leafPos,
          quat,
          new THREE.Vector3(scaleVal, scaleVal, scaleVal)
        )

        let colorIdx = 1
        if (leafPos.y < 3.2) colorIdx = seededRandom(lSeed + 9) > 0.4 ? 0 : 1
        else if (leafPos.y < 3.7) colorIdx = seededRandom(lSeed + 9) > 0.5 ? 2 : 1
        else colorIdx = seededRandom(lSeed + 9) > 0.4 ? 3 : 4

        const color = palette[colorIdx]
        const item = { matrix, color }

        if (leafPos.y < 3.2) lowerData.push(item)
        else if (leafPos.y < 3.7) middleData.push(item)
        else upperData.push(item)
      }
    })

    return { leafGeo, lowerData, middleData, upperData }
  }, [twigTips])

  const lowerRef = useRef()
  const middleRef = useRef()
  const upperRef = useRef()

  useLayoutEffect(() => {
    const applyData = (ref, data) => {
      if (!ref.current) return
      data.forEach((item, i) => {
        ref.current.setMatrixAt(i, item.matrix)
        ref.current.setColorAt(i, item.color)
      })
      ref.current.instanceMatrix.needsUpdate = true
      if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
    }

    applyData(lowerRef, leafInstances.lowerData)
    applyData(middleRef, leafInstances.middleData)
    applyData(upperRef, leafInstances.upperData)
  }, [leafInstances])

  // 3. 바람 애니메이션 (ghost 모드 시 정지)
  const lowerGroupRef = useRef()
  const middleGroupRef = useRef()
  const upperGroupRef = useRef()

  useFrame((state) => {
    if (ghost) return
    const time = state.clock.elapsedTime
    if (lowerGroupRef.current) {
      lowerGroupRef.current.rotation.z = Math.sin(time * 0.45 + seed) * 0.004
      lowerGroupRef.current.rotation.x = Math.sin(time * 0.35 + seed * 1.2) * 0.002
    }
    if (middleGroupRef.current) {
      middleGroupRef.current.rotation.z = Math.sin(time * 0.55 + seed * 1.5) * 0.008
      middleGroupRef.current.rotation.x = Math.sin(time * 0.42 + seed * 0.8) * 0.005
    }
    if (upperGroupRef.current) {
      upperGroupRef.current.rotation.z = Math.sin(time * 0.65 + seed * 2.1) * 0.013
      upperGroupRef.current.rotation.x = Math.sin(time * 0.50 + seed * 1.7) * 0.008
    }
  })

  // 4. 발광 루멘 봉오리/열매 (5개)
  const fruits = useMemo(() => {
    const res = []
    twigTips.forEach((tip, idx) => {
      if (idx % 5 === 0) {
        res.push(tip.point.clone().add(tip.dir.clone().multiplyScalar(0.06)))
      }
    })
    return res
  }, [twigTips])

  return (
    <group scale={scale}>
      {/* 1. 줄기 + 뿌리 + 모든 가지 병합 Wood Mesh (Draw Call = 1) */}
      <mesh geometry={woodGeometry} castShadow={!ghost}>
        <ModelMaterial color="#513525" roughness={0.96} metalness={0} ghost={ghost} />
      </mesh>

      {/* 2. 수관 부피 덩어리 (저면폴리곤). 울창한 수관 실루엣 형성. 3개 그룹 각 단일 메시. */}
      <group ref={lowerGroupRef}>
        <mesh geometry={canopyClusters.lower} castShadow={!ghost}>
          <CanopyMaterial color="#24633c" emissive="#16452c" emissiveIntensity={0.18} ghost={ghost} />
        </mesh>
        {leafInstances.lowerData.length > 0 && (
          <instancedMesh
            ref={lowerRef}
            args={[leafInstances.leafGeo, undefined, leafInstances.lowerData.length]}
            castShadow={!ghost}
          >
            <LeafMaterial ghost={ghost} />
          </instancedMesh>
        )}
      </group>

      <group ref={middleGroupRef}>
        <mesh geometry={canopyClusters.middle} castShadow={!ghost}>
          <CanopyMaterial color="#358a52" emissive="#1c5c38" emissiveIntensity={0.2} ghost={ghost} />
        </mesh>
        {leafInstances.middleData.length > 0 && (
          <instancedMesh
            ref={middleRef}
            args={[leafInstances.leafGeo, undefined, leafInstances.middleData.length]}
            castShadow={!ghost}
          >
            <LeafMaterial ghost={ghost} />
          </instancedMesh>
        )}
      </group>

      <group ref={upperGroupRef}>
        <mesh geometry={canopyClusters.upper} castShadow={!ghost}>
          <CanopyMaterial color="#4baa68" emissive="#246638" emissiveIntensity={0.24} ghost={ghost} />
        </mesh>
        {leafInstances.upperData.length > 0 && (
          <instancedMesh
            ref={upperRef}
            args={[leafInstances.leafGeo, undefined, leafInstances.upperData.length]}
            castShadow={!ghost}
          >
            <LeafMaterial ghost={ghost} />
          </instancedMesh>
        )}
      </group>

      {/* 3. 루멘 발광 열매 */}
      {fruits.map((pos, idx) => (
        <mesh key={`fruit_${idx}`} position={pos}>
          <sphereGeometry args={[0.075, 8, 8]} />
          <ModelMaterial
            color="#e2fff3"
            emissive="#5af0af"
            emissiveIntensity={2}
            roughness={0.2}
            ghost={ghost}
          />
        </mesh>
      ))}

      {/* 4. 은은한 대표 포인트 라이트 단 1개 */}
      {!ghost && (
        <pointLight
          position={[0, 3, 0.2]}
          color="#6bf5ba"
          intensity={0.4}
          distance={2.8}
        />
      )}
    </group>
  )
}

function CrystalCluster({ color = '#77e9ff', ghost = false, scale = 1 }) {
  return (
    <group scale={scale}>
      {[[-.38, .48, 0, .68, -.12], [0, .7, .05, .9, .04], [.42, .44, -.05, .62, .16]].map(([x, y, z, size, tilt], index) => (
        <mesh key={index} position={[x, y, z]} rotation={[tilt, 0, tilt]} castShadow={!ghost}>
          <octahedronGeometry args={[size, 0]} />
          <ModelMaterial color={index === 1 ? color : '#b59cff'} emissive={color} emissiveIntensity={.85} metalness={.35} roughness={.18} ghost={ghost} />
        </mesh>
      ))}
    </group>
  )
}

// 별빛 램프 Stage 2: 외행성 개척 비콘(Frontier Photon Beacon).
// 항로 표시 / 환경 감지 / 비상 통신 / 야간 조명을 동시에 수행하는 자율 비콘.
// 가장 가까운 1개만 spotLight를 damp 보간으로 부드럽게 켜고, 나머지는 emissive로만 발광.
function MatureStarLamp({ scale = 1, ghost = false, seed = 0, dynamicLightActive = false }) {
  const outerGimbalRef = useRef()
  const innerGimbalRef = useRef()
  const coreRef = useRef()
  const coreMatRef = useRef()
  const lightRef = useRef()
  // spotLight target: 램프 바로 아래 지면을 향함. useMemo로 한 번만 생성(매 렌더 재생성 방지).
  const lightTarget = useMemo(() => {
    const obj = new THREE.Object3D()
    obj.position.set(0, 0, 0)
    return obj
  }, [])
  // 램프 인스턴스 간 펄스 위상 분리. seed 가 0~1로 들어오므로 정수화.
  const phase = (((seed || 0) % 97) / 97) * Math.PI * 2

  // spotLight target을 램프 기준 지면 방향(아래)으로 고정.
  useLayoutEffect(() => {
    if (lightRef.current) {
      lightRef.current.target = lightTarget
    }
  }, [lightTarget])

  useFrame((state, delta) => {
    if (ghost) return
    const time = state.clock.elapsedTime + phase

    // 외부 짐벌: 매우 느린 수평 회전(기계식 항로 스캔)
    if (outerGimbalRef.current) outerGimbalRef.current.rotation.y = time * 0.09
    // 내부 짐벌: 미세한 피칭(레이더/카메라 짐벌처럼)
    if (innerGimbalRef.current) innerGimbalRef.current.rotation.z = Math.sin(time * 0.28) * 0.08

    // 짧은 펄스 신호(약 3.2초 주기). pow(sin, 10)로 날카롭게.
    const pulse = Math.pow(Math.max(0, Math.sin(time * 1.9)), 10)
    if (coreRef.current) {
      const coreScale = 1 + pulse * 0.035
      coreRef.current.scale.setScalar(coreScale)
    }
    if (coreMatRef.current) {
      coreMatRef.current.emissiveIntensity = 1.4 + pulse * 1.5
    }

    // 동적 조명 intensity damp 보간. 갑작스러운 on/off 방지.
    if (lightRef.current) {
      const target = dynamicLightActive ? 0.55 : 0
      lightRef.current.intensity = THREE.MathUtils.damp(lightRef.current.intensity, target, 6, delta)
    }
  })

  return (
    <group scale={scale}>
      {/* === 4.1 삼점식 지면 앵커 (120도 간격) === */}
      {[0, 1, 2].map((i) => {
        const angle = (i / 3) * Math.PI * 2
        const reach = 0.42
        const x = Math.sin(angle) * reach
        const z = Math.cos(angle) * reach
        return (
          <group key={`anchor_${i}`} position={[x, 0, z]} rotation={[0, angle, 0]}>
            {/* 지면 압력 패드 */}
            <mesh position={[0, .03, 0]} castShadow={!ghost}><cylinderGeometry args={[.12, .15, .06, 8]} /><ModelMaterial color="#293B4A" metalness={.65} roughness={.42} ghost={ghost} /></mesh>
            {/* 충격 흡수 실린더 */}
            <mesh position={[0, .12, 0]} castShadow={!ghost}><cylinderGeometry args={[.045, .055, .16, 8]} /><ModelMaterial color="#486174" metalness={.55} roughness={.48} ghost={ghost} /></mesh>
            {/* 베이스로 향하는 지지 암 */}
            <mesh position={[-0.13, .14, 0]} castShadow={!ghost}><boxGeometry args={[.26, .05, .07]} /><ModelMaterial color="#293B4A" metalness={.65} roughness={.42} ghost={ghost} /></mesh>
            {/* 압력 패드 위 청록 위치등 */}
            <mesh position={[0, .075, 0]}><sphereGeometry args={[.022, 8, 6]} /><ModelMaterial color="#67E8F9" emissive="#22a8c0" emissiveIntensity={1.2} ghost={ghost} /></mesh>
          </group>
        )
      })}

      {/* === 4.2 육각형 전력 베이스 (상하 반경 다르게) === */}
      <mesh position={[0, .13, 0]} castShadow={!ghost} receiveShadow><cylinderGeometry args={[.55, .64, .22, 6]} /><ModelMaterial color="#293B4A" metalness={.65} roughness={.42} ghost={ghost} /></mesh>
      {/* 열 차폐 세라믹 중단 */}
      <mesh position={[0, .26, 0]} castShadow={!ghost}><cylinderGeometry args={[.5, .54, .06, 6]} /><ModelMaterial color="#C9C9B9" metalness={.05} roughness={.7} ghost={ghost} /></mesh>
      {/* 내부 에너지 코어 슬롯 발광 (3개 방사형) */}
      {[0, 1, 2].map((i) => {
        const angle = (i / 3) * Math.PI * 2 + Math.PI / 6
        return <mesh key={`core_${i}`} position={[Math.cos(angle) * .38, .17, Math.sin(angle) * .38]}><boxGeometry args={[.04, .04, .12]} /><ModelMaterial color="#67E8F9" emissive="#22a8c0" emissiveIntensity={1.1} ghost={ghost} /></mesh>
      })}

      {/* === 4.3 분절형 중앙 마스트 (3분할 + 두꺼운 칼라) === */}
      {/* 하단 동력부 (약간 굵게) */}
      <mesh position={[0, .68, 0]} castShadow={!ghost}><cylinderGeometry args={[.13, .17, .58, 12]} /><ModelMaterial color="#293B4A" metalness={.65} roughness={.42} ghost={ghost} /></mesh>
      {/* 하단-중앙 연결 칼라 */}
      <mesh position={[0, .97, 0]} castShadow={!ghost}><cylinderGeometry args={[.16, .16, .06, 12]} /><ModelMaterial color="#486174" metalness={.55} roughness={.48} ghost={ghost} /></mesh>
      {/* 중앙 구조부 */}
      <mesh position={[0, 1.26, 0]} castShadow={!ghost}><cylinderGeometry args={[.12, .13, .52, 12]} /><ModelMaterial color="#293B4A" metalness={.65} roughness={.42} ghost={ghost} /></mesh>
      {/* 마스트 세로 발광선 (전력 진단등, 3개) */}
      {[0, 1, 2].map((i) => {
        const angle = (i / 3) * Math.PI * 2
        return <mesh key={`diag_${i}`} position={[Math.cos(angle) * .135, 1.26, Math.sin(angle) * .135]}><boxGeometry args={[.018, .42, .018]} /><ModelMaterial color="#67E8F9" emissive="#22a8c0" emissiveIntensity={.9} ghost={ghost} /></mesh>
      })}
      {/* 중앙-상단 연결 칼라 */}
      <mesh position={[0, 1.55, 0]} castShadow={!ghost}><cylinderGeometry args={[.15, .15, .06, 12]} /><ModelMaterial color="#486174" metalness={.55} roughness={.48} ghost={ghost} /></mesh>
      {/* 상단 회전부 (가늘게) */}
      <mesh position={[0, 1.8, 0]} castShadow={!ghost}><cylinderGeometry args={[.1, .12, .44, 12]} /><ModelMaterial color="#293B4A" metalness={.65} roughness={.42} ghost={ghost} /></mesh>

      {/* === 4.4 열 방출 핀 (방사형 4개) === */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 8
        return (
          <mesh key={`fin_${i}`} position={[Math.cos(angle) * .15, 1.72, Math.sin(angle) * .15]} castShadow={!ghost}>
            <boxGeometry args={[.04, .22, .18]} />
            <ModelMaterial color="#3a4a5e" metalness={.4} roughness={.6} ghost={ghost} />
          </mesh>
        )
      })}

      {/* === 4.5 기계식 광학 짐벌 (2축) + 4.6 수정 유리 광학 코어 === */}
      <group ref={outerGimbalRef} position={[0, 2.1, 0]}>
        {/* 외부 링 (수평 회전 장치) + 모터 하우징 */}
        <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.28, .035, 8, 20]} /><ModelMaterial color="#486174" metalness={.55} roughness={.48} ghost={ghost} /></mesh>
        <mesh position={[.28, 0, 0]}><boxGeometry args={[.08, .08, .08]} /><ModelMaterial color="#293B4A" metalness={.65} roughness={.42} ghost={ghost} /></mesh>
        <mesh position={[-.28, 0, 0]}><boxGeometry args={[.08, .08, .08]} /><ModelMaterial color="#293B4A" metalness={.65} roughness={.42} ghost={ghost} /></mesh>
        {/* 내부 링 (피칭 축) */}
        <group ref={innerGimbalRef}>
          <mesh><torusGeometry args={[.2, .028, 8, 18]} /><ModelMaterial color="#486174" metalness={.55} roughness={.48} ghost={ghost} /></mesh>
          {/* 외부 금속 보호 프레임 (코어 감싸기) */}
          <mesh position={[0, .14, 0]}><boxGeometry args={[.34, .04, .34]} /><ModelMaterial color="#293B4A" metalness={.65} roughness={.42} ghost={ghost} /></mesh>
          <mesh position={[0, -.14, 0]}><boxGeometry args={[.34, .04, .34]} /><ModelMaterial color="#293B4A" metalness={.65} roughness={.42} ghost={ghost} /></mesh>
          {/* 반투명 보호 셸 */}
          <mesh><sphereGeometry args={[.16, 16, 12]} /><meshPhysicalMaterial color={ghost ? '#71f3bf' : '#fff3b0'} transparent opacity={ghost ? .42 : .32} roughness={.12} metalness={.05} depthWrite={!ghost} emissive={ghost ? '#1f765a' : '#ffd98a'} emissiveIntensity={ghost ? .8 : .5} /></mesh>
          {/* 내부 발광 결정 (수정 유리 광학 코어) */}
          <mesh ref={coreRef} rotation={[0, Math.PI / 4, 0]}>
            <octahedronGeometry args={[.11, 0]} />
            <meshStandardMaterial ref={coreMatRef} color={ghost ? '#71f3bf' : '#FFF3B0'} emissive={ghost ? '#1f765a' : '#FFBF5B'} emissiveIntensity={1.4} metalness={.2} roughness={.18} toneMapped={false} />
          </mesh>
        </group>
      </group>

      {/* === 4.7 환경 센서 크라운 (작은 안테나 3개, 전체 높이 10% 이내) === */}
      <group position={[0, 2.42, 0]}>
        {[0, 1, 2].map((i) => {
          const angle = (i / 3) * Math.PI * 2
          const r = .06
          return (
            <group key={`sensor_${i}`} position={[Math.cos(angle) * r, 0, Math.sin(angle) * r]}>
              <mesh castShadow={!ghost}><cylinderGeometry args={[.008, .012, .14, 6]} /><ModelMaterial color="#486174" metalness={.55} roughness={.48} ghost={ghost} /></mesh>
              <mesh position={[0, .08, 0]}><sphereGeometry args={[.012, 6, 5]} /><ModelMaterial color="#67E8F9" emissive="#22a8c0" emissiveIntensity={1} ghost={ghost} /></mesh>
            </group>
          )
        })}
        {/* 중앙 통신 안테나 */}
        <mesh castShadow={!ghost}><cylinderGeometry args={[.01, .015, .16, 6]} /><ModelMaterial color="#293B4A" metalness={.65} roughness={.42} ghost={ghost} /></mesh>
      </group>

      {/* === 4.8 수정 유리 카트리지 배출구 (베이스 전면) === */}
      <group position={[0, .17, .5]}>
        <mesh><boxGeometry args={[.18, .08, .04]} /><ModelMaterial color="#293B4A" metalness={.65} roughness={.42} ghost={ghost} /></mesh>
        {/* 서비스 상태등 */}
        <mesh position={[.12, 0, 0]}><sphereGeometry args={[.018, 8, 6]} /><ModelMaterial color="#67E8F9" emissive="#22a8c0" emissiveIntensity={1.1} ghost={ghost} /></mesh>
      </group>

      {/* === 6. 실제 동적 조명 (spotLight, 가장 가까운 1개만, castShadow=false) === */}
      {!ghost && (
        <>
          <spotLight
            ref={lightRef}
            position={[0, 1.9, 0]}
            color="#ffe6a1"
            intensity={0}
            distance={4.8}
            angle={0.72}
            penumbra={0.85}
            decay={2}
            castShadow={false}
          />
          {/* 지면 조준 target (램프 바로 아래). primitive로 씬 그래프에 추가해 transform 반영. */}
          <primitive object={lightTarget} position={[0, 0, 0]} />
        </>
      )}
    </group>
  )
}

// 탐사 로버 정비소 Stage 2: 외행성 로버 서비스 도크(Autonomous Rover Service Dock).
// 진입/정렬/세척/진단/충전/부품교체를 수행하는 반개방형 자율 도크.
// 가장 가까운 1개만 spotLight를 damp 보간으로 부드럽게 켜고, 나머지는 emissive로만 발광.
// 8초 주기 자체 루프(idle→scanning→repairing→charging)로 천천히 전환(상시 과동작 방지).
function MatureRoverBay({ scale = 1, ghost = false, dynamicLightActive = false, roverStatus = 'idle' }) {
  const gantryRef = useRef()
  const leftShoulderRef = useRef()
  const leftElbowRef = useRef()
  const rightShoulderRef = useRef()
  const rightElbowRef = useRef()
  const couplerRef = useRef()
  const couplerMatRef = useRef()
  const lightRef = useRef()
  const normalizedStatus = ['active', 'ready', 'claimed'].includes(roverStatus) ? roverStatus : 'idle'
  const statusColor = normalizedStatus === 'ready' ? '#ffe18a' : normalizedStatus === 'active' ? '#71d7ff' : normalizedStatus === 'claimed' ? '#83f1bd' : '#63e6d2'
  const statusEmissive = normalizedStatus === 'ready' ? '#a86812' : normalizedStatus === 'active' ? '#2a7fa8' : normalizedStatus === 'claimed' ? '#25795b' : '#2a9a8a'
  // spotLight target: 도크 중앙 바닥 방향. useMemo로 한 번만 생성.
  const lightTarget = useMemo(() => {
    const obj = new THREE.Object3D()
    obj.position.set(0, 0, 0)
    return obj
  }, [])

  useLayoutEffect(() => {
    if (lightRef.current) lightRef.current.target = lightTarget
  }, [lightTarget])

  useFrame((state, delta) => {
    if (ghost) return
    const time = state.clock.elapsedTime
    // 8초 주기 자체 루프. 0~0.25 idle / 0.25~0.5 scanning / 0.5~0.75 repairing / 0.75~1 charging
    const cycle = (time % 8) / 8
    const isScanning = cycle >= 0.25 && cycle < 0.5
    const isRepairing = cycle >= 0.5 && cycle < 0.75
    const isCharging = cycle >= 0.75

    // 갠트리 스캐너 캐리지: scanning 구간에서만 좌우 왕복, 그 외엔 중앙으로 복귀(damp).
    if (gantryRef.current) {
      const targetX = isScanning ? Math.sin(time * 0.7) * 0.75 : 0
      gantryRef.current.position.x = THREE.MathUtils.damp(gantryRef.current.position.x, targetX, 4, delta)
    }
    // 충전 커플러: charging 구간에서 상승, 그 외엔 수납(damp).
    if (couplerRef.current) {
      const targetY = isCharging ? 0.26 : 0.17
      couplerRef.current.position.y = THREE.MathUtils.damp(couplerRef.current.position.y, targetY, 6, delta)
    }
    if (couplerMatRef.current) {
      couplerMatRef.current.emissiveIntensity = isCharging ? 1.8 + Math.sin(time * 6) * 0.4 : 0.9
    }
    // 좌측 기계 정비 팔: repairing 구간에서 접근 자세, 그 외엔 접힌 자세(damp).
    if (leftShoulderRef.current) {
      const target = isRepairing ? -0.45 : -1.1
      leftShoulderRef.current.rotation.z = THREE.MathUtils.damp(leftShoulderRef.current.rotation.z, target, 5, delta)
    }
    if (leftElbowRef.current) {
      const target = isRepairing ? 0.75 : 0.25
      leftElbowRef.current.rotation.z = THREE.MathUtils.damp(leftElbowRef.current.rotation.z, target, 5, delta)
    }
    // 우측 진단 팔: scanning/repairing 구간에서 약간 내려오며 스캔 자세.
    if (rightShoulderRef.current) {
      const target = (isScanning || isRepairing) ? -0.35 : -1.1
      rightShoulderRef.current.rotation.z = THREE.MathUtils.damp(rightShoulderRef.current.rotation.z, target, 5, delta)
    }
    if (rightElbowRef.current) {
      const target = isScanning ? 0.6 : 0.25
      rightElbowRef.current.rotation.z = THREE.MathUtils.damp(rightElbowRef.current.rotation.z, target, 5, delta)
    }
    // 동적 조명 intensity damp 보간.
    if (lightRef.current) {
      const target = dynamicLightActive ? 0.45 : 0
      lightRef.current.intensity = THREE.MathUtils.damp(lightRef.current.intensity, target, 6, delta)
    }
  })

  return (
    <group scale={scale}>
      {/* === 5.1 강화 서비스 패드 (3층) === */}
      {/* 하부 기초층 (모서리 잘린 효과: 중앙 박스 + 좌우 얇은 패드) */}
      <mesh position={[0, .06, 0]} receiveShadow><boxGeometry args={[3.6, .12, 3.1]} /><ModelMaterial color="#1C2B35" metalness={.45} roughness={.55} ghost={ghost} /></mesh>
      {/* 중앙 서비스 데크 */}
      <mesh position={[0, .14, 0]} receiveShadow><boxGeometry args={[3.2, .06, 2.7]} /><ModelMaterial color="#283B49" metalness={.5} roughness={.5} ghost={ghost} /></mesh>
      {/* 코너 황색 안전 마킹 4개 */}
      {[[-1.6, 1.25], [1.6, 1.25], [-1.6, -1.25], [1.6, -1.25]].map(([x, z], i) => (
        <mesh key={`safety_${i}`} position={[x, .15, z]}><boxGeometry args={[.3, .02, .3]} /><ModelMaterial color="#FFB05C" emissive="#7a4a1a" emissiveIntensity={.4} ghost={ghost} /></mesh>
      ))}
      {/* 지면 앵커 4개 (떠 보이지 않게) */}
      {[[-1.7, 1.4], [1.7, 1.4], [-1.7, -1.4], [1.7, -1.4]].map(([x, z], i) => (
        <mesh key={`anchor_${i}`} position={[x, .04, z]}><cylinderGeometry args={[.08, .1, .08, 8]} /><ModelMaterial color="#526A78" metalness={.55} roughness={.42} ghost={ghost} /></mesh>
      ))}

      {/* === 5.2 로버 진입 유도 시스템 === */}
      {/* 휠 가이드 레일 2개 (전면 넓게, 안쪽으로 좁아짐은 회전으로 표현) */}
      {[[-.9, .9], [.9, .9]].map(([x, rot], i) => (
        <mesh key={`guide_${i}`} position={[x * (i === 0 ? 1 : 1), .17, .4]} rotation={[0, rot * (i === 0 ? -.12 : .12), 0]}><boxGeometry args={[.12, .06, 1.8]} /><ModelMaterial color="#A9B8BE" metalness={.75} roughness={.25} ghost={ghost} /></mesh>
      ))}
      {/* 바닥 유도등 emissive 스트립 5개 (진입 방향) */}
      {[-.4, -.2, 0, .2, .4].map((z, i) => (
        <mesh key={`guidelight_${i}`} position={[0, .155, 1.1 + z]}><boxGeometry args={[1.4, .005, .04]} /><ModelMaterial color="#71D7FF" emissive="#2a7fa8" emissiveIntensity={.9} ghost={ghost} /></mesh>
      ))}
      {/* 휠 스토퍼 4개 (도크 후면) */}
      {[[-.7, -.9], [-.3, -.9], [.3, -.9], [.7, -.9]].map(([x, z], i) => (
        <mesh key={`stopper_${i}`} position={[x, .16, z]}><boxGeometry args={[.18, .05, .12]} /><ModelMaterial color="#526A78" metalness={.55} roughness={.42} ghost={ghost} /></mesh>
      ))}

      {/* === 5.10 바닥 로버 정렬 윤곽선 (안 B, 성능 최소) === */}
      <mesh position={[0, .158, -.1]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.7, .74, 6]} /><meshBasicMaterial color="#63E6D2" transparent opacity={.35} depthWrite={false} /></mesh>

      {/* === 5.3 중앙 충전 커플러 (승강식) === */}
      <group ref={couplerRef} position={[0, .17, -.1]}>
        <mesh><cylinderGeometry args={[.26, .3, .08, 6]} /><ModelMaterial color="#283B49" metalness={.65} roughness={.4} ghost={ghost} /></mesh>
        <mesh position={[0, .05, 0]}><torusGeometry args={[.18, .025, 8, 6]} /><ModelMaterial ref={couplerMatRef} color="#63E6D2" emissive="#2a9a8a" emissiveIntensity={.9} ghost={ghost} /></mesh>
        <mesh position={[0, .07, 0]}><torusGeometry args={[.1, .02, 8, 6]} /><ModelMaterial color="#63E6D2" emissive="#2a9a8a" emissiveIntensity={1.1} ghost={ghost} /></mesh>
      </group>

      {/* === 5.4 좌우 서비스 타워 (분절형) === */}
      {[-1, 1].map((dir) => (
        <group key={`tower_${dir}`} position={[dir * 1.6, 0, 0]}>
          {/* 하부 베이스 */}
          <mesh position={[0, .35, 0]} castShadow={!ghost}><boxGeometry args={[.42, .7, .5]} /><ModelMaterial color="#283B49" metalness={.65} roughness={.44} ghost={ghost} /></mesh>
          {/* 중앙 프레임 */}
          <mesh position={[0, 1.2, 0]} castShadow={!ghost}><boxGeometry args={[.24, .9, .28]} /><ModelMaterial color="#526A78" metalness={.55} roughness={.42} ghost={ghost} /></mesh>
          {/* 밝은 세라믹 커버 */}
          <mesh position={[dir * -.12, 1.2, 0]}><boxGeometry args={[.06, .7, .22]} /><ModelMaterial color="#C5D0CB" metalness={.08} roughness={.62} ghost={ghost} /></mesh>
          {/* 케이블 덕트 */}
          <mesh position={[dir * .16, 1.2, 0]} castShadow={!ghost}><boxGeometry args={[.06, .8, .08]} /><ModelMaterial color="#1C2B35" metalness={.4} roughness={.6} ghost={ghost} /></mesh>
          {/* 상태 표시등 */}
        <mesh position={[0, 1.75, .12]}><boxGeometry args={[.12, .06, .03]} /><ModelMaterial color={statusColor} emissive={statusEmissive} emissiveIntensity={1.3} ghost={ghost} /></mesh>
          {/* 상단 갠트리 연결부 */}
          <mesh position={[0, 2.1, 0]} castShadow={!ghost}><boxGeometry args={[.3, .14, .3]} /><ModelMaterial color="#283B49" metalness={.65} roughness={.44} ghost={ghost} /></mesh>
        </group>
      ))}

      {/* === 5.5 상단 갠트리 레일 + 스캐너 캐리지 === */}
      <mesh position={[0, 2.35, 0]} castShadow={!ghost}><boxGeometry args={[3.4, .14, .22]} /><ModelMaterial color="#526A78" metalness={.55} roughness={.42} ghost={ghost} /></mesh>
      {/* 이동 레일 (빔 아래) */}
      <mesh position={[0, 2.24, 0]}><boxGeometry args={[3.2, .04, .06]} /><ModelMaterial color="#A9B8BE" metalness={.75} roughness={.25} ghost={ghost} /></mesh>
      {/* 스캐너 캐리지 (gantryRef로 좌우 이동) */}
      <group ref={gantryRef} position={[0, 2.12, 0]}>
        <mesh><boxGeometry args={[.28, .18, .2]} /><ModelMaterial color="#283B49" metalness={.65} roughness={.4} ghost={ghost} /></mesh>
        {/* 스캐너 헤드 (아래로) */}
        <mesh position={[0, -.16, 0]}><boxGeometry args={[.16, .14, .16]} /><ModelMaterial color="#C5D0CB" metalness={.08} roughness={.62} ghost={ghost} /></mesh>
        <mesh position={[0, -.26, 0]}><boxGeometry args={[.22, .02, .22]} /><meshBasicMaterial color="#71D7FF" transparent opacity={.4} depthWrite={false} /></mesh>
      </group>
      {/* 양끝 충돌 방지 스토퍼 + 경고등 */}
      {[-1.6, 1.6].map((x, i) => (
        <mesh key={`gantryStop_${i}`} position={[x, 2.35, 0]}><boxGeometry args={[.08, .22, .26]} /><ModelMaterial color="#FFB05C" emissive="#7a4a1a" emissiveIntensity={.5} ghost={ghost} /></mesh>
      ))}

      {/* === 5.6 다축 로봇 정비 팔 (좌: 기계 / 우: 진단) === */}
      {[
        { dir: -1, shoulderRef: leftShoulderRef, elbowRef: leftElbowRef, tool: 'mechanical' },
        { dir: 1, shoulderRef: rightShoulderRef, elbowRef: rightElbowRef, tool: 'scanner' },
      ].map((arm) => (
        <group key={`arm_${arm.dir}`} position={[arm.dir * 1.35, .55, 0]}>
          {/* 회전 베이스 */}
          <mesh position={[0, .18, 0]} castShadow={!ghost}><cylinderGeometry args={[.2, .25, .36, 10]} /><ModelMaterial color="#283B49" metalness={.7} roughness={.4} ghost={ghost} /></mesh>
          {/* 어깨(shoulder) 그룹 - rotation.z로 회전 */}
          <group ref={arm.shoulderRef} position={[0, .38, 0]} rotation={[0, 0, -1.1]}>
            {/* 상완 */}
            <mesh position={[0, .35, 0]} castShadow={!ghost}><boxGeometry args={[.18, .7, .22]} /><ModelMaterial color="#C5D0CB" metalness={.25} roughness={.55} ghost={ghost} /></mesh>
            {/* 어깨 관절 실린더 */}
            <mesh position={[0, 0, 0]}><cylinderGeometry args={[.16, .16, .22, 10]} /><ModelMaterial color="#526A78" metalness={.65} roughness={.35} ghost={ghost} /></mesh>
            {/* 팔꿈치(elbow) 그룹 - rotation.z로 회전 */}
            <group ref={arm.elbowRef} position={[0, .7, 0]} rotation={[0, 0, .25]}>
              <mesh position={[0, .28, 0]} castShadow={!ghost}><boxGeometry args={[.15, .56, .18]} /><ModelMaterial color="#C5D0CB" metalness={.22} roughness={.58} ghost={ghost} /></mesh>
              {/* 손목 */}
              <mesh position={[0, .6, 0]}><cylinderGeometry args={[.1, .1, .14, 8]} /><ModelMaterial color="#526A78" metalness={.65} roughness={.35} ghost={ghost} /></mesh>
              {/* 공구 헤드: 기계팔=클램프(주황), 진단팔=센서(청록) */}
              {arm.tool === 'mechanical' ? (
                <>
                  <mesh position={[0, .72, 0]}><boxGeometry args={[.18, .06, .16]} /><ModelMaterial color="#526A78" metalness={.65} roughness={.35} ghost={ghost} /></mesh>
                  <mesh position={[-.06, .78, 0]}><boxGeometry args={[.03, .08, .12]} /><ModelMaterial color="#FFB05C" emissive="#7a4a1a" emissiveIntensity={1} ghost={ghost} /></mesh>
                  <mesh position={[.06, .78, 0]}><boxGeometry args={[.03, .08, .12]} /><ModelMaterial color="#FFB05C" emissive="#7a4a1a" emissiveIntensity={1} ghost={ghost} /></mesh>
                </>
              ) : (
                <>
                  <mesh position={[0, .72, 0]}><sphereGeometry args={[.09, 10, 8]} /><ModelMaterial color="#71D7FF" emissive="#2a7fa8" emissiveIntensity={1.2} ghost={ghost} /></mesh>
                  <mesh position={[0, .82, 0]}><cylinderGeometry args={[.04, .06, .08, 8]} /><ModelMaterial color="#526A78" metalness={.65} roughness={.35} ghost={ghost} /></mesh>
                </>
              )}
            </group>
          </group>
        </group>
      ))}

      {/* === 5.9 후면 통제 콘솔 (역할별 분리) === */}
      <group position={[0, .14, -1.35]}>
        {/* 중앙 서비스 콘솔 */}
        <mesh position={[0, .55, 0]} castShadow={!ghost}><boxGeometry args={[1.2, 1.1, .18]} /><ModelMaterial color="#283B49" metalness={.65} roughness={.4} ghost={ghost} /></mesh>
        {/* 좌측 전력·배터리 모듈 */}
        <mesh position={[-.85, .45, 0]} castShadow={!ghost}><boxGeometry args={[.4, .9, .18]} /><ModelMaterial color="#526A78" metalness={.55} roughness={.42} ghost={ghost} /></mesh>
        {/* 우측 진단 서버 모듈 */}
        <mesh position={[.85, .45, 0]} castShadow={!ghost}><boxGeometry args={[.4, .9, .18]} /><ModelMaterial color="#526A78" metalness={.55} roughness={.42} ghost={ghost} /></mesh>
        {/* 상단 상태 바 */}
        <mesh position={[0, 1.2, 0]}><boxGeometry args={[1.8, .08, .04]} /><ModelMaterial color={statusColor} emissive={statusEmissive} emissiveIntensity={1.1} ghost={ghost} /></mesh>
        {/* 게이지 메쉬 (막대그래프 표현) */}
        {[-.4, -.2, 0, .2, .4].map((x, i) => (
          <mesh key={`gauge_${i}`} position={[x, .6, .1]}><boxGeometry args={[.06, .2 + (i % 3) * .12, .02]} /><ModelMaterial color={i % 2 ? '#71D7FF' : '#63E6D2'} emissive={i % 2 ? '#2a7fa8' : '#2a9a8a'} emissiveIntensity={1} ghost={ghost} /></mesh>
        ))}
      </group>

      {/* === 5.8 진입부 에어 노즐 (먼지 제거, 파티클 없이 메쉬만) === */}
      {[-1.4, 1.4].map((x, i) => (
        <group key={`nozzle_${i}`} position={[x, .3, 1.2]}>
          <mesh><cylinderGeometry args={[.05, .07, .25, 8]} /><ModelMaterial color="#526A78" metalness={.55} roughness={.42} ghost={ghost} /></mesh>
          <mesh position={[0, -.14, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.04, .06, .08, 8]} /><ModelMaterial color="#283B49" metalness={.65} roughness={.4} ghost={ghost} /></mesh>
        </group>
      ))}

      {/* === 8. 실제 동적 조명 (spotLight, 가장 가까운 1개만, castShadow=false) === */}
      {!ghost && (
        <>
          <spotLight
            ref={lightRef}
            position={[0, 2.35, -.1]}
            color="#e5f8ff"
            intensity={0}
            distance={4.6}
            angle={0.82}
            penumbra={0.9}
            decay={2}
            castShadow={false}
          />
          <primitive object={lightTarget} position={[0, 0, 0]} />
        </>
      )}
    </group>
  )
}

// 수정 연못 Stage 2: 외행성 수정 생태 샘(Xenobiotic Crystal Spring).
// 지하 광물수가 용출되어 수정성 암반과 수생 생태계를 형성한 천연 샘.
// 가장 가까운 1개만 spotLight를 damp 보간으로 부드럽게 켜고, 나머지는 emissive로만 발광.
// 자연 애니메이션(샘물 흐름, 유입부 물결, 수생 식물 미세 흔들림, 간헐 기포)으로 생태감 표현.
function MatureCrystalPond({ scale = 1, ghost = false, dynamicLightActive = false }) {
  const springMatRef = useRef()
  const floraRef = useRef()
  const rippleRefs = useRef([])
  const bubbleRefs = useRef([])
  const lightRef = useRef()
  // spotLight target: 연못 중심 수면 방향. useMemo로 한 번만 생성.
  const lightTarget = useMemo(() => {
    const obj = new THREE.Object3D()
    obj.position.set(0, 0.15, 0.2)
    return obj
  }, [])

  useLayoutEffect(() => {
    if (lightRef.current) lightRef.current.target = lightTarget
  }, [lightTarget])

  useFrame((state, delta) => {
    if (ghost) return
    const time = state.clock.elapsedTime

    // 샘물 계류 투명도 미세 변화 (흐르는 느낌)
    if (springMatRef.current) {
      springMatRef.current.opacity = 0.48 + Math.sin(time * 0.7) * 0.025
    }
    // 수생 식물 미세 흔들림
    if (floraRef.current) {
      floraRef.current.rotation.z = Math.sin(time * 0.55) * 0.018
    }
    // 유입부 물결 링: scale 확장 + opacity 감소 루프
    rippleRefs.current.forEach((ripple, index) => {
      if (!ripple) return
      const cycle = (time * 0.22 + index * 0.4) % 1
      const scaleValue = 0.35 + cycle * 0.75
      ripple.scale.setScalar(scaleValue)
      ripple.material.opacity = (1 - cycle) * 0.14
    })
    // 간헐 기포: y 상승 + opacity 0 (Sparkles 대안, 자연 기포 표현)
    bubbleRefs.current.forEach((bubble, index) => {
      if (!bubble) return
      const cycle = (time * 0.18 + index * 0.31) % 1
      bubble.position.y = 0.16 + cycle * 0.22
      bubble.material.opacity = cycle < 0.85 ? (1 - cycle / 0.85) * 0.5 : 0
    })
    // 동적 조명 intensity damp 보간
    if (lightRef.current) {
      const target = dynamicLightActive ? 0.22 : 0
      lightRef.current.intensity = THREE.MathUtils.damp(lightRef.current.intensity, target, 5, delta)
    }
  })

  return (
    <group scale={scale}>
      {/* === 5.1 불규칙 지면 기초 (타원형 + 외곽 바위) === */}
      {/* 중앙 타원 기반 (scale 비대칭으로 자연형) */}
      <mesh position={[0, .04, 0]} scale={[1.25, 1, 1.1]} receiveShadow><cylinderGeometry args={[1.55, 1.72, .16, 16]} /><ModelMaterial color="#314B56" roughness={.82} ghost={ghost} /></mesh>
      {/* 외곽 바위 조각 (dodecahedron/cylinder 혼합, 불규칙 배치) */}
      {[
        [-1.5, .12, -.3, .35, .4], [1.55, .1, -.2, .3, .2], [-1.2, .08, .9, .28, .8],
        [1.3, .12, .8, .32, 1.5], [-.6, .06, 1.3, .24, 2.2], [.7, .08, 1.35, .26, 3.0],
        [-1.7, .14, -.8, .3, .9], [1.65, .12, -.7, .28, 1.8],
      ].map(([x, y, z, s, rot], i) => (
        <mesh key={`rock_${i}`} position={[x, y, z]} rotation={[0, rot, 0]} castShadow={!ghost} receiveShadow>
          {i % 2 === 0 ? <dodecahedronGeometry args={[s, 0]} /> : <cylinderGeometry args={[s * .8, s, .16, 6]} />}
          <ModelMaterial color={i % 3 === 0 ? '#263E48' : '#314B56'} roughness={i % 2 ? .55 : .82} ghost={ghost} />
        </mesh>
      ))}

      {/* === 5.2 이중 수면 (깊은 수역 + 상부 수면) === */}
      {/* 깊은 수역 (짙은 청록, scale 비대칭) */}
      <mesh position={[0.05, .13, 0]} scale={[1.12, 1, .92]}>
        <cylinderGeometry args={[1.34, 1.42, .12, 20]} />
        <meshPhysicalMaterial color={ghost ? '#71f3bf' : '#176478'} transparent opacity={ghost ? .36 : .67} roughness={.2} metalness={0} depthWrite={!ghost} />
      </mesh>
      {/* 상부 수면 (밝은 청록, clearcoat) */}
      <mesh position={[0.02, .205, 0]} scale={[1.17, 1, .96]}>
        <cylinderGeometry args={[1.31, 1.36, .035, 24]} />
        <meshPhysicalMaterial color={ghost ? '#71f3bf' : '#4ED1DC'} transparent opacity={ghost ? .42 : .56} roughness={.08} metalness={0} clearcoat={.8} clearcoatRoughness={.18} depthWrite={false} />
      </mesh>

      {/* === 5.3 광물 샘 유입부 (후면 암반 + 균열 + 수정광 + 계류) === */}
      {/* 후면 저폴리 암반 */}
      <mesh position={[-.2, .4, -1.1]} castShadow={!ghost}><dodecahedronGeometry args={[.55, 0]} /><ModelMaterial color="#263E48" roughness={.55} ghost={ghost} /></mesh>
      <mesh position={[.25, .28, -1.15]} castShadow={!ghost}><dodecahedronGeometry args={[.42, 0]} /><ModelMaterial color="#314B56" roughness={.82} ghost={ghost} /></mesh>
      {/* 암반 균열 내 수정광 (emissive) */}
      <mesh position={[0, .45, -1.0]} rotation={[.3, 0, .2]}><octahedronGeometry args={[.16, 0]} /><ModelMaterial color="#A9F0F1" emissive="#5EE3D4" emissiveIntensity={.7} metalness={.1} roughness={.22} ghost={ghost} /></mesh>
      {/* 샘에서 연못으로 이어지는 얕은 계류 (반투명 박스, springMatRef) */}
      <mesh position={[0, .18, -.65]} rotation={[-.35, 0, 0]}>
        <boxGeometry args={[.28, .02, .8]} />
        <meshPhysicalMaterial ref={springMatRef} color={ghost ? '#71f3bf' : '#4ED1DC'} transparent opacity={.48} roughness={.06} metalness={0} depthWrite={false} />
      </mesh>

      {/* === 5.4 자연형 수정 군락 (암반 틈, 크기/기울기/색상 다양화) === */}
      {/* 후면 큰 수정 군락 */}
      <group position={[-.15, .25, -.85]}>
        <mesh position={[-.18, .35, .02]} rotation={[-.16 * .4, 0, -.16]} castShadow={!ghost}><coneGeometry args={[.18, .72, 6]} /><ModelMaterial color="#A9F0F1" emissive="#5EE3D4" emissiveIntensity={.75} metalness={.1} roughness={.22} ghost={ghost} /></mesh>
        <mesh position={[-.04, .48, -.02]} rotation={[.05 * .4, 0, .05]} castShadow={!ghost}><coneGeometry args={[.22, .94, 5]} /><ModelMaterial color="#A9A3E8" emissive="#5EE3D4" emissiveIntensity={.55} metalness={.1} roughness={.22} ghost={ghost} /></mesh>
        <mesh position={[.22, .31, .03]} rotation={[.19 * .4, 0, .19]} castShadow={!ghost}><coneGeometry args={[.16, .62, 6]} /><ModelMaterial color="#7FD7D3" emissive="#5EE3D4" emissiveIntensity={.4} metalness={.1} roughness={.22} ghost={ghost} /></mesh>
      </group>
      {/* 수면 가장자리 중형 군락 */}
      <group position={[.9, .15, -.1]} rotation={[0, .8, 0]}>
        <mesh position={[0, .2, 0]} rotation={[.3, 0, .3]} castShadow={!ghost}><octahedronGeometry args={[.2, 0]} /><ModelMaterial color="#A9F0F1" emissive="#5EE3D4" emissiveIntensity={.6} metalness={.1} roughness={.22} ghost={ghost} /></mesh>
        <mesh position={[.15, .12, .1]} rotation={[-.2, 0, -.4]} castShadow={!ghost}><octahedronGeometry args={[.13, 0]} /><ModelMaterial color="#A9A3E8" emissive="#5EE3D4" emissiveIntensity={.4} metalness={.1} roughness={.22} ghost={ghost} /></mesh>
      </group>

      {/* === 5.5 수중 수정층 (바닥 작은 결정 + 발광 광맥, 낮은 emissive) === */}
      <mesh position={[-.4, .1, .2]} rotation={[0, .5, .2]}><octahedronGeometry args={[.1, 0]} /><ModelMaterial color="#7FD7D3" emissive="#5EE3D4" emissiveIntensity={.3} metalness={.1} roughness={.22} ghost={ghost} /></mesh>
      <mesh position={[.3, .09, .35]} rotation={[0, -.3, -.15]}><octahedronGeometry args={[.08, 0]} /><ModelMaterial color="#A9A3E8" emissive="#5EE3D4" emissiveIntensity={.25} metalness={.1} roughness={.22} ghost={ghost} /></mesh>
      {/* 수중 발광 광맥 (낮은 emissive cylinder) */}
      <mesh position={[-.2, .08, -.2]} rotation={[Math.PI / 2, 0, .3]}><cylinderGeometry args={[.03, .03, .6, 6]} /><ModelMaterial color="#5EE3D4" emissive="#5EE3D4" emissiveIntensity={.45} ghost={ghost} /></mesh>
      <mesh position={[.4, .08, 0]} rotation={[Math.PI / 2, 0, -.5]}><cylinderGeometry args={[.025, .025, .5, 6]} /><ModelMaterial color="#5EE3D4" emissive="#5EE3D4" emissiveIntensity={.4} ghost={ghost} /></mesh>

      {/* === 5.6 외행성 수생 식물 (floraRef로 미세 흔들림) === */}
      <group ref={floraRef}>
        {/* 루멘 리드 (가느다란 줄기 + 끝 발광 구) - 연못 가장자리 군집 */}
        {[
          [-1.1, .12, .3], [-.95, .1, .6], [1.0, .12, .4], [.85, .1, .7],
        ].map(([x, y, z], i) => (
          <group key={`reed_${i}`} position={[x, y, z]}>
            <mesh castShadow={!ghost}><cylinderGeometry args={[.012, .018, .42, 5]} /><ModelMaterial color="#3B886F" roughness={.7} ghost={ghost} /></mesh>
            <mesh position={[0, .24, 0]}><sphereGeometry args={[.035, 8, 6]} /><ModelMaterial color="#70BFA3" emissive="#3a8a72" emissiveIntensity={.8} ghost={ghost} /></mesh>
          </group>
        ))}
        {/* 프리즘 잎 (납작 수면잎, 잎맥 emissive) */}
        {[
          [-.5, .21, .5, .6], [.6, .21, .6, -.4], [-.2, .21, .8, .2],
        ].map(([x, y, z, rot], i) => (
          <mesh key={`leaf_${i}`} position={[x, y, z]} rotation={[-Math.PI / 2, 0, rot]}><circleGeometry args={[.16, 6]} /><ModelMaterial color="#3B886F" emissive="#2a5e4a" emissiveIntensity={.25} roughness={.7} ghost={ghost} /></mesh>
        ))}
        {/* 수정 이끼 (낮은 박스 덩어리, 바위 표면) */}
        {[
          [-1.4, .14, -.2], [1.45, .12, -.1], [-1.1, .1, .85],
        ].map(([x, y, z], i) => (
          <mesh key={`moss_${i}`} position={[x, y, z]}><boxGeometry args={[.16, .04, .16]} /><ModelMaterial color="#70BFA3" emissive="#3a8a72" emissiveIntensity={.3} roughness={.8} ghost={ghost} /></mesh>
        ))}
      </group>

      {/* === 5.7 디딤돌 3개 (전면→물가, 크기/방향 다양화) === */}
      {[
        [-.3, .1, .95, .22, .3], [.15, .09, 1.15, .18, -.2], [.5, .1, 1.3, .2, .4],
      ].map(([x, y, z, s, rot], i) => (
        <mesh key={`step_${i}`} position={[x, y, z]} rotation={[0, rot, 0]} castShadow={!ghost} receiveShadow><dodecahedronGeometry args={[s, 0]} /><ModelMaterial color={i === 1 ? '#263E48' : '#314B56'} roughness={i === 1 ? .55 : .82} ghost={ghost} /></mesh>
      ))}

      {/* === 5.8 유입부 물결 링 (얇은 torus, scale/opacity 애니메이션) === */}
      {!ghost && [0, 1, 2].map((i) => (
        <mesh
          key={`ripple_${i}`}
          ref={(el) => { rippleRefs.current[i] = el }}
          position={[0, .21, -.45]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[.18, .008, 6, 18]} />
          <meshBasicMaterial color="#A9F0F1" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}

      {/* === 5.10 간헐 기포 (작은 sphere, y 상승+opacity 0, Sparkles 대안) === */}
      {!ghost && [0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={`bubble_${i}`}
          ref={(el) => { bubbleRefs.current[i] = el }}
          position={[-.3 + i * .15, .16, .1 + (i % 2) * .2]}
        >
          <sphereGeometry args={[.022, 8, 6]} />
          <meshStandardMaterial color="#A9F0F1" transparent opacity={0} depthWrite={false} emissive="#5EE3D4" emissiveIntensity={.3} />
        </mesh>
      ))}

      {/* === 조명: spotLight (가장 가까운 1개만, castShadow=false) === */}
      {!ghost && (
        <>
          <spotLight
            ref={lightRef}
            position={[0.2, 1.0, -0.3]}
            color="#74E6EF"
            intensity={0}
            distance={3.6}
            angle={0.9}
            penumbra={0.95}
            decay={2}
            castShadow={false}
          />
          <primitive object={lightTarget} position={[0, 0.15, 0.2]} />
        </>
      )}
    </group>
  )
}

function GreenhouseGlassMaterial({ ghost = false, opacity = .2 }) {
  return (
    <meshPhysicalMaterial
      color={ghost ? '#71f3bf' : '#b9fff0'}
      emissive={ghost ? '#1f765a' : '#205f58'}
      emissiveIntensity={ghost ? .8 : .12}
      transparent
      opacity={ghost ? .34 : opacity}
      roughness={.08}
      metalness={.08}
      clearcoat={.72}
      clearcoatRoughness={.16}
      wireframe={ghost}
      depthWrite={false}
      side={THREE.DoubleSide}
    />
  )
}

// 별빛 공동 온실 Stage 2: 별빛 공생 생태관(Starlight Symbiosis Conservatory).
// 세 개의 공동 재배 베드, 자동 관수 저장조, 개폐형 환기창과 교류 신호등을 갖춘 성숙 시설.
// 파티클과 실제 광원은 플레이어에게 가장 가까운 Stage 2 발광 시설 하나에서만 활성화한다.
function MatureFriendGreenhouse({ scale = 1, ghost = false, dynamicLightActive = false, vitality = 60 }) {
  const leftVentRef = useRef()
  const rightVentRef = useRef()
  const floraRef = useRef()
  const waterRef = useRef()
  const signalRef = useRef()
  const lightRef = useRef()

  useFrame((state, delta) => {
    if (ghost) return
    const time = state.clock.elapsedTime
    const ventOpen = .12 + (Math.sin(time * .24) * .5 + .5) * .12
    if (leftVentRef.current) leftVentRef.current.rotation.z = -.39 - ventOpen
    if (rightVentRef.current) rightVentRef.current.rotation.z = .39 + ventOpen
    if (floraRef.current) floraRef.current.rotation.z = Math.sin(time * .58) * .012
    if (waterRef.current) waterRef.current.material.opacity = .48 + Math.sin(time * .85) * .045
    if (signalRef.current) {
      signalRef.current.rotation.y = time * .38
      const pulse = 1 + Math.sin(time * 1.7) * .06
      signalRef.current.scale.setScalar(pulse)
    }
    if (lightRef.current) {
      const target = dynamicLightActive ? .3 : 0
      lightRef.current.intensity = THREE.MathUtils.damp(lightRef.current.intensity, target, 5, delta)
    }
  })

  const frameColor = '#315b58'
  const frameLight = '#527f78'
  const safeVitality = Math.min(100, Math.max(0, Number(vitality || 0)))
  const growLight = safeVitality >= 80 ? '#9dffd1' : safeVitality >= 50 ? '#76f4c4' : '#ffd080'

  return (
    <group scale={scale}>
      {/* 강화 기초 데크와 전면 진입 램프 */}
      <mesh position={[0, .07, 0]} receiveShadow castShadow={!ghost}>
        <boxGeometry args={[3.55, .14, 2.85]} />
        <ModelMaterial color="#193b3b" metalness={.48} roughness={.5} ghost={ghost} />
      </mesh>
      <mesh position={[0, .16, 0]} receiveShadow>
        <boxGeometry args={[3.3, .06, 2.58]} />
        <ModelMaterial color="#2b5550" metalness={.4} roughness={.56} ghost={ghost} />
      </mesh>
      <mesh position={[0, .12, 1.62]} rotation={[-.1, 0, 0]}>
        <boxGeometry args={[1.05, .1, .7]} />
        <ModelMaterial color="#466d67" metalness={.36} roughness={.58} ghost={ghost} />
      </mesh>

      {/* 개별 투명 패널: 내부 식생 가독성을 위해 하나의 투명 박스 대신 면 단위로 구성 */}
      <mesh position={[0, 1.25, -1.25]}><boxGeometry args={[3.12, 2.04, .035]} /><GreenhouseGlassMaterial ghost={ghost} opacity={.18} /></mesh>
      <mesh position={[-1.56, 1.25, 0]}><boxGeometry args={[.035, 2.04, 2.46]} /><GreenhouseGlassMaterial ghost={ghost} opacity={.16} /></mesh>
      <mesh position={[1.56, 1.25, 0]}><boxGeometry args={[.035, 2.04, 2.46]} /><GreenhouseGlassMaterial ghost={ghost} opacity={.16} /></mesh>
      {[-1.08, 1.08].map((x) => (
        <mesh key={`front_glass_${x}`} position={[x, 1.25, 1.25]}>
          <boxGeometry args={[.95, 2.04, .035]} />
          <GreenhouseGlassMaterial ghost={ghost} opacity={.18} />
        </mesh>
      ))}

      {/* 구조 프레임과 2층 높이의 박공지붕 */}
      {[-1.56, 1.56].flatMap((x) => [-1.25, 1.25].map((z) => (
        <mesh key={`greenhouse_post_${x}_${z}`} position={[x, 1.28, z]} castShadow={!ghost}>
          <boxGeometry args={[.1, 2.3, .1]} />
          <ModelMaterial color={frameColor} metalness={.58} roughness={.38} ghost={ghost} />
        </mesh>
      )))}
      {[-.78, 0, .78].map((z) => (
        <group key={`roof_rib_${z}`} position={[0, 0, z]}>
          <mesh position={[-.78, 2.42, 0]} rotation={[0, 0, -.39]}><boxGeometry args={[1.78, .08, .09]} /><ModelMaterial color={frameLight} metalness={.64} roughness={.32} ghost={ghost} /></mesh>
          <mesh position={[.78, 2.42, 0]} rotation={[0, 0, .39]}><boxGeometry args={[1.78, .08, .09]} /><ModelMaterial color={frameLight} metalness={.64} roughness={.32} ghost={ghost} /></mesh>
        </group>
      ))}
      <mesh position={[0, 2.75, 0]}><boxGeometry args={[.1, .1, 2.62]} /><ModelMaterial color={frameColor} metalness={.62} roughness={.34} ghost={ghost} /></mesh>
      <mesh position={[-.78, 2.43, 0]} rotation={[0, 0, -.39]}><boxGeometry args={[1.72, .035, 2.46]} /><GreenhouseGlassMaterial ghost={ghost} opacity={.22} /></mesh>
      <mesh position={[.78, 2.43, 0]} rotation={[0, 0, .39]}><boxGeometry args={[1.72, .035, 2.46]} /><GreenhouseGlassMaterial ghost={ghost} opacity={.22} /></mesh>

      {/* 자동 개폐형 상부 환기창 */}
      <group ref={leftVentRef} position={[-.3, 2.72, -.25]} rotation={[0, 0, -.51]}>
        <mesh position={[-.34, 0, 0]}><boxGeometry args={[.72, .045, .82]} /><GreenhouseGlassMaterial ghost={ghost} opacity={.28} /></mesh>
        <mesh position={[-.34, 0, 0]}><boxGeometry args={[.78, .065, .055]} /><ModelMaterial color="#78a198" metalness={.64} roughness={.3} ghost={ghost} /></mesh>
      </group>
      <group ref={rightVentRef} position={[.3, 2.72, .35]} rotation={[0, 0, .51]}>
        <mesh position={[.34, 0, 0]}><boxGeometry args={[.72, .045, .82]} /><GreenhouseGlassMaterial ghost={ghost} opacity={.28} /></mesh>
        <mesh position={[.34, 0, 0]}><boxGeometry args={[.78, .065, .055]} /><ModelMaterial color="#78a198" metalness={.64} roughness={.3} ghost={ghost} /></mesh>
      </group>

      {/* 세 개의 공동 재배 베드와 서로 다른 생장 단계의 식생 */}
      <group ref={floraRef}>
        {[
          { x: -.92, z: -.35, color: '#73d995', bloom: '#b8ffd0' },
          { x: .92, z: -.35, color: '#65cbb0', bloom: '#a5f5de' },
          { x: 0, z: .65, color: '#8ed37b', bloom: '#d4ffad' },
        ].map((bed, bedIndex) => (
          <group key={`community_bed_${bedIndex}`} position={[bed.x, .25, bed.z]}>
            <mesh position={[0, .16, 0]} castShadow={!ghost}><boxGeometry args={[1.05, .32, .72]} /><ModelMaterial color="#84644a" roughness={.88} ghost={ghost} /></mesh>
            <mesh position={[0, .34, 0]}><boxGeometry args={[.92, .08, .6]} /><ModelMaterial color="#594638" roughness={.96} ghost={ghost} /></mesh>
            {[-.3, 0, .3].map((x, plantIndex) => {
              const height = .34 + ((bedIndex + plantIndex) % 3) * .12
              return (
                <group key={`plant_${x}`} position={[x, .4, plantIndex % 2 ? .12 : -.1]}>
                  <mesh position={[0, height * .5, 0]}><cylinderGeometry args={[.025, .035, height, 6]} /><ModelMaterial color="#3f9e6b" roughness={.78} ghost={ghost} /></mesh>
                  <mesh position={[-.08, height * .55, 0]} rotation={[0, 0, -.55]} scale={[1.4, .55, .8]}><sphereGeometry args={[.09, 8, 6]} /><ModelMaterial color={bed.color} emissive="#245c3d" emissiveIntensity={.24} ghost={ghost} /></mesh>
                  <mesh position={[.08, height * .72, 0]} rotation={[0, 0, .55]} scale={[1.4, .55, .8]}><sphereGeometry args={[.09, 8, 6]} /><ModelMaterial color={bed.color} emissive="#245c3d" emissiveIntensity={.24} ghost={ghost} /></mesh>
                  <mesh position={[0, height + .04, 0]}><octahedronGeometry args={[.1 + plantIndex * .012, 0]} /><ModelMaterial color={bed.bloom} emissive={bed.color} emissiveIntensity={.75} ghost={ghost} /></mesh>
                </group>
              )
            })}
          </group>
        ))}
      </group>

      {/* 측면 자동 관수 저장조와 내부 분배 파이프 */}
      <group position={[1.78, .55, -.55]}>
        <mesh castShadow={!ghost}><cylinderGeometry args={[.38, .46, .86, 12]} /><ModelMaterial color="#3d6767" metalness={.5} roughness={.38} ghost={ghost} /></mesh>
        <mesh ref={waterRef} position={[0, .08, 0]}><cylinderGeometry args={[.31, .31, .54, 12]} /><meshPhysicalMaterial color={ghost ? '#71f3bf' : '#58d9e5'} transparent opacity={ghost ? .34 : .48} roughness={.08} depthWrite={false} /></mesh>
        <mesh position={[0, .48, 0]}><torusGeometry args={[.34, .035, 7, 16]} /><ModelMaterial color="#8aaca7" metalness={.7} roughness={.28} ghost={ghost} /></mesh>
      </group>
      <mesh position={[.9, 1.5, -.92]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.035, .035, 1.75, 7]} /><ModelMaterial color="#6fbeb3" emissive="#246f65" emissiveIntensity={.45} ghost={ghost} /></mesh>
      {[-.92, 0, .92].map((x) => (
        <mesh key={`mist_nozzle_${x}`} position={[x, 1.42, -.92]}><sphereGeometry args={[.065, 8, 6]} /><ModelMaterial color="#a8fff0" emissive="#48caa9" emissiveIntensity={1.15} ghost={ghost} /></mesh>
      ))}

      {/* 친구 두 명의 기여를 상징하는 연결 신호 */}
      <group ref={signalRef} position={[0, 1.62, 1.35]}>
        {[-.24, .24].map((x) => <mesh key={`friend_signal_${x}`} position={[x, 0, 0]}><sphereGeometry args={[.09, 10, 8]} /><ModelMaterial color={x < 0 ? '#7ce8ff' : '#8effc7'} emissive={x < 0 ? '#2688a1' : '#2c9b6c'} emissiveIntensity={1.5} ghost={ghost} /></mesh>)}
        <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.018, .018, .4, 6]} /><ModelMaterial color="#d6fff3" emissive="#53d8bb" emissiveIntensity={1.2} ghost={ghost} /></mesh>
      </group>
      <mesh position={[0, 1.05, 1.29]}><boxGeometry args={[.8, 1.65, .08]} /><ModelMaterial color="#6ee8cb" emissive="#238a73" emissiveIntensity={.8} ghost={ghost} /></mesh>

      {!ghost && (
        <>
          {dynamicLightActive && <Sparkles count={safeVitality >= 80 ? 14 : 9} scale={[3, 2.2, 2.4]} position={[0, 1.55, 0]} color={growLight} size={1.25} speed={.22} />}
          <pointLight ref={lightRef} position={[0, 1.75, .2]} color={growLight} intensity={0} distance={4.4} decay={2} castShadow={false} />
        </>
      )}
    </group>
  )
}

const MATURE_STARFLOWERS = [
  { position: [-1.15, .24, -.48], scale: .82, color: '#ff9ecf', emissive: '#a83c72', phase: .1 },
  { position: [-.62, .24, -.92], scale: .68, color: '#ffd4a8', emissive: '#a86535', phase: .8 },
  { position: [.08, .24, -1.02], scale: .76, color: '#c7adff', emissive: '#6744aa', phase: 1.5 },
  { position: [.86, .24, -.78], scale: .88, color: '#92eaff', emissive: '#258ca8', phase: 2.2 },
  { position: [1.24, .24, -.2], scale: .7, color: '#ffc0dd', emissive: '#a44473', phase: 2.9 },
  { position: [1.06, .24, .55], scale: .8, color: '#d5b8ff', emissive: '#7652b2', phase: 3.6 },
  { position: [.47, .24, .98], scale: .66, color: '#ffe2a8', emissive: '#ac7437', phase: 4.3 },
  { position: [-.28, .24, 1.08], scale: .83, color: '#ff9fcf', emissive: '#a83c72', phase: 5 },
  { position: [-1.02, .24, .76], scale: .72, color: '#9eead8', emissive: '#267e70', phase: 5.7 },
  { position: [-.62, .24, .18], scale: .62, color: '#c4a0ff', emissive: '#6740a0', phase: 6.4 },
  { position: [.63, .24, .18], scale: .7, color: '#ffaecb', emissive: '#a44769', phase: 7.1 },
]

function StarflowerBloom({
  position,
  scale = 1,
  color,
  emissive,
  phase = 0,
  ghost = false,
  bloomRef,
  centerpiece = false,
}) {
  const stemHeight = centerpiece ? .92 : .54 + (phase % 1) * .18
  const headY = stemHeight
  const petalCount = centerpiece ? 7 : 5

  return (
    <group ref={bloomRef} position={position} scale={scale}>
      <mesh position={[0, stemHeight * .5, 0]} castShadow={!ghost}>
        <cylinderGeometry args={[centerpiece ? .045 : .027, centerpiece ? .065 : .04, stemHeight, 7]} />
        <ModelMaterial color={centerpiece ? '#70d49a' : '#62bb82'} roughness={.82} ghost={ghost} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={`leaf_${side}`}
          position={[side * .12, stemHeight * .48, .015]}
          rotation={[0, side * .32, side * -.72]}
          scale={[.18, .055, .1]}
        >
          <sphereGeometry args={[1, 8, 6]} />
          <ModelMaterial color="#5bc68c" emissive="#174d34" emissiveIntensity={.18} roughness={.85} ghost={ghost} />
        </mesh>
      ))}
      <group position={[0, headY, 0]}>
        {Array.from({ length: petalCount }, (_, index) => {
          const angle = (index / petalCount) * Math.PI * 2
          const radius = centerpiece ? .28 : .185
          return (
            <mesh
              key={`petal_${index}`}
              position={[Math.sin(angle) * radius, 0, Math.cos(angle) * radius]}
              rotation={[0, angle, 0]}
              scale={centerpiece ? [.16, .07, .32] : [.11, .05, .22]}
              castShadow={!ghost}
            >
              <sphereGeometry args={[1, 10, 7]} />
              <ModelMaterial
                color={color}
                emissive={emissive}
                emissiveIntensity={centerpiece ? 1.18 : .72}
                roughness={.42}
                ghost={ghost}
              />
            </mesh>
          )
        })}
        <mesh position={[0, .035, 0]}>
          <sphereGeometry args={[centerpiece ? .14 : .095, 12, 8]} />
          <ModelMaterial
            color={centerpiece ? '#fff3b5' : '#ffe5a2'}
            emissive={centerpiece ? '#ffc85c' : '#a96f31'}
            emissiveIntensity={centerpiece ? 1.9 : .8}
            roughness={.3}
            ghost={ghost}
          />
        </mesh>
      </group>
    </group>
  )
}

// 별꽃 정원 Stage 2: 별무리 치유정원(Starlit Sanctuary Garden).
// 평면 화단을 다층 산책 정원으로 확장하고, 중심 별꽃과 서로 다른 꽃 군락이 느린 바람에 호흡하듯 흔들린다.
function MatureStarflowerGarden({ scale = 1, ghost = false, dynamicLightActive = false, vitality = 60, recentWaterCount = 0 }) {
  const bloomRefs = useRef([])
  const centerpieceRef = useRef()
  const centerpieceMatRef = useRef()
  const haloRef = useRef()
  const waterSignalRef = useRef()
  const lightRef = useRef()
  const safeVitality = Math.min(100, Math.max(0, Number(vitality || 0)))
  const bloomScale = .86 + safeVitality * .002
  const visibleWaterSignals = Math.min(3, Math.max(0, Number(recentWaterCount || 0)))

  useFrame((state, delta) => {
    if (ghost) return
    const time = state.clock.elapsedTime
    bloomRefs.current.forEach((bloom, index) => {
      if (!bloom) return
      const phase = MATURE_STARFLOWERS[index]?.phase || 0
      bloom.rotation.z = Math.sin(time * .72 + phase) * .045
      bloom.rotation.x = Math.cos(time * .56 + phase) * .026
    })
    if (centerpieceRef.current) {
      centerpieceRef.current.rotation.z = Math.sin(time * .48) * .035
      centerpieceRef.current.rotation.x = Math.cos(time * .42) * .02
    }
    if (centerpieceMatRef.current) {
      centerpieceMatRef.current.opacity = .7 + Math.sin(time * .9) * .1
    }
    if (haloRef.current) {
      haloRef.current.rotation.z = time * .08
      haloRef.current.material.opacity = .12 + Math.sin(time * .7) * .025
    }
    if (waterSignalRef.current) {
      waterSignalRef.current.rotation.y = time * .32
      waterSignalRef.current.position.y = .42 + Math.sin(time * .9) * .035
    }
    if (lightRef.current) {
      lightRef.current.intensity = THREE.MathUtils.damp(lightRef.current.intensity, .2 + safeVitality * .0012, 5, delta)
    }
  })

  return (
    <group scale={scale}>
      {/* 별빛 석재 테두리와 두 겹으로 올라온 부드러운 화단 */}
      <mesh position={[0, .08, 0]} receiveShadow castShadow={!ghost}>
        <cylinderGeometry args={[1.82, 1.96, .16, 32]} />
        <ModelMaterial color="#776b88" metalness={.18} roughness={.72} ghost={ghost} />
      </mesh>
      <mesh position={[0, .17, 0]} receiveShadow>
        <cylinderGeometry args={[1.67, 1.75, .12, 32]} />
        <ModelMaterial color="#294f43" roughness={.96} ghost={ghost} />
      </mesh>
      <mesh position={[0, .24, 0]} receiveShadow>
        <cylinderGeometry args={[1.24, 1.38, .13, 28]} />
        <ModelMaterial color="#386b52" emissive="#13372a" emissiveIntensity={.2} roughness={.94} ghost={ghost} />
      </mesh>

      {/* 정원 앞으로 이어지는 달빛 디딤돌 */}
      {[1.72, 1.42, 1.12, .84].map((z, index) => (
        <mesh
          key={`garden_step_${z}`}
          position={[Math.sin(index * .9) * .16, .22, z]}
          rotation={[0, index % 2 ? .18 : -.12, 0]}
          receiveShadow
        >
          <cylinderGeometry args={[.22 - index * .012, .24, .055, 7]} />
          <ModelMaterial color="#b7a9c8" emissive="#57466e" emissiveIntensity={.22} roughness={.7} ghost={ghost} />
        </mesh>
      ))}

      {/* 주변 꽃 군락 */}
      {MATURE_STARFLOWERS.map((flower, index) => (
        <StarflowerBloom
          key={`mature_starflower_${index}`}
          {...flower}
          scale={flower.scale * bloomScale}
          ghost={ghost}
          bloomRef={(element) => { bloomRefs.current[index] = element }}
        />
      ))}

      {/* 정원의 시선을 모으는 대형 칠엽 별꽃 */}
      <StarflowerBloom
        position={[0, .24, -.04]}
        scale={1.18 * bloomScale}
        color="#f6c2ff"
        emissive="#9256b2"
        phase={0}
        ghost={ghost}
        centerpiece
        bloomRef={centerpieceRef}
      />
      <mesh position={[0, 1.34, -.04]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[.38, .44, 7]} />
        <meshBasicMaterial
          ref={centerpieceMatRef}
          color={ghost ? '#71f3bf' : '#ffd6ff'}
          transparent
          opacity={ghost ? .3 : .76}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* 화단 전체를 감싸는 느린 별자리 후광 */}
      {!ghost && (
        <mesh ref={haloRef} position={[0, .29, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.38, 1.44, 12]} />
          <meshBasicMaterial color="#efb7ff" transparent opacity={.12} depthWrite={false} toneMapped={false} />
        </mesh>
      )}

      {/* 최근 친구 물주기 기록을 나타내는 푸른 물방울 신호. 최대 3개만 표시해 과밀을 막는다. */}
      {!ghost && visibleWaterSignals > 0 && (
        <group ref={waterSignalRef}>
          {Array.from({ length: visibleWaterSignals }, (_, index) => {
            const angle = index / visibleWaterSignals * Math.PI * 2
            return (
              <group key={`garden_water_signal_${index}`} position={[Math.sin(angle) * 1.58, .42, Math.cos(angle) * 1.58]}>
                <mesh scale={[.08, .13, .08]} rotation={[0, 0, Math.PI / 4]}>
                  <octahedronGeometry args={[1, 0]} />
                  <meshBasicMaterial color="#8deeff" transparent opacity={.9} toneMapped={false} />
                </mesh>
                <mesh position={[0, -.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[.08, .12, 12]} />
                  <meshBasicMaterial color="#8deeff" transparent opacity={.32} depthWrite={false} toneMapped={false} />
                </mesh>
              </group>
            )
          })}
        </group>
      )}

      {!ghost && dynamicLightActive && (
        <>
          <pointLight ref={lightRef} position={[0, 1.2, 0]} color="#ffc6e8" intensity={0} distance={3.6} decay={2} castShadow={false} />
          <Sparkles count={safeVitality >= 80 ? 16 : 11} scale={[2.9, 1.35, 2.9]} position={[0, .88, 0]} size={1.3} color={safeVitality < 45 ? '#ffd59e' : '#ffd4ed'} speed={.18} opacity={.58} />
        </>
      )}
    </group>
  )
}

const LUMI_SANCTUARY_CREATURES = [
  {
    position: [-.52, .28, .14],
    scale: 1,
    rotationY: 1.05,
    color: '#baf2cc',
    emissive: '#397b5c',
    accent: '#8ee7ff',
    phase: 0,
  },
  {
    position: [.36, .27, .48],
    scale: .7,
    rotationY: -1.95,
    color: '#d9c9ff',
    emissive: '#68529a',
    accent: '#ffd0e7',
    phase: 2.1,
  },
]

function LumiSanctuaryCreature({
  position,
  scale = 1,
  rotationY = 0,
  color,
  emissive,
  accent,
  ghost = false,
  creatureRef,
}) {
  return (
    <group ref={creatureRef} position={position} rotation={[0, rotationY, 0]} scale={scale}>
      {/* 포근한 물방울형 몸통 */}
      <mesh position={[0, .3, 0]} scale={[.38, .31, .42]} castShadow={!ghost}>
        <sphereGeometry args={[1, 16, 12]} />
        <ModelMaterial color={color} emissive={emissive} emissiveIntensity={.28} roughness={.66} ghost={ghost} />
      </mesh>
      <mesh position={[0, .62, .09]} castShadow={!ghost}>
        <sphereGeometry args={[.3, 16, 12]} />
        <ModelMaterial color={color} emissive={emissive} emissiveIntensity={.34} roughness={.62} ghost={ghost} />
      </mesh>

      {/* 부드러운 귀와 별빛 촉수 */}
      {[-1, 1].map((side) => (
        <group key={`lumi_ear_${side}`}>
          <mesh position={[side * .2, .86, .04]} rotation={[0, 0, side * -.24]} scale={[.12, .24, .1]}>
            <sphereGeometry args={[1, 10, 7]} />
            <ModelMaterial color={accent} emissive={emissive} emissiveIntensity={.42} roughness={.52} ghost={ghost} />
          </mesh>
          <mesh position={[side * .11, .91, .08]} rotation={[0, 0, side * -.18]}>
            <cylinderGeometry args={[.015, .022, .25, 6]} />
            <ModelMaterial color="#78cfa7" roughness={.72} ghost={ghost} />
          </mesh>
          <mesh position={[side * .135, 1.045, .08]}>
            <sphereGeometry args={[.045, 9, 7]} />
            <ModelMaterial color="#fff1a8" emissive="#d79c3f" emissiveIntensity={1.45} roughness={.3} ghost={ghost} />
          </mesh>
        </group>
      ))}

      {/* 표정: 큰 눈, 작은 코, 볼빛 */}
      {[-1, 1].map((side) => (
        <group key={`lumi_face_${side}`}>
          <mesh position={[side * .1, .67, .35]} scale={[.06, .075, .035]}>
            <sphereGeometry args={[1, 10, 7]} />
            <ModelMaterial color="#173444" emissive="#071620" emissiveIntensity={.1} roughness={.28} ghost={ghost} />
          </mesh>
          <mesh position={[side * .17, .59, .34]} scale={[.045, .025, .02]}>
            <sphereGeometry args={[1, 8, 6]} />
            <ModelMaterial color="#ffb8ce" emissive="#8e3d5c" emissiveIntensity={.26} roughness={.5} ghost={ghost} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, .59, .385]} scale={[.035, .025, .02]}>
        <sphereGeometry args={[1, 8, 6]} />
        <ModelMaterial color="#6d506c" roughness={.38} ghost={ghost} />
      </mesh>

      {/* 동글동글한 발과 꼬리 */}
      {[-1, 1].map((side) => (
        <mesh key={`lumi_foot_${side}`} position={[side * .19, .08, .15]} scale={[.15, .08, .2]}>
          <sphereGeometry args={[1, 10, 7]} />
          <ModelMaterial color={accent} emissive={emissive} emissiveIntensity={.18} roughness={.7} ghost={ghost} />
        </mesh>
      ))}
      <mesh position={[-.34, .34, -.19]}>
        <sphereGeometry args={[.13, 10, 8]} />
        <ModelMaterial color={accent} emissive={emissive} emissiveIntensity={.52} roughness={.52} ghost={ghost} />
      </mesh>
    </group>
  )
}

// 루미 생명체 쉼터 Stage 2: 루미 교감 생태원(Lumi Bonding Sanctuary).
// 닫힌 반구 대신 생명체·둥지·먹이·물가가 모두 보이는 열린 돌봄 공간으로 확장한다.
function MatureCreatureHabitat({ scale = 1, ghost = false, dynamicLightActive = false }) {
  const creatureRefs = useRef([])
  const waterGlowRef = useRef()
  const mobileRef = useRef()
  const lightRef = useRef()

  useFrame((state, delta) => {
    if (ghost) return
    const time = state.clock.elapsedTime
    creatureRefs.current.forEach((creature, index) => {
      if (!creature) return
      const config = LUMI_SANCTUARY_CREATURES[index]
      const hopWave = Math.max(0, Math.sin(time * .86 + config.phase) - .84) * (index ? .32 : .14)
      creature.position.y = config.position[1] + Math.sin(time * 1.18 + config.phase) * .014 + hopWave
      creature.rotation.z = Math.sin(time * .72 + config.phase) * .025
      creature.rotation.y = config.rotationY + Math.sin(time * .34 + config.phase) * .09
    })
    if (waterGlowRef.current) {
      waterGlowRef.current.rotation.z = time * .12
      waterGlowRef.current.material.opacity = .23 + Math.sin(time * .72) * .045
    }
    if (mobileRef.current) {
      mobileRef.current.rotation.y = time * .26
      mobileRef.current.position.y = 1.48 + Math.sin(time * .85) * .035
    }
    if (lightRef.current) {
      lightRef.current.intensity = THREE.MathUtils.damp(lightRef.current.intensity, .26, 5, delta)
    }
  })

  return (
    <group scale={scale}>
      {/* 포근한 초지와 열린 돌봄 마당 */}
      <mesh position={[0, .08, 0]} receiveShadow castShadow={!ghost}>
        <cylinderGeometry args={[1.86, 2, .16, 32]} />
        <ModelMaterial color="#536b5e" roughness={.94} ghost={ghost} />
      </mesh>
      <mesh position={[0, .18, 0]} receiveShadow>
        <cylinderGeometry args={[1.7, 1.82, .13, 30]} />
        <ModelMaterial color="#3e7258" emissive="#163929" emissiveIntensity={.16} roughness={.96} ghost={ghost} />
      </mesh>

      {/* 뒤쪽의 열린 나뭇가지 캐노피 */}
      <mesh position={[0, .34, -.72]} castShadow={!ghost}>
        <torusGeometry args={[1.25, .13, 9, 34, Math.PI]} />
        <ModelMaterial color="#987654" roughness={.88} ghost={ghost} />
      </mesh>
      {[[-1.02, .95], [-.56, 1.42], [0, 1.62], [.58, 1.42], [1.04, .95]].map(([x, y], index) => (
        <mesh
          key={`sanctuary_leaf_${index}`}
          position={[x, y, -.7]}
          scale={[.42 - Math.abs(x) * .08, .24, .3]}
          rotation={[0, index * .55, index % 2 ? .18 : -.16]}
          castShadow={!ghost}
        >
          <sphereGeometry args={[1, 11, 8]} />
          <ModelMaterial
            color={index % 2 ? '#7fbe75' : '#6ba96d'}
            emissive={index === 2 ? '#2f6842' : '#214d35'}
            emissiveIntensity={index === 2 ? .38 : .2}
            roughness={.86}
            ghost={ghost}
          />
        </mesh>
      ))}

      {/* 푹신한 둥지 */}
      <group position={[-.58, .28, -.02]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[.55, .15, 10, 28]} />
          <ModelMaterial color="#b89568" roughness={.96} ghost={ghost} />
        </mesh>
        <mesh position={[0, -.035, 0]}>
          <cylinderGeometry args={[.46, .5, .1, 20]} />
          <ModelMaterial color="#d8bb87" emissive="#654c2d" emissiveIntensity={.12} roughness={.95} ghost={ghost} />
        </mesh>
      </group>

      {/* 얕은 물가와 잔잔한 별빛 물결 */}
      <group position={[1.03, .25, .65]}>
        <mesh>
          <cylinderGeometry args={[.48, .54, .1, 20]} />
          <ModelMaterial color="#627e7a" roughness={.74} ghost={ghost} />
        </mesh>
        <mesh ref={waterGlowRef} position={[0, .06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[.17, .4, 20]} />
          <meshBasicMaterial color={ghost ? '#71f3bf' : '#8deeff'} transparent opacity={ghost ? .25 : .23} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>

      {/* 먹이 그릇과 빛나는 열매 */}
      <group position={[.92, .3, -.38]}>
        <mesh>
          <cylinderGeometry args={[.34, .42, .18, 16]} />
          <ModelMaterial color="#8193a0" metalness={.18} roughness={.62} ghost={ghost} />
        </mesh>
        {[[-.12, .13], [.08, .08], [.16, -.09], [-.08, -.12]].map(([x, z], index) => (
          <mesh key={`lumi_food_${index}`} position={[x, .16, z]}>
            <sphereGeometry args={[.075, 9, 7]} />
            <ModelMaterial
              color={index % 2 ? '#ffd096' : '#a8f1c6'}
              emissive={index % 2 ? '#a6602c' : '#37815a'}
              emissiveIntensity={.72}
              roughness={.46}
              ghost={ghost}
            />
          </mesh>
        ))}
      </group>

      {/* 생명체에게 이어지는 발자국 돌 */}
      {[1.68, 1.38, 1.1].map((z, index) => (
        <group key={`lumi_step_${z}`} position={[index % 2 ? .16 : -.1, .24, z]}>
          <mesh scale={[.17, .045, .21]}>
            <sphereGeometry args={[1, 10, 7]} />
            <ModelMaterial color="#aeb8a2" emissive="#495746" emissiveIntensity={.12} roughness={.82} ghost={ghost} />
          </mesh>
          {[-1, 0, 1].map((toe) => (
            <mesh key={`toe_${toe}`} position={[toe * .09, .035, -.18]} scale={[.055, .028, .07]}>
              <sphereGeometry args={[1, 8, 6]} />
              <ModelMaterial color="#aeb8a2" roughness={.82} ghost={ghost} />
            </mesh>
          ))}
        </group>
      ))}

      {/* 실제로 보이고 반응하는 루미 가족 */}
      {LUMI_SANCTUARY_CREATURES.map((creature, index) => (
        <LumiSanctuaryCreature
          key={`sanctuary_lumi_${index}`}
          {...creature}
          ghost={ghost}
          creatureRef={(element) => { creatureRefs.current[index] = element }}
        />
      ))}

      {/* 캐노피 아래 천천히 도는 교감 모빌 */}
      <group ref={mobileRef} position={[0, 1.48, -.7]}>
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <octahedronGeometry args={[.11, 0]} />
          <ModelMaterial color="#fff0a8" emissive="#c88735" emissiveIntensity={1.45} roughness={.28} ghost={ghost} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[.18, .21, 12]} />
          <ModelMaterial color="#b7f1dd" emissive="#3c8b6d" emissiveIntensity={.58} ghost={ghost} />
        </mesh>
      </group>

      {!ghost && dynamicLightActive && (
        <>
          <pointLight ref={lightRef} position={[0, 1.25, .15]} color="#bdf4d3" intensity={0} distance={3.8} decay={2} castShadow={false} />
          <Sparkles count={10} scale={[3, 1.45, 2.8]} position={[0, .9, 0]} size={1.15} color="#d8ffd9" speed={.16} opacity={.5} />
        </>
      )}
    </group>
  )
}

const SIGNAL_PLAZA_COLORS = {
  water: { color: '#88f2cf', emissive: '#23886a' },
  repair: { color: '#ffbd87', emissive: '#a95227' },
  feed: { color: '#c7f39d', emissive: '#588f35' },
  admire: { color: '#d9b7ff', emissive: '#7851b4' },
}

function getSignalPlazaNodes(signalSummary) {
  if (Array.isArray(signalSummary?.recentSignals) && signalSummary.recentSignals.length) {
    return signalSummary.recentSignals.slice(0, 6)
  }
  const count = signalSummary
    ? Math.min(6, Math.max(0, Number(signalSummary.recentCount || 0)))
    : 5
  return Array.from({ length: count }, (_, index) => ({
    id: `preview_signal_${index}`,
    actionId: ['admire', 'water', 'repair', 'feed'][index % 4],
    seen: index > 1,
  }))
}

// 귀환 신호 광장 Stage 2: 항로 기억 신호원(Route Memory Signal Court).
// 방문 기록을 여섯 개 기억 캡슐과 중앙 비콘의 빛으로 직접 보여주는 데이터 반응형 소셜 광장이다.
function MatureSignalPlaza({ scale = 1, ghost = false, dynamicLightActive = false, signalSummary }) {
  const beaconRef = useRef()
  const orbitRef = useRef()
  const beamRef = useRef()
  const rippleRefs = useRef([])
  const lightRef = useRef()
  const signalNodes = getSignalPlazaNodes(signalSummary)
  const unreadCount = Math.max(0, Number(signalSummary?.unreadCount || 0))

  useFrame((state, delta) => {
    if (ghost) return
    const time = state.clock.elapsedTime
    if (beaconRef.current) {
      beaconRef.current.rotation.y = time * (unreadCount > 0 ? .42 : .24)
      beaconRef.current.position.y = 2.15 + Math.sin(time * .85) * .045
    }
    if (orbitRef.current) orbitRef.current.rotation.y = time * .1
    if (beamRef.current) {
      const activeOpacity = dynamicLightActive ? .16 : .06
      beamRef.current.material.opacity = activeOpacity + Math.sin(time * 1.1) * .018
    }
    rippleRefs.current.forEach((ripple, index) => {
      if (!ripple) return
      const cycle = (time * .26 + index / 3) % 1
      const rippleScale = .72 + cycle * .76
      ripple.scale.set(rippleScale, rippleScale, 1)
      ripple.material.opacity = (1 - cycle) * (dynamicLightActive ? .16 : .07)
    })
    if (lightRef.current) {
      lightRef.current.intensity = THREE.MathUtils.damp(lightRef.current.intensity, unreadCount > 0 ? .42 : .28, 5, delta)
    }
  })

  return (
    <group scale={scale}>
      {/* 여러 방향에서 진입 가능한 넓은 중심 광장 */}
      <mesh position={[0, .08, 0]} receiveShadow castShadow={!ghost}>
        <cylinderGeometry args={[2.18, 2.32, .16, 36]} />
        <ModelMaterial color="#31475d" metalness={.5} roughness={.48} ghost={ghost} />
      </mesh>
      <mesh position={[0, .2, 0]} receiveShadow>
        <cylinderGeometry args={[1.87, 2.04, .15, 36]} />
        <ModelMaterial color="#566c84" metalness={.54} roughness={.38} ghost={ghost} />
      </mesh>
      <mesh position={[0, .285, 0]} receiveShadow>
        <cylinderGeometry args={[1.18, 1.34, .12, 30]} />
        <ModelMaterial color="#31445d" metalness={.62} roughness={.3} ghost={ghost} />
      </mesh>

      {/* 전면 귀환 동선과 광장 진입 표식 */}
      {[1.98, 1.67, 1.36].map((z, index) => (
        <mesh key={`signal_entry_${z}`} position={[0, .25 + index * .018, z]} receiveShadow>
          <boxGeometry args={[.86 + index * .13, .07, .27]} />
          <ModelMaterial color="#8398ad" emissive="#354d69" emissiveIntensity={.22} metalness={.5} roughness={.42} ghost={ghost} />
        </mesh>
      ))}
      {[-.32, .32].map((x) => (
        <mesh key={`signal_entry_line_${x}`} position={[x, .31, 1.43]}>
          <boxGeometry args={[.035, .018, 1.08]} />
          <ModelMaterial color="#bfa5ff" emissive="#7052bd" emissiveIntensity={1.15} ghost={ghost} />
        </mesh>
      ))}

      {/* 방문 기록을 담는 여섯 개 기억 캡슐 */}
      <group ref={orbitRef}>
        {Array.from({ length: 6 }, (_, index) => {
          const angle = (index / 6) * Math.PI * 2
          const signal = signalNodes[index]
          const palette = SIGNAL_PLAZA_COLORS[signal?.actionId] || SIGNAL_PLAZA_COLORS.admire
          const active = Boolean(signal)
          return (
            <group
              key={`signal_memory_${signal?.id || index}`}
              position={[Math.sin(angle) * 1.63, .32, Math.cos(angle) * 1.63]}
              rotation={[0, angle, 0]}
            >
              <mesh position={[0, .19, 0]} castShadow={!ghost}>
                <cylinderGeometry args={[.13, .2, .38, 10]} />
                <ModelMaterial color="#60748a" metalness={.7} roughness={.28} ghost={ghost} />
              </mesh>
              <mesh position={[0, .51, 0]} rotation={[0, index * .48, Math.PI / 4]}>
                <octahedronGeometry args={[active ? .19 : .13, 0]} />
                <ModelMaterial
                  color={active ? palette.color : '#627183'}
                  emissive={active ? palette.emissive : '#1f2e42'}
                  emissiveIntensity={active ? signal?.seen === false ? 1.9 : 1.05 : .12}
                  metalness={.28}
                  roughness={.24}
                  ghost={ghost}
                />
              </mesh>
              {active && (
                <mesh position={[0, .51, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[.24, .28, 12]} />
                  <meshBasicMaterial color={palette.color} transparent opacity={signal?.seen === false ? .72 : .35} depthWrite={false} toneMapped={false} />
                </mesh>
              )}
            </group>
          )
        })}
      </group>

      {/* 중앙 비콘: 두 개의 열린 수신 날개가 신호를 한 점으로 모은다 */}
      <group position={[0, .3, 0]}>
        {[-1, 1].map((side) => (
          <group key={`beacon_wing_${side}`}>
            <mesh position={[side * .42, .82, 0]} rotation={[0, 0, side * -.24]} castShadow={!ghost}>
              <boxGeometry args={[.16, 1.58, .34]} />
              <ModelMaterial color={side < 0 ? '#647f9c' : '#725f96'} metalness={.72} roughness={.24} ghost={ghost} />
            </mesh>
            <mesh position={[side * .53, 1.05, .02]} rotation={[0, 0, side * -.24]}>
              <boxGeometry args={[.045, 1.04, .38]} />
              <ModelMaterial
                color={side < 0 ? '#79e9ff' : '#d3b5ff'}
                emissive={side < 0 ? '#188da8' : '#7952b7'}
                emissiveIntensity={1.2}
                ghost={ghost}
              />
            </mesh>
          </group>
        ))}
        <mesh position={[0, .25, 0]}>
          <cylinderGeometry args={[.4, .55, .42, 16]} />
          <ModelMaterial color="#273b54" metalness={.72} roughness={.26} ghost={ghost} />
        </mesh>
        <mesh position={[0, 1.13, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[.64, .045, 8, 30]} />
          <ModelMaterial color="#c9afff" emissive="#7250bd" emissiveIntensity={1.35} ghost={ghost} />
        </mesh>
        <mesh position={[0, 1.13, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[.64, .03, 7, 28]} />
          <ModelMaterial color="#86e8ff" emissive="#258ca8" emissiveIntensity={1.1} ghost={ghost} />
        </mesh>
      </group>

      {/* 새 신호가 모이는 부유 코어 */}
      <group ref={beaconRef} position={[0, 2.15, 0]}>
        <mesh rotation={[0, Math.PI / 4, Math.PI / 4]}>
          <octahedronGeometry args={[.31, 0]} />
          <ModelMaterial
            color={unreadCount > 0 ? '#fff0b5' : '#eadcff'}
            emissive={unreadCount > 0 ? '#e2a43f' : '#8a64d0'}
            emissiveIntensity={unreadCount > 0 ? 2.25 : 1.55}
            metalness={.2}
            roughness={.16}
            ghost={ghost}
          />
        </mesh>
        {[0, Math.PI / 2].map((rotationX) => (
          <mesh key={`beacon_core_ring_${rotationX}`} rotation={[rotationX, 0, 0]}>
            <torusGeometry args={[.45, .022, 7, 24]} />
            <ModelMaterial color="#d7c3ff" emissive="#7a58c6" emissiveIntensity={1.25} ghost={ghost} />
          </mesh>
        ))}
      </group>

      {/* 귀환 비콘과 지면으로 번지는 수신 파동 */}
      {!ghost && (
        <>
          <mesh ref={beamRef} position={[0, 2.92, 0]}>
            <cylinderGeometry args={[.1, .34, 1.35, 12, 1, true]} />
            <meshBasicMaterial color="#bfa5ff" transparent opacity={.06} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
          {[0, 1, 2].map((index) => (
            <mesh
              key={`signal_ripple_${index}`}
              ref={(element) => { rippleRefs.current[index] = element }}
              position={[0, .36 + index * .01, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <ringGeometry args={[.72, .78, 30]} />
              <meshBasicMaterial color="#cbb5ff" transparent opacity={.08} depthWrite={false} toneMapped={false} />
            </mesh>
          ))}
        </>
      )}

      {/* 대화를 나누는 네 방향 벤치 */}
      {[Math.PI / 4, Math.PI * .75, Math.PI * 1.25, Math.PI * 1.75].map((angle) => (
        <group
          key={`signal_bench_${angle}`}
          position={[Math.sin(angle) * 1.95, .42, Math.cos(angle) * 1.95]}
          rotation={[0, angle, 0]}
        >
          <mesh><boxGeometry args={[.68, .11, .26]} /><ModelMaterial color="#8ca0af" metalness={.52} roughness={.4} ghost={ghost} /></mesh>
          <mesh position={[0, -.18, .08]}><boxGeometry args={[.52, .28, .08]} /><ModelMaterial color="#52677a" metalness={.56} roughness={.38} ghost={ghost} /></mesh>
        </group>
      ))}

      {!ghost && dynamicLightActive && (
        <>
          <pointLight ref={lightRef} position={[0, 2.35, .15]} color={unreadCount > 0 ? '#ffe1a3' : '#c7adff'} intensity={0} distance={4.8} decay={2} castShadow={false} />
          <Sparkles count={12} scale={[3.2, 2.6, 3.2]} position={[0, 1.7, 0]} size={1.25} color="#d9c7ff" speed={.22} opacity={.52} />
        </>
      )}
    </group>
  )
}

// 프리즘 길잡이 Stage 2: 프리즘 항로 리본(Prismatic Route Ribbon).
// 수직 램프 실루엣을 버리고 회전 방향을 따라 지면 위로 빛이 흐르는 저상형 항로 장치로 차별화한다.
// 여러 개를 연속 배치하면 맥동 순서와 전방 광선이 하나의 이동 경로처럼 이어진다.
function MaturePrismPathlight({ scale = 1, ghost = false, dynamicLightActive = false }) {
  const coreRef = useRef()
  const routeRefs = useRef([])
  const beamRef = useRef()
  const lightRef = useRef()

  useFrame((state, delta) => {
    if (ghost) return
    const time = state.clock.elapsedTime
    if (coreRef.current) {
      coreRef.current.rotation.y = time * .55
      coreRef.current.position.y = 1.12 + Math.sin(time * 1.35) * .045
    }
    routeRefs.current.forEach((marker, index) => {
      if (!marker) return
      const wave = Math.sin(time * 3.2 - index * .92) * .5 + .5
      marker.material.emissiveIntensity = .7 + wave * 1.55
      const markerScale = .92 + wave * .1
      marker.scale.set(markerScale, markerScale, .55)
    })
    if (beamRef.current) {
      const baseOpacity = dynamicLightActive ? .19 : .075
      beamRef.current.material.opacity = baseOpacity + Math.sin(time * 1.7) * .025
    }
    if (lightRef.current) {
      const target = dynamicLightActive ? .24 : 0
      lightRef.current.intensity = THREE.MathUtils.damp(lightRef.current.intensity, target, 6, delta)
    }
  })

  return (
    <group scale={scale}>
      {/* 길 방향(+Z)이 한눈에 드러나는 길쭉한 저상형 기초 */}
      <mesh position={[0, .06, .12]} receiveShadow castShadow={!ghost}>
        <boxGeometry args={[1.45, .12, 2.55]} />
        <ModelMaterial color="#172d41" metalness={.64} roughness={.38} ghost={ghost} />
      </mesh>
      <mesh position={[0, .13, .15]} receiveShadow>
        <boxGeometry args={[1.17, .035, 2.28]} />
        <ModelMaterial color="#29465b" metalness={.62} roughness={.32} ghost={ghost} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={`route_edge_${side}`} position={[side * .68, .13, .12]}>
          <boxGeometry args={[.055, .05, 2.42]} />
          <ModelMaterial
            color={side < 0 ? '#64dfff' : '#b79aff'}
            emissive={side < 0 ? '#167d9a' : '#6243aa'}
            emissiveIntensity={.8}
            ghost={ghost}
          />
        </mesh>
      ))}

      {/* 중앙이 열린 비대칭 쌍날개 게이트: 램프 기둥과 다른 낮고 넓은 실루엣 */}
      <group position={[0, .18, -.48]}>
        <mesh position={[-.48, .48, 0]} rotation={[0, 0, -.38]} castShadow={!ghost}>
          <boxGeometry args={[.13, 1.05, .18]} />
          <ModelMaterial color="#486b82" metalness={.74} roughness={.24} ghost={ghost} />
        </mesh>
        <mesh position={[.48, .48, 0]} rotation={[0, 0, .38]} castShadow={!ghost}>
          <boxGeometry args={[.13, 1.05, .18]} />
          <ModelMaterial color="#675f8e" metalness={.72} roughness={.25} ghost={ghost} />
        </mesh>
        <mesh position={[-.61, .55, 0]} rotation={[0, 0, -.38]}>
          <boxGeometry args={[.045, .78, .2]} />
          <ModelMaterial color="#70e7ff" emissive="#188eac" emissiveIntensity={1.25} ghost={ghost} />
        </mesh>
        <mesh position={[.61, .55, 0]} rotation={[0, 0, .38]}>
          <boxGeometry args={[.045, .78, .2]} />
          <ModelMaterial color="#c0a8ff" emissive="#7655c8" emissiveIntensity={1.15} ghost={ghost} />
        </mesh>
      </group>

      {/* 부유 프리즘 코어와 삼각 방향 프레임 */}
      <group ref={coreRef} position={[0, 1.12, -.48]}>
        <mesh scale={[.38, .52, .26]} rotation={[0, Math.PI / 4, 0]}>
          <octahedronGeometry args={[.42, 0]} />
          <meshStandardMaterial
            color={ghost ? '#71f3bf' : '#dffbff'}
            emissive={ghost ? '#1f765a' : '#55ccef'}
            emissiveIntensity={ghost ? .8 : 1.8}
            metalness={.2}
            roughness={.12}
            transparent={ghost}
            opacity={ghost ? .46 : 1}
            wireframe={ghost}
            depthWrite={!ghost}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, 0, -.04]}>
          <ringGeometry args={[.43, .49, 3]} />
          <ModelMaterial color="#bda8ff" emissive="#6b52c4" emissiveIntensity={1.2} ghost={ghost} />
        </mesh>
      </group>

      {/* 전방으로 펼쳐지는 프리즘 광선: 조명이 아니라 진행 방향을 표시 */}
      {!ghost && (
        <mesh ref={beamRef} position={[0, .72, .48]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[.38, .08, 1.9, 6, 1, true]} />
          <meshBasicMaterial color="#76e7ff" transparent opacity={.075} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      )}

      {/* 뒤에서 앞으로 순차 맥동하는 항로 패널 */}
      {[-.42, .05, .52, .98].map((z, index) => (
        <mesh
          key={`route_marker_${z}`}
          ref={(element) => { routeRefs.current[index] = element }}
          position={[0, .185, z]}
          rotation={[-Math.PI / 2, 0, Math.PI / 4]}
          scale={[1, 1, .55]}
        >
          <boxGeometry args={[.29, .29, .025]} />
          <meshStandardMaterial
            color={ghost ? '#71f3bf' : index % 2 ? '#bda8ff' : '#76e7ff'}
            emissive={ghost ? '#1f765a' : index % 2 ? '#6d4fc0' : '#1c9fbd'}
            emissiveIntensity={ghost ? .8 : .9}
            metalness={.18}
            roughness={.18}
            transparent={ghost}
            opacity={ghost ? .46 : 1}
            wireframe={ghost}
            depthWrite={!ghost}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* 끝점의 V형 진행 화살표 */}
      <group position={[0, .2, 1.22]}>
        <mesh position={[-.16, 0, -.04]} rotation={[0, -.68, 0]}><boxGeometry args={[.08, .035, .5]} /><ModelMaterial color="#d9fbff" emissive="#36bad5" emissiveIntensity={1.35} ghost={ghost} /></mesh>
        <mesh position={[.16, 0, -.04]} rotation={[0, .68, 0]}><boxGeometry args={[.08, .035, .5]} /><ModelMaterial color="#d9fbff" emissive="#785bd0" emissiveIntensity={1.35} ghost={ghost} /></mesh>
      </group>

      {!ghost && dynamicLightActive && (
        <pointLight ref={lightRef} position={[0, .72, .35]} color="#7deaff" intensity={0} distance={3.2} decay={2} castShadow={false} />
      )}
    </group>
  )
}

// 성운 관측소 Stage 2: 오로라 성운 천문대(Aurora Nebula Observatory).
// Stage 1보다 넓고 높은 이중 타워, 회전식 돔, 프리즘 망원경으로 실루엣을 명확히 구분한다.
// 광원·파티클은 플레이어에게 가장 가까운 Stage 2 발광 시설 하나에서만 활성화한다.
function MatureObservatory({ scale = 1, ghost = false, dynamicLightActive = false, observatoryMode = 'stable' }) {
  const scanAssemblyRef = useRef()
  const starChartRef = useRef()
  const beamRef = useRef()
  const lensRef = useRef()
  const lightRef = useRef()
  const isAlert = observatoryMode === 'alert'
  const isSignal = observatoryMode === 'signal'
  const scanColor = isAlert ? '#ffd56f' : isSignal ? '#b79aff' : '#7dd3fc'
  const scanEmissive = isAlert ? '#b86b10' : isSignal ? '#6945b8' : '#168fb2'

  useFrame((state, delta) => {
    if (ghost) return
    const time = state.clock.elapsedTime
    if (scanAssemblyRef.current) scanAssemblyRef.current.rotation.y = time * (isAlert ? .24 : isSignal ? .16 : .11)
    if (starChartRef.current) {
      starChartRef.current.rotation.y = time * .27
      starChartRef.current.rotation.z = Math.sin(time * .32) * .14
    }
    if (beamRef.current) {
      const baseOpacity = dynamicLightActive ? isAlert ? .2 : .13 : isAlert ? .085 : .045
      beamRef.current.material.opacity = baseOpacity + Math.sin(time * 1.35) * (dynamicLightActive ? .035 : .012)
    }
    if (lensRef.current) {
      lensRef.current.emissiveIntensity = (isAlert ? 2.25 : 1.7) + Math.sin(time * (isAlert ? 3.2 : 1.8)) * .25
    }
    if (lightRef.current) {
      const target = dynamicLightActive ? isAlert ? .58 : .38 : 0
      lightRef.current.intensity = THREE.MathUtils.damp(lightRef.current.intensity, target, 5, delta)
    }
  })

  return (
    <group scale={scale}>
      {/* 1층: 낮고 넓은 12각 강화 기초와 관측원 진입부 */}
      <mesh position={[0, .12, 0]} receiveShadow castShadow={!ghost}>
        <cylinderGeometry args={[1.52, 1.68, .24, 12]} />
        <ModelMaterial color="#22354b" metalness={.58} roughness={.44} ghost={ghost} />
      </mesh>
      <mesh position={[0, .62, 0]} castShadow={!ghost}>
        <cylinderGeometry args={[1.28, 1.48, .92, 12]} />
        <ModelMaterial color="#344966" metalness={.62} roughness={.34} ghost={ghost} />
      </mesh>
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle) => (
        <group key={`buttress_${angle}`} position={[Math.sin(angle) * 1.32, .52, Math.cos(angle) * 1.32]} rotation={[0, angle, 0]}>
          <mesh castShadow={!ghost}><boxGeometry args={[.34, .76, .22]} /><ModelMaterial color="#4a6282" metalness={.68} roughness={.3} ghost={ghost} /></mesh>
          <mesh position={[0, .02, .125]}><boxGeometry args={[.1, .52, .025]} /><ModelMaterial color="#62d8f7" emissive="#157f9c" emissiveIntensity={.65} ghost={ghost} /></mesh>
        </group>
      ))}
      <group position={[0, .46, 1.46]}>
        <mesh><boxGeometry args={[.6, .76, .08]} /><ModelMaterial color="#17283a" metalness={.72} roughness={.3} ghost={ghost} /></mesh>
        <mesh position={[0, .38, .05]}><torusGeometry args={[.3, .055, 7, 16, Math.PI]} /><ModelMaterial color="#8ba6be" metalness={.82} roughness={.2} ghost={ghost} /></mesh>
        <mesh position={[0, .03, .052]}><boxGeometry args={[.38, .42, .035]} /><ModelMaterial color="#63dcf5" emissive="#147d99" emissiveIntensity={.85} ghost={ghost} /></mesh>
      </group>

      {/* 2층: 테라스와 방위각 레일 */}
      <mesh position={[0, 1.16, 0]} castShadow={!ghost}>
        <cylinderGeometry args={[1.13, 1.28, .34, 16]} />
        <ModelMaterial color="#4a6282" metalness={.7} roughness={.26} ghost={ghost} />
      </mesh>
      <mesh position={[0, 1.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.24, .045, 8, 28]} />
        <ModelMaterial color="#93abc1" metalness={.82} roughness={.18} ghost={ghost} />
      </mesh>
      {[0, Math.PI / 3, Math.PI * 2 / 3, Math.PI, Math.PI * 4 / 3, Math.PI * 5 / 3].map((angle) => (
        <mesh key={`rail_${angle}`} position={[Math.sin(angle) * 1.24, 1.49, Math.cos(angle) * 1.24]}>
          <cylinderGeometry args={[.025, .032, .28, 6]} />
          <ModelMaterial color="#7892aa" metalness={.76} roughness={.24} ghost={ghost} />
        </mesh>
      ))}
      <mesh position={[0, 1.61, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.24, .025, 6, 28]} />
        <ModelMaterial color="#7892aa" metalness={.76} roughness={.24} ghost={ghost} />
      </mesh>

      {/* 회전식 천구 돔과 대형 프리즘 망원경 */}
      <group ref={scanAssemblyRef} position={[0, 1.42, 0]}>
        <mesh position={[0, .4, 0]} castShadow={!ghost}>
          <sphereGeometry args={[1.02, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <ModelMaterial color="#9bb9ce" metalness={.46} roughness={.22} ghost={ghost} />
        </mesh>
        <mesh position={[0, .65, .86]} rotation={[-.28, 0, 0]} scale={[.34, .95, .08]}>
          <boxGeometry args={[1, 1, 1]} />
          <ModelMaterial color="#1b3045" metalness={.72} roughness={.24} ghost={ghost} />
        </mesh>
        {[-.23, .23].map((x) => (
          <mesh key={`slit_rail_${x}`} position={[x, .67, .84]} rotation={[-.28, 0, 0]}>
            <boxGeometry args={[.045, .96, .05]} />
            <ModelMaterial color="#d2e6ee" metalness={.66} roughness={.2} ghost={ghost} />
          </mesh>
        ))}

        <group position={[0, .88, .05]} rotation={[0, 0, -.5]}>
          <mesh castShadow={!ghost}>
            <cylinderGeometry args={[.3, .46, 1.72, 14]} />
            <ModelMaterial color="#526f91" metalness={.8} roughness={.2} ghost={ghost} />
          </mesh>
          <mesh position={[0, -.63, 0]}><torusGeometry args={[.38, .055, 8, 16]} /><ModelMaterial color="#263d58" metalness={.82} roughness={.18} ghost={ghost} /></mesh>
          <mesh position={[0, .42, 0]}><torusGeometry args={[.34, .045, 8, 16]} /><ModelMaterial color="#8ca8c0" metalness={.8} roughness={.18} ghost={ghost} /></mesh>
          <mesh position={[0, .91, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[.54, .54, .13, 20]} />
            <meshStandardMaterial
              ref={lensRef}
              color={ghost ? '#71f3bf' : scanColor}
              emissive={ghost ? '#1f765a' : scanEmissive}
              emissiveIntensity={ghost ? .8 : 1.7}
              metalness={.25}
              roughness={.12}
              transparent={ghost}
              opacity={ghost ? .46 : 1}
              wireframe={ghost}
              depthWrite={!ghost}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0, .99, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[.24, .48, 20]} />
            <meshBasicMaterial color={ghost ? '#71f3bf' : '#b9f3ff'} transparent opacity={ghost ? .45 : .52} depthWrite={false} />
          </mesh>

          {/* 짧은 관측 빔은 항상 방향을 표시하고, 가까이 접근했을 때만 선명해진다. */}
          {!ghost && (
            <mesh ref={beamRef} position={[0, 2.05, 0]}>
              <cylinderGeometry args={[.12, .45, 2.2, 12, 1, true]} />
              <meshBasicMaterial color={scanColor} transparent opacity={.045} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
          )}
        </group>

        {/* 망원경 위 독립 회전 홀로그램 성도 */}
        <group ref={starChartRef} position={[-.72, 2.13, .05]} rotation={[Math.PI / 3, 0, 0]}>
          <mesh><torusGeometry args={[.62, .018, 6, 24]} /><ModelMaterial color="#77ddff" emissive="#168fb2" emissiveIntensity={1.5} ghost={ghost} /></mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.4, .012, 6, 20]} /><ModelMaterial color="#a7ecff" emissive="#1b91b1" emissiveIntensity={1.15} ghost={ghost} /></mesh>
          {[0, Math.PI * .5, Math.PI, Math.PI * 1.5].map((angle) => (
            <mesh key={`chart_star_${angle}`} position={[Math.cos(angle) * .62, Math.sin(angle) * .62, 0]}>
              <octahedronGeometry args={[.045, 0]} />
              <ModelMaterial color="#e2f8ff" emissive="#38bdf8" emissiveIntensity={1.8} ghost={ghost} />
            </mesh>
          ))}
        </group>
      </group>

      {!ghost && (
        <>
          {dynamicLightActive && <Sparkles count={isAlert ? 16 : 10} scale={[2.6, 2.4, 2.6]} position={[0, 3.2, 0]} color={scanColor} size={1.45} speed={isAlert ? .46 : .28} />}
          <pointLight ref={lightRef} position={[0, 2.75, .35]} color={scanColor} intensity={0} distance={4.8} decay={2} castShadow={false} />
        </>
      )}
    </group>
  )
}

function MatureExpeditionBeacon({ scale = 1, ghost = false, dynamicLightActive = false, roverStatus = 'idle' }) {
  const relayRef = useRef()
  const dishRef = useRef()
  const pulseRef = useRef()
  const routeRef = useRef()
  const lightRef = useRef()
  const normalizedStatus = ['active', 'ready', 'claimed'].includes(roverStatus) ? roverStatus : 'idle'
  const isActive = normalizedStatus === 'active'
  const isReady = normalizedStatus === 'ready'
  const signalColor = isReady ? '#ffe18a' : isActive ? '#6de8ff' : normalizedStatus === 'claimed' ? '#83f1bd' : '#ff9b67'
  const signalEmissive = isReady ? '#d98e16' : isActive ? '#1687aa' : normalizedStatus === 'claimed' ? '#237a58' : '#a94320'

  useFrame((state, delta) => {
    const elapsed = state.clock.elapsedTime
    if (relayRef.current) relayRef.current.rotation.y += delta * (isActive ? 1.45 : isReady ? .72 : .28)
    if (dishRef.current) dishRef.current.rotation.y = Math.sin(elapsed * (isActive ? .9 : .35)) * .26
    if (pulseRef.current) {
      const pulse = 1 + Math.sin(elapsed * (isReady ? 3.6 : 1.8)) * (isReady ? .16 : .06)
      pulseRef.current.scale.setScalar(pulse)
    }
    if (routeRef.current) {
      routeRef.current.children.forEach((child, index) => {
        if (!child.material) return
        child.material.opacity = ghost ? .18 : .2 + Math.max(0, Math.sin(elapsed * 2.2 - index * .8)) * (isActive ? .42 : .18)
      })
    }
    if (lightRef.current) {
      const target = dynamicLightActive ? isReady ? .72 : isActive ? .48 : .24 : 0
      lightRef.current.intensity = THREE.MathUtils.damp(lightRef.current.intensity, target, 6, delta)
    }
  })

  return (
    <group scale={scale}>
      <mesh position={[0, .1, 0]} receiveShadow castShadow={!ghost}>
        <cylinderGeometry args={[1.72, 1.92, .2, 6]} />
        <ModelMaterial color="#24384b" metalness={.76} roughness={.32} ghost={ghost} />
      </mesh>
      <mesh position={[0, .23, 0]} receiveShadow>
        <cylinderGeometry args={[1.44, 1.58, .11, 6]} />
        <ModelMaterial color="#435b70" metalness={.68} roughness={.3} ghost={ghost} />
      </mesh>
      {[0, Math.PI * 2 / 3, Math.PI * 4 / 3].map((angle, index) => (
        <group key={`relay_pad_${index}`} position={[Math.sin(angle) * 1.48, .28, Math.cos(angle) * 1.48]} rotation={[0, angle, 0]}>
          <mesh castShadow={!ghost}><boxGeometry args={[.62, .1, .54]} /><ModelMaterial color="#526b7d" metalness={.72} roughness={.28} ghost={ghost} /></mesh>
          <mesh position={[0, .07, .08]}><boxGeometry args={[.38, .025, .3]} /><ModelMaterial color={signalColor} emissive={signalEmissive} emissiveIntensity={1.25} ghost={ghost} /></mesh>
        </group>
      ))}

      <mesh position={[0, .76, 0]} castShadow={!ghost}>
        <cylinderGeometry args={[.35, .56, 1.06, 10]} />
        <ModelMaterial color="#60778c" metalness={.84} roughness={.2} ghost={ghost} />
      </mesh>
      <group ref={pulseRef} position={[0, 1.26, 0]}>
        <mesh><icosahedronGeometry args={[.28, 1]} /><ModelMaterial color="#fff4d8" emissive={signalEmissive} emissiveIntensity={2.35} metalness={.25} roughness={.16} ghost={ghost} /></mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.46, .035, 8, 30]} /><ModelMaterial color={signalColor} emissive={signalEmissive} emissiveIntensity={1.8} ghost={ghost} /></mesh>
      </group>

      <group ref={dishRef} position={[0, 1.52, 0]}>
        {[-1, 1].map((side) => (
          <group key={`deep_dish_${side}`} position={[side * .68, .48, 0]} rotation={[-.34, side * .42, side * -.18]}>
            <mesh castShadow={!ghost}>
              <coneGeometry args={[.62, .2, 28, 1, true]} />
              <meshStandardMaterial
                color={ghost ? '#71f3bf' : side < 0 ? '#d8edf5' : '#ffb083'}
                emissive={side < 0 ? '#1a6d86' : '#8e3d22'}
                emissiveIntensity={ghost ? .55 : .46}
                metalness={.72}
                roughness={.22}
                transparent={ghost}
                opacity={ghost ? .42 : 1}
                wireframe={ghost}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh position={[0, -.12, 0]}><cylinderGeometry args={[.045, .07, .55, 8]} /><ModelMaterial color="#8ea4b5" metalness={.82} roughness={.2} ghost={ghost} /></mesh>
            <mesh position={[0, -.42, 0]}><sphereGeometry args={[.09, 10, 8]} /><ModelMaterial color={signalColor} emissive={signalEmissive} emissiveIntensity={1.7} ghost={ghost} /></mesh>
          </group>
        ))}
      </group>

      <group ref={relayRef} position={[0, 2.58, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.66, .045, 8, 36]} /><ModelMaterial color={signalColor} emissive={signalEmissive} emissiveIntensity={2} ghost={ghost} /></mesh>
        {[0, Math.PI * 2 / 3, Math.PI * 4 / 3].map((angle) => (
          <mesh key={`relay_fin_${angle}`} position={[Math.sin(angle) * .64, 0, Math.cos(angle) * .64]} rotation={[0, angle, 0]}>
            <octahedronGeometry args={[.13, 0]} />
            <ModelMaterial color="#fff7dc" emissive={signalEmissive} emissiveIntensity={2.1} ghost={ghost} />
          </mesh>
        ))}
      </group>
      <group ref={routeRef} position={[0, 2.62, 0]}>
        {[0, Math.PI * 2 / 3, Math.PI * 4 / 3].map((angle, index) => (
          <mesh key={`route_beam_${angle}`} position={[Math.sin(angle) * 1.15, .08 + index * .08, Math.cos(angle) * 1.15]} rotation={[Math.PI / 2, 0, -angle]}>
            <cylinderGeometry args={[.022, .055, 1.62, 8]} />
            <meshBasicMaterial color={signalColor} transparent opacity={ghost ? .18 : .34} depthWrite={false} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 3.02, 0]} rotation={[0, Math.PI / 4, 0]}>
        <octahedronGeometry args={[.22, 0]} />
        <ModelMaterial color="#fff5cf" emissive={signalEmissive} emissiveIntensity={2.7} metalness={.18} roughness={.14} ghost={ghost} />
      </mesh>

      {!ghost && (
        <>
          {dynamicLightActive && <Sparkles count={isReady ? 18 : 10} scale={[3.4, 3.2, 3.4]} position={[0, 2.25, 0]} color={signalColor} size={1.45} speed={isActive ? .48 : .24} />}
          <pointLight ref={lightRef} position={[0, 2.5, 0]} color={signalColor} intensity={0} distance={5.2} decay={2} castShadow={false} />
        </>
      )}
    </group>
  )
}

export function StructureModel({ itemId, level = 1, ghost = false, dynamicLightActive = false, signalSummary, observatoryMode = 'stable', roverStatus = 'idle', greenhouseSummary, gardenSummary }) {
  if (itemId === 'starter_dome') {
    return (
      <group>
        <mesh position={[0, .75, 0]} scale={[1.45, .92, 1.45]} castShadow={!ghost} receiveShadow><sphereGeometry args={[1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><ModelMaterial color="#d8eff8" metalness={.28} roughness={.34} ghost={ghost} /></mesh>
        <mesh position={[0, .18, 0]} castShadow={!ghost}><cylinderGeometry args={[1.42, 1.55, .4, 24]} /><ModelMaterial color="#253b56" metalness={.62} roughness={.28} ghost={ghost} /></mesh>
        <mesh position={[0, .66, 1.18]}><boxGeometry args={[.62, 1.02, .18]} /><ModelMaterial color="#67e8f9" emissive="#168ca0" emissiveIntensity={1.2} ghost={ghost} /></mesh>
        {[-.75, .75].map((x) => <mesh key={x} position={[x, .8, .8]} rotation={[0, 0, 0]}><circleGeometry args={[.26, 16]} /><ModelMaterial color="#8ceeff" emissive="#1c7990" emissiveIntensity={.8} ghost={ghost} /></mesh>)}
      </group>
    )
  }
  if (itemId === 'lumen_tree') return Number(level || 1) >= 2
    ? <MatureLumenTree scale={1} ghost={ghost} />
    : <RoundedLumenTree scale={.9} ghost={ghost} />
  if (itemId === 'wild_sprout') return <RoundedLumenTree scale={.45} ghost={ghost} />
  if (itemId === 'star_lamp') {
    if (Number(level || 1) >= 2) {
      return <MatureStarLamp scale={1} ghost={ghost} seed={0} dynamicLightActive={dynamicLightActive} />
    }
    // Stage 1: 기존 코드 유지
    return (
      <group>
        <mesh position={[0, .7, 0]} castShadow={!ghost}><cylinderGeometry args={[.08, .17, 1.4, 10]} /><ModelMaterial color="#7589a5" metalness={.78} roughness={.25} ghost={ghost} /></mesh>
        <mesh position={[0, 1.54, 0]} rotation={[0, .35, 0]}><octahedronGeometry args={[.34, 0]} /><ModelMaterial color="#fff2a9" emissive="#ffd347" emissiveIntensity={2.5} metalness={.2} roughness={.18} ghost={ghost} /></mesh>
        <mesh position={[0, .09, 0]}><cylinderGeometry args={[.36, .46, .18, 12]} /><ModelMaterial color="#32465d" metalness={.7} ghost={ghost} /></mesh>
      </group>
    )
  }
  if (itemId === 'prism_pathlight') {
    if (Number(level || 1) >= 2) {
      return <MaturePrismPathlight scale={1} ghost={ghost} dynamicLightActive={dynamicLightActive} />
    }
    // Stage 1: 기존 코드 유지
    return (
      <group scale={.68}>
        <mesh position={[0, .7, 0]} castShadow={!ghost}><cylinderGeometry args={[.08, .17, 1.4, 10]} /><ModelMaterial color="#7589a5" metalness={.78} roughness={.25} ghost={ghost} /></mesh>
        <mesh position={[0, 1.54, 0]} rotation={[0, .35, 0]}><octahedronGeometry args={[.34, 0]} /><ModelMaterial color="#fff2a9" emissive="#ffd347" emissiveIntensity={2.5} metalness={.2} roughness={.18} ghost={ghost} /></mesh>
        <mesh position={[0, .09, 0]}><cylinderGeometry args={[.36, .46, .18, 12]} /><ModelMaterial color="#32465d" metalness={.7} ghost={ghost} /></mesh>
      </group>
    )
  }
  if (itemId === 'crystal_pond') {
    if (Number(level || 1) >= 2) {
      return <MatureCrystalPond scale={1} ghost={ghost} dynamicLightActive={dynamicLightActive} />
    }
    // Stage 1: 기존 코드 유지
    return (
      <group>
        <mesh position={[0, .08, 0]} receiveShadow><cylinderGeometry args={[1.35, 1.55, .2, 24]} /><ModelMaterial color="#203c57" roughness={.8} ghost={ghost} /></mesh>
        <mesh position={[0, .2, 0]}><cylinderGeometry args={[1.12, 1.24, .13, 28]} /><meshPhysicalMaterial color={ghost ? '#71f3bf' : '#4ad8ec'} transparent opacity={ghost ? .42 : .73} roughness={.08} metalness={.2} depthWrite={!ghost} /></mesh>
        <group position={[.45, .2, -.2]} scale={.35}><CrystalCluster color="#7be8ff" ghost={ghost} /></group>
      </group>
    )
  }
  if (itemId === 'friend_greenhouse') {
    if (Number(level || 1) >= 2) {
      return <MatureFriendGreenhouse scale={1} ghost={ghost} dynamicLightActive={dynamicLightActive} vitality={greenhouseSummary?.vitality} />
    }
    // Stage 1: 기존 코드 유지
    return (
      <group>
        <mesh position={[0, .08, 0]} receiveShadow><boxGeometry args={[2.5, .16, 2.05]} /><ModelMaterial color="#304b50" metalness={.48} roughness={.55} ghost={ghost} /></mesh>
        <mesh position={[0, .8, 0]}><boxGeometry args={[2.18, 1.35, 1.7]} /><meshPhysicalMaterial color={ghost ? '#71f3bf' : '#a9fbe4'} transparent opacity={ghost ? .28 : .22} roughness={.08} metalness={.08} clearcoat={.65} depthWrite={!ghost} /></mesh>
        {[-1.08, 1.08].flatMap((x) => [-.84, .84].map((z) => <mesh key={`${x}_${z}`} position={[x, .83, z]} castShadow={!ghost}><boxGeometry args={[.08, 1.52, .08]} /><ModelMaterial color="#547579" metalness={.65} roughness={.28} ghost={ghost} /></mesh>))}
        {[-.54, .54].map((x) => <mesh key={`roof_${x}`} position={[x, 1.66, 0]} rotation={[0, 0, x < 0 ? -.43 : .43]} castShadow={!ghost}><boxGeometry args={[1.22, .08, 1.78]} /><meshPhysicalMaterial color={ghost ? '#71f3bf' : '#d2fff4'} transparent opacity={ghost ? .3 : .3} roughness={.1} metalness={.12} depthWrite={!ghost} /></mesh>)}
        <mesh position={[0, 1.91, 0]}><boxGeometry args={[.08, .08, 1.84]} /><ModelMaterial color="#7da09f" metalness={.72} roughness={.24} ghost={ghost} /></mesh>
        {[-.52, .52].map((x) => <group key={`bed_${x}`} position={[x, .2, -.05]}><mesh><boxGeometry args={[.62, .22, 1.28]} /><ModelMaterial color="#6b523e" roughness={.94} ghost={ghost} /></mesh>{[-.38, 0, .38].map((z) => <mesh key={z} position={[0, .27, z]}><sphereGeometry args={[.17, 10, 8]} /><ModelMaterial color={x < 0 ? '#6edf89' : '#7bc7a1'} emissive="#174e2b" emissiveIntensity={.28} ghost={ghost} /></mesh>)}</group>)}
        <mesh position={[0, .7, .89]}><boxGeometry args={[.58, 1.16, .08]} /><ModelMaterial color="#5ce0cc" emissive="#167d72" emissiveIntensity={.5} metalness={.42} roughness={.22} ghost={ghost} /></mesh>
      </group>
    )
  }
  if (itemId === 'rover_bay') {
    if (Number(level || 1) >= 2) {
      return <MatureRoverBay scale={1} ghost={ghost} dynamicLightActive={dynamicLightActive} roverStatus={roverStatus} />
    }
    // Stage 1: 기존 코드 유지
    return (
      <group>
        <mesh position={[0, .08, 0]} receiveShadow><boxGeometry args={[2.7, .16, 2.35]} /><ModelMaterial color="#26394c" metalness={.6} roughness={.42} ghost={ghost} /></mesh>
        {[-.48, .48].map((x) => <mesh key={`rail_${x}`} position={[x, .17, .15]}><boxGeometry args={[.11, .09, 1.9]} /><ModelMaterial color="#a8bbc7" metalness={.88} roughness={.18} ghost={ghost} /></mesh>)}
        <mesh position={[0, .82, -.98]} castShadow={!ghost}><boxGeometry args={[2.45, 1.48, .22]} /><ModelMaterial color="#3c5369" metalness={.68} roughness={.32} ghost={ghost} /></mesh>
        {[-1.08, 1.08].map((x) => <mesh key={`post_${x}`} position={[x, 1.05, 0]} castShadow={!ghost}><boxGeometry args={[.2, 1.95, .24]} /><ModelMaterial color="#71869d" metalness={.78} roughness={.22} ghost={ghost} /></mesh>)}
        <mesh position={[0, 1.94, 0]} castShadow={!ghost}><boxGeometry args={[2.36, .2, .28]} /><ModelMaterial color="#8297ab" metalness={.82} roughness={.2} ghost={ghost} /></mesh>
        <mesh position={[.35, 1.7, .08]} rotation={[0, 0, -.5]}><boxGeometry args={[.14, .85, .14]} /><ModelMaterial color="#c3d2d9" metalness={.82} roughness={.18} ghost={ghost} /></mesh>
        <mesh position={[.57, 1.31, .08]}><sphereGeometry args={[.15, 10, 8]} /><ModelMaterial color="#ffb066" emissive="#b54c1f" emissiveIntensity={1.25} ghost={ghost} /></mesh>
        {[-.72, 0, .72].map((x) => <mesh key={`status_${x}`} position={[x, 1.27, -.865]}><boxGeometry args={[.22, .1, .05]} /><ModelMaterial color={x === 0 ? '#72f0c1' : '#68dffc'} emissive={x === 0 ? '#28976e' : '#227795'} emissiveIntensity={1.4} ghost={ghost} /></mesh>)}
        <mesh position={[0, .18, 1.18]} rotation={[-.13, 0, 0]}><boxGeometry args={[1.5, .12, .62]} /><ModelMaterial color="#4c6072" metalness={.58} roughness={.45} ghost={ghost} /></mesh>
      </group>
    )
  }
  if (itemId === 'observatory') {
    if (Number(level || 1) >= 2) {
      return <MatureObservatory scale={1} ghost={ghost} dynamicLightActive={dynamicLightActive} observatoryMode={observatoryMode} />
    }
    // Stage 1: 기존 코드 유지
    return (
      <group>
        <mesh position={[0, .55, 0]} castShadow={!ghost}><cylinderGeometry args={[1.05, 1.25, 1.1, 18]} /><ModelMaterial color="#526a91" metalness={.65} roughness={.3} ghost={ghost} /></mesh>
        <mesh position={[0, 1.28, 0]} castShadow={!ghost}><sphereGeometry args={[.84, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><ModelMaterial color="#b8e8f5" metalness={.35} roughness={.25} ghost={ghost} /></mesh>
        <group position={[0, 1.85, 0]} rotation={[0, 0, -.42]}>
          <mesh><cylinderGeometry args={[.22, .38, 1.55, 12]} /><ModelMaterial color="#9ab9d0" metalness={.75} ghost={ghost} /></mesh>
          <mesh position={[0, .8, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.48, .48, .1, 18]} /><ModelMaterial color="#6ce7ff" emissive="#177e93" emissiveIntensity={1.2} ghost={ghost} /></mesh>
        </group>
      </group>
    )
  }
  if (itemId === 'starflower_garden') {
    if (Number(level || 1) >= 2) {
      return <MatureStarflowerGarden scale={1} ghost={ghost} dynamicLightActive={dynamicLightActive} vitality={gardenSummary?.vitality} recentWaterCount={gardenSummary?.recentWaterCount} />
    }
    // Stage 1: 기존 코드 유지
    return (
      <group>
        <mesh position={[0, .06, 0]} receiveShadow><cylinderGeometry args={[1.2, 1.3, .12, 24]} /><ModelMaterial color="#315b48" roughness={.95} ghost={ghost} /></mesh>
        {[[-.62, -.2], [-.25, .4], [.2, -.42], [.58, .22], [0, .2]].map(([x, z], index) => (
          <group key={index} position={[x, .15, z]}>
            <mesh position={[0, .23, 0]}><cylinderGeometry args={[.025, .04, .46, 6]} /><ModelMaterial color="#62c987" roughness={.9} ghost={ghost} /></mesh>
            <mesh position={[0, .5, 0]} rotation={[0, index, 0]}><octahedronGeometry args={[.16, 0]} /><ModelMaterial color={index % 2 ? '#ff9fcf' : '#c4a0ff'} emissive={index % 2 ? '#a83c72' : '#6740a0'} emissiveIntensity={.9} ghost={ghost} /></mesh>
          </group>
        ))}
      </group>
    )
  }
  if (itemId === 'creature_habitat') {
    if (Number(level || 1) >= 2) {
      return <MatureCreatureHabitat scale={1} ghost={ghost} dynamicLightActive={dynamicLightActive} />
    }
    // Stage 1: 기존 코드 유지
    return (
      <group>
        <mesh position={[0, .07, 0]} receiveShadow><cylinderGeometry args={[1.55, 1.68, .14, 24]} /><ModelMaterial color="#354c43" roughness={.94} ghost={ghost} /></mesh>
        <mesh position={[-.25, .78, -.25]} scale={[1.2, .82, 1]} castShadow={!ghost}><sphereGeometry args={[1.02, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><ModelMaterial color="#92b978" emissive="#29472a" emissiveIntensity={.18} roughness={.84} ghost={ghost} /></mesh>
        <mesh position={[-.25, .52, .72]}><circleGeometry args={[.46, 20]} /><ModelMaterial color="#1d3232" roughness={.95} ghost={ghost} /></mesh>
        <mesh position={[-.25, .35, .2]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[.48, .12, 8, 24]} /><ModelMaterial color="#b88755" roughness={.95} ghost={ghost} /></mesh>
        {[-1.38, -.7, .62, 1.3].map((x) => <mesh key={`fence_${x}`} position={[x, .42, .62]}><cylinderGeometry args={[.045, .065, .78, 7]} /><ModelMaterial color="#8e795f" roughness={.92} ghost={ghost} /></mesh>)}
        <mesh position={[-.04, .6, .62]}><boxGeometry args={[2.78, .06, .06]} /><ModelMaterial color="#8e795f" roughness={.92} ghost={ghost} /></mesh>
        <group position={[1.02, .28, -.35]}><mesh><cylinderGeometry args={[.3, .4, .42, 10]} /><ModelMaterial color="#536d6b" metalness={.38} roughness={.48} ghost={ghost} /></mesh><mesh position={[0, .29, 0]}><cylinderGeometry args={[.22, .28, .18, 10]} /><ModelMaterial color="#79e0ac" emissive="#267151" emissiveIntensity={.65} ghost={ghost} /></mesh></group>
      </group>
    )
  }
  if (itemId === 'signal_plaza') {
    if (Number(level || 1) >= 2) {
      return <MatureSignalPlaza scale={1} ghost={ghost} dynamicLightActive={dynamicLightActive} signalSummary={signalSummary} />
    }
    // Stage 1: 기존 코드 유지
    return (
      <group>
        <mesh position={[0, .08, 0]} receiveShadow><cylinderGeometry args={[1.82, 1.96, .16, 32]} /><ModelMaterial color="#34485e" metalness={.48} roughness={.48} ghost={ghost} /></mesh>
        <mesh position={[0, .22, 0]} receiveShadow><cylinderGeometry args={[1.38, 1.55, .16, 28]} /><ModelMaterial color="#536982" metalness={.55} roughness={.38} ghost={ghost} /></mesh>
        <mesh position={[0, 1.15, 0]} castShadow={!ghost}><cylinderGeometry args={[.11, .26, 1.9, 10]} /><ModelMaterial color="#8ea2ba" metalness={.82} roughness={.2} ghost={ghost} /></mesh>
        {[.7, 1.12, 1.52].map((y, index) => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, index * .4]}><torusGeometry args={[.4 + index * .13, .034, 8, 28]} /><ModelMaterial color="#b39cff" emissive="#6e51d1" emissiveIntensity={1.7} ghost={ghost} /></mesh>)}
        <mesh position={[0, 2.14, 0]} rotation={[0, .35, 0]}><octahedronGeometry args={[.28, 0]} /><ModelMaterial color="#efe3ff" emissive="#aa79ff" emissiveIntensity={2.3} metalness={.25} roughness={.15} ghost={ghost} /></mesh>
        {[0, Math.PI * .5, Math.PI, Math.PI * 1.5].map((angle) => <group key={angle} position={[Math.sin(angle) * 1.42, .38, Math.cos(angle) * 1.42]} rotation={[0, angle, 0]}><mesh><boxGeometry args={[.72, .12, .26]} /><ModelMaterial color="#8192a2" metalness={.55} roughness={.4} ghost={ghost} /></mesh><mesh position={[0, -.18, 0]}><boxGeometry args={[.55, .3, .08]} /><ModelMaterial color="#4d6075" metalness={.58} roughness={.42} ghost={ghost} /></mesh></group>)}
      </group>
    )
  }
  if (itemId === 'expedition_beacon') {
    if (Number(level || 1) >= 2) {
      return <MatureExpeditionBeacon scale={1} ghost={ghost} dynamicLightActive={dynamicLightActive} roverStatus={roverStatus} />
    }
    // Stage 1: 기존 코드 유지
    return (
      <group>
        <mesh position={[0, .16, 0]} castShadow={!ghost}><cylinderGeometry args={[.7, .92, .32, 16]} /><ModelMaterial color="#36495e" metalness={.7} ghost={ghost} /></mesh>
        <mesh position={[0, 1.25, 0]} castShadow={!ghost}><cylinderGeometry args={[.11, .25, 2.2, 10]} /><ModelMaterial color="#8295aa" metalness={.8} ghost={ghost} /></mesh>
        <mesh position={[0, 2.15, 0]} rotation={[0, 0, -.5]}><cylinderGeometry args={[.52, .52, .1, 20, 1, false, 0, Math.PI]} /><ModelMaterial color="#ff9b65" emissive="#ae3f19" emissiveIntensity={1.1} metalness={.6} ghost={ghost} /></mesh>
        <mesh position={[0, 2.3, 0]}><sphereGeometry args={[.18, 12, 9]} /><ModelMaterial color="#fff3bd" emissive="#ffb454" emissiveIntensity={2.3} ghost={ghost} /></mesh>
      </group>
    )
  }
  if (itemId === 'route_gateway') {
    return (
      <group>
        <mesh position={[0, .14, 0]} castShadow={!ghost}><cylinderGeometry args={[1.6, 1.85, .28, 24]} /><ModelMaterial color="#263c54" metalness={.72} ghost={ghost} /></mesh>
        <mesh position={[0, 1.65, 0]} rotation={[0, 0, 0]}><torusGeometry args={[1.2, .18, 10, 42]} /><ModelMaterial color="#6ce7d0" emissive="#218b79" emissiveIntensity={1.8} metalness={.55} roughness={.18} ghost={ghost} /></mesh>
        <mesh position={[0, 1.65, 0]}><circleGeometry args={[.98, 40]} /><meshBasicMaterial color="#60d8ff" transparent opacity={ghost ? .18 : .22} side={THREE.DoubleSide} depthWrite={false} /></mesh>
        {[-1.05, 1.05].map((x) => <mesh key={x} position={[x, .84, 0]} castShadow={!ghost}><boxGeometry args={[.34, 1.65, .5]} /><ModelMaterial color="#526b7b" metalness={.72} ghost={ghost} /></mesh>)}
      </group>
    )
  }
  return (
    <group>
      <mesh position={[0, .55, 0]} castShadow={!ghost}><boxGeometry args={[1.8, 1.1, 1.55]} /><ModelMaterial color="#445871" metalness={.6} roughness={.34} ghost={ghost} /></mesh>
      <mesh position={[0, 1.35, 0]} castShadow={!ghost}><cylinderGeometry args={[.55, .75, .55, 12]} /><ModelMaterial color="#9bb0c7" metalness={.72} ghost={ghost} /></mesh>
    </group>
  )
}

function PreviewTurntable({ itemId, level = 1, signalSummary, observatoryMode = 'stable', roverStatus = 'idle', greenhouseSummary, gardenSummary }) {
  const group = useRef()
  const baseY = itemId === 'observatory' && Number(level || 1) >= 2 ? -.98 : -.65
  useFrame((state, delta) => {
    if (!group.current) return
    group.current.rotation.y += delta * .35
    group.current.position.y = baseY + Math.sin(state.clock.elapsedTime * 1.4) * .04
  })
  return <group ref={group} position={[0, baseY, 0]}><StructureModel itemId={itemId} level={level} signalSummary={signalSummary} observatoryMode={observatoryMode} roverStatus={roverStatus} greenhouseSummary={greenhouseSummary} gardenSummary={gardenSummary} /></group>
}

export function StructurePreview3D({ itemId, level = 1, signalSummary, observatoryMode = 'stable', roverStatus = 'idle', greenhouseSummary, gardenSummary }) {
  const isTallStructure = (itemId === 'observatory' || itemId === 'expedition_beacon') && Number(level || 1) >= 2
  return (
    <Canvas
      dpr={[1, 1.35]}
      camera={{
        position: isTallStructure ? [5.4, 4.1, 6.7] : [4.5, 3.4, 5.5],
        fov: isTallStructure ? 40 : 38,
        near: .1,
        far: 50,
      }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={1.05} />
      <hemisphereLight args={['#d9f8ff', '#172435', 1.4]} />
      <directionalLight position={[4, 7, 5]} intensity={2.2} color="#fff3d6" />
      <pointLight position={[-3, 2, 2]} intensity={1.2} color="#68e9ff" distance={10} />
      <PreviewTurntable itemId={itemId} level={level} signalSummary={signalSummary} observatoryMode={observatoryMode} roverStatus={roverStatus} greenhouseSummary={greenhouseSummary} gardenSummary={gardenSummary} />
      <mesh position={[0, -.72, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[2.2, 40]} /><meshBasicMaterial color="#6ce7ff" transparent opacity={.06} /></mesh>
      <Sparkles count={18} scale={[4, 3, 4]} size={1.6} color="#a8efff" speed={.2} />
    </Canvas>
  )
}

function structureFootprint(itemId, level = 1) {
  if (itemId === 'star_lamp' || (itemId === 'prism_pathlight' && Number(level || 1) < 2)) return .46
  if (itemId === 'prism_pathlight') return 1.2
  if (itemId === 'wild_sprout') return .42
  if (itemId === 'lumen_tree') return .78
  if (itemId === 'starflower_garden' && Number(level || 1) >= 2) return 1.76
  if (itemId === 'creature_habitat' && Number(level || 1) >= 2) return 1.88
  if (itemId === 'crystal_pond' || itemId === 'starflower_garden') return 1.28
  if (itemId === 'signal_plaza' && Number(level || 1) >= 2) return 2.34
  if (itemId === 'expedition_beacon' && Number(level || 1) >= 2) return 1.92
  if (itemId === 'signal_plaza' || itemId === 'route_gateway') return 1.52
  if (itemId === 'observatory' && Number(level || 1) >= 2) return 1.68
  if (itemId === 'friend_greenhouse' && Number(level || 1) >= 2) return 1.78
  return 1.14
}

function getStructureAcousticMaterial(itemId) {
  if (itemId === 'lumen_tree' || itemId === 'wild_sprout' || itemId === 'starflower_garden' || itemId === 'friend_greenhouse') return 'wood'
  if (itemId === 'crystal_pond' || itemId === 'observatory') return 'stone'
  if (itemId === 'starter_dome' || itemId === 'rover_bay' || itemId === 'star_lamp' || itemId === 'prism_pathlight' || itemId === 'route_gateway' || itemId === 'signal_plaza') return 'metal'
  return 'soft'
}

const ORGANIC_STRUCTURE_IDS = new Set([
  'lumen_tree',
  'wild_sprout',
  'starflower_garden',
  'creature_habitat',
])

// Stage 2에서 동적 조명(spotLight)을 내장하는 발광 시설. 가장 가까운 1개만 실제 조명을 켠다.
// 새 발광 Stage 2 시설이 추가되면 여기에 itemId를 추가하면 자동으로 조명 매니저가 지원한다.
const LIGHTING_STRUCTURE_IDS = new Set([
  'star_lamp',
  'prism_pathlight',
  'rover_bay',
  'crystal_pond',
  'observatory',
  'friend_greenhouse',
  'starflower_garden',
  'creature_habitat',
  'signal_plaza',
  'expedition_beacon',
])

function PlacedStructure({ item, selected, onSelect, activeLightId, signalSummary, observatorySummary, greenhouseSummary, gardenSummary, roverStatus }) {
  const position = worldPositionFromLayout(item)
  position[1] = terrainHeight(position[0], position[2])
  const footprint = structureFootprint(item.itemId, item.level)
  const isOrganic = ORGANIC_STRUCTURE_IDS.has(item.itemId)
  // 가장 가까운 Stage 2 발광 시설 1개만 동적 조명을 켠다.
  const dynamicLightActive = LIGHTING_STRUCTURE_IDS.has(item.itemId)
    && Number(item.level || 1) >= 2
    && activeLightId === item.instanceId
  return (
    <group position={position} rotation={[0, THREE.MathUtils.degToRad(Number(item.rotation || 0)), 0]}>
      {!isOrganic && (
        <mesh position={[0, .045, 0]} receiveShadow><cylinderGeometry args={[footprint, footprint + .12, .09, 24]} /><meshStandardMaterial color="#293d48" roughness={.94} /></mesh>
      )}
      <StructureModel
        itemId={item.itemId}
        level={item.level || 1}
        dynamicLightActive={dynamicLightActive}
        signalSummary={item.itemId === 'signal_plaza' ? signalSummary : undefined}
        observatoryMode={item.itemId === 'observatory' ? observatorySummary?.mode : undefined}
        roverStatus={item.itemId === 'expedition_beacon' || item.itemId === 'rover_bay' ? roverStatus : undefined}
        greenhouseSummary={item.itemId === 'friend_greenhouse' ? greenhouseSummary : undefined}
        gardenSummary={item.itemId === 'starflower_garden' ? gardenSummary : undefined}
      />
      {item.imageUrl && (
        <Html position={[0, Math.max(.76, footprint * .58), footprint * .82]} center distanceFactor={11}>
          <button type="button" className="frontier-structure-image-marker" onClick={(event) => { event.stopPropagation(); onSelect?.(item) }} aria-label={`${item.name || '객체'} 이미지와 설명 보기`}>
            <ImageIcon size={14} aria-hidden="true" />
          </button>
        </Html>
      )}
      {selected && (
        <mesh position={[0, .07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[footprint + .24, footprint + .42, 36]} />
          <meshBasicMaterial color="#6ce7ff" transparent opacity={.9} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

function RoverControl({ palette, status = 'idle' }) {
  const antenna = useRef()
  const activeSignal = useRef()
  const readyRing = useRef()
  const normalizedStatus = ROVER_STATUS_LABELS[status] ? status : 'idle'
  const isActive = normalizedStatus === 'active'
  const isReady = normalizedStatus === 'ready'
  const statusColor = isReady ? '#ffe08a' : isActive ? '#75eaff' : normalizedStatus === 'claimed' ? '#8af0bf' : palette.glow
  const [roverX, roverOffsetY, roverZ] = ROVER_NODE.position

  useFrame((state, delta) => {
    const elapsed = state.clock.elapsedTime
    if (antenna.current) antenna.current.rotation.y += delta * (isActive ? 2.2 : .35)
    if (activeSignal.current) {
      const pulse = (elapsed * 1.15) % 1
      activeSignal.current.position.y = 1.34 + pulse * .42
      activeSignal.current.scale.setScalar(.72 + pulse * .72)
      activeSignal.current.children.forEach((child) => {
        if (child.material) child.material.opacity = Math.max(0, .58 * (1 - pulse))
      })
    }
    if (readyRing.current) {
      const pulse = 1 + Math.sin(elapsed * 3.2) * .12
      readyRing.current.scale.setScalar(pulse)
      readyRing.current.material.opacity = .55 + Math.sin(elapsed * 3.2) * .2
    }
  })

  return (
    <group position={[roverX, terrainHeight(roverX, roverZ) + roverOffsetY, roverZ]} rotation={[0, -.35, 0]}>
      <mesh position={[0, .25, 0]} castShadow><boxGeometry args={[1.35, .46, .92]} /><meshStandardMaterial color="#dcecf2" metalness={.48} roughness={.32} /></mesh>
      <mesh position={[.12, .67, -.03]} castShadow><boxGeometry args={[.74, .42, .64]} /><meshStandardMaterial color="#5fbfda" emissive="#185e78" emissiveIntensity={isActive ? 1.15 : .45} metalness={.42} roughness={.25} /></mesh>
      <mesh position={[0, .27, .5]}><boxGeometry args={[.88, .14, .08]} /><meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={isReady ? 2.7 : 1.35} toneMapped={false} /></mesh>
      {[-.48, .48].flatMap((x) => [-.43, .43].map((z) => (
        <mesh key={`${x}_${z}`} position={[x, .05, z]} rotation={[0, Math.PI / 2, 0]} castShadow>
          <torusGeometry args={[.2, .075, 8, 18]} />
          <meshStandardMaterial color="#172230" metalness={.72} roughness={.42} />
        </mesh>
      )))}
      <group ref={antenna} position={[.32, .98, -.16]}>
        <mesh position={[0, .16, 0]}><cylinderGeometry args={[.025, .035, .42, 7]} /><meshStandardMaterial color="#9fb4c1" metalness={.82} roughness={.22} /></mesh>
        <mesh position={[0, .39, 0]} rotation={[0, 0, -.5]}><coneGeometry args={[.2, .12, 18, 1, true]} /><meshStandardMaterial color="#d7eaf0" emissive={statusColor} emissiveIntensity={isActive ? .8 : .15} metalness={.6} roughness={.24} side={THREE.DoubleSide} /></mesh>
        <mesh position={[0, .48, 0]}><sphereGeometry args={[.075, 10, 8]} /><meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={isActive || isReady ? 3 : 1.4} toneMapped={false} /></mesh>
      </group>
      <group ref={activeSignal} position={[.32, 1.34, -.16]} visible={isActive}>
        {[.22, .36, .5].map((radius) => (
          <mesh key={radius} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[radius, radius + .035, 28]} />
            <meshBasicMaterial color={statusColor} transparent opacity={.42} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
      <mesh ref={readyRing} position={[0, -.16, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={isReady}>
        <ringGeometry args={[.88, 1.08, 36]} />
        <meshBasicMaterial color={statusColor} transparent opacity={.72} depthWrite={false} />
      </mesh>
      {isReady && <Sparkles count={12} scale={[2.1, 1.7, 2.1]} position={[0, .7, 0]} color={statusColor} size={1.5} speed={.32} />}
      <pointLight position={[0, .75, .55]} color={statusColor} intensity={isReady ? 1.25 : isActive ? .8 : .25} distance={4} />
    </group>
  )
}

function BiomeProp({ kind, position, scale = 1, palette, index }) {
  if (kind === 'forest') return <group position={position} rotation={[0, index * .63, 0]}><RoundedLumenTree scale={scale * .8} color={index % 2 ? '#58bf79' : '#6bd78f'} /></group>
  if (kind === 'ocean') {
    return (
      <group position={position} scale={scale} rotation={[0, index * .55, 0]}>
        <mesh position={[0, .08, 0]} scale={[1.15, .45, .9]}><dodecahedronGeometry args={[.74, 0]} /><meshStandardMaterial color="#244d63" roughness={.92} /></mesh>
        {[-.46, -.12, .28, .55].map((x, i) => <group key={x} position={[x, .25, i % 2 ? -.08 : .1]} rotation={[0, i * .8, i % 2 ? .12 : -.16]}><mesh position={[0, .42, 0]} castShadow><cylinderGeometry args={[.1 + i * .012, .16, .82 + i * .14, 8]} /><meshStandardMaterial color={i % 2 ? '#5cd3b0' : '#7e83da'} emissive={i % 2 ? '#145746' : '#2e3167'} emissiveIntensity={.38} roughness={.68} /></mesh><mesh position={[0, .9 + i * .06, 0]} scale={[.7, 1, .7]}><icosahedronGeometry args={[.25 + i * .025, 1]} /><meshStandardMaterial color={i % 2 ? '#8ce8c6' : '#bc95ef'} emissive={i % 2 ? '#1c6650' : '#54317e'} emissiveIntensity={.45} roughness={.55} /></mesh></group>)}
        {[[-.68, .25], [.66, -.28], [.12, .5]].map(([x, z], i) => <mesh key={`${x}_${z}`} position={[x, .25, z]} rotation={[-Math.PI / 2, 0, i * .7]}><torusGeometry args={[.14 + i * .025, .045, 7, 16]} /><meshStandardMaterial color={i % 2 ? '#ffbb9e' : '#8de9ee'} emissive={i % 2 ? '#8d4634' : '#276f73'} emissiveIntensity={.38} roughness={.5} /></mesh>)}
      </group>
    )
  }
  if (kind === 'crystal') return <group position={position} rotation={[0, index * .4, 0]}><CrystalCluster color={index % 2 ? '#ce8eff' : '#78e5ff'} scale={scale * .8} /></group>
  if (kind === 'desert') {
    return (
      <group position={position} scale={scale} rotation={[0, index * .77, 0]}>
        <mesh position={[0, .72, 0]} rotation={[0, 0, 0]} castShadow><torusGeometry args={[.62, .18, 8, 24, Math.PI]} /><meshStandardMaterial color="#bd7c4c" roughness={.96} /></mesh>
        {[-.62, .62].map((x) => <mesh key={x} position={[x, .42, 0]} scale={[.78, 1.25, .88]} castShadow><dodecahedronGeometry args={[.36, 0]} /><meshStandardMaterial color={x < 0 ? '#9e603f' : '#c58651'} roughness={.98} /></mesh>)}
        <mesh position={[.05, 1.37, 0]} scale={[1.25, .45, .7]} rotation={[0, 0, -.08]} castShadow><dodecahedronGeometry args={[.38, 0]} /><meshStandardMaterial color="#d39a5f" roughness={.94} /></mesh>
        {[[-.85, -.25, .24], [.78, .32, .2], [.25, -.48, .17]].map(([x, z, size]) => <mesh key={`${x}_${z}`} position={[x, size * .55, z]} scale={[1.35, .65, 1]}><dodecahedronGeometry args={[size, 0]} /><meshStandardMaterial color="#7e5140" roughness={1} /></mesh>)}
      </group>
    )
  }
  if (kind === 'mechanical') {
    return (
      <group position={position} scale={scale} rotation={[0, index * .48, 0]}>
        <mesh position={[0, .1, 0]}><cylinderGeometry args={[.68, .82, .2, 12]} /><meshStandardMaterial color="#344854" metalness={.76} roughness={.35} /></mesh>
        <mesh position={[0, .78, 0]} castShadow><cylinderGeometry args={[.28, .46, 1.38, 10]} /><meshStandardMaterial color="#5c737d" metalness={.84} roughness={.26} /></mesh>
        {[.38, .7, 1.02].map((y) => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.37, .055, 7, 20]} /><meshStandardMaterial color="#8198a0" metalness={.9} roughness={.18} /></mesh>)}
        <mesh position={[0, 1.53, 0]} castShadow><cylinderGeometry args={[.48, .33, .34, 10]} /><meshStandardMaterial color="#465d69" metalness={.82} roughness={.26} /></mesh>
        {[0, Math.PI * .5, Math.PI, Math.PI * 1.5].map((angle) => <mesh key={angle} position={[Math.sin(angle) * .43, 1.52, Math.cos(angle) * .43]} rotation={[0, angle, 0]}><boxGeometry args={[.18, .12, .08]} /><meshStandardMaterial color={palette.glow} emissive={palette.glow} emissiveIntensity={1.35} toneMapped={false} /></mesh>)}
        <group position={[.46, .66, 0]}><mesh position={[.18, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.075, .075, .42, 8]} /><meshStandardMaterial color="#9cb1b7" metalness={.9} roughness={.18} /></mesh><mesh position={[.39, -.2, 0]}><cylinderGeometry args={[.075, .075, .42, 8]} /><meshStandardMaterial color="#9cb1b7" metalness={.9} roughness={.18} /></mesh></group>
        <mesh position={[0, 1.82, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[.3, .055, 8, 24]} /><meshStandardMaterial color={palette.glow} emissive={palette.glow} emissiveIntensity={1.15} metalness={.7} /></mesh>
      </group>
    )
  }
  return (
    <group position={position} scale={scale} rotation={[0, index * .5, 0]}>
      <mesh position={[0, .12, 0]} scale={[1.3, .45, 1]}><dodecahedronGeometry args={[.72, 0]} /><meshStandardMaterial color="#5e91aa" roughness={.76} /></mesh>
      {[[-.5, .66, .05, .66, -.12], [0, .98, 0, .98, .05], [.52, .58, -.02, .6, .16]].map(([x, y, z, size, tilt], i) => <mesh key={i} position={[x, y, z]} rotation={[tilt, i * .4, tilt]} scale={[.72, 1.35, .72]} castShadow><octahedronGeometry args={[size, 0]} /><meshPhysicalMaterial color={i === 1 ? '#d9fbff' : '#9ee5f5'} transparent opacity={.78} roughness={.1} metalness={.18} transmission={.04} /></mesh>)}
      <mesh position={[0, .42, .42]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.58, .065, 7, 24, Math.PI]} /><meshStandardMaterial color="#bdeeff" emissive="#5aaecb" emissiveIntensity={.52} metalness={.35} roughness={.25} /></mesh>
      {[[-.7, .18], [.72, -.12]].map(([x, z]) => <mesh key={x} position={[x, .23, z]} rotation={[0, 0, x < 0 ? -.25 : .25]}><coneGeometry args={[.16, .62, 6]} /><meshPhysicalMaterial color="#c9f7ff" transparent opacity={.76} roughness={.12} /></mesh>)}
    </group>
  )
}

function Creature({ position, color, index = 0 }) {
  const group = useRef()
  const groundY = terrainHeight(position[0], position[2]) + position[1]
  useFrame((state) => {
    if (!group.current) return
    group.current.position.y = groundY + Math.sin(state.clock.elapsedTime * 1.4 + index) * .08
    group.current.rotation.y = Math.sin(state.clock.elapsedTime * .32 + index) * .35 + index
  })
  return (
    <group ref={group} position={[position[0], groundY, position[2]]}>
      <mesh position={[0, .38, 0]} scale={[.75, .62, .9]} castShadow><sphereGeometry args={[.62, 18, 12]} /><meshStandardMaterial color={color} roughness={.58} /></mesh>
      <mesh position={[0, .65, .45]} scale={[.68, .6, .65]} castShadow><sphereGeometry args={[.5, 16, 10]} /><meshStandardMaterial color={color} roughness={.55} /></mesh>
      {[-.2, .2].map((x) => <mesh key={x} position={[x, .72, .84]}><sphereGeometry args={[.055, 9, 7]} /><meshStandardMaterial color="#10202b" roughness={.25} /></mesh>)}
      {[-.34, .34].map((x) => <mesh key={x} position={[x, .98, .44]} rotation={[0, 0, x < 0 ? .45 : -.45]}><coneGeometry args={[.17, .45, 8]} /><meshStandardMaterial color={color} roughness={.6} /></mesh>)}
      <mesh position={[0, .53, .91]}><sphereGeometry args={[.07, 8, 6]} /><meshStandardMaterial color="#ec90a7" /></mesh>
    </group>
  )
}

function LumiGuide({ palette }) {
  const group = useRef()
  const groundY = terrainHeight(GUIDE_NODE.position[0], GUIDE_NODE.position[2])
  useFrame((state) => {
    if (!group.current) return
    group.current.position.y = groundY + 1.2 + Math.sin(state.clock.elapsedTime * 1.8) * .12
    group.current.rotation.y = Math.sin(state.clock.elapsedTime * .7) * .18
  })
  return (
    <group ref={group} position={[1.5, groundY + 1.2, 4.4]}>
      <mesh castShadow><sphereGeometry args={[.42, 18, 12]} /><meshStandardMaterial color="#e9f8fa" metalness={.45} roughness={.28} /></mesh>
      <mesh position={[0, .01, .36]} scale={[.72, .43, .18]}><sphereGeometry args={[.38, 16, 10]} /><meshStandardMaterial color="#152d42" metalness={.65} roughness={.18} /></mesh>
      {[-.14, .14].map((x) => <mesh key={x} position={[x, .04, .51]}><sphereGeometry args={[.045, 8, 6]} /><meshStandardMaterial color={palette.accent} emissive={palette.glow} emissiveIntensity={2.5} /></mesh>)}
      <mesh position={[0, .55, 0]}><cylinderGeometry args={[.025, .025, .35, 6]} /><meshStandardMaterial color="#9cb1bd" metalness={.8} /></mesh>
      <mesh position={[0, .75, 0]}><sphereGeometry args={[.08, 9, 7]} /><meshStandardMaterial color={palette.glow} emissive={palette.glow} emissiveIntensity={2} /></mesh>
      <mesh position={[0, -.12, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.55, .62, 28]} /><meshBasicMaterial color={palette.glow} transparent opacity={.45} depthWrite={false} /></mesh>
      <pointLight position={[0, .05, .45]} color={palette.glow} intensity={.65} distance={3} />
    </group>
  )
}

function ResourceHalo({ color }) {
  const ring = useRef()
  useFrame((state) => {
    if (!ring.current) return
    const scale = 1 + Math.sin(state.clock.elapsedTime * 2.4) * .08
    ring.current.scale.setScalar(scale)
    ring.current.material.opacity = .35 + Math.sin(state.clock.elapsedTime * 2.4) * .12
  })
  return <mesh ref={ring} position={[0, .06, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.75, .92, 28]} /><meshBasicMaterial color={color} transparent opacity={.45} depthWrite={false} /></mesh>
}

function ResourceNode({ node, palette }) {
  const [x, , z] = node.position
  const y = terrainHeight(x, z)
  if (node.actionId === 'crystal') return <group position={[x, y, z]}><CrystalCluster color={palette.glow} /><ResourceHalo color={palette.glow} /></group>
  if (node.actionId === 'fiber') return <group position={[x, y, z]}><RoundedLumenTree scale={.72} color={palette.glow} /><Sparkles count={8} scale={[2, 2.5, 2]} color={palette.particle} size={1.5} speed={.25} /><ResourceHalo color="#7cf2bd" /></group>
  if (node.actionId === 'salvage') return <group position={[x, y, z]} rotation={[0, .6, -.12]}><mesh position={[0, .45, 0]} castShadow><dodecahedronGeometry args={[.82, 0]} /><meshStandardMaterial color="#56677a" metalness={.85} roughness={.3} /></mesh><mesh position={[.2, .5, .62]}><boxGeometry args={[.9, .16, .1]} /><meshStandardMaterial color="#ffb167" emissive="#a34819" emissiveIntensity={1.2} /></mesh><ResourceHalo color="#ffb167" /></group>
  if (node.actionId === 'beacon') {
    if (node.completed) return (
      <group position={[x, y, z]}>
        <mesh position={[0, .85, 0]} castShadow><cylinderGeometry args={[.14, .3, 1.7, 9]} /><meshStandardMaterial color="#7896a2" metalness={.82} roughness={.22} /></mesh>
        <Float speed={1.25} floatIntensity={.08}>
          <mesh position={[0, 1.78, 0]}><sphereGeometry args={[.25, 16, 12]} /><meshStandardMaterial color="#c9fff0" emissive="#49e7b1" emissiveIntensity={3.2} toneMapped={false} /></mesh>
          {[.48, .72].map((radius, index) => <mesh key={radius} position={[0, 1.78, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[radius, .025, 6, 30]} /><meshBasicMaterial color="#7cf2bd" transparent opacity={.72 - index * .2} toneMapped={false} /></mesh>)}
        </Float>
        <pointLight position={[0, 1.78, 0]} color="#7cf2bd" intensity={1.4} distance={5} />
        <ResourceHalo color="#7cf2bd" />
      </group>
    )
    return <group position={[x, y, z]}><mesh position={[0, .8, 0]} rotation={[0, 0, .18]} castShadow><cylinderGeometry args={[.14, .3, 1.7, 9]} /><meshStandardMaterial color="#71859a" metalness={.78} /></mesh><Float speed={1.6} floatIntensity={.14}><mesh position={[0, 1.75, 0]}><sphereGeometry args={[.24, 12, 9]} /><meshStandardMaterial color="#ff8279" emissive="#ff312b" emissiveIntensity={2.4} toneMapped={false} /></mesh></Float><ResourceHalo color="#ff8279" /></group>
  }
  return <group position={[x, y, z]}><mesh position={[0, .04, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[1.12, 24]} /><meshStandardMaterial color="#76583d" roughness={1} /></mesh><group position={[0, .2, 0]}><RoundedLumenTree scale={.28} color="#82e99c" /></group><ResourceHalo color="#8df2a7" /></group>
}

function DailyEventMarker({ node, playerPosition }) {
  const marker = useRef()
  const beam = useRef()
  const visual = useMemo(() => resolveDailyEventVisual(node.dailyEvent), [node.dailyEvent])
  const [x, , z] = node.position
  const y = terrainHeight(x, z)

  const isInRange = Boolean(playerPosition
    && Math.hypot(playerPosition.x - x, playerPosition.z - z) <= DAILY_EVENT_INTERACTION_RADIUS)

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime
    if (marker.current) {
      marker.current.rotation.y = elapsed * .38
      marker.current.position.y = Math.sin(elapsed * 1.45) * .035
    }
    if (beam.current) beam.current.material.opacity = .18 + Math.sin(elapsed * 2.2) * .07
  })

  return (
    <group position={[x, y, z]}>
      {/* 3D 상공 사건 현장 핀 태그 오버레이 */}
      <Html position={[0, 4.35, 0]} center zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
        <div className={`frontier-event-pin-tag${isInRange ? ' in-range' : ''}`}>
          <i className="frontier-event-pin-icon">✦</i>
          <span className="frontier-event-pin-title">{node.label || '사건 현장'}</span>
          <span className="frontier-event-pin-dist">{isInRange ? '도착' : '목표 위치'}</span>
        </div>
      </Html>

      <group ref={marker}>
        {/* 수직 높은 황금 빛 기둥 */}
        <mesh ref={beam} position={[0, 4.2, 0]}>
          <cylinderGeometry args={[.18, .98, 8.4, 24, 1, true]} />
          <meshBasicMaterial color={visual.color} transparent opacity={.22} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
        <mesh position={[0, .08, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.25, .065, 8, 48]} />
          <meshBasicMaterial color={visual.color} transparent opacity={.9} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh position={[0, .13, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.6, .022, 6, 48]} />
          <meshBasicMaterial color={visual.glow} transparent opacity={.55} depthWrite={false} toneMapped={false} />
        </mesh>
        {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle) => (
          <mesh key={angle} position={[Math.cos(angle) * 1.35, .2, Math.sin(angle) * 1.35]} rotation={[0, -angle, Math.PI / 4]}>
            <octahedronGeometry args={[.11, 0]} />
            <meshBasicMaterial color={visual.glow} toneMapped={false} />
          </mesh>
        ))}
        <Float speed={1.8} floatIntensity={.25} rotationIntensity={.22}>
          <mesh position={[0, 2.2, 0]} rotation={[0, Math.PI / 4, 0]}>
            <octahedronGeometry args={[.34, 0]} />
            <meshStandardMaterial color={visual.glow} emissive={visual.color} emissiveIntensity={2.8} metalness={.25} roughness={.18} toneMapped={false} />
          </mesh>
        </Float>
        <Sparkles count={22} scale={[2.8, 5.2, 2.8]} position={[0, 2.2, 0]} color={visual.glow} size={2.2} speed={.45} noise={.8} />
        <pointLight position={[0, 2.2, 0]} color={visual.color} intensity={.8} distance={5.5} />
      </group>
    </group>
  )
}

function MissionPortal({ portal, active }) {
  const color = portal.route === 'nebula' ? '#b08cff' : portal.route === 'comet' ? '#ff9a5c' : '#68e9ff'
  const portalY = terrainHeight(portal.position[0], portal.position[2]) + .72
  return (
    <group position={[portal.position[0], portalY, portal.position[2]]}>
      <mesh position={[0, 2.4, 0]}>
        <cylinderGeometry args={[.16, .72, 4.8, 20, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={.1} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh position={[0, -.44, 0]} castShadow><cylinderGeometry args={[.85, 1.05, .5, 16]} /><meshStandardMaterial color="#293950" metalness={.7} roughness={.3} /></mesh>
      {[-1.15, 1.15].map((x) => <mesh key={x} position={[x, .65, 0]} castShadow><boxGeometry args={[.32, 2.1, .55]} /><meshStandardMaterial color="#42546e" metalness={.67} roughness={.3} /></mesh>)}
      <Float speed={1.1} floatIntensity={.12}>
        <mesh><torusGeometry args={[1.05, .14, 10, 36]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 2.7 : 1.1} metalness={.62} roughness={.2} /></mesh>
        <mesh><circleGeometry args={[.83, 32]} /><meshBasicMaterial color={color} transparent opacity={active ? .3 : .1} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      </Float>
      <Sparkles count={12} scale={[2.4, 2.4, .8]} color={color} size={1.6} speed={.28} />
      <ResourceHalo color={color} />
    </group>
  )
}

function DistantWorlds({ palette }) {
  return (
    <group>
      <mesh position={[-30, 17, -42]}><sphereGeometry args={[7, 32, 20]} /><meshStandardMaterial color={palette.groundDeep} roughness={.85} /></mesh>
      <mesh position={[-30, 17, -42]} rotation={[1.05, 0, .3]}><torusGeometry args={[10, .12, 8, 64]} /><meshBasicMaterial color={palette.accent} transparent opacity={.24} /></mesh>
      <mesh position={[36, 11, -48]}><sphereGeometry args={[4.2, 28, 18]} /><meshStandardMaterial color="#5a4b86" roughness={.86} /></mesh>
      <mesh position={[8, 28, -58]}><sphereGeometry args={[2.1, 20, 14]} /><meshStandardMaterial color="#a6785d" roughness={.9} /></mesh>
    </group>
  )
}

function PlayerNameTag({ displayName, speech }) {
  return (
    <Html position={[0, 3.08, 0]} center distanceFactor={8.5} zIndexRange={[80, 0]} style={{ pointerEvents: 'none' }}>
      <div className="frontier-player-label">
        {speech?.text && <p>{speech.text}</p>}
        <span>{displayName || '탐사원'}</span>
      </div>
    </Html>
  )
}

function RemoteAstronaut({ player, showName, walkHeightAt = walkSurfaceHeight }) {
  const group = useRef()
  const playerX = Number(player.x || 0)
  const playerZ = Number(player.z || 0)
  const playerScale = THREE.MathUtils.clamp(
    Number(player.scale) || CHARACTER_SCALE,
    CHARACTER_MIN_SCALE,
    CHARACTER_MAX_SCALE,
  )
  const playerY = player.y !== null && player.y !== undefined && Number.isFinite(Number(player.y))
    ? Number(player.y)
    : walkHeightAt(playerX, playerZ, null, playerScale)
  useFrame((_, delta) => {
    if (!group.current) return
    const smoothing = 1 - Math.exp(-Math.min(delta, .05) * 11)
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, playerX, smoothing)
    group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, playerZ, smoothing)
    group.current.position.y = THREE.MathUtils.lerp(
      group.current.position.y,
      playerY,
      smoothing,
    )
    group.current.scale.setScalar(THREE.MathUtils.lerp(group.current.scale.x, playerScale, smoothing))
    const yawDelta = Math.atan2(
      Math.sin(Number(player.yaw || 0) - group.current.rotation.y),
      Math.cos(Number(player.yaw || 0) - group.current.rotation.y),
    )
    group.current.rotation.y += yawDelta * smoothing
  })

  return (
    <group ref={group} position={[playerX, playerY, playerZ]} rotation={[0, Number(player.yaw || 0), 0]} scale={playerScale}>
      <mesh position={[0, 1.2, 0]} scale={[.92, 1, .8]} castShadow><capsuleGeometry args={[.39, .72, 8, 14]} /><meshStandardMaterial color="#dcecf4" roughness={.36} metalness={.1} /></mesh>
      <mesh position={[0, 1.18, .35]}><boxGeometry args={[.5, .42, .08]} /><meshStandardMaterial color="#30445f" metalness={.5} roughness={.25} /></mesh>
      <mesh position={[0, 1.18, .405]}><boxGeometry args={[.28, .08, .035]} /><meshStandardMaterial color="#c59aff" emissive="#6946a3" emissiveIntensity={1.7} toneMapped={false} /></mesh>
      <mesh position={[0, 2, 0]} castShadow><sphereGeometry args={[.53, 24, 18]} /><meshStandardMaterial color="#edf6fa" metalness={.14} roughness={.24} /></mesh>
      <mesh position={[0, 1.98, .43]} scale={[1, .78, .4]}><sphereGeometry args={[.4, 22, 14]} /><meshPhysicalMaterial color="#9bdfff" transparent opacity={.7} metalness={.5} roughness={.05} clearcoat={.7} /></mesh>
      <mesh position={[0, 1.22, -.4]} castShadow><boxGeometry args={[.7, .86, .34]} /><meshStandardMaterial color="#574d78" metalness={.58} roughness={.28} /></mesh>
      {[-.5, .5].map((x) => <mesh key={`arm-${x}`} position={[x, 1.18, 0]} rotation={[0, 0, x < 0 ? -.14 : .14]} castShadow><capsuleGeometry args={[.12, .48, 6, 10]} /><meshStandardMaterial color="#d6e7ed" roughness={.4} /></mesh>)}
      {[-.25, .25].map((x) => <mesh key={`leg-${x}`} position={[x, .32, 0]} castShadow><capsuleGeometry args={[.14, .42, 6, 10]} /><meshStandardMaterial color="#cedfe6" roughness={.42} /></mesh>)}
      <mesh position={[0, .025, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[.56, 24]} /><meshBasicMaterial color="#000" transparent opacity={.2} depthWrite={false} /></mesh>
      {showName && <PlayerNameTag displayName={player.displayName} speech={player.speech} />}
    </group>
  )
}

function Astronaut({ inputRef, interactables, blockers, structureColliders = [], pickups, paused, freeLookEnabled, builderOverview = false, builderBuildMode = false, canUseCharacterScale = null, onScaleBlocked = null, onNearbyChange, onCollect, onPositionChange, displayName, showName, speech, isFirstPerson, theme = 'forest', walkHeightAt = walkSurfaceHeight, playerGroupRef }) {
  const { gl } = useThree()
  const group = useRef()
  // 외부(상위 월드)에서 플레이어 위치를 ref로 읽을 수 있도록 노출. 매 프레임 갱신.
  useLayoutEffect(() => {
    if (playerGroupRef) playerGroupRef.current = group.current
  })
  const body = useRef()
  const leftArm = useRef()
  const rightArm = useRef()
  const leftLeg = useRef()
  const rightLeg = useRef()
  const controls = useRef()
  const controlsReady = useRef(false)
  const keys = useRef(new Set())
  const characterScale = useRef(CHARACTER_SCALE)
  const groundHeight = useRef(null)
  const jump = useRef({ height: 0, velocity: 0, requested: false })
  const nearbySignature = useRef('')
  const collectLock = useRef(new Set())
  const lastPublishAt = useRef(0)
  const lastListenerUpdateAt = useRef(0)
  const stepDistance = useRef(0)
  const collisionLatched = useRef(false)
  const collisionClearDuration = useRef(0)
  const hoverLook = useRef({ pendingX: 0, pendingY: 0, lastX: null, lastY: null, lastTime: null, orbiting: false })
  const firstPersonPitch = useRef(0)
  const firstPersonYawOffset = useRef(0)
  const movementIntent = useRef(createMovementIntent())
  const movementVectors = useRef({
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    moveDirection: new THREE.Vector3(),
    desiredTarget: new THREE.Vector3(),
    followDelta: new THREE.Vector3(),
    cameraOffset: new THREE.Vector3(),
    cameraSpherical: new THREE.Spherical(),
    listenerForward: new THREE.Vector3(),
    listenerUp: new THREE.Vector3(),
  })

  const resetFreeLook = useCallback(() => {
    hoverLook.current.pendingX = 0
    hoverLook.current.pendingY = 0
    hoverLook.current.lastX = null
    hoverLook.current.lastY = null
    hoverLook.current.lastTime = null
  }, [])

  useEffect(() => {
    const resetInput = () => {
      keys.current.clear()
      inputRef.current.x = 0
      inputRef.current.z = 0
      jump.current.requested = false
      movementIntent.current.active = false
    }
    const isTextInput = (target) => {
      const tag = target?.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable
    }
    const mapKey = (e) => {
      const code = e.code || ''
      const key = (e.key || '').toLowerCase()
      if (code === 'KeyW' || code === 'ArrowUp' || key === 'arrowup' || key === 'w' || key === 'ㅈ') return 'UP'
      if (code === 'KeyS' || code === 'ArrowDown' || key === 'arrowdown' || key === 's' || key === 'ㄴ') return 'DOWN'
      if (code === 'KeyA' || code === 'ArrowLeft' || key === 'arrowleft' || key === 'a' || key === 'ㅁ') return 'LEFT'
      if (code === 'KeyD' || code === 'ArrowRight' || key === 'arrowright' || key === 'd' || key === 'ㅇ') return 'RIGHT'
      return null
    }

    const down = (event) => {
      if (paused || isTextInput(event.target)) return
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
        keys.current.add('SPRINT')
        return
      }
      if (event.code === 'Space') {
        event.preventDefault()
        if (!event.repeat) jump.current.requested = true
        return
      }
      const isScaleUp = event.code === 'Equal' || event.code === 'NumpadAdd' || event.key === '+'
      const isScaleDown = event.code === 'Minus' || event.code === 'NumpadSubtract' || event.key === '-'
      if (!event.ctrlKey && !event.metaKey && (isScaleUp || isScaleDown)) {
        event.preventDefault()
        if (!event.repeat) {
          const nextScale = THREE.MathUtils.clamp(
            characterScale.current + (isScaleUp ? CHARACTER_SCALE_STEP : -CHARACTER_SCALE_STEP),
            CHARACTER_MIN_SCALE,
            CHARACTER_MAX_SCALE,
          )
          if (
            nextScale > characterScale.current
            && group.current
            && canUseCharacterScale
            && !canUseCharacterScale(nextScale, group.current.position)
          ) {
            onScaleBlocked?.()
          } else {
            characterScale.current = nextScale
          }
        }
        return
      }
      const dir = mapKey(event)
      if (dir) {
        event.preventDefault()
        keys.current.add(dir)
      }
    }
    const up = (event) => {
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
        keys.current.delete('SPRINT')
      }
      const dir = mapKey(event)
      if (dir) keys.current.delete(dir)
    }
    const visibility = () => { if (document.hidden) resetInput() }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', resetInput)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', resetInput)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [canUseCharacterScale, inputRef, onScaleBlocked, paused])

  const firstPersonFov = useRef(FIRST_PERSON_DEFAULT_FOV)

  useEffect(() => {
    firstPersonYawOffset.current = 0
  }, [isFirstPerson])

  useEffect(() => {
    const handleWheel = (event) => {
      if (paused || !isFirstPerson) return
      firstPersonFov.current = THREE.MathUtils.clamp(firstPersonFov.current + event.deltaY * 0.06, 22, 100)
    }
    window.addEventListener('wheel', handleWheel, { passive: true })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [isFirstPerson, paused])

  useEffect(() => {
    if (!paused) return
    keys.current.clear()
    inputRef.current.x = 0
    inputRef.current.z = 0
    jump.current.requested = false
    movementIntent.current.active = false
  }, [inputRef, paused])

  useEffect(() => {
    const canvas = gl.domElement
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const isBuilderViewDrag = (event) => !builderBuildMode || isAstraBuilderViewDrag(event.buttons)
    const updateHoverLook = (event) => {
      const look = hoverLook.current
      if (
        paused
        || !freeLookEnabled
        || reducedMotion.matches
        || look.orbiting
        || !isBuilderViewDrag(event)
        || (event.target !== canvas && !event.target?.classList?.contains('webgl-canvas'))
      ) {
        resetFreeLook()
        return
      }
      if (look.lastX !== null && look.lastY !== null) {
        const deltaX = event.clientX - look.lastX
        const deltaY = event.clientY - look.lastY
        const eventGap = look.lastTime === null ? 0 : event.timeStamp - look.lastTime
        const resumedWithPointerJump = eventGap > MOUSE_LOOK_REENTRY_GAP_MS
          && Math.hypot(deltaX, deltaY) > MOUSE_LOOK_REENTRY_DISTANCE
        if (!resumedWithPointerJump) {
          look.pendingX += THREE.MathUtils.clamp(deltaX, -MOUSE_LOOK_MAX_FRAME_DELTA, MOUSE_LOOK_MAX_FRAME_DELTA)
          look.pendingY += THREE.MathUtils.clamp(deltaY, -MOUSE_LOOK_MAX_FRAME_DELTA, MOUSE_LOOK_MAX_FRAME_DELTA)
        }
      }
      look.lastX = event.clientX
      look.lastY = event.clientY
      look.lastTime = event.timeStamp
    }
    const startViewDrag = (event) => {
      resetFreeLook()
      if (!builderBuildMode || !isAstraBuilderViewPointer(event)) return
      canvas.classList.add('astra-builder-view-dragging')
    }
    const stopViewDrag = () => {
      canvas.classList.remove('astra-builder-view-dragging')
      resetFreeLook()
    }
    const preventBuilderContextMenu = (event) => {
      if (builderBuildMode) event.preventDefault()
    }
    const resetWhenHidden = () => { if (document.hidden) stopViewDrag() }

    window.addEventListener('pointermove', updateHoverLook, { passive: true })
    window.addEventListener('pointerup', stopViewDrag)
    window.addEventListener('pointercancel', stopViewDrag)
    window.addEventListener('blur', stopViewDrag)
    canvas.addEventListener('pointerleave', stopViewDrag)
    canvas.addEventListener('pointerdown', startViewDrag)
    canvas.addEventListener('contextmenu', preventBuilderContextMenu)
    document.addEventListener('visibilitychange', resetWhenHidden)
    return () => {
      window.removeEventListener('pointermove', updateHoverLook)
      window.removeEventListener('pointerup', stopViewDrag)
      window.removeEventListener('pointercancel', stopViewDrag)
      window.removeEventListener('blur', stopViewDrag)
      canvas.removeEventListener('pointerleave', stopViewDrag)
      canvas.removeEventListener('pointerdown', startViewDrag)
      canvas.removeEventListener('contextmenu', preventBuilderContextMenu)
      document.removeEventListener('visibilitychange', resetWhenHidden)
      canvas.classList.remove('astra-builder-view-dragging')
    }
  }, [builderBuildMode, freeLookEnabled, gl, paused, resetFreeLook])

  useFrame((state, frameDelta) => {
    if (!group.current) return
    const delta = Math.min(frameDelta, .05)
    const orbitCamera = controls.current?.object
    const {
      forward,
      right,
      moveDirection,
      desiredTarget,
      followDelta,
      cameraOffset,
      cameraSpherical,
      listenerForward,
      listenerUp,
    } = movementVectors.current
    const look = hoverLook.current
    const canFreeLook = Boolean(orbitCamera && controls.current && freeLookEnabled && !paused && !look.orbiting)
    const mouseDeltaX = canFreeLook ? THREE.MathUtils.clamp(look.pendingX, -MOUSE_LOOK_MAX_FRAME_DELTA, MOUSE_LOOK_MAX_FRAME_DELTA) : 0
    const mouseDeltaY = canFreeLook ? THREE.MathUtils.clamp(look.pendingY, -MOUSE_LOOK_MAX_FRAME_DELTA, MOUSE_LOOK_MAX_FRAME_DELTA) : 0
    const manualLookYaw = -mouseDeltaX * MOUSE_LOOK_YAW_SENSITIVITY
    look.pendingX -= mouseDeltaX
    look.pendingY -= mouseDeltaY

    if (canFreeLook && (mouseDeltaX || mouseDeltaY)) {
      if (isFirstPerson) {
        // [1인칭 시점] 정면 기준 좌우 180도(±90도 = ±π/2) 회전 범위 제한 및 상하 pitch 제한
        firstPersonYawOffset.current = THREE.MathUtils.clamp(
          firstPersonYawOffset.current + manualLookYaw,
          -Math.PI / 2,
          Math.PI / 2,
        )
        firstPersonPitch.current = THREE.MathUtils.clamp(
          firstPersonPitch.current - mouseDeltaY * MOUSE_LOOK_PITCH_SENSITIVITY,
          -1.2,
          1.2,
        )
      } else {
        // [3인칭 시점] 제한 없이 360도 전방위 완전 자유 회전 지원
        cameraOffset.subVectors(orbitCamera.position, controls.current.target)
        cameraSpherical.setFromVector3(cameraOffset)
        cameraSpherical.theta += manualLookYaw
        cameraSpherical.phi = THREE.MathUtils.clamp(
          cameraSpherical.phi - mouseDeltaY * MOUSE_LOOK_PITCH_SENSITIVITY,
          CAMERA_MIN_POLAR,
          CAMERA_MAX_POLAR,
        )
        cameraSpherical.makeSafe()
        orbitCamera.position.copy(controls.current.target).add(cameraOffset.setFromSpherical(cameraSpherical))
        orbitCamera.lookAt(controls.current.target)
      }
    }

    const keyboardX = paused ? 0 : (keys.current.has('RIGHT') ? 1 : 0) - (keys.current.has('LEFT') ? 1 : 0)
    const keyboardZ = paused ? 0 : (keys.current.has('DOWN') ? 1 : 0) - (keys.current.has('UP') ? 1 : 0)
    const moveX = paused ? 0 : THREE.MathUtils.clamp(keyboardX + Number(inputRef.current.x || 0), -1, 1)
    const moveZ = paused ? 0 : THREE.MathUtils.clamp(keyboardZ + Number(inputRef.current.z || 0), -1, 1)
    const inputLength = Math.hypot(moveX, moveZ)
    const moving = inputLength > .05 && !look.orbiting
    const sprinting = moving && keys.current.has('SPRINT')
    let movementAmount = 0
    let movedDistance = 0

    // Compute `forward` and `right` as the direction the player should move.
    // In both modes `forward` is the horizontal direction the character FACES. The right-hand
    // vector is `forward × WORLD_UP` (NOT `up × forward` — the order matters: a×b = −(b×a)).
    // At yaw=0, forward=(0,0,1), so forward×up = (-1,0,0) which is screen-right (the camera
    // looks toward +Z, so its local +X/screen-right maps to world -X). This makes a positive
    // `moveX` (D / ▶ key) always move the character to screen-right in BOTH view modes.
    if (isFirstPerson) {
      forward.set(Math.sin(group.current.rotation.y), 0, Math.cos(group.current.rotation.y)).normalize()
    } else if (orbitCamera) {
      orbitCamera.getWorldDirection(forward)
      forward.setY(0)
      if (forward.lengthSq() < .0001) forward.set(Math.sin(group.current.rotation.y), 0, Math.cos(group.current.rotation.y))
      forward.normalize()
    }
    right.crossVectors(forward, WORLD_UP).normalize()

    if (moving) {
      moveDirection.copy(right).multiplyScalar(moveX).addScaledVector(forward, -moveZ)
      const inputStrength = Math.min(1, moveDirection.length())
      moveDirection.normalize()

      if (!isFirstPerson) {
        const targetFacingYaw = Math.atan2(forward.x, forward.z)
        const yawDelta = Math.atan2(Math.sin(targetFacingYaw - group.current.rotation.y), Math.cos(targetFacingYaw - group.current.rotation.y))
        group.current.rotation.y += yawDelta * Math.min(1, delta * 14)
      } else {
        // 1인칭 탐험 시 고개 회전을 몸체 방향으로 부드럽게 감쇠/흡수
        group.current.rotation.y += firstPersonYawOffset.current * Math.min(1, delta * 6)
        firstPersonYawOffset.current *= (1 - Math.min(1, delta * 6))
      }

      movementAmount = inputStrength
      const speed = PLAYER_WALK_SPEED * (sprinting ? PLAYER_SPRINT_MULTIPLIER : 1)
      const moveWorldVec = moveDirection.clone().multiplyScalar(speed * delta * movementAmount)

      const currX = group.current.position.x
      const currZ = group.current.position.z

      const checkObstacle = (testX, testZ, testFootY = group.current.position.y) => {
        const collisionScaleDelta = PLAYER_COLLISION_RADIUS * (characterScale.current / CHARACTER_SCALE - 1)
        if (Math.hypot(testX, testZ) >= WORLD_RADIUS - .8 - collisionScaleDelta) return true
        const hitStructure = structureColliders.find((collider) => {
          if (collider.kind === 'astra-builder-block') {
            return Boolean(findAstraBuilderBodyCollision([collider], {
              x: testX,
              z: testZ,
              footY: testFootY,
              scale: characterScale.current,
            }))
          }
          return Math.hypot(testX - collider.position[0], testZ - collider.position[2]) < collider.collisionRadius + collisionScaleDelta
        })
        if (hitStructure) return hitStructure
        if (blockers.some((position) => Math.hypot(testX - position[0], testZ - position[2]) < STATIC_BLOCKER_COLLISION_RADIUS + collisionScaleDelta)) return true
        if (isRiverWater(testX, testZ) && !isBridgeDeck(testX, testZ)) return true
        if (!isBridgeDeck(testX, testZ) && terrainSlope(testX, testZ) > 1.08) return true
        return false
      }

      const substepCount = Math.max(
        1,
        Math.ceil(moveWorldVec.length() / (ASTRA_BUILDER_POC_PLOT.cellSize * .28)),
      )
      const substepX = moveWorldVec.x / substepCount
      const substepZ = moveWorldVec.z / substepCount
      let obstacleHit = false
      let targetX = currX
      let targetZ = currZ
      let provisionalFootY = groundHeight.current ?? group.current.position.y

      for (let stepIndex = 0; stepIndex < substepCount; stepIndex += 1) {
        const desiredX = targetX + substepX
        const desiredZ = targetZ + substepZ
        const directHit = checkObstacle(desiredX, desiredZ, provisionalFootY)
        if (!directHit) {
          targetX = desiredX
          targetZ = desiredZ
        } else if (!checkObstacle(desiredX, targetZ, provisionalFootY)) {
          targetX = desiredX
        } else if (!checkObstacle(targetX, desiredZ, provisionalFootY)) {
          targetZ = desiredZ
        } else {
          obstacleHit = directHit
          break
        }
        provisionalFootY = walkHeightAt(
          targetX,
          targetZ,
          provisionalFootY,
          characterScale.current,
        )
      }

      movedDistance = Math.hypot(targetX - currX, targetZ - currZ)
      if (!obstacleHit || movedDistance > 0) {
        group.current.position.x = targetX
        group.current.position.z = targetZ
        if (collisionLatched.current) {
          collisionClearDuration.current += delta
          if (collisionClearDuration.current >= COLLISION_REARM_CLEAR_SECONDS) {
            collisionLatched.current = false
            collisionClearDuration.current = 0
          }
        }
      }
      if (obstacleHit) {
        const hitObj = typeof obstacleHit === 'object' ? obstacleHit : null
        if (hitObj && movedDistance <= 0) {
          const pushAngle = Math.atan2(currZ - hitObj.position[2], currX - hitObj.position[0])
          const pushDist = delta * 1.5
          const escapeX = currX + Math.cos(pushAngle) * pushDist
          const escapeZ = currZ + Math.sin(pushAngle) * pushDist
          if (!checkObstacle(escapeX, escapeZ)) {
            group.current.position.x = escapeX
            group.current.position.z = escapeZ
          }
        }
        if (!collisionLatched.current) {
          const acousticMat = hitObj?.acousticMaterial || 'soft'
          soundManager.play(`frontier.collision.${acousticMat}`)
          collisionLatched.current = true
          collisionClearDuration.current = 0
        } else if (collisionLatched.current) {
          collisionClearDuration.current = 0
        }
      }
    } else if (orbitCamera && !isFirstPerson) {
      const targetYaw = Math.atan2(forward.x, forward.z)
      const yawDelta = Math.atan2(Math.sin(targetYaw - group.current.rotation.y), Math.cos(targetYaw - group.current.rotation.y))
      group.current.rotation.y += yawDelta * (1 - Math.exp(-delta * 14))
    }
    if (!moving) {
      collisionLatched.current = false
      collisionClearDuration.current = 0
    }

    const locomoting = moving && movementAmount > .01
    const strideClock = state.clock.elapsedTime * (sprinting ? 16 : 10)
    const strideSign = moveZ > 0 ? -1 : 1
    const stride = locomoting ? Math.sin(strideClock) * .52 * strideSign : 0
    const strafeStep = locomoting ? Math.sin(strideClock) * 0.32 * moveX : 0
    const bodySway = locomoting ? Math.sin(strideClock) * 0.08 * moveX : 0

    if (body.current) {
      body.current.position.y = THREE.MathUtils.lerp(body.current.position.y, locomoting ? Math.abs(Math.sin(strideClock)) * .035 : 0, delta * 10)
      body.current.rotation.z = THREE.MathUtils.lerp(body.current.rotation.z, bodySway, delta * 10)
    }
    if (leftArm.current) {
      leftArm.current.rotation.x = THREE.MathUtils.lerp(leftArm.current.rotation.x, -stride, delta * 11)
      leftArm.current.rotation.z = THREE.MathUtils.lerp(leftArm.current.rotation.z, -.14 + strafeStep * 0.5, delta * 11)
    }
    if (rightArm.current) {
      rightArm.current.rotation.x = THREE.MathUtils.lerp(rightArm.current.rotation.x, stride, delta * 11)
      rightArm.current.rotation.z = THREE.MathUtils.lerp(rightArm.current.rotation.z, .14 + strafeStep * 0.5, delta * 11)
    }
    if (leftLeg.current) {
      leftLeg.current.rotation.x = THREE.MathUtils.lerp(leftLeg.current.rotation.x, stride * .72, delta * 11)
      leftLeg.current.rotation.z = THREE.MathUtils.lerp(leftLeg.current.rotation.z, strafeStep, delta * 11)
    }
    if (rightLeg.current) {
      rightLeg.current.rotation.x = THREE.MathUtils.lerp(rightLeg.current.rotation.x, -stride * .72, delta * 11)
      rightLeg.current.rotation.z = THREE.MathUtils.lerp(rightLeg.current.rotation.z, -strafeStep, delta * 11)
    }

    const surfaceY = walkHeightAt(
      group.current.position.x,
      group.current.position.z,
      groundHeight.current,
      characterScale.current,
    )
    groundHeight.current = groundHeight.current === null
      ? surfaceY
      : THREE.MathUtils.lerp(groundHeight.current, surfaceY, Math.min(1, delta * 9))
    if (!paused) {
      if (jump.current.requested && jump.current.height <= .001) {
        jump.current.velocity = PLAYER_JUMP_VELOCITY
      }
      jump.current.requested = false
      if (jump.current.height > 0 || jump.current.velocity > 0) {
        jump.current.velocity -= PLAYER_JUMP_GRAVITY * delta
        jump.current.height += jump.current.velocity * delta
        if (jump.current.height <= 0) {
          jump.current.height = 0
          jump.current.velocity = 0
        }
      }
    }
    group.current.position.y = groundHeight.current + jump.current.height
    group.current.scale.setScalar(characterScale.current)
    const player = group.current.position

    if (FRONTIER_AUDIO_ASSETS_READY && movedDistance > 0) {
      stepDistance.current += movedDistance
      if (stepDistance.current >= FOOTSTEP_STRIDE_DISTANCE) {
        stepDistance.current %= FOOTSTEP_STRIDE_DISTANCE
        const surface = getWalkSurface(player.x, player.z, theme)
        soundManager.play(getFrontierFootstepSoundId(surface))
      }
    }

    const activeCamera = state.camera
    if (isFirstPerson) {
      if (controls.current) controls.current.enabled = false
      const eyeY = player.y + 1.96 * characterScale.current
      const yaw = group.current.rotation.y + firstPersonYawOffset.current
      const pitch = firstPersonPitch.current
      const lookDist = 10.0

      activeCamera.near = FIRST_PERSON_CAMERA_NEAR
      activeCamera.fov = THREE.MathUtils.lerp(activeCamera.fov, firstPersonFov.current, delta * 12)
      activeCamera.updateProjectionMatrix()
      activeCamera.position.set(player.x, eyeY, player.z)
      activeCamera.lookAt(
        player.x + Math.sin(yaw) * Math.cos(pitch) * lookDist,
        eyeY + Math.sin(pitch) * lookDist,
        player.z + Math.cos(yaw) * Math.cos(pitch) * lookDist
      )
    } else {
      if (controls.current) controls.current.enabled = !paused
      if (controls.current) {
        controls.current.minDistance = Math.max(.75, characterScale.current * 2.4)
        controls.current.maxDistance = 36
      }
      if (activeCamera.fov !== 48 || activeCamera.near !== DEFAULT_CAMERA_NEAR) {
        activeCamera.near = DEFAULT_CAMERA_NEAR
        activeCamera.fov = 48
        activeCamera.updateProjectionMatrix()
      }
      if (controls.current && orbitCamera) {
        desiredTarget.set(
          player.x,
          player.y + CAMERA_TARGET_HEIGHT * (characterScale.current / CHARACTER_SCALE),
          player.z,
        )
        if (!controlsReady.current) {
          controls.current.target.copy(desiredTarget)
          controlsReady.current = true
        } else {
          const followStrength = 1 - Math.exp(-delta * 10)
          followDelta.subVectors(desiredTarget, controls.current.target).multiplyScalar(followStrength)
          controls.current.target.add(followDelta)
          orbitCamera.position.add(followDelta)
        }
        const minimumCameraY = terrainHeight(orbitCamera.position.x, orbitCamera.position.z) + .6
        if (orbitCamera.position.y < minimumCameraY) {
          orbitCamera.position.setY(THREE.MathUtils.lerp(orbitCamera.position.y, minimumCameraY, Math.min(1, delta * 12)))
        }
      }
    }

    if (
      FRONTIER_AUDIO_ASSETS_READY
      && state.clock.elapsedTime - lastListenerUpdateAt.current >= .05
    ) {
      lastListenerUpdateAt.current = state.clock.elapsedTime
      activeCamera.getWorldDirection(listenerForward).normalize()
      listenerUp.set(0, 1, 0).applyQuaternion(activeCamera.quaternion).normalize()
      soundManager.setListenerTransform({
        position: [player.x, player.y + 1.96 * characterScale.current, player.z],
        forward: [listenerForward.x, listenerForward.y, listenerForward.z],
        up: [listenerUp.x, listenerUp.y, listenerUp.z],
      })
    }

    if (!paused) {
      let nearest = null
      let nearestScore = Number.POSITIVE_INFINITY
      interactables.forEach((item) => {
        const distance = Math.hypot(player.x - item.position[0], player.z - item.position[2])
        const interactionRadius = Math.max(2.5, Number(item.interactionRadius || 0))
        const edgeDistance = Math.max(0, distance - Number(item.collisionRadius || 0))
        if (distance < interactionRadius && edgeDistance < nearestScore) {
          nearest = item
          nearestScore = edgeDistance
        }
      })
      const nextNearbySignature = nearest
        ? `${nearest.id}:${nearest.kind || ''}:${nearest.actionId || ''}:${nearest.dailyEvent?.eventId || ''}:${nearest.status || ''}:${nearest.label || ''}`
        : ''
      if (nearbySignature.current !== nextNearbySignature) {
        nearbySignature.current = nextNearbySignature
        onNearbyChange(nearest)
      }

      pickups.forEach((pickup) => {
        if (collectLock.current.has(pickup.id)) return
        if (Math.hypot(player.x - pickup.position[0], player.z - pickup.position[2]) < .9) {
          collectLock.current.add(pickup.id)
          soundManager.play('frontier.pickup.collect')
          onCollect(pickup.id)
        }
      })
    } else if (nearbySignature.current) {
      nearbySignature.current = ''
      onNearbyChange(null)
    }

    const liveIds = new Set(pickups.map((pickup) => pickup.id))
    collectLock.current.forEach((id) => { if (!liveIds.has(id)) collectLock.current.delete(id) })
    if (state.clock.elapsedTime - lastPublishAt.current > .22) {
      lastPublishAt.current = state.clock.elapsedTime
      onPositionChange?.({
        x: player.x,
        y: player.y,
        z: player.z,
        yaw: group.current.rotation.y,
        scale: characterScale.current,
      })
    }
  }, -2)

  return (
    <>
      {!builderOverview && <OrbitControls
        ref={controls}
        makeDefault
        enabled={!paused && !isFirstPerson}
        target={[0, CAMERA_TARGET_HEIGHT, 5]}
        enablePan={false}
        enableKeys={false}
        enableDamping
        dampingFactor={.08}
        rotateSpeed={.56}
        zoomSpeed={1.05}
        minDistance={isFirstPerson ? 0.05 : .75}
        maxDistance={isFirstPerson ? 0.2 : 36}
        minPolarAngle={isFirstPerson ? 0.1 : CAMERA_MIN_POLAR}
        maxPolarAngle={isFirstPerson ? Math.PI - 0.1 : CAMERA_MAX_POLAR}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: builderBuildMode ? THREE.MOUSE.ROTATE : THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.ROTATE,
        }}
        touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE }}
        onStart={() => {
          hoverLook.current.orbiting = true
          movementIntent.current.active = false
          resetFreeLook()
        }}
        onEnd={() => {
          hoverLook.current.orbiting = false
          movementIntent.current.active = false
          resetFreeLook()
        }}
      />}
      <group ref={group} position={[0, walkHeightAt(0, 5), 5]} scale={CHARACTER_SCALE}>
        <group ref={body} visible={!isFirstPerson}>
          <mesh position={[0, 1.2, 0]} scale={[.92, 1, .8]} castShadow><capsuleGeometry args={[.39, .72, 8, 14]} /><meshStandardMaterial color="#e8f2f3" roughness={.34} metalness={.08} /></mesh>
          <mesh position={[0, 1.18, .35]}><boxGeometry args={[.5, .42, .08]} /><meshStandardMaterial color="#253e54" metalness={.5} roughness={.25} /></mesh>
          <mesh position={[0, 1.18, .405]}><boxGeometry args={[.28, .08, .035]} /><meshStandardMaterial color="#7cf2bd" emissive="#2a9b71" emissiveIntensity={1.5} toneMapped={false} /></mesh>
          <mesh position={[0, .72, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.34, .055, 7, 20]} /><meshStandardMaterial color="#4e6478" metalness={.62} roughness={.28} /></mesh>
          <mesh position={[0, 2, 0]} castShadow><sphereGeometry args={[.53, 24, 18]} /><meshStandardMaterial color="#f2f8f8" metalness={.12} roughness={.24} /></mesh>
          <mesh position={[0, 1.98, .43]} scale={[1, .78, .4]}><sphereGeometry args={[.4, 22, 14]} /><meshPhysicalMaterial color="#67dfff" transparent opacity={.68} metalness={.5} roughness={.05} clearcoat={.7} /></mesh>
          <mesh position={[0, 2, .08]}><torusGeometry args={[.46, .035, 8, 28]} /><meshStandardMaterial color="#b7c8ce" metalness={.66} roughness={.2} /></mesh>
          <mesh position={[0, 1.22, -.4]} castShadow><boxGeometry args={[.7, .86, .34]} /><meshStandardMaterial color="#3d5572" metalness={.62} roughness={.25} /></mesh>
          <mesh position={[0, 1.33, -.585]}><boxGeometry args={[.38, .35, .06]} /><meshStandardMaterial color="#69e7ff" emissive="#176d84" emissiveIntensity={.7} /></mesh>
          <group ref={leftArm} position={[-.5, 1.48, 0]} rotation={[0, 0, -.14]}>
            <mesh position={[0, -.3, 0]} castShadow><capsuleGeometry args={[.12, .48, 6, 10]} /><meshStandardMaterial color="#dce9eb" roughness={.38} /></mesh>
            <mesh position={[0, -.61, .03]}><sphereGeometry args={[.15, 10, 8]} /><meshStandardMaterial color="#7c91a2" metalness={.38} /></mesh>
          </group>
          <group ref={rightArm} position={[.5, 1.48, 0]} rotation={[0, 0, .14]}>
            <mesh position={[0, -.3, 0]} castShadow><capsuleGeometry args={[.12, .48, 6, 10]} /><meshStandardMaterial color="#dce9eb" roughness={.38} /></mesh>
            <mesh position={[0, -.61, .03]}><sphereGeometry args={[.15, 10, 8]} /><meshStandardMaterial color="#7c91a2" metalness={.38} /></mesh>
          </group>
          <group ref={leftLeg} position={[-.25, .61, 0]}>
            <mesh position={[0, -.28, 0]} castShadow><capsuleGeometry args={[.14, .42, 6, 10]} /><meshStandardMaterial color="#d7e5e7" roughness={.4} /></mesh>
            {/* 신발 바닥이 캐릭터 원점(Y=0, 지면)에 닿도록 위로 올림. 이전 -0.62일 때 발이 지형에 묻혔음. */}
            <mesh position={[0, -.54, .12]} scale={[1.1, .7, 1.45]} castShadow><boxGeometry args={[.28, .2, .38]} /><meshStandardMaterial color="#40566c" metalness={.4} roughness={.35} /></mesh>
          </group>
          <group ref={rightLeg} position={[.25, .61, 0]}>
            <mesh position={[0, -.28, 0]} castShadow><capsuleGeometry args={[.14, .42, 6, 10]} /><meshStandardMaterial color="#d7e5e7" roughness={.4} /></mesh>
            <mesh position={[0, -.54, .12]} scale={[1.1, .7, 1.45]} castShadow><boxGeometry args={[.28, .2, .38]} /><meshStandardMaterial color="#40566c" metalness={.4} roughness={.35} /></mesh>
          </group>
          <pointLight position={[0, 1.55, .6]} color="#78eaff" intensity={.2} distance={2.6} />
        </group>
        <group position={[.78, 1.55, -.18]}>
          <mesh castShadow><sphereGeometry args={[.18, 12, 9]} /><meshStandardMaterial color="#dcecf2" metalness={.5} roughness={.25} /></mesh>
          <mesh position={[0, 0, .16]}><sphereGeometry args={[.055, 8, 6]} /><meshStandardMaterial color="#7cf2bd" emissive="#4ee1a5" emissiveIntensity={2} /></mesh>
        </group>
        <mesh position={[0, .025, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[.56, 24]} /><meshBasicMaterial color="#000" transparent opacity={.2} depthWrite={false} /></mesh>
        {showName && <PlayerNameTag displayName={displayName} speech={speech} />}
      </group>
    </>
  )
}

function FrontierScene({ planet, restorationPercent = 0, beaconRepaired = false, selectedStructureId, onSelectStructure, inputRef, paused, onNearbyChange, activeMission, collectedIds, onCollect, onPlayerPositionChange, playerPosition, buildItem, buildLevel = 1, onBuildAt, onInvalidBuild, roverStatus, roverStatusLabel, roverBayApplied, dailyEventNode, remotePlayers = [], nearbyRemoteUids, localPlayerName, localSpeech, isPlanetOwner, isFirstPerson, nearby, onInteract, onInspectStructure, signalPlazaSummary, observatorySummary, greenhouseSummary, gardenSummary, builderEnabled, builderActive, builderCells, builderBlockCount, builderInputMode, builderTool, builderLayer, builderBlockType, builderRotation, onBuilderLayerChange, onBuilderTargetLayerChange, onBuilderEdit, onBuilderScaleBlocked }) {
  const layout = useMemo(() => Array.isArray(planet?.layout) ? planet.layout : [], [planet])
  const basePalette = BIOMES[planet?.theme] || BIOMES.forest
  const restorationProgress = THREE.MathUtils.clamp(Number(restorationPercent || 0), 0, 100)
  const palette = useMemo(
    () => blendFrontierPalette(basePalette, restorationProgress),
    [basePalette, restorationProgress],
  )
  const restoredPropPositions = useMemo(() => {
    const visibleRatio = .28 + (.72 * restorationProgress / 100)
    return BIOME_PROP_POSITIONS.slice(0, Math.max(4, Math.round(BIOME_PROP_POSITIONS.length * visibleRatio)))
  }, [restorationProgress])

  // === 발광 시설 동적 조명 매니저 ===
  // 상위 월드에서 매 프레임 1회 가장 가까운 Stage 2 발광 시설을 계산하고,
  // id가 바뀔 때만 React state를 갱신한다(매 프레임 리렌더 방지).
  // 대상: LIGHTING_STRUCTURE_IDS(star_lamp, rover_bay 등). 새 시설은 집합에 추가만 하면 자동 지원.
  const playerGroupRef = useRef()
  const activeLightIdRef = useRef(null)
  const [activeLightId, setActiveLightId] = useState(null)
  const lightingPositions = useMemo(() => layout
    .filter((item) => LIGHTING_STRUCTURE_IDS.has(item.itemId) && Number(item.level || 1) >= 2)
    .map((item) => {
      const pos = worldPositionFromLayout(item)
      pos[1] = terrainHeight(pos[0], pos[2])
      return { id: item.instanceId, position: pos }
    }), [layout])
  useFrame(() => {
    const player = playerGroupRef.current
    if (!player || lightingPositions.length === 0) {
      if (activeLightIdRef.current !== null) {
        activeLightIdRef.current = null
        setActiveLightId(null)
      }
      return
    }
    const px = player.position.x
    const pz = player.position.z
    const CUTOFF_SQ = 36 // 6 World Unit
    const HYST_MARGIN_SQ = 0.36 // 약 0.6 WU 히스테리시스 마진(인접 시설 교체 방지)
    // 가장 가까운 발광 시설 탐색(6 WU 이내만)
    let nearestId = null
    let nearestDistSq = CUTOFF_SQ
    for (let i = 0; i < lightingPositions.length; i++) {
      const lamp = lightingPositions[i]
      const dx = lamp.position[0] - px
      const dz = lamp.position[2] - pz
      const d = dx * dx + dz * dz
      if (d < nearestDistSq) {
        nearestDistSq = d
        nearestId = lamp.id
      }
    }
    // 히스테리시스: 새 후보가 현재 활성 시설보다 충분히 더 가까울 때만 교체.
    const currentId = activeLightIdRef.current
    let nextId = currentId
    if (nearestId !== currentId) {
      if (currentId === null) {
        nextId = nearestId
      } else {
        const cur = lightingPositions.find((l) => l.id === currentId)
        const cdx = cur.position[0] - px
        const cdz = cur.position[2] - pz
        const cDistSq = cdx * cdx + cdz * cdz
        if (cDistSq >= CUTOFF_SQ) {
          nextId = nearestId // 현재 시설이 범위 밖으로 나가면 교체
        } else if (nearestId !== null && nearestDistSq + HYST_MARGIN_SQ < cDistSq) {
          nextId = nearestId // 새 후보가 충분히 더 가까우면 교체
        } else if (nearestId === null) {
          nextId = null // 모두 범위 밖
        }
      }
    }
    if (nextId !== currentId) {
      activeLightIdRef.current = nextId
      setActiveLightId(nextId)
    }
  })
  const roverNode = useMemo(() => ({
    ...ROVER_NODE,
    status: ROVER_STATUS_LABELS[roverStatus] ? roverStatus : 'idle',
    label: roverStatusLabel || ROVER_STATUS_LABELS[roverStatus] || ROVER_STATUS_LABELS.idle,
  }), [roverStatus, roverStatusLabel])
  const builderNode = useMemo(() => builderEnabled ? ({
    id: ASTRA_BUILDER_POC_PLOT.id,
    kind: 'builder',
    actionId: 'builder',
    label: '아스트라 빌더 시작',
    position: [
      ASTRA_BUILDER_POC_PLOT.center[0],
      terrainHeight(...ASTRA_BUILDER_POC_PLOT.center),
      ASTRA_BUILDER_POC_PLOT.center[1],
    ],
    interactionRadius: 4.35,
  }) : null, [builderEnabled])
  const resourceNodes = useMemo(() => RESOURCE_NODES.map((node) => node.id === 'broken_beacon' && beaconRepaired
    ? { ...node, completed: true, label: '비콘 수리 완료' }
    : node), [beaconRepaired])

  const nearbyPromptPos = useMemo(() => {
    if (!nearby || !nearby.position) return null
    const px = nearby.position[0] || 0
    const pz = nearby.position[2] || 0
    const py = terrainHeight(px, pz)
    let h = isFirstPerson ? 1.0 : 2.0
    if (nearby.kind === 'structure') {
      const footprint = structureFootprint(nearby.item?.itemId || '', nearby.item?.level)
      h = isFirstPerson ? Math.min(1.6, footprint * 0.8 + 0.6) : Math.max(2.6, footprint * 1.2 + 1.2)
    } else if (nearby.kind === 'portal') {
      h = isFirstPerson ? 1.6 : 2.8
    } else if (nearby.kind === 'rover') {
      h = isFirstPerson ? 0.9 : 2.0
    } else if (nearby.kind === 'guide') {
      h = isFirstPerson ? 1.0 : 2.2
    } else if (nearby.kind === 'builder') {
      h = isFirstPerson ? 1.2 : 2.3
    }
    return [px, py + h, pz]
  }, [nearby, isFirstPerson])
  const resourceInteractables = useMemo(() => dailyEventNode
    ? resourceNodes.map((node) => node.id === dailyEventNode.id ? dailyEventNode : node)
    : resourceNodes, [dailyEventNode, resourceNodes])
  const structureColliders = useMemo(() => layout.map((item) => {
    const position = worldPositionFromLayout(item)
    position[1] = terrainHeight(position[0], position[2])
    const collisionRadius = Math.max(.64, structureFootprint(item.itemId, item.level) + PLAYER_COLLISION_RADIUS)
    const isSignalPlaza = item.itemId === 'signal_plaza'
    const isExpeditionBeacon = item.itemId === 'expedition_beacon'
    const isRoverBay = item.itemId === 'rover_bay'
    const isObservatory = item.itemId === 'observatory'
    const isFriendGreenhouse = item.itemId === 'friend_greenhouse'
    const isStarflowerGarden = item.itemId === 'starflower_garden'
    const unreadSignals = Math.max(0, Number(signalPlazaSummary?.unreadCount || 0))
    return {
      id: item.instanceId,
      kind: 'structure',
      actionId: isSignalPlaza
        ? isPlanetOwner ? 'signal' : 'admire'
        : isExpeditionBeacon
          ? isPlanetOwner ? 'rover' : 'repair'
          : isObservatory
            ? isPlanetOwner ? 'observatory' : 'repair'
          : isRoverBay
            ? isPlanetOwner ? 'rover' : 'repair'
          : isFriendGreenhouse
            ? isPlanetOwner ? 'structure' : 'water'
          : isStarflowerGarden
            ? isPlanetOwner ? 'structure' : 'water'
          : 'structure',
      label: isSignalPlaza
        ? isPlanetOwner
          ? unreadSignals > 0 ? `새 귀환 신호 ${unreadSignals}개 확인` : '귀환 신호 기록 열기'
          : '감탄 신호 남기기 · 방문 흔적 기록'
        : isExpeditionBeacon
          ? isPlanetOwner
            ? roverStatus === 'ready' ? '귀환 보상 받기 · 비콘 +1 적용' : roverStatus === 'active' ? `${roverStatusLabel} · 비콘 +1 적용` : '로버 원정 관제 열기 · 회수 재료 +1'
            : '원정 비콘 수리하기'
        : isObservatory
          ? isPlanetOwner
            ? observatorySummary?.statusLabel || '오늘의 관측 브리핑 열기'
            : '관측 장비 수리하기 · 도움 기록'
        : isRoverBay
          ? isPlanetOwner
            ? roverStatus === 'ready'
              ? '귀환 보상 받기 · 정비소 관제'
              : roverStatus === 'active'
                ? roverBayApplied ? `${roverStatusLabel} · 6시간 가속 적용` : '다음 원정부터 6시간 · 관제 열기'
                : '로버 원정 관제 열기 · 다음 원정 6시간'
            : '로버 정비소 수리하기'
        : isFriendGreenhouse
          ? isPlanetOwner
            ? '온실 돌보기 · 바이오 섬유 1개'
            : `공동 온실에 물주기 · 활력 ${greenhouseSummary?.vitality ?? 0}/100`
        : isStarflowerGarden
          ? isPlanetOwner
            ? `별꽃 돌보기 · 친구 물주기 ${gardenSummary?.recentWaterCount ?? 0}회`
            : `별꽃에 물주기 · 활력 ${gardenSummary?.vitality ?? 0}/100`
        : item.name || '행성 객체 살펴보기',
      position,
      collisionRadius,
      interactionRadius: collisionRadius + 1.65,
      acousticMaterial: getStructureAcousticMaterial(item.itemId),
      item,
    }
  }), [gardenSummary?.recentWaterCount, gardenSummary?.vitality, greenhouseSummary?.vitality, isPlanetOwner, layout, observatorySummary?.statusLabel, roverBayApplied, roverStatus, roverStatusLabel, signalPlazaSummary?.unreadCount])
  const biomeColliders = useMemo(() => restoredPropPositions.map(([x, z, scale], index) => ({
    id: `biome-prop-${index}`,
    position: [x, terrainHeight(x, z), z],
    collisionRadius: Math.max(.34, Number(scale || 1) * .48) + PLAYER_COLLISION_RADIUS,
    acousticMaterial: palette.prop === 'forest' ? 'wood' : palette.prop === 'mechanical' ? 'metal' : 'stone',
  })), [palette.prop, restoredPropPositions])
  const builderPlotBaseY = terrainHeight(...ASTRA_BUILDER_POC_PLOT.center) + ASTRA_BUILDER_BASE_LIFT
  const builderBlockColliders = useMemo(() => (
    builderEnabled && builderCells?.length
      ? createAstraBuilderCollisionBodies(builderCells, builderPlotBaseY)
      : []
  ), [builderCells, builderEnabled, builderPlotBaseY])
  const movementColliders = useMemo(
    () => [...structureColliders, ...biomeColliders, ...builderBlockColliders],
    [biomeColliders, builderBlockColliders, structureColliders],
  )
  const walkHeightAt = useCallback((x, z, currentFootY = null, characterScale = CHARACTER_SCALE) => {
    const terrainY = walkSurfaceHeight(x, z)
    if (!builderEnabled) return terrainY
    return getAstraBuilderWalkSurfaceHeight({
      x,
      z,
      currentFootY,
      cells: builderCells,
      plotBaseY: builderPlotBaseY,
      terrainY,
      characterScale,
    })
  }, [builderCells, builderEnabled, builderPlotBaseY])
  const canUseBuilderCharacterScale = useCallback((scale, position) => (
    !builderEnabled
    || canAstraBuilderCharacterOccupy(builderBlockColliders, {
      x: position.x,
      z: position.z,
      footY: position.y,
      scale,
    })
  ), [builderBlockColliders, builderEnabled])
  const interactables = useMemo(() => [
    ...resourceInteractables,
    ...structureColliders,
    ...MISSION_PORTALS,
    GUIDE_NODE,
    roverNode,
    ...(builderNode ? [builderNode] : []),
  ], [builderNode, resourceInteractables, roverNode, structureColliders])
  const blockers = useMemo(() => layout.filter((item) => item.itemId !== 'wild_sprout').map(worldPositionFromLayout), [layout])
  const villageSlots = useMemo(() => builderEnabled ? [] : getAvailableVillageSlots(blockers), [blockers, builderEnabled])
  // 길 네트워크 노드: 구역 + 자원노드 + 마을 + 플레이어 건물. 모두 [x,z].
  const structurePositions = useMemo(() => {
    const nodes = [
      ...ZONES.map((zone) => [zone.position[0], zone.position[1]]),
      ...RESOURCE_NODES.map((node) => [node.position[0], node.position[2]]),
      ...VILLAGE_SLOTS.map((slot) => [slot.position[0], slot.position[1]]),
      ...blockers.map((position) => [position[0], position[2]]),
    ]
    return nodes
  }, [blockers])
  const showVillageBeacon = useMemo(() => !builderEnabled && isVillageBeaconAvailable(blockers), [blockers, builderEnabled])
  const groundDetailClearings = useMemo(() => [
    ...blockers.map((position) => ({ x: position[0], z: position[2], radius: 1.55 })),
    ...villageSlots.map((slot) => ({ x: slot.position[0], z: slot.position[1], radius: 1.48 })),
    ...(showVillageBeacon ? [{ x: VILLAGE_BEACON_POSITION[0], z: VILLAGE_BEACON_POSITION[1], radius: 1.4 }] : []),
    ...(builderEnabled ? [{
      x: ASTRA_BUILDER_POC_PLOT.center[0],
      z: ASTRA_BUILDER_POC_PLOT.center[1],
      radius: 3.15,
    }] : []),
    ...RESOURCE_NODES.map((item) => ({ x: item.position[0], z: item.position[2], radius: .9 })),
    ...MISSION_PORTALS.map((item) => ({ x: item.position[0], z: item.position[2], radius: 1.35 })),
    { x: GUIDE_NODE.position[0], z: GUIDE_NODE.position[2], radius: .8 },
    { x: ROVER_NODE.position[0], z: ROVER_NODE.position[2], radius: 1.05 },
  ], [blockers, builderEnabled, showVillageBeacon, villageSlots])
  const playerBlockers = useMemo(() => [
    ...blockers,
    ROVER_NODE.position,
    ...villageSlots.map((slot) => [slot.position[0], terrainHeight(slot.position[0], slot.position[1]), slot.position[1]]),
    ...(showVillageBeacon ? [[VILLAGE_BEACON_POSITION[0], terrainHeight(...VILLAGE_BEACON_POSITION), VILLAGE_BEACON_POSITION[1]]] : []),
  ], [blockers, showVillageBeacon, villageSlots])
  const pickupBlockers = useMemo(() => [
    ...playerBlockers,
    ...RESOURCE_NODES.map((item) => item.position),
    ...MISSION_PORTALS.map((item) => item.position),
  ], [playerBlockers])
  const pickups = useMemo(() => {
    if (!activeMission) return []
    return (MISSION_PICKUPS[activeMission.route] || [])
      .map(([x, z], index) => {
        const [safeX, safeZ] = resolveMissionPickupPosition(x, z, pickupBlockers)
        return { id: `${activeMission.route}_${index}`, position: [safeX, terrainHeight(safeX, safeZ) + .9, safeZ] }
      })
      .filter((pickup) => !collectedIds.has(pickup.id))
  }, [activeMission, collectedIds, pickupBlockers])
  const [hoverPoint, setHoverPoint] = useState(null)
  const isBuildPointValid = useCallback((point) => {
    if (!point) return false
    const [x, , z] = point
    if (Math.hypot(x, z) > BUILD_RADIUS) return false
    if (blockers.some((position) => Math.hypot(x - position[0], z - position[2]) < 2.1)) return false
    if ([...RESOURCE_NODES, ...MISSION_PORTALS, ROVER_NODE].some((item) => Math.hypot(x - item.position[0], z - item.position[2]) < 2)) return false
    if (villageSlots.some((slot) => Math.hypot(x - slot.position[0], z - slot.position[1]) < 1.9)) return false
    if (showVillageBeacon && Math.hypot(x - VILLAGE_BEACON_POSITION[0], z - VILLAGE_BEACON_POSITION[1]) < 1.9) return false
    if (
      builderEnabled
      && Math.abs(x - ASTRA_BUILDER_POC_PLOT.center[0]) < ASTRA_BUILDER_POC_PLOT.width * ASTRA_BUILDER_POC_PLOT.cellSize * 0.5 + 0.55
      && Math.abs(z - ASTRA_BUILDER_POC_PLOT.center[1]) < ASTRA_BUILDER_POC_PLOT.depth * ASTRA_BUILDER_POC_PLOT.cellSize * 0.5 + 0.55
    ) return false
    if (MISSION_PICKUP_RESERVED_POINTS.some(([pickupX, pickupZ]) => Math.hypot(x - pickupX, z - pickupZ) < 2)) return false
    if (isRiverWater(x, z) || isBridgeDeck(x, z) || terrainSlope(x, z) > .42) return false
    return true
  }, [blockers, builderEnabled, showVillageBeacon, villageSlots])
  const hoverValid = useMemo(() => isBuildPointValid(hoverPoint), [hoverPoint, isBuildPointValid])

  return (
    <>
      <color attach="background" args={[palette.sky]} />
      <fogExp2 attach="fog" args={[palette.fog, .017]} />
      <hemisphereLight args={['#c8edff', palette.groundDeep, 1.22]} />
      <directionalLight position={[10, 16, 8]} intensity={2.05} color={palette.light} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-25} shadow-camera-right={25} shadow-camera-top={25} shadow-camera-bottom={-25} shadow-normalBias={.04} shadow-bias={-.0004} />
      <directionalLight position={[-12, 7, -9]} intensity={.32} color={palette.accent} />
      <ambientLight intensity={.24} />
      <Stars radius={72} depth={34} count={720} factor={2.2} saturation={.18} fade speed={.08} />
      <Sparkles count={Math.round(24 + restorationProgress * .7)} scale={[48, 20, 48]} position={[0, 9, 0]} size={1.25} color={palette.particle} speed={.12} />
      <DistantWorlds palette={palette} />
      <WorldTerrain
        palette={palette}
        villageSlots={villageSlots}
        showVillage={!builderEnabled}
        showVillageBeacon={showVillageBeacon}
        detailClearings={groundDetailClearings}
        buildItem={buildItem}
        structurePositions={structurePositions}
        onBuildHover={(point) => setHoverPoint([point.x, terrainHeight(point.x, point.z), point.z])}
        onBuildCommit={(point) => {
          const nextPoint = [point.x, terrainHeight(point.x, point.z), point.z]
          setHoverPoint(nextPoint)
          if (isBuildPointValid(nextPoint)) onBuildAt?.(point.x, point.z)
          else onInvalidBuild?.()
        }}
      />
      {builderEnabled && (
        <AstraBuilderPlot
          baseY={builderPlotBaseY}
          cells={builderCells}
          blockCount={builderBlockCount}
          active={builderActive}
          paused={paused}
          inputMode={builderInputMode}
          tool={builderTool}
          activeLayer={builderLayer}
          selectedBlockType={builderBlockType}
          selectedRotation={builderRotation}
          onLayerChange={onBuilderLayerChange}
          onTargetLayerChange={onBuilderTargetLayerChange}
          onEdit={onBuilderEdit}
          playerGroupRef={playerGroupRef}
          useCharacterCamera
        />
      )}

      {restoredPropPositions.map(([x, z, scale], index) => <BiomeProp key={`${x}_${z}`} kind={palette.prop} position={[x, terrainHeight(x, z), z]} scale={scale} palette={palette} index={index} />)}
      {layout.map((item) => <PlacedStructure key={item.instanceId} item={item} selected={selectedStructureId === item.instanceId} onSelect={onSelectStructure} activeLightId={activeLightId} signalSummary={signalPlazaSummary} observatorySummary={observatorySummary} greenhouseSummary={greenhouseSummary} gardenSummary={gardenSummary} roverStatus={roverStatus} />)}
      {restorationProgress >= 80 && layout.filter((item) => item?.locked !== true).map((item) => {
        const [x, , z] = worldPositionFromLayout(item)
        return <mesh key={`memory-aura-${item.instanceId}`} position={[x, terrainHeight(x, z) + .035, z]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.72, .82, 28]} /><meshBasicMaterial color={palette.glow} transparent opacity={.16 + (restorationProgress - 80) / 160} depthWrite={false} /></mesh>
      })}
      {resourceNodes.map((node) => <ResourceNode key={node.id} node={node} palette={palette} />)}
      {dailyEventNode && <DailyEventMarker node={dailyEventNode} playerPosition={playerPosition} />}
      {MISSION_PORTALS.map((portal) => <MissionPortal key={portal.id} portal={portal} active={activeMission?.route === portal.route} />)}
      <LumiGuide palette={palette} />
      <RoverControl palette={palette} status={roverNode.status} />
      {restorationProgress >= 40 && <Creature position={[5.8, .3, -5.3]} color={planet?.theme === 'ocean' ? '#7ccde8' : '#a9e68b'} />}
      {restorationProgress >= 65 && <Creature position={[8.2, .45, -6.9]} color={planet?.theme === 'crystal' ? '#c3a0ef' : '#f2bd8b'} index={2} />}
      {restorationProgress >= 100 && <Sparkles count={48} scale={[22, 7, 22]} position={[0, 3.5, 0]} size={2} color="#fff4b2" speed={.28} />}

      {pickups.map((pickup, index) => (
        <Float key={pickup.id} speed={2.2 + index * .06} floatIntensity={.38} position={pickup.position}>
          <mesh castShadow><icosahedronGeometry args={[.36, 0]} /><meshStandardMaterial color={activeMission.route === 'comet' ? '#ff9f5a' : activeMission.route === 'ruins' ? '#64efff' : '#c59aff'} emissive={activeMission.route === 'comet' ? '#d54c17' : '#5940b8'} emissiveIntensity={2.2} toneMapped={false} /></mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.52, .62, 20]} /><meshBasicMaterial color="#c5f7ff" transparent opacity={.35} /></mesh>
        </Float>
      ))}

      {buildItem && hoverPoint && (
        <group position={hoverPoint}>
          <mesh position={[0, .06, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.15, 1.38, 32]} /><meshBasicMaterial color={hoverValid ? '#63f5b0' : '#ff7182'} transparent opacity={.9} depthWrite={false} /></mesh>
          <group position={[0, .08, 0]}><StructureModel itemId={buildItem} level={buildLevel} ghost /></group>
        </group>
      )}

      {nearbyPromptPos && !buildItem && !builderActive && !paused && (
        <Html position={nearbyPromptPos} center zIndexRange={[100, 0]}>
          <InteractionPrompt nearby={nearby} onInteract={onInteract} onInspect={onInspectStructure} />
        </Html>
      )}

      {remotePlayers.map((player) => <RemoteAstronaut key={player.uid} player={player} showName={nearbyRemoteUids?.has(player.uid)} walkHeightAt={walkHeightAt} />)}
      <Astronaut inputRef={inputRef} interactables={interactables} blockers={playerBlockers} structureColliders={movementColliders} pickups={pickups} paused={paused || (builderActive && builderInputMode === 'camera')} freeLookEnabled={!buildItem && (!builderActive || builderInputMode === 'build')} builderOverview={builderActive && builderInputMode === 'camera'} builderBuildMode={builderActive && builderInputMode === 'build'} canUseCharacterScale={canUseBuilderCharacterScale} onScaleBlocked={onBuilderScaleBlocked} onNearbyChange={onNearbyChange} onCollect={onCollect} onPositionChange={onPlayerPositionChange} displayName={localPlayerName} showName={Boolean(nearbyRemoteUids?.size)} speech={localSpeech} isFirstPerson={isFirstPerson} theme={planet?.theme || 'forest'} walkHeightAt={walkHeightAt} playerGroupRef={playerGroupRef} />
    </>
  )
}

function TouchJoystick({ inputRef, disabled }) {
  const [vector, setVector] = useState({ x: 0, z: 0 })
  const baseRef = useRef()

  const updatePos = (clientX, clientY) => {
    if (disabled) return
    const rect = baseRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = clientX - (rect.left + rect.width / 2)
    const y = clientY - (rect.top + rect.height / 2)
    const radius = rect.width * .34
    const length = Math.max(1, Math.hypot(x, y))
    const scale = Math.min(radius, length) / length
    const next = { x: (x * scale) / radius, z: (y * scale) / radius }
    inputRef.current.x = next.x
    inputRef.current.z = next.z
    setVector(next)
  }

  const updatePointer = (event) => {
    updatePos(event.clientX, event.clientY)
  }

  const updateTouch = (event) => {
    if (event.touches && event.touches[0]) {
      updatePos(event.touches[0].clientX, event.touches[0].clientY)
    }
  }

  const stop = (event) => {
    try { event?.currentTarget?.releasePointerCapture?.(event.pointerId) } catch { /* released */ }
    inputRef.current.x = 0
    inputRef.current.z = 0
    setVector({ x: 0, z: 0 })
  }

  return (
    <div
      ref={baseRef}
      className={`frontier-joystick${disabled ? ' disabled' : ''}`}
      role="application"
      aria-label="탐사자 이동 조이스틱"
      onPointerDown={(event) => { if (disabled) return; event.currentTarget.setPointerCapture(event.pointerId); updatePointer(event) }}
      onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) updatePointer(event) }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onTouchStart={(e) => { if (disabled) return; updateTouch(e) }}
      onTouchMove={(e) => { if (disabled) return; updateTouch(e) }}
      onTouchEnd={stop}
      onTouchCancel={stop}
    >
      <i style={{ transform: `translate(${vector.x * 28}px,${vector.z * 28}px)` }} />
    </div>
  )
}

function MiniMap({ playerPosition, nearby, dailyEventNode, objectiveTarget, objective, expanded, onToggleExpanded }) {
  const playerLeft = 50 + THREE.MathUtils.clamp(playerPosition.x / WORLD_RADIUS, -1, 1) * 44
  const playerTop = 50 + THREE.MathUtils.clamp(playerPosition.z / WORLD_RADIUS, -1, 1) * 44
  const targetNode = dailyEventNode || objectiveTarget
  const targetVisual = dailyEventNode ? resolveDailyEventVisual(dailyEventNode.dailyEvent) : { color: targetNode?.color || '#ffe082' }
  const targetLeft = targetNode ? 50 + THREE.MathUtils.clamp(targetNode.position[0] / WORLD_RADIUS, -1, 1) * 43 : 0
  const targetTop = targetNode ? 50 + THREE.MathUtils.clamp(targetNode.position[2] / WORLD_RADIUS, -1, 1) * 43 : 0
  const targetInRange = Boolean(targetNode && (
    nearby?.id === targetNode.id
    || Math.hypot(playerPosition.x - targetNode.position[0], playerPosition.z - targetNode.position[2]) <= Number(targetNode.interactionRadius || 2.8)
  ))
  const statusLabel = targetInRange
    ? '목표 지점 도착'
    : targetNode
      ? '목표 안내 중'
      : objective?.action === 'story-sync'
        ? '완료 기록 확인 중'
        : '구역 탐색 중'
  return (
    <div
      className={`frontier-minimap${targetNode ? ' has-event has-target' : ''}${targetInRange ? ' event-in-range' : ''}${expanded ? ' is-expanded' : ''}`}
      role="group"
      aria-label={targetNode ? `행성 지도. 현재 목표는 ${targetNode.mapLabel || targetNode.label || '표시된 목표 지점'}입니다` : '행성 구역 지도'}
    >
      <header>
        <span>행성 지도 <small>PLANET MAP</small></span>
        <strong>{statusLabel}</strong>
        <button type="button" onClick={onToggleExpanded} aria-label={expanded ? '행성 지도 축소' : '행성 지도 확대'} title={expanded ? '지도 축소' : '지도 확대'}>
          {expanded ? <Minimize2 size={16} aria-hidden="true" /> : <Maximize2 size={16} aria-hidden="true" />}
        </button>
      </header>
      <div className="frontier-minimap-field">
        <i className="frontier-minimap-orbit" />
        {targetNode && (
          <svg className="frontier-map-event-route" viewBox="0 0 100 100" aria-hidden="true">
            <line x1={playerLeft} y1={playerTop} x2={targetLeft} y2={targetTop} />
          </svg>
        )}
        {ZONES.map((zone) => (
          <span key={zone.id} className={`frontier-map-zone zone-${zone.id}`} style={{ left: `${50 + zone.position[0] / WORLD_RADIUS * 43}%`, top: `${50 + zone.position[1] / WORLD_RADIUS * 43}%`, '--zone-color': zone.color }} title={zone.label}>
            <i />
            <small>{zone.shortLabel}</small>
          </span>
        ))}
        {targetNode && (
          <span
            className="frontier-map-zone frontier-map-daily-event"
            style={{ left: `${targetLeft}%`, top: `${targetTop}%`, '--zone-color': targetVisual.color }}
            title={`현재 목표: ${targetNode.mapLabel || targetNode.label}`}
            aria-label={`현재 미션 수행 위치: ${targetNode.mapLabel || targetNode.label}`}
          >
            <i className="frontier-map-daily-pulse" />
            <small>✦ {targetNode.mapLabel || targetNode.label || '미션 위치'}</small>
          </span>
        )}
        {MISSION_PORTALS.map((portal) => (
          <span
            key={portal.id}
            className="frontier-map-zone frontier-map-expedition"
            style={{ left: `${50 + portal.position[0] / WORLD_RADIUS * 43}%`, top: `${50 + portal.position[2] / WORLD_RADIUS * 43}%`, '--zone-color': '#b08cff', zIndex: 3 }}
            title="탐사 출발대"
            aria-label="탐사 출발대"
          >
            <i style={{ width: 10, height: 10, borderWidth: 2, boxShadow: '0 0 12px #b08cff' }} />
            <small>출발</small>
          </span>
        ))}
        <span
          className="frontier-map-player-marker"
          style={{ left: `${playerLeft}%`, top: `${playerTop}%` }}
          aria-label="내 위치"
        >
          <b className="frontier-map-player" style={{ transform: `rotate(${THREE.MathUtils.radToDeg(playerPosition.yaw || 0) + 45}deg)` }} />
          <small>나</small>
        </span>
      </div>
      {targetNode && (
        <div className="frontier-minimap-guide">
          <span><i className="me" /> 나</span>
          <b>{targetInRange ? '목표 지점에 도착했습니다' : '점선을 따라 목표로 이동'}</b>
          <span><i className="event">✦</i> 목표</span>
        </div>
      )}
    </div>
  )
}

const INTERACTION_ICONS = {
  crystal: Gem,
  fiber: Sprout,
  salvage: Wrench,
  beacon: Radio,
  plant: Flower2,
  guide: Bot,
  portal: Compass,
  rover: Wrench,
  builder: Hammer,
  signal: Radio,
  observatory: Search,
}

function InteractionPrompt({ nearby, onInteract, onInspect }) {
  if (nearby.completed) return (
    <div className="frontier-interaction-prompt is-completed" role="status" aria-label={nearby.label || '상호작용 완료'}>
      <span className="prompt-icon"><CircleCheck size={14} aria-hidden="true" /></span>
      <div className="prompt-text">
        <small>신호 상태</small>
        <strong>{nearby.label || '완료되었습니다'}</strong>
      </div>
    </div>
  )
  const Graphic = nearby.kind === 'daily' ? SparklesIcon : nearby.kind === 'portal' ? Compass : INTERACTION_ICONS[nearby.actionId] || SparklesIcon
  const isStructure = nearby.kind === 'structure'
  return (
    <div
      className="frontier-interaction-prompt touch-clickable-prompt"
      onClick={() => onInteract?.()}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        onInteract?.()
      }}
      role="button"
      tabIndex={0}
      title="터치 또는 클릭하여 상호작용"
    >
      <span className="prompt-icon">{createElement(Graphic, { size: 14, 'aria-hidden': true })}</span>
      <div className="prompt-text">
        <small>{nearby.kind === 'daily' ? '행성 사건' : nearby.kind === 'structure' ? '행성 시설' : nearby.kind === 'guide' ? '안내소' : nearby.kind === 'portal' ? '탐사 출발대' : nearby.kind === 'rover' ? '로버 원정대' : nearby.kind === 'builder' ? '자유 건축 부지' : '상호작용'}</small>
        <strong>{nearby.label}</strong>
      </div>
      <div className="prompt-badges">
        <span className="prompt-key-badge" onClick={(e) => { e.stopPropagation(); onInteract?.(); }} title="E 키 또는 터치로 실행">E</span>
        {isStructure && (
          <span className="prompt-key-badge inspect" onClick={(e) => { e.stopPropagation(); onInspect?.(); }} title="F 키 또는 터치로 정보">F</span>
        )}
      </div>
    </div>
  )
}

// Fixed thumb-reachable action buttons for touch devices (tablets/phones without a keyboard).
// Rendered only when `nearby` is truthy (player within 2.5 units of something interactable) and
// the game isn't paused. Mirrors the E/F keyboard keys: E = interact, F = inspect (structures only).
// Uses the pre-existing .frontier-action-button / .frontier-structure-actions CSS; visibility is
// also gated by a touch media query so these never appear on desktop.
function TouchActionButtons({ nearby, onInteract, onInspect, disabled }) {
  if (disabled || !nearby || nearby.completed) return null
  const Graphic = nearby.kind === 'daily' ? SparklesIcon : nearby.kind === 'portal' ? Compass : INTERACTION_ICONS[nearby.actionId] || SparklesIcon
  const label = nearby.kind === 'structure' ? '시설' : nearby.kind === 'portal' ? '탐사' : nearby.kind === 'guide' ? '안내' : nearby.kind === 'rover' ? '로버' : nearby.kind === 'builder' ? '건축' : nearby.kind === 'daily' ? '사건' : '실행'
  const isStructure = nearby.kind === 'structure'
  const interactBtn = (
    <button type="button" className="frontier-action-button" onPointerDown={(e) => { e.preventDefault(); onInteract?.() }} title="상호작용 (E)">
      <span>{createElement(Graphic, { size: 22, 'aria-hidden': true })}</span>
      <strong>{label}</strong>
    </button>
  )
  if (!isStructure) return interactBtn
  return (
    <div className="frontier-structure-actions">
      {interactBtn}
      <button type="button" className="frontier-action-button inspect" onPointerDown={(e) => { e.preventDefault(); onInspect?.() }} title="정보 (F)">
        <span>{createElement(Search, { size: 22, 'aria-hidden': true })}</span>
        <strong>정보</strong>
      </button>
    </div>
  )
}

function ProximityChat({ peer, onSend, errorMessage }) {
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [localError, setLocalError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    const text = draft.replace(/\s+/g, ' ').trim().slice(0, 80)
    if (!text || sending) return
    setSending(true)
    setLocalError('')
    try {
      const sent = await onSend?.(peer.uid, text)
      if (!sent) {
        setLocalError(errorMessage || '친구가 멀어졌거나 오프라인 상태입니다.')
        return
      }
      setDraft('')
    } catch (error) {
      setLocalError(error?.message || '대화를 전송하지 못했습니다.')
    } finally {
      setSending(false)
    }
  }

  return (
    <form className="frontier-proximity-chat" onSubmit={submit}>
      <div><i /><span><small>LIVE PROXIMITY</small><strong>{peer.displayName || '탐사원'}님과 실시간 대화</strong></span></div>
      <label>
        <input value={draft} maxLength={80} placeholder="8초 뒤 사라지는 말을 입력하세요" aria-label={`${peer.displayName || '친구'}에게 휘발성 메시지 보내기`} onChange={(event) => { setDraft(event.target.value); setLocalError('') }} />
        <button type="submit" disabled={!draft.trim() || sending}>{sending ? '전송 중' : '말하기'}</button>
      </label>
      {(localError || errorMessage) && <p role="status">{localError || errorMessage}</p>}
    </form>
  )
}

export default function GalaxyWorld3D({
  planet,
  frontierStory,
  restorationPercent = 0,
  audioSessionKey = 'frontier',
  dailyEvent,
  missionReady,
  missionCooldownLabel,
  selectedBuildItem,
  selectedBuildLevel = 1,
  onCancelBuild,
  onBuildAt,
  onWorldAction,
  onDailyEventComplete,
  onMissionComplete,
  onSelectStructure,
  onStructureMission,
  signalPlazaSummary,
  observatorySummary,
  greenhouseSummary,
  gardenSummary,
  selectedStructureId,
  onMessage,
  paused = false,
  onOpenBriefing,
  onOpenRover,
  roverStatus = 'idle',
  roverStatusLabel = '',
  roverBayApplied = false,
  remotePlayers = [],
  localPlayerName = '탐사원',
  localSpeech = null,
  liveConnected = false,
  presenceError = '',
  onPlayerTransform,
  onSendSpeech,
  isPlanetOwner = false,
  isFirstPerson = false,
  onToggleFirstPerson,
  builderOwnerId = 'local',
  builderRemainingSeconds,
  builderServerSessionKey = '',
  onOpenBuilderPlot,
  onSaveBuilderState,
  onBuilderModeChange,
  objective,
}) {
  const inputRef = useRef({ x: 0, z: 0 })
  const [nearby, setNearby] = useState(null)
  const [playerPosition, setPlayerPosition] = useState({ x: 0, z: 5, yaw: 0 })
  const [activeMission, setActiveMission] = useState(null)
  const [collectedIds, setCollectedIds] = useState(new Set())
  const [missionRemainingMs, setMissionRemainingMs] = useState(0)
  const [completionStatus, setCompletionStatus] = useState('idle')
  const [ambienceReady, setAmbienceReady] = useState(false)
  const [builderActive, setBuilderActive] = useState(false)
  const [builderInputMode, setBuilderInputMode] = useState('build')
  const [builderTool, setBuilderTool] = useState('place')
  const [builderLayer, setBuilderLayer] = useState(0)
  const [builderTargetLayer, setBuilderTargetLayer] = useState(0)
  const [builderBlockType, setBuilderBlockType] = useState(1)
  const [builderRotation, setBuilderRotation] = useState(0)
  const [mapExpanded, setMapExpanded] = useState(false)
  const beaconRepaired = Boolean(frontierStory?.completedStepIds?.includes('restore_beacon'))
  const missionRemainingRef = useRef(0)
  const completingRef = useRef(false)
  const completionRequestTokenRef = useRef(null)
  const missionWarningPlayedRef = useRef(false)
  const mountedRef = useRef(false)
  const hasLeftLandingAudioZoneRef = useRef(false)
  const audioSessionKeyRef = useRef(audioSessionKey)
  audioSessionKeyRef.current = audioSessionKey
  const dailyEventNode = useMemo(() => resolvePendingDailyEventNode(dailyEvent), [dailyEvent])
  const objectiveTarget = useMemo(
    () => resolveObjectiveWorldTarget(objective, planet),
    [objective, planet],
  )
  const themeAmbienceSoundId = useMemo(
    () => getFrontierAmbienceSoundId(planet?.theme || 'forest'),
    [planet?.theme],
  )
  const riverAudio = useMemo(
    () => getRiverAudioProximity(playerPosition.x, playerPosition.z),
    [playerPosition.x, playerPosition.z],
  )
  const builderEnabled = ASTRA_BUILDER_POC_ENABLED && isPlanetOwner
  const builderPlayerLayer = THREE.MathUtils.clamp(
    Math.floor((
      Number(playerPosition.y ?? terrainHeight(playerPosition.x, playerPosition.z))
      - (terrainHeight(...ASTRA_BUILDER_POC_PLOT.center) + ASTRA_BUILDER_BASE_LIFT)
      + .002
    ) / ASTRA_BUILDER_POC_PLOT.cellSize),
    0,
    ASTRA_BUILDER_POC_PLOT.height - 1,
  )
  const builder = useAstraBuilderPoc(
    `${builderOwnerId || 'local'}:${ASTRA_BUILDER_POC_PLOT.id}`,
    builderEnabled,
    {
      serverActive: builderActive,
      serverSessionKey: builderServerSessionKey,
      openServerPlot: onOpenBuilderPlot,
      saveServerState: onSaveBuilderState,
      onSyncMessage: onMessage,
    },
  )

  const openAstraBuilder = useCallback(() => {
    if (!builderEnabled) return
    onCancelBuild?.()
    setNearby(null)
    setBuilderLayer(builderPlayerLayer)
    setBuilderTargetLayer(builderPlayerLayer)
    setBuilderInputMode('build')
    setBuilderActive(true)
    onBuilderModeChange?.(true)
    soundManager.play('frontier.ui.interact')
  }, [builderEnabled, builderPlayerLayer, onBuilderModeChange, onCancelBuild])

  const closeAstraBuilder = useCallback(async () => {
    await builder.flush()
    await builder.syncNow()
    setBuilderActive(false)
    setBuilderInputMode('build')
    setNearby(null)
    onBuilderModeChange?.(false)
  }, [builder, onBuilderModeChange])

  const applyAstraBuilderEditWithFeedback = useCallback((edit) => {
    const changed = builder.edit(edit)
    if (!changed) {
      soundManager.play('frontier.build.invalid')
      if (
        edit?.tool === 'place'
        && builder.blockCount >= ASTRA_BUILDER_POC_PLOT.maxBlocks
      ) {
        onMessage?.(`POC에서는 ${ASTRA_BUILDER_POC_PLOT.maxBlocks}블록까지 사용할 수 있어요.`)
      }
      return false
    }
    const soundId = edit.tool === 'delete'
      ? 'frontier.build.remove'
      : edit.tool === 'rotate'
        ? 'frontier.build.rotate'
        : 'frontier.build.place'
    soundManager.play(soundId)
    return true
  }, [builder, onMessage])

  useEffect(() => {
    if (builderEnabled || !builderActive) return
    void closeAstraBuilder()
  }, [builderActive, builderEnabled, closeAstraBuilder])

  useEffect(() => () => {
    onBuilderModeChange?.(false)
  }, [onBuilderModeChange])

  useEffect(() => {
    if (!builderActive || !Number.isFinite(builderRemainingSeconds) || builderRemainingSeconds > 0) return
    void closeAstraBuilder()
  }, [builderActive, builderRemainingSeconds, closeAstraBuilder])

  useEffect(() => {
    // 행성/플레이 세션이 바뀌면 이전 세션의 비동기 완료 상태를 새 화면에 남기지 않는다.
    soundManager.invalidateScopeVoices('frontier')
    soundManager.stopLoop('frontier:music:background', 0)
    soundManager.stopLoop('frontier:ambience:theme', 350)
    soundManager.stopLoop('frontier:ambience:landing', 350)
    soundManager.stopLoop('frontier:ambience:river', 350)
    soundManager.unduck('frontier:river-proximity')
    setAmbienceReady(false)
    hasLeftLandingAudioZoneRef.current = false
    completingRef.current = false
    completionRequestTokenRef.current = null
    missionWarningPlayedRef.current = false
    missionRemainingRef.current = 0
    setActiveMission(null)
    setCollectedIds(new Set())
    setMissionRemainingMs(0)
    setCompletionStatus('idle')
    const ambienceTimer = window.setTimeout(
      () => setAmbienceReady(true),
      AMBIENCE_ENTRY_DELAY_MS,
    )
    return () => window.clearTimeout(ambienceTimer)
  }, [audioSessionKey])

  useEffect(() => {
    mountedRef.current = true
    soundManager.enterScope('frontier')
    // 배경음악(BGM) 재생 안함 (사용자 요청으로 완전 제거)
    soundManager.stopLoop('frontier:music:background', 0)
    return () => {
      mountedRef.current = false
      soundManager.unduck('frontier:overlay')
      soundManager.unduck('frontier:river-proximity')
      soundManager.exitScope('frontier', { unload: true, fadeOutMs: 700 })
    }
  }, [])

  useEffect(() => {
    if (!FRONTIER_AUDIO_ASSETS_READY || !ambienceReady) return undefined
    if (themeAmbienceSoundId === 'frontier.ambience.forest') {
      const pHeight = terrainHeight(playerPosition.x, playerPosition.z, planet?.theme || 'forest')
      const nearMountain = pHeight >= 1.45 || MOUNTAINS.some(m => Math.hypot(playerPosition.x - m.x, playerPosition.z - m.z) <= (m.sigma + 1.8))
      const keys = MOUNTAINS.map((m, idx) => [`frontier:ambience:forest:${idx + 1}`, m.x, m.z, m.height])

      if (nearMountain) {
        keys.forEach(([key, x, z, h]) => {
          soundManager.loopAt('frontier.ambience.forest', [x, h, z], { key, fadeInMs: 1000 })
        })
      } else {
        keys.forEach(([key]) => soundManager.stopLoop(key, 500))
      }
      return () => keys.forEach(([key]) => soundManager.stopLoop(key, 500))
    }
    // [BGM/테마 배경음 주석 처리]
    // 패스포트 기후(심해, 수정, 사막, 기계, 빙하, 숲 등) 테마 배경음 비활성화.
    // 향후 원본 음원 교체 시 아래 3줄 주석 해제로 즉시 복원 가능.
    // const key = 'frontier:ambience:theme'
    // soundManager.loopAt(themeAmbienceSoundId, [0, 0, 0], { key, fadeInMs: 1200 })
    // return () => soundManager.stopLoop(key, 700)
    return undefined
  }, [ambienceReady, themeAmbienceSoundId, playerPosition.x, playerPosition.z, planet?.theme])

  useEffect(() => {
    const key = 'frontier:ambience:landing'
    const landingDistance = Math.hypot(playerPosition.x, playerPosition.z - 5)
    if (landingDistance > LANDING_AUDIO_STOP_DISTANCE) {
      hasLeftLandingAudioZoneRef.current = true
    }
    if (
      !FRONTIER_AUDIO_ASSETS_READY
      || !ambienceReady
      || !hasLeftLandingAudioZoneRef.current
      || landingDistance > LANDING_AUDIO_STOP_DISTANCE
    ) {
      soundManager.stopLoop(key, 500)
      return
    }
    // [BGM/착륙지 베이스 배경음 주석 처리]
    // 착륙지 베이스 웅웅거림 배경음 비활성화. 향후 음원 교체 시 주석 해제하여 복원 가능.
    // soundManager.loopAt('frontier.ambience.landing', [0, terrainHeight(0, 5) + .15, 5], {
    //   key,
    //   fadeInMs: 900,
    // })
  }, [ambienceReady, playerPosition.x, playerPosition.z])

  useEffect(() => {
    const key = 'frontier:ambience:river'
    if (
      !FRONTIER_AUDIO_ASSETS_READY
      || !ambienceReady
      || riverAudio.volumeMultiplier <= 0
    ) {
      soundManager.stopLoop(key, 600)
      soundManager.unduck('frontier:river-proximity')
      return
    }
    soundManager.loopAt(
      'frontier.ambience.river',
      riverAudio.point,
      {
        key,
        fadeInMs: 900,
        volumeMultiplier: riverAudio.volumeMultiplier,
      },
    )
    if (riverAudio.musicDuck < 1) {
      soundManager.duck('frontier:river-proximity', {
        frontierMusic: riverAudio.musicDuck,
      })
    } else {
      soundManager.unduck('frontier:river-proximity')
    }
  }, [ambienceReady, riverAudio])

  useEffect(() => {
    if (paused) {
      soundManager.duck('frontier:overlay', {
        frontierMusic: .55,
        frontierAmbience: .45,
        frontierSfx: .65,
      })
    } else {
      soundManager.unduck('frontier:overlay')
    }
    return () => soundManager.unduck('frontier:overlay')
  }, [paused])

  const nearbyRemotePlayers = useMemo(() => remotePlayers
    .filter((player) => Math.hypot(playerPosition.x - Number(player.x || 0), playerPosition.z - Number(player.z || 0)) <= PROXIMITY_CHAT_DISTANCE)
    .sort((first, second) => (
      Math.hypot(playerPosition.x - Number(first.x || 0), playerPosition.z - Number(first.z || 0))
      - Math.hypot(playerPosition.x - Number(second.x || 0), playerPosition.z - Number(second.z || 0))
    )), [playerPosition.x, playerPosition.z, remotePlayers])
  const nearbyRemoteUids = useMemo(() => new Set(nearbyRemotePlayers.map((player) => player.uid)), [nearbyRemotePlayers])
  const closestRemotePlayer = nearbyRemotePlayers[0] || null
  const publishPlayerTransform = useCallback((position) => {
    setPlayerPosition(position)
    onPlayerTransform?.(position)
  }, [onPlayerTransform])

  const startMission = useCallback((route) => {
    if (!missionReady) { onMessage?.(`45초 탐사는 ${missionCooldownLabel} 뒤 다시 할 수 있어요. 그동안 시설에서 재료를 모아보세요.`); return }
    if (activeMission) { onMessage?.('진행 중인 탐사를 먼저 완료하세요.'); return }
    const startedAtMs = Date.now()
    setCollectedIds(new Set())
    missionWarningPlayedRef.current = false
    missionRemainingRef.current = 45000
    setMissionRemainingMs(45000)
    setCompletionStatus('idle')
    setActiveMission({ route, startedAtMs, operationId: createMissionOperationId() })
    onMessage?.('탐사가 시작됐어요. 주변에 나타난 빛나는 조각 5개를 몸으로 지나가 모으세요.')
  }, [activeMission, missionCooldownLabel, missionReady, onMessage])

  const interact = useCallback(() => {
    if (!nearby || nearby.completed || paused) return
    const interactionSoundId = INTERACTION_SOUND_IDS[nearby.actionId]
      || 'frontier.ui.interact'
    soundManager.play(interactionSoundId)
    if (nearby.kind === 'builder') openAstraBuilder()
    else if (nearby.kind === 'portal') startMission(nearby.route)
    else if (nearby.kind === 'structure') onStructureMission?.(nearby.item)
    else if (nearby.kind === 'guide') onOpenBriefing?.()
    else if (nearby.kind === 'rover') onOpenRover?.()
    else if (nearby.kind === 'daily') {
      const currentDailyEvent = dailyEvent?.status === 'pending'
        && dailyEvent.eventId === nearby.dailyEvent?.eventId
        ? dailyEvent
        : null
      if (currentDailyEvent) onDailyEventComplete?.(currentDailyEvent)
    }
    else {
      onWorldAction?.(nearby)
    }
  }, [dailyEvent, nearby, onDailyEventComplete, onOpenBriefing, onOpenRover, onStructureMission, onWorldAction, openAstraBuilder, paused, startMission])

  const inspectStructure = useCallback(() => {
    if (paused || nearby?.kind !== 'structure') return
    soundManager.play('frontier.ui.inspect')
    onSelectStructure?.(nearby.item)
  }, [nearby, onSelectStructure, paused])

  useEffect(() => {
    if (!builderActive) return undefined
    const keydown = (event) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return
      const modifier = event.ctrlKey || event.metaKey
      if (event.code === 'Escape') {
        event.preventDefault()
        void closeAstraBuilder()
      } else if (modifier && event.code === 'KeyZ') {
        event.preventDefault()
        if (event.shiftKey) builder.redo()
        else builder.undo()
      } else if (modifier && event.code === 'KeyY') {
        event.preventDefault()
        builder.redo()
      } else if (event.code === 'KeyB') {
        event.preventDefault()
        setBuilderInputMode('build')
      } else if (event.code === 'KeyC') {
        event.preventDefault()
        setBuilderInputMode('camera')
      } else if (event.code === 'KeyV') {
        event.preventDefault()
        onToggleFirstPerson?.()
      } else if (event.code === 'PageUp' || event.code === 'PageDown') {
        event.preventDefault()
        setBuilderLayer((current) => THREE.MathUtils.clamp(
          current + (event.code === 'PageUp' ? 1 : -1),
          0,
          ASTRA_BUILDER_POC_PLOT.height - 1,
        ))
      } else if (event.code === 'KeyQ' || event.code === 'KeyE') {
        event.preventDefault()
        setBuilderRotation((current) => (
          event.code === 'KeyQ' ? (current + 3) % 4 : (current + 1) % 4
        ))
      }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [builder, builderActive, closeAstraBuilder, onToggleFirstPerson])

  useEffect(() => {
    const keydown = (event) => {
      if (event.repeat || paused || builderActive || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return
      if (event.code !== 'KeyE' && event.code !== 'KeyF' && event.code !== 'KeyV') return
      event.preventDefault()
      if (event.code === 'KeyE') interact()
      else if (event.code === 'KeyF') inspectStructure()
      else if (event.code === 'KeyV') onToggleFirstPerson?.()
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [builderActive, inspectStructure, interact, onToggleFirstPerson, paused])

  useEffect(() => {
    if (!activeMission || paused || collectedIds.size >= 5) return undefined
    const endsAtMs = Date.now() + missionRemainingRef.current

    const updateRemaining = () => {
      const remainingMs = Math.max(0, endsAtMs - Date.now())
      missionRemainingRef.current = remainingMs
      setMissionRemainingMs(remainingMs)
      if (
        remainingMs > 0
        && remainingMs <= 5000
        && !missionWarningPlayedRef.current
      ) {
        missionWarningPlayedRef.current = true
        soundManager.play('frontier.mission.warning')
      }
      if (remainingMs > 0) return

      window.clearInterval(timer)
      missionWarningPlayedRef.current = false
      setActiveMission(null)
      setCollectedIds(new Set())
      setCompletionStatus('idle')
      onMessage?.('시간이 끝났어요. 화면 앞 보라색 출발대에서 E키를 눌러 다시 도전할 수 있어요.')
    }

    const timer = window.setInterval(() => {
      updateRemaining()
    }, 250)
    return () => {
      window.clearInterval(timer)
      if (missionRemainingRef.current <= 0) return
      const remainingMs = Math.max(0, endsAtMs - Date.now())
      missionRemainingRef.current = remainingMs
      setMissionRemainingMs(remainingMs)
    }
  }, [activeMission, collectedIds.size, onMessage, paused])

  const remainingSeconds = activeMission ? Math.max(0, Math.ceil(missionRemainingMs / 1000)) : 0

  const requestMissionCompletion = useCallback(async () => {
    if (!activeMission || collectedIds.size < 5 || completingRef.current) return
    const requestAudioSessionKey = audioSessionKey
    const requestToken = {}
    completingRef.current = true
    completionRequestTokenRef.current = requestToken
    setCompletionStatus('submitting')

    try {
      const result = await onMissionComplete?.(activeMission.route, activeMission.operationId)
      if (!result) throw new Error('mission completion rejected')
      if (
        !mountedRef.current
        || audioSessionKeyRef.current !== requestAudioSessionKey
      ) return
      soundManager.play('frontier.mission.complete')
      missionWarningPlayedRef.current = false
      setActiveMission(null)
      setCollectedIds(new Set())
      missionRemainingRef.current = 0
      setMissionRemainingMs(0)
      setCompletionStatus('idle')
    } catch {
      if (
        !mountedRef.current
        || audioSessionKeyRef.current !== requestAudioSessionKey
      ) return
      setCompletionStatus('failed')
      soundManager.play('frontier.connection.softError')
      onMessage?.('보상 통신이 끊겼습니다. 수집 기록은 보존했어요. 다시 요청해 주세요.')
    } finally {
      if (completionRequestTokenRef.current === requestToken) {
        completionRequestTokenRef.current = null
        completingRef.current = false
      }
    }
  }, [activeMission, audioSessionKey, collectedIds.size, onMessage, onMissionComplete])

  useEffect(() => {
    if (!activeMission || collectedIds.size < 5 || completionStatus !== 'idle') return
    requestMissionCompletion()
  }, [activeMission, collectedIds.size, completionStatus, requestMissionCompletion])

  const retryMissionCompletion = useCallback(() => {
    if (!activeMission || collectedIds.size < 5 || completingRef.current) return
    setCompletionStatus('idle')
  }, [activeMission, collectedIds.size])

  const collect = useCallback((id) => setCollectedIds((current) => (
    current.has(id) ? current : new Set([...current, id])
  )), [])

  return (
    <div
      className={`frontier-game-stage${paused ? ' paused' : ''}${builderActive ? ' builder-active' : ''}${builderActive && builderInputMode === 'build' ? ' builder-build-active' : ''}`}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDownCapture={() => soundManager.unlock()}
    >
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [6, 5.4, 12], fov: 48, near: DEFAULT_CAMERA_NEAR, far: 120 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.04
        }}
      >
        <FrontierScene
          planet={planet}
          restorationPercent={restorationPercent}
          beaconRepaired={beaconRepaired}
          selectedStructureId={selectedStructureId}
          onSelectStructure={onSelectStructure}
          inputRef={inputRef}
          paused={paused}
          onNearbyChange={setNearby}
          playerPosition={playerPosition}
          activeMission={activeMission}
          collectedIds={collectedIds}
          onCollect={collect}
          onPlayerPositionChange={publishPlayerTransform}
          buildItem={selectedBuildItem}
          buildLevel={selectedBuildLevel}
          onBuildAt={onBuildAt}
          onInvalidBuild={() => {
            soundManager.play('frontier.build.invalid')
            onMessage?.('시설과 항로에서 조금 떨어진 평평한 자리를 골라주세요.')
          }}
          roverStatus={roverStatus}
          roverStatusLabel={roverStatusLabel}
          roverBayApplied={roverBayApplied}
          dailyEventNode={dailyEventNode}
          remotePlayers={remotePlayers}
          nearbyRemoteUids={nearbyRemoteUids}
          localPlayerName={localPlayerName}
          localSpeech={localSpeech}
          isPlanetOwner={isPlanetOwner}
          isFirstPerson={isFirstPerson}
          nearby={nearby}
          onInteract={interact}
          onInspectStructure={inspectStructure}
          signalPlazaSummary={signalPlazaSummary}
          observatorySummary={observatorySummary}
          greenhouseSummary={greenhouseSummary}
          gardenSummary={gardenSummary}
          builderEnabled={builderEnabled}
          builderActive={builderActive}
          builderCells={builder.cells}
          builderBlockCount={builder.blockCount}
          builderInputMode={builderInputMode}
          builderTool={builderTool}
          builderLayer={builderLayer}
          builderBlockType={builderBlockType}
          builderRotation={builderRotation}
          onBuilderLayerChange={setBuilderLayer}
          onBuilderTargetLayerChange={setBuilderTargetLayer}
          onBuilderEdit={applyAstraBuilderEditWithFeedback}
          onBuilderScaleBlocked={() => {
            soundManager.play('frontier.build.invalid')
            onMessage?.('이 공간에서는 더 커질 수 없어요. 벽이나 천장에서 조금 떨어져 주세요.')
          }}
        />
      </Canvas>

      {!builderActive && <MiniMap playerPosition={playerPosition} nearby={nearby} dailyEventNode={dailyEventNode} objectiveTarget={objectiveTarget} objective={objective} expanded={mapExpanded} onToggleExpanded={() => setMapExpanded((current) => !current)} />}
      {!builderActive && <button
        type="button"
        className="frontier-camera-mode-toggle"
        onClick={() => onToggleFirstPerson?.()}
        aria-label={isFirstPerson ? '3인칭 시점으로 전환' : '1인칭 시점으로 전환'}
        title={`시점 전환 (V) · 현재 ${isFirstPerson ? '1인칭' : '3인칭'}`}
      >
        {isFirstPerson ? '👁️' : '🛸'}
      </button>}
      {!builderActive && <div className={`frontier-live-status${liveConnected ? ' online' : ' offline'}`} title={presenceError || (liveConnected ? '같은 행성 접속자와 실시간 연결됨' : '실시간 대화 연결 없음')}>
        <i />
        <span>{liveConnected ? `온라인 ${remotePlayers.length}명` : '실시간 오프라인'}</span>
      </div>}
      {!builderActive && closestRemotePlayer && liveConnected && (
        <ProximityChat key={closestRemotePlayer.uid} peer={closestRemotePlayer} onSend={onSendSpeech} errorMessage={presenceError} />
      )}
      {!builderActive && activeMission && (
        <div className="frontier-mission-hud">
          <span><Compass size={20} aria-hidden="true" /></span>
          <div>
            <small>{completionStatus === 'submitting' ? '보상 받는 중' : completionStatus === 'failed' ? '보상 연결이 끊겼어요' : '45초 안에 빛나는 조각을 지나가 모으세요'}</small>
            <strong>{completionStatus === 'failed' ? '수집 기록 보존 · 보상 다시 요청' : `빛나는 조각 ${collectedIds.size}/5`}</strong>
            <i><b style={{ width: `${Math.min(100, collectedIds.size / 5 * 100)}%` }} /></i>
          </div>
          <em>
            {completionStatus === 'failed' ? (
              <button
                type="button"
                title="보상 다시 요청"
                aria-label="보상 다시 요청"
                onClick={retryMissionCompletion}
                style={{ all: 'unset', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
              >
                <Radio size={18} aria-hidden="true" />
              </button>
            ) : completionStatus === 'submitting' ? '···' : remainingSeconds}
          </em>
        </div>
      )}
      {!builderActive && selectedBuildItem && (
        <div className="frontier-build-mode">
          <strong>실제 시설 모형으로 자리를 확인하세요</strong>
          <span>초록색은 건설 가능 · 붉은색은 다른 자리 필요</span>
          <button type="button" onClick={onCancelBuild}>취소</button>
        </div>
      )}
      {!builderActive && <div className="frontier-control-hint"><kbd>WASD · 방향키</kbd><span>걷기</span><kbd>Shift</kbd><span>달리기</span><kbd>Space</kbd><span>점프</span><kbd>+ / −</kbd><span>크기</span><kbd>V</kbd><span>시점</span><kbd>E / F</kbd><span>상호작용·정보</span></div>}
      {builderActive && builderInputMode === 'build' && <div className="frontier-control-hint"><kbd>WASD · 방향키</kbd><span>이동</span><kbd>클릭</kbd><span>지정·배치</span><kbd>드래그</kbd><span>시점 회전</span><kbd>휠</kbd><span>확대·축소</span><kbd>+ / −</kbd><span>크기</span><kbd>Q / E</kbd><span>블록 회전</span></div>}
      {(!builderActive || builderInputMode === 'build') && <TouchJoystick inputRef={inputRef} disabled={paused} />}
      {!builderActive && <TouchActionButtons nearby={nearby} onInteract={interact} onInspect={inspectStructure} disabled={paused} />}
      {builderActive && (
        <AstraBuilderHud
          hydrated={builder.hydrated}
          saveState={builder.saveState}
          blockCount={builder.blockCount}
          inputMode={builderInputMode}
          onInputModeChange={setBuilderInputMode}
          isFirstPerson={isFirstPerson}
          onToggleFirstPerson={onToggleFirstPerson}
          tool={builderTool}
          onToolChange={setBuilderTool}
          activeLayer={builderLayer}
          playerLayer={builderPlayerLayer}
          targetLayer={builderTargetLayer}
          onLayerChange={(layer) => setBuilderLayer(THREE.MathUtils.clamp(
            layer,
            0,
            ASTRA_BUILDER_POC_PLOT.height - 1,
          ))}
          selectedBlockType={builderBlockType}
          onSelectBlockType={(blockType) => {
            setBuilderBlockType(blockType)
            setBuilderTool('place')
          }}
          selectedRotation={builderRotation}
          onRotateSelection={() => setBuilderRotation((current) => (current + 1) % 4)}
          canUndo={builder.canUndo}
          canRedo={builder.canRedo}
          onUndo={builder.undo}
          onRedo={builder.redo}
          onClose={() => { void closeAstraBuilder() }}
          remainingSeconds={builderRemainingSeconds}
          conflict={builder.conflict}
          serverError={builder.serverError}
          onResolveConflict={builder.resolveConflict}
        />
      )}
    </div>
  )
}
