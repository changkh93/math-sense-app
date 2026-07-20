import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  BRIDGE_DECK_HEIGHT,
  BRIDGE_X,
  MOUNTAINS,
  PATH_NETWORK,
  VILLAGE_BEACON_POSITION,
  WORLD_RADIUS,
  WORLD_ZONES,
  createRiverGeometry,
  createRibbonGeometry,
  createTerrainGeometry,
  isRiverWater,
  riverCenterZ,
  riverWidth,
  terrainHeight,
  terrainSlope,
  walkSurfaceHeight,
} from './GalaxyTerrainModel.js'

const GROUND_TEXTURE_SIZE = 512
const GROUND_PATCHES = [
  { x: -4.8, z: .5, rx: 4.6, rz: 2.25, rotation: .28 },
  { x: 5.6, z: -1.7, rx: 4.1, rz: 2.15, rotation: -.62 },
  { x: -10.4, z: 3.4, rx: 3.15, rz: 1.6, rotation: .86 },
  { x: 8.7, z: 8.4, rx: 3.65, rz: 1.7, rotation: -.3 },
  { x: -.8, z: -9.4, rx: 4.35, rz: 1.55, rotation: .18 },
  { x: 11.8, z: -6.2, rx: 2.75, rz: 1.35, rotation: .68 },
]

const SOIL_TONES = {
  forest: [158, 108, 70],
  ocean: [112, 126, 112],
  crystal: [139, 111, 151],
  desert: [181, 126, 76],
  mechanical: [119, 123, 115],
  ice: [156, 177, 181],
}

const COVER_COLORS = {
  forest: ['#427b55', '#50865d', '#609064'],
  ocean: ['#2f9a82', '#54bea1', '#659bc1'],
  crystal: ['#7457a0', '#a675c4', '#6599b1'],
  desert: ['#9a7043', '#b99058', '#7e7949'],
  mechanical: ['#526b65', '#698176', '#496e78'],
  ice: ['#7cb2b7', '#a1ced0', '#78a4b7'],
}

const ROAD_TONES = {
  forest: { edge: '#755e45', center: '#9d7c55' },
  ocean: { edge: '#385e5d', center: '#5f8580' },
  crystal: { edge: '#51445f', center: '#79678a' },
  desert: { edge: '#795236', center: '#b28151' },
  mechanical: { edge: '#3f4947', center: '#68716a' },
  ice: { edge: '#60787d', center: '#8da7a9' },
}

const PEBBLE_COLORS = {
  forest: ['#6f705f', '#8b765b'],
  ocean: ['#617b79', '#82958c'],
  crystal: ['#776b82', '#9b849f'],
  desert: ['#8e7156', '#ad8d69'],
  mechanical: ['#69716d', '#858d85'],
  ice: ['#8da3a6', '#afbec0'],
}

function fract(value) {
  return value - Math.floor(value)
}

function hashNoise(x, y) {
  return fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453123)
}

function colorBytes(value) {
  const hex = Number.parseInt(String(value).replace('#', ''), 16)
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255]
}

function mixColor(from, to, amount) {
  return [
    THREE.MathUtils.lerp(from[0], to[0], amount),
    THREE.MathUtils.lerp(from[1], to[1], amount),
    THREE.MathUtils.lerp(from[2], to[2], amount),
  ]
}

function groundPatchMask(x, z, patch) {
  const cos = Math.cos(patch.rotation)
  const sin = Math.sin(patch.rotation)
  const dx = x - patch.x
  const dz = z - patch.z
  const localX = (dx * cos - dz * sin) / patch.rx
  const localZ = (dx * sin + dz * cos) / patch.rz
  const distance = localX * localX + localZ * localZ
  if (distance >= 1) return 0
  const edge = 1 - distance
  return edge * edge * (3 - 2 * edge)
}

