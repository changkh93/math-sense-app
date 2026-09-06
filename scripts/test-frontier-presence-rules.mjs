import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { initializeApp, deleteApp } from 'firebase/app'
import { getDatabase, connectDatabaseEmulator, ref, set, update, goOffline } from 'firebase/database'

const host = process.env.FIREBASE_DATABASE_EMULATOR_HOST
if (!host || !/^127\.0\.0\.1:\d+$/.test(host)) throw new Error('Only a local Realtime Database emulator is allowed')
const namespace = 'demo-frontier'
const rules = await fetch(`http://${host}/.settings/rules.json?ns=${namespace}`, {
  method: 'PUT', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
  body: await readFile(new URL('../database.rules.json', import.meta.url), 'utf8'),
})
assert.ok(rules.ok, await rules.text())
const seed = await fetch(`http://${host}/.json?ns=${namespace}`, {
  method: 'PUT', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
  body: JSON.stringify({ galaxyWorldAccess: { island: { pilot: { displayName: 'Pilot', expiresAtMs: Date.now() + 600000 } } } }),
})
assert.ok(seed.ok, await seed.text())
const app = initializeApp({ projectId: namespace, databaseURL: `https://${namespace}.firebaseio.com` }, 'presence-rule-tests')
const db = getDatabase(app)
connectDatabaseEmulator(db, '127.0.0.1', Number(host.split(':')[1]), { mockUserToken: { sub: 'pilot', user_id: 'pilot' } })
const own = ref(db, 'galaxyWorldRooms/island/players/pilot/connections/test')
const valid = { uid: 'pilot', displayName: 'Pilot', x: 0, y: 1, z: 5, yaw: 0, scale: .25, equipment: 'hoverpack', movementMode: 'flying', connectedAtMs: Date.now(), updatedAtMs: Date.now() }
try {
  await set(own, valid)
  await update(own, { movementMode: 'landing' })
  await update(own, { y: -3, equipment: 'diving', movementMode: 'diving' })
  await update(own, { x: 82, z: -50, y: -34 })
  for (const invalid of [{ y: 25 }, { y: -41 }, { y: '3' }, { scale: 2 }, { equipment: 'admin' }, { movementMode: 'teleport' }, { x: 97 }, { z: -97 }, { coins: 999 }, { uid: 'other' }]) {
    await assert.rejects(update(own, invalid), /PERMISSION_DENIED/, JSON.stringify(invalid))
  }
  await assert.rejects(set(ref(db, 'galaxyWorldRooms/island/players/other/connections/test'), valid), /PERMISSION_DENIED/)
  const legacy = { ...valid }; delete legacy.y; delete legacy.scale; delete legacy.equipment; delete legacy.movementMode
  await set(own, legacy)
  await set(own, null)
  console.log('Presence rules passed: valid flight/diving, legacy client, ranges, enums, foreign owner and unexpected fields')
} finally { goOffline(db); await deleteApp(app) }
