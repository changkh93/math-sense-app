export function didJoinCrewToday(user, crewId, todayStr) {
  if (!user || !crewId) return false;
  const live = user.liveStatus || {};
  const isInAppFocusRoom = user.crewId === crewId && Boolean(live.activeRoomId);
  const usedMeetLinkToday = user.lastCrewMeetEnteredCrewId === crewId
    && user.lastCrewMeetEnteredDate === todayStr;
  return isInAppFocusRoom || usedMeetLinkToday;
}

export function partitionCrewParticipation(users = [], crewId, todayStr) {
  const absent = [];
  const joined = [];
  users.forEach(user => {
    (didJoinCrewToday(user, crewId, todayStr) ? joined : absent).push(user);
  });
  const byName = (a, b) => String(a.studentName || a.name || '')
    .localeCompare(String(b.studentName || b.name || ''), 'ko');
  absent.sort(byName);
  joined.sort(byName);
  return { absent, joined };
}