function createGroundDetailTextures(palette) {
  const size = GROUND_TEXTURE_SIZE
  const albedoData = new Uint8Array(size * size * 4)
  const bumpData = new Uint8Array(size * size)
  const soil = SOIL_TONES[palette.prop] || SOIL_TONES.forest
  const ground = colorBytes(palette.ground)
  const groundDeep = colorBytes(palette.groundDeep)
  const highGround = mixColor(colorBytes(palette.path), [217, 229, 223], .28)
  const riverGround = mixColor(colorBytes(palette.water), groundDeep, .42)
  const cover = colorBytes((COVER_COLORS[palette.prop] || COVER_COLORS.forest)[1])

  for (let py = 0; py < size; py += 1) {
    const worldZ = (py / (size - 1) - .5) * WORLD_RADIUS * 2
    for (let px = 0; px < size; px += 1) {
      const worldX = (px / (size - 1) - .5) * WORLD_RADIUS * 2
      const index = (py * size + px) * 4
      const bumpIndex = py * size + px
      const fine = hashNoise(px * 1.83, py * 1.57)
      const coarse = hashNoise(Math.floor(px / 8), Math.floor(py / 8))
      const fiber = Math.sin(worldX * 8.7 + Math.sin(worldZ * 3.1) * 1.6) * .5 + .5
      let dirtMask = 0
      GROUND_PATCHES.forEach((patch) => { dirtMask = Math.max(dirtMask, groundPatchMask(worldX, worldZ, patch)) })
      dirtMask *= .58 + coarse * .32
      dirtMask = THREE.MathUtils.clamp(dirtMask + (fine > .76 ? .09 : 0), 0, .82)

      const height = terrainHeight(worldX, worldZ)
      let surface = [...ground]
      if (isRiverWater(worldX, worldZ)) surface = mixColor(surface, riverGround, .74)
      else if (height > 1.2) surface = mixColor(surface, highGround, THREE.MathUtils.clamp((height - 1.2) / 3.6, 0, 1) * .72)
      else if (height < .03) surface = mixColor(surface, groundDeep, .5)

      const coverAmount = THREE.MathUtils.clamp((fiber - .68) / .32, 0, 1) * (.08 + coarse * .1) * (1 - dirtMask)
      surface = mixColor(surface, cover, coverAmount)
      surface = mixColor(surface, soil, dirtMask)
      const grain = (fine - .5) * 18 + (coarse - .5) * 8
      albedoData[index] = THREE.MathUtils.clamp(surface[0] + grain, 0, 255)
      albedoData[index + 1] = THREE.MathUtils.clamp(surface[1] + grain, 0, 255)
      albedoData[index + 2] = THREE.MathUtils.clamp(surface[2] + grain, 0, 255)
      albedoData[index + 3] = 255

      const bump = THREE.MathUtils.clamp(108 + fine * 76 + fiber * 18 - dirtMask * 20, 0, 255)
      bumpData[bumpIndex] = bump
    }
  }

  const albedo = new THREE.DataTexture(albedoData, size, size, THREE.RGBAFormat, THREE.UnsignedByteType)
  albedo.colorSpace = THREE.SRGBColorSpace
  albedo.minFilter = THREE.LinearMipmapLinearFilter
  albedo.magFilter = THREE.LinearFilter
  albedo.generateMipmaps = true
  albedo.anisotropy = 4
  albedo.needsUpdate = true

  const bump = new THREE.DataTexture(bumpData, size, size, THREE.RedFormat, THREE.UnsignedByteType)
  bump.minFilter = THREE.LinearMipmapLinearFilter
  bump.magFilter = THREE.LinearFilter
  bump.generateMipmaps = true
  bump.anisotropy = 4
  bump.needsUpdate = true

  return { albedo, bump }
}

function distanceToSegment(x, z, start, end) {
  const dx = end[0] - start[0]
  const dz = end[1] - start[1]
  const lengthSquared = dx * dx + dz * dz
  const amount = lengthSquared > 0 ? THREE.MathUtils.clamp(((x - start[0]) * dx + (z - start[1]) * dz) / lengthSquared, 0, 1) : 0
  return Math.hypot(x - (start[0] + dx * amount), z - (start[1] + dz * amount))
}

function isNearRoad(x, z) {
  return PATH_NETWORK.some((path) => path.some((point, index) => (
    index > 0 && distanceToSegment(x, z, path[index - 1], point) < .82
  )))
}

