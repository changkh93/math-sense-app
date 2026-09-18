#!/usr/bin/env node
// Read-only by default. Uses Application Default Credentials; never embeds credentials.
import { createRequire } from 'module';
const functionsRequire = createRequire(new URL('../functions/package.json', import.meta.url));
const admin = functionsRequire('firebase-admin');
const { CAMPAIGN_ID } = functionsRequire('./crewGrowthEventPolicy.cjs');
const { getParticipantLockRef, reconcileCrewGrowthEventV2 } = functionsRequire('./crewGrowthEventService.cjs');
const { classifyCrewGrowthLock, parseCrewIdArg } = functionsRequire('./crewGrowthBackfillPolicy.cjs');
const apply = process.argv.includes('--apply');
if (apply && process.argv.includes('--dry-run')) throw new Error('Choose --apply OR --dry-run');
const crewIdFilter = parseCrewIdArg(process.argv.slice(2));
const confirmation = process.argv.find((arg) => arg.startsWith('--confirm-campaign='))?.split('=')[1] || '';
if (apply && confirmation !== CAMPAIGN_ID) {
  throw new Error(`Apply requires --confirm-campaign=${CAMPAIGN_ID}`);
}
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

async function run() {
  const start = Date.now();
  const crews = crewIdFilter
    ? { docs: [await db.collection('crews').doc(crewIdFilter).get()] }
    : await db.collection('crews').get();
  const report = {
    mode: apply ? 'apply' : 'dry-run', campaignId: CAMPAIGN_ID, crewIdFilter: crewIdFilter || null,
    candidates: 0, created: 0, existing: 0, skipped: 0, conflicts: [], crews: {},
  };
  const seen = new Map();
  const candidates = [];
  for (const crewDoc of crews.docs) {
    if (!crewDoc.exists) {
      report.conflicts.push({ crewId: crewIdFilter, reason: 'crew_not_found' });
      continue;
    }
    const crew = crewDoc.data();
    if (!['approved', 'pending'].includes(crew.status)) continue;
    report.crews[crewDoc.id] = { name: crew.name || '', candidates: 0, created: 0, existing: 0, skipped: 0 };
    const uids = [...new Set([crew.leaderId, ...(crew.memberIds || [])].filter(Boolean))];
    for (const uid of uids) {
      const [user, lock] = await Promise.all([db.collection('users').doc(uid).get(), getParticipantLockRef(db, uid).get()]);
      const duplicateCrew = seen.has(uid) && seen.get(uid) !== crewDoc.id;
      const decision = duplicateCrew
        ? { action: 'skip', reason: 'duplicate_roster_membership' }
        : classifyCrewGrowthLock({
          crewId: crewDoc.id, userExists: user.exists, user: user.data() || {},
          lockExists: lock.exists, lock: lock.data() || {},
        });
      if (decision.action === 'skip') {
        report.skipped++;
        report.crews[crewDoc.id].skipped++;
        report.conflicts.push({ uid, crewId: crewDoc.id, reason: decision.reason });
        continue;
      }
      seen.set(uid, crewDoc.id);
      if (decision.action === 'keep') {
        report.existing++;
        report.crews[crewDoc.id].existing++;
      } else {
        candidates.push({ uid, crewId: crewDoc.id });
        report.crews[crewDoc.id].candidates++;
      }
    }
  }
  report.candidates = candidates.length;
  if (apply) {
    for (const { uid, crewId } of candidates) {
      const created = await db.runTransaction(async (tx) => {
        const lockRef = getParticipantLockRef(db, uid);
        const [lock, user, crew] = await Promise.all([
          tx.get(lockRef), tx.get(db.collection('users').doc(uid)), tx.get(db.collection('crews').doc(crewId)),
        ]);
        if (lock.exists) return false; // Never overwrite a concurrent forfeit/join.
        if (!crew.exists || user.data()?.crewId !== crewId ||
            ![crew.data().leaderId, ...(crew.data().memberIds || [])].includes(uid)) {
          throw new Error('Membership changed during migration; rerun dry-run.');
        }
        tx.create(lockRef, { campaignId: CAMPAIGN_ID, uid, originCrewId: crewId,
          boundAtMs: start, boundReason: 'launch_backfill', status: 'active',
          lastJoinedCrewId: crewId, updatedAtMs: start });
        return true;
      });
      if (created) {
        report.created++;
        report.crews[crewId].created++;
      }
    }
    // Repair missing/null wakeups and initialize age-based 48h eligibility timers.
    for (const crewId of Object.keys(report.crews)) {
      const crew = crews.docs.find((doc) => doc.id === crewId);
      if (crew?.data()?.status === 'approved') await reconcileCrewGrowthEventV2(db, crewId);
    }
  }
  console.log(JSON.stringify(report, null, 2));
}
run().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => db.terminate());
