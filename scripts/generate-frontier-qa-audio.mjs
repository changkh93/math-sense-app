/**
 * Deterministic, project-generated Frontier QA audio.
 *
 * These sounds are intentionally synthetic and provisional. They exist to verify
 * triggers, spatialization, loop cleanup, surface switching, and mix controls
 * before recorded production assets are approved.
 */
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const SAMPLE_RATE = 48000
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const runtimeRoot = path.join(projectRoot, 'public', 'sounds', 'frontier', 'v1')
const manifestPath = path.join(projectRoot, 'docs', 'audio', 'frontier-audio-assets.json')
const generatedAt = new Date().toISOString()

function hashSeed(value) {
  let hash = 2166136261
  for (const char of value) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function createRandom(seed) {
  let state = seed || 1
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function envelope(progress, attack = 0.03, decay = 5) {
  if (progress < 0 || progress > 1) return 0
  const attackGain = Math.min(1, progress / Math.max(attack, 0.0001))
  return attackGain * Math.exp(-decay * progress)
}

function addTone(
  samples,
  {
    start = 0,
    duration = 0.3,
    frequency = 440,
    endFrequency = frequency,
    amplitude = 0.3,
    attack = 0.03,
    decay = 5,
    wave = 'sine',
  },
) {
  const startIndex = Math.max(0, Math.floor(start * SAMPLE_RATE))
  const length = Math.min(
    samples.length - startIndex,
    Math.floor(duration * SAMPLE_RATE),
  )
  let phase = 0
  for (let index = 0; index < length; index += 1) {
    const progress = index / Math.max(1, length - 1)
    const currentFrequency = frequency + (endFrequency - frequency) * progress
    phase += 2 * Math.PI * currentFrequency / SAMPLE_RATE
    const oscillator = wave === 'triangle'
      ? 2 / Math.PI * Math.asin(Math.sin(phase))
      : Math.sin(phase)
    samples[startIndex + index] += (
      oscillator
      * amplitude
      * envelope(progress, attack, decay)
    )
  }
}

function addNoise(
  samples,
  random,
  {
    start = 0,
    duration = 0.3,
    amplitude = 0.3,
    attack = 0.02,
    decay = 5,
    lowpass = 0.08,
    highpassMix = 0,
    modulationHz = 0,
  },
) {
  const startIndex = Math.max(0, Math.floor(start * SAMPLE_RATE))
  const length = Math.min(
    samples.length - startIndex,
    Math.floor(duration * SAMPLE_RATE),
  )
  let lowState = 0
  for (let index = 0; index < length; index += 1) {
    const progress = index / Math.max(1, length - 1)
    const white = random() * 2 - 1
    lowState += lowpass * (white - lowState)
    const filtered = lowState * (1 - highpassMix) + (white - lowState) * highpassMix
    const modulation = modulationHz > 0
      ? 0.62 + 0.38 * Math.sin(2 * Math.PI * modulationHz * index / SAMPLE_RATE)
      : 1
    samples[startIndex + index] += (
      filtered
      * amplitude
      * modulation
      * envelope(progress, attack, decay)
    )
  }
}

function addAmbientNoise(
  samples,
  random,
  {
    amplitude = 0.2,
    lowpass = 0.03,
    highpassMix = 0,
    modulationHz = 0.12,
  } = {},
) {
  let lowState = 0
  for (let index = 0; index < samples.length; index += 1) {
    const white = random() * 2 - 1
    lowState += lowpass * (white - lowState)
    const filtered = lowState * (1 - highpassMix) + (white - lowState) * highpassMix
    const slowModulation = (
      0.62
      + 0.24 * Math.sin(2 * Math.PI * modulationHz * index / SAMPLE_RATE)
      + 0.14 * Math.sin(2 * Math.PI * modulationHz * 0.37 * index / SAMPLE_RATE)
    )
    samples[index] += filtered * amplitude * slowModulation
  }
}

function addSteadyTone(samples, frequency, amplitude, modulationHz = 0) {
  for (let index = 0; index < samples.length; index += 1) {
    const modulation = modulationHz > 0
      ? 0.72 + 0.28 * Math.sin(2 * Math.PI * modulationHz * index / SAMPLE_RATE)
      : 1
    samples[index] += (
      Math.sin(2 * Math.PI * frequency * index / SAMPLE_RATE)
      * amplitude
      * modulation
    )
  }
}

function normalize(samples, targetPeak) {
  let peak = 0
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample))
  const scale = peak > 0 ? targetPeak / peak : 1
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = Math.tanh(samples[index] * scale)
  }
  return samples
}

