import admin from 'firebase-admin';
import { existsSync, readFileSync } from 'node:fs';

const APPLY = process.argv.includes('--apply');
const MAINTENANCE = process.argv.includes('--maintenance-window');
if (APPLY && !MAINTENANCE) {
  throw new Error('크루 활동 쓰기를 일시 중지한 뒤 --apply --maintenance-window로 실행하세요.');
}

if (!admin.apps.length) {
  if (existsSync('./service-account.json')) {
    const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else {
    admin.initializeApp();
  }
}

const db = admin.firestore();
const statsByUid = new Map();
const getStats = (uid) => {
  if (!statsByUid.has(uid)) {
    statsByUid.set(uid, {
      missionParticipationCount: 0,
      teamMissionCount: 0,
      chestContributionCount: 0,
      chestCompletionCount: 0,
      chestRewardClaimCount: 0,
    });
  }
  return statsByUid.get(uid);
};

console.log(`🚢 [Crew Stats Backfill] ${APPLY ? 'APPLY' : 'DRY-RUN'}`);

const [responsesSnap, teamRewardsSnap, chestEventsSnap, chestRewardsSnap, usersSnap] = await Promise.all([
  db.collectionGroup('responses').where('scopeType', '==', 'crew').get(),
  db.collectionGroup('crystal_transactions').where('type', '==', 'study_crew_team_mission').get(),
  db.collectionGroup('crystalChestEvents').get(),
  db.collectionGroup('crystalChestRewards').get(),
  db.collection('users').get(),
]);

responsesSnap.forEach((docSnap) => {
  const data = docSnap.data() || {};
  if (!data.userId || data.isGuest === true) return;
  getStats(data.userId).missionParticipationCount += 1;
});

teamRewardsSnap.forEach((docSnap) => {
  const data = docSnap.data() || {};
  if (data.metadata?.scopeType !== 'crew') return;
  // crystal_transactions는 users/{uid}의 바로 아래 서브컬렉션이다.
  const uid = docSnap.ref.parent.parent?.id;
  if (uid) getStats(uid).teamMissionCount += 1;
});

chestEventsSnap.forEach((docSnap) => {
  const data = docSnap.data() || {};
  if (!data.contributorId || Number(data.acceptedAmount || 0) <= 0) return;
  const stats = getStats(data.contributorId);
  stats.chestContributionCount += 1;
  if (data.boxCompleted === true) stats.chestCompletionCount += 1;
});

chestRewardsSnap.forEach((docSnap) => {
  const claimedMemberIds = Array.isArray(docSnap.data()?.claimedMemberIds)
    ? new Set(docSnap.data().claimedMemberIds.filter(Boolean))
    : new Set();
  claimedMemberIds.forEach((uid) => {
    getStats(uid).chestRewardClaimCount += 1;
  });
});

const writer = APPLY ? db.bulkWriter() : null;
let changed = 0;
const preview = [];
for (const userDoc of usersSnap.docs) {
  const existing = userDoc.data()?.crewStats || {};
  const computed = getStats(userDoc.id);
  const next = {
    // 삭제된 크루의 하위 기록은 복원할 수 없으므로 이미 더 큰 누적치는 보존한다.
    missionParticipationCount: Math.max(Number(existing.missionParticipationCount || 0), Number(computed.missionParticipationCount || 0)),
    teamMissionCount: Math.max(Number(existing.teamMissionCount || 0), Number(computed.teamMissionCount || 0)),
    chestContributionCount: Math.max(Number(existing.chestContributionCount || 0), Number(computed.chestContributionCount || 0)),
    chestCompletionCount: Math.max(Number(existing.chestCompletionCount || 0), Number(computed.chestCompletionCount || 0)),
    chestRewardClaimCount: Math.max(Number(existing.chestRewardClaimCount || 0), Number(computed.chestRewardClaimCount || 0)),
    version: 1,
    backfillComplete: true,
    backfilledAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  const differs = Object.keys(next).some((key) => key !== 'backfilledAt' && existing[key] !== next[key]);
  if (!differs) continue;
  changed += 1;
  if (preview.length < 20) preview.push({ uid: userDoc.id, ...next, backfilledAt: '[server timestamp]' });
  if (writer) writer.set(userDoc.ref, { crewStats: next }, { merge: true });
}

if (writer) await writer.close();
console.table(preview);
console.log(JSON.stringify({
  users: usersSnap.size,
  changed,
  crewMissionResponses: responsesSnap.size,
  teamRewardTransactions: teamRewardsSnap.size,
  chestEvents: chestEventsSnap.size,
  chestRewards: chestRewardsSnap.size,
  applied: APPLY,
}, null, 2));

await db.terminate();

