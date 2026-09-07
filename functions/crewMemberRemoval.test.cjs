const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { removeCrewMember } = require('./crewMemberRemoval.cjs');
const source = fs.readFileSync(`${__dirname}/index.js`, 'utf8');
const helperSource = source.slice(source.indexOf('function buildClearedCrewUserFields()'), source.indexOf('async function syncCrewToMembers('));
const helpers = vm.runInNewContext(`(function(){${helperSource}; return {clear: buildClearedCrewUserFields, room: removeParticipantFromStudyRoomTransaction};})()`, { Date, getDisplayNameFromUser: (u) => u.name });
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
function fixture({ target = { crewId: 'c' }, room = null, ids = ['leader', 'target'] } = {}) {
  const records = new Map([
    ['crews/c', { leaderId: 'leader', memberIds: ids, memberCount: ids.length, ...(room ? { activeStudyRoomId: 'r' } : {}) }],
    ['users/leader', { crewId: 'c', name: 'Leader', crewSnapshot: { memberIds: ids, members: ids.map(uid => ({ uid })) } }],
    ...(target ? [['users/target', target]] : []),
    ...(room ? [['studyRooms/r', { crewId: 'c', ...room }], ['studyRooms/r/participants/target', { role: 'host' }]] : []),
  ]);
  const ref = (path) => ({ path, id: path.split('/').at(-1), collection: (name) => ({ doc: (id) => ref(`${path}/${name}/${id}`) }) });
  let writes = [];
  const db = { collection: name => ({ doc: id => ref(`${name}/${id}`) }), runTransaction: async (fn) => {
    writes = [];
    const tx = {
      get: async r => { assert.equal(writes.length, 0, 'reads must precede writes'); return { exists: records.has(r.path), data: () => records.get(r.path), ref: r }; },
      set: (r, value) => writes.push(['set', r.path, value]),
      update: (r, value) => writes.push(['set', r.path, value]),
      delete: r => writes.push(['delete', r.path]),
    };
    await fn(tx);
    for (const [kind, path, value] of writes) { if (kind === 'delete') records.delete(path); else records.set(path, { ...records.get(path), ...value }); }
  } };
  const growthService = {
    getParticipantLockRef: () => ref('locks/target'),
    forfeitParticipantLock: async (_db, tx, _uid, _crew, reason, _time, snap) => { assert.ok(snap); tx.set(ref('locks/target'), { reason }); },
  };
  const run = (override = {}) => removeCrewMember({ db, uid: 'leader', crewId: 'c', targetUid: 'target', HttpsError, growthService, clearedUserFields: helpers.clear, removeRoomParticipant: helpers.room, ...override });
  return { records, run };
}
test('leader removes member, clears affiliation and snapshot, and leaves one leader', async () => {
  const { records, run } = fixture(); await run();
  assert.deepEqual(records.get('crews/c').memberIds, ['leader']);
  assert.equal(records.get('crews/c').memberCount, 1);
  assert.equal(records.get('users/target').crewId, '');
  assert.equal(records.get('users/target').crewSnapshot, null);
  assert.deepEqual(records.get('users/leader').crewSnapshot.members, [{ uid: 'leader' }]);
  assert.equal(records.get('locks/target').reason, 'member_removed');
  await assert.rejects(run(), { code: 'not-found' });
});
test('ordinary user, outsider, self, unknown member and invalid IDs are denied', async () => {
  for (const [override, code] of [[{ uid: 'target', targetUid: 'leader' }, 'permission-denied'], [{ uid: 'outsider' }, 'permission-denied'], [{ targetUid: 'leader' }, 'invalid-argument'], [{ targetUid: 'other' }, 'not-found'], [{ crewId: 'a/b' }, 'invalid-argument']]) {
    const { run, records } = fixture(); await assert.rejects(run(override), { code });
    assert.equal(records.get('crews/c').memberCount, 2);
  }
});
test('missing or inactive accounts can be removed without resurrecting a user', async () => {
  for (const target of [null, { crewId: 'c', status: 'inactive' }]) {
    const { run, records } = fixture({ target }); await run();
    assert.equal(records.get('crews/c').memberCount, 1);
    if (!target) assert.equal(records.has('users/target'), false);
  }
});
test('stale roster does not erase affiliation to another crew', async () => {
  const { run, records } = fixture({ target: { crewId: 'other', crewRole: 'member' } }); await run();
  assert.equal(records.get('users/target').crewId, 'other');
});
test('active room host is transferred before any writes; participant document is deleted', async () => {
  const { run, records } = fixture({ room: { participantIds: ['target', 'leader'], hostUid: 'target' } }); await run();
  assert.equal(records.get('studyRooms/r').hostUid, 'leader');
  assert.equal(records.get('studyRooms/r').participantCount, 1);
  assert.equal(records.has('studyRooms/r/participants/target'), false);
});
test('empty room is ended and crew active room cleared', async () => {
  const { run, records } = fixture({ room: { participantIds: ['target'], hostUid: 'target' } }); await run();
  assert.equal(records.get('studyRooms/r').status, 'ended');
  assert.equal(records.get('crews/c').activeStudyRoomId, '');
});
test('leader omitted from legacy member array is retained', async () => {
  const { run, records } = fixture({ ids: ['target'] }); await run();
  assert.deepEqual(records.get('crews/c').memberIds, ['leader']);
});
