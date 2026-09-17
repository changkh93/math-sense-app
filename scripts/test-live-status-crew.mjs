import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { didJoinCrewToday, partitionCrewParticipation } from '../src/utils/liveStatusCrew.js';

const today = '2026-09-17';
const crewId = 'crew-alpha';

assert.equal(didJoinCrewToday({
  crewId,
  lastCrewMeetEnteredCrewId: crewId,
  lastCrewMeetEnteredDate: today,
}, crewId, today), true, 'today\'s Meet entry must count');

assert.equal(didJoinCrewToday({
  crewId,
  lastCrewMeetEnteredCrewId: crewId,
  lastCrewMeetEnteredDate: '2026-09-16',
}, crewId, today), false, 'yesterday\'s Meet entry must not count');

assert.equal(didJoinCrewToday({
  crewId,
  liveStatus: { activeRoomId: 'room-1' },
}, crewId, today), true, 'an active in-app focus room must count');

assert.equal(didJoinCrewToday({
  crewId: 'crew-beta',
  liveStatus: { activeRoomId: 'room-1' },
}, crewId, today), false, 'another crew\'s active room must not count');

const partitioned = partitionCrewParticipation([
  { uid: '2', studentName: '나래', crewId },
  { uid: '1', studentName: '가람', crewId, lastCrewMeetEnteredCrewId: crewId, lastCrewMeetEnteredDate: today },
], crewId, today);
assert.deepEqual(partitioned.absent.map(user => user.uid), ['2']);
assert.deepEqual(partitioned.joined.map(user => user.uid), ['1']);

const liveStatusSource = readFileSync(new URL('../src/pages/Admin/LiveStatus.jsx', import.meta.url), 'utf8');
assert.match(liveStatusSource, /currentTimeInMins >= startTimeInMins/, 'absence must start at the scheduled start time');
assert.doesNotMatch(liveStatusSource, /startTimeInMins \+ 5/, 'the former five-minute grace period must stay removed');
assert.match(liveStatusSource, /집중방 바로가기/);

const functionsSource = readFileSync(new URL('../functions/index.js', import.meta.url), 'utf8');
assert.match(functionsSource, /lastCrewMeetEnteredDate: getKSTDateString\(now\)/);
assert.match(functionsSource, /lastCrewMeetEnteredCrewId: crewId/);

console.log('Live status crew tabs, no-grace absence, Meet entry tracking, and participation ordering passed.');
