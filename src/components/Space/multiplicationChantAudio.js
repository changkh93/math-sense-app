const MANIFEST_URL = '/sounds/multiplication/v1/manifest.json'

let audioContext = null
let manifestPromise = null
const bufferPromises = new Map()

function getAudioContext() {
  if (audioContext) return audioContext
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) throw new Error('Web Audio is unavailable')
  audioContext = new AudioContextClass()
  return audioContext
}

async function loadManifest() {
  if (!manifestPromise) {
    manifestPromise = fetch(MANIFEST_URL, { cache: 'force-cache' })
      .then((response) => {
        if (!response.ok) throw new Error(`Multiplication chant manifest failed: ${response.status}`)
        return response.json()
      })
      .catch((error) => {
        manifestPromise = null
        throw error
      })
  }
  return manifestPromise
}

async function loadTableAudio(table) {
  const key = String(table)
  if (!bufferPromises.has(key)) {
    const bufferPromise = (async () => {
      const manifest = await loadManifest()
      const tableData = manifest.tables?.[key]
      if (!tableData) throw new Error(`No multiplication chant audio for ${table}단`)
      const response = await fetch(tableData.src, { cache: 'force-cache' })
      if (!response.ok) throw new Error(`Multiplication chant audio failed: ${response.status}`)
      const context = getAudioContext()
      const buffer = await context.decodeAudioData(await response.arrayBuffer())
      return { context, buffer, tableData }
    })().catch((error) => {
      bufferPromises.delete(key)
      throw error
    })
    bufferPromises.set(key, bufferPromise)
  }
  return bufferPromises.get(key)
}

export function primeMultiplicationChantAudio(tables) {
  try {
    const context = getAudioContext()
    context.resume().catch(() => {})
    const uniqueTables = [...new Set(tables.map(Number))]
    return Promise.allSettled(uniqueTables.map((table) => loadTableAudio(table)))
  } catch {
    return Promise.resolve([])
  }
}

export function playMultiplicationChantAudio(fact, { onStep, onEnd, onError, revealTarget = false } = {}) {
  let cancelled = false
  const sources = []
  const timers = []

  const stop = () => {
    cancelled = true
    timers.forEach((timer) => window.clearTimeout(timer))
    sources.forEach((source) => {
      try {
        source.stop()
      } catch {
        // A source that already ended needs no further cleanup.
      }
    })
  }

  ;(async () => {
    const { context, buffer, tableData } = await loadTableAudio(fact.table)
    if (cancelled) return
    await context.resume()
    if (cancelled) return

    const statements = tableData.statements?.slice(0, revealTarget ? fact.multiplier : Math.max(0, fact.multiplier - 1)) || []
    const question = tableData.questions?.[fact.multiplier - 1]
    if (!revealTarget && !question) throw new Error('The requested multiplication question audio is missing')
    if (revealTarget && statements.length !== fact.multiplier) throw new Error('The requested multiplication statement audio is missing')
    const phrases = revealTarget ? statements : [...statements, question]
    let startAt = context.currentTime + 0.04

    phrases.forEach((phrase, index) => {
      const source = context.createBufferSource()
      source.buffer = buffer
      source.connect(context.destination)
      source.start(startAt, phrase.offset, phrase.duration)
      sources.push(source)

      const stepDelay = Math.max(0, (startAt - context.currentTime) * 1000)
      timers.push(window.setTimeout(() => {
        if (!cancelled) onStep?.(index + 1)
      }, stepDelay))
      startAt += Math.max(tableData.cadenceSeconds || 1.17, phrase.duration + 0.055)
    })

    const endDelay = Math.max(0, (startAt - context.currentTime) * 1000)
    timers.push(window.setTimeout(() => {
      if (!cancelled) onEnd?.()
    }, endDelay))
  })().catch((error) => {
    if (!cancelled) onError?.(error)
  })

  return stop
}
