/**
 * Imports user-provided Frontier audio from public/sounds/frontier/v1/sound.
 *
 * The import is deterministic and intentionally keeps each replaced asset
 * provisional until creator/source/license metadata is supplied.
 */
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = path.join(projectRoot, 'public', 'sounds', 'frontier', 'v1', 'sound')
const runtimeRoot = path.join(projectRoot, 'public', 'sounds', 'frontier', 'v1')
const manifestPath = path.join(projectRoot, 'docs', 'audio', 'frontier-audio-assets.json')
const importedAt = new Date().toISOString()

const imports = [
  {
    source: 'background-loop.mp3',
    outputs: [
      {
        base: 'ambience/music/background-loop',
        filter: 'loudnorm=I=-16:TP=-1.5:LRA=7,afade=t=in:st=0:d=0.2,alimiter=limit=0.89',
        channels: 2,
      },
    ],
  },
  {
    source: 'base-hum.mp3',
    outputs: [
      {
        base: 'ambience/landing/landing-hum',
        filter: 'volume=-3dB,alimiter=limit=0.89',
        channels: 1,
      },
    ],
  },
  {
    source: 'forest.mp3',
    outputs: [
      {
        base: 'ambience/themes/forest-bed',
        duration: 30,
        filter: 'loudnorm=I=-16:TP=-1.5:LRA=6,afade=t=in:st=0:d=0.3,afade=t=out:st=29.6:d=0.4,alimiter=limit=0.89',
        channels: 2,
      },
    ],
  },
  {
    source: 'water-stream.mp3',
    outputs: [
      {
        base: 'ambience/river/river-loop',
        start: 10,
        duration: 24,
        filter: 'volume=8dB,afade=t=in:st=0:d=0.2,afade=t=out:st=23.8:d=0.2,alimiter=limit=0.89',
        channels: 1,
      },
    ],
  },
  {
    source: 'footstep.mp3',
    outputs: [
      ...[
        ['01', 0.97],
        ['02', 1],
        ['03', 1.035],
      ].map(([variant, ratio]) => ({
        base: `footsteps/path-${variant}`,
        filter: `asetrate=${Math.round(44100 * ratio)},aresample=48000,highpass=f=65,volume=4dB,alimiter=limit=0.89`,
        channels: 1,
      })),
      ...[
        ['01', 0.955],
        ['02', 0.985],
        ['03', 1.02],
      ].map(([variant, ratio]) => ({
        base: `footsteps/forest-${variant}`,
        filter: `asetrate=${Math.round(44100 * ratio)},aresample=48000,highpass=f=55,lowpass=f=5200,volume=4dB,alimiter=limit=0.89`,
        channels: 1,
      })),
      ...[
        ['01', 0.88],
        ['02', 0.92],
        ['03', 0.96],
      ].map(([variant, ratio]) => ({
        base: `footsteps/metal-${variant}`,
        filter: `asetrate=${Math.round(44100 * ratio)},aresample=48000,highpass=f=45,lowpass=f=1800,volume=1dB,afade=t=out:st=0.3:d=0.12,alimiter=limit=0.89`,
        channels: 1,
      })),
      {
        base: 'collisions/soft-01',
        filter: 'asetrate=30000,aresample=48000,highpass=f=35,lowpass=f=650,volume=-1dB,afade=t=out:st=0.42:d=0.2,alimiter=limit=0.89',
        channels: 1,
      },
      {
        base: 'collisions/metal-01',
        filter: 'asetrate=36000,aresample=48000,highpass=f=45,lowpass=f=1400,volume=-2dB,afade=t=out:st=0.34:d=0.18,alimiter=limit=0.89',
        channels: 1,
      },
      {
        base: 'collisions/wood-01',
        filter: 'asetrate=33000,aresample=48000,highpass=f=40,lowpass=f=900,volume=-1dB,afade=t=out:st=0.38:d=0.2,alimiter=limit=0.89',
        channels: 1,
      },
      {
        base: 'collisions/stone-01',
        filter: 'asetrate=32000,aresample=48000,highpass=f=40,lowpass=f=1150,volume=-2dB,afade=t=out:st=0.38:d=0.2,alimiter=limit=0.89',
        channels: 1,
      },
    ],
  },
  {
    source: 'footsteps-on-wood.mp3',
    outputs: [
      {
        base: 'footsteps/bridge-wood-01',
        start: 0.56,
        duration: 0.25,
        filter: 'afade=t=in:st=0:d=0.008,afade=t=out:st=0.21:d=0.04,volume=-2dB,alimiter=limit=0.89',
        channels: 1,
      },
      {
        base: 'footsteps/bridge-wood-02',
        start: 1.09,
        duration: 0.2,
        filter: 'afade=t=in:st=0:d=0.008,afade=t=out:st=0.16:d=0.04,volume=-2dB,alimiter=limit=0.89',
        channels: 1,
      },
      {
        base: 'footsteps/bridge-wood-03',
        start: 1.68,
        duration: 0.26,
        filter: 'afade=t=in:st=0:d=0.008,afade=t=out:st=0.22:d=0.04,volume=-2dB,alimiter=limit=0.89',
        channels: 1,
      },
    ],
  },
  {
    source: 'build-complete.mp3',
    outputs: [
      {
        base: 'interactions/build-complete',
        filter: 'highpass=f=45,alimiter=limit=0.89',
        channels: 1,
      },
    ],
  },
  {
    source: 'mission-complete.mp3',
    outputs: [
      {
        base: 'missions/mission-complete',
        filter: 'highpass=f=45,volume=6dB,alimiter=limit=0.89',
        channels: 1,
      },
    ],
  },
]

