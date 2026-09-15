const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

export function clampFloatingControlCenter({
  x,
  y,
  containerWidth,
  containerHeight,
  controlWidth,
  controlHeight,
  padding = 8,
}) {
  const width = Math.max(1, Number(containerWidth) || 0)
  const height = Math.max(1, Number(containerHeight) || 0)
  const halfControlWidth = Math.min(width / 2, Math.max(0, Number(controlWidth) || 0) / 2)
  const halfControlHeight = Math.min(height / 2, Math.max(0, Number(controlHeight) || 0) / 2)
  const safePadding = Math.max(0, Number(padding) || 0)
  const minX = Math.min(width / 2, halfControlWidth + safePadding)
  const maxX = Math.max(width / 2, width - halfControlWidth - safePadding)
  const minY = Math.min(height / 2, halfControlHeight + safePadding)
  const maxY = Math.max(height / 2, height - halfControlHeight - safePadding)

  return {
    x: clamp(Number(x) || 0, minX, maxX),
    y: clamp(Number(y) || 0, minY, maxY),
  }
}

export function normalizeFloatingControlPosition({ x, y, containerWidth, containerHeight }) {
  const width = Math.max(1, Number(containerWidth) || 0)
  const height = Math.max(1, Number(containerHeight) || 0)
  return {
    x: clamp((Number(x) || 0) / width, 0, 1),
    y: clamp((Number(y) || 0) / height, 0, 1),
  }
}

export function parseFloatingControlPosition(value) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    if (typeof parsed?.x !== 'number' || typeof parsed?.y !== 'number') return null
    const x = Number(parsed?.x)
    const y = Number(parsed?.y)
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null
    return { x: clamp(x, 0, 1), y: clamp(y, 0, 1) }
  } catch {
    return null
  }
}
