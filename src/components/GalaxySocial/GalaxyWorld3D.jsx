import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float, Html, OrbitControls, Sparkles, Stars } from '@react-three/drei'
import { Bot, Compass, Flower2, Gem, Image as ImageIcon, Radio, Sparkles as SparklesIcon, Sprout, Wrench } from 'lucide-react'
import * as THREE from 'three'
import { GALAXY_MISSION_ROUTES } from '../../utils/galaxyGame'
import WorldTerrain from './GalaxyTerrain3D'
import {
  BUILD_RADIUS,
  VILLAGE_BEACON_POSITION,
  WORLD_RADIUS,
  WORLD_ZONES as ZONES,
  getAvailableVillageSlots,
  isVillageBeaconAvailable,
  isBridgeDeck,
  isRiverWater,
  terrainHeight,
  terrainSlope,
  walkSurfaceHeight,
} from './GalaxyTerrainModel'

const createMissionOperationId = () => globalThis.crypto?.randomUUID?.()
  || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
const PLAYER_SPEED = 6
const PLAYER_TURN_SPEED = Math.PI * 2.4
const PLAYER_MOVE_START_ANGLE = THREE.MathUtils.degToRad(25)
const PLAYER_MOVE_FULL_ANGLE = THREE.MathUtils.degToRad(6)
const CHARACTER_SCALE = .56
const CAMERA_TARGET_HEIGHT = .84
const CAMERA_MIN_POLAR = .24
const CAMERA_MAX_POLAR = Math.PI * .58
const MOUSE_LOOK_YAW_SENSITIVITY = .0026
const MOUSE_LOOK_PITCH_SENSITIVITY = .0021
const MOUSE_LOOK_MAX_FRAME_DELTA = 420
const MOUSE_LOOK_REENTRY_GAP_MS = 180
const MOUSE_LOOK_REENTRY_DISTANCE = 160
const PROXIMITY_CHAT_DISTANCE = 4.2

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

const MISSION_PORTALS = [
  // A single, visible starting point avoids making students hunt for a route by coordinates.
  { id: 'portal_expedition', kind: 'portal', route: 'nebula', label: '탐사 출발대 · E키로 탐사 시작', position: [0, .85, 1.7] },
]

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