function makeSeamless(rawSamples, outputSeconds, crossfadeSeconds = 1) {
  const outputLength = Math.floor(outputSeconds * SAMPLE_RATE)
  const crossfadeLength = Math.floor(crossfadeSeconds * SAMPLE_RATE)
  const output = rawSamples.slice(0, outputLength)
  for (let index = 0; index < crossfadeLength; index += 1) {
    const mix = index / Math.max(1, crossfadeLength - 1)
    output[index] = (
      rawSamples[outputLength + index] * (1 - mix)
      + rawSamples[index] * mix
    )
  }
  return output
}

function synthesizeAmbient(profile, seed) {
  const outputSeconds = 12
  const crossfadeSeconds = 1
  const raw = new Float32Array((outputSeconds + crossfadeSeconds) * SAMPLE_RATE)
  const random = createRandom(seed)

  if (profile === 'music') {
    addSteadyTone(raw, 110, 0.12, 0.045)
    addSteadyTone(raw, 164.81, 0.07, 0.061)
    addSteadyTone(raw, 220, 0.04, 0.083)
    addAmbientNoise(raw, random, {
      amplitude: 0.08,
      lowpass: 0.018,
      modulationHz: 0.05,
    })
  } else if (profile === 'river') {
    addAmbientNoise(raw, random, {
      amplitude: 0.72,
      lowpass: 0.18,
      highpassMix: 0.72,
      modulationHz: 0.19,
    })
    addAmbientNoise(raw, random, {
      amplitude: 0.28,
      lowpass: 0.012,
      modulationHz: 0.08,
    })
    for (const start of [1.1, 2.8, 4.7, 7.2, 9.5, 11.6]) {
      addTone(raw, {
        start,
        duration: 0.16,
        frequency: 520 + random() * 260,
        endFrequency: 900 + random() * 320,
        amplitude: 0.08,
        attack: 0.05,
        decay: 7,
      })
    }
  } else if (profile === 'landing') {
    addSteadyTone(raw, 55, 0.23, 0.11)
    addSteadyTone(raw, 110, 0.08, 0.17)
    addSteadyTone(raw, 223, 0.025, 0.23)
    addAmbientNoise(raw, random, {
      amplitude: 0.16,
      lowpass: 0.02,
      modulationHz: 0.09,
    })
  } else if (profile === 'forest') {
    addAmbientNoise(raw, random, {
      amplitude: 0.34,
      lowpass: 0.025,
      modulationHz: 0.08,
    })
    addAmbientNoise(raw, random, {
      amplitude: 0.12,
      lowpass: 0.14,
      highpassMix: 0.76,
      modulationHz: 0.17,
    })
    for (const start of [1.8, 4.6, 7.9, 10.7]) {
      addTone(raw, {
        start,
        duration: 0.24,
        frequency: 1450 + random() * 350,
        endFrequency: 2450 + random() * 500,
        amplitude: 0.12,
        attack: 0.08,
        decay: 3.5,
      })
    }
  } else if (profile === 'ocean') {
    addAmbientNoise(raw, random, {
      amplitude: 0.6,
      lowpass: 0.055,
      modulationHz: 0.095,
    })
    addSteadyTone(raw, 46, 0.08, 0.08)
  } else if (profile === 'crystal') {
    addAmbientNoise(raw, random, {
      amplitude: 0.18,
      lowpass: 0.018,
      modulationHz: 0.07,
    })
    for (const start of [1.2, 3.4, 5.9, 8.1, 10.4]) {
      const base = 620 + random() * 180
      addTone(raw, {
        start,
        duration: 1.2,
        frequency: base,
        amplitude: 0.12,
        attack: 0.015,
        decay: 5,
      })
      addTone(raw, {
        start: start + 0.04,
        duration: 1,
        frequency: base * 1.5,
        amplitude: 0.06,
        attack: 0.02,
        decay: 6,
      })
    }
  } else if (profile === 'desert') {
    addAmbientNoise(raw, random, {
      amplitude: 0.46,
      lowpass: 0.015,
      highpassMix: 0.2,
      modulationHz: 0.055,
    })
    addSteadyTone(raw, 73, 0.04, 0.06)
  } else if (profile === 'mechanical') {
    addSteadyTone(raw, 62, 0.18, 0.13)
    addSteadyTone(raw, 124, 0.07, 0.27)
    addSteadyTone(raw, 372, 0.02, 0.41)
    addAmbientNoise(raw, random, {
      amplitude: 0.12,
      lowpass: 0.045,
      modulationHz: 0.2,
    })
  } else if (profile === 'ice') {
    addAmbientNoise(raw, random, {
      amplitude: 0.34,
      lowpass: 0.012,
      highpassMix: 0.35,
      modulationHz: 0.075,
    })
    for (const start of [2.3, 6.2, 9.8]) {
      addTone(raw, {
        start,
        duration: 1.5,
        frequency: 780 + random() * 220,
        endFrequency: 670 + random() * 160,
        amplitude: 0.08,
        attack: 0.02,
        decay: 5,
      })
    }
  }

  return normalize(makeSeamless(raw, outputSeconds, crossfadeSeconds), 0.58)
}

