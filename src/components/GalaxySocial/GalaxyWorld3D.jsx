import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { GALAXY_MISSION_ROUTES, GALAXY_THEMES, MATERIAL_LABELS } from '../../utils/galaxyGame'

const WORLD_RADIUS = 17
const PLAYER_SPEED = 5.8

const RESOURCE_NODES = [
  { id: 'crystal_north', kind: 'resource', actionId: 'crystal', label: '수정 파편 채집', icon: '◇', position: [-8, 0.45, -4] },
  { id: 'fiber_grove', kind: 'resource', actionId: 'fiber', label: '루멘 섬유 채집', icon: '♧', position: [7, 0.35, -6] },
  { id: 'ancient_scrap', kind: 'resource', actionId: 'salvage', label: '고대 합금 회수', icon: '⬡', position: [9, 0.4, 5] },
  { id: 'broken_beacon', kind: 'resource', actionId: 'beacon', label: '신호기 수리', icon: '⌁', position: [-9, 0.4, 7] },
  { id: 'wild_soil', kind: 'resource', actionId: 'plant', label: '루멘 새싹 심기', icon: '⌄', position: [2, 0.15, 9] },
]

const MISSION_PORTALS = [
  { id: 'portal_nebula', kind: 'portal', route: 'nebula', label: '성운 생태 항로 시작', position: [-12, 0.5, 0] },
  { id: 'portal_comet', kind: 'portal', route: 'comet', label: '혜성 구조 항로 시작', position: [0, 0.5, -12] },
  { id: 'portal_ruins', kind: 'portal', route: 'ruins', label: '고대 정거장 항로 시작', position: [12, 0.5, 0] },
]

const MISSION_PICKUPS = {
  nebula: [[-8, -7], [-4, -11], [1, -9], [6, -7], [8, -2], [5, 3], [-2, 5], [-7, 2]],
  comet: [[-10, 3], [-7, 8], [-2, 10], [3, 8], [9, 6], [10, 0], [5, -4], [-3, -5]],
  ruins: [[-9, -6], [-4, -8], [2, -10], [7, -6], [9, -1], [6, 5], [0, 7], [-7, 5]],
}

function worldPositionFromLayout(item = {}) {
  return [
    THREE.MathUtils.clamp((Number(item.x || 50) - 50) / 3, -15, 15),
    0,
    THREE.MathUtils.clamp((Number(item.y || 50) - 50) / 3, -15, 15),
  ]
}

function LowPolyTree({ scale = 1, color = '#52c878' }) {
  return (
    <group scale={scale}>
      <mesh position={[0, .7, 0]} castShadow><cylinderGeometry args={[.16, .24, 1.4, 7]} /><meshStandardMaterial color="#6b4935" roughness={1} /></mesh>
      <mesh position={[0, 1.65, 0]} castShadow><coneGeometry args={[.8, 1.65, 7]} /><meshStandardMaterial color={color} roughness={.85} /></mesh>
      <mesh position={[0, 2.25, 0]} castShadow><coneGeometry args={[.55, 1.2, 7]} /><meshStandardMaterial color="#8bf1a8" emissive="#205b38" emissiveIntensity={.25} /></mesh>
    </group>
  )
}

