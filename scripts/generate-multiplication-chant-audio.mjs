import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdir, mkdtemp, readFile, unlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import {
  MULTIPLICATION_TABLES,
  MULTIPLIERS,
  buildMultiplicationQuestion,
  buildMultiplicationStatement,
} from '../src/components/Space/multiplicationCardLabModel.js'

const FIREBASE_PROJECT = 'math-sense-1f6a8'
const OPENAI_PROJECT = 'proj_S7uL2bHA4redF0r90zUcfxRe'
const MODEL = 'gpt-audio-1.5'
const VOICE = 'marin'
const OUTPUT_ROOT = path.resolve('public/sounds/multiplication/v1')
const CACHE_ROOT = path.resolve('.cache/multiplication-chant-audio/v1')
const GENERATION_CONCURRENCY = 6

if (!process.argv.includes('--generate')) {
  console.error('Usage: node scripts/generate-multiplication-chant-audio.mjs --generate [--tables=2,3]')
  process.exit(2)
}

const tableArgument = process.argv.find((argument) => argument.startsWith('--tables='))?.split('=')[1]
const tables = tableArgument
  ? tableArgument.split(',').map(Number).filter((table) => MULTIPLICATION_TABLES.includes(table))
  : MULTIPLICATION_TABLES

if (!tables.length) throw new Error('No valid multiplication tables selected')

function loadFirebaseTools() {
  const globalRoot = execFileSync('npm', ['root', '-g'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  return createRequire(path.join(globalRoot, 'firebase-tools/package.json'))
}

async function getApiKey() {
  const firebase = loadFirebaseTools()
  const { logger } = firebase('./lib/logger.js')
  logger.silent = true
  logger.clear()
  const auth = firebase('./lib/auth.js')
  const account = auth.getGlobalDefaultAccount()
  await firebase('./lib/requireAuth.js').requireAuth({
    project: FIREBASE_PROJECT,
    nonInteractive: true,
    user: account?.user,
    tokens: account?.tokens,
  })
  const secrets = firebase('./lib/gcp/secretManager.js')
  const metadata = await secrets.getSecretVersion(FIREBASE_PROJECT, 'OPENAI_API_KEY', 'latest')
  if (metadata.state !== 'ENABLED') throw new Error('OPENAI_API_KEY is not enabled')
  const apiKey = (await secrets.accessSecretVersion(FIREBASE_PROJECT, 'OPENAI_API_KEY', metadata.versionId)).trim()
  if (!/^sk-[A-Za-z0-9_-]{30,}$/.test(apiKey)) throw new Error('OPENAI_API_KEY has an unexpected format')
  return { apiKey, secretVersion: metadata.versionId }
}

function normalizeTranscript(text) {
  return String(text || '').normalize('NFC').replace(/[^0-9\p{Script=Hangul}]/gu, '')
}

function hasLongInternalSilence(file) {
  const duration = audioDuration(file)
  const result = spawnSync('ffmpeg', [
    '-hide_banner', '-i', file,
    '-af', 'silencedetect=noise=-38dB:d=0.25',
    '-f', 'null', '-',
  ], { encoding: 'utf8' })
  const log = `${result.stderr || ''}\n${result.stdout || ''}`
  const events = [...log.matchAll(/silence_(start|end):\s*([0-9.]+)/g)]
  let start = null
  for (const [, type, value] of events) {
    const time = Number(value)
    if (type === 'start') start = time
    else if (start !== null) {
      const silenceDuration = time - start
      const isLongInternalGap = start > 0.08 && time < duration - 0.05 && silenceDuration > 0.8
      const leavesTooLittleBefore = time >= duration - 0.05 && start < 0.4 && silenceDuration > 0.8
      const leavesTooLittleAfter = start <= 0.05 && duration - time < 0.4 && silenceDuration > 0.8
      if (isLongInternalGap || leavesTooLittleBefore || leavesTooLittleAfter) return true
      start = null
    }
  }
  return false
}

async function synthesizePhrase({ apiKey, phrase, kind, table, multiplier, output }) {
  try {
    const cached = await readFile(output)
    const duration = audioDuration(output)
    if (cached.length > 44 && duration >= 0.25 && duration <= 6 && !hasLongInternalSilence(output)) {
      return { transcript: phrase, cached: true }
    }
    await unlink(output)
  } catch {
    // A missing cache entry is expected on the first run.
  }

  const questionInstruction = kind === 'question'
    ? '답을 말하지 말고, 마지막 조사를 살짝 올리는 짧은 질문 억양으로 끝내세요.'
    : '마지막 정답 수까지 또렷하게 말하세요.'

  let lastError
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'OpenAI-Project': OPENAI_PROJECT,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          modalities: ['text', 'audio'],
          audio: { voice: VOICE, format: 'wav' },
          messages: [
            {
              role: 'developer',
              content: `한국 초등학생이 구구단을 외울 때 듣는 빠르고 또렷한 성우 음성입니다. 노래하거나 과장하지 말고 경쾌한 암송 리듬으로 읽으세요. 사용자가 준 한 구절만 정확히 한 번 읽고 다른 말, 번호, 카운트인, 설명, 효과음을 절대 넣지 마세요. 숫자와 조사를 뭉개지 마세요. ${questionInstruction}`,
            },
            {
              role: 'user',
              content: `아래 따옴표 안 구절만 정확히 한 번 읽으세요. 앞뒤에 어떤 수도 덧붙이지 마세요.\n“${phrase}”`,
            },
          ],
          temperature: 0.1,
          store: false,
        }),
        signal: AbortSignal.timeout(60000),
      })

      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(`${response.status} ${body.error?.code || 'unknown'}`)
      const audio = body.choices?.[0]?.message?.audio
      if (!audio?.data) throw new Error('returned no audio')
      if (normalizeTranscript(audio.transcript) !== normalizeTranscript(phrase)) {
        throw new Error(`transcript mismatch: ${audio.transcript}`)
      }
      await writeFile(output, Buffer.from(audio.data, 'base64'))
      const duration = audioDuration(output)
      if (duration < 0.25 || duration > 6 || hasLongInternalSilence(output)) {
        await unlink(output).catch(() => {})
        throw new Error(`implausible raw timing: ${duration.toFixed(3)}s`)
      }
      return { transcript: audio.transcript, cached: false }
    } catch (error) {
      lastError = error
      if (attempt < 3) await delay(attempt * 900)
    }
  }
  throw new Error(`${MODEL} ${table}단 ${kind} ${multiplier} failed after retries: ${lastError?.message}`)
}

