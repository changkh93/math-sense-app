import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { OCEAN_DRAW_RADIUS } from '../../utils/galaxyWorldBounds.js'
import {
  BRIDGE_DECK_HEIGHT,
  BRIDGE_X,
  OCEAN_SURFACE_Y,
  LANDING_PAD_RADIUS,
  LANDING_PAD_SURFACE_LIFT,
  RIVER_SURFACE_Y,
  ROAD_CENTER_HALF_WIDTH,
  ROAD_EDGE_HALF_WIDTH,
  ROAD_SURFACE_LIFT,
  VILLAGE_BEACON_POSITION,
  WORLD_RADIUS,
  WORLD_ZONES,
  createEstuaryBankGeometry,
  createRiverGeometry,
  createRibbonGeometry,
  createTerrainGeometry,
  generatePathNetwork,
  getActiveWorldRadius,
  getRiverExtent,
  getTerrainMountains,
  isRiverWater,
  riverCenterZ,
  riverWidth,
  setActivePathNetwork,
  terrainHeight,
  terrainSlope,
  isNearRoad,
} from './GalaxyTerrainModel.js'

const GROUND_TEXTURE_SIZE = 512
const OCEAN_VERTEX_SHADER = `
  varying vec2 vLocal;
  varying vec3 vWorldPosition;

  void main() {
    vLocal = position.xy;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

const OCEAN_FRAGMENT_SHADER = `
  precision mediump float;

  uniform float uTime;
  uniform float uIslandRadius;
  uniform sampler2D uWaveMap;
  uniform vec3 uShallow;
  uniform vec3 uDeep;
  varying vec2 vLocal;
  varying vec3 vWorldPosition;

  void main() {
    float coastDistance = max(0.0, length(vLocal) - uIslandRadius);
    float depth = smoothstep(0.35, 32.0, coastDistance);
    vec2 waveUvA = vLocal * vec2(0.12, 0.17)
      + vec2(uTime * 0.012, uTime * 0.018);
    vec2 rotated = vec2(-vLocal.y, vLocal.x);
    vec2 waveUvB = rotated * vec2(0.085, 0.135)
      + vec2(-uTime * 0.008, uTime * 0.011);
    float waveA = texture2D(uWaveMap, waveUvA).r;
    float waveB = texture2D(uWaveMap, waveUvB).r;
    float wave = waveA * 0.72 + waveB * 0.28;
    float waveX = texture2D(uWaveMap, waveUvA + vec2(0.003, 0.0)).r * 0.72
      + texture2D(uWaveMap, waveUvB + vec2(0.003, 0.0)).r * 0.28;
    float waveY = texture2D(uWaveMap, waveUvA + vec2(0.0, 0.003)).r * 0.72
      + texture2D(uWaveMap, waveUvB + vec2(0.0, 0.003)).r * 0.28;
    vec3 surfaceNormal = normalize(vec3(
      (wave - waveX) * 4.2,
      1.0,
      (wave - waveY) * 4.2
    ));
    vec3 lightDirection = normalize(vec3(-0.38, 0.88, 0.28));
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    vec3 halfDirection = normalize(lightDirection + viewDirection);
    float reflection = pow(max(dot(surfaceNormal, halfDirection), 0.0), 54.0);
    float sparkle = pow(max(dot(surfaceNormal, halfDirection), 0.0), 120.0);
    float crest = smoothstep(0.7, 0.91, wave);
    float shoreBand = exp(-pow((coastDistance - 0.72) / 0.68, 2.0));
    float shoreFoam = smoothstep(0.6, 0.82, waveA) * shoreBand;
    float swell = sin(vLocal.x * 0.34 + vLocal.y * 0.11 - uTime * 0.24) * 0.5 + 0.5;
    vec3 water = mix(uShallow, uDeep, depth);
    water *= 0.985 + wave * 0.025 + swell * 0.008;
    water += vec3(0.18, 0.42, 0.58) * crest * mix(0.045, 0.025, depth);
    water += vec3(0.72, 0.91, 1.0) * reflection * 0.28;
    water += vec3(0.94, 0.99, 1.0) * sparkle * 0.38;
    water += vec3(0.8, 0.96, 1.0) * shoreFoam * 0.2;
    float opacity = 0.78;
    if (cameraPosition.y < vWorldPosition.y) {
      // Scatter light through the water column without a hard disc horizon.
      float transmission = exp(-length(cameraPosition - vWorldPosition) * 0.055);
      water = mix(vec3(0.012, 0.065, 0.095), vec3(0.23, 0.46, 0.43), transmission);
      water += vec3(0.16, 0.22, 0.17) * crest * transmission * 0.3;
      opacity = transmission * 0.75;
    }
    gl_FragColor = vec4(water, opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

const ESTUARY_VERTEX_SHADER = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const ESTUARY_FRAGMENT_SHADER = `
  precision mediump float;

  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uRiver;
  uniform vec3 uOcean;
  varying vec2 vUv;

  void main() {
    float endFade = 1.0 - smoothstep(0.86, 0.995, vUv.x);
    float sideFade = smoothstep(0.0, 0.075, vUv.y)
      * smoothstep(0.0, 0.075, 1.0 - vUv.y);
    float wave = sin(vUv.x * 92.0 - uTime * 0.55 + sin(vUv.y * 19.0) * 0.55);
    float glint = smoothstep(0.82, 0.99, wave) * 0.035;
    vec3 water = mix(uRiver, uOcean, smoothstep(0.67, 0.92, vUv.x));
    water += vec3(0.34, 0.58, 0.62) * glint;
    gl_FragColor = vec4(water, uOpacity * endFade * sideFade);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

const ESTUARY_FLOW_FRAGMENT_SHADER = `
  precision mediump float;

  uniform sampler2D uMap;
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;

  void main() {
    float endFade = 1.0 - smoothstep(0.82, 0.975, vUv.x);
    float sideFade = smoothstep(0.0, 0.1, vUv.y)
      * smoothstep(0.0, 0.1, 1.0 - vUv.y);
    vec4 flow = texture2D(uMap, vec2(vUv.x * 11.0 - uTime * 0.11, vUv.y));
    gl_FragColor = vec4(uColor, flow.a * endFade * sideFade * 0.24);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

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
  const worldRadius = getActiveWorldRadius()
  const albedoData = new Uint8Array(size * size * 4)
  const bumpData = new Uint8Array(size * size)
  const soil = SOIL_TONES[palette.prop] || SOIL_TONES.forest
  const ground = colorBytes(palette.ground)
  const groundDeep = colorBytes(palette.groundDeep)
  const highGround = mixColor(colorBytes(palette.path), [217, 229, 223], .28)
  const riverGround = mixColor(colorBytes(palette.water), groundDeep, .42)
  const cover = colorBytes((COVER_COLORS[palette.prop] || COVER_COLORS.forest)[1])

  for (let py = 0; py < size; py += 1) {
    const worldZ = (py / (size - 1) - .5) * worldRadius * 2
    for (let px = 0; px < size; px += 1) {
      const worldX = (px / (size - 1) - .5) * worldRadius * 2
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

function createOceanWaveTexture() {
  const size = 256
  const data = new Uint8Array(size * size)
  const tau = Math.PI * 2
  const waves = [
    { x: 0, y: 1, amplitude: .22, phase: .15 },
    { x: 1, y: 2, amplitude: .13, phase: 1.2 },
    { x: -1, y: 3, amplitude: .09, phase: 2.45 },
    { x: 2, y: 5, amplitude: .065, phase: .72 },
    { x: -3, y: 7, amplitude: .045, phase: 1.86 },
    { x: 5, y: 9, amplitude: .03, phase: 2.8 },
  ]

  for (let y = 0; y < size; y += 1) {
    const v = y / size
    for (let x = 0; x < size; x += 1) {
      const u = x / size
      // 수평에 가까운 긴 잔물결을 중심으로 작은 교차파를 합성한다.
      // 높은 거듭제곱 능선을 사용하지 않아 V자/다각형 무늬가 생기지 않는다.
      const warp = Math.sin((u * 2 + v) * tau) * .075
      let height = .5
      waves.forEach((wave) => {
        height += Math.sin(
          (u * wave.x + v * wave.y) * tau + wave.phase + warp,
        ) * wave.amplitude
      })
      data[y * size + x] = THREE.MathUtils.clamp(height * 255, 0, 255)
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RedFormat, THREE.UnsignedByteType)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = 4
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

// 길 중심선을 따라 돌 테두리/장식 인스턴스를 배치하기 위한 샘플링.
// 각 폴리선을 CatmullRom으로 샘플링해 일정 간격의 위치/법선(좌우 방향)을 반환.
function sampleRoadDecorationPoints(paths, spacing) {
  const result = []
  paths.forEach((path) => {
    const points = path.map(([x, z]) => new THREE.Vector3(x, 0, z))
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal')
    const totalLen = Math.max(.001, curve.getLength())
    const count = Math.max(2, Math.round(totalLen / spacing))
    for (let i = 0; i <= count; i += 1) {
      const t = i / count
      const point = curve.getPoint(t)
      const before = curve.getPoint(Math.max(0, t - .01))
      const after = curve.getPoint(Math.min(1, t + .01))
      const tx = after.x - before.x
      const tz = after.z - before.z
      const tLen = Math.max(.001, Math.hypot(tx, tz))
      result.push({
        x: point.x,
        z: point.z,
        // 접선에 수직(좌우) 방향 단위벡터
        sideX: -tz / tLen,
        sideZ: tx / tLen,
      })
    }
  })
  return result
}

function TerrainRoads({ palette, structurePositions }) {
  // 노드 기반 길 네트워크 자동 생성. 노드가 바뀌면 재계산.
  const pathNetwork = useMemo(() => generatePathNetwork(structurePositions), [structurePositions])
  // 발소리/분산 판정용 글로벌 활성 네트워크를 최신으로 유지.
  useEffect(() => { setActivePathNetwork(pathNetwork) }, [pathNetwork])

  const edgeGeometry = useMemo(() => createRibbonGeometry(pathNetwork, ROAD_EDGE_HALF_WIDTH, terrainHeight, ROAD_SURFACE_LIFT - 0.01), [pathNetwork])
  const centerGeometry = useMemo(() => createRibbonGeometry(pathNetwork, ROAD_CENTER_HALF_WIDTH, terrainHeight, ROAD_SURFACE_LIFT), [pathNetwork])
  const tones = ROAD_TONES[palette.prop] || ROAD_TONES.forest

  // 돌 테두리 인스턴스: 길 양쪽 가장자리에 작은 돌을 일정 간격으로 배치
  const stoneInstances = useMemo(() => {
    const samples = sampleRoadDecorationPoints(pathNetwork, 0.62)
    const pebblePalette = PEBBLE_COLORS[palette.prop] || PEBBLE_COLORS.forest
    const stones = []
    samples.forEach((s, idx) => {
      // 양쪽 가장자리(엣지 폭 근처)에 하나씩, 짝수/홀수로 좌/우 분산
      const side = idx % 2 === 0 ? 1 : -1
      const offset = ROAD_EDGE_HALF_WIDTH + 0.06 + ((idx * 37) % 10) * 0.01
      const x = s.x + s.sideX * side * offset
      const z = s.z + s.sideZ * side * offset
      // 돌은 길 가장자리 위에 놓이므로 길 표면 높이(terrainHeight + lift) 기준.
      const y = terrainHeight(x, z) + ROAD_SURFACE_LIFT
      const scaleN = 0.7 + ((idx * 53) % 10) * 0.06
      const rot = ((idx * 91) % 360) * (Math.PI / 180)
      const color = pebblePalette[idx % pebblePalette.length]
      stones.push({ position: [x, y + 0.04, z], scale: scaleN, rotationY: rot, color })
    })
    return stones
  }, [pathNetwork, palette.prop])

  const stoneGeometry = useMemo(() => new THREE.DodecahedronGeometry(0.085, 0), [])
  const stoneMaterial = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.96, flatShading: true }), [])
  const stoneRef = useRef()
  const stoneColorArray = useMemo(() => {
    const arr = new Float32Array(stoneInstances.length * 3)
    stoneInstances.forEach((s, i) => {
      const c = new THREE.Color(s.color)
      arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b
    })
    return arr
  }, [stoneInstances])

  useLayoutEffect(() => {
    const mesh = stoneRef.current
    if (!mesh) return
    const obj = new THREE.Object3D()
    stoneInstances.forEach((s, i) => {
      obj.position.set(s.position[0], s.position[1], s.position[2])
      obj.rotation.set(0, s.rotationY, 0)
      obj.scale.setScalar(s.scale)
      obj.updateMatrix()
      mesh.setMatrixAt(i, obj.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [stoneInstances])

  useEffect(() => () => {
    edgeGeometry.dispose()
    centerGeometry.dispose()
    stoneGeometry.dispose()
    stoneMaterial.dispose()
  }, [centerGeometry, edgeGeometry, stoneGeometry, stoneMaterial])

  return (
    <group>
      {/* 넓은 가장자리 띠 (어두운 흙). center보다 살짝 아래. */}
      <mesh geometry={edgeGeometry} receiveShadow>
        <meshStandardMaterial color={tones.edge} roughness={.98} />
      </mesh>
      {/* 중앙 띠 (밝은 흙, edge보다 살짝 위). z-fighting은 geometry 높이차로 해결. */}
      <mesh geometry={centerGeometry} receiveShadow>
        <meshStandardMaterial color={tones.center} roughness={.94} />
      </mesh>
      {/* 돌 테두리: 길 양쪽에 늘어선 작은 돌 */}
      {stoneInstances.length > 0 && (
        <instancedMesh
          ref={stoneRef}
          args={[stoneGeometry, stoneMaterial, stoneInstances.length]}
          castShadow
          receiveShadow
          frustumCulled={false}
        >
          <instancedBufferAttribute attach="instanceColor" args={[stoneColorArray, 3]} />
        </instancedMesh>
      )}
    </group>
  )
}

function OceanSurface({ palette }) {
  const materialRef = useRef()
  const waveTexture = useMemo(() => createOceanWaveTexture(), [])
  const worldRadius = getActiveWorldRadius()
  const uniforms = useMemo(() => {
    const shallow = new THREE.Color(palette.water).lerp(new THREE.Color('#2d8fbd'), .8)
    const deep = new THREE.Color(palette.edge).lerp(new THREE.Color('#06395f'), .78)
    return {
      uTime: { value: 0 },
      uIslandRadius: { value: worldRadius },
      uWaveMap: { value: waveTexture },
      uShallow: { value: shallow },
      uDeep: { value: deep },
    }
  }, [palette.edge, palette.water, waveTexture, worldRadius])

  useEffect(() => () => {
    waveTexture.dispose()
  }, [waveTexture])

  useFrame((state) => {
    if (materialRef.current) materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <group>
      <mesh position={[0, OCEAN_SURFACE_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-3} raycast={() => null}>
        <circleGeometry args={[OCEAN_DRAW_RADIUS, 192]} />
        <shaderMaterial
          ref={materialRef}
          uniforms={uniforms}
          vertexShader={OCEAN_VERTEX_SHADER}
          fragmentShader={OCEAN_FRAGMENT_SHADER}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, OCEAN_SURFACE_Y + .024, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1} raycast={() => null}>
        <ringGeometry args={[worldRadius - .22, worldRadius + .08, 128, 1, 1.2, Math.PI * 2 - .75]} />
        <meshBasicMaterial color={palette.groundDeep} transparent opacity={.28} depthWrite={false} />
      </mesh>
    </group>
  )
}

function EstuaryDetails({ palette }) {
  const rockRef = useRef()
  const rockGeometry = useMemo(() => new THREE.DodecahedronGeometry(.5, 0), [])
  const rockMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: palette.groundDeep,
    roughness: .94,
    flatShading: true,
  }), [palette.groundDeep])
  const riverExtent = getRiverExtent()
  const rocks = useMemo(() => [
    { t: .16, side: -1.28, scale: [.72, .48, .58], rotation: .2 },
    { t: .25, side: 1.34, scale: [.5, .34, .68], rotation: 1.1 },
    { t: .39, side: -1.23, scale: [.82, .43, .52], rotation: 2.4 },
    { t: .52, side: 1.2, scale: [.56, .38, .48], rotation: .7 },
    { t: .64, side: -1.05, scale: [.48, .3, .62], rotation: 1.8 },
    { t: .76, side: 1.06, scale: [.72, .4, .55], rotation: 2.7 },
    { t: .87, side: -1.02, scale: [.42, .27, .46], rotation: .9 },
    { t: .94, side: .92, scale: [.58, .32, .5], rotation: 2.1 },
  ].map((rock) => {
    const x = THREE.MathUtils.lerp(riverExtent.mouthStartX, riverExtent.mouthEndX, rock.t)
    const z = riverCenterZ(x) + riverWidth(x) * rock.side
    const radius = Math.hypot(x, z)
    const surface = radius < getActiveWorldRadius() - .2
      ? terrainHeight(x, z)
      : OCEAN_SURFACE_Y
    return { ...rock, x, z, y: Math.max(surface, OCEAN_SURFACE_Y) + .08 }
  }), [riverExtent.mouthEndX, riverExtent.mouthStartX])

  useLayoutEffect(() => {
    const mesh = rockRef.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    rocks.forEach((rock, index) => {
      dummy.position.set(rock.x, rock.y, rock.z)
      dummy.rotation.set(.08, rock.rotation, -.06)
      dummy.scale.set(...rock.scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [rocks])

  useEffect(() => () => {
    rockGeometry.dispose()
    rockMaterial.dispose()
  }, [rockGeometry, rockMaterial])

  const mouthZ = riverCenterZ(riverExtent.mouthEndX - 1.2)
  return (
    <group>
      <instancedMesh
        ref={rockRef}
        args={[rockGeometry, rockMaterial, rocks.length]}
        castShadow
        receiveShadow
      />
      <mesh
        position={[riverExtent.mouthEndX - 2.25, OCEAN_SURFACE_Y + .018, mouthZ + 2.05]}
        scale={[1.45, .14, .56]}
        rotation={[0, -.24, 0]}
        receiveShadow
      >
        <sphereGeometry args={[1, 14, 7]} />
        <meshStandardMaterial color={palette.edge} roughness={.98} />
      </mesh>
      <mesh
        position={[riverExtent.mouthEndX - .95, OCEAN_SURFACE_Y + .1, mouthZ - 2.02]}
        scale={[.74, .38, .62]}
        rotation={[0, .52, 0]}
        castShadow
      >
        <dodecahedronGeometry args={[.8, 0]} />
        <meshStandardMaterial color={palette.groundDeep} roughness={.94} />
      </mesh>
    </group>
  )
}

function EstuaryBanks({ palette }) {
  const leftBank = useMemo(() => createEstuaryBankGeometry(1), [])
  const rightBank = useMemo(() => createEstuaryBankGeometry(-1), [])
  const bankColor = useMemo(
    () => new THREE.Color(palette.groundDeep).lerp(new THREE.Color('#8d7b5a'), .34),
    [palette.groundDeep],
  )

  useEffect(() => () => {
    leftBank.dispose()
    rightBank.dispose()
  }, [leftBank, rightBank])

  return (
    <group>
      {[leftBank, rightBank].map((geometry, index) => (
        <mesh key={index} geometry={geometry} receiveShadow>
          <meshStandardMaterial
            color={bankColor}
            roughness={.96}
            metalness={0}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}

function River({ palette }) {
  const flowTextureRef = useRef()
  const waterMaterialRef = useRef()
  const flowMaterialRef = useRef()
  const riverExtent = getRiverExtent()
  const geometry = useMemo(() => {
    void riverExtent.mouthBlendEndX
    void riverExtent.sourceX
    return createRiverGeometry()
  }, [riverExtent.mouthBlendEndX, riverExtent.sourceX])
  const flowTexture = useMemo(() => createRiverFlowTexture(), [])
  const flowColor = useMemo(() => new THREE.Color(palette.water).lerp(new THREE.Color('#eaffff'), .68), [palette.water])
  const waterUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uOpacity: { value: .9 },
    uRiver: { value: new THREE.Color(palette.water) },
    uOcean: { value: new THREE.Color(palette.water).lerp(new THREE.Color('#2d8fbd'), .8) },
  }), [palette.water])
  const flowUniforms = useMemo(() => ({
    uMap: { value: flowTexture },
    uTime: { value: 0 },
    uColor: { value: flowColor },
  }), [flowColor, flowTexture])
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
    const elapsed = state.clock.elapsedTime
    animatedTexture.offset.x = -((elapsed * .11) % 1)
    animatedTexture.offset.y = Math.sin(elapsed * .42) * .003
    if (waterMaterialRef.current) waterMaterialRef.current.uniforms.uTime.value = elapsed
    if (flowMaterialRef.current) flowMaterialRef.current.uniforms.uTime.value = elapsed
  })
  return (
    <group>
      <mesh geometry={geometry} renderOrder={2} raycast={() => null}>
        <shaderMaterial
          ref={waterMaterialRef}
          uniforms={waterUniforms}
          vertexShader={ESTUARY_VERTEX_SHADER}
          fragmentShader={ESTUARY_FRAGMENT_SHADER}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={geometry} position={[0, .007, 0]} renderOrder={3} raycast={() => null}>
        <shaderMaterial
          ref={flowMaterialRef}
          uniforms={flowUniforms}
          vertexShader={ESTUARY_VERTEX_SHADER}
          fragmentShader={ESTUARY_FLOW_FRAGMENT_SHADER}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh
        position={[riverExtent.sourceX + .08, RIVER_SURFACE_Y - .006, riverCenterZ(riverExtent.sourceX)]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[1.18, .78, 1]}
        renderOrder={2}
        raycast={() => null}
      >
        <circleGeometry args={[1.04, 24]} />
        <meshPhysicalMaterial color={palette.water} transparent opacity={.84} roughness={.3} depthWrite={false} />
      </mesh>
      {[-11.05, -8.65, -5.5, 6.5, 9.2].map((x, index) => {
        const side = index % 2 ? -1 : 1
        const z = riverCenterZ(x) + riverWidth(x) * 1.35 * side
        return (
          <group key={x} position={[x, terrainHeight(x, z), z]} rotation={[0, x * .17, 0]}>
            <mesh position={[0, .18, 0]} scale={[.55, .32, .42]} castShadow><dodecahedronGeometry args={[.55, 0]} /><meshStandardMaterial color={palette.groundDeep} roughness={.92} /></mesh>
            {index % 3 === 0 && [-.22, 0, .22].map((offset) => <mesh key={offset} position={[offset, .42, .08]} rotation={[0, 0, offset * 1.1]}><coneGeometry args={[.045, .62, 6]} /><meshStandardMaterial color={palette.accent} roughness={.8} /></mesh>)}
          </group>
        )
      })}
      <EstuaryBanks palette={palette} />
      <EstuaryDetails palette={palette} />
    </group>
  )
}

function Bridge({ palette }) {
  const z = riverCenterZ(BRIDGE_X)
  const bankOffsets = [-2.55, 2.55]
  return (
    <group position={[BRIDGE_X, 0, z]}>
      <mesh
        position={[0, RIVER_SURFACE_Y - .006, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[1.35, 2.18, 1]}
        renderOrder={3}
        raycast={() => null}
      >
        <circleGeometry args={[1, 28]} />
        <meshBasicMaterial color="#061e2b" transparent opacity={.28} depthWrite={false} />
      </mesh>
      {Array.from({ length: 10 }, (_, index) => {
        const deckZ = -2.25 + index * .5
        return <mesh key={deckZ} position={[0, BRIDGE_DECK_HEIGHT - .09, deckZ]} receiveShadow castShadow><boxGeometry args={[2.45, .18, .43]} /><meshStandardMaterial color={index % 2 ? '#7c684f' : '#8b7758'} roughness={.82} metalness={.08} /></mesh>
      })}
      {[-1.08, 1.08].flatMap((x) => [-2.2, -1.1, 0, 1.1, 2.2].map((deckZ) => (
        <mesh key={`${x}_${deckZ}`} position={[x, BRIDGE_DECK_HEIGHT + .46, deckZ]} castShadow><cylinderGeometry args={[.055, .075, .94, 8]} /><meshStandardMaterial color="#405064" metalness={.58} roughness={.42} /></mesh>
      )))}
      {[-1.08, 1.08].map((x) => <mesh key={x} position={[x, BRIDGE_DECK_HEIGHT + .65, 0]}><boxGeometry args={[.07, .08, 4.75]} /><meshStandardMaterial color={palette.accent} emissive={palette.glow} emissiveIntensity={.5} metalness={.5} /></mesh>)}
      {[-1.85, 1.85].map((deckZ) => <mesh key={deckZ} position={[0, -.05, deckZ]}><cylinderGeometry args={[.32, .48, 1.05, 10]} /><meshStandardMaterial color="#334252" roughness={.72} metalness={.28} /></mesh>)}
      {bankOffsets.map((deckZ) => {
        const bankHeight = terrainHeight(BRIDGE_X, z + deckZ)
        return (
          <group key={`abutment_${deckZ}`} position={[0, bankHeight, deckZ]}>
            <mesh position={[0, .1, 0]} receiveShadow castShadow>
              <cylinderGeometry args={[.82, 1.02, .32, 8]} />
              <meshStandardMaterial color={palette.edge} roughness={.92} />
            </mesh>
            <mesh position={[0, .2, deckZ < 0 ? .28 : -.28]} receiveShadow>
              <boxGeometry args={[2.35, .18, .82]} />
              <meshStandardMaterial color={palette.path} roughness={.88} />
            </mesh>
          </group>
        )
      })}
      {[-1.85, 1.85].flatMap((deckZ) => [.56, .82].map((radius, index) => (
        <mesh
          key={`ripple_${deckZ}_${radius}`}
          position={[0, RIVER_SURFACE_Y + .012 + index * .002, deckZ]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={4}
          raycast={() => null}
        >
          <ringGeometry args={[radius, radius + .035, 28]} />
          <meshBasicMaterial color="#b8eef0" transparent opacity={index ? .16 : .26} depthWrite={false} toneMapped={false} />
        </mesh>
      )))}
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
  const mountains = getTerrainMountains()
  return (
    <group>
      {mountains.map((peak, peakIndex) => (
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
    <group position={[0, ground + LANDING_PAD_SURFACE_LIFT - .1, 5]}>
      <mesh receiveShadow castShadow><cylinderGeometry args={[2.48, LANDING_PAD_RADIUS, .2, 48]} /><meshStandardMaterial color="#2e4354" metalness={.5} roughness={.48} /></mesh>
      <mesh position={[0, .12, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.38, 2.05, 48]} /><meshStandardMaterial color="#435c68" emissive={palette.glow} emissiveIntensity={.18} metalness={.58} roughness={.28} /></mesh>
      <mesh position={[0, .135, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.72, 1.8, 48]} /><meshBasicMaterial color={palette.accent} transparent opacity={.8} toneMapped={false} /></mesh>
      {Array.from({ length: 8 }, (_, index) => {
        const rotation = index / 8 * Math.PI * 2
        return <mesh key={rotation} position={[Math.sin(rotation) * 2.18, .22, Math.cos(rotation) * 2.18]} rotation={[0, rotation, 0]}><boxGeometry args={[.14, .12, .4]} /><meshStandardMaterial color={palette.accent} emissive={palette.glow} emissiveIntensity={1.5} toneMapped={false} /></mesh>
      })}
    </group>
  )
}

export default function WorldTerrain({ palette, territoryExpanded = false, villageSlots = [], showVillage = true, showVillageBeacon = true, detailClearings = [], buildItem = '', structurePositions = [], onBuildHover, onBuildCommit }) {
  const terrainGeometry = useMemo(() => {
    void territoryExpanded
    return createTerrainGeometry(palette)
  }, [palette, territoryExpanded])
  const groundTextures = useMemo(() => {
    void territoryExpanded
    return createGroundDetailTextures(palette)
  }, [palette, territoryExpanded])
  useEffect(() => () => terrainGeometry.dispose(), [terrainGeometry])
  useEffect(() => () => {
    groundTextures.albedo.dispose()
    groundTextures.bump.dispose()
  }, [groundTextures])

  return (
    <group>
      <OceanSurface palette={palette} />
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
      {/* The continuous marine heightfield now joins this coast directly.
          A second island skirt here would overlap the seabed. */}
      <TerrainRoads palette={palette} structurePositions={structurePositions} />
      <GroundCover palette={palette} clearings={detailClearings} />
      <River palette={palette} />
      <Bridge palette={palette} />
      {showVillage && <SettlementVillage slots={villageSlots} palette={palette} showBeacon={showVillageBeacon} />}
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
