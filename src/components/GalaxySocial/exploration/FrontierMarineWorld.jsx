import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { MARINE_SPECIES, MARINE_HABITAT_COUNT, OCEAN_FLOOR_Y, getMarineHabitat, sampleExplorationWater } from './frontierExploration.js'

function ReefCreature({ habitat, index, paused }) {
  const root = useRef()
  const fins = useRef()
  const time = useRef(index)
  const jelly = index % 3 === 0
  useFrame(({ camera }, delta) => {
    if (!paused) time.current += Math.min(delta, .05)
    const t = time.current
    root.current.visible = Math.hypot(camera.position.x - habitat.x, camera.position.z - habitat.z) < 20
    root.current.position.set(habitat.x + Math.cos(t * .23) * .65, jelly ? -1.2 + Math.sin(t * .7) * .3 : -2.4 + Math.sin(t * .8) * .2, habitat.z + Math.sin(t * .23) * .65)
    root.current.rotation.y = -t * .23
    if (jelly) root.current.scale.set(1 + Math.sin(t * 2) * .08, 1 - Math.sin(t * 2) * .08, 1)
    if (fins.current) fins.current.rotation.x = Math.sin(t * 2.1) * .2
  })
  return <group ref={root}>
    {jelly ? <>
      <mesh scale={[.5, .3, .5]}><sphereGeometry args={[1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#f4baff" emissive="#b376cd" emissiveIntensity={.6} transparent opacity={.65} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      {[-.22, 0, .22].map((x) => <mesh key={x} position={[x, -.26, x]}><cylinderGeometry args={[.015, .008, .6, 5]} /><meshBasicMaterial color="#f9ddff" transparent opacity={.6} /></mesh>)}
    </> : <>
      <mesh scale={[.48, .2, .35]}><sphereGeometry args={[1, 10, 6]} /><meshStandardMaterial color={index % 2 ? '#5d9b82' : '#658dbe'} roughness={.7} /></mesh>
      <mesh position={[.5, 0, 0]} scale={[.2, .13, .14]}><sphereGeometry args={[1, 8, 5]} /><meshStandardMaterial color="#9ad8ba" /></mesh>
      <group ref={fins}>{[-1, 1].map((side) => <mesh key={side} position={[.04, -.02, side * .4]} rotation={[0, side * .4, 0]} scale={[.38, .035, .32]}><sphereGeometry args={[1, 7, 4]} /><meshStandardMaterial color="#8ccbab" /></mesh>)}</group>
    </>}
  </group>
}

export default function FrontierMarineWorld({ worldRadius, paused = false, playerRef }) {
  const fish = useRef()
  const bubbles = useRef()
  const kelp = useRef()
  const coral = useRef()
  const clock = useRef(0)
  const fillLight = useRef()
  const fishGeometry = useMemo(() => {
    const body = new THREE.SphereGeometry(1, 8, 5).toNonIndexed()
    const tail = new THREE.ConeGeometry(.75, 1.1, 3).toNonIndexed()
    tail.rotateZ(-Math.PI / 2)
    tail.translate(-1.15, 0, 0)
    const merged = mergeGeometries([body, tail])
    body.dispose(); tail.dispose()
    return merged
  }, [])
  useEffect(() => () => fishGeometry.dispose(), [fishGeometry])
  const matrix = useMemo(() => new THREE.Object3D(), [])
  const habitats = useMemo(() => Array.from({ length: MARINE_HABITAT_COUNT }, (_, index) => getMarineHabitat(index, worldRadius)), [worldRadius])
  const underwaterFog = useMemo(() => new THREE.Fog('#237d8a', 2, 23), [])
  const air = useRef(null)
  useEffect(() => () => {
    if (air.current) { air.current.scene.fog = air.current.fog; air.current.scene.background = air.current.background }
  }, [])
  useEffect(() => {
    habitats.forEach((habitat, index) => {
      const color = new THREE.Color(MARINE_SPECIES[index % 6].color)
      for (let j = 0; j < 6; j++) fish.current.setColorAt(index * 6 + j, color)
      for (let j = 0; j < 5; j++) {
        const angle = j * 2.4 + index
        matrix.position.set(habitat.x + Math.cos(angle) * .8, OCEAN_FLOOR_Y + .2 + j * .05, habitat.z + Math.sin(angle) * .8)
        matrix.rotation.set(.2, angle, .3)
        matrix.scale.set(.2 + j * .03, .35 + j * .09, .2)
        matrix.updateMatrix()
        coral.current.setMatrixAt(index * 5 + j, matrix.matrix)
        coral.current.setColorAt(index * 5 + j, color)
      }
    })
    fish.current.instanceColor.needsUpdate = true
    coral.current.instanceMatrix.needsUpdate = true
    coral.current.instanceColor.needsUpdate = true
  }, [habitats, matrix])
  useFrame(({ scene, camera }, delta) => {
    if (!paused) clock.current += Math.min(delta, .05)
    const t = clock.current
    const water = sampleExplorationWater(camera.position.x, camera.position.z, worldRadius, true)
    const submerged = water && camera.position.y < water.surfaceY - .035
    if (fillLight.current) fillLight.current.intensity = submerged ? 1.1 : .12
    if (submerged && !air.current) {
      air.current = { scene, fog: scene.fog, background: scene.background }
      scene.fog = underwaterFog; scene.background = underwaterFog.color
    } else if (!submerged && air.current) {
      scene.fog = air.current.fog; scene.background = air.current.background; air.current = null
    }
    if (!fish.current || !bubbles.current || !kelp.current) return
    const player = playerRef?.current?.position
    const playerWater = player && sampleExplorationWater(player.x, player.z, worldRadius)
    habitats.forEach((habitat, index) => {
      const visible = Math.hypot(camera.position.x - habitat.x, camera.position.z - habitat.z) < 24
      for (let j = 0; j < 6; j++) {
        const angle = t * (.38 + index % 3 * .04) + j * .45
        const x = habitat.x + Math.cos(angle) * .8
        const z = habitat.z + Math.sin(angle) * .8
        const proximity = player ? Math.hypot(x - player.x, z - player.z) : 10
        const avoid = proximity < .8 ? .4 : 0
        matrix.position.set(x + Math.cos(angle) * avoid, habitat.y + Math.sin(angle * 1.4) * .15 + j * .1, z + Math.sin(angle) * avoid)
        matrix.rotation.set(0, -angle - Math.PI / 2, Math.sin(angle * 5) * .07)
        matrix.scale.set(visible ? .26 : 0, visible ? .13 : 0, visible ? .09 : 0)
        matrix.updateMatrix(); fish.current.setMatrixAt(index * 6 + j, matrix.matrix)
      }
      for (let j = 0; j < 7; j++) {
        const height = .5 + (j % 4) * .25
        matrix.position.set(habitat.x + Math.cos(j * 2.4) * 1.25, OCEAN_FLOOR_Y + height * .5, habitat.z + Math.sin(j * 2.4) * 1.25)
        matrix.rotation.set(Math.sin(t * 1.1 + j) * .12, j, Math.cos(t + index) * .1)
        matrix.scale.set(visible ? .06 : 0, visible ? height : 0, visible ? .19 : 0)
        matrix.updateMatrix(); kelp.current.setMatrixAt(index * 7 + j, matrix.matrix)
      }
    })
    // Ambient vents + a continuous stream near the diver's breathing apparatus.
    for (let i = 0; i < 160; i++) {
      const personal = i >= 128
      const habitat = habitats[i % habitats.length]
      const phase = (t * (personal ? .7 : .3) + i * .137) % 1
      const baseX = personal && player ? player.x : habitat.x
      const baseZ = personal && player ? player.z : habitat.z
      const baseY = personal && player ? player.y + .55 : OCEAN_FLOOR_Y
      const top = personal && playerWater ? playerWater.surfaceY : -.3
      const active = personal ? playerWater && player.y < playerWater.surfaceY - .25 : true
      const y = baseY + phase * Math.max(.1, top - baseY)
      matrix.position.set(baseX + Math.sin(i * 4 + t) * (personal ? .13 : .35), y, baseZ + Math.cos(i + t) * .15)
      matrix.rotation.set(0, 0, 0)
      matrix.scale.setScalar(active ? .025 + phase * .055 : 0)
      matrix.updateMatrix(); bubbles.current.setMatrixAt(i, matrix.matrix)
    }
    fish.current.instanceMatrix.needsUpdate = true
    bubbles.current.instanceMatrix.needsUpdate = true
    kelp.current.instanceMatrix.needsUpdate = true
  })
  return <group>
    <ambientLight ref={fillLight} color="#bce7e1" intensity={.12} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, OCEAN_FLOOR_Y, 0]}>
      <ringGeometry args={[worldRadius, 62, 96]} /><meshStandardMaterial color="#82bcb1" roughness={1} side={THREE.DoubleSide} />
    </mesh>
    <instancedMesh ref={fish} args={[fishGeometry, undefined, MARINE_HABITAT_COUNT * 6]} frustumCulled={false}>
      <meshStandardMaterial roughness={.55} />
    </instancedMesh>
    <instancedMesh ref={kelp} args={[undefined, undefined, MARINE_HABITAT_COUNT * 7]} frustumCulled={false}>
      <sphereGeometry args={[1, 5, 5]} /><meshStandardMaterial color="#339888" roughness={.85} />
    </instancedMesh>
    <instancedMesh ref={coral} args={[undefined, undefined, MARINE_HABITAT_COUNT * 5]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} /><meshStandardMaterial roughness={.85} />
    </instancedMesh>
    <instancedMesh ref={bubbles} args={[undefined, undefined, 160]} frustumCulled={false} raycast={() => null}>
      <sphereGeometry args={[1, 7, 5]} /><meshStandardMaterial color="#c9ffff" transparent opacity={.4} roughness={.15} metalness={.2} depthWrite={false} />
    </instancedMesh>
    {habitats.filter((_, index) => index % 2 === 0).map((habitat, index) => <ReefCreature key={index} habitat={habitat} index={index} paused={paused} />)}
  </group>
}
