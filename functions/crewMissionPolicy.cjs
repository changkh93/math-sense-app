const CREW_MISSION_ACTIVITY_WINDOW_DAYS = 7;
const CREW_MISSION_TEAM_TARGET_RATIO = 0.6;
const CREW_MISSION_MIN_TEAM_TARGET = 2;
const CREW_MISSION_TARGET_POLICY_VERSION = 2;

function parseDateKey(dateKey) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ""));
  if (!match) return null;
  const value = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(value.getTime()) ? null : value;
}

function shiftDateKey(dateKey, days) {
  const value = parseDateKey(dateKey);
  if (!value) return "";
  value.setUTCDate(value.getUTCDate() + Number(days || 0));
  return value.toISOString().slice(0, 10);
}

function getLastMissionDateKey(activity) {
  if (typeof activity === "string") return activity;
  return String(activity?.lastMissionDateKey || "");
}

function wasMissionActiveBeforeDate(activity, dateKey, windowDays = CREW_MISSION_ACTIVITY_WINDOW_DAYS) {
  const lastMissionDateKey = getLastMissionDateKey(activity);
  const startDateKey = shiftDateKey(dateKey, -Math.max(1, Number(windowDays || 0)));
  return Boolean(
    startDateKey
    && lastMissionDateKey >= startDateKey
    && lastMissionDateKey < dateKey
  );
}

function isMissionActiveOnDate(activity, dateKey, windowDays = CREW_MISSION_ACTIVITY_WINDOW_DAYS) {
  const lastMissionDateKey = getLastMissionDateKey(activity);
  return lastMissionDateKey === dateKey
    || wasMissionActiveBeforeDate(activity, dateKey, windowDays);
}

function getCrewMissionActivitySnapshot({ memberIds = [], activityByMember = {}, dateKey }) {
  const uniqueMemberIds = Array.from(new Set(memberIds.filter(Boolean)));
  const activeMemberIds = uniqueMemberIds.filter((memberId) => (
    wasMissionActiveBeforeDate(activityByMember?.[memberId], dateKey)
  ));
  const activeIdSet = new Set(activeMemberIds);
  return {
    memberIds: uniqueMemberIds,
    activeMemberIds,
    hibernatingMemberIds: uniqueMemberIds.filter((memberId) => !activeIdSet.has(memberId)),
  };
}

function getCrewMissionTeamTarget(activeMemberCount, totalMemberCount) {
  const total = Math.max(0, Math.floor(Number(totalMemberCount || 0)));
  if (total < CREW_MISSION_MIN_TEAM_TARGET) return 0;
  const active = Math.max(0, Math.min(total, Math.floor(Number(activeMemberCount || 0))));
  const scaledTarget = Math.ceil(active * CREW_MISSION_TEAM_TARGET_RATIO);
  return Math.min(total, Math.max(CREW_MISSION_MIN_TEAM_TARGET, scaledTarget));
}

function getCrewSharedRewardEligibleIds({ memberIds = [], contributorIds = [], activityByMember = {}, dateKey }) {
  const uniqueMemberIds = Array.from(new Set(memberIds.filter(Boolean)));
  const memberIdSet = new Set(uniqueMemberIds);
  const activeMemberIds = uniqueMemberIds.filter((memberId) => (
    isMissionActiveOnDate(activityByMember?.[memberId], dateKey)
  ));
  const currentContributorIds = contributorIds.filter((memberId) => memberIdSet.has(memberId));
  return Array.from(new Set([...activeMemberIds, ...currentContributorIds]));
}

module.exports = {
  CREW_MISSION_ACTIVITY_WINDOW_DAYS,
  CREW_MISSION_TEAM_TARGET_RATIO,
  CREW_MISSION_MIN_TEAM_TARGET,
  CREW_MISSION_TARGET_POLICY_VERSION,
  shiftDateKey,
  wasMissionActiveBeforeDate,
  isMissionActiveOnDate,
  getCrewMissionActivitySnapshot,
  getCrewMissionTeamTarget,
  getCrewSharedRewardEligibleIds,
};
