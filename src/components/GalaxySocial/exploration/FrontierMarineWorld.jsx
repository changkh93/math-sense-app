import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import {
  MARINE_SPECIES,
  MARINE_HABITAT_COUNT,
  getMarineHabitat,
  getOceanFloorY,
  sampleExplorationWater,
} from './frontierExploration.js'

const FISH_PER_HABITAT = 6
const BRANCHING_CORAL_PER_HABITAT = 5
const PLATE_CORAL_PER_HABITAT = 3

function createFishBodyGeometry() {
  const body = new THREE.SphereGeometry(1, 16, 10).toNonIndexed()
  body.scale(.78, .3, .38)
  const snout = new THREE.SphereGeometry(1, 12, 8).toNonIndexed()
  snout.scale(.28, .24, .31)
  snout.translate(.62, -.015, 0)
  const dorsal = new THREE.ConeGeometry(.2, .48, 4).toNonIndexed()
  dorsal.scale(1, 1, .42)
  dorsal.translate(-.12, .42, 0)
  const leftFin = new THREE.ConeGeometry(.13, .42, 4).toNonIndexed()
  leftFin.rotateX(Math.PI / 2)
  leftFin.rotateZ(-.35)
  leftFin.translate(.06, -.08, .36)
  const rightFin = new THREE.ConeGeometry(.13, .42, 4).toNonIndexed()
  rightFin.rotateX(-Math.PI / 2)
  rightFin.rotateZ(.35)
  rightFin.translate(.06, -.08, -.36)
  const geometry = mergeGeometries([body, snout, dorsal, leftFin, rightFin])
  ;[body, snout, dorsal, leftFin, rightFin].forEach((item) => item.dispose())
  const position = geometry.getAttribute('position')
  const colors = []
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const stripe = Math.sin((x + .72) * 15) > .48 ? .58 : 1
    const belly = y < -.08 ? 1.08 : 1
    colors.push(stripe * belly, stripe * belly, stripe * belly)
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

function createFishTailGeometry() {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -.58, 0, 0, 0, .43, 0, 0, -.43, 0,
  ], 3))
  geometry.setIndex([0, 1, 2])
  geometry.computeVertexNormals()
  return geometry
}

function cylinderBetween(start, end, bottomRadius, topRadius = bottomRadius * .62) {
  const from = new THREE.Vector3(...start)
  const to = new THREE.Vector3(...end)
  const direction = to.clone().sub(from)
  const geometry = new THREE.CylinderGeometry(topRadius, bottomRadius, direction.length(), 8, 2).toNonIndexed()
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  ))
  geometry.translate(...from.clone().add(to).multiplyScalar(.5))
  return geometry
}

function createBranchingCoralGeometry() {
  const segments = [
    [[0, 0, 0], [0, .92, 0], .12],
    [[0, .34, 0], [.36, .78, .08], .075],
    [[0, .48, 0], [-.32, .88, -.05], .07],
    [[.02, .64, 0], [.2, 1.08, -.1], .065],
    [[-.12, .7, -.02], [-.25, 1.08, .12], .055],
  ]
  const parts = segments.map(([start, end, radius]) => cylinderBetween(start, end, radius))
  segments.slice(1).forEach(([, end], index) => {
    const tip = new THREE.IcosahedronGeometry(.095 - index * .008, 1).toNonIndexed()
    tip.translate(...end)
    parts.push(tip)
  })
  const geometry = mergeGeometries(parts)
  parts.forEach((item) => item.dispose())
  geometry.computeVertexNormals()
  return geometry
}

