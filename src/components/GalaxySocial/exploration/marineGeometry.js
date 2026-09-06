import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { getOceanFloorY } from './frontierExploration.js'
import { OCEAN_DRAW_RADIUS } from '../../../utils/galaxyWorldBounds.js'

export const marineRandom = (seed) => {
  const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return n - Math.floor(n)
}
const color = (value) => new THREE.Color(value)

function finish(positions, indices, colors) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  if (colors)
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  g.computeBoundingSphere()
  return g
}

function painted(g, sample) {
  if (g.index) {
    const next = g.toNonIndexed()
    g.dispose()
    g = next
  }
  g.deleteAttribute('uv')
  const p = g.attributes.position,
    colors = []
  for (let i = 0; i < p.count; i++) {
    const c = sample(p.getX(i), p.getY(i), p.getZ(i))
    colors.push(c.r, c.g, c.b)
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  return g
}

function merge(parts) {
  const g = mergeGeometries(
    parts.map((part) => {
      if (!part.index) return part
      const next = part.toNonIndexed()
      part.dispose()
      return next
    }),
    false,
  )
  parts.forEach((p) => p.dispose())
  g.computeBoundingSphere()
  return g
}

function ellipsoid(position, scale, shade, segments = 16, rings = 10) {
  const g = new THREE.SphereGeometry(1, segments, rings)
  g.scale(...scale)
  g.translate(...position)
  return painted(g, typeof shade === 'function' ? shade : () => color(shade))
}

// A thin, curved membrane fan. Its root is attached to the body, not a cone.
function membrane(points, shade) {
  const positions = points.flat(),
    indices = []
  for (let i = 1; i < points.length - 1; i++) indices.push(0, i, i + 1)
  return painted(finish(positions, indices), () => color(shade))
}

export const FISH_PROFILES = [
  {
    id: 'surgeon',
    height: 0.225,
    width: 0.105,
    back: '#23556a',
    side: '#3d99ba',
    belly: '#c1d8c6',
    fin: '#dfbf63',
    size: 0.63,
    speed: 0.82,
  },
  {
    id: 'butterfly',
    height: 0.32,
    width: 0.087,
    back: '#9b8646',
    side: '#e6ce77',
    belly: '#f0e4b6',
    fin: '#ceb05c',
    size: 0.55,
    speed: 0.54,
  },
  {
    id: 'anthias',
    height: 0.17,
    width: 0.084,
    back: '#a64c64',
    side: '#da916d',
    belly: '#ecd0ab',
    fin: '#b9797c',
    size: 0.44,
    speed: 0.7,
  },
  {
    id: 'silver',
    height: 0.115,
    width: 0.068,
    back: '#3e777f',
    side: '#90b9bd',
    belly: '#e0e7d6',
    fin: '#6f9b9d',
    size: 0.34,
    speed: 1.1,
  },
]

export function createMarineFishGeometry(profileIndex) {
  const p = FISH_PROFILES[profileIndex]
  // +X points toward the mouth. A continuous profile narrows into the peduncle.
  const sections = [
    [-0.62, 0.12],
    [-0.5, 0.19],
    [-0.35, 0.5],
    [-0.15, 0.88],
    [0.08, 1],
    [0.27, 0.88],
    [0.43, 0.59],
    [0.54, 0.3],
    [0.59, 0.12],
  ]
  const positions = [],
    indices = [],
    colors = []
  const back = color(p.back),
    side = color(p.side),
    belly = color(p.belly)
  sections.forEach(([x, radius], ring) => {
    for (let j = 0; j <= 16; j++) {
      const angle = (j / 16) * Math.PI * 2
      const y = Math.cos(angle) * radius * p.height,
        z = Math.sin(angle) * radius * p.width
      positions.push(x, y, z)
      const c =
        y > 0
          ? side.clone().lerp(back, Math.pow(y / p.height, 0.65))
          : side.clone().lerp(belly, Math.min(1, (-y / p.height) * 1.6))
      // Gill edge and butterfly eye-band are narrow anatomical markings.
      if (x > 0.25 && x < 0.3) c.multiplyScalar(0.65)
      if (profileIndex === 1 && (x > 0.4 || (x > -0.36 && x < -0.3)))
        c.multiplyScalar(0.28)
      colors.push(c.r, c.g, c.b)
      if (ring && j < 16) {
        const a = ring * 17 + j,
          b = a - 17
        indices.push(b, b + 1, a, a, b + 1, a + 1)
      }
    }
  })
  const parts = [
    painted(finish(positions, indices, colors), (x, y) => {
      const c =
        y > 0
          ? side.clone().lerp(back, Math.min(1, y / p.height))
          : side.clone().lerp(belly, Math.min(1, (-y / p.height) * 1.5))
      if ((x > 0.25 && x < 0.3) || (profileIndex === 1 && x > 0.4))
        c.multiplyScalar(profileIndex === 1 ? 0.32 : 0.75)
      return c
    }),
  ]
  // Forked caudal fin with a narrow attachment, dorsal and anal membranes.
  parts.push(
    membrane(
      [
        [-0.58, 0, 0],
        [-0.83, 0.23, 0],
        [-0.93, 0.21, 0],
        [-0.83, 0.05, 0.008],
        [-0.79, 0, 0.01],
        [-0.83, -0.05, 0.008],
        [-0.93, -0.21, 0],
        [-0.83, -0.23, 0],
      ],
      p.fin,
    ),
  )
  parts.push(
    membrane(
      [
        [0.28, p.height * 0.68, 0],
        [0.16, p.height + 0.085, 0],
        [-0.08, p.height + 0.11, 0.006],
        [-0.38, p.height * 0.57, 0],
        [-0.49, 0.06, 0],
      ],
      p.fin,
    ),
  )
  parts.push(
    membrane(
      [
        [0.04, -p.height * 0.83, 0],
        [-0.12, -p.height - 0.06, 0],
        [-0.4, -p.height * 0.5, 0],
      ],
      p.fin,
    ),
  )
  for (const s of [-1, 1]) {
    parts.push(
      membrane(
        [
          [0.23, -0.025, s * p.width * 0.8],
          [0.04, -0.1, s * (p.width + 0.15)],
          [-0.12, -0.085, s * (p.width + 0.13)],
          [0.04, 0.015, s * p.width],
        ],
        p.fin,
      ),
    )
    parts.push(
      ellipsoid(
        [0.435, 0.035, s * p.width * 0.57],
        [0.023, 0.025, 0.008],
        '#b9bd7b',
        10,
      ),
    )
    parts.push(
      ellipsoid(
        [0.44, 0.035, s * (p.width * 0.57 + 0.008)],
        [0.014, 0.017, 0.006],
        '#10242a',
        10,
      ),
    )
  }
  return merge(parts)
}

function branch(start, end, radius, shade) {
  const a = new THREE.Vector3(...start),
    b = new THREE.Vector3(...end)
  const curve = new THREE.CatmullRomCurve3([
    a,
    a
      .clone()
      .lerp(b, 0.5)
      .add(new THREE.Vector3(radius * 0.9, 0, radius)),
    b,
  ])
  const g = new THREE.TubeGeometry(curve, 3, radius, 5, false)
  return painted(g, (_x, y) =>
    color(shade).lerp(color('#f3d7ae'), Math.min(0.5, Math.max(0, y) * 0.18)),
  )
}

export function createCoralGeometry(kind, seed = 1) {
  const parts = []
  const shades = ['#ce927e', '#b79bc5', '#7ea79d', '#c9b982']
  const shade = shades[seed % shades.length]
  if (kind === 0 || kind === 4) {
    const grow = (start, direction, length, radius, depth, key) => {
      const end = start.map((v, i) => v + direction[i] * length)
      parts.push(branch(start, end, radius, shade))
      if (!depth) {
        const tip = new THREE.OctahedronGeometry(radius * 1.08)
        tip.translate(...end)
        parts.push(painted(tip, () => color('#ecd3b5')))
        return
      }
      for (let j = 0; j < 3; j++) {
        const a = key * 2.4 + j * 2.1,
          spread = 0.42 + marineRandom(key + j) * 0.25
        const d = new THREE.Vector3(
          direction[0] * 0.6 + Math.cos(a) * spread,
          0.6 + marineRandom(key + j + 3) * 0.3,
          kind === 4
            ? Math.sin(a) * 0.08
            : direction[2] * 0.6 + Math.sin(a) * spread,
        ).normalize()
        grow(
          end,
          d.toArray(),
          length * (0.62 + marineRandom(key + j + 5) * 0.15),
          radius * 0.63,
          depth - 1,
          key * 3 + j + 1,
        )
      }
    }
    // Several basal colonies create rounded thickets instead of one bare trunk.
    for (let j = 0; j < 3; j++)
      grow(
        [Math.cos(j * 2.4) * 0.22, 0, Math.sin(j * 2.4) * 0.2],
        [Math.cos(j) * 0.3, 0.9, Math.sin(j) * 0.25],
        0.38,
        0.047,
        3,
        seed + j * 13,
      )
  } else if (kind === 1) {
    for (let layer = 0; layer < 4; layer++) {
      const pos = [],
        idx = [],
        size = 0.85 - layer * 0.13
      for (let ring = 0; ring <= 8; ring++)
        for (let j = 0; j <= 48; j++) {
          const a = (j / 48) * Math.PI * 2,
            r = (ring / 8) * size * (1 + 0.08 * Math.sin(a * 7 + seed))
          pos.push(
            Math.cos(a) * r,
            layer * 0.18 +
              0.08 * Math.pow(r / size, 2) +
              0.026 * Math.sin(a * 9 + r * 8),
            Math.sin(a) * r,
          )
          if (ring && j < 48) {
            const n = ring * 49 + j
            idx.push(n - 49, n, n + 1, n - 49, n + 1, n - 48)
          }
        }
      parts.push(
        painted(finish(pos, idx), (x, y, z) =>
          color(shade).lerp(
            color('#ddd5b1'),
            Math.pow(Math.min(1, Math.hypot(x, z) / size), 8) * 0.7,
          ),
        ),
      )
    }
  } else if (kind === 2) {
    const g = new THREE.SphereGeometry(1, 40, 24),
      p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i)
      const r =
        1 + 0.035 * Math.sin(x * 24 + Math.sin(z * 18) * 2) * Math.cos(y * 25)
      p.setXYZ(i, x * r * 0.65, y * r * 0.46 + 0.33, z * r * 0.59)
    }
    g.computeVertexNormals()
    parts.push(
      painted(g, (x, y, z) =>
        color('#8c9d72').lerp(
          color('#d3c99a'),
          (0.5 + 0.5 * Math.sin(x * 32 + Math.sin(z * 18) * 2 + y * 9)) * 0.8,
        ),
      ),
    )
  } else {
    for (let j = 0; j < 7; j++) {
      const h = 0.45 + marineRandom(seed + j) * 0.65,
        x = Math.cos(j * 2.4) * 0.36,
        z = Math.sin(j * 2.4) * 0.36
      const pos = [],
        idx = []
      // The outer wall curls over an irregular lip into a recessed interior.
      for (let ring = 0; ring <= 10; ring++)
        for (let k = 0; k <= 24; k++) {
          const a = (k / 24) * Math.PI * 2,
            inner = ring > 7,
            t = inner ? 1 - (ring - 8) * 0.1 : ring / 7
          const r =
            (inner ? 0.071 : 0.13 - t * 0.032) *
            (1 + 0.12 * Math.sin(a * 3 + j) + 0.045 * Math.sin(a * 9 + t * 3))
          pos.push(
            x + Math.cos(a) * r + t * t * 0.1 * Math.cos(j),
            t * h + 0.02 * t * Math.sin(a * 3 + j),
            z + Math.sin(a) * r + t * t * 0.1 * Math.sin(j),
          )
          if (ring && k < 24) {
            const n = ring * 25 + k
            idx.push(n - 25, n, n + 1, n - 25, n + 1, n - 24)
          }
        }
      parts.push(
        painted(finish(pos, idx), (_x, y) =>
          color('#a37b51').lerp(color('#d6b786'), Math.min(1, y / h) * 0.45),
        ),
      )
      const hole = new THREE.CircleGeometry(0.071, 24)
      hole.rotateX(-Math.PI / 2)
      hole.translate(x + 0.1 * Math.cos(j), h - 0.09, z + 0.1 * Math.sin(j))
      parts.push(painted(hole, () => color('#252c22')))
    }
  }
  return merge(parts)
}