function PlacedStructure({ item, selected, onSelect }) {
  const position = worldPositionFromLayout(item)
  const rotation = [0, THREE.MathUtils.degToRad(Number(item.rotation || 0)), 0]
  const common = { position, rotation, onClick: (event) => { event.stopPropagation(); onSelect?.(item) } }
  let model

  if (item.itemId === 'starter_dome') {
    model = (
      <group {...common}>
        <mesh position={[0, .65, 0]} castShadow receiveShadow><sphereGeometry args={[1.35, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#d8ecff" metalness={.25} roughness={.35} /></mesh>
        <mesh position={[0, .18, 0]} castShadow><cylinderGeometry args={[1.35, 1.45, .38, 16]} /><meshStandardMaterial color="#273a5f" metalness={.7} roughness={.25} /></mesh>
        <mesh position={[0, .64, 1.05]}><boxGeometry args={[.65, .95, .22]} /><meshStandardMaterial color="#67e8f9" emissive="#188da2" emissiveIntensity={.65} /></mesh>
      </group>
    )
  } else if (item.itemId === 'lumen_tree' || item.itemId === 'wild_sprout') {
    model = <group {...common}><LowPolyTree scale={item.itemId === 'wild_sprout' ? .48 : .8} /></group>
  } else if (item.itemId === 'star_lamp') {
    model = (
      <group {...common}>
        <mesh position={[0, .75, 0]} castShadow><cylinderGeometry args={[.08, .16, 1.5, 8]} /><meshStandardMaterial color="#7687a9" metalness={.8} /></mesh>
        <Float speed={2.2} floatIntensity={.2}><mesh position={[0, 1.62, 0]}><octahedronGeometry args={[.34]} /><meshStandardMaterial color="#fff4a8" emissive="#ffd44a" emissiveIntensity={3} toneMapped={false} /></mesh></Float>
        <pointLight position={[0, 1.7, 0]} color="#ffd76b" intensity={2} distance={7} />
      </group>
    )
  } else if (item.itemId === 'crystal_pond') {
    model = (
      <group {...common}>
        <mesh position={[0, .08, 0]} receiveShadow><cylinderGeometry args={[1.35, 1.55, .18, 16]} /><meshStandardMaterial color="#20365e" roughness={.8} /></mesh>
        <mesh position={[0, .18, 0]}><cylinderGeometry args={[1.1, 1.25, .12, 18]} /><meshPhysicalMaterial color="#47dfff" transparent opacity={.72} roughness={.08} metalness={.2} /></mesh>
        <Sparkles count={12} scale={[2, .5, 2]} size={2} color="#8af4ff" speed={.35} />
      </group>
    )
  } else if (item.itemId === 'friend_greenhouse') {
    model = (
      <group {...common}>
        <mesh position={[0, .7, 0]} castShadow><boxGeometry args={[2.1, 1.35, 1.7]} /><meshPhysicalMaterial color="#8fffd1" transparent opacity={.48} roughness={.1} transmission={.25} /></mesh>
        <mesh position={[0, 1.65, 0]} rotation={[0, 0, Math.PI / 4]} castShadow><boxGeometry args={[1.5, 1.5, 1.72]} /><meshStandardMaterial color="#c8fff0" wireframe /></mesh>
      </group>
    )
  } else {
    model = (
      <group {...common}>
        <mesh position={[0, .55, 0]} castShadow receiveShadow><boxGeometry args={[1.8, 1.1, 1.55]} /><meshStandardMaterial color={item.itemId === 'observatory' ? '#526a98' : '#43536f'} metalness={.65} roughness={.32} /></mesh>
        <mesh position={[0, 1.35, 0]} castShadow><cylinderGeometry args={[.55, .75, .55, 10]} /><meshStandardMaterial color="#94a3c7" metalness={.8} roughness={.24} /></mesh>
        {item.itemId === 'observatory' && <mesh position={[0, 1.85, 0]} rotation={[0, 0, -.35]}><cylinderGeometry args={[.22, .38, 1.5, 10]} /><meshStandardMaterial color="#b4e8ff" metalness={.7} /></mesh>}
        <mesh position={[0, .65, .8]}><boxGeometry args={[.7, .35, .08]} /><meshStandardMaterial color="#62edff" emissive="#168da1" emissiveIntensity={1.5} /></mesh>
      </group>
    )
  }

  return <group>{model}{selected && <mesh position={[position[0], .08, position[2]]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.5, 1.72, 32]} /><meshBasicMaterial color="#62edff" transparent opacity={.8} /></mesh>}</group>
}

function ResourceNode({ node }) {
  const [x, y, z] = node.position
  if (node.actionId === 'crystal') {
    return <group position={[x, y, z]}>{[-.45, 0, .4].map((offset, index) => <mesh key={offset} position={[offset, .55 + index * .13, index % 2 ? .2 : -.1]} rotation={[.12, 0, .2 - index * .15]} castShadow><octahedronGeometry args={[.45 + index * .12, 0]} /><meshStandardMaterial color={index === 1 ? '#a78bfa' : '#67e8f9'} emissive="#3866b5" emissiveIntensity={1.25} metalness={.4} roughness={.16} /></mesh>)}<pointLight color="#71dfff" intensity={1.3} distance={5} /></group>
  }
  if (node.actionId === 'fiber') return <group position={[x, y, z]}><LowPolyTree scale={.92} color="#5ee6a2" /><Sparkles count={10} scale={[2, 3, 2]} color="#8affc0" size={2} speed={.4} /></group>
  if (node.actionId === 'salvage') return <group position={[x, y, z]} rotation={[0, .6, -.12]}><mesh position={[0, .45, 0]} castShadow><dodecahedronGeometry args={[.85, 0]} /><meshStandardMaterial color="#59677c" metalness={.9} roughness={.28} /></mesh><mesh position={[.2, .5, .6]}><boxGeometry args={[.9,.16,.1]} /><meshStandardMaterial color="#ffb45e" emissive="#a34b18" emissiveIntensity={1.2} /></mesh></group>
  if (node.actionId === 'beacon') return <group position={[x, y, z]}><mesh position={[0,.8,0]} rotation={[0,0,.18]} castShadow><cylinderGeometry args={[.14,.3,1.7,8]} /><meshStandardMaterial color="#76859a" metalness={.8} /></mesh><Float speed={1.8}><mesh position={[0,1.75,0]}><sphereGeometry args={[.25,10,8]} /><meshStandardMaterial color="#ff756e" emissive="#ff241d" emissiveIntensity={2.8} toneMapped={false} /></mesh></Float></group>
  return <group position={[x, y, z]}><mesh position={[0,.05,0]} rotation={[-Math.PI/2,0,0]} receiveShadow><circleGeometry args={[1.15,20]} /><meshStandardMaterial color="#765536" roughness={1} /></mesh><mesh position={[0,.22,0]}><coneGeometry args={[.18,.52,6]} /><meshStandardMaterial color="#8df1a1" emissive="#215f34" emissiveIntensity={.4} /></mesh></group>
}

function MissionPortal({ portal, active }) {
  const color = portal.route === 'nebula' ? '#a78bfa' : portal.route === 'comet' ? '#fb923c' : '#67e8f9'
  return (
    <group position={portal.position}>
      <Float speed={1.2} floatIntensity={.2}>
        <mesh rotation={[0, 0, 0]}><torusGeometry args={[1.05, .13, 8, 28]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 2.8 : 1.1} metalness={.65} roughness={.2} /></mesh>
        <mesh><circleGeometry args={[.82, 28]} /><meshBasicMaterial color={color} transparent opacity={active ? .32 : .12} side={THREE.DoubleSide} /></mesh>
      </Float>
      <pointLight color={color} intensity={active ? 2 : .8} distance={6} />
      <mesh position={[0,-.42,0]} castShadow><cylinderGeometry args={[.65,.9,.55,12]} /><meshStandardMaterial color="#26324d" metalness={.7} /></mesh>
      <Sparkles count={10} scale={[2.3,2.3,.7]} color={color} size={2} speed={.4} />
      <group position={[0, 2, 0]}><mesh><planeGeometry args={[1.5,.32]} /><meshBasicMaterial color="#07101d" transparent opacity={.72} /></mesh></group>
    </group>
  )
}

function Astronaut({ inputRef, interactables, blockers, pickups, onNearbyChange, onCollect }) {
  const group = useRef()
  const body = useRef()
  const keys = useRef(new Set())
  const nearbyId = useRef('')
  const collectLock = useRef(new Set())
  const { camera } = useThree()
  const cameraTarget = useMemo(() => new THREE.Vector3(), [])
  const lookTarget = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    const down = (event) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return
      keys.current.add(event.code)
    }
    const up = (event) => keys.current.delete(event.code)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  useFrame((state, delta) => {
    if (!group.current) return
    const keyboardX = (keys.current.has('KeyD') || keys.current.has('ArrowRight') ? 1 : 0) - (keys.current.has('KeyA') || keys.current.has('ArrowLeft') ? 1 : 0)
    const keyboardZ = (keys.current.has('KeyS') || keys.current.has('ArrowDown') ? 1 : 0) - (keys.current.has('KeyW') || keys.current.has('ArrowUp') ? 1 : 0)
    const moveX = keyboardX || Number(inputRef.current.x || 0)
    const moveZ = keyboardZ || Number(inputRef.current.z || 0)
    const length = Math.hypot(moveX, moveZ)
    const moving = length > .05
    if (moving) {
      const normalizedX = moveX / Math.max(1, length)
      const normalizedZ = moveZ / Math.max(1, length)
      const nextX = group.current.position.x + normalizedX * PLAYER_SPEED * delta
      const nextZ = group.current.position.z + normalizedZ * PLAYER_SPEED * delta
      const inWorld = Math.hypot(nextX, nextZ) < WORLD_RADIUS - .8
      const blocked = blockers.some((position) => Math.hypot(nextX - position[0], nextZ - position[2]) < 1.05)
      if (inWorld && !blocked) {
        group.current.position.x = nextX
        group.current.position.z = nextZ
      }
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, Math.atan2(normalizedX, normalizedZ), Math.min(1, delta * 10))
      if (body.current) body.current.position.y = .7 + Math.sin(state.clock.elapsedTime * 11) * .07
    } else if (body.current) {
      body.current.position.y = THREE.MathUtils.lerp(body.current.position.y, .7, delta * 6)
    }

    const player = group.current.position
    cameraTarget.set(player.x + 7.8, 7.6, player.z + 9.2)
    camera.position.lerp(cameraTarget, Math.min(1, delta * 3.7))
    lookTarget.set(player.x, .45, player.z)
    camera.lookAt(lookTarget)

    let nearest = null
    let nearestDistance = 2.35
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
      if (Math.hypot(player.x - pickup.position[0], player.z - pickup.position[2]) < .85) {
        collectLock.current.add(pickup.id)
        onCollect(pickup.id)
      }
    })
    const liveIds = new Set(pickups.map((pickup) => pickup.id))
    collectLock.current.forEach((id) => { if (!liveIds.has(id)) collectLock.current.delete(id) })
  })

  return (
    <group ref={group} position={[0, 0, 5]}>
      <group ref={body} position={[0, .7, 0]}>
        <mesh position={[0, .65, 0]} castShadow><capsuleGeometry args={[.34,.68,6,10]} /><meshStandardMaterial color="#edf7ff" roughness={.45} /></mesh>
        <mesh position={[0, 1.42, 0]} castShadow><sphereGeometry args={[.48,16,12]} /><meshStandardMaterial color="#eef8ff" metalness={.12} roughness={.3} /></mesh>
        <mesh position={[0, 1.4, .38]}><sphereGeometry args={[.34,16,10,0,Math.PI*2,0,Math.PI/1.8]} /><meshPhysicalMaterial color="#65d9ff" transparent opacity={.64} metalness={.5} roughness={.08} /></mesh>
        <mesh position={[0, .85, -.36]} castShadow><boxGeometry args={[.62,.72,.3]} /><meshStandardMaterial color="#445477" metalness={.65} roughness={.28} /></mesh>
        <mesh position={[-.27,.1,0]} castShadow><capsuleGeometry args={[.12,.52,5,8]} /><meshStandardMaterial color="#dceaff" /></mesh>
        <mesh position={[.27,.1,0]} castShadow><capsuleGeometry args={[.12,.52,5,8]} /><meshStandardMaterial color="#dceaff" /></mesh>
        <pointLight position={[0,1.35,.65]} color="#78eaff" intensity={.5} distance={3} />
      </group>
      <mesh position={[0,.04,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.5,18]} /><meshBasicMaterial color="#000" transparent opacity={.23} /></mesh>
    </group>
  )
}

