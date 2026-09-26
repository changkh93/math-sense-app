import admin from 'firebase-admin'
import { existsSync, readFileSync } from 'node:fs'
import { getBuiltinPythonMissionSets } from '../src/components/PythonWorld/pythonMissionCatalog.js'
import { buildMissionLabCompletion } from '../src/utils/pythonMissionProgressUtils.js'

const credentialPath = './service-account.json'
if (!existsSync(credentialPath)) throw new Error(`${credentialPath} is required`)

const apply = process.argv.includes('--apply')
const uidArg = process.argv.find((arg) => arg.startsWith('--uid='))
const targetUid = uidArg ? uidArg.slice('--uid='.length).trim() : ''

const serviceAccount = JSON.parse(readFileSync(credentialPath, 'utf8'))
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
const db = admin.firestore()
const missionSets = new Map(getBuiltinPythonMissionSets().map((missionSet) => [missionSet.id, missionSet]))

const timestampMs = (value) => value?.toMillis?.() || value?.toDate?.()?.getTime?.() || 0
const successTimestamp = (data) => data.lastCompletedAt || data.updatedAt || data.lastPlayedAt || null
const isSuccessful = (data) => (
  data.lastResult?.completed === true ||
  data.lastResult?.cleared === true ||
  Boolean(data.lastCompletedAt)
)

const missionDocs = await db.collectionGroup('pythonMissionProgress').get()
const groups = new Map()

for (const missionDoc of missionDocs.docs) {
  const data = missionDoc.data()
  const uid = missionDoc.ref.parent.parent?.id || ''
  const missionSet = missionSets.get(data.missionSetId)
  if (!uid || (targetUid && uid !== targetUid) || !missionSet || !data.unitId || !isSuccessful(data)) continue
  if (!(missionSet.missions || []).some((mission) => mission.id === (data.missionId || missionDoc.id))) continue

  const key = `${uid}:${data.unitId}:${missionSet.id}`
  const group = groups.get(key) || {
    uid,
    unitId: data.unitId,
    unitTitle: data.unitTitle || '',
    missionSet,
    completions: [],
  }
  group.completions.push({
    missionId: data.missionId || missionDoc.id,
    stars: Number(data.lastResult?.stars || 0),
    assistanceLevel: Number(data.lastResult?.hintLevel || 0),
    timestamp: successTimestamp(data),
  })
  if (data.unitTitle) group.unitTitle = data.unitTitle
  groups.set(key, group)
}

const repairs = []
for (const group of groups.values()) {
  group.completions.sort((a, b) => timestampMs(a.timestamp) - timestampMs(b.timestamp))
  const progressRef = db.collection('users').doc(group.uid).collection('learning_progress').doc(group.unitId)
  const progressSnap = await progressRef.get()
  const progressData = progressSnap.exists ? progressSnap.data() : {}
  const storedIds = new Set(progressData.missionLab?.completedMissionIds || [])
  const missingIds = [...new Set(group.completions.map((item) => item.missionId))]
    .filter((missionId) => !storedIds.has(missionId))
  if (missingIds.length === 0) continue

  let missionLab = progressData.missionLab || {}
  for (const completion of group.completions) {
    missionLab = buildMissionLabCompletion({
      existingMissionLab: missionLab,
      missionSet: group.missionSet,
      missionId: completion.missionId,
      stars: completion.stars,
      assistanceLevel: completion.assistanceLevel,
      timestamp: completion.timestamp,
    })
  }

  const latestCompletionTimestamp = group.completions.at(-1)?.timestamp || null
  const updatedAt = timestampMs(progressData.updatedAt) > timestampMs(latestCompletionTimestamp)
    ? progressData.updatedAt
    : latestCompletionTimestamp
  repairs.push({
    uid: group.uid,
    unitId: group.unitId,
    missingIds,
    ref: progressRef,
    data: {
      unitId: group.unitId,
      unitTitle: group.unitTitle,
      clusterId: 'python',
      updatedAt,
      missionLab,
    },
  })
}

if (apply) {
  for (let offset = 0; offset < repairs.length; offset += 400) {
    const batch = db.batch()
    repairs.slice(offset, offset + 400).forEach((repair) => {
      batch.set(repair.ref, repair.data, { merge: true })
    })
    await batch.commit()
  }
}

console.log(JSON.stringify({
  mode: apply ? 'apply' : 'dry-run',
  targetUid: targetUid || null,
  repairedAccountUnits: repairs.length,
  repairedMissionCompletions: repairs.reduce((sum, repair) => sum + repair.missingIds.length, 0),
  byUnit: Object.fromEntries([...new Set(repairs.map((repair) => repair.unitId))].map((unitId) => [
    unitId,
    {
      accountUnits: repairs.filter((repair) => repair.unitId === unitId).length,
      missingMissions: repairs
        .filter((repair) => repair.unitId === unitId)
        .reduce((sum, repair) => sum + repair.missingIds.length, 0),
    },
  ])),
}, null, 2))

await db.terminate()
