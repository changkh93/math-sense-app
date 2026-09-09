import * as THREE from 'three'

const SURFACE_STYLES = {
  default: { colors: ['#09233d', '#2778a2', '#b9f3dd'], kind: 'land' },
  crystal: { colors: ['#20163f', '#754ab5', '#d9c8ff'], kind: 'facets', emissive: '#42256f', emissiveIntensity: 0.18, metalness: 0.24 },
  middle_math_core: { colors: ['#04142e', '#136ab0', '#8fefff'], kind: 'contours', emissive: '#0d4b78', emissiveIntensity: 0.18 },
  middle_math_analytics: { colors: ['#10133d', '#5130a7', '#b78cff'], kind: 'facets', emissive: '#342173', emissiveIntensity: 0.16 },
  middle_math_geometry: { colors: ['#19113b', '#7446aa', '#e0bcff'], kind: 'facets', metalness: 0.2 },
  middle_math_exam: { colors: ['#3e160d', '#b95028', '#ffe18b'], kind: 'medals', emissive: '#8b3517', emissiveIntensity: 0.22 },
  middle_math_numbers_expressions: { colors: ['#042c34', '#119c91', '#fff09a'], kind: 'arithmetic', emissive: '#075f58', emissiveIntensity: 0.17 },
  middle_math_absolute_geometry: { colors: ['#12342c', '#459166', '#c8efaa'], kind: 'facets' },
  middle_math_functions_statistics: { colors: ['#042c30', '#169464', '#9ff4c3'], kind: 'function_field', emissive: '#0a5d43', emissiveIntensity: 0.17 },
  middle_math_school_exam: { colors: ['#250d16', '#751c26', '#ff7b52'], kind: 'fissures', emissive: '#8f251b', emissiveIntensity: 0.24, metalness: 0.18 },
  elementary_mistake_notebook: { colors: ['#171337', '#42327d', '#d7a44f'], kind: 'fissures', emissive: '#855f20', emissiveIntensity: 0.22 },
  elementary_monthly_evaluation: { colors: ['#171e58', '#6958c9', '#ffe390'], kind: 'calendar', emissive: '#5546b0', emissiveIntensity: 0.3, metalness: 0.22 },
  python_foundation: { colors: ['#031a3c', '#0877cf', '#ffe36d'], kind: 'binary', emissive: '#0753a0', emissiveIntensity: 0.2 },
  python_advanced: { colors: ['#03252b', '#09a990', '#89ffdc'], kind: 'circuit', emissive: '#087b69', emissiveIntensity: 0.22, metalness: 0.12 },
  python_data: { colors: ['#11133d', '#5364c8', '#9cf4ff'], kind: 'data', emissive: '#39449b', emissiveIntensity: 0.2 },
  python_project: { colors: ['#290b3d', '#a1279a', '#ff9de7'], kind: 'arcade', emissive: '#74146d', emissiveIntensity: 0.22, metalness: 0.15 },
  python_math: { colors: ['#392408', '#c47b16', '#fff08a'], kind: 'prime', emissive: '#946018', emissiveIntensity: 0.22, metalness: 0.16 },
  algorithm_constellation: { colors: ['#090f35', '#374bc5', '#68f5ee'], kind: 'grid', emissive: '#2536a0', emissiveIntensity: 0.26, metalness: 0.18 },
  western_classic_neverland: { colors: ['#073745', '#168f75', '#b3db6f'], kind: 'land' },
  western_classic_nobel: { colors: ['#3a2715', '#9b6b2f', '#f6d98d'], kind: 'bands', emissive: '#6d481d', emissiveIntensity: 0.1, metalness: 0.16 },
  western_classic_heritage: { colors: ['#21133e', '#6d3d85', '#d8aa79'], kind: 'land' },
  reading_library: { colors: ['#2b1b16', '#81552d', '#e3bd72'], kind: 'grid', emissive: '#5a371a', emissiveIntensity: 0.16, metalness: 0.12 },
}

export const PROCEDURAL_PLANET_TYPES = new Set(Object.keys(SURFACE_STYLES))