function FrontierScene({ planet, selectedStructureId, onSelectStructure, inputRef, onNearbyChange, activeMission, collectedIds, onCollect, buildItem, onBuildAt }) {
  const layout = useMemo(() => Array.isArray(planet?.layout) ? planet.layout : [], [planet])
  const theme = planet?.theme || 'forest'
  const themeColors = {
    forest: ['#376f52', '#163a36'], ocean: ['#3985a1', '#16415e'], crystal: ['#70509a', '#312558'],
    desert: ['#a97846', '#51342d'], mechanical: ['#52606d', '#293342'], ice: ['#75a9bd', '#315477'],
  }[theme] || ['#376f52', '#163a36']
  const interactables = useMemo(() => [...RESOURCE_NODES, ...MISSION_PORTALS], [])
  const blockers = useMemo(() => layout.filter((item) => item.itemId !== 'wild_sprout').map(worldPositionFromLayout), [layout])
  const pickups = useMemo(() => {
    if (!activeMission) return []
    return (MISSION_PICKUPS[activeMission.route] || []).map(([x,z], index) => ({ id: `${activeMission.route}_${index}`, position: [x,.75,z] })).filter((pickup) => !collectedIds.has(pickup.id))
  }, [activeMission, collectedIds])
  const [hoverPoint, setHoverPoint] = useState(null)

  return (
    <>
      <color attach="background" args={['#081020']} />
      <fog attach="fog" args={['#081020', 22, 52]} />
      <hemisphereLight args={['#a9dcff', '#172318', 1.65]} />
      <directionalLight position={[9,15,7]} intensity={2.2} color="#fff0d2" castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-24} shadow-camera-right={24} shadow-camera-top={24} shadow-camera-bottom={-24} />
      <ambientLight intensity={.28} />
      <Sparkles count={70} scale={[45,18,45]} position={[0,8,0]} size={1.4} color="#d7f4ff" speed={.15} />

      <mesh position={[0,-1.25,0]} receiveShadow><cylinderGeometry args={[WORLD_RADIUS, WORLD_RADIUS - 2.2, 2.5, 48]} /><meshStandardMaterial color={themeColors[1]} roughness={.92} /></mesh>
      <mesh position={[0,.01,0]} receiveShadow><cylinderGeometry args={[WORLD_RADIUS, WORLD_RADIUS, .18, 48]} /><meshStandardMaterial color={themeColors[0]} roughness={.9} /></mesh>
      <mesh position={[0,-1.05,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[38,64]} /><meshPhysicalMaterial color="#176e94" transparent opacity={.7} roughness={.12} metalness={.05} /></mesh>

      {[[-13,-8],[-10,-12],[-4,13],[6,12],[12,9],[13,-8]].map(([x,z], index) => <group key={`${x}_${z}`} position={[x,0,z]} rotation={[0,index*.7,0]}><LowPolyTree scale={.65 + (index%3)*.1} color={theme === 'desert' ? '#d5a55d' : theme === 'ice' ? '#b8e8ee' : '#3fa96d'} /></group>)}
      {layout.map((item) => <PlacedStructure key={item.instanceId} item={item} selected={selectedStructureId === item.instanceId} onSelect={onSelectStructure} />)}
      {RESOURCE_NODES.map((node) => <ResourceNode key={node.id} node={node} />)}
      {MISSION_PORTALS.map((portal) => <MissionPortal key={portal.id} portal={portal} active={activeMission?.route === portal.route} />)}
      {pickups.map((pickup, index) => (
        <Float key={pickup.id} speed={2.5 + index*.08} floatIntensity={.45} position={pickup.position}>
          <mesh castShadow><icosahedronGeometry args={[.34,0]} /><meshStandardMaterial color={activeMission.route === 'comet' ? '#ff9f5a' : activeMission.route === 'ruins' ? '#64efff' : '#c59aff'} emissive={activeMission.route === 'comet' ? '#d54c17' : '#5940b8'} emissiveIntensity={2.2} toneMapped={false} /></mesh>
          <pointLight color="#8beaff" intensity={.65} distance={3} />
        </Float>
      ))}

      <mesh
        position={[0,.13,0]}
        rotation={[-Math.PI/2,0,0]}
        visible={Boolean(buildItem)}
        onPointerMove={(event) => { event.stopPropagation(); setHoverPoint([event.point.x,.18,event.point.z]) }}
        onPointerDown={(event) => { if (!buildItem) return; event.stopPropagation(); onBuildAt?.(event.point.x,event.point.z) }}
      >
        <circleGeometry args={[WORLD_RADIUS-.5,64]} />
        <meshBasicMaterial color="#5ee8ff" transparent opacity={buildItem ? .035 : 0} side={THREE.DoubleSide} />
      </mesh>
      {buildItem && hoverPoint && <group position={hoverPoint}><mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.75,1,28]} /><meshBasicMaterial color="#63f5b0" transparent opacity={.9} /></mesh><mesh position={[0,.65,0]}><boxGeometry args={[1.3,1.3,1.3]} /><meshBasicMaterial color="#63f5b0" wireframe transparent opacity={.5} /></mesh></group>}

      <Astronaut inputRef={inputRef} interactables={interactables} blockers={blockers} pickups={pickups} onNearbyChange={onNearbyChange} onCollect={onCollect} />
    </>
  )
}

