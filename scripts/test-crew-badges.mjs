import assert from 'node:assert/strict';
import { buildCrewBadges } from '../src/utils/crewBadgeUtils.js';

function byId(profile, id) {
  const badge = buildCrewBadges(profile).find((item) => item.id === id);
  assert.ok(badge, `배지를 찾을 수 없습니다: ${id}`);
  return badge;
}

const empty = buildCrewBadges({});
assert.equal(empty.length, 11, '크루 배지는 11종이어야 합니다.');
assert.equal(empty.some((badge) => badge.unlocked), false, '빈 프로필은 배지가 잠겨야 합니다.');

assert.equal(byId({ crewId: 'crew-1', crewStatus: 'approved' }, 'crew_first_boarding').unlocked, true);
assert.equal(byId({ crewId: 'crew-1', crewStatus: 'pending' }, 'crew_first_boarding').unlocked, false);

const active = {
  crewId: 'crew-1',
  crewStatus: 'approved',
  crewRole: 'leader',
  crewStats: {
    missionParticipationCount: 30,
    teamMissionCount: 10,
    chestContributionCount: 10,
    chestCompletionCount: 3,
    chestRewardClaimCount: 5,
  },
};
assert.equal(byId(active, 'crew_mission_veteran').unlocked, true);
assert.equal(byId(active, 'crew_team_core').unlocked, true);
assert.equal(byId(active, 'crew_chest_engineer').unlocked, true);
assert.equal(byId(active, 'crew_quartermaster').unlocked, true);
assert.equal(byId(active, 'crew_commander').unlocked, true);
assert.equal(byId(active, 'crew_galaxy_vanguard').unlocked, false);

const legend = {
  crewStats: {
    missionParticipationCount: 50,
    teamMissionCount: 20,
    chestContributionCount: 20,
  },
};
assert.equal(byId(legend, 'crew_galaxy_vanguard').unlocked, true);

const malformed = byId({ crewStats: { missionParticipationCount: -10, teamMissionCount: 'not-a-number' } }, 'crew_first_mission');
assert.equal(malformed.requirements[0].current, 0, '잘못된 누적값은 0으로 정규화해야 합니다.');

console.log('✅ 스터디 크루 배지 11종 및 복합 조건 테스트 통과');