export function StructureModel({ itemId, ghost = false }) {
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
  if (itemId === 'lumen_tree' || itemId === 'wild_sprout') return <RoundedLumenTree scale={itemId === 'wild_sprout' ? .45 : .9} ghost={ghost} />
  if (itemId === 'star_lamp' || itemId === 'prism_pathlight') {
    const small = itemId === 'prism_pathlight'
    return (
      <group scale={small ? .68 : 1}>
        <mesh position={[0, .7, 0]} castShadow={!ghost}><cylinderGeometry args={[.08, .17, 1.4, 10]} /><ModelMaterial color="#7589a5" metalness={.78} roughness={.25} ghost={ghost} /></mesh>
        <mesh position={[0, 1.54, 0]} rotation={[0, .35, 0]}><octahedronGeometry args={[.34, 0]} /><ModelMaterial color="#fff2a9" emissive="#ffd347" emissiveIntensity={2.5} metalness={.2} roughness={.18} ghost={ghost} /></mesh>
        <mesh position={[0, .09, 0]}><cylinderGeometry args={[.36, .46, .18, 12]} /><ModelMaterial color="#32465d" metalness={.7} ghost={ghost} /></mesh>
      </group>
    )
  }
  if (itemId === 'crystal_pond') {
    return (
      <group>
        <mesh position={[0, .08, 0]} receiveShadow><cylinderGeometry args={[1.35, 1.55, .2, 24]} /><ModelMaterial color="#203c57" roughness={.8} ghost={ghost} /></mesh>
        <mesh position={[0, .2, 0]}><cylinderGeometry args={[1.12, 1.24, .13, 28]} /><meshPhysicalMaterial color={ghost ? '#71f3bf' : '#4ad8ec'} transparent opacity={ghost ? .42 : .73} roughness={.08} metalness={.2} depthWrite={!ghost} /></mesh>
        <group position={[.45, .2, -.2]} scale={.35}><CrystalCluster color="#7be8ff" ghost={ghost} /></group>
      </group>
    )
  }
  if (itemId === 'friend_greenhouse') {
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

function PreviewTurntable({ itemId }) {
  const group = useRef()
  useFrame((state, delta) => {
    if (!group.current) return
    group.current.rotation.y += delta * .35
    group.current.position.y = -.65 + Math.sin(state.clock.elapsedTime * 1.4) * .04
  })
  return <group ref={group} position={[0, -.65, 0]}><StructureModel itemId={itemId} /></group>
}

export function StructurePreview3D({ itemId }) {
  return (
    <Canvas dpr={[1, 1.35]} camera={{ position: [4.5, 3.4, 5.5], fov: 38, near: .1, far: 50 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={1.05} />
      <hemisphereLight args={['#d9f8ff', '#172435', 1.4]} />
      <directionalLight position={[4, 7, 5]} intensity={2.2} color="#fff3d6" />
      <pointLight position={[-3, 2, 2]} intensity={1.2} color="#68e9ff" distance={10} />
      <PreviewTurntable itemId={itemId} />
      <mesh position={[0, -.72, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[2.2, 40]} /><meshBasicMaterial color="#6ce7ff" transparent opacity={.06} /></mesh>
      <Sparkles count={18} scale={[4, 3, 4]} size={1.6} color="#a8efff" speed={.2} />
    </Canvas>
  )
}

function structureFootprint(itemId) {
  if (itemId === 'star_lamp' || itemId === 'prism_pathlight') return .46
  if (itemId === 'wild_sprout') return .42
  if (itemId === 'lumen_tree') return .78
  if (itemId === 'crystal_pond' || itemId === 'starflower_garden') return 1.28
  if (itemId === 'signal_plaza' || itemId === 'route_gateway') return 1.52
  return 1.14
}

function StructureProximityLabel({ item, footprint, isPlanetOwner }) {
  return (
    <Html position={[0, Math.max(1.7, footprint + .9), 0]} center distanceFactor={8.8} style={{ pointerEvents: 'none' }}>
      <div className="frontier-structure-proximity-label">
        <strong>{item.name || '행성 객체'}</strong>
        <span><kbd>E</kbd> {isPlanetOwner ? '재료 얻기' : '도와주기'} <i /> <kbd>F</kbd> 정보</span>
      </div>
    </Html>
  )
}

function PlacedStructure({ item, selected, nearby, onSelect, isPlanetOwner }) {
  const position = worldPositionFromLayout(item)
  position[1] = terrainHeight(position[0], position[2])
  const footprint = structureFootprint(item.itemId)
  return (
    <group position={position} rotation={[0, THREE.MathUtils.degToRad(Number(item.rotation || 0)), 0]}>
      <mesh position={[0, .045, 0]} receiveShadow><cylinderGeometry args={[footprint, footprint + .12, .09, 24]} /><meshStandardMaterial color="#293d48" roughness={.94} /></mesh>
      <StructureModel itemId={item.itemId} />
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
  if (node.actionId === 'beacon') return <group position={[x, y, z]}><mesh position={[0, .8, 0]} rotation={[0, 0, .18]} castShadow><cylinderGeometry args={[.14, .3, 1.7, 9]} /><meshStandardMaterial color="#71859a" metalness={.78} /></mesh><Float speed={1.6} floatIntensity={.14}><mesh position={[0, 1.75, 0]}><sphereGeometry args={[.24, 12, 9]} /><meshStandardMaterial color="#ff8279" emissive="#ff312b" emissiveIntensity={2.4} toneMapped={false} /></mesh></Float><ResourceHalo color="#ff8279" /></group>
  return <group position={[x, y, z]}><mesh position={[0, .04, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[1.12, 24]} /><meshStandardMaterial color="#76583d" roughness={1} /></mesh><group position={[0, .2, 0]}><RoundedLumenTree scale={.28} color="#82e99c" /></group><ResourceHalo color="#8df2a7" /></group>
}

function DailyEventMarker({ node }) {
  const marker = useRef()
  const beam = useRef()
  const visual = useMemo(() => resolveDailyEventVisual(node.dailyEvent), [node.dailyEvent])
  const [x, , z] = node.position
  const y = terrainHeight(x, z)

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime
    if (marker.current) {
      marker.current.rotation.y = elapsed * .38
      marker.current.position.y = y + Math.sin(elapsed * 1.45) * .035
    }
    if (beam.current) beam.current.material.opacity = .075 + Math.sin(elapsed * 1.9) * .025
  })

  return (
    <group ref={marker} position={[x, y, z]}>
      <mesh ref={beam} position={[0, 2.05, 0]}>
        <cylinderGeometry args={[.08, .52, 4.1, 24, 1, true]} />
        <meshBasicMaterial color={visual.color} transparent opacity={.09} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh position={[0, .08, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.12, .055, 8, 48]} />
        <meshBasicMaterial color={visual.color} transparent opacity={.82} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, .13, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.42, .018, 6, 48]} />
        <meshBasicMaterial color={visual.glow} transparent opacity={.42} depthWrite={false} toneMapped={false} />
      </mesh>
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle) => (
        <mesh key={angle} position={[Math.cos(angle) * 1.25, .18, Math.sin(angle) * 1.25]} rotation={[0, -angle, Math.PI / 4]}>
          <octahedronGeometry args={[.09, 0]} />
          <meshBasicMaterial color={visual.glow} toneMapped={false} />
        </mesh>
      ))}
      <Float speed={1.65} floatIntensity={.2} rotationIntensity={.18}>
        <mesh position={[0, 2.05, 0]} rotation={[0, Math.PI / 4, 0]}>
          <octahedronGeometry args={[.28, 0]} />
          <meshStandardMaterial color={visual.glow} emissive={visual.color} emissiveIntensity={2.4} metalness={.25} roughness={.18} toneMapped={false} />
        </mesh>
      </Float>
      <Sparkles count={18} scale={[2.35, 3.8, 2.35]} position={[0, 1.8, 0]} color={visual.glow} size={1.8} speed={.38} noise={.8} />
      <pointLight position={[0, 1.65, 0]} color={visual.color} intensity={.55} distance={4.2} />
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

function RemoteAstronaut({ player, showName }) {
  const group = useRef()
  useFrame((_, delta) => {
    if (!group.current) return
    const smoothing = 1 - Math.exp(-Math.min(delta, .05) * 11)
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, Number(player.x || 0), smoothing)
    group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, Number(player.z || 0), smoothing)
    group.current.position.y = THREE.MathUtils.lerp(
      group.current.position.y,
      walkSurfaceHeight(Number(player.x || 0), Number(player.z || 0)),
      smoothing,
    )
    const yawDelta = Math.atan2(
      Math.sin(Number(player.yaw || 0) - group.current.rotation.y),
      Math.cos(Number(player.yaw || 0) - group.current.rotation.y),
    )
    group.current.rotation.y += yawDelta * smoothing
  })

  return (
    <group ref={group} position={[Number(player.x || 0), walkSurfaceHeight(Number(player.x || 0), Number(player.z || 0)), Number(player.z || 0)]} rotation={[0, Number(player.yaw || 0), 0]} scale={CHARACTER_SCALE}>
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

function Astronaut({ inputRef, interactables, blockers, structureColliders = [], pickups, paused, freeLookEnabled, onNearbyChange, onCollect, onPositionChange, displayName, showName, speech, isFirstPerson, setIsFirstPerson }) {
  const { gl } = useThree()
  const group = useRef()
  const body = useRef()
  const leftArm = useRef()
  const rightArm = useRef()
  const leftLeg = useRef()
  const rightLeg = useRef()
  const controls = useRef()
  const controlsReady = useRef(false)
  const keys = useRef(new Set())
  const nearbySignature = useRef('')
  const collectLock = useRef(new Set())
  const lastPublishAt = useRef(0)
  const hoverLook = useRef({ pendingX: 0, pendingY: 0, lastX: null, lastY: null, lastTime: null, orbiting: false })
  const firstPersonPitch = useRef(0)
  const movementIntent = useRef(createMovementIntent())
  const movementVectors = useRef({
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    moveDirection: new THREE.Vector3(),
    desiredTarget: new THREE.Vector3(),
    followDelta: new THREE.Vector3(),
    cameraOffset: new THREE.Vector3(),
    cameraSpherical: new THREE.Spherical(),
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
      movementIntent.current.active = false
    }
    const isInteractiveTarget = (target) => target?.closest?.('input, textarea, select, button, a, [contenteditable="true"], [role="dialog"]')
    const down = (event) => {
      if (paused || isInteractiveTarget(event.target)) return
      if (event.code === 'KeyV') {
        event.preventDefault()
        setIsFirstPerson?.((prev) => !prev)
        return
      }
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(event.code)) {
        event.preventDefault()
        keys.current.add(event.code)
      }
    }
    const up = (event) => keys.current.delete(event.code)
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
  }, [inputRef, paused, setIsFirstPerson])

  useEffect(() => {
    if (!paused) return
    keys.current.clear()
    inputRef.current.x = 0
    inputRef.current.z = 0
    movementIntent.current.active = false
  }, [inputRef, paused])

  useEffect(() => {
    const canvas = gl.domElement
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateReducedMotion = () => {
      if (reducedMotion.matches) resetFreeLook()
    }
    const updateHoverLook = (event) => {
      const look = hoverLook.current
      if (
        paused
        || !freeLookEnabled
        || reducedMotion.matches
        || look.orbiting
        || (event.pointerType === 'mouse' && event.buttons !== 0)
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
    const resetWhenHidden = () => { if (document.hidden) resetFreeLook() }

    window.addEventListener('pointermove', updateHoverLook, { passive: true })
    window.addEventListener('blur', resetFreeLook)
    canvas.addEventListener('pointerleave', resetFreeLook)
    canvas.addEventListener('pointerdown', resetFreeLook)
    document.addEventListener('visibilitychange', resetWhenHidden)
    reducedMotion.addEventListener?.('change', updateReducedMotion)
    return () => {
      window.removeEventListener('pointermove', updateHoverLook)
      window.removeEventListener('blur', resetFreeLook)
      canvas.removeEventListener('pointerleave', resetFreeLook)
      canvas.removeEventListener('pointerdown', resetFreeLook)
      document.removeEventListener('visibilitychange', resetWhenHidden)
      reducedMotion.removeEventListener?.('change', updateReducedMotion)
    }
  }, [freeLookEnabled, gl, paused, resetFreeLook])

  useEffect(() => {
    resetFreeLook()
  }, [freeLookEnabled, paused, resetFreeLook])

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
        group.current.rotation.y += manualLookYaw
        firstPersonPitch.current = THREE.MathUtils.clamp(
          firstPersonPitch.current - mouseDeltaY * MOUSE_LOOK_PITCH_SENSITIVITY,
          -1.2,
          1.2,
        )
      } else {
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

    const keyboardX = paused ? 0 : (keys.current.has('KeyD') || keys.current.has('ArrowRight') ? 1 : 0) - (keys.current.has('KeyA') || keys.current.has('ArrowLeft') ? 1 : 0)
    const keyboardZ = paused ? 0 : (keys.current.has('KeyS') || keys.current.has('ArrowDown') ? 1 : 0) - (keys.current.has('KeyW') || keys.current.has('ArrowUp') ? 1 : 0)
    const moveX = paused ? 0 : THREE.MathUtils.clamp(keyboardX + Number(inputRef.current.x || 0), -1, 1)
    const moveZ = paused ? 0 : THREE.MathUtils.clamp(keyboardZ + Number(inputRef.current.z || 0), -1, 1)
    const inputLength = Math.hypot(moveX, moveZ)
    const moving = inputLength > .05 && !look.orbiting
    let movementAmount = 0

    if (orbitCamera) {
      orbitCamera.getWorldDirection(forward)
      forward.setY(0)
      if (forward.lengthSq() < .0001) forward.set(Math.sin(group.current.rotation.y), 0, Math.cos(group.current.rotation.y))
      forward.normalize()
      right.crossVectors(forward, orbitCamera.up).normalize()
    }

    if (moving && orbitCamera) {
      moveDirection.copy(right).multiplyScalar(moveX).addScaledVector(forward, -moveZ)
      const inputStrength = Math.min(1, moveDirection.length())
      moveDirection.normalize()

      if (isFirstPerson) {
        group.current.rotation.y = Math.atan2(forward.x, forward.z)
      } else {
        const targetFacingYaw = Math.atan2(forward.x, forward.z)
        const yawDelta = Math.atan2(Math.sin(targetFacingYaw - group.current.rotation.y), Math.cos(targetFacingYaw - group.current.rotation.y))
        group.current.rotation.y += yawDelta * Math.min(1, delta * 14)
      }

      movementAmount = inputStrength
      const moveWorldVec = moveDirection.clone().multiplyScalar(PLAYER_SPEED * delta * movementAmount)

      const nextX = group.current.position.x + moveWorldVec.x
      const nextZ = group.current.position.z + moveWorldVec.z
      const inWorld = Math.hypot(nextX, nextZ) < WORLD_RADIUS - .8
      const structureCollision = structureColliders.find((collider) => Math.hypot(nextX - collider.position[0], nextZ - collider.position[2]) < collider.collisionRadius)
      const blockedByObject = Boolean(structureCollision) || blockers.some((position) => Math.hypot(nextX - position[0], nextZ - position[2]) < 1.12)
      const blockedByRiver = isRiverWater(nextX, nextZ) && !isBridgeDeck(nextX, nextZ)
      const blockedBySlope = !isBridgeDeck(nextX, nextZ) && terrainSlope(nextX, nextZ) > 1.08
      if (inWorld && !blockedByObject && !blockedByRiver && !blockedBySlope) {
        group.current.position.x = nextX
        group.current.position.z = nextZ
      }
    } else if (orbitCamera && !isFirstPerson) {
      const targetYaw = Math.atan2(forward.x, forward.z)
      const yawDelta = Math.atan2(Math.sin(targetYaw - group.current.rotation.y), Math.cos(targetYaw - group.current.rotation.y))
      group.current.rotation.y += yawDelta * (1 - Math.exp(-delta * 14))
    }

    const locomoting = moving && movementAmount > .01
    const strideSign = moveZ > 0 ? -1 : 1
    const stride = locomoting ? Math.sin(state.clock.elapsedTime * 14) * .52 * strideSign : 0
    const strafeStep = locomoting ? Math.sin(state.clock.elapsedTime * 14) * 0.32 * moveX : 0
    const bodySway = locomoting ? Math.sin(state.clock.elapsedTime * 14) * 0.08 * moveX : 0

    if (body.current) {
      body.current.position.y = THREE.MathUtils.lerp(body.current.position.y, locomoting ? Math.abs(Math.sin(state.clock.elapsedTime * 14)) * .035 : 0, delta * 10)
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

    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, walkSurfaceHeight(group.current.position.x, group.current.position.z), Math.min(1, delta * 9))
    const player = group.current.position

    const activeCamera = state.camera
    if (isFirstPerson) {
      if (controls.current) controls.current.enabled = false
      const eyeY = player.y + 1.58
      const yaw = group.current.rotation.y
      const pitch = firstPersonPitch.current
      const lookDist = 10.0

      if (activeCamera.fov !== 65) {
        activeCamera.fov = 65
        activeCamera.updateProjectionMatrix()
      }
      activeCamera.position.set(player.x, eyeY, player.z)
      activeCamera.lookAt(
        player.x + Math.sin(yaw) * Math.cos(pitch) * lookDist,
        eyeY + Math.sin(pitch) * lookDist,
        player.z + Math.cos(yaw) * Math.cos(pitch) * lookDist
      )
    } else {
      if (controls.current) controls.current.enabled = !paused
      if (activeCamera.fov !== 48) {
        activeCamera.fov = 48
        activeCamera.updateProjectionMatrix()
      }
      if (controls.current && orbitCamera) {
        desiredTarget.set(player.x, player.y + CAMERA_TARGET_HEIGHT, player.z)
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

    if (!paused) {
      let nearest = null
      let nearestDistance = 2.5
      interactables.forEach((item) => {
        const distance = Math.hypot(player.x - item.position[0], player.z - item.position[2])
        if (distance < nearestDistance) { nearest = item; nearestDistance = distance }
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
      onPositionChange?.({ x: player.x, z: player.z, yaw: group.current.rotation.y })
    }
  }, -2)

  return (
    <>
      <OrbitControls
        ref={controls}
        makeDefault
        enabled={!paused && !isFirstPerson}
        target={[0, CAMERA_TARGET_HEIGHT, 5]}
        enablePan={false}
        enableKeys={false}
        enableDamping
        dampingFactor={.08}
        rotateSpeed={.56}
        zoomSpeed={.78}
        minDistance={isFirstPerson ? 0.05 : 4.8}
        maxDistance={isFirstPerson ? 0.2 : 13.5}
        minPolarAngle={isFirstPerson ? 0.1 : CAMERA_MIN_POLAR}
        maxPolarAngle={isFirstPerson ? Math.PI - 0.1 : CAMERA_MAX_POLAR}
        mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }}
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
      />
      <group ref={group} position={[0, terrainHeight(0, 5), 5]} scale={CHARACTER_SCALE}>
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
            <mesh position={[0, -.62, .12]} scale={[1.1, .7, 1.45]} castShadow><boxGeometry args={[.28, .2, .38]} /><meshStandardMaterial color="#40566c" metalness={.4} roughness={.35} /></mesh>
          </group>
          <group ref={rightLeg} position={[.25, .61, 0]}>
            <mesh position={[0, -.28, 0]} castShadow><capsuleGeometry args={[.14, .42, 6, 10]} /><meshStandardMaterial color="#d7e5e7" roughness={.4} /></mesh>
            <mesh position={[0, -.62, .12]} scale={[1.1, .7, 1.45]} castShadow><boxGeometry args={[.28, .2, .38]} /><meshStandardMaterial color="#40566c" metalness={.4} roughness={.35} /></mesh>
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

function FrontierScene({ planet, selectedStructureId, nearbyStructureId, onSelectStructure, inputRef, paused, onNearbyChange, activeMission, collectedIds, onCollect, onPlayerPositionChange, buildItem, onBuildAt, onInvalidBuild, roverStatus, roverStatusLabel, dailyEventNode, remotePlayers = [], nearbyRemoteUids, localPlayerName, localSpeech, isPlanetOwner, isFirstPerson, setIsFirstPerson, nearby, onInteract, onInspectStructure }) {
  const layout = useMemo(() => Array.isArray(planet?.layout) ? planet.layout : [], [planet])
  const palette = BIOMES[planet?.theme] || BIOMES.forest
  const roverNode = useMemo(() => ({
    ...ROVER_NODE,
    status: ROVER_STATUS_LABELS[roverStatus] ? roverStatus : 'idle',
    label: roverStatusLabel || ROVER_STATUS_LABELS[roverStatus] || ROVER_STATUS_LABELS.idle,
  }), [roverStatus, roverStatusLabel])

  const nearbyPromptPos = useMemo(() => {
    if (!nearby || !nearby.position) return null
    const px = nearby.position[0] || 0
    const pz = nearby.position[2] || 0
    const py = terrainHeight(px, pz)
    let h = 1.45
    if (nearby.kind === 'structure') {
      const footprint = structureFootprint(nearby.item?.itemId || '')
      h = Math.min(2.4, Math.max(1.3, footprint * 0.75 + 0.5))
    } else if (nearby.kind === 'portal') {
      h = 2.2
    } else if (nearby.kind === 'rover') {
      h = 1.25
    } else if (nearby.kind === 'guide') {
      h = 1.35
    }
    return [px, py + h, pz]
  }, [nearby])
  const resourceInteractables = useMemo(() => dailyEventNode
    ? RESOURCE_NODES.map((node) => node.id === dailyEventNode.id ? dailyEventNode : node)
    : RESOURCE_NODES, [dailyEventNode])
  const structureColliders = useMemo(() => layout.map((item) => {
    const position = worldPositionFromLayout(item)
    position[1] = terrainHeight(position[0], position[2])
    return {
      id: item.instanceId,
      kind: 'structure',
      actionId: 'structure',
      label: item.name || '행성 객체 살펴보기',
      position,
      collisionRadius: Math.max(.9, structureFootprint(item.itemId) + .42),
      item,
    }
  }), [layout])
  const interactables = useMemo(() => [...resourceInteractables, ...structureColliders, ...MISSION_PORTALS, GUIDE_NODE, roverNode], [resourceInteractables, roverNode, structureColliders])
  const blockers = useMemo(() => layout.filter((item) => item.itemId !== 'wild_sprout').map(worldPositionFromLayout), [layout])
  const villageSlots = useMemo(() => getAvailableVillageSlots(blockers), [blockers])
  const showVillageBeacon = useMemo(() => isVillageBeaconAvailable(blockers), [blockers])
  const groundDetailClearings = useMemo(() => [
    ...blockers.map((position) => ({ x: position[0], z: position[2], radius: 1.55 })),
    ...villageSlots.map((slot) => ({ x: slot.position[0], z: slot.position[1], radius: 1.48 })),
    ...(showVillageBeacon ? [{ x: VILLAGE_BEACON_POSITION[0], z: VILLAGE_BEACON_POSITION[1], radius: 1.4 }] : []),
    ...RESOURCE_NODES.map((item) => ({ x: item.position[0], z: item.position[2], radius: .9 })),
    ...MISSION_PORTALS.map((item) => ({ x: item.position[0], z: item.position[2], radius: 1.35 })),
    { x: GUIDE_NODE.position[0], z: GUIDE_NODE.position[2], radius: .8 },
    { x: ROVER_NODE.position[0], z: ROVER_NODE.position[2], radius: 1.05 },
  ], [blockers, showVillageBeacon, villageSlots])
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
    if (MISSION_PICKUP_RESERVED_POINTS.some(([pickupX, pickupZ]) => Math.hypot(x - pickupX, z - pickupZ) < 2)) return false
    if (isRiverWater(x, z) || isBridgeDeck(x, z) || terrainSlope(x, z) > .42) return false
    return true
  }, [blockers, showVillageBeacon, villageSlots])
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
      <Sparkles count={70} scale={[48, 20, 48]} position={[0, 9, 0]} size={1.25} color={palette.particle} speed={.12} />
      <DistantWorlds palette={palette} />
      <WorldTerrain
        palette={palette}
        villageSlots={villageSlots}
        showVillageBeacon={showVillageBeacon}
        detailClearings={groundDetailClearings}
        buildItem={buildItem}
        onBuildHover={(point) => setHoverPoint([point.x, terrainHeight(point.x, point.z), point.z])}
        onBuildCommit={(point) => {
          const nextPoint = [point.x, terrainHeight(point.x, point.z), point.z]
          setHoverPoint(nextPoint)
          if (isBuildPointValid(nextPoint)) onBuildAt?.(point.x, point.z)
          else onInvalidBuild?.()
        }}
      />

      {BIOME_PROP_POSITIONS.map(([x, z, scale], index) => <BiomeProp key={`${x}_${z}`} kind={palette.prop} position={[x, terrainHeight(x, z), z]} scale={scale} palette={palette} index={index} />)}
      {layout.map((item) => <PlacedStructure key={item.instanceId} item={item} selected={selectedStructureId === item.instanceId} nearby={nearbyStructureId === item.instanceId} onSelect={onSelectStructure} isPlanetOwner={isPlanetOwner} />)}
      {RESOURCE_NODES.map((node) => <ResourceNode key={node.id} node={node} palette={palette} />)}
      {dailyEventNode && <DailyEventMarker node={dailyEventNode} />}
      {MISSION_PORTALS.map((portal) => <MissionPortal key={portal.id} portal={portal} active={activeMission?.route === portal.route} />)}
      <LumiGuide palette={palette} />
      <RoverControl palette={palette} status={roverNode.status} />
      <Creature position={[5.8, .3, -5.3]} color={planet?.theme === 'ocean' ? '#7ccde8' : '#a9e68b'} />
      <Creature position={[8.2, .45, -6.9]} color={planet?.theme === 'crystal' ? '#c3a0ef' : '#f2bd8b'} index={2} />

      {pickups.map((pickup, index) => (
        <Float key={pickup.id} speed={2.2 + index * .06} floatIntensity={.38} position={pickup.position}>
          <mesh castShadow><icosahedronGeometry args={[.36, 0]} /><meshStandardMaterial color={activeMission.route === 'comet' ? '#ff9f5a' : activeMission.route === 'ruins' ? '#64efff' : '#c59aff'} emissive={activeMission.route === 'comet' ? '#d54c17' : '#5940b8'} emissiveIntensity={2.2} toneMapped={false} /></mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.52, .62, 20]} /><meshBasicMaterial color="#c5f7ff" transparent opacity={.35} /></mesh>
        </Float>
      ))}

      {buildItem && hoverPoint && (
        <group position={hoverPoint}>
          <mesh position={[0, .06, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.15, 1.38, 32]} /><meshBasicMaterial color={hoverValid ? '#63f5b0' : '#ff7182'} transparent opacity={.9} depthWrite={false} /></mesh>
          <group position={[0, .08, 0]}><StructureModel itemId={buildItem} ghost /></group>
        </group>
      )}

      {nearbyPromptPos && !buildItem && !paused && (
        <Html position={nearbyPromptPos} center zIndexRange={[100, 0]}>
          <InteractionPrompt nearby={nearby} onInteract={onInteract} onInspect={onInspectStructure} />
        </Html>
      )}

      {remotePlayers.map((player) => <RemoteAstronaut key={player.uid} player={player} showName={nearbyRemoteUids?.has(player.uid)} />)}
      <Astronaut inputRef={inputRef} interactables={interactables} blockers={playerBlockers} structureColliders={structureColliders} pickups={pickups} paused={paused} freeLookEnabled={!buildItem} onNearbyChange={onNearbyChange} onCollect={onCollect} onPositionChange={onPlayerPositionChange} displayName={localPlayerName} showName={Boolean(nearbyRemoteUids?.size)} speech={localSpeech} isFirstPerson={isFirstPerson} setIsFirstPerson={setIsFirstPerson} />
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

function MiniMap({ playerPosition, nearby, dailyEventNode }) {
  const playerLeft = 50 + THREE.MathUtils.clamp(playerPosition.x / WORLD_RADIUS, -1, 1) * 44
  const playerTop = 50 + THREE.MathUtils.clamp(playerPosition.z / WORLD_RADIUS, -1, 1) * 44
  const dailyVisual = dailyEventNode ? resolveDailyEventVisual(dailyEventNode.dailyEvent) : null
  const dailyLeft = dailyEventNode ? 50 + dailyEventNode.position[0] / WORLD_RADIUS * 43 : 0
  const dailyTop = dailyEventNode ? 50 + dailyEventNode.position[2] / WORLD_RADIUS * 43 : 0
  return (
    <div className="frontier-minimap" aria-label="행성 구역 미니맵">
      <header><span>PLANET MAP</span><strong>{nearby?.kind === 'daily' ? '사건 현장' : dailyEventNode ? '오늘 사건' : nearby ? '신호 감지' : '구역 탐색'}</strong></header>
      <div className="frontier-minimap-field">
        <i className="frontier-minimap-orbit" />
        {ZONES.map((zone) => (
          <span key={zone.id} className={`frontier-map-zone zone-${zone.id}`} style={{ left: `${50 + zone.position[0] / WORLD_RADIUS * 43}%`, top: `${50 + zone.position[1] / WORLD_RADIUS * 43}%`, '--zone-color': zone.color }} title={zone.label}>
            <i />
            <small>{zone.shortLabel}</small>
          </span>
        ))}
        {dailyEventNode && (
          <span
            className="frontier-map-zone frontier-map-daily-event"
            style={{ left: `${dailyLeft}%`, top: `${dailyTop}%`, '--zone-color': dailyVisual.color, zIndex: 2 }}
            title={dailyEventNode.label}
            aria-label={`오늘의 행성 사건: ${dailyEventNode.label}`}
          >
            <i style={{ width: 10, height: 10, borderWidth: 2, boxShadow: `0 0 12px ${dailyVisual.color}` }} />
            <small>오늘</small>
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
        <b className="frontier-map-player" style={{ left: `${playerLeft}%`, top: `${playerTop}%` }} />
      </div>
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
}

function InteractionPrompt({ nearby, onInteract, onInspect }) {
  const Graphic = nearby.kind === 'daily' ? SparklesIcon : nearby.kind === 'portal' ? Compass : INTERACTION_ICONS[nearby.actionId] || SparklesIcon
  const isStructure = nearby.kind === 'structure'
  return (
    <div
      className="frontier-interaction-prompt touch-clickable-prompt"
      onClick={() => onInteract?.()}
      role="button"
      tabIndex={0}
      title="터치 또는 클릭하여 상호작용 실행"
    >
      <span>{createElement(Graphic, { size: 19, 'aria-hidden': true })}</span>
      <div>
        <small>{nearby.kind === 'daily' ? '오늘의 현장 사건' : nearby.kind === 'structure' ? '행성 시설' : nearby.kind === 'guide' ? '루미 안내소' : nearby.kind === 'portal' ? '45초 탐사 출발대' : nearby.kind === 'rover' ? '로버 원정 관리' : '행성 상호작용'}</small>
        <strong>{nearby.label} 👆</strong>
      </div>
      {isStructure ? (
        <div className="frontier-interaction-keys" aria-label="객체 조작 키">
          <button type="button" className="touch-key-btn" onClick={(e) => { e.stopPropagation(); onInteract?.(); }}>
            <kbd>E</kbd><em>행동</em>
          </button>
          <button type="button" className="touch-key-btn" onClick={(e) => { e.stopPropagation(); onInspect?.(); }}>
            <kbd>F</kbd><em>정보</em>
          </button>
        </div>
      ) : (
        <div className="frontier-interaction-keys">
          <button type="button" className="touch-key-btn" onClick={(e) => { e.stopPropagation(); onInteract?.(); }}>
            <kbd>E</kbd><em>실행</em>
          </button>
        </div>
      )}
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
  dailyEvent,
  missionReady,
  missionCooldownLabel,
  selectedBuildItem,
  onCancelBuild,
  onBuildAt,
  onWorldAction,
  onDailyEventComplete,
  onMissionComplete,
  onSelectStructure,
  onStructureMission,
  selectedStructureId,
  onMessage,
  paused = false,
  onOpenBriefing,
  onOpenRover,
  roverStatus = 'idle',
  roverStatusLabel = '',
  remotePlayers = [],
  localPlayerName = '탐사원',
  localSpeech = null,
  liveConnected = false,
  presenceError = '',
  onPlayerTransform,
  onSendSpeech,
  isPlanetOwner = false,
}) {
  const inputRef = useRef({ x: 0, z: 0 })
  const [nearby, setNearby] = useState(null)
  const [isFirstPerson, setIsFirstPerson] = useState(false)
  const [playerPosition, setPlayerPosition] = useState({ x: 0, z: 5, yaw: 0 })
  const [activeMission, setActiveMission] = useState(null)
  const [collectedIds, setCollectedIds] = useState(new Set())
  const [missionRemainingMs, setMissionRemainingMs] = useState(0)
  const [completionStatus, setCompletionStatus] = useState('idle')
  const missionRemainingRef = useRef(0)
  const completingRef = useRef(false)
  const dailyEventNode = useMemo(() => resolvePendingDailyEventNode(dailyEvent), [dailyEvent])
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
    missionRemainingRef.current = 45000
    setMissionRemainingMs(45000)
    setCompletionStatus('idle')
    setActiveMission({ route, startedAtMs, operationId: createMissionOperationId() })
    onMessage?.('탐사가 시작됐어요. 주변에 나타난 빛나는 조각 5개를 몸으로 지나가 모으세요.')
  }, [activeMission, missionCooldownLabel, missionReady, onMessage])

  const interact = useCallback(() => {
    if (!nearby || paused) return
    if (nearby.kind === 'portal') startMission(nearby.route)
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
    else onWorldAction?.(nearby)
  }, [dailyEvent, nearby, onDailyEventComplete, onOpenBriefing, onOpenRover, onStructureMission, onWorldAction, paused, startMission])

  const inspectStructure = useCallback(() => {
    if (paused || nearby?.kind !== 'structure') return
    onSelectStructure?.(nearby.item)
  }, [nearby, onSelectStructure, paused])

  useEffect(() => {
    const keydown = (event) => {
      if (event.repeat || paused || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return
      if (event.code !== 'KeyE' && event.code !== 'KeyF' && event.code !== 'KeyV') return
      event.preventDefault()
      if (event.code === 'KeyE') interact()
      else if (event.code === 'KeyF') inspectStructure()
      else if (event.code === 'KeyV') setIsFirstPerson((prev) => !prev)
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [inspectStructure, interact, paused])

  useEffect(() => {
    if (!activeMission || paused || collectedIds.size >= 5) return undefined
    const endsAtMs = Date.now() + missionRemainingRef.current

    const updateRemaining = () => {
      const remainingMs = Math.max(0, endsAtMs - Date.now())
      missionRemainingRef.current = remainingMs
      setMissionRemainingMs(remainingMs)
      if (remainingMs > 0) return

      window.clearInterval(timer)
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
    completingRef.current = true
    setCompletionStatus('submitting')

    try {
      const result = await onMissionComplete?.(activeMission.route, activeMission.operationId)
      if (result === null || result === false) throw new Error('mission completion rejected')
      setActiveMission(null)
      setCollectedIds(new Set())
      missionRemainingRef.current = 0
      setMissionRemainingMs(0)
      setCompletionStatus('idle')
    } catch {
      setCompletionStatus('failed')
      onMessage?.('보상 통신이 끊겼습니다. 수집 기록은 보존했어요. 다시 요청해 주세요.')
    } finally {
      completingRef.current = false
    }
  }, [activeMission, collectedIds.size, onMessage, onMissionComplete])

  useEffect(() => {
    if (!activeMission || collectedIds.size < 5 || completionStatus !== 'idle') return
    requestMissionCompletion()
  }, [activeMission, collectedIds.size, completionStatus, requestMissionCompletion])

  const retryMissionCompletion = useCallback(() => {
    if (!activeMission || collectedIds.size < 5 || completingRef.current) return
    setCompletionStatus('idle')
  }, [activeMission, collectedIds.size])

  const collect = useCallback((id) => setCollectedIds((current) => current.has(id) ? current : new Set([...current, id])), [])

  return (
    <div className={`frontier-game-stage${paused ? ' paused' : ''}`} onContextMenu={(event) => event.preventDefault()}>
      <Canvas
        shadows
        frameloop={paused ? 'demand' : 'always'}
        dpr={[1, 1.5]}
        camera={{ position: [6, 5.4, 12], fov: 48, near: .1, far: 120 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.04
        }}
      >
        <FrontierScene
          planet={planet}
          selectedStructureId={selectedStructureId}
          nearbyStructureId={nearby?.kind === 'structure' ? nearby.id : ''}
          onSelectStructure={onSelectStructure}
          inputRef={inputRef}
          paused={paused}
          onNearbyChange={setNearby}
          activeMission={activeMission}
          collectedIds={collectedIds}
          onCollect={collect}
          onPlayerPositionChange={publishPlayerTransform}
          buildItem={selectedBuildItem}
          onBuildAt={onBuildAt}
          onInvalidBuild={() => onMessage?.('시설과 항로에서 조금 떨어진 평평한 자리를 골라주세요.')}
          roverStatus={roverStatus}
          roverStatusLabel={roverStatusLabel}
          dailyEventNode={dailyEventNode}
          remotePlayers={remotePlayers}
          nearbyRemoteUids={nearbyRemoteUids}
          localPlayerName={localPlayerName}
          localSpeech={localSpeech}
          isPlanetOwner={isPlanetOwner}
          isFirstPerson={isFirstPerson}
          setIsFirstPerson={setIsFirstPerson}
          nearby={nearby}
          onInteract={interact}
          onInspectStructure={inspectStructure}
        />
      </Canvas>

      <MiniMap playerPosition={playerPosition} nearby={nearby} dailyEventNode={dailyEventNode} />
      <button
        type="button"
        className="frontier-camera-mode-toggle"
        onClick={() => setIsFirstPerson((prev) => !prev)}
        title="1인칭/3인칭 시점 전환 (단축키: V)"
      >
        {isFirstPerson ? '🛸 3인칭 시점 (V)' : '👁️ 1인칭 시점 (V)'}
      </button>
      <div className={`frontier-live-status${liveConnected ? ' online' : ' offline'}`} title={presenceError || (liveConnected ? '같은 행성 접속자와 실시간 연결됨' : '실시간 대화 연결 없음')}>
        <i />
        <span>{liveConnected ? `온라인 ${remotePlayers.length}명` : '실시간 오프라인'}</span>
      </div>
      {closestRemotePlayer && liveConnected && (
        <ProximityChat key={closestRemotePlayer.uid} peer={closestRemotePlayer} onSend={onSendSpeech} errorMessage={presenceError} />
      )}
      {activeMission && (
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
      {selectedBuildItem && (
        <div className="frontier-build-mode">
          <strong>실제 시설 모형으로 자리를 확인하세요</strong>
          <span>초록색은 건설 가능 · 붉은색은 다른 자리 필요</span>
          <button type="button" onClick={onCancelBuild}>취소</button>
        </div>
      )}
      <div className="frontier-control-hint"><kbd>WASD · 방향키</kbd><span>방향 전환 후 전진</span><kbd>V</kbd><span>1인칭/3인칭 시점</span><kbd>E</kbd><span>미션·상호작용</span><kbd>F</kbd><span>객체 정보</span></div>
      <TouchJoystick inputRef={inputRef} disabled={paused} />
    </div>
  )
}
