// Explicit, bounded live smoke test with synthetic data only. No student DB
// reads/writes. Keys are obtained in memory; never use the CLI access command,
// whose logger can record its plaintext output in firebase-debug.log.
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { writeFile } from 'node:fs/promises'
const projectId = process.argv[2]
if (!/^proj_[A-Za-z0-9_-]+$/.test(projectId || '') || process.argv[3] !== '--run-synthetic') {
  console.error('Usage: node scripts/check-studio-error-coach-live.mjs proj_ID --run-synthetic'); process.exit(2)
}
const req = createRequire(import.meta.url)
const { createHandler } = req('../functions/studioErrorCoach.cjs')
const evidence = { projectId, at: new Date().toISOString(), syntheticOnly: true, productionModified: false, checks: [] }
let phase = 'secret-metadata'
try {
  const globalRoot = execFileSync('npm', ['root', '-g'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  const firebase = createRequire(path.join(globalRoot, 'firebase-tools/package.json'))
  const { logger } = firebase('./lib/logger.js')
  logger.silent = true; logger.clear()
  const auth = firebase('./lib/auth.js'), account = auth.getGlobalDefaultAccount()
  await firebase('./lib/requireAuth.js').requireAuth({ project: 'math-sense-1f6a8', nonInteractive: true, user: account?.user, tokens: account?.tokens })
  const secrets = firebase('./lib/gcp/secretManager.js')
  const metadata = await secrets.getSecretVersion('math-sense-1f6a8', 'OPENAI_API_KEY', 'latest')
  evidence.secret = { version: metadata.versionId, state: metadata.state, createdAt: metadata.createTime }
  if (metadata.state !== 'ENABLED') throw new Error('secret-disabled')
  phase = 'secret-access'
  let apiKey = (await secrets.accessSecretVersion('math-sense-1f6a8', 'OPENAI_API_KEY', metadata.versionId)).trim()
  if (!/^sk-[A-Za-z0-9_-]{30,}$/.test(apiKey)) throw new Error('secret-format')
  const docs = new Map([
    ['users/synthetic-coach-test', { role: 'admin' }],
    ['studioCoachControl/config', { enabled: true, childDataReady: true, projectId }]
  ])
  const db = { doc: key => ({ key, get: async () => ({ data: () => docs.get(key) }) }), runTransaction: async fn => fn({ get: async ref => ({ data: () => docs.get(ref.key) }), set: (ref, value) => docs.set(ref.key, value) }) }
  class HttpsError extends Error { constructor(code, message) { super(message); this.code = code } }
  let lastResponse
  const handler = createHandler({ db, HttpsError, getKey: () => apiKey, fetchImpl: async (url, options) => {
    const response = await fetch(url, options), body = await response.clone().json().catch(() => ({}))
    const safe = value => typeof value === 'string' && /^[A-Za-z0-9_.-]{1,100}$/.test(value) ? value : undefined
    lastResponse = { status: response.status, model: safe(body.model), errorCode: safe(body.error?.code), errorParam: safe(body.error?.param), inputTokens: body.usage?.input_tokens, outputTokens: body.usage?.output_tokens }
    return response
  } })
  phase = 'synthetic-response'
  const result = await handler({ version: 1, mode: 'file', errorType: 'NameError', error: 'NameError: name is not defined', line: 2, snippet: '1: score = 10\n2: print(socre)' }, { auth: { uid: 'synthetic-coach-test', token: { firebase: { sign_in_provider: 'password' } } } }).catch(error => {
    evidence.checks.push({ passed: false, response: lastResponse, failure: error.code || 'request-failed' }); throw new Error('synthetic-failed')
  })
  evidence.checks.push({ passed: true, response: lastResponse, advice: result.advice })
  // Repeating the same request must reuse the response without another API call.
  const repeated = await handler({ version: 1, mode: 'file', errorType: 'NameError', error: 'NameError: name is not defined', line: 2, snippet: '1: score = 10\n2: print(socre)' }, { auth: { uid: 'synthetic-coach-test', token: { firebase: { sign_in_provider: 'password' } } } })
  evidence.cachedRepeat = repeated.cached === true
  apiKey = ''
  evidence.passed = true
} catch {
  evidence.passed = false; evidence.stoppedAt = phase; process.exitCode = 1
}
await writeFile('docs/collaboration/tasks/20260916-studio-error-coach/verification/live-smoke.json', JSON.stringify(evidence, null, 2))
console.log(JSON.stringify(evidence, null, 2))