function TouchJoystick({ inputRef }) {
  const [vector, setVector] = useState({ x: 0, z: 0 })
  const baseRef = useRef()
  const update = (event) => {
    const rect = baseRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = event.clientX - (rect.left + rect.width / 2)
    const y = event.clientY - (rect.top + rect.height / 2)
    const radius = rect.width * .34
    const length = Math.max(1, Math.hypot(x,y))
    const scale = Math.min(radius,length) / length
    const next = { x: x * scale / radius, z: y * scale / radius }
    inputRef.current.x = next.x
    inputRef.current.z = next.z
    setVector(next)
  }
  const stop = (event) => {
    try { event.currentTarget.releasePointerCapture(event.pointerId) } catch { /* already released */ }
    inputRef.current.x = 0; inputRef.current.z = 0; setVector({x:0,z:0})
  }
  return (
    <div ref={baseRef} className="frontier-joystick" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); update(event) }} onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) update(event) }} onPointerUp={stop} onPointerCancel={stop}>
      <i style={{ transform: `translate(${vector.x*30}px,${vector.z*30}px)` }} />
    </div>
  )
}

export default function GalaxyWorld3D({ planet, materials, missionReady, missionCooldownLabel, selectedBuildItem, onCancelBuild, onBuildAt, onWorldAction, onMissionComplete, onSelectStructure, selectedStructureId, onOpenMenu, onMessage }) {
  const inputRef = useRef({ x: 0, z: 0 })
  const [nearby, setNearby] = useState(null)
  const [activeMission, setActiveMission] = useState(null)
  const [collectedIds, setCollectedIds] = useState(new Set())
  const [missionNow, setMissionNow] = useState(0)
  const completingRef = useRef(false)

  const startMission = useCallback((route) => {
    if (!missionReady) { onMessage?.(`탐사선 정비 중 · ${missionCooldownLabel}`); return }
    const startedAtMs = Date.now()
    setCollectedIds(new Set())
    setMissionNow(startedAtMs)
    setActiveMission({ route, startedAtMs, endsAtMs: startedAtMs + 45000 })
    onMessage?.(`${GALAXY_MISSION_ROUTES[route]?.label} 시작 · 신호 조각 5개를 모으세요.`)
  }, [missionCooldownLabel, missionReady, onMessage])

  const interact = useCallback(() => {
    if (!nearby) return
    if (nearby.kind === 'portal') startMission(nearby.route)
    else onWorldAction?.(nearby)
  }, [nearby, onWorldAction, startMission])

  useEffect(() => {
    const keydown = (event) => {
      if (event.code !== 'KeyE' || ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) return
      event.preventDefault(); interact()
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [interact])

  useEffect(() => {
    if (!activeMission) return undefined
    const timer = window.setInterval(() => {
      const nextNow = Date.now()
      setMissionNow(nextNow)
      if (nextNow >= activeMission.endsAtMs) {
        window.clearInterval(timer)
        setActiveMission(null)
        setCollectedIds(new Set())
        onMessage?.('탐사 신호가 사라졌습니다. 관문에서 다시 도전할 수 있어요.')
      }
    }, 200)
    return () => window.clearInterval(timer)
  }, [activeMission, onMessage])

  const remainingSeconds = activeMission ? Math.max(0, Math.ceil((activeMission.endsAtMs - missionNow)/1000)) : 0

  useEffect(() => {
    if (!activeMission || collectedIds.size < 5 || completingRef.current) return
    completingRef.current = true
    Promise.resolve(onMissionComplete?.(activeMission.route)).finally(() => {
      setActiveMission(null); setCollectedIds(new Set()); completingRef.current = false
    })
  }, [activeMission, collectedIds, onMissionComplete])

  const collect = useCallback((id) => setCollectedIds((current) => current.has(id) ? current : new Set([...current,id])), [])

  return (
    <div className="frontier-game-stage">
      <Canvas shadows dpr={[1,1.6]} camera={{ position: [7.8,7.6,14], fov: 52, near: .1, far: 100 }} gl={{ antialias: true, powerPreference: 'high-performance' }}>
        <FrontierScene planet={planet} selectedStructureId={selectedStructureId} onSelectStructure={onSelectStructure} inputRef={inputRef} onNearbyChange={setNearby} activeMission={activeMission} collectedIds={collectedIds} onCollect={collect} buildItem={selectedBuildItem} onBuildAt={onBuildAt} />
      </Canvas>

      <div className="frontier-world-name"><span>{GALAXY_THEMES[planet?.theme]?.icon || '🌍'} ASTRA FRONTIER</span><strong>{planet?.planetName}</strong></div>
      <div className="frontier-resource-hud">
        {Object.entries(MATERIAL_LABELS).map(([id,label]) => <button type="button" key={id} onClick={() => onOpenMenu?.('build')} title={label}><i className={`material-dot ${id}`} /><strong>{Number(materials?.[id] || 0)}</strong></button>)}
      </div>
      <button type="button" className="frontier-pack-button" onClick={() => onOpenMenu?.('build')} aria-label="건설 가방 열기">🎒<span>BUILD</span></button>
      <button type="button" className="frontier-social-button" onClick={() => onOpenMenu?.('neighbors')} aria-label="이웃 행성 열기">🛸<span>SOCIAL</span></button>

      {activeMission && <div className="frontier-mission-hud"><span>{GALAXY_MISSION_ROUTES[activeMission.route]?.icon}</span><div><small>ACTIVE EXPEDITION</small><strong>신호 조각 {collectedIds.size}/5</strong><i><b style={{width:`${Math.min(100,collectedIds.size/5*100)}%`}} /></i></div><em>{remainingSeconds}</em></div>}
      {selectedBuildItem && <div className="frontier-build-mode"><strong>건설 위치를 선택하세요</strong><span>행성 지면을 눌러 배치</span><button type="button" onClick={onCancelBuild}>취소</button></div>}
      {!selectedBuildItem && nearby && <div className="frontier-interaction-prompt"><span>{nearby.icon || GALAXY_MISSION_ROUTES[nearby.route]?.icon || '✦'}</span><div><small>INTERACT</small><strong>{nearby.label}</strong></div><kbd>E</kbd></div>}
      <div className="frontier-control-hint"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span>이동</span><kbd>E</kbd><span>상호작용</span></div>
      <TouchJoystick inputRef={inputRef} />
      {nearby && !selectedBuildItem && <button type="button" className="frontier-action-button" onClick={interact}><span>{nearby.icon || '✦'}</span><strong>상호작용</strong></button>}
    </div>
  )
}
