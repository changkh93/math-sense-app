export const FRONTIER_GRAPHICS_KEY = 'metasense_frontier_graphics_v1'
export const FRONTIER_GRAPHICS = Object.freeze({
  low: Object.freeze({ label: '절약 · 저사양', dpr: .75, shadows: false, groundTextureSize: 96, marineDistance: 16, reefDistance: 16 }),
  balanced: Object.freeze({ label: '기본 · 균형', dpr: 1, shadows: false, groundTextureSize: 128, marineDistance: 24, reefDistance: 22 }),
  high: Object.freeze({ label: '고화질', dpr: 1.25, shadows: true, groundTextureSize: 256, marineDistance: 32, reefDistance: 28 }),
})
export function readFrontierGraphics(storage) {
  try { const value = storage?.getItem(FRONTIER_GRAPHICS_KEY); return Object.hasOwn(FRONTIER_GRAPHICS, value) ? value : 'balanced' } catch { return 'balanced' }
}
export function isMarineHabitatVisible(camera, habitat, distance) {
  return (camera.x - habitat.x) ** 2 + (camera.y - habitat.y) ** 2 + (camera.z - habitat.z) ** 2 < distance ** 2
}
