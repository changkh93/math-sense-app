// Deterministic, baked once on scene mount; no image request or per-frame noise.
const clamp = (n, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n))
const hash = (x, y) => {
  const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return v - Math.floor(v)
}
const noise = (x, y) => {
  const ix = Math.floor(x), iy = Math.floor(y)
  const fx = x - ix, fy = y - iy
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy)
  return (hash(ix, iy) * (1 - u) + hash(ix + 1, iy) * u) * (1 - v)
    + (hash(ix, iy + 1) * (1 - u) + hash(ix + 1, iy + 1) * u) * v
}

export function createCloudAtlas(width = 512, height = 256) {
  const data = new Uint8Array(width * height * 4)
  const lobes = [[.22, .43, .16, .16], [.37, .51, .2, .25], [.52, .56, .18, .28], [.67, .45, .19, .18], [.8, .4, .13, .12]]
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const tileX = Math.floor(x / (width / 2)), tileY = Math.floor(y / (height / 2))
    const variant = tileX + tileY * 2
    const u = (x % (width / 2)) / (width / 2 - 1), v = (y % (height / 2)) / (height / 2 - 1)
    const grain = noise(u * 21 + variant * 19, v * 14) * .55 + noise(u * 49, v * 33 + variant * 31) * .3 + noise(u * 101, v * 69) * .15
    let density = -1
    for (const [i, [cx, cy, rx, ry]] of lobes.entries()) {
      const shift = Math.sin(variant * 2.1 + i * 1.7) * .055
      density = Math.max(density, 1 - Math.hypot((u - cx) / rx, (v - cy - shift) / (ry * (1 + variant * .06))))
    }
    const edge = clamp(Math.min(u, 1 - u, v, 1 - v) * 14)
    const alpha = clamp((density + (grain - .48) * .3) * 3.4) * edge
    const light = clamp(.06 + v * .68 + density * .25 + grain * .28)
    const offset = (y * width + x) * 4
    data[offset] = data[offset + 1] = data[offset + 2] = Math.round(light * 255)
    data[offset + 3] = Math.round(alpha * 255)
  }
  return { data, width, height }
}

export function getCloudBanks(worldRadius, count) {
  return Array.from({ length: count }, (_, i) => {
    const angle = i * 2.399963
    const radius = worldRadius * (1.12 + (i % 4) * .31)
    return {
      x: Math.cos(angle) * radius, z: Math.sin(angle) * radius,
      y: 5.6 + (i % 3) * 1.4,
      width: 12 + (i % 4) * 2, height: 5 + (i % 3) * .65,
    }
  })
}

export function getFlightCameraFov({ flying, moving = false, sprinting = false, birdView = false }) {
  return flying && !birdView ? (moving ? sprinting ? 57 : 54 : 52) : 48
}
