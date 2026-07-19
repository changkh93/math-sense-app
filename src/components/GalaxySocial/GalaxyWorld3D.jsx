import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float, Sparkles } from '@react-three/drei'
import { Bot, Compass, Flower2, Gem, Radio, Sparkles as SparklesIcon, Sprout, Wrench } from 'lucide-react'
import * as THREE from 'three'
import { GALAXY_MISSION_ROUTES } from '../../utils/galaxyGame'

const WORLD_RADIUS = 20
const BUILD_RADIUS = 14.2
const createMissionOperationId = () => globalThis.crypto?.randomUUID?.()
  || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
const PLAYER_SPEED = 6

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

const ZONES = [
  { id: 'landing', label: '착륙장', shortLabel: '착륙', position: [0, 5], color: '#7cf2bd' },
  { id: 'habitat', label: '주거 구역', shortLabel: '기지', position: [-7.5, -4.5], color: '#74c7ff' },
  { id: 'ecology', label: '생태 구역', shortLabel: '생태', position: [6.8, -6.2], color: '#8df2a7' },
  { id: 'expedition', label: '탐사 구역', shortLabel: '탐사', position: [8.7, 5.4], color: '#c89cff' },
  { id: 'plaza', label: '친구 광장', shortLabel: '광장', position: [-8.8, 7], color: '#ffd17c' },
]

const TERRACES = [
  { position: [-7.5, -4.5], radius: 4.2, height: .22 },
  { position: [6.8, -6.2], radius: 4.6, height: .3 },
  { position: [8.7, 5.4], radius: 4.1, height: .42 },
  { position: [-8.8, 7], radius: 3.9, height: .18 },
]

const RESOURCE_NODES = [
  { id: 'crystal_north', kind: 'resource', actionId: 'crystal', label: '수정 파편 채집', position: [9.2, .8, 7.8] },
  { id: 'fiber_grove', kind: 'resource', actionId: 'fiber', label: '루멘 섬유 채집', position: [7.8, .7, -7.3] },
  { id: 'ancient_scrap', kind: 'resource', actionId: 'salvage', label: '고대 합금 회수', position: [11.7, .8, 3.2] },
  { id: 'broken_beacon', kind: 'resource', actionId: 'beacon', label: '끊어진 신호기 수리', position: [-10.5, .55, 7.4] },
  { id: 'wild_soil', kind: 'resource', actionId: 'plant', label: '루멘 새싹 심기', position: [4.8, .45, -8.7] },
]

const GUIDE_NODE = { id: 'lumi_guide', kind: 'guide', actionId: 'guide', label: '루미의 귀환 브리핑 듣기', position: [1.5, 1.1, 4.4] }

const MISSION_PORTALS = [
  { id: 'portal_nebula', kind: 'portal', route: 'nebula', label: '성운 생태 항로 시작', position: [-12.2, .85, 1.5] },
  { id: 'portal_comet', kind: 'portal', route: 'comet', label: '혜성 구조 항로 시작', position: [1.2, .85, -12.4] },
  { id: 'portal_ruins', kind: 'portal', route: 'ruins', label: '고대 정거장 항로 시작', position: [12.4, .85, .2] },
]

const MISSION_PICKUPS = {
  nebula: [[-10, -7], [-5, -11], [1, -10], [6, -8], [10, -3], [7, 3], [-1, 7], [-8, 3]],
  comet: [[-11, 2], [-8, 8], [-3, 11], [3, 9], [9, 7], [11, 1], [6, -4], [-3, -5]],
  ruins: [[-10, -6], [-5, -9], [2, -11], [8, -7], [11, -1], [7, 6], [0, 9], [-8, 6]],
}

const BIOME_PROP_POSITIONS = [
  [-15, -9, .7], [-11.5, -13, 1.1], [-5, -15, .65], [4, -15.3, 1.2], [12, -11.5, .7], [15, -5, 1],
  [15.5, 7, .8], [12, 12.8, 1.1], [4, 15.6, .7], [-5, 15.4, 1], [-13, 12, .75], [-15.5, 3, 1.15],
  [-3.7, -9.5, .55], [3.5, -10.5, .55], [10.2, 10.2, .5], [-10.8, -7.5, .6],
]

function terrainHeight(x, z) {
  let height = 0
  TERRACES.forEach((terrace) => {
    const distance = Math.hypot(x - terrace.position[0], z - terrace.position[1])
    if (distance < terrace.radius - .45) height = Math.max(height, terrace.height)
  })
  return height
}

