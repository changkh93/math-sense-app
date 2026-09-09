import { base64ToBytes, bytesToBase64, toRunnerProject } from './projectPolicy.mjs'
// Only retained for the currently open studio; no audio leaves the browser for conversion.
const cache = new Map()
export function clearAudioConversionCache() { cache.clear() }
export async function convertAudioToOgg(file) {
  if (file.path.toLowerCase().endsWith('.ogg')) return file.data
  const bytes = base64ToBytes(file.data)
  const hash = bytesToBase64(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
  if (cache.has(hash)) return cache.get(hash)
  const context = new OfflineAudioContext(2, 1, 44100)
  let decoded
  try { decoded = await context.decodeAudioData(bytes.buffer) }
  catch { throw new Error(`${file.path}: 사운드를 읽지 못했습니다. 다른 MP3/WAV 또는 OGG 파일로 다시 올려 주세요.`) }
  if (decoded.duration > 120 || decoded.numberOfChannels > 2) throw new Error(`${file.path}: 사운드는 2분 이하, 모노 또는 스테레오를 사용해 주세요.`)
  const { createOggEncoder } = await import('wasm-media-encoders')
  const encoder = await createOggEncoder()
  encoder.configure({ sampleRate: decoded.sampleRate, channels: decoded.numberOfChannels, vbrQuality: 3 })
  const parts = [], channels = Array.from({ length: decoded.numberOfChannels }, (_, i) => decoded.getChannelData(i))
  for (let offset = 0; offset < decoded.length; offset += 16384) {
    parts.push(encoder.encode(channels.map(samples => samples.subarray(offset, offset + 16384))).slice())
    if (offset % (16384 * 8) === 0) await new Promise(resolve => setTimeout(resolve, 0))
  }
  parts.push(encoder.finalize().slice())
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
  let offset = 0
  for (const part of parts) { output.set(part, offset); offset += part.length }
  const data = bytesToBase64(output)
  if (cache.size >= 16) cache.delete(cache.keys().next().value)
  cache.set(hash, data)
  return data
}
export async function prepareRunnerProject(project) {
  const snapshot = toRunnerProject(project)
  for (const file of project.files) {
    if (file.kind === 'audio' && /\.(mp3|wav)$/i.test(file.path)) {
      // SDL_mixer recognizes the stream header. Keep the student's filename and original download.
      snapshot.files.find(f => f.path === file.path).data = await convertAudioToOgg(file)
    }
  }
  return snapshot
}
