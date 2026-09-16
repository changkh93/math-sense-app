// Narrow, idempotent migration: replace retired menu directions in these two courses only.
import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import admin from 'firebase-admin'
const replacements = [
  ['내 프로젝트 → 우주 방어대 단계 비교·수업 자료에서 누적 코드나 임시 시험을 별도 프로젝트로 열 수 있습니다.', '수업 준비는 처음 한 번만 합니다. 같은 프로젝트의 main.py를 이어서 작성하세요.'],
  ['누적 코드는 스크롤 창에서 읽거나, 스튜디오의 **화성 탐사대 단계 비교·수업 자료**에서 에셋을 포함한 별도 프로젝트로 열 수 있습니다.', '누적 코드는 각 단계의 코드 링크를 눌러 읽고 비교할 수 있습니다.'],
]
const hash = value => createHash('sha256').update(JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item)).digest('hex')
const credential = JSON.parse(await fs.readFile(new URL('../service-account.json', import.meta.url), 'utf8'))
if (credential.project_id !== 'math-sense-1f6a8') throw new Error('Unexpected Firebase project')
admin.initializeApp({ credential: admin.credential.cert(credential) })
const db = admin.firestore()
const paths = [
  ...Array.from({ length: 10 }, (_, i) => `units/unit_space_invaders_${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 31 }, (_, i) => `units/unit_mars_expedition_${String(i + 1).padStart(2, '0')}`),
]
const snapshots = await db.getAll(...paths.map(path => db.doc(path)))
const changes = []
for (const snapshot of snapshots) {
  const data = snapshot.data()
  if (!data || data.regionId !== 'reg_python_game_project' || typeof data.learningContents?.text !== 'string') throw new Error(`Unexpected course document: ${snapshot.id}`)
  const previous = data.learningContents.text
  let next = previous
  for (const [from, to] of replacements) next = next.replaceAll(from, to)
  if (next.includes('단계 비교·수업 자료')) throw new Error(`Unrecognized menu instruction: ${snapshot.id}`)
  if (previous !== next) changes.push({ snapshot, next, expected: { ...data, learningContents: { ...data.learningContents, text: next } } })
}
const apply = process.argv.includes('--apply')
if (apply && changes.length) {
  const batch = db.batch()
  for (const { snapshot, next } of changes) batch.update(snapshot.ref, { 'learningContents.text': next }, { lastUpdateTime: snapshot.updateTime })
  await batch.commit()
  const actual = await db.getAll(...changes.map(({ snapshot }) => snapshot.ref))
  for (let i = 0; i < actual.length; i++) if (hash(actual[i].data()) !== hash(changes[i].expected)) throw new Error(`Unexpected readback: ${actual[i].id}`)
}
console.log(JSON.stringify({ mode: apply ? 'apply' : 'preview', checked: snapshots.length, changed: changes.length, fields: ['learningContents.text'], readbackVerified: apply && changes.length > 0 ? true : undefined }))
await admin.app().delete()