export function getProceduralPlanetStyle(planetType, fallbackColor = '#4a90e2') {
  if (SURFACE_STYLES[planetType]) return SURFACE_STYLES[planetType]
  const base = new THREE.Color(fallbackColor)
  const dark = base.clone().multiplyScalar(0.22)
  const bright = base.clone().offsetHSL(0.03, -0.05, 0.24)
  return {
    colors: [`#${dark.getHexString()}`, `#${base.getHexString()}`, `#${bright.getHexString()}`],
    kind: 'land',
  }
}

function sampleSurface(kind, a, b, c, longitude, latitude) {
  const low = Math.sin(a * 5.3 + Math.sin(c * 3.7)) * Math.cos(b * 6.1 + Math.sin(a * 4.2))
  const middle = Math.sin(a * 11.7 + b * 4.1) * Math.cos(c * 13.3 - b * 2.9)
  const fine = Math.sin(a * 27.1 + c * 21.2) * Math.cos(b * 25.4 + a * 8.6)
  const noise = low * 0.58 + middle * 0.29 + fine * 0.13

  if (kind === 'bands') return 0.5 + Math.sin(latitude * 13 + noise * 3.2) * 0.28 + noise * 0.17
  if (kind === 'contours') {
    const contour = Math.abs(Math.sin((b + noise * 0.18) * 23))
    return THREE.MathUtils.clamp(0.2 + noise * 0.24 + (1 - contour) * 0.72, 0, 1)
  }
  if (kind === 'arithmetic') {
    const columns = 1 - THREE.MathUtils.smoothstep(Math.abs(Math.sin(longitude * 8)), 0, 0.14)
    const beads = Math.pow(Math.max(0, Math.cos(latitude * 12 + longitude * 3)), 12)
    return THREE.MathUtils.clamp(0.17 + noise * 0.25 + columns * 0.38 + beads * 0.58, 0, 1)
  }
  if (kind === 'function_field') {
    const graphA = 1 - THREE.MathUtils.smoothstep(Math.abs(Math.cos(latitude) - Math.sin(longitude * 2.5) * 0.48), 0.015, 0.08)
    const graphB = 1 - THREE.MathUtils.smoothstep(Math.abs(Math.cos(latitude) - Math.cos(longitude * 4) * 0.3), 0.015, 0.07)
    return THREE.MathUtils.clamp(0.14 + noise * 0.22 + Math.max(graphA, graphB) * 0.82, 0, 1)
  }
  if (kind === 'medals') {
    const longitudeCell = Math.round(longitude * 5) / 5
    const latitudeCell = Math.round(latitude * 7) / 7
    const medal = Math.pow(Math.max(0, Math.cos((longitude - longitudeCell) * 18) * Math.cos((latitude - latitudeCell) * 25)), 8)
    return THREE.MathUtils.clamp(0.12 + noise * 0.24 + medal * 0.86, 0, 1)
  }
  if (kind === 'facets') return Math.round(THREE.MathUtils.clamp(0.5 + noise * 0.55, 0, 1) * 5) / 5
  if (kind === 'fissures') {
    const ridge = 1 - THREE.MathUtils.smoothstep(Math.abs(noise), 0.035, 0.15)
    return THREE.MathUtils.clamp(0.15 + noise * 0.22 + ridge * 0.82, 0, 1)
  }
  if (kind === 'grid') {
    const longitudeLine = 1 - THREE.MathUtils.smoothstep(Math.abs(Math.sin(longitude * 6)), 0, 0.075)
    const latitudeLine = 1 - THREE.MathUtils.smoothstep(Math.abs(Math.sin(latitude * 9)), 0, 0.07)
    return THREE.MathUtils.clamp(0.25 + noise * 0.3 + Math.max(longitudeLine, latitudeLine) * 0.62, 0, 1)
  }
  if (kind === 'calendar') {
    const longitudeLine = 1 - THREE.MathUtils.smoothstep(Math.abs(Math.sin(longitude * 6)), 0, 0.09)
    const latitudeLine = 1 - THREE.MathUtils.smoothstep(Math.abs(Math.sin(latitude * 7)), 0, 0.08)
    const dateDot = Math.pow(Math.max(0, Math.cos(longitude * 12) * Math.cos(latitude * 14)), 16)
    return THREE.MathUtils.clamp(0.12 + noise * 0.18 + Math.max(longitudeLine, latitudeLine) * 0.48 + dateDot * 0.6, 0, 1)
  }
  if (kind === 'binary') {
    const cell = Math.sin(longitude * 16) * Math.sin(latitude * 12)
    const bit = cell > 0.32 ? 0.9 : cell < -0.45 ? 0.08 : 0.34
    return THREE.MathUtils.clamp(bit + noise * 0.12, 0, 1)
  }
  if (kind === 'circuit') {
    const longitudeTrace = 1 - THREE.MathUtils.smoothstep(Math.abs(Math.sin(longitude * 10 + Math.sin(latitude * 5))), 0, 0.075)
    const latitudeTrace = 1 - THREE.MathUtils.smoothstep(Math.abs(Math.sin(latitude * 12 + Math.cos(longitude * 3))), 0, 0.07)
    const node = Math.pow(Math.max(0, Math.cos(longitude * 15) * Math.cos(latitude * 17)), 22)
    return THREE.MathUtils.clamp(0.1 + noise * 0.2 + Math.max(longitudeTrace, latitudeTrace) * 0.58 + node * 0.75, 0, 1)
  }
  if (kind === 'data') {
    const column = Math.floor((longitude + Math.PI) / (Math.PI * 2) * 18)
    const height = 0.18 + (((column * 7) % 13) / 13) * 0.68
    const bar = Math.abs(b) < height && Math.abs(Math.sin(longitude * 18)) > 0.38 ? 0.82 : 0.12
    const equator = 1 - THREE.MathUtils.smoothstep(Math.abs(b), 0.02, 0.06)
    return THREE.MathUtils.clamp(bar + equator * 0.35 + noise * 0.12, 0, 1)
  }
  if (kind === 'arcade') {
    const tiles = Math.sin(longitude * 12) * Math.sin(latitude * 14)
    const lane = 1 - THREE.MathUtils.smoothstep(Math.abs(Math.sin(longitude * 4 + latitude * 2)), 0, 0.08)
    return THREE.MathUtils.clamp(0.2 + (tiles > 0.38 ? 0.58 : 0) + lane * 0.42 + noise * 0.12, 0, 1)
  }
  if (kind === 'prime') {
    const spiral = 1 - THREE.MathUtils.smoothstep(Math.abs(Math.sin(longitude * 7 + latitude * 13 + noise * 2)), 0, 0.1)
    const nodes = Math.pow(Math.max(0, Math.cos(longitude * 11) * Math.cos(latitude * 17)), 18)
    return THREE.MathUtils.clamp(0.14 + noise * 0.2 + spiral * 0.58 + nodes * 0.72, 0, 1)
  }
  return THREE.MathUtils.smoothstep(noise, -0.48, 0.5)
}