function seededRandom(seed) {
  let value = seed >>> 0
  return () => {
    value += 0x6D2B79F5
    let result = value
    result = Math.imul(result ^ (result >>> 15), result | 1)
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61)
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

function createRiverFlowTexture() {
  const width = 192
  const height = 48
  const data = new Uint8Array(width * height * 4)
  const random = seededRandom(0x51EA)
  const streaks = Array.from({ length: 38 }, (_, index) => ({
    x: random() * width,
    y: height * (index < 28
      ? .24 + random() * .52
      : random() < .5 ? .07 + random() * .13 : .8 + random() * .13),
    radiusX: 5 + random() * 16,
    radiusY: .55 + random() * 1.45,
    strength: .35 + random() * .55,
  }))

  for (let y = 0; y < height; y += 1) {
    const across = (y + .5) / height
    const edgeFade = THREE.MathUtils.smoothstep(across, .025, .12) * THREE.MathUtils.smoothstep(1 - across, .025, .12)
    for (let x = 0; x < width; x += 1) {
      let alpha = 0
      streaks.forEach((streak) => {
        const rawDistanceX = Math.abs(x - streak.x)
        const distanceX = Math.min(rawDistanceX, width - rawDistanceX) / streak.radiusX
        const distanceY = (y - streak.y) / streak.radiusY
        const distance = distanceX * distanceX + distanceY * distanceY
        if (distance < 1) alpha += (1 - distance) ** 2 * streak.strength
      })
      const index = (y * width + x) * 4
      const shimmer = .84 + hashNoise(x * .37, y * .91) * .16
      data[index] = 255
      data[index + 1] = 255
      data[index + 2] = 255
      data[index + 3] = THREE.MathUtils.clamp(alpha * edgeFade * shimmer * 255, 0, 255)
    }
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.UnsignedByteType)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.repeat.set(7.5, 1)
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = 2
  texture.needsUpdate = true
  return texture
}

function valueNoise(x, z, cellSize = 3.2) {
  const sampleX = x / cellSize
  const sampleZ = z / cellSize
  const x0 = Math.floor(sampleX)
  const z0 = Math.floor(sampleZ)
  const tx = sampleX - x0
  const tz = sampleZ - z0
  const smoothX = tx * tx * (3 - 2 * tx)
  const smoothZ = tz * tz * (3 - 2 * tz)
  const top = THREE.MathUtils.lerp(hashNoise(x0, z0), hashNoise(x0 + 1, z0), smoothX)
  const bottom = THREE.MathUtils.lerp(hashNoise(x0, z0 + 1), hashNoise(x0 + 1, z0 + 1), smoothX)
  return THREE.MathUtils.lerp(top, bottom, smoothZ)
}

function createGrassClumpGeometry() {
  const positions = []
  const blades = [
    { angle: 0, radius: .012, width: .016, height: .185, lean: .026 },
    { angle: .64, radius: .05, width: .012, height: .14, lean: .036 },
    { angle: 1.28, radius: .074, width: .014, height: .16, lean: .03 },
    { angle: 1.93, radius: .034, width: .013, height: .15, lean: .04 },
    { angle: 2.58, radius: .086, width: .012, height: .132, lean: .045 },
    { angle: 3.21, radius: .045, width: .016, height: .177, lean: .024 },
    { angle: 3.86, radius: .07, width: .012, height: .143, lean: .038 },
    { angle: 4.51, radius: .026, width: .014, height: .165, lean: .032 },
    { angle: 5.16, radius: .092, width: .011, height: .125, lean: .046 },
    { angle: 5.79, radius: .058, width: .013, height: .152, lean: .035 },
  ]
  blades.forEach((blade) => {
    const radialX = Math.cos(blade.angle)
    const radialZ = Math.sin(blade.angle)
    const tangentX = -radialZ
    const tangentZ = radialX
    const baseX = radialX * blade.radius
    const baseZ = radialZ * blade.radius
    const point = (amount, side) => {
      const bend = blade.lean * amount * amount
      const halfWidth = blade.width * (1 - amount * .82)
      return [
        baseX + radialX * bend + tangentX * halfWidth * side,
        blade.height * amount,
        baseZ + radialZ * bend + tangentZ * halfWidth * side,
      ]
    }
    for (let segment = 0; segment < 3; segment += 1) {
      const start = segment / 3
      const end = (segment + 1) / 3
      const leftStart = point(start, -1)
      const rightStart = point(start, 1)
      const leftEnd = point(end, -1)
      const rightEnd = point(end, 1)
      positions.push(...leftStart, ...rightStart, ...rightEnd, ...leftStart, ...rightEnd, ...leftEnd)
    }
  })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function createGroundScatter(kind, clearings = []) {
  const target = kind === 'forest' ? 1220 : kind === 'ocean' ? 610 : kind === 'desert' ? 260 : 300
  const random = seededRandom(0xA57A + target)
  const grass = []
  const pebbles = []
  let attempts = 0
  while (grass.length < target && attempts < target * 34) {
    attempts += 1
    const angle = random() * Math.PI * 2
    const radius = Math.sqrt(random()) * (WORLD_RADIUS - 1.25)
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    if (isRiverWater(x, z) || terrainSlope(x, z) > .68 || isNearRoad(x, z)) continue
    if (Math.hypot(x, z - 5) < 2.9) continue
    if (WORLD_ZONES.some((zone) => zone.id !== 'landing' && Math.hypot(x - zone.position[0], z - zone.position[1]) < 1.35)) continue
    if (clearings.some((clearing) => Math.hypot(x - clearing.x, z - clearing.z) < clearing.radius)) continue
    if (valueNoise(x + 11.7, z - 4.2) < .32) continue
    let exposedSoil = 0
    GROUND_PATCHES.forEach((patch) => { exposedSoil = Math.max(exposedSoil, groundPatchMask(x, z, patch)) })
    if (exposedSoil > .34 && random() < exposedSoil) continue
    grass.push({ x, z, rotation: random() * Math.PI * 2, width: .84 + random() * .4, height: .56 + random() * .3, color: Math.floor(random() * 3) })
    if (pebbles.length < 72 && random() > .74) {
      pebbles.push({ x: x + (random() - .5) * .42, z: z + (random() - .5) * .42, rotation: random() * Math.PI * 2, scale: .55 + random() * .9, color: Math.floor(random() * 2) })
    }
  }
  return { grass, pebbles }
}

function GroundCover({ palette, clearings = [] }) {
  const grassRef = useRef()
  const pebbleRef = useRef()
  const scatter = useMemo(() => createGroundScatter(palette.prop, clearings), [clearings, palette.prop])
  const grassGeometry = useMemo(() => createGrassClumpGeometry(), [])

  useEffect(() => () => grassGeometry.dispose(), [grassGeometry])

  useEffect(() => {
    const grassMesh = grassRef.current
    const pebbleMesh = pebbleRef.current
    const dummy = new THREE.Object3D()
    const colors = (COVER_COLORS[palette.prop] || COVER_COLORS.forest).map((value) => new THREE.Color(value))
    const grassHadInstanceColor = Boolean(grassMesh.instanceColor)
    scatter.grass.forEach((instance, index) => {
      dummy.position.set(instance.x, terrainHeight(instance.x, instance.z) + .012, instance.z)
      dummy.rotation.set(0, instance.rotation, 0)
      dummy.scale.set(instance.width, instance.height, instance.width)
      dummy.updateMatrix()
      grassMesh.setMatrixAt(index, dummy.matrix)
      grassMesh.setColorAt(index, colors[instance.color])
    })
    grassMesh.instanceMatrix.needsUpdate = true
    if (grassMesh.instanceColor) grassMesh.instanceColor.needsUpdate = true
    if (!grassHadInstanceColor) grassMesh.material.needsUpdate = true
    grassMesh.computeBoundingSphere()

    const pebbleColors = (PEBBLE_COLORS[palette.prop] || PEBBLE_COLORS.forest).map((value) => new THREE.Color(value))
    const pebbleHadInstanceColor = Boolean(pebbleMesh.instanceColor)
    scatter.pebbles.forEach((instance, index) => {
      dummy.position.set(instance.x, terrainHeight(instance.x, instance.z) + .045 * instance.scale, instance.z)
      dummy.rotation.set(instance.rotation * .18, instance.rotation, instance.rotation * .12)
      dummy.scale.set(instance.scale * 1.25, instance.scale * .55, instance.scale)
      dummy.updateMatrix()
      pebbleMesh.setMatrixAt(index, dummy.matrix)
      pebbleMesh.setColorAt(index, pebbleColors[instance.color])
    })
    pebbleMesh.instanceMatrix.needsUpdate = true
    if (pebbleMesh.instanceColor) pebbleMesh.instanceColor.needsUpdate = true
    if (!pebbleHadInstanceColor) pebbleMesh.material.needsUpdate = true
    pebbleMesh.computeBoundingSphere()
  }, [palette, scatter])

  return (
    <group>
      <instancedMesh ref={grassRef} args={[grassGeometry, null, scatter.grass.length]} raycast={() => null}>
        <meshStandardMaterial side={THREE.DoubleSide} roughness={.96} metalness={0} emissive={palette.groundDeep} emissiveIntensity={.22} />
      </instancedMesh>
      <instancedMesh ref={pebbleRef} args={[null, null, scatter.pebbles.length]} raycast={() => null}>
        <dodecahedronGeometry args={[.09, 0]} />
        <meshStandardMaterial roughness={.96} metalness={.02} emissive="#252821" emissiveIntensity={.18} />
      </instancedMesh>
    </group>
  )
}

function TerrainRoads({ palette }) {
  const edgeGeometry = useMemo(() => createRibbonGeometry(PATH_NETWORK, .7, walkSurfaceHeight), [])
  const centerGeometry = useMemo(() => createRibbonGeometry(PATH_NETWORK, .5, walkSurfaceHeight), [])
  const tones = ROAD_TONES[palette.prop] || ROAD_TONES.forest
  useEffect(() => () => {
    edgeGeometry.dispose()
    centerGeometry.dispose()
  }, [centerGeometry, edgeGeometry])
  return (
    <group>
      <mesh geometry={edgeGeometry} receiveShadow>
        <meshStandardMaterial color={tones.edge} roughness={.98} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </mesh>
      <mesh geometry={centerGeometry} receiveShadow>
        <meshStandardMaterial color={tones.center} roughness={.96} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
      </mesh>
    </group>
  )
}

function River({ palette }) {
  const flowTextureRef = useRef()
  const geometry = useMemo(() => createRiverGeometry(), [])
  const flowTexture = useMemo(() => createRiverFlowTexture(), [])
  const flowColor = useMemo(() => new THREE.Color(palette.water).lerp(new THREE.Color('#eaffff'), .68), [palette.water])
  useEffect(() => {
    flowTextureRef.current = flowTexture
    return () => {
      flowTextureRef.current = null
      geometry.dispose()
      flowTexture.dispose()
    }
  }, [flowTexture, geometry])
  useFrame((state) => {
    const animatedTexture = flowTextureRef.current
    if (!animatedTexture) return
    animatedTexture.offset.x = -((state.clock.elapsedTime * .11) % 1)
    animatedTexture.offset.y = Math.sin(state.clock.elapsedTime * .42) * .003
  })
  return (
    <group>
      <mesh geometry={geometry} renderOrder={2}>
        <meshPhysicalMaterial color={palette.water} emissive={palette.water} emissiveIntensity={.13} transparent opacity={.86} roughness={.26} metalness={.03} clearcoat={.42} clearcoatRoughness={.25} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geometry} position={[0, .008, 0]} renderOrder={3} raycast={() => null}>
        <meshBasicMaterial map={flowTexture} color={flowColor} transparent opacity={.32} depthWrite={false} toneMapped />
      </mesh>
      {[-15, -10.5, -5.5, 6.5, 11, 15.5].map((x, index) => {
        const side = index % 2 ? -1 : 1
        const z = riverCenterZ(x) + riverWidth(x) * 1.35 * side
        return (
          <group key={x} position={[x, terrainHeight(x, z), z]} rotation={[0, x * .17, 0]}>
            <mesh position={[0, .18, 0]} scale={[.55, .32, .42]} castShadow><dodecahedronGeometry args={[.55, 0]} /><meshStandardMaterial color={palette.groundDeep} roughness={.92} /></mesh>
            {index % 3 === 0 && [-.22, 0, .22].map((offset) => <mesh key={offset} position={[offset, .42, .08]} rotation={[0, 0, offset * 1.1]}><coneGeometry args={[.045, .62, 6]} /><meshStandardMaterial color={palette.accent} roughness={.8} /></mesh>)}
          </group>
        )
      })}
    </group>
  )
}

function Bridge({ palette }) {
  const z = riverCenterZ(BRIDGE_X)
  return (
    <group position={[BRIDGE_X, 0, z]}>
      {Array.from({ length: 10 }, (_, index) => {
        const deckZ = -2.25 + index * .5
        return <mesh key={deckZ} position={[0, BRIDGE_DECK_HEIGHT - .09, deckZ]} receiveShadow castShadow><boxGeometry args={[2.45, .18, .43]} /><meshStandardMaterial color={index % 2 ? '#7c684f' : '#8b7758'} roughness={.82} metalness={.08} /></mesh>
      })}
      {[-1.08, 1.08].flatMap((x) => [-2.2, -1.1, 0, 1.1, 2.2].map((deckZ) => (
        <mesh key={`${x}_${deckZ}`} position={[x, BRIDGE_DECK_HEIGHT + .46, deckZ]} castShadow><cylinderGeometry args={[.055, .075, .94, 8]} /><meshStandardMaterial color="#405064" metalness={.58} roughness={.42} /></mesh>
      )))}
      {[-1.08, 1.08].map((x) => <mesh key={x} position={[x, BRIDGE_DECK_HEIGHT + .65, 0]}><boxGeometry args={[.07, .08, 4.75]} /><meshStandardMaterial color={palette.accent} emissive={palette.glow} emissiveIntensity={.5} metalness={.5} /></mesh>)}
      {[-1.85, 1.85].map((deckZ) => <mesh key={deckZ} position={[0, -.05, deckZ]}><cylinderGeometry args={[.32, .48, 1.05, 10]} /><meshStandardMaterial color="#334252" roughness={.72} metalness={.28} /></mesh>)}
    </group>
  )
}

function VillageHouse({ slot, palette }) {
  const [x, z] = slot.position
  const ground = terrainHeight(x, z)
  const wall = slot.variant % 2 ? '#6c8190' : '#788c86'
  const roof = slot.variant === 3 ? '#394c62' : slot.variant === 2 ? '#506178' : '#455b64'
  return (
    <group position={[x, ground, z]} rotation={[0, slot.rotation, 0]}>
      <mesh position={[0, .09, 0]} receiveShadow><cylinderGeometry args={[1.12, 1.3, .18, 12]} /><meshStandardMaterial color="#314449" roughness={.9} /></mesh>
      <mesh position={[0, .72, 0]} castShadow><boxGeometry args={[1.72, 1.25, 1.5]} /><meshStandardMaterial color={wall} roughness={.68} metalness={.14} /></mesh>
      <mesh position={[0, 1.55, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[1.35, .72, 4]} /><meshStandardMaterial color={roof} roughness={.52} metalness={.34} /></mesh>
      <mesh position={[0, .65, .77]}><boxGeometry args={[.46, .82, .08]} /><meshStandardMaterial color="#1e3340" roughness={.38} /></mesh>
      {[-.53, .53].map((windowX) => <mesh key={windowX} position={[windowX, .92, .765]}><boxGeometry args={[.3, .34, .07]} /><meshStandardMaterial color={palette.accent} emissive={palette.glow} emissiveIntensity={1.35} toneMapped={false} /></mesh>)}
      <mesh position={[.56, 1.95, -.25]}><cylinderGeometry args={[.035, .055, .7, 7]} /><meshStandardMaterial color="#748a96" metalness={.72} /></mesh>
      <mesh position={[.56, 2.32, -.25]}><sphereGeometry args={[.09, 9, 7]} /><meshStandardMaterial color={palette.accent} emissive={palette.glow} emissiveIntensity={2} /></mesh>
      <pointLight position={[0, .8, .95]} color={palette.glow} intensity={.25} distance={2.4} />
    </group>
  )
}

function SettlementVillage({ slots, palette, showBeacon }) {
  return (
    <group>
      {slots.map((slot) => <VillageHouse key={slot.id} slot={slot} palette={palette} />)}
      {showBeacon && (
        <group position={[VILLAGE_BEACON_POSITION[0], terrainHeight(...VILLAGE_BEACON_POSITION), VILLAGE_BEACON_POSITION[1]]}>
          <mesh position={[0, .08, 0]} receiveShadow><cylinderGeometry args={[1.05, 1.2, .16, 20]} /><meshStandardMaterial color={palette.path} roughness={.9} /></mesh>
          <mesh position={[0, .86, 0]} castShadow><cylinderGeometry args={[.08, .16, 1.55, 10]} /><meshStandardMaterial color="#607587" metalness={.68} roughness={.3} /></mesh>
          {[.48, .79, 1.1].map((height, index) => <mesh key={height} position={[0, height, 0]} rotation={[Math.PI / 2, 0, index * .55]}><torusGeometry args={[.26 + index * .1, .025, 7, 24]} /><meshStandardMaterial color={palette.accent} emissive={palette.glow} emissiveIntensity={1.25} /></mesh>)}
        </group>
      )}
    </group>
  )
}

function MountainDetails() {
  return (
    <group>
      {MOUNTAINS.map((peak, peakIndex) => (
        <group key={`${peak.x}_${peak.z}`} position={[peak.x, terrainHeight(peak.x, peak.z), peak.z]} rotation={[0, peakIndex * .8, 0]}>
          {[[-.75, .2, .75], [.2, .05, 1], [.78, -.22, .58]].map(([x, z, scale], index) => (
            <mesh key={index} position={[x, scale * .52, z]} scale={[scale, scale * 1.35, scale]} castShadow>
              <dodecahedronGeometry args={[.68, 0]} />
              <meshStandardMaterial color={index === 1 ? '#aebfba' : '#536966'} roughness={.94} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

function LandingPad({ palette }) {
  const ground = terrainHeight(0, 5)
  return (
    <group position={[0, ground + .08, 5]}>
      <mesh receiveShadow castShadow><cylinderGeometry args={[2.48, 2.72, .2, 48]} /><meshStandardMaterial color="#2e4354" metalness={.5} roughness={.48} /></mesh>
      <mesh position={[0, .12, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.38, 2.05, 48]} /><meshStandardMaterial color="#435c68" emissive={palette.glow} emissiveIntensity={.18} metalness={.58} roughness={.28} /></mesh>
      <mesh position={[0, .135, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.72, 1.8, 48]} /><meshBasicMaterial color={palette.accent} transparent opacity={.8} toneMapped={false} /></mesh>
      {Array.from({ length: 8 }, (_, index) => {
        const rotation = index / 8 * Math.PI * 2
        return <mesh key={rotation} position={[Math.sin(rotation) * 2.18, .22, Math.cos(rotation) * 2.18]} rotation={[0, rotation, 0]}><boxGeometry args={[.14, .12, .4]} /><meshStandardMaterial color={palette.accent} emissive={palette.glow} emissiveIntensity={1.5} toneMapped={false} /></mesh>
      })}
    </group>
  )
}

export default function WorldTerrain({ palette, villageSlots = [], showVillageBeacon = true, detailClearings = [], buildItem = '', onBuildHover, onBuildCommit }) {
  const terrainGeometry = useMemo(() => createTerrainGeometry(palette), [palette])
  const groundTextures = useMemo(() => createGroundDetailTextures(palette), [palette])
  useEffect(() => () => terrainGeometry.dispose(), [terrainGeometry])
  useEffect(() => () => {
    groundTextures.albedo.dispose()
    groundTextures.bump.dispose()
  }, [groundTextures])

  return (
    <group>
      <mesh
        geometry={terrainGeometry}
        receiveShadow
        onPointerMove={buildItem ? (event) => { event.stopPropagation(); onBuildHover?.(event.point) } : undefined}
        onClick={buildItem ? (event) => {
          if (event.delta > 4) return
          event.stopPropagation()
          onBuildCommit?.(event.point)
        } : undefined}
      >
        <meshStandardMaterial map={groundTextures.albedo} bumpMap={groundTextures.bump} bumpScale={.09} roughness={.95} metalness={.01} />
      </mesh>
      <mesh position={[0, -1.28, 0]} receiveShadow><cylinderGeometry args={[WORLD_RADIUS, WORLD_RADIUS - 2.4, 2.62, 96]} /><meshStandardMaterial color={palette.edge} roughness={.96} /></mesh>
      <mesh position={[0, -1.05, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[39, 96]} /><meshPhysicalMaterial color={palette.water} transparent opacity={.72} roughness={.17} metalness={.04} clearcoat={.38} /></mesh>
      <TerrainRoads palette={palette} />
      <GroundCover palette={palette} clearings={detailClearings} />
      <River palette={palette} />
      <Bridge palette={palette} />
      <SettlementVillage slots={villageSlots} palette={palette} showBeacon={showVillageBeacon} />
      <MountainDetails />
      {WORLD_ZONES.filter((zone) => zone.id !== 'landing').map((zone) => (
        <mesh key={zone.id} position={[zone.position[0], terrainHeight(zone.position[0], zone.position[1]) + .065, zone.position[1]]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.18, 2.25, 48]} />
          <meshBasicMaterial color={zone.color} transparent opacity={.14} depthWrite={false} />
        </mesh>
      ))}
      <LandingPad palette={palette} />
    </group>
  )
}