function synthesizeOneShot(profile, seed) {
  const random = createRandom(seed)
  const variant = (seed % 7) / 7
  let duration = 0.6
  if (profile.startsWith('footstep')) duration = 0.38
  if (profile.startsWith('collision')) duration = 0.55
  if (profile === 'ui-interact') duration = 0.32
  if (profile === 'ui-inspect') duration = 0.46
  if (profile === 'mission-complete') duration = 1.8
  if (profile === 'daily-complete' || profile === 'build-complete') duration = 1.25
  if (profile === 'rover-complete') duration = 1.55
  const samples = new Float32Array(Math.floor(duration * SAMPLE_RATE))

  if (profile === 'footstep-path') {
    addTone(samples, {
      duration: 0.2,
      frequency: 88 + variant * 18,
      endFrequency: 62,
      amplitude: 0.54,
      decay: 9,
    })
    addNoise(samples, random, {
      duration: 0.3,
      amplitude: 0.7,
      lowpass: 0.09,
      highpassMix: 0.35,
      decay: 8,
    })
  } else if (profile === 'footstep-wood') {
    addTone(samples, {
      duration: 0.34,
      frequency: 190 + variant * 35,
      endFrequency: 145,
      amplitude: 0.7,
      decay: 7,
    })
    addTone(samples, {
      duration: 0.28,
      frequency: 440 + variant * 60,
      amplitude: 0.25,
      decay: 10,
    })
    addNoise(samples, random, {
      duration: 0.2,
      amplitude: 0.32,
      lowpass: 0.12,
      decay: 10,
    })
  } else if (profile === 'footstep-metal') {
    addTone(samples, {
      duration: 0.36,
      frequency: 118 + variant * 22,
      endFrequency: 82,
      amplitude: 0.52,
      decay: 7,
    })
    addTone(samples, {
      duration: 0.38,
      frequency: 780 + variant * 170,
      amplitude: 0.34,
      decay: 5,
    })
    addTone(samples, {
      duration: 0.31,
      frequency: 1340 + variant * 220,
      amplitude: 0.18,
      decay: 6,
    })
  } else if (profile === 'footstep-forest') {
    addTone(samples, {
      duration: 0.18,
      frequency: 82 + variant * 12,
      endFrequency: 58,
      amplitude: 0.45,
      decay: 9,
    })
    addNoise(samples, random, {
      duration: 0.34,
      amplitude: 0.78,
      lowpass: 0.18,
      highpassMix: 0.62,
      decay: 7,
    })
  } else if (profile === 'collision-soft') {
    addTone(samples, {
      duration: 0.42,
      frequency: 82,
      endFrequency: 48,
      amplitude: 0.8,
      decay: 6,
    })
    addNoise(samples, random, {
      duration: 0.24,
      amplitude: 0.32,
      lowpass: 0.025,
      decay: 9,
    })
  } else if (profile === 'collision-metal') {
    addTone(samples, { duration: 0.5, frequency: 520, amplitude: 0.62, decay: 5 })
    addTone(samples, { duration: 0.45, frequency: 910, amplitude: 0.42, decay: 6 })
    addTone(samples, { duration: 0.4, frequency: 1510, amplitude: 0.22, decay: 7 })
  } else if (profile === 'collision-wood') {
    addTone(samples, {
      duration: 0.4,
      frequency: 175,
      endFrequency: 132,
      amplitude: 0.82,
      decay: 7,
    })
    addNoise(samples, random, {
      duration: 0.23,
      amplitude: 0.28,
      lowpass: 0.07,
      decay: 9,
    })
  } else if (profile === 'collision-stone') {
    addTone(samples, { duration: 0.34, frequency: 245, amplitude: 0.65, decay: 8 })
    addTone(samples, { duration: 0.28, frequency: 370, amplitude: 0.28, decay: 9 })
    addNoise(samples, random, {
      duration: 0.22,
      amplitude: 0.45,
      lowpass: 0.13,
      highpassMix: 0.5,
      decay: 9,
    })
  } else if (profile === 'water') {
    addNoise(samples, random, {
      duration: 0.55,
      amplitude: 0.75,
      lowpass: 0.2,
      highpassMix: 0.72,
      decay: 4,
    })
    for (const start of [0.04, 0.14, 0.27]) {
      addTone(samples, {
        start,
        duration: 0.18,
        frequency: 520 + random() * 420,
        endFrequency: 940 + random() * 520,
        amplitude: 0.22,
        attack: 0.04,
        decay: 6,
      })
    }
  } else if (profile === 'repair') {
    for (const start of [0, 0.14, 0.29]) {
      addTone(samples, {
        start,
        duration: 0.18,
        frequency: 680 + random() * 420,
        amplitude: 0.42,
        decay: 9,
      })
      addNoise(samples, random, {
        start,
        duration: 0.09,
        amplitude: 0.28,
        lowpass: 0.2,
        highpassMix: 0.65,
        decay: 10,
      })
    }
  } else if (profile === 'pickup') {
    for (const [start, frequency] of [[0, 740], [0.09, 990], [0.19, 1320]]) {
      addTone(samples, {
        start,
        duration: 0.42,
        frequency,
        amplitude: 0.42,
        decay: 6,
      })
    }
  } else if (profile === 'ui-interact') {
    addTone(samples, {
      duration: 0.25,
      frequency: 240,
      endFrequency: 320,
      amplitude: 0.46,
      attack: 0.012,
      decay: 7,
    })
    addNoise(samples, random, {
      duration: 0.16,
      amplitude: 0.18,
      lowpass: 0.045,
      decay: 10,
    })
  } else if (profile === 'ui-inspect') {
    for (const [start, frequency] of [[0, 280], [0.1, 360], [0.2, 460]]) {
      addTone(samples, {
        start,
        duration: 0.25,
        frequency,
        endFrequency: frequency * 1.04,
        amplitude: 0.32,
        attack: 0.015,
        decay: 7,
      })
    }
  } else if (profile === 'warning') {
    addTone(samples, { duration: 0.18, frequency: 680, amplitude: 0.55, decay: 6 })
    addTone(samples, { start: 0.25, duration: 0.2, frequency: 680, amplitude: 0.55, decay: 6 })
  } else if (profile === 'invalid' || profile === 'soft-error') {
    addTone(samples, {
      duration: 0.28,
      frequency: profile === 'invalid' ? 360 : 420,
      endFrequency: profile === 'invalid' ? 245 : 260,
      amplitude: 0.62,
      decay: 5,
      wave: 'triangle',
    })
    if (profile === 'soft-error') {
      addTone(samples, {
        start: 0.22,
        duration: 0.28,
        frequency: 310,
        endFrequency: 210,
        amplitude: 0.42,
        decay: 5,
      })
    }
  } else {
    const arpeggios = {
      'build-complete': [392, 523, 659],
      'daily-complete': [440, 554, 659],
      'rover-complete': [330, 440, 660, 880],
      'mission-complete': [392, 494, 659, 784],
    }
    const notes = arpeggios[profile] || [440, 660]
    notes.forEach((frequency, index) => {
      addTone(samples, {
        start: index * 0.18,
        duration: Math.max(0.45, duration - index * 0.15),
        frequency,
        amplitude: 0.4 - index * 0.035,
        attack: 0.02,
        decay: 5,
      })
    })
  }

  return normalize(samples, 0.84)
}

