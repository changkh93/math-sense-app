const LOCAL_PDF_PREFIX = '/pdfs/'

const safelyDecode = (value) => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * Encode each segment of a locally hosted PDF path.
 *
 * Firestore contains human-readable filenames. Reserved URL characters in
 * those filenames (notably `?`) must be encoded or Firebase Hosting receives
 * a truncated path and serves the SPA fallback (`index.html`) in the iframe.
 */
export const normalizePdfUrl = (value = '') => {
  const url = String(value || '').trim()
  if (!url.startsWith(LOCAL_PDF_PREFIX)) return url

  return url
    .split('/')
    .map((segment) => encodeURIComponent(safelyDecode(segment)))
    .join('/')
}

export const getEmbeddablePdfUrl = (value = '') => {
  const url = normalizePdfUrl(value)
  if (!url) return ''

  const driveViewMatch = url.match(/drive\.google\.com\/file\/d\/([^/?]+)/)
  if (driveViewMatch?.[1]) {
    return `https://drive.google.com/file/d/${driveViewMatch[1]}/preview`
  }

  return url
}

