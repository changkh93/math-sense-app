function readCount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

function requirement(key, label, current, target, unit = '회') {
  return { key, label, current, target, unit, completed: current >= target };
}

/**
 * 크루 배지는 users/{uid} 한 문서만으로 판정한다.
 * 화면 진입 시 미션/상자 서브컬렉션을 다시 읽지 않도록 서버 누적치만 사용한다.
 */
export function buildCrewBadges(userData = {}) {
  const profile = userData || {};
  const stats = profile.crewStats || {};
  const missionCount = readCount(stats.missionParticipationCount);
  const teamMissionCount = readCount(stats.teamMissionCount);
  const chestContributionCount = readCount(stats.chestContributionCount);
  const chestCompletionCount = readCount(stats.chestCompletionCount);
  const chestRewardClaimCount = readCount(stats.chestRewardClaimCount);
  const isApprovedMember = Boolean(profile.crewId) && profile.crewStatus === 'approved';
  const isLeader = isApprovedMember && profile.crewRole === 'leader';
  const memberValue = isApprovedMember ? 1 : 0;
  const leaderValue = isLeader ? 1 : 0;

  return [
    {
      id: 'crew_first_boarding', title: '첫 승선', icon: '🚢', category: 'crew',
      requirements: [requirement('member', '승인 크루 소속', memberValue, 1, '')],
      unlocked: isApprovedMember,
      desc: '승인된 스터디 크루의 정식 승무원이 되었습니다.'
    },
    {
      id: 'crew_first_mission', title: '첫 공동 작전', icon: '📡', category: 'crew',
      requirements: [requirement('mission', '크루 미션 참여', missionCount, 1)],
      unlocked: missionCount >= 1,
      desc: '크루 오늘의 미션에 처음으로 참여했습니다.'
    },
    {
      id: 'crew_weekly_navigator', title: '일주 항해사', icon: '🧭', category: 'crew',
      requirements: [requirement('mission', '크루 미션 참여', missionCount, 7)],
      unlocked: missionCount >= 7,
      desc: '크루 미션에 7회 참여한 꾸준한 항해사입니다.'
    },
    {
      id: 'crew_mission_veteran', title: '작전 베테랑', icon: '🛰️', category: 'crew',
      requirements: [requirement('mission', '크루 미션 참여', missionCount, 30)],
      unlocked: missionCount >= 30,
      desc: '크루 미션에 30회 참여해 작전 경험을 쌓았습니다.'
    },
    {
      id: 'crew_team_signal', title: '팀워크 점화', icon: '✨', category: 'crew',
      requirements: [requirement('teamMission', '팀 미션 달성', teamMissionCount, 1)],
      unlocked: teamMissionCount >= 1,
      desc: '동료들과 함께 첫 팀 미션 보상을 획득했습니다.'
    },
    {
      id: 'crew_team_core', title: '팀워크 코어', icon: '🤝', category: 'crew',
      requirements: [requirement('teamMission', '팀 미션 달성', teamMissionCount, 10)],
      unlocked: teamMissionCount >= 10,
      desc: '팀 미션을 10회 함께 달성한 협력의 핵심입니다.'
    },
    {
      id: 'crew_chest_contributor', title: '광석 상자 기여자', icon: '💎', category: 'crew',
      requirements: [requirement('chestContribution', '상자 기여', chestContributionCount, 1)],
      unlocked: chestContributionCount >= 1,
      desc: '우수 과제 성취로 크루 공동 광석 상자에 처음 기여했습니다.'
    },
    {
      id: 'crew_chest_engineer', title: '상자 동력공', icon: '⚙️', category: 'crew',
      requirements: [
        requirement('chestContribution', '상자 기여', chestContributionCount, 10),
        requirement('chestCompletion', '상자 완성 기여', chestCompletionCount, 3),
      ],
      unlocked: chestContributionCount >= 10 && chestCompletionCount >= 3,
      desc: '상자 기여 10회와 완성 기여 3회를 달성했습니다.'
    },
    {
      id: 'crew_quartermaster', title: '크루 보급관', icon: '🎁', category: 'crew',
      requirements: [requirement('chestClaim', '공동 상자 수령', chestRewardClaimCount, 5)],
      unlocked: chestRewardClaimCount >= 5,
      desc: '크루 공동 광석 상자 보상을 5회 수령했습니다.'
    },
    {
      id: 'crew_commander', title: '성간 함장', icon: '🧑‍✈️', category: 'crew',
      requirements: [
        requirement('leader', '승인 크루 리더', leaderValue, 1, ''),
        requirement('mission', '크루 미션 참여', missionCount, 10),
      ],
      unlocked: isLeader && missionCount >= 10,
      desc: '승인 크루를 이끌며 미션에 10회 참여한 함장입니다.'
    },
    {
      id: 'crew_galaxy_vanguard', title: '은하 크루 선봉대', icon: '🌌', category: 'crew',
      requirements: [
        requirement('mission', '크루 미션 참여', missionCount, 50),
        requirement('teamMission', '팀 미션 달성', teamMissionCount, 20),
        requirement('chestContribution', '상자 기여', chestContributionCount, 20),
      ],
      unlocked: missionCount >= 50 && teamMissionCount >= 20 && chestContributionCount >= 20,
      desc: '미션·협력·상자 기여를 모두 증명한 전설의 크루 선봉대입니다.'
    },
  ];
}

