import admin from 'firebase-admin';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { hashCode, normalizeCode, buildAccessClaims } = require('../functions/accessControl.cjs').testables;
const apply = process.argv.includes('--apply');
const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json';
const credential = admin.credential.cert(JSON.parse(readFileSync(keyPath, 'utf8')));
admin.initializeApp({ credential, projectId: 'math-sense-1f6a8' });
const db = admin.firestore();

async function migrateSecrets() {
  const [clusters, regions] = await Promise.all([
    db.collection('clusters').get(),
    db.collection('regions').get(),
  ]);
  const ops = [];
  for (const snap of clusters.docs) {
    const data = snap.data();
    const code = normalizeCode(data.inviteCode);
    if (!code) continue;
    ops.push({
      type: 'cluster',
      id: snap.id,
      code,
      expiresAt: data.expiresAt || null,
      ref: snap.ref,
    });
  }
  for (const snap of regions.docs) {
    const data = snap.data();
    const code = normalizeCode(data.accessCode);
    if (!code) continue;
    ops.push({ type: 'region', id: snap.id, code, ref: snap.ref });
  }
  if (!apply) return ops.length;
  for (let start = 0; start < ops.length; start += 150) {
    const batch = db.batch();
    for (const op of ops.slice(start, start + 150)) {
      batch.set(db.collection('accessSecrets').doc(`${op.type}_${op.id}`), {
        type: op.type,
        resourceId: op.id,
        code: op.code,
        migratedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      if (op.type === 'cluster') {
        batch.set(db.collection('clusterInviteLookup').doc(hashCode(op.code)), {
          clusterId: op.id,
          expiresAt: op.expiresAt,
          migratedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        batch.update(op.ref, { inviteCode: admin.firestore.FieldValue.delete() });
      } else {
        batch.update(op.ref, { accessCode: admin.firestore.FieldValue.delete() });
      }
    }
    await batch.commit();
  }
  return ops.length;
}

async function migrateClaims() {
  const users = await db.collection('users').get();
  let count = 0;
  for (const snap of users.docs) {
    const data = snap.data();
    if (data.isDeleted === true || data.accountStatus === 'deleted') continue;
    try {
      const authUser = await admin.auth().getUser(snap.id);
      const claims = buildAccessClaims(authUser.customClaims || {}, data.clusterAccess || {}, data.regionAccess || {});
      if (apply) {
        await admin.auth().setCustomUserClaims(snap.id, claims);
        await snap.ref.set({
          accessClaimsSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
      count += 1;
    } catch (error) {
      if (error?.code === 'auth/user-not-found') continue;
      console.error(`[access-migration] ${snap.id}:`, error.message);
    }
  }
  return count;
}

const [secretCount, userCount] = await Promise.all([migrateSecrets(), migrateClaims()]);
console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', secretCount, userCount }, null, 2));
await db.terminate();