function worldPositionFromLayout(item = {}) {
  return [
    THREE.MathUtils.clamp((Number(item.x || 50) - 50) / 3, -15, 15),
    0,
    THREE.MathUtils.clamp((Number(item.y || 50) - 50) / 3, -15, 15),
  ]
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
      <mesh position={[0, .65, 0]} castShadow={!ghost}><cylinderGeometry args={[.16, .25, 1.3, 9]} /><ModelMaterial color="#79543d" roughness={.9} ghost={ghost} /></mesh>
      <mesh position={[0, 1.55, 0]} scale={[.95, 1.05, .95]} castShadow={!ghost}><dodecahedronGeometry args={[.78, 1]} /><ModelMaterial color={color} emissive="#174c31" emissiveIntensity={.22} roughness={.78} ghost={ghost} /></mesh>
      <mesh position={[-.42, 1.95, .08]} scale={.72} castShadow={!ghost}><dodecahedronGeometry args={[.62, 1]} /><ModelMaterial color="#8be8a5" emissive="#1e5c39" emissiveIntensity={.28} roughness={.76} ghost={ghost} /></mesh>
      <mesh position={[.44, 1.85, -.08]} scale={.64} castShadow={!ghost}><dodecahedronGeometry args={[.62, 1]} /><ModelMaterial color="#6ed794" emissive="#1e5c39" emissiveIntensity={.24} roughness={.76} ghost={ghost} /></mesh>
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
        <mesh position={[0, .72, 0]} castShadow={!ghost}><boxGeometry args={[2.15, 1.4, 1.75]} /><meshPhysicalMaterial color={ghost ? '#71f3bf' : '#8fffd1'} transparent opacity={ghost ? .35 : .35} roughness={.12} metalness={.05} depthWrite={!ghost} /></mesh>
        <mesh position={[0, 1.62, 0]} rotation={[0, 0, Math.PI / 4]} castShadow={!ghost}><boxGeometry args={[1.5, 1.5, 1.78]} /><ModelMaterial color="#c8fff0" metalness={.35} roughness={.3} ghost={ghost} /></mesh>
        {[-.55, 0, .55].map((x) => <mesh key={x} position={[x, .28, .22]}><sphereGeometry args={[.25, 12, 9]} /><ModelMaterial color="#77dc86" emissive="#1b5730" emissiveIntensity={.35} ghost={ghost} /></mesh>)}
      </group>
    )
  }
  if (itemId === 'rover_bay') {
    return (
      <group>
        <mesh position={[0, .35, 0]} castShadow={!ghost}><boxGeometry args={[2.25, .7, 1.75]} /><ModelMaterial color="#3b4f65" metalness={.7} roughness={.3} ghost={ghost} /></mesh>
        <mesh position={[0, 1.22, -.35]} rotation={[0, 0, -.12]} castShadow={!ghost}><boxGeometry args={[2.05, .16, 1.5]} /><ModelMaterial color="#7388a2" metalness={.8} roughness={.22} ghost={ghost} /></mesh>
        <mesh position={[0, .6, .92]}><boxGeometry args={[1.2, .2, .08]} /><ModelMaterial color="#ffaf65" emissive="#a94817" emissiveIntensity={1.3} ghost={ghost} /></mesh>
        {[-.72, .72].map((x) => <mesh key={x} position={[x, .18, .68]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.22, .08, 8, 16]} /><ModelMaterial color="#1b2635" metalness={.55} ghost={ghost} /></mesh>)}
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
        <mesh position={[0, .28, 0]} castShadow={!ghost}><cylinderGeometry args={[1.25, 1.42, .55, 20]} /><ModelMaterial color="#405a55" roughness={.75} ghost={ghost} /></mesh>
        <mesh position={[0, .95, -.18]} scale={[1.12, .8, .9]} castShadow={!ghost}><sphereGeometry args={[.9, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2]} /><ModelMaterial color="#c7e99c" emissive="#38612b" emissiveIntensity={.2} ghost={ghost} /></mesh>
        <mesh position={[0, .58, .72]}><circleGeometry args={[.4, 18]} /><ModelMaterial color="#223b3b" ghost={ghost} /></mesh>
      </group>
    )
  }
  if (itemId === 'signal_plaza') {
    return (
      <group>
        <mesh position={[0, .1, 0]} receiveShadow><cylinderGeometry args={[1.65, 1.8, .2, 28]} /><ModelMaterial color="#41556d" metalness={.45} roughness={.45} ghost={ghost} /></mesh>
        <mesh position={[0, 1.02, 0]} castShadow={!ghost}><cylinderGeometry args={[.12, .24, 1.85, 10]} /><ModelMaterial color="#8092ad" metalness={.8} ghost={ghost} /></mesh>
        {[.62, 1.02, 1.42].map((y, index) => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, index * .4]}><torusGeometry args={[.42 + index * .12, .035, 8, 28]} /><ModelMaterial color="#a997ff" emissive="#664ac8" emissiveIntensity={1.5} ghost={ghost} /></mesh>)}
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

