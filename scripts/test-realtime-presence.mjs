import assert from 'node:assert/strict'
import { normalizeRealtimePresence, getConnectedStudents, countStudentsByCrew } from '../src/utils/realtimePresence.js'

const old = Date.now() - 60 * 60 * 1000
const connection = (state, updatedAtMs = old, extra = {}) => ({ state, updatedAtMs, crewId: 'crew-a', role: 'student', ...extra })
const normalize = (uid, connections) => normalizeRealtimePresence(uid, { connections })
const foreground = normalize('one', { first: connection('online'), second: connection('away', Date.now()) })
assert.equal(foreground.liveStatus.state, 'online', 'A visible tab must win over a newer background tab')
assert.equal(normalize('one', { first: connection('away') }).liveStatus.state, 'away')
assert.equal(normalize('one', {}).liveStatus.state, 'offline', 'Removing the last connection makes the user offline')
assert.equal(normalize('one', { first: connection('offline') }).liveStatus.state, 'offline')
assert.equal(normalize('one', { first: connection('online', old, { uid: 'incorrect' }) }).uid, 'one')
const presence = {
  one: foreground,
  two: normalize('two', { first: connection('away') }),
  three: normalize('three', { first: connection('online', old, { crewId: '' }) }),
  admin: normalize('admin', { first: connection('online', old, { role: 'admin' }) }),
  parent: normalize('parent', { first: connection('online', old, { role: 'parent' }) }),
  offline: normalize('offline', {}),
}
const students = getConnectedStudents(presence)
assert.deepEqual(students.map(student => student.uid), ['one', 'two', 'three'], 'Old connections, self and away students stay counted; multiple tabs count once')
assert.deepEqual(countStudentsByCrew(students), { 'crew-a': 2 })
delete presence.one
assert.equal(getConnectedStudents(presence).length, 2, 'Disconnection updates the total')
assert.deepEqual(countStudentsByCrew(getConnectedStudents(presence)), { 'crew-a': 1 })
assert.deepEqual(getConnectedStudents({}), [])
console.log('Realtime presence regression checks passed')