export function createSeaweedGeometry(seed = 1) {
  const parts = []
  for (let blade = 0; blade < 7; blade++) {
    const positions = [],
      indices = [],
      angle = blade * 2.4,
      h = 0.6 + marineRandom(seed + blade) * 1.3
    for (let i = 0; i <= 12; i++) {
      const t = i / 12,
        bend = t * t * (0.4 + marineRandom(blade + seed) * 0.4),
        w = Math.sin(Math.PI * t) * 0.032 + 0.002
      for (const s of [-1, 1])
        positions.push(
          Math.cos(angle) * bend + s * w * Math.cos(angle + 1),
          t * h,
          Math.sin(angle) * bend + s * w * Math.sin(angle + 1),
        )
      if (i) {
        const n = i * 2
        indices.push(n - 2, n, n + 1, n - 2, n + 1, n - 1)
      }
    }
    parts.push(
      painted(finish(positions, indices), (_x, y) =>
        color('#254d38').lerp(color('#7f9b51'), Math.min(1, y / h) * 0.7),
      ),
    )
  }
  return merge(parts)
}

export function createTurtleGeometry() {
  const parts = []
  parts.push(
    ellipsoid(
      [0, 0.025, 0],
      [0.64, 0.22, 0.46],
      (x, y, z) => {
        const mottling =
          0.5 + 0.5 * Math.sin(x * 31 + Math.sin(z * 29)) * Math.cos(z * 37)
        return color('#606c45').lerp(
          color('#a49b62'),
          mottling * 0.32 + Math.max(0, y) * 0.8,
        )
      },
      48,
      24,
    ),
  )
  // Five vertebral shields and paired costal seams follow the curved carapace.
  const shellY = (x, z) =>
    0.025 +
    0.22 * Math.sqrt(Math.max(0, 1 - (x / 0.64) ** 2 - (z / 0.46) ** 2)) +
    0.003
  const seam = (points, closed = false) => {
    const outline = new THREE.CatmullRomCurve3(
      points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
      closed,
    )
    const projected = outline.getPoints(closed ? 48 : 24)
    if (closed) projected.pop()
    const curve = new THREE.CatmullRomCurve3(
      projected.map((p) => new THREE.Vector3(p.x, shellY(p.x, p.z), p.z)),
      closed,
    )
    parts.push(
      painted(
        new THREE.TubeGeometry(curve, closed ? 48 : 24, 0.0028, 4, false),
        () => color('#536044'),
      ),
    )
  }
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 0.218
    seam(
      [
        [x - 0.13, 0],
        [x - 0.1, -0.115],
        [x + 0.1, -0.115],
        [x + 0.13, 0],
        [x + 0.1, 0.115],
        [x - 0.1, 0.115],
      ],
      true,
    )
    if (i < 4)
      for (const s of [-1, 1]) {
        const edgeX = x + 0.11,
          edgeZ = s * 0.445 * Math.sqrt(Math.max(0.01, 1 - (edgeX / 0.64) ** 2))
        seam([
          [edgeX, s * 0.11],
          [edgeX + 0.035, s * 0.26],
          [edgeX, edgeZ],
        ])
      }
  }
  parts.push(ellipsoid([0, -0.105, 0], [0.57, 0.085, 0.41], '#bcb289', 24))
  parts.push(ellipsoid([0.58, -0.01, 0], [0.22, 0.11, 0.14], '#8e946a'))
  parts.push(
    ellipsoid([0.79, -0.005, 0], [0.2, 0.13, 0.15], (x, y, z) =>
      color('#8d986d').multiplyScalar(
        0.8 + 0.2 * Math.sin(x * 49 + z * 42) ** 2,
      ),
    ),
  )
  for (const side of [-1, 1])
    parts.push(
      ellipsoid(
        [0.87, 0.045, side * 0.122],
        [0.015, 0.016, 0.006],
        '#0e211c',
        10,
      ),
    )
  parts.push(
    membrane(
      [
        [-0.55, -0.1, 0],
        [-0.82, -0.1, 0.045],
        [-0.64, -0.09, -0.05],
      ],
      '#828b60',
    ),
  )
  return merge(parts)
}