function createWaveBuffer(samples) {
  const dataLength = samples.length * 2
  const buffer = Buffer.alloc(44 + dataLength)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataLength, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(SAMPLE_RATE, 24)
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataLength, 40)
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]))
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + index * 2)
  }
  return buffer
}

function encode(waveBuffer, targetPath, codec) {
  mkdirSync(path.dirname(targetPath), { recursive: true })
  const codecArgs = codec === 'webm'
    ? ['-c:a', 'libopus', '-b:a', '96k', '-application', 'audio']
    : ['-c:a', 'libmp3lame', '-b:a', '128k']
  const result = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      'pipe:0',
      '-map_metadata',
      '-1',
      '-ar',
      String(SAMPLE_RATE),
      '-ac',
      '1',
      ...codecArgs,
      targetPath,
    ],
    { input: waveBuffer, maxBuffer: 1024 * 1024 * 8 },
  )
  if (result.status !== 0) {
    throw new Error(
      `ffmpeg failed for ${targetPath}: ${result.stderr?.toString() || result.status}`,
    )
  }
}

const themes = ['forest', 'ocean', 'crystal', 'desert', 'mechanical', 'ice']
const assets = [
  { base: 'ambience/music/background-loop', profile: 'music', loop: true },
  { base: 'ambience/river/river-loop', profile: 'river', loop: true },
  { base: 'ambience/landing/landing-hum', profile: 'landing', loop: true },
  ...themes.map((theme) => ({
    base: `ambience/themes/${theme}-bed`,
    profile: theme,
    loop: true,
  })),
  ...['01', '02', '03'].map((variant) => ({
    base: `footsteps/path-${variant}`,
    profile: 'footstep-path',
  })),
  ...['01', '02', '03'].map((variant) => ({
    base: `footsteps/bridge-wood-${variant}`,
    profile: 'footstep-wood',
  })),
  ...['01', '02', '03'].map((variant) => ({
    base: `footsteps/metal-${variant}`,
    profile: 'footstep-metal',
  })),
  ...['01', '02', '03'].map((variant) => ({
    base: `footsteps/forest-${variant}`,
    profile: 'footstep-forest',
  })),
  { base: 'collisions/soft-01', profile: 'collision-soft' },
  { base: 'collisions/metal-01', profile: 'collision-metal' },
  { base: 'collisions/wood-01', profile: 'collision-wood' },
  { base: 'collisions/stone-01', profile: 'collision-stone' },
  { base: 'ui/build-invalid', profile: 'invalid' },
  { base: 'ui/interact', profile: 'ui-interact' },
  { base: 'ui/inspect', profile: 'ui-inspect' },
  { base: 'interactions/water', profile: 'water' },
  { base: 'interactions/repair', profile: 'repair' },
  { base: 'interactions/daily-complete', profile: 'daily-complete' },
  { base: 'interactions/rover-complete', profile: 'rover-complete' },
  { base: 'ui/mission-warning', profile: 'warning' },
  { base: 'interactions/pickup', profile: 'pickup' },
  { base: 'missions/mission-complete', profile: 'mission-complete' },
  { base: 'interactions/build-complete', profile: 'build-complete' },
  { base: 'ui/soft-error', profile: 'soft-error' },
]

