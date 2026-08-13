const assert = require('node:assert/strict');
const test = require('node:test');
const {
  getCrewMissionActivitySnapshot,
  getCrewMissionTeamTarget,
  getCrewSharedRewardEligibleIds,
  isMissionActiveOnDate,
  wasMissionActiveBeforeDate,
} = require('./crewMissionPolicy.cjs');

test('26명 중 최근 7일 미션 참여자 8명이면 팀 목표는 5명이다', () => {
  assert.equal(getCrewMissionTeamTarget(8, 26), 5);
});

test('활동 이력이 없는 크루도 2명으로 시작할 수 있다', () => {
  assert.equal(getCrewMissionTeamTarget(0, 26), 2);
  assert.equal(getCrewMissionTeamTarget(0, 1), 0);
});

test('당일 복귀자는 당일 목표에는 추가되지 않고 활동 상태는 즉시 복구된다', () => {
  const activity = { lastMissionDateKey: '2026-08-13' };
  assert.equal(wasMissionActiveBeforeDate(activity, '2026-08-13'), false);
  assert.equal(isMissionActiveOnDate(activity, '2026-08-13'), true);
});

test('7일 창의 경계를 포함하고 그보다 오래된 참여는 동면으로 분류한다', () => {
  const snapshot = getCrewMissionActivitySnapshot({
    memberIds: ['a', 'b', 'c'],
    activityByMember: {
      a: { lastMissionDateKey: '2026-08-06' },
      b: { lastMissionDateKey: '2026-08-05' },
      c: { lastMissionDateKey: '2026-08-13' },
    },
    dateKey: '2026-08-13',
  });
  assert.deepEqual(snapshot.activeMemberIds, ['a']);
  assert.deepEqual(snapshot.hibernatingMemberIds, ['b', 'c']);
});

test('공동 광석은 활동 승무원과 실제 기여자에게만 분배한다', () => {
  const eligible = getCrewSharedRewardEligibleIds({
    memberIds: ['active', 'sleeper', 'contributor'],
    contributorIds: ['contributor', 'former-member'],
    activityByMember: {
      active: { lastMissionDateKey: '2026-08-12' },
      sleeper: { lastMissionDateKey: '2026-08-01' },
      contributor: { lastMissionDateKey: '2026-08-01' },
    },
    dateKey: '2026-08-13',
  });
  assert.deepEqual(eligible, ['active', 'contributor']);
});
