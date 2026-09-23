// Explicit, bounded live smoke test with synthetic data only. No student DB
// reads/writes. Keys are obtained in memory; never use the CLI access command,
// whose logger can record its plaintext output in firebase-debug.log.
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { writeFile } from 'node:fs/promises'
import { COACH_MODEL, makeCoachPayload, parseError } from '../functions/studioErrorCoachPolicy.mjs'
import { inspectBehavior, behaviorError } from '../functions/studioBehaviorCoach.mjs'
import { behaviorFixture } from '../functions/studioBehaviorCoach.fixtures.mjs'
import { renderStructure } from '../functions/studioCoachStructure.mjs'
const projectId = process.argv[2]
const behavior = process.argv[4] === '--behavior'
const migration = process.argv[4] === '--migration-check'
const runtimeErrors = process.argv[4] === '--runtime-errors'
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
    ['studioCoachControl/config', { enabled: true, structureDataReady: true, projectId }]
  ])
  const db = { doc: key => ({ key, get: async () => ({ data: () => docs.get(key) }) }), runTransaction: async fn => fn({ get: async ref => ({ data: () => docs.get(ref.key) }), set: (ref, value) => docs.set(ref.key, value) }) }
  class HttpsError extends Error { constructor(code, message) { super(message); this.code = code } }
  let stamp = Date.now()
  let lastResponse
  const handler = createHandler({ db, HttpsError, now: () => stamp, getKey: () => apiKey, fetchImpl: async (url, options) => {
    const response = await fetch(url, options), body = await response.clone().json().catch(() => ({}))
    const safe = value => typeof value === 'string' && /^[A-Za-z0-9_.-]{1,100}$/.test(value) ? value : undefined
    lastResponse = { status: response.status, model: safe(body.model), errorCode: safe(body.error?.code), errorParam: safe(body.error?.param), inputTokens: body.usage?.input_tokens, outputTokens: body.usage?.output_tokens }
    return response
  } })
  phase = 'synthetic-response'
  const fixtures = [
    ['constructor', 'from ColabTurtlePlus.Turtle import *\nt = Turtle\nt.forward(100)', "TypeError: Turtle.forward() missing 1 required positional argument: 'distance'", 3],
    ['spelling', 'score = 10\nprint(socre)', "NameError: name 'socre' is not defined", 2],
    ['missing-import', 'from ColabTurtlePlus.Turtle import', 'SyntaxError: invalid syntax', 1],
  ]
  const runtimeFixtures = [
    ['conversion', 'amount = int("not_a_number")', "ValueError: invalid literal for int() with base 10: 'not_a_number'", 1],
    ['index', 'items = [1, 2]\nprint(items[2])', 'IndexError: list index out of range', 2],
    ['key', 'record = {"score": 10}\nprint(record["points"])', "KeyError: 'points'", 2],
    ['division', 'count = 0\nprint(10 / count)', 'ZeroDivisionError: division by zero', 2],
    ['file', 'with open("data/synthetic.csv") as file:\n    print(file.read())', "FileNotFoundError: [Errno 2] No such file or directory: 'data/synthetic.csv'", 1],
    ['type', 'score = "10"\nprint(score + 1)', 'TypeError: can only concatenate str (not "int") to str', 2],
    ['pygame-video', 'import pygame\npygame.quit()\npygame.display.flip()', 'pygame.error: video system not initialized', 3],
    ['formatted-name', 'print(f"Score: {unknown_score}")', "NameError: name 'unknown_score' is not defined", 1],
  ]
  const methodSource = ['class Scene:', '    def update(self):', '        self.chose_target()', ...Array(20).fill(''), '    def choose_target(self):', '        pass'].join('\n')
  const inputs = behavior ? [
    ...inspectBehavior(behaviorFixture).map(finding => [finding.ruleId, makeCoachPayload(behaviorFixture, behaviorError(finding))]),
    ['method-typo', makeCoachPayload(methodSource, parseError('  File "/tmp/studio/main.py", line 3\nAttributeError: \'Scene\' object has no attribute \'chose_target\'. Did you mean: \'choose_target\'?'))],
  ] : (runtimeErrors ? runtimeFixtures : migration ? fixtures.slice(0, 1) : fixtures).map(([id, source, message, line]) => [id, makeCoachPayload(source, parseError(`  File "/tmp/studio/main.py", line ${line}\n${message}`))])
  for (const [id, input] of inputs) {
    if (!input) throw new Error('fixture-blocked')
    const context = { auth: { uid: 'synthetic-coach-test', token: { firebase: { sign_in_provider: 'password' } } } }
    const result = await handler(input, context).catch(error => {
      evidence.checks.push({ id, passed: false, response: lastResponse, failure: error.code || 'request-failed' }); throw new Error('synthetic-failed')
    })
    if (result.model !== COACH_MODEL || lastResponse?.model !== COACH_MODEL) {
      evidence.checks.push({ id, passed: false, response: lastResponse, failure: 'unexpected-model' })
      throw new Error('unexpected-model')
    }
    const repeated = await handler(input, context)
    evidence.checks.push({ id, passed: true, response: lastResponse, ...(behavior ? { transformedInput: renderStructure(input) } : {}), advice: result.advice, cachedRepeat: repeated.cached === true })
    stamp += 31000
  }
  apiKey = ''
  evidence.passed = true
} catch {
  evidence.passed = false; evidence.stoppedAt = phase; process.exitCode = 1
}
await writeFile(runtimeErrors ? 'docs/collaboration/tasks/20260923-studio-coach-runtime-errors/preflight.json' : migration ? 'docs/collaboration/tasks/20260923-studio-coach-luna/preflight.json' : `docs/collaboration/tasks/20260916-studio-private-coach/${behavior ? 'live-behavior-smoke' : 'live-smoke'}.json`, JSON.stringify(evidence, null, 2))
console.log(JSON.stringify(evidence, null, 2))