function audioDuration(file) {
  return Number(execFileSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    file,
  ], { encoding: 'utf8' }).trim())
}

function extractPhrase({ input, output, start, end }) {
  execFileSync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', input,
    '-af', `atrim=${start}:${end},asetpts=PTS-STARTPTS,silenceremove=start_periods=1:start_duration=0.03:start_threshold=-42dB:start_silence=0.02,areverse,silenceremove=start_periods=1:start_duration=0.03:start_threshold=-42dB:start_silence=0.03,areverse,atempo=1.08,loudnorm=I=-18:TP=-2:LRA=7,apad=pad_dur=0.035`,
    '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le',
    output,
  ], { stdio: 'ignore' })
  const duration = audioDuration(output)
  if (duration < 0.28 || duration > 2.6) throw new Error(`Processed phrase duration ${duration.toFixed(3)}s is out of range`)
  return duration
}

async function mapLimit(items, limit, mapper) {
  const results = Array(items.length)
  let nextIndex = 0
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await mapper(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
  return results
}

function buildSprite({ clips, output }) {
  const inputArgs = clips.flatMap((clip) => ['-i', clip.file])
  const labels = clips.map((_, index) => `[${index}:a]`).join('')
  execFileSync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    ...inputArgs,
    '-filter_complex', `${labels}concat=n=${clips.length}:v=0:a=1[out]`,
    '-map', '[out]', '-ar', '24000', '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '96k',
    output,
  ], { stdio: 'ignore' })
}

await mkdir(OUTPUT_ROOT, { recursive: true })
await mkdir(CACHE_ROOT, { recursive: true })
const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'metasense-times-chant-'))
const { apiKey, secretVersion } = await getApiKey()
const manifest = {
  version: 1,
  generatedAt: new Date().toISOString(),
  model: MODEL,
  voice: VOICE,
  tempo: 1.08,
  cadenceSeconds: 1.17,
  tables: {},
}

for (const table of tables) {
  console.log(`[${table}단] generating`)
  const statements = MULTIPLIERS.map((multiplier) => buildMultiplicationStatement(table, multiplier))
  const questions = MULTIPLIERS.map((multiplier) => buildMultiplicationQuestion(table, multiplier))
  const groups = [
    { kind: 'statements', apiKind: 'statement', phrases: statements },
    { kind: 'questions', apiKind: 'question', phrases: questions },
  ]
  const clips = []
  const entries = { statements: [], questions: [] }

  for (const group of groups) {
    const rawFiles = await mapLimit(group.phrases, GENERATION_CONCURRENCY, async (phrase, index) => {
      const phraseHash = createHash('sha256').update(phrase).digest('hex').slice(0, 10)
      const rawFile = path.join(CACHE_ROOT, `${table}-${group.kind}-${String(index + 1).padStart(2, '0')}-${phraseHash}.wav`)
      await synthesizePhrase({
        apiKey,
        phrase,
        kind: group.apiKind,
        table,
        multiplier: index + 1,
        output: rawFile,
      })
      return rawFile
    })
    for (let index = 0; index < rawFiles.length; index += 1) {
      const file = path.join(temporaryRoot, `${table}-${group.kind}-${String(index + 1).padStart(2, '0')}.wav`)
      const duration = extractPhrase({ input: rawFiles[index], output: file, start: 0, end: audioDuration(rawFiles[index]) })
      clips.push({ file, duration, kind: group.kind, index })
    }
  }

  let offset = 0
  for (const clip of clips) {
    const entry = {
      offset: Number(offset.toFixed(4)),
      duration: Number(clip.duration.toFixed(4)),
      text: clip.kind === 'statements' ? statements[clip.index] : questions[clip.index],
    }
    entries[clip.kind].push(entry)
    offset += clip.duration
  }

  const fileName = `table-${table}.mp3`
  buildSprite({ clips, output: path.join(OUTPUT_ROOT, fileName) })
  manifest.tables[String(table)] = {
    src: `/sounds/multiplication/v1/${fileName}`,
    cadenceSeconds: 1.17,
    ...entries,
    sourcePhrases: { statements, questions },
  }
  console.log(`[${table}단] ready (${clips.length} clips, ${offset.toFixed(2)}s sprite)`)
}

await writeFile(path.join(OUTPUT_ROOT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(JSON.stringify({
  passed: true,
  tables,
  model: MODEL,
  voice: VOICE,
  secretVersion,
  output: OUTPUT_ROOT,
}, null, 2))