function encode(sourcePath, output, extension) {
  const targetPath = path.join(runtimeRoot, `${output.base}.${extension}`)
  mkdirSync(path.dirname(targetPath), { recursive: true })
  const codecArgs = extension === 'webm'
    ? ['-c:a', 'libopus', '-b:a', '96k', '-application', 'audio']
    : ['-c:a', 'libmp3lame', '-b:a', '128k']
  const inputArgs = [
    ...(Number.isFinite(output.start) ? ['-ss', String(output.start)] : []),
    '-i',
    sourcePath,
    ...(Number.isFinite(output.duration) ? ['-t', String(output.duration)] : []),
  ]
  const result = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      ...inputArgs,
      '-map_metadata',
      '-1',
      '-af',
      output.filter,
      '-ar',
      '48000',
      '-ac',
      String(output.channels),
      ...codecArgs,
      targetPath,
    ],
    { maxBuffer: 1024 * 1024 * 8 },
  )
  if (result.status !== 0) {
    throw new Error(
      `ffmpeg failed for ${targetPath}: ${result.stderr?.toString() || result.status}`,
    )
  }
  return targetPath
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const manifestByPath = new Map(manifest.assets.map((entry) => [entry.path, entry]))
const importedPaths = []

for (const definition of imports) {
  const sourcePath = path.join(sourceRoot, definition.source)
  if (!existsSync(sourcePath)) {
    throw new Error(`Missing custom source: ${sourcePath}`)
  }

  for (const output of definition.outputs) {
    for (const extension of ['webm', 'mp3']) {
      const targetPath = encode(sourcePath, output, extension)
      const runtimePath = `/sounds/frontier/v1/${output.base}.${extension}`
      const encoded = readFileSync(targetPath)
      manifestByPath.set(runtimePath, {
        path: runtimePath,
        sourceUrl: `user-provided://public/sounds/frontier/v1/sound/${definition.source}`,
        creator: 'User-provided source; creator not recorded',
        license: 'User-provided; verification pending',
        licenseUrl: 'internal://docs/audio/FRONTIER_AUDIO_FILE_CHECKLIST.md',
        downloadedAt: importedAt.slice(0, 10),
        sha256: createHash('sha256').update(encoded).digest('hex'),
        provisional: true,
        origin: definition.source,
        processing: {
          start: output.start ?? 0,
          duration: output.duration ?? null,
          filter: output.filter,
          sampleRate: 48000,
          channels: output.channels,
        },
      })
      importedPaths.push(runtimePath)
    }
  }
}

manifest.updatedAt = importedAt
manifest.provisional = true
manifest.customImport = {
  importedAt,
  importedPaths,
  sourceDirectory: 'public/sounds/frontier/v1/sound',
}
manifest.assets = [...manifestByPath.values()]
  .sort((first, second) => first.path.localeCompare(second.path))

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

console.log(
  `[Frontier Custom Audio] imported ${imports.length} source files`
  + ` · replaced ${importedPaths.length} runtime files`
)
