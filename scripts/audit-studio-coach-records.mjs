// Read-only production audit. Never fetch account-level usage fingerprints,
// learner identities, configuration salt, original code, or credentials to disk.
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { writeFile } from 'node:fs/promises'

if (process.argv[2] !== '--read-only') throw new Error('Use --read-only')
const root = execFileSync('npm', ['root', '-g'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
const cli = createRequire(path.join(root, 'firebase-tools/package.json'))
const logger = cli('./lib/logger.js').logger; logger.silent = true; logger.clear()
const auth = cli('./lib/auth.js'), account = auth.getGlobalDefaultAccount()
const project = 'math-sense-1f6a8'
await cli('./lib/requireAuth.js').requireAuth({ project, nonInteractive: true, user: account?.user, tokens: account?.tokens })
const token = await auth.getAccessToken(account.tokens.refresh_token, cli('./lib/api.js').getScopes())
const documentRoot = `projects/${project}/databases/(default)/documents`
const base = `https://firestore.googleapis.com/v1/${documentRoot}`
const decode = v => 'integerValue' in v ? Number(v.integerValue) : 'doubleValue' in v ? v.doubleValue : 'booleanValue' in v ? v.booleanValue : 'stringValue' in v ? v.stringValue : 'timestampValue' in v ? v.timestampValue : 'arrayValue' in v ? (v.arrayValue.values || []).map(decode) : 'mapValue' in v ? fields(v.mapValue.fields) : null
const fields = value => Object.fromEntries(Object.entries(value || {}).map(([k, v]) => [k, decode(v)]))
async function request(suffix, body) {
  const response = await fetch(base + suffix, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`read-failed-${response.status}`)
  return response.json()
}
async function configuration(collection, keys) {
  const result = await request(`/${collection}/config?${keys.map(k => `mask.fieldPaths=${k}`).join('&')}`)
  return { exists: Boolean(result), ...fields(result?.fields) }
}
async function count(collection) {
  const result = await request(':runAggregationQuery', { structuredAggregationQuery: { structuredQuery: { from: [{ collectionId: collection }] }, aggregations: [{ alias: 'total', count: {} }] } })
  return decode(result[0].result.aggregateFields.total)
}
async function query(collection, keys, limit, extra = {}) {
  const result = await request(':runQuery', { structuredQuery: { from: [{ collectionId: collection }], select: { fields: keys.map(fieldPath => ({ fieldPath })) }, limit, ...extra } })
  return result.filter(r => r.document).map(r => ({ id: r.document.name.split('/').at(-1), ...fields(r.document.fields) }))
}
const collections = ['studioCoachLearningStats', 'studioCoachLearningSamples', 'studioCoachLearningCosts', 'studioCoachLearningCards']
const [learning, coach, counts, stats, costs, usage] = await Promise.all([
  configuration('studioCoachLearningControl', ['enabled', 'samplesEnabled', 'updatedAt']),
  configuration('studioCoachControl', ['enabled', 'structureDataReady']),
  Promise.all(collections.map(async name => [name, await count(name)])),
  query('studioCoachLearningStats', ['day', 'ruleId', 'mode', 'counts', 'cardVersion', 'diagnosticVersion', 'runtimeVersion'], 1000),
  query('studioCoachLearningCosts', ['day', 'ruleId', 'requests', 'inputTokens', 'outputTokens'], 500),
  query('studioCoachUsage', ['count'], 100, { where: { compositeFilter: { op: 'AND', filters: [
    { fieldFilter: { field: { fieldPath: '__name__' }, op: 'GREATER_THAN_OR_EQUAL', value: { referenceValue: `${documentRoot}/studioCoachUsage/day-` } } },
    { fieldFilter: { field: { fieldPath: '__name__' }, op: 'LESS_THAN', value: { referenceValue: `${documentRoot}/studioCoachUsage/day.` } } },
  ] } } }),
])
// Samples already contain only approved transformed tokens and alias-only
// advice. Read a bounded set only if actually present; do not persist contents.
const sampleCount = Object.fromEntries(counts).studioCoachLearningSamples
if (sampleCount) {
  const samples = await query('studioCoachLearningSamples', ['ruleId', 'payload', 'advice', 'createdAt', 'expiresAt'], 20)
  console.log(JSON.stringify({ reviewSamples: samples.map(({ id, ...sample }) => sample), samplesTruncated: sampleCount > samples.length }, null, 2))
}
const report = { at: new Date().toISOString(), readOnly: true, learning, coach, counts: Object.fromEntries(counts), stats: stats.map(({ id, ...row }) => row), costs: costs.map(({ id, ...row }) => row), dailyReservations: usage.map(({ id, count }) => ({ day: id.replace('day-', ''), count })), truncated: stats.length === 1000 || costs.length === 500 || usage.length === 100 }
await writeFile('docs/collaboration/tasks/20260916-studio-private-coach/records-audit.json', JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