function createSeabedGeometry(worldRadius) {
  const geometry = new THREE.RingGeometry(worldRadius - .12, 62, 160, 28)
  const position = geometry.getAttribute('position')
  const colors = []
  const sand = new THREE.Color('#5d8f83')
  const deep = new THREE.Color('#234f55')
  const ridge = new THREE.Color('#89aa91')
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const worldZ = -position.getY(index)
    const y = getOceanFloorY(x, worldZ, worldRadius)
    position.setZ(index, y)
    const depth = THREE.MathUtils.clamp((-y - .7) / 4.2, 0, 1)
    const color = sand.clone().lerp(deep, depth)
    const grain = Math.sin(x * 1.7 + worldZ * .9) * Math.cos(worldZ * 1.3 - x * .4)
    if (grain > .45) color.lerp(ridge, .12)
    colors.push(color.r, color.g, color.b)
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.rotateX(-Math.PI / 2)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function ReefCreature({ habitat, index, paused }) {
  const root = useRef()
  const frontFlippers = useRef()
  const time = useRef(index * 1.7)
  const jelly = index % 3 === 0
  useFrame(({ camera }, delta) => {
    if (!paused) time.current += Math.min(delta, .05)
    const t = time.current
    if (!root.current) return
    root.current.visible = Math.hypot(camera.position.x - habitat.x, camera.position.z - habitat.z) < 22
    root.current.position.set(
      habitat.x + Math.cos(t * .18) * 1.05,
      habitat.y + (jelly ? .65 : .42) + Math.sin(t * .65) * .22,
      habitat.z + Math.sin(t * .18) * 1.05,
    )
    root.current.rotation.y = -t * .18
    if (jelly) root.current.scale.set(1 + Math.sin(t * 2) * .055, 1 - Math.sin(t * 2) * .08, 1)
    if (frontFlippers.current) frontFlippers.current.rotation.x = Math.sin(t * 2.25) * .32
  })
  return <group ref={root}>
    {jelly ? <>
      <mesh scale={[.48, .3, .48]}>
        <sphereGeometry args={[1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial color="#d6a8df" emissive="#8458a8" emissiveIntensity={.5} transparent opacity={.58} roughness={.18} transmission={.08} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, -.03, 0]} scale={[.28, .11, .28]}>
        <sphereGeometry args={[1, 14, 8]} />
        <meshBasicMaterial color="#f7d5ff" transparent opacity={.42} depthWrite={false} />
      </mesh>
      {[-.3, -.2, -.1, 0, .1, .2, .3].map((x, tentacleIndex) => <mesh key={x} position={[x, -.36 - (tentacleIndex % 2) * .06, Math.sin(tentacleIndex * 2.1) * .14]} rotation={[0, 0, Math.sin(tentacleIndex) * .12]}>
        <capsuleGeometry args={[.012, .58 + (tentacleIndex % 3) * .12, 4, 6]} />
        <meshBasicMaterial color="#edd0f5" transparent opacity={.48} />
      </mesh>)}
    </> : <>
      <mesh scale={[.7, .24, .5]} castShadow>
        <sphereGeometry args={[1, 20, 12]} />
        <meshStandardMaterial color="#496b4e" roughness={.72} metalness={.02} />
      </mesh>
      <mesh position={[0, .12, 0]} scale={[.58, .13, .42]}>
        <sphereGeometry args={[1, 16, 10]} />
        <meshStandardMaterial color="#6f8755" roughness={.82} />
      </mesh>
      {[[-.28, .2, -.2], [.08, .23, .18], [.31, .18, -.14]].map(([x, y, z], scute) => <mesh key={scute} position={[x, y, z]} scale={[.2, .035, .16]}>
        <sphereGeometry args={[1, 10, 6]} /><meshStandardMaterial color="#91a36b" roughness={.86} />
      </mesh>)}
      <mesh position={[.72, .015, 0]} scale={[.27, .2, .22]}>
        <sphereGeometry args={[1, 14, 10]} /><meshStandardMaterial color="#71845c" roughness={.8} />
      </mesh>
      {[.16, -.16].map((z) => <mesh key={z} position={[.91, .08, z]} scale={[.035, .035, .025]}>
        <sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color="#081718" roughness={.35} />
      </mesh>)}
      <group ref={frontFlippers}>
        {[-1, 1].map((side) => <mesh key={side} position={[.14, -.04, side * .56]} rotation={[0, side * .18, side * -.12]} scale={[.46, .055, .2]}>
          <sphereGeometry args={[1, 14, 7]} /><meshStandardMaterial color="#657b5b" roughness={.84} />
        </mesh>)}
      </group>
      {[-1, 1].map((side) => <mesh key={side} position={[-.46, -.05, side * .43]} rotation={[0, side * -.32, 0]} scale={[.3, .045, .14]}>
        <sphereGeometry args={[1, 12, 6]} /><meshStandardMaterial color="#657b5b" roughness={.84} />
      </mesh>)}
      <mesh position={[-.72, -.03, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[.08, .25, 8]} /><meshStandardMaterial color="#657b5b" roughness={.84} />
      </mesh>
    </>}
  </group>
}

export default function FrontierMarineWorld({ worldRadius, paused = false, playerRef }) {
  const fishBodies = useRef()
  const fishTails = useRef()
  const fishEyes = useRef()
  const bubbles = useRef()
  const kelp = useRef()
  const coral = useRef()
  const plateCoral = useRef()
  const rocks = useRef()
  const clock = useRef(0)
  const fillLight = useRef()
  const fishBodyGeometry = useMemo(() => createFishBodyGeometry(), [])
  const fishTailGeometry = useMemo(() => createFishTailGeometry(), [])
  const coralGeometry = useMemo(() => createBranchingCoralGeometry(), [])
  const seabedGeometry = useMemo(() => createSeabedGeometry(worldRadius), [worldRadius])
  const eyeGeometry = useMemo(() => new THREE.SphereGeometry(.055, 8, 6), [])
  useEffect(() => () => {
    fishBodyGeometry.dispose()
    fishTailGeometry.dispose()
    coralGeometry.dispose()
    seabedGeometry.dispose()
    eyeGeometry.dispose()
  }, [coralGeometry, eyeGeometry, fishBodyGeometry, fishTailGeometry, seabedGeometry])
  const matrix = useMemo(() => new THREE.Object3D(), [])
  const localMatrix = useMemo(() => new THREE.Matrix4(), [])
  const worldMatrix = useMemo(() => new THREE.Matrix4(), [])
  const localQuaternion = useMemo(() => new THREE.Quaternion(), [])
  const habitats = useMemo(() => Array.from({ length: MARINE_HABITAT_COUNT }, (_, index) => getMarineHabitat(index, worldRadius)), [worldRadius])
  const underwaterFog = useMemo(() => new THREE.Fog('#0b5664', 2.2, 22), [])
  const air = useRef(null)

  useEffect(() => () => {
    if (air.current) {
      air.current.scene.fog = air.current.fog
      air.current.scene.background = air.current.background
    }
  }, [])

  useLayoutEffect(() => {
    if (!fishBodies.current || !fishTails.current || !coral.current || !plateCoral.current || !rocks.current) return
    habitats.forEach((habitat, index) => {
      const speciesColor = new THREE.Color(MARINE_SPECIES[index % MARINE_SPECIES.length].color)
      for (let fishIndex = 0; fishIndex < FISH_PER_HABITAT; fishIndex += 1) {
        const instance = index * FISH_PER_HABITAT + fishIndex
        fishBodies.current.setColorAt(instance, speciesColor)
        fishTails.current.setColorAt(instance, speciesColor.clone().multiplyScalar(.88))
      }
      for (let coralIndex = 0; coralIndex < BRANCHING_CORAL_PER_HABITAT; coralIndex += 1) {
        const instance = index * BRANCHING_CORAL_PER_HABITAT + coralIndex
        const angle = coralIndex * 1.33 + index * .67
        const x = habitat.x + Math.cos(angle) * (.7 + coralIndex * .21)
        const z = habitat.z + Math.sin(angle) * (.7 + coralIndex * .21)
        matrix.position.set(x, getOceanFloorY(x, z, worldRadius) + .02, z)
        matrix.rotation.set(Math.sin(index) * .06, angle, Math.cos(index * 1.7) * .05)
        matrix.scale.setScalar(.62 + (index + coralIndex) % 4 * .11)
        matrix.updateMatrix()
        coral.current.setMatrixAt(instance, matrix.matrix)
        coral.current.setColorAt(instance, new THREE.Color(['#d87565', '#e59b69', '#b9789a', '#cfb36e'][(index + coralIndex) % 4]))
      }
      for (let plateIndex = 0; plateIndex < PLATE_CORAL_PER_HABITAT; plateIndex += 1) {
        const instance = index * PLATE_CORAL_PER_HABITAT + plateIndex
        const angle = index * 1.31 + plateIndex * 2.05
        const x = habitat.x + Math.cos(angle) * (1.18 + plateIndex * .2)
        const z = habitat.z + Math.sin(angle) * (1.18 + plateIndex * .2)
        matrix.position.set(x, getOceanFloorY(x, z, worldRadius) + .13 + plateIndex * .16, z)
        matrix.rotation.set(.06, angle, plateIndex ? -.12 : .1)
        matrix.scale.set(.7 + plateIndex * .25, .18, .55 + plateIndex * .15)
        matrix.updateMatrix()
        plateCoral.current.setMatrixAt(instance, matrix.matrix)
        plateCoral.current.setColorAt(instance, new THREE.Color(['#c98a72', '#8f6e9e', '#d2aa6f'][plateIndex]))
      }
      for (let rockIndex = 0; rockIndex < 4; rockIndex += 1) {
        const instance = index * 4 + rockIndex
        const angle = index * .9 + rockIndex * 1.7
        const x = habitat.x + Math.cos(angle) * (1.5 + rockIndex * .2)
        const z = habitat.z + Math.sin(angle) * (1.5 + rockIndex * .2)
        matrix.position.set(x, getOceanFloorY(x, z, worldRadius) + .12, z)
        matrix.rotation.set(index * .13, angle, rockIndex * .17)
        matrix.scale.set(.28 + rockIndex * .05, .18 + (index % 2) * .06, .34 + (rockIndex % 2) * .08)
        matrix.updateMatrix()
        rocks.current.setMatrixAt(instance, matrix.matrix)
      }
    })
    fishBodies.current.instanceColor.needsUpdate = true
    fishTails.current.instanceColor.needsUpdate = true
    coral.current.instanceMatrix.needsUpdate = true
    coral.current.instanceColor.needsUpdate = true
    plateCoral.current.instanceMatrix.needsUpdate = true
    plateCoral.current.instanceColor.needsUpdate = true
    rocks.current.instanceMatrix.needsUpdate = true
  }, [habitats, matrix, worldRadius])

  useFrame(({ scene, camera }, delta) => {
    if (!paused) clock.current += Math.min(delta, .05)
    const t = clock.current
    const water = sampleExplorationWater(camera.position.x, camera.position.z, worldRadius, true)
    const submerged = water && camera.position.y < water.surfaceY - .035
    if (fillLight.current) fillLight.current.intensity = submerged ? .82 : .1
    if (submerged && !air.current) {
      air.current = { scene, fog: scene.fog, background: scene.background }
      scene.fog = underwaterFog
      scene.background = underwaterFog.color
    } else if (!submerged && air.current) {
      scene.fog = air.current.fog
      scene.background = air.current.background
      air.current = null
    }
    if (!fishBodies.current || !fishTails.current || !fishEyes.current || !bubbles.current || !kelp.current) return
    const player = playerRef?.current?.position
    const playerWater = player && sampleExplorationWater(player.x, player.z, worldRadius)
    habitats.forEach((habitat, index) => {
      const visible = Math.hypot(camera.position.x - habitat.x, camera.position.z - habitat.z) < 25
      for (let fishIndex = 0; fishIndex < FISH_PER_HABITAT; fishIndex += 1) {
        const instance = index * FISH_PER_HABITAT + fishIndex
        const angle = t * (.26 + index % 3 * .035) + fishIndex * Math.PI * 2 / FISH_PER_HABITAT + index * .73
        const orbit = 1.05 + (fishIndex % 3) * .28
        const x = habitat.x + Math.cos(angle) * orbit
        const z = habitat.z + Math.sin(angle) * orbit
        const proximity = player ? Math.hypot(x - player.x, z - player.z) : 10
        const avoid = proximity < 1.15 ? .55 : 0
        matrix.position.set(
          x + Math.cos(angle) * avoid,
          habitat.y + Math.sin(angle * 1.7 + fishIndex) * .24 + (fishIndex % 2) * .22,
          z + Math.sin(angle) * avoid,
        )
        matrix.rotation.set(Math.sin(angle * 1.3) * .06, -angle - Math.PI / 2, Math.sin(angle * 2.7) * .08)
        const size = visible ? .56 + (index + fishIndex) % 4 * .07 : 0
        matrix.scale.setScalar(size)
        matrix.updateMatrix()
        fishBodies.current.setMatrixAt(instance, matrix.matrix)

        localQuaternion.setFromEuler(new THREE.Euler(0, Math.sin(t * 7.5 + fishIndex) * .34, 0))
        localMatrix.compose(new THREE.Vector3(-.7, 0, 0), localQuaternion, new THREE.Vector3(1, 1, 1))
        worldMatrix.multiplyMatrices(matrix.matrix, localMatrix)
        fishTails.current.setMatrixAt(instance, worldMatrix)
        for (let side = 0; side < 2; side += 1) {
          localMatrix.makeTranslation(.58, .08, side ? -.32 : .32)
          worldMatrix.multiplyMatrices(matrix.matrix, localMatrix)
          fishEyes.current.setMatrixAt(instance * 2 + side, worldMatrix)
        }
      }
      for (let kelpIndex = 0; kelpIndex < 7; kelpIndex += 1) {
        const angle = kelpIndex * 2.4 + index * .47
        const height = .65 + (kelpIndex % 4) * .32
        const x = habitat.x + Math.cos(angle) * 1.45
        const z = habitat.z + Math.sin(angle) * 1.45
        matrix.position.set(x, getOceanFloorY(x, z, worldRadius) + height * .55, z)
        matrix.rotation.set(Math.sin(t * .82 + kelpIndex) * .1, angle, Math.cos(t * .7 + index) * .12)
        matrix.scale.set(visible ? .68 : 0, visible ? height : 0, visible ? .55 : 0)
        matrix.updateMatrix()
        kelp.current.setMatrixAt(index * 7 + kelpIndex, matrix.matrix)
      }
    })
    for (let index = 0; index < 160; index += 1) {
      const personal = index >= 128
      const habitat = habitats[index % habitats.length]
      const phase = (t * (personal ? .7 : .3) + index * .137) % 1
      const baseX = personal && player ? player.x : habitat.x
      const baseZ = personal && player ? player.z : habitat.z
      const baseY = personal && player ? player.y + .55 : getOceanFloorY(baseX, baseZ, worldRadius)
      const top = personal && playerWater ? playerWater.surfaceY : -.18
      const active = personal ? playerWater && player.y < playerWater.surfaceY - .25 : true
      const y = baseY + phase * Math.max(.1, top - baseY)
      matrix.position.set(baseX + Math.sin(index * 4 + t) * (personal ? .13 : .35), y, baseZ + Math.cos(index + t) * .15)
      matrix.rotation.set(0, 0, 0)
      matrix.scale.setScalar(active ? .018 + phase * .045 : 0)
      matrix.updateMatrix()
      bubbles.current.setMatrixAt(index, matrix.matrix)
    }
    fishBodies.current.instanceMatrix.needsUpdate = true
    fishTails.current.instanceMatrix.needsUpdate = true
    fishEyes.current.instanceMatrix.needsUpdate = true
    bubbles.current.instanceMatrix.needsUpdate = true
    kelp.current.instanceMatrix.needsUpdate = true
  })

  return <group>
    <ambientLight ref={fillLight} color="#9fd8d0" intensity={.1} />
    <mesh geometry={seabedGeometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={.96} metalness={0} />
    </mesh>
    <instancedMesh ref={rocks} args={[undefined, undefined, MARINE_HABITAT_COUNT * 4]} receiveShadow frustumCulled={false}>
      <dodecahedronGeometry args={[1, 1]} /><meshStandardMaterial color="#496b67" roughness={.98} />
    </instancedMesh>
    <instancedMesh ref={fishBodies} args={[fishBodyGeometry, undefined, MARINE_HABITAT_COUNT * FISH_PER_HABITAT]} frustumCulled={false}>
      <meshStandardMaterial vertexColors roughness={.48} metalness={.04} />
    </instancedMesh>
    <instancedMesh ref={fishTails} args={[fishTailGeometry, undefined, MARINE_HABITAT_COUNT * FISH_PER_HABITAT]} frustumCulled={false}>
      <meshStandardMaterial roughness={.55} side={THREE.DoubleSide} />
    </instancedMesh>
    <instancedMesh ref={fishEyes} args={[eyeGeometry, undefined, MARINE_HABITAT_COUNT * FISH_PER_HABITAT * 2]} frustumCulled={false}>
      <meshStandardMaterial color="#071316" roughness={.3} />
    </instancedMesh>
    <instancedMesh ref={kelp} args={[undefined, undefined, MARINE_HABITAT_COUNT * 7]} frustumCulled={false}>
      <capsuleGeometry args={[.095, .72, 5, 8]} /><meshStandardMaterial color="#276f5e" roughness={.88} />
    </instancedMesh>
    <instancedMesh ref={coral} args={[coralGeometry, undefined, MARINE_HABITAT_COUNT * BRANCHING_CORAL_PER_HABITAT]} frustumCulled={false}>
      <meshStandardMaterial roughness={.78} />
    </instancedMesh>
    <instancedMesh ref={plateCoral} args={[undefined, undefined, MARINE_HABITAT_COUNT * PLATE_CORAL_PER_HABITAT]} frustumCulled={false}>
      <cylinderGeometry args={[.5, .32, .16, 14]} /><meshStandardMaterial roughness={.82} />
    </instancedMesh>
    <instancedMesh ref={bubbles} args={[undefined, undefined, 160]} frustumCulled={false} raycast={() => null}>
      <sphereGeometry args={[1, 8, 6]} /><meshPhysicalMaterial color="#d8ffff" transparent opacity={.3} roughness={.08} metalness={.08} depthWrite={false} />
    </instancedMesh>
    {habitats.filter((_, index) => index % 2 === 0).map((habitat, index) => <ReefCreature key={index} habitat={habitat} index={index} paused={paused} />)}
  </group>
}