if (assets.length !== 37) {
  throw new Error(`Expected 37 logical assets, received ${assets.length}`)
}

const manifestEntries = []

for (const asset of assets) {
  const seed = hashSeed(`${asset.base}:${asset.profile}`)
  const samples = asset.loop
    ? synthesizeAmbient(asset.profile, seed)
    : synthesizeOneShot(asset.profile, seed)
  const waveBuffer = createWaveBuffer(samples)

  for (const extension of ['webm', 'mp3']) {
    const targetPath = path.join(runtimeRoot, `${asset.base}.${extension}`)
    encode(waveBuffer, targetPath, extension)
    const encodedBuffer = await import('node:fs/promises')
      .then(({ readFile }) => readFile(targetPath))
    manifestEntries.push({
      path: `/sounds/frontier/v1/${asset.base}.${extension}`,
      sourceUrl: `internal://scripts/generate-frontier-qa-audio.mjs#${asset.profile}`,
      creator: 'MetaSense Frontier QA Synthesizer',
      license: 'Project-generated provisional QA asset',
      licenseUrl: 'internal://docs/audio/FRONTIER_AUDIO_FILE_CHECKLIST.md',
      downloadedAt: generatedAt.slice(0, 10),
      sha256: createHash('sha256').update(encodedBuffer).digest('hex'),
      provisional: true,
      profile: asset.profile,
    })
  }
}

writeFileSync(
  manifestPath,
  `${JSON.stringify({
    version: 1,
    updatedAt: generatedAt,
    provisional: true,
    generatedBy: 'scripts/generate-frontier-qa-audio.mjs',
    assets: manifestEntries,
  }, null, 2)}\n`,
)

console.log(
  `[Frontier QA Audio] generated ${assets.length} logical assets`
  + ` · ${manifestEntries.length} runtime files`
)
