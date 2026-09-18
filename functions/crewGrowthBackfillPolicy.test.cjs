const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyCrewGrowthLock, parseCrewIdArg } = require('./crewGrowthBackfillPolicy.cjs');

test('creates only a missing lock for a live member of the same crew', () => {
  assert.deepEqual(classifyCrewGrowthLock({ crewId: 'a', userExists: true, user: { crewId: 'a' } }),
    { action: 'create', reason: 'missing_lock' });
  assert.equal(classifyCrewGrowthLock({ crewId: 'a', userExists: true, user: { crewId: 'b' } }).action, 'skip');
  assert.equal(classifyCrewGrowthLock({ crewId: 'a', userExists: true, user: { crewId: 'a', isDeleted: true } }).action, 'skip');
});

test('keeps the matching active origin lock and never overwrites conflicts', () => {
  assert.equal(classifyCrewGrowthLock({ crewId: 'a', userExists: true, user: { crewId: 'a' }, lockExists: true,
    lock: { originCrewId: 'a', status: 'active' } }).action, 'keep');
  assert.deepEqual(classifyCrewGrowthLock({ crewId: 'a', userExists: true, user: { crewId: 'a' }, lockExists: true,
    lock: { originCrewId: 'b', status: 'forfeited' } }), { action: 'skip', reason: 'existing_lock_conflict' });
});

test('parses an optional exact crew scope', () => {
  assert.equal(parseCrewIdArg(['--apply', '--crew-id=crew-1']), 'crew-1');
  assert.equal(parseCrewIdArg(['--dry-run']), '');
});
