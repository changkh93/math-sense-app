#!/usr/bin/env node
// Read-only by default. Uses Application Default Credentials; never embeds credentials.
import admin from 'firebase-admin';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { CAMPAIGN_ID } = require('../functions/crewGrowthEventPolicy.cjs');
const { getParticipantLockRef, reconcileCrewGrowthEventV2 } = require('../functions/crewGrowthEventService.cjs');
const apply = process.argv.includes('--apply');
if (apply && process.argv.includes('--dry-run')) throw new Error('Choose --apply OR --dry-run');
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

async function run() {
  const start = Date.now();
  const crews = await db.collection('crews').get();
  const report = { mode: apply ? 'apply' : 'dry-run', campaignId: CAMPAIGN_ID, candidates: 0, created: 0, existing: 0, conflicts: [] };
  const seen = new Map();
  const candidates = [];
  for (const crewDoc of crews.docs) {
    const crew = crewDoc.data();
    if (!['approved', 'pending'].includes(crew.status)) continue;
    const uids = [...new Set([crew.leaderId, ...(crew.memberIds || [])].filter(Boolean))];
    for (const uid of uids) {
      const [user, lock] = await Promise.all([db.collection('users').doc(uid).get(), getParticipantLockRef(db, uid).get()]);
      if (!user.exists || user.data().crewId !== crewDoc.id || user.data().isDeleted ||
          (seen.has(uid) && seen.get(uid) !== crewDoc.id)) {
        report.conflicts.push({ uid, crewId: crewDoc.id, reason: 'membership_mismatch' });
        continue;
      }
      seen.set(uid, crewDoc.id);
      if (lock.exists) {
        report.existing++;
        if (lock.data().originCrewId !== crewDoc.id) report.conflicts.push({ uid, crewId: crewDoc.id, reason: 'existing_origin_lock' });
      } else candidates.push({ uid, crewId: crewDoc.id });
    }
  }
  report.candidates = candidates.length;
  // Conflicts need review, not a silent partial migration.
  if (apply && report.conflicts.length) throw new Error(JSON.stringify(report, null, 2));
  if (apply) {
    for (const { uid, crewId } of candidates) {
      await db.runTransaction(async (tx) => {
        const lockRef = getParticipantLockRef(db, uid);
        const [lock, user, crew] = await Promise.all([
          tx.get(lockRef), tx.get(db.collection('users').doc(uid)), tx.get(db.collection('crews').doc(crewId)),
        ]);
        if (lock.exists) return; // Never overwrite a concurrent forfeit/join.
        if (!crew.exists || user.data()?.crewId !== crewId ||
            ![crew.data().leaderId, ...(crew.data().memberIds || [])].includes(uid)) {
          throw new Error('Membership changed during migration; rerun dry-run.');
        }
        tx.create(lockRef, { campaignId: CAMPAIGN_ID, uid, originCrewId: crewId,
          boundAtMs: start, boundReason: 'launch_backfill', status: 'active',
          lastJoinedCrewId: crewId, updatedAtMs: start });
      });
      report.created++;
    }
    // Repairs missing/null wakeups and initializes age-based 48h eligibility timers.
    for (const crew of crews.docs.filter((d) => d.data().status === 'approved')) {
      await reconcileCrewGrowthEventV2(db, crew.id);
    }
  }
  console.log(JSON.stringify(report, null, 2));
}
run().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => db.terminate());