function PlacedStructure({ item, selected, onSelect }) {
  const position = worldPositionFromLayout(item)
  position[1] = terrainHeight(position[0], position[2])
  return (
    <group position={position} rotation={[0, THREE.MathUtils.degToRad(Number(item.rotation || 0)), 0]} onClick={(event) => { event.stopPropagation(); onSelect?.(item) }}>
      <StructureModel itemId={item.itemId} />
      {selected && (
        <mesh position={[0, .07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.5, 1.72, 36]} />
          <meshBasicMaterial color="#6ce7ff" transparent opacity={.9} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

function PathSegment({ from, to, color }) {
  const dx = to[0] - from[0]
  const dz = to[1] - from[1]
  const length = Math.hypot(dx, dz)
  const angle = Math.atan2(dx, dz)
  return (
    <group position={[(from[0] + to[0]) / 2, .08, (from[1] + to[1]) / 2]} rotation={[0, angle, 0]}>
      <mesh receiveShadow><boxGeometry args={[1.22, .12, length]} /><meshStandardMaterial color={color} roughness={.95} /></mesh>
      {[-.48, .48].map((x) => <mesh key={x} position={[x, .08, 0]}><boxGeometry args={[.035, .04, length * .96]} /><meshStandardMaterial color="#d9fff4" emissive={color} emissiveIntensity={.35} /></mesh>)}
    </group>
  )
}

function LandingPad({ palette }) {
  return (
    <group position={[0, .08, 5]}>
      <mesh receiveShadow><cylinderGeometry args={[2.45, 2.65, .18, 36]} /><meshStandardMaterial color="#33495b" metalness={.45} roughness={.55} /></mesh>
      <mesh position={[0, .11, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.45, 2.04, 40]} /><meshBasicMaterial color={palette.glow} transparent opacity={.55} /></mesh>
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((rotation) => <mesh key={rotation} position={[Math.sin(rotation) * 2.15, .2, Math.cos(rotation) * 2.15]}><boxGeometry args={[.16, .12, .48]} /><meshStandardMaterial color={palette.accent} emissive={palette.glow} emissiveIntensity={1.2} /></mesh>)}
      <group position={[-.65, .38, -.15]} rotation={[0, -.35, 0]}>
        <mesh><boxGeometry args={[1.25, .48, .85]} /><meshStandardMaterial color="#dcecf2" metalness={.45} roughness={.35} /></mesh>
        <mesh position={[.12, .45, 0]}><boxGeometry args={[.72, .42, .62]} /><meshStandardMaterial color="#6bdcf8" emissive="#185e78" emissiveIntensity={.45} metalness={.4} /></mesh>
        {[-.42, .42].flatMap((x) => [-.36, .36].map((z) => <mesh key={`${x}_${z}`} position={[x, -.25, z]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.18, .07, 8, 16]} /><meshStandardMaterial color="#172230" metalness={.7} /></mesh>))}
      </group>
    </group>
  )
}

function BiomeProp({ kind, position, scale = 1, palette, index }) {
  if (kind === 'forest') return <group position={position} rotation={[0, index * .63, 0]}><RoundedLumenTree scale={scale * .8} color={index % 2 ? '#58bf79' : '#6bd78f'} /></group>
  if (kind === 'ocean') {
    return (
      <group position={position} scale={scale} rotation={[0, index * .55, 0]}>
        {[-.45, 0, .42].map((x, i) => <mesh key={x} position={[x, .48 + i * .16, 0]} rotation={[0, 0, i === 1 ? .12 : -.16]} castShadow><capsuleGeometry args={[.13 + i * .03, .7 + i * .2, 5, 8]} /><meshStandardMaterial color={i === 1 ? '#58e0b3' : '#7d8fe8'} emissive={i === 1 ? '#17654d' : '#31346f'} emissiveIntensity={.35} roughness={.7} /></mesh>)}
        <mesh position={[0, .08, 0]}><cylinderGeometry args={[.72, .9, .16, 14]} /><meshStandardMaterial color="#24516a" roughness={.9} /></mesh>
      </group>
    )
  }
  if (kind === 'crystal') return <group position={position} rotation={[0, index * .4, 0]}><CrystalCluster color={index % 2 ? '#ce8eff' : '#78e5ff'} scale={scale * .8} /></group>
  if (kind === 'desert') {
    return (
      <group position={position} scale={scale} rotation={[0, index * .77, -.06]}>
        <mesh position={[0, .55, 0]} castShadow><capsuleGeometry args={[.35, .9, 6, 10]} /><meshStandardMaterial color="#b4774e" roughness={.95} /></mesh>
        <mesh position={[.28, .55, 0]} rotation={[0, 0, -.65]}><capsuleGeometry args={[.12, .45, 5, 8]} /><meshStandardMaterial color="#d09458" roughness={.9} /></mesh>
      </group>
    )
  }
  if (kind === 'mechanical') {
    return (
      <group position={position} scale={scale} rotation={[0, index * .48, 0]}>
        <mesh position={[0, .6, 0]} castShadow><cylinderGeometry args={[.22, .42, 1.2, 8]} /><meshStandardMaterial color="#536b78" metalness={.8} roughness={.3} /></mesh>
        <mesh position={[0, 1.25, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.42, .08, 8, 20]} /><meshStandardMaterial color={palette.glow} emissive={palette.glow} emissiveIntensity={.9} metalness={.65} /></mesh>
      </group>
    )
  }
  return (
    <group position={position} scale={scale} rotation={[0, index * .5, .08]}>
      <mesh position={[0, .7, 0]} castShadow><octahedronGeometry args={[.78, 0]} /><meshPhysicalMaterial color="#c9f6ff" transparent opacity={.75} roughness={.12} metalness={.2} /></mesh>
      <mesh position={[.48, .32, .14]} scale={.55} castShadow><octahedronGeometry args={[.66, 0]} /><meshPhysicalMaterial color="#8ed8f4" transparent opacity={.7} roughness={.15} /></mesh>
    </group>
  )
}

function Creature({ position, color, index = 0 }) {
  const group = useRef()
  useFrame((state) => {
    if (!group.current) return
    group.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.4 + index) * .08
    group.current.rotation.y = Math.sin(state.clock.elapsedTime * .32 + index) * .35 + index
  })
  return (
    <group ref={group} position={position}>
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
  useFrame((state) => {
    if (!group.current) return
    group.current.position.y = 1.2 + Math.sin(state.clock.elapsedTime * 1.8) * .12
    group.current.rotation.y = Math.sin(state.clock.elapsedTime * .7) * .18
  })
  return (
    <group ref={group} position={[1.5, 1.2, 4.4]}>
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
  const [x, y, z] = node.position
  if (node.actionId === 'crystal') return <group position={[x, y, z]}><CrystalCluster color={palette.glow} /><ResourceHalo color={palette.glow} /></group>
  if (node.actionId === 'fiber') return <group position={[x, y, z]}><RoundedLumenTree scale={.72} color={palette.glow} /><Sparkles count={8} scale={[2, 2.5, 2]} color={palette.particle} size={1.5} speed={.25} /><ResourceHalo color="#7cf2bd" /></group>
  if (node.actionId === 'salvage') return <group position={[x, y, z]} rotation={[0, .6, -.12]}><mesh position={[0, .45, 0]} castShadow><dodecahedronGeometry args={[.82, 0]} /><meshStandardMaterial color="#56677a" metalness={.85} roughness={.3} /></mesh><mesh position={[.2, .5, .62]}><boxGeometry args={[.9, .16, .1]} /><meshStandardMaterial color="#ffb167" emissive="#a34819" emissiveIntensity={1.2} /></mesh><ResourceHalo color="#ffb167" /></group>
  if (node.actionId === 'beacon') return <group position={[x, y, z]}><mesh position={[0, .8, 0]} rotation={[0, 0, .18]} castShadow><cylinderGeometry args={[.14, .3, 1.7, 9]} /><meshStandardMaterial color="#71859a" metalness={.78} /></mesh><Float speed={1.6} floatIntensity={.14}><mesh position={[0, 1.75, 0]}><sphereGeometry args={[.24, 12, 9]} /><meshStandardMaterial color="#ff8279" emissive="#ff312b" emissiveIntensity={2.4} toneMapped={false} /></mesh></Float><ResourceHalo color="#ff8279" /></group>
  return <group position={[x, y, z]}><mesh position={[0, .04, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[1.12, 24]} /><meshStandardMaterial color="#76583d" roughness={1} /></mesh><group position={[0, .2, 0]}><RoundedLumenTree scale={.28} color="#82e99c" /></group><ResourceHalo color="#8df2a7" /></group>
}

function MissionPortal({ portal, active }) {
  const color = portal.route === 'nebula' ? '#b08cff' : portal.route === 'comet' ? '#ff9a5c' : '#68e9ff'
  return (
    <group position={portal.position}>
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

function WorldTerrain({ palette }) {
  return (
    <group>
      <mesh position={[0, -1.28, 0]} receiveShadow><cylinderGeometry args={[WORLD_RADIUS, WORLD_RADIUS - 2.3, 2.55, 64]} /><meshStandardMaterial color={palette.edge} roughness={.94} /></mesh>
      <mesh position={[0, -.1, 0]} receiveShadow><cylinderGeometry args={[WORLD_RADIUS, WORLD_RADIUS, .36, 64]} /><meshStandardMaterial color={palette.ground} roughness={.92} /></mesh>
      <mesh position={[0, -1.04, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[39, 72]} /><meshPhysicalMaterial color={palette.water} transparent opacity={.73} roughness={.12} metalness={.05} /></mesh>
      {TERRACES.map((terrace) => (
        <mesh key={`${terrace.position[0]}_${terrace.position[1]}`} position={[terrace.position[0], terrace.height / 2, terrace.position[1]]} receiveShadow>
          <cylinderGeometry args={[terrace.radius, terrace.radius + .32, terrace.height, 42]} />
          <meshStandardMaterial color={palette.groundDeep} roughness={.94} />
        </mesh>
      ))}
      {ZONES.filter((zone) => zone.id !== 'landing').map((zone) => (
        <mesh key={zone.id} position={[zone.position[0], terrainHeight(zone.position[0], zone.position[1]) + .035, zone.position[1]]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.2, 2.27, 42]} />
          <meshBasicMaterial color={zone.color} transparent opacity={.25} depthWrite={false} />
        </mesh>
      ))}
      {ZONES.filter((zone) => zone.id !== 'landing').map((zone) => <PathSegment key={`path_${zone.id}`} from={[0, 2.8]} to={zone.position} color={palette.path} />)}
      <LandingPad palette={palette} />
    </group>
  )
}

function Astronaut({ inputRef, interactables, blockers, pickups, paused, onNearbyChange, onCollect, onPositionChange }) {
  const group = useRef()
  const body = useRef()
  const keys = useRef(new Set())
  const nearbyId = useRef('')
  const collectLock = useRef(new Set())
  const lastPublishAt = useRef(0)
  const { camera, size } = useThree()
  const cameraTarget = useMemo(() => new THREE.Vector3(), [])
  const lookTarget = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    const down = (event) => {
      if (paused || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return
      keys.current.add(event.code)
    }
    const up = (event) => keys.current.delete(event.code)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [paused])

  useEffect(() => {
    if (paused) {
      keys.current.clear()
      inputRef.current.x = 0
      inputRef.current.z = 0
    }
  }, [inputRef, paused])

  useFrame((state, delta) => {
    if (!group.current) return
    const keyboardX = paused ? 0 : (keys.current.has('KeyD') || keys.current.has('ArrowRight') ? 1 : 0) - (keys.current.has('KeyA') || keys.current.has('ArrowLeft') ? 1 : 0)
    const keyboardZ = paused ? 0 : (keys.current.has('KeyS') || keys.current.has('ArrowDown') ? 1 : 0) - (keys.current.has('KeyW') || keys.current.has('ArrowUp') ? 1 : 0)
    const moveX = paused ? 0 : keyboardX || Number(inputRef.current.x || 0)
    const moveZ = paused ? 0 : keyboardZ || Number(inputRef.current.z || 0)
    const length = Math.hypot(moveX, moveZ)
    const moving = length > .05
    if (moving) {
      const normalizedX = moveX / Math.max(1, length)
      const normalizedZ = moveZ / Math.max(1, length)
      const nextX = group.current.position.x + normalizedX * PLAYER_SPEED * delta
      const nextZ = group.current.position.z + normalizedZ * PLAYER_SPEED * delta
      const inWorld = Math.hypot(nextX, nextZ) < WORLD_RADIUS - 1
      const blocked = blockers.some((position) => Math.hypot(nextX - position[0], nextZ - position[2]) < 1.12)
      if (inWorld && !blocked) {
        group.current.position.x = nextX
        group.current.position.z = nextZ
      }
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, Math.atan2(normalizedX, normalizedZ), Math.min(1, delta * 10))
      if (body.current) body.current.position.y = .76 + Math.sin(state.clock.elapsedTime * 11) * .075
    } else if (body.current) body.current.position.y = THREE.MathUtils.lerp(body.current.position.y, .76, delta * 6)

    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, terrainHeight(group.current.position.x, group.current.position.z), Math.min(1, delta * 7))
    const player = group.current.position
    const portrait = size.height > size.width * 1.15
    const offset = portrait ? [7.2, 7.6, 9.6] : [5.8, 5.25, 6.9]
    cameraTarget.set(player.x + offset[0], player.y + offset[1], player.z + offset[2])
    camera.position.lerp(cameraTarget, Math.min(1, delta * 3.8))
    lookTarget.set(player.x, player.y + .68, player.z)
    camera.lookAt(lookTarget)

    if (!paused) {
      let nearest = null
      let nearestDistance = 2.5
      interactables.forEach((item) => {
        const distance = Math.hypot(player.x - item.position[0], player.z - item.position[2])
        if (distance < nearestDistance) { nearest = item; nearestDistance = distance }
      })
      const nextNearbyId = nearest?.id || ''
      if (nearbyId.current !== nextNearbyId) {
        nearbyId.current = nextNearbyId
        onNearbyChange(nearest)
      }

      pickups.forEach((pickup) => {
        if (collectLock.current.has(pickup.id)) return
        if (Math.hypot(player.x - pickup.position[0], player.z - pickup.position[2]) < .9) {
          collectLock.current.add(pickup.id)
          onCollect(pickup.id)
        }
      })
    } else if (nearbyId.current) {
      nearbyId.current = ''
      onNearbyChange(null)
    }

    const liveIds = new Set(pickups.map((pickup) => pickup.id))
    collectLock.current.forEach((id) => { if (!liveIds.has(id)) collectLock.current.delete(id) })
    if (state.clock.elapsedTime - lastPublishAt.current > .12) {
      lastPublishAt.current = state.clock.elapsedTime
      onPositionChange?.({ x: player.x, z: player.z })
    }
  })

  return (
    <group ref={group} position={[0, 0, 5]}>
      <group ref={body} position={[0, .76, 0]}>
        <mesh position={[0, .72, 0]} scale={[.9, 1.05, .82]} castShadow><capsuleGeometry args={[.38, .72, 8, 12]} /><meshStandardMaterial color="#e9f4f6" roughness={.38} /></mesh>
        <mesh position={[0, 1.58, 0]} castShadow><sphereGeometry args={[.52, 20, 14]} /><meshStandardMaterial color="#f0f8f8" metalness={.1} roughness={.28} /></mesh>
        <mesh position={[0, 1.56, .4]} scale={[1, .78, .38]}><sphereGeometry args={[.39, 20, 12]} /><meshPhysicalMaterial color="#65d9ff" transparent opacity={.66} metalness={.48} roughness={.07} /></mesh>
        <mesh position={[0, .9, -.4]} castShadow><boxGeometry args={[.68, .78, .32]} /><meshStandardMaterial color="#415678" metalness={.62} roughness={.28} /></mesh>
        {[-.3, .3].map((x) => <mesh key={`leg_${x}`} position={[x, .08, 0]} castShadow><capsuleGeometry args={[.13, .5, 6, 9]} /><meshStandardMaterial color="#d8e7ea" roughness={.42} /></mesh>)}
        {[-.52, .52].map((x) => <mesh key={`arm_${x}`} position={[x, .75, 0]} rotation={[0, 0, x < 0 ? -.16 : .16]} castShadow><capsuleGeometry args={[.11, .58, 6, 9]} /><meshStandardMaterial color="#e0edef" roughness={.4} /></mesh>)}
        <mesh position={[0, .83, .37]}><circleGeometry args={[.12, 14]} /><meshStandardMaterial color="#7cf2bd" emissive="#2a9b71" emissiveIntensity={1.2} /></mesh>
        <pointLight position={[0, 1.4, .65]} color="#78eaff" intensity={.35} distance={3} />
      </group>
      <group position={[.78, 1.25, -.18]}>
        <mesh castShadow><sphereGeometry args={[.18, 12, 9]} /><meshStandardMaterial color="#dcecf2" metalness={.5} roughness={.25} /></mesh>
        <mesh position={[0, 0, .16]}><sphereGeometry args={[.055, 8, 6]} /><meshStandardMaterial color="#7cf2bd" emissive="#4ee1a5" emissiveIntensity={2} /></mesh>
      </group>
      <mesh position={[0, .04, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[.56, 20]} /><meshBasicMaterial color="#000" transparent opacity={.22} /></mesh>
    </group>
  )
}

function FrontierScene({ planet, selectedStructureId, onSelectStructure, inputRef, paused, onNearbyChange, activeMission, collectedIds, onCollect, onPlayerPositionChange, buildItem, onBuildAt, onInvalidBuild }) {
  const layout = useMemo(() => Array.isArray(planet?.layout) ? planet.layout : [], [planet])
  const palette = BIOMES[planet?.theme] || BIOMES.forest
  const interactables = useMemo(() => [...RESOURCE_NODES, ...MISSION_PORTALS, GUIDE_NODE], [])
  const blockers = useMemo(() => layout.filter((item) => item.itemId !== 'wild_sprout').map(worldPositionFromLayout), [layout])
  const pickups = useMemo(() => {
    if (!activeMission) return []
    return (MISSION_PICKUPS[activeMission.route] || [])
      .map(([x, z], index) => ({ id: `${activeMission.route}_${index}`, position: [x, terrainHeight(x, z) + .9, z] }))
      .filter((pickup) => !collectedIds.has(pickup.id))
  }, [activeMission, collectedIds])
  const [hoverPoint, setHoverPoint] = useState(null)
  const isBuildPointValid = useCallback((point) => {
    if (!point) return false
    const [x, , z] = point
    if (Math.hypot(x, z) > BUILD_RADIUS) return false
    if (blockers.some((position) => Math.hypot(x - position[0], z - position[2]) < 2.1)) return false
    if ([...RESOURCE_NODES, ...MISSION_PORTALS].some((item) => Math.hypot(x - item.position[0], z - item.position[2]) < 2)) return false
    return true
  }, [blockers])
  const hoverValid = useMemo(() => isBuildPointValid(hoverPoint), [hoverPoint, isBuildPointValid])

  return (
    <>
      <color attach="background" args={[palette.sky]} />
      <fog attach="fog" args={[palette.fog, 24, 62]} />
      <hemisphereLight args={['#bfe7ff', palette.groundDeep, 1.45]} />
      <directionalLight position={[10, 16, 8]} intensity={2.1} color={palette.light} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-25} shadow-camera-right={25} shadow-camera-top={25} shadow-camera-bottom={-25} />
      <ambientLight intensity={.24} />
      <Sparkles count={70} scale={[48, 20, 48]} position={[0, 9, 0]} size={1.25} color={palette.particle} speed={.12} />
      <DistantWorlds palette={palette} />
      <WorldTerrain palette={palette} />

      {BIOME_PROP_POSITIONS.map(([x, z, scale], index) => <BiomeProp key={`${x}_${z}`} kind={palette.prop} position={[x, terrainHeight(x, z), z]} scale={scale} palette={palette} index={index} />)}
      {layout.map((item) => <PlacedStructure key={item.instanceId} item={item} selected={selectedStructureId === item.instanceId} onSelect={onSelectStructure} />)}
      {RESOURCE_NODES.map((node) => <ResourceNode key={node.id} node={node} palette={palette} />)}
      {MISSION_PORTALS.map((portal) => <MissionPortal key={portal.id} portal={portal} active={activeMission?.route === portal.route} />)}
      <LumiGuide palette={palette} />
      <Creature position={[5.8, .3, -5.3]} color={planet?.theme === 'ocean' ? '#7ccde8' : '#a9e68b'} />
      <Creature position={[8.2, .45, -6.9]} color={planet?.theme === 'crystal' ? '#c3a0ef' : '#f2bd8b'} index={2} />

      {pickups.map((pickup, index) => (
        <Float key={pickup.id} speed={2.2 + index * .06} floatIntensity={.38} position={pickup.position}>
          <mesh castShadow><icosahedronGeometry args={[.36, 0]} /><meshStandardMaterial color={activeMission.route === 'comet' ? '#ff9f5a' : activeMission.route === 'ruins' ? '#64efff' : '#c59aff'} emissive={activeMission.route === 'comet' ? '#d54c17' : '#5940b8'} emissiveIntensity={2.2} toneMapped={false} /></mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.52, .62, 20]} /><meshBasicMaterial color="#c5f7ff" transparent opacity={.35} /></mesh>
        </Float>
      ))}

      <mesh
        position={[0, .58, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={Boolean(buildItem)}
        onPointerMove={(event) => { event.stopPropagation(); setHoverPoint([event.point.x, terrainHeight(event.point.x, event.point.z), event.point.z]) }}
        onPointerDown={(event) => {
          if (!buildItem) return
          event.stopPropagation()
          const point = [event.point.x, terrainHeight(event.point.x, event.point.z), event.point.z]
          setHoverPoint(point)
          if (isBuildPointValid(point)) onBuildAt?.(event.point.x, event.point.z)
          else onInvalidBuild?.()
        }}
      >
        <circleGeometry args={[BUILD_RADIUS, 64]} />
        <meshBasicMaterial color="#5ee8ff" transparent opacity={buildItem ? .018 : 0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {buildItem && hoverPoint && (
        <group position={hoverPoint}>
          <mesh position={[0, .06, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.15, 1.38, 32]} /><meshBasicMaterial color={hoverValid ? '#63f5b0' : '#ff7182'} transparent opacity={.9} depthWrite={false} /></mesh>
          <group position={[0, .08, 0]}><StructureModel itemId={buildItem} ghost /></group>
        </group>
      )}

      <Astronaut inputRef={inputRef} interactables={interactables} blockers={blockers} pickups={pickups} paused={paused} onNearbyChange={onNearbyChange} onCollect={onCollect} onPositionChange={onPlayerPositionChange} />
    </>
  )
}

function TouchJoystick({ inputRef, disabled }) {
  const [vector, setVector] = useState({ x: 0, z: 0 })
  const baseRef = useRef()
  const update = (event) => {
    if (disabled) return
    const rect = baseRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = event.clientX - (rect.left + rect.width / 2)
    const y = event.clientY - (rect.top + rect.height / 2)
    const radius = rect.width * .34
    const length = Math.max(1, Math.hypot(x, y))
    const scale = Math.min(radius, length) / length
    const next = { x: x * scale / radius, z: y * scale / radius }
    inputRef.current.x = next.x
    inputRef.current.z = next.z
    setVector(next)
  }
  const stop = (event) => {
    try { event.currentTarget.releasePointerCapture(event.pointerId) } catch { /* already released */ }
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
      onPointerDown={(event) => { if (disabled) return; event.currentTarget.setPointerCapture(event.pointerId); update(event) }}
      onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) update(event) }}
      onPointerUp={stop}
      onPointerCancel={stop}
    >
      <i style={{ transform: `translate(${vector.x * 28}px,${vector.z * 28}px)` }} />
    </div>
  )
}

function MiniMap({ playerPosition, nearby }) {
  const playerLeft = 50 + THREE.MathUtils.clamp(playerPosition.x / WORLD_RADIUS, -1, 1) * 44
  const playerTop = 50 + THREE.MathUtils.clamp(playerPosition.z / WORLD_RADIUS, -1, 1) * 44
  return (
    <div className="frontier-minimap" aria-label="행성 구역 미니맵">
      <header><span>PLANET MAP</span><strong>{nearby ? '신호 감지' : '구역 탐색'}</strong></header>
      <div className="frontier-minimap-field">
        <i className="frontier-minimap-orbit" />
        {ZONES.map((zone) => (
          <span key={zone.id} className={`frontier-map-zone zone-${zone.id}`} style={{ left: `${50 + zone.position[0] / WORLD_RADIUS * 43}%`, top: `${50 + zone.position[1] / WORLD_RADIUS * 43}%`, '--zone-color': zone.color }} title={zone.label}>
            <i />
            <small>{zone.shortLabel}</small>
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
}

function InteractionPrompt({ nearby }) {
  const Graphic = nearby.kind === 'portal' ? Compass : INTERACTION_ICONS[nearby.actionId] || SparklesIcon
  return (
    <div className="frontier-interaction-prompt">
      <span>{createElement(Graphic, { size: 19, 'aria-hidden': true })}</span>
      <div><small>{nearby.kind === 'guide' ? 'LUMI GUIDE' : nearby.kind === 'portal' ? 'EXPEDITION GATE' : 'WORLD INTERACTION'}</small><strong>{nearby.label}</strong></div>
      <kbd>E</kbd>
    </div>
  )
}

export default function GalaxyWorld3D({
  planet,
  missionReady,
  missionCooldownLabel,
  selectedBuildItem,
  onCancelBuild,
  onBuildAt,
  onWorldAction,
  onMissionComplete,
  onSelectStructure,
  selectedStructureId,
  onMessage,
  paused = false,
  onOpenBriefing,
}) {
  const inputRef = useRef({ x: 0, z: 0 })
  const [nearby, setNearby] = useState(null)
  const [playerPosition, setPlayerPosition] = useState({ x: 0, z: 5 })
  const [activeMission, setActiveMission] = useState(null)
  const [collectedIds, setCollectedIds] = useState(new Set())
  const [missionRemainingMs, setMissionRemainingMs] = useState(0)
  const [completionStatus, setCompletionStatus] = useState('idle')
  const missionRemainingRef = useRef(0)
  const completingRef = useRef(false)

  const startMission = useCallback((route) => {
    if (!missionReady) { onMessage?.(`탐사선 정비 중 · ${missionCooldownLabel}`); return }
    if (activeMission) { onMessage?.('진행 중인 탐사를 먼저 완료하세요.'); return }
    const startedAtMs = Date.now()
    setCollectedIds(new Set())
    missionRemainingRef.current = 45000
    setMissionRemainingMs(45000)
    setCompletionStatus('idle')
    setActiveMission({ route, startedAtMs, operationId: createMissionOperationId() })
    onMessage?.(`${GALAXY_MISSION_ROUTES[route]?.label} 시작 · 신호 조각 5개를 모으세요.`)
  }, [activeMission, missionCooldownLabel, missionReady, onMessage])

  const interact = useCallback(() => {
    if (!nearby || paused) return
    if (nearby.kind === 'portal') startMission(nearby.route)
    else if (nearby.kind === 'guide') onOpenBriefing?.()
    else onWorldAction?.(nearby)
  }, [nearby, onOpenBriefing, onWorldAction, paused, startMission])

  useEffect(() => {
    const keydown = (event) => {
      if (event.code !== 'KeyE' || paused || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return
      event.preventDefault()
      interact()
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [interact, paused])

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
      onMessage?.('탐사 신호가 사라졌습니다. 관문에서 다시 도전할 수 있어요.')
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
    <div className={`frontier-game-stage${paused ? ' paused' : ''}`}>
      <Canvas
        shadows
        frameloop={paused ? 'demand' : 'always'}
        dpr={[1, 1.5]}
        camera={{ position: [6, 5.4, 12], fov: 48, near: .1, far: 120 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <FrontierScene
          planet={planet}
          selectedStructureId={selectedStructureId}
          onSelectStructure={onSelectStructure}
          inputRef={inputRef}
          paused={paused}
          onNearbyChange={setNearby}
          activeMission={activeMission}
          collectedIds={collectedIds}
          onCollect={collect}
          onPlayerPositionChange={setPlayerPosition}
          buildItem={selectedBuildItem}
          onBuildAt={onBuildAt}
          onInvalidBuild={() => onMessage?.('시설과 항로에서 조금 떨어진 평평한 자리를 골라주세요.')}
        />
      </Canvas>

      <MiniMap playerPosition={playerPosition} nearby={nearby} />
      {activeMission && (
        <div className="frontier-mission-hud">
          <span><Compass size={20} aria-hidden="true" /></span>
          <div>
            <small>{completionStatus === 'submitting' ? 'REWARD UPLINK' : completionStatus === 'failed' ? 'UPLINK INTERRUPTED' : 'ACTIVE EXPEDITION'}</small>
            <strong>{GALAXY_MISSION_ROUTES[activeMission.route]?.label} · {completionStatus === 'failed' ? '수집 기록 보존 · 재시도 필요' : `신호 조각 ${collectedIds.size}/5`}</strong>
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
      {!selectedBuildItem && nearby && !paused && <InteractionPrompt nearby={nearby} />}
      <div className="frontier-control-hint"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span>이동</span><kbd>E</kbd><span>상호작용</span></div>
      <TouchJoystick inputRef={inputRef} disabled={paused} />
      {nearby && !selectedBuildItem && !paused && (
        <button type="button" className="frontier-action-button" onClick={interact}>
          <span>{nearby.kind === 'guide' ? <Bot size={23} aria-hidden="true" /> : nearby.kind === 'portal' ? <Compass size={23} aria-hidden="true" /> : <SparklesIcon size={23} aria-hidden="true" />}</span>
          <strong>상호작용</strong>
        </button>
      )}
    </div>
  )
}
