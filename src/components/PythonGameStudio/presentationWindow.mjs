// resizeTo uses outer-window dimensions; the game reports CSS-pixel dimensions.
export function presentationWindowSize(width, height, metrics) {
  if (![width, height].every(value => Number.isInteger(value) && value > 0 && value <= 16384)) return null
  const chromeWidth = Math.max(0, metrics.outerWidth - metrics.innerWidth)
  const chromeHeight = Math.max(0, metrics.outerHeight - metrics.innerHeight)
  return {
    width: Math.ceil(Math.min(width + chromeWidth, metrics.availWidth)),
    height: Math.ceil(Math.min(height + metrics.headerHeight + chromeHeight, metrics.availHeight)),
  }
}

export function presentationSizeLabel(width, height, renderedWidth, renderedHeight) {
  const scale = Math.min(renderedWidth / width, renderedHeight / height, 1)
  return `${width} × ${height} · ${scale >= 0.999 ? '원본 크기' : `화면에 맞춤 ${Math.round(scale * 100)}%`}`
}

export function presentationWindowPosition(size, metrics) {
  const left = metrics.availLeft || 0, top = metrics.availTop || 0
  return {
    left: Math.max(left, Math.min(metrics.screenX, left + metrics.availWidth - size.width)),
    top: Math.max(top, Math.min(metrics.screenY, top + metrics.availHeight - size.height)),
  }
}
