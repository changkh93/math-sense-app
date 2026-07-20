const assert = require('node:assert/strict');

const {
  getActiveGalaxyLiveConnection,
  isGalaxyLiveSpeechRateLimited,
  planGalaxyLiveSpeech,
  validateGalaxyLiveSpeechText,
} = require('./galaxyGame').__test;

const NOW_MS = 1_800_000_000_000;

function connection(uid, x, z, updatedAtMs = NOW_MS) {
  return { uid, displayName: uid, x, z, yaw: 0, connectedAtMs: NOW_MS - 1000, updatedAtMs };
}

function testSpeechSafetyValidation() {
  assert.deepEqual(validateGalaxyLiveSpeechText('  같이   탐험하자!  '), { valid: true, text: '같이 탐험하자!' });
  assert.equal(validateGalaxyLiveSpeechText('').valid, false);
  assert.equal(validateGalaxyLiveSpeechText('a'.repeat(81)).valid, false);
  assert.equal(validateGalaxyLiveSpeechText('https://example.com으로 와').valid, false);
  assert.equal(validateGalaxyLiveSpeechText('내 번호는 010-1234-5678').valid, false);
  assert.equal(validateGalaxyLiveSpeechText('@outside_account').valid, false);
  assert.equal(validateGalaxyLiveSpeechText('<script>안녕</script>').valid, false);
}

function testNewestNonStaleConnectionSelection() {
  const selected = getActiveGalaxyLiveConnection({
    stale: connection('friend-1', 0, 0, NOW_MS - 20_000),
    older: connection('friend-1', 1, 1, NOW_MS - 3_000),
    newest: connection('friend-1', 2, 2, NOW_MS - 100),
    forged: connection('another-user', 3, 3, NOW_MS),
  }, 'friend-1', NOW_MS);
  assert.equal(selected.x, 2);
  assert.equal(selected.z, 2);
  assert.equal(getActiveGalaxyLiveConnection({ stale: connection('friend-1', 0, 0, NOW_MS - 15_001) }, 'friend-1', NOW_MS), null);
}

function basePlan(overrides = {}) {
  return planGalaxyLiveSpeech({
    actorAccess: { uid: 'student-1', expiresAtMs: NOW_MS + 60_000 },
    targetAccess: { uid: 'student-2', expiresAtMs: NOW_MS + 60_000 },
    actorConnection: connection('student-1', 0, 0),
    targetConnections: { target: connection('student-2', 3, 0) },
    actorUid: 'student-1',
    targetUid: 'student-2',
    nowMs: NOW_MS,
    ...overrides,
  });
}

function testOnlineAndProximityEnforcement() {
  assert.equal(basePlan().kind, 'allowed');
  assert.equal(basePlan({ targetConnections: { target: connection('student-2', 4.5, 0) } }).kind, 'allowed');
  assert.equal(basePlan({ targetConnections: { target: connection('student-2', 4.51, 0) } }).kind, 'too_far');
  assert.equal(basePlan({ actorAccess: { uid: 'student-1', expiresAtMs: NOW_MS } }).kind, 'offline');
  assert.equal(basePlan({ actorConnection: connection('student-1', 0, 0, NOW_MS - 15_001) }).kind, 'offline');
  assert.equal(basePlan({ targetConnections: {} }).kind, 'offline');
  assert.equal(basePlan({ actorConnection: { ...connection('student-1', 0, 0), x: 'not-a-number' } }).kind, 'invalid_position');
}

function testServerSpeechRateLimit() {
  assert.equal(isGalaxyLiveSpeechRateLimited(null, NOW_MS), false);
  assert.equal(isGalaxyLiveSpeechRateLimited({ lastSentAtMs: NOW_MS - 1_201 }, NOW_MS), false);
  assert.equal(isGalaxyLiveSpeechRateLimited({ lastSentAtMs: NOW_MS - 1_200 }, NOW_MS), false);
  assert.equal(isGalaxyLiveSpeechRateLimited({ lastSentAtMs: NOW_MS - 1_199 }, NOW_MS), true);
  assert.equal(isGalaxyLiveSpeechRateLimited({ lastSentAtMs: NOW_MS + 1_000 }, NOW_MS), true);
}

function run() {
  testSpeechSafetyValidation();
  testNewestNonStaleConnectionSelection();
  testOnlineAndProximityEnforcement();
  testServerSpeechRateLimit();
  console.log('Galaxy live presence and speech tests passed.');
}

run();