export function createProceduralPlanetTexture(planetType, fallbackColor) {
  const style = getProceduralPlanetStyle(planetType, fallbackColor)
  const width = 256
  const height = 128
  const pixels = new Uint8Array(width * height * 4)
  const palette = style.colors.map((hex) => new THREE.Color(hex))
  const point = new THREE.Color()

  for (let y = 0; y < height; y += 1) {
    const latitude = Math.PI * y / (height - 1)
    for (let x = 0; x < width; x += 1) {
      const longitude = Math.PI * 2 * x / (width - 1)
      const a = Math.sin(latitude) * Math.cos(longitude)
      const b = Math.cos(latitude)
      const c = Math.sin(latitude) * Math.sin(longitude)
      const value = THREE.MathUtils.clamp(sampleSurface(style.kind, a, b, c, longitude, latitude), 0, 1)
      const lowHalf = value < 0.5
      point.copy(palette[lowHalf ? 0 : 1]).lerp(palette[lowHalf ? 1 : 2], lowHalf ? value * 2 : (value - 0.5) * 2)
      const index = (y * width + x) * 4
      pixels[index] = Math.round(point.r * 255)
      pixels[index + 1] = Math.round(point.g * 255)
      pixels[index + 2] = Math.round(point.b * 255)
      pixels[index + 3] = 255
    }
  }

  const texture = new THREE.DataTexture(pixels, width, height)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.needsUpdate = true
  return texture
}
