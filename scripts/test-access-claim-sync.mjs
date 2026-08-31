import assert from 'node:assert/strict';
import {
  areAccessClaimsCurrent,
  getAccessSyncRevision,
  isAccessClaimSyncReady
} from '../src/utils/accessClaimSync.js';

const userData = {
  clusterAccess: {
    cluster_elementary: 'active',
    python: 'active',
    archived_course: 'suspended'
  },
  regionAccess: {
    reg_python_course: 'completed',
    reg_python_game_project: 'active',
    reg_python_advanced: 'suspended'
  }
};

assert.equal(areAccessClaimsCurrent(userData, {
  version: 1,
  courses: ['python', 'cluster_elementary'],
  regions: ['reg_python_game_project', 'reg_python_course']
}), true, 'claim order and suspended access should not cause a mismatch');

assert.equal(areAccessClaimsCurrent(userData, {
  version: 1,
  courses: ['cluster_elementary', 'python'],
  regions: ['reg_python_course']
}), false, 'a newly granted region missing from the token must trigger refresh');

assert.equal(areAccessClaimsCurrent(userData, {
  version: 1,
  courses: ['cluster_elementary', 'python'],
  regions: ['reg_python_course', 'reg_python_game_project', 'reg_python_advanced']
}), false, 'a revoked region remaining in the token must trigger refresh');

assert.equal(areAccessClaimsCurrent(userData, { version: 0, courses: [], regions: [] }), true,
  'legacy tokens must keep the Firestore fallback path');

assert.equal(getAccessSyncRevision({ accessClaimsSyncedAt: { toMillis: () => 1234 } }), 1234);
assert.equal(getAccessSyncRevision({ accessClaimsSyncedAt: { seconds: 5678 } }), 5678);
assert.equal(getAccessSyncRevision({}), null);
assert.equal(isAccessClaimSyncReady({
  accessUpdatedAt: { toMillis: () => 2000 },
  accessClaimsSyncedAt: { toMillis: () => 1999 }
}), false, 'the client must not refresh while claim sync is still behind the access write');
assert.equal(isAccessClaimSyncReady({
  accessUpdatedAt: { toMillis: () => 2000 },
  accessClaimsSyncedAt: { toMillis: () => 2001 }
}), true, 'the client may refresh after claim sync finishes');
assert.equal(isAccessClaimSyncReady({ accessUpdatedAt: { seconds: 2000 } }), false,
  'a missing claim sync marker must not trigger an early refresh');

console.log('✅ access claim sync tests passed');