export function createFlipperGeometry() {
  const g = new THREE.SphereGeometry(1, 18, 10),
    p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const t = (p.getZ(i) + 1) / 2,
      width = 1 - t * 0.72
    p.setXYZ(
      i,
      p.getX(i) * 0.24 * width - 0.22 * t * t,
      p.getY(i) * 0.028 * width,
      t * 0.78,
    )
  }
  g.computeVertexNormals()
  return painted(g, (x, _y, z) =>
    color('#7c875c').lerp(
      color('#b2ae7e'),
      0.3 + 0.15 * Math.sin(x * 70 + z * 51),
    ),
  )
}

export function createSeabedGeometry(worldRadius) {
  const positions = [],
    indices = []
  const radial = 220,
    angular = 512
  for (let ring = 0; ring <= radial; ring++) {
    // Concentrate samples in reachable water. The outer skirt disappears in fog.
    const d =
      ring < 190
        ? ring * 0.35
        : 66.5 + ((ring - 190) * (OCEAN_DRAW_RADIUS - worldRadius - 66.5)) / 30
    const radius = worldRadius + d
    for (let j = 0; j <= angular; j++) {
      const a = (j / angular) * Math.PI * 2,
        x = Math.cos(a) * radius,
        z = Math.sin(a) * radius
      positions.push(x, getOceanFloorY(x, z, worldRadius), z)
      if (ring && j < angular) {
        const n = ring * (angular + 1) + j,
          b = n - angular - 1
        indices.push(b, b + 1, n, n, b + 1, n + 1)
      }
    }
  }
  return finish(positions, indices)
}
